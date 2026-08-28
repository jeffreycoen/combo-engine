// engine/core.js — the COLDSNAP physics core, extracted VERBATIM from
// src/demo/coldsnap-proving-grounds.jsx (lines 1-4 and 7-2098: everything up
// to the render layer, minus the react/three imports it never uses).
// The frozen demo file stays the reference: scripts/golden.mjs re-extracts
// that slice at test time and asserts worldHash parity with this module,
// so edits here that change behavior fail the golden gate.
// COLDSNAP — PROVING GROUNDS (M1)
// Physics-first RTS demo slice. Ortho RA camera, 3D-pixel-art pipeline, kill-cause
// classifiers + achievements. Physics core is pure JS (no three) and exported via
// __test__ for headless verification against THIS file.

// ---------------------------------------------------------------- rng / math
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const V = {
  set: (o, x, y, z) => { o.x = x; o.y = y; o.z = z; return o; },
  copy: (o, a) => { o.x = a.x; o.y = a.y; o.z = a.z; return o; },
  add: (o, a, b) => { o.x = a.x + b.x; o.y = a.y + b.y; o.z = a.z + b.z; return o; },
  sub: (o, a, b) => { o.x = a.x - b.x; o.y = a.y - b.y; o.z = a.z - b.z; return o; },
  scale: (o, a, s) => { o.x = a.x * s; o.y = a.y * s; o.z = a.z * s; return o; },
  addScaled: (o, a, b, s) => { o.x = a.x + b.x * s; o.y = a.y + b.y * s; o.z = a.z + b.z * s; return o; },
  dot: (a, b) => a.x * b.x + a.y * b.y + a.z * b.z,
  cross: (o, a, b) => { const x = a.y * b.z - a.z * b.y, y = a.z * b.x - a.x * b.z, z = a.x * b.y - a.y * b.x; o.x = x; o.y = y; o.z = z; return o; },
  len: (a) => Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z),
  len2: (a) => a.x * a.x + a.y * a.y + a.z * a.z,
  norm: (o, a) => { const l = V.len(a) || 1; return V.scale(o, a, 1 / l); },
};
function v3(x = 0, y = 0, z = 0) { return { x, y, z }; }
function qIdent() { return { x: 0, y: 0, z: 0, w: 1 }; }
function qNorm(q) { const l = Math.sqrt(q.x * q.x + q.y * q.y + q.z * q.z + q.w * q.w) || 1; q.x /= l; q.y /= l; q.z /= l; q.w /= l; return q; }
function qFromAxis(axis, ang) { const s = Math.sin(ang / 2); return { x: axis.x * s, y: axis.y * s, z: axis.z * s, w: Math.cos(ang / 2) }; }
function qMul(o, a, b) {
  const x = a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y;
  const y = a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x;
  const z = a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w;
  const w = a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z;
  o.x = x; o.y = y; o.z = z; o.w = w; return o;
}
function qIntegrate(q, w, dt) {
  const hx = w.x * dt * 0.5, hy = w.y * dt * 0.5, hz = w.z * dt * 0.5;
  const dq = { x: hx, y: hy, z: hz, w: 0 };
  const r = qMul({ x: 0, y: 0, z: 0, w: 0 }, dq, q);
  q.x += r.x; q.y += r.y; q.z += r.z; q.w += r.w;
  return qNorm(q);
}
// rotation matrix (column-major basis: columns are body axes in world) 9 floats
function qToR(q, R) {
  const x = q.x, y = q.y, z = q.z, w = q.w;
  const x2 = x + x, y2 = y + y, z2 = z + z;
  const xx = x * x2, xy = x * y2, xz = x * z2;
  const yy = y * y2, yz = y * z2, zz = z * z2;
  const wx = w * x2, wy = w * y2, wz = w * z2;
  R[0] = 1 - (yy + zz); R[1] = xy + wz; R[2] = xz - wy;       // col0 = local X
  R[3] = xy - wz; R[4] = 1 - (xx + zz); R[5] = yz + wx;       // col1 = local Y
  R[6] = xz + wy; R[7] = yz - wx; R[8] = 1 - (xx + yy);       // col2 = local Z
  return R;
}
function rMulVec(R, v, o) { const x = v.x, y = v.y, z = v.z; o.x = R[0] * x + R[3] * y + R[6] * z; o.y = R[1] * x + R[4] * y + R[7] * z; o.z = R[2] * x + R[5] * y + R[8] * z; return o; }
function rTMulVec(R, v, o) { const x = v.x, y = v.y, z = v.z; o.x = R[0] * x + R[1] * y + R[2] * z; o.y = R[3] * x + R[4] * y + R[5] * z; o.z = R[6] * x + R[7] * y + R[8] * z; return o; }
// world inverse inertia: R * diag(invI) * R^T -> 9 floats symmetric
function invInertiaWorld(R, d, o) {
  const a = d.x, b = d.y, c = d.z;
  const m00 = R[0] * a, m01 = R[3] * b, m02 = R[6] * c;
  const m10 = R[1] * a, m11 = R[4] * b, m12 = R[7] * c;
  const m20 = R[2] * a, m21 = R[5] * b, m22 = R[8] * c;
  o[0] = m00 * R[0] + m01 * R[3] + m02 * R[6];
  o[1] = m00 * R[1] + m01 * R[4] + m02 * R[7];
  o[2] = m00 * R[2] + m01 * R[5] + m02 * R[8];
  o[3] = o[1];
  o[4] = m10 * R[1] + m11 * R[4] + m12 * R[7];
  o[5] = m10 * R[2] + m11 * R[5] + m12 * R[8];
  o[6] = o[2]; o[7] = o[5];
  o[8] = m20 * R[2] + m21 * R[5] + m22 * R[8];
  return o;
}
function iMulVec(I, v, o) { const x = v.x, y = v.y, z = v.z; o.x = I[0] * x + I[3] * y + I[6] * z; o.y = I[1] * x + I[4] * y + I[7] * z; o.z = I[2] * x + I[5] * y + I[8] * z; return o; }

// ------------------------------------------------------- gfx pure helpers
export const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]; // /16
export function quantizeLum(l, levels, bayerN) {
  // bayerN in [0,1): ordered-dither threshold. Monotonic in l for fixed threshold.
  const t = (bayerN - 0.5) / levels;
  return Math.max(0, Math.min(1, Math.floor((l + t) * levels + 0.5) / levels));
}
// Snap an ortho camera position to a view-aligned texel grid; return snapped pos
// and residual error in texels (to shift the image back for smooth scroll).
export function snapCam(pos, right, up, fwd, texel) {
  const r = V.dot(pos, right), u = V.dot(pos, up), f = V.dot(pos, fwd);
  const rs = Math.round(r / texel) * texel, us = Math.round(u / texel) * texel;
  const p = v3(
    right.x * rs + up.x * us + fwd.x * f,
    right.y * rs + up.y * us + fwd.y * f,
    right.z * rs + up.z * us + fwd.z * f
  );
  return { pos: p, errX: (r - rs) / texel, errY: (u - us) / texel };
}
// Ballistic pitch to hit (d horizontal, dy vertical) at speed v. Low arc. Null if out of range.
export function aimSolve(v, d, dy, g = 9.8, high = false) {
  const v2 = v * v;
  const disc = v2 * v2 - g * (g * d * d + 2 * dy * v2);
  if (disc < 0) return null;
  // high: the lobbed solution (mortars clear walls); default low arc unchanged
  return Math.atan2(v2 + (high ? 1 : -1) * Math.sqrt(disc), g * d);
}

// ------------------------------------------------------------- heightfield
export function makeField(n, cs, seed = 7) {
  const h = new Float32Array(n * n);
  const half = ((n - 1) * cs) / 2;
  const F = {
    n, cs, h, half,
    // DIVERGENCE (guarded, mk2.07): the carve floor is a per-field dial.
    // Default is the frozen demo's own -1.5, so every mode that never sets
    // it — demo, sandbox, tower defense, campaign — carves byte-identically
    // (golden proves it). The war (DepotGame.jsx) dials it deeper for the
    // atomic crater.
    carveFloor: -1.5,
    idx: (i, j) => j * n + i,
    heightAt(x, z) {
      const fx = (x + half) / cs, fz = (z + half) / cs;
      let i = Math.floor(fx), j = Math.floor(fz);
      i = Math.max(0, Math.min(n - 2, i)); j = Math.max(0, Math.min(n - 2, j));
      const tx = Math.max(0, Math.min(1, fx - i)), tz = Math.max(0, Math.min(1, fz - j));
      const h00 = h[j * n + i], h10 = h[j * n + i + 1], h01 = h[(j + 1) * n + i], h11 = h[(j + 1) * n + i + 1];
      return h00 * (1 - tx) * (1 - tz) + h10 * tx * (1 - tz) + h01 * (1 - tx) * tz + h11 * tx * tz;
    },
    normalAt(x, z, o) {
      const e = cs * 0.6;
      const hx = F.heightAt(x + e, z) - F.heightAt(x - e, z);
      const hz = F.heightAt(x, z + e) - F.heightAt(x, z - e);
      V.set(o, -hx, 2 * e, -hz);
      return V.norm(o, o);
    },
    carve(x, z, rad, depth) {
      const i0 = Math.max(0, Math.floor((x - rad + half) / cs)), i1 = Math.min(n - 1, Math.ceil((x + rad + half) / cs));
      const j0 = Math.max(0, Math.floor((z - rad + half) / cs)), j1 = Math.min(n - 1, Math.ceil((z + rad + half) / cs));
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
        const px = i * cs - half, pz = j * cs - half;
        const d2 = (px - x) * (px - x) + (pz - z) * (pz - z);
        if (d2 > rad * rad) continue;
        const k = Math.exp(-(d2 / (rad * rad)) * 3);
        h[j * n + i] = Math.max(F.carveFloor, h[j * n + i] - depth * k);
      }
      F.dirty = true;
    },
    dirty: false,
  };
  return F;
}

// ------------------------------------------------------------------ bodies
export const CAUSE = { PROJECTILE: "PROJECTILE", BLAST: "BLAST", CRUSH: "CRUSH", FLIP: "FLIP", DROWN: "DROWN", TOSS: "TOSS", COLLAPSE: "COLLAPSE", IMPACT: "IMPACT" };
let BODY_ID = 1;
function boxInertiaInv(m, hx, hy, hz) {
  if (m <= 0) return v3(0, 0, 0);
  const k = 3 / m; // invI = 3/(m*(a^2+b^2)) with half extents
  return v3(k / (hy * hy + hz * hz), k / (hx * hx + hz * hz), k / (hx * hx + hy * hy));
}
export function makeBody(o) {
  const m = o.mass || 0;
  const b = {
    id: BODY_ID++, kind: o.kind || "prop", team: o.team || 0, tag: o.tag || "",
    hx: o.hx, hy: o.hy, hz: o.hz, mass: m, invM: m > 0 ? 1 / m : 0,
    invIb: boxInertiaInv(m, o.hx, o.hy, o.hz),
    pos: v3(o.x || 0, o.y || 0, o.z || 0), q: o.q ? qNorm({ ...o.q }) : qIdent(),
    v: v3(), w: v3(), R: new Float32Array(9), invIw: new Float32Array(9),
    hp: o.hp != null ? o.hp : (o.kind === "tree" ? 30 : 1e9), alive: true, sleeping: false, sleepT: 0,
    grounded: false, airT: 0, subT: 0, flipT: 0,
    lastImp: null,            // {src,attacker,t,volley}
    lastPlayerTouch: -1e9,    // for bowling / newton's first
    fallingSince: -1,         // chunks: weld broken & moving
    driver: o.driver || null, group: o.group || "",
    friction: o.friction != null ? o.friction : 0.6, restitution: o.restitution != null ? o.restitution : 0.05,
    home: null,
    _filed: false, _cells: null, // T6 (mk1.05): the broadphase's persistent tier (see collectContacts)
  };
  qToR(b.q, b.R);
  invInertiaWorld(b.R, b.invIb, b.invIw);
  return b;
}
function bodySpeed2(b) { return V.len2(b.v); }
function wake(b) { if (b.sleeping) { b.sleeping = false; } b.sleepT = 0; }
// T6 (mk1.05): pull a body off the persistent broadphase books (see
// collectContacts). Called by the filing pass when a filed body has woken,
// and by the engine's own corpse removal. Game-layer removals have no hook —
// the pair walk validates filed entries by identity and prunes ghosts lazily.
function unfileBody(world, b) {
  if (!b._filed) return;
  const bp = world._bp;
  if (bp && b._cells) for (const key of b._cells) {
    const cell = bp.get(key);
    if (!cell) continue;
    const i = cell.stat.indexOf(b);
    if (i >= 0) cell.stat.splice(i, 1);
  }
  b._filed = false; b._cells = null;
}

// -------------------------------------------------------------- SAT (boxes)
// qu3e-style: face axes of A and B + 9 edge crosses, face-clip manifold.
const _t = v3(), _ea = v3(), _eb = v3();
const _C = new Float32Array(9), _absC = new Float32Array(9);
function trackFace(s, axisIdx, sMax, best) { if (s > 0) return null; if (s > sMax.v) { sMax.v = s; best.i = axisIdx; } return sMax; }
export function satBoxBox(a, b, out) {
  // relative transform in A space
  const RA = a.R, RB = b.R;
  V.sub(_t, b.pos, a.pos);
  const tA = v3(V.dot(_t, { x: RA[0], y: RA[1], z: RA[2] }), V.dot(_t, { x: RA[3], y: RA[4], z: RA[5] }), V.dot(_t, { x: RA[6], y: RA[7], z: RA[8] }));
  // C = RA^T * RB (columns of B axes in A space)
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
    _C[j * 3 + i] = RA[i * 3 + 0] * RB[j * 3 + 0] + RA[i * 3 + 1] * RB[j * 3 + 1] + RA[i * 3 + 2] * RB[j * 3 + 2];
  }
  for (let k = 0; k < 9; k++) _absC[k] = Math.abs(_C[k]) + 1e-6;
  const ha = [a.hx, a.hy, a.hz], hb = [b.hx, b.hy, b.hz];
  const tArr = [tA.x, tA.y, tA.z];
  let sMaxFace = -1e30, faceAxis = -1, faceOwner = 0;
  // A faces (axes 0..2)
  for (let i = 0; i < 3; i++) {
    const s = Math.abs(tArr[i]) - (ha[i] + hb[0] * _absC[0 * 3 + i] + hb[1] * _absC[1 * 3 + i] + hb[2] * _absC[2 * 3 + i]);
    if (s > 0) return 0;
    if (s > sMaxFace) { sMaxFace = s; faceAxis = i; faceOwner = 0; }
  }
  // B faces (axes 3..5): project t onto B axes = C^T * tA
  for (let i = 0; i < 3; i++) {
    const tb = _C[i * 3 + 0] * tA.x + _C[i * 3 + 1] * tA.y + _C[i * 3 + 2] * tA.z;
    const s = Math.abs(tb) - (hb[i] + ha[0] * _absC[i * 3 + 0] + ha[1] * _absC[i * 3 + 1] + ha[2] * _absC[i * 3 + 2]);
    if (s > 0) return 0;
    if (s > sMaxFace + 1e-4) { sMaxFace = s; faceAxis = i; faceOwner = 1; }
  }
  // edge axes
  let sMaxEdge = -1e30, eA = -1, eB = -1, eNx = 0, eNy = 0, eNz = 0;
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
    // axis = Ai x Bj in A space
    const i1 = (i + 1) % 3, i2 = (i + 2) % 3;
    let nx = 0, ny = 0, nz = 0;
    if (i === 0) { nx = 0; ny = -_C[j * 3 + 2]; nz = _C[j * 3 + 1]; }
    else if (i === 1) { nx = _C[j * 3 + 2]; ny = 0; nz = -_C[j * 3 + 0]; }
    else { nx = -_C[j * 3 + 1]; ny = _C[j * 3 + 0]; nz = 0; }
    const L = Math.sqrt(nx * nx + ny * ny + nz * nz);
    if (L < 1e-4) continue;
    nx /= L; ny /= L; nz /= L;
    const rA_ = ha[i1] * Math.abs(i1 === 0 ? nx : i1 === 1 ? ny : nz) + ha[i2] * Math.abs(i2 === 0 ? nx : i2 === 1 ? ny : nz);
    const j1 = (j + 1) % 3, j2 = (j + 2) % 3;
    const pb1 = Math.abs(_C[j1 * 3 + 0] * nx + _C[j1 * 3 + 1] * ny + _C[j1 * 3 + 2] * nz);
    const pb2 = Math.abs(_C[j2 * 3 + 0] * nx + _C[j2 * 3 + 1] * ny + _C[j2 * 3 + 2] * nz);
    const rB_ = hb[j1] * pb1 + hb[j2] * pb2;
    const s = Math.abs(tA.x * nx + tA.y * ny + tA.z * nz) - (rA_ + rB_);
    if (s > 0) return 0;
    if (s > sMaxEdge) { sMaxEdge = s; eA = i; eB = j; eNx = nx; eNy = ny; eNz = nz; }
  }
  const rel = 0.98, abs_ = 0.008;
  const useEdge = sMaxEdge > rel * sMaxFace + abs_;
  const n = v3();
  if (!useEdge) {
    // face case
    const refIsA = faceOwner === 0;
    const ref = refIsA ? a : b, inc = refIsA ? b : a;
    const Rref = ref.R, Rinc = inc.R;
    const href = [ref.hx, ref.hy, ref.hz], hinc = [inc.hx, inc.hy, inc.hz];
    // reference normal in world
    let ax = faceAxis;
    n.x = Rref[ax * 3 + 0]; n.y = Rref[ax * 3 + 1]; n.z = Rref[ax * 3 + 2];
    // point from ref to inc
    const d = v3(); V.sub(d, inc.pos, ref.pos);
    if (V.dot(d, n) < 0) V.scale(n, n, -1);
    // incident face: the face of inc whose outward normal is most anti-parallel to n
    let incAx = 0, sInc = 1, bestDot = 1e30;
    const incN = [v3(Rinc[0], Rinc[1], Rinc[2]), v3(Rinc[3], Rinc[4], Rinc[5]), v3(Rinc[6], Rinc[7], Rinc[8])];
    for (let i = 0; i < 3; i++) {
      const dd = V.dot(incN[i], n);
      if (dd < bestDot) { bestDot = dd; incAx = i; sInc = 1; }
      if (-dd < bestDot) { bestDot = -dd; incAx = i; sInc = -1; }
    }
    // incident face 4 verts in world
    const u = (incAx + 1) % 3, w = (incAx + 2) % 3;
    const cN = v3(), cU = v3(), cW = v3();
    V.scale(cN, incN[incAx], sInc * hinc[incAx]);
    V.set(cU, Rinc[u * 3 + 0], Rinc[u * 3 + 1], Rinc[u * 3 + 2]);
    V.set(cW, Rinc[w * 3 + 0], Rinc[w * 3 + 1], Rinc[w * 3 + 2]);
    let verts = [];
    for (let s1 = -1; s1 <= 1; s1 += 2) for (let s2 = -1; s2 <= 1; s2 += 2) {
      const p = v3();
      V.copy(p, inc.pos); V.add(p, p, cN);
      V.addScaled(p, p, cU, s1 * hinc[u]); V.addScaled(p, p, cW, s2 * hinc[w]);
      verts.push({ p, id: (s1 + 1) + (s2 + 1) / 2 }); // ids 0..3
    }
    // clip against 4 side planes of reference face
    const ru = (ax + 1) % 3, rw = (ax + 2) % 3;
    const planes = [];
    for (const [ai, sgn] of [[ru, 1], [ru, -1], [rw, 1], [rw, -1]]) {
      const pn = v3(Rref[ai * 3 + 0] * sgn, Rref[ai * 3 + 1] * sgn, Rref[ai * 3 + 2] * sgn);
      const pd = V.dot(pn, ref.pos) + href[ai];
      planes.push({ pn, pd });
    }
    for (const pl of planes) {
      const nv = [];
      for (let i = 0; i < verts.length; i++) {
        const A = verts[i], B2 = verts[(i + 1) % verts.length];
        const da = V.dot(pl.pn, A.p) - pl.pd, db = V.dot(pl.pn, B2.p) - pl.pd;
        if (da <= 0) nv.push(A);
        if (da * db < 0) {
          const t = da / (da - db);
          const p = v3(); V.set(p, A.p.x + (B2.p.x - A.p.x) * t, A.p.y + (B2.p.y - A.p.y) * t, A.p.z + (B2.p.z - A.p.z) * t);
          nv.push({ p, id: 4 + ((A.id * 4 + B2.id) % 12) });
        }
      }
      verts = nv;
      if (!verts.length) break;
    }
    // keep points below reference face plane
    const faceD = V.dot(n, ref.pos) + href[ax];
    let cnt = 0;
    for (const vtx of verts) {
      const depth = faceD - V.dot(n, vtx.p);
      if (depth > 0 && cnt < 4) {
        const nn = refIsA ? v3(n.x, n.y, n.z) : v3(-n.x, -n.y, -n.z); // out normal always A->B
        out[cnt] = { p: vtx.p, n: nn, depth, fid: vtx.id + (refIsA ? 0 : 16) };
        cnt++;
      }
    }
    // sort deterministic by fid
    const arr = out.slice(0, cnt).sort((p1, p2) => p1.fid - p2.fid);
    for (let i = 0; i < cnt; i++) out[i] = arr[i];
    return cnt;
  }
  // edge case: world normal from A space, oriented A->B
  n.x = RA[0] * eNx + RA[3] * eNy + RA[6] * eNz;
  n.y = RA[1] * eNx + RA[4] * eNy + RA[7] * eNz;
  n.z = RA[2] * eNx + RA[5] * eNy + RA[8] * eNz;
  const dAB = v3(); V.sub(dAB, b.pos, a.pos);
  if (V.dot(dAB, n) < 0) V.scale(n, n, -1);
  // edge support points
  const haArr = [a.hx, a.hy, a.hz], hbArr = [b.hx, b.hy, b.hz];
  const pa = v3(); V.copy(pa, a.pos);
  for (let i = 0; i < 3; i++) {
    if (i === eA) continue;
    const axv = v3(RA[i * 3 + 0], RA[i * 3 + 1], RA[i * 3 + 2]);
    V.addScaled(pa, pa, axv, V.dot(axv, n) > 0 ? haArr[i] : -haArr[i]);
  }
  const pb = v3(); V.copy(pb, b.pos);
  for (let i = 0; i < 3; i++) {
    if (i === eB) continue;
    const axv = v3(RB[i * 3 + 0], RB[i * 3 + 1], RB[i * 3 + 2]);
    V.addScaled(pb, pb, axv, V.dot(axv, n) > 0 ? -hbArr[i] : hbArr[i]);
  }
  V.set(_ea, RA[eA * 3 + 0], RA[eA * 3 + 1], RA[eA * 3 + 2]);
  V.set(_eb, RB[eB * 3 + 0], RB[eB * 3 + 1], RB[eB * 3 + 2]);
  // closest points between lines pa+_ea*s, pb+_eb*t
  const r = v3(); V.sub(r, pa, pb);
  const A_ = 1, E_ = 1, B_ = V.dot(_ea, _eb);
  const C_ = V.dot(_ea, r), F_ = V.dot(_eb, r);
  const den = A_ * E_ - B_ * B_ || 1e-8;
  const s = (B_ * F_ - C_ * E_) / den;
  const t2 = (F_ + B_ * s) / E_;
  const p1 = v3(); V.addScaled(p1, pa, _ea, s);
  const p2 = v3(); V.addScaled(p2, pb, _eb, t2);
  const mid = v3(); V.add(mid, p1, p2); V.scale(mid, mid, 0.5);
  out[0] = { p: mid, n, depth: -sMaxEdge, fid: 64 + eA * 3 + eB };
  return 1;
}

