// COLDSNAP DEPOT — squads.js: squad brains. Pure functions over world +
// squad state. Members are ordinary "unit" bodies (team param) so territory
// emitters/fog/combat see them for free — this module drives their goal
// points; the existing units.js march machinery (cell.dx/dz -> velocity,
// faceTravel) isn't reachable here (it's flow-field driven, private to
// units.js, and geared to team-2 grid marching). Instead each member gets a
// simple seek-to-point driver (steer velocity toward u.goal, same shape as
// units.js's own fallback "lost" march at the bottom of stepUnits) — cheap,
// deterministic, and independent of any flow grid so squads can path off it
// entirely (cover hops, formation slots) rather than only ever following the
// enemy flow field.
//
// No unseeded randomness anywhere in this module. The ONLY rng draw is in
// stepSquad's attack leg-pause dwell time (documented at the call site) —
// exactly one draw per attack leg, per the brief.

// ---------------------------------------------------------- THE PRICE RAISE
// P1.5 Task 1 (mk0.50, Jeff): every PLAYER price rises ~50%, rounded to
// integers — squads here, TOWER_SPECS in specs.js, WALL_COST and SANDBAG_COST
// in state.js. Scrap income did not move, so a bell buys about two thirds of
// what it used to.
//
// THE KNOWING ASYMMETRY, written down rather than tuned around: the enemy's
// internal buying prices (ENEMY_SPECS.bounty, TANK.bounty) and its stipend are
// DELIBERATELY NOT RAISED with these. For this interim the two sides no longer
// pay the same for the same thing — the enemy's regiment fields more per scrap
// than the player does. That breaks the standing cost-symmetry law on purpose
// and temporarily; the mercenary market is the feature that repairs it (both
// sides will buy off one priced market). Two live consequences to expect in
// play: the enemy assault feels richer than it did at mk0.43, and the sniper
// pair's price (68) no longer equals ENEMY_SPECS.sniper.bounty (45), which
// used to be a mirror. Neither is a bug — this comment is the record.
export const SQUAD_SPECS = {           // costs are scrap; members spawn as unit bodies (team param)
  // The pair (sightlines 6.5 Task 6): a sniper squad is TWO men — sniper +
  // spotter. Was 45 (30 sniper + half a rifles squad for the spotter), and the
  // mirror of the enemy marksman's 45 bounty; 68 breaks that mirror per the
  // asymmetry note above. // provisional (F5)
  sniper: { n: 2, cost: 68, label: "SNIPERS" },
  rifles: { n: 4, cost: 30, label: "RIFLE SQUAD" },  // provisional (F5)
  mg:     { n: 2, cost: 38, label: "GUNNERS" },      // provisional (F5)
  // FRONT F1 (Task 4.5): the demolition team — the exact mirror of the
  // enemy's satchel sapper. Tools, not shooters: no rifle (squadFire skips
  // the type), one charge per man, the charge consumes the planter.
  sappers: { n: 2, cost: 38, label: "SAPPER TEAM" }, // provisional (F5)
  // F1.5 Task 1: the mortar team — two men and a tube, the player mirror of
  // the enemy grenadier's lob (INFANTRY_ARMS.mortars).
  mortars: { n: 2, cost: 45, label: "MORTAR TEAM" }, // provisional (F5)
  // P1.5 Task 4 (mk0.60): THE ENGINEER TEAM. Two men with shovels. Like the
  // sappers they are tools, not shooters — squadFire skips the type, and
  // INFANTRY_ARMS has no `engineers` row to give them, so they carry no
  // weapon at any level of the stack. What they do instead is the two-point
  // BUILD order (DepotGame.jsx): walk a line and lay bags or walls along it.
  // Every match starts with a team (PLAYER_START, specs.js). // provisional (F5)
  engineers: { n: 2, cost: 30, label: "ENGINEER TEAM" },
  rockets: { n: 2, cost: 45, label: "ROCKET TEAM" },        // mk2.02 (owner): rocket troops replace runners // provisional (F5)
  grenadiers: { n: 2, cost: 40, label: "GRENADIER SQUAD" }, // mk2.03 (owner): a pair // provisional (F5)
  // P7.2 T6 (owner): THE MEDIC TEAM — two medics with a bag; they walk to
  // the wounded and kneel to treat. Tools, not shooters: no INFANTRY_ARMS
  // row, so squadFire skips them by membership. // provisional (F5)
  medics: { n: 2, cost: 55, label: "MEDIC TEAM" },
  // FROSTLINE FL-9 (owner): THE HUNTER — one armored man, twin sidearms,
  // the jetpack line. Additive row: no depot code names it. // provisional (F5)
  hunter: { n: 1, cost: 120, speed: 3.6, label: "THE HUNTER" },
  // P7.2 T7 (owner): THE MECHANIC TEAM — two mechanics with a toolbox. Tools,
  // not shooters: no INFANTRY_ARMS row, so squadFire skips them by
  // membership. // provisional (F5)
  mechanics: { n: 2, cost: 55, label: "MECHANIC TEAM" },
  // mk2.08 (owner): THE DAVY CROCKETT — two men and the atomic tube. Tools,
  // not shooters: no INFANTRY_ARMS row, so squadFire skips them; the one
  // shot lives in state.js's stepDavyShot. The slowest crew on the map.
  davy: { n: 2, cost: 450, speed: 2.0, label: "DAVY CROCKETT" }, // provisional (F5)
};

// THE PER-TYPE SPEED (P7 T7): a squad's march speed off its own SQUAD_SPECS
// row, falling back to the flat MOVE_SPEED for every type that carries no
// `speed` field — every existing squad type resolves to exactly 3.2,
// byte-identical to today.
export const squadSpeed = (type) => (SQUAD_SPECS[type] && SQUAD_SPECS[type].speed) || MOVE_SPEED;

// Task 6 (the pair): squads.js now imports arcClears/effRange/INFANTRY_ARMS
// for the sniper stand-point scorer — a module cycle with state.js/accuracy.js
// of the same SAFE shape those two already share (documented at the top of
// accuracy.js): no side calls the other's export at module top level, only
// from inside function bodies invoked long after evaluation.
import { arcClears } from "./accuracy.js";
import { effRange, hostileStructure, standingStructure, hitOrigin } from "./state.js";
import { INFANTRY_ARMS, SATCHEL, SAPPER_PLANT_PAD, MAN } from "./specs.js";
// FRONT F1 (Task 4.5): the player sapper's satchel — same core explode/
// applyDamage the enemy sapper uses (units.js stepSapper), sign-flipped.
import { applyDamage, explode } from "../engine/core.js";

export function makeSquad(id, type, team, x, z) {
  // _surveyPending: the pair's placement/re-anchor survey trigger — set here
  // (placement), on attack arrival (below), and by the DEFEND chip
  // (DepotGame.jsx). Consumed once by the defend branch; harmless on
  // rifles/mg squads (directPair only runs for type "sniper").
  return { id, type, team, order: "defend", dest: null, memberIds: [], anchor: { x, z }, _surveyPending: true };
}

// ------------------------------------------------------------- exposure
// Same static-solid kind filter accuracy.js's SOLID_KINDS uses (rock/wall/
// tower/tree/chunk) — sandbags in this codebase are chunk-kind masonry (no
// separate "sandbag" body kind exists), so they fall out of "chunk" for
// free.
const SOLID_KINDS = new Set(["rock", "wall", "tower", "tree", "chunk"]);
const COVER_RADIUS = 2.2;      // m — solid must be within this of the man to count
const COVER_HALF_ARC = Math.PI / 3; // 60 degrees either side of threatBearing

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return Math.abs(d);
}

