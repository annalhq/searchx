// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title SearchX
 * @dev Immutable hash registry for search and click trail anchoring.
 * Deploy on Base Sepolia via Remix IDE.
 * Set the contract address in your .env as CONTRACT_ADDRESS.
 */
contract SearchX {
    struct HashRecord {
        string dataHash;
        string blockType; // "search" | "click"
        uint256 timestamp;
        address submitter;
    }

    // Internal ledger: sequential ID -> HashRecord
    mapping(uint256 => HashRecord) public records;
    uint256 public recordCount;

    event HashStored(
        uint256 indexed recordId,
        string dataHash,
        string blockType,
        address indexed submitter,
        uint256 timestamp
    );

    /**
     * @dev Store a SHA-256 hash from the backend.
     * @param dataHash The hex-encoded SHA-256 hash of the search/click payload.
     * @param blockType A label: "search" or "click".
     */
    function storeHash(string memory dataHash, string memory blockType) external returns (uint256) {
        uint256 recordId = recordCount;
        records[recordId] = HashRecord({
            dataHash: dataHash,
            blockType: blockType,
            timestamp: block.timestamp,
            submitter: msg.sender
        });
        recordCount++;

        emit HashStored(recordId, dataHash, blockType, msg.sender, block.timestamp);
        return recordId;
    }

    /**
     * @dev Retrieve a stored record by ID.
     */
    function getRecord(uint256 recordId)
        external
        view
        returns (
            string memory dataHash,
            string memory blockType,
            uint256 timestamp,
            address submitter
        )
    {
        HashRecord storage r = records[recordId];
        return (r.dataHash, r.blockType, r.timestamp, r.submitter);
    }
}