// box vs heightfield: sample corners + face centers
const CORNERS = [];
for (let sx = -1; sx <= 1; sx += 2) for (let sy = -1; sy <= 1; sy += 2) for (let sz = -1; sz <= 1; sz += 2) CORNERS.push([sx, sy, sz]);
const FACEPTS = [[1, 0, 0], [-1, 0, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
function terrainContacts(field, b, push) {
  if (b.pinned) return 0;
  const R = b.R;
  let cnt = 0;
  const test = (lx, ly, lz, fid) => {
    const px = b.pos.x + R[0] * lx + R[3] * ly + R[6] * lz;
    const py = b.pos.y + R[1] * lx + R[4] * ly + R[7] * lz;
    const pz = b.pos.z + R[2] * lx + R[5] * ly + R[8] * lz;
    const h = field.heightAt(px, pz);
    if (py < h) {
      const n = v3(); field.normalAt(px, pz, n);
      push(b, null, { p: v3(px, py, pz), n: v3(-n.x, -n.y, -n.z), depth: h - py, fid: 128 + fid });
      cnt++;
    }
  };
  let fid = 0;
  for (const c of CORNERS) test(c[0] * b.hx, c[1] * b.hy, c[2] * b.hz, fid++);
  for (const c of FACEPTS) test(c[0] * b.hx, c[1] * b.hy, c[2] * b.hz, fid++);
  return cnt;
}

// ------------------------------------------------------------------- world
export function makeWorld(opts = {}) {
  const field = opts.field || makeField(80, 1.7);
  const world = {
    t: 0, dt: 1 / 120, gravity: 9.8, field,
    water: opts.water || null, // {x0,x1,z0,z1,level}
    bodies: [], byId: new Map(), welds: [], projectiles: [], events: [],
    rng: mulberry32(opts.seed != null ? opts.seed : 1234),
    warm: new Map(), contacts: [], control: { throttle: 0, steer: 0, brake: 0 },
    bisonId: 0, volleySeq: 1, killCount: 0, seq: 0,
    ach: null,
  };
  world.ach = makeAch();
  return world;
}
export function addBody(world, o) { const b = makeBody(o); b.seq = world.seq++; world.bodies.push(b); world.byId.set(b.id, b); return b; } // seq is world-local (unlike the module-global id) so parity-keyed AI stays deterministic across rebuilds
export function addWeld(world, a, b, breakF = 4.0e4) {
  const rA = v3(), rB = v3(), mid = v3();
  V.add(mid, a.pos, b.pos); V.scale(mid, mid, 0.5);
  const la = v3(); V.sub(la, mid, a.pos); rTMulVec(a.R, la, rA);
  const lb = v3(); V.sub(lb, mid, b.pos); rTMulVec(b.R, lb, rB);
  const w = { a, b, rA, rB, breakF, broken: false, stress: 0, acc: [0, 0, 0], born: world.t };
  // per-body adjacency: explode's shock check reads a chunk's own handful of
  // welds instead of scanning all ~1600 (the boom-frame spike's biggest term)
  if (!world.weldsOf) world.weldsOf = new Map();
  for (const m of [a, b]) { const arr = world.weldsOf.get(m.id); if (arr) arr.push(w); else world.weldsOf.set(m.id, [w]); }
  world._weldPairsDirty = true;
  world.welds.push(w); return w;
}
function weldNeighbors(world, b, out) {
  const arr = world.weldsOf && world.weldsOf.get(b.id);
  if (!arr) return;
  for (const w of arr) { if (w.broken) continue; out.push(w.a === b ? w.b : w.a); }
}
function wakeIsland(world, b) {
  const stack = [b], seen = new Set([b.id]);
  while (stack.length) {
    const cur = stack.pop(); wake(cur);
    const nb = []; weldNeighbors(world, cur, nb);
    for (const x of nb) if (!seen.has(x.id)) { seen.add(x.id); stack.push(x); }
  }
}

// ------------------------------------------------------------- projectiles
export function fireProjectile(world, from, dir, speed, spec) {
  const p = { pos: v3(from.x, from.y, from.z), v: v3(dir.x * speed, dir.y * speed, dir.z * speed), life: 0, spec, r: 0.18 };
  // every 4th MG round is a tagged tracer (render-only field; counter, not
  // rng — the demo's rng stream must not shift)
  world._trc = (world._trc || 0) + 1;
  if (spec.kind === "mg" && world._trc % 4 === 0) p.tracer = true;
  world.projectiles.push(p);
  const mz = { type: "muzzle", x: from.x, y: from.y, z: from.z, dx: dir.x, dy: dir.y, dz: dir.z, kind: spec.kind || "shell" };
  // DIVERGENCE (guarded, additive, mk0.56 weapon voices): the muzzle event
  // also names WHICH GUN fired, when the spec says so. `kind` is what the
  // round IS (four different tubes all fire kind:"shell"; every infantry arm
  // is kind:"mg"), which is why the sound engine could never tell a sniper
  // from a rifle. WINTER FRONT's spec tables (src/depot/specs.js) carry a
  // `weapon` tag; the frozen demo's, tower defense's, the campaign's and the
  // mech's do not — the property is not written at all there, so those events
  // keep the exact shape they have always had and src/platform/audio.js falls
  // back to its kind table for them. Events are never hashed either way.
  if (spec.weapon) mz.weapon = spec.weapon;
  world.events.push(mz);
  return p;
}
export function fireVolley(world, x, z, n = 6, attacker = "player") {
  const id = world.volleySeq++;
  world.strikeAt = { x, z, until: world.t + 1.35 }; // strike marker: rockets land ~1.2s after the call
  world.events.push({ type: "strike", x, z }); // audio cue (events are not hashed)
  for (let i = 0; i < n; i++) {
    const ox = (world.rng() - 0.5) * 7, oz = (world.rng() - 0.5) * 7;
    const from = v3(x + ox - 6, world.field.heightAt(x, z) + 55, z + oz - 6);
    const dir = V.norm(v3(), v3(0.11, -1, 0.11));
    const p = fireProjectile(world, from, dir, 42 + world.rng() * 4, { kind: "rocket", r: 4.4, kv: 13, dmg: 62, crater: 1.1, attacker, volley: id, delay: i * 0.09, hitStruct: true }); // hitStruct: inert outside tower defense (no wall/tower/rock bodies elsewhere)
    p.pos.y += i * 3.5;
  }
  return id;
}
function segBoxHit(p0, p1, b, outAxis) {
  // segment vs OBB slab test in body space; returns t in [0,1] or -1.
  // outAxis (optional): if provided, receives .i = the entry axis index
  // (0/1/2 for x/y/z in the box's local frame) — the face whose slab
  // constraint set the final tmin, i.e. the struck face's normal axis.
  const d = v3(); V.sub(d, p1, p0);
  const lo = v3(); V.sub(lo, p0, b.pos);
  const o = v3(); rTMulVec(b.R, lo, o);
  const ld = v3(); rTMulVec(b.R, d, ld);
  let tmin = 0, tmax = 1, tminAxis = -1;
  const hs = [b.hx + 0.15, b.hy + 0.15, b.hz + 0.15];
  const oArr = [o.x, o.y, o.z], dArr = [ld.x, ld.y, ld.z];
  for (let i = 0; i < 3; i++) {
    if (Math.abs(dArr[i]) < 1e-8) { if (Math.abs(oArr[i]) > hs[i]) return -1; continue; }
    let t1 = (-hs[i] - oArr[i]) / dArr[i], t2 = (hs[i] - oArr[i]) / dArr[i];
    if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
    if (t1 > tmin) { tmin = t1; tminAxis = i; }
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return -1;
  }
  if (outAxis) outAxis.i = tminAxis;
  return tmin;
}
export function explode(world, x, y, z, spec) {
  const bev = { type: "boom", x, y, z, r: spec.r, kind: spec.kind || "shell" };
  // DIVERGENCE (guarded, additive, mk2.09): the boom names WHICH GUN burst
  // when the spec says so — the muzzle event's mk0.56 weapon-tag precedent,
  // one event over. Events are never hashed; specs without the tag (the
  // demo, tower defense, campaign) push the exact old shape.
  if (spec.weapon) bev.weapon = spec.weapon;
  world.events.push(bev);
  world.scare = { x, z, t: world.t };
  const c = v3(x, y, z);
  // blast occlusion: solids and terrain between the burst and a body cast a shadow.
  // Damage is shadowed hard (cover is life); impulse wraps at 40% (shock bends around);
  // infantry never counts as cover, and coplanar ice never shades its own sheet.
  // occluder pre-filter: spec.r + 8 covers every body any center->target
  // segment can touch (target reach + both extents) — an exact superset of the
  // old full-bodies scan, at ~1/10 the candidates
  const occluders = [];
  {
    const oR = spec.r + 8;
    for (const o of world.bodies) {
      if (o.kind === "unit") continue;
      if (!o.alive && o.kind !== "wreck") continue;
      if (Math.max(o.hx, o.hy, o.hz) < 0.25) continue;
      const dox = o.pos.x - x, doz = o.pos.z - z;
      if (dox * dox + doz * doz > oR * oR) continue;
      occluders.push(o);
    }
  }
  const occOf = (b, dist) => {
    if (dist < 1.1) return 1; // point-blank: you are the surface
    // three rays (center and two lateral offsets), averaged: a mortar seam between two
    // stones shouldn't fry the man behind the wall, and a sliver shouldn't blank a blast.
    const px = -(b.pos.z - z), pz = (b.pos.x - x);
    const pl = Math.hypot(px, pz) || 1;
    const off = 0.22 * Math.min(1, dist / 2);
    let sum = 0;
    for (let ray = -1; ray <= 1; ray++) {
      const tx = b.pos.x + (px / pl) * off * ray, tz = b.pos.z + (pz / pl) * off * ray;
      const tgt = v3(tx, b.pos.y, tz);
      let occ = 1;
      for (const o of occluders) {
        if (o === b) continue;
        if (b.kind === "ice" && o.kind === "ice") continue;
        const t = segBoxHit(c, tgt, o);
        if (t > 0.03 && t < 0.97) { occ *= 0.35; if (occ < 0.09) { occ = 0.09; break; } }
      }
      for (let k = 2; k <= 4; k++) {
        const t = k / 5;
        // chord test, mid-to-far samples with a fat margin: the burst's own ground and
        // rolling terrain never shade; a real rim or pit lip between the two does
        if (world.field.heightAt(x + (tx - x) * t, z + (tz - z) * t) > y + (b.pos.y - y) * t + 0.4) { occ *= 0.3; break; }
      }
      sum += occ;
    }
    return sum / 3;
  };
  for (const b of world.bodies) {
    if (b.invM === 0) continue;
    if (!b.alive && b.kind === "unit") continue;
    const d = v3(); V.sub(d, b.pos, c);
    const dist = Math.max(0.4, V.len(d));
    const reach = spec.r + Math.max(b.hx, b.hy, b.hz);
    if (dist > reach) continue;
    const f = Math.max(0, 1 - dist / reach);
    if (b.kind === "chunk") wake(b); else wakeIsland(world, b); // masonry wakes locally; the front ripples outward via welds
    // impulse: lifted direction, mass-tempered dv
    const dir = v3(d.x / dist, d.y / dist + 0.5, d.z / dist);
    V.norm(dir, dir);
    const occ = occOf(b, dist);
    const temper = Math.min(1, Math.sqrt(220 / Math.max(80, b.mass)));
    // DIVERGENCE from the frozen demo: above a 600kg knee the linear kick is
    // momentum-consistent (~1/m) instead of sqrt-tempered — the sqrt curve
    // gave the 3800kg hull a 6.8 m/s shove from one mortar near-miss (and the
    // coax ~50x real momentum). Continuous at the knee; masonry (100kg) and
    // infantry (82kg) keep the demo's toss feel exactly.
    // DIVERGENCE (guarded, no mechRef in the demo): a mech link is part of
    // ONE 19-tonne machine — per-body light-mass tosses hit it 15x over and
    // a single tank shell's blast leg-swept it. Momentum-consistent with
    // the WHOLE mech mass, applied coherently to every link.
    const effM = b.mechRef ? Math.max(600, b.mechRef.mass || 19000) : b.mass;
    const dvTemper = effM <= 600 ? temper : Math.sqrt(220 / 600) * (600 / effM);
    const dv = spec.kv * f * dvTemper * (0.4 + 0.6 * occ);
    V.addScaled(b.v, b.v, dir, dv);
    // torque for tumble
    const j = v3((world.rng() - 0.5), (world.rng() - 0.5), (world.rng() - 0.5));
    const arm = v3(j.x * b.hx, b.hy * 0.5, j.z * b.hz);
    const L = v3(); V.cross(L, arm, V.scale(v3(), dir, dv * b.mass));
    const dw = v3(); iMulVec(b.invIw, L, dw);
    V.addScaled(b.w, b.w, dw, 0.6);
    // heavy vehicles: near blasts kick a real roll (mortars can flip the tank)
    if (b.kind === "vehicle" && spec.vroll) {
      const hd = Math.hypot(d.x, d.z) || 1;
      const axis = v3(-d.z / hd, 0, d.x / hd); // horizontal, perpendicular to blast direction
      // DIVERGENCE from the frozen demo: near-misses mass-temper the roll
      // kick (raw, one mortar burst beside the hull rolled 4.0 rad/s into a
      // 2.7 rad/s tip threshold and inverted the tank), but the temper
      // blends back out as f approaches point-blank — a burst right under
      // the hull can still flip it. Drama stays, the constant flipping goes.
      const rollTemper0 = Math.min(1, Math.sqrt(600 / Math.max(80, b.mass)));
      const pb = Math.max(0, (f - 0.55) / 0.45);
      const rollTemper = rollTemper0 + (1 - rollTemper0) * pb * pb;
      V.addScaled(b.w, b.w, axis, spec.vroll * f * (0.4 + 0.6 * occ) * rollTemper);
      b.v.y += (spec.vlift || spec.vroll) * f * (0.4 + 0.6 * occ) * rollTemper;
    }
    if (b.kind === "chunk" || b.kind === "ice") {
      const jmag = b.mass * (b.kind === "ice" ? spec.kv * f : dv) * 0.7; // ice: brittle shock, untempered
      const myWelds = world.weldsOf ? world.weldsOf.get(b.id) : null;
      if (myWelds) for (const wd of myWelds) {
        if (!wd.broken) {
          wd.acc[0] += dir.x * jmag; wd.acc[1] += dir.y * jmag; wd.acc[2] += dir.z * jmag;
          // shock severs masonry NOW, before the solver can hold the stone in place
          // and eat its blast velocity — freed stones fly with the shove they were
          // given. Ice keeps its slower shock/creep rule in weldBreakPass.
          if (wd.a.kind !== "ice" && wd.b.kind !== "ice" && Math.hypot(wd.acc[0], wd.acc[1], wd.acc[2]) / world.dt > wd.breakF) {
            wd.broken = true; world._weldPairsDirty = true;
            world.events.push({ type: "weldbreak", x: (wd.a.pos.x + wd.b.pos.x) / 2, y: (wd.a.pos.y + wd.b.pos.y) / 2, z: (wd.a.pos.z + wd.b.pos.z) / 2, ice: false });
            for (const cb of [wd.a, wd.b]) if (cb.kind === "chunk") { cb.fallingSince = world.t; wake(cb); }
          }
          // brittle sheet, direct hit: ice welds inside the blast's inner disc
          // shatter outright. The shock/creep rule stays for everything outside
          // it — this is what fully FREES shards so a man can drop through.
          if (wd.a.kind === "ice" && wd.b.kind === "ice" && !wd.broken) {
            const mx = (wd.a.pos.x + wd.b.pos.x) / 2 - c.x, my = (wd.a.pos.y + wd.b.pos.y) / 2 - c.y, mz = (wd.a.pos.z + wd.b.pos.z) / 2 - c.z;
            if (mx * mx + my * my + mz * mz < spec.r * spec.r * 0.3) {
              wd.broken = true; world._weldPairsDirty = true;
              world.events.push({ type: "weldbreak", x: wd.a.pos.x, y: wd.a.pos.y, z: wd.a.pos.z, ice: true });
              wake(wd.a); wake(wd.b);
            }
          }
        }
      }
    }
    b.lastImp = { src: "blast", attacker: spec.attacker || "world", t: world.t, volley: spec.volley || 0 };
    if ((spec.attacker || "") === "player") b.lastPlayerTouch = world.t;
    // DIVERGENCE (guarded): noImpact rounds (tower defense) use the TD's own
    // law — no occlusion (the tuned numbers predate it; a player's walls
    // shading the choke they fire into gutted every tower), no flat bonus
    const dmg = spec.noImpact
      ? spec.dmg * f * (dist < 1.2 ? 1.5 : 1)
      : spec.dmg * f * (0.12 + 0.88 * occ) + (dist < 1.0 && spec.kind !== "mg" ? 55 : 0); // point-blank bonus is for real munitions at your feet — a coax round bursting ON its target is just the bullet
    // DIVERGENCE from the frozen demo: trucks in the blast-damage gate too
    // (see the projectile gate in stepProjectiles for the full note)
    // DIVERGENCE (guarded): the body a dirDmg round directly struck already
    // took its damage as a direct hit in stepProjectiles (armor-consulted,
    // CAUSE.PROJECTILE) — skip it here so it isn't hit twice by the blast
    // component too. Everyone else in the burst (including a neighbor 1m
    // away) still takes the blast normally.
    if (b.alive && (b.kind === "unit" || b.kind === "vehicle" || b.kind === "truck") && b.id !== spec._directHitId) {
      // DIVERGENCE (guarded, P7.2 T5): the hit remembers where it came from —
      // the shooter when the round carried an owner, the blast point either
      // way. Depot-only fields on the short-lived info object (the dmgT
      // stamp's shape); every other mode's info is byte-identical.
      applyDamage(world, b, dmg, { cause: CAUSE.BLAST, attacker: spec.attacker || "world", volley: spec.volley || 0, srcId: world.depotCombat ? spec.owner : undefined, srcX: world.depotCombat ? x : undefined, srcZ: world.depotCombat ? z : undefined });
    }
    // DIVERGENCE (guarded): trees (tower defense) burn down under any blast —
    // no demo or campaign world holds a "tree" body
    if (b.alive && b.kind === "tree") applyDamage(world, b, dmg, { cause: CAUSE.BLAST, attacker: spec.attacker || "world" });
  }
  // DIVERGENCE (guarded, tower defense): blasts damage static structures —
  // EVERY blast, EVERYONE's ordnance (Jeff: destruction is symmetric and
  // tactical; your own mortar chips your own wall). world._tdStruct is set
  // by worlds that hold wall/tower/rock bodies; demo/campaign never scan.
  // Separate loop: the impulse loop above skips invM 0 statics.
  if (spec.hitStruct || world._tdStruct) {
    for (const b of world.bodies) {
      if (!b.alive) continue;
      // DIVERGENCE (guarded, mk1.66 — the owner's ruling): SANDBAGS ARE
      // MORTAL. A bag takes blast damage like the walls beside it — its 60hp
      // was unreachable by any path since the first bag. b.sandbag exists
      // only on depot bodies; every other mode is byte-identical (golden).
      const isBag = world.depotCombat && b.sandbag;
      if (b.kind !== "wall" && b.kind !== "tower" && b.kind !== "rock" && !isBag) continue;
      const dd = Math.hypot(b.pos.x - x, b.pos.y - y, b.pos.z - z);
      const reach = spec.r + Math.max(b.hx, b.hy, b.hz);
      if (dd > reach) continue;
      applyDamage(world, b, spec.dmg * Math.max(0, 1 - Math.max(0.4, dd) / reach), { cause: CAUSE.BLAST, attacker: spec.attacker || "world" });
      b.hitT = world.t;
    }
  }
  // DIVERGENCE (guarded): a BOSS mech carries an hp pool — blasts drain it
  // by hull proximity. Only tower-defense sets bossHp; range/campaign mechs
  // never carry the field.
  if (world.mechs) for (const mm of world.mechs) {
    if (mm.bossHp == null || !mm.hull) continue;
    const dd = Math.hypot(mm.hull.pos.x - x, mm.hull.pos.y - y, mm.hull.pos.z - z);
    const reach = spec.r + 3.5;
    if (dd < reach && spec.dmg) mm.bossHp -= spec.dmg * Math.max(0, 1 - dd / reach);
  }
  // DIVERGENCE (guarded, A2): a WAR mech's hull carries real hp — each blast
  // wounds the machine ONCE, by hull proximity (the boss pool's shape), through
  // applyDamage so attribution, lastHit, and the kill all ride the normal path.
  // A boss (bossHp) keeps its own pool untouched; a direct-hit round's blast
  // component never double-pays the body it already struck.
  if (world.mechs) for (const mm of world.mechs) {
    if (!mm.hull || !mm.hull.alive || mm.bossHp != null) continue;
    if (!spec.dmg || mm.hull.id === spec._directHitId) continue;
    const dd = Math.hypot(mm.hull.pos.x - x, mm.hull.pos.y - y, mm.hull.pos.z - z);
    const reach = spec.r + 3.5;
    if (dd < reach) applyDamage(world, mm.hull, spec.dmg * Math.max(0, 1 - dd / reach), { cause: CAUSE.BLAST, attacker: spec.attacker || "world", volley: spec.volley || 0, srcId: world.depotCombat ? spec.owner : undefined, srcX: world.depotCombat ? x : undefined, srcZ: world.depotCombat ? z : undefined });
  }
  const groundH = world.field.heightAt(x, z);
  if (y - groundH < 1.4 && spec.crater) {
    world.field.carve(x, z, spec.crater * 2.4, spec.crater);
    world.events.push({ type: "splat", x, z, r: spec.crater * 3.4 });
    // static structures do not follow the heightfield down — re-seat any near
    // the carve so nothing floats over its own crater (tower defense; inert
    // in worlds without wall/tower bodies)
    // DIVERGENCE (guarded, additive): s.seatY is how far this structure's
    // CENTRE rides above the ground it stands on. A one-piece wall or tower
    // sits exactly its own half-height up, which is what the bare s.hy form
    // assumed and still does when seatY is absent — byte-identical for the
    // frozen demo and tower defense. WINTER FRONT's walls stand as three
    // stacked courses (src/depot/state.js), and each of them rides its own
    // height: without this, one crater beside a wall re-seated all three
    // courses onto the ground and the wall imploded into a single block.
    const seatR = spec.crater * 2.4 + 1.5;
    for (const s of world.bodies) {
      // DIVERGENCE (guarded, additive, mk2.14): rocks re-seat too — same
      // terrain-grade masonry, same loop. No demo or campaign world holds a
      // "rock" body, so those modes are byte-identical.
      if (s.kind !== "wall" && s.kind !== "tower" && s.kind !== "rock") continue;
      if (Math.hypot(s.pos.x - x, s.pos.z - z) > seatR) continue;
      s.pos.y = world.field.heightAt(s.pos.x, s.pos.z) + (s.seatY != null ? s.seatY : s.hy);
    }
  }
}
function stepProjectiles(world) {
  const dt = world.dt;
  const list = world.projectiles;
  for (let i = list.length - 1; i >= 0; i--) {
    const p = list[i];
    if (p.spec.delay && p.spec.delay > 0) { p.spec.delay -= dt; continue; }
    p.life += dt;
    const p0 = v3(p.pos.x, p.pos.y, p.pos.z);
    p.v.y -= world.gravity * dt;
    // DIVERGENCE (guarded): DEPOT wind — lateral drag toward the wind vector,
    // scaled per projectile kind (spec.windF, 0 when absent). High arcs eat the
    // most wind purely because they fly longer; windF separates mg (nearly
    // immune) from mortar/rocket (kited). No rng; world.wind is set by the mode.
    if (world.depotCombat && world.wind && p.spec.windF) {
      p.v.x += (world.wind.x - p.v.x * 0.02) * p.spec.windF * dt;
      p.v.z += (world.wind.z - p.v.z * 0.02) * p.spec.windF * dt;
    }
    V.addScaled(p.pos, p.pos, p.v, dt);
    // terrain hit
    let hitT = -1;
    const h1 = world.field.heightAt(p.pos.x, p.pos.z);
    if (p.pos.y <= h1) {
      let a = 0, b = 1;
      for (let k = 0; k < 5; k++) {
        const m = (a + b) / 2;
        const mx = p0.x + (p.pos.x - p0.x) * m, my = p0.y + (p.pos.y - p0.y) * m, mz = p0.z + (p.pos.z - p0.z) * m;
        if (my <= world.field.heightAt(mx, mz)) b = m; else a = m;
      }
      hitT = b;
    }
    // body hit
    let hitBody = null, bestT = hitT < 0 ? 1.01 : hitT, hitAxis = -1;
    const _segAxis = world.depotCombat ? { i: -1 } : null;
    for (const b of world.bodies) {
      // DIVERGENCE (guarded): tower-defense structures are static but shootable;
      // hitOnly "structure" is enemy rifle fire that ignores the crowd around it
      if (p.spec.hitOnly === "structure" && b.kind !== "tower" && b.kind !== "wall" && b.kind !== "chunk") continue;
      // structures stop a round only when the spec cares about structures —
      // tower fire arcs over the player's own wall line (original TD rule).
      // "rock" is terrain-grade masonry: same rules, much more of it.
      const isStruct = b.kind === "tower" || b.kind === "wall" || b.kind === "rock";
      if (isStruct && !(p.spec.hitOnly === "structure" || p.spec.hitStruct)) continue;
      if (b.invM === 0 && b.kind !== "chunk" && !isStruct) continue;
      if (isStruct && !b.alive) continue;
      if (!b.alive && b.kind === "unit") continue;
      // owner immunity: a point-blank reticle pulls the muzzle back inside the
      // firing hull, and a shell must not detonate on its own tank leaving the
      // barrel. 0.35s clears the hull at any speed; after that you can shell
      // yourself fair and square.
      if (p.spec.owner != null && b.id === p.spec.owner && p.life < 0.35) continue;
      // DIVERGENCE (guarded): a mech is 15 bodies — one owner id can't cover
      // a shoulder-launched round clearing its own arm. No mechRef in the demo.
      if (p.spec.ownerMech && b.mechRef === p.spec.ownerMech && p.life < 0.35) continue;
      const t = segBoxHit(p0, p.pos, b, _segAxis);
      if (t >= 0 && t < bestT) { bestT = t; hitBody = b; if (_segAxis) hitAxis = _segAxis.i; }
    }
    if (hitBody || hitT >= 0) {
      const hx = p0.x + (p.pos.x - p0.x) * bestT, hy = p0.y + (p.pos.y - p0.y) * bestT, hz = p0.z + (p.pos.z - p0.z) * bestT;
      if (p.spec.kind !== "shell" && p.spec.kind !== "mg" && p.life < 0.45) { list.splice(i, 1); continue; } // mortar arming: muzzle-clipped rounds are duds, not pit-clearers. The coax (120 m/s) covers 54m inside the arming window — it carries no fuse to arm.
      // DIVERGENCE from the frozen demo: trucks take fire damage. The demo's
      // gate read unit|vehicle only, leaving trucks immune to every shell and
      // round — unnoticed there because its trucks die by CRUSH and DROWN
      // alone. Locked by scripts/righting-test.mjs.
      // DIVERGENCE (guarded): noImpact specs (tower defense) deal ALL damage
      // through the burst — the flat kind-based hit would stack 55 on top of
      // a 5-damage MG round
      // DIVERGENCE (guarded): DEPOT noImpact rounds (tower defense MG/rocket
      // specs) can also carry a dirDmg — the flat, direct-hit component that
      // armor actually gets to see (their blast damage is concussion and
      // bypasses armor by design). Only opened under world.depotCombat +
      // spec.dirDmg != null so TD's noImpact-only law is untouched elsewhere.
      if (hitBody && hitBody.alive && (!p.spec.noImpact || (world.depotCombat && p.spec.dirDmg != null)) && (hitBody.kind === "unit" || hitBody.kind === "vehicle" || hitBody.kind === "truck" || hitBody.kind === "mech" || hitBody.kind === "mechlink" || hitBody.kind === "mechfoot")) {
        let impactDmg = p.spec.dirDmg != null ? p.spec.dirDmg
          : p.spec.kind === "shell" ? 90 : p.spec.kind === "mg" ? 11 : 55;
        // DIVERGENCE (guarded): DEPOT combat scales direct impact damage by
        // impact obliquity — a glancing hit does less than a square one.
        // theta = angle between projectile velocity and the struck face's
        // normal (the axis of least penetration from segBoxHit, hitAxis, in
        // the target's local frame). Only world.depotCombat sets this up;
        // no other mode touches hitAxis or this branch.
        if (world.depotCombat && hitAxis >= 0) {
          const vLocal = v3(); rTMulVec(hitBody.R, p.v, vLocal);
          const vArr = [vLocal.x, vLocal.y, vLocal.z];
          const speed = V.len(p.v);
          if (speed > 1e-6) {
            const cosT = Math.abs(vArr[hitAxis]) / speed;
            impactDmg *= 0.35 + 0.65 * cosT;
          }
        }
        applyDamage(world, hitBody, impactDmg, { cause: CAUSE.PROJECTILE, attacker: p.spec.attacker || "world", volley: p.spec.volley || 0, srcId: world.depotCombat ? p.spec.owner : undefined }); // DIVERGENCE (guarded, P7.2 T5): the direct hit names its shooter — depot-only, the dmgT shape
        // DIVERGENCE (guarded): mark the struck body so explode()'s noImpact
        // blast-damage loop skips it below — the round already paid its
        // damage here as a direct hit; impulse/toss from the burst still
        // applies (being shot still shoves you). p.spec is a fresh object
        // per fireProjectile call (every call site builds a literal inside
        // its firing loop, never shared across a volley/burst), so tagging
        // it here is race-free — no cross-contamination between projectiles.
        if (p.spec.dirDmg != null) p.spec._directHitId = hitBody.id;
      }
      // DIVERGENCE (guarded): DEPOT tree combat — mg fire shreds a tree's hp
      // directly (blast already burns them via explode(), unguarded, for TD);
      // a shell/rocket direct hit ignites it instead of an instant kill.
      // Guarded on world.depotCombat only: _tdStruct worlds already get their
      // tree damage through the blast path and must not gain a second one.
      if (hitBody && hitBody.alive && world.depotCombat && hitBody.kind === "tree") {
        if (p.spec.kind === "mg") applyDamage(world, hitBody, 4, { cause: CAUSE.PROJECTILE, attacker: p.spec.attacker || "world" });
        else if (p.spec.kind === "shell" || p.spec.kind === "rocket") hitBody.burning = world.t;
      }
      // DIVERGENCE (guarded): shells with declared mass deliver their real
      // momentum m*v to what they hit, on top of blast — no demo spec sets pmass.
      if (p.spec.pmass && hitBody && hitBody.invM > 0) {
        const sp = V.len(p.v);
        if (sp > 1e-6) {
          const J = p.spec.pmass * sp;
          // DIVERGENCE (guarded): a shell striking a mech limb dumps its
          // momentum into the FRAME (hull), not the 400kg link — a limb
          // kicked at 7 m/s was an instant leg-sweep
          const rcv = hitBody.mechRef && hitBody.mechRef.hull ? hitBody.mechRef.hull : hitBody;
          rcv.v.x += p.v.x / sp * J * rcv.invM;
          rcv.v.y += p.v.y / sp * J * rcv.invM;
          rcv.v.z += p.v.z / sp * J * rcv.invM;
          wake(rcv);
        }
      }
      explode(world, hx, hy, hz, p.spec);
      list.splice(i, 1);
      continue;
    }
    if (p.life > 8) list.splice(i, 1);
  }
}

// ------------------------------------------------------- damage & killing
function applyDamage(world, b, dmg, info) {
  // DIVERGENCE (guarded: no mechRef in the frozen demo): a mech takes every
  // wound on ONE ledger — any hit on any limb is a hit on the hull.
  if (b.mechRef && b.mechRef.hull && b !== b.mechRef.hull) b = b.mechRef.hull;
  if (!b.alive || dmg <= 0) return;
  // DIVERGENCE (guarded): DEPOT armor thresholds — a sub-armor ballistic hit
  // glances off (15% dmg); blast (concussion) bypasses armor entirely.
  if (world.depotCombat && b.armor != null && info.cause !== CAUSE.BLAST && dmg < b.armor) dmg *= 0.15;
  b.hp -= dmg;
  b.lastHit = info;
  // DIVERGENCE (guarded, mk0.99): HIT FEEDBACK STAMP — depot units remember
  // WHEN they were last hurt so the renderer can flinch/flash them. A plain
  // world-clock stamp; nothing in the sim reads it, no rng, no flag no change.
  if (world.depotCombat && b.kind === "unit" && dmg > 0) b.dmgT = world.t;
  if (b.hp <= 0) killBody(world, b, info);
}
function resolveCause(world, b, info) {
  let cause = info.cause, attacker = info.attacker;
  if (cause === CAUSE.IMPACT && b.lastImp && world.t - b.lastImp.t < 3) {
    cause = CAUSE.TOSS; attacker = b.lastImp.attacker;
    info = { ...info, volley: b.lastImp.volley || info.volley };
  }
  return { cause, attacker, volley: info.volley || 0, killerId: info.killerId || 0, buildingId: info.buildingId || "" };
}
function killBody(world, b, info) {
  if (!b.alive) return;
  b.alive = false;
  const r = resolveCause(world, b, info);
  world.killCount++;
  const ev = { type: "kill", id: b.id, kind: b.kind, group: b.group, cause: r.cause, attacker: r.attacker, killerId: r.killerId, buildingId: r.buildingId, volley: r.volley, x: b.pos.x, y: b.pos.y, z: b.pos.z, t: world.t };
  // DIVERGENCE (guarded, depot-only — the srcId/dmgT precedent): the kill
  // event names its victim's side and type, so the game layer can price the
  // death after the body is swept. Demo/campaign events stay byte-identical.
  if (world.depotCombat) {
    ev.team = b.team; ev.tag = b.tag; ev.utype = b.utype;
    ev.vtype = b.vtype; ev.towerType = b.towerType;
    if (b.sandbag) { ev.sandbag = 1; ev.bagSide = b.bagSide || 1; }
  }
  world.events.push(ev);
  achOnKill(world, ev);
  if (b.kind === "vehicle") { b.kind = "wreck"; b.hp = 1e9; b.friction = 0.55; }
  else if (b.kind === "unit") { b.deadT = world.t; }
}

// ------------------------------------------------------------ achievements
export function makeAch() {
  return {
    unlocked: new Set(), total: 0,
    chainTimes: [], collapse: new Map(), volley: new Map(), wreck: new Map(),
    defs: [
      ["first_blood", "First Blood", "Score a kill."],
      ["roadkill", "Roadkill", "Crush infantry under your treads."],
      ["turtled", "Turtled", "Destroy a vehicle by flipping it."],
      ["deep_end", "The Deep End", "Drown a unit."],
      ["bowling", "Bowling for Comrades", "One shove, two kills with a wreck."],
      ["newtons", "Newton's First", "A wreck kills while coasting — no input for 2.5s."],
      ["demoman", "Demolition Man", "Crush 3 under one collapsing building."],
      ["chain", "Chain Reaction", "4 blast/toss kills within 2 seconds."],
      ["saturation", "Saturation Fire", "3+ kills with a single rocket volley."],
      ["quota", "Fifty Below", "50 total kills (lifetime)."],
    ],
  };
}
function achUnlock(world, id) {
  const a = world.ach;
  if (a.unlocked.has(id)) return;
  a.unlocked.add(id);
  const d = a.defs.find((x) => x[0] === id);
  world.events.push({ type: "ach", id, name: d ? d[1] : id, desc: d ? d[2] : "" });
}
export function achOnKill(world, ev) {
  const a = world.ach, t = ev.t;
  a.total++;
  achUnlock(world, "first_blood");
  if (a.total >= 50) achUnlock(world, "quota");
  const killer = ev.killerId ? world.byId.get(ev.killerId) : null;
  if (ev.cause === CAUSE.CRUSH) {
    if (killer && killer.kind === "vehicle" && killer.driver === "player") achUnlock(world, "roadkill");
    if (killer && killer.kind === "wreck") {
      const impT = killer.lastPlayerTouch;
      if (t - impT <= 3.5) {
        const rec = a.wreck.get(killer.id) || { impT, times: [] };
        if (Math.abs(rec.impT - impT) > 0.01) { rec.impT = impT; rec.times = []; }
        rec.times.push(t); a.wreck.set(killer.id, rec);
        if (rec.times.length >= 2) achUnlock(world, "bowling");
      }
      if (t - impT > 2.5) achUnlock(world, "newtons");
    }
  }
  if (ev.cause === CAUSE.FLIP) achUnlock(world, "turtled");
  if (ev.cause === CAUSE.DROWN) achUnlock(world, "deep_end");
  if (ev.cause === CAUSE.COLLAPSE) {
    const key = ev.buildingId || "b";
    const arr = (a.collapse.get(key) || []).filter((x) => t - x < 5);
    arr.push(t); a.collapse.set(key, arr);
    if (arr.length >= 3) achUnlock(world, "demoman");
  }
  if (ev.cause === CAUSE.BLAST || ev.cause === CAUSE.TOSS) {
    a.chainTimes = a.chainTimes.filter((x) => t - x < 2.0);
    a.chainTimes.push(t);
    if (a.chainTimes.length >= 4) achUnlock(world, "chain");
  }
  if (ev.volley) {
    const c = (a.volley.get(ev.volley) || 0) + 1;
    a.volley.set(ev.volley, c);
    if (c >= 3) achUnlock(world, "saturation");
  }
}

// ------------------------------------------------------------------ drive
function driveHull(world, b, c) {
  const dt = world.dt;
  if (Math.abs(c.throttle) > 0.05 || Math.abs(c.steer) > 0.05 || c.brake) wake(b);
  if (b.sleeping) return;
  const fwd = v3(b.R[6], b.R[7], b.R[8]);
  const side = v3(b.R[0], b.R[1], b.R[2]);
  // treads grip only when the hull is tread-side down: upY 1 upright, <=0.25 no authority
  const upY = b.R[4];
  const traction = (b.grounded || b.onBody) ? Math.max(0, Math.min(1, (upY - 0.25) / 0.45)) : 0;
  const vA = V.dot(b.v, fwd);
  const target = c.throttle >= 0 ? c.throttle * 9.5 : c.throttle * 4.5;
  let acc = (target - vA) * 2.6;
  acc = Math.max(-9, Math.min(9, acc));
  if (traction > 0) V.addScaled(b.v, b.v, fwd, acc * dt * traction);
  // track grip: kill lateral slide (only as much as the treads can bite)
  const vS = V.dot(b.v, side);
  V.addScaled(b.v, b.v, side, -vS * Math.min(1, 7 * dt) * (0.12 + 0.88 * traction));
  if (traction > 0.02) {
    const wT = c.steer * 1.5 * (c.throttle < -0.05 ? -1 : 1);
    b.w.y += (wT - b.w.y) * Math.min(1, 9 * dt) * traction;
  }
  if (c.brake) { b.v.x *= Math.exp(-5 * dt); b.v.z *= Math.exp(-5 * dt); }
}

function aiDrive(world, b) {
  const c = b.ctl;
  c.brake = false;
  if (b.follow) {
    const lead = world.byId.get(world.bisonId);
    if (lead && lead.alive && lead.id !== b.id) b.goal = { x: lead.pos.x - lead.R[6] * 6, z: lead.pos.z - lead.R[8] * 6 };
  }
  const g = b.goal;
  if (!g) { c.throttle = 0; c.steer = 0; return; }
  const dx = g.x - b.pos.x, dz = g.z - b.pos.z, d = Math.hypot(dx, dz);
  if (d < 2.2) { c.throttle = 0; c.steer = 0; c.brake = true; return; }
  let err = Math.atan2(dx, dz) - Math.atan2(b.R[6], b.R[8]);
  while (err > Math.PI) err -= 2 * Math.PI;
  while (err < -Math.PI) err += 2 * Math.PI;
  c.steer = Math.max(-1, Math.min(1, err * 1.8)); // the touch stick's goal-seek gain
  c.throttle = Math.min(1, d / 6) * (Math.abs(err) > 1.2 ? 0.35 : 1) * ((b.driverSpec && b.driverSpec.throttleHabit) || 1);
}

function stepDrive(world) {
  for (const b of world.bodies) {
    if (b.kind !== "vehicle" || !b.alive) continue;
    if (b.id === world.bisonId) {
      if (!b.ctl) b.ctl = { throttle: 0, steer: 0, brake: false };
      const wc = world.control;
      b.ctl.throttle = wc.throttle; b.ctl.steer = wc.steer; b.ctl.brake = !!wc.brake;
    } else if (b.squad) {
      if (!b.ctl) b.ctl = { throttle: 0, steer: 0, brake: false };
      aiDrive(world, b);
    } else if (world.depotCombat && b.depotDrive) {
      // DIVERGENCE (guarded, mk1.30 P7 T1): THE WAR COMMANDS ITS OWN HULLS.
      // A depot vehicle carrying b.depotDrive is driven here: "auto" — the
      // game layer wrote b.goal (an order) and aiDrive steers to it;
      // "manual" — the game layer wrote b.ctl itself this tick (possession
      // sticks, Task 2). Guarded on world.depotCombat and a field no demo/
      // TD/campaign body ever carries, so every other mode is byte-identical
      // (golden proves it).
      if (!b.ctl) b.ctl = { throttle: 0, steer: 0, brake: false };
      if (b.depotDrive === "auto") aiDrive(world, b);
    } else continue; // parked hulls (scouts, depot) stay untouched
    driveHull(world, b, b.ctl);
  }
}

function grenFire(world, u, target) {
  const sx = target.pos.x + (world.rng() - 0.5) * 3.6;
  const sz = target.pos.z + (world.rng() - 0.5) * 3.6;
  const muzzle = v3(u.pos.x, u.pos.y + 1.1, u.pos.z);
  const dx = sx - muzzle.x, dz = sz - muzzle.z;
  const d = Math.max(2, Math.hypot(dx, dz));
  const dy = world.field.heightAt(sx, sz) - muzzle.y;
  const speed = 30;
  let pitch = aimSolve(speed, d, dy);
  if (pitch == null) pitch = 1.0;
  const dir = v3((dx / d) * Math.cos(pitch), Math.sin(pitch), (dz / d) * Math.cos(pitch));
  const pr = fireProjectile(world, muzzle, dir, speed, { kind: "mortar", r: 3.0, kv: 26, dmg: 42, crater: 0.7, attacker: "gren", owner: u.id, vroll: 6, vlift: 6 });
  world.events.push({ type: "gmuzzle", x: muzzle.x, y: muzzle.y, z: muzzle.z });
  return pr;
}

export function stepUnits(world) {
  const dt = world.dt, tNow = world.t;
  const b = world.byId.get(world.bisonId);
  const sc = world.scare, th = world.threat;
  for (const u of world.bodies) {
    if (u.kind !== "unit" || !u.alive) continue;
    // stay on your feet: living, grounded infantry holds upright kinematically
    // (no torque through the solver, so no friction-reaction anchoring them in place).
    // Knocked flat, they struggle up on a gentle spring; the dead ragdoll freely.
    if (u.grounded) u.gndT = tNow;
    // brief airborne grace: through terrain-contact flickers the servo still CLAMPS
    // runaway spin (so hops can't wind up into tumbles) but does NOT steer orientation
    // — kinematic uprighting mid-air slams landings in edge-first and eats sprint speed.
    const gGrace = !u.grounded && tNow - (u.gndT || -9) < 0.15;
    if ((u.grounded || gGrace) && !u.sleeping && tNow - (u.hitT || -9) > 0.7) {
      const uy = u.R[4];
      if (uy > 0.35) {
        // strictly reactive: settled units (tilt < ~5.7°, spin < 0.8 rad/s) are untouched,
        // so the idle world stays bit-identical and can sleep. When moving/tilting:
        // clamp runaway spin, and the nlerp below is the sole orientation authority.
        const spinning = u.w.x > 0.8 || u.w.x < -0.8 || u.w.z > 0.8 || u.w.z < -0.8;
        if (uy < 0.995 || spinning) {
        if (u.w.x > 4) u.w.x = 4; else if (u.w.x < -4) u.w.x = -4;
        if (u.w.z > 4) u.w.z = 4; else if (u.w.z < -4) u.w.z = -4;
        if (!gGrace && uy < 0.9999) {
          const yaw2 = Math.atan2(u.R[6], u.R[8]) * 0.5;
          const ty = Math.sin(yaw2), tw = Math.cos(yaw2);
          const a = Math.min(1, 14 * dt);
          const sgn = u.q.y * ty + u.q.w * tw < 0 ? -1 : 1;
          u.q.x += (0 - u.q.x) * a;
          u.q.y += (ty * sgn - u.q.y) * a;
          u.q.z += (0 - u.q.z) * a;
          u.q.w += (tw * sgn - u.q.w) * a;
          const L2 = Math.hypot(u.q.x, u.q.y, u.q.z, u.q.w) || 1;
          u.q.x /= L2; u.q.y /= L2; u.q.z /= L2; u.q.w /= L2;
        }
        }
      } else if (!gGrace) {
        u.w.x += -u.R[5] * 40 * dt;
        u.w.z += u.R[3] * 40 * dt;
        const dmp = Math.min(1, 8 * dt);
        u.w.x -= u.w.x * dmp; u.w.z -= u.w.z * dmp;
      }
    }
    // conscious infantry doesn't go over cliffs — not under leg power, not under crowd
    // pressure. A grounded, upright, un-hit unit moving at a true ledge (>~49° face one
    // stride ahead) plants at the lip. Blasts (vertical kick) and heavy hits still carry over.
    if (u.grounded && u.R[4] > 0.9 && tNow - (u.hitT || -9) > 0.7 && u.v.y < 1.5 && u.v.y > -1.5) {
      const sp2 = u.v.x * u.v.x + u.v.z * u.v.z;
      if (sp2 > 1.0) {
        const sI = 1 / Math.sqrt(sp2);
        const hL0 = world.field.heightAt(u.pos.x, u.pos.z);
        if (hL0 - world.field.heightAt(u.pos.x + u.v.x * sI, u.pos.z + u.v.z * sI) > 1.15) { u.v.x = 0; u.v.z = 0; }
      }
    }
    if (u.brave) continue;
    if (u.utype === "gren" && b && b.alive) {
      const gd = Math.hypot(b.pos.x - u.pos.x, b.pos.z - u.pos.z);
      if (gd < 26 && gd > 4 && tNow - (u.gT || -9) > 2.8) { u.gT = tNow + world.rng() * 0.5; grenFire(world, u, b); }
    }
    let fx = 0, fz = 0, scared = false;
    if (b && b.alive) {
      const dx = u.pos.x - b.pos.x, dz = u.pos.z - b.pos.z;
      const d = Math.hypot(dx, dz) || 1;
      const reach = 8 + Math.hypot(b.v.x, b.v.z) * 0.7;
      if (d < reach) { const w = 1 - d / reach; fx += (dx / d) * w * 2; fz += (dz / d) * w * 2; scared = true; }
    }
    if (sc && tNow - sc.t < 1.6) {
      const dx = u.pos.x - sc.x, dz = u.pos.z - sc.z;
      const d = Math.hypot(dx, dz) || 1;
      if (d < 12) { const w = 1 - d / 12; fx += (dx / d) * w * 1.5; fz += (dz / d) * w * 1.5; scared = true; }
    }
    if (th && tNow - th.t < 0.5) {
      const dx = u.pos.x - th.x, dz = u.pos.z - th.z;
      const d = Math.hypot(dx, dz) || 1;
      if (d < 6) { const w = 1 - d / 6; fx += (dx / d) * w; fz += (dz / d) * w; scared = true; }
    }
    // ordnance panic runs FOR stone: half the squad (even ids) breaks for the
    // nearest wall face that shadows the blast, and COMMITS to the sprint —
    // fear outlives the bang, or nobody would cross 12m on a 1.6s scare. The
    // rest scatter radially, so open-field fire still gets its kills. The tank
    // stays a radial threat: you sidestep a plow, you don't queue behind a wall
    // for it (and the deep-end herd still drowns).
    if ((u.seq & 1) === 0 && world.pg && world.pg.covers) {
      if (sc && tNow - sc.t < 1.6 && tNow > (u.coverT || 0)) {
        const sdx = u.pos.x - sc.x, sdz = u.pos.z - sc.z;
        if (sdx * sdx + sdz * sdz < 196) {
          let bx = 0, bz = 0, bs = 1e9, bin = null;
          for (const c of world.pg.covers) {
            const nx2 = -c.uz, nz2 = c.ux;
            const side = (c.x - sc.x) * nx2 + (c.z - sc.z) * nz2 >= 0 ? 1 : -1;
            const px = c.x + nx2 * side * (c.hw + 0.8), pz = c.z + nz2 * side * (c.hw + 0.8);
            const dd = (px - u.pos.x) ** 2 + (pz - u.pos.z) ** 2;
            if (dd < bs && dd < 256) { bs = dd; bx = px; bz = pz; bin = null; }
          }
          // four walls beat one: a house scores 0.7x its door distance, and a
          // man already indoors just gets down where he is
          if (world.pg.shelters) for (const sh of world.pg.shelters) {
            const ddIn = (sh.inside.x - u.pos.x) ** 2 + (sh.inside.z - u.pos.z) ** 2;
            if (ddIn < 4) { bs = 0; bx = sh.inside.x; bz = sh.inside.z; bin = null; break; }
            const dd = ((sh.door.x - u.pos.x) ** 2 + (sh.door.z - u.pos.z) ** 2) * 0.7;
            if (dd < bs && dd < 180) { bs = dd; bx = sh.door.x; bz = sh.door.z; bin = sh.inside; }
          }
          if (bs < 1e9) { u.coverT = tNow + 6; u.coverX = bx; u.coverZ = bz; u.coverIn = bin; }
        }
      }
      if (tNow < (u.coverT || 0) && u.R[4] > 0.7 && tNow - (u.hitT || -9) > 0.7) {
        // downed men don't sprint: the commit clock keeps ticking, legs resume upright
        let cdx = u.coverX - u.pos.x, cdz = u.coverZ - u.pos.z;
        let cd = Math.hypot(cdx, cdz);
        if (cd < 0.9 && u.coverIn) { u.coverX = u.coverIn.x; u.coverZ = u.coverIn.z; u.coverIn = null; cdx = u.coverX - u.pos.x; cdz = u.coverZ - u.pos.z; cd = Math.hypot(cdx, cdz); } // through the door
        if (cd < 0.7) { fx = 0; fz = 0; u.coverT = Math.min(u.coverT, tNow + 1.5); } // arrived: hold
        else { fx = (cdx / cd) * 1.8; fz = (cdz / cd) * 1.8; }
        scared = true;
      }
    }
    if (!scared && u.grounded && u.R[4] > 0.9 && tNow - (u.hitT || -9) > 0.7) {
      // legs brace: standing infantry doesn't toboggan down grades steeper than boot
      // friction (~25°+). Only the DOWNHILL velocity component is gripped, so cross-slope
      // walks and external pushes stay untouched; heavy hits (0.7s) and airborne moments
      // pass through whole. Settled v stays exactly 0, so the idle world sleeps bit-identical.
      const hb = world.field.heightAt(u.pos.x, u.pos.z);
      const gx = world.field.heightAt(u.pos.x + 0.4, u.pos.z) - hb;
      const gz = world.field.heightAt(u.pos.x, u.pos.z + 0.4) - hb;
      const g2 = gx * gx + gz * gz;
      if (g2 > 0.035) { // steeper than ~25°: grip the DOWNHILL component only, so
        // cross-slope walks and external pushes (the plowing tank) stay untouched
        const gI = 1 / Math.sqrt(g2), dxn = -gx * gI * 2.5, dzn = -gz * gI * 2.5;
        const vd = (u.v.x * dxn + u.v.z * dzn) * 0.4; // downhill speed (dir normalized above)
        if (vd > 0) {
          const cut = vd < 1.0 ? vd : vd * Math.min(1, 6 * dt); // must out-pull slope gravity, or fast arrivals never slow
          u.v.x -= dxn * 0.4 * cut; u.v.z -= dzn * 0.4 * cut;
        }
      } else {
        // on walkable ground, planted feet resist crowd pressure: an unscared trooper
        // is not a bowling pin for panicking squadmates — bulldozed drift bleeds off
        // instead of building into a crest-popping sprint.
        const sp2f = u.v.x * u.v.x + u.v.z * u.v.z;
        if (sp2f > 0.25) { // only real drift: firing recoil and settling shuffles pass free
          const dmpF = Math.min(1, 4.5 * dt);
          u.v.x -= u.v.x * dmpF; u.v.z -= u.v.z * dmpF;
        }
      }
      if (world.water) {
        // and legs never stroll into the pool: grounded momentum toward open water
        // dies at the lip whatever the fear state. Airborne bodies and fresh heavy
        // hits are exempt above, so the tank's plow-drown still works.
        const wz3 = world.water;
        const cx3 = Math.max(wz3.x0, Math.min(wz3.x1, u.pos.x));
        const cz3 = Math.max(wz3.z0, Math.min(wz3.z1, u.pos.z));
        const ox3 = u.pos.x - cx3, oz3 = u.pos.z - cz3;
        const od3 = Math.hypot(ox3, oz3);
        if (od3 > 0.001 && od3 < 2.6) {
          const vin = -(u.v.x * ox3 + u.v.z * oz3) / od3;
          if (vin > 0) { u.v.x += (ox3 / od3) * vin; u.v.z += (oz3 / od3) * vin; }
        }
      }
    }
    if (world.dbgUnit === u.id) (world.dbg || (world.dbg = [])).push({ t: +world.t.toFixed(2), scared, fx: +fx.toFixed(2), fz: +fz.toFixed(2), x: +u.pos.x.toFixed(2), y: +u.pos.y.toFixed(2), z: +u.pos.z.toFixed(2), uy: +u.R[4].toFixed(2), g: u.grounded ? 1 : 0, vx: +u.v.x.toFixed(2), vy: +u.v.y.toFixed(2), vz: +u.v.z.toFixed(2) });
    if (!scared) continue;
    // panicked, not suicidal: a strong shove away from open water when fleeing near the lip
    if (world.water) {
      const wz2 = world.water;
      const cxp = Math.max(wz2.x0, Math.min(wz2.x1, u.pos.x));
      const czp = Math.max(wz2.z0, Math.min(wz2.z1, u.pos.z));
      const ox = u.pos.x - cxp, oz = u.pos.z - czp;
      const od = Math.hypot(ox, oz);
      if (od > 0.001 && od < 2.6) {
        // legs never carry them into the water: cancel the pool-ward flee component
        // and bias slightly outward. External pushes (the tank) pass through untouched.
        const ind = -(fx * ox + fz * oz) / od;
        if (ind > 0) { fx += (ox / od) * ind; fz += (oz / od) * ind; }
        fx += (ox / od) * 0.6; fz += (oz / od) * 0.6;
      } else if (od <= 0.001) {
        // already wading inside the pool footprint: drive for the nearest bank.
        // True swimmers are ungrounded and never reach this blend, so the plow still drowns.
        const dx0 = u.pos.x - wz2.x0, dx1 = wz2.x1 - u.pos.x, dz0 = u.pos.z - wz2.z0, dz1 = wz2.z1 - u.pos.z;
        const m = Math.min(dx0, dx1, dz0, dz1);
        let ex = 0, ez = 0;
        if (m === dx0) ex = -1; else if (m === dx1) ex = 1; else if (m === dz0) ez = -1; else ez = 1;
        const ind = -(fx * ex + fz * ez);
        if (ind > 0) { fx += ex * ind; fz += ez * ind; }
        fx += ex * 2.5; fz += ez * 2.5;
      }
    }
    // eyes open while panicking: never sprint off a true ledge (>~49° face at a 1m stride).
    // Walkable hillsides pass; the pool basin lip and knoll cliffs deflect the run along
    // the edge — or brake on a promontory. External pushes still carry them over.
    {
      const Lg = Math.hypot(fx, fz);
      if (Lg > 0.001) {
        const ax = fx / Lg, az = fz / Lg;
        const h0 = world.field.heightAt(u.pos.x, u.pos.z);
        // bounds include the 8m ramp aprons: the dip below the waterline starts
        // BEFORE the pool rect, and a man flagged only at the rect edge arrives
        // with downhill momentum steering can no longer spend. Flag him at the
        // shoulder, where there is still dry ground to stop on.
        const wetAt = (px2, pz2) => px2 > POOL.x0 - 8 && px2 < POOL.x1 + 8 && pz2 > POOL.z0 - 8 && pz2 < POOL.z1 + 8 && world.field.heightAt(px2, pz2) < POOL.level - 0.15;
        const wetHere = wetAt(u.pos.x, u.pos.z);
        // ledge at arm's length; water at sprint range. A man plans his escape
        // LINE — past a crest lip he's airborne and past steering, so the wet
        // check rays out 2.5/5/8m and rotates him to a dry tangent before he
        // ever lines up on the pond. Frozen (or cracked) ice he'll happily run
        // onto; a man already in the water is past advice.
        const hazard = (dx3, dz3) => {
          if (h0 - world.field.heightAt(u.pos.x + dx3, u.pos.z + dz3) > 1.15) return true; // true ledge
          if (wetHere) return false; // already in the water: past advice
          // DIVERGENCE from the frozen demo (#6b): a frozen sheet is walkable
          // but the bowl's wet ring BEYOND the sheet still drowns — the demo
          // switched the whole scan off under world.ice, marching panicked
          // crews straight off the lip. Points inside the pool rect count as
          // sheet; the ring outside it stays flagged.
          const wetOff = (px2, pz2) => (world.ice && px2 > POOL.x0 && px2 < POOL.x1 && pz2 > POOL.z0 && pz2 < POOL.z1) ? false : wetAt(px2, pz2);
          return wetOff(u.pos.x + dx3 * 2.5, u.pos.z + dz3 * 2.5) || wetOff(u.pos.x + dx3 * 5, u.pos.z + dz3 * 5) || wetOff(u.pos.x + dx3 * 8, u.pos.z + dz3 * 8);
        };
        if (hazard(ax, az)) {
          const keep = fx * -az + fz * ax >= 0 ? 1 : -1;
          const ex = -az * keep, ez = ax * keep;
          if (hazard(ex, ez)) { fx = 0; fz = 0; }
          else { fx = ex * Lg; fz = ez * Lg; }
        }
      }
    }
    wake(u);
    if (!u.grounded) continue;
    const L = Math.hypot(fx, fz) || 1;
    const tx = (fx / L) * 2.5, tz = (fz / L) * 2.5;
    u.v.x += (tx - u.v.x) * Math.min(1, 6 * dt);
    u.v.z += (tz - u.v.z) * Math.min(1, 6 * dt);
  }
}

export const ICE_SHOCK = 1.3e5;  // single-step fracture: shells 234k, mortars 483k; stampede spike 73k stays safe
export const ICE_CREEP = 1.2e4;  // sustained load: driving tank holds >12k for 1.6s; stampede only 17ms
export const ICE_CREEP_T = 0.4;  // seconds above creep before fracture
export const ICE_BREAK_F = 1e9;  // legacy force fuse unused for ice (shock/creep rule applies)
export function freezePool(world) {
  thawPool(world);
  // 8x8: 2m, 85kg shards. Buoyancy is a float-line spring (g*(sub/0.82)), so
  // the LATTICE is the raft — a man only drops when his own shard is fully
  // severed, and then only if he out-loads it: max buoyant reserve is 2.15
  // m/s^2, a man on 85kg adds 9.5. The 150kg shards shrugged him off.
  const N = 8, plate = (POOL.x1 - POOL.x0) / N;
  // 3cm seams (the masonry joint convention): welded neighbors skip contacts
  // anyway, so the gap only serves BROKEN shards — and the old 10cm seams let
  // a 26cm-wide man wedge through under load-flex and tread water inside an
  // intact sheet.
  const phx = plate / 2 - 0.015, phz = plate / 2 - 0.015, phy = 0.09;
  const grid = [], ws = [];
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const x = POOL.x0 + (i + 0.5) * plate, z = POOL.z0 + (j + 0.5) * plate;
    const pl = addBody(world, { kind: "ice", team: 0, group: "ice", mass: 85, hx: phx, hy: phy, hz: phz, x, z, y: POOL.level - 0.058, hp: 1e9, friction: 0.16 });
    grid.push(pl);
  }
  const at = (i, j) => grid[i * N + j];
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    if (i + 1 < N) ws.push(addWeld(world, at(i, j), at(i + 1, j), ICE_BREAK_F));
    if (j + 1 < N) ws.push(addWeld(world, at(i, j), at(i, j + 1), ICE_BREAK_F));
  }
  const anchor = (x, z) => {
    const a = addBody(world, { kind: "anchor", team: 0, group: "iceanchor", mass: 1e6, hx: 0.25, hy: 0.25, hz: 0.25, x, z, y: POOL.level - 0.058, hp: 1e9, friction: 1 });
    a.pinned = true;
    return a;
  };
  for (let k = 0; k < N; k++) {
    ws.push(addWeld(world, at(k, 0), anchor(POOL.x0 + (k + 0.5) * plate, POOL.z0 - 1.2), ICE_BREAK_F * 1.4));
    ws.push(addWeld(world, at(k, N - 1), anchor(POOL.x0 + (k + 0.5) * plate, POOL.z1 + 1.2), ICE_BREAK_F * 1.4));
    ws.push(addWeld(world, at(0, k), anchor(POOL.x0 - 1.2, POOL.z0 + (k + 0.5) * plate), ICE_BREAK_F * 1.4));
    ws.push(addWeld(world, at(N - 1, k), anchor(POOL.x1 + 1.2, POOL.z0 + (k + 0.5) * plate), ICE_BREAK_F * 1.4));
  }
  world.iceFractureOn = true;
  world.ice = { plates: grid, welds: ws };
  return world.ice;
}
function stepIceGrind(world) {
  if (!world.ice) return;
  const b = world.byId.get(world.bisonId);
  if (!b || !b.alive) return;
  const speed = Math.hypot(b.v.x, b.v.z);
  for (let i = world.ice.plates.length - 1; i >= 0; i--) {
    const pl = world.ice.plates[i];
    if (!world.byId.has(pl.id)) { world.ice.plates.splice(i, 1); continue; }
    let welded = false;
    const wl = world.weldsOf && world.weldsOf.get(pl.id);
    if (wl) for (const wd of wl) { if (!wd.broken) { welded = true; break; } }
    if (welded) { pl.grind = 0; continue; }
    const d = Math.hypot(pl.pos.x - b.pos.x, pl.pos.z - b.pos.z);
    const grinding = speed > 0.8 || (b.ctl && Math.abs(b.ctl.throttle || 0) > 0.4);
    if (d < 3.4 && grinding) pl.grind = (pl.grind || 0) + world.dt;
    else pl.grind = Math.max(0, (pl.grind || 0) - world.dt * 0.5);
    if (pl.grind > 1.2) {
      // the treads chew it apart: two half-floes that disperse and sink lower
      const ax = pl.R[0], az = pl.R[2];
      for (const sgn of [-1, 1]) {
        const c = addBody(world, { kind: "chunk", team: 0, group: "icechunk", mass: 120, hx: 0.85, hy: 0.09, hz: 0.85, x: pl.pos.x + ax * 0.95 * sgn, z: pl.pos.z + az * 0.95 * sgn, y: pl.pos.y, hp: 1e9, friction: 0.14 });
        c.v.x = pl.v.x + ax * 0.5 * sgn; c.v.z = pl.v.z + az * 0.5 * sgn; c.v.y = pl.v.y;
      }
      world.events.push({ type: "weldbreak", x: pl.pos.x, y: pl.pos.y, z: pl.pos.z, ice: true });
      world.byId.delete(pl.id);
      const bi = world.bodies.indexOf(pl);
      if (bi >= 0) world.bodies.splice(bi, 1);
      world.ice.plates.splice(i, 1);
    }
  }
}
export function thawPool(world) {
  const gone = new Set();
  for (let i = world.bodies.length - 1; i >= 0; i--) {
    const b = world.bodies[i];
    if (b.group === "ice" || b.group === "iceanchor") { gone.add(b.id); world.byId.delete(b.id); world.bodies.splice(i, 1); }
  }
  if (gone.size) {
    world.welds = world.welds.filter((w) => !gone.has(w.a.id) && !gone.has(w.b.id));
    if (world.weldsOf) for (const id of gone) world.weldsOf.delete(id);
    world._weldPairsDirty = true;
  }
  world.ice = null;
}

