// modules/voxel — voxel destruction, a SHAPED lift from the shooting-range
// demo (holdover-greybox-range-r55-claude-opus-5.html lines 1750-2470). The
// LAW is the demo's, carried exactly and cited by line; the CODE differs
// only where said here. Carried verbatim in substance: the VOX limits and
// cell sizes (1750-1758), voxelize with its halving cap (1764-1782),
// voxCentre (1784-1789), the damage carve law (1814-1890), the rubble
// height map (1895-1909), pair contacts (1911-1969), the debris step
// (1980-2068), the DDA field ray (2166-2224), the world query (2226-2245),
// anchors (2246-2283), collapse into clusters (2284-2356), cluster flight
// with bake and shatter (2358-2470). Differences, and only these:
//   1. no renderer: the instance buffers, packing, and color plumbing
//      (stat/packAll/unpackCell/colFn) are gone; settled debris bakes into
//      a plain rubble list of cells instead of a Float32Array of instances;
//   2. no unseeded randomness: every Math.random in the demo's debris and
//      cluster tumble is drawn from a caller-seeded stream (opts.rng, e.g.
//      the ballistics module's mulberry32), so runs replay bit-exact;
//   3. the cell-size table keys the demo's part names; it is options data
//      here (opts.sizes, opts.defSize) with the demo's values the fixture;
//   4. MEDIA (brittleness by name, density) imports from the ballistics
//      module — the demo holds it in the same script scope.
// Composes with solids (raycastWorld, hit) and ballistics (MEDIA, G).
import { raycastWorld, hit } from "../solids/solids.js";
import { MEDIA, G } from "../ballistics/ballistics.js";

export const VOX = {
  MAX_DYN: 340,
  MAX_STATIC: 96000,
  MAX_PER_PRIM: 13000,
  MAX_CLUSTERS: 24,
  MAX_CLUSTER_CELLS: 2600,
  SHATTER_V: 7.5,
};

// voxelize: cells sized by the table, axis counts rounded, the largest axis
// halved until the field fits MAX_PER_PRIM (demo 1764-1782).
export function voxelize(pr, size) {
  const c = pr.cc || pr.c, s = pr.s;
  const q = size;
  let nx = Math.max(1, Math.round(s[0] / q));
  let ny = Math.max(1, Math.round(s[1] / q));
  let nz = Math.max(1, Math.round(s[2] / q));
  while (nx * ny * nz > VOX.MAX_PER_PRIM) {
    if (nx >= ny && nx >= nz) nx = Math.max(1, nx >> 1);
    else if (ny >= nz) ny = Math.max(1, ny >> 1);
    else nz = Math.max(1, nz >> 1);
  }
  const sx = s[0] / nx, sy = s[1] / ny, sz = s[2] / nz;
  return {
    nx, ny, nz, sx, sy, sz,
    ox: c[0] - s[0] / 2, oy: c[1] - s[1] / 2, oz: c[2] - s[2] / 2,
    alive: new Uint8Array(nx * ny * nz).fill(1),
    count: nx * ny * nz, prim: pr,
  };
}

// voxCentre: index to cell centre (demo 1784-1789).
export function voxCentre(f, i, out) {
  const iz = i % f.nz, iy = ((i / f.nz) | 0) % f.ny, ix = (i / (f.nz * f.ny)) | 0;
  out[0] = f.ox + f.sx * (ix + 0.5);
  out[1] = f.oy + f.sy * (iy + 0.5);
  out[2] = f.oz + f.sz * (iz + 0.5);
}

