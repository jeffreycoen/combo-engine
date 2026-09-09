// modules/render3d/draw — the 3-D lit renderer's second half: the draw. A
// SHAPED lift from the shooting-range demo (holdover-greybox-range-r55-
// claude-opus-5.html: compile 1476-1488, the buffer set per mesh 2654-2668,
// flashes 2713-2725 (already carried by render3d.js as addFlash and
// stepFlashes, used here only via the surface's own lists, not lifted
// again), the static/added/dynamic rebuilds and the patch split and hide
// queue 2727-2817, the instanced draw and its 11-float 44-byte layout
// 3298-3330, the frame's pass order 3582-3701, the targets and the post
// chain 3706-3814, the shadow pass and the depth-instanced pass and the
// shadow binding and the draw sets 3829-3928, the renderer part of init
// with the cube buffers, the instance arrays, and the shadow target
// 3941-4017). MODULE: render3d (draw half). Box: "The 3-D lit renderer:
// shadows, baked lamps, sky, finishing pass, edge outlines, instanced
// debris" (batch-general-1.md, B6; second of two phases — the box flips
// here). The law carried: the pass order (sky, shadow, static, added,
// dynamic, instanced, post), the shadow map and its bias and filter, the
// four-light budget, the outline pass, the post chain (bloom, rays,
// anti-aliasing, tonemap, vignette, grain). New: one surface from
// makeRender3d({ gl, palette, dials }); every page global a field of the
// surface; the context and the clock are handed in; nothing here touches
// the DOM, a canvas element, requestAnimationFrame, or a clock. The
// outline dial gates whether the edge program compiles at all (0 disables
// it; the demo's own OUTLINE_PX was always a fixed positive number and
// never gated compilation) — a dial made meaningful, not a new law.
//
// NONCONFORMITY: the trail colour table TRAIL_COL (demo line 3242, five
// RGB triples) is read at demo line 3631 inside the frame pass order this
// task cites (3582-3701), but line 3242 itself falls outside every reading
// range named by this task or by phase 0.0.100. Render3d.js does not
// export it. Carried here verbatim from the demo, uncited by the brief.

import {
  paletteOf, PAL_NAMES, SKY_SETS, SHADERS, INK,
  EMIS_BOOST, BLOOM_CUT, BLOOM_AMT, RAY_AMT,
  OUTLINE_PX, SHAD_N, SHAD_HALF, FOG_K,
  m4mul, m4persp, m4view, lightMatrix, cubeGeom,
  buildMesh, bakeLampLight, collectLamps, patchBox, boxMinusBox,
  intactInstances, dynInstances, clusterInstances, colOf,
} from "./render3d.js";
import { buildSolids } from "../greybox/greybox.js";
import { VOX } from "../voxel/voxel.js";

const MAX_ATTR = 8;

// TRAIL_COL: demo line 3242, verbatim — see the NONCONFORMITY note above.
const TRAIL_COL = [
  [0.94, 0.90, 0.80], [0.86, 0.82, 0.70], [0.78, 0.88, 0.94],
  [0.98, 0.86, 0.58], [0.90, 0.86, 0.74],
];

// compile: the demo's own body (1476-1488), gl handed in, no globals read.
function compile(gl, vs, fs) {
  function sh(t, src) {
    var s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }
  var p = gl.createProgram();
  gl.attachShader(p, sh(gl.VERTEX_SHADER, vs));
  gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  return p;
}

// makeRender3d: one surface over a handed WebGL context. Every page global
// that the draw half reads becomes a field, seeded from the demo's own
// values (2607-2652, 2635, 2638, 2641, 3705, 3941-4017).
export function makeRender3d(opts) {
  opts = opts || {};
  const paletteName = opts.palette !== undefined ? opts.palette : "nightfall";
  const palIdx = PAL_NAMES.indexOf(paletteName);
  const skySet = SKY_SETS[palIdx];
  const dials = Object.assign(
    { outline: OUTLINE_PX, shadN: SHAD_N, shadHalf: SHAD_HALF, fogK: FOG_K, grain: 0.028, vignette: 0.62 },
    opts.dials
  );

  const surface = {
    gl: opts.gl,
    ext: opts.gl ? opts.gl.getExtension("ANGLE_instanced_arrays") : null,

    progS: null, progSky: null, progD: null, progDI: null, progTrail: null,
    progBright: null, progBlur: null, progRays: null, progComp: null,
    progF: null, progEdge: null, progI: null,

    bS: {}, bD: {}, bW: {}, bA: {}, bCube: {},
    bQuad: null, bSky: null, bTrail: null, bMark: null, bBore: null,

    nS: 0, nSL: 0, nA: 0, nAL: 0, nD: 0, nDL: 0, nW: 0, nWL: 0, nInstS: 0, nInstD: 0,

    shadTex: null, shadRB: null, shadFB: null, shadOn: 1, LMVP: null,

    postOn: 1, postW: 0, postH: 0,
    sceneFB: null, sceneTex: null, sceneRB: null,
    bloomFB: [], bloomTex: [], rayFB: null, rayTex: null,

    pal: paletteOf(paletteName), palIdx: palIdx, night: palIdx === 2,
    skyTop: skySet[0], skyBot: skySet[1], haze: skySet[2],
    ambSky: skySet[3], ambGnd: skySet[4], fogC: skySet[5],
    light: skySet[6].slice(),

    cam: { pos: [0, 7.4, 6], yaw: 0.04, pitch: -0.055, fov: 46 },
    basis: { r: [1, 0, 0], u: [0, 1, 0], f: [0, 0, -1] },

    level: [], world: null, splitBase: 0, staticRanges: null, zeroScratch: null,
    hideQueue: [], addedDirty: 0, pendingRebuild: 0,

    lamps: [], flashes: [], litA: new Float32Array(16), litB: new Float32Array(16),

    vox: null, instS: null, instD: null,

    trails: {}, sparks: [], markers: [],

    showBore: 0,
    vpW: 1, vpH: 1,
    shaderErr: "", glLimits: "",

    dials: dials,
    _t: 0,
  };

  addMethods(surface);
  return surface;
}