export function snapAim(world, x, z, r = 1.5) {
  let best = null, bd = r * r;
  for (const b of world.bodies) {
    if (!b.alive || b.team !== 2) continue;
    if (b.kind !== "unit" && b.kind !== "scout") continue;
    const dx = b.pos.x - x, dz = b.pos.z - z, d = dx * dx + dz * dz;
    if (d < bd) { bd = d; best = b; }
  }
  return best ? { x: best.pos.x, z: best.pos.z, hit: true } : { x, z, hit: false };
}

export function recoverBison(world) {
  const b = world.byId.get(world.bisonId);
  if (!b || b.R[4] > 0.5) return false;
  wake(b);
  // DIVERGENCE from the frozen demo (fixed 6.2 rad/s about hull-forward):
  // - the roll runs about the TRUE righting axis (hull-up x world-up), so a
  //   nose-vertical wedge — where the forward axis has no horizontal part
  //   and the old press was a silent no-op — still gets a real roll;
  // - magnitude scales with the remaining angle so a press from a partial
  //   tilt can't overshoot back past inverted;
  // - a submerged hull gets a taller hop (the pool's vertical drag eats
  //   airtime the roll needs);
  // - presses that aren't improving the pose escalate: taller hop plus a
  //   lateral shove walks the hull out from under rubble pinning it.
  const need = Math.acos(Math.max(-1, Math.min(1, b.R[4])));
  let ax = -b.R[5], az = b.R[3]; // up x worldUp
  const al = Math.hypot(ax, az);
  if (al > 0.2) { ax /= al; az /= al; }
  else { // flat turtle: axis degenerate, fall back to horizontal forward
    const fl = Math.hypot(b.R[6], b.R[8]) || 1;
    ax = b.R[6] / fl; az = b.R[8] / fl;
  }
  const stuck = b.recoverT != null && world.t - b.recoverT < 5 && b.R[4] < (b.recoverR4 != null ? b.recoverR4 : -2) + 0.15;
  b.recoverN = stuck ? Math.min(3, (b.recoverN || 0) + 1) : 0;
  const esc = b.recoverN;
  const mag = (0.4 + 1.24 * need) * (1 + 0.18 * esc);
  b.w.x = ax * mag; b.w.y = 0; b.w.z = az * mag;
  const wz = world.water;
  const wet = wz && b.pos.x > wz.x0 && b.pos.x < wz.x1 && b.pos.z > wz.z0 && b.pos.z < wz.z1 && b.pos.y - b.hy < wz.level;
  b.v.y = Math.max(b.v.y, (wet ? 5.2 : 3.8) + esc * 0.8);
  if (esc) {
    const ll = Math.hypot(b.R[3], b.R[5]);
    const lx = ll > 0.2 ? b.R[3] / ll : b.R[6], lz = ll > 0.2 ? b.R[5] / ll : b.R[8];
    b.v.x += lx * 0.9 * esc; b.v.z += lz * 0.9 * esc;
  }
  b.recoverR4 = b.R[4];
  b.recoverT = world.t; // opens the suspension servo's recover window
  return true;
}

