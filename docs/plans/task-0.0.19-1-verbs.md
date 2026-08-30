# Task 0.0.19-1 — FL-2: the fight's verbs, and the words made readable

One job: land FROSTLINE FL-2 exactly as printed — three inert per-squad hooks in the engine's trigger, one new game module, the page's new verbs, the readable text chips, eight new gate checks — then prove the numbers, smoke, deploy, close the records. Every authored file is printed WHOLE below except `src/depot/state.js`, which changes by four exact hunks. The final file hashes are the acceptance. You design nothing.

This document lives at `docs/plans/task-0.0.19-1-verbs.md` when the task lands.

## Required reading, verified in the tree

1. This document, whole.
2. `docs/plans/phase-0.0.19-frostline-2.md` — the phase frame (written by this task's step 9; read the copy served with this plan).
3. `src/depot/state.js` — the squadFire function only, lines 485–677.
4. `docs/frostline/main.js` and `docs/frostline/index.html` — the files replaced whole.

Your report opens with a read-confirmation naming these.

## What lands

- **Three engine hooks in `squadFire`, inert everywhere outside FROSTLINE** (no depot code sets them; the full suite proves nothing moved): `squad.holdFire` (the safety — a holding squad never pulls), `squad.fireArc` (the overwatch cone — every shot stays inside its bearing window), `squad.focusId` (focus fire — a live, seen, reachable marked body outranks the nearest scan). Plus one observability line: the chosen target's id is stamped on `squad._lastTargetId`.
- **`src/games/frostline/verbs.js`** — overwatch with point investment (1 point a 90° cone, 2 points 180°), the shared mark, focus orders, careful/free discipline per squad, the per-tick fire-control writer, and the cone drawn on the existing order-path overlay.
- **The page**: OVERWATCH, MARK, and DISCIPLINE join the action bar; attack becomes a focus order through the module (the FL-1 inline field writes leave the page); mark and discipline are free — information and doctrine cost no points; chips carry the discipline letter.
- **Readable words**: title, hud, banner, and reason each sit on a dark chip — no more white on snow. Phone and desktop alike; the chips are plain CSS.
- **The gate grows 16 → 24**, all additions; no existing assert moves.

## Steps

**Step 1 — green before anything moves.** Run the full suite, one gate at a time (an engine file changes in this task):

```
for g in api combat accuracy market builder ledger weldstress tape physics-pb rig solids ballistics orders steering voxel support grapple old-master frostline; do echo "== $g"; node scripts/gate.mjs $g 2>&1 | tail -2; done
```

Every gate must pass. Any failure stops the task.

**Step 2 — the engine hooks.** In `src/depot/state.js`, apply exactly these four hunks inside `squadFire`.

Hunk 1 — after the build-order guard, before the spec lookup, the lines:

```js
  if (squad.order === "build") return;  // mk0.60: a building squad keeps quiet, exactly as a moving one does (draws nothing)
  const spec = INFANTRY_ARMS[squad.type];
```

become:

```js
  if (squad.order === "build") return;  // mk0.60: a building squad keeps quiet, exactly as a moving one does (draws nothing)
  // FROSTLINE FL-2: the game layer's per-squad safety — unset everywhere in
  // the depot game, so this line is inert outside FROSTLINE (draws nothing).
  if (squad.holdFire) return;
  const spec = INFANTRY_ARMS[squad.type];
```

Hunk 2 — inside `scanUnits`, the lines:

```js
        if ((e.kind !== "unit" && e.kind !== "vehicle" && e.kind !== "mech") || !e.alive || e.team !== enemyTeam) continue;
        const dx = e.pos.x - u.pos.x, dz = e.pos.z - u.pos.z;
```

become:

```js
        if ((e.kind !== "unit" && e.kind !== "vehicle" && e.kind !== "mech") || !e.alive || e.team !== enemyTeam) continue;
        // FROSTLINE FL-2: the overwatch cone — a set fireArc {b, half} keeps
        // every shot inside its bearing window; unset everywhere else (inert).
        if (squad.fireArc) {
          let da = Math.atan2(e.pos.x - u.pos.x, e.pos.z - u.pos.z) - squad.fireArc.b;
          while (da > Math.PI) da -= Math.PI * 2;
          while (da < -Math.PI) da += Math.PI * 2;
          if (Math.abs(da) > squad.fireArc.half) continue;
        }
        const dx = e.pos.x - u.pos.x, dz = e.pos.z - u.pos.z;
```

Hunk 3 — the target pick, the lines:

```js
    let best = null, bestIsStruct = false;
    if (squad.prefStruct) {
```

become:

```js
    let best = null, bestIsStruct = false;
    // FROSTLINE FL-2: focus fire — a marked focusId that is alive, hostile,
    // in range, seen, and clear of the arc outranks the nearest scan. The
    // cone does not bind an explicit focus. Unset everywhere else (inert).
    if (squad.focusId != null) {
      const f = world.byId.get(squad.focusId);
      if (f && f.alive && f.team === enemyTeam && (f.kind === "unit" || f.kind === "vehicle" || f.kind === "mech")) {
        const fdx = f.pos.x - u.pos.x, fdz = f.pos.z - u.pos.z;
        if (fdx * fdx + fdz * fdz < eR * eR) {
          const fc = toUV(f.pos.x, f.pos.z);
          if (fieldReaches(T, fc.u, fc.v, squad.team) && arcClears(world, muzzle, f.pos, spec, u.id)) best = f;
        }
      }
    }
    if (!best) if (squad.prefStruct) {
```

Hunk 4 — the stamp, the lines:

```js
    if (!best) continue;
    // T7: the corridor holds
```

become:

```js
    if (!best) continue;
    squad._lastTargetId = best.id; // FROSTLINE FL-2: gate observability — which body the trigger chose
    // T7: the corridor holds
```

**Step 3 — the verbs module.** Write `src/games/frostline/verbs.js`, exactly:

```js
// games/frostline/verbs.js — FL-2, the fight's verbs: overwatch cones with
// point investment, focus fire on a marked target, discipline per squad.
// Pure state over plain squad fields; the engine's squadFire reads three
// per-squad fields (holdFire, fireArc, focusId) that stay unset everywhere
// outside FROSTLINE. The page and the gate drive these helpers; nothing
// here draws from the rng.
export const OVERWATCH = {
  half1: Math.PI / 4,  // 1 point invested: a 90 degree cone // provisional (F5)
  half2: Math.PI / 2,  // 2 points invested: a 180 degree cone // provisional (F5)
  reach: 24,           // meters the drawn cone reads on the snow // provisional (F5)
};

// setOverwatch(sq, x, z, pts): the squad stands its ground and watches a
// bearing; 1 point buys the narrow cone, 2 the wide one. Ordering overwatch
// again re-aims it; the width rides the total points sunk this turn.
export function setOverwatch(sq, x, z, pts) {
  const b = Math.atan2(x - sq.anchor.x, z - sq.anchor.z);
  sq.order = "defend";
  sq.dest = null;
  sq._route = null;
  sq._routeDest = null;
  sq._ow = { b, half: pts >= 2 ? OVERWATCH.half2 : OVERWATCH.half1, pts };
}

export function clearOverwatch(sq) { sq._ow = null; }

// markTarget(war, body): the mark is one shared target the whole side can
// see; marking is free — information costs nothing.
export function markTarget(war, body) { war.run._markId = body ? body.id : null; }
export function markedTarget(war) {
  const id = war.run._markId;
  if (id == null) return null;
  const b = war.world.byId.get(id);
  return b && b.alive ? b : null;
}

// focusOrder(sq, target): focus fire — the squad's trigger prefers this
// body while it lives and stays reachable; the attack march rides FL-1's
// own two field writes.
export function focusOrder(sq, target) {
  sq.focusId = target.id;
  sq.order = "attack";
  sq.dest = { x: target.pos.x, z: target.pos.z };
  sq._route = null;
  sq._routeDest = null;
}

// Discipline per squad: CAREFUL holds fire on the enemy's half unless an
// overwatch cone covers the shot; FREE fires at anything seen, any half.
export function discOf(sq) { return sq._disc || "careful"; }
export function toggleDiscipline(sq) { sq._disc = discOf(sq) === "careful" ? "free" : "careful"; return sq._disc; }

// applyFireControl(ts, squads): run every tick before tickWar — writes the
// three engine-read fields from the turn phase, the discipline, and the
// overwatch state. Free time and the player's own half fight as FL-1 did;
// the enemy's half is where discipline and the cone rule.
export function applyFireControl(ts, squads) {
  for (const sq of squads) {
    if (sq.focusId != null) { /* cleared by the page when the target dies or a new order lands */ }
    if (ts.phase === "enemy" && discOf(sq) === "careful") {
      if (sq._ow) { sq.holdFire = false; sq.fireArc = { b: sq._ow.b, half: sq._ow.half }; }
      else { sq.holdFire = true; sq.fireArc = null; }
    } else {
      sq.holdFire = false;
      sq.fireArc = sq._ow && ts.phase === "enemy" ? { b: sq._ow.b, half: sq._ow.half } : null;
    }
  }
}

// inArc(arc, fx, fz, tx, tz): the cone's own test, offered to the gate.
export function inArc(arc, fx, fz, tx, tz) {
  let da = Math.atan2(tx - fx, tz - fz) - arc.b;
  while (da > Math.PI) da -= Math.PI * 2;
  while (da < -Math.PI) da += Math.PI * 2;
  return Math.abs(da) <= arc.half;
}

// owPaths(squads, heightAt): the drawn cone — two edge rays and a five-point
// arc as order-path polylines, riding the renderer's existing overlay.
export function owPaths(squads, heightAt) {
  const out = [];
  for (const sq of squads) {
    if (!sq._ow) continue;
    const { b, half } = sq._ow, R = OVERWATCH.reach;
    const pt = (az, r) => ({ x: sq.anchor.x + Math.sin(az) * r, y: heightAt(sq.anchor.x + Math.sin(az) * r, sq.anchor.z + Math.cos(az) * r), z: sq.anchor.z + Math.cos(az) * r });
    const o = { x: sq.anchor.x, y: heightAt(sq.anchor.x, sq.anchor.z), z: sq.anchor.z };
    out.push([o, pt(b - half, R)]);
    out.push([o, pt(b + half, R)]);
    const arc = [];
    for (let k = 0; k <= 4; k++) arc.push(pt(b - half + (k / 4) * 2 * half, R));
    out.push(arc);
  }
  return out;
}
```

**Step 4 — the gate.** Replace `scripts/frostline-test.mjs` whole with:

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

console.log(`frostline-test: ${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
console.log("frostline-test PASS");
```

**Step 5 — the page.** Replace `docs/frostline/index.html` whole with:

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
    text-align: center; color: #e9edf2; font: 600 13px/1.4 system-ui, sans-serif; letter-spacing: 0.35em;
    pointer-events: none; background: rgba(13,17,23,.6); padding: 4px 12px; border-radius: 8px; white-space: nowrap; }
  #hud { position: fixed; top: max(10px, env(safe-area-inset-top)); right: 12px; color: rgba(233,237,242,.85);
    font: 500 11px/1.4 ui-monospace, monospace; pointer-events: none; text-align: right;
    background: rgba(13,17,23,.6); padding: 4px 8px; border-radius: 8px; }
  #banner { position: fixed; top: 38%; left: 50%; transform: translateX(-50%); text-align: center;
    pointer-events: none; color: #e9b25c; font: 700 22px/1.3 system-ui, sans-serif; letter-spacing: 0.3em;
    background: rgba(13,17,23,.65); padding: 8px 18px; border-radius: 10px; white-space: nowrap; display: none; }
  #reason { position: fixed; top: calc(38% + 50px); left: 50%; transform: translateX(-50%); text-align: center;
    pointer-events: none; color: rgba(233,237,242,.9); font: 500 12px/1.4 system-ui, sans-serif; letter-spacing: 0.12em;
    background: rgba(13,17,23,.6); padding: 5px 12px; border-radius: 8px; white-space: nowrap; display: none; }
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

