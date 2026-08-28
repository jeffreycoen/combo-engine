// COLDSNAP DEPOT — drivers.js: THE MOTOR POOL (P7 T1, mk1.30). The one
// driver layer for every vehicle in the war. A driver is a GOAL policy
// (where the hull wants to be — written to b.goal; the engine's aiDrive
// steers and driveHull drives) and a GUNS policy (what its weapon does
// about what it sees). The engine keeps all tread physics; this module only
// sets goals and pulls triggers. A body names its driver with b.drv (a
// plain string — rides the save's generic scalar sweep); bodies without one
// are not the pool's business. Every draw is world.rng(); iteration is
// world.bodies order — deterministic. Future vehicles (the depot Bison,
// the APC, heroes) add a DRIVERS row, never a second loop.
import { applyDamage, aimSolve } from "../engine/core.js";
import { shooterFire, fieldReaches, effRange, hostileStructure, snapTargetNear, POSSESS_ACC, hitOrigin } from "./state.js";
import { arcClears, shotClears, elevSolve, tightSolve, elevCapOf } from "./accuracy.js";
import { ENEMY_FIRE, BISON_FIRE, BARRELS } from "./specs.js";
import { planRoute } from "./route.js";
import { clearSlot } from "./squads.js";
import { buildMech, mechCommand, respawnMech, mechFallen, mechFire, mechMissiles, mechBarrage, mechAimDir } from "../engine/mech.js";

// mk2.05 (owner): barrelTip — where the drawn tube ends, yaw toward the
// aim, pitch estimated from the low root capped at the elevation cap. The
// muzzle the sim fires from and the muzzle the laser projects from are the
// same point. Zero draws.
// mk2.55 (owner): THE LOBBED SHELL — the cap is the spec's own (elevCapOf),
// and a caller that has already solved the shot passes its pitch so the
// tube ends where the drawn barrel ends. No pitch given: the low-root
// estimate as before.
export function barrelTip(v, aim, spec, B, pitch) {
  const yaw = Math.atan2(aim.x - v.pos.x, aim.z - v.pos.z);
  const px = v.pos.x + Math.sin(yaw) * B.fwd, py = v.pos.y + B.up, pz = v.pos.z + Math.cos(yaw) * B.fwd;
  const d = Math.max(2, Math.hypot(aim.x - px, aim.z - pz));
  const ay = aim.y != null ? aim.y : py;
  let p = pitch != null ? pitch : aimSolve(spec.projSpeed, d, ay - py, 9.8, false);
  if (p == null) p = 0;
  p = Math.min(Math.max(p, 0), elevCapOf(spec));
  const c = Math.cos(p);
  return { x: px + Math.sin(yaw) * B.len * c, y: py + B.len * Math.sin(p), z: pz + Math.cos(yaw) * B.len * c };
}
// mk2.55 (owner): THE TIP FOLLOWS THE PITCH (the mk2.05 true-muzzle law
// kept for a lob) — solve once from the flat tip, then place the tip at the
// found pitch; shooterFire solves again from there and may settle one 3°
// step away (0.19 m of tube). No lawful arc: the flat tip, and shooterFire
// holds its fire as before. Zero draws. Only a capped spec (the Bison's
// gun) lifts — every other spec keeps the flat tip.
export function liftedTip(world, v, aim, spec, B) {
  const flat = barrelTip(v, aim, spec, B);
  if (spec.elevCap == null) return flat;
  const e = spec.chargeSig != null ? tightSolve(world, flat, aim, spec, v.id) : elevSolve(world, flat, aim, spec, v.id); // mk2.56: the tube ends at the CHOSEN arc
  return e ? barrelTip(v, aim, spec, B, e.pitch) : flat;
}