// addMethods: the surface's functions, split into small groups so each
// group is written and checked as its own piece. Same object, same
// bindings, as if written as one literal.
function addMethods(surface) {
  addInitMethods(surface);
  addBufferMethods(surface);
  addPatchMethods(surface);
  addTargetMethods(surface);
  addPostPassMethod(surface);
  addShadowMethods(surface);
  addDrawMethods(surface);
  addFrameMethod(surface);
}

// init, resize, setLevel, rebuildStatic, rebuildDynamic, setVoxels.
function addInitMethods(surface) {
  Object.assign(surface, {
    // init: the renderer part of the demo's init (3941-4017) — programs
    // with their fallbacks, the quad and sky buffers, the trail buffer,
    // mkbuf on the four sets, the mark and bore buffers, the extension and
    // the instanced programs, the cube buffers and the instance arrays
    // sized by the voxel limits, the shadow texture, renderbuffer, and
    // framebuffer. this.ext is already seeded; init only compiles the
    // instanced programs and cube buffers when it is set.
    init() {
      const gl = this.gl;
      try {
        this.progS = compile(gl, SHADERS.VS_SOLID, SHADERS.FS_SOLID);
        this.progSky = compile(gl, SHADERS.VS_SKY, SHADERS.FS_SKY);
      } catch (e) {
        this.shaderErr = "core: " + e.message;
        this.progS = compile(gl, SHADERS.VS_MIN, SHADERS.FS_MIN);
        this.progSky = compile(gl, SHADERS.VS_SKY, SHADERS.FS_SKY_MIN);
      }
      try { this.progD = compile(gl, SHADERS.VS_DEPTH, SHADERS.FS_DEPTH); }
      catch (e) { this.shadOn = 0; this.shaderErr += " depth:" + e.message; }
      this.progTrail = compile(gl, SHADERS.VS_TRAIL, SHADERS.FS_TRAIL);
      try {
        this.progBright = compile(gl, SHADERS.VS_QUAD, SHADERS.FS_BRIGHT);
        this.progBlur = compile(gl, SHADERS.VS_QUAD, SHADERS.FS_BLUR);
        this.progRays = compile(gl, SHADERS.VS_QUAD, SHADERS.FS_RAYS);
        this.progComp = compile(gl, SHADERS.VS_QUAD, SHADERS.FS_COMP);
      } catch (e) { this.postOn = 0; this.shaderErr = "post: " + e.message; }
      this.bQuad = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.bQuad);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      this.bTrail = gl.createBuffer();
      this.bSky = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.bSky);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      this.progF = compile(gl, SHADERS.VS_FLAT, SHADERS.FS_FLAT);
      if (this.dials.outline > 0) {
        try { this.progEdge = compile(gl, SHADERS.VS_EDGE, SHADERS.FS_EDGE); }
        catch (e) { this.progEdge = null; this.shaderErr += " edge:" + e.message; }
      } else {
        this.progEdge = null;
      }
      const gm = gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS), gv = gl.getParameter(gl.MAX_VARYING_VECTORS);
      this.glLimits = gm + "u/" + gv + "v";
      this.mkbuf(this.bS); this.mkbuf(this.bD); this.mkbuf(this.bW); this.mkbuf(this.bA);
      this.bMark = gl.createBuffer(); this.bBore = gl.createBuffer();
      if (this.ext) {
        try {
          this.progI = compile(gl, SHADERS.VS_INST, SHADERS.FS_SOLID);
          this.progDI = compile(gl, SHADERS.VS_DEPTH_INST, SHADERS.FS_DEPTH);
        } catch (e) { this.ext = null; this.shaderErr = "instanced: " + e.message; }
      }
      if (this.ext) {
        const cg = cubeGeom();
        this.bCube.p = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, this.bCube.p); gl.bufferData(gl.ARRAY_BUFFER, cg.pos, gl.STATIC_DRAW);
        this.bCube.n = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, this.bCube.n); gl.bufferData(gl.ARRAY_BUFFER, cg.nrm, gl.STATIC_DRAW);
        this.bCube.s = gl.createBuffer(); this.bCube.d = gl.createBuffer();
        this.instS = new Float32Array(VOX.MAX_STATIC * 11);
        this.instD = new Float32Array((VOX.MAX_DYN + VOX.MAX_CLUSTER_CELLS) * 11);
      }
      this.shadTex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, this.shadTex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.dials.shadN, this.dials.shadN, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      this.shadRB = gl.createRenderbuffer();
      gl.bindRenderbuffer(gl.RENDERBUFFER, this.shadRB);
      gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, this.dials.shadN, this.dials.shadN);
      this.shadFB = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.shadFB);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.shadTex, 0);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.shadRB);
      if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) this.shadOn = 0;
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    },

    // resize: stores the viewport size the page hands in; the canvas
    // element itself stays the page's.
    resize(w, h) {
      this.vpW = w; this.vpH = h;
    },

    // setLevel: stores level and splitBase, then a full static rebuild
    // (demo init 4012: rebuildStatic(1)). rebuildDynamic is a separate
    // call, as in the demo.
    setLevel(level, splitBase) {
      this.level = level;
      this.splitBase = splitBase || 0;
      this.rebuildStatic(1);
    },

    // rebuildStatic: the demo's own body (2727-2749), bal's solids hookup
    // dropped (bal is page-side, not a field of this surface).
    rebuildStatic(full) {
      this.world = buildSolids(this.level);
      if (full || !this.staticRanges) {
        if (!this.splitBase) this.splitBase = this.level.length;
        const m = buildMesh(this.level, 0, this.splitBase, this.pal);
        this.nS = m.pos.length / 3; this.nSL = m.line.length / 3;
        this.staticRanges = m.ranges;
        this.lamps = collectLamps(this.level, this.pal);
        m.lit = bakeLampLight(m, this.lamps, this.world.solids);
        this.upload(this.bS, m);
        this.addedDirty = 1;
      }
      if (this.addedDirty) {
        const ma = buildMesh(this.level, 2, this.splitBase, this.pal);
        this.nA = ma.pos.length / 3; this.nAL = ma.line.length / 3;
        ma.lit = bakeLampLight(ma, this.lamps, this.world.solids);
        this.upload(this.bA, ma);
        this.addedDirty = 0;
      }
    },

    // rebuildDynamic: the demo's own body (2813-2817).
    rebuildDynamic() {
      const m = buildMesh(this.level, 1, undefined, this.pal);
      this.nD = m.pos.length / 3; this.nDL = m.line.length / 3;
      this.upload(this.bD, m);
    },

    // setVoxels: the voxel world the page owns; construction and stepping
    // stay page-side.
    setVoxels(vox) {
      this.vox = vox;
    },
  });
}

