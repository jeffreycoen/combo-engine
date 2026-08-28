// src/depot/route.js — planRoute, moved verbatim out of DepotGame.jsx (P7
// T2): the motor pool routes hulls on the same movement grid squads march,
// and drivers.js must not import a React component module. P6 T1's design
// note rides with it: breadth-first from the start cell, 8-way with the
// flow field's corner rule, honest clamp to the closest reachable cell,
// thinned to turning points. Deterministic, zero rng.
//
// P7 T13: the planner knows WHO is walking. Foot (the default) refuses
// drop cells — the cliff lips a man dies walking off. Hull refuses steep
// cells, any cell pressed against masonry or rock (the clearance ring a
// 4.4m box needs), and any cell on the caller's avoid list. Enemy masonry
// stays blocked here for BOTH modes — the ram-through ruling is armorGoal's
// business (drivers.js), not the planner's.

// P7 T13: the terrain masks — pure, exported, stamped once per grid build
// (and by the test suite over synthetic grids). steep = ground a hull must
// not climb; drop = a face a man must not walk off.
export const CLIMB_MAX_GRAD = 0.45;                 // rise over run, ~24 degrees // provisional (F5)
export const DROP_STEP_M = 1.2, DROP_MAX_M = 1.0;   // one stride out, down a body-height // provisional (F5)
export function stampTerrainMasks(grid, field) {
  const D8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]];
  for (let gz = 0; gz < grid.h; gz++) for (let gx = 0; gx < grid.w; gx++) {
    const c = grid.cells[grid.idx(gx, gz)];
    const wp = grid.gridToWorld(gx, gz);
    const h0 = field.heightAt(wp.x, wp.z);
    let steep = false, drop = false;
    for (const d of D8) {
      const L = Math.hypot(d[0], d[1]);
      if (grid.inBounds(gx + d[0], gz + d[1])) {
        const np = grid.gridToWorld(gx + d[0], gz + d[1]);
        if (Math.abs(field.heightAt(np.x, np.z) - h0) / (grid.cs * L) > CLIMB_MAX_GRAD) steep = true;
      }
      const sx = wp.x + (d[0] / L) * DROP_STEP_M, sz = wp.z + (d[1] / L) * DROP_STEP_M;
      if (h0 - field.heightAt(sx, sz) > DROP_MAX_M) drop = true;
    }
    c.steep = steep; c.drop = drop;
  }
}

export function planRoute(grid, ax, az, dx, dz, opts = null) {
  const s = grid.worldToGrid(ax, az);
  if (!grid.inBounds(s.gx, s.gz)) return null;
  const t = { gx: Math.max(0, Math.min(grid.w - 1, grid.worldToGrid(dx, dz).gx)),
              gz: Math.max(0, Math.min(grid.h - 1, grid.worldToGrid(dx, dz).gz)) };
  const { cells } = grid;
  const hull = !!(opts && opts.hull);
  const avoid = (opts && opts.avoid) || null;
  // hull clearance: a cell pressed against masonry or rock is no lane for a
  // wide box. Masonry and rock ONLY — inflating water would close the
  // causeway; steep cells are already their own refusal.
  const tight = (ci) => {
    const gx = ci % grid.w, gz = (ci / grid.w) | 0;
    for (let oz = -1; oz <= 1; oz++) for (let ox = -1; ox <= 1; ox++) {
      if (!ox && !oz) continue;
      if (!grid.inBounds(gx + ox, gz + oz)) continue;
      const n = cells[grid.idx(gx + ox, gz + oz)];
      if (n.building != null || n.wallId != null || n.terrain || n.bag != null) return true;
    }
    return false;
  };
  const shut = (ci) => {
    const c = cells[ci];
    if (avoid && avoid.has(ci)) return true;
    if (hull) return c.blocked || c.steep || c.bag != null || tight(ci);
    return c.blocked || c.drop;
  };
  const prev = new Int32Array(grid.w * grid.h).fill(-2);
  const si = grid.idx(s.gx, s.gz);
  prev[si] = -1;
  const q = [si];
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]];
  let head = 0, best = si, bestD = Infinity;
  while (head < q.length) {
    const ci = q[head++];
    const cgx = ci % grid.w, cgz = (ci / grid.w) | 0;
    const dd = Math.hypot(cgx - t.gx, cgz - t.gz);
    if (dd < bestD) { bestD = dd; best = ci; if (dd === 0) break; }
    for (const d of dirs) {
      const nx = cgx + d[0], nz = cgz + d[1];
      if (!grid.inBounds(nx, nz)) continue;
      const ni = grid.idx(nx, nz);
      if (prev[ni] !== -2 || shut(ni)) continue;
      if (d[0] !== 0 && d[1] !== 0) {
        if (shut(grid.idx(cgx + d[0], cgz)) || shut(grid.idx(cgx, cgz + d[1]))) continue;
      }
      prev[ni] = ci;
      q.push(ni);
    }
  }
  if (best === si) return null; // nowhere to go (or already there)
  const cellsPath = [];
  for (let ci = best; ci !== -1; ci = prev[ci]) cellsPath.push(ci);
  cellsPath.reverse();
  const pts = [];
  for (let i = 1; i < cellsPath.length; i++) {
    const p0 = cellsPath[i - 1], p1 = cellsPath[i], p2 = cellsPath[i + 1];
    const turn = p2 == null ||
      (p1 % grid.w) - (p0 % grid.w) !== (p2 % grid.w) - (p1 % grid.w) ||
      ((p1 / grid.w) | 0) - ((p0 / grid.w) | 0) !== ((p2 / grid.w) | 0) - ((p1 / grid.w) | 0);
    if (turn) pts.push(grid.gridToWorld(p1 % grid.w, (p1 / grid.w) | 0));
  }
  return { pts, reached: bestD === 0 };
}