// ---- the wave tank — re-seated from units.js stepTank (mk1.30), verbatim.
function tankGoal(world, grid, t, dt, fwdDir) {
  const cell = grid && grid.cellAt(t.pos.x, t.pos.z);
  if (cell && cell.dist < 1e8) {
    if (cell.dx || cell.dz) {
      const fd = fwdDir(cell.dx, cell.dz);
      t.goal = { x: t.pos.x + fd.x * 9, z: t.pos.z + fd.z * 9 };
    } else {
      // mk1.96: the flow rests at zero on the wall's face (the siege flow's
      // seeds) and at the objective cell itself — stand and gun, never lost.
      t.goal = { x: t.pos.x, z: t.pos.z };
    }
    t.lostT = 0;
  } else {
    // off-grid write-off: same 12s window infantry uses. Without this a
    // tank that wanders off the flow field keeps driving forever — no leak
    // radius ever catches it, and it never dies. Mirrors the infantry lostT.
    t.lostT = (t.lostT || 0) + dt;
    if (t.lostT > 12) applyDamage(world, t, 1e9, { attacker: "world" });
  }
}
function tankGuns(world, t, dt, T, toUV) {
  t.gunT = (t.gunT || 0) - dt;
  if (t.gunT > 0) return;
  const fspec = ENEMY_FIRE.tank;
  const muzzle = { x: t.pos.x, y: t.pos.y + 1.2, z: t.pos.z };
  const eR = effRange(world, muzzle, fspec);
  // mk2.52 (owner): THE ONE TARGET LAW — the wave tank fights like the rest
  // of the armor: soft targets first (the shared armor scan, draw-free),
  // masonry only when none stands. The 07 T1 pin holds: its fixture fields
  // no player soft body, so the scan finds nothing and nothing moves.
  const live = armorScanFoes(world, t, muzzle, fspec, false, T, toUV);
  if (live) {
    t.gunT = fspec.cd + world.rng() * (fspec.cdVar || 0);
    shooterFire(world, t, barrelTip(t, live.pos, fspec, BARRELS.tank), live, fspec, { attacker: "enemy", hitStruct: true, owner: t.id });
    return;
  }
  let tgt = null, td = eR * eR;
  const pool = world._L ? world._L.structsFor2 : world.bodies; // T10
  for (const s of pool) {
    // FRONT F1 (4c): the shared hostile-structure set — towers, walls,
    // depot masonry. VISION (mk0.72): structures obey the one law too —
    // you shoot what your side sees.
    if (!hostileStructure(s, 2)) continue;
    const c = toUV(s.pos.x, s.pos.z);
    if (!fieldReaches(T, c.u, c.v, 2)) continue;
    const dx = s.pos.x - t.pos.x, dz = s.pos.z - t.pos.z, d2 = dx * dx + dz * dz;
    if (d2 < td && arcClears(world, muzzle, s.pos, fspec, t.id)) { td = d2; tgt = s; }
  }
  if (!tgt) { t.gunT = 0.5; return; }
  t.gunT = fspec.cd + world.rng() * (fspec.cdVar || 0);
  // owner: t.id — the muzzle sits inside the tank's own hitbox and
  // hitStruct is required to hit the target at all; without owner immunity
  // the round detonates on its own hull on the first tick, every time
  // (found by the tank-vs-tower fixture; full note in the mk1.21 units.js).
  shooterFire(world, t, barrelTip(t, tgt.pos, fspec, BARRELS.tank), tgt, fspec, { attacker: "enemy", hitStruct: true, owner: t.id });
}

export const DRIVERS = {
  waveArmor: { goal: tankGoal, guns: tankGuns },
};