// packInstances, setCamera, setLight, mkbuf, upload.
function addBufferMethods(surface) {
  Object.assign(surface, {
    // packInstances: intactInstances fills instS with colFn (the caller's
    // per-prim colour lookup); dynInstances then clusterInstances fill
    // instD with the law half's own colOf (debris and clusters carry no
    // palette). Both buffers upload to bCube.s / bCube.d (demo 2070-2152,
    // 2436-2455 packed the same two lists, uploaded by the demo's own
    // per-frame code this brief does not cite by line).
    packInstances(colFn) {
      const gl = this.gl;
      this.nInstS = intactInstances(this.vox, this.instS, colFn);
      const nDyn = dynInstances(this.vox, this.instD, colOf);
      this.nInstD = clusterInstances(this.vox, this.instD, nDyn, colOf);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.bCube.s);
      gl.bufferData(gl.ARRAY_BUFFER, this.instS, gl.DYNAMIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.bCube.d);
      gl.bufferData(gl.ARRAY_BUFFER, this.instD, gl.DYNAMIC_DRAW);
    },

    // setCamera, setLight: the page's bridge onto the cam/basis/light
    // fields — the demo mutated CAM, basis, and LIGHT directly as globals
    // from many call sites; these are the surface's own setters for the
    // same fields.
    setCamera(cam, basis) {
      if (cam) this.cam = cam;
      if (basis) this.basis = basis;
    },
    setLight(light) {
      this.light = light;
    },

    // mkbuf, upload: the demo's own bodies (2654-2668), gl from this.gl.
    mkbuf(o) {
      const gl = this.gl;
      o.p = gl.createBuffer(); o.n = gl.createBuffer(); o.c = gl.createBuffer(); o.l = gl.createBuffer();
      o.e = gl.createBuffer(); o.ea = gl.createBuffer(); o.eb = gl.createBuffer(); o.es = gl.createBuffer();
      o.lt = gl.createBuffer(); o.nEdge = 0;
    },
    upload(o, m) {
      const gl = this.gl;
      gl.bindBuffer(gl.ARRAY_BUFFER, o.p); gl.bufferData(gl.ARRAY_BUFFER, m.pos, gl.DYNAMIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER, o.n); gl.bufferData(gl.ARRAY_BUFFER, m.nrm, gl.DYNAMIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER, o.c); gl.bufferData(gl.ARRAY_BUFFER, m.col, gl.DYNAMIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER, o.l); gl.bufferData(gl.ARRAY_BUFFER, m.line, gl.DYNAMIC_DRAW);
      if (m.surf) { gl.bindBuffer(gl.ARRAY_BUFFER, o.e); gl.bufferData(gl.ARRAY_BUFFER, m.surf, gl.DYNAMIC_DRAW); }
      if (m.lit) { gl.bindBuffer(gl.ARRAY_BUFFER, o.lt); gl.bufferData(gl.ARRAY_BUFFER, m.lit, gl.DYNAMIC_DRAW); }
      if (m.edge) {
        gl.bindBuffer(gl.ARRAY_BUFFER, o.ea); gl.bufferData(gl.ARRAY_BUFFER, m.edge.a, gl.DYNAMIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, o.eb); gl.bufferData(gl.ARRAY_BUFFER, m.edge.b, gl.DYNAMIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, o.es); gl.bufferData(gl.ARRAY_BUFFER, m.edge.s, gl.DYNAMIC_DRAW);
        o.nEdge = m.edge.a.length / 3;
      }
    },
  });
}

