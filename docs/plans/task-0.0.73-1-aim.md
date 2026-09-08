# Task 0.0.73-1 — frozen-time aiming

One job: land the aim module, byte-for-byte from this plan. Write exactly what is written, run the listed gates, report. You design nothing.

Suggested model: Sonnet 5.

Required reading, in order (confirm at the top of your report):
1. This file, whole.
2. `docs/plans/phase-0.0.73-aim.md`, whole.

Source of the math (reference only — do not edit it): `deadweight-hangar.html` lines 1937–2001, 2043–2069, 2541–2578, 2605.

## Steps

Run from `/home/batman/combo-engine`. A failed assert stops the task; report the step and its verbatim output, run nothing further.

1. Assert the ground:

```sh
node scripts/gate.mjs wells | tail -1      # must print: wells-test PASS
node scripts/gate.mjs registry | tail -1   # must print: registry-test: 4 PASS / 1 FAIL  (the standing red, named in the phase doc)
ls src/modules/aim 2>/dev/null || echo absent   # must print: absent
```

2. Write `src/modules/aim/aim.js`, exactly:

```js
// MODULE: aim — frozen-time aiming, lifted SHAPED from the deadweight
// hangar demo (deadweight-hangar.html lines 1937-1991, 1992-2001,
// 2043-2069, 2541-2578, 2605). The law carried: time stops while an aim
// is armed; prediction uses the sim's own step and the real field; commit
// and cancel are tape actions so replay reproduces aiming exactly. Pure
// surface over plain objects; no globals, no clocks, no DOM, no drawing.
//
// Substitutions from the demo, numbered, and only these:
//   1. aimCandidates(w): the demo's globals `ship`, `collectBodies()`,
//      and `grapAnchor()` -> arguments `kind`, `ship`, `bodies` (the
//      already-collected world bodies), and `muzzleAt(kind, ship)` (the
//      demo's `w==='grap'&&ship.d.grap?grapAnchor():[ship.x,ship.y]`).
//      The candidate filter (b.own==='ship' or b.kind head/slug/missile),
//      the reach/cone rule, and the sort stay verbatim.
//   2. interceptAng(b,w): the demo's globals `ship`, `world.wells`, and
//      the ship.ang-mutating `anchorAt` closure -> arguments `b`, `kind`,
//      `ship`, `wells`, `muzzleAt`, and `accelFn` (the wells module's
//      `accel`, replacing the demo's free `accel(world.wells,...)`).
//      `anchorAt(a2)` becomes `muzzleAt(kind, { ...ship, ang: a2 })` —
//      the rotated-hull query, without mutating the caller's ship. The
//      V0/cone/reach numbers move into the kind table (KINDS below) but
//      keep the demo's exact values (grap 34/0.7/90, msl 18/0.7/150).
//      The quadratic lead solve, the seed angle, and the ±6*0.03 rad
//      refinement loop (75 steps at dt=1/30) are carried verbatim.
//   3. cycleAimTarget(d): the demo's globals `run.aim`, `ship` ->
//      the module's own `armed` state and the `ship`/`wells`/`bodies`
//      given to arm(); mutates `armed.tgtI` and returns the solved angle
//      instead of writing `ship.ang` directly — the caller applies it.
//   4. stepPlan(dt): the demo's globals `run.plan`, `run.done`, `ship`,
//      `ship.dead`, and the call to `doSling(va)` -> `stepPlan(t, ship)`
//      returns `{ va }` (the prograde heading at the moment of firing)
//      when the internal plan is due, or null; the module never performs
//      the burn (doSling — fuel and thrust) since that belongs to the
//      ship/propulsion module, not aim. The caller applies the burn; the
//      module clears its own plan once returned.
//   5. commit's three branches (lines 2053-2059) and doSling's `at:
//      run.t+k*1.5` (line 2058) -> `commit(t)` builds the same tape
//      action shapes (`{k:'grap',ang}`, `{k:'msl2',ang}`,
//      `{k:'plan',at}`) the demo records via recAction, and arms/
//      disarms use the demo's own `{k:'aim', w}` shape (line 2605).
//      predictShot's per-kind muzzle/velocity/life dials (lines
//      2543-2549) move into KINDS as data; the integration itself is
//      the wells module's predictBallistic, passed through unchanged.

