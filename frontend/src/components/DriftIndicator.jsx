import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";

/**
 * DriftIndicator — shows how much search results have changed
 *                  since the last anchored search for the same query.
 *
 * Props:
 *   drift          : { drifted, drift_pct, added, removed, common_count }
 *   isRepeatQuery  : bool
 */
export default function DriftIndicator({ drift, isRepeatQuery }) {
  if (!isRepeatQuery || !drift) return null;

  const { drifted, drift_pct, added, removed, common_count } = drift;

  const status = !drifted
    ? { label: "Results Unchanged", color: "text-emerald-400", bg: "bg-emerald-400/10 border-emerald-400/20", Icon: Minus }
    : drift_pct < 30
    ? { label: "Minor Drift", color: "text-yellow-400", bg: "bg-yellow-400/10 border-yellow-400/20", Icon: TrendingUp }
    : { label: "Significant Drift", color: "text-red-400", bg: "bg-red-400/10 border-red-400/20", Icon: TrendingUp };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className={`glass border ${status.bg} p-4 rounded-xl flex items-start gap-4`}
      >
        {/* Icon */}
        <div className={`${status.color} mt-0.5`}>
          <status.Icon className="w-5 h-5" />
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className={`font-semibold text-sm ${status.color}`}>
            {status.label}{drifted ? ` — ${drift_pct}% change` : ""}
          </p>
          <p className="text-slate-400 text-xs mt-0.5">
            Previously searched query · {common_count} common result{common_count !== 1 ? "s" : ""}
            {added.length > 0 && (
              <span className="text-emerald-400 ml-2">
                <ArrowUpRight className="w-3 h-3 inline" /> {added.length} new
              </span>
            )}
            {removed.length > 0 && (
              <span className="text-red-400 ml-2">
                <ArrowDownRight className="w-3 h-3 inline" /> {removed.length} removed
              </span>
            )}
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
