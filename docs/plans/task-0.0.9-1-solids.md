# Task 0.0.9-1 — the solids module

One job: write the plane-set solids module and its gate exactly as printed below, register the gate, prove the numbers, close the records. Every file's full content is below; write exactly what is written, run the listed gates, report. You design nothing.

Suggested model: Sonnet 5.

Required reading, in order (confirm at the top of your report):
1. This file, whole.
2. `docs/plans/phase-0.0.9-solids-module.md`, whole.

Source of the math (reference only — do not edit it): `holdover-greybox-range-r55-claude-opus-5.html` lines 118–216 and 1139–1168.

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
ls src/modules/solids 2>/dev/null || echo absent
```

2. Write `src/modules/solids/solids.js`, exactly as printed, ending at the final `}` (amended after the first dispatch stopped here: the file's last line is an empty line, which a fenced block cannot show; the command below adds it mechanically):

```js
// modules/solids — convex plane-set solids and the one ray routine, lifted
// from the shooting-range demo (holdover-greybox-range-r55-claude-opus-5.html:
// solids and rays lines 118-216, the segment occlusion test lines 1139-1168;
// verbatim math). A solid is planes as [nx,ny,nz,d]*n plus a bounding box;
// one clip routine serves boxes, turned boxes, and n-gon prisms alike.
// Substitutions from the demo, and only these: `export` added to the seven
// functions and the shared hit record; this header added.

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

export const hit = { t: 0, tx: 0, nx: 0, ny: 0, nz: 0, solid: -1, path: 0, mat: 0 };

export function raySolid(s, ox, oy, oz, dx, dy, dz) {
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
  hit.t = tE; hit.tx = tX; hit.nx = enx; hit.ny = eny; hit.nz = enz;
  return true;
}

