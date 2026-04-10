/**
 * blockchain.js — Ethereum (Hardhat) interaction service.
 *
 * Connects to the local Hardhat node via ethers.js to:
 *   - Store search records (storeSearch)
 *   - Retrieve records for verification (getSearch)
 *   - List all records for the block explorer view
 *
 * On startup, if the contract is not reachable (e.g. Hardhat node was
 * restarted), the service will attempt to auto-deploy the contract.
 */

const { ethers } = require("ethers");
const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");
const config = require("../config");

let provider = null;
let signer = null;
let contract = null;
let isConnected = false;
let contractAddress = "";

// Path to the blockchain dir (for auto-deploy)
const BLOCKCHAIN_DIR = path.join(__dirname, "..", "..", "..", "blockchain");
const DEPLOYMENT_JSON = path.join(BLOCKCHAIN_DIR, "deployment.json");
const ABI_JSON = path.join(BLOCKCHAIN_DIR, "SearchVerifier.abi.json");

/**
 * Read the current contract ABI from disk.
 */
function loadABI() {
  if (fs.existsSync(ABI_JSON)) {
    return JSON.parse(fs.readFileSync(ABI_JSON, "utf8"));
  }
  const artifactPath = path.join(
    BLOCKCHAIN_DIR,
    "artifacts", "contracts", "SearchVerifier.sol", "SearchVerifier.json"
  );
  if (fs.existsSync(artifactPath)) {
    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
    return artifact.abi;
  }
  return null;
}

/**
 * Read the deployed address from deployment.json.
 */
function loadDeployedAddress() {
  if (fs.existsSync(DEPLOYMENT_JSON)) {
    try {
      const info = JSON.parse(fs.readFileSync(DEPLOYMENT_JSON, "utf8"));
      return info.address || "";
    } catch {
      return "";
    }
  }
  return "";
}

/**
 * Auto-deploy the contract to the running Hardhat node.
 * This is called when the contract address is stale or missing.
 */
function autoDeploy() {
  console.log("🔄 Auto-deploying SearchVerifier contract to local Hardhat node...");
  try {
    const result = execSync(
      "npx hardhat run scripts/deploy.js --network localhost",
      {
        cwd: BLOCKCHAIN_DIR,
        timeout: 30000,
        stdio: ["pipe", "pipe", "pipe"],
        encoding: "utf8",
      }
    );
    console.log(result);

    // Re-read the newly deployed address
    const newAddress = loadDeployedAddress();
    if (!newAddress) {
      throw new Error("Deploy succeeded but deployment.json has no address");
    }
    console.log(`✅ Auto-deployed to: ${newAddress}`);
    return newAddress;
  } catch (err) {
    console.error(`❌ Auto-deploy failed: ${err.message}`);
    throw new Error(`Auto-deploy failed: ${err.message}`);
  }
}

/**
 * Check if a contract exists at the given address on the node.
 */
async function contractExistsOnChain(addr) {
  try {
    const code = await provider.getCode(addr);
    // "0x" means no contract deployed at that address
    return code !== "0x";
  } catch {
    return false;
  }
}

/**
 * Initialise the blockchain connection and contract instance.
 * Will auto-deploy if the contract is not found on-chain.
 */
async function initBlockchain() {
  const privateKey = config.PRIVATE_KEY;
  if (!privateKey) {
    console.warn("⚠️  PRIVATE_KEY not set — blockchain anchoring disabled.");
    return;
  }

  try {
    provider = new ethers.JsonRpcProvider(config.RPC_URL);

    // Quick connectivity check — will throw if node is not running
    await provider.getNetwork();

    signer = new ethers.Wallet(privateKey, provider);

    // Load ABI
    const abi = loadABI();
    if (!abi || abi.length === 0) {
      console.warn("⚠️  No contract ABI found. Run 'npx hardhat compile' first.");
      return;
    }

    // Load or detect contract address
    contractAddress = config.CONTRACT_ADDRESS || loadDeployedAddress();

    // Check if contract actually exists on-chain
    if (contractAddress) {
      const exists = await contractExistsOnChain(contractAddress);
      if (!exists) {
        console.warn(`⚠️  Contract at ${contractAddress} not found on-chain (Hardhat node was likely restarted).`);
        contractAddress = "";
      }
    }

    // Auto-deploy if no valid contract found
    if (!contractAddress) {
      contractAddress = autoDeploy();
    }

    // Create contract instance
    contract = new ethers.Contract(contractAddress, abi, signer);

    // Validate by calling a read function
    const count = await contract.searchCount();

    const network = await provider.getNetwork();
    const balance = await provider.getBalance(signer.address);
    console.log(`✅ Blockchain connected:`);
    console.log(`   Network:  ${network.name} (chainId: ${network.chainId})`);
    console.log(`   Signer:   ${signer.address}`);
    console.log(`   Balance:  ${ethers.formatEther(balance)} ETH`);
    console.log(`   Contract: ${contractAddress}`);
    console.log(`   Records:  ${Number(count)}`);
    isConnected = true;
  } catch (err) {
    console.error(`❌ Blockchain initialisation failed: ${err.message}`);
    console.error(`   Make sure 'npx hardhat node' is running at ${config.RPC_URL}`);
    isConnected = false;
  }
}

/**
 * Store a search record on-chain.
 * @param {string} queryHash   - 0x-prefixed bytes32 query hash
 * @param {string} resultHash  - 0x-prefixed bytes32 Merkle root
 * @param {string} ipfsCID     - CID string for the archived content
 * @returns {Promise<{ proofId: number, txHash: string, blockNumber: number, timestamp: number }>}
 */
async function storeSearch(queryHash, resultHash, ipfsCID) {
  if (!isConnected || !contract) {
    throw new Error(
      "Blockchain not connected. Ensure Hardhat node is running and contract is deployed."
    );
  }

  try {
    console.log(`⛓️  Storing on-chain: queryHash=${queryHash.substring(0, 14)}... resultHash=${resultHash.substring(0, 14)}...`);

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

    console.log(`✅ On-chain stored: proofId=${proofId}, tx=${receipt.hash}, block=${receipt.blockNumber}`);

    return {
      proofId,
      txHash: receipt.hash,
      blockNumber: Number(receipt.blockNumber),
      gasUsed: receipt.gasUsed.toString(),
      timestamp: Math.floor(Date.now() / 1000),
    };
  } catch (err) {
    console.error("❌ Blockchain storeSearch failed:", err.message);
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
    throw new Error("Blockchain not connected.");
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
 * Get all records from the blockchain for the explorer view.
 * @returns {Promise<Array>}
 */
async function getAllRecords() {
  if (!isConnected || !contract) return [];

  const count = await getSearchCount();
  const records = [];

  for (let i = 0; i < count; i++) {
    try {
      const r = await contract.getSearch(i);
      records.push({
        id: i,
        queryHash: r.queryHash,
        resultHash: r.resultHash,
        ipfsCID: r.ipfsCID,
        timestamp: Number(r.timestamp),
        submitter: r.submitter,
      });
    } catch (err) {
      console.warn(`⚠️  Could not read record ${i}: ${err.message}`);
    }
  }

  return records;
}

/**
 * Check blockchain connection status.
 */
function getStatus() {
  return {
    connected: isConnected,
    contractAddress: contractAddress,
    rpcUrl: config.RPC_URL,
    chainId: 31337,
  };
}

module.exports = {
  initBlockchain,
  storeSearch,
  getSearch,
  getSearchCount,
  getAllRecords,
  getStatus,
};