and `docs/frostline/main.js` whole with:

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
import { setOverwatch, clearOverwatch, applyFireControl, toggleDiscipline, discOf, markTarget, markedTarget, focusOrder, owPaths, OVERWATCH } from "../../src/games/frostline/verbs.js";
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
const actOw = document.getElementById("actOw"), actMark = document.getElementById("actMark"), actDisc = document.getElementById("actDisc");
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
    el.textContent = label(sq) + " · " + liveCount(sq) + " · " + (discOf(sq) === "careful" ? "C" : "F") + ap;
  }
  const inOrders = ts.phase === "orders" && !over;
  actionsEl.style.display = inOrders ? "flex" : "none";
  actMove.className = "act" + (mode === "move" ? " on" : "");
  actAttack.className = "act" + (mode === "attack" ? " on" : "");
  actOw.className = "act" + (mode === "ow" ? " on" : "");
  actMark.className = "act" + (mode === "mark" ? " on" : "");
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
  const priced = p.kind !== "mark" && p.kind !== "disc"; // information and doctrine are free
  if (!free && priced && !spend(ts, p.sq)) return;
  if (p.kind === "move") { p.sq.focusId = null; clearOverwatch(p.sq); orderMove(p.sq, p.x, p.z); }
  else if (p.kind === "attack") { clearOverwatch(p.sq); focusOrder(p.sq, p.target); }
  else if (p.kind === "hold") { p.sq.focusId = null; clearOverwatch(p.sq); p.sq.order = "defend"; p.sq.dest = null; }
  else if (p.kind === "ow") { p.sq.focusId = null; setOverwatch(p.sq, p.x, p.z, p.pts); }
  else if (p.kind === "mark") markTarget(war, p.target);
  else if (p.kind === "disc") toggleDiscipline(p.sq);
  R.overlay.setOrderPaths(allPaths());
  mode = null;
});

