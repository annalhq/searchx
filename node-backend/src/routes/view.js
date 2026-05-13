/**
 * view.js — Archive viewer route.
 *
 * GET /api/archive/content/:cid   — Returns raw metadata JSON for a given Master CID
 * GET /api/archive/html/:cid      — Serves archived HTML for local mode
 * GET /api/archive/screenshot/:cid — Serves archived screenshot PNG for local mode
 */

const express = require("express");
const path = require("path");
const fs = require("fs");
const { getFromIPFS, SCREENSHOTS_DIR, STORAGE_DIR } = require("../services/ipfs");

const router = express.Router();

// GET /api/archive/content/:cid — fetch master metadata JSON
router.get("/content/:cid", async (req, res) => {
  const { cid } = req.params;
  try {
    const data = await getFromIPFS(cid);
    if (!data) {
      return res.status(404).json({ error: "Archive not found for CID: " + cid });
    }
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/archive/html/:cid — serve raw archived HTML (local mode fallback)
router.get("/html/:cid", (req, res) => {
  const { cid } = req.params;
  // In local mode, HTML is stored as a .txt file
  const txtPath = path.join(STORAGE_DIR, `${cid}_html.txt`);
  if (fs.existsSync(txtPath)) {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.sendFile(txtPath);
  }
  // Also try .json (some old archives stored HTML inside JSON)
  const jsonPath = path.join(STORAGE_DIR, `${cid}.json`);
  if (fs.existsSync(jsonPath)) {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.sendFile(jsonPath);
  }
  return res.status(404).send("HTML archive not found");
});

// GET /api/archive/screenshot/:cid — serve PNG screenshot (local mode fallback)
router.get("/screenshot/:cid", (req, res) => {
  const { cid } = req.params;
  const pngPath = path.join(SCREENSHOTS_DIR, `${cid}.png`);
  if (fs.existsSync(pngPath)) {
    res.setHeader("Content-Type", "image/png");
    return res.sendFile(pngPath);
  }
  return res.status(404).send("Screenshot not found");
});

module.exports = router;
