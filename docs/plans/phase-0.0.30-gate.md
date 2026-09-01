# Phase 0.0.30 — the gate obeys the testing law

Status: PLANNED.
<!-- At landing: Status: LANDED, commit `<hash>`, <date>. Gate: 57 PASS / 0 FAIL in seconds. -->

Records and tests only, no game code. The frostline gate is rebuilt to the standing testing law: NEVER a timed simulation — every check proves a call fires (one call, one tick, direct asserts); checks are grouped by AREA and a task's brief runs only the areas its diff touched. The old gate had grown to 63 checks carrying full crossings, three bit-exact battle replays, space fights to the kill, and a twenty-second healing watch — over half an hour a run, run twice per task. The rebuilt gate: 57 checks, 11 seconds whole, about a second per area.

## What changes

- **`scripts/frostline-test.mjs` rebuilt whole:** nine areas — mission, turns, cover, fire, purse, board, tape, space, hunter — each check one call or one tick. The medic check becomes one tend call asserting hp rose; the kill's pay reads the kill's own event off one strike; the space checks prove the hold, the trigger, and the end on single ticks.
- **`scripts/gate.mjs` gains one line:** extra arguments pass through, so `gate.mjs frostline turns purse` runs those areas alone. No other gate moves.
- **Deleted outright, each a timed simulation (the license, listed whole):** the contact-tick pin, the scripted mission crossing and its end-state hash, the 2000-tick twin determinism (twin BOOT identity stays), the 600-tick forest watch (replaced by a direct spawn-clearance scan), the live-fire purse kill loop, the twenty-second medic watch, all three tape replay checks, the space skirmish to the kill, and the 120-tick held-wing watch. What they observed is the owner's playtest at the live page.
- **Said plainly:** the tape's bit-exact-replay proof cannot exist without running ticks; under the law it is no longer a test. The replay machinery stays landed and working; its truth is observed at the page. The live-fire audit script likewise stays as an owner-run tool, never a test.
- **The suite bracket shrinks with it:** future briefs name areas, and the full-suite loops bracket only tasks that touch engine files, as ever — now costing seconds on the frostline side.

## Acceptance arithmetic

Produced by running the exact planned files at plan-writing time:

- `node scripts/gate.mjs frostline` → `frostline-test [mission turns cover fire purse board tape space hunter]: 57 PASS / 0 FAIL`, `frostline-test PASS`, exit 0 — 11 seconds on this machine.
- `node scripts/gate.mjs frostline turns purse` → `frostline-test [turns purse]: 18 PASS / 0 FAIL`, `frostline-test PASS` — about a second.
- File identity in the task document.

## Tasks

- 0.0.30-1 — the rebuilt gate, the pass-through line, records. → `task-0.0.30-1-gate.md`

Suggested model: Sonnet 5 — two files printed whole and one hunk, hashes ratify.
