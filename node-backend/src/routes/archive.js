/**
 * archive.js — Archive route.
 *
 * POST /api/archive
 * Body: { query: string, results: [{ url, title, content }] }
 *
 * Flow:
 *   1. Capture full-page screenshot + rendered HTML via Puppeteer for each URL
 *   2. Upload screenshot (PNG) and HTML to IPFS → individual CIDs
 *   3. SHA-256 hash each result's content
 *   4. Build Merkle tree of all content hashes → Merkle root
 *   5. Upload metadata archive JSON to IPFS → Master CID
 *   6. Store (queryHash, merkleRoot, masterCID) on blockchain → proof ID + tx hash
 *   7. Return proof ID + verification data + gateway URLs
 */

const express = require("express");
const { captureSnapshot } = require("../services/snapshot");
const { sha256, sha256Bytes32 } = require("../services/hasher");
const { buildMerkleTree } = require("../services/merkle");
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

    // ── 1. Snapshot each result ──────────────────────────────────────────────
    const archivedResults = [];

    for (const result of results) {
      console.log(`\n   🔍 Processing: ${result.url}`);

      const snapshot = await captureSnapshot(result.url);

      // Upload HTML and screenshot separately to IPFS
      const htmlCID = snapshot.html
        ? await uploadTextToIPFS(snapshot.html, "page.html")
        : "";

      const screenshotCID = snapshot.screenshot
        ? await uploadScreenshotToIPFS(snapshot.screenshot, result.url)
        : "";

      archivedResults.push({
        url: result.url,
        title: snapshot.title || result.title || "",
        description: snapshot.description || "",
        snippet: result.content || snapshot.text.substring(0, 500) || "",
        text: snapshot.text,
        links: snapshot.links,
        images: snapshot.images,
        htmlCID,
        screenshotCID,
        htmlGatewayUrl: getGatewayUrl(htmlCID),
        screenshotGatewayUrl: getGatewayUrl(screenshotCID),
        capturedAt: snapshot.capturedAt,
        snapshotError: snapshot.error || null,
      });
    }

    // ── 2. Hash each result's combined content ───────────────────────────────
    const contentStrings = archivedResults.map((r) =>
      JSON.stringify({
        url: r.url,
        title: r.title,
        snippet: r.snippet,
        htmlCID: r.htmlCID,
        screenshotCID: r.screenshotCID,
      })
    );

    const contentHashes = contentStrings.map((c) => sha256(c));
    console.log(`\n   Content hashes: ${contentHashes.length} computed`);

    // ── 3. Build Merkle tree ─────────────────────────────────────────────────
    const { root: merkleRoot } = buildMerkleTree(contentStrings);
    console.log(`   Merkle root: ${merkleRoot}`);

    // ── 4. Upload master metadata JSON to IPFS ───────────────────────────────
    const masterPayload = {
      query: query.trim(),
      archivedAt: new Date().toISOString(),
      merkleRoot,
      results: archivedResults.map((r, i) => ({
        url: r.url,
        title: r.title,
        description: r.description,
        snippet: r.snippet,
        htmlCID: r.htmlCID,
        screenshotCID: r.screenshotCID,
        contentHash: contentHashes[i],
        capturedAt: r.capturedAt,
        snapshotError: r.snapshotError,
      })),
    };

    const masterCID = await uploadToIPFS(masterPayload);
    console.log(`   Master CID: ${masterCID}`);

    // ── 5. Store on blockchain ───────────────────────────────────────────────
    const queryHash = sha256Bytes32(query.trim().toLowerCase());
    const chainResult = await storeSearch(queryHash, merkleRoot, masterCID);
    console.log(`   ✅ Proof ID: ${chainResult.proofId}, TX: ${chainResult.txHash}`);

    // ── 6. Return response ───────────────────────────────────────────────────
    return res.json({
      success: true,
      proofId: chainResult.proofId,
      txHash: chainResult.txHash,
      blockNumber: chainResult.blockNumber,
      gasUsed: chainResult.gasUsed,
      queryHash,
      merkleRoot,
      ipfsCID: masterCID,
      masterGatewayUrl: getGatewayUrl(masterCID),
      timestamp: chainResult.timestamp,
      resultCount: archivedResults.length,
      contentHashes,
      // Per-result snapshot info
      snapshots: archivedResults.map((r) => ({
        url: r.url,
        title: r.title,
        screenshotCID: r.screenshotCID,
        screenshotGatewayUrl: r.screenshotGatewayUrl,
        htmlCID: r.htmlCID,
        htmlGatewayUrl: r.htmlGatewayUrl,
      })),
    });
  } catch (err) {
    console.error("❌ Archive error:", err);
    return res.status(500).json({ error: `Archive failed: ${err.message}` });
  }
});

module.exports = router;