export function raycastWorld(solids, ox, oy, oz, dx, dy, dz, maxT) {
  let best = Infinity, found = -1, bx = 0, bnx = 0, bny = 0, bnz = 0;
  for (let i = 0; i < solids.length; i++) {
    if (!raySolid(solids[i], ox, oy, oz, dx, dy, dz)) continue;
    const t = hit.t;
    if (t < 1e-9 || t > maxT) continue;
    if (t < best) { best = t; found = i; bx = hit.tx; bnx = hit.nx; bny = hit.ny; bnz = hit.nz; }
  }
  if (found < 0) return false;
  hit.t = best; hit.tx = bx; hit.nx = bnx; hit.ny = bny; hit.nz = bnz; hit.solid = found;
  hit.mat = solids[found].mat;
  hit.path = bx - best;
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
```

Then add the closing empty line and assert identity:

```sh
truncate -s 6531 src/modules/solids/solids.js   # end exactly at the final }, however the writing tool ended the file
printf '\n\n' >> src/modules/solids/solids.js   # that line's newline, then the closing empty line
wc -c src/modules/solids/solids.js       # must print 6533
sha256sum src/modules/solids/solids.js   # must print 6d3ff187f703d0cdc1af56a209bae0b133379c2f8f9b1ed92f534cfceb0bd958
```

3. Write `scripts/solids-test.mjs`, exactly:

```js
// COMBO-ENGINE — solids-test: the plane-set solids module's gate. Twelve
// checks, seedless arithmetic; the knowns are closed-form distances the
// demo's own geometry implies (a 45-degree box corner at 10 - sqrt(2), a
// 4-gon prism's face at 10 - sqrt(1/2), a 64-gon's face at 10 - cos(pi/64)).
import { makeBox, makeBoxYaw, makePrism, makeSlab, hit, raySolid, raycastWorld, rayBlocked } from "../src/modules/solids/solids.js";

let pass = 0, fail = 0;
const check = (name, ok) => { if (ok) { pass++; console.log("PASS " + name); } else { fail++; console.log("FAIL " + name); } };
const near = (a, b) => Math.abs(a - b) < 1e-9;

const unit = makeBox(0, 0, 0, 1, 1, 1, 3);

check("box entry: unit box from x=-10 enters at 9.5, exits at 10.5, normal (-1,0,0)",
  raySolid(unit, -10, 0, 0, 1, 0, 0) && near(hit.t, 9.5) && near(hit.tx, 10.5) && hit.nx === -1 && hit.ny === 0 && hit.nz === 0);

check("box miss: the same ray two units up finds nothing",
  raySolid(unit, -10, 2, 0, 1, 0, 0) === false);

check("world hit: path through the unit box is exactly 1, material carried, solid indexed",
  raycastWorld([unit], -10, 0, 0, 1, 0, 0, 100) && near(hit.path, 1) && hit.mat === 3 && hit.solid === 0);

check("inside start: a ray born inside the box reports no world hit",
  raycastWorld([unit], 0, 0, 0, 1, 0, 0, 100) === false);

check("slab is box: makeSlab returns the same six planes as makeBox",
  (() => { const s = makeSlab(1, 2, 3, 4, 5, 6, 7), b = makeBox(1, 2, 3, 4, 5, 6, 7);
    if (s.n !== b.n || s.mat !== b.mat) return false;
    for (let i = 0; i < 24; i++) if (s.planes[i] !== b.planes[i]) return false;
    return true; })());

check("turned box: a 2-cube yawed 45 degrees meets the x ray at its corner, 10 - sqrt(2)",
  raySolid(makeBoxYaw(0, 0, 0, 2, 2, 2, 0, Math.PI / 4), -10, 0, 0, 1, 0, 0) && near(hit.t, 10 - Math.SQRT2));

check("zero yaw short-circuits: makeBoxYaw(ry=0) is makeBox's axis-aligned planes",
  (() => { const y = makeBoxYaw(0, 0, 0, 2, 2, 2, 0, 0);
    return y.n === 6 && y.planes[0] === 1 && y.planes[3] === 1; })());

check("4-gon prism: the ring sits a face at 10 - sqrt(1/2) on the x ray",
  raySolid(makePrism(0, 0, 0, 2, 2, 2, 0, 4, "y"), -10, 0, 0, 1, 0, 0) && near(hit.t, 10 - Math.SQRT1_2));

check("prism cap: straight down onto the y=1 cap enters at 9",
  raySolid(makePrism(0, 0, 0, 2, 2, 2, 0, 4, "y"), 0, 10, 0, 0, -1, 0) && near(hit.t, 9));

check("64-gon prism: a near-cylinder's face meets the x ray at 10 - cos(pi/64)",
  raySolid(makePrism(0, 0, 0, 2, 2, 2, 0, 64, "y"), -10, 0, 0, 1, 0, 0) && near(hit.t, 10 - Math.cos(Math.PI / 64)));

check("nearest wins, maxT rules: of two boxes the near one is chosen; past maxT nothing is",
  (() => { const far = makeBox(5, 0, 0, 1, 1, 1, 9);
    const both = raycastWorld([far, unit], -10, 0, 0, 1, 0, 0, 100) && hit.solid === 1 && near(hit.t, 9.5);
    const capped = raycastWorld([far], -10, 0, 0, 1, 0, 0, 5) === false;
    return both && capped; })());

check("occlusion: the wall blocks the lamp segment, the offset segment passes clean",
  (() => { const wall = makeBox(0, 0, 0, 1, 4, 4, 0);
    return rayBlocked([wall], -5, 0, 0, 5, 0, 0, -1) === 1
      && rayBlocked([wall], -5, 5, 0, 5, 5, 0, -1) === 0
      && rayBlocked([wall], -5, 0, 10, 5, 0, 10, -1) === 0; })());

console.log(`solids-test: ${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
console.log("solids-test PASS");
```

Then assert its identity:

```sh
sha256sum scripts/solids-test.mjs   # must print f9d23ed832b888b55af029c1b1a185562558c3de518b0c843153e3526592f01c
```

4. In `scripts/gate.mjs`, in the `GATES` table (currently 10 entries ending with `"rig"`), add one line after the `"rig"` entry:

```js
  "solids": ["scripts/solids-test.mjs"],
```

Touch nothing else in the file.

5. Run the new gate through the wrapper. The output must be 12 PASS lines, then exactly `solids-test: 12 PASS / 0 FAIL`, then `solids-test PASS`, exit 0. Any FAIL stops the task before step 6.

```sh
node scripts/gate.mjs solids
```

6. Assert the prior gates did not move (same commands and required tails as step 1).

7. Close the records in this landing: bump `package.json` version to `0.0.9`; in `docs/plans/phase-0.0.9-solids-module.md` replace the status line with `Status: LANDED, commit stamped below, 2026-08-28. Gate: 12 PASS / 0 FAIL; prior gates unmoved.`; in `README.md` flip the earned checklist box `- [ ] Plane-set solids: boxes, turned boxes, prisms, one ray routine for all of them` to `- [x]`.

8. Commit and push the landing, then stamp the real hash in a second small commit — NEVER amend after stamping (an amend rewrites the commit and makes every stamped hash stale; phase 0.0.6 proved it):

```sh
git add src/modules/solids scripts/solids-test.mjs scripts/gate.mjs README.md package.json docs/plans
git commit -m "phase 0.0.9 — plane-set solids land, verbatim math

Boxes, turned boxes, n-gon prisms, one ray routine; occlusion segment test.
solids-test: 12 PASS / 0 FAIL; ten prior gates unmoved.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push origin main
H=$(git rev-parse --short HEAD)
sed -i "s/commit stamped below/commit \`$H\`/" docs/plans/phase-0.0.9-solids-module.md
git add docs/plans && git commit -m "phase 0.0.9 record stamped — $H

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push origin main
```

## Acceptance

- Step 2 and step 3 sha256 lines match exactly.
- Step 5: `solids-test: 12 PASS / 0 FAIL` then `solids-test PASS`, exit 0, and an `ok` line in `.superpowers/gates.log`.
- Step 6: every prior gate prints its pinned tail unchanged.
- Step 7's three records flipped, riding the landing commit.
- Push accepted by origin.

## Report

Read-confirmation first, then one line of outcome, then bullets: the gate's count line and verdict line verbatim, both sha256 lines, every prior-gate tail, both commit hashes (landing and stamp), the push results. Every nonconformity its own labeled bullet. Fixture seeds: none — seedless arithmetic; no seed is special.
