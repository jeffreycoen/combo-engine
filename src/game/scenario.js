// game/scenario.js — the Phase 4 scenario pipeline: contracts and maps as
// JSON content, no engine edits. Builders are transcribed from the demo's
// buildProvingGrounds, parameterized. TWO INVARIANTS ARE LOAD-BEARING and
// enforced by scripts/scenario-test.mjs (worldHash parity with the hand-built
// proving grounds):
//   1. Creation order is fixed — player, then squads in array order, then
//      vehicles, then prefabs, then freeze — because worldHash parity and the
//      seq-parity flee AI (u.seq & 1) depend on order stability.
//   2. Per-builder WELD order is preserved exactly (walls use their own
//      double-loop z/y/x neighbor order; grids use x/y/z) — weld order feeds
//      the solver's iteration order, which feeds the dynamics.
import { mulberry32, makeField, makeWorld, addBody, addWeld, buildTerrain, freezePool, thawPool, heading } from "../engine/core.js";

const HCS = 0.40, PITCH = 0.83, BREAK_F = 8.0e4;
const groundY = (field, x, z, hy) => field.heightAt(x, z) + hy + 0.02;

function flatten(field, cx, cz, rad, ph) {
  const i0 = Math.max(0, Math.floor((cx - rad + field.half) / field.cs)), i1 = Math.min(field.n - 1, Math.ceil((cx + rad + field.half) / field.cs));
  const j0 = Math.max(0, Math.floor((cz - rad + field.half) / field.cs)), j1 = Math.min(field.n - 1, Math.ceil((cz + rad + field.half) / field.cs));
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
    const px = i * field.cs - field.half, pz = j * field.cs - field.half;
    const d2 = (px - cx) * (px - cx) + (pz - cz) * (pz - cz);
    if (d2 > rad * rad) continue;
    const t = Math.min(1, (rad - Math.sqrt(d2)) / 1.6);
    field.h[j * field.n + i] += (ph - field.h[j * field.n + i]) * t;
  }
  field.dirty = true;
}

function weldGrid(world, grid) {
  const key = (a, b2, c2) => a + "," + b2 + "," + c2;
  const map = new Map(grid.map((c) => [key(...c.gpos), c]));
  for (const c of grid) {
    const [ix, iy, iz] = c.gpos;
    for (const [dx, dy, dz] of [[1, 0, 0], [0, 1, 0], [0, 0, 1]]) {
      const o = map.get(key(ix + dx, iy + dy, iz + dz));
      if (o) addWeld(world, c, o, BREAK_F);
    }
  }
}

const stone = (world, group, x, y, z, q) => {
  const c = addBody(world, { kind: "chunk", group, mass: 100, hx: HCS, hy: HCS, hz: HCS, x, y, z, friction: 0.65, restitution: 0.02, ...(q ? { q } : {}) });
  c.sleeping = true;
  return c;
};

