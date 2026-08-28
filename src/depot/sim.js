// COLDSNAP DEPOT — sim.js: the war's top-level sim functions, moved VERBATIM
// out of DepotGame.jsx (the war-engine-extraction plan's step 1 — the
// mapgen.js / muster.js precedent). The one licensed signature change:
// functions that read mapgen globals take a `map` parameter of api.js's
// GameMap shape, handed back by makeMap(seed); the plan's step 2 replaces
// the source of `map`, never these signatures. Moved code keeps its names
// and comments; only the task's substitution table's tokens differ.
import { addBody, addWeld, stepWorld, explode } from "../engine/core.js";
import { TOWER_SPECS, MASON, INFANTRY_ARMS } from "./specs.js";
import {
  makeAssaultState, towerShot, fieldReaches, friendlyFouls, teslaStrike,
  teslaWouldCatchFriend, stepGrenades, stepTesla, stepDavyShot, squadFire,
  pruneSquads, stepWallSupport, forgetWelds,
} from "./state.js";
import { arcClears } from "./accuracy.js";
import { drivePossessedSquad, stepSquad, stepMedicTendSquad, stepMechanicTendSquad } from "./squads.js";
import { stepUnits, spawnUnit } from "./units.js";
import { stepDrivers } from "./drivers.js";
import { stepTransports, unloadEnemyRiders } from "./transports.js";
import { planRoute } from "./route.js";
import { windAt } from "./wind.js";
import { layDressing } from "./mapgen.js";

// P6 T1: route bookkeeping, one squad, once per sim tick (stepDepot calls
// it before stepSquad). Draws a route when the destination is new, rewrites
// an unreachable destination to the route's honest end (and a patrol's
// matching endpoint with it), and redraws the route when progress stalls
// (under half a meter of approach in three seconds — the mid-march stall's
// tombstone). Deterministic, zero rng, no draws.
export function stepSquadRouting(grid, sq, world) {
  if (!sq.dest || (sq.order !== "move" && sq.order !== "attack" && sq.order !== "build" && sq.order !== "patrol")) {
    sq._route = null; sq._routeDest = null; return;
  }
  const destChanged = !sq._routeDest || Math.hypot(sq._routeDest.x - sq.dest.x, sq._routeDest.z - sq.dest.z) > 0.5;
  const wp = sq._route && sq._route.length ? sq._route[0] : sq.dest;
  const dWp = Math.hypot(wp.x - sq.anchor.x, wp.z - sq.anchor.z);
  let stalled = false;
  if (!destChanged) {
    // the stall watch: approach distance must shrink, or the route is stale
    if (sq._routeD == null || dWp < sq._routeD - 0.5) { sq._routeD = dWp; sq._routeT = 0; }
    else { sq._routeT = (sq._routeT || 0) + 1 / 120; }
    if (sq._routeT < 3) return;
    stalled = true;
  }
  sq._routeD = null; sq._routeT = 0;
  // P7 T16: the stall's usual cause is a LIVING blocker the grid can't see —
  // a parked friendly hull, a standing squad. Mark their ground for this
  // redraw and route around them. Friendly flesh and any friendly hull only —
  // enemy contact is combat, not traffic. Runs ONLY on the stalled redraw,
  // never the fresh-dest path (destChanged never sets stalled).
  if (stalled) {
    const sx = sq.anchor.x, sz = sq.anchor.z;
    const dx = wp.x - sx, dz = wp.z - sz, dl = Math.hypot(dx, dz) || 1;
    const ux = dx / dl, uz = dz / dl, segLen = Math.min(10, dl);
    for (const b of world.bodies) {
      if (!b.alive) continue;
      const isHull = b.kind === "vehicle" && b.team === sq.team;
      const isFlesh = b.kind === "unit" && b.team === sq.team && !sq.memberIds.includes(b.id);
      if (!isHull && !isFlesh) continue;
      const bx = b.pos.x - sx, bz = b.pos.z - sz;
      const along = bx * ux + bz * uz;
      if (along < 0 || along > segLen) continue;
      if (Math.abs(bx * uz - bz * ux) > 3.5) continue;
      const g = grid.worldToGrid(b.pos.x, b.pos.z);
      if (grid.inBounds(g.gx, g.gz)) (sq._avoid || (sq._avoid = [])).push({ ci: grid.idx(g.gx, g.gz), until: world.t + 25 });
    }
  }
  if (sq._avoid) sq._avoid = sq._avoid.filter((a) => a.until > world.t);
  const route = planRoute(grid, sq.anchor.x, sq.anchor.z, sq.dest.x, sq.dest.z,
    sq._avoid && sq._avoid.length ? { avoid: new Set(sq._avoid.map((a) => a.ci)) } : null);
  if (!route || !route.pts.length) { sq._route = null; sq._routeDest = { x: sq.dest.x, z: sq.dest.z }; return; }
  if (!route.reached) {
    // the honest clamp: they go as close as ground allows, and the order
    // (and a patrol's turnaround point) now SAYS so.
    const end = route.pts[route.pts.length - 1];
    if (sq.order === "patrol") {
      if (sq._patA && Math.hypot(sq.dest.x - sq._patA.x, sq.dest.z - sq._patA.z) < 0.5) sq._patA = { x: end.x, z: end.z };
      else if (sq._patB && Math.hypot(sq.dest.x - sq._patB.x, sq.dest.z - sq._patB.z) < 0.5) sq._patB = { x: end.x, z: end.z };
    }
    sq.dest = { x: end.x, z: end.z };
  }
  sq._route = route.pts;
  sq._routeDest = { x: sq.dest.x, z: sq.dest.z };
}

