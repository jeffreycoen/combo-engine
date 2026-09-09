# Phase 0.0.97 — touch: the touch commands

Status: LANDED, commit stamped below, 2026-09-08. Gate: 10 PASS / 0 FAIL; bracket unmoved.
<!-- At landing this line becomes: Status: LANDED, commit `<hash>`, <date>. Gate: 10 PASS / 0 FAIL; bracket unmoved. -->

Serves the checklist box "The touch commands: the right mouse button, solved for a phone". Source: the fleet demo, read-only, lines 153, 1097 to 1162, 1170 to 1196. The module turns mouse, wheel, key, and finger events into orders, camera moves, box and disc actions, and selection requests; the page binds the events, hands in what lies under the pointer, applies the intents, and keeps the hit tests, the timers, and the drawing.

## Lift kind

SHAPED — the law carried: every threshold, timing, gain, clamp, and order rule the demo's handlers apply. The code is new: events in, intents out; the page binds events, hands in what lies under the pointer, and applies the intents.

## Rulings inside this plan

- The dials are the demo's numbers as defaults.
- Registry seam: consume. The registry and gate-table lines are the landing's.

## Acceptance arithmetic for the phase

Every number below is the run's output (rolled seeds 504225704 and 149738354).

- `node scripts/touch-test.mjs` prints a seeds line, 10 PASS lines, then `touch-test: 10 PASS / 0 FAIL`, then `touch-test PASS`, exit 0.
- Load-bearing knowns from the demo's own lines: the fifteen dials.
- Bracket, run at the landing: touch, disc.

## Tasks

- 0.0.97-1 — the lift. → `task-0.0.97-1-touch.md`
