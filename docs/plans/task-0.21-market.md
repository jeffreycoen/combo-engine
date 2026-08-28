# Task 0.21 — the market module

One job: create the engine's first module — the market pools out of deadweight — with its contract, its gate, and the module pattern document, then land the phase as one commit and push. Every file's full content is below; you write exactly what is written here, run the listed gates, and report. You design nothing.

Suggested model: Sonnet 5.

Required reading, in order (confirm at the top of your report):
1. This file, whole.
2. `docs/plans/phase-0.2-market-module.md`, whole.

Source of the math (reference only — do not edit it): `deadweight-hangar.html` lines 247–253, the functions `poolBuy`, `poolSell`, `price1`. The code in step 2 carries that math verbatim.

## Steps

Run from `/home/batman/combo-engine`. A failed assert stops the task; report the step and its verbatim output, run nothing further.

1. Assert the ground: prior gates green and no modules folder yet. The three gate commands must end `PASS`-clean as the phase document states; the `ls` must print `absent`.

```sh
node scripts/gate.mjs api | tail -1
node scripts/gate.mjs combat | tail -1
node scripts/gate.mjs accuracy | tail -1
ls src/modules 2>/dev/null || echo absent
```

2. Write `src/modules/market/market.js`, exactly:

```js
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
```

3. Write `scripts/market-test.mjs`, exactly:

```js
// COMBO-ENGINE — market-test: the market module's gate. Eight checks, all
// arithmetic. Fixture seed: 7 (no seed is special).
import { POOL_CONTRACT, checkPool, poolBuy, poolSell, price1 } from "../src/modules/market/market.js";
import { mulberry32 } from "../src/engine/core.js";

let pass = 0, fail = 0;
const check = (name, ok) => { if (ok) { pass++; console.log("PASS " + name); } else { fail++; console.log("FAIL " + name); } };

// the known pool: the deadweight demo's cloister pods at genesis
const known = () => ({ q: 14, c: 44800 });

check("contract accepts the known pool", checkPool(known()).length === 0);
check("contract rejects junk (3 problems named)",
  checkPool(null).length === 1 && checkPool({ q: 0, c: -1 }).length === 2 && checkPool({ q: 1.5, c: 10 }).length === 1);
check("price1 of the known pool is 3447", price1(known()) === 3447);
{ const p = known(); const cost = poolBuy(p, 1);
  check("buying 1 costs 3447 and leaves {13, 48247}", cost === 3447 && p.q === 13 && p.c === 48247); }
{ const p = known(); poolBuy(p, 1); const out = poolSell(p, 1);
  check("selling it back returns 3446 and leaves {14, 44801}", out === 3446 && p.q === 14 && p.c === 44801); }
{ const p = known(); const cost = poolBuy(p, 1); const out = poolSell(p, 1);
  check("round trip never mints money", out <= cost); }
check("a pool of 1 refuses to sell its last unit", poolBuy({ q: 1, c: 100 }, 1) === null);
{ const r = mulberry32(7); let bad = 0;
  for (let trial = 0; trial < 200; trial++) {
    const pool = { q: 2 + Math.floor(r() * 60), c: Math.floor(r() * 90000) };
    let wallet = 1e9, held = 0;
    const total0 = wallet + pool.c, units0 = pool.q + held;
    for (let i = 0; i < 50; i++) {
      if (r() < 0.5) { const c2 = poolBuy(pool, 1); if (c2 !== null) { wallet -= c2; held += 1; } }
      else if (held > 0) { const o2 = poolSell(pool, 1); wallet += o2; held -= 1; }
      if (wallet + pool.c !== total0 || pool.q + held !== units0 || pool.q < 1 || pool.c < 0 || !Number.isInteger(pool.c)) bad++;
    }
  }
  check("10,000 seeded trades conserve credits and units exactly", bad === 0); }

console.log(`market-test: ${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
console.log("market-test PASS");
```

4. In `scripts/gate.mjs`, in the `GATES` table (currently three entries, `"api"`, `"combat"`, `"accuracy"`), add one line after the `"accuracy"` entry so the table reads:

```js
const GATES = {
  "api": ["src/depot/api.js", "gate", "1", "90"],
  "combat": ["scripts/combat-test.mjs"],
  "accuracy": ["scripts/accuracy-test.mjs"],
  "market": ["scripts/market-test.mjs"],
};
```

Touch nothing else in the file.

5. Write `docs/modules/module-pattern.md`, exactly:

```markdown
# The module pattern

Every module in `src/modules/` has the same five parts. The market module
(`src/modules/market/`) is the minted example; copy its shape.

1. **One surface.** One folder, one entry file, exporting plain functions or
   one maker that takes a single options object and returns a single surface
   object. Nothing global; nothing reached for outside the folder.
2. **A declared seam.** If the module runs against the live world it says
   which hook it implements: `tick(world, dt)`, `consume(events)`,
   `draw(scene, flags)`, or `sample()`. A module of pure functions (like the
   market) declares none.
3. **A contract.** The shape of its inputs written as data, with a `check*`
   function returning every problem at once. Callers check at the door.
4. **A gate.** One headless script in `scripts/` that runs the module a fixed
   distance from a seed and prints PASS/FAIL lines, a count line, and a final
   verdict line, exit 0 on green. The gate is registered in
   `scripts/gate.mjs` and is the module's acceptance forever after.
5. **A clean manifest.** The module imports only from the engine's surfaces
   and its own folder. `src/depot/api.js manifest` maps the wiring.

A module lands when its gate is green and registered. Numbers ratify the
landing; nothing else does.
```

6. Run the new gate through the wrapper. The output must end with exactly these three lines, exit 0:

```sh
node scripts/gate.mjs market
```

```
market-test: 8 PASS / 0 FAIL
market-test PASS
```

(preceded by the eight PASS lines; any FAIL stops the task before step 7).

7. Assert the prior gates did not move:

```sh
node scripts/gate.mjs api | tail -1
node scripts/gate.mjs combat | tail -1
node scripts/gate.mjs accuracy | tail -1
```

The api line must end `worldHash 3367709165  runHash 2717846799`; combat `ALL PASS`; accuracy `11/11`.

8. Commit and push:

```sh
git add src/modules scripts/market-test.mjs scripts/gate.mjs docs/modules docs/plans/phase-0.2-market-module.md docs/plans/task-0.21-market.md
git commit -m "phase 0.2 — the market module lands, the module pattern minted

Deadweight's constant-product pools, verbatim math, first occupant of
src/modules/. Gate: 8 PASS / 0 FAIL, 10,000 seeded trades conserve exactly.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push origin main
```

## Acceptance

- Step 6: `market-test: 8 PASS / 0 FAIL` then `market-test PASS`, exit 0, and an `ok` line for `market` in `.superpowers/gates.log`.
- Step 7: the three prior gates print their pinned numbers unchanged.
- Push accepted by origin.

## Report

Read-confirmation first, then one line of outcome, then bullets: the market gate's count line and verdict line verbatim, the three prior-gate tail lines, the commit hash, the push result. Every nonconformity its own labeled bullet. Fixture seeds: 7 (market sweep), 1 (api gate); no seed is special.
