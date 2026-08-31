# Task 0.0.20-1 — nobody spawns in a tree, and the buttons keep their lanes

One job: close the two playtest defects — squads starting inside trees and bulldozing them, and the phone screen's overlapping text and buttons. One opt-in engine line, one rewritten mission boot, a re-taught gate, and page CSS. Two files are printed whole; two change by one exact hunk each; one is replaced whole. The final hashes are the acceptance. You design nothing.

This document lives at `docs/plans/task-0.0.20-1-groundwork.md` when the task lands.

## Required reading, verified in the tree

1. This document, whole.
2. `src/depot/squads.js` — the `slotBlocked` function only, near line 192.
3. `src/games/frostline/mission.js` — replaced whole below.
4. `docs/frostline/index.html` — replaced whole below.

Your report opens with a read-confirmation naming these.

## The diagnosis, so the fix reads

- The engine's slot vet (`slotBlocked`) reads only STATIC solids. Trees and loose chunks are dynamic bodies — that is why they topple — so a spawn ring, a defend micro-slot, or the sniper pair's placement survey could land a man inside a trunk; the engine ejects him and the trunk goes flat. Found live: the spotter's survey goal sat exactly on a tree cluster at (10, 36).
- The fix is one opt-in scan in `slotBlocked` behind a world flag only FROSTLINE's mission boot sets. No depot code sets it, and the full suite run at plan-writing time pins every prior number unmoved — including the api gate's world and run hashes, byte-identical.
- The mission boot additionally vets each squad anchor and each enemy spawn point against every live solid, so forces start on open ground.
- The phone screen: chips become a left-hand column capped at 44vw; the action bar becomes a two-column grid capped at 48vw on the right — they cannot meet. The title truncates before the mk chip; the banners cap at screen width and wrap.

## Steps

**Step 1 — green before anything moves.** Run the full suite, one gate at a time (an engine file changes in this task):

```
for g in api combat accuracy market builder ledger weldstress tape physics-pb rig solids ballistics orders steering voxel support grapple old-master frostline; do echo "== $g"; node scripts/gate.mjs $g 2>&1 | tail -2; done
```

Every gate must pass (frostline prints 24 PASS / 0 FAIL at this point). Any failure stops the task.

**Step 2 — the engine learns, on the game's word only.** In `src/depot/squads.js`, inside `slotBlocked`, the line:

```js
  // P7 T12: THE HULL IS GROUND TOO — a live vehicle blocks a slot exactly as
```

gains this block immediately BEFORE it:

```js
  // FROSTLINE FL-2.5: TREES ARE GROUND TOO, on the game's word — a slot
  // inside a dynamic tree or loose chunk ejects the man and bulldozes the
  // trunk. Opt-in per world (world.slotTreesBlock, set only by FROSTLINE's
  // mission boot; no depot code sets it), so every existing behavior pin
  // holds. The solids pool already carries dynamic trees/chunks under the
  // kind-not-mobility rule; the statics loop above has the rest.
  if (world.slotTreesBlock) {
    const tpool = world._L ? world._L.solids : world.bodies;
    for (const b of tpool) {
      if (!b.alive || !(b.invM > 0) || (b.kind !== "tree" && b.kind !== "chunk")) continue;
      if (Math.abs(x - b.pos.x) <= b.hx + clear && Math.abs(z - b.pos.z) <= b.hz + clear) return true;
    }
  }
```

**Step 3 — the mission boots on vetted ground.** Replace `src/games/frostline/mission.js` whole with:

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