// voxRay: DDA through a field's live cells; enter, exit, path, face normal,
// material into the shared hit record (demo 2166-2224).
export function voxRay(f, ox, oy, oz, dx, dy, dz, maxT) {
  const lo0 = f.ox, hi0 = f.ox + f.sx * f.nx;
  const lo1 = f.oy, hi1 = f.oy + f.sy * f.ny;
  const lo2 = f.oz, hi2 = f.oz + f.sz * f.nz;
  let t0 = 0, t1 = maxT;
  for (let i = 0; i < 3; i++) {
    const lo = i === 0 ? lo0 : (i === 1 ? lo1 : lo2);
    const hi = i === 0 ? hi0 : (i === 1 ? hi1 : hi2);
    const o = i === 0 ? ox : (i === 1 ? oy : oz);
    const d = i === 0 ? dx : (i === 1 ? dy : dz);
    if (d > -1e-12 && d < 1e-12) { if (o < lo || o > hi) return false; continue; }
    let a = (lo - o) / d, b = (hi - o) / d;
    if (a > b) { const tm = a; a = b; b = tm; }
    if (a > t0) t0 = a;
    if (b < t1) t1 = b;
    if (t0 > t1) return false;
  }
  if (t1 < 0) return false;
  let t = Math.max(t0, 0) + 1e-6;
  let cx = Math.floor((ox + dx * t - f.ox) / f.sx);
  let cy = Math.floor((oy + dy * t - f.oy) / f.sy);
  let cz = Math.floor((oz + dz * t - f.oz) / f.sz);
  const stx = dx > 0 ? 1 : -1, sty = dy > 0 ? 1 : -1, stz = dz > 0 ? 1 : -1;
  const tdx = Math.abs(f.sx / (dx || 1e-12)), tdy = Math.abs(f.sy / (dy || 1e-12)), tdz = Math.abs(f.sz / (dz || 1e-12));
  const bx = f.ox + (cx + (dx > 0 ? 1 : 0)) * f.sx;
  const by = f.oy + (cy + (dy > 0 ? 1 : 0)) * f.sy;
  const bz = f.oz + (cz + (dz > 0 ? 1 : 0)) * f.sz;
  let tmx = (dx > -1e-12 && dx < 1e-12) ? Infinity : (bx - ox) / dx;
  let tmy = (dy > -1e-12 && dy < 1e-12) ? Infinity : (by - oy) / dy;
  let tmz = (dz > -1e-12 && dz < 1e-12) ? Infinity : (bz - oz) / dz;
  let enter = -1, axis = 0, guard = 0, lastAxis = 0;
  while (guard++ < 4096) {
    if (cx < 0 || cy < 0 || cz < 0 || cx >= f.nx || cy >= f.ny || cz >= f.nz) {
      if (enter >= 0) break;
      return false;
    }
    const idx = (cx * f.ny + cy) * f.nz + cz;
    const solid = f.alive[idx] === 1;
    if (solid && enter < 0) { enter = t; axis = lastAxis; }
    else if (!solid && enter >= 0) break;
    if (tmx < tmy && tmx < tmz) { t = tmx; cx += stx; tmx += tdx; lastAxis = 0; }
    else if (tmy < tmz) { t = tmy; cy += sty; tmy += tdy; lastAxis = 1; }
    else { t = tmz; cz += stz; tmz += tdz; lastAxis = 2; }
    if (t > t1 + 1e-9) { if (enter >= 0) { t = t1; break; } return false; }
  }
  if (enter < 0 || enter > maxT) return false;
  hit.t = enter;
  hit.tx = t;
  hit.path = t - enter;
  hit.nx = axis === 0 ? (dx > 0 ? -1 : 1) : 0;
  hit.ny = axis === 1 ? (dy > 0 ? -1 : 1) : 0;
  hit.nz = axis === 2 ? (dz > 0 ? -1 : 1) : 0;
  hit.mat = f.prim.m;
  return true;
}

// makeWorldQuery: one query over plane-set solids and voxel fields — the
// nearer hit wins (demo 2226-2245).
export function makeWorldQuery(getSolids, getFields) {
  return function (ox, oy, oz, dx, dy, dz, maxT) {
    const solids = getSolids(), fields = getFields();
    let best = Infinity, bi = -1, bt = 0, bp = 0, bnx = 0, bny = 0, bnz = 0, bm = 0;
    if (raycastWorld(solids, ox, oy, oz, dx, dy, dz, maxT)) {
      best = hit.t; bi = hit.solid; bt = hit.tx; bp = hit.path;
      bnx = hit.nx; bny = hit.ny; bnz = hit.nz; bm = hit.mat;
    }
    for (let i = 0; i < fields.length; i++) {
      if (fields[i].prim.dead) continue;
      if (!voxRay(fields[i], ox, oy, oz, dx, dy, dz, maxT)) continue;
      if (hit.t >= best) continue;
      best = hit.t; bi = solids.length + i; bt = hit.tx; bp = hit.path;
      bnx = hit.nx; bny = hit.ny; bnz = hit.nz; bm = hit.mat;
    }
    if (bi < 0) return false;
    hit.t = best; hit.tx = bt; hit.path = bp; hit.solid = bi;
    hit.nx = bnx; hit.ny = bny; hit.nz = bnz; hit.mat = bm;
    return true;
  };
}

