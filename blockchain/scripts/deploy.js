const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Deploying SearchVerifier contract...\n");

  const SearchVerifier = await hre.ethers.getContractFactory("SearchVerifier");
  const contract = await SearchVerifier.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log(`✅ SearchVerifier deployed to: ${address}`);
  console.log(`   Network: ${hre.network.name}`);

  // Write the deployed address to a shared config file
  // so the Node.js backend can pick it up automatically
  const deploymentInfo = {
    address: address,
    network: hre.network.name,
    deployedAt: new Date().toISOString(),
  };

  const outPath = path.join(__dirname, "..", "deployment.json");
  fs.writeFileSync(outPath, JSON.stringify(deploymentInfo, null, 2));
  console.log(`📄 Deployment info written to: ${outPath}\n`);

  // Also copy the ABI for the backend
  const artifactPath = path.join(
    __dirname,
    "..",
    "artifacts",
    "contracts",
    "SearchVerifier.sol",
    "SearchVerifier.json"
  );
  
  if (fs.existsSync(artifactPath)) {
    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
    const abiOutPath = path.join(__dirname, "..", "SearchVerifier.abi.json");
    fs.writeFileSync(abiOutPath, JSON.stringify(artifact.abi, null, 2));
    console.log(`📄 ABI written to: ${abiOutPath}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
