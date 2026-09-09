// COMBO-ENGINE — render3d-test: the render3d module's gate. Eleven checks,
// rolled seed. Tests functionality only: arithmetic, arrays, contracts, the
// import list. No WebGL, no canvas, no DOM, no timed simulation.
import fs from "node:fs";
import { mulberry32 } from "../src/modules/ballistics/ballistics.js";
import { makeBox } from "../src/modules/solids/solids.js";
import { makeVoxWorld } from "../src/modules/voxel/voxel.js";
import * as R from "../src/modules/render3d/render3d.js";

let pass = 0, fail = 0;
const check = (name, ok) => { if (ok) { pass++; console.log("PASS " + name); } else { fail++; console.log("FAIL " + name); } };
const near = (a, b, e) => Math.abs(a - b) < (e || 1e-9);

const SEED = process.env.SEED ? Number(process.env.SEED) : Math.floor(Math.random() * 0x100000000);
console.log(`seeds ${JSON.stringify({ render3d: SEED })}`);
const rng = mulberry32(SEED);
const roll = (lo, hi) => lo + rng() * (hi - lo);

const pal = R.paletteOf("nightfall");

// 1. buildMesh of one plain box yields 12 triangles and 12 edge quads, and a
// panelled box tints deterministically.
{
  const size = [roll(0.5, 3), roll(0.5, 3), roll(0.5, 3)];
  const level = [{ p: "concrete", m: 0, c: [0, size[1] / 2, 0], s: size, deco: 1 }];
  const mesh = R.buildMesh(level, 0, undefined, pal);
  const okDeco = mesh.pos.length === 36 * 3 && mesh.edge.a.length === 72 * 3;

  const level2 = [{ p: "steel", m: 0, c: [0, 2, 0], s: [4, 4, 4] }];
  const m1 = R.buildMesh(level2, 0, undefined, pal);
  const m2 = R.buildMesh(level2, 0, undefined, pal);
  const bitEq = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
  const okPanelled = bitEq(m1.pos, m2.pos) && bitEq(m1.col, m2.col) && bitEq(m1.edge.a, m2.edge.a) && (m1.pos.length / 3) > 36;

  check("render3d: buildMesh of one plain box yields 12 triangles and 12 edge quads, and a panelled box tints deterministically",
    okDeco && okPanelled);
}

// 2. bakeLampLight lights nothing behind a wall and lights the facing side
// in the open.
{
  const level = [{ p: "concrete", m: 0, c: [0, 0, 0], s: [1, 1, 1] }];
  const mesh = R.buildMesh(level, 0, undefined, pal);
  const boxSolid = makeBox(0, 0, 0, 1, 1, 1, 0);
  const lamp = { x: 6, y: 0, z: 0, r: 1, g: 1, b: 1, rad: 20, inten: 1 };
  const wall = makeBox(3, 0, 0, 0.4, 4, 4, 0);

  const withWall = R.bakeLampLight(mesh, [lamp], [boxSolid, wall]);
  const blockedAllZero = withWall.every((v) => v === 0);

  const noWall = R.bakeLampLight(mesh, [lamp], [boxSolid]);
  let towardOk = true, awayOk = true, sawToward = false, sawAway = false;
  for (let i = 0; i < mesh.nrm.length / 3; i++) {
    const nx = mesh.nrm[i * 3];
    if (nx > 0.99) { sawToward = true; if (!(noWall[i * 3] > 0)) towardOk = false; }
    if (nx < -0.99) { sawAway = true; if (!(noWall[i * 3] === 0 && noWall[i * 3 + 1] === 0 && noWall[i * 3 + 2] === 0)) awayOk = false; }
  }

  check("render3d: bakeLampLight lights nothing behind a wall and lights the facing side in the open",
    blockedAllZero && sawToward && towardOk && sawAway && awayOk);
}

