// modules/solids — convex plane-set solids and the one ray routine, lifted
// from the shooting-range demo (holdover-greybox-range-r55-claude-opus-5.html:
// solids and rays lines 118-216, the segment occlusion test lines 1139-1168;
// verbatim math). A solid is planes as [nx,ny,nz,d]*n plus a bounding box;
// one clip routine serves boxes, turned boxes, and n-gon prisms alike.
// Substitutions from the demo, and only these: `export` added to the seven
// functions and the shared hit record; this header added.
//
// Second pass, the general parts order, phase A2. Substitutions, and only
// these:
// 1. makeHit() added, returning a fresh hit record.
// 2. The module's hit record now comes from makeHit(); named as the default
//    scratch record: the passed record is the law.
// 3. raySolid takes an out record last, default hit; every write goes to out.
// 4. raycastWorld takes an out record last, default hit; hands it to
//    raySolid and reads and writes out where it read and wrote hit.
// 5. rayBlocked is unchanged.
// 6. SOLID_CONTRACT added, naming the shape of a solid.
// 7. checkSolid(s) added, returning every problem of a broken solid in one
//    pass.

// an n-gon prism as a plane set. The solver already clips against arbitrary planes,
// so a cylinder costs sides+2 planes and no new code in the hot path.
export function makePrism(cx, cy, cz, sx, sy, sz, matId, sides, axis) {
  const n = Math.max(3, sides | 0);
  let ra, rb, half, iu, iv, ia;
  if (axis === 'z') { ra = sx / 2; rb = sy / 2; half = sz / 2; iu = 0; iv = 1; ia = 2; }
  else if (axis === 'x') { ra = sz / 2; rb = sy / 2; half = sx / 2; iu = 2; iv = 1; ia = 0; }
  else { ra = sx / 2; rb = sz / 2; half = sy / 2; iu = 0; iv = 2; ia = 1; }
  const c = [cx, cy, cz];
  const p = new Float64Array((n + 2) * 4);
  const set = (i, N, d) => { p[i * 4] = N[0]; p[i * 4 + 1] = N[1]; p[i * 4 + 2] = N[2]; p[i * 4 + 3] = d; };
  // same vertex ring the mesh uses, so collision and render agree
  const V = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + Math.PI / n;
    V.push([Math.cos(a) * ra, Math.sin(a) * rb]);
  }
  for (let i = 0; i < n; i++) {
    const A = V[i], B = V[(i + 1) % n];
    let nu = B[1] - A[1], nv = -(B[0] - A[0]);
    const L = Math.hypot(nu, nv) || 1; nu /= L; nv /= L;
    if (nu * A[0] + nv * A[1] < 0) { nu = -nu; nv = -nv; }
    const N = [0, 0, 0]; N[iu] = nu; N[iv] = nv;
    set(i, N, nu * (c[iu] + A[0]) + nv * (c[iv] + A[1]));
  }
  const capP = [0, 0, 0]; capP[ia] = 1;
  const capN = [0, 0, 0]; capN[ia] = -1;
  set(n, capP, c[ia] + half);
  set(n + 1, capN, -(c[ia] - half));
  const hx = sx / 2, hy = sy / 2, hz = sz / 2;
  return { planes: p, n: n + 2, mat: matId,
    min: [cx - hx, cy - hy, cz - hz], max: [cx + hx, cy + hy, cz + hz] };
}

// a box with a yaw, as planes. Axis-aligned collision on a rotated object is a
// visible lie once anything is turned off the grid.
export function makeBoxYaw(cx, cy, cz, sx, sy, sz, matId, ry) {
  if (!ry) return makeBox(cx, cy, cz, sx, sy, sz, matId);
  const p = new Float64Array(24);
  const set = (i, nx, ny, nz, d) => { p[i * 4] = nx; p[i * 4 + 1] = ny; p[i * 4 + 2] = nz; p[i * 4 + 3] = d; };
  const c = Math.cos(ry), s = Math.sin(ry);
  const ax = [c, 0, -s], az = [s, 0, c];
  set(0, ax[0], ax[1], ax[2], ax[0] * cx + ax[2] * cz + sx / 2);
  set(1, -ax[0], -ax[1], -ax[2], -(ax[0] * cx + ax[2] * cz) + sx / 2);
  set(2, 0, 1, 0, cy + sy / 2);
  set(3, 0, -1, 0, -(cy - sy / 2));
  set(4, az[0], az[1], az[2], az[0] * cx + az[2] * cz + sz / 2);
  set(5, -az[0], -az[1], -az[2], -(az[0] * cx + az[2] * cz) + sz / 2);
  const r = (Math.abs(sx * c) + Math.abs(sz * s)) / 2;
  const q = (Math.abs(sx * s) + Math.abs(sz * c)) / 2;
  return { planes: p, n: 6, mat: matId,
    min: [cx - r, cy - sy / 2, cz - q], max: [cx + r, cy + sy / 2, cz + q] };
}

export function makeBox(cx, cy, cz, sx, sy, sz, matId) {
  const hx = sx / 2, hy = sy / 2, hz = sz / 2;
  const p = new Float64Array(24);
  const set = (i, nx, ny, nz, d) => { p[i * 4] = nx; p[i * 4 + 1] = ny; p[i * 4 + 2] = nz; p[i * 4 + 3] = d; };
  set(0, 1, 0, 0, cx + hx); set(1, -1, 0, 0, -(cx - hx));
  set(2, 0, 1, 0, cy + hy); set(3, 0, -1, 0, -(cy - hy));
  set(4, 0, 0, 1, cz + hz); set(5, 0, 0, -1, -(cz - hz));
  return { planes: p, n: 6, mat: matId, min: [cx - hx, cy - hy, cz - hz], max: [cx + hx, cy + hy, cz + hz] };
}

