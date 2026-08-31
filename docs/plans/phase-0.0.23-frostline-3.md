# Phase 0.0.23 — FROSTLINE FL-3: the estimate audited

Status: PLANNED.
<!-- At landing: Status: LANDED, commit `<hash>`, <date>. Gate: 29 PASS / 0 FAIL; audit 6 PASS / 0 FAIL. -->

The third rung of `docs/plans/game-frostline.md`: the chance-to-hit the page displays is now measured against live fire and corrected. The audit found the shipped formula wrong twice over — a straight bell-curve where the engine's deflection is a radial Rayleigh draw, and no accounting for blast splash: at 8 m it displayed 35% where the range measured 90%.

## Lift kind

SHAPED — one formula corrected against measurement, one audit script, no page change:

- **The corrected formula** (`cover.js` hitChance): P(hit) = 1 − exp(−θ²/(2s²)), θ = HIT_REACH/dist, s = 0.6·sigma — the exact shape of the engine's own scatter draw. HIT_REACH 0.82 m is the audit's fit (silhouette half-width + blast radius + splash; three ranges independently imply 0.79–0.84). Exposure scaling and the [0.02, 0.98] clamp unchanged.
- **The audit** (`scripts/frostline-audit.mjs`): one pinned shooter, one held dummy, rifles at 6, 10, and 14 m, one hundred simulated seconds each; measured rate within ±10 points of the displayed number, and the exact deterministic counts pinned. NOT in the per-task gate — it is minutes of simulated fire and runs on the owner's word and on CI.
- **The per-task gate grows one cheap check** (29): the four fixture estimate values pinned to six decimals — the formula's arithmetic locked without firing a round.
- **Finding for the record:** the sniper's long shot cannot be audited — the territory field gates the trigger before the estimate matters (a lone pair's field never reaches an 18+ m lane, zero rounds fire). The page can therefore display a chance for a shot doctrine will not take. Left for a later ruling.

## Acceptance arithmetic

Produced by running the exact planned files at plan-writing time, seed 3:

- `node scripts/gate.mjs frostline` → 29 PASS lines, `frostline-test: 29 PASS / 0 FAIL`, `frostline-test PASS`, exit 0. No prior pin moves — the crossing does not read the estimate.
- `node scripts/frostline-audit.mjs` → `frostline-audit: 6 PASS / 0 FAIL`, `frostline-audit PASS`, exit 0. Measured: 70/77 at 6 m (displayed 98.0), 54/74 at 10 m (displayed 78.8), 43/75 at 14 m (displayed 52.6).
- File identity in the task document.

## Tasks

- 0.0.23-1 — the corrected formula, the audit script, the pinned gate check. → `task-0.0.23-1-audit.md`

Suggested model: Sonnet 5 — every changed byte printed, hashes ratify.
