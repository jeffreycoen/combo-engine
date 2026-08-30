# Task 0.0.18-1 — FL-1, the mission and the turns

One job: write the five FROSTLINE game modules, the gate, and the playable page exactly as printed below, register the gate, prove the numbers, smoke the page in a real browser, deploy, close the records. Every authored file's full content is below; write exactly what is written, run the listed gates, report. You design nothing.

Suggested model: Sonnet 5.

Required reading, in order (confirm at the top of your report):
1. This file, whole.
2. `docs/plans/phase-0.0.18-frostline-1.md`, whole.

## Steps

Run from `/home/batman/combo-engine`. A failed assert stops the task; report the step and its verbatim output, run nothing further.

1. Assert the ground: all eighteen gates green, destinations absent. The engine gates print their usual tails (api `seed 1  seconds 90 (10800 steps)  worldHash 3367709165  runHash 2717846799`, combat `ALL PASS`, accuracy `11/11`, market through grapple each `<name>-test PASS`, old-master `old-master-test PASS`); both `absent` lines must print.

```sh
for g in api combat accuracy market builder ledger weldstress tape physics-pb rig solids ballistics orders steering voxel support grapple old-master; do node scripts/gate.mjs $g | tail -1; done
ls src/games/frostline 2>/dev/null || echo absent
ls docs/frostline 2>/dev/null || echo absent
```

2. Write `src/games/frostline/mission.js`, exactly as printed; after every authored file, its truncate/printf pair sets the exact ending mechanically, however the writing tool ended it:

```js
// games/frostline/mission.js — a mission is data; booting one is three
// engine calls. The dev boot fields no army, rings no bell, counts no
// census; the mission places its own forces and the fight runs on the
// sim's unchanged laws. FROSTLINE owns win and loss.
import { bootWar } from "../../depot/api.js";
import { makeSquad } from "../../depot/squads.js";
import { spawnSquadMembers } from "../../depot/state.js";
import { spawnEnemy } from "../../depot/sim.js";

// MISSION_R1: REACH THE FAR SIDE (owner's design, 2026-08-30). Three squads
// start by the town and must put someone through the western exit; an enemy
// patrol blocks the ground between — and marches east on its own law, so
// the block presses. Won on arrival with anyone alive; lost with the side
// wiped. Positions provisional (F5), moved on playtest word.
export const MISSION_R1 = {
  name: "REACH THE FAR SIDE",
  seed: 3,
  friendlies: [
    { type: "rifles", x: 8, z: 26 },
    { type: "mg", x: 14, z: 24 },
    { type: "sniper", x: 10, z: 32 },
  ],
  enemies: [
    { tag: "", x: -30, z: 12 }, { tag: "", x: -27, z: 16 },
    { tag: "", x: -33, z: 15 }, { tag: "", x: -29, z: 9 },
  ],
  exit: { x: -52, z: 8, r: 6 },
};

// bootMission(def) -> { war, mission } — booted dev, forces placed, no tick.
export function bootMission(def) {
  const war = bootWar({ seed: def.seed, dev: true });
  for (const f of def.friendlies) {
    const sq = makeSquad(war.run.nextSquadId++, f.type, 1, f.x, f.z);
    spawnSquadMembers(war.world, sq);
    war.run.squads.push(sq);
  }
  for (const e of def.enemies) spawnEnemy(war.world, { x: e.x, z: e.z }, e.tag);
  return { war, mission: def };
}

// missionState(war, def) -> { friendlies, enemies, won, lost }. Won: any
// living friendly unit inside the exit ring. Lost: none standing.
export function missionState(war, def) {
  let friendlies = 0, enemies = 0, reached = false;
  for (const b of war.world.bodies) {
    if (b.kind !== "unit" || !b.alive) continue;
    if (b.team === 1) {
      friendlies++;
      if (Math.hypot(b.pos.x - def.exit.x, b.pos.z - def.exit.z) <= def.exit.r) reached = true;
    } else if (b.team === 2) enemies++;
  }
  return { friendlies, enemies, won: reached && friendlies > 0, lost: friendlies === 0 };
}
```

```sh
truncate -s 2272 src/games/frostline/mission.js && printf '\n' >> src/games/frostline/mission.js
wc -c src/games/frostline/mission.js       # must print 2273
sha256sum src/games/frostline/mission.js   # must print a2ee1c71f8a054e41431e067122228e5b6787dacdb135cad55382c8470ddf12a
```

3. Write `src/games/frostline/command.js`, exactly as printed:

```js
// games/frostline/command.js — FL-1: the command grammar over the engine's
// own squads. An order is two field writes the sim already obeys
// (sim.js:611 routes it, squads.js:621 walks it, squads.js:657 flips it to
// defend on arrival — the completion signal). Selection is the depot
// game's own tap radius and cycle order.
import { TAP_SQUAD_M, nextPick } from "../../depot/state.js";

// orderMove(sq, x, z): the engine's own move order — route cleared so the
// next tick replans (sim.js:38).
export function orderMove(sq, x, z) {
  sq.order = "move";
  sq.dest = { x, z };
  sq._route = null;
  sq._routeDest = null;
}

// orderDone(sq): the arrival flip, read back (squads.js:657-666).
export function orderDone(sq) {
  return sq.order === "defend" && !sq.dest;
}

// pickSquad(squads, x, z) -> the squad whose anchor is nearest the tap,
// inside the depot game's own 2.4 m tap radius, or null.
export function pickSquad(squads, x, z) {
  let best = null, bd = TAP_SQUAD_M;
  for (const sq of squads) {
    if (!sq.anchor) continue;
    const d = Math.hypot(sq.anchor.x - x, sq.anchor.z - z);
    if (d < bd) { bd = d; best = sq; }
  }
  return best;
}

// cycleSquad(squads, cur) -> the next squad after cur (by the depot's own
// nextPick order), for a key or swipe cycle.
export function cycleSquad(squads, cur) {
  if (!squads.length) return null;
  const cands = squads.map((sq) => ({ key: String(sq.id), sq }));
  const picked = nextPick(cands, cur ? String(cur.id) : null);
  return picked ? picked.sq : squads[0];
}

// routePts(sq) -> the overlay's path row for setOrderPaths
// (renderer.js:1842): anchor, the planned waypoints, the destination.
export function routePts(sq) {
  const pts = [];
  if (sq.anchor) pts.push({ x: sq.anchor.x, z: sq.anchor.z });
  if (sq._route) for (const w of sq._route) pts.push({ x: w.x, z: w.z });
  if (sq.dest) pts.push({ x: sq.dest.x, z: sq.dest.z });
  return { pts };
}

// orderPaths(squads) -> every squad with a live move order, drawn.
export function orderPaths(squads) {
  const rows = [];
  for (const sq of squads) if (sq.order === "move" && sq.dest) rows.push(routePts(sq));
  return rows;
}
```

```sh
truncate -s 2166 src/games/frostline/command.js && printf '\n' >> src/games/frostline/command.js
wc -c src/games/frostline/command.js       # must print 2167
sha256sum src/games/frostline/command.js   # must print d1a722a50986a615fe5c55bd453406ab5ad037d4e514a25d701726e4bb6921cd
```

4. Write `src/games/frostline/pause.js`, exactly as printed:

```js
// games/frostline/pause.js — FL-1: the frozen moment's triggers. Pause is
// the absence of a tick; this module only decides WHEN. Pure over the
// tick's own returns and the sight map — gate-testable without a page.
import { seenAt } from "../../depot/sight.js";

// makeTriggerState() — what the trigger scan remembers between ticks:
// which enemy ids have already been seen (contact fires once per body),
// and which squads held a move order last tick (completion fires on the
// flip, squads.js:657).
export function makeTriggerState() {
  return { seen: new Set(), moving: new Set() };
}

// checkTriggers(war, ts, events) -> { contact, manDown, ordersDone } — ids
// and squads, or null each. Sight queries convert through map.invW: the
// sight grid is canonical, world coords silently miss (sight.js:53, the
// dossier's number-one landmine).
export function checkTriggers(war, ts, events) {
  const out = { contact: null, manDown: null, ordersDone: null };
  const sight = war.T.sight;
  if (sight) {
    for (const b of war.world.bodies) {
      if (b.kind !== "unit" || !b.alive || b.team !== 2 || ts.seen.has(b.id)) continue;
      const c = war.map.invW(b.pos.x, b.pos.z);
      if (seenAt(sight, c.u, c.v, 1)) { ts.seen.add(b.id); if (!out.contact) out.contact = b.id; }
    }
  }
  if (events) {
    for (const ev of events) {
      if (ev.type !== "kill") continue;
      const body = war.world.byId.get(ev.id);
      if (body && body.kind === "unit" && body.team === 1) { out.manDown = ev.id; break; }
    }
  }
  for (const sq of war.run.squads) {
    const moving = sq.order === "move" && !!sq.dest;
    if (ts.moving.has(sq.id) && !moving) { out.ordersDone = sq.id; ts.moving.delete(sq.id); }
    else if (moving) ts.moving.add(sq.id);
  }
  return out;
}

// firedAny(t) — one boolean for the page's pause latch.
export function firedAny(t) {
  return t.contact !== null || t.manDown !== null || t.ordersDone !== null;
}
```

```sh
truncate -s 1954 src/games/frostline/pause.js && printf '\n' >> src/games/frostline/pause.js
wc -c src/games/frostline/pause.js       # must print 1955
sha256sum src/games/frostline/pause.js   # must print 7c75b28f12a884cdefd98be7ea92cdb47729d2c488d52d482b886865abed0b1f
```

5. Write `src/games/frostline/turns.js`, exactly as printed:

```js
// games/frostline/turns.js — the turn machine, modeled on Zero Company's
// shape over this engine's grain (owner's rulings, 2026-08-30): free
// movement until first contact; from contact, alternating sides — the
// player's squads execute with the enemy held by the engine's own dummy
// switch, then the enemy side runs while the player holds. Squads are the
// operators: three points each per turn, one point per confirmed order,
// moves capped in distance. Pure state over plain data; the page drives
// the ticks.
export const TURNS = {
  ap: 3,          // points per squad per turn (owner's ruling)
  moveCap: 22,    // meters one move order may reach // provisional (F5)
  execCapS: 8,    // seconds the player half may run before it yields // provisional (F5)
  enemyS: 6,      // seconds the enemy half runs // provisional (F5)
};

// Phases: "free" (real time, no points) -> "orders" (frozen, spend points)
// -> "exec" (player orders play out, enemy held) -> "enemy" (enemy runs,
// player holds) -> "orders" ...
export function makeTurns() {
  return { phase: "free", turn: 0, ap: {}, execT: 0, enemyT: 0 };
}

// startTurns(ts, squads): first contact — the war becomes turns.
export function startTurns(ts, squads) {
  ts.phase = "orders";
  ts.turn = 1;
  refill(ts, squads);
}

export function refill(ts, squads) {
  ts.ap = {};
  for (const sq of squads) ts.ap[sq.id] = TURNS.ap;
}

export function apOf(ts, sq) { return ts.ap[sq.id] || 0; }

// spend(ts, sq): one point for one confirmed order; false when the pool is dry.
export function spend(ts, sq) {
  if ((ts.ap[sq.id] || 0) <= 0) return false;
  ts.ap[sq.id]--;
  return true;
}

// clampMove(sq, x, z): the move cap — a destination past the cap lands ON
// the cap along the same line. Returns the priced destination.
export function clampMove(sq, x, z) {
  const ax = sq.anchor.x, az = sq.anchor.z;
  const d = Math.hypot(x - ax, z - az);
  if (d <= TURNS.moveCap) return { x, z };
  const s = TURNS.moveCap / d;
  return { x: ax + (x - ax) * s, z: az + (z - az) * s };
}

// beginExec(ts): the orders are in — the player half runs.
export function beginExec(ts) { ts.phase = "exec"; ts.execT = 0; }

// stepExec(ts, dt, allDone): the player half ends when every ordered squad
// has finished or the cap elapses; then the enemy half begins.
export function stepExec(ts, dt, allDone) {
  ts.execT += dt;
  if (allDone || ts.execT >= TURNS.execCapS) { ts.phase = "enemy"; ts.enemyT = 0; return true; }
  return false;
}

// stepEnemy(ts, dt, squads): the enemy half is a fixed window; when it
// closes, a new orders phase opens with every pool refilled.
export function stepEnemy(ts, dt, squads) {
  ts.enemyT += dt;
  if (ts.enemyT >= TURNS.enemyS) {
    ts.phase = "orders";
    ts.turn++;
    refill(ts, squads);
    return true;
  }
  return false;
}

// heldInput(input, held): the engine's own switch — the enemy side freezes
// when devDummies is true. The page flips it by phase: exec holds the
// enemy, enemy phase releases it.
export function heldInput(input, held) { input.devDummies = !!held; return input; }
```

```sh
truncate -s 3113 src/games/frostline/turns.js && printf '\n' >> src/games/frostline/turns.js
wc -c src/games/frostline/turns.js       # must print 3114
sha256sum src/games/frostline/turns.js   # must print e867915106f686a7d1866ac32a85a93e945dbe9c7b8be81103258cf3460e4332
```

6. Write `src/games/frostline/cover.js`, exactly as printed:

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

// erf approximation (Abramowitz-Stegun 7.1.26), for the aim-cone integral.
function erf(v) {
  const s = v < 0 ? -1 : 1, a = Math.abs(v);
  const t = 1 / (1 + 0.3275911 * a);
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-a * a);
  return s * y;
}

