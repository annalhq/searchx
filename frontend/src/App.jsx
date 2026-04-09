import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Layers, AlertCircle } from "lucide-react";

import SearchBar from "./components/SearchBar";
import ResultCard from "./components/ResultCard";
import DriftIndicator from "./components/DriftIndicator";
import LedgerView from "./components/LedgerView";
import { search, recordClick } from "./api";

export default function App() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState([]);
  const [drift, setDrift] = useState(null);
  const [isRepeatQuery, setIsRepeatQuery] = useState(false);
  const [currentSearchBlockId, setCurrentSearchBlockId] = useState(null);
  const [ledgerTick, setLedgerTick] = useState(0);
  const [activeTab, setActiveTab] = useState("results"); // "results" | "ledger"

  async function handleSearch(query) {
    setLoading(true);
    setError(null);
    setResults([]);
    setDrift(null);

    try {
      const data = await search(query);
      setResults(data.results || []);
      setDrift(data.drift);
      setIsRepeatQuery(data.is_repeat_query);
      setCurrentSearchBlockId(data.block?.id ?? null);
      setLedgerTick((t) => t + 1);
      setActiveTab("results");
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
          "Failed to reach the SearchX backend. Is it running on :8000?"
      );
    } finally {
      setLoading(false);
    }
  }

  function handleClickUrl(url) {
    if (!currentSearchBlockId) return;
    // Fire-and-forget — don't block the user
    recordClick(url, currentSearchBlockId)
      .then(() => setLedgerTick((t) => t + 1))
      .catch(() => {});
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-950">
      {/* ── Background glow blobs ─────────────────────────────────────── */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden>
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -right-48 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-emerald-500/4 rounded-full blur-3xl" />
      </div>

      {/* ── Header ────────────────────────────────────────────────────── */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-slate-800/60">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
            <Layers className="w-4 h-4 text-slate-950" />
          </div>
          <span className="font-bold text-slate-100 text-lg tracking-tight">
            Search<span className="gradient-text">X</span>
          </span>
        </div>
        <p className="text-slate-500 text-xs font-mono hidden sm:block">
          Verifiable Search Trail · Base Sepolia
        </p>
      </header>

      {/* ── Main ──────────────────────────────────────────────────────── */}
      <main className="relative z-10 flex-1 max-w-4xl w-full mx-auto px-4 py-10 flex flex-col gap-8">
        {/* Hero */}
        <div className="text-center flex flex-col items-center gap-3">
          <motion.h1
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-4xl sm:text-5xl font-bold gradient-text leading-tight"
          >
            Provable Search.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="text-slate-400 text-base max-w-md"
          >
            Every query &amp; result is hashed and anchored to the blockchain.
            What you searched, when, and what came back — forever verifiable.
          </motion.p>
        </div>

        {/* Search bar */}
        <SearchBar onSearch={handleSearch} loading={loading} />

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="glass border border-red-500/20 bg-red-500/5 p-4 rounded-xl flex items-start gap-3"
            >
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-300 text-sm">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tabs — shown only after first search */}
        {(results.length > 0 || drift) && (
          <div className="flex gap-1 border-b border-slate-800 pb-0">
            {["results", "ledger"].map((tab) => (
              <button
                key={tab}
                id={`tab-${tab}`}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm font-medium capitalize transition-colors rounded-t-lg
                  ${activeTab === tab
                    ? "text-emerald-400 border-b-2 border-emerald-400 -mb-px"
                    : "text-slate-500 hover:text-slate-300"
                  }`}
              >
                {tab}
                {tab === "results" && results.length > 0 && (
                  <span className="ml-1.5 text-xs bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded-full">
                    {results.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Results tab */}
        <AnimatePresence mode="wait">
          {activeTab === "results" && (
            <motion.div
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col gap-4"
            >
              <DriftIndicator drift={drift} isRepeatQuery={isRepeatQuery} />
              {results.map((r, i) => (
                <ResultCard
                  key={r.url + i}
                  result={r}
                  index={i}
                  onClickUrl={handleClickUrl}
                />
              ))}
            </motion.div>
          )}
          {activeTab === "ledger" && (
            <motion.div
              key="ledger"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <LedgerView refreshTrigger={ledgerTick} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Default ledger (no search yet) */}
        {results.length === 0 && !drift && !loading && !error && (
          <LedgerView refreshTrigger={ledgerTick} />
        )}
      </main>

      {/* ── Footer ────────────────────────────────────────────────────── */}
      <footer className="relative z-10 border-t border-slate-800/60 py-4 text-center text-slate-600 text-xs font-mono">
        SearchX · Cryptographic audit trail · Base Sepolia Testnet
      </footer>
    </div>
  );
}
