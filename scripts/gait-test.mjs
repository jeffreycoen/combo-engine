// COMBO-ENGINE — gait-test: the gait module's gate. Ten checks against the
// law carried from the mech demo, standing on legik, physics-pb, and rig.
// Every check is a single call or a closed-form comparison: no walking, no
// stepping of the world beyond what a check names.
import {
  Posture, groundTruthState, BalanceController, DCMPlan, COMTracker, buildPhases,
  GaitController, makeGait, ANKLE_PIVOT, checkGaitDials, checkBalanceDials,
} from "../src/modules/gait/gait.js";
import { legIK } from "../src/modules/legik/legik.js";
import { V, vadd, vsub, World } from "../src/modules/physics-pb/physics.js";
import { assembleMech, groundRig, rigStats } from "../src/modules/rig/rig.js";
import fs from "node:fs";

let pass = 0, fail = 0;
const check = (name, ok) => { if (ok) { pass++; console.log("PASS " + name); } else { fail++; console.log("FAIL " + name); } };
const SEED = process.env.SEED ? +process.env.SEED : Math.floor(Math.random() * 1e9);
console.log("seeds " + JSON.stringify({ gait: SEED }));
let a = SEED >>> 0;
const rnd = () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

const build = () => { const w = new World({ substeps: 12, iterations: 4, contact: { mu: 1.0 } }); const rig = assembleMech(w); groundRig(rig); return { w, rig }; };

// a rolled buildPhases opts set in the ranges the module's own checks use
const rolledPhaseOpts = () => ({
  left: V(rnd() * 2 - 1, 0, rnd() * 2 - 1),
  right: V(rnd() * 2 - 1, 0, rnd() * 2 - 1),
  stride: V(rnd() * 0.6 - 0.3, 0, rnd() * 0.2 - 0.1),
  nSteps: 1 + Math.floor(rnd() * 8),
  tDS: 0.1 + rnd() * 2.9, tSS: 0.1 + rnd() * 2.9, tStart: 0.1 + rnd() * 2.9, tEnd: 0.1 + rnd() * 2.9,
});

// 1. Posture.apply writes each leg's five hinge targets equal to legIK's angles
{
  const { rig } = build();
  const posture = new Posture(rig);
  const pelvis = V(rnd() * 0.4 - 0.2, rig.bodies.pelvis.x.y, rnd() * 0.4 - 0.2);
  const feet = {};
  for (const s of ['L', 'R']) {
    const ankle = rig.bodies[`foot${s}`].toWorld(ANKLE_PIVOT);
    feet[s] = V(ankle.x + (rnd() * 0.3 - 0.15), ankle.y, ankle.z + (rnd() * 0.3 - 0.15));
  }
  posture.apply(pelvis, feet);
  const J = rig.joints;
  let ok = true;
  for (const s of ['L', 'R']) {
    const hipWorld = vadd(pelvis, posture.hip[s]);
    const d = vsub(feet[s], hipWorld);
    const q = legIK(d);
    if (J[`hipYoke${s}`].target !== q.hipRoll) ok = false;
    if (J[`thigh${s}`].target !== q.hipPitch) ok = false;
    if (J[`shin${s}`].target !== q.knee) ok = false;
    if (J[`ankleYoke${s}`].target !== q.anklePitch) ok = false;
    if (J[`foot${s}`].target !== q.ankleRoll) ok = false;
  }
  check("gait: Posture.apply writes each leg's five hinge targets equal to legIK's angles at a rolled pelvis and feet", ok);
}