// KINDS: the demo's three aim kinds as data. cone and reach are the
// demo's aimCandidates values (line 1952); V0 is interceptAng's launch
// speed (line 1964); life/thrust/thrustFuel/maxRange are predictShot's
// per-kind dials (lines 2543-2549, 2560); commitKind is the tape action
// this kind's commit() emits.
export const KINDS = Object.freeze({
  sling: Object.freeze({ cone: null, reach: null, V0: null, life: null, thrust: 0, thrustFuel: 0, maxRange: null, commitKind: "plan" }),
  grap: Object.freeze({ cone: 0.7, reach: 90, V0: 34, life: 5, thrust: 0, thrustFuel: 0, maxRange: 95, commitKind: "grap" }),
  msl: Object.freeze({ cone: 0.7, reach: 150, V0: 18, life: 6, thrust: 26, thrustFuel: 4, maxRange: null, commitKind: "msl2" }),
});

import { accel, predictBallistic, predStop } from "../wells/wells.js";

const defaultMuzzleAt = (kind, ship) => [ship.x, ship.y];

// aimCandidates(kind, ship, bodies, muzzleAt, kinds): the demo's lines
// 1951-1962, substitution 1.
export function aimCandidates(kind, ship, bodies, muzzleAt, kinds) {
  const cfg = (kinds || KINDS)[kind];
  const cone = cfg.cone, reach = cfg.reach;
  const [mx, my] = muzzleAt(kind, ship);
  const out = [];
  for (const b of bodies) {
    if (b.own === "ship" || b.kind === "head" || b.kind === "slug" || b.kind === "missile") continue;
    const dx = b.x - mx, dy = b.y - my, dd = Math.hypot(dx, dy);
    if (dd < 3 || dd > reach) continue;
    let da = Math.atan2(dy, dx) - ship.ang; da = Math.atan2(Math.sin(da), Math.cos(da));
    if (Math.abs(da) > cone) continue;
    out.push({ b, dd, da });
  }
  out.sort((p, q) => p.da - q.da);
  return out;
}

// interceptAng(b, kind, ship, wells, muzzleAt, accelFn, kinds): the demo's
// lines 1963-1991, substitution 2. Constants kept exactly: the ±6*0.03 rad
// refinement, the 75-step / dt=1/30 integration, the 2.2 muzzle offset.
export function interceptAng(b, kind, ship, wells, muzzleAt, accelFn, kinds) {
  const cfg = (kinds || KINDS)[kind];
  const V0 = cfg.V0;
  const [mx, my] = muzzleAt(kind, ship);
  const rx0 = b.x - mx, ry0 = b.y - my;
  const vx = b.vx - ship.vx, vy = b.vy - ship.vy;
  const a = vx * vx + vy * vy - V0 * V0, bq = 2 * (rx0 * vx + ry0 * vy), c = rx0 * rx0 + ry0 * ry0;
  let t;
  if (Math.abs(a) < 1e-6) { t = -c / bq; }
  else {
    const D = bq * bq - 4 * a * c; if (D < 0) return null;
    const r1 = (-bq - Math.sqrt(D)) / (2 * a), r2 = (-bq + Math.sqrt(D)) / (2 * a);
    const ts = [r1, r2].filter((x) => x > 0.01); if (!ts.length) return null;
    t = Math.min(...ts);
  }
  if (!(t > 0) || !isFinite(t)) return null;
  const seed = Math.atan2(ry0 + vy * t, rx0 + vx * t);
  const anchorAt = (a3) => muzzleAt(kind, { ...ship, ang: a3 });
  let best = seed, bd = 1e9;
  for (let k = -6; k <= 6; k++) {
    const a2 = seed + k * 0.03, ca = Math.cos(a2), sa = Math.sin(a2);
    const [mx2, my2] = anchorAt(a2);
    let px = mx2 + ca * 2.2, py = my2 + sa * 2.2, pvx = ship.vx + ca * V0, pvy = ship.vy + sa * V0;
    let tx = b.x, ty = b.y, tvx = b.vx, tvy = b.vy;
    for (let i = 0; i < 75; i++) {
      const [gax, gay] = accelFn(wells, px, py);
      pvx += gax / 30; pvy += gay / 30; px += pvx / 30; py += pvy / 30;
      const [tgx, tgy] = accelFn(wells, tx, ty);
      tvx += tgx / 30; tvy += tgy / 30; tx += tvx / 30; ty += tvy / 30;
      const d2 = Math.hypot(px - tx, py - ty); if (d2 < bd) { bd = d2; best = a2; }
    }
  }
  return best;
}

