# Phase 0.0.93 — cues: musical cues as vocabulary

Status: LANDED, commit stamped below, 2026-09-08. Gate: 7 PASS / 0 FAIL; bracket unmoved.
<!-- At landing this line becomes: Status: LANDED, commit `<hash>`, <date>. Gate: 7 PASS / 0 FAIL; bracket unmoved. -->

Serves the checklist box "Musical cues folded into the sound engine's vocabulary". Source: the fleet demo, read-only, lines 51 to 151 and the ten call sites. The module holds the twelve cues and eleven voices as data and the lookup that times them; it holds no sound library and plays nothing itself.

## Lift kind

SHAPED — the law carried as data: twelve cues, each note, duration, and offset the demo plays, and the eleven voices' settings. New: the lookup that turns a cue into timed note events. No sound library. Playing the cues through the coldsnap sound engine is a later ruling.

## Rulings inside this plan

- The buildDone cue is carried and marked never called, as the demo has it.
- Registry seam: consume. The registry and gate-table lines are the landing's.

## Acceptance arithmetic for the phase

Every number below is the run's output (rolled seeds 833551707, 15710206).

- `node scripts/cues-test.mjs` prints a seeds line, 7 PASS lines, then `cues-test: 7 PASS / 0 FAIL`, then `cues-test PASS`, exit 0.
- Load-bearing knowns from the demo's own lines: every note and offset in the reference table; master -8 dB; the call-site chances 0.3 and 0.4.
- Bracket, run at the landing: cues.

## Tasks

- 0.0.93-1 — the lift. → `task-0.0.93-1-cues.md`
