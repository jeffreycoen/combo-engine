// physics.mjs — XPBD substepped rigid body core (SI units: m, kg, s, N, N.m)

/* ---------------- vec3 ---------------- */
const V = (x = 0, y = 0, z = 0) => ({ x, y, z });
const vadd = (a, b) => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
const vsub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const vmul = (a, s) => ({ x: a.x * s, y: a.y * s, z: a.z * s });
const vdot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
const vcross = (a, b) => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x,
});
const vlen = (a) => Math.hypot(a.x, a.y, a.z);
const vlen2 = (a) => a.x * a.x + a.y * a.y + a.z * a.z;
const vnorm = (a) => { const l = vlen(a); return l > 1e-12 ? vmul(a, 1 / l) : V(); };

/* ---------------- quat (x,y,z,w) ---------------- */
const Q = (x = 0, y = 0, z = 0, w = 1) => ({ x, y, z, w });
const qmul = (a, b) => ({
  w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z,
  x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
  y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
  z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
});
const qconj = (q) => ({ x: -q.x, y: -q.y, z: -q.z, w: q.w });
const qnorm = (q) => {
  const l = Math.hypot(q.x, q.y, q.z, q.w) || 1;
  return { x: q.x / l, y: q.y / l, z: q.z / l, w: q.w / l };
};
function qrot(q, v) {
  const t = vmul(vcross(V(q.x, q.y, q.z), v), 2);
  return vadd(vadd(v, vmul(t, q.w)), vcross(V(q.x, q.y, q.z), t));
}
const qrotInv = (q, v) => qrot(qconj(q), v);
function qAxisAngle(axis, ang) {
  const a = vnorm(axis), s = Math.sin(ang / 2);
  return { x: a.x * s, y: a.y * s, z: a.z * s, w: Math.cos(ang / 2) };
}

/* ---------------- mat3 (row-major array of 9) ---------------- */
const m3mulv = (m, v) => ({
  x: m[0] * v.x + m[1] * v.y + m[2] * v.z,
  y: m[3] * v.x + m[4] * v.y + m[5] * v.z,
  z: m[6] * v.x + m[7] * v.y + m[8] * v.z,
});
function m3inv(m) {
  const [a, b, c, d, e, f, g, h, i] = m;
  const A = e * i - f * h, B = -(d * i - f * g), C = d * h - e * g;
  const det = a * A + b * B + c * C;
  if (Math.abs(det) < 1e-18) throw new Error('singular inertia tensor');
  const id = 1 / det;
  return [
    A * id, (c * h - b * i) * id, (b * f - c * e) * id,
    B * id, (a * i - c * g) * id, (c * d - a * f) * id,
    C * id, (b * g - a * h) * id, (a * e - b * d) * id,
  ];
}
const m3diag = (x, y, z) => [x, 0, 0, 0, y, 0, 0, 0, z];
const m3add = (a, b) => a.map((v, i) => v + b[i]);
const m3sub = (a, b) => a.map((v, i) => v - b[i]);
const m3scale = (a, s) => a.map((v) => v * s);
const skew = (v) => [0, -v.z, v.y, v.z, 0, -v.x, -v.y, v.x, 0];
function qExp(v) {  // exponential map: rotation vector -> quat
  const t = vlen(v);
  if (t < 1e-9) return qnorm(Q(v.x * 0.5, v.y * 0.5, v.z * 0.5, 1));
  const s = Math.sin(t / 2) / t;
  return { x: v.x * s, y: v.y * s, z: v.z * s, w: Math.cos(t / 2) };
}

/* ---------------- inertia primitives (about own COM, local axes) ---------------- */
const boxInertia = (m, w, h, d) =>
  m3diag(m * (h * h + d * d) / 12, m * (w * w + d * d) / 12, m * (w * w + h * h) / 12);
// cylinder along +Y
const cylInertiaY = (m, r, h) =>
  m3diag(m * (3 * r * r + h * h) / 12, m * r * r / 2, m * (3 * r * r + h * h) / 12);
const sphereInertia = (m, r) => m3diag(2 * m * r * r / 5, 2 * m * r * r / 5, 2 * m * r * r / 5);

