// MODULE: gait — the balance controller and the walking planner, lifted
// SHAPED from the mech demo, lines 1065 to 1658 (posture 1065 to 1112,
// balance 1114 to 1272, the divergent-motion plan 1274 to 1393, the gait
// controller 1395 to 1658). Serves the checklist box "The balance
// controller and the walking planner". The law carried whole: every
// control formula, every dial and its default, every threshold, and the
// four cooperating classes, Posture, BalanceController with
// groundTruthState, DCMPlan with COMTracker and buildPhases, and
// GaitController with smooth, in the demo's order and text.
//
// Known numbers the demo states, carried here, not re-derived:
// - the steering ceiling is 4 degrees per second (turnRate's default).
// - the old hand-built pelvis pattern failed because 0.40 m of lateral
//   shift in 0.65 s demands a ZMP 1.8 m outside the foot; the DCM plan
//   below replaces it.
// - the foot lands roughly 0.1 m inboard of the commanded print every step.
// - without pulling the recorded print back toward nominal stance width,
//   the stance collapses and the legs cross over after about seven steps.
// - replanning at touchdown (already mid double support) costs tDS + tSS
//   per step; a full leading DS phase there would cost 2*tDS + tSS instead.
//
// Substitutions, numbered, and only these:
// 1. The module-level `let G = 9.81; function setGravity(g)` goes.
//    BalanceController reads `this.k.gravity` (default 9.81, a new entry
//    in its k table) where the demo's update read G. groundTruthState(rig,
//    g = 9.81) takes gravity as its second argument for the contact
//    threshold 0.02 * M * g. GaitController hands its own k.gravity to the
//    BalanceController it builds, as `gravity` in that controller's cfg —
//    its own k table is assigned before the BalanceController is built, so
//    the value exists to hand down (the demo built balance before k; the
//    order is swapped here to make that possible, the formulas unchanged).
// 2. groundTruthState drops the demo's unused `world` argument, per
//    substitution 1's shape.
// 3. Posture's dead call `buildLinkTable()` is dropped; Posture reads the
//    hip pivots from rig.table as the demo does.
// 4. legIK is imported from the legik module; the vector helpers V, Q,
//    vadd, vsub, vmul, qrot, qrotInv, and qAxisAngle are imported from the
//    physics-pb module. No other import.
// 5. The literal V(-0.10, 0.15, 0) ankle-pivot offset, repeated at three
//    call sites (groundTruthState's foot loop, and GaitController's init
//    and touchdown correction — init writes both feet, so the literal
//    appears four times across those three sites), becomes one module
//    constant ANKLE_PIVOT with that value, exported.
// 6. The copOverride field stays as the module's own back-channel between
//    GaitController and its BalanceController, unchanged.
// 7. export is added to Posture, groundTruthState, BalanceController,
//    DCMPlan, COMTracker, buildPhases, smooth, GaitController, and a maker
//    makeGait(rig, cfg) returning new GaitController(rig, cfg) is added.
// 8. Added: GAIT_DIALS_CONTRACT, checkGaitDials(k), and
//    checkBalanceDials(k), contracts with no demo source.

import { legIK } from "../legik/legik.js";
import { V, Q, vadd, vsub, vmul, qrot, qrotInv, qAxisAngle } from "../physics-pb/physics.js";

// The ankle-pivot offset in the foot's own local frame, sole held flat.
export const ANKLE_PIVOT = V(-0.10, 0.15, 0);

/* ===== control/posture.mjs ===== */
// posture.mjs — drive the legs from a desired pelvis pose plus desired foot placements.
// Every joint target comes out of legIK, so the commanded configuration is always
// consistent with the closed chain through the ground.

