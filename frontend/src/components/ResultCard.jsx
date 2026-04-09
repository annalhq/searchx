import { motion } from "framer-motion";
import { ExternalLink, Shield } from "lucide-react";

/**
 * ResultCard — displays one SearXNG result.
 *
 * Props:
 *   result   : { title, url, content, engine }
 *   index    : number (stagger index)
 *   onClickUrl(url: string) => void
 */
export default function ResultCard({ result, index, onClickUrl }) {
  const { title, url, content, engine, engines } = result;
  const displayEngine = engine || (engines && engines[0]) || "web";

  function handleClick(e) {
    // Don't prevent default — let the link open; just fire the tracker
    onClickUrl(url);
  }

  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05, ease: "easeOut" }}
      className="glass result-card p-5 flex flex-col gap-2 cursor-default"
    >
      {/* Source badge */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-mono text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full border border-emerald-400/20 uppercase tracking-wider">
          {displayEngine}
        </span>
      </div>

      {/* Title */}
      <h3 className="text-slate-100 font-semibold text-base leading-snug">
        {title || "Untitled"}
      </h3>

      {/* URL + track click */}
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        className="flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 text-sm font-mono truncate transition-colors group"
      >
        <ExternalLink className="w-3.5 h-3.5 flex-shrink-0 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        <span className="truncate">{url}</span>
      </a>

      {/* Snippet */}
      {content && (
        <p className="text-slate-400 text-sm leading-relaxed line-clamp-2">
          {content}
        </p>
      )}

      {/* Verified badge */}
      <div className="flex items-center gap-1.5 mt-1">
        <Shield className="w-3 h-3 text-slate-600" />
        <span className="text-xs text-slate-600 font-mono">Click will be recorded on-chain</span>
      </div>
    </motion.article>
  );
}
