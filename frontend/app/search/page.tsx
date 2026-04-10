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
  timeRange: string
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
    <div className="min-h-dvh flex flex-col bg-base-200">
      {/* ── Top bar ── */}
      <header className="sticky top-0 z-50 bg-base-100/80 backdrop-blur-xl border-b border-base-300">
        <div className="max-w-[960px] mx-auto px-5 py-2.5 flex items-center gap-4">
          {/* Logo link */}
          <Link
            href="/"
            className="font-bold text-lg tracking-tight text-base-content shrink-0 hover:opacity-70 transition-opacity"
            aria-label="SearchX home"
          >
            Search<span className="text-primary">X</span>
          </Link>

          {/* Search bar */}
          <div className="flex-1 min-w-0">
            <Suspense>
              <SearchBar initialQuery={query} compact />
            </Suspense>
          </div>
        </div>
      </header>

      {/* ── Body ── */}
      <main className="max-w-[960px] mx-auto px-5 pb-12 w-full flex-1">
        {/* Filter bar */}
        <Suspense>
          <FilterBar />
        </Suspense>

        {/* Error state */}
        {!data && (
          <div className="text-center py-16 text-base-content/40">
            <p className="text-4xl mb-3">⚠️</p>
            <p className="font-medium text-base-content/60">
              Could not reach SearXNG
            </p>
            <p className="text-sm mt-2">
              Make sure SearXNG is running at{" "}
              <code className="bg-base-300 px-1.5 py-0.5 rounded text-xs">
                {SEARXNG_BASE_URL}
              </code>
            </p>
          </div>
        )}

        {/* Results grid */}
        {data && (
          <div>
            {/* Infobox */}
            {data.infoboxes && data.infoboxes.length > 0 && (
              <aside className="my-4">
                {data.infoboxes.slice(0, 1).map((box, i) => (
                  <div
                    key={i}
                    className="bg-base-100 border border-base-300 rounded-xl p-4"
                  >
                    <p className="font-semibold text-sm mb-1">{box.infobox}</p>
                    {box.content && (
                      <p
                        className="text-sm text-base-content/50 leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: box.content }}
                      />
                    )}
                    {box.urls && box.urls.length > 0 && (
                      <div className="mt-3 flex gap-3 flex-wrap">
                        {box.urls.slice(0, 4).map((u, j) => (
                          <a
                            key={j}
                            href={u.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline"
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
              <div className="my-3 p-3.5 bg-primary/5 border border-primary/15 rounded-xl text-sm animate-fadeUp">
                {(() => {
                  const normalized = normalizeAnswerItem(data.answers[0]);
                  if (!normalized.text) return null;

                  return (
                    <>
                      <span className="font-semibold text-primary">
                        Answer:{" "}
                      </span>
                      {normalized.url ? (
                        <a
                          href={normalized.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
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
            <div className="py-2 text-xs text-base-content/35">
              {data.number_of_results > 0 && (
                <span>
                  About {data.number_of_results.toLocaleString()} results
                  {page > 1 && ` · Page ${page}`}
                </span>
              )}
            </div>

            {/* No results */}
            {data.results.length === 0 && (
              <div className="py-12 text-center text-base-content/40">
                <p className="text-lg font-medium mb-1">No results found</p>
                <p className="text-sm">
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
                    query={query}
                  />
                ))}
              </div>
            </Suspense>

            {/* Suggestions */}
            {data.suggestions && data.suggestions.length > 0 && (
              <div className="mt-6 pt-4 border-t border-base-300">
                <p className="text-xs text-base-content/35 mb-2.5">
                  Related searches
                </p>
                <div className="flex gap-2 flex-wrap">
                  {data.suggestions.slice(0, 8).map((s) => (
                    <Link
                      key={s}
                      href={`/search?q=${encodeURIComponent(s)}${category ? `&category=${category}` : ""}`}
                      className="btn btn-xs btn-ghost rounded-full text-base-content/50 hover:text-base-content hover:bg-base-300/50"
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
