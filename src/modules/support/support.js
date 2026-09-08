// modules/support — support propagation, a SHAPED lift from the
// shooting-range demo (holdover-greybox-range-r55-claude-opus-5.html lines
// 2940-3060). The LAW is the demo's, carried exactly and cited by line; the
// CODE differs only in that the demo's globals are arguments: the level is
// passed in, and what happens to a fallen piece is the caller's callback
// (the demo calls vox.dropPrimAsCluster and hides the mesh). The law:
//   - a prim's box is centre plus/minus half size (primBox, 2940-2945);
//   - A rests on B when their footprints overlap within 0.05 and B's top
//     sits in [-0.22, +0.06] of A's base, or B spans A's base (restsOn,
//     2946-2953);
//   - support propagates up from the ground only (base at or under 0.16),
//     in passes, so two floating pieces can never hold each other up
//     (findUnsupported, 2992-3016);
//   - decoration is paint: it never holds anything up, never falls as a
//     body, and goes when its host goes; the host is resolved once by
//     proximity — best overlap first, else the nearest gap within 0.45 —
//     never through other decoration (linkDeco, 2954-2991);
//   - a sweep kills decoration whose host is dead, repeating so rungs on a
//     dead post's rail go in the same settle (sweepDeco, 3019-3031;
//     settleWorld's guard-6 loop, 3054-3055);
//   - settling drops every unsupported structural prim (welded prims stay),
//     hands each to the caller's onFall, marks it dead and gone, then
//     sweeps decoration (settleWorld, 3038-3060).
// Ghosts, the already-dead, debris, decoration, and downed targets never
// need support (3000). Composes with the voxel module: the natural onFall
// is voxWorld.dropPrimAsCluster.
//
// Second pass (phase 0.0.84, batch-general-1.md A5): the law above is
// unchanged; these are its substitutions.
//   1. SUPPORT_TOLERANCES holds the eight literals above as one exported
//      object, the demo's own values as defaults.
//   2. restsOn takes tol last, default SUPPORT_TOLERANCES: tol.overlap in
//      the four footprint tests, tol.restBelow and tol.restAbove in the
//      rest band, tol.spanAbove in the span rule.
//   3. linkDeco takes tol last, default SUPPORT_TOLERANCES: tol.hostGap in
//      the host-gap test.
//   4. findUnsupported takes tol last, default SUPPORT_TOLERANCES:
//      tol.groundBase for the ground test, tol.passes for the loop count,
//      tol passed on to restsOn.
//   5. sweepDeco is unchanged; it reads no literal.
//   6. primSupported takes tol last, default SUPPORT_TOLERANCES, passed on
//      to findUnsupported.
//   7. settleWorld takes tol last, default SUPPORT_TOLERANCES: tol.sweeps
//      for the sweep guard, tol passed on to findUnsupported.
//   8. PRIM_CONTRACT and checkPrim declare the prim's fields and check
//      them in one pass.
//   9. checkTolerances declares the tolerances object's fields and checks
//      them in one pass.

// SUPPORT_TOLERANCES: the demo's eight numbers, as one handed-in object.
export const SUPPORT_TOLERANCES = { overlap: 0.05, restBelow: 0.22, restAbove: 0.06, spanAbove: 0.02, groundBase: 0.16, hostGap: 0.45, passes: 24, sweeps: 6 };

// primBox: min and max corners as one array (demo 2940-2945).
export function primBox(pr) {
  const c = pr.cc || pr.c, s = pr.s;
  return [c[0] - s[0] / 2, c[1] - s[1] / 2, c[2] - s[2] / 2,
          c[0] + s[0] / 2, c[1] + s[1] / 2, c[2] + s[2] / 2];
}

// restsOn: the demo's ledger of what counts as bearing (2946-2953).
export function restsOn(A, B, tol = SUPPORT_TOLERANCES) {
  if (A[0] > B[3] + tol.overlap || A[3] < B[0] - tol.overlap) return false;
  if (A[2] > B[5] + tol.overlap || A[5] < B[2] - tol.overlap) return false;
  if (B[4] >= A[1] - tol.restBelow && B[4] <= A[1] + tol.restAbove) return true;
  if (B[1] <= A[1] && B[4] > A[1] + tol.spanAbove) return true;
  return false;
}

// linkDeco: resolve every decoration's host once, by proximity — best
// overlap wins, else nearest gap within 0.45, else no host (demo 2963-2991).
export function linkDeco(level, tol = SUPPORT_TOLERANCES) {
  for (let i = 0; i < level.length; i++) {
    const pr = level[i];
    if (!pr.deco || pr.host !== undefined) continue;
    const A = primBox(pr);
    let best = -1, bestOv = 0, near = -1, bestGap = 1e9;
    for (let j = 0; j < level.length; j++) {
      const q = level[j];
      if (q.deco || q.ghost || q === pr) continue;
      const B = primBox(q);
      const ox = Math.min(A[3], B[3]) - Math.max(A[0], B[0]);
      const oy = Math.min(A[4], B[4]) - Math.max(A[1], B[1]);
      const oz = Math.min(A[5], B[5]) - Math.max(A[2], B[2]);
      if (ox > 0 && oy > 0 && oz > 0) {
        const ov = ox * oy * oz;
        if (ov > bestOv) { bestOv = ov; best = j; }
        continue;
      }
      const gx = Math.max(A[0] - B[3], B[0] - A[3], 0);
      const gy = Math.max(A[1] - B[4], B[1] - A[4], 0);
      const gz = Math.max(A[2] - B[5], B[2] - A[5], 0);
      const gap = Math.hypot(gx, gy, gz);
      if (gap < bestGap) { bestGap = gap; near = j; }
    }
    pr.host = bestOv > 0 ? best : (bestGap <= tol.hostGap ? near : -1);
  }
}

