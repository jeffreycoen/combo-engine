# Task 0.0.14-1 — the support module

One job: write the support propagation module and its gate exactly as printed below, extend the voxel module with its falling verb, register the gate, prove the numbers, close the records. Every file's full content is below; write exactly what is written, run the listed gates, report. You design nothing.

Suggested model: Sonnet 5.

Required reading, in order (confirm at the top of your report):
1. This file, whole.
2. `docs/plans/phase-0.0.14-support-module.md`, whole.

Source of the law (reference only — do not edit it): `holdover-greybox-range-r55-claude-opus-5.html` lines 2940–3060 and 2569–2597.

## Steps

Run from `/home/batman/combo-engine`. A failed assert stops the task; report the step and its verbatim output, run nothing further.

1. Assert the ground: all prior gates green, destination absent. Each command must end with the tail shown; `absent` must print.

```sh
node scripts/gate.mjs api          # tail: seed 1  seconds 90 (10800 steps)  worldHash 3367709165  runHash 2717846799
node scripts/gate.mjs combat       # tail: ALL PASS
node scripts/gate.mjs accuracy     # tail: 11/11
node scripts/gate.mjs market       # tail: market-test PASS
node scripts/gate.mjs builder      # tail: builder-test PASS
node scripts/gate.mjs ledger       # tail: ledger-test PASS
node scripts/gate.mjs weldstress   # tail: weldstress-test PASS
node scripts/gate.mjs tape         # tail: tape-test PASS
node scripts/gate.mjs physics-pb   # tail: physics-pb-test PASS
node scripts/gate.mjs rig          # tail: rig-test PASS
node scripts/gate.mjs solids       # tail: solids-test PASS
node scripts/gate.mjs ballistics   # tail: ballistics-test PASS
node scripts/gate.mjs orders       # tail: orders-test PASS
node scripts/gate.mjs steering     # tail: steering-test PASS
node scripts/gate.mjs voxel        # tail: voxel-test PASS
ls src/modules/support 2>/dev/null || echo absent
```

2. Extend `src/modules/voxel/voxel.js` (currently 29070 bytes): first add the separator line, then APPEND the block below to the END of the file, exactly, ending at the final `;`:

```sh
printf '\n' >> src/modules/voxel/voxel.js   # the blank separator line before the new block
```

```js
// dropPrimAsCluster: a whole unwounded prim leaves as one falling cluster —
// the support layer's verb for an unsupported piece (demo 2569-2597). The
// demo's Math.random tumble draws from the seeded stream; color is gone.
VoxWorld.prototype.dropPrimAsCluster = function (pr) {
  const c = pr.cc || pr.c, s = pr.s;
  const q = this.sizeFor(pr);
  const nx = Math.max(1, Math.min(8, Math.round(s[0] / q)));
  const ny = Math.max(1, Math.min(8, Math.round(s[1] / q)));
  const nz = Math.max(1, Math.min(8, Math.round(s[2] / q)));
  const sx = s[0] / nx, sy = s[1] / ny, sz = s[2] / nz;
  const n = nx * ny * nz;
  if (this.clusters.length >= VOX.MAX_CLUSTERS) return 0;
  const cells = [];
  let rad = 0;
  for (let a = 0; a < nx; a++) for (let b = 0; b < ny; b++) for (let d = 0; d < nz; d++) {
    const ox = -s[0] / 2 + sx * (a + 0.5);
    const oy = -s[1] / 2 + sy * (b + 0.5);
    const oz = -s[2] / 2 + sz * (d + 0.5);
    cells.push(ox, oy, oz);
    const rr = Math.hypot(ox, oy, oz); if (rr > rad) rad = rr;
  }
  const rho = MEDIA[pr.m] ? MEDIA[pr.m].rho : 1000;
  this.clusters.push({
    x: c[0], y: c[1], z: c[2], vx: 0, vy: 0, vz: 0,
    ra: 0, rb: 0, wa: (this.rng() - 0.5) * 2.2, wb: (this.rng() - 0.5) * 1.4,
    cells, nc: n, sx, sy, sz,
    rad: rad + Math.max(sx, sy, sz) * 0.5,
    mass: rho * sx * sy * sz * n, t: 0,
  });
  return n;
};
```

Then set the exact ending and assert identity:

```sh
truncate -s 30432 src/modules/voxel/voxel.js   # end exactly at the final character, however the writing tool ended the append
printf '\n' >> src/modules/voxel/voxel.js      # the final line's newline
wc -c src/modules/voxel/voxel.js       # must print 30433
sha256sum src/modules/voxel/voxel.js   # must print d28b949e1289bdd41dbbafd94cbb60ebd6c09fc663a2e0363efaeea14bf42922
```

3. Write `src/modules/support/support.js`, exactly as printed, ending at the final `}`; the commands after the block set the ending mechanically:

```js
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
```

