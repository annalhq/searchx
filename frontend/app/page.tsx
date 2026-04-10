import { Suspense } from "react";
import SearchBar from "./components/SearchBar";

export default function HomePage() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100dvh",
        padding: "2rem 1rem",
      }}
    >
      {/* Logo / wordmark */}
      <div style={{ marginBottom: "2.5rem", textAlign: "center" }}>
        <h1
          style={{
            fontSize: "clamp(2.2rem, 6vw, 3.5rem)",
            fontWeight: 700,
            letterSpacing: "-0.03em",
            color: "var(--sx-text)",
            lineHeight: 1.1,
          }}
        >
          Search
          <span style={{ color: "var(--sx-accent)" }}>X</span>
        </h1>
        <p
          style={{
            marginTop: "0.5rem",
            fontSize: "0.9rem",
            color: "var(--sx-muted)",
            fontWeight: 400,
          }}
        >
          Privacy-respecting · No tracking · Open source
        </p>
      </div>

      {/* Search bar */}
      <div style={{ width: "100%", maxWidth: "580px" }}>
        <Suspense>
          <SearchBar />
        </Suspense>
      </div>

      {/* Quick links */}
      <div
        style={{
          marginTop: "2rem",
          display: "flex",
          gap: "0.6rem",
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        {[
          { label: "Web", q: "web search", category: "general" },
          { label: "News", q: "breaking news", category: "news" },
          { label: "Science", q: "science", category: "science" },
          { label: "Videos", q: "videos", category: "videos" },
        ].map(({ label, q, category }) => (
          <a
            key={label}
            href={`/search?q=${encodeURIComponent(q)}&category=${category}`}
            className="sx-chip"
            style={{ textDecoration: "none" }}
          >
            {label}
          </a>
        ))}
        <a
          href="/verify"
          className="sx-chip"
          style={{
            textDecoration: "none",
            borderColor: "color-mix(in srgb, var(--sx-accent) 40%, transparent)",
            color: "var(--sx-accent)",
          }}
        >
          🛡 Verify Proof
        </a>
      </div>

      {/* Footer */}
      {/* <footer
        style={{
          position: "absolute",
          bottom: "1.25rem",
          fontSize: "0.75rem",
          color: "var(--sx-muted)",
          textAlign: "center",
        }}
      >
        
      </footer> */}
    </div>
  );
}