// ------------------------------------------------------------------ solver
const _scratchOut = new Array(8);
const _bpMerged = [];
function collectContacts(world) {
  const bodies = world.bodies, contacts = world.contacts;
  contacts.length = 0;
  // broadphase: uniform grid over XZ, TWO TIERS (T6, mk1.05). Sleeping and
  // zero-mass bodies file ONCE (stat, sorted by birth order) and stay on the
  // books until they wake or die; moving bodies re-file each step (dyn,
  // epoch-stamped). The pair walk merges the tiers back into birth order,
  // so the solver meets the identical contact sequence the one-tier grid
  // produced — byte-identical physics, proven by golden and the T6 keystone.
  const cell = 6.0;
  if (!world._bp) { world._bp = new Map(); world._bpEpoch = 0; }
  const grid = world._bp, epoch = ++world._bpEpoch;
  for (let i = 0; i < bodies.length; i++) {
    const b = bodies[i];
    if (b.pinned) continue;
    if (b.kind === "unit" && !b.alive && world.t - (b.deadT || 0) > 4) continue;
    const still = b.sleeping || b.invM === 0;
    if (still && b._filed) continue; // T6: the sleeping stone is already on the books
    if (!still && b._filed) unfileBody(world, b); // woke since it was filed
    const r = Math.max(b.hx, b.hy, b.hz);
    const x0 = Math.floor((b.pos.x - r) / cell), x1 = Math.floor((b.pos.x + r) / cell);
    const z0 = Math.floor((b.pos.z - r) / cell), z1 = Math.floor((b.pos.z + r) / cell);
    if (still) b._cells = [];
    for (let gx = x0; gx <= x1; gx++) for (let gz = z0; gz <= z1; gz++) {
      const key = gx * 73856093 ^ gz * 19349663;
      let c = grid.get(key);
      if (!c) { c = { stat: [], dyn: [], epoch: 0 }; grid.set(key, c); }
      if (still) {
        let k = c.stat.length; // sorted insert by seq — the merge replays body-array order
        while (k > 0 && c.stat[k - 1].seq > b.seq) k--;
        c.stat.splice(k, 0, b);
        b._cells.push(key);
      } else {
        if (c.epoch !== epoch) { c.dyn.length = 0; c.epoch = epoch; }
        c.dyn.push(b);
      }
    }
    if (still) b._filed = true;
  }
  // welded-pair exclusion set: static between weld changes, cached (rebuilding
  // from 1600 welds at 120Hz was pure per-step garbage)
  if (!world._weldPairs || world._weldPairsDirty) {
    world._weldPairs = new Set();
    for (const w of world.welds) if (!w.broken) world._weldPairs.add(w.a.id < w.b.id ? w.a.id * 100000 + w.b.id : w.b.id * 100000 + w.a.id);
    world._weldPairsDirty = false;
  }
  const weldPairs = world._weldPairs;
  // DIVERGENCE (guarded, mk0.98): INFANTRY CAN'T KNOCK MASONRY OVER. Under
  // depotCombat a sleeping chunk that still holds a live weld ignores
  // contact-wake from bodies under 200kg — men lean on a building and it
  // stands. Blasts wake unconditionally (explode's path, untouched);
  // breakers/tanks (mass >= 200) still wake and ram; severed rubble (no
  // live weld) still kicks around underfoot. No flag, no change: the
  // frozen demo path is byte-identical (golden proves it).
  const weldedAsleep = (s) => {
    const wl = world.weldsOf && world.weldsOf.get(s.id);
    if (wl) for (const wd of wl) if (!wd.broken) return true;
    return false;
  };
  const wakeExempt = (s, mover) =>
    world.depotCombat && s.kind === "chunk" && mover.mass < 200 && weldedAsleep(s);
  const seen = new Set();
  const merged = _bpMerged;
  for (const c of grid.values()) {
    const dyn = c.epoch === epoch ? c.dyn : null;
    if (!dyn || !dyn.length) continue; // a cell of only sleeping stone does no work at all
    const stat = c.stat;
    merged.length = 0;
    let si = 0, di = 0;
    while (si < stat.length || di < dyn.length) {
      let pick;
      if (di >= dyn.length || (si < stat.length && stat[si].seq < dyn[di].seq)) {
        pick = stat[si++];
        // lazy ghost pruning: the game layer removes bodies with no hook here
        if (world.byId.get(pick.id) !== pick) { si--; stat.splice(si, 1); continue; }
        // the corpse rule, same as the filing pass above
        if (pick.kind === "unit" && !pick.alive && world.t - (pick.deadT || 0) > 4) continue;
      } else pick = dyn[di++];
      merged.push(pick);
    }
    if (merged.length < 2) continue;
    for (let i = 0; i < merged.length; i++) for (let j = i + 1; j < merged.length; j++) {
      let a = merged[i], b = merged[j];
      // both on the books = both sleeping and/or both zero-mass: the old walk
      // skipped both-sleeping and both-zero-mass below; the mixed case wrote
      // nothing to anything — dropped, the one stated (inert) delta.
      if (a._filed && b._filed) continue;
      if (a.sleeping && b.sleeping) continue;
      if (a.invM === 0 && b.invM === 0) continue;
      if (a.kind === "anchor" || b.kind === "anchor") continue; // rim pins are pure weld posts — the tank drives THROUGH the shore line, it doesn't park on it
      if (a.id > b.id) { const t = a; a = b; b = t; }
      const pk = a.id * 100000 + b.id;
      if (seen.has(pk)) continue; seen.add(pk);
      if (weldPairs.has(pk)) continue;
      if (world._mechPairs && world._mechPairs.has(pk)) continue; // DIVERGENCE from the frozen demo: hinge-jointed mech links don't self-collide (set empty without mechs; see src/engine/mech.js)
      if (a.kind === "unit" && !a.alive && b.kind === "unit" && !b.alive) continue;
      // AABB reject
      const ra = Math.sqrt(a.hx * a.hx + a.hy * a.hy + a.hz * a.hz);
      const rb = Math.sqrt(b.hx * b.hx + b.hy * b.hy + b.hz * b.hz);
      const dx = a.pos.x - b.pos.x, dy = a.pos.y - b.pos.y, dz = a.pos.z - b.pos.z;
      if (dx * dx + dy * dy + dz * dz > (ra + rb) * (ra + rb)) continue;
      const n = satBoxBox(a, b, _scratchOut);
      for (let k = 0; k < n; k++) {
        const c = _scratchOut[k];
        contacts.push({ a, b, p: c.p, n: c.n, depth: c.depth, fid: c.fid, pn: 0, pt1: 0, pt2: 0 });
        // DIVERGENCE from the frozen demo (#6a): standing ON another body
        // grounds you. The demo set grounded from terrain contact only, so
        // units could never walk on the ice sheet (or any bridge) — they
        // stood on plates flagged airborne, deaf to every panic impulse.
        // A vertical-normal contact grounds the upper body; the flag
        // self-clears at the grounded commit. Locked by righting-test.
        if (c.n.y > 0.4 || c.n.y < -0.4) (a.pos.y > b.pos.y ? a : b).bodyGroundedNow = true;
      }
      if (n > 0) {
        // parked wrecks ignore infantry brushes: only the blade (vehicle mass) or a
        // blast (explode wakes unconditionally) sets the bowling lane in motion.
        if (a.sleeping && V.len2(b.v) > 0.6 && !(a.kind === "wreck" && b.mass < 200) && !wakeExempt(a, b)) { if (a.kind === "chunk") wake(a); else wakeIsland(world, a); }
        if (b.sleeping && V.len2(a.v) > 0.6 && !(b.kind === "wreck" && a.mass < 200) && !wakeExempt(b, a)) { if (b.kind === "chunk") wake(b); else wakeIsland(world, b); }
        // player shove tagging
        const bis = world.bisonId;
        if (a.id === bis && (b.kind === "wreck" || b.kind === "chunk")) { b.lastPlayerTouch = world.t; b.lastImp = { src: "shove", attacker: "player", t: world.t, volley: 0 }; }
        if (b.id === bis && (a.kind === "wreck" || a.kind === "chunk")) { a.lastPlayerTouch = world.t; a.lastImp = { src: "shove", attacker: "player", t: world.t, volley: 0 }; }
      }
    }
  }
  // terrain
  for (const b of bodies) {
    if (b.invM === 0 || b.sleeping) continue;
    if (b.kind === "unit" && !b.alive && world.t - (b.deadT || 0) > 4) continue;
    b.groundedNow = false;
    terrainContacts(world.field, b, (bb, _null, c) => {
      contacts.push({ a: bb, b: null, p: c.p, n: c.n, depth: c.depth, fid: c.fid, pn: 0, pt1: 0, pt2: 0 });
      if (c.n.y < -0.4) bb.groundedNow = true;
    });
  }
}
const _pcRaxn = v3(), _pcTmp = v3(), _pcT2 = v3();
function prepContacts(world) {
  const dt = world.dt;
  for (const c of world.contacts) {
    const a = c.a, b = c.b;
    if (world.mechs) c.mech = (a.mechRef || (b && b.mechRef)) ? 1 : 0; // DIVERGENCE: mech-owned contacts solve in the fixed-iteration island, not the LOD-tiered pass
    c.rA = v3(); V.sub(c.rA, c.p, a.pos);
    if (b) { c.rB = v3(); V.sub(c.rB, c.p, b.pos); }
    const n = c.n;
    // kn (scratch hoisted — this was the last per-step v3() churn in a hot loop)
    let kn = a.invM + (b ? b.invM : 0);
    const raxn = _pcRaxn; V.cross(raxn, c.rA, n);
    const tmp = _pcTmp; iMulVec(a.invIw, raxn, tmp);
    const t2v = _pcT2; V.cross(t2v, tmp, c.rA);
    kn += V.dot(t2v, n);
    if (b) {
      const rbxn = v3(); V.cross(rbxn, c.rB, n);
      iMulVec(b.invIw, rbxn, tmp);
      V.cross(t2v, tmp, c.rB);
      kn += V.dot(t2v, n);
    }
    c.invKn = 1 / Math.max(1e-9, kn);
    // tangents
    const t1 = v3();
    if (Math.abs(n.x) > 0.6) V.set(t1, n.y, -n.x, 0); else V.set(t1, 0, n.z, -n.y);
    V.norm(t1, t1);
    const tB = v3(); V.cross(tB, n, t1);
    c.t1 = t1; c.t2 = tB;
    const kt = (tv) => {
      let k = a.invM + (b ? b.invM : 0);
      V.cross(raxn, c.rA, tv); iMulVec(a.invIw, raxn, tmp); V.cross(t2v, tmp, c.rA); k += V.dot(t2v, tv);
      if (b) { V.cross(raxn, c.rB, tv); iMulVec(b.invIw, raxn, tmp); V.cross(t2v, tmp, c.rB); k += V.dot(t2v, tv); }
      return 1 / Math.max(1e-9, k);
    };
    c.invKt1 = kt(t1); c.invKt2 = kt(tB);
    c.mu = b ? Math.sqrt(a.friction * b.friction) : Math.sqrt(a.friction * 0.9);
    if (!b && a.kind === "vehicle" && a.ctl && Math.abs(a.ctl.throttle) > 0.05) c.mu = 0.06;
    // bias + restitution
    const vRel = relVelAt(c);
    const vn = V.dot(vRel, n);
    const e = b ? Math.min(a.restitution, b.restitution) : a.restitution;
    c.bounce = vn < -1.6 ? -e * vn : 0;
    c.bias = (0.18 / dt) * Math.max(0, c.depth - 0.008);
    if (c.bias > 5) c.bias = 5;
    // warm start
    const key = a.id * 262144 + (b ? b.id : 0) * 64 + (c.fid & 63);
    c.key = key;
    const old = world.warm.get(key);
    if (old) {
      c.pn = old.pn; c.pt1 = old.pt1; c.pt2 = old.pt2;
      applyImpulse(c, V.scale(v3(), n, c.pn));
      applyImpulse(c, V.scale(v3(), c.t1, c.pt1));
      applyImpulse(c, V.scale(v3(), c.t2, c.pt2));
    }
  }
}
function relVelAt(c) {
  const a = c.a, b = c.b;
  const va = v3(); V.cross(va, a.w, c.rA); V.add(va, va, a.v);
  if (!b) return V.scale(v3(), va, -1);
  const vb = v3(); V.cross(vb, b.w, c.rB); V.add(vb, vb, b.v);
  return V.sub(v3(), vb, va);
}
function applyImpulse(c, J) {
  const a = c.a, b = c.b;
  if (!a.sleeping) {
    V.addScaled(a.v, a.v, J, -a.invM);
    const L = v3(); V.cross(L, c.rA, J);
    const dw = v3(); iMulVec(a.invIw, L, dw);
    V.addScaled(a.w, a.w, dw, -1);
  }
  if (b && !b.sleeping) {
    const L = v3(), dw = v3();
    V.addScaled(b.v, b.v, J, b.invM);
    V.cross(L, c.rB, J); iMulVec(b.invIw, L, dw);
    V.addScaled(b.w, b.w, dw, 1);
  }
}
function solveContacts(world) {
  for (const c of world.contacts) {
    if (c.mech) continue; // DIVERGENCE: solved in the mech island (never set without mechs)
    if (c.a.sleeping && (!c.b || c.b.sleeping)) continue;
    const n = c.n;
    let vRel = relVelAt(c);
    const vn = V.dot(vRel, n);
    let dPn = -(vn - c.bias - c.bounce) * c.invKn;
    const pn0 = c.pn;
    c.pn = Math.max(0, c.pn + dPn);
    dPn = c.pn - pn0;
    applyImpulse(c, V.scale(v3(), n, dPn));
    // friction
    vRel = relVelAt(c);
    const maxF = c.mu * c.pn;
    let vt = V.dot(vRel, c.t1);
    let dPt = -vt * c.invKt1;
    const pt0 = c.pt1;
    c.pt1 = Math.max(-maxF, Math.min(maxF, c.pt1 + dPt));
    applyImpulse(c, V.scale(v3(), c.t1, c.pt1 - pt0));
    vRel = relVelAt(c);
    vt = V.dot(vRel, c.t2);
    dPt = -vt * c.invKt2;
    const pt20 = c.pt2;
    c.pt2 = Math.max(-maxF, Math.min(maxF, c.pt2 + dPt));
    applyImpulse(c, V.scale(v3(), c.t2, c.pt2 - pt20));
  }
}
const _sw1 = v3(), _sw2 = v3(), _swAx = [v3(1, 0, 0), v3(0, 1, 0), v3(0, 0, 1)], _swJ = v3(), _swC = v3(), _swRA = v3(), _swRB = v3(), _swPA = v3(), _swPB = v3();
function solveWelds(world, active) {
  // scratch vectors hoisted: the per-weld-per-iteration v3() churn fed the GC
  // pauses that showed up as load-independent 60ms step spikes
  const dt = world.dt;
  for (const w of active) {
    const a = w.a, b = w.b;
    // a sleeping member is a STATIC anchor (zero inv-mass, no velocity writes):
    // an awake body hanging on a dozing one binds to it rigidly instead of
    // free-falling until the wake ripple arrives — and a slab whose ring nods
    // off converges to stillness on the frozen anchors and finally sleeps too
    const aS = a.sleeping ? 0 : 1, bS = b.sleeping ? 0 : 1;
    const rA = rMulVec(a.R, w.rA, _swRA);
    const rB = rMulVec(b.R, w.rB, _swRB);
    const pa = V.add(_swPA, a.pos, rA), pb = V.add(_swPB, b.pos, rB);
    const C = V.sub(_swC, pb, pa);
    // 3 linear axes
    const axes = _swAx;
    for (let ai = 0; ai < 3; ai++) {
      const ax = axes[ai];
      V.cross(_sw1, a.w, rA); V.add(_sw1, _sw1, a.v);
      V.cross(_sw2, b.w, rB); V.add(_sw2, _sw2, b.v);
      V.sub(_sw2, _sw2, _sw1);
      const vRel = V.dot(_sw2, ax);
      let k = a.invM * aS + b.invM * bS;
      const t1 = _sw1, t2 = _sw2;
      if (aS) { V.cross(t1, rA, ax); iMulVec(a.invIw, t1, t2); V.cross(t1, t2, rA); k += V.dot(t1, ax); }
      if (bS) { V.cross(t1, rB, ax); iMulVec(b.invIw, t1, t2); V.cross(t1, t2, rB); k += V.dot(t1, ax); }
      // 6mm deadband: inside slop, no position correction — Baumgarte hunting
      // around C=0 kept heavy weldments (the hangar roof slab) in a permanent
      // limit cycle that wakeIsland re-synced, so nothing ever slept again
      const cAx = V.dot(C, ax);
      const cSl = Math.abs(cAx) < 0.006 ? 0 : cAx - Math.sign(cAx) * 0.006;
      const bias = Math.max(-1.5, Math.min(1.5, (0.12 / dt) * cSl));
      const P = -(vRel + bias) / Math.max(1e-9, k);
      w.acc[ai] += P;
      const J = V.scale(_swJ, ax, P);
      if (aS) { V.addScaled(a.v, a.v, J, -a.invM); V.cross(t1, rA, J); iMulVec(a.invIw, t1, t2); V.addScaled(a.w, a.w, t2, -1); }
      if (bS) { V.addScaled(b.v, b.v, J, b.invM); V.cross(t1, rB, J); iMulVec(b.invIw, t1, t2); V.addScaled(b.w, b.w, t2, 1); }
    }
    // angular lock (diagonal approx)
    const wr = V.sub(_sw1, b.w, a.w);
    for (let i = 0; i < 3; i++) {
      const key = i === 0 ? "x" : i === 1 ? "y" : "z";
      const ka = a.invIw[i * 3 + i] * aS + b.invIw[i * 3 + i] * bS;
      if (ka < 1e-9) continue;
      const L = -wr[key] / ka;
      if (aS) a.w[key] -= L * a.invIw[i * 3 + i];
      if (bS) b.w[key] += L * b.invIw[i * 3 + i];
    }
  }
}
export function weldStressDecay(world) {
  for (const w of world.welds) w.stress = 0;
}
function weldBreakPass(world) {
  const dt = world.dt;
  for (const w of world.welds) {
    if (w.broken) continue;
    if (world.t - w.born < 0.5) { w.acc[0] = 0; w.acc[1] = 0; w.acc[2] = 0; continue; }
    const f = Math.hypot(w.acc[0], w.acc[1], w.acc[2]) / dt;
    if (f > (w.stress || 0)) w.stress = f; // peak-hold within the step (two passes run per step)
    const isIce = w.a.kind === "ice" || w.b.kind === "ice";
    if (isIce) {
      if (f > (world.iceStressPeak || 0)) world.iceStressPeak = f;
      // creep clock decays rather than zeroing (chatter still accumulates), and a
      // hull bearing on either plate feeds fatigue directly — a static wedge resolves
      // at the contact and starves the welds, but the seams still work open under it.
      const grind = (w.a.grindT && world.t - w.a.grindT < 0.1) || (w.b.grindT && world.t - w.b.grindT < 0.1);
      w.hiT = (f > ICE_CREEP || grind) ? (w.hiT || 0) + dt : Math.max(0, (w.hiT || 0) - 2 * dt);
      if (w.hiT > (world.iceHiTPeak || 0)) world.iceHiTPeak = w.hiT;
      if (world.iceFractureOn && (f > ICE_SHOCK || w.hiT > ICE_CREEP_T)) {
        w.broken = true; world._weldPairsDirty = true;
        const pi = V.add(v3(), w.a.pos, rMulVec(w.a.R, w.rA, v3()));
        world.events.push({ type: "weldbreak", x: pi.x, y: pi.y, z: pi.z, ice: true });
        continue;
      }
    }
    w.acc[0] = 0; w.acc[1] = 0; w.acc[2] = 0;
    if (f > w.breakF) {
      w.broken = true; world._weldPairsDirty = true;
      const pa = V.add(v3(), w.a.pos, rMulVec(w.a.R, w.rA, v3()));
      world.events.push({ type: "weldbreak", x: pa.x, y: pa.y, z: pa.z, ice: w.a.kind === "ice" || w.b.kind === "ice" });
      for (const cb of [w.a, w.b]) {
        if (cb.kind === "chunk") { cb.fallingSince = world.t; wake(cb); }
      }
    }
  }
}