// patchAt, hideStaticPrim, flushHides, queueHide.
function addPatchMethods(surface) {
  Object.assign(surface, {
    // patchAt: the demo's own body (2753-2778). patchBox and boxMinusBox
    // are the law half's; level, addedDirty, pendingRebuild are fields.
    patchAt(pr, x, y, z) {
      if (pr.patch || pr.s[0] * pr.s[1] * pr.s[2] < 0.9) return pr;
      const pb = patchBox(pr, x, y, z);
      let full = 1;
      for (let k = 0; k < 3; k++) if (pb.s[k] < pr.s[k] - 1e-6) full = 0;
      if (full) { pr.patch = 1; return pr; }
      const sp = boxMinusBox(pr.cc || pr.c, pr.s, pb.c, pb.s);
      const seq = (pr.__sq = (pr.__sq || 0) + 1);
      for (let i = 0; i < sp.rest.length; i++) {
        const r = sp.rest[i], q = {};
        for (const kk in pr) if (kk !== "c" && kk !== "s" && kk !== "cc" && kk !== "__f" &&
          kk !== "voxed" && kk !== "frac" && kk !== "gone" && kk !== "__sq") q[kk] = pr[kk];
        q.id = pr.id + "." + seq + "." + i;
        q.c = r.c; q.s = r.s;
        this.level.push(q);
      }
      const pt = {};
      for (const k2 in pr) if (k2 !== "c" && k2 !== "s" && k2 !== "cc" && k2 !== "__f" &&
        k2 !== "voxed" && k2 !== "frac" && k2 !== "gone" && k2 !== "__sq") pt[k2] = pr[k2];
      pt.id = pr.id + "." + seq + ".p";
      pt.c = pb.c; pt.s = pb.s; pt.patch = 1;
      this.level.push(pt);
      pr.dead = 1; this.queueHide(pr);
      this.addedDirty = 1; this.pendingRebuild = 1;
      return pt;
    },

    // hideStaticPrim: the demo's own body (2782-2799) — the static mesh
    // only loses prims, so a departing prim's slice collapses to zero
    // instead of a full rebuild.
    hideStaticPrim(i) {
      const gl = this.gl;
      if (!this.staticRanges) return;
      const vs = this.staticRanges[i * 4], vn = this.staticRanges[i * 4 + 1];
      const es = this.staticRanges[i * 4 + 2], en = this.staticRanges[i * 4 + 3];
      if (!vn && !en) return;
      const need = Math.max(vn * 3, en * 3);
      if (!this.zeroScratch || this.zeroScratch.length < need) this.zeroScratch = new Float32Array(need);
      if (vn) {
        const z3 = this.zeroScratch.subarray(0, vn * 3);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.bS.p); gl.bufferSubData(gl.ARRAY_BUFFER, vs * 12, z3);
      }
      if (en) {
        const e3 = this.zeroScratch.subarray(0, en * 3);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.bS.ea); gl.bufferSubData(gl.ARRAY_BUFFER, es * 12, e3);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.bS.eb); gl.bufferSubData(gl.ARRAY_BUFFER, es * 12, e3);
      }
      this.staticRanges[i * 4 + 1] = 0; this.staticRanges[i * 4 + 3] = 0;
    },

    // flushHides, queueHide: the demo's own bodies (2801-2812).
    flushHides() {
      if (!this.hideQueue.length) return 0;
      for (let k = 0; k < this.hideQueue.length; k++) this.hideStaticPrim(this.hideQueue[k]);
      const n = this.hideQueue.length;
      this.hideQueue.length = 0;
      return n;
    },
    queueHide(pr) {
      const i = this.level.indexOf(pr);
      if (i >= 0) this.hideQueue.push(i);
    },
  });
}

// mkTarget, buildPost, fsQuad, sunScreenUV.
function addTargetMethods(surface) {
  Object.assign(surface, {
    // mkTarget: the demo's own body (3706-3720).
    mkTarget(w, h) {
      const gl = this.gl;
      const t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      const f = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, f);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
      const okFB = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      return okFB ? { f: f, t: t } : null;
    },

    // buildPost: the demo's own body (3722-3745), postW/postH the guard
    // against rebuilding every frame.
    buildPost(w, h) {
      if (this.postW === w && this.postH === h) return;
      this.postW = w; this.postH = h;
      const gl = this.gl;
      const s = this.mkTarget(w, h);
      if (!s) { this.postOn = 0; return; }
      this.sceneFB = s.f; this.sceneTex = s.t;
      this.sceneRB = gl.createRenderbuffer();
      gl.bindRenderbuffer(gl.RENDERBUFFER, this.sceneRB);
      gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, w, h);
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.sceneFB);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.sceneRB);
      if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) this.postOn = 0;
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      const hw = Math.max(1, w >> 1), hh = Math.max(1, h >> 1);
      this.bloomFB = []; this.bloomTex = [];
      for (let i = 0; i < 2; i++) {
        const b = this.mkTarget(hw, hh);
        if (!b) { this.postOn = 0; return; }
        this.bloomFB.push(b.f); this.bloomTex.push(b.t);
      }
      const r = this.mkTarget(hw, hh);
      if (!r) { this.postOn = 0; return; }
      this.rayFB = r.f; this.rayTex = r.t;
    },

    // fsQuad: the demo's own body (3747-3754).
    fsQuad(prog) {
      const gl = this.gl;
      this.disableAttrs();
      const l = gl.getAttribLocation(prog, "aP");
      gl.bindBuffer(gl.ARRAY_BUFFER, this.bQuad);
      gl.enableVertexAttribArray(l);
      gl.vertexAttribPointer(l, 2, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },

    // sunScreenUV: the demo's own body (3756-3763), cam.pos and light the
    // fields in place of CAM.pos and LIGHT.
    sunScreenUV(MVP) {
      const far = [this.cam.pos[0] + this.light[0] * 900, this.cam.pos[1] + this.light[1] * 900, this.cam.pos[2] + this.light[2] * 900];
      const cx = MVP[0] * far[0] + MVP[4] * far[1] + MVP[8] * far[2] + MVP[12];
      const cy = MVP[1] * far[0] + MVP[5] * far[1] + MVP[9] * far[2] + MVP[13];
      const cw = MVP[3] * far[0] + MVP[7] * far[1] + MVP[11] * far[2] + MVP[15];
      if (cw <= 0) return null;
      return [cx / cw * 0.5 + 0.5, cy / cw * 0.5 + 0.5];
    },
  });
}

