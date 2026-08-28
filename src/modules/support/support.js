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

// primBox: min and max corners as one array (demo 2940-2945).
export function primBox(pr) {
  const c = pr.cc || pr.c, s = pr.s;
  return [c[0] - s[0] / 2, c[1] - s[1] / 2, c[2] - s[2] / 2,
          c[0] + s[0] / 2, c[1] + s[1] / 2, c[2] + s[2] / 2];
}

// restsOn: the demo's ledger of what counts as bearing (2946-2953).
export function restsOn(A, B) {
  if (A[0] > B[3] + 0.05 || A[3] < B[0] - 0.05) return false;
  if (A[2] > B[5] + 0.05 || A[5] < B[2] - 0.05) return false;
  if (B[4] >= A[1] - 0.22 && B[4] <= A[1] + 0.06) return true;
  if (B[1] <= A[1] && B[4] > A[1] + 0.02) return true;
  return false;
}

// linkDeco: resolve every decoration's host once, by proximity — best
// overlap wins, else nearest gap within 0.45, else no host (demo 2963-2991).
export function linkDeco(level) {
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
    pr.host = bestOv > 0 ? best : (bestGap <= 0.45 ? near : -1);
  }
}

// findUnsupported: ground-up propagation in passes; whatever no pass could
// reach is floating (demo 2992-3016).
export function findUnsupported(level) {
  const n = level.length, ok = new Uint8Array(n), box = new Array(n), open = [];
  for (let i = 0; i < n; i++) {
    const pr = level[i];
    if (pr.ghost || pr.dead || pr.deb || pr.deco || (pr.tgt && pr.down)) { ok[i] = 1; continue; }
    box[i] = primBox(pr);
    if (box[i][1] <= 0.16) ok[i] = 1;
    else open.push(i);
  }
  for (let pass = 0; pass < 24; pass++) {
    let any = 0;
    for (let q = 0; q < open.length; q++) {
      const idx = open[q];
      if (ok[idx]) continue;
      for (let j = 0; j < n; j++) {
        if (!ok[j] || j === idx || !box[j]) continue;
        if (restsOn(box[idx], box[j])) { ok[idx] = 1; any = 1; break; }
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
export function primSupported(level, pr) {
  const idx = level.indexOf(pr);
  return findUnsupported(level).indexOf(idx) < 0;
}

// settleWorld: drop everything unsupported (welded prims stay), hand each
// structural faller to onFall, then sweep decoration until quiet (demo
// 3038-3060). Returns how many pieces went.
export function settleWorld(level, onFall, onGone) {
  const fall = findUnsupported(level);
  let dropped = 0;
  for (let i = 0; i < fall.length; i++) {
    const pr = level[fall[i]];
    if (pr.weld) continue;
    if (!pr.deco && onFall) onFall(pr);
    pr.dead = 1; pr.gone = 1;
    dropped++;
  }
  let swept = 0, guard = 0;
  do { swept = sweepDeco(level, onGone); dropped += swept; guard++; } while (swept && guard < 6);
  return dropped;
}
