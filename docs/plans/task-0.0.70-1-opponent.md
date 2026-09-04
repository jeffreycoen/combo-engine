# Task 0.0.70-1 — the non-lethal opponent model

One job: land the non-lethal opponent model, byte-for-byte from this plan. Write exactly what is written, run the listed gates, report. You design nothing.

Suggested model: Sonnet 5.

Required reading, in order (confirm at the top of your report):
1. This file, whole.
2. `docs/plans/phase-0.0.70-opponent.md`, whole.

## Steps

Run from `/home/batman/combo-engine`. A failed assert stops the task; report the step and its verbatim output, run nothing further.

1. Assert the ground:

```sh
node scripts/gate.mjs physics-pb | tail -1   # must print: physics-pb-test PASS
ls src/modules/opponent/opponent.js 2>/dev/null || echo absent   # must print: absent
```

2. Write `src/modules/opponent/opponent.js`, exactly:

```js
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
```

Then `sha256sum src/modules/opponent/opponent.js` — must print `6443442c0a23de3b0baaeda50114c68b65eba3038d43205880339450aa2d304b`.

3. Write `scripts/opponent-test.mjs`, exactly:

```js
// COMBO-ENGINE — opponent-test. Laws at rolled hits: the lethal line kills
// through any part at its own energy and never under it; knockdown is
// accumulated impulse against the part's own drop and carry; legs limp;
// darts dose and the full dose starts the clock; a downed man takes no
// more; the log keeps every hit.
import { AG, makeAgentState, hitAgent } from "../src/modules/opponent/opponent.js";
let pass = 0, fail = 0;
const check = (n, ok) => { if (ok) { pass++; console.log("PASS " + n); } else { fail++; console.log("FAIL " + n); } };
const SEED = process.env.SEED ? +process.env.SEED : Math.floor(Math.random() * 1e9);
console.log("seeds " + JSON.stringify({ hits: SEED }));
let a2 = SEED >>> 0;
const rnd = () => { a2 = (a2 + 0x6d2b79f5) >>> 0; let t = a2; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const PARTS = Object.keys(AG.PART);

{ let lethal = true;
  for (let i = 0; i < 400 && lethal; i++) {
    const p = PARTS[Math.floor(rnd() * PARTS.length)];
    const over = hitAgent(makeAgentState(), p, AG.PART[p].lethalE * (1.01 + rnd()), 0.1, "ball");
    const under = hitAgent(makeAgentState(), p, AG.PART[p].lethalE * rnd() * 0.99, 0.01, "ball");
    lethal = over.lethal === 1 && under.lethal === 0;
  }
  check("opponent: the lethal line holds through every part — over kills, under never", lethal); }
{ let drop = true;
  for (let i = 0; i < 400 && drop; i++) {
    const p = PARTS[Math.floor(rnd() * PARTS.length)];
    const P = AG.PART[p];
    const a = makeAgentState();
    const r = hitAgent(a, p, 1, (P.drop / P.carry) * (1.001 + rnd()), "ball");
    drop = a.down === 1 && a.killed === 0 && r.lethal === 0;
  }
  check("opponent: knockdown by impulse — a part's own drop through its own carry puts a man down, alive", drop); }
{ let carry = true;
  for (let i = 0; i < 300 && carry; i++) {
    const a = makeAgentState();
    const imp = rnd() * 3;
    hitAgent(a, "", 1, imp, "ball");
    carry = Math.abs(a.stun - (imp / AG.PART[""].drop) * AG.PART[""].carry) < 1e-12;
  }
  check("opponent: a partial hit carries exactly its stated fraction", carry); }
{ const a = makeAgentState();
  hitAgent(a, "lgL", 1, 6, "ball");
  const b = makeAgentState();
  hitAgent(b, "arL", 1, 6, "ball");
  check("opponent: legs limp, arms never", a.limp === 0.5 && b.limp === 0); }
{ const a = makeAgentState();
  const half = hitAgent(a, "", 1, 0.3, "tranq_dart");
  const full = hitAgent(a, "", 1, 0.3, "tranq_dart");
  check("opponent: darts dose by impulse and the full dose starts the going-under clock",
    half.effect.startsWith("darted") && a.sed >= 1 && a.sedT === AG.SED_ONSET && full.effect === "sedated, going under"); }
{ const a = makeAgentState();
  hitAgent(a, "h", 999, 1, "ball");
  const again = hitAgent(a, "h", 9999, 99, "ball");
  check("opponent: a downed man takes no more, and the log kept every real hit",
    again.effect === "already down" && a.hitLog.length === 1); }
console.log(`opponent-test: ${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
console.log("opponent-test PASS");
```

Then `sha256sum scripts/opponent-test.mjs` — must print `ecffb3c2fd699af6f677ead268543e26aa834b999a13db6bc3bd8c08807a2433`.

4. In `scripts/gate.mjs`, in the GATES table, add one line after the `"telemetry"` entry:

```js
  "opponent": ["scripts/opponent-test.mjs"],
```

5. Run the new gate — seeds line, 6 PASS lines, `opponent-test: 6 PASS / 0 FAIL`, `opponent-test PASS`, exit 0:

```sh
node scripts/gate.mjs opponent
```

6. Bracket unmoved: `node scripts/gate.mjs physics-pb | tail -1` — must print `physics-pb-test PASS`.

7. Close the records: `package.json` version to `0.0.70`; the phase doc's status line to LANDED as its comment shows; in `docs/plans/batch-harvest-1.md` flip this rung's box; in `README.md` flip the checklist box starting `- [ ] The non-lethal opponent model` to `- [x]`, and add the line `- [x] opponent — the non-lethal opponent model — 0.0.70` at the bottom of the "Serving checklist items" list.

8. Commit and push, then stamp:

```sh
git add src/modules/opponent/opponent.js scripts/opponent-test.mjs scripts/gate.mjs package.json README.md docs/plans/phase-0.0.70-opponent.md docs/plans/task-0.0.70-1-opponent.md docs/plans/batch-harvest-1.md
git commit -m "phase 0.0.70 — the non-lethal opponent model

Checklist: The non-lethal opponent model. Gate 6 PASS / 0 FAIL at rolled seeds; physics-pb unmoved.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push origin main
H=$(git rev-parse --short HEAD)
sed -i "s/commit stamped below/commit \`$H\`/" docs/plans/phase-0.0.70-opponent.md
git add docs/plans/phase-0.0.70-opponent.md && git commit -m "phase 0.0.70 record stamped — $H

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push origin main
```

## Acceptance

- Every sha256 above exact; the gate `6 PASS / 0 FAIL` then `opponent-test PASS` at rolled seeds; physics-pb's tail unchanged; records flipped riding the landing; pushes accepted.

## Report

Read-confirmation first, then one line of outcome, then bullets: the sha256 lines verbatim, the new gate's seeds/count/verdict lines, the physics-pb tail, both commit hashes, the push results. Every nonconformity its own labeled bullet.
