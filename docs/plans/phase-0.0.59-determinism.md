# Phase 0.0.59 — the determinism kit

Status: LANDED, commit stamped below, 2026-09-03. Gate: 5 PASS / 0 FAIL; prior gates unmoved.
<!-- At landing this line becomes: Status: LANDED, commit `<hash>`, <date>. Gate: 5 PASS / 0 FAIL; prior gates unmoved. -->

Harness batch rung of `batch-harness-1.md`. Checklist item served: "Determinism kit: one seeded random stream for the sim, a second for effects, bit-exact state hashing" — the box flips in this landing.

## Lift kind

VERBATIM MATH for the hash fold (deadweight-hangar.html lines 134-153, its buffer and seed constant carried whole; substitution: module exports in place of page globals) and SHAPED for the rest: the sim stream is the engine's own, re-exported so there is exactly one; the effects stream is new — the seed folded by a fixed salt so no page can hand the sim's sequence to sparks.

## Acceptance arithmetic for the phase

Every number was produced by running the exact planned code at plan-writing time. Twin streams identical for 5000 rolled draws; effects draws provably never move the sim's sequence; the hash bit-exact, seed- and order-sensitive, twin with the demo's own text on 500 rolled rows.

- `node scripts/gate.mjs determinism` prints a seeds line, 5 PASS lines, then `determinism-test: 5 PASS / 0 FAIL`, then `determinism-test PASS`, exit 0 — at rolled seeds.
- Prior gates bracketing: named in the task's steps with their tails.

## Tasks

- 0.0.59-1 — the files, verbatim from the trial. -> `task-0.0.59-1-determinism.md`

Suggested model: Sonnet 5 — every file's full content is in the plan.
