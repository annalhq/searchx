import { Suspense } from "react";
import Link from "next/link";
import SearchBar from "./components/SearchBar";
import {
  Globe,
  Newspaper,
  FlaskConical,
  Play,
  ShieldCheck,
} from "lucide-react";

const QUICK_LINKS = [
  {
    label: "Web",
    q: "web search",
    category: "general",
    icon: Globe,
  },
  {
    label: "News",
    q: "breaking news",
    category: "news",
    icon: Newspaper,
  },
  {
    label: "Science",
    q: "science",
    category: "science",
    icon: FlaskConical,
  },
  {
    label: "Videos",
    q: "videos",
    category: "videos",
    icon: Play,
  },
] as const;

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-dvh px-4 py-8">
      {/* Logo / wordmark */}
      <div className="mb-10 text-center animate-fadeIn">
        <h1 className="text-5xl sm:text-6xl font-bold tracking-tight text-base-content leading-none">
          Search
          <span className="text-primary">X</span>
        </h1>
        <p className="mt-3 text-sm text-base-content/40 font-light tracking-wide">
          Privacy-respecting · No tracking · Open source
        </p>
      </div>

      {/* Search bar */}
      <div
        className="w-full max-w-[580px] animate-fadeUp"
        style={{ animationDelay: "100ms" }}
      >
        <Suspense>
          <SearchBar />
        </Suspense>
      </div>

      {/* Quick links */}
      <div
        className="mt-8 flex gap-2 flex-wrap justify-center animate-fadeUp"
        style={{ animationDelay: "200ms" }}
      >
        {QUICK_LINKS.map(({ label, q, category, icon: Icon }) => (
          <Link
            key={label}
            href={`/search?q=${encodeURIComponent(q)}&category=${category}`}
            className="btn btn-sm btn-ghost rounded-full gap-1.5 text-base-content/45 hover:text-base-content hover:bg-base-300/40 transition-all duration-150 font-normal"
          >
            <Icon size={13} />
            {label}
          </Link>
        ))}
        <Link
          href="/verify"
          className="btn btn-sm btn-ghost rounded-full gap-1.5 text-primary/70 hover:text-primary hover:bg-primary/5 transition-all duration-150 font-normal"
        >
          <ShieldCheck size={13} />
          Verify Proof
        </Link>
      </div>
    </div>
  );
}
