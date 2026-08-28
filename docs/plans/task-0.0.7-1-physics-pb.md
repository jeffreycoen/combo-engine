# Task 0.0.7-1 — the position-based physics core

One job: extract the seventh module — the mech demo's physics core, verbatim by hash — write its gate, and land the phase with the record close and the two-commit stamp. You design nothing.

Suggested model: Sonnet 5.

Required reading, in order (confirm at the top of your report):
1. This file, whole.
2. `docs/plans/phase-0.0.7-physics-pb-module.md`, whole.

Source (READ ONLY — the extraction command reads it; nothing ever writes to it): `mech-mk1-live-opus-5.html` lines 159–789.

## Steps

Run from `/home/batman/combo-engine`. A failed assert stops the task; report the step and its verbatim output, run nothing further.

1. Assert the ground: eight gates green, destination absent. Required tails — api ends `worldHash 3367709165  runHash 2717846799`; combat `ALL PASS`; accuracy `11/11`; market `market-test PASS`; builder `builder-test PASS`; ledger `ledger-test PASS`; weldstress `weldstress-test PASS`; tape `tape-test PASS`; the `ls` prints `absent`.

```sh
for g in api combat accuracy market builder ledger weldstress tape; do node scripts/gate.mjs $g | tail -1; done
ls src/modules/physics-pb 2>/dev/null || echo absent
```

2. Extract the module: the demo's lines verbatim, then the export block appended exactly as written here.

```sh
mkdir -p src/modules/physics-pb
sed -n '159,789p' mech-mk1-live-opus-5.html > src/modules/physics-pb/physics.js
cat >> src/modules/physics-pb/physics.js <<'BLOCK'

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
BLOCK
```

3. The file hash is the verbatim proof. Must print OK.

```sh
echo "12d5ca25a5195b360f967d330f19d0cd3fefe1ea4963185ad2c4aca04b9e9b46  src/modules/physics-pb/physics.js" | sha256sum -c
```

4. Write `scripts/physics-pb-test.mjs`, exactly:

```js
// COMBO-ENGINE — physics-pb-test: the position-based physics core's gate.
// Eleven checks: inertia arithmetic exact, dynamics deterministic and pinned
// to measured values. Seedless — the core contains no randomness.
import { V, Q, boxInertia, compound, qAxisAngle, structuralUtil,
  Body, Weld, Hinge, GroundContacts, PairCollision, World } from "../src/modules/physics-pb/physics.js";

let pass = 0, fail = 0;
const check = (name, ok) => { if (ok) { pass++; console.log("PASS " + name); } else { fail++; console.log("FAIL " + name); } };
const near = (a, b, eps = 1e-9) => Math.abs(a - b) < eps;

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

console.log(`physics-pb-test: ${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
console.log("physics-pb-test PASS");
```

Then its hash. Must print OK.

```sh
echo "e70e05f543c17651d0d57e46d0aedca4d4c36bef9849dcf80af898850df1cdd5  scripts/physics-pb-test.mjs" | sha256sum -c
```

5. In `scripts/gate.mjs`, in the `GATES` table (currently eight entries ending with `"tape"`), add one line after the `"tape"` entry:

```js
  "physics-pb": ["scripts/physics-pb-test.mjs"],
```

Touch nothing else in the file.

6. Run the new gate. Required output: eleven PASS lines, then exactly `physics-pb-test: 11 PASS / 0 FAIL`, then `physics-pb-test PASS`, exit 0. Any FAIL stops the task before step 7.

```sh
node scripts/gate.mjs physics-pb
```

7. Assert the prior gates did not move (same required tails as step 1), then close the records in this landing:
   - Bump `package.json` version to `0.0.7`.
   - In `docs/plans/phase-0.0.7-physics-pb-module.md`, replace the status line with: `Status: LANDED, commit stamped below, 2026-08-28. Gate: 11 PASS / 0 FAIL; prior gates unmoved.`
   - In `README.md`, flip `- [ ] The position-based physics core (the mech island coldsnap already reserves a hook for)` to `- [x]`.
   - In `docs/plans/STATE.md`: set the first line to `Current phase: none active. Last landed: 0.0.7.`; append ` · 0.0.7 physics-pb (pending)` to the Landed line; add `physics-pb` to the gates line; replace `first non-deadweight organ` in the next-candidates line with `mech failure envelopes and rig table onto physics-pb · deadweight grapple · frozen-time aiming`.

8. Commit and push the landing, then stamp the real hash in a second small commit — NEVER amend after stamping:

```sh
git add src/modules/physics-pb scripts/physics-pb-test.mjs scripts/gate.mjs README.md package.json docs/plans
git commit -m "phase 0.0.7 — the position-based physics core lands, verbatim by hash

The mech demo's core, lines 159-789 plus one export block: welds and
hinges with failure envelopes, servos, ground friction, pair separation.
Gate: 11 PASS / 0 FAIL.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push origin main
H=$(git rev-parse --short HEAD)
sed -i "s/commit stamped below/commit \\`$H\\`/" docs/plans/phase-0.0.7-physics-pb-module.md
sed -i "s/0.0.7 physics-pb (pending)/0.0.7 physics-pb (\\`$H\\`)/" docs/plans/STATE.md
git add docs/plans && git commit -m "phase 0.0.7 record stamped — $H

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push origin main
```

## Acceptance

- Steps 3 and 4: both sha256 checks print OK — the module is verbatim, the gate is as planned.
- Step 6: `physics-pb-test: 11 PASS / 0 FAIL` then `physics-pb-test PASS`, exit 0, and an `ok` line in `.superpowers/gates.log`.
- Step 7: all eight prior gates unchanged; four records flipped riding the landing commit.
- Step 8: both pushes accepted; the stamped hash is the pushed landing commit's.

## Report

Read-confirmation first, then one line of outcome, then bullets: both hash-check outputs, the physics gate's count and verdict lines verbatim, the eight prior-gate tails, both commit hashes (landing and stamp), the push results. Every nonconformity its own labeled bullet. Fixture seeds: none — the core contains no randomness; the api re-check runs seed 1; no seed is special.
