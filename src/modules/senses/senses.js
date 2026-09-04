// MODULE: senses — opponent senses and cover reasoning, lifted VERBATIM
// MATH from the shooting-range demo (holdover-greybox-range-r55, lines
// 1636-1679). Sight is a range, a cone, and a clear ray from the eye;
// cover is the nearest solid crossing the chest line — and it stops being
// cover when you destroy it. Fidelity proven against the demo's own text
// at lift time, in the trial; the demo stays outside the record.
// Substitutions, numbered, and only these:
//   1. The page's AG dials -> this module imports the opponent module's own.
//   2. Function names agentCanSee / agentCoverSolid -> canSee / coverSolid.
import { AG } from "../opponent/opponent.js";

// canSee(a, solids, px, py, pz, blockedFn): 1 when the point is inside the
// view range and cone with a clear ray from the eye; the ray starts clear
// of the agent's own body. a carries {down, body:{c|cc}, fx, fz}.
export function canSee(a, solids, px, py, pz, blockedFn) {
  if (a.down || !a.body) return 0;
  var c = a.body.cc || a.body.c;
  var ex = c[0], ey = c[1] + 0.35, ez = c[2];
  var dx = px - ex, dy = py - ey, dz = pz - ez;
  var d = Math.hypot(dx, dy, dz);
  if (d > AG.VIEW_M) return 0;
  var cosang = (dx * a.fx + dz * a.fz) / (Math.hypot(dx, dz) || 1);
  if (cosang < Math.cos(AG.VIEW_DEG * Math.PI / 360)) return 0;
  var s = 0.45 / d;
  return blockedFn(solids, ex + dx * s, ey + dy * s, ez + dz * s, px, py, pz) ? 0 : 1;
}

// coverSolid(a, solids, px, py, pz): the index of the solid between the
// agent's chest and the point — that is its cover — or -1 in the open.
export function coverSolid(a, solids, px, py, pz) {
  if (!a.body) return -1;
  var c = a.body.cc || a.body.c;
  var dx0 = px - c[0], dy0 = py - c[1], dz0 = pz - c[2];
  var d0 = Math.hypot(dx0, dy0, dz0) || 1;
  var ex = c[0] + dx0 / d0 * 0.32, ey = c[1] + dy0 / d0 * 0.32, ez = c[2] + dz0 / d0 * 0.32;
  var dx = px - ex, dy = py - ey, dz = pz - ez;
  var len = Math.hypot(dx, dy, dz) || 1;
  dx /= len; dy /= len; dz /= len;
  var bestT = 1e9, best = -1;
  for (var s = 0; s < solids.length; s++) {
    var S = solids[s], P = S.planes, t0 = 1e-3, t1 = len - 1e-3, ok = 1;
    if (t1 <= t0) continue;
    for (var i = 0; i < S.n; i++) {
      var nx = P[i * 4], ny = P[i * 4 + 1], nz = P[i * 4 + 2], dd = P[i * 4 + 3];
      var den = nx * dx + ny * dy + nz * dz;
      var num = dd - (nx * ex + ny * ey + nz * ez);
      if (den > -1e-12 && den < 1e-12) { if (num < 0) { ok = 0; break; } continue; }
      var t = num / den;
      if (den > 0) { if (t < t1) t1 = t; } else { if (t > t0) t0 = t; }
      if (t1 < t0) { ok = 0; break; }
    }
    if (ok && t0 < bestT) { bestT = t0; best = s; }
  }
  return best;
}
