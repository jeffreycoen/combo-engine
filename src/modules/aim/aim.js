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
//
// Second pass under the general parts order, phase A7, numbered
// separately:
//   1. The candidate filter (b.own==='ship' or kind head/slug/missile)
//      is named DEFAULT_SKIP and handed to aimCandidates as skip,
//      default DEFAULT_SKIP.
//   2. The near-range literal 3 becomes minRange, an aimCandidates and
//      makeAim option, default 3.
//   3. The tape action's kind literal "aim" (arm and cancel) becomes
//      armAction, a makeAim option, default "aim".
//   4. KINDS_CONTRACT names the kind table's shape; checkKinds(table)
//      checks it.

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

export const KINDS_CONTRACT = { "<kind>": { cone: "number or null", reach: "number or null", V0: "number or null", life: "number or null", thrust: "number >= 0", thrustFuel: "number >= 0", maxRange: "number or null", commitKind: "string" } };

export function checkKinds(table) {
  const problems = [];
  if (typeof table !== "object" || table === null) { problems.push("kinds: not an object"); return problems; }
  for (const k of Object.keys(table)) {
    const cfg = table[k];
    for (const f of ["cone", "reach", "V0", "life"]) {
      if (!(cfg[f] === null || typeof cfg[f] === "number")) problems.push(`kinds.${k}.${f}: number or null required`);
    }
    for (const f of ["thrust", "thrustFuel"]) {
      if (!(typeof cfg[f] === "number" && cfg[f] >= 0)) problems.push(`kinds.${k}.${f}: number >= 0 required`);
    }
    if (!(cfg.maxRange === null || typeof cfg.maxRange === "number")) problems.push(`kinds.${k}.maxRange: number or null required`);
    if (typeof cfg.commitKind !== "string") problems.push(`kinds.${k}.commitKind: string required`);
  }
  return problems;
}

import { accel, predictBallistic, predStop } from "../wells/wells.js";

export const DEFAULT_SKIP = (b) => b.own === "ship" || b.kind === "head" || b.kind === "slug" || b.kind === "missile";

const defaultMuzzleAt = (kind, ship) => [ship.x, ship.y];

// aimCandidates(kind, ship, bodies, muzzleAt, kinds): the demo's lines
// 1951-1962, substitution 1.
export function aimCandidates(kind, ship, bodies, muzzleAt, kinds, skip = DEFAULT_SKIP, minRange = 3) {
  const cfg = (kinds || KINDS)[kind];
  const cone = cfg.cone, reach = cfg.reach;
  const [mx, my] = muzzleAt(kind, ship);
  const out = [];
  for (const b of bodies) {
    if (skip(b)) continue;
    const dx = b.x - mx, dy = b.y - my, dd = Math.hypot(dx, dy);
    if (dd < minRange || dd > reach) continue;
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
  const skip = o.skip || DEFAULT_SKIP;
  const minRange = o.minRange === undefined ? 3 : o.minRange;
  const armAction = o.armAction || "aim";
  let armed = null; // { kind, ship, wells, bodies, tgtI, slingK }
  let plan = null; // { at }

  function arm(kind, world, ship) {
    if (!kinds[kind]) return null;
    armed = { kind, ship, wells: (world && world.wells) || [], bodies: (world && world.bodies) || [], tgtI: undefined, slingK: 2 };
    return { k: armAction, w: kind };
  }

  function cancel() {
    if (!armed) return null;
    armed = null;
    return { k: armAction, w: null };
  }

  function frozen() {
    return armed !== null;
  }

  function cycleTarget(dir) {
    if (!armed || (armed.kind !== "grap" && armed.kind !== "msl")) return false;
    const cands = aimCandidates(armed.kind, armed.ship, armed.bodies, muzzleAt, kinds, skip, minRange);
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
