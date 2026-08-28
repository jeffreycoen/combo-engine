// COLDSNAP DEPOT — tick.js: tickWar (war-engine-extraction task 4, mk2.74).
// Advances the war by one fixed step: enemies, towers, the bell, spawning,
// income, territory, devices, the event drain. See api.js's TickInput/
// TickFlags typedefs and CLAUDE.md's standing orders for the contract.
import { addBody } from "../engine/core.js";
import { mechFire, mechMissiles, mechBarrage, mechPunt, mechAboutFace } from "../engine/mech.js";
import { possessedArmorFire, possessedArmorMg, mechSighted } from "./drivers.js";
import { stepDepot, spawnEnemy } from "./sim.js";
import { stepBell, nextSpawnTag, withdrawDue, executeWithdrawal, checkLoss, stampEnd, stepDepotCensus, depotStandingFraction, possessedVolley, possessedTowerFire, scoreKill } from "./state.js";
import { ringBell as ringBellOut } from "./bell.js";
import { stepTerritory } from "./territory.js";
import { stepSight } from "./sight.js";
import { groundRate } from "./economy.js";
import { stepMines, minePrices } from "./mines.js";
import { addFogPatch, stepFog } from "./fog.js";
import { computePrices, marketCounts, priced } from "./market.js";
import { makeBodyLists, rebuildBodyLists } from "./lists.js";
import { computeFlowField } from "./mapgen.js";
import { buildEmitters } from "./boot.js";
import { serializeRun } from "./api.js";

const TERR_STEP = 0.25; // stepTerritory at ~4Hz — accumulated below, not every frame

function warCallbacks(war) {
  if (war.clock._cbs) return war.clock._cbs;
  const { grid, map } = war;
  const objG = grid.worldToGrid(map.OBJ_POS.x, map.OBJ_POS.z);
  const recomputeFlow = () => computeFlowField(grid, objG.gx, objG.gz);
  const onStructureLost = (b) => {
    for (const c of grid.cells) if (c.wallId === b.id) { c.wallId = null; c.blocked = false; c.bTeam = 0; }
    recomputeFlow();
  };
  const onRuin = () => recomputeFlow();
  war.clock._cbs = { recomputeFlow, onStructureLost, onRuin };
  return war.clock._cbs;
}

const spawnOne = (war) => {
  const run = war.run, map = war.map, world = war.world;
  const ws = run.ws;
  const tag = nextSpawnTag(run);
  const sp = map.SPAWN_POINTS[run.spawnRR++ % map.SPAWN_POINTS.length];
  spawnEnemy(world, sp, tag);
  ws.spawnQueue--;
  // The withdrawal clock starts at spawn-completion, not at the bell —
  // a long assault gets its full window; only the aftermath is clamped
  // (withdrawDue's ASSAULT_TIMEOUT clause reads this).
  if (ws.spawnQueue <= 0) ws.spawnDoneT = world.t;
};

function breachRock(war, b, flags) {
  const { field, map, grid, world } = war;
  const k = b.rockRef;
  if (!k) return;
  const { n, cs, h, half } = field;
  const i0 = Math.max(0, Math.floor((k.x - k.r * 1.7 + half) / cs)), i1 = Math.min(n - 1, Math.ceil((k.x + k.r * 1.7 + half) / cs));
  const j0 = Math.max(0, Math.floor((k.z - k.r * 1.7 + half) / cs)), j1 = Math.min(n - 1, Math.ceil((k.z + k.r * 1.7 + half) / cs));
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
    const px = i * cs - half, pz = j * cs - half;
    const d = Math.hypot(px - k.x, pz - k.z) / k.r;
    if (d < 1.6) h[j * n + i] -= k.h * Math.exp(-d * d * 2.1);
  }
  field.dirty = true;
  for (let gz = 0; gz < map.GRID_H; gz++) for (let gx = 0; gx < map.GRID_W; gx++) {
    const wp = grid.gridToWorld(gx, gz);
    if (Math.hypot(wp.x - k.x, wp.z - k.z) < k.r * 0.78 + 0.9) {
      const c = grid.cells[grid.idx(gx, gz)];
      if (c.terrain) { c.blocked = false; c.terrain = false; }
    }
  }
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * 6.28, rr = k.r * (0.2 + 0.5 * ((i * 7) % 5) / 5);
    const c = addBody(world, { kind: "chunk", team: 0, mass: 320, hx: 0.55, hy: 0.55, hz: 0.55, x: k.x + Math.cos(a) * rr, y: field.heightAt(k.x, k.z) + 1.2 + (i % 3) * 0.9, z: k.z + Math.sin(a) * rr, friction: 0.7, restitution: 0.02 });
    c.bornT = world.t;
  }
  const ri = war.rocksLive.indexOf(k);
  if (ri >= 0) war.rocksLive.splice(ri, 1);
  warCallbacks(war).recomputeFlow();
  flags.dressing = true;
}