export class Posture {
  constructor(rig) {
    this.rig = rig;
    this.hip = {};
    for (const s of ['L', 'R']) {
      const jp = rig.table[`hipYoke${s}`].jp;
      this.hip[s] = V(jp[0], jp[1], jp[2]);      // hip pivot in pelvis local
    }
    this.last = {};
  }
  /* pelvis: world position reference for the pelvis (orientation assumed upright)
     feet:   { L: worldAnklePos, R: worldAnklePos }
     actual: measured pelvis position, optional

     Reference frame split. Solving purely against the REFERENCE pelvis means a commanded
     foot lands at actual + (target - reference), so whenever the body deviates the
     planted foot is dragged along with it -- that is what made tracking error accumulate
     until the walk collapsed. Solving purely against the MEASURED pelvis keeps the feet
     planted but loses vertical support: if the pelvis sags the IK just shortens the leg.
     So take horizontal from the measurement and vertical from the reference. */
  apply(pelvis, feet, actual = null, quat = null) {
    const J = this.rig.joints;
    const base = actual ? V(actual.x, pelvis.y, actual.z) : pelvis;
    const yaw = quat || Q();
    for (const s of ['L', 'R']) {
      // hip offset and the hip->foot vector both live in the PELVIS frame, so a yawed
      // pelvis just rotates them; legIK is unchanged.
      const hipWorld = vadd(base, qrot(yaw, this.hip[s]));
      const d = qrotInv(yaw, vsub(feet[s], hipWorld));
      const q = legIK(d);
      J[`hipYoke${s}`].target = q.hipRoll;
      J[`thigh${s}`].target = q.hipPitch;
      J[`shin${s}`].target = q.knee;
      J[`ankleYoke${s}`].target = q.anklePitch;
      J[`foot${s}`].target = q.ankleRoll;
      this.last[s] = q;
    }
  }
}

/* ===== control/balance.mjs ===== */
// balance.mjs — standing balance.
//
// The controller consumes a StateEstimate and nothing else. It never touches `world`
// or a Body. Today groundTruthState() fills that struct from the simulator; later the
// IMU + encoder estimator fills the identical struct and the controller is unchanged.

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

/* ---- StateEstimate: the only thing the controller is allowed to see ---- */
export function groundTruthState(rig, g = 9.81) {
  let M = 0, c = V(), p = V();
  for (const b of Object.values(rig.bodies)) {
    M += b.mass;
    c = vadd(c, vmul(b.x, b.mass));
    p = vadd(p, vmul(b.v, b.mass));
  }
  c = vmul(c, 1 / M);
  const vcom = vmul(p, 1 / M);

  // foot contact: which feet are loaded, and where the pressure acts
  const feet = {};
  for (const side of ['L', 'R']) {
    const body = rig.bodies[`foot${side}`];
    const F = body.contactForce || 0;
    feet[side] = {
      force: F,
      cop: body.contactCop,
      contact: F > 0.02 * M * g,
      ankle: body.toWorld(ANKLE_PIVOT),
    };
  }
  const loaded = ['L', 'R'].filter((s) => feet[s].contact);
  let support = null;
  if (loaded.length) {
    let sx = 0, sz = 0;
    for (const s of loaded) { sx += feet[s].ankle.x; sz += feet[s].ankle.z; }
    support = V(sx / loaded.length, 0, sz / loaded.length);
  }

  const torso = rig.bodies.torso;
  const up = qrot(torso.q, V(0, 1, 0));
  return {
    mass: M,
    com: c,
    comVel: vcom,
    comHeight: c.y - (support ? 0 : 0),
    torsoUp: up,
    torsoRate: torso.w,
    // roll about +X (lean toward +Z), pitch about +Z (lean toward +X)
    lean: { pitch: Math.atan2(up.x, up.y), roll: Math.atan2(-up.z, up.y) },
    feet,
    support,
    totalContactForce: feet.L.force + feet.R.force,
  };
}

export class BalanceController {
  constructor(rig, cfg = {}) {
    this.rig = rig;
    this.k = Object.assign({
      ankleKp: 0.03, ankleKd: 0.011,     // capture-point error (m) -> ankle angle (rad)
      ankleTrim: 0.16,                   // max ankle trim, rad
      signPitch: 1, signRoll: 1, signHip: 1,
      kCop: 0.6,             // CoP error (m) -> ankle torque, as a fraction of F
      copLimitX: 0.36, copLimitZ: 0.24,  // CoP travel from the ankle pivot, m (foot geometry)
      hipStrategy: 0.0,                  // rad of hip trim per m of capture-point excess
      lateralShift: 0.0,                 // rad of hip roll per m of lateral capture error
      capture: 1.6,
      torsoKp: 26e3, torsoKd: 7.0e3,     // torso attitude, N.m / rad
      hipKp: 0.08, hipKd: 0.024,         // hip angle servo trim (rad per rad of lean)
      hipTrimLimit: 0.35,
      kneeTarget: 18 * Math.PI / 180,
      comHeightTarget: null,
      kneeKp: 1.4, kneeKd: 0.10,
      gravity: 9.81,
    }, cfg);
    this.stance = { hip: -9 * Math.PI / 180, knee: 18 * Math.PI / 180, ankle: -9 * Math.PI / 180 };
    // All joints stay in position mode. Balance is applied as small angle trims on top
    // of a stance that is known to hold statically; commanding ankle TORQUE directly
    // makes the ankle a free pivot on any frame where contact force reads low, and the
    // legs fold before the loop can engage.
    this.debug = {};
  }