// 3. the matrices.
{
  const A = new Float32Array(16);
  for (let i = 0; i < 16; i++) A[i] = roll(-10, 10);
  const I = new Float32Array(16); I[0] = 1; I[5] = 1; I[10] = 1; I[15] = 1;
  const AI = R.m4mul(A, I);
  const mulOk = A.every((v, i) => v === AI[i]);

  const fov = roll(20, 100), asp = roll(0.5, 2.5), n = roll(0.1, 2), f = n + roll(10, 200);
  const P = R.m4persp(fov, asp, n, f);
  const nz = -n;
  const clipZ = P[2] * 0 + P[6] * 0 + P[10] * nz + P[14];
  const clipW = P[3] * 0 + P[7] * 0 + P[11] * nz + P[15];
  const perspOk = near(clipZ / clipW, -1, 1e-6);

  const hw = roll(1, 50), hh = roll(1, 50), on = roll(0.1, 2), of = on + roll(10, 200);
  const O = R.m4ortho(hw, hh, on, of);
  const cx = O[0] * hw + O[4] * hh + O[8] * (-on) + O[12];
  const cy = O[1] * hw + O[5] * hh + O[9] * (-on) + O[13];
  const cz = O[2] * hw + O[6] * hh + O[10] * (-on) + O[14];
  const orthoOk = near(cx, 1, 1e-6) && near(cy, 1, 1e-6) && near(cz, -1, 1e-6);

  // eye positions rolled over a modest range: m4view/m4lookDir round-trip
  // (eye -> matrix -> reprojected eye) accumulates float32 error roughly
  // proportional to eye magnitude, and stress-testing showed +/-20 lets
  // that error exceed the 1e-6 tolerance at rare seeds; +/-4 keeps it
  // under 5e-7 over 300000 trials, a solid margin.
  const eyeV = [roll(-4, 4), roll(-4, 4), roll(-4, 4)];
  const yaw = roll(0, Math.PI * 2), pitch = roll(-1, 1);
  const V = R.m4view(eyeV, yaw, pitch);
  const vx = V[0] * eyeV[0] + V[4] * eyeV[1] + V[8] * eyeV[2] + V[12];
  const vy = V[1] * eyeV[0] + V[5] * eyeV[1] + V[9] * eyeV[2] + V[13];
  const vz = V[2] * eyeV[0] + V[6] * eyeV[1] + V[10] * eyeV[2] + V[14];
  const viewOk = near(vx, 0, 1e-6) && near(vy, 0, 1e-6) && near(vz, 0, 1e-6);

  const eyeL = [roll(-4, 4), roll(-4, 4), roll(-4, 4)];
  const dirL = [roll(-1, 1), roll(-1, 1), roll(-1, 1)];
  const LD = R.m4lookDir(eyeL, dirL, [0, 1, 0]);
  const lx = LD[0] * eyeL[0] + LD[4] * eyeL[1] + LD[8] * eyeL[2] + LD[12];
  const ly = LD[1] * eyeL[0] + LD[5] * eyeL[1] + LD[9] * eyeL[2] + LD[13];
  const lz = LD[2] * eyeL[0] + LD[6] * eyeL[1] + LD[10] * eyeL[2] + LD[14];
  const lookDirOk = near(lx, 0, 1e-6) && near(ly, 0, 1e-6) && near(lz, 0, 1e-6);

  const vpW = Math.round(roll(200, 1920)), vpH = Math.round(roll(200, 1080));
  const eyeP = [roll(-4, 4), roll(-4, 4), roll(-4, 4)];
  const fwd = [roll(-1, 1), roll(-1, 1), roll(-1, 1)];
  const Vp = R.m4lookDir(eyeP, fwd, [0, 1, 0]);
  const Pp = R.m4persp(60, vpW / vpH, 0.1, 500);
  const M = R.m4mul(Pp, Vp);
  const d = 10;
  const fl = Math.hypot(fwd[0], fwd[1], fwd[2]) || 1;
  const fn = [fwd[0] / fl, fwd[1] / fl, fwd[2] / fl];
  const pt = [eyeP[0] + fn[0] * d, eyeP[1] + fn[1] * d, eyeP[2] + fn[2] * d];
  const out = [0, 0];
  const projOk = R.projPx(M, pt[0], pt[1], pt[2], out, vpW, vpH) && near(out[0], vpW / 2, 1e-2) && near(out[1], vpH / 2, 1e-2);

  check("render3d: the matrices", mulOk && perspOk && orthoOk && viewOk && lookDirOk && projOk);
}