// postPass: the demo's own body (3765-3814) — bloom, rays, composite with
// FXAA, tonemap, vignette, grain. t replaces performance.now()*0.001;
// this.dials.grain/vignette replace the demo's literals 0.028/0.62.
function addPostPassMethod(surface) {
  Object.assign(surface, {
    postPass(MVP, t) {
      const gl = this.gl;
      const hw = Math.max(1, this.postW >> 1), hh = Math.max(1, this.postH >> 1);
      gl.disable(gl.DEPTH_TEST);

      gl.bindFramebuffer(gl.FRAMEBUFFER, this.bloomFB[0]);
      gl.viewport(0, 0, hw, hh);
      gl.useProgram(this.progBright);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.sceneTex);
      gl.uniform1i(gl.getUniformLocation(this.progBright, "uSrc"), 0);
      gl.uniform1f(gl.getUniformLocation(this.progBright, "uCut"), BLOOM_CUT[this.palIdx]);
      this.fsQuad(this.progBright);

      for (let p = 0; p < 2; p++) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.bloomFB[1 - (p & 1)]);
        gl.useProgram(this.progBlur);
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.bloomTex[p & 1]);
        gl.uniform1i(gl.getUniformLocation(this.progBlur, "uSrc"), 0);
        gl.uniform2f(gl.getUniformLocation(this.progBlur, "uDir"), p === 0 ? 1 / hw : 0, p === 0 ? 0 : 1 / hh);
        this.fsQuad(this.progBlur);
      }

      const sun = this.sunScreenUV(MVP);
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.rayFB);
      gl.useProgram(this.progRays);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.bloomTex[0]);
      gl.uniform1i(gl.getUniformLocation(this.progRays, "uSrc"), 0);
      gl.uniform2f(gl.getUniformLocation(this.progRays, "uSunUV"), sun ? sun[0] : 0.5, sun ? sun[1] : 1.4);
      gl.uniform1f(gl.getUniformLocation(this.progRays, "uAmt"), sun ? 1.0 : 0.0);
      gl.uniform2f(gl.getUniformLocation(this.progRays, "uMask"), sun ? sun[0] : 0.5, sun ? sun[1] : 1.4);
      this.fsQuad(this.progRays);

      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, this.postW, this.postH);
      gl.useProgram(this.progComp);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.sceneTex);
      gl.uniform1i(gl.getUniformLocation(this.progComp, "uScene"), 0);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, this.bloomTex[0]);
      gl.uniform1i(gl.getUniformLocation(this.progComp, "uBloom"), 1);
      gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, this.rayTex);
      gl.uniform1i(gl.getUniformLocation(this.progComp, "uRays"), 2);
      gl.uniform1f(gl.getUniformLocation(this.progComp, "uBloomAmt"), BLOOM_AMT[this.palIdx]);
      gl.uniform1f(gl.getUniformLocation(this.progComp, "uRayAmt"), RAY_AMT[this.palIdx]);
      gl.uniform1f(gl.getUniformLocation(this.progComp, "uGrain"), this.dials.grain);
      gl.uniform1f(gl.getUniformLocation(this.progComp, "uVig"), this.dials.vignette);
      gl.uniform2f(gl.getUniformLocation(this.progComp, "uRcp"), 1 / this.postW, 1 / this.postH);
      gl.uniform1f(gl.getUniformLocation(this.progComp, "uT"), t);
      this.fsQuad(this.progComp);
      gl.activeTexture(gl.TEXTURE0);
      gl.enable(gl.DEPTH_TEST);
    },
  });
}

// shadowPass, drawDepthInstanced, bindShadow.
function addShadowMethods(surface) {
  Object.assign(surface, {
    // shadowPass: the demo's own body (3829-3844). lightMatrix takes
    // cam.pos, basis.f, light, and the shadHalf/shadN dials in place of
    // CAM.pos, basis.f, LIGHT, SHAD_HALF, SHAD_N.
    shadowPass() {
      const gl = this.gl;
      this.LMVP = lightMatrix(this.cam.pos, this.basis.f, this.light, this.dials.shadHalf, this.dials.shadN);
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.shadFB);
      gl.viewport(0, 0, this.dials.shadN, this.dials.shadN);
      gl.clearColor(1, 1, 1, 1);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.DEPTH_TEST);
      gl.useProgram(this.progD);
      gl.uniformMatrix4fv(gl.getUniformLocation(this.progD, "uLMVP"), false, this.LMVP);
      if (this.nS) { this.bind(this.progD, "aPos", this.bS.p, 3); gl.drawArrays(gl.TRIANGLES, 0, this.nS); }
      if (this.nA) { this.bind(this.progD, "aPos", this.bA.p, 3); gl.drawArrays(gl.TRIANGLES, 0, this.nA); }
      if (this.nD) { this.bind(this.progD, "aPos", this.bD.p, 3); gl.drawArrays(gl.TRIANGLES, 0, this.nD); }
      if (this.ext && this.progDI && this.nInstS) this.drawDepthInstanced(this.bCube.s, this.nInstS);
      if (this.ext && this.progDI && this.nInstD) this.drawDepthInstanced(this.bCube.d, this.nInstD);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    },

    // drawDepthInstanced: the demo's own body (3846-3865).
    drawDepthInstanced(buf, count) {
      const gl = this.gl, ext = this.ext;
      gl.useProgram(this.progDI);
      gl.uniformMatrix4fv(gl.getUniformLocation(this.progDI, "uLMVP"), false, this.LMVP);
      this.bind(this.progDI, "aPos", this.bCube.p, 3);
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      const specs = [["iOff", 3, 0], ["iSize", 3, 12], ["iRot", 2, 36]];
      let i, loc;
      for (i = 0; i < specs.length; i++) {
        loc = gl.getAttribLocation(this.progDI, specs[i][0]);
        if (loc < 0) continue;
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, specs[i][1], gl.FLOAT, false, 44, specs[i][2]);
        ext.vertexAttribDivisorANGLE(loc, 1);
      }
      ext.drawArraysInstancedANGLE(gl.TRIANGLES, 0, 36, count);
      for (i = 0; i < specs.length; i++) {
        loc = gl.getAttribLocation(this.progDI, specs[i][0]);
        if (loc >= 0) ext.vertexAttribDivisorANGLE(loc, 0);
      }
    },

    // bindShadow: the demo's own body (3867-3874), t replacing
    // performance.now()*0.001, shadOn the field in place of the global.
    bindShadow(prog, t) {
      const gl = this.gl;
      gl.uniformMatrix4fv(gl.getUniformLocation(prog, "uLMVP"), false,
        this.LMVP || lightMatrix(this.cam.pos, this.basis.f, this.light, this.dials.shadHalf, this.dials.shadN));
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.shadTex);
      gl.uniform1i(gl.getUniformLocation(prog, "uShad"), 0);
      gl.uniform4f(gl.getUniformLocation(prog, "uP"), this.dials.fogK, this.shadOn ? 1 : 0, 1 / this.dials.shadN, t);
    },
  });
}

