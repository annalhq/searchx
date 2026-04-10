"use client";

import { ExternalLink, Calendar, Globe } from "lucide-react";
import ArchiveButton from "./ArchiveButton";

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
  query?: string;
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

export default function ResultCard({ result, index, query }: ResultCardProps) {
  const engines = result.engines ?? (result.engine ? [result.engine] : []);
  const favicon = getFavicon(result.url);
  const displayUrl = formatUrl(result.url);

  return (
    <article
      className="group relative py-4 animate-fadeUp"
      style={{ animationDelay: `${Math.min(index * 40, 300)}ms` }}
    >
      {/* Source row */}
      <div className="flex items-center gap-1.5 text-xs text-base-content/40 mb-1 min-w-0">
        {favicon ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={favicon}
            alt=""
            width={14}
            height={14}
            className="rounded-sm shrink-0"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <Globe size={12} className="shrink-0 text-base-content/30" />
        )}
        <span className="truncate min-w-0">{displayUrl}</span>
      </div>

      {/* Title */}
      <a
        href={result.url}
        target="_blank"
        rel="noopener noreferrer"
        className="group/title flex items-start gap-1.5 min-w-0 mb-1"
      >
        <span
          className="link-title text-base font-medium leading-snug text-primary hover:underline underline-offset-2 decoration-primary/30 line-clamp-2 min-w-0 break-words transition-colors duration-150"
          dangerouslySetInnerHTML={{ __html: result.title }}
        />
        <ExternalLink
          size={11}
          className="shrink-0 mt-1.5 text-base-content/20 group-hover/title:text-primary transition-colors duration-150"
        />
      </a>

      {/* Snippet */}
      {result.content && (
        <p
          className="text-sm text-base-content/55 leading-relaxed line-clamp-2 min-w-0 break-words"
          dangerouslySetInnerHTML={{ __html: result.content }}
        />
      )}

      {/* Footer: engines + date + archive button */}
      <div className="flex items-center gap-2 flex-wrap mt-2 min-w-0">
        <div className="flex items-center gap-1 flex-wrap min-w-0">
          {engines.map((eng) => (
            <span
              key={eng}
              className="badge badge-xs badge-ghost text-base-content/40 truncate max-w-[10rem]"
              title={eng}
            >
              {eng}
            </span>
          ))}
        </div>

        {result.publishedDate && (
          <div className="flex items-center gap-1 text-xs text-base-content/35 shrink-0">
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

        {/* Archive button — pushed to right */}
        {query && (
          <div className="ml-auto shrink-0">
            <ArchiveButton
              query={query}
              result={{
                url: result.url,
                title: result.title,
                content: result.content,
              }}
            />
          </div>
        )}
      </div>

      {/* Subtle bottom border */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-base-300/60" />
    </article>
  );
}