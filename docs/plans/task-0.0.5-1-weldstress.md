# Task 0.0.5-1 — the weld-stress module

One job: create the fourth module — weld stress out of deadweight — with its gate, then land the phase with the record close riding the landing commit. Every file's full content is below; write exactly what is written, run the listed gates, report. You design nothing.

Suggested model: Sonnet 5.

Required reading, in order (confirm at the top of your report):
1. This file, whole.
2. `docs/plans/phase-0.0.5-weldstress-module.md`, whole.

Source of the math (reference only — do not edit it): `deadweight-hangar.html` lines 674–685, 747–768, 1484–1490.

## Steps

Run from `/home/batman/combo-engine`. A failed assert stops the task; report the step and its verbatim output, run nothing further.

1. Assert the ground: six gates green, destination absent. Required tails — api ends `worldHash 3367709165  runHash 2717846799`; combat `ALL PASS`; accuracy `11/11`; market `market-test PASS`; builder `builder-test PASS`; ledger `ledger-test PASS`; the `ls` prints `absent`.

```sh
node scripts/gate.mjs api | tail -1
node scripts/gate.mjs combat | tail -1
node scripts/gate.mjs accuracy | tail -1
node scripts/gate.mjs market | tail -1
node scripts/gate.mjs builder | tail -1
node scripts/gate.mjs ledger | tail -1
ls src/modules/weldstress 2>/dev/null || echo absent
```

2. Write `src/modules/weldstress/weldstress.js`, exactly:

```js
// modules/weldstress — weld loading, rating, and ship splitting, lifted from
// the deadweight demo (deadweight-hangar.html: in-flight loading lines
// 674-685, the split on a broken weld lines 747-768, the hangar's rated
// joint limit lines 1484-1490; verbatim math). Composes with the builder
// module: welds come from weldsOf, connectivity from connectedFrom.
//
// The law of the load: a weld carries the acceleration of the SMALLER side
// of the ship it holds on — load = |accel| * smallerSideMass * 9. Past its
// strength it breaks; whichever side lost the root becomes debris.


// weldLoads(builder, spec, list, ws, aMag) -> per-weld {load, om}; ws gains
// nothing, the caller keeps its own weld objects. Pure over its arguments.
export function weldLoads(builder, spec, list, ws, aMag) {
  return ws.map((w) => {
    const sideA = builder.connectedFrom(list, ws.filter((x) => x !== w), w.a);
    const sideB = builder.connectedFrom(list, ws.filter((x) => x !== w), w.b);
    const small = sideA.size <= sideB.size ? sideA : sideB;
    let om = 0; for (const i of small) om += spec[list[i].t].kg;
    return { load: aMag * om * 9, om };
  });
}

// ratedLimit: the hangar's number — the acceleration at which this weld
// breaks. gLim = strength / (smallerSideMass * 9).
export function ratedLimits(builder, spec, list, ws) {
  return weldLoads(builder, spec, list, ws, 1).map((r, i) => ({
    gLim: ws[i].strength / Math.max(r.om, 0.1) / 9, om: r.om,
  }));
}

// breaking(loads, ws) -> indices of welds whose load exceeds their strength
export function breaking(loads, ws) {
  const out = [];
  for (let i = 0; i < ws.length; i++) if (loads[i].load > ws[i].strength) out.push(i);
  return out;
}

// splitByRoot(builder, list, ws, rootIdx) -> { kept, welds, gone } — the
// demo's breakWeld remainder: the component holding the root stays, welds
// reindexed onto it; everything else is gone (debris is the caller's world).
export function splitByRoot(builder, list, ws, rootIdx) {
  const keep = builder.connectedFrom(list, ws, rootIdx);
  if (keep.size === list.length) return { kept: list.slice(), welds: ws.slice(), gone: [] };
  const gone = [];
  list.forEach((m, idx) => { if (!keep.has(idx)) gone.push(m); });
  const keptIdx = [...keep].sort((a, b) => a - b);
  const remap = new Map(keptIdx.map((old, idx) => [old, idx]));
  const kept = keptIdx.map((i) => list[i]);
  const welds = ws.filter((w) => remap.has(w.a) && remap.has(w.b))
    .map((w) => ({ ...w, a: remap.get(w.a), b: remap.get(w.b) }));
  return { kept, welds, gone };
}
```

3. Write `scripts/weldstress-test.mjs`, exactly:

```js
// COMBO-ENGINE — weldstress-test: the weld-stress module's gate. Nine
// checks, seedless arithmetic on the demo's own numbers, composing with the
// builder module.
import { makeBuilder } from "../src/modules/builder/builder.js";
import { weldLoads, ratedLimits, breaking, splitByRoot } from "../src/modules/weldstress/weldstress.js";

let pass = 0, fail = 0;
const check = (name, ok) => { if (ok) { pass++; console.log("PASS " + name); } else { fail++; console.log("FAIL " + name); } };
const near = (a, b) => Math.abs(a - b) < 1e-9;

const SPEC = {
  bridge: { kg: 4.0, ports: ["E", "W", "N", "S"] },
  engine: { kg: 6.0, ports: ["E", "N", "S"], thrust: 55 },
  pod: { kg: 3.0, ports: ["E", "W", "N", "S"] },
  strut: { kg: 0.8, ports: ["E", "W", "N", "S"], weak: true },
};
const B = makeBuilder({ spec: SPEC });
const starter = [{ t: "bridge", gx: 0, gy: 0 }, { t: "engine", gx: -1, gy: 0 }, { t: "pod", gx: 1, gy: 0 }];
const ws = B.weldsOf(starter);

{ const loads = weldLoads(B, SPEC, starter, ws, 1);
  check("smaller sides: engine weld carries 6 kg, pod weld 3 kg", loads[0].om === 6 && loads[1].om === 3);
  check("load law at 1 u/s2: 54 and 27 (mass x 9)", near(loads[0].load, 54) && near(loads[1].load, 27)); }
{ const lims = ratedLimits(B, SPEC, starter, ws);
  check("rated limits: 1200/(6x9) and 1200/(3x9)", near(lims[0].gLim, 1200 / 54) && near(lims[1].gLim, 1200 / 27)); }
{ const loads = weldLoads(B, SPEC, starter, ws, 3.526);
  check("full burn (3.526 u/s2) breaks nothing on the starter", breaking(loads, ws).length === 0); }
{ const loads = weldLoads(B, SPEC, starter, ws, 23);
  check("23 u/s2 shears exactly the engine weld (54x23=1242 > 1200; 27x23=621 holds)", breaking(loads, ws).length === 1 && breaking(loads, ws)[0] === 0); }
{ const strutted = [...starter, { t: "strut", gx: 2, gy: 0 }];
  const ws2 = B.weldsOf(strutted);
  const loads = weldLoads(B, SPEC, strutted, ws2, 63);
  const idx = breaking(loads, ws2);
  check("a strut joint is weak (500) and its rating is 500/(0.8x9); at 63 u/s2 the engine weld shears",
    near(ratedLimits(B, SPEC, strutted, ws2)[2].gLim, 500 / (0.8 * 9)) && idx.includes(0)); }
{ // the split: cut the engine weld, the bridge keeps the pod, the engine goes
  const cut = ws.filter((w) => !(w.a === 0 && w.b === 1));
  const r = splitByRoot(B, starter, cut, 0);
  check("splitting on a cut engine weld keeps bridge+pod, sheds the engine",
    r.kept.length === 2 && r.kept[0].t === "bridge" && r.kept[1].t === "pod" && r.gone.length === 1 && r.gone[0].t === "engine");
  check("the kept ship's weld is reindexed and whole", r.welds.length === 1 && r.welds[0].a === 0 && r.welds[0].b === 1 &&
    B.connectedFrom(r.kept, r.welds, 0).size === 2); }
check("an uncut ship splits into itself: nothing gone",
  (() => { const r = splitByRoot(B, starter, ws, 0); return r.kept.length === 3 && r.gone.length === 0; })());

console.log(`weldstress-test: ${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
console.log("weldstress-test PASS");
```

4. In `scripts/gate.mjs`, in the `GATES` table (currently six entries ending with `"ledger"`), add one line after the `"ledger"` entry:

```js
  "weldstress": ["scripts/weldstress-test.mjs"],
```

Touch nothing else in the file.

5. Run the new gate. Required output: nine PASS lines, then exactly `weldstress-test: 9 PASS / 0 FAIL`, then `weldstress-test PASS`, exit 0. Any FAIL stops the task before step 6.

```sh
node scripts/gate.mjs weldstress
```

6. Assert the prior gates did not move (same required tails as step 1).

7. Close the records in this landing:
   - In `docs/plans/phase-0.0.5-weldstress-module.md`, replace the status line with: `Status: LANDED, commit pending, 2026-08-28. Gate: 9 PASS / 0 FAIL; prior gates unmoved.`
   - In `README.md`, flip `- [ ] Weld stress with load-based breaking and honest ship splitting` to `- [x]`.
   - In `docs/plans/STATE.md`: set the first line to `Current phase: none active. Last landed: 0.5.`; append ` · 0.5 weldstress (pending)` to the Landed line; add `weldstress` to the gates line; remove `deadweight weld stress (pairs with builder) · ` from the next-candidates line.

8. Commit, stamp the real hash into both pending records, amend, push:

```sh
git add src/modules/weldstress scripts/weldstress-test.mjs scripts/gate.mjs README.md docs/plans
git commit -m "phase 0.0.5 — weld stress lands

Deadweight's joint law: load = accel x smaller side x 9, rated limits,
the split on a broken weld. Composes with the builder. Gate: 9 PASS / 0 FAIL.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
H=$(git rev-parse --short HEAD)
sed -i "s/commit pending/commit \\`$H\\`/" docs/plans/phase-0.0.5-weldstress-module.md
sed -i "s/0.5 weldstress (pending)/0.5 weldstress (\\`$H\\`)/" docs/plans/STATE.md
git add docs/plans && git commit --amend --no-edit
git push origin main
```

## Acceptance

- Step 5: `weldstress-test: 9 PASS / 0 FAIL` then `weldstress-test PASS`, exit 0, and an `ok` line in `.superpowers/gates.log`.
- Step 6: all six prior gates print their pinned tails unchanged.
- Step 7's three records flipped, riding the landing commit (hash stamped by step 8).
- Push accepted by origin.

## Report

Read-confirmation first, then one line of outcome, then bullets: the weldstress gate's count and verdict lines verbatim, the six prior-gate tails, the final commit hash, the push result. Every nonconformity its own labeled bullet. Fixture seeds: none (seedless arithmetic); the api re-check runs seed 1; no seed is special.