// computeAnchors: a cell anchors on the floor, on a sound neighbouring
// solid, or on a ledge under its base (demo 2246-2283).
export function computeAnchors(f, solids, selfPrim) {
  const a = new Uint8Array(f.count), cen = [0, 0, 0];
  const hx = f.sx * 0.5, hy = f.sy * 0.5, hz = f.sz * 0.5, EPS = 0.06;
  const lo0 = f.ox - hx - EPS, hi0 = f.ox + f.sx * f.nx + hx + EPS;
  const lo1 = f.oy - hy - 0.20, hi1 = f.oy + f.sy * f.ny + hy + EPS;
  const lo2 = f.oz - hz - EPS, hi2 = f.oz + f.sz * f.nz + hz + EPS;
  const near = [];
  for (let s0 = 0; s0 < solids.length; s0++) {
    const S0 = solids[s0];
    if (S0.prim === selfPrim) continue;
    if (S0.max[0] < lo0 || S0.min[0] > hi0) continue;
    if (S0.max[1] < lo1 || S0.min[1] > hi1) continue;
    if (S0.max[2] < lo2 || S0.min[2] > hi2) continue;
    near.push(S0);
  }
  for (let i = 0; i < f.count; i++) {
    if (!f.alive[i]) continue;
    voxCentre(f, i, cen);
    const bot = cen[1] - hy;
    if (bot <= 0.05) { a[i] = 1; continue; }
    for (let s = 0; s < near.length; s++) {
      const S = near[s];
      if (cen[0] + hx < S.min[0] - EPS || cen[0] - hx > S.max[0] + EPS) continue;
      if (cen[2] + hz < S.min[2] - EPS || cen[2] - hz > S.max[2] + EPS) continue;
      if (S.max[1] >= bot - 0.16 && S.max[1] <= bot + 0.04) { a[i] = 1; break; }
      if (cen[1] + hy < S.min[1] - EPS || cen[1] - hy > S.max[1] + EPS) continue;
      const np = S.prim;
      const sound = !np || !np.voxed || (np.__f && np.__f.frac === undefined) || (np.__f && np.__f.frac > 0.5);
      if (sound) { a[i] = 1; break; }
    }
  }
  f.anchor = a;
  let n = 0;
  for (let k = 0; k < f.count; k++) if (a[k]) n++;
  f.anchorCount = n;
  return n;
}

export function makeVoxWorld(opts) {
  opts = opts || {};
  return new VoxWorld(opts);
}

function VoxWorld(opts) {
  this.fields = [];
  this.clusters = [];
  this.rubble = [];
  this.dyn = [];
  this.rng = opts.rng || (() => 0.5);
  this.sizes = opts.sizes || {};
  this.defSize = opts.defSize === undefined ? 0.11 : opts.defSize;
  this.contactsOn = opts.contactsOn === undefined ? 1 : opts.contactsOn;
}

VoxWorld.prototype.sizeFor = function (pr) {
  return this.sizes[pr.p] || this.defSize;
};

VoxWorld.prototype.fieldFor = function (pr) {
  for (let i = 0; i < this.fields.length; i++) if (this.fields[i].prim === pr) return this.fields[i];
  const f = voxelize(pr, this.sizeFor(pr));
  pr.__f = f;
  this.fields.push(f);
  pr.voxed = 1;
  return f;
};

// damage: carve every live cell inside the demo's radius law — brittle 1.9
// for glass, 1.4 for other breakables, radius min(2.6 b, (0.20 +
// sqrt(E) 0.028) b) — nearest cells fly as debris up to the pool budget,
// the overflow drops straight to floor crumbs with the demo's hash jitter,
// and the field's live fraction under 0.32 marks the prim gone (1814-1890).
VoxWorld.prototype.damage = function (pr, hx, hy, hz, energy, ivx, ivy, ivz) {
  const f = this.fieldFor(pr);
  const med = MEDIA[pr.m];
  const brittle = pr.brk ? (med && med.name.indexOf('glass') === 0 ? 1.9 : 1.4) : 1.0;
  const r = Math.min(2.6 * brittle, (0.20 + Math.sqrt(Math.max(0, energy)) * 0.028) * brittle);
  const r2 = r * r;
  const cen = [0, 0, 0], cand = [];
  for (let i = 0; i < f.count; i++) {
    if (!f.alive[i]) continue;
    voxCentre(f, i, cen);
    const dx = cen[0] - hx, dy = cen[1] - hy, dz = cen[2] - hz;
    const d2 = dx * dx + dy * dy + dz * dz;
    if (d2 > r2) continue;
    cand.push([cen[0], cen[1], cen[2], d2, i]);
  }
  if (!cand.length) return f.frac === undefined ? 1 : f.frac;
  cand.sort((a, b) => a[3] - b[3]);
  const budget = Math.max(0, VOX.MAX_DYN - this.dyn.length);
  const take = Math.min(cand.length, budget);
  const removed = [];
  for (let i = 0; i < take; i++) { f.alive[cand[i][4]] = 0; removed.push(cand[i]); }
  for (let i = take; i < cand.length; i++) {
    const cc = cand[i];
    f.alive[cc[4]] = 0;
    if (this.rubble.length >= VOX.MAX_STATIC) continue;
    const jx = (((cc[4] * 2654435761) >>> 0) / 4294967296 - 0.5) * f.sx * 2.2;
    const jz = (((cc[4] * 1597334677) >>> 0) / 4294967296 - 0.5) * f.sz * 2.2;
    this.rubble.push({
      x: cc[0] + jx, y: 0.06 + (((cc[4] * 40503) >>> 0) % 3) * f.sy * 0.9, z: cc[2] + jz,
      sx: f.sx, sy: f.sy, sz: f.sz, ca: 0, cb: 0,
    });
  }
  const mass = Math.max(0.02, (med ? med.rho : 1000) * f.sx * f.sy * f.sz);
  let bx = 0, by = 0, bz = 0;
  const tmp = [];
  for (let i = 0; i < take; i++) {
    const e = removed[i];
    const rl = Math.sqrt(e[3]) || 0.001;
    const spread = 2.2 * (1 - Math.min(1, rl / r));
    const vx = (e[0] - hx) / rl * spread;
    const vy = (e[1] - hy) / rl * spread + 0.8;
    const vz = (e[2] - hz) / rl * spread;
    tmp.push([e[0], e[1], e[2], vx, vy, vz]);
    bx += vx; by += vy; bz += vz;
  }
  if (take) { bx /= take; by /= take; bz /= take; }
  for (let i = 0; i < take; i++) {
    const t = tmp[i];
    const share = 1 / take;
    this.dyn.push({
      x: t[0], y: t[1], z: t[2],
      vx: t[3] - bx + ivx * share / mass,
      vy: t[4] - by + ivy * share / mass,
      vz: t[5] - bz + ivz * share / mass,
      ra: this.rng() * 6.28, rb: this.rng() * 6.28,
      wa: (this.rng() - 0.5) * 9, wb: (this.rng() - 0.5) * 9,
      sx: f.sx, sy: f.sy, sz: f.sz, s: Math.min(f.sx, f.sy, f.sz),
      t: 0, sleep: 0,
    });
  }
  let live = 0;
  for (let i = 0; i < f.count; i++) if (f.alive[i]) live++;
  f.frac = live / f.count;
  if (f.frac < 0.32) pr.gone = 1;
  return f.frac;
};

