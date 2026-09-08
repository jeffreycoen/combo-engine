// COMBO-ENGINE — physics-pb-test: the position-based physics core's gate.
// Sixteen checks: inertia arithmetic exact, dynamics deterministic and pinned
// to measured values in the eleven landed checks, seedless; the five added
// roll a seed, printed, for the ground height and the contract.
import { V, Q, boxInertia, compound, qAxisAngle, structuralUtil,
  Body, Weld, Hinge, GroundContacts, PairCollision, World, makeWorld, checkBody } from "../src/modules/physics-pb/physics.js";
import { readFileSync } from "node:fs";

let pass = 0, fail = 0;
const check = (name, ok) => { if (ok) { pass++; console.log("PASS " + name); } else { fail++; console.log("FAIL " + name); } };
const near = (a, b, eps = 1e-9) => Math.abs(a - b) < eps;

// the small seeded stream the other gates use
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const SEED = process.env.SEED ? (parseInt(process.env.SEED, 10) >>> 0) : ((Math.random() * 0xffffffff) >>> 0);
console.log(`seeds {"physics-pb":${SEED}}`);
const rng = mulberry32(SEED);
const rollIn = (lo, hi) => lo + rng() * (hi - lo);

check("box inertia is exact: 12 kg, 1x2x3 m -> diag 13, 10, 5",
  (() => { const I = boxInertia(12, 1, 2, 3); return I[0] === 13 && I[4] === 10 && I[8] === 5 && I[1] === 0; })());
check("compound of two 1 kg points 2 m apart: mass 2, com centered, parallel-axis 2 kg m2",
  (() => { const c = compound([
    { mass: 1, inertia: boxInertia(1, 0.001, 0.001, 0.001), pos: V(0, 1, 0) },
    { mass: 1, inertia: boxInertia(1, 0.001, 0.001, 0.001), pos: V(0, -1, 0) }]);
    return c.mass === 2 && near(c.com.y, 0) && near(c.inertia[0], 2, 1e-5) && near(c.inertia[4], 0, 1e-5); })());
check("structural utilization: half the tension limit reads 0.5; compression reads 0",
  structuralUtil({ tension: 100, shear: 1, bend: 1, torsion: 1 }, 50, 0, 0, 0) === 0.5 &&
  structuralUtil({ tension: 100, shear: 1, bend: 1, torsion: 1 }, -50, 0, 0, 0) === 0);

const mkWorld = () => new World({ substeps: 20, iterations: 1 });
const mkBox = (o) => { const b = new Body(Object.assign({ mass: 10, inertia: boxInertia(10, 1, 1, 1) }, o)); b.half = V(0.5, 0.5, 0.5); return b; };

check("free fall is the integrator's own number: 1 s from rest falls exactly 9.81x1201/2400 = 4.9090875 m",
  (() => { const w = mkWorld(); w.enableGround = false; const b = w.add(mkBox({ pos: V(0, 10, 0) }));
    for (let i = 0; i < 60; i++) w.step(1 / 60);
    return near(b.x.y, 10 - 4.9090875, 1e-6) && near(b.v.y, -9.81, 1e-6); })());
check("free fall is deterministic: two worlds, bit-identical position",
  (() => { const run = () => { const w = mkWorld(); w.enableGround = false; const b = w.add(mkBox({ pos: V(0, 10, 0) }));
    for (let i = 0; i < 60; i++) w.step(1 / 60); return b.x.y; }; return run() === run(); })());
check("a dropped box lands and rests on the ground plane: y = 0.5 within 2 mm, asleep in speed",
  (() => { const w = mkWorld(); const b = w.add(mkBox({ pos: V(0, 1.2, 0) }));
    for (let i = 0; i < 180; i++) w.step(1 / 60);
    return near(b.x.y, 0.5, 2e-3) && Math.abs(b.v.y) < 1e-2; })());
check("the ground reports the resting weight: normal force 98.1 N within 1%",
  (() => { const w = mkWorld(); const b = w.add(mkBox({ pos: V(0, 0.51, 0) }));
    let f = 0; for (let i = 0; i < 120; i++) { w.step(1 / 60); f = b.contactForce; }
    return Math.abs(f - 98.1) / 98.1 < 0.01; })());
check("a weld carries a hanging load and measures it: axial force magnitude within 2% of 98.1 N",
  (() => { const w = mkWorld(); w.enableGround = false;
    const a = w.add(mkBox({ kinematic: true, pos: V(0, 2, 0) }));
    const b = w.add(mkBox({ pos: V(0, 1, 0) }));
    const weld = w.addWeld(new Weld({ name: "w", a, b, ra: V(0, -0.5, 0), rb: V(0, 0.5, 0), axis: V(0, 1, 0) }));
    let fax = 0; for (let i = 0; i < 120; i++) { w.step(1 / 60); fax = weld.Fax; }
    return Math.abs(Math.abs(fax) - 98.1) / 98.1 < 0.02; })());
