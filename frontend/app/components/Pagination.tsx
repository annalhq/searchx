"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

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
    <div className="flex items-center justify-center gap-2 pt-8 pb-4">
      {currentPage > 1 && (
        <button
          className="btn btn-sm btn-ghost gap-1 rounded-full text-base-content/60 hover:text-base-content"
          onClick={() => goTo(currentPage - 1)}
          aria-label="Previous page"
          id="btn-prev-page"
        >
          <ChevronLeft size={14} />
          Prev
        </button>
      )}

      <span className="text-sm text-base-content/40 px-3 tabular-nums">
        Page {currentPage}
      </span>

      {hasMore && (
        <button
          className="btn btn-sm btn-ghost gap-1 rounded-full text-base-content/60 hover:text-base-content"
          onClick={() => goTo(currentPage + 1)}
          aria-label="Next page"
          id="btn-next-page"
        >
          Next
          <ChevronRight size={14} />
        </button>
      )}
    </div>
  );
}
