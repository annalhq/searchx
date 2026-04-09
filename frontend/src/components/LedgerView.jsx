import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Database, CheckCircle2, Clock3, MousePointerClick, Search, ExternalLink } from "lucide-react";
import { getLedger } from "../api";

/** Format ISO date string to short relative time */
function timeAgo(isoStr) {
  if (!isoStr) return "—";
  const diff = (Date.now() - new Date(isoStr).getTime()) / 1000;
  if (diff < 60) return `${Math.round(diff)}s ago`;
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
  return new Date(isoStr).toLocaleDateString();
}

function BlockRow({ block, index }) {
  const isSearch = block.block_type === "search";
  const isAnchored = Boolean(block.blockchain_tx_hash);

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
      className="flex items-start gap-4 group"
    >
      {/* Timeline stem */}
      <div className="flex flex-col items-center flex-shrink-0">
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center border-2 flex-shrink-0
            ${isSearch
              ? "border-emerald-500 bg-emerald-500/10"
              : "border-cyan-500 bg-cyan-500/10"
            }`}
        >
          {isSearch
            ? <Search className="w-3.5 h-3.5 text-emerald-400" />
            : <MousePointerClick className="w-3.5 h-3.5 text-cyan-400" />
          }
        </div>
        <div className="w-px flex-1 bg-slate-800 mt-1 min-h-[24px]" />
      </div>

      {/* Content */}
      <div className="flex-1 glass p-3.5 rounded-xl mb-3 min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className={`text-xs font-mono font-semibold uppercase tracking-wider
            ${isSearch ? "text-emerald-400" : "text-cyan-400"}`}>
            {block.block_type}
          </span>
          <span className="text-xs text-slate-500 font-mono">{timeAgo(block.created_at)}</span>
        </div>

        {/* Main info */}
        {block.query_string && (
          <p className="text-slate-200 text-sm font-medium mt-1 truncate">
            "{block.query_string}"
          </p>
        )}

        {/* Hash */}
        <p className="text-slate-600 text-xs font-mono mt-1.5 truncate">
          # {block.block_hash}
        </p>

        {/* Chain status */}
        <div className="flex items-center gap-1.5 mt-2">
          {isAnchored ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              <a
                href={`https://sepolia.basescan.org/tx/${block.blockchain_tx_hash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-emerald-400 font-mono hover:text-emerald-300 truncate flex items-center gap-1"
              >
                Anchored on Base Sepolia
                <ExternalLink className="w-3 h-3 flex-shrink-0" />
              </a>
            </>
          ) : (
            <>
              <Clock3 className={`w-3.5 h-3.5 flex-shrink-0 chain-dot text-slate-500`} />
              <span className="text-xs text-slate-500 font-mono">Pending anchor…</span>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/**
 * LedgerView — real-time timeline of all recorded blocks.
 *
 * Props:
 *   refreshTrigger: any (when changed, the ledger re-fetches)
 */
export default function LedgerView({ refreshTrigger }) {
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function fetchLedger() {
    try {
      setError(null);
      const { blocks: data } = await getLedger();
      setBlocks(data);
    } catch {
      setError("Could not reach the SearchX backend.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchLedger(); }, [refreshTrigger]);

  // Poll every 5 s to pick up blockchain confirmations
  useEffect(() => {
    const t = setInterval(fetchLedger, 5000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="glass p-6 rounded-2xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Database className="w-5 h-5 text-emerald-400" />
        <h2 className="font-semibold text-slate-100">Verifiable Ledger</h2>
        <span className="text-xs font-mono text-slate-500 ml-auto">
          {blocks.length} block{blocks.length !== 1 ? "s" : ""}
        </span>
      </div>

      {loading && (
        <p className="text-slate-500 text-sm text-center py-8">Loading blocks…</p>
      )}
      {error && (
        <p className="text-red-400 text-sm text-center py-8">{error}</p>
      )}

      {!loading && !error && blocks.length === 0 && (
        <p className="text-slate-600 text-sm text-center py-8 font-mono">
          No blocks yet — run a search to start the trail.
        </p>
      )}

      <AnimatePresence>
        {blocks.map((block, i) => (
          <BlockRow key={block.id} block={block} index={i} />
        ))}
      </AnimatePresence>
    </div>
  );
}
