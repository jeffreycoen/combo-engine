// COMBO-ENGINE — rig-test: the rig module's gate. Nine checks against the
// demo's own numbers, standing on the physics-pb module. The first nine are
// seedless — assembly and the solver contain no randomness. Five more for
// the second pass: the chain as data, a rolled spec, twin identity, the
// spec contract, the import law.
import { MECH_SPEC, sideChain, buildLinkTable, assembleMech, groundRig, comAnkleOffset, rigStats, checkRigSpec } from "../src/modules/rig/rig.js";
import { World } from "../src/modules/physics-pb/physics.js";
import fs from "node:fs";

let pass = 0, fail = 0;
const check = (name, ok) => { if (ok) { pass++; console.log("PASS " + name); } else { fail++; console.log("FAIL " + name); } };
const SEED = process.env.SEED ? +process.env.SEED : Math.floor(Math.random() * 1e9);
console.log("seeds " + JSON.stringify({ rig: SEED }));
let a = SEED >>> 0;
const rnd = () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

const build = () => { const w = new World({ substeps: 12, iterations: 4, contact: { mu: 1.0 } }); const rig = assembleMech(w); groundRig(rig); return { w, rig }; };

check("the table names 17 links: 3 core + 7 per side",
  Object.keys(buildLinkTable(MECH_SPEC)).length === 17);
{ const { w, rig } = build(); const s = rigStats(rig);
  check("the assembled MK1 weighs exactly 8140 kg — the demo's own title chip", s.mass === 8140);
  check("17 bodies, 14 hinges, 2 welds, 2 collision pairs",
    Object.keys(rig.bodies).length === 17 && Object.keys(rig.joints).length === 14 &&
    Object.keys(rig.welds).length === 2 && w.pairs.length === 2);
  check("groundRig puts the lowest point exactly on the ground", s.bottom === 0);
  check("the crouched stance stands 4.91 m tall (within 5 mm of the measured 4.9137)",
    Math.abs(s.height - 4.9137) < 0.005);
  check("the balance debt is small by construction: |com-to-ankle| under 1 mm",
    Math.abs(comAnkleOffset(rig).x) < 0.001);
  for (let i = 0; i < 120; i++) w.step(1 / 60);
  check("it STANDS: one second under gravity, zero breaks, pelvis at 3.515 m within 5 mm",
    w.breakEvents.length === 0 && Math.abs(rig.bodies.pelvis.x.y - 3.5151) < 0.005);
  const { w: w2, rig: rig2 } = build();
  for (let i = 0; i < 120; i++) w2.step(1 / 60);
  check("the stand is bit-deterministic across two worlds",
    rig2.bodies.pelvis.x.y === rig.bodies.pelvis.x.y); }
check("design-sweep overrides land: footWidth 0.55 and hipOffset 0.42 reach the built table",
  (() => { const w3 = new World({}); const r3 = assembleMech(w3, { footWidth: 0.55, hipOffset: 0.42 });
    return r3.bodies.footL.dim.z === 0.55 && Math.abs(r3.table.hipYokeL.jp[2]) === 0.42; })());

