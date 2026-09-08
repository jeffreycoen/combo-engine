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
