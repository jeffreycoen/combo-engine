// modules/market — constant-product pools, lifted from the deadweight demo
// (deadweight-hangar.html lines 247-253, verbatim math). A pool is plain data
// {q, c}: q units in stock, c credits in reserve. Price moves with every
// trade; rounding always favors the pool, so no trade sequence mints money.
// price1 is defined for q >= 2; poolBuy refuses to empty the pool below 1.

export const POOL_CONTRACT = { q: "integer >= 1", c: "integer >= 0" };

// checkPool(p) -> problem strings, empty when clean. Pure.
export function checkPool(p) {
  if (!p || typeof p !== "object" || Array.isArray(p)) return ["pool: not an object"];
  const problems = [];
  if (!Number.isInteger(p.q) || p.q < 1) problems.push("pool.q: integer >= 1 required");
  if (!Number.isInteger(p.c) || p.c < 0) problems.push("pool.c: integer >= 0 required");
  return problems;
}

// buy n units from the pool -> cost (credits into the pool), or null if the
// buy would leave the pool below 1 unit.
export function poolBuy(p, n) {
  const k = p.q * p.c; const nq = p.q - n; if (nq < 1) return null;
  const cost = Math.ceil(k / nq - p.c); p.q = nq; p.c += cost; return cost;
}

// sell n units into the pool -> proceeds (credits out of the pool).
export function poolSell(p, n) {
  const k = p.q * p.c; const nq = p.q + n;
  const out = Math.floor(p.c - k / nq); p.q = nq; p.c -= out; return out;
}

// the current price of buying exactly one unit, without trading. q >= 2.
export function price1(p) { const k = p.q * p.c; return Math.ceil(k / (p.q - 1) - p.c); }
