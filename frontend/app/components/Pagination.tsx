"use client";

import { useRouter, useSearchParams } from "next/navigation";

interface PaginationProps {
  currentPage: number;
  hasMore: boolean;
}

export default function Pagination({ currentPage, hasMore }: PaginationProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function goTo(page: number) {
    const params = new URLSearchParams(searchParams.toString());
    if (page <= 1) params.delete("p");
    else params.set("p", String(page));
    router.push(`/search?${params.toString()}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (currentPage <= 1 && !hasMore) return null;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.6rem",
        padding: "2rem 0 1rem",
      }}
    >
      {currentPage > 1 && (
        <button
          className="sx-chip active"
          onClick={() => goTo(currentPage - 1)}
          aria-label="Previous page"
          id="btn-prev-page"
        >
          ← Prev
        </button>
      )}

      <span
        style={{
          fontSize: "0.82rem",
          color: "var(--sx-muted)",
          padding: "0 0.5rem",
          minWidth: "5rem",
          textAlign: "center",
        }}
      >
        Page {currentPage}
      </span>

      {hasMore && (
        <button
          className="sx-chip active"
          onClick={() => goTo(currentPage + 1)}
          aria-label="Next page"
          id="btn-next-page"
        >
          Next →
        </button>
      )}
    </div>
  );
}
