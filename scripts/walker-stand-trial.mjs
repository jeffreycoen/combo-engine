// walker-stand-trial.mjs — phase 0.0.111 trial script. Not a gate, not registered.
// Adapted from the walker survey's scratch script scale-stand.mjs (read-only,
// outside the repository): assembles the rig at scale 0.607 through the new
// assembleMech scale option, stands it under gravity with gait's own
// BalanceController (its defaults, reading the rig's own scale) at dt 1/60,
// substeps 12, and reports the stand law: zero break events, no foot airborne
// after the first 0.5 s, and the pelvis height at 10 s within 5 percent of its
// height at 0.5 s.
import { assembleMech, groundRig, rigStats } from "../src/modules/rig/rig.js";
import { World } from "../src/modules/physics-pb/physics.js";
import { groundTruthState, BalanceController } from "../src/modules/gait/gait.js";

const SCALE = 0.607;
const dt = 1 / 60;
const totalSteps = Math.round(10 / dt);

const w = new World({ substeps: 12, iterations: 4, contact: { mu: 1.0 } });
const rig = assembleMech(w, { scale: SCALE });
groundRig(rig);
const balance = new BalanceController(rig);

const stats0 = rigStats(rig);
console.log(`assembled: scale=${rig.scale} mass=${stats0.mass.toFixed(4)} kg height=${stats0.height.toFixed(4)} m pelvisY0=${rig.bodies.pelvis.x.y.toFixed(4)} m`);

let nextReport = 0.5;
let pelvisAtStart = null;
let airborneAfterHalf = false;

for (let step = 0; step < totalSteps; step++) {
  const stBefore = groundTruthState(rig, 9.81);
  balance.update(stBefore, dt);
  w.step(dt);
  const t = (step + 1) * dt;

  const stAfter = groundTruthState(rig, 9.81);
  const footAirborne = !stAfter.feet.L.contact || !stAfter.feet.R.contact;
  if (footAirborne && t > 0.5 + 1e-9) airborneAfterHalf = true;

  if (t >= nextReport - 1e-9) {
    const pelvisY = rig.bodies.pelvis.x.y;
    const breaks = w.breakEvents.length;
    console.log(`t=${t.toFixed(1)}s pelvisY=${Number.isFinite(pelvisY) ? pelvisY.toFixed(4) : pelvisY} breaks=${breaks} airborne=${footAirborne ? "yes" : "no"}`);
    if (pelvisAtStart === null) pelvisAtStart = pelvisY;
    nextReport += 0.5;
  }
}

const pelvisEnd = rig.bodies.pelvis.x.y;
const breaks = w.breakEvents.length;
const fmt = (v) => (Number.isFinite(v) ? v.toFixed(4) : String(v));
console.log(`stand ${SCALE}: breaks ${breaks} airborne ${airborneAfterHalf ? "yes" : "no"} pelvis ${fmt(pelvisAtStart)} -> ${fmt(pelvisEnd)}`);
