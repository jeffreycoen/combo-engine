// COMBO-ENGINE — aim-test: the frozen-time aiming gate. Ratifies the
// freeze law (armed stops time, cancel/commit thaw it), the tape-action
// shape of commit, the lead-solve's self-consistency against its own
// integrator, and twin-run identity. NO HARDWIRED SEEDS: rolls fresh
// each run and prints; rerun with SEED=<n> in the environment.
import { makeAim, aimCandidates, interceptAng, KINDS, DEFAULT_SKIP, checkKinds } from "../src/modules/aim/aim.js";
import { makeWell, accel } from "../src/modules/wells/wells.js";
import fs from "node:fs";

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

// a rolled arm action name comes back from arm and cancel
{
  let ok = true;
  for (let i = 0; i < 50 && ok; i++) {
    const name = "arm" + Math.floor(rnd() * 1e6);
    const aim = makeAim({ armAction: name });
    const ship = rollShip();
    const world = { wells: [], bodies: [] };
    const armed = aim.arm("grap", world, ship);
    ok = ok && armed && armed.k === name && armed.w === "grap";
    const cancelled = aim.cancel();
    ok = ok && cancelled && cancelled.k === name && cancelled.w === null;
  }
  check("aim: a rolled arm action name comes back from arm and cancel", ok);
}

// a handed skip predicate filters a rolled body set exactly
{
  let ok = true;
  for (let i = 0; i < 100 && ok; i++) {
    const ship = rollShip();
    const kind = rnd() < 0.5 ? "grap" : "msl";
    const cfg = KINDS[kind];
    const bodies = [];
    for (let j = 0; j < 8; j++) {
      const dist = 3.1 + rnd() * (cfg.reach - 3.2);
      const t = rollTarget(ship, cfg.reach);
      bodies.push({ ...t, x: ship.x + Math.cos(ship.ang) * dist, y: ship.y + Math.sin(ship.ang) * dist, tag: Math.floor(rnd() * 3), id: j });
    }
    const skip = (b) => b.tag === 1;
    const cands = aimCandidates(kind, ship, bodies, (k, s) => [s.x, s.y], KINDS, skip);
    const gotIds = cands.map((c) => c.b.id).sort((x, y) => x - y);
    const wantIds = bodies.filter((b) => b.tag !== 1).map((b) => b.id).sort((x, y) => x - y);
    ok = ok && JSON.stringify(gotIds) === JSON.stringify(wantIds) && cands.every((c) => c.b.tag !== 1);
  }
  check("aim: a handed skip predicate filters a rolled body set exactly", ok);
}

// a rolled minimum range excludes bodies inside it
{
  let ok = true;
  for (let i = 0; i < 100 && ok; i++) {
    const ship = rollShip();
    const kind = rnd() < 0.5 ? "grap" : "msl";
    const minRange = 1 + rnd() * 9;
    const near = { x: ship.x + Math.cos(ship.ang) * minRange * 0.9, y: ship.y + Math.sin(ship.ang) * minRange * 0.9, kind: "rock", own: "world" };
    const far = { x: ship.x + Math.cos(ship.ang) * minRange * 1.1, y: ship.y + Math.sin(ship.ang) * minRange * 1.1, kind: "rock", own: "world" };
    const cands = aimCandidates(kind, ship, [near, far], (k, s) => [s.x, s.y], KINDS, DEFAULT_SKIP, minRange);
    const hasNear = cands.some((c) => c.b === near);
    const hasFar = cands.some((c) => c.b === far);
    ok = ok && !hasNear && hasFar;
  }
  check("aim: a rolled minimum range excludes bodies inside it", ok);
}

// the contract counts every problem
{
  const broken = checkKinds({ z: { cone: "a", reach: null, V0: 1, life: -1, thrust: -1, thrustFuel: 0, maxRange: "m", commitKind: 5 } });
  const clean = checkKinds(KINDS);
  const notObj = checkKinds(null);
  const ok = broken.length === 4 && clean.length === 0 && notObj.length === 1;
  check("aim: the contract counts every problem", ok);
}

// the module imports only from its own folder or a sibling module
{
  const src = fs.readFileSync(new URL("../src/modules/aim/aim.js", import.meta.url), "utf8");
  const specifiers = [...src.matchAll(/import\s+[^'"]*from\s+["']([^"']+)["']/g)].map((m) => m[1]);
  const ok = specifiers.length > 0 && specifiers.every((s) => /^\.\.\/[a-z0-9-]+\//.test(s) || /^\.\//.test(s));
  check("aim: the module imports only from its own folder or a sibling module", ok);
}

console.log(`aim-test: ${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
console.log("aim-test PASS");
