// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title SearchVerifier
 * @dev Immutable registry for blockchain-anchored search verification.
 *      Stores query hashes, Merkle roots of result hashes, and IPFS CIDs
 *      so that search results can be independently verified even after
 *      the original websites are deleted.
 */
contract SearchVerifier {
    struct SearchRecord {
        bytes32 queryHash;      // SHA-256 of the search query
        bytes32 resultHash;     // Merkle root of all result content hashes
        string  ipfsCID;        // IPFS Content Identifier for archived content
        uint256 timestamp;      // Block timestamp at storage time
        address submitter;      // Address that submitted this record
    }

    // Sequential ID → SearchRecord
    mapping(uint256 => SearchRecord) public searches;
    uint256 public searchCount;

    event SearchStored(
        uint256 indexed id,
        bytes32 queryHash,
        bytes32 resultHash,
        string  ipfsCID
    );

    /**
     * @dev Store a new search verification record on-chain.
     * @param queryHash   SHA-256 hash of the original search query.
     * @param resultHash  Merkle root of hashed search result contents.
     * @param ipfsCID     IPFS CID where the full content archive is stored.
     * @return id         The sequential record ID assigned to this entry.
     */
    function storeSearch(
        bytes32 queryHash,
        bytes32 resultHash,
        string calldata ipfsCID
    ) external returns (uint256) {
        uint256 id = searchCount;

        searches[id] = SearchRecord({
            queryHash:  queryHash,
            resultHash: resultHash,
            ipfsCID:    ipfsCID,
            timestamp:  block.timestamp,
            submitter:  msg.sender
        });

        searchCount++;

        emit SearchStored(id, queryHash, resultHash, ipfsCID);

        return id;
    }

    /**
     * @dev Retrieve a stored search record by its ID.
     * @param id  The record ID to look up.
     */
    function getSearch(uint256 id)
        external
        view
        returns (
            bytes32 queryHash,
            bytes32 resultHash,
            string memory ipfsCID,
            uint256 timestamp,
            address submitter
        )
    {
        SearchRecord storage r = searches[id];
        return (
            r.queryHash,
            r.resultHash,
            r.ipfsCID,
            r.timestamp,
            r.submitter
        );
    }
}