  update(st, dt) {
    const J = this.rig.joints;
    if (!st.support) {                       // airborne: hold the stance pose
      return;
    }

    // --- capture point (LIPM): where the COM will come to rest if we do nothing ---
    const hCom = Math.max(0.5, st.com.y);
    const w0 = Math.sqrt(this.k.gravity / hCom);
    const xiX = st.com.x + st.comVel.x / w0;
    const xiZ = st.com.z + st.comVel.z / w0;

    const eX = (xiX - st.support.x), eZ = (xiZ - st.support.z);

    // --- desired centre of pressure ---------------------------------------------------
    // Default: drive the capture point back to the support centre. When a gait planner
    // supplies copOverride, track that instead -- it already encodes a dynamically
    // feasible ZMP plus DCM error feedback.
    const copDesX = this.copOverride ? this.copOverride.x : xiX + this.k.capture * eX;
    const copDesZ = this.copOverride ? this.copOverride.z : xiZ + this.k.capture * eZ;

    const nSupport = (st.feet.L.contact ? 1 : 0) + (st.feet.R.contact ? 1 : 0);
    // --- ankles: hold the stance pose on PD, bias the torque to move the MEASURED CoP.
    // Closing on measured CoP rather than commanding open-loop torque means the loop is
    // robust to whatever the servo happens to be doing.
    for (const s of ['L', 'R']) {
      const f = st.feet[s];
      const aJ = J[`ankleYoke${s}`], rJ = J[`foot${s}`];
      aJ.target = this.stance.ankle;
      rJ.target = 0;
      if (!f.contact || !f.cop) { aJ.tauFF = 0; rJ.tauFF = 0; continue; }
      const dDesX = clamp(copDesX - f.ankle.x, -this.k.copLimitX, this.k.copLimitX);
      const dDesZ = clamp(copDesZ - f.ankle.z, -this.k.copLimitZ, this.k.copLimitZ);
      const errX = dDesX - (f.cop.x - f.ankle.x);
      const errZ = dDesZ - (f.cop.z - f.ankle.z);
      aJ.tauFF = this.k.signPitch * -this.k.kCop * f.force * errX;
      // In DOUBLE support the net lateral CoP is set by how load is shared between the
      // feet, not by rolling either one. Commanding foot roll here just tips a foot onto
      // its edge and sheds contact area, which is strictly destabilising. Ankle roll is
      // only the right lever in single support.
      rJ.tauFF = nSupport > 1 ? 0 : this.k.signRoll * this.k.kCop * f.force * errZ;
    }

    // --- hip strategy ---------------------------------------------------------------
    // Ankle torque caps how far the CoP can travel: dxMax = tauMax / F. Past that the
    // ankle is saturated and the only remaining authority is counter-rotating the trunk
    // to generate centroidal angular momentum. Engage strictly on the excess.
    const Fsum = Math.max(1, st.totalContactForce);
    const dxMax = (J.ankleYokeL.tauMax * 2) / Fsum;
    const dzMax = (J.footL.tauMax * 2) / Fsum;
    const exX = Math.sign(eX) * Math.max(0, Math.abs(eX) - dxMax);
    const exZ = Math.sign(eZ) * Math.max(0, Math.abs(eZ) - dzMax);

    // --- torso attitude held by the hips (position servo, trimmed by lean error) ---
    // d(lean)/dt, not raw body rate: tipping forward (+X) is a NEGATIVE rotation about
    // +Z, so feeding omega_z straight in makes the damping term anti-damping.
    const pitchErr = st.lean.pitch, rollErr = st.lean.roll;
    const pitchRate = -st.torsoRate.z, rollRate = -st.torsoRate.x;
    const T = this.k.hipTrimLimit;
    const hipPitchTrim = clamp(this.k.signHip * (this.k.hipKp * pitchErr + this.k.hipKd * pitchRate)
                             + this.k.hipStrategy * exX, -T, T);
    const hipRollTrim = clamp(this.k.signHip * (this.k.hipKp * rollErr + this.k.hipKd * rollRate)
                            + this.k.hipStrategy * exZ + this.k.lateralShift * eZ, -T, T);

    for (const s of ['L', 'R']) {
      J[`thigh${s}`].target = this.stance.hip + hipPitchTrim;
      J[`hipYoke${s}`].target = hipRollTrim;
      J[`shin${s}`].target = this.stance.knee;
    }
    this.debug = { copDesX, copDesZ, xiX, xiZ, eX, eZ, hipPitchTrim, hipRollTrim, loaded: (st.feet.L.contact?1:0) + (st.feet.R.contact?1:0) };
  }
}