export function makeSlab(cx, cy, cz, sx, sy, sz, matId) { return makeBox(cx, cy, cz, sx, sy, sz, matId); }

export function makeHit() {
  return { t: 0, tx: 0, nx: 0, ny: 0, nz: 0, solid: -1, path: 0, mat: 0 };
}

// the default scratch record for the verbatim callers: the passed record is the law.
export const hit = makeHit();

export function raySolid(s, ox, oy, oz, dx, dy, dz, out = hit) {
  let tE = -Infinity, tX = Infinity, enx = 0, eny = 0, enz = 0;
  const p = s.planes;
  for (let i = 0; i < s.n; i++) {
    const nx = p[i * 4], ny = p[i * 4 + 1], nz = p[i * 4 + 2], d = p[i * 4 + 3];
    const a = nx * ox + ny * oy + nz * oz - d;
    const b = nx * dx + ny * dy + nz * dz;
    if (b > -1e-12 && b < 1e-12) { if (a > 0) return false; continue; }
    const t = -a / b;
    if (b < 0) { if (t > tE) { tE = t; enx = nx; eny = ny; enz = nz; } }
    else { if (t < tX) tX = t; }
  }
  if (tE > tX || tX < 0) return false;
  out.t = tE; out.tx = tX; out.nx = enx; out.ny = eny; out.nz = enz;
  return true;
}

export function raycastWorld(solids, ox, oy, oz, dx, dy, dz, maxT, out = hit) {
  let best = Infinity, found = -1, bx = 0, bnx = 0, bny = 0, bnz = 0;
  for (let i = 0; i < solids.length; i++) {
    if (!raySolid(solids[i], ox, oy, oz, dx, dy, dz, out)) continue;
    const t = out.t;
    if (t < 1e-9 || t > maxT) continue;
    if (t < best) { best = t; found = i; bx = out.tx; bnx = out.nx; bny = out.ny; bnz = out.nz; }
  }
  if (found < 0) return false;
  out.t = best; out.tx = bx; out.nx = bnx; out.ny = bny; out.nz = bnz; out.solid = found;
  out.mat = solids[found].mat;
  out.path = bx - best;
  return true;
}
// Lamps are static, so their occlusion can be resolved once at mesh build instead of
// six cube-map passes per light every frame. Muzzle and impact flashes stay dynamic.
export function rayBlocked(solids, ox, oy, oz, tx, ty, tz, skipMat) {
  var dx = tx - ox, dy = ty - oy, dz = tz - oz;
  var len = Math.hypot(dx, dy, dz);
  if (len < 1e-6) return 0;
  dx /= len; dy /= len; dz /= len;
  var blo = [Math.min(ox, tx), Math.min(oy, ty), Math.min(oz, tz)];
  var bhi = [Math.max(ox, tx), Math.max(oy, ty), Math.max(oz, tz)];
  for (var s = 0; s < solids.length; s++) {
    var S = solids[s], P = S.planes, t0 = 1e-3, t1 = len - 1e-3;
    if (t1 <= t0) continue;
    if (S.max[0] < blo[0] || S.min[0] > bhi[0]) continue;
    if (S.max[1] < blo[1] || S.min[1] > bhi[1]) continue;
    if (S.max[2] < blo[2] || S.min[2] > bhi[2]) continue;
    var ok = 1;
    for (var i = 0; i < S.n; i++) {
      var nx = P[i * 4], ny = P[i * 4 + 1], nz = P[i * 4 + 2], d = P[i * 4 + 3];
      var den = nx * dx + ny * dy + nz * dz;
      var num = d - (nx * ox + ny * oy + nz * oz);
      if (den > -1e-12 && den < 1e-12) { if (num < 0) { ok = 0; break; } continue; }
      var t = num / den;
      if (den > 0) { if (t < t1) t1 = t; } else { if (t > t0) t0 = t; }
      if (t1 < t0) { ok = 0; break; }
    }
    if (ok) return 1;
  }
  return 0;
}

export const SOLID_CONTRACT = { planes: "float array of n times 4", n: "integer >= 4", min: "3 finite numbers", max: "3 finite numbers", mat: "integer" };

export function checkSolid(s) {
  const problems = [];
  if (typeof s !== "object" || s === null) {
    problems.push("solid: not an object");
    return problems;
  }
  const nOk = Number.isInteger(s.n) && s.n >= 4;
  if (!nOk) problems.push("solid.n: integer >= 4 required");
  const planesShape = s.planes instanceof Float64Array
    || (Array.isArray(s.planes) && s.planes.every((v) => Number.isFinite(v)));
  const planesOk = nOk && planesShape && s.planes.length === s.n * 4;
  if (!planesOk) problems.push("solid.planes: float array of n times 4 required");
  if (!(Array.isArray(s.min) && s.min.length === 3 && s.min.every((v) => Number.isFinite(v))))
    problems.push("solid.min: 3 finite numbers required");
  if (!(Array.isArray(s.max) && s.max.length === 3 && s.max.every((v) => Number.isFinite(v))))
    problems.push("solid.max: 3 finite numbers required");
  if (!Number.isInteger(s.mat)) problems.push("solid.mat: integer required");
  return problems;
}

