// COMBO-ENGINE import line — with the export block below, the ONLY additions
// to the demo's text (mech-mk1-live-opus-5.html lines 860-1063, verbatim;
// the demo's header says these were gated modules with module syntax
// removed — these two blocks put it back, against the physics-pb module).
import { V, vadd, vsub, vmul, vnorm, vcross, Q, qmul, qrot, qAxisAngle,
  Body, boxInertia, Hinge, Weld, PairCollision } from "../physics-pb/physics.js";
// mech.mjs — rig definition and assembly.
//
// Frame convention: +Y up, +X forward (sagittal), +Z left (lateral). Mech faces +X.
// Hinge axes: Z = pitch (fore/aft swing), X = roll (lateral).
//
// Every link is a box: blocky by design, physics first. The visual mesh will later
// hang off these proxies without touching the solver.
//
// Second pass, the general parts order, phase A13. Substitutions, and only
// these:
//   1. The limb chain becomes data: MECH_SPEC gains limbChain, the seven
//      per-side rows verbatim, in order, with jpSide marking the two rows
//      (upperArm, hipYoke) whose jp flips z with the side.
//   2. sideChain(s, side, spec = MECH_SPEC) builds its rows from
//      spec.limbChain: name is row.name + side, parent is row.parent + side
//      when the parent names a row in the chain, else the parent as
//      written; jp is a copy times s on z when jpSide, else a copy; every
//      other field is copied.
//   3. buildLinkTable(spec = MECH_SPEC) calls sideChain(s, side, spec).
//   4. assembleMech names its links through options: opts.footLinks,
//      opts.hipLinks, opts.pairs, each defaulted to the demo's own names.
//      opts.footClearance keeps its meaning through the pairs default.
//   5. RIG_SPEC_CONTRACT names the spec's shape; checkRigSpec(spec) returns
//      every problem in one pass, empty when clean.
//
// Third pass, phase 0.0.111 of the order batch-ark-1. One numbered note:
//   1. A scale option: scaledSpec(spec, s) and assembleMech's opts.scale
//      (default 1). Every length (dim, jp, jc) times s; every mass times
//      s^3 (inertia follows through the builders, s^5); every hinge's
//      tauMax times s^4, kp and kd following as already derived; every
//      mount limit's tension and shear times s^2, bend and torsion times
//      s^3; targetHeight times s; range, angle0, and every other field
//      untouched. At s 1 the rig is the landed rig exactly.


const D = Math.PI / 180;

/* Link table. Dimensions are [x, y, z] extents in metres, mass in kg.
   joint: position of the joint in PARENT local frame and in CHILD local frame.
   tauMax in N.m, lim in N / N.m. */