// The rubble height map (demo 1895-1909).
VoxWorld.RUB_CELL = 0.34;
VoxWorld.prototype.rubbleKey = function (x, z) {
  return (Math.floor(x / VoxWorld.RUB_CELL) * 92837111 ^ Math.floor(z / VoxWorld.RUB_CELL) * 689287499) >>> 0;
};
VoxWorld.prototype.rubbleTop = function (x, z) {
  if (!this.rub) return 0;
  const h = this.rub.get(this.rubbleKey(x, z));
  return h === undefined ? 0 : h;
};
VoxWorld.prototype.raiseRubble = function (x, z, top) {
  if (!this.rub) this.rub = new Map();
  const k = this.rubbleKey(x, z);
  const cur = this.rub.get(k);
  if (cur === undefined || top > cur) this.rub.set(k, top);
};

// Pair contacts over a spatial hash (demo 1911-1969).
VoxWorld.prototype.contacts = function (dt) {
  const D = this.dyn, n = D.length;
  if (n < 2) return 0;
  let cell = 0;
  for (let i = 0; i < n; i++) if (D[i].s > cell) cell = D[i].s;
  cell *= 1.45;
  if (cell < 1e-4) return 0;
  const inv = 1 / cell;
  let cap = 1; while (cap < n * 2) cap <<= 1;
  if (!this._head || this._head.length !== cap) this._head = new Int32Array(cap);
  if (!this._next || this._next.length < n) this._next = new Int32Array(Math.max(n, 64));
  const head = this._head, next = this._next, mask = cap - 1;
  head.fill(-1);
  for (let i = 0; i < n; i++) {
    const b = D[i];
    const hk = ((Math.floor(b.x * inv) * 73856093) ^ (Math.floor(b.y * inv) * 19349663) ^ (Math.floor(b.z * inv) * 83492791)) & mask;
    next[i] = head[hk]; head[hk] = i;
  }
  const REST = 0.12, FRIC = 0.42, OFF = VoxWorld.CONTACT_OFFSETS;
  let hits = 0;
  for (let i = 0; i < n; i++) {
    const A = D[i];
    if (A.sleep > 1) continue;
    const ax = Math.floor(A.x * inv), ay = Math.floor(A.y * inv), az = Math.floor(A.z * inv);
    for (let o = 0; o < OFF.length; o += 3) {
      const hk = (((ax + OFF[o]) * 73856093) ^ ((ay + OFF[o + 1]) * 19349663) ^ ((az + OFF[o + 2]) * 83492791)) & mask;
      for (let j = head[hk]; j >= 0; j = next[j]) {
        if (j <= i) continue;
        const B = D[j];
        const dx = B.x - A.x, dy = B.y - A.y, dz = B.z - A.z;
        const rr = (A.s + B.s) * 0.56;
        const d2 = dx * dx + dy * dy + dz * dz;
        if (d2 >= rr * rr || d2 < 1e-12) continue;
        const d = Math.sqrt(d2);
        const nx = dx / d, ny = dy / d, nz = dz / d;
        const corr = (rr - d) * 0.5;
        A.x -= nx * corr; A.y -= ny * corr; A.z -= nz * corr;
        B.x += nx * corr; B.y += ny * corr; B.z += nz * corr;
        const rvx = B.vx - A.vx, rvy = B.vy - A.vy, rvz = B.vz - A.vz;
        const vn = rvx * nx + rvy * ny + rvz * nz;
        if (vn < 0) {
          const jn = -(1 + REST) * vn * 0.5;
          A.vx -= nx * jn; A.vy -= ny * jn; A.vz -= nz * jn;
          B.vx += nx * jn; B.vy += ny * jn; B.vz += nz * jn;
          const tx = rvx - vn * nx, ty = rvy - vn * ny, tz = rvz - vn * nz;
          A.vx += tx * FRIC * 0.5; A.vy += ty * FRIC * 0.5; A.vz += tz * FRIC * 0.5;
          B.vx -= tx * FRIC * 0.5; B.vy -= ty * FRIC * 0.5; B.vz -= tz * FRIC * 0.5;
        }
        A.sleep = 0; B.sleep = 0;
        hits++;
      }
    }
  }
  return hits;
};