// 2. BalanceController.update on a synthetic support state; airborne writes nothing
{
  const { rig } = build();
  const balance = new BalanceController(rig);
  const stats = rigStats(rig);
  const M = stats.mass;
  const ankleL = rig.bodies.footL.toWorld(ANKLE_PIVOT);
  const ankleR = rig.bodies.footR.toWorld(ANKLE_PIVOT);
  const mL = 1 + rnd() * 2, mR = 1 + rnd() * 2;
  const FL = mL * 0.02 * M * 9.81, FR = mR * 0.02 * M * 9.81;
  const copL = V(ankleL.x + 0.1 * (rnd() * 2 - 1), ankleL.y, ankleL.z + 0.1 * (rnd() * 2 - 1));
  const copR = V(ankleR.x + 0.1 * (rnd() * 2 - 1), ankleR.y, ankleR.z + 0.1 * (rnd() * 2 - 1));
  const support = V((ankleL.x + ankleR.x) / 2, 0, (ankleL.z + ankleR.z) / 2);
  const comVel = V(rnd() * 0.2 - 0.1, 0, rnd() * 0.2 - 0.1);
  const pitch = rnd() * 0.1 - 0.05, roll = rnd() * 0.1 - 0.05;
  const st = {
    mass: M, com: stats.com, comVel,
    feet: {
      L: { force: FL, cop: copL, contact: true, ankle: ankleL },
      R: { force: FR, cop: copR, contact: true, ankle: ankleR },
    },
    support,
    lean: { pitch, roll },
    torsoRate: V(),
    totalContactForce: FL + FR,
  };
  balance.update(st, 1 / 60);
  const J = rig.joints, k = balance.k;
  let ok = true;
  const boundOk = (tauFF, F, limit, tauMax) => Math.abs(tauFF) <= k.kCop * F * 2 * limit + 1e-9 && Math.abs(tauFF) <= tauMax + 1e-9;
  if (!boundOk(J.ankleYokeL.tauFF, FL, k.copLimitX, J.ankleYokeL.tauMax)) ok = false;
  if (!boundOk(J.ankleYokeR.tauFF, FR, k.copLimitX, J.ankleYokeR.tauMax)) ok = false;
  if (!boundOk(J.footL.tauFF, FL, k.copLimitZ, J.footL.tauMax)) ok = false;
  if (!boundOk(J.footR.tauFF, FR, k.copLimitZ, J.footR.tauMax)) ok = false;
  const pitchRate = -st.torsoRate.z, rollRate = -st.torsoRate.x;
  const hipPitchTrim = clamp(k.signHip * (k.hipKp * pitch + k.hipKd * pitchRate), -k.hipTrimLimit, k.hipTrimLimit);
  const hipRollTrim = clamp(k.signHip * (k.hipKp * roll + k.hipKd * rollRate), -k.hipTrimLimit, k.hipTrimLimit);
  for (const s of ['L', 'R']) {
    if (J[`thigh${s}`].target !== balance.stance.hip + hipPitchTrim) ok = false;
    if (J[`hipYoke${s}`].target !== hipRollTrim) ok = false;
    if (J[`shin${s}`].target !== balance.stance.knee) ok = false;
  }
  const { rig: rig2 } = build();
  const balance2 = new BalanceController(rig2);
  const before = {};
  for (const [name, j] of Object.entries(rig2.joints)) before[name] = { target: j.target, tauFF: j.tauFF };
  const st2 = Object.assign({}, st, { support: null });
  balance2.update(st2, 1 / 60);
  for (const [name, j] of Object.entries(rig2.joints)) {
    if (j.target !== before[name].target || j.tauFF !== before[name].tauFF) ok = false;
  }
  check("gait: BalanceController.update on a synthetic support state writes every feed-forward torque inside the law's bound and the stance targets, and airborne writes nothing", ok);
}

