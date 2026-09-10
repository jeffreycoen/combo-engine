// COLDSNAP — TOWER DEFENSE ("HOLD THE DEPOT")
// Grid-and-flow-field TD on a real Coldsnap map: rolling snowfield, rock
// outcrops that channel the approach, frozen ponds you cannot fortify, and a
// plateau objective. Runs on the CERTIFIED engine (src/engine/core.js —
// masonry welds, blasts, craters, projectiles, sleep) and the shared renderer
// (tactical camera + tower/overlay support). The original standalone build
// carried its own physics and renderer; both are gone. See git history for
// the pre-port file.
import React, { useEffect, useRef, useState } from "react";
import {
  makeField, makeWorld, addBody, addWeld, stepWorld, fireProjectile, fireVolley,
  explode, aimSolve, applyDamage, mulberry32, __mech__,
} from "../engine/core.js";
import { makeRenderer } from "../render/renderer.js";
import { buildMech, mechCommand, mechFallen, respawnMech } from "../engine/mech.js";
import { makeGameAudio } from "../platform/audio.js";

const { V, v3, wake } = __mech__;

// ============================================================== the map
// 56x56 grid of 2m cells. Enemies enter from the south treeline and walk
// north to the depot on the plateau.
const GRID_CS = 2.0, GRID_W = 28, GRID_H = 56; // canonical frame: u across (28 cells), v along the assault axis (56)
const GRID_OX = -(GRID_W * GRID_CS) / 2, GRID_OZ = -(GRID_H * GRID_CS) / 2;
// ORIENTATION: the rectangular playfield lies in one of four world
// orientations per seed — the enemy comes from whichever edge the seed
// says. Generation stays CANONICAL (u, v with v running spawn->depot);
// these two transforms are the only doorway between frames.
let ORIENT = 0;
const fwdU = (u, v) => ORIENT === 0 ? { x: u, z: v } : ORIENT === 1 ? { x: -v, z: u } : ORIENT === 2 ? { x: -u, z: -v } : { x: v, z: -u };
const fwdDir = (du, dv) => ORIENT === 0 ? { x: du, z: dv } : ORIENT === 1 ? { x: -dv, z: du } : ORIENT === 2 ? { x: -du, z: -dv } : { x: dv, z: -du };
const invW = (x, z) => ORIENT === 0 ? { u: x, v: z } : ORIENT === 1 ? { u: z, v: -x } : ORIENT === 2 ? { u: -x, v: -z } : { u: -z, v: x };
let OBJ_POS = { x: 0, z: 49 };
// ================================================= procedural map
// Every run is a new field order. The DOCTRINE is fixed, the ground is not:
// the south THIRD is no-man's-land — open snow, a broken ruin, the treeline
// the enemy spawns behind — so there is always room to meet them before the
// town. The first ridge band is the town line; the village lives on the
// benches behind it. Passes, ponds, buildings, roads all come off one seed
// (mulberry32 — same generator the engine trusts), validated for
// connectivity before a seed is allowed to ship.
let SPAWN_POINTS = [], PONDS = [], ROCKS = [], TOWN = [], ROADS = [], PASSES = [], BANDS = [], MAP_SEED = 0, SPAWN_U = [];
function genMap(seed) {
  const r = mulberry32(seed);
  const bands = [-17 + (r() - 0.5) * 6, 7 + (r() - 0.5) * 8, 31 + (r() - 0.5) * 6];
  const passes = bands.map((z) => [{ x: -20 + r() * 13, z }, { x: 5 + r() * 15, z }]);
  const rocks = [];
  for (let bi = 0; bi < bands.length; bi++) {
    // some ridges are walls of granite, some are nearly bare — density is
    // a die roll per band, not a constant
    const density = 0.35 + r() * 0.65;
    for (let x = -25; x <= 25; x += 5.5 + r() * 3) {
      if (r() > density) continue;
      const z = bands[bi] + (r() - 0.5) * 2.5;
      if (passes[bi].some((g) => Math.abs(x - g.x) < 6.5)) continue;
      rocks.push({ x, z, r: 3.4 + r() * 1.2, h: 3.0 + r() * 0.9 });
    }
  }
  const spawns = [-18 + r() * 5, -3 + r() * 6, 13 + r() * 5].map((x) => ({ x, z: GRID_OZ + 2 }));
  const roads = [0, 1].map((side) => {
    const pts = [[spawns[side === 0 ? 0 : 2].x, GRID_OZ + 2]];
    for (const band of passes) pts.push([band[side].x, band[side].z]);
    pts.push([0, 49]);
    return pts;
  });
  const roadDist = (x, z) => {
    let best = 1e9;
    for (const route of roads) for (let i = 0; i < route.length - 1; i++) {
      const a = route[i], b2 = route[i + 1];
      const dx = b2[0] - a[0], dz = b2[1] - a[1];
      const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz)));
      best = Math.min(best, Math.hypot(x - (a[0] + dx * t), z - (a[1] + dz * t)));
    }
    return best;
  };
  const ponds = [];
  const nP = 1 + Math.floor(r() * 4); // 1-4 ponds
  for (let i = 0; i < 30 && ponds.length < nP; i++) {
    const x = -18 + r() * 36, z = -12 + r() * 48, rad = 5.5 + r() * 2.5;
    if (passes.flat().some((g) => Math.abs(x - g.x) < 9 && Math.abs(z - g.z) < 14)) continue;
    if (roadDist(x, z) < rad + 6) continue; // a pond ON the road bowls the boss over (25 stumbles, measured)
    if (Math.hypot(x - 0, z - 49) < 16) continue;
    if (ponds.some((q) => Math.hypot(x - q.x, z - q.z) < q.r + rad + 6)) continue;
    ponds.push({ x, z, r: rad, level: 0 });
  }
  const TPL = [
    { t: "croft", nx: 4, nz: 3, ny: 3 }, { t: "house", nx: 6, nz: 5, ny: 4 },
    { t: "house", nx: 5, nz: 4, ny: 4 }, { t: "long", nx: 8, nz: 4, ny: 3 },
    { t: "watch", nx: 2, nz: 2, ny: 8 }, { t: "granary", nx: 3, nz: 3, ny: 7 },
    { t: "yard", nx: 6, nz: 5, ny: 2, roof: false }, { t: "shed", nx: 4, nz: 4, ny: 3 },
    { t: "chapel", nx: 5, nz: 6, ny: 5 }, { t: "keep", nx: 7, nz: 6, ny: 5 },
  ];
  const town = [{ id: "depot", x: 0, z: 52, nx: 9, nz: 7, ny: 6, door: 4, depot: true }]; // clear of the rim — the prize must be SEEN
  const benches = [[bands[0] + 8, bands[1] - 7], [bands[1] + 8, bands[2] - 7], [bands[2] + 8, 46]];
  let bid = 0;
  for (let bi = 0; bi < benches.length; bi++) {
    const want = 2 + Math.floor(r() * 4); // 2-5 buildings per bench — hamlets and towns both happen
    for (let k = 0, placed = 0; k < 90 && placed < want; k++) {
      const tpl = TPL[Math.floor(r() * TPL.length)];
      const swap = r() < 0.5;
      const nx = swap ? tpl.nz : tpl.nx, nz = swap ? tpl.nx : tpl.nz;
      const x = -21 + r() * 42;
      const z = benches[bi][0] + r() * Math.max(2, benches[bi][1] - benches[bi][0]);
      const rad = Math.max(nx, nz) * MASON.pitch / 2 + 2;
      if (passes.flat().some((g) => Math.abs(x - g.x) < rad + 4 && Math.abs(z - g.z) < 12)) continue;
      if (ponds.some((q) => Math.hypot(x - q.x, z - q.z) < q.r + rad + 3)) continue;
      if (rocks.some((q) => Math.hypot(x - q.x, z - q.z) < q.r + rad + 1.5)) continue;
      if (town.some((q) => Math.hypot(x - q.x, z - q.z) < rad + Math.max(q.nx, q.nz) * MASON.pitch / 2 + 2.5)) continue;
      // some of the village was never finished, or didn't winter well — a
      // fifth of the buildings roll partially built/fallen. That's the rules
      // working, not a broken roll.
      const decay = r() < 0.2 ? 0.12 + r() * 0.3 : 0;
      town.push({ id: tpl.t + bid++, x, z, nx, nz, ny: tpl.ny, door: r() < 0.5 ? 0 : nx - 1, roof: tpl.roof, ruin: decay || undefined });
      placed++;
    }
  }
  // no-man's-land keeps a broken croft or two — cover, not comfort
  const nRuin = Math.floor(r() * 3); // 0-2 broken crofts in the waste
  for (let k = 0, placed = 0; k < 14 && placed < nRuin; k++) {
    const x = -18 + r() * 36, z = -46 + r() * 20;
    if (spawns.some((sp) => Math.hypot(x - sp.x, z - sp.z) < 10)) continue;
    if (town.some((q) => Math.hypot(x - q.x, z - q.z) < 10)) continue;
    town.push({ id: "oldruin" + placed, x, z, nx: 4, nz: 4, ny: 3, door: 0, ruin: 0.5 });
    placed++;
  }
  // stamp the canonical layout into the world orientation. Buildings are
  // axis-aligned lattices, so odd orientations swap their footprints.
  const T = (o) => { const w = fwdU(o.x, o.z); o.x = w.x; o.z = w.z; return o; };
  for (const k of rocks) T(k);
  for (const q of ponds) T(q);
  for (const t of town) { T(t); if (ORIENT % 2) { const nx0 = t.nx; t.nx = t.nz; t.nz = nx0; t.door = Math.min(t.door, t.nx - 1); } }
  const spawnU = spawns.map((sp) => sp.x);
  for (const sp of spawns) T(sp);
  for (const band of passes) for (const g of band) T(g);
  for (const route of roads) for (const pt of route) { const w = fwdU(pt[0], pt[1]); pt[0] = w.x; pt[1] = w.z; }
  return { seed, bands, passes, rocks, ponds, spawns, spawnU, town, roads };
}
// validate + install: a seed only ships if every spawn can reach the depot
function makeMap(seed) {
  for (let attempt = 0; attempt < 10; attempt++) {
    const sd = seed + attempt * 7919;
    ORIENT = sd % 4;
    OBJ_POS = fwdU(0, 49);
    const m = genMap(sd);
    MAP_SEED = sd; BANDS = m.bands; PASSES = m.passes; ROCKS = m.rocks;
    PONDS = m.ponds; SPAWN_POINTS = m.spawns; TOWN = m.town; ROADS = m.roads;
    SPAWN_U = m.spawnU;
    const g = makeGrid(null);
    for (const t of TOWN) { // stamp footprints exactly as buildTown will
      const hx = (t.nx * MASON.pitch) / 2, hz = (t.nz * MASON.pitch) / 2;
      for (let gz = 0; gz < GRID_H; gz++) for (let gx = 0; gx < GRID_W; gx++) {
        const wp = g.gridToWorld(gx, gz);
        if (Math.abs(wp.x - t.x) < hx + 1.0 && Math.abs(wp.z - t.z) < hz + 1.0) {
          if (Math.hypot(wp.x - OBJ_POS.x, wp.z - OBJ_POS.z) < 5) continue;
          g.cells[g.idx(gx, gz)].blocked = true;
        }
      }
    }
    const og = g.worldToGrid(OBJ_POS.x, OBJ_POS.z);
    // even a hamlet needs SOMETHING to hold — 6 structures incl. the depot
    if (TOWN.length >= 6 && checkConnectivity(g, SPAWN_POINTS, og.gx, og.gz)) return;
  }
  // ten broken rolls in a row would be a generator bug — the last one stands
}

const MASON = { hcs: 0.40, pitch: 0.83, mass: 100, breakF: 8.0e4 };