// hitChance(war, shooter, target, armsRow) -> 0..1 estimate: the engine's
// own scatterSigma (range, elevation, grazing cover, bracing) makes the
// cone; the target's half-width against the lateral spread at that range
// makes the geometry; the silhouette exposure scales what the cone can
// touch. Clamped to [0.02, 0.98] — war never promises certainty.
export function hitChance(war, shooter, target, armsRow) {
  const spec = armsRow || INFANTRY_ARMS.rifles;
  const m = muzzleOf(war.world, shooter);
  const aim = { x: target.pos.x, y: target.pos.y + 0.3, z: target.pos.z };
  const dist = Math.hypot(aim.x - m.x, aim.z - m.z);
  if (dist < 0.5) return 0.98;
  const sigma = scatterSigma(war.world, m, aim, spec);
  const lateral = Math.max(1e-6, sigma * dist);
  const pGeom = erf((target.hx || 0.28) / (lateral * Math.SQRT2));
  const e = exposure(war.world, m, target.pos.x, target.pos.z, shooter.id);
  return Math.min(0.98, Math.max(0.02, pGeom * e));
}
```

```sh
truncate -s 5316 src/games/frostline/cover.js && printf '\n' >> src/games/frostline/cover.js
wc -c src/games/frostline/cover.js       # must print 5317
sha256sum src/games/frostline/cover.js   # must print e5713974eb27a916c9d7b91a1b8f5b3bde28ed3ace6f5105d3196afba8837e6c
```

7. Write `scripts/frostline-test.mjs`, exactly as printed:

```js
// COMBO-ENGINE — frostline-test: FL-1's gate — the mission, the turns, the
// cover read, the hit estimate. Sixteen checks. Seed 3 is MISSION_R1's
// field; no seed is special. Pins ride worldHash (id-free) and mission
// facts — never runHash: squads carry member ids from the engine's
// module-global body counter, which shifts across boots in one process
// while the sim itself stays bit-identical.
import { tickWar, defaultTickInput } from "../src/depot/api.js";
import { worldHash, addBody } from "../src/engine/core.js";
import { bootMission, missionState, MISSION_R1 } from "../src/games/frostline/mission.js";
import { orderMove, orderDone, pickSquad } from "../src/games/frostline/command.js";
import { makeTriggerState, checkTriggers } from "../src/games/frostline/pause.js";
import { makeTurns, startTurns, apOf, spend, clampMove, beginExec, stepExec, stepEnemy, heldInput, TURNS } from "../src/games/frostline/turns.js";
import { coverAt, exposure, hitChance, knownThreats } from "../src/games/frostline/cover.js";

let pass = 0, fail = 0;
const check = (name, ok) => { if (ok) { pass++; console.log("PASS " + name); } else { fail++; console.log("FAIL " + name); } };
const near = (a, b, e) => Math.abs(a - b) < (e || 1e-9);
const STEP = 1 / 120;

{ const { war, mission } = bootMission(MISSION_R1);
  const s = missionState(war, mission);
  check("boot: three squads, eight friendlies, four blockers, nobody won, the world pins",
    war.run.squads.length === 3 && s.friendlies === 8 && s.enemies === 4
    && !s.won && !s.lost && worldHash(war.world) === 230891517);
  check("nothing is known at boot: the sight map has seen no enemy", knownThreats(war).length === 0);
  check("pick: a tap near the rifles takes them", pickSquad(war.run.squads, 8, 26) === war.run.squads[0]); }

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
    && pOpen <= 0.98 && [pOpen, pLow, pTall, pFar].every((p) => p >= 0.02 && p <= 0.98)); }

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
  check("free time ends at first sight: contact at tick 835 exactly", contactAt === 835);
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
  check("the mission crosses under fire: won on turn 3 at tick 4195, seven of eight standing",
    ts.turn === 3 && tick === 4195 && s.won && !s.lost && s.friendlies === 7 && s.enemies === 3);
  check("the end-state world pins", worldHash(war.world) === 1467228477); }

{ const run = () => { const { war, mission } = bootMission(MISSION_R1);
    const input = defaultTickInput();
    for (const sq of war.run.squads) orderMove(sq, mission.exit.x, mission.exit.z);
    for (let i = 0; i < 2000; i++) tickWar(war, STEP, input);
    const s = missionState(war, mission);
    return worldHash(war.world) + ":" + s.friendlies + ":" + s.enemies; };
  check("determinism: twin missions land bit-identical worlds (the id-free hash)", run() === run()); }

