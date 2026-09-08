# Task 0.0.78-1 — receipts: the line table handed in

One job: the second pass over the receipts module under the general parts order, phase A16. Write exactly the design below, run the gate, write the phase document, commit on your branch, report. You design nothing beyond this brief; anything it did not foresee stops the task and is reported as a nonconformity.

Model: Sonnet 5.

Where you work: the worktree at `/home/batman/combo-wt/receipts`, branch `phase/0.0.78-receipts`. You never touch `/home/batman/combo-engine` (the main tree). You never edit `scripts/gate.mjs`, `README.md`, `package.json`, `src/modules/registry/registry.js`, or any document of another phase. You never edit a demo file.

Required reading, in order, whole (confirm each with its line count at the top of your report):
1. This file.
2. `/home/batman/combo-engine/docs/plans/batch-general-1.md`, the sections "The generalization law", "The rules of the run", and "A16, receipts".
3. `/home/batman/combo-wt/receipts/src/modules/receipts/receipts.js`.
4. `/home/batman/combo-wt/receipts/scripts/receipts-test.mjs`.
5. `/home/batman/combo-wt/receipts/docs/modules/module-pattern.md`.
6. `/home/batman/combo-wt/receipts/docs/plans/phase-0.0.73-aim.md`, as the shape of a phase document.

## The design, fixed

Module `src/modules/receipts/receipts.js`. Every line's text and every function's behavior at the defaults are unchanged. Changes, and only these:

1. `const LINES = { ... }` becomes `export const LINES = { ... }`, the table itself untouched.
2. `receipt(ev)` becomes `receipt(ev, lines = LINES)` and reads `lines[ev.type]` where it read `LINES[ev.type]`.
3. `receiptLog(events)` becomes `receiptLog(events, lines = LINES)` and passes `lines` to receipt.
4. Add `export const LINES_CONTRACT = { "<event type>": "function(event) -> string" };`
5. Add `export function checkLines(table)` returning a list of plain problem strings, empty when clean, every problem in one pass: not an object gives the single problem `lines: not an object`; then one problem `lines.<key>: function required` for every key whose value is not a function.
6. Add to the header comment a numbered list of these changes as the second pass's substitutions.

Gate `scripts/receipts-test.mjs`. The four landed checks stay verbatim, in order, with their names. The import line gains `LINES` and `checkLines`. The seed line stays as it is. Then these checks, appended after the four:

5. `receipts: a rolled line table renders a rolled event type through the handed function` — roll a type name as `"ev" + floor(rnd() * 1e6)` and a number n; the table `{ [type]: (ev) => "custom " + ev.n }`; `receipt({ type, n }, table)` equals `"custom " + n`; `receiptLog([{ type, n }, { type, n: n + 1 }], table)` is those two lines in order. 100 rolls.
6. `receipts: an unknown type under a handed table still gets the generic line` — `receipt({ type: "other", n: 2 }, { known: () => "x" })` starts with `other` and includes `n 2`.
7. `receipts: the contract counts every problem` — `checkLines({ a: 1, b: () => "", c: "x" })` returns exactly 2 problems; `checkLines(LINES)` returns 0; `checkLines(null)` returns 1.
8. `receipts: the module imports only from its own folder or a sibling module` — read the module file with fs and assert every `import ... from "<x>"` specifier matches `^\.\.\/[a-z0-9-]+\/` or `^\.\/`; receipts has no imports, so the check passes on an empty list.

The count line becomes `receipts-test: 8 PASS / 0 FAIL`, then `receipts-test PASS`, exit 0. Any FAIL stops the task.

## Steps

1. Read the list above. Confirm.
2. Write the module changes.
3. Write the gate changes.
4. Run, from the worktree root, twice: `node scripts/receipts-test.mjs`. Both runs must print the seeds line, 8 PASS lines, the count line, and the verdict, exit 0. Paste both outputs whole in the report.
5. Write `docs/plans/phase-0.0.78-receipts.md` in the worktree, this shape:

```
# Phase 0.0.78 — receipts: the line table handed in

Status: PLANNED. Built in worktree, awaiting the landing.
<!-- At landing this line becomes: Status: LANDED, commit `<hash>`, <date>. Gate: 8 PASS / 0 FAIL; bracket unmoved. -->

<One paragraph: the second pass over the receipts module under the general parts order, phase A16; what moved, in plain words.>

## Lift kind

SHAPED second pass — the landed lines are untouched; the changes are the numbered substitutions in the module header.

## Acceptance arithmetic for the phase

Every number below is the run's output (rolled seeds <the two seeds>).

- `node scripts/receipts-test.mjs` prints a seeds line, 8 PASS lines, then `receipts-test: 8 PASS / 0 FAIL`, then `receipts-test PASS`, exit 0.
- The four landed checks are verbatim.
- Bracket, run at the landing: receipts.

## Tasks

- 0.0.78-1 — the second pass. → `task-0.0.78-1-receipts.md`
```

6. Commit on your branch, all three files, with this message exactly:

```
phase 0.0.78 — receipts: the line table handed in

Second pass under the general parts order. The line table exported and handed in, the lines contract. Gate 8 PASS / 0 FAIL at rolled seeds; the four landed checks verbatim.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01QSq3kZC3Bk9SC5RwnqYUfs
```

Do not push. Do not touch main.

## Rules

- No timed simulations. No replays. Rolled seeds, printed. No literal that is one seed's own output.
- The landed checks stay verbatim; only the count line moves.
- Never edit a demo file, the gate table, the README, the package version, the registry table, or another phase's documents.

## Report

Read-confirmation first (each file, its line count). One line of outcome. Then bullets: both gate outputs whole; the diff summary as files and line counts (`git diff --stat` against main); the commit hash on your branch; every nonconformity as its own labeled bullet. Fixture seeds: the two rolled seeds; no seed is special.

## The report's gate lines

- `node scripts/receipts-test.mjs`: seeds 428271131 and 949037283; 8 PASS lines, `receipts-test: 8 PASS / 0 FAIL`, `receipts-test PASS`, exit 0, twice.
- Bracket at the landing: receipts, PASS.
- Branch commit e279ece on phase/0.0.78-receipts, landed by squash into main. Nonconformities: none.