// ================================================================ towers
export function stepTowers(world, T, discipline, possessedId, arcs, holdArea, map) {
  const dt = world.dt;
  for (const b of world.bodies) {
    if (b.kind !== "tower" || !b.alive) continue;
    // POSSESSION (P4 T3, mk0.92): a possessed tower stops auto-acquiring —
    // the owner's aim is its aim now (possessedTowerFire, called from the
    // frame loop). Cooldown still decays here; nothing else runs.
    if (possessedId === b.id) { b.fireCd = (b.fireCd || 0) - dt; continue; }
    // mk2.26: a dummy enemy tower holds everything — no scan, no trigger;
    // cooldown decays so the flip back to FIGHT resumes clean.
    if (world._devDummies && b.team === 2) { b.fireCd = (b.fireCd || 0) - dt; continue; }
    // P7.1 T6 (owner): THE TOWER BRAIN LEARNS ITS TEAM — every tower targets
    // the OPPOSITE team and sight-gates on its OWN side. tTeam is the
    // tower's own side, foeTeam who it hunts.
    const tTeam = b.team === 2 ? 2 : 1; const foeTeam = tTeam === 1 ? 2 : 1;
    // COMMAND T1 (mk0.80): fire discipline is per tower now — the radial
    // sets b.discipline; the old argument is the fallback for bodies that
    // predate the field (old saves, bare fixtures).
    const disc = b.discipline || discipline || "careful";
    const spec = TOWER_SPECS[b.towerType] || TOWER_SPECS.gun;
    if (spec.fireRate <= 0) continue;
    b.fireCd = (b.fireCd || 0) - dt;
    // effRange: towers don't move, so this is computed once at build time
    // (buildAt below) and cached on the body — b.effRange falls back to
    // spec.range for any tower predating that cache (shouldn't happen, but
    // keeps old saves/tests that construct tower bodies directly working).
    const eR = b.effRange != null ? b.effRange : spec.range;
    const muzzle = { x: b.pos.x, y: b.pos.y + b.hy + 0.45, z: b.pos.z };
    let best = b.targetId ? world.byId.get(b.targetId) : null;
    if (best && (!best.alive || best.team !== foeTeam || (best.kind !== "unit" && best.kind !== "vehicle" && best.kind !== "mech"))) best = null;
    if (best) {
      const dx = best.pos.x - b.pos.x, dz = best.pos.z - b.pos.z;
      if (dx * dx + dz * dz > eR * eR) best = null;
    }
    // Targeting gate (symmetric with the attacker's own check in units.js):
    // a tower may only acquire/keep a target OUR SIDE CAN SEE (VISION
    // mk0.72 — fieldReaches reads the sight map now, not ground control),
    // AND where its own round's flight path (arc for mg/gun, muzzle
    // climb-out only for mortar/rocket) actually clears the terrain — a
    // sticky target that has walked into dead ground, or that a rock has
    // since risen between, is dropped right here so "next rescan" is
    // immediate. The tower is itself an eye (sight.js SIGHT.tower), and a
    // tall one: it often sees ground its own guns cannot reach.
    if (best) { const c = map.invW(best.pos.x, best.pos.z); if (!fieldReaches(T, c.u, c.v, tTeam)) best = null; }
    if (best && !arcClears(world, muzzle, best.pos, spec, b.id)) best = null;
    b.scanCd = (b.scanCd || 0) - dt;
    if (!best && b.scanCd <= 0) {
      b.scanCd = 0.11 + (b.id % 8) * 0.011;
      const pool = world._L ? (foeTeam === 2 ? world._L.foes : world._L.friends) : world.bodies; // T10
      let bd = eR * eR;
      for (const e of pool) {
        if ((e.kind !== "unit" && e.kind !== "vehicle" && e.kind !== "mech") || !e.alive || e.team !== foeTeam) continue;
        const c = map.invW(e.pos.x, e.pos.z);
        if (!fieldReaches(T, c.u, c.v, tTeam)) continue;
        const dx = e.pos.x - b.pos.x, dz = e.pos.z - b.pos.z;
        const d2 = dx * dx + dz * dz;
        if (d2 < bd && arcClears(world, muzzle, e.pos, spec, b.id)) { bd = d2; best = e; }
      }
    }
    b.targetId = best ? best.id : null;
    if (!best || b.fireCd > 0) continue;
    // CAREFUL discipline: a shot whose flight path would hit our own wall/
    // tower/town chunk holds the trigger pull (cadence still resets — keeps
    // the target, retries next cadence; target movement usually clears it).
    // Enemy fire (units.js) never runs this check.
    if (tTeam === 1 && disc !== "free" && friendlyFouls(world, muzzle, best.pos, spec, b.id)) {
      b.fireCd = spec.fireRate;
      continue;
    }
    if (spec.tesla && arcs) {
      if (holdArea && holdArea[tTeam] && teslaWouldCatchFriend(world, b, best, map)) { b.fireCd = spec.fireRate; continue; }
      b.fireCd = spec.fireRate;
      b.flashT = world.t;
      teslaStrike(world, arcs, b, best);
      continue;
    }
    b.fireCd = spec.fireRate;
    b.flashT = world.t;
    towerShot(world, b, best, spec);
  }
}

