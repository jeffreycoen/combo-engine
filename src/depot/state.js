// COLDSNAP DEPOT — run state shape. Kept tiny and dependency-free so
// DepotGame.jsx's loop can stuff a plain object in a ref (React state must
// never be read from the closure — see ColdsnapTD.jsx for why).
import { aimSolve, fireProjectile, addBody, addWeld, explode, applyDamage } from "../engine/core.js";
import { SQUAD_SPECS, clearSlot } from "./squads.js";
import { scatterSigma, applyScatter, arcClears, marchArc, elevSolve, tightSolve, CHARGE_CAP } from "./accuracy.js";
import { planWave, MIN_WAVE_FLOOR, spawnDelayFor } from "./ai.js";
import { payResults, combatIneffective, bookValue, KILL_CUT } from "./economy.js";
import { killPrice } from "./market.js";
import { composeIntel, openingIntel } from "./intel.js";
import { TOWER_SPECS, ENEMY_SPECS, TANK, INFANTRY_ARMS, MASON, PLAYER_START, PLAYER_TIERS, HAND_KEYS, HAND_TAGS, MAN, GRENADE, DAVY_FIRE } from "./specs.js";
import { seenAt } from "./sight.js";

// Targeting gate, symmetric, VISION era (mk0.72): a shooter of `team` (1 =
// player tower/squad, 2 = attacker rifleman/grenadier/tank) may only acquire
// a target its OWN SIDE SEES. Ground control no longer gates any shot — sight
// does, and it gates every shot the same way, structures included. The map is
// the union of what that side's eyes can see (sight.js), rebuilt on the
// territory clock and carried on the territory object as T.sight.
// (x, z) is CANONICAL (u, v) — the map's un-rotated frame, same as the
// renderer's rim — while body positions live in rotated WORLD space; callers
// convert via invW (DEPOT's world-to-canonical transform) before calling
// this, exactly as they always have.
// Two escape hatches, unchanged in spirit from the old ungated contract: no T
// wired (many fixtures construct a world without territory) -> ungated; a T
// with no sight map on it -> ungated too.
// mk0.26's one-cell contested-ground bridge is gone with the old gate: men at
// contact now see each other by plain geometry, which is the same playable
// result for a lot less machinery.
export function fieldReaches(T, x, z, team) {
  if (!T || !T.sight) return true;
  return seenAt(T.sight, x, z, team);
}

// Elevation-scaled acquisition range — the single symmetric rule both towers
// (DepotGame.jsx's stepTowers) and enemy shooters (units.js) consume: high
// ground sees farther. `muzzle` is the shooter's actual firing point (tower:
// pos + hy + 0.45, matching towerShot's own muzzle formula; units: their own
// per-type muzzle offset) — NOT the body's pos.y, which is ground+hy only.
// meanSurroundY samples world.field.heightAt at SURROUND_N points around a
// SURROUND_R-meter ring centered on the muzzle's (x, z); elev is how far the
// muzzle sits above that local average (clamped at 0 — no penalty downhill,
// symmetric with scatterSigma's own elevation treatment). Capped at 1.2x
// (10m+ of relative height buys nothing further).
const SURROUND_R = 6, SURROUND_N = 8;
export function effRange(world, muzzle, spec) {
  let sum = 0;
  for (let i = 0; i < SURROUND_N; i++) {
    const a = (i / SURROUND_N) * Math.PI * 2;
    sum += world.field.heightAt(muzzle.x + Math.cos(a) * SURROUND_R, muzzle.z + Math.sin(a) * SURROUND_R);
  }
  const meanSurroundY = sum / SURROUND_N;
  const elev = Math.max(0, muzzle.y - meanSurroundY);
  return spec.range * Math.min(1.2, 1 + 0.02 * elev);
}

// P7.2 T5: THE REACTION's origin read — where did that hit come from? The
// shooter's live ground when the engine's guarded stamp resolves (srcId),
// else the blast point (srcX/srcZ), else nothing — and no origin means no
// reaction. Pure; no rng; tolerant of every legacy info shape.
export function hitOrigin(world, info) {
  if (!info) return null;
  const src = info.srcId != null ? world.byId.get(info.srcId) : null;
  if (src && src.alive) return { x: src.pos.x, z: src.pos.z };
  if (info.srcX != null) return { x: info.srcX, z: info.srcZ };
  return null;
}

// ---------------------------------------------------------- pending placement
// Task 3's confirm-before-build flow, factored into pure/headless-testable
// pieces so depot-test.mjs can drive the state machine without React/DOM —
// same split as the bell cycle below. DepotGame.jsx's canBuildAt/
// startPending/confirmPending are thin wrappers around these.
//
// validatePlacement: same four checks buildAt makes (occupied, ice, held,
// afford), reduced to booleans/numbers so callers don't need to hand this a
// live grid cell or territory object — just answers already read from one.
export function validatePlacement({ blocked, ice, held, resources, cost }) {
  if (blocked) return { ok: false, msg: "OCCUPIED" };
  if (ice) return { ok: false, msg: "NO GROUND — frozen water" };
  if (!held) return { ok: false, msg: "GROUND NOT HELD" };
  if (resources < cost) return { ok: false, msg: "NO SCRAP" };
  return { ok: true };
}

// mk1.95: THE PLACEMENT ZONE's mask — pure. One byte per grid cell: 1 where
// a confirm placement may land — the caller's own held test, minus every
// cell the ground itself refuses. The game layer hands it to the renderer.
export function placeZoneMask(grid, heldAt, vetAt, room) {
  const m = new Uint8Array(grid.w * grid.h);
  for (let gz = 0; gz < grid.h; gz++) for (let gx = 0; gx < grid.w; gx++) {
    const ci = grid.idx(gx, gz);
    const c = grid.cells[ci];
    if (c.blocked || c.wallId || c.ice || c.water) continue;
    if (room && room[ci]) continue;
    const wp = grid.gridToWorld(gx, gz);
    if (!heldAt(wp.x, wp.z)) continue;
    if (vetAt && !vetAt(wp.x, wp.z)) continue;
    m[ci] = 1;
  }
  return m;
}

// Trailing-tap guard (brief): the confirm button appears at the same screen
// spot the opening tap landed on, so it must not register a click for this
// long after appearing, or the tap that opened it double-fires as the
// confirm. Purely a time constant — not RNG, so no depot-lint concern.
export const PENDING_ARM_S = 0.35;
export function pendingArmed(pending, nowT) {
  if (!pending) return false;
  // P7.2 T3: a WALL-ARMED pending (the deal's confirm ghost — the sim
  // clock is frozen pre-start, the T8 lesson) arms on real seconds;
  // every other pending stays on sim time, byte-identical.
  if (pending.wallArm) return (typeof performance !== "undefined" ? performance.now() / 1000 : nowT) >= pending.armedAtWall;
  return nowT >= pending.armedAt;
}

// --- confirm-tap thefts (mk0.27) --------------------------------------------
// Two taps used to vanish without a trace:
//  1. ✓ tapped before it arms — confirmPending no-opped silently, so the tap
//     read as broken. It stays inert (the arm guard is the point), but it now
//     SAYS so, and it leaves the pending exactly as it was: the next tap
//     opens/cancels normally.
//  2. panning until the ✓/✗ pair leaves the viewport — the pending was still
//     set, so the next ground tap was silently eaten by the "any canvas tap
//     resolves a pending" rule with no visible thing to resolve. Now the
//     pending auto-cancels (with a toast) the moment its anchor leaves the
//     screen, and a canvas tap only counts as "resolve the pending" while the
//     buttons are actually on-screen.
export const PENDING_EDGE_PAD = 8;   // px — a button half off the edge is not tappable
export function pendingButtonsVisible(screen, rect, pad = PENDING_EDGE_PAD) {
  if (!screen || !rect) return false;
  return screen.x >= rect.left + pad && screen.x <= rect.left + rect.width - pad
      && screen.y >= rect.top + pad && screen.y <= rect.top + rect.height - pad;
}
// Does a canvas tap resolve (cancel) the open pending? Only when the pending
// exists AND its buttons are on-screen — otherwise the tap belongs to whatever
// the player actually tapped.
export function canvasTapConsumesPending(pending, screen, rect) {
  return !!pending && pendingButtonsVisible(screen, rect);
}

// Wall build cost. specs.js has no wall entry (walls aren't a TOWER_SPECS
// type), so this is the single source of truth — EXPORTED as of mk0.50 so
// DepotGame.jsx's buildAt fallback and build-palette label read it instead of
// carrying their own copies of the number (three literals, one price: a
// desync waiting to happen the moment one of them moves).
// P1.5 Task 1 (mk0.50, Jeff): 5 -> 8, part of the +~50% interim raise across
// every player price. See SQUAD_SPECS (squads.js) for the asymmetry note that
// governs the whole raise. // provisional (F5)
export const WALL_COST = 8;

// ----------------------------------------------------- what the field costs
// P1.5 Task 4 (mk0.60, Jeff): an ENGINEER TEAM laying a line in the field pays
// less per piece than the build menu does. The menu price buys a thing that
// appears fully formed wherever you point; the field price buys a thing two men
// have to walk to and put down under whatever is shooting at them, and a wall
// costs them ~1.5s standing still per course-stack on top of that. Ratified as
// bags 3 (menu 5) and walls 5 (menu 8). Both provisional (F5); neither is read
// by the build menu, which keeps WALL_COST/SANDBAG_COST.
export const SANDBAG_FIELD_COST = 3;   // provisional (F5)
export const WALL_FIELD_COST = 5;      // provisional (F5)
// Seconds the squad stands still at each wall it lays — the commitment. Rides
// squad._pauseT, the attack-leg dwell field (squads.js), so it costs no new
// machinery and no rng draw. // provisional (F5)
export const WALL_LAY_PAUSE_S = 1.5;

// ================================================================== masonry
// P1.5 Task 2 (mk0.52, Jeff): A BUILT WALL IS THREE COURSES.
//
// What the player buys for WALL_COST is still ONE wall on ONE grid cell, but
// it stands as three stacked static "wall" bodies, welded vertically, each
// carrying a third of the old wall's hp and dying on its own. The FOOTPRINT
// (1.8m square) and the TOTAL HEIGHT (1.8m) are exactly what the old
// single-body wall had, so cover, sightlines, arcs, placement and occupancy
// are all untouched. What changed is that the thing breaks course by course
// and falls down when its base is shot out.
//
// Deliberate deviation from the brief's word "cubes": a course is a BLOCK
// (1.8 x 0.6 x 1.8), not a cube. Literal cubes would mean either tripling
// the wall's height or shrinking its footprint to a third of the grid cell —
// both are sim-visible changes to cover and blocking that the brief did not
// ask for. Three courses in the old silhouette is the look, with none of the
// collateral.
export const WALL_HP = 70;                                  // the old single-body wall hp, now split
export const WALL_COURSES = 3;
export const WALL_HALF = 0.9;                               // footprint half-extent (unchanged)
export const WALL_H = 1.8;                                  // total height (unchanged)
export const WALL_COURSE_PITCH = WALL_H / WALL_COURSES;     // 0.6 — course centre to course centre
// The joint: MASON's own convention (0.80m stones on a 0.83m pitch leave a
// 3cm seam between welded neighbours). The courses are laid the same way the
// town's stone is laid, so the physical stack has real 3cm joints in it.
export const WALL_JOINT = 0.03;
export const WALL_COURSE_HY = (WALL_COURSE_PITCH - WALL_JOINT) / 2; // 0.285
// Weld strength: MASON.breakF (80,000) verbatim — the same masonry family as
// the town's walls. It is NOT "tuned until shells can shear it", because no
// value could be: a weld between two STATIC bodies is inert by construction.
// explode() skips every invM === 0 body before it ever reaches its weld-shock
// branch (core.js ~:513), and solveWelds/weldBreakPass only ever accumulate
// stress from bodies the solver actually moves. So these welds are census and
// seam semantics, exactly as the brief warned. What holds a course up is THE
// COURSE BELOW IT — stepWallSupport is the whole collapse mechanism, and a
// course that loses its footing is respawned as a fresh weld-free chunk, so
// the number never becomes live by the back door either.
export const WALL_WELD_BREAK_F = MASON.breakF;
// Upper courses carry a body `group` so the kill event they push can be told
// apart from the wall's own death: ONE wall pays ONE wallKill however many of
// its courses the enemy chews through (DepotGame's results loop reads this).
export const WALL_UPPER_GROUP = "wallcourse";

// EACH COURSE CARRIES THE WHOLE WALL_HP, and this is a considered departure
// from the brief, which said to SPLIT the wall's hp across the three courses.
// Splitting is wrong once the support rule exists, and it is wrong by a
// factor of three. Everything that shoots a wall aims at the nearest body,
// which is the BASE course; the base's death brings the whole wall down; so a
// split wall's real durability is its base course's share — 24 of the old 70.
// Measured, three shooters, rounds to bring one wall down (old single body vs
// three courses, identical shots and aim points, scripts-level probe):
//   grenadier lob   6 -> 2      enemy rifle  48 -> 17      (split 24/23/23)
//   grenadier lob   6 -> 6      enemy rifle  48 -> 48      (whole hp each)
// A polish task must not quietly make every player wall three times more
// fragile, so each course is a full-strength 70. In play that is not a
// tougher wall — nobody has to chew all three — it is EXACTLY today's wall,
// which is the point: the look changed, the fight did not.
export function wallCourseHp(i) {
  void i; // uniform today; the signature keeps the door open for a heavier base
  return WALL_HP;
}

// capTop: which course wears the snow cap. The renderer draws one cap per
// wall, on the TOP LIVING course, so a wall whose top has been shot away
// still looks like a wall and not a decapitated one. A plain single-body wall
// (the F3-ready enemy wall, test fixtures) has no `course` and always caps.
function markWallCaps(courses) {
  let top = null;
  for (const b of courses) if (!top || b.course > top.course) top = b;
  for (const b of courses) b.capTop = b === top;
}

