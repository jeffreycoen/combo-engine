// COLDSNAP — PROVING GROUNDS (M1)
// Physics-first RTS demo slice. Ortho RA camera, 3D-pixel-art pipeline, kill-cause
// classifiers + achievements. Physics core is pure JS (no three) and exported via
// __test__ for headless verification against THIS file.
import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";

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
export function aimSolve(v, d, dy, g = 9.8) {
  const v2 = v * v;
  const disc = v2 * v2 - g * (g * d * d + 2 * dy * v2);
  if (disc < 0) return null;
  return Math.atan2(v2 - Math.sqrt(disc), g * d);
}

// ------------------------------------------------------------- heightfield
export function makeField(n, cs, seed = 7) {
  const h = new Float32Array(n * n);
  const half = ((n - 1) * cs) / 2;
  const F = {
    n, cs, h, half,
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
        h[j * n + i] = Math.max(-1.5, h[j * n + i] - depth * k);
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
    hp: o.hp != null ? o.hp : 1e9, alive: true, sleeping: false, sleepT: 0,
    grounded: false, airT: 0, subT: 0, flipT: 0,
    lastImp: null,            // {src,attacker,t,volley}
    lastPlayerTouch: -1e9,    // for bowling / newton's first
    fallingSince: -1,         // chunks: weld broken & moving
    driver: o.driver || null, group: o.group || "",
    friction: o.friction != null ? o.friction : 0.6, restitution: o.restitution != null ? o.restitution : 0.05,
    home: null,
  };
  qToR(b.q, b.R);
  invInertiaWorld(b.R, b.invIb, b.invIw);
  return b;
}
function bodySpeed2(b) { return V.len2(b.v); }
function wake(b) { if (b.sleeping) { b.sleeping = false; } b.sleepT = 0; }

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
  world.projectiles.push(p);
  world.events.push({ type: "muzzle", x: from.x, y: from.y, z: from.z, dx: dir.x, dy: dir.y, dz: dir.z });
  return p;
}
export function fireVolley(world, x, z, n = 6, attacker = "player") {
  const id = world.volleySeq++;
  world.strikeAt = { x, z, until: world.t + 1.35 }; // strike marker: rockets land ~1.2s after the call
  for (let i = 0; i < n; i++) {
    const ox = (world.rng() - 0.5) * 7, oz = (world.rng() - 0.5) * 7;
    const from = v3(x + ox - 6, world.field.heightAt(x, z) + 55, z + oz - 6);
    const dir = V.norm(v3(), v3(0.11, -1, 0.11));
    const p = fireProjectile(world, from, dir, 42 + world.rng() * 4, { kind: "rocket", r: 4.4, kv: 13, dmg: 62, crater: 1.1, attacker, volley: id, delay: i * 0.09 });
    p.pos.y += i * 3.5;
  }
  return id;
}
function segBoxHit(p0, p1, b) {
  // segment vs OBB slab test in body space; returns t in [0,1] or -1
  const d = v3(); V.sub(d, p1, p0);
  const lo = v3(); V.sub(lo, p0, b.pos);
  const o = v3(); rTMulVec(b.R, lo, o);
  const ld = v3(); rTMulVec(b.R, d, ld);
  let tmin = 0, tmax = 1;
  const hs = [b.hx + 0.15, b.hy + 0.15, b.hz + 0.15];
  const oArr = [o.x, o.y, o.z], dArr = [ld.x, ld.y, ld.z];
  for (let i = 0; i < 3; i++) {
    if (Math.abs(dArr[i]) < 1e-8) { if (Math.abs(oArr[i]) > hs[i]) return -1; continue; }
    let t1 = (-hs[i] - oArr[i]) / dArr[i], t2 = (hs[i] - oArr[i]) / dArr[i];
    if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
    tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
    if (tmin > tmax) return -1;
  }
  return tmin;
}
export function explode(world, x, y, z, spec) {
  world.events.push({ type: "boom", x, y, z, r: spec.r, kind: spec.kind || "shell" });
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
    const dv = spec.kv * f * temper * (0.4 + 0.6 * occ);
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
      V.addScaled(b.w, b.w, axis, spec.vroll * f * (0.4 + 0.6 * occ));
      b.v.y += (spec.vlift || spec.vroll) * f * (0.4 + 0.6 * occ);
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
    const dmg = spec.dmg * f * (0.12 + 0.88 * occ) + (dist < 1.0 && spec.kind !== "mg" ? 55 : 0); // point-blank bonus is for real munitions at your feet — a coax round bursting ON its target is just the bullet
    if (b.alive && (b.kind === "unit" || b.kind === "vehicle")) {
      applyDamage(world, b, dmg, { cause: CAUSE.BLAST, attacker: spec.attacker || "world", volley: spec.volley || 0 });
    }
  }
  const groundH = world.field.heightAt(x, z);
  if (y - groundH < 1.4 && spec.crater) {
    world.field.carve(x, z, spec.crater * 2.4, spec.crater);
    world.events.push({ type: "splat", x, z, r: spec.crater * 3.4 });
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
    let hitBody = null, bestT = hitT < 0 ? 1.01 : hitT;
    for (const b of world.bodies) {
      if (b.invM === 0 && b.kind !== "chunk") continue;
      if (!b.alive && b.kind === "unit") continue;
      // owner immunity: a point-blank reticle pulls the muzzle back inside the
      // firing hull, and a shell must not detonate on its own tank leaving the
      // barrel. 0.35s clears the hull at any speed; after that you can shell
      // yourself fair and square.
      if (p.spec.owner != null && b.id === p.spec.owner && p.life < 0.35) continue;
      const t = segBoxHit(p0, p.pos, b);
      if (t >= 0 && t < bestT) { bestT = t; hitBody = b; }
    }
    if (hitBody || hitT >= 0) {
      const hx = p0.x + (p.pos.x - p0.x) * bestT, hy = p0.y + (p.pos.y - p0.y) * bestT, hz = p0.z + (p.pos.z - p0.z) * bestT;
      if (p.spec.kind !== "shell" && p.spec.kind !== "mg" && p.life < 0.45) { list.splice(i, 1); continue; } // mortar arming: muzzle-clipped rounds are duds, not pit-clearers. The coax (120 m/s) covers 54m inside the arming window — it carries no fuse to arm.
      if (hitBody && hitBody.alive && (hitBody.kind === "unit" || hitBody.kind === "vehicle")) {
        applyDamage(world, hitBody, p.spec.kind === "shell" ? 90 : p.spec.kind === "mg" ? 11 : 55, { cause: CAUSE.PROJECTILE, attacker: p.spec.attacker || "world", volley: p.spec.volley || 0 });
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
  if (!b.alive || dmg <= 0) return;
  b.hp -= dmg;
  b.lastHit = info;
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
          if (world.ice || wetHere) return false;
          return wetAt(u.pos.x + dx3 * 2.5, u.pos.z + dz3 * 2.5) || wetAt(u.pos.x + dx3 * 5, u.pos.z + dz3 * 5) || wetAt(u.pos.x + dx3 * 8, u.pos.z + dz3 * 8);
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
  const roll = b.R[1] >= 0 ? -6.2 : 6.2; // roll the short way
  b.w.x = b.R[6] * roll; b.w.y = 0; b.w.z = b.R[8] * roll;
  b.v.y = Math.max(b.v.y, 3.8);
  return true;
}

// ------------------------------------------------------------------ solver
const _scratchOut = new Array(8);
function collectContacts(world) {
  const bodies = world.bodies, contacts = world.contacts;
  contacts.length = 0;
  // broadphase: uniform grid over XZ — persistent + epoch-stamped, so steady
  // state allocates nothing (fresh Maps/arrays per step were feeding the GC
  // pauses that read as random 60ms spikes)
  const cell = 6.0;
  if (!world._grid) { world._grid = new Map(); world._gridEpoch = 0; }
  const grid = world._grid, epoch = ++world._gridEpoch;
  for (let i = 0; i < bodies.length; i++) {
    const b = bodies[i];
    if (b.pinned) continue;
    if (b.kind === "unit" && !b.alive && world.t - (b.deadT || 0) > 4) continue;
    const r = Math.max(b.hx, b.hy, b.hz);
    const x0 = Math.floor((b.pos.x - r) / cell), x1 = Math.floor((b.pos.x + r) / cell);
    const z0 = Math.floor((b.pos.z - r) / cell), z1 = Math.floor((b.pos.z + r) / cell);
    for (let gx = x0; gx <= x1; gx++) for (let gz = z0; gz <= z1; gz++) {
      const key = gx * 73856093 ^ gz * 19349663;
      let arr = grid.get(key);
      if (!arr) { arr = []; arr.epoch = epoch; grid.set(key, arr); }
      else if (arr.epoch !== epoch) { arr.length = 0; arr.epoch = epoch; }
      arr.push(b);
    }
  }
  // welded-pair exclusion set: static between weld changes, cached (rebuilding
  // from 1600 welds at 120Hz was pure per-step garbage)
  if (!world._weldPairs || world._weldPairsDirty) {
    world._weldPairs = new Set();
    for (const w of world.welds) if (!w.broken) world._weldPairs.add(w.a.id < w.b.id ? w.a.id * 100000 + w.b.id : w.b.id * 100000 + w.a.id);
    world._weldPairsDirty = false;
  }
  const weldPairs = world._weldPairs;
  const seen = new Set();
  for (const arr of grid.values()) {
    if (arr.epoch !== epoch || arr.length < 2) continue;
    for (let i = 0; i < arr.length; i++) for (let j = i + 1; j < arr.length; j++) {
      let a = arr[i], b = arr[j];
      if (a.sleeping && b.sleeping) continue;
      if (a.invM === 0 && b.invM === 0) continue;
      if (a.kind === "anchor" || b.kind === "anchor") continue; // rim pins are pure weld posts — the tank drives THROUGH the shore line, it doesn't park on it
      if (a.id > b.id) { const t = a; a = b; b = t; }
      const pk = a.id * 100000 + b.id;
      if (seen.has(pk)) continue; seen.add(pk);
      if (weldPairs.has(pk)) continue;
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
      }
      if (n > 0) {
        // parked wrecks ignore infantry brushes: only the blade (vehicle mass) or a
        // blast (explode wakes unconditionally) sets the bowling lane in motion.
        if (a.sleeping && V.len2(b.v) > 0.6 && !(a.kind === "wreck" && b.mass < 200)) { if (a.kind === "chunk") wake(a); else wakeIsland(world, a); }
        if (b.sleeping && V.len2(a.v) > 0.6 && !(b.kind === "wreck" && a.mass < 200)) { if (b.kind === "chunk") wake(b); else wakeIsland(world, b); }
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
    if (victim.kind === "unit" && other && other.mass > 200 && dv > 1.2) victim.hitT = world.t; // staggered by vehicles/heavy debris; squadmate shoulder-checks don't floor you
    if (victim.kind === "unit" && other && other.kind === "chunk" && other.fallingSince > 0 && world.t - other.fallingSince < 6 && dv > 0.8) victim.hitT = world.t; // flying masonry floors you at any weight
    if (victim.kind === "unit" && other && other.kind === "vehicle" && other.pos.y > victim.pos.y + 0.2 && pn > 60) {
      // a tank bearing down from above is not a wrestling match: instant CRUSH —
      if (victim.alive) applyDamage(world, victim, 1e6, { cause: CAUSE.CRUSH, attacker: other.id === world.bisonId ? "player" : "world" });
      // — and the hull grinds the body into the snow rather than beaching on it:
      // fast-forward the corpse's de-solidify clock so the tank settles in ~0.3s
      victim.deadT = Math.min(victim.deadT || world.t, world.t - 3.7);
    }
    if (victim.kind === "unit" && other && other.kind === "chunk" && pn > 5 &&
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
    } else if ((other.kind === "vehicle" || other.kind === "wreck") && V.len(other.v) > 2.0 && dv > 2.6 && victim.kind === "unit") {
      const att = other.driver === "player" ? "player" : world.t - other.lastPlayerTouch < 3.5 ? "player" : "world";
      dmg = dv * 18;
      info = { cause: CAUSE.CRUSH, attacker: att, killerId: other.id };
    } else if (dv > 8) {
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
    if (b.id === world.bisonId && b.grounded) {
      const blastFresh = b.lastImp && b.lastImp.src === "blast" && world.t - b.lastImp.t < 1.2;
      if (!blastFresh) {
        b.w.x *= 1 - Math.min(1, 6 * dt);
        b.w.z *= 1 - Math.min(1, 6 * dt);
        if (b.R[4] > 0.35 && b.R[4] < 0.995) {
          const tqx = b.R[5], tqz = -b.R[3]; // up x worldUp
          b.w.x += tqx * 2.2 * dt; b.w.z += tqz * 2.2 * dt;
        }
      }
    }
    if (b.kind === "unit" && b.alive) {
      // buried: masonry bearing from above kills by weight and time, not per-tick
      // impact — the pile wins in about a second; dig the load off and they recover.
      b.buryT = b.buriedNow ? (b.buryT || 0) + dt : Math.max(0, (b.buryT || 0) - 2 * dt);
      b.buriedNow = false;
      if (b.buryT > 1.1) applyDamage(world, b, 1e6, { cause: CAUSE.COLLAPSE, attacker: b.lastImp && world.t - b.lastImp.t < 6 ? b.lastImp.attacker : "world", buildingId: b.buriedBy || "" });
    }
    if (b.groundedNow) { b.airT = 0; b.grounded = true; } else { b.airT += dt; b.grounded = false; }
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
      if (b.sleepT > 0.55) { b.sleeping = true; V.set(b.v, 0, 0, 0); V.set(b.w, 0, 0, 0); }
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

// ==================================================================== render
const PAL = { bisonBlue: 0x33619c, scoutRed: 0x8a4a44, snow: 0xe9edf2, uiRed: 0xd8433a }; // player is blue steel; the enemy wears the red now
function makeGradientMap() {
  const d = new Uint8Array([70, 70, 70, 255, 128, 128, 128, 255, 190, 190, 190, 255, 255, 255, 255, 255]);
  const t = new THREE.DataTexture(d, 4, 1, THREE.RGBAFormat);
  t.minFilter = THREE.NearestFilter; t.magFilter = THREE.NearestFilter;
  t.generateMipmaps = false; t.needsUpdate = true;
  return t;
}
function makeSplat() {
  const cv = document.createElement("canvas");
  cv.width = 512; cv.height = 512;
  const cx = cv.getContext("2d");
  const paintBase = () => {
    cx.globalAlpha = 1; cx.fillStyle = "#f2f6fa"; cx.fillRect(0, 0, 512, 512);
    cx.fillStyle = "#e2eaf3";
    for (let i = 0; i < 900; i++) { const x = (i * 137) % 512, y = (i * 89 + ((i * i) % 7) * 31) % 512; cx.fillRect(x, y, 2, 2); }
    cx.fillStyle = "#cdd9e6";
    for (let i = 0; i < 260; i++) { const x = (i * 251) % 512, y = (i * 173 + ((i * i) % 11) * 17) % 512; cx.fillRect(x, y, 1, 1); }
    // ---- the town, painted into the base so a range reset repaints it ----
    // (feature-detected: the jsdom e2e canvas stub only implements what three
    // needs — path/arc calls on it would kill the mount)
    // ---- tactical grid: 4m minors, 20m majors, painted into the base so
    // range resets repaint it. fillRect only — it must draw under the jsdom
    // stub too (the feature-detect below bails before the town lanes). The
    // lines drape over the heightfield via the terrain UVs, so relief reads
    // at a glance: they bend over the hill and dive into the bowl.
    {
      const W2Ug = 512 / 188.7, U0g = 94.35;
      for (let gm = -92; gm <= 92; gm += 4) {
        const gp = Math.round((gm + U0g) * W2Ug);
        cx.fillStyle = gm % 20 === 0 ? "rgba(96,110,128,0.42)" : "rgba(139,152,168,0.26)";
        cx.fillRect(gp, 0, 1, 512);
        cx.fillRect(0, gp, 512, 1);
      }
    }
    if (!cx.beginPath || !cx.stroke || !cx.arc || !cx.strokeRect) return;
    const W2U = 512 / 188.7, U0 = 94.35; // world meters -> canvas px
    const uu = (x2) => (x2 + U0) * W2U, vv2 = (z2) => (z2 + U0) * W2U;
    const lane = (x0, z0, x1, z1, wm, col) => {
      cx.strokeStyle = col || "rgba(101,92,80,0.55)"; cx.lineCap = "round";
      cx.lineWidth = wm * W2U;
      cx.beginPath(); cx.moveTo(uu(x0), vv2(z0)); cx.lineTo(uu(x1), vv2(z1)); cx.stroke();
    };
    lane(0, -50, 0, 76, 7);                       // main street: spawn to convoy road
    for (const o of [-1.2, 1.2]) lane(o, -50, o, 76, 0.6, "rgba(66,58,48,0.35)"); // wheel ruts
    lane(-3.5, 2, 14, 2, 5);                      // cross street to the east houses
    lane(-3, -26, -20, -24, 5); lane(-20, -24, -20, -8, 6); // hangar drive
    lane(3.5, 41, 15, 41, 4);                     // warehouse spur
    cx.fillStyle = "rgba(150,143,132,0.45)";      // plaza around the keep
    cx.beginPath(); cx.arc(uu(-7), vv2(2), 8.5 * W2U, 0, Math.PI * 2); cx.fill();
    cx.strokeStyle = "rgba(140,128,110,0.4)"; cx.lineWidth = 6; // pond shore
    cx.strokeRect(uu(-8.6), vv2(19.4), 17.2 * W2U, 17.2 * W2U);
  };
  paintBase();
  const tex = new THREE.CanvasTexture(cv);
  tex.minFilter = THREE.NearestFilter; tex.magFilter = THREE.NearestFilter; tex.generateMipmaps = false;
  return {
    tex,
    clear() { paintBase(); tex.needsUpdate = true; },
    treads: 0,
    tread(u, v) {
      cx.globalAlpha = 1;
      cx.fillStyle = "rgba(52,42,32,0.42)"; // churned earth through the snow
      cx.fillRect(u - 1, v - 1, 2, 2);
      this.treads++;
      tex.needsUpdate = true;
    },
    scorch(u, v, rPx) {
      const g = cx.createRadialGradient(u, v, 1, u, v, rPx);
      g.addColorStop(0, "rgba(24,20,18,0.9)"); g.addColorStop(0.55, "rgba(38,32,28,0.55)"); g.addColorStop(1, "rgba(38,32,28,0)");
      cx.globalAlpha = 1; cx.fillStyle = g;
      cx.beginPath(); cx.arc(u, v, rPx, 0, Math.PI * 2); cx.fill();
      tex.needsUpdate = true;
    },
  };
}
const POST_VERT = "varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }";
const POST_FRAG = `
uniform sampler2D tCol; uniform sampler2D tNor; uniform sampler2D tDep; uniform sampler2D tBayer;
uniform vec2 uRes; uniform vec2 uShift; uniform float uOutline; uniform float uDither; uniform float uPalette; uniform float uLevels;
varying vec2 vUv;
void main(){
  vec2 px = 1.0 / uRes;
  vec2 uv = vUv + uShift * px;
  vec3 c = texture2D(tCol, uv).rgb;
  vec3 n0 = texture2D(tNor, uv).xyz;
  float d0 = texture2D(tDep, uv).x;
  vec3 nx = texture2D(tNor, uv + vec2(px.x, 0.0)).xyz;
  vec3 ny = texture2D(tNor, uv + vec2(0.0, px.y)).xyz;
  float dx = texture2D(tDep, uv + vec2(px.x, 0.0)).x;
  float dy = texture2D(tDep, uv + vec2(0.0, px.y)).x;
  float en = step(0.42, distance(n0, nx) + distance(n0, ny));
  float ed = step(0.0022, abs(d0 - dx) + abs(d0 - dy));
  float edge = max(en, ed) * uOutline;
  float bay = texture2D(tBayer, fract(uv * uRes / 4.0)).r - 0.5;
  vec3 q = floor(c * uLevels + bay * uDither + 0.5) / uLevels;
  c = mix(c, q, step(0.5, uPalette));
  c = mix(c, c * vec3(0.93, 0.97, 1.06), 0.35 * step(0.5, uPalette));
  c = mix(c, c * 0.2, edge);
  gl_FragColor = vec4(c, 1.0);
}`;
export function makeRenderer(canvas, world0) {
  let world = world0;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: "high-performance" });
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.BasicShadowMap;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xc4d2e0);
  scene.fog = new THREE.Fog(0xc4d2e0, 95, 230);
  const NORM_BG = new THREE.Color(0x8080ff);
  const grad = makeGradientMap();
  const toon = (color, extra) => Object.assign(new THREE.MeshToonMaterial({ color, gradientMap: grad }), extra || {});
  // camera: fixed RA orientation; only position moves (texel-snapped)
  const cam = new THREE.OrthographicCamera(-40, 40, 25, -25, 2, 400);
  const yawA = (194 * Math.PI) / 180, pitchA = (32 * Math.PI) / 180, camDist = 150;
  const back = { x: Math.sin(yawA) * Math.cos(pitchA), y: Math.sin(pitchA), z: Math.cos(yawA) * Math.cos(pitchA) };
  cam.position.set(back.x * camDist, back.y * camDist, back.z * camDist);
  cam.lookAt(0, 0, 0);
  cam.updateMatrixWorld();
  const camQ = cam.quaternion.clone();
  const camFwd = { x: -back.x, y: -back.y, z: -back.z };
  const camRight = new THREE.Vector3(1, 0, 0).applyQuaternion(camQ);
  const camUp = new THREE.Vector3(0, 1, 0).applyQuaternion(camQ);
  const R3 = (v) => ({ x: v.x, y: v.y, z: v.z });
  // lights
  const hemi = new THREE.HemisphereLight(0xe2ecf7, 0x7e8fa3, 0.62);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff0da, 0.92);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -60; sun.shadow.camera.right = 60;
  sun.shadow.camera.top = 60; sun.shadow.camera.bottom = -60;
  sun.shadow.camera.near = 5; sun.shadow.camera.far = 220;
  sun.shadow.bias = -0.002;
  scene.add(sun); scene.add(sun.target);
  // terrain
  const F = world.field;
  const Wd = (F.n - 1) * F.cs;
  const terraGeo = new THREE.PlaneGeometry(Wd, Wd, F.n - 1, F.n - 1);
  terraGeo.rotateX(-Math.PI / 2);
  const splat = makeSplat();
  const terraMat = toon(0xffffff); terraMat.map = splat.tex;
  const terra = new THREE.Mesh(terraGeo, terraMat);
  terra.receiveShadow = true;
  scene.add(terra);
  function syncTerrain() {
    const pa = terraGeo.attributes.position;
    for (let j = 0; j < F.n; j++) for (let i = 0; i < F.n; i++) pa.setY(j * F.n + i, F.h[j * F.n + i]);
    pa.needsUpdate = true;
    terraGeo.computeVertexNormals();
    // relief shading: the toon band collapses every slope under ~24° into the
    // same white, so hills and the pond bowl were physically there yet
    // invisible. Bake slope into vertex colors (steeper = darker), with a
    // cool tint below the waterline so the basin reads as a basin.
    let ca = terraGeo.attributes.color;
    if (!ca) {
      terraGeo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(F.n * F.n * 3), 3));
      ca = terraGeo.attributes.color;
      terraMat.vertexColors = true; terraMat.needsUpdate = true;
    }
    for (let j = 0; j < F.n; j++) for (let i = 0; i < F.n; i++) {
      const k = j * F.n + i;
      const iw = i > 0 ? k - 1 : k, ie = i < F.n - 1 ? k + 1 : k;
      const jn = j > 0 ? k - F.n : k, js = j < F.n - 1 ? k + F.n : k;
      const g = Math.hypot(F.h[ie] - F.h[iw], F.h[js] - F.h[jn]) / (2 * F.cs);
      const shade = 1 - Math.min(0.3, g * 0.62);
      const wet = F.h[k] < POOL.level - 0.15;
      ca.setXYZ(k, shade * (wet ? 0.84 : 1), shade * (wet ? 0.9 : 1), shade * (wet ? 0.98 : 1));
    }
    ca.needsUpdate = true;
    F.dirty = false;
  }
  syncTerrain();
  // water
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(POOL.x1 - POOL.x0, POOL.z1 - POOL.z0),
    new THREE.MeshBasicMaterial({ color: 0x2b4a5c, transparent: true, opacity: 0.82 })
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set((POOL.x0 + POOL.x1) / 2, POOL.level, (POOL.z0 + POOL.z1) / 2);
  water.layers.set(1);
  scene.add(water);
  // reticle
  const reticle = new THREE.Mesh(new THREE.RingGeometry(0.7, 1.05, 20), new THREE.MeshBasicMaterial({ color: 0xff6b5e, transparent: true, opacity: 1.0, depthWrite: false }));
  reticle.rotation.x = -Math.PI / 2; reticle.layers.set(1);
  scene.add(reticle);
  // volley strike marker: pulses at the painted point while the rockets fall
  const strikeRing = new THREE.Mesh(new THREE.RingGeometry(1.6, 2.1, 24), new THREE.MeshBasicMaterial({ color: 0xffa24a, transparent: true, opacity: 0, depthWrite: false }));
  strikeRing.rotation.x = -Math.PI / 2; strikeRing.layers.set(1); strikeRing.visible = false;
  scene.add(strikeRing);
  // trial focus marker: pulsing gold ring at the current objective
  let treadAcc = 0;
  // vehicles (individual groups by body id)
  const vehMap = new Map();
  function makeTreadTex() {
    const c = document.createElement("canvas"); c.width = 16; c.height = 4;
    const x = c.getContext("2d");
    x.fillStyle = "#1b1e22"; x.fillRect(0, 0, 16, 4);
    x.fillStyle = "#3a4048"; x.fillRect(0, 0, 3, 4); x.fillRect(8, 0, 3, 4);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = THREE.RepeatWrapping; t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(7, 1);
    t.minFilter = THREE.NearestFilter; t.magFilter = THREE.NearestFilter; t.generateMipmaps = false;
    return t;
  }
  function buildBison() {
    const g = new THREE.Group();
    const hull = new THREE.Mesh(new THREE.BoxGeometry(3.3, 1.5, 6.4), toon(PAL.bisonBlue));
    hull.position.y = 0.35;
    hull.castShadow = true; hull.receiveShadow = true; g.add(hull);
    const treadMats = [];
    for (const sx of [-1, 1]) {
      const tex = makeTreadTex();
      const tm = new THREE.MeshBasicMaterial({ map: tex, color: 0xffffff });
      treadMats.push(tm);
      const tread = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.15, 6.9), tm);
      tread.position.set(sx * 1.78, -0.42, 0); tread.castShadow = true; g.add(tread);
      for (const wz of [-2.5, -0.85, 0.85, 2.5]) {
        const wheel = new THREE.Mesh(new THREE.BoxGeometry(1.02, 0.62, 0.62), toon(0x101317));
        wheel.position.set(sx * 1.78, -0.62, wz); g.add(wheel);
      }
      const fender = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.16, 7.1), toon(0x1e3a56));
      fender.position.set(sx * 1.78, 0.28, 0); g.add(fender);
    }
    g.userData.treadMats = treadMats;
    const blade = new THREE.Mesh(new THREE.BoxGeometry(4.8, 1.15, 0.5), toon(0x777d84));
    blade.position.set(0, -0.45, 3.5); blade.rotation.x = -0.24; blade.castShadow = true; g.add(blade);
    const tur = new THREE.Group(); tur.position.y = 1.35;
    const turBox = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.95, 2.7), toon(0x2a5082)); turBox.castShadow = true; tur.add(turBox);
    const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.36, 3.6), toon(0x33383d)); barrel.position.set(0, 0.12, 2.4); barrel.castShadow = true; tur.add(barrel);
    const star = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.14, 0.9), toon(0xe0c34a)); star.position.set(0, 1.13, 0); g.add(star);
    // coax .50 stub riding right of the main gun
    const coax = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.5, 6), tur.material);
    coax.rotation.x = Math.PI / 2; coax.position.set(0.55, 0.3, 1.5);
    tur.add(coax);
    g.add(tur); g.userData.turret = tur;
    return g;
  }
  function buildTruck() {
    const g = new THREE.Group();
    const bed = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.0, 3.4), toon(0x4c5a49));
    bed.position.set(0, 0.15, -0.7); bed.castShadow = true; g.add(bed);
    const canvasTop = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.8, 3.2), toon(0x6b7565));
    canvasTop.position.set(0, 0.95, -0.7); canvasTop.castShadow = true; g.add(canvasTop);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.15, 1.5), toon(0x3f4c3e));
    cab.position.set(0, 0.2, 1.75); cab.castShadow = true; g.add(cab);
    for (const wz of [-1.6, 1.3]) for (const sx of [-1, 1]) {
      const wheel = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.75, 0.75), toon(0x15181c));
      wheel.position.set(sx * 1.05, -0.6, wz); g.add(wheel);
    }
    return g;
  }
  function buildScout() {
    const g = new THREE.Group();
    const hull = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.4, 3.7), toon(PAL.scoutRed));
    hull.castShadow = true; hull.receiveShadow = true; g.add(hull); g.userData.hull = hull;
    const top = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.6, 1.4), toon(0x6f3b36)); top.position.y = 1.0; top.castShadow = true; g.add(top); g.userData.top = top;
    return g;
  }
  // instanced pools
  const dummy = new THREE.Object3D();
  function pool(geo, mat, n, shadow) {
    const m = new THREE.InstancedMesh(geo, mat, n);
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    // instanceColor must exist BEFORE the first compile: USE_INSTANCING_COLOR is a
    // compile-time program key (WebGLPrograms: object.instanceColor !== null), and a
    // count-0 pool that compiles early locks the define out forever — setColorAt
    // then writes into a buffer no shader reads. Born white = identity multiply.
    m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(n * 3).fill(1), 3);
    m.instanceColor.setUsage(THREE.DynamicDrawUsage);
    m.count = 0; if (shadow) m.castShadow = true;
    scene.add(m);
    return m;
  }
  // table-driven infantry pools from the INFANTRY dress spec (one pool per part)
  const buildInfPools = (spec, n, pal) => spec.map((p) => {
    let g;
    if (p.cyl) { g = new THREE.CylinderGeometry(p.cyl[0], p.cyl[1], p.cyl[2], p.cyl[3], 1); if (p.rotY) g.rotateY(p.rotY); }
    else g = new THREE.BoxGeometry(p.box[0], p.box[1], p.box[2]);
    if (p.ty) g.translate(0, p.ty, 0);
    if (p.preRot) { g.rotateX(p.preRot[0]); g.rotateY(p.preRot[1]); g.rotateZ(p.preRot[2]); }
    // material stays WHITE: instanceColor MULTIPLIES material color in the shader,
    // so painting both squares the palette (rust^2 = brick, slate^2 = black — the
    // "pencil sketch soldiers" bug). instanceColor is the single source of color.
    const m = pool(g, toon(0xffffff), n, true);
    if (p.key === "coat" || p.key === "chest") m.receiveShadow = true;
    return m;
  });
  const conPools = buildInfPools(INFANTRY.con, 96, INFANTRY.pal.con);
  const grenPools = buildInfPools(INFANTRY.gren, 24, INFANTRY.pal.gren);
  const INF_LIVE = { con: {}, gren: {} }, INF_DEAD = { con: {}, gren: {} };
  for (const t of ["con", "gren"]) for (const k in INFANTRY.pal[t]) { INF_LIVE[t][k] = new THREE.Color(INFANTRY.pal[t][k]); INF_DEAD[t][k] = new THREE.Color(INFANTRY.dead[t][k]); }
  const _swq = new THREE.Quaternion(), _bq = new THREE.Quaternion(), _AXX = new THREE.Vector3(1, 0, 0);
  const chunkGeo = new THREE.BoxGeometry(1.2, 1.2, 1.2);
  const chunkMesh = pool(chunkGeo, toon(0xa6b2c0), 1000, true); // 865 stones live now (keep 84 + walls 240 + hangar 115 + warehouse 146 + houses 280)
  chunkMesh.receiveShadow = true;
  const iceMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.66, depthWrite: true });
  const _iceC = new THREE.Color();
  const _iceR = new Float32Array(80); // display envelope: fast attack, slow decay
  const iceMesh = pool(new THREE.BoxGeometry(1, 1, 1), iceMat, 80, false); // 8x8 sheet = 64 plates (the old 20 silently truncated)
  iceMesh.receiveShadow = false;
  const wreckTint = new THREE.Color(0x3c4046);
  const debrisMesh = pool(new THREE.BoxGeometry(0.18, 0.18, 0.18), toon(0x6a6f76), 200, false);
  const smokeMat = new THREE.MeshBasicMaterial({ color: 0x2c3036, transparent: true, opacity: 0.55, depthWrite: false });
  const smokeMesh = pool(new THREE.PlaneGeometry(1, 1), smokeMat, 128, false); smokeMesh.layers.set(1);
  const fireMat = new THREE.MeshBasicMaterial({ color: 0xffb257, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false });
  const fireMesh = pool(new THREE.PlaneGeometry(1, 1), fireMat, 96, false); fireMesh.layers.set(1);
  const tracerMat = new THREE.MeshBasicMaterial({ color: 0xffd27a, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false });
  const tracerMesh = pool(new THREE.BoxGeometry(0.09, 0.09, 1), tracerMat, 64, false); tracerMesh.layers.set(1);
  const blobMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.34, depthWrite: false });
  const blobMesh = pool(new THREE.CircleGeometry(1, 12), blobMat, 96, false); blobMesh.layers.set(1);

  // snowfall: instanced flakes drifting in a box around the camera focus
  const flakeMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, depthWrite: false });
  const flakeMesh = pool(new THREE.PlaneGeometry(0.14, 0.14), flakeMat, 220, false);
  flakeMesh.layers.set(1);
  const flakes = [];
  for (let i = 0; i < 220; i++) flakes.push({ x: (Math.random() - 0.5) * 64, y: Math.random() * 34, z: (Math.random() - 0.5) * 64, vy: 1.4 + Math.random() * 1.6, ph: Math.random() * 6.3 });

  // particles
  const debris = [], smoke = [], fire = [];
  function spawnBoom(x, y, z, r) {
    for (let i = 0; i < 12; i++) {
      if (debris.length >= 200) break;
      const a = Math.random() * Math.PI * 2, up = 3 + Math.random() * 6;
      debris.push({ x, y: y + 0.3, z, vx: Math.cos(a) * (2 + Math.random() * 5), vy: up, vz: Math.sin(a) * (2 + Math.random() * 5), rot: Math.random() * 6, spin: (Math.random() - 0.5) * 10, life: 1.3 + Math.random() * 0.5 });
    }
    for (let i = 0; i < 9; i++) {
      if (smoke.length >= 128) break;
      smoke.push({ x: x + (Math.random() - 0.5) * r * 0.5, y: y + 0.4, z: z + (Math.random() - 0.5) * r * 0.5, vy: 1.6 + Math.random() * 1.4, s: 0.8 + Math.random() * 0.9, life: 1.5 + Math.random() * 0.7, age: 0 });
    }
    for (let i = 0; i < 6; i++) {
      if (fire.length >= 96) break;
      fire.push({ x: x + (Math.random() - 0.5) * r * 0.4, y: y + 0.3 + Math.random() * 0.6, z: z + (Math.random() - 0.5) * r * 0.4, s: 0.7 + Math.random() * r * 0.35, life: 0.32, age: 0 });
    }
  }
  function puff(x, y, z, n, col) {
    for (let i = 0; i < n; i++) {
      if (smoke.length >= 128) break;
      smoke.push({ x: x + (Math.random() - 0.5) * 0.8, y, z: z + (Math.random() - 0.5) * 0.8, vy: 1.2, s: 0.5 + Math.random() * 0.5, life: 0.9, age: 0, col });
    }
  }
  // post pipeline
  const bayerTex = new THREE.DataTexture(new Uint8Array(BAYER4.flatMap((v) => [v * 17, v * 17, v * 17, 255])), 4, 4, THREE.RGBAFormat);
  bayerTex.minFilter = THREE.NearestFilter; bayerTex.magFilter = THREE.NearestFilter;
  bayerTex.wrapS = THREE.RepeatWrapping; bayerTex.wrapT = THREE.RepeatWrapping; bayerTex.needsUpdate = true;
  const postScene = new THREE.Scene();
  const postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const postMat = new THREE.ShaderMaterial({
    vertexShader: POST_VERT, fragmentShader: POST_FRAG,
    uniforms: {
      tCol: { value: null }, tNor: { value: null }, tDep: { value: null }, tBayer: { value: bayerTex },
      uRes: { value: new THREE.Vector2(320, 200) }, uShift: { value: new THREE.Vector2(0, 0) },
      uOutline: { value: 1 }, uDither: { value: 1 }, uPalette: { value: 1 }, uLevels: { value: 7 },
    },
    depthTest: false, depthWrite: false,
  });
  postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), postMat));
  const normMat = new THREE.MeshNormalMaterial();
  let rtColor = null, rtNormal = null, rtW = 320, rtH = 200;
  const gfx = { scale: 1, outline: 1, dither: 1, palette: 1 }; // 1x default: crisp pixels at phone DPI, retro treatment kept
  let cssW = 0, cssH = 0, halfH = 22, halfW = 36, zoom = 1;
  function applyFrustum() {
    const a = cssW / Math.max(1, cssH);
    if (a >= 1) { halfH = 22 / zoom; halfW = halfH * a; }
    else { halfW = 18.5 / zoom; halfH = Math.min(halfW / a, halfW * 2.9); }
    cam.left = -halfW; cam.right = halfW; cam.top = halfH; cam.bottom = -halfH;
    cam.updateProjectionMatrix();
  }
  function rebuildRTs() {
    const w = Math.max(64, Math.floor(cssW / gfx.scale));
    const h = Math.max(64, Math.floor(cssH / gfx.scale));
    rtW = w; rtH = h;
    if (rtColor) { rtColor.dispose(); rtNormal.dispose(); }
    const depthTexture = new THREE.DepthTexture(w, h);
    rtColor = new THREE.WebGLRenderTarget(w, h, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthBuffer: true, depthTexture });
    rtNormal = new THREE.WebGLRenderTarget(w, h, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthBuffer: true });
    postMat.uniforms.tCol.value = rtColor.texture;
    postMat.uniforms.tDep.value = rtColor.depthTexture;
    postMat.uniforms.tNor.value = rtNormal.texture;
    postMat.uniforms.uRes.value.set(w, h);
  }
  function resize() {
    const w = canvas.clientWidth || +(canvas.dataset && canvas.dataset.w) || 960;
    const h = canvas.clientHeight || +(canvas.dataset && canvas.dataset.h) || 600;
    if (w === cssW && h === cssH) return;
    cssW = w; cssH = h;
    renderer.setSize(w, h, false);
    applyFrustum();
    rebuildRTs();
  }
  function setZoom(z) {
    zoom = Math.max(0.7, Math.min(2, z));
    applyFrustum();
  }
  function setGfx(p) {
    if (p.preset === "retro") Object.assign(gfx, { scale: 3, outline: 1, dither: 1, palette: 1 });
    else if (p.preset === "clean") Object.assign(gfx, { scale: 2, outline: 1, dither: 0, palette: 1 });
    if (p.scale) gfx.scale = Math.max(1, Math.min(4, p.scale | 0));
    for (const k of ["outline", "dither", "palette"]) if (p[k] != null) gfx[k] = p[k] ? 1 : 0;
    postMat.uniforms.uOutline.value = gfx.outline;
    postMat.uniforms.uDither.value = gfx.dither;
    postMat.uniforms.uPalette.value = gfx.palette;
    rebuildRTs();
  }
  let shake = 0;
  function consume(events) {
    for (const e of events) {
      if (e.type === "boom") {
        spawnBoom(e.x, e.y, e.z, e.r);
        shake = Math.min(2.4, shake + 0.5 + e.r * 0.18);
      } else if (e.type === "splat") {
        const u = ((e.x + F.half) / Wd) * 512, v = ((e.z + F.half) / Wd) * 512;
        splat.scorch(u, v, (e.r / Wd) * 512);
      } else if (e.type === "muzzle") {
        fire.push({ x: e.x, y: e.y, z: e.z, s: 1.1, life: 0.12, age: 0 });
        shake = Math.min(2.4, shake + 0.25);
      } else if (e.type === "gmuzzle") {
        fire.push({ x: e.x, y: e.y + 0.4, z: e.z, s: 0.8, life: 0.1, age: 0 });
      } else if (e.type === "weldbreak") puff(e.x, e.y, e.z, e.ice ? 3 : 2, e.ice ? 0xe8f4fb : 0x8a8f96);
      else if (e.type === "splash") puff(e.x, POOL.level + 0.2, e.z, 4, 0x9fc4d8);
    }
  }
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3();
  function writeInst(mesh, i, x, y, z, q, sx, sy, sz) {
    dummy.position.set(x, y, z);
    if (q) dummy.quaternion.set(q.x, q.y, q.z, q.w); else dummy.quaternion.identity();
    dummy.scale.set(sx, sy, sz);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }
  function render(dt, focus, aim, turretYaw) {
    resize();
    if (F.dirty) syncTerrain();
    // vehicles sync
    for (const b of world.bodies) {
      if (b.kind !== "vehicle" && b.kind !== "wreck") continue;
      let g = vehMap.get(b.id);
      if (!g) {
        g = b.id === world.bisonId ? buildBison() : (b.vtype === "truck" ? buildTruck() : buildScout());
        vehMap.set(b.id, g); scene.add(g);
      }
      g.position.set(b.pos.x, b.pos.y, b.pos.z);
      g.quaternion.set(b.q.x, b.q.y, b.q.z, b.q.w);
      if ((b.kind === "wreck" || (b.kind === "truck" && !b.alive)) && !g.userData.dead) {
        g.userData.dead = true;
        g.traverse((o) => { if (o.isMesh) { o.material = o.material.clone(); o.material.color.lerp(wreckTint, 0.75); } });
      }
      if (g.userData.turret) g.userData.turret.rotation.y = turretYaw;
    }
    for (const [id, g] of vehMap) if (!world.byId.has(id)) { scene.remove(g); vehMap.delete(id); }
    // units: table-driven multi-part infantry with a speed-keyed march swing.
    // Limb quats compose body * local-X(phase); dead men freeze mid-stride and
    // take the winter-kill tint per role.
    let ci = 0, gi = 0;
    for (const b of world.bodies) {
      if (b.kind !== "unit") continue;
      const R = b.R;
      const isG = b.utype === "gren";
      if (isG ? gi >= 24 : ci >= 96) continue;
      const sp = b.alive ? Math.hypot(b.v.x, b.v.z) : 0;
      b.wph = (b.wph || 0) + sp * dt * 3.4;
      const sw = Math.sin(b.wph) * Math.min(0.5, sp * 0.24);
      const spec = isG ? INFANTRY.gren : INFANTRY.con;
      const pools = isG ? grenPools : conPools;
      const idx = isG ? gi : ci;
      for (let pi = 0; pi < spec.length; pi++) {
        const p = spec[pi], o = p.off;
        const px = b.pos.x + R[0] * o[0] + R[3] * o[1] + R[6] * o[2];
        const py = b.pos.y + R[1] * o[0] + R[4] * o[1] + R[7] * o[2];
        const pz = b.pos.z + R[2] * o[0] + R[5] * o[1] + R[8] * o[2];
        let q = b.q;
        if (p.swing) {
          _bq.set(b.q.x, b.q.y, b.q.z, b.q.w);
          _swq.setFromAxisAngle(_AXX, sw * p.swing * p.swingK);
          _bq.multiply(_swq);
          q = _bq;
        }
        writeInst(pools[pi], idx, px, py, pz, q, 1, 1, 1);
        if (pools[pi].setColorAt) pools[pi].setColorAt(idx, (b.alive ? INF_LIVE : INF_DEAD)[isG ? "gren" : "con"][p.role]);
      }
      if (isG) gi++; else ci++;
    }
    for (const m of conPools) { m.count = ci; m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; }
    for (const m of grenPools) { m.count = gi; m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; }
    // chunks
    let ki = 0;
    for (const b of world.bodies) {
      if (b.kind !== "chunk" || ki >= 1000) continue;
      writeInst(chunkMesh, ki, b.pos.x, b.pos.y, b.pos.z, b.q, b.hx / 0.6, b.hy / 0.6, b.hz / 0.6);
      ki++;
    }
    chunkMesh.count = ki; chunkMesh.instanceMatrix.needsUpdate = true;
    // ice plates — tinted by how close their welds are to failing (shock or creep)
    let ip = 0;
    if (world.ice) {
      for (const b of world.bodies) {
        if (b.kind !== "ice" || ip >= 80) continue;
        writeInst(iceMesh, ip, b.pos.x, b.pos.y, b.pos.z, b.q, b.hx * 2, b.hy * 2, b.hz * 2);
        let r = 0;
        for (const wd of world.welds) {
          if (wd.broken || (wd.a !== b && wd.b !== b)) continue;
          // danger begins at the creep threshold; full slate is the creep countdown itself
          const sr = Math.max(((wd.stress || 0) / ICE_CREEP) * 0.75, (wd.hiT || 0) / ICE_CREEP_T);
          if (sr > r) r = sr;
        }
        r = Math.pow(Math.min(1, r), 0.6);
        r = Math.max(r, _iceR[ip] - 3.0 * dt);
        _iceR[ip] = r;
        _iceC.setRGB(0.851 + (0.329 - 0.851) * r, 0.929 + (0.42 - 0.929) * r, 0.965 + (0.49 - 0.965) * r);
        iceMesh.setColorAt(ip, _iceC);
        ip++;
      }
      if (iceMesh.instanceColor) iceMesh.instanceColor.needsUpdate = true;
    }
    iceMesh.count = ip; iceMesh.instanceMatrix.needsUpdate = true;
    // debris/smoke/fire step
    let di = 0;
    for (let i = debris.length - 1; i >= 0; i--) {
      const p = debris[i];
      p.life -= dt; p.vy -= 9.8 * dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.rot += p.spin * dt;
      const h = F.heightAt(p.x, p.z);
      if (p.y < h + 0.09) { p.y = h + 0.09; p.vy *= -0.3; p.vx *= 0.6; p.vz *= 0.6; p.spin *= 0.5; }
      if (p.life <= 0) { debris.splice(i, 1); continue; }
      const s = Math.min(1, p.life * 2);
      dummy.position.set(p.x, p.y, p.z); dummy.quaternion.setFromEuler(new THREE.Euler(p.rot, p.rot * 0.7, 0));
      dummy.scale.set(s, s, s); dummy.updateMatrix();
      if (di < 200) chunkFillDebris(di++, dummy.matrix);
    }
    function chunkFillDebris(i, m) { debrisMesh.setMatrixAt(i, m); }
    debrisMesh.count = di; debrisMesh.instanceMatrix.needsUpdate = true;
    let si = 0;
    for (let i = smoke.length - 1; i >= 0; i--) {
      const p = smoke[i];
      p.age += dt; p.y += p.vy * dt;
      if (p.age >= p.life) { smoke.splice(i, 1); continue; }
      const t = p.age / p.life, s = p.s * (0.6 + t * 1.8);
      dummy.position.set(p.x, p.y, p.z); dummy.quaternion.copy(camQ);
      dummy.scale.set(s, s, 1); dummy.updateMatrix();
      if (si < 128) smokeMesh.setMatrixAt(si++, dummy.matrix);
    }
    smokeMesh.count = si; smokeMesh.instanceMatrix.needsUpdate = true;
    let fi = 0;
    for (let i = fire.length - 1; i >= 0; i--) {
      const p = fire[i];
      p.age += dt;
      if (p.age >= p.life) { fire.splice(i, 1); continue; }
      const t = 1 - p.age / p.life, s = p.s * (0.7 + t);
      dummy.position.set(p.x, p.y, p.z); dummy.quaternion.copy(camQ);
      dummy.scale.set(s, s, 1); dummy.updateMatrix();
      if (fi < 96) fireMesh.setMatrixAt(fi++, dummy.matrix);
    }
    fireMesh.count = fi; fireMesh.instanceMatrix.needsUpdate = true;
    // tracers from live projectiles
    let ti = 0;
    for (const p of world.projectiles) {
      if (ti >= 64 || (p.spec.delay && p.spec.delay > 0)) continue;
      const L = Math.hypot(p.v.x, p.v.y, p.v.z) || 1;
      dummy.position.set(p.pos.x, p.pos.y, p.pos.z);
      dummy.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(p.v.x / L, p.v.y / L, p.v.z / L));
      dummy.scale.set(1, 1, 1.8); dummy.updateMatrix();
      tracerMesh.setMatrixAt(ti++, dummy.matrix);
    }
    tracerMesh.count = ti; tracerMesh.instanceMatrix.needsUpdate = true;
    // blob shadows for airborne bodies
    let bi = 0;
    for (const b of world.bodies) {
      if (bi >= 96 || b.invM === 0 || b.sleeping) continue;
      if (b.airT < 0.06) continue;
      const h = F.heightAt(b.pos.x, b.pos.z);
      dummy.position.set(b.pos.x, h + 0.04, b.pos.z);
      dummy.quaternion.setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
      const fp = Math.max(b.hx, b.hz) * 1.15;
      dummy.scale.set(fp, fp, 1); dummy.updateMatrix();
      blobMesh.setMatrixAt(bi++, dummy.matrix);
    }
    blobMesh.count = bi; blobMesh.instanceMatrix.needsUpdate = true;
    // snowfall drifts around the focus, wrapping in a 64x34x64 box
    for (let i = 0; i < flakes.length; i++) {
      const fk = flakes[i];
      fk.y -= fk.vy * dt;
      fk.x += Math.sin(fk.ph + fk.y * 0.4) * 0.35 * dt;
      if (fk.y < 0) { fk.y += 34; fk.x = (Math.random() - 0.5) * 64; fk.z = (Math.random() - 0.5) * 64; }
      writeInst(flakeMesh, i, focus.x + fk.x, focus.y + fk.y - 4, focus.z + fk.z, camQ, 1, 1, 1);
    }
    flakeMesh.count = flakes.length;
    flakeMesh.instanceMatrix.needsUpdate = true;

    // bison treads: scroll links with track speed, stamp marks into the splat
    const bb = world.byId.get(world.bisonId);
    const bmesh = bb ? vehMap.get(bb.id) : null;
    if (bb && bmesh && bmesh.userData.treadMats) {
      const fx = bb.R[6], fz = bb.R[8];
      const vF = bb.v.x * fx + bb.v.z * fz;
      const sL = vF + bb.w.y * 1.78, sR = vF - bb.w.y * 1.78;
      bmesh.userData.treadMats[0].map.offset.x -= sL * dt * 0.42;
      bmesh.userData.treadMats[1].map.offset.x -= sR * dt * 0.42;
      const sp = Math.hypot(bb.v.x, bb.v.z);
      if (bb.R[4] > 0.5 && sp > 0.5) {
        treadAcc += sp * dt;
        if (treadAcc > 0.34) {
          treadAcc = 0;
          const sxr = bb.R[0], szr = bb.R[2];
          for (const sgn of [-1, 1]) {
            const px = bb.pos.x + sxr * 1.78 * sgn, pz = bb.pos.z + szr * 1.78 * sgn;
            splat.tread(((px + F.half) / Wd) * 512, ((pz + F.half) / Wd) * 512);
          }
        }
      }
    }
    // reticle + beam + trial ring
    reticle.position.set(aim.x, F.heightAt(aim.x, aim.z) + 0.06, aim.z);
    const sk = world.strikeAt;
    if (sk && world.t < sk.until) {
      const ph = 1 - (sk.until - world.t) / 1.35;
      strikeRing.visible = true;
      strikeRing.position.set(sk.x, F.heightAt(sk.x, sk.z) + 0.08, sk.z);
      const sc = 1 + 0.35 * Math.sin(world.t * 18);
      strikeRing.scale.set(sc, sc, 1);
      strikeRing.material.opacity = 0.55 + 0.4 * (1 - ph);
    } else strikeRing.visible = false;
    // camera: snap position to view texels; residual + shake go to screen shift
    shake = Math.max(0, shake - dt * 4.2);
    const texel = (2 * halfW) / rtW;
    const desired = { x: focus.x + back.x * camDist, y: focus.y + back.y * camDist, z: focus.z + back.z * camDist };
    const sr = snapCam(desired, R3(camRight), R3(camUp), camFwd, texel);
    cam.position.set(sr.pos.x, sr.pos.y, sr.pos.z);
    cam.quaternion.copy(camQ);
    const shx = (Math.random() - 0.5) * shake * 2.2, shy = (Math.random() - 0.5) * shake * 2.2;
    postMat.uniforms.uShift.value.set(-sr.errX + shx, -sr.errY + shy);
    // sun rig follows focus
    sun.position.set(focus.x + 38, focus.y + 52, focus.z + 22);
    sun.target.position.set(focus.x, focus.y, focus.z);
    // pass 1: color+depth
    cam.layers.enable(1);
    renderer.setRenderTarget(rtColor);
    renderer.render(scene, cam);
    // pass 2: normals (layer 0 only)
    cam.layers.set(0);
    scene.overrideMaterial = normMat;
    const bg = scene.background; scene.background = NORM_BG;
    renderer.setRenderTarget(rtNormal);
    renderer.render(scene, cam);
    scene.overrideMaterial = null; scene.background = bg;
    cam.layers.enable(1);
    // pass 3: post to screen
    renderer.setRenderTarget(null);
    renderer.render(postScene, postCam);
  }
  function setWorld(nw) {
    world = nw;
    for (const [, g] of vehMap) scene.remove(g);
    vehMap.clear();
    debris.length = 0; smoke.length = 0; fire.length = 0;
    splat.clear();
    syncTerrain();
  }
  resize(); rebuildRTs();
  const project = (x, y, z) => { const v = new THREE.Vector3(x, y, z); v.project(cam); return { x: v.x, y: v.y }; };
  return { render, consume, setGfx, setZoom, setWorld, gfx, dispose() { renderer.dispose(); }, _cam: cam, project, _splat: splat, _ice: iceMesh, camBasis: { right: camRight, up: camUp, fwd: camFwd, halfW: () => halfW, halfH: () => halfH } };
}

