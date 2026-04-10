/**
 * blockchain.js — Ethereum (Hardhat) interaction service.
 *
 * Connects to the local Hardhat node via ethers.js to:
 *   - Store search records (storeSearch)
 *   - Retrieve records for verification (getSearch)
 */

const { ethers } = require("ethers");
const config = require("../config");

let provider = null;
let signer = null;
let contract = null;
let isConnected = false;

/**
 * Initialise the blockchain connection and contract instance.
 */
async function initBlockchain() {
  if (!config.CONTRACT_ADDRESS || !config.PRIVATE_KEY) {
    console.warn("⚠️  Blockchain env vars missing — blockchain anchoring disabled.");
    return;
  }

  if (!config.CONTRACT_ABI || config.CONTRACT_ABI.length === 0) {
    console.warn("⚠️  Contract ABI not found — blockchain anchoring disabled.");
    return;
  }

  try {
    provider = new ethers.JsonRpcProvider(config.RPC_URL);
    signer = new ethers.Wallet(config.PRIVATE_KEY, provider);
    contract = new ethers.Contract(config.CONTRACT_ADDRESS, config.CONTRACT_ABI, signer);

    // Quick health check
    const network = await provider.getNetwork();
    const balance = await provider.getBalance(signer.address);
    console.log(`✅ Blockchain connected:`);
    console.log(`   Network: ${network.name} (chainId: ${network.chainId})`);
    console.log(`   Signer:  ${signer.address}`);
    console.log(`   Balance: ${ethers.formatEther(balance)} ETH`);
    console.log(`   Contract: ${config.CONTRACT_ADDRESS}`);
    isConnected = true;
  } catch (err) {
    console.warn(`⚠️  Blockchain connection failed: ${err.message}`);
    isConnected = false;
  }
}

/**
 * Store a search record on-chain.
 * @param {string} queryHash   - 0x-prefixed bytes32 query hash
 * @param {string} resultHash  - 0x-prefixed bytes32 Merkle root
 * @param {string} ipfsCID     - IPFS CID string
 * @returns {Promise<{ proofId: number, txHash: string, timestamp: number } | null>}
 */
async function storeSearch(queryHash, resultHash, ipfsCID) {
  if (!isConnected || !contract) {
    console.warn("Blockchain not connected — skipping storeSearch.");

    // Return a mock proof for development
    return {
      proofId: Date.now() % 10000,
      txHash: "0x" + "0".repeat(64),
      timestamp: Math.floor(Date.now() / 1000),
      mock: true,
    };
  }

  try {
    console.log(`⛓️  Storing on-chain: queryHash=${queryHash.substring(0, 10)}... resultHash=${resultHash.substring(0, 10)}...`);

    const tx = await contract.storeSearch(queryHash, resultHash, ipfsCID);
    const receipt = await tx.wait();

    // Parse the SearchStored event to get the proof ID
    let proofId = null;
    for (const log of receipt.logs) {
      try {
        const parsed = contract.interface.parseLog({
          topics: log.topics,
          data: log.data,
        });
        if (parsed && parsed.name === "SearchStored") {
          proofId = Number(parsed.args.id);
          break;
        }
      } catch {
        // Not our event, skip
      }
    }

    console.log(`✅ On-chain stored: proofId=${proofId}, tx=${receipt.hash}`);

    return {
      proofId,
      txHash: receipt.hash,
      timestamp: Math.floor(Date.now() / 1000),
      mock: false,
    };
  } catch (err) {
    console.error("Blockchain storeSearch failed:", err.message);
    throw new Error(`Blockchain anchoring failed: ${err.message}`);
  }
}

/**
 * Retrieve a search record from the blockchain.
 * @param {number} proofId - The record ID
 * @returns {Promise<{ queryHash: string, resultHash: string, ipfsCID: string, timestamp: number, submitter: string } | null>}
 */
async function getSearch(proofId) {
  if (!isConnected || !contract) {
    console.warn("Blockchain not connected — cannot retrieve record.");
    return null;
  }

  try {
    const result = await contract.getSearch(proofId);

    return {
      queryHash: result.queryHash,
      resultHash: result.resultHash,
      ipfsCID: result.ipfsCID,
      timestamp: Number(result.timestamp),
      submitter: result.submitter,
    };
  } catch (err) {
    console.error(`getSearch(${proofId}) failed:`, err.message);
    return null;
  }
}

/**
 * Get total number of records stored on-chain.
 * @returns {Promise<number>}
 */
async function getSearchCount() {
  if (!isConnected || !contract) return 0;
  try {
    return Number(await contract.searchCount());
  } catch {
    return 0;
  }
}

/**
 * Check blockchain connection status.
 */
function getStatus() {
  return {
    connected: isConnected,
    contractAddress: config.CONTRACT_ADDRESS,
    rpcUrl: config.RPC_URL,
  };
}

module.exports = { initBlockchain, storeSearch, getSearch, getSearchCount, getStatus };