// ================================================================== town
// The depot itself lives in TOWN (see genMap) — this machinery stays even
// though village-protection payouts (Phase-later scripting) do not.
// townFootprint(grid, t): which grid cells one TOWN entry stands on. Pulled
// out of buildTown so the SAVE's restore path can recompute the identical
// footprint without re-laying a single stone (the stones come back off the
// save; only the grid bookkeeping has to be redone).
export function townFootprint(grid, t, map) {
  const cells = [];
  const hx = (t.nx * MASON.pitch) / 2, hz = (t.nz * MASON.pitch) / 2;
  for (let gz = 0; gz < map.GRID_H; gz++) for (let gx = 0; gx < map.GRID_W; gx++) {
    const wp = grid.gridToWorld(gx, gz);
    if (Math.abs(wp.x - t.x) < hx + 1.0 && Math.abs(wp.z - t.z) < hz + 1.0) {
      if (Math.hypot(wp.x - map.OBJ_POS.x, wp.z - map.OBJ_POS.z) < 5) continue;
      cells.push(grid.idx(gx, gz));
    }
  }
  return cells;
}
export function buildTown(world, grid, field, map) {
  const { hcs, pitch, mass, breakF } = MASON;
  // THE CARPENTER (mk2.66): lay every dressing body layDressing walks —
  // plates and trim, tilted by axis+angle, tinted, welded to the nearest
  // lattice stones so they fall when the walls do.
  const qOf = (axis, angle) => {
    if (!axis || !angle) return undefined;
    const h = angle / 2, sh = Math.sin(h);
    return { x: axis === "x" ? sh : 0, y: axis === "y" ? sh : 0, z: axis === "z" ? sh : 0, w: Math.cos(h) };
  };
  const layDress = (t, grid3, base) => {
    let di = 0;
    layDressing(t, (o) => {
      const c = addBody(world, { kind: "chunk", team: 0, mass: o.mass || MASON.mass,
        hx: o.hx, hy: o.hy, hz: o.hz,
        x: t.x + o.dx, y: base + o.dy, z: t.z + o.dz,
        friction: 0.65, restitution: 0.02, q: qOf(o.axis, o.angle) });
      c.sleeping = true; c.town = t.id; c.gpos = [-3, -1 - di++, 0]; // negative: never read as a course-0 stone NOR a roof-course stone by any suite filter
      if (o.tint) c.tint = o.tint;
      // welded to the three nearest lattice stones in reach — it falls with the walls
      const near = [];
      for (const s of grid3) {
        if (s.gpos[0] === -3) continue;
        const dd = Math.hypot(s.pos.x - c.pos.x, s.pos.y - c.pos.y, s.pos.z - c.pos.z);
        if (dd < 2.2) near.push([dd, s]);
      }
      near.sort((a, b2) => a[0] - b2[0]);
      for (let i = 0; i < Math.min(3, near.length); i++) addWeld(world, c, near[i][1], MASON.breakF);
      grid3.push(c);
    });
  };
  const out = [];
  for (const t of map.TOWN) {
    const grid3 = [], base = field.heightAt(t.x, t.z) + hcs + 0.02;
    // T4: interior columns — derived from the LIVE (rotation-swapped) dims,
    // the proving grounds' warehouse rule: a third in from each end, mirrored.
    // Derived, never stored: both swaps rotate the building under the rule.
    const colAt = t.cols
      ? (() => {
          const c1x = Math.floor(t.nx / 3), c1z = Math.floor(t.nz / 3);
          const c2x = t.nx - 1 - c1x, c2z = t.nz - 1 - c1z;
          return (ix, iz) => (ix === c1x && iz === c1z) || (ix === c2x && iz === c2z);
        })()
      : () => false;
    // T4: drive doors run down the LONG axis — derived from live dims too.
    const driveZ = t.drive && t.nz >= t.nx;
    // P7 T5 (mk1.34, owner): THE PRECAST DEPOT — column-and-panel, the
    // warehouse lesson at fortress scale. A quarter the lattice's bodies
    // (the measured boom at the wall drops 5.3 -> 1.6 ms); demolition goes
    // structural — shear a panel's welds and it falls as ONE piece, drop
    // columns and the roof pancakes. Same footprint, same censuses, same
    // breach law: every piece is an ordinary chunk with town set.
    if (t.depot) {
      const NY = t.ny;
      const colXs = [0, 4, 7, t.nx - 1];
      const colZs = [0, 4, t.nz - 1];
      const isCol = (ix, iz) =>
        (iz === 0 || iz === t.nz - 1) ? colXs.indexOf(ix) >= 0
        : (ix === 0 || ix === t.nx - 1) ? colZs.indexOf(iz) >= 0 : false;
      const colTops = [];
      for (let ix = 0; ix < t.nx; ix++) for (let iz = 0; iz < t.nz; iz++) {
        if (!isCol(ix, iz)) continue;
        let below = null;
        for (let iy = 0; iy < NY; iy++) {
          const c = addBody(world, { kind: "chunk", team: 0, mass, hx: hcs, hy: hcs, hz: hcs,
            x: t.x + (ix - (t.nx - 1) / 2) * pitch, y: base + iy * pitch, z: t.z + (iz - (t.nz - 1) / 2) * pitch,
            friction: 0.65, restitution: 0.02 });
          c.sleeping = true; c.town = t.id; c.gpos = [ix, iy, iz];
          grid3.push(c);
          if (below) addWeld(world, below, c, breakF);
          below = c;
          if (iy === NY - 1) colTops.push(c);
        }
      }
      const panelH = (NY * pitch) / 2 - 0.04;
      const panels = [];
      const addPanel = (px, pz, hx2, hz2) => {
        const p = addBody(world, { kind: "chunk", team: 0, mass: 750, hx: hx2, hy: panelH, hz: hz2,
          x: px, y: base + panelH - hcs, z: pz, friction: 0.65, restitution: 0.02 });
        p.sleeping = true; p.town = t.id; p.gpos = [-2, 0, panels.length];
        grid3.push(p); panels.push(p);
        // welded to BOTH its columns at three heights — the shear points
        for (const s of grid3) {
          if (s.gpos[0] < 0 || ![1, 3, NY - 2].includes(s.gpos[1])) continue;
          if (Math.abs(s.pos.x - px) <= hx2 + pitch && Math.abs(s.pos.z - pz) <= hz2 + pitch) addWeld(world, p, s, breakF);
        }
        return p;
      };
      for (const iz of [0, t.nz - 1]) {
        for (let bi = 0; bi + 1 < colXs.length; bi++) {
          if (iz === 0 && bi === 1) continue; // THE DOOR BAY — men walk in, hulls don't fit
          const a = colXs[bi], b2 = colXs[bi + 1];
          addPanel(t.x + ((a + b2) / 2 - (t.nx - 1) / 2) * pitch, t.z + (iz - (t.nz - 1) / 2) * pitch,
            ((b2 - a) * pitch) / 2 - hcs - 0.03, hcs);
        }
      }
      for (const ix of [0, t.nx - 1]) {
        for (let bi = 0; bi + 1 < colZs.length; bi++) {
          const a = colZs[bi], b2 = colZs[bi + 1];
          addPanel(t.x + (ix - (t.nx - 1) / 2) * pitch, t.z + ((a + b2) / 2 - (t.nz - 1) / 2) * pitch,
            hcs, ((b2 - a) * pitch) / 2 - hcs - 0.03);
        }
      }
      // THE ROOF: one rigid slab on the caps and panel tops — the hangar's
      // proven pancake (1-hop convergence, falls whole when the ring shears)
      const slab = addBody(world, { kind: "chunk", team: 0, mass: 900,
        hx: ((t.nx - 1) / 2) * pitch - hcs, hy: 0.2, hz: ((t.nz - 1) / 2) * pitch - hcs,
        x: t.x, y: base + (NY - 0.5) * pitch + 0.2, z: t.z, friction: 0.65, restitution: 0.02 });
      slab.sleeping = true; slab.town = t.id; slab.gpos = [-1, NY, -1];
      grid3.push(slab);
      for (const cTop of colTops) addWeld(world, slab, cTop, breakF);
      for (const p of panels) addWeld(world, slab, p, breakF);
      // the crowns: the four corner silhouettes, on the slab
      for (const [bx, bz] of [[0, 0], [t.nx - 1, 0], [0, t.nz - 1], [t.nx - 1, t.nz - 1]]) {
        let below = slab;
        for (let iy = NY + 1; iy <= NY + 2; iy++) {
          const c = addBody(world, { kind: "chunk", team: 0, mass, hx: hcs, hy: hcs, hz: hcs,
            x: t.x + (bx - (t.nx - 1) / 2) * pitch, y: base + iy * pitch, z: t.z + (bz - (t.nz - 1) / 2) * pitch,
            friction: 0.65, restitution: 0.02 });
          c.sleeping = true; c.town = t.id; c.gpos = [bx, iy, bz];
          grid3.push(c);
          addWeld(world, below, c, breakF);
          below = c;
        }
      }
    } else if (t.dead) {
      // BORN RUINS (Settled Ground T2, mk2.62, owner): a dead entry lays as
      // one of four ruin forms instead of the live lay. No draw: the form
      // rides the entry (mapgen derives it from already-drawn values).
      // Welded by the same neighbor pass the live lay uses — except the
      // mound, which is loose by design (sleeping, unwelded).
      const lay = (ix, iy, iz, jx, jz) => {
        const c = addBody(world, { kind: "chunk", team: 0, mass, hx: hcs, hy: hcs, hz: hcs,
          x: t.x + (ix - (t.nx - 1) / 2) * pitch + (jx || 0),
          y: base + iy * pitch,
          z: t.z + (iz - (t.nz - 1) / 2) * pitch + (jz || 0),
          friction: 0.65, restitution: 0.02 });
        c.sleeping = true; c.town = t.id; c.gpos = [ix, iy, iz];
        grid3.push(c);
      };
      if (t.form === "chimney") {
        const cx = Math.floor(t.nx / 2), cz = Math.floor(t.nz / 2);
        for (let iy = 0; iy < 5; iy++) lay(cx, iy, cz);
      } else if (t.form === "mound") {
        for (let ix = 0; ix < t.nx; ix++) for (let iz = 0; iz < t.nz; iz++) {
          const h = ((ix * 31 + iz * 7 + t.nx * 13) % 100) / 100;
          const j = (((ix * 17 + iz * 29) % 7) - 3) * 0.05; // deterministic jitter, ±0.15m — loose, not a lattice
          if (h < 0.55) lay(ix, 0, iz, j, -j);
          if (h < 0.2) lay(ix, 1, iz, -j, j);
        }
      } else if (t.form === "stump") {
        for (let iy = 0; iy < t.ny; iy++) lay(0, iy, 0);
        for (let ix = 0; ix < t.nx; ix++) for (let iz = 0; iz < t.nz; iz++) {
          const perim = ix === 0 || ix === t.nx - 1 || iz === 0 || iz === t.nz - 1;
          if (!perim || (ix === 0 && iz === 0)) continue;
          lay(ix, 0, iz);
        }
      } else { // the shell
        const H = Math.min(3, t.ny);
        for (let ix = 0; ix < t.nx; ix++) for (let iy = 0; iy < H; iy++) for (let iz = 0; iz < t.nz; iz++) {
          const perim = ix === 0 || ix === t.nx - 1 || iz === 0 || iz === t.nz - 1;
          if (!perim) continue;
          if (ix === t.door && (iz === 1 || iz === 2) && iy <= 2) continue;
          if (iy === H - 1 && ((ix * 31 + iy * 17 + iz * 7) % 100) / 100 < 0.4) continue;
          lay(ix, iy, iz);
        }
      }
      if (t.form !== "mound") {
        const key = (a, b, c2) => a + "," + b + "," + c2;
        const map = new Map(grid3.map((c) => [key(c.gpos[0], c.gpos[1], c.gpos[2]), c]));
        for (const c of grid3) {
          const g = c.gpos;
          for (const d of [[1, 0, 0], [0, 1, 0], [0, 0, 1]]) {
            const o = map.get(key(g[0] + d[0], g[1] + d[1], g[2] + d[2]));
            if (o) addWeld(world, c, o, breakF);
          }
        }
      }
    } else {
      for (let ix = 0; ix < t.nx; ix++) for (let iy = 0; iy <= t.ny; iy++) for (let iz = 0; iz < t.nz; iz++) {
        const perim = ix === 0 || ix === t.nx - 1 || iz === 0 || iz === t.nz - 1;
        const corner = (ix <= 1 || ix >= t.nx - 2) && (iz <= 1 || iz >= t.nz - 2);
        // mk2.63: partition walls (t.parts) stand full height; a graveyard's
        // headstones (t.stones) are single interior stones on the ground.
        const part = t.parts && t.parts.indexOf(ix) >= 0;
        const stone0 = t.stones && iy === 0 && !perim && ((ix * 31 + iz * 7) % 100) / 100 < 0.35;
        if (iy < t.ny && !perim && !colAt(ix, iz) && !part && !stone0) continue;
        const pitchedForm = /^(croft|shed|house|long|granary|mill|smithy|inn|spring|row|chapel|warehouse|watch)/.test(t.id || "");
        if (iy === t.ny && (t.roof === false || t.slab || pitchedForm)) continue; // T4/mk2.66: NO STONE LIDS (owner) — a slab or plates on structure, never a layer of cubes
        if (t.cren && iy === t.ny && (!perim || (ix + iz) % 2)) continue; // mk2.66: the keep's crenellations
        if (ix === t.door && (iz === 1 || iz === 2) && iy <= 2) continue;
        // T4: drive-through — doors carved through BOTH end walls of the long
        // axis, full width bar the corners, every course but the top lintel.
        if (t.drive && iy < t.ny - 1 && (driveZ
          ? (iz === 0 || iz === t.nz - 1) && ix >= 1 && ix <= t.nx - 2
          : (ix === 0 || ix === t.nx - 1) && iz >= 1 && iz <= t.nz - 2)) continue;
        if (t.ruin && ((ix * 31 + iy * 17 + iz * 7) % 100) / 100 < t.ruin && iy > 0) continue;
        const c = addBody(world, {
          kind: "chunk", team: 0, mass, hx: hcs, hy: hcs, hz: hcs,
          x: t.x + (ix - (t.nx - 1) / 2) * pitch,
          y: base + iy * pitch,
          z: t.z + (iz - (t.nz - 1) / 2) * pitch,
          friction: 0.65, restitution: 0.02,
        });
        c.sleeping = true;
        c.town = t.id;
        c.gpos = [ix, iy, iz];
        grid3.push(c);
      }
      const key = (a, b, c2) => a + "," + b + "," + c2;
      const map = new Map(grid3.map((c) => [key(c.gpos[0], c.gpos[1], c.gpos[2]), c]));
      const townBreakF = breakF; // P7 T3 (owner): normal welds — the depot is big, not magic; the breach bar is what makes it a siege
      for (const c of grid3) {
        const g = c.gpos;
        for (const d of [[1, 0, 0], [0, 1, 0], [0, 0, 1]]) {
          const o = map.get(key(g[0] + d[0], g[1] + d[1], g[2] + d[2]));
          if (o) addWeld(world, c, o, townBreakF);
        }
      }
      // T4: THE SLAB — one rigid 800kg roof plate, sized inside the wall ring
      // with the standard ~2cm joint, welded to the top two courses (the
      // proving grounds' proven form: 1-hop convergence, pancakes whole when
      // the ring shears). It joins stones/n0 so a fallen roof counts as ruin.
      if (t.slab) {
        const shx = ((t.nx - 1) / 2) * pitch - hcs - 0.02;
        const shz = ((t.nz - 1) / 2) * pitch - hcs - 0.02;
        const slab = addBody(world, {
          kind: "chunk", team: 0, mass: 800, hx: shx, hy: 0.2, hz: shz,
          x: t.x, y: base + (t.ny - 1) * pitch + 0.2, z: t.z,
          friction: 0.65, restitution: 0.02,
        });
        slab.sleeping = true; slab.town = t.id; slab.gpos = [-1, t.ny, -1];
        for (const c of grid3) if (c.gpos[1] >= t.ny - 2) addWeld(world, slab, c, townBreakF);
        grid3.push(slab);
      }
    }
    if (!t.depot) layDress(t, grid3, field.heightAt(t.x, t.z) + hcs + 0.02); // mk2.66: the carpenter dresses every standing and shell form
    const cells = townFootprint(grid, t, map);
    if (!t.dead || t.form === "mound") for (const ci of cells) { const c = grid.cells[ci]; c.blocked = true; c.building = t.id; c.bTeam = t.team === 2 ? 2 : (t.depot ? 1 : 0); } // T2: a born ruin blocks no cell — EXCEPT the mound (owner, 2026-08-26): too dense to walk, the router goes around
    if (t.depot) {
      // roof-peak flag anchor: kinematic marker body, no collision role —
      // the renderer draws pole+cloth at any body with flagPole === true
      const fx = t.x, fz = t.z;
      const flag = addBody(world, {
        kind: "flag", team: t.team || 1, mass: 0, hx: 0.05, hy: 0.05, hz: 0.05,
        x: fx, y: base + (t.ny + 2.6) * pitch, z: fz,
      });
      flag.sleeping = true; flag.flagPole = true;
    }
    out.push({ id: t.id, cells, stones: grid3, n0: grid3.length, ruined: !!t.dead, marker: !!t.marker, x: t.x, z: t.z }); // T2: ruined from the first frame
  }
  return out;
}
export function stepTown(world, grid, town, onRuin) {
  for (const b of town) {
    if (b.ruined) continue;
    let standing = 0;
    for (const s of b.stones) if (world.byId.has(s.id) && s.sleeping) standing++;
    if (standing > b.n0 * 0.66) continue;
    b.ruined = true;
    for (const ci of b.cells) { const c = grid.cells[ci]; c.blocked = false; c.building = null; c.bTeam = 0; }
    world.events.push({ type: "collapse", x: b.x, y: world.field.heightAt(b.x, b.z) + 2, z: b.z });
    if (onRuin) onRuin(b);
  }
}

