# Task 0.0.84-1 — support: tolerances handed in, the prim declared

One job: the second pass over the support module under the general parts order, phase A5. Write exactly the design below, run the gate, write the phase document, commit on your branch, report. You design nothing beyond this brief; anything it did not foresee stops the task and is reported as a nonconformity.

Model: Sonnet 5.

Where you work: the worktree at `/home/batman/combo-wt/support`, branch `phase/0.0.84-support`. You never touch `/home/batman/combo-engine` (the main tree). You never edit `scripts/gate.mjs`, `README.md`, `package.json`, `src/modules/registry/registry.js`, any other module, or any document of another phase. You never edit a demo file.

Required reading, in order, whole (confirm each with its line count at the top of your report):
1. This file.
2. `/home/batman/combo-engine/docs/plans/batch-general-1.md`, the sections "The generalization law", "The rules of the run", and "A5, support".
3. `/home/batman/combo-wt/support/src/modules/support/support.js`.
4. `/home/batman/combo-wt/support/scripts/support-test.mjs`.
5. `/home/batman/combo-wt/support/docs/modules/module-pattern.md`.
6. `/home/batman/combo-wt/support/docs/plans/phase-0.0.73-aim.md`, as the shape of a phase document.

## The design, fixed

Module `src/modules/support/support.js`. Every function keeps its name, its landed arguments in their order, and its export; the law is unchanged except that its literals are read from a tolerances object. Changes, and only these:

1. Add `export const SUPPORT_TOLERANCES = { overlap: 0.05, restBelow: 0.22, restAbove: 0.06, spanAbove: 0.02, groundBase: 0.16, hostGap: 0.45, passes: 24, sweeps: 6 };`
2. `restsOn(A, B, tol = SUPPORT_TOLERANCES)` reads `tol.overlap` in the four footprint tests, `tol.restBelow` and `tol.restAbove` in the rest band, `tol.spanAbove` in the span rule.
3. `linkDeco(level, tol = SUPPORT_TOLERANCES)` reads `tol.hostGap`.
4. `findUnsupported(level, tol = SUPPORT_TOLERANCES)` reads `tol.groundBase` and `tol.passes`, and calls `restsOn(..., tol)`.
5. `sweepDeco(level, onGone)` is unchanged; it reads no literal.
6. `primSupported(level, pr, tol = SUPPORT_TOLERANCES)` passes tol to findUnsupported.
7. `settleWorld(level, onFall, onGone, tol = SUPPORT_TOLERANCES)` reads `tol.sweeps` for its guard and passes tol to findUnsupported.
8. Add `export const PRIM_CONTRACT` as a plain field description, and `export function checkPrim(pr)` returning a list of plain problem strings, empty when clean, every problem in one pass: not an object gives the single problem `prim: not an object`; then `prim.c: 3 finite numbers required` unless `cc` is present and valid (`prim.cc: 3 finite numbers required` when cc is present and bad); `prim.s: 3 finite numbers required`; for each of deco, ghost, dead, deb, tgt, down, weld, gone that is present and is not a boolean and not the number 0 or 1, `prim.<flag>: boolean or 0/1 required`; when host is present and is not an integer at least -1, `prim.host: integer >= -1 required`.
9. Add `export function checkTolerances(t)`: not an object gives `tolerances: not an object`; then for each of overlap, restBelow, restAbove, spanAbove, groundBase, hostGap: `tolerances.<name>: number > 0 required` when missing or not a number over 0; for passes and sweeps: `tolerances.<name>: integer >= 1 required`.
10. Add to the header comment a numbered list of these changes as the second pass's substitutions.

Gate `scripts/support-test.mjs`. The twelve landed checks stay verbatim, in order, with their names; the landed seed 9 stays as the fixture it is. The import line gains `SUPPORT_TOLERANCES`, `checkPrim`, `checkTolerances`. Before the first check add a rolled seed printed as `seeds {"support":<n>}`, read from `process.env.SEED` when set, else rolled, with the small seeded stream the other gates use. Then these checks, appended after the twelve:

