"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import ThemeToggle from "../../components/ThemeToggle";
import {
  ArrowLeft,
  Camera,
  Globe,
  FileText,
  Hash,
  Clock,
  Shield,
  ExternalLink,
  Loader2,
  AlertCircle,
  ChevronRight,
  Link2,
  Image as ImageIcon,
  Database,
  Download,
  FolderOpen,
  Files,
  Copy,
  Check,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ArchivedResult {
  url: string;
  title: string;
  description?: string;
  snippet?: string;
  htmlCID: string;
  screenshotCID: string;
  contentHash: string;
  capturedAt: string;
  snapshotError?: string | null;
  /** Pinata mirror backup */
  folderCID?: string;
  folderGatewayUrl?: string;
  mirrorIndexUrl?: string;
  mirrorFileCount?: number;
}

interface ArchiveMetadata {
  query: string;
  archivedAt: string;
  merkleRoot: string;
  results: ArchivedResult[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function shortHash(h: string) {
  return h ? `${h.slice(0, 10)}…${h.slice(-6)}` : "—";
}

// ─── Viewer Tabs ──────────────────────────────────────────────────────────────

type Tab = "screenshot" | "html" | "metadata" | "mirror";

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ArchiveViewerPage({
  params,
}: {
  params: Promise<{ cid: string }>;
}) {
  const { cid } = use(params);
  const decodedCID = decodeURIComponent(cid);

  const [meta, setMeta] = useState<ArchiveMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeResult, setActiveResult] = useState(0);
  const [activeTab, setActiveTab] = useState<Tab>("screenshot");
  const [htmlLoading, setHtmlLoading] = useState(false);
  const [mirrorLoading, setMirrorLoading] = useState(false);
  const [copied, setCopied] = useState("");

  async function handleCopy(text: string, key: string) {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(""), 2000);
  }

  useEffect(() => {
    async function loadMeta() {
      setLoading(true);
      setError("");
      try {
        const resp = await fetch(
          `/api/backend/archive/content/${encodeURIComponent(decodedCID)}`
        );
        if (!resp.ok) {
          const d = await resp.json().catch(() => ({}));
          throw new Error(d.error || `HTTP ${resp.status}`);
        }
        const data: ArchiveMetadata = await resp.json();
        setMeta(data);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to load archive");
      } finally {
        setLoading(false);
      }
    }
    loadMeta();
  }, [decodedCID]);

  const currentResult = meta?.results?.[activeResult];

  // Screenshot URL: prefers IPFS gateway, falls back to local backend route
  function screenshotUrl(r: ArchivedResult) {
    if (!r.screenshotCID) return "";
    // If screenshotCID starts with "Qmss" it's a local storage key
    if (r.screenshotCID.startsWith("Qmss")) {
      return `/api/backend/archive/screenshot/${r.screenshotCID}`;
    }
    // Real IPFS CID — use gateway (we don't know the port, use relative backend proxy)
    return `/api/backend/archive/screenshot/${r.screenshotCID}`;
  }

  function htmlViewerUrl(r: ArchivedResult) {
    if (!r.htmlCID) return "";
    return `/api/backend/archive/html/${r.htmlCID}`;
  }

  return (
    <main className="min-h-screen bg-base-200">
      {/* ── Top bar ── */}
      <header className="bg-base-100 border-b border-base-300 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            href="/"
            className="btn btn-ghost btn-sm btn-circle"
            title="Back to search"
          >
            <ArrowLeft size={16} />
          </Link>

          <div className="flex items-center gap-2 min-w-0">
            <div className="badge badge-accent badge-sm font-mono shrink-0">
              ARCHIVE
            </div>
            <code className="text-xs font-mono text-base-content/50 truncate hidden sm:block">
              {decodedCID}
            </code>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <a
              href={`/verify`}
              className="btn btn-ghost btn-xs gap-1"
            >
              <Shield size={12} />
              <span className="hidden sm:inline">Verify</span>
            </a>
          </div>
        </div>
      </header>

      {/* ── Loading ── */}
      {loading && (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <Loader2 className="animate-spin text-primary" size={40} />
          <p className="text-base-content/50 text-sm">Loading archive from IPFS…</p>
        </div>
      )}

      {/* ── Error ── */}
      {!loading && error && (
        <div className="max-w-2xl mx-auto mt-16 p-6">
          <div className="alert alert-error">
            <AlertCircle size={18} />
            <div>
              <p className="font-semibold">Failed to load archive</p>
              <p className="text-sm opacity-80">{error}</p>
            </div>
          </div>
          <p className="mt-4 text-sm text-base-content/50">
            Make sure your IPFS Desktop is running and the gateway is accessible.
          </p>
        </div>
      )}

      {/* ── Archive content ── */}
      {!loading && meta && (
        <div className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-[300px,1fr] gap-6">
          {/* ── Left sidebar: archive info + result list ── */}
          <aside className="space-y-4">
            {/* Archive summary card */}
            <div className="bg-base-100 rounded-2xl border border-base-300 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Database size={14} className="text-primary" />
                <span className="text-sm font-semibold">Archive Details</span>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-base-content/50">Query</span>
                  <p className="font-semibold mt-0.5 text-sm">"{meta.query}"</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock size={10} className="text-base-content/40" />
                  <span className="text-base-content/60">
                    {formatDate(meta.archivedAt)}
                  </span>
                </div>
                <div className="flex items-start gap-1.5">
                  <Hash size={10} className="text-base-content/40 mt-0.5" />
                  <code className="text-[0.6rem] font-mono text-base-content/40 break-all">
                    {meta.merkleRoot}
                  </code>
                </div>
              </div>
            </div>

            {/* Result list */}
            <div className="bg-base-100 rounded-2xl border border-base-300 overflow-hidden">
              <div className="px-4 py-3 border-b border-base-300 text-xs font-semibold text-base-content/60 uppercase tracking-wide">
                Archived Pages ({meta.results.length})
              </div>
              {meta.results.map((r, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setActiveResult(i);
                    setActiveTab("screenshot");
                  }}
                  className={`w-full text-left px-4 py-3 flex items-start gap-3 border-b border-base-300 last:border-0 transition-colors ${
                    activeResult === i
                      ? "bg-primary/10 border-l-2 border-l-primary"
                      : "hover:bg-base-200"
                  }`}
                >
                  <Globe size={14} className="mt-0.5 shrink-0 text-base-content/40" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">
                      {r.title || r.url}
                    </p>
                    <p className="text-[0.6rem] text-base-content/40 truncate mt-0.5">
                      {r.url}
                    </p>
                  </div>
                  <ChevronRight
                    size={12}
                    className={`ml-auto mt-1 shrink-0 transition-opacity ${
                      activeResult === i ? "opacity-100 text-primary" : "opacity-0"
                    }`}
                  />
                </button>
              ))}
            </div>
          </aside>

          {/* ── Main viewer ── */}
          <div className="space-y-4">
            {currentResult && (
              <>
                {/* Page header */}
                <div className="bg-base-100 rounded-2xl border border-base-300 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h1 className="text-base font-bold truncate">
                        {currentResult.title || "Archived Page"}
                      </h1>
                      <a
                        href={currentResult.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary/70 hover:text-primary flex items-center gap-1 mt-0.5 truncate"
                      >
                        <Link2 size={10} />
                        {currentResult.url}
                        <ExternalLink size={9} />
                      </a>
                      {currentResult.description && (
                        <p className="text-xs text-base-content/60 mt-2 line-clamp-2">
                          {currentResult.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {currentResult.snapshotError ? (
                        <div className="badge badge-warning badge-sm gap-1">
                          <AlertCircle size={10} />
                          Partial
                        </div>
                      ) : (
                        <div className="badge badge-success badge-sm gap-1">
                          <Camera size={10} />
                          Captured
                        </div>
                      )}
                      <span className="text-[0.6rem] text-base-content/40">
                        {formatDate(currentResult.capturedAt)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Tab bar */}
                <div className="tabs tabs-boxed bg-base-100 border border-base-300 rounded-xl p-1 w-fit flex-wrap">
                  <button
                    className={`tab tab-sm gap-1.5 ${activeTab === "screenshot" ? "tab-active" : ""}`}
                    onClick={() => setActiveTab("screenshot")}
                  >
                    <Camera size={12} />
                    Screenshot
                  </button>
                  <button
                    className={`tab tab-sm gap-1.5 ${activeTab === "html" ? "tab-active" : ""}`}
                    onClick={() => setActiveTab("html")}
                  >
                    <Globe size={12} />
                    Live HTML View
                  </button>
                  <button
                    className={`tab tab-sm gap-1.5 ${activeTab === "metadata" ? "tab-active" : ""}`}
                    onClick={() => setActiveTab("metadata")}
                  >
                    <FileText size={12} />
                    Metadata
                  </button>
                  {/* Mirror tab — only show if folderCID is present */}
                  {currentResult.folderCID && (
                    <button
                      className={`tab tab-sm gap-1.5 ${
                        activeTab === "mirror"
                          ? "tab-active [--tab-bg:oklch(var(--a)/1)] [--tab-border-color:oklch(var(--a)/1)]"
                          : ""
                      }`}
                      onClick={() => setActiveTab("mirror")}
                    >
                      <FolderOpen size={12} />
                      Mirror Backup
                      <span className="badge badge-xs badge-accent ml-0.5">IPFS</span>
                    </button>
                  )}
                </div>

                {/* ── Screenshot tab ── */}
                {activeTab === "screenshot" && (
                  <div className="bg-base-100 rounded-2xl border border-base-300 overflow-hidden">
                    <div className="px-4 py-2.5 border-b border-base-300 flex items-center gap-2 text-xs text-base-content/50">
                      <Camera size={12} />
                      <span>Full-page snapshot — captured by Puppeteer at archive time</span>
                      <a
                        href={screenshotUrl(currentResult)}
                        download={`snapshot-${currentResult.screenshotCID}.png`}
                        className="ml-auto btn btn-ghost btn-xs gap-1"
                      >
                        <Download size={11} />
                        PNG
                      </a>
                    </div>
                    {currentResult.screenshotCID ? (
                      <div className="relative bg-base-200 min-h-[400px] flex items-start justify-center p-2">
                        <img
                          src={screenshotUrl(currentResult)}
                          alt={`Snapshot of ${currentResult.url}`}
                          className="w-full max-w-5xl rounded-lg shadow-lg border border-base-300"
                          style={{ imageRendering: "auto" }}
                          onError={(e) => {
                            const el = e.target as HTMLImageElement;
                            el.replaceWith(
                              Object.assign(document.createElement("div"), {
                                className: "p-8 text-center text-base-content/40",
                                innerHTML:
                                  '<div class="flex flex-col items-center gap-2"><span style="font-size:2rem">🖼️</span><p class="text-sm">Screenshot not available<br/><span class="text-xs">IPFS Desktop may not be running or the CID is not pinned</span></p></div>',
                              })
                            );
                          }}
                        />
                      </div>
                    ) : (
                      <div className="p-10 text-center text-base-content/30">
                        <ImageIcon size={32} className="mx-auto mb-3 opacity-40" />
                        <p className="text-sm">No screenshot captured for this result</p>
                        {currentResult.snapshotError && (
                          <p className="text-xs mt-1 text-warning">
                            {currentResult.snapshotError}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* ── Live HTML View tab ── */}
                {activeTab === "html" && (
                  <div className="bg-base-100 rounded-2xl border border-base-300 overflow-hidden">
                    <div className="px-4 py-2.5 border-b border-base-300 flex items-center gap-2 text-xs text-base-content/50">
                      <Globe size={12} />
                      <span>Archived HTML — rendered from IPFS (original site may be gone)</span>
                      <a
                        href={htmlViewerUrl(currentResult)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-auto btn btn-ghost btn-xs gap-1"
                      >
                        <ExternalLink size={11} />
                        Open
                      </a>
                    </div>
                    {currentResult.htmlCID ? (
                      <div className="relative" style={{ height: "70vh" }}>
                        {htmlLoading && (
                          <div className="absolute inset-0 flex items-center justify-center bg-base-200 z-10">
                            <Loader2 className="animate-spin text-primary" size={28} />
                          </div>
                        )}
                        <iframe
                          src={htmlViewerUrl(currentResult)}
                          className="w-full h-full border-0"
                          title={`Archived: ${currentResult.title}`}
                          sandbox="allow-same-origin allow-scripts allow-popups"
                          onLoad={() => setHtmlLoading(false)}
                          onLoadStart={() => setHtmlLoading(true)}
                        />
                      </div>
                    ) : (
                      <div className="p-10 text-center text-base-content/30">
                        <FileText size={32} className="mx-auto mb-3 opacity-40" />
                        <p className="text-sm">No HTML snapshot available</p>
                      </div>
                    )}
                  </div>
                )}

                {/* ── Mirror Backup tab ── */}
                {activeTab === "mirror" && currentResult.folderCID && (
                  <div className="bg-base-100 rounded-2xl border border-accent/30 overflow-hidden">
                    {/* Header */}
                    <div className="px-4 py-3 border-b border-accent/20 bg-accent/5 flex items-center gap-2">
                      <FolderOpen size={14} className="text-accent" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-accent">Mirror Backup — Pinata IPFS</p>
                        <p className="text-[0.6rem] text-base-content/40 mt-0.5">
                          Full site clone with all assets (HTML + CSS + JS + images)
                        </p>
                      </div>
                      {currentResult.mirrorFileCount ? (
                        <div className="flex items-center gap-1 text-[0.6rem] text-base-content/50 shrink-0">
                          <Files size={10} />
                          {currentResult.mirrorFileCount} files
                        </div>
                      ) : null}
                    </div>

                    {/* CID + links row */}
                    <div className="px-4 py-3 border-b border-base-300 space-y-2">
                      {/* Folder CID */}
                      <div className="flex items-center gap-2">
                        <span className="text-[0.6rem] text-base-content/40 w-20 shrink-0">Folder CID</span>
                        <code className="flex-1 text-[0.65rem] font-mono text-base-content/60 bg-base-200 px-2 py-1 rounded truncate">
                          {currentResult.folderCID}
                        </code>
                        <button
                          onClick={() => handleCopy(currentResult.folderCID!, "foldercid")}
                          className="btn btn-ghost btn-xs p-1"
                          title="Copy CID"
                        >
                          {copied === "foldercid"
                            ? <Check size={11} className="text-success" />
                            : <Copy size={11} className="text-base-content/40" />}
                        </button>
                      </div>

                      {/* Action buttons */}
                      <div className="flex gap-2 flex-wrap">
                        {currentResult.mirrorIndexUrl && (
                          <a
                            href={currentResult.mirrorIndexUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-accent btn-xs gap-1 rounded-lg"
                          >
                            <Globe size={11} />
                            Open Mirrored Site
                            <ExternalLink size={9} />
                          </a>
                        )}
                        {currentResult.folderGatewayUrl && (
                          <a
                            href={currentResult.folderGatewayUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-ghost btn-xs gap-1 rounded-lg border border-base-300"
                          >
                            <FolderOpen size={11} />
                            Browse Folder
                            <ExternalLink size={9} />
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Embedded preview */}
                    {currentResult.mirrorIndexUrl && (
                      <div className="relative" style={{ height: "70vh" }}>
                        {mirrorLoading && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center bg-base-200 z-10 gap-3">
                            <div className="relative">
                              <div className="w-12 h-12 rounded-full border-2 border-accent/20 border-t-accent animate-spin" />
                              <FolderOpen size={18} className="absolute inset-0 m-auto text-accent" />
                            </div>
                            <p className="text-xs text-base-content/50">Loading mirror backup from Pinata…</p>
                          </div>
                        )}
                        <iframe
                          src={currentResult.mirrorIndexUrl}
                          className="w-full h-full border-0"
                          title={`Mirror of ${currentResult.title}`}
                          sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                          onLoad={() => setMirrorLoading(false)}
                          onLoadStart={() => setMirrorLoading(true)}
                        />
                      </div>
                    )}

                    {/* Info footer */}
                    <div className="px-4 py-2.5 bg-base-200/60 flex items-center gap-2 text-[0.6rem] text-base-content/40 border-t border-base-300">
                      <Shield size={9} />
                      <span>Pinned to Pinata — accessible even if the original site goes offline</span>
                    </div>
                  </div>
                )}

                {/* Mirror tab placeholder when no folderCID */}
                {activeTab === "mirror" && !currentResult.folderCID && (
                  <div className="bg-base-100 rounded-2xl border border-base-300 p-10 text-center text-base-content/30">
                    <FolderOpen size={32} className="mx-auto mb-3 opacity-40" />
                    <p className="text-sm font-medium">No mirror backup available</p>
                    <p className="text-xs mt-1">Add PINATA_JWT to .env and re-archive to enable Pinata uploads.</p>
                  </div>
                )}

                {/* ── Metadata tab ── */}
                {activeTab === "metadata" && (
                  <div className="bg-base-100 rounded-2xl border border-base-300 p-5 space-y-4">
                    <div>
                      <h2 className="text-xs font-semibold text-base-content/50 uppercase tracking-wide mb-2">
                        Cryptographic Hashes
                      </h2>
                      <div className="space-y-2">
                        {[
                          { label: "Content Hash", value: currentResult.contentHash },
                          { label: "HTML CID (IPFS)", value: currentResult.htmlCID },
                          { label: "Screenshot CID (IPFS)", value: currentResult.screenshotCID },
                          { label: "Merkle Root", value: meta.merkleRoot },
                          { label: "Master Archive CID", value: decodedCID },
                        ].map(({ label, value }) => (
                          <div key={label} className="flex items-start gap-3">
                            <span className="text-xs text-base-content/40 w-40 shrink-0 pt-0.5">
                              {label}
                            </span>
                            <code className="text-[0.65rem] font-mono text-base-content/70 bg-base-200 px-2 py-1 rounded break-all flex-1">
                              {value || "—"}
                            </code>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="divider my-2" />

                    <div>
                      <h2 className="text-xs font-semibold text-base-content/50 uppercase tracking-wide mb-2">
                        Page Info
                      </h2>
                      <div className="space-y-2 text-xs">
                        <div className="flex gap-3">
                          <span className="text-base-content/40 w-40 shrink-0">URL</span>
                          <a
                            href={currentResult.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline truncate"
                          >
                            {currentResult.url}
                          </a>
                        </div>
                        <div className="flex gap-3">
                          <span className="text-base-content/40 w-40 shrink-0">Title</span>
                          <span className="text-base-content/70">{currentResult.title}</span>
                        </div>
                        {currentResult.description && (
                          <div className="flex gap-3">
                            <span className="text-base-content/40 w-40 shrink-0">Description</span>
                            <span className="text-base-content/70">{currentResult.description}</span>
                          </div>
                        )}
                        <div className="flex gap-3">
                          <span className="text-base-content/40 w-40 shrink-0">Captured At</span>
                          <span className="text-base-content/70">
                            {formatDate(currentResult.capturedAt)}
                          </span>
                        </div>
                        {currentResult.snapshotError && (
                          <div className="flex gap-3">
                            <span className="text-base-content/40 w-40 shrink-0">Capture Error</span>
                            <span className="text-warning text-[0.65rem]">
                              {currentResult.snapshotError}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {currentResult.snippet && (
                      <>
                        <div className="divider my-2" />
                        <div>
                          <h2 className="text-xs font-semibold text-base-content/50 uppercase tracking-wide mb-2">
                            Text Extract
                          </h2>
                          <p className="text-xs text-base-content/60 bg-base-200 rounded-lg p-3 leading-relaxed line-clamp-6">
                            {currentResult.snippet}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
