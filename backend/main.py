"""
2027 Holder Tool - FastAPI backend.

Exposes :
  GET  /             - service metadata
  GET  /state        - circulating / total supply, holder count, last index
  GET  /holders      - ranked per-holder allocation table
  GET  /holders/{a}  - single-address lookup (case-insensitive)
  POST /simulate     - what-if : if you held N 2027, what's your D17 ?
"""

from __future__ import annotations

import os
from contextlib import asynccontextmanager
from typing import Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from state import HolderState

load_dotenv()

TOKEN_CONTRACT = os.getenv("TOKEN_CONTRACT", "")
TOKEN_DECIMALS = int(os.getenv("TOKEN_DECIMALS", "18"))
DEAD_ADDRESS = os.getenv("DEAD_ADDRESS", "0x000000000000000000000000000000000000dead")
TOTAL_SUPPLY_RAW = 1_000_000_000 * (10 ** TOKEN_DECIMALS)  # 1B with 18 decimals

D17_TOTAL_SUPPLY = int(os.getenv("D17_TOTAL_SUPPLY", "1000000000"))
HOLDER_POOL_PCT = float(os.getenv("HOLDER_POOL_PCT", "35"))
TOTAL_EVENTS = int(os.getenv("TOTAL_EVENTS", "5"))
HOLDER_POOL_D17 = int(D17_TOTAL_SUPPLY * HOLDER_POOL_PCT / 100)  # 350_000_000

state = HolderState(total_supply_raw=TOTAL_SUPPLY_RAW, dead_address=DEAD_ADDRESS)


@asynccontextmanager
async def lifespan(_: FastAPI):
    from etherscan import start_indexer, stop_indexer

    task = await start_indexer(state)
    try:
        yield
    finally:
        await stop_indexer(task)


app = FastAPI(
    title="2027 Holder Tool API",
    description="Indexes 2027 ERC-20 holders and projects D17 allocation per wallet.",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


class StateResponse(BaseModel):
    total_holders: int
    total_supply: float  # human-readable (decimals applied)
    circulating_supply: float  # human-readable
    dead_balance: float  # human-readable
    last_block: int
    last_indexed_at: Optional[str]
    token_contract: str
    holder_pool_d17: int
    holder_pool_pct: float
    total_events: int


class HolderEntry(BaseModel):
    rank: int
    address: str
    balance: float  # 2027 (decimals applied)
    share_of_circulating: float  # %
    allocation_d17: float  # absolute D17 tokens
    allocation_pct_of_d17_supply: float  # %


class SimulateRequest(BaseModel):
    balance: float  # 2027 you hypothetically hold (human-readable)


class SimulateResponse(BaseModel):
    balance: float
    share_of_circulating: float  # %
    allocation_d17: float
    allocation_d17_per_event: float
    allocation_pct_of_d17_supply: float  # %
    note: str


@app.get("/")
def root() -> dict:
    return {
        "name": "2027 Holder Tool API",
        "docs": "/docs",
        "endpoints": ["/state", "/holders", "/holders/{address}", "/simulate"],
    }


@app.get("/state", response_model=StateResponse)
def get_state() -> StateResponse:
    s = state.snapshot()
    div = 10 ** TOKEN_DECIMALS
    return StateResponse(
        total_holders=s.total_holders,
        total_supply=s.total_supply / div,
        circulating_supply=s.circulating_supply / div,
        dead_balance=s.dead_balance / div,
        last_block=s.last_block,
        last_indexed_at=s.last_indexed_at,
        token_contract=TOKEN_CONTRACT,
        holder_pool_d17=HOLDER_POOL_D17,
        holder_pool_pct=HOLDER_POOL_PCT,
        total_events=TOTAL_EVENTS,
    )


@app.get("/holders", response_model=list[HolderEntry])
def get_holders() -> list[HolderEntry]:
    rows = state.holders(HOLDER_POOL_D17, TOKEN_DECIMALS)
    return [HolderEntry(**r) for r in rows]


@app.get("/holders/{address}", response_model=HolderEntry)
def get_holder(address: str) -> HolderEntry:
    raw = state.balance_of(address)
    if raw <= 0:
        raise HTTPException(
            status_code=404,
            detail=f"Address {address} holds no 2027 (or is excluded from circulating).",
        )
    snapshot = state.snapshot()
    circulating = max(1, snapshot.circulating_supply)
    share = raw / circulating
    div = 10 ** TOKEN_DECIMALS
    # Compute rank vs others: find how many have strictly more.
    rows = state.holders(HOLDER_POOL_D17, TOKEN_DECIMALS)
    rank = next((r["rank"] for r in rows if r["address"] == address.lower()), len(rows) + 1)
    return HolderEntry(
        rank=rank,
        address=address.lower(),
        balance=raw / div,
        share_of_circulating=share * 100,
        allocation_d17=share * HOLDER_POOL_D17,
        allocation_pct_of_d17_supply=share * (HOLDER_POOL_D17 / 1_000_000_000) * 100,
    )


@app.post("/simulate", response_model=SimulateResponse)
def simulate(req: SimulateRequest) -> SimulateResponse:
    if req.balance <= 0:
        raise HTTPException(status_code=400, detail="balance must be > 0")
    snapshot = state.snapshot()
    circulating = max(1, snapshot.circulating_supply)
    div = 10 ** TOKEN_DECIMALS
    raw = req.balance * div
    share = raw / circulating
    allocation_d17 = share * HOLDER_POOL_D17
    return SimulateResponse(
        balance=req.balance,
        share_of_circulating=share * 100,
        allocation_d17=allocation_d17,
        allocation_d17_per_event=allocation_d17 / TOTAL_EVENTS,
        allocation_pct_of_d17_supply=share * (HOLDER_POOL_D17 / 1_000_000_000) * 100,
        note=(
            "Total D17 across all 5 events. The per-event figure assumes an "
            "even split, which has not been formally confirmed yet. Always "
            "verify the rules on the official @xbt2027 profile."
        ),
    )