/* ===== control/dcm.mjs ===== */
// dcm.mjs — divergent component of motion planning.
//
// The linear inverted pendulum splits into a stable part (the COM chasing the DCM) and
// an unstable part (the DCM), where
//     xi = x + xdot / omega,      omega = sqrt(g / z_com)
//     xidot = omega * (xi - p)    p = ZMP
// With the ZMP held constant over a phase this integrates exactly:
//     xi(t) = p + (xi_0 - p) * e^(omega t)
// so planning runs BACKWARD from a desired final rest state:
//     xi_i = p_i + (xi_{i+1} - p_i) * e^(-omega T_i)
// Every trajectory produced this way keeps the ZMP inside the phase's support by
// construction, which is exactly the property the hand-built pelvis pattern lacked.

export class DCMPlan {
  /* phases: [{ zmpA: V, zmpB: V, duration, kind }] with the ZMP moving LINEARLY from
     zmpA to zmpB across the phase. Holding it constant per phase makes it jump 0.28 m
     at every transition, which no real centre of pressure can do.

     For p(t) = pA + c t, with c = (pB - pA)/T, the DCM integrates exactly to
        xi(t) = e^(w t) (xi_0 - pA - c/w) + pA + c t + c/w
     and the backward recursion is
        xi_0 = pA + c/w + e^(-w T) (xi_T - pB - c/w) */
  constructor(phases, zCom, g = 9.81) {
    this.phases = phases;
    this.omega = Math.sqrt(g / zCom);
    this.zCom = zCom;
    let t = 0;
    this.t0 = phases.map((p) => { const s = t; t += p.duration; return s; });
    this.T = t;
    const w = this.omega;
    this.xi = new Array(phases.length + 1);
    this.xi[phases.length] = phases[phases.length - 1].zmpB;
    for (let i = phases.length - 1; i >= 0; i--) {
      const p = phases[i];
      const c = vmul(vsub(p.zmpB, p.zmpA), 1 / p.duration);
      const e = Math.exp(-w * p.duration);
      const inner = vsub(vsub(this.xi[i + 1], p.zmpB), vmul(c, 1 / w));
      this.xi[i] = vadd(vadd(p.zmpA, vmul(c, 1 / w)), vmul(inner, e));
    }
  }
  indexAt(t) {
    if (t <= 0) return 0;
    for (let i = this.phases.length - 1; i >= 0; i--) if (t >= this.t0[i]) return i;
    return 0;
  }
  localAt(t) {
    const i = this.indexAt(t);
    const p = this.phases[i];
    const tau = Math.min(Math.max(t - this.t0[i], 0), p.duration);
    return { i, p, tau, c: vmul(vsub(p.zmpB, p.zmpA), 1 / p.duration) };
  }
  zmpAt(t) {
    const { p, tau, c } = this.localAt(t);
    return vadd(p.zmpA, vmul(c, tau));
  }
  kindAt(t) { return this.phases[this.indexAt(t)].kind; }
  phaseProgress(t) {
    const { i, p, tau } = this.localAt(t);
    return { i, s: tau / p.duration, kind: p.kind };
  }
  xiAt(t) {
    const { i, p, tau, c } = this.localAt(t);
    const w = this.omega;
    const inner = vsub(vsub(this.xi[i], p.zmpA), vmul(c, 1 / w));
    const e = Math.exp(w * tau);
    return vadd(vadd(vadd(vmul(inner, e), p.zmpA), vmul(c, tau)), vmul(c, 1 / w));
  }
}

/* Forward-integrates the stable COM dynamics xdot = -omega (x - xi) against a plan.
   Produces the pelvis reference that the IK layer tracks. */
export class COMTracker {
  constructor(plan, x0) {
    this.plan = plan;
    this.x = V(x0.x, 0, x0.z);
    this.v = V();
  }
  step(t, dt) {
    const xi = this.plan.xiAt(t);
    const w = this.plan.omega;
    // semi-implicit: stable direction, so this is unconditionally well behaved
    const ax = w * (xi.x - this.x.x), az = w * (xi.z - this.x.z);
    this.v = V(ax, 0, az);
    this.x = V(this.x.x + ax * dt, 0, this.x.z + az * dt);
    return { com: this.x, vel: this.v, xi };
  }
}