// =============================================================== masonry
export const STONE = 0.30;
export const STONE_PITCH = 0.63;
export function shatterStructure(world, b, opts) {
  const NX = 3, NY = (opts && opts.ny) || 3, NZ = 3;
  const grid = [], base = b.pos.y - b.hy;
  for (let ix = 0; ix < NX; ix++) for (let iy = 0; iy < NY; iy++) for (let iz = 0; iz < NZ; iz++) {
    const c = addBody(world, {
      kind: "chunk", team: 0, mass: 88, hx: STONE, hy: STONE, hz: STONE,
      x: b.pos.x + (ix - (NX - 1) / 2) * STONE_PITCH,
      y: base + STONE + iy * STONE_PITCH,
      z: b.pos.z + (iz - (NZ - 1) / 2) * STONE_PITCH,
      friction: 0.65, restitution: 0.02,
    });
    c.gpos = [ix, iy, iz];
    c.bornT = world.t;
    grid.push(c);
  }
  const key = (a, b2, c2) => a + "," + b2 + "," + c2;
  const map = new Map(grid.map((c) => [key(c.gpos[0], c.gpos[1], c.gpos[2]), c]));
  for (const c of grid) {
    const g = c.gpos;
    for (const d of [[1, 0, 0], [0, 1, 0], [0, 0, 1]]) {
      const o = map.get(key(g[0] + d[0], g[1] + d[1], g[2] + d[2]));
      if (o) addWeld(world, c, o, 1.8e4);
    }
  }
  return grid;
}

