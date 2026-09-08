// COMBO-ENGINE — presets-test: the presets module's gate. Seven checks
// against the demo's own numbers, standing on physics-pb and rig.
import fs from "node:fs";
import { PRESETS, applyPreset, resolvePreset, checkPreset } from "../src/modules/presets/presets.js";
import { World, m3inv } from "../src/modules/physics-pb/physics.js";
import { assembleMech, groundRig } from "../src/modules/rig/rig.js";

let pass = 0, fail = 0;
const check = (name, ok) => { if (ok) { pass++; console.log("PASS " + name); } else { fail++; console.log("FAIL " + name); } };
const SEED = process.env.SEED ? +process.env.SEED : Math.floor(Math.random() * 1e9);
console.log("seeds " + JSON.stringify({ presets: SEED }));
let a = SEED >>> 0;
const rnd = () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

const LIM_KEYS = ["tension", "shear", "bend", "torsion"];

const buildRig = () => {
  const w = new World({ substeps: 12, iterations: 4, contact: { mu: 1.0 } });
  const rig = assembleMech(w);
  groundRig(rig);
  return rig;
};

function snapshot(rig) {
  const hinges = {};
  for (const [name, j] of Object.entries(rig.joints)) hinges[name] = { tauMax: j.tauMax, kp: j.kp, kd: j.kd, lim: { ...j.lim } };
  const welds = {};
  for (const [name, w] of Object.entries(rig.welds)) welds[name] = { lim: { ...w.lim } };
  const bodies = {};
  for (const [name, b] of Object.entries(rig.bodies)) bodies[name] = { I: [...b.I] };
  return { hinges, welds, bodies };
}

{ // 1. a rolled multiplier scales every hinge, weld and body field exactly, invI included
  let ok = true;
  for (let i = 0; i < 20 && ok; i++) {
    const p = { inertia: 0.2 + rnd() * 1.8, torque: 0.5 + rnd() * 2.5, envelope: 0.3 + rnd() * 2.7 };
    const rig = buildRig();
    const snap = snapshot(rig);
    applyPreset(rig, p);
    for (const name of Object.keys(rig.joints)) {
      const j = rig.joints[name], old = snap.hinges[name];
      if (j.tauMax !== old.tauMax * p.torque) ok = false;
      if (j.kp !== old.kp * p.inertia) ok = false;
      if (j.kd !== old.kd * p.inertia) ok = false;
      for (const k of LIM_KEYS) if (j.lim[k] !== old.lim[k] * p.envelope) ok = false;
    }
    for (const name of Object.keys(rig.welds)) {
      const w = rig.welds[name], old = snap.welds[name];
      for (const k of LIM_KEYS) if (w.lim[k] !== old.lim[k] * p.envelope) ok = false;
    }
    for (const name of Object.keys(rig.bodies)) {
      const b = rig.bodies[name], old = snap.bodies[name];
      for (let e = 0; e < b.I.length; e++) if (b.I[e] !== old.I[e] * p.inertia) ok = false;
      const wantInvI = m3inv(b.I);
      for (let e = 0; e < b.invI.length; e++) if (b.invI[e] !== wantInvI[e]) ok = false;
    }
  }
  check("presets: at a rolled multiplier set every hinge's tauMax, kp, kd, and limits and every body's inertia scale exactly, and invI is the inverse of the scaled inertia", ok);
}

{ // 2. the verified preset changes nothing
  const rig = buildRig();
  const snap = snapshot(rig);
  applyPreset(rig, PRESETS.verified);
  let ok = true;
  for (const name of Object.keys(rig.joints)) {
    const j = rig.joints[name], old = snap.hinges[name];
    if (j.tauMax !== old.tauMax || j.kp !== old.kp || j.kd !== old.kd) ok = false;
    for (const k of LIM_KEYS) if (j.lim[k] !== old.lim[k]) ok = false;
  }
  for (const name of Object.keys(rig.welds)) {
    const w = rig.welds[name], old = snap.welds[name];
    for (const k of LIM_KEYS) if (w.lim[k] !== old.lim[k]) ok = false;
  }
  for (const name of Object.keys(rig.bodies)) {
    const b = rig.bodies[name], old = snap.bodies[name];
    for (let e = 0; e < b.I.length; e++) if (b.I[e] !== old.I[e]) ok = false;
  }
  check("presets: the verified preset changes nothing", ok);
}

