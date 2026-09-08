# Phase 0.0.82 — presets: the labeled cheats

Status: LANDED, commit `07b657c`, 2026-09-08. Gate: 7 PASS / 0 FAIL; bracket unmoved.
<!-- At landing this line becomes: Status: LANDED, commit `<hash>`, <date>. Gate: 7 PASS / 0 FAIL; bracket unmoved. -->

Serves the checklist box "Labeled-cheat presets: every relaxed rule named, with its measured consequence". Source: the mech demo, read-only, lines 1664 to 1693 (the six presets and applyPreset) and 1722 to 1731 (the fallbacks). The module carries the six presets as data and the function that applies one to an assembled rig.

## Lift kind

VERBATIM MATH — applyPreset and every preset number are the demo's exactly. The numbered substitutions are in the module header (five of them: the row fields, the import, the fallbacks, the exports, the contract). Anything else differing from the cited lines is a finding against the plan.

## Rulings inside this plan

- The measured consequences are the demo's own words, carried as text. No consequence is re-measured here; no walk is run.
- Registry seam: consume. The registry and gate-table lines are the landing's.

## Acceptance arithmetic for the phase

Every number below is the run's output (rolled seeds 900952603, 871101437).

- `node scripts/presets-test.mjs` prints a seeds line, 7 PASS lines, then `presets-test: 7 PASS / 0 FAIL`, then `presets-test PASS`, exit 0.
- Load-bearing knowns from the demo's own lines: the six presets' dials; the fallbacks gravity 9.81, friction 1.0, copClamp 0.45, swing 0.90.
- Bracket, run at the landing: presets, physics-pb, rig.

## Tasks

- 0.0.82-1 — the lift. → `task-0.0.82-1-presets.md`
