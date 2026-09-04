# Phase 0.0.70 — the non-lethal opponent model

Status: LANDED, commit stamped below, 2026-09-04. Gate: 6 PASS / 0 FAIL; prior gates unmoved.

Harvest batch rung of `batch-harvest-1.md`. Checklist item served and flipped in this landing: "The non-lethal opponent model".

## Lift kind

VERBATIM MATH from the shooting-range demo (lines 1543-1566 the dials, 1599-1632 the hit law), harvested under the standing order — the demo stays outside the record. Substitutions: the page's agent object becomes makeAgentState() carrying exactly the fields the law touches; agentHit becomes hitAgent. Fidelity was proven in the trial: five thousand rolled fights of four hits each, module and demo text twin on every result and every state, exact.

## Acceptance arithmetic for the phase

Every number was produced by running the exact planned code at plan-writing time. opponent-test: 6 PASS / 0 FAIL at rolled seeds; fidelity twin 5000 rolled fights at trial time.

- `node scripts/gate.mjs opponent` — seeds line, 6 PASS lines, `opponent-test: 6 PASS / 0 FAIL`, `opponent-test PASS`, exit 0.
- physics-pb bracket: `physics-pb-test: 11 PASS / 0 FAIL` unmoved.

## Tasks

- 0.0.70-1 — the files, verbatim from the trial. -> `task-0.0.70-1-opponent.md`

Suggested model: Sonnet 5 — every file's full content is in the plan.