// ---- prefab builders (each transcribed verbatim from the demo) ----
const BUILDERS = {
  // hollow keep: one-stone walls, roof course, south doorway
  keep(world, field, pg, s) {
    const cx = s.x, cz = s.z, grp = s.group || "garrison";
    // the keep is enterable through its doorway — panicked infantry may
    // shelter inside like a house (the demo collected no keep shelters;
    // this rides the same sheltering opt-in the sandbox already made)
    pg.shelters.push({ door: { x: cx, z: cz - 1.5 * PITCH - 0.9 }, inside: { x: cx, z: cz } });
    const grid = [];
    for (let ix = 0; ix < 6; ix++) for (let iy = 0; iy < 5; iy++) for (let iz = 0; iz < 4; iz++) {
      if (ix >= 1 && ix <= 4 && iz >= 1 && iz <= 2 && iy <= 3) continue;
      if (iz === 0 && (ix === 2 || ix === 3) && iy <= 1) continue;
      const x = cx + (ix - 2.5) * PITCH, z = cz + (iz - 1.5) * PITCH;
      const y = field.heightAt(cx, cz) + HCS + 0.02 + iy * PITCH;
      const c = stone(world, grp, x, y, z);
      c.gpos = [ix, iy, iz];
      grid.push(c);
    }
    weldGrid(world, grid);
  },
  // free-standing wall: covers metadata first, stones, then the demo's own
  // z/y/x neighbor-order weld loop (NOT weldGrid's x/y/z)
  wall(world, field, pg, s) {
    const grp = s.group || "wall" + pg.wallIndex++;
    const { x: cx, z: cz, yaw: a, nx, ny, nz } = s;
    const ux = Math.cos(a), uz = Math.sin(a);
    pg.covers.push({ x: cx, z: cz, ux, uz, hl: (nx * PITCH) / 2, hw: (nz * PITCH) / 2, hh: ny * PITCH });
    const grid = [];
    for (let ix = 0; ix < nx; ix++) for (let iy = 0; iy < ny; iy++) for (let iz = 0; iz < nz; iz++) {
      const lx = (ix - (nx - 1) / 2) * PITCH, lz = (iz - (nz - 1) / 2) * PITCH;
      const x = cx + lx * ux - lz * uz, z = cz + lx * uz + lz * ux;
      const y = field.heightAt(x, z) + HCS + 0.02 + iy * PITCH;
      const c = stone(world, grp, x, y, z, heading(null, a));
      c.gpos = [ix, iy, iz];
      grid.push(c);
    }
    for (const c of grid) for (const o of grid) {
      const [ix, iy, iz] = c.gpos, [jx, jy, jz] = o.gpos;
      if ((jx === ix + 1 && jy === iy && jz === iz) || (jy === iy + 1 && jx === ix && jz === iz) || (jz === iz + 1 && jx === ix && jy === iy)) addWeld(world, c, o, BREAK_F);
    }
  },
  // drive-through hangar with the rigid roof slab on the wall-cap ring
  hangar(world, field, pg, s) {
    const cx = s.x, cz = s.z, grp = s.group || "hangar", NX = 9, NZ = 10, NY = 5;
    flatten(field, cx, cz, 6.5, field.heightAt(cx, cz));
    const base = field.heightAt(cx, cz) + HCS + 0.02;
    const grid = [];
    for (let ix = 0; ix < NX; ix++) for (let iy = 0; iy < NY; iy++) for (let iz = 0; iz < NZ; iz++) {
      if (ix >= 1 && ix <= 7 && iz >= 1 && iz <= 8) continue;
      if ((iz === 0 || iz === NZ - 1) && ix >= 1 && ix <= 7 && iy <= 3) continue;
      const c = stone(world, grp, cx + (ix - (NX - 1) / 2) * PITCH, base + iy * PITCH, cz + (iz - (NZ - 1) / 2) * PITCH);
      c.gpos = [ix, iy, iz];
      grid.push(c);
    }
    weldGrid(world, grid);
    const slab = addBody(world, { kind: "chunk", group: grp, mass: 800, hx: 2.90, hy: 0.2, hz: 3.32, x: cx, y: base + 4 * PITCH + 0.2, z: cz, friction: 0.65, restitution: 0.02 });
    slab.sleeping = true; slab.gpos = [4, 4, 4];
    slab.roofSlab = true; // demolition objectives watch this body (prop only — not hashed)
    for (const c of grid) if (c.gpos[1] >= 3) addWeld(world, slab, c, BREAK_F);
    pg.covers.push({ x: cx - 3.32, z: cz, ux: 0, uz: 1, hl: (NZ * PITCH) / 2, hw: HCS, hh: NY * PITCH });
    pg.covers.push({ x: cx + 3.32, z: cz, ux: 0, uz: 1, hl: (NZ * PITCH) / 2, hw: HCS, hh: NY * PITCH });
  },
  // warehouse: full roof on perimeter walls + two interior columns
  warehouse(world, field, pg, s) {
    const cx = s.x, cz = s.z, grp = s.group || "warehouse", NX = 8, NZ = 6, NY = 4;
    flatten(field, cx, cz, 5.0, field.heightAt(cx, cz));
    const base = field.heightAt(cx, cz) + HCS + 0.02;
    const isCol = (ix, iz) => (ix === 2 && iz === 2) || (ix === 5 && iz === 3);
    const grid = [];
    for (let ix = 0; ix < NX; ix++) for (let iy = 0; iy <= NY; iy++) for (let iz = 0; iz < NZ; iz++) {
      const perim = ix === 0 || ix === NX - 1 || iz === 0 || iz === NZ - 1;
      if (iy < NY && !perim && !isCol(ix, iz)) continue;
      if (iz === 0 && (ix === 3 || ix === 4) && iy <= 2) continue;
      const c = stone(world, grp, cx + (ix - (NX - 1) / 2) * PITCH, base + iy * PITCH, cz + (iz - (NZ - 1) / 2) * PITCH);
      c.gpos = [ix, iy, iz];
      grid.push(c);
    }
    weldGrid(world, grid);
    pg.covers.push({ x: cx - 2.905, z: cz, ux: 0, uz: 1, hl: (NZ * PITCH) / 2, hw: HCS, hh: NY * PITCH });
    pg.covers.push({ x: cx + 2.905, z: cz, ux: 0, uz: 1, hl: (NZ * PITCH) / 2, hw: HCS, hh: NY * PITCH });
    pg.covers.push({ x: cx, z: cz + 2.075, ux: 1, uz: 0, hl: (NX * PITCH) / 2, hw: HCS, hh: NY * PITCH });
  },
  // town house: 4 courses, granular roof, street door, shelter metadata
  house(world, field, pg, s) {
    const grp = s.group, cx = s.x, cz = s.z, NX = s.nx, NZ = s.nz, doorIx = s.doorIx, NY = 4;
    flatten(field, cx, cz, Math.hypot(NX, NZ) * PITCH / 2 + 0.9, field.heightAt(cx, cz));
    const base = field.heightAt(cx, cz) + HCS + 0.02;
    const grid = [];
    for (let ix = 0; ix < NX; ix++) for (let iy = 0; iy <= NY; iy++) for (let iz = 0; iz < NZ; iz++) {
      const perim = ix === 0 || ix === NX - 1 || iz === 0 || iz === NZ - 1;
      if (iy < NY && !perim) continue;
      if (ix === doorIx && (iz === 1 || iz === 2) && iy <= 2) continue;
      const c = stone(world, grp, cx + (ix - (NX - 1) / 2) * PITCH, base + iy * PITCH, cz + (iz - (NZ - 1) / 2) * PITCH);
      c.gpos = [ix, iy, iz];
      grid.push(c);
    }
    weldGrid(world, grid);
    for (const sz of [-1, 1]) pg.covers.push({ x: cx, z: cz + sz * ((NZ - 1) / 2) * PITCH, ux: 1, uz: 0, hl: (NX * PITCH) / 2, hw: HCS, hh: NY * PITCH });
    const dsign = doorIx === 0 ? -1 : 1;
    pg.shelters.push({ door: { x: cx + (doorIx - (NX - 1) / 2) * PITCH + dsign * 0.9, z: cz }, inside: { x: cx, z: cz } });
  },
  // pre-placed wreck (a prefab, not a vehicle: order in the build matters)
  wreck(world, field, pg, s) {
    const wk = addBody(world, { kind: "wreck", team: 0, group: s.group || "hillwreck", mass: 900, hx: 1.25, hy: 0.7, hz: 1.85, x: s.x, z: s.z, y: groundY(field, s.x, s.z, 0.75), friction: 0.5, q: heading(null, s.yaw) });
    wk.sleeping = true;
  },
};

