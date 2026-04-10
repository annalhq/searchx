/**
 * index.js — Express server entry point for SearchX Node.js backend.
 *
 * Endpoints:
 *   GET  /api/search?q=<query>   — Proxy to SearXNG
 *   POST /api/archive            — Hash + IPFS + Blockchain
 *   GET  /api/verify/:proofId    — Verify a proof against on-chain data
 *   GET  /api/status             — Service health + blockchain status
 */

const express = require("express");
const cors = require("cors");
const config = require("./config");
const { initIPFS } = require("./services/ipfs");
const { initBlockchain, getSearchCount, getStatus } = require("./services/blockchain");

// Routes
const searchRouter = require("./routes/search");
const archiveRouter = require("./routes/archive");
const verifyRouter = require("./routes/verify");
const recordsRouter = require("./routes/records");

const app = express();

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "10mb" }));

// ── Routes ───────────────────────────────────────────────────────────────────
app.use("/api/search", searchRouter);
app.use("/api/archive", archiveRouter);
app.use("/api/verify", verifyRouter);
app.use("/api/records", recordsRouter);

// Status / health endpoint
app.get("/api/status", async (req, res) => {
  const blockchain = getStatus();
  let searchCount = 0;
  try {
    searchCount = await getSearchCount();
  } catch { /* ignore */ }

  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    blockchain: {
      ...blockchain,
      totalRecords: searchCount,
    },
    searxng: config.SEARXNG_URL,
    ipfs: config.IPFS_API_URL,
  });
});

// ── Start ────────────────────────────────────────────────────────────────────
async function start() {
  console.log("\n╔══════════════════════════════════════════╗");
  console.log("║       SearchX Node.js Backend            ║");
  console.log("╚══════════════════════════════════════════╝\n");

  // Initialize services
  await initIPFS();
  await initBlockchain();

  app.listen(config.PORT, () => {
    console.log(`\n🚀 Server running on http://localhost:${config.PORT}`);
    console.log(`   Search:  GET  http://localhost:${config.PORT}/api/search?q=test`);
    console.log(`   Archive: POST http://localhost:${config.PORT}/api/archive`);
    console.log(`   Verify:  GET  http://localhost:${config.PORT}/api/verify/0`);
    console.log(`   Status:  GET  http://localhost:${config.PORT}/api/status\n`);
  });
}

start().catch((err) => {
  console.error("❌ Failed to start server:", err);
  process.exit(1);
});
