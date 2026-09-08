# Task 0.0.74-1 — the 2-D canvas renderer core

One job: land the renderer core, byte-for-byte from this plan. Write exactly what is written, run the listed gates, report. You design nothing. Runs only after phase 0.0.73 has landed.

Suggested model: Sonnet 5.

Required reading, in order (confirm at the top of your report):
1. This file, whole.
2. `docs/plans/phase-0.0.74-render2d.md`, whole.

Source of the math (reference only — do not edit it): `deadweight-hangar.html` lines 841–897, 2642, 2658.

## Steps

Run from `/home/batman/combo-engine`. A failed assert stops the task; report the step and its verbatim output, run nothing further.

1. Assert the ground:

```sh
node scripts/gate.mjs wells | tail -1      # must print: wells-test PASS
node scripts/gate.mjs aim | tail -1        # must print: aim-test PASS
node scripts/gate.mjs registry | tail -1   # must print: registry-test: 4 PASS / 1 FAIL  (the standing red, named in the phase doc)
ls src/modules/render2d 2>/dev/null || echo absent   # must print: absent
```

2. Write `src/modules/render2d/render2d.js`, exactly:

```js
// MODULE: render2d — the 2-D canvas renderer core, lifted VERBATIM MATH
// from the deadweight hangar demo (deadweight-hangar.html lines 841-858,
// 860-897, 2642, 2658). The camera's iso projection, the well warp
// (wellProf/pot), and the gravity-warped grid draw (gridDraw) are copied
// exactly; only the globals that carried them move onto the maker's
// surface. No DOM, no window: draws through any ctx object exposing the
// canvas 2d calls gridDraw uses.
//
// Substitutions from the demo, numbered, and only these:
//   1. cam (line 841): the page's `let cam={x:0,y:0,z:5,rot:0}` ->
//      surface.cam, seeded from opts.cam, same default shape.
//   2. VCX/VCY/potLock (line 842): page globals -> surface.VCX,
//      surface.VCY (both start 0), surface.potLock (opts.potLock,
//      default false — the demo's null-sentinel "no lock" reads as
//      surface.potLock == null, so false and null both mean unlocked).
//   3. iso (843-848): page function -> surface.project(x,y,h). cam.* ->
//      this.cam.*; potLock -> this.potLock; _pR -> this._pR; pot(x,y) ->
//      this.pot(x,y). C30/S30 (the demo's own module-level constants,
//      Math.cos(Math.PI/6) and .5, defined at its line 156) are carried
//      as unchanged local constants — they are not in the substituted
//      globals list.
//   4. wellProf (849-853): page function -> surface.wellProf(w). DEEP ->
//      this.deep. w.name/w.mu/w.r are well-object fields, not globals,
//      and are unchanged.
//   5. DEEP/_pR (854): `const DEEP=4.4;let _pR=0;` -> opts.deep (default
//      4.4) seeding surface.deep; surface._pR starts 0.
//   6. pot (855-858): page function -> surface.pot(x,y). `mode!=='flight'`
//      -> `this.flat` (the flatten guard named as an option: flat=true
//      is the demo's non-flight, un-warped mode); world.wells ->
//      this.wells; wellProf(w) -> this.wellProf(w); cam.z -> this.cam.z;
//      DEEP -> this.deep.
//   7. gridDraw (860-897): page function(R,sp) -> surface.drawGrid(),
//      reading this.gridR/this.gridSp (opts.gridR default 44,
//      opts.gridSp default 5). cam.x/cam.y -> this.cam.x/this.cam.y;
//      ctx -> this.ctx; PAL.net/PAL.grav -> this.pal.net/this.pal.grav;
//      `mode==='flight'` -> `!this.flat`; pot(mx,my2) -> this.pot(mx,my2);
//      iso(...) -> this.project(...).
//   8. frame bookkeeping (lines 2642 frameRef, 2658): the page's
//      `VCX=W()/2;VCY=H()/2+8;_pR=(mode==='flight')?pot(cam.x,cam.y):0`
//      -> surface.resize(w,h) sets VCX/VCY; surface.frame() sets and
//      returns _pR from the same law (flat inverts the flight test, as
//      in substitution 6).

const C30 = Math.cos(Math.PI / 6), S30 = .5; // demo's own constants, line 156 — unchanged

const DEFAULT_PAL = { net: '50,60,80', grav: '62,100,232' }; // THEMES.light's own values, the only PAL keys gridDraw reads

export function makeRender2d(opts = {}) {
  const surface = {
    ctx: opts.ctx || null,
    pal: opts.pal || DEFAULT_PAL,
    wells: opts.wells || [],
    deep: opts.deep !== undefined ? opts.deep : 4.4,
    gridR: opts.gridR !== undefined ? opts.gridR : 44,
    gridSp: opts.gridSp !== undefined ? opts.gridSp : 5,
    flat: opts.flat !== undefined ? opts.flat : false,
    potLock: opts.potLock !== undefined ? opts.potLock : false,
    cam: opts.cam ? { ...opts.cam } : { x: 0, y: 0, z: 5, rot: 0 },
    VCX: 0, VCY: 0, _pR: 0,

    // resize(w,h): the demo's VCX=W()/2;VCY=H()/2+8 (line 2658).
    resize(w, h) { this.VCX = w / 2; this.VCY = h / 2 + 8; return this; },
    // frame(w,h): sets screen center (if given) then the demo's own
    // per-frame _pR law (frameRef, line 2642; also inlined at 2658).
    frame(w, h) {
      if (w !== undefined) this.resize(w, h);
      this._pR = this.flat ? 0 : this.pot(this.cam.x, this.cam.y);
      return this._pR;
    },

    // wellProf(w): the demo's funnel profile (849-853).
    wellProf(w) {
      if (w.name === 'hole') return [240 / this.deep, 30];
      if (w.name === 'sun') return [70, w.r * 1.5];
      if (w.mu < 0) return [-52, 26];
      return [w.mu > 2500 ? 46 : 40, w.r * 1.6];
    },

    // pot(x,y): the demo's warp depth at a point (855-858).
    pot(x, y) {
      if (this.flat) return 0;
      let d = 0;
      for (const w of this.wells) {
        const r2 = (x - w.x) ** 2 + (y - w.y) ** 2;
        const [A, r0] = this.wellProf(w);
        d += A * r0 * r0 / (r2 + r0 * r0);
      }
      return (this.cam.z / 2.3) * this.deep * Math.max(-60, Math.min(230, d));
    },

    // project(x,y,h): the demo's iso (843-848).
    project(x, y, h) {
      const cam = this.cam;
      if (cam.rot) {
        const c = Math.cos(cam.rot), s2 = Math.sin(cam.rot);
        const rx = x * c - y * s2, ry = x * s2 + y * c; x = rx; y = ry;
      }
      return [this.VCX + ((x - cam.x) - (y - cam.y)) * C30 * cam.z,
      this.VCY + ((x - cam.x) + (y - cam.y)) * S30 * cam.z - (h || 0) * cam.z * 1.15
        + ((this.potLock !== null && this.potLock !== false) ? this.potLock : this.pot(x, y)) - this._pR];
    },

    // drawGrid(): the demo's gridDraw(R,sp) (860-897), R/sp from
    // this.gridR/this.gridSp.
    drawGrid() {
      const ctx = this.ctx, cam = this.cam, R = this.gridR, sp = this.gridSp, pal = this.pal;
      const cgx = Math.round(cam.x / sp) * sp, cgy = Math.round(cam.y / sp) * sp;
      const RANGE = R * sp;
      // pass A: the fabric — every line a full-resolution polyline, vertex each sp
      for (let k = -R; k <= R; k++) {
        for (const axis of [0, 1]) {
          const lineCoord = (axis ? cgy : cgx) + k * sp;
          const perp = Math.abs(lineCoord - (axis ? cam.y : cam.x));
          const fade = Math.max(0, 1 - (perp / RANGE) ** 2) * .17;
          if (fade < .012) continue;
          ctx.strokeStyle = 'rgba(' + pal.net + ',' + fade.toFixed(3) + ')';
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          for (let g = 0; g <= 2 * R; g++) {
            const t2 = (-R + g) * sp;
            const wx = axis ? (cgx + t2) : lineCoord;
            const wy = axis ? lineCoord : (cgy + t2);
            const [qx, qy] = this.project(wx, wy, 0);
            g ? ctx.lineTo(qx, qy) : ctx.moveTo(qx, qy);
          }
          ctx.stroke();
        }
      }
      // pass B: gravity's blue, only where it bites
      if (!this.flat) {
        for (let k = -R; k <= R; k++) for (const axis of [0, 1]) {
          const lineCoord = (axis ? cgy : cgx) + k * sp;
          const perp = Math.abs(lineCoord - (axis ? cam.y : cam.x));
          if (perp > RANGE) continue;
          for (let g = 0; g < 2 * R; g++) {
            const t2 = (-R + g) * sp;
            const mx = axis ? cgx + t2 + sp / 2 : lineCoord, my2 = axis ? lineCoord : cgy + t2 + sp / 2;
            const d = this.pot(mx, my2); const t = Math.min(1, Math.max(0, d) / 95);
            if (t < 0.05) continue;
            const x1 = axis ? cgx + t2 : lineCoord, y1 = axis ? lineCoord : cgy + t2;
            const x2 = axis ? cgx + t2 + sp : lineCoord, y2 = axis ? lineCoord : cgy + t2 + sp;
            ctx.strokeStyle = 'rgba(' + pal.grav + ',' + Math.min(.92, t * 1.05).toFixed(2) + ')';
            ctx.lineWidth = 0.5 + t * 1.7;
            const [a1, a2] = this.project(x1, y1, 0), [b1, b2] = this.project(x2, y2, 0);
            ctx.beginPath(); ctx.moveTo(a1, a2); ctx.lineTo(b1, b2); ctx.stroke();
          }
        }
      }
    },
  };
  return surface;
}
```