actMove.addEventListener("click", () => { mode = mode === "move" ? null : "move"; });
actAttack.addEventListener("click", () => { mode = mode === "attack" ? null : "attack"; });
actOw.addEventListener("click", () => { mode = mode === "ow" ? null : "ow"; });
actMark.addEventListener("click", () => { mode = mode === "mark" ? null : "mark"; });
actDisc.addEventListener("click", () => {
  const next = discOf(selected) === "careful" ? "FREE — fires at anything seen, any half" : "CAREFUL — holds fire on the enemy half unless a cone covers it";
  present({ kind: "disc", sq: selected, title: "DISCIPLINE — " + label(selected), body: next + "<br>free — no cost" });
});
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

// ---- gestures: a tap orders; two fingers are the camera (pinch zooms,
// twist rotates) and never order. A tap is down-and-up under 9 px with no
// second finger; orders moved from pointerdown to the release so the first
// finger of a pinch never pops a confirmation.
const clampZoom = (z) => Math.max(0.5, Math.min(2.6, z));
const ptrs = new Map();
let gesture = false, tapStart = null, pinchD = 0, twistA = 0;
canvas.addEventListener("pointerdown", (e) => {
  ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (ptrs.size === 2) {
    gesture = true; tapStart = null;
    const [a, b] = [...ptrs.values()];
    pinchD = Math.hypot(b.x - a.x, b.y - a.y);
    twistA = Math.atan2(b.y - a.y, b.x - a.x);
  } else if (ptrs.size === 1) tapStart = { id: e.pointerId, x: e.clientX, y: e.clientY };
});
canvas.addEventListener("pointermove", (e) => {
  const p = ptrs.get(e.pointerId);
  if (!p) return;
  p.x = e.clientX; p.y = e.clientY;
  if (gesture && ptrs.size === 2) {
    const [a, b] = [...ptrs.values()];
    const d = Math.hypot(b.x - a.x, b.y - a.y);
    const ang = Math.atan2(b.y - a.y, b.x - a.x);
    if (pinchD > 0) { zoom = clampZoom(zoom * (d / pinchD)); R.setZoom(zoom); }
    let da = ang - twistA;
    if (da > Math.PI) da -= 2 * Math.PI;
    if (da < -Math.PI) da += 2 * Math.PI;
    R.rotateBy(-da);
    pinchD = d; twistA = ang;
  }
});
canvas.addEventListener("pointerup", (e) => {
  const wasTap = tapStart && tapStart.id === e.pointerId && !gesture &&
    Math.hypot(e.clientX - tapStart.x, e.clientY - tapStart.y) < 9;
  ptrs.delete(e.pointerId);
  if (ptrs.size === 0) gesture = false;
  tapStart = null;
  if (wasTap) tapAt(e.clientX, e.clientY);
});
canvas.addEventListener("pointercancel", (e) => { ptrs.delete(e.pointerId); if (ptrs.size === 0) gesture = false; tapStart = null; });
document.getElementById("rotL").addEventListener("click", () => R.rotateStep(1));
document.getElementById("rotR").addEventListener("click", () => R.rotateStep(-1));