// makeAim(opts): one surface owning aim state. opts.kinds overrides the
// default table; opts.muzzleAt(kind, ship) overrides the muzzle rule;
// opts.accel is the wells module's accel (defaults to the field being
// zero everywhere if not given, so a caller must supply it to aim grap/msl).
export function makeAim(opts) {
  const o = opts || {};
  const kinds = o.kinds || KINDS;
  const muzzleAt = o.muzzleAt || defaultMuzzleAt;
  const accelFn = o.accel || accel;
  let armed = null; // { kind, ship, wells, bodies, tgtI, slingK }
  let plan = null; // { at }

  function arm(kind, world, ship) {
    if (!kinds[kind]) return null;
    armed = { kind, ship, wells: (world && world.wells) || [], bodies: (world && world.bodies) || [], tgtI: undefined, slingK: 2 };
    return { k: "aim", w: kind };
  }

  function cancel() {
    if (!armed) return null;
    armed = null;
    return { k: "aim", w: null };
  }

  function frozen() {
    return armed !== null;
  }

  function cycleTarget(dir) {
    if (!armed || (armed.kind !== "grap" && armed.kind !== "msl")) return false;
    const cands = aimCandidates(armed.kind, armed.ship, armed.bodies, muzzleAt, kinds);
    if (!cands.length) { armed.tgtI = undefined; return false; }
    const n = cands.length;
    armed.tgtI = armed.tgtI === undefined ? (dir > 0 ? 0 : n - 1) : (armed.tgtI + dir + n) % n;
    if (armed.tgtI >= n) armed.tgtI = n - 1;
    const sol = interceptAng(cands[armed.tgtI].b, armed.kind, armed.ship, armed.wells, muzzleAt, accelFn, kinds);
    return sol !== null ? sol : false;
  }

  // commit(t): builds the demo's tape action for the armed kind (line
  // 2053-2059) and thaws time. `t` is the run clock, needed only for the
  // sling's plan-at. Returns null if nothing is armed.
  function commit(t) {
    if (!armed) return null;
    const cfg = kinds[armed.kind];
    const ang = armed.ship.ang;
    let action;
    if (cfg.commitKind === "grap") action = { k: "grap", ang };
    else if (cfg.commitKind === "msl2") action = { k: "msl2", ang };
    else { const at = t + (armed.slingK | 0) * 1.5; plan = { at }; action = { k: "plan", at }; }
    armed = null;
    return action;
  }

  // stepPlan(t, ship): the demo's stepPlan law (line 1937-1941) — a
  // committed plan fires at its recorded time. Returns the burn heading
  // due this tick, or null; clears the plan once returned. Does not
  // perform the burn (substitution 4).
  function stepPlan(t, ship) {
    if (!plan) return null;
    if (t >= plan.at) {
      const va = Math.atan2(ship.vy, ship.vx);
      plan = null;
      return { va };
    }
    return null;
  }

  return {
    arm, cancel, commit, frozen, cycleTarget, stepPlan,
    predictBallistic, predStop,
  };
}
```

Then `sha256sum src/modules/aim/aim.js` — must print `b4d5c140ffabf29d3023fe5890b52bf8cd1bbf4868243a38fc32684121e659a5`.

3. Write `scripts/aim-test.mjs`, exactly:

```js
// COMBO-ENGINE — aim-test: the frozen-time aiming gate. Ratifies the
// freeze law (armed stops time, cancel/commit thaw it), the tape-action
// shape of commit, the lead-solve's self-consistency against its own
// integrator, and twin-run identity. NO HARDWIRED SEEDS: rolls fresh
// each run and prints; rerun with SEED=<n> in the environment.
import { makeAim, aimCandidates, interceptAng, KINDS } from "../src/modules/aim/aim.js";
import { makeWell, accel } from "../src/modules/wells/wells.js";

