"""
In-memory state for the 2027 holder tool.

Holds a balance map keyed by address (lowercased). Updated by the indexer
as new Transfer events come in. Computes ranked per-holder allocations on
demand.
"""

from __future__ import annotations

import threading
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Optional

ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"


@dataclass
class StateSnapshot:
    total_holders: int
    total_supply: int  # raw wei
    circulating_supply: int  # raw wei (total - excluded)
    dead_balance: int  # raw wei
    last_block: int
    last_indexed_at: Optional[str]


class HolderState:
    """Thread-safe state holder for 2027 balances."""

    def __init__(self, total_supply_raw: int, dead_address: str) -> None:
        self._lock = threading.RLock()
        # Lowercase keys for case-insensitive lookups.
        self._balances: dict[str, int] = {}
        self._total_supply_raw: int = total_supply_raw
        self._dead_address: str = dead_address.lower()
        # Exclude dead and zero-address from circulating supply.
        self._excluded_addresses: set[str] = {self._dead_address, ZERO_ADDRESS}
        self._last_block: int = 0
        self._last_indexed_at: Optional[datetime] = None
        self.backfill_done: bool = False

    # ---------- mutation (called from the indexer) ----------

    def apply_transfer(self, from_addr: str, to_addr: str, value: int, block: int) -> None:
        f = from_addr.lower()
        t = to_addr.lower()
        with self._lock:
            # Debit `from` (mint events have from = 0x0, which is fine — we
            # just track it for completeness; later excluded from circulating).
            self._balances[f] = self._balances.get(f, 0) - value
            self._balances[t] = self._balances.get(t, 0) + value
            if block > self._last_block:
                self._last_block = block

    def mark_indexed(self) -> None:
        with self._lock:
            self._last_indexed_at = datetime.now(timezone.utc)

    # ---------- read (called from the API) ----------

    def snapshot(self) -> StateSnapshot:
        with self._lock:
            holders = sum(
                1
                for a, b in self._balances.items()
                if b > 0 and a not in self._excluded_addresses
            )
            dead_balance = self._balances.get(self._dead_address, 0)
            circulating = self._total_supply_raw - dead_balance
            return StateSnapshot(
                total_holders=holders,
                total_supply=self._total_supply_raw,
                circulating_supply=circulating,
                dead_balance=dead_balance,
                last_block=self._last_block,
                last_indexed_at=(
                    self._last_indexed_at.isoformat() if self._last_indexed_at else None
                ),
            )

    def balance_of(self, address: str) -> int:
        with self._lock:
            return self._balances.get(address.lower(), 0)

    def holders(self, holder_pool_d17: int, decimals: int) -> list[dict]:
        """Ranked per-holder rows with projected D17 allocation.

        - Excludes dead address and zero address.
        - `holder_pool_d17` is the absolute D17 token amount reserved
          collectively for 2027 holders (e.g. 350_000_000).
        """
        with self._lock:
            dead_balance = self._balances.get(self._dead_address, 0)
            circulating = max(1, self._total_supply_raw - dead_balance)

            rows: list[dict] = []
            for addr, raw_balance in self._balances.items():
                if raw_balance <= 0:
                    continue
                if addr in self._excluded_addresses:
                    continue
                share = raw_balance / circulating  # 0..1
                allocation_d17 = share * holder_pool_d17
                rows.append(
                    {
                        "address": addr,
                        "balance": raw_balance / (10 ** decimals),
                        "share_of_circulating": share * 100,
                        "allocation_d17": allocation_d17,
                        "allocation_pct_of_d17_supply": share * (holder_pool_d17 / 1_000_000_000) * 100,
                    }
                )

            rows.sort(key=lambda r: -r["balance"])
            for i, r in enumerate(rows, 1):
                r["rank"] = i
            return rows
