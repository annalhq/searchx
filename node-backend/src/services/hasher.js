/**
 * hasher.js — SHA-256 hashing utilities for SearchX.
 *
 * All hashes are returned as hex strings (no 0x prefix) or
 * as bytes32 hex (with 0x prefix) for blockchain consumption.
 */

const crypto = require("crypto");

/**
 * Compute the SHA-256 hash of a UTF-8 string.
 * @param {string} data
 * @returns {string} Hex-encoded hash (no 0x prefix)
 */
function sha256(data) {
  return crypto.createHash("sha256").update(data, "utf8").digest("hex");
}

/**
 * Compute SHA-256 and return as 0x-prefixed bytes32 for Solidity.
 * @param {string} data
 * @returns {string} 0x-prefixed 64-char hex string
 */
function sha256Bytes32(data) {
  return "0x" + sha256(data);
}

/**
 * Hash any JSON-serialisable payload deterministically.
 * @param {any} payload
 * @returns {string} Hex-encoded hash (no 0x prefix)
 */
function hashPayload(payload) {
  const canonical = JSON.stringify(payload, Object.keys(payload).sort());
  return sha256(canonical);
}

/**
 * Hash content for use in Merkle tree leaves.
 * @param {string} content - Raw content string
 * @returns {Buffer} 32-byte hash buffer
 */
function hashLeaf(content) {
  return crypto.createHash("sha256").update(content, "utf8").digest();
}

module.exports = { sha256, sha256Bytes32, hashPayload, hashLeaf };