// Compose sub-parts into one rigid body's mass properties.
// parts: [{mass, inertia:mat3 (about sub-COM, in sub frame), pos:vec3, quat?:quat}]
function compound(parts) {
  let M = 0, com = V();
  for (const p of parts) { M += p.mass; com = vadd(com, vmul(p.pos, p.mass)); }
  com = vmul(com, 1 / M);
  const I = [0, 0, 0, 0, 0, 0, 0, 0, 0];
  for (const p of parts) {
    const q = p.quat || Q();
    // rotate sub inertia into parent frame: R I R^T
    const R = quatToM3(q), Rt = m3transpose(R);
    const Ir = m3mul(m3mul(R, p.inertia), Rt);
    const d = vsub(p.pos, com), d2 = vlen2(d);
    const pa = [
      p.mass * (d2 - d.x * d.x), p.mass * (-d.x * d.y), p.mass * (-d.x * d.z),
      p.mass * (-d.y * d.x), p.mass * (d2 - d.y * d.y), p.mass * (-d.y * d.z),
      p.mass * (-d.z * d.x), p.mass * (-d.z * d.y), p.mass * (d2 - d.z * d.z),
    ];
    for (let k = 0; k < 9; k++) I[k] += Ir[k] + pa[k];
  }
  return { mass: M, com, inertia: I };
}
function quatToM3(q) {
  const { x, y, z, w } = q;
  return [
    1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w),
    2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w),
    2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y),
  ];
}
const m3transpose = (m) => [m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]];
function m3mul(a, b) {
  const o = new Array(9);
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++)
    o[r * 3 + c] = a[r * 3] * b[c] + a[r * 3 + 1] * b[3 + c] + a[r * 3 + 2] * b[6 + c];
  return o;
}

/* ---------------- Body ---------------- */
class Body {
  constructor(o = {}) {
    this.name = o.name || 'body';
    this.mass = o.mass ?? 1;
    this.I = o.inertia || m3diag(1, 1, 1);
    this.kinematic = !!o.kinematic;
    this.invMass = this.kinematic ? 0 : 1 / this.mass;
    this.invI = this.kinematic ? [0, 0, 0, 0, 0, 0, 0, 0, 0] : m3inv(this.I);
    this.x = o.pos || V();
    this.q = qnorm(o.quat || Q());
    this.v = o.vel || V();
    this.w = o.angVel || V();
    this.xp = this.x; this.qp = this.q;
    this.fExt = V(); this.tExt = V();
    this.a = V(); this.alpha = V();     // COM accel / angular accel, updated per substep
    this.detached = false;
  }
  toWorld(p) { return vadd(this.x, qrot(this.q, p)); }
  dirWorld(d) { return qrot(this.q, d); }
  pointVel(rWorld) { return vadd(this.v, vcross(this.w, rWorld)); }
  kinetic() {
    const wl = qrotInv(this.q, this.w);
    return 0.5 * this.mass * vlen2(this.v) + 0.5 * vdot(wl, m3mulv(this.I, wl));
  }
}

/* ---------------- generalized inverse masses ---------------- */
function genInvMass(b, r, n) {
  if (b.invMass === 0) return 0;
  const rn = vcross(r, n);
  const rnL = qrotInv(b.q, rn);
  return b.invMass + vdot(rnL, m3mulv(b.invI, rnL));
}
function angInvMass(b, n) {
  if (b.invMass === 0) return 0;
  const nL = qrotInv(b.q, n);
  return vdot(nL, m3mulv(b.invI, nL));
}
function applyInvI(b, pWorld) {
  const pL = qrotInv(b.q, pWorld);
  return qrot(b.q, m3mulv(b.invI, pL));
}
function rotateBy(b, dwWorld, sign) {
  const dq = qmul(Q(dwWorld.x * sign, dwWorld.y * sign, dwWorld.z * sign, 0), b.q);
  b.q = qnorm({ x: b.q.x + 0.5 * dq.x, y: b.q.y + 0.5 * dq.y, z: b.q.z + 0.5 * dq.z, w: b.q.w + 0.5 * dq.w });
}