// ---- the depot's own armor (P7 T2, mk1.31): the full-citizen driver.
// Orders live ON the body (order/dest/_patA/_patB/escortId/tracks — plain
// scalars and flat objects, they ride the save's generic sweep): DEFEND
// holds, MOVE and PATROL run planRoute legs on the movement grid with the
// squads' own stall watch, ESCORT trails a squad at a respectful offset.
// THE OVERRUN SAFETY (owner): under tracks "careful" (the default) the hull
// brakes rather than roll over its OWN side's men — it flips depotDrive to
// "manual" with the brake on while blocked, back to "auto" when the lane
// clears (Task 1's own mechanism, no engine edit). "free" takes the safety
// off; enemy infantry are crushable either way — that is the weapon.
// Team-agnostic throughout: the enemy's Bison rides this exact policy when
// Task 5 seats its commander.
const ARMOR_WP_R = 2.5, ARMOR_ARRIVE = 3.0, ARMOR_ESCORT_BACK = 4;   // provisional (F5)
const SAFETY_AHEAD = 4, SAFETY_SPEED_K = 0.5, SAFETY_HALF_W = 2.8;   // provisional (F5)
const YIELD_M = 3.2, YIELD_S = 2.5, PATIENCE_S = 4;   // provisional (F5)
const KEEP_RIGHT_D = 14, KEEP_RIGHT_M = 3.0;   // provisional (F5)
const HUNT_HOLD_S = 12, HUNT_MAX_M = 45;   // provisional (F5) — P7.2 T5, the hunt
export { HUNT_HOLD_S };
// P7 T16: the cone now REPORTS who blocks it — the yield order needs names,
// not just a verdict. Same reach, same width, same team filter.
function armorBlockers(world, v) {
  const fx = v.R[6], fz = v.R[8];
  const fl = Math.hypot(fx, fz) || 1;
  const reach = v.hz + SAFETY_AHEAD + Math.hypot(v.v.x, v.v.z) * SAFETY_SPEED_K;
  const pool = world._L ? (v.team === 1 ? world._L.friends : world._L.foes) : world.bodies;
  let out = null;
  for (const u of pool) {
    if (u.kind !== "unit" || !u.alive || u.team !== v.team) continue;
    const dx = u.pos.x - v.pos.x, dz = u.pos.z - v.pos.z;
    const ahead = (dx * fx + dz * fz) / fl;
    if (ahead < 0 || ahead > reach) continue;
    if (Math.abs((dx * fz - dz * fx) / fl) < SAFETY_HALF_W) (out || (out = [])).push(u);
  }
  return out;
}
function armorGoal(world, grid, v, dt, fwdDir, opts) {
  const blockers = v.tracks !== "free" ? armorBlockers(world, v) : null;
  if (blockers) {
    v.depotDrive = "manual";
    v.ctl = { throttle: 0, steer: 0, brake: true };   // the tracks bite — the strong stop, never weakened
    // P7 T16: THE YIELD — each man in the lane is told to step aside, to his
    // own side of the hull's heading, onto vetted ground; he remembers home.
    const fx = v.R[6], fz = v.R[8], fl = Math.hypot(fx, fz) || 1;
    for (const u of blockers) {
      if (u._yield && u._yield.until > world.t) continue;
      if (u.riding || u.pinned || u._fuse != null) continue;
      const side = ((u.pos.x - v.pos.x) * fz - (u.pos.z - v.pos.z) * fx) / fl >= 0 ? 1 : -1;
      const px = (fz / fl) * side, pz = (-fx / fl) * side;
      const p = clearSlot(world, u.pos.x + px * YIELD_M, u.pos.z + pz * YIELD_M, (u.hx || 0.28) + 0.35);
      if (!u._yieldHome) u._yieldHome = { x: u.pos.x, z: u.pos.z };
      u._yield = { x: p.x, z: p.z, until: world.t + YIELD_S };
    }
    // P7 T16: PATIENCE — a lane that will not clear stops being waited on:
    // the blockers' ground joins the avoid list and the route redraws around.
    v._brakeT = (v._brakeT || 0) + dt;
    if (v._brakeT >= PATIENCE_S) {
      v._avoid = (v._avoid || []).filter((a) => a.until > world.t);
      for (const u of blockers) {
        const g = grid.worldToGrid(u.pos.x, u.pos.z);
        if (grid.inBounds(g.gx, g.gz)) v._avoid.push({ ci: grid.idx(g.gx, g.gz), until: world.t + 25 });
      }
      v._route = null; v._routeDest = null; v._brakeT = 0;
    }
    return;
  }
  v._brakeT = 0;
  v.depotDrive = "auto";
  // P7 T13: THE BACK-OUT — a hull that measured itself not-moving reverses
  // gently (under the crush speed), then replans; the failed lane is already
  // on its avoid list. Rides the manual channel — core.js untouched.
  if ((v._backT || 0) > 0) {
    v._backT -= dt;
    v.depotDrive = "manual";
    v.ctl = { throttle: -0.4, steer: 0, brake: false };   // provisional (F5)
    if (v._backT <= 0) { v._route = null; v._routeDest = null; v._pp = null; v._ppT = 0; }
    return;
  }
  const order = v.order || "defend";
  if (order === "defend") {
    // P7.2 T5: THE HUNT (owner) — a defending GUN hull under fire drives at
    // the fire's origin; its guns answer the moment the shooter crosses its
    // own sight (the scan already runs every tick, sight-gated as ever).
    // Quiet ground for HUNT_HOLD_S sends it back to its park. The transport
    // never hunts (a transport defends itself, it does not duel — apcGuns'
    // own law); the wave tank never defends; explicit orders, possession,
    // and the commander's word all change the order off "defend" and
    // outrank this. Hunt state never rides the save — it re-derives (the
    // T11 _route precedent).
    if (v.drv === "armor") {
      if (v.lastHit !== v._huntHit) {
        v._huntHit = v.lastHit;
        const o = hitOrigin(world, v.lastHit);
        if (o && Math.hypot(o.x - v.pos.x, o.z - v.pos.z) <= HUNT_MAX_M) {
          v._huntPt = { x: o.x, z: o.z }; v._huntT = world.t;
        }
      }
      if (v._huntPt && world.t - (v._huntT || 0) > HUNT_HOLD_S) {
        v._huntPt = null;
        if (v.homeX != null && Math.hypot(v.homeX - v.pos.x, v.homeZ - v.pos.z) > ARMOR_ARRIVE) {
          v.order = "move"; v.dest = { x: v.homeX, z: v.homeZ }; v._route = null; v._routeDest = null;
        }
      } else if (v._huntPt && Math.hypot(v._huntPt.x - v.pos.x, v._huntPt.z - v.pos.z) > ARMOR_ARRIVE) {
        v.order = "move"; v.dest = { x: v._huntPt.x, z: v._huntPt.z }; v._route = null; v._routeDest = null;
      }
    }
    v.goal = null; return;
  }
  if (order === "escort") {
    const sq = opts && opts.squads ? opts.squads.find((q) => q.id === v.escortId) : null;
    if (!sq) { v.order = "defend"; v.goal = null; return; }
    const dx = sq.anchor.x - v.pos.x, dz = sq.anchor.z - v.pos.z, d = Math.hypot(dx, dz) || 1;
    if (d <= ARMOR_ESCORT_BACK + 2.2) { v.dest = null; v._route = null; v._routeDest = null; v.goal = null; return; }
    // P7 T13: the escort leg ROUTES now (ordered driving goes around
    // masonry) — the trail point is a moving dest on the same machinery.
    v.dest = { x: sq.anchor.x - (dx / d) * ARMOR_ESCORT_BACK, z: sq.anchor.z - (dz / d) * ARMOR_ESCORT_BACK };
  }
  if (!v.dest) { v.order = "defend"; v.goal = null; return; }
  // MOVE/PATROL/ESCORT: route legs — stepSquadRouting's shape, on the body.
  const destChanged = !v._routeDest || Math.hypot(v._routeDest.x - v.dest.x, v._routeDest.z - v.dest.z) > 0.5;
  const wp0 = v._route && v._route.length ? v._route[0] : v.dest;
  const dWp = Math.hypot(wp0.x - v.pos.x, wp0.z - v.pos.z);
  let stale = false;
  if (!destChanged) {
    if (v._routeD == null || dWp < v._routeD - 0.5) { v._routeD = dWp; v._routeT = 0; }
    else v._routeT = (v._routeT || 0) + dt;
    stale = v._routeT >= 3;
  }
  if (destChanged || stale || !v._route) {
    v._routeD = null; v._routeT = 0;
    // P7 T13: hulls route as HULLS — steep ground and pressed-to-masonry
    // lanes are no lanes, and lately-failed cells are shunned while marked.
    if (v._avoid) v._avoid = v._avoid.filter((a) => a.until > world.t);
    const r = planRoute(grid, v.pos.x, v.pos.z, v.dest.x, v.dest.z,
      { hull: true, team: v.team, avoid: v._avoid && v._avoid.length ? new Set(v._avoid.map((a) => a.ci)) : null });
    if (r && !r.reached && r.pts.length) {
      const end = r.pts[r.pts.length - 1];
      // owner's ruling (2026-08-18): friendly and neutral masonry always
      // detours; a path only ENEMY masonry closes is followed verbatim —
      // the route runs to the wall and the hull drives the last stretch
      // straight, ramming through. Anything else clamps honestly.
      const foe = v.team === 1 ? 2 : 1;
      const rdx = v.dest.x - end.x, rdz = v.dest.z - end.z, rd = Math.hypot(rdx, rdz);
      let ram = rd > 0.5 && rd < 40;   // a bounded last stretch // provisional (F5)
      for (let s = 1; ram && s < rd; s++) {
        const cell = grid.cellAt(end.x + (rdx / rd) * s, end.z + (rdz / rd) * s);
        if (!cell) { ram = false; break; }
        const struct = cell.building != null || cell.wallId != null;
        if (cell.steep || cell.terrain || cell.water || (struct && cell.bTeam !== foe) || (cell.bag != null && cell.bag !== foe) || (cell.blocked && !struct)) ram = false;
      }
      if (!ram) {
        if (v.order === "patrol") {   // the honest clamp fixes the loop's endpoint too
          if (v._patA && Math.hypot(v.dest.x - v._patA.x, v.dest.z - v._patA.z) < 0.5) v._patA = { x: end.x, z: end.z };
          else if (v._patB && Math.hypot(v.dest.x - v._patB.x, v.dest.z - v._patB.z) < 0.5) v._patB = { x: end.x, z: end.z };
        }
        v.dest = { x: end.x, z: end.z };
      }
    }
    v._route = r && r.pts.length ? r.pts : null;
    v._noRoute = !r;   // P7 T24: null = NOWHERE to go — never blind-drive at the dest
    v._routeDest = { x: v.dest.x, z: v.dest.z };
  }
  while (v._route && v._route.length && Math.hypot(v._route[0].x - v.pos.x, v._route[0].z - v.pos.z) < ARMOR_WP_R) v._route.shift();
  if (Math.hypot(v.dest.x - v.pos.x, v.dest.z - v.pos.z) <= ARMOR_ARRIVE) {
    if (v.order === "patrol" && v._patA && v._patB) {
      const goingToB = Math.hypot(v.dest.x - v._patB.x, v.dest.z - v._patB.z) < 0.5;
      v.dest = goingToB ? { x: v._patA.x, z: v._patA.z } : { x: v._patB.x, z: v._patB.z };
      v._route = null; v._routeDest = null; v._stuckN = 0;
    } else if (v.order === "escort") { v.goal = null; return; }
    else { v.order = "defend"; v.dest = null; v.goal = null; return; }
  }
  // P7 T24, amended (owner, C): ARRIVAL outranks the STAND — a leg that just
  // settled (the three-strike clamp above sets dest=pos) must reach "defend",
  // not get caught standing on a stale no-route flag from the abandoned leg.
  if (v._noRoute) {
    // P7 T24: THE STAND — a hull with no route holds its ground and asks
    // again every three seconds (the stall clock already re-plans); the
    // mk1.31 blind fallback rolled the owner's APC and is dead. The
    // progress watch is skipped while standing — patience is not stuck.
    v.goal = null;
    v._routeT = (v._routeT || 0) + dt;
    return;
  }
  const wp = v._route && v._route.length ? v._route[0] : v.dest;
  v.goal = { x: wp.x, z: wp.z };
  // P7 T24: BRAKE BEFORE THE TURN-AROUND — a route appearing or reversing
  // mid-drive can demand a near-U-turn while the hull carries speed; steering
  // hard at speed ROLLS it (both measured deaths). Slow first, then turn.
  {
    const spd = Math.hypot(v.v.x, v.v.z);
    let err = Math.atan2(v.goal.x - v.pos.x, v.goal.z - v.pos.z) - Math.atan2(v.R[6], v.R[8]);
    while (err > Math.PI) err -= 2 * Math.PI;
    while (err < -Math.PI) err += 2 * Math.PI;
    if (Math.abs(err) > 1.2 && spd > 3) {          // provisional (F5)
      v.depotDrive = "manual";
      v.ctl = { throttle: 0, steer: 0, brake: true };
      return;
    }
  }
  // P7 T16: KEEP RIGHT (owner) — same-team hulls closing head-on each ease
  // to their own right and pass port-to-port. Deterministic, both sides.
  for (const o of world.bodies) {
    if (o === v || o.kind !== "vehicle" || !o.alive || o.team !== v.team) continue;
    const dx = o.pos.x - v.pos.x, dz = o.pos.z - v.pos.z, d = Math.hypot(dx, dz);
    if (d > KEEP_RIGHT_D || d < 0.5) continue;
    const fx = v.R[6], fz = v.R[8], fl = Math.hypot(fx, fz) || 1;
    if ((dx * fx + dz * fz) / (fl * d) < 0.86) continue;          // he must be ahead, within ~30 degrees
    const ox = o.R[6], oz = o.R[8], ol = Math.hypot(ox, oz) || 1;
    if ((fx * ox + fz * oz) / (fl * ol) > -0.5) continue;          // and coming AT us, not alongside
    v.goal = { x: v.goal.x + (fz / fl) * KEEP_RIGHT_M, z: v.goal.z + (-fx / fl) * KEEP_RIGHT_M };
    break;
  }
  // P7 T13: SLOW THROUGH THE TURN — full speed on the straights, a crawl at
  // the corner, so the hull's turning arc stays inside the route's clearance
  // corridor instead of sweeping through whatever stands past it.
  const wp1 = v._route && v._route.length > 1 ? v._route[1] : null;
  const wpd = Math.hypot(wp.x - v.pos.x, wp.z - v.pos.z);
  if (wp1 && wpd < 5) {                              // provisional (F5)
    const a1 = Math.atan2(wp.x - v.pos.x, wp.z - v.pos.z);
    const a2 = Math.atan2(wp1.x - wp.x, wp1.z - wp.z);
    let bend = a2 - a1;
    while (bend > Math.PI) bend -= 2 * Math.PI;
    while (bend < -Math.PI) bend += 2 * Math.PI;
    if (Math.abs(bend) > 0.5) {                      // provisional (F5)
      let err = a1 - Math.atan2(v.R[6], v.R[8]);
      while (err > Math.PI) err -= 2 * Math.PI;
      while (err < -Math.PI) err += 2 * Math.PI;
      v.depotDrive = "manual";
      v.ctl = { throttle: 0.35, steer: Math.max(-1, Math.min(1, err * 1.8)), brake: false };   // provisional (F5)
    }
  }
  // P7 T13: THE PROGRESS WATCH — waypoint distance can lie (a tipped hull
  // near a waypoint it cannot reach); travelled ground cannot. Under 0.4m in
  // 4s with a live goal = stuck: mark the lane, back out, replan. Three
  // strikes on one leg clamp the leg where the hull stands — honest.
  if (!v._pp || Math.hypot(v.pos.x - v._pp.x, v.pos.z - v._pp.z) > 0.4) { v._pp = { x: v.pos.x, z: v.pos.z }; v._ppT = 0; }
  else v._ppT = (v._ppT || 0) + dt;
  if (v._ppT >= 4) {                                 // provisional (F5)
    const g = grid.worldToGrid(v.goal.x, v.goal.z);
    if (grid.inBounds(g.gx, g.gz)) {
      v._avoid = (v._avoid || []).filter((a) => a.until > world.t);
      v._avoid.push({ ci: grid.idx(g.gx, g.gz), until: world.t + 25 });   // provisional (F5)
    }
    v._stuckN = (v._stuckN || 0) + 1;
    v._backT = 1.2; v._ppT = 0;                      // provisional (F5)
    if (v._stuckN >= 3) { v._stuckN = 0; v.dest = { x: v.pos.x, z: v.pos.z }; v._route = null; v._routeDest = null; }
  }
}
// ---- the two scans, lifted to module level (P7 T4): armorGuns' own nested
// closures, bodies unchanged, parameters explicit — so the APC's coax-only
// guns policy can share them without a second copy. Behavior identical for
// the Bison (same gates, same order — the T2 fixtures prove it stays green).
function armorScanFoes(world, v, muzzle, spec, unitsOnly, T, toUV) {
  const enemyTeam = v.team === 1 ? 2 : 1;
  const eR = effRange(world, muzzle, spec);
  const pool = world._L ? (enemyTeam === 2 ? world._L.foes : world._L.friends) : world.bodies;
  let best = null, bd = eR * eR;
  for (const e of pool) {
    if ((e.kind !== "unit" && (unitsOnly || (e.kind !== "vehicle" && e.kind !== "mech"))) || !e.alive || e.team !== enemyTeam) continue;
    const dx = e.pos.x - v.pos.x, dz = e.pos.z - v.pos.z, d2 = dx * dx + dz * dz;
    if (d2 >= bd) continue;
    const c = toUV(e.pos.x, e.pos.z);
    if (!fieldReaches(T, c.u, c.v, v.team)) continue;
    if (!shotClears(world, muzzle, e.pos, spec, v.id)) continue; // mk2.55: a capped gun counts any lawful arc under its cap
    bd = d2; best = e;
  }
  return best;
}
function armorScanStructs(world, v, muzzle, spec, T, toUV) {
  const eR = effRange(world, muzzle, spec);
  const pool = world._L ? (v.team === 1 ? world._L.structsFor1 : world._L.structsFor2) : world.bodies;
  let best = null, bs = eR * eR;
  for (const s of pool) {
    if (!hostileStructure(s, v.team)) continue;
    const cs = toUV(s.pos.x, s.pos.z);
    if (!fieldReaches(T, cs.u, cs.v, v.team)) continue;
    const dx = s.pos.x - v.pos.x, dz = s.pos.z - v.pos.z, d2 = dx * dx + dz * dz;
    if (d2 >= bs) continue;
    if (!shotClears(world, muzzle, s.pos, spec, v.id)) continue; // mk2.55: same gate as the foe scan
    bs = d2; best = s;
  }
  return best;
}
function armorGuns(world, v, dt, T, toUV) {
  const attacker = v.team === 1 ? "player" : "enemy";
  v.gunT = (v.gunT || 0) - dt; v.mgT = (v.mgT || 0) - dt;
  const muzzle = { x: v.pos.x, y: v.pos.y + 1.4, z: v.pos.z };
  if (v.gunT <= 0) {
    const gun = BISON_FIRE.gun;
    let tgt = armorScanFoes(world, v, muzzle, gun, false, T, toUV), struct = false;
    if (!tgt) { tgt = armorScanStructs(world, v, muzzle, gun, T, toUV); struct = !!tgt; }
    if (tgt) {
      v.gunT = gun.cd;
      v._aimYaw = Math.atan2(tgt.pos.x - v.pos.x, tgt.pos.z - v.pos.z);
      shooterFire(world, v, liftedTip(world, v, tgt.pos, gun, BARRELS.bison), tgt, gun, struct // mk2.55: the tip follows the pitch
        ? { attacker, hitStruct: true, hitOnly: "structure", owner: v.id }
        : { attacker, hitStruct: true, owner: v.id });
    } else v.gunT = 0.5;
  }
  if (v.mgT <= 0) {
    const mg = BISON_FIRE.mg;
    const tgt = armorScanFoes(world, v, muzzle, mg, true, T, toUV);   // the coax shoots men, not dirt
    if (tgt) {
      v.mgT = mg.cd;
      v._aimYaw = Math.atan2(tgt.pos.x - v.pos.x, tgt.pos.z - v.pos.z);
      shooterFire(world, v, muzzle, tgt, { ...mg, volley: mg.burst }, { attacker, owner: v.id, volleyDelay: mg.burstGap, muzzleStep: 0 });
    } else v.mgT = 0.4;
  }
}
DRIVERS.armor = { goal: armorGoal, guns: armorGuns };

