# SearchX — Verifiable Search Trail

> Every query is hashed, chained, and anchored to Base Sepolia (Ethereum L2). What you searched, when, and what was returned is cryptographically provable.

---

## Project Structure

```
mini/
├── contracts/
│   └── SearchX.sol          # Solidity contract — deploy on Remix
├── backend/
│   ├── main.py              # FastAPI app (search / click / ledger routes)
│   ├── models.py            # SQLAlchemy Block ORM model
│   ├── database.py          # SQLite engine + session
│   ├── hashing.py           # SHA-256 utilities + drift calculation
│   ├── blockchain.py        # Async Base Sepolia anchoring via web3.py
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example         # → copy to .env and fill in keys
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── api.js
│   │   ├── components/
│   │   │   ├── SearchBar.jsx
│   │   │   ├── ResultCard.jsx
│   │   │   ├── DriftIndicator.jsx
│   │   │   └── LedgerView.jsx
│   │   └── index.css
│   └── .env                 # VITE_API_URL=http://localhost:8000
├── docker-compose.yml       # SearXNG + backend via Docker
└── README.md
```

---

## Quick Start

### 1. SearXNG (local search engine)
```bash
docker compose up searxng -d
# Verify: http://localhost:8080
```

### 2. Backend
```bash
cd backend
cp .env.example .env          # Fill in your keys
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### 3. Deploy the Smart Contract
1. Open `contracts/SearchX.sol` in [Remix IDE](https://remix.ethereum.org).
2. Compile with Solidity 0.8.20+.
3. Deploy to **Base Sepolia** (select Injected Provider with MetaMask on Base Sepolia).
4. Copy the contract address into `backend/.env` as `CONTRACT_ADDRESS`.

### 4. Frontend
```bash
cd frontend
npm install
npm run dev
# Open http://localhost:5173
```

---

## Environment Variables (`backend/.env`)

| Variable | Description |
|---|---|
| `SEARXNG_URL` | SearXNG JSON API base URL (default: `http://localhost:8080`) |
| `ALCHEMY_RPC_URL` | Alchemy Base Sepolia RPC endpoint |
| `WALLET_ADDRESS` | 0x address of the wallet signing transactions |
| `WALLET_PRIVATE_KEY` | Private key of the signing wallet (never commit!) |
| `CONTRACT_ADDRESS` | Deployed `SearchX.sol` address on Base Sepolia |

---

## How It Works

```
User types query
    │
    ▼
Backend: SearXNG fetch → SHA-256 hash (prev_hash + payload)
    │
    ├── SQLite: Save Block (search)
    ├── Drift check: compare URLs with last anchored run
    └── Background: web3.py → Base Sepolia storeHash()
    │
    ▼
Frontend: show results + DriftIndicator + LedgerView
    │
User clicks link (opens in new tab)
    │
    ▼
Backend: fetch URL snapshot → hash → Save Click Block
    └── Background: web3.py → Base Sepolia storeHash()
```

---

## Blockchain

- **Network**: Base Sepolia (Ethereum L2 testnet)
- **Explorer**: https://sepolia.basescan.org
- **Contract**: `SearchX.sol` — minimal hash registry
- On-chain operations are **asynchronous** (background tasks) — the UI shows "Pending…" until confirmed.
