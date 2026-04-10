/**
 * archive.js — Archive route.
 *
 * POST /api/archive
 * Body: { query: string, results: [{ url, title, content }] }
 *
 * Flow:
 *   1. Fetch webpage HTML for each selected result
 *   2. SHA-256 hash each result's content
 *   3. Build Merkle tree of all content hashes → Merkle root
 *   4. Upload full content archive to local content store → CID
 *   5. Store (queryHash, merkleRoot, CID) on blockchain → proof ID + tx hash
 *   6. Return proof ID + verification data
 */

const express = require("express");
const { fetchPageContent } = require("../services/searxng");
const { sha256, sha256Bytes32 } = require("../services/hasher");
const { buildMerkleTree } = require("../services/merkle");
const { uploadToIPFS } = require("../services/ipfs");
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

    // ── 1. Fetch webpage HTML for each result ────────────────────────────────
    const archivedResults = [];

    for (const result of results) {
      console.log(`   Fetching: ${result.url}`);
      const pageHTML = await fetchPageContent(result.url);

      archivedResults.push({
        url: result.url,
        title: result.title || "",
        snippet: result.content || "",
        pageHTML: pageHTML,
        fetchedAt: new Date().toISOString(),
      });
    }

    // ── 2. Hash each result's combined content ───────────────────────────────
    const contentStrings = archivedResults.map((r) => {
      return JSON.stringify({
        url: r.url,
        title: r.title,
        snippet: r.snippet,
        pageHTML: r.pageHTML,
      });
    });

    const contentHashes = contentStrings.map((c) => sha256(c));
    console.log(`   Content hashes: ${contentHashes.length} computed`);

    // ── 3. Build Merkle tree ─────────────────────────────────────────────────
    const { root: merkleRoot, leaves } = buildMerkleTree(contentStrings);
    console.log(`   Merkle root: ${merkleRoot}`);

    // ── 4. Upload to local content store ─────────────────────────────────────
    const ipfsPayload = {
      query: query.trim(),
      archivedAt: new Date().toISOString(),
      merkleRoot: merkleRoot,
      results: archivedResults.map((r, i) => ({
        url: r.url,
        title: r.title,
        snippet: r.snippet,
        pageHTML: r.pageHTML,
        contentHash: contentHashes[i],
        fetchedAt: r.fetchedAt,
      })),
    };

    const ipfsCID = await uploadToIPFS(ipfsPayload);
    console.log(`   CID: ${ipfsCID}`);

    // ── 5. Store on blockchain ───────────────────────────────────────────────
    const queryHash = sha256Bytes32(query.trim().toLowerCase());
    const chainResult = await storeSearch(queryHash, merkleRoot, ipfsCID);
    console.log(`   ✅ Proof ID: ${chainResult.proofId}, TX: ${chainResult.txHash}`);

    // ── 6. Return response ───────────────────────────────────────────────────
    return res.json({
      success: true,
      proofId: chainResult.proofId,
      txHash: chainResult.txHash,
      blockNumber: chainResult.blockNumber,
      gasUsed: chainResult.gasUsed,
      queryHash: queryHash,
      merkleRoot: merkleRoot,
      ipfsCID: ipfsCID,
      timestamp: chainResult.timestamp,
      resultCount: archivedResults.length,
      contentHashes: contentHashes,
    });
  } catch (err) {
    console.error("❌ Archive error:", err);
    return res.status(500).json({ error: `Archive failed: ${err.message}` });
  }
});

module.exports = router;