function tapAt(cx, cy) {
  if (over || pending) return;
  const w = screenToWorld(cx, cy);
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
  if (mode === "ow") {
    const pts = selected._ow ? 2 : 1;
    const deg = pts >= 2 ? 180 : 90;
    present({ kind: "ow", sq: selected, x: w.x, z: w.z, pts, title: "OVERWATCH — " + label(selected),
      body: "a " + deg + "° cone on that bearing, enemy half only<br>" + (free ? "free time — no cost" : "cost 1 point · " + (apOf(ts, selected) - 1) + " after") + (pts === 1 ? "<br>overwatch again to widen" : "") });
    aim = { x: w.x, z: w.z };
    return;
  }
  if (mode === "mark") {
    const threats = knownThreats(war);
    let best = null, bd = 6;
    for (const t of threats) { const d = Math.hypot(t.pos.x - w.x, t.pos.z - w.z); if (d < bd) { bd = d; best = t; } }
    if (!best) return;
    present({ kind: "mark", sq: selected, target: best, title: "MARK TARGET", body: "the mark is the whole side's<br>free — no cost" });
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
}
addEventListener("wheel", (e) => { zoom = clampZoom(zoom + (e.deltaY > 0 ? -0.12 : 0.12)); R.setZoom(zoom); }, { passive: true });
addEventListener("keydown", (e) => {
  if (e.code === "Tab") { e.preventDefault(); selected = cycleSquad(squads, selected); }
  else if (e.code === "KeyQ") R.rotateStep(1);
  else if (e.code === "KeyE") R.rotateStep(-1);
});

// ---- the overlay: order routes, overwatch cones, the mark's ring
function allPaths() {
  const hAt = (x, z) => war.field.heightAt(x, z);
  const paths = orderPaths(squads).concat(owPaths(squads, hAt));
  const m = markedTarget(war);
  if (m) {
    const ring = [];
    for (let k = 0; k <= 10; k++) { const a = (k / 10) * Math.PI * 2; const x = m.pos.x + Math.sin(a) * 1.2, z = m.pos.z + Math.cos(a) * 1.2; ring.push({ x, y: hAt(x, z), z }); }
    paths.push(ring);
  }
  return paths;
}

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
      for (const sq of squads) { if (sq.focusId != null) { const f = war.world.byId.get(sq.focusId); if (!f || !f.alive) sq.focusId = null; } }
      applyFireControl(ts, squads);
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
      if (flags && flags.orderPaths) R.overlay.setOrderPaths(allPaths());
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

**Step 6 — file identity.** `node --check` on `state.js`, `verbs.js`, `main.js`, `frostline-test.mjs` (each prints nothing, exit 0), then `wc -c` and `sha256sum` on all five changed files. The numbers must be exactly:

- `src/depot/state.js` — 107954 bytes, sha256 `a0d842103bf7188785a789f57e01a930a09de51dcbb4946adeb7a322353909ba`
- `src/games/frostline/verbs.js` — 4205 bytes, sha256 `c3c64746c950670ca5bd0125cd6ca8b24dd7daa3d0efd9e409fe3ef918881bbb`
- `scripts/frostline-test.mjs` — 11961 bytes, sha256 `ee2aa2982cc466b812401f4b670d9c6d02b1c9a1ea7a1718d5d3f61a45a9f7a6`
- `docs/frostline/index.html` — 4689 bytes, sha256 `991f0a156faf9b6de1f73a6eda701897500d7d067cac0ff90b3857ca9456b91c`
- `docs/frostline/main.js` — 15282 bytes, sha256 `c20028b36780675a4244aecda4bfbd3d396686c67f29495c94fd1fac8101109f`

A mismatch stops the task: report it, change nothing else.

**Step 7 — the gates re-assert.** Run `node scripts/gate.mjs frostline` — it must print 24 PASS lines, then `frostline-test: 24 PASS / 0 FAIL`, then `frostline-test PASS`, exit 0. Then run the full suite with the step-1 loop — every prior gate unmoved. Report every tail verbatim.

**Step 8 — browser smoke.** Serve the repository root, then run each block as its own command:

```
python3 -m http.server 8944 >/dev/null 2>&1 &
```

```
timeout 240 chromium --headless=new --no-sandbox --use-angle=swiftshader-webgl --enable-unsafe-swiftshader --virtual-time-budget=90000 --screenshot=/tmp/claude-1000/fl2-landing-smoke.png --window-size=900,600 http://127.0.0.1:8944/docs/frostline/index.html 2>/dev/null
SZ=$(wc -c < /tmp/claude-1000/fl2-landing-smoke.png); echo "smoke bytes $SZ"; test "$SZ" -gt 100000 && echo SMOKE-OK
```

```
timeout 240 chromium --headless=new --no-sandbox --use-angle=swiftshader-webgl --enable-unsafe-swiftshader --virtual-time-budget=90000 --dump-dom http://127.0.0.1:8944/docs/frostline/index.html 2>/dev/null | grep -oE '<div id="hud">[^<]*<br>[^<]*|id="actOw"|id="actMark"|id="actDisc"'
```

`SMOKE-OK` must print; the grep must print the hud line reading `mk 0.0.18` with a numeric fps (the smoke runs before the version bump) and all three new button ids. At trial the smoke measured 347479 bytes; the threshold binds, the byte count may drift. Kill the server after.

**Step 9 — records and deploy.** Move this document to `docs/plans/task-0.0.19-1-verbs.md` and the served phase document to `docs/plans/phase-0.0.19-frostline-2.md`. In `docs/plans/game-frostline.md`, the FL-2 ladder line gains the `[LANDED]` prefix exactly as FL-1's carries it. In `package.json`, version `0.0.18` becomes `0.0.19`. In the phase document, the status line becomes `Status: LANDED, commit \`<hash>\`, <date>. Gate: 24 PASS / 0 FAIL; prior gates unmoved.` Commit everything with message:

```
phase 0.0.19 — FROSTLINE FL-2: the fight's verbs

Overwatch cones priced in points, focus fire on a shared mark, careful/free
discipline a squad at a time — three inert hooks in the engine's trigger, the
rest pure game state. Every floating word now sits on a dark chip, phone and
desktop. frostline-test: 24 PASS / 0 FAIL; all prior gates unmoved; page smoked.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
```

Push. The push publishes `https://jeffreycoen.github.io/combo-engine/docs/frostline/`; the owner's live check rules look, feel, and sound.

## Known limits, said plainly

- The cone, the mark's ring, and the new confirmations are smoke-proven to boot and paint; their feel is verified only at the owner's live check.
- With careful discipline the default, squads without a cone are silent on the enemy half — the enemy presses harder than FL-1's page. A playtest dial, not a defect; FREE discipline restores FL-1's behavior per squad.
- Overwatch aims by bearing from the squad's anchor at order time; a squad that later moves keeps its cone until any new order clears it.
- All dials provisional: cone widths (90°/180°), cone draw reach 24 m, mark radius 1.2 m, careful as the default.

## Report shape

Read-confirmation first, then one line of outcome, then bullets: the frostline gate's count and verdict lines verbatim, every prior-gate tail, all five wc -c lines, all five sha256 lines, the smoke bytes and grep lines verbatim, commit hash, push result, the play URL. Every nonconformity its own labeled bullet. Fixture seed: 3 (MISSION_R1's field); no seed is special.

## Suggested model

Sonnet 5 — every changed byte is printed here and the hashes ratify the outcome.
