"""
hashing.py — Deterministic SHA-256 hashing utilities for SearchX.
"""

import hashlib
import json
from typing import Any


def sha256(data: str) -> str:
    """Return the hex-encoded SHA-256 digest of a UTF-8 string."""
    return hashlib.sha256(data.encode("utf-8")).hexdigest()


def hash_payload(payload: Any) -> str:
    """
    Deterministically hash any JSON-serialisable payload.
    Keys are sorted so that dict ordering never affects the digest.
    """
    canonical = json.dumps(payload, sort_keys=True, ensure_ascii=False)
    return sha256(canonical)


def build_block_hash(prev_hash: str, payload_json: str) -> str:
    """
    Chain-style block hash: SHA-256(prev_hash + payload_json).
    This mirrors Nakamoto-style chaining — any change to history
    cascades into every subsequent block hash.
    """
    return sha256(prev_hash + payload_json)


def compute_drift(old_urls: list[str], new_urls: list[str]) -> dict:
    """
    Compare two ordered result URL lists.
    Returns a dict with drift metrics useful for the frontend.
    """
    old_set = set(old_urls)
    new_set = set(new_urls)

    added = list(new_set - old_set)
    removed = list(old_set - new_set)
    common = list(old_set & new_set)

    total = max(len(old_set), len(new_set), 1)
    drift_pct = round(len(added + removed) / (2 * total) * 100, 1)

    return {
        "drifted": bool(added or removed),
        "drift_pct": drift_pct,
        "added": added,
        "removed": removed,
        "common_count": len(common),
    }