// drawSet, disableAttrs, bind, drawInstanced.
function addDrawMethods(surface) {
  Object.assign(surface, {
    // drawSet: the demo's own body (3876-3916). bindShadow needs the
    // frame's clock; frame() stashes it on this._t before calling drawSet
    // (drawSet's own signature carries no t — the demo's nested call graph
    // is unchanged, only where the clock is read from moves).
    drawSet(MVP, b, nTri, nLine) {
      const gl = this.gl;
      if (!nTri) return;
      this.disableAttrs();
      gl.useProgram(this.progS);
      gl.uniformMatrix4fv(gl.getUniformLocation(this.progS, "uMVP"), false, MVP);
      gl.uniform3fv(gl.getUniformLocation(this.progS, "uL"), this.light);
      gl.uniform3fv(gl.getUniformLocation(this.progS, "uCam"), this.cam.pos);
      gl.uniform3fv(gl.getUniformLocation(this.progS, "uSkyC"), this.ambSky);
      gl.uniform3fv(gl.getUniformLocation(this.progS, "uGndC"), this.ambGnd);
      gl.uniform3fv(gl.getUniformLocation(this.progS, "uFogC"), this.fogC);
      gl.uniform3fv(gl.getUniformLocation(this.progS, "uSunDir"), this.light);
      this.bindShadow(this.progS, this._t);
      gl.uniform4fv(gl.getUniformLocation(this.progS, "uLA"), this.litA);
      gl.uniform4fv(gl.getUniformLocation(this.progS, "uLB"), this.litB);
      gl.uniform4f(gl.getUniformLocation(this.progS, "uQ"), EMIS_BOOST[this.palIdx], 0, 0, 0);
      this.bind(this.progS, "aPos", b.p, 3); this.bind(this.progS, "aNrm", b.n, 3); this.bind(this.progS, "aCol", b.c, 3);
      this.bind(this.progS, "aSurf", b.e, 2);
      this.bind(this.progS, "aLit", b.lt, 3);
      gl.drawArrays(gl.TRIANGLES, 0, nTri);
      this.disableAttrs();
      if (this.progEdge && b.nEdge) {
        gl.useProgram(this.progEdge);
        gl.uniformMatrix4fv(gl.getUniformLocation(this.progEdge, "uMVP"), false, MVP);
        gl.uniform2f(gl.getUniformLocation(this.progEdge, "uPx"), this.vpW * 0.5, this.vpH * 0.5);
        gl.uniform1f(gl.getUniformLocation(this.progEdge, "uW"), this.dials.outline);
        gl.uniform3fv(gl.getUniformLocation(this.progEdge, "uCol"), INK);
        this.bind(this.progEdge, "aA", b.ea, 3);
        this.bind(this.progEdge, "aB", b.eb, 3);
        this.bind(this.progEdge, "aS", b.es, 1);
        gl.drawArrays(gl.TRIANGLES, 0, b.nEdge);
      } else if (nLine) {
        gl.useProgram(this.progF);
        gl.uniformMatrix4fv(gl.getUniformLocation(this.progF, "uMVP"), false, MVP);
        gl.uniform3fv(gl.getUniformLocation(this.progF, "uCam"), this.cam.pos);
        gl.uniform3fv(gl.getUniformLocation(this.progF, "uFogC"), this.fogC);
        gl.uniform1f(gl.getUniformLocation(this.progF, "uFogK"), this.dials.fogK);
        gl.uniform3fv(gl.getUniformLocation(this.progF, "uCol"), INK);
        this.bind(this.progF, "aPos", b.l, 3);
        gl.drawArrays(gl.LINES, 0, nLine);
      }
    },

    // disableAttrs, bind: the demo's own bodies (3918-3928).
    disableAttrs() {
      const gl = this.gl;
      for (let i = 0; i < MAX_ATTR; i++) gl.disableVertexAttribArray(i);
    },
    bind(prog, name, buf, n) {
      const gl = this.gl;
      const loc = gl.getAttribLocation(prog, name);
      if (loc < 0) return;
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, n, gl.FLOAT, false, 0, 0);
    },

    // drawInstanced: the demo's own body (3298-3330), the 11-float
    // 44-byte layout unchanged. bindShadow reads this._t, as in drawSet.
    drawInstanced(MVP, buf, count) {
      const gl = this.gl, ext = this.ext;
      if (!ext || !count) return;
      this.disableAttrs();
      gl.useProgram(this.progI);
      gl.uniformMatrix4fv(gl.getUniformLocation(this.progI, "uMVP"), false, MVP);
      gl.uniform3fv(gl.getUniformLocation(this.progI, "uL"), this.light);
      gl.uniform3fv(gl.getUniformLocation(this.progI, "uCam"), this.cam.pos);
      gl.uniform3fv(gl.getUniformLocation(this.progI, "uSkyC"), this.ambSky);
      gl.uniform3fv(gl.getUniformLocation(this.progI, "uGndC"), this.ambGnd);
      gl.uniform3fv(gl.getUniformLocation(this.progI, "uFogC"), this.fogC);
      gl.uniform3fv(gl.getUniformLocation(this.progI, "uSunDir"), this.light);
      gl.uniform4fv(gl.getUniformLocation(this.progI, "uLA"), this.litA);
      gl.uniform4fv(gl.getUniformLocation(this.progI, "uLB"), this.litB);
      gl.uniform4f(gl.getUniformLocation(this.progI, "uQ"), 0, 0, 0, 0);
      this.bindShadow(this.progI, this._t);
      this.bind(this.progI, "aPos", this.bCube.p, 3);
      this.bind(this.progI, "aNrm", this.bCube.n, 3);
      const stride = 44;
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      const specs = [["iOff", 3, 0], ["iSize", 3, 12], ["iCol", 3, 24], ["iRot", 2, 36]];
      for (let i = 0; i < specs.length; i++) {
        const loc = gl.getAttribLocation(this.progI, specs[i][0]);
        if (loc < 0) continue;
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, specs[i][1], gl.FLOAT, false, stride, specs[i][2]);
        ext.vertexAttribDivisorANGLE(loc, 1);
      }
      ext.drawArraysInstancedANGLE(gl.TRIANGLES, 0, 36, count);
      for (let j = 0; j < specs.length; j++) {
        const l2 = gl.getAttribLocation(this.progI, specs[j][0]);
        if (l2 >= 0) ext.vertexAttribDivisorANGLE(l2, 0);
      }
    },
  });
}

