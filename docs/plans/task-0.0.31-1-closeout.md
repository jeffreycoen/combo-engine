# Task 0.0.31-1 — the closeout: the game's own page in the record

One job: land FL-10 exactly as printed — the FROSTLINE section into README.md, the ladder's core closed, records. No code moves. The final hash is the acceptance. You design nothing.

This document lives at `docs/plans/task-0.0.31-1-closeout.md` when the task lands; the phase frame `docs/plans/phase-0.0.31-frostline-10.md` is served with it and copied in at landing.

## Required reading, verified in the tree

1. This document, whole.
2. The phase frame, whole.
3. `README.md`, whole (121 lines today).

Your report opens with a read-confirmation naming these.

## Steps

**Step 1 — green before anything moves.** `node scripts/gate.mjs frostline` must print `frostline-test [mission turns cover fire purse board tape space hunter]: 57 PASS / 0 FAIL`, `frostline-test PASS`, exit 0 — seconds now.

**Step 2 — the section.** In `README.md`, immediately BEFORE the line `## Status`, insert exactly:

```markdown
## FROSTLINE — the playable game

A fan-fiction tactics campaign in the clone-war shape, live at `docs/frostline/` on the published pages. Ten phases landed (0.0.18 through 0.0.29, records in `docs/plans/`); every claim below is checkable at the page and in the gate.

- **The board is the spine.** Every load deals a contract board — posted jobs with a name, a price, a legitimacy tag, and sometimes a HOT ROUTE. Clean jobs pay less; underground jobs pay more and heat the hunter. One address names one exact job forever (`?board=B&job=K`).
- **Travel can be contested.** A hot route flies its ambush first: wings of fighters on the flat black, the same points and confirmations as the ground, on the landed fleet orders and steering modules. Won, the ground job waits past it.
- **The ground fight:** free time until first contact, then alternating halves — three points a squad, every action priced in a confirmation carrying the cover shield and an audited chance-to-hit (measured against live fire, inside a ten-point band). Overwatch cones, focus fire on a shared mark, discipline a squad at a time.
- **A battle is its seed.** Missions are rules over any seeded valley — forces on vetted ground, the spawn-to-exit road proven before a man spawns. Every order records to a tape at its tick; seed plus tape replays a battle bit-exact. A bug report is a saved battle.
- **The purse remembers.** Kills pay bounties win or lose; contracts pay their posted price; the shop sells squads, medics, and the hunter — one armored man, twin sidearms, a 35-meter jetpack line, one of a kind. The men persist between contracts and the dead stay dead until replaced at the table's own split price. Purse, roster, heat, and casualties ride the browser's storage with a reset.
- **The gate:** `node scripts/gate.mjs frostline` — one-call asserts grouped by area, seconds to run; long-run truths are the owner's playtest at the page, by standing ruling.

```

Nothing else in the file moves.

**Step 3 — file identity.** `wc -c README.md` must print `11211`; `sha256sum README.md` must print `927903e13be71b7cb1ef59a5854f4f3db44cc100251b33e5375da31dcae36be8` — compared mechanically. A mismatch stops the task.

**Step 4 — the gate re-asserts.** The step-1 command again, same verdict.

**Step 5 — records and deploy.** Move this document and the phase frame into `docs/plans/`. Mark FL-10 `[LANDED] ` in `docs/plans/game-frostline.md`. Bump `package.json` 0.0.30 to 0.0.31. Stamp the phase status in a second record commit; the stamp subject is exactly `phase 0.0.31 record stamped — <first commit's 7-character short hash>`. Commit with message:

```
phase 0.0.31 — FROSTLINE FL-10: the closeout

The game earns its page in the record: the board, the contested travel, the
priced fight, the seed-and-tape law, the purse that remembers — every claim
checkable at the page and in the gate. The ladder's core is closed; map
types and the look ride its parked tail on the owner's word.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
```

Push.

## Known limits, said plainly

- The section ships without screenshots — they are the owner's alone by standing ruling.
- Heat is recorded and spent nowhere; the README says only that it is kept. Its price remains an open ruling for the parked tail or beyond.

## Report shape

Read-confirmation first, then one line of outcome, then bullets: both gate verdicts verbatim, the wc -c and sha256 lines, both commit hashes, push result. Every nonconformity its own labeled bullet. Fixture seeds: the gate's own (3, boards 7/11/42, space 12345); no seed is special.

## Suggested model

Sonnet 5 — one printed insertion, hashes ratify.
