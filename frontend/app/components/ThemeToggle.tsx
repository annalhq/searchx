"use client";

import { useEffect, useState } from "react";
import { Sun, Moon, Palette, Check } from "lucide-react";

const THEMES = [
  { id: "light",     label: "Light",     dark: false },
  { id: "dark",      label: "Dark",      dark: true  },
  { id: "cupcake",   label: "Cupcake",   dark: false },
  { id: "synthwave", label: "Synthwave", dark: true  },
  { id: "cyberpunk", label: "Cyberpunk", dark: false },
  { id: "dracula",   label: "Dracula",   dark: true  },
  { id: "forest",    label: "Forest",    dark: true  },
  { id: "aqua",      label: "Aqua",      dark: true  },
  { id: "lofi",      label: "Lo-fi",     dark: false },
  { id: "black",     label: "Black",     dark: true  },
  { id: "luxury",    label: "Luxury",    dark: true  },
  { id: "night",     label: "Night",     dark: true  },
  { id: "coffee",    label: "Coffee",    dark: true  },
  { id: "winter",    label: "Winter",    dark: false },
  { id: "dim",       label: "Dim",       dark: true  },
  { id: "nord",      label: "Nord",      dark: false },
] as const;

type ThemeId = (typeof THEMES)[number]["id"];

const STORAGE_KEY = "searchx-theme";
const DEFAULT_THEME: ThemeId = "dark";

function applyTheme(theme: ThemeId) {
  document.documentElement.setAttribute("data-theme", theme);
}

export default function ThemeToggle() {
  const [current, setCurrent] = useState<ThemeId>(DEFAULT_THEME);
  const [mounted, setMounted] = useState(false);

  // On mount, read saved theme
  useEffect(() => {
    const saved = (localStorage.getItem(STORAGE_KEY) as ThemeId) || DEFAULT_THEME;
    setCurrent(saved);
    applyTheme(saved);
    setMounted(true);
  }, []);

  function setTheme(theme: ThemeId) {
    setCurrent(theme);
    applyTheme(theme);
    localStorage.setItem(STORAGE_KEY, theme);
    // Close dropdown by blurring active element
    (document.activeElement as HTMLElement)?.blur();
  }

  const isDark = THEMES.find((t) => t.id === current)?.dark ?? false;

  // Avoid hydration mismatch — render placeholder until mounted
  if (!mounted) {
    return (
      <div className="w-8 h-8 rounded-full bg-base-200 animate-pulse" />
    );
  }

  return (
    <div className="dropdown dropdown-end">
      {/* Trigger button */}
      <button
        tabIndex={0}
        role="button"
        className="btn btn-ghost btn-sm btn-circle"
        title="Change theme"
        aria-label="Change theme"
        id="theme-toggle-btn"
      >
        {isDark ? (
          <Moon size={16} className="text-base-content/70" />
        ) : (
          <Sun size={16} className="text-base-content/70" />
        )}
      </button>

      {/* Dropdown panel */}
      <div
        tabIndex={0}
        className="dropdown-content z-[9999] mt-2 w-52 rounded-2xl border border-base-300 bg-base-100 shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-base-300 bg-base-200/60">
          <Palette size={13} className="text-primary" />
          <span className="text-xs font-semibold text-base-content/60 uppercase tracking-wider">
            Theme
          </span>
        </div>

        {/* Theme list */}
        <ul className="max-h-72 overflow-y-auto py-1">
          {THEMES.map((t) => (
            <li key={t.id}>
              <button
                className="w-full flex items-center gap-2.5 px-3 py-1.5 text-sm hover:bg-base-200 transition-colors text-left"
                onClick={() => setTheme(t.id)}
              >
                {/* Mini swatch */}
                <span
                  data-theme={t.id}
                  className="w-5 h-5 rounded-full border border-base-content/10 shrink-0 overflow-hidden flex"
                >
                  <span className="flex-1 bg-primary" />
                  <span className="flex-1 bg-secondary" />
                </span>

                <span className="flex-1 text-base-content/80">{t.label}</span>

                {/* Dark/light pill */}
                <span className="text-[0.55rem] text-base-content/30 bg-base-200 rounded px-1 py-0.5 shrink-0">
                  {t.dark ? "dark" : "light"}
                </span>

                {/* Active check */}
                {current === t.id && (
                  <Check size={12} className="text-primary shrink-0" />
                )}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
