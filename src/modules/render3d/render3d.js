// modules/render3d — the 3-D lit renderer's library-free half, lifted from
// the shooting-range demo (holdover-greybox-range-r55-claude-opus-5.html:
// prism and wedge meshes 456-503, palettes 727-795, the mesh helpers
// 956-1046, buildMesh 1048-1093, the patch-split math 1097-1137,
// bakeLampLight 1169-1200, the matrix math 1219-1268, shader text 1270-1474
// and 2154-2164, post dials and sky sets 2599-2611, dials 2635, 2638, 2641,
// 3705, collectLamps and packLights 2670-2711, flashes 2713-2725, projPx
// 2819-2827, cubeGeom 3280-3296, lightMatrix 3816-3827, and the instance
// packing the voxel lift left behind, 2070-2152 and 2436-2455; VERBATIM MATH
// inside a SHAPED lift). MODULE: render3d. Box: "The 3-D lit renderer:
// shadows, baked lamps, sky, finishing pass, edge outlines, instanced
// debris" (batch-general-1.md, B5; first of two phases, the box flips at
// B6). The draw half — compiling these shaders, issuing passes, the post
// chain — arrives in phase 0.0.101. Nothing here draws: no WebGL, no
// canvas, no DOM.
//
// Second pass, the general parts order, phase B5. Substitutions from the
// demo, numbered, and only these:
// 1. Data, exported verbatim: PALETTES, PAL_NAMES, INK, EMISSIVE, WETNESS,
//    FACE, EDGE, the four block dials as BLOCK = { m, max, minArea, amt },
//    PATCH_M, SKY_SETS, BLOOM_CUT, RAY_AMT, BLOOM_AMT, EMIS_BOOST, FOG_K,
//    OUTLINE_PX, SHAD_N, SHAD_HALF, ZOOMS. The demo's usePalette becomes
//    paletteOf(name) returning a fresh copy of the named palette (overcast
//    when unknown); no module-level PAL.
// 2. prismMesh, wedgeMesh, rotX, rotY, primCorners, hash3, blockTint,
//    lerp3, pushPanelled, pushEdge, pushPoly verbatim, exported; ngon
//    imported from the greybox module.
// 3. buildMesh(level, want, base, pal): the demo's function with the
//    palette handed in as the fourth argument in place of the global PAL;
//    EMISSIVE and WETNESS are the module's own tables.
// 4. boxMinusBox, patchBox verbatim, exported.
// 5. bakeLampLight(mesh, lamps, solids) verbatim, with rayBlocked imported
//    from the solids module.
// 6. collectLamps(level, pal) returns the lamp list in place of writing the
//    global; packLights(lamps, flashes, camPos, night) returns { litA,
//    litB }, two Float32Array(16), with camPos an array of 3 in place of
//    CAM.pos and night a boolean in place of the palette-index test (true
//    gives the 1.6 boost, false 1.0); addFlash(flashes, x, y, z, r, g, b,
//    rad, inten, life) and stepFlashes(flashes, dt) take the list as their
//    first argument.
// 7. m4mul, m4ortho, m4lookDir, m4persp, m4view verbatim, exported;
//    projPx(M, x, y, z, out, vpW, vpH) with the viewport size as arguments.
// 8. cubeGeom verbatim, exported.
// 9. lightMatrix(camPos, forward, light, shadHalf = SHAD_HALF, shadN =
//    SHAD_N): the demo's function with CAM.pos, basis.f, LIGHT, SHAD_HALF,
//    and SHAD_N as arguments, forward an array of 3 and light an array of
//    3.
// 10. The instance packing the voxel lift left behind, as functions taking
//     the voxel world first: packAll(vox, out, colFn), unpackCell(vox, f,
//     i), intactInstances(vox, out, colFn), dynInstances(vox, out, colOf),
//     clusterInstances(vox, out, from, colOf), the demo's arithmetic
//     exactly, with voxCentre imported from the voxel module; colOf(entry)
//     returns [r, g, b] for a debris or cluster entry and defaults to
//     reading the entry's r, g, b fields, else [1, 1, 1], since the lifted
//     voxel world carries no colour. The 11-float layout per instance is
//     the demo's.
// 11. The shader sources as text, verbatim, in one exported object SHADERS
//     keyed by the demo's own names. Plus uniformsOf(text) returning the
//     list of uniform names a shader string declares (each `uniform <type>
//     <name>` occurrence, the name without any array suffix).
// 12. Contracts: PALETTE_CONTRACT and checkPalette(p); LAMP_CONTRACT and
//     checkLamp(l).
import { ngon } from "../greybox/greybox.js";
import { rayBlocked } from "../solids/solids.js";
import { voxCentre } from "../voxel/voxel.js";

// ---- 1. Data, exported verbatim (demo 727-795, 976-977, 981, 1045-1046,
// 1119, 2599-2611, 2635, 2638, 2641, 3705) ----
export const PALETTES = {
  overcast: {
    concrete: [0.436, 0.421, 0.392], concreteD: [0.296, 0.316, 0.338],
    glass: [0.392, 0.548, 0.562], dead: [0.142, 0.170, 0.200],
    wood: [0.478, 0.352, 0.232], strut: [0.348, 0.248, 0.162],
    steel: [0.344, 0.400, 0.452], steelD: [0.378, 0.320, 0.276],
    hub: [0.138, 0.150, 0.166], water: [0.176, 0.282, 0.292],
    target: [0.672, 0.352, 0.228], tgtHead: [0.512, 0.258, 0.180],
    far: [0.502, 0.552, 0.602], cloth: [0.618, 0.312, 0.272],
    chop: [0.372, 0.478, 0.472],
    ground: [0.258, 0.252, 0.240], kerb: [0.352, 0.344, 0.326], wet: [0.196, 0.238, 0.246],
    rust: [0.482, 0.252, 0.148], oxide: [0.372, 0.186, 0.112],
    algae: [0.212, 0.288, 0.178], moss: [0.264, 0.318, 0.196],
    brick: [0.412, 0.286, 0.238], brickD: [0.322, 0.222, 0.186],
    verdigris: [0.246, 0.398, 0.352],
    sodium: [0.880, 0.628, 0.322], lit: [0.760, 0.660, 0.472],
    salt: [0.612, 0.616, 0.588], tar: [0.128, 0.132, 0.138],
    signal: [0.652, 0.226, 0.186], municipal: [0.212, 0.318, 0.436],
    gunA: [0.180, 0.198, 0.222], gunB: [0.128, 0.146, 0.168], gunC: [0.318, 0.238, 0.172]
  },
  coastal: {
    concrete: [0.742, 0.702, 0.618], concreteD: [0.556, 0.520, 0.454],
    glass: [0.418, 0.616, 0.612], dead: [0.176, 0.196, 0.206],
    wood: [0.606, 0.428, 0.262], strut: [0.442, 0.300, 0.176],
    steel: [0.470, 0.500, 0.512], steelD: [0.548, 0.428, 0.336],
    hub: [0.164, 0.170, 0.176], water: [0.166, 0.392, 0.412],
    target: [0.828, 0.400, 0.226], tgtHead: [0.630, 0.290, 0.172],
    far: [0.648, 0.640, 0.616], cloth: [0.784, 0.336, 0.284],
    chop: [0.430, 0.612, 0.596],
    ground: [0.478, 0.448, 0.396], kerb: [0.664, 0.630, 0.560], wet: [0.312, 0.376, 0.372],
    rust: [0.686, 0.318, 0.166], oxide: [0.528, 0.242, 0.126],
    algae: [0.276, 0.386, 0.212], moss: [0.336, 0.418, 0.230],
    brick: [0.694, 0.398, 0.290], brickD: [0.556, 0.312, 0.228],
    verdigris: [0.272, 0.532, 0.452],
    sodium: [0.960, 0.746, 0.418], lit: [0.898, 0.782, 0.548],
    salt: [0.856, 0.836, 0.780], tar: [0.176, 0.172, 0.166],
    signal: [0.808, 0.268, 0.202], municipal: [0.204, 0.400, 0.548],
    gunA: [0.224, 0.230, 0.238], gunB: [0.158, 0.166, 0.176], gunC: [0.398, 0.286, 0.192]
  },
  nightfall: {
    concrete: [0.286, 0.302, 0.360], concreteD: [0.196, 0.212, 0.268],
    glass: [0.246, 0.376, 0.446], dead: [0.096, 0.108, 0.140],
    wood: [0.332, 0.256, 0.204], strut: [0.238, 0.180, 0.142],
    steel: [0.246, 0.292, 0.362], steelD: [0.272, 0.234, 0.226],
    hub: [0.098, 0.104, 0.124], water: [0.104, 0.176, 0.240],
    target: [0.760, 0.352, 0.180], tgtHead: [0.580, 0.256, 0.132],
    far: [0.320, 0.354, 0.428], cloth: [0.660, 0.268, 0.226],
    chop: [0.238, 0.336, 0.400],
    ground: [0.170, 0.180, 0.212], kerb: [0.244, 0.256, 0.298], wet: [0.128, 0.170, 0.212],
    rust: [0.498, 0.238, 0.128], oxide: [0.386, 0.176, 0.096],
    algae: [0.152, 0.216, 0.156], moss: [0.184, 0.238, 0.166],
    brick: [0.330, 0.234, 0.216], brickD: [0.252, 0.180, 0.170],
    verdigris: [0.176, 0.334, 0.316],
    sodium: [1.000, 0.712, 0.328], lit: [0.958, 0.788, 0.472],
    salt: [0.404, 0.418, 0.442], tar: [0.086, 0.090, 0.104],
    signal: [0.712, 0.222, 0.176], municipal: [0.152, 0.268, 0.412],
    gunA: [0.128, 0.138, 0.160], gunB: [0.092, 0.100, 0.118], gunC: [0.228, 0.176, 0.132]
  }
};
export const PAL_NAMES = ['overcast', 'coastal', 'nightfall'];