// clearGround(world, x, z, r): the spawn vet. The engine's own slot vet
// (clearSlot) sees only static solids — trees and loose chunks are DYNAMIC
// bodies, so a squad placed on a tree line spawned inside the trunks and
// knocked them flat. This vet reads every live solid-kind body, dynamic or
// not; a blocked point sweeps the same fixed ring clearSlot sweeps (radii
// then azimuths, deterministic, no draws) for the nearest clear ground.
const SPAWN_SOLIDS = new Set(["rock", "wall", "tower", "tree", "chunk"]);
function groundBlocked(world, x, z, r) {
  for (const b of world.bodies) {
    if (!b.alive || !SPAWN_SOLIDS.has(b.kind)) continue;
    if (Math.abs(x - b.pos.x) <= b.hx + r && Math.abs(z - b.pos.z) <= b.hz + r) return true;
  }
  return false;
}
export function clearGround(world, x, z, r) {
  if (!groundBlocked(world, x, z, r)) return { x, z };
  for (let rr = 0.6; rr <= r + 7.3; rr += 0.6) { // the sweep reaches past the asked disc, whatever its size
    for (let k = 0; k < 16; k++) {
      const az = (k / 16) * Math.PI * 2;
      const cx = x + Math.sin(az) * rr, cz = z + Math.cos(az) * rr;
      if (!groundBlocked(world, cx, cz, r)) return { x: cx, z: cz };
    }
  }
  return { x, z };
}
const SQUAD_PAD = 2.0; // covers the 1.2 m spawn ring plus a man's width // provisional (F5)
const MAN_PAD = 0.7;   // a single enemy's footprint // provisional (F5)

// bootMission(def) -> { war, mission } — booted dev, forces placed on
// vetted ground (no squad ever starts inside a tree), no tick.
export function bootMission(def) {
  const war = bootWar({ seed: def.seed, dev: true });
  war.world.slotTreesBlock = true; // trees are ground here: no slot, spawn, or survey goal ever lands in a trunk
  for (const f of def.friendlies) {
    const g = clearGround(war.world, f.x, f.z, SQUAD_PAD);
    const sq = makeSquad(war.run.nextSquadId++, f.type, 1, g.x, g.z);
    spawnSquadMembers(war.world, sq);
    war.run.squads.push(sq);
  }
  for (const e of def.enemies) {
    const g = clearGround(war.world, e.x, e.z, MAN_PAD);
    spawnEnemy(war.world, { x: g.x, z: g.z }, e.tag);
  }
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

**Step 4 — the gate re-teaches its moved pins and grows one check.** Replace `scripts/frostline-test.mjs` whole with:

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
    && !s.won && !s.lost && worldHash(war.world) === 1706678194);
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
  check("free time ends at first sight: contact at tick 774 exactly", contactAt === 774);
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
  check("the mission crosses under fire: won on turn 4 at tick 5814, all eight standing",
    ts.turn === 4 && tick === 5814 && s.won && !s.lost && s.friendlies === 8 && s.enemies === 3);
  check("the end-state world pins", worldHash(war.world) === 244487066); }

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