// The ground itself. Written once at boot into the ENGINE's field; the
// renderer bakes slope, snow, rock and ice straight out of these numbers.
function buildTdTerrain(field, seed = 11) {
  const r = mulberry32(seed);
  const { n, cs, h, half } = field;
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const x = i * cs - half, z = j * cs - half;
    // rolling snowfield climbing north in three TERRACES, each step riding
    // its ridge band — the map reads as benched high ground, not a ramp.
    // Mortars arc over the lips; guns on a bench own the bench below.
    const cuv = invW(x, z); // terraces climb along the CANONICAL assault axis
    const stepUp = (v0, w, h2) => { const t = Math.min(1, Math.max(0, (cuv.v - v0) / w + 0.5)); return h2 * t * t * (3 - 2 * t); };
    let y = 2.0
      + Math.sin(x * 0.075 + 1.3) * 0.42
      + Math.cos(z * 0.061 - 0.6) * 0.38
      + Math.sin((x + z) * 0.032) * 0.30
      + (r() - 0.5) * 0.06
      + stepUp(BANDS[0] - 1, 10, 1.8) + stepUp(BANDS[1] - 1, 10, 2.0) + stepUp(BANDS[2] - 1, 10, 2.2);
    // THE WORLD ENDS at the playfield rim: past it the shelf breaks off and
    // drops away — the map is the map, not an infinite plain
    const over = Math.max(0, Math.abs(cuv.u) - 29, Math.abs(cuv.v) - 57);
    if (over > 0) y = Math.max(-6, y - over * over * 0.55);
    for (const k of ROCKS) {
      const d = Math.hypot(x - k.x, z - k.z) / k.r;
      if (d < 1.6) y += k.h * Math.exp(-d * d * 2.1);
    }
    // Frozen solid: the sheet is a flat pan at pond level, blended into a
    // shallow bank. Carving a basin under walkable ice drops them into a hole
    // and they spend the wave climbing back out of it.
    for (const p of PONDS) {
      const d = Math.hypot(x - p.x, z - p.z);
      const lip = p.r + 4.5;
      if (d < lip) {
        const t = Math.min(1, (lip - d) / 4.5);
        y = y * (1 - t) + p.level * t;
      }
    }
    h[j * n + i] = y;
  }
  // building pads: masonry conforms to whatever the ground is at build time,
  // so level it first or the walls arrive pre-sheared
  for (const t of TOWN) {
    const rad = Math.hypot(t.nx, t.nz) * MASON.pitch / 2 + 2.0;
    const ph = h[Math.round((t.z + half) / cs) * n + Math.round((t.x + half) / cs)];
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const x = i * cs - half, z = j * cs - half;
      const d = Math.hypot(x - t.x, z - t.z);
      if (d >= rad) continue;
      h[j * n + i] += (ph - h[j * n + i]) * Math.min(1, (rad - d) / 1.8);
    }
  }
  // depot plateau: dead level so the objective reads as a built place
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const x = i * cs - half, z = j * cs - half;
    const d = Math.hypot(x - OBJ_POS.x, z - OBJ_POS.z);
    if (d < 9) {
      const t = Math.min(1, (9 - d) / 4.5);
      const ph = 2.0 + 1.8 + 2.0 + 2.2 + 0.5; // above all three terrace steps
      h[j * n + i] += (ph - h[j * n + i]) * t;
    }
  }
  // slope relaxation: a 30-degree cap everywhere so infantry never meets a
  // face they cannot stand on, and so the rock skirts read as scree not cliffs
  const maxStep = Math.tan(0.52) * cs, dStep = maxStep * Math.SQRT2;
  for (let pass = 0; pass < 3; pass++) {
    for (let j = 1; j < n - 1; j++) for (let i = 1; i < n - 1; i++) {
      const k = j * n + i;
      const lo = Math.min(h[k - 1], h[k + 1], h[k - n], h[k + n]) + maxStep;
      const lod = Math.min(h[k - n - 1], h[k - n + 1], h[k + n - 1], h[k + n + 1]) + dStep;
      const cap = Math.min(lo, lod);
      if (h[k] > cap) h[k] = cap;
    }
  }
  // CART ROADS: two graded routes spawn->passes->depot, smoothed near-flat
  // (~6 degrees) along their whole length. The village hauled up these
  // benches — and the boss walker's gait envelope is flat ground: on raw
  // terrain it fell every ~20s (swing targets plan LEVEL; slopes land the
  // foot early/late — the M-next rough-ground problem, not solvable here).
  // Everything marches better on a road; the boss NEEDS one.
  const segD = (x, z, a, b) => {
    const dx = b[0] - a[0], dz = b[1] - a[1];
    const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz)));
    return Math.hypot(x - (a[0] + dx * t), z - (a[1] + dz * t));
  };
  const onRoad = new Uint8Array(n * n);
  for (let j = 1; j < n - 1; j++) for (let i = 1; i < n - 1; i++) {
    const x = i * cs - half, z = j * cs - half;
    for (const route of ROADS) {
      for (let sgi = 0; sgi < route.length - 1 && !onRoad[j * n + i]; sgi++) {
        if (segD(x, z, route[sgi], route[sgi + 1]) < 4.5) onRoad[j * n + i] = 1;
      }
    }
  }
  const roadStep = Math.tan(0.10) * cs;
  for (let pass = 0; pass < 60; pass++) {
    for (let j = 1; j < n - 1; j++) for (let i = 1; i < n - 1; i++) {
      const k = j * n + i;
      if (!onRoad[k]) continue;
      const cap = Math.min(h[k - 1], h[k + 1], h[k - n], h[k + n]) + roadStep;
      if (h[k] > cap) h[k] = cap;
    }
  }
  field.dirty = true;
}
function pondAt(x, z) {
  for (const p of PONDS) if (Math.hypot(x - p.x, z - p.z) < p.r) return p;
  return null;
}
function rockAt(x, z) {
  for (const k of ROCKS) if (Math.hypot(x - k.x, z - k.z) < k.r * 0.78) return k;
  return null;
}

// ========================================================== grid + flow
function makeGrid(field) {
  const cells = new Array(GRID_W * GRID_H);
  for (let i = 0; i < cells.length; i++) cells[i] = { blocked: false, terrain: false, ice: false, dx: 0, dz: 0, dist: 1e9, wallId: null };
  const G = {
    cells, w: GRID_W, h: GRID_H, cs: GRID_CS, ox: GRID_OX, oz: GRID_OZ,
    idx: (gx, gz) => gz * GRID_W + gx,
    worldToGrid: (x, z) => { const c = invW(x, z); return { gx: Math.floor((c.u - GRID_OX) / GRID_CS), gz: Math.floor((c.v - GRID_OZ) / GRID_CS) }; },
    gridToWorld: (gx, gz) => fwdU(GRID_OX + (gx + 0.5) * GRID_CS, GRID_OZ + (gz + 0.5) * GRID_CS),
    inBounds: (gx, gz) => gx >= 0 && gx < GRID_W && gz >= 0 && gz < GRID_H,
    cellAt(x, z) {
      const g = G.worldToGrid(x, z);
      if (!G.inBounds(g.gx, g.gz)) return null;
      return cells[G.idx(g.gx, g.gz)];
    },
  };
  // stamp the map's own geography into the grid: rock is a wall you did not
  // pay for, ice is ground you may cross but never build on
  for (let gz = 0; gz < GRID_H; gz++) for (let gx = 0; gx < GRID_W; gx++) {
    const wp = G.gridToWorld(gx, gz);
    const c = cells[G.idx(gx, gz)];
    if (rockAt(wp.x, wp.z)) { c.blocked = true; c.terrain = true; }
    else if (pondAt(wp.x, wp.z)) c.ice = true;
  }
  return G;
}

function computeFlowField(grid, objGx, objGz) {
  const { cells } = grid;
  for (let i = 0; i < cells.length; i++) { cells[i].dist = 1e9; cells[i].dx = 0; cells[i].dz = 0; }
  if (!grid.inBounds(objGx, objGz)) return;
  const q = [{ gx: objGx, gz: objGz }];
  cells[grid.idx(objGx, objGz)].dist = 0;
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]];
  let head = 0;
  while (head < q.length) {
    const cur = q[head++];
    const cd = cells[grid.idx(cur.gx, cur.gz)].dist;
    for (const d of dirs) {
      const nx = cur.gx + d[0], nz = cur.gz + d[1];
      if (!grid.inBounds(nx, nz)) continue;
      const ni = grid.idx(nx, nz);
      if (cells[ni].blocked) continue;
      if (d[0] !== 0 && d[1] !== 0) {
        if (cells[grid.idx(cur.gx + d[0], cur.gz)].blocked || cells[grid.idx(cur.gx, cur.gz + d[1])].blocked) continue;
      }
      // ice is quicker underfoot than snow, so the field prefers it — that is
      // the whole point of leaving a pond in the middle of your maze
      const step = (d[0] !== 0 && d[1] !== 0) ? 1.414 : 1;
      const nd = cd + step * (cells[ni].ice ? 0.72 : 1);
      if (nd < cells[ni].dist - 1e-6) { cells[ni].dist = nd; q.push({ gx: nx, gz: nz }); }
    }
  }
  for (let gz = 0; gz < GRID_H; gz++) for (let gx = 0; gx < GRID_W; gx++) {
    const ci = grid.idx(gx, gz);
    if (cells[ci].blocked || cells[ci].dist >= 1e8) continue;
    let bestD = cells[ci].dist, bx = 0, bz = 0;
    for (const d of dirs) {
      const nx = gx + d[0], nz = gz + d[1];
      if (!grid.inBounds(nx, nz)) continue;
      const nd = cells[grid.idx(nx, nz)].dist;
      if (nd < bestD) { bestD = nd; bx = d[0]; bz = d[1]; }
    }
    const L = Math.hypot(bx, bz) || 1;
    cells[ci].dx = bx / L; cells[ci].dz = bz / L;
  }
}

function checkConnectivity(grid, spawns, objGx, objGz) {
  const visited = new Uint8Array(grid.w * grid.h);
  const q = [{ gx: objGx, gz: objGz }];
  visited[grid.idx(objGx, objGz)] = 1;
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  let head = 0;
  while (head < q.length) {
    const cur = q[head++];
    for (const d of dirs) {
      const nx = cur.gx + d[0], nz = cur.gz + d[1];
      if (!grid.inBounds(nx, nz)) continue;
      const ni = grid.idx(nx, nz);
      if (visited[ni] || grid.cells[ni].blocked) continue;
      visited[ni] = 1; q.push({ gx: nx, gz: nz });
    }
  }
  for (const sp of spawns) {
    const g = grid.worldToGrid(sp.x, sp.z);
    if (!grid.inBounds(g.gx, g.gz)) continue;
    if (!visited[grid.idx(g.gx, g.gz)]) return false;
  }
  return true;
}

// ================================================================ towers
const TOWER_SPECS = {
  mg:     { range: 15, fireRate: 0.17, projSpeed: 95, dmg: 5,  blastR: 0.3, kv: 0.5, cost: 15, hp: 80,  crater: 0, label: "MG",     icon: "⊞", kind: "mg",    hy: 1.0, blurb: "Fast, cheap, short reach" },
  gun:    { range: 19, fireRate: 1.05, projSpeed: 58, dmg: 25, blastR: 2.3, kv: 8,   cost: 25, hp: 130, crater: 0.55, label: "GUN",    icon: "⚑", kind: "shell", hy: 1.5, blurb: "Flat-trajectory workhorse" },
  mortar: { range: 26, fireRate: 2.3,  projSpeed: 33, dmg: 38, blastR: 3.8, kv: 10,  cost: 35, hp: 95,  crater: 0.8, label: "MORTAR", icon: "◎", kind: "shell", hy: 0.8, blurb: "Arcs over walls, big blast" },
  rocket: { range: 23, fireRate: 4.4,  projSpeed: 30, dmg: 27, blastR: 3.4, kv: 9,   cost: 50, hp: 110, volley: 4, crater: 0.7, label: "ROCKET", icon: "▲", kind: "shell", hy: 1.2, blurb: "Four-round salvo, slow reload" },
  frost:  { range: 12, fireRate: 0,    projSpeed: 0,  dmg: 0,  blastR: 0,   kv: 0,   cost: 20, hp: 85,  label: "FROST",  icon: "❄", kind: "mg",    slow: 0.42, hy: 1.35, blurb: "Halves their pace in radius" },
};
const TOWER_ORDER = ["mg", "gun", "mortar", "rocket", "frost"];
// off-map rocket support: the engine's volley (strike marker, delayed rain).
// Not a tower — a command. Long rearm keeps it a decision, not a mortar.
const STRIKE = { cost: 45, cd: 40, rockets: 6, label: "STRIKE", icon: "▼", blurb: "Six rockets on the mark" };

function stepTowers(world) {
  const dt = world.dt;
  for (const b of world.bodies) {
    if (b.kind !== "tower" || !b.alive) continue;
    const spec = TOWER_SPECS[b.towerType] || TOWER_SPECS.gun;
    if (spec.fireRate <= 0) continue;
    b.fireCd = (b.fireCd || 0) - dt;
    // hold a target between scans; re-acquire only when it dies or walks out
    let best = b.targetId ? world.byId.get(b.targetId) : null;
    if (best && (!best.alive || best.team !== 2 || (best.kind !== "unit" && best.kind !== "vehicle"))) best = null;
    if (best) {
      const dx = best.pos.x - b.pos.x, dz = best.pos.z - b.pos.z;
      if (dx * dx + dz * dz > spec.range * spec.range) best = null;
    }
    b.scanCd = (b.scanCd || 0) - dt;
    if (!best && b.scanCd <= 0) {
      b.scanCd = 0.11 + (b.id % 8) * 0.011;   // ~8Hz, staggered so scans don't align
      let bd = spec.range * spec.range;
      for (const e of world.bodies) {
        if ((e.kind !== "unit" && e.kind !== "vehicle") || !e.alive || e.team !== 2) continue;
        const dx = e.pos.x - b.pos.x, dz = e.pos.z - b.pos.z;
        const d2 = dx * dx + dz * dz;
        if (d2 < bd) { bd = d2; best = e; }
      }
    }
    b.targetId = best ? best.id : null;
    if (!best || b.fireCd > 0) continue;
    b.fireCd = spec.fireRate;
    b.flashT = world.t;
    const muzzle = v3(b.pos.x, b.pos.y + b.hy + 0.45, b.pos.z);
    const high = b.towerType === "mortar";
    // lead: predicted intercept point, refined twice. Matters most for the
    // mortar's high arc (3s+ flight) but tightens the gun and rockets too.
    let ax2 = best.pos.x, az2 = best.pos.z, ay2 = best.pos.y;
    for (let li = 0; li < 2; li++) {
      const ld = Math.max(2, Math.hypot(ax2 - muzzle.x, az2 - muzzle.z));
      const lp = aimSolve(spec.projSpeed, ld, ay2 - muzzle.y, 9.8, high);
      if (lp == null) break;
      const tof = ld / Math.max(1e-3, spec.projSpeed * Math.cos(lp));
      ax2 = best.pos.x + best.v.x * tof;
      az2 = best.pos.z + best.v.z * tof;
      ay2 = world.field.heightAt(ax2, az2) + best.hy;   // they stay on the ground
    }
    const dx = ax2 - muzzle.x, dz = az2 - muzzle.z;
    const dy = ay2 - muzzle.y;
    const shots = spec.volley || 1;
    for (let si = 0; si < shots; si++) {
      const ox = shots > 1 ? (Math.random() - 0.5) * 3 : 0;
      const oz = shots > 1 ? (Math.random() - 0.5) * 3 : 0;
      const tdx = dx + ox, tdz = dz + oz;
      const td = Math.max(2, Math.hypot(tdx, tdz));
      let pitch = aimSolve(spec.projSpeed, td, dy, 9.8, high);
      if (pitch == null) pitch = high ? 1.1 : 0.45;
      const dir = v3((tdx / td) * Math.cos(pitch), Math.sin(pitch), (tdz / td) * Math.cos(pitch));
      // noImpact: ALL damage flows through the burst — the engine's flat
      // kind-based impact damage would swamp the tuned per-tower numbers
      fireProjectile(world, v3(muzzle.x, muzzle.y + si * 0.28, muzzle.z), dir, spec.projSpeed,
        { kind: spec.kind, r: spec.blastR, kv: spec.kv, dmg: spec.dmg, crater: spec.crater, noImpact: true, attacker: "player", delay: si * 0.12 });
    }
  }
}

