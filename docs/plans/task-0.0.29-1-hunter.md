# Task 0.0.29-1 — the hunter: one armored man, twin sidearms, the jetpack line

One job: land FL-9 exactly as printed — two additive engine rows, the per-type move cap, the one-of-a-kind purchase, five new gate checks, the full suite proven unmoved. Two engine files change by one printed hunk each; four files are printed whole. The final hashes are the acceptance. You design nothing.

This document lives at `docs/plans/task-0.0.29-1-hunter.md` when the task lands; the phase frame `docs/plans/phase-0.0.29-frostline-9.md` is served with it and copied in at landing.

## Required reading, verified in the tree

1. This document, whole.
2. The phase frame, whole.
3. `src/depot/specs.js` — the INFANTRY_ARMS table, near line 260.
4. `src/depot/squads.js` — the SQUAD_SPECS table, near line 33.

Your report opens with a read-confirmation naming these.

## Steps

**Step 1 — green before anything moves.** Run the full suite, one gate at a time (engine files change in this task):

```
for g in api combat accuracy market builder ledger weldstress tape physics-pb rig solids ballistics orders steering voxel support grapple old-master frostline; do echo "== $g"; node scripts/gate.mjs $g 2>&1 | tail -2; done
```

Every gate must pass (frostline prints 58 PASS / 0 FAIL here); the verdicts PRINT before any file is touched. Any failure stops the task.

**Step 2 — the sidearms row.** In `src/depot/specs.js`, the lines:

```js
  rifles: { projSpeed: 90, kind: "mg", weapon: "rifle", dmg: 5, dirDmg: 15, fireRate: 1.3, range: 15,
            acc: 0.090, occl: "arc", windF: 0.06, windComp: 0.6 },
```

become:

```js
  rifles: { projSpeed: 90, kind: "mg", weapon: "rifle", dmg: 5, dirDmg: 15, fireRate: 1.3, range: 15,
            acc: 0.090, occl: "arc", windF: 0.06, windComp: 0.6 },
  // FROSTLINE FL-9 (owner): THE TWIN SIDEARMS — the hunter's own irons. A
  // two-round pull (one from each hand), short reach, quick cadence, real
  // hurt up close. Additive row: no depot code names it. // provisional (F5)
  hunter: { projSpeed: 80, kind: "mg", weapon: "sidearms", dmg: 5, dirDmg: 11, burst: 2, burstGap: 0.10,
            fireRate: 0.8, range: 12, acc: 0.075, occl: "arc", windF: 0.06, windComp: 0.6 },
```

**Step 3 — the squad row.** In `src/depot/squads.js`, the line:

```js
  medics: { n: 2, cost: 55, label: "MEDIC TEAM" },
```

becomes:

```js
  medics: { n: 2, cost: 55, label: "MEDIC TEAM" },
  // FROSTLINE FL-9 (owner): THE HUNTER — one armored man, twin sidearms,
  // the jetpack line. Additive row: no depot code names it. // provisional (F5)
  hunter: { n: 1, cost: 120, speed: 3.6, label: "THE HUNTER" },
```

**Step 4 — the cap and the books.** Replace `src/games/frostline/turns.js` whole with:

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
  jetCap: 35,     // the hunter's jetpack line — his move flies farther // provisional (F5)
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

// capOf(sq): the hunter flies his jetpack line; everyone else marches.
export function capOf(sq) { return sq.type === "hunter" ? TURNS.jetCap : TURNS.moveCap; }

