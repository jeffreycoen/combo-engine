# Task 0.0.68-1 — the torque-limited actuators

One job: land the torque-limited actuators, byte-for-byte from this plan. Write exactly what is written, run the listed gates, report. You design nothing.

Suggested model: Sonnet 5.

Required reading, in order (confirm at the top of your report):
1. This file, whole.
2. `docs/plans/phase-0.0.68-actuator.md`, whole.

## Steps

Run from `/home/batman/combo-engine`. A failed assert stops the task; report the step and its verbatim output, run nothing further.

1. Assert the ground:

```sh
node scripts/gate.mjs physics-pb | tail -1   # must print: physics-pb-test PASS
ls scripts/actuator-test.mjs 2>/dev/null || echo absent   # must print: absent
```

2. Write `scripts/actuator-test.mjs`, exactly:

```js
// COMBO-ENGINE — actuator-test: the torque-limited actuator's laws, on the
// engine's own Hinge (byte-identical with the mech demo's live text, proven
// at lift time). One solve, one substep, direct asserts: the clamp holds at
// any rolled command, saturation tells the truth, and the default stiffness
// is the stated one — full torque at three degrees of error.
import { Hinge, Body, V, boxInertia, vlen } from "../src/modules/physics-pb/physics.js";
let pass = 0, fail = 0;
const check = (n, ok) => { if (ok) { pass++; console.log("PASS " + n); } else { fail++; console.log("FAIL " + n); } };
const SEED = process.env.SEED ? +process.env.SEED : Math.floor(Math.random() * 1e9);
console.log("seeds " + JSON.stringify({ torque: SEED }));
let a = SEED >>> 0;
const rnd = () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const H = 1 / 240;
const mk = (o) => { const A = new Body({ mass: 0 }), B = new Body({ mass: 1, inertia: boxInertia(1, 1, 1, 1) });
  const j = new Hinge({ a: A, b: B, ra: V(), rb: V(), axisA: V(0, 1, 0), refA: V(1, 0, 0), ...o });
  j.reset(); return j; };

{ let clamp = true;
  for (let i = 0; i < 500 && clamp; i++) {
    const tauMax = 1 + rnd() * 400;
    const j = mk({ tauMax, mode: "torque" });
    j.tauCmd = (rnd() - 0.5) * 20000;
    j.solve(H);
    clamp = Math.abs(j.lm) <= tauMax * H * H + 1e-15 && j.saturated === (Math.abs(j.tauCmd) > tauMax);
  }
  check("actuator: five hundred rolled commands — the clamp holds at the ceiling and saturation tells the truth", clamp); }
{ let servoClamp = true;
  for (let i = 0; i < 500 && servoClamp; i++) {
    const tauMax = 1 + rnd() * 400;
    const j = mk({ tauMax, target: (rnd() - 0.5) * 3 });
    j.solve(H);
    servoClamp = Math.abs(j.lm) <= tauMax * H * H + 1e-15;
  }
  check("actuator: the servo obeys the same ceiling — finite torque at any rolled error", servoClamp); }
{ let stiff = true;
  for (let i = 0; i < 300 && stiff; i++) {
    const tauMax = 1 + rnd() * 400;
    const j = mk({ tauMax });
    stiff = Math.abs(j.kp - tauMax / (3 * Math.PI / 180)) < 1e-9 && Math.abs(j.kd - j.kp * 0.06) < 1e-9;
  }
  check("actuator: the default stiffness is the stated law — full torque at three degrees, damping at six percent", stiff); }
{ const j = mk({ tauMax: 200, target: 0.5 });
  j.solve(H);
  const moved1 = vlen ? Math.abs(j.lm) : 0;
  const j2 = mk({ tauMax: 200, target: 0.5 });
  j2.enabled = false; j2.solve(H);
  check("actuator: a disabled actuator drives nothing; an enabled one drives toward its target",
    Math.abs(j.lm) > 0 && (j2.lm || 0) === 0); }
{ // a hair of error keeps both drives under the ceiling, so the feedforward shows whole
  // (tauFF is a field, not an option — the constructor zeroes it, the caller sets it)
  const j = mk({ tauMax: 200, target: 0.001 });
  j.tauFF = 50;
  j.solve(H);
  const jNo = mk({ tauMax: 200, target: 0.001 });
  jNo.solve(H);
  check("actuator: feedforward rides on top of the servo, never replaces it", j.lm > jNo.lm); }
console.log(`actuator-test: ${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
console.log("actuator-test PASS");
```

Then `sha256sum scripts/actuator-test.mjs` — must print `11505ea07ad13ba4fa0d4787a92412167ffc3a867edb72b12a6b5230222f6946`.

3. In `scripts/gate.mjs`, in the GATES table, add one line after the `"envelope"` entry:

```js
  "actuator": ["scripts/actuator-test.mjs"],
```

4. Run the new gate — seeds line, 5 PASS lines, `actuator-test: 5 PASS / 0 FAIL`, `actuator-test PASS`, exit 0:

```sh
node scripts/gate.mjs actuator
```

5. Bracket unmoved: `node scripts/gate.mjs physics-pb | tail -1` — must print `physics-pb-test PASS`.

6. Close the records: `package.json` version to `0.0.68`; the phase doc's status line to LANDED as its comment shows; in `docs/plans/batch-harvest-1.md` flip this rung's box; in `README.md` flip the checklist box starting `- [ ] Torque-limited joint actuators` to `- [x]`, and add the line `- [x] actuator laws (mechanism in physics-pb since 0.0.7; laws gated 0.0.68) — torque-limited joint actuators — 0.0.68` at the bottom of the "Serving checklist items" list.

7. Commit and push, then stamp:

```sh
git add scripts/actuator-test.mjs scripts/gate.mjs package.json README.md docs/plans/phase-0.0.68-actuator.md docs/plans/task-0.0.68-1-actuator.md docs/plans/batch-harvest-1.md
git commit -m "phase 0.0.68 — the torque-limited actuators

Checklist: Torque-limited joint actuators. Gate 5 PASS / 0 FAIL at rolled seeds; physics-pb unmoved.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push origin main
H=$(git rev-parse --short HEAD)
sed -i "s/commit stamped below/commit \`$H\`/" docs/plans/phase-0.0.68-actuator.md
git add docs/plans/phase-0.0.68-actuator.md && git commit -m "phase 0.0.68 record stamped — $H

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push origin main
```

## Acceptance

- Every sha256 above exact; the gate `5 PASS / 0 FAIL` then `actuator-test PASS` at rolled seeds; physics-pb's tail unchanged; records flipped riding the landing; pushes accepted.

## Report

Read-confirmation first, then one line of outcome, then bullets: the sha256 lines verbatim, the new gate's seeds/count/verdict lines, the physics-pb tail, both commit hashes, the push results. Every nonconformity its own labeled bullet.