/* Positional correction. err = anchor2 - anchor1 (world). Bodies pulled together.
   Returns dlambda (>=0 when err>0). p = dlambda * n is the impulse applied to b1 (+) / b2 (-). */
function solvePositional(b1, b2, r1, r2, err, compliance, h, lambda, maxLambda = Infinity) {
  const c = vlen(err);
  if (c < 1e-12) return { dl: 0, n: V() };
  const n = vmul(err, 1 / c);
  const w1 = genInvMass(b1, r1, n), w2 = genInvMass(b2, r2, n);
  const wsum = w1 + w2;
  if (wsum < 1e-18) return { dl: 0, n };
  const a = compliance / (h * h);
  let dl = (c - a * lambda) / (wsum + a);
  if (lambda + dl > maxLambda) dl = maxLambda - lambda;
  if (dl === 0) return { dl: 0, n };
  const p = vmul(n, dl);
  if (b1.invMass) { b1.x = vadd(b1.x, vmul(p, b1.invMass)); rotateBy(b1, applyInvI(b1, vcross(r1, p)), +1); }
  if (b2.invMass) { b2.x = vsub(b2.x, vmul(p, b2.invMass)); rotateBy(b2, applyInvI(b2, vcross(r2, p)), -1); }
  return { dl, n };
}

/* Angular correction. theta = rotation vector (world) to apply to b1 (+) / b2 (-). */
function solveAngular(b1, b2, theta, compliance, h, lambda, maxLambda = Infinity) {
  const c = vlen(theta);
  if (c < 1e-12) return { dl: 0, n: V() };
  const n = vmul(theta, 1 / c);
  const w1 = angInvMass(b1, n), w2 = angInvMass(b2, n);
  const wsum = w1 + w2;
  if (wsum < 1e-18) return { dl: 0, n };
  const a = compliance / (h * h);
  let dl = (c - a * lambda) / (wsum + a);
  const tot = lambda + dl;
  if (tot > maxLambda) dl = maxLambda - lambda;
  else if (tot < -maxLambda) dl = -maxLambda - lambda;
  if (dl === 0) return { dl: 0, n };
  const p = vmul(n, dl);
  if (b1.invMass) rotateBy(b1, applyInvI(b1, p), +1);
  if (b2.invMass) rotateBy(b2, applyInvI(b2, p), -1);
  return { dl, n };
}

/* rotation vector taking b1's rest-relative frame onto b2's actual frame */
function orientationError(b1, b2, qRest) {
  const target = qmul(b1.q, qRest);       // where b2 should be
  let qe = qmul(b2.q, qconj(target));     // error rotation applied to b2
  if (qe.w < 0) qe = { x: -qe.x, y: -qe.y, z: -qe.z, w: -qe.w };
  return vmul(V(qe.x, qe.y, qe.z), 2);    // small-angle rotation vector, rotate b2 by -this
}

/* ---------------- structural failure envelope, shared by Weld and Hinge ----------------
   A mount carries four independent load types. Compression is not counted toward the
   tension term. Failure when the combined utilization reaches 1 (less accumulated damage). */
function structuralUtil(lim, Fax, Fsh, Mb, Mt) {
  const t = Math.max(0, Fax) / lim.tension;
  return Math.sqrt(t * t + (Fsh / lim.shear) ** 2 + (Mb / lim.bend) ** 2 + (Mt / lim.torsion) ** 2);
}
const NO_LIMIT = { tension: Infinity, shear: Infinity, bend: Infinity, torsion: Infinity };

