/**
 * config.js — Centralised environment configuration for the SearchX backend.
 */

require("dotenv").config();
const path = require("path");
const fs = require("fs");

// Try to auto-load contract address from blockchain deployment.json
let contractAddress = process.env.CONTRACT_ADDRESS || "";
const deploymentPath = path.join(__dirname, "..", "..", "blockchain", "deployment.json");
if (!contractAddress && fs.existsSync(deploymentPath)) {
  try {
    const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
    contractAddress = deployment.address;
    console.log(`📄 Auto-loaded contract address from deployment.json: ${contractAddress}`);
  } catch (e) {
    console.warn("⚠️  Could not read deployment.json:", e.message);
  }
}

// Load ABI from blockchain artifacts
let contractABI = [];
const abiPath = path.join(__dirname, "..", "..", "blockchain", "SearchVerifier.abi.json");
const artifactPath = path.join(
  __dirname, "..", "..", "blockchain",
  "artifacts", "contracts", "SearchVerifier.sol", "SearchVerifier.json"
);

if (fs.existsSync(abiPath)) {
  contractABI = JSON.parse(fs.readFileSync(abiPath, "utf8"));
} else if (fs.existsSync(artifactPath)) {
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
  contractABI = artifact.abi;
} else {
  console.warn("⚠️  No ABI file found — blockchain features will be disabled.");
}

module.exports = {
  PORT: parseInt(process.env.PORT || "3001", 10),
  SEARXNG_URL: process.env.SEARXNG_URL || "http://localhost:8080",
  RPC_URL: process.env.RPC_URL || "http://127.0.0.1:8545",
  PRIVATE_KEY: process.env.PRIVATE_KEY || "",
  CONTRACT_ADDRESS: contractAddress,
  CONTRACT_ABI: contractABI,
  IPFS_API_URL: process.env.IPFS_API_URL || "http://127.0.0.1:5001",
};
