export default function ResultsSkeleton() {
  return (
    <div style={{ paddingTop: "0.5rem" }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="sx-result"
          style={{ animationDelay: `${i * 60}ms` }}
        >
          {/* URL line */}
          <div className="sx-skeleton" style={{ height: "0.75rem", width: "35%", marginBottom: "0.5rem" }} />
          {/* Title */}
          <div className="sx-skeleton" style={{ height: "1rem", width: "75%", marginBottom: "0.45rem" }} />
          {/* Snippet */}
          <div className="sx-skeleton" style={{ height: "0.8rem", width: "95%", marginBottom: "0.3rem" }} />
          <div className="sx-skeleton" style={{ height: "0.8rem", width: "80%" }} />
        </div>
      ))}
    </div>
  );
}