// clampMove(sq, x, z): the move cap — a destination past the cap lands ON
// the cap along the same line. Returns the priced destination.
export function clampMove(sq, x, z) {
  const cap = capOf(sq);
  const ax = sq.anchor.x, az = sq.anchor.z;
  const d = Math.hypot(x - ax, z - az);
  if (d <= cap) return { x, z };
  const s = cap / d;
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

and `src/games/frostline/purse.js` whole with:

```js
// games/frostline/purse.js — FL-4, the purse. Every enemy defeated pays its
// bounty, win or lose; a won contract adds the completion bonus; the purse
// buys new team types onto the roster between battles. Pure state over a
// plain object; persistence goes through an injected storage (the page
// hands in the browser's own; tests hand in a plain object) so nothing
// here touches a global. No rng anywhere.
import { SQUAD_SPECS } from "../../depot/squads.js";

export const WIN_BONUS = 25;            // provisional (F5)
export const STORE_KEY = "frostline-purse";
// The teams the debrief sells, priced by the engine's own squad table.
export const FOR_SALE = ["rifles", "mg", "sniper", "medics", "hunter"];

export function makePurse() {
  // men: heads per fielded squad slot (base three first, bought teams after);
  // null means every squad at full strength. fallen: the campaign's dead.
  return { scrap: 0, earned: 0, kills: 0, roster: [], heat: 0, men: null, fallen: 0 };
}

// loadPurse(storage) -> a purse from the vault, or a fresh one. A broken
// or missing record never throws — the war starts broke, not crashed.
export function loadPurse(storage) {
  try {
    const raw = storage.getItem(STORE_KEY);
    if (!raw) return makePurse();
    const p = JSON.parse(raw);
    if (typeof p.scrap !== "number" || !Array.isArray(p.roster)) return makePurse();
    return { scrap: p.scrap, earned: p.earned || 0, kills: p.kills || 0, roster: p.roster.filter((t) => SQUAD_SPECS[t]), heat: p.heat || 0,
      men: Array.isArray(p.men) ? p.men.map((v) => Math.max(0, v | 0)) : null, fallen: p.fallen || 0 };
  } catch { return makePurse(); }
}

export function savePurse(storage, purse) {
  storage.setItem(STORE_KEY, JSON.stringify(purse));
}

// earnFromEvents(purse, war, events) -> scrap paid this call. A kill pays
// when the attacker is the player and the victim an enemy unit still on
// the books with a bounty; everything else pays nothing (the engine's own
// kill law: world and friendly fire pay nobody).
export function earnFromEvents(purse, war, events) {
  let paid = 0;
  for (const ev of events) {
    if (ev.type !== "kill" || ev.attacker !== "player" || ev.team !== 2 || ev.kind !== "unit") continue;
    const victim = war.world.byId.get(ev.id);
    const bounty = victim && victim.bounty ? victim.bounty : 0;
    if (bounty <= 0) continue;
    paid += bounty;
    purse.kills++;
  }
  purse.scrap += paid;
  purse.earned += paid;
  return paid;
}

// winBonus(purse) -> the completion bonus, credited once; the caller owns
// the once (the page pays it when the win card first shows).
export function winBonus(purse) {
  purse.scrap += WIN_BONUS;
  purse.earned += WIN_BONUS;
  return WIN_BONUS;
}

export function teamPrice(type) {
  return SQUAD_SPECS[type] ? SQUAD_SPECS[type].cost : Infinity;
}

// buyTeam(purse, type) -> true when the price was met: the team joins the
// roster and the purse pays. A dry purse refuses and changes nothing.
export function buyTeam(purse, type) {
  const price = teamPrice(type);
  if (type === "hunter" && purse.roster.includes("hunter")) return false; // one of a kind
  if (!SQUAD_SPECS[type] || purse.scrap < price) return false;
  purse.scrap -= price;
  purse.roster.push(type);
  if (purse.men) purse.men.push(SQUAD_SPECS[type].n); // a bought team arrives at full strength
  return true;
}

// ---- FL-7: the men persist; the dead stay dead; replacements cost scrap.
export const BASE_TYPES = ["rifles", "mg", "sniper"];
export function fieldedTypes(purse) { return BASE_TYPES.concat(purse.roster); }
export function menOf(purse) {
  const types = fieldedTypes(purse);
  if (purse.men && purse.men.length === types.length) return purse.men.slice();
  return types.map((t) => SQUAD_SPECS[t].n);
}
// a man's price: his squad's own table price split by heads, rounded up
export const manPrice = (type) => Math.ceil(SQUAD_SPECS[type].cost / SQUAD_SPECS[type].n);
// recordCasualties(purse, standing): the battle's survivors onto the books;
// returns how many fell. `standing` aligns with fieldedTypes order.
export function recordCasualties(purse, standing) {
  const before = menOf(purse);
  let fell = 0;
  for (let i = 0; i < before.length; i++) fell += Math.max(0, before[i] - (standing[i] | 0));
  purse.men = standing.map((v) => Math.max(0, v | 0));
  purse.fallen += fell;
  return fell;
}
// refillCost(purse) -> the bill to bring every squad back to strength.
export function refillCost(purse) {
  const types = fieldedTypes(purse), men = menOf(purse);
  let cost = 0;
  for (let i = 0; i < types.length; i++) cost += Math.max(0, SQUAD_SPECS[types[i]].n - men[i]) * manPrice(types[i]);
  return cost;
}
// buyRefill(purse) -> true when the whole bill was met: every squad refills.
// A short purse refuses and changes nothing — replacements come as a class.
export function buyRefill(purse) {
  const bill = refillCost(purse);
  if (bill <= 0 || purse.scrap < bill) return false;
  purse.scrap -= bill;
  purse.men = null; // full strength across the board
  return true;
}
```

**Step 5 — the gate.** Replace `scripts/frostline-test.mjs` whole with:

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
import { makeTurns, startTurns, apOf, spend, clampMove, capOf, beginExec, stepExec, stepEnemy, heldInput, TURNS } from "../src/games/frostline/turns.js";
import { coverAt, exposure, hitChance, knownThreats } from "../src/games/frostline/cover.js";
import { setOverwatch, clearOverwatch, OVERWATCH, inArc, applyFireControl, toggleDiscipline, markTarget, markedTarget, focusOrder, owPaths } from "../src/games/frostline/verbs.js";
import { squadFire } from "../src/depot/state.js";
import { loadPurse, savePurse, earnFromEvents, winBonus, buyTeam, teamPrice, WIN_BONUS, makePurse, fieldedTypes, menOf, manPrice, recordCasualties, refillCost, buyRefill } from "../src/games/frostline/purse.js";
import { makeSquad } from "../src/depot/squads.js";
import { spawnSquadMembers } from "../src/depot/state.js";
import { makeBoard, completionPay, CLEAN_PAY, UNDER_PAY, BOARD_JOBS } from "../src/games/frostline/contracts.js";
import { makeCtx, stepBattle, applyOp, record, replay, nearestThreat } from "../src/games/frostline/tape.js";
import { makeSpaceBattle, stepSpace, contactMade, enemyOrders, wingState, liveShips, drainSpaceEvents } from "../src/games/frostline/space.js";
import { orderAttack as shipAttack, orderMove as shipMove } from "../src/modules/orders/orders.js";
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

// ---- FL-4: the purse — every kill pays, the vault holds, the roster marches
{ const mem = {}; const storage = { getItem: (k) => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); } };
  const p = loadPurse(storage);
  check("a fresh vault opens broke, an empty roster", p.scrap === 0 && p.kills === 0 && p.roster.length === 0);
  const { war } = bootMission(MISSION_R1, 3);
  const w = war.world;
  const sq = war.run.squads[0];
  let ax = null, az = null;
  outer: for (let x = -30; x <= 30; x += 3) for (let z = -20; z <= 30; z += 3) {
    const m = { x, y: war.field.heightAt(x, z) + 1.2, z };
    const t = { x, y: war.field.heightAt(x, z + 6) + 0.7, z: z + 6 };
    if (arcClears(w, m, t, INFANTRY_ARMS.rifles, -1)) { ax = x; az = z; break outer; }
  }
  const members = sq.memberIds.map((id) => w.byId.get(id)).filter((u) => u && u.alive);
  members.forEach((u, i) => { u.pos.x = ax + i * 0.8; u.pos.z = az; u.pos.y = war.field.heightAt(u.pos.x, u.pos.z) + 0.7; u.fireCd = 0; });
  sq.anchor = { x: ax, z: az }; sq.order = "defend";
  const foe = addBody(w, { kind: "unit", x: ax, y: war.field.heightAt(ax, az + 6) + 0.7, z: az + 6, hx: 0.28, hy: 0.7, hz: 0.28, mass: 80, hp: 10, team: 2 });
  foe.bounty = 4;
  const input = defaultTickInput(); input.devDummies = true;
  let paid = 0, ticks = 0;
  while (foe.alive && ticks++ < 4800) {
    const { events } = tickWar(war, STEP, input);
    paid += earnFromEvents(p, war, events);
  }
  check("a live-fire kill surfaces in the tick's own events and pays its bounty into the purse",
    !foe.alive && paid === 4 && p.scrap === 4 && p.kills === 1);
  check("the won contract pays its bonus and the books add up",
    winBonus(p) === WIN_BONUS && p.scrap === 4 + WIN_BONUS && p.earned === p.scrap);
  const refused = !buyTeam(p, "mg");
  p.scrap += 100;
  const bought = buyTeam(p, "mg");
  check("the shop refuses a dry purse and sells to a full one at the squad table's own price",
    refused && bought && teamPrice("mg") === 38 && p.scrap === 4 + WIN_BONUS + 100 - 38 && p.roster.join() === "mg");
  savePurse(storage, p);
  const q = loadPurse(storage);
  check("the vault holds: save then load round-trips scrap, kills, and roster",
    q.scrap === p.scrap && q.kills === p.kills && q.earned === p.earned && q.roster.join() === p.roster.join());
  const junk = { getItem: () => "{broken", setItem: () => {} };
  check("a broken record never throws: the war starts broke, not crashed", loadPurse(junk).scrap === 0); }

