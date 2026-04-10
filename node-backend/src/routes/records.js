/**
 * records.js — Blockchain records route.
 *
 * GET /api/records         — List all on-chain records (block explorer)
 * GET /api/records/count   — Get total record count
 */

const express = require("express");
const { getAllRecords, getSearchCount, getStatus } = require("../services/blockchain");

const router = express.Router();

/**
 * GET /api/records — Returns all on-chain records for the block explorer.
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

    const records = await getAllRecords();

    return res.json({
      count: records.length,
      contractAddress: status.contractAddress,
      chainId: status.chainId,
      records: records.map((r) => ({
        id: r.id,
        queryHash: r.queryHash,
        resultHash: r.resultHash,
        ipfsCID: r.ipfsCID,
        timestamp: r.timestamp,
        recordedAt: new Date(r.timestamp * 1000).toISOString(),
        submitter: r.submitter,
      })),
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