// 10. the chain as data rebuilds the demo's seven rows exactly
{
  const D = Math.PI / 180;
  const demoRows = (side, s) => [
    { name: `upperArm${side}`, parent: 'torso', mass: 350, dim: [0.42, 0.95, 0.42],
      type: 'hinge', axis: [0, 0, 1], angle0: 4 * D, jp: [0, 0.12, 1.025 * s], jc: [0, 0.475, 0],
      tauMax: 12e3, range: [-150 * D, 60 * D],
      lim: { tension: 220e3, shear: 180e3, bend: 95e3, torsion: 25e3 } },
    { name: `foreArm${side}`, parent: `upperArm${side}`, mass: 200, dim: [0.36, 0.80, 0.36],
      type: 'hinge', axis: [0, 0, 1], angle0: -8 * D, jp: [0, -0.475, 0], jc: [0, 0.40, 0],
      tauMax: 6e3, range: [-140 * D, 0],
      lim: { tension: 180e3, shear: 150e3, bend: 70e3, torsion: 15e3 } },
    { name: `hipYoke${side}`, parent: 'pelvis', mass: 120, dim: [0.40, 0.34, 0.40],
      type: 'hinge', axis: [1, 0, 0], angle0: 0, jp: [0, -0.31, 0.60 * s], jc: [0, 0, 0],
      tauMax: 70e3, range: [-35 * D, 35 * D],
      lim: { tension: 420e3, shear: 340e3, bend: 210e3, torsion: 95e3 } },
    { name: `thigh${side}`, parent: `hipYoke${side}`, mass: 450, dim: [0.50, 1.50, 0.50],
      type: 'hinge', axis: [0, 0, 1], angle0: -9 * D, jp: [0, 0, 0], jc: [0, 0.75, 0],
      tauMax: 95e3, range: [-45 * D, 110 * D],
      lim: { tension: 420e3, shear: 340e3, bend: 210e3, torsion: 130e3 } },
    { name: `shin${side}`, parent: `thigh${side}`, mass: 300, dim: [0.42, 1.45, 0.42],
      type: 'hinge', axis: [0, 0, 1], angle0: 18 * D, jp: [0, -0.75, 0], jc: [0, 0.725, 0],
      tauMax: 95e3, range: [0, 130 * D],
      lim: { tension: 380e3, shear: 300e3, bend: 180e3, torsion: 130e3 } },
    { name: `ankleYoke${side}`, parent: `shin${side}`, mass: 90, dim: [0.34, 0.30, 0.34],
      type: 'hinge', axis: [0, 0, 1], angle0: -9 * D, jp: [0, -0.725, 0], jc: [0, 0, 0],
      tauMax: 40e3, range: [-40 * D, 30 * D],
      lim: { tension: 350e3, shear: 280e3, bend: 150e3, torsion: 55e3 } },
    { name: `foot${side}`, parent: `ankleYoke${side}`, mass: 400, dim: [0.95, 0.30, 1.10],
      type: 'hinge', axis: [1, 0, 0], angle0: 0, jp: [0, 0, 0], jc: [-0.10, 0.15, 0],
      tauMax: 28e3, range: [-25 * D, 25 * D],
      lim: { tension: 350e3, shear: 280e3, bend: 150e3, torsion: 40e3 } },
  ];
  let ok = true;
  for (const [side, s] of [['L', 1], ['R', -1]]) {
    const got = sideChain(s, side);
    const want = demoRows(side, s);
    if (got.length !== want.length) ok = false;
    for (let i = 0; i < want.length && ok; i++) if (JSON.stringify(got[i]) !== JSON.stringify(want[i])) ok = false;
  }
  check("rig: the chain as data rebuilds the demo's seven rows exactly", ok);
}

// 11. a rolled spec with renamed links and the demo's dimensions assembles with the same body count and total mass as the default
{
  const prefix = "p" + Math.floor(rnd() * 1e4);
  const baseNames = new Set(MECH_SPEC.limbChain.map((row) => row.name));
  const renameLink = (name) => baseNames.has(name) ? prefix + name : name;
  const rolledSpec = {
    ...MECH_SPEC,
    limbChain: MECH_SPEC.limbChain.map((row) => ({ ...row, name: prefix + row.name, parent: renameLink(row.parent) })),
  };
  const footLinks = ['footL', 'footR'].map((n) => prefix + n);
  const hipLinks = ['hipYokeL', 'hipYokeR'].map((n) => prefix + n);
  const pairs = [[prefix + 'footL', prefix + 'footR', 0.04], [prefix + 'shinL', prefix + 'shinR', 0.02]];
  const w = new World({});
  const rig = assembleMech(w, { spec: rolledSpec, footLinks, hipLinks, pairs });
  const stats = rigStats(rig);
  check("rig: a rolled spec with renamed links and the demo's dimensions assembles with the same body count and total mass as the default",
    Object.keys(rig.bodies).length === 17 && stats.mass === 8140 &&
    Object.keys(rig.joints).length === 14 && Object.keys(rig.welds).length === 2 && w.pairs.length === 2);
}

// 12. twin assembly identity at the default
{
  const w1 = new World({}); const rig1 = assembleMech(w1);
  const w2 = new World({}); const rig2 = assembleMech(w2);
  const names1 = Object.keys(rig1.bodies), names2 = Object.keys(rig2.bodies);
  let ok = names1.length === names2.length;
  for (let i = 0; i < names1.length && ok; i++) {
    if (names1[i] !== names2[i]) ok = false;
    const b1 = rig1.bodies[names1[i]], b2 = rig2.bodies[names2[i]];
    if (!(b1.x.x === b2.x.x && b1.x.y === b2.x.y && b1.x.z === b2.x.z)) ok = false;
  }
  check("rig: twin assembly identity at the default", ok);
}