// ------------------------------------------------------- post classification
function classifyImpacts(world) {
  // aggregate impulse per (victim, other) pair — multi-point manifolds share one Δv
  const agg = new Map();
  for (const c of world.contacts) {
    if (c.pn <= 0) continue;
    const pairs = c.b ? [[c.a, c.b], [c.b, c.a]] : [[c.a, null]];
    for (const [victim, other] of pairs) {
      if (!victim.alive) continue;
      if (victim.kind !== "unit" && victim.kind !== "vehicle") continue;
      const key = victim.id * 1000000 + (other ? other.id : 0);
      let rec = agg.get(key);
      if (!rec) { rec = { victim, other, pn: 0 }; agg.set(key, rec); }
      rec.pn += c.pn;
    }
  }
  const best = new Map(); // victimId -> {dmg, info}
  for (const { victim, other, pn } of agg.values()) {
    const dv = pn * victim.invM;
    // DIVERGENCE (guarded, mk1.11 — the owner's ruling): A SLEEPING STONE IS
    // NOT A WEAPON. Under depotCombat, a chunk that is ASLEEP — a standing
    // wall face, settled rubble — can neither slam a living man dead (the
    // depenetration ejection read as lethal IMPACT below) nor count as
    // burying him. It has no motion to kill with. Everything that moves is
    // untouched: falling stone's clock (fallingSince) is cleared the moment
    // a chunk sleeps, and a stone genuinely BEARING on a man is kept awake
    // by the burial line itself — a pinning pile is never asleep.
    const inertStone = world.depotCombat && other && other.kind === "chunk" && other.sleeping && victim.kind === "unit";
    if (victim.kind === "unit" && other && other.mass > 200 && dv > 1.2) victim.hitT = world.t; // staggered by vehicles/heavy debris; squadmate shoulder-checks don't floor you
    if (victim.kind === "unit" && other && other.kind === "chunk" && other.fallingSince > 0 && world.t - other.fallingSince < 6 && dv > 0.8) victim.hitT = world.t; // flying masonry floors you at any weight
    if (victim.kind === "unit" && other && (other.kind === "vehicle" || other.kind === "mechfoot") && other.pos.y > victim.pos.y + 0.2 && pn > 60) {
      // a tank bearing down from above is not a wrestling match: instant CRUSH —
      // (a mech foot doubly so — DIVERGENCE, guarded: no mechfoot in the demo)
      if (victim.alive) applyDamage(world, victim, 1e6, { cause: CAUSE.CRUSH, attacker: other.kind === "mechfoot" ? (other.mechRef && other.mechRef.team === 2 ? "enemy" : "player") : other.id === world.bisonId ? "player" : "world" });
      // — and the hull grinds the body into the snow rather than beaching on it:
      // fast-forward the corpse's de-solidify clock so the tank settles in ~0.3s
      victim.deadT = Math.min(victim.deadT || world.t, world.t - 3.7);
    }
    if (victim.kind === "unit" && other && other.kind === "chunk" && pn > 5 && !inertStone &&
        (victim.R[4] < 0.6 ? other.pos.y > victim.pos.y + 0.2 : other.pos.y > victim.pos.y + victim.hy * 0.55)) {
      victim.buriedNow = true; victim.buriedBy = other.group; // downed: anything on top pins; standing: only head-zone loads count (a shoulder-lean is not a grave)
      other.sleepT = 0; // a stone doesn't doze off on a living man — the pin, and its contacts, persist
    }
    let dmg = 0, info = null;
    if (!other) {
      const thr = victim.kind === "unit" ? 6.5 : 11;
      const dvEff = Math.max(dv, victim.airT > 0.22 ? Math.max(0, -(victim.vy0 || 0)) : 0);
      if (victim.airT > 0.22 && dvEff > thr) {
        dmg = (dvEff - thr) * (victim.kind === "unit" ? 14 : 22);
        info = { cause: CAUSE.IMPACT, attacker: "world" };
      }
    } else if (other.kind === "chunk" && other.fallingSince > 0 && world.t - other.fallingSince < 6 && dv > 2.2) {
      // gate tracks the masonry: 100kg stones deliver ~0.68x the victim-dv the old
      // 340kg blocks did at the same drop, so the lethal line moves with them (3.2 -> 2.2)
      dmg = dv * 20;
      info = { cause: CAUSE.COLLAPSE, attacker: (other.lastImp && other.lastImp.attacker) || "world", killerId: other.id, buildingId: other.group };
    } else if ((other.kind === "vehicle" || other.kind === "wreck" || other.mechRef) && V.len(other.v) > 2.0 && dv > 2.6 && victim.kind === "unit") {
      const att = other.driver === "player" ? "player"
        : other.mechRef ? (other.mechRef.team === 2 ? "enemy" : "player")
        : world.t - other.lastPlayerTouch < 3.5 ? "player" : "world";
      dmg = dv * 18;
      info = { cause: CAUSE.CRUSH, attacker: att, killerId: other.id };
    } else if (dv > (other && other.kind === "ice" ? 24 : 8) && !inertStone) {
      // DIVERGENCE from the frozen demo (#6d): a live sheet bucking underfoot
      // is not a lethal slam — the welded lattice seesaws under walkers (a
      // motion that could not exist before #6a) and levered plates spiked
      // standing crews dead at their spawn marks. Ice lethality stays where
      // it was designed: severed shards and the water (DROWN).
      dmg = (dv - 8) * 10;
      info = { cause: CAUSE.IMPACT, attacker: "world" };
    }
    if (dmg > 0) {
      const cur = best.get(victim.id);
      if (!cur || dmg > cur.dmg) best.set(victim.id, { victim, dmg, info });
    }
  }
  for (const rec of best.values()) applyDamage(world, rec.victim, rec.dmg, rec.info);
}
function stepStatus(world) {
  const dt = world.dt;
  // DIVERGENCE (guarded): DEPOT — a burning tree (ignited by a direct
  // shell/rocket hit, see stepProjectiles) loses 2 hp/s off world dt/t, never
  // wall clock. burnt-out (hp<=0) fells it through the normal kill path;
  // renderer reads b.burning for flame/char progression, b.alive for felled.
  if (world.depotCombat) {
    for (const b of world.bodies) {
      if (b.kind !== "tree" || !b.alive || b.burning == null) continue;
      applyDamage(world, b, 2 * dt, { cause: CAUSE.BLAST, attacker: "world" });
    }
  }
  // vehicles bearing on bodies (an ice raft, a rubble pile, the fallen) still give
  // the treads something to bite — terrain isn't the only thing worth driving on.
  for (const b of world.bodies) if (b.kind === "vehicle") b.onBody = false;
  for (const c of world.contacts) {
    if (!c.b || c.pn <= 0) continue;
    const up = c.a.pos.y > c.b.pos.y;
    const hi = up ? c.a : c.b, lo = up ? c.b : c.a;
    if (hi.kind === "vehicle" && lo.pos.y < hi.pos.y - hi.hy * 0.4) { hi.onBody = true; lo.bearingV = world.t; }
    // any hull grinding hard against a plate works its seams, wedged or rolling
    if (c.pn > 30) {
      if (hi.kind === "vehicle" && lo.kind === "ice") lo.grindT = world.t;
      else if (lo.kind === "vehicle" && hi.kind === "ice") hi.grindT = world.t;
      else if (hi.kind === "ice" && lo.kind === "ice" && c.pn > 60) {
        // the pressure ridge: a grind-loaded plate rams the sheet ahead and the crack
        // front advances along the force chain — backdated marks die out unless the
        // hull keeps the pressure on, so a blast scatter can't cascade.
        const hiF = hi.grindT && world.t - hi.grindT < 0.1, loF = lo.grindT && world.t - lo.grindT < 0.1;
        if (hiF && !loF) lo.grindT = world.t - 0.05;
        else if (loF && !hiF) hi.grindT = world.t - 0.05;
      }
    }
  }
  // masonry wake front: a moving stone rouses its welded neighbors one hop per step,
  // so a collapse ripples (and pays) across frames instead of one island-wake cliff —
  // and a severed sleeper wakes before a falling partner could hang on it.
  for (const wd of world.welds) {
    if (wd.broken) continue;
    const asl = wd.a.sleeping, bsl = wd.b.sleeping;
    if (asl === bsl) continue;
    const live = asl ? wd.b : wd.a, dead = asl ? wd.a : wd.b;
    // motion-gated only: "!grounded" here meant every stone above the base
    // course perpetually re-woke its sleeping weld partners — an island of
    // stacked masonry could sleep stone-by-stone but never all at once, so a
    // roused wall or roof hummed awake forever. A STILL hanging chunk may let
    // its anchor sleep; it will sleep itself a beat later and the pair freezes,
    // which is exactly how pre-slept buildings already hang.
    if (live.kind === "chunk" && (live.v.x * live.v.x + live.v.y * live.v.y + live.v.z * live.v.z) > 0.09) wake(dead);
  }
  for (const b of world.bodies) {
    if (b.invM === 0) continue;
    // suspension keeps the hull flat against crowd-plowing chaos: only real
    // ordnance (a fresh blast impulse) may roll the bison. Gentle self-righting
    // while the lean is recoverable; a true capsize still needs RECOVER.
    if (b.id === world.bisonId && b.grounded && !b.mechRef) { // DIVERGENCE: a mech hull carrying bisonId (player fear/attribution) must not get the tank's flat-keeper servo — the gait controller owns attitude
      const blastFresh = b.lastImp && b.lastImp.src === "blast" && world.t - b.lastImp.t < 1.2;
      // DIVERGENCE from the frozen demo: RECOVER opens a 1.2s window where
      // the servo must not brake the righting roll and the restoring torque
      // works from any tilt. Without it the 6/s damping parks a capsized
      // hull on its side forever — the servo's terminal 0.37 rad/s can't
      // climb the ~0.72 rad/s corner barrier, and every press died on
      // touchdown. recoverT is only ever set by an explicit player press.
      const recFresh = b.recoverT != null && world.t - b.recoverT < 1.2;
      if (!blastFresh && !recFresh) {
        b.w.x *= 1 - Math.min(1, 6 * dt);
        b.w.z *= 1 - Math.min(1, 6 * dt);
      }
      if ((!blastFresh || recFresh) && b.R[4] > (recFresh ? -0.9 : 0.35) && b.R[4] < 0.995) {
        // DIVERGENCE from the frozen demo, which had this axis SIGN-INVERTED
        // (worldUp x up): the demo's "gentle self-righting" actively rolled
        // the hull AWAY from upright, walking moderate leans down to R4~0.5
        // where RECOVER refuses — one of the "impossible to right" states.
        const tqx = -b.R[5], tqz = b.R[3]; // up x worldUp
        const gain = recFresh ? 3.2 : 2.2;
        b.w.x += tqx * gain * dt; b.w.z += tqz * gain * dt;
      }
    }
    if (b.kind === "unit" && b.alive) {
      // buried: masonry bearing from above kills by weight and time, not per-tick
      // impact — the pile wins in about a second; dig the load off and they recover.
      b.buryT = b.buriedNow ? (b.buryT || 0) + dt : Math.max(0, (b.buryT || 0) - 2 * dt);
      b.buriedNow = false;
      if (b.buryT > 1.1) applyDamage(world, b, 1e6, { cause: CAUSE.COLLAPSE, attacker: b.lastImp && world.t - b.lastImp.t < 6 ? b.lastImp.attacker : "world", buildingId: b.buriedBy || "" });
    }
    if (b.groundedNow || b.bodyGroundedNow) { b.airT = 0; b.grounded = true; } else { b.airT += dt; b.grounded = false; }
    b.bodyGroundedLast = b.bodyGroundedNow; // #6c reads this: standing-on-a-body units skip sleep
    b.bodyGroundedNow = false; // DIVERGENCE #6a: pair-contact grounding, consumed per step
    // water
    if (world.water && b.kind === "ice") {
      const wz = world.water;
      if (b.pos.x > wz.x0 - 1 && b.pos.x < wz.x1 + 1 && b.pos.z > wz.z0 - 1 && b.pos.z < wz.z1 + 1) {
        const sub = Math.max(0, Math.min(1, (wz.level - (b.pos.y - b.hy)) / (2 * b.hy)));
        if (sub > 0.02) {
          // a plate bearing a vehicle is overloaded far past its displacement:
          // the raft rides down until the floor takes the weight.
          const ldI = b.bearingV && world.t - b.bearingV < 0.3 ? 0.15 : 1;
          b.v.y += world.gravity * (sub / 0.82) * ldI * dt;
          b.v.y *= 1 - Math.min(1, 3.2 * dt);
          b.v.x *= 1 - Math.min(1, 0.9 * dt); b.v.z *= 1 - Math.min(1, 0.9 * dt);
          b.w.x *= 1 - Math.min(1, 2.4 * dt); b.w.z *= 1 - Math.min(1, 2.4 * dt);
        }
      }
    }
    if (world.water && b.alive && (b.kind === "unit" || b.kind === "vehicle")) {
      const wz = world.water;
      const inXZ = b.pos.x > wz.x0 && b.pos.x < wz.x1 && b.pos.z > wz.z0 && b.pos.z < wz.z1;
      const under = b.pos.y + b.hy * 0.2 < wz.level;
      if (inXZ && under) {
        b.subT += dt;
        b.v.x *= 1 - Math.min(1, 3 * dt); b.v.z *= 1 - Math.min(1, 3 * dt);
        b.v.y *= 1 - Math.min(1, 1.5 * dt);
        if (b.subT === dt) world.events.push({ type: "splash", x: b.pos.x, z: b.pos.z });
        if (b.subT > 0.9 && b.id !== world.bisonId) applyDamage(world, b, 1e6, { cause: CAUSE.DROWN, attacker: b.lastImp && world.t - b.lastImp.t < 4 ? b.lastImp.attacker : "world" }); // the Bison floods but survives — it has to climb out
      } else b.subT = 0;
      // arctic water: a man treading at the surface doesn't get to swim it out.
      // Buoyancy holds bobbers just above the full-submersion line forever, so
      // the cold gets its own clock (deep-end plow forces men UNDER; a cracked
      // ice sheet just drops them IN — both must end the same way).
      if (b.kind === "unit" && inXZ && b.pos.y - b.hy * 0.4 < wz.level) {
        b.swimT = (b.swimT || 0) + dt;
        if (b.swimT > 3.5) applyDamage(world, b, 1e6, { cause: CAUSE.DROWN, attacker: b.lastImp && world.t - b.lastImp.t < 8 ? b.lastImp.attacker : "world" });
      } else b.swimT = 0;
    }
    // flip
    if (b.alive && b.kind === "vehicle" && b.id !== world.bisonId) {
      const upY = b.R[4];
      if (upY < -0.25 && b.grounded) b.flipT += dt; else b.flipT = Math.max(0, b.flipT - dt * 2);
      if (b.flipT > 0.6) applyDamage(world, b, 1e6, { cause: CAUSE.FLIP, attacker: b.lastImp && world.t - b.lastImp.t < 5 ? b.lastImp.attacker : "world" });
    }
    // chunks settle
    if (b.kind === "chunk" && b.fallingSince > 0 && b.sleeping) b.fallingSince = -1;
  }
  // remove stale corpses
  for (let i = world.bodies.length - 1; i >= 0; i--) {
    const b = world.bodies[i];
    if (b.kind === "unit" && !b.alive && world.t - (b.deadT || 0) > 4) {
      // a culled corpse takes its support with it: wake anything sleeping on
      // top, or it hovers on the memory of the body (the floating-tank ghost)
      for (const o of world.bodies) {
        if (!o.sleeping || o === b) continue;
        if (o.pos.y < b.pos.y - 0.2) continue;
        if (Math.abs(o.pos.x - b.pos.x) > o.hx + b.hx + 0.3 || Math.abs(o.pos.z - b.pos.z) > o.hz + b.hz + 0.3) continue;
        wake(o);
      }
      unfileBody(world, b); // T6: the engine's own removals leave the books clean
      world.byId.delete(b.id); world.bodies.splice(i, 1);
    }
  }
}
function stepSleep(world) {
  const dt = world.dt;
  for (const b of world.bodies) {
    if (b.invM === 0 || b.sleeping) continue;
    // a living man face-down keeps struggling — sleep must not outrace the
    // getup torque (wedged under the frozen sheet's rim, it did exactly that)
    if (b.kind === "unit" && b.alive && b.R[4] <= 0.9) { b.sleepT = 0; continue; }
    if (V.len2(b.v) < 0.06 && V.len2(b.w) < 0.09) {
      b.sleepT += dt;
      // DIVERGENCE from the frozen demo (#6c): a unit standing on a live
      // sheet never sleeps. A sleeping man on a sleeping plate generates no
      // contact, and the island's next wake resolves the stale pair with an
      // impulse spike the impact classifier reads as a lethal slam — the
      // recurring phantom deaths on the AC-04 crossing. Units on terrain
      // sleep exactly as before.
      if (b.sleepT > 0.55 && !(b.kind === "unit" && b.alive && world.ice && b.bodyGroundedLast)) { b.sleeping = true; V.set(b.v, 0, 0, 0); V.set(b.w, 0, 0, 0); }
    } else b.sleepT = 0;
  }
  for (const wd of world.welds) {
    if (wd.broken) continue;
    if (wd.a.sleeping !== wd.b.sleeping) {
      // the wake-front ripples on MOTION, not on mere wakefulness: a still awake
      // stone lets its sleeping partner lie (and follows it down a beat later).
      // Unconditional partner-waking made settling islands insomniac — the
      // first stone to sleep was always yanked back by its drowsy neighbors.
      const l = wd.a.sleeping ? wd.b : wd.a;
      if (V.len2(l.v) > 0.09 || V.len2(l.w) > 0.12) {
        const s = wd.a.sleeping ? wd.a : wd.b;
        s.sleeping = false; s.sleepT = 0;
      }
    }
  }
}