// exposure: 0 (fully covered) .. 1 (open ground). Samples nearby static
// solids (rock/wall/tower/chunk/tree, incl. sandbags) within 2.2m in the
// threat direction; a solid between the man and the threat bearing reduces
// exposure. threatBearing is the world-space direction (radians, atan2(dx,
// dz) convention — matches faceTravel/units.js) FROM the man TOWARD the
// threat; cover only counts when it sits between the man and that bearing
// (i.e. the solid's bearing FROM the man is within +-60 degrees of
// threatBearing, so it's actually interposed, not off to the side or behind
// him).
export function exposureAt(world, x, z, threatBearing) {
  let bestCoverWeight = 0;
  const pool = world._L ? world._L.statics : world.bodies;  // T10
  for (const b of pool) {
    if (!b.alive || b.invM > 0) continue; // static solids only (invM>0 = dynamic)
    if (!SOLID_KINDS.has(b.kind)) continue;
    const dx = b.pos.x - x, dz = b.pos.z - z;
    const dist = Math.hypot(dx, dz);
    if (dist > COVER_RADIUS || dist < 1e-6) continue;
    const bearing = Math.atan2(dx, dz); // solid's bearing FROM the man
    const off = angleDiff(bearing, threatBearing);
    if (off > COVER_HALF_ARC) continue; // not between man and threat
    // closer + more centered on the threat bearing = stronger cover. Being
    // interposed at all does most of the work (arcW); distance inside the
    // 2.2m radius is a mild secondary bonus, not the dominant term — a man
    // tucked right up against a wall and one 1.5m off it should both read
    // as solidly covered, not "half exposed" just for standing a step back.
    const distW = 1 - dist / COVER_RADIUS;
    const arcW = 1 - off / COVER_HALF_ARC;
    const weight = arcW * (0.7 + 0.3 * distW);
    if (weight > bestCoverWeight) bestCoverWeight = weight;
  }
  return 1 - Math.min(1, bestCoverWeight);
}

// -------------------------------------------------------------- coverHop
// Next advance waypoint toward dest — the lowest-exposure cell within hop
// radius (6m) that strictly reduces distance-to-dest. Grid-sample 12
// candidates on a ring at HOP_R, biased toward dest (only candidates within
// +-90 degrees of the dest bearing are considered, since anything wider
// can't reduce distance-to-dest at this radius); falls back to a direct
// step toward dest when nothing qualifies. Deterministic, no rng.
const HOP_R = 6, HOP_CANDIDATES = 12;
export function coverHop(world, from, dest, threatBearing) {
  const ddx = dest.x - from.x, ddz = dest.z - from.z;
  const d0 = Math.hypot(ddx, ddz);
  if (d0 < 1e-6) return { x: from.x, z: from.z };
  const destBearing = Math.atan2(ddx, ddz);
  let best = null, bestExposure = Infinity;
  for (let i = 0; i < HOP_CANDIDATES; i++) {
    const az = (i / HOP_CANDIDATES) * Math.PI * 2;
    const cx = from.x + Math.sin(az) * HOP_R, cz = from.z + Math.cos(az) * HOP_R;
    const dNew = Math.hypot(dest.x - cx, dest.z - cz);
    if (dNew >= d0) continue; // must strictly reduce distance-to-dest
    if (angleDiff(az, destBearing) > Math.PI / 2) continue; // pointing away, skip
    const exp = exposureAt(world, cx, cz, threatBearing);
    if (exp < bestExposure - 1e-9 || (Math.abs(exp - bestExposure) <= 1e-9 && best && dNew < Math.hypot(dest.x - best.x, dest.z - best.z))) {
      bestExposure = exp; best = { x: cx, z: cz };
    }
  }
  if (best) return best;
  // fallback: direct step toward dest, capped at HOP_R
  const step = Math.min(HOP_R, d0);
  return { x: from.x + (ddx / d0) * step, z: from.z + (ddz / d0) * step };
}

// ----------------------------------------------------- slot-goal clearance
// A slot goal inside (or grazing) a static solid gets the member
// depenetration-ejected by the engine and killed by the slam path (dv > 8) —
// Task 3's documented masonry-slam hazard. Every slot goal this module hands
// out (defend formation ring, low-exposure micro-slots, attack formation
// slots) is therefore vetted against the same static-solid set exposureAt
// scans (solidBlocksPoint's pattern, XZ-expanded AABB): a candidate within
// clear = member hx + SLOT_CLEAR_PAD of a solid's footprint is rejected, and
// clearSlot falls back to the NEAREST clear candidate on a fixed ring sweep
// (deterministic — no rng, radii then azimuths in fixed order).
// P7 T12: live vehicle hulls are vetted too (their own loop below — the
// static pool can't carry a dynamic body), so no spawn or slot ever lands
// a man inside parked or moving armor.
const SLOT_CLEAR_PAD = 0.35;
function slotBlocked(world, x, z, clear) {
  if (world.inRim && !world.inRim(x, z)) return true; // P7 T13: off the map is never a slot (bare fixtures carry no inRim and skip)
  if (world.streamAt && world.streamAt(x, z)) return true; // T3: open water is never a slot
  const pool = world._L ? world._L.statics : world.bodies;  // T10
  for (const b of pool) {
    if (!b.alive || b.invM > 0) continue; // static solids only
    if (!SOLID_KINDS.has(b.kind)) continue;
    if (Math.abs(x - b.pos.x) <= b.hx + clear && Math.abs(z - b.pos.z) <= b.hz + clear) return true;
  }
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
  // P7 T12: THE HULL IS GROUND TOO — a live vehicle blocks a slot exactly as
  // masonry does (same box + clearance test). The static pool above can never
  // carry one (a hull is dynamic, and the invM guard skips it), so hulls ride
  // their own small pool. This is the fielded-start fix: every spawn, slot,
  // and steer-around site inherits it through this one law.
  const vpool = world._L ? world._L.vehicles : world.bodies;
  for (const b of vpool) {
    if (!b.alive || (b.kind !== "vehicle" && b.kind !== "mech")) continue;
    if (Math.abs(x - b.pos.x) <= b.hx + clear && Math.abs(z - b.pos.z) <= b.hz + clear) return true;
  }
  return false;
}
export function clearSlot(world, x, z, clear) {
  if (!slotBlocked(world, x, z, clear)) return { x, z };
  for (let r = 0.6; r <= 4.81; r += 0.6) {
    for (let k = 0; k < 16; k++) {
      const az = (k / 16) * Math.PI * 2;
      const cx = x + Math.sin(az) * r, cz = z + Math.cos(az) * r;
      if (!slotBlocked(world, cx, cz, clear)) return { x: cx, z: cz };
    }
  }
  return { x, z }; // no clear ground within 4.8m — keep the slot (never observed on real maps)
}
const memberClear = (u) => (u.hx || 0.3) + SLOT_CLEAR_PAD;
export const slotBlockedPublic = (world, x, z, clear) => slotBlocked(world, x, z, clear);

