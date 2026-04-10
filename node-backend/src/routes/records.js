/**
 * records.js — Blockchain records route.
 *
 * GET /api/records         — List all on-chain records (block explorer)
 *                            Enriched with IPFS metadata (query, url, domain, title)
 * GET /api/records/count   — Get total record count
 * GET /api/records/search  — Search records by domain, title, or proof ID
 */

const express = require("express");
const { getAllRecords, getSearchCount, getStatus } = require("../services/blockchain");
const { getFromIPFS } = require("../services/ipfs");

const router = express.Router();

/**
 * Extract the hostname from a URL string, safely.
 */
function extractDomain(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return url || "";
  }
}

/**
 * Enrich a single blockchain record with its IPFS metadata.
 */
async function enrichRecord(record) {
  const enriched = {
    id: record.id,
    queryHash: record.queryHash,
    resultHash: record.resultHash,
    ipfsCID: record.ipfsCID,
    timestamp: record.timestamp,
    recordedAt: new Date(record.timestamp * 1000).toISOString(),
    submitter: record.submitter,
    // Enriched fields — defaults
    query: null,
    url: null,
    domain: null,
    title: null,
    resultCount: 0,
  };

  try {
    const content = await getFromIPFS(record.ipfsCID);
    if (content) {
      enriched.query = content.query || null;
      enriched.resultCount = content.results?.length || 0;

      // Extract url/domain/title from first result
      if (content.results && content.results.length > 0) {
        const first = content.results[0];
        enriched.url = first.url || null;
        enriched.domain = first.url ? extractDomain(first.url) : null;
        enriched.title = first.title || null;
      }
    }
  } catch {
    // IPFS read failed — enriched fields stay null, which is fine
  }

  return enriched;
}

/**
 * GET /api/records — Returns all on-chain records, enriched with IPFS data.
 */
router.get("/", async (req, res) => {
  try {
    const status = getStatus();
    if (!status.connected) {
      return res.status(503).json({
        error: "Blockchain not connected.",
        records: [],
        count: 0,
      });
    }

    const rawRecords = await getAllRecords();

    // Enrich all records in parallel
    const records = await Promise.all(rawRecords.map(enrichRecord));

    return res.json({
      count: records.length,
      contractAddress: status.contractAddress,
      chainId: status.chainId,
      records,
    });
  } catch (err) {
    console.error("Records error:", err);
    return res.status(500).json({ error: err.message, records: [], count: 0 });
  }
});

/**
 * GET /api/records/count — Returns just the count.
 */
router.get("/count", async (req, res) => {
  try {
    const count = await getSearchCount();
    return res.json({ count });
  } catch (err) {
    return res.status(500).json({ error: err.message, count: 0 });
  }
});

module.exports = router;