// -------------------------------------------------------------------- step
export function stepWorld(world) {
  weldStressDecay(world);
  stepIceGrind(world);
  const dt = world.dt;
  world.t += dt;
  stepDrive(world);
  stepUnits(world);
  // integrate velocities + refresh frames
  for (const b of world.bodies) {
    if (b.invM === 0) continue;
    b.vy0 = b.v.y;
    if (b.pinned) { b.v.x = 0; b.v.y = 0; b.v.z = 0; b.w.x = 0; b.w.y = 0; b.w.z = 0; continue; }
    if (b.sleeping) continue; // frozen pose = frozen R/invIw: 900 sleeping stones skip the mat3 work (this WAS a third of stepWorld)
    qToR(b.q, b.R);
    invInertiaWorld(b.R, b.invIb, b.invIw);
    b.v.y -= world.gravity * dt;
    b.v.x *= 1 - 0.02 * dt; b.v.y *= 1 - 0.02 * dt; b.v.z *= 1 - 0.02 * dt;
    b.w.x *= 1 - 0.08 * dt; b.w.y *= 1 - 0.08 * dt; b.w.z *= 1 - 0.08 * dt;
  }
  collectContacts(world);
  prepContacts(world);
  // solver LOD: the active-weld list is built once (idle steps stop paying a
  // full 1600-weld scan x12), and iteration count tiers by live constraint
  // load — a 200-stone pancake takes 4 sweeps of chaos instead of 12 of polish
  const activeWelds = [];
  for (const wd of world.welds) if (!wd.broken && !(wd.a.sleeping && wd.b.sleeping)) activeWelds.push(wd);
  const solverLoad = activeWelds.length + world.contacts.length;
  const itn = solverLoad > 900 ? 4 : solverLoad > 450 ? 7 : 12;
  for (let it = 0; it < itn; it++) { solveWelds(world, activeWelds); solveContacts(world); }
  // DIVERGENCE: mech joints + this mech's contacts solve in their own island at
  // FIXED iterations — the LOD tier above must never starve a walking servo
  // (spec §6 landmine #1). Hook is undefined without mechs.
  if (world.mechStep) world.mechStep(world);
  weldBreakPass(world);
  // store warm impulses
  world.warm.clear();
  for (const c of world.contacts) world.warm.set(c.key, { pn: c.pn, pt1: c.pt1, pt2: c.pt2 });
  // integrate positions
  for (const b of world.bodies) {
    if (b.invM === 0 || b.sleeping) continue;
    V.addScaled(b.pos, b.pos, b.v, dt);
    qIntegrate(b.q, b.w, dt);
  }
  stepProjectiles(world);
  weldBreakPass(world);
  classifyImpacts(world);
  stepStatus(world);
  stepSleep(world);
}
export function worldHash(world) {
  let h = 7;
  const q = (v) => Math.round(v * 512) | 0;
  for (const b of world.bodies) {
    h = (Math.imul(h, 31) + q(b.pos.x) + Math.imul(q(b.pos.y), 7) + Math.imul(q(b.pos.z), 13) + (b.alive ? 1 : 0)) | 0;
  }
  h = (h + Math.imul(world.projectiles.length, 97) + q(world.t)) | 0;
  return h >>> 0;
}

