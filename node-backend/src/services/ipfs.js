/**
 * ipfs.js — Content-addressable storage service.
 *
 * Supports two modes controlled by USE_REAL_IPFS env var:
 *
 * MODE 1 — Real IPFS (USE_REAL_IPFS=true):
 *   Connects to your local IPFS Desktop daemon via the HTTP API at
 *   IPFS_API_URL (default: http://127.0.0.1:5001).
 *   Files are pinned and accessible via the local gateway at
 *   IPFS_GATEWAY_URL (default: http://127.0.0.1:8081).
 *
 * MODE 2 — Local filesystem (USE_REAL_IPFS=false, default):
 *   Simulates IPFS by storing JSON files keyed by SHA-256 hash.
 *   Files are stored in: node-backend/data/ipfs/{cid}.json
 */

const fs = require("fs");
const path = require("path");
const axios = require("axios");
const FormData = require("form-data");
const { sha256 } = require("./hasher");
const config = require("../config");

const STORAGE_DIR = path.join(__dirname, "..", "..", "data", "ipfs");
const SCREENSHOTS_DIR = path.join(__dirname, "..", "..", "data", "screenshots");

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Ensure storage directories exist */
function ensureDirs() {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

// ── Real IPFS via HTTP API ────────────────────────────────────────────────────

/**
 * Upload a Buffer or string to IPFS daemon via /api/v0/add.
 * @param {Buffer|string} data
 * @param {string} filename
 * @returns {Promise<string>} CID
 */
async function addToIPFSDaemon(data, filename = "file") {
  const form = new FormData();
  const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data, "utf8");
  form.append("file", buffer, { filename });

  let resp;
  try {
    resp = await axios.post(
      `${config.IPFS_API_URL}/api/v0/add?pin=true`,
      form,
      {
        headers: {
          ...form.getHeaders(),
          // Suppress Origin so Kubo's CORS guard doesn't block Node.js requests.
          // Without this, some environments send Origin: null which Kubo rejects with 403.
          Origin: undefined,
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        timeout: 60000,
      }
    );
  } catch (err) {
    if (err.response?.status === 403) {
      throw new Error(
        `IPFS daemon returned 403 Forbidden. ` +
        `Fix: open IPFS Desktop → Settings → IPFS Config and ensure ` +
        `API.HTTPHeaders.Access-Control-Allow-Origin includes "*" or "http://localhost:3001", ` +
        `then restart IPFS Desktop. ` +
        `Or set USE_REAL_IPFS=false in node-backend/.env to use local storage instead.`
      );
    }
    throw err;
  }

  const cid = resp.data.Hash;
  console.log(`📌 IPFS add: ${filename} → ${cid}`);
  return cid;
}

// ── Local filesystem fallback ─────────────────────────────────────────────────

function localUpload(content, filename) {
  ensureDirs();
  const jsonStr =
    typeof content === "string" ? content : JSON.stringify(content, null, 2);
  const hash = sha256(jsonStr);
  const cid = `Qm${hash.substring(0, 44)}`;
  const filePath = path.join(STORAGE_DIR, `${cid}.json`);
  fs.writeFileSync(filePath, jsonStr, "utf8");
  console.log(`📌 Local store: ${cid} (${jsonStr.length} bytes)`);
  return cid;
}

function localGet(cid) {
  const filePath = path.join(STORAGE_DIR, `${cid}.json`);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Upload a JSON object to storage and return its CID.
 */
async function uploadToIPFS(content) {
  if (config.USE_REAL_IPFS) {
    const jsonStr = JSON.stringify(content, null, 2);
    return await addToIPFSDaemon(Buffer.from(jsonStr, "utf8"), "archive.json");
  }
  return localUpload(content);
}

/**
 * Upload raw text (e.g. full HTML) to storage and return its CID.
 */
async function uploadTextToIPFS(text, filename = "page.html") {
  if (config.USE_REAL_IPFS) {
    return await addToIPFSDaemon(Buffer.from(text, "utf8"), filename);
  }
  ensureDirs();
  const hash = sha256(text);
  const cid = `Qm${hash.substring(0, 44)}`;
  fs.writeFileSync(path.join(STORAGE_DIR, `${cid}_html.txt`), text, "utf8");
  return cid;
}

/**
 * Upload a base64-encoded PNG screenshot to storage and return its CID.
 */
async function uploadScreenshotToIPFS(base64png, url) {
  if (!base64png) return "";

  const buffer = Buffer.from(base64png, "base64");

  if (config.USE_REAL_IPFS) {
    return await addToIPFSDaemon(buffer, "screenshot.png");
  }

  // Local fallback — save to screenshots directory
  ensureDirs();
  const hash = sha256(base64png.substring(0, 1000));
  const cid = `Qmss${hash.substring(0, 40)}`;
  const filePath = path.join(SCREENSHOTS_DIR, `${cid}.png`);
  fs.writeFileSync(filePath, buffer);
  console.log(`📸 Screenshot saved locally: ${cid}.png`);
  return cid;
}

/**
 * Retrieve content from storage by CID.
 * @param {string} cid
 * @returns {Promise<object|null>}
 */
async function getFromIPFS(cid) {
  if (config.USE_REAL_IPFS) {
    try {
      const resp = await axios.post(
        `${config.IPFS_API_URL}/api/v0/cat?arg=${cid}`,
        null,
        {
          timeout: 30000,
          responseType: "text",
          headers: { Origin: undefined },
        }
      );
      return JSON.parse(resp.data);
    } catch (err) {
      if (err.response?.status === 403) {
        console.warn(
          `⚠️  IPFS cat 403 Forbidden for ${cid} — ` +
          `API access not configured. Set USE_REAL_IPFS=false to use local storage.`
        );
      } else {
        console.warn(`⚠️  IPFS cat failed for ${cid}: ${err.message}`);
      }
      return null;
    }
  }
  return localGet(cid);
}

/**
 * Get the public gateway URL for a CID.
 */
function getGatewayUrl(cid) {
  if (!cid) return "";
  if (config.USE_REAL_IPFS) {
    return `${config.IPFS_GATEWAY_URL}/ipfs/${cid}`;
  }
  // Point to our own backend endpoint
  return `/api/archive/content/${cid}`;
}

/**
 * Initialise storage directories.
 */
async function initIPFS() {
  ensureDirs();
  const files = fs.readdirSync(STORAGE_DIR).filter((f) => f.endsWith(".json"));
  if (config.USE_REAL_IPFS) {
    console.log(`✅ IPFS mode: Real IPFS Desktop at ${config.IPFS_API_URL}`);
    console.log(`   Gateway: ${config.IPFS_GATEWAY_URL}`);
    // Quick connectivity check
    try {
      await axios.post(
        `${config.IPFS_API_URL}/api/v0/id`,
        null,
        { timeout: 5000, headers: { Origin: undefined } }
      );
      console.log(`   ✅ IPFS daemon reachable and accepting requests`);
    } catch (e) {
      if (e.response?.status === 403) {
        console.warn(`   ❌ IPFS daemon returned 403 Forbidden!`);
        console.warn(`      The API CORS headers are not configured correctly.`);
        console.warn(`      Run this fix (requires IPFS Desktop restart after):`);
        console.warn(`        ipfs config --json API.HTTPHeaders.Access-Control-Allow-Origin '["*"]'`);
        console.warn(`        ipfs config --json API.HTTPHeaders.Access-Control-Allow-Methods '["PUT","POST","GET"]'`);
        console.warn(`      OR set USE_REAL_IPFS=false in .env to use local file storage instead.`);
      } else if (e.code === 'ECONNREFUSED') {
        console.warn(`   ⚠️  IPFS daemon not running — open IPFS Desktop or run: ipfs daemon`);
        console.warn(`      OR set USE_REAL_IPFS=false in .env to use local file storage instead.`);
      } else {
        console.warn(`   ⚠️  IPFS daemon not reachable: ${e.message}`);
      }
    }
  } else {
    console.log(`✅ Local content store ready: ${STORAGE_DIR}`);
    console.log(`   ${files.length} existing archive(s) found`);
  }
}

/**
 * List all stored CIDs (local mode only).
 */
function listAllCIDs() {
  try {
    return fs
      .readdirSync(STORAGE_DIR)
      .filter((f) => f.endsWith(".json"))
      .map((f) => f.replace(".json", ""));
  } catch {
    return [];
  }
}

module.exports = {
  initIPFS,
  uploadToIPFS,
  uploadTextToIPFS,
  uploadScreenshotToIPFS,
  getFromIPFS,
  getGatewayUrl,
  listAllCIDs,
  SCREENSHOTS_DIR,
  STORAGE_DIR,
};