// mk1.96: THE ROOM MASK — the zone's live-room truth at O(bodies + cells),
// never bodies x cells. One pass over the same two pools slotBlocked reads,
// each solid's clearance-inflated box rasterized onto the movement grid; a
// cell is roomed out when its CENTER lies inside any inflated footprint —
// slotBlocked's own box test, verbatim, minus the rim and water lines a
// bare fixture skips anyway (the zone's caller masks those separately).
export function roomMaskPublic(world, grid, clear) {
  const m = new Uint8Array(grid.w * grid.h);
  const stamp = (b) => {
    const ex = b.hx + clear, ez = b.hz + clear;
    const a = grid.worldToGrid(b.pos.x - ex, b.pos.z - ez);
    const b2 = grid.worldToGrid(b.pos.x + ex, b.pos.z + ez);
    const gx0 = Math.max(0, Math.min(a.gx, b2.gx)), gx1 = Math.min(grid.w - 1, Math.max(a.gx, b2.gx));
    const gz0 = Math.max(0, Math.min(a.gz, b2.gz)), gz1 = Math.min(grid.h - 1, Math.max(a.gz, b2.gz));
    for (let gz = gz0; gz <= gz1; gz++) for (let gx = gx0; gx <= gx1; gx++) {
      const wp = grid.gridToWorld(gx, gz);
      if (Math.abs(wp.x - b.pos.x) <= ex && Math.abs(wp.z - b.pos.z) <= ez) m[gz * grid.w + gx] = 1;
    }
  };
  const pool = world._L ? world._L.statics : world.bodies;
  for (const b of pool) { if (b.alive && !(b.invM > 0) && SOLID_KINDS.has(b.kind)) stamp(b); }
  const vpool = world._L ? world._L.vehicles : world.bodies;
  for (const b of vpool) { if (b.alive && (b.kind === "vehicle" || b.kind === "mech")) stamp(b); }
  return m;
}

// ------------------------------------------------------- the reaction (P7.2 T5)
// Fire from a shooter this man cannot answer still moves him: on a fresh
// hit with a known origin (state.js hitOrigin), evaluate the current spot
// plus 4 lateral offsets perpendicular to the origin bearing (units.js
// coverHaltUpdate's own shape) and return the lowest-exposure CLEAR
// candidate — or null when the ground he holds is already best. Roled men
// (sniper/spotter) never shift — the pair holds its chosen ground, both
// sides. At most one evaluation per REACT_CD_S, keyed on lastHit identity
// through the SAME _coverHit/_coverT fields coverHaltUpdate owns — one
// cadence, whichever mechanism consumes the hit first. Deterministic,
// zero rng. All dials provisional (F5).
export const REACT_OFFSETS = [1.5, -1.5, 3, -3]; // provisional (F5)
export const REACT_CD_S = 2;                     // provisional (F5)
export function reactShift(world, u) {
  if (u.role === "sniper" || u.role === "spotter") return null; // the PAIR alone — mg gunner/loader are render-only roles and react like any man (Amendment 1)
  if (!u.lastHit || u.lastHit === u._coverHit) return null;
  if (world.t - (u._coverT != null ? u._coverT : -1e9) < REACT_CD_S) return null;
  const o = hitOrigin(world, u.lastHit);
  if (!o) return null;
  u._coverHit = u.lastHit;
  u._coverT = world.t;
  const bearing = Math.atan2(o.x - u.pos.x, o.z - u.pos.z);
  const px = Math.cos(bearing), pz = -Math.sin(bearing);
  let best = null, bestExp = exposureAt(world, u.pos.x, u.pos.z, bearing);
  for (const off of REACT_OFFSETS) {
    const cx = u.pos.x + px * off, cz = u.pos.z + pz * off;
    if (slotBlocked(world, cx, cz, memberClear(u))) continue;
    const e = exposureAt(world, cx, cz, bearing);
    if (e < bestExp - 1e-9) { bestExp = e; best = { x: cx, z: cz }; }
  }
  return best;
}

// ------------------------------------------------- the pair (6.5 Task 6)
// surveyHighGround: the spotter's survey — deterministic, draw-free, run on
// placement and DEFEND re-anchor ONLY (never mid-fight, never per frame).
// The field is bilinear over its control points, so the true maximum in the
// disc lies at a control point or on the rim: evaluate every control point
// inside SPOT_R plus 16 fixed rim azimuths; REJECT candidates inside solids
// (slotBlocked), on pond ice (world.pondAt, threaded by the mode; absent in
// bare fixtures -> skipped), or off the playable rim (world.inRim, same
// threading); RANK by height, cover breaking near-ties within SPOT_TIE_M
// (lowest exposureAt toward the threat bearing), remaining ties -> nearest
// anchor, then fixed scan order (first strict winner keeps the slot).
export const SPOT_R = 5, SPOT_TIE_M = 0.3;
export function surveyHighGround(world, cx, cz, threatBearing, clear) {
  const F = world.field, cands = [];
  const i0 = Math.floor((cx - SPOT_R + F.half) / F.cs), i1 = Math.ceil((cx + SPOT_R + F.half) / F.cs);
  const j0 = Math.floor((cz - SPOT_R + F.half) / F.cs), j1 = Math.ceil((cz + SPOT_R + F.half) / F.cs);
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {   // control points in the disc
    const x = i * F.cs - F.half, z = j * F.cs - F.half;
    if (Math.hypot(x - cx, z - cz) > SPOT_R) continue;
    cands.push({ x, z });
  }
  for (let k = 0; k < 16; k++) {                                    // rim
    const a = (k / 16) * Math.PI * 2;
    cands.push({ x: cx + Math.sin(a) * SPOT_R, z: cz + Math.cos(a) * SPOT_R });
  }
  let best = null;
  for (const c of cands) {
    if (slotBlocked(world, c.x, c.z, clear)) continue;              // solids
    if (world.pondAt && world.pondAt(c.x, c.z)) continue;           // ice — the mode's pond test
    if (world.inRim && !world.inRim(c.x, c.z)) continue;            // playable rim
    const h = F.heightAt(c.x, c.z);
    const e = exposureAt(world, c.x, c.z, threatBearing);
    const d = Math.hypot(c.x - cx, c.z - cz);
    if (!best) { best = { x: c.x, z: c.z, h, e, d }; continue; }
    const dh = h - best.h;
    if (dh > SPOT_TIE_M) best = { x: c.x, z: c.z, h, e, d };
    else if (dh > -SPOT_TIE_M) {                                    // near-tie band: cover, then distance
      if (e < best.e - 1e-9 || (Math.abs(e - best.e) <= 1e-9 && d < best.d - 1e-9)) best = { x: c.x, z: c.z, h, e, d };
    }
  }
  return best;                                                       // null only if everything blocked
}

// standScore: count of clear test rays from a candidate sniper stand point —
// muzzle at ground + 1.24 (the 0.74 seat + 0.5 head muzzle squadFire uses),
// 12 fixed azimuths biased to the threat bearing (a ±120° fan), each ray
// asked at the spec's elevation-scaled effRange via the shared flight tracer
// (arcClears -> marchArc). Deterministic, draw-free, placement-time only.
const STAND_RAYS = 12, STAND_FAN = (Math.PI * 4) / 3, STAND_TGT_H = 1.2;
export function standScore(world, x, z, threatBearing, selfId) {
  const spec = INFANTRY_ARMS.sniper;
  const muzzle = { x, y: world.field.heightAt(x, z) + 1.24, z };
  const eR = effRange(world, muzzle, spec);
  let score = 0;
  for (let k = 0; k < STAND_RAYS; k++) {
    const az = threatBearing + ((k - (STAND_RAYS - 1) / 2) / (STAND_RAYS - 1)) * STAND_FAN;
    const tx = x + Math.sin(az) * eR, tz = z + Math.cos(az) * eR;
    const ty = world.field.heightAt(tx, tz) + STAND_TGT_H;
    if (arcClears(world, muzzle, { x: tx, y: ty, z: tz }, spec, selfId)) score++;
  }
  return score;
}

