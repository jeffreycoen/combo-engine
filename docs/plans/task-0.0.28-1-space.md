# Task 0.0.28-1 — the space theater: ships as operators, the route's ambush, the flat black

One job: land FL-8 exactly as printed — the space module, the hot route through the contracts, the flat-canvas page, the gate at 58. Six files, all printed whole. The final hashes are the acceptance. You design nothing.

This document lives at `docs/plans/task-0.0.28-1-space.md` when the task lands; the phase frame `docs/plans/phase-0.0.28-frostline-8.md` is served with it and copied in at landing.

## Required reading, verified in the tree

1. This document, whole.
2. The phase frame, whole.
3. `src/games/frostline/contracts.js` — replaced whole below.
4. `src/modules/orders/orders.js` and `src/modules/steering/steering.js` — the surfaces the space module flies on; read their top comments.

Your report opens with a read-confirmation naming these.

## Steps

**Step 1 — green before anything moves.** `node scripts/gate.mjs frostline` must print `frostline-test: 54 PASS / 0 FAIL`, `frostline-test PASS`, exit 0 — the verdict PRINTS before any file is touched. Minutes; never conclude failure from slowness.

**Step 2 — the space module.** Write `src/games/frostline/space.js`, exactly:

```js
// games/frostline/space.js — FL-8, the space theater's minimal skirmish.
// Ships are the operators: the landed orders module owns the slots and the
// landed steering module moves the hulls; this file adds only the wing, the
// guns, the sides' holds, and the end of the fight. Deterministic end to
// end: one local draw stream seeded by the battle, no clocks, no globals.
// The turn machine is the ground game's own (turns.js) — ships carry an
// anchor view so the same spend/clamp arithmetic rules both theaters.
import { makeUnit, orderMove, orderAttack, resolveMode, arriveMove, acquire, dropBeyondRange } from "../../modules/orders/orders.js";
import { attachMotion, stepMove, stepStrafe, stepIdle } from "../../modules/steering/steering.js";
import { stream } from "./contracts.js";

export const SPACE_STEP = 1 / 60;

// One hull both sides fly for now; the roster contract brings more later.
// All dials provisional (F5).
export const SHIP_SPECS = {
  fighter: {
    hp: 40, speed: 0.5, dmg: 7, range: 28, turnRate: 2.2, accel: 2.2,
    strafeRadius: 12, strafeRate: 0.7, guardRate: 0.5, idleRate: 1,
    fireRate: 0.9, bounty: 12,
  },
};
export const WING = 3;          // ships a side // provisional (F5)
export const SIGHT_R = 55;      // first contact freezes free time // provisional (F5)
export const HIT_NEAR = 0.85, HIT_FAR = 0.25; // hit chance at zero and full range // provisional (F5)

// makeSpaceBattle(seed) -> the fight: two wings placed by the seed's own
// stream, facing each other across the black.
export function makeSpaceBattle(seed) {
  const r = stream(seed >>> 0);
  const ships = [];
  let nextId = 1;
  const spawn = (team, x0, face) => {
    for (let i = 0; i < WING; i++) {
      const u = makeUnit(SHIP_SPECS, "fighter", [x0 + (r() - 0.5) * 10, 0, (i - (WING - 1) / 2) * 18 + (r() - 0.5) * 8]);
      attachMotion(u, SHIP_SPECS.fighter, [face, 0, 0], r() * Math.PI * 2, r() < 0.5 ? 1 : -1, r() * Math.PI * 2);
      u.id = nextId++;
      u.team = team;
      u.fireCd = 0;
      u.bounty = SHIP_SPECS.fighter.bounty;
      // the anchor view: turns.js clamps and prices off {x, z}
      Object.defineProperty(u, "anchor", { get() { return { x: this.pos[0], z: this.pos[2] }; } });
      ships.push(u);
    }
  };
  spawn(1, -70, 1);
  spawn(2, 70, -1);
  return { ships, rng: r, tick: 0, over: false, won: false, events: [] };
}

export const liveShips = (b, team) => b.ships.filter((s) => s.hp > 0 && s.team === team);

// contactMade(b): any pair across the line inside sight — the free-time
// freeze, the same law the ground game's patrol triggers.
export function contactMade(b) {
  for (const a of liveShips(b, 1)) for (const e of liveShips(b, 2))
    if (Math.hypot(a.pos[0] - e.pos[0], a.pos[2] - e.pos[2]) <= SIGHT_R) return true;
  return false;
}

// enemyOrders(b): the droid wing's whole mind — every ship attacks the
// nearest living player hull. Runs only on the enemy's half.
export function enemyOrders(b) {
  const foes = liveShips(b, 1);
  for (const e of liveShips(b, 2)) {
    if (!foes.length) return;
    let best = foes[0], bd = Infinity;
    for (const f of foes) { const d = Math.hypot(f.pos[0] - e.pos[0], f.pos[2] - e.pos[2]); if (d < bd) { bd = d; best = f; } }
    orderAttack([e], best);
  }
}

// stepShip: the modules' own branch order, with the attack branch closing
// to range then strafing — the fleet demo's fight, minimal.
function stepShip(b, u, foes, dt) {
  acquire(u, foes);
  dropBeyondRange(u);
  const mode = resolveMode(u);
  if (mode === "attack") {
    const t = u.attackTarget;
    const d = Math.hypot(t.pos[0] - u.pos[0], t.pos[2] - u.pos[2]);
    if (d > u.range * 0.9) { u.moveTarget = t.pos.slice(); stepMove(u, dt); }
    else stepStrafe(u, t.pos, dt);
    u.fireCd -= dt;
    if (d <= u.range && u.fireCd <= 0) {
      u.fireCd = SHIP_SPECS.fighter.fireRate;
      const p = HIT_NEAR + (HIT_FAR - HIT_NEAR) * (d / u.range);
      if (b.rng() < p) {
        t.hp -= u.dmg;
        if (t.hp <= 0) b.events.push({ type: "shipkill", team: t.team, bounty: t.bounty, x: t.pos[0], z: t.pos[2] });
      }
    }
  } else if (mode === "move") { stepMove(u, dt); arriveMove(u); }
  else stepIdle(u, dt);
}

// stepSpace(b, held): one tick. A held side is frozen whole — no motion,
// no guns — the space half of the ground game's own dummy switch. The
// rng draw order is the ships' own fixed order, so twin runs stay twins.
export function stepSpace(b, held = { player: false, enemy: false }) {
  const foesOf = { 1: liveShips(b, 2), 2: liveShips(b, 1) };
  for (const u of b.ships) {
    if (u.hp <= 0) continue;
    if (u.team === 1 && held.player) continue;
    if (u.team === 2 && held.enemy) continue;
    stepShip(b, u, foesOf[u.team], SPACE_STEP);
  }
  b.tick++;
  if (!liveShips(b, 2).length) { b.over = true; b.won = true; }
  else if (!liveShips(b, 1).length) { b.over = true; b.won = false; }
}

// drainSpaceEvents(b) -> this stretch's kills, the queue cleared — the page
// pays bounties from these exactly as the ground game pays from its ticks.
export function drainSpaceEvents(b) {
  const out = b.events;
  b.events = [];
  return out;
}

// wingState(b) -> the score card's numbers.
export function wingState(b) {
  return { friendly: liveShips(b, 1).length, enemy: liveShips(b, 2).length, over: b.over, won: b.won };
}
```