const MECH_SPEC = {
  name: 'MK1',
  targetHeight: 6.4,
  root: 'pelvis',
  links: {
    pelvis:    { mass: 2800, dim: [0.90, 0.62, 1.95] },
    torso:     { mass: 1200, dim: [1.35, 0.58, 2.05], parent: 'pelvis', type: 'weld',
                 jp: [0, 0.31, 0], jc: [0, -0.29, 0],
                 lim: { tension: 900e3, shear: 800e3, bend: 600e3, torsion: 500e3 } },
    head:      { mass: 320,  dim: [0.85, 0.50, 1.10], parent: 'torso', type: 'weld',
                 jp: [0, 0.29, 0], jc: [0, -0.25, 0],
                 lim: { tension: 120e3, shear: 100e3, bend: 45e3, torsion: 30e3 } },
  },
  // limbs are generated for both sides; s = +1 left (+Z), -1 right
  limbs: [
    { side: 'L', s: +1 }, { side: 'R', s: -1 },
  ],
  // Per-side chain, base names (no side letter): parent -> child with joint
  // spec. jpSide marks the two rows whose jp the demo passes through S(),
  // the lateral flip by s. Verbatim numbers, sideChain's own seven rows, in
  // order.
  limbChain: [
    { name: 'upperArm', parent: 'torso', mass: 350, dim: [0.42, 0.95, 0.42],
      type: 'hinge', axis: [0, 0, 1], angle0: 4 * D, jp: [0, 0.12, 1.025], jc: [0, 0.475, 0],
      tauMax: 12e3, range: [-150 * D, 60 * D],
      lim: { tension: 220e3, shear: 180e3, bend: 95e3, torsion: 25e3 }, jpSide: true },
    { name: 'foreArm', parent: 'upperArm', mass: 200, dim: [0.36, 0.80, 0.36],
      type: 'hinge', axis: [0, 0, 1], angle0: -8 * D, jp: [0, -0.475, 0], jc: [0, 0.40, 0],
      tauMax: 6e3, range: [-140 * D, 0],
      lim: { tension: 180e3, shear: 150e3, bend: 70e3, torsion: 15e3 } },

    { name: 'hipYoke', parent: 'pelvis', mass: 120, dim: [0.40, 0.34, 0.40],
      type: 'hinge', axis: [1, 0, 0], angle0: 0, jp: [0, -0.31, 0.60], jc: [0, 0, 0],
      tauMax: 70e3, range: [-35 * D, 35 * D],
      lim: { tension: 420e3, shear: 340e3, bend: 210e3, torsion: 95e3 }, jpSide: true },
    { name: 'thigh', parent: 'hipYoke', mass: 450, dim: [0.50, 1.50, 0.50],
      type: 'hinge', axis: [0, 0, 1], angle0: -9 * D, jp: [0, 0, 0], jc: [0, 0.75, 0],
      tauMax: 95e3, range: [-45 * D, 110 * D],
      lim: { tension: 420e3, shear: 340e3, bend: 210e3, torsion: 130e3 } },
    { name: 'shin', parent: 'thigh', mass: 300, dim: [0.42, 1.45, 0.42],
      type: 'hinge', axis: [0, 0, 1], angle0: 18 * D, jp: [0, -0.75, 0], jc: [0, 0.725, 0],
      tauMax: 95e3, range: [0, 130 * D],
      lim: { tension: 380e3, shear: 300e3, bend: 180e3, torsion: 130e3 } },
    { name: 'ankleYoke', parent: 'shin', mass: 90, dim: [0.34, 0.30, 0.34],
      type: 'hinge', axis: [0, 0, 1], angle0: -9 * D, jp: [0, -0.725, 0], jc: [0, 0, 0],
      tauMax: 40e3, range: [-40 * D, 30 * D],
      lim: { tension: 350e3, shear: 280e3, bend: 150e3, torsion: 55e3 } },
    { name: 'foot', parent: 'ankleYoke', mass: 400, dim: [0.95, 0.30, 1.10],
      type: 'hinge', axis: [1, 0, 0], angle0: 0, jp: [0, 0, 0], jc: [-0.10, 0.15, 0],
      tauMax: 28e3, range: [-25 * D, 25 * D],
      lim: { tension: 350e3, shear: 280e3, bend: 150e3, torsion: 40e3 } },
  ],
};

/* Per-side chain: parent -> child with joint spec. Lateral offsets are multiplied by s.
   Built from spec.limbChain; jpSide rows have jp's z flip with the side. */
function sideChain(s, side, spec = MECH_SPEC) {
  const S = (v) => [v[0], v[1], v[2] * s];
  const names = new Set(spec.limbChain.map((row) => row.name));
  return spec.limbChain.map((row) => ({
    name: row.name + side,
    parent: names.has(row.parent) ? row.parent + side : row.parent,
    mass: row.mass,
    dim: [...row.dim],
    type: row.type,
    axis: [...row.axis],
    angle0: row.angle0,
    jp: row.jpSide ? S(row.jp) : [...row.jp],
    jc: [...row.jc],
    tauMax: row.tauMax,
    range: [...row.range],
    lim: { ...row.lim },
  }));
}