/* Build an alternating footstep plan. stride = 0 marches in place. */
export function buildPhases(opts) {
  const {
    left, right,
    stride = V(), nSteps = 6,
    tDS = 0.45, tSS = 0.85, tStart = 1.2, tEnd = 2.5,
    first = 'L',
  } = opts;
  const sv = typeof stride === 'number' ? V(stride, 0, 0) : stride;
  const flat = (p) => V(p.x, 0, p.z);
  const mid = (a, b) => V((a.x + b.x) / 2, 0, (a.z + b.z) / 2);
  const foot = { L: flat(left), R: flat(right) };
  const centre = mid(foot.L, foot.R);
  const phases = [{ zmpA: centre, zmpB: centre, duration: tStart, kind: 'DS' }];
  let swing = first;
  let prev = centre;
  for (let i = 0; i < nSteps; i++) {
    const stance = swing === 'L' ? 'R' : 'L';
    // shift the ZMP off the previous point onto the stance foot, then hold it there
    phases.push({ zmpA: prev, zmpB: foot[stance], duration: tDS, kind: `DS->${stance}` });
    phases.push({ zmpA: foot[stance], zmpB: foot[stance], duration: tSS, kind: `SS-${stance}` });
    foot[swing] = V(foot[swing].x + sv.x, 0, foot[swing].z + sv.z);
    prev = foot[stance];
    swing = swing === 'L' ? 'R' : 'L';
  }
  const end = mid(foot.L, foot.R);
  phases.push({ zmpA: prev, zmpB: end, duration: tDS, kind: 'DS' });
  phases.push({ zmpA: end, zmpB: end, duration: tEnd, kind: 'DS' });
  return phases;
}

/* ===== control/gait.mjs ===== */
// gait.mjs — walking driven by a DCM plan and executed through inverse kinematics.
//
//   DCMPlan      dynamically feasible ZMP + DCM reference (control/dcm.mjs)
//   COMTracker   stable COM trajectory that realises that ZMP
//   Posture      COM/pelvis + foot poses -> joint angles via legIK
//   Balance      ankle centre-of-pressure feedforward, now tracking the planned ZMP
//
// The previous hand-built pelvis pattern failed because it was never dynamically
// feasible: 0.40 m of lateral shift in 0.65 s demands a ZMP 1.8 m outside the foot.

export const smooth = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

export class GaitController {
  constructor(rig, cfg = {}) {
    this.rig = rig;
    this.k = Object.assign({
      pelvisDrop: 0.25,
      settleTime: 0.4,
      crouchTime: 1.4,
      stride: 0.0,
      nSteps: 6,
      horizon: 4,          // steps planned ahead; replanned every touchdown
      tStart: 1.2, tEnd: 3.0,
      stepHeight: 0.14,
      kDCM: 2.0,           // DCM error feedback, >1 for stable error dynamics
      copClamp: 0.45,      // how far the CoP may deviate from the planned ZMP, m
      gravity: 9.81,       // must match the world; the LIPM frequency depends on it
      trackMeasured: false, // reference-frame IK is correct: leg deflection IS the force
      replan: true,        // rebuild the plan from MEASURED feet at each touchdown
      lateralCorrect: 0.22, // lateral error corrected in the commanded swing target
      plantPin: 0.22,      // lateral error corrected in the recorded print at touchdown
      minFootSep: 1.16,    // commanded lateral clearance between prints, m (foot width + air)
      strideRate: 0.06,    // m of stride change per second
      turnRate: 4 * Math.PI / 180,  // rad/s; 4 deg/s is the verified ceiling
      tSS: 0.90, tDS: 0.50,
      enabled: true,
    }, cfg);
    this.posture = new Posture(rig);
    this.balance = new BalanceController(rig, Object.assign({ hipKp: 0, hipKd: 0, gravity: this.k.gravity }, cfg.balance || {}));
    this.t = 0;
    this.state = 'INIT';
    this.debug = {};
    // Live command, safe to mutate from the UI at any time. It is LATCHED at each
    // touchdown into `active`: reading it live means a mid-swing change teleports the
    // swing foot target, which is what broke every varying-command case.
    this.cmd = { stride: this.k.stride, heading: 0 };
    this.active = { stride: this.k.stride, heading: 0 };
    // What the UI asks for. `cmd` slews toward it at a rate the gait can actually
    // absorb; a step change in speed or heading is a disturbance the walk will not
    // survive, so the limiter is a correctness device, not a comfort one.
    this.want = { stride: this.k.stride, heading: 0 };
  }

  slew(dt) {
    const ds = this.k.strideRate * dt, dh = this.k.turnRate * dt;
    const es = this.want.stride - this.cmd.stride;
    const eh = this.want.heading - this.cmd.heading;
    this.cmd.stride += Math.max(-ds, Math.min(ds, es));
    this.cmd.heading += Math.max(-dh, Math.min(dh, eh));
  }