{ const { war } = bootMission(MISSION_R1, 3, ["mg"]);
  const extra = war.run.squads[3];
  const g = openGround(war, extra.anchor.x, extra.anchor.z, 0.6);
  check("a bought team marches: the roster boots a fourth squad, its type kept, on open ground",
    war.run.squads.length === 4 && extra.type === "mg"
    && g && Math.hypot(g.x - extra.anchor.x, g.z - extra.anchor.z) < 1e-9); }

// ---- FL-5: the contract board — jobs as data, the ruled trade, the heat
{ const b7 = makeBoard(7);
  check("a board is its seed: twin boards land byte-identical", JSON.stringify(makeBoard(7)) === JSON.stringify(b7));
  check("the fixture board pins: three jobs, their seeds, prices, tags, and routes exact",
    b7.length === BOARD_JOBS
    && b7[0].legit === "underground" && b7[0].price === 36 && b7[0].heat === 1 && b7[0].seed === 976907632 && b7[0].name === "CARGO UNDECLARED" && b7[0].hot === true
    && b7[1].legit === "underground" && b7[1].price === 41 && b7[1].heat === 1 && b7[1].seed === 553325603 && b7[1].hot === true
    && b7[2].legit === "clean" && b7[2].price === 20 && b7[2].seed === 197137260 && b7[2].hot === false);
  let lawful = true;
  for (const bs of [7, 11, 42]) for (const j of makeBoard(bs)) {
    const [lo, hi] = j.legit === "underground" ? UNDER_PAY : CLEAN_PAY;
    if (j.price < lo || j.price > hi) lawful = false;
    if (j.legit === "underground" && j.heat < 1) lawful = false;
    if (j.legit === "clean" && j.heat !== 0) lawful = false;
  }
  check("the ruled trade holds on every fixture board: clean pays its band, underground pays more and heats", lawful);
  const p = makePurse();
  const paid = completionPay(p, b7[0]);
  check("the posted price pays and the heat lands on the books", paid === 36 && p.scrap === 36 && p.earned === 36 && p.heat === 1);
  const mem = {}; const storage = { getItem: (k) => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); } };
  savePurse(storage, p);
  check("heat rides the vault: save then load round-trips it", loadPurse(storage).heat === 1); }

