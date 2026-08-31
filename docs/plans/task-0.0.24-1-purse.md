# Task 0.0.24-1 — the purse: every kill pays, the vault holds, the roster grows

One job: land FL-4 exactly as printed — the purse module, the roster through the mission boot, the debrief screen with the shop, seven new gate checks. Five files: four printed whole, the mission module printed whole as well. The final hashes are the acceptance. You design nothing.

This document lives at `docs/plans/task-0.0.24-1-purse.md` when the task lands; the phase frame `docs/plans/phase-0.0.24-frostline-4.md` is served with it and copied in at landing.

## Required reading, verified in the tree

1. This document, whole.
2. The phase frame, whole.
3. `src/games/frostline/mission.js` — replaced whole below.
4. `docs/frostline/main.js` — replaced whole below.

Your report opens with a read-confirmation naming these.

## Steps

**Step 1 — green before anything moves.** `node scripts/gate.mjs frostline` must print `frostline-test: 29 PASS / 0 FAIL`, `frostline-test PASS`, exit 0. Minutes on this machine; never conclude failure from slowness. Any other result stops the task.

**Step 2 — the purse module.** Write `src/games/frostline/purse.js`, exactly:

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
export const FOR_SALE = ["rifles", "mg", "sniper"];

export function makePurse() {
  return { scrap: 0, earned: 0, kills: 0, roster: [] };
}