VoxWorld.CONTACT_OFFSETS = (function () {
  const a = [];
  for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) for (let z = -1; z <= 1; z++) {
    if (z < 0 || (z === 0 && (y < 0 || (y === 0 && x < 0)))) continue;
    a.push(x, y, z);
  }
  return a;
})();

// Debris step: gravity, solids bounce, rubble slope-or-settle, sleep, and
// the settled cube baking into rubble (demo 1980-2068).
VoxWorld.prototype.step = function (dt, solids) {
  const d = this.dyn, n = d.length;
  if (this.contactsOn !== 0) this.contacts(dt);
  for (let i = 0; i < n; i++) {
    const o = d[i];
    if (o.sleep) continue;
    o.t += dt;
    o.vy -= G * dt;
    o.x += o.vx * dt; o.y += o.vy * dt; o.z += o.vz * dt;
    o.ra += o.wa * dt; o.rb += o.wb * dt;
    const half = o.s * 0.5;
    for (let q = 0; q < solids.length; q++) {
      const S = solids[q];
      if (o.x < S.min[0] - half || o.x > S.max[0] + half) continue;
      if (o.y < S.min[1] - half || o.y > S.max[1] + half) continue;
      if (o.z < S.min[2] - half || o.z > S.max[2] + half) continue;
      const px = Math.min(o.x - (S.min[0] - half), (S.max[0] + half) - o.x);
      const py = Math.min(o.y - (S.min[1] - half), (S.max[1] + half) - o.y);
      const pz = Math.min(o.z - (S.min[2] - half), (S.max[2] + half) - o.z);
      if (py <= px && py <= pz) {
        o.y += (o.y > (S.min[1] + S.max[1]) / 2) ? py : -py;
        o.vy *= -0.20; o.vx *= 0.68; o.vz *= 0.68;
      } else if (px <= pz) {
        o.x += (o.x > (S.min[0] + S.max[0]) / 2) ? px : -px;
        o.vx *= -0.30;
      } else {
        o.z += (o.z > (S.min[2] + S.max[2]) / 2) ? pz : -pz;
        o.vz *= -0.30;
      }
      o.wa *= 0.6; o.wb *= 0.6;
    }
    const rTop = this.rubbleTop(o.x, o.z);
    if (rTop > 0 && o.y < rTop + half) {
      const RC = VoxWorld.RUB_CELL, REPOSE = RC * 0.72;
      let bestD = 0, bx2 = 0, bz2 = 0;
      for (let nb = 0; nb < 4; nb++) {
        const ox2 = (nb === 0 ? RC : nb === 1 ? -RC : 0);
        const oz2 = (nb === 2 ? RC : nb === 3 ? -RC : 0);
        const nt = this.rubbleTop(o.x + ox2, o.z + oz2);
        const drop = rTop - nt;
        if (drop > bestD) { bestD = drop; bx2 = ox2; bz2 = oz2; }
      }
      if (bestD > REPOSE) {
        o.vx += bx2 * 0.11; o.vz += bz2 * 0.11;
        o.y = rTop + half - REPOSE * 0.35;
      } else {
        o.y = rTop + half;
        o.vy *= -0.16; o.vx *= 0.66; o.vz *= 0.66;
        o.wa *= 0.5; o.wb *= 0.5;
      }
    }
    if (Math.abs(o.vx) + Math.abs(o.vy) + Math.abs(o.vz) < 0.42 && o.t > 0.35) o.sleep = 1;
    if (o.y < -1.2) o.sleep = 2;
  }
  let w = 0;
  for (let i = 0; i < n; i++) {
    const e2 = d[i];
    if (e2.sleep === 1 && this.rubble.length < VOX.MAX_STATIC) {
      this.raiseRubble(e2.x, e2.z, e2.y + e2.sy * 0.42);
      this.rubble.push({
        x: e2.x, y: e2.y, z: e2.z, sx: e2.sx, sy: e2.sy, sz: e2.sz,
        ca: Math.round(e2.ra / 1.5708) * 1.5708, cb: Math.round(e2.rb / 1.5708) * 1.5708,
      });
      continue;
    }
    if (e2.sleep) continue;
    d[w++] = e2;
  }
  d.length = w;
  return w;
};