// bestStandPoint: the spotter directs the sniper — candidates are the anchor
// itself, 8 ring points at 2.5m, and the 4 best-height survey candidates
// (control points + rim, re-vetted); highest standScore wins, ties -> nearest
// anchor, then scan order. The anchor is candidate 0, so the directed spot
// NEVER scores below the default. Placement/re-anchor only.
const STAND_RING_R = 2.5;
export function bestStandPoint(world, cx, cz, threatBearing, sniper) {
  const F = world.field, clear = memberClear(sniper);
  const cands = [{ x: cx, z: cz }];
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    cands.push({ x: cx + Math.sin(a) * STAND_RING_R, z: cz + Math.cos(a) * STAND_RING_R });
  }
  const hiCands = [];
  if (F.cs != null && F.half != null) {
    const i0 = Math.floor((cx - SPOT_R + F.half) / F.cs), i1 = Math.ceil((cx + SPOT_R + F.half) / F.cs);
    const j0 = Math.floor((cz - SPOT_R + F.half) / F.cs), j1 = Math.ceil((cz + SPOT_R + F.half) / F.cs);
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const x = i * F.cs - F.half, z = j * F.cs - F.half;
      if (Math.hypot(x - cx, z - cz) > SPOT_R) continue;
      hiCands.push({ x, z, h: F.heightAt(x, z) });
    }
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2;
      const x = cx + Math.sin(a) * SPOT_R, z = cz + Math.cos(a) * SPOT_R;
      hiCands.push({ x, z, h: F.heightAt(x, z) });
    }
    hiCands.sort((a, b) => b.h - a.h);                 // stable in V8: scan order breaks height ties
    for (let k = 0; k < 4 && k < hiCands.length; k++) cands.push(hiCands[k]);
  }
  let best = null, bestScore = -1, bestD = Infinity;
  for (const c of cands) {
    if (slotBlocked(world, c.x, c.z, clear)) continue;
    if (world.pondAt && world.pondAt(c.x, c.z)) continue;
    if (world.inRim && !world.inRim(c.x, c.z)) continue;
    const s = standScore(world, c.x, c.z, threatBearing, sniper.id);
    const d = Math.hypot(c.x - cx, c.z - cz);
    if (s > bestScore || (s === bestScore && d < bestD - 1e-9)) { best = { x: c.x, z: c.z }; bestScore = s; bestD = d; }
  }
  return best;
}

// directPair: run the survey + direction for a sniper squad on placement /
// DEFEND re-anchor. Spotter alive -> he takes the surveyed high ground and
// directs the sniper to the best firing spot; spotter dead -> direction
// simply never re-runs (no special case) and both goals clear.
export function directPair(world, squad, members) {
  squad._spotGoal = null; squad._snipeGoal = null;
  const sniper = members.find((u) => u.role === "sniper");
  const spotter = members.find((u) => u.role === "spotter");
  if (!sniper || !spotter) return;
  const bearing = defaultThreatBearing(world, squad, squad.anchor);
  const spot = surveyHighGround(world, squad.anchor.x, squad.anchor.z, bearing, memberClear(spotter));
  if (spot) squad._spotGoal = { x: spot.x, z: spot.z };
  const stand = bestStandPoint(world, squad.anchor.x, squad.anchor.z, bearing, sniper);
  if (stand) squad._snipeGoal = { x: stand.x, z: stand.z };
}

// ---------------------------------------------------------------- helpers
const MOVE_SPEED = 3.2; // m/s — infantry march speed toward a goal point
// Rubber-band cohesion: the attack anchor holds (this tick) while any live
// member trails it by more than COHESION_M. seekGoal's wake below keeps
// members marching toward their slots, but a man wedged in terrain never
// arrives — so the hold is time-capped (COHESION_CAP_S) rather than open.
export const COHESION_M = 6; // m — max live-member-to-anchor distance before the anchor waits
// The wait is BUDGETED, per leg: a legitimate 6m catch-up at MOVE_SPEED 3.2
// takes under 2s, so 4s is that twice over. Past it the squad stops waiting —
// a member wedged in terrain (the concave-pocket detour oscillation) trails
// forever and would otherwise deadlock the whole squad's advance permanently.
export const COHESION_CAP_S = 4; // s — accumulated cohesion hold per leg before the anchor advances regardless
function seekGoal(world, u, dt) {
  if (!u.goal) return;
  const dx = u.goal.x - u.pos.x, dz = u.goal.z - u.pos.z;
  const d = Math.hypot(dx, dz);
  if (d < 0.15) { u.v.x *= 1 - Math.min(1, 6 * dt); u.v.z *= 1 - Math.min(1, 6 * dt); return; }
  // Steer-around (masonry-slam smallfix): a vetted goal isn't enough when
  // the straight march TO it crosses a solid — the engine depenetrates the
  // man out of the wall and the impact classifier reads the ejection as a
  // lethal slam. Probe one step ahead at the member's own clearance; if
  // blocked, take the first clear heading off a fixed fan (±30/60/90/120°,
  // nearest-deviation first, positive side first — deterministic, no rng).
  let hx = dx / d, hz = dz / d;
  const look = Math.min(d, (u.hx || 0.3) + 0.9), clear = memberClear(u);
  const blockedAhead = (px, pz) => slotBlocked(world, u.pos.x + px * look, u.pos.z + pz * look, clear);
  // Detour COMMIT (diag-squadlag fixture D): re-fanning every tick in a
  // concave solid pocket flip-flops the chosen side — the man vibrates in
  // place with zero net displacement (a deterministic local-minimum
  // oscillation the velocity-based wedge test can't even see). A found
  // detour heading is therefore held for DETOUR_T seconds (or until it
  // blocks), so the man actually TRAVELS along the wall and exits the
  // pocket. Per-body scalar state; draw-free; deterministic.
  if ((u._detourT || 0) > 0 && !blockedAhead(u._detourHx, u._detourHz)) {
    u._detourT -= dt;
    hx = u._detourHx; hz = u._detourHz;
  } else {
    u._detourT = 0;
    if (blockedAhead(hx, hz)) {
      const base = Math.atan2(hx, hz);
      // Fan widened to ±150° (a concave pocket can require walking nearly
      // BACKWARD along the wall before a forward lane opens), and the LAST
      // SUCCESSFUL SIDE is tried first at every magnitude (wall-follow
      // memory): without it, successive fans alternate sides and the man
      // patrols the same 2m of wall forever. Deterministic per-body state.
      const s = u._detourSide === -1 ? -1 : 1;
      const mags = [Math.PI / 6, Math.PI / 3, Math.PI / 2, (2 * Math.PI) / 3, (5 * Math.PI) / 6];
      // preferred side EXHAUSTED first (all magnitudes), THEN the other
      // side — interleaving magnitudes across sides lets a symmetric pocket
      // hand the win to alternating sides and the patrol loop returns.
      for (const off of [...mags.map((m) => m * s), ...mags.map((m) => -m * s)]) {
        const az = base + off, px = Math.sin(az), pz = Math.cos(az);
        if (!blockedAhead(px, pz)) {
          hx = px; hz = pz; u._detourHx = px; u._detourHz = pz; u._detourT = 0.45;
          u._detourSide = off >= 0 ? 1 : -1;
          break;
        }
      }
    }
  }
  // P7 T7: per-type speed — members carry utype (spawnSquadMembers), so a
  // man's own march rate reads off his squad type, falling back to the flat
  // MOVE_SPEED for every existing type (no `speed` field).
  const sp = squadSpeed(u.utype);
  // Wake-on-seek (diag-squadlag root cause): a paused body goes to SLEEP
  // (core.js skips integration and re-zeros v below the wake threshold — a
  // gentle accel-from-rest never escapes it, so a slept marcher stalls
  // forever). Wake with a full-speed kick along the chosen heading — the
  // units.js seekStandPoint precedent. Only here, past the d<0.15 early
  // return: the idle branch never wakes, so settled defenders keep sleeping.
  if (u.sleeping) { u.sleeping = false; u.v.x = hx * sp; u.v.z = hz * sp; }
  u.v.x += (hx * sp - u.v.x) * Math.min(1, 6 * dt);
  u.v.z += (hz * sp - u.v.z) * Math.min(1, 6 * dt);
}