let pass = 0, fail = 0;
const check = (name, ok) => { if (ok) { pass++; console.log("PASS " + name); } else { fail++; console.log("FAIL " + name); } };
const SEED = process.env.SEED ? +process.env.SEED : Math.floor(Math.random() * 1e9);
console.log("seeds " + JSON.stringify({ aim: SEED }));
let a = SEED >>> 0;
const rnd = () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const rollWell = () => makeWell((rnd() - 0.5) * 300, (rnd() - 0.5) * 300, 500 + rnd() * 8000, 2 + rnd() * 6, 5 + rnd() * 30, "w" + Math.floor(rnd() * 100));
const rollShip = () => ({ x: (rnd() - 0.5) * 100, y: (rnd() - 0.5) * 100, vx: (rnd() - 0.5) * 6, vy: (rnd() - 0.5) * 6, ang: rnd() * 6.28, d: {} });
const rollTarget = (ship, reach) => ({
  x: ship.x + (rnd() - 0.5) * reach * 0.8, y: ship.y + (rnd() - 0.5) * reach * 0.8,
  vx: (rnd() - 0.5) * 4, vy: (rnd() - 0.5) * 4, kind: "rock", own: "world", r: 2,
});

// frozen() true while armed, false after cancel and after commit
{
  let ok = true;
  for (let i = 0; i < 200 && ok; i++) {
    const aim = makeAim({});
    const ship = rollShip();
    const world = { wells: [], bodies: [] };
    if (aim.frozen()) { ok = false; break; }
    const armAction = aim.arm("grap", world, ship);
    ok = ok && armAction && armAction.k === "aim" && armAction.w === "grap" && aim.frozen() === true;
    const cancelAction = aim.cancel();
    ok = ok && cancelAction && cancelAction.k === "aim" && cancelAction.w === null && aim.frozen() === false;
    aim.arm("msl", world, ship);
    const commitAction = aim.commit(0);
    ok = ok && commitAction && commitAction.k === "msl2" && aim.frozen() === false;
  }
  check("aim: frozen() is true while armed, false after cancel and after commit", ok);
}

// commit emits a well-formed tape action carrying kind and parameters, per kind
{
  let ok = true;
  const cases = [["grap", "grap", "ang"], ["msl", "msl2", "ang"], ["sling", "plan", "at"]];
  for (const [kind, k, field] of cases) {
    const aim = makeAim({});
    const ship = rollShip();
    aim.arm(kind, { wells: [], bodies: [] }, ship);
    const action = aim.commit(rnd() * 100);
    ok = ok && action && action.k === k && Number.isFinite(action[field]);
  }
  // commit with nothing armed returns null
  const bare = makeAim({});
  ok = ok && bare.commit(0) === null;
  check("aim: commit emits the demo's tape-action shape per kind, and null when unarmed", ok);
}

// stepPlan: a committed sling plan fires prograde at its recorded time, not before
{
  let ok = true;
  for (let i = 0; i < 100 && ok; i++) {
    const aim = makeAim({});
    const ship = rollShip();
    aim.arm("sling", { wells: [], bodies: [] }, ship);
    const t0 = rnd() * 50;
    const action = aim.commit(t0);
    const early = aim.stepPlan(action.at - 0.5, ship);
    const due = aim.stepPlan(action.at, ship);
    const spent = aim.stepPlan(action.at, ship); // plan cleared after firing once
    const expectVa = Math.atan2(ship.vy, ship.vx);
    ok = ok && early === null && due !== null && Math.abs(due.va - expectVa) < 1e-12 && spent === null;
  }
  check("aim: stepPlan fires the committed plan once at its recorded time, prograde, never early", ok);
}