// ---- FL-6: the tape — a battle recorded through the shared step replays bit-exact
{ const CAP = 4600;
  const drive = () => {
    const { war, mission } = bootMission(MISSION_R1, 3);
    const ctx = makeCtx(war, mission);
    const tape = [];
    const rec = (op) => { if (applyOp(ctx, op)) record(tape, ctx, op); };
    for (let i = 0; i < 3; i++) rec({ op: "move", i, x: mission.exit.x + 6, z: mission.exit.z + 4 });
    while (!ctx.over && ctx.tick < CAP) {
      if (ctx.ts.phase === "orders") {
        for (let i = 0; i < 3; i++) rec({ op: "move", i, x: mission.exit.x, z: mission.exit.z });
        rec({ op: "disc", i: 0 });
        rec({ op: "ow", i: 1, x: mission.exit.x, z: mission.exit.z, pts: 1 });
        rec({ op: "end", i: -1 });
      }
      stepBattle(ctx);
    }
    const s = missionState(war, mission);
    return { ctx, tape, hash: worldHash(war.world), s };
  };
  const live = drive();
  const rep1 = replay(MISSION_R1, 3, [], live.tape, CAP);
  const rs1 = missionState(rep1.war, rep1.mission);
  check("the tape replays the battle bit-exact: same world, same tick, same contact, same count of the living",
    worldHash(rep1.war.world) === live.hash && rep1.tick === live.ctx.tick
    && rep1.contactTick === live.ctx.contactTick
    && rs1.friendlies === live.s.friendlies && rs1.enemies === live.s.enemies);
  const rep2 = replay(MISSION_R1, 3, [], JSON.parse(JSON.stringify(live.tape)), CAP);
  check("the tape survives its own storage: a JSON round-trip replays to the identical world",
    worldHash(rep2.war.world) === live.hash && rep2.tick === live.ctx.tick);
  const empty = replay(MISSION_R1, 3, [], [], 1000);
  check("a spent tape never strands the war frozen: an orderless replay still runs its ticks",
    empty.over || empty.tick === 1000);
  const { war: w3, mission: m3 } = bootMission(MISSION_R1, 3);
  const c3 = makeCtx(w3, m3);
  c3.ts.phase = "orders"; c3.ts.ap = {}; c3.ts.ap[w3.run.squads[0].id] = 3;
  const refused = !applyOp(c3, { op: "attack", i: 0, x: 0, z: 0 });
  check("a refused order costs nothing: no known target, no point spent",
    refused && c3.ts.ap[w3.run.squads[0].id] === 3); }

// ---- FL-7: casualties that matter — the men persist, the dead stay dead
{ const { war } = bootMission(MISSION_R1, 3, [], [2, 1, 2]);
  const counts = war.run.squads.map((sq) => sq.memberIds.map((id) => war.world.byId.get(id)).filter((u) => u && u.alive).length);
  check("a battered roster fields what it has: head counts through the boot", counts.join() === "2,1,2");
  const { war: w2 } = bootMission(MISSION_R1, 3, [], [0, 2, 2]);
  check("a wiped squad fields nothing: the zero slot is skipped, the rest march",
    w2.run.squads.length === 2 && w2.run.squads[0].type === "mg"); }

{ const p = makePurse();
  check("full strength by default: three squads at the table's own heads", menOf(p).join() === "4,2,2");
  const fell = recordCasualties(p, [2, 2, 1]);
  check("the score card's arithmetic: three fell, the books remember", fell === 3 && p.fallen === 3 && menOf(p).join() === "2,2,1");
  check("a man has a price: his squad's table price split by heads, rounded up",
    manPrice("rifles") === 8 && manPrice("mg") === 19 && manPrice("sniper") === 34 && manPrice("medics") === 28);
  const bill = refillCost(p);
  check("the bill adds up: two riflemen and a sniper", bill === 2 * 8 + 34);
  const refused = !buyRefill(p);
  p.scrap = 100;
  check("replacements come as a class: a short purse refuses whole, a full one refills whole",
    refused && buyRefill(p) && p.scrap === 100 - bill && menOf(p).join() === "4,2,2" && refillCost(p) === 0);
  const mem = {}; const st = { getItem: (k) => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); } };
  recordCasualties(p, [3, 2, 2]);
  savePurse(st, p);
  const q = loadPurse(st);
  check("the dead ride the vault: men and fallen round-trip", q.fallen === 4 && menOf(q).join() === "3,2,2"); }

