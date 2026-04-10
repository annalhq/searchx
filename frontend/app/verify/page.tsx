"use client";

import { useState, useEffect, useCallback } from "react";
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
} from "lucide-react";

/* ── Types ─────────────────────────────────────────────────────────────────── */

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

/* ── Helper ────────────────────────────────────────────────────────────────── */

function truncateHash(hash: string, chars = 8): string {
  if (!hash) return "";
  if (hash.length <= chars * 2) return hash;
  return `${hash.substring(0, chars + 2)}…${hash.substring(hash.length - chars)}`;
}

function timeAgo(timestamp: number): string {
  const now = Date.now() / 1000;
  const diff = Math.max(0, now - timestamp);
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

/* ── Component ─────────────────────────────────────────────────────────────── */

function VerifyContent() {
  const searchParams = useSearchParams();
  const [proofIdInput, setProofIdInput] = useState(searchParams.get("id") || "");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerifyResponse | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");
  const [expandedResults, setExpandedResults] = useState<Set<number>>(new Set());

  // Block explorer state
  const [records, setRecords] = useState<BlockchainRecord[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(true);
  const [blockchainStatus, setBlockchainStatus] = useState<StatusResponse | null>(null);
  const [contractAddress, setContractAddress] = useState("");
  const [activeTab, setActiveTab] = useState<"verify" | "explorer">(
    searchParams.get("id") ? "verify" : "explorer"
  );

  // Load blockchain status and records on mount
  useEffect(() => {
    fetchStatus();
    fetchRecords();
  }, []);

  async function fetchStatus() {
    try {
      const resp = await fetch("/api/backend/status");
      if (resp.ok) {
        const data = await resp.json();
        setBlockchainStatus(data);
      }
    } catch {}
  }

  async function fetchRecords() {
    setRecordsLoading(true);
    try {
      const resp = await fetch("/api/backend/records");
      if (resp.ok) {
        const data: RecordsResponse = await resp.json();
        setRecords(data.records.reverse()); // newest first
        setContractAddress(data.contractAddress);
      }
    } catch {}
    setRecordsLoading(false);
  }

  const handleVerify = useCallback(
    async (id?: string) => {
      const verifyId = id ?? proofIdInput;
      if (!verifyId.trim()) return;

      setActiveTab("verify");
      setLoading(true);
      setError("");
      setResult(null);

      try {
        const resp = await fetch(`/api/backend/verify/${verifyId.trim()}`);
        const data = await resp.json();

        if (!resp.ok) {
          setError(data.error || `HTTP ${resp.status}`);
          return;
        }

        setResult(data);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Verification failed";
        setError(msg);
      } finally {
        setLoading(false);
      }
    },
    [proofIdInput]
  );

  useEffect(() => {
    const id = searchParams.get("id");
    if (id) {
      setProofIdInput(id);
      handleVerify(id);
    }
  }, [searchParams, handleVerify]);

  async function handleCopy(text: string, label: string) {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(""), 2000);
  }

  function toggleResult(idx: number) {
    setExpandedResults((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }

  const isConnected = blockchainStatus?.blockchain?.connected ?? false;

  return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: "var(--sx-bg)",
          borderBottom: "1px solid var(--sx-border)",
          backdropFilter: "blur(12px)",
        }}
      >
        <div
          style={{
            maxWidth: "960px",
            margin: "0 auto",
            padding: "0.65rem 1.25rem",
            display: "flex",
            alignItems: "center",
            gap: "1rem",
          }}
        >
          <Link
            href="/"
            style={{
              fontWeight: 700,
              fontSize: "1.15rem",
              color: "var(--sx-text)",
              textDecoration: "none",
              letterSpacing: "-0.03em",
              flexShrink: 0,
            }}
          >
            Search<span style={{ color: "var(--sx-accent)" }}>X</span>
          </Link>
          <span
            style={{
              color: "var(--sx-muted)",
              fontSize: "0.85rem",
              display: "flex",
              alignItems: "center",
              gap: "0.35rem",
            }}
          >
            / <ShieldCheck size={14} /> Verification Portal
          </span>

          {/* Blockchain connection indicator */}
          <div
            style={{
              marginLeft: "auto",
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              fontSize: "0.75rem",
              color: isConnected ? "#22c55e" : "#ef4444",
            }}
          >
            <span
              style={{
                width: "7px",
                height: "7px",
                borderRadius: "50%",
                background: isConnected ? "#22c55e" : "#ef4444",
                boxShadow: isConnected
                  ? "0 0 6px rgba(34, 197, 94, 0.5)"
                  : "0 0 6px rgba(239, 68, 68, 0.5)",
                animation: "pulse 2s ease-in-out infinite",
              }}
            />
            <span style={{ fontWeight: 500 }}>
              {isConnected ? "Chain 31337" : "Disconnected"}
            </span>
          </div>
        </div>
      </header>

      {/* ── Main ─────────────────────────────────────────────────────────── */}
      <main
        style={{
          maxWidth: "960px",
          margin: "0 auto",
          padding: "1.5rem 1.25rem 3rem",
          width: "100%",
          flex: 1,
        }}
      >
        {/* ── Network Info Bar ──────────────────────────────────────────── */}
        {isConnected && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "1.5rem",
              padding: "0.65rem 1rem",
              marginBottom: "1.25rem",
              background: "color-mix(in srgb, var(--sx-accent) 5%, var(--sx-surface))",
              border: "1px solid color-mix(in srgb, var(--sx-accent) 15%, transparent)",
              borderRadius: "var(--sx-radius)",
              fontSize: "0.78rem",
              color: "var(--sx-muted)",
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
              <Activity size={12} style={{ color: "var(--sx-accent)" }} />
              <span style={{ fontWeight: 600, color: "var(--sx-text)" }}>Hardhat Local</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
              <Link2 size={11} />
              <span>RPC: {blockchainStatus?.blockchain?.rpcUrl}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
              <Wallet size={11} />
              <span style={{ fontFamily: "monospace", fontSize: "0.72rem" }}>
                {contractAddress ? truncateHash(contractAddress, 6) : "—"}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
              <Database size={11} />
              <span style={{ fontWeight: 600, color: "var(--sx-text)" }}>
                {records.length} record{records.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        )}

        {/* ── Tab Switcher ─────────────────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            gap: "0.25rem",
            marginBottom: "1.5rem",
            borderBottom: "1px solid var(--sx-border)",
            paddingBottom: "0",
          }}
        >
          {(
            [
              { key: "verify", label: "Verify Proof", icon: <ShieldCheck size={14} /> },
              { key: "explorer", label: "Block Explorer", icon: <Blocks size={14} /> },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                padding: "0.6rem 1rem",
                fontSize: "0.85rem",
                fontWeight: activeTab === tab.key ? 600 : 400,
                color: activeTab === tab.key ? "var(--sx-accent)" : "var(--sx-muted)",
                background: "transparent",
                border: "none",
                borderBottom:
                  activeTab === tab.key
                    ? "2px solid var(--sx-accent)"
                    : "2px solid transparent",
                cursor: "pointer",
                transition: "all 0.15s ease",
                marginBottom: "-1px",
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* ══════════════════════════════════════════════════════════════════
             VERIFY TAB
            ══════════════════════════════════════════════════════════════ */}
        {activeTab === "verify" && (
          <div style={{ animation: "fadeUp 0.25s ease both" }}>
            {/* Title */}
            <div style={{ marginBottom: "1.25rem" }}>
              <h1
                style={{
                  fontSize: "1.4rem",
                  fontWeight: 700,
                  letterSpacing: "-0.02em",
                  color: "var(--sx-text)",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                <ShieldCheck size={20} style={{ color: "var(--sx-accent)" }} />
                Verify Search Proof
              </h1>
              <p
                style={{
                  fontSize: "0.83rem",
                  color: "var(--sx-muted)",
                  marginTop: "0.25rem",
                }}
              >
                Enter a proof ID to verify archived search results against their
                on-chain record on the Hardhat local testnet.
              </p>
            </div>

            {/* Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleVerify();
              }}
              style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem" }}
            >
              <div className="sx-input-wrap" style={{ flex: 1 }}>
                <span
                  style={{
                    paddingLeft: "1rem",
                    color: "var(--sx-muted)",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <Hash size={15} />
                </span>
                <input
                  type="number"
                  className="sx-input"
                  value={proofIdInput}
                  onChange={(e) => setProofIdInput(e.target.value)}
                  placeholder="Enter proof ID (e.g. 0, 1, 2…)"
                  min="0"
                  id="verify-input"
                />
              </div>
              <button
                type="submit"
                className="sx-search-btn"
                disabled={loading || !proofIdInput.trim()}
                style={{ borderRadius: "var(--sx-radius-pill)" }}
              >
                {loading ? (
                  <Loader2 size={15} className="sx-spin" />
                ) : (
                  <Search size={15} />
                )}
                <span>Verify</span>
              </button>
            </form>

            {/* Error */}
            {error && (
              <div className="sx-verify-error">
                <ShieldX size={16} />
                <span>{error}</span>
              </div>
            )}

            {/* Verification Result */}
            {result && (
              <div
                className="sx-verify-card"
                style={{ animation: "fadeUp 0.3s ease both" }}
              >
                {/* Status Banner */}
                <div
                  className={`sx-verify-banner ${
                    result.verified ? "sx-verified" : "sx-failed"
                  }`}
                >
                  {result.verified ? (
                    <>
                      <ShieldCheck size={22} />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: "1.05rem" }}>
                          ✓ Verification Passed
                        </div>
                        <div style={{ fontSize: "0.8rem", opacity: 0.85 }}>
                          All hashes match the blockchain record — content integrity
                          confirmed
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <ShieldX size={22} />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: "1.05rem" }}>
                          ✗ Verification Failed
                        </div>
                        <div style={{ fontSize: "0.8rem", opacity: 0.85 }}>
                          Recomputed hashes do not match the on-chain values — content
                          may have been tampered with
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* On-chain data */}
                <div className="sx-verify-section">
                  <h3 className="sx-verify-section-title">
                    <Database size={14} />
                    On-Chain Record (Proof #{result.proofId})
                  </h3>

                  <div className="sx-verify-grid">
                    {/* Query Hash */}
                    <div className="sx-verify-field">
                      <span className="sx-verify-field-label">Query Hash</span>
                      <div className="sx-verify-field-value">
                        <code>{result.onChain.queryHash}</code>
                        <button
                          onClick={() =>
                            handleCopy(result.onChain.queryHash, "oqh")
                          }
                          className="sx-copy-btn"
                        >
                          {copied === "oqh" ? (
                            <Check size={11} />
                          ) : (
                            <Copy size={11} />
                          )}
                        </button>
                        <span
                          className={`sx-hash-badge ${
                            result.recomputed.queryHashMatch
                              ? "sx-match"
                              : "sx-mismatch"
                          }`}
                        >
                          {result.recomputed.queryHashMatch
                            ? "✓ Match"
                            : "✗ Mismatch"}
                        </span>
                      </div>
                    </div>

                    {/* Merkle Root */}
                    <div className="sx-verify-field">
                      <span className="sx-verify-field-label">
                        Result Hash (Merkle Root)
                      </span>
                      <div className="sx-verify-field-value">
                        <code>{result.onChain.resultHash}</code>
                        <button
                          onClick={() =>
                            handleCopy(result.onChain.resultHash, "orh")
                          }
                          className="sx-copy-btn"
                        >
                          {copied === "orh" ? (
                            <Check size={11} />
                          ) : (
                            <Copy size={11} />
                          )}
                        </button>
                        <span
                          className={`sx-hash-badge ${
                            result.recomputed.merkleRootMatch
                              ? "sx-match"
                              : "sx-mismatch"
                          }`}
                        >
                          {result.recomputed.merkleRootMatch
                            ? "✓ Match"
                            : "✗ Mismatch"}
                        </span>
                      </div>
                    </div>

                    {/* IPFS CID */}
                    <div className="sx-verify-field">
                      <span className="sx-verify-field-label">Content CID</span>
                      <div className="sx-verify-field-value">
                        <code>{result.onChain.ipfsCID}</code>
                        <button
                          onClick={() =>
                            handleCopy(result.onChain.ipfsCID, "ocid")
                          }
                          className="sx-copy-btn"
                        >
                          {copied === "ocid" ? (
                            <Check size={11} />
                          ) : (
                            <Copy size={11} />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Metadata row */}
                    <div className="sx-verify-row">
                      <div className="sx-verify-field" style={{ flex: 1 }}>
                        <span className="sx-verify-field-label">
                          <Clock size={11} /> Timestamp
                        </span>
                        <span style={{ fontSize: "0.85rem" }}>
                          {result.onChain.recordedAt}
                        </span>
                      </div>
                      <div className="sx-verify-field" style={{ flex: 1 }}>
                        <span className="sx-verify-field-label">Submitter</span>
                        <code style={{ fontSize: "0.75rem" }}>
                          {truncateHash(result.onChain.submitter, 6)}
                        </code>
                      </div>
                    </div>
                  </div>
                </div>

                {/* IPFS content */}
                <div className="sx-verify-section">
                  <h3 className="sx-verify-section-title">
                    <FileText size={14} />
                    Archived Content
                  </h3>

                  {result.ipfs.available ? (
                    <div className="sx-verify-grid">
                      <div className="sx-verify-row">
                        <div className="sx-verify-field" style={{ flex: 1 }}>
                          <span className="sx-verify-field-label">
                            Original Query
                          </span>
                          <span style={{ fontWeight: 500 }}>
                            {result.ipfs.query}
                          </span>
                        </div>
                        <div className="sx-verify-field" style={{ flex: 1 }}>
                          <span className="sx-verify-field-label">
                            Results Archived
                          </span>
                          <span>{result.ipfs.resultCount}</span>
                        </div>
                        <div className="sx-verify-field" style={{ flex: 1 }}>
                          <span className="sx-verify-field-label">
                            Archived At
                          </span>
                          <span style={{ fontSize: "0.85rem" }}>
                            {result.ipfs.archivedAt}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div
                      style={{
                        padding: "0.75rem",
                        background:
                          "color-mix(in srgb, var(--sx-muted) 8%, transparent)",
                        borderRadius: "var(--sx-radius)",
                        fontSize: "0.85rem",
                        color: "var(--sx-muted)",
                      }}
                    >
                      Content store not reachable — content can still be
                      verified if re-uploaded with the same CID.
                    </div>
                  )}
                </div>

                {/* Per-result verification */}
                {result.results.length > 0 && (
                  <div className="sx-verify-section">
                    <h3 className="sx-verify-section-title">
                      <Globe size={14} />
                      Archived Results ({result.results.length})
                    </h3>

                    <div style={{ display: "grid", gap: "0.5rem" }}>
                      {result.results.map((r, i) => (
                        <div key={i} className="sx-verify-result-item">
                          <button
                            onClick={() => toggleResult(i)}
                            className="sx-verify-result-header"
                          >
                            <span
                              className={`sx-hash-dot ${
                                r.hashMatch ? "sx-match" : "sx-mismatch"
                              }`}
                            />
                            <span className="sx-verify-result-title">
                              {r.title || r.url}
                            </span>
                            <span className="sx-verify-result-meta">
                              {r.hasPageSnapshot && (
                                <span className="sx-archive-size-badge">
                                  {(r.pageSnapshotSize / 1024).toFixed(1)} KB
                                </span>
                              )}
                              {expandedResults.has(i) ? (
                                <ChevronUp size={13} />
                              ) : (
                                <ChevronDown size={13} />
                              )}
                            </span>
                          </button>

                          {expandedResults.has(i) && (
                            <div className="sx-verify-result-body">
                              <div className="sx-verify-field">
                                <span className="sx-verify-field-label">
                                  URL
                                </span>
                                <a
                                  href={r.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{
                                    fontSize: "0.8rem",
                                    color: "var(--sx-accent)",
                                  }}
                                >
                                  {r.url}
                                </a>
                              </div>
                              {r.snippet && (
                                <div className="sx-verify-field">
                                  <span className="sx-verify-field-label">
                                    Snippet
                                  </span>
                                  <span
                                    style={{
                                      fontSize: "0.8rem",
                                      color: "var(--sx-muted)",
                                    }}
                                  >
                                    {r.snippet}
                                  </span>
                                </div>
                              )}
                              <div className="sx-verify-field">
                                <span className="sx-verify-field-label">
                                  Content Hash
                                </span>
                                <code style={{ fontSize: "0.72rem" }}>
                                  {r.contentHash}
                                </code>
                              </div>
                              <div className="sx-verify-field">
                                <span className="sx-verify-field-label">
                                  Recomputed Hash
                                </span>
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "0.4rem",
                                  }}
                                >
                                  <code style={{ fontSize: "0.72rem" }}>
                                    {r.recomputedHash}
                                  </code>
                                  <span
                                    className={`sx-hash-badge ${
                                      r.hashMatch ? "sx-match" : "sx-mismatch"
                                    }`}
                                  >
                                    {r.hashMatch ? "✓" : "✗"}
                                  </span>
                                </div>
                              </div>
                              <div className="sx-verify-field">
                                <span className="sx-verify-field-label">
                                  Fetched At
                                </span>
                                <span style={{ fontSize: "0.8rem" }}>
                                  {r.fetchedAt}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
             EXPLORER TAB
            ══════════════════════════════════════════════════════════════ */}
        {activeTab === "explorer" && (
          <div style={{ animation: "fadeUp 0.25s ease both" }}>
            {/* Title */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "1.25rem",
              }}
            >
              <div>
                <h1
                  style={{
                    fontSize: "1.4rem",
                    fontWeight: 700,
                    letterSpacing: "-0.02em",
                    color: "var(--sx-text)",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <Blocks size={20} style={{ color: "var(--sx-accent)" }} />
                  Block Explorer
                </h1>
                <p
                  style={{
                    fontSize: "0.83rem",
                    color: "var(--sx-muted)",
                    marginTop: "0.25rem",
                  }}
                >
                  All search archive records stored on the Hardhat local
                  blockchain (Chain ID: 31337)
                </p>
              </div>
              <button
                onClick={() => fetchRecords()}
                className="sx-copy-btn"
                style={{
                  padding: "0.4rem",
                  borderRadius: "var(--sx-radius)",
                }}
                title="Refresh records"
              >
                <RefreshCw size={14} className={recordsLoading ? "sx-spin" : ""} />
              </button>
            </div>

            {/* Contract Info Card */}
            {contractAddress && (
              <div
                style={{
                  padding: "0.75rem 1rem",
                  marginBottom: "1rem",
                  background: "var(--sx-surface)",
                  border: "1px solid var(--sx-border)",
                  borderRadius: "var(--sx-radius)",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  fontSize: "0.8rem",
                }}
              >
                <span style={{ fontWeight: 600, color: "var(--sx-text)" }}>
                  SearchVerifier
                </span>
                <code
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--sx-accent)",
                    background: "color-mix(in srgb, var(--sx-accent) 8%, transparent)",
                    padding: "2px 8px",
                    borderRadius: "4px",
                  }}
                >
                  {contractAddress}
                </code>
                <button
                  onClick={() => handleCopy(contractAddress, "ca")}
                  className="sx-copy-btn"
                  title="Copy address"
                >
                  {copied === "ca" ? <Check size={11} /> : <Copy size={11} />}
                </button>
              </div>
            )}

            {/* Records Table */}
            {recordsLoading ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "3rem",
                  color: "var(--sx-muted)",
                  gap: "0.5rem",
                }}
              >
                <Loader2 size={16} className="sx-spin" />
                Loading records…
              </div>
            ) : records.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "3rem 1rem",
                  color: "var(--sx-muted)",
                }}
              >
                <Database
                  size={32}
                  style={{ opacity: 0.3, marginBottom: "0.75rem" }}
                />
                <p style={{ fontWeight: 500, marginBottom: "0.3rem" }}>
                  No records yet
                </p>
                <p style={{ fontSize: "0.83rem" }}>
                  Archive a search result to create the first on-chain record.
                </p>
              </div>
            ) : (
              <div
                style={{
                  border: "1px solid var(--sx-border)",
                  borderRadius: "var(--sx-radius)",
                  overflow: "hidden",
                }}
              >
                {/* Table Header */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "60px 1fr 1fr 140px 80px",
                    padding: "0.6rem 1rem",
                    fontSize: "0.72rem",
                    fontWeight: 600,
                    color: "var(--sx-muted)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    background: "var(--sx-surface)",
                    borderBottom: "1px solid var(--sx-border)",
                  }}
                >
                  <span>ID</span>
                  <span>Query Hash</span>
                  <span>Merkle Root</span>
                  <span>Time</span>
                  <span style={{ textAlign: "right" }}>Action</span>
                </div>

                {/* Table Rows */}
                {records.map((record) => (
                  <div
                    key={record.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "60px 1fr 1fr 140px 80px",
                      padding: "0.6rem 1rem",
                      fontSize: "0.8rem",
                      borderBottom: "1px solid var(--sx-border)",
                      alignItems: "center",
                      transition: "background 0.1s",
                    }}
                    className="sx-explorer-row"
                  >
                    <span
                      style={{
                        fontWeight: 600,
                        color: "var(--sx-accent)",
                        fontFamily: "monospace",
                      }}
                    >
                      #{record.id}
                    </span>
                    <code
                      style={{
                        fontSize: "0.72rem",
                        color: "var(--sx-muted)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={record.queryHash}
                    >
                      {truncateHash(record.queryHash, 8)}
                    </code>
                    <code
                      style={{
                        fontSize: "0.72rem",
                        color: "var(--sx-muted)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={record.resultHash}
                    >
                      {truncateHash(record.resultHash, 8)}
                    </code>
                    <span
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--sx-muted)",
                      }}
                    >
                      {timeAgo(record.timestamp)}
                    </span>
                    <div style={{ textAlign: "right" }}>
                      <button
                        onClick={() => {
                          setProofIdInput(String(record.id));
                          handleVerify(String(record.id));
                        }}
                        style={{
                          fontSize: "0.72rem",
                          fontWeight: 600,
                          color: "var(--sx-accent)",
                          background: "color-mix(in srgb, var(--sx-accent) 10%, transparent)",
                          border: "none",
                          padding: "3px 10px",
                          borderRadius: "var(--sx-radius-pill)",
                          cursor: "pointer",
                          transition: "background 0.15s",
                        }}
                      >
                        Verify
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Back link ──────────────────────────────────────────────────── */}
        <div style={{ marginTop: "2rem" }}>
          <Link
            href="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.3rem",
              fontSize: "0.85rem",
              color: "var(--sx-muted)",
              textDecoration: "none",
            }}
          >
            <ArrowLeft size={14} />
            Back to Search
          </Link>
        </div>
      </main>
    </div>
  );
}

import { Suspense } from "react";

export default function VerifyPage() {
  return (
    <Suspense>
      <VerifyContent />
    </Suspense>
  );
}
