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
} from "lucide-react";

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

function VerifyContent() {
  const searchParams = useSearchParams();
  const [proofIdInput, setProofIdInput] = useState(searchParams.get("id") || "");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerifyResponse | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");
  const [expandedResults, setExpandedResults] = useState<Set<number>>(new Set());

  const handleVerify = useCallback(async (id?: string) => {
    const verifyId = id ?? proofIdInput;
    if (!verifyId.trim()) return;

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
  }, [proofIdInput]);

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

  return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: "var(--sx-bg)",
          borderBottom: "1px solid var(--sx-border)",
          backdropFilter: "blur(8px)",
        }}
      >
        <div
          style={{
            maxWidth: "720px",
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
          <span style={{ color: "var(--sx-muted)", fontSize: "0.85rem" }}>
            / Verify Proof
          </span>
        </div>
      </header>

      {/* Main */}
      <main
        style={{
          maxWidth: "720px",
          margin: "0 auto",
          padding: "2rem 1.25rem 3rem",
          width: "100%",
          flex: 1,
        }}
      >
        {/* Title */}
        <div style={{ marginBottom: "1.5rem" }}>
          <h1
            style={{
              fontSize: "1.5rem",
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: "var(--sx-text)",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <ShieldCheck size={22} style={{ color: "var(--sx-accent)" }} />
            Verify Search Proof
          </h1>
          <p style={{ fontSize: "0.85rem", color: "var(--sx-muted)", marginTop: "0.3rem" }}>
            Enter a proof ID to verify archived search results against the blockchain record.
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
            {loading ? <Loader2 size={15} className="sx-spin" /> : <Search size={15} />}
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

        {/* Result */}
        {result && (
          <div className="sx-verify-card" style={{ animation: "fadeUp 0.3s ease both" }}>
            {/* Status Banner */}
            <div className={`sx-verify-banner ${result.verified ? "sx-verified" : "sx-failed"}`}>
              {result.verified ? (
                <>
                  <ShieldCheck size={20} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "1rem" }}>Verification Passed</div>
                    <div style={{ fontSize: "0.8rem", opacity: 0.85 }}>
                      All hashes match the blockchain record
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <ShieldX size={20} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "1rem" }}>Verification Failed</div>
                    <div style={{ fontSize: "0.8rem", opacity: 0.85 }}>
                      Recomputed hashes do not match on-chain values
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
                <div className="sx-verify-field">
                  <span className="sx-verify-field-label">Query Hash</span>
                  <div className="sx-verify-field-value">
                    <code>{result.onChain.queryHash}</code>
                    <button
                      onClick={() => handleCopy(result.onChain.queryHash, "oqh")}
                      className="sx-copy-btn"
                    >
                      {copied === "oqh" ? <Check size={11} /> : <Copy size={11} />}
                    </button>
                    <span
                      className={`sx-hash-badge ${
                        result.recomputed.queryHashMatch ? "sx-match" : "sx-mismatch"
                      }`}
                    >
                      {result.recomputed.queryHashMatch ? "✓ Match" : "✗ Mismatch"}
                    </span>
                  </div>
                </div>

                <div className="sx-verify-field">
                  <span className="sx-verify-field-label">Result Hash (Merkle Root)</span>
                  <div className="sx-verify-field-value">
                    <code>{result.onChain.resultHash}</code>
                    <button
                      onClick={() => handleCopy(result.onChain.resultHash, "orh")}
                      className="sx-copy-btn"
                    >
                      {copied === "orh" ? <Check size={11} /> : <Copy size={11} />}
                    </button>
                    <span
                      className={`sx-hash-badge ${
                        result.recomputed.merkleRootMatch ? "sx-match" : "sx-mismatch"
                      }`}
                    >
                      {result.recomputed.merkleRootMatch ? "✓ Match" : "✗ Mismatch"}
                    </span>
                  </div>
                </div>

                <div className="sx-verify-field">
                  <span className="sx-verify-field-label">IPFS CID</span>
                  <div className="sx-verify-field-value">
                    <code>{result.onChain.ipfsCID}</code>
                    <button
                      onClick={() => handleCopy(result.onChain.ipfsCID, "ocid")}
                      className="sx-copy-btn"
                    >
                      {copied === "ocid" ? <Check size={11} /> : <Copy size={11} />}
                    </button>
                  </div>
                </div>

                <div className="sx-verify-row">
                  <div className="sx-verify-field" style={{ flex: 1 }}>
                    <span className="sx-verify-field-label">
                      <Clock size={11} /> Timestamp
                    </span>
                    <span style={{ fontSize: "0.85rem" }}>{result.onChain.recordedAt}</span>
                  </div>
                  <div className="sx-verify-field" style={{ flex: 1 }}>
                    <span className="sx-verify-field-label">Submitter</span>
                    <code style={{ fontSize: "0.75rem" }}>
                      {result.onChain.submitter.substring(0, 10)}…
                      {result.onChain.submitter.substring(38)}
                    </code>
                  </div>
                </div>
              </div>
            </div>

            {/* IPFS content */}
            <div className="sx-verify-section">
              <h3 className="sx-verify-section-title">
                <FileText size={14} />
                IPFS Archive
              </h3>

              {result.ipfs.available ? (
                <div className="sx-verify-grid">
                  <div className="sx-verify-row">
                    <div className="sx-verify-field" style={{ flex: 1 }}>
                      <span className="sx-verify-field-label">Original Query</span>
                      <span style={{ fontWeight: 500 }}>{result.ipfs.query}</span>
                    </div>
                    <div className="sx-verify-field" style={{ flex: 1 }}>
                      <span className="sx-verify-field-label">Results Archived</span>
                      <span>{result.ipfs.resultCount}</span>
                    </div>
                    <div className="sx-verify-field" style={{ flex: 1 }}>
                      <span className="sx-verify-field-label">Archived At</span>
                      <span style={{ fontSize: "0.85rem" }}>{result.ipfs.archivedAt}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    padding: "0.75rem",
                    background: "color-mix(in srgb, var(--sx-muted) 8%, transparent)",
                    borderRadius: "var(--sx-radius)",
                    fontSize: "0.85rem",
                    color: "var(--sx-muted)",
                  }}
                >
                  IPFS content not available — content can still be verified if re-uploaded 
                  with the same CID.
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
                          className={`sx-hash-dot ${r.hashMatch ? "sx-match" : "sx-mismatch"}`}
                        />
                        <span className="sx-verify-result-title">{r.title || r.url}</span>
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
                            <span className="sx-verify-field-label">URL</span>
                            <a
                              href={r.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ fontSize: "0.8rem", color: "var(--sx-accent)" }}
                            >
                              {r.url}
                            </a>
                          </div>
                          {r.snippet && (
                            <div className="sx-verify-field">
                              <span className="sx-verify-field-label">Snippet</span>
                              <span style={{ fontSize: "0.8rem", color: "var(--sx-muted)" }}>
                                {r.snippet}
                              </span>
                            </div>
                          )}
                          <div className="sx-verify-field">
                            <span className="sx-verify-field-label">Content Hash</span>
                            <code style={{ fontSize: "0.72rem" }}>{r.contentHash}</code>
                          </div>
                          <div className="sx-verify-field">
                            <span className="sx-verify-field-label">Recomputed Hash</span>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                              <code style={{ fontSize: "0.72rem" }}>{r.recomputedHash}</code>
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
                            <span className="sx-verify-field-label">Fetched At</span>
                            <span style={{ fontSize: "0.8rem" }}>{r.fetchedAt}</span>
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

        {/* Back link */}
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
