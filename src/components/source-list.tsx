import { ArrowUpRight, BookOpen } from "lucide-react";
import type { Source } from "@/lib/types";

function safeSourceUrl(value: string) {
  try {
    const url = new URL(value);
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) return null;
    return url;
  } catch {
    return null;
  }
}

export function SourceList({ sources, compact = false }: { sources: Source[]; compact?: boolean }) {
  if (sources.length === 0) return <p className="muted">이 레슨에 연결된 참고 자료가 없어요.</p>;

  return (
    <ul className="source-list">
      {sources.map((source) => {
        const url = safeSourceUrl(source.url);
        return (
          <li className="source-item" key={source.id}>
            <div className="source-item-heading">
              <BookOpen size={16} aria-hidden="true" />
              {url ? (
                <a href={url.href} target="_blank" rel="noopener noreferrer">
                  {source.title}<ArrowUpRight size={14} aria-hidden="true" />
                  <span className="sr-only"> (새 창에서 열기)</span>
                </a>
              ) : <span>{source.title}</span>}
            </div>
            {url ? <p className="source-domain">{url.hostname.replace(/^www\./, "")}</p> : null}
            {!compact ? <p className="muted">{source.summary}</p> : null}
          </li>
        );
      })}
    </ul>
  );
}