function buildLinkTable(spec = MECH_SPEC) {
  const table = {};
  for (const [name, L] of Object.entries(spec.links)) table[name] = { name, ...L };
  for (const { side, s } of spec.limbs) for (const L of sideChain(s, side, spec)) table[L.name] = L;
  return table;
}

/* pick a unit vector perpendicular to `axis`, used as the hinge angle reference */
function perpTo(axis) {
  const a = vnorm(axis);
  const t = Math.abs(a.x) < 0.9 ? V(1, 0, 0) : V(0, 1, 0);
  return vnorm(vcross(a, t));
}

/* One row (a core link or a limbChain row) scaled by s under the phase 0.0.111 law.
   dim, jp, jc times s; mass times s^3; tauMax times s^4; lim.tension and lim.shear
   times s^2; lim.bend and lim.torsion times s^3. axis and range are copied, not
   scaled -- angles and dimensionless fields are untouched. */
function scaleRow(L, s) {
  const out = { ...L };
  if (L.dim) out.dim = L.dim.map((v) => v * s);
  if (L.jp) out.jp = L.jp.map((v) => v * s);
  if (L.jc) out.jc = L.jc.map((v) => v * s);
  if (L.axis) out.axis = [...L.axis];
  if (L.range) out.range = [...L.range];
  if (L.mass !== undefined) out.mass = L.mass * s ** 3;
  if (L.tauMax !== undefined) out.tauMax = L.tauMax * s ** 4;
  if (L.lim) {
    out.lim = { ...L.lim };
    if (L.lim.tension !== undefined) out.lim.tension = L.lim.tension * s ** 2;
    if (L.lim.shear !== undefined) out.lim.shear = L.lim.shear * s ** 2;
    if (L.lim.bend !== undefined) out.lim.bend = L.lim.bend * s ** 3;
    if (L.lim.torsion !== undefined) out.lim.torsion = L.lim.torsion * s ** 3;
  }
  return out;
}

/* scaledSpec(spec, s) -> a deep copy of spec with the phase 0.0.111 scaling law
   applied to every core (links) and limbChain row, and to targetHeight. At s 1
   the copy equals spec exactly. */
function scaledSpec(spec, s) {
  const links = {};
  for (const [name, L] of Object.entries(spec.links)) links[name] = scaleRow(L, s);
  const limbChain = spec.limbChain.map((row) => scaleRow(row, s));
  return { ...spec, links, limbChain, targetHeight: spec.targetHeight * s };
}

/* Assemble the rig into `world`. rootPos places the pelvis COM.
   Returns { bodies, joints, welds, byName } with joints keyed by child link name. */
