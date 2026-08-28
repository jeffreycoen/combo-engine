// COLDSNAP DEPOT — boot.js: bootWar (war-engine-extraction task 4, mk2.74).
// Builds the map, ground, grid, world, town, censuses, territory and the
// run bag — no renderer, no audio, no storage, no window reads. See
// api.js's War typedef and CLAUDE.md's standing orders for the contract.
import { makeField, makeWorld, addBody, mulberry32 } from "../engine/core.js";
import { buildMech } from "../engine/mech.js";
import { MECH, TOWER_SPECS } from "./specs.js";
import { makeMap, buildDepotTerrain, makeGrid, planTrees, computeFlowField } from "./mapgen.js";
import { buildTown, townFootprint, makeDepotAssaultState } from "./sim.js";
import { censusDepotChunks, makeManifestState, makeFoeState, BELL_PERIOD_S } from "./state.js";
import { restoreBodies, restoreWelds, restoreCensus, restoreSquads } from "./save.js";
import { makeTerritory, EMIT } from "./territory.js";
import { makeSight } from "./sight.js";
import { makeRegiment } from "./economy.js";
import { musterFreshStart } from "./muster.js";

// P7 T17 (owner): HULLS RESPECT FRIENDLY SANDBAGS — a bag claims its
// cell for HULL routing only (men still fight over bags; foot routing,
// the enemy flow, and connectivity never read c.bag). The side rides
// the body (bagSide) so a resumed war re-stamps honestly — b.team is 1
// on every bag by spawnSandbag's old shape and must not be trusted.
export function stampBag(grid, b, side) {
  b.bagSide = side;
  const cell = grid.cellAt(b.pos.x, b.pos.z);
  if (cell) { cell.bag = side; cell.bagId = b.id; }
}

// Emitter list, rebuilt fresh each territory step from live bodies:
// team-signed by kind -> EMIT weight (see territory.js). The depot's
// own emitter is its roof-peak flag body (kind "flag", team 1 — built
// in buildTown above; towers also carry flagPole=true for the
// renderer's pole overlay, so this checks kind, not the flag). Each
// depot's flag is its side's permanent anchor (FRONT F1) — team 2's
// flag at depot2 replaces the old spawn-point anchor emitters.
// territory.js is CANONICAL (u,v) space (the un-rotated map frame, same
// as the renderer's rim) — every body/spawn position here is rotated
// WORLD space, so every emitter goes through map.invW (DEPOT's
// world-to-canonical transform) before it's pushed.
export function buildEmitters(world, map) {
  const out = [];
  for (const b of world.bodies) {
    // Towers repel fog by HALF THEIR SIGHT (effRange/2, cached at
    // build off the true muzzle) instead of the flat EMIT.tower.r:
    // gun ~9.5, mortar ~13, rocket ~11.5, mg ~7.5 on flat ground,
    // scaled up on high ground. Frost has no fire range — its
    // spec.range IS its slow-field radius, so the same effRange/2
    // rule gives it slow-radius/2 (~6). EMIT.tower.r stays as the
    // fallback for any tower missing the cache.
    if (b.kind === "tower" && b.team === 1 && b.alive) { const c = map.invW(b.pos.x, b.pos.z); out.push({ x: c.u, z: c.v, w: EMIT.tower.w, r: (b.effRange != null ? b.effRange : TOWER_SPECS[b.towerType].range) / 2, sign: 1 }); }
    // ONE emitter per WALL, not per course (P1.5 T2): the bottom course
    // carries it, so three stacked bodies push the same green influence
    // one body used to.
    else if (b.kind === "wall" && b.team === 1 && b.alive && !b.course) { const c = map.invW(b.pos.x, b.pos.z); out.push({ x: c.u, z: c.v, w: EMIT.wall.w, r: EMIT.wall.r, sign: 1 }); }
    else if (b.kind === "wall" && b.team === 2 && b.alive && !b.course) { const c = map.invW(b.pos.x, b.pos.z); out.push({ x: c.u, z: c.v, w: EMIT.wall.w, r: EMIT.wall.r, sign: -1 }); }
    // FRONT F1: flags emit their OWN team's influence at homeland
    // strength — the enemy depot IS the enemy anchor now.
    // P7 T10 guard: a tripwire's flare is also kind "flag" (a temporary
    // sight-only eye, sight.js's eyeOf) — b._dieT != null marks it, and
    // it must NEVER emit territory (it lights sight, not ground).
    else if (b.kind === "flag" && b._dieT == null) { const c = map.invW(b.pos.x, b.pos.z); out.push({ x: c.u, z: c.v, w: EMIT.depot.w, r: EMIT.depot.r, sign: b.team === 2 ? -1 : 1 }); }
    else if (b.kind === "unit" && b.team === 1 && b.alive && !b.riding) { const c = map.invW(b.pos.x, b.pos.z); out.push({ x: c.u, z: c.v, w: EMIT.unit.w, r: EMIT.unit.r, sign: 1 }); }
    else if (b.kind === "chunk" && b.sandbag && b.alive) { const c = map.invW(b.pos.x, b.pos.z); out.push({ x: c.u, z: c.v, w: EMIT.wall.w, r: EMIT.wall.r, sign: b.bagSide === 2 ? -1 : 1 }); }
    else if (b.kind === "unit" && b.team === 2 && b.alive && !b.riding) { const c = map.invW(b.pos.x, b.pos.z); out.push({ x: c.u, z: c.v, w: EMIT.unit.w, r: EMIT.unit.r, sign: -1 }); }
    else if (b.kind === "vehicle" && b.team === 2 && b.alive) { const c = map.invW(b.pos.x, b.pos.z); out.push({ x: c.u, z: c.v, w: EMIT.vehicle.w, r: EMIT.vehicle.r, sign: -1 }); }
    else if (b.kind === "vehicle" && b.team === 1 && b.alive) { const c = map.invW(b.pos.x, b.pos.z); out.push({ x: c.u, z: c.v, w: EMIT.vehicle.w, r: EMIT.vehicle.r, sign: 1 }); }
    else if (b.kind === "mech" && b.alive) { const c = map.invW(b.pos.x, b.pos.z); out.push({ x: c.u, z: c.v, w: EMIT.vehicle.w, r: EMIT.vehicle.r, sign: b.team === 2 ? -1 : 1 }); }
  }
  // FRONT F1: the map.SPAWN_POINTS anchor emitters are gone — spawn points
  // are spawn locations only; the enemy's permanent red is its depot flag.
  return out;
}