/* ---------------- Weld: 6-DOF rigid attachment with breakage ---------------- */
class Weld {
  constructor(o) {
    this.name = o.name;
    this.a = o.a; this.b = o.b;
    this.ra = o.ra; this.rb = o.rb;              // anchors in each body's local frame
    this.qRest = o.qRest || qmul(qconj(o.a.q), o.b.q);
    this.axis = o.axis || V(0, 1, 0);            // weld normal in body A local frame
    this.lim = Object.assign({ tension: 1e9, shear: 1e9, bend: 1e9, torsion: 1e9 }, o.lim);
    this.compliance = o.compliance ?? 0;
    this.angCompliance = o.angCompliance ?? 0;
    this.broken = false;
    this.damage = 0;
    this.damageRate = o.damageRate ?? 0;         // 0 = no fatigue
    // telemetry (per substep, N and N.m)
    this.F = V(); this.T = V();
    this.util = 0; this.peakUtil = 0;
    this.Fax = 0; this.Fsh = 0; this.Mb = 0; this.Mt = 0;
  }
  reset() { this.lp = V(); this.la = V(); }
  solve(h) {
    if (this.broken) return;
    const { a, b } = this;
    // angular first
    const theta = orientationError(a, b, this.qRest);
    if (vlen(theta) > 1e-12) {
      const c = vlen(theta), n = vmul(theta, 1 / c);
      const w1 = angInvMass(a, n), w2 = angInvMass(b, n);
      const wsum = w1 + w2;
      if (wsum > 1e-18) {
        const al = this.angCompliance / (h * h);
        const dl = (c - al * 0) / (wsum + al);
        const p = vmul(n, dl);
        if (a.invMass) rotateBy(a, applyInvI(a, p), +1);
        if (b.invMass) rotateBy(b, applyInvI(b, p), -1);
        this.la = vadd(this.la, p);
      }
    }
    // positional (anchors recomputed AFTER the angular pass)
    const r1 = a.dirWorld(this.ra), r2 = b.dirWorld(this.rb);
    const err = vsub(vadd(b.x, r2), vadd(a.x, r1));
    const res = solvePositional(a, b, r1, r2, err, this.compliance, h, 0);
    if (res.dl !== 0) this.lp = vadd(this.lp, vmul(res.n, res.dl));
  }
  measure(h) {
    if (this.broken) return;
    const inv = 1 / (h * h);
    this.F = vmul(this.lp, inv);
    this.T = vmul(this.la, inv);
    const nAx = this.a.dirWorld(this.axis);
    const fa = vdot(this.F, nAx);
    this.Fax = fa;
    this.Fsh = vlen(vsub(this.F, vmul(nAx, fa)));
    const ta = vdot(this.T, nAx);
    this.Mt = ta;
    this.Mb = vlen(vsub(this.T, vmul(nAx, ta)));
    const L = this.lim;
    const tensionTerm = Math.max(0, this.Fax) / L.tension;   // compression does not pull the weld apart
    const u2 =
      tensionTerm * tensionTerm +
      (this.Fsh / L.shear) ** 2 +
      (this.Mb / L.bend) ** 2 +
      (this.Mt / L.torsion) ** 2;
    this.util = Math.sqrt(u2);
    if (this.util > this.peakUtil) this.peakUtil = this.util;
    if (this.damageRate > 0 && this.util > 0.6) this.damage += (this.util - 0.6) * this.damageRate * h;
    const effective = 1 - Math.min(0.9, this.damage);
    if (this.util >= effective) { this.broken = true; this.brokeAtUtil = this.util; }
  }
}