function assembleMech(world, opts = {}) {
  const scale = opts.scale ?? 1;
  const spec = scaledSpec(opts.spec ?? MECH_SPEC, scale);
  const table = buildLinkTable(spec);
  const footLinks = opts.footLinks || ['footL', 'footR'];
  const hipLinks = opts.hipLinks || ['hipYokeL', 'hipYokeR'];
  const pairs = opts.pairs || [['footL', 'footR', opts.footClearance ?? (0.04 * scale)], ['shinL', 'shinR', 0.02 * scale]];
  // geometry overrides for design sweeps
  if (opts.footWidth) for (const name of footLinks) table[name].dim[2] = opts.footWidth;
  if (opts.hipOffset) for (const name of hipLinks) table[name].jp[2] = Math.sign(table[name].jp[2]) * opts.hipOffset;
  const bodies = {}, joints = {}, welds = {};

  const mk = (L, pos, quat) => {
    const [dx, dy, dz] = L.dim;
    const b = new Body({
      name: L.name, mass: L.mass, inertia: boxInertia(L.mass, dx, dy, dz),
      pos, quat,
    });
    b.half = V(dx / 2, dy / 2, dz / 2);
    b.dim = V(dx, dy, dz);
    return world.add(b);
  };

  const root = table[spec.root];
  bodies[root.name] = mk(root, opts.rootPos || V(0, 3.55, 0), Q());

  // place children breadth-first so every parent exists before its child
  const pending = Object.values(table).filter((L) => L.parent);
  let guard = 0;
  while (pending.length && guard++ < 1000) {
    for (let i = 0; i < pending.length; i++) {
      const L = pending[i];
      const P = bodies[L.parent];
      if (!P) continue;
      const jp = V(...L.jp), jc = V(...L.jc);
      const jointWorld = P.toWorld(jp);
      let q;
      if (L.type === 'hinge') q = qmul(P.q, qAxisAngle(V(...L.axis), L.angle0 || 0));
      else q = P.q;
      const pos = vsub(jointWorld, qrot(q, jc));
      const b = mk(L, pos, q);
      bodies[L.name] = b;

      if (L.type === 'hinge') {
        const ax = vnorm(V(...L.axis));
        const ref = perpTo(ax);
        const j = new Hinge({
          name: L.name, a: P, b, ra: jp, rb: jc,
          axisA: ax, axisB: ax, refA: ref, refB: ref,
          tauMax: L.tauMax, target: L.angle0 || 0, limits: L.range,
          kp: L.kp ?? (L.tauMax / (3 * Math.PI / 180)) * (opts.kpScale ?? 1),
          kd: L.kd ?? (L.tauMax / (3 * Math.PI / 180)) * (opts.kdScale ?? 0.06),
          lim: L.lim,
        });
        world.addJoint(j);
        joints[L.name] = j;
      } else {
        const w = new Weld({
          name: L.name, a: P, b, ra: jp, rb: jc,
          axis: V(0, 1, 0), lim: L.lim,
        });
        world.addWeld(w);
        welds[L.name] = w;
      }
      pending.splice(i--, 1);
    }
  }
  if (pending.length) throw new Error('unresolved links: ' + pending.map((l) => l.name).join(','));

  // Feet (and shins) must not pass through each other. Nothing else in the solver
  // prevents it, and the walk drifts inward far enough to need it.
  for (const [a, b, margin] of pairs) world.addPair(new PairCollision({ a: bodies[a], b: bodies[b], margin }));

  return { bodies, joints, welds, table, spec, scale };
}

/* Drop the rig so the lowest point of either foot sits exactly on y = 0. */
function groundRig(rig) {
  let lowest = Infinity;
  for (const b of Object.values(rig.bodies)) {
    if (!b.half) continue;
    for (let i = 0; i < 8; i++) {
      const p = b.toWorld(V(i & 1 ? b.half.x : -b.half.x, i & 2 ? b.half.y : -b.half.y, i & 4 ? b.half.z : -b.half.z));
      if (p.y < lowest) lowest = p.y;
    }
  }
  for (const b of Object.values(rig.bodies)) b.x = vadd(b.x, V(0, -lowest, 0));
  return -lowest;
}

/* Shift the rig horizontally so its COM starts directly over the mean ankle position.
   Assembling with a crouch leaves the COM ahead of the ankles, which is a large initial
   disturbance for the balance controller to absorb before it has done anything wrong. */
/* Horizontal offset from the COM to the mean ankle pivot in the assembled stance.
   The crouch is chosen so this is already small; it is reported, not corrected, because
   correcting it by translation is a no-op (the ankles move with the rig) and correcting
   it by joint trim is the balance controller's job. */
function comAnkleOffset(rig) {
  let M = 0, c = V();
  for (const b of Object.values(rig.bodies)) { M += b.mass; c = vadd(c, vmul(b.x, b.mass)); }
  c = vmul(c, 1 / M);
  let ax = 0, az = 0;
  for (const s of ['L', 'R']) {
    const p = rig.bodies[`foot${s}`].toWorld(V(-0.10, 0.15, 0));
    ax += p.x / 2; az += p.z / 2;
  }
  return V(c.x - ax, 0, c.z - az);
}

