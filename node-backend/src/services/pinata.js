/**
 * pinata.js — Pinata cloud IPFS storage service.
 *
 * Uploads a local folder as a pinned IPFS folder to Pinata.
 */

const fs      = require("fs");
const path    = require("path");
const axios   = require("axios");
const FormData = require("form-data");
const config  = require("../config");

const PINATA_API     = "https://api.pinata.cloud";
const PINATA_GATEWAY = "https://gateway.pinata.cloud";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Recursively collect every file in a directory. */
function getAllFiles(dir, baseDir = dir, acc = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      getAllFiles(full, baseDir, acc);
    } else {
      acc.push({
        fullPath:     full,
        relativePath: path.relative(baseDir, full).replace(/\\/g, "/"),
      });
    }
  }
  return acc;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Upload a local folder to Pinata as a pinned IPFS folder (CIDv1).
 *
 * @param {string} folderPath   Absolute path to the local folder
 * @param {string} [folderName] Display name used for the pin and path prefix
 * @returns {Promise<{cid:string, gatewayUrl:string, indexUrl:string}|null>}
 */
async function uploadFolderToPinata(folderPath, folderName = "mirror-backup") {
  if (!config.PINATA_JWT) {
    console.warn("PINATA_JWT not set — skipping Pinata upload.");
    console.warn("Add PINATA_JWT=<your_jwt> to node-backend/.env");
    return null;
  }

  if (!fs.existsSync(folderPath)) {
    console.warn(`Pinata: folder not found — ${folderPath}`);
    return null;
  }

  const files = getAllFiles(folderPath);
  if (files.length === 0) {
    console.warn("Pinata: folder is empty, skipping upload");
    return null;
  }

  console.log(`  Uploading ${files.length} file(s) to Pinata as "${folderName}"…`);

  const form = new FormData();

  for (const file of files) {
    form.append("file", fs.createReadStream(file.fullPath), {
      filepath:    `${folderName}/${file.relativePath}`,
      knownLength: fs.statSync(file.fullPath).size,
    });
  }

  form.append("pinataOptions",  JSON.stringify({ cidVersion: 1 }));
  form.append("pinataMetadata", JSON.stringify({
    name:      folderName,
    keyvalues: {
      source:    "searchx-mirror-backup",
      timestamp: new Date().toISOString(),
    },
  }));

  try {
    const resp = await axios.post(
      `${PINATA_API}/pinning/pinFileToIPFS`,
      form,
      {
        headers: {
          ...form.getHeaders(),
          Authorization: `Bearer ${config.PINATA_JWT}`,
        },
        maxContentLength: Infinity,
        maxBodyLength:    Infinity,
        timeout:          180_000,
      }
    );

    const cid        = resp.data.IpfsHash;
    const gatewayUrl = `${PINATA_GATEWAY}/ipfs/${cid}`;
    const indexUrl   = `${gatewayUrl}/`;

    console.log(`   ✅ Pinata upload complete: ${cid}`);
    console.log(`      Browse: ${indexUrl}`);

    return { cid, gatewayUrl, indexUrl };
  } catch (err) {
    if (err.response?.status === 401) {
      console.error("❌ Pinata 401 — invalid or expired PINATA_JWT in .env");
    } else if (err.response?.status === 400) {
      console.error("❌ Pinata 400 — bad request:", err.response?.data);
    } else {
      console.error(`❌ Pinata upload failed: ${err.message}`);
    }
    return null;
  }
}

/**
 * Quick auth check against Pinata.
 * @returns {Promise<boolean>}
 */
async function testPinataConnection() {
  if (!config.PINATA_JWT) return false;
  try {
    const r = await axios.get(`${PINATA_API}/data/testAuthentication`, {
      headers: { Authorization: `Bearer ${config.PINATA_JWT}` },
      timeout: 8000,
    });
    return r.status === 200;
  } catch {
    return false;
  }
}

module.exports = { uploadFolderToPinata, testPinataConnection, PINATA_GATEWAY, PINATA_API };