// mk0.55 (Jeff, correcting mk0.54's 3x3x3 cube): A WALL IS A FACE — 3 wide,
// 3 tall, ONE block deep (1.8 x 1.8 x 0.7). The collider matches the look:
// courses are thin slabs whose long axis runs across the enemy's approach by
// default (orient, same convention as sandbags: 0 = long axis along world x)
// and auto-continues along a built line (wallOrientAt below). The footprint's
// grid CELL is still fully owned — occupancy and placement are untouched.
export const WALL_THIN = 0.35;          // depth half-extent — the sandbag family's own depth
export function wallOrientAt(world, x, z, defaultOrient) {
  let best = null, bestD2 = 2.2 * 2.2;
  for (const b of world.bodies) {
    if (b.kind !== "wall" || !b.alive) continue;
    const dx = b.pos.x - x, dz = b.pos.z - z, d2 = dx * dx + dz * dz;
    if (d2 > 1e-6 && d2 <= bestD2) { bestD2 = d2; best = b; }
  }
  if (!best) return defaultOrient;
  return Math.abs(best.pos.x - x) >= Math.abs(best.pos.z - z) ? 0 : 1;
}

// spawnWallCourses(world, x, groundY, z, orient) -> the courses, bottom first.
// The bottom course is the one the grid cell holds (DepotGame's cell.wallId):
// its death is what releases the ground, and the courses above it come down
// with it via the support rule below.
export function spawnWallCourses(world, x, groundY, z, orient = 0, team = 1) {
  const out = [];
  for (let i = 0; i < WALL_COURSES; i++) {
    const b = addBody(world, {
      kind: "wall", team, mass: 0,
      hx: orient === 1 ? WALL_THIN : WALL_HALF, hy: WALL_COURSE_HY, hz: orient === 1 ? WALL_HALF : WALL_THIN,
      x, y: groundY + (i + 0.5) * WALL_COURSE_PITCH, z,
      hp: wallCourseHp(i),
      group: i > 0 ? WALL_UPPER_GROUP : "",
      friction: 0.65, restitution: 0.02,
    });
    b.course = i;
    b.orient = orient; // saved with the body (generic scalar sweep); the renderer reads the dims, not this
    // How far this course's centre rides above the ground it stands on. A
    // one-piece wall rides exactly its own half-height, which is what core's
    // crater re-seat assumes; a course two storeys up does not. Without this
    // the first shell to crater the dirt beside a wall re-seated all three
    // courses onto the ground and the wall imploded into one block.
    b.seatY = (i + 0.5) * WALL_COURSE_PITCH;
    b.maxHp = b.hp;
    // SLEEPING DISCIPLINE (the brief's trap): three bodies where there was
    // one, so they go in asleep — spawnSandbag's own law for static cover.
    // Statics never pair in the broadphase anyway (core.js's invM===0 skip);
    // this keeps them out of the integrator's awake set as well.
    b.sleeping = true;
    out.push(b);
  }
  for (let i = 1; i < out.length; i++) addWeld(world, out[i - 1], out[i], WALL_WELD_BREAK_F);
  markWallCaps(out);
  return out;
}

// forgetWelds(world, b): break and unhook every weld touching b, before b
// leaves world.bodies. A weld still pointing at a removed body is a weld
// solved against a ghost — the same hygiene DepotGame's sleeping-chunk sweep
// performs when it retires rubble.
export function forgetWelds(world, b) {
  const wl = world.weldsOf && world.weldsOf.get(b.id);
  if (wl) for (const wd of wl) wd.broken = true;
  if (world.weldsOf) world.weldsOf.delete(b.id);
  world._weldPairsDirty = true;
}

// Courses are matched by FOOTPRINT, never by body id: ids are not stable
// across a save/resume (save.js law 3), but a wall never moves, and its three
// courses are built at one grid cell's exact centre and written to the file at
// the same millimetre rounding.
const wallStackKey = (b) => b.pos.x.toFixed(2) + "|" + b.pos.z.toFixed(2);

// dropCourse: a course with nothing under it stops being a wall. It leaves
// the wall set entirely and comes back as a DYNAMIC mass-100 chunk at the
// same pose, awake, with whatever hp it had left — it falls, it tumbles, it
// lies there as rubble, and DepotGame's 14-second sleeping-chunk sweep
// retires it once it has settled (bornT is what arms that sweep).
function dropCourse(world, b) {
  forgetWelds(world, b);
  world.byId.delete(b.id);
  const i = world.bodies.indexOf(b);
  if (i >= 0) world.bodies.splice(i, 1);
  const c = addBody(world, {
    kind: "chunk", team: 1, mass: 100,
    hx: b.hx, hy: b.hy, hz: b.hz,
    x: b.pos.x, y: b.pos.y, z: b.pos.z,
    hp: b.hp, friction: 0.65, restitution: 0.02,
  });
  c.maxHp = b.maxHp != null ? b.maxHp : b.hp;
  c.bornT = world.t;
  return c;
}

// stepWallSupport(world) — THE SUPPORT RULE, and the only reason a wall
// collapses. Run once per tick from the depot's step, straight after the pass
// that removes dead structures, so a course that died this tick has already
// left the world by the time its neighbours are polled.
//
// Per footprint, walking up from the ground: a course stands if the course
// directly below it is still standing (course 0 stands on the earth). The
// first gap breaks the chain, and that course and every course above it drop.
// Returns how many fell (tests read this).
export function stepWallSupport(world) {
  let stacks = null;
  for (const b of world.bodies) {
    if (b.kind !== "wall" || b.course == null || !b.alive) continue;
    if (!stacks) stacks = new Map();
    const k = wallStackKey(b);
    const arr = stacks.get(k);
    if (arr) arr.push(b); else stacks.set(k, [b]);
  }
  if (!stacks) return 0;
  let fell = 0;
  for (const arr of stacks.values()) {
    if (arr.length > 1) arr.sort((p, q) => p.course - q.course);
    let expect = 0;
    const standing = [];
    for (const b of arr) {
      if (b.course === expect) { standing.push(b); expect++; continue; }
      dropCourse(world, b);
      fell++;
    }
    if (standing.length) markWallCaps(standing);
  }
  return fell;
}


// One trigger pull, general shooter core: 2-pass lead solve against
// `target`'s velocity, then fire spec.volley (or 1) shots. sigma is
// computed once per pull from the led aim point (spec.acc, range/
// elevation/graze) and applied per shot via applyScatter — conditional
// accuracy, not a flat volley spread. Shared by towers (towerShot below)
// and enemy shooters (src/depot/units.js) so every aimed shot in DEPOT —
// player or enemy — runs through the identical accuracy model.
// opts: { high (mortar-style lob arc), attacker ("player"|"enemy"),
//         hitStruct, hitOnly, muzzleStep (per-shot muzzle y offset),
//         volleyDelay (seconds between shots of a multi-round pull; default
//         0.12, see below), owner (core.js's fireProjectile owner-immunity
//         id — REQUIRED for any dynamic-body shooter; towers/enemy units
//         never needed it because they're either static structures
//         core.js's hit scan skips by default, or fire hitOnly:"structure"
//         so units never enter their own hit scan. squadFire's infantry
//         shooters are ordinary dynamic "unit" bodies with no such
//         exemption — without owner, a round's very first flight-path
//         sample sits inside the shooter's own muzzle-adjacent hitbox and
//         detonates at the muzzle, 0 range, every time; found live while
//         building squadFire below) }
export function shooterFire(world, shooter, muzzle, target, spec, opts = {}) {
  let high = !!opts.high;
  // mk2.03 (owner): ACTUAL ELEVATION — no mortar root for guns. An "auto"
  // spec raises the barrel inside the 35° cap at a fitted speed (elevSolve);
  // with no lawful arc the gun HOLDS its fire.
  // mk2.55 (owner): THE LOBBED SHELL — the cap is the spec's own
  // (accuracy.js elevCapOf): the Bison's gun rises to 85°, the field gun
  // keeps 35°. Same search, same hold.
  let elev = null;
  // mk2.56 (owner): THE TIGHTEST ARC — a spec carrying chargeSig solves
  // charge and angle together (accuracy.js tightSolve) and fires the arc
  // with the tightest landing group; the mortar root and the flattest-first
  // walk both retire for these guns. With no lawful arc the gun HOLDS.
  if (spec.chargeSig != null) {
    high = false;
    elev = tightSolve(world, muzzle, target.pos, spec, opts.owner);
    if (!elev) return;
  } else if (!high && spec.occl === "auto") {
    elev = elevSolve(world, muzzle, target.pos, spec, opts.owner);
    if (!elev) return;
  }
  const attacker = opts.attacker || "player";
  let ax2 = target.pos.x, az2 = target.pos.z, ay2 = target.pos.y;
  for (let li = 0; li < 2; li++) {
    const ld = Math.max(2, Math.hypot(ax2 - muzzle.x, az2 - muzzle.z));
    const lp = aimSolve(spec.projSpeed, ld, ay2 - muzzle.y, 9.8, high);
    if (lp == null) break;
    const tof = ld / Math.max(1e-3, spec.projSpeed * Math.cos(lp));
    ax2 = target.pos.x + target.v.x * tof;
    az2 = target.pos.z + target.v.z * tof;
    ay2 = world.field.heightAt(ax2, az2) + target.hy;
    // DIVERGENCE (guarded): partial wind hold-off — shooters correct for
    // wind drift by only windComp of the true offset (imperfect by design;
    // doctrine raises it later). No-op without world.wind or spec.windF/
    // windComp. Enemy specs carry the same windF/windComp as their tower
    // analog (Jeff's decision: aim fully equal), so this applies identically.
    if (world.wind && spec.windF && spec.windComp) {
      ax2 -= world.wind.x * spec.windF * tof * spec.windComp;
      az2 -= world.wind.z * spec.windF * tof * spec.windComp;
    }
  }
  const dx = ax2 - muzzle.x, dz = az2 - muzzle.z, dy = ay2 - muzzle.y;
  const sigma = scatterSigma(world, muzzle, { x: ax2, y: ay2, z: az2 }, spec);
  const d = Math.max(2, Math.hypot(dx, dz));
  let pitch = aimSolve(spec.projSpeed, d, dy, 9.8, high);
  if (pitch == null) pitch = high ? 1.1 : 0.45;
  const rawDir = { x: (dx / d) * Math.cos(pitch), y: Math.sin(pitch), z: (dz / d) * Math.cos(pitch) };
  if (elev) {
    const du = Math.hypot(dx, dz) || 1;
    rawDir.x = (dx / du) * Math.cos(elev.pitch); rawDir.y = Math.sin(elev.pitch); rawDir.z = (dz / du) * Math.cos(elev.pitch);
  }
  // mk2.03: the barrel mesh wears the fired pitch (render-only field).
  shooter._aimPitch = Math.asin(Math.max(-1, Math.min(1, rawDir.y)));
  const shots = spec.volley || 1;
  const muzzleStep = opts.muzzleStep != null ? opts.muzzleStep : 0.28;
  // volleyDelay: seconds between successive rounds of a multi-shot trigger
  // pull (fireProjectile's own `delay` param — the round sits inert until
  // world.t catches up, see core.js ~:649). Rocket towers (spec.volley=4)
  // rely on the 0.12 default; squadFire's MG bursts pass INFANTRY_ARMS.mg's
  // burstGap (0.17) here so a "burst" reads as its own spaced mechanism
  // rather than reusing the tower volley's fixed cadence.
  const volleyDelay = opts.volleyDelay != null ? opts.volleyDelay : 0.12;
  for (let si = 0; si < shots; si++) {
    const dir = applyScatter(world, rawDir, sigma);
    // mk2.56 (owner): the propellant varies — one bounded uniform draw per
    // round on chargeSig specs (the third draw; applyScatter keeps its two).
    const chg = spec.chargeSig != null ? 1 + (world.rng() * 2 - 1) * spec.chargeSig * CHARGE_CAP : 1;
    fireProjectile(world, { x: muzzle.x, y: muzzle.y + si * muzzleStep, z: muzzle.z }, dir, (elev ? elev.v : spec.projSpeed) * chg,
      {
        kind: spec.kind, r: spec.blastR, kv: spec.kv, dmg: spec.dmg, dirDmg: spec.dirDmg, crater: spec.crater,
        // P1.5 Task 3 (mk0.56): WHICH GUN this is, carried through to the
        // muzzle event so audio can tell a sniper from a rifle from an MG
        // (every infantry arm is kind:"mg"; four different tubes are
        // kind:"shell"). Sound only — nothing mechanical reads it, and it is
        // undefined for any spec table that has not been tagged.
        weapon: spec.weapon,
        noImpact: true, attacker, delay: si * volleyDelay, windF: spec.windF,
        // No round passes through a structure (sightlines 6.5 Task 4):
        // every shooterFire round carries hitStruct unless the caller set
        // hitOnly (structure-only shots keep their exact behavior). A
        // unit-target round may now physically eat a wall/rock/tower edge
        // en route — the blast lands where the round stops.
        hitStruct: opts.hitOnly ? opts.hitStruct : true, hitOnly: opts.hitOnly, owner: opts.owner,
      });
  }
}

// One tower trigger pull — thin wrapper over shooterFire. Kept as its own
// export (depot-test.mjs and DepotGame.jsx's stepTowers call it by name).
export function towerShot(world, tower, target, spec) {
  const muzzle = { x: tower.pos.x, y: tower.pos.y + tower.hy + 0.45, z: tower.pos.z };
  const high = tower.towerType === "mortar"; // P7.1 T9 (owner): rockets fly the GENTLE ARC — the flat solve
  // owner: now that every shooterFire round carries hitStruct (Task 4), a
  // tower's own hull is a shootable structure to its own muzzle-adjacent
  // round — thread the uniform muzzle-clearing immunity (self-hit law).
  shooterFire(world, tower, muzzle, target, spec, { high, attacker: tower.team === 2 ? "enemy" : "player", owner: tower.id });
}

