# Task 0.0.87-1 — opponent: the part table as data

One job: the second pass over the opponent module under the general parts order, phase A14. Write exactly the design below, run the gate, write the phase document, commit on your branch, report. You design nothing beyond this brief; anything it did not foresee stops the task and is reported as a nonconformity.

Model: Sonnet 5.

Where you work: the worktree at `/home/batman/combo-wt/opponent`, branch `phase/0.0.87-opponent`. You never touch `/home/batman/combo-engine` (the main tree). You never edit `scripts/gate.mjs`, `README.md`, `package.json`, `src/modules/registry/registry.js`, any other module, or any document of another phase. You never edit a demo file.

Required reading, in order, whole (confirm each with its line count at the top of your report):
1. This file.
2. `/home/batman/combo-engine/docs/plans/batch-general-1.md`, the sections "The generalization law", "The rules of the run", and "A14, opponent".
3. `/home/batman/combo-wt/opponent/src/modules/opponent/opponent.js`.
4. `/home/batman/combo-wt/opponent/scripts/opponent-test.mjs`.
5. `/home/batman/combo-wt/opponent/src/modules/senses/senses.js`, whole, to see the one module caller of AG; you do not edit it.
6. `/home/batman/combo-wt/opponent/docs/modules/module-pattern.md`.
7. `/home/batman/combo-wt/opponent/docs/plans/phase-0.0.73-aim.md`, as the shape of a phase document.

## The design, fixed

Module `src/modules/opponent/opponent.js`. The exports AG, makeAgentState, and hitAgent stay, with the same names and the same behavior at the defaults. Changes, and only these:

1. The hit law moves into an internal function `hitWith(a, partSuffix, energyDeposited, impulse, roundName, parts, dials, sedative)`: the demo's arithmetic line for line, with `AG.PART[partSuffix] || AG.PART[""]` read as `parts[partSuffix] || parts[""]`, `AG.SED_RATE` as `dials.SED_RATE`, `AG.SED_ONSET` as `dials.SED_ONSET`, and the test `roundName === "tranq_dart"` as `sedative.includes(roundName)`.
2. `export const AG_DIALS = { STUN_DECAY: AG.STUN_DECAY, SED_RATE: AG.SED_RATE, SED_ONSET: AG.SED_ONSET, VIEW_DEG: AG.VIEW_DEG, VIEW_M: AG.VIEW_M, HEAR_M: AG.HEAR_M, AIM_S: AG.AIM_S, REAIM_S: AG.REAIM_S, SPREAD_MRAD: AG.SPREAD_MRAD, LOSE_S: AG.LOSE_S };` and `export const SEDATIVE_ROUNDS = ["tranq_dart"];`
3. The exported `hitAgent(a, partSuffix, energyDeposited, impulse, roundName)` calls `hitWith(..., AG.PART, AG_DIALS, SEDATIVE_ROUNDS)`.
4. `export function makeOpponent(opts)` returns `{ parts, dials, sedative, makeAgentState, hitAgent }` where `parts` is `opts.parts` or AG.PART, `dials` is `{ ...AG_DIALS, ...opts.dials }`, `sedative` is `opts.sedative` or SEDATIVE_ROUNDS, and the returned `hitAgent(a, part, E, J, round)` calls hitWith with those three.
5. Add `export const PARTS_CONTRACT = { "<suffix>": { drop: "number > 0", carry: "number in 0 to 1", lethalE: "number > 0", label: "string" }, "": "the torso row, required" };` and `export function checkParts(table)` returning a list of plain problem strings, empty when clean, every problem in one pass: not an object gives the single problem `parts: not an object`; then `parts: a "" row required` when the empty-string key is missing; then per row `parts.<key>.drop: number > 0 required`, `parts.<key>.carry: number in 0 to 1 required`, `parts.<key>.lethalE: number > 0 required`, `parts.<key>.label: string required`.
6. Add to the header comment a numbered list of these changes as the second pass's substitutions.

Gate `scripts/opponent-test.mjs`. The six landed checks stay verbatim, in order, with their names; the seeds line stays. The import line gains `makeOpponent`, `checkParts`. Then these checks, appended after the six:

