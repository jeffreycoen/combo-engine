# Task 0.0.36-1 — the poolmarket module

One job: land the constant-product pool module and its gate, byte-for-byte from this plan. Every file's full content is below; write exactly what is written, run the listed gates, report. You design nothing.

Suggested model: Sonnet 5.

Required reading, in order (confirm at the top of your report):
1. This file, whole.
2. `docs/plans/phase-0.0.36-poolmarket.md`, whole.

Source of the math (reference only — do not edit it): `deadweight-hangar.html` lines 209-253.

## Steps

Run from `/home/batman/combo-engine`. A failed assert stops the task; report the step and its verbatim output, run nothing further.

1. Assert the ground: prior gates green, destination absent.

```sh
node scripts/gate.mjs market   # must end: market-test: 8 PASS / 0 FAIL, then market-test PASS
node scripts/gate.mjs ledger   # must end: ledger-test: 9 PASS / 0 FAIL, then ledger-test PASS
ls src/modules/poolmarket 2>/dev/null || echo absent   # must print: absent
```

2. Write `src/modules/poolmarket/poolmarket.js`, exactly:

```js
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
```

3. Write `scripts/poolmarket-test.mjs`, exactly:

```js
// COMBO-ENGINE — poolmarket-test: the constant-product pool gate. VERBATIM
// MATH is ratified against the demo's own text: the three pool functions are
// extracted from deadweight-hangar.html at run time and driven side by side
// with the module on rolled pools — every output must match exactly. Laws
// (conservation, monotone prices, no money pump) run on rolled pools too.
// NO HARDWIRED SEEDS: pools roll fresh each run and print; rerun a failure
// with SEED=<n> in the environment.
import fs from "node:fs";
import { poolBuy, poolSell, price1, netRefit } from "../src/modules/poolmarket/poolmarket.js";

let pass = 0, fail = 0;
const check = (name, ok) => { if (ok) { pass++; console.log("PASS " + name); } else { fail++; console.log("FAIL " + name); } };

const SEED = process.env.SEED ? +process.env.SEED : Math.floor(Math.random() * 1e9);
console.log("seeds " + JSON.stringify({ pools: SEED }));
let a = SEED >>> 0;
const rnd = () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const rollPool = () => ({ q: 2 + Math.floor(rnd() * 60), c: 500 + Math.floor(rnd() * 120000) });

// the demo's own functions, lifted from its text at run time
const demoSrc = fs.readFileSync(new URL("../deadweight-hangar.html", import.meta.url), "utf8");
const lift = (name) => {
  const i = demoSrc.indexOf("function " + name + "(");
  const j = demoSrc.indexOf("function", i + 1);
  const body = demoSrc.slice(i, j).trim();
  return new Function("return (" + body.replace("function " + name, "function") + ")")();
};
const demoBuy = lift("poolBuy"), demoSell = lift("poolSell");
const demoPrice1 = (() => {
  const i = demoSrc.indexOf("function price1(");
  const body = demoSrc.slice(i, demoSrc.indexOf("\n", i)).trim();
  return new Function("return (" + body.replace("function price1", "function") + ")")();
})();

// twin drive: 4000 rolled trades, module vs demo, byte-equal pools throughout
let twins = true;
for (let i = 0; i < 4000 && twins; i++) {
  const p1 = rollPool(); const p2 = { ...p1 };
  const n = 1 + Math.floor(rnd() * 3);
  const op = rnd() < 0.5 ? "buy" : "sell";
  const r1 = op === "buy" ? poolBuy(p1, n) : poolSell(p1, n);
  const r2 = op === "buy" ? demoBuy(p2, n) : demoSell(p2, n);
  twins = r1 === r2 && p1.q === p2.q && p1.c === p2.c;
}
check("poolmarket: 4000 rolled trades run twin with the demo's own text — outputs and pools identical", twins);
let priceTwin = true;
for (let i = 0; i < 1000 && priceTwin; i++) { const p = rollPool(); priceTwin = price1(p) === demoPrice1({ ...p }); }
check("poolmarket: the posted price is the demo's own, on 1000 rolled pools", priceTwin);

// conservation: every credit a buyer pays lands in the pool; every unit moves
let conserve = true;
for (let i = 0; i < 1000 && conserve; i++) {
  const p = rollPool(); const q0 = p.q, c0 = p.c;
  const cost = poolBuy(p, 1);
  conserve = cost !== null && p.q === q0 - 1 && p.c === c0 + cost;
}
check("poolmarket: a buy conserves — stock down one, every credit paid into the pool", conserve);
let conserve2 = true;
for (let i = 0; i < 1000 && conserve2; i++) {
  const p = rollPool(); const q0 = p.q, c0 = p.c;
  const out = poolSell(p, 1);
  conserve2 = p.q === q0 + 1 && p.c === c0 - out && out >= 0;
}
check("poolmarket: a sell conserves — stock up one, every credit paid from the pool", conserve2);

// no money pump: buy then sell returns at most what was paid, on any pool
let pump = false;
for (let i = 0; i < 2000 && !pump; i++) {
  const p = rollPool();
  const cost = poolBuy(p, 1); if (cost === null) continue;
  const back = poolSell(p, 1);
  if (back > cost) pump = true;
}
check("poolmarket: no money pump — a round trip never profits the trader", !pump);

// the price rises as stock drains; a buy that would empty the pool refuses whole
let mono = true;
for (let i = 0; i < 500 && mono; i++) {
  const p = rollPool(); if (p.q < 3) continue;
  const c1 = poolBuy(p, 1), c2 = poolBuy(p, 1);
  if (c2 === null) continue;
  mono = c2 >= c1;
}
const pr = { q: 2, c: 1000 }; const refuse = poolBuy(pr, 2);
check("poolmarket: the price rises as stock drains; an emptying buy refuses whole", mono && refuse === null && pr.q === 2 && pr.c === 1000);
check("poolmarket: price1 posts a buy's exact cost and moves nothing",
  (() => { const p = rollPool(); const posted = price1(p); const q0 = p.q, c0 = p.c; const moved = p.q !== q0 || p.c !== c0; const cost = poolBuy({ ...p }, 1); return !moved && posted === cost; })());

// netRefit: exactly sell-everything-then-buy-everything on a copy, pools unmoved
const KEY = { bridge: "bridge", engine: "engine", pod: "pods" };
let refitLaw = true, untouched = true;
for (let i = 0; i < 500 && refitLaw; i++) {
  const pools = { bridge: rollPool(), engine: rollPool(), pods: rollPool() };
  const snap = JSON.stringify(pools);
  const current = ["bridge", "engine", "pod"].filter(() => rnd() < 0.7);
  const target = ["bridge", "engine", "pod", "pod"].filter(() => rnd() < 0.7);
  const net = netRefit(pools, KEY, current, target);
  untouched = untouched && JSON.stringify(pools) === snap;
  const cp = { bridge: { ...pools.bridge }, engine: { ...pools.engine }, pods: { ...pools.pods } };
  let expect = 0, refused = false;
  for (const t of current) expect -= poolSell(cp[KEY[t]], 1);
  for (const t of target) { const c = poolBuy(cp[KEY[t]], 1); if (c === null) { refused = true; break; } expect += c; }
  refitLaw = refused ? net === null : net === expect;
}
check("poolmarket: a refit nets exactly sell-all-then-buy-all through the pool's own math", refitLaw);
check("poolmarket: a refit prices on copies — the live pools never move", untouched);
const thin = { bridge: { q: 1, c: 9000 } };
check("poolmarket: a target the pool cannot cover refuses whole", netRefit(thin, KEY, [], ["bridge"]) === null);

console.log(`poolmarket-test: ${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
console.log("poolmarket-test PASS");
```

4. In `scripts/gate.mjs`, in the `GATES` table (currently 19 entries ending with `"frostline"`), add one line after the `"frostline"` entry:

```js
  "poolmarket": ["scripts/poolmarket-test.mjs"],
```

Touch nothing else in the file.

5. Run the new gate through the wrapper. The output must be a seeds line, 10 PASS lines, then exactly `poolmarket-test: 10 PASS / 0 FAIL`, then `poolmarket-test PASS`, exit 0. Any FAIL stops the task before step 6; report it with the run's seeds line.

```sh
node scripts/gate.mjs poolmarket
```

6. Assert the prior gates did not move (same required tails as step 1).

7. Close the records in this landing: bump `package.json` version to `0.0.36`; in `docs/plans/phase-0.0.36-poolmarket.md` replace the status line with `Status: LANDED, commit stamped below, 2026-09-03. Gate: 10 PASS / 0 FAIL; prior gates unmoved.`; in `docs/plans/batch-extractions-1.md` flip `- [ ] 0.0.36 pool-market` to `- [x] 0.0.36 pool-market`.

8. Commit and push the landing, then stamp the real hash in a second small commit — NEVER amend after stamping:

```sh
git add src/modules/poolmarket scripts/poolmarket-test.mjs scripts/gate.mjs package.json docs/plans
git commit -m "phase 0.0.36 — the part pools

Constant-product pool math lifted verbatim from the deadweight demo; the gate twin-drives the demo's own text at rolled seeds. 10 PASS / 0 FAIL.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push origin main
H=$(git rev-parse --short HEAD)
sed -i "s/commit stamped below/commit \`$H\`/" docs/plans/phase-0.0.36-poolmarket.md
git add docs/plans && git commit -m "phase 0.0.36 record stamped — $H

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push origin main
```

## Acceptance

- Step 5: `poolmarket-test: 10 PASS / 0 FAIL` then `poolmarket-test PASS`, exit 0, and an `ok` line in `.superpowers/gates.log`.
- Step 6: both prior gates print their pinned tails unchanged.
- Step 7's records flipped, riding the landing commit.
- Push accepted by origin.
- File hashes after step 3: `src/modules/poolmarket/poolmarket.js` sha256 c05ea24c5c2d2e24367a91f580b797d7f6347ba88a76b6d7405a5e7d90da0f81; `scripts/poolmarket-test.mjs` sha256 2b14edab12d809179b0c3b7df9790db059a8fa5b7043d0173ddaebee1096f91c.

## Report

Read-confirmation first, then one line of outcome, then bullets: the gate's count line and verdict line verbatim with its seeds line, every prior-gate tail, both commit hashes (landing and stamp), the push results. Every nonconformity its own labeled bullet. Seeds: rolled fresh at run time and printed; no seed is special.
