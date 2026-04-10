"use client";

import { useState, useRef, useEffect, FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";

interface SearchBarProps {
  initialQuery?: string;
  compact?: boolean;
}

const SearchIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const XIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

export default function SearchBar({ initialQuery = "", compact = false }: SearchBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(initialQuery);
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

  return (
    <form onSubmit={handleSubmit} role="search" style={{ width: "100%" }}>
      <div className="sx-input-wrap">
        {!compact && (
          <span style={{ paddingLeft: "1rem", color: "var(--sx-muted)", display: "flex", alignItems: "center" }}>
            <SearchIcon />
          </span>
        )}
        <input
          ref={inputRef}
          type="search"
          className="sx-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search anything…"
          autoFocus={!compact}
          autoComplete="off"
          spellCheck="false"
          aria-label="Search query"
          id="search-input"
          style={compact ? { paddingLeft: "1.1rem" } : {}}
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            aria-label="Clear search"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "0 0.5rem",
              color: "var(--sx-muted)",
              display: "flex",
              alignItems: "center",
            }}
          >
            <XIcon />
          </button>
        )}
        <button type="submit" className="sx-search-btn" aria-label="Submit search">
          <SearchIcon />
          <span>Search</span>
        </button>
      </div>
    </form>
  );
}