/* ---------------- Revolute joint with torque-limited actuator ---------------- */
class Hinge {
  constructor(o) {
    this.name = o.name;
    this.a = o.a; this.b = o.b;
    this.ra = o.ra; this.rb = o.rb;
    this.axisA = vnorm(o.axisA); this.axisB = vnorm(o.axisB || o.axisA);
    this.refA = vnorm(o.refA); this.refB = vnorm(o.refB || o.refA);
    this.compliance = o.compliance ?? 0;
    this.alignCompliance = o.alignCompliance ?? 0;
    this.tauMax = o.tauMax ?? 0;                 // N.m
    // actuator stiffness / damping in physical units. Defaults give full torque at
    // ~3 deg of error and roughly critical damping for a limb-scale inertia.
    this.kp = o.kp ?? this.tauMax / (3 * Math.PI / 180);
    this.kd = o.kd ?? this.kp * 0.06;
    this.target = o.target ?? 0;                 // rad
    this.limits = o.limits || null;              // [lo,hi] rad
    this.angle = 0; this.tau = 0; this.tauCmd = 0; this.saturated = false;
    this.enabled = true;
    this.mode = o.mode || 'position';   // 'position' = servo to target, 'torque' = tauCmd
    this.tauFF = 0;                     // feedforward torque added to the servo, N.m
    this.lim = Object.assign({}, NO_LIMIT, o.lim);
    this.broken = false; this.util = 0; this.peakUtil = 0;
    this.F = V(); this.T = V(); this.Fax = 0; this.Fsh = 0; this.Mb = 0; this.Mt = 0;
  }
  reset() { this.lm = 0; this.lp = V(); this.la = V(); }
  currentAngle() {
    const ax = this.a.dirWorld(this.axisA);
    const r1 = this.a.dirWorld(this.refA), r2 = this.b.dirWorld(this.refB);
    const p1 = vnorm(vsub(r1, vmul(ax, vdot(r1, ax))));
    const p2 = vnorm(vsub(r2, vmul(ax, vdot(r2, ax))));
    return Math.atan2(vdot(vcross(p1, p2), ax), vdot(p1, p2));
  }
  solve(h) {
    const { a, b } = this;
    // 1. axis alignment (removes 2 rotational DOF)
    const ax = a.dirWorld(this.axisA), bx = b.dirWorld(this.axisB);
    const dtheta = vcross(ax, bx);
    const ra = solveAngular(a, b, dtheta, this.alignCompliance, h, 0);
    if (ra.dl !== 0) this.la = vadd(this.la, vmul(ra.n, ra.dl));
    // 2. actuator about the hinge axis (torque-limited = clamped multiplier)
    this.angle = this.currentAngle();
    if (this.enabled && this.tauMax > 0) {
      const axis = a.dirWorld(this.axisA);
      const maxL = this.tauMax * h * h;
      if (this.mode === 'torque') {
        // direct torque command; reaction on the parent is automatic, so the mount
        // still sees it and can be torn off by an overdriven actuator
        let tot = Math.max(-maxL, Math.min(maxL, this.tauCmd * h * h));
        const dl = tot - this.lm;
        this.lm = tot;
        const p = vmul(axis, dl);
        if (b.invMass) rotateBy(b, applyInvI(b, p), +1);
        if (a.invMass) rotateBy(a, applyInvI(a, p), -1);
        this.saturated = Math.abs(this.tauCmd) > this.tauMax;
      } else {
        // Position mode is a real PD actuator with FINITE stiffness and damping, not a
        // rigid constraint. A near-zero-compliance servo has effectively infinite gain,
        // so millirad-level noise in a control signal becomes kN.m of oscillating torque.
        let e = this.target - this.angle;
        e = Math.atan2(Math.sin(e), Math.cos(e));
        const wRel = vdot(vsub(b.w, a.w), axis);
        // Feedforward rides ON TOP of the servo. A balance loop that replaces the PD
        // term throws away the passive stiffness holding the posture up.
        const tauPD = this.kp * e - this.kd * wRel + this.tauFF;
        let tot = Math.max(-maxL, Math.min(maxL, tauPD * h * h));
        const dl = tot - this.lm;
        this.lm = tot;
        const p = vmul(axis, dl);
        if (b.invMass) rotateBy(b, applyInvI(b, p), +1);
        if (a.invMass) rotateBy(a, applyInvI(a, p), -1);
        this.saturated = Math.abs(tauPD) > this.tauMax;
      }
    }
    // 3. joint angle limits (hard)
    if (this.limits) {
      const ang = this.currentAngle();
      let viol = 0;
      if (ang < this.limits[0]) viol = ang - this.limits[0];
      else if (ang > this.limits[1]) viol = ang - this.limits[1];
      if (viol !== 0) solveAngular(a, b, vmul(a.dirWorld(this.axisA), viol), 0, h, 0);
    }
    // 4. anchor
    const r1 = a.dirWorld(this.ra), r2 = b.dirWorld(this.rb);
    const err = vsub(vadd(b.x, r2), vadd(a.x, r1));
    const rp = solvePositional(a, b, r1, r2, err, this.compliance, h, 0);
    if (rp.dl !== 0) this.lp = vadd(this.lp, vmul(rp.n, rp.dl));
  }
  measure(h) {
    const inv = 1 / (h * h);
    this.tau = this.lm * inv;
    this.F = vmul(this.lp, inv);
    this.T = vmul(this.la, inv);
    const n = this.a.dirWorld(this.axisA);
    this.Fax = vdot(this.F, n);
    this.Fsh = vlen(vsub(this.F, vmul(n, this.Fax)));
    this.Mb = vlen(this.T);                 // alignment constraint is perpendicular to the axis
    this.Mt = Math.abs(this.tau);           // actuator torque is reacted by the mount
    this.util = structuralUtil(this.lim, this.Fax, this.Fsh, this.Mb, this.Mt);
    if (this.util > this.peakUtil) this.peakUtil = this.util;
    if (this.util >= 1) { this.broken = true; this.brokeAtUtil = this.util; }
  }
}