// ------------------------------------------------------ proving grounds map
export const POOL = { x0: -8, x1: 8, z0: 20, z1: 36, level: 1.1 };
// The proving range runs down-range along +z: you start at the bottom of the screen.
// 60-30-10 infantry dress: ~60% field-gray cloth, ~30% charcoal kit, ~10% rust
// team accent worn high (scarf, helmet) where the 32-degree camera looks.
// Visual only — physics keeps the same 0.52 x 1.72 box. Offsets are unit-local
// (feet at -0.86). swing: the part hinges about local X at the walk phase, sign
// alternating; ty pre-translates geometry so the origin sits at the joint.
export const INFANTRY = {
  // per-type palettes: the red coat IS the conscript, slate IS the grenadier —
  // type reads by color at 20px like it always did; the 10% brass accent
  // (scarf, helmet) pops against rust, slate, and snow alike.
  pal: {
    con: { dom: 0xa63c3c, sec: 0x2c3339, acc: 0xc9a04e, skin: 0xd9c6a0, gun: 0x14171a },
    gren: { dom: 0x2f3a46, sec: 0x1b2126, acc: 0xc9a04e, skin: 0xd9c6a0, gun: 0x14171a },
  },
  dead: {
    con: { dom: 0x4a3a32, sec: 0x241f1c, acc: 0x5c4a2e, skin: 0x8a7a62, gun: 0x101314 },
    gren: { dom: 0x30342f, sec: 0x14171a, acc: 0x5c4a2e, skin: 0x8a7a62, gun: 0x101314 },
  },
  con: [
    { key: "coat", cyl: [0.185, 0.3, 1.02, 4], rotY: Math.PI / 4, off: [0, -0.23, 0], role: "dom" },
    { key: "boot", box: [0.38, 0.14, 0.26], off: [0, -0.79, 0.02], role: "sec" },
    { key: "belt", box: [0.44, 0.07, 0.32], off: [0, 0.06, 0], role: "sec" },
    { key: "scarf", box: [0.4, 0.13, 0.32], off: [0, 0.35, 0], role: "acc" },
    { key: "head", box: [0.26, 0.26, 0.26], off: [0, 0.54, 0], role: "skin" },
    { key: "cap", box: [0.34, 0.17, 0.34], off: [0, 0.705, 0], role: "dom" },
    { key: "flapL", box: [0.07, 0.2, 0.22], off: [-0.185, 0.56, 0], role: "sec" },
    { key: "flapR", box: [0.07, 0.2, 0.22], off: [0.185, 0.56, 0], role: "sec" },
    { key: "armL", box: [0.12, 0.44, 0.16], ty: -0.22, off: [-0.3, 0.28, 0], role: "dom", swing: 1, swingK: 0.9 },
    { key: "armR", box: [0.12, 0.44, 0.16], ty: -0.22, off: [0.3, 0.28, 0], role: "dom", swing: -1, swingK: 0.9 },
    { key: "rifle", box: [0.05, 0.05, 0.9], preRot: [0.9, 0.2, 0.25], off: [-0.1, 0.19, -0.26], role: "gun" },
    // DIVERGENCE from the frozen demo (guarded, mk0.23 troop identity): three
    // spare PROP slots every con-table man carries. Deliberately plain 0.1m
    // cubes with NO preRot and NO off of their own — the renderer supplies
    // both per role (scope + long barrel, satchel, mortar tube, MG receiver +
    // the two bipod legs) from src/render/troopkit.js. They are INERT outside
    // DEPOT: troopKit's non-depot path writes them at ZERO scale, so the
    // demo, sandbox, tower defense and campaign render exactly as before —
    // the cost is 3 extra instanced draw calls, nothing on screen.
    { key: "prop", box: [0.1, 0.1, 0.1], off: [0, 0, 0], role: "gun" },
    { key: "prop2", box: [0.1, 0.1, 0.1], off: [0, 0, 0], role: "gun" },
    { key: "prop3", box: [0.1, 0.1, 0.1], off: [0, 0, 0], role: "gun" },
  ],
  gren: [
    { key: "legL", box: [0.17, 0.56, 0.22], ty: -0.28, off: [-0.13, -0.12, 0], role: "dom", swing: 1, swingK: 1 },
    { key: "legR", box: [0.17, 0.56, 0.22], ty: -0.28, off: [0.13, -0.12, 0], role: "dom", swing: -1, swingK: 1 },
    { key: "bootL", box: [0.18, 0.16, 0.24], ty: -0.64, off: [-0.13, -0.12, 0.01], role: "sec", swing: 1, swingK: 1 },
    { key: "bootR", box: [0.18, 0.16, 0.24], ty: -0.64, off: [0.13, -0.12, 0.01], role: "sec", swing: -1, swingK: 1 },
    { key: "belt", box: [0.42, 0.16, 0.28], off: [0, -0.1, 0], role: "sec" },
    { key: "chest", box: [0.5, 0.44, 0.3], off: [0, 0.2, 0], role: "dom" },
    { key: "armL", box: [0.13, 0.48, 0.17], ty: -0.24, off: [-0.315, 0.4, 0], role: "dom", swing: -1, swingK: 1 },
    { key: "armR", box: [0.13, 0.48, 0.17], ty: -0.24, off: [0.315, 0.4, 0], role: "dom", swing: 1, swingK: 1 },
    { key: "head", box: [0.26, 0.26, 0.26], off: [0, 0.55, 0], role: "skin" },
    { key: "helmet", box: [0.35, 0.16, 0.35], off: [0, 0.715, 0], role: "acc" },
    { key: "pack", box: [0.3, 0.34, 0.13], off: [0, 0.18, -0.24], role: "sec" },
    { key: "tube", box: [0.16, 1.1, 0.16], off: [0, 0.2, -0.36], role: "gun" },
  ],
};

