/**
 * ipfs.js — Local content-addressable storage service.
 *
 * Simulates IPFS by storing content as JSON files keyed by their
 * SHA-256 hash (acting as a CID). This avoids requiring an external
 * IPFS daemon for local development while preserving the same
 * content-addressable semantics.
 *
 * Files are stored in: node-backend/data/ipfs/{hash}.json
 */

const fs = require("fs");
const path = require("path");
const { sha256 } = require("./hasher");

const STORAGE_DIR = path.join(__dirname, "..", "..", "data", "ipfs");

/**
 * Initialise the local storage directory.
 */
async function initIPFS() {
  try {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
    const files = fs.readdirSync(STORAGE_DIR).filter((f) => f.endsWith(".json"));
    console.log(`✅ Local content store ready: ${STORAGE_DIR}`);
    console.log(`   ${files.length} existing archive(s) found`);
  } catch (err) {
    console.error(`❌ Failed to initialise local content store: ${err.message}`);
    throw err;
  }
}

/**
 * Upload content to local storage and return a deterministic CID.
 *
 * The CID is the SHA-256 hash of the JSON-serialised content,
 * prefixed with "Qm" to visually resemble an IPFS CID.
 *
 * @param {object} content - JSON-serialisable content to store
 * @returns {Promise<string>} Content identifier (CID)
 */
async function uploadToIPFS(content) {
  const jsonStr = JSON.stringify(content, null, 2);
  const hash = sha256(jsonStr);
  const cid = `Qm${hash.substring(0, 44)}`;

  const filePath = path.join(STORAGE_DIR, `${cid}.json`);

  try {
    fs.writeFileSync(filePath, jsonStr, "utf8");
    console.log(`📌 Local store: ${cid} (${jsonStr.length} bytes)`);
    return cid;
  } catch (err) {
    console.error(`❌ Local store write failed: ${err.message}`);
    throw new Error(`Content storage failed: ${err.message}`);
  }
}

/**
 * Retrieve content from local storage by CID.
 * @param {string} cid - Content identifier
 * @returns {Promise<object|null>} Parsed JSON content, or null on failure
 */
async function getFromIPFS(cid) {
  const filePath = path.join(STORAGE_DIR, `${cid}.json`);

  try {
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️  Content not found for CID: ${cid}`);
      return null;
    }

    const data = fs.readFileSync(filePath, "utf8");
    return JSON.parse(data);
  } catch (err) {
    console.error(`❌ Content retrieval failed for ${cid}: ${err.message}`);
    return null;
  }
}

/**
 * List all stored CIDs.
 * @returns {string[]} Array of CID strings
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

module.exports = { initIPFS, uploadToIPFS, getFromIPFS, listAllCIDs };
