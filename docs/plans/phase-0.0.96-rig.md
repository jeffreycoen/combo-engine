# Phase 0.0.96 — rig: the machine as data

Status: LANDED, commit stamped below, 2026-09-08. Gate: 14 PASS / 0 FAIL; bracket unmoved.
<!-- At landing this line becomes: Status: LANDED, commit `<hash>`, <date>. Gate: 14 PASS / 0 FAIL; bracket unmoved. -->

The rig module's second pass, under the general parts order, phase A13. The seven-row limb chain moved onto the spec as data, MECH_SPEC.limbChain, with the two rows whose joint position flips per side marked. sideChain and buildLinkTable build from that data. assembleMech names its foot links, hip links, and collision pairs through options, each defaulted to the demo's own names. A spec contract, checkRigSpec, checks every field of a rig spec and returns every problem in one pass. Every number stays the demo's own.

## Lift kind

SHAPED second pass — every number is the demo's; the limb chain is data on the spec, the overrides name their links, the spec contract. The changes are the numbered list in the module header.

## Acceptance arithmetic for the phase

Every number below is the run's output (rolled seeds 246862655, 457311270).

- `node scripts/rig-test.mjs` prints a seeds line, 14 PASS lines, then `rig-test: 14 PASS / 0 FAIL`, then `rig-test PASS`, exit 0.
- The nine landed checks are verbatim. presets and telemetry count lines unchanged in the worktree.
- Bracket, run at the landing: rig, telemetry, presets.

## Tasks

- 0.0.96-1 — the second pass. → `task-0.0.96-1-rig.md`