export const STATIONS = {
  bison: { x: 0, z: -52 },
  gunnery: { x: 0, z: -30 },
  roadlane: { x: 0, z: -16 },
  garrison: { x: -7, z: 2 },
  demo: { x: -7, z: 5.6 },
  poolside: { x: -2, z: 16.2 },
  bowl: { x: 7, z: 10 },
  hill: { x: 17, z: 11 },
  // scouts park OFF the pond aprons (pd > 8): a parked car on the 21° ramp
  // settles, starts sliding, and capsizes in the pond.
  scouts: [[-3, 48, 2.8], [3, 46, 3.4], [11, 44.5, 2.2]],
  pit: { x: 2, z: 58 },
  convoy: { x: -4, z: 72 },
};
export function buildTerrain(field, seed = 11) {
  const r = mulberry32(seed);
  const { n, cs, h, half } = field;
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const x = i * cs - half, z = j * cs - half;
    let y = 2.2 + Math.sin(x * 0.11 + 1.7) * 0.26 + Math.cos(z * 0.13 - 0.4) * 0.22 + (r() - 0.5) * 0.08;
    // side hill: bowling wrecks roll off it toward the bowl squad
    const dh = ((x - STATIONS.hill.x) * (x - STATIONS.hill.x) + (z - STATIONS.hill.z) * (z - STATIONS.hill.z)) / (13 * 13);
    y += 4.6 * Math.exp(-dh);
    // pool bowl
    const px = Math.max(POOL.x0 - x, 0, x - POOL.x1), pz = Math.max(POOL.z0 - z, 0, z - POOL.z1);
    const pd = Math.sqrt(px * px + pz * pz);
    // uniform 8m swimming-hole ramp (~21°) around the WHOLE perimeter. Any
    // ramp-length variation twists the ground across the corners and rolls a
    // crossing hull onto its side (probe: full flip at the NE corner) — a
    // single radial profile is C1 everywhere and drivable from any bearing.
    // The deep -0.6 middle still drowns men just fine.
    const pL = 8;
    if (pd < pL) {
      const t = 1 - pd / pL;
      const bowl = POOL.level - 1.7;
      y = y * (1 - t * t) + bowl * t * t;
    }
    // station pads (flat-top: dead level inside, blended skirt outside)
    const pad = (cx, cz, rad, ph) => {
      const d = Math.sqrt((x - cx) * (x - cx) + (z - cz) * (z - cz));
      if (d >= rad) return;
      const t = Math.min(1, (rad - d) / (rad * 0.45));
      y = y * (1 - t) + ph * t;
    };
    pad(STATIONS.gunnery.x, STATIONS.gunnery.z, 6, 2.3);
    pad(STATIONS.roadlane.x, STATIONS.roadlane.z, 7, 2.28);
    pad(STATIONS.garrison.x, STATIONS.garrison.z, 7, 2.35);
    pad(STATIONS.poolside.x, STATIONS.poolside.z, 4.0, 2.3);
    pad(STATIONS.bowl.x, STATIONS.bowl.z, 5, 2.26);
    pad(STATIONS.pit.x, STATIONS.pit.z, 6, 2.32);
    pad(STATIONS.convoy.x, STATIONS.convoy.z, 8, 2.3);
    h[j * n + i] = y;
  }
  // slope relaxation, whole map, 24° cap: the pond carve crossfading into
  // the hill skirt locally exceeded what a man can stand up on (a downed
  // trooper on a 28° flank slides forever, too fast to finish a getup).
  // 24° passes the 21° ramps and the hill's own 17° max untouched; only
  // steeper crossfades erode. No band — a banded pass terraces its own
  // edge into a new cliff. Pull-down only, so peaks keep their height, and
  // every wall, pad, and unit built after this conforms.
  // both cardinal and diagonal neighbors: cardinal-only leaves ~33°
  // diagonal facets between clamped vertices, and a man lying on one can
  // never right himself.
  // the diagonal term must not dredge shoreline crests toward submerged
  // neighbors (corner-cutting through the pond reshaped the south rim into
  // a tip-over that beached the escape-test Bison sideways on the sheet):
  // for an above-water vertex, submerged diagonal neighbors count as lying
  // at the waterline — that is the surface a man or hull actually meets.
  const maxStep = Math.tan(0.445) * cs, dStep = maxStep * Math.SQRT2;
  const wfloor = POOL.level - 0.1;
  for (let pass = 0; pass < 4; pass++) {
    for (let j = 1; j < n - 1; j++) for (let i = 1; i < n - 1; i++) {
      const k = j * n + i;
      const wet = h[k] <= POOL.level;
      const dn = (kk) => (wet ? h[kk] : Math.max(h[kk], wfloor));
      const lo = Math.min(h[k - 1], h[k + 1], h[k - n], h[k + n]) + maxStep;
      const lod = Math.min(dn(k - n - 1), dn(k - n + 1), dn(k + n - 1), dn(k + n + 1)) + dStep;
      const cap = Math.min(lo, lod);
      if (h[k] > cap) h[k] = cap;
    }
  }
  field.dirty = true;
}
function heading(q, ang) { return qFromAxis(v3(0, 1, 0), ang); }
export function buildProvingGrounds(seed = 1234) {
  const field = makeField(112, 1.7, seed);
  buildTerrain(field, 11);
  const world = makeWorld({ field, seed, water: POOL });
  const pg = { squads: [], scouts: [], chunks: [], welds: [] };
  const groundY = (x, z, hy) => field.heightAt(x, z) + hy + 0.02;
  // Bison
  const bison = addBody(world, { kind: "vehicle", team: 1, driver: "player", mass: 3800, hx: 2.2, hy: 0.95, hz: 3.3, x: STATIONS.bison.x, z: STATIONS.bison.z, y: groundY(STATIONS.bison.x, STATIONS.bison.z, 0.95), hp: 1e9, friction: 0.85, q: heading(null, 0) });
  world.bisonId = bison.id;
  // squads
  const squadSpec = [
    { tag: "gunnery", x0: STATIONS.gunnery.x - 2.6, z0: STATIONS.gunnery.z - 1.4, nx: 4, nz: 3, dx: 1.7, dz: 1.4 },
    { tag: "roadlane", x0: STATIONS.roadlane.x - 5.6, z0: STATIONS.roadlane.z - 0.7, nx: 8, nz: 2, dx: 1.6, dz: 1.4 },
    { tag: "militia", x0: -15.0, z0: 2.4, nx: 2, nz: 2, dx: 0.9, dz: 0.9 }, // garrisoned in the plaza house (built around them)
    { tag: "demo", x0: STATIONS.garrison.x - 1.4, z0: STATIONS.garrison.z - 0.2, nx: 5, nz: 1, dx: 0.7, dz: 0.7, brave: true }, // garrisoned INSIDE the keep
    { tag: "poolside", x0: STATIONS.poolside.x - 1.58, z0: STATIONS.poolside.z - 1.05, nx: 4, nz: 2, dx: 1.05, dz: 1.05 },
    { tag: "bowl", x0: STATIONS.bowl.x - 2.2, z0: STATIONS.bowl.z - 1.2, nx: 4, nz: 2, dx: 1.5, dz: 1.4 },
    { tag: "pit", x0: STATIONS.pit.x - 1.6, z0: STATIONS.pit.z - 0.6, nx: 3, nz: 1, dx: 1.6, dz: 1.4, utype: "gren" },
    { tag: "convoy", x0: STATIONS.convoy.x - 2.4, z0: STATIONS.convoy.z + 3.2, nx: 4, nz: 1, dx: 1.6, dz: 1.3 },
  ];
  const spawnSquad = (tag) => {
    const s = squadSpec.find((q) => q.tag === tag);
    for (let i = 0; i < s.nx; i++) for (let j = 0; j < s.nz; j++) {
      const x = s.x0 + i * s.dx, z = s.z0 + j * s.dz;
      const u = addBody(world, { kind: "unit", team: 2, group: s.tag, mass: 82, hx: 0.26, hy: s.utype === "gren" ? 0.92 : 0.86, hz: 0.26, x, z, y: groundY(x, z, s.utype === "gren" ? 0.92 : 0.86), hp: s.utype === "gren" ? 45 : 30, friction: 0.55 });
      if (s.utype) u.utype = s.utype;
      if (s.brave) u.brave = true; // bunker defenders shelter against the wall
      pg.squads.push(u);
    }
  };
  const spawnSquads = () => { for (const s of squadSpec) spawnSquad(s.tag); };
  const spawnConvoy = () => {
    for (const [tx, tz, ta] of [[STATIONS.convoy.x - 3, STATIONS.convoy.z, 0.2], [STATIONS.convoy.x + 1.5, STATIONS.convoy.z - 3, 0.05], [STATIONS.convoy.x + 4.5, STATIONS.convoy.z + 2.5, -0.3]]) {
      const t = addBody(world, { kind: "truck", team: 2, group: "convoy", vtype: "truck", mass: 1400, hx: 1.15, hy: 1.05, hz: 2.6, x: tx, z: tz, y: groundY(tx, tz, 1.05), hp: 120, friction: 0.6, q: heading(null, ta) });
      t.sleeping = true;
      pg.squads.push(t);
    }
  };
  const scoutSpec = STATIONS.scouts;
  const spawnScouts = () => {
    for (const [x, z, a] of scoutSpec) {
      const s = addBody(world, { kind: "vehicle", team: 2, group: "scout", mass: 950, hx: 1.25, hy: 0.7, hz: 1.85, x, z, y: groundY(x, z, 0.7), hp: 55, friction: 0.7, q: heading(null, a) });
      pg.scouts.push(s);
    }
  };
  const buildGarrison = () => {
    // finer masonry: 0.8m stones on a 6x5x4 lattice (was 1.2m on 4x3x3) — same
    // footprint, one course taller, 120 blocks. Mass follows volume (~100kg) and
    // weld strength follows contact area, so shells shear it into rubble at the
    // same energies instead of toppling a monolith.
    const cx = STATIONS.garrison.x, cz = STATIONS.garrison.z, hcs = 0.40, pitch = 0.83;
    const grid = [];
    for (let ix = 0; ix < 6; ix++) for (let iy = 0; iy < 5; iy++) for (let iz = 0; iz < 4; iz++) {
      // hollow keep: one-stone walls, a roof course, a south doorway. The demo squad
      // garrisons inside — breach the walls and the masonry comes down on them.
      if (ix >= 1 && ix <= 4 && iz >= 1 && iz <= 2 && iy <= 3) continue;
      if (iz === 0 && (ix === 2 || ix === 3) && iy <= 1) continue;
      const x = cx + (ix - 2.5) * pitch, z = cz + (iz - 1.5) * pitch;
      const y = field.heightAt(cx, cz) + hcs + 0.02 + iy * pitch;
      const c = addBody(world, { kind: "chunk", group: "garrison", mass: 100, hx: hcs, hy: hcs, hz: hcs, x, y, z, friction: 0.65, restitution: 0.02 });
      c.sleeping = true; // masonry stands dormant until a shell or the blade disturbs it — 120 live stones would eat the frame budget
      c.gpos = [ix, iy, iz];
      grid.push(c); pg.chunks.push(c);
    }
    const at = (ix, iy, iz) => grid.find((c) => c.gpos[0] === ix && c.gpos[1] === iy && c.gpos[2] === iz);
    for (const c of grid) {
      const [ix, iy, iz] = c.gpos;
      for (const [dx, dy, dz] of [[1, 0, 0], [0, 1, 0], [0, 0, 1]]) {
        const o = at(ix + dx, iy + dy, iz + dz);
        if (o) pg.welds.push(addWeld(world, c, o, 8.0e4)); // occlusion localizes the bite spatially now: the unshadowed face flash-severs (~91k shell shock), shadowed depth (~36-55k) holds
      }
    }
  };
  // scattered field walls: mixed lengths and heights for infantry to take cover
  // behind — blast occlusion makes a stone wall worth crouching at. Sited on flat
  // ground, clear of the road lane, the plow lane, the bowling lane, and the pool.
  const buildCoverWalls = () => {
    const hcs = 0.40, pitch = 0.83;
    // [cx, cz, yaw, length, height, thickness] in stones — varying on all three
    // axes: thin screens, thick barricades, one squat blockhouse, two tall towers.
    const specs = [
      // mid-field
      [-14, -24, 0.0, 8, 2, 1], [9, -26, 0.9, 4, 3, 2], [-13, -8, 0.5, 5, 2, 1],
      [10, -10, -0.6, 3, 2, 3], [5.2, 6.6, 1.1, 4, 2, 2], [-15, 12, 1.57, 6, 4, 1],
      // south approach
      [-12, -38, 0.4, 6, 2, 1], [11, -40, -0.7, 5, 3, 2], [-9, -47, 1.1, 3, 2, 1],
      // mid-north
      [14, 28, 0.5, 7, 2, 1], [-12, 28, -0.3, 4, 4, 1],
      // pit approach (cover from counter-battery mortars)
      [-7, 46, 0.6, 5, 3, 2], [9, 50, 1.4, 6, 2, 1],
      // convoy flank
      [-13, 66, 0.1, 4, 3, 1],
    ];
    pg.covers = [];
    let wi = 0;
    for (const [cx, cz, a, nx, ny, nz] of specs) {
      const grp = "wall" + wi++;
      const ux = Math.cos(a), uz = Math.sin(a);
      pg.covers.push({ x: cx, z: cz, ux, uz, hl: (nx * pitch) / 2, hw: (nz * pitch) / 2, hh: ny * pitch });
      const grid = [];
      for (let ix = 0; ix < nx; ix++) for (let iy = 0; iy < ny; iy++) for (let iz = 0; iz < nz; iz++) {
        const lx = (ix - (nx - 1) / 2) * pitch, lz = (iz - (nz - 1) / 2) * pitch;
        const x = cx + lx * ux - lz * uz, z = cz + lx * uz + lz * ux;
        const y = field.heightAt(x, z) + hcs + 0.02 + iy * pitch;
        const c = addBody(world, { kind: "chunk", group: grp, mass: 100, hx: hcs, hy: hcs, hz: hcs, x, y, z, friction: 0.65, restitution: 0.02, q: heading(null, a) });
        c.sleeping = true;
        c.gpos = [ix, iy, iz];
        grid.push(c); pg.chunks.push(c);
      }
      for (const c of grid) for (const o of grid) {
        const [ix, iy, iz] = c.gpos, [jx, jy, jz] = o.gpos;
        if ((jx === ix + 1 && jy === iy && jz === iz) || (jy === iy + 1 && jx === ix && jz === iz) || (jz === iz + 1 && jx === ix && jy === iy)) pg.welds.push(addWeld(world, c, o, 8.0e4));
      }
    }
  };
  const weldGrid = (grid) => {
    const key = (a, b2, c2) => a + "," + b2 + "," + c2;
    const map = new Map(grid.map((c) => [key(...c.gpos), c]));
    for (const c of grid) {
      const [ix, iy, iz] = c.gpos;
      for (const [dx, dy, dz] of [[1, 0, 0], [0, 1, 0], [0, 0, 1]]) {
        const o = map.get(key(ix + dx, iy + dy, iz + dz));
        if (o) pg.welds.push(addWeld(world, c, o, 8.0e4));
      }
    }
  };
  const buildLargeBuildings = () => {
    const hcs = 0.40, pitch = 0.83;
    // level a building pad in the heightfield (rim-blended, like the station pads
    // — but those use a vertex-time helper that's out of scope after generation)
    const flatten = (cx, cz, rad, ph) => {
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
    };
    // NOTE: cover walls need no footings — the wall builder samples
    // heightAt PER STONE, so masonry conforms to whatever the terrain is at
    // build time. Terraforming under a built wall is how you break one.

    // ---- HANGAR: a drive-through masonry building. Doors on both z-ends, 7
    // stones wide (5.81m clear vs the Bison's 4.51m over the treads) and 4
    // courses tall (3.34m clear vs the 2.83m turret crown). Full roof slab: 56
    // stones (54.9kN) hang on ~30 perimeter welds ≈ 1.8kN each vs the 8e4 break
    // threshold — a 40x static margin, proven awake in the headless suite.
    {
      const cx = -20, cz = -16, NX = 9, NZ = 10, NY = 5;
      flatten(cx, cz, 6.5, field.heightAt(cx, cz));
      const base = field.heightAt(cx, cz) + hcs + 0.02;
      const grid = [];
      for (let ix = 0; ix < NX; ix++) for (let iy = 0; iy < NY; iy++) for (let iz = 0; iz < NZ; iz++) {
        if (ix >= 1 && ix <= 7 && iz >= 1 && iz <= 8) continue; // hollow interior; a rigid slab roofs it below
        if ((iz === 0 || iz === NZ - 1) && ix >= 1 && ix <= 7 && iy <= 3) continue; // the two drive doors
        const c = addBody(world, { kind: "chunk", group: "hangar", mass: 100, hx: hcs, hy: hcs, hz: hcs, x: cx + (ix - (NX - 1) / 2) * pitch, y: base + iy * pitch, z: cz + (iz - (NZ - 1) / 2) * pitch, friction: 0.65, restitution: 0.02 });
        c.sleeping = true; c.gpos = [ix, iy, iz]; grid.push(c); pg.chunks.push(c);
      }
      weldGrid(grid);
      // the roof is ONE rigid 2-ton slab welded to the wall-cap ring. Granular
      // roofs need the solver to converge the span every step, and 12 sweeps
      // can't hold a 4-hop free span (24 welds sheared; light panels were worse
      // — mass-ratio jumps destabilize Gauss-Seidel). A plate has no internal
      // spans: 1-hop convergence, precast-honest, and when the ring shears the
      // whole slab pancakes at once.
      // sized INSIDE the wall-cap ring opening with the same ~2cm joint every other
      // welded pair gets (0.83 pitch vs 0.80 stones): an overlapping slab put its
      // contacts at war with its welds — perpetual micro-impulses, nothing slept
      const slab = addBody(world, { kind: "chunk", group: "hangar", mass: 800, hx: 2.90, hy: 0.2, hz: 3.32, x: cx, y: base + 4 * pitch + 0.2, z: cz, friction: 0.65, restitution: 0.02 });
      slab.sleeping = true; slab.gpos = [4, 4, 4]; pg.chunks.push(slab);
      for (const c of grid) if (c.gpos[1] >= 3) pg.welds.push(addWeld(world, slab, c, 8.0e4)); // anchor to the top TWO courses: 68 welds share the load and double the per-sweep correction
      pg.covers.push({ x: cx - 3.32, z: cz, ux: 0, uz: 1, hl: (NZ * pitch) / 2, hw: hcs, hh: NY * pitch });
      pg.covers.push({ x: cx + 3.32, z: cz, ux: 0, uz: 1, hl: (NZ * pitch) / 2, hw: hcs, hh: NY * pitch });
    }
    // ---- WAREHOUSE: full roof slab on perimeter walls + two interior columns.
    // Max weld span to a support is 2 stones (~3kN static per weld vs 8e4 breakF),
    // so it stands honestly — and pancakes honestly when the columns go.
    {
      const cx = 17, cz = 44, NX = 8, NZ = 6, NY = 4;
      flatten(cx, cz, 5.0, field.heightAt(cx, cz));
      const base = field.heightAt(cx, cz) + hcs + 0.02;
      const isCol = (ix, iz) => (ix === 2 && iz === 2) || (ix === 5 && iz === 3);
      const grid = [];
      for (let ix = 0; ix < NX; ix++) for (let iy = 0; iy <= NY; iy++) for (let iz = 0; iz < NZ; iz++) {
        const perim = ix === 0 || ix === NX - 1 || iz === 0 || iz === NZ - 1;
        if (iy < NY && !perim && !isCol(ix, iz)) continue; // hollow, save the columns
        if (iz === 0 && (ix === 3 || ix === 4) && iy <= 2) continue; // infantry door, south face
        const c = addBody(world, { kind: "chunk", group: "warehouse", mass: 100, hx: hcs, hy: hcs, hz: hcs, x: cx + (ix - (NX - 1) / 2) * pitch, y: base + iy * pitch, z: cz + (iz - (NZ - 1) / 2) * pitch, friction: 0.65, restitution: 0.02 });
        c.sleeping = true; c.gpos = [ix, iy, iz]; grid.push(c); pg.chunks.push(c);
      }
      weldGrid(grid);
      pg.covers.push({ x: cx - 2.905, z: cz, ux: 0, uz: 1, hl: (NZ * pitch) / 2, hw: hcs, hh: NY * pitch });
      pg.covers.push({ x: cx + 2.905, z: cz, ux: 0, uz: 1, hl: (NZ * pitch) / 2, hw: hcs, hh: NY * pitch });
      pg.covers.push({ x: cx, z: cz + 2.075, ux: 1, uz: 0, hl: (NX * pitch) / 2, hw: hcs, hh: NY * pitch });
    }
    // ---- HOUSES: the town along the main street. 4 courses, granular roofs
    // (spans <= 2 hops, warehouse-proven), 3-high 2-wide doors facing the
    // street (2.09m clear — a conscript walks in upright).
    pg.shelters = [];
    const buildHouse = (grp, cx, cz, NX, NZ, doorIx) => {
      const NY = 4;
      flatten(cx, cz, Math.hypot(NX, NZ) * pitch / 2 + 0.9, field.heightAt(cx, cz));
      const base = field.heightAt(cx, cz) + hcs + 0.02;
      const grid = [];
      for (let ix = 0; ix < NX; ix++) for (let iy = 0; iy <= NY; iy++) for (let iz = 0; iz < NZ; iz++) {
        const perim = ix === 0 || ix === NX - 1 || iz === 0 || iz === NZ - 1;
        if (iy < NY && !perim) continue;                                   // hollow
        if (ix === doorIx && (iz === 1 || iz === 2) && iy <= 2) continue;  // the street door
        const c = addBody(world, { kind: "chunk", group: grp, mass: 100, hx: hcs, hy: hcs, hz: hcs, x: cx + (ix - (NX - 1) / 2) * pitch, y: base + iy * pitch, z: cz + (iz - (NZ - 1) / 2) * pitch, friction: 0.65, restitution: 0.02 });
        c.sleeping = true; c.gpos = [ix, iy, iz]; grid.push(c); pg.chunks.push(c);
      }
      weldGrid(grid);
      for (const sz of [-1, 1]) pg.covers.push({ x: cx, z: cz + sz * ((NZ - 1) / 2) * pitch, ux: 1, uz: 0, hl: (NX * pitch) / 2, hw: hcs, hh: NY * pitch });
      const dsign = doorIx === 0 ? -1 : 1;
      pg.shelters.push({ door: { x: cx + (doorIx - (NX - 1) / 2) * pitch + dsign * 0.9, z: cz }, inside: { x: cx, z: cz } });
    };
    buildHouse("house0", -10, -34, 5, 4, 4); // west row, door to the street
    buildHouse("house1", 9, -34, 5, 4, 0);
    buildHouse("house2", -14, 3, 6, 4, 5);   // plaza house, door to the keep square
    buildHouse("house3", 11, -7, 4, 4, 0);   // hillside cut
  };
  // pre-placed wrecks on the hill slope (bowling lane toward squadB)
  const spawnHillWrecks = () => {
    for (const [x, z, a] of [[STATIONS.hill.x - 4.5, STATIONS.hill.z - 1, 1.9], [STATIONS.hill.x - 3, STATIONS.hill.z + 3.5, 2.5]]) {
      const wk = addBody(world, { kind: "wreck", team: 0, group: "hillwreck", mass: 900, hx: 1.25, hy: 0.7, hz: 1.85, x, z, y: groundY(x, z, 0.75), friction: 0.5, q: heading(null, a) });
      wk.sleeping = true; // parked on the slope until the blade or a blast wakes it
    }
  };
  spawnSquads();
  spawnConvoy(); spawnScouts(); buildGarrison(); spawnHillWrecks(); buildCoverWalls(); buildLargeBuildings();
  const removeGroup = (pred) => {
    for (let i = world.bodies.length - 1; i >= 0; i--) {
      const b = world.bodies[i];
      if (pred(b)) { world.byId.delete(b.id); world.bodies.splice(i, 1); }
    }
  };
  world.pg = {
    covers: pg.covers, // wall metadata for the cover-seek flee AI (and tests)
    respawnSquads() { removeGroup((b) => b.kind === "unit" || b.kind === "truck"); pg.squads.length = 0; spawnSquads(); spawnConvoy(); },
    respawnSquad(tag) { removeGroup((b) => b.kind === "unit" && b.group === tag); spawnSquad(tag); },
    freeze() { freezePool(world); },
    thaw() { thawPool(world); },
    respawnScouts() { removeGroup((b) => b.group === "scout" && b.kind === "vehicle"); spawnScouts(); },
    repairGarrison() {
      removeGroup((b) => b.group === "garrison");
      world.welds = world.welds.filter((w) => w.a.group !== "garrison" && w.b.group !== "garrison");
      pg.chunks.length = 0; buildGarrison();
    },
  };
  // the pond starts frozen: the sheet is the pond's default face, so the
  // first thing a player shoots teaches them ice exists. THE DEEP END thaws
  // it in its setup (that trial needs open water), THIN ICE refreezes.
  freezePool(world);
  return world;
}
export function bisonFire(world, target) {
  const b = world.byId.get(world.bisonId);
  if (!b) return null;
  // the shell leaves the BARREL, not the hull nose: the turret slews to the
  // aim independent of hull heading, so the muzzle sits at the barrel tip
  // (local y 1.35 + 0.12, tip 4.2 out) along the TARGET azimuth — the same
  // azimuth the rendered turret points at fire time. Point-blank targets pull
  // the spawn back inside the barrel so we never fire from beyond the mark.
  const az = Math.atan2(target.x - b.pos.x, target.z - b.pos.z);
  const tdist = Math.hypot(target.x - b.pos.x, target.z - b.pos.z);
  const reach = Math.min(4.2, Math.max(1.0, tdist - 0.5));
  const muzzle = v3(b.pos.x + Math.sin(az) * reach, b.pos.y + 1.47, b.pos.z + Math.cos(az) * reach);
  const dx = target.x - muzzle.x, dz = target.z - muzzle.z;
  const d = Math.max(2, Math.sqrt(dx * dx + dz * dz));
  const dy = (world.field.heightAt(target.x, target.z) - muzzle.y);
  const speed = 62;
  let pitch = aimSolve(speed, d, dy);
  if (pitch == null) pitch = 0.72;
  const dir = v3((dx / d) * Math.cos(pitch), Math.sin(pitch), (dz / d) * Math.cos(pitch));
  return fireProjectile(world, muzzle, dir, speed, { kind: "shell", r: 3.2, kv: 12, dmg: 55, crater: 0.8, attacker: "player", owner: b.id });
}

export function bisonMg(world, target) {
  const b = world.byId.get(world.bisonId);
  if (!b) return null;
  // coax .50: rides 0.45m right of the main gun on the same slew, fast flat
  // rounds with a small deterministic jitter cone. Aims at chest height —
  // this gun shoots men, not dirt. Tiny blast radius, no crater, and a kv
  // far below the masonry weld threshold: useless against walls and ice by
  // design. Kills land as PROJECTILE/player, so the coax counts for gunnery.
  const az0 = Math.atan2(target.x - b.pos.x, target.z - b.pos.z);
  const az = az0 + (world.rng() - 0.5) * 0.024;
  const tdist = Math.hypot(target.x - b.pos.x, target.z - b.pos.z);
  const reach = Math.min(4.2, Math.max(1.0, tdist - 0.5));
  const muzzle = v3(b.pos.x + Math.sin(az) * reach + Math.cos(az0) * 0.45, b.pos.y + 1.42, b.pos.z + Math.cos(az) * reach - Math.sin(az0) * 0.45);
  const dx = target.x - muzzle.x, dz = target.z - muzzle.z;
  const d = Math.max(2, Math.sqrt(dx * dx + dz * dz));
  const dy = (world.field.heightAt(target.x, target.z) + 0.9 - muzzle.y);
  const speed = 120;
  let pitch = aimSolve(speed, d, dy);
  if (pitch == null) pitch = Math.atan2(dy, d);
  pitch += (world.rng() - 0.5) * 0.016;
  const dir = v3((dx / d) * Math.cos(pitch), Math.sin(pitch), (dz / d) * Math.cos(pitch));
  return fireProjectile(world, muzzle, dir, speed, { kind: "mg", r: 0.35, kv: 1.5, dmg: 2, crater: 0, attacker: "player", owner: b.id });
}


// internals the game layer needs that the demo kept module-private
export { heading, applyDamage };

// DIVERGENCE from the frozen demo: internal math handed to the mech module
// (src/engine/mech.js). Additive export only — nothing on the demo path reads it.
export const __mech__ = { V, v3, qIdent, qNorm, qFromAxis, qMul, qToR, rMulVec, rTMulVec, invInertiaWorld, iMulVec, wake };
