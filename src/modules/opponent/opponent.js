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
//
// Second pass, the general parts order (batch-general-1, phase A14): the
// part table, the dials, and the sedative round names move to a maker;
// the hit law itself is untouched. Substitutions, numbered, and only
// these:
//   1. The hit law's body becomes an internal hitWith(a, partSuffix,
//      energyDeposited, impulse, roundName, parts, dials, sedative), read
//      line for line: AG.PART[partSuffix] || AG.PART[""] becomes
//      parts[partSuffix] || parts[""], AG.SED_RATE becomes dials.SED_RATE,
//      AG.SED_ONSET becomes dials.SED_ONSET, and roundName ===
//      "tranq_dart" becomes sedative.includes(roundName).
//   2. AG_DIALS and SEDATIVE_ROUNDS are exported, the demo's dial values
//      and dart name, as the defaults.
//   3. hitAgent calls hitWith with AG.PART, AG_DIALS, and SEDATIVE_ROUNDS.
//   4. makeOpponent(opts) returns a surface bound to opts.parts,
//      opts.dials, and opts.sedative, default the same three.
//   5. PARTS_CONTRACT states the part table's shape; checkParts(table)
//      checks it, every problem in one pass.
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

// hitWith(a, partSuffix, energyDeposited, impulse, roundName, parts,
// dials, sedative): the demo's own law, verbatim, reading the part table,
// the dials, and the sedative round list as arguments.
function hitWith(a, partSuffix, energyDeposited, impulse, roundName, parts, dials, sedative) {
  if (a.down) return { effect: "already down" };
  var P = parts[partSuffix] || parts[""];
  var res = { part: P.label, impulse: impulse, energy: energyDeposited, effect: "", lethal: 0 };

  if (sedative.includes(roundName)) {
    a.sed += impulse * dials.SED_RATE / 0.5;
    if (a.sed >= 1) { a.sedT = a.sedT || dials.SED_ONSET; res.effect = "sedated, going under"; }
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

// AG_DIALS: the demo's own dial values, the default for makeOpponent.
export const AG_DIALS = { STUN_DECAY: AG.STUN_DECAY, SED_RATE: AG.SED_RATE, SED_ONSET: AG.SED_ONSET, VIEW_DEG: AG.VIEW_DEG, VIEW_M: AG.VIEW_M, HEAR_M: AG.HEAR_M, AIM_S: AG.AIM_S, REAIM_S: AG.REAIM_S, SPREAD_MRAD: AG.SPREAD_MRAD, LOSE_S: AG.LOSE_S };

// SEDATIVE_ROUNDS: the demo's own dart name, the default for makeOpponent.
export const SEDATIVE_ROUNDS = ["tranq_dart"];

// hitAgent(a, partSuffix, energyDeposited, impulse, roundName): the flat
// export, hitWith bound to the demo's own table, dials, and sedative list.
export function hitAgent(a, partSuffix, energyDeposited, impulse, roundName) {
  return hitWith(a, partSuffix, energyDeposited, impulse, roundName, AG.PART, AG_DIALS, SEDATIVE_ROUNDS);
}

// makeOpponent(opts): a surface bound to a handed part table, dials, and
// sedative list, default the demo's own three.
export function makeOpponent(opts) {
  var parts = opts.parts || AG.PART;
  var dials = { ...AG_DIALS, ...opts.dials };
  var sedative = opts.sedative || SEDATIVE_ROUNDS;
  return {
    parts, dials, sedative, makeAgentState,
    hitAgent: function (a, part, E, J, round) {
      return hitWith(a, part, E, J, round, parts, dials, sedative);
    },
  };
}

// PARTS_CONTRACT: the shape of a part table. checkParts(table): every
// problem in one pass, empty when clean.
export const PARTS_CONTRACT = { "<suffix>": { drop: "number > 0", carry: "number in 0 to 1", lethalE: "number > 0", label: "string" }, "": "the torso row, required" };

export function checkParts(table) {
  var problems = [];
  if (typeof table !== "object" || table === null) {
    problems.push("parts: not an object");
    return problems;
  }
  if (!("" in table)) problems.push('parts: a "" row required');
  for (var key in table) {
    var row = table[key];
    if (!(typeof row.drop === "number" && row.drop > 0)) problems.push("parts." + key + ".drop: number > 0 required");
    if (!(typeof row.carry === "number" && row.carry >= 0 && row.carry <= 1)) problems.push("parts." + key + ".carry: number in 0 to 1 required");
    if (!(typeof row.lethalE === "number" && row.lethalE > 0)) problems.push("parts." + key + ".lethalE: number > 0 required");
    if (typeof row.label !== "string") problems.push("parts." + key + ".label: string required");
  }
  return problems;
}