  latch() { this.active = { stride: this.cmd.stride, heading: this.cmd.heading }; }

  /* forward and left unit vectors for the current heading (yaw about +Y) */
  basis() {
    const h = this.active.heading;
    return { fwd: V(Math.cos(h), 0, -Math.sin(h)), left: V(Math.sin(h), 0, Math.cos(h)) };
  }
  strideVec() { return vmul(this.basis().fwd, this.active.stride); }
  yawQuat() { return qAxisAngle(V(0, 1, 0), this.active.heading); }

  init(st) {
    const r = this.rig;
    this.pelvisStart = V(r.bodies.pelvis.x.x, r.bodies.pelvis.x.y, r.bodies.pelvis.x.z);
    this.pelvisY = this.pelvisStart.y - this.k.pelvisDrop;
    this.plant = {
      L: r.bodies.footL.toWorld(ANKLE_PIVOT),
      R: r.bodies.footR.toWorld(ANKLE_PIVOT),
    };
    this.comToPelvis = vsub(this.pelvisStart, st.com);   // constant offset, held through the walk
    // Nominal lateral footprint. Without commanding this, each landing inherits the
    // previous one's inward drift, the stance narrows every step and the legs cross over.
    this.centreZ = (this.plant.L.z + this.plant.R.z) / 2;
    this.halfStance = (this.plant.L.z - this.plant.R.z) / 2;
    this.planned = false;
  }

  buildPlan(st) {
    const zc = Math.max(1.0, st.com.y);
    this.plan = new DCMPlan(buildPhases({
      left: this.plant.L, right: this.plant.R,
      stride: this.strideVec(), nSteps: this.k.horizon,
      tDS: this.k.tDS, tSS: this.k.tSS, tStart: this.k.tStart, tEnd: this.k.tEnd,
    }), zc, this.k.gravity);
    this.tracker = new COMTracker(this.plan, st.com);
    this.tPlan = 0;
    this.planned = true;
    this.latch();
    this.stepsTaken = 0;
    this.stepsRemaining = this.k.nSteps;
    this.swingPrev = null;
    this.nextSwing = 'L';
  }

  /* Rebuild the plan from the measured feet and the measured COM, for whatever steps
     are left. Standard practice: replan at every footstep rather than trusting an
     open-loop pattern to stay valid for the whole walk. */
  rebuild(st) {
    this.stepsRemaining = this.k.horizon;      // receding horizon: always plan ahead
    this.latch();
    this.nextSwing = this.nextSwing === 'L' ? 'R' : 'L';
    const zc = Math.max(1.0, st.com.y);
    this.plan = new DCMPlan(buildPhases({
      left: this.plant.L, right: this.plant.R,
      stride: this.strideVec(), nSteps: this.stepsRemaining,
      tDS: this.k.tDS, tSS: this.k.tSS,
      // Replanning happens AT touchdown, which is already the start of double support,
      // so a full leading DS phase there is dead time -- it cost 2*tDS + tSS per step
      // instead of tDS + tSS. Starting from a STANDSTILL is the exception: the COM is
      // parked in the middle and needs a real phase to get moving.
      tStart: this._fromStand ? this.k.tDS * 1.6 : 0.02, tEnd: this.k.tEnd,
      first: this.nextSwing,
    }), zc, this.k.gravity);
    this.tracker = new COMTracker(this.plan, st.com);
    this.tPlan = 0;
  }