// ================================================================== town
// Hollow keeps and houses out of welded stone, dormant until disturbed —
// exactly the proving-grounds recipe, on the engine's own weld machinery.
function buildTown(world, grid, field) {
  const { hcs, pitch, mass, breakF } = MASON;
  const out = [];
  for (const t of TOWN) {
    const grid3 = [], base = field.heightAt(t.x, t.z) + hcs + 0.02;
    for (let ix = 0; ix < t.nx; ix++) for (let iy = 0; iy <= t.ny; iy++) for (let iz = 0; iz < t.nz; iz++) {
      const perim = ix === 0 || ix === t.nx - 1 || iz === 0 || iz === t.nz - 1;
      const corner = (ix <= 1 || ix >= t.nx - 2) && (iz <= 1 || iz >= t.nz - 2);
      if (iy < t.ny && !perim) continue;                                  // hollow
      if (iy === t.ny && t.roof === false) continue;                      // walled yard: open sky
      if (ix === t.door && (iz === 1 || iz === 2) && iy <= 2) continue;   // the doorway
      if (t.depot && iy === t.ny && perim && !corner && (ix + iz) % 2) continue; // crenellated roofline
      if (t.ruin && ((ix * 31 + iy * 17 + iz * 7) % 100) / 100 < t.ruin && iy > 0) continue; // ruins arrive pre-broken
      const c = addBody(world, {
        kind: "chunk", team: 0, mass, hx: hcs, hy: hcs, hz: hcs,
        x: t.x + (ix - (t.nx - 1) / 2) * pitch,
        y: base + iy * pitch,
        z: t.z + (iz - (t.nz - 1) / 2) * pitch,
        friction: 0.65, restitution: 0.02,
      });
      c.sleeping = true;          // dormant until a shell or a breaker arrives
      c.town = t.id;
      c.gpos = [ix, iy, iz];
      grid3.push(c);
    }
    // the depot is a GARRISON blockhouse: four corner bastions rise two
    // courses above the crenellated roof
    if (t.depot) for (const [bx, bz] of [[0, 0], [t.nx - 1, 0], [0, t.nz - 1], [t.nx - 1, t.nz - 1]]) {
      for (let iy = t.ny + 1; iy <= t.ny + 2; iy++) {
        const c = addBody(world, {
          kind: "chunk", team: 0, mass, hx: hcs, hy: hcs, hz: hcs,
          x: t.x + (bx - (t.nx - 1) / 2) * pitch,
          y: base + iy * pitch,
          z: t.z + (bz - (t.nz - 1) / 2) * pitch,
          friction: 0.65, restitution: 0.02,
        });
        c.sleeping = true; c.town = t.id; c.gpos = [bx, iy, bz];
        grid3.push(c);
      }
    }
    const key = (a, b, c2) => a + "," + b + "," + c2;
    const map = new Map(grid3.map((c) => [key(c.gpos[0], c.gpos[1], c.gpos[2]), c]));
    for (const c of grid3) {
      const g = c.gpos;
      for (const d of [[1, 0, 0], [0, 1, 0], [0, 0, 1]]) {
        const o = map.get(key(g[0] + d[0], g[1] + d[1], g[2] + d[2]));
        if (o) addWeld(world, c, o, breakF);
      }
    }
    // the footprint blocks the grid until the building is mostly gone
    const cells = [];
    const hx = (t.nx * pitch) / 2, hz = (t.nz * pitch) / 2;
    for (let gz = 0; gz < GRID_H; gz++) for (let gx = 0; gx < GRID_W; gx++) {
      const wp = grid.gridToWorld(gx, gz);
      // margin covers stone extent + a unit's half-width, or the flow field
      // routes marchers into the physical face and they pin there
      if (Math.abs(wp.x - t.x) < hx + 1.0 && Math.abs(wp.z - t.z) < hz + 1.0) {
        if (Math.hypot(wp.x - OBJ_POS.x, wp.z - OBJ_POS.z) < 5) continue;
        const c = grid.cells[grid.idx(gx, gz)];
        c.blocked = true; c.building = t.id;
        cells.push(grid.idx(gx, gz));
      }
    }
    out.push({ id: t.id, cells, stones: grid3, n0: grid3.length, ruined: false, x: t.x, z: t.z });
  }
  return out;
}
// A building is a ruin once a third of its stones have fallen or been culled;
// at that point its cells open up and the pather is told to re-route through it.
function stepTown(world, grid, town, onRuin) {
  for (const b of town) {
    if (b.ruined) continue;
    let standing = 0;
    for (const s of b.stones) if (world.byId.has(s.id) && s.sleeping) standing++;
    if (standing > b.n0 * 0.66) continue;
    b.ruined = true;
    for (const ci of b.cells) { const c = grid.cells[ci]; c.blocked = false; c.building = null; }
    world.events.push({ type: "collapse", x: b.x, y: world.field.heightAt(b.x, b.z) + 2, z: b.z });
    if (onRuin) onRuin(b);
  }
}

