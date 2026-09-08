// modules/greybox — the greybox part library, lifted from the shooting-range
// demo (holdover-greybox-range-r55-claude-opus-5.html: HUMAN 445, ngon
// 447-454, the thirteen builders 507-724, buildSolids 1202-1217; verbatim
// math).
//
// MODULE: greybox. Box: "The greybox part library: stairs, facades,
// vehicles, figures, at true human scale" (batch-general-1.md, B4). Demo
// lines: 445 (HUMAN), 447-454 (ngon), 507-724 (the thirteen builders),
// 1202-1217 (buildSolids). Substitutions, and only these:
// 1. The builders live inside a factory function builders(HUMAN), the
//    parameter named as the demo's global, so every HUMAN. read in the
//    builders stays verbatim and reads the handed table (partRailing,
//    partStair, partFacade, partDoor, partWall, partBuilding read it; the
//    rest read nothing global). No builder body renames anything;
//    partBuilding's own local var H is the demo's and stays. HUMAN below is
//    the demo's table; the default exports are builders(HUMAN)'s.
// 2. buildSolids(level) is the demo's function verbatim, exported, with
//    makeBox, makeBoxYaw, and makePrism imported from the solids module.
//    It reads no global.
// 3. var stays var; the demo's own function bodies are not restyled.
// 4. Added: HUMAN_CONTRACT, PART_CONTRACT, checkHuman, checkPart.

import { makeBox, makeBoxYaw, makePrism } from "../solids/solids.js";

export const HUMAN = { eye: 1.72, door: 2.05, rail: 1.06, step: 0.175, tread: 0.29, floor: 3.30, sill: 0.95 };