/* ---------------- Contacts: box corners vs ground plane y = 0 ---------------- */
class GroundContacts {
  constructor(o = {}) {
    this.mu = o.mu ?? 0.9;
    this.restitution = o.restitution ?? 0;
    this.compliance = o.compliance ?? 0;
    this.active = [];
  }
  /* Collected once per SUBSTEP with a speculative margin that scales with how far the
     corner can travel in one substep. Collecting per frame lets a fast corner tunnel
     through the plane between collections and then take a huge push-out next frame. */
  collect(bodies, h) {
    this.active.length = 0;
    for (const b of bodies) {
      if (!b.half || b.invMass === 0) continue;
      const hx = b.half.x, hy = b.half.y, hz = b.half.z;
      const margin = 0.01 + 2 * (Math.abs(b.v.y) + vlen(b.w) * vlen(b.half)) * h;
      for (let i = 0; i < 8; i++) {
        const lp = V((i & 1 ? hx : -hx), (i & 2 ? hy : -hy), (i & 4 ? hz : -hz));
        const wp = b.toWorld(lp);
        if (wp.y < margin) this.active.push({ b, lp, lambda: 0, lambdaT: 0 });
      }
    }
  }
  solve(h) {
    for (const c of this.active) {
      const b = c.b;
      const wp = b.toWorld(c.lp);
      const depth = -wp.y;
      if (depth <= 0) { c.lambda = 0; continue; }
      const r = qrot(b.q, c.lp);
      const n = V(0, 1, 0);
      const w = genInvMass(b, r, n);
      if (w < 1e-18) continue;
      const a = this.compliance / (h * h);
      const dl = (depth - a * c.lambda) / (w + a);
      c.lambda += dl;
      const p = vmul(n, dl);
      b.x = vadd(b.x, vmul(p, b.invMass));
      rotateBy(b, applyInvI(b, vcross(r, p)), +1);
      // Static friction resists motion of the contact point relative to where it sat at
      // the START of the substep (pre-integration pose), NOT relative to a mid-solve
      // snapshot -- measuring from mid-solve makes friction fight the normal push-out
      // and inject energy.
      const wpNew = b.toWorld(c.lp);
      const wpPrev = vadd(b.xp, qrot(b.qp, c.lp));
      const d = vsub(wpNew, wpPrev);
      const dt = V(d.x, 0, d.z);
      const dtl = vlen(dt);
      if (dtl > 1e-9) {
        const tn = vmul(dt, -1 / dtl);
        const r2 = qrot(b.q, c.lp);
        const wt = genInvMass(b, r2, tn);
        if (wt > 1e-18) {
          let dlt = dtl / wt;
          const maxT = this.mu * c.lambda;
          if (c.lambdaT + dlt > maxT) dlt = Math.max(0, maxT - c.lambdaT);
          if (dlt > 0) {
            c.lambdaT += dlt;
            const pt = vmul(tn, dlt);
            b.x = vadd(b.x, vmul(pt, b.invMass));
            rotateBy(b, applyInvI(b, vcross(r2, pt)), +1);
          }
        }
      }
    }
  }
  normalForce(h) { let s = 0; for (const c of this.active) s += c.lambda / (h * h); return s; }
}

/* ---------------- Pair non-penetration ----------------
   The solver has ground contact only, so two bodies could pass straight through each
   other. Feet did exactly that. This is a separating-axis test on the six face normals
   of two boxes; for bodies that stay near-level (which feet do) the nine edge-edge axes
   contribute nothing, so they are skipped.

   The correction is applied through both centres with no torque. That is not full
   contact dynamics -- a real contact acts at the overlap region and would spin the
   bodies -- but it makes interpenetration impossible without introducing a new source
   of angular energy into a gait that is already sensitive. */