Then set the exact ending and assert identity:

```sh
truncate -s 5816 src/modules/support/support.js   # end exactly at the final }, however the writing tool ended the file
printf '\n' >> src/modules/support/support.js     # the final line's newline
wc -c src/modules/support/support.js       # must print 5817
sha256sum src/modules/support/support.js   # must print 6dfd69ad893f42aab0b1002aaa0b97e343eeacc9deee66c3c21679b9de686d8a
```

4. Write `scripts/support-test.mjs`, exactly as printed; the commands after the block set the ending the same way:

```js
// COMBO-ENGINE — support-test: the support propagation module's gate.
// Twelve checks. Seed 9 drives the one falling cluster; no seed is special.
// The fixture is a post carrying a deck, a rust streak painted on the post,
// a flag hung near the deck, and a floater with nothing under it.
import { M, mulberry32 } from "../src/modules/ballistics/ballistics.js";
import { makeVoxWorld } from "../src/modules/voxel/voxel.js";
import { primBox, restsOn, linkDeco, findUnsupported, sweepDeco, primSupported, settleWorld } from "../src/modules/support/support.js";

let pass = 0, fail = 0;
const check = (name, ok) => { if (ok) { pass++; console.log("PASS " + name); } else { fail++; console.log("FAIL " + name); } };
const near = (a, b, e) => Math.abs(a - b) < (e || 1e-9);

const mkLevel = () => [
  { id: 'post', c: [0, 0.5, 0], s: [0.2, 1, 0.2], p: 'strut', m: M.steel_thin },
  { id: 'deck', c: [0, 1.1, 0], s: [1, 0.2, 1], p: 'wood', m: M.wood },
  { id: 'rust', c: [0.1, 0.5, 0], s: [0.05, 0.6, 0.05], p: 'strut', m: M.steel_thin, deco: 1 },
  { id: 'flag', c: [0.8, 1.1, 0], s: [0.3, 0.1, 0.02], p: 'wood', m: M.wood, deco: 1 },
  { id: 'floater', c: [5, 3, 0], s: [0.5, 0.5, 0.5], p: 'concrete', m: M.concrete },
  { id: 'ghostwater', c: [0, 0.01, 5], s: [10, 0.02, 1], p: 'chop', m: M.water, ghost: 1 },
];

check("primBox: centre plus and minus half size, both corners",
  (() => { const b = primBox({ c: [1, 2, 3], s: [2, 4, 6] });
    return near(b[0], 0) && near(b[1], 0) && near(b[2], 0) && near(b[3], 2) && near(b[4], 4) && near(b[5], 6); })());

check("restsOn: the deck rests on the post; a box beside it does not; a spanning wall bears too",
  restsOn(primBox({ c: [0, 1.1, 0], s: [1, 0.2, 1] }), primBox({ c: [0, 0.5, 0], s: [0.2, 1, 0.2] })) === true
  && restsOn(primBox({ c: [3, 1.1, 0], s: [1, 0.2, 1] }), primBox({ c: [0, 0.5, 0], s: [0.2, 1, 0.2] })) === false
  && restsOn(primBox({ c: [0, 1.1, 0], s: [1, 0.2, 1] }), primBox({ c: [0, 1.1, 0], s: [0.1, 2, 0.1] })) === true);

{ const L = mkLevel();
  linkDeco(L);
  check("linkDeco: the rust streak hosts on the post it overlaps, the flag on the deck it hangs near",
    L[2].host === 0 && L[3].host === 1);
  check("linkDeco: a far-off decoration gets no host",
    (() => { const L2 = [{ id: 'lone', c: [50, 1, 0], s: [0.1, 0.1, 0.1], deco: 1 }, ...mkLevel()];
      linkDeco(L2); return L2[0].host === -1; })()); }

{ const L = mkLevel();
  check("findUnsupported: only the floater floats — grounded, chained, deco, and ghost prims all stand",
    (() => { const u = findUnsupported(L); return u.length === 1 && L[u[0]].id === 'floater'; })()); }

{ const L = mkLevel();
  L[0].dead = 1;
  const u = findUnsupported(L);
  check("the chain breaks: kill the post and the deck floats",
    u.some((i) => L[i].id === 'deck')); }

{ const a = { id: 'a', c: [10, 2, 0], s: [1, 0.2, 1] };
  const b = { id: 'b', c: [10, 2.2, 0], s: [1, 0.2, 1] };
  const u = findUnsupported([a, b]);
  check("no mutual holding: two stacked floating slabs both fall — support comes from the ground only",
    u.length === 2); }

{ const L = mkLevel();
  linkDeco(L);
  L[0].dead = 1;
  const goneIds = [];
  const n = sweepDeco(L, (pr) => goneIds.push(pr.id));
  check("sweepDeco: the rust goes with its dead post, the flag stays with the living deck",
    n === 1 && goneIds.length === 1 && goneIds[0] === 'rust' && !L[3].dead); }

{ const L = mkLevel();
  linkDeco(L);
  check("primSupported: the deck says yes, the floater says no",
    primSupported(L, L[1]) === true && primSupported(L, L[4]) === false); }

{ const L = mkLevel();
  linkDeco(L);
  const fell = [];
  const n = settleWorld(L, (pr) => fell.push(pr.id));
  check("settleWorld: the floater falls as a body, one piece total, and is dead and gone",
    n === 1 && fell.length === 1 && fell[0] === 'floater' && L[4].dead === 1 && L[4].gone === 1);
  L[0].dead = 1;
  const fell2 = [];
  const n2 = settleWorld(L, (pr) => fell2.push(pr.id));
  check("cascade: with the post dead the deck falls, then the rust and the deck's flag sweep in the same settle",
    n2 === 3 && fell2.length === 1 && fell2[0] === 'deck' && L[2].dead === 1 && L[3].dead === 1); }

{ const SIZES = { concrete: 0.115 };
  const w = makeVoxWorld({ rng: mulberry32(9), sizes: SIZES });
  const L = mkLevel();
  linkDeco(L);
  settleWorld(L, (pr) => w.dropPrimAsCluster(pr));
  const C = w.clusters[0];
  check("composition: the fallen floater leaves as one voxel cluster — 4 x 4 x 4 cells at concrete density",
    w.clusters.length === 1 && C.nc === 64 && near(C.mass, 2400 * (0.5 / 4) ** 3 * 64, 1e-9) && C.x === 5 && C.y === 3); }

console.log(`support-test: ${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
console.log("support-test PASS");
```

Then set the exact ending and assert identity:

```sh
truncate -s 4752 scripts/support-test.mjs   # end exactly at the final character of the last line
printf '\n' >> scripts/support-test.mjs     # the final line's newline
wc -c scripts/support-test.mjs       # must print 4753
sha256sum scripts/support-test.mjs   # must print 920674c2910f7ac9ad9e5452e5305e472ab8d64147938716f9ec5e98e111b3bd
```

5. In `scripts/gate.mjs`, in the `GATES` table (currently 15 entries ending with `"voxel"`), add one line after the `"voxel"` entry:

```js
  "support": ["scripts/support-test.mjs"],
```

Touch nothing else in the file.

6. Run the new gate through the wrapper, then the voxel gate (its module changed; its numbers must not). The support output must be 12 PASS lines, then exactly `support-test: 12 PASS / 0 FAIL`, then `support-test PASS`, exit 0. The voxel output must end `voxel-test: 14 PASS / 0 FAIL` then `voxel-test PASS`. Any FAIL stops the task before step 7.

```sh
node scripts/gate.mjs support
node scripts/gate.mjs voxel
```

7. Assert the remaining prior gates did not move (same commands and required tails as step 1).

8. Close the records in this landing: bump `package.json` version to `0.0.14`; in `docs/plans/phase-0.0.14-support-module.md` replace the status line with `Status: LANDED, commit stamped below, 2026-08-28. Gate: 12 PASS / 0 FAIL; prior gates unmoved.`; in `README.md` flip the earned checklist box `- [ ] Support propagation: unsupported structure falls; decoration goes with its host` to `- [x]`.

9. Commit and push the landing, then stamp the real hash in a second small commit — NEVER amend after stamping (an amend rewrites the commit and makes every stamped hash stale; phase 0.0.6 proved it):

```sh
git add src/modules/support src/modules/voxel scripts/support-test.mjs scripts/gate.mjs README.md package.json docs/plans
git commit -m "phase 0.0.14 — support propagation lands, shaped

Ground-up support in passes, paint goes with its host, fallers leave as voxel clusters.
support-test: 12 PASS / 0 FAIL; voxel unmoved at 14; fifteen prior gates unmoved.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push origin main
H=$(git rev-parse --short HEAD)
sed -i "s/commit stamped below/commit \`$H\`/" docs/plans/phase-0.0.14-support-module.md
git add docs/plans && git commit -m "phase 0.0.14 record stamped — $H

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push origin main
```

## Acceptance

- Steps 2, 3, and 4 wc -c and sha256 lines match exactly.
- Step 6: `support-test: 12 PASS / 0 FAIL` then `support-test PASS`, exit 0, and `voxel-test: 14 PASS / 0 FAIL` then `voxel-test PASS`.
- Step 7: every prior gate prints its pinned tail unchanged.
- Step 8's three records flipped, riding the landing commit.
- Push accepted by origin.

## Report

Read-confirmation first, then one line of outcome, then bullets: both gates' count and verdict lines verbatim, all three wc -c lines, all three sha256 lines, every prior-gate tail, both commit hashes (landing and stamp), the push results. Every nonconformity its own labeled bullet. Fixture seeds: 9; no seed is special.