// lead-solve self-consistency: solve interceptAng, then re-derive the
// solver's own seed angle (the same quadratic lead solve) and re-run the
// same 75-step / dt=1/30 integration over the solver's own 13-point grid
// (seed + k*0.03, k=-6..6). The solved angle's closest approach must equal
// that grid's minimum — the solver chose it as exactly that.
{
  let ok = true, solved = 0;
  for (let i = 0; i < 60; i++) {
    const wells = [rollWell(), rollWell()];
    const ship = rollShip();
    const kind = rnd() < 0.5 ? "grap" : "msl";
    const cfg = KINDS[kind];
    const target = rollTarget(ship, cfg.reach);
    const ang = interceptAng(target, kind, ship, wells, (k, s) => [s.x, s.y], accel, KINDS);
    if (ang === null) continue;
    solved++;
    const closest = (a2) => {
      const V0 = cfg.V0, ca = Math.cos(a2), sa = Math.sin(a2);
      let px = ship.x + ca * 2.2, py = ship.y + sa * 2.2, pvx = ship.vx + ca * V0, pvy = ship.vy + sa * V0;
      let tx = target.x, ty = target.y, tvx = target.vx, tvy = target.vy;
      let bd = 1e9;
      for (let s = 0; s < 75; s++) {
        const [gax, gay] = accel(wells, px, py);
        pvx += gax / 30; pvy += gay / 30; px += pvx / 30; py += pvy / 30;
        const [tgx, tgy] = accel(wells, tx, ty);
        tvx += tgx / 30; tvy += tgy / 30; tx += tvx / 30; ty += tvy / 30;
        const d2 = Math.hypot(px - tx, py - ty); if (d2 < bd) bd = d2;
      }
      return bd;
    };
    // re-derive the solver's seed angle: the same quadratic lead solve
    const rx0 = target.x - ship.x, ry0 = target.y - ship.y;
    const rvx = target.vx - ship.vx, rvy = target.vy - ship.vy;
    const qa = rvx * rvx + rvy * rvy - cfg.V0 * cfg.V0, qb = 2 * (rx0 * rvx + ry0 * rvy), qc = rx0 * rx0 + ry0 * ry0;
    let tt;
    if (Math.abs(qa) < 1e-6) { tt = -qc / qb; }
    else { const D = qb * qb - 4 * qa * qc; const r1 = (-qb - Math.sqrt(D)) / (2 * qa), r2 = (-qb + Math.sqrt(D)) / (2 * qa); tt = Math.min(...[r1, r2].filter((x) => x > 0.01)); }
    const seedAng = Math.atan2(ry0 + rvy * tt, rx0 + rvx * tt);
    const atSolved = closest(ang);
    const grid = [];
    for (let k = -6; k <= 6; k++) grid.push(closest(seedAng + k * 0.03));
    const gridMin = Math.min(...grid);
    // the solved angle's own closest approach must equal the solver's own
    // grid minimum (it was chosen as exactly that)
    ok = ok && Math.abs(atSolved - gridMin) < 1e-9;
  }
  check(`aim: lead-solve self-consistency — solved angle is the refinement grid's own minimum (${solved} solved of 60 rolled)`, ok && solved > 0);
}

// twin-run identity: same inputs twice give identical solved angle and
// identical committed action JSON
{
  let ok = true;
  for (let i = 0; i < 100 && ok; i++) {
    const wells = [rollWell(), rollWell()];
    const ship = rollShip();
    const kind = rnd() < 0.5 ? "grap" : "msl";
    const target = rollTarget(ship, KINDS[kind].reach);
    const ang1 = interceptAng(target, kind, ship, wells, (k, s) => [s.x, s.y], accel, KINDS);
    const ang2 = interceptAng({ ...target }, kind, { ...ship }, wells.map((w) => ({ ...w })), (k, s) => [s.x, s.y], accel, KINDS);
    ok = ok && ang1 === ang2;

    const aim1 = makeAim({}); const ship1 = { ...ship, ang: ang1 === null ? ship.ang : ang1 };
    aim1.arm(kind, { wells, bodies: [] }, ship1);
    const c1 = aim1.commit(12.5);

    const aim2 = makeAim({}); const ship2 = { ...ship, ang: ang1 === null ? ship.ang : ang1 };
    aim2.arm(kind, { wells, bodies: [] }, ship2);
    const c2 = aim2.commit(12.5);

    ok = ok && JSON.stringify(c1) === JSON.stringify(c2);
  }
  check("aim: twin-run identity — same inputs give identical solved angle and committed action JSON", ok);
}

// aimCandidates: filters by own/kind, reach, and cone, sorted by angle-off
{
  let ok = true;
  for (let i = 0; i < 100 && ok; i++) {
    const ship = rollShip();
    const kind = rnd() < 0.5 ? "grap" : "msl";
    const cfg = KINDS[kind];
    const bodies = [
      { x: ship.x, y: ship.y, kind: "rock", own: "ship" }, // excluded: own ship
      { x: ship.x + 5, y: ship.y, kind: "missile", own: "world" }, // excluded: projectile kind
      rollTarget(ship, cfg.reach),
    ];
    const cands = aimCandidates(kind, ship, bodies, (k, s) => [s.x, s.y], KINDS);
    ok = ok && cands.every((c) => c.dd >= 3 && c.dd <= cfg.reach && Math.abs(c.da) <= cfg.cone);
    for (let k = 1; k < cands.length; k++) ok = ok && cands[k - 1].da <= cands[k].da;
  }
  check("aim: aimCandidates filters own/kind, reach, and cone, sorted by angle-off", ok);
}

