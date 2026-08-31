# Phase 0.0.25 — FROSTLINE FL-5: the contract board

Status: LANDED, commit `fd45f72`, 2026-08-31. Gate: 41 PASS / 0 FAIL.

The fifth rung of `docs/plans/game-frostline.md`: missions become posted jobs. A contract is data — a name, a battle seed, a posted price, a legitimacy tag; clean jobs pay less, underground jobs pay more and raise the heat. The board is the campaign's spine.

## Lift kind

SHAPED — one new pure module, heat on the purse, the board on the page:

- **`contracts.js`:** a board of three jobs, deterministic from its own seed through a local draw stream (no clock, no shared rng) — one address (board, job) names one exact battle forever. The ruled trade is constants: clean pays 15–25, underground 35–60 and +1 heat. `completionPay` puts the posted price into the purse and the heat on the books.
- **The purse carries heat**, saved and loaded with everything else.
- **The page routes by address:** no address rolls a fresh board; `?board=B` lists that board's jobs; `&job=K` boots that exact contract; a bare `?seed=N` keeps the old free skirmish with the flat bonus, so every FL-2 through FL-4 behavior survives untouched. A won contract pays its posted price instead of the flat bonus; the debrief and the hud show the heat.
- Provisional dials: the pay bands, +1 heat, three jobs a board, the job names.
- Heat is recorded, not yet consequential — its price (harder patrols, closed clean jobs) is a later phase by design.

## Acceptance arithmetic

Produced by running the exact planned files at plan-writing time, fixture seed 3, fixture boards 7, 11, 42:

- `node scripts/gate.mjs frostline` → 41 PASS lines, `frostline-test: 41 PASS / 0 FAIL`, `frostline-test PASS`, exit 0. Thirty-six prior checks unmoved; five new:
  - twin boards land byte-identical; the fixture board pins exactly (job 0: CARGO UNDECLARED, underground, pays 36, +1 heat, seed 976907632; jobs 1–2 clean at 19 and 23);
  - the ruled trade holds on every fixture board; the posted price pays and the heat lands; heat rides the vault.
- File identity in the task document.

## Tasks

- 0.0.25-1 — the contracts module, heat on the purse, the board on the page, the gate. → `task-0.0.25-1-board.md`

Suggested model: Sonnet 5 — every changed byte printed, hashes ratify.