// =============================================================== masonry
// Structure LOD. A wall is ONE body while intact — it sleeps, it costs nothing,
// and the solver never has to converge a lattice under wave load. The moment it
// dies it is replaced by its welded stones, which shear, topple and settle
// exactly like the proving-ground keep. Granular physics is an event, not a
// steady state; that is the invariant the whole engine is built on.
const STONE = 0.30;
const STONE_PITCH = 0.63;
function shatterStructure(world, b, opts) {
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

// =============================================================== enemies
const ENEMY_SPECS = {
  "":    { mass: 82,  hx: 0.26, hy: 0.86, hz: 0.26, hp: 58,  bounty: 4, speed: 3.2, gain: 14, label: "conscript" },
  fast:  { mass: 62,  hx: 0.24, hy: 0.82, hz: 0.24, hp: 36,  bounty: 5, speed: 5.1, gain: 18, label: "runner" },
  heavy: { mass: 340, hx: 0.46, hy: 1.02, hz: 0.46, hp: 290, bounty: 12, speed: 2.1, gain: 11, label: "breaker" },
  gren:  { mass: 84,  hx: 0.26, hy: 0.92, hz: 0.26, hp: 66,  bounty: 8, speed: 2.6, gain: 12, label: "grenadier" },
  sapper:{ mass: 70,  hx: 0.25, hy: 0.84, hz: 0.25, hp: 30,  bounty: 7, speed: 3.8, gain: 16, label: "sapper" },
};

// March + combat driver. Runs BEFORE the engine step; uprighting, contacts,
// sleep and damage all belong to the engine now.
function stepEnemies(world, grid) {
  const dt = world.dt;
  // wave armor: goal rides the flow field ~9m ahead; the cannon works on
  // whatever structure blocks the road (walls, towers — and the blast
  // chews rock like everything else in this world)
  for (const t of world.bodies) {
    if (t.kind !== "vehicle" || t.team !== 2 || !t.alive || !t.squad) continue;
    if (t.sleeping) wake(t);
    const cell = grid && grid.cellAt(t.pos.x, t.pos.z);
    if (cell && cell.dist < 1e8 && (cell.dx || cell.dz)) {
      const fd = fwdDir(cell.dx, cell.dz);
      t.goal = { x: t.pos.x + fd.x * 9, z: t.pos.z + fd.z * 9 };
    } else if (!t.goal) t.goal = { x: OBJ_POS.x, z: OBJ_POS.z };
    // stuck reflex: full throttle and no motion for 3s means the road is a
    // lie — open fire on whatever stands there, rock included
    const sp2 = Math.hypot(t.v.x, t.v.z);
    t._stuckT = sp2 < 0.25 && Math.abs((t.ctl && t.ctl.throttle) || 0) > 0.4 ? (t._stuckT || 0) + dt : 0;
    const desperate = t._stuckT > 3;
    t.gunT = (t.gunT || 0) - dt;
    if (t.gunT <= 0) {
      let tgt = null, td = TANK.gunRange * TANK.gunRange;
      for (const s of world.bodies) {
        if ((s.kind !== "tower" && s.kind !== "wall" && !(desperate && s.kind === "rock")) || !s.alive) continue;
        const dx = s.pos.x - t.pos.x, dz = s.pos.z - t.pos.z, d2 = dx * dx + dz * dz;
        if (d2 < td) { td = d2; tgt = s; }
      }
      if (tgt) {
        t.gunT = TANK.gunCd + Math.random() * 1.2;
        const muzzle = v3(t.pos.x, t.pos.y + 1.2, t.pos.z);
        const dx = tgt.pos.x - muzzle.x, dz = tgt.pos.z - muzzle.z;
        const d = Math.max(2, Math.hypot(dx, dz));
        const dy = tgt.pos.y - muzzle.y;
        let pitch = aimSolve(85, d, dy);
        if (pitch == null) pitch = Math.atan2(dy, d);
        fireProjectile(world, muzzle, v3((dx / d) * Math.cos(pitch), Math.sin(pitch), (dz / d) * Math.cos(pitch)), 85,
          { kind: "shell", r: TANK.blastR, kv: 8, dmg: TANK.dmg, crater: 0.5, noImpact: true, hitStruct: true, attacker: "enemy" });
      } else t.gunT = 0.5;
    }
  }
  const frosts = [];
  for (const b of world.bodies) {
    if (b.kind === "tower" && b.alive && b.towerType === "frost") {
      const s = TOWER_SPECS.frost;
      frosts.push({ x: b.pos.x, z: b.pos.z, r2: s.range * s.range, slow: s.slow });
    }
  }
  for (const u of world.bodies) {
    if (u.kind !== "unit" || !u.alive || u.team !== 2) continue;
    if (u.sleeping) wake(u); // the engine sleeps a becalmed body; marchers never rest
    u.frosted = false; u.frostMul = 1;
    for (const f of frosts) {
      const dx = u.pos.x - f.x, dz = u.pos.z - f.z;
      if (dx * dx + dz * dz < f.r2) { u.frosted = true; u.frostMul = f.slow; break; }
    }
    // resting means not falling: near-zero vertical speed counts as support
    // (a unit on rubble or a fellow soldier never earns terrain-grounded)
    const supported = u.grounded || Math.abs(u.v.y) < 0.6;
    // TD upright: STRONGER than the engine's reactive servo — spawn crowding
    // knocks marchers flat and the engine's grounded/hit gates leave them
    // down (measured: up 0.05 at the treeline, wave never arrives). A wave
    // is a march, not a ragdoll showcase; even flat on their back they
    // struggle up. Team-2 marchers only; campaign units keep engine rules.
    if (supported && u.R[4] > -0.5) {
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
    if (!grid || !supported || u.R[4] < 0.7) continue;
    const spec = ENEMY_SPECS[u.tag] || ENEMY_SPECS[""];
    const cell = grid.cellAt(u.pos.x, u.pos.z);

    // SAPPERS carry one satchel charge: they sprint the road, and the first
    // wall or emplacement within arm's reach gets it — 1.5s fuse, a blast
    // that breaches masonry outright. The sapper rarely survives his work.
    if (u.tag === "sapper") {
      if (u._fuse != null) {
        u._fuse -= dt;
        u.v.x *= 1 - Math.min(1, 8 * dt); u.v.z *= 1 - Math.min(1, 8 * dt); // he stands over the charge
        if (u._fuse <= 0) {
          explode(world, u.pos.x, u.pos.y, u.pos.z, { r: 3.4, kv: 9, dmg: 150, crater: 0.6, hitStruct: true, attacker: "enemy" }); // 150 * ~0.5 falloff at plant range clears a 70hp wall in one charge
          applyDamage(world, u, 1e9, { attacker: "enemy" });
        }
        continue;
      }
      for (const t2 of world.bodies) {
        if ((t2.kind !== "wall" && t2.kind !== "tower") || !t2.alive) continue;
        const dx2 = t2.pos.x - u.pos.x, dz2 = t2.pos.z - u.pos.z;
        if (dx2 * dx2 + dz2 * dz2 < (t2.hx + 1.3) * (t2.hx + 1.3)) { u._fuse = 1.5; u.flashT = world.t; break; }
      }
      // otherwise he runs with the flow like everyone else (falls through)
    }
    // riflemen: everything that is not a grenadier still carries a rifle and
    // will stop to work on a wall or an emplacement rather than walk past it
    if (u.tag !== "gren" && u.tag !== "sapper") {
      u.fireCd = (u.fireCd || 0) - dt;
      u.scanCd = (u.scanCd || 0) - dt;
      const RIFLE_R2 = 13 * 13;
      let tgt = u.tgtId ? world.byId.get(u.tgtId) : null;
      if (tgt) {
        const dx = tgt.pos.x - u.pos.x, dz = tgt.pos.z - u.pos.z;
        if (!tgt.alive || (tgt.kind !== "tower" && tgt.kind !== "wall") || dx * dx + dz * dz > RIFLE_R2) tgt = null;
      }
      if (!tgt && u.scanCd <= 0) {
        u.scanCd = 0.13 + (u.id % 8) * 0.012;
        let td = RIFLE_R2;
        for (const s of world.bodies) {
          if ((s.kind !== "tower" && s.kind !== "wall") || !s.alive) continue;
          const dx = s.pos.x - u.pos.x, dz = s.pos.z - u.pos.z, d2 = dx * dx + dz * dz;
          if (d2 < td) { td = d2; tgt = s; }
        }
      }
      u.tgtId = tgt ? tgt.id : null;
      if (tgt) {
        if (u.fireCd <= 0) {
          u.fireCd = (u.tag === "heavy" ? 1.1 : 1.5) + Math.random() * 0.5;
          u.flashT = world.t;
          const muzzle = v3(u.pos.x, u.pos.y + 0.5, u.pos.z);
          const dx = tgt.pos.x - muzzle.x, dz = tgt.pos.z - muzzle.z;
          const d = Math.max(1.5, Math.hypot(dx, dz));
          const dy = tgt.pos.y - muzzle.y;
          let pitch = aimSolve(70, d, dy);
          if (pitch == null) pitch = Math.atan2(dy, d);
          fireProjectile(world, muzzle, v3((dx / d) * Math.cos(pitch), Math.sin(pitch), (dz / d) * Math.cos(pitch)), 70,
            { kind: "mg", r: 0.6, kv: 1.0, dmg: u.tag === "heavy" ? 9 : 5, noImpact: true, hitStruct: true, hitOnly: "structure", attacker: "enemy" });
        }
        // they close slowly while firing rather than standing still
        if (cell && cell.dist < 1e8) {
          const sp = spec.speed * 0.35 * u.frostMul;
          const fd = fwdDir(cell.dx, cell.dz);
          u.v.x += (fd.x * sp - u.v.x) * Math.min(1, 4 * dt);
          u.v.z += (fd.z * sp - u.v.z) * Math.min(1, 4 * dt);
          faceTravel(u, dt);
          continue;
        }
      }
    }
    // grenadiers halt at range and shell your emplacements
    if (u.tag === "gren") {
      u.grenCd = (u.grenCd || 0) - dt;
      u.scanCd = (u.scanCd || 0) - dt;
      const GREN_R2 = 21 * 21;
      let tgt = u.tgtId ? world.byId.get(u.tgtId) : null;
      if (tgt) {
        const dx = tgt.pos.x - u.pos.x, dz = tgt.pos.z - u.pos.z;
        if (!tgt.alive || (tgt.kind !== "tower" && tgt.kind !== "wall") || dx * dx + dz * dz > GREN_R2) tgt = null;
      }
      if (!tgt && u.scanCd <= 0) {
        u.scanCd = 0.13 + (u.id % 8) * 0.012;
        let tgtD = GREN_R2;
        for (const b of world.bodies) {
          if ((b.kind !== "tower" && b.kind !== "wall") || !b.alive) continue;
          const dx = b.pos.x - u.pos.x, dz = b.pos.z - u.pos.z, d2 = dx * dx + dz * dz;
          if (d2 < tgtD) { tgtD = d2; tgt = b; }
        }
      }
      u.tgtId = tgt ? tgt.id : null;
      if (tgt && u.grenCd <= 0) {
        u.grenCd = 3.0 + Math.random() * 0.6;
        u.flashT = world.t;
        const muzzle = v3(u.pos.x, u.pos.y + 1.0, u.pos.z);
        const dx = tgt.pos.x + (Math.random() - 0.5) * 2.2 - muzzle.x;
        const dz = tgt.pos.z + (Math.random() - 0.5) * 2.2 - muzzle.z;
        const d = Math.max(2, Math.hypot(dx, dz));
        let pitch = aimSolve(28, d, tgt.pos.y - muzzle.y);
        if (pitch == null) pitch = 1.0;
        fireProjectile(world, muzzle, v3((dx / d) * Math.cos(pitch), Math.sin(pitch), (dz / d) * Math.cos(pitch)), 28,
          { kind: "shell", r: 2.6, kv: 6, dmg: 20, crater: 0.45, noImpact: true, hitStruct: true, attacker: "enemy" });
      }
      if (tgt && cell && cell.dist < 1e8) {
        const sp = 1.3 * u.frostMul;
        const fd = fwdDir(cell.dx, cell.dz);
        u.v.x += (fd.x * sp - u.v.x) * Math.min(1, 3 * dt);
        u.v.z += (fd.z * sp - u.v.z) * Math.min(1, 3 * dt);
        faceTravel(u, dt);
        continue;
      }
    }
    if (!cell || cell.dist >= 1e8) {
      // off the board (spawn crowding can shove one clear of it) or standing on
      // a blocked/unreached cell: head for the best neighbouring cell the flow
      // field DOES cover, so a unit pressed into a building corner walks out of
      // it instead of pinning against the map-centre pull forever
      let ex = -u.pos.x, ez = -u.pos.z;
      const g = grid ? grid.worldToGrid(u.pos.x, u.pos.z) : null;
      if (g) {
        let bd = 1e9;
        for (let dz2 = -1; dz2 <= 1; dz2++) for (let dx2 = -1; dx2 <= 1; dx2++) {
          if (!dx2 && !dz2) continue;
          const nx2 = g.gx + dx2, nz2 = g.gz + dz2;
          if (!grid.inBounds(nx2, nz2)) continue;
          const nc = grid.cells[grid.idx(nx2, nz2)];
          if (nc.blocked || nc.dist >= 1e8) continue;
          if (nc.dist < bd) { bd = nc.dist; const wp = grid.gridToWorld(nx2, nz2); ex = wp.x - u.pos.x; ez = wp.z - u.pos.z; }
        }
      }
      const bl = Math.hypot(ex, ez) || 1;
      u.v.x += ((ex / bl) * 2.6 - u.v.x) * Math.min(1, 6 * dt);
      u.v.z += ((ez / bl) * 2.6 - u.v.z) * Math.min(1, 6 * dt);
      faceTravel(u, dt);
      // safety net: a unit that stays off the field for 12s (wedged inside a
      // hollow shell through its doorway, say) is written off for its bounty so
      // a wave can never hang on one lost soldier
      u.lostT = (u.lostT || 0) + dt;
      if (u.lostT > 12) applyDamage(world, u, 1e9, { attacker: "world" });
      continue;
    }
    u.lostT = 0;
    // ice underfoot: quicker, but the grip is gone so they steer lazily
    const onIce = cell.ice;
    const speed = spec.speed * u.frostMul * (onIce ? 1.3 : 1);
    const gain = Math.min(1, spec.gain * (onIce ? 0.4 : 1) * dt);
    const fd = fwdDir(cell.dx, cell.dz);
    u.v.x += (fd.x * speed - u.v.x) * gain;
    u.v.z += (fd.z * speed - u.v.z) * gain;
    faceTravel(u, dt);
  }
}
function faceTravel(u, dt) {
  const sp = Math.hypot(u.v.x, u.v.z);
  u.wph = (u.wph || 0) + sp * dt * 3.6;
  if (sp > 0.5) {
    const desired = Math.atan2(u.v.x, u.v.z);
    let err = desired - Math.atan2(u.R[6], u.R[8]);
    while (err > Math.PI) err -= 2 * Math.PI;
    while (err < -Math.PI) err += 2 * Math.PI;
    u.w.y += err * 6 * dt;
    u.w.y *= 1 - Math.min(1, 4 * dt);
  }
}

// ================================================================= waves
const WAVES = [
  { units: 14, delay: 0.9 },
  { units: 20, delay: 0.8 },
  { units: 22, delay: 0.7, mix: [["", 14], ["fast", 8]] },
  { units: 26, delay: 0.7, mix: [["", 18], ["heavy", 4], ["gren", 4]] },
  { units: 32, delay: 0.6, mix: [["", 26], ["sapper", 6]] },
  { units: 29, delay: 0.45, mix: [["fast", 18], ["heavy", 10], ["tank", 1]] },
  { units: 38, delay: 0.5, mix: [["", 22], ["heavy", 8], ["gren", 8]] },
  { units: 38, delay: 0.4, mix: [["fast", 16], ["gren", 8], ["heavy", 10], ["sapper", 2], ["tank", 2]] },
  { units: 46, delay: 0.42, mix: [["", 22], ["heavy", 12], ["gren", 6], ["fast", 6]] },
  { units: 56, delay: 0.38, mix: [["", 18], ["heavy", 16], ["gren", 10], ["fast", 10], ["tank", 2]] },
  { units: 47, delay: 0.3, mix: [["heavy", 30], ["gren", 14], ["tank", 3]] },
  { units: 74, delay: 0.26, mix: [["", 20], ["fast", 14], ["heavy", 16], ["gren", 12], ["sapper", 8], ["tank", 4]] },
];
function makeWaveState() { return { waveIdx: 0, spawnQueue: 0, spawnTimer: 0, spawnDelay: 1, active: false, betweenWaves: true, countdown: 8, mixBag: [] }; }
// WAVE ARMOR: an engine vehicle on the engine's own tread physics + goal AI
// (stepDrive/aiDrive). It follows the flow field like the infantry but it is
// 3.4 tonnes with a cannon: it does not queue at your wall — it makes a door.
const TANK = { mass: 3400, hx: 1.5, hy: 0.8, hz: 2.4, hp: 260, bounty: 25, gunCd: 4.6, gunRange: 34, dmg: 30, blastR: 2.5 };
function spawnTank(world, sp) {
  const x = sp.x + (Math.random() - 0.5) * 2.4, z = sp.z + (Math.random() - 0.5) * 2.4;
  const t = addBody(world, { kind: "vehicle", team: 2, mass: TANK.mass, hx: TANK.hx, hy: TANK.hy, hz: TANK.hz, x, y: world.field.heightAt(x, z) + TANK.hy + 0.1, z, hp: TANK.hp, friction: 0.85 });
  t.squad = "waveArmor"; // stepDrive picks it up: aiDrive steers to b.goal, driveHull runs the treads
  t.driverSpec = { throttleHabit: 0.8 };
  t.bounty = TANK.bounty;
  t.gunT = 2 + Math.random() * 2;
  return t;
}
function spawnEnemy(world, sp, tag) {
  if (tag === "tank") return spawnTank(world, sp);
  const spec = ENEMY_SPECS[tag] || ENEMY_SPECS[""];
  const x = sp.x + (Math.random() - 0.5) * 2.6, z = sp.z + (Math.random() - 0.5) * 2.6;
  const u = addBody(world, { kind: "unit", team: 2, mass: spec.mass, hx: spec.hx, hy: spec.hy, hz: spec.hz, x, z, y: world.field.heightAt(x, z) + spec.hy + 0.02, hp: spec.hp, friction: 0.38 });
  u.tag = tag || ""; u.bounty = spec.bounty;
  u.brave = true;                              // the engine's fear reflexes are for civilians
  if (tag === "gren") u.utype = "gren";        // the shared renderer dresses grenadiers
  u.wph = Math.random() * 6.28;
  return u;
}

// =================================================================== boss
// WAVE 12: the biped frame itself — 19 tonnes of certified walker on its
// own gait, island solver and stabilization rockets, walking YOUR map.
// It carries an hp pool (engine blasts drain it, guarded on bossHp), a
// hull cannon for whatever stands in the road, and it gets back up when
// it falls — each knockdown costs it 150 hp.
const BOSS = { hp: 950, gunCd: 5.0, gunRange: 30, dmg: 35, blastR: 3.0, bounty: 200 };
function stepBoss(world, grid) {
  if (!world.mechs || !world.mechs.length) return;
  const m = world.mechs[0];
  if (m.bossHp == null || !m.hull) return;
  const dt = world.dt;
  if (m.bossHp <= 0) {
    // the frame dies on its feet: one last magazine detonation, then the
    // island solver lets go and 19 tonnes of loose metal settles where it
    // stood — the wreck is the trophy
    const h = m.hull.pos;
    for (let i = 0; i < 3; i++) explode(world, h.x + (i - 1) * 1.5, h.y + i * 0.8, h.z, { r: 4.5, kv: 12, dmg: 20, crater: 0.8, attacker: "player" });
    world.events.push({ type: "tdkill", bounty: BOSS.bounty });
    world._bossDown = true;
    world.mechs.length = 0;
    return;
  }
  if (mechFallen(m)) {
    if (world.t < (m._fGrace || 0)) return; // still settling from the last recovery — don't bill it twice
    m._bossFalls = (m._bossFalls || 0) + 1;
    // falls cost TIME, not hp — the player kills the boss, the hills don't
    // (billed falls self-destructed it at 11 stumbles, measured; a flat
    // 25-fall cap then killed it for having a LONG road on seeded maps).
    // Only a livelock is structural: five falls without 6m of progress.
    const fp = m._lastFall;
    if (fp && Math.hypot(m.hull.pos.x - fp.x, m.hull.pos.z - fp.z) < 6) m._fallRepeat = (m._fallRepeat || 0) + 1;
    else m._fallRepeat = 0;
    m._lastFall = { x: m.hull.pos.x, z: m.hull.pos.z };
    if (m._fallRepeat >= 5) m.bossHp = 0;
    if (m.bossHp > 0) {
      // recover ON the road — respawning exactly where it fell re-fell it
      // 13 times in 20s (measured); the nearest waypoint line is graded flat
      let rx = m.hull.pos.x, rz = m.hull.pos.z;
      if (m._route && m._route.length) {
        const wp0 = m._route[0];
        const dd = Math.hypot(wp0.x - rx, wp0.z - rz) || 1;
        // repeated falls in one patch crawl FURTHER each time — a bad 3m of
        // ground must not become a fall loop (recovery at 2.5m re-entered it)
        const adv = Math.min(2.5 + (m._fallRepeat || 0) * 3, dd);
        rx += (wp0.x - rx) / dd * adv; rz += (wp0.z - rz) / dd * adv;
      }
      respawnMech(world, m, rx, rz, Math.atan2(m.hull.R[6], m.hull.R[8]));
      m._fGrace = world.t + 5;
    }
    return;
  }
  // steering: the walker cannot follow a twitchy flow field — per-cell
  // heading jitter felled it twice a minute, and pass-hunting deadlocked it
  // at the first ridge (measured, z -33 for 3 minutes). A 19-tonne biped
  // plans like one: WAYPOINTS through the pass gaps, straight legs between.
  const hx2 = m.hull.pos.x, hz2 = m.hull.pos.z;
  if (!m._route) {
    // COMMIT to one side's cart road end-to-end — picking the nearest gap
    // per band alternated sides and walked long diagonals with no road
    // under them (livelocked mid-map on 2 of 5 seeds, measured)
    const side = m._bossSide || 0;
    m._route = [];
    for (const band of PASSES) m._route.push({ x: band[side].x, z: band[side].z - 5 }, { x: band[side].x, z: band[side].z + 5 });
    m._route.push({ x: OBJ_POS.x, z: OBJ_POS.z });
  }
  while (m._route.length > 1 && Math.hypot(m._route[0].x - hx2, m._route[0].z - hz2) < 4) m._route.shift();
  const wp = m._route[0];
  const want = Math.atan2(wp.x - hx2, wp.z - hz2);
  if (m._bossHead == null) m._bossHead = want;
  let herr = want - m._bossHead;
  while (herr > Math.PI) herr -= 2 * Math.PI;
  while (herr < -Math.PI) herr += 2 * Math.PI;
  m._bossHead += Math.max(-0.45 * dt, Math.min(0.45 * dt, herr));
  const turning = Math.abs(herr) > 0.5;
  mechCommand(m, { travel: turning ? 0.35 : 0.9, heading: m._bossHead });
  m._gunT = (m._gunT || 2) - dt;
  if (m._gunT <= 0) {
    let tgt = null, td = BOSS.gunRange * BOSS.gunRange;
    for (const b of world.bodies) {
      if ((b.kind !== "tower" && b.kind !== "wall") || !b.alive) continue;
      const dx = b.pos.x - m.hull.pos.x, dz = b.pos.z - m.hull.pos.z, d2 = dx * dx + dz * dz;
      if (d2 < td) { td = d2; tgt = b; }
    }
    if (tgt) {
      m._gunT = BOSS.gunCd;
      const muzzle = v3(m.hull.pos.x, m.hull.pos.y + 1.6, m.hull.pos.z);
      const dx = tgt.pos.x - muzzle.x, dz = tgt.pos.z - muzzle.z;
      const d = Math.max(2, Math.hypot(dx, dz));
      let pitch = aimSolve(80, d, tgt.pos.y - muzzle.y);
      if (pitch == null) pitch = 0.1;
      fireProjectile(world, muzzle, v3((dx / d) * Math.cos(pitch), Math.sin(pitch), (dz / d) * Math.cos(pitch)), 80,
        { kind: "shell", r: BOSS.blastR, kv: 9, dmg: BOSS.dmg, crater: 0.6, noImpact: true, hitStruct: true, attacker: "enemy" });
    } else m._gunT = 0.6;
  }
}

// ================================================================== step
// One fixed tick: game-layer drivers, then the CERTIFIED engine step, then
// the TD's own bookkeeping over what the engine did.
function stepTd(world, grid, onStructureLost, town, onRuin) {
  stepBoss(world, grid);
  stepEnemies(world, grid);
  stepTowers(world);
  stepWorld(world);
  // breakers shoulder into your masonry
  for (const c of world.contacts) {
    if (c.pn <= 0 || !c.b) continue;
    const a = c.a, b = c.b;
    const unit = a.tag === "heavy" ? a : b.tag === "heavy" ? b : null;
    const str = unit === a ? b : a;
    if (unit && unit.alive && (str.kind === "wall" || str.kind === "tower") && str.alive) {
      const sp = Math.hypot(unit.v.x, unit.v.z);
      if (sp > 0.8) { applyDamage(world, str, sp * world.dt * 16, { attacker: "enemy" }); str.hitT = world.t; }
    }
  }
  // structures that lost the argument: the LOD flips — the shell becomes its
  // welded stones, which topple and settle on the engine's weld machinery
  for (let i = world.bodies.length - 1; i >= 0; i--) {
    const b = world.bodies[i];
    if ((b.kind === "wall" || b.kind === "tower") && !b.alive) {
      shatterStructure(world, b, { ny: b.kind === "tower" ? 4 : 3 });
      world.events.push({ type: "structureLost", id: b.id, kind: b.kind });
      world.byId.delete(b.id); world.bodies.splice(i, 1);
      if (onStructureLost) onStructureLost(b);
    }
  }
  // bounty at the moment of death — the engine kill event outlives the corpse
  // cull below, so an id lookup at frame-drain time comes up empty
  for (const b of world.bodies) {
    if ((b.kind === "unit" || b.kind === "wreck") && b.team === 2 && !b.alive && !b._paid && b.bounty) {
      b._paid = true;
      world.events.push({ type: "tdkill", bounty: b.bounty });
    }
  }
  for (let i = world.bodies.length - 1; i >= 0; i--) {
    const b = world.bodies[i];
    if (b.kind === "unit" && !b.alive && world.t - (b.deadT || 0) > 2.5) { world.byId.delete(b.id); world.bodies.splice(i, 1); }
    else if (b.kind === "chunk" && !b.town && b.sleeping && b.bornT && world.t - b.bornT > 14) {
      // settled rubble is culled: four collapses at 27 stones each would
      // otherwise own the chunk pool permanently
      const wl = world.weldsOf.get(b.id);
      if (wl) for (const wd of wl) wd.broken = true;
      world.weldsOf.delete(b.id);
      world._weldPairsDirty = true;
      world.byId.delete(b.id); world.bodies.splice(i, 1);
    }
  }
  if (world.mechs && world.mechs.length && world.mechs[0].bossHp != null && world.mechs[0].hull) {
    const h = world.mechs[0].hull.pos;
    if (Math.hypot(h.x - OBJ_POS.x, h.z - OBJ_POS.z) < 6) {
      world.events.push({ type: "leak", dmg: 99, x: h.x, y: h.y, z: h.z });
      world.mechs.length = 0;
    }
  }
  if (town) stepTown(world, grid, town, onRuin);
  // leaks. NOTE: events are cleared by the CALLER before each substep and
  // drained after — clearing them in here silently ate every kill, boom and
  // muzzle raised by the same step (found the hard way, pre-port).
  for (let i = world.bodies.length - 1; i >= 0; i--) {
    const b = world.bodies[i];
    if ((b.kind !== "unit" && b.kind !== "vehicle") || !b.alive || b.team !== 2) continue;
    if (Math.hypot(b.pos.x - OBJ_POS.x, b.pos.z - OBJ_POS.z) < (b.kind === "vehicle" ? 5.0 : 3.0)) {
      world.events.push({ type: "leak", dmg: b.kind === "vehicle" ? 4 : b.tag === "heavy" ? 2 : 1, x: b.pos.x, y: b.pos.y, z: b.pos.z });
      world.byId.delete(b.id); world.bodies.splice(i, 1);
    }
  }
}

// ============================================================== component
function detectTouch() {
  return (typeof window !== "undefined") && ("ontouchstart" in window || (navigator.maxTouchPoints || 0) > 0);
}
const P = {
  root: { position: "fixed", inset: 0, background: "#0e1218", overflow: "hidden", fontFamily: "ui-monospace, Menlo, Consolas, monospace", color: "#e6ebf1", userSelect: "none", WebkitUserSelect: "none", touchAction: "none" },
  cv: { position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" },
  top: { position: "absolute", top: 0, left: 0, right: 0, display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: "linear-gradient(rgba(10,13,18,0.88), rgba(10,13,18,0))", zIndex: 4, fontSize: 12, flexWrap: "wrap" },
  panel: { position: "absolute", background: "rgba(14,18,24,0.88)", border: "1px solid #48515f", borderRadius: 8, padding: 10, fontSize: 12, zIndex: 5 },
  btn: { background: "#1a212b", border: "1px solid #48515f", color: "#e6ebf1", borderRadius: 6, padding: "4px 10px", fontFamily: "inherit", fontSize: 12, cursor: "pointer" },
  stat: { display: "flex", alignItems: "center", gap: 4, padding: "3px 8px", background: "rgba(20,26,34,0.75)", border: "1px solid #303a48", borderRadius: 6 },
  bar: { position: "absolute", left: 0, right: 0, bottom: 0, display: "flex", gap: 6, padding: "8px 8px calc(8px + env(safe-area-inset-bottom, 0px))", justifyContent: "center", background: "linear-gradient(rgba(10,13,18,0), rgba(10,13,18,0.9))", zIndex: 4, flexWrap: "wrap" },
  slot: { display: "flex", flexDirection: "column", alignItems: "center", gap: 2, minWidth: 52, padding: "6px 6px", background: "#1a212b", border: "1px solid #48515f", borderRadius: 8, fontSize: 11, cursor: "pointer" },
  ovl: { position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "rgba(10,13,18,0.72)", zIndex: 8, textAlign: "center", padding: 20 },
  toastWrap: { position: "absolute", top: 54, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, zIndex: 6, pointerEvents: "none" },
  toast: { background: "rgba(14,18,24,0.92)", border: "1px solid #ffb45e", color: "#ffd9a0", borderRadius: 6, padding: "4px 12px", fontSize: 12 },
};

export default function ColdsnapTD() {
  const canvasRef = useRef(null);
  const stateRef = useRef(null);
  const [isTouch] = useState(detectTouch);
  const HUD0 = { fps: 0, wave: 1, lives: 20, enemies: 0, resources: 120, walls: 0, towers: 0, kills: 0, totalWaves: WAVES.length, between: true, countdown: 8, started: false, gameOver: false, victory: false, mode: "wall", sellMode: false, paused: false, speed: 1, inspect: null, toasts: [] };
  const [hud, setHud] = useState(HUD0);
  const [fatal, setFatal] = useState(null);
  const [runId, setRunId] = useState(0);
  const restart = () => { setFatal(null); setHud({ ...HUD0 }); setRunId((r) => r + 1); };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let raf = 0, disposed = false;
    let R = null;
    try {
      // ---- world: the ENGINE's field + world, with the TD map written in
      const urlSeed = parseInt(new URLSearchParams(window.location.search).get("seed"), 10);
      const seed = Number.isFinite(urlSeed) ? urlSeed : Math.floor(Date.now() % 1000000);
      makeMap(seed);
      const field = makeField(121, 2.0, MAP_SEED);
      buildTdTerrain(field, MAP_SEED);
      const grid = makeGrid(field);
      const world = makeWorld({ field, seed: MAP_SEED });
      world._tdStruct = true; // every blast in this world damages structures — destruction is symmetric
      const town = buildTown(world, grid, field);
      // DESTRUCTIBLE ROCK: every outcrop is a huge-HP body. Bring one down
      // (airstrikes, massed mortars) and its terrain bump is carved out, its
      // cells open, and the pather learns a lane nobody walled. Terrain-
      // grade masonry: expensive ordnance literally reshapes the approach.
      const rocksLive = ROCKS.slice();
      for (const k of ROCKS) {
        // hx 0.55r: the box half-DIAGONAL then matches the grid's 0.78r
        // blocked circle — a fatter box jutted its corners into passes the
        // flow field called open and wedged the wave armor (measured)
        const b = addBody(world, { kind: "rock", team: 0, mass: 0, hx: k.r * 0.55, hy: k.h * 0.8, hz: k.r * 0.55, x: k.x, y: field.heightAt(k.x, k.z) - k.h * 0.2, z: k.z, hp: 380 + k.r * 90 });
        b.maxHp = b.hp; b.rockRef = k;
      }
      // TREELINE: snow pines behind the spawn edge + three clumps upfield.
      // Real bodies — blasts fell them where they stand.
      const treeAt = (tx, tz) => {
        const ty = field.heightAt(tx, tz);
        const u = addBody(world, { kind: "tree", team: 0, mass: 260, hx: 0.28, hy: 1.6, hz: 0.28, x: tx, y: ty + 1.62, z: tz, hp: 25, friction: 0.5 });
        u.sleeping = true;
        return u;
      };
      {
        const rT = mulberry32(MAP_SEED ^ 0x517);
        for (let tu = -26; tu <= 26; tu += 3.2) {
          const w = fwdU(tu + (rT() - 0.5) * 1.6, -54.5 + rT() * 3.2);
          if (SPAWN_POINTS.some((sp) => Math.hypot(w.x - sp.x, w.z - sp.z) < 4.5)) continue;
          if (rockAt(w.x, w.z)) continue;
          treeAt(w.x, w.z);
        }
        const clumps = [];
        for (let c = 0, nC = 1 + Math.floor(rT() * 4); c < nC; c++) { const w = fwdU(-20 + rT() * 40, -46 + rT() * 24); clumps.push([w.x, w.z, 5 + Math.floor(rT() * 3)]); }
        for (const [cx, cz, n2] of clumps) {
          for (let i = 0; i < n2; i++) {
            const a = rT() * 6.28, rr = 1.5 + rT() * 4;
            const jx = cx + Math.cos(a) * rr, jz = cz + Math.sin(a) * rr;
            if (rockAt(jx, jz) || pondAt(jx, jz)) continue;
            treeAt(jx, jz);
          }
        }
      }
      const objG = grid.worldToGrid(OBJ_POS.x, OBJ_POS.z);
      computeFlowField(grid, objG.gx, objG.gz);
      R = makeRenderer(canvas, world, { town: false, camera: "tactical" });
      const EXT = ORIENT % 2 ? { x: 62, z: 34 } : { x: 34, z: 62 };
      const A = makeGameAudio();
      // echo taps come off the granite and the masonry — the only hard
      // faces on an otherwise acoustically dead snowfield
      A.setReflectors([
        ...ROCKS.filter((k) => k.r >= 4),
        ...TOWN.map((t) => ({ x: t.x, z: t.z, r: Math.max(t.nx, t.nz) * MASON.pitch * 0.6 })),
      ]);
      R.setDressing({ rocks: ROCKS, ponds: PONDS });
      R.overlay.setObjective(OBJ_POS.x, OBJ_POS.z, field.heightAt(OBJ_POS.x, OBJ_POS.z));
      R.overlay.setBanners(SPAWN_POINTS);
      const AIM_OFF = { x: 0, z: -500 }; // the shared reticle parked off-map

      // ---- mutable game state: everything the loop touches lives here, not
      // in React state, so the closure can never go stale
      const S = {
        resources: 120, lives: 20, kills: 0,
        ws: makeWaveState(), spawnRR: 0,
        mode: "wall", sellMode: false, inspectId: null,
        started: false, gameOver: false, victory: false,
        paused: false, speed: 1,
        focus: (() => { const w = fwdU(0, 6); return { x: w.x, y: field.heightAt(w.x, w.z), z: w.z }; })(),
        strikeCd: 0,
        zoom: 1, acc: 0, t: 0, fps: 60, fpsAcc: 0, fpsN: 0,
        hover: null, pointer: null, toasts: [],
        hudT: 0, keys: {}, sellById: null, audio: A,
      };
      stateRef.current = S;

      const toast = (txt) => { S.toasts.push({ txt, t: performance.now() / 1000 }); if (S.toasts.length > 4) S.toasts.shift(); };

      // ---- build / sell
      const recomputeFlow = () => computeFlowField(grid, objG.gx, objG.gz);
      const buildAt = (gx, gz, mode) => {
        if (!grid.inBounds(gx, gz)) return;
        const cell = grid.cells[grid.idx(gx, gz)];
        if (cell.blocked || cell.wallId) { toast("OCCUPIED"); return; }
        if (cell.ice) { toast("NO GROUND — frozen water"); return; }
        const spec = mode === "wall" ? null : TOWER_SPECS[mode];
        const cost = spec ? spec.cost : 5;
        if (S.resources < cost) { toast("NO SCRAP"); return; }
        cell.blocked = true;
        if (!checkConnectivity(grid, SPAWN_POINTS, objG.gx, objG.gz)) {
          cell.blocked = false;
          toast("Leave them a road");
          return;
        }
        const wp = grid.gridToWorld(gx, gz);
        const y = field.heightAt(wp.x, wp.z);
        let b;
        if (spec) {
          b = addBody(world, { kind: "tower", team: 1, mass: 0, hx: 0.8, hy: spec.hy, hz: 0.8, x: wp.x, y: y + spec.hy, z: wp.z, hp: spec.hp });
          b.towerType = mode;
        } else {
          b = addBody(world, { kind: "wall", team: 1, mass: 0, hx: 0.9, hy: 0.9, hz: 0.9, x: wp.x, y: y + 0.9, z: wp.z, hp: 70 });
        }
        b.maxHp = b.hp;
        cell.wallId = b.id;
        S.resources -= cost;
        recomputeFlow();
      };
      const sellAt = (gx, gz) => {
        if (!grid.inBounds(gx, gz)) return;
        const cell = grid.cells[grid.idx(gx, gz)];
        const id = cell.wallId;
        if (!id || !world.byId.has(id)) { toast("NOTHING HERE"); return; }
        const b = world.byId.get(id);
        const refund = b.kind === "tower" ? Math.floor(TOWER_SPECS[b.towerType].cost * 0.6) : 3;
        world.byId.delete(id);
        const bi = world.bodies.indexOf(b);
        if (bi >= 0) world.bodies.splice(bi, 1);
        cell.wallId = null; cell.blocked = false;
        S.resources += refund;
        recomputeFlow();
        toast("+" + refund + " scrap");
      };
      const sellById = (id) => {
        const b = world.byId.get(id);
        if (!b) return;
        const g = grid.worldToGrid(b.pos.x, b.pos.z);
        sellAt(g.gx, g.gz);
        S.inspectId = null;
      };
      S.sellById = sellById;
      S.rotate = (d) => R.rotateStep(d);
      const onStructureLost = (b) => {
        for (const c of grid.cells) if (c.wallId === b.id) { c.wallId = null; c.blocked = false; }
        recomputeFlow();
      };
      const onRuin = () => recomputeFlow();

      // ---- picking: NDC -> ortho ray -> march the heightfield
      const toNdc = (cx, cy) => {
        const r = canvas.getBoundingClientRect();
        return { x: ((cx - r.left) / Math.max(1, r.width)) * 2 - 1, y: -(((cy - r.top) / Math.max(1, r.height)) * 2 - 1) };
      };
      const groundPoint = (cx, cy) => {
        const nd = toNdc(cx, cy);
        const cb = R.camBasis, cam = R._cam;
        const hw = cb.halfW(), hh = cb.halfH();
        const ox = cam.position.x + cb.right.x * nd.x * hw + cb.up.x * nd.y * hh;
        const oy = cam.position.y + cb.right.y * nd.x * hw + cb.up.y * nd.y * hh;
        const oz = cam.position.z + cb.right.z * nd.x * hw + cb.up.z * nd.y * hh;
        const f = cb.fwd;
        let lo = 0, hi = 400;
        let prev = 0, found = -1;
        for (let t = 0; t <= 400; t += 1.5) {
          const x = ox + f.x * t, y2 = oy + f.y * t, z = oz + f.z * t;
          if (y2 <= field.heightAt(x, z)) { found = t; lo = prev; hi = t; break; }
          prev = t;
        }
        if (found < 0) return null;
        for (let i = 0; i < 12; i++) {
          const mid = (lo + hi) / 2;
          const x = ox + f.x * mid, y2 = oy + f.y * mid, z = oz + f.z * mid;
          if (y2 <= field.heightAt(x, z)) hi = mid; else lo = mid;
        }
        const t = (lo + hi) / 2;
        return { x: ox + f.x * t, z: oz + f.z * t };
      };
      const tapAt = (cx, cy) => {
        if (!S.started || S.gameOver || S.victory) return;
        const p = groundPoint(cx, cy);
        if (!p) { S.inspectId = null; return; }
        const g = grid.worldToGrid(p.x, p.z);
        if (!grid.inBounds(g.gx, g.gz)) { S.inspectId = null; return; }
        const cell2 = grid.cells[grid.idx(g.gx, g.gz)];
        if (S.mode === "strike" && !S.sellMode) {
          S.inspectId = null;
          if (S.strikeCd > 0) { toast("STRIKE REARMING — " + Math.ceil(S.strikeCd) + "s"); return; }
          if (S.resources < STRIKE.cost) { toast("NO SCRAP"); return; }
          S.resources -= STRIKE.cost;
          S.strikeCd = STRIKE.cd;
          fireVolley(world, p.x, p.z, STRIKE.rockets, "player");
          toast("STRIKE INBOUND");
          return;
        }
        if (S.sellMode) { S.inspectId = null; sellAt(g.gx, g.gz); }
        else if (cell2.wallId && world.byId.has(cell2.wallId)) S.inspectId = cell2.wallId;
        else { S.inspectId = null; buildAt(g.gx, g.gz, S.mode); }
      };

      // ---- input: pointer events cover mouse and touch alike
      const pointers = new Map();
      let pinchD0 = 0, pinchZ0 = 1, dragTotal = 0, downPt = null;
      const onPointerDown = (e) => {
        A.ensure();
        canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId);
        pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (pointers.size === 1) { dragTotal = 0; downPt = { x: e.clientX, y: e.clientY }; }
        else if (pointers.size === 2) {
          const ps = [...pointers.values()];
          pinchD0 = Math.hypot(ps[0].x - ps[1].x, ps[0].y - ps[1].y);
          pinchZ0 = S.zoom;
          downPt = null;
        }
      };
      const onPointerMove = (e) => {
        S.pointer = { x: e.clientX, y: e.clientY };
        const pt = pointers.get(e.pointerId);
        if (!pt) return;
        const dx = e.clientX - pt.x, dy = e.clientY - pt.y;
        pt.x = e.clientX; pt.y = e.clientY;
        if (pointers.size === 1) {
          dragTotal += Math.hypot(dx, dy);
          if (dragTotal > 12) {
            // pan: screen pixels -> world via the ortho frustum extents
            const cb = R.camBasis;
            const r = canvas.getBoundingClientRect();
            const kx = (2 * cb.halfW()) / Math.max(1, r.width);
            const ky = (2 * cb.halfH()) / Math.max(1, r.height);
            S.focus.x -= cb.right.x * dx * kx - cb.up.x * dy * ky;
            S.focus.z -= cb.right.z * dx * kx - cb.up.z * dy * ky;
            S.focus.x = Math.max(-EXT.x, Math.min(EXT.x, S.focus.x));
            S.focus.z = Math.max(-EXT.z, Math.min(EXT.z, S.focus.z));
          }
        } else if (pointers.size === 2 && pinchD0 > 0) {
          const ps = [...pointers.values()];
          const d = Math.hypot(ps[0].x - ps[1].x, ps[0].y - ps[1].y);
          S.zoom = Math.max(0.5, Math.min(2.6, pinchZ0 * (d / pinchD0)));
          R.setZoom(S.zoom);
        }
      };
      const onPointerUp = (e) => {
        pointers.delete(e.pointerId);
        if (downPt && dragTotal <= 12 && pointers.size === 0) tapAt(e.clientX, e.clientY);
        if (pointers.size < 2) pinchD0 = 0;
        if (pointers.size === 0) downPt = null;
      };
      const onWheel = (e) => {
        e.preventDefault();
        S.zoom = Math.max(0.5, Math.min(2.6, S.zoom * (e.deltaY > 0 ? 0.9 : 1.11)));
        R.setZoom(S.zoom);
      };
      const onKey = (e, down) => { S.keys[e.key.toLowerCase()] = down; };
      const kd = (e) => { A.ensure(); if (e.key === "m" || e.key === "M") { A.setMuted(!A.muted); setHud((h) => ({ ...h, muted: A.muted })); } if (e.key === "q" || e.key === "Q") R.rotateStep(-1); if (e.key === "e" || e.key === "E") R.rotateStep(1); onKey(e, true); };
      const ku = (e) => onKey(e, false);
      const blockTouch = (e) => e.preventDefault();
      canvas.addEventListener("pointerdown", onPointerDown);
      canvas.addEventListener("pointermove", onPointerMove);
      canvas.addEventListener("pointerup", onPointerUp);
      canvas.addEventListener("pointercancel", onPointerUp);
      canvas.addEventListener("wheel", onWheel, { passive: false });
      canvas.addEventListener("touchstart", blockTouch, { passive: false });
      window.addEventListener("keydown", kd);
      window.addEventListener("keyup", ku);

      // ---- wave machine
      const startWave = () => {
        const ws = S.ws;
        const w = WAVES[ws.waveIdx];
        ws.spawnQueue = w.units; ws.spawnDelay = w.delay; ws.spawnTimer = 0;
        ws.betweenWaves = false; ws.active = true;
        ws.mixBag = [];
        if (w.mix) {
          for (const m of w.mix) for (let i = 0; i < m[1]; i++) ws.mixBag.push(m[0]);
          // stride shuffle so types interleave rather than clump
          const bag = ws.mixBag, out = [];
          let i = 0;
          while (bag.length) { i = (i + 7) % bag.length; out.push(bag.splice(i, 1)[0]); }
          ws.mixBag = out;
        }
        if (ws.waveIdx === WAVES.length - 1) {
          const bSide = MAP_SEED % 2;
          const bw = fwdU(SPAWN_U[bSide === 0 ? 0 : 2], -51);
          const m = buildMech(world, { x: bw.x, z: bw.z, yaw: Math.atan2(OBJ_POS.x - bw.x, OBJ_POS.z - bw.z) });
          m._bossSide = bSide;
          m.thrustersOn = true; m.thrustAssist = true;
          m.bossHp = BOSS.hp;
          toast("SEISMIC CONTACT — BIPED FRAME INBOUND");
        }
        toast("WAVE " + (ws.waveIdx + 1));
      };
      const spawnOne = () => {
        const ws = S.ws;
        const tag = ws.mixBag.length ? ws.mixBag.pop() : "";
        const sp = SPAWN_POINTS[S.spawnRR++ % SPAWN_POINTS.length];
        spawnEnemy(world, sp, tag);
        ws.spawnQueue--;
      };
      const sendNow = () => { const ws = S.ws; if (S.started && ws.betweenWaves && !S.gameOver && !S.victory) { ws.countdown = 0; } };
      S.sendNow = sendNow;

      // a felled outcrop: carve its bump out of the ground, open its cells,
      // strew boulder rubble, and tell the pather the map changed
      const breachRock = (b) => {
        const k = b.rockRef;
        if (!k) return;
        const { n, cs, h, half } = field;
        const i0 = Math.max(0, Math.floor((k.x - k.r * 1.7 + half) / cs)), i1 = Math.min(n - 1, Math.ceil((k.x + k.r * 1.7 + half) / cs));
        const j0 = Math.max(0, Math.floor((k.z - k.r * 1.7 + half) / cs)), j1 = Math.min(n - 1, Math.ceil((k.z + k.r * 1.7 + half) / cs));
        for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
          const px = i * cs - half, pz = j * cs - half;
          const d = Math.hypot(px - k.x, pz - k.z) / k.r;
          if (d < 1.6) h[j * n + i] -= k.h * Math.exp(-d * d * 2.1); // the exact bump buildTdTerrain added
        }
        field.dirty = true;
        for (let gz = 0; gz < GRID_H; gz++) for (let gx = 0; gx < GRID_W; gx++) {
          const wp = grid.gridToWorld(gx, gz);
          if (Math.hypot(wp.x - k.x, wp.z - k.z) < k.r * 0.78 + 0.9) {
            const c = grid.cells[grid.idx(gx, gz)];
            if (c.terrain) { c.blocked = false; c.terrain = false; }
          }
        }
        for (let i = 0; i < 9; i++) { // boulder rubble where the ridge stood
          const a = (i / 9) * 6.28, rr = k.r * (0.2 + 0.5 * ((i * 7) % 5) / 5);
          const c = addBody(world, { kind: "chunk", team: 0, mass: 320, hx: 0.55, hy: 0.55, hz: 0.55, x: k.x + Math.cos(a) * rr, y: field.heightAt(k.x, k.z) + 1.2 + (i % 3) * 0.9, z: k.z + Math.sin(a) * rr, friction: 0.7, restitution: 0.02 });
          c.bornT = world.t;
        }
        const ri = rocksLive.indexOf(k);
        if (ri >= 0) rocksLive.splice(ri, 1);
        R.setDressing({ rocks: rocksLive, ponds: PONDS });
        recomputeFlow();
        toast("THE RIDGE IS BREACHED");
      };
      // events drained once per frame; kills pay bounty off the still-present corpse
      const drainEvents = () => {
        const evs = world.events.slice();
        world.events.length = 0;
        // dead outcrops sweep by STATE, not by kill event — an event can be
        // cleared by the next substep before the drain ever sees it
        for (let i = world.bodies.length - 1; i >= 0; i--) {
          const rb = world.bodies[i];
          if (rb.kind === "rock" && !rb.alive) {
            breachRock(rb);
            world.byId.delete(rb.id);
            world.bodies.splice(i, 1);
          }
        }
        for (const e of evs) {
          if (e.type === "tdkill") {
            S.resources += e.bounty; S.kills++;
          } else if (e.type === "leak") {
            S.lives -= e.dmg;
            toast("LEAK — " + (e.dmg > 1 ? "-" + e.dmg + " lives" : "-1 life"));
            if (S.lives <= 0) { S.lives = 0; S.gameOver = true; }
          }
        }
        return evs;
      };

      // ---- debug harness
      window.__TD__ = () => ({ t: world.t, scrap: S.resources, lives: S.lives, kills: S.kills, wave: S.ws.waveIdx + 1, bodies: world.bodies.length, fps: S.fps, paused: S.paused, speed: S.speed });
      window.__TDBUILD__ = (gx, gz, mode) => buildAt(gx, gz, mode || "wall");
      window.__TDSPAWN__ = (n, tag) => { for (let i = 0; i < (n || 1); i++) spawnEnemy(world, SPAWN_POINTS[S.spawnRR++ % SPAWN_POINTS.length], tag || ""); };
      window.__TDSIM__ = (sec) => { const n = Math.round((sec || 1) * 120); world.events.length = 0; for (let i = 0; i < n; i++) stepTd(world, grid, onStructureLost, town, onRuin); drainEvents(); };
      window.__TDUNITS__ = () => world.bodies.filter((b) => b.kind === "unit" && b.alive).map((b) => ({ x: +b.pos.x.toFixed(1), z: +b.pos.z.toFixed(1), up: +b.R[4].toFixed(2), tag: b.tag, v: +Math.hypot(b.v.x, b.v.z).toFixed(2) }));
      window.__TDGFX__ = (p) => R.setGfx(p);
      window.__TDWRECK__ = (x, z, big) => explode(world, x, field.heightAt(x, z) + 0.5, z, { r: big ? 4.2 : 3.0, kv: big ? 11 : 8, dmg: big ? 45 : 30, crater: big ? 0.9 : 0.6, hitStruct: true, attacker: "world" });
      window.__TDPROJ__ = () => world.projectiles.map((p) => ({ x: p.pos.x, y: p.pos.y, z: p.pos.z, vx: p.v.x, vy: p.v.y, vz: p.v.z, gy: field.heightAt(p.pos.x, p.pos.z) }));
      window.__TDSTART__ = () => { S.started = true; };
      window.__TDARMOR__ = () => world.bodies.filter((b) => b.kind === "vehicle" && b.team === 2).map((b) => ({ x: +b.pos.x.toFixed(1), y: +b.pos.y.toFixed(1), z: +b.pos.z.toFixed(1), hp: b.hp, alive: b.alive, ctl: b.ctl ? { th: +(b.ctl.throttle || 0).toFixed(2), st: +(b.ctl.steer || 0).toFixed(2) } : null, v: +Math.hypot(b.v.x, b.v.z).toFixed(2), goal: b.goal }));
      window.__TDMAP__ = () => ({ seed: MAP_SEED, passes: PASSES.map((b) => b.map((g) => ({ x: +g.x.toFixed(1), z: +g.z.toFixed(1) }))), spawns: SPAWN_POINTS.map((q) => ({ x: +q.x.toFixed(1), z: q.z })), town: TOWN.length });
      window.__TDBOSS__ = (spawn) => {
        if (spawn && (!world.mechs || !world.mechs.length)) { const bSide = MAP_SEED % 2; const bw = fwdU(SPAWN_U[bSide === 0 ? 0 : 2], -51); const m = buildMech(world, { x: bw.x, z: bw.z, yaw: Math.atan2(OBJ_POS.x - bw.x, OBJ_POS.z - bw.z) }); m._bossSide = bSide; m.thrustersOn = true; m.thrustAssist = true; m.bossHp = BOSS.hp; }
        const m = world.mechs && world.mechs[0];
        return m && m.hull ? { x: +m.hull.pos.x.toFixed(1), z: +m.hull.pos.z.toFixed(1), hp: Math.round(m.bossHp), falls: m._bossFalls || 0, down: !!world._bossDown } : { down: !!world._bossDown };
      };
      window.__TDROCKS__ = () => world.bodies.filter((b) => b.kind === "rock").map((b) => ({ x: +b.pos.x.toFixed(1), y: +b.pos.y.toFixed(1), z: +b.pos.z.toFixed(1), hp: Math.round(b.hp), alive: b.alive }));

      // ---- main loop
      let last = performance.now();
      const STEP = 1 / 120;
      const frame = (now) => {
        if (disposed) return;
        raf = requestAnimationFrame(frame);
        let dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        try {
          S.fpsAcc += dt; S.fpsN++;
          if (S.fpsAcc > 0.5) { S.fps = Math.round(S.fpsN / S.fpsAcc); S.fpsAcc = 0; S.fpsN = 0; }
          // sim time: zero while paused / on the title / after the end
          const sdt = S.paused || !S.started || S.gameOver || S.victory ? 0 : dt * S.speed;
          // keyboard pan (desktop nicety; touch pans by drag)
          const pan = 34 * dt / Math.max(0.5, S.zoom);
          // screen-relative like touch drag: W = screen-up whatever the Q/E yaw
          const cb = R.camBasis;
          const ul = Math.hypot(cb.up.x, cb.up.z) || 1, rl = Math.hypot(cb.right.x, cb.right.z) || 1;
          const ux = cb.up.x / ul, uz = cb.up.z / ul, rx = cb.right.x / rl, rz = cb.right.z / rl;
          if (S.keys.w || S.keys.arrowup) { S.focus.x += ux * pan; S.focus.z += uz * pan; }
          if (S.keys.s || S.keys.arrowdown) { S.focus.x -= ux * pan; S.focus.z -= uz * pan; }
          if (S.keys.a || S.keys.arrowleft) { S.focus.x -= rx * pan * 0.8; S.focus.z -= rz * pan * 0.8; }
          if (S.keys.d || S.keys.arrowright) { S.focus.x += rx * pan * 0.8; S.focus.z += rz * pan * 0.8; }
          S.focus.x = Math.max(-EXT.x, Math.min(EXT.x, S.focus.x));
          S.focus.z = Math.max(-EXT.z, Math.min(EXT.z, S.focus.z));
          S.focus.y = field.heightAt(S.focus.x, S.focus.z);
          // hover preview (mouse only — a finger is not hovering)
          if (!isTouch && S.pointer && S.started && !S.gameOver && !S.victory) {
            const p = groundPoint(S.pointer.x, S.pointer.y);
            if (p) {
              const g = grid.worldToGrid(p.x, p.z);
              if (grid.inBounds(g.gx, g.gz)) {
                const cell = grid.cells[grid.idx(g.gx, g.gz)];
                const wp = grid.gridToWorld(g.gx, g.gz);
                if (S.mode === "strike") S.hover = { x: p.x, z: p.z, valid: S.strikeCd <= 0, range: 7 };
                else {
                  const spec = S.mode === "wall" ? null : TOWER_SPECS[S.mode];
                  S.hover = { x: wp.x, z: wp.z, valid: !cell.blocked && !cell.wallId && !cell.ice, range: spec ? spec.range : 0 };
                }
              } else S.hover = null;
            } else S.hover = null;
          } else S.hover = null;
          // inspect overrides hover: park the ghost ring on the inspected structure
          if (S.inspectId) {
            const ib = world.byId.get(S.inspectId);
            if (!ib) S.inspectId = null;
            else {
              const ispec = ib.kind === "tower" ? TOWER_SPECS[ib.towerType] : null;
              S.hover = { x: ib.pos.x, z: ib.pos.z, valid: true, range: ispec ? ispec.range : 0 };
            }
          }
          // wave machine
          const ws = S.ws;
          if (S.started && !S.gameOver && !S.victory) {
            if (ws.betweenWaves) {
              ws.countdown -= sdt;
              if (ws.countdown <= 0 && ws.waveIdx < WAVES.length) startWave();
            } else {
              if (ws.spawnQueue > 0) {
                ws.spawnTimer -= sdt;
                if (ws.spawnTimer <= 0) { ws.spawnTimer = ws.spawnDelay; spawnOne(); }
              } else {
                let live = 0;
                for (const b of world.bodies) if ((b.kind === "unit" || b.kind === "vehicle") && b.alive && b.team === 2) live++;
                if (world.mechs && world.mechs.length && world.mechs[0].bossHp != null) live++;
                if (live === 0) {
                  ws.waveIdx++;
                  if (ws.waveIdx >= WAVES.length) { S.victory = true; toast("THE DEPOT HOLDS"); }
                  else {
                    ws.betweenWaves = true; ws.countdown = 8; S.resources += 12;
                    let held = 0;
                    for (const tb of town) if (tb.threatened && !tb.ruined && tb.id !== "depot" && tb.id !== "oldruin") held++;
                    const townPay = held * 6;
                    if (townPay > 0) { S.resources += townPay; S.townEarned = (S.townEarned || 0) + townPay; toast("WAVE CLEAR +12 · TOWN STANDS +" + townPay); }
                    else toast("WAVE CLEAR +12");
                  }
                }
              }
            }
            if (S.started && !S.gameOver && !S.victory) S.resources += 2.2 * sdt;
          }
          S.strikeCd = Math.max(0, S.strikeCd - sdt);
          // town protection: a building the enemy ever came within 14m of is
          // THREATENED — if it still stands at wave clear, it pays scrap
          S.thrT = (S.thrT || 0) + sdt;
          if (S.thrT > 1) {
            S.thrT = 0;
            for (const tb of town) {
              if (tb.ruined || tb.threatened || tb.id === "depot" || tb.id === "oldruin") continue;
              for (const b of world.bodies) {
                if (b.team !== 2 || !b.alive || (b.kind !== "unit" && b.kind !== "vehicle")) continue;
                if (Math.hypot(b.pos.x - tb.x, b.pos.z - tb.z) < 14) { tb.threatened = true; break; }
              }
              if (!tb.threatened && world.mechs && world.mechs.length && world.mechs[0].hull &&
                  Math.hypot(world.mechs[0].hull.pos.x - tb.x, world.mechs[0].hull.pos.z - tb.z) < 16) tb.threatened = true;
            }
          }
          // physics: fixed substeps; events accumulate across them and are
          // drained once per frame — never cleared mid-step
          S.acc += sdt;
          world.events.length = 0;
          let guard = 0;
          while (S.acc >= STEP && guard++ < 6) {
            S.acc -= STEP;
            stepTd(world, grid, onStructureLost, town, onRuin);
          }
          if (S.acc > STEP * 6) S.acc = 0;   // clamp, don't spiral
          const evs = drainEvents();
          R.consume(evs);
          A.setListener(S.focus.x, S.focus.z, 46 / Math.max(0.6, S.zoom));
          A.consume(evs);
          A.tick(world, dt);
          // build overlay + render
          if (S.hover) R.overlay.setHover(true, S.hover.x, S.hover.z, field.heightAt(S.hover.x, S.hover.z), S.hover.range, S.hover.valid, GRID_CS);
          else R.overlay.setHover(false);
          R.render(dt, S.focus, AIM_OFF, 0);
          // throttled HUD sync
          S.hudT += dt;
          if (S.hudT > 0.12) {
            S.hudT = 0;
            let en = 0, nw = 0, nt = 0;
            for (const b of world.bodies) {
              if ((b.kind === "unit" || b.kind === "vehicle") && b.alive && b.team === 2) en++;
              else if (b.kind === "wall") nw++;
              else if (b.kind === "tower") nt++;
            }
            const nowS = performance.now() / 1000;
            S.toasts = S.toasts.filter((t) => nowS - t.t < 2.2);
            setHud({
              fps: S.fps, wave: Math.min(WAVES.length, S.ws.waveIdx + 1), lives: S.lives, enemies: en,
              resources: Math.floor(S.resources), walls: nw, towers: nt, kills: S.kills,
              totalWaves: WAVES.length, between: S.ws.betweenWaves, countdown: Math.max(0, Math.ceil(S.ws.countdown)),
              started: S.started, gameOver: S.gameOver, victory: S.victory,
              mode: S.mode, sellMode: S.sellMode,
              paused: S.paused, speed: S.speed,
              strikeCd: Math.ceil(S.strikeCd), muted: A.muted, seed: MAP_SEED,
              town: (() => { let up = 0, all = 0; for (const tb of town) { if (tb.id === "depot" || tb.id === "oldruin") continue; all++; if (!tb.ruined) up++; } return { up, all, earned: Math.round(S.townEarned || 0) }; })(),
              bossHp: world.mechs && world.mechs.length && world.mechs[0].bossHp != null ? Math.max(0, Math.round(world.mechs[0].bossHp)) : (world._bossDown ? 0 : null),
              toasts: S.toasts.map((t) => t.txt),
              inspect: (() => {
                if (!S.inspectId) return null;
                const b = world.byId.get(S.inspectId);
                if (!b) return null;
                const ispec = b.kind === "tower" ? TOWER_SPECS[b.towerType] : null;
                return {
                  id: b.id,
                  label: ispec ? ispec.label : "WALL",
                  hp: Math.max(0, Math.ceil(b.hp)), maxHp: b.maxHp,
                  refund: b.kind === "tower" ? Math.floor(ispec.cost * 0.6) : 3,
                  blurb: ispec ? ispec.blurb : "Bends their road.",
                };
              })(),
            });
          }
        } catch (err) {
          console.error("COLDSNAP TD frame failed", err);
          setFatal(String(err && err.message ? err.message : err));
          disposed = true;
        }
      };
      raf = requestAnimationFrame(frame);

      return () => {
        disposed = true;
        cancelAnimationFrame(raf);
        canvas.removeEventListener("pointerdown", onPointerDown);
        canvas.removeEventListener("pointermove", onPointerMove);
        canvas.removeEventListener("pointerup", onPointerUp);
        canvas.removeEventListener("pointercancel", onPointerUp);
        canvas.removeEventListener("wheel", onWheel);
        canvas.removeEventListener("touchstart", blockTouch);
        window.removeEventListener("keydown", kd);
        window.removeEventListener("keyup", ku);
        for (const k of ["__TD__", "__TDBUILD__", "__TDSPAWN__", "__TDSIM__", "__TDGFX__", "__TDWRECK__", "__TDPROJ__", "__TDUNITS__", "__TDSTART__", "__TDROCKS__", "__TDARMOR__", "__TDBOSS__", "__TDMAP__"]) delete window[k];
        A.dispose();
        if (R) R.dispose();
        stateRef.current = null;
      };
    } catch (err) {
      console.error("COLDSNAP TD boot failed", err);
      setFatal(String(err && err.message ? err.message : err));
      if (R) R.dispose();
    }
  }, [isTouch, runId]);

  const setMode = (m) => {
    const S = stateRef.current; if (!S) return;
    S.mode = m; S.sellMode = false; S.inspectId = null;
    setHud((h) => ({ ...h, mode: m, sellMode: false }));
  };
  const toggleSell = () => {
    const S = stateRef.current; if (!S) return;
    S.sellMode = !S.sellMode; S.inspectId = null;
    setHud((h) => ({ ...h, sellMode: S.sellMode }));
  };
  const startGame = () => {
    const S = stateRef.current; if (!S) return;
    if (S.audio) S.audio.ensure();
    S.started = true;
    setHud((h) => ({ ...h, started: true }));
  };
  const toggleMute = () => {
    const S = stateRef.current; if (!S || !S.audio) return;
    S.audio.ensure();
    S.audio.setMuted(!S.audio.muted);
    setHud((h) => ({ ...h, muted: S.audio.muted }));
  };
  const sellInspected = () => { const S = stateRef.current; if (S && S.inspectId && S.sellById) S.sellById(S.inspectId); };

  const palette = [
    { key: "wall", label: "WALL", icon: "▦", cost: 5 },
    ...TOWER_ORDER.map((k) => ({ key: k, label: TOWER_SPECS[k].label, icon: TOWER_SPECS[k].icon, cost: TOWER_SPECS[k].cost })),
  ];

  return (
    <div style={P.root}>
      <canvas key={runId} ref={canvasRef} style={P.cv} />
      <div style={P.top}>
        <div style={P.stat}><span style={{ color: "#ffd27a" }}>◆</span>{hud.resources}</div>
        <div style={P.stat}><span style={{ color: "#ff7a7a" }}>♥</span>{hud.lives}</div>
        <div style={P.stat}>W {hud.wave}/{hud.totalWaves}</div>
        <div style={P.stat}>☠ {hud.enemies}</div>
        {hud.town && <div style={P.stat} title="village standing · scrap earned">⌂ {hud.town.up}/{hud.town.all}{hud.town.earned > 0 ? " · +" + hud.town.earned : ""}</div>}
        {hud.bossHp != null && hud.bossHp > 0 && (
          <div style={{ ...P.stat, borderColor: "#ff6b5e", color: "#ffab8a" }}>FRAME {hud.bossHp}</div>
        )}
        {hud.started && hud.between && !hud.gameOver && !hud.victory && (
          <button style={{ ...P.btn, borderColor: "#4aff8c", color: "#4aff8c", padding: isTouch ? "5px 10px" : "4px 10px" }} onClick={() => { const S = stateRef.current; if (S && S.sendNow) S.sendNow(); }}>
            SEND {hud.countdown}s
          </button>
        )}
        {hud.started && !hud.victory && !hud.gameOver && (
          <>
            <button style={{ ...P.btn, padding: isTouch ? "5px 10px" : "4px 10px", borderColor: hud.paused ? "#ffd27a" : "#48515f", color: hud.paused ? "#ffd27a" : "#e6ebf1" }}
              onClick={() => { const S = stateRef.current; if (S) { S.paused = !S.paused; setHud((h) => ({ ...h, paused: S.paused })); } }}>
              {hud.paused ? "▶" : "❚❚"}
            </button>
            <button style={{ ...P.btn, padding: isTouch ? "5px 10px" : "4px 10px", borderColor: hud.speed > 1 ? "#7fd7ff" : "#48515f" }}
              onClick={() => { const S = stateRef.current; if (S) { S.speed = S.speed > 1 ? 1 : 2; setHud((h) => ({ ...h, speed: S.speed })); } }}>
              {hud.speed > 1 ? "2×" : "1×"}
            </button>
          </>
        )}
        <button style={{ ...P.btn, marginLeft: "auto", padding: isTouch ? "5px 10px" : "4px 10px" }} title="rotate view (Q/E)"
          onClick={() => { const S = stateRef.current; if (S && S.rotate) S.rotate(1); }}>⟳</button>
        <button style={{ ...P.btn, padding: isTouch ? "5px 10px" : "4px 10px", opacity: hud.muted ? 0.5 : 1 }} onClick={toggleMute}>
          {hud.muted ? "🔇" : "🔊"}
        </button>
        <div style={{ ...P.stat, opacity: 0.65 }}>{hud.fps} fps</div>
      </div>

      {hud.toasts && hud.toasts.length > 0 && (
        <div style={P.toastWrap}>
          {hud.toasts.map((t, i) => <div key={i} style={P.toast}>{t}</div>)}
        </div>
      )}

      {hud.inspect && (
        <div style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", bottom: isTouch ? 96 : 104, zIndex: 5 }}>
          <div style={{ ...P.panel, position: "static", borderColor: "#7fd7ff", display: "flex", alignItems: "center", gap: 10, padding: "6px 10px" }}>
            <div>
              <div style={{ color: "#7fd7ff", letterSpacing: 1 }}>{hud.inspect.label}</div>
              <div style={{ fontSize: 10, opacity: 0.8 }}>HP {hud.inspect.hp}/{hud.inspect.maxHp} · {hud.inspect.blurb}</div>
            </div>
            <button style={{ ...P.btn, borderColor: "#ffb45e", color: "#ffb45e" }} onClick={sellInspected}>
              SELL ◆{hud.inspect.refund}
            </button>
          </div>
        </div>
      )}

      {hud.started && !hud.gameOver && !hud.victory && (
        <div style={P.bar}>
          {palette.map((p) => {
            const sel = !hud.sellMode && hud.mode === p.key;
            const afford = hud.resources >= p.cost;
            return (
              <div key={p.key}
                style={{ ...P.slot, borderColor: sel ? "#4aff8c" : "#48515f", opacity: afford ? 1 : 0.45, minWidth: isTouch ? 56 : 52 }}
                onClick={() => setMode(p.key)}>
                <div style={{ fontSize: 16 }}>{p.icon}</div>
                <div>{p.label}</div>
                <div style={{ color: "#ffd27a" }}>◆{p.cost}</div>
              </div>
            );
          })}
          <div
            style={{ ...P.slot, borderColor: !hud.sellMode && hud.mode === "strike" ? "#ff7a5e" : "#48515f", color: "#ffab8a", opacity: hud.strikeCd > 0 ? 0.45 : hud.resources >= STRIKE.cost ? 1 : 0.45, minWidth: isTouch ? 56 : 52 }}
            onClick={() => setMode("strike")}>
            <div style={{ fontSize: 16 }}>{STRIKE.icon}</div>
            <div>{hud.strikeCd > 0 ? hud.strikeCd + "s" : STRIKE.label}</div>
            <div style={{ color: "#ffd27a" }}>◆{STRIKE.cost}</div>
          </div>
          <div style={{ ...P.slot, borderColor: hud.sellMode ? "#ffb45e" : "#48515f", color: hud.sellMode ? "#ffb45e" : "#e6ebf1", minWidth: isTouch ? 56 : 52 }}
            onClick={toggleSell}>
            <div style={{ fontSize: 16 }}>✕</div>
            <div>SELL</div>
            <div style={{ opacity: 0.7 }}>60%</div>
          </div>
        </div>
      )}

      {!hud.started && !fatal && (
        <div style={P.ovl}>
          <div style={{ fontSize: 26, letterSpacing: 4, color: "#9fdcff" }}>COLDSNAP</div>
          <div style={{ fontSize: 13, letterSpacing: 8, color: "#ffd27a", marginBottom: 14 }}>TOWER DEFENSE</div>
          <div style={{ fontSize: 12, opacity: 0.85, maxWidth: 420, lineHeight: 1.6, marginBottom: 18 }}>
            They come out of the southern treeline for the depot. Wall their road, gun the choke points.
            Rock is free cover. The frozen ponds carry them faster — and you cannot build on ice.
            {isTouch ? " Drag to pan, pinch to zoom, tap to build. Tap a tower to inspect it." : " WASD pans, wheel zooms, Q/E rotates, click builds. Click a tower to inspect it."}
          </div>
          <button style={{ ...P.btn, fontSize: 15, padding: "10px 26px", borderColor: "#4aff8c", color: "#4aff8c" }} onClick={startGame}>
            DIG IN
          </button>
          <div style={{ fontSize: 10, opacity: 0.55, marginTop: 12, letterSpacing: 2 }}>FIELD ORDER #{hud.seed || "—"} · ?seed= replays a map</div>
        </div>
      )}

      {(hud.gameOver || hud.victory) && !fatal && (
        <div style={P.ovl}>
          <div style={{ fontSize: 24, letterSpacing: 3, color: hud.victory ? "#4aff8c" : "#ff7a7a", marginBottom: 8 }}>
            {hud.victory ? "THE DEPOT HOLDS" : "THE DEPOT FALLS"}
          </div>
          <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 16 }}>
            {hud.kills} kills · wave {hud.wave}/{hud.totalWaves}
            {hud.town ? <><br />village: {hud.town.up}/{hud.town.all} standing · ◆{hud.town.earned} earned holding it</> : null}
            <br /><span style={{ opacity: 0.6 }}>field order #{hud.seed}</span>
          </div>
          <button style={{ ...P.btn, fontSize: 14, padding: "9px 22px", borderColor: "#9fdcff", color: "#9fdcff" }} onClick={restart}>
            RUN IT AGAIN
          </button>
        </div>
      )}

      {fatal && (
        <div style={P.ovl}>
          <div style={{ fontSize: 18, color: "#ff7a7a", marginBottom: 10 }}>ENGINE FAULT</div>
          <div style={{ fontSize: 11, opacity: 0.8, maxWidth: 480, marginBottom: 16, wordBreak: "break-word" }}>{fatal}</div>
          <button style={{ ...P.btn, borderColor: "#9fdcff", color: "#9fdcff" }} onClick={restart}>RESTART</button>
        </div>
      )}
    </div>
  );
}
