// COMBO-ENGINE — render3d-test: the render3d module's gate. Nineteen
// checks, rolled seed: the eleven landed checks (1-11, verbatim) on the
// law half, then a recording stub WebGL context and eight checks (12-19)
// on the draw half. Tests functionality only: arithmetic, arrays,
// contracts, call logs, the import list. No real WebGL, no canvas, no DOM,
// no timed simulation.
import fs from "node:fs";
import { mulberry32 } from "../src/modules/ballistics/ballistics.js";
import { makeBox } from "../src/modules/solids/solids.js";
import { makeVoxWorld } from "../src/modules/voxel/voxel.js";
import * as R from "../src/modules/render3d/render3d.js";
import { makeRender3d, checkRenderDials } from "../src/modules/render3d/draw.js";

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

// ---- the recording stub context (12+) ----
// Every WebGL method the draw half calls records its name and its
// arguments into gl.log and returns what the demo expects, the way the
// 2-D renderer's gate records its canvas (render2d-test.mjs makeStubCtx).
// gl._counts, gl._programCalls, gl._drawArraysCalls, and gl._instancedCalls
// give the checks below precise, string-parsing-free answers.
const GL_CONSTANTS = [
  "ARRAY_BUFFER", "BLEND", "CLAMP_TO_EDGE", "COLOR_ATTACHMENT0", "COLOR_BUFFER_BIT",
  "COMPILE_STATUS", "DEPTH_ATTACHMENT", "DEPTH_BUFFER_BIT", "DEPTH_COMPONENT16", "DEPTH_TEST",
  "DYNAMIC_DRAW", "FLOAT", "FRAGMENT_SHADER", "FRAMEBUFFER", "FRAMEBUFFER_COMPLETE",
  "LINEAR", "LINES", "LINK_STATUS", "MAX_FRAGMENT_UNIFORM_VECTORS", "MAX_VARYING_VECTORS",
  "NEAREST", "ONE", "POINTS", "RENDERBUFFER", "RGBA",
  "SRC_ALPHA", "STATIC_DRAW", "TEXTURE0", "TEXTURE1", "TEXTURE2",
  "TEXTURE_2D", "TEXTURE_MAG_FILTER", "TEXTURE_MIN_FILTER", "TEXTURE_WRAP_S", "TEXTURE_WRAP_T",
  "TRIANGLES", "UNSIGNED_BYTE", "VERTEX_SHADER",
];

function makeStubGL() {
  const log = [];
  const counts = {};
  let nextId = 1;
  const bump = (name) => { counts[name] = (counts[name] || 0) + 1; };
  const handle = (kind) => ({ __kind: kind, __id: nextId++ });
  function fmt(v) {
    if (v === null || v === undefined) return String(v);
    if (typeof v === "object") {
      if (v.__kind) return v.__kind + "#" + v.__id;
      if (ArrayBuffer.isView(v)) return "[" + Array.from(v).join(",") + "]";
      if (Array.isArray(v)) return "[" + v.map(fmt).join(",") + "]";
      return JSON.stringify(v);
    }
    return String(v);
  }
  function rec(name, ret) {
    return (...args) => {
      bump(name);
      log.push(name + "(" + args.map(fmt).join(",") + ")");
      return typeof ret === "function" ? ret(...args) : ret;
    };
  }

  const gl = {};
  for (const name of GL_CONSTANTS) gl[name] = nextId++;

  gl.createShader = rec("createShader", () => handle("shader"));
  gl.createProgram = rec("createProgram", () => handle("program"));
  gl.createBuffer = rec("createBuffer", () => handle("buffer"));
  gl.createTexture = rec("createTexture", () => handle("texture"));
  gl.createFramebuffer = rec("createFramebuffer", () => handle("framebuffer"));
  gl.createRenderbuffer = rec("createRenderbuffer", () => handle("renderbuffer"));

  gl.getShaderParameter = rec("getShaderParameter", () => true);
  gl.getProgramParameter = rec("getProgramParameter", () => true);
  gl.getShaderInfoLog = rec("getShaderInfoLog", () => "");
  gl.getProgramInfoLog = rec("getProgramInfoLog", () => "");

  const uniformLocs = new Map();
  gl.getUniformLocation = rec("getUniformLocation", (prog, name) => {
    const key = (prog ? prog.__id : 0) + "|" + name;
    if (!uniformLocs.has(key)) uniformLocs.set(key, handle("uniformLoc"));
    return uniformLocs.get(key);
  });

  const attribLocs = new Map();
  let nextAttrib = 0;
  gl.getAttribLocation = rec("getAttribLocation", (prog, name) => {
    if (!attribLocs.has(name)) attribLocs.set(name, nextAttrib++);
    return attribLocs.get(name);
  });

  gl.checkFramebufferStatus = rec("checkFramebufferStatus", () => gl.FRAMEBUFFER_COMPLETE);
  gl.getParameter = rec("getParameter", () => 256);

  let currentProgram = null;
  const programCalls = [];
  gl.useProgram = (p) => {
    currentProgram = p; programCalls.push(p); bump("useProgram");
    log.push("useProgram(" + fmt(p) + ")");
  };

  const drawArraysCalls = [];
  gl.drawArrays = (...args) => {
    drawArraysCalls.push({ prog: currentProgram, args });
    bump("drawArrays");
    log.push("drawArrays(" + args.map(fmt).join(",") + ")");
  };

  const instancedCalls = [];
  const extStub = {
    vertexAttribDivisorANGLE: rec("vertexAttribDivisorANGLE", undefined),
    drawArraysInstancedANGLE: (...args) => {
      instancedCalls.push({ prog: currentProgram, count: args[3] });
      bump("drawArraysInstancedANGLE");
      log.push("drawArraysInstancedANGLE(" + args.map(fmt).join(",") + ")");
    },
  };
  gl.getExtension = rec("getExtension", (name) => (name === "ANGLE_instanced_arrays" ? extStub : null));

  [
    "shaderSource", "compileShader", "attachShader", "linkProgram",
    "bindBuffer", "bufferData", "bufferSubData",
    "bindTexture", "texImage2D", "texParameteri",
    "bindRenderbuffer", "renderbufferStorage",
    "bindFramebuffer", "framebufferTexture2D", "framebufferRenderbuffer",
    "viewport", "clearColor", "clear", "enable", "disable",
    "uniformMatrix4fv", "uniform1f", "uniform1i", "uniform2f",
    "uniform3fv", "uniform4f", "uniform4fv",
    "enableVertexAttribArray", "disableVertexAttribArray", "vertexAttribPointer",
    "activeTexture", "blendFunc", "depthMask", "lineWidth",
  ].forEach((name) => { gl[name] = rec(name, undefined); });

  gl.log = log;
  gl._counts = counts;
  gl._programCalls = programCalls;
  gl._drawArraysCalls = drawArraysCalls;
  gl._instancedCalls = instancedCalls;
  return gl;
}

