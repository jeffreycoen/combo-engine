// MODULE: poolmarket — constant-product part pools, lifted VERBATIM MATH from
// the deadweight hangar demo (deadweight-hangar.html lines 209-253). A pool
// is {q: stock, c: credit reserve}; the invariant k = q*c prices every trade,
// and the rounding (ceil on buys, floor on sells) always favors the pool.
// Pure functions over plain objects; no globals, no clocks, no rng.
//
// Substitutions from the demo, numbered, and only these:
//   1. bpCost's station table `m` (module-scope MKT + dockedAt) -> the
//      `pools` argument.
//   2. bpCost's `build` (module-scope ship) -> the `current` argument, a
//      list of part type names.
//   3. bpCost's `BLUEPRINTS[nm]` lookup -> the `target` argument, a list of
//      part type names (the blueprint rows' type column).
//   4. bpCost's `PKEY` (module-scope table) -> the `partKeyOf` argument.
//   5. The function name bpCost -> netRefit (the module has no blueprints).

// poolBuy(p, n): buy n units from the pool -> cost in credits, paid into the
// pool. Refuses (null, pool untouched) when the buy would empty the pool.
export function poolBuy(p, n) {
  const k = p.q * p.c; const nq = p.q - n; if (nq < 1) return null;
  const cost = Math.ceil(k / nq - p.c); p.q = nq; p.c += cost; return cost;
}

// poolSell(p, n): sell n units into the pool -> proceeds in credits, paid
// out of the pool.
export function poolSell(p, n) {
  const k = p.q * p.c; const nq = p.q + n;
  const out = Math.floor(p.c - k / nq); p.q = nq; p.c -= out; return out;
}

// price1(p): the posted price of one unit — what poolBuy(p, 1) would cost,
// with the pool untouched.
export function price1(p) { const k = p.q * p.c; return Math.ceil(k / (p.q - 1) - p.c); }

// netRefit(pools, partKeyOf, current, target): the demo's bpCost — the net
// cost of selling every current part and buying every target part, priced
// on pool COPIES so the pools never move. Null when any target part's pool
// would be emptied. The demo's own loop bodies, verbatim.
export function netRefit(pools, partKeyOf, current, target) {
  const m = pools;
  const cp = {}; for (const k in m) if (typeof m[k] === "object") cp[k] = { q: m[k].q, c: m[k].c };
  let net = 0;
  for (const t of current) { const p = cp[partKeyOf[t]];
    const k2 = p.q * p.c; const nq = p.q + 1; const out = Math.floor(p.c - k2 / nq); p.q = nq; p.c -= out; net -= out; }
  for (const t of target) { const p = cp[partKeyOf[t]];
    if (p.q < 2) return null;
    const k2 = p.q * p.c; const nq = p.q - 1; const cost = Math.ceil(k2 / nq - p.c); p.q = nq; p.c += cost; net += cost; }
  return net;
}
