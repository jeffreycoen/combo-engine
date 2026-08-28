// COMBO-ENGINE — rig-test: the rig module's gate. Nine checks against the
// demo's own numbers, standing on the physics-pb module. Seedless — assembly
// and the solver contain no randomness.
import { MECH_SPEC, buildLinkTable, assembleMech, groundRig, comAnkleOffset, rigStats } from "../src/modules/rig/rig.js";
import { World } from "../src/modules/physics-pb/physics.js";

let pass = 0, fail = 0;
const check = (name, ok) => { if (ok) { pass++; console.log("PASS " + name); } else { fail++; console.log("FAIL " + name); } };

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

console.log(`rig-test: ${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
console.log("rig-test PASS");