7. `opponent: at a rolled part table a round over the handed lethal energy kills and one under it adds impulse over drop times carry to the stun exactly` — 200 rolls: a table with a "" row and three rolled rows (drop 1 to 20, carry 0.1 to 1, lethalE 100 to 3000, label a rolled string); `makeOpponent({ parts })`; a rolled row; a hit with energy over its lethalE is lethal; a fresh state hit with energy under it and impulse J rolled in 0 to drop times 0.5 over carry has stun equal to J over drop times carry within 1e-12 and is not down.
8. `opponent: a rolled sedative round name sedates, and the demo's dart name is an ordinary hit under it` — `makeOpponent({ sedative: [name] })` with a rolled name: a hit with that name has an effect starting with `darted` or equal to `sedated, going under`, and a hit with `tranq_dart` has an effect starting with `hit `.
9. `opponent: the contract counts every problem` — `checkParts({ h: { drop: 0, carry: 2, lethalE: -1, label: 3 } })` returns exactly 5 problems (the missing "" row and the four fields); `checkParts(AG.PART)` returns 0; `checkParts(null)` returns 1.
10. `opponent: the module imports only from its own folder or a sibling module` — read the module file with fs and assert every `import ... from "<x>"` specifier matches `^\.\.\/[a-z0-9-]+\/` or `^\.\/`; opponent has no imports, so the check passes on an empty list.

The count line becomes `opponent-test: 10 PASS / 0 FAIL`, then `opponent-test PASS`, exit 0. Any FAIL stops the task.

## Steps

1. Read the list above. Confirm.
2. Write the module changes.
3. Write the gate changes.
4. Run, from the worktree root, twice: `node scripts/opponent-test.mjs`. Both runs must print the seeds line, 10 PASS lines, the count line, and the verdict, exit 0. Paste both outputs whole in the report. Then run `node scripts/senses-test.mjs` once; it must still print `senses-test: 5 PASS / 0 FAIL` and `senses-test PASS`; paste its last two lines.
5. Write `docs/plans/phase-0.0.87-opponent.md` in the worktree, this shape:

```
# Phase 0.0.87 — opponent: the part table as data

Status: PLANNED. Built in worktree, awaiting the landing.
<!-- At landing this line becomes: Status: LANDED, commit `<hash>`, <date>. Gate: 10 PASS / 0 FAIL; bracket unmoved. -->

<One paragraph: the second pass over the opponent module under the general parts order, phase A14; what moved, in plain words.>

## Lift kind

SHAPED second pass — the hit law is untouched; the part table, the dials, and the sedative round names are handed to a maker, defaults the demo's; the parts contract. The changes are the numbered list in the module header.

## Acceptance arithmetic for the phase

Every number below is the run's output (rolled seeds <the two seeds>).

- `node scripts/opponent-test.mjs` prints a seeds line, 10 PASS lines, then `opponent-test: 10 PASS / 0 FAIL`, then `opponent-test PASS`, exit 0.
- The six landed checks are verbatim. `senses-test: 5 PASS / 0 FAIL` in the worktree.
- Bracket, run at the landing: opponent, senses.

## Tasks

- 0.0.87-1 — the second pass. → `task-0.0.87-1-opponent.md`
```

6. Commit on your branch, all three files, with this message exactly:

```
phase 0.0.87 — opponent: the part table as data

Second pass under the general parts order. The part table, the dials, and the sedative names are handed to a maker, defaults the demo's; the parts contract. Gate 10 PASS / 0 FAIL at rolled seeds; the six landed checks verbatim.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01QSq3kZC3Bk9SC5RwnqYUfs
```

Do not push. Do not touch main.

## Rules

- No timed simulations. No replays. Rolled seeds, printed. No literal that is one seed's own output.
- The landed checks stay verbatim; only the count line moves.
- Never edit a demo file, the gate table, the README, the package version, the registry table, another module, or another phase's documents.

## Report

Read-confirmation first (each file, its line count). One line of outcome. Then bullets: both gate outputs whole and the senses tail; the diff summary as files and line counts (`git diff --stat` against main); the commit hash on your branch; every nonconformity as its own labeled bullet. Fixture seeds: the two rolled seeds; no seed is special.

## The report's gate lines

- `node scripts/opponent-test.mjs`: seeds 121582236 and 432213624; 10 PASS lines, `opponent-test: 10 PASS / 0 FAIL`, `opponent-test PASS`, exit 0, twice. The senses tail in the worktree: `senses-test: 5 PASS / 0 FAIL`, seed 557389717.
- Bracket at the landing: opponent, senses, registry, every tail PASS.
- Branch commit c62977c on phase/0.0.87-opponent, landed by squash into main.
- Nonconformities the agent named: the diff summary was taken against the branch's fork point, main having moved on under it; the phase document's "two seeds" read as one seed per gate in the bracket, the gate carrying one seed line. Neither moved a check or an option.
