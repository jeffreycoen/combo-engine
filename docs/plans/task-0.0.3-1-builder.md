# Task 0.0.3-1 — the builder module

One job: create the second module — the ship builder core out of deadweight — with its contract and gate, then land the phase as one commit and push. Every file's full content is below; you write exactly what is written, run the listed gates, and report. You design nothing.

Suggested model: Sonnet 5.

Required reading, in order (confirm at the top of your report):
1. This file, whole.
2. `docs/plans/phase-0.0.3-builder-module.md`, whole.

Source of the math (reference only — do not edit it): `deadweight-hangar.html` lines 348–400 (`adjacencyOK`, `weldsOf`, `derive`, `connectedFrom`), spec rows lines 171–182, starter build line 346. The substitution rules are the phase document's three, and only those.

## Steps

Run from `/home/batman/combo-engine`. A failed assert stops the task; report the step and its verbatim output, run nothing further.

1. Assert the ground: four gates green, no builder folder yet. The api line must end `worldHash 3367709165  runHash 2717846799`; combat `ALL PASS`; accuracy `11/11`; market `market-test PASS`; the `ls` must print `absent`.

```sh
node scripts/gate.mjs api | tail -1
node scripts/gate.mjs combat | tail -1
node scripts/gate.mjs accuracy | tail -1
node scripts/gate.mjs market | tail -1
ls src/modules/builder 2>/dev/null || echo absent
```

2. Write `src/modules/builder/builder.js`, exactly:

```js
// modules/builder — the grid-ship builder, lifted from the deadweight demo
// (deadweight-hangar.html lines 348-400, verbatim math). Parts sit on integer
// grid cells; connection ports gate placement; welds join orthogonal
// neighbors; derive() turns a part list into flight properties: mass, center
// of mass, rotational inertia, thrust, torque under burn, turn authority.
//
// Generalization is by PARAMETER only: the demo's globals (SPEC, CELL,
// WELD_S, WELD_WEAK, the bridge's built-in attitude ring) become the maker's
// options; every formula is the demo's own. The spec table keeps the demo's
// role vocabulary (a row may carry thrust, tank, rcsN, weak, and the part
// types "bridge"/"engine"/"tank"/"rcs" are recognized by name in derive).

export const SPEC_ROW_CONTRACT = { kg: "number > 0", ports: "array of E|W|N|S" };

// checkSpec(spec) -> problem strings, empty when clean. Pure.
export function checkSpec(spec) {
  if (!spec || typeof spec !== "object" || Array.isArray(spec)) return ["spec: not an object"];
  const problems = [];
  const names = Object.keys(spec);
  if (!names.length) problems.push("spec: empty table");
  for (const name of names) {
    const row = spec[name];
    if (!row || typeof row !== "object") { problems.push(name + ": not an object"); continue; }
    if (!(typeof row.kg === "number" && row.kg > 0)) problems.push(name + ".kg: number > 0 required");
    if (!Array.isArray(row.ports) || row.ports.some((p) => !["E", "W", "N", "S"].includes(p)))
      problems.push(name + ".ports: array of E|W|N|S required");
  }
  return problems;
}

const DIR = { E: [1, 0], W: [-1, 0], N: [0, -1], S: [0, 1] };

export function makeBuilder(opts) {
  const spec = opts.spec;
  const problems = checkSpec(spec);
  if (problems.length) throw new Error("makeBuilder: " + problems.join("; "));
  const CELL = opts.cell ?? 4;
  const WELD_S = opts.weldStrength ?? 1200;
  const WELD_WEAK = opts.weldWeak ?? 500;
  const BRIDGE_RCS_TAU = opts.bridgeTau ?? 26;
  const BRIDGE_RCS_N = opts.bridgeRcsN ?? 5;

  const occupied = (list, gx, gy) => list.find((m) => m.gx === gx && m.gy === gy);
  const portDirs = (m) => spec[m.t].ports.map((p) => DIR[p]);

  // a cell is placeable if some neighbor's port faces it AND the new part has a port facing back
  function adjacencyOK(list, gx, gy, t) {
    for (const m of list) {
      const dx = gx - m.gx, dy = gy - m.gy;
      if (Math.abs(dx) + Math.abs(dy) !== 1) continue;
      const out = portDirs(m).some((d) => d[0] === dx && d[1] === dy);
      const back = spec[t].ports.map((p) => DIR[p]).some((d) => d[0] === -dx && d[1] === -dy);
      if (out && back) return true;
    }
    return false;
  }

  function weldsOf(list) {
    const ws = [];
    for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
      const a = list[i], b = list[j];
      if (Math.abs(a.gx - b.gx) + Math.abs(a.gy - b.gy) === 1)
        ws.push({ a: i, b: j, strength: (spec[a.t].weak || spec[b.t].weak) ? WELD_WEAK : WELD_S });
    }
    return ws;
  }

  function connectedFrom(list, ws, rootIdx) {
    const seen = new Set([rootIdx]); let ch = 1;
    while (ch) {
      ch = 0;
      for (const w of ws) {
        if (seen.has(w.a) && !seen.has(w.b)) { seen.add(w.b); ch = 1; }
        if (seen.has(w.b) && !seen.has(w.a)) { seen.add(w.a); ch = 1; }
      }
    }
    return seen;
  }

  function derive(list) {
    let m = 0, cx = 0, cy = 0;
    for (const md of list) { const kg = spec[md.t].kg; m += kg; cx += md.gx * CELL * kg; cy += md.gy * CELL * kg; }
    cx /= m; cy /= m;
    let I = 0;
    for (const md of list) { const kg = spec[md.t].kg; const r2 = (md.gx * CELL - cx) ** 2 + (md.gy * CELL - cy) ** 2; I += kg * (r2 + 3); }
    const engines = list.filter((md) => md.t === "engine");
    const tanks = list.filter((md) => md.t === "tank");
    const rcsMods = list.filter((md) => md.t === "rcs");
    let tau = list.some((md) => md.t === "bridge") ? BRIDGE_RCS_TAU : 0;
    let rcsN = list.some((md) => md.t === "bridge") ? BRIDGE_RCS_N : 0;
    for (const r of rcsMods) {
      const arm = Math.hypot(r.gx * CELL - cx, r.gy * CELL - cy);
      tau += (spec.rcs.rcsN ?? 16) * Math.max(arm, 1.8); rcsN += (spec.rcs.rcsN ?? 16);
    }
    const engF = engines.filter((e) => !(e.f || 0)), engR = engines.filter((e) => (e.f || 0) === 2);
    const thrust = spec.engine ? (spec.engine.thrust ?? 0) : 0;
    return {
      m, cx, cy, I,
      F: engF.length * thrust,
      tq: engF.reduce((a, e) => a + (-(e.gy * CELL - cy)) * thrust, 0),
      engF, engR, tau, rcsN, engines,
      fuelCap: (opts.baseFuel ?? 260) + tanks.length * (spec.tank ? (spec.tank.tank ?? 300) : 300),
    };
  }

  return { occupied, portDirs, adjacencyOK, weldsOf, connectedFrom, derive };
}
```

3. Write `scripts/builder-test.mjs`, exactly:

```js
// COMBO-ENGINE — builder-test: the builder module's gate. Ten checks, all
// arithmetic against the deadweight demo's own numbers. No randomness.
import { checkSpec, makeBuilder } from "../src/modules/builder/builder.js";

let pass = 0, fail = 0;
const check = (name, ok) => { if (ok) { pass++; console.log("PASS " + name); } else { fail++; console.log("FAIL " + name); } };
const near = (a, b) => Math.abs(a - b) < 1e-9;

// the demo's spec rows this gate needs, values verbatim from deadweight-hangar.html lines 171-182
const SPEC = {
  bridge: { kg: 4.0, ports: ["E", "W", "N", "S"] },
  engine: { kg: 6.0, ports: ["E", "N", "S"], thrust: 55 },
  pod: { kg: 3.0, ports: ["E", "W", "N", "S"] },
  tank: { kg: 2.5, ports: ["E", "W", "N", "S"], tank: 300 },
  mount: { kg: 3.5, ports: ["W"] },
  strut: { kg: 0.8, ports: ["E", "W", "N", "S"], weak: true },
  rcs: { kg: 1.2, ports: ["E", "W", "N", "S"], rcsN: 16 },
};

check("contract accepts the demo spec", checkSpec(SPEC).length === 0);
check("contract rejects junk (2 problems named)", checkSpec({ x: { kg: 0, ports: ["Q"] } }).length === 2);

const B = makeBuilder({ spec: SPEC });
// the starter dart: the demo's genesis build (deadweight-hangar.html line 346)
const starter = [{ t: "bridge", gx: 0, gy: 0 }, { t: "engine", gx: -1, gy: 0 }, { t: "pod", gx: 1, gy: 0 }];
const d = B.derive(starter);

check("starter mass is 13.0 kg (the demo's own self-test)", near(d.m, 13));
check("starter thrust is 55 N (the demo's own self-test)", d.F === 55);
check("starter balances: zero torque under burn, tau 26", near(d.tq, 0) && d.tau === 26);
check("starter fuel cap 260; one tank makes it 560",
  d.fuelCap === 260 && B.derive([...starter, { t: "tank", gx: 0, gy: 1 }]).fuelCap === 560);
check("starter welds: 2, both full strength 1200",
  (() => { const ws = B.weldsOf(starter); return ws.length === 2 && ws.every((w) => w.strength === 1200); })());
check("a strut joint is weak: 500",
  B.weldsOf([{ t: "bridge", gx: 0, gy: 0 }, { t: "strut", gx: 1, gy: 0 }])[0].strength === 500);
check("ports gate placement: open cell by the bridge yes, far cell no, mount's closed east face no",
  B.adjacencyOK(starter, 0, -1, "pod") === true &&
  B.adjacencyOK(starter, 5, 5, "pod") === false &&
  B.adjacencyOK([{ t: "mount", gx: 0, gy: 0 }], 1, 0, "pod") === false);
check("connectivity: whole starter reachable from the bridge; removing the engine leaves the rest whole",
  (() => {
    const all = B.connectedFrom(starter, B.weldsOf(starter), 0).size === 3;
    const rest = starter.filter((m) => m.t !== "engine");
    return all && B.connectedFrom(rest, B.weldsOf(rest), 0).size === rest.length;
  })());

console.log(`builder-test: ${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
console.log("builder-test PASS");
```

4. In `scripts/gate.mjs`, in the `GATES` table (currently four entries ending with `"market"`), add one line after the `"market"` entry:

```js
  "builder": ["scripts/builder-test.mjs"],
```

Touch nothing else in the file.

5. Run the new gate through the wrapper. The output must be ten PASS lines, then exactly `builder-test: 10 PASS / 0 FAIL`, then `builder-test PASS`, exit 0. Any FAIL stops the task before step 6.

```sh
node scripts/gate.mjs builder
```

6. Assert the prior gates did not move (same required tails as step 1).

```sh
node scripts/gate.mjs api | tail -1
node scripts/gate.mjs combat | tail -1
node scripts/gate.mjs accuracy | tail -1
node scripts/gate.mjs market | tail -1
```

7. Commit and push:

```sh
git add src/modules/builder scripts/builder-test.mjs scripts/gate.mjs docs/plans/phase-0.0.3-builder-module.md docs/plans/task-0.0.3-1-builder.md
git commit -m "phase 0.0.3 — the ship builder core lands

Deadweight's grid builder: ports, welds, derive. Verbatim math, three
named substitutions. Gate: 10 PASS / 0 FAIL on the demo's own numbers.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push origin main
```

## Acceptance

- Step 5: `builder-test: 10 PASS / 0 FAIL` then `builder-test PASS`, exit 0, and an `ok` line for `builder` in `.superpowers/gates.log`.
- Step 6: all four prior gates print their pinned tails unchanged.
- Push accepted by origin.

## Report

Read-confirmation first, then one line of outcome, then bullets: the builder gate's count line and verdict line verbatim, the four prior-gate tails, the commit hash, the push result. Every nonconformity its own labeled bullet. Fixture seeds: none (this gate is seedless arithmetic); the api re-check runs seed 1; no seed is special.