// 3. buildPhases at rolled dials yields the stated count, durations, and kinds
{
  let ok = true;
  for (let i = 0; i < 100 && ok; i++) {
    const opts = rolledPhaseOpts();
    const phases = buildPhases(opts);
    if (phases.length !== 2 * opts.nSteps + 3) { ok = false; break; }
    const sumDur = phases.reduce((s, p) => s + p.duration, 0);
    const wantSum = opts.tStart + opts.nSteps * (opts.tDS + opts.tSS) + opts.tDS + opts.tEnd;
    if (Math.abs(sumDur - wantSum) > 1e-9) { ok = false; break; }
    if (phases[0].kind !== 'DS') { ok = false; break; }
    if (phases[phases.length - 1].kind !== 'DS') { ok = false; break; }
    if (phases[phases.length - 2].kind !== 'DS') { ok = false; break; }
    let side = 'L';
    for (let s = 0; s < opts.nSteps; s++) {
      const stance = side === 'L' ? 'R' : 'L';
      const dsPhase = phases[1 + 2 * s], ssPhase = phases[2 + 2 * s];
      if (dsPhase.kind !== `DS->${stance}`) ok = false;
      if (ssPhase.kind !== `SS-${stance}`) ok = false;
      side = side === 'L' ? 'R' : 'L';
    }
  }
  check("gait: buildPhases at rolled dials yields the stated count, durations, and kinds", ok);
}

// 4. the plan's divergent motion is continuous at every phase boundary and ends at the final zmp
{
  let ok = true;
  for (let i = 0; i < 50 && ok; i++) {
    const opts = rolledPhaseOpts();
    const phases = buildPhases(opts);
    const zCom = 1 + rnd() * 3, g = 5 + rnd() * 10;
    const plan = new DCMPlan(phases, zCom, g);
    for (let b = 1; b < plan.t0.length; b++) {
      const tb = plan.t0[b];
      const before = plan.xiAt(tb - 1e-7);
      const at = plan.xiAt(tb);
      if (Math.abs(before.x - at.x) > 1e-6 || Math.abs(before.z - at.z) > 1e-6) { ok = false; break; }
    }
    const end = plan.xiAt(plan.T);
    const zmpB = phases[phases.length - 1].zmpB;
    if (Math.abs(end.x - zmpB.x) > 1e-9 || Math.abs(end.z - zmpB.z) > 1e-9) ok = false;
  }
  check("gait: the plan's divergent motion is continuous at every phase boundary and ends at the final zmp", ok);
}

// 5. one tracker step moves the com by omega times the gap times dt exactly
{
  const opts = rolledPhaseOpts();
  const phases = buildPhases(opts);
  const zCom = 1 + rnd() * 3, g = 5 + rnd() * 10;
  const plan = new DCMPlan(phases, zCom, g);
  const x0 = V(rnd() * 2 - 1, 0, rnd() * 2 - 1);
  const tracker = new COMTracker(plan, x0);
  const t = rnd() * plan.T, dt = 0.001 + rnd() * 0.019;
  const oldX = { x: tracker.x.x, z: tracker.x.z };
  const xiBefore = plan.xiAt(t);
  const result = tracker.step(t, dt);
  const w = plan.omega;
  const wantX = oldX.x + (w * (xiBefore.x - oldX.x)) * dt;
  const wantZ = oldX.z + (w * (xiBefore.z - oldX.z)) * dt;
  const xiCheck = plan.xiAt(t);
  const ok = tracker.x.x === wantX && tracker.x.z === wantZ &&
             result.xi.x === xiCheck.x && result.xi.y === xiCheck.y && result.xi.z === xiCheck.z;
  check("gait: one tracker step moves the com by omega times the gap times dt exactly", ok);
}

// 6. buildPlan at a rolled stride spaces the planned prints by the stride and keeps lateral separation
{
  const { rig } = build();
  const s = 0.1 + rnd() * 0.4;
  const gc = makeGait(rig, { stride: s });
  const st = groundTruthState(rig);
  gc.init(st);
  gc.buildPlan(st);
  const sv = gc.strideVec();
  const ssBySide = { L: [], R: [] };
  for (const p of gc.plan.phases) {
    if (p.kind === 'SS-L') ssBySide.L.push(p.zmpA);
    else if (p.kind === 'SS-R') ssBySide.R.push(p.zmpA);
  }
  let ok = true;
  for (const side of ['L', 'R']) {
    const pts = ssBySide[side];
    for (let i = 1; i < pts.length; i++) {
      if (Math.abs((pts[i].x - pts[i - 1].x) - sv.x) > 1e-9) ok = false;
      if (Math.abs((pts[i].z - pts[i - 1].z) - sv.z) > 1e-9) ok = false;
    }
  }
  if (ssBySide.L.length && ssBySide.R.length) {
    const plantSep = gc.plant.L.z - gc.plant.R.z;
    const latSep = ssBySide.L[0].z - ssBySide.R[0].z;
    if (Math.abs(latSep - plantSep) > 1e-9) ok = false;
    if (Math.abs(latSep) < gc.k.minFootSep) ok = false;
  } else ok = false;
  check("gait: buildPlan at a rolled stride spaces the planned prints by the stride and keeps the rig's own lateral separation", ok);
}