/**
 * Boot one war. @param {Object} opts {seed, resume, dev}
 * @returns {War}
 */
export function bootWar(opts = {}) {
  // ------------------------------------------------------- THE BOOT ORDER
  // RES non-null means this mount is a RESUME (P1 Task 3) — the start
  // screen handed us a parsed save. The order below is the contract, and
  // it is the order the save was written against; nothing in the game
  // layer runs until every line of it has:
  //   1. makeMap(saved seed) — map.ORIENT, map.ROCKS, map.PONDS, map.TOWN, map.ROADS, SPAWNS
  //      all regrow from the seed (the map is never serialized)
  //   2. buildDepotTerrain, THEN the saved heightfield over the top —
  //      craters and breached ridges are what the war did to the terrain
  //   3. the grid off that terrain, then the world, reseeded + re-clocked
  //   4. bodies -> welds -> town bookkeeping -> censuses -> grid claims
  //   5. territory field, squads, run state
  //   6. flow field, renderer, smear replay
  // Only then does the frame loop start.
  const RES = opts.resume;
  const seed = opts.seed;
  const map = makeMap(seed);
  const field = makeField(181, 2.0, map.MAP_SEED);
  // mk2.07 (owner): THE DEEP FLOOR — the atomic crater needs room. Base
  // ground sits near +2; -12 leaves the full 10m pit plus overlap slack.
  field.carveFloor = -12; // provisional (F5)
  buildDepotTerrain(field, map.MAP_SEED);
  if (RES) {
    // The heightfield goes back OVER the freshly grown terrain — same
    // grid, so a straight copy. Craters, the depot mound's dents, the
    // hollow a breached ridge left: all of it lives here and nowhere else.
    const hs = RES.field.h;
    const n = Math.min(field.h.length, hs.length);
    for (let i = 0; i < n; i++) field.h[i] = hs[i];
    field.dirty = true;
  }
  const grid = makeGrid(field);
  const world = makeWorld({ field, seed: map.MAP_SEED });
  // P7 T17 (owner): HULLS RESPECT FRIENDLY SANDBAGS — a bag claims its
  // cell for HULL routing only (men still fight over bags; foot routing,
  // the enemy flow, and connectivity never read c.bag). The side rides
  // the body (bagSide) so a resumed war re-stamps honestly — b.team is 1
  // on every bag by spawnSandbag's old shape and must not be trusted.
  // Defined here (grid exists, ahead of both the resume and fresh-boot
  // branches below) rather than beside seedBags — the resume branch
  // stamps resumed bags before seedBags' fresh-boot-only block ever runs.
  if (RES) {
    // Law 2 (save.js): a fresh stream from the seed the save drew at the
    // bell. A return, not a replay. world.t comes back too — every stamp
    // in the file (spawn-done, corpse ages, card arm times, the wind) is
    // an absolute sim-clock reading and would be nonsense against 0.
    world.rng = mulberry32(RES.rng.seed);
    world.t = RES.world.t;
  }
  world._tdStruct = true;
  world.depotCombat = true; // Phase 0 combat hooks: glancing, armor, tree fire/shredding
  // The pair's survey vets (6.5 Task 6): thread the mode's pond test and
  // playable rim onto the world so squads.js's surveyHighGround /
  // bestStandPoint can reject ice and off-rim candidates without
  // importing mode-local map state. Pure functions of the static map —
  // twin worlds read identically (determinism-safe).
  world.pondAt = (x, z) => !!map.pondAt(x, z);
  world.inRim = (x, z) => { const c = map.invW(x, z); return Math.abs(c.u) <= map.RIM_HALF_U && Math.abs(c.v) <= map.RIM_HALF_V; };
  world.streamAt = (x, z) => map.streamAt(x, z);
  // P7.2 T7: THE REPAIR BOOKS — the mechanic's wrench asks here; each
  // side pays its own till, one scrap at a time. Game-layer money, so
  // squads.js's no-economy law holds (the module only invokes this).
  world._mech = { take: (team, n) => {
    if (team === 1) { if (run.resources < n) return false; run.resources -= n; return true; }
    if (!run.reg || run.reg.scrap < n) return false; run.reg.scrap -= n; return true;
  } };
  // P7 T2/T3/T4: THE STARTING ARMOR — a Bison AND an APC parked by
  // each depot, the enemy's ARMED AT POST (owner) — driving doctrine
  // still waits for its commander (Task 6). FAIL-PROOF (P7 T3): a
  // widened fixed ring (10-26m) first, then a brute nearest-clear-cell
  // sweep (8-30m) backstops it — a hemmed ring must never leave a side
  // tankless. AMENDMENT 1 (P7 T4, owner): armor parks STABLE — every
  // clear cell is also vetted for a flat footprint (stableAt), and the
  // hull spawns asleep (no creep, no slide, no jitter). The brute
  // sweep tracks the flattest clear cell it sees as its own backstop —
  // stability is preferred, never blocking. Deterministic; no rng
  // stream is touched.
  // P7 T9 (owner): HOISTED TO MOUNT SCOPE — apcSeqN/depotP/
  // depotE used to be boot-local (the `else` branch below, fresh boot
  // only). The hero tier's player buy and the enemy's draw-free
  // replacement both need to park a fresh hull long after boot, off
  // the SAME apcSeq counter — a replacement APC must never seat-collide
  // with a surviving one. Same closure over world/grid/field/map.TOWN, same
  // body, unchanged.
  const war = { seq: { apc: 0 } };
  const nextApcSeq = () => ++war.seq.apc;
  const depotP = map.TOWN.find((t) => t.depot && t.team !== 2), depotE = map.TOWN.find((t) => t.depot && t.team === 2);
  // town / censuses / rocks: laid fresh, or lifted back off the save.
  let town, depotCensus, depotCensus2, rocksLive, resBodies = null;
  if (RES) {
    // Step 4. Every body in the file goes back in saved order (ids are
    // reassigned, so everything that pointed at one points at an INDEX);
    // then the welds, by index pair, with their original joint anchors.
    resBodies = restoreBodies(world, RES, map.ROCKS);
    restoreWelds(world, RES, resBodies);
    // P7 T17: resumed bags re-claim their ground for hull routing.
    for (const b of resBodies) if (b.sandbag && b.alive) stampBag(grid, b, b.bagSide || 1);
    // THE MECH RESUMES STANDING (owner's save law: never raw physics) — rebuilt
    // at its spot and heading with its wounds, orders back on the hull.
    for (const ms of RES.mechs || []) {
      const m = buildMech(world, { x: ms.x, z: ms.z, yaw: ms.yaw, team: ms.tm, hp: ms.hp });
      m.thrustersOn = true; m.thrustAssist = true;
      m.hull.maxHp = MECH.hp;
      if (ms.ex) for (const k in ms.ex) m.hull[k] = ms.ex[k]; // A1: the orders bag, own key
    }
    // P7 T9 (owner): RESUME SEAT-COLLISION GUARD — the mount-scope
    // apcSeqN counter (hoisted above) must not hand out a seat number a
    // restored APC already carries, or a hero-tier replacement's riders
    // could stash onto the wrong hull. Seeded past the highest restored
    // seat; a war with no surviving APC leaves it at 0, exactly the
    // fresh-boot start.
    for (const b of resBodies) if (b.kind === "vehicle" && b.vtype === "apc" && b.apcSeq > war.seq.apc) war.seq.apc = b.apcSeq;
    // The town array is bookkeeping over bodies that are already back:
    // stones by b.town, n0 and ruined off the file, footprint cells
    // recomputed from the regrown map.TOWN layout. A ruined building has
    // already had its cells released (stepTown does that once) — restoring
    // it blocked would wall off ground the player can walk and build on.
    const stonesBy = new Map();
    for (const b of resBodies) if (b.kind === "chunk" && b.town) {
      const arr = stonesBy.get(b.town); if (arr) arr.push(b); else stonesBy.set(b.town, [b]);
    }
    town = map.TOWN.map((t) => {
      const saved = (RES.towns || []).find((s) => s.id === t.id) || {};
      const cells = townFootprint(grid, t, map);
      const ruined = !!saved.ruined;
      if (!ruined || t.form === "mound") for (const ci of cells) { const c = grid.cells[ci]; c.blocked = true; c.building = t.id; c.bTeam = t.team === 2 ? 2 : (t.depot ? 1 : 0); } // the mound's exception (owner, 2026-08-26)
      const stones = stonesBy.get(t.id) || [];
      return { id: t.id, cells, stones, n0: saved.n0 != null ? saved.n0 : stones.length, ruined, marker: !!t.marker, x: t.x, z: t.z };
    });
    // The censuses keep their ORIGINAL rows (including rows whose stone is
    // gone — see save.js's -1 rule) and their built-time homes. Re-taking
    // a census here would stamp displaced stone as "home" and forgive
    // every hit the depot has taken.
    depotCensus = restoreCensus(RES.census, resBodies);
    depotCensus2 = restoreCensus(RES.census2, resBodies);
    // The player's own structures re-claim their grid cells (buildAt does
    // this at build time; nothing else would).
    for (const b of resBodies) {
      if ((b.kind !== "wall" && b.kind !== "tower") || !b.alive) continue;
      // A wall's upper courses share the bottom course's cell (P1.5 T2) —
      // cell.wallId must come back pointing at the BOTTOM one, exactly as
      // buildAt set it, or a shot-off top course would release the ground
      // under a wall that is still standing.
      if (b.course > 0) continue;
      const g = grid.worldToGrid(b.pos.x, b.pos.z);
      if (!grid.inBounds(g.gx, g.gz)) continue;
      const c = grid.cells[grid.idx(g.gx, g.gz)];
      c.blocked = true; c.wallId = b.id; c.bTeam = b.team || 1;
    }
    // Rocks: the live set is whatever rock bodies came back. A ridge that
    // was breached during the run has no body in the file, so its cells
    // must be released here exactly as breachRock released them — the
    // saved heightfield already carries the hole it left.
    rocksLive = resBodies.filter((b) => b.kind === "rock" && b.alive && b.rockRef).map((b) => b.rockRef);
    for (const k of map.ROCKS) {
      if (rocksLive.indexOf(k) >= 0) continue;
      for (let gz = 0; gz < map.GRID_H; gz++) for (let gx = 0; gx < map.GRID_W; gx++) {
        const wp = grid.gridToWorld(gx, gz);
        if (Math.hypot(wp.x - k.x, wp.z - k.z) < k.r * 0.78 + 0.9) {
          const c = grid.cells[grid.idx(gx, gz)];
          if (c.terrain) { c.blocked = false; c.terrain = false; }
        }
      }
    }
  } else {
    town = buildTown(world, grid, field, map);
    // Structural loss (Task 5): the depot's own chunk lattice IS its health
    // bar — census taken once here (ids + home world positions), read back
    // at ~1Hz via stepDepotCensus below against world.byId (live pos/alive).
    depotCensus = censusDepotChunks(world.bodies);
    // FRONT F1: the enemy depot's own census — same snapshot moment, read
    // back through the same 1Hz gate (no second timer).
    depotCensus2 = censusDepotChunks(world.bodies, "depot2");
    rocksLive = map.ROCKS.slice();
  }
  // Territory (Phase 4 Task 2): who holds the ground. Cells over the
  // same playable rim the renderer clips to (halfU 60 / halfV 60, see
  // makeRenderer's rim opt above) — reuse rather than reinvent extents.
  const T = makeTerritory(map.RIM_HALF_U, map.RIM_HALF_V);
  if (RES && RES.terr && RES.terr.v && RES.terr.v.length === T.v.length) T.v.set(RES.terr.v);
  // VISION (mk0.72): who can SEE what, on the territory grid's own frame
  // and carried on the territory object — so every function already
  // handed T gets sight for free. Purely derived: nothing saves it, and a
  // resumed run rebuilds it on the first territory tick below.
  T.sight = makeSight(T);
  // town buildings' (x, z) are rotated WORLD space (same as any body);
  // territory reads canonical (u, v) — precompute once (buildings don't
  // move) rather than re-converting every stall.
  const townUV = town.map((b) => { const c = map.invW(b.x, b.z); return { id: b.id, x: c.u, z: c.v, marker: b.marker, get ruined() { return b.ruined; } }; });
  // mk2.50: map.TOWN FLAGS — per-building lookup for the holder-flag rows:
  // roof height and the two exclusions (depots fly their real flag
  // bodies; field walls are screens, not buildings).
  const townFlagMeta = new Map(map.TOWN.map((t) => [t.id, { ny: t.ny, depot: !!t.depot, fwall: t.id.startsWith("fwall"), marker: !!t.marker }]));
  // Rocks and trees are BODIES, and bodies come off the save — a burnt
  // treeline and a breached ridge are things the war did, not things the
  // seed says. On a resume both blocks are skipped entirely; the fresh
  // path below is untouched.
  const treeAt = (tx, tz) => {
    const ty = field.heightAt(tx, tz);
    const u = addBody(world, { kind: "tree", team: 0, mass: 260, hx: 0.28, hy: 1.6, hz: 0.28, x: tx, y: ty + 1.62, z: tz, hp: 70, friction: 0.5 });
    u.sleeping = true;
    return u;
  };
  if (!RES) {
    for (const k of map.ROCKS) {
      const b = addBody(world, { kind: "rock", team: 0, mass: 0, hx: k.r * 0.55, hy: k.h * 0.8, hz: k.r * 0.55, x: k.x, y: field.heightAt(k.x, k.z) - k.h * 0.2, z: k.z, hp: 90 + k.r * 20 }); // mk2.14 (owner): one atomic blast breaks a near rock // provisional (F5)
      b.maxHp = b.hp; b.rockRef = k;
      b.seatY = b.pos.y - field.heightAt(k.x, k.z); // mk2.14: the crater re-seat drops a surviving rock to the carved ground, not half-height up
    }
    // T5: the whole tree plan, planted (planTrees carries the treeline,
    // the hill copses, the drawn copses and the forests — one function,
    // shared with the test suite).
    for (const p of planTrees()) treeAt(p.x, p.z);
    // P1.5 T4 (mk0.60) — THE DEPOT COMES WITH COVER. Four to six sandbags
    // ringed on each depot at map-build time, so a fresh front opens with
    // something to lie behind instead of bare ground. P7 T3 (owner):
    // generalized to both depots — the enemy's was never dressed before,
    // symmetry now — same rules, its own derived stream.
    //
    // Drawn off a DEDICATED map-seed stream (the same mulberry32(map.MAP_SEED ^
    // k) pattern the treeline above uses) and never world.rng: the world
    // stream's draw counts are a determinism contract and this feature must
    // not appear in them at all. Draw count is fixed at 1 + 2 per bag
    // whatever the vetting rejects, so the stream is stable too.
    //
    // Vetting is clearSlot's rule (squads.js's own static-solid test, at a
    // bag's own half-extent plus a man's clearance) plus the grid's verdict
    // — a blocked cell is the depot footprint or a rock, ice is water — plus
    // road and objective clearance. Each bag gets a fan of candidates around
    // its drawn spot (four radii out, then the same four either side of the
    // azimuth) because the depot's own approach road and mound reject a lot
    // of the ring; a bag that clears none of the twelve is simply dropped.
    // Ring radius grown to 7.8m (P7 T3) — the depots got bigger.
    // P7.1 T6 (owner): THE BARE OPENING — the seeded bag rings and the
    // free starting armor die here. seedBags/parkArmor stay exported
    // (parkArmor still parks the enemy's
    // draw-free replacement; seedBags' export survives for Task 7).
  }
  const objG = grid.worldToGrid(map.OBJ_POS.x, map.OBJ_POS.z);
  computeFlowField(grid, objG.gx, objG.gz);
  // T3 SPLIT (war-engine-extraction): the sim's run state, exactly the
  // fields save.js touches plus the unsaved sim-side fields the tick
  // reads and writes.
  const run = {
    score: { p: { kills: 0, value: 0 }, e: { kills: 0, value: 0 } }, resources: 250, // the draft's richer opening (owner) // provisional (F5)
    cmdr: null, // P7 T8: the drawn armor doctrine — one boot draw (fresh war), restored on RESUME
    ws: makeDepotAssaultState(), spawnRR: 0,
    arcs: [], // mk2.20: live tesla chains — THE game state's row (state.js makeRunState serves fixtures only; Amendment 5)
    holdArea: { 1: false, 2: false }, // mk2.18 (owner): area weapons hold fire with a friendly in the spread
    mode: null,
    started: false, gameOver: false, victory: false,
    // The clock (P1 Task 1): bellAt is the absolute SIM-clock stamp the
    // next bell is due at, bellT the readout stepBell derives from it.
    bell: 0, bellT: BELL_PERIOD_S, bellAt: BELL_PERIOD_S, lastDispatch: null,
    // The two ladders (P1 Task 2). manifest holds what the player has
    // unlocked (START only, at mount) plus this bell's live offer; foe
    // holds the attacker's own picks, which feed the assault's tier cap.
    // Both start EMPTY of any card: a fresh mount is bell 0, nothing rung,
    // nothing on screen.
    manifest: makeManifestState(), foe: makeFoeState(),
    intelUp: false, intelArmedAt: 0,
    // Opens on the depot, not the middle of the field. map.TOWN[i].x/z for
    // the depot entry ({id:"depot", x:0, z:52, ...} in genMap) are
    // already WORLD-space — genMap's T() helper runs every town entry
    // through map.fwdU before storing it — so this is exactly the same
    // point map.fwdU(0, 52) would give under the map's live map.ORIENT; reading
    // it off map.TOWN directly (rather than re-deriving via map.fwdU(0, 52))
    // can't drift out of sync with wherever genMap actually placed it.
    focus: (() => {
      const depotT = map.TOWN.find((t) => t.depot);
      const w = depotT ? { x: depotT.x, z: depotT.z } : map.fwdU(0, 52);
      return { x: w.x, y: field.heightAt(w.x, w.z), z: w.z };
    })(),
    zoom: 1,
    // Squads (Phase 5 Task 3): live squad rosters.
    squads: [], foeSquads: [], nextSquadId: 1,
    // P7 T10: MINES AND TRIPWIRES — watched points, never bodies.
    // { x, z, team, kind: "mine"|"wire", live }. Saved verbatim (save.js).
    mines: [],
    // mk2.09: THE GREEN FOG — the atomic blast's poison patches.
    // Watched points, saved like mines. { x, z, r, until (sim clock) }.
    fog: [],
    // THE LIVING MARKET (mk1.13): the price cache, its own 1Hz
    // accumulator (beside the census's), and the once-a-second purchase
    // stamp. Transient run state, never serialized — a resumed run
    // rebuilds both within a second (no save.js edits).
    _market: null, _marketAcc: 0, _buyAt: -9,
    // mk2.49: THE GROUND PAYS — income rates per second, ground-scaled
    // (groundRate over the territory field's held-cell counts). Derived
    // on the territory tick, never saved; 1 (the floor) until the first
    // tick, which is also every fresh boot's true opening rate.
    _groundRate1: 1, _groundRate2: 1,
    _minePrices: null, // P7 T10: computed beside _market, same 1Hz cadence
    // P6 T10 / Task 5 Amendment 1 (mk1.19): the idle gate — true once
    // the war goes hot (stashed by the hud census pass); starts false.
    _hot: false,
    // The attacker's economy — seeded off the run's own rng stream, not
    // an unseeded generator, so ?seed= replays reproduce the same
    // regiment. Mutated in place by planWave (buy-time depletion — the
    // only depletion path; a fielded unit's cost is spent at muster
    // and never returns, dead or alive) and payResults; never replaced.
    // On a RESUME the saved regiment is the regiment — makeRegiment is not
    // called at all, so the resumed run doesn't spend two draws re-rolling
    // a formation it already has.
    reg: RES ? { ...RES.run.reg } : makeRegiment(world.rng),
  };
  if (!RES && !opts.dev) {
    musterFreshStart(world, run, depotP, grid, field, nextApcSeq, map);
  }
  // Step 5. The run state itself, straight off the file. The bell is the
  // ONE deliberate exception: the countdown restarts at a full period
  // rather than resuming a half-elapsed one (ratified — simpler, and
  // kinder than dropping the player into a bell that rings in nine
  // seconds). Everything else — scrap, kills, the unlocked set, the
  // convoy's live offer, the enemy's pick list, the mustered assault's
  // spawn queue — is exactly what it was.
  if (RES) {
    const r = RES.run;
    run.resources = r.resources; run.spawnRR = r.spawnRR;
    run.score = r.score
      ? { p: { kills: r.score.pk, value: r.score.pv }, e: { kills: r.score.ek, value: r.score.ev } }
      : { p: { kills: 0, value: 0 }, e: { kills: 0, value: 0 } };
    run.started = !!r.started; run.mode = r.mode; run.sandbagOrient = r.sandbagOrient || 0;
    run.zoom = r.zoom;
    run.focus = { x: r.focus.x, y: field.heightAt(r.focus.x, r.focus.z), z: r.focus.z };
    run.bell = r.bell;
    run.bellAt = world.t + BELL_PERIOD_S; run.bellT = BELL_PERIOD_S;
    run.depotCensusAcc = r.depotCensusAcc;
    run.depotStanding = r.depotStanding; run.enemyStanding = r.enemyStanding;
    run.starvedStreak = r.starvedStreak;
    run._reportedBreak = r.reportedBreak; run._reportedSpent = r.reportedSpent;
    run.cmdr = r.cmdr || "cautious"; // P7 T8: restored, never redrawn on resume
    run.manifest = r.manifest; run.manifest.armedAtWall = 0; run.foe = r.foe;
    run.intelUp = r.intelUp; run.intelArmedAt = r.intelArmedAt;
    run.lastDispatch = r.lastDispatch;
    run.pendingPlan = r.pendingPlan; run.intelPlan = r.intelPlan;
    run.ws = r.ws;
    run.squads = restoreSquads(RES, resBodies);
    run.foeSquads = RES.foeSquads ? restoreSquads({ squads: RES.foeSquads }, resBodies) : [];
    run.nextSquadId = r.nextSquadId;
    // P7 T10: watched points restore verbatim, live flags included.
    run.mines = (r.mines || []).map((m) => ({ x: m.x, z: m.z, team: m.t, kind: m.k, live: !!m.l }));
    run.fog = (r.fog || []).map((p) => ({ x: p.x, z: p.z, r: p.r, until: p.u }));
    run.arcs = (r.arcs || []).map((a) => ({ nextAt: a.n, hits: a.h, dmg: a.d, fx: a.x, fy: a.y, fz: a.z, atk: a.k, tid: a.t, hitIds: (a.ids || []).slice(), waters: [], gx: a.gx, gy: a.gy, gz: a.gz }));
    run.holdArea = r.holdArea || { 1: false, 2: false };
  }
  war.map = map; war.field = field; war.grid = grid; war.world = world; war.T = T;
  war.town = town; war.census = depotCensus; war.census2 = depotCensus2; war.run = run;
  war.clock = { terrAcc: 0, _structHp: new Map() };
  war.rocksLive = rocksLive;
  war.dev = !!opts.dev;
  return war;
}
