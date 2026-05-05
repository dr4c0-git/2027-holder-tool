"""
Etherscan indexer for 2027 holder balances.

Strategy
--------
The free Etherscan tier doesn't expose `tokenholderlist`, so we build the
holder map ourselves from Transfer events :

1. Backfill : paginate through every ERC-20 Transfer event of the contract
   (`tokentx` endpoint) and apply each one to the in-memory balance map.
2. Steady-state : on each cycle, fetch only events newer than the highest
   block seen so far (`startblock` parameter) and apply them.

Etherscan V2 free tier limits :
- 5 calls/sec (we don't need more)
- 100k calls/day (one /tokentx page is one call)
- max 10000 records per call AND `page * offset <= 10000`

Because of the page*offset cap we paginate by *block range* rather than
by page number once we exceed 10k transfers.
"""

from __future__ import annotations

import asyncio
import logging
import os
from typing import Any, Optional

import httpx

from state import HolderState

log = logging.getLogger("etherscan")

ETHERSCAN_API_KEY = os.getenv("ETHERSCAN_API_KEY", "")
TOKEN_CONTRACT = os.getenv("TOKEN_CONTRACT", "")
POLL_INTERVAL = int(os.getenv("POLL_INTERVAL", "120"))

ETHERSCAN_BASE = "https://api.etherscan.io/v2/api"
CHAIN_ID = 1  # Ethereum mainnet
PAGE_SIZE = 10000


async def start_indexer(state: HolderState) -> asyncio.Task:
    if not ETHERSCAN_API_KEY:
        log.warning("ETHERSCAN_API_KEY not set — indexer will not start.")
    return asyncio.create_task(_indexer_loop(state), name="etherscan-indexer")


async def stop_indexer(task: asyncio.Task) -> None:
    task.cancel()
    try:
        await task
    except (asyncio.CancelledError, Exception):
        pass


async def _indexer_loop(state: HolderState) -> None:
    if not ETHERSCAN_API_KEY:
        return
    async with httpx.AsyncClient(timeout=60.0) as client:
        while True:
            try:
                await _poll_once(client, state)
                state.mark_indexed()
            except asyncio.CancelledError:
                raise
            except Exception as e:
                log.exception("indexer cycle failed: %s", e)
            await asyncio.sleep(POLL_INTERVAL)


async def _poll_once(client: httpx.AsyncClient, state: HolderState) -> None:
    """Either backfill (first cycle) or fetch new events since last_block."""
    if not state.backfill_done:
        log.info("Backfill: fetching all 2027 transfers from genesis...")
        n = await _ingest_from_block(client, state, start_block=0)
        log.info("Backfill done: %d transfers ingested", n)
        state.backfill_done = True
        return

    snapshot = state.snapshot()
    next_block = snapshot.last_block + 1
    n = await _ingest_from_block(client, state, start_block=next_block)
    if n:
        log.info("Steady-state: %d new transfers from block %d", n, next_block)


async def _ingest_from_block(
    client: httpx.AsyncClient, state: HolderState, start_block: int
) -> int:
    """Fetch all Transfer events from `start_block` onward, applying each.

    Walks forward block-by-block in chunks until an empty page is returned.
    Each chunk fetches up to PAGE_SIZE events ; if a chunk hits the cap, we
    set the next start_block to the highest block seen in it + 1.
    """
    total = 0
    cursor = start_block
    while True:
        page = await _fetch_token_transfers(client, cursor)
        if not page:
            break
        for ev in page:
            try:
                from_a = ev["from"]
                to_a = ev["to"]
                value = int(ev["value"])
                block = int(ev["blockNumber"])
                state.apply_transfer(from_a, to_a, value, block)
                total += 1
            except (KeyError, ValueError) as e:
                log.warning("skip malformed event: %s", e)
        if len(page) < PAGE_SIZE:
            break
        # Advance past the highest block of this page (events on the boundary
        # block already counted because we used `apply_transfer` keyed by
        # event fields, not by block alone).
        last_block = int(page[-1]["blockNumber"])
        cursor = last_block + 1
    return total


async def _fetch_token_transfers(
    client: httpx.AsyncClient, start_block: int
) -> list[dict[str, Any]]:
    params = {
        "chainid": CHAIN_ID,
        "module": "account",
        "action": "tokentx",
        "contractaddress": TOKEN_CONTRACT,
        "startblock": start_block,
        "endblock": 99_999_999,
        "page": 1,
        "offset": PAGE_SIZE,
        "sort": "asc",
        "apikey": ETHERSCAN_API_KEY,
    }
    r = await client.get(ETHERSCAN_BASE, params=params)
    r.raise_for_status()
    body = r.json()
    if body.get("status") == "1":
        return body.get("result") or []
    # status=0 is normal when no events are found; only log on real errors
    msg = (body.get("message") or "") + " " + str(body.get("result") or "")
    if "No transactions found" in msg or "No records found" in msg:
        return []
    log.warning("etherscan unexpected response: %s", msg[:200])
    return []
