"use client";

import { useState } from "react";
import {
  Shield,
  ShieldCheck,
  Loader2,
  ExternalLink,
  Copy,
  Check,
} from "lucide-react";

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
      <div className="relative">
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="btn btn-xs btn-success gap-1 rounded-full"
          title="Click for verification details"
        >
          <ShieldCheck size={12} />
          <span>Proof #{archived.proofId}</span>
        </button>

        {showDetails && (
          <div className="absolute top-full right-0 mt-2 z-40 min-w-[300px] bg-base-100 border border-base-300 rounded-xl p-4 shadow-xl animate-fadeUp">
            {/* Header */}
            <div className="flex items-center gap-2 text-success text-sm font-semibold mb-3 pb-2.5 border-b border-base-300">
              <ShieldCheck size={14} />
              <span>Blockchain Anchored</span>
              <span className="ml-auto badge badge-xs badge-success">
                CONFIRMED
              </span>
            </div>

            {/* Details grid */}
            <div className="space-y-2">
              {[
                {
                  label: "Proof ID",
                  value: String(archived.proofId),
                  key: "pid",
                  mono: false,
                },
                {
                  label: "TX Hash",
                  value: archived.txHash,
                  key: "tx",
                  mono: true,
                },
                {
                  label: "Block",
                  value: `#${archived.blockNumber}`,
                  key: "blk",
                  mono: false,
                },
                {
                  label: "Query Hash",
                  value: archived.queryHash,
                  key: "qh",
                  mono: true,
                },
                {
                  label: "Merkle Root",
                  value: archived.merkleRoot,
                  key: "mr",
                  mono: true,
                },
                {
                  label: "Content CID",
                  value: archived.ipfsCID,
                  key: "cid",
                  mono: true,
                },
              ].map((row) => (
                <div
                  key={row.key}
                  className="flex items-center justify-between gap-2"
                >
                  <span className="text-xs text-base-content/40 font-medium shrink-0 w-20">
                    {row.label}
                  </span>
                  <div className="flex items-center gap-1 min-w-0 flex-1 justify-end">
                    {row.mono ? (
                      <code className="text-[0.65rem] font-mono text-base-content/60 truncate">
                        {row.value.substring(0, 20)}…
                      </code>
                    ) : (
                      <span className="text-sm font-semibold text-base-content">
                        {row.value}
                      </span>
                    )}
                    {row.mono && (
                      <button
                        onClick={() => handleCopy(row.value, row.key)}
                        className="btn btn-ghost btn-xs p-0.5"
                        title={`Copy ${row.label}`}
                      >
                        {copied === row.key ? (
                          <Check size={10} className="text-success" />
                        ) : (
                          <Copy size={10} />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Verify link */}
            <a
              href={`/verify?id=${archived.proofId}`}
              className="btn btn-primary btn-sm btn-outline w-full mt-3 gap-1.5 rounded-lg"
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
    <div className="flex items-center gap-2">
      <button
        onClick={handleArchive}
        disabled={loading}
        className="btn btn-xs btn-ghost gap-1 rounded-full text-base-content/40 hover:text-primary hover:bg-primary/5 transition-all duration-150"
        title="Archive this result to blockchain"
      >
        {loading ? (
          <Loader2 size={12} className="animate-spin" />
        ) : (
          <Shield size={12} />
        )}
        <span>{loading ? "Archiving…" : "Archive"}</span>
      </button>

      {error && <span className="text-xs text-error">{error}</span>}
    </div>
  );
}
