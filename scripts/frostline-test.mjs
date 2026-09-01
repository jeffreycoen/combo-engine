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