console.log(`frostline-test: ${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
console.log("frostline-test PASS");
```

Sweep license, spelled out: the spawn vet moves the boot. Four pins re-teach, old → new, every one produced by running this exact code at plan-writing time:

- boot worldHash `230891517` → `1706678194`
- contact tick `835` → `774`
- the scripted crossing: turn 3, tick 4195, seven of eight → turn 4, tick 5814, ALL EIGHT standing
- end-state worldHash `1467228477` → `244487066`

One check is new (25 total): 600 idle ticks move no tree — the forest holds still. Nothing else in the gate changes; any other moved number stops the task.

**Step 5 — the page keeps its lanes.** Replace `docs/frostline/index.html` whole with:

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
  #title { position: fixed; top: max(10px, env(safe-area-inset-top)); left: 50%; transform: translateX(-50%);
    text-align: center; color: #e9edf2; font: 600 12px/1.4 system-ui, sans-serif; letter-spacing: 0.2em;
    pointer-events: none; background: rgba(13,17,23,.6); padding: 4px 12px; border-radius: 8px; white-space: nowrap;
    max-width: calc(100vw - 170px); overflow: hidden; text-overflow: ellipsis; }
  #hud { position: fixed; top: max(10px, env(safe-area-inset-top)); right: 12px; color: rgba(233,237,242,.85);
    font: 500 11px/1.4 ui-monospace, monospace; pointer-events: none; text-align: right;
    background: rgba(13,17,23,.6); padding: 4px 8px; border-radius: 8px; }
  #banner { position: fixed; top: 38%; left: 50%; transform: translateX(-50%); text-align: center;
    pointer-events: none; color: #e9b25c; font: 700 22px/1.3 system-ui, sans-serif; letter-spacing: 0.3em;
    background: rgba(13,17,23,.65); padding: 8px 18px; border-radius: 10px; white-space: nowrap; max-width: 92vw; display: none; }
  #reason { position: fixed; top: calc(38% + 50px); left: 50%; transform: translateX(-50%); text-align: center;
    pointer-events: none; color: rgba(233,237,242,.9); font: 500 12px/1.4 system-ui, sans-serif; letter-spacing: 0.12em;
    background: rgba(13,17,23,.6); padding: 5px 12px; border-radius: 8px; max-width: 86vw; display: none; }
  #pauseB { position: fixed; right: 14px; bottom: max(16px, env(safe-area-inset-bottom)); width: 74px; height: 44px;
    border-radius: 10px; border: 1.5px solid rgba(233,237,242,.4); background: rgba(13,17,23,.55);
    color: #e9edf2; font: 600 12px system-ui, sans-serif; letter-spacing: 0.15em; }
  #squads { position: fixed; left: 12px; bottom: max(16px, env(safe-area-inset-bottom)); display: flex;
    flex-direction: column; gap: 6px; max-width: 44vw; align-items: flex-start; }
  #actions { position: fixed; right: 12px; bottom: max(16px, env(safe-area-inset-bottom)); display: grid;
    grid-template-columns: repeat(2, minmax(92px, 1fr)); gap: 6px; max-width: 48vw; }
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
  #camBtns { position: fixed; left: 12px; top: max(48px, calc(env(safe-area-inset-top) + 38px)); display: flex; gap: 6px; }
  #camBtns button { width: 44px; height: 44px; border-radius: 10px; border: 1.5px solid rgba(233,237,242,.4);
    background: rgba(13,17,23,.55); color: #e9edf2; font: 600 18px system-ui, sans-serif; }
</style>
</head>
<body>
<canvas id="cv"></canvas>
<div id="title">FROSTLINE</div>
<div id="hud">mk -<br>- fps</div>
<div id="banner">PAUSED</div>
<div id="camBtns"><button id="rotL">⟲</button><button id="rotR">⟳</button></div>
<div id="reason"></div>
<div id="actions" style="display:none">
  <button class="act" id="actMove">MOVE</button>
  <button class="act" id="actAttack">ATTACK</button>
  <button class="act" id="actHold">HOLD</button>
  <button class="act" id="actOw">OVERWATCH</button>
  <button class="act" id="actMark">MARK</button>
  <button class="act" id="actDisc">DISCIPLINE</button>
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

And in `docs/frostline/main.js`, the one line:

```js
  actionsEl.style.display = inOrders ? "flex" : "none";
```

becomes:

```js
  actionsEl.style.display = inOrders ? "grid" : "none";
```

**Step 6 — file identity.** `node --check` on `squads.js`, `mission.js`, `main.js`, `frostline-test.mjs` (each prints nothing, exit 0), then `wc -c` and `sha256sum` on all five changed files. The numbers must be exactly:

- `src/depot/squads.js` — 55716 bytes, sha256 `c24a90479106bfcfd96c2508a88a575ed144dbe45fc8a358f0486ac90e0de16e`
- `src/games/frostline/mission.js` — 3961 bytes, sha256 `489eb7cfe8ad8c3f52ccb01ea2f6cf088bfae2dab3328b00973d1c2e6ccfa9e5`
- `scripts/frostline-test.mjs` — 12577 bytes, sha256 `79c5b44cd396620677a09e6a53376320a9af3c3041eed16db1dda09ed5d5eef4`
- `docs/frostline/index.html` — 4900 bytes, sha256 `6da36b093d9b6b6b5a87abcf544a986c155d837827a3d58d403c3e80de761bb1`
- `docs/frostline/main.js` — 15282 bytes, sha256 `0f5f984bc21f9b7de8c1705eddec461923be15a83b546520c34b00b67cab40db`

A mismatch stops the task: report it, change nothing else.

