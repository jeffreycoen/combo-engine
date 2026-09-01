# Phase 0.0.31 — FROSTLINE FL-10: the closeout

Status: PLANNED.
<!-- At landing: Status: LANDED, commit `<hash>`, <date>. Gate: 57 PASS / 0 FAIL. -->

The tenth rung of `docs/plans/game-frostline.md` — the closeout. The campaign machinery the rung named is already landed and gated (the board as spine, persistence through the browser's storage); what remains is the record: the game's README section, every claim in it checkable at the page and in the gate, and the ladder's core marked complete. Screenshots are the owner's alone by standing ruling — the section ships without them, and the owner adds his own on his word.

## What changes

- **README.md gains the FROSTLINE section** (printed whole in the task) between "Building a game" and "Status" — the board, the travel ambush, the ground fight, the seed-and-tape law, the purse, the gate. Nothing else in the README moves.
- **The ladder closes its core:** FL-10 marked `[LANDED] ` in `docs/plans/game-frostline.md`; FL-11 (map types) and FL-12 (bolts and burn marks) remain the parked tail, on the owner's word.
- No game code, no engine files, no page files.

## Acceptance arithmetic

- `node scripts/gate.mjs frostline` → `frostline-test [mission turns cover fire purse board tape space hunter]: 57 PASS / 0 FAIL`, `frostline-test PASS`, exit 0 — the standing bracket, seconds.
- `README.md` — 11211 bytes, sha256 `927903e13be71b7cb1ef59a5854f4f3db44cc100251b33e5375da31dcae36be8` (assembled and measured at plan-writing time).

## Tasks

- 0.0.31-1 — the README section, the ladder close, records. → `task-0.0.31-1-closeout.md`

Suggested model: Sonnet 5 — one printed insertion, hashes ratify.
