# Task 0.0.23-1 — the display tells the truth: the estimate corrected and audited

One job: land FL-3 exactly as printed — the corrected chance-to-hit formula, the live-fire audit script, one pinned gate check. Three files, all printed whole. The final hashes are the acceptance. You design nothing.

This document lives at `docs/plans/task-0.0.23-1-audit.md` when the task lands; the phase frame is `docs/plans/phase-0.0.23-frostline-3.md` (served with this plan; copied in at landing).

## Required reading, verified in the tree

1. This document, whole.
2. The phase frame, whole.
3. `src/games/frostline/cover.js` — the file replaced whole.

Your report opens with a read-confirmation naming these.

## Steps

**Step 1 — green before anything moves.** `node scripts/gate.mjs frostline` must print `frostline-test: 28 PASS / 0 FAIL`, `frostline-test PASS`, exit 0. This run takes minutes on this machine — do not conclude failure from slowness. Any other result stops the task.

**Step 2 — the corrected formula.** Replace `src/games/frostline/cover.js` whole with:

```js
// games/frostline/cover.js — FROSTLINE's cover read and hit estimate.
// Cover is geometry: the same solids and terrain the live rounds fly
// through, sampled with the engine's own primitives (solidBlocksPoint,
// scatterSigma, accuracy.js). The displayed number is an ESTIMATE built
// from the facts the sim actually uses — never a rule the sim obeys; the
// rounds stay physical.
import { scatterSigma } from "../../depot/accuracy.js";
import { seenAt } from "../../depot/sight.js";
import { INFANTRY_ARMS } from "../../depot/specs.js";

// The silhouette: three heights of a standing man above his ground.
const SILHOUETTE = [0.35, 1.0, 1.65];
const SEG_SAMPLES = 8;
const SOLID_KINDS = new Set(["rock", "wall", "tower", "tree", "chunk"]);

// segBoxT(m, tx, ty, tz, b): exact segment-against-box slab test — thin
// walls never slip between samples (the trial's own finding: point samples
// 1.15 m apart stepped clean over a 0.4 m wall).
function segBoxT(m, tx, ty, tz, b) {
  const dx = tx - m.x, dy = ty - m.y, dz = tz - m.z;
  let t0 = 0.08, t1 = 0.95;
  const axes = [[m.x, dx, b.pos.x, b.hx], [m.y, dy, b.pos.y, b.hy], [m.z, dz, b.pos.z, b.hz]];
  for (const [o, d, c, h] of axes) {
    if (d > -1e-9 && d < 1e-9) { if (Math.abs(o - c) > h) return false; continue; }
    let a = (c - h - o) / d, bb = (c + h - o) / d;
    if (a > bb) { const tmp = a; a = bb; bb = tmp; }
    if (a > t0) t0 = a;
    if (bb < t1) t1 = bb;
    if (t0 > t1) return false;
  }
  return true;
}

// lineBlocked(world, muzzle, tx, ty, tz): the shield's ray, one silhouette
// height — exact against static solids, sampled against terrain.
function lineBlocked(world, m, tx, ty, tz, selfId) {
  for (let k = 1; k <= SEG_SAMPLES; k++) {
    const t = 0.12 + (k / SEG_SAMPLES) * 0.82;
    const sx = m.x + (tx - m.x) * t, sy = m.y + (ty - m.y) * t, sz = m.z + (tz - m.z) * t;
    if (world.field.heightAt(sx, sz) > sy + 0.15) return true;
  }
  for (const b of world.bodies) {
    if (!b.alive || (selfId != null && b.id === selfId)) continue;
    if (!SOLID_KINDS.has(b.kind)) continue;
    if (b.invM > 0 && b.kind !== "chunk" && b.kind !== "tree") continue;
    if (segBoxT(m, tx, ty, tz, b)) return true;
  }
  return false;
}

// exposure(world, muzzle, x, z, selfId) -> fraction of the silhouette the
// threat can reach, 0..1 in thirds.
export function exposure(world, m, x, z, selfId) {
  const gy = world.field.heightAt(x, z);
  let open = 0;
  for (const h of SILHOUETTE) if (!lineBlocked(world, m, x, gy + h, z, selfId)) open++;
  return open / SILHOUETTE.length;
}

// coverAt(world, muzzle, x, z) -> "open" | "half" | "full" — the shield.
export function coverAt(world, m, x, z, selfId) {
  const e = exposure(world, m, x, z, selfId);
  if (e >= 0.99) return "open";
  if (e > 0.01) return "half";
  return "full";
}

// knownThreats(war) -> living enemy units the player side has actually seen
// (the sight map, canonical coordinates through map.invW — never world).
export function knownThreats(war) {
  const out = [];
  const sight = war.T.sight;
  if (!sight) return out;
  for (const b of war.world.bodies) {
    if (b.kind !== "unit" || !b.alive || b.team !== 2) continue;
    const c = war.map.invW(b.pos.x, b.pos.z);
    if (seenAt(sight, c.u, c.v, 1)) out.push(b);
  }
  return out;
}

// muzzleOf(world, b) -> the firing point convention: chest height.
export function muzzleOf(world, b) {
  return { x: b.pos.x, y: b.pos.y + 0.4, z: b.pos.z };
}

// destShield(war, x, z) -> the worst shield at a point against every known
// threat — what the move confirmation shows. No threats seen: "open" is
// honest and unlabeled danger is none.
export function destShield(war, x, z) {
  const threats = knownThreats(war);
  if (!threats.length) return "open";
  let worst = 1;
  for (const t of threats) {
    const e = exposure(war.world, muzzleOf(war.world, t), x, z, t.id);
    if (e < worst) worst = e;
  }
  if (worst >= 0.99) return "open";
  if (worst > 0.01) return "half";
  return "full";
}

// hitChance(war, shooter, target, armsRow) -> 0..1 estimate, audited
// against live fire (FL-3). The engine deflects each round by a radial
// angle whose magnitude is Rayleigh-shaped (applyScatter: sqrt(-2 ln U)
// times 0.6*sigma, uniform direction), and a round landing within
// HIT_REACH of the aim still tells — silhouette half-width plus blast
// radius plus splash. So P(hit) = 1 - exp(-theta^2 / (2 s^2)) with
// theta = HIT_REACH/dist and s = 0.6*sigma; silhouette exposure scales
// it; clamped to [0.02, 0.98] — war never promises certainty. HIT_REACH
// is the audit's own fit: the measured rates at 8, 14, and 20 m imply
// 0.79-0.84 m; 0.82 sits inside every band. // provisional (F5)
const HIT_REACH = 0.82;
export function hitChance(war, shooter, target, armsRow) {
  const spec = armsRow || INFANTRY_ARMS.rifles;
  const m = muzzleOf(war.world, shooter);
  const aim = { x: target.pos.x, y: target.pos.y + 0.3, z: target.pos.z };
  const dist = Math.hypot(aim.x - m.x, aim.z - m.z);
  if (dist < 0.5) return 0.98;
  const sigma = scatterSigma(war.world, m, aim, spec);
  const s = Math.max(1e-6, 0.6 * sigma);
  const theta = HIT_REACH / dist;
  const pGeom = 1 - Math.exp(-(theta * theta) / (2 * s * s));
  const e = exposure(war.world, m, target.pos.x, target.pos.z, shooter.id);
  return Math.min(0.98, Math.max(0.02, pGeom * e));
}
```