// March + combat drivers. Vehicles first (drivers.js — the motor pool,
// mk1.30), then infantry (units.js) — the mk1.21 order, tanks before men,
// which is also the rng draw-order contract. DepotGame supplies the flow
// field and the orientation-aware fwdDir/invW.
export function stepEnemies(world, grid, T, run, input, map) {
  stepDrivers(world, grid, map.fwdDir, T, map.invW, {
    possessedId: input.possess && (input.possess.kind === "vehicle" || input.possess.kind === "mech") ? input.possess.id : 0,
    squads: run.squads,
  });
  stepUnits(world, grid, map.fwdDir, T, map.invW);
}

// ================================================================assaults
export function makeDepotAssaultState() { return makeAssaultState(); }
// Bell countdown readout: m:ss, ceiling-rounded so the chip reads 0:01 for
// the whole final second rather than blinking 0:00 early.
export function clockStr(s) {
  const t = Math.max(0, Math.ceil(s || 0));
  return Math.floor(t / 60) + ":" + String(t % 60).padStart(2, "0");
}
export function spawnEnemy(world, sp, tag) {
  return spawnUnit(world, sp, tag);
}

// ================================================================== step
// Team-1 infantry uprighting — same quaternion-settle snippet units.js's
// stepUnits applies to team-2 marchers (which deliberately skips team 1).
// Without it a member shoved by a blast stays toppled forever; squads.js is
// movement-pure (goal seeking only) and owns no engine-orientation state.
export function uprightMember(u, dt) {
  const supported = u.grounded || Math.abs(u.v.y) < 0.6;
  if (!supported || u.R[4] <= -0.5) return;
  if (u.R[4] < 0.995) {
    const yaw2 = Math.atan2(u.R[6], u.R[8]) * 0.5;
    const ty = Math.sin(yaw2), tw = Math.cos(yaw2);
    const a = Math.min(1, 14 * dt);
    const sgn = u.q.y * ty + u.q.w * tw < 0 ? -1 : 1;
    u.q.x += (0 - u.q.x) * a; u.q.y += (ty * sgn - u.q.y) * a;
    u.q.z += (0 - u.q.z) * a; u.q.w += (tw * sgn - u.q.w) * a;
    const L2 = Math.hypot(u.q.x, u.q.y, u.q.z, u.q.w) || 1;
    u.q.x /= L2; u.q.y /= L2; u.q.z /= L2; u.q.w /= L2;
  }
  u.w.x *= 1 - Math.min(1, 6 * dt); u.w.z *= 1 - Math.min(1, 6 * dt);
}