// squadFire(world, squad, dt, T, toUV): infantry trigger pull, one call per
// squad per tick. Movement lives entirely in squads.js (stepSquad) — this
// stays out of that module so squads.js remains movement-pure with no
// state.js import (this phase's explicit split). squads.js's own module
// note documents the ONE rng draw it makes (attack leg-pause dwell); this
// function makes NONE — the only rng in a fired round is applyScatter's 2
// draws, same as every tower shot.
//
// Fire discipline: members fire ONLY while stationary — order "defend", or
// "attack" mid-leg-pause (squad._pauseT > 0). stepSquad already holds every
// member still in both cases (defend: slot-seek settles; attack pause: no
// new goal is issued), so this is a squad-level gate, not per-member.
// VISION T4: the game layer holds an attacking squad's pause open while a
// seen enemy is in reach (DepotGame's engageCheck), so halt-and-fight rides
// this same gate.
//
// Per member: a body-local cooldown (u.fireCd, mirrors tower b.fireCd)
// gates the trigger pull; target acquisition is the EXACT tower stack
// (stepTowers, DepotGame.jsx) — nearest live enemy unit/vehicle within
// effRange(world, muzzle, spec) (elevation-scaled), passing fieldReaches
// (own team's field, so player squads gate on team 1 same as towers) AND
// arcClears with selfId=u.id excluded (Task 6's own-body fix, same reason
// towers need it: the sampler's first point sits inside the shooter's own
// hitbox on a flat shot).
//
// T/toUV: threaded exactly like stepUnits(world, grid, fwdDir, T, toUV) —
// optional, defaulting to an identity toUV and an ungated fieldReaches (no
// T -> "unheld" never triggers), same contract fieldReaches already
// documents, so callers/tests that don't care about ground control don't
// need to construct a territory grid.
//
// MG burst: INFANTRY_ARMS.mg carries burst/burstGap instead of a tower's
// `volley` — kept as its own name so "a burst" reads as this specific
// infantry mechanic, not an alias for the rocket tower's 4-round salvo.
// Mechanically it's the identical primitive: shooterFire's volley loop,
// fired here with spec.volley set to spec.burst and opts.volleyDelay set to
// spec.burstGap (0.17s) instead of the tower default (0.12s) — see
// shooterFire's volleyDelay note above. Sniper/rifles have no `burst`, so
// they fall through as ordinary single-shot pulls (volley defaults to 1).
//
// INTERFACE GAP (documented, not silently patched): the brief's verbatim
// INFANTRY_ARMS table carries no blastR/kv, unlike every other spec table
// in this file's blast path (TOWER_SPECS, ENEMY_FIRE — every entry there
// sets both). fireProjectile's hit always resolves through core.js's
// explode(), which divides by spec.r (`reach = spec.r + ...`, `f = 1 -
// dist/reach`) and multiplies by spec.kv for its impulse — with both
// undefined that's NaN op NaN, and a "hit" deals NaN damage (silently
// leaves hp NaN, body never dies since NaN comparisons are always false).
// Verified by running an infantry shot through the real engine before this
// fallback existed. specs.js is kept verbatim per the brief; this merge is
// the fix, scoped to squadFire only, mirroring TOWER_SPECS.mg's own values
// (0.3/0.5) since every INFANTRY_ARMS entry is itself kind:"mg".
//
// SPEC CONTRADICTION (documented, not silently fixed — see
// scripts/depot-test.mjs's "sniper vs tank" block for the full trace): the
// brief's "chip-only" intent for a sniper vs. a tank assumed core.js's
// b.armor glancing threshold would apply. It never can — spawnTank
// (units.js) never sets t.armor, AND the armor check is hard-excluded for
// CAUSE.BLAST, which is the ONLY cause any shooterFire round (noImpact)
// ever produces. Measured behavior is still chip (~3.5hp/hit) but via an
// unrelated mechanism: explode()'s distance falloff against a tank's own
// large hitbox. Asserting current (accidental) behavior, not adding an
// armor value the brief didn't authorize.
// FRONT F1 (Task 4a): hostileStructure(b, team): what team's shooters may
// treat as an enemy STRUCTURE target. Team 2 (attacker): player towers/walls
// (as today) + the player depot's masonry. Team 1 (player): enemy towers/
// walls (none until F3 — the set is ready for them) + the enemy depot's
// masonry. Structure fire never fog-gates (the law) — range + arcClears only.
export function hostileStructure(b, team) {
  if (!b.alive) return false;
  if (team === 1) {
    if ((b.kind === "tower" || b.kind === "wall") && b.team === 2) return true; // F3-ready
    return b.kind === "chunk" && b.town === "depot2";
  }
  if ((b.kind === "tower" || b.kind === "wall") && b.team === 1) return true;
  return b.kind === "chunk" && b.town === "depot";
}

// mk2.06 (owner): THE ROOFTOP AIM. A lofted shot at a structure aims at its
// TOP — the roof — not a center the lead refresh flattens to the base. hy
// carries roof-over-ground so shooterFire's ay2 refresh lands on the roof
// (the mk2.02 surface-aim convention). Zero draws.
export function aimTop(world, b) {
  const top = b.pos.y + b.hy;
  return { pos: { x: b.pos.x, y: top, z: b.pos.z }, v: b.v || { x: 0, y: 0, z: 0 }, hy: top - world.field.heightAt(b.pos.x, b.pos.z) };
}

const INFANTRY_BLAST_R = 0.3, INFANTRY_KV = 0.5;
export function squadFire(world, squad, dt, T, toUV = (x, z) => ({ u: x, v: z })) {
  if (squad.type === "sappers") return; // F1 Task 4.5: tools, not shooters — sappers never rifle-fire (draws nothing)
  if (squad.type === "engineers") return; // P1.5 T4: same rule, same reason — shovels, not rifles (draws nothing)
  if (squad.order === "move") return;   // mk0.28: MOVE travels, it does not fight (draws nothing)
  if (squad.order === "build") return;  // mk0.60: a building squad keeps quiet, exactly as a moving one does (draws nothing)
  // FROSTLINE FL-2: the game layer's per-squad safety — unset everywhere in
  // the depot game, so this line is inert outside FROSTLINE (draws nothing).
  if (squad.holdFire) return;
  const spec = INFANTRY_ARMS[squad.type];
  if (!spec) return;
  // mk0.28: "move" is never a firing order — the men double-time with
  // weapons quiet, pause or no pause, until arrival flips them to defend.
  // COMMAND T3 (mk0.85): patrol fires exactly like attack — quiet on the
  // march, live at a halt (leg-pause dwell or the engageCheck hold).
  const stationary = squad.order === "defend" ||
    ((squad.order === "attack" || squad.order === "patrol") && squad._pauseT > 0);
  if (!stationary) return;
  const enemyTeam = squad.team === 1 ? 2 : 1;
  const attacker = squad.team === 1 ? "player" : "enemy";
  const fspec = {
    ...spec,
    volley: spec.burst || 1,
    blastR: spec.blastR != null ? spec.blastR : INFANTRY_BLAST_R,
    kv: spec.kv != null ? spec.kv : INFANTRY_KV,
  };
  for (const id of squad.memberIds) {
    const u = world.byId.get(id);
    if (!u || !u.alive) continue;
    if (u.role === "spotter") continue; // binoculars, not a rifle — he NEVER fires (draws nothing)
    u.fireCd = (u.fireCd || 0) - dt;
    if (u.fireCd > 0) continue;
    const muzzle = { x: u.pos.x, y: u.pos.y + 0.5, z: u.pos.z };
    const eR = effRange(world, muzzle, spec);
    // COMMAND T4 (mk0.86): the two scans below are today's code, MOVED into
    // named closures, not rewritten — squad.prefStruct (the pie's STRUCTURES
    // toggle) only reorders which one runs first. The automatic fallback to
    // the other scan on an empty result is unconditional either way: a
    // wall-breaker squad never stands idle with no wall in reach, and a
    // normal squad never ignores the man in front of it just because a wall
    // exists somewhere in range. Sight gating (VISION, mk0.72) is untouched
    // on both paths.
    const scanUnits = () => {
      const pool = world._L ? (enemyTeam === 2 ? world._L.foes : world._L.friends) : world.bodies; // T10
      let best = null, bd = eR * eR;
      for (const e of pool) {
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
        const d2 = dx * dx + dz * dz;
        if (d2 >= bd) continue;
        const c = toUV(e.pos.x, e.pos.z);
        if (!fieldReaches(T, c.u, c.v, squad.team)) continue;
        if (!arcClears(world, muzzle, e.pos, spec, u.id)) continue;
        bd = d2; best = e;
      }
      return best;
    };
    // FRONT F1 (4b): no man in reach — bite stone. Nearest hostile
    // structure in range, LOS by the real arc (selfId), and — since VISION
    // (mk0.72) — gated on SIGHT like every other shot: a squad may only
    // work masonry its own side can see. Unit targets keep absolute
    // priority: this scan runs only on an empty unit scan. Deterministic
    // pick — nearest, ties by body id order (the scan order gives this).
    // Zero rng draws.
    const scanStructs = () => {
      const pool = world._L ? (squad.team === 1 ? world._L.structsFor1 : world._L.structsFor2) : world.bodies; // T10
      let best = null, bs = eR * eR;
      for (const s of pool) {
        if (!hostileStructure(s, squad.team)) continue;
        const cs = toUV(s.pos.x, s.pos.z);
        if (!fieldReaches(T, cs.u, cs.v, squad.team)) continue;
        const dx = s.pos.x - u.pos.x, dz = s.pos.z - u.pos.z, d2 = dx * dx + dz * dz;
        if (d2 >= bs) continue;
        if (!arcClears(world, muzzle, spec.occl === "lofted" ? { x: s.pos.x, y: s.pos.y + s.hy, z: s.pos.z } : s.pos, spec, u.id)) continue;
        bs = d2; best = s;
      }
      return best;
    };
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
      best = scanStructs(); bestIsStruct = !!best;
      if (!best) { best = scanUnits(); }
    } else {
      best = scanUnits();
      if (!best) { best = scanStructs(); bestIsStruct = !!best; }
    }
    if (!best) continue;
    squad._lastTargetId = best.id; // FROSTLINE FL-2: gate observability — which body the trigger chose
    // T7: the corridor holds this man's shot if a live teammate stands
    // between his muzzle and the target — cooldown untouched, same rule
    // possessed fire follows; mortars are exempt (lofted).
    if (fspec.occl !== "lofted" && mateBlocks(world, squad, u, muzzle, best.pos)) continue;
    u.fireCd = spec.fireRate;
    // F1.5 Task 1: lofted specs (mortars) lob — shooterFire's high aimSolve
    // branch, the exact flag the mortar TOWER's towerShot passes. Everyone
    // else (occl "arc") is byte-unchanged. Structure shots keep hitOnly
    // "structure" + hitStruct: the shell still detonates ON the wall (core.js
    // ~:690 — isStruct passes on hitOnly === "structure"), so blast lands.
    // Fire discipline note (shipped as-is, flagged for playtest): squadFire
    // has no friendlyFouls check (that's a tower doctrine) — your own
    // mortars CAN hit your own men.
    // mk2.03: grenadiers THROW — the shot dies, the body flies. Cooldown
    // spent exactly as a shot would spend it (fireCd is set just above).
    if (squad.type === "grenadiers") { throwGrenade(world, u, muzzle, best); continue; }
    const high = spec.occl === "lofted";
    shooterFire(world, u, muzzle, bestIsStruct && spec.occl === "lofted" ? aimTop(world, best) : best, fspec, bestIsStruct
      ? { attacker, volleyDelay: spec.burstGap, muzzleStep: 0, owner: u.id, hitStruct: true, hitOnly: "structure", high }
      : { attacker, volleyDelay: spec.burstGap, muzzleStep: 0, owner: u.id, high });
  }
}

// mk2.18: the davy's own hold — any friendly soft body in the blast ring,
// the firing crew itself excepted (the ring is wider than the range; the
// crew is ALWAYS inside its own blast, and the escape is the game).
export function friendInBlast(world, x, z, team, exceptSquad) {
  for (const b of world.bodies) {
    if ((b.kind !== "unit" && b.kind !== "vehicle" && b.kind !== "mech") || !b.alive || b.team !== team) continue;
    if (exceptSquad && b.squadId === exceptSquad.id) continue;
    if (Math.hypot(b.pos.x - x, b.pos.z - z) < DAVY_FIRE.blastR) return true;
  }
  return false;
}

// mk2.08 (owner): THE DAVY CROCKETT'S SHOT. Under the ATTACK order only
// (the sapper's rule), the crew's lead man fires the atomic round at the
// nearest target its side SEES — man, machine, or hostile structure — inside
// the elevation-scaled range. mk2.12 (owner): THE ESCAPE AND THE RELOAD —
// the trigger no longer kills; the blast alone rules, and the crew reloads
// DAVY_FIRE.reloadS seconds (_davyReadyAt, a world-time stamp riding the
// generic squad serializer). Draws: exactly the round's own 2 (applyScatter).
export function stepDavyShot(world, squad, dt, T, toUV = (x, z) => ({ u: x, v: z })) {
  if (squad.type !== "davy" || (squad._davyReadyAt || 0) > world.t) return;
  if (squad.order !== "attack") return;
  squad._davyScanCd = (squad._davyScanCd || 0) - dt;
  if (squad._davyScanCd > 0) return;
  squad._davyScanCd = 0.25;
  const shooter = squad.memberIds.map((id) => world.byId.get(id)).find((u) => u && u.alive);
  if (!shooter) return;
  const muzzle = { x: shooter.pos.x, y: shooter.pos.y + 0.5, z: shooter.pos.z };
  const spec = DAVY_FIRE;
  const eR = effRange(world, muzzle, spec);
  const enemyTeam = squad.team === 1 ? 2 : 1;
  let best = null, bd = eR * eR;
  for (const e of world.bodies) {
    if ((e.kind !== "unit" && e.kind !== "vehicle" && e.kind !== "mech") || !e.alive || e.team !== enemyTeam) continue;
    const dx = e.pos.x - shooter.pos.x, dz = e.pos.z - shooter.pos.z, d2 = dx * dx + dz * dz;
    if (d2 >= bd) continue;
    const c = toUV(e.pos.x, e.pos.z);
    if (!fieldReaches(T, c.u, c.v, squad.team)) continue;
    bd = d2; best = e;
  }
  if (!best) for (const s of world.bodies) {
    if (!hostileStructure(s, squad.team)) continue;
    const dx = s.pos.x - shooter.pos.x, dz = s.pos.z - shooter.pos.z, d2 = dx * dx + dz * dz;
    if (d2 >= bd) continue;
    const cs = toUV(s.pos.x, s.pos.z);
    if (!fieldReaches(T, cs.u, cs.v, squad.team)) continue;
    bd = d2; best = s;
  }
  if (!best) return;
  const holdA = world._holdArea;
  if (holdA && holdA[squad.team] && friendInBlast(world, best.pos.x, best.pos.z, squad.team, squad)) return;
  squad._davyReadyAt = world.t + spec.reloadS;
  const attacker = squad.team === 1 ? "player" : "enemy";
  shooterFire(world, shooter, muzzle, best.kind !== "unit" && best.kind !== "vehicle" && best.kind !== "mech" ? aimTop(world, best) : best, spec, { high: true, attacker, hitStruct: true, owner: shooter.id });
  // mk2.12 (owner): THE ESCAPE — no fatal trigger. Outrun the blast or die
  // inside it with everyone else.
}