export const INK = [0.180, 0.227, 0.251];

export const FACE = [[0, 1, 3, 2], [4, 6, 7, 5], [0, 4, 5, 1], [2, 3, 7, 6], [0, 2, 6, 4], [1, 5, 7, 3]];
export const EDGE = [[0, 1], [1, 3], [3, 2], [2, 0], [4, 5], [5, 7], [7, 6], [6, 4], [0, 4], [1, 5], [2, 6], [3, 7]];

export const EMISSIVE = { lit: 1, sodium: 1, signal: 0.35 };
export const WETNESS = { wet: 0.92, water: 0.80, ground: 0.34, kerb: 0.22, tar: 0.55, chop: 0.62 };

export const BLOCK = { m: 1.55, max: 4, minArea: 2.2, amt: 0.135 };

export const SKY_SETS = [
  [[0.392,0.470,0.566],[0.612,0.668,0.722],[0.756,0.798,0.846],[0.470,0.545,0.640],[0.255,0.245,0.222],[0.700,0.762,0.836],[-0.42,0.80,0.43]],
  [[0.318,0.512,0.688],[0.640,0.744,0.806],[0.828,0.848,0.836],[0.520,0.610,0.712],[0.330,0.300,0.250],[0.788,0.812,0.800],[-0.36,0.74,0.57]],
  [[0.118,0.156,0.246],[0.318,0.316,0.362],[0.520,0.436,0.392],[0.230,0.276,0.372],[0.150,0.132,0.120],[0.408,0.424,0.560],[-0.62,0.44,0.65]]
];
export const BLOOM_CUT = [0.99, 1.22, 0.92];
export const RAY_AMT = [0.17, 0.17, 0.045];
export const BLOOM_AMT = [0.48, 0.48, 0.34];
export const EMIS_BOOST = [1.35, 1.30, 2.35];
export const FOG_K = 0.0055;
export const OUTLINE_PX = 2.1;
export const SHAD_N = 1024;
export const SHAD_HALF = 70;
export const ZOOMS = [46, 24, 12, 6];

// paletteOf: usePalette's own copy loop (demo 788-792), returning the copy
// instead of writing it onto a module-level PAL.
export function paletteOf(name) {
  var src = PALETTES[name] || PALETTES.overcast;
  var out = {};
  for (var k in src) out[k] = src[k].slice();
  return out;
}

// ---- 2. mesh helpers, verbatim (demo 456-503, 956-1043) ----
export function prismMesh(pr) {
  var c = pr.cc || pr.c, s = pr.s;
  var sides = pr.sides || 8;
  var axis = pr.axis || 'y';
  var ra = s[0] / 2, rb = s[2] / 2, half = s[1] / 2;
  if (axis === 'z') { ra = s[0] / 2; rb = s[1] / 2; half = s[2] / 2; }
  if (axis === 'x') { ra = s[2] / 2; rb = s[1] / 2; half = s[0] / 2; }
  var ring = ngon(sides, 1);
  var lo = [], hi = [];
  for (var i = 0; i < sides; i++) {
    var u = ring[i][0] * ra, v = ring[i][1] * rb;
    if (axis === 'y') { lo.push([c[0] + u, c[1] - half, c[2] + v]); hi.push([c[0] + u, c[1] + half, c[2] + v]); }
    else if (axis === 'z') { lo.push([c[0] + u, c[1] + v, c[2] - half]); hi.push([c[0] + u, c[1] + v, c[2] + half]); }
    else { lo.push([c[0] - half, c[1] + v, c[2] + u]); hi.push([c[0] + half, c[1] + v, c[2] + u]); }
  }
  if (pr.rx || pr.ry) {
    for (var q = 0; q < sides; q++) {
      if (pr.rx) { lo[q] = rotX(lo[q], c, pr.rx); hi[q] = rotX(hi[q], c, pr.rx); }
      if (pr.ry) { lo[q] = rotY(lo[q], c, pr.ry); hi[q] = rotY(hi[q], c, pr.ry); }
    }
  }
  var quads = [], edges = [];
  for (var k = 0; k < sides; k++) {
    var j = (k + 1) % sides;
    quads.push([lo[k], lo[j], hi[j], hi[k]]);
    edges.push([lo[k], lo[j]], [hi[k], hi[j]], [lo[k], hi[k]]);
  }
  var capA = [], capB = [];
  for (var m = 0; m < sides; m++) { capA.push(hi[m]); capB.push(lo[sides - 1 - m]); }
  return { quads: quads, caps: [capA, capB], edges: edges };
}

export function wedgeMesh(pr) {
  var c = pr.cc || pr.c, s = pr.s;
  var hx = s[0] / 2, hy = s[1] / 2, hz = s[2] / 2;
  var v = [
    [c[0] - hx, c[1] - hy, c[2] - hz], [c[0] + hx, c[1] - hy, c[2] - hz],
    [c[0] + hx, c[1] - hy, c[2] + hz], [c[0] - hx, c[1] - hy, c[2] + hz],
    [c[0] - hx, c[1] + hy, c[2] + hz], [c[0] + hx, c[1] + hy, c[2] + hz]
  ];
  if (pr.ry) for (var i = 0; i < 6; i++) v[i] = rotY(v[i], c, pr.ry);
  return {
    quads: [[v[0], v[1], v[2], v[3]], [v[3], v[2], v[5], v[4]], [v[1], v[0], v[4], v[5]]],
    caps: [[v[0], v[3], v[4]], [v[2], v[1], v[5]]],
    edges: [[v[0], v[1]], [v[1], v[2]], [v[2], v[3]], [v[3], v[0]], [v[4], v[5]],
            [v[3], v[4]], [v[2], v[5]], [v[0], v[4]], [v[1], v[5]]]
  };
}

export function rotX(p, c, a) {
  var y = p[1] - c[1], z = p[2] - c[2], ca = Math.cos(a), sa = Math.sin(a);
  return [p[0], c[1] + y * ca - z * sa, c[2] + y * sa + z * ca];
}
export function rotY(p, c, a) {
  var x = p[0] - c[0], z = p[2] - c[2], ca = Math.cos(a), sa = Math.sin(a);
  return [c[0] + x * ca + z * sa, p[1], c[2] - x * sa + z * ca];
}

export function primCorners(pr) {
  var c = pr.cc || pr.c, s = pr.s;
  var hx = s[0] / 2, hy = s[1] / 2, hz = s[2] / 2, v = [];
  var sx = [-hx, hx], sy = [-hy, hy], sz = [-hz, hz];
  for (var a = 0; a < 2; a++) for (var b = 0; b < 2; b++) for (var d = 0; d < 2; d++)
    v.push([c[0] + sx[a], c[1] + sy[b], c[2] + sz[d]]);
  if (pr.rx) for (var i = 0; i < 8; i++) v[i] = rotX(v[i], c, pr.rx);
  if (pr.ry) for (var i2 = 0; i2 < 8; i2++) v[i2] = rotY(v[i2], c, pr.ry);
  return v;
}