function slotFor(squad, idx, n) {
  // formation slots around the anchor: a small ring, spread evenly.
  const az = (idx / Math.max(1, n)) * Math.PI * 2;
  // P1.5 Task 1 (mk0.50, Jeff): 2.4 -> 1.5. A tighter ring — men read as one
  // body instead of four loose walkers. Pure geometry: no draws, no ordering,
  // and the defend micro-slot search (DEFEND_SLOT_R around each slot) rides on
  // top of it unchanged. // provisional (F5)
  const r = n <= 1 ? 0 : 1.5;
  return { x: squad.anchor.x + Math.sin(az) * r, z: squad.anchor.z + Math.cos(az) * r };
}

// POSSESSION T7 (mk0.97): under the stick with a live aim, the squad shakes
// out into a FIRING LINE perpendicular to the aim — nobody stands behind
// anybody, so the corridor hold above almost never fires. Ring spacing kept
// (1.5m). Pure geometry, no draws.
function lineSlotFor(squad, idx, n, aim) {
  const dx = aim.x - squad.anchor.x, dz = aim.z - squad.anchor.z;
  const d = Math.hypot(dx, dz) || 1;
  const px = -dz / d, pz = dx / d;
  const o = (idx - (n - 1) / 2) * 1.5;
  return { x: squad.anchor.x + px * o, z: squad.anchor.z + pz * o };
}

// Approach bearing used as threatBearing when the squad has no live enemy
// context wired in yet: bearing FROM member TOWARD squad.anchor's forward
// reference (dest if attacking, else world +z as a stable default).
function defaultThreatBearing(world, squad, from) {
  if (squad.dest) return Math.atan2(squad.dest.x - from.x, squad.dest.z - from.z);
  return 0;
}

// ------------------------------------------------------ threat-gated pace
// A squad is THREATENED iff any live team-2 unit/vehicle sits within 25m of
// its anchor OR any member's lastHit changed within the last 4s (sampled —
// lastHit is an identity-compared info object from core.js applyDamage, so
// we stamp world.t when we SEE it change; computed only at leg boundaries,
// never per tick). Deterministic; no rng.
export const THREAT_RADIUS = 25; // m from squad anchor
export const THREAT_HIT_WINDOW = 4; // s since a member's lastHit changed
export function squadThreatened(world, squad, members) {
  let hit = false;
  for (const u of members) {
    if (u.lastHit !== u._paceHit) { u._paceHit = u.lastHit; u._paceHitT = world.t; }
    if (u._paceHit && world.t - u._paceHitT < THREAT_HIT_WINDOW) hit = true;
  }
  if (hit) return true;
  const pool = world._L ? world._L.foes : world.bodies;     // T10
  for (const b of pool) {
    if (!b.alive || b.team !== 2) continue;
    if (b.kind !== "unit" && b.kind !== "vehicle" && b.kind !== "mech") continue;
    if (Math.hypot(b.pos.x - squad.anchor.x, b.pos.z - squad.anchor.z) <= THREAT_RADIUS) return true;
  }
  return false;
}

// stepSquad(world, squad, dt): order machine.
//   defend: members hold formation around anchor, each man micro-seeks the
//           lowest-exposure spot within 3m of his slot (recompute on threat
//           change, not per frame — squad._threatSig tracks the bearing
//           bucket so a per-tick exposure re-scan doesn't churn every man's
//           goal every frame).
//   attack: squad advances dest-ward via coverHop legs; pauses 1.5-3s at
//           each cover leg (rng ONCE per leg draws the dwell time — the
//           brief's one draw per attack leg); on arrival order becomes
//           "defend" with anchor=dest.
//   move / build: the identical leg machine with the threat read forced
//           false (mk0.28 / mk0.60). Both arrive the same way attack does —
//           order flips to "defend" — which is how an engineer line ends
//           with the men dug in behind it.
const DEFEND_SLOT_R = 3;
const ARRIVE_TOL = 1.0;

// ------------------------------------------------- the satchel (F1 Task 4.5)
// Mirror of units.js stepSapper, sign-flipped: each sapper carries ONE
// charge; at CONTACT range (hx + SAPPER_PLANT_PAD) of a STANDING
// hostileStructure(b, 1) target —
// enemy depot masonry now, enemy towers/walls when F3 builds them — he
// plants: 1.5s fuse, the identical blast, and the charge consumes him
// ("the sapper rarely survives his work"; symmetry is the law and the
// fiction). Plant only under ATTACK order; a lit fuse burns down regardless
// (orders don't defuse a satchel). Zero rng draws — deterministic scan
// order, fixed fuse, fixed blast.
function stepSapperCharges(world, squad, dt, members) {
  for (const u of members) {
    if (u._fuse != null) {
      u._fuse -= dt;
      u.v.x *= 1 - Math.min(1, 8 * dt); u.v.z *= 1 - Math.min(1, 8 * dt);
      if (u._fuse <= 0) {
        // SIEGE FIX (mk0.21) directive 2 — SHOW the blast. core.js is frozen,
        // and its boom event carries no way to say "this was a demolition
        // charge, not a shell", so the depot layer pushes a parallel COSMETIC
        // marker beside it. Renderer-only (renderer.js's consume): it scales
        // the existing debris/smoke/fire pools into a demolition column and
        // kicks the shake — no new pools, no engine change, no sim effect,
        // no rng.
        world.events.push({ type: "demo", x: u.pos.x, y: u.pos.y, z: u.pos.z, r: SATCHEL.r });
        explode(world, u.pos.x, u.pos.y, u.pos.z, { ...SATCHEL, attacker: "player" }); // THE shared charge (specs.js) — both sides, one spec
        applyDamage(world, u, 1e9, { attacker: "player" });
      }
      continue;
    }
    if (squad.order !== "attack") continue; // no charge use on defend
    const pool = world._L ? world._L.structsFor1 : world.bodies; // T10
    for (const t2 of pool) {
      if (!hostileStructure(t2, 1)) continue;
      // SIEGE FIX (mk0.21) directive 3 — STANDING masonry only. Rubble already
      // knocked off its home is a corpse; blowing it again is the wasted-charge
      // channel the breach diagnosis found (~30 of 34 charges). The enemy
      // sapper runs the identical filter (units.js) — symmetry is the law.
      if (!standingStructure(t2)) continue;
      const dx = t2.pos.x - u.pos.x, dz = t2.pos.z - u.pos.z;
      // directive 4 — CONTACT range (specs.js SAPPER_PLANT_PAD), not arm's length.
      const reach = t2.hx + SAPPER_PLANT_PAD;
      if (dx * dx + dz * dz < reach * reach) { u._fuse = 1.5; u.flashT = world.t; break; }
    }
  }
}