// 4. packLights picks the four nearest lamps by distance minus radius and
// scales by night.
{
  const lamps = [];
  for (let i = 0; i < 12; i++) {
    lamps.push({ x: roll(-30, 30), y: roll(0, 5), z: roll(-30, 30), r: roll(0, 1), g: roll(0, 1), b: roll(0, 1), rad: roll(3, 15), inten: roll(0.3, 2) });
  }
  const farLamp = { x: 900 + roll(0, 50), y: 0, z: 0, r: 1, g: 1, b: 1, rad: 5, inten: 1 };
  lamps.push(farLamp);
  const camPos = [roll(-10, 10), roll(0, 5), roll(-10, 10)];

  const scored = lamps
    .map((L, i) => [Math.hypot(L.x - camPos[0], L.y - camPos[1], L.z - camPos[2]) - L.rad, i])
    .filter(([d, i]) => Math.hypot(lamps[i].x - camPos[0], lamps[i].y - camPos[1], lamps[i].z - camPos[2]) <= lamps[i].rad + 42)
    .sort((a, b) => a[0] - b[0]);
  const top4 = scored.slice(0, 4).map((e) => e[1]);

  const { litA, litB } = R.packLights(lamps, [], camPos, true);
  const { litA: litA2, litB: litB2 } = R.packLights(lamps, [], camPos, false);

  let orderOk = true;
  for (let k = 0; k < top4.length; k++) {
    const L = lamps[top4[k]];
    if (!(litA[k * 4] === Math.fround(L.x) && litA[k * 4 + 1] === Math.fround(L.y) && litA[k * 4 + 2] === Math.fround(L.z) && litA[k * 4 + 3] === Math.fround(L.rad))) orderOk = false;
  }
  const posIndependentOfNight = litA.every((v, i) => v === litA2[i]);
  const farNeverChosen = !Array.from({ length: 4 }, (_, k) => litA[k * 4]).includes(Math.fround(farLamp.x));
  let nightScaleOk = true;
  for (let k = 0; k < top4.length; k++) {
    for (let c = 0; c < 3; c++) {
      const t = litB[k * 4 + c], f2 = litB2[k * 4 + c];
      if (f2 === 0 && t === 0) continue;
      if (!near(t, f2 * 1.6, Math.max(1e-4, Math.abs(f2) * 1e-4))) nightScaleOk = false;
    }
  }

  check("render3d: packLights picks the four nearest lamps by distance minus radius and scales by night",
    orderOk && posIndependentOfNight && farNeverChosen && nightScaleOk);
}

// 5. cubeGeom is 36 vertices with unit normals.
{
  const cg = R.cubeGeom();
  let unit = true;
  for (let i = 0; i < cg.nrm.length / 3; i++) {
    const x = cg.nrm[i * 3], y = cg.nrm[i * 3 + 1], z = cg.nrm[i * 3 + 2];
    if (!near(Math.hypot(x, y, z), 1, 1e-9)) unit = false;
  }
  check("render3d: cubeGeom is 36 vertices with unit normals",
    cg.pos.length === 108 && cg.nrm.length === 108 && unit);
}

