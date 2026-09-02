# Task 0.0.32-1 — one point, one order

The point economy told a fiction: three points a squad, but a squad holds one order, so three points bought three overwrites. The ruling: one point per squad per turn. The display stops lying; the turn gets simpler; nothing else moves.

**Suggested model:** Sonnet — four small verbatim edits and two test re-teaches, no design.

**Required reading, verified in the tree at 46a5263:**
- `src/games/frostline/turns.js` (whole file, 86 lines)
- `scripts/frostline-test.mjs` lines 98–120 (the turns area)
- `docs/frostline/main.js` lines 340–350
- `docs/frostline/space-main.js` lines 140–150

Open your report by confirming all four were read.

## The walk

The player's path this touches: after first contact, each squad's chip shows one pip instead of three. Every confirmation still says "cost 1 point · 0 after". A squad gives one order a turn; a second ask on the same squad is refused until the next turn. The contact banner and every turn banner say ONE POINT A SQUAD / A SHIP. Overwatch's "again to widen" now means the next turn's point, which is a real spend — the widened cone stands until a move, attack, or hold clears it. Phone and desktop show the same chips and banners; nothing layout-shaped changes.

## Steps, in order

**1. Gates green before anything.** Run and require exact:

```
node scripts/gate.mjs frostline turns
```

Must end `frostline-test [turns]: 8 PASS / 0 FAIL`. Any other number stops the task.

**2. The rule.** `src/games/frostline/turns.js` line 10 — replace exactly:

```js
  ap: 3,          // points per squad per turn (owner's ruling)
```

with

```js
  ap: 1,          // one point, one order, per squad per turn (owner's ruling)
```

**3. Re-teach the two tests the rule moves.** `scripts/frostline-test.mjs`. This step is the task's own re-teach, licensed here, old→new in your report.

Line 103 — replace exactly:

```js
    check("turns: first contact opens the orders phase, three points a squad",
```

with

```js
    check("turns: first contact opens the orders phase, one point a squad",
```

Lines 105–106 — replace exactly:

```js
    check("turns: one point per order, a dry pool refuses",
      spend(ts, squads[0]) && spend(ts, squads[0]) && spend(ts, squads[0]) && !spend(ts, squads[0]) && apOf(ts, squads[1]) === 3);
```

with

```js
    check("turns: one point buys one order, a dry pool refuses",
      spend(ts, squads[0]) && !spend(ts, squads[0]) && apOf(ts, squads[1]) === 1);
```

Line 114 — replace exactly:

```js
      stepEnemy(ts, TURNS.enemyS, squads) && ts.phase === "orders" && ts.turn === 2 && apOf(ts, squads[0]) === 3);
```

with

```js
      stepEnemy(ts, TURNS.enemyS, squads) && ts.phase === "orders" && ts.turn === 2 && apOf(ts, squads[0]) === 1);
```

**4. The ground page's words.** `docs/frostline/main.js` — replace the string `3 POINTS A SQUAD` with `ONE POINT A SQUAD`. It appears exactly twice (lines 343 and 345). Any other count stops the task.

**5. The space page's words.** `docs/frostline/space-main.js` — replace the string `3 POINTS A SHIP` with `ONE POINT A SHIP`. It appears exactly twice (lines 142 and 148). Any other count stops the task.

**6. The gate, changed area only.** Run and require exact:

```
node scripts/gate.mjs frostline turns
```

Must end `frostline-test [turns]: 8 PASS / 0 FAIL`, with the two re-taught names in the PASS lines. Then the full suite once, as the pre-commit bracket:

```
node scripts/gate.mjs frostline
```

Must end `frostline-test [mission turns cover fire purse board tape space hunter]: 57 PASS / 0 FAIL`.

**7. Syntax on the pages.** `node --check docs/frostline/main.js && node --check docs/frostline/space-main.js` — both silent.

**8. Land it.** `package.json` version to `0.0.32`. Commit `phase 0.0.32 — one point, one order` and push. The owner's live check is the acceptance.

## Substitution table

Every token allowed to differ from the current tree:

| Where | Old | New |
|---|---|---|
| turns.js:10 | `ap: 3,` + its comment | `ap: 1,` + the new comment (step 2, verbatim) |
| frostline-test.mjs:103 | `three points a squad` | `one point a squad` |
| frostline-test.mjs:105–106 | the three-spend check | the one-spend check (step 3, verbatim) |
| frostline-test.mjs:114 | `=== 3` | `=== 1` |
| main.js ×2 | `3 POINTS A SQUAD` | `ONE POINT A SQUAD` |
| space-main.js ×2 | `3 POINTS A SHIP` | `ONE POINT A SHIP` |
| package.json | `0.0.31` | `0.0.32` |

An unlisted difference stops the task.

## Arithmetic acceptance

The trial ran every edit above and produced these numbers; they are the run's output, not predictions:

- `frostline turns` after the edits: **8 PASS / 0 FAIL**
- full `frostline`: **57 PASS / 0 FAIL**
- fixture seeds: 3 (mission), boards 7, 11, 42, space 12345 — no seed special.

## Report shape

One line of outcome; the read confirmation; each re-teach old→new; the two gate lines verbatim; the commit hash; seeds named; any nonconformity its own bullet.