export function stepDepot(world, grid, onStructureLost, town, onRuin, T, discipline, run, input, map) {
  // mk2.26: THE FIGHT SWITCH (sandbox). Dummies = no enemy drivers, no
  // enemy fire; bodies stay real (physics, damage, the chain). The flag
  // rides the world so stepTowers reads it without a signature change;
  // undefined in the live war — every existing caller unchanged.
  world._devDummies = !!input.devDummies;
  if (!input.devDummies) stepEnemies(world, grid, T, run, input, map);
  else for (const b of world.bodies) if (b.kind === "unit" && b.team === 2 && b.alive) uprightMember(b, world.dt);
  // Squads (Phase 5 Task 3), after enemies, before towers — the brief's
  // loop-order contract: prune dead members -> delete empty squads ->
  // stepSquad (movement) -> squadFire (combat). squadFire threads T + invW
  // so player squads fog-gate on the SAME field towers do (team 1).
  if (run && run.squads) {
    run.squads = pruneSquads(world, run.squads);
    // POSSESSION (P4 T1, mk0.90): every man in a possessed squad dying frees
    // the stick automatically — nothing left to drive.
    if (input.possess && input.possess.kind === "squad" && !run.squads.some((q) => q.id === input.possess.id)) input.releasePossession();
    stepTransports(world, run.squads);   // P7 T4: boarding, riding, the sealed hold
    // P7 T8: the ferry's turnaround — arrived out: drop the ramp and turn
    // for home; arrived back: the post resumes.
    for (const b of world.bodies) {
      if (b.kind !== "vehicle" || b.team !== 2 || b.vtype !== "apc" || !b.ferry || !b.alive) continue;
      if (b.order === "defend") {   // armorGoal's arrival flip
        if (b.ferry === "out") { unloadEnemyRiders(world, b); b.ferry = "back"; b.order = "move"; b.dest = { x: b.homeX != null ? b.homeX : b.pos.x, z: b.homeZ != null ? b.homeZ : b.pos.z }; b._route = null; b._routeDest = null; }
        else b.ferry = null;
      }
    }
    // VISION T4 (mk0.74, owner's ruling): an attacking squad that SEES an
    // enemy in weapon reach halts and fights — the halt is the squad's own
    // leg-pause field held open, so the fire rule and the leg machinery are
    // untouched and no rng is drawn. MOVE and BUILD stay quiet; sappers
    // never halt for men (their attack is the charge, not the rifle).
    // Throttled like every scan in this codebase; deterministic.
    const ENGAGE_CHECK_S = 0.2, ENGAGE_HOLD_S = 0.35;
    const engageCheck = (sq) => {
      // COMMAND T3 (mk0.85): a patrol that sees an enemy in reach halts and
      // fights exactly as an attack does — same hold, same fields.
      if ((sq.order !== "attack" && sq.order !== "patrol") || sq.type === "sappers" || sq.type === "engineers") return;
      sq._engageCd = (sq._engageCd || 0) - world.dt;
      if (sq._engageCd > 0) return;
      sq._engageCd = ENGAGE_CHECK_S;
      const arms = INFANTRY_ARMS[sq.type];
      if (!arms) return;
      const R2 = arms.range * arms.range;
      const pool = world._L ? world._L.foes : world.bodies; // T10
      for (const e of pool) {
        if ((e.kind !== "unit" && e.kind !== "vehicle") || !e.alive || e.team !== 2) continue;
        const dx = e.pos.x - sq.anchor.x, dz = e.pos.z - sq.anchor.z;
        if (dx * dx + dz * dz > R2) continue;
        const c = map.invW(e.pos.x, e.pos.z);
        if (!fieldReaches(T, c.u, c.v, 1)) continue;
        sq._pauseT = Math.max(sq._pauseT || 0, ENGAGE_HOLD_S);  // hold the halt open
        return;
      }
    };
    world._holdArea = run.holdArea; // mk2.18: area weapons' hold, read by stepDavyShot below
    for (const sq of run.squads) {
      if (sq.ridingIn != null || sq.order === "ride") continue; // P7 T4: the hold is sealed — no legs, no eyes, no rifles
      if (input.possess && input.possess.kind === "squad" && sq.id === input.possess.id) {
        // POSSESSION: the stick owns this squad — no engage check, no order
        // machine, no auto-fire (T2 gives the trigger). Input is the frame's
        // snapshot; the drive runs at the fixed step like all movement.
        const a0 = { x: sq.anchor.x, z: sq.anchor.z };
        const pi = input.possessInput || { vx: 0, vz: 0 };
        drivePossessedSquad(world, sq, pi.vx, pi.vz, world.dt, input.reticle);
        const cl = map.clampToRim(sq.anchor.x, sq.anchor.z);
        // MASONRY (T8, mk0.98): a building footprint (or a rock, or a wall
        // line) refuses the anchor the way the rim does — the formation can
        // never be driven into a lattice it would have to shove through.
        // The whole tick's move reverts (no slide); the stick just stops.
        const gA = grid.worldToGrid(cl.x, cl.z);
        const cellA = grid.inBounds(gA.gx, gA.gz) ? grid.cells[grid.idx(gA.gx, gA.gz)] : null;
        sq.anchor = cellA && (cellA.blocked || cellA.wallId) ? a0 : { x: cl.x, z: cl.z };
        // POSSESSION (P4 T2, mk0.91): squadFire normally decays u.fireCd —
        // it's skipped for a possessed squad, so the trigger (possessedVolley)
        // does not, and the cooldown must decay somewhere or it never clears.
        for (const id of sq.memberIds) {
          const u = world.byId.get(id);
          if (u && u.alive) { uprightMember(u, world.dt); u.fireCd = (u.fireCd || 0) - world.dt; }
        }
        continue;
      }
      stepSquadRouting(grid, sq, world);
      engageCheck(sq);
      stepSquad(world, sq, world.dt);
      // P1.5 T4: the two-point build line, driven straight after the squad's
      // own movement so the accumulator reads THIS tick's anchor. It lives in
      // the game layer (input.stepBuildLine, installed by the mount effect below)
      // because it spends scrap and places bodies — both barred from
      // squads.js by that module's law. Squads with no job cost one test.
      if (sq._build && input.stepBuildLine) input.stepBuildLine(sq);
      // P7.2 T6: the medics make their rounds — after the squad's own step,
      // so a tending man's goal overrides this tick's slot seek.
      if (sq.type === "medics") stepMedicTendSquad(world, sq, world.dt);
      // P7.2 T7: the mechanics make their rounds — after the medic's own step.
      if (sq.type === "mechanics") stepMechanicTendSquad(world, sq, world.dt);
      // mk2.08: the atomic crew's one shot — its own path (no arms row).
      if (sq.type === "davy") stepDavyShot(world, sq, world.dt, T, map.invW);
      squadFire(world, sq, world.dt, T, map.invW);
      for (const id of sq.memberIds) {
        const u = world.byId.get(id);
        if (u && u.alive) uprightMember(u, world.dt);
      }
    }
  }
  // P7.1 T7: HIS SQUADS — the enemy's engineer roster, squad-driven like the
  // player's (routing, legs, the build driver), never tappable (squadAtPoint
  // scans run.squads alone). Engineers fire nothing; no squadFire call.
  if (!input.devDummies && run.foeSquads && run.foeSquads.length) {
    run.foeSquads = pruneSquads(world, run.foeSquads);
    for (const sq of run.foeSquads) {
      stepSquadRouting(grid, sq, world);
      stepSquad(world, sq, world.dt);
      if (sq._build && input.stepFoeBuildLine) input.stepFoeBuildLine(sq);
      for (const id of sq.memberIds) {
        const u = world.byId.get(id);
        if (u && u.alive) uprightMember(u, world.dt);
      }
    }
  }
  // POSSESSION (P4 T3, mk0.92): a possessed tower killed out from under the
  // owner frees the trigger automatically — nothing left to fire, same rule
  // T1 gives a wiped-out possessed squad.
  if (input.possess && input.possess.kind === "tower") {
    const ptw = world.byId.get(input.possess.id);
    if (!ptw || !ptw.alive) input.releasePossession();
  }
  // POSSESSION (P7 T2): a possessed vehicle killed out from under the owner
  // frees the trigger automatically, same rule as a squad or a tower.
  if (input.possess && input.possess.kind === "vehicle") {
    const pv = world.byId.get(input.possess.id);
    if (!pv || !pv.alive) input.releasePossession();
  }
  stepTowers(world, T, discipline, input.possess && input.possess.kind === "tower" ? input.possess.id : undefined, run.arcs, run.holdArea, map);
  stepGrenades(world); // mk2.03: the grenade fuses — 2.0s from each release
  stepTesla(world, run.arcs, map); // mk2.15: the chains walk, 0.15s a hop
  // WIND TOGGLE (mk0.95, owner's accuracy-tuning request): off = dead calm
  // for BOTH sides' shots and shells (drift and hold-off zero out through
  // the same world.wind every shooter reads). Deterministic either way —
  // windAt is a pure function and the toggle draws nothing.
  world.wind = input.windOn === false ? { x: 0, z: 0, mag: 0 } : windAt(map.MAP_SEED, world.t);
  stepWorld(world);
  for (let i = world.bodies.length - 1; i >= 0; i--) {
    const b = world.bodies[i];
    if ((b.kind === "wall" || b.kind === "tower") && !b.alive) {
      // A wall COURSE is a third of a wall, so it breaks into a third of the
      // rubble (one 3x3 layer instead of three) — a three-course wall coming
      // down leaves exactly the 27 stones the old single-body wall left.
      shatterStructure(world, b, { ny: b.kind === "tower" ? 4 : (b.course != null ? 1 : 3) });
      world.events.push({ type: "structureLost", id: b.id, kind: b.kind, course: b.course != null ? b.course : -1 });
      forgetWelds(world, b);
      world.byId.delete(b.id); world.bodies.splice(i, 1);
      if (onStructureLost) onStructureLost(b);
    }
  }
  // THE SUPPORT RULE (P1.5 T2): straight after the dead structures are gone,
  // so a course that lost its footing this tick finds nothing under it and
  // comes down for real. Game-layer only — the engine knows nothing about it.
  stepWallSupport(world);
  // A DEAD MECH: one last magazine detonation, then the island lets go and
  // the pieces settle where they stood — the wreck is the trophy. (Placed
  // here so the existing structureLost->stepWallSupport proximity pin
  // (mk0.52/f) stays intact.)
  if (world.mechs && world.mechs.length) for (let mi2 = world.mechs.length - 1; mi2 >= 0; mi2--) {
    const m = world.mechs[mi2];
    if (m.hull.alive) continue;
    const h = m.hull.pos;
    for (let i = 0; i < 3; i++) explode(world, h.x + (i - 1) * 1.5, h.y + i * 0.8, h.z, { r: 4.5, kv: 12, dmg: 20, crater: 0.8, attacker: m.team === 2 ? "player" : "enemy" });
    if (input.possess && input.possess.kind === "mech" && input.possess.id === m.hull.id) input.releasePossession();
    for (const L2 of m.links) { L2.mechRef = null; L2.team = 0; }
    world.mechs.splice(mi2, 1);
  }
  for (let i = world.bodies.length - 1; i >= 0; i--) {
    const b = world.bodies[i];
    if (b.kind === "unit" && !b.alive && world.t - (b.deadT || 0) > 2.5) { world.byId.delete(b.id); world.bodies.splice(i, 1); }
    else if (b.kind === "chunk" && !b.town && b.sleeping && b.bornT && world.t - b.bornT > 14) {
      const wl = world.weldsOf.get(b.id);
      if (wl) for (const wd of wl) wd.broken = true;
      world.weldsOf.delete(b.id);
      world._weldPairsDirty = true;
      world.byId.delete(b.id); world.bodies.splice(i, 1);
    }
    else if (b.kind === "chunk" && b.sandbag && !b.alive) {
      // P7.1 T4b: a killed bag is gone — it must not keep colliding or
      // drawing. Its grid cell releases on the existing 4Hz bag sweep.
      forgetWelds(world, b);
      world.byId.delete(b.id); world.bodies.splice(i, 1);
    }
  }
  if (town) stepTown(world, grid, town, onRuin);
  // FRONT F1: no leak check — an enemy at the depot stays and chews masonry.
}
