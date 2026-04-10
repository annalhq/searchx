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

const ExternalIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="10"
    height="10"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ flexShrink: 0, opacity: 0.5 }}
  >
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" y1="14" x2="21" y2="3" />
  </svg>
);

export default function ResultCard({ result, index }: ResultCardProps) {
  const engines = result.engines ?? (result.engine ? [result.engine] : []);
  const favicon = getFavicon(result.url);
  const displayUrl = formatUrl(result.url);

  return (
    <article
      className="sx-result"
      style={{ animationDelay: `${Math.min(index * 40, 300)}ms` }}
    >
      {/* URL breadcrumb row */}
      <div className="sx-result-url">
        {favicon && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={favicon}
            alt=""
            width={14}
            height={14}
            style={{ borderRadius: 2, flexShrink: 0 }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        )}
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {displayUrl}
        </span>
        <ExternalIcon />
      </div>

      {/* Title */}
      <a
        href={result.url}
        target="_blank"
        rel="noopener noreferrer"
        className="sx-result-title"
        // strip HTML tags from title
        dangerouslySetInnerHTML={{ __html: result.title }}
      />

      {/* Snippet */}
      {result.content && (
        <p
          className="sx-result-snippet"
          dangerouslySetInnerHTML={{ __html: result.content }}
        />
      )}

      {/* Meta row: engines + date */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.4rem",
          marginTop: "0.45rem",
          flexWrap: "wrap",
        }}
      >
        {engines.map((eng) => (
          <span key={eng} className="sx-engine-badge">
            {eng}
          </span>
        ))}
        {result.publishedDate && (
          <span style={{ fontSize: "0.72rem", color: "var(--sx-muted)", marginLeft: "auto" }}>
            {new Date(result.publishedDate).toLocaleDateString(undefined, {
              year: "numeric", month: "short", day: "numeric",
            })}
          </span>
        )}
      </div>
    </article>
  );
}