function spawnSquad(world, field, s, ice) {
  // rubble clearance for reissued details: a spawn cell fouled by collapsed
  // masonry crushes the unit and files a COLLAPSE nobody fired (AC-07 found
  // this). The replacement stages beside the ruin — deterministic ring
  // search for clear ground, nearest first. Initial builds are untouched:
  // squads spawn before prefabs, so no chunk exists yet and parity holds.
  const fouled = (px, pz, m = 0.45) => {
    for (const o of world.bodies) {
      if (o.kind !== "chunk") continue;
      // overhead masonry (an intact roof) doesn't foul the floor beneath it
      if (o.pos.y - o.hy > field.heightAt(px, pz) + 2.0) continue;
      if (Math.abs(o.pos.x - px) < o.hx + m && Math.abs(o.pos.z - pz) < o.hz + m) return true;
    }
    return false;
  };
  const RING = [[0, -1], [-1, 0], [1, 0], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]];
  for (let i = 0; i < s.nx; i++) for (let j = 0; j < s.nz; j++) {
    let x = s.x0 + i * s.dx, z = s.z0 + j * s.dz;
    if (fouled(x, z)) {
      // relocation candidates demand REAL clearance (0.7) — a gap between
      // rubble stones reads clear at spawn margin but squeezes the man
      outer: for (const r of [1.8, 3.2, 4.6, 6.0]) {
        for (const [ox, oz] of RING) {
          if (!fouled(x + ox * r, z + oz * r, 0.7)) { x = x + ox * r; z = z + oz * r; break outer; }
        }
      }
    }
    const hy = s.utype === "gren" ? 0.92 : 0.86;
    // frozen pool: a squad staged inside the pool rect stands ON the sheet
    // (the thin_ice spawn floor), not at the bowl floor where field.heightAt
    // puts it — without this the crossing detail drowns at t=0 and
    // self-completes the order
    const onIce = ice && x > ice.x0 && x < ice.x1 && z > ice.z0 && z < ice.z1;
    // max(): a causeway pad may raise dry ground above the sheet plane
    // inside the rect — stand on whichever is higher
    let y = onIce ? Math.max(ice.level - 0.058 + 0.09 + hy, groundY(field, x, z, hy)) : groundY(field, x, z, hy);
    // last resort when the whole area is fouled: stand ON the ruin (pair-
    // contact grounding carries walkers on debris)
    for (const o of world.bodies) {
      if (o.kind !== "chunk") continue;
      if (Math.abs(o.pos.x - x) < o.hx + 0.3 && Math.abs(o.pos.z - z) < o.hz + 0.3) {
        const t = o.pos.y + o.hy + hy + 0.04;
        if (t > y) y = t;
      }
    }
    const u = addBody(world, { kind: "unit", team: 2, group: s.tag, mass: 82, hx: 0.26, hy, hz: 0.26, x, z, y, hp: s.utype === "gren" ? 45 : 30, friction: 0.55 });
    if (s.utype) u.utype = s.utype;
    if (s.brave) u.brave = true;
    // campaign dress: "android" | "human". Drives the renderer's palette and
    // the kill smear style; specs without it (demo parity, sandbox) spawn
    // exactly as before. Not part of worldHash — visual-only, physics blind.
    if (s.dress) { u.dress = s.dress; u.smearStyle = s.dress; }
  }
}

