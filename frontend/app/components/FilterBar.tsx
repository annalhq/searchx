"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  LayoutGrid,
  Globe,
  Image,
  Newspaper,
  Play,
  FlaskConical,
  Clock,
} from "lucide-react";

const CATEGORIES = [
  { label: "All", value: "", icon: LayoutGrid },
  { label: "Web", value: "general", icon: Globe },
  { label: "Images", value: "images", icon: Image },
  { label: "News", value: "news", icon: Newspaper },
  { label: "Videos", value: "videos", icon: Play },
  { label: "Science", value: "science", icon: FlaskConical },
] as const;

const TIME_RANGES = [
  { label: "Any time", value: "" },
  { label: "Past day", value: "day" },
  { label: "Past week", value: "week" },
  { label: "Past month", value: "month" },
  { label: "Past year", value: "year" },
] as const;

export default function FilterBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeCategory = searchParams.get("category") ?? "";
  const activeTime = searchParams.get("time_range") ?? "";

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete("p");
    router.push(`/search?${params.toString()}`);
  }

  return (
    <div className="flex flex-col gap-3 pt-2 pb-3 border-b border-base-300">
      {/* Category row */}
      <div className="flex gap-1.5 flex-wrap">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isActive = activeCategory === cat.value;
          return (
            <button
              key={cat.value}
              className={`btn btn-xs gap-1 rounded-full transition-all duration-150 ${
                isActive
                  ? "btn-primary"
                  : "btn-ghost text-base-content/50 hover:text-base-content hover:bg-base-300/50"
              }`}
              onClick={() => updateParam("category", cat.value)}
              aria-pressed={isActive}
              aria-label={`Filter by ${cat.label}`}
            >
              <Icon size={12} />
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Time row */}
      <div className="flex gap-1.5 flex-wrap items-center">
        <span className="text-xs text-base-content/40 mr-1 flex items-center gap-1">
          <Clock size={11} />
          Time:
        </span>
        {TIME_RANGES.map((tr) => {
          const isActive = activeTime === tr.value;
          return (
            <button
              key={tr.value}
              className={`btn btn-xs rounded-full transition-all duration-150 ${
                isActive
                  ? "btn-primary btn-outline"
                  : "btn-ghost text-base-content/40 hover:text-base-content/70"
              }`}
              onClick={() => updateParam("time_range", tr.value)}
              aria-pressed={isActive}
            >
              {tr.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
