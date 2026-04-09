"""
models.py — SQLAlchemy ORM models for SearchX blocks.
"""

from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from database import Base


class Block(Base):
    """
    A single node in the SearchX local ledger.

    block_type:         "search" | "click"
    query_string:       The original search query (search blocks only)
    payload_json:       JSON-serialised payload that was hashed
    block_hash:         SHA-256 of (prev_hash + payload_json)
    prev_hash:          Hash of the preceding block (genesis = "0" * 64)
    parent_id:          FK to the search block a click belongs to (click blocks only)
    blockchain_tx_hash: Ethereum tx hash after on-chain anchoring (nullable until mined)
    anchored_at:        UTC timestamp of first on-chain confirmation
    """

    __tablename__ = "blocks"

    id = Column(Integer, primary_key=True, index=True)
    block_type = Column(String(16), nullable=False)          # "search" | "click"
    query_string = Column(String(512), nullable=True)
    payload_json = Column(Text, nullable=False)
    block_hash = Column(String(64), unique=True, nullable=False)
    prev_hash = Column(String(64), nullable=False)
    parent_id = Column(Integer, ForeignKey("blocks.id"), nullable=True)
    blockchain_tx_hash = Column(String(66), nullable=True)   # 0x + 64 hex chars
    anchored_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