// frame: the draw part of the demo's frame (3582-3701) — the stick, the
// reticle, the hurt overlay, the hud, and requestAnimationFrame stay with
// the page. t is the clock in seconds, used everywhere the demo read
// performance.now or its own rAF timestamp.
function addFrameMethod(surface) {
  Object.assign(surface, {
    frame(t) {
      const gl = this.gl;
      const w = this.vpW, h = this.vpH;
      this._t = t;
      if (this.shadOn) this.shadowPass();
      if (this.postOn) { this.buildPost(w, h); if (this.postOn) gl.bindFramebuffer(gl.FRAMEBUFFER, this.sceneFB); }
      gl.viewport(0, 0, w, h);
      gl.clearColor(0.76, 0.786, 0.80, 1);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.disable(gl.DEPTH_TEST);
      gl.useProgram(this.progSky);
      gl.uniform3fv(gl.getUniformLocation(this.progSky, "uTop"), this.skyTop);
      gl.uniform3fv(gl.getUniformLocation(this.progSky, "uBot"), this.skyBot);
      gl.uniform3fv(gl.getUniformLocation(this.progSky, "uHaze"), this.haze);
      gl.uniform3fv(gl.getUniformLocation(this.progSky, "uSun"), this.light);
      gl.uniform3fv(gl.getUniformLocation(this.progSky, "uR"), this.basis.r);
      gl.uniform3fv(gl.getUniformLocation(this.progSky, "uU"), this.basis.u);
      gl.uniform3fv(gl.getUniformLocation(this.progSky, "uF"), this.basis.f);
      const th = Math.tan(this.cam.fov * Math.PI / 360);
      gl.uniform2f(gl.getUniformLocation(this.progSky, "uScale"), th * (w / h), th);
      gl.uniform1f(gl.getUniformLocation(this.progSky, "uT"), t);
      const lsk = gl.getAttribLocation(this.progSky, "aP");
      gl.bindBuffer(gl.ARRAY_BUFFER, this.bSky);
      gl.enableVertexAttribArray(lsk);
      gl.vertexAttribPointer(lsk, 2, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.disableVertexAttribArray(lsk);
      gl.enable(gl.DEPTH_TEST);

      const P = m4persp(this.cam.fov, w / h, 0.05, 900);
      const V = m4view(this.cam.pos, this.cam.yaw, this.cam.pitch);
      const MVP = m4mul(P, V);

      this.drawSet(MVP, this.bS, this.nS, this.nSL);
      this.drawSet(MVP, this.bA, this.nA, this.nAL);
      this.drawSet(MVP, this.bD, this.nD, this.nDL);
      this.drawInstanced(MVP, this.bCube.s, this.nInstS);
      this.drawInstanced(MVP, this.bCube.d, this.nInstD);

      gl.useProgram(this.progF);
      gl.uniformMatrix4fv(gl.getUniformLocation(this.progF, "uMVP"), false, MVP);
      gl.uniform3fv(gl.getUniformLocation(this.progF, "uCam"), this.cam.pos);
      gl.uniform3fv(gl.getUniformLocation(this.progF, "uFogC"), this.fogC);
      gl.uniform1f(gl.getUniformLocation(this.progF, "uFogK"), this.dials.fogK);
      const tv = [], tc = [];
      for (const tk in this.trails) {
        const tr = this.trails[tk], np = tr.p.length / 3;
        if (np < 2) continue;
        const base = TRAIL_COL[tr.type] || TRAIL_COL[0];
        for (let q = 0; q < np - 1; q++) {
          const a0 = q / (np - 1), a1 = (q + 1) / (np - 1);
          tv.push(tr.p[q * 3], tr.p[q * 3 + 1], tr.p[q * 3 + 2],
                  tr.p[q * 3 + 3], tr.p[q * 3 + 4], tr.p[q * 3 + 5]);
          tc.push(base[0], base[1], base[2], a0 * a0 * 0.85,
                  base[0], base[1], base[2], a1 * a1 * 0.85);
        }
      }
      for (let si = 0; si < this.sparks.length; si++) {
        const s2 = this.sparks[si], k2 = 1 - s2.t / s2.life;
        tv.push(s2.x, s2.y, s2.z, s2.x - s2.vx * 0.012, s2.y - s2.vy * 0.012, s2.z - s2.vz * 0.012);
        tc.push(s2.r, s2.g, s2.b, k2, s2.r, s2.g, s2.b, k2 * 0.35);
      }
      if (tv.length) {
        gl.useProgram(this.progTrail);
        gl.uniformMatrix4fv(gl.getUniformLocation(this.progTrail, "uMVP"), false, MVP);
        gl.uniform1f(gl.getUniformLocation(this.progTrail, "uSize"), 5);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
        gl.depthMask(false);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.bTrail);
        const inter = new Float32Array(tv.length / 3 * 7);
        for (let q2 = 0; q2 < tv.length / 3; q2++) {
          inter[q2 * 7] = tv[q2 * 3]; inter[q2 * 7 + 1] = tv[q2 * 3 + 1]; inter[q2 * 7 + 2] = tv[q2 * 3 + 2];
          inter[q2 * 7 + 3] = tc[q2 * 4]; inter[q2 * 7 + 4] = tc[q2 * 4 + 1];
          inter[q2 * 7 + 5] = tc[q2 * 4 + 2]; inter[q2 * 7 + 6] = tc[q2 * 4 + 3];
        }
        gl.bufferData(gl.ARRAY_BUFFER, inter, gl.DYNAMIC_DRAW);
        const lp = gl.getAttribLocation(this.progTrail, "aPos"), lc = gl.getAttribLocation(this.progTrail, "aCol");
        gl.enableVertexAttribArray(lp); gl.vertexAttribPointer(lp, 3, gl.FLOAT, false, 28, 0);
        gl.enableVertexAttribArray(lc); gl.vertexAttribPointer(lc, 4, gl.FLOAT, false, 28, 12);
        gl.lineWidth(2);
        gl.drawArrays(gl.LINES, 0, inter.length / 7);
        gl.depthMask(true);
        gl.disable(gl.BLEND);
      }
      if (this.markers.length) {
        const mp = [];
        for (let j = 0; j < this.markers.length; j++) mp.push(this.markers[j][0], this.markers[j][1], this.markers[j][2]);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.bMark);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mp), gl.DYNAMIC_DRAW);
        gl.uniform3fv(gl.getUniformLocation(this.progF, "uCol"), [0.86, 0.44, 0.36]);
        gl.uniform1f(gl.getUniformLocation(this.progF, "uSize"), 7);
        this.bind(this.progF, "aPos", this.bMark, 3);
        gl.drawArrays(gl.POINTS, 0, mp.length / 3);
      }

      if (this.showBore) {
        const bf = this.basis.f, bo = [
          this.cam.pos[0] + bf[0] * 1.2, this.cam.pos[1] + bf[1] * 1.2 - 0.27, this.cam.pos[2] + bf[2] * 1.2,
          this.cam.pos[0] + bf[0] * 260, this.cam.pos[1] + bf[1] * 260 - 0.27, this.cam.pos[2] + bf[2] * 260];
        gl.bindBuffer(gl.ARRAY_BUFFER, this.bBore);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(bo), gl.DYNAMIC_DRAW);
        gl.useProgram(this.progF);
        gl.uniformMatrix4fv(gl.getUniformLocation(this.progF, "uMVP"), false, MVP);
        gl.uniform3fv(gl.getUniformLocation(this.progF, "uCol"), [0.98, 0.80, 0.30]);
        gl.uniform1f(gl.getUniformLocation(this.progF, "uSize"), 1);
        this.bind(this.progF, "aPos", this.bBore, 3);
        gl.lineWidth(1);
        gl.drawArrays(gl.LINES, 0, 2);
      }

      gl.clear(gl.DEPTH_BUFFER_BIT);
      this.drawSet(MVP, this.bW, this.nW, this.nWL);

      if (this.postOn) this.postPass(MVP, t);
    },
  });
}

