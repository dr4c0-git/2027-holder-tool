import { useEffect, useState } from "react";
import {
  fetchHolder,
  fetchState,
  simulate,
  Holder,
  SimulateResult,
  State,
} from "./lib/api";
import { Holders } from "./components/Holders";
import { Docs } from "./components/Docs";

type View = "lookup" | "holders" | "docs";

export default function App() {
  const [view, setView] = useState<View>("lookup");

  // Live state
  const [state, setState] = useState<State | null>(null);
  const [stateError, setStateError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastFetchedAt, setLastFetchedAt] = useState<number>(Date.now());
  const [, setTick] = useState(0);

  // Lookup form
  const [address, setAddress] = useState<string>("");
  const [holder, setHolder] = useState<Holder | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);

  // Simulate (what-if balance)
  const [simBalance, setSimBalance] = useState<string>("");
  const [simResult, setSimResult] = useState<SimulateResult | null>(null);
  const [simError, setSimError] = useState<string | null>(null);
  const [simLoading, setSimLoading] = useState(false);

  async function refresh() {
    setRefreshing(true);
    try {
      setState(await fetchState());
      setStateError(null);
      setLastFetchedAt(Date.now());
    } catch (e: unknown) {
      setStateError((e as Error).message);
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 60_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const ago = Math.max(0, Math.floor((Date.now() - lastFetchedAt) / 1000));

  async function onLookup(e: React.FormEvent) {
    e.preventDefault();
    setLookupError(null);
    setHolder(null);
    const a = address.trim();
    if (!/^0x[0-9a-fA-F]{40}$/.test(a)) {
      setLookupError("Enter a valid Ethereum address (0x… 40 hex chars).");
      return;
    }
    setLookupLoading(true);
    try {
      setHolder(await fetchHolder(a));
    } catch (err: unknown) {
      setLookupError((err as Error).message);
    } finally {
      setLookupLoading(false);
    }
  }

  async function onSimulate(e: React.FormEvent) {
    e.preventDefault();
    setSimError(null);
    setSimResult(null);
    const b = Number(simBalance);
    if (!Number.isFinite(b) || b <= 0) {
      setSimError("Enter a positive 2027 balance.");
      return;
    }
    setSimLoading(true);
    try {
      setSimResult(await simulate(b));
    } catch (err: unknown) {
      setSimError((err as Error).message);
    } finally {
      setSimLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex flex-col">
      <header className="px-4 sm:px-6 py-8 sm:py-10 border-b border-white/10">
        <div className="max-w-4xl mx-auto">
          <h1 className="font-serif italic font-bold text-3xl sm:text-5xl tracking-wide text-glow break-words">
            2027 Holder Tool
          </h1>
          <p className="mt-3 text-sm sm:text-base text-white/70 max-w-2xl">
            See your 2027 share and projected D17 allocation across the 5
            allocation events. Built around the official mechanics from{" "}
            <a
              href="https://x.com/xbt2027"
              className="underline decoration-dotted hover:text-white"
              target="_blank"
              rel="noreferrer"
            >
              @xbt2027
            </a>
            .
          </p>
          <nav className="mt-6 flex flex-wrap gap-2 text-sm">
            <NavTab active={view === "lookup"} onClick={() => setView("lookup")}>
              Lookup
            </NavTab>
            <NavTab active={view === "holders"} onClick={() => setView("holders")}>
              Holders
            </NavTab>
            <NavTab active={view === "docs"} onClick={() => setView("docs")}>
              How it works
            </NavTab>
          </nav>
        </div>
      </header>

      <div className="flex-1">
        {view === "docs" ? (
          <Docs />
        ) : view === "holders" ? (
          <Holders />
        ) : (
          <>
            {/* Live state panel */}
            <section className="px-4 sm:px-6 py-8 border-b border-white/10">
              <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h2 className="text-sm uppercase tracking-widest text-white/50">
                    Current state
                  </h2>
                  <div className="flex items-center gap-3 text-xs text-white/50">
                    <span className="whitespace-nowrap">
                      updated {ago < 5 ? "just now" : `${ago}s ago`}
                    </span>
                    <button
                      type="button"
                      onClick={refresh}
                      disabled={refreshing}
                      className="px-2 py-1 rounded border border-white/15 hover:border-white/40 disabled:opacity-50 whitespace-nowrap"
                      title="Force a refresh"
                    >
                      {refreshing ? "refreshing…" : "refresh"}
                    </button>
                  </div>
                </div>
                {stateError && (
                  <p className="text-red-400 text-sm">
                    Could not load state : {stateError}
                  </p>
                )}
                {state && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Stat
                      label="Active holders"
                      value={state.total_holders.toLocaleString()}
                    />
                    <Stat
                      label="Circulating 2027"
                      value={state.circulating_supply.toLocaleString(undefined, {
                        maximumFractionDigits: 0,
                      })}
                    />
                    <Stat
                      label="Holder D17 pool"
                      value={`${state.holder_pool_d17.toLocaleString()} (${state.holder_pool_pct}%)`}
                    />
                  </div>
                )}
                {state && (
                  <p className="text-xs text-white/40">
                    Dead address holds{" "}
                    <strong>
                      {state.dead_balance.toLocaleString(undefined, {
                        maximumFractionDigits: 0,
                      })}
                    </strong>{" "}
                    2027 ({((state.dead_balance / state.total_supply) * 100).toFixed(1)}% of
                    total supply) and is excluded from allocation calculations.
                  </p>
                )}
              </div>
            </section>

            {/* Lookup form */}
            <section className="px-4 sm:px-6 py-10">
              <div className="max-w-4xl mx-auto space-y-8">
                <div>
                  <h2 className="text-sm uppercase tracking-widest text-white/50 mb-4">
                    Look up an address
                  </h2>
                  <form onSubmit={onLookup} className="flex flex-col sm:flex-row gap-3">
                    <input
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="0x…"
                      className="flex-1 w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 outline-none focus:border-glow font-mono text-sm"
                    />
                    <button
                      type="submit"
                      disabled={lookupLoading}
                      className="bg-white text-black font-medium px-4 py-2 rounded-md hover:bg-white/90 disabled:opacity-50 w-full sm:w-auto"
                    >
                      {lookupLoading ? "Looking…" : "Look up"}
                    </button>
                  </form>
                  {lookupError && (
                    <p className="mt-3 text-red-400 text-sm">{lookupError}</p>
                  )}

                  {holder && (
                    <div className="mt-6 box-glow rounded-xl p-6 bg-white/[0.02] space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <Stat label="Rank" value={`#${holder.rank}`} />
                        <Stat
                          label="2027 balance"
                          value={holder.balance.toLocaleString(undefined, {
                            maximumFractionDigits: 0,
                          })}
                        />
                        <Stat
                          label="Share of circulating"
                          value={`${holder.share_of_circulating.toFixed(2)}%`}
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Stat
                          label="Projected D17 (total, 5 events)"
                          value={holder.allocation_d17.toLocaleString(undefined, {
                            maximumFractionDigits: 0,
                          })}
                          large
                        />
                        <Stat
                          label="Per event (≈ /5)"
                          value={(holder.allocation_d17 / 5).toLocaleString(
                            undefined,
                            { maximumFractionDigits: 0 }
                          )}
                          large
                        />
                      </div>
                      <p className="text-xs text-white/50">
                        ≈{" "}
                        <strong>
                          {holder.allocation_pct_of_d17_supply.toFixed(4)}%
                        </strong>{" "}
                        of total D17 supply (1B). Per-event split assumes the
                        holder pool is distributed evenly across the 5 events.
                      </p>
                    </div>
                  )}
                </div>

                {/* Simulator */}
                <div>
                  <h2 className="text-sm uppercase tracking-widest text-white/50 mb-2">
                    What-if simulator
                  </h2>
                  <p className="text-sm text-white/70">
                    "If I held <strong>X tokens of 2027</strong>, what would my
                    D17 allocation be ?"
                  </p>
                  <p className="text-xs text-white/40 mt-1 mb-4">
                    Enter a hypothetical 2027 balance (number of tokens, not USD).
                    Use it to compare scenarios — e.g. doubling your stake — or
                    to see what a target position would be worth in D17.
                  </p>
                  <form onSubmit={onSimulate} className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1 relative w-full">
                      <input
                        inputMode="decimal"
                        value={simBalance}
                        onChange={(e) => setSimBalance(e.target.value)}
                        placeholder="100000"
                        className="w-full bg-white/5 border border-white/10 rounded-md pl-3 pr-16 py-2 outline-none focus:border-glow"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/40 pointer-events-none">
                        2027
                      </span>
                    </div>
                    <button
                      type="submit"
                      disabled={simLoading}
                      className="bg-white text-black font-medium px-4 py-2 rounded-md hover:bg-white/90 disabled:opacity-50 w-full sm:w-auto"
                    >
                      {simLoading ? "Computing…" : "Simulate"}
                    </button>
                  </form>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <span className="text-[11px] text-white/40 mr-1">Try :</span>
                    {[10_000, 100_000, 1_000_000, 10_000_000].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setSimBalance(String(n))}
                        className="text-[11px] px-2 py-0.5 rounded border border-white/10 bg-white/[0.03] text-white/60 hover:text-white hover:border-white/30"
                      >
                        {n.toLocaleString()}
                      </button>
                    ))}
                  </div>
                  {simError && (
                    <p className="mt-3 text-red-400 text-sm">{simError}</p>
                  )}
                  {simResult && (
                    <div className="mt-6 box-glow rounded-xl p-6 bg-white/[0.02] space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Stat
                          label="Share of circulating"
                          value={`${simResult.share_of_circulating.toFixed(4)}%`}
                        />
                        <Stat
                          label="Per event (≈ /5)"
                          value={simResult.allocation_d17_per_event.toLocaleString(
                            undefined,
                            { maximumFractionDigits: 0 }
                          )}
                        />
                      </div>
                      <Stat
                        label="Projected D17 (total, 5 events)"
                        value={simResult.allocation_d17.toLocaleString(undefined, {
                          maximumFractionDigits: 0,
                        })}
                        large
                      />
                      <p className="text-xs text-white/50">{simResult.note}</p>
                    </div>
                  )}
                </div>
              </div>
            </section>
          </>
        )}
      </div>

      <footer className="px-4 sm:px-6 py-6 border-t border-white/10 text-xs text-white/40">
        <div className="max-w-4xl mx-auto flex flex-wrap gap-x-6 gap-y-2 justify-between">
          <span>
            Built by{" "}
            <a
              href="https://x.com/__dr4c0__"
              target="_blank"
              rel="noreferrer"
              className="underline decoration-dotted hover:text-white"
            >
              @__dr4c0__
            </a>{" "}
            · Mechanics by{" "}
            <a
              href="https://x.com/xbt2027"
              target="_blank"
              rel="noreferrer"
              className="underline decoration-dotted hover:text-white"
            >
              @xbt2027
            </a>
          </span>
          <span>
            <a
              href="https://github.com/dr4c0-git/2027-holder-tool"
              target="_blank"
              rel="noreferrer"
              className="underline decoration-dotted hover:text-white"
            >
              Open-source on GitHub
            </a>{" "}
            · For XBT burners :{" "}
            <a
              href="https://d17-burn-calculator.pages.dev"
              target="_blank"
              rel="noreferrer"
              className="underline decoration-dotted hover:text-white"
            >
              d17-burn-calculator
            </a>
          </span>
        </div>
      </footer>
    </main>
  );
}

function NavTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "px-4 py-2 rounded-md border transition-colors",
        active
          ? "border-glow bg-glow/15 text-white text-glow"
          : "border-white/10 bg-white/[0.03] text-white/60 hover:text-white",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function Stat({
  label,
  value,
  large = false,
}: {
  label: string;
  value: string;
  large?: boolean;
}) {
  return (
    <div className="bg-white/[0.03] border border-white/10 rounded-lg px-4 py-3">
      <div className="text-[11px] uppercase tracking-widest text-white/50">
        {label}
      </div>
      <div
        className={
          large
            ? "font-serif italic font-bold text-3xl mt-1 text-glow"
            : "font-serif italic font-bold text-2xl mt-1"
        }
      >
        {value}
      </div>
    </div>
  );
}
