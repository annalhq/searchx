"""
main.py — FastAPI application entry point for SearchX.

Endpoints:
  GET  /search?q=<query>   — Run a SearXNG search, hash, detect drift, save block
  POST /click              — Record a URL visit as a linked click block
  GET  /ledger             — Return all blocks from the local SQLite ledger
  GET  /health             — Simple health check
"""

import asyncio
import json
import logging
import os
from datetime import datetime, timezone

import httpx
from dotenv import load_dotenv
from fastapi import BackgroundTasks, Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session

from blockchain import anchor_hash
from database import Base, SessionLocal, engine, get_db
from hashing import build_block_hash, compute_drift, hash_payload
from models import Block

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s — %(message)s")
logger = logging.getLogger("searchx.main")

# ── Bootstrap DB ──────────────────────────────────────────────────────────────
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="SearchX API",
    description="Verifiable Search Trail — blockchain-anchored search & click audit.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SEARXNG_URL = os.getenv("SEARXNG_URL", "http://localhost:8080")
GENESIS_HASH = "0" * 64  # sentinel prev_hash for the very first block


# ── Helpers ───────────────────────────────────────────────────────────────────

def _get_latest_block_hash(db: Session) -> str:
    latest = db.query(Block).order_by(Block.id.desc()).first()
    return latest.block_hash if latest else GENESIS_HASH


def _serialize_block(blk: Block) -> dict:
    return {
        "id": blk.id,
        "block_type": blk.block_type,
        "query_string": blk.query_string,
        "block_hash": blk.block_hash,
        "prev_hash": blk.prev_hash,
        "parent_id": blk.parent_id,
        "blockchain_tx_hash": blk.blockchain_tx_hash,
        "anchored_at": blk.anchored_at.isoformat() if blk.anchored_at else None,
        "created_at": blk.created_at.isoformat() if blk.created_at else None,
    }


# ── Pydantic schemas ───────────────────────────────────────────────────────────

class ClickRequest(BaseModel):
    url: str
    search_block_id: int


# ── Routes ─────────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok", "timestamp": datetime.now(timezone.utc).isoformat()}


@app.get("/search")
async def search(
    q: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    if not q.strip():
        raise HTTPException(status_code=400, detail="Query must not be empty.")

    # ── 1. Forward query to SearXNG ───────────────────────────────────────────
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(
                SEARXNG_URL,
                params={"q": q, "format": "json"},
                headers={
                    "X-Forwarded-For": "127.0.0.1",
                    "X-Real-IP": "127.0.0.1",
                    "User-Agent": "Mozilla/5.0 (SearchX-Backend/1.0)",
                },
            )
            resp.raise_for_status()
            raw = resp.json()
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"SearXNG unreachable: {exc}")

    results = raw.get("results", [])

    # ── 2. Build canonical payload & hash ─────────────────────────────────────
    result_urls = [r.get("url", "") for r in results]
    payload = {
        "query": q.strip().lower(),
        "result_count": len(results),
        "result_urls": result_urls,
        "fetched_at": datetime.now(timezone.utc).isoformat(),
    }
    payload_json = json.dumps(payload, sort_keys=True)
    prev_hash = _get_latest_block_hash(db)
    block_hash = build_block_hash(prev_hash, payload_json)

    # ── 3. Drift detection — compare with last same-query block ───────────────
    drift_info = {"drifted": False, "drift_pct": 0.0, "added": [], "removed": [], "common_count": len(results)}
    prev_search = (
        db.query(Block)
        .filter(Block.block_type == "search", Block.query_string == q.strip().lower())
        .order_by(Block.id.desc())
        .first()
    )
    if prev_search:
        prev_payload = json.loads(prev_search.payload_json)
        drift_info = compute_drift(prev_payload.get("result_urls", []), result_urls)

    # ── 4. Persist block ──────────────────────────────────────────────────────
    blk = Block(
        block_type="search",
        query_string=q.strip().lower(),
        payload_json=payload_json,
        block_hash=block_hash,
        prev_hash=prev_hash,
    )
    db.add(blk)
    db.commit()
    db.refresh(blk)

    # ── 5. Fire-and-forget blockchain anchor ──────────────────────────────────
    background_tasks.add_task(anchor_hash, block_hash, "search", SessionLocal, blk.id)

    return {
        "block": _serialize_block(blk),
        "results": results,
        "drift": drift_info,
        "is_repeat_query": prev_search is not None,
    }


@app.post("/click")
async def record_click(
    body: ClickRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    # Validate parent search block exists
    parent = db.get(Block, body.search_block_id)
    if not parent:
        raise HTTPException(status_code=404, detail="Parent search block not found.")

    # ── Fetch page snapshot ───────────────────────────────────────────────────
    snapshot_text = ""
    try:
        async with httpx.AsyncClient(
            timeout=10.0,
            follow_redirects=True,
            headers={"User-Agent": "SearchX-Bot/1.0 (+https://searchx.local)"},
        ) as client:
            r = await client.get(body.url)
            r.raise_for_status()
            snapshot_text = r.text[:4096]  # cap snapshot to 4 KB
    except Exception as exc:
        logger.warning("Could not fetch %s: %s", body.url, exc)
        snapshot_text = ""

    # ── Build payload & hash ──────────────────────────────────────────────────
    payload = {
        "url": body.url,
        "content_snippet": hash_payload(snapshot_text),  # hash content, not raw text
        "visited_at": datetime.now(timezone.utc).isoformat(),
        "parent_search_id": body.search_block_id,
    }
    payload_json = json.dumps(payload, sort_keys=True)
    prev_hash = _get_latest_block_hash(db)
    block_hash = build_block_hash(prev_hash, payload_json)

    blk = Block(
        block_type="click",
        query_string=None,
        payload_json=payload_json,
        block_hash=block_hash,
        prev_hash=prev_hash,
        parent_id=body.search_block_id,
    )
    db.add(blk)
    db.commit()
    db.refresh(blk)

    background_tasks.add_task(anchor_hash, block_hash, "click", SessionLocal, blk.id)

    return {"block": _serialize_block(blk)}


@app.get("/ledger")
async def get_ledger(db: Session = Depends(get_db)):
    blocks = db.query(Block).order_by(Block.id.desc()).limit(200).all()
    return {"blocks": [_serialize_block(b) for b in blocks], "total": len(blocks)}
