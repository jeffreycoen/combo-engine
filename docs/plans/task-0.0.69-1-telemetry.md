# Task 0.0.69-1 — the per-joint load telemetry

One job: land the per-joint load telemetry, byte-for-byte from this plan. Write exactly what is written, run the listed gates, report. You design nothing.

Suggested model: Sonnet 5.

Required reading, in order (confirm at the top of your report):
1. This file, whole.
2. `docs/plans/phase-0.0.69-telemetry.md`, whole.

## Steps

Run from `/home/batman/combo-engine`. A failed assert stops the task; report the step and its verbatim output, run nothing further.

1. Assert the ground:

```sh
node scripts/gate.mjs physics-pb | tail -1   # must print: physics-pb-test PASS
ls src/modules/telemetry/telemetry.js 2>/dev/null || echo absent   # must print: absent
```

2. Write `src/modules/telemetry/telemetry.js`, exactly:

```js
// MODULE: telemetry — per-joint load telemetry as an engine output. The
// engine's welds and hinges already measure force, torque, the four load
// components, utilization, peak, damage, and saturation every substep;
// this module shapes those fields into one flags-socket row per mount, so
// a page, a log, or a gate reads the machine's own numbers without
// touching the physics. SHAPED, riding the landed physics module. Pure
// reads; nothing here writes a joint.
import { vlen } from "../physics-pb/physics.js";

// jointLoads(joints) -> one row per mount, the fields the solver wrote.
export function jointLoads(joints) {
  const rows = [];
  for (const name in joints) {
    const j = joints[name];
    rows.push({
      name,
      broken: !!j.broken,
      util: j.util || 0,
      peakUtil: j.peakUtil || 0,
      damage: j.damage || 0,
      force: j.F ? vlen(j.F) : 0,
      torque: j.T ? vlen(j.T) : 0,
      axial: j.Fax || 0, shear: j.Fsh || 0, bend: j.Mb || 0, torsion: j.Mt || 0,
      angle: j.angle !== undefined ? j.angle : null,
      saturated: j.saturated !== undefined ? !!j.saturated : null,
    });
  }
  return rows;
}

// worstMount(rows) -> the row nearest its tear line, broken rows first.
export function worstMount(rows) {
  let worst = null;
  for (const r of rows) {
    if (worst === null) { worst = r; continue; }
    if (r.broken !== worst.broken) { if (r.broken) worst = r; continue; }
    if (r.util > worst.util) worst = r;
  }
  return worst;
}
```

Then `sha256sum src/modules/telemetry/telemetry.js` — must print `a8ec0ba1e8a90a648562c07ef01e95fb30285d8a0e4bc26854a1184b54cccd4a`.

3. Write `scripts/telemetry-test.mjs`, exactly:

```js
// COMBO-ENGINE — telemetry-test. One measured weld, one driven hinge, one
// call: the rows carry the solver's own numbers, name for name, field for
// field; the worst mount is the one nearest its tear line, broken first.
import { Weld, Hinge, Body, V, boxInertia, vlen } from "../src/modules/physics-pb/physics.js";
import { jointLoads, worstMount } from "../src/modules/telemetry/telemetry.js";
let pass = 0, fail = 0;
const check = (n, ok) => { if (ok) { pass++; console.log("PASS " + n); } else { fail++; console.log("FAIL " + n); } };
const SEED = process.env.SEED ? +process.env.SEED : Math.floor(Math.random() * 1e9);
console.log("seeds " + JSON.stringify({ loads: SEED }));
let a = SEED >>> 0;
const rnd = () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const H = 1 / 240;
const mkW = (axial, tension) => { const w = new Weld({ a: new Body({ mass: 0 }), b: new Body({ mass: 1, inertia: boxInertia(1, 1, 1, 1) }), ra: V(), rb: V(), lim: { tension, shear: 1e9, bend: 1e9, torsion: 1e9 } });
  w.reset(); w.lp = V(0, axial * H * H, 0); w.axis = V(0, 1, 0); w.measure(H); return w; };

{ let mirror = true;
  for (let i = 0; i < 300 && mirror; i++) {
    const axial = rnd() * 500, tension = 100 + rnd() * 1000;
    const w = mkW(axial, tension);
    const rows = jointLoads({ shoulder: w });
    const r = rows[0];
    mirror = rows.length === 1 && r.name === "shoulder" && r.util === w.util && r.peakUtil === w.peakUtil
      && r.axial === w.Fax && r.shear === w.Fsh && r.bend === w.Mb && r.torsion === w.Mt
      && Math.abs(r.force - vlen(w.F)) < 1e-12 && r.broken === w.broken && r.angle === null;
  }
  check("telemetry: three hundred rolled welds — every row is the solver's own numbers, field for field", mirror); }
{ const h = new Hinge({ a: new Body({ mass: 0 }), b: new Body({ mass: 1, inertia: boxInertia(1, 1, 1, 1) }), ra: V(), rb: V(), axisA: V(0, 1, 0), refA: V(1, 0, 0), tauMax: 50, target: 1 });
  h.reset(); h.solve(H);
  const r = jointLoads({ knee: h })[0];
  check("telemetry: a hinge row carries its angle and its saturation flag", r.angle === h.angle && r.saturated === h.saturated); }
{ const light = mkW(10, 1000), heavy = mkW(900, 1000), snapped = mkW(2000, 1000);
  const rows = jointLoads({ light, heavy, snapped });
  check("telemetry: the worst mount is the broken one, else the one nearest its tear line",
    worstMount(rows).name === "snapped" && worstMount(jointLoads({ light, heavy })).name === "heavy"); }
{ check("telemetry: an empty machine is an empty report, and its worst mount is nothing",
    jointLoads({}).length === 0 && worstMount([]) === null); }
console.log(`telemetry-test: ${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
console.log("telemetry-test PASS");
```

Then `sha256sum scripts/telemetry-test.mjs` — must print `89d825e1a4749c444212a0cd4b5106e1482faee053b170728c2a6b0f1c8fb7c0`.

4. In `scripts/gate.mjs`, in the GATES table, add one line after the `"actuator"` entry:

```js
  "telemetry": ["scripts/telemetry-test.mjs"],
```

5. Run the new gate — seeds line, 4 PASS lines, `telemetry-test: 4 PASS / 0 FAIL`, `telemetry-test PASS`, exit 0:

```sh
node scripts/gate.mjs telemetry
```

6. Bracket unmoved: `node scripts/gate.mjs physics-pb | tail -1` — must print `physics-pb-test PASS`.

7. Close the records: `package.json` version to `0.0.69`; the phase doc's status line to LANDED as its comment shows; in `docs/plans/batch-harvest-1.md` flip this rung's box; in `README.md` flip the checklist box starting `- [ ] Per-joint load telemetry` to `- [x]`, and add the line `- [x] telemetry — per-joint load telemetry as an engine output — 0.0.69` at the bottom of the "Serving checklist items" list.

8. Commit and push, then stamp:

```sh
git add src/modules/telemetry/telemetry.js scripts/telemetry-test.mjs scripts/gate.mjs package.json README.md docs/plans/phase-0.0.69-telemetry.md docs/plans/task-0.0.69-1-telemetry.md docs/plans/batch-harvest-1.md
git commit -m "phase 0.0.69 — the per-joint load telemetry

Checklist: Per-joint load telemetry. Gate 4 PASS / 0 FAIL at rolled seeds; physics-pb unmoved.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push origin main
H=$(git rev-parse --short HEAD)
sed -i "s/commit stamped below/commit \`$H\`/" docs/plans/phase-0.0.69-telemetry.md
git add docs/plans/phase-0.0.69-telemetry.md && git commit -m "phase 0.0.69 record stamped — $H

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push origin main
```

## Acceptance

- Every sha256 above exact; the gate `4 PASS / 0 FAIL` then `telemetry-test PASS` at rolled seeds; physics-pb's tail unchanged; records flipped riding the landing; pushes accepted.

## Report

Read-confirmation first, then one line of outcome, then bullets: the sha256 lines verbatim, the new gate's seeds/count/verdict lines, the physics-pb tail, both commit hashes, the push results. Every nonconformity its own labeled bullet.
