import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import SearchBar from "../components/SearchBar";
import FilterBar from "../components/FilterBar";
import ResultCard, { SearXNGResult } from "../components/ResultCard";
import ResultsSkeleton from "../components/ResultsSkeleton";
import Pagination from "../components/Pagination";

// ── Types ────────────────────────────────────────────────────────────────────

interface SearXNGResponse {
  query: string;
  number_of_results: number;
  results: SearXNGResult[];
  infoboxes?: {
    id?: string;
    infobox: string;
    content?: string;
    urls?: { title: string; url: string }[];
  }[];
  suggestions?: string[];
  answers?: Array<string | { answer?: string; url?: string }>;
}

function normalizeAnswerItem(item: string | { answer?: string; url?: string }) {
  if (typeof item === "string") {
    return { text: item, url: undefined as string | undefined };
  }

  return {
    text: item.answer ?? "",
    url: item.url,
  };
}

// ── Fetch helper (server side) ────────────────────────────────────────────────
const SEARXNG_BASE_URL =
  process.env.SEARXNG_INTERNAL_URL ??
  process.env.NEXT_PUBLIC_SEARXNG_BASE_URL ??
  "http://localhost:8080";

async function fetchResults(
  query: string,
  page: number,
  category: string,
  timeRange: string,
): Promise<SearXNGResponse | null> {
  const params = new URLSearchParams({
    q: query,
    format: "json",
    pageno: String(page),
  });
  if (category) params.set("categories", category);
  if (timeRange) params.set("time_range", timeRange);

  try {
    const res = await fetch(`${SEARXNG_BASE_URL}/search?${params.toString()}`, {
      next: { revalidate: 60 },
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

// ── Page ──────────────────────────────────────────────────────────────────────

interface SearchPageProps {
  searchParams: Promise<{
    q?: string;
    p?: string;
    category?: string;
    time_range?: string;
  }>;
}

export async function generateMetadata({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const q = params?.q ?? "";
  return {
    title: q ? `${q} — SearchX` : "SearchX",
    description: `Search results for "${q}" — private search powered by SearXNG`,
  };
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const query = params?.q?.trim() ?? "";
  const page = Math.max(1, parseInt(params?.p ?? "1", 10));
  const category = params?.category ?? "";
  const timeRange = params?.time_range ?? "";

  if (!query) notFound();

  const data = await fetchResults(query, page, category, timeRange);

  return (
    <div
      style={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}
    >
      {/* ── Top bar ── */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: "var(--sx-bg)",
          borderBottom: "1px solid var(--sx-border)",
          backdropFilter: "blur(8px)",
        }}
      >
        <div
          style={{
            maxWidth: "960px",
            margin: "0 auto",
            padding: "0.65rem 1.25rem",
            display: "flex",
            alignItems: "center",
            gap: "1rem",
          }}
        >
          {/* Logo link */}
          <Link
            href="/"
            style={{
              fontWeight: 700,
              fontSize: "1.15rem",
              color: "var(--sx-text)",
              textDecoration: "none",
              letterSpacing: "-0.03em",
              flexShrink: 0,
            }}
            aria-label="SearchX home"
          >
            Search<span style={{ color: "var(--sx-accent)" }}>X</span>
          </Link>

          {/* Search bar */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <Suspense>
              <SearchBar initialQuery={query} compact />
            </Suspense>
          </div>
        </div>
      </header>

      {/* ── Body ── */}
      <main
        style={{
          maxWidth: "960px",
          margin: "0 auto",
          padding: "0.5rem 1.25rem 3rem",
          width: "100%",
          flex: 1,
        }}
      >
        {/* Filter bar */}
        <Suspense>
          <FilterBar />
        </Suspense>

        {/* Error state */}
        {!data && (
          <div
            style={{
              textAlign: "center",
              padding: "4rem 1rem",
              color: "var(--sx-muted)",
            }}
          >
            <p style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>⚠️</p>
            <p style={{ fontWeight: 500 }}>Could not reach SearXNG</p>
            <p style={{ fontSize: "0.875rem", marginTop: "0.35rem" }}>
              Make sure SearXNG is running at{" "}
              <code
                style={{
                  background: "var(--sx-surface)",
                  padding: "0.1rem 0.4rem",
                  borderRadius: "4px",
                  fontSize: "0.85em",
                }}
              >
                {SEARXNG_BASE_URL}
              </code>
            </p>
          </div>
        )}

        {/* Results grid */}
        {data && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr",
              gap: "0",
            }}
          >
            {/* Infobox */}
            {data.infoboxes && data.infoboxes.length > 0 && (
              <aside style={{ margin: "1rem 0" }}>
                {data.infoboxes.slice(0, 1).map((box, i) => (
                  <div key={i} className="sx-infobox">
                    <p
                      style={{
                        fontWeight: 600,
                        marginBottom: "0.4rem",
                        fontSize: "0.95rem",
                      }}
                    >
                      {box.infobox}
                    </p>
                    {box.content && (
                      <p
                        style={{
                          color: "var(--sx-muted)",
                          fontSize: "0.875rem",
                        }}
                        dangerouslySetInnerHTML={{ __html: box.content }}
                      />
                    )}
                    {box.urls && box.urls.length > 0 && (
                      <div
                        style={{
                          marginTop: "0.6rem",
                          display: "flex",
                          gap: "0.5rem",
                          flexWrap: "wrap",
                        }}
                      >
                        {box.urls.slice(0, 4).map((u, j) => (
                          <a
                            key={j}
                            href={u.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              fontSize: "0.78rem",
                              color: "var(--sx-accent)",
                              textDecoration: "none",
                            }}
                          >
                            {u.title} →
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </aside>
            )}

            {/* Answers */}
            {data.answers && data.answers.length > 0 && (
              <div
                style={{
                  margin: "0.75rem 0",
                  padding: "0.85rem 1.1rem",
                  background:
                    "color-mix(in srgb, var(--sx-accent) 8%, var(--sx-surface))",
                  border:
                    "1.5px solid color-mix(in srgb, var(--sx-accent) 25%, transparent)",
                  borderRadius: "var(--sx-radius)",
                  fontSize: "0.9rem",
                }}
              >
                {(() => {
                  const normalized = normalizeAnswerItem(data.answers[0]);
                  if (!normalized.text) return null;

                  return (
                    <>
                      <span style={{ fontWeight: 600 }}>Answer: </span>
                      {normalized.url ? (
                        <a
                          href={normalized.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            color: "var(--sx-accent)",
                            textDecoration: "none",
                          }}
                        >
                          {normalized.text}
                        </a>
                      ) : (
                        normalized.text
                      )}
                    </>
                  );
                })()}
              </div>
            )}

            {/* Stats row */}
            <div
              style={{
                padding: "0.6rem 0",
                fontSize: "0.78rem",
                color: "var(--sx-muted)",
              }}
            >
              {data.number_of_results > 0 && (
                <span>
                  About {data.number_of_results.toLocaleString()} results
                  {page > 1 && ` · Page ${page}`}
                </span>
              )}
            </div>

            {/* No results */}
            {data.results.length === 0 && (
              <div
                style={{
                  padding: "3rem 0",
                  textAlign: "center",
                  color: "var(--sx-muted)",
                }}
              >
                <p style={{ fontSize: "1.2rem", marginBottom: "0.4rem" }}>
                  No results found
                </p>
                <p style={{ fontSize: "0.875rem" }}>
                  Try different keywords or remove filters.
                </p>
              </div>
            )}

            {/* Result cards */}
            <Suspense fallback={<ResultsSkeleton />}>
              <div>
                {data.results.map((result, i) => (
                  <ResultCard
                    key={`${result.url}-${i}`}
                    result={result}
                    index={i}
                  />
                ))}
              </div>
            </Suspense>

            {/* Suggestions */}
            {data.suggestions && data.suggestions.length > 0 && (
              <div
                style={{
                  marginTop: "1.5rem",
                  borderTop: "1px solid var(--sx-border)",
                  paddingTop: "1rem",
                }}
              >
                <p
                  style={{
                    fontSize: "0.78rem",
                    color: "var(--sx-muted)",
                    marginBottom: "0.5rem",
                  }}
                >
                  Related searches
                </p>
                <div
                  style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}
                >
                  {data.suggestions.slice(0, 8).map((s) => (
                    <Link
                      key={s}
                      href={`/search?q=${encodeURIComponent(s)}${category ? `&category=${category}` : ""}`}
                      className="sx-chip"
                      style={{ textDecoration: "none" }}
                    >
                      {s}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Pagination */}
            <Suspense>
              <Pagination
                currentPage={page}
                hasMore={data.results.length >= 10}
              />
            </Suspense>
          </div>
        )}
      </main>
    </div>
  );
}