// ---- the APC (P7 T4): same legs, one gun. The goal policy IS armorGoal —
// orders, routes, escort, the overrun safety, all shared. The guns policy
// is the coax alone: a transport defends itself, it does not duel.
function apcGuns(world, v, dt, T, toUV) {
  const attacker = v.team === 1 ? "player" : "enemy";
  v.mgT = (v.mgT || 0) - dt;
  if (v.mgT > 0) return;
  const mg = BISON_FIRE.mg;
  const muzzle = { x: v.pos.x, y: v.pos.y + 1.3, z: v.pos.z };
  const tgt = armorScanFoes(world, v, muzzle, mg, true, T, toUV);
  if (tgt) {
    v.mgT = mg.cd;
    v._aimYaw = Math.atan2(tgt.pos.x - v.pos.x, tgt.pos.z - v.pos.z);
    shooterFire(world, v, muzzle, tgt, { ...mg, volley: mg.burst }, { attacker, owner: v.id, volleyDelay: mg.burstGap, muzzleStep: 0 });
  } else v.mgT = 0.4;
}
DRIVERS.apc = { goal: armorGoal, guns: apcGuns };
// (stepDrivers' possessed skip already decays mgT — no change.)

// ---- THE MECH (owner, 2026-08-20): the crown's seat. Goal = the armor's
// route legs actuated as walker commands (the tower-defense boss precedent:
// heading slewed, travel cut through turns). Fall tending per the ruling:
// helpless, then stands where it fell — the fall itself never wounds.
const MECH_ARRIVE = 3.5, MECH_DOWN_S = 6, MECH_GRACE_S = 5; // provisional (F5)
const MECH_GUN = { range: 40, occl: "arc", projSpeed: 120 }; // scan pseudo-spec // provisional (F5)
function mechFallenTend(world, b) {
  const m = b.mechRef;
  if (!m._downT) m._downT = world.t;
  if (world.t - m._downT < MECH_DOWN_S) return;       // helpless — shells land, nothing answers
  let rx = b.pos.x, rz = b.pos.z;
  const wp = b._route && b._route.length ? b._route[0] : b.dest;
  if (wp) { // repeated falls in one patch stand up FURTHER along the route (the boss lesson)
    const dd = Math.hypot(wp.x - rx, wp.z - rz) || 1;
    const adv = Math.min(2.5 + (m._fallN || 0) * 3, dd);
    rx += (wp.x - rx) / dd * adv; rz += (wp.z - rz) / dd * adv;
  }
  m._fallN = (m._fallN || 0) + 1; m._downT = 0;
  respawnMech(world, m, rx, rz, Math.atan2(b.R[6], b.R[8])); // hp untouched — wounds keep
  m._fGrace = world.t + MECH_GRACE_S;
}
function mechGoal(world, grid, b, dt, fwdDir, opts) {
  const m = b.mechRef;
  if (!m) return;
  if (mechFallen(m)) { mechFallenTend(world, b); return; }
  if (world.t < (m._fGrace || 0)) { mechCommand(m, { travel: 0, lateral: 0 }); return; }
  const blockers = b.tracks !== "free" ? armorBlockers(world, b) : null;
  if (blockers) { // THE TRACKS LAW: own men in the lane stop the walk; they are told to step aside (the yield, verbatim reuse)
    mechCommand(m, { travel: 0, lateral: 0 });
    const fx = b.R[6], fz = b.R[8], fl = Math.hypot(fx, fz) || 1;
    for (const u of blockers) {
      if (u._yield && u._yield.until > world.t) continue;
      if (u.riding || u.pinned || u._fuse != null) continue;
      const side = ((u.pos.x - b.pos.x) * fz - (u.pos.z - b.pos.z) * fx) / fl >= 0 ? 1 : -1;
      const px = (fz / fl) * side, pz = (-fx / fl) * side;
      const p = clearSlot(world, u.pos.x + px * YIELD_M, u.pos.z + pz * YIELD_M, (u.hx || 0.28) + 0.35);
      if (!u._yieldHome) u._yieldHome = { x: u.pos.x, z: u.pos.z };
      u._yield = { x: p.x, z: p.z, until: world.t + YIELD_S };
    }
    return;
  }
  const order = b.order || "defend";
  if (order === "defend" || !b.dest) { mechCommand(m, { travel: 0, lateral: 0 }); return; }
  // MOVE/PATROL/ESCORT route legs — armorGoal's own bookkeeping shape on the hull
  if (order === "escort") {
    const sq = opts && opts.squads ? opts.squads.find((q) => q.id === b.escortId) : null;
    if (!sq) { b.order = "defend"; return; }
    const dx = sq.anchor.x - b.pos.x, dz = sq.anchor.z - b.pos.z, d = Math.hypot(dx, dz) || 1;
    if (d <= ARMOR_ESCORT_BACK + 3) { mechCommand(m, { travel: 0, lateral: 0 }); return; }
    b.dest = { x: sq.anchor.x - (dx / d) * ARMOR_ESCORT_BACK, z: sq.anchor.z - (dz / d) * ARMOR_ESCORT_BACK };
  }
  const destChanged = !b._routeDest || Math.hypot(b._routeDest.x - b.dest.x, b._routeDest.z - b.dest.z) > 0.5;
  if (destChanged || !b._route) {
    const r = planRoute(grid, b.pos.x, b.pos.z, b.dest.x, b.dest.z, { hull: true, team: b.team });
    if (r && !r.reached && r.pts.length) { const end = r.pts[r.pts.length - 1]; b.dest = { x: end.x, z: end.z }; } // the honest clamp
    b._route = r && r.pts.length ? r.pts : null;
    b._routeDest = { x: b.dest.x, z: b.dest.z };
  }
  while (b._route && b._route.length && Math.hypot(b._route[0].x - b.pos.x, b._route[0].z - b.pos.z) < MECH_ARRIVE) b._route.shift();
  if (Math.hypot(b.dest.x - b.pos.x, b.dest.z - b.pos.z) <= MECH_ARRIVE) {
    if (b.order === "patrol" && b._patA && b._patB) {
      const goingToB = Math.hypot(b.dest.x - b._patB.x, b.dest.z - b._patB.z) < 0.5;
      b.dest = goingToB ? { x: b._patA.x, z: b._patA.z } : { x: b._patB.x, z: b._patB.z };
      b._route = null; b._routeDest = null;
    } else { b.order = "defend"; b.dest = null; mechCommand(m, { travel: 0, lateral: 0 }); return; }
  }
  const wp = b._route && b._route.length ? b._route[0] : b.dest;
  const want = Math.atan2(wp.x - b.pos.x, wp.z - b.pos.z);
  if (b._mHead == null) b._mHead = m.state.heading;
  let herr = want - b._mHead;
  while (herr > Math.PI) herr -= 2 * Math.PI;
  while (herr < -Math.PI) herr += 2 * Math.PI;
  b._mHead += Math.max(-0.45 * dt, Math.min(0.45 * dt, herr));
  const turning = Math.abs(herr) > 0.5;
  mechCommand(m, { travel: turning ? 0.35 : 0.9, heading: b._mHead }); // the boss numbers // provisional (F5)
}
function mechGuns(world, b, dt, T, toUV) {
  const m = b.mechRef;
  if (!m || mechFallen(m)) return;
  const muzzle = { x: b.pos.x, y: b.pos.y + 2.0, z: b.pos.z };
  let tgt = armorScanFoes(world, b, muzzle, MECH_GUN, false, T, toUV);
  let struct = false;
  if (!tgt) { tgt = armorScanStructs(world, b, muzzle, MECH_GUN, T, toUV); struct = !!tgt; }
  if (!tgt) return;
  const d = Math.hypot(tgt.pos.x - b.pos.x, tgt.pos.z - b.pos.z);
  m.aimYaw = Math.atan2(tgt.pos.x - b.pos.x, tgt.pos.z - b.pos.z);
  m.aimRange = d;
  const torso = m.waist ? m.waist.b : m.hull;
  let bear = m.aimYaw - Math.atan2(torso.R[6], torso.R[8]);
  while (bear > Math.PI) bear -= 2 * Math.PI;
  while (bear < -Math.PI) bear += 2 * Math.PI;
  if (Math.abs(bear) > 0.12) return; // the waist is still turning
  mechFire(world, m); // rate-limited inside
  if (d > 14) mechMissiles(world, m);
  // the barrage answers structures and packed ground // provisional (F5)
  if (struct) { mechBarrage(world, m); return; }
  const pool = world._L ? (b.team === 1 ? world._L.foes : world._L.friends) : world.bodies;
  let near = 0;
  for (const e of pool) {
    if ((e.kind !== "unit" && e.kind !== "vehicle" && e.kind !== "mech") || !e.alive) continue;
    if (Math.hypot(e.pos.x - tgt.pos.x, e.pos.z - tgt.pos.z) < 8) near++;
  }
  if (near >= 4) mechBarrage(world, m);
}
DRIVERS.mech = { goal: mechGoal, guns: mechGuns };

