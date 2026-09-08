// MODULE: senses — opponent senses and cover reasoning, lifted VERBATIM
// MATH from the shooting-range demo (holdover-greybox-range-r55, lines
// 1636-1679). Sight is a range, a cone, and a clear ray from the eye;
// cover is the nearest solid crossing the chest line — and it stops being
// cover when you destroy it. Fidelity proven against the demo's own text
// at lift time, in the trial; the demo stays outside the record.
// Substitutions, numbered, and only these:
//   1. The page's AG dials -> this module imports the opponent module's own.
//   2. Function names agentCanSee / agentCoverSolid -> canSee / coverSolid.
// Second pass, substitutions, numbered, and only these:
//   1. SENSE_DIALS added: the five literals as one dials object, default
//      the opponent module's own numbers.
//   2. canSee(..., blockedFn, dials = SENSE_DIALS): eye height, view range,
//      view cone, and eye clearance read from dials.
//   3. coverSolid(..., dials = SENSE_DIALS): the chest offset reads
//      dials.chest.
//   4. AGENT_BODY_CONTRACT and checkAgentBody(a) added: the agent shape
//      contract.
//   5. checkSenseDials(d) added: the dials shape contract.
import { AG } from "../opponent/opponent.js";

// SENSE_DIALS: the five literals the demo hardwired, as one dials object.
// Defaults are the opponent module's own numbers.
export const SENSE_DIALS = { viewM: AG.VIEW_M, viewDeg: AG.VIEW_DEG, eyeUp: 0.35, eyeClear: 0.45, chest: 0.32 };

// canSee(a, solids, px, py, pz, blockedFn, dials): 1 when the point is
// inside the view range and cone with a clear ray from the eye; the ray
// starts clear of the agent's own body. a carries {down, body:{c|cc}, fx,
// fz}. dials carries {viewM, viewDeg, eyeUp, eyeClear}, default SENSE_DIALS.
export function canSee(a, solids, px, py, pz, blockedFn, dials = SENSE_DIALS) {
  if (a.down || !a.body) return 0;
  var c = a.body.cc || a.body.c;
  var ex = c[0], ey = c[1] + dials.eyeUp, ez = c[2];
  var dx = px - ex, dy = py - ey, dz = pz - ez;
  var d = Math.hypot(dx, dy, dz);
  if (d > dials.viewM) return 0;
  var cosang = (dx * a.fx + dz * a.fz) / (Math.hypot(dx, dz) || 1);
  if (cosang < Math.cos(dials.viewDeg * Math.PI / 360)) return 0;
  var s = dials.eyeClear / d;
  return blockedFn(solids, ex + dx * s, ey + dy * s, ez + dz * s, px, py, pz) ? 0 : 1;
}

// coverSolid(a, solids, px, py, pz, dials): the index of the solid between
// the agent's chest and the point — that is its cover — or -1 in the open.
// dials carries {chest}, default SENSE_DIALS.
export function coverSolid(a, solids, px, py, pz, dials = SENSE_DIALS) {
  if (!a.body) return -1;
  var c = a.body.cc || a.body.c;
  var dx0 = px - c[0], dy0 = py - c[1], dz0 = pz - c[2];
  var d0 = Math.hypot(dx0, dy0, dz0) || 1;
  var ex = c[0] + dx0 / d0 * dials.chest, ey = c[1] + dy0 / d0 * dials.chest, ez = c[2] + dz0 / d0 * dials.chest;
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

// AGENT_BODY_CONTRACT: the shape checkAgentBody enforces.
export const AGENT_BODY_CONTRACT = { body: "object with c or cc, 3 numbers", fx: "finite number", fz: "finite number", down: "0/1 or boolean, optional" };

// checkAgentBody(a): every problem with a's shape, in one pass. Empty when
// clean.
export function checkAgentBody(a) {
  if (typeof a !== "object" || a === null) return ["agent: not an object"];
  var problems = [];
  var body = a.body, c = body && (body.cc || body.c);
  var okBody = body && typeof body === "object" && Array.isArray(c) && c.length === 3
    && typeof c[0] === "number" && Number.isFinite(c[0])
    && typeof c[1] === "number" && Number.isFinite(c[1])
    && typeof c[2] === "number" && Number.isFinite(c[2]);
  if (!okBody) problems.push("agent.body: object with c or cc of 3 finite numbers required");
  if (typeof a.fx !== "number" || !Number.isFinite(a.fx)) problems.push("agent.fx: finite number required");
  if (typeof a.fz !== "number" || !Number.isFinite(a.fz)) problems.push("agent.fz: finite number required");
  return problems;
}

// checkSenseDials(d): every problem with d's shape, in one pass. Empty
// when clean.
export function checkSenseDials(d) {
  if (typeof d !== "object" || d === null) return ["dials: not an object"];
  var problems = [];
  var names = ["viewM", "viewDeg", "eyeUp", "eyeClear", "chest"];
  for (var i = 0; i < names.length; i++) {
    var name = names[i], v = d[name];
    if (typeof v !== "number" || !Number.isFinite(v) || v <= 0) {
      problems.push("dials." + name + ": number > 0 required");
    }
  }
  if (typeof d.viewDeg === "number" && d.viewDeg > 360) {
    problems.push("dials.viewDeg: at most 360 required");
  }
  return problems;
}
