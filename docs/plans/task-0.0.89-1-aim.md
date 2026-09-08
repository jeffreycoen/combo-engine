# Task 0.0.89-1 — aim: the names handed in

One job: the second pass over the aim module under the general parts order, phase A7. Write exactly the design below, run the gate, write the phase document, commit on your branch, report. You design nothing beyond this brief; anything it did not foresee stops the task and is reported as a nonconformity.

Model: Sonnet 5.

Where you work: the worktree at `/home/batman/combo-wt/aim`, branch `phase/0.0.89-aim`. You never touch `/home/batman/combo-engine` (the main tree). You never edit `scripts/gate.mjs`, `README.md`, `package.json`, `src/modules/registry/registry.js`, any other module, or any document of another phase. You never edit a demo file.

Required reading, in order, whole (confirm each with its line count at the top of your report):
1. This file.
2. `/home/batman/combo-engine/docs/plans/batch-general-1.md`, the sections "The generalization law", "The rules of the run", and "A7, aim".
3. `/home/batman/combo-wt/aim/src/modules/aim/aim.js`.
4. `/home/batman/combo-wt/aim/scripts/aim-test.mjs`.
5. `/home/batman/combo-wt/aim/docs/modules/module-pattern.md`.
6. `/home/batman/combo-wt/aim/docs/plans/phase-0.0.73-aim.md`, the landed phase document of this module and the shape to follow.

## The design, fixed

Module `src/modules/aim/aim.js`. Every export stays; every formula is unchanged. Changes, and only these:

1. Add `export const DEFAULT_SKIP = (b) => b.own === "ship" || b.kind === "head" || b.kind === "slug" || b.kind === "missile";` the demo's own filter, named.
2. `aimCandidates(kind, ship, bodies, muzzleAt, kinds, skip = DEFAULT_SKIP, minRange = 3)`: the filter line becomes `if (skip(b)) continue;` and the near test reads `dd < minRange`.
3. `makeAim(opts)` reads three more options: `skip` (default DEFAULT_SKIP), `minRange` (default 3), `armAction` (default "aim"). `arm` returns `{ k: armAction, w: kind }`; `cancel` returns `{ k: armAction, w: null }`; `cycleTarget` passes skip and minRange to aimCandidates.
4. Add `export const KINDS_CONTRACT = { "<kind>": { cone: "number or null", reach: "number or null", V0: "number or null", life: "number or null", thrust: "number >= 0", thrustFuel: "number >= 0", maxRange: "number or null", commitKind: "string" } };` and `export function checkKinds(table)` returning a list of plain problem strings, empty when clean, every problem in one pass: not an object gives the single problem `kinds: not an object`; then per kind, for cone, reach, V0, life: `kinds.<k>.<f>: number or null required`; for thrust and thrustFuel: `kinds.<k>.<f>: number >= 0 required`; for maxRange: `kinds.<k>.maxRange: number or null required`; for commitKind: `kinds.<k>.commitKind: string required`.
5. Add to the header comment, after the numbered substitutions, a second numbered list for the second pass: the skip predicate, the minimum range, the arm action name, the contract.

Gate `scripts/aim-test.mjs`. The eight landed checks stay verbatim, in order, with their names; the seeds line stays. The import line gains `DEFAULT_SKIP`, `checkKinds`. Then these checks, appended after the eight:

9. `aim: a rolled arm action name comes back from arm and cancel` — 50 rolls of a name `"arm" + floor(rnd() * 1e6)`: `makeAim({ armAction: name })`; arm returns k equal to the name and w the kind; cancel returns k equal to the name and w null.
10. `aim: a handed skip predicate filters a rolled body set exactly` — 100 rolls: a rolled ship, a set of eight rolled targets inside reach and cone (built the way rollTarget does, then placed on the ship's own heading so the cone holds), each with a rolled `tag` in 0 to 2; `aimCandidates` with `skip = (b) => b.tag === 1` returns exactly the bodies whose tag is not 1, and none with tag 1.
11. `aim: a rolled minimum range excludes bodies inside it` — 100 rolls of minRange in 1 to 10: a body dead ahead at 0.9 times minRange is excluded and one at 1.1 times minRange, inside reach, is included.
12. `aim: the contract counts every problem` — `checkKinds({ z: { cone: "a", reach: null, V0: 1, life: -1, thrust: -1, thrustFuel: 0, maxRange: "m", commitKind: 5 } })` returns exactly 4 problems; `checkKinds(KINDS)` returns 0; `checkKinds(null)` returns 1.
13. `aim: the module imports only from its own folder or a sibling module` — read the module file with fs and assert every `import ... from "<x>"` specifier matches `^\.\.\/[a-z0-9-]+\/` or `^\.\/`.

The count line becomes `aim-test: 13 PASS / 0 FAIL`, then `aim-test PASS`, exit 0. Any FAIL stops the task.

## Steps

1. Read the list above. Confirm.
2. Write the module changes.
3. Write the gate changes.
4. Run, from the worktree root, twice: `node scripts/aim-test.mjs`. Both runs must print the seeds line, 13 PASS lines, the count line, and the verdict, exit 0. Paste both outputs whole in the report.
5. Write `docs/plans/phase-0.0.89-aim.md` in the worktree, this shape:

```
# Phase 0.0.89 — aim: the names handed in

Status: PLANNED. Built in worktree, awaiting the landing.
<!-- At landing this line becomes: Status: LANDED, commit `<hash>`, <date>. Gate: 13 PASS / 0 FAIL; bracket unmoved. -->

<One paragraph: the second pass over the aim module under the general parts order, phase A7; what moved, in plain words.>

## Lift kind

SHAPED second pass — the aiming law and the lead solve are untouched; the candidate filter, the minimum range, and the arm action name are options with the demo's defaults; the kinds contract. The changes are the second numbered list in the module header.

## Acceptance arithmetic for the phase

Every number below is the run's output (rolled seeds <the two seeds>).

- `node scripts/aim-test.mjs` prints a seeds line, 13 PASS lines, then `aim-test: 13 PASS / 0 FAIL`, then `aim-test PASS`, exit 0.
- The eight landed checks are verbatim.
- Bracket, run at the landing: aim.

## Tasks

- 0.0.89-1 — the second pass. → `task-0.0.89-1-aim.md`
```

6. Commit on your branch, all three files, with this message exactly:

```
phase 0.0.89 — aim: the names handed in

Second pass under the general parts order. The candidate filter, the minimum range, and the arm action name are options with the demo's defaults; the kinds contract. Gate 13 PASS / 0 FAIL at rolled seeds; the eight landed checks verbatim.

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

- `node scripts/aim-test.mjs`: seeds 486296856 and 937672535; 13 PASS lines, `aim-test: 13 PASS / 0 FAIL`, `aim-test PASS`, exit 0, twice.
- Bracket at the landing: aim, wells, registry, every tail PASS.
- Branch commit 94897a2 on phase/0.0.89-aim, landed by squash into main.
- No nonconformity named. The diff summary was taken against the branch's fork point, main having moved on under it.
