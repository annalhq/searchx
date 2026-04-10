"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ShieldCheck,
  ShieldX,
  Search,
  Loader2,
  Hash,
  Clock,
  Database,
  Globe,
  FileText,
  Copy,
  Check,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Blocks,
  Activity,
  Link2,
  Wallet,
  RefreshCw,
  Plus,
  ExternalLink,
  Filter,
  LayoutDashboard,
  TrendingUp,
  Box,
  AlertCircle,
} from "lucide-react";

/* ══════════════════════════════════════════════════════════════════════════════
   TYPES
   ══════════════════════════════════════════════════════════════════════════ */

interface OnChainData {
  queryHash: string;
  resultHash: string;
  ipfsCID: string;
  timestamp: number;
  submitter: string;
  recordedAt: string;
}

interface RecomputedData {
  queryHash: string | null;
  merkleRoot: string | null;
  queryHashMatch: boolean;
  merkleRootMatch: boolean;
}

interface ResultDetail {
  url: string;
  title: string;
  snippet: string;
  contentHash: string;
  recomputedHash: string;
  hashMatch: boolean;
  hasPageSnapshot: boolean;
  pageSnapshotSize: number;
  fetchedAt: string;
}

interface VerifyResponse {
  verified: boolean;
  proofId: number;
  onChain: OnChainData;
  recomputed: RecomputedData;
  ipfs: {
    available: boolean;
    query: string | null;
    archivedAt: string | null;
    resultCount: number;
  };
  results: ResultDetail[];
  error?: string;
}

interface BlockchainRecord {
  id: number;
  queryHash: string;
  resultHash: string;
  ipfsCID: string;
  timestamp: number;
  recordedAt: string;
  submitter: string;
  query: string | null;
  url: string | null;
  domain: string | null;
  title: string | null;
  resultCount: number;
}

interface RecordsResponse {
  count: number;
  contractAddress: string;
  chainId: number;
  records: BlockchainRecord[];
}

interface StatusResponse {
  status: string;
  blockchain: {
    connected: boolean;
    contractAddress: string;
    rpcUrl: string;
    chainId: number;
    totalRecords: number;
  };
}

/* ══════════════════════════════════════════════════════════════════════════════
   HELPERS
   ══════════════════════════════════════════════════════════════════════════ */

function truncHash(hash: string, n = 8): string {
  if (!hash) return "";
  if (hash.length <= n * 2 + 2) return hash;
  return `${hash.slice(0, n + 2)}…${hash.slice(-n)}`;
}

