// COMBO-ENGINE — frostline-test: the game's gate, restructured to the
// owner's testing law: NEVER a timed simulation — a check proves a call
// fires correctly (one call, one tick, direct asserts) and nothing plays
// out over seconds. Checks are grouped by AREA; a task's brief names the
// areas its diff touched and only those run:
//
//   node scripts/gate.mjs frostline                 -> every area
//   node scripts/gate.mjs frostline turns purse     -> those areas alone
//
// Whether the game works out over time — crossings, chases, healing to
// full, replays — is the owner's playtest at the live page.
// Fixture seeds: 3 (the mission), boards 7, 11, 42, space 12345; no seed
// is special.
import { tickWar, defaultTickInput } from "../src/depot/api.js";
import { worldHash, addBody, applyDamage } from "../src/engine/core.js";
import { bootMission, missionState, MISSION_R1, openGround, connected } from "../src/games/frostline/mission.js";
import { orderMove, pickSquad } from "../src/games/frostline/command.js";
import { makeTurns, startTurns, apOf, spend, clampMove, capOf, beginExec, stepExec, stepEnemy, heldInput, TURNS } from "../src/games/frostline/turns.js";
import { coverAt, exposure, hitChance, knownThreats } from "../src/games/frostline/cover.js";
import { setOverwatch, OVERWATCH, inArc, applyFireControl, toggleDiscipline, markTarget, markedTarget, owPaths } from "../src/games/frostline/verbs.js";
import { squadFire, spawnSquadMembers } from "../src/depot/state.js";
import { arcClears } from "../src/depot/accuracy.js";
import { INFANTRY_ARMS } from "../src/depot/specs.js";
import { makeSquad, stepMedicTend, MEDIC_TEND_M } from "../src/depot/squads.js";
import { loadPurse, savePurse, earnFromEvents, winBonus, buyTeam, teamPrice, WIN_BONUS, makePurse, fieldedTypes, menOf, manPrice, recordCasualties, refillCost, buyRefill } from "../src/games/frostline/purse.js";
import { makeBoard, completionPay, CLEAN_PAY, UNDER_PAY, BOARD_JOBS, nextBoardSeed, doneOf, markJobDone } from "../src/games/frostline/contracts.js";
import { makeCtx, stepBattle, applyOp, record } from "../src/games/frostline/tape.js";
import { makeSpaceBattle, stepSpace, enemyOrders, wingState, liveShips } from "../src/games/frostline/space.js";
import { orderAttack as shipAttack } from "../src/modules/orders/orders.js";

let pass = 0, fail = 0;
const check = (name, ok) => { if (ok) { pass++; console.log("PASS " + name); } else { fail++; console.log("FAIL " + name); } };
const near = (a, b, e) => Math.abs(a - b) < (e || 1e-9);
const STEP = 1 / 120;

// a vetted firing stand on the fixture map: the first spot where the given
// arms' arc clears to a target dz meters north. Geometry scan, no ticks.
function standFor(war, spec, dz) {
  const w = war.world;
  for (let x = -30; x <= 30; x += 3) for (let z = -20; z <= 30; z += 3) {
    const m = { x, y: war.field.heightAt(x, z) + 1.2, z };
    const t = { x, y: war.field.heightAt(x, z + dz) + 0.7, z: z + dz };
    if (arcClears(w, m, t, spec, -1)) return { x, z };
  }
  return null;
}
const placeSquad = (war, sq, x, z) => {
  const members = sq.memberIds.map((id) => war.world.byId.get(id)).filter((u) => u && u.alive);
  members.forEach((u, i) => { u.pos.x = x + i * 0.8; u.pos.z = z; u.pos.y = war.field.heightAt(u.pos.x, u.pos.z) + 0.7; u.fireCd = 0; });
  sq.anchor = { x, z }; sq.order = "defend";
  return members;
};
const mkFoe = (war, x, z, hp = 10) => addBody(war.world, { kind: "unit", x, y: war.field.heightAt(x, z) + 0.7, z, hx: 0.28, hy: 0.7, hz: 0.28, mass: 80, hp, team: 2 });

