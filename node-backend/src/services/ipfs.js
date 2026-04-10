/**
 * ipfs.js — IPFS content storage service.
 *
 * Uploads content to a local IPFS node and returns the CID.
 * Falls back to a mock CID if IPFS is unavailable (for development).
 */

const config = require("../config");
const { sha256 } = require("./hasher");

let ipfsClient = null;
let ipfsAvailable = false;

/**
 * Initialise the IPFS client connection.
 * Uses dynamic import since ipfs-http-client is ESM-only in v60+.
 */
async function initIPFS() {
  try {
    // ipfs-http-client v60+ is ESM
    const { create } = await import("ipfs-http-client");
    ipfsClient = create({ url: config.IPFS_API_URL });

    // Quick connectivity check
    const id = await ipfsClient.id();
    ipfsAvailable = true;
    console.log(`✅ IPFS connected: ${id.id}`);
  } catch (err) {
    console.warn(`⚠️  IPFS not available (${err.message}) — using mock CIDs for development.`);
    ipfsAvailable = false;
  }
}

/**
 * Upload content to IPFS and return the CID.
 * If IPFS is not available, returns a deterministic mock CID.
 *
 * @param {object} content - JSON-serialisable content to upload
 * @returns {Promise<string>} IPFS CID string
 */
async function uploadToIPFS(content) {
  const jsonStr = JSON.stringify(content, null, 2);

  if (ipfsAvailable && ipfsClient) {
    try {
      const result = await ipfsClient.add(jsonStr);
      console.log(`📌 IPFS uploaded: ${result.path} (${jsonStr.length} bytes)`);
      return result.path;
    } catch (err) {
      console.error("IPFS upload failed:", err.message);
      // Fall through to mock
    }
  }

  // Mock CID for development (deterministic based on content hash)
  const hash = sha256(jsonStr);
  const mockCID = `Qm${hash.substring(0, 44)}`;
  console.log(`🧪 Mock IPFS CID: ${mockCID} (${jsonStr.length} bytes)`);
  return mockCID;
}

/**
 * Retrieve content from IPFS by CID.
 * @param {string} cid - IPFS Content Identifier
 * @returns {Promise<object|null>} Parsed JSON content, or null on failure
 */
async function getFromIPFS(cid) {
  if (!ipfsAvailable || !ipfsClient) {
    console.warn("IPFS not available — cannot retrieve content for CID:", cid);
    return null;
  }

  try {
    const chunks = [];
    for await (const chunk of ipfsClient.cat(cid)) {
      chunks.push(chunk);
    }
    const data = Buffer.concat(chunks).toString("utf8");
    return JSON.parse(data);
  } catch (err) {
    console.error(`IPFS retrieval failed for ${cid}:`, err.message);
    return null;
  }
}

module.exports = { initIPFS, uploadToIPFS, getFromIPFS };