// collapse: BFS from anchored cells; every unreached live group leaves the
// field as one falling cluster, capped by the demo's limits (2284-2356).
VoxWorld.prototype.collapse = function (f, solids) {
  computeAnchors(f, solids, f.prim);
  const n = f.count, seen = new Uint8Array(n), stack = [];
  for (let i = 0; i < n; i++) if (f.alive[i] && f.anchor[i]) { seen[i] = 1; stack.push(i); }
  const NY = f.ny, NZ = f.nz;
  while (stack.length) {
    const c = stack.pop();
    const iz = c % NZ, iy = ((c / NZ) | 0) % NY, ix = (c / (NZ * NY)) | 0;
    for (let d = 0; d < 6; d++) {
      const jx = ix + (d === 0 ? 1 : d === 1 ? -1 : 0);
      const jy = iy + (d === 2 ? 1 : d === 3 ? -1 : 0);
      const jz = iz + (d === 4 ? 1 : d === 5 ? -1 : 0);
      if (jx < 0 || jy < 0 || jz < 0 || jx >= f.nx || jy >= NY || jz >= NZ) continue;
      const j = (jx * NY + jy) * NZ + jz;
      if (seen[j] || !f.alive[j]) continue;
      seen[j] = 1; stack.push(j);
    }
  }
  const floating = [];
  for (let i = 0; i < n; i++) if (f.alive[i] && !seen[i]) floating.push(i);
  if (!floating.length) return 0;
  const comp = new Uint8Array(n);
  let made = 0, cellsUsed = 0;
  for (let fi = 0; fi < floating.length; fi++) {
    const start = floating[fi];
    if (comp[start] || !f.alive[start]) continue;
    const group = [], st2 = [start];
    comp[start] = 1;
    while (st2.length) {
      const c2 = st2.pop();
      group.push(c2);
      const z2 = c2 % NZ, y2 = ((c2 / NZ) | 0) % NY, x2 = (c2 / (NZ * NY)) | 0;
      for (let d2 = 0; d2 < 6; d2++) {
        const kx = x2 + (d2 === 0 ? 1 : d2 === 1 ? -1 : 0);
        const ky = y2 + (d2 === 2 ? 1 : d2 === 3 ? -1 : 0);
        const kz = z2 + (d2 === 4 ? 1 : d2 === 5 ? -1 : 0);
        if (kx < 0 || ky < 0 || kz < 0 || kx >= f.nx || ky >= NY || kz >= NZ) continue;
        const k2 = (kx * NY + ky) * NZ + kz;
        if (comp[k2] || !f.alive[k2] || seen[k2]) continue;
        comp[k2] = 1; st2.push(k2);
      }
    }
    if (this.clusters.length >= VOX.MAX_CLUSTERS) break;
    if (cellsUsed + group.length > VOX.MAX_CLUSTER_CELLS) break;
    cellsUsed += group.length;
    const cen2 = [0, 0, 0];
    let cx = 0, cy = 0, cz = 0;
    for (let g = 0; g < group.length; g++) { voxCentre(f, group[g], cen2); cx += cen2[0]; cy += cen2[1]; cz += cen2[2]; }
    cx /= group.length; cy /= group.length; cz /= group.length;
    const cells = [];
    let rad = 0;
    for (let g2 = 0; g2 < group.length; g2++) {
      voxCentre(f, group[g2], cen2);
      const ox = cen2[0] - cx, oy = cen2[1] - cy, oz = cen2[2] - cz;
      cells.push(ox, oy, oz);
      const rr = Math.hypot(ox, oy, oz); if (rr > rad) rad = rr;
      f.alive[group[g2]] = 0;
    }
    const rho = MEDIA[f.prim.m] ? MEDIA[f.prim.m].rho : 1000;
    this.clusters.push({
      x: cx, y: cy, z: cz, vx: 0, vy: 0, vz: 0,
      ra: 0, rb: 0, wa: (this.rng() - 0.5) * 0.5, wb: (this.rng() - 0.5) * 0.3,
      cells, nc: group.length, sx: f.sx, sy: f.sy, sz: f.sz,
      rad: rad + Math.max(f.sx, f.sy, f.sz) * 0.5,
      mass: rho * f.sx * f.sy * f.sz * group.length,
      t: 0,
    });
    made++;
  }
  return made;
};