class PairCollision {
  constructor(o) {
    this.a = o.a; this.b = o.b;
    this.compliance = o.compliance ?? 0;
    this.margin = o.margin ?? 0;         // keep this much clear air between them
    this.depth = 0; this.maxDepth = 0;
  }
  reset() { this.lam = 0; }
  axes() {
    const A = quatToM3(this.a.q), B = quatToM3(this.b.q);
    return [
      V(A[0], A[3], A[6]), V(A[1], A[4], A[7]), V(A[2], A[5], A[8]),
      V(B[0], B[3], B[6]), V(B[1], B[4], B[7]), V(B[2], B[5], B[8]),
    ];
  }
  extent(body, n) {
    const M = quatToM3(body.q), h = body.half;
    return Math.abs(n.x * M[0] + n.y * M[3] + n.z * M[6]) * h.x
         + Math.abs(n.x * M[1] + n.y * M[4] + n.z * M[7]) * h.y
         + Math.abs(n.x * M[2] + n.y * M[5] + n.z * M[8]) * h.z;
  }
  solve(h) {
    const { a, b } = this;
    if (!a.half || !b.half) return;
    const d = vsub(b.x, a.x);
    let best = Infinity, axis = null;
    for (const n of this.axes()) {
      const ov = this.extent(a, n) + this.extent(b, n) + this.margin - Math.abs(vdot(d, n));
      if (ov <= 0) { this.depth = 0; return; }        // separated on this axis: done
      if (ov < best) { best = ov; axis = vdot(d, n) < 0 ? vmul(n, -1) : n; }
    }
    this.depth = best;
    if (best > this.maxDepth) this.maxDepth = best;
    const w1 = a.invMass, w2 = b.invMass, ws = w1 + w2;
    if (ws < 1e-18) return;
    const al = this.compliance / (h * h);
    const dl = (best - al * this.lam) / (ws + al);
    this.lam += dl;
    const p = vmul(axis, dl);
    if (w1) a.x = vsub(a.x, vmul(p, w1));
    if (w2) b.x = vadd(b.x, vmul(p, w2));
  }
}

/* ---------------- World ---------------- */
class World {
  constructor(o = {}) {
    this.g = o.gravity || V(0, -9.81, 0);
    this.bodies = [];
    this.joints = [];
    this.welds = [];
    this.pairs = [];
    this.contacts = new GroundContacts(o.contact || {});
    this.substeps = o.substeps ?? 20;
    this.iterations = o.iterations ?? 1;
    this.time = 0;
    this.breakEvents = [];
    this.enableGround = o.enableGround ?? true;
  }
  add(b) { this.bodies.push(b); return b; }
  addJoint(j) { this.joints.push(j); return j; }
  addWeld(w) { this.welds.push(w); return w; }
  addPair(p) { this.pairs.push(p); return p; }