// ================================================================= component
const PHYS_CAUSES = new Set([CAUSE.CRUSH, CAUSE.TOSS, CAUSE.COLLAPSE, CAUSE.FLIP, CAUSE.DROWN]);
function detectTouch() {
  if (typeof window === "undefined") return false;
  try { if (window.matchMedia && window.matchMedia("(pointer: coarse)").matches) return true; } catch (e) {}
  const fine = (() => { try { return window.matchMedia && window.matchMedia("(pointer: fine)").matches; } catch (e) { return false; } })();
  return (navigator.maxTouchPoints || 0) > 0 && !fine;
}
const LABEL_COLORS = { PROJECTILE: "#ffb45e", BLAST: "#ff6b5e", CRUSH: "#ffd27a", TOSS: "#c9f06c", COLLAPSE: "#e0e6ee", FLIP: "#b48cff", DROWN: "#7fd7ff", IMPACT: "#ff9e9e" };
function makeAudio() {
  let ctx = null, muted = true;
  const ensure = () => {
    try {
      if (!ctx) { const AC = window.AudioContext || window.webkitAudioContext; if (AC) ctx = new AC(); }
      if (ctx && ctx.state === "suspended") ctx.resume().catch(() => {});
    } catch (e) {}
  };
  const blip = (f0, f1, dur, type, gain) => {
    if (muted || !ctx) return;
    try {
      const t = ctx.currentTime;
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type; o.frequency.setValueAtTime(f0, t);
      o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
      g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + dur);
    } catch (e) {}
  };
  const thud = (dur, gain, fc) => {
    if (muted || !ctx) return;
    try {
      const t = ctx.currentTime, n = Math.floor(ctx.sampleRate * dur);
      const buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
      const src = ctx.createBufferSource(); src.buffer = buf;
      const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = fc;
      const g = ctx.createGain(); g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(f).connect(g).connect(ctx.destination); src.start(t);
    } catch (e) {}
  };
  return {
    ensure,
    setMuted(m) { muted = m; }, get muted() { return muted; },
    fire() { blip(150, 55, 0.12, "square", 0.22); thud(0.09, 0.18, 900); },
    boom() { thud(0.32, 0.42, 320); blip(85, 28, 0.28, "sine", 0.32); },
    splash() { thud(0.22, 0.26, 1500); blip(560, 190, 0.16, "sine", 0.12); },
    kill() { blip(760, 1180, 0.06, "square", 0.09); },
    crack() { blip(1500, 300, 0.05, "square", 0.1); thud(0.05, 0.12, 2500); },
    trial() { blip(523, 784, 0.14, "square", 0.16); setTimeout(() => blip(784, 1046, 0.2, "square", 0.16), 130); },
    hook() { blip(200, 900, 0.4, "sawtooth", 0.14); },
  };
}
const TRIALS = [
  { id: "gunnery", title: "GUNNERY", need: 3, par: [10, 18], hint: "Reticle on them — hold FIRE", focus: () => ({ x: STATIONS.gunnery.x, z: STATIONS.gunnery.z, r: 5 }), setup: (w) => w.pg.respawnSquad("gunnery"), match: (e) => e.attacker === "player" && (e.cause === CAUSE.BLAST || e.cause === CAUSE.PROJECTILE) && e.group === "gunnery" },
  { id: "roadkill", title: "ROADKILL", need: 2, par: [9, 16], hint: "Drive through the line with the stick", focus: () => ({ x: STATIONS.roadlane.x, z: STATIONS.roadlane.z, r: 7 }), setup: (w) => w.pg.respawnSquad("roadlane"), match: (e) => e.cause === CAUSE.CRUSH && e.attacker === "player" },
  { id: "saturation", title: "SATURATION FIRE", need: 3, par: [10, 20], hint: "ONE volley, 3 kills — aim, press VOLLEY", focus: () => ({ x: STATIONS.gunnery.x, z: STATIONS.gunnery.z, r: 5 }), setup: (w) => w.pg.respawnSquad("gunnery"), volley: true },
  { id: "demolition", title: "DEMOLITION MAN", need: 1, par: [12, 22], hint: "Breach the keep — bury the garrison inside", focus: () => ({ x: STATIONS.garrison.x, z: STATIONS.garrison.z, r: 5 }), setup: (w) => { w.pg.repairGarrison(); w.pg.respawnSquad("demo"); }, match: (e) => e.cause === CAUSE.COLLAPSE },
  { id: "deep_end", title: "THE DEEP END", need: 1, par: [15, 28], hint: "Plow them into the pool — ease off, brake at the lip", focus: () => ({ x: STATIONS.poolside.x, z: STATIONS.poolside.z, r: 5 }), setup: (w) => { thawPool(w); w.pg.respawnSquad("poolside"); }, match: (e) => e.cause === CAUSE.DROWN },
  { id: "counter_battery", title: "COUNTER-BATTERY", need: 3, par: [16, 30], hint: "Mortars on the ridge — they shoot back. Silence all three.", focus: () => ({ x: STATIONS.pit.x, z: STATIONS.pit.z, r: 6 }), setup: (w) => w.pg.respawnSquad("pit"), match: (e) => e.group === "pit" },
  { id: "thin_ice", title: "THIN ICE", need: 3, par: [12, 24], hint: "The pond is frozen and the drill squad is on it. Clear them off — any way that works.", focus: () => ({ x: 0, z: 28, r: 7 }), setup: (w) => {
    for (let i = w.bodies.length - 1; i >= 0; i--) if (w.bodies[i].group === "ponddrill") { w.byId.delete(w.bodies[i].id); w.bodies.splice(i, 1); }
    freezePool(w);
    for (let i = 0; i < 6; i++) {
      const x = -3 + (i % 3) * 3, z = 25 + Math.floor(i / 3) * 5;
      addBody(w, { kind: "unit", team: 2, group: "ponddrill", mass: 82, hx: 0.26, hy: 0.86, hz: 0.26, x, z, y: 1.132 + 0.88, hp: 30, friction: 0.55 });
    }
    // any-kill experiment (was DROWN-only precision-by-design): every drown
  // still counts as before, plus any player-attributed kill — dead is dead.
  }, match: (e) => e.group === "ponddrill" }, // any-kill: shards, drowning, blast — the hint promises "any way that works", and the drill squad is provably inert unprovoked
];
export default function ColdsnapProvingGrounds() {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const stateRef = useRef(null);
  const [hud, setHud] = useState({ fps: 0, bodies: 0, tally: {}, feed: [], achUnlocked: [], toasts: [], total: 0, cds: { fire: 0, volley: 0 }, flipped: false, iceOn: false, medals: {}, trial: { idx: 0, prog: 0, flashT: 0, free: false, el: 0 } });
  const [fatal, setFatal] = useState(null);
  const [started, setStarted] = useState(false);
  const [achOpen, setAchOpen] = useState(false);
  const [gfxOpen, setGfxOpen] = useState(false);
  const [isTouch] = useState(detectTouch);
  const [gfxUi, setGfxUi] = useState(() => ({ preset: "retro", scale: 1, outline: 1, dither: 1, palette: 1 })); // 1x everywhere: crisp at phone DPI, retro treatment kept. This state is the REAL default — it overwrites the renderer seed on mount.
  const joyBaseRef = useRef(null);
  const joyKnobRef = useRef(null);
  const labelLayerRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      document.documentElement.style.height = "100%";
      document.body.style.height = "100%";
      document.body.style.margin = "0";
      document.body.style.overflow = "hidden";
      document.documentElement.style.overscrollBehavior = "none";
      document.body.style.overscrollBehavior = "none";
    } catch (e) {}
    let world, R;
    try {
      world = buildProvingGrounds(1234);
      R = makeRenderer(canvas, world);
      R.setGfx({ scale: gfxUi.scale, outline: gfxUi.outline, dither: gfxUi.dither, palette: gfxUi.palette });
    } catch (err) {
      console.error("COLDSNAP boot failed", err);
      setFatal(String((err && err.message) || err));
      return;
    }
    const S = {
      world, R, keys: {}, ndc: { x: 0, y: 0 }, aim: { x: 0, z: 0 },
      focus: { x: 0, y: 2.2, z: -26 }, acc: 0, last: performance.now(),
      hitstop: 0, tally: {}, feed: [], toasts: [], toastSeq: 1,
      frames: 0, fpsT: 0, fps: 0, hudT: 0, resets: 0, savedCount: -1, running: true,
      cds: { fire: 0, volley: 0, recover: 0, mg: 0 }, zoom: 1,
      isTouch, touch: { joyId: null, jx: 0, jy: 0, drive: { t: 0, s: 0 }, aimId: null, ax: 0, ay: 0, moved: 0, downT: 0, pts: new Map() },
      trial: { idx: 0, prog: 0, flashT: 0, t0: 0, volleyCounts: new Map() },
      medals: {}, labels: [], audio: makeAudio(),
    };
    stateRef.current = S;
    const persistLoad = async () => {
      try {
        const r = await window.storage.get("coldsnap-ach");
        if (r && r.value && S.running) {
          const d = JSON.parse(r.value);
          for (const id of d.unlocked || []) S.world.ach.unlocked.add(id);
          S.world.ach.total = Math.max(S.world.ach.total, d.total || 0);
          S.savedCount = S.world.ach.unlocked.size;
        }
      } catch (e) { S.savedCount = S.world.ach.unlocked.size; }
    };
    persistLoad();
    const enterTrial = (idx) => {
      S.trial.idx = idx; S.trial.prog = 0; S.trial.volleyCounts = new Map();
      S.trial.t0 = S.world.t;
      const t = TRIALS[idx];
      if (t) { try { t.setup(S.world); } catch (e) {} S.world.trialFocus = t.focus(); }
      else S.world.trialFocus = null;
    };
    const MEDAL = (t, el) => (el <= t.par[0] ? "GOLD" : el <= t.par[1] ? "SILVER" : "BRONZE");
    const advanceTrial = (skipped) => {
      S.audio.trial();
      const t = TRIALS[S.trial.idx];
      if (t) {
        let title = "TRIAL COMPLETE — " + t.title;
        const desc = TRIALS[S.trial.idx + 1] ? "Next: " + TRIALS[S.trial.idx + 1].title : "FREE PLAY unlocked";
        if (!skipped) {
          const el = Math.max(0.1, S.world.t - S.trial.t0);
          const m = MEDAL(t, el);
          title += ` · ${el.toFixed(1)}s ${m === "GOLD" ? "★GOLD" : m === "SILVER" ? "☆SILVER" : "BRONZE"}`;
          const prev = S.medals[t.id];
          if (!prev || el < prev.time) {
            S.medals[t.id] = { time: +el.toFixed(1), medal: m };
            try { window.storage.set("coldsnap-medals", JSON.stringify(S.medals)); } catch (e) {}
          }
        }
        S.toasts.push({ id: S.toastSeq++, title, desc, t: 4 });
      }
      S.trial.flashT = 1.6;
      enterTrial(S.trial.idx + 1);
      try { window.storage.set("coldsnap-trial", String(S.trial.idx)); } catch (e) {}
    };
    const trialLoad = async () => {
      try {
        const rm = await window.storage.get("coldsnap-medals");
        const mm = JSON.parse(rm.value);
        if (mm && typeof mm === "object") S.medals = mm;
      } catch (e) {}
      try {
        const r = await window.storage.get("coldsnap-trial");
        const idx = Math.max(0, Math.min(TRIALS.length, parseInt(r.value, 10) || 0));
        if (S.running) enterTrial(idx);
      } catch (e) { if (S.running) enterTrial(0); }
    };
    trialLoad();
    const onTrialKill = (e) => {
      const t = TRIALS[S.trial.idx];
      if (!t) return;
      if (t.volley) {
        if (!e.volley) return;
        const c = (S.trial.volleyCounts.get(e.volley) || 0) + 1;
        S.trial.volleyCounts.set(e.volley, c);
        S.trial.prog = Math.max(S.trial.prog, c);
        if (c >= t.need) advanceTrial();
      } else if (t.match(e)) {
        S.trial.prog++;
        if (S.trial.prog >= t.need) advanceTrial();
      }
    };
    const persistSave = () => {
      const a = S.world.ach;
      if (a.unlocked.size === S.savedCount) return;
      S.savedCount = a.unlocked.size;
      try { window.storage.set("coldsnap-ach", JSON.stringify({ unlocked: [...a.unlocked], total: a.total })); } catch (e) {}
    };
    const groundPoint = (nx, ny) => {
      const cb = R.camBasis;
      const cp = R._cam.position;
      const o = {
        x: cp.x + cb.right.x * nx * cb.halfW() + cb.up.x * ny * cb.halfH(),
        y: cp.y + cb.right.y * nx * cb.halfW() + cb.up.y * ny * cb.halfH(),
        z: cp.z + cb.right.z * nx * cb.halfW() + cb.up.z * ny * cb.halfH(),
      };
      const d = cb.fwd;
      let t0 = 0, t1 = 380, prev = o.y - S.world.field.heightAt(o.x, o.z), hitT = -1;
      for (let t = 6; t <= 380; t += 6) {
        const x = o.x + d.x * t, y = o.y + d.y * t, z = o.z + d.z * t;
        const f = y - S.world.field.heightAt(x, z);
        if (prev > 0 && f <= 0) { t0 = t - 6; t1 = t; hitT = t; break; }
        prev = f;
      }
      if (hitT < 0) { const t = (o.y - 2.2) / -d.y; return { x: o.x + d.x * t, z: o.z + d.z * t }; }
      for (let k = 0; k < 18; k++) {
        const m = (t0 + t1) / 2;
        const y = o.y + d.y * m - S.world.field.heightAt(o.x + d.x * m, o.z + d.z * m);
        if (y > 0) t0 = m; else t1 = m;
      }
      return { x: o.x + d.x * t1, z: o.z + d.z * t1 };
    };
    const doReset = () => {
      S.resets++;
      const keep = S.world.ach;
      S.world = buildProvingGrounds(1234 + S.resets);
      S.world.ach.unlocked = keep.unlocked; S.world.ach.total = keep.total;
      R.setWorld(S.world);
      S.tally = {}; S.feed = [];
      enterTrial(S.trial.idx);
    };
    const onKill = (e) => {
      S.tally[e.cause] = (S.tally[e.cause] || 0) + 1;
      const who = e.kind === "unit" ? "conscript" : e.kind === "vehicle" ? "scout" : e.kind;
      S.feed.unshift(`${e.cause} — ${who}${e.attacker === "player" ? "" : " (world)"}`);
      if (S.feed.length > 5) S.feed.pop();
      if (PHYS_CAUSES.has(e.cause)) S.hitstop = Math.max(S.hitstop, 0.26);
      S.labels.push({ x: e.x, y: (e.y || 2) + 1.4, z: e.z, text: e.cause, t: 1.15, color: LABEL_COLORS[e.cause] || "#fff" });
      try { if (S.isTouch && navigator.vibrate) navigator.vibrate(PHYS_CAUSES.has(e.cause) ? 18 : 9); } catch (err) {}
      if (S.labels.length > 10) S.labels.shift();
      S.audio.kill();
      if (e.cause === CAUSE.DROWN) S.audio.splash();
      onTrialKill(e);
    };
    const onAch = (e) => { S.toasts.push({ id: S.toastSeq++, title: e.name, desc: e.desc, t: 3.6 }); };
    const actions = {
      fireAt: (x, z) => { if (S.cds.fire > 0) return false; S.cds.fire = 0.45; bisonFire(S.world, { x, z }); return true; },
      volleyAt: (x, z) => { if (S.cds.volley > 0) return false; S.cds.volley = 5; fireVolley(S.world, x, z, 6, "player"); return true; },
      mgAt: (x, z) => { if (S.cds.mg > 0) return false; S.cds.mg = 0.11; bisonMg(S.world, { x, z }); return true; },
      squads: () => S.world.pg.respawnSquads(),
      scouts: () => S.world.pg.respawnScouts(),
      repair: () => S.world.pg.repairGarrison(),
      reset: doReset,
    };
    S.actions = actions;
    const onKey = (ev, down) => {
      const k = ev.key.toLowerCase();
      if (["w", "a", "s", "d", " "].includes(k)) ev.preventDefault();
      S.keys[k] = down;
      if (!down) return;
      if (k === "v") actions.volleyAt(S.aim.x, S.aim.z);
      if (k === "1") actions.squads();
      if (k === "2") actions.scouts();
      if (k === "3") actions.repair();
      if (k === "0") actions.reset();
    };
    const kd = (e) => { S.audio.ensure(); if (e.key === "m" || e.key === "M") S.audio.setMuted(!S.audio.muted); if ((e.key === "r" || e.key === "R") && window.__COLDSNAP__) window.__COLDSNAP__.recover(); onKey(e, true); };
    const ku = (e) => onKey(e, false);
    const rect = () => {
      const r = canvas.getBoundingClientRect();
      return r.width > 4 ? r : { left: 0, top: 0, width: 960, height: 600 };
    };
    const toNdc = (cx, cy) => {
      const r = rect();
      return { x: ((cx - r.left) / r.width) * 2 - 1, y: -(((cy - r.top) / r.height) * 2 - 1) };
    };
    const setZoomClamped = (z) => { S.zoom = Math.max(0.7, Math.min(2, z)); R.setZoom(S.zoom); };
    const JOY_R = 56;
    const joyCenter = () => { const r = rect(); return { x: 92, y: r.height - 128 }; };
    const joyPlace = () => {
      const b = joyBaseRef.current, k = joyKnobRef.current;
      if (!b || !k || !S.isTouch) return;
      const c = joyCenter();
      b.style.display = "block"; k.style.display = "block";
      b.style.left = c.x - JOY_R + "px"; b.style.top = c.y - JOY_R + "px";
      if (S.touch.joyId == null) { k.style.left = c.x - 22 + "px"; k.style.top = c.y - 22 + "px"; }
      b.style.opacity = k.style.opacity = S.touch.joyId == null ? "0.55" : "1";
    };
    const joyKnob = (x, y) => { const k = joyKnobRef.current; if (k) { k.style.left = x - 22 + "px"; k.style.top = y - 22 + "px"; } };
    const joyRelease = () => {
      S.touch.drive.t = 0; S.touch.drive.s = 0; S.touch.joyId = null;
      joyPlace();
    };
    const nearJoy = (cx, cy) => {
      const r = rect(), c = joyCenter();
      return Math.hypot(cx - r.left - c.x, cy - r.top - c.y) < 130;
    };
    const pinchDist = () => {
      const pts = [...S.touch.pts.values()];
      if (pts.length < 2) return 0;
      return Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
    };
    const onPointerDown = (e) => {
      setStarted(true);
      S.audio.ensure();
      if (e.target !== canvas) return;
      if (e.cancelable) e.preventDefault();
      const isT = e.pointerType === "touch" || e.pointerType === "pen";
      if (!isT) {
        S.mouseDown = { x: e.clientX, y: e.clientY };
        return;
      }
      S.touch.pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (S.touch.pts.size === 2 && S.touch.joyId == null) { S.touch.pinch0 = pinchDist(); S.touch.zoom0 = S.zoom; S.touch.aimId = null; return; }
      if (nearJoy(e.clientX, e.clientY) && S.touch.joyId == null) {
        S.touch.joyId = e.pointerId;
        joyPlace();
        onPointerMove(e); // apply the grab position immediately
      } else if (S.touch.aimId == null) {
        S.touch.aimId = e.pointerId; S.touch.ax = e.clientX; S.touch.ay = e.clientY;
        S.touch.moved = 0; S.touch.downT = performance.now();
        const n = toNdc(e.clientX, e.clientY);
        S.ndc.x = n.x; S.ndc.y = n.y;
      }
    };
    const onPointerMove = (e) => {
      if (e.pointerType === "mouse") {
        if (e.target === canvas || !S.mouseDown) {
          const n = toNdc(e.clientX, e.clientY);
          S.ndc.x = n.x; S.ndc.y = n.y;
        }
        return;
      }
      if (!S.touch.pts.has(e.pointerId)) return;
      if (e.cancelable) e.preventDefault();
      S.touch.pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (S.touch.pts.size >= 2 && S.touch.pinch0 > 0) {
        const d = pinchDist();
        if (d > 0) setZoomClamped(S.touch.zoom0 * (d / S.touch.pinch0));
        return;
      }
      if (e.pointerId === S.touch.joyId) {
        const r = rect(), c = joyCenter();
        let dx = e.clientX - r.left - c.x, dy = e.clientY - r.top - c.y;
        const L = Math.hypot(dx, dy);
        if (L > JOY_R) { dx *= JOY_R / L; dy *= JOY_R / L; }
        joyKnob(c.x + dx, c.y + dy);
        const dz = (v) => (Math.abs(v) < 0.15 ? 0 : (v - Math.sign(v) * 0.15) / 0.85);
        S.touch.drive.t = dz(-dy / JOY_R);
        S.touch.drive.s = dz(dx / JOY_R);
      } else if (e.pointerId === S.touch.aimId) {
        S.touch.moved += Math.hypot(e.clientX - S.touch.ax, e.clientY - S.touch.ay);
        S.touch.ax = e.clientX; S.touch.ay = e.clientY;
        const n = toNdc(e.clientX, e.clientY);
        S.ndc.x = n.x; S.ndc.y = n.y;
      }
    };
    const onPointerUp = (e) => {
      if (e.pointerType === "mouse") {
        if (S.mouseDown && e.target === canvas) {
          const moved = Math.hypot(e.clientX - S.mouseDown.x, e.clientY - S.mouseDown.y);
          if (moved < 8) { const g = groundPoint(...Object.values(toNdc(e.clientX, e.clientY))); actions.fireAt(g.x, g.z); }
        }
        S.mouseDown = null;
        return;
      }
      const had = S.touch.pts.delete(e.pointerId);
      if (S.touch.pts.size < 2) S.touch.pinch0 = 0;
      if (e.pointerId === S.touch.joyId) joyRelease();
      else if (had && e.pointerId === S.touch.aimId) {
        const quick = performance.now() - S.touch.downT < 350;
        if (quick && S.touch.moved < 14) {
          // tap aims; the FIRE button shoots
          const n = toNdc(e.clientX, e.clientY);
          S.ndc.x = n.x; S.ndc.y = n.y;
        }
        S.touch.aimId = null;
      }
    };
    const onCtx = (e) => { if (e.target === canvas) e.preventDefault(); };
    const onWheel = (e) => {
      if (e.target !== canvas) return;
      e.preventDefault();
      setZoomClamped(S.zoom * (e.deltaY > 0 ? 0.85 : 1.18));
    };
    S.zoomBy = (f) => setZoomClamped(S.zoom * f);
    S.joyPlace = joyPlace;
    joyPlace();
    // Pointer-event preventDefault does NOT stop touch scrolling; WebViews need
    // real non-passive touch listeners. Block panning for any gesture on the canvas.
    const wrapEl = wrapRef.current;
    const touchBlock = (e) => { if (e.target === canvas) e.preventDefault(); };
    if (wrapEl) {
      wrapEl.addEventListener("touchstart", touchBlock, { passive: false });
      wrapEl.addEventListener("touchmove", touchBlock, { passive: false });
      wrapEl.addEventListener("touchend", touchBlock, { passive: false });
    }
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    window.addEventListener("contextmenu", onCtx);
    window.addEventListener("wheel", onWheel, { passive: false });
    let raf = 0;
    const loop = () => {
      if (!S.running) return;
      raf = window.requestAnimationFrame(loop);
      const now = performance.now();
      let dt = Math.min(0.05, (now - S.last) / 1000);
      S.last = now;
      S.frames++; S.fpsT += dt;
      if (S.fpsT >= 0.5) { S.fps = Math.round(S.frames / S.fpsT); S.frames = 0; S.fpsT = 0; }
      for (const k of ["fire", "volley", "recover", "mg"]) S.cds[k] = Math.max(0, S.cds[k] - dt);
      let ts = 1;
      if (S.hitstop > 0) { S.hitstop -= dt; ts = 0.12; }
      const w = S.world;
      const bison = w.byId.get(w.bisonId);
      if (S.touch.joyId != null && bison) {
        // twin-stick: the tank goes where you point, camera-relative
        const cb = R.camBasis;
        const ux = cb.fwd.x, uz = cb.fwd.z, ul = Math.hypot(ux, uz) || 1;
        const rx = cb.right.x, rz = cb.right.z, rl = Math.hypot(rx, rz) || 1;
        const wx = (rx / rl) * S.touch.drive.s + (ux / ul) * S.touch.drive.t;
        const wz = (rz / rl) * S.touch.drive.s + (uz / ul) * S.touch.drive.t;
        const mag = Math.min(1, Math.hypot(S.touch.drive.s, S.touch.drive.t));
        if (mag > 0.03) {
          const desired = Math.atan2(wx, wz);
          const bodyYaw = Math.atan2(bison.R[6], bison.R[8]);
          let errY = desired - bodyYaw;
          while (errY > Math.PI) errY -= 2 * Math.PI;
          while (errY < -Math.PI) errY += 2 * Math.PI;
          w.control.steer = Math.max(-1, Math.min(1, errY * 1.8));
          w.control.throttle = mag * Math.max(0, Math.cos(errY));
        } else { w.control.throttle = 0; w.control.steer = 0; }
        w.control.brake = 0;
      } else {
        w.control.throttle = (S.keys["w"] ? 1 : 0) + (S.keys["s"] ? -1 : 0);
        w.control.steer = (S.keys["d"] ? 1 : 0) + (S.keys["a"] ? -1 : 0);
        w.control.brake = S.keys[" "] ? 1 : 0;
      }
      S.aim = groundPoint(S.ndc.x, S.ndc.y);
      w.threat = { x: S.aim.x, z: S.aim.z, t: w.t };
      if (S.fireHeld && S.cds.fire <= 0 && S.actions) {
        const g = S.isTouch ? snapAim(S.world, S.aim.x, S.aim.z, 1.5) : { x: S.aim.x, z: S.aim.z, hit: false };
        S.lastFire = g;
        S.actions.fireAt(g.x, g.z);
      }
      if ((S.mgHeld || S.keys["g"]) && S.cds.mg <= 0 && S.actions) {
        const gm = S.isTouch ? snapAim(S.world, S.aim.x, S.aim.z, 1.5) : { x: S.aim.x, z: S.aim.z, hit: false };
        S.actions.mgAt(gm.x, gm.z);
      }
      S.acc += dt * ts;
      const evs = [];
      let guard = 0;
      const stepCap = S.isTouch ? 5 : 10;
      while (S.acc >= w.dt && guard++ < stepCap) {
        w.events.length = 0;
        stepWorld(w);
        for (const e of w.events) evs.push(e);
        S.acc -= w.dt;
      }
      if (S.acc > w.dt * 3) S.acc = w.dt * 3;
      const rNow = canvas.getBoundingClientRect ? canvas.getBoundingClientRect() : null;
      const hNow = rNow && rNow.height > 4 ? rNow.height : 0;
      if (hNow !== S.lastJoyH) { S.lastJoyH = hNow; if (S.joyPlace) S.joyPlace(); }
      for (const e of evs) {
        if (e.type === "kill") onKill(e);
        else if (e.type === "ach") onAch(e);
      }
      let boomed = false;
      for (const e of evs) {
        if (e.type === "boom" && !boomed && now - (S.lastBoomT || 0) > 90) { S.audio.boom(); S.lastBoomT = now; boomed = true; }
        else if (e.type === "muzzle") S.audio.fire();
        else if (e.type === "gmuzzle") S.audio.fire();
        else if (e.type === "splash") S.audio.splash();
        else if (e.type === "weldbreak" && e.ice && now - (S.lastCrackT || 0) > 70) { S.audio.crack(); S.lastCrackT = now; }
      }
      R.consume(evs);
      persistSave();
      for (let i = S.toasts.length - 1; i >= 0; i--) { S.toasts[i].t -= dt; if (S.toasts[i].t <= 0) S.toasts.splice(i, 1); }
      if (S.trial.flashT > 0) S.trial.flashT -= dt;
      const layer = labelLayerRef.current;
      if (layer) {
        while (layer.children.length < S.labels.length) {
          const d = window.document.createElement("div");
          d.style.cssText = "position:absolute;transform:translate(-50%,-50%);font:bold 13px 'Courier New',monospace;letter-spacing:1px;text-shadow:0 2px 0 #000,0 0 6px rgba(0,0,0,0.7);pointer-events:none;white-space:nowrap;";
          layer.appendChild(d);
        }
        while (layer.children.length > S.labels.length) layer.removeChild(layer.lastChild);
        const rct = canvas.getBoundingClientRect ? canvas.getBoundingClientRect() : { width: 0, height: 0 };
        const cw = rct.width > 4 ? rct.width : 960, ch = rct.height > 4 ? rct.height : 600;
        for (let i = S.labels.length - 1; i >= 0; i--) {
          const L = S.labels[i];
          L.t -= dt;
          if (L.t <= 0) { S.labels.splice(i, 1); continue; }
          const pnd = R.project(L.x, L.y + (1.15 - L.t) * 1.6, L.z);
          const el = layer.children[i];
          if (el) {
            el.textContent = L.text;
            el.style.color = L.color;
            el.style.opacity = String(Math.min(1, L.t * 2.2));
            el.style.left = ((pnd.x * 0.5 + 0.5) * cw).toFixed(0) + "px";
            el.style.top = ((-pnd.y * 0.5 + 0.5) * ch).toFixed(0) + "px";
          }
        }
      }
      if (bison) {
        // frame the bison low: look ahead along its heading
        const la = 8.5;
        S.focus.x += ((bison.pos.x + bison.R[6] * la) - S.focus.x) * Math.min(1, 4 * dt);
        S.focus.y += (bison.pos.y - S.focus.y) * Math.min(1, 4 * dt);
        S.focus.z += ((bison.pos.z + bison.R[8] * la) - S.focus.z) * Math.min(1, 4 * dt);
      }
      let ty = 0;
      if (bison) {
        const bodyYaw = Math.atan2(bison.R[6], bison.R[8]);
        ty = Math.atan2(S.aim.x - bison.pos.x, S.aim.z - bison.pos.z) - bodyYaw;
      }
      try { R.render(dt, S.focus, S.aim, ty); } catch (err) {
        console.error("COLDSNAP render failed", err);
        S.running = false;
        setFatal(String((err && err.message) || err));
        return;
      }
      S.hudT += dt;
      if (S.hudT >= 0.2) {
        S.hudT = 0;
        setHud({
          fps: S.fps, bodies: w.bodies.length, tally: { ...S.tally }, feed: [...S.feed],
          achUnlocked: [...w.ach.unlocked], toasts: [...S.toasts], total: w.ach.total,
          cds: { fire: S.cds.fire, volley: S.cds.volley },
          flipped: (() => { const bb2 = w.byId.get(w.bisonId); return bb2 ? bb2.R[4] < 0.3 : false; })(),
          iceOn: !!w.ice,
          trial: { idx: S.trial.idx, prog: S.trial.prog, flashT: S.trial.flashT, free: S.trial.idx >= TRIALS.length, el: Math.max(0, w.t - S.trial.t0) },
          medals: { ...S.medals },
        });
      }
    };
    raf = window.requestAnimationFrame(loop);
    const api = {
      ...actions,
      setDrive: (t, s, b) => { S.keys["w"] = t > 0; S.keys["s"] = t < 0; S.keys["d"] = s > 0; S.keys["a"] = s < 0; S.keys[" "] = !!b; },
      setGfx: (p) => R.setGfx(p),
      getState: () => ({ t: S.world.t, bodies: S.world.bodies.length, tally: { ...S.tally }, ach: [...S.world.ach.unlocked], total: S.world.ach.total, hash: worldHash(S.world), medals: { ...S.medals }, trial: { idx: S.trial.idx, prog: S.trial.prog, id: TRIALS[S.trial.idx] ? TRIALS[S.trial.idx].id : "free", free: S.trial.idx >= TRIALS.length } }),
      skipTrial: () => advanceTrial(true),
      recover: () => { if (S.cds.recover <= 0 && recoverBison(S.world)) { S.cds.recover = 2.5; S.audio.hook(); } },
      freezePool: () => { S.world.pg.freeze(); S.toasts.push({ id: S.toastSeq++, title: "THE POOL HAS FROZEN", desc: "Thin ice. It remembers weight.", t: 4 }); },
      spawnWingman: () => {
        const w = S.world, lead = w.byId.get(w.bisonId);
        if (!lead) return null;
        const x = lead.pos.x - lead.R[6] * 7, z = lead.pos.z - lead.R[8] * 7;
        const h = addBody(w, { kind: "vehicle", team: 1, group: "squad", mass: 1400, hx: 1.25, hy: 0.7, hz: 1.85, x, z, y: w.field.heightAt(x, z) + 0.72, hp: 220, friction: 0.85, q: heading(null, Math.atan2(lead.R[6], lead.R[8])) });
        h.squad = true; h.follow = true;
        S.toasts.push({ id: S.toastSeq++, title: "WINGMAN ON STATION", desc: "He holds six lengths back.", t: 3 });
        return h.id;
      },
      thawPool: () => { S.world.pg.thaw(); },
      _R: R,
      aimAt: (x, z) => { S.aim = { x, z }; },
      _world: () => S.world, _S: S,
    };
    if (typeof window !== "undefined") window.__COLDSNAP__ = api;
    return () => {
      S.running = false;
      window.cancelAnimationFrame(raf);
      if (wrapEl) {
        wrapEl.removeEventListener("touchstart", touchBlock);
        wrapEl.removeEventListener("touchmove", touchBlock);
        wrapEl.removeEventListener("touchend", touchBlock);
      }
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      window.removeEventListener("contextmenu", onCtx);
      window.removeEventListener("wheel", onWheel);
      try { R.dispose(); } catch (e) {}
      if (typeof window !== "undefined" && window.__COLDSNAP__ === api) delete window.__COLDSNAP__;
      if (stateRef.current === S) stateRef.current = null;
    };
  }, []);

  const applyGfx = (patch) => {
    const S = stateRef.current;
    if (patch.preset === "retro") {
      setGfxUi({ preset: "retro", scale: 3, outline: 1, dither: 1, palette: 1 });
      if (S && S.R) S.R.setGfx({ preset: "retro" });
      return;
    }
    if (patch.preset === "clean") {
      setGfxUi({ preset: "clean", scale: 2, outline: 1, dither: 0, palette: 1 });
      if (S && S.R) S.R.setGfx({ preset: "clean" });
      return;
    }
    const next = { ...gfxUi, ...patch, preset: "custom" };
    setGfxUi(next);
    if (S && S.R) S.R.setGfx({ scale: next.scale, outline: next.outline, dither: next.dither, palette: next.palette });
  };
  const act = (name) => { const S = stateRef.current; if (S && S.actions) S.actions[name](); };
  const P = {
    wrap: { position: "relative", width: "100%", height: "100vh", minHeight: 520, background: "#0e1014", overflow: "hidden", fontFamily: "'Courier New', ui-monospace, monospace", userSelect: "none", WebkitUserSelect: "none", touchAction: "none", WebkitTouchCallout: "none", overscrollBehavior: "none" },
    cv: { position: "absolute", inset: 0, width: "100%", height: "100%", display: "block", cursor: "crosshair", touchAction: "none" },
    panel: { position: "absolute", background: "rgba(16,19,24,0.92)", border: "2px solid #3a414b", color: "#cfd6de", padding: "6px 10px", fontSize: isTouch ? 11 : 12, lineHeight: 1.45 },
    btn: { background: "#1c2129", border: "2px solid #4a5361", color: "#e6ebf1", padding: isTouch ? "11px 12px" : "7px 10px", fontSize: isTouch ? 13 : 12, fontFamily: "inherit", cursor: "pointer", letterSpacing: 0.5, touchAction: "manipulation" },
    joyBase: { position: "absolute", width: 112, height: 112, borderRadius: "50%", border: "2px solid rgba(216,67,58,0.55)", background: "rgba(20,24,30,0.35)", display: "none", pointerEvents: "none", zIndex: 4 },
    joyKnob: { position: "absolute", width: 44, height: 44, borderRadius: "50%", background: "rgba(216,67,58,0.75)", border: "2px solid #ff6b5e", display: "none", pointerEvents: "none", zIndex: 4 },
    red: { color: "#ff6b5e" },
  };
  const [menuOpen, setMenuOpen] = useState(false);
  const causeOrder = ["PROJECTILE", "BLAST", "CRUSH", "TOSS", "COLLAPSE", "FLIP", "DROWN", "IMPACT"];
  const trialDef = TRIALS[hud.trial.idx];
  const achDefs = makeAch().defs;
  return (
    <div ref={wrapRef} style={P.wrap}>
      <canvas ref={canvasRef} style={P.cv} />
      <div ref={labelLayerRef} data-coldsnap="labels" style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 2, overflow: "hidden" }} />
      <div ref={joyBaseRef} style={P.joyBase} />
      <div ref={joyKnobRef} style={P.joyKnob} />
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, background: hud.trial.flashT > 0 ? "rgba(216,67,58,0.92)" : "rgba(16,19,24,0.92)", borderBottom: "2px solid #3a414b", color: "#e6ebf1", padding: "8px 10px", fontSize: isTouch ? 12 : 13, display: "flex", alignItems: "center", gap: 10, zIndex: 3 }}>
        {trialDef ? (
          <>
            <span style={{ color: "#ffd27a", whiteSpace: "nowrap" }}>TRIAL {hud.trial.idx + 1}/{TRIALS.length}</span>
            <span style={{ color: "#ff6b5e", whiteSpace: "nowrap" }}>{trialDef.title}</span>
            <span style={{ opacity: 0.85, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{trialDef.hint}</span>
            <span style={{ whiteSpace: "nowrap", opacity: 0.75 }}>{hud.trial.el.toFixed(0)}s</span>
            <span style={{ whiteSpace: "nowrap" }}>{hud.trial.prog}/{trialDef.need}</span>
            <button style={{ ...P.btn, padding: "3px 8px", fontSize: 11 }} onClick={() => { const S = stateRef.current; if (S) window.__COLDSNAP__ && window.__COLDSNAP__.skipTrial(); }}>SKIP</button>
          </>
        ) : (
          <>
            <span style={{ color: "#ffd27a" }}>FREE PLAY</span>
            {TRIALS.map((t) => {
              const m = hud.medals[t.id];
              const col = m ? (m.medal === "GOLD" ? "#ffd27a" : m.medal === "SILVER" ? "#cfd6de" : "#b0764a") : "#4a5361";
              return <span key={t.id} title={t.title + (m ? ` ${m.time}s` : "")} style={{ color: col }}>★</span>;
            })}
            <span style={{ opacity: 0.8, fontSize: 11 }}>best times stand — beat them</span>
          </>
        )}
      </div>
      {fatal && (
        <div style={{ ...P.panel, top: "40%", left: "50%", transform: "translate(-50%,-50%)", borderColor: "#d8433a", maxWidth: 420 }}>
          <div style={{ color: "#ff6b5e" }}>ENGINE FAULT</div>
          <div style={{ fontSize: 11, marginTop: 4 }}>{fatal}</div>
        </div>
      )}
      {!started && !fatal && (
        <div
          onClick={() => setStarted(true)}
          style={{ position: "absolute", inset: 0, background: "rgba(10,12,16,0.72)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", zIndex: 5 }}
        >
          <div style={{ ...P.panel, position: "static", borderColor: "#d8433a", textAlign: "center", padding: "16px 26px" }}>
            <div style={{ fontSize: 22, color: "#ff6b5e", letterSpacing: 4 }}>COLDSNAP</div>
            <div style={{ opacity: 0.8, marginBottom: 10 }}>PROVING GROUNDS</div>
            <div style={{ color: "#ffd27a", marginBottom: 8, fontSize: 13 }}>Seven field trials across the winter range.<br />Follow the gold ring. The far ridge shoots back.</div>
            {isTouch ? (
              <div style={{ textAlign: "left", fontSize: 13, lineHeight: 1.8 }}>
                <div><b>LEFT STICK</b> — the tank goes where you point it</div>
                <div><b>TAP</b> — aim the reticle · hold <b>FIRE</b> to shoot</div>
                <div><b>DRAG</b> — aim without firing</div>
                <div><b>PINCH / + −</b> — zoom</div>
              </div>
            ) : (
              <div style={{ textAlign: "left", fontSize: 12, lineHeight: 1.7 }}>
                <div><b>W A S D</b> — drive the Bison</div>
                <div><b>MOUSE</b> — aim · <b>CLICK</b> — main gun</div>
                <div><b>V</b> — rocket volley</div>
                <div><b>SPACE</b> — brake · <b>WHEEL</b> — zoom</div>
                <div><b>1/2/3</b> — respawn squads / scouts / repair · <b>0</b> — reset</div>
              </div>
            )}
            <div style={{ marginTop: 12, color: "#ffd27a" }}>{isTouch ? "TAP TO DEPLOY" : "CLICK TO DEPLOY"}</div>
          </div>
        </div>
      )}
      <div style={{ ...P.panel, top: 44, left: 10 }}>
        <div style={{ fontSize: 14, color: "#ff6b5e", letterSpacing: 2 }}>COLDSNAP</div>
        <div style={{ opacity: 0.75 }}>{hud.fps} fps · {hud.bodies} bodies</div>
        {!isTouch && <div style={{ opacity: 0.75 }}>WASD drive · click fire · V volley · wheel zoom</div>}
      </div>
      <div style={{ ...P.panel, top: 44, right: 12, display: "flex", gap: 10, padding: 8 }}>
        <button style={P.btn} onClick={() => { const S = stateRef.current; if (S && S.zoomBy) S.zoomBy(1.18); }}>+</button>
        <button style={P.btn} onClick={() => { const S = stateRef.current; if (S && S.zoomBy) S.zoomBy(0.85); }}>−</button>
        <button style={P.btn} onClick={() => { setAchOpen(!achOpen); setGfxOpen(false); }}>★ {hud.achUnlocked.length}/{achDefs.length}</button>
        <button style={P.btn} onClick={() => { setGfxOpen(!gfxOpen); setAchOpen(false); }}>GFX</button>
      </div>
      {isTouch ? (
        <div style={{ ...P.panel, bottom: 12, left: 10, padding: "5px 9px" }}>
          <span style={{ color: "#ff6b5e" }}>☠ {hud.total}</span>
          {hud.feed[0] && <span style={{ opacity: 0.75, marginLeft: 8, fontSize: 10 }}>{hud.feed[0]}</span>}
        </div>
      ) : (
        <div style={{ ...P.panel, bottom: 64, left: 10, minWidth: 130, maxWidth: 190 }}>
          <div style={{ color: "#ff6b5e", marginBottom: 2 }}>KILLS · {hud.total} lifetime</div>
          {causeOrder.filter((c) => hud.tally[c]).map((c) => (
            <div key={c} style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <span>{c}</span><span>{hud.tally[c]}</span>
            </div>
          ))}
          {hud.feed.map((f, i) => (
            <div key={i} style={{ opacity: 0.8 - i * 0.14, fontSize: 11, marginTop: i === 0 ? 6 : 0 }}>{f}</div>
          ))}
        </div>
      )}
      {hud.flipped && (
        <button style={{ ...P.btn, position: "absolute", left: "50%", transform: "translateX(-50%)", bottom: isTouch ? 190 : 64, background: "#8a5a1c", borderColor: "#ffd27a", zIndex: 5, padding: "12px 18px", fontSize: 14 }} onClick={() => window.__COLDSNAP__ && window.__COLDSNAP__.recover()}>
        ⟳ RECOVER {isTouch ? "" : "[R]"}
        </button>
      )}
      {isTouch && (
        <div style={{ position: "absolute", right: 12, bottom: 12, display: "flex", flexDirection: "column", gap: 12, zIndex: 3, alignItems: "stretch" }}>
          <button
            data-fire
            onContextMenu={(e) => e.preventDefault()}
            onPointerDown={(e) => {
              e.preventDefault();
              // the visual is a circle — honor it: corner taps on the square element fall
              // through to nothing instead of firing. Zero-size rects (headless DOM) skip.
              const r = e.currentTarget.getBoundingClientRect(), w2 = r.width / 2;
              if (w2 > 4) { const dx = e.clientX - (r.left + w2), dy = e.clientY - (r.top + r.height / 2); if (dx * dx + dy * dy > w2 * w2) return; }
              const S = stateRef.current; if (S) S.fireHeld = true;
            }}
            onPointerUp={() => { const S = stateRef.current; if (S) S.fireHeld = false; }}
            onPointerCancel={() => { const S = stateRef.current; if (S) S.fireHeld = false; }}
            onPointerLeave={() => { const S = stateRef.current; if (S) S.fireHeld = false; }}
            style={{ ...P.btn, width: 92, height: 92, borderRadius: "50%", alignSelf: "center", fontSize: 15, letterSpacing: 2, touchAction: "none", background: (hud.cds.fire || 0) > 0 ? "#3a2320" : "#5c211b", borderColor: "#ff6b5e", opacity: (hud.cds.fire || 0) > 0 ? 0.6 : 1 }}
          >FIRE</button>
          <button
            data-mg
            onContextMenu={(e) => e.preventDefault()}
            onPointerDown={(e) => {
              e.preventDefault();
              const r = e.currentTarget.getBoundingClientRect(), w2 = r.width / 2;
              if (w2 > 4) { const dx = e.clientX - (r.left + w2), dy = e.clientY - (r.top + r.height / 2); if (dx * dx + dy * dy > w2 * w2) return; }
              const S = stateRef.current; if (S) S.mgHeld = true;
            }}
            onPointerUp={() => { const S = stateRef.current; if (S) S.mgHeld = false; }}
            onPointerCancel={() => { const S = stateRef.current; if (S) S.mgHeld = false; }}
            onPointerLeave={() => { const S = stateRef.current; if (S) S.mgHeld = false; }}
            style={{ ...P.btn, width: 72, height: 72, borderRadius: "50%", alignSelf: "center", fontSize: 12, letterSpacing: 2, touchAction: "none", background: "#23303a", borderColor: "#7fb2d8" }}
          >MG</button>
          <button style={{ ...P.btn, opacity: hud.cds.volley > 0 ? 0.45 : 1, minWidth: 108 }} onClick={() => { const S = stateRef.current; if (S) S.actions.volleyAt(S.aim.x, S.aim.z); }}>
            {hud.cds.volley > 0 ? `VOLLEY ${hud.cds.volley.toFixed(0)}` : "VOLLEY"}
          </button>
          <button style={{ ...P.btn, minWidth: 108 }} onClick={() => { const api = window.__COLDSNAP__; if (api) (hud.iceOn ? api.thawPool() : api.freezePool()); }}>
            {hud.iceOn ? "THAW" : "FREEZE"}
          </button>
          <button style={{ ...P.btn, borderColor: "#bfe3f5", minWidth: 108 }} onClick={() => { const api = window.__COLDSNAP__; if (api) (hud.iceOn ? api.thawPool() : api.freezePool()); }}>
            {hud.iceOn ? "☀ THAW" : "❄ FREEZE"}
          </button>
          <button style={P.btn} onClick={() => setMenuOpen(!menuOpen)}>☰</button>
        </div>
      )}
      {isTouch && menuOpen && (
        <div style={{ ...P.panel, right: 10, bottom: 170, display: "flex", flexDirection: "column", gap: 8, zIndex: 4 }}>
          <button style={P.btn} onClick={() => { act("squads"); setMenuOpen(false); }}>RESPAWN SQUADS</button>
          <button style={P.btn} onClick={() => { act("scouts"); setMenuOpen(false); }}>RESPAWN SCOUTS</button>
          <button style={P.btn} onClick={() => { act("repair"); setMenuOpen(false); }}>REPAIR TOWER</button>
          <button style={P.btn} onClick={() => { act("reset"); setMenuOpen(false); }}>RESET RANGE</button>
          <button style={P.btn} onClick={() => { const S = stateRef.current; if (S) S.audio.setMuted(!S.audio.muted); setMenuOpen(false); }}>SOUND ON/OFF</button>
          <button style={P.btn} onClick={() => { const api = window.__COLDSNAP__; if (api) (hud.iceOn ? api.thawPool() : api.freezePool()); setMenuOpen(false); }}>{hud.iceOn ? "THAW POOL" : "FREEZE POOL"}</button>
          <button style={P.btn} onClick={() => { const api = window.__COLDSNAP__; if (api) api.spawnWingman(); setMenuOpen(false); }}>SPAWN WINGMAN (DEBUG)</button>
        </div>
      )}
      <div style={{ position: "absolute", bottom: 10, left: "50%", transform: "translateX(-50%)", display: isTouch ? "none" : "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", maxWidth: "96%", zIndex: 3 }}>
        <button style={{ ...P.btn, opacity: hud.cds.volley > 0 ? 0.45 : 1 }} onClick={() => { const S = stateRef.current; if (S) S.actions.volleyAt(S.aim.x, S.aim.z); }}>
          {hud.cds.volley > 0 ? `VOLLEY ${hud.cds.volley.toFixed(0)}s` : isTouch ? "VOLLEY" : "ROCKET VOLLEY [V]"}
        </button>
        <button style={P.btn} onClick={() => { const api = window.__COLDSNAP__; if (api) (hud.iceOn ? api.thawPool() : api.freezePool()); }}>
          {hud.iceOn ? "THAW POOL" : "FREEZE POOL"}
        </button>
        <button style={{ ...P.btn, borderColor: "#bfe3f5" }} onClick={() => { const api = window.__COLDSNAP__; if (api) (hud.iceOn ? api.thawPool() : api.freezePool()); }}>
          {hud.iceOn ? "☀ THAW POOL" : "❄ FREEZE POOL"}
        </button>
        <button style={P.btn} onClick={() => act("squads")}>{isTouch ? "SQUADS" : "SQUADS [1]"}</button>
        <button style={P.btn} onClick={() => act("scouts")}>{isTouch ? "SCOUTS" : "SCOUTS [2]"}</button>
        <button style={P.btn} onClick={() => act("repair")}>{isTouch ? "REPAIR" : "REPAIR [3]"}</button>
        <button style={P.btn} onClick={() => act("reset")}>{isTouch ? "RESET" : "RESET [0]"}</button>
      </div>
      <div style={{ position: "absolute", top: 60, left: "50%", transform: "translateX(-50%)", display: "flex", flexDirection: "column", gap: 6, alignItems: "center" }}>
        {hud.toasts.map((t) => (
          <div key={t.id} style={{ ...P.panel, position: "static", borderColor: "#d8433a", textAlign: "center" }}>
            <div style={{ color: "#ff6b5e" }}>★ {t.title}</div>
            <div style={{ fontSize: 11, opacity: 0.8 }}>{t.desc}</div>
          </div>
        ))}
      </div>
      {achOpen && (
        <div style={{ ...P.panel, top: 92, right: 10, width: 250, maxHeight: 300, overflowY: "auto", zIndex: 4 }}>
          <div style={{ color: "#ff6b5e", marginBottom: 4 }}>SERVICE RECORD</div>
          {achDefs.map(([id, name, desc]) => {
            const on = hud.achUnlocked.includes(id);
            return (
              <div key={id} style={{ marginBottom: 6, opacity: on ? 1 : 0.45 }}>
                <div style={{ color: on ? "#ffd27a" : "#8b93a0" }}>{on ? "★" : "☆"} {name}</div>
                <div style={{ fontSize: 11 }}>{desc}</div>
              </div>
            );
          })}
        </div>
      )}
      {gfxOpen && (
        <div style={{ ...P.panel, top: 92, right: 10, width: 230, zIndex: 4 }}>
          <div style={{ color: "#ff6b5e", marginBottom: 4 }}>GRAPHICS LAB</div>
          <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
            <button style={{ ...P.btn, borderColor: gfxUi.preset === "retro" ? "#d8433a" : "#4a5361" }} onClick={() => applyGfx({ preset: "retro" })}>FULL RETRO</button>
            <button style={{ ...P.btn, borderColor: gfxUi.preset === "clean" ? "#d8433a" : "#4a5361" }} onClick={() => applyGfx({ preset: "clean" })}>HALF-STEP</button>
          </div>
          <div style={{ marginBottom: 4 }}>
            pixel ×{gfxUi.scale}{" "}
            <input type="range" min={1} max={4} step={1} value={gfxUi.scale} onChange={(e) => applyGfx({ preset: null, scale: +e.target.value })} style={{ width: 110, verticalAlign: "middle" }} />
          </div>
          {["outline", "dither", "palette"].map((k) => (
            <label key={k} style={{ display: "block", cursor: "pointer" }}>
              <input type="checkbox" checked={!!gfxUi[k]} onChange={(e) => applyGfx({ preset: null, [k]: e.target.checked ? 1 : 0 })} /> {k}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
export const __test__ = { mulberry32, quantizeLum, snapCam, aimSolve, makeField, makeWorld, addBody, addWeld, stepWorld, worldHash, satBoxBox, explode, fireProjectile, fireVolley, buildProvingGrounds, bisonFire, CAUSE, POOL, makeAch, achOnKill, makeRenderer };