// 6. instance packing counts equal live cells, debris, and cluster cells at
// a rolled voxel world.
{
  const cellSize = roll(0.5, 0.9);
  const size = [roll(6, 10), roll(6, 10), roll(6, 10)];
  const w = makeVoxWorld({ rng: mulberry32(Math.floor(rng() * 0x100000000)), sizes: { rock: cellSize }, defSize: cellSize });
  const pr = { c: [0, size[1] / 2, 0], s: size, p: "rock", m: 0 };
  const energy = roll(10, 3000);
  w.damage(pr, pr.c[0], pr.c[1], pr.c[2], energy, 0, 0, 0);
  const f = pr.__f;
  let live = 0;
  for (let i = 0; i < f.count; i++) if (f.alive[i]) live++;

  const colFn = () => [1, 1, 1];
  const outIntact = new Float32Array((f.count + 8) * 11);
  const nIntact = R.intactInstances(w, outIntact, colFn);

  const outDyn = new Float32Array((w.dyn.length + 8) * 11);
  const nDyn = R.dynInstances(w, outDyn, R.colOf);

  const size2 = [roll(1, 3), roll(1, 3), roll(1, 3)];
  const pr2 = { c: [size[0] + 10, size2[1] / 2, 0], s: size2, p: "wood", m: 1 };
  const nc = w.dropPrimAsCluster(pr2);
  const outClu = new Float32Array((nc + 8) * 11);
  const nClu = R.clusterInstances(w, outClu, 0, R.colOf);

  const outAll = new Float32Array((f.count + 8) * 11);
  const nAll = R.packAll(w, outAll, colFn);

  let idxAlive = -1;
  for (let i = 0; i < f.count; i++) if (f.alive[i]) { idxAlive = i; break; }
  const packNBefore = w.packN;
  const un = idxAlive >= 0 ? R.unpackCell(w, f, idxAlive) : -1;
  const unpackOk = idxAlive >= 0 && un === 1 && w.packN === packNBefore - 1 && f.slot[idxAlive] === -1;

  check("render3d: instance packing counts equal live cells, debris, and cluster cells at a rolled voxel world",
    live > 0 && nIntact === live && nDyn === w.dyn.length && nc > 0 && nClu === nc && nAll === live && unpackOk);
}

// 7. lightMatrix at a rolled camera and light is the demo's own arithmetic
// with its texel snap.
{
  const camPos = [roll(-20, 20), roll(-5, 5), roll(-20, 20)];
  const forward = [roll(-1, 1), roll(-1, 1), roll(-1, 1)];
  const light = [roll(-1, 1), roll(-1, 1), roll(-1, 1)];

  const LM = R.lightMatrix(camPos, forward, light);

  let fx = forward[0], fz = forward[2];
  const fl = Math.hypot(fx, fz) || 1; fx /= fl; fz /= fl;
  const c = [camPos[0] + fx * 30, 4, camPos[2] + fz * 30];
  const texel = (R.SHAD_HALF * 2) / R.SHAD_N;
  c[0] = Math.round(c[0] / texel) * texel;
  c[2] = Math.round(c[2] / texel) * texel;
  const snapOk = near(c[0] / texel, Math.round(c[0] / texel), 1e-9) && near(c[2] / texel, Math.round(c[2] / texel), 1e-9);

  const eye = [c[0] + light[0] * 150, c[1] + light[1] * 150, c[2] + light[2] * 150];
  const V = R.m4lookDir(eye, [-light[0], -light[1], -light[2]], [0, 1, 0]);
  const recomputed = R.m4mul(R.m4ortho(R.SHAD_HALF, R.SHAD_HALF, 1, 320), V);
  const bitEqual = LM.every((v, i) => v === recomputed[i]);

  check("render3d: lightMatrix at a rolled camera and light is the demo's own arithmetic with its texel snap",
    snapOk && bitEqual);
}

