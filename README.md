# SearchX

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js_16-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)
![Solidity](https://img.shields.io/badge/Solidity_0.8-363636?style=for-the-badge&logo=solidity&logoColor=white)
![Hardhat](https://img.shields.io/badge/Hardhat-FFF100?style=for-the-badge&logo=hardhat&logoColor=black)
![Rust](https://img.shields.io/badge/Rust-000000?style=for-the-badge&logo=rust&logoColor=white)
![IPFS](https://img.shields.io/badge/IPFS-65C2CB?style=for-the-badge&logo=ipfs&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![SearXNG](https://img.shields.io/badge/SearXNG-4A90E2?style=for-the-badge)

</div>

## Overview

SearchX is a verifiable search system that anchors search queries and click interactions to an immutable ledger. Each search result set is SHA-256 hashed, structured into a Merkle tree, pinned to IPFS, and recorded on-chain via a Solidity smart contract. A private Rust-based chain (3-node cluster) independently validates and stores block submissions with peer-to-peer propagation. The frontend proxies queries through SearXNG for privacy-preserving, multi-engine search aggregation.

## Tech Stack

- **Frontend** -- Next.js 16, React 19, Tailwind CSS 4, DaisyUI 5, TypeScript
- **Backend** -- Node.js, Express, ethers.js 6, merkletreejs, axios
- **Search Engine** -- SearXNG (Dockerized, JSON API)
- **Smart Contract** -- Solidity 0.8.24, Hardhat (local network)
- **Private Chain** -- Rust (Axum, Tokio, SHA-2), 3-node Docker cluster
- **Storage** -- IPFS (local daemon, HTTP API)
- **Orchestration** -- Docker Compose

## How It Works

1. User submits a query through the Next.js frontend.
2. The frontend proxies the request to SearXNG via server-side rewrite, aggregating results from Google, DuckDuckGo, and Wikipedia.
3. When a result is archived, the Node.js backend computes a SHA-256 hash of the payload and builds a Merkle tree over the result set.
4. The content snapshot is pinned to IPFS; the CID, Merkle root, and data hash are submitted to the `SearchX` smart contract on-chain.
5. The same block is submitted to the private Rust chain cluster, where each node independently re-hashes the payload to verify integrity before appending to its local ledger.
6. Peer nodes propagate accepted blocks across the cluster.
7. Any record can be verified by re-deriving the hash and comparing it against both the on-chain record and the private chain state.

## Environment Variables

### Node.js Backend (`node-backend/.env`)

```env
SEARXNG_URL=http://localhost:8080
RPC_URL=http://127.0.0.1:8545
PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
CONTRACT_ADDRESS=
IPFS_API_URL=http://127.0.0.1:5001
PORT=3001
```

### Frontend (`frontend/.env.local`)

```env
SEARXNG_INTERNAL_URL=http://localhost:8080
```

## Setup & Run Commands

### SearXNG

```bash
docker compose up searxng -d
```

### Smart Contract

```bash
cd blockchain
npm install
npx hardhat node
npx hardhat run scripts/deploy.js --network localhost
```

Copy the deployed contract address into `node-backend/.env` as `CONTRACT_ADDRESS`.

### IPFS

```bash
ipfs daemon
```

### Node.js Backend

```bash
cd node-backend
cp .env.example .env
npm install
npm run dev
```

### Private Rust Chain

```bash
docker compose up rust-node-1 rust-node-2 rust-node-3 -d
```

### Frontend

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

## Smart Contract

`contracts/SearchX.sol` -- Deployed via Hardhat to a local Ethereum node.

| Function | Description |
|---|---|
| `storeHash(dataHash, blockType)` | Stores a SHA-256 hash with a type label (`search` or `click`). Returns the record ID. |
| `getRecord(recordId)` | Returns `dataHash`, `blockType`, `timestamp`, and `submitter` for a given record. |

### Hardhat Commands

```bash
npx hardhat compile
npx hardhat test
npx hardhat node
npx hardhat run scripts/deploy.js --network localhost
```

## Private Chain API

Each Rust node exposes the following endpoints (default ports: `9000`, `9001`, `9002`):

| Endpoint | Method | Description |
|---|---|---|
| `/health` | GET | Node status, chain height, head hash |
| `/chain` | GET | Full chain snapshot (all blocks) |
| `/verify` | POST | Validate a block submission without appending |
| `/blocks` | POST | Verify and append a block; propagate to peers |
| `/peers` | GET/POST | List or add peer nodes |

## Key Guarantees

- Every search and click event is SHA-256 hashed before leaving the backend.
- Merkle trees are constructed over result sets; only the root is stored on-chain.
- On-chain records are append-only and keyed by sequential ID.
- The private Rust chain independently re-derives hashes to reject tampered submissions.
- Block propagation across the 3-node cluster ensures no single point of failure.
- SearXNG proxying prevents direct user-to-engine contact, preserving query privacy.
- IPFS pinning produces content-addressed snapshots; the CID is stored alongside the on-chain hash for independent verification.