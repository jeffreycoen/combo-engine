# Task 0.0.86-1 — weldstress: the load factor as an argument

One job: the second pass over the weldstress module under the general parts order, phase A11. Write exactly the design below, run the gate, write the phase document, commit on your branch, report. You design nothing beyond this brief; anything it did not foresee stops the task and is reported as a nonconformity.

Model: Sonnet 5.

Where you work: the worktree at `/home/batman/combo-wt/weldstress`, branch `phase/0.0.86-weldstress`. You never touch `/home/batman/combo-engine` (the main tree). You never edit `scripts/gate.mjs`, `README.md`, `package.json`, `src/modules/registry/registry.js`, any other module, or any document of another phase. You never edit a demo file.

Required reading, in order, whole (confirm each with its line count at the top of your report):
1. This file.
2. `/home/batman/combo-engine/docs/plans/batch-general-1.md`, the sections "The generalization law", "The rules of the run", and "A11, weldstress".
3. `/home/batman/combo-wt/weldstress/src/modules/weldstress/weldstress.js`.
4. `/home/batman/combo-wt/weldstress/scripts/weldstress-test.mjs`.
5. `/home/batman/combo-wt/weldstress/docs/modules/module-pattern.md`.
6. `/home/batman/combo-wt/weldstress/docs/plans/phase-0.0.73-aim.md`, as the shape of a phase document.

## The design, fixed

Module `src/modules/weldstress/weldstress.js`. Every function keeps its name, its landed arguments in their order, and its export; the law is unchanged except that the factor 9 is an argument. Changes, and only these:

1. Add `export const LOAD_FACTOR = 9;`
2. `weldLoads(builder, spec, list, ws, aMag, k = LOAD_FACTOR)` computes `load: aMag * om * k`.
3. `ratedLimits(builder, spec, list, ws, k = LOAD_FACTOR)` calls `weldLoads(builder, spec, list, ws, 1, k)` and computes `gLim: ws[i].strength / Math.max(r.om, 0.1) / k`.
4. `breaking` and `splitByRoot` are unchanged.
5. Add `export const WELDS_CONTRACT = { a: "integer index", b: "integer index", strength: "number > 0" };` and `export function checkWelds(ws)` returning a list of plain problem strings, empty when clean, every problem in one pass: not an array gives the single problem `welds: not an array`; then per weld i: `welds.<i>.a: integer index required` (an integer at least 0); `welds.<i>.b: integer index required`; `welds.<i>.strength: number > 0 required`.
6. Add to the header comment a numbered list of these changes as the second pass's substitutions.

Gate `scripts/weldstress-test.mjs`. The nine landed checks stay verbatim, in order, with their names, seedless as they are. The import line gains `LOAD_FACTOR` and `checkWelds`. Before the first check add a rolled seed printed as `seeds {"weldstress":<n>}`, read from `process.env.SEED` when set, else rolled, with the small seeded stream the other gates use. Then these checks, appended after the nine:

10. `weldstress: a rolled factor scales every load and every rating exactly` — 200 rolls of k in 1 to 30 and aMag in 0.1 to 50: every `weldLoads(B, SPEC, starter, ws, aMag, k)[i].load` equals `aMag * om * k` within 1e-9 relative, and every `ratedLimits(B, SPEC, starter, ws, k)[i].gLim` equals `ws[i].strength / Math.max(om, 0.1) / k` within 1e-9 relative, with om the landed check's own values 6 and 3.
11. `weldstress: the contract counts every problem` — `checkWelds([{ a: 0.5, b: "x", strength: 0 }])` returns exactly 3 problems; `checkWelds(ws)` returns 0; `checkWelds(null)` returns 1.
12. `weldstress: the module imports only from its own folder or a sibling module` — read the module file with fs and assert every `import ... from "<x>"` specifier matches `^\.\.\/[a-z0-9-]+\/` or `^\.\/`; weldstress has no imports, so the check passes on an empty list.

The count line becomes `weldstress-test: 12 PASS / 0 FAIL`, then `weldstress-test PASS`, exit 0. Any FAIL stops the task.

## Steps

1. Read the list above. Confirm.
2. Write the module changes.
3. Write the gate changes.
4. Run, from the worktree root, twice: `node scripts/weldstress-test.mjs`. Both runs must print the seeds line, 12 PASS lines, the count line, and the verdict, exit 0. Paste both outputs whole in the report.
5. Write `docs/plans/phase-0.0.86-weldstress.md` in the worktree, this shape:

```
# Phase 0.0.86 — weldstress: the load factor as an argument

Status: PLANNED. Built in worktree, awaiting the landing.
<!-- At landing this line becomes: Status: LANDED, commit `<hash>`, <date>. Gate: 12 PASS / 0 FAIL; bracket unmoved. -->

<One paragraph: the second pass over the weldstress module under the general parts order, phase A11; what moved, in plain words.>

## Lift kind

SHAPED second pass — the load law is untouched; its factor is an argument with the demo's 9 as the default; the welds contract. The changes are the numbered list in the module header.

## Acceptance arithmetic for the phase

Every number below is the run's output (rolled seeds <the two seeds>).

- `node scripts/weldstress-test.mjs` prints a seeds line, 12 PASS lines, then `weldstress-test: 12 PASS / 0 FAIL`, then `weldstress-test PASS`, exit 0.
- The nine landed checks are verbatim.
- Bracket, run at the landing: weldstress.

## Tasks

- 0.0.86-1 — the second pass. → `task-0.0.86-1-weldstress.md`
```

6. Commit on your branch, all three files, with this message exactly:

```
phase 0.0.86 — weldstress: the load factor as an argument

Second pass under the general parts order. The load factor is an argument with the demo's 9 as the default; the welds contract. Gate 12 PASS / 0 FAIL at rolled seeds; the nine landed checks verbatim.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01QSq3kZC3Bk9SC5RwnqYUfs
```

Do not push. Do not touch main.

## Rules

- No timed simulations. No replays. Rolled seeds, printed. No literal that is one seed's own output.
- The landed checks stay verbatim; only the count line moves.
- Never edit a demo file, the gate table, the README, the package version, the registry table, another module, or another phase's documents.

## Report

Read-confirmation first (each file, its line count). One line of outcome. Then bullets: both gate outputs whole; the diff summary as files and line counts (`git diff --stat` against main); the commit hash on your branch; every nonconformity as its own labeled bullet. Fixture seeds: the two rolled seeds; no seed is special.

## The report's gate lines

- `node scripts/weldstress-test.mjs`: seeds 1248727867 and 323097083; 12 PASS lines, `weldstress-test: 12 PASS / 0 FAIL`, `weldstress-test PASS`, exit 0, twice.
- Bracket at the landing: weldstress, builder, registry, every tail PASS.
- Branch commit 8ed079e on phase/0.0.86-weldstress, landed by squash into main.
- No nonconformity. Two readings the agent named where the brief gave the behavior and not the mechanism: check 10's relative tolerance is |a − b| at most 1e-9 times the larger of 1, |a|, |b|; LOAD_FACTOR is imported into the gate and exercised only through its default.
