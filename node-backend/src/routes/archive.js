/**
 * archive.js — Archive route.
 *
 * POST /api/archive
 * Body: { query: string, results: [{ url, title, content }] }
 *
 * Flow per URL:
 *   1. captureSnapshot  → screenshot (PNG/base64) + rendered HTML + metadata
 *   2. uploadScreenshotToIPFS / uploadTextToIPFS → individual CIDs
 *   3. mirrorSite       → full site mirror in data/mirror-backup/<hash>/
 *   4. uploadFolderToPinata → folder CID + gateway URL (Pinata cloud)
 *   5. SHA-256 each result → Merkle tree root
 *   6. Upload master metadata JSON to IPFS → masterCID
 *   7. Anchor (queryHash, merkleRoot, masterCID) on blockchain → proofId + txHash
 *   8. Return everything including per-result folderCID + mirrorIndexUrl
 */

const express = require("express");
const { captureSnapshot }        = require("../services/snapshot");
const { mirrorSite }             = require("../services/mirror");
const { uploadFolderToPinata }   = require("../services/pinata");
const { sha256, sha256Bytes32 }  = require("../services/hasher");
const { buildMerkleTree }        = require("../services/merkle");
const {
  uploadToIPFS,
  uploadTextToIPFS,
  uploadScreenshotToIPFS,
  getGatewayUrl,
} = require("../services/ipfs");
const { storeSearch } = require("../services/blockchain");

const router = express.Router();