// Cluster flight: fall, find the floor or a solid top, then bake to rubble
// or shatter to debris past SHATTER_V (demo 2358-2470).
VoxWorld.prototype.stepClusters = function (dt, solids) {
  const out = this.clusters;
  let keep = 0;
  for (let i = 0; i < out.length; i++) {
    const C = out[i];
    C.t += dt;
    C.vy -= G * dt;
    C.x += C.vx * dt; C.y += C.vy * dt; C.z += C.vz * dt;
    C.ra += C.wa * dt; C.rb += C.wb * dt;
    let lowest = 1e9;
    for (let q = 0; q < C.nc; q++) { const cy2 = C.y + C.cells[q * 3 + 1]; if (cy2 < lowest) lowest = cy2; }
    let floorY = 0.06 + C.sy * 0.5;
    let groundHit = lowest - C.sy * 0.5 <= 0.02;
    if (!groundHit) {
      for (let s = 0; s < solids.length; s++) {
        const S = solids[s];
        if (C.x + C.rad < S.min[0] || C.x - C.rad > S.max[0]) continue;
        if (C.z + C.rad < S.min[2] || C.z - C.rad > S.max[2]) continue;
        if (lowest - C.sy * 0.5 <= S.max[1] && C.y > S.max[1] - C.rad) { groundHit = 1; floorY = S.max[1] + C.sy * 0.5; break; }
      }
    }
    if (groundHit) {
      const impact = Math.abs(C.vy);
      const lift = floorY - (lowest - C.sy * 0.5) - C.sy * 0.5;
      C.y += Math.max(0, lift);
      if (impact > VOX.SHATTER_V) this.shatterCluster(C);
      else this.bakeCluster(C);
      continue;
    }
    out[keep++] = C;
  }
  out.length = keep;
  return keep;
};

VoxWorld.prototype.bakeCluster = function (C) {
  const ca = Math.round(C.ra / 1.5708) * 1.5708, cb = Math.round(C.rb / 1.5708) * 1.5708;
  for (let q = 0; q < C.nc; q++) {
    if (this.rubble.length >= VOX.MAX_STATIC) break;
    const x = C.x + C.cells[q * 3], y = Math.max(0.06, C.y + C.cells[q * 3 + 1]), z = C.z + C.cells[q * 3 + 2];
    this.raiseRubble(x, z, y + C.sy * 0.42);
    this.rubble.push({ x, y, z, sx: C.sx, sy: C.sy, sz: C.sz, ca, cb });
  }
};

VoxWorld.prototype.shatterCluster = function (C) {
  const budget = Math.max(0, VOX.MAX_DYN - this.dyn.length);
  const take = Math.min(C.nc, budget);
  for (let q = 0; q < C.nc; q++) {
    const px = C.x + C.cells[q * 3], py = C.y + C.cells[q * 3 + 1], pz = C.z + C.cells[q * 3 + 2];
    if (q < take) {
      this.dyn.push({
        x: px, y: py, z: pz,
        vx: (this.rng() - 0.5) * 3.2, vy: Math.abs(C.vy) * 0.22 + this.rng() * 1.4, vz: (this.rng() - 0.5) * 3.2,
        ra: this.rng() * 6.28, rb: this.rng() * 6.28,
        wa: (this.rng() - 0.5) * 9, wb: (this.rng() - 0.5) * 9,
        sx: C.sx, sy: C.sy, sz: C.sz, s: Math.min(C.sx, C.sy, C.sz),
        t: 0, sleep: 0,
      });
    } else if (this.rubble.length < VOX.MAX_STATIC) {
      this.raiseRubble(px, pz, py + C.sy * 0.42);
      this.rubble.push({ x: px, y: Math.max(0.06, py), z: pz, sx: C.sx, sy: C.sy, sz: C.sz, ca: 0, cb: 0 });
    }
  }
};