export function stepSquad(world, squad, dt) {
  const members = squad.memberIds.map((id) => world.byId.get(id)).filter((u) => u && u.alive);
  if (!members.length) return;
  if (squad.type === "sappers") stepSapperCharges(world, squad, dt, members);

  // mk0.28: MOVE rides the identical leg machine as ATTACK — same anchor
  // advance, same one-draw-per-leg contract — with the threat read forced
  // false, i.e. the existing unthreatened double-time path, unconditionally.
  // (Fire discipline is squadFire's job: a MOVE squad keeps quiet en route.)
  // mk0.60: BUILD is the same order again — MOVE's semantics verbatim, not a
  // fork. To this module "build" means only "travel quietly and dig in on
  // arrival"; WHAT gets laid along the way, what it costs and where it lands
  // is the game layer's business (DepotGame's stepBuildLine), because economy
  // and placement are barred from this file by its module law. The only thing
  // the game layer does to a build squad's movement is set squad._pauseT to
  // hold it at a wall — the SAME dwell field an attack leg-pause uses, so the
  // hold rides existing machinery and adds no rng draw of its own.
  // COMMAND T3 (mk0.85): patrol rides the identical leg machine too — a
  // squad that never arrives, only turns around (the ARRIVE_TOL branch
  // below), so the same dest-driven advance carries it both ways.
  if ((squad.order === "attack" || squad.order === "move" || squad.order === "build" || squad.order === "patrol") && squad.dest) {
    const cx = squad.anchor.x, cz = squad.anchor.z;
    // P6 T1: the route — waypoints drawn by the game layer, consumed here.
    // Reaching a waypoint pops it (no draw: a waypoint is not a leg arrival);
    // legs aim at the live waypoint; ARRIVAL stays the true-dest branch below.
    while (squad._route && squad._route.length && Math.hypot(squad._route[0].x - cx, squad._route[0].z - cz) < 1.2) squad._route.shift();
    const wp = squad._route && squad._route.length ? squad._route[0] : squad.dest;
    const dToDest = Math.hypot(squad.dest.x - cx, squad.dest.z - cz);
    // F1 Task 4.5: a sapper squad's ATTACK completes when the charges are
    // spent, not when the virtual anchor touches the dest — the anchor
    // arriving (it walks through masonry; men don't) must not flip the squad
    // to defend while a live man still carries his satchel, or the second
    // charge is forever wasted (found by the through-play breach measurement:
    // one charge per team detonated, the other man stood at the wall
    // holding his). The enemy sapper has no such flip — he marches until his
    // charge is in the wall. Symmetry restored; other squad types unchanged.
    const chargesCarried = squad.order === "attack" && squad.type === "sappers" && members.some((u) => u._fuse == null);
    if (dToDest <= ARRIVE_TOL && chargesCarried) {
      // hold the anchor at the dest WITHOUT the leg machinery (its leg-
      // arrival rng draw must never fire per-tick); members below keep
      // seeking their formation slots — clearSlot pushes those to the
      // nearest clear ground, which at a depot dest is right at the walls,
      // i.e. into arm's reach.
      squad._legTarget = null;
      squad._cohesionHoldT = 0;
    } else if (dToDest <= ARRIVE_TOL && squad.order === "patrol") {
      // COMMAND T3 (mk0.85): a patrol never arrives — it turns around. The
      // far end becomes the destination and the legs carry on; the leg
      // machinery (and its one arrival draw per leg) is untouched.
      const goingToB = Math.hypot(squad.dest.x - squad._patB.x, squad.dest.z - squad._patB.z) < 0.5;
      squad.dest = goingToB ? { x: squad._patA.x, z: squad._patA.z } : { x: squad._patB.x, z: squad._patB.z };
      squad._legTarget = null;
      squad._route = null;
      squad._cohesionHoldT = 0;
    } else if (dToDest <= ARRIVE_TOL) {
      squad.order = "defend";
      squad.anchor = { x: squad.dest.x, z: squad.dest.z };
      squad.dest = null;
      squad._legTarget = null;
      squad._route = null;
      squad._pauseT = 0;
      squad._cohesionHoldT = 0;     // order change: the hold budget is per leg
      squad._threatSig = undefined; // force a defend re-scan on arrival
      squad._surveyPending = true;  // DEFEND re-anchor: the pair re-surveys (6.5 Task 6)
    } else if (squad._pauseT > 0) {
      // dwelling at the current cover leg — no movement, no new rng draw.
      squad._pauseT -= dt;
      if (squad._pauseT <= 0) { squad._pauseT = 0; squad._legTarget = null; } // next tick picks a fresh hop
    } else {
      // moving leg: pick a cover-hop target if we don't have one yet (pure,
      // no rng), then advance the squad anchor toward it.
      if (!squad._legTarget) {
        // LEG BOUNDARY: threat state re-evaluated here only (not per-tick).
        squad._cohesionHoldT = 0; // fresh leg, fresh cohesion hold budget
        squad._threatened = (squad.order === "move" || squad.order === "build") ? false : squadThreatened(world, squad, members);
        if (squad._threatened) {
          const bearing = defaultThreatBearing(world, squad, { x: cx, z: cz });
          squad._legTarget = coverHop(world, { x: cx, z: cz }, wp, bearing);
        } else {
          // DOUBLE-TIME: nobody's shooting, so exposure is ignored — the
          // straightest-progress candidate is the direct step toward dest,
          // at 1.5x the careful hop radius (9m). Deterministic, no rng.
          const dToWp = Math.hypot(wp.x - cx, wp.z - cz) || 1e-6;
          const step = Math.min(HOP_R * 1.5, dToWp);
          squad._legTarget = {
            x: cx + ((wp.x - cx) / dToWp) * step,
            z: cz + ((wp.z - cz) / dToWp) * step,
          };
        }
      }
      const lx = squad._legTarget.x - cx, lz = squad._legTarget.z - cz;
      const ld = Math.hypot(lx, lz);
      if (ld < 0.3) {
        // arrived at this leg's cover point. ONE rng draw here — exactly
        // once per attack leg, per the brief — and it is drawn UNCONDITIONALLY
        // so the rng stream stays identical between threatened and
        // unthreatened runs of equal legs (draw-count stability contract);
        // an unthreatened squad discards the dwell and rolls straight into
        // the next leg.
        const dwell = 1.5 + world.rng() * 1.5;
        if (squad._threatened) squad._pauseT = dwell; // pause 1.5-3s before the next hop
        else squad._legTarget = null; // double-time: skip the dwell, next tick picks a fresh leg
      } else {
        // Rubber-band (1b): the anchor is a virtual point — don't let it
        // outrun the squad body. If any live member trails the anchor by
        // more than COHESION_M, hold this tick (leg target unchanged; the
        // leg-arrival draw above still fires exactly once per leg, only
        // later in wall-clock).
        let trail = 0;
        for (const u of members) {
          const d = Math.hypot(u.pos.x - cx, u.pos.z - cz);
          if (d > trail) trail = d;
        }
        // The hold is BOUNDED (COHESION_CAP_S): wake-on-seek does not free a
        // man wedged in a concave solid pocket, and an unbounded hold turns
        // his wedge into a permanent squad-wide deadlock. Held time accrues
        // per leg (plain dt, no clock); past the cap the anchor advances for
        // the REMAINDER OF THE LEG — the accumulator keeps climbing while he
        // trails, so the release never flickers. The stuck man keeps seeking
        // his slot and rejoins if he frees. Zero rng draws; the leg-arrival
        // draw above still fires exactly once per leg.
        if (trail > COHESION_M) squad._cohesionHoldT = (squad._cohesionHoldT || 0) + dt;
        if (trail <= COHESION_M || squad._cohesionHoldT > COHESION_CAP_S) {
          const step = Math.min(ld, squadSpeed(squad.type) * dt);
          const nx2 = cx + (lx / ld) * step, nz2 = cz + (lz / ld) * step;
          // T3: the anchor never fords — a leg into open water holds at the bank.
          if (!(world.streamAt && world.streamAt(nx2, nz2))) squad.anchor = { x: nx2, z: nz2 };
        }
      }
    }

    const n = members.length;
    members.forEach((u, i) => {
      if (u._fuse != null) return; // a planting sapper holds his ground (fuse drives him)
      const slot = slotFor(squad, i, n);
      u.goal = clearSlot(world, slot.x, slot.z, memberClear(u)); // never march a man into masonry
      u.settled = false; // pair poses (renderer) only ever read true while holding
      if (u._yield && u._yield.until <= world.t) u._yield = null;       // P7 T16
      if (u._yield) { u.goal = { x: u._yield.x, z: u._yield.z }; u.settled = false; }
      seekGoal(world, u, dt);
    });
    return;
  }

  // defend: hold formation around anchor; each member micro-seeks the
  // lowest-exposure spot within DEFEND_SLOT_R of his slot. Recomputed on
  // threat-bearing change (bucketed to 1 of 8 sectors) rather than every
  // frame — matches units.js's own scanCd-style throttling pattern.
  // The pair (6.5 Task 6): survey + direction run ONCE per placement /
  // re-anchor (the _surveyPending flag), never per frame, never on terrain
  // change — craters may later destroy the spotter's hill and he does NOT
  // re-survey (no battlefield pacing). Draw-free.
  if (squad._surveyPending) {
    squad._surveyPending = false;
    if (squad.type === "sniper") directPair(world, squad, members);
  }
  const bearing = defaultThreatBearing(world, squad, squad.anchor);
  const sector = Math.round(bearing / (Math.PI / 4));
  if (squad._threatSig !== sector) {
    squad._threatSig = sector;
    const n = members.length;
    members.forEach((u, i) => {
      const clear = memberClear(u);
      const s0 = slotFor(squad, i, n);
      const slot = clearSlot(world, s0.x, s0.z, clear);
      let best = slot, bestExp = exposureAt(world, slot.x, slot.z, bearing);
      for (let k = 0; k < 8; k++) {
        const az = (k / 8) * Math.PI * 2;
        const cx = slot.x + Math.sin(az) * DEFEND_SLOT_R, cz = slot.z + Math.cos(az) * DEFEND_SLOT_R;
        if (slotBlocked(world, cx, cz, clear)) continue; // tucked INTO the cover = crushed by it
        const exp = exposureAt(world, cx, cz, bearing);
        if (exp < bestExp - 1e-9) { bestExp = exp; best = { x: cx, z: cz }; }
      }
      u._slotGoal = best;
    });
  }
  members.forEach((u) => {
    if (u._fuse != null) return; // a planting sapper holds his ground (fuse drives him)
    if (u._tending) return; // P7.2 T6 A1: a tending medic drives on the patient's goal — the sapper _fuse precedent; the tend pass (after stepSquad) owns him
    // P7.2 T5: unseen fire moves a defender to cover — the shifted spot
    // becomes his micro-slot until the next threat re-scan reclaims it.
    const rs = reactShift(world, u);
    if (rs) u._slotGoal = rs;
    u.goal = u._slotGoal || slotFor(squad, squad.memberIds.indexOf(u.id), members.length);
    // the pair's directed ground outranks the formation micro-slot
    if (u.role === "spotter" && squad._spotGoal) u.goal = squad._spotGoal;
    else if (u.role === "sniper" && squad._snipeGoal) u.goal = squad._snipeGoal;
    // settled: holding on chosen ground (renderer poses/glint key off this;
    // deterministic body field, sim-inert)
    u.settled = !!u.role && Math.hypot(u.goal.x - u.pos.x, u.goal.z - u.pos.z) < 0.35;
    if (u._yield && u._yield.until <= world.t) u._yield = null;       // P7 T16
    if (u._yield) { u.goal = { x: u._yield.x, z: u._yield.z }; u.settled = false; }
    seekGoal(world, u, dt);
  });
}

