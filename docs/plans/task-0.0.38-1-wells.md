# Task 0.0.38-1 — the wells module

One job: land the gravity wells module and its gate, byte-for-byte from this plan. Every file's full content is below; write exactly what is written, run the listed gates, report. You design nothing.

Suggested model: Sonnet 5.

Required reading, in order (confirm at the top of your report):
1. This file, whole.
2. `docs/plans/phase-0.0.38-wells.md`, whole.

Source of the math (reference only — do not edit it): `deadweight-hangar.html` lines 403, 438-441, 596-602, 855-858, 2124-2149, 2541-2572.

## Steps

Run from `/home/batman/combo-engine`. A failed assert stops the task; report the step and its verbatim output, run nothing further.

1. Assert the ground: prior gates green, destination absent.

```sh
node scripts/gate.mjs escrow       # must end: escrow-test: 7 PASS / 0 FAIL, then escrow-test PASS
node scripts/gate.mjs poolmarket   # must end: poolmarket-test: 10 PASS / 0 FAIL, then poolmarket-test PASS
ls src/modules/wells 2>/dev/null || echo absent   # must print: absent
```

2. Write `src/modules/wells/wells.js`, exactly:

```js
// MODULE: wells — gravity wells and the flight field, lifted VERBATIM MATH
// from the deadweight hangar demo (deadweight-hangar.html lines 403,
// 438-441, 596-602, 855-858, 2124-2149, 2541-2572). The field law is
// mu / (r^2 + soft^2)^1.65; the binary pair pulls itself at 0.01 of that
// law; the predictors integrate the real field. Pure functions over plain
// objects; no globals, no clocks, no rng.
//
// Substitutions from the demo, numbered, and only these:
//   1. stepPair: stepWorld's wl.varn / wl.moth -> the a / b arguments.
//   2. potField: pot's wellProf(w) (a render profile) -> the profOf
//      argument; the camera scaling (cam.z/2.3)*DEEP and the flight-mode
//      guard stay on the page. The clamped sum is the law carried.
//   3. predStop: the page's ship/derive globals -> arguments: `s` the ship
//      state {x, y, vx, vy, ang, w, fuel}, `M` the mass, `drv` the drive
//      {F, tau, I, nF, nR, thrust} where nF/nR replace engF.length /
//      engR.length and thrust replaces SPEC.engine.thrust. TAU -> the
//      2*Math.PI literal.
//   4. predictBallistic: predictShot's page wiring (module anchors, world
//      entity scans, aim kinds) -> arguments: start {x, y, vx, vy}, dials
//      {life, thrust, thrustFuel, maxRange}, `ghosts` (movers, already
//      shaped {n, x, y, vx, vy, r, trail}), `rocks`. The grap/msl dial
//      values live with the caller; the integration loop is verbatim.

// makeWell(x, y, mu, soft, r, name): a well at rest — the demo's line 403.
export function makeWell(x, y, mu, soft, r, name) { return { x, y, vx: 0, vy: 0, mu, soft, r: r || 0, p: 2.3, name }; }

// accel(wells, x, y): the field at a point — the demo's lines 438-441.
export function accel(wells, x, y) {
  let ax = 0, ay = 0;
  for (const w of wells) { const dx = w.x - x, dy = w.y - y; const r2 = dx * dx + dy * dy + w.soft * w.soft;
    const s = w.mu / Math.pow(r2, 1.65); ax += dx * s; ay += dy * s; }
  return [ax, ay];
}

// stepPair(a, b, dt): the binary's mutual pull and drift — stepWorld's own
// lines 598-602, both directions then both integrations.
export function stepPair(a, b, dt) {
  for (const [p, q] of [[a, b], [b, a]]) {
    const dx = q.x - p.x, dy = q.y - p.y, r2 = dx * dx + dy * dy + q.soft * q.soft;
    const s = .01 * q.mu / Math.pow(r2, 1.65); p.vx += dx * s * dt; p.vy += dy * s * dt; }
  a.x += a.vx * dt; a.y += a.vy * dt;
  b.x += b.vx * dt; b.y += b.vy * dt;
}

// potField(wells, x, y, profOf): the warp depth at a point — pot's clamped
// sum (lines 855-858); profOf(w) -> [A, r0].
export function potField(wells, x, y, profOf) {
  let d = 0;
  for (const w of wells) { const r2 = (x - w.x) ** 2 + (y - w.y) ** 2;
    const [A, r0] = profOf(w); d += A * r0 * r0 / (r2 + r0 * r0); }
  return Math.max(-60, Math.min(230, d));
}

// predStop(s, M, drv, wells): where a killing burn ends — the demo's
// lines 2124-2149, the ship and drive passed in.
export function predStop(s, M, drv, wells) {
  if (s.fuel <= 0) return null;
  let x = s.x, y = s.y, vx = s.vx, vy = s.vy, ang = s.ang, w = s.w;
  const wl = wells.map((q) => ({ ...q }));
  const pdt = 1 / 60;
  for (let i = 0; i < 5400; i++) {
    for (const [a, b] of [[wl[0], wl[1]], [wl[1], wl[0]]]) { const dx = b.x - a.x, dy = b.y - a.y, r2 = dx * dx + dy * dy + 9;
      const s2 = .01 * b.mu / Math.pow(r2, 1.65); a.vx += dx * s2 * pdt; a.vy += dy * s2 * pdt; }
    wl[0].x += wl[0].vx * pdt; wl[0].y += wl[0].vy * pdt; wl[1].x += wl[1].vx * pdt; wl[1].y += wl[1].vy * pdt;
    let ax = 0, ay = 0;
    for (const q of wl) { const dx = q.x - x, dy = q.y - y; const r2 = dx * dx + dy * dy + q.soft * q.soft;
      const s2 = q.mu / Math.pow(r2, 1.65); ax += dx * s2; ay += dy * s2; }
    const v = Math.hypot(vx, vy);
    const gM = Math.hypot(ax, ay);
    if (v < Math.max(0.12, 2.2 * gM * M / drv.F)) return { x, y, t: i * pdt };
    const va = Math.atan2(vy, vx);
    const useR = drv.nR > 0;
    let err = (useR ? va : va + Math.PI) - ang;
    while (err > Math.PI) err -= 2 * Math.PI; while (err < -Math.PI) err += 2 * Math.PI;
    w += Math.sign(err) * Math.min(Math.abs(err) * 6, drv.tau / drv.I) * pdt * 30; w *= .9;
    if (Math.abs(err) < .35) { const dec = (useR ? drv.nR : drv.nF) * drv.thrust * Math.min(1, v / 2) / M;
      const bd = useR ? -1 : 1;
      ax += bd * Math.cos(ang) * dec; ay += bd * Math.sin(ang) * dec; }
    vx += ax * pdt; vy += ay * pdt; x += vx * pdt; y += vy * pdt; ang += w * pdt;
  }
  return null;
}

// predictBallistic(start, dials, wells, ghosts, rocks): the shot through
// the real field — predictShot's integration loop (lines 2560-2571), the
// world's movers passed in as ghosts.
export function predictBallistic(start, dials, wells, ghosts, rocks) {
  let x = start.x, y = start.y, vx = start.vx, vy = start.vy;
  const pts = []; let hit = null; const dt2 = 1 / 30; let mFuel = dials.thrustFuel || 0;
  const gh = ghosts;
  for (let t = 0; t < dials.life && !hit; t += dt2) {
    const [gax, gay] = accel(wells, x, y);
    if (dials.thrust && mFuel > 0) { const sp = Math.hypot(vx, vy) || 1; vx += vx / sp * dials.thrust * dt2; vy += vy / sp * dials.thrust * dt2; mFuel -= dt2; }
    vx += gax * dt2; vy += gay * dt2; x += vx * dt2; y += vy * dt2;
    pts.push([x, y]);
    if (dials.maxRange && Math.hypot(x - pts[0][0], y - pts[0][1]) > dials.maxRange) break;
    for (const g2 of gh) {
      const [ga2x, ga2y] = accel(wells, g2.x, g2.y);
      g2.vx += ga2x * dt2; g2.vy += ga2y * dt2; g2.x += g2.vx * dt2; g2.y += g2.vy * dt2;
      if ((t * 30 | 0) % 8 === 0) g2.trail.push([g2.x, g2.y]);
      if (!hit && Math.hypot(x - g2.x, y - g2.y) < g2.r) hit = { n: g2.n, x: g2.x, y: g2.y }; }
    if (!hit) for (const r of rocks) { if (Math.hypot(x - r.x, y - r.y) < r.r + .5) { hit = { n: "rock", x: r.x, y: r.y }; break; } }
  }
  return { pts, hit, gh };
}
```