const VEHICLES = {
  truck(world, field, v) {
    const t = addBody(world, { kind: "truck", team: 2, group: v.group || "convoy", vtype: "truck", mass: 1400, hx: 1.15, hy: 1.05, hz: 2.6, x: v.x, z: v.z, y: groundY(field, v.x, v.z, 1.05), hp: 120, friction: 0.6, q: heading(null, v.yaw) });
    t.sleeping = true;
  },
  scout(world, field, v) {
    addBody(world, { kind: "vehicle", team: 2, group: v.group || "scout", mass: 950, hx: 1.25, hy: 0.7, hz: 1.85, x: v.x, z: v.z, y: groundY(field, v.x, v.z, 0.7), hp: 55, friction: 0.7, q: heading(null, v.yaw) });
  },
};

// authored terrain: the demo's terrain formulas, data-driven (base roll,
// hills, optional pool bowl, flat-top pads, then the 24-degree relaxation)
function buildTerrainSpec(field, t) {
  const r = mulberry32(t.terrainSeed != null ? t.terrainSeed : 11);
  const { n, cs, h, half } = field;
  const pool = t.pool || null;
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const x = i * cs - half, z = j * cs - half;
    let y = 2.2 + Math.sin(x * 0.11 + 1.7) * 0.26 + Math.cos(z * 0.13 - 0.4) * 0.22 + (r() - 0.5) * 0.08;
    for (const hl of t.hills || []) {
      const dh = ((x - hl.x) * (x - hl.x) + (z - hl.z) * (z - hl.z)) / (hl.r * hl.r);
      y += hl.h * Math.exp(-dh);
    }
    if (pool) {
      const px = Math.max(pool.x0 - x, 0, x - pool.x1), pz = Math.max(pool.z0 - z, 0, z - pool.z1);
      const pd = Math.sqrt(px * px + pz * pz);
      const pL = 8;
      if (pd < pL) {
        const tt = 1 - pd / pL;
        const bowl = pool.level - 1.7;
        y = y * (1 - tt * tt) + bowl * tt * tt;
      }
    }
    for (const p of t.pads || []) {
      const d = Math.sqrt((x - p.x) * (x - p.x) + (z - p.z) * (z - p.z));
      if (d >= p.r) continue;
      const tt = Math.min(1, (p.r - d) / (p.r * 0.45));
      y = y * (1 - tt) + p.h * tt;
    }
    h[j * n + i] = y;
  }
  const maxStep = Math.tan(0.445) * cs, dStep = maxStep * Math.SQRT2;
  const level = pool ? pool.level : -1e9; // no pool: nothing counts as wet
  const wfloor = level - 0.1;
  for (let pass = 0; pass < 4; pass++) {
    for (let j = 1; j < n - 1; j++) for (let i = 1; i < n - 1; i++) {
      const k = j * n + i;
      const wet = h[k] <= level;
      const dn = (kk) => (wet ? h[kk] : Math.max(h[kk], wfloor));
      const lo = Math.min(h[k - 1], h[k + 1], h[k - n], h[k + n]) + maxStep;
      const lod = Math.min(dn(k - n - 1), dn(k - n + 1), dn(k + n - 1), dn(k + n + 1)) + dStep;
      const cap = Math.min(lo, lod);
      if (h[k] > cap) h[k] = cap;
    }
  }
  field.dirty = true;
}