// POSSESSION (P4 T1, mk0.90): the owner's hands on one squad. The stick is
// a world-space direction; the anchor walks it at the squads' own march
// speed; members hold the formation ring exactly as defend does. Movement
// only — no orders, no rng, no fire (the trigger is the game layer's, T2).
//
// PLAN DEVIATION, load-bearing (found running the T1(a) fixture, not
// guessed): the anchor's own top speed is MOVE_SPEED, identical to a
// member's seekGoal top speed — so a member whose ring slot starts BEHIND
// the direction of travel is a pure pursuer chasing a target fleeing at his
// own max speed. That never closes; measured on a straight 8s drive it
// trails at a roughly constant ~1m/s and never stops opening — "men holding
// formation" would silently break on any drive longer than a couple of
// seconds. The existing rubber-band law (COHESION_M, stepSquad's attack
// leg) already exists to hold an anchor for exactly this — and, as of the
// mk0.90 drift audit, it is now reused VERBATIM (see COHESION_CAP_S below):
// the anchor does not advance on a tick where any live member already
// trails it by more than COHESION_M, and resumes the instant he closes back
// inside it — UNLESS the hold has run past COHESION_CAP_S, exactly as an
// attack leg's own rubber-band escapes a member wedged in terrain. No
// leg-pause/rng dwell is reused (there are no legs under the stick, and the
// brief's zero-new-rng law binds this path) — only the hold-and-cap shape.
export function drivePossessedSquad(world, squad, vx, vz, dt, aim) {
  const mag = Math.hypot(vx, vz);
  if (mag > 1) { vx /= mag; vz /= mag; }
  const members = squad.memberIds.map((id) => world.byId.get(id)).filter((u) => u && u.alive);
  let trail = 0;
  for (const u of members) {
    const d = Math.hypot(u.pos.x - squad.anchor.x, u.pos.z - squad.anchor.z);
    if (d > trail) trail = d;
  }
  // mk0.90 drift audit (A): the time-cap escape the reused band comes with —
  // accrues on every held tick, resets on every unheld one, and once past
  // COHESION_CAP_S the anchor advances regardless (mirrors stepSquad's own
  // mechanism, :600-601, adapted to reset-per-tick since the stick has no
  // legs to reset the budget at).
  if (trail > COHESION_M) squad._cohesionHoldT = (squad._cohesionHoldT || 0) + dt;
  else squad._cohesionHoldT = 0;
  if (trail <= COHESION_M || squad._cohesionHoldT > COHESION_CAP_S) {
    const sp = squadSpeed(squad.type); // P7 T7: per-type speed under the stick too
    squad.anchor = { x: squad.anchor.x + vx * sp * dt, z: squad.anchor.z + vz * sp * dt };
  }
  const n = members.length;
  members.forEach((u, i) => {
    const s = aim ? lineSlotFor(squad, i, n, aim) : slotFor(squad, i, n);
    u.goal = clearSlot(world, s.x, s.z, (u.hx || 0.3) + 0.35);
    u.settled = false;
    seekGoal(world, u, dt);
  });
}

