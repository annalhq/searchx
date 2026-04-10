# SearchX, Verifiable Search Trail

> **Search. Verify. Preserve.**  
> Cryptographically provable search results with immutable anchoring on blockchain.

---

<div align="center">
  <img src="https://img.shields.io/badge/next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" />
  <img src="https://img.shields.io/badge/Ethereum-3C3C3D?style=for-the-badge&logo=ethereum&logoColor=white" />
  <img src="https://img.shields.io/badge/Base-0052FF?style=for-the-badge&logo=coinbase&logoColor=white" />
  <img src="https://img.shields.io/badge/SearXNG-4A90E2?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" />
</div>


## Overview

**SearchX** is a verifiable search system that transforms traditional search results into **tamper-evident digital records**.

Each query and interaction is:
- **Hashed (SHA-256)**
- **Chained with prior results**
- **Anchored on blockchain**


## Key Features

- Verifiable search results  
- Immutable ledger anchoring  
- Drift detection  
- Click-level proofs  
- Asynchronous blockchain writes  

---

## Quick Start

### 1. Run SearXNG

```bash
docker compose up searxng -d
```
2. Start Backend

```bash
cd backend
cp .env.example .env
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### 3. Deploy Smart Contract

1. Open `SearchX.sol` in Remix  
2. Compile using Solidity `0.8.20+`  
3. Deploy to **Base Sepolia** using MetaMask  
4. Add contract address to `.env`  

### 4. Run the Private Rust Chain

```bash
docker compose up rust-node-1 rust-node-2 rust-node-3 -d
```

The nodes expose `POST /verify` to validate a SearchX block and `POST /blocks` to append a verified block to the private ledger.

### 5. Run Frontend

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

If frontend runs inside Docker, set:

```bash
SEARXNG_INTERNAL_URL=http://searxng:8080
```