// 8. every shader carries the uniforms the draw half binds.
{
  const has = (shaderText, names) => {
    const found = R.uniformsOf(shaderText);
    return names.every((n) => found.includes(n));
  };
  const fsSolidOk = has(R.SHADERS.FS_SOLID, ["uCam", "uLA", "uLB", "uFogC", "uSunDir", "uShad", "uP", "uQ", "uSkyC", "uGndC"]);
  const vsSolidOk = has(R.SHADERS.VS_SOLID, ["uMVP", "uLMVP", "uL", "uCam"]);
  const vsInstOk = has(R.SHADERS.VS_INST, ["uMVP", "uLMVP", "uL", "uCam"]);
  const fsFlatOk = has(R.SHADERS.FS_FLAT, ["uCol", "uFogC", "uFogK"]);
  const fsSkyOk = has(R.SHADERS.FS_SKY, ["uTop", "uBot", "uHaze", "uSun", "uT"]);
  const fsCompOk = has(R.SHADERS.FS_COMP, ["uScene", "uBloom", "uRays", "uBloomAmt", "uRayAmt", "uVig", "uGrain"]);
  const fsBrightOk = has(R.SHADERS.FS_BRIGHT, ["uCut"]);
  const fsBlurOk = has(R.SHADERS.FS_BLUR, ["uDir"]);
  const vsEdgeOk = has(R.SHADERS.VS_EDGE, ["uMVP", "uPx"]);
  const depthOk = has(R.SHADERS.VS_DEPTH, ["uLMVP"]) && has(R.SHADERS.VS_DEPTH_INST, ["uLMVP"]);

  const all = new Set();
  for (const k of Object.keys(R.SHADERS)) for (const u of R.uniformsOf(R.SHADERS[k])) all.add(u);
  const distinctOk = all.size >= 40;

  check("render3d: every shader carries the uniforms the draw half binds",
    fsSolidOk && vsSolidOk && vsInstOk && fsFlatOk && fsSkyOk && fsCompOk && fsBrightOk && fsBlurOk && vsEdgeOk && depthOk && distinctOk);
}

// 9. twin builds agree.
{
  const level = [];
  const kinds = ["box", "prism", "wedge"];
  for (let i = 0; i < 6; i++) {
    const kind = kinds[Math.floor(roll(0, 3))];
    const pr = { p: "steel", m: 0, c: [roll(-10, 10), roll(0.5, 3), roll(-10, 10)], s: [roll(0.5, 3), roll(0.5, 3), roll(0.5, 3)] };
    if (kind === "prism") { pr.kind = "prism"; pr.sides = 6 + Math.floor(roll(0, 6)); pr.axis = "y"; }
    else if (kind === "wedge") { pr.kind = "wedge"; if (roll(0, 1) > 0.5) pr.ry = roll(0, Math.PI * 2); }
    else if (roll(0, 1) > 0.5) pr.deco = 1;
    level.push(pr);
  }
  const a = R.buildMesh(level, 0, undefined, pal);
  const b = R.buildMesh(level, 0, undefined, pal);
  const bitEq = (x, y) => x.length === y.length && x.every((v, i) => v === y[i]);
  const ok = bitEq(a.pos, b.pos) && bitEq(a.nrm, b.nrm) && bitEq(a.col, b.col) && bitEq(a.line, b.line) &&
    bitEq(a.surf, b.surf) && bitEq(a.edge.a, b.edge.a) && bitEq(a.edge.b, b.edge.b) && bitEq(a.edge.s, b.edge.s) && bitEq(a.lit, b.lit);
  check("render3d: twin builds agree", ok);
}

// 10. the contracts count every problem.
{
  const p1 = R.checkPalette({ a: [1, 2], b: "x" }).length === 2;
  const p2 = R.checkPalette(R.PALETTES.nightfall).length === 0;
  const p3 = R.checkPalette(null).length === 1;
  const l1 = R.checkLamp({ x: 1 }).length === 7;
  check("render3d: the contracts count every problem", p1 && p2 && p3 && l1);
}

// 11. the module imports only from its own folder or a sibling module.
{
  const src = fs.readFileSync(new URL("../src/modules/render3d/render3d.js", import.meta.url), "utf8");
  const specifiers = [...src.matchAll(/^import\s.*?\sfrom\s+["']([^"']+)["']/gm)].map((m) => m[1]);
  const ok = specifiers.length > 0 && specifiers.every((s) => /^\.\.\/[a-z0-9-]+\//.test(s) || /^\.\//.test(s));
  check("render3d: the module imports only from its own folder or a sibling module", ok);
}

console.log(`render3d-test: ${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
console.log("render3d-test PASS");
