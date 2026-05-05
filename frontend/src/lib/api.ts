// Thin client over the FastAPI backend.

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8001";

export interface State {
  total_holders: number;
  total_supply: number;
  circulating_supply: number;
  dead_balance: number;
  last_block: number;
  last_indexed_at: string | null;
  token_contract: string;
  holder_pool_d17: number;
  holder_pool_pct: number;
  total_events: number;
}

export interface Holder {
  rank: number;
  address: string;
  balance: number;
  share_of_circulating: number;
  allocation_d17: number;
  allocation_pct_of_d17_supply: number;
}

export interface SimulateResult {
  balance: number;
  share_of_circulating: number;
  allocation_d17: number;
  allocation_d17_per_event: number;
  allocation_pct_of_d17_supply: number;
  note: string;
}

export async function fetchState(): Promise<State> {
  const r = await fetch(`${API_BASE}/state`);
  if (!r.ok) throw new Error(`/state failed: ${r.status}`);
  return r.json();
}

export async function fetchHolders(): Promise<Holder[]> {
  const r = await fetch(`${API_BASE}/holders`);
  if (!r.ok) throw new Error(`/holders failed: ${r.status}`);
  return r.json();
}

export async function fetchHolder(address: string): Promise<Holder> {
  const r = await fetch(`${API_BASE}/holders/${encodeURIComponent(address)}`);
  if (!r.ok) {
    if (r.status === 404) throw new Error("Address not found among holders");
    throw new Error(`/holders/{address} failed: ${r.status}`);
  }
  return r.json();
}

export async function simulate(balance: number): Promise<SimulateResult> {
  const r = await fetch(`${API_BASE}/simulate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ balance }),
  });
  if (!r.ok) throw new Error(`/simulate failed: ${r.status}`);
  return r.json();
}
