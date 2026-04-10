"use client";

import { ExternalLink, Calendar, Globe } from "lucide-react";

export interface SearXNGResult {
  url: string;
  title: string;
  content?: string;
  engine?: string;
  engines?: string[];
  score?: number;
  category?: string;
  publishedDate?: string;
  img_src?: string;
  thumbnail?: string;
}

interface ResultCardProps {
  result: SearXNGResult;
  index: number;
}

function formatUrl(url: string): string {
  try {
    const u = new URL(url);
    return `${u.hostname}${u.pathname !== "/" ? u.pathname : ""}`;
  } catch {
    return url;
  }
}

function getFavicon(url: string): string {
  try {
    const u = new URL(url);
    return `https://www.google.com/s2/favicons?sz=16&domain=${u.hostname}`;
  } catch {
    return "";
  }
}

export default function ResultCard({ result, index }: ResultCardProps) {
  const engines = result.engines ?? (result.engine ? [result.engine] : []);
  const favicon = getFavicon(result.url);
  const displayUrl = formatUrl(result.url);

  return (
    <article
      className="card card-border bg-base-100 hover:bg-base-200 transition-colors duration-150"
      style={{ animationDelay: `${Math.min(index * 40, 300)}ms` }}
    >
      <div className="card-body p-4 gap-2">

        {/* Source row */}
        <div className="flex items-center gap-1.5 text-xs text-base-content/50 min-w-0">
          {favicon ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={favicon}
              alt=""
              width={13}
              height={13}
              className="rounded-sm shrink-0"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <Globe size={12} className="shrink-0" />
          )}
          <span className="truncate min-w-0">{displayUrl}</span>
        </div>

        {/* Title */}
        <a
          href={result.url}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-start gap-1.5 min-w-0"
        >
          <span
            className="link link-hover text-base-content font-medium leading-snug line-clamp-2 min-w-0 break-words group-hover:text-primary transition-colors"
            dangerouslySetInnerHTML={{ __html: result.title }}
          />
          <ExternalLink
            size={11}
            className="shrink-0 mt-1 text-base-content/30 group-hover:text-primary transition-colors"
          />
        </a>

        {/* Snippet */}
        {result.content && (
          <p
            className="text-sm text-base-content/60 leading-relaxed line-clamp-3 min-w-0 break-words"
            dangerouslySetInnerHTML={{ __html: result.content }}
          />
        )}

        {/* Footer: engines + date */}
        {(engines.length > 0 || result.publishedDate) && (
          <div className="flex items-center gap-2 flex-wrap mt-1 min-w-0">
            <div className="flex items-center gap-1 flex-wrap min-w-0">
              {engines.map((eng) => (
                <span key={eng} className="badge badge-ghost badge-xs truncate max-w-[10rem]" title={eng}>
                  {eng}
                </span>
              ))}
            </div>

            {result.publishedDate && (
              <div className="flex items-center gap-1 text-xs text-base-content/40 ml-auto shrink-0">
                <Calendar size={11} />
                <time dateTime={result.publishedDate}>
                  {new Date(result.publishedDate).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </time>
              </div>
            )}
          </div>
        )}

      </div>
    </article>
  );
}