function builders(HUMAN) {
  function ngon(sides, r) {
    var v = [];
    for (var i = 0; i < sides; i++) {
      var a = (i / sides) * Math.PI * 2 + Math.PI / sides;
      v.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
    return v;
  }

  function partColumn(id, x, z, yBase, h, r, p, m, sides) {
    return [{ id: id, kind: 'prism', sides: sides || 10, c: [x, yBase + h / 2, z], s: [r * 2, h, r * 2], p: p, m: m }];
  }

  function partPipe(id, x, z, yBase, h, r, p, m) {
    var out = partColumn(id, x, z, yBase, h, r, p, m, 6);
    out.push({ id: id + 'k1', c: [x, yBase + h * 0.25, z], s: [r * 2.5, 0.09, r * 2.5], p: p, m: m, deco: 1 });
    out.push({ id: id + 'k2', c: [x, yBase + h * 0.72, z], s: [r * 2.5, 0.09, r * 2.5], p: p, m: m, deco: 1 });
    return out;
  }

  function partRailing(id, x0, z0, x1, z1, y, p, m) {
    var out = [], dx = x1 - x0, dz = z1 - z0, len = Math.hypot(dx, dz);
    var n = Math.max(2, Math.round(len / 1.3));
    for (var i = 0; i <= n; i++) {
      var t = i / n;
      out.push({ id: id + 'p' + i, kind: 'prism', sides: 6,
        c: [x0 + dx * t, y + HUMAN.rail / 2, z0 + dz * t], s: [0.06, HUMAN.rail, 0.06], p: p, m: m, deco: 1 });
    }
    var ang = Math.atan2(dz, dx);
    for (var k = 0; k < 2; k++) {
      out.push({ id: id + 'r' + k, c: [(x0 + x1) / 2, y + (k ? HUMAN.rail : HUMAN.rail * 0.52), (z0 + z1) / 2],
        s: [len, 0.055, 0.055], p: p, m: m, ry: -ang, deco: 1 });
    }
    return out;
  }

  function partStair(id, x, z, yBase, steps, width, p, m, dir) {
    var out = [], d = dir === undefined ? -1 : dir;
    for (var i = 0; i < steps; i++) {
      out.push({ id: id + 's' + i,
        c: [x, yBase + HUMAN.step * (i + 0.5), z + d * HUMAN.tread * (i + 0.5)],
        s: [width, HUMAN.step, HUMAN.tread], p: p, m: m });
    }
    return out;
  }

  function partDrum(id, x, z, yBase, p, m, tilt) {
    var out = [{ id: id, kind: 'prism', sides: 12, c: [x, yBase + 0.44, z], s: [0.58, 0.88, 0.58], p: p, m: m }];
    out.push({ id: id + 'b1', kind: 'prism', sides: 12, c: [x, yBase + 0.24, z], s: [0.63, 0.05, 0.63], p: 'oxide', m: m, deco: 1 });
    out.push({ id: id + 'b2', kind: 'prism', sides: 12, c: [x, yBase + 0.64, z], s: [0.63, 0.05, 0.63], p: 'oxide', m: m, deco: 1 });
    if (tilt) out[0].ry = tilt;
    return out;
  }

  // a facade with real floors. `front` is the host wall's front face; detail is
  // anchored to it in millimetres, not floated in front of it.
  function partFacade(id, cx, front, width, floors, p, m, opts) {
    opts = opts || {};
    var out = [], fh = HUMAN.floor;
    var perFloor = opts.perFloor || Math.max(2, Math.round(width / 3.2));
    var wW = opts.winW || 1.55, wH = opts.winH || 1.95;
    var skip0 = opts.skipY0, skip1 = opts.skipY1;
    for (var f = 0; f < floors; f++) {
      var y0 = f * fh;
      out.push({ id: id + 'band' + f, c: [cx, y0 + 0.14, front + 0.012], s: [width + 0.20, 0.28, 0.06],
        p: opts.bandP || 'concreteD', m: m, deco: 1 });
      for (var w = 0; w < perFloor; w++) {
        var wx = cx - width / 2 + width * (w + 0.5) / perFloor;
        var wy = y0 + HUMAN.sill + wH / 2;
        if (skip0 !== undefined && wy + wH / 2 > skip0 && wy - wH / 2 < skip1) continue;
        out.push({ id: id + 'sill' + f + '_' + w, c: [wx, y0 + HUMAN.sill - 0.06, front + 0.030],
          s: [wW + 0.30, 0.12, 0.14], p: 'kerb', m: m, deco: 1 });
        out.push({ id: id + 'rev' + f + '_' + w, c: [wx, wy, front + 0.018],
          s: [wW + 0.22, wH + 0.22, 0.05], p: opts.revP || 'concreteD', m: m, deco: 1 });
        out.push({ id: id + 'win' + f + '_' + w, c: [wx, wy, front + 0.040],
          s: [wW, wH, 0.02], p: (f * perFloor + w) % 7 === 3 ? 'lit' : 'glass', m: m, deco: 1 });
      }
    }
    return out;
  }

  function partDoor(id, x, front, p, m) {
    return [
      { id: id + 'f', c: [x, HUMAN.door / 2, front + 0.015], s: [1.30, HUMAN.door, 0.06], p: 'concreteD', m: m, deco: 1 },
      { id: id + 'd', c: [x, HUMAN.door / 2 - 0.03, front + 0.035], s: [1.06, HUMAN.door - 0.10, 0.03], p: p, m: m, deco: 1 }
    ];
  }

  function partWheel(id, x, y, z, r, w, p, m, side) {
    // the axle is lateral, so the disc lies in XY and the width runs along Z
    var sgn = side === undefined ? 1 : side;
    return [
      { id: id, kind: 'prism', sides: 16, axis: 'z', c: [x, y, z], s: [r * 2, r * 2, w], p: p, m: m },
      { id: id + 'r', kind: 'prism', sides: 12, axis: 'z', c: [x, y, z + sgn * w * 0.34],
        s: [r * 1.05, r * 1.05, w * 0.36], p: 'hub', m: m, deco: 1 }
    ];
  }

  function partCarBody(cx, cy, cz, m) {
    // a hatchback in plan: nose 0, tail 4.3, width 1.80, roof 1.46
    var LEN = 4.30, W = 1.80, t = 0.002;
    var x0 = cx - LEN / 2, x1 = cx + LEN / 2;
    var z0 = cz - W / 2, z1 = cz + W / 2;
    var sill = 0.42, waist = 1.00, roof = 1.46;
    var cabF = cx - 0.30, cabR = cx + 1.05;      // cabin footprint
    var out = [];

    // --- structural shell (shootable, keeps the ids the suites use) ---
    out.push({ id: 'carFloor', c: [cx, sill, cz], s: [LEN, t, W], p: 'steelD', m: m });
    out.push({ id: 'carSideL', c: [x0 + LEN / 2, (sill + waist) / 2, z0 + t], s: [LEN, waist - sill, t], p: 'steel', m: m });
    out.push({ id: 'carSideR', c: [x0 + LEN / 2, (sill + waist) / 2, z1 - t], s: [LEN, waist - sill, t], p: 'steel', m: m });
    out.push({ id: 'carFront', c: [x0 + t, (sill + waist) / 2, cz], s: [t, waist - sill, W], p: 'steel', m: m });
    out.push({ id: 'carRear',  c: [x1 - t, (sill + waist) / 2, cz], s: [t, waist - sill, W], p: 'steel', m: m });
    out.push({ id: 'carRoof',  c: [(cabF + cabR) / 2, roof, cz], s: [cabR - cabF, t, W - 0.20], p: 'steel', m: m });
    out.push({ id: 'carGlass', c: [cabF - 0.02, (waist + roof) / 2 + 0.04, cz], s: [0.02, roof - waist - 0.06, W - 0.30],
      p: 'glass', m: m, brk: 1, stick: 1 });
    out.push({ id: 'carBlock', c: [x0 + 0.72, (sill + waist) / 2 + 0.06, cz], s: [1.05, 0.62, W - 0.36], p: 'steelD', m: m });

    // --- body panels that give it a car silhouette ---
    var S_ = function (id, c, sz, p) { out.push({ id: id, c: c, s: sz, p: p, m: m }); };
    var D = function (id, c, sz, p, extra) {
      var o = { id: id, c: c, s: sz, p: p, m: m, deco: 1 };
      if (extra) for (var k in extra) o[k] = extra[k];
      out.push(o); return o;
    };
    S_('carBonnet', [x0 + 1.05, waist, cz], [2.05, 0.05, W - 0.06], 'steel');
    S_('carScuttle', [cabF - 0.12, waist - 0.02, cz], [0.30, 0.10, W - 0.10], 'steelD');
    S_('carBoot', [cabR + 0.55, waist + 0.10, cz], [1.10, 0.05, W - 0.08], 'steel');
    S_('carNose', [x0 + 0.12, (sill + waist) / 2 + 0.10, cz], [0.24, 0.52, W - 0.16], 'steel');
    S_('carTail', [x1 - 0.10, (sill + waist) / 2 + 0.10, cz], [0.20, 0.52, W - 0.16], 'steel');
    S_('carFlankL', [cx, (sill + waist) / 2, z0 + 0.03], [LEN - 0.30, waist - sill - 0.02, 0.05], 'steel');
    S_('carFlankR', [cx, (sill + waist) / 2, z1 - 0.03], [LEN - 0.30, waist - sill - 0.02, 0.05], 'steel');

    // raked screens as wedges, cabin pillars, side glass
    out.push({ id: 'carWind', kind: 'wedge', c: [cabF - 0.20, (waist + roof) / 2, cz],
      s: [0.44, roof - waist, W - 0.24], p: 'glass', m: m, brk: 1 });
    out.push({ id: 'carHatch', kind: 'wedge', c: [cabR + 0.20, (waist + roof) / 2, cz],
      s: [0.40, roof - waist, W - 0.24], p: 'glass', m: m, brk: 1, ry: Math.PI });
    S_('carGlsL', [(cabF + cabR) / 2, (waist + roof) / 2 + 0.03, z0 + 0.10], [cabR - cabF - 0.20, roof - waist - 0.14, 0.02], 'glass');
    S_('carGlsR', [(cabF + cabR) / 2, (waist + roof) / 2 + 0.03, z1 - 0.10], [cabR - cabF - 0.20, roof - waist - 0.14, 0.02], 'glass');
    S_('carBpA', [cabF, (waist + roof) / 2, z0 + 0.09], [0.07, roof - waist, 0.07], 'steelD');
    S_('carBpB', [cabF, (waist + roof) / 2, z1 - 0.09], [0.07, roof - waist, 0.07], 'steelD');
    S_('carCpA', [cabR, (waist + roof) / 2, z0 + 0.09], [0.08, roof - waist, 0.08], 'steelD');
    S_('carCpB', [cabR, (waist + roof) / 2, z1 - 0.09], [0.08, roof - waist, 0.08], 'steelD');

    // sills, arches, bumpers, lamps
    S_('carSill', [cx, sill - 0.05, cz], [LEN - 0.20, 0.10, W + 0.02], 'tar');
    var arch = [[x0 + 1.02, z0 + 0.02], [x0 + 1.02, z1 - 0.02], [x1 - 0.92, z0 + 0.02], [x1 - 0.92, z1 - 0.02]];
    for (var a = 0; a < 4; a++) D('carArch' + a, [arch[a][0], sill + 0.10, arch[a][1]], [0.86, 0.42, 0.06], 'tar');
    out.push({ id: 'carBmpF', kind: 'prism', sides: 6, axis: 'x', c: [x0 + 0.06, sill + 0.14, cz],
      s: [0.16, 0.24, W - 0.10], p: 'oxide', m: m });
    out.push({ id: 'carBmpR', kind: 'prism', sides: 6, axis: 'x', c: [x1 - 0.06, sill + 0.16, cz],
      s: [0.16, 0.24, W - 0.10], p: 'oxide', m: m });
    S_('carLampL', [x0 + 0.02, waist - 0.16, z0 + 0.34], [0.05, 0.18, 0.34], 'lit');
    S_('carLampR', [x0 + 0.02, waist - 0.16, z1 - 0.34], [0.05, 0.18, 0.34], 'lit');
    S_('carTailL', [x1 - 0.02, waist - 0.12, z0 + 0.30], [0.05, 0.16, 0.28], 'signal');
    S_('carTailR', [x1 - 0.02, waist - 0.12, z1 - 0.30], [0.05, 0.16, 0.28], 'signal');
    D('carMirL', [cabF + 0.08, waist + 0.10, z0 - 0.05], [0.16, 0.09, 0.10], 'steelD');
    D('carMirR', [cabF + 0.08, waist + 0.10, z1 + 0.05], [0.16, 0.09, 0.10], 'steelD');
    return out;
  }

  function partFigure(id, x, yBase, z, p, m) {
    var out = [];
    out.push({ id: id, kind: 'prism', sides: 8, c: [x, yBase + 1.16, z], s: [0.50, 0.78, 0.30], p: p, m: m, stick: 1, tgt: 1 });
    out.push({ id: id + 'h', kind: 'prism', sides: 8, c: [x, yBase + 1.70, z], s: [0.24, 0.28, 0.24], p: 'tgtHead', m: m, stick: 1 });
    out.push({ id: id + 'n', c: [x, yBase + 1.53, z], s: [0.13, 0.10, 0.13], p: 'tgtHead', m: m });
    out.push({ id: id + 'lgL', kind: 'prism', sides: 8, c: [x - 0.13, yBase + 0.39, z], s: [0.19, 0.78, 0.19], p: p, m: m, stick: 1 });
    out.push({ id: id + 'lgR', kind: 'prism', sides: 8, c: [x + 0.13, yBase + 0.39, z], s: [0.19, 0.78, 0.19], p: p, m: m, stick: 1 });
    out.push({ id: id + 'arL', kind: 'prism', sides: 6, c: [x - 0.31, yBase + 1.16, z], s: [0.14, 0.70, 0.14], p: p, m: m, stick: 1 });
    out.push({ id: id + 'arR', kind: 'prism', sides: 6, c: [x + 0.31, yBase + 1.16, z], s: [0.14, 0.70, 0.14], p: p, m: m, stick: 1 });
    out.push({ id: id + 'ft', c: [x, yBase + 0.04, z + 0.04], s: [0.42, 0.08, 0.30], p: 'tar', m: m, deco: 1 });
    return out;
  }

  // A genuinely structural facade: piers between the openings, a spandrel under each
  // window and a lintel over it, and glass in the hole. Everything here is collidable and
  // breakable, so an opening is an opening rather than a picture of one.
  function partWall(id, cx, front, width, floors, m, opts) {
    opts = opts || {};
    var out = [], fh = opts.floorH || HUMAN.floor;
    var per = opts.perFloor || Math.max(2, Math.round(width / 3.2));
    var wW = opts.winW || 1.45, wH = opts.winH || 1.85;
    var t = opts.t || 0.30, sill = opts.sill || HUMAN.sill;
    var p = opts.p || 'concrete', pd = opts.pD || 'concreteD';
    var x0 = cx - width / 2;
    var bay = width / per;
    var cz = front - t / 2;
    var S = function (sid, c, sz, pp, extra) {
      var o = { id: id + sid, c: c, s: sz, p: pp, m: m, structural: 1 };
      if (extra) for (var k in extra) o[k] = extra[k];
      out.push(o); return o;
    };
    for (var f = 0; f < floors; f++) {
      var y0 = f * fh;
      var wy0 = y0 + sill, wy1 = wy0 + wH;
      // spandrel below the openings, lintel above, both full width
      S('sp' + f, [cx, (y0 + wy0) / 2, cz], [width, wy0 - y0, t], p);
      S('li' + f, [cx, (wy1 + y0 + fh) / 2, cz], [width, y0 + fh - wy1, t], p);
      for (var w = 0; w < per; w++) {
        var bx = x0 + bay * w;
        // pier to the left of this opening; the last bay also closes the right end
        var pw = bay - wW;
        S('pr' + f + '_' + w, [bx + pw / 2, (wy0 + wy1) / 2, cz], [pw, wH, t], p);
        var wx = bx + pw + wW / 2;
        S('gl' + f + '_' + w, [wx, (wy0 + wy1) / 2, front - 0.02],
          [wW, wH, 0.008], 'glass', { brk: 1, stick: 1, m: opts.glassM });
        S('rv' + f + '_' + w, [wx, (wy0 + wy1) / 2, cz - t * 0.30], [wW, wH, t * 0.40], pd);
      }
    }
    S('cap', [cx, floors * fh + 0.16, cz], [width + 0.24, 0.32, t + 0.16], pd);
    return out;
  }

  function partBuilding(id, cx, cz, width, depth, floors, m, opts) {
    opts = opts || {};
    var out = [], fh = (opts.floorH || HUMAN.floor), t = opts.t || 0.30;
    var front = cz + depth / 2;
    out = out.concat(partWall(id, cx, front, width, floors, m, opts));
    var H = floors * fh;
    out.push({ id: id + 'sideL', c: [cx - width / 2 + t / 2, H / 2, cz], s: [t, H, depth], p: opts.p || 'concrete', m: m, structural: 1 });
    out.push({ id: id + 'sideR', c: [cx + width / 2 - t / 2, H / 2, cz], s: [t, H, depth], p: opts.p || 'concrete', m: m, structural: 1 });
    out.push({ id: id + 'back', c: [cx, H / 2, cz - depth / 2 + t / 2], s: [width, H, t], p: opts.pD || 'concreteD', m: m, structural: 1 });
    for (var f = 1; f <= floors; f++)
      out.push({ id: id + 'flr' + f, c: [cx, f * fh - 0.09, cz], s: [width - t * 2, 0.18, depth - t * 2], p: opts.pD || 'concreteD', m: m, structural: 1 });
    return out;
  }

  return { ngon, partColumn, partPipe, partRailing, partStair, partDrum, partFacade, partDoor, partWheel, partCarBody, partFigure, partWall, partBuilding };
}

export const { ngon, partColumn, partPipe, partRailing, partStair, partDrum, partFacade, partDoor, partWheel, partCarBody, partFigure, partWall, partBuilding } = builders(HUMAN);

export function makeGreybox(opts) {
  return builders({ ...HUMAN, ...(opts && opts.human) });
}

export function buildSolids(level) {
  var out = [], map = [];
  for (var i = 0; i < level.length; i++) {
    var pr = level[i];
    if (pr.dead || pr.ghost || pr.voxed || pr.deco) continue;
    var c = pr.cc || pr.c;
    var bx;
    if (pr.kind === 'prism') bx = makePrism(c[0], c[1], c[2], pr.s[0], pr.s[1], pr.s[2], pr.m, pr.sides || 8, pr.axis || 'y');
    else if (pr.ry) bx = makeBoxYaw(c[0], c[1], c[2], pr.s[0], pr.s[1], pr.s[2], pr.m, pr.ry);
    else bx = makeBox(c[0], c[1], c[2], pr.s[0], pr.s[1], pr.s[2], pr.m);
    bx.prim = pr;
    out.push(bx);
    map.push(i);
  }
  return { solids: out, map: map };
}

export const HUMAN_CONTRACT = {
  eye: "number > 0",
  door: "number > 0",
  rail: "number > 0",
  step: "number > 0",
  tread: "number > 0",
  floor: "number > 0",
  sill: "number > 0",
};

export const PART_CONTRACT = {
  id: "string",
  c: "3 finite numbers (centre); required unless cc is present and valid",
  cc: "3 finite numbers (centre override); optional",
  s: "3 finite numbers (size)",
  p: "string; optional",
  m: "integer",
};

const isVec3 = (v) => Array.isArray(v) && v.length === 3 && v.every((n) => typeof n === "number" && Number.isFinite(n));

const HUMAN_FIELDS = ["eye", "door", "rail", "step", "tread", "floor", "sill"];

// checkHuman: every problem with a human-scale table, in one pass (HUMAN_CONTRACT).
export function checkHuman(h) {
  if (typeof h !== "object" || h === null) return ["human: not an object"];
  const problems = [];
  for (const name of HUMAN_FIELDS) {
    const v = h[name];
    if (!(typeof v === "number" && Number.isFinite(v) && v > 0)) {
      problems.push(`human.${name}: number > 0 required`);
    }
  }
  return problems;
}

// checkPart: every problem with a part descriptor, in one pass (PART_CONTRACT).
export function checkPart(pr) {
  if (typeof pr !== "object" || pr === null) return ["part: not an object"];
  const problems = [];
  if (typeof pr.id !== "string") problems.push("part.id: string required");
  if (pr.cc !== undefined) {
    if (!isVec3(pr.cc)) problems.push("part.cc: 3 finite numbers required");
  } else if (!isVec3(pr.c)) {
    problems.push("part.c: 3 finite numbers required");
  }
  if (!isVec3(pr.s)) problems.push("part.s: 3 finite numbers required");
  if (pr.p !== undefined && typeof pr.p !== "string") problems.push("part.p: string required");
  if (!Number.isInteger(pr.m)) problems.push("part.m: integer required");
  return problems;
}
