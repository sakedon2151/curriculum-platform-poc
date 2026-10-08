import { z } from "zod";
import type { Source } from "../types";
import { GenerationError } from "./errors";

const searchResultSchema = z.object({
  title: z.string().min(1),
  url: z.string(),
  content: z.string().min(1),
  score: z.number().optional(),
});

export type SearchResult = z.infer<typeof searchResultSchema>;

function isPublicHostname(hostname: string) {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (
    !host.includes(".") ||
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host.includes(":")
  ) {
    return false;
  }
  const octets = host.split(".").map(Number);
  if (octets.length === 4 && octets.every((part) => Number.isInteger(part))) {
    const [a, b] = octets;
    return !(a === 0 || a === 10 || a === 127 || a >= 224 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168));
  }
  return true;
}

export function normalizeSourceUrl(raw: string): string | null {
  try {
    const url = new URL(raw);
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password ||
      !isPublicHostname(url.hostname)
    ) {
      return null;
    }
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (/^utm_/i.test(key) || ["fbclid", "gclid"].includes(key.toLowerCase())) {
        url.searchParams.delete(key);
      }
    }
    url.searchParams.sort();
    url.pathname = url.pathname.replace(/\/$/, "") || "/";
    return url.toString();
  } catch {
    return null;
  }
}

function textSnippet(text: string, length: number) {
  return text.replace(/\u0000/g, "").trim().slice(0, length);
}

function authorityScore(url: string, preferredDomains: string[]) {
  const { hostname, pathname } = new URL(url);
  const preferred = preferredDomains.some(
    (domain) => hostname === domain || hostname.endsWith(`.${domain}`),
  );
  const institution = /\.(edu|gov)(\.[a-z]{2})?$/.test(hostname) || /\.(ac|go)\.[a-z]{2}$/.test(hostname);
  const documentation = hostname.startsWith("docs.") || /\/(docs|documentation|learn|manual)\b/.test(pathname);
  return (preferred ? 3 : 0) + (institution ? 2 : 0) + (documentation ? 1 : 0);
}

export function filterSources(results: unknown[], preferredDomains: string[] = []): Source[] {
  const unique = new Map<string, SearchResult & { rank: number }>();
  for (const raw of results) {
    const result = searchResultSchema.safeParse(raw);
    if (!result.success) continue;
    const url = normalizeSourceUrl(result.data.url);
    if (!url) continue;
    const title = textSnippet(result.data.title, 180);
    const content = textSnippet(result.data.content, 2400);
    if (!title || content.length < 60) continue;
    const relevance = Math.max(0, Math.min(1, result.data.score ?? 0.5));
    if (relevance < 0.2) continue;
    const rank = authorityScore(url, preferredDomains) + relevance;
    if (!unique.has(url) || unique.get(url)!.rank < rank) {
      unique.set(url, { ...result.data, url, title, content, rank });
    }
  }
  return [...unique.values()]
    .sort((a, b) => b.rank - a.rank)
    .slice(0, 10)
    .map((result, index) => ({
      id: `source-${index + 1}`,
      title: result.title,
      url: result.url,
      summary: result.content,
    }));
}

export async function searchTavily(query: string, apiKey: string, signal: AbortSignal) {
  let response: Response;
  try {
    response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        search_depth: "advanced",
        max_results: 8,
        include_answer: false,
        include_raw_content: false,
      }),
      signal: AbortSignal.any([signal, AbortSignal.timeout(25_000)]),
      cache: "no-store",
    });
  } catch (error) {
    if (signal.aborted) throw error;
    throw new GenerationError("SEARCH_FAILED", "웹 검색에 연결하지 못했거나 시간이 초과되었습니다. 다시 시도해 주세요.");
  }
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new GenerationError("SEARCH_AUTH", "검색 서비스 인증에 실패했습니다. 서버의 Tavily API 키를 확인해 주세요.");
    }
    if ([429, 432, 433].includes(response.status)) {
      throw new GenerationError("SEARCH_LIMIT", "검색 서비스의 사용 한도에 도달했습니다. 사용 한도를 확인한 뒤 다시 시도해 주세요.", 429);
    }
    throw new GenerationError("SEARCH_FAILED", "웹 검색 서비스가 응답하지 못했습니다. 잠시 후 다시 시도해 주세요.");
  }
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new GenerationError("SEARCH_FAILED", "웹 검색 결과를 읽지 못했습니다. 다시 시도해 주세요.");
  }
  const parsed = z.object({ results: z.array(z.unknown()).max(20) }).safeParse(payload);
  if (!parsed.success) {
    throw new GenerationError("SEARCH_FAILED", "웹 검색 결과의 형식이 올바르지 않습니다. 다시 시도해 주세요.");
  }
  return parsed.data.results;
}