function drainEvents(war, flags) {
  const { world, run } = war;
  const evs = world.events.slice();
  world.events.length = 0;
  for (let i = world.bodies.length - 1; i >= 0; i--) {
    const rb = world.bodies[i];
    if (rb.kind === "rock" && !rb.alive) {
      breachRock(war, rb, flags);
      world.byId.delete(rb.id);
      world.bodies.splice(i, 1);
    }
  }
  // mk2.14 (owner): a davy burst carved the ground — re-lay the rock
  // dressing so surviving boulders sink to the new surface instead of
  // floating over the crater. Bodies re-seat in the engine; this is
  // their drawn twin.
  if (evs.some((e) => e.type === "boom" && e.weapon === "davy")) {
    flags.dressing = true;
  }
  // Structure damage dealt this frame, attributed via b.lastHit —
  // there's no discrete per-hit damage event, so this rides the hp
  // delta since the last frame's snapshot (see structHp above).
  if (run.ws.results) {
    for (const b of world.bodies) {
      if (b.kind !== "wall" && b.kind !== "tower" && b.kind !== "building") continue;
      const prev = war.clock._structHp.get(b.id);
      if (prev != null && b.hp < prev && b.lastHit && b.lastHit.attacker === "enemy") {
        run.ws.results.structureDmg += prev - b.hp;
      }
      war.clock._structHp.set(b.id, b.hp);
    }
    for (const id of war.clock._structHp.keys()) if (!world.byId.get(id)) war.clock._structHp.delete(id);
  }
  for (const e of evs) {
    // mk2.09: the davy's boom seeds the poison ground where it burst.
    if (e.type === "boom" && e.weapon === "davy") addFogPatch(run.fog, e.x, e.z, world.t);
    if (e.type !== "kill") continue;
    // THE KILL LAW (mk1.93): every attributed death pays and scores here.
    scoreKill(run, e, run._market ? run._market.counts : null);
    // Town buildings are unpriced — their hand-set pay is the named edge
    // outside the law. The branch is preserved as it was, not fixed.
    if (e.attacker === "enemy" && run.ws.results && e.kind === "building") run.ws.results.buildingKills++;
  }
  // The single place a run flips to LOSS (depot destroyed, or the
  // stubbed regiment-destroyed hook) — same function depot-test.mjs
  // drives headlessly.
  checkLoss(run);
  return evs;
}

// headless bell context: silent cues, the one save draw per bell intact.
const noop = () => {};
function defaultBellCtx(war, input) {
  const townUV = war.town.map((b) => { const c = war.map.invW(b.x, b.z); return { id: b.id, x: c.u, z: c.v, marker: b.marker, get ruined() { return b.ruined; } }; });
  return {
    cue: noop, toast: noop, townUV,
    buildSnapshot: () => buildSnapshotOf(war),
    nextApcSeq: () => ++war.seq.apc,
    saveFront: () => { serializeRun(war); },
    possessed: () => !!(input.possess),
  };
}

// buildSnapshot: the counter-signal read planWave uses to weight its
// buy — a fresh count of the player's live defenses every stall.
export function buildSnapshotOf(war) {
  const world = war.world, run = war.run;
  // guns and rockets are counted separately so the book-value verdict
  // (state.js's playerBookValue) can price each at its own real spec
  // cost — rockets are NOT gun-priced here (Phase 3 Task 7 fix). The
  // AI's counter-play read (ai.js's signals()) never looks at either
  // field, so this split changes nothing about wave-planning pressure.
  let mortars = 0, mgs = 0, guns = 0, rockets = 0, teslas = 0, walls = 0, elevSum = 0, elevN = 0;
  for (const b of world.bodies) {
    // WALLS, not courses (P1.5 T2): three would treble planWave's read and playerBookValue.
    if (b.kind === "wall") { if (!b.course) walls++; continue; }
    if (b.kind !== "tower") continue;
    if (b.towerType === "mortar") mortars++;
    else if (b.towerType === "mg") mgs++;
    else if (b.towerType === "gun") guns++;
    else if (b.towerType === "rocket") rockets++;
    else if (b.towerType === "tesla") teslas++;
    elevSum += b.pos.y; elevN++;
  }
  // squads: live player squads (ai.js snapSquads — the sniper-buy
  // gate). run.squads is already pruned each sim tick, but count only
  // squads holding a live member so a same-tick wipe can't inflate it.
  const squads = run.squads.filter((sq) => sq.memberIds.some((id) => { const u = world.byId.get(id); return u && u.alive; })).length;
  return { mortars, mgs, guns, rockets, teslas, walls, squads, towerElev: elevN ? elevSum / elevN : 0 };
}

