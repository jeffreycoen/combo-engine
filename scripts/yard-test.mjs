// COMBO-ENGINE — yard-test: the combination proof, the closing phase of the
// general parts order. One scenario wires ten parts from four demos by
// hand, the way a game would, on plain data: fleet units fly a course over
// a greybox floor; rounds fired through a handed material table carve
// voxels and settle the pile; a ledger audits every round; every order
// rides a tape; the state hash is the proof. Seven checks: twin identity,
// tape replay, zero-drift books, honest impacts, a carved wall, a second
// material table, and the import roll-call. No page, no timers, no
// unseeded random: every draw comes from the sim stream of the run's seed.
import { makeUnit, orderMove, resolveMode, arriveMove } from "../src/modules/orders/orders.js";
import { attachMotion, stepMove, stepIdle } from "../src/modules/steering/steering.js";
import { partWall, partColumn, buildSolids } from "../src/modules/greybox/greybox.js";
import { makeHit } from "../src/modules/solids/solids.js";
import { Ballistics, ROUNDS, MEDIA, EV_PERFORATE, EV_EMBED, EV_RICOCHET, EV_EXPIRE } from "../src/modules/ballistics/ballistics.js";
import { makeVoxWorld, makeWorldQuery } from "../src/modules/voxel/voxel.js";
import { settleWorld } from "../src/modules/support/support.js";
import { makeLedger } from "../src/modules/ledger/ledger.js";
import { makeTape, replayTape } from "../src/modules/tape/tape.js";
import { simStream, stateHash } from "../src/modules/determinism/determinism.js";
import { readFileSync } from "node:fs";

let pass = 0, fail = 0;
const check = (name, ok) => { if (ok) { pass++; console.log("PASS " + name); } else { fail++; console.log("FAIL " + name); } };
const SEED = process.env.SEED ? (parseInt(process.env.SEED, 10) >>> 0) : ((Math.random() * 0xffffffff) >>> 0);
console.log(`seeds {"yard":${SEED}}`);

const TICKS = 90, DT = 1 / 60, MAG = 8;
const SPEC = { raider: { hp: 30, speed: 0.5, dmg: 1, range: 30, turnRate: 3, accel: 0.4, strafeRadius: 0, strafeRate: 0.7, guardRate: 0.5, idleRate: 1 } };
const WALL_POINT = [0, 1.2, 12];
const ORDERS = [{ t: 0, k: "move", x: 0, y: 1.2, z: 4 }];
const d3 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

// the yard's own media table: air, then a wall and a post row rolled inside the ballistics contract's bounds
function rollMedia(rng) {
  const roll = (lo, hi) => lo + rng() * (hi - lo);
  const row = (name) => ({ name, rho: roll(500, 8000), cd: roll(0.5, 1.5), yieldV: roll(1e5, 1e9), ricochetDeg: roll(0, 30), shatterV: roll(0, 1500), deformV: roll(100, 400), areaMult: roll(1, 4), retain: roll(0.2, 0.6) });
  return [{ ...MEDIA[0] }, row("wall"), row("post")];
}

// the floor: a one-floor wall of width 12 whose front face sits at z 12, and two posts
function buildLevel() {
  return [
    ...partWall("w", 0, 12, 12, 1, 1, { glassM: 1 }),
    ...partColumn("cL", -4, 8, 0, 3, 0.3, "concrete", 2),
    ...partColumn("cR", 4, 8, 0, 3, 0.3, "concrete", 2),
  ];
}

