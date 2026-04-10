/**
 * search.js — Search route.
 *
 * GET /api/search?q=<query>&page=<n>&category=<cat>
 * Proxies to SearXNG and returns results.
 */

const express = require("express");
const { search } = require("../services/searxng");

const router = express.Router();

router.get("/", async (req, res) => {
  const { q, page = "1", category = "" } = req.query;

  if (!q || !q.trim()) {
    return res.status(400).json({ error: "Query parameter 'q' is required." });
  }

  try {
    const data = await search(q.trim(), parseInt(page, 10), category);
    return res.json(data);
  } catch (err) {
    console.error("Search error:", err.message);
    return res.status(502).json({ error: err.message });
  }
});

module.exports = router;