{ // 3. every preset names its rule and its consequence; exactly one is the baseline
  const rows = Object.values(PRESETS);
  const consequenceOk = rows.every((p) => typeof p.consequence === "string" && p.consequence.length > 0);
  const ruleOk = rows.every((p) => p.baseline === true || (typeof p.rule === "string" && p.rule.length > 0));
  const baselineCount = rows.filter((p) => p.baseline === true).length;
  check("presets: every preset names its rule and its consequence", consequenceOk && ruleOk && baselineCount === 1);
}

{ // 4. resolvePreset fills the demo's fallbacks and keeps the row's own values
  const lunar = resolvePreset(PRESETS.lunar);
  const narrow = resolvePreset(PRESETS.narrow);
  const heavy = resolvePreset(PRESETS.heavy);
  check("presets: resolvePreset fills the demo's fallbacks and keeps the row's own values",
    lunar.gravity === 3.0 &&
    narrow.gravity === 9.81 && narrow.friction === 1.0 && narrow.copClamp === 0.95 && narrow.swing === 0.90 &&
    heavy.swing === 1.25);
}

{ // 5. twin rigs under one rolled preset agree
  const p = { inertia: 0.2 + rnd() * 1.8, torque: 0.5 + rnd() * 2.5, envelope: 0.3 + rnd() * 2.7 };
  const rigA = buildRig(), rigB = buildRig();
  applyPreset(rigA, p); applyPreset(rigB, p);
  let ok = true;
  for (const name of Object.keys(rigA.joints)) {
    const ja = rigA.joints[name], jb = rigB.joints[name];
    if (ja.tauMax !== jb.tauMax || ja.kp !== jb.kp || ja.kd !== jb.kd) ok = false;
    for (const k of LIM_KEYS) if (ja.lim[k] !== jb.lim[k]) ok = false;
  }
  for (const name of Object.keys(rigA.welds)) {
    const wa = rigA.welds[name], wb = rigB.welds[name];
    for (const k of LIM_KEYS) if (wa.lim[k] !== wb.lim[k]) ok = false;
  }
  for (const name of Object.keys(rigA.bodies)) {
    const ba = rigA.bodies[name], bb = rigB.bodies[name];
    for (let e = 0; e < ba.I.length; e++) { if (ba.I[e] !== bb.I[e]) ok = false; if (ba.invI[e] !== bb.invI[e]) ok = false; }
  }
  check("presets: twin rigs under one rolled preset agree", ok);
}

{ // 6. the contract counts every problem
  const broken = checkPreset({ label: 3, torque: 0, envelope: -1, consequence: "", rule: "" });
  const clean = checkPreset(PRESETS.heavy);
  const notObject = checkPreset(null);
  check("presets: the contract counts every problem", broken.length === 5 && clean.length === 0 && notObject.length === 1);
}

{ // 7. the module imports only from its own folder or a sibling module
  const src = fs.readFileSync(new URL("../src/modules/presets/presets.js", import.meta.url), "utf8");
  const specs = [...src.matchAll(/import[^\n]*from\s*["']([^"']+)["']/g)].map((m) => m[1]);
  const ok = specs.every((s) => /^\.\.\/[a-z0-9-]+\//.test(s) || /^\.\//.test(s));
  check("presets: the module imports only from its own folder or a sibling module", ok);
}

console.log(`presets-test: ${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
console.log("presets-test PASS");