3. Write `scripts/wells-test.mjs`, exactly:

```js
// COMBO-ENGINE — wells-test: the gravity field gate. The field law is
// ratified against the demo's own text (accel lifted from
// deadweight-hangar.html at run time, twin-driven on rolled points); the
// pair step, potential, and predictors are ratified by laws at rolled
// worlds. NO HARDWIRED SEEDS: rolls fresh each run and prints; rerun with
// SEED=<n> in the environment.
import fs from "node:fs";
import { makeWell, accel, stepPair, potField, predStop, predictBallistic } from "../src/modules/wells/wells.js";

let pass = 0, fail = 0;
const check = (name, ok) => { if (ok) { pass++; console.log("PASS " + name); } else { fail++; console.log("FAIL " + name); } };
const SEED = process.env.SEED ? +process.env.SEED : Math.floor(Math.random() * 1e9);
console.log("seeds " + JSON.stringify({ field: SEED }));
let a = SEED >>> 0;
const rnd = () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const rollWell = () => makeWell((rnd() - 0.5) * 600, (rnd() - 0.5) * 600, 500 + rnd() * 12000, 2 + rnd() * 8, 5 + rnd() * 40, "w" + Math.floor(rnd() * 100));

// the demo's own accel, lifted from its text
const demoSrc = fs.readFileSync(new URL("../deadweight-hangar.html", import.meta.url), "utf8");
const i0 = demoSrc.indexOf("function accel(");
const demoAccel = new Function("return (" + demoSrc.slice(i0, demoSrc.indexOf("function inNeb")).trim().replace("function accel", "function") + ")")();

let twin = true;
for (let i = 0; i < 3000 && twin; i++) {
  const wells = [rollWell(), rollWell(), rollWell()];
  const x = (rnd() - 0.5) * 800, y = (rnd() - 0.5) * 800;
  const [ax, ay] = accel(wells, x, y);
  const [bx, by] = demoAccel(wells, x, y);
  twin = ax === bx && ay === by;
}
check("wells: 3000 rolled field reads run twin with the demo's own text", twin);

check("wells: a made well is at rest with the demo's shape",
  (() => { const w = makeWell(1, 2, 3, 4, 5, "n"); return w.vx === 0 && w.vy === 0 && w.p === 2.3 && w.r === 5 && makeWell(0, 0, 0, 0, 0, "m").r === 0; })());

// the field points at the well and weakens with distance
let attract = true;
for (let i = 0; i < 500 && attract; i++) {
  const w = rollWell();
  const [ax, ay] = accel([w], w.x - 50, w.y);
  const [bx] = accel([w], w.x - 200, w.y);
  attract = ax > 0 && Math.abs(ay) < 1e-12 && ax > bx && bx > 0;
}
check("wells: the field points at the well and weakens with distance", attract);

// equal softening conserves the pair's mu-weighted momentum exactly
let momentum = true;
for (let i = 0; i < 300 && momentum; i++) {
  const p = rollWell(), q = rollWell();
  q.soft = p.soft;
  p.vx = (rnd() - 0.5) * 2; p.vy = (rnd() - 0.5) * 2; q.vx = (rnd() - 0.5) * 2; q.vy = (rnd() - 0.5) * 2;
  const px0 = p.mu * p.vx + q.mu * q.vx, py0 = p.mu * p.vy + q.mu * q.vy;
  stepPair(p, q, 1 / 60);
  momentum = Math.abs(p.mu * p.vx + q.mu * q.vx - px0) < 1e-9 * Math.max(1, Math.abs(px0))
    && Math.abs(p.mu * p.vy + q.mu * q.vy - py0) < 1e-9 * Math.max(1, Math.abs(py0));
}
check("wells: equal softening conserves the pair's mu-weighted momentum through a step", momentum);

// the potential clamps to the demo's own rails and adds per well
{
  const w1 = rollWell(), w2 = rollWell();
  const prof = () => [46, 30];
  const single = potField([w1], w1.x, w1.y, prof);
  const both = potField([w1, w2], w1.x, w1.y, prof);
  const far = potField([w1], w1.x + 5000, w1.y, prof);
  const deep = potField([w1, w1, w1, w1, w1, w1], w1.x, w1.y, prof);
  const neg = potField([w1, w1], w1.x, w1.y, () => [-52, 26]);
  check("wells: the warp adds per well, fades far out, and clamps to the demo's rails",
    both >= single && far < 1 && deep === 230 && neg === -60 && single === 46);
}

// a dry tank predicts nothing; a strong drive kills rolled velocity inside the horizon
let stops = true, dry = true;
for (let i = 0; i < 40 && stops; i++) {
  const wells = [rollWell(), rollWell()];
  const s = { x: 0, y: 0, vx: (rnd() - 0.5) * 20, vy: (rnd() - 0.5) * 20, ang: rnd() * 6.28, w: 0, fuel: 100 };
  const r = predStop(s, 10, { F: 400, tau: 300, I: 60, nF: 2, nR: 0, thrust: 200 }, wells);
  stops = r !== null && r.t >= 0 && Number.isFinite(r.x + r.y);
  dry = dry && predStop({ ...s, fuel: 0 }, 10, { F: 400, tau: 300, I: 60, nF: 2, nR: 0, thrust: 200 }, wells) === null;
}
check("wells: the stop predictor kills rolled velocity with fuel and refuses without", stops && dry);

// no wells, no thrust: the shot flies straight at fixed spacing
{
  const start = { x: 0, y: 0, vx: 12, vy: 5 };
  const r = predictBallistic(start, { life: 2 }, [], [], []);
  let straight = r.pts.length > 30 && !r.hit;
  for (let k = 1; k < r.pts.length && straight; k++) {
    const [x1, y1] = r.pts[k - 1], [x2, y2] = r.pts[k];
    straight = Math.abs((x2 - x1) - 12 / 30) < 1e-9 && Math.abs((y2 - y1) - 5 / 30) < 1e-9;
  }
  check("wells: a shot in empty space flies straight at the integrator's own spacing", straight);
}

// a ghost on the path is hit; the range dial breaks the line
{
  const ghost = { n: "mark", x: 20, y: 0, vx: 0, vy: 0, r: 3, trail: [] };
  const r = predictBallistic({ x: 0, y: 0, vx: 30, vy: 0 }, { life: 5 }, [], [ghost], []);
  const ranged = predictBallistic({ x: 0, y: 0, vx: 30, vy: 0 }, { life: 5, maxRange: 40 }, [], [], []);
  const last = ranged.pts[ranged.pts.length - 1];
  const flew = Math.hypot(last[0] - ranged.pts[0][0], last[1] - ranged.pts[0][1]);
  check("wells: a mover on the path is hit by name; the range dial breaks one step past its line",
    r.hit && r.hit.n === "mark" && flew <= 40 + 30 / 30 + 1e-9 && flew > 40 && ranged.pts.length < 60);
}

// thrust bends the trajectory farther than the coasting shot
{
  const coast = predictBallistic({ x: 0, y: 0, vx: 10, vy: 0 }, { life: 3 }, [], [], []);
  const burn = predictBallistic({ x: 0, y: 0, vx: 10, vy: 0 }, { life: 3, thrust: 26, thrustFuel: 4 }, [], [], []);
  const cx = coast.pts[coast.pts.length - 1][0], bx = burn.pts[burn.pts.length - 1][0];
  check("wells: the missile's burn carries it farther than the coasting shot", bx > cx + 10);
}

console.log(`wells-test: ${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
console.log("wells-test PASS");
```

4. In `scripts/gate.mjs`, in the `GATES` table (currently 21 entries ending with `"escrow"`), add one line after the `"escrow"` entry:

```js
  "wells": ["scripts/wells-test.mjs"],
```

Touch nothing else in the file.

5. Run the new gate through the wrapper. The output must be a seeds line, 9 PASS lines, then exactly `wells-test: 9 PASS / 0 FAIL`, then `wells-test PASS`, exit 0. Any FAIL stops the task before step 6; report it with the run's seeds line.

```sh
node scripts/gate.mjs wells
```

6. Assert the prior gates did not move (same required tails as step 1).

7. Close the records in this landing: bump `package.json` version to `0.0.38`; in `docs/plans/phase-0.0.38-wells.md` replace the status line with `Status: LANDED, commit stamped below, 2026-09-03. Gate: 9 PASS / 0 FAIL; prior gates unmoved.`; in `docs/plans/batch-extractions-1.md` flip `- [ ] 0.0.38 wells` to `- [x] 0.0.38 wells`.

8. Commit and push the landing, then stamp the real hash in a second small commit — NEVER amend after stamping:

```sh
git add src/modules/wells scripts/wells-test.mjs scripts/gate.mjs package.json docs/plans
git commit -m "phase 0.0.38 — the gravity wells

Field law, pair step, warp, and both predictors lifted verbatim from the deadweight demo; the field twin-drives the demo's own text at rolled seeds. 9 PASS / 0 FAIL.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push origin main
H=$(git rev-parse --short HEAD)
sed -i "s/commit stamped below/commit \`$H\`/" docs/plans/phase-0.0.38-wells.md
git add docs/plans && git commit -m "phase 0.0.38 record stamped — $H

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push origin main
```

## Acceptance

- Step 5: `wells-test: 9 PASS / 0 FAIL` then `wells-test PASS`, exit 0, and an `ok` line in `.superpowers/gates.log`.
- Step 6: both prior gates print their pinned tails unchanged.
- Step 7's records flipped, riding the landing commit.
- Push accepted by origin.
- File hashes after step 3: `src/modules/wells/wells.js` sha256 7d95114ff23f6edf8e8dbaabe9bc47fbf8cea5e9c9105d1699ba8dd0bad3af65; `scripts/wells-test.mjs` sha256 e83fdee351e8b06c07c47b9cb10518ad4c8f5f9b7a2fdd0f34270e6146020bef.

## Report

Read-confirmation first, then one line of outcome, then bullets: the gate's seeds line, count line, and verdict line verbatim, every prior-gate tail, both commit hashes (landing and stamp), the push results. Every nonconformity its own labeled bullet. Seeds: rolled fresh at run time and printed; no seed is special.