// POSSESSION T7 (mk0.97): THE SHARPENED HAND. Under the owner's control a
// shooter is deliberate: spread tightens to a quarter of the machine's
// (possession-only — auto-fire keeps the loose suppressive model), and a
// reticle resting on or near a live enemy aims at the MAN — his body, his
// speed, his height — through shooterFire's existing lead solve. The snap
// obeys the sight law: a man on unseen ground is not snapped to.
export const POSSESS_ACC = 0.25;   // spread multiplier under player control // provisional (F5)
export const POSSESS_SNAP_R = 4;   // m — reticle-to-enemy snap radius (mk1.99: widened 2 -> 4, the forgiving snap) // provisional (F5)
export function snapTargetNear(world, aim, T, toUV, r = POSSESS_SNAP_R) {
  const pool = world._L ? world._L.foes : world.bodies;     // T10
  let best = null, bd = r * r;
  for (const b of pool) {
    if ((b.kind !== "unit" && b.kind !== "vehicle" && b.kind !== "mech") || !b.alive || b.team !== 2) continue;
    const dx = b.pos.x - aim.x, dz = b.pos.z - aim.z, d2 = dx * dx + dz * dz;
    if (d2 >= bd) continue;
    const c = toUV(b.pos.x, b.pos.z);
    if (!fieldReaches(T, c.u, c.v, 1)) continue;   // you snap only to what your side sees
    bd = d2; best = b;
  }
  return best;
}

// mk1.99: THE STICKY SNAP. A held lock outlives the frame: the man stays
// locked while he lives, stays seen, and the RAW aim stays within the snap
// radius of him — steering the raw point past the radius is the deliberate
// escape. Otherwise the lock drops and the nearest snappable enemy takes it.
export function stickyLock(world, lockId, aim, T, toUV, r = POSSESS_SNAP_R) {
  if (lockId) {
    const b = world.byId.get(lockId);
    if (b && b.alive && (b.kind === "unit" || b.kind === "vehicle" || b.kind === "mech") && b.team === 2) {
      const c = toUV(b.pos.x, b.pos.z);
      if (fieldReaches(T, c.u, c.v, 1) && Math.hypot(b.pos.x - aim.x, b.pos.z - aim.z) < r) return b;
    }
  }
  return snapTargetNear(world, aim, T, toUV, r);
}

// THE CORRIDOR (T7): a living teammate inside MATE_R of the muzzle->aim
// line means this man HOLDS his shot — cooldown untouched, so he fires the
// instant the lane clears. Lofted specs (mortars) never check: arcing over
// your own men is the tube's whole purpose.
export const MATE_R = 0.5;   // m — corridor half-width // provisional (F5)
export function mateBlocks(world, squad, shooter, muzzle, aimPos) {
  const dx = aimPos.x - muzzle.x, dz = aimPos.z - muzzle.z;
  const d2 = dx * dx + dz * dz;
  if (d2 < 1e-9) return false;
  for (const id of squad.memberIds) {
    if (id === shooter.id) continue;
    const m = world.byId.get(id);
    if (!m || !m.alive) continue;
    const t = ((m.pos.x - muzzle.x) * dx + (m.pos.z - muzzle.z) * dz) / d2;
    if (t <= 0.02 || t >= 1) continue;
    const px = muzzle.x + dx * t, pz = muzzle.z + dz * t;
    if (Math.hypot(m.pos.x - px, m.pos.z - pz) < MATE_R + (m.hx || 0.28)) return true;
  }
  return false;
}

// POSSESSION (P4 T2, mk0.91): the owner's trigger. One pull = one aimed
// shot from every living armed member off cooldown, at a synthetic ground
// target — through shooterFire, so scatter/lead/wind/sight law all apply
// exactly as they do to every other shot in the game. Sight-gated at the
// aim cell: you shoot only what your side sees. Returns muzzles fired.
export function possessedVolley(world, squad, aim, T, toUV = (x, z) => ({ u: x, v: z })) {
  // mk2.11 (owner): THE CREW FIRES UNDER THE STICK like every unit — the
  // one atomic round at the reticle, sight-gated at the aim like every
  // possessed shot. The _davyReadyAt reload clock is shared with the
  // ATTACK path (stepDavyShot): one reload clock, whichever path fires
  // starts it. mk2.12: the trigger no longer kills.
  if (squad.type === "davy") {
    if ((squad._davyReadyAt || 0) > world.t) return 0; // mk2.58 (owner): THE COMMANDER'S EYE — possession is the player's own sight; no seen-gate on a possessed aim
    const shooter = squad.memberIds.map((id) => world.byId.get(id)).find((u) => u && u.alive);
    if (!shooter) return 0;
    squad._davyReadyAt = world.t + DAVY_FIRE.reloadS;
    const attacker = squad.team === 1 ? "player" : "enemy";
    const muzzle = { x: shooter.pos.x, y: shooter.pos.y + 0.5, z: shooter.pos.z };
    const sy = aim.y != null ? aim.y : world.field.heightAt(aim.x, aim.z);
    const tgt = { pos: { x: aim.x, y: sy, z: aim.z }, v: { x: 0, y: 0, z: 0 }, hy: sy - world.field.heightAt(aim.x, aim.z) };
    shooterFire(world, shooter, muzzle, tgt, DAVY_FIRE, { high: true, attacker, hitStruct: true, owner: shooter.id });
    return 1;
  }
  const spec = INFANTRY_ARMS[squad.type];
  if (!spec) return 0; // mk2.58 (owner): THE COMMANDER'S EYE — possession is the player's own sight; no seen-gate on a possessed aim
  const fspec = { ...spec, acc: spec.acc * POSSESS_ACC, volley: spec.burst || 1,
    blastR: spec.blastR != null ? spec.blastR : INFANTRY_BLAST_R,
    kv: spec.kv != null ? spec.kv : INFANTRY_KV };
  // T7: the reticle snaps to a live, SEEN enemy for the real body — real
  // velocity, real height, shooterFire's own lead solve — falling back to
  // the synthetic ground point exactly as before when nothing is near.
  const live = snapTargetNear(world, aim, T, toUV);
  const sy = aim.y != null ? aim.y : world.field.heightAt(aim.x, aim.z);
  const tgt = live || { pos: { x: aim.x, y: sy, z: aim.z }, v: { x: 0, y: 0, z: 0 }, hy: sy - world.field.heightAt(aim.x, aim.z) }; // mk2.02: ground aim targets the SURFACE (owner) — the phantom body is dead; hy carries roof height over field ground through shooterFire's lead refresh
  let fired = 0;
  for (const id of squad.memberIds) {
    const u = world.byId.get(id);
    if (!u || !u.alive || u.role === "spotter") continue;
    u.fireCd = (u.fireCd || 0);
    if (u.fireCd > 0) continue;
    const muzzle = { x: u.pos.x, y: u.pos.y + 0.5, z: u.pos.z };
    // T7: the corridor — a live teammate between this muzzle and the aim
    // holds the shot (cooldown untouched); mortars are exempt.
    if (fspec.occl !== "lofted" && mateBlocks(world, squad, u, muzzle, tgt.pos)) continue;
    u.fireCd = spec.fireRate;
    if (squad.type === "grenadiers") { throwGrenade(world, u, muzzle, tgt); fired++; continue; }
    const high = spec.occl === "lofted";
    shooterFire(world, u, muzzle, tgt, fspec, { attacker: "player", volleyDelay: spec.burstGap, muzzleStep: 0, owner: u.id, high });
    fired++;
  }
  return fired;
}

// POSSESSION (P4 T3, mk0.92): a possessed tower is manual fire control —
// the real spec, the real cooldown, the real muzzle, your aim. Sight-gated
// at the aim like every shot. T7: acc sharpens by POSSESS_ACC and the aim
// snaps to a live, seen enemy exactly like a possessed squad's volley —
// towers have no squadmates, so there is no corridor check.
export function possessedTowerFire(world, tower, aim, T, toUV = (x, z) => ({ u: x, v: z }), arcs, map) {
  const spec = TOWER_SPECS[tower.towerType];
  if (!spec || spec.fireRate <= 0) return false;
  tower.fireCd = tower.fireCd || 0;
  if (tower.fireCd > 0) return false; // mk2.58 (owner): THE COMMANDER'S EYE — possession is the player's own sight; no seen-gate on a possessed aim
  const live = snapTargetNear(world, aim, T, toUV);
  // Amendment 3 (owner): the possessed coil ALWAYS discharges — at the
  // snapped enemy when one is near the reticle, into the ground at the
  // reticle otherwise. The chain walks from wherever the bolt lands.
  if (spec.tesla) {
    if (!arcs) return false;
    tower.fireCd = spec.fireRate;
    tower.flashT = world.t;
    // Amendment 4 (owner): the possessed coil strikes ANY living body under
    // the crosshair — his own men included. snapTargetNear only locks
    // enemies, so scan both sides here; sight is already ruled at the aim.
    let mark = live;
    if (!mark) {
      let bd = POSSESS_SNAP_R * POSSESS_SNAP_R;
      for (const b of world.bodies) {
        if ((b.kind !== "unit" && b.kind !== "vehicle" && b.kind !== "mech") || !b.alive) continue;
        const dx = b.pos.x - aim.x, dz = b.pos.z - aim.z, d2 = dx * dx + dz * dz;
        if (d2 < bd) { bd = d2; mark = b; }
      }
    }
    if (mark) { teslaStrike(world, arcs, tower, mark); return true; }
    const gy = world.field.heightAt(aim.x, aim.z);
    arcs.push({
      nextAt: world.t, hits: 0, dmg: TOWER_SPECS.tesla.dmg,
      fx: tower.pos.x, fy: tower.pos.y + tower.hy + 0.9, fz: tower.pos.z,
      atk: tower.team === 2 ? "enemy" : "player", tid: 0, gx: aim.x, gy, gz: aim.z, hitIds: [], waters: [],
    });
    return true;
  }
  const sy = aim.y != null ? aim.y : world.field.heightAt(aim.x, aim.z);
  const tgt = live || { pos: { x: aim.x, y: sy, z: aim.z }, v: { x: 0, y: 0, z: 0 }, hy: sy - world.field.heightAt(aim.x, aim.z) }; // mk2.02: ground aim targets the SURFACE (owner) — the phantom body is dead; hy carries roof height over field ground through shooterFire's lead refresh
  tower.fireCd = spec.fireRate;
  tower.flashT = world.t;
  towerShot(world, tower, tgt, { ...spec, acc: spec.acc * POSSESS_ACC });
  return true;
}

// mk2.03 (owner): THE GRENADE — a thrown BODY on a 2.0s fuse from release.
// Physics owns the flight and the roll (bounce, settle, slide downhill);
// stepGrenades owns the clock. Airbursts happen; impact detonation never
// does. One throw, both sides. Two draws per throw (applyScatter's own),
// draw-count stable against the shot it replaces.
export function throwGrenade(world, thrower, muzzle, tgt) {
  const dx = tgt.pos.x - muzzle.x, dz = tgt.pos.z - muzzle.z;
  const d = Math.max(1, Math.hypot(dx, dz));
  const pitch = aimSolve(GRENADE.v, d, tgt.pos.y - muzzle.y, 9.8, false);
  const p = pitch == null ? 0.7 : Math.max(0.35, pitch); // a throw is always lobbed
  const raw = { x: (dx / d) * Math.cos(p), y: Math.sin(p), z: (dz / d) * Math.cos(p) };
  const dir = applyScatter(world, raw, 0.03);
  const g = addBody(world, { kind: "grenade", team: thrower.team, mass: GRENADE.mass, hx: GRENADE.hx, hy: GRENADE.hy, hz: GRENADE.hz,
    x: muzzle.x + dir.x * 0.6, y: muzzle.y + dir.y * 0.6, z: muzzle.z + dir.z * 0.6, hp: 999, friction: 0.5, restitution: 0.45 });
  g.v.x = dir.x * GRENADE.v; g.v.y = dir.y * GRENADE.v; g.v.z = dir.z * GRENADE.v;
  g.grenade = { t0: world.t, attacker: thrower.team === 2 ? "enemy" : "player", bounced: false };
  world.events.push({ type: "muzzle", x: muzzle.x, y: muzzle.y, z: muzzle.z, dx: dir.x, dy: dir.y, dz: dir.z, kind: "mg", weapon: "grenade" });
  if (!world._grenades) world._grenades = [];
  world._grenades.push(g);
  return g;
}
export function stepGrenades(world) {
  const L = world._grenades;
  if (!L || !L.length) return;
  for (let i = L.length - 1; i >= 0; i--) {
    const g = L[i];
    if (!g.alive) { L.splice(i, 1); continue; }
    if (!g.grenade.bounced && g.v.y > 0.5 && world.t - g.grenade.t0 > 0.2) {
      g.grenade.bounced = true;
      world.events.push({ type: "gbounce", x: g.pos.x, z: g.pos.z }); // audio-only, never hashed
    }
    if (world.t - g.grenade.t0 >= GRENADE.fuse) {
      explode(world, g.pos.x, g.pos.y, g.pos.z, { r: GRENADE.r, dmg: GRENADE.dmg, kv: GRENADE.kv, crater: GRENADE.crater, kind: "grenade", hitStruct: true, attacker: g.grenade.attacker });
      g.alive = false;
      const bi = world.bodies.indexOf(g);
      if (bi >= 0) world.bodies.splice(bi, 1);
      world.byId.delete(g.id);
      L.splice(i, 1);
    }
  }
}