  update(st, dt) {
    if (!this.plant) this.init(st);
    this.slew(dt);
    if (!this.k.enabled || !st.support) { this.balance.update(st, dt); return; }
    this.t += dt;

    // --- warm-up: settle, then ease into the crouch --------------------------------
    const warm = this.k.settleTime + this.k.crouchTime;
    if (this.t < warm) {
      const u = smooth(clamp((this.t - this.k.settleTime) / this.k.crouchTime, 0, 1));
      const y = this.pelvisStart.y + (this.pelvisY - this.pelvisStart.y) * u;
      this.balance.copOverride = null;
      this.balance.update(st, dt);
      this.posture.apply(V(this.pelvisStart.x, y, this.pelvisStart.z), this.plant, null, this.yawQuat());
      this.state = 'WARMUP';
      this.debug = { state: this.state, u };
      return;
    }
    if (!this.planned) this.buildPlan(st);

    // ---- STAND -----------------------------------------------------------------------
    // The state machine used to cycle forever, so the mech marched in place with no input
    // and "stop" only meant "take zero-length steps". Standing is now a real state: both
    // feet stay planted and only the balance loop runs. It is entered at a touchdown so
    // we never freeze mid-swing, and left as soon as a command arrives.
    const wantMove = this.want.stride > 0.03;
    if (this.standing) {
      if (wantMove) { this.standing = false; this._fromStand = true; this.rebuild(st); this._fromStand = false; }
      else {
        this.balance.copOverride = null;
        this.balance.update(st, dt);
        const mid = V((this.plant.L.x + this.plant.R.x) / 2, 0, (this.plant.L.z + this.plant.R.z) / 2);
        this.posture.apply(V(mid.x + this.comToPelvis.x, this.pelvisY, mid.z + this.comToPelvis.z),
                           this.plant, null, this.yawQuat());
        this.state = 'STAND';
        this.debug = { state: 'STAND', steps: this.stepsTaken };
        return;
      }
    }

    // --- reference trajectories ------------------------------------------------------
    this.tPlan += dt;
    const t = Math.min(this.tPlan, this.plan.T - 1e-6);
    const ref = this.tracker.step(t, dt);
    const { s, kind } = this.plan.phaseProgress(t);
    const zmpRef = this.plan.zmpAt(t);
    const xiRef = this.plan.xiAt(t);

    // --- swing foot ------------------------------------------------------------------
    const stance = kind.startsWith('SS-') ? kind.slice(3) : null;
    const swing = stance ? (stance === 'L' ? 'R' : 'L') : null;
    if (this.swingPrev && this.swingPrev !== swing) {
      // Touchdown. The foot lands short of the commanded stride, so advancing `plant` by
      // the commanded amount desynchronises the plan from reality and the error compounds
      // every step. Take the MEASURED landing position and replan the remainder.
      const w2 = this.swingPrev;
      const land = this.rig.bodies[`foot${w2}`].toWorld(ANKLE_PIVOT);
      // sagittal from measurement so travel stays honest, lateral pinned to nominal
      // The foot lands roughly 0.1 m inboard of command every step. Correcting only the
      // commanded target cannot overcome that, so also pull the RECORDED print back
      // toward nominal stance width; without this the stance collapses and the legs
      // cross over after about seven steps.
      const bb = this.basis();
      const oth = this.plant[w2 === 'L' ? 'R' : 'L'];
      const sgn = w2 === 'L' ? 1 : -1;
      const latLand = land.x * bb.left.x + land.z * bb.left.z;
      const latOther = oth.x * bb.left.x + oth.z * bb.left.z;
      let corr = ((latOther + sgn * 2 * this.halfStance) - latLand) * this.k.plantPin;
      const after = latLand + corr;
      if (sgn * (after - latOther) < this.k.minFootSep) corr = latOther + sgn * this.k.minFootSep - latLand;
      this.plant[w2] = V(land.x + bb.left.x * corr, land.y, land.z + bb.left.z * corr);
      this.stepsTaken++;
      this.latch();
      // settle into STAND rather than cycling forever on a zero-length stride
      if (this.want.stride <= 0.03) { this.standing = true; this.state = 'STAND'; }
      else if (this.k.replan) this.rebuild(st);
    }
    this.swingPrev = swing;

    const feet = { L: this.plant.L, R: this.plant.R };
    if (swing) {
      const from = this.plant[swing];
      const lift = Math.sin(Math.PI * s) * this.k.stepHeight;
      const b = this.basis(), sv = this.strideVec();
      const other = this.plant[swing === 'L' ? 'R' : 'L'];
      const sign = swing === 'L' ? 1 : -1;
      // Full stride along the heading from this foot's own last print...
      const baseX = from.x + sv.x, baseZ = from.z + sv.z;
      // ...then correct ONLY the lateral component toward the nominal stance width.
      // Blending both axes together (an earlier version) also corrupts stride length.
      const nomX = other.x + sv.x + b.left.x * sign * 2 * this.halfStance;
      const nomZ = other.z + sv.z + b.left.z * sign * 2 * this.halfStance;
      const eLat = (nomX - baseX) * b.left.x + (nomZ - baseZ) * b.left.z;
      let tx = baseX + b.left.x * eLat * this.k.lateralCorrect;
      let tz = baseZ + b.left.z * eLat * this.k.lateralCorrect;
      // Never COMMAND a placement the feet cannot physically occupy. The solver now
      // refuses to let them interpenetrate, so a planner that keeps asking just fights
      // the constraint and falls over -- which is what turning did.
      const sepLat = (tx - other.x) * b.left.x + (tz - other.z) * b.left.z;
      const need = sign * this.k.minFootSep;
      if (sign * sepLat < this.k.minFootSep) {
        tx += b.left.x * (need - sepLat);
        tz += b.left.z * (need - sepLat);
      }
      feet[swing] = V(from.x + (tx - from.x) * smooth(s), from.y + lift,
                      from.z + (tz - from.z) * smooth(s));
    }

    // --- DCM tracking: p_cmd = p_ref + k (xi_meas - xi_ref), stable for k > 1 ---------
    const w = this.plan.omega;
    const xiMeas = V(st.com.x + st.comVel.x / w, 0, st.com.z + st.comVel.z / w);
    const cop = V(
      clamp(zmpRef.x + this.k.kDCM * (xiMeas.x - xiRef.x), zmpRef.x - this.k.copClamp, zmpRef.x + this.k.copClamp),
      0,
      clamp(zmpRef.z + this.k.kDCM * (xiMeas.z - xiRef.z), zmpRef.z - this.k.copClamp, zmpRef.z + this.k.copClamp));
    this.balance.copOverride = cop;
    this.balance.update(st, dt);

    // --- pelvis follows the planned COM ---------------------------------------------
    const pelvisRef = V(ref.com.x + this.comToPelvis.x, this.pelvisY, ref.com.z + this.comToPelvis.z);
    const pelvisNow = this.rig.bodies.pelvis.x;
    this.posture.apply(pelvisRef, feet, this.k.trackMeasured ? pelvisNow : null, this.yawQuat());

    this.state = kind;
    this.debug = {
      state: kind, t, swing, cop, zmpRef, xiRef, xiMeas, comRef: ref.com,
      dcmErrZ: xiMeas.z - xiRef.z, dcmErrX: xiMeas.x - xiRef.x,
      steps: this.stepsTaken,
      reachL: this.posture.last.L?.reach, reachR: this.posture.last.R?.reach,
    };
  }
}

