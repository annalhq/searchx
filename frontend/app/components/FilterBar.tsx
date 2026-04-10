"use client";

import { useRouter, useSearchParams } from "next/navigation";

const CATEGORIES = [
  { label: "All",     value: "",         icon: "⊞" },
  { label: "Web",     value: "general",  icon: "🌐" },
  { label: "Images",  value: "images",   icon: "🖼" },
  { label: "News",    value: "news",     icon: "📰" },
  { label: "Videos",  value: "videos",   icon: "▶" },
  { label: "Science", value: "science",  icon: "🔬" },
];

const TIME_RANGES = [
  { label: "Any time", value: "" },
  { label: "Past day",  value: "day" },
  { label: "Past week", value: "week" },
  { label: "Past month",value: "month" },
  { label: "Past year", value: "year" },
];

export default function FilterBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeCategory = searchParams.get("category") ?? "";
  const activeTime = searchParams.get("time_range") ?? "";

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value); else params.delete(key);
    params.delete("p");
    router.push(`/search?${params.toString()}`);
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.6rem",
        paddingTop: "0.5rem",
        paddingBottom: "0.75rem",
        borderBottom: "1px solid var(--sx-border)",
      }}
    >
      {/* Category row */}
      <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            className={`sx-chip ${activeCategory === cat.value ? "active" : ""}`}
            onClick={() => updateParam("category", cat.value)}
            aria-pressed={activeCategory === cat.value}
            aria-label={`Filter by ${cat.label}`}
          >
            <span role="img" aria-hidden>{cat.icon}</span>
            {cat.label}
          </button>
        ))}
      </div>

      {/* Time row */}
      <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontSize: "0.78rem", color: "var(--sx-muted)", marginRight: "0.2rem" }}>
          Time:
        </span>
        {TIME_RANGES.map((tr) => (
          <button
            key={tr.value}
            className={`sx-chip ${activeTime === tr.value ? "active" : ""}`}
            onClick={() => updateParam("time_range", tr.value)}
            aria-pressed={activeTime === tr.value}
            style={{ padding: "0.2rem 0.6rem", fontSize: "0.75rem" }}
          >
            {tr.label}
          </button>
        ))}
      </div>
    </div>
  );
}