/* Total mass, COM, and standing height of the assembled rig. */
function rigStats(rig) {
  let M = 0, c = V(), top = -Infinity, bottom = Infinity;
  for (const b of Object.values(rig.bodies)) {
    M += b.mass; c = vadd(c, vmul(b.x, b.mass));
    for (let i = 0; i < 8; i++) {
      const p = b.toWorld(V(i & 1 ? b.half.x : -b.half.x, i & 2 ? b.half.y : -b.half.y, i & 4 ? b.half.z : -b.half.z));
      if (p.y > top) top = p.y;
      if (p.y < bottom) bottom = p.y;
    }
  }
  return { mass: M, com: vmul(c, 1 / M), height: top - bottom, top, bottom };
}

// RIG_SPEC_CONTRACT: the rig spec's shape, plain field descriptions.
export const RIG_SPEC_CONTRACT = {
  root: 'names an existing link',
  links: 'object of link rows: mass number > 0, dim 3 numbers, parent (when present) an existing link',
  limbs: 'array',
  limbChain: 'array of chain rows: name string, parent string, mass number > 0, dim 3 numbers, type hinge or weld, jp 3 numbers, jc 3 numbers',
};

// checkRigSpec(spec): every problem with a rig spec, in one pass, empty when clean.
export function checkRigSpec(spec) {
  if (typeof spec !== 'object' || spec === null) return ['rigSpec: not an object'];
  const problems = [];
  const linksOk = typeof spec.links === 'object' && spec.links !== null;
  const linkNames = linksOk ? Object.keys(spec.links) : [];
  if (!(typeof spec.root === 'string' && linkNames.includes(spec.root))) problems.push('rigSpec.root: names an existing link required');
  if (!linksOk) problems.push('rigSpec.links: object required');
  else for (const name of linkNames) {
    const L = spec.links[name];
    if (!(typeof L.mass === 'number' && L.mass > 0)) problems.push(`rigSpec.links.${name}.mass: number > 0 required`);
    if (!(Array.isArray(L.dim) && L.dim.length === 3 && L.dim.every((n) => typeof n === 'number'))) problems.push(`rigSpec.links.${name}.dim: 3 numbers required`);
    if ('parent' in L && !linkNames.includes(L.parent)) problems.push(`rigSpec.links.${name}.parent: an existing link required`);
  }
  if (!Array.isArray(spec.limbs)) problems.push('rigSpec.limbs: array required');
  if (!Array.isArray(spec.limbChain)) problems.push('rigSpec.limbChain: array required');
  else spec.limbChain.forEach((row, i) => {
    if (typeof row.name !== 'string') problems.push(`rigSpec.limbChain.${i}.name: string required`);
    if (typeof row.parent !== 'string') problems.push(`rigSpec.limbChain.${i}.parent: string required`);
    if (!(typeof row.mass === 'number' && row.mass > 0)) problems.push(`rigSpec.limbChain.${i}.mass: number > 0 required`);
    if (!(Array.isArray(row.dim) && row.dim.length === 3 && row.dim.every((n) => typeof n === 'number'))) problems.push(`rigSpec.limbChain.${i}.dim: 3 numbers required`);
    if (!(row.type === 'hinge' || row.type === 'weld')) problems.push(`rigSpec.limbChain.${i}.type: hinge or weld required`);
    if (!(Array.isArray(row.jp) && row.jp.length === 3 && row.jp.every((n) => typeof n === 'number'))) problems.push(`rigSpec.limbChain.${i}.jp: 3 numbers required`);
    if (!(Array.isArray(row.jc) && row.jc.length === 3 && row.jc.every((n) => typeof n === 'number'))) problems.push(`rigSpec.limbChain.${i}.jc: 3 numbers required`);
  });
  return problems;
}

// COMBO-ENGINE export block — see the import note above.
export { MECH_SPEC, sideChain, buildLinkTable, perpTo, scaledSpec, assembleMech, groundRig, comAnkleOffset, rigStats };
