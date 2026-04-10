"use client";

import { useState, useRef, useEffect, FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X, ArrowRight } from "lucide-react";

interface SearchBarProps {
  initialQuery?: string;
  compact?: boolean;
}

export default function SearchBar({
  initialQuery = "",
  compact = false,
}: SearchBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(initialQuery);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // keep in sync when navigating back/forward
  useEffect(() => {
    setQuery(searchParams.get("q") ?? initialQuery);
  }, [searchParams, initialQuery]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("q", trimmed);
    params.delete("p"); // reset to page 1
    router.push(`/search?${params.toString()}`);
  }

  function handleClear() {
    setQuery("");
    inputRef.current?.focus();
  }

  /* ── Compact variant (results page header) ── */
  if (compact) {
    return (
      <form onSubmit={handleSubmit} role="search" className="w-full">
        <div className="relative flex items-center">
          <input
            ref={inputRef}
            type="text"
            className="w-full bg-base-200/60 border border-base-300 rounded-lg pl-3 pr-16 py-1.5 text-sm text-base-content placeholder:text-base-content/30 outline-none transition-all duration-200 focus:border-primary/40 focus:bg-base-200"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search anything…"
            autoComplete="off"
            spellCheck="false"
            aria-label="Search query"
            id="search-input"
          />
          {/* Right-side actions */}
          <div className="absolute right-1.5 flex items-center gap-0.5">
            {query && (
              <button
                type="button"
                onClick={handleClear}
                aria-label="Clear search"
                className="p-1 rounded text-base-content/25 hover:text-base-content/60 transition-colors"
              >
                <X size={14} strokeWidth={2} />
              </button>
            )}
            <button
              type="submit"
              className="p-1.5 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              aria-label="Submit search"
            >
              <Search size={13} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </form>
    );
  }

  /* ── Full variant (home page) ── */
  return (
    <form onSubmit={handleSubmit} role="search" className="w-full">
      <div
        className={`relative flex items-center bg-base-100 rounded-2xl border transition-all duration-300 ${
          focused
            ? "border-primary/30 shadow-lg shadow-primary/5"
            : "border-base-300 shadow-md shadow-base-content/3"
        }`}
      >
        {/* Search icon */}
        <span className="pl-5 text-base-content/30">
          <Search size={18} strokeWidth={2} />
        </span>

        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          className="flex-1 bg-transparent border-none outline-none text-base-content text-base py-4 px-3 placeholder:text-base-content/25"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Search anything…"
          autoFocus
          autoComplete="off"
          spellCheck="false"
          aria-label="Search query"
          id="search-input"
        />

        {/* Clear button */}
        {query && (
          <button
            type="button"
            onClick={handleClear}
            aria-label="Clear search"
            className="p-1.5 mr-1 rounded-lg text-base-content/20 hover:text-base-content/50 hover:bg-base-200/60 transition-all"
          >
            <X size={16} strokeWidth={2} />
          </button>
        )}

        {/* Submit button — icon-only circle */}
        <button
          type="submit"
          className={`mr-2 p-3 rounded-xl transition-all duration-200 ${
            query.trim()
              ? "bg-primary text-primary-content shadow-md shadow-primary/25 hover:shadow-lg hover:shadow-primary/30 hover:scale-105 active:scale-95"
              : "bg-base-200 text-base-content/30 cursor-default"
          }`}
          aria-label="Submit search"
        >
          <ArrowRight size={18} strokeWidth={2.5} />
        </button>
      </div>
    </form>
  );
}