// 7. twin controllers on twin rigs agree after one update
{
  const { rig: rigA } = build();
  const { rig: rigB } = build();
  const stride = 0.1 + rnd() * 0.4, tSS = 0.1 + rnd() * 2.9, tDS = 0.1 + rnd() * 2.9;
  const cfg = { stride, tSS, tDS };
  const gcA = makeGait(rigA, cfg), gcB = makeGait(rigB, cfg);
  const stA = groundTruthState(rigA), stB = groundTruthState(rigB);
  const dt = 0.001 + rnd() * 0.019;
  gcA.update(stA, dt);
  gcB.update(stB, dt);
  let ok = true;
  const namesA = Object.keys(rigA.joints), namesB = Object.keys(rigB.joints);
  if (namesA.length !== namesB.length) ok = false;
  for (const name of namesA) {
    const jA = rigA.joints[name], jB = rigB.joints[name];
    if (!jB || jA.target !== jB.target || jA.tauFF !== jB.tauFF) ok = false;
  }
  if (JSON.stringify(gcA.debug) !== JSON.stringify(gcB.debug)) ok = false;
  check("gait: twin controllers on twin rigs agree after one update", ok);
}

// 8. the slew limiter moves the command by at most the rate times dt toward the want
{
  const { rig } = build();
  const gc = makeGait(rig);
  gc.want.stride = rnd() * 1.0;
  gc.want.heading = (rnd() * 2 - 1) * (Math.PI / 2);
  const dt = 0.001 + rnd() * 0.049;
  const cmdStride0 = gc.cmd.stride, cmdHeading0 = gc.cmd.heading;
  const ds = gc.k.strideRate * dt, dh = gc.k.turnRate * dt;
  const es = gc.want.stride - cmdStride0, eh = gc.want.heading - cmdHeading0;
  const wantStride = cmdStride0 + Math.max(-ds, Math.min(ds, es));
  const wantHeading = cmdHeading0 + Math.max(-dh, Math.min(dh, eh));
  gc.slew(dt);
  const ok = gc.cmd.stride === wantStride && gc.cmd.heading === wantHeading;
  check("gait: the slew limiter moves the command by at most the rate times dt toward the want", ok);
}

// 9. the contracts count every problem
{
  const { rig } = build();
  const broken = checkGaitDials({ stride: "x", enabled: 3 });
  const clean = checkGaitDials(new GaitController(rig).k);
  const b1 = checkBalanceDials({ kCop: "k", comHeightTarget: null });
  const b2 = checkBalanceDials(null);
  check("gait: the contracts count every problem",
    broken.length === 2 && clean.length === 0 && b1.length === 1 && b2.length === 1);
}

// 10. the module imports only from its own folder or a sibling module
{
  const src = fs.readFileSync(new URL("../src/modules/gait/gait.js", import.meta.url), "utf8");
  const specs = [...src.matchAll(/import[^\n]*from\s*["']([^"']+)["']/g)].map((m) => m[1]);
  const ok = specs.every((s) => /^\.\.\/[a-z0-9-]+\//.test(s) || /^\.\//.test(s));
  check("gait: the module imports only from its own folder or a sibling module", ok);
}

console.log(`gait-test: ${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
console.log("gait-test PASS");