// findUnsupported: ground-up propagation in passes; whatever no pass could
// reach is floating (demo 2992-3016).
export function findUnsupported(level, tol = SUPPORT_TOLERANCES) {
  const n = level.length, ok = new Uint8Array(n), box = new Array(n), open = [];
  for (let i = 0; i < n; i++) {
    const pr = level[i];
    if (pr.ghost || pr.dead || pr.deb || pr.deco || (pr.tgt && pr.down)) { ok[i] = 1; continue; }
    box[i] = primBox(pr);
    if (box[i][1] <= tol.groundBase) ok[i] = 1;
    else open.push(i);
  }
  for (let pass = 0; pass < tol.passes; pass++) {
    let any = 0;
    for (let q = 0; q < open.length; q++) {
      const idx = open[q];
      if (ok[idx]) continue;
      for (let j = 0; j < n; j++) {
        if (!ok[j] || j === idx || !box[j]) continue;
        if (restsOn(box[idx], box[j], tol)) { ok[idx] = 1; any = 1; break; }
      }
    }
    if (!any) break;
  }
  const out = [];
  for (let k = 0; k < open.length; k++) if (!ok[open[k]]) out.push(open[k]);
  return out;
}

// sweepDeco: paint whose host has gone, goes (demo 3019-3031). onGone is
// told about each swept prim.
export function sweepDeco(level, onGone) {
  let gone = 0;
  for (let i = 0; i < level.length; i++) {
    const pr = level[i];
    if (!pr.deco || pr.dead) continue;
    const h = pr.host;
    if (h === undefined || h < 0) continue;
    const host = level[h];
    if (!host || !host.dead) continue;
    pr.dead = 1;
    if (onGone) onGone(pr);
    gone++;
  }
  return gone;
}

// primSupported: one prim's verdict (demo 3034-3036).
export function primSupported(level, pr, tol = SUPPORT_TOLERANCES) {
  const idx = level.indexOf(pr);
  return findUnsupported(level, tol).indexOf(idx) < 0;
}

// settleWorld: drop everything unsupported (welded prims stay), hand each
// structural faller to onFall, then sweep decoration until quiet (demo
// 3038-3060). Returns how many pieces went.
export function settleWorld(level, onFall, onGone, tol = SUPPORT_TOLERANCES) {
  const fall = findUnsupported(level, tol);
  let dropped = 0;
  for (let i = 0; i < fall.length; i++) {
    const pr = level[fall[i]];
    if (pr.weld) continue;
    if (!pr.deco && onFall) onFall(pr);
    pr.dead = 1; pr.gone = 1;
    dropped++;
  }
  let swept = 0, guard = 0;
  do { swept = sweepDeco(level, onGone); dropped += swept; guard++; } while (swept && guard < tol.sweeps);
  return dropped;
}

// PRIM_CONTRACT: the fields support reads from a level prim.
export const PRIM_CONTRACT = {
  c: "3 finite numbers (centre); required unless cc is present and valid",
  cc: "3 finite numbers (centre override); optional",
  s: "3 finite numbers (size); required",
  deco: "boolean or 0/1; optional",
  ghost: "boolean or 0/1; optional",
  dead: "boolean or 0/1; optional",
  deb: "boolean or 0/1; optional",
  tgt: "boolean or 0/1; optional",
  down: "boolean or 0/1; optional",
  weld: "boolean or 0/1; optional",
  gone: "boolean or 0/1; optional",
  host: "integer >= -1 (index into the level, or -1 for none); optional",
};

const isVec3 = (v) => Array.isArray(v) && v.length === 3 && v.every((n) => typeof n === "number" && Number.isFinite(n));

const PRIM_FLAG_FIELDS = ["deco", "ghost", "dead", "deb", "tgt", "down", "weld", "gone"];

// checkPrim: every problem with a prim, in one pass (PRIM_CONTRACT).
export function checkPrim(pr) {
  if (typeof pr !== "object" || pr === null) return ["prim: not an object"];
  const problems = [];
  if (pr.cc !== undefined) {
    if (!isVec3(pr.cc)) problems.push("prim.cc: 3 finite numbers required");
  } else if (!isVec3(pr.c)) {
    problems.push("prim.c: 3 finite numbers required");
  }
  if (!isVec3(pr.s)) problems.push("prim.s: 3 finite numbers required");
  for (const flag of PRIM_FLAG_FIELDS) {
    const v = pr[flag];
    if (v !== undefined && typeof v !== "boolean" && v !== 0 && v !== 1) {
      problems.push(`prim.${flag}: boolean or 0/1 required`);
    }
  }
  if (pr.host !== undefined && !(Number.isInteger(pr.host) && pr.host >= -1)) {
    problems.push("prim.host: integer >= -1 required");
  }
  return problems;
}

const TOL_POSITIVE_FIELDS = ["overlap", "restBelow", "restAbove", "spanAbove", "groundBase", "hostGap"];
const TOL_INT_FIELDS = ["passes", "sweeps"];

// checkTolerances: every problem with a tolerances object, in one pass.
export function checkTolerances(t) {
  if (typeof t !== "object" || t === null) return ["tolerances: not an object"];
  const problems = [];
  for (const name of TOL_POSITIVE_FIELDS) {
    const v = t[name];
    if (typeof v !== "number" || !(v > 0)) problems.push(`tolerances.${name}: number > 0 required`);
  }
  for (const name of TOL_INT_FIELDS) {
    const v = t[name];
    if (!(Number.isInteger(v) && v >= 1)) problems.push(`tolerances.${name}: integer >= 1 required`);
  }
  return problems;
}
