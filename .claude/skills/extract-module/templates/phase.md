# Phase 0.0.N — <the organ, plainly named>

Status: PLANNED. No task dispatched.
<!-- At landing this line becomes: Status: LANDED, commit `<hash>`, <date>. Gate: <count> PASS / 0 FAIL; prior gates unmoved. -->

<One paragraph: what the organ is, what it does, and its source — demo file and line range, plus any of the demo's own self-test lines used as known numbers.>

## Lift kind

<One of, with its obligations spelled out:>
- VERBATIM — inventory of files with sha256 hashes; acceptance is hash identity.
- VERBATIM MATH — the formulas are the demo's exactly; numbered substitutions follow, and only those. Anything else differing from the cited lines is a finding against the plan.
  1. <substitution>
  2. <substitution>
- SHAPED — the law carried verbatim, the code new. <State what is law and what is new, plainly.>

## Acceptance arithmetic for the phase

Every number below was produced by running the exact planned code at plan-writing time.

- `node scripts/gate.mjs <name>` prints <N> PASS lines, then `<name>-test: <N> PASS / 0 FAIL`, then `<name>-test PASS`, exit 0.
- Load-bearing knowns inside the checks: <the demo's own numbers, listed>.
- All prior gates unmoved: <list each gate and its pinned tail>.

## Tasks

- 0.0.N-1 — <one line>. → `task-0.0.N-1-<name>.md`

Suggested model: Sonnet 5 — every file's full content is in the plan.
