# Phase 0.0.68 — the torque-limited actuators

Status: LANDED, commit stamped below, 2026-09-04. Gate: 5 PASS / 0 FAIL; prior gates unmoved.

Harvest batch rung of `batch-harvest-1.md`. Checklist item served and flipped in this landing: "Torque-limited joint actuators".

## Lift kind

Same shape as the envelope rung: the mechanism is the engine's own Hinge, byte-identical with the demo. The laws gated: the clamp holds at the ceiling for five hundred rolled commands, the servo obeys the same ceiling, saturation tells the truth, the default stiffness is the stated law (full torque at three degrees, damping at six percent), a disabled actuator drives nothing, and feedforward rides on top of the servo. One trial finding recorded: tauFF is a field the caller sets, not a constructor option — the constructor zeroes it.

## Acceptance arithmetic for the phase

Every number was produced by running the exact planned code at plan-writing time. actuator-test: 5 PASS / 0 FAIL at rolled seeds; Hinge byte-identical with the demo text at trial time.

- `node scripts/gate.mjs actuator` — seeds line, 5 PASS lines, `actuator-test: 5 PASS / 0 FAIL`, `actuator-test PASS`, exit 0.
- physics-pb bracket: `physics-pb-test: 11 PASS / 0 FAIL` unmoved.

## Tasks

- 0.0.68-1 — the files, verbatim from the trial. -> `task-0.0.68-1-actuator.md`

Suggested model: Sonnet 5 — every file's full content is in the plan.
