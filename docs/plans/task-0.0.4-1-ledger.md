# Task 0.0.4-1 — the ledger module

One job: create the third module — the conservation ledger shaped from deadweight — with its contract and gate, then land the phase as one commit and push. Every file's full content is below; write exactly what is written, run the listed gates, report. You design nothing.

Suggested model: Sonnet 5.

Required reading, in order (confirm at the top of your report):
1. This file, whole.
2. `docs/plans/phase-0.0.4-ledger-module.md`, whole.

Source of the law (reference only — do not edit it): `deadweight-hangar.html` lines 254–344 and 2496. The phase document states what is shaped versus carried; this task only writes the files below.

## Steps

Run from `/home/batman/combo-engine`. A failed assert stops the task; report the step and its verbatim output, run nothing further.

1. Assert the ground: five gates green, no ledger folder yet. The api line must end `worldHash 3367709165  runHash 2717846799`; combat `ALL PASS`; accuracy `11/11`; market `market-test PASS`; builder `builder-test PASS`; the `ls` must print `absent`.

```sh
node scripts/gate.mjs api | tail -1
node scripts/gate.mjs combat | tail -1
node scripts/gate.mjs accuracy | tail -1
node scripts/gate.mjs market | tail -1
node scripts/gate.mjs builder | tail -1
ls src/modules/ledger 2>/dev/null || echo absent
```

2. Write `src/modules/ledger/ledger.js`, exactly:

```js
// modules/ledger — the conservation ledger, shaped from the deadweight demo
// (deadweight-hangar.html lines 254-344: GEN, genesis(), audit()). The law is
// deadweight's exactly: every conserved unit is declared at world start, and
// the audit sums every holder and must come back to zero drift, forever. The
// code around the law is new: the demo walked its game's lists by name; here
// holders REGISTER a counting function, and the module only sums.
//
// Life cycle: declare() during genesis -> seal() -> source()/audit() during
// the run. Genesis never moves after sealing except through writeOff(), the
// demo's "a star can eat money — genesis records it", made explicit and
// reason-carrying.

export const LEDGER_CONTRACT = {
  dimensions: "array of 1+ distinct non-empty strings",
  source: "name + function returning {dimension: finite number} (missing dimensions count as 0)",
};

// checkDimensions(dims) -> problem strings, empty when clean. Pure.
export function checkDimensions(dims) {
  if (!Array.isArray(dims) || dims.length < 1) return ["dimensions: array of 1+ strings required"];
  const problems = [];
  const seen = new Set();
  for (const d of dims) {
    if (typeof d !== "string" || !d.length) { problems.push("dimensions: non-empty strings only"); continue; }
    if (seen.has(d)) problems.push("dimensions: duplicate \"" + d + "\"");
    seen.add(d);
  }
  return problems;
}

export function makeLedger(opts) {
  const problems = checkDimensions(opts && opts.dimensions);
  if (problems.length) throw new Error("makeLedger: " + problems.join("; "));
  const dims = [...opts.dimensions];
  const genesis = {}; for (const d of dims) genesis[d] = 0;
  const sources = new Map();
  const writeOffs = [];
  let sealed = false;

  return {
    // genesis: declare what exists before the world runs
    declare(dimension, amount) {
      if (sealed) throw new Error("ledger: declare after seal");
      if (!(dimension in genesis)) throw new Error("ledger: unknown dimension \"" + dimension + "\"");
      if (!Number.isFinite(amount)) throw new Error("ledger: non-finite declare");
      genesis[dimension] += amount;
    },
    seal() { sealed = true; },
    get sealed() { return sealed; },

    // holders of value register how to count themselves; re-registering a
    // name replaces its counter (a holder that changes shape re-registers)
    source(name, count) {
      if (typeof name !== "string" || !name.length) throw new Error("ledger: source needs a name");
      if (typeof count !== "function") throw new Error("ledger: source needs a counting function");
      sources.set(name, count);
    },
    dropSource(name) { sources.delete(name); },

    // the world destroyed value on purpose; the books record it, with a reason
    writeOff(dimension, amount, reason) {
      if (!(dimension in genesis)) throw new Error("ledger: unknown dimension \"" + dimension + "\"");
      if (!Number.isFinite(amount)) throw new Error("ledger: non-finite writeOff");
      genesis[dimension] -= amount;
      writeOffs.push({ dimension, amount, reason: String(reason || "unstated") });
    },
    get writeOffs() { return writeOffs.slice(); },

    // sum every holder, subtract genesis: zero drift or a named finding
    audit(epsilon = 1e-9) {
      const totals = {}; for (const d of dims) totals[d] = 0;
      for (const [name, count] of sources) {
        const held = count();
        for (const d of dims) {
          const v = held && Number.isFinite(held[d]) ? held[d] : 0;
          totals[d] += v;
          if (held && d in held && !Number.isFinite(held[d]))
            return { ok: false, drift: null, finding: "source \"" + name + "\" returned non-finite " + d };
        }
      }
      const drift = {}; let ok = true;
      for (const d of dims) { drift[d] = totals[d] - genesis[d]; if (Math.abs(drift[d]) > epsilon) ok = false; }
      return { ok, drift, finding: ok ? null : "drift" };
    },
  };
}
```

3. Write `scripts/ledger-test.mjs`, exactly:

```js
// COMBO-ENGINE — ledger-test: the ledger module's gate. Nine checks. The
// conservation sweep reuses the market module: two pools and a wallet trading
// under the ledger's audit, drift exactly zero at every step. Fixture seed:
// 11 (no seed is special).
import { checkDimensions, makeLedger } from "../src/modules/ledger/ledger.js";
import { poolBuy, poolSell } from "../src/modules/market/market.js";
import { mulberry32 } from "../src/engine/core.js";

let pass = 0, fail = 0;
const check = (name, ok) => { if (ok) { pass++; console.log("PASS " + name); } else { fail++; console.log("FAIL " + name); } };

check("contract accepts [credits, units]", checkDimensions(["credits", "units"]).length === 0);
check("contract rejects junk (empty, blank, duplicate = 3 problems across calls)",
  checkDimensions([]).length === 1 && checkDimensions([""]).length === 1 && checkDimensions(["c", "c"]).length === 1);

// the toy world: one wallet, two market pools, genesis declared then sealed
const world = () => {
  const w = { credits: 500000, held: 0 };
  const a = { q: 14, c: 44800 };
  const b = { q: 30, c: 24000 };
  const L = makeLedger({ dimensions: ["credits", "units"] });
  L.declare("credits", w.credits + a.c + b.c);
  L.declare("units", a.q + b.q);
  L.seal();
  L.source("wallet", () => ({ credits: w.credits, units: w.held }));
  L.source("poolA", () => ({ credits: a.c, units: a.q }));
  L.source("poolB", () => ({ credits: b.c, units: b.q }));
  return { w, a, b, L };
};

check("a sealed genesis audits to zero drift", (() => { const { L } = world(); const r = L.audit(); return r.ok && r.drift.credits === 0 && r.drift.units === 0; })());
check("declare after seal throws", (() => { const { L } = world(); try { L.declare("credits", 1); return false; } catch (e) { return true; } })());

{ // the sweep: 10,000 seeded trades across both pools, audited every step
  const { w, a, b, L } = world();
  const r = mulberry32(11);
  let clean = true;
  for (let i = 0; i < 10000; i++) {
    const pool = r() < 0.5 ? a : b;
    if (r() < 0.5) { const c2 = poolBuy(pool, 1); if (c2 !== null) { w.credits -= c2; w.held += 1; } }
    else if (w.held > 0) { const o2 = poolSell(pool, 1); w.credits += o2; w.held -= 1; }
    if (!L.audit().ok) { clean = false; break; }
  }
  check("10,000 seeded trades audit to zero drift at every step", clean);

  // the mint: one credit from nowhere is caught, named, and exactly 1
  w.credits += 1;
  const caught = L.audit();
  check("a minted credit is caught: ok false, drift.credits exactly 1", caught.ok === false && caught.drift.credits === 1 && caught.drift.units === 0);

  // the write-off: the books record the destruction and balance again
  L.writeOff("credits", -1, "test mint reconciled");
  const after = L.audit();
  check("a write-off with a reason rebalances the books to zero", after.ok && after.drift.credits === 0 && L.writeOffs.length === 1 && L.writeOffs[0].reason === "test mint reconciled");
}

check("a dropped source shows as negative drift (value left the books)",
  (() => { const { a, L } = world(); L.dropSource("poolA"); const r2 = L.audit(); return !r2.ok && r2.drift.credits === -a.c && r2.drift.units === -a.q; })());
check("a source returning non-finite is a named finding, not a silent pass",
  (() => { const { L } = world(); L.source("bad", () => ({ credits: NaN })); const r2 = L.audit(); return r2.ok === false && String(r2.finding).includes("bad"); })());

console.log(`ledger-test: ${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
console.log("ledger-test PASS");
```

4. In `scripts/gate.mjs`, in the `GATES` table (currently five entries ending with `"builder"`), add one line after the `"builder"` entry:

```js
  "ledger": ["scripts/ledger-test.mjs"],
```

Touch nothing else in the file.

5. Run the new gate through the wrapper. The output must be nine PASS lines, then exactly `ledger-test: 9 PASS / 0 FAIL`, then `ledger-test PASS`, exit 0. Any FAIL stops the task before step 6.

```sh
node scripts/gate.mjs ledger
```

6. Assert the prior gates did not move (same required tails as step 1).

```sh
node scripts/gate.mjs api | tail -1
node scripts/gate.mjs combat | tail -1
node scripts/gate.mjs accuracy | tail -1
node scripts/gate.mjs market | tail -1
node scripts/gate.mjs builder | tail -1
```

7. Commit and push:

```sh
git add src/modules/ledger scripts/ledger-test.mjs scripts/gate.mjs docs/plans/phase-0.0.4-ledger-module.md docs/plans/task-0.0.4-1-ledger.md
git commit -m "phase 0.0.4 — the conservation ledger lands

Deadweight's law, shaped: declare, seal, sources, audit to zero,
reason-carrying write-offs. Gate: 9 PASS / 0 FAIL, and the sweep runs
the market module's own pools under audit — first cross-module proof.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push origin main
```

## Acceptance

- Step 5: `ledger-test: 9 PASS / 0 FAIL` then `ledger-test PASS`, exit 0, and an `ok` line for `ledger` in `.superpowers/gates.log`.
- Step 6: all five prior gates print their pinned tails unchanged.
- Push accepted by origin.

## Report

Read-confirmation first, then one line of outcome, then bullets: the ledger gate's count line and verdict line verbatim, the five prior-gate tails, the commit hash, the push result. Every nonconformity its own labeled bullet. Fixture seeds: 11 (ledger sweep), 1 (api re-check); no seed is special.