**Step 3 — the route through the contracts.** Replace `src/games/frostline/contracts.js` whole with:

```js
// games/frostline/contracts.js — FL-5, the contract board. A contract is
// DATA: a name, a battle seed, a posted completion price, and a legitimacy
// tag — clean jobs pay less; underground jobs pay more and raise the heat.
// The board is deterministic from its own seed, so a posted job can be
// named, shared, and replayed by two numbers (board seed, job index).
// Pure state; a tiny local draw stream keeps the board independent of the
// sim's rng. No globals, no clocks.

// The same 32-bit stream shape the engine's own maps grow from — local,
// seeded, and free of Math.random.
export function stream(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const BOARD_JOBS = 3;
// Posted completion pay by legitimacy — the ruled trade: clean pays less,
// underground pays more and heats the hunter. All provisional (F5).
export const CLEAN_PAY = [15, 25];
export const UNDER_PAY = [35, 60];
export const UNDER_HEAT = 1;
// The route: some jobs fly through an ambush — the space fight comes first,
// then the ground job. Underground routes run hotter. Provisional (F5).
export const HOT_CLEAN = 0.2, HOT_UNDER = 0.55;

const CLEAN_NAMES = ["ESCORT THE SURVEY", "CLEAR THE PASS", "HOLD FOR THE CONVOY"];
const UNDER_NAMES = ["NO QUESTIONS ASKED", "THE QUIET JOB", "CARGO UNDECLARED"];

// makeBoard(boardSeed) -> BOARD_JOBS contracts, deterministic. Each carries
// its own battle seed derived from the board's stream, so one address
// (board, job) names one exact battle.
export function makeBoard(boardSeed) {
  const r = stream(boardSeed);
  const jobs = [];
  for (let i = 0; i < BOARD_JOBS; i++) {
    const under = r() < 0.5;
    const payLo = under ? UNDER_PAY[0] : CLEAN_PAY[0];
    const payHi = under ? UNDER_PAY[1] : CLEAN_PAY[1];
    const price = payLo + Math.floor(r() * (payHi - payLo + 1));
    const names = under ? UNDER_NAMES : CLEAN_NAMES;
    const seed = Math.floor(r() * 1e9);
    const name = names[Math.floor(r() * names.length)];
    // two draws ride at the end of each job so every earlier draw keeps its
    // place: is the route hot, and the ambush's own battle seed
    const hot = r() < (under ? HOT_UNDER : HOT_CLEAN);
    const spaceSeed = Math.floor(r() * 1e9);
    jobs.push({
      job: i,
      boardSeed,
      seed,
      name,
      legit: under ? "underground" : "clean",
      price,
      heat: under ? UNDER_HEAT : 0,
      hot,
      spaceSeed,
    });
  }
  return jobs;
}

// completionPay(purse, contract) -> the posted price into the purse, plus
// the job's heat onto the books. The caller owns the once.
export function completionPay(purse, contract) {
  purse.scrap += contract.price;
  purse.earned += contract.price;
  purse.heat = (purse.heat || 0) + (contract.heat || 0);
  return contract.price;
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
import { bootMission, missionState, MISSION_R1, openGround, connected } from "../src/games/frostline/mission.js";
import { orderMove, orderDone, pickSquad } from "../src/games/frostline/command.js";
import { makeTriggerState, checkTriggers } from "../src/games/frostline/pause.js";
import { makeTurns, startTurns, apOf, spend, clampMove, beginExec, stepExec, stepEnemy, heldInput, TURNS } from "../src/games/frostline/turns.js";
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

console.log(`frostline-test: ${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
console.log("frostline-test PASS");
```

Four checks new, one re-taught under license (58 total): the FL-5 fixture-board pin absorbs the two route draws — old → new exactly as the phase frame lists; any other moved number stops the task.

**Step 5 — the pages.** Replace `docs/frostline/main.js` whole with:

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
const label = (sq) => sq.type === "mg" ? "MG" : sq.type === "sniper" ? "SNIPERS" : "RIFLES";
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
    b.textContent = "BUY " + (type === "mg" ? "GUNNERS" : type === "sniper" ? "SNIPER PAIR" : type === "medics" ? "MEDIC TEAM" : "RIFLE SQUAD") + " — " + price;
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

Write `docs/frostline/space.html`, exactly:

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
<title>FROSTLINE — THE ROUTE</title>
<style>
  html, body { margin: 0; height: 100%; overflow: hidden; background: #05070d; touch-action: none; }
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
  #ships { position: fixed; left: 12px; bottom: max(16px, env(safe-area-inset-bottom)); display: flex;
    flex-direction: column; gap: 6px; max-width: 44vw; align-items: flex-start; }
  #actions { position: fixed; right: 12px; bottom: max(16px, env(safe-area-inset-bottom)); display: grid;
    grid-template-columns: repeat(2, minmax(92px, 1fr)); gap: 6px; max-width: 48vw; }
  .act { min-width: 92px; padding: 9px 10px; border-radius: 10px; border: 1.5px solid rgba(233,237,242,.4);
    background: rgba(13,17,23,.6); color: #e9edf2; font: 600 11px system-ui, sans-serif; letter-spacing: 0.12em; }
  .act.on { border-color: #e9b25c; color: #e9b25c; }
  .chip { min-width: 70px; padding: 8px 10px; border-radius: 10px; border: 1.5px solid rgba(233,237,242,.3);
    background: rgba(13,17,23,.55); color: #e9edf2; font: 600 11px/1.5 system-ui, sans-serif; text-align: center; }
  .chip.sel { border-color: #6fbf73; color: #a9e0ac; }
  #popup { position: fixed; left: 50%; bottom: 26%; transform: translateX(-50%); min-width: 220px;
    padding: 12px 14px; border-radius: 12px; border: 1.5px solid rgba(233,178,92,.5); background: rgba(13,17,23,.85);
    color: #e9edf2; font: 500 12px/1.6 system-ui, sans-serif; }
  #popTitle { font-weight: 700; letter-spacing: 0.12em; margin-bottom: 4px; color: #e9b25c; }
  #popup button { margin: 8px 8px 0 0; padding: 7px 12px; border-radius: 8px; border: 1.5px solid rgba(233,237,242,.4);
    background: rgba(13,17,23,.6); color: #e9edf2; font: 600 11px system-ui, sans-serif; }
  #card { position: fixed; left: 50%; top: 50%; transform: translate(-50%, -50%); min-width: 240px; max-width: 86vw;
    padding: 14px 16px; border-radius: 12px; border: 1.5px solid rgba(233,178,92,.5); background: rgba(13,17,23,.92);
    color: #e9edf2; font: 500 12px/1.7 system-ui, sans-serif; display: none; }
  #cardTitle { font-weight: 700; letter-spacing: 0.12em; margin-bottom: 6px; color: #e9b25c; }
</style>
</head>
<body>
<canvas id="cv"></canvas>
<div id="title">THE ROUTE</div>
<div id="hud">mk -<br>- fps</div>
<div id="banner"></div>
<div id="reason"></div>
<div id="actions" style="display:none">
  <button class="act" id="actMove">MOVE</button>
  <button class="act" id="actAttack">ATTACK</button>
  <button class="act" id="actEnd">END TURN</button>
</div>
<div id="popup" style="display:none">
  <div id="popTitle"></div>
  <div id="popBody"></div>
  <div><button id="popOk">CONFIRM</button><button id="popNo">CANCEL</button></div>
</div>
<div id="card">
  <div id="cardTitle"></div>
  <div id="cardBody"></div>
  <div><button class="act" id="cardGo"></button></div>
</div>
<div id="ships"></div>
<script type="module" src="./space-main.js"></script>
</body>
</html>
```

Write `docs/frostline/space-main.js`, exactly:

```js
// FROSTLINE — docs/frostline/space-main.js: the route, FL-8's minimal
// skirmish. A hot contract flies through an ambush: three fighters against
// three, the same turn machine as the ground, the flat black canvas. Won,
// the job continues on the ground; lost, back to the board. Kills pay ship
// bounties into the one purse.
import { makeSpaceBattle, stepSpace, contactMade, enemyOrders, wingState, liveShips, drainSpaceEvents, SPACE_STEP, SHIP_SPECS } from "../../src/games/frostline/space.js";
import { orderMove, orderAttack } from "../../src/modules/orders/orders.js";
import { makeTurns, startTurns, apOf, spend, beginExec, stepExec, stepEnemy, TURNS } from "../../src/games/frostline/turns.js";
import { makeBoard } from "../../src/games/frostline/contracts.js";
import { loadPurse, savePurse } from "../../src/games/frostline/purse.js";
import { stream } from "../../src/games/frostline/contracts.js";

const params = new URL(location.href).searchParams;
const boardSeed = parseInt(params.get("board") || "", 10);
const jobIx = parseInt(params.get("job") || "", 10);
const bareSeed = parseInt(params.get("space") || "", 10);
const contract = Number.isFinite(boardSeed) && Number.isFinite(jobIx) ? makeBoard(boardSeed)[jobIx] || null : null;
const spaceSeed = contract ? contract.spaceSeed : (Number.isFinite(bareSeed) ? bareSeed : 12345);
const purse = loadPurse(localStorage);
const battle = makeSpaceBattle(spaceSeed);
const ts = makeTurns();
let paid = 0, over = false, pending = null, mode = null;
let selected = liveShips(battle, 1)[0];

// the wings close from the first breath; the droids fly their own mind
orderMove(liveShips(battle, 1), 0, 0, 0);
enemyOrders(battle);

// ---- DOM
const cv = document.getElementById("cv"), ctx2d = cv.getContext("2d");
const hud = document.getElementById("hud"), titleEl = document.getElementById("title");
const banner = document.getElementById("banner"), reason = document.getElementById("reason");
const actionsEl = document.getElementById("actions");
const actMove = document.getElementById("actMove"), actAttack = document.getElementById("actAttack"), actEnd = document.getElementById("actEnd");
const popup = document.getElementById("popup"), popTitle = document.getElementById("popTitle"), popBody = document.getElementById("popBody");
const card = document.getElementById("card"), cardTitle = document.getElementById("cardTitle"), cardBody = document.getElementById("cardBody"), cardGo = document.getElementById("cardGo");
const chipBox = document.getElementById("ships");
let mkText = "mk ?";
fetch("../../package.json", { cache: "no-store" }).then((r) => r.json()).then((p) => { mkText = "mk " + p.version; }).catch(() => {});
titleEl.textContent = "THE ROUTE" + (contract ? " · " + contract.name : "");
function say(top, sub) {
  banner.style.display = top ? "block" : "none"; banner.textContent = top || "";
  reason.style.display = sub ? "block" : "none"; reason.textContent = sub || "";
}
say("", "AMBUSH ON THE ROUTE — TIME STOPS AT FIRST CONTACT");

const chips = liveShips(battle, 1).map((s, i) => {
  const el = document.createElement("button");
  el.className = "chip";
  el.addEventListener("click", () => { if (s.hp > 0) { selected = s; mode = null; } });
  chipBox.appendChild(el);
  return { s, el, name: "FIGHTER " + (i + 1) };
});
function drawChips() {
  for (const c of chips) {
    c.el.className = "chip" + (c.s === selected ? " sel" : "");
    const ap = ts.phase === "free" ? "" : " · " + "●".repeat(apOf(ts, c.s)) + "○".repeat(Math.max(0, TURNS.ap - apOf(ts, c.s)));
    c.el.textContent = c.name + " · " + Math.max(0, Math.ceil(c.s.hp)) + ap;
    c.el.style.opacity = c.s.hp > 0 ? 1 : 0.35;
  }
  actionsEl.style.display = ts.phase === "orders" && !over ? "grid" : "none";
  actMove.className = "act" + (mode === "move" ? " on" : "");
  actAttack.className = "act" + (mode === "attack" ? " on" : "");
}

// ---- the confirmation
function present(p) { pending = p; popTitle.textContent = p.title; popBody.innerHTML = p.body; popup.style.display = "block"; }
function dismiss() { pending = null; popup.style.display = "none"; }
document.getElementById("popNo").addEventListener("click", dismiss);
document.getElementById("popOk").addEventListener("click", () => {
  if (!pending) return;
  const p = pending;
  dismiss();
  const free = ts.phase === "free";
  if (!free && !spend(ts, p.ship)) return;
  if (p.kind === "move") orderMove([p.ship], p.x, 0, p.z);
  else if (p.kind === "attack") orderAttack([p.ship], p.target);
  mode = null;
});
actMove.addEventListener("click", () => { mode = mode === "move" ? null : "move"; });
actAttack.addEventListener("click", () => { mode = mode === "attack" ? null : "attack"; });
actEnd.addEventListener("click", () => { if (ts.phase === "orders") { beginExec(ts); say("", ""); } });

// ---- the view: a fixed window on the black, world units to pixels
let scale = 1, W = 0, H = 0;
function fit() { W = innerWidth; H = innerHeight; cv.width = W; cv.height = H; scale = Math.min(W, H) / 220; }
fit(); addEventListener("resize", fit);
const toScreen = (x, z) => [W / 2 + x * scale, H / 2 + z * scale];
const toWorld = (px, py) => [(px - W / 2) / scale, (py - H / 2) / scale];
const stars = (() => { const r = stream(spaceSeed ^ 0x5f5f5f5f); const out = []; for (let i = 0; i < 140; i++) out.push([r() * 2 - 1, r() * 2 - 1, 0.3 + r() * 0.9]); return out; })();

cv.addEventListener("pointerdown", (e) => {
  if (over || pending) return;
  const [wx, wz] = toWorld(e.clientX, e.clientY);
  const own = liveShips(battle, 1);
  let hit = null, hd = 8;
  for (const s of own) { const d = Math.hypot(s.pos[0] - wx, s.pos[2] - wz); if (d < hd) { hd = d; hit = s; } }
  if (hit && mode === null) { selected = hit; return; }
  const free = ts.phase === "free";
  if (!free && ts.phase !== "orders") return;
  if (!selected || selected.hp <= 0) return;
  if (!free && apOf(ts, selected) <= 0) return;
  if (mode === "attack") {
    let best = null, bd = 10;
    for (const t of liveShips(battle, 2)) { const d = Math.hypot(t.pos[0] - wx, t.pos[2] - wz); if (d < bd) { bd = d; best = t; } }
    if (!best) return;
    present({ kind: "attack", ship: selected, target: best, title: "ATTACK",
      body: "close and engage<br>" + (free ? "free time — no cost" : "cost 1 point · " + (apOf(ts, selected) - 1) + " after") });
    return;
  }
  present({ kind: "move", ship: selected, x: wx, z: wz, title: "MOVE",
    body: "burn to that point<br>" + (free ? "free time — no cost" : "cost 1 point · " + (apOf(ts, selected) - 1) + " after") });
});

// ---- the end card
function showCard(won) {
  cardTitle.textContent = won ? "THE ROUTE IS CLEAR" : "THE WING BROKE";
  cardBody.innerHTML = "ship bounties: " + paid + "<br>the purse: " + purse.scrap +
    (contract ? "<br>" + (won ? "the job waits on the ground" : "the contract is lost") : "");
  cardGo.textContent = won && contract ? "CONTINUE TO THE JOB" : "BACK TO THE BOARD";
  cardGo.onclick = () => {
    if (won && contract) location.href = "index.html?board=" + contract.boardSeed + "&job=" + contract.job;
    else location.href = "index.html?board=" + (contract ? contract.boardSeed : Math.floor(Math.random() * 1e9));
  };
  card.style.display = "block";
}

// ---- the loop
let last = performance.now(), acc = 0, fpsFrames = 0, fpsT = 0, fpsText = "- fps";
const wingOps = () => liveShips(battle, 1);
function frame(now) {
  requestAnimationFrame(frame);
  let dt = Math.min(0.1, (now - last) / 1000); last = now;
  const ticking = !over && !pending && (ts.phase === "free" || ts.phase === "exec" || ts.phase === "enemy");
  if (ticking) {
    acc += dt;
    let guard = 0;
    while (acc >= SPACE_STEP && guard++ < 8 && !over) {
      acc -= SPACE_STEP;
      if (ts.phase === "free") {
        stepSpace(battle);
        if (contactMade(battle)) { startTurns(ts, wingOps()); say("CONTACT", "YOUR TURN — 3 POINTS A SHIP"); }
      } else if (ts.phase === "exec") {
        stepSpace(battle, { player: false, enemy: true });
        if (stepExec(ts, SPACE_STEP, false)) { enemyOrders(battle); say("ENEMY TURN", ""); }
      } else if (ts.phase === "enemy") {
        stepSpace(battle);
        if (stepEnemy(ts, SPACE_STEP, wingOps())) say("YOUR TURN " + ts.turn, "3 POINTS A SHIP");
      }
      for (const ev of drainSpaceEvents(battle)) {
        if (ev.team === 2) { paid += ev.bounty; purse.scrap += ev.bounty; purse.earned += ev.bounty; purse.kills++; }
      }
      if (battle.over) {
        over = true;
        savePurse(localStorage, purse);
        say("", "");
        showCard(battle.won);
      }
    }
  } else if (!ticking) acc = 0;
  // ---- draw
  ctx2d.fillStyle = "#05070d"; ctx2d.fillRect(0, 0, W, H);
  for (const [sx, sy, m] of stars) { ctx2d.fillStyle = "rgba(233,237,242," + 0.25 * m + ")"; ctx2d.fillRect(W / 2 + sx * W * 0.7, H / 2 + sy * H * 0.7, m, m); }
  ctx2d.strokeStyle = "rgba(120,140,180,0.08)"; ctx2d.lineWidth = 1;
  for (let g = -100; g <= 100; g += 20) {
    const [x0, y0] = toScreen(g, -110), [x1, y1] = toScreen(g, 110);
    ctx2d.beginPath(); ctx2d.moveTo(x0, y0); ctx2d.lineTo(x1, y1); ctx2d.stroke();
    const [a0, b0] = toScreen(-110, g), [a1, b1] = toScreen(110, g);
    ctx2d.beginPath(); ctx2d.moveTo(a0, b0); ctx2d.lineTo(a1, b1); ctx2d.stroke();
  }
  for (const s of battle.ships) {
    if (s.hp <= 0) continue;
    const [sx, sy] = toScreen(s.pos[0], s.pos[2]);
    const ang = Math.atan2(s.heading[2], s.heading[0]);
    ctx2d.save(); ctx2d.translate(sx, sy); ctx2d.rotate(ang);
    ctx2d.fillStyle = s.team === 1 ? "#7fb4ff" : "#ff7a6b";
    ctx2d.beginPath(); ctx2d.moveTo(9, 0); ctx2d.lineTo(-6, 5); ctx2d.lineTo(-3, 0); ctx2d.lineTo(-6, -5); ctx2d.closePath(); ctx2d.fill();
    ctx2d.restore();
    if (s === selected) { ctx2d.strokeStyle = "#6fbf73"; ctx2d.beginPath(); ctx2d.arc(sx, sy, 13, 0, Math.PI * 2); ctx2d.stroke(); }
    ctx2d.fillStyle = "rgba(13,17,23,.7)"; ctx2d.fillRect(sx - 10, sy - 18, 20, 3);
    ctx2d.fillStyle = s.team === 1 ? "#6fbf73" : "#e9b25c"; ctx2d.fillRect(sx - 10, sy - 18, 20 * Math.max(0, s.hp / s.maxHp), 3);
  }
  fpsFrames++; fpsT += dt;
  if (fpsT >= 0.5) { fpsText = Math.round(fpsFrames / fpsT) + " fps"; fpsFrames = 0; fpsT = 0; }
  hud.innerHTML = mkText + "<br>" + fpsText + "<br>space " + spaceSeed + "<br>purse " + purse.scrap;
  drawChips();
}
requestAnimationFrame(frame);
```

**Step 6 — file identity.** `node --check` on the four script files (each prints nothing, exit 0), then `wc -c` and `sha256sum` on all six; compare mechanically (pipe to files and diff), never by eye:

- `src/games/frostline/space.js` — 5352 bytes, sha256 `cabecce1a658843f5acedf0e9c26dd6723bc92dadc1204fb1a9ab9226aa5a737`
- `src/games/frostline/contracts.js` — 2974 bytes, sha256 `1c24accbd7262dc809542d5fbcb733472439c6a317ae63d20a308ad968d32318`
- `scripts/frostline-test.mjs` — 25816 bytes, sha256 `1983dfeb997d1c32e862da0ecab33fe9d15d5d15e398564edc029a0959404e19`
- `docs/frostline/main.js` — 20618 bytes, sha256 `8b264f30a6d7a3013229866307e40cbb94bf7a6e70ff26f04a50f3b9fb12a18a`
- `docs/frostline/space.html` — 4458 bytes, sha256 `6e15fcef55e12b2e99f7decfa1f1b5467fa670d30f34482560e310c7b15e079f`
- `docs/frostline/space-main.js` — 10377 bytes, sha256 `c7db45787ed490e50f8ca880250cf2fece715b5cc5203f257bbbd8fae88ea470`

A mismatch stops the task: report it, change nothing else.

**Step 7 — the gate re-asserts.** `node scripts/gate.mjs frostline` must print 58 PASS lines, `frostline-test: 58 PASS / 0 FAIL`, `frostline-test PASS`, exit 0. No full suite (no engine file changes), no audit, no smoke, no page loads, no screenshots.

**Step 8 — records and deploy.** Move this document and the phase frame into `docs/plans/`. Stamp the phase status in a second record commit; the stamp subject is exactly `phase 0.0.28 record stamped — <first commit's 7-character short hash>`. Mark FL-8 `[LANDED] ` in `docs/plans/game-frostline.md`. Bump `package.json` 0.0.27 to 0.0.28. Commit with message:

```
phase 0.0.28 — FROSTLINE FL-8: the space theater

Ships as operators on the landed orders and steering modules, under the same
turn machine and confirmations as the ground. Space battles enter by travel:
a hot route flies its ambush first, deterministic from the contract's own
seed and posted on the board; won, the ground job waits past it. The flat
black canvas draws the fight; ship bounties pay the one purse.
frostline-test: 58 PASS / 0 FAIL; the licensed board pins re-taught.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
```

Push. The push publishes the pages; the owner's live check rules look and feel.

## Known limits, said plainly

- The skirmish is minimal by ruling: move and attack only — guard orbits, formations, and focus fire follow in a later phase.
- One hull both sides; ship types and the roster contract come with a later phase.
- The space leg records no tape yet; the ground tape machinery extends to space in a later task.
- Losing the ambush costs the attempt, nothing more — no ship persistence, no repair bill; casualties in space are a later ruling.
- The space page shares the purse but not the ground's men/roster books — the wing is always three fighters.

## Report shape

Read-confirmation first, then one line of outcome, then bullets: both gate count-and-verdict lines verbatim, all six wc -c lines, all six sha256 lines, both commit hashes, push result. Every nonconformity its own labeled bullet. Fixture seeds: ground 3, space 12345, boards 7, 11, 42; no seed is special.

## Suggested model

Sonnet 5 — every changed byte printed, hashes ratify.
