# Task 0.0.71-1 — the opponent senses and cover

One job: land the opponent senses and cover, byte-for-byte from this plan. Write exactly what is written, run the listed gates, report. You design nothing.

Suggested model: Sonnet 5.

Required reading, in order (confirm at the top of your report):
1. This file, whole.
2. `docs/plans/phase-0.0.71-senses.md`, whole.

## Steps

Run from `/home/batman/combo-engine`. A failed assert stops the task; report the step and its verbatim output, run nothing further.

1. Assert the ground:

```sh
node scripts/gate.mjs physics-pb | tail -1   # must print: physics-pb-test PASS
ls src/modules/senses/senses.js 2>/dev/null || echo absent   # must print: absent
```

2. Write `src/modules/senses/senses.js`, exactly:

```js
// MODULE: senses — opponent senses and cover reasoning, lifted VERBATIM
// MATH from the shooting-range demo (holdover-greybox-range-r55, lines
// 1636-1679). Sight is a range, a cone, and a clear ray from the eye;
// cover is the nearest solid crossing the chest line — and it stops being
// cover when you destroy it. Fidelity proven against the demo's own text
// at lift time, in the trial; the demo stays outside the record.
// Substitutions, numbered, and only these:
//   1. The page's AG dials -> this module imports the opponent module's own.
//   2. Function names agentCanSee / agentCoverSolid -> canSee / coverSolid.
import { AG } from "../opponent/opponent.js";

// canSee(a, solids, px, py, pz, blockedFn): 1 when the point is inside the
// view range and cone with a clear ray from the eye; the ray starts clear
// of the agent's own body. a carries {down, body:{c|cc}, fx, fz}.
export function canSee(a, solids, px, py, pz, blockedFn) {
  if (a.down || !a.body) return 0;
  var c = a.body.cc || a.body.c;
  var ex = c[0], ey = c[1] + 0.35, ez = c[2];
  var dx = px - ex, dy = py - ey, dz = pz - ez;
  var d = Math.hypot(dx, dy, dz);
  if (d > AG.VIEW_M) return 0;
  var cosang = (dx * a.fx + dz * a.fz) / (Math.hypot(dx, dz) || 1);
  if (cosang < Math.cos(AG.VIEW_DEG * Math.PI / 360)) return 0;
  var s = 0.45 / d;
  return blockedFn(solids, ex + dx * s, ey + dy * s, ez + dz * s, px, py, pz) ? 0 : 1;
}

// coverSolid(a, solids, px, py, pz): the index of the solid between the
// agent's chest and the point — that is its cover — or -1 in the open.
export function coverSolid(a, solids, px, py, pz) {
  if (!a.body) return -1;
  var c = a.body.cc || a.body.c;
  var dx0 = px - c[0], dy0 = py - c[1], dz0 = pz - c[2];
  var d0 = Math.hypot(dx0, dy0, dz0) || 1;
  var ex = c[0] + dx0 / d0 * 0.32, ey = c[1] + dy0 / d0 * 0.32, ez = c[2] + dz0 / d0 * 0.32;
  var dx = px - ex, dy = py - ey, dz = pz - ez;
  var len = Math.hypot(dx, dy, dz) || 1;
  dx /= len; dy /= len; dz /= len;
  var bestT = 1e9, best = -1;
  for (var s = 0; s < solids.length; s++) {
    var S = solids[s], P = S.planes, t0 = 1e-3, t1 = len - 1e-3, ok = 1;
    if (t1 <= t0) continue;
    for (var i = 0; i < S.n; i++) {
      var nx = P[i * 4], ny = P[i * 4 + 1], nz = P[i * 4 + 2], dd = P[i * 4 + 3];
      var den = nx * dx + ny * dy + nz * dz;
      var num = dd - (nx * ex + ny * ey + nz * ez);
      if (den > -1e-12 && den < 1e-12) { if (num < 0) { ok = 0; break; } continue; }
      var t = num / den;
      if (den > 0) { if (t < t1) t1 = t; } else { if (t > t0) t0 = t; }
      if (t1 < t0) { ok = 0; break; }
    }
    if (ok && t0 < bestT) { bestT = t0; best = s; }
  }
  return best;
}
```

Then `sha256sum src/modules/senses/senses.js` — must print `299536a759cde3f457506a6fdf4da7022ff6e3d39b0b063b509d4773b85d1b4a`.

3. Write `scripts/senses-test.mjs`, exactly:

```js
// COMBO-ENGINE — senses-test. Laws at rolled scenes: sight dies past the
// range and outside the cone; a downed watcher sees nothing; the blocked
// ray is asked with the eye clear of the body; cover is the nearest solid
// on the chest line, by index, and open ground is minus one.
import { AG } from "../src/modules/opponent/opponent.js";
import { canSee, coverSolid } from "../src/modules/senses/senses.js";
import { makeBoxYaw } from "../src/modules/solids/solids.js";
let pass = 0, fail = 0;
const check = (n, ok) => { if (ok) { pass++; console.log("PASS " + n); } else { fail++; console.log("FAIL " + n); } };
const SEED = process.env.SEED ? +process.env.SEED : Math.floor(Math.random() * 1e9);
console.log("seeds " + JSON.stringify({ scenes: SEED }));
let a2 = SEED >>> 0;
const rnd = () => { a2 = (a2 + 0x6d2b79f5) >>> 0; let t = a2; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const watcher = (fx, fz) => ({ down: 0, body: { c: [0, 1, 0] }, fx, fz });
const open = () => false;

{ let range = true;
  for (let i = 0; i < 400 && range; i++) {
    const az = rnd() * Math.PI * 2;
    const near = 1 + rnd() * (AG.VIEW_M - 2), far = AG.VIEW_M * (1.01 + rnd());
    const a = watcher(Math.sin(az), Math.cos(az));
    range = canSee(a, [], Math.sin(az) * near, 1.35, Math.cos(az) * near, open) === 1
      && canSee(a, [], Math.sin(az) * far, 1.35, Math.cos(az) * far, open) === 0;
  }
  check("senses: sight holds inside the view range and dies past it, any rolled bearing", range); }
{ let cone = true;
  for (let i = 0; i < 400 && cone; i++) {
    const a = watcher(0, 1);
    const half = AG.VIEW_DEG * Math.PI / 360;
    const inside = (rnd() * 2 - 1) * (half - 0.02), outside = (half + 0.02 + rnd()) * (rnd() < 0.5 ? 1 : -1);
    const d = 5 + rnd() * 40;
    cone = canSee(a, [], Math.sin(inside) * d, 1.35, Math.cos(inside) * d, open) === 1
      && canSee(a, [], Math.sin(outside) * d, 1.35, Math.cos(outside) * d, open) === 0;
  }
  check("senses: the cone is the stated width — a hair inside sees, a hair outside never", cone); }
{ const a = watcher(0, 1); a.down = 1;
  check("senses: a downed watcher sees nothing", canSee(a, [], 0, 1.35, 5, open) === 0); }
{ let asked = null;
  canSee(watcher(0, 1), ["marker"], 0, 1.35, 10, (solids, sx, sy, sz) => { asked = { solids, sy, sz }; return true; });
  check("senses: the blocked ray is asked once, eye height, clear of the body, and a blocked ray is blind",
    asked !== null && asked.solids[0] === "marker" && Math.abs(asked.sy - 1.35) < 1e-9 && asked.sz > 0 && asked.sz < 1); }
{ let cover = true;
  for (let i = 0; i < 300 && cover; i++) {
    const z1 = 3 + rnd() * 5, z2 = z1 + 3 + rnd() * 5;
    const nearBox = makeBoxYaw(0, 1, z1, 2, 2, 0.3, 0, 0);
    const farBox = makeBoxYaw(0, 1, z2, 2, 2, 0.3, 0, 0);
    const a = { body: { c: [0, 1, 0] } };
    cover = coverSolid(a, [farBox, nearBox], 0, 1, z2 + 5) === 1
      && coverSolid(a, [farBox, nearBox], 5 + rnd() * 5, 1, -3) === -1;
  }
  check("senses: cover is the nearest solid on the chest line, by index; open ground is minus one", cover); }
console.log(`senses-test: ${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
console.log("senses-test PASS");
```

Then `sha256sum scripts/senses-test.mjs` — must print `e619e9b0eda124f28aaca7ea81510edfe22b7b38eefceecc02db7900ce45d793`.

4. In `scripts/gate.mjs`, in the GATES table, add one line after the `"opponent"` entry:

```js
  "senses": ["scripts/senses-test.mjs"],
```

5. Run the new gate — seeds line, 5 PASS lines, `senses-test: 5 PASS / 0 FAIL`, `senses-test PASS`, exit 0:

```sh
node scripts/gate.mjs senses
```

6. Bracket unmoved: `node scripts/gate.mjs physics-pb | tail -1` — must print `physics-pb-test PASS`.

7. Close the records: `package.json` version to `0.0.71`; the phase doc's status line to LANDED as its comment shows; in `docs/plans/batch-harvest-1.md` flip this rung's box; in `README.md` flip the checklist box starting `- [ ] Opponent senses and cover reasoning` to `- [x]`, and add the line `- [x] senses — opponent senses and cover reasoning — 0.0.71` at the bottom of the "Serving checklist items" list.

8. Commit and push, then stamp:

```sh
git add src/modules/senses/senses.js scripts/senses-test.mjs scripts/gate.mjs package.json README.md docs/plans/phase-0.0.71-senses.md docs/plans/task-0.0.71-1-senses.md docs/plans/batch-harvest-1.md
git commit -m "phase 0.0.71 — the opponent senses and cover

Checklist: Opponent senses and cover reasoning. Gate 5 PASS / 0 FAIL at rolled seeds; physics-pb unmoved.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push origin main
H=$(git rev-parse --short HEAD)
sed -i "s/commit stamped below/commit \`$H\`/" docs/plans/phase-0.0.71-senses.md
git add docs/plans/phase-0.0.71-senses.md && git commit -m "phase 0.0.71 record stamped — $H

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push origin main
```

## Acceptance

- Every sha256 above exact; the gate `5 PASS / 0 FAIL` then `senses-test PASS` at rolled seeds; physics-pb's tail unchanged; records flipped riding the landing; pushes accepted.

## Report

Read-confirmation first, then one line of outcome, then bullets: the sha256 lines verbatim, the new gate's seeds/count/verdict lines, the physics-pb tail, both commit hashes, the push results. Every nonconformity its own labeled bullet.