  step(dt) {
    const n = this.substeps, h = dt / n;
    for (const b of this.bodies) { b._cImp = 0; b._cCop = V(); }
    for (let s = 0; s < n; s++) {
      if (this.enableGround) this.contacts.collect(this.bodies, h);
      for (const b of this.bodies) integrate(b, h, this.g);
      for (const j of this.joints) j.reset();
      for (const w of this.welds) w.reset();
      for (const p of this.pairs) p.reset();
      for (let it = 0; it < this.iterations; it++) {
        for (const j of this.joints) if (!j.broken) j.solve(h);
        for (const w of this.welds) w.solve(h);
        for (const p of this.pairs) p.solve(h);
        if (this.enableGround) this.contacts.solve(h);
      }
      for (const c of this.contacts.active) {
        if (c.lambda > 0) {
          c.b._cImp += c.lambda;
          c.b._cCop = vadd(c.b._cCop, vmul(c.b.toWorld(c.lp), c.lambda));
        }
      }
      for (const b of this.bodies) updateVel(b, h);
      for (const j of this.joints) {
        if (j.broken) continue;
        j.measure(h);
        if (j.broken) {
          this.breakEvents.push({ t: this.time + (s + 1) * h, joint: j.name, util: j.brokeAtUtil, F: j.F, T: j.T });
          j.b.detached = true;
        }
      }
      for (const w of this.welds) {
        w.measure(h);
        if (w.broken && !w.reported) {
          w.reported = true;
          this.breakEvents.push({ t: this.time + (s + 1) * h, weld: w.name, util: w.brokeAtUtil, F: w.F, T: w.T });
          w.b.detached = true;
        }
      }
      this.time += h;
    }
    // frame-averaged contact load: a single substep snapshot is far too noisy to
    // feed a controller
    for (const b of this.bodies) {
      b.contactForce = b._cImp / (n * h * h);
      b.contactCop = b._cImp > 0 ? vmul(b._cCop, 1 / b._cImp) : null;
    }
  }
  energy() {
    let e = 0;
    for (const b of this.bodies) {
      if (b.invMass === 0) continue;
      e += b.kinetic() + b.mass * (-this.g.y) * b.x.y;
    }
    return e;
  }
  com() {
    let M = 0, c = V();
    for (const b of this.bodies) { if (b.invMass === 0) continue; M += b.mass; c = vadd(c, vmul(b.x, b.mass)); }
    return { mass: M, pos: vmul(c, 1 / M) };
  }
}

function integrate(b, h, g) {
  if (b.invMass === 0) { b.xp = b.x; b.qp = b.q; return; }
  b.v = vadd(b.v, vmul(vadd(g, vmul(b.fExt, b.invMass)), h));
  b.xp = b.x;
  b.x = vadd(b.x, vmul(b.v, h));
  // implicit gyroscopic term (one Newton step), then external torque
  let wl = qrotInv(b.q, b.w);
  const Iw = m3mulv(b.I, wl);
  const resid = vmul(vcross(wl, Iw), h);
  const J = m3add(b.I, m3scale(m3sub(m3mul(skew(wl), b.I), skew(Iw)), h));
  wl = vsub(wl, m3mulv(m3inv(J), resid));
  const tl = qrotInv(b.q, b.tExt);
  wl = vadd(wl, vmul(m3mulv(b.invI, tl), h));
  b.w = qrot(b.q, wl);
  b.qp = b.q;
  b.q = qnorm(qmul(qExp(vmul(b.w, h)), b.q));
}
function updateVel(b, h) {
  if (b.invMass === 0) return;
  const vPrev = b.v, wPrev = b.w;
  b.v = vmul(vsub(b.x, b.xp), 1 / h);
  let dq = qmul(b.q, qconj(b.qp));
  if (dq.w < 0) dq = { x: -dq.x, y: -dq.y, z: -dq.z, w: -dq.w };
  const sv = Math.hypot(dq.x, dq.y, dq.z);          // exact log map
  if (sv < 1e-12) { b.w = V(); b.a = vmul(vsub(b.v, vPrev), 1 / h); b.alpha = vmul(vsub(b.w, wPrev), 1 / h); return; }
  const ang = 2 * Math.atan2(sv, dq.w);
  b.w = vmul(V(dq.x, dq.y, dq.z), ang / (sv * h));
  b.a = vmul(vsub(b.v, vPrev), 1 / h);
  b.alpha = vmul(vsub(b.w, wPrev), 1 / h);
}

// COMBO-ENGINE export block — the ONLY addition to the demo's text above
// (mech-mk1-live-opus-5.html lines 159-789, verbatim; the demo's own header
// says the physics was bundled from gated modules "unmodified except module
// syntax removal" — this block puts the module syntax back).
export {
  V, vadd, vsub, vmul, vdot, vcross, vlen, vlen2, vnorm,
  Q, qmul, qconj, qnorm, qrot, qrotInv, qAxisAngle, qExp,
  m3mulv, m3inv, m3diag, m3add, m3sub, m3scale, skew,
  boxInertia, cylInertiaY, sphereInertia, compound, quatToM3, m3transpose, m3mul,
  Body, genInvMass, angInvMass, applyInvI, rotateBy,
  solvePositional, solveAngular, orientationError, structuralUtil, NO_LIMIT,
  Weld, Hinge, GroundContacts, PairCollision, World, integrate, updateVel,
};