// mk2.15 (owner): THE TESLA COIL. The tower's trigger starts a chain row on
// S.arcs; stepTesla walks the rows against LIVE positions, one hop every
// TESLA.hopS seconds — nearest body not yet hit, TESLA.hopR meters from the
// last victim, TESLA.maxHits total, damage stepping down TESLA.dmgStep to
// TESLA.dmgFloor. The spread is blind: any alive solid or soft body, either
// team, sight unchecked (the first strike was sight-checked at acquisition).
// A victim standing on a pond (or the dormant stream) electrifies the whole
// surface: every body on that water joins the reachable set, nearest first.
// Selection is nearest-first over live positions — deterministic, ZERO rng
// draws, so every stream stays byte-stable however the chain runs.
export const TESLA = { hopR: 8, maxHits: 8, dmgStep: 5, dmgFloor: 10, hopS: 0.15 }; // provisional (F5)

// what the chain may touch: units, crews, vehicles, mechs, towers, walls,
// masonry chunks, rocks, trees — "anything" (owner). Mech limbs resolve to
// the hull through applyDamage; the visited set tracks the HULL id so a
// mech is one body to the chain, not five.
function chainBody(b) {
  if (!b.alive) return false;
  return b.kind === "unit" || b.kind === "vehicle" || b.kind === "mech" || b.kind === "tower" || b.kind === "wall" || b.kind === "chunk" || b.kind === "rock" || b.kind === "tree";
}
const chainId = (b) => (b.mechRef && b.mechRef.hull ? b.mechRef.hull.id : b.id);

function onWater(x, z, map) { return map.pondAt(x, z) || (map.streamAt(x, z) ? "stream" : null); }

// one hop's pick, shared by the live walk and the hold-check: nearest body
// not in `hit`, within hopR of `from` OR standing on any water surface in
// `waters`. Pure — reads positions, mutates nothing.
function teslaNext(world, from, hit, waters, map) {
  let best = null, bd = Infinity;
  for (const b of world.bodies) {
    if (!chainBody(b) || hit.has(chainId(b))) continue;
    const dx = b.pos.x - from.x, dz = b.pos.z - from.z;
    const d2 = dx * dx + dz * dz;
    const w = waters.size ? onWater(b.pos.x, b.pos.z, map) : null;
    if (d2 > TESLA.hopR * TESLA.hopR && !(w && waters.has(w))) continue;
    if (d2 < bd) { bd = d2; best = b; }
  }
  return best;
}

// the trigger pull: one row, first hit due NOW (stepTesla lands it on the
// same tick the tower fires). `arcs` is S.arcs — plain rows, serialized as
// they stand (save.js), so a mid-chain save resumes mid-chain.
export function teslaStrike(world, arcs, tower, target) {
  arcs.push({
    nextAt: world.t, hits: 0, dmg: TOWER_SPECS.tesla.dmg,
    fx: tower.pos.x, fy: tower.pos.y + tower.hy + 0.9, fz: tower.pos.z,
    atk: tower.team === 2 ? "enemy" : "player", tid: target.id, hitIds: [], waters: [],
  });
}

export function stepTesla(world, arcs, map) {
  if (!arcs || !arcs.length) return;
  for (let i = arcs.length - 1; i >= 0; i--) {
    const a = arcs[i];
    while (a.nextAt <= world.t && a.hits < TESLA.maxHits) {
      const hit = new Set(a.hitIds), waters = new Set(a.waters);
      let victim = null;
      if (a.hits === 0 && !a.tid && a.gx != null) {
        // Amendment 3: a GROUND strike — the bolt lands on snow, damages
        // nothing itself, and the chain (damage ladder intact) walks from
        // the strike point if anything stands in hop range. Water at the
        // strike point conducts exactly as a body hit would.
        world.events.push({ type: "zap", x: a.fx, y: a.fy, z: a.fz, x2: a.gx, y2: a.gy + 0.2, z2: a.gz, hop: 0 });
        const w0 = onWater(a.gx, a.gz, map);
        if (w0) {
          a.waters.push(w0 === "stream" ? "stream" : w0);
          world.events.push({ type: "pondzap", x: w0 === "stream" ? a.gx : w0.x, z: w0 === "stream" ? a.gz : w0.z, r: w0 === "stream" ? 3 : w0.r });
        }
        a.fx = a.gx; a.fy = a.gy + 0.2; a.fz = a.gz;
        a.hits = 1;
        a.nextAt += TESLA.hopS;
        continue;
      }
      if (a.hits === 0) { // the strike: the acquired enemy, if it still lives
        const t = world.byId.get(a.tid);
        victim = t && chainBody(t) ? t : null;
      } else {
        victim = teslaNext(world, { x: a.fx, z: a.fz }, hit, waters, map);
      }
      if (!victim) { a.hits = TESLA.maxHits; break; }
      const vx = victim.pos.x, vy = victim.pos.y, vz = victim.pos.z;
      world.events.push({ type: "zap", x: a.fx, y: a.fy, z: a.fz, x2: vx, y2: vy, z2: vz, hop: a.hits });
      applyDamage(world, victim, a.dmg, { cause: "ZAP", attacker: a.atk, srcX: a.fx, srcZ: a.fz });
      const w = onWater(vx, vz, map);
      if (w && !waters.has(w)) {
        a.waters.push(w === "stream" ? "stream" : w); // pond object identity holds within a session; see the save row below
        world.events.push({ type: "pondzap", x: w === "stream" ? vx : w.x, z: w === "stream" ? vz : w.z, r: w === "stream" ? 3 : w.r });
      }
      a.hitIds.push(chainId(victim));
      a.hits++;
      a.dmg = Math.max(TESLA.dmgFloor, a.dmg - TESLA.dmgStep);
      a.fx = vx; a.fy = vy; a.fz = vz;
      a.nextAt += TESLA.hopS;
    }
    if (a.hits >= TESLA.maxHits) arcs.splice(i, 1);
  }
}

// the hold-check for the avoid-friendlies switch (Task 4 wires the switch;
// the check ships now so the suite pins it): plan the chain the trigger
// WOULD start, on current positions, and answer whether any friendly soft
// body gets caught. Pure, zero draws, no events.
export function teslaWouldCatchFriend(world, tower, target, map) {
  const own = tower.team === 2 ? 2 : 1;
  const hit = new Set(), waters = new Set();
  let from = { x: target.pos.x, z: target.pos.z }, dmgSteps = 1;
  let victim = target;
  while (victim && dmgSteps <= TESLA.maxHits) {
    if ((victim.kind === "unit" || victim.kind === "vehicle" || victim.kind === "mech") && victim.team === own) return true;
    hit.add(chainId(victim));
    const w = onWater(victim.pos.x, victim.pos.z, map);
    if (w) waters.add(w);
    from = { x: victim.pos.x, z: victim.pos.z };
    victim = teslaNext(world, from, hit, waters, map);
    dmgSteps++;
  }
  return false;
}

// ------------------------------------------------------------ squad wiring
// spawnSquadMembers(world, squad): a squad's members spawn as ORDINARY
// team-1 "unit" bodies (brief's sketch, adapted to addBody's real shape) so
// every existing unit-body system — territory emitters, fog, combat,
// physics — sees them for free. dress "human" (the player side reads human;
// androids are the enemy's dress). squadId back-references the roster so
// pruneSquads and the selection UI can walk body -> squad.
export function spawnSquadMembers(world, squad) {
  const spec = SQUAD_SPECS[squad.type];
  for (let i = 0; i < spec.n; i++) {
    const a = (i / spec.n) * Math.PI * 2, r = 1.2;
    // clearSlot (squads.js smallfix): a ring point overlapping a static solid
    // gets the man depenetration-ejected and slam-killed on his first tick —
    // spawn only on vetted ground (member hx 0.28 + the module's 0.35 pad).
    const p = clearSlot(world, squad.anchor.x + Math.cos(a) * r, squad.anchor.z + Math.sin(a) * r, 0.28 + 0.35);
    // P7 T7: member stats read per-type off SQUAD_SPECS[type].member,
    // falling back to today's literals — every existing type spawns
    // byte-identical. mk2.02: every man reads the one MAN row.
    const M = spec.member || MAN.rifle; // mk2.02: the one body — every man 2m
    const u = addBody(world, { kind: "unit", team: squad.team || 1, mass: M.mass, hx: M.hx, hy: M.hy, hz: M.hz,
      x: p.x, y: world.field.heightAt(p.x, p.z) + M.hy + 0.02, z: p.z, hp: M.hp, friction: 0.5 });
    u.utype = squad.type; u.squadId = squad.id; u.dress = "human"; // player side reads human
    u.maxHp = M.hp;
    // SMEARS ON (C0 T4, mk0.33): every man who falls leaves a permanent red
    // mark in the snow. smearStyle is render-only — the renderer's kill
    // handler reads it off the corpse; nothing in the sim branches on it.
    u.smearStyle = "human";
    // The pair (6.5 Task 6): a sniper squad is sniper + spotter. Member 0
    // carries the rifle; member 1 carries binoculars and NEVER fires until
    // converted (squadFire's role skip below).
    if (squad.type === "sniper") u.role = i === 0 ? "sniper" : "spotter";
    // mk0.23 troop identity: the MG team reads as gun + loader — member 0
    // carries the weapon, member 1 carries nothing. RENDER-ONLY roles: no
    // sim path branches on "gunner"/"loader" (only "sniper"/"spotter" are
    // read by squadFire, accuracy and units.js), and the one side effect —
    // squads.js setting u.settled for any roled man — is itself sim-inert.
    if (squad.type === "mg") u.role = i === 0 ? "gunner" : "loader";
    squad.memberIds.push(u.id);
  }
}

// Sandbag: instant (wall-exempt) cover at SANDBAG_COST scrap — a single STATIC sleeping
// chunk body tagged b.sandbag. Static (mass 0 -> invM 0) on purpose:
// squads.js's exposureAt filters out dynamic bodies (invM > 0), so a massy
// sandbag would never read as cover; core.js's projectile hit scan exempts
// chunk-kind from its invM-0 skip (~:691), so rounds still hit it and its
// 60hp still matters. DepotGame's territory emitter builder adds it under
// EMIT.wall (green influence, wall-weight).
// P1.5 Task 1 (mk0.50, Jeff): 3 -> 5 with the rest of the player's prices
// (+~50%, integers). The comment above still describes the body; only the
// price moved. // provisional (F5)
export const SANDBAG_COST = 5;
// orient (0|1) swaps hx/hz — axis-aligned bodies only, no rotation matrices.
// Orientation is player input, like placement coords: placement-state only,
// sim/determinism untouched (multiplayer-safe by the same argument).
// mk0.54 (Jeff, reverting mk0.52's cube): THE BAG IS THE SHAPE. The original
// 1.8 x 0.9 x 0.7 slab is the game's brick — the mk0.52 "one cube" reading of
// the brief turned it into a die and Jeff rejected it on sight. Old dims are
// back exactly (orient swaps hx/hz as before); walls are now built as three
// of THESE stacked (see buildAt) — one shape family for everything bagged.
export const SANDBAG_HX = 0.9, SANDBAG_HY = 0.45, SANDBAG_HZ = 0.35;
export function spawnSandbag(world, x, z, orient = 0, team = 1) {
  const y = world.field.heightAt(x, z);
  const b = addBody(world, {
    kind: "chunk", team, mass: 0,
    hx: orient === 1 ? SANDBAG_HZ : SANDBAG_HX, hy: SANDBAG_HY, hz: orient === 1 ? SANDBAG_HX : SANDBAG_HZ,
    x, y: y + SANDBAG_HY, z, hp: 60, friction: 0.7, restitution: 0.02,
  });
  b.orient = orient;
  b.sandbag = true;
  b.sleeping = true;
  b.maxHp = b.hp;
  return b;
}

// P7 T17 (owner): ENGINEERS BUILD WITH THEIR HANDS — the reach test, pure
// and exported for the suite (the T8/T10 factoring precedent). A live squad
// member within reach meters of the row's spot.
export function memberNearRow(world, sq, row, reach) {
  for (const id of sq.memberIds) {
    const u = world.byId.get(id);
    if (u && u.alive && Math.hypot(u.pos.x - row.x, u.pos.z - row.z) <= reach) return true;
  }
  return false;
}

// P7.2 T1 (owner): EASIER SELECTION — the field tap radii, one home.
// Squad was a hard-coded 1.6 in squadAtPoint, hull 3.2 in vehicleAtPoint;
// towers had no proximity pick at all (exact cell only). // provisional (F5)
export const TAP_SQUAD_M = 2.4;
export const TAP_HULL_M = 4.0;
export const TAP_TOWER_M = 2.4;

// nextPick: the tap-cycle rule, pure. cands = [{ key, d }] — key unique per
// pickable thing, d its distance from the tap. Nearest first, ties broken by
// key order; when the current pick is in the list the NEXT one around wins,
// wrapping. Deterministic, no rng.
export function nextPick(cands, curKey) {
  if (!cands || cands.length === 0) return null;
  const sorted = cands.slice().sort((a, b) => (a.d - b.d) || (a.key < b.key ? -1 : 1));
  if (curKey == null) return sorted[0];
  const i = sorted.findIndex((c) => c.key === curKey);
  return sorted[(i + 1) % sorted.length]; // absent current (-1) lands on the nearest
}

// SELECT ALL OF TYPE (owner): every squad of the type still holding a live
// member. Sealed riders (P7 T4) are not tappable and not selectable here.
export function squadIdsOfType(world, squads, type) {
  const out = [];
  for (const sq of squads) {
    if (sq.type !== type || sq.ridingIn != null) continue;
    if (sq.memberIds.some((id) => { const u = world.byId.get(id); return u && u.alive; })) out.push(sq.id);
  }
  return out;
}

