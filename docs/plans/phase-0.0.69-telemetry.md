# Phase 0.0.69 — the per-joint load telemetry

Status: LANDED, commit stamped below, 2026-09-04. Gate: 4 PASS / 0 FAIL; prior gates unmoved.
<!-- At landing this line becomes: Status: LANDED, commit `<hash>`, <date>. Gate: 4 PASS / 0 FAIL; prior gates unmoved. -->

Harvest batch rung of `batch-harvest-1.md`. Checklist item served and flipped in this landing: "Per-joint load telemetry".

## Lift kind

SHAPED, riding the landed physics module: the welds and hinges already measure force, torque, the four load components, utilization, peak, damage, and saturation every substep; this module shapes those fields into one flags-socket row per mount, plus the worst-mount read. Pure reads; nothing writes a joint.

## Acceptance arithmetic for the phase

Every number was produced by running the exact planned code at plan-writing time. telemetry-test: 4 PASS / 0 FAIL at rolled seeds — three hundred rolled welds mirrored field for field.

- `node scripts/gate.mjs telemetry` — seeds line, 4 PASS lines, `telemetry-test: 4 PASS / 0 FAIL`, `telemetry-test PASS`, exit 0.
- physics-pb bracket: `physics-pb-test: 11 PASS / 0 FAIL` unmoved.

## Tasks

- 0.0.69-1 — the files, verbatim from the trial. -> `task-0.0.69-1-telemetry.md`

Suggested model: Sonnet 5 — every file's full content is in the plan.
