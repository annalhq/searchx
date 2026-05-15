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
  FolderOpen,
  Files,
  Pin,
  CloudUpload,
  Cpu,
  Link2,
  ChevronRight,
} from "lucide-react";

interface SnapshotInfo {
  url: string;
  title: string;
  screenshotCID: string;
  screenshotGatewayUrl: string;
  htmlCID: string;
  htmlGatewayUrl: string;
  /** Pinata folder mirror */
  folderCID?: string;
  folderGatewayUrl?: string;
  mirrorIndexUrl?: string;
  mirrorFileCount?: number;
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

/** Archiving pipeline steps shown as animated progress */
const ARCHIVE_STEPS = [
  { icon: Camera,      label: "Capturing screenshot & HTML…" },
  { icon: Link2,       label: "Mirroring site assets…" },
  { icon: CloudUpload, label: "Uploading backup to Pinata…" },
  { icon: Cpu,         label: "Computing Merkle tree…" },
  { icon: Pin,         label: "Anchoring to blockchain…" },
];

export default function ArchiveButton({ query, result }: ArchiveButtonProps) {
  const [loading, setLoading]         = useState(false);
  const [step, setStep]               = useState(0);           // current progress step
  const [archived, setArchived]       = useState<ArchiveResult | null>(null);
  const [error, setError]             = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const [copied, setCopied]           = useState("");
  const [cardPos, setCardPos]         = useState<{ top: number; right: number }>({ top: 0, right: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const stepTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const updateCardPosition = useCallback(() => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setCardPos({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
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

  // Advance steps automatically during loading (cosmetic — real steps are unknown)
  useEffect(() => {
    if (loading) {
      setStep(0);
      stepTimerRef.current = setInterval(() => {
        setStep((s) => Math.min(s + 1, ARCHIVE_STEPS.length - 1));
      }, 4500); // advance ~every 4.5 s
    } else {
      if (stepTimerRef.current) clearInterval(stepTimerRef.current);
    }
    return () => {
      if (stepTimerRef.current) clearInterval(stepTimerRef.current);
    };
  }, [loading]);

  async function handleArchive() {
    setLoading(true);
    setError("");
    try {
      const resp = await fetch("/api/backend/archive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          results: [{ url: result.url, title: result.title, content: result.content || "" }],
        }),
      });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${resp.status}`);
      }
      const data = await resp.json();
      setArchived(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Archive failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy(text: string, label: string) {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(""), 2000);
  }

  const snapshot = archived?.snapshots?.[0];
  const hasMirror = !!(snapshot?.folderCID || snapshot?.mirrorIndexUrl);

  const detailRows = archived
    ? [
        { label: "Proof ID",    value: String(archived.proofId), key: "pid",  mono: false },
        { label: "TX Hash",     value: archived.txHash,           key: "tx",   mono: true  },
        { label: "Block",       value: `#${archived.blockNumber}`, key: "blk", mono: false },
        { label: "Query Hash",  value: archived.queryHash,        key: "qh",  mono: true  },
        { label: "Merkle Root", value: archived.merkleRoot,       key: "mr",  mono: true  },
        { label: "Master CID",  value: archived.ipfsCID,          key: "cid", mono: true  },
      ]
    : [];

  /* ─── ARCHIVED STATE ──────────────────────────────────────────────────────── */
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
          {hasMirror && (
            <span className="badge badge-xs badge-accent ml-0.5" title="Pinata backup stored">
              <Pin size={8} />
            </span>
          )}
        </button>

        {showDetails &&
          createPortal(
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-[9998] bg-black/20 backdrop-blur-[2px]"
                onClick={() => setShowDetails(false)}
                aria-hidden="true"
              />

              {/* Proof details card */}
              <div
                className="fixed z-[9999] w-[400px] bg-base-100 border border-base-300 rounded-2xl shadow-2xl overflow-hidden animate-fadeUp"
                style={{ top: `${cardPos.top}px`, right: `${cardPos.right}px` }}
              >
                {/* ── Header ── */}
                <div className="flex items-center gap-2 text-success text-sm font-semibold px-5 py-3.5 border-b border-base-300 bg-success/5">
                  <ShieldCheck size={14} />
                  <span>Blockchain Anchored</span>
                  <span className="ml-auto badge badge-xs badge-success">CONFIRMED</span>
                </div>

                {/* ── Screenshot preview ── */}
                {snapshot?.screenshotGatewayUrl && (
                  <div className="border-b border-base-300 overflow-hidden">
                    <img
                      src={snapshot.screenshotGatewayUrl}
                      alt="Website snapshot"
                      className="w-full h-28 object-cover object-top"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                    <div className="px-3 py-1.5 bg-base-200 flex items-center gap-1.5 text-[0.6rem] text-base-content/50">
                      <Camera size={9} />
                      <span>Snapshot captured by Puppeteer</span>
                      <span className="ml-auto truncate max-w-[150px]">{snapshot.title}</span>
                    </div>
                  </div>
                )}

                {/* ── Mirror Backup Banner (if Pinata upload succeeded) ── */}
                {hasMirror && (
                  <div className="mx-4 mt-3 rounded-xl overflow-hidden border border-accent/30 bg-accent/5">
                    {/* Header row */}
                    <div className="flex items-center gap-2 px-3 py-2 border-b border-accent/20 bg-accent/8">
                      <Pin size={12} className="text-accent" />
                      <span className="text-xs font-semibold text-accent">Pinata Mirror Backup</span>
                      {snapshot?.mirrorFileCount ? (
                        <span className="ml-auto flex items-center gap-1 text-[0.6rem] text-accent/70 bg-accent/10 px-1.5 py-0.5 rounded-full">
                          <Files size={9} />
                          {snapshot.mirrorFileCount} files
                        </span>
                      ) : null}
                    </div>

                    {/* Links */}
                    <div className="px-3 py-2.5 space-y-2">
                      {snapshot?.mirrorIndexUrl && (
                        <div className="flex items-center gap-1.5">
                          <Globe size={10} className="text-accent shrink-0" />
                          <a
                            href={snapshot.mirrorIndexUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 text-[0.65rem] text-accent hover:text-accent/80 hover:underline transition-colors truncate"
                            title={snapshot.mirrorIndexUrl}
                          >
                            {snapshot.mirrorIndexUrl}
                          </a>
                          <ExternalLink size={9} className="shrink-0 text-accent/50" />
                        </div>
                      )}
                      {snapshot?.folderCID && (
                        <div className="flex items-center gap-1.5">
                          <FolderOpen size={10} className="text-accent/50 shrink-0" />
                          <code className="text-[0.6rem] font-mono text-base-content/40 bg-base-200 px-1.5 py-0.5 rounded truncate flex-1">
                            {snapshot.folderCID}
                          </code>
                          <button
                            onClick={() => handleCopy(snapshot.folderCID!, "foldercid")}
                            className="btn btn-ghost btn-xs p-0.5 shrink-0"
                            title="Copy folder CID"
                          >
                            {copied === "foldercid"
                              ? <Check size={10} className="text-success" />
                              : <Copy size={10} className="text-base-content/40" />}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ── Detail rows ── */}
                <div className="px-5 py-4 space-y-2.5">
                  {detailRows.map((row) => (
                    <div key={row.key} className="flex items-center justify-between gap-2">
                      <span className="text-xs text-base-content/50 font-medium shrink-0 w-24">{row.label}</span>
                      <div className="flex items-center gap-1.5 min-w-0 flex-1 justify-end">
                        {row.mono ? (
                          <code className="text-[0.65rem] font-mono text-base-content/70 truncate bg-base-200 px-1.5 py-0.5 rounded">
                            {row.value.substring(0, 20)}…
                          </code>
                        ) : (
                          <span className="text-sm font-semibold text-base-content">{row.value}</span>
                        )}
                        {row.mono && (
                          <button
                            onClick={() => handleCopy(row.value, row.key)}
                            className="btn btn-ghost btn-xs p-0.5 hover:bg-base-200"
                            title={`Copy ${row.label}`}
                          >
                            {copied === row.key
                              ? <Check size={10} className="text-success" />
                              : <Copy size={10} className="text-base-content/40" />}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* ── Action buttons ── */}
                <div className="px-5 pb-5 flex flex-col gap-2">
                  {/* Mirror backup button (Pinata) */}
                  {hasMirror && snapshot?.mirrorIndexUrl && (
                    <a
                      href={snapshot.mirrorIndexUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-accent btn-sm w-full gap-1.5 rounded-xl"
                    >
                      <Pin size={13} />
                      <span>Browse Pinata Mirror</span>
                      {snapshot.mirrorFileCount ? (
                        <span className="badge badge-xs badge-accent-content/50 ml-auto">{snapshot.mirrorFileCount} files</span>
                      ) : null}
                      <ExternalLink size={10} />
                    </a>
                  )}

                  {/* View archived site (our own viewer) */}
                  <a
                    href={`/archive/${encodeURIComponent(archived.ipfsCID)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary btn-sm w-full gap-1.5 rounded-xl"
                  >
                    <Globe size={13} />
                    <span>View Archive Viewer</span>
                    <ExternalLink size={10} />
                  </a>

                  {/* Verify */}
                  <a
                    href={`/verify?id=${archived.proofId}`}
                    className="btn btn-ghost btn-sm w-full gap-1.5 rounded-xl border border-base-300"
                  >
                    <Shield size={13} />
                    <span>Verify Blockchain Proof</span>
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

  /* ─── LOADING STATE ───────────────────────────────────────────────────────── */
  if (loading) {
    const currentStep = ARCHIVE_STEPS[step];
    const StepIcon = currentStep.icon;
    return (
      <div className="flex items-center gap-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full
          border border-primary/30 bg-primary/10 text-primary/70 cursor-wait select-none">
          <Loader2 size={12} className="animate-spin" />
          <span className="hidden sm:inline">{currentStep.label}</span>
          <span className="sm:hidden">Archiving…</span>
          <StepIcon size={11} className="opacity-60 shrink-0" />
        </div>
        {/* Step dots */}
        <div className="hidden md:flex items-center gap-0.5">
          {ARCHIVE_STEPS.map((_, i) => (
            <span
              key={i}
              className={`w-1 h-1 rounded-full transition-colors duration-300 ${
                i <= step ? "bg-primary" : "bg-base-300"
              }`}
            />
          ))}
        </div>
      </div>
    );
  }

  /* ─── DEFAULT STATE ───────────────────────────────────────────────────────── */
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleArchive}
        disabled={loading}
        className="group/archive inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full
          border border-primary/30 bg-primary/10 text-primary
          hover:bg-primary/20 hover:border-primary/50 hover:shadow-[0_0_12px_rgba(99,102,241,0.15)]
          active:scale-95
          disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none
          transition-all duration-200 ease-out cursor-pointer"
        title="Archive this result to blockchain + Pinata"
      >
        <Archive size={12} className="transition-transform duration-200 group-hover/archive:scale-110" />
        <span>Archive</span>
        <ChevronRight size={10} className="opacity-30 group-hover/archive:opacity-70 transition-opacity" />
      </button>

      {error && (
        <span className="text-xs text-error bg-error/10 px-2 py-0.5 rounded-full max-w-[180px] truncate" title={error}>
          {error}
        </span>
      )}
    </div>
  );
}
