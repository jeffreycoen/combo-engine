# Phase 0.0.75 — registry: the ghosts registered, the self-test made whole

Status: LANDED, commit `82fbc3e`, 2026-09-08. Gate: registry 5 PASS / 0 FAIL, badge 3 PASS / 0 FAIL; bracket unmoved.
<!-- At landing this line becomes: Status: LANDED, commit `<hash>`, <date>. Gate: registry 5 PASS / 0 FAIL, badge 3 PASS / 0 FAIL; bracket unmoved. -->

Phase A1 of the general parts order. Three ghost modules — telemetry, opponent, senses — join the registry table, each naming its seam and its gate, so the registry's ghost check turns green. The self-test script stops carrying its own hard-coded list of gates; it reads the gate table's keys from `scripts/gate.mjs` itself, in file order, so the list can never go stale. The badge gate gains a third check proving the self-test's list equals the gate table's keys.

## Lift kind

SHAPED — engine housekeeping under the order; no demo source.

## Acceptance arithmetic for the phase

Every number below is the run's output (badge rolled seeds 372934942, 861443875; registry is seedless, the tree is its fixture).

- `node scripts/gate.mjs registry` prints 5 PASS lines, then `registry-test: 5 PASS / 0 FAIL`, then `registry-test PASS`, exit 0. The standing red is closed.
- `node scripts/gate.mjs badge` prints a seeds line, 3 PASS lines, then `badge-test: 3 PASS / 0 FAIL`, then `badge-test PASS`, exit 0.
- Bracket, run at the landing: registry, badge, describe, and the full self-test.

## Tasks

- 0.0.75-1 — the edits. → `task-0.0.75-1-registry.md`
