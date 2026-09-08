// MODULE: presets — labeled cheats for the mech rig. Lifted VERBATIM MATH
// from the mech demo (mech-mk1-live-opus-5.html lines 1664 to 1693, the six
// presets and applyPreset; lines 1722 to 1731, the fallback defaults).
// Serves the checklist box "Labeled-cheat presets: every relaxed rule
// named, with its measured consequence." Each preset relaxes one rule the
// gate suites enforce; applyPreset scales the rig's actuators and mounts
// by the preset's own dials.
//
// Substitutions, numbered, and only these:
//   1. Each row carries every dial field the demo sets, flat and untouched
//      (label, hipOffset, footWidth, copClamp, torque, envelope, inertia,
//      gravity, swing, whichever the row has). The demo's `steps` field is
//      renamed `consequence`, text verbatim. A `rule` field is added: the
//      note's own bold sentence, its tags and its leading word "Breaks "
//      dropped. The `note` field carries the demo's note text with its
//      HTML tags dropped. The verified row carries rule: "", baseline: true.
//   2. applyPreset(rig, p) is the demo's function verbatim, reading the
//      flat fields, with m3inv imported from physics-pb instead of living
//      as a demo global.
//   3. Added: PRESET_DEFAULTS, the demo's buildWorld fallbacks, and
//      resolvePreset(p), returning a copy of the row with every missing
//      one of those four filled from the defaults.
//   4. `export` added to PRESETS and applyPreset.
//   5. Added: PRESET_CONTRACT and checkPreset(p), a contract with no demo
//      source.

import { m3inv } from "../physics-pb/physics.js";

export const PRESETS = {
  verified: {
    label: "Verified",
    consequence: "32 steps, 11.6 m at 0.24 m/s",
    note: "Exactly the build the gate suites pass. Every other preset is measured against this one.",
    rule: "",
    baseline: true,
  },
  narrow: {
    label: "Narrow Track",
    hipOffset: 0.42, footWidth: 0.55, copClamp: 0.95, torque: 1.3, envelope: 1.5,
    consequence: "4 steps then falls",
    note: "The old humanoid stance: hips at 0.42 m on 0.55 m feet. Reads far more like a person and walks worse, which is why the base rig is now 2.30 m across. Needs magnetic feet to manage even ten steps. Breaks W1: the centre of pressure may sit outside the support polygon.",
    rule: "W1: the centre of pressure may sit outside the support polygon.",
  },
  heavy: {
    label: "Heavy Iron",
    inertia: 0.35, torque: 1.5, envelope: 1.6, swing: 1.25,
    consequence: "2 steps then falls",
    note: "Rotational inertia cut to 35%, actuators x1.5. Mass and ground reaction stay honest so it still lands right, it just responds like something lighter than it is. Breaks G2: angular momentum is no longer physical.",
    rule: "G2: angular momentum is no longer physical.",
  },
  lunar: {
    label: "Lunar",
    gravity: 3.0, torque: 2.0, envelope: 2.2, swing: 1.4,
    consequence: "24 steps at 0.15 m/s",
    note: "Gravity 3.0 m/s2. Long floating strides, and far less friction to push against, so it skates. Breaks G1 and G3: every constant derived from 9.81 changes.",
    rule: "G1 and G3: every constant derived from 9.81 changes.",
  },
  overdrive: {
    label: "Overdriven",
    torque: 3.0,
    consequence: "1 step, then limbs come off",
    note: "Actuators x3 against unchanged mounts. Full actuator torque was already 73% of the mount envelope, so x3 is 220% and the rig dismantles itself the moment it loads a leg. Breaks R7 on purpose.",
    rule: "R7 on purpose.",
  },
  glass: {
    label: "Glass Cannon",
    envelope: 0.32,
    consequence: "shears before it steps",
    note: "Mount envelopes cut to a third with stock actuators. Standing alone is near failure. Breaks R5: static utilisation exceeds the envelope.",
    rule: "R5: static utilisation exceeds the envelope.",
  },
};

/* Raising tauMax must NOT raise the servo gains (that tore the rig at frame 0), and
   cutting inertia MUST scale the gains with it or the servo is no longer tuned. */
export function applyPreset(rig,p){
  if(p.inertia) for(const b of Object.values(rig.bodies)){ b.I=b.I.map(v=>v*p.inertia); b.invI=m3inv(b.I); }
  for(const j of Object.values(rig.joints)){
    if(p.torque) j.tauMax*=p.torque;
    if(p.inertia){ j.kp*=p.inertia; j.kd*=p.inertia; }
    if(p.envelope) for(const k of ['tension','shear','bend','torsion']) j.lim[k]*=p.envelope;
  }
  for(const w of Object.values(rig.welds))
    if(p.envelope) for(const k of ['tension','shear','bend','torsion']) w.lim[k]*=p.envelope;
}

// The demo's buildWorld fallbacks: gravity, friction, copClamp, swing (tSS)
// whenever a preset row leaves them out.
export const PRESET_DEFAULTS = { gravity: 9.81, friction: 1.0, copClamp: 0.45, swing: 0.90 };

// resolvePreset(p) -> a copy of the row with gravity, friction, copClamp,
// swing filled from PRESET_DEFAULTS wherever the row itself leaves them out.
export function resolvePreset(p) {
  const r = { ...p };
  for (const k of Object.keys(PRESET_DEFAULTS)) if (r[k] === undefined) r[k] = PRESET_DEFAULTS[k];
  return r;
}

// The contract: a preset needs a label and its two texts; every dial it
// carries is a positive number (gravity may be zero).
export const PRESET_CONTRACT = {
  label: "string",
  inertia: "number > 0, optional",
  torque: "number > 0, optional",
  envelope: "number > 0, optional",
  gravity: "number >= 0, optional",
  hipOffset: "number > 0, optional",
  footWidth: "number > 0, optional",
  copClamp: "number > 0, optional",
  swing: "number > 0, optional",
  consequence: "non-empty string",
  rule: "non-empty string unless baseline",
};

// checkPreset(p) -> every problem with a preset row, in one pass, empty when clean.
export function checkPreset(p) {
  const problems = [];
  if (typeof p !== "object" || p === null) {
    problems.push("preset: not an object");
    return problems;
  }
  if (typeof p.label !== "string") problems.push("preset.label: string required");
  const posDials = ["inertia", "torque", "envelope", "hipOffset", "footWidth", "copClamp", "swing"];
  for (const k of posDials) {
    if (p[k] !== undefined && !(typeof p[k] === "number" && p[k] > 0)) problems.push(`preset.${k}: number > 0 required`);
  }
  if (p.gravity !== undefined && !(typeof p.gravity === "number" && p.gravity >= 0)) problems.push("preset.gravity: number >= 0 required");
  if (!(typeof p.consequence === "string" && p.consequence.length > 0)) problems.push("preset.consequence: non-empty string required");
  if (p.baseline !== true && !(typeof p.rule === "string" && p.rule.length > 0)) problems.push("preset.rule: non-empty string required");
  return problems;
}