export function tickWar(war, sdt, input) {
  const { world, run, grid, map, T, town, field } = war;
  const cbs = warCallbacks(war);
  const flags = { territory: false, mines: false, townFlags: false, orderPaths: false, dressing: false, bell: false, withdrew: false, teslaFired: false };
  const bellCtx = input.bellCtx || defaultBellCtx(war, input);

  // mk0.29 (savor the fall): the verdict no longer freezes the world.
  // It stamps the clock; the collapse plays out for END_CARD_DELAY_S
  // of world time, and only when the card is actually up does the sim
  // stop. Orders and building are locked from the verdict itself.
  stampEnd(run, world.t);

  const ws = run.ws;
  if (run.started && !run.gameOver && !run.victory) {
    // THE CLOCK. Read off world.t — the fixed-step sim clock — never
    // wall time and never a React value; a paused run holds the bell
    // exactly where it stood because world.t stops with it.
    if (!war.dev && stepBell(run, world.t)) { flags.bell = true; ringBellOut(world, grid, field, T, run, bellCtx, map); }
    if (ws.spawnQueue > 0) {
      ws.spawnTimer -= sdt;
      if (ws.spawnTimer <= 0) { ws.spawnTimer = ws.spawnDelay; spawnOne(war); }
    } else if (withdrawDue(run, world.t)) {
      // A spent assault breaks contact on its own clock. Silent exit
      // — no kill events, no bounty, no smears; heads/tanks return to
      // the regiment inside executeWithdrawal. The bell is unmoved by
      // it: the next assault comes on schedule regardless.
      const w = executeWithdrawal(run, world);
      if (w.inf + w.tanks > 0) flags.withdrew = true;
    }
    // Between bells nothing pauses: build, orders and combat with
    // whatever is still standing all run straight through.
    run.resources += run._groundRate1 * sdt; // mk2.49 (owner): income is the clock, scaled by held ground — floor 1/second
    if (run.reg) { run.reg.scrap += run._groundRate2 * sdt; run.reg.earned = (run.reg.earned || 0) + run._groundRate2 * sdt; } // one law, one schedule, both sides — and the earned till the muster budgets from (mk2.53)
  }
  war.clock.terrAcc += sdt;
  let terrGuard = 0;
  while (war.clock.terrAcc >= TERR_STEP && terrGuard++ < 8) {
    war.clock.terrAcc -= TERR_STEP;
    stepTerritory(T, buildEmitters(world, map), TERR_STEP);
  }
  // Sight rides the same 4Hz clock the territory field does. ONE
  // recompute per frame, after the catch-up loop rather than inside
  // it: a recompute reads only the world's current bodies, so running
  // it twice in a row would burn the time and give the same map.
  if (terrGuard > 0) stepSight(world, T.sight, map.invW, map.fwdU);
  // mk2.49: THE GROUND PAYS — held-cell counts on the territory
  // clock (bell.js's commander-read loop, verbatim), cached as
  // per-second rates for the income lines below. One law, both signs.
  if (terrGuard > 0) {
    let pc = 0, ec = 0;
    for (let i = 0; i < T.v.length; i++) { if (T.v[i] > 0.15) pc++; else if (T.v[i] < -0.15) ec++; }
    run._groundRate1 = groundRate(pc);
    run._groundRate2 = groundRate(ec);
  }
  if (terrGuard > 0) { stepMines(world, run.mines); flags.mines = true; }
  if (terrGuard > 0) flags.townFlags = true;
  // mk2.09: THE GREEN FOG ticks on the same clock the mines do.
  if (terrGuard > 0 && run.fog.length) stepFog(world, run.fog, TERR_STEP);
  // P7 T17: dead bags release their ground — same cadence as the
  // other derived overlays; bagId cells are few.
  if (terrGuard > 0) for (const c of grid.cells) {
    if (c.bagId == null) continue;
    const b = world.byId.get(c.bagId);
    if (!b || !b.alive) { c.bag = null; c.bagId = null; }
  }
  // P7 T13 (owner): THE GREEN THREADS — every friendly ordered path,
  // green on the ground, refreshed with the other derived overlays.
  if (terrGuard > 0) flags.orderPaths = true;
  if (terrGuard > 0) flags.territory = true;

  world.events.length = 0;
  // P6 T10 (mk1.19): the pool rebuild runs ONCE PER FRAME, not once
  // per sub-step (Task 5's Amendment 1 finding — a catch-up frame
  // running six sub-steps paid six rebuilds in exactly the frames
  // that were already worst). Staleness widens from one tick to one
  // frame; still deterministic. THE IDLE GATE (Task 5 Amendment 1
  // Step A1-1): the pools exist only while the war is hot — squads,
  // towers, or enemies afield. Cold frames null the lists and every
  // consumer full-scans exactly as before the pools existed
  // (pools-vs-full-scan is proven identical, so the gate can be
  // cheap and even frame-paced without touching determinism of
  // outcomes). _hot is stashed by the hud census pass below.
  if (run._hot) rebuildBodyLists(world, world._L || makeBodyLists());
  else world._L = null;

  // THE MECH (mk1.92): commands feed BEFORE stepDepot's stepWorld
  // call, exactly like MechRange's own feedCommands-then-stepWorld
  // order — mechCommand must land before the tick it drives.
  if (input.possess && input.possess.kind === "mech") {
    const pm0 = world.byId.get(input.possess.id);
    if (pm0 && pm0.mechRef && input.feedMech) input.feedMech(pm0.mechRef, sdt);
  }
  stepDepot(world, grid, cbs.onStructureLost, town, cbs.onRuin, T, input.discipline, run, input, map);
  // POSSESSION (P4 T2, mk0.91): THE TRIGGER. At most one volley
  // attempt per sim tick — cooldowns (possessedVolley's own
  // u.fireCd gate) do the real limiting, not this flag.
  if (input.fireHeld && input.possess && input.possess.kind === "squad" && input.reticle) {
    const psq = run.squads.find((q) => q.id === input.possess.id);
    if (psq) possessedVolley(world, psq, input.reticle, T, map.invW);
  }
  // POSSESSION (P4 T3, mk0.92): a possessed tower's trigger — same
  // one-attempt-per-tick flag, real spec, real cooldown, through
  // possessedTowerFire. Discipline note: friendlyFouls is NOT
  // consulted while possessed — your trigger, your responsibility.
  if (input.fireHeld && input.possess && input.possess.kind === "tower" && input.reticle) {
    const ptw = world.byId.get(input.possess.id);
    if (ptw && possessedTowerFire(world, ptw, input.reticle, T, map.invW, run.arcs, map)) flags.teslaFired = true;
  }
  // POSSESSION (P7 T2): the Bison's two triggers — same
  // one-attempt-per-tick flags, real cooldowns, through
  // possessedArmorFire/possessedArmorMg.
  if (input.possess && input.possess.kind === "vehicle" && input.reticle) {
    const pv = world.byId.get(input.possess.id);
    if (pv) {
      // P7 T4: the APC's only gun is the coax — FIRE streams it (no
      // main gun to fire), and there is no separate MG trigger.
      if (input.fireHeld) { if (pv.vtype === "apc") possessedArmorMg(world, pv, input.reticle, T, map.invW); else possessedArmorFire(world, pv, input.reticle, T, map.invW); }
      if (input.mgHeld && pv.vtype !== "apc") possessedArmorMg(world, pv, input.reticle, T, map.invW);
    }
  }
  // THE MECH (mk1.92): five triggers, one attempt each per sim
  // tick — FIRE (held), MSL/BRG/PUNT/180 (one-shot want flags set
  // by the touch buttons/desktop keys below), each SIGHT-GATED at
  // the current aim point before the engine call (the possessed-
  // fire law — fieldReaches at the aim point mechAimDir solves).
  if (input.possess && input.possess.kind === "mech") {
    const pm = world.byId.get(input.possess.id);
    if (pm && pm.mechRef) {
      const mech = pm.mechRef;
      if (mechSighted(world, mech, T, map.invW)) {
        if (input.fireHeld) mechFire(world, mech);
        const w = input.mechWant;
        if (w && w.msl) mechMissiles(world, mech);
        if (w && w.brg) mechBarrage(world, mech);
        if (w && w.punt) mechPunt(world, mech);
        if (w && w.face) mechAboutFace(world, mech);
      }
      if (input.mechWant) { input.mechWant.msl = false; input.mechWant.brg = false; input.mechWant.punt = false; input.mechWant.face = false; }
    }
  }

  const evs = drainEvents(war, flags);
  // Structural loss census — ~1Hz (stepDepotCensus's own accumulator
  // gate, not this per-frame call site) — gated by sdt like the rest
  // of the sim clock, so it doesn't run while paused/pre-start/
  // post-game. Fraction is exposed on hud for the smoke test; there
  // is deliberately no health-bar UI — the building is the readout.
  if (!war.dev) stepDepotCensus(run, sdt, () => ({
    player: depotStandingFraction(war.census, world.byId),
    enemy: depotStandingFraction(war.census2, world.byId),
  }));
  // THE LIVING MARKET (mk1.13): its own 1Hz accumulator, sdt-gated
  // like the census above (a paused game freezes prices) — kept
  // separate from stepDepotCensus's accumulator (different
  // consumers) per the brief.
  run._marketAcc += sdt;
  if (run._marketAcc >= 1) {
    run._marketAcc -= 1;
    run._market = computePrices(marketCounts(world, run.squads, run.mines));
    run._minePrices = minePrices(run._market.counts, priced); // P7 T10: beside _market, same cadence
  }

  return { events: evs, flags };
}
