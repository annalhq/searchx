/**
 * verify.js — Verification route.
 *
 * GET /api/verify/:proofId
 *
 * Flow:
 *   1. Retrieve on-chain record by proof ID
 *   2. Fetch archived content from IPFS using the stored CID
 *   3. Recompute hashes from IPFS content
 *   4. Compare recomputed values with on-chain record
 *   5. Return verification result (pass/fail with details)
 */

const express = require("express");
const { getSearch } = require("../services/blockchain");
const { getFromIPFS } = require("../services/ipfs");
const { sha256, sha256Bytes32 } = require("../services/hasher");
const { buildMerkleTree } = require("../services/merkle");

const router = express.Router();

router.get("/:proofId", async (req, res) => {
  const proofId = parseInt(req.params.proofId, 10);

  if (isNaN(proofId) || proofId < 0) {
    return res.status(400).json({ error: "Invalid proof ID." });
  }

  try {
    console.log(`\n🔍 Verify request: proofId=${proofId}`);

    // ── 1. Get on-chain record ───────────────────────────────────────────────
    const onChain = await getSearch(proofId);

    if (!onChain) {
      return res.status(404).json({
        error: "Record not found on blockchain. Is Hardhat node running?",
        verified: false,
      });
    }

    // Check if the record is empty (zero hashes = non-existent)
    const zeroHash = "0x" + "0".repeat(64);
    if (onChain.queryHash === zeroHash && onChain.resultHash === zeroHash) {
      return res.status(404).json({
        error: `No record found for proof ID ${proofId}.`,
        verified: false,
      });
    }

    console.log(`   On-chain: queryHash=${onChain.queryHash.substring(0, 14)}...`);
    console.log(`   On-chain: resultHash=${onChain.resultHash.substring(0, 14)}...`);
    console.log(`   On-chain: ipfsCID=${onChain.ipfsCID}`);

    // ── 2. Fetch from IPFS ───────────────────────────────────────────────────
    let ipfsContent = null;
    let ipfsAvailable = false;

    ipfsContent = await getFromIPFS(onChain.ipfsCID);
    ipfsAvailable = ipfsContent !== null;

    // ── 3. Recompute and compare ─────────────────────────────────────────────
    let queryHashMatch = false;
    let merkleRootMatch = false;
    let recomputedQueryHash = null;
    let recomputedMerkleRoot = null;
    let resultDetails = [];

    if (ipfsContent) {
      // Recompute query hash
      recomputedQueryHash = sha256Bytes32(
        (ipfsContent.query || "").trim().toLowerCase()
      );
      queryHashMatch = recomputedQueryHash === onChain.queryHash;

      // Recompute Merkle root from archived results
      if (ipfsContent.results && ipfsContent.results.length > 0) {
        const contentStrings = ipfsContent.results.map((r) =>
          JSON.stringify({
            url: r.url,
            title: r.title,
            snippet: r.snippet,
            pageHTML: r.pageHTML,
          })
        );

        const { root } = buildMerkleTree(contentStrings);
        recomputedMerkleRoot = root;
        merkleRootMatch = recomputedMerkleRoot === onChain.resultHash;

        // Per-result verification detail
        resultDetails = ipfsContent.results.map((r, i) => ({
          url: r.url,
          title: r.title,
          snippet: r.snippet
            ? r.snippet.substring(0, 200) + (r.snippet.length > 200 ? "..." : "")
            : "",
          contentHash: r.contentHash,
          recomputedHash: sha256(contentStrings[i]),
          hashMatch: r.contentHash === sha256(contentStrings[i]),
          hasPageSnapshot: !!r.pageHTML && r.pageHTML.length > 0,
          pageSnapshotSize: r.pageHTML ? r.pageHTML.length : 0,
          fetchedAt: r.fetchedAt,
        }));
      }
    }

    const verified = queryHashMatch && merkleRootMatch;

    console.log(`   Verified: ${verified} (query=${queryHashMatch}, merkle=${merkleRootMatch})`);

    return res.json({
      verified,
      proofId,
      onChain: {
        queryHash: onChain.queryHash,
        resultHash: onChain.resultHash,
        ipfsCID: onChain.ipfsCID,
        timestamp: onChain.timestamp,
        submitter: onChain.submitter,
        recordedAt: new Date(onChain.timestamp * 1000).toISOString(),
      },
      recomputed: {
        queryHash: recomputedQueryHash,
        merkleRoot: recomputedMerkleRoot,
        queryHashMatch,
        merkleRootMatch,
      },
      ipfs: {
        available: ipfsAvailable,
        query: ipfsContent?.query || null,
        archivedAt: ipfsContent?.archivedAt || null,
        resultCount: ipfsContent?.results?.length || 0,
      },
      results: resultDetails,
    });
  } catch (err) {
    console.error("Verify error:", err);
    return res.status(500).json({ error: `Verification failed: ${err.message}`, verified: false });
  }
});

module.exports = router;