function timeAgo(ts: number): string {
  const d = Math.max(0, Date.now() / 1000 - ts);
  if (d < 60) return `${Math.floor(d)}s ago`;
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  return `${Math.floor(d / 86400)}d ago`;
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

type TabKey = "dashboard" | "anchor" | "verify" | "explorer";

/* ══════════════════════════════════════════════════════════════════════════════
   MAIN CONTENT COMPONENT
   ══════════════════════════════════════════════════════════════════════════ */

function VerifyDashboard() {
  const searchParams = useSearchParams();

  // ── Global State ────────────────────────────────────────────────────────
  const initialTab: TabKey = searchParams.get("id") ? "verify" : "dashboard";
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);
  const [records, setRecords] = useState<BlockchainRecord[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(true);
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [contractAddr, setContractAddr] = useState("");
  const [copied, setCopied] = useState("");

  // ── Verify State ────────────────────────────────────────────────────────
  const [verifyInput, setVerifyInput] = useState(searchParams.get("id") || "");
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyResult, setVerifyResult] = useState<VerifyResponse | null>(null);
  const [verifyError, setVerifyError] = useState("");
  const [expandedResults, setExpandedResults] = useState<Set<number>>(new Set());

  // ── Anchor State ────────────────────────────────────────────────────────
  const [anchorUrl, setAnchorUrl] = useState("");
  const [anchorLoading, setAnchorLoading] = useState(false);
  const [anchorResult, setAnchorResult] = useState<{
    success: boolean;
    proofId: number;
    txHash: string;
    blockNumber: number;
    gasUsed: string;
    queryHash: string;
    merkleRoot: string;
    ipfsCID: string;
  } | null>(null);
  const [anchorError, setAnchorError] = useState("");

  // ── Explorer Search State ───────────────────────────────────────────────
  const [searchMode, setSearchMode] = useState<"id" | "domain" | "title">("domain");
  const [searchQuery, setSearchQuery] = useState("");

  // ── Data Loading ────────────────────────────────────────────────────────
  useEffect(() => {
    loadStatus();
    loadRecords();
  }, []);

  async function loadStatus() {
    try {
      const r = await fetch("/api/backend/status");
      if (r.ok) setStatus(await r.json());
    } catch { /* */ }
  }

  async function loadRecords() {
    setRecordsLoading(true);
    try {
      const r = await fetch("/api/backend/records");
      if (r.ok) {
        const data: RecordsResponse = await r.json();
        setRecords(data.records.reverse());
        setContractAddr(data.contractAddress);
      }
    } catch { /* */ }
    setRecordsLoading(false);
  }

  // ── Verify Handler ─────────────────────────────────────────────────────
  const handleVerify = useCallback(
    async (id?: string) => {
      const vid = (id ?? verifyInput).trim();
      if (!vid) return;
      setActiveTab("verify");
      setVerifyLoading(true);
      setVerifyError("");
      setVerifyResult(null);

      try {
        const r = await fetch(`/api/backend/verify/${vid}`);
        const d = await r.json();
        if (!r.ok) { setVerifyError(d.error || `HTTP ${r.status}`); return; }
        setVerifyResult(d);
      } catch (e: unknown) {
        setVerifyError(e instanceof Error ? e.message : "Verification failed");
      } finally {
        setVerifyLoading(false);
      }
    },
    [verifyInput]
  );

  useEffect(() => {
    const id = searchParams.get("id");
    if (id) { setVerifyInput(id); handleVerify(id); }
  }, [searchParams, handleVerify]);

  // ── Anchor Handler ──────────────────────────────────────────────────────
  async function handleAnchor() {
    const url = anchorUrl.trim();
    if (!url) return;

    setAnchorLoading(true);
    setAnchorError("");
    setAnchorResult(null);

    try {
      // Ensure URL has protocol
      const fullUrl = url.startsWith("http") ? url : `https://${url}`;
      let domain: string;
      try { domain = new URL(fullUrl).hostname; } catch { domain = url; }

      const r = await fetch("/api/backend/archive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: `Direct Archive: ${domain}`,
          results: [{ url: fullUrl, title: domain, content: "" }],
        }),
      });

      const d = await r.json();
      if (!r.ok) throw new Error(d.error || `HTTP ${r.status}`);
      setAnchorResult(d);
      // Refresh records
      loadRecords();
    } catch (e: unknown) {
      setAnchorError(e instanceof Error ? e.message : "Anchor failed");
    } finally {
      setAnchorLoading(false);
    }
  }

  // ── Utilities ───────────────────────────────────────────────────────────
  async function copyText(text: string, label: string) {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(""), 2000);
  }

  function toggleResultExpand(i: number) {
    setExpandedResults((prev) => {
      const n = new Set(prev);
      n.has(i) ? n.delete(i) : n.add(i);
      return n;
    });
  }

  // ── Filtered Records ───────────────────────────────────────────────────
  const filteredRecords = (() => {
    if (!searchQuery.trim()) return records;
    const q = searchQuery.trim().toLowerCase();
    return records.filter((r) => {
      if (searchMode === "id") return String(r.id) === q;
      if (searchMode === "domain") return (r.domain || "").toLowerCase().includes(q) || (r.url || "").toLowerCase().includes(q);
      if (searchMode === "title") return (r.title || "").toLowerCase().includes(q) || (r.query || "").toLowerCase().includes(q);
      return true;
    });
  })();

  const connected = status?.blockchain?.connected ?? false;

  /* ════════════════════════════════════════════════════════════════════════
     RENDER
     ════════════════════════════════════════════════════════════════════ */
  return (
    <div className="min-h-screen bg-base-200" data-theme="dark">
      {/* ── Navbar ─────────────────────────────────────────────────────── */}
      <div className="navbar bg-base-100 border-b border-base-300 sticky top-0 z-50 backdrop-blur-md bg-opacity-90">
        <div className="navbar-start">
          <Link href="/" className="btn btn-ghost text-lg font-bold tracking-tight gap-1">
            <Blocks size={20} className="text-primary" />
            Search<span className="text-primary">X</span>
            <span className="text-xs font-normal text-base-content/50 ml-1">Verify</span>
          </Link>
        </div>
        <div className="navbar-end gap-2">
          {/* Chain badge */}
          <div className={`badge badge-sm gap-1 ${connected ? "badge-success" : "badge-error"}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-success-content animate-pulse" : "bg-error-content"}`} />
            {connected ? `Chain ${status?.blockchain?.chainId}` : "Disconnected"}
          </div>
          <Link href="/" className="btn btn-ghost btn-sm">
            <ArrowLeft size={14} /> Search
          </Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* ── Network Info ────────────────────────────────────────────── */}
        {connected && (
          <div className="bg-base-100 rounded-box border border-base-300 p-3 mb-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
            <div className="flex items-center gap-1.5 font-semibold text-primary">
              <Activity size={13} /> Hardhat Local Testnet
            </div>
            <div className="flex items-center gap-1 text-base-content/60">
              <Link2 size={11} /> RPC: {status?.blockchain?.rpcUrl}
            </div>
            <div className="flex items-center gap-1 text-base-content/60">
              <Wallet size={11} />
              <span className="font-mono text-[0.7rem]">{contractAddr ? truncHash(contractAddr, 6) : "—"}</span>
              {contractAddr && (
                <button className="btn btn-ghost btn-xs p-0.5" onClick={() => copyText(contractAddr, "ca")}>
                  {copied === "ca" ? <Check size={10} /> : <Copy size={10} />}
                </button>
              )}
            </div>
            <div className="flex items-center gap-1 text-base-content/60">
              <Database size={11} />
              <span className="font-semibold text-base-content">{records.length} records</span>
            </div>
          </div>
        )}

        {/* ── Tab Bar ─────────────────────────────────────────────────── */}
        <div role="tablist" className="tabs tabs-bordered tabs-md mb-6">
          {(
            [
              { k: "dashboard" as TabKey, label: "Dashboard", icon: <LayoutDashboard size={14} /> },
              { k: "anchor" as TabKey, label: "Anchor URL", icon: <Plus size={14} /> },
              { k: "verify" as TabKey, label: "Verify Proof", icon: <ShieldCheck size={14} /> },
              { k: "explorer" as TabKey, label: "Block Explorer", icon: <Blocks size={14} /> },
            ]
          ).map((t) => (
            <button
              key={t.k}
              role="tab"
              className={`tab gap-1.5 ${activeTab === t.k ? "tab-active font-semibold" : ""}`}
              onClick={() => setActiveTab(t.k)}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* ══════════════════════════════════════════════════════════════
            TAB: DASHBOARD
           ══════════════════════════════════════════════════════════ */}
        {activeTab === "dashboard" && (
          <div className="animate-fadeIn space-y-6">
            {/* Stats Row */}
            <div className="stats stats-horizontal shadow w-full bg-base-100 border border-base-300">
              <div className="stat">
                <div className="stat-figure text-primary">
                  <Database size={24} />
                </div>
                <div className="stat-title">Total Records</div>
                <div className="stat-value text-primary">{records.length}</div>
                <div className="stat-desc">On-chain archives</div>
              </div>
              <div className="stat">
                <div className="stat-figure text-secondary">
                  <Globe size={24} />
                </div>
                <div className="stat-title">Unique Domains</div>
                <div className="stat-value text-secondary">
                  {new Set(records.map((r) => r.domain).filter(Boolean)).size}
                </div>
                <div className="stat-desc">Websites archived</div>
              </div>
              <div className="stat">
                <div className="stat-figure text-accent">
                  <TrendingUp size={24} />
                </div>
                <div className="stat-title">Chain ID</div>
                <div className="stat-value text-accent">{status?.blockchain?.chainId || "—"}</div>
                <div className="stat-desc">Hardhat Local</div>
              </div>
              <div className="stat">
                <div className="stat-figure text-success">
                  <Box size={24} />
                </div>
                <div className="stat-title">Status</div>
                <div className="stat-value text-success text-lg">
                  {connected ? "Online" : "Offline"}
                </div>
                <div className="stat-desc">{connected ? "Blockchain synced" : "Node not running"}</div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="card bg-base-100 border border-base-300 shadow-sm">
                <div className="card-body">
                  <h2 className="card-title text-base">
                    <Plus size={18} className="text-primary" /> Anchor a URL
                  </h2>
                  <p className="text-sm text-base-content/60">
                    Directly submit a website URL to hash its content and anchor it on the blockchain.
                  </p>
                  <div className="card-actions justify-end mt-2">
                    <button className="btn btn-primary btn-sm" onClick={() => setActiveTab("anchor")}>
                      Go to Anchor <ExternalLink size={12} />
                    </button>
                  </div>
                </div>
              </div>
              <div className="card bg-base-100 border border-base-300 shadow-sm">
                <div className="card-body">
                  <h2 className="card-title text-base">
                    <ShieldCheck size={18} className="text-success" /> Verify a Proof
                  </h2>
                  <p className="text-sm text-base-content/60">
                    Enter a proof ID to verify archived content against the blockchain record.
                  </p>
                  <div className="card-actions justify-end mt-2">
                    <button className="btn btn-success btn-sm" onClick={() => setActiveTab("verify")}>
                      Go to Verify <ExternalLink size={12} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Records */}
            <div className="card bg-base-100 border border-base-300 shadow-sm">
              <div className="card-body">
                <div className="flex items-center justify-between">
                  <h2 className="card-title text-base">
                    <Clock size={16} className="text-info" /> Recent Archives
                  </h2>
                  <button className="btn btn-ghost btn-xs" onClick={() => setActiveTab("explorer")}>
                    View All <ExternalLink size={10} />
                  </button>
                </div>
                {recordsLoading ? (
                  <div className="flex items-center justify-center py-8 text-base-content/40 gap-2">
                    <Loader2 size={16} className="animate-spin" /> Loading…
                  </div>
                ) : records.length === 0 ? (
                  <div className="text-center py-8 text-base-content/40">
                    <Database size={28} className="mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No archives yet. Anchor a URL or archive a search result to get started.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="table table-sm">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Domain</th>
                          <th>Title / Query</th>
                          <th>Time</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {records.slice(0, 5).map((r) => (
                          <tr key={r.id} className="hover">
                            <td className="font-mono text-primary font-semibold">#{r.id}</td>
                            <td>
                              {r.domain ? (
                                <div className="flex items-center gap-1.5">
                                  <Globe size={12} className="text-base-content/40" />
                                  <span className="text-sm">{r.domain}</span>
                                </div>
                              ) : (
                                <span className="text-xs text-base-content/30">—</span>
                              )}
                            </td>
                            <td className="max-w-[200px] truncate text-sm">
                              {r.title || r.query || <span className="text-base-content/30">—</span>}
                            </td>
                            <td className="text-xs text-base-content/50">{timeAgo(r.timestamp)}</td>
                            <td>
                              <button
                                className="btn btn-primary btn-xs btn-outline"
                                onClick={() => { setVerifyInput(String(r.id)); handleVerify(String(r.id)); }}
                              >
                                Verify
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            TAB: ANCHOR URL
           ══════════════════════════════════════════════════════════ */}
        {activeTab === "anchor" && (
          <div className="animate-fadeIn space-y-6">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Plus size={22} className="text-primary" /> Anchor a URL to Blockchain
              </h1>
              <p className="text-sm text-base-content/60 mt-1">
                Enter any website URL. Its content will be fetched, hashed, and permanently anchored to the blockchain.
              </p>
            </div>

            {/* Anchor Form */}
            <div className="card bg-base-100 border border-base-300 shadow-sm">
              <div className="card-body">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Website URL</span>
                  </label>
                  <div className="join w-full">
                    <span className="join-item btn btn-neutral no-animation cursor-default">
                      <Globe size={15} />
                    </span>
                    <input
                      type="text"
                      className="input input-bordered join-item flex-1"
                      placeholder="e.g. https://example.com or example.com"
                      value={anchorUrl}
                      onChange={(e) => setAnchorUrl(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleAnchor(); }}
                      id="anchor-url-input"
                    />
                    <button
                      className="btn btn-primary join-item"
                      onClick={handleAnchor}
                      disabled={anchorLoading || !anchorUrl.trim()}
                    >
                      {anchorLoading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                      {anchorLoading ? "Anchoring…" : "Anchor"}
                    </button>
                  </div>
                  <label className="label">
                    <span className="label-text-alt text-base-content/40">
                      The page HTML will be fetched, hashed, and stored on-chain with a content snapshot.
                    </span>
                  </label>
                </div>

                {/* Anchor Error */}
                {anchorError && (
                  <div role="alert" className="alert alert-error mt-3">
                    <AlertCircle size={16} />
                    <span className="text-sm">{anchorError}</span>
                  </div>
                )}

                {/* Anchor Success */}
                {anchorResult && (
                  <div className="mt-4 space-y-3 animate-fadeIn">
                    <div role="alert" className="alert alert-success">
                      <ShieldCheck size={18} />
                      <div>
                        <h3 className="font-bold">Successfully Anchored!</h3>
                        <p className="text-xs">Content archived and written to blockchain in block #{anchorResult.blockNumber}.</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Proof ID */}
                      <div className="bg-base-200 rounded-lg p-3">
                        <div className="text-xs font-medium text-base-content/50 uppercase tracking-wider mb-1">Proof ID</div>
                        <div className="text-2xl font-bold text-primary">#{anchorResult.proofId}</div>
                      </div>
                      {/* Block */}
                      <div className="bg-base-200 rounded-lg p-3">
                        <div className="text-xs font-medium text-base-content/50 uppercase tracking-wider mb-1">Block Number</div>
                        <div className="text-2xl font-bold">#{anchorResult.blockNumber}</div>
                      </div>
                    </div>

                    <div className="grid gap-2">
                      {[
                        { label: "TX Hash", value: anchorResult.txHash, key: "atx" },
                        { label: "Query Hash", value: anchorResult.queryHash, key: "aqh" },
                        { label: "Merkle Root", value: anchorResult.merkleRoot, key: "amr" },
                        { label: "Content CID", value: anchorResult.ipfsCID, key: "acid" },
                      ].map((f) => (
                        <div key={f.key} className="flex items-center justify-between bg-base-200 rounded-lg px-3 py-2">
                          <span className="text-xs font-medium text-base-content/50 uppercase tracking-wider w-28 shrink-0">{f.label}</span>
                          <code className="text-xs font-mono text-base-content/70 truncate flex-1 mx-2">{f.value}</code>
                          <button className="btn btn-ghost btn-xs" onClick={() => copyText(f.value, f.key)}>
                            {copied === f.key ? <Check size={12} className="text-success" /> : <Copy size={12} />}
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2 mt-2">
                      <button
                        className="btn btn-success btn-sm"
                        onClick={() => { setVerifyInput(String(anchorResult.proofId)); handleVerify(String(anchorResult.proofId)); }}
                      >
                        <ShieldCheck size={14} /> Verify This Proof
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => { setAnchorResult(null); setAnchorUrl(""); }}>
                        Anchor Another
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* How it works */}
            <div className="card bg-base-100 border border-base-300 shadow-sm">
              <div className="card-body">
                <h3 className="card-title text-sm">How it works</h3>
                <ul className="steps steps-vertical text-xs">
                  <li className="step step-primary">
                    <div className="text-left ml-2"><strong>Fetch</strong> — Page HTML is downloaded from the URL</div>
                  </li>
                  <li className="step step-primary">
                    <div className="text-left ml-2"><strong>Hash</strong> — SHA-256 content hash + Merkle tree root computed</div>
                  </li>
                  <li className="step step-primary">
                    <div className="text-left ml-2"><strong>Store</strong> — Full content snapshot saved to local content store</div>
                  </li>
                  <li className="step step-primary">
                    <div className="text-left ml-2"><strong>Anchor</strong> — Hashes + CID written to blockchain smart contract</div>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            TAB: VERIFY PROOF
           ══════════════════════════════════════════════════════════ */}
        {activeTab === "verify" && (
          <div className="animate-fadeIn space-y-6">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <ShieldCheck size={22} className="text-success" /> Verify Search Proof
              </h1>
              <p className="text-sm text-base-content/60 mt-1">
                Enter a proof ID to verify archived search results against their on-chain record.
              </p>
            </div>

            {/* Verify Input */}
            <form
              onSubmit={(e) => { e.preventDefault(); handleVerify(); }}
              className="join w-full"
            >
              <span className="join-item btn btn-neutral no-animation cursor-default">
                <Hash size={15} />
              </span>
              <input
                type="number"
                className="input input-bordered join-item flex-1"
                value={verifyInput}
                onChange={(e) => setVerifyInput(e.target.value)}
                placeholder="Proof ID (e.g. 0, 1, 2…)"
                min="0"
                id="verify-proof-input"
              />
              <button
                type="submit"
                className="btn btn-success join-item"
                disabled={verifyLoading || !verifyInput.trim()}
              >
                {verifyLoading ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
                Verify
              </button>
            </form>

            {/* Verify Error */}
            {verifyError && (
              <div role="alert" className="alert alert-error">
                <ShieldX size={16} /> <span>{verifyError}</span>
              </div>
            )}

            {/* Verify Result */}
            {verifyResult && (
              <div className="card bg-base-100 border border-base-300 shadow-sm animate-fadeIn">
                <div className="card-body p-0">
                  {/* Status Banner */}
                  <div className={`p-4 flex items-center gap-3 rounded-t-2xl ${verifyResult.verified ? "bg-success/10 border-b-2 border-success" : "bg-error/10 border-b-2 border-error"}`}>
                    {verifyResult.verified ? <ShieldCheck size={24} className="text-success" /> : <ShieldX size={24} className="text-error" />}
                    <div>
                      <div className={`font-bold text-lg ${verifyResult.verified ? "text-success" : "text-error"}`}>
                        {verifyResult.verified ? "✓ Verification Passed" : "✗ Verification Failed"}
                      </div>
                      <div className="text-xs text-base-content/60">
                        {verifyResult.verified
                          ? "All hashes match the blockchain record — content integrity confirmed"
                          : "Recomputed hashes do not match on-chain values — content may be tampered"}
                      </div>
                    </div>
                  </div>

                  {/* On-Chain Record */}
                  <div className="p-4 border-b border-base-300">
                    <h3 className="font-semibold text-sm flex items-center gap-1.5 mb-3">
                      <Database size={14} className="text-primary" /> On-Chain Record (Proof #{verifyResult.proofId})
                    </h3>

                    <div className="grid gap-3">
                      {/* Query Hash */}
                      <div>
                        <div className="text-[0.65rem] uppercase tracking-wider text-base-content/40 font-medium mb-0.5">Query Hash</div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <code className="text-xs font-mono text-base-content/70 break-all">{verifyResult.onChain.queryHash}</code>
                          <button className="btn btn-ghost btn-xs p-0.5" onClick={() => copyText(verifyResult.onChain.queryHash, "vqh")}>
                            {copied === "vqh" ? <Check size={10} className="text-success" /> : <Copy size={10} />}
                          </button>
                          <span className={`badge badge-xs ${verifyResult.recomputed.queryHashMatch ? "badge-success" : "badge-error"}`}>
                            {verifyResult.recomputed.queryHashMatch ? "✓ Match" : "✗ Mismatch"}
                          </span>
                        </div>
                      </div>

                      {/* Merkle Root */}
                      <div>
                        <div className="text-[0.65rem] uppercase tracking-wider text-base-content/40 font-medium mb-0.5">Result Hash (Merkle Root)</div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <code className="text-xs font-mono text-base-content/70 break-all">{verifyResult.onChain.resultHash}</code>
                          <button className="btn btn-ghost btn-xs p-0.5" onClick={() => copyText(verifyResult.onChain.resultHash, "vrh")}>
                            {copied === "vrh" ? <Check size={10} className="text-success" /> : <Copy size={10} />}
                          </button>
                          <span className={`badge badge-xs ${verifyResult.recomputed.merkleRootMatch ? "badge-success" : "badge-error"}`}>
                            {verifyResult.recomputed.merkleRootMatch ? "✓ Match" : "✗ Mismatch"}
                          </span>
                        </div>
                      </div>

                      {/* CID */}
                      <div>
                        <div className="text-[0.65rem] uppercase tracking-wider text-base-content/40 font-medium mb-0.5">Content CID</div>
                        <div className="flex items-center gap-2">
                          <code className="text-xs font-mono text-base-content/70 break-all">{verifyResult.onChain.ipfsCID}</code>
                          <button className="btn btn-ghost btn-xs p-0.5" onClick={() => copyText(verifyResult.onChain.ipfsCID, "vcid")}>
                            {copied === "vcid" ? <Check size={10} className="text-success" /> : <Copy size={10} />}
                          </button>
                        </div>
                      </div>

                      {/* Meta row */}
                      <div className="grid grid-cols-2 gap-4 mt-1">
                        <div>
                          <div className="text-[0.65rem] uppercase tracking-wider text-base-content/40 font-medium mb-0.5 flex items-center gap-1">
                            <Clock size={10} /> Timestamp
                          </div>
                          <span className="text-sm">{fmtDate(verifyResult.onChain.recordedAt)}</span>
                        </div>
                        <div>
                          <div className="text-[0.65rem] uppercase tracking-wider text-base-content/40 font-medium mb-0.5">Submitter</div>
                          <code className="text-xs font-mono">{truncHash(verifyResult.onChain.submitter, 6)}</code>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Archived Content */}
                  <div className="p-4 border-b border-base-300">
                    <h3 className="font-semibold text-sm flex items-center gap-1.5 mb-3">
                      <FileText size={14} className="text-info" /> Archived Content
                    </h3>
                    {verifyResult.ipfs.available ? (
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <div className="text-[0.65rem] uppercase tracking-wider text-base-content/40 font-medium mb-0.5">Original Query</div>
                          <span className="text-sm font-medium">{verifyResult.ipfs.query}</span>
                        </div>
                        <div>
                          <div className="text-[0.65rem] uppercase tracking-wider text-base-content/40 font-medium mb-0.5">Results</div>
                          <span className="text-sm">{verifyResult.ipfs.resultCount}</span>
                        </div>
                        <div>
                          <div className="text-[0.65rem] uppercase tracking-wider text-base-content/40 font-medium mb-0.5">Archived At</div>
                          <span className="text-sm">{verifyResult.ipfs.archivedAt ? fmtDate(verifyResult.ipfs.archivedAt) : "—"}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-base-200 rounded-lg p-3 text-sm text-base-content/50">
                        Content store not reachable — content can still be verified if re-uploaded with same CID.
                      </div>
                    )}
                  </div>

                  {/* Per-result verification */}
                  {verifyResult.results.length > 0 && (
                    <div className="p-4">
                      <h3 className="font-semibold text-sm flex items-center gap-1.5 mb-3">
                        <Globe size={14} className="text-secondary" /> Archived Results ({verifyResult.results.length})
                      </h3>
                      <div className="space-y-2">
                        {verifyResult.results.map((r, i) => (
                          <div key={i} className="collapse collapse-arrow bg-base-200 border border-base-300 rounded-lg">
                            <input
                              type="checkbox"
                              checked={expandedResults.has(i)}
                              onChange={() => toggleResultExpand(i)}
                            />
                            <div className="collapse-title text-sm font-medium flex items-center gap-2 pr-8">
                              <span className={`w-2 h-2 rounded-full shrink-0 ${r.hashMatch ? "bg-success shadow-sm shadow-success/40" : "bg-error shadow-sm shadow-error/40"}`} />
                              <span className="truncate">{r.title || r.url}</span>
                              {r.hasPageSnapshot && (
                                <span className="badge badge-xs badge-info">{(r.pageSnapshotSize / 1024).toFixed(1)} KB</span>
                              )}
                            </div>
                            <div className="collapse-content space-y-2">
                              <div>
                                <span className="text-[0.65rem] uppercase text-base-content/40 font-medium">URL</span>
                                <a href={r.url} target="_blank" rel="noopener noreferrer" className="block text-xs text-primary underline">{r.url}</a>
                              </div>
                              {r.snippet && (
                                <div>
                                  <span className="text-[0.65rem] uppercase text-base-content/40 font-medium">Snippet</span>
                                  <p className="text-xs text-base-content/60">{r.snippet}</p>
                                </div>
                              )}
                              <div>
                                <span className="text-[0.65rem] uppercase text-base-content/40 font-medium">Content Hash</span>
                                <code className="block text-[0.65rem] font-mono text-base-content/60">{r.contentHash}</code>
                              </div>
                              <div>
                                <span className="text-[0.65rem] uppercase text-base-content/40 font-medium">Recomputed Hash</span>
                                <div className="flex items-center gap-2">
                                  <code className="text-[0.65rem] font-mono text-base-content/60">{r.recomputedHash}</code>
                                  <span className={`badge badge-xs ${r.hashMatch ? "badge-success" : "badge-error"}`}>
                                    {r.hashMatch ? "✓" : "✗"}
                                  </span>
                                </div>
                              </div>
                              <div>
                                <span className="text-[0.65rem] uppercase text-base-content/40 font-medium">Fetched At</span>
                                <span className="block text-xs">{fmtDate(r.fetchedAt)}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            TAB: BLOCK EXPLORER
           ══════════════════════════════════════════════════════════ */}
        {activeTab === "explorer" && (
          <div className="animate-fadeIn space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <Blocks size={22} className="text-info" /> Block Explorer
                </h1>
                <p className="text-sm text-base-content/60 mt-1">
                  All search archive records on Chain {status?.blockchain?.chainId || 31337}.
                </p>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={loadRecords}>
                <RefreshCw size={13} className={recordsLoading ? "animate-spin" : ""} /> Refresh
              </button>
            </div>

            {/* Search Bar with Filter Dropdown */}
            <div className="join w-full">
              <div className="dropdown">
                <button tabIndex={0} className="btn join-item btn-neutral gap-1">
                  <Filter size={13} />
                  {searchMode === "id" && "Proof ID"}
                  {searchMode === "domain" && "Domain"}
                  {searchMode === "title" && "Name/Query"}
                  <ChevronDown size={12} />
                </button>
                <ul tabIndex={0} className="dropdown-content menu bg-base-200 rounded-box z-10 w-44 p-2 shadow-lg border border-base-300">
                  <li>
                    <button onClick={() => setSearchMode("id")} className={searchMode === "id" ? "active" : ""}>
                      <Hash size={13} /> Proof ID
                    </button>
                  </li>
                  <li>
                    <button onClick={() => setSearchMode("domain")} className={searchMode === "domain" ? "active" : ""}>
                      <Globe size={13} /> Domain / URL
                    </button>
                  </li>
                  <li>
                    <button onClick={() => setSearchMode("title")} className={searchMode === "title" ? "active" : ""}>
                      <FileText size={13} /> Name / Query
                    </button>
                  </li>
                </ul>
              </div>
              <input
                type="text"
                className="input input-bordered join-item flex-1"
                placeholder={
                  searchMode === "id"
                    ? "Enter proof ID…"
                    : searchMode === "domain"
                    ? "Search by domain (e.g. wikipedia.org)…"
                    : "Search by name or query…"
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                id="explorer-search-input"
              />
              {searchQuery && (
                <button className="btn join-item btn-ghost" onClick={() => setSearchQuery("")}>
                  ✕
                </button>
              )}
            </div>

            {/* Results Count */}
            {searchQuery && (
              <div className="text-xs text-base-content/50">
                Showing {filteredRecords.length} of {records.length} records
              </div>
            )}

            {/* Records Table */}
            {recordsLoading ? (
              <div className="flex items-center justify-center py-12 text-base-content/40 gap-2">
                <Loader2 size={16} className="animate-spin" /> Loading records…
              </div>
            ) : filteredRecords.length === 0 ? (
              <div className="text-center py-12 text-base-content/40">
                <Database size={32} className="mx-auto mb-3 opacity-30" />
                <p className="font-medium">
                  {searchQuery ? "No matching records found" : "No records yet"}
                </p>
                <p className="text-sm mt-1">
                  {searchQuery
                    ? "Try adjusting your search filter"
                    : "Archive a search result or anchor a URL to create the first record."}
                </p>
              </div>
            ) : (
              <div className="card bg-base-100 border border-base-300 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="table table-sm">
                    <thead>
                      <tr className="bg-base-200/50">
                        <th className="w-16">ID</th>
                        <th>Domain</th>
                        <th>Title / Query</th>
                        <th>Query Hash</th>
                        <th>Merkle Root</th>
                        <th>Time</th>
                        <th className="text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRecords.map((r) => (
                        <tr key={r.id} className="hover">
                          <td className="font-mono font-semibold text-primary">#{r.id}</td>
                          <td>
                            {r.domain ? (
                              <div className="flex items-center gap-1.5">
                                <Globe size={12} className="text-base-content/40 shrink-0" />
                                <span className="text-sm truncate max-w-[140px]">{r.domain}</span>
                              </div>
                            ) : (
                              <span className="text-xs text-base-content/30">—</span>
                            )}
                          </td>
                          <td className="max-w-[180px]">
                            <span className="text-sm truncate block">{r.title || r.query || "—"}</span>
                          </td>
                          <td>
                            <code className="text-[0.65rem] font-mono text-base-content/50" title={r.queryHash}>{truncHash(r.queryHash, 6)}</code>
                          </td>
                          <td>
                            <code className="text-[0.65rem] font-mono text-base-content/50" title={r.resultHash}>{truncHash(r.resultHash, 6)}</code>
                          </td>
                          <td className="text-xs text-base-content/50">{timeAgo(r.timestamp)}</td>
                          <td className="text-right">
                            <button
                              className="btn btn-primary btn-xs btn-outline"
                              onClick={() => { setVerifyInput(String(r.id)); handleVerify(String(r.id)); }}
                            >
                              Verify
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <footer className="border-t border-base-300 bg-base-100 mt-auto">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between text-xs text-base-content/40">
          <span>SearchX Verification Portal</span>
          <span>Hardhat Local Testnet · Chain {status?.blockchain?.chainId || 31337}</span>
        </div>
      </footer>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   PAGE EXPORT (with Suspense for useSearchParams)
   ══════════════════════════════════════════════════════════════════════════ */

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-base-200 flex items-center justify-center"><Loader2 className="animate-spin text-primary" size={24} /></div>}>
      <VerifyDashboard />
    </Suspense>
  );
}