check("a weld past its envelope breaks and the break is on the event log (axis faces the load: tension is positive along the weld normal)",
  (() => { const w = mkWorld(); w.enableGround = false;
    const a = w.add(mkBox({ kinematic: true, pos: V(0, 2, 0) }));
    const b = w.add(mkBox({ pos: V(0, 1, 0) }));
    w.addWeld(new Weld({ name: "frail", a, b, ra: V(0, -0.5, 0), rb: V(0, 0.5, 0), axis: V(0, -1, 0), lim: { tension: 50 } }));
    for (let i = 0; i < 60; i++) w.step(1 / 60);
    return w.welds[0].broken && w.breakEvents.length === 1 && w.breakEvents[0].weld === "frail" && b.detached; })());
check("a hinge servo drives to its target: 0.3 rad within 0.01 in half a second",
  (() => { const w = mkWorld(); w.enableGround = false; w.g = V(0, 0, 0);
    const a = w.add(mkBox({ kinematic: true }));
    const b = w.add(mkBox({ pos: V(0, -1.2, 0) }));
    const h = w.addJoint(new Hinge({ name: "h", a, b, ra: V(0, -0.6, 0), rb: V(0, 0.6, 0),
      axisA: V(0, 0, 1), refA: V(1, 0, 0), tauMax: 500, target: 0.3 }));
    for (let i = 0; i < 30; i++) w.step(1 / 60);
    return Math.abs(h.angle - 0.3) < 0.01; })());
check("pair collision keeps two boxes apart: no interpenetration below the margin",
  (() => { const w = mkWorld(); w.enableGround = false; w.g = V(0, 0, 0);
    const a = w.add(mkBox({ pos: V(-0.6, 0, 0), vel: V(2, 0, 0) }));
    const b = w.add(mkBox({ pos: V(0.6, 0, 0), vel: V(-2, 0, 0) }));
    w.addPair(new PairCollision({ a, b, margin: 0.04 }));
    for (let i = 0; i < 60; i++) w.step(1 / 60);
    return (b.x.x - a.x.x) >= 1.03; })());

{ let ok = true;
  for (let i = 0; i < 5; i++) {
    const groundY = rollIn(-5, 5);
    const w = new World({ substeps: 20, iterations: 1, groundY });
    const b = w.add(mkBox({ pos: V(0, groundY + 1.2, 0) }));
    for (let s = 0; s < 180; s++) w.step(1 / 60);
    if (!(near(b.x.y, groundY + 0.5, 2e-3) && Math.abs(b.v.y) < 1e-2)) ok = false;
  }
  check("physics-pb: at a rolled groundY a dropped box rests with its lowest corner at groundY within 2 mm", ok); }

{ let ok = true;
  for (let i = 0; i < 5; i++) {
    const groundY = rollIn(-5, 5);
    const w = new World({ substeps: 20, iterations: 1, groundY });
    const b = w.add(mkBox({ pos: V(0, groundY + 0.51, 0) }));
    let f = 0; for (let s = 0; s < 120; s++) { w.step(1 / 60); f = b.contactForce; }
    if (!(Math.abs(f - 98.1) / 98.1 < 0.01)) ok = false;
  }
  check("physics-pb: the resting weight law holds at a rolled groundY", ok); }

check("physics-pb: makeWorld builds the class's own world",
  (() => {
    const w1 = makeWorld({ substeps: 20, iterations: 1 });
    if (!(w1 instanceof World)) return false;
    w1.enableGround = false;
    const b1 = w1.add(mkBox({ pos: V(0, 10, 0) }));
    for (let i = 0; i < 60; i++) w1.step(1 / 60);
    const w2 = new World({ substeps: 20, iterations: 1 });
    w2.enableGround = false;
    const b2 = w2.add(mkBox({ pos: V(0, 10, 0) }));
    for (let i = 0; i < 60; i++) w2.step(1 / 60);
    return b1.x.y === b2.x.y;
  })());

check("physics-pb: the contract counts every problem",
  checkBody({ mass: 0, inertia: [1, 2, 3] }).length === 2 &&
  checkBody({ kinematic: true }).length === 0 &&
  checkBody({ mass: 3 }).length === 0 &&
  checkBody(null).length === 1);

{ const src = readFileSync(new URL("../src/modules/physics-pb/physics.js", import.meta.url), "utf8");
  const specifiers = [...src.matchAll(/^import\s+.*?\bfrom\s+["']([^"']+)["']/gm)].map((m) => m[1]);
  const ok = specifiers.every((spec) => /^\.\.\/[a-z0-9-]+\//.test(spec) || /^\.\//.test(spec));
  check("physics-pb: the module imports only from its own folder or a sibling module", ok); }

console.log(`physics-pb-test: ${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
console.log("physics-pb-test PASS");