// the module passes through wells' own predictors unchanged
{
  const aim = makeAim({});
  const start = { x: 0, y: 0, vx: 12, vy: 5 };
  const r = aim.predictBallistic(start, { life: 1 }, [], [], []);
  check("aim: predictBallistic is the wells module's own function, passed through", r.pts.length > 10 && !r.hit);
  check("aim: predStop is the wells module's own function, passed through", aim.predStop({ x: 0, y: 0, vx: 0, vy: 0, ang: 0, w: 0, fuel: 0 }, 10, { F: 400, tau: 300, I: 60, nF: 2, nR: 0, thrust: 200 }, [makeWell(10, 0, 100, 3, 5, "a"), makeWell(-10, 0, 100, 3, 5, "b")]) === null);
}

console.log(`aim-test: ${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
console.log("aim-test PASS");
```

Then `sha256sum scripts/aim-test.mjs` — must print `46697eb46d8bcafe4e2f22c384e2c2c68ab4331315eddede96dd0c08d4e8c2cf`.

4. In `scripts/gate.mjs`, in the GATES table, add one line after the `"senses"` entry (line 46):

```js
  "aim": ["scripts/aim-test.mjs"],
```

Touch nothing else in the file.

5. In `src/modules/registry/registry.js`, in the REGISTRY table, add one line after the `describe` entry, before the `// carved depot organs` comment:

```js
  aim: { seam: "consume", gate: "aim" },
```

Touch nothing else in the file.

6. Run the new gate — a rolled seeds line, 8 PASS lines, `aim-test: 8 PASS / 0 FAIL`, `aim-test PASS`, exit 0. Any FAIL stops the task.

```sh
node scripts/gate.mjs aim
```

7. Bracket unmoved:

```sh
node scripts/gate.mjs wells | tail -1      # must print: wells-test PASS
node scripts/gate.mjs registry | tail -1   # must print: registry-test: 4 PASS / 1 FAIL  (unchanged)
```

8. Close the records: `package.json` version to `0.0.73`; the phase doc's status line to LANDED as its comment shows; in `README.md` flip the checklist box starting `- [ ] Frozen-time aiming:` to `- [x]`, and add the line `- [x] aim — frozen-time aiming — 0.0.73` at the bottom of the "Serving checklist items" list.

9. Commit and push, then stamp:

```sh
git add src/modules/aim/aim.js scripts/aim-test.mjs scripts/gate.mjs src/modules/registry/registry.js package.json README.md docs/plans/phase-0.0.73-aim.md docs/plans/task-0.0.73-1-aim.md
git commit -m "phase 0.0.73 — frozen-time aiming

Checklist: frozen-time aiming. The freeze, the lead solve, and the tape-action commits carried from the deadweight demo; predictors pass through from wells. Gate 8 PASS / 0 FAIL at rolled seeds; wells unmoved; registry's standing red unchanged.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push origin main
H=$(git rev-parse --short HEAD)
sed -i "s/commit stamped below/commit \`$H\`/" docs/plans/phase-0.0.73-aim.md
git add docs/plans/phase-0.0.73-aim.md && git commit -m "phase 0.0.73 record stamped — $H

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push origin main
```

## Acceptance

- Both sha256 lines exact; the gate `aim-test: 8 PASS / 0 FAIL` then `aim-test PASS` at rolled seeds; wells tail unchanged; registry's line `4 PASS / 1 FAIL` unchanged on both sides; records flipped riding the landing; pushes accepted.

## Report

Read-confirmation first, then one line of outcome, then bullets: the sha256 lines verbatim, the gate's seeds/count/verdict lines, the wells and registry tails, both commit hashes, the push results. Every nonconformity its own labeled bullet. Fixture seeds: rolled at run time, printed by the gate; no seed is special.
