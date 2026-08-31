# Phase 0.0.24 — FROSTLINE FL-4: the purse

Status: LANDED, commit `22836f6`, 2026-08-31. Gate: 36 PASS / 0 FAIL.

The fourth rung of `docs/plans/game-frostline.md`, built to the rulings: every kill pays its bounty win or lose, a won contract adds the completion bonus, the debrief screen sells NEW TEAM TYPES onto the roster, and the purse persists through the browser's own storage with a reset control.

## Lift kind

SHAPED — one new pure module, the roster through the boot, the debrief on the page:

- **`purse.js`:** plain state; persistence through an INJECTED storage (the page hands the browser's, tests hand a plain object) — nothing touches a global; a broken record loads broke, never crashed. Kills price themselves off the corpse's own bounty field via each tick's returned events (events pushed between ticks never surface — the trial proved the lifecycle, so the purse reads the tick's own return).
- **The roster through the boot:** `bootMission(def, seed, roster)` — bought types join the friendly list and place by the same rules on the same vetted ground; an empty roster boots byte-identically to before (every existing pin holds untouched, proven).
- **The debrief:** win or loss card with the books (bounties this battle, bonus, purse, roster), the shop with the squad table's own prices, NEW BATTLE rolling a fresh seed, RESET clearing the vault. Phone and desktop: the same centered panel, capped at screen width.
- Provisional dials: completion bonus 25, the sale list (rifles, gunners, sniper pair).

## Acceptance arithmetic

Produced by running the exact planned files at plan-writing time, fixture seed 3:

- `node scripts/gate.mjs frostline` → 36 PASS lines, `frostline-test: 36 PASS / 0 FAIL`, `frostline-test PASS`, exit 0. Twenty-nine prior checks unmoved; seven new:
  - a fresh vault opens broke; a live-fire kill (one weak droid, rifles at 6 m) surfaces in the tick's own events and pays exactly its bounty of 4;
  - the won contract adds the bonus of 25 and the books add up;
  - the shop refuses a dry purse and sells gunners at the table's own 38;
  - save then load round-trips; a broken record never throws;
  - a bought team boots a fourth squad, type kept, on open ground.
- File identity in the task document.

## Tasks

- 0.0.24-1 — the purse module, the roster boot, the debrief, the gate. → `task-0.0.24-1-purse.md`

Suggested model: Sonnet 5 — every changed byte printed, hashes ratify.
