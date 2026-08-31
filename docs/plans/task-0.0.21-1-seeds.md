# Task 0.0.21-1 — the seed picks the valley: missions as rules, proven crossable

One job: a mission becomes RULES over any seeded map instead of coordinates on one map. The page rolls a fresh seed each load, shows it, and pins it in the address for exact replay; every valley proves its road before a single man spawns. Three files change: the mission module and the gate are printed whole; the page changes by two exact hunks. The final hashes are the acceptance. You design nothing.

This document lives at `docs/plans/task-0.0.21-1-seeds.md` when the task lands. Ruled at the design discussion: seed variation only in this task — today's valley profile, map-type presets next on this machinery; seed random each load, shown, `?seed=N` replays; bolts and burn marks the task after.

## Required reading, verified in the tree

1. This document, whole.
2. `src/games/frostline/mission.js` — the file replaced whole.
3. `docs/frostline/main.js` lines 15–30 (the boot) and the hud line near line 200.

Your report opens with a read-confirmation naming these.

## What lands

- **The mission as rules:** the town's centroid anchors the friendly line; the western exit is the westernmost open ground near the town's latitude; the patrol strings across the line between. Every point passes two vets — no live solid in the disc, and the movement grid's own foot rule (blocked and drop cells refuse).
- **The passability proof:** a breadth-first walk over foot-passable cells from spawn to exit. A valley that refuses placement or the proof steps deterministically to the next seed, so the same asked seed always lands the same battle. A mission must be born crossable; weapons may carve shortcuts, never the only road.
- **The seed on the page:** `?seed=N` replays a battle exactly; no seed asked rolls a fresh valley; the seed that took is written back to the address and shown on the hud. A saved game is its seed.
- **The gate re-teaches its seed-3 pins** (the rules move the forces) and grows three seeded checks — 28 total.

## Steps

**Step 1 — green before anything moves.** Run `node scripts/gate.mjs frostline`. It must print `frostline-test: 25 PASS / 0 FAIL`, `frostline-test PASS`, exit 0. Any other result stops the task.

**Step 2 — the mission module.** Replace `src/games/frostline/mission.js` whole with:

```js
// games/frostline/mission.js — a mission is RULES over a seeded map, not
// coordinates. The seed picks the valley; the rules read the map the boot
// built (the town, the western ground, the movement grid) and place the
// forces on ground that is proven clear and proven connected. Same seed,
// same mission, every time — a saved battle is its seed. The dev boot
// fields no army, rings no bell, counts no census.
import { bootWar } from "../../depot/api.js";
import { makeSquad } from "../../depot/squads.js";
import { spawnSquadMembers } from "../../depot/state.js";
import { spawnEnemy } from "../../depot/sim.js";

// MISSION_R1: REACH THE FAR SIDE. Three squads start east of the town and
// must put someone through the western exit; a patrol blocks the ground
// between. Won on arrival with anyone alive; lost with the side wiped.
// All dials provisional (F5), moved on playtest word.
export const MISSION_R1 = {
  name: "REACH THE FAR SIDE",
  friendlies: [{ type: "rifles" }, { type: "mg" }, { type: "sniper" }],
  enemyCount: 4,
  exitR: 6,
  tries: 24, // seeds stepped past an unplaceable or disconnected valley
};

// ---- the ground vets. clearGround: no live solid (static or dynamic)
// inside the disc; footPassable: the movement grid's own foot rule.
const SPAWN_SOLIDS = new Set(["rock", "wall", "tower", "tree", "chunk"]);
function groundBlocked(world, x, z, r) {
  for (const b of world.bodies) {
    if (!b.alive || !SPAWN_SOLIDS.has(b.kind)) continue;
    if (Math.abs(x - b.pos.x) <= b.hx + r && Math.abs(z - b.pos.z) <= b.hz + r) return true;
  }
  return false;
}
function footPassable(war, x, z) {
  const c = war.grid.cellAt(x, z);
  return !!c && !c.blocked && !c.drop;
}
// openGround: the first point on a fixed ring scan (radii then azimuths —
// deterministic, no draws) that both vets pass; null when nothing near.
export function openGround(war, x, z, r) {
  const ok = (cx, cz) => footPassable(war, cx, cz) && !groundBlocked(war.world, cx, cz, r);
  if (ok(x, z)) return { x, z };
  for (let rr = 0.6; rr <= r + 9.1; rr += 0.6) {
    for (let k = 0; k < 16; k++) {
      const az = (k / 16) * Math.PI * 2;
      const cx = x + Math.sin(az) * rr, cz = z + Math.cos(az) * rr;
      if (ok(cx, cz)) return { x: cx, z: cz };
    }
  }
  return null;
}
const SQUAD_PAD = 2.0; // covers the 1.2 m spawn ring plus a man's width // provisional (F5)
const MAN_PAD = 0.7;   // a single enemy's footprint // provisional (F5)

// townAnchor: the centroid of the standing town (the depot pad excluded).
function townAnchor(war) {
  let sx = 0, sz = 0, n = 0;
  for (const t of war.map.TOWN) {
    if (t.depot) continue;
    sx += t.x; sz += t.z; n++;
  }
  return n ? { x: sx / n, z: sz / n } : { x: 0, z: 0 };
}

// westExit: the westernmost open ground on a fixed scan of the west third,
// nearest the town's own latitude first.
function westExit(war, tz) {
  for (let x = -80; x <= -40; x += 2) {
    for (let dz = 0; dz <= 60; dz += 2) {
      for (const z of dz === 0 ? [tz] : [tz - dz, tz + dz]) {
        if (z < -80 || z > 80) continue;
        const g = openGround(war, x, z, 1.2);
        if (g && Math.hypot(g.x - x, g.z - z) < 1e-9) return g;
      }
    }
  }
  return null;
}

// connected(war, a, b): the passability proof — a breadth-first walk over
// the movement grid's foot-passable cells from a to b. A mission must be
// born crossable; weapons may carve shortcuts, never the only road.
export function connected(war, a, b) {
  const g = war.grid, W = g.w, H = g.h;
  const at = (gx, gz) => g.cells[g.idx(gx, gz)];
  const sa = g.worldToGrid(a.x, a.z), sb = g.worldToGrid(b.x, b.z);
  if (!g.inBounds(sa.gx, sa.gz) || !g.inBounds(sb.gx, sb.gz)) return false;
  const seen = new Uint8Array(W * H);
  const q = [sa.gz * W + sa.gx];
  seen[q[0]] = 1;
  const goalI = sb.gz * W + sb.gx;
  while (q.length) {
    const i = q.pop();
    if (i === goalI) return true;
    const gx = i % W, gz = (i / W) | 0;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = gx + dx, nz = gz + dz;
      if (nx < 0 || nz < 0 || nx >= W || nz >= H) continue;
      const j = nz * W + nx;
      if (seen[j]) continue;
      const c = at(nx, nz);
      if (!c || c.blocked || c.drop) continue;
      seen[j] = 1;
      q.push(j);
    }
  }
  return false;
}

// placeMission(war, def): the rules against one booted valley. Returns the
// resolved mission (forces placed, exit fixed) or null when this valley
// refuses (no exit, no clear stand, or no road between).
function placeMission(war, def) {
  const ta = townAnchor(war);
  const exit = westExit(war, ta.z);
  if (!exit) return null;
  const squadAt = [];
  const offs = [[10, 0], [14, -5], [12, 7]]; // east of the town, a loose line // provisional (F5)
  for (let i = 0; i < def.friendlies.length; i++) {
    const g = openGround(war, ta.x + offs[i % offs.length][0], ta.z + offs[i % offs.length][1], SQUAD_PAD);
    if (!g) return null;
    squadAt.push(g);
  }
  const foes = [];
  const jit = [3, -3, 6, -6, 9, -9];
  for (let i = 0; i < def.enemyCount; i++) {
    const t = 0.45 + 0.05 * i;
    const px = ta.x + (exit.x - ta.x) * t, pz = ta.z + (exit.z - ta.z) * t;
    const dx = exit.x - ta.x, dz = exit.z - ta.z, d = Math.hypot(dx, dz) || 1;
    const g = openGround(war, px + (-dz / d) * jit[i % jit.length], pz + (dx / d) * jit[i % jit.length], MAN_PAD);
    if (!g) return null;
    foes.push(g);
  }
  if (!connected(war, squadAt[0], exit)) return null;
  return { exit: { x: exit.x, z: exit.z, r: def.exitR }, squadAt, foes };
}

// bootMission(def, seed) -> { war, mission, seed } — the seed picks the
// valley; a valley the rules refuse steps to the next seed, deterministically,
// so the same asked seed always lands the same battle. The returned seed is
// the one that took; the page shows it and the address bar pins it.
export function bootMission(def, seed = 3) {
  for (let k = 0; k < (def.tries || 24); k++) {
    const s = seed + k;
    const war = bootWar({ seed: s, dev: true });
    war.world.slotTreesBlock = true; // trees are ground here: no slot, spawn, or survey goal ever lands in a trunk
    const placed = placeMission(war, def);
    if (!placed) continue;
    def.friendlies.forEach((f, i) => {
      const sq = makeSquad(war.run.nextSquadId++, f.type, 1, placed.squadAt[i].x, placed.squadAt[i].z);
      spawnSquadMembers(war.world, sq);
      war.run.squads.push(sq);
    });
    for (const g of placed.foes) spawnEnemy(war.world, { x: g.x, z: g.z }, "");
    return { war, mission: { name: def.name, exit: placed.exit }, seed: s };
  }
  throw new Error("no placeable valley within " + (def.tries || 24) + " seeds of " + seed);
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

**Step 3 — the gate.** Replace `scripts/frostline-test.mjs` whole with:

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

Sweep license, spelled out: rule placement moves the seed-3 forces, so five pins re-teach, old → new, every one produced by running this exact code at plan-writing time:

- boot worldHash `1706678194` → `2024034825`
- the pick check aims at the rifles' own placed anchor instead of the retired fixed coordinate
- contact tick `774` → `584`
- the scripted crossing: turn 4, tick 5814, all eight → turn 5, tick 7304, seven of eight, two blockers left
- end-state worldHash `244487066` → `1467655505`

Three checks are new (28 total): seeds 7, 11, and 42 each place by rule with every force on open ground and every asked seed taking first try; each placed valley proves its spawn-to-exit road; twin boots of seed 7 land bit-identical worlds. Nothing else changes; any other moved number stops the task.

**Step 4 — the page.** In `docs/frostline/main.js`, two exact hunks.

Hunk 1 — the boot, the lines:

```js
const canvas = document.getElementById("cv");
const { war, mission } = bootMission(MISSION_R1);
```

become:

```js
const canvas = document.getElementById("cv");
// the seed: ?seed=N in the address replays a battle exactly; no seed asked
// rolls a fresh valley. The seed that took is written back to the address
// and shown on the hud, so any battle can be named, saved, and reported.
const askSeed = (() => {
  const q = parseInt(new URL(location.href).searchParams.get("seed") || "", 10);
  return Number.isFinite(q) ? q : Math.floor(Math.random() * 1e9);
})();
const { war, mission, seed } = bootMission(MISSION_R1, askSeed);
history.replaceState(null, "", "?seed=" + seed);
```

Hunk 2 — the hud line:

```js
  hud.innerHTML = mkText + "<br>" + fpsText;