// a rolled-point level of three structural boxes plus one ghost box,
// shared by checks 13-15.
function rolledDrawLevel() {
  return [
    { id: "b0", p: "concrete", m: 0, c: [roll(-6, 6), 0.5, roll(-6, 6)], s: [1, 1, 1] },
    { id: "b1", p: "concrete", m: 0, c: [roll(-6, 6), 0.5, roll(-6, 6)], s: [1, 1, 1] },
    { id: "b2", p: "concrete", m: 0, c: [roll(-6, 6), 0.5, roll(-6, 6)], s: [1, 1, 1] },
    { id: "g0", p: "steel", m: 0, c: [roll(-6, 6), 0.5, roll(-6, 6)], s: [0.5, 0.5, 0.5], ghost: 1 },
  ];
}

// 12. init compiles the twelve programs and builds the shadow target.
{
  const gl = makeStubGL();
  const surface = makeRender3d({ gl });
  surface.init();
  const c = gl._counts;
  const ok = c.createProgram === 12 && c.createShader === 24 && c.createTexture === 1 &&
    c.createRenderbuffer === 1 && c.createFramebuffer === 1 && surface.shadOn === 1;
  check("render3d draw: init compiles the twelve programs and builds the shadow target on a recording stub", ok);
}

// 13. one frame issues the passes in the stated order with draw calls
// equal to the sets present.
{
  const gl = makeStubGL();
  const surface = makeRender3d({ gl });
  surface.init();
  const afterInit = { ...gl._counts };
  surface.resize(640, 480);
  surface.setLevel(rolledDrawLevel());
  surface.rebuildDynamic();
  surface.frame(1.5);

  const expectedProgs = [
    surface.progD, surface.progSky, surface.progS, surface.progEdge,
    surface.progS, surface.progEdge, surface.progF,
    surface.progBright, surface.progBlur, surface.progBlur, surface.progRays, surface.progComp,
  ];
  const seq = gl._programCalls;
  const seqOk = seq.length === expectedProgs.length && seq.every((p, i) => p === expectedProgs[i]);
  const drawOk = gl._drawArraysCalls.length === 12;
  const texSince = (gl._counts.createTexture || 0) - (afterInit.createTexture || 0);
  const fbSince = (gl._counts.createFramebuffer || 0) - (afterInit.createFramebuffer || 0);
  const postOk = texSince === 4 && fbSince === 4;

  check("render3d draw: one frame issues the passes in the stated order with draw calls equal to the sets present",
    seqOk && drawOk && postOk);
}

// 14. twin frames on twin stubs record identical call logs.
{
  const level = rolledDrawLevel();
  function run() {
    const gl = makeStubGL();
    const surface = makeRender3d({ gl });
    surface.init();
    surface.resize(320, 240);
    surface.setLevel(level.map((p) => ({ ...p, c: p.c.slice(), s: p.s.slice() })));
    surface.rebuildDynamic();
    surface.frame(2.25);
    return gl.log;
  }
  const logA = run(), logB = run();
  check("render3d draw: twin frames on twin stubs record identical call logs", JSON.stringify(logA) === JSON.stringify(logB));
}