export function hash3(u, v, w) {
  var h = (u | 0) * 374761393 + (v | 0) * 668265263 + (w | 0) * 2246822519;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

export function blockTint(c, u, v, w) {
  var a = hash3(u, v, w) - 0.5;
  var b = hash3(v, w, u + 7) - 0.5;
  return [c[0] * (1 + a * BLOCK.amt * 2) + b * 0.012,
          c[1] * (1 + a * BLOCK.amt * 1.7),
          c[2] * (1 + a * BLOCK.amt * 1.4) - b * 0.010];
}

export function lerp3(a, b, t) { return [a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t, a[2]+(b[2]-a[2])*t]; }

export function pushPanelled(pos, nrm, col, A, B, C, D, c, key, e, emi, wv) {
  var e0 = Math.hypot(B[0]-A[0], B[1]-A[1], B[2]-A[2]);
  var e1 = Math.hypot(D[0]-A[0], D[1]-A[1], D[2]-A[2]);
  if (e0 * e1 < BLOCK.minArea) { pushPoly(pos, nrm, col, [A,B,C,D], c, e, emi, wv); return; }
  var nu = Math.max(1, Math.min(BLOCK.max, Math.round(e0 / BLOCK.m)));
  var nv = Math.max(1, Math.min(BLOCK.max, Math.round(e1 / BLOCK.m)));
  if (nu === 1 && nv === 1) { pushPoly(pos, nrm, col, [A,B,C,D], c, e, emi, wv); return; }
  for (var i = 0; i < nu; i++) {
    for (var j = 0; j < nv; j++) {
      var u0 = i / nu, u1 = (i + 1) / nu, v0 = j / nv, v1 = (j + 1) / nv;
      var p00 = lerp3(lerp3(A, B, u0), lerp3(D, C, u0), v0);
      var p10 = lerp3(lerp3(A, B, u1), lerp3(D, C, u1), v0);
      var p11 = lerp3(lerp3(A, B, u1), lerp3(D, C, u1), v1);
      var p01 = lerp3(lerp3(A, B, u0), lerp3(D, C, u0), v1);
      var mx = (p00[0]+p11[0]) * 0.5, my = (p00[1]+p11[1]) * 0.5, mz = (p00[2]+p11[2]) * 0.5;
      var t = blockTint(c, Math.round(mx * 7) | 0, Math.round(my * 7) | 0, (Math.round(mz * 7) | 0) ^ key);
      pushPoly(pos, nrm, col, [p00, p10, p11, p01], t, e, emi, wv);
    }
  }
}

export function pushEdge(ea, eb, es, p0, p1) {
  var q = [[p0, p1, 1], [p0, p1, -1], [p1, p0, 1],
           [p1, p0, 1], [p0, p1, -1], [p1, p0, -1]];
  for (var i = 0; i < 6; i++) {
    ea.push(q[i][0][0], q[i][0][1], q[i][0][2]);
    eb.push(q[i][1][0], q[i][1][1], q[i][1][2]);
    es.push(q[i][2]);
  }
}

export function pushPoly(pos, nrm, col, pts, c, e, emi, wv) {
  var A = pts[0];
  for (var t = 1; t < pts.length - 1; t++) {
    var B = pts[t], C = pts[t + 1];
    var ux = B[0]-A[0], uy = B[1]-A[1], uz = B[2]-A[2];
    var wx = C[0]-A[0], wy = C[1]-A[1], wz = C[2]-A[2];
    var nx = uy*wz-uz*wy, ny = uz*wx-ux*wz, nz = ux*wy-uy*wx;
    var L = Math.hypot(nx,ny,nz)||1; nx/=L; ny/=L; nz/=L;
    var tri = [A,B,C];
    for (var k = 0; k < 3; k++) { pos.push(tri[k][0],tri[k][1],tri[k][2]); nrm.push(nx,ny,nz); col.push(c[0],c[1],c[2]); if (emi) { emi.push(e || 0); emi.push(wv || 0); } }
  }
}

// ---- 3. buildMesh (demo 1048-1093) ----
export function buildMesh(level, want, base, pal) {
  var pos = [], nrm = [], col = [], lpos = [], emi = [];
  var ea = [], eb = [], es = [];
  var ranges = new Int32Array(level.length * 4);
  for (var i = 0; i < level.length; i++) {
    var pr = level[i];
    var vStart = pos.length / 3, eStart = ea.length / 3;
    ranges[i * 4] = vStart; ranges[i * 4 + 2] = eStart;
    if (pr.dead) continue;
    if (pr.voxed) continue;
    if (want === 1 && !pr.ghost) continue;
    if (want === 0 && (pr.ghost || (base !== undefined && i >= base))) continue;
    if (want === 2 && (pr.ghost || base === undefined || i < base)) continue;
    var c = pal[pr.p] || [0.5, 0.5, 0.5];
    var em = EMISSIVE[pr.p] || 0;
    var wt = WETNESS[pr.p] || 0;
    if (pr.kind === 'prism' || pr.kind === 'wedge') {
      var g = pr.kind === 'prism' ? prismMesh(pr) : wedgeMesh(pr);
      for (var q = 0; q < g.quads.length; q++) pushPoly(pos, nrm, col, g.quads[q], c, em, emi, wt);
      for (var cp = 0; cp < g.caps.length; cp++) pushPoly(pos, nrm, col, g.caps[cp], c, em, emi, wt);
      for (var e2 = 0; e2 < g.edges.length; e2++) {
        var p0 = g.edges[e2][0], p1 = g.edges[e2][1];
        lpos.push(p0[0],p0[1],p0[2], p1[0],p1[1],p1[2]);
        pushEdge(ea, eb, es, p0, p1);
      }
      ranges[i * 4 + 1] = pos.length / 3 - vStart; ranges[i * 4 + 3] = ea.length / 3 - eStart;
      continue;
    }
    var v = primCorners(pr);
    var blocky = !pr.deco && !pr.ghost && pr.p !== 'water' && pr.p !== 'wet';
    for (var f = 0; f < 6; f++) {
      var qq = FACE[f];
      if (blocky) pushPanelled(pos, nrm, col, v[qq[0]], v[qq[1]], v[qq[2]], v[qq[3]], c, f * 131 + i, em, emi, wt);
      else pushPoly(pos, nrm, col, [v[qq[0]], v[qq[1]], v[qq[2]], v[qq[3]]], c, em, emi, wt);
    }
    for (var e = 0; e < 12; e++) {
      var a0 = v[EDGE[e][0]], a1 = v[EDGE[e][1]];
      lpos.push(a0[0], a0[1], a0[2], a1[0], a1[1], a1[2]);
      pushEdge(ea, eb, es, a0, a1);
    }
    ranges[i * 4 + 1] = pos.length / 3 - vStart; ranges[i * 4 + 3] = ea.length / 3 - eStart;
  }
  return { pos: new Float32Array(pos), nrm: new Float32Array(nrm), col: new Float32Array(col), line: new Float32Array(lpos), surf: new Float32Array(emi),
    edge: { a: new Float32Array(ea), b: new Float32Array(eb), s: new Float32Array(es) }, ranges: ranges,
    lit: new Float32Array(pos.length) };
}

// ---- 4. boxMinusBox, patchBox (demo 1097-1137) ----
export function boxMinusBox(c0, s0, c1, s1) {
  var lo = [c0[0]-s0[0]/2, c0[1]-s0[1]/2, c0[2]-s0[2]/2];
  var hi = [c0[0]+s0[0]/2, c0[1]+s0[1]/2, c0[2]+s0[2]/2];
  var pl = [c1[0]-s1[0]/2, c1[1]-s1[1]/2, c1[2]-s1[2]/2];
  var ph = [c1[0]+s1[0]/2, c1[1]+s1[1]/2, c1[2]+s1[2]/2];
  for (var k = 0; k < 3; k++) { if (pl[k] < lo[k]) pl[k] = lo[k]; if (ph[k] > hi[k]) ph[k] = hi[k]; }
  var out = [], EPS = 1e-4;
  function add(a, b) {
    var sx = b[0]-a[0], sy = b[1]-a[1], sz = b[2]-a[2];
    if (sx <= EPS || sy <= EPS || sz <= EPS) return;
    out.push({ c: [(a[0]+b[0])/2, (a[1]+b[1])/2, (a[2]+b[2])/2], s: [sx, sy, sz] });
  }
  add([lo[0], lo[1], lo[2]], [pl[0], hi[1], hi[2]]);            // -x slab
  add([ph[0], lo[1], lo[2]], [hi[0], hi[1], hi[2]]);            // +x slab
  add([pl[0], lo[1], lo[2]], [ph[0], pl[1], hi[2]]);            // -y within x range
  add([pl[0], ph[1], lo[2]], [ph[0], hi[1], hi[2]]);            // +y
  add([pl[0], pl[1], lo[2]], [ph[0], ph[1], pl[2]]);            // -z within x,y
  add([pl[0], pl[1], ph[2]], [ph[0], ph[1], hi[2]]);            // +z
  return { rest: out, patch: { c: [(pl[0]+ph[0])/2, (pl[1]+ph[1])/2, (pl[2]+ph[2])/2],
                               s: [ph[0]-pl[0], ph[1]-pl[1], ph[2]-pl[2]] } };
}

export const PATCH_M = 1.7;

// pick a patch around the impact, snapped so repeat hits reuse the same one
export function patchBox(pr, x, y, z) {
  var c = pr.cc || pr.c, s = pr.s;
  var w = [Math.min(PATCH_M, s[0]), Math.min(PATCH_M, s[1]), Math.min(PATCH_M, s[2])];
  var p = [x, y, z], cen = [0, 0, 0];
  for (var k = 0; k < 3; k++) {
    var lo = c[k] - s[k] / 2, hi = c[k] + s[k] / 2;
    if (w[k] >= s[k] - 1e-6) { cen[k] = c[k]; w[k] = s[k]; continue; }
    var n = Math.max(1, Math.round(s[k] / w[k]));
    var step = s[k] / n;
    var idx = Math.floor((p[k] - lo) / step);
    if (idx < 0) idx = 0; if (idx >= n) idx = n - 1;
    cen[k] = lo + step * (idx + 0.5);
    w[k] = step;
  }
  return { c: cen, s: w };
}

// ---- 5. bakeLampLight (demo 1169-1200) ----
export function bakeLampLight(mesh, lamps, solids) {
  var n = mesh.pos.length / 3;
  var out = new Float32Array(n * 3);
  if (!lamps.length) return out;
  var cache = {}, key;
  for (var v = 0; v < n; v++) {
    var px = mesh.pos[v * 3], py = mesh.pos[v * 3 + 1], pz = mesh.pos[v * 3 + 2];
    var nx = mesh.nrm[v * 3], ny = mesh.nrm[v * 3 + 1], nz = mesh.nrm[v * 3 + 2];
    var r = 0, g = 0, b = 0;
    for (var l = 0; l < lamps.length; l++) {
      var L = lamps[l];
      var dx = L.x - px, dy = L.y - py, dz = L.z - pz;
      var dd = Math.hypot(dx, dy, dz);
      if (dd > L.rad || dd < 1e-6) continue;
      var nd = (dx * nx + dy * ny + dz * nz) / dd;
      if (nd < -0.25) continue;
      var att = 1 - dd / L.rad; att *= att;
      // quantise the sample point so neighbouring vertices share a visibility result
      key = l + '|' + (px * 3 | 0) + ',' + (py * 3 | 0) + ',' + (pz * 3 | 0);
      var vis = cache[key];
      if (vis === undefined) {
        vis = rayBlocked(solids, px + nx * 0.03, py + ny * 0.03, pz + nz * 0.03, L.x, L.y, L.z) ? 0 : 1;
        cache[key] = vis;
      }
      if (!vis) continue;
      var k = att * (0.22 + 0.78 * Math.max(0, nd)) * L.inten;
      r += L.r * k; g += L.g * k; b += L.b * k;
    }
    out[v * 3] = r; out[v * 3 + 1] = g; out[v * 3 + 2] = b;
  }
  return out;
}

// ---- 6. collectLamps, packLights, addFlash, stepFlashes (demo 2670-2725) ----
// collectLamps: the demo's own loop (2670-2686), level and pal handed in,
// returning the list instead of writing the global LAMPS.
export function collectLamps(level, pal) {
  var LAMPS = [];
  for (var i = 0; i < level.length; i++) {
    var pr = level[i];
    if (pr.dead) continue;
    var e = EMISSIVE[pr.p];
    if (!e) continue;
    var c = pr.cc || pr.c, col = pal[pr.p] || [1, 1, 1];
    var vol = pr.s[0] * pr.s[1] * pr.s[2];
    LAMPS.push({
      x: c[0], y: c[1], z: c[2],
      r: col[0], g: col[1], b: col[2],
      rad: Math.min(22, 5.5 + Math.sqrt(pr.s[0] * pr.s[1]) * 4.5),
      inten: (pr.p === 'sodium' ? 1.35 : 0.85) * e
    });
  }
  return LAMPS;
}

// packLights: the demo's own pick-and-sort (2688-2711), lamps, flashes and
// camPos handed in, night a boolean in place of the palIdx === 2 test,
// litA/litB local arrays returned instead of the globals LIT_A/LIT_B.
export function packLights(lamps, flashes, camPos, night) {
  var litA = new Float32Array(16), litB = new Float32Array(16);
  var pick = [];
  for (var i = 0; i < lamps.length; i++) {
    var L2 = lamps[i];
    var d = Math.hypot(L2.x - camPos[0], L2.y - camPos[1], L2.z - camPos[2]);
    if (d > L2.rad + 42) continue;
    pick.push([d - L2.rad, L2, 0]);
  }
  for (var f = 0; f < flashes.length; f++) {
    var F = flashes[f];
    var d2 = Math.hypot(F.x - camPos[0], F.y - camPos[1], F.z - camPos[2]);
    pick.push([d2 - F.rad - 200, F, 1]);
  }
  pick.sort(function (a2, b2) { return a2[0] - b2[0]; });
  var n = Math.min(4, pick.length), nightMul = night ? 1.6 : 1.0;
  for (var k = 0; k < 4; k++) {
    if (k < n) {
      var o = pick[k][1], dyn = pick[k][2];
      var amp = (dyn ? o.inten * Math.max(0, 1 - o.t / o.life) : o.inten) * nightMul;
      litA[k * 4] = o.x; litA[k * 4 + 1] = o.y; litA[k * 4 + 2] = o.z; litA[k * 4 + 3] = o.rad;
      litB[k * 4] = o.r * amp; litB[k * 4 + 1] = o.g * amp; litB[k * 4 + 2] = o.b * amp; litB[k * 4 + 3] = 0;
    } else { litA[k * 4 + 3] = 0; }
  }
  return { litA: litA, litB: litB };
}

// addFlash, stepFlashes: the demo's own bodies (2713-2725), flashes handed
// in as the first argument in place of the global.
export function addFlash(flashes, x, y, z, r, g, b, rad, inten, life) {
  flashes.push({ x: x, y: y, z: z, r: r, g: g, b: b, rad: rad, inten: inten, t: 0, life: life });
  if (flashes.length > 14) flashes.shift();
}
export function stepFlashes(flashes, dt) {
  var w = 0;
  for (var i = 0; i < flashes.length; i++) {
    flashes[i].t += dt;
    if (flashes[i].t < flashes[i].life) flashes[w++] = flashes[i];
  }
  flashes.length = w;
}

// ---- 7. matrices (demo 1219-1268), projPx (demo 2819-2827) ----
export function m4mul(a, b) {
  var o = new Float32Array(16);
  for (var r = 0; r < 4; r++) for (var c = 0; c < 4; c++) {
    var s = 0; for (var k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k];
    o[c * 4 + r] = s;
  }
  return o;
}
export function m4ortho(hw, hh, n, f) {
  var o = new Float32Array(16);
  o[0] = 1 / hw; o[5] = 1 / hh; o[10] = -2 / (f - n);
  o[14] = -(f + n) / (f - n); o[15] = 1;
  return o;
}
export function m4lookDir(eye, dir, up) {
  var f = dir.slice(), l = Math.hypot(f[0], f[1], f[2]) || 1;
  f = [f[0] / l, f[1] / l, f[2] / l];
  var s = [f[1] * up[2] - f[2] * up[1], f[2] * up[0] - f[0] * up[2], f[0] * up[1] - f[1] * up[0]];
  var sl = Math.hypot(s[0], s[1], s[2]) || 1; s = [s[0] / sl, s[1] / sl, s[2] / sl];
  var u = [s[1] * f[2] - s[2] * f[1], s[2] * f[0] - s[0] * f[2], s[0] * f[1] - s[1] * f[0]];
  var o = new Float32Array(16);
  o[0] = s[0]; o[4] = s[1]; o[8] = s[2];
  o[1] = u[0]; o[5] = u[1]; o[9] = u[2];
  o[2] = -f[0]; o[6] = -f[1]; o[10] = -f[2];
  o[12] = -(s[0] * eye[0] + s[1] * eye[1] + s[2] * eye[2]);
  o[13] = -(u[0] * eye[0] + u[1] * eye[1] + u[2] * eye[2]);
  o[14] = (f[0] * eye[0] + f[1] * eye[1] + f[2] * eye[2]);
  o[15] = 1;
  return o;
}
export function m4persp(fovDeg, asp, n, f) {
  var t = 1 / Math.tan(fovDeg * Math.PI / 360), o = new Float32Array(16);
  o[0] = t / asp; o[5] = t; o[10] = (f + n) / (n - f); o[11] = -1; o[14] = 2 * f * n / (n - f);
  return o;
}
export function m4view(pos, yaw, pitch) {
  var cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
  var rx = cy, ry = 0, rz = -sy;
  var ux = sy * sp, uy = cp, uz = cy * sp;
  var fx = -sy * cp, fy = sp, fz = -cy * cp;
  var o = new Float32Array(16);
  o[0] = rx; o[4] = ry; o[8] = rz;
  o[1] = ux; o[5] = uy; o[9] = uz;
  o[2] = -fx; o[6] = -fy; o[10] = -fz;
  o[12] = -(rx * pos[0] + ry * pos[1] + rz * pos[2]);
  o[13] = -(ux * pos[0] + uy * pos[1] + uz * pos[2]);
  o[14] = (fx * pos[0] + fy * pos[1] + fz * pos[2]);
  o[15] = 1;
  return o;
}

// projPx: the demo's own body (2819-2827), vpW and vpH handed in in place
// of the globals.
export function projPx(M, x, y, z, out, vpW, vpH) {
  var cx = M[0] * x + M[4] * y + M[8] * z + M[12];
  var cy = M[1] * x + M[5] * y + M[9] * z + M[13];
  var cw = M[3] * x + M[7] * y + M[11] * z + M[15];
  if (cw <= 1e-6) return false;
  out[0] = (cx / cw * 0.5 + 0.5) * vpW;
  out[1] = (0.5 - cy / cw * 0.5) * vpH;
  return true;
}

// ---- 8. cubeGeom (demo 3280-3296) ----
export function cubeGeom() {
  var P = [], N = [];
  var F = [[0,3,2,1],[4,6,7,5],[0,4,5,1],[2,3,7,6],[0,2,6,4],[1,5,7,3]];
  var v = [];
  for (var a = 0; a < 2; a++) for (var b = 0; b < 2; b++) for (var c = 0; c < 2; c++)
    v.push([a ? 0.5 : -0.5, b ? 0.5 : -0.5, c ? 0.5 : -0.5]);
  for (var f = 0; f < 6; f++) {
    var q = F[f], A = v[q[0]], B = v[q[1]], C = v[q[2]], D = v[q[3]];
    var ux = B[0]-A[0], uy = B[1]-A[1], uz = B[2]-A[2];
    var wx = C[0]-A[0], wy = C[1]-A[1], wz = C[2]-A[2];
    var nx = uy*wz-uz*wy, ny = uz*wx-ux*wz, nz = ux*wy-uy*wx;
    var L = Math.hypot(nx,ny,nz)||1; nx/=L; ny/=L; nz/=L;
    var tri = [A,B,C,A,C,D];
    for (var t = 0; t < 6; t++) { P.push(tri[t][0],tri[t][1],tri[t][2]); N.push(nx,ny,nz); }
  }
  return { pos: new Float32Array(P), nrm: new Float32Array(N) };
}

// ---- 9. lightMatrix (demo 3816-3827) ----
// the demo's own body, camPos, forward, light, shadHalf and shadN handed in
// in place of CAM.pos, basis.f, LIGHT, SHAD_HALF and SHAD_N.
export function lightMatrix(camPos, forward, light, shadHalf = SHAD_HALF, shadN = SHAD_N) {
  var fx = forward[0], fz = forward[2];
  var fl = Math.hypot(fx, fz) || 1; fx /= fl; fz /= fl;
  var c = [camPos[0] + fx * 30, 4, camPos[2] + fz * 30];
  // snap the centre to whole texels so the shadow does not crawl as you walk
  var texel = (shadHalf * 2) / shadN;
  c[0] = Math.round(c[0] / texel) * texel;
  c[2] = Math.round(c[2] / texel) * texel;
  var eye = [c[0] + light[0] * 150, c[1] + light[1] * 150, c[2] + light[2] * 150];
  var V = m4lookDir(eye, [-light[0], -light[1], -light[2]], [0, 1, 0]);
  return m4mul(m4ortho(shadHalf, shadHalf, 1, 320), V);
}

// ---- 10. instance packing the voxel lift left behind (demo 2070-2152,
// 2436-2455) ----
export function packAll(vox, out, colFn) {
  var n = 0, cen = [0, 0, 0];
  var cap = (out.length / 11) | 0;
  if (!vox.slotF || vox.slotF.length < cap) {
    vox.slotF = new Int32Array(cap);
    vox.slotC = new Int32Array(cap);
  }
  for (var k = 0; k < vox.fields.length; k++) {
    var f = vox.fields[k], col = colFn(f.prim);
    if (!f.slot || f.slot.length !== f.count) f.slot = new Int32Array(f.count);
    for (var q = 0; q < f.count; q++) f.slot[q] = -1;
    if (f.prim.dead || f.frac === 0) continue;
    for (var i = 0; i < f.count; i++) {
      if (!f.alive[i]) continue;
      if (n >= cap) { vox.packN = n; return n; }
      voxCentre(f, i, cen);
      var o = n * 11;
      var jt = ((i * 2654435761) >>> 0) / 4294967296 * 0.10 - 0.05;
      out[o] = cen[0]; out[o + 1] = cen[1]; out[o + 2] = cen[2];
      out[o + 3] = f.sx; out[o + 4] = f.sy; out[o + 5] = f.sz;
      out[o + 6] = col[0] * (1 + jt); out[o + 7] = col[1] * (1 + jt); out[o + 8] = col[2] * (1 + jt);
      out[o + 9] = 0; out[o + 10] = 0;
      f.slot[i] = n; vox.slotF[n] = k; vox.slotC[n] = i;
      n++;
    }
  }
  vox.packN = n;
  vox.packed = out;
  return n;
};

export function unpackCell(vox, f, i) {
  if (!vox.packed || !f.slot) return 0;
  var s = f.slot[i];
  if (s < 0) return 0;
  var last = vox.packN - 1;
  var out = vox.packed;
  if (s !== last) {
    var a = s * 11, b = last * 11;
    for (var q = 0; q < 11; q++) out[a + q] = out[b + q];
    var lf = vox.slotF[last], lc = vox.slotC[last];
    vox.fields[lf].slot[lc] = s;
    vox.slotF[s] = lf; vox.slotC[s] = lc;
  }
  f.slot[i] = -1;
  vox.packN = last;
  vox.packDirty = 1;
  return 1;
};

export function intactInstances(vox, out, colFn) {
  var n = 0, cen = [0, 0, 0];
  for (var k = 0; k < vox.fields.length; k++) {
    var f = vox.fields[k], col = colFn(f.prim);
    if (f.prim.dead) continue;
    if (f.frac === 0) continue;
    for (var i = 0; i < f.count; i++) {
      if (!f.alive[i]) continue;
      if (n * 11 + 10 >= out.length) return n;
      voxCentre(f, i, cen);
      var o = n * 11;
      var jt = ((i * 2654435761) >>> 0) / 4294967296 * 0.10 - 0.05;
      out[o] = cen[0]; out[o + 1] = cen[1]; out[o + 2] = cen[2];
      out[o + 3] = f.sx; out[o + 4] = f.sy; out[o + 5] = f.sz;
      out[o + 6] = col[0] * (1 + jt); out[o + 7] = col[1] * (1 + jt); out[o + 8] = col[2] * (1 + jt);
      out[o + 9] = 0; out[o + 10] = 0;
      n++;
    }
  }
  return n;
};

// colOf: the default colour reader for a debris or cluster entry — the
// lifted voxel world carries no colour, so entries with r, g, b fields
// (none, from this module) give those; every other entry gives white.
export function colOf(entry) {
  if (entry && typeof entry.r === 'number' && typeof entry.g === 'number' && typeof entry.b === 'number') {
    return [entry.r, entry.g, entry.b];
  }
  return [1, 1, 1];
}

// dynInstances: the demo's own body (2142-2152), vox.dyn in place of
// this.dyn, colOf(b) in place of the missing b.r, b.g, b.b.
export function dynInstances(vox, out, colOf) {
  var d = vox.dyn, n = Math.min(d.length, (out.length / 11) | 0);
  for (var i = 0; i < n; i++) {
    var b = d[i], o = i * 11;
    var col = colOf(b);
    out[o] = b.x; out[o + 1] = b.y; out[o + 2] = b.z;
    out[o + 3] = b.sx; out[o + 4] = b.sy; out[o + 5] = b.sz;
    out[o + 6] = col[0]; out[o + 7] = col[1]; out[o + 8] = col[2];
    out[o + 9] = b.ra; out[o + 10] = b.rb;
  }
  return n;
}

// clusterInstances: the demo's own body (2436-2455), vox.clusters in place
// of this.clusters, colOf(C) once per cluster in place of the missing C.r,
// C.g, C.b.
export function clusterInstances(vox, out, from, colOf) {
  var n = from, cap = (out.length / 11) | 0;
  for (var i = 0; i < vox.clusters.length; i++) {
    var C = vox.clusters[i];
    var ca = Math.cos(C.ra), sa = Math.sin(C.ra), cb = Math.cos(C.rb), sb = Math.sin(C.rb);
    var col = colOf(C);
    for (var q = 0; q < C.nc; q++) {
      if (n >= cap) return n;
      var ox = C.cells[q * 3], oy = C.cells[q * 3 + 1], oz = C.cells[q * 3 + 2];
      var y1 = oy * ca - oz * sa, z1 = oy * sa + oz * ca;
      var x2 = ox * cb + z1 * sb, z2 = -ox * sb + z1 * cb;
      var o = n * 11;
      out[o] = C.x + x2; out[o + 1] = C.y + y1; out[o + 2] = C.z + z2;
      out[o + 3] = C.sx; out[o + 4] = C.sy; out[o + 5] = C.sz;
      out[o + 6] = col[0]; out[o + 7] = col[1]; out[o + 8] = col[2];
      out[o + 9] = C.ra; out[o + 10] = C.rb;
      n++;
    }
  }
  return n;
}

// ---- 11. shader text, verbatim (demo 1270-1474, 2154-2164) ----
var VS_SOLID = 'attribute vec3 aPos;attribute vec3 aNrm;attribute vec3 aCol;attribute vec2 aSurf;attribute vec3 aLit;' +
  'uniform mat4 uMVP;uniform mat4 uLMVP;uniform vec3 uL;uniform vec3 uCam;' +
  'varying vec3 vC;varying float vN;varying vec4 vLP;varying float vR;varying vec3 vWP;varying vec3 vN3;varying vec2 vS;varying vec3 vBake;' +
  'void main(){gl_Position=uMVP*vec4(aPos,1.0);vC=aCol;vS=aSurf;vBake=aLit;' +
  'vec3 n=normalize(aNrm);vec3 vv=normalize(aPos-uCam);if(dot(n,vv)>0.0)n=-n;' +
  'n3set(n);vWP=aPos;vLP=uLMVP*vec4(aPos,1.0);' +
  'vN=max(dot(n,normalize(uL)),0.0);' +
  'vR=pow(clamp(1.0+dot(n,vv),0.0,1.0),2.4);}';
VS_SOLID = VS_SOLID.replace('n3set(n);', 'vN3=n;');

var FS_SOLID = 'precision highp float;' +
  'varying vec3 vC;varying float vN;varying vec4 vLP;varying float vR;varying vec3 vWP;varying vec3 vN3;varying vec2 vS;varying vec3 vBake;' +
  'uniform vec3 uSkyC;uniform vec3 uGndC;uniform vec3 uFogC;uniform vec3 uSunDir;uniform vec3 uCam;' +
  'uniform vec4 uLA[4];uniform vec4 uLB[4];uniform vec4 uP;uniform vec4 uQ;uniform sampler2D uShad;' +
  'float unpackD(vec4 v){return dot(v,vec4(1.0,1.0/255.0,1.0/65025.0,1.0/16581375.0));}' +
  'float ch(vec2 p){vec3 q=fract(vec3(floor(p).xyx)*vec3(0.1031,0.1030,0.0973));q+=dot(q,q.yzx+33.33);return fract((q.x+q.y)*q.z);}' +
  'float cn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);' +
  'return mix(mix(ch(i),ch(i+vec2(1.0,0.0)),f.x),mix(ch(i+vec2(0.0,1.0)),ch(i+vec2(1.0,1.0)),f.x),f.y);}' +
  'float shadowAt(){if(uP.y<0.5)return 1.0;vec3 p=vLP.xyz/vLP.w*0.5+0.5;' +
  'if(p.x<0.005||p.x>0.995||p.y<0.005||p.y>0.995||p.z>1.0)return 1.0;' +
  'float bias=0.0016+0.0060*(1.0-vN);float s=0.0;' +
  'for(int i=-1;i<=1;i++){for(int j=-1;j<=1;j++){' +
  'float d=unpackD(texture2D(uShad,p.xy+vec2(float(i),float(j))*uP.z));' +
  's+=(p.z-bias>d)?0.0:1.0;}}' +
  'return mix(1.0,s/9.0,0.82);}' +
  'void main(){' +
  'float b=vN<0.30?0.58:(vN<0.68?0.80:1.0);' +
  'vec3 tone=mix(vec3(0.86,0.93,1.10),vec3(1.08,1.02,0.92),b);' +
  'vec3 amb=mix(uGndC,uSkyC,vN3.y*0.5+0.5);' +
  'float contact=clamp(vWP.y*0.55+0.30,0.55,1.0);' +
  'float sh=shadowAt();' +
  'vec2 cw=vWP.xz*0.014+vec2(uP.w*0.010,uP.w*0.004);' +
  'float cloud=smoothstep(0.34,0.80,cn(cw)*0.62+cn(cw*2.1)*0.38);' +
  'sh*=mix(1.0,0.58,cloud);' +
  'vec3 col=vC*(b*0.80+0.24)*tone*contact*mix(0.42,1.0,sh) + vC*amb*0.30;' +
  'vec3 pl=vec3(0.0);' +
  'for(int i=0;i<4;i++){' +
  'if(uLA[i].w<=0.0) continue;' +
  'vec3 dl=uLA[i].xyz-vWP;float dd=length(dl);' +
  'if(dd>uLA[i].w) continue;' +
  'float att=1.0-dd/uLA[i].w;att*=att;' +
  'pl+=uLB[i].rgb*att*(0.22+0.78*max(dot(vN3,dl/max(dd,0.001)),0.0));}' +
  'col+=vC*(pl+vBake);' +
  'if(vS.y>0.01){' +
  'vec3 vd=normalize(vWP-uCam);vec3 rf=reflect(vd,vN3);' +
  'float fres=pow(1.0-max(-dot(vd,vN3),0.0),3.2);' +
  'vec3 skyR=mix(uFogC,uSkyC,clamp(rf.y*1.3+0.12,0.0,1.0));' +
  'float sun=pow(max(dot(rf,normalize(uSunDir)),0.0),110.0);' +
  'vec3 wet=skyR*(0.30+0.70*fres)+vec3(1.0,0.95,0.86)*sun*1.6;' +
  'for(int i=0;i<4;i++){' +
  'if(uLA[i].w<=0.0) continue;' +
  'vec3 dl2=uLA[i].xyz-vWP;float dd2=length(dl2);' +
  'if(dd2>uLA[i].w*1.8) continue;' +
  'wet+=uLB[i].rgb*pow(max(dot(rf,dl2/max(dd2,0.001)),0.0),46.0)*(1.0-dd2/(uLA[i].w*1.8))*2.2;}' +
  'wet+=vBake*1.5;' +
  'col=mix(col,col*0.42+wet,vS.y);}' +
  'col+=uSkyC*vR*0.30;' +
  'col=mix(col,vC*uQ.x,vS.x);' +
  'float f=1.0-exp(-length(vWP-uCam)*uP.x);' +
  'col=mix(col,uFogC,clamp(f,0.0,0.72));' +
  'gl_FragColor=vec4(col,1.0);}';

var VS_MIN = 'attribute vec3 aPos;attribute vec3 aNrm;attribute vec3 aCol;attribute vec2 aSurf;attribute vec3 aLit;uniform mat4 uMVP;uniform vec3 uL;' +
  'varying vec3 vC;varying float vN;void main(){gl_Position=uMVP*vec4(aPos,1.0);vC=aCol;' +
  'vN=max(dot(normalize(aNrm),normalize(uL)),0.0);}';
var FS_MIN = 'precision mediump float;varying vec3 vC;varying float vN;' +
  'void main(){float b=vN<0.30?0.58:(vN<0.68?0.80:1.0);gl_FragColor=vec4(vC*(b*0.8+0.3),1.0);}';
var FS_SKY_MIN = 'precision mediump float;varying vec2 vP;uniform vec3 uTop;uniform vec3 uBot;' +
  'void main(){gl_FragColor=vec4(mix(uBot,uTop,clamp(vP.y*0.5+0.5,0.0,1.0)),1.0);}';

var VS_EDGE = 'attribute vec3 aA;attribute vec3 aB;attribute float aS;' +
  'uniform mat4 uMVP;uniform vec2 uPx;uniform float uW;' +
  'void main(){' +
  'vec4 ca=uMVP*vec4(aA,1.0);vec4 cb=uMVP*vec4(aB,1.0);' +
  // an endpoint behind the eye has negative w; projecting it throws the point
  // millions of pixels away and the quad smears across the screen
  'if(ca.w<=0.001||cb.w<=0.001){gl_Position=vec4(2.0,2.0,2.0,1.0);return;}' +
  'vec2 sa=ca.xy/ca.w*uPx;vec2 sb=cb.xy/cb.w*uPx;' +
  'vec2 d=sb-sa;float L=length(d);' +
  'vec2 dir=L>0.0001?d/L:vec2(1.0,0.0);' +
  'vec2 offPx=vec2(-dir.y,dir.x)*aS*uW;' +
  'gl_Position=vec4(ca.xy+offPx/uPx*ca.w,ca.z,ca.w);}';
var FS_EDGE = 'precision mediump float;uniform vec3 uCol;' +
  'void main(){gl_FragColor=vec4(uCol,1.0);}';

var VS_FLAT = 'attribute vec3 aPos;uniform mat4 uMVP;uniform float uSize;uniform vec3 uCam;varying float vD;' +
  'void main(){gl_Position=uMVP*vec4(aPos,1.0);gl_PointSize=uSize;vD=length(aPos-uCam);}';
var FS_FLAT = 'precision mediump float;uniform vec3 uCol;uniform vec3 uFogC;uniform float uFogK;varying float vD;' +
  'void main(){float f=1.0-exp(-vD*uFogK);gl_FragColor=vec4(mix(uCol,uFogC,clamp(f,0.0,0.75)),1.0);}';

var VS_DEPTH = 'attribute vec3 aPos;uniform mat4 uLMVP;varying float vZ;' +
  'void main(){vec4 p=uLMVP*vec4(aPos,1.0);gl_Position=p;vZ=p.z*0.5+0.5;}';
var FS_DEPTH = 'precision highp float;varying float vZ;' + 'vec4 packD(float d){vec4 e=vec4(1.0,255.0,65025.0,16581375.0)*d;e=fract(e);e-=e.yzww*vec4(1.0/255.0,1.0/255.0,1.0/255.0,0.0);return e;}' +
  'void main(){gl_FragColor=packD(clamp(vZ,0.0,1.0));}';

var VS_DEPTH_INST = 'attribute vec3 aPos;attribute vec3 iOff;attribute vec3 iSize;attribute vec2 iRot;uniform mat4 uLMVP;varying float vZ;' +
  'mat3 rot2(vec2 r){float ca=cos(r.x),sa=sin(r.x),cb=cos(r.y),sb=sin(r.y);' +
  'mat3 A=mat3(1.0,0.0,0.0,0.0,ca,-sa,0.0,sa,ca);mat3 B=mat3(cb,0.0,sb,0.0,1.0,0.0,-sb,0.0,cb);return B*A;}' +
  'void main(){vec3 w=rot2(iRot)*(aPos*iSize)+iOff;vec4 p=uLMVP*vec4(w,1.0);gl_Position=p;vZ=p.z*0.5+0.5;}';

var VS_TRAIL = 'attribute vec3 aPos;attribute vec4 aCol;uniform mat4 uMVP;uniform float uSize;varying vec4 vC4;' +
  'void main(){gl_Position=uMVP*vec4(aPos,1.0);gl_PointSize=uSize*aCol.a;vC4=aCol;}';
var FS_TRAIL = 'precision mediump float;varying vec4 vC4;void main(){gl_FragColor=vec4(vC4.rgb,vC4.a);}';

var VS_SKY = 'attribute vec2 aP;uniform vec3 uR;uniform vec3 uU;uniform vec3 uF;uniform vec2 uScale;' +
  'varying vec3 vRay;varying vec2 vP;' +
  'void main(){vP=aP;vRay=normalize(uF + uR*(aP.x*uScale.x) + uU*(aP.y*uScale.y));' +
  'gl_Position=vec4(aP,0.999,1.0);}';

var FS_SKY = 'precision highp float;varying vec3 vRay;varying vec2 vP;' +
  'uniform vec3 uTop;uniform vec3 uBot;uniform vec3 uHaze;uniform vec3 uSun;uniform float uT;' +
  'float h21(vec2 p){vec3 q=fract(vec3(p.xyx)*vec3(0.1031,0.1030,0.0973));q+=dot(q,q.yzx+33.33);return fract((q.x+q.y)*q.z);}' +
  'float vnoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);' +
  'float a=h21(i),b=h21(i+vec2(1.0,0.0)),c=h21(i+vec2(0.0,1.0)),d=h21(i+vec2(1.0,1.0));' +
  'return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);}' +
  'float fbm(vec2 p){float s=0.0,a=0.5;for(int i=0;i<5;i++){s+=a*vnoise(p);p*=2.03;a*=0.5;}return s;}' +
  'void main(){' +
  'vec3 r=normalize(vRay);' +
  'float up=clamp(r.y*0.5+0.5,0.0,1.0);' +
  'vec3 c=mix(uBot,uTop,pow(clamp(r.y*1.35+0.10,0.0,1.0),0.80));' +
  'c=mix(c,uHaze,pow(1.0-clamp(r.y*2.2+0.06,0.0,1.0),2.6)*0.92);' +
  'float ry=max(r.y,0.035);' +
  'vec2 sp=r.xz/ry;' +
  'float lo=fbm(sp*0.055+vec2(uT*0.0055,uT*0.0022));' +
  'float hi=fbm(sp*0.155-vec2(uT*0.0110,uT*0.0041));' +
  'float deck=smoothstep(0.30,0.72,lo*0.66+hi*0.44);' +
  'float horizonFade=smoothstep(0.0,0.22,r.y);' +
  'float br=smoothstep(0.26,0.86,lo*0.72+hi*0.52);' +
  'vec3 cloudLo=vec3(0.512,0.552,0.606);vec3 cloudHi=vec3(0.972,0.974,0.966);' +
  'vec3 cloud=mix(cloudLo,cloudHi,br);' +
  'c=mix(c,cloud,deck*horizonFade*0.94);' +
  'float sky=dot(c,vec3(0.299,0.587,0.114));' +
  'if(sky<0.40&&r.y>0.02){' +
  'vec2 sg=floor(sp*22.0);' +
  'float sr=h21(sg);' +
  'if(sr>0.982){' +
  'vec2 fp=fract(sp*22.0)-0.5;' +
  'float dstar=length(fp);' +
  'float tw=0.65+0.35*sin(uT*2.1+sr*40.0);' +
  'c+=vec3(0.86,0.90,1.0)*smoothstep(0.30,0.02,dstar)*(1.0-sky/0.40)*tw*0.85;}}' +
  'float sd=max(dot(r,normalize(uSun)),0.0);' +
  'c+=vec3(1.00,0.94,0.80)*pow(sd,7.0)*0.16;' +
  'c+=vec3(1.00,0.96,0.88)*pow(sd,150.0)*0.55*(1.0-deck*0.75);' +
  'gl_FragColor=vec4(c,1.0);}';


var VS_QUAD = 'attribute vec2 aP;varying vec2 vT;void main(){vT=aP*0.5+0.5;gl_Position=vec4(aP,0.0,1.0);}';

var FS_BRIGHT = 'precision highp float;varying vec2 vT;uniform sampler2D uSrc;uniform float uCut;' +
  'void main(){vec3 c=texture2D(uSrc,vT).rgb;' +
  'float l=dot(c,vec3(0.299,0.587,0.114));' +
  'float k=max(0.0,l-uCut)/max(0.0001,1.0-uCut);' +
  'gl_FragColor=vec4(c*k*k,1.0);}';

var FS_BLUR = 'precision highp float;varying vec2 vT;uniform sampler2D uSrc;uniform vec2 uDir;' +
  'void main(){vec3 s=texture2D(uSrc,vT).rgb*0.2270270;' +
  's+=texture2D(uSrc,vT+uDir*1.3846).rgb*0.3162162;' +
  's+=texture2D(uSrc,vT-uDir*1.3846).rgb*0.3162162;' +
  's+=texture2D(uSrc,vT+uDir*3.2307).rgb*0.0702702;' +
  's+=texture2D(uSrc,vT-uDir*3.2307).rgb*0.0702702;' +
  'gl_FragColor=vec4(s,1.0);}';

var FS_RAYS = 'precision highp float;varying vec2 vT;uniform sampler2D uSrc;uniform vec2 uSunUV;uniform float uAmt;uniform vec2 uMask;' +
  'float dh(vec2 p){return fract(52.9829189*fract(dot(p,vec2(0.06711056,0.00583715))));}' +
  'void main(){' +
  'float md=length(vT-uMask);' +
  'float gate=1.0-smoothstep(0.35,0.95,md);' +
  'if(gate<=0.002){gl_FragColor=vec4(0.0,0.0,0.0,1.0);return;}' +
  'vec2 d=(vT-uSunUV)*0.032;' +
  'vec2 uv=vT-d*dh(gl_FragCoord.xy)*1.0;vec3 s=vec3(0.0);float w=1.0;float tw=0.0;' +
  'for(int i=0;i<20;i++){uv-=d;s+=texture2D(uSrc,clamp(uv,0.002,0.998)).rgb*w;tw+=w;w*=0.93;}' +
  'gl_FragColor=vec4(s*(uAmt*gate/max(tw,0.001)),1.0);}';

var FS_COMP = 'precision highp float;varying vec2 vT;' +
  'uniform sampler2D uScene;uniform sampler2D uBloom;uniform sampler2D uRays;' +
  'uniform float uBloomAmt;uniform float uRayAmt;uniform float uGrain;uniform float uT;uniform float uVig;uniform vec2 uRcp;' +
  'float ign(vec2 p){return fract(52.9829189*fract(dot(p,vec2(0.06711056,0.00583715))));}' +
  'vec3 tonemap(vec3 x){x*=1.06;return (x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14);}' +
  'vec3 fxaa(vec2 uv,vec2 rcp){' +
  'vec3 rgbNW=texture2D(uScene,uv+vec2(-1.0,-1.0)*rcp).rgb;' +
  'vec3 rgbNE=texture2D(uScene,uv+vec2(1.0,-1.0)*rcp).rgb;' +
  'vec3 rgbSW=texture2D(uScene,uv+vec2(-1.0,1.0)*rcp).rgb;' +
  'vec3 rgbSE=texture2D(uScene,uv+vec2(1.0,1.0)*rcp).rgb;' +
  'vec3 rgbM=texture2D(uScene,uv).rgb;' +
  'vec3 L=vec3(0.299,0.587,0.114);' +
  'float lNW=dot(rgbNW,L),lNE=dot(rgbNE,L),lSW=dot(rgbSW,L),lSE=dot(rgbSE,L),lM=dot(rgbM,L);' +
  'float lMin=min(lM,min(min(lNW,lNE),min(lSW,lSE)));' +
  'float lMax=max(lM,max(max(lNW,lNE),max(lSW,lSE)));' +
  'if(lMax-lMin<max(0.035,lMax*0.115)) return rgbM;' +
  'vec2 dir=vec2(-((lNW+lNE)-(lSW+lSE)),((lNW+lSW)-(lNE+lSE)));' +
  'float dr=max((lNW+lNE+lSW+lSE)*0.03125,0.0078);' +
  'float rc=1.0/(min(abs(dir.x),abs(dir.y))+dr);' +
  'dir=clamp(dir*rc,vec2(-8.0),vec2(8.0))*rcp;' +
  'vec3 a=0.5*(texture2D(uScene,uv+dir*(1.0/3.0-0.5)).rgb+texture2D(uScene,uv+dir*(2.0/3.0-0.5)).rgb);' +
  'vec3 b=a*0.5+0.25*(texture2D(uScene,uv+dir*-0.5).rgb+texture2D(uScene,uv+dir*0.5).rgb);' +
  'float lB=dot(b,L);' +
  'return (lB<lMin||lB>lMax)?a:b;}' +
  'void main(){' +
  'vec3 c=fxaa(vT,uRcp);' +
  'c+=texture2D(uBloom,vT).rgb*uBloomAmt;' +
  'c+=texture2D(uRays,vT).rgb*uRayAmt;' +
  'c=tonemap(c);' +
  'vec2 q=vT-0.5;float v=1.0-dot(q,q)*uVig;c*=clamp(v,0.0,1.0);' +
  'c+=(ign(gl_FragCoord.xy+vec2(uT*61.0,uT*37.0))-0.5)*uGrain;' +
  'gl_FragColor=vec4(c,1.0);}';

var VS_INST = 'attribute vec3 aPos;attribute vec3 aNrm;attribute vec3 iOff;attribute vec3 iSize;attribute vec3 iCol;attribute vec2 iRot;' +
  'uniform mat4 uMVP;uniform mat4 uLMVP;uniform vec3 uL;uniform vec3 uCam;' +
  'varying vec3 vC;varying float vN;varying vec4 vLP;varying float vR;varying vec3 vWP;varying vec3 vN3;varying vec2 vS;varying vec3 vBake;' +
  'mat3 rot2(vec2 r){float ca=cos(r.x),sa=sin(r.x),cb=cos(r.y),sb=sin(r.y);' +
  'mat3 A=mat3(1.0,0.0,0.0,0.0,ca,-sa,0.0,sa,ca);mat3 B=mat3(cb,0.0,sb,0.0,1.0,0.0,-sb,0.0,cb);return B*A;}' +
  'void main(){mat3 R=rot2(iRot);vec3 p=R*(aPos*iSize)+iOff;vec3 nn=R*aNrm;' +
  'gl_Position=uMVP*vec4(p,1.0);vC=iCol;vS=vec2(0.0,0.0);' +
  'vec3 n2=normalize(nn);vec3 vv2=normalize(p-uCam);if(dot(n2,vv2)>0.0)n2=-n2;' +
  'vN3=n2;vWP=p;vLP=uLMVP*vec4(p,1.0);' +
  'vN=max(dot(n2,normalize(uL)),0.0);' +
  'vR=pow(clamp(1.0+dot(n2,vv2),0.0,1.0),2.4);}';

export const SHADERS = {
  VS_SOLID: VS_SOLID, FS_SOLID: FS_SOLID, VS_MIN: VS_MIN, FS_MIN: FS_MIN,
  FS_SKY_MIN: FS_SKY_MIN, VS_EDGE: VS_EDGE, FS_EDGE: FS_EDGE, VS_FLAT: VS_FLAT,
  FS_FLAT: FS_FLAT, VS_DEPTH: VS_DEPTH, FS_DEPTH: FS_DEPTH,
  VS_DEPTH_INST: VS_DEPTH_INST, VS_TRAIL: VS_TRAIL, FS_TRAIL: FS_TRAIL,
  VS_SKY: VS_SKY, FS_SKY: FS_SKY, VS_QUAD: VS_QUAD, FS_BRIGHT: FS_BRIGHT,
  FS_BLUR: FS_BLUR, FS_RAYS: FS_RAYS, FS_COMP: FS_COMP, VS_INST: VS_INST,
};

// uniformsOf: every `uniform <type> <name>` a shader string declares, the
// name without any array suffix.
export function uniformsOf(text) {
  var names = [];
  var re = /uniform\s+\w+\s+(\w+)/g, m;
  while ((m = re.exec(text))) names.push(m[1]);
  return names;
}

// ---- 12. contracts ----
export const PALETTE_CONTRACT = { "<name>": "3 finite numbers" };

function isVec3(v) {
  return Array.isArray(v) && v.length === 3 && v.every((n) => typeof n === "number" && Number.isFinite(n));
}

export function checkPalette(p) {
  if (typeof p !== "object" || p === null) return ["palette: not an object"];
  var problems = [];
  for (var name in p) {
    if (!isVec3(p[name])) problems.push("palette." + name + ": 3 finite numbers required");
  }
  return problems;
}

export const LAMP_CONTRACT = { x: "finite number", y: "finite number", z: "finite number", r: "finite number", g: "finite number", b: "finite number", rad: "finite number", inten: "finite number" };
const LAMP_FIELDS = ["x", "y", "z", "r", "g", "b", "rad", "inten"];

export function checkLamp(l) {
  if (typeof l !== "object" || l === null) return ["lamp: not an object"];
  var problems = [];
  for (var i = 0; i < LAMP_FIELDS.length; i++) {
    var f = LAMP_FIELDS[i];
    if (typeof l[f] !== "number" || !Number.isFinite(l[f])) problems.push("lamp." + f + ": finite number required");
  }
  return problems;
}
