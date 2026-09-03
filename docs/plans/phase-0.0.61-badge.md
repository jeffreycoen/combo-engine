# Phase 0.0.61 — the gates and the boot badge

Status: LANDED, commit stamped below, 2026-09-03. Gate: 2 PASS / 0 FAIL; prior gates unmoved.

Harness batch rung of `batch-harness-1.md`. Checklist item served: "Headless gates and the boot self-test badge: fixed run from a seed, hashes printed, checks shown at start" — the box flips in this landing.

## Lift kind

SHAPED: the one-call headless run (scripts/selftest.mjs) drives every registered gate in order, one verdict line each, exit 0 only when all pass; the badge is the booted world's own hash on the FROSTLINE page's readout from the first frame — same seed, same number, any device.

## Acceptance arithmetic for the phase

Every number was produced by running the exact planned code at plan-writing time. Twin boots of one rolled seed show one number and a different valley shows another (the badge gate); the selftest ran whole in the trial: all 21 gates PASS, exit 0.

- `node scripts/gate.mjs badge` prints a seeds line, 2 PASS lines, then `badge-test: 2 PASS / 0 FAIL`, then `badge-test PASS`, exit 0 — at rolled seeds.
- Prior gates bracketing: named in the task's steps with their tails.

## Tasks

- 0.0.61-1 — the files, verbatim from the trial. -> `task-0.0.61-1-badge.md`

Suggested model: Sonnet 5 — every file's full content is in the plan.