Then `sha256sum src/modules/render2d/render2d.js` — must print `326385665be84ee3313a2c257024756297a2d49d877196a0c148d208fe171971`.

3. Write `scripts/render2d-test.mjs`, exactly:

```js
// COMBO-ENGINE — render2d-test: the 2-D canvas renderer gate. Projection,
// warp, flatten, and grid-draw are ratified by laws at rolled cameras and
// wells, twin-driven for identity. NO HARDWIRED SEEDS: rolls fresh each
// run and prints; rerun with SEED=<n> in the environment.
import { makeRender2d } from "../src/modules/render2d/render2d.js";

let pass = 0, fail = 0;
const check = (name, ok) => { if (ok) { pass++; console.log("PASS " + name); } else { fail++; console.log("FAIL " + name); } };
const SEED = process.env.SEED ? +process.env.SEED : Math.floor(Math.random() * 1e9);
console.log("seeds " + JSON.stringify({ render2d: SEED }));
let a = SEED >>> 0;
const rnd = () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

const rollCam = (rot = true) => ({ x: (rnd() - 0.5) * 400, y: (rnd() - 0.5) * 400, z: 1 + rnd() * 8, rot: rot ? (rnd() - 0.5) * 6.28 : 0 });
const rollWell = () => ({ x: (rnd() - 0.5) * 400, y: (rnd() - 0.5) * 400, mu: 500 + rnd() * 12000, r: 5 + rnd() * 40, name: "w" + Math.floor(rnd() * 100) });

// a stub ctx: records every canvas call, headless, no DOM.
function makeStubCtx() {
  const log = [];
  const rec = (name) => (...args) => log.push(name + "(" + args.map((x) => (typeof x === "number" ? x.toFixed(4) : String(x))).join(",") + ")");
  const ctx = { log, beginPath: rec("beginPath"), moveTo: rec("moveTo"), lineTo: rec("lineTo"), stroke: rec("stroke") };
  Object.defineProperty(ctx, "strokeStyle", { set(v) { log.push("strokeStyle=" + v); }, get() { return ""; } });
  Object.defineProperty(ctx, "lineWidth", { set(v) { log.push("lineWidth=" + v.toFixed(4)); }, get() { return 0; } });
  return ctx;
}

// (1) projection self-consistency: the world point at the camera's own
// (x,y), h=0, projects to (VCX, VCY + its own pot dip), derived from the
// module's own pot call — never a pinned literal. rot=0 here: the
// verbatim iso formula rotates the raw x,y before subtracting the
// UNROTATED cam.x/cam.y, so the camera's own point is only screen-center
// invariant when rot is 0 — a property of the lifted formula itself.
{
  let ok = true;
  for (let i = 0; i < 500 && ok; i++) {
    const cam = rollCam(false);
    const wells = [rollWell(), rollWell(), rollWell()];
    const s = makeRender2d({ wells, cam });
    s.resize(800 + rnd() * 400, 600 + rnd() * 300);
    s.frame();
    const [px, py] = s.project(cam.x, cam.y, 0);
    const expectedY = s.VCY + s.pot(cam.x, cam.y) - s._pR;
    ok = Math.abs(px - s.VCX) < 1e-9 && Math.abs(py - expectedY) < 1e-9;
  }
  check("render2d: a point at the camera's own x,y projects to VCX, VCY plus its own pot dip", ok);
}

// (2) warp law: pot magnitude grows monotonically approaching a well
// along a ray, fades toward zero far out, and stays inside the formula's
// own clamp (cam.z/2.3)*deep*[-60,230].
{
  let monotone = true, faded = true, clamped = true;
  for (let i = 0; i < 300 && (monotone && faded && clamped); i++) {
    const cam = rollCam();
    const w = rollWell();
    const s = makeRender2d({ wells: [w], cam });
    const [, r0] = s.wellProf(w);
    const steps = 12;
    let prev = null;
    for (let k = steps; k >= 1; k--) {
      const t = k / steps; // 1 = far (r0*40 out), 0 = at the well
      const dist = r0 * 40 * t;
      const x = w.x + dist, y = w.y;
      const d = s.pot(x, y);
      const mag = (d < 0 ? -1 : 1) * Math.abs(d);
      if (prev !== null && Math.abs(mag) < Math.abs(prev) - 1e-9) monotone = false;
      prev = mag;
      const bound = (cam.z / 2.3) * s.deep;
      if (d > bound * 230 + 1e-6 || d < bound * -60 - 1e-6) clamped = false;
    }
    const far = s.pot(w.x + r0 * 200000, w.y);
    if (Math.abs(far) > 1e-2) faded = false;
  }
  check("render2d: the warp grows monotonically toward a well, fades far out, and stays inside the formula's clamp", monotone && faded && clamped);
}

// (3) flatten guard: flat=true gives pot 0 everywhere.
{
  let allZero = true;
  const cam = rollCam();
  const wells = [rollWell(), rollWell()];
  const s = makeRender2d({ wells, cam, flat: true });
  for (let i = 0; i < 200 && allZero; i++) {
    const x = (rnd() - 0.5) * 1000, y = (rnd() - 0.5) * 1000;
    allZero = s.pot(x, y) === 0;
  }
  check("render2d: flat=true gives pot 0 everywhere", allZero);
}

// (4) twin-call identity: same camera and wells, projected random point
// set identical across two maker instances.
{
  const cam = rollCam();
  const wells = [rollWell(), rollWell(), rollWell()];
  const s1 = makeRender2d({ wells, cam: { ...cam } });
  const s2 = makeRender2d({ wells: wells.map((w) => ({ ...w })), cam: { ...cam } });
  s1.resize(900, 700); s1.frame();
  s2.resize(900, 700); s2.frame();
  let same = true;
  for (let i = 0; i < 400 && same; i++) {
    const x = (rnd() - 0.5) * 500, y = (rnd() - 0.5) * 500, h = rnd() * 20;
    const p1 = s1.project(x, y, h), p2 = s2.project(x, y, h);
    same = p1[0] === p2[0] && p1[1] === p2[1];
  }
  check("render2d: twin instances project the same random point set identically", same);
}

// (5) drawGrid on the stub ctx produces identical call logs across twin
// runs, and a nonzero stroke count.
{
  const cam = rollCam();
  const wells = [rollWell(), rollWell()];
  const ctx1 = makeStubCtx(), ctx2 = makeStubCtx();
  const s1 = makeRender2d({ ctx: ctx1, wells: wells.map((w) => ({ ...w })), cam: { ...cam }, gridR: 6, gridSp: 5 });
  const s2 = makeRender2d({ ctx: ctx2, wells: wells.map((w) => ({ ...w })), cam: { ...cam }, gridR: 6, gridSp: 5 });
  s1.resize(800, 600); s1.frame();
  s2.resize(800, 600); s2.frame();
  s1.drawGrid();
  s2.drawGrid();
  const strokeCount = ctx1.log.filter((l) => l === "stroke()").length;
  const identical = JSON.stringify(ctx1.log) === JSON.stringify(ctx2.log);
  check("render2d: drawGrid produces identical call logs across twin runs with a nonzero stroke count", identical && strokeCount > 0);
}

console.log(`render2d-test: ${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
console.log("render2d-test PASS");
```

Then `sha256sum scripts/render2d-test.mjs` — must print `20d87ea6864561ec859d2a02c11cb193a3bf9c11fc6bd907750d8bc7205b6055`.

4. In `scripts/gate.mjs`, in the GATES table, add one line after the `"aim"` entry:

```js
  "render2d": ["scripts/render2d-test.mjs"],
```

Touch nothing else in the file.

5. In `src/modules/registry/registry.js`, in the REGISTRY table, add one line after the `aim` entry, before the `// carved depot organs` comment:

```js
  render2d: { seam: "draw", gate: "render2d" },
```

Touch nothing else in the file.

6. Run the new gate — a rolled seeds line, 5 PASS lines, `render2d-test: 5 PASS / 0 FAIL`, `render2d-test PASS`, exit 0. Any FAIL stops the task.

```sh
node scripts/gate.mjs render2d
```

7. Bracket unmoved:

```sh
node scripts/gate.mjs wells | tail -1      # must print: wells-test PASS
node scripts/gate.mjs aim | tail -1        # must print: aim-test PASS
node scripts/gate.mjs registry | tail -1   # must print: registry-test: 4 PASS / 1 FAIL  (unchanged)
```

8. Close the records: `package.json` version to `0.0.74`; the phase doc's status line to LANDED as its comment shows; in `README.md` flip the checklist box starting `- [ ] The 2-D canvas renderer` to `- [x]`, and add the line `- [x] render2d — the 2-D canvas renderer, with the gravity-warped grid — 0.0.74` at the bottom of the "Serving checklist items" list.

9. Commit and push, then stamp:

```sh
git add src/modules/render2d/render2d.js scripts/render2d-test.mjs scripts/gate.mjs src/modules/registry/registry.js package.json README.md docs/plans/phase-0.0.74-render2d.md docs/plans/task-0.0.74-1-render2d.md
git commit -m "phase 0.0.74 — the 2-D canvas renderer core

Checklist: the 2-D canvas renderer, with the gravity-warped grid. Projection, dip, and grid carried verbatim-math from the deadweight demo. Gate 5 PASS / 0 FAIL at rolled seeds; wells and aim unmoved; registry's standing red unchanged.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push origin main
H=$(git rev-parse --short HEAD)
sed -i "s/commit stamped below/commit \`$H\`/" docs/plans/phase-0.0.74-render2d.md
git add docs/plans/phase-0.0.74-render2d.md && git commit -m "phase 0.0.74 record stamped — $H

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push origin main
```

## Acceptance

- Both sha256 lines exact; the gate `render2d-test: 5 PASS / 0 FAIL` then `render2d-test PASS` at rolled seeds; wells and aim tails unchanged; registry's line `4 PASS / 1 FAIL` unchanged on both sides; records flipped riding the landing; pushes accepted.

## Report

Read-confirmation first, then one line of outcome, then bullets: the sha256 lines verbatim, the gate's seeds/count/verdict lines, the wells, aim, and registry tails, both commit hashes, the push results. Every nonconformity its own labeled bullet. Fixture seeds: rolled at run time, printed by the gate; no seed is special.