**Step 3 — the gate's pinned check.** Replace `scripts/frostline-test.mjs` whole with:

```js
// COMBO-ENGINE — frostline-test: FL-1's gate — the mission, the turns, the
// cover read, the hit estimate. Sixteen checks. Seed 3 is MISSION_R1's
// field; no seed is special. Pins ride worldHash (id-free) and mission
// facts — never runHash: squads carry member ids from the engine's
// module-global body counter, which shifts across boots in one process
// while the sim itself stays bit-identical.
import { tickWar, defaultTickInput } from "../src/depot/api.js";
import { worldHash, addBody } from "../src/engine/core.js";
import { bootMission, missionState, MISSION_R1, openGround, connected } from "../src/games/frostline/mission.js";
import { orderMove, orderDone, pickSquad } from "../src/games/frostline/command.js";
import { makeTriggerState, checkTriggers } from "../src/games/frostline/pause.js";
import { makeTurns, startTurns, apOf, spend, clampMove, beginExec, stepExec, stepEnemy, heldInput, TURNS } from "../src/games/frostline/turns.js";
import { coverAt, exposure, hitChance, knownThreats } from "../src/games/frostline/cover.js";
import { setOverwatch, clearOverwatch, OVERWATCH, inArc, applyFireControl, toggleDiscipline, markTarget, markedTarget, focusOrder, owPaths } from "../src/games/frostline/verbs.js";
import { squadFire } from "../src/depot/state.js";
import { arcClears } from "../src/depot/accuracy.js";
import { INFANTRY_ARMS } from "../src/depot/specs.js";

let pass = 0, fail = 0;
const check = (name, ok) => { if (ok) { pass++; console.log("PASS " + name); } else { fail++; console.log("FAIL " + name); } };
const near = (a, b, e) => Math.abs(a - b) < (e || 1e-9);
const STEP = 1 / 120;

{ const { war, mission } = bootMission(MISSION_R1);
  const s = missionState(war, mission);
  check("boot: three squads, eight friendlies, four blockers, nobody won, the world pins",
    war.run.squads.length === 3 && s.friendlies === 8 && s.enemies === 4
    && !s.won && !s.lost && worldHash(war.world) === 2024034825);
  check("nothing is known at boot: the sight map has seen no enemy", knownThreats(war).length === 0);
  check("pick: a tap on the rifles takes them", pickSquad(war.run.squads, war.run.squads[0].anchor.x, war.run.squads[0].anchor.z) === war.run.squads[0]); }

{ const ts = makeTurns();
  check("the war starts in free time", ts.phase === "free" && ts.turn === 0);
  const squads = [{ id: 7, anchor: { x: 0, z: 0 } }, { id: 9, anchor: { x: 5, z: 0 } }];
  startTurns(ts, squads);
  check("first contact starts the turns: orders phase, three points a squad",
    ts.phase === "orders" && ts.turn === 1 && apOf(ts, squads[0]) === TURNS.ap && apOf(ts, squads[1]) === TURNS.ap);
  check("one point per order, and a dry pool refuses",
    spend(ts, squads[0]) && spend(ts, squads[0]) && spend(ts, squads[0]) && !spend(ts, squads[0]) && apOf(ts, squads[1]) === 3);
  const c = clampMove(squads[0], 100, 0);
  check("the move cap prices distance: a 100 m ask lands on the 22 m cap along the same line",
    near(c.x, TURNS.moveCap) && near(c.z, 0) && clampMove(squads[0], 4, 0).x === 4);
  beginExec(ts);
  check("the player half runs until done or its cap, then the enemy half",
    ts.phase === "exec" && !stepExec(ts, 1, false) && stepExec(ts, 0, true) && ts.phase === "enemy");
  let flipped = false;
  for (let i = 0; i < 1200 && !flipped; i++) flipped = stepEnemy(ts, STEP, squads);
  check("the enemy half is its fixed window, then a new orders phase with pools refilled",
    flipped && ts.phase === "orders" && ts.turn === 2 && apOf(ts, squads[0]) === 3);
  const input = defaultTickInput();
  check("the engine's own switch holds the enemy side",
    heldInput(input, true).devDummies === true && heldInput(input, false).devDummies === false); }

{ const { war } = bootMission(MISSION_R1);
  const w = war.world;
  let spot = null;
  for (let x = -20; x <= 20 && !spot; x += 2) for (let z = -10; z <= 30 && !spot; z += 2) {
    if (Math.abs(war.field.heightAt(x, z) - war.field.heightAt(x, z + 12)) < 0.25) spot = { x, z };
  }
  const X = spot.x, Z = spot.z, tgtZ = Z + 11.2, wallZ = Z + 10;
  addBody(w, { kind: "wall", x: X, y: war.field.heightAt(X, wallZ) + 0.55, z: wallZ, hx: 2, hy: 0.55, hz: 0.2, mass: 0, hp: 1e9 });
  addBody(w, { kind: "wall", x: X + 6, y: war.field.heightAt(X + 6, wallZ) + 1.05, z: wallZ, hx: 2, hy: 1.05, hz: 0.2, mass: 0, hp: 1e9 });
  const mz = (mx) => ({ x: mx, y: war.field.heightAt(mx, Z) + 1.4, z: Z });
  check("cover is geometry: open ground reads open, a chest wall reads half (the head shows), a tall wall reads full",
    coverAt(w, mz(X - 6), X - 6, tgtZ) === "open"
    && coverAt(w, mz(X), X, tgtZ) === "half" && near(exposure(w, mz(X), X, tgtZ), 1 / 3)
    && coverAt(w, mz(X + 6), X + 6, tgtZ) === "full" && exposure(w, mz(X + 6), X + 6, tgtZ) === 0);
  const sq = war.run.squads[0];
  const shooter = w.byId.get(sq.memberIds[0]);
  const put = (mx) => { shooter.pos.x = mx; shooter.pos.z = Z; shooter.pos.y = war.field.heightAt(mx, Z) + 1.0; };
  const mkT = (x, z) => ({ pos: { x, y: war.field.heightAt(x, z) + 1.0, z }, hx: 0.28, id: -1 });
  put(X - 6); const pOpen = hitChance(war, shooter, mkT(X - 6, tgtZ));
  put(X); const pLow = hitChance(war, shooter, mkT(X, tgtZ));
  put(X + 6); const pTall = hitChance(war, shooter, mkT(X + 6, tgtZ));
  put(X - 6); const pFar = hitChance(war, shooter, mkT(X - 6, tgtZ + 10));
  check("the estimate orders itself: open beats the low wall beats the tall wall; near beats far; all inside [0.02, 0.98]",
    pOpen > pLow && pLow >= pTall && pTall >= 0.02 && pOpen > pFar
    && pOpen <= 0.98 && [pOpen, pLow, pTall, pFar].every((p) => p >= 0.02 && p <= 0.98));
  check("the audited formula pins its numbers (FL-3: the live-fire fit, HIT_REACH 0.82)",
    near(pOpen, 0.594733, 5e-7) && near(pLow, 0.050096, 5e-7) && near(pTall, 0.02, 5e-7) && near(pFar, 0.150843, 5e-7)); }

{ const { war, mission } = bootMission(MISSION_R1);
  const input = defaultTickInput();
  const trig = makeTriggerState();
  const ts = makeTurns();
  const squads = war.run.squads;
  for (const sq of squads) orderMove(sq, mission.exit.x + 6, mission.exit.z + 4);
  let tick = 0, contactAt = -1;
  while (ts.phase === "free" && tick < 12000) {
    tick++;
    const { events } = tickWar(war, STEP, input);
    const t = checkTriggers(war, trig, events);
    if (t.contact !== null) { contactAt = tick; startTurns(ts, squads); }
  }
  check("free time ends at first sight: contact at tick 584 exactly", contactAt === 584);
  let guard = 0, end = null;
  while (guard++ < 40 && !end) {
    for (const sq of squads) {
      if (spend(ts, sq)) { const d = clampMove(sq, mission.exit.x, mission.exit.z); orderMove(sq, d.x, d.z); }
    }
    beginExec(ts);
    heldInput(input, true);
    while (ts.phase === "exec") {
      tick++;
      tickWar(war, STEP, input);
      const allDone = squads.every((sq) => orderDone(sq) || !sq.memberIds.some((id) => { const b = war.world.byId.get(id); return b && b.alive; }));
      stepExec(ts, STEP, allDone);
    }
    heldInput(input, false);
    while (ts.phase === "enemy") { tick++; tickWar(war, STEP, input); stepEnemy(ts, STEP, squads); }
    const s = missionState(war, mission);
    if (s.won || s.lost) end = s;
  }
  const s = missionState(war, mission);
  check("the mission crosses under fire: won on turn 5 at tick 7304, seven of eight standing",
    ts.turn === 5 && tick === 7304 && s.won && !s.lost && s.friendlies === 7 && s.enemies === 2);
  check("the end-state world pins", worldHash(war.world) === 1467655505); }

{ const run = () => { const { war, mission } = bootMission(MISSION_R1);
    const input = defaultTickInput();
    for (const sq of war.run.squads) orderMove(sq, mission.exit.x, mission.exit.z);
    for (let i = 0; i < 2000; i++) tickWar(war, STEP, input);
    const s = missionState(war, mission);
    return worldHash(war.world) + ":" + s.friendlies + ":" + s.enemies; };
  check("determinism: twin missions land bit-identical worlds (the id-free hash)", run() === run()); }

// ---- FL-2: the fight's verbs (overwatch cones, focus fire, discipline)
{ const sq = { id: 1, anchor: { x: 0, z: 0 } };
  setOverwatch(sq, 0, 10, 1);
  const narrow = sq._ow.half;
  setOverwatch(sq, 10, 0, 2);
  check("overwatch prices its width: one point a 90 degree cone, two points 180, re-aimed on the new bearing",
    narrow === OVERWATCH.half1 && sq._ow.half === OVERWATCH.half2 && near(sq._ow.b, Math.PI / 2) && sq.order === "defend" && sq.dest === null);
  const arc = { b: 0, half: Math.PI / 4 };
  check("the cone's own test: dead ahead is in, the flank is out, the wrap seam holds",
    inArc(arc, 0, 0, 0, 10) && !inArc(arc, 0, 0, 10, 0) && inArc({ b: Math.PI, half: Math.PI / 4 }, 0, 0, 0.01, -10));
  const ts = { phase: "enemy" };
  const a = { id: 1, anchor: { x: 0, z: 0 } }, b = { id: 2, anchor: { x: 0, z: 0 } }, c = { id: 3, anchor: { x: 0, z: 0 } };
  setOverwatch(b, 0, 10, 1);
  c._disc = "free";
  applyFireControl(ts, [a, b, c]);
  const enemyHalf = a.holdFire === true && b.holdFire === false && !!b.fireArc && c.holdFire === false && !c.fireArc;
  ts.phase = "exec";
  applyFireControl(ts, [a, b, c]);
  check("discipline rules the enemy half: careful holds, the cone and free fire on; your own half everyone fights",
    enemyHalf && a.holdFire === false && c.holdFire === false && toggleDiscipline(a) === "free" && toggleDiscipline(a) === "careful"); }

{ const { war } = bootMission(MISSION_R1);
  const w = war.world;
  const sq = war.run.squads[0];
  const members = sq.memberIds.map((id) => w.byId.get(id)).filter((u) => u && u.alive);
  // the stand: the first spot on a fixed scan where a rifle's arc clears to
  // both fixture foes (terrain is bumpy; the fixture vets its own ground).
  let ax = null, az = null;
  outer: for (let x = -30; x <= 30; x += 3) for (let z = -20; z <= 30; z += 3) {
    const m = { x, y: war.field.heightAt(x, z) + 1.2, z };
    const t1 = { x, y: war.field.heightAt(x, z + 8) + 0.7, z: z + 8 };
    const t2 = { x, y: war.field.heightAt(x, z + 14) + 0.7, z: z + 14 };
    if (arcClears(w, m, t1, INFANTRY_ARMS.rifles, -1) && arcClears(w, m, t2, INFANTRY_ARMS.rifles, -1)) { ax = x; az = z; break outer; }
  }
  sq.anchor = { x: ax, z: az };
  members.forEach((u, i) => { u.pos.x = ax + i * 0.8; u.pos.z = az; u.pos.y = war.field.heightAt(u.pos.x, u.pos.z) + 0.7; u.fireCd = 0; });
  sq.order = "defend";
  const mkFoe = (x, z) => addBody(w, { kind: "unit", x, y: war.field.heightAt(x, z) + 0.7, z, hx: 0.28, hy: 0.7, hz: 0.28, mass: 80, hp: 10, team: 2 });
  const near1 = mkFoe(ax, az + 8), far1 = mkFoe(ax, az + 14);
  const reset = () => { sq._lastTargetId = null; members.forEach((u) => { u.fireCd = 0; }); };
  reset(); sq.holdFire = true; squadFire(w, sq, 1 / 120);
  const held = sq._lastTargetId === null;
  reset(); sq.holdFire = false; squadFire(w, sq, 1 / 120);
  check("the safety is real: a holding squad never pulls, released it takes the nearest man", held && sq._lastTargetId === near1.id);
  reset(); sq.fireArc = { b: Math.PI, half: Math.PI / 4 }; squadFire(w, sq, 1 / 120);
  const coneAway = sq._lastTargetId === null;
  reset(); sq.fireArc = { b: 0, half: Math.PI / 4 }; squadFire(w, sq, 1 / 120);
  check("the cone binds the trigger: pointed away nothing fires, pointed on it fires", coneAway && sq._lastTargetId === near1.id);
  reset(); sq.fireArc = null; sq.focusId = far1.id; squadFire(w, sq, 1 / 120);
  const focused = sq._lastTargetId === far1.id;
  reset(); far1.alive = false; squadFire(w, sq, 1 / 120);
  check("focus fire outranks near: the marked far man takes the volley; dead, the trigger falls back to the scan",
    focused && sq._lastTargetId === near1.id);
  markTarget(war, far1);
  const deadMark = markedTarget(war) === null;
  markTarget(war, near1);
  check("the mark is one shared target and a dead mark clears itself", deadMark && markedTarget(war) === near1);
  sq._ow = { b: 0, half: Math.PI / 4 };
  const paths = owPaths([sq], (x, z) => war.field.heightAt(x, z));
  check("the cone draws itself: two edges and a five-point arc on the existing overlay",
    paths.length === 3 && paths[0].length === 2 && paths[2].length === 5); }

// ---- FL-2.5: nobody spawns in a tree, and nobody's survey bulldozes one
{ const { war } = bootMission(MISSION_R1);
  const trees0 = war.world.bodies.filter((b) => b.kind === "tree" && b.alive).map((b) => ({ id: b.id, x: b.pos.x, z: b.pos.z }));
  const input = defaultTickInput();
  for (let i = 0; i < 600; i++) tickWar(war, STEP, input);
  let maxD = 0;
  for (const t of trees0) { const b = war.world.byId.get(t.id); if (b) maxD = Math.max(maxD, Math.hypot(b.pos.x - t.x, b.pos.z - t.z)); }
  check("the forest holds still: 600 idle ticks move no tree (spawns and survey goals are vetted ground)", maxD < 0.05); }

// ---- seeded generation: the rules place any valley, proven
{ let placed = 0, asAsked = 0, walkable = 0, roads = 0;
  for (const s of [7, 11, 42]) {
    const { war, mission, seed } = bootMission(MISSION_R1, s);
    placed++;
    if (seed === s) asAsked++;
    if (war.run.squads.every((sq) => {
      const g = openGround(war, sq.anchor.x, sq.anchor.z, 0.6);
      return g && Math.hypot(g.x - sq.anchor.x, g.z - sq.anchor.z) < 1e-9;
    })) walkable++;
    if (connected(war, war.run.squads[0].anchor, mission.exit)) roads++;
  }
  check("three more valleys place by rule: forces on open ground, every seed as asked", placed === 3 && asAsked === 3 && walkable === 3);
  check("every placed valley proves its road: spawn to exit connects on the movement grid", roads === 3);
  const twin = () => { const { war } = bootMission(MISSION_R1, 7); return worldHash(war.world); };
  check("a seed is a battle: twin boots of seed 7 land bit-identical worlds", twin() === twin()); }

console.log(`frostline-test: ${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
console.log("frostline-test PASS");
```

One check is new (29 total): the four fixture estimate values pinned to six decimals. No existing assert moves — the estimate-ordering check passes under the corrected formula, and the crossing never reads it.

**Step 4 — the audit.** Write `scripts/frostline-audit.mjs`, exactly:

```js
// COMBO-ENGINE — frostline-audit: FL-3's live-fire audit. NOT a per-task
// gate — this fires thousands of simulated rounds and takes minutes; it
// runs on the owner's word and on CI, never inside a task brief that
// doesn't name it. One pinned shooter, one held dummy, three ranges: the
// measured hit rate must sit inside the band around the number the page
// would display, and the exact deterministic counts pin the fixture.
// Seed 3 is the fixture; no seed is special.
import { tickWar, defaultTickInput } from "../src/depot/api.js";
import { addBody } from "../src/engine/core.js";
import { bootMission, MISSION_R1 } from "../src/games/frostline/mission.js";
import { hitChance } from "../src/games/frostline/cover.js";
import { arcClears } from "../src/depot/accuracy.js";
import { INFANTRY_ARMS } from "../src/depot/specs.js";

let pass = 0, fail = 0;
const check = (name, ok) => { if (ok) { pass++; console.log("PASS " + name); } else { fail++; console.log("FAIL " + name); } };
const STEP = 1 / 120;
const TICKS = 120 * 100; // 100 simulated seconds a range
const BAND = 0.10;       // the display may miss the measured truth by ten points, no more // provisional (F5)

function fireRange(range, type = "rifles") {
  const { war } = bootMission(MISSION_R1, 3);
  const w = war.world;
  const sq = war.run.squads.find((q) => q.type === type);
  const spec = INFANTRY_ARMS[type === "sniper" ? "sniper" : "rifles"];
  let ax = null, az = null;
  outer: for (let x = -30; x <= 30; x += 3) for (let z = -20; z <= 30; z += 3) {
    const m = { x, y: war.field.heightAt(x, z) + 1.2, z };
    const t = { x, y: war.field.heightAt(x, z + range) + 0.7, z: z + range };
    if (arcClears(w, m, t, spec, -1)) { ax = x; az = z; break outer; }
  }
  const members = sq.memberIds.map((id) => w.byId.get(id)).filter((u) => u && u.alive);
  members.forEach((u, i) => { if (i > 0) u.alive = false; }); // one trigger: the spotter never fires anyway
  const u = members[0];
  u.pos.x = ax; u.pos.z = az; u.pos.y = war.field.heightAt(ax, az) + 0.7; u.fireCd = 0;
  sq.anchor = { x: ax, z: az }; sq.order = "defend";
  const tz = az + range;
  const tgt = addBody(w, { kind: "unit", x: ax, y: war.field.heightAt(ax, tz) + 0.7, z: tz, hx: 0.28, hy: 0.7, hz: 0.28, mass: 80, hp: 1e9, team: 2 });
  tgt.maxHp = 1e9;
  const displayed = hitChance(war, u, tgt, spec);
  const input = defaultTickInput(); input.devDummies = true;
  let hits = 0, last = tgt.lastHit, shots = 0;
  for (let i = 0; i < TICKS; i++) {
    const cdBefore = u.fireCd || 0;
    tickWar(war, STEP, input);
    if ((u.fireCd || 0) > cdBefore + 0.5) shots++;
    if (tgt.lastHit !== last) { hits++; last = tgt.lastHit; }
    u.pos.x = ax; u.pos.z = az; tgt.pos.x = ax; tgt.pos.z = tz;
  }
  return { range, displayed, shots, hits, rate: hits / Math.max(1, shots) };
}

// PINS: exact deterministic counts, produced by running this exact file at
// plan-writing time. A moved count is a finding, never a re-teach in flight.
// The sniper's long shot is deliberately absent: the audit proved the
// territory field gates the trigger before the estimate ever matters — a
// lone pair's field never reaches a 18+ m lane, so zero rounds fire and no
// rate exists to audit. The finding stands in the task record for a later
// ruling (the page can display a chance for a shot doctrine will not take).
const SCENARIOS = [
  { range: 6, type: "rifles" }, { range: 10, type: "rifles" }, { range: 14, type: "rifles" },
];
const PINS = { // exact deterministic counts from the plan-writing run, seed 3
  "6:rifles": { shots: 77, hits: 70 },
  "10:rifles": { shots: 74, hits: 54 },
  "14:rifles": { shots: 75, hits: 43 },
};

for (const sc of SCENARIOS) {
  const r = fireRange(sc.range, sc.type);
  const key = sc.range + ":" + sc.type;
  const line = `${sc.range} m ${sc.type}: displayed ${(r.displayed * 100).toFixed(1)}%, measured ${r.hits}/${r.shots} = ${(r.rate * 100).toFixed(1)}%`;
  console.log("  " + line);
  check(`the display tells the truth at ${sc.range} m ${sc.type} (band ±${BAND * 100} points)`, r.shots > 0 && Math.abs(r.rate - r.displayed) <= BAND);
  if (PINS[key]) check(`the ${key} fixture pins: ${PINS[key].hits}/${PINS[key].shots}`, r.hits === PINS[key].hits && r.shots === PINS[key].shots);
}

console.log(`frostline-audit: ${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
console.log("frostline-audit PASS");
```

It is deliberately NOT registered in `scripts/gate.mjs` — the audit is minutes of simulated fire and never rides a per-task gate. It runs here once as this phase's own acceptance, and after that on the owner's word and on CI.

**Step 5 — file identity.** `node --check` on all three files (each prints nothing, exit 0), then `wc -c` and `sha256sum`:

- `src/games/frostline/cover.js` — 5380 bytes, sha256 `dbc097d6831d9d2a1e537a8c48899ede0e9fe427ae040abd767a54160b7c6295`
- `scripts/frostline-test.mjs` — 13842 bytes, sha256 `caaded99a113d1bca43441546af4e284d9af84aac9cdca852147b7bbd70af1e8`
- `scripts/frostline-audit.mjs` — 4402 bytes, sha256 `165ec8d504e6ff1b48a8e91c7b42059cf4a88575c93591b0e04958536765dd59`

A mismatch stops the task: report it, change nothing else.

**Step 6 — the gates.** `node scripts/gate.mjs frostline` must print 29 PASS lines, `frostline-test: 29 PASS / 0 FAIL`, `frostline-test PASS`, exit 0. Then `node scripts/frostline-audit.mjs` must print three scenario lines, `frostline-audit: 6 PASS / 0 FAIL`, `frostline-audit PASS`, exit 0. Both runs take minutes; run them with generous timeouts or in the background and wait. Report every line verbatim.

**Step 7 — records and deploy.** Move this document to `docs/plans/task-0.0.23-1-audit.md` and the phase frame to `docs/plans/phase-0.0.23-frostline-3.md`. In the phase frame, the status line becomes `Status: LANDED, commit \`<hash>\`, <date>. Gate: 29 PASS / 0 FAIL; audit 6 PASS / 0 FAIL.` — stamped in a second record commit naming the first, the repository's own two-commit shape. In `docs/plans/game-frostline.md`, the FL-3 ladder line gains `[LANDED] `. In `package.json`, version `0.0.22` becomes `0.0.23`. Commit with message:

```
phase 0.0.23 — FROSTLINE FL-3: the estimate audited

The displayed chance-to-hit measured against live fire and corrected: the
engine's deflection is a radial Rayleigh draw and near-misses splash, so the
formula is 1 - exp(-theta^2/2s^2) with a 0.82 m fitted reach. Three ranges
inside a ten-point band: 91% measured at 6 m, 73% at 10, 57% at 14. The
audit rides its own script, never the per-task gate. One finding recorded:
territory doctrine can refuse a shot the display still prices.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
```

Push. No smoke, no page loads, no screenshots — no page file changes in this task.

## Known limits, said plainly

- The band is ±10 points and the audit's three ranges are rifles only; half-cover and elevation scenarios are unaudited (cover scaling rides the exposure arithmetic the gate pins separately).
- The sniper finding stands unresolved by design: territory doctrine gates long shots the display still prices. Its ruling is the owner's, later.
- HIT_REACH 0.82 is a fitted dial, provisional; a re-fit follows any change to blast radius, scatter shape, or target silhouette.

## Report shape

Read-confirmation first, then one line of outcome, then bullets: both gate count-and-verdict lines verbatim, the three audit scenario lines verbatim, all three wc -c lines, all three sha256 lines, both commit hashes, push result. Every nonconformity its own labeled bullet. Fixture seed: 3; no seed is special.

## Suggested model

Sonnet 5 — every changed byte printed, hashes ratify.
