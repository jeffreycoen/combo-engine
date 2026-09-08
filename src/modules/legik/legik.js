// MODULE: legik — leg inverse kinematics for one leg, lifted VERBATIM MATH
// from the mech demo, lines 807 to 857 (LEG 807, legIK 813 to 846, legFK
// 849 to 857). Serves the checklist box "Leg inverse kinematics". Ten leg
// joints and six loop-closure constraints mean only four angles per leg
// are independently commandable; legIK solves them from a desired ankle
// position held level, legFK verifies the solution.
//
// Substitutions, numbered, and only these:
// 1. `const LEG = ...` becomes `export const LEG = ...`. The option names
//    thigh, shin, maxExtend and the default 0.995 are the demo's own.
// 2. legFK's `V(a, b, c)` (the demo's vector maker) becomes the plain
//    object literal `{ x: a, y: b, z: c }`. No import.
// 3. `export` is added to legIK and legFK. legFK carries as the verifier
//    the demo names it.
// 4. Added: LEGS_CONTRACT and checkLegs(o), a contract with no demo
//    source.

export const LEG = { thigh: 1.50, shin: 1.45 };

/* Solve for the five joint angles that put the ankle pivot at `d`, expressed in the
   pelvis frame relative to the hip pivot, with the sole held flat.
   Returns { hipRoll, hipPitch, knee, anklePitch, ankleRoll, reach } where `reach` is the
   fraction of full leg extension demanded (>=1 means the target is unreachable). */
export function legIK(d, opts = {}) {
  const Lt = opts.thigh ?? LEG.thigh, Ls = opts.shin ?? LEG.shin;
  const maxR = (Lt + Ls) * (opts.maxExtend ?? 0.995);

  // Hip roll puts the sagittal plane of the leg through the target. Positive rotation
  // about +X carries the downward leg axis toward -Z, so reaching toward +Z needs a
  // NEGATIVE roll.
  const hipRoll = -Math.atan2(d.z, -d.y);

  // in that plane: a = forward offset, b = drop
  const a = d.x;
  const b = Math.hypot(d.y, d.z);
  let r = Math.hypot(a, b);
  const reach = r / (Lt + Ls);
  if (r > maxR) r = maxR;
  if (r < Math.abs(Lt - Ls) + 1e-4) r = Math.abs(Lt - Ls) + 1e-4;

  // knee from the law of cosines; joint angle is the supplement of the interior angle
  const cosInterior = (Lt * Lt + Ls * Ls - r * r) / (2 * Lt * Ls);
  const interior = Math.acos(Math.max(-1, Math.min(1, cosInterior)));
  const knee = Math.PI - interior;

  // thigh sits `alpha` off the hip->ankle line, which itself sits `beta` off vertical
  const beta = Math.atan2(a, b);
  const cosAlpha = (Lt * Lt + r * r - Ls * Ls) / (2 * Lt * r);
  const alpha = Math.acos(Math.max(-1, Math.min(1, cosAlpha)));
  const hipPitch = beta - alpha;

  // level sole: the three pitch joints must sum to zero; roll cancels the hip roll
  const anklePitch = -(hipPitch + knee);
  const ankleRoll = -hipRoll;

  return { hipRoll, hipPitch, knee, anklePitch, ankleRoll, reach };
}

/* Forward kinematics of the same chain, used to verify the inverse. */
export function legFK(q, opts = {}) {
  const Lt = opts.thigh ?? LEG.thigh, Ls = opts.shin ?? LEG.shin;
  const thighTilt = q.hipPitch;
  const shinTilt = q.hipPitch + q.knee;
  const a = Lt * Math.sin(thighTilt) + Ls * Math.sin(shinTilt);
  const b = Lt * Math.cos(thighTilt) + Ls * Math.cos(shinTilt);
  // the planar solution lives in the rolled plane: down axis is R_x(roll) * (0,-1,0)
  return { x: a, y: -b * Math.cos(q.hipRoll), z: -b * Math.sin(q.hipRoll) };
}

// The contract: legs is thigh and shin over 0, maxExtend in (0, 1] when given.
export const LEGS_CONTRACT = { thigh: "number > 0", shin: "number > 0", maxExtend: "number in (0, 1], optional" };

// checkLegs(o) -> every problem with a legs table, in one pass, empty when clean.
export function checkLegs(o) {
  const problems = [];
  if (typeof o !== "object" || o === null) {
    problems.push("legs: not an object");
    return problems;
  }
  if (!(typeof o.thigh === "number" && o.thigh > 0)) problems.push("legs.thigh: number > 0 required");
  if (!(typeof o.shin === "number" && o.shin > 0)) problems.push("legs.shin: number > 0 required");
  if (o.maxExtend !== undefined && !(typeof o.maxExtend === "number" && o.maxExtend > 0 && o.maxExtend <= 1)) {
    problems.push("legs.maxExtend: number in (0, 1] required");
  }
  return problems;
}
