export default function ResultsSkeleton() {
  return (
    <div className="pt-2 space-y-1">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="py-4 border-b border-base-300/60 animate-fadeUp"
          style={{ animationDelay: `${i * 60}ms` }}
        >
          {/* URL line */}
          <div className="skeleton h-3 w-[35%] mb-2.5 rounded" />
          {/* Title */}
          <div className="skeleton h-4 w-[75%] mb-2 rounded" />
          {/* Snippet lines */}
          <div className="skeleton h-3 w-[95%] mb-1.5 rounded" />
          <div className="skeleton h-3 w-[80%] rounded" />
        </div>
      ))}
    </div>
  );
}
