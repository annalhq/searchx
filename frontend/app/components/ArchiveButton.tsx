"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  Shield,
  ShieldCheck,
  Loader2,
  ExternalLink,
  Copy,
  Check,
  Camera,
  Globe,
  Archive,
} from "lucide-react";

interface SnapshotInfo {
  url: string;
  title: string;
  screenshotCID: string;
  screenshotGatewayUrl: string;
  htmlCID: string;
  htmlGatewayUrl: string;
}

interface ArchiveResult {
  proofId: number;
  txHash: string;
  blockNumber: number;
  gasUsed: string;
  queryHash: string;
  merkleRoot: string;
  ipfsCID: string;
  masterGatewayUrl?: string;
  timestamp: number;
  snapshots?: SnapshotInfo[];
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
  const [cardPos, setCardPos] = useState<{ top: number; right: number }>({
    top: 0,
    right: 0,
  });
  const btnRef = useRef<HTMLButtonElement>(null);

  const updateCardPosition = useCallback(() => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setCardPos({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }
  }, []);

  useEffect(() => {
    if (!showDetails) return;
    updateCardPosition();
    window.addEventListener("scroll", updateCardPosition, true);
    window.addEventListener("resize", updateCardPosition);
    return () => {
      window.removeEventListener("scroll", updateCardPosition, true);
      window.removeEventListener("resize", updateCardPosition);
    };
  }, [showDetails, updateCardPosition]);

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

  // The first result's snapshot (we archive one at a time via this button)
  const snapshot = archived?.snapshots?.[0];

  const detailRows = archived
    ? [
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
          label: "Master CID",
          value: archived.ipfsCID,
          key: "cid",
          mono: true,
        },
      ]
    : [];

  if (archived) {
    return (
      <>
        <button
          ref={btnRef}
          onClick={() => setShowDetails(!showDetails)}
          className="btn btn-xs btn-success gap-1 rounded-full"
          title="Click for verification details"
        >
          <ShieldCheck size={12} />
          <span>Proof #{archived.proofId}</span>
        </button>

        {showDetails &&
          createPortal(
            <>
              {/* Backdrop overlay — click to close */}
              <div
                className="fixed inset-0 z-[9998] bg-black/20 backdrop-blur-[2px]"
                onClick={() => setShowDetails(false)}
                aria-hidden="true"
              />

              {/* Proof details card */}
              <div
                className="fixed z-[9999] w-[360px] bg-base-100 border border-base-300 rounded-xl p-5 animate-fadeUp"
                style={{
                  top: `${cardPos.top}px`,
                  right: `${cardPos.right}px`,
                  boxShadow:
                    "0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.10)",
                }}
              >
                {/* Header */}
                <div className="flex items-center gap-2 text-success text-sm font-semibold mb-3 pb-2.5 border-b border-base-300">
                  <ShieldCheck size={14} />
                  <span>Blockchain Anchored</span>
                  <span className="ml-auto badge badge-xs badge-success">
                    CONFIRMED
                  </span>
                </div>

                {/* Screenshot preview */}
                {snapshot?.screenshotGatewayUrl && (
                  <div className="mb-3 rounded-lg overflow-hidden border border-base-300">
                    <img
                      src={snapshot.screenshotGatewayUrl}
                      alt="Website snapshot"
                      className="w-full h-28 object-cover object-top"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                    <div className="px-2 py-1 bg-base-200 flex items-center gap-1 text-[0.6rem] text-base-content/50">
                      <Camera size={9} />
                      <span>Snapshot captured</span>
                      <span className="ml-auto truncate max-w-[140px]">{snapshot.title}</span>
                    </div>
                  </div>
                )}

                {/* Details grid */}
                <div className="space-y-2.5">
                  {detailRows.map((row) => (
                    <div
                      key={row.key}
                      className="flex items-center justify-between gap-2"
                    >
                      <span className="text-xs text-base-content/50 font-medium shrink-0 w-20">
                        {row.label}
                      </span>
                      <div className="flex items-center gap-1.5 min-w-0 flex-1 justify-end">
                        {row.mono ? (
                          <code className="text-[0.65rem] font-mono text-base-content/70 truncate bg-base-200 px-1.5 py-0.5 rounded">
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
                            className="btn btn-ghost btn-xs p-0.5 hover:bg-base-200"
                            title={`Copy ${row.label}`}
                          >
                            {copied === row.key ? (
                              <Check size={10} className="text-success" />
                            ) : (
                              <Copy size={10} className="text-base-content/40" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Action buttons */}
                <div className="flex flex-col gap-2 mt-4">
                  {/* View archived website */}
                  <a
                    href={`/archive/${encodeURIComponent(archived.ipfsCID)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-accent btn-sm w-full gap-1.5 rounded-lg"
                  >
                    <Globe size={12} />
                    <span>View Archived Site</span>
                    <ExternalLink size={10} />
                  </a>

                  {/* Verify proof */}
                  <a
                    href={`/verify?id=${archived.proofId}`}
                    className="btn btn-primary btn-sm w-full gap-1.5 rounded-lg"
                  >
                    <ShieldCheck size={12} />
                    <span>Verify This Proof</span>
                    <ExternalLink size={10} />
                  </a>
                </div>
              </div>
            </>,
            document.body
          )}
      </>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleArchive}
        disabled={loading}
        className="btn btn-xs btn-outline btn-neutral gap-1 rounded-full transition-all duration-150"
        title="Archive this result to blockchain + IPFS"
      >
        {loading ? (
          <Loader2 size={12} className="animate-spin" />
        ) : (
          <Archive size={12} />
        )}
        <span>{loading ? "Archiving…" : "Archive"}</span>
      </button>

      {error && <span className="text-xs text-error">{error}</span>}
    </div>
  );
}