// makeGait(rig, cfg) -> new GaitController(rig, cfg).
export function makeGait(rig, cfg) { return new GaitController(rig, cfg); }

// GAIT_DIALS_CONTRACT: the gait table's shape, plain field descriptions.
// checkGaitDials(k) and checkBalanceDials(k) return every problem with a
// dial table in one pass, empty when clean.
export const GAIT_DIALS_CONTRACT = {
  pelvisDrop: "number", settleTime: "number", crouchTime: "number", stride: "number",
  nSteps: "number", horizon: "number", tStart: "number", tEnd: "number", stepHeight: "number",
  kDCM: "number", copClamp: "number", gravity: "number", lateralCorrect: "number",
  plantPin: "number", minFootSep: "number", strideRate: "number", turnRate: "number",
  tSS: "number", tDS: "number",
  enabled: "boolean", replan: "boolean", trackMeasured: "boolean",
};

const GAIT_NUMBER_FIELDS = [
  "pelvisDrop", "settleTime", "crouchTime", "stride", "nSteps", "horizon", "tStart", "tEnd",
  "stepHeight", "kDCM", "copClamp", "gravity", "lateralCorrect", "plantPin", "minFootSep",
  "strideRate", "turnRate", "tSS", "tDS",
];
const GAIT_BOOL_FIELDS = ["enabled", "replan", "trackMeasured"];

// checkGaitDials(k) -> every problem with a gait dial table, in one pass, empty when clean.
export function checkGaitDials(k) {
  const problems = [];
  if (typeof k !== "object" || k === null) { problems.push("dials: not an object"); return problems; }
  for (const name of GAIT_NUMBER_FIELDS) {
    if (k[name] !== undefined && !(typeof k[name] === "number" && Number.isFinite(k[name]))) {
      problems.push(`dials.${name}: finite number required`);
    }
  }
  for (const name of GAIT_BOOL_FIELDS) {
    if (k[name] !== undefined && typeof k[name] !== "boolean") {
      problems.push(`dials.${name}: boolean required`);
    }
  }
  return problems;
}

// checkBalanceDials(k) -> every problem with a balance dial table, in one pass, empty
// when clean. Every field present must be a finite number, except comHeightTarget,
// which may also be null.
export function checkBalanceDials(k) {
  const problems = [];
  if (typeof k !== "object" || k === null) { problems.push("dials: not an object"); return problems; }
  for (const name of Object.keys(k)) {
    if (name === "comHeightTarget" && k[name] === null) continue;
    if (!(typeof k[name] === "number" && Number.isFinite(k[name]))) {
      problems.push(`dials.${name}: finite number required`);
    }
  }
  return problems;
}
