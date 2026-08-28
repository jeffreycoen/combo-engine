# Phase 0.0.5 — weld stress

Status: LANDED, commit `e3fb9d6`, 2026-08-28. Gate: 9 PASS / 0 FAIL; prior gates unmoved.

The fourth organ out of deadweight: weld loading, joint rating, and the split when a weld lets go. A weld carries the acceleration of the smaller side of the ship it holds on — load = |accel| × smaller-side mass × 9; past its strength it breaks, and whichever side lost the root becomes debris. Source: `deadweight-hangar.html` lines 674–685 (in-flight loading), 747–768 (the split), 1484–1490 (the hangar's rated joint limit).

## Lift kind

VERBATIM MATH — the formulas are the demo's exactly. Numbered substitutions, and only these:

1. Globals become arguments: `SPEC` → `spec`, `ship.modules` → `list`, `ship.welds` → `ws`, the computed `aMag` → the `aMag` parameter.
2. Connectivity and weld construction come from the builder module (`connectedFrom`, `weldsOf`) instead of the demo's file-local copies — the same functions, already landed in phase 0.0.3.
3. The split returns `{kept, welds, gone}` instead of mutating ship state and pushing world debris — the world side (debris, sync) stays with the game, as the phase 0.0.4 precedent set for game-side lists.

Anything else differing from the cited lines is a finding against the plan.

## Acceptance arithmetic for the phase

Every number below was produced by running the exact planned code at plan-writing time.

- `node scripts/gate.mjs weldstress` prints nine PASS lines, then `weldstress-test: 9 PASS / 0 FAIL`, then `weldstress-test PASS`, exit 0.
- Load-bearing knowns: on the starter dart, the engine weld's smaller side is 6 kg and the pod weld's 3 kg; loads at 1 u/s² are 54 and 27; rated limits 1200/54 and 1200/27; the demo's full burn (3.526 u/s²) breaks nothing; 23 u/s² shears exactly the engine weld (1242 > 1200 while 621 holds); a strut joint rates 500/(0.8×9); the split on a cut engine weld keeps bridge+pod with its weld reindexed whole and sheds the engine.
- The six prior gates unmoved: api worldHash 3367709165 / runHash 2717846799, combat 7 PASS, accuracy 11/11, market `market-test PASS`, builder `builder-test PASS`, ledger `ledger-test PASS`.

## The composition

The gate and the module both stand on the builder module — second cross-module proof, after the ledger's use of the market.

## Tasks

- 0.0.5-1 — the weld-stress module: code, gate, registration, record close, commit, push. → `task-0.0.5-1-weldstress.md`

Suggested model: Sonnet 5 — every file's full content is in the plan.