// stepDrivers: once per sim tick, BEFORE stepUnits — tanks drew from
// world.rng before infantry at mk1.21 and the draw-order contract holds.
// opts.possessedId (P7 T2): a possessed hull skips its driver entirely
// (goal untouched, guns untouched) but its cooldowns still decay — the
// stepTowers precedent. opts.squads: escort's own live squad lookup.
export function stepDrivers(world, grid, fwdDir, T, toUV = (x, z) => ({ u: x, v: z }), opts = {}) {
  const dt = world.dt;
  for (const b of world.bodies) {
    if ((b.kind !== "vehicle" && b.kind !== "mech") || !b.alive) continue;
    const d = DRIVERS[b.drv];
    if (!d) continue;
    if (opts.possessedId === b.id) { b.gunT = (b.gunT || 0) - dt; b.mgT = (b.mgT || 0) - dt; continue; }
    d.goal(world, grid, b, dt, fwdDir, opts);
    d.guns(world, b, dt, T, toUV);
  }
}

// POSSESSION (P7 T2): the owner's two triggers. Same laws as every
// possessed shot — sight-gated at the aim, POSSESS_ACC sharpening, snap to
// a live seen enemy, real cooldowns shared with the auto guns.
export function possessedArmorFire(world, v, aim, T, toUV = (x, z) => ({ u: x, v: z })) {
  const gun = BISON_FIRE.gun;
  v.gunT = v.gunT || 0;
  if (v.gunT > 0) return false;
  const live = snapTargetNear(world, aim, T, toUV); // mk2.58 (owner): THE COMMANDER'S EYE — possession is the player's own sight; no seen-gate on a possessed aim
  const sy = aim.y != null ? aim.y : world.field.heightAt(aim.x, aim.z);
  const tgt = live || { pos: { x: aim.x, y: sy, z: aim.z }, v: { x: 0, y: 0, z: 0 }, hy: sy - world.field.heightAt(aim.x, aim.z) }; // mk2.02: ground aim targets the SURFACE (owner) — the phantom body is dead; hy carries roof height over field ground through shooterFire's lead refresh
  v.gunT = gun.cd;
  v._aimYaw = Math.atan2(aim.x - v.pos.x, aim.z - v.pos.z);
  shooterFire(world, v, liftedTip(world, v, tgt.pos, gun, BARRELS.bison), tgt, { ...gun, acc: gun.acc * POSSESS_ACC }, { attacker: "player", hitStruct: true, owner: v.id }); // mk2.55: the tip follows the pitch
  return true;
}
// POSSESSION (mk1.92): THE MECH's shared sight gate — one aim-point test for
// all five triggers (FIRE/MSL/BRG/PUNT/180), the aim point mechAimDir
// solves at the commanded range. Headless-testable in isolation; the game
// layer (DepotGame.jsx) only decides which engine call to attempt.
export function mechSighted(world, mech, T, toUV = (x, z) => ({ u: x, v: z })) {
  return true; // mk2.58 (owner): THE COMMANDER'S EYE — possession is the player's own sight; no seen-gate on a possessed aim (mechAimDir's aim point included; the five triggers all read this)
}
export function possessedArmorMg(world, v, aim, T, toUV = (x, z) => ({ u: x, v: z })) {
  const mg = BISON_FIRE.mg;
  v.mgT = v.mgT || 0;
  if (v.mgT > 0) return false;
  const live = snapTargetNear(world, aim, T, toUV); // mk2.58 (owner): THE COMMANDER'S EYE — possession is the player's own sight; no seen-gate on a possessed aim
  const sy = aim.y != null ? aim.y : world.field.heightAt(aim.x, aim.z);
  const tgt = live || { pos: { x: aim.x, y: sy, z: aim.z }, v: { x: 0, y: 0, z: 0 }, hy: sy - world.field.heightAt(aim.x, aim.z) }; // mk2.02: ground aim targets the SURFACE (owner) — the phantom body is dead; hy carries roof height over field ground through shooterFire's lead refresh
  v.mgT = mg.cd;
  v._aimYaw = Math.atan2(aim.x - v.pos.x, aim.z - v.pos.z);
  shooterFire(world, v, { x: v.pos.x, y: v.pos.y + 1.4, z: v.pos.z }, tgt, { ...mg, acc: mg.acc * POSSESS_ACC, volley: mg.burst }, { attacker: "player", owner: v.id, volleyDelay: mg.burstGap, muzzleStep: 0 });
  return true;
}