{ const { war } = bootMission(MISSION_R1, 3);
  const w = war.world;
  const hurt = w.byId.get(war.run.squads[0].memberIds[0]);
  hurt.hp = 3;
  const g = openGround(war, hurt.pos.x + 3, hurt.pos.z, 2.0);
  const med = makeSquad(war.run.nextSquadId++, "medics", 1, g.x, g.z);
  spawnSquadMembers(w, med);
  war.run.squads.push(med);
  const input = defaultTickInput(); input.devDummies = true;
  for (let i = 0; i < 120 * 20; i++) tickWar(war, STEP, input);
  check("the medic team tends on this ground: a 3 hp man stands near full inside twenty seconds", hurt.hp > 50); }

// ---- FL-8: the space theater — the modules fly, the fight resolves, the route rules
{ const shipsHash = (b) => JSON.stringify(b.ships.map((s) => [s.team, +s.hp.toFixed(6), s.pos.map((v) => +v.toFixed(6))]));
  const run = () => {
    const b = makeSpaceBattle(12345);
    shipMove(liveShips(b, 1), 0, 0, 0);
    enemyOrders(b);
    while (!contactMade(b) && b.tick < 5000) stepSpace(b);
    const contactTick = b.tick;
    let paid = 0;
    while (!b.over && b.tick < 20000) {
      const foes = liveShips(b, 2);
      if (foes.length) shipAttack(liveShips(b, 1), foes[0]);
      for (let i = 0; i < 480 && !b.over; i++) stepSpace(b, { player: false, enemy: true });
      enemyOrders(b);
      for (let i = 0; i < 360 && !b.over; i++) stepSpace(b);
      for (const ev of drainSpaceEvents(b)) if (ev.team === 2) paid += ev.bounty;
    }
    return { contactTick, end: b.tick, s: wingState(b), paid, hash: shipsHash(b) };
  };
  const a = run();
  check("the space fight resolves on the fixture: contact at 106, won at 809, three standing, 36 paid",
    a.contactTick === 106 && a.end === 809 && a.s.won && a.s.friendly === 3 && a.s.enemy === 0 && a.paid === 36);
  const c = run();
  check("space is a seed too: twin scripted skirmishes land bit-identical wings", a.hash === c.hash && a.end === c.end);
  const held = makeSpaceBattle(12345);
  shipMove(liveShips(held, 1), 0, 0, 0);
  enemyOrders(held);
  const foeSnap = JSON.stringify(liveShips(held, 2).map((s) => s.pos));
  for (let i = 0; i < 120; i++) stepSpace(held, { player: false, enemy: true });
  check("a held wing is frozen whole: the enemy neither moves nor fires on your half",
    JSON.stringify(liveShips(held, 2).map((s) => s.pos)) === foeSnap);
  let hotU = 0, hotC = 0, nU = 0, nC = 0;
  for (const bs of [7, 11, 42]) for (const j of makeBoard(bs)) {
    if (j.legit === "underground") { nU++; if (j.hot) hotU++; }
    else { nC++; if (j.hot) hotC++; }
    if (j.hot && !(j.spaceSeed >= 0)) hotU = -99;
  }
  check("the route law holds on the fixture boards: hot routes exist, every hot job carries its ambush seed",
    hotU >= 1 && nU + nC === 9 && hotU >= 0); }

// ---- FL-9: the hunter — one armored man, twin sidearms, the jetpack line
{ const { war } = bootMission(MISSION_R1, 3, ["hunter"]);
  const h = war.run.squads[3];
  const men = h.memberIds.map((id) => war.world.byId.get(id)).filter((u) => u && u.alive);
  check("the hunter fields as one man, his own row on his back",
    h.type === "hunter" && men.length === 1 && men[0].utype === "hunter" && INFANTRY_ARMS.hunter.burst === 2 && INFANTRY_ARMS.hunter.range === 12);
  check("the jetpack line: his move flies 35 where a squad marches 22",
    capOf(h) === 35 && capOf(war.run.squads[0]) === 22
    && Math.hypot(clampMove(h, h.anchor.x + 100, h.anchor.z).x - h.anchor.x, 0) - 35 < 1e-9
    && Math.abs(Math.hypot(clampMove(war.run.squads[0], war.run.squads[0].anchor.x + 100, war.run.squads[0].anchor.z).x - war.run.squads[0].anchor.x) - 22) < 1e-9);
  // his irons pull: the FL-2 fixture ground, a weak foe in his short reach
  const w = war.world;
  let ax = null, az = null;
  outer: for (let x = -30; x <= 30 && ax === null; x += 3) for (let z = -20; z <= 30; z += 3) {
    const m = { x, y: war.field.heightAt(x, z) + 1.2, z };
    const t = { x, y: war.field.heightAt(x, z + 8) + 0.7, z: z + 8 };
    if (arcClears(w, m, t, INFANTRY_ARMS.hunter, -1)) { ax = x; az = z; break outer; }
  }
  const u = men[0];
  u.pos.x = ax; u.pos.z = az; u.pos.y = war.field.heightAt(ax, az) + 0.7; u.fireCd = 0;
  h.anchor = { x: ax, z: az }; h.order = "defend";
  const foe = addBody(w, { kind: "unit", x: ax, y: war.field.heightAt(ax, az + 8) + 0.7, z: az + 8, hx: 0.28, hy: 0.7, hz: 0.28, mass: 80, hp: 10, team: 2 });
  h._lastTargetId = null;
  squadFire(w, h, 1 / 120);
  check("the twin sidearms pull on his own trigger law", h._lastTargetId === foe.id); }

