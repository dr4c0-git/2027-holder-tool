// Public ranked holders table.
// Identical visual language to the burn-calculator allocations table for
// brand consistency.

import { useEffect, useMemo, useState } from "react";
import { Holder, fetchHolders } from "../lib/api";

export function Holders() {
  const [rows, setRows] = useState<Holder[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setRows(await fetchHolders());
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 120_000);
    return () => clearInterval(id);
  }, []);

  const filtered = useMemo(() => {
    if (!rows) return [];
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.address.toLowerCase().includes(q));
  }, [rows, query]);

  function copy(addr: string) {
    navigator.clipboard.writeText(addr).then(() => {
      setCopied(addr);
      setTimeout(() => setCopied((c) => (c === addr ? null : c)), 1500);
    });
  }

  const totalAllocated =
    rows?.reduce((s, r) => s + r.allocation_d17, 0) ?? 0;
  const totalBalance =
    rows?.reduce((s, r) => s + r.balance, 0) ?? 0;

  return (
    <section className="px-4 sm:px-6 py-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-baseline justify-between gap-4 flex-wrap">
          <h2 className="text-sm uppercase tracking-widest text-white/50">
            Current holders
          </h2>
          {rows && (
            <span className="text-xs text-white/40">
              {rows.length.toLocaleString()} wallets ·{" "}
              {totalBalance.toLocaleString(undefined, {
                maximumFractionDigits: 0,
              })}{" "}
              2027 ·{" "}
              {totalAllocated.toLocaleString(undefined, {
                maximumFractionDigits: 0,
              })}{" "}
              D17 (max pool)
            </span>
          )}
        </div>

        <p className="text-sm text-white/60">
          Live ranked table of every 2027 holder excluding the dead address. Each
          row shows the wallet's share of <strong>circulating supply</strong> and
          its projected D17 allocation if the holder pool (
          <strong>350,000,000 D17</strong>, i.e. 35% of D17 supply) is fully
          distributed.
        </p>

        <div className="relative">
          <input
            type="text"
            inputMode="search"
            placeholder="Search by address (paste any portion)…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-md pl-3 pr-10 py-2 text-sm outline-none focus:border-glow"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-white/40 hover:text-white text-sm"
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>

        {error && (
          <p className="text-red-400 text-sm">Could not load holders : {error}</p>
        )}
        {loading && !rows && <p className="text-white/50 text-sm">Loading…</p>}

        {rows && filtered.length === 0 && (
          <p className="text-white/50 text-sm py-8 text-center">
            No address matches “{query}”.
          </p>
        )}

        {rows && filtered.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-white/10">
            <table className="w-full text-sm">
              <thead className="bg-white/[0.03] text-white/50 text-xs uppercase tracking-wider">
                <tr>
                  <th className="text-left px-3 py-2">#</th>
                  <th className="text-left px-3 py-2">Address</th>
                  <th className="text-right px-3 py-2">2027 balance</th>
                  <th className="text-right px-3 py-2">Share</th>
                  <th className="text-right px-3 py-2">D17 allocation</th>
                  <th className="text-right px-3 py-2">% of D17 supply</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map((r) => (
                  <tr key={r.address} className="hover:bg-white/[0.02]">
                    <td className="px-3 py-2 font-serif italic text-white/70">
                      {r.rank}
                    </td>
                    <td className="px-3 py-2">
                      <button
                        onClick={() => copy(r.address)}
                        className="font-mono text-xs text-white/80 hover:text-white inline-flex items-center gap-2 group"
                        title="Click to copy"
                      >
                        <span>
                          {r.address.slice(0, 6)}…{r.address.slice(-6)}
                        </span>
                        <span
                          className={[
                            "text-[10px] px-1.5 py-0.5 rounded transition-opacity",
                            copied === r.address
                              ? "bg-glow/30 text-white opacity-100"
                              : "bg-white/5 text-white/40 opacity-0 group-hover:opacity-100",
                          ].join(" ")}
                        >
                          {copied === r.address ? "copied" : "copy"}
                        </span>
                      </button>
                      <a
                        href={`https://etherscan.io/address/${r.address}`}
                        target="_blank"
                        rel="noreferrer"
                        className="ml-2 text-[10px] text-white/30 hover:text-white/70 underline decoration-dotted"
                        title="View on Etherscan"
                      >
                        etherscan ↗
                      </a>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {r.balance.toLocaleString(undefined, {
                        maximumFractionDigits: 0,
                      })}
                    </td>
                    <td className="px-3 py-2 text-right text-white/70 tabular-nums">
                      {r.share_of_circulating.toFixed(2)}%
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums font-serif italic font-bold">
                      {r.allocation_d17.toLocaleString(undefined, {
                        maximumFractionDigits: 0,
                      })}
                    </td>
                    <td className="px-3 py-2 text-right text-white/60 tabular-nums">
                      {r.allocation_pct_of_d17_supply.toFixed(4)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-xs text-white/40">
          Refreshes automatically every 2 minutes. The dead address (~65% of
          supply) is excluded so allocations reflect what real holders will
          actually receive.
        </p>
      </div>
    </section>
  );
}