// sandbagOrientAt: AUTO-CONTINUE. If (x,z) lands within 2.2m of an existing
// live sandbag, orient along the line to the NEAREST such bag (|dx| >= |dz|
// -> long axis x, orient 0; else orient 1) — overrides the toggle for that
// placement. Isolated placements (line starts) fall back to toggleOrient.
export function sandbagOrientAt(world, x, z, toggleOrient) {
  let best = null, bestD2 = 2.2 * 2.2;
  for (const b of world.bodies) {
    if (!b.sandbag || !b.alive) continue;
    const dx = b.pos.x - x, dz = b.pos.z - z, d2 = dx * dx + dz * dz;
    if (d2 <= bestD2) { bestD2 = d2; best = b; }
  }
  if (!best) return toggleOrient;
  return Math.abs(best.pos.x - x) >= Math.abs(best.pos.z - z) ? 0 : 1;
}

// pruneSquads(world, squads): roster hygiene, run once per tick BEFORE
// stepSquad/squadFire (the loop-order contract: prune dead members ->
// delete empty squads -> step -> fire). A member whose body is dead OR
// already swept out of world.byId (DepotGame's 2.5s corpse cleanup is
// team-agnostic by design) leaves the roster; a squad with no members left
// is deleted. Returns the filtered array; the surviving squad objects are
// the same references (selection ids stay valid).
export function pruneSquads(world, squads) {
  for (const sq of squads) {
    sq.memberIds = sq.memberIds.filter((id) => {
      const u = world.byId.get(id);
      return !!u && u.alive;
    });
    // The pair's degradation (6.5 Task 6): sniper dies -> the spotter
    // converts to a lone rifleman — utype/spec swap to rifles, squad
    // relabels (SQUAD_SPECS lookup follows type), existing one-man-squad
    // machinery carries it. He KEEPS his current hp (same man, different
    // tool — no heal, no reset). Spotter dies -> nothing here: direction
    // simply never re-runs (directPair requires both roles alive).
    if (sq.type === "sniper") {
      const members = sq.memberIds.map((id) => world.byId.get(id));
      const hasSniper = members.some((u) => u && u.role === "sniper");
      const spotter = members.find((u) => u && u.role === "spotter");
      if (!hasSniper && spotter) {
        sq.type = "rifles";
        sq._spotGoal = null; sq._snipeGoal = null; sq._threatSig = undefined;
        spotter.role = undefined; spotter.utype = "rifles"; spotter.settled = false;
      }
    }
  }
  return squads.filter((sq) => sq.memberIds.length > 0);
}

// ------------------------------------------------------- fire discipline
// friendlyFouls: does THIS round's actual flight path pass through one of
// our own team-1 walls/towers, or a town/depot chunk (team 0)? Same arc
// sampler arcClears (accuracy.js) uses — "arc" specs march the true
// ballistic arc, "lofted" specs only check the muzzle climb-out cone
// (first 15% of flight; a mortar's near-vertical climb still risks its own
// crew's wall overhang, but the rest of its lob is deliberately unchecked,
// mirroring arcClears) — kept as a sibling here rather than imported so the
// friendly-kind filter (team-1 wall/tower + team-0 chunk, +0.4m margin) can
// live next to it without threading a filter callback through arcClears's
// hot path. No rng; pure.
const FRIENDLY_MARGIN = 0.4;
// selfId (Task 6 fix): the shooter's OWN body was never excluded — the
// sampler's first point (s=0.9m from the muzzle) routinely lands inside
// the shooter's own hx/hy/hz+margin box on anything but a dead-flat, long
// shot, so every tower was self-blocking a huge fraction of its own shots
// under CAREFUL (probe's PROBE_DIAG counters caught this: held >>> fired,
// traced to `BLOCK by tower:mg id=N ... blocking point` matching that same
// tower's own position). Passing the shooter's id through lets the check
// skip its own body while still catching every OTHER friendly it might hit.
function friendlyBlocksPoint(world, x, y, z, selfId) {
  const pool = world._L ? world._L.friendly : world.bodies; // T10
  for (const b of pool) {
    // Kind-not-mobility filter (6.5 Task 1, mirrors solidBlocksPoint):
    // town/depot chunks are dynamic (mass 88-320), so the old `invM > 0`
    // skip made the team-0-chunk clause below dead code — CAREFUL never
    // actually held the shot the depot would have caught.
    if (!b.alive || (selfId != null && b.id === selfId)) continue;
    const friendly = ((b.kind === "wall" || b.kind === "tower") && b.team === 1) ||
                      // enemy depot masonry (town "depot2") is a VICTORY TARGET,
                      // not a friendly — CAREFUL must never hold fire for it
                      (b.kind === "chunk" && b.team === 0 && b.town !== "depot2");
    if (!friendly) continue;
    if (b.invM > 0 && b.kind !== "chunk") continue; // dynamic non-masonry never fouls
    if (Math.abs(x - b.pos.x) <= b.hx + FRIENDLY_MARGIN &&
        Math.abs(y - b.pos.y) <= b.hy + FRIENDLY_MARGIN &&
        Math.abs(z - b.pos.z) <= b.hz + FRIENDLY_MARGIN) return true;
  }
  return false;
}

// 6.5 Task 2: the private 0.9m-step analytic parabola is gone — friendlyFouls
// marches the SAME flight model arcClears predicts with (accuracy.js's
// marchArc: engine-cadence samples, integrator-exact Euler heights; lofted
// specs keep the climb-out-cone contract). One flight model, two questions —
// this one asks friendlyBlocksPoint. marchArc's null (no ballistic solution:
// there is no flight, so nothing to foul) reads as no-foul, exactly as the
// old `pitch == null -> false` did.
export function friendlyFouls(world, muzzle, target, spec, selfId) {
  return marchArc(world, muzzle, target, spec,
    (x, y, z) => friendlyBlocksPoint(world, x, y, z, selfId)) === true;
}

// ------------------------------------------------------- structural loss
// The depot is a physical lattice of chunks (buildTown, DepotGame.jsx) — its
// own health bar IS the building. "Standing" means alive AND still within
// DEPOT_STANDING_TOL of the chunk's home position: a stone a mortar has
// launched off its perch reads as gone even if the body is technically still
// alive and asleep somewhere downrange (matches the campaign's demolition
// semantics — displacement counts as destruction, not survival).
export const DEPOT_STANDING_TOL = 1.2; // meters
export const DEPOT_BREACH_FRAC = 0.40; // P7 T3 (owner): really knocked down — was 0.58 // provisional (F5)
export const DEPOT_CENSUS_HZ = 1; // census cadence — NOT per frame
export const STAND_SLIDE_M = 4;    // P7 T6: an UPRIGHT piece slid this far still stands // provisional (F5)
export const STAND_UPRIGHT = 0.7;  // R[4] above this reads as upright // provisional (F5)

// censusDepotChunks: called once at buildTown time. bodies is world.bodies
// (or any array of chunk-like {id, kind, town, pos}) — picks out one town's
// own chunks (b.town === townId) and records id + home (x, y, z) at build
// time, before anything's had a chance to move. Pure, no world/rng deps.
// FRONT F1: townId parameter — "depot" (default, today's callers) or
// "depot2" (the enemy depot's lattice).
// SIEGE FIX (mk0.21): the census ALSO stamps each stone's home onto the body
// itself (b.home, the very object the census row holds). Sappers need the
// standing/rubble verdict at plant time and have no census in hand — this
// makes the census's own rule readable from any body, with no threading and
// no second source of truth. The one mutation is documented here and in
// standingStructure below; everything else about this function stays pure.
export function censusDepotChunks(bodies, townId = "depot") {
  const out = [];
  for (const b of bodies) {
    if (b.kind !== "chunk" || b.town !== townId) continue;
    const home = { x: b.pos.x, y: b.pos.y, z: b.pos.z };
    b.home = home;
    out.push({ id: b.id, home, m: b.mass }); // P7 T6: the fraction weighs mass — a panel outranks a crown stone
  }
  return out;
}

// standingStructure(b): "is this still the BUILDING, or is it a corpse?" —
// depotStandingFraction's rule, asked of one body. Census-stamped stone
// (b.home) counts only while it sits within DEPOT_STANDING_TOL of where it
// was built; anything else with no home (walls, towers, un-censused fixture
// stone) is standing by definition — it has never been knocked anywhere.
// Sappers (both signs) filter their targets through this: rubble is a corpse,
// and the assault is on the building.
// P7 T6: this stays the TIGHT rule (no upright-slide tolerance) on purpose —
// a plant target is asked "is this a corpse to walk past", not "does the
// depot's health bar still count it"; a slid-but-upright panel is still in
// the sapper's way just as much as one flush on its footprint.
export function standingStructure(b) {
  if (!b || !b.alive) return false;
  const h = b.home;
  if (!h) return true;
  const dx = b.pos.x - h.x, dy = b.pos.y - h.y, dz = b.pos.z - h.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz) <= DEPOT_STANDING_TOL;
}

// depotStandingFraction: fraction of the census still standing, WEIGHTED BY
// MASS (P7 T6, owner: a 750kg panel outranks a crown stone) and upright-
// tolerant (a piece merely SLID but still standing on its feet is still the
// building — only a toppled or far-flung piece reads as gone; see
// STAND_SLIDE_M/STAND_UPRIGHT below). byId is a Map (world.byId works
// directly) or anything with a .get(id) -> body-like {alive, pos:{x,y,z},R}.
// A census entry with no live body at all (welded off and despawned) counts
// as not-standing, same as one that's merely wandered past the tolerance.
// Empty census reads as 1.0 (nothing to lose yet/ever — callers should not
// invoke this before buildTown has run). Census back-compat: rows with no
// `m` (every pre-T6 synthetic fixture) weigh 1 each, so the old unweighted
// arithmetic is unchanged for them.
export function depotStandingFraction(census, byId) {
  if (!census || census.length === 0) return 1;
  let stand = 0, total = 0;
  for (const c of census) {
    const w = c.m || 1;
    total += w;
    const b = byId && byId.get ? byId.get(c.id) : null;
    if (!b || b.alive === false) continue;
    const dx = b.pos.x - c.home.x, dy = b.pos.y - c.home.y, dz = b.pos.z - c.home.z;
    const near = Math.sqrt(dx * dx + dy * dy + dz * dz) <= DEPOT_STANDING_TOL;
    // P7 T6 (owner): an upright piece merely SLID is still the building —
    // topple it or bury it to erase it. Horizontal band, small drop, upright.
    const slidUpright = !near && b.R && b.R[4] > STAND_UPRIGHT &&
      Math.hypot(dx, dz) <= STAND_SLIDE_M && Math.abs(dy) < 1.0;
    if (near || slidUpright) stand += w;
  }
  return stand / total;
}

// checkDepotBreach: the second (independent) LOSS track, alongside checkLoss
// (lives). Idempotent — no-op once the run has already ended, same contract
// as checkLoss, and the two never fight: whichever fires first sets gameOver
// and the other's own guard keeps it from overwriting the outcome.
export function checkDepotBreach(S, fraction) {
  if (S.gameOver || S.victory) return false;
  if (fraction < DEPOT_BREACH_FRAC) {
    S.gameOver = true;
    S.breach = true;
    return true;
  }
  return false;
}

// checkEnemyBreach (FRONT F1): the OTHER loss track's mirror — their depot
// below the standing threshold ends the war in the Bureau's favor. Same
// idempotence contract as checkDepotBreach; whichever fires first wins and
// the other's guard keeps it from overwriting the outcome.
export function checkEnemyBreach(S, fraction) {
  if (S.gameOver || S.victory) return false;
  if (fraction < DEPOT_BREACH_FRAC) { // same threshold both sides (symmetry; provisional, F5)
    S.victory = true;
    S.enemyBreach = true;
    return true;
  }
  return false;
}

// stepDepotCensus: the ~1Hz gate. Accumulates dt on S.depotCensusAcc and only
// invokes computeFraction (the caller's — usually
// depotStandingFraction(census, world.byId) — actual work) once the
// accumulator crosses 1/DEPOT_CENSUS_HZ seconds, matching the territory
// step's own accumulator pattern (DepotGame.jsx's TERR_STEP) rather than
// re-scanning every chunk every frame. Returns true the tick it actually ran
// the census (so callers can e.g. throttle a debug log to the same cadence).
export function stepDepotCensus(S, dt, computeFraction) {
  S.depotCensusAcc = (S.depotCensusAcc || 0) + dt;
  if (S.depotCensusAcc < 1 / DEPOT_CENSUS_HZ) return false;
  S.depotCensusAcc -= 1 / DEPOT_CENSUS_HZ;
  // FRONT F1: computeFraction may return {player, enemy} (both depots) or a
  // bare number (legacy player-only callers) — one gate, two readings.
  const f = computeFraction();
  const player = typeof f === "number" ? f : f.player;
  const enemy = typeof f === "number" ? 1 : f.enemy;
  S.depotStanding = player;
  S.enemyStanding = enemy;
  checkDepotBreach(S, player);
  checkEnemyBreach(S, enemy);
  return true;
}

// ------------------------------------------------------------------ the bell
// THE MUSTER BELL — the war's shared clock, and the only thing that brings an
// assault. It runs on SIM time (world.t, advanced by DepotGame.jsx's
// fixed-step accumulator); wall clock and React state are both forbidden here
// by the same law the rest of this file lives under.
// P1.5 Task 1 (mk0.50, Jeff): the cycle tightens 120 -> 90. The bell is the
// only clock the war runs on, so every downstream stamp (card arms, spawn
// pacing, the withdrawal window) moves with it for free — nothing else in the
// file reads a hard 120.
export const BELL_PERIOD_S = 90;   // provisional (F5)

// Bell index at which the enemy's tiers 1/2/3/4 open. Bell 1 is the FIRST
// bell of a match, so tier 1 marches with the opening assault. P7 T9 (owner):
// the 4th tier, the hero tier, opens dear and late. // provisional (F5)
export const TIER_BELLS = [1, 3, 5, 10];

// The enemy's ladder: ENEMY_SPECS tags (plus "tank", TANK's own row) by tier.
// Conscripts ("") are never gated — they are what a regiment has before it
// has anything. Task 2 writes the player's mirrored table in specs.js against
// these exact rows; both sides climb on the same bells.
export const ENEMY_TIERS = [
  ["rocket", "gren"],   // tier 1 — rocket troops, grenadiers (mk2.02: the roster surgery)
  ["mortar", "sapper"], // tier 2 — mortar team, sappers
  ["sniper", "tank"],   // tier 3 — marksmen, armour
  ["hero_bison", "hero_apc"], // tier 4 — THE HERO TIER (owner): lost armor returns off the convoy, dear
];