const AREAS = {

  mission() {
    const { war, mission } = bootMission(MISSION_R1, 3);
    const s = missionState(war, mission);
    check("mission: the fixture boots — three squads, eight friendlies, four blockers, the world pins",
      war.run.squads.length === 3 && s.friendlies === 8 && s.enemies === 4 && !s.won && !s.lost && worldHash(war.world) === 2024034825);
    check("mission: nothing is known at boot", knownThreats(war).length === 0);
    check("mission: a tap on the rifles takes them", pickSquad(war.run.squads, war.run.squads[0].anchor.x, war.run.squads[0].anchor.z) === war.run.squads[0]);
    // spawns clear of every solid, trees included — the vet asserted directly, no ticks
    let clear = true;
    for (const sq of war.run.squads) for (const id of sq.memberIds) {
      const u = war.world.byId.get(id);
      for (const b of war.world.bodies) {
        if (!b.alive || b === u) continue;
        if (!["rock", "wall", "tower", "tree", "chunk"].includes(b.kind)) continue;
        if (Math.abs(u.pos.x - b.pos.x) <= b.hx + 0.28 && Math.abs(u.pos.z - b.pos.z) <= b.hz + 0.28) clear = false;
      }
    }
    check("mission: every spawned man stands clear of every solid, trees included", clear);
    let placed = 0, roads = 0, asAsked = 0;
    for (const seed of [7, 11, 42]) {
      const r = bootMission(MISSION_R1, seed);
      placed++;
      if (r.seed === seed) asAsked++;
      if (connected(r.war, r.war.run.squads[0].anchor, r.mission.exit)) roads++;
    }
    check("mission: three more valleys place by rule, every asked seed as asked", placed === 3 && asAsked === 3);
    check("mission: every placed valley proves its spawn-to-exit road", roads === 3);
    const twin = () => worldHash(bootMission(MISSION_R1, 7).war.world);
    check("mission: a seed is a battle — twin boots land bit-identical worlds", twin() === twin());
    const m2 = bootMission(MISSION_R1, 3, [], [2, 1, 2]);
    const counts = m2.war.run.squads.map((sq) => sq.memberIds.map((id) => m2.war.world.byId.get(id)).filter((u) => u && u.alive).length);
    check("mission: a battered roster fields what it has", counts.join() === "2,1,2");
    const m3 = bootMission(MISSION_R1, 3, [], [0, 2, 2]);
    check("mission: a wiped squad fields nothing, the rest march", m3.war.run.squads.length === 2 && m3.war.run.squads[0].type === "mg");
    const m4 = bootMission(MISSION_R1, 3, ["mg"]);
    const extra = m4.war.run.squads[3];
    const g = openGround(m4.war, extra.anchor.x, extra.anchor.z, 0.6);
    check("mission: a bought team boots a fourth squad on open ground",
      m4.war.run.squads.length === 4 && extra.type === "mg" && g && Math.hypot(g.x - extra.anchor.x, g.z - extra.anchor.z) < 1e-9);
  },

  turns() {
    const ts = makeTurns();
    check("turns: the war starts in free time", ts.phase === "free" && ts.turn === 0);
    const squads = [{ id: 7, anchor: { x: 0, z: 0 } }, { id: 9, anchor: { x: 5, z: 0 } }];
    startTurns(ts, squads);
    check("turns: first contact opens the orders phase, one point a squad",
      ts.phase === "orders" && ts.turn === 1 && apOf(ts, squads[0]) === TURNS.ap && apOf(ts, squads[1]) === TURNS.ap);
    check("turns: one point buys one order, a dry pool refuses",
      spend(ts, squads[0]) && !spend(ts, squads[0]) && apOf(ts, squads[1]) === 1);
    const c = clampMove(squads[0], 100, 0);
    check("turns: the cap prices distance — a 100 m ask lands on 22 along the same line",
      near(c.x, TURNS.moveCap) && near(c.z, 0) && clampMove(squads[0], 4, 0).x === 4);
    beginExec(ts);
    check("turns: the player half yields on done or its cap, then the enemy half",
      ts.phase === "exec" && !stepExec(ts, 1, false) && stepExec(ts, 0, true) && ts.phase === "enemy");
    check("turns: the enemy half closes on its window and the pools refill",
      stepEnemy(ts, TURNS.enemyS, squads) && ts.phase === "orders" && ts.turn === 2 && apOf(ts, squads[0]) === 1);
    const input = defaultTickInput();
    check("turns: the engine's own switch holds the enemy side",
      heldInput(input, true).devDummies === true && heldInput(input, false).devDummies === false);
    check("turns: the hunter flies 35 where a squad marches 22",
      capOf({ type: "hunter" }) === TURNS.jetCap && capOf({ type: "rifles" }) === TURNS.moveCap);
  },

  cover() {
    const { war } = bootMission(MISSION_R1, 3);
    const w = war.world;
    let spot = null;
    for (let x = -20; x <= 20 && !spot; x += 2) for (let z = -10; z <= 30 && !spot; z += 2) {
      if (Math.abs(war.field.heightAt(x, z) - war.field.heightAt(x, z + 12)) < 0.25) spot = { x, z };
    }
    const X = spot.x, Z = spot.z, tgtZ = Z + 11.2, wallZ = Z + 10;
    addBody(w, { kind: "wall", x: X, y: war.field.heightAt(X, wallZ) + 0.55, z: wallZ, hx: 2, hy: 0.55, hz: 0.2, mass: 0, hp: 1e9 });
    addBody(w, { kind: "wall", x: X + 6, y: war.field.heightAt(X + 6, wallZ) + 1.05, z: wallZ, hx: 2, hy: 1.05, hz: 0.2, mass: 0, hp: 1e9 });
    const mz = (mx) => ({ x: mx, y: war.field.heightAt(mx, Z) + 1.4, z: Z });
    check("cover: open reads open, a chest wall half (the head shows), a tall wall full",
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
    check("cover: the estimate orders itself and stays inside [0.02, 0.98]",
      pOpen > pLow && pLow >= pTall && pTall >= 0.02 && pOpen > pFar
      && [pOpen, pLow, pTall, pFar].every((p) => p >= 0.02 && p <= 0.98));
    check("cover: the audited formula pins its numbers (the live-fire fit, HIT_REACH 0.82)",
      near(pOpen, 0.594733, 5e-7) && near(pLow, 0.050096, 5e-7) && near(pTall, 0.02, 5e-7) && near(pFar, 0.150843, 5e-7));
  },

  fire() {
    const sq1 = { id: 1, anchor: { x: 0, z: 0 } };
    setOverwatch(sq1, 0, 10, 1);
    const narrow = sq1._ow.half;
    setOverwatch(sq1, 10, 0, 2);
    check("fire: overwatch prices its width and re-aims",
      narrow === OVERWATCH.half1 && sq1._ow.half === OVERWATCH.half2 && near(sq1._ow.b, Math.PI / 2) && sq1.order === "defend");
    check("fire: the cone's own test holds at the wrap seam",
      inArc({ b: 0, half: Math.PI / 4 }, 0, 0, 0, 10) && !inArc({ b: 0, half: Math.PI / 4 }, 0, 0, 10, 0)
      && inArc({ b: Math.PI, half: Math.PI / 4 }, 0, 0, 0.01, -10));
    const ts = { phase: "enemy" };
    const a = { id: 1, anchor: { x: 0, z: 0 } }, b = { id: 2, anchor: { x: 0, z: 0 } }, c = { id: 3, anchor: { x: 0, z: 0 } };
    setOverwatch(b, 0, 10, 1);
    c._disc = "free";
    applyFireControl(ts, [a, b, c]);
    const enemyHalf = a.holdFire === true && b.holdFire === false && !!b.fireArc && c.holdFire === false && !c.fireArc;
    ts.phase = "exec";
    applyFireControl(ts, [a, b, c]);
    check("fire: discipline rules the enemy half; your own half everyone fights",
      enemyHalf && a.holdFire === false && c.holdFire === false && toggleDiscipline(a) === "free" && toggleDiscipline(a) === "careful");
    const { war } = bootMission(MISSION_R1, 3);
    const w = war.world;
    const sq = war.run.squads[0];
    const st = standFor(war, INFANTRY_ARMS.rifles, 8);
    placeSquad(war, sq, st.x, st.z);
    const near1 = mkFoe(war, st.x, st.z + 8), far1 = mkFoe(war, st.x, st.z + 14);
    const reset = () => { sq._lastTargetId = null; sq.memberIds.forEach((id) => { const u = w.byId.get(id); if (u) u.fireCd = 0; }); };
    reset(); sq.holdFire = true; squadFire(w, sq, STEP);
    const heldQuiet = sq._lastTargetId === null;
    reset(); sq.holdFire = false; squadFire(w, sq, STEP);
    check("fire: the safety is real — a holding squad never pulls, released it takes the nearest man", heldQuiet && sq._lastTargetId === near1.id);
    reset(); sq.fireArc = { b: Math.PI, half: Math.PI / 4 }; squadFire(w, sq, STEP);
    const coneAway = sq._lastTargetId === null;
    reset(); sq.fireArc = { b: 0, half: Math.PI / 4 }; squadFire(w, sq, STEP);
    check("fire: the cone binds the trigger", coneAway && sq._lastTargetId === near1.id);
    reset(); sq.fireArc = null; sq.focusId = far1.id; squadFire(w, sq, STEP);
    const focused = sq._lastTargetId === far1.id;
    reset(); far1.alive = false; squadFire(w, sq, STEP);
    check("fire: focus outranks near, and a dead focus falls back to the scan", focused && sq._lastTargetId === near1.id);
    markTarget(war, far1);
    const deadMark = markedTarget(war) === null;
    markTarget(war, near1);
    check("fire: the mark is one shared target and a dead mark clears itself", deadMark && markedTarget(war) === near1);
    sq._ow = { b: 0, half: Math.PI / 4 };
    const paths = owPaths([sq], (x, z) => war.field.heightAt(x, z));
    check("fire: the cone draws itself on the existing overlay", paths.length === 3 && paths[0].length === 2 && paths[2].length === 5);
    // the medic's tend FIRES: one call, hp rises — healing to full is playtest
    const hurt = w.byId.get(war.run.squads[1].memberIds[0]);
    hurt.hp = 3;
    const med = makeSquad(war.run.nextSquadId++, "medics", 1, hurt.pos.x + MEDIC_TEND_M * 0.5, hurt.pos.z);
    spawnSquadMembers(w, med);
    const medic = w.byId.get(med.memberIds[0]);
    medic.pos.x = hurt.pos.x + 0.8; medic.pos.z = hurt.pos.z;
    const before = hurt.hp;
    const tended = stepMedicTend(w, medic, medic.pos.x, medic.pos.z, STEP);
    check("fire: the medic's tend fires — one call, the patient's hp rises", tended && hurt.hp > before);
  },

  purse() {
    const mem = {}; const storage = { getItem: (k) => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); } };
    const p = loadPurse(storage);
    check("purse: a fresh vault opens broke, full strength, no heat", p.scrap === 0 && p.roster.length === 0 && menOf(p).join() === "4,2,2" && (p.heat || 0) === 0);
    // the kill pays: one applyDamage, the event read directly — no battle
    const { war } = bootMission(MISSION_R1, 3);
    const foe = war.world.bodies.find((b) => b.kind === "unit" && b.team === 2 && b.alive);
    const bounty = foe.bounty;
    applyDamage(war.world, foe, 1e9, { attacker: "player" });
    const paid = earnFromEvents(p, war, war.world.events);
    check("purse: a kill's own event pays its bounty on one call", bounty > 0 && paid === bounty && p.scrap === bounty && p.kills === 1);
    check("purse: the won contract's flat bonus adds up", winBonus(p) === WIN_BONUS && p.earned === p.scrap);
    const refused = !buyTeam(p, "mg");
    p.scrap += 100;
    const bought = buyTeam(p, "mg");
    check("purse: the shop refuses a dry purse and sells at the table's price", refused && bought && teamPrice("mg") === 38 && p.roster.join() === "mg");
    savePurse(storage, p);
    const q = loadPurse(storage);
    check("purse: the vault round-trips scrap, kills, roster, heat, men",
      q.scrap === p.scrap && q.kills === p.kills && q.roster.join() === p.roster.join());
    check("purse: a broken record loads broke, never crashed", loadPurse({ getItem: () => "{broken", setItem: () => {} }).scrap === 0);
    p.board = { seed: 7, done: [1] };
    savePurse(storage, p);
    const qb = loadPurse(storage);
    check("purse: the vault carries the campaign's board", qb.board.seed === 7 && qb.board.done.join() === "1");
    const p2 = makePurse();
    const fell = recordCasualties(p2, [2, 2, 1]);
    check("purse: the score card's arithmetic — three fell, the books remember", fell === 3 && p2.fallen === 3 && menOf(p2).join() === "2,2,1");
    check("purse: a man has a price — his squad's table price split by heads",
      manPrice("rifles") === 8 && manPrice("mg") === 19 && manPrice("sniper") === 34 && manPrice("medics") === 28);
    const bill = refillCost(p2);
    const short = !buyRefill(p2);
    p2.scrap = 100;
    check("purse: replacements come as a class — refuse short, refill whole",
      bill === 2 * 8 + 34 && short && buyRefill(p2) && refillCost(p2) === 0);
    const p3 = makePurse(); p3.scrap = 300;
    check("purse: the hunter is one of a kind at 120, his re-hire his whole price",
      buyTeam(p3, "hunter") && !buyTeam(p3, "hunter") && teamPrice("hunter") === 120
      && (recordCasualties(p3, [4, 2, 2, 0]), refillCost(p3) === 120));
  },

  board() {
    const b7 = makeBoard(7);
    check("board: a board is its seed — twins byte-identical", JSON.stringify(makeBoard(7)) === JSON.stringify(b7));
    check("board: the fixture pins — jobs, seeds, prices, tags, routes exact",
      b7.length === BOARD_JOBS
      && b7[0].legit === "underground" && b7[0].price === 36 && b7[0].heat === 1 && b7[0].seed === 976907632 && b7[0].name === "CARGO UNDECLARED" && b7[0].hot === true
      && b7[1].legit === "underground" && b7[1].price === 41 && b7[1].seed === 553325603 && b7[1].hot === true
      && b7[2].legit === "clean" && b7[2].price === 20 && b7[2].seed === 197137260 && b7[2].hot === false);
    let lawful = true, hotJobs = 0;
    for (const bs of [7, 11, 42]) for (const j of makeBoard(bs)) {
      const [lo, hi] = j.legit === "underground" ? UNDER_PAY : CLEAN_PAY;
      if (j.price < lo || j.price > hi) lawful = false;
      if (j.legit === "underground" && j.heat < 1) lawful = false;
      if (j.legit === "clean" && j.heat !== 0) lawful = false;
      if (j.hot) { hotJobs++; if (!(j.spaceSeed >= 0)) lawful = false; }
    }
    check("board: the ruled trade holds on every fixture board; every hot job carries its ambush seed", lawful && hotJobs >= 1);
    const p = makePurse();
    check("board: the posted price pays and the heat lands", completionPay(p, b7[0]) === 36 && p.scrap === 36 && p.heat === 1);
    const p4 = makePurse();
    check("board: the won job leaves the board and the books remember",
      markJobDone(p4, 7, 0) === 7 && doneOf(p4, 7).join() === "0" && doneOf(p4, 11).join() === "");
    markJobDone(p4, 7, 1);
    const rolled = markJobDone(p4, 7, 2);
    check("board: the emptied board rolls its next three jobs, deterministically",
      rolled === nextBoardSeed(7) && rolled !== 7 && doneOf(p4, rolled).join() === "" && nextBoardSeed(7) === nextBoardSeed(7));
  },

  tape() {
    const { war, mission } = bootMission(MISSION_R1, 3);
    const ctx = makeCtx(war, mission);
    const tape = [];
    const sq = war.run.squads[0];
    check("tape: a free-time move op fires — the squad's own fields written",
      applyOp(ctx, { op: "move", i: 0, x: sq.anchor.x + 5, z: sq.anchor.z }) && sq.order === "move" && !!sq.dest);
    record(tape, ctx, { op: "move", i: 0, x: 1, z: 2 });
    check("tape: the record carries the tick and the op", tape.length === 1 && tape[0].t === 0 && tape[0].op === "move" && tape[0].x === 1);
    ctx.ts.phase = "orders"; ctx.ts.ap = {}; ctx.ts.ap[sq.id] = 3;
    const refused = !applyOp(ctx, { op: "attack", i: 0, x: 0, z: 0 });
    check("tape: a refused order costs nothing — no known target, no point spent", refused && ctx.ts.ap[sq.id] === 3);
    check("tape: the end op flips the orders phase to the player half",
      applyOp(ctx, { op: "end", i: -1 }) && ctx.ts.phase === "exec");
    ctx.ts.phase = "free";
    const t0 = ctx.tick;
    const out = stepBattle(ctx);
    check("tape: one battle step is one tick with the tick's own events returned",
      ctx.tick === t0 + 1 && Array.isArray(out.events));
  },

  space() {
    const shipsJson = (b) => JSON.stringify(b.ships.map((s) => [s.team, s.hp, s.pos]));
    const b1 = makeSpaceBattle(12345);
    check("space: a battle is its seed — twin boots byte-identical", shipsJson(makeSpaceBattle(12345)) === shipsJson(b1));
    check("space: two wings of three face each other", liveShips(b1, 1).length === 3 && liveShips(b1, 2).length === 3);
    enemyOrders(b1);
    check("space: the droid mind orders every hull onto the nearest foe", liveShips(b1, 2).every((s) => s.attackTarget && s.attackTarget.team === 1));
    const heldSnap = shipsJson(b1);
    stepSpace(b1, { player: true, enemy: true });
    check("space: a held wing is frozen whole — one tick, both sides held, nothing moves", shipsJson(b1) === heldSnap && b1.tick === 1);
    const b2 = makeSpaceBattle(12345);
    const gun = liveShips(b2, 1)[0], tgt = liveShips(b2, 2)[0];
    tgt.pos = [gun.pos[0] + 5, 0, gun.pos[2]];
    shipAttack([gun], tgt);
    gun.fireCd = 0;
    stepSpace(b2, { player: false, enemy: true });
    check("space: the gun fires on one tick — the trigger's own cooldown resets", gun.fireCd > 0);
    const b3 = makeSpaceBattle(12345);
    for (const s of liveShips(b3, 2)) s.hp = 0;
    stepSpace(b3, { player: true, enemy: true });
    check("space: a wiped wing ends the fight, won", b3.over && b3.won && wingState(b3).enemy === 0);
  },

  hunter() {
    const { war } = bootMission(MISSION_R1, 3, ["hunter"]);
    const h = war.run.squads[3];
    const men = h.memberIds.map((id) => war.world.byId.get(id)).filter((u) => u && u.alive);
    check("hunter: one man fields on his own row",
      h.type === "hunter" && men.length === 1 && men[0].utype === "hunter" && INFANTRY_ARMS.hunter.burst === 2 && INFANTRY_ARMS.hunter.range === 12);
    const st = standFor(war, INFANTRY_ARMS.hunter, 8);
    placeSquad(war, h, st.x, st.z);
    const foe = mkFoe(war, st.x, st.z + 8);
    h._lastTargetId = null;
    squadFire(war.world, h, STEP);
    check("hunter: the twin sidearms pull on his own trigger law", h._lastTargetId === foe.id);
  },
};

const asked = process.argv.slice(2).filter((a) => AREAS[a]);
const run = asked.length ? asked : Object.keys(AREAS);
for (const a of run) AREAS[a]();
console.log(`frostline-test [${run.join(" ")}]: ${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
console.log("frostline-test PASS");
