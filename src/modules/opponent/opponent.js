// MODULE: opponent — the non-lethal opponent model, lifted VERBATIM MATH
// from the shooting-range demo (holdover-greybox-range-r55, lines
// 1543-1566 the dials, 1599-1632 what a round does to a person). Per-part
// thresholds, knockdown by accumulated impulse, sedation by dart dose, a
// lethal energy line. Fidelity was proven against the demo's own text at
// lift time, in the trial, per the harvest law; the demo stays outside
// the record. Substitutions, numbered, and only these:
//   1. The page's agent object -> makeAgentState(), carrying exactly the
//      fields the hit law reads and writes.
//   2. Function name agentHit -> hitAgent (the page keeps its own).
export const AG = {
  PART: {
    h:   { drop: 1.4,  carry: 1.00, lethalE: 400,  label: "head" },
    n:   { drop: 1.8,  carry: 0.95, lethalE: 350,  label: "neck" },
    "":  { drop: 7.5,  carry: 0.70, lethalE: 1500, label: "torso" },
    arL: { drop: 14.0, carry: 0.30, lethalE: 2200, label: "left arm" },
    arR: { drop: 14.0, carry: 0.30, lethalE: 2200, label: "right arm" },
    lgL: { drop: 12.0, carry: 0.35, lethalE: 2000, label: "left leg" },
    lgR: { drop: 12.0, carry: 0.35, lethalE: 2000, label: "right leg" },
    ft:  { drop: 18.0, carry: 0.20, lethalE: 2400, label: "foot" },
  },
  STUN_DECAY: 0.55,
  SED_RATE: 0.85,
  SED_ONSET: 3.2,
  VIEW_DEG: 118,
  VIEW_M: 85,
  HEAR_M: 55,
  AIM_S: 1.15,
  REAIM_S: 0.55,
  SPREAD_MRAD: 17.0,
  LOSE_S: 6.0,
};

// makeAgentState(): the fields the laws read and write, and nothing else.
export function makeAgentState() {
  return { stun: 0, sed: 0, sedT: 0, down: 0, killed: 0, state: "idle",
    lastHit: "", hitLog: [], seeT: 0, loseT: 0, aimT: 0, shots: 0, limp: 0, armed: 1 };
}

// hitAgent(a, partSuffix, energyDeposited, impulse, roundName): the demo's
// own law, verbatim — what a round does to a person.
export function hitAgent(a, partSuffix, energyDeposited, impulse, roundName) {
  if (a.down) return { effect: "already down" };
  var P = AG.PART[partSuffix] || AG.PART[""];
  var res = { part: P.label, impulse: impulse, energy: energyDeposited, effect: "", lethal: 0 };

  if (roundName === "tranq_dart") {
    a.sed += impulse * AG.SED_RATE / 0.5;
    if (a.sed >= 1) { a.sedT = a.sedT || AG.SED_ONSET; res.effect = "sedated, going under"; }
    else res.effect = "darted (" + Math.round(a.sed * 100) + "% dose)";
    a.lastHit = res.effect;
    a.hitLog.push(res);
    return res;
  }

  if (energyDeposited > P.lethalE) {
    a.killed = 1; a.down = 1; a.state = "down";
    res.lethal = 1; res.effect = "LETHAL — " + P.label;
    a.lastHit = res.effect; a.hitLog.push(res);
    return res;
  }

  a.stun += (impulse / P.drop) * P.carry;
  if (partSuffix === "lgL" || partSuffix === "lgR") a.limp = Math.min(1, a.limp + impulse / P.drop);

  if (a.stun >= 1) {
    a.down = 1; a.state = "down";
    res.effect = "down — " + P.label;
  } else if (a.stun > 0.55) res.effect = "staggered (" + P.label + ")";
  else res.effect = "hit " + P.label + ", still up";

  a.lastHit = res.effect;
  a.hitLog.push(res);
  return res;
}