// ---------------------------------------------------------------- the ladder
// THE RULE, both sides, one sentence: a tier's BELL is a ceiling and a PICK is
// the key — an item needs both. Nothing may be offered before its tier's bell,
// so no enemy tag can ever field earlier than TIER_BELLS says (Task 1's
// contract, unchanged); and an open tier still yields only ONE item per bell to
// each side, so the two ladders climb at the same rate and almost never in the
// same order. enemyTierState reads the pick list and re-applies the bell gate
// on top of it, so a corrupt/ahead-of-schedule pick list cannot leak a tag
// early even if something upstream mis-fills it.
export function tierOpenCount(bell) {
  let n = 0;
  for (let i = 0; i < TIER_BELLS.length; i++) if (bell >= TIER_BELLS[i]) n++;
  return n;
}
export function enemyTierOf(tag) {
  for (let i = 0; i < ENEMY_TIERS.length; i++) if (ENEMY_TIERS[i].indexOf(tag) >= 0) return i;
  return -1;
}

// enemyTierState(bell, unlocked) -> { bell, tags }: every tag an assault at
// this bell may contain. `unlocked` is the attacker's own pick list (S.foe.
// unlocked); an empty/omitted list means they have picked nothing yet, so the
// assault is conscripts only. Pure, no rng.
export function enemyTierState(bell, unlocked = []) {
  // P7.2 T4 (owner): the bell clamp is DEAD — a bought plan fields at
  // once, the full mirror of the player's instant build rights. The
  // signature keeps the bell for its callers; membership in his unlocked
  // list is the whole gate now.
  const tags = [""];
  for (const t of unlocked) if (tags.indexOf(t) < 0) tags.push(t);
  return { bell, tags };
}

// ------------------------------------------------------------- the manifest
// The convoy. At every bell the player is offered 2-3 items off the open tiers
// and takes ONE; the enemy picks one from its own mirrored table (specs.js
// carries both ladders written side by side).
//
// DRAW-COUNT LAW: both hands consume a fixed HAND_DRAWS (5) each side, drawn
// up front and then clamped/spliced, never drawn-if; an exhausted pool still
// burns its draws so two clients on the same seed stay in step forever.
// P7.2 T2 (owner): THE HAND — five draws per bell, the fixed split: three
// plan draws over the not-yet-unlocked pool, two hire draws over the full
// list. Draw-then-clamp: an exhausted plans pool still burns its three.
export const HAND_DRAWS = 5;

export function makeManifestState() {
  return { unlocked: PLAYER_START.slice(), hand: [], offerBell: 0, cardUp: false, armedAt: 0 };
}
export function makeFoeState() {
  return { unlocked: [], hired: [], towers: [] };
}

// dealConvoyHand(unlocked, keys, rng) -> up to five rows { k, hire }.
// Exactly HAND_DRAWS draws, always: three spliced plan picks over the
// unowned pool, two spliced hire picks over the full list. A plan and a
// hire may name the same type — different products (one teaches, one
// delivers). No bell gate anywhere (owner).
export function dealConvoyHand(unlocked, keys, rng) {
  const plans = keys.filter((k) => unlocked.indexOf(k) < 0);
  const hand = [];
  for (let i = 0; i < 3; i++) {
    const d = rng();
    if (!plans.length) continue; // the draw burned; the pool had nothing left
    const j = Math.min(plans.length - 1, Math.floor(d * plans.length));
    hand.push({ k: plans.splice(j, 1)[0], hire: 0 });
  }
  const hires = keys.slice();
  for (let i = 0; i < 2; i++) {
    const d = rng();
    const j = Math.min(hires.length - 1, Math.floor(d * hires.length));
    hand.push({ k: hires.splice(j, 1)[0], hire: 1 });
  }
  return hand;
}

// takeHandCard(M, key, hire): one row leaves the hand — multi-buy is the
// law (owner), so nothing else closes. The last row leaving drops the card.
export function takeHandCard(M, key, hire) {
  if (!M || !M.hand) return false;
  const i = M.hand.findIndex((c) => c.k === key && c.hire === (hire ? 1 : 0));
  if (i < 0) return false;
  M.hand.splice(i, 1);
  if (!M.hand.length) M.cardUp = false;
  return true;
}

export function isUnlocked(M, key) {
  return !!M && M.unlocked.indexOf(key) >= 0;
}

// The in-flight assault's ledger: what is still walking out of the spawn
// points, and what it has taken off the player since it mustered. One assault
// is live at a time; the next bell overwrites this whether the last one is
// spent or not.
export function makeAssaultState() {
  return { spawnQueue: 0, spawnTimer: 0, spawnDelay: 1, mixBag: [], results: null, fielded: 0, musterScrap: null, spawnDoneT: null, withdrawn: false, withdrew: 0 };
}

// Seconds of SIM time after an assault finishes spawning before its survivors
// break contact and withdraw in order.
export const ASSAULT_TIMEOUT = 75;

export function makeRunState({ startResources = 250 } = {}) { // P7.2 T8 (owner): the draft's richer opening // provisional (F5)
  return {
    resources: startResources, score: { p: { kills: 0, value: 0 }, e: { kills: 0, value: 0 } },
    ws: makeAssaultState(), spawnRR: 0,
    arcs: [], // mk2.15: live tesla chains — plain rows, saved as they stand
    holdArea: { 1: false, 2: false }, // mk2.18 (owner): area weapons hold fire with a friendly in the spread — tesla chain + davy blast; per side, both start OFF; nothing flips side 2 today
    mode: "wall", sellMode: false, inspectId: null,
    started: false, gameOver: false, victory: false, attrition: false, ledgerLoss: false,
    starvedStreak: 0, spent: false,
    paused: false, speed: 1,
    // The clock. bellAt is the absolute SIM-clock stamp the next bell is due
    // at; bellT is the readout derived from it (see stepBell).
    bell: 0, bellT: BELL_PERIOD_S, bellAt: BELL_PERIOD_S,
    lastDispatch: null,
    // The two ladders (Task 2). manifest = the player's unlocked set + the
    // convoy's live offer; foe = the attacker's own pick list, which feeds
    // enemyTierState's cap.
    manifest: makeManifestState(), foe: makeFoeState(),
    intelUp: false, intelArmedAt: 0,
    zoom: 1, acc: 0, t: 0, fps: 60, fpsAcc: 0, fpsN: 0,
    hover: null, pointer: null, toasts: [],
    hudT: 0, keys: {}, sellById: null,
  };
}

// Bureau copy for the bell's dispatch. Pure + deterministic (no RNG —
// depot-lint forbids it): `bell` is the bell that just rang. intelLines
// (already composed by the caller — composeIntel/openingIntel run their own
// seeded rng draws before this is called) sit under the header. The card no
// longer gates anything — nothing stops the war for a page of prose — so it
// closes on an end-of-transmission line rather than an instruction.
export function makeDispatch(bell, intelLines = []) {
  const wo = "WO-" + String(1000 + bell).padStart(4, "0");
  return {
    wo,
    lines: [
      `MUSTER BELL ${bell}. THE COLUMN IS MOVING.`,
      ...intelLines,
      "END OF TRANSMISSION.",
    ],
  };
}

// Player-side book value: scrap on hand plus the build cost of every
// standing structure. snap is the same shape DepotGame.jsx's buildSnapshot()
// produces ({mortars, mgs, guns, rockets, teslas, walls}) — live body counts
// by type, read fresh at the moment of the verdict. guns and rockets are
// counted separately and valued at each tower's own real spec cost — the
// AI's counter-play signal elsewhere still lumps gun+rocket together (that's
// a shopping-pressure heuristic, not a ledger), but the book-value verdict
// must not undervalue (or overvalue) a rocket tower at gun price.
function playerBookValue(S, snap) {
  const s = snap || {};
  const assets =
    (s.mortars || 0) * TOWER_SPECS.mortar.cost +
    (s.mgs || 0) * TOWER_SPECS.mg.cost +
    (s.guns || 0) * TOWER_SPECS.gun.cost +
    (s.rockets || 0) * TOWER_SPECS.rocket.cost +
    (s.teslas || 0) * TOWER_SPECS.tesla.cost +
    (s.walls || 0) * WALL_COST;
  return bookValue({ scrap: S.resources, assets });
}

// Attacker-side book value: regiment scrap plus the purchase-price value of
// its surviving unfielded pool (heads at conscript price, tanks at tank
// price — same ENEMY_SPECS/TANK bounty values ai.js spends at muster).
function attackerBookValue(S) {
  if (!S.reg) return 0;
  const assets = S.reg.heads * ENEMY_SPECS[""].bounty + S.reg.tanks * TANK.bounty;
  return bookValue({ scrap: S.reg.scrap, assets });
}

// Stub alternate loss condition — a future phase adds a regiment (a
// player-side unit group) that can be wiped out mid-run. Always false for
// now; the hook exists so callers already check it.
export function regimentDestroyed(S) {
  return false;
}

// FRONT F1: lives are gone — the depot's masonry is its own health bar
// (checkDepotBreach sets gameOver directly). What remains here is the
// stubbed regiment-destroyed hook, kept so a future player-side regiment
// wipe still has its single loss gate. Idempotent, headless-testable.
// --- the ending's dignity (mk0.29) ------------------------------------------
// A breach used to slam the dispatch card up the same instant the depot's
// standing fraction crossed the line: the collapse the player just caused
// happened behind a scrim. Now the verdict stamps the world clock, the world
// keeps simming and rendering, and the card mounts END_CARD_DELAY_S later.
// Deterministic (a world-clock stamp, no rng, no wall clock), idempotent (the
// first verdict tick owns the stamp).
export const END_CARD_DELAY_S = 6;   // provisional feel number — Jeff tunes by play
export function stampEnd(S, nowT) {
  if ((S.gameOver || S.victory) && S.endedAt == null) S.endedAt = nowT;
  return S.endedAt;
}
export function endCardReady(S, nowT, delay = END_CARD_DELAY_S) {
  if (!S.gameOver && !S.victory) return false;
  if (S.endedAt == null) return false;
  return nowT - S.endedAt >= delay;
}

export function checkLoss(S) {
  if (S.gameOver || S.victory) return false;
  if (regimentDestroyed(S)) {
    S.gameOver = true;
    return true;
  }
  return false;
}

// FRONT F1: RETIRED AS AN ENDING — nothing in the cycle calls this (the only
// enders are the two breaches). Kept exported because the economy probe still
// reads the book-value verdict; F5 may delete it.
export function checkWin(S, snap = {}) {
  if (playerBookValue(S, snap) >= attackerBookValue(S)) {
    S.victory = true;
  } else {
    S.gameOver = true;
    S.ledgerLoss = true;
  }
  return S.victory;
}

// End-of-run dispatch copy — same teletyped card style as the between-wave
// stall dispatch. FRONT F1: only two endings exist — a depot fell. Victory
// means THEIR depot is rubble; loss means YOURS is. The retired verdict
// branches (attrition, spent, ledger, final-wave) are gone with their
// endings; extra fields in the argument object are tolerated and ignored.
export function makeEndDispatch({ victory, score = null }) {
  const wo = "WO-9999";
  const s = score || { pk: 0, pv: 0, ek: 0, ev: 0 };
  const tally = `${s.pk} CONFIRMED, ◆${s.pv} DESTROYED. ITS COUNT: ${s.ek}, ◆${s.ev}.`;
  if (victory) {
    return {
      wo,
      lines: [
        "THE OPPOSING DEPOT IS BREACHED.",
        "The position opposite is rubble. The field belongs to the Bureau.",
        tally,
        "FIELD ORDER CLOSED.",
      ],
    };
  }
  return {
    wo,
    lines: [
      "THE DEPOT IS BREACHED.",
      "The position is lost. Withdrawal under fire.",
      tally,
    ],
  };
}

// THE KILL LAW (owner, 2026-08-20): one attributed kill — the victim's live
// market price scores the killer's ledger WHOLE, and KILL_CUT of it lands on
// the killer's books. Attribution is the event's own attacker: "player" and
// "enemy" are the two sides; "world" (craters, drowning, collapses, fire)
// and friendly fire pay and score nobody. Men and machines count the kill
// integer; masonry rides the value alone. A wall's upper courses never score
// — one wall, one death (the WALL_UPPER_GROUP rule). A sandbag's side is
// bagSide, never team (spawnSandbag stamps team 1 on every bag).
// Pure over (S, ev, counts); returns what it did, or null. No rng.
export function scoreKill(S, ev, counts) {
  if (ev.type !== "kill") return null;
  const att = ev.attacker === "player" ? 1 : ev.attacker === "enemy" ? 2 : 0;
  if (!att) return null;
  const victim = ev.sandbag ? ev.bagSide : ev.team;
  if (victim !== 1 && victim !== 2) return null;
  if (att === victim) return null; // friendly fire pays nobody
  if (ev.kind === "wall" && ev.group === WALL_UPPER_GROUP) return null;
  const kp = killPrice(ev, counts, WALL_COST, SANDBAG_COST);
  if (!kp) return null;
  const pay = kp.price * KILL_CUT;
  const led = att === 1 ? S.score.p : S.score.e;
  led.value += kp.price;
  if (kp.counted) led.kills++;
  if (att === 1) S.resources += pay;
  else if (S.reg) { S.reg.scrap += pay; if (pay > 0) S.reg.earned = (S.reg.earned || 0) + pay; } // mk2.53: kill pay is earnings; mk2.54: a zero credit accrues nothing — the ruled guard, every credit site
  return { side: att, price: kp.price, pay, counted: !!kp.counted };
}

// The bell cycle — the single source of truth for when an assault marches.
// Kept dependency-free (no world/render refs) so it is headless-testable from
// scripts/depot-test.mjs and so DepotGame.jsx's frame loop and the offline
// test drive the exact same code path.