router.post("/", async (req, res) => {
  const { query, results } = req.body;

  if (!query || !query.trim()) {
    return res.status(400).json({ error: "Missing 'query' field." });
  }
  if (!results || !Array.isArray(results) || results.length === 0) {
    return res.status(400).json({ error: "Missing or empty 'results' array." });
  }

  try {
    console.log(`\n📦 Archive request: query="${query}", ${results.length} result(s)`);

    // ── 1. Process each result ────────────────────────────────────────────────
    const archivedResults = [];

    for (const result of results) {
      console.log(`\n   🔍 Processing: ${result.url}`);

      // ── 1a. Screenshot + rendered HTML (Puppeteer) ──────────────────────────
      const snapshot = await captureSnapshot(result.url);

      const htmlCID = snapshot.html
        ? await uploadTextToIPFS(snapshot.html, "page.html")
        : "";

      const screenshotCID = snapshot.screenshot
        ? await uploadScreenshotToIPFS(snapshot.screenshot, result.url)
        : "";

      // ── 1b. Full site mirror → local folder ─────────────────────────────────
      let folderCID        = "";
      let folderGatewayUrl = "";
      let mirrorIndexUrl   = "";
      let mirrorFileCount  = 0;

      try {
        const mirrorPath = await mirrorSite(result.url);
        if (mirrorPath) {
          // Count files for reporting
          const fs   = require("fs");
          const walk = (d) => {
            let n = 0;
            try {
              for (const e of fs.readdirSync(d, { withFileTypes: true })) {
                n += e.isDirectory() ? walk(require("path").join(d, e.name)) : 1;
              }
            } catch { /**/ }
            return n;
          };
          mirrorFileCount = walk(mirrorPath);

          // ── 1c. Upload mirror folder to Pinata ─────────────────────────────
          const urlObj   = new URL(result.url);
          const siteName = `mirror-backup/${urlObj.hostname}`;
          const pinata   = await uploadFolderToPinata(mirrorPath, siteName);

          if (pinata) {
            folderCID        = pinata.cid;
            folderGatewayUrl = pinata.gatewayUrl;
            mirrorIndexUrl   = pinata.indexUrl;
          }
        }
      } catch (mirrorErr) {
        console.warn(`   ⚠️  Mirror/Pinata step skipped: ${mirrorErr.message}`);
      }

      archivedResults.push({
        url:             result.url,
        title:           snapshot.title  || result.title || "",
        description:     snapshot.description || "",
        snippet:         result.content  || (snapshot.text || "").substring(0, 500) || "",
        text:            snapshot.text || "",
        links:           snapshot.links,
        images:          snapshot.images,
        // IPFS (screenshot + HTML)
        htmlCID,
        screenshotCID,
        htmlGatewayUrl:        getGatewayUrl(htmlCID),
        screenshotGatewayUrl:  getGatewayUrl(screenshotCID),
        // Pinata mirror backup
        folderCID,
        folderGatewayUrl,
        mirrorIndexUrl,
        mirrorFileCount,
        capturedAt:   snapshot.capturedAt,
        snapshotError: snapshot.error || null,
      });
    }

    // ── 2. Hash each result ───────────────────────────────────────────────────
    const contentStrings = archivedResults.map((r) =>
      JSON.stringify({
        url:          r.url,
        title:        r.title,
        snippet:      r.snippet,
        htmlCID:      r.htmlCID,
        screenshotCID: r.screenshotCID,
        folderCID:    r.folderCID,
      })
    );
    const contentHashes = contentStrings.map((c) => sha256(c));
    console.log(`\n   Content hashes: ${contentHashes.length} computed`);

    // ── 3. Merkle tree ────────────────────────────────────────────────────────
    const { root: merkleRoot } = buildMerkleTree(contentStrings);
    console.log(`   Merkle root: ${merkleRoot}`);

    // ── 4. Master metadata JSON → IPFS ────────────────────────────────────────
    const masterPayload = {
      query:      query.trim(),
      archivedAt: new Date().toISOString(),
      merkleRoot,
      results:    archivedResults.map((r, i) => ({
        url:          r.url,
        title:        r.title,
        description:  r.description,
        snippet:      r.snippet,
        htmlCID:      r.htmlCID,
        screenshotCID: r.screenshotCID,
        folderCID:    r.folderCID,
        folderGatewayUrl: r.folderGatewayUrl,
        mirrorIndexUrl:   r.mirrorIndexUrl,
        mirrorFileCount:  r.mirrorFileCount,
        contentHash:  contentHashes[i],
        capturedAt:   r.capturedAt,
        snapshotError: r.snapshotError,
      })),
    };

    const masterCID = await uploadToIPFS(masterPayload);
    console.log(`   Master CID: ${masterCID}`);

    // ── 5. Blockchain anchor ──────────────────────────────────────────────────
    const queryHash  = sha256Bytes32(query.trim().toLowerCase());
    const chainResult = await storeSearch(queryHash, merkleRoot, masterCID);
    console.log(`   ✅ Proof ID: ${chainResult.proofId}, TX: ${chainResult.txHash}`);

    // ── 6. Response ───────────────────────────────────────────────────────────
    return res.json({
      success:      true,
      proofId:      chainResult.proofId,
      txHash:       chainResult.txHash,
      blockNumber:  chainResult.blockNumber,
      gasUsed:      chainResult.gasUsed,
      queryHash,
      merkleRoot,
      ipfsCID:      masterCID,
      masterGatewayUrl: getGatewayUrl(masterCID),
      timestamp:    chainResult.timestamp,
      resultCount:  archivedResults.length,
      contentHashes,
      snapshots: archivedResults.map((r) => ({
        url:                 r.url,
        title:               r.title,
        // Screenshot
        screenshotCID:       r.screenshotCID,
        screenshotGatewayUrl: r.screenshotGatewayUrl,
        // HTML
        htmlCID:             r.htmlCID,
        htmlGatewayUrl:      r.htmlGatewayUrl,
        // Mirror backup (Pinata)
        folderCID:           r.folderCID,
        folderGatewayUrl:    r.folderGatewayUrl,
        mirrorIndexUrl:      r.mirrorIndexUrl,
        mirrorFileCount:     r.mirrorFileCount,
      })),
    });
  } catch (err) {
    console.error("❌ Archive error:", err);
    return res.status(500).json({ error: `Archive failed: ${err.message}` });
  }
});

module.exports = router;