// ------------------------------------------------------- the medic (P7.2 T6)
// One helper, both sides: the nearest wounded comrade inside the anchor's
// leash gets a medic walking to him; inside kneel range the medic drops
// (u.kneel — the troop kit's crouch), stamps _kneltOnce (a test latch),
// and mends MEDIC_RATE hp a second, never past maxHp. Sealed riders, the
// enemy's men, and the medic himself are no one's patient. No patient →
// stand down. Deterministic; zero rng; healing writes hp directly —
// damage is the engine's, mending is the game's. All dials provisional (F5).
export const MEDIC_SEEK_M = 12;  // provisional (F5) — the leash off the anchor/post
export const MEDIC_TEND_M = 1.4; // provisional (F5) — kneel range
export const MEDIC_RATE = 3;     // provisional (F5) — hp per second
export function stepMedicTend(world, u, ax, az, dt) {
  let best = null, bd = Infinity;
  const pool = world._L ? (u.team === 2 ? world._L.foes : world._L.friends) : world.bodies;
  for (const p of pool) {
    if (p.kind !== "unit" || !p.alive || p.team !== u.team || p === u) continue;
    if (p.maxHp == null || p.hp >= p.maxHp - 0.5) continue;
    if (p.riding || p.pinned) continue;
    if (Math.hypot(p.pos.x - ax, p.pos.z - az) > MEDIC_SEEK_M) continue;
    const d = Math.hypot(p.pos.x - u.pos.x, p.pos.z - u.pos.z);
    if (d < bd) { bd = d; best = p; }
  }
  if (!best) { u.kneel = false; u._tending = false; return false; }
  if (bd > MEDIC_TEND_M) {
    u.kneel = false; u._tending = true; // A1: the formation drive stands aside while he tends
    const g = clearSlot(world, best.pos.x, best.pos.z, memberClear(u));
    u.goal = { x: g.x, z: g.z };
    u.settled = false;
    seekGoal(world, u, dt);
    return true;
  }
  u.kneel = true; u._kneltOnce = true; u._tending = true;
  u.settled = true;
  u.v.x *= 1 - Math.min(1, 8 * dt); u.v.z *= 1 - Math.min(1, 8 * dt);
  best.hp = Math.min(best.maxHp, best.hp + MEDIC_RATE * dt);
  return true;
}
// The squad wrapper: DEFEND only — orders outrank mercy on the march. A1: a
// squad taken off DEFEND drops the tending flag and the kneel on every man
// so the formation drive (stepSquad) reclaims them cleanly.
export function stepMedicTendSquad(world, squad, dt) {
  if (squad.type !== "medics") return;
  if (squad.order !== "defend") {
    for (const id of squad.memberIds) { const u = world.byId.get(id); if (u) { u.kneel = false; u._tending = false; } }
    return;
  }
  for (const id of squad.memberIds) {
    const u = world.byId.get(id);
    if (u && u.alive) stepMedicTend(world, u, squad.anchor.x, squad.anchor.z, dt);
  }
}

// ------------------------------------------------------ the mechanic (P7.2 T7)
// The medic's tend template with three deltas (owner's rulings): TARGETS are
// own-side machines and masonry with an hp ledger (hulls, towers, wall
// courses, bags — depot stones carry no ledger and are excluded by
// construction); UNDER FIRE THE WORK PAUSES (a fresh dmgT stands him down
// for REPAIR_UNDERFIRE_S — the reaction covers him like any man); and EVERY
// POINT IS PAID — a fractional debt charges ONE scrap at a time through
// world._mech.take(team, 1), the game layer's books (stamped at mount; this
// module only asks — its no-economy law holds). An empty till leaves him
// kneeling with a still wrench. Shares kneel/_tending with the medic — the
// defend-branch skip and the wrapper shape carry over. Zero rng.
// All dials provisional (F5).
export const MECH_SEEK_M = 12;          // provisional (F5)
export const MECH_WORK_PAD = 1.6;       // provisional (F5)
export const REPAIR_RATE = 4;           // provisional (F5) — hp per second
export const REPAIR_COST_PER_HP = 0.15; // provisional (F5) — scrap per point
export const REPAIR_UNDERFIRE_S = 4;    // provisional (F5)
export function stepMechanicTend(world, u, ax, az, dt) {
  if (world.t - (u.dmgT != null ? u.dmgT : -1e9) < REPAIR_UNDERFIRE_S) { u.kneel = false; u._tending = false; return false; }
  let best = null, bd = Infinity, br = 0;
  for (const b of world.bodies) {
    if (!b.alive || b.team !== u.team) continue;
    const machine = b.kind === "mech" || b.kind === "vehicle" || b.kind === "tower" || b.kind === "wall" || (b.kind === "chunk" && b.sandbag);
    if (!machine || b.maxHp == null || b.hp >= b.maxHp - 0.5) continue;
    if (Math.hypot(b.pos.x - ax, b.pos.z - az) > MECH_SEEK_M) continue;
    const d = Math.hypot(b.pos.x - u.pos.x, b.pos.z - u.pos.z);
    if (d < bd) { bd = d; best = b; br = Math.max(b.hx, b.hz) + MECH_WORK_PAD; }
  }
  if (!best) { u.kneel = false; u._tending = false; return false; }
  if (bd > br) {
    u.kneel = false; u._tending = true;
    const g = clearSlot(world, best.pos.x, best.pos.z, memberClear(u));
    u.goal = { x: g.x, z: g.z };
    u.settled = false;
    seekGoal(world, u, dt);
    return true;
  }
  u.kneel = true; u._kneltOnce = true; u._tending = true;
  u.settled = true;
  u.v.x *= 1 - Math.min(1, 8 * dt); u.v.z *= 1 - Math.min(1, 8 * dt);
  const heal = Math.min(REPAIR_RATE * dt, best.maxHp - best.hp);
  const cost = heal * REPAIR_COST_PER_HP;
  // PRE-PAID WORK (A1): the wrench buys credit ONE scrap at a time BEFORE
  // it mends — the first point of work requires the books to answer, and
  // an empty till mends nothing from the first tick (the original
  // deferred-charge shape leaked ~6.6 free hp; the task's own fixture
  // caught it).
  if ((u._repairCredit || 0) < cost) {
    if (world._mech && world._mech.take(u.team, 1)) u._repairCredit = (u._repairCredit || 0) + 1;
    else return true; // unfunded: kneel, but no work
  }
  u._repairCredit -= cost;
  best.hp += heal;
  return true;
}
// The squad wrapper — the medic's A1 shape, one type over.
export function stepMechanicTendSquad(world, squad, dt) {
  if (squad.type !== "mechanics") return;
  if (squad.order !== "defend") {
    for (const id of squad.memberIds) { const u = world.byId.get(id); if (u) { u.kneel = false; u._tending = false; } }
    return;
  }
  for (const id of squad.memberIds) {
    const u = world.byId.get(id);
    if (u && u.alive) stepMechanicTend(world, u, squad.anchor.x, squad.anchor.z, dt);
  }
}