console.log(`frostline-test: ${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
console.log("frostline-test PASS");
```

```sh
truncate -s 7467 scripts/frostline-test.mjs && printf '\n' >> scripts/frostline-test.mjs
wc -c scripts/frostline-test.mjs       # must print 7468
sha256sum scripts/frostline-test.mjs   # must print 877dd5971fa8c9ef0d217219b698d264fd8d72030d98b6a54daeb7dfa3d12704
```

8. Write `docs/frostline/index.html`, exactly as printed:

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
<title>FROSTLINE</title>
<style>
  html, body { margin: 0; height: 100%; overflow: hidden; background: #0d1117; touch-action: none; }
  #cv { width: 100%; height: 100%; display: block; }
  #title { position: fixed; top: max(10px, env(safe-area-inset-top)); left: 0; right: 0; text-align: center;
    color: #e9edf2; font: 600 13px/1.4 system-ui, sans-serif; letter-spacing: 0.35em; pointer-events: none;
    text-shadow: 0 1px 4px rgba(0,0,0,.5); }
  #hud { position: fixed; top: max(10px, env(safe-area-inset-top)); right: 12px; color: rgba(233,237,242,.75);
    font: 500 11px/1.4 ui-monospace, monospace; pointer-events: none; text-shadow: 0 1px 4px rgba(0,0,0,.5); text-align: right; }
  #banner { position: fixed; top: 38%; left: 0; right: 0; text-align: center; pointer-events: none;
    color: #e9b25c; font: 700 22px/1.3 system-ui, sans-serif; letter-spacing: 0.3em;
    text-shadow: 0 2px 8px rgba(0,0,0,.6); display: none; }
  #reason { position: fixed; top: calc(38% + 34px); left: 0; right: 0; text-align: center; pointer-events: none;
    color: rgba(233,237,242,.8); font: 500 12px/1.4 system-ui, sans-serif; letter-spacing: 0.12em; display: none; }
  #pauseB { position: fixed; right: 14px; bottom: max(16px, env(safe-area-inset-bottom)); width: 74px; height: 44px;
    border-radius: 10px; border: 1.5px solid rgba(233,237,242,.4); background: rgba(13,17,23,.55);
    color: #e9edf2; font: 600 12px system-ui, sans-serif; letter-spacing: 0.15em; }
  #squads { position: fixed; left: 12px; bottom: max(16px, env(safe-area-inset-bottom)); display: flex; gap: 8px; }
  #actions { position: fixed; right: 12px; bottom: max(16px, env(safe-area-inset-bottom)); display: flex; flex-direction: column; gap: 6px; }
  .act { min-width: 92px; padding: 9px 10px; border-radius: 10px; border: 1.5px solid rgba(233,237,242,.4);
    background: rgba(13,17,23,.6); color: #e9edf2; font: 600 11px system-ui, sans-serif; letter-spacing: 0.12em; }
  .act.on { border-color: #e9b25c; color: #e9b25c; }
  #popup { position: fixed; left: 50%; bottom: 26%; transform: translateX(-50%); min-width: 220px;
    padding: 12px 14px; border-radius: 12px; border: 1.5px solid rgba(233,178,92,.5); background: rgba(13,17,23,.85);
    color: #e9edf2; font: 500 12px/1.6 system-ui, sans-serif; }
  #popTitle { font-weight: 700; letter-spacing: 0.12em; margin-bottom: 4px; color: #e9b25c; }
  #popup button { margin: 8px 8px 0 0; padding: 7px 12px; border-radius: 8px; border: 1.5px solid rgba(233,237,242,.4);
    background: rgba(13,17,23,.6); color: #e9edf2; font: 600 11px system-ui, sans-serif; }
  .chip { min-width: 70px; padding: 8px 10px; border-radius: 10px; border: 1.5px solid rgba(233,237,242,.3);
    background: rgba(13,17,23,.55); color: #e9edf2; font: 600 11px/1.5 system-ui, sans-serif; text-align: center; }
  .chip.sel { border-color: #6fbf73; color: #a9e0ac; }
</style>
</head>
<body>
<canvas id="cv"></canvas>
<div id="title">FROSTLINE</div>
<div id="hud">mk -<br>- fps</div>
<div id="banner">PAUSED</div>
<div id="reason"></div>
<div id="actions" style="display:none">
  <button class="act" id="actMove">MOVE</button>
  <button class="act" id="actAttack">ATTACK</button>
  <button class="act" id="actHold">HOLD</button>
  <button class="act" id="actEnd">END TURN</button>
</div>
<div id="popup" style="display:none">
  <div id="popTitle"></div>
  <div id="popBody"></div>
  <div><button id="popOk">CONFIRM</button><button id="popNo">CANCEL</button></div>
</div>
<div id="squads"></div>
<script type="importmap">{ "imports": { "three": "./three.module.js" } }</script>
<script type="module" src="./main.js"></script>
</body>
</html>
```

```sh
truncate -s 3823 docs/frostline/index.html && printf '\n' >> docs/frostline/index.html
wc -c docs/frostline/index.html       # must print 3824
sha256sum docs/frostline/index.html   # must print 1186935fa5f204bdd93e390718a319ab9ce532ba6245daa3f4da77d0281f7388
```

9. Write `docs/frostline/main.js`, exactly as printed:

```js
// FROSTLINE — docs/frostline/main.js: FL-1, the mission, the turns, the
// confirmations. Free time until first contact; then alternating turns —
// pick a squad, pick an action, and every action (move included) prices
// itself in a confirmation before the point spends. The engine routes,
// walks, and fights on its own laws; the enemy side is held by its own
// switch during your half.
import { tickWar, defaultTickInput, makeRenderer } from "../../src/depot/api.js";
import { bootMission, missionState, MISSION_R1 } from "../../src/games/frostline/mission.js";
import { orderMove, orderDone, pickSquad, cycleSquad, orderPaths } from "../../src/games/frostline/command.js";
import { makeTriggerState, checkTriggers } from "../../src/games/frostline/pause.js";
import { makeTurns, startTurns, apOf, spend, clampMove, beginExec, stepExec, stepEnemy, heldInput, TURNS } from "../../src/games/frostline/turns.js";
import { destShield, hitChance, knownThreats } from "../../src/games/frostline/cover.js";
import { INFANTRY_ARMS } from "../../src/depot/specs.js";

const canvas = document.getElementById("cv");
const { war, mission } = bootMission(MISSION_R1);
const R = makeRenderer(canvas, war.world, { camera: "tactical" });
let zoom = 1.5;
R.setZoom(zoom);
const input = defaultTickInput();
const trig = makeTriggerState();
const ts = makeTurns();
const squads = war.run.squads;

let selected = squads[0];
let focus = { x: selected.anchor.x, y: war.field.heightAt(selected.anchor.x, selected.anchor.z), z: selected.anchor.z };
let aim = { x: mission.exit.x, z: mission.exit.z };
let over = false;
let mode = null;            // "move" | "attack" | null — the armed action awaiting its tap
let pending = null;         // the confirmation on screen: {kind, sq, x, z, target, label}

// ---- HUD
const hud = document.getElementById("hud");
let mkText = "mk ?";
fetch("../../package.json", { cache: "no-store" }).then((r) => r.json())
  .then((p) => { mkText = "mk " + p.version; }).catch(() => {});
let fpsFrames = 0, fpsT = 0, fpsText = "- fps";

// ---- banner + popup + chips + actions
const banner = document.getElementById("banner"), reason = document.getElementById("reason");
const popup = document.getElementById("popup"), popTitle = document.getElementById("popTitle"), popBody = document.getElementById("popBody");
const actionsEl = document.getElementById("actions");
const actMove = document.getElementById("actMove"), actAttack = document.getElementById("actAttack"), actHold = document.getElementById("actHold"), actEnd = document.getElementById("actEnd");
function say(top, sub) {
  banner.style.display = top ? "block" : "none";
  banner.textContent = top || "";
  reason.style.display = sub ? "block" : "none";
  reason.textContent = sub || "";
}
const armsOf = (sq) => INFANTRY_ARMS[sq.type === "sniper" ? "sniper" : sq.type === "mg" ? "mg" : "rifles"] || INFANTRY_ARMS.rifles;
const liveMember = (sq) => { for (const id of sq.memberIds) { const b = war.world.byId.get(id); if (b && b.alive) return b; } return null; };
function liveCount(sq) { let n = 0; for (const id of sq.memberIds) { const b = war.world.byId.get(id); if (b && b.alive) n++; } return n; }

const chipBox = document.getElementById("squads");
const chips = squads.map((sq) => {
  const el = document.createElement("button");
  el.className = "chip";
  chipBox.appendChild(el);
  el.addEventListener("click", () => { selected = sq; mode = null; });
  return { sq, el };
});
const label = (sq) => sq.type === "mg" ? "MG" : sq.type === "sniper" ? "SNIPERS" : "RIFLES";
function drawChips() {
  for (const { sq, el } of chips) {
    el.className = "chip" + (sq === selected ? " sel" : "");
    const ap = ts.phase === "free" ? "" : " · " + "●".repeat(apOf(ts, sq)) + "○".repeat(Math.max(0, TURNS.ap - apOf(ts, sq)));
    el.textContent = label(sq) + " · " + liveCount(sq) + ap;
  }
  const inOrders = ts.phase === "orders" && !over;
  actionsEl.style.display = inOrders ? "flex" : "none";
  actMove.className = "act" + (mode === "move" ? " on" : "");
  actAttack.className = "act" + (mode === "attack" ? " on" : "");
}

// ---- the confirmation: every action prices itself before the point spends
function present(p) {
  pending = p;
  popTitle.textContent = p.title;
  popBody.innerHTML = p.body;
  popup.style.display = "block";
}
function dismiss() { pending = null; popup.style.display = "none"; }
document.getElementById("popNo").addEventListener("click", dismiss);
document.getElementById("popOk").addEventListener("click", () => {
  if (!pending) return;
  const p = pending;
  dismiss();
  const free = ts.phase === "free";
  if (!free && !spend(ts, p.sq)) return;
  if (p.kind === "move") orderMove(p.sq, p.x, p.z);
  else if (p.kind === "attack") { p.sq.order = "attack"; p.sq.dest = { x: p.target.pos.x, z: p.target.pos.z }; p.sq._route = null; p.sq._routeDest = null; }
  else if (p.kind === "hold") { p.sq.order = "defend"; p.sq.dest = null; }
  R.overlay.setOrderPaths(orderPaths(squads));
  mode = null;
});

actMove.addEventListener("click", () => { mode = mode === "move" ? null : "move"; });
actAttack.addEventListener("click", () => { mode = mode === "attack" ? null : "attack"; });
actHold.addEventListener("click", () => {
  if (apOf(ts, selected) <= 0) return;
  const shield = destShield(war, selected.anchor.x, selected.anchor.z);
  present({ kind: "hold", sq: selected, title: "HOLD — " + label(selected), body: "cover here: " + shield + "<br>cost 1 point · " + (apOf(ts, selected) - 1) + " after" });
});
actEnd.addEventListener("click", () => { if (ts.phase === "orders") { beginExec(ts); say("", ""); } });

// ---- screen to world
function screenToWorld(cx, cy) {
  const nx = (cx / innerWidth) * 2 - 1;
  const ny = -((cy / innerHeight) * 2 - 1);
  const cp = R.cameraPos();
  const rt = R.camBasis.right, up = R.camBasis.up, f = R.camBasis.fwd;
  const hw = R.camBasis.halfW(), hh = R.camBasis.halfH();
  const px = cp.x + rt.x * nx * hw + up.x * ny * hh;
  const py = cp.y + rt.y * nx * hw + up.y * ny * hh;
  const pz = cp.z + rt.z * nx * hw + up.z * ny * hh;
  const t = (focus.y - py) / f.y;
  return { x: px + f.x * t, z: pz + f.z * t };
}

canvas.addEventListener("pointerdown", (e) => {
  if (over || pending) return;
  const w = screenToWorld(e.clientX, e.clientY);
  const hit = pickSquad(squads, w.x, w.z);
  if (hit && mode === null) { selected = hit; return; }
  const free = ts.phase === "free";
  if (!free && ts.phase !== "orders") return;
  if (!free && apOf(ts, selected) <= 0) return;
  if (mode === "attack") {
    const threats = knownThreats(war);
    let best = null, bd = 6;
    for (const t of threats) { const d = Math.hypot(t.pos.x - w.x, t.pos.z - w.z); if (d < bd) { bd = d; best = t; } }
    if (!best) return;
    const shooter = liveMember(selected);
    const pct = shooter ? Math.round(hitChance(war, shooter, best, armsOf(selected)) * 100) : 0;
    present({ kind: "attack", sq: selected, target: best, title: "ATTACK — " + label(selected),
      body: "chance to hit: " + pct + "%<br>" + (ts.phase === "free" ? "free time — no cost" : "cost 1 point · " + (apOf(ts, selected) - 1) + " after") });
    aim = { x: best.pos.x, z: best.pos.z };
    return;
  }
  // move — the default tap, and the MOVE button's tap
  const d = free ? { x: w.x, z: w.z } : clampMove(selected, w.x, w.z);
  const shield = destShield(war, d.x, d.z);
  const dist = Math.hypot(d.x - selected.anchor.x, d.z - selected.anchor.z);
  present({ kind: "move", sq: selected, x: d.x, z: d.z, title: "MOVE — " + label(selected),
    body: "cover there: " + shield + "<br>distance " + dist.toFixed(0) + " m" + (free ? "<br>free time — no cost" : " (cap " + TURNS.moveCap + ")<br>cost 1 point · " + (apOf(ts, selected) - 1) + " after") });
  aim = { x: d.x, z: d.z };
});
addEventListener("wheel", (e) => { zoom = Math.max(0.5, Math.min(2.6, zoom + (e.deltaY > 0 ? -0.12 : 0.12))); R.setZoom(zoom); }, { passive: true });
addEventListener("keydown", (e) => { if (e.code === "Tab") { e.preventDefault(); selected = cycleSquad(squads, selected); } });

// ---- the loop
const title = document.getElementById("title");
const STEP = 1 / 120;
let last = performance.now(), acc = 0;
say("", "TAP THE SNOW TO MOVE OUT — TIME STOPS AT FIRST CONTACT");
function frame(now) {
  requestAnimationFrame(frame);
  let dt = Math.min(0.1, (now - last) / 1000); last = now;
  const ticking = !over && !pending && (ts.phase === "free" || ts.phase === "exec" || ts.phase === "enemy");
  if (ticking) {
    acc += dt;
    let guard = 0;
    while (acc >= STEP && guard++ < 12) {
      acc -= STEP;
      heldInput(input, ts.phase === "exec");
      const { events, flags } = tickWar(war, STEP, input);
      if (ts.phase === "free") {
        const t = checkTriggers(war, trig, events);
        if (t.contact !== null) { startTurns(ts, squads); say("CONTACT", "YOUR TURN — 3 POINTS A SQUAD"); }
      } else if (ts.phase === "exec") {
        const allDone = squads.every((sq) => orderDone(sq) || liveCount(sq) === 0);
        if (stepExec(ts, STEP, allDone)) say("ENEMY TURN", "");
      } else if (ts.phase === "enemy") {
        if (stepEnemy(ts, STEP, squads)) say("YOUR TURN " + ts.turn, "3 POINTS A SQUAD");
      }
      if (flags && flags.orderPaths) R.overlay.setOrderPaths(orderPaths(squads));
      const s = missionState(war, mission);
      if (s.won || s.lost) { over = true; say(s.won ? "THE FAR SIDE" : "THE LINE BROKE", s.won ? "mission complete" : "the side was wiped"); }
    }
  } else { acc = 0; }
  if (selected && selected.anchor) {
    focus.x += (selected.anchor.x - focus.x) * Math.min(1, dt * 4);
    focus.z += (selected.anchor.z - focus.z) * Math.min(1, dt * 4);
    focus.y = war.field.heightAt(focus.x, focus.z);
    R.overlay.setHover(true, selected.anchor.x, selected.anchor.z, war.field.heightAt(selected.anchor.x, selected.anchor.z), 2.2, true, 2);
  }
  R.overlay.setObjective(mission.exit.x, mission.exit.z, war.field.heightAt(mission.exit.x, mission.exit.z));
  fpsFrames++; fpsT += dt;
  if (fpsT >= 0.5) { fpsText = Math.round(fpsFrames / fpsT) + " fps"; fpsFrames = 0; fpsT = 0; }
  hud.innerHTML = mkText + "<br>" + fpsText;
  drawChips();
  title.textContent = "FROSTLINE · " + mission.name + (ts.phase === "orders" ? " · TURN " + ts.turn : "");
  R.render(dt, focus, aim);
}
requestAnimationFrame(frame);
```

```sh
truncate -s 10375 docs/frostline/main.js && printf '\n' >> docs/frostline/main.js
wc -c docs/frostline/main.js       # must print 10376
sha256sum docs/frostline/main.js   # must print 2e719eae0fd6970292016116ab1c2349f463c62837b4328a5e620c99b81e44df
```

10. Vendor the three library by copy — never retyped:

```sh
cp node_modules/three/build/three.module.js docs/frostline/three.module.js
wc -c docs/frostline/three.module.js       # must print 1140878
sha256sum docs/frostline/three.module.js   # must print af527c374b56b8688737a42d7fcea7cb8aaeb57a4e3c6da98b4dffd55bcc3514
```

11. In `scripts/gate.mjs`, in the `GATES` table (currently 18 entries ending with `"old-master"`), add one line after the `"old-master"` entry:

```js
  "frostline": ["scripts/frostline-test.mjs"],
```

Touch nothing else in the file.

12. Run the new gate through the wrapper. The output must be 16 PASS lines, then exactly `frostline-test: 16 PASS / 0 FAIL`, then `frostline-test PASS`, exit 0. It plays a whole mission headless — allow several minutes. Any FAIL stops the task before step 13.

```sh
node scripts/gate.mjs frostline
```

13. Browser smoke — the scene must paint and the HUD must carry the live version. Run each block as its own command:

```sh
(python3 -m http.server 8944 >/dev/null 2>&1 &)
sleep 1
timeout 240 chromium --headless=new --no-sandbox --use-angle=swiftshader-webgl --enable-unsafe-swiftshader --virtual-time-budget=90000 --screenshot=/tmp/claude-1000/fl-landing-smoke.png --window-size=900,600 http://127.0.0.1:8944/docs/frostline/index.html 2>/dev/null
SZ=$(wc -c < /tmp/claude-1000/fl-landing-smoke.png); echo "smoke bytes $SZ"; test "$SZ" -gt 100000 && echo SMOKE-OK
```

```sh
timeout 240 chromium --headless=new --no-sandbox --use-angle=swiftshader-webgl --enable-unsafe-swiftshader --virtual-time-budget=90000 --dump-dom http://127.0.0.1:8944/docs/frostline/index.html 2>/dev/null | grep -oE '<div id="hud">[^<]*<br>[^<]*'
```

`SMOKE-OK` must print, and the hud line must read `mk 0.0.17` with a numeric fps (the smoke runs before the version bump). Report both verbatim.

14. Close the records in this landing: bump `package.json` version to `0.0.18`; in `docs/plans/phase-0.0.18-frostline-1.md` replace the status line with `Status: LANDED, commit stamped below, 2026-08-30. Gate: 16 PASS / 0 FAIL; prior gates unmoved.`; in `docs/plans/game-frostline.md` change the FL-1 line's leading `- ` to `- [LANDED] `.

15. Assert the eighteen prior gates did not move (same commands and tails as step 1).

16. Commit and push the landing (the push is the deploy), then stamp the real hash in a second small commit — NEVER amend after stamping:

```sh
git add src/games/frostline scripts/frostline-test.mjs scripts/gate.mjs docs/frostline docs/frostline-pitch.md docs/plans package.json
git commit -m "phase 0.0.18 — FROSTLINE FL-1: the mission and the turns

Reach the far side: free time to contact, alternating turns, three points a squad,
every action priced in a confirmation; cover as geometry, the hit estimate displayed.
frostline-test: 16 PASS / 0 FAIL; eighteen prior gates unmoved; page smoked live.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push origin main
H=$(git rev-parse --short HEAD)
sed -i "s/commit stamped below/commit \`$H\`/" docs/plans/phase-0.0.18-frostline-1.md
git add docs/plans && git commit -m "phase 0.0.18 record stamped — $H

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push origin main
```

The playable page after Pages rebuilds: `https://jeffreycoen.github.io/combo-engine/docs/frostline/`

## Acceptance

- Steps 2–10: every wc -c and sha256 line matches exactly.
- Step 12: `frostline-test: 16 PASS / 0 FAIL` then `frostline-test PASS`, exit 0.
- Step 13: `SMOKE-OK` and the hud line, verbatim in the report.
- Step 15: every prior gate prints its pinned tail unchanged.
- Step 14's records flipped, riding the landing commit; both pushes accepted.
- The feel — the tap, the confirmation, the turn rhythm — is the owner's live check, not this task's.

## Report

Read-confirmation first, then one line of outcome, then bullets: the gate's count and verdict lines verbatim, all nine wc -c lines, all nine sha256 lines, the smoke bytes and hud lines verbatim, every prior-gate tail, both commit hashes, push results, the play URL. Every nonconformity its own labeled bullet. Fixture seeds: 3 (MISSION_R1's field); no seed is special.