// A wave's mix ([tag, count] pairs) expands into a bag of tags, then a
// fixed-stride-7 shuffle interleaves types instead of clumping them.
// Deterministic — no RNG (the stride is a constant), so this needs no
// world.rng() plumbing.
function buildMixBag(mix) {
  const bag = [];
  for (const m of mix) for (let i = 0; i < m[1]; i++) bag.push(m[0]);
  const out = [];
  let i = 0;
  while (bag.length) { i = (i + 7) % bag.length; out.push(bag.splice(i, 1)[0]); }
  return out;
}

// stepBell(S, worldT): the clock, and only the clock. Returns true on the
// tick the bell is due; the caller rings it (fireBell) so this stays free of
// world and rng dependencies. bellAt is an absolute SIM-clock stamp, not a
// per-frame subtraction, so the period cannot drift with frame length — and
// because world.t only advances while the sim steps, a paused or unstarted
// run holds the bell exactly where it was.
export function stepBell(S, worldT) {
  S.bellT = Math.max(0, S.bellAt - worldT);
  if (worldT < S.bellAt) return false;
  S.bellAt = worldT + BELL_PERIOD_S;
  S.bellT = BELL_PERIOD_S;
  return true;
}

// fireBell(S, opts) — THE BELL. opts: { reg (the attacker's live regiment —
// makeRegiment output, mutated in place by planWave), snap (buildSnapshot),
// rng (world.rng), t (world.t — the card arm stamps and the spawn-done stamp
// on an empty muster) }.
//
// Fixed order, and the order is the design — it is the order the player reads
// it in, top to bottom:
//   1. the cycle that just ended pays out — the attacker banks what its
//      assault took off the player (payResults);
//   2. the intel report — what the desk learned about the LAST muster;
//   3. the cycle's income — the player's scrap and the attacker's stipend;
//   4. the hand — the convoy's five cards, three plans and two hires;
//   5. the enemy's own pick, then the muster — planWave composes the assault
//      under the cap their picks (and the bell) allow;
//   6. the bureau's read of that muster, onto the re-readable dispatch.
//
// Nothing waits: an assault still standing on the field when the bell rings is
// simply joined by the next one, and NO card gates the muster — steps 2 and 4
// only raise cards; step 5 marches whether or not they are ever read.
export function fireBell(S, opts = {}) {
  const { reg = null, snap = null, rng = null, t = null, priceOf = null, priceP = null, possessed = false } = opts;
  const ws = S.ws;
  const prevWithdrew = ws.withdrew || 0;
  const nowT = t == null ? 0 : t;

  // 1. the closing cycle's results
  if (reg && ws.results) payResults(reg, ws.results);

  // The bell index advances here: bell 1 is the first bell of a match, and
  // everything below — tier gates, offers, the muster — reads THIS bell.
  S.bell++;

  // 2. the intel report. Intel delay buffer: the plan that governed the
  // PREVIOUS assault (still sitting in S.pendingPlan from the prior bell) is
  // the one-bell-old source composeIntel reads; the muster below replaces it.
  // The handoff is hoisted out of the muster so the card can be composed
  // before the assault it precedes is planned. First bell of a run: no plan
  // history, so it gets the opening strength estimate instead (no rng draws).
  S.intelPlan = S.pendingPlan || null;
  let intelLines = [];
  if (rng && reg) {
    if (S.bell === 1) intelLines = [openingIntel(reg)];
    else intelLines = composeIntel(S.intelPlan, reg, rng, S.cmdr); // P7 T8: the commander family, threaded through
  }
  // P1.5 Task 1 (mk0.50, Jeff): the intel card no longer AUTO-RAISES. The
  // report is still composed every bell and still written to S.lastDispatch
  // below — the bell chip in the top bar re-reads it any time — but it stops
  // putting itself in front of the player at the exact moment the assault
  // steps off. The manifest card still raises itself (it is a decision, not a
  // report). intelArmedAt is still stamped so the re-read path and the save
  // round-trip keep their shape; nothing raises on it now.
  S.intelUp = false;
  S.intelArmedAt = nowT + PENDING_ARM_S;

  // 3. the income — the per-second clock, ground-scaled, both sides, in the
  // frame loop (mk2.49). The bell pays neither side; its only regiment
  // credit is payResults in step 1 and the town pay the caller applies.

  // 4. the hand. Five cards — three plans, two hires — dealt fresh every
  // bell. A skipped bell is overwritten; unpicked plans are still in the
  // pool next bell (the pool derives from what is unlocked), so nothing is
  // lost and nothing banks.
  if (rng) {
    if (!S.manifest) S.manifest = makeManifestState();
    const M = S.manifest;
    M.hand = dealConvoyHand(M.unlocked, HAND_KEYS, rng);
    M.offerBell = S.bell;
    M.cardUp = M.hand.length > 0 && !opts.possessed; // mk2.02: THE CONVOY WAITS (owner) — no deal opens over a live possession; release opens it (the fact rides opts since the T3 split)
    M.armedAt = nowT + PENDING_ARM_S;
  }

  // 5. HIS HAND, then the muster — the full mirror (P7.2 T4). Five draws,
  // the step-4 shape; the buys are a deterministic walk in dealt order
  // (zero draws): every card he can afford while keeping a muster floor
  // in the till. Squad and hero plans push his tags — his waves field
  // them AT ONCE (the bell clamp is dead, owner 2026-08-20); tower plans
  // join S.foe.towers, his plans ledger; hires queue on S.foe.hired and
  // the game layer fields them at his depot right after the ring. The
  // conscript key is BORN-OWNED (the never-gated law): his conscripts
  // march from bell zero, so a rifles plan is dead money and never deals.
  if (rng) {
    if (!S.foe) S.foe = makeFoeState();
    if (!S.foe.towers) S.foe.towers = [];
    const ownedKeys = HAND_KEYS.filter((k) => (HAND_TAGS[k] === undefined ? S.foe.towers.indexOf(k) >= 0 : (HAND_TAGS[k] === "" || S.foe.unlocked.indexOf(HAND_TAGS[k]) >= 0)));
    const foeHand = dealConvoyHand(ownedKeys, HAND_KEYS, rng);
    if (reg && priceP) {
      for (const c of foeHand) {
        const base = priceP(c.k);
        if (base == null) continue;
        if (!c.hire) {
          const cost = Math.max(1, Math.ceil(base / 2));
          if (HAND_TAGS[c.k] === undefined) {
            if (S.foe.towers.indexOf(c.k) >= 0) continue;
            if (reg.scrap - cost < MIN_WAVE_FLOOR) continue;
            reg.scrap -= cost;
            S.foe.towers.push(c.k);
          } else {
            const tag = HAND_TAGS[c.k];
            if (S.foe.unlocked.indexOf(tag) >= 0) continue;
            if (reg.scrap - cost < MIN_WAVE_FLOOR) continue;
            reg.scrap -= cost;
            S.foe.unlocked.push(tag);
          }
        } else {
          if (reg.scrap - base < MIN_WAVE_FLOOR) continue;
          reg.scrap -= base;
          (S.foe.hired || (S.foe.hired = [])).push(c.k);
        }
      }
      // THE PLAN'S WHOLE POINT: he BUILDS what he owns — one tower build
      // a bell, full price, the first owned type in table order THE TILL
      // CAN AFFORD (a dear first type is skipped, never a stall), the
      // same till floor. Deterministic, zero draws. // provisional (F5)
      if (S.foe.towers.length) {
        const k = HAND_KEYS.find((x) => S.foe.towers.indexOf(x) >= 0 && priceP(x) != null && reg.scrap - priceP(x) >= MIN_WAVE_FLOOR);
        if (k != null) {
          reg.scrap -= priceP(k);
          (S.foe.hired || (S.foe.hired = [])).push(k);
        }
      }
    }
  }
  const tier = enemyTierState(S.bell, S.foe ? S.foe.unlocked : []);
  let units = 0, mix = [];
  if (reg && rng) {
    // Muster-time solvency snapshot, BEFORE planWave spends the scrap — the
    // starved check below reads this, never the post-buy balance (which is
    // routinely near zero after a perfectly healthy muster).
    ws.musterScrap = reg.scrap;
    const plan = planWave(reg, snap || {}, S.bell, rng, tier.tags, priceOf);
    units = plan.buys.reduce((s, b) => s + b.n, 0);
    mix = plan.buys.map((b) => [b.type, b.n]);
    S.pendingPlan = plan;
    if (reg.earned != null) reg.earned = 0; // mk2.53: the muster spent the earnings; the next bell's budget accrues fresh
  }
  ws.fielded = units;
  ws.spawnQueue = units;
  ws.spawnDelay = spawnDelayFor(S.bell);
  ws.spawnTimer = 0;
  ws.mixBag = mix.length ? buildMixBag(mix) : [];
  // The withdrawal clock starts when the last man is on the field (DepotGame's
  // spawn driver stamps it). An empty muster has no last man, so it stamps
  // now — otherwise stragglers from the previous assault could never break
  // contact.
  ws.spawnDoneT = units > 0 ? null : t;
  ws.withdrawn = false;
  ws.withdrew = 0;
  ws.results = { structureDmg: 0, buildingKills: 0, leaks: 0 };

  // 6. the bureau's read. A broken or starved regiment does not END the war —
  // it just can't defend its depot. Each observation is a one-time dispatch
  // line (digit-free bureau voice), spliced onto the card below.
  const observations = [];
  if (reg && !S._reportedBreak && combatIneffective(reg)) {
    S._reportedBreak = true; // one-time dispatch line
    observations.push("The formation opposite is judged combat-ineffective. The guns will say the rest.");
  }
  // Starvation keeps its muster-time solvency rule: a muster that fielded
  // anything always resets the streak.
  if (reg) {
    // mk1.13 AMENDMENT 1 (owner): spent is spent — a regiment with no men
    // is as done as one with no money; the scrap path stays for form though
    // the clock stipend keeps it funded.
    const starved = (ws.fielded || 0) === 0 &&
      ((ws.musterScrap ?? reg.scrap) < MIN_WAVE_FLOOR || (reg.heads <= 0 && reg.tanks <= 0));
    S.starvedStreak = starved ? (S.starvedStreak || 0) + 1 : 0;
    if (S.starvedStreak >= 3 && !S._reportedSpent) {
      S._reportedSpent = true; // one-time dispatch line
      observations.push("Three musters called and none fielded. The offensive opposite is judged spent.");
    }
  }
  // The card carries the intel composed at step 2 — the dispatch is written
  // last only because the observations above have to be in it.
  const d = makeDispatch(S.bell, intelLines);
  for (const line of observations) d.lines.splice(d.lines.length - 1, 0, line);
  // Truthful withdrawal line: appears ONLY when the assault that just ended
  // actually broke contact (never on annihilated ones), and stays digit-free.
  if (prevWithdrew > 0) {
    d.lines.splice(d.lines.length - 1, 0, "Contact broken off. The remainder withdrew in order.");
  }
  S.lastDispatch = d;
  return d;
}

// Next spawn tag for this tick: pulled from the assault's mix bag if it has
// one, "" (conscript) otherwise. Caller pops S.ws.spawnQueue itself.
export function nextSpawnTag(S) {
  const ws = S.ws;
  return ws.mixBag.length ? ws.mixBag.pop() : "";
}

// withdrawDue(S, worldT): a spent assault breaks contact. True on the single
// tick ASSAULT_TIMEOUT seconds of SIM time (never wall clock) have passed
// since the last queued man spawned (ws.spawnDoneT, stamped by DepotGame's
// spawn driver); the sweep itself is executeWithdrawal's job. Raised once per
// assault — the next muster clears ws.withdrawn. The bell is indifferent to
// all of it: the next assault comes on schedule either way.
export function withdrawDue(S, worldT) {
  const ws = S.ws;
  if (ws.withdrawn || ws.spawnQueue > 0 || ws.spawnDoneT == null) return false;
  if (worldT - ws.spawnDoneT <= ASSAULT_TIMEOUT) return false;
  ws.withdrawn = true;
  return true;
}

// The timeout sweep: every ACTUALLY-alive team-2 body (unit|vehicle) leaves
// the world directly (byId.delete + bodies.splice) — no kill
// events, no bounty (nothing dies, so units.js's _paid guard never fires),
// no smears. Their manpower returns to the regiment: they didn't die, the
// books stay honest. Team-1 squad members are structurally untouchable
// (team filter). Dead bodies are left to the normal corpse sweep.
export function executeWithdrawal(S, world) {
  let inf = 0, tanks = 0;
  for (let i = world.bodies.length - 1; i >= 0; i--) {
    const b = world.bodies[i];
    if ((b.kind !== "unit" && b.kind !== "vehicle") || !b.alive || b.team !== 2) continue;
    if (b.vtype === "bison" || b.vtype === "apc" || b.garrison) continue; // starting armor and the home guard are not wave stock
    if (b.squadId != null) continue; // P7.1 T7: squad-roster men are not wave stock — the timeout sweep must never delete his engineer squads
    if (b.rideApc != null) continue; // P7 T8: seated mid-ferry — withdraws when unloaded and spent, like anyone
    if (b.kind === "vehicle") tanks++; else inf++;
    world.byId.delete(b.id);
    world.bodies.splice(i, 1);
  }
  if (S.reg) { S.reg.heads += inf; S.reg.tanks += tanks; }
  S.ws.withdrew = inf + tanks;
  return { inf, tanks };
}

export const HUD0 = {
  fps: 0, bell: 1, bellT: BELL_PERIOD_S, enemies: 0, resources: 250, walls: 0, towers: 0, score: { pk: 0, pv: 0, ek: 0, ev: 0 },
  lastDispatch: null,
  started: false, gameOver: false, victory: false, breach: false, enemyBreach: false,
  mode: "wall", sellMode: false, sandbagOrient: 0, paused: false, speed: 1, inspect: null, toasts: [],
  pending: null, fogOn: true, healthOn: true, holdAreaOn: false, discipline: "careful", depotStanding: 1, enemyStanding: 1,
  squadSel: null, squadFlag: null,
  // The manifest's React mirror. unlocked seeds from PLAYER_START so the very
  // first render — before the hud tick has run once — already draws the right
  // build bar instead of a full palette that flickers down to three slots.
  unlocked: PLAYER_START.slice(), manifest: null, intel: null,
};