13. `support: at rolled tolerances the rest gap and the footprint overlap decide support exactly` — 200 rolls: restBelow in 0.05 to 0.5 and overlap in 0.01 to 0.3 on a copy of the defaults; a post `{ c: [0, 0.5, 0], s: [0.2, 1, 0.2] }` and a slab `{ c: [0, 1 + g + 0.1, 0], s: [1, 0.2, 1] }` whose base sits g above the post's top with g rolled in 0 to restBelow + 0.3, re-rolled while the distance from g to restBelow is under 1e-6: findUnsupported([post, slab], tol) leaves the slab supported exactly when g is at most restBelow; and a slab `{ c: [o, 1.1, 0], s: [1, 0.2, 1] }` at g 0 offset sideways by o, with o rolled in 0 to 1.2, re-rolled while the distance from o to 0.6 + overlap is under 1e-6, is supported exactly when o is at most 0.6 (the two half widths) plus overlap.
14. `support: passes 1 leaves the top of a tall stack floating where the default finds it` — a base `{ c: [0, 0.1, 0], s: [1, 0.2, 1] }` and four slabs stacked on it, each 0.5 tall and resting flush on the one below (slab k, k from 1 to 4, at `{ c: [0, 0.2 + 0.5 * k - 0.25, 0], s: [1, 0.5, 1] }`); the level listed top slab first and the base last; findUnsupported with passes 1 returns 3 floating, passes 2 returns 2, passes 3 returns 1, and the default returns 0.
15. `support: the contracts count every problem` — `checkPrim({ c: [0, 0], s: "x", deco: "yes", host: 1.5 })` returns exactly 4 problems; `checkPrim(mkLevel()[0])` returns 0; `checkPrim(null)` returns 1; `checkTolerances({ ...SUPPORT_TOLERANCES, overlap: -1, passes: 0 })` returns 2; `checkTolerances(SUPPORT_TOLERANCES)` returns 0.
16. `support: the module imports only from its own folder or a sibling module` — read the module file with fs and assert every `import ... from "<x>"` specifier matches `^\.\.\/[a-z0-9-]+\/` or `^\.\/`; support has no imports, so the check passes on an empty list.

The count line becomes `support-test: 16 PASS / 0 FAIL`, then `support-test PASS`, exit 0. Any FAIL stops the task.

## Steps

1. Read the list above. Confirm.
2. Write the module changes.
3. Write the gate changes.
4. Run, from the worktree root, twice: `node scripts/support-test.mjs`. Both runs must print the seeds line, 16 PASS lines, the count line, and the verdict, exit 0. Paste both outputs whole in the report.
5. Write `docs/plans/phase-0.0.84-support.md` in the worktree, this shape:

```
# Phase 0.0.84 — support: tolerances handed in, the prim declared

Status: PLANNED. Built in worktree, awaiting the landing.
<!-- At landing this line becomes: Status: LANDED, commit `<hash>`, <date>. Gate: 16 PASS / 0 FAIL; bracket unmoved. -->

<One paragraph: the second pass over the support module under the general parts order, phase A5; what moved, in plain words.>

## Lift kind

SHAPED second pass — the support law is untouched; its eight literals ride one tolerances object handed in last, defaults the demo's; the prim's fields are declared. The changes are the numbered list in the module header.

## Acceptance arithmetic for the phase

Every number below is the run's output (rolled seeds <the two seeds>; the landed check keeps its fixture seed 9).

- `node scripts/support-test.mjs` prints a seeds line, 16 PASS lines, then `support-test: 16 PASS / 0 FAIL`, then `support-test PASS`, exit 0.
- The twelve landed checks are verbatim.
- Bracket, run at the landing: support.

## Tasks

- 0.0.84-1 — the second pass. → `task-0.0.84-1-support.md`
```

6. Commit on your branch, all three files, with this message exactly:

```
phase 0.0.84 — support: tolerances handed in, the prim declared

Second pass under the general parts order. Eight literals ride one tolerances object handed in last; the prim and tolerances contracts. Gate 16 PASS / 0 FAIL at rolled seeds; the twelve landed checks verbatim.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01QSq3kZC3Bk9SC5RwnqYUfs
```

Do not push. Do not touch main.

## Rules

- No timed simulations. No replays. Rolled seeds, printed. No new literal that is one seed's own output.
- The landed checks stay verbatim; only the count line moves.
- Never edit a demo file, the gate table, the README, the package version, the registry table, another module, or another phase's documents.

## Report

Read-confirmation first (each file, its line count). One line of outcome. Then bullets: both gate outputs whole; the diff summary as files and line counts (`git diff --stat` against main); the commit hash on your branch; every nonconformity as its own labeled bullet. Fixture seeds: the two rolled seeds, and the landed 9; no seed is special.

## Amendment

Checks 13 and 14 as first written stated laws the fixed rest band cannot satisfy: the band's gap side is bounded by restBelow, not restAbove; and slabs 0.2 tall under the default gap tolerance 0.22 let one pass carry support past a level. Both checks are rewritten above: check 13 rolls restBelow and reads the gap against it; check 14 stacks slabs 0.5 tall. The agent stopped on the first wording, with 14 PASS / 2 FAIL at two seeds, and resumed on this one.

## The report's gate lines

- `node scripts/support-test.mjs`: seeds 1150744252 and 1657598116; 16 PASS lines, `support-test: 16 PASS / 0 FAIL`, `support-test PASS`, exit 0, twice.
- Bracket at the landing: support, registry, every tail PASS.
- Branch commit 7f57185 on phase/0.0.84-support, landed by squash into main.
- Nonconformities the agent named, both brief errors, both resolved by the amendment above: check 13 read the gap against restAbove where the rest band bounds it by restBelow; check 14 stacked 0.2-tall slabs under the 0.22 gap tolerance, so one pass carried support past a level. The first run stopped at 14 PASS / 2 FAIL, seeds 1093201019 and 2537780208.
