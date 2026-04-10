/**
 * merkle.js — Merkle tree construction for search result verification.
 *
 * Each leaf is the SHA-256 hash of a result's content (url + title + snippet + page HTML).
 * The Merkle root is stored on-chain as `resultHash` (bytes32).
 */

const { MerkleTree } = require("merkletreejs");
const crypto = require("crypto");

/**
 * Build a SHA-256 hash buffer from a string.
 * @param {string} data
 * @returns {Buffer}
 */
function sha256Buffer(data) {
  return crypto.createHash("sha256").update(data, "utf8").digest();
}

/**
 * Build a Merkle tree from an array of content strings.
 * @param {string[]} contents - Array of content strings (one per search result)
 * @returns {{ root: string, tree: MerkleTree, leaves: Buffer[] }}
 *   root  — 0x-prefixed bytes32 hex Merkle root
 *   tree  — MerkleTree instance (for generating proofs later)
 *   leaves — individual leaf hashes
 */
function buildMerkleTree(contents) {
  if (!contents || contents.length === 0) {
    // Single zero hash for empty set
    const zeroHash = "0x" + "0".repeat(64);
    return { root: zeroHash, tree: null, leaves: [] };
  }

  const leaves = contents.map((c) => sha256Buffer(c));
  
  const tree = new MerkleTree(leaves, sha256Buffer, {
    sortPairs: true,
    hashLeaves: false, // leaves are already hashed
  });

  const root = "0x" + tree.getRoot().toString("hex").padStart(64, "0");

  return { root, tree, leaves };
}

/**
 * Generate a Merkle proof for a specific leaf.
 * @param {MerkleTree} tree
 * @param {Buffer} leaf
 * @returns {string[]} Array of hex-encoded proof nodes
 */
function getProof(tree, leaf) {
  if (!tree) return [];
  return tree.getProof(leaf).map((p) => "0x" + p.data.toString("hex"));
}

/**
 * Verify a leaf against a Merkle root.
 * @param {MerkleTree} tree
 * @param {Buffer} leaf
 * @param {string} root - 0x-prefixed root hex
 * @returns {boolean}
 */
function verifyLeaf(tree, leaf, root) {
  if (!tree) return false;
  const proof = tree.getProof(leaf);
  return tree.verify(proof, leaf, root);
}

module.exports = { buildMerkleTree, getProof, verifyLeaf, sha256Buffer };
