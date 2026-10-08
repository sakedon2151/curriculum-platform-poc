import assert from "node:assert/strict";
import { test } from "node:test";
import { filterSources, normalizeSourceUrl, searchTavily } from "./research";
import { GenerationError, publicGenerationError } from "./errors";

const snippet = "컨테이너는 애플리케이션과 실행에 필요한 환경을 함께 제공하며, 이미지에서 만들어진 독립적인 실행 단위입니다. 학습을 위한 충분한 설명이 포함된 검색 결과입니다.";

test("source URLs reject scripts, credentials and local addresses", () => {
  for (const url of [
    "javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "https://user:password@example.com/docs",
    "http://localhost:3000/docs",
    "http://127.0.0.1/docs",
    "http://10.0.0.1/docs",
    "http://172.16.0.1/docs",
    "http://192.168.1.1/docs",
    "http://169.254.169.254/docs",
    "http://[::1]/docs",
  ]) {
    assert.equal(normalizeSourceUrl(url), null, url);
  }
  assert.equal(normalizeSourceUrl("https://docs.example.com/guide/?utm_source=search&b=2&a=1#intro"), "https://docs.example.com/guide?a=1&b=2");
});

test("source selection deduplicates canonical pages, prioritizes docs and caps at ten", () => {
  const results = [
    { title: "duplicate", url: "https://docs.example.com/guide/?utm_source=ad#one", content: snippet, score: 0.5 },
    { title: "official documentation", url: "https://docs.example.com/guide", content: snippet, score: 0.9 },
    { title: "incomplete", url: "https://example.com/short", content: "짧은 설명", score: 1 },
    { title: "unrelated", url: "https://example.com/unrelated", content: snippet, score: 0.1 },
    { title: "unsafe", url: "javascript:alert(1)", content: snippet, score: 1 },
    ...Array.from({ length: 15 }, (_, index) => ({ title: `lesson ${index}`, url: `https://school.example.edu/lesson-${index}`, content: snippet, score: 0.8 })),
  ];
  const sources = filterSources(results, ["example.com"]);
  assert.equal(sources.length, 10);
  assert.equal(new Set(sources.map((source) => source.url)).size, 10);
  assert.equal(sources[0].title, "official documentation");
  assert.deepEqual(sources.map((source) => source.id), Array.from({ length: 10 }, (_, index) => `source-${index + 1}`));
  assert.ok(sources.every((source) => source.summary === snippet));
});

test("malformed and empty search results cannot become course sources", () => {
  assert.deepEqual(filterSources([null, {}, { title: " ", url: "https://example.com", content: snippet }, { title: "unknown", url: "bad url", content: snippet }]), []);
});

test("Tavily search uses server Bearer auth and returns only result data", async (context) => {
  const result = { title: "Docker", url: "https://docs.docker.com/", content: snippet, score: 0.8 };
  context.mock.method(globalThis, "fetch", async (url: string, init: RequestInit) => {
    assert.equal(url, "https://api.tavily.com/search");
    assert.equal((init.headers as Record<string, string>).Authorization, "Bearer test-search-key");
    assert.equal(init.cache, "no-store");
    assert.equal(JSON.parse(init.body as string).include_raw_content, false);
    assert.equal(JSON.parse(init.body as string).max_results, 8);
    assert.ok(init.signal);
    return Response.json({ results: [result], answer: "unused provider data" });
  });
  assert.deepEqual(await searchTavily("Docker official docs", "test-search-key", new AbortController().signal), [result]);
});

test("search provider failures never expose their response body", async (context) => {
  context.mock.method(globalThis, "fetch", async () => new Response("secret-key-and-provider-request", { status: 401 }));
  await assert.rejects(
    searchTavily("Docker", "test-search-key", new AbortController().signal),
    (error: unknown) => error instanceof GenerationError && error.code === "SEARCH_AUTH" && !error.message.includes("secret"),
  );
});

test("public errors hide provider request data while retaining actionable categories", () => {
  const raw = Object.assign(new Error("API-key=secret provider body"), { statusCode: 429 });
  const sanitized = publicGenerationError(raw);
  assert.equal(sanitized.code, "RATE_LIMIT");
  assert.equal(sanitized.status, 429);
  assert.ok(!JSON.stringify(sanitized).includes("secret"));
  assert.equal(publicGenerationError(new DOMException("private detail", "TimeoutError")).code, "TIMEOUT");
  assert.equal(publicGenerationError(new Error("private detail")).code, "GENERATION_FAILED");
});