// loadPurse(storage) -> a purse from the vault, or a fresh one. A broken
// or missing record never throws — the war starts broke, not crashed.
export function loadPurse(storage) {
  try {
    const raw = storage.getItem(STORE_KEY);
    if (!raw) return makePurse();
    const p = JSON.parse(raw);
    if (typeof p.scrap !== "number" || !Array.isArray(p.roster)) return makePurse();
    return { scrap: p.scrap, earned: p.earned || 0, kills: p.kills || 0, roster: p.roster.filter((t) => SQUAD_SPECS[t]) };
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
  if (!SQUAD_SPECS[type] || purse.scrap < price) return false;
  purse.scrap -= price;
  purse.roster.push(type);
  return true;
}
```

**Step 3 — the roster through the boot.** Replace `src/games/frostline/mission.js` whole with:

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
  // east of the town, a loose line; bought teams extend it eastward so the
  // ring sweep never has to resolve two squads asking for one spot
  const offs = [[10, 0], [14, -5], [12, 7], [18, 0], [20, -6], [19, 8], [24, 2], [26, -4]];
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
export function bootMission(def, seed = 3, roster = []) {
  const fielded = { ...def, friendlies: def.friendlies.concat(roster.map((t) => ({ type: t }))) };
  const def0 = def;
  def = fielded;
  for (let k = 0; k < (def0.tries || 24); k++) {
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
  throw new Error("no placeable valley within " + (def0.tries || 24) + " seeds of " + seed);
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
import { loadPurse, savePurse, earnFromEvents, winBonus, buyTeam, teamPrice, WIN_BONUS, makePurse } from "../src/games/frostline/purse.js";
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

console.log(`frostline-test: ${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
console.log("frostline-test PASS");
```

Seven checks are new (36 total). No existing assert moves — an empty roster boots byte-identically, proven at trial.

**Step 5 — the page.** Replace `docs/frostline/main.js` whole with:

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
import { loadPurse, savePurse, earnFromEvents, winBonus, buyTeam, teamPrice, FOR_SALE, STORE_KEY } from "../../src/games/frostline/purse.js";
import { INFANTRY_ARMS } from "../../src/depot/specs.js";

const canvas = document.getElementById("cv");
// the seed: ?seed=N in the address replays a battle exactly; no seed asked
// rolls a fresh valley. The seed that took is written back to the address
// and shown on the hud, so any battle can be named, saved, and reported.
const askSeed = (() => {
  const q = parseInt(new URL(location.href).searchParams.get("seed") || "", 10);
  return Number.isFinite(q) ? q : Math.floor(Math.random() * 1e9);
})();
const purse = loadPurse(localStorage);
const { war, mission, seed } = bootMission(MISSION_R1, askSeed, purse.roster);
let battleEarned = 0, bonusPaid = 0;
history.replaceState(null, "", "?seed=" + seed);
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

// ---- the debrief: the books shown, the shop open, the next battle a tap away
const debriefEl = document.getElementById("debrief");
const dbTitle = document.getElementById("dbTitle"), dbBody = document.getElementById("dbBody"), dbShop = document.getElementById("dbShop");
function showDebrief(won) {
  dbTitle.textContent = won ? "THE FAR SIDE — CONTRACT COMPLETE" : "THE LINE BROKE";
  dbBody.innerHTML = "bounties this battle: " + battleEarned +
    (bonusPaid ? "<br>completion bonus: " + bonusPaid : "") +
    "<br>the purse: " + purse.scrap + "<br>roster: 3 + " + purse.roster.length + " bought";
  dbShop.innerHTML = "";
  for (const type of FOR_SALE) {
    const b = document.createElement("button");
    const price = teamPrice(type);
    b.textContent = "BUY " + (type === "mg" ? "GUNNERS" : type === "sniper" ? "SNIPER PAIR" : "RIFLE SQUAD") + " — " + price;
    b.disabled = purse.scrap < price;
    b.addEventListener("click", () => { if (buyTeam(purse, type)) { savePurse(localStorage, purse); showDebrief(won); } });
    dbShop.appendChild(b);
  }
  debriefEl.style.display = "block";
}
document.getElementById("dbNew").addEventListener("click", () => {
  location.href = location.pathname + "?seed=" + Math.floor(Math.random() * 1e9);
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
      battleEarned += earnFromEvents(purse, war, events);
      const s = missionState(war, mission);
      if (s.won || s.lost) {
        over = true;
        if (s.won) bonusPaid = winBonus(purse);
        savePurse(localStorage, purse);
        say("", "");
        showDebrief(s.won);
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
  hud.innerHTML = mkText + "<br>" + fpsText + "<br>seed " + seed + "<br>purse " + purse.scrap;
  drawChips();
  title.textContent = "FROSTLINE · " + mission.name + (ts.phase === "orders" ? " · TURN " + ts.turn : "");
  R.render(dt, focus, aim);
}
requestAnimationFrame(frame);
```

and `docs/frostline/index.html` whole with:

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
  #debrief { position: fixed; left: 50%; top: 50%; transform: translate(-50%, -50%); min-width: 240px; max-width: 86vw;
    padding: 14px 16px; border-radius: 12px; border: 1.5px solid rgba(233,178,92,.5); background: rgba(13,17,23,.92);
    color: #e9edf2; font: 500 12px/1.7 system-ui, sans-serif; }
  #dbTitle { font-weight: 700; letter-spacing: 0.12em; margin-bottom: 6px; color: #e9b25c; }
  #dbShop button { display: block; width: 100%; margin: 6px 0; padding: 8px 10px; border-radius: 8px;
    border: 1.5px solid rgba(233,237,242,.4); background: rgba(13,17,23,.6); color: #e9edf2;
    font: 600 11px system-ui, sans-serif; letter-spacing: 0.08em; }
  #dbShop button:disabled { opacity: 0.4; }
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
<div id="debrief" style="display:none">
  <div id="dbTitle"></div>
  <div id="dbBody"></div>
  <div id="dbShop"></div>
  <div><button class="act" id="dbNew">NEW BATTLE</button><button class="act" id="dbReset">RESET PURSE</button></div>
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

**Step 6 — file identity.** `node --check` on the four script files (each prints nothing, exit 0), then `wc -c` and `sha256sum` on all five:

- `src/games/frostline/purse.js` — 2860 bytes, sha256 `da621f65733f86a585cec941d877ff775bf292553849b11df09481f9d18deb38`
- `src/games/frostline/mission.js` — 7585 bytes, sha256 `4f156be5bd23ea21b624cd4907c09a52959dbe951aeb250413399e1c61cc2329`
- `scripts/frostline-test.mjs` — 16869 bytes, sha256 `33fb4b7ea338c6ae723856b9163e34d60d7c1d1eceef9085e9dc46637b296944`
- `docs/frostline/main.js` — 17551 bytes, sha256 `a9a23077f8083104031fb42ed9e28115b0778577d6cffcb8a39b8bbefc379880`
- `docs/frostline/index.html` — 5845 bytes, sha256 `64602052b9cd84daa5625afe4d22138bb4c57db11c35b310217c16dba2ce138d`

A mismatch stops the task: report it, change nothing else.

**Step 7 — the gate re-asserts.** `node scripts/gate.mjs frostline` must print 36 PASS lines, `frostline-test: 36 PASS / 0 FAIL`, `frostline-test PASS`, exit 0. Minutes; run with a generous timeout or in background and read the actual output. No audit run — the estimate did not move. No smoke, no page loads, no screenshots.

**Step 8 — records and deploy.** Move this document and the phase frame into `docs/plans/`. Stamp the phase status line in a second record commit naming the first (the repository's two-commit shape). Mark FL-4 `[LANDED] ` in `docs/plans/game-frostline.md`. Bump `package.json` 0.0.23 to 0.0.24. Commit with message:

```
phase 0.0.24 — FROSTLINE FL-4: the purse

Every kill pays its bounty win or lose, the won contract adds its bonus, and
the debrief sells new team types onto a roster that boots by the same rules
on the same vetted ground. The purse persists in the browser with a reset.
frostline-test: 36 PASS / 0 FAIL; twenty-nine prior checks unmoved.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
```

Push. The push publishes the page; the owner's live check rules look and feel.

## Known limits, said plainly

- The debrief's shop sells three types (rifles, gunners, sniper pair); squad strength and weapon rows are later phases by the ruling.
- The completion bonus 25 and prices from the squad table are provisional dials.
- A bought roster makes the mission easier while the enemy stays fixed; difficulty is a playtest dial, not this task's.
- The reset control wipes the purse without confirmation; a guard is a polish-queue item if wanted.

## Report shape

Read-confirmation first, then one line of outcome, then bullets: both gate count-and-verdict lines verbatim, all five wc -c lines, all five sha256 lines, both commit hashes, push result. Every nonconformity its own labeled bullet. Fixture seed: 3; no seed is special.

## Suggested model

Sonnet 5 — every changed byte printed, hashes ratify.
