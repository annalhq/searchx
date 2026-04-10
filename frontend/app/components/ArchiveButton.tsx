"use client";

import { useState } from "react";
import { Shield, ShieldCheck, Loader2, ExternalLink, Copy, Check } from "lucide-react";

interface ArchiveResult {
  proofId: number;
  txHash: string;
  blockNumber: number;
  gasUsed: string;
  queryHash: string;
  merkleRoot: string;
  ipfsCID: string;
  timestamp: number;
}

interface ArchiveButtonProps {
  query: string;
  result: {
    url: string;
    title: string;
    content?: string;
  };
}

export default function ArchiveButton({ query, result }: ArchiveButtonProps) {
  const [loading, setLoading] = useState(false);
  const [archived, setArchived] = useState<ArchiveResult | null>(null);
  const [error, setError] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const [copied, setCopied] = useState("");

  async function handleArchive() {
    setLoading(true);
    setError("");

    try {
      const resp = await fetch("/api/backend/archive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          results: [
            {
              url: result.url,
              title: result.title,
              content: result.content || "",
            },
          ],
        }),
      });

      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${resp.status}`);
      }

      const data = await resp.json();
      setArchived(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Archive failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy(text: string, label: string) {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(""), 2000);
  }

  if (archived) {
    return (
      <div className="sx-archive-result">
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="sx-archive-badge"
          title="Click for verification details"
        >
          <ShieldCheck size={13} />
          <span>Proof #{archived.proofId}</span>
        </button>

        {showDetails && (
          <div className="sx-archive-details">
            <div className="sx-archive-details-header">
              <ShieldCheck size={14} />
              <span>Blockchain Anchored</span>
              <span
                style={{
                  fontSize: "0.65rem",
                  padding: "1px 6px",
                  borderRadius: "4px",
                  background: "color-mix(in srgb, #22c55e 15%, transparent)",
                  color: "#22c55e",
                  fontWeight: 600,
                }}
              >
                CONFIRMED
              </span>
            </div>

            <div className="sx-archive-detail-row">
              <span className="sx-archive-label">Proof ID</span>
              <span className="sx-archive-value">{archived.proofId}</span>
            </div>

            <div className="sx-archive-detail-row">
              <span className="sx-archive-label">TX Hash</span>
              <div className="sx-archive-hash-row">
                <code>{archived.txHash.substring(0, 18)}…</code>
                <button
                  onClick={() => handleCopy(archived.txHash, "tx")}
                  className="sx-copy-btn"
                  title="Copy TX hash"
                >
                  {copied === "tx" ? <Check size={11} /> : <Copy size={11} />}
                </button>
              </div>
            </div>

            <div className="sx-archive-detail-row">
              <span className="sx-archive-label">Block</span>
              <span className="sx-archive-value">#{archived.blockNumber}</span>
            </div>

            <div className="sx-archive-detail-row">
              <span className="sx-archive-label">Query Hash</span>
              <div className="sx-archive-hash-row">
                <code>{archived.queryHash.substring(0, 18)}…</code>
                <button
                  onClick={() => handleCopy(archived.queryHash, "qh")}
                  className="sx-copy-btn"
                  title="Copy full hash"
                >
                  {copied === "qh" ? <Check size={11} /> : <Copy size={11} />}
                </button>
              </div>
            </div>

            <div className="sx-archive-detail-row">
              <span className="sx-archive-label">Merkle Root</span>
              <div className="sx-archive-hash-row">
                <code>{archived.merkleRoot.substring(0, 18)}…</code>
                <button
                  onClick={() => handleCopy(archived.merkleRoot, "mr")}
                  className="sx-copy-btn"
                  title="Copy full hash"
                >
                  {copied === "mr" ? <Check size={11} /> : <Copy size={11} />}
                </button>
              </div>
            </div>

            <div className="sx-archive-detail-row">
              <span className="sx-archive-label">Content CID</span>
              <div className="sx-archive-hash-row">
                <code>{archived.ipfsCID.substring(0, 18)}…</code>
                <button
                  onClick={() => handleCopy(archived.ipfsCID, "cid")}
                  className="sx-copy-btn"
                  title="Copy CID"
                >
                  {copied === "cid" ? <Check size={11} /> : <Copy size={11} />}
                </button>
              </div>
            </div>

            <a
              href={`/verify?id=${archived.proofId}`}
              className="sx-verify-link"
            >
              <ShieldCheck size={12} />
              <span>Verify This Proof</span>
              <ExternalLink size={10} />
            </a>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="sx-archive-btn-wrap">
      <button
        onClick={handleArchive}
        disabled={loading}
        className="sx-archive-btn"
        title="Archive this result to blockchain"
      >
        {loading ? (
          <Loader2 size={13} className="sx-spin" />
        ) : (
          <Shield size={13} />
        )}
        <span>{loading ? "Archiving…" : "Archive"}</span>
      </button>

      {error && <span className="sx-archive-error">{error}</span>}
    </div>
  );
}
