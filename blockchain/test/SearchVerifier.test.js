const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SearchVerifier", function () {
  let contract;
  let owner;

  beforeEach(async function () {
    [owner] = await ethers.getSigners();
    const SearchVerifier = await ethers.getContractFactory("SearchVerifier");
    contract = await SearchVerifier.deploy();
    await contract.waitForDeployment();
  });

  describe("storeSearch", function () {
    it("should store a search record and return id 0 for the first entry", async function () {
      const queryHash = ethers.keccak256(ethers.toUtf8Bytes("hello world"));
      const resultHash = ethers.keccak256(ethers.toUtf8Bytes("merkle-root"));
      const ipfsCID = "QmTest123456789abcdef";

      const tx = await contract.storeSearch(queryHash, resultHash, ipfsCID);
      const receipt = await tx.wait();

      // Check event
      const event = receipt.logs[0];
      expect(event).to.not.be.undefined;

      // Check searchCount incremented
      expect(await contract.searchCount()).to.equal(1n);
    });

    it("should store multiple records with incrementing IDs", async function () {
      const q1 = ethers.keccak256(ethers.toUtf8Bytes("query1"));
      const r1 = ethers.keccak256(ethers.toUtf8Bytes("result1"));
      const q2 = ethers.keccak256(ethers.toUtf8Bytes("query2"));
      const r2 = ethers.keccak256(ethers.toUtf8Bytes("result2"));

      await contract.storeSearch(q1, r1, "QmCID1");
      await contract.storeSearch(q2, r2, "QmCID2");

      expect(await contract.searchCount()).to.equal(2n);
    });

    it("should emit SearchStored event with correct parameters", async function () {
      const queryHash = ethers.keccak256(ethers.toUtf8Bytes("test query"));
      const resultHash = ethers.keccak256(ethers.toUtf8Bytes("merkle root"));
      const ipfsCID = "QmTestCIDHere";

      await expect(contract.storeSearch(queryHash, resultHash, ipfsCID))
        .to.emit(contract, "SearchStored")
        .withArgs(0n, queryHash, resultHash, ipfsCID);
    });
  });

  describe("getSearch", function () {
    it("should retrieve a stored record correctly", async function () {
      const queryHash = ethers.keccak256(ethers.toUtf8Bytes("retrieve test"));
      const resultHash = ethers.keccak256(ethers.toUtf8Bytes("retrieve merkle"));
      const ipfsCID = "QmRetrieveTest";

      await contract.storeSearch(queryHash, resultHash, ipfsCID);

      const result = await contract.getSearch(0);
      expect(result.queryHash).to.equal(queryHash);
      expect(result.resultHash).to.equal(resultHash);
      expect(result.ipfsCID).to.equal(ipfsCID);
      expect(result.timestamp).to.be.greaterThan(0n);
      expect(result.submitter).to.equal(owner.address);
    });

    it("should return zero values for non-existent record", async function () {
      const result = await contract.getSearch(999);
      expect(result.queryHash).to.equal(ethers.ZeroHash);
      expect(result.resultHash).to.equal(ethers.ZeroHash);
      expect(result.ipfsCID).to.equal("");
    });
  });
});