// 15. the outline branch draws when its dial is on and not when off.
{
  const level = [{ id: "b0", p: "concrete", m: 0, c: [0, 0.5, 0], s: [1, 1, 1] }];
  function run(dials) {
    const gl = makeStubGL();
    const surface = makeRender3d({ gl, dials });
    surface.init();
    surface.resize(320, 240);
    surface.setLevel(level.map((p) => ({ ...p, c: p.c.slice(), s: p.s.slice() })));
    surface.rebuildDynamic();
    surface.frame(0.5);
    return { gl, surface };
  }
  const off = run({ outline: 0 });
  const on = run({});

  const offOk = off.surface.progEdge === null &&
    off.gl._drawArraysCalls.some((c) => c.args[0] === off.gl.LINES && c.prog === off.surface.progF);
  const onOk = on.surface.progEdge !== null &&
    on.gl._programCalls.includes(on.surface.progEdge) &&
    !on.gl._drawArraysCalls.some((c) => c.args[0] === on.gl.LINES);

  check("render3d draw: the outline branch draws when its dial is on and not when off", offOk && onOk);
}

// 16. instances draw when a voxel world is set.
{
  const gl = makeStubGL();
  const surface = makeRender3d({ gl });
  surface.init();
  surface.resize(320, 240);

  const vox = makeVoxWorld({ rng: mulberry32(Math.floor(rng() * 0x100000000)), sizes: { rock: 0.6 }, defSize: 0.6 });
  const pr = { c: [0, 1.5, 0], s: [3, 3, 3], p: "rock", m: 0 };
  vox.damage(pr, pr.c[0], pr.c[1], pr.c[2], 800, 0, 0, 0);
  const pr2 = { c: [10, 1, 0], s: [1, 1, 1], p: "wood", m: 1 };
  vox.dropPrimAsCluster(pr2);
  surface.setVoxels(vox);
  surface.packInstances(() => [1, 1, 1]);
  const nInstD = surface.nInstD;

  surface.frame(0.75);

  const framePass = gl._instancedCalls.some((c) => c.count === nInstD && c.prog === surface.progI);
  const shadowPass = gl._instancedCalls.some((c) => c.count === nInstD && c.prog === surface.progDI);

  check("render3d draw: instances draw when a voxel world is set",
    vox.dyn.length > 0 && nInstD > 0 && framePass && shadowPass);
}

// 17. patchAt splits a prim into at most six rest boxes and a patch, hides
// the original, and queues a rebuild.
{
  const gl = makeStubGL();
  const surface = makeRender3d({ gl });
  surface.init();
  const pr = { id: "wall", p: "concrete", m: 0, c: [0, 1.5, 0], s: [4, 3, 4] };
  surface.setLevel([pr]);
  const before = surface.level.length;
  const x = pr.c[0] - pr.s[0] / 2 + roll(0, pr.s[0]);
  const y = pr.c[1] - pr.s[1] / 2 + roll(0, pr.s[1]);
  const z = pr.c[2] - pr.s[2] / 2 + roll(0, pr.s[2]);
  surface.patchAt(pr, x, y, z);
  const grew = surface.level.length - before;
  const growOk = grew >= 2 && grew <= 7;
  const deadOk = pr.dead === 1;
  const idx = surface.level.indexOf(pr);
  const inQueueOk = surface.hideQueue.includes(idx);
  const dirtyOk = surface.addedDirty === 1 && surface.pendingRebuild === 1;

  const beforeFlush = gl._counts.bufferSubData || 0;
  const n = surface.flushHides();
  const afterFlush = gl._counts.bufferSubData || 0;
  const rangesZeroed = surface.staticRanges[idx * 4 + 1] === 0 && surface.staticRanges[idx * 4 + 3] === 0;

  check("render3d draw: patchAt splits a prim into at most six rest boxes and a patch, hides the original, and queues a rebuild",
    growOk && deadOk && inQueueOk && dirtyOk && n > 0 && afterFlush > beforeFlush && rangesZeroed);
}

// 18. the contract counts every problem.
{
  const bad = checkRenderDials({ outline: 0, shadN: 1.5, shadHalf: 70, fogK: -1, grain: 0.028, vignette: 0.62 });
  const gl = makeStubGL();
  const surface = makeRender3d({ gl });
  const clean = checkRenderDials(surface.dials);
  const nullCase = checkRenderDials(null);
  check("render3d draw: the contract counts every problem", bad.length === 3 && clean.length === 0 && nullCase.length === 1);
}

// 19. the draw half imports only from its own folder or a sibling module.
{
  const src = fs.readFileSync(new URL("../src/modules/render3d/draw.js", import.meta.url), "utf8");
  const specifiers = [...src.matchAll(/import\s+[\s\S]*?\s+from\s+["']([^"']+)["']/g)].map((m) => m[1]);
  const ok = specifiers.length > 0 && specifiers.every((s) => /^\.\.\/[a-z0-9-]+\//.test(s) || /^\.\//.test(s));
  check("render3d draw: the draw half imports only from its own folder or a sibling module", ok);
}

console.log(`render3d-test: ${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
console.log("render3d-test PASS");