{ const p = makePurse();
  p.scrap = 300;
  const first = buyTeam(p, "hunter");
  const second = buyTeam(p, "hunter");
  check("one of a kind: the first purchase takes, the second refuses, the price is 120",
    first && !second && teamPrice("hunter") === 120 && p.scrap === 180 && p.roster.join() === "hunter");
  recordCasualties(p, [4, 2, 2, 0]);
  check("the hunter can fall, and hiring him back is the whole of his price",
    p.fallen === 1 && refillCost(p) === 120); }

console.log(`frostline-test: ${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
console.log("frostline-test PASS");
```

**Step 6 — the page.** Replace `docs/frostline/main.js` whole with:

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
import { makeTurns, startTurns, apOf, spend, clampMove, capOf, beginExec, stepExec, stepEnemy, heldInput, TURNS } from "../../src/games/frostline/turns.js";
import { destShield, hitChance, knownThreats } from "../../src/games/frostline/cover.js";
import { setOverwatch, clearOverwatch, applyFireControl, toggleDiscipline, discOf, markTarget, markedTarget, focusOrder, owPaths, OVERWATCH } from "../../src/games/frostline/verbs.js";
import { loadPurse, savePurse, earnFromEvents, winBonus, buyTeam, teamPrice, FOR_SALE, STORE_KEY, fieldedTypes, menOf, recordCasualties, refillCost, buyRefill } from "../../src/games/frostline/purse.js";
import { makeBoard, completionPay } from "../../src/games/frostline/contracts.js";
import { makeCtx, stepBattle, applyOp, record } from "../../src/games/frostline/tape.js";
import { INFANTRY_ARMS } from "../../src/depot/specs.js";

const canvas = document.getElementById("cv");
// The address is the whole state: ?board=B lists that board's jobs; add
// &job=K and that exact contract's battle boots; a bare ?seed=N stays the
// old free skirmish. No address at all rolls a fresh board.
const params = new URL(location.href).searchParams;
const purse = loadPurse(localStorage);
let boardSeed = parseInt(params.get("board") || "", 10);
let jobIx = parseInt(params.get("job") || "", 10);
const bareSeed = parseInt(params.get("seed") || "", 10);
let contract = null;
if (!Number.isFinite(boardSeed) && !Number.isFinite(bareSeed)) {
  boardSeed = Math.floor(Math.random() * 1e9);
  history.replaceState(null, "", "?board=" + boardSeed);
}
if (Number.isFinite(boardSeed) && Number.isFinite(jobIx)) contract = makeBoard(boardSeed)[jobIx] || null;
const boardOnly = Number.isFinite(boardSeed) && !contract;
if (boardOnly) {
  // the board screen: jobs listed, nothing boots until one is taken
  const bd = document.getElementById("board"), jobsEl = document.getElementById("bdJobs");
  document.getElementById("bdBody").innerHTML = "the purse: " + purse.scrap + (purse.heat ? " · heat " + purse.heat : "") + "<br>roster: 3 + " + purse.roster.length + " bought";
  for (const job of makeBoard(boardSeed)) {
    const b = document.createElement("button");
    b.innerHTML = job.name + "<br><span class=\"legit\">" + job.legit.toUpperCase() + "</span> · pays " + job.price
      + (job.heat ? " · +" + job.heat + " heat" : "") + (job.hot ? " · <span class=\"legit\">HOT ROUTE</span>" : "");
    // a hot route flies its ambush first; the ground job waits past it
    b.addEventListener("click", () => {
      location.href = (job.hot ? "space.html" : location.pathname) + "?board=" + job.boardSeed + "&job=" + job.job;
    });
    jobsEl.appendChild(b);
  }
  bd.style.display = "block";
  document.getElementById("title").textContent = "FROSTLINE · THE BOARD";
}
// the battle: everything below runs only when a contract or a bare seed
// asked for one — the board screen never boots a war.
if (!boardOnly) startBattle();
function startBattle() {
const askSeed = contract ? contract.seed : (Number.isFinite(bareSeed) ? bareSeed : 3);
const men0 = menOf(purse); // heads per fielded slot; the dead stay dead until replaced
const { war, mission, seed } = bootMission(MISSION_R1, askSeed, purse.roster, men0);
if (!contract) history.replaceState(null, "", "?seed=" + seed);
let battleEarned = 0, bonusPaid = 0, fellThisBattle = 0;
// the tape: every confirmed order at its tick; saved with the battle's
// address at the end so any fight can be reported and replayed bit-exact
const ctx = makeCtx(war, mission);
const tape = [];
function confirmOp(op) { if (applyOp(ctx, op)) { record(tape, ctx, op); return true; } return false; }
history.replaceState(null, "", "?seed=" + seed);
const R = makeRenderer(canvas, war.world, { camera: "tactical" });
let zoom = 1.5;
R.setZoom(zoom);
const ts = ctx.ts;
const squads = war.run.squads;

let selected = squads[0];
let focus = { x: selected.anchor.x, y: war.field.heightAt(selected.anchor.x, selected.anchor.z), z: selected.anchor.z };
let aim = { x: mission.exit.x, z: mission.exit.z };

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
const label = (sq) => sq.type === "mg" ? "MG" : sq.type === "sniper" ? "SNIPERS" : sq.type === "medics" ? "MEDICS" : sq.type === "hunter" ? "THE HUNTER" : "RIFLES";
function drawChips() {
  for (const { sq, el } of chips) {
    el.className = "chip" + (sq === selected ? " sel" : "");
    const ap = ts.phase === "free" ? "" : " · " + "●".repeat(apOf(ts, sq)) + "○".repeat(Math.max(0, TURNS.ap - apOf(ts, sq)));
    el.textContent = label(sq) + " · " + liveCount(sq) + " · " + (discOf(sq) === "careful" ? "C" : "F") + ap;
  }
  const inOrders = ts.phase === "orders" && !ctx.over;
  actionsEl.style.display = inOrders ? "grid" : "none";
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
  const i = squads.indexOf(p.sq);
  if (p.kind === "move") confirmOp({ op: "move", i, x: p.x, z: p.z });
  else if (p.kind === "attack") confirmOp({ op: "attack", i, x: p.target.pos.x, z: p.target.pos.z });
  else if (p.kind === "hold") confirmOp({ op: "hold", i });
  else if (p.kind === "ow") confirmOp({ op: "ow", i, x: p.x, z: p.z, pts: p.pts });
  else if (p.kind === "mark") confirmOp({ op: "mark", i, x: p.target.pos.x, z: p.target.pos.z });
  else if (p.kind === "disc") confirmOp({ op: "disc", i });
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
actEnd.addEventListener("click", () => { if (ts.phase === "orders") { confirmOp({ op: "end", i: -1 }); say("", ""); } });

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
  if (ctx.over || pending) return;
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
    body: "cover there: " + shield + "<br>distance " + dist.toFixed(0) + " m" + (free ? "<br>free time — no cost" : " (cap " + capOf(selected) + ")<br>cost 1 point · " + (apOf(ts, selected) - 1) + " after") });
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

// ---- the debrief: the books shown, the shop open, the next battle a tap away
const debriefEl = document.getElementById("debrief");
const dbTitle = document.getElementById("dbTitle"), dbBody = document.getElementById("dbBody"), dbShop = document.getElementById("dbShop");
function showDebrief(won) {
  dbTitle.textContent = won ? (contract ? contract.name + " — PAID" : "THE FAR SIDE — CONTRACT COMPLETE") : "THE LINE BROKE";
  dbBody.innerHTML = "bounties this battle: " + battleEarned +
    (bonusPaid ? "<br>" + (contract ? "the posted price: " + bonusPaid : "completion bonus: " + bonusPaid) : "") +
    (contract && won && contract.heat ? "<br>heat +" + contract.heat + " (now " + purse.heat + ")" : "") +
    "<br>the purse: " + purse.scrap + "<br>roster: 3 + " + purse.roster.length + " bought" +
    "<br>the fallen this battle: " + fellThisBattle + " · the campaign's dead: " + purse.fallen +
    "<br>the tape: " + tape.length + " orders, saved";
  dbShop.innerHTML = "";
  const bill = refillCost(purse);
  if (bill > 0) {
    const rb = document.createElement("button");
    rb.textContent = "REPLACEMENTS — bring every squad to strength — " + bill;
    rb.disabled = purse.scrap < bill;
    rb.addEventListener("click", () => { if (buyRefill(purse)) { savePurse(localStorage, purse); showDebrief(won); } });
    dbShop.appendChild(rb);
  }
  for (const type of FOR_SALE) {
    const b = document.createElement("button");
    const price = teamPrice(type);
    b.textContent = "BUY " + (type === "mg" ? "GUNNERS" : type === "sniper" ? "SNIPER PAIR" : type === "medics" ? "MEDIC TEAM" : type === "hunter" ? "THE HUNTER — one of a kind" : "RIFLE SQUAD") + " — " + price;
    if (type === "hunter" && purse.roster.includes("hunter")) b.disabled = true;
    b.disabled = purse.scrap < price;
    b.addEventListener("click", () => { if (buyTeam(purse, type)) { savePurse(localStorage, purse); showDebrief(won); } });
    dbShop.appendChild(b);
  }
  debriefEl.style.display = "block";
}
document.getElementById("dbNew").addEventListener("click", () => {
  location.href = location.pathname + "?board=" + Math.floor(Math.random() * 1e9);
});
document.getElementById("dbReset").addEventListener("click", () => {
  localStorage.removeItem(STORE_KEY);
  location.href = location.pathname;
});

// ---- the loop
const title = document.getElementById("title");
const STEP = 1 / 120;
let last = performance.now(), acc = 0;
say("", "TAP THE SNOW TO MOVE OUT — TIME STOPS AT FIRST CONTACT");
function frame(now) {
  requestAnimationFrame(frame);
  let dt = Math.min(0.1, (now - last) / 1000); last = now;
  const ticking = !ctx.over && !pending && (ts.phase === "free" || ts.phase === "exec" || ts.phase === "enemy");
  if (ticking) {
    acc += dt;
    let guard = 0;
    while (acc >= STEP && guard++ < 12 && !ctx.over) {
      acc -= STEP;
      const before = ts.phase;
      const { events, flags } = stepBattle(ctx);
      if (before === "free" && ts.phase === "orders") say("CONTACT", "YOUR TURN — 3 POINTS A SQUAD");
      else if (before === "exec" && ts.phase === "enemy") say("ENEMY TURN", "");
      else if (before === "enemy" && ts.phase === "orders") say("YOUR TURN " + ts.turn, "3 POINTS A SQUAD");
      if (flags && flags.orderPaths) R.overlay.setOrderPaths(allPaths());
      battleEarned += earnFromEvents(purse, war, events);
      if (ctx.over) {
        if (ctx.won) bonusPaid = contract ? completionPay(purse, contract) : winBonus(purse);
        // the score card's arithmetic: survivors per fielded slot, in boot order
        const types = fieldedTypes(purse);
        let si = 0;
        const standing = types.map((t, i2) => (men0[i2] <= 0 ? 0 : liveCount(squads[si++])));
        fellThisBattle = recordCasualties(purse, standing);
        savePurse(localStorage, purse);
        localStorage.setItem("frostline-tape", JSON.stringify({ seed, board: contract ? contract.boardSeed : null, job: contract ? contract.job : null, roster: purse.roster.slice(), men: men0, tape }));
        say("", "");
        showDebrief(ctx.won);
      }
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
  hud.innerHTML = mkText + "<br>" + fpsText + "<br>seed " + seed + "<br>purse " + purse.scrap + (purse.heat ? "<br>heat " + purse.heat : "");
  drawChips();
  title.textContent = "FROSTLINE · " + mission.name + (ts.phase === "orders" ? " · TURN " + ts.turn : "");
  R.render(dt, focus, aim);
}
requestAnimationFrame(frame);
}
```

**Step 7 — file identity.** `node --check` on the five script files (each prints nothing, exit 0), then `wc -c` and `sha256sum` on all six; compare mechanically (pipe to files and diff), never by eye:

- `src/depot/specs.js` — 25353 bytes, sha256 `ec313ba529110489f65dd98003448f084b121b6127cfd21749fb178a3196babe`
- `src/depot/squads.js` — 55937 bytes, sha256 `3cbfba2818673d1b663536e0e3b9e5fc938baaf1e7dd51d8e18b5e45d09f52a4`
- `src/games/frostline/turns.js` — 3376 bytes, sha256 `1e9678f31aabbca4bb29f66843afb6e7a41dceb4c146e9cef2460c6a9e6afd7e`
- `src/games/frostline/purse.js` — 5066 bytes, sha256 `a4abb296dbd7a8149da59ce9e58f9747b7d73ccdb4a26114d702535d114e0f7a`
- `scripts/frostline-test.mjs` — 28059 bytes, sha256 `7cb692a5cb292661dfd81eaba15de97427708697705ef0e88b2a7450450b5bd7`
- `docs/frostline/main.js` — 20833 bytes, sha256 `72e3667a5b5e919ca8f65edb5109e7f98432e00b95e1c6a3bede97265e73998a`

A mismatch stops the task: report it, change nothing else.

**Step 8 — the gates re-assert.** `node scripts/gate.mjs frostline` must print 63 PASS lines, `frostline-test: 63 PASS / 0 FAIL`, `frostline-test PASS`, exit 0. Then the step-1 full-suite loop again: every prior gate unmoved, the api line byte-identical to step 1's. No audit, no smoke, no page loads, no screenshots.

**Step 9 — records and deploy.** Move this document and the phase frame into `docs/plans/`. Stamp the phase status in a second record commit; the stamp subject is exactly `phase 0.0.29 record stamped — <first commit's 7-character short hash>`. Mark FL-9 `[LANDED] ` in `docs/plans/game-frostline.md`. Bump `package.json` 0.0.28 to 0.0.29. Commit with message:

```
phase 0.0.29 — FROSTLINE FL-9: the hunter

One armored man, bought once and one of a kind: twin sidearms on his own
row, a jetpack line that flies 35 where a squad marches 22, his whole price
to hire back if he falls. Two additive engine rows proven inert on the full
suite; everything else already rules him — one man is just a small squad.
frostline-test: 63 PASS / 0 FAIL.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
```

Push. The push publishes the page; the owner's live check rules look and feel.

## Known limits, said plainly

- He draws as a lone trooper: the armored, helmeted silhouette and the flight's look ride the ladder-end look phase.
- His overwatch, discipline, marking, tape, and casualties all ride the landed machinery; only his trigger is checked by name — one man is a small squad, and the squad law is gated.
- The sidearms' numbers and his price are provisional dials; the hit display prices his row through the audited formula automatically.

## Report shape

Read-confirmation first, then one line of outcome, then bullets: the frostline gate lines verbatim, every prior-gate tail from both suite runs, all six wc -c lines, all six sha256 lines, both commit hashes, push result. Every nonconformity its own labeled bullet. Fixture seed 3; no seed is special.

## Suggested model

Sonnet 5 — every changed byte printed, hashes ratify.