**Step 7 — the gates re-assert.** `node scripts/gate.mjs frostline` must print 25 PASS lines, `frostline-test: 25 PASS / 0 FAIL`, `frostline-test PASS`, exit 0. Then the step-1 full-suite loop again — every prior gate unmoved, the api gate's hash line byte-identical to step 1's.

**Step 8 — browser smoke, phone and desktop.** Serve the repository root, then run each block as its own command:

```
python3 -m http.server 8944 >/dev/null 2>&1 &
```

```
timeout 240 chromium --headless=new --no-sandbox --use-angle=swiftshader-webgl --enable-unsafe-swiftshader --virtual-time-budget=90000 --screenshot=/tmp/claude-1000/fl25-desk.png --window-size=900,600 http://127.0.0.1:8944/docs/frostline/index.html 2>/dev/null
SZ=$(wc -c < /tmp/claude-1000/fl25-desk.png); echo "desk bytes $SZ"; test "$SZ" -gt 100000 && echo DESK-OK
```

```
timeout 240 chromium --headless=new --no-sandbox --use-angle=swiftshader-webgl --enable-unsafe-swiftshader --virtual-time-budget=90000 --screenshot=/tmp/claude-1000/fl25-phone.png --window-size=390,844 http://127.0.0.1:8944/docs/frostline/index.html 2>/dev/null
SZ=$(wc -c < /tmp/claude-1000/fl25-phone.png); echo "phone bytes $SZ"; test "$SZ" -gt 100000 && echo PHONE-OK
```

```
timeout 240 chromium --headless=new --no-sandbox --use-angle=swiftshader-webgl --enable-unsafe-swiftshader --virtual-time-budget=90000 --dump-dom http://127.0.0.1:8944/docs/frostline/index.html 2>/dev/null | grep -oE '<div id="hud">[^<]*<br>[^<]*'
```

`DESK-OK` and `PHONE-OK` must print; the hud line must read `mk 0.0.19` with a numeric fps. At trial the phone paint measured 225411 bytes and the layout was verified by eye: chips column left, no clipping, no overlap. Kill the server after.

**Step 9 — records and deploy.** Move this document to `docs/plans/task-0.0.20-1-groundwork.md`. In `docs/plans/phase-0.0.19-frostline-2.md`, under `## Tasks`, add after the 0.0.19-1 line:

```
- 0.0.20-1 — spawns on vetted ground (trees block slots on the game's word), the phone layout kept in lanes, four pins re-taught. → `task-0.0.20-1-groundwork.md`
```

Commit all six files with message:

```
task 0.0.20-1 — nobody spawns in a tree; the buttons keep their lanes

Trees block slots on the game's word (one opt-in engine line, proven inert on
every prior gate); mission forces boot on vetted ground; the forest holds still
under a new gate check. Chips a column, actions a grid, banners capped — phone
and desktop. frostline-test: 25 PASS / 0 FAIL; four pins re-taught old->new.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
```

Push. The push publishes `https://jeffreycoen.github.io/combo-engine/docs/frostline/`; the owner's live check rules look and feel.

## Known limits, said plainly

- A man ORDERED through a forest still shoulders trees aside en route — the vet governs where he stands, not every step of his walk. That is the engine's own physics; if it reads wrong in play it is its own future task.
- The scripted-crossing pins moved because the spawns moved; the new numbers say the mission still crosses and now keeps all eight alive on this tape. Difficulty feel is the owner's call at the page.
- The headless phone shot could not be forced into the orders phase (the patrol made no contact unattended in that run); the no-overlap claim for the action grid rests on the capped-width arithmetic (44vw + 48vw < 100vw) and the trial screenshots. The owner's thumb is the final check.

## Report shape

Read-confirmation first, then one line of outcome, then bullets: the frostline gate count-and-verdict lines verbatim, every prior-gate tail from both suite runs, all five wc -c lines, all five sha256 lines, both smoke byte lines and the hud grep verbatim, every re-taught pin old → new, commit hash, push result, the play URL. Every nonconformity its own labeled bullet. Fixture seed: 3 (MISSION_R1's field); no seed is special.

## Suggested model

Sonnet 5 — every changed byte is printed here and the hashes ratify the outcome.