// ---- contract ----
export const RENDER_DIALS_CONTRACT = {
  outline: "number > 0",
  shadN: "integer > 0",
  shadHalf: "number > 0",
  fogK: "number >= 0",
  grain: "number >= 0",
  vignette: "number >= 0",
};

// checkRenderDials: every problem with a dials object, in one pass.
export function checkRenderDials(d) {
  if (typeof d !== "object" || d === null) return ["dials: not an object"];
  const problems = [];
  if (!(typeof d.outline === "number" && Number.isFinite(d.outline) && d.outline > 0)) problems.push("dials.outline: number > 0 required");
  if (!(Number.isInteger(d.shadN) && d.shadN > 0)) problems.push("dials.shadN: integer > 0 required");
  if (!(typeof d.shadHalf === "number" && Number.isFinite(d.shadHalf) && d.shadHalf > 0)) problems.push("dials.shadHalf: number > 0 required");
  if (!(typeof d.fogK === "number" && Number.isFinite(d.fogK) && d.fogK >= 0)) problems.push("dials.fogK: number >= 0 required");
  if (!(typeof d.grain === "number" && Number.isFinite(d.grain) && d.grain >= 0)) problems.push("dials.grain: number >= 0 required");
  if (!(typeof d.vignette === "number" && Number.isFinite(d.vignette) && d.vignette >= 0)) problems.push("dials.vignette: number >= 0 required");
  return problems;
}