// 13. the contract counts every problem
{
  const broken = checkRigSpec({ root: "nope", links: { a: { mass: 0, dim: [1] } }, limbs: [], limbChain: [{ name: 3 }] });
  const clean = checkRigSpec(MECH_SPEC);
  const notObject = checkRigSpec(null);
  check("rig: the contract counts every problem", broken.length === 10 && clean.length === 0 && notObject.length === 1);
}

// 14. the module imports only from its own folder or a sibling module
{
  const src = fs.readFileSync(new URL("../src/modules/rig/rig.js", import.meta.url), "utf8");
  const specs = [...src.matchAll(/import[^\n]*from\s*["']([^"']+)["']/g)].map((m) => m[1]);
  const ok = specs.every((s) => /^\.\.\/[a-z0-9-]+\//.test(s) || /^\.\//.test(s));
  check("rig: the module imports only from its own folder or a sibling module", ok);
}

// 15. scale 1 assembles the landed rig exactly
{
  const w1 = new World({}); const rig1 = assembleMech(w1, { scale: 1 });
  const w2 = new World({}); const rig2 = assembleMech(w2, {});
  const s1 = rigStats(rig1), s2 = rigStats(rig2);
  let ok = s1.mass === s2.mass && s1.height === s2.height && s1.top === s2.top && s1.bottom === s2.bottom &&
           s1.com.x === s2.com.x && s1.com.y === s2.com.y && s1.com.z === s2.com.z;
  for (const name of Object.keys(rig1.bodies)) {
    const b1 = rig1.bodies[name], b2 = rig2.bodies[name];
    if (!(b1.mass === b2.mass && b1.dim.x === b2.dim.x && b1.dim.y === b2.dim.y && b1.dim.z === b2.dim.z)) ok = false;
  }
  for (const name of Object.keys(rig1.joints)) {
    const j1 = rig1.joints[name], j2 = rig2.joints[name];
    if (!(j1.tauMax === j2.tauMax && j1.kp === j2.kp && j1.kd === j2.kd &&
          j1.lim.tension === j2.lim.tension && j1.lim.shear === j2.lim.shear &&
          j1.lim.bend === j2.lim.bend && j1.lim.torsion === j2.lim.torsion)) ok = false;
  }
  check("rig: scale 1 assembles the landed rig exactly", ok);
}

// 16. at a rolled scale every quantity scales by its power
{
  const relOk = (a, b, tol) => Math.abs(a - b) <= tol * Math.abs(b);
  let ok = true;
  for (let i = 0; i < 20 && ok; i++) {
    const s = 0.3 + rnd() * 1.2;
    const w1 = new World({}); const rig1 = assembleMech(w1, {});
    const ws = new World({}); const rigs = assembleMech(ws, { scale: s });
    for (const name of Object.keys(rig1.bodies)) {
      const b1 = rig1.bodies[name], bs = rigs.bodies[name];
      if (!relOk(bs.dim.x, b1.dim.x * s, 1e-9) || !relOk(bs.dim.y, b1.dim.y * s, 1e-9) || !relOk(bs.dim.z, b1.dim.z * s, 1e-9)) ok = false;
      if (!relOk(bs.mass, b1.mass * s ** 3, 1e-9)) ok = false;
    }
    for (const name of Object.keys(rig1.joints)) {
      const j1 = rig1.joints[name], js = rigs.joints[name];
      if (!relOk(js.tauMax, j1.tauMax * s ** 4, 1e-9)) ok = false;
      if (!relOk(js.kp, j1.kp * s ** 4, 1e-9)) ok = false;
      if (!relOk(js.kd, j1.kd * s ** 4, 1e-9)) ok = false;
      if (!relOk(js.lim.tension, j1.lim.tension * s ** 2, 1e-9)) ok = false;
      if (!relOk(js.lim.shear, j1.lim.shear * s ** 2, 1e-9)) ok = false;
      if (!relOk(js.lim.bend, j1.lim.bend * s ** 3, 1e-9)) ok = false;
      if (!relOk(js.lim.torsion, j1.lim.torsion * s ** 3, 1e-9)) ok = false;
    }
    const stats1 = rigStats(rig1), statss = rigStats(rigs);
    const mass1 = Object.values(rig1.bodies).reduce((a, b) => a + b.mass, 0);
    const masss = Object.values(rigs.bodies).reduce((a, b) => a + b.mass, 0);
    if (!relOk(masss, mass1 * s ** 3, 1e-9)) ok = false;
    if (!relOk(statss.height, stats1.height * s, 1e-6)) ok = false;
  }
  check("rig: at a rolled scale every quantity scales by its power", ok);
}

console.log(`rig-test: ${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
console.log("rig-test PASS");
