# SearchX Private Chain

A lightweight permissioned Rust blockchain network that verifies SearchX block hashes before accepting them into an in-memory ledger.

## What it checks

- `payload_json` must be valid JSON.
- `block_hash` must equal `SHA-256(prev_hash + payload_json)`.
- `prev_hash` must match the node's current head.
- Duplicate blocks are accepted idempotently.

## Run

```bash
cargo run
```

Environment variables:

- `NODE_ID` - node name shown in responses
- `BIND_ADDRESS` - listen address, default `0.0.0.0:9000`
- `SEED_PEERS` - comma-separated peer base URLs

## Endpoints

- `GET /health`
- `GET /chain`
- `GET /peers`
- `POST /peers`
- `POST /verify`
- `POST /blocks`

## Example block submission

```json
{
  "block_type": "search",
  "prev_hash": "0000000000000000000000000000000000000000000000000000000000000000",
  "payload_json": "{\"fetched_at\":\"2026-04-10T00:00:00Z\",\"query\":\"rust\",\"result_count\":1,\"result_urls\":[\"https://example.com\"]}",
  "block_hash": "9f1b3c1e5f6d8f7e1a0f7d1d2c7d4c5b3a2f1e0d9c8b7a6958473625140ffee1",
  "validator": "searchx-node-1",
  "propagate": true
}
```
