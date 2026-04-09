import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Loader2 } from "lucide-react";

/**
 * SearchBar — central animated search input.
 *
 * Props:
 *   onSearch(query: string) => void
 *   loading: bool
 */
export default function SearchBar({ onSearch, loading }) {
  const [value, setValue] = useState("");
  const inputRef = useRef(null);

  function handleSubmit(e) {
    e.preventDefault();
    if (value.trim() && !loading) onSearch(value.trim());
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto">
      <div className="glass glow-focus flex items-center gap-3 px-5 py-3.5 rounded-2xl">
        <AnimatePresence mode="wait" initial={false}>
          {loading ? (
            <motion.span
              key="loader"
              initial={{ opacity: 0, rotate: -90 }}
              animate={{ opacity: 1, rotate: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Loader2 className="w-5 h-5 text-emerald-400 animate-spin flex-shrink-0" />
            </motion.span>
          ) : (
            <motion.span
              key="icon"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Search className="w-5 h-5 text-slate-400 flex-shrink-0" />
            </motion.span>
          )}
        </AnimatePresence>

        <input
          ref={inputRef}
          id="search-input"
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Search anything — every query gets anchored…"
          disabled={loading}
          autoComplete="off"
          spellCheck={false}
          className="flex-1 bg-transparent text-slate-100 placeholder-slate-500 text-base outline-none disabled:opacity-50"
        />

        <motion.button
          type="submit"
          disabled={!value.trim() || loading}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-700 disabled:text-slate-500
                     text-slate-950 font-semibold text-sm px-4 py-1.5 rounded-xl transition-colors
                     flex-shrink-0 cursor-pointer disabled:cursor-not-allowed"
        >
          Search
        </motion.button>
      </div>
    </form>
  );
}