// runYard(seed, { media, actions }): the whole scenario, 90 ticks of 1/60.
export function runYard(seed, opts) {
  const o = opts || {};
  const rng = simStream(seed);
  const media = o.media || rollMedia(rng);
  const level = buildLevel();
  let built = buildSolids(level);
  const rec = makeHit();
  const vox = makeVoxWorld({ rng, media, hit: rec });
  const query = makeWorldQuery(() => built.solids, () => vox.fields, rec);
  const engine = new Ballistics({ media, rounds: ROUNDS, pool: 64, scatter: false, solids: built.solids, query, hit: rec });
  const units = [-3, 0, 3].map((x) => {
    const u = makeUnit(SPEC, "raider", [x, 1.2, -6]);
    attachMotion(u, SPEC.raider, [0, 0, 1], 0, 1, rng() * 6.28);
    u.rounds = MAG;
    return u;
  });
  const tape = makeTape();
  const books = makeLedger({ dimensions: ["rounds"] });
  let spent = 0;
  books.declare("rounds", MAG * units.length);
  books.source("magazine", () => ({ rounds: units.reduce((s, u) => s + u.rounds, 0) }));
  books.source("live", () => ({ rounds: engine.liveCount }));
  books.source("spent", () => ({ rounds: spent }));
  books.seal();
  const events = [];
  let hits = 0, ledgerOk = true, lastAudit = null;
  const primOf = (solid) => {
    if (solid < 0) return null;
    if (solid < built.solids.length) return level[built.map[solid]] || null;
    const f = vox.fields[solid - built.solids.length];
    return f ? f.prim : null;
  };
  function tickOnce() {
    for (const u of units) {
      const mode = resolveMode(u);
      if (mode === "move") { stepMove(u, DT); arriveMove(u); }
      else if (mode === "idle") stepIdle(u, DT);
    }
    for (const u of units) {
      if (u.rounds > 0 && d3(u.pos, WALL_POINT) < u.range) {
        const seed = Math.floor(rng() * 4294967296);
        const before = engine.liveCount;
        engine.fire("hostile_rifle", u.pos[0], u.pos[1], u.pos[2], WALL_POINT[0] - u.pos[0], WALL_POINT[1] - u.pos[1], WALL_POINT[2] - u.pos[2], seed);
        if (engine.liveCount === before) spent++;          // the pool recycled a live slot
        u.rounds--;
      }
    }
    engine.stepTick(); engine.stepTick();
    const ev = engine.ev;
    let damaged = false;
    for (let k = 0; k < ev.n; k++) {
      const type = ev.type[k];
      if (type === EV_PERFORATE || type === EV_EMBED || type === EV_RICOCHET) events.push({ type, mat: ev.mat[k], ein: ev.ein[k], eout: ev.eout[k] });
      if (type === EV_EMBED || type === EV_EXPIRE) spent++;
      if (type === EV_PERFORATE || type === EV_EMBED) {
        const pr = primOf(ev.solid[k]);
        if (pr) { vox.damage(pr, ev.x[k], ev.y[k], ev.z[k], ev.ein[k] - ev.eout[k], ev.ix[k], ev.iy[k], ev.iz[k]); hits++; damaged = true; }
      }
    }
    engine.drain();
    if (damaged) { built = buildSolids(level); engine.solids = built.solids; }
    settleWorld(level, (pr) => vox.dropPrimAsCluster(pr), () => {});
    vox.step(DT, built.solids);
    vox.stepClusters(DT, built.solids);
    lastAudit = books.audit();
    if (!lastAudit.ok) ledgerOk = false;
  }
  const actions = o.actions || ORDERS;
  replayTape(actions, {
    apply(a) { tape.record(a.t, a.k, { x: a.x, y: a.y, z: a.z }); if (a.k === "move") orderMove(units, a.x, a.y, a.z); },
    step() { tickOnce(); },
  }, TICKS);
  const rows = [];
  for (const u of units) rows.push([u.pos[0], u.pos[1], u.pos[2], u.currentSpeed]);
  for (let i = 0; i < engine.pool; i++) if (engine.act[i]) rows.push([engine.px[i], engine.py[i], engine.pz[i]]);
  rows.push([vox.dyn.length, vox.clusters.length, vox.rubble.length]);
  rows.push([lastAudit && lastAudit.drift ? lastAudit.drift.rounds : -1]);   // the audit's own number: its drift
  rows.push([tape.length]);
  const carved = vox.fields.some((f) => f.prim.id && f.prim.id[0] === "w" && f.frac < 1);
  return { hash: stateHash(rows), events, ledgerOk, hits, carved, tape: tape.actions, audit: lastAudit };
}

const rng = simStream(SEED);
const honest = (r) => r.events.every((e) => e.mat >= 0 && e.mat <= 2 && e.eout <= e.ein);
const A = runYard(SEED), A2 = runYard(SEED);

{ // 1. twin runs from one rolled seed end with one state hash
  check("yard: twin runs from one rolled seed end with one state hash", A.hash === A2.hash && A.events.length === A2.events.length && A.hash >>> 0 === A.hash);
}
{ // 2. replay from seed plus tape reproduces the hash
  const B = runYard(SEED, { actions: A.tape });
  check("yard: replay from seed plus tape reproduces the hash", B.hash === A.hash && A.tape.length === 1 && A.tape[0].k === "move");
}
{ // 3. the ledger audits to zero drift at every tick
  check("yard: the ledger audits to zero drift at every tick", A.ledgerOk === true && A.audit && A.audit.drift.rounds === 0);
}
{ // 4. every impact carries a material from the handed table and energy out at most in
  check("yard: every impact carries a material from the handed table and energy out at most in", A.events.length > 0 && honest(A));
}
{ // 5. rounds reach the wall and carve it
  check("yard: rounds reach the wall and carve it", A.hits >= 1 && A.carved === true);
}
{ // 6. a second rolled media table keeps every law
  const media = rollMedia(rng);
  const C = runYard(SEED, { media }), C2 = runYard(SEED, { media });
  check("yard: a second rolled media table keeps every law", C.hash === C2.hash && C.events.length === C2.events.length && C.ledgerOk === true && C.events.length > 0 && honest(C));
}
{ // 7. parts from four demos compose in this one gate
  const src = readFileSync(new URL(import.meta.url), "utf8");
  const folders = [...src.matchAll(/^import[^;]*?from\s+"\.\.\/src\/modules\/([a-z0-9-]+)\//gm)].map((m) => m[1]).sort();
  const want = ["ballistics", "determinism", "greybox", "ledger", "orders", "solids", "steering", "support", "tape", "voxel"];
  const others = [...src.matchAll(/^import[^;]*?from\s+"([^"]+)"/gm)].map((m) => m[1]).filter((s) => !s.startsWith("../src/modules/"));
  check("yard: parts from four demos compose in this one gate", JSON.stringify(folders) === JSON.stringify(want) && others.length === 1 && others[0] === "node:fs");
}

console.log(`yard-test: ${pass} PASS / ${fail} FAIL`);
console.log(fail === 0 ? "yard-test PASS" : "yard-test FAIL");
process.exit(fail === 0 ? 0 : 1);