// The loader. Creation order is the contract: player, squads in array order,
// vehicles in array order, prefabs in array order, then freeze.
export function buildScenario(spec, opts = {}) {
  const seed = opts.worldSeed != null ? opts.worldSeed : spec.terrain.worldSeed != null ? spec.terrain.worldSeed : 1234;
  const field = makeField((spec.field && spec.field.n) || 112, (spec.field && spec.field.cs) || 1.7, seed);
  if (spec.terrain.stock === "proving") buildTerrain(field, spec.terrain.terrainSeed != null ? spec.terrain.terrainSeed : 11);
  else buildTerrainSpec(field, spec.terrain);
  const world = makeWorld({ field, seed, water: spec.terrain.pool || null });
  const pg = { covers: [], shelters: [], wallIndex: 0 };
  const ice = spec.terrain.freeze && spec.terrain.pool ? spec.terrain.pool : null;
  const p = spec.player;
  const bison = addBody(world, { kind: "vehicle", team: 1, driver: "player", mass: 3800, hx: 2.2, hy: 0.95, hz: 3.3, x: p.x, z: p.z, y: groundY(field, p.x, p.z, 0.95), hp: 1e9, friction: 0.85, q: heading(null, p.yaw || 0) });
  world.bisonId = bison.id;
  for (const s of spec.squads || []) spawnSquad(world, field, s, ice);
  for (const v of spec.vehicles || []) VEHICLES[v.kind](world, field, v);
  for (const pf of spec.prefabs || []) BUILDERS[pf.type](world, field, pg, pf);
  const removeGroup = (pred) => {
    for (let i = world.bodies.length - 1; i >= 0; i--) {
      const b = world.bodies[i];
      if (pred(b)) { world.byId.delete(b.id); world.bodies.splice(i, 1); }
    }
  };
  const spawnSquadByTag = (tag) => {
    const s = (spec.squads || []).find((q) => q.tag === tag);
    if (s) spawnSquad(world, field, s, ice);
  };
  // PARITY FINDING: the demo collects shelter metadata but never exposes it —
  // world.pg carries no `shelters` key, so the engine's house-shelter seek is
  // dead code at runtime. Reproducing the hand-built world exactly means
  // shelters stay off by default; opts.shelters is the deliberate opt-in
  // (the sandbox uses it — panicking infantry runs indoors).
  world.pg = {
    covers: pg.covers,
    ...(opts.shelters ? { shelters: pg.shelters } : {}),
    respawnSquads() {
      removeGroup((b) => b.kind === "unit" || b.kind === "truck");
      for (const s of spec.squads || []) spawnSquad(world, field, s, ice);
      for (const v of spec.vehicles || []) if (v.kind === "truck") VEHICLES.truck(world, field, v);
    },
    respawnSquad(tag) { removeGroup((b) => b.kind === "unit" && b.group === tag); spawnSquadByTag(tag); },
    // campaign restock: reissue EVERYTHING the spec spawned under a tag —
    // squads and vehicles alike (AC-01's subjects are staged hulls, not men).
    // Wrecked vehicles keep their group, so the sweep clears them too.
    respawnGroup(tag) {
      removeGroup((b) => b.group === tag && (b.kind === "unit" || b.kind === "vehicle" || b.kind === "truck" || b.kind === "wreck"));
      for (const s of spec.squads || []) if (s.tag === tag) spawnSquad(world, field, s, ice);
      for (const v of spec.vehicles || []) if ((v.group || (v.kind === "truck" ? "convoy" : "scout")) === tag) VEHICLES[v.kind](world, field, v);
    },
    respawnScouts() {
      removeGroup((b) => b.group === "scout" && b.kind === "vehicle");
      for (const v of spec.vehicles || []) if (v.kind === "scout") VEHICLES.scout(world, field, v);
    },
    repairGarrison() {
      for (const pf of spec.prefabs || []) {
        if (pf.type !== "keep") continue;
        const grp = pf.group || "garrison";
        removeGroup((b) => b.group === grp);
        world.welds = world.welds.filter((w) => w.a.group !== grp && w.b.group !== grp);
        BUILDERS.keep(world, field, pg, pf);
      }
    },
    // collapse-cause maps where houses are the kill vehicle (AC-07): the
    // restock re-lays the settlement so reissued garrisons stage indoors
    // again. Covers/shelters the builder re-pushes are truncated — the
    // originals already point at the same geometry.
    repairHouses() {
      for (const pf of spec.prefabs || []) {
        if (pf.type !== "house" || !pf.group) continue;
        removeGroup((b) => b.group === pf.group);
        world.welds = world.welds.filter((w) => w.a.group !== pf.group && w.b.group !== pf.group);
        const c0 = pg.covers.length, s0 = pg.shelters.length;
        BUILDERS.house(world, field, pg, pf);
        pg.covers.length = c0; pg.shelters.length = s0;
      }
    },
    freeze() { freezePool(world); },
    thaw() { thawPool(world); },
  };
  if (spec.terrain.freeze) freezePool(world);
  return world;
}

// content lint: the budgets a scenario declares are enforced, not advisory
export function lintScenario(spec, world) {
  const problems = [];
  const b = spec.budget || {};
  if (b.bodies != null && world.bodies.length > b.bodies) problems.push(`bodies ${world.bodies.length} > budget ${b.bodies}`);
  if (b.welds != null && world.welds.length > b.welds) problems.push(`welds ${world.welds.length} > budget ${b.welds}`);
  if (spec.terrain.freeze && !spec.terrain.pool) problems.push("freeze requires a pool");
  return problems;
}

// additive export: the mech range borrows the sandbox prefabs (no parity risk — builders only run when called)
export { BUILDERS };