// damageTunnel: the bored tunnel (demo 2457-2567) — entry spall cone, a
// bore along the shot line, exit spall when perforated; cells nearest the
// entry fly first, the overflow drops as floor crumbs with the demo's hash
// jitter; the live fraction under 0.32 marks the prim gone.
VoxWorld.prototype.damageTunnel = function (pr, ax, ay, az, bx, by, bz, ivx, ivy, ivz, energy, perforated) {
  const f = this.fieldFor(pr);
  const med = MEDIA[pr.m] || MEDIA[0];
  const brittle = pr.brk ? (med.name.indexOf('glass') === 0 ? 2.2 : 1.5) : 1.0;
  const cell = Math.max(f.sx, f.sy, f.sz);
  const dxs = bx - ax, dys = by - ay, dzs = bz - az;
  const segLen = Math.hypot(dxs, dys, dzs);
  let ux, uy, uz;
  if (segLen > 1e-6) { ux = dxs / segLen; uy = dys / segLen; uz = dzs / segLen; }
  else { const il = Math.hypot(ivx, ivy, ivz) || 1; ux = ivx / il; uy = ivy / il; uz = ivz / il; }
  const hard = Math.sqrt((med.rho || 1000) / 2400);
  const eS = Math.sqrt(Math.max(0, energy));
  const depth = Math.max(cell * 1.2, eS * 0.0062 * brittle / Math.max(0.35, hard));
  const L = perforated ? Math.max(segLen, cell) : depth;
  const rBore = Math.max(cell * 0.75, Math.min(depth * 0.55, 0.19));
  const rSpall = Math.max(rBore, eS * 0.0180 * brittle / Math.max(0.35, hard));
  const thick = perforated ? Math.max(segLen, cell) : depth * 2;
  const spallDepth = Math.min(Math.max(cell * 1.2, rSpall * 0.34), thick * (perforated ? 0.22 : 0.50));
  const spallExit = perforated ? rSpall * 1.25 : 0;
  const exX = ax + ux * L, exY = ay + uy * L, exZ = az + uz * L;

  const cen = [0, 0, 0], cand = [];
  const mark = new Uint8Array(f.count);
  const stepL = Math.min(f.sx, f.sy, f.sz) * 0.40;
  const bore = Math.max(L, segLen);
  for (let tt = -stepL; tt <= bore + stepL; tt += stepL) {
    const gx = Math.floor((ax + ux * tt - f.ox) / f.sx);
    const gy = Math.floor((ay + uy * tt - f.oy) / f.sy);
    const gz = Math.floor((az + uz * tt - f.oz) / f.sz);
    if (gx < 0 || gy < 0 || gz < 0 || gx >= f.nx || gy >= f.ny || gz >= f.nz) continue;
    mark[(gx * f.ny + gy) * f.nz + gz] = 1;
  }
  for (let i = 0; i < f.count; i++) {
    if (!f.alive[i]) continue;
    voxCentre(f, i, cen);
    const wx = cen[0] - ax, wy = cen[1] - ay, wz = cen[2] - az;
    const t = wx * ux + wy * uy + wz * uz;
    const tc = t < 0 ? 0 : (t > L ? L : t);
    const px = wx - ux * tc, py = wy - uy * tc, pz = wz - uz * tc;
    const d = Math.hypot(px, py, pz);
    let keep = 0;
    if (mark[i]) keep = 1;
    else if (t >= -cell && t <= L + cell && d <= rBore) keep = 1;
    else if (t >= -cell && t <= spallDepth && Math.hypot(wx, wy, wz) <= rSpall) keep = 1;
    else if (spallExit > 0) {
      const ex2 = cen[0] - exX, ey2 = cen[1] - exY, ez2 = cen[2] - exZ;
      const te = ex2 * ux + ey2 * uy + ez2 * uz;
      if (te <= cell && te >= -spallDepth * 1.25 && Math.hypot(ex2, ey2, ez2) <= spallExit) keep = 1;
    }
    if (!keep) continue;
    const fr = L > 1e-9 ? tc / L : 0;
    cand.push([cen[0], cen[1], cen[2], d, i, fr, px, py, pz]);
  }
  if (!cand.length) return f.frac === undefined ? 1 : f.frac;
  cand.sort((p, q) => p[5] - q[5]);
  const budget = Math.max(0, VOX.MAX_DYN - this.dyn.length);
  const take = Math.min(cand.length, budget);
  const mass = Math.max(0.02, (med.rho || 1000) * f.sx * f.sy * f.sz);
  const vs = [];
  let mvx = 0, mvy = 0, mvz = 0;
  const rMax = Math.max(rSpall, rBore);
  for (let i = 0; i < take; i++) {
    const e = cand[i];
    f.alive[e[4]] = 0;
    const rl = Math.hypot(e[6], e[7], e[8]) || 0.001;
    const radial = 1.9 * (1 - Math.min(1, e[3] / rMax));
    const along = (e[5] - 0.30) * 3.8;
    const vx = e[6] / rl * radial + ux * along;
    const vy = e[7] / rl * radial + uy * along + 0.6;
    const vz = e[8] / rl * radial + uz * along;
    vs.push([e[0], e[1], e[2], vx, vy, vz]);
    mvx += vx; mvy += vy; mvz += vz;
  }
  if (take) { mvx /= take; mvy /= take; mvz /= take; }
  for (let i = 0; i < take; i++) {
    const s = vs[i];
    this.dyn.push({
      x: s[0], y: s[1], z: s[2],
      vx: s[3] - mvx + ivx / take / mass,
      vy: s[4] - mvy + ivy / take / mass,
      vz: s[5] - mvz + ivz / take / mass,
      ra: this.rng() * 6.28, rb: this.rng() * 6.28,
      wa: (this.rng() - 0.5) * 11, wb: (this.rng() - 0.5) * 11,
      sx: f.sx, sy: f.sy, sz: f.sz, s: Math.min(f.sx, f.sy, f.sz),
      t: 0, sleep: 0,
    });
  }
  for (let i = take; i < cand.length; i++) {
    const c2 = cand[i];
    f.alive[c2[4]] = 0;
    if (this.rubble.length >= VOX.MAX_STATIC) continue;
    const jx = (((c2[4] * 2654435761) >>> 0) / 4294967296 - 0.5) * f.sx * 2.0;
    const jz = (((c2[4] * 1597334677) >>> 0) / 4294967296 - 0.5) * f.sz * 2.0;
    this.rubble.push({
      x: c2[0] + jx, y: 0.06 + (((c2[4] * 40503) >>> 0) % 3) * f.sy * 0.9, z: c2[2] + jz,
      sx: f.sx, sy: f.sy, sz: f.sz, ca: 0, cb: 0,
    });
  }
  let live = 0;
  for (let i = 0; i < f.count; i++) if (f.alive[i]) live++;
  f.frac = live / f.count;
  if (f.frac < 0.32) pr.gone = 1;
  return f.frac;
};