```

becomes:

```js
  hud.innerHTML = mkText + "<br>" + fpsText + "<br>seed " + seed;
```

**Step 5 — file identity.** `node --check` on all three changed files (each prints nothing, exit 0), then `wc -c` and `sha256sum`. The numbers must be exactly:

- `src/games/frostline/mission.js` — 7297 bytes, sha256 `09dc9ba22030d13349116c8e610364737e08189d12044c518722f0da6de907b0`
- `scripts/frostline-test.mjs` — 13631 bytes, sha256 `7e4c2e2254198b869c903afff4ec70b87b29bacf85d0c32cc7c9c2aa5e45614e`
- `docs/frostline/main.js` — 15771 bytes, sha256 `49eb9fb01ac46e940da03eb96a9d739d1524d9112fdba9b3b4d4a5fb30b37d27`

A mismatch stops the task: report it, change nothing else.

**Step 6 — the gate re-asserts.** `node scripts/gate.mjs frostline` must print 28 PASS lines, `frostline-test: 28 PASS / 0 FAIL`, `frostline-test PASS`, exit 0. No engine file changes in this task; the full suite stays where the last landing proved it and rides CI.

**Step 7 — browser smoke, the seed pinned.** Serve the repository root, then run each block as its own command:

```
python3 -m http.server 8944 >/dev/null 2>&1 &
```

```
timeout 240 chromium --headless=new --no-sandbox --use-angle=swiftshader-webgl --enable-unsafe-swiftshader --virtual-time-budget=60000 --screenshot=/tmp/claude-1000/fl3-smoke.png --window-size=900,600 "http://127.0.0.1:8944/docs/frostline/index.html?seed=7" 2>/dev/null
SZ=$(wc -c < /tmp/claude-1000/fl3-smoke.png); echo "smoke bytes $SZ"; test "$SZ" -gt 100000 && echo SMOKE-OK
```

```
timeout 240 chromium --headless=new --no-sandbox --use-angle=swiftshader-webgl --enable-unsafe-swiftshader --virtual-time-budget=60000 --dump-dom "http://127.0.0.1:8944/docs/frostline/index.html?seed=7" 2>/dev/null | grep -oE '<div id="hud">[^<]*<br>[^<]*<br>[^<]*'
```

`SMOKE-OK` must print; the hud grep must read `mk 0.0.19`, a numeric fps, and `seed 7` exactly — the asked seed took and the page says so. At trial the paint measured 314059 bytes; the threshold binds, the byte count may drift. Kill the server after.

**Step 8 — records and deploy.** Move this document to `docs/plans/task-0.0.21-1-seeds.md`. In `docs/plans/phase-0.0.19-frostline-2.md`, under `## Tasks`, add after the 0.0.19-1.5 line:

```
- 0.0.21-1 — the seed picks the valley: missions as rules, the road proven, the seed shown and pinned in the address. → `task-0.0.21-1-seeds.md`
```

In `docs/plans/game-frostline.md`, under `## Standing facts, verified in the tree`, add at the end of the list:

```
- A mission is rules over a seeded map: forces place on double-vetted ground (solids and the movement grid's foot rule), every valley proves its spawn-to-exit road before a man spawns, and a refused valley steps deterministically to the next seed. A saved battle is its seed; the page pins it in the address.
```

Commit all five files with message:

```
task 0.0.21-1 — the seed picks the valley: missions as rules, proven crossable

A mission is rules over any seeded map: the town anchors the line, the west
holds the exit, every force stands on double-vetted ground, and a flood-fill
proves the road before a man spawns. The page rolls a fresh seed each load,
shows it, and pins it in the address for exact replay. frostline-test: 28
PASS / 0 FAIL; five seed-3 pins re-taught old->new.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
```

Push. The push publishes `https://jeffreycoen.github.io/combo-engine/docs/frostline/`; the owner's live check rules look and feel.

## Known limits, said plainly

- Placement rules are tuned to valleys that carry a town; the map-type presets task will revisit the anchor rule for townless profiles (tundra, forest).
- The passability proof covers spawn to exit for the friendly side; it does not prove the patrol's ground, which the same vet places but no road check binds.
- The crossing pins bind seed 3's tape; other seeds are proven placeable and crossable-by-road, not scripted-crossed. The fixture seeds are 3, 7, 11, 42; no seed is special.
- The page's fresh-seed roll uses the browser's own randomness — outside the sim, which stays bit-deterministic per seed.

## Report shape

Read-confirmation first, then one line of outcome, then bullets: both gate count-and-verdict lines verbatim, all three wc -c lines, all three sha256 lines, the smoke bytes and hud grep verbatim, every re-taught pin old → new, commit hash, push result, the play URL. Every nonconformity its own labeled bullet. Fixture seeds: 3, 7, 11, 42; no seed is special.

## Suggested model

Sonnet 5 — every changed byte is printed here and the hashes ratify the outcome.
