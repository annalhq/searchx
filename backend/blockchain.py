"""
blockchain.py — Async Base Sepolia (Ethereum L2) anchoring for SearchX.

Uses web3.py to submit block hashes to the deployed SearchX.sol contract.
All interactions are fire-and-forget background tasks so they never block
the FastAPI response cycle.
"""

import asyncio
import logging
import os
from datetime import datetime, timezone

from dotenv import load_dotenv
from web3 import AsyncWeb3
from web3.middleware import ExtraDataToPOAMiddleware

load_dotenv()

logger = logging.getLogger("searchx.blockchain")

# ── ABI (only the storeHash function + HashStored event) ──────────────────────
CONTRACT_ABI = [
    {
        "inputs": [
            {"internalType": "string", "name": "dataHash", "type": "string"},
            {"internalType": "string", "name": "blockType", "type": "string"},
        ],
        "name": "storeHash",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "anonymous": False,
        "inputs": [
            {"indexed": True, "internalType": "uint256", "name": "recordId", "type": "uint256"},
            {"indexed": False, "internalType": "string", "name": "dataHash", "type": "string"},
            {"indexed": False, "internalType": "string", "name": "blockType", "type": "string"},
            {"indexed": True, "internalType": "address", "name": "submitter", "type": "address"},
            {"indexed": False, "internalType": "uint256", "name": "timestamp", "type": "uint256"},
        ],
        "name": "HashStored",
        "type": "event",
    },
]

def _get_web3() -> AsyncWeb3 | None:
    """Build and return an AsyncWeb3 instance, or None if env vars are missing."""
    rpc_url = os.getenv("ALCHEMY_RPC_URL", "")
    if not rpc_url or "YOUR_KEY" in rpc_url:
        logger.warning("ALCHEMY_RPC_URL not configured — blockchain anchoring disabled.")
        return None
    w3 = AsyncWeb3(AsyncWeb3.AsyncHTTPProvider(rpc_url))
    # Base Sepolia uses Clique PoA, so add the middleware
    w3.middleware_onion.inject(ExtraDataToPOAMiddleware, layer=0)
    return w3


async def anchor_hash(
    data_hash: str,
    block_type: str,
    db_session_factory,
    block_db_id: int,
) -> None:
    """
    Background coroutine: submit `data_hash` to the on-chain registry.
    Updates the SQLite block record with the resulting tx hash.
    """
    w3 = _get_web3()
    if w3 is None:
        return

    contract_address = os.getenv("CONTRACT_ADDRESS", "")
    wallet_address = os.getenv("WALLET_ADDRESS", "")
    private_key = os.getenv("WALLET_PRIVATE_KEY", "")

    if not all([contract_address, wallet_address, private_key]) or "YOUR" in contract_address:
        logger.warning("Blockchain env vars incomplete — skipping anchor for block #%d.", block_db_id)
        return

    try:
        contract = w3.eth.contract(
            address=AsyncWeb3.to_checksum_address(contract_address),
            abi=CONTRACT_ABI,
        )
        nonce = await w3.eth.get_transaction_count(
            AsyncWeb3.to_checksum_address(wallet_address)
        )
        tx = await contract.functions.storeHash(data_hash, block_type).build_transaction(
            {
                "from": AsyncWeb3.to_checksum_address(wallet_address),
                "nonce": nonce,
                "gas": 200_000,
                "maxFeePerGas": AsyncWeb3.to_wei("0.01", "gwei"),
                "maxPriorityFeePerGas": AsyncWeb3.to_wei("0.001", "gwei"),
            }
        )
        signed = w3.eth.account.sign_transaction(tx, private_key=private_key)
        tx_hash = await w3.eth.send_raw_transaction(signed.raw_transaction)
        tx_hash_hex = tx_hash.hex()
        logger.info("Block #%d anchored → tx %s", block_db_id, tx_hash_hex)

        # Wait for receipt (1 confirmation)
        await w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)

        # Persist the tx hash back to SQLite
        from models import Block  # local import to avoid circular deps

        db = db_session_factory()
        try:
            blk = db.get(Block, block_db_id)
            if blk:
                blk.blockchain_tx_hash = tx_hash_hex
                blk.anchored_at = datetime.now(timezone.utc)
                db.commit()
        finally:
            db.close()

    except Exception as exc:
        logger.error("Anchoring block #%d failed: %s", block_db_id, exc)
