# Task 0.0.76-1 — solids: the hit record handed in

One job: the second pass over the solids module under the general parts order, phase A2. Write exactly the design below, run the gate, write the phase document, commit on your branch, report. You design nothing beyond this brief; anything it did not foresee stops the task and is reported as a nonconformity.

Model: Sonnet 5.

Where you work: the worktree at `/home/batman/combo-wt/solids`, branch `phase/0.0.76-solids`. You never touch `/home/batman/combo-engine` (the main tree). You never edit `scripts/gate.mjs`, `README.md`, `package.json`, `src/modules/registry/registry.js`, or any document of another phase. You never edit a demo file.

Required reading, in order, whole (confirm each with its line count at the top of your report):
1. This file.
2. `/home/batman/combo-engine/docs/plans/batch-general-1.md`, the sections "The generalization law", "The rules of the run", and "A2, solids".
3. `/home/batman/combo-wt/solids/src/modules/solids/solids.js`.
4. `/home/batman/combo-wt/solids/scripts/solids-test.mjs`.
5. `/home/batman/combo-wt/solids/docs/modules/module-pattern.md`.
6. `/home/batman/combo-wt/solids/docs/plans/phase-0.0.73-aim.md`, as the shape of a phase document.

## The design, fixed

Module `src/modules/solids/solids.js`. Every existing function keeps its name, its arithmetic, and its export. Changes, and only these:

1. Add `export function makeHit()` returning a fresh record `{ t: 0, tx: 0, nx: 0, ny: 0, nz: 0, solid: -1, path: 0, mat: 0 }`.
2. Replace the line `export const hit = { ... }` with `export const hit = makeHit();` and a comment naming it the default scratch record: the passed record is the law.
3. `raySolid(s, ox, oy, oz, dx, dy, dz, out = hit)`: the body is unchanged except that every write to `hit.` becomes a write to `out.`.
4. `raycastWorld(solids, ox, oy, oz, dx, dy, dz, maxT, out = hit)`: calls `raySolid(..., out)` and reads and writes `out.` where it read and wrote `hit.`.
5. `rayBlocked` is unchanged.
6. Add `export const SOLID_CONTRACT = { planes: "float array of n times 4", n: "integer >= 4", min: "3 finite numbers", max: "3 finite numbers", mat: "integer" };`
7. Add `export function checkSolid(s)` returning a list of plain problem strings, empty when clean, every problem in one pass: not an object gives the single problem `solid: not an object`; then `solid.n: integer >= 4 required`; `solid.planes: float array of n times 4 required` (a Float64Array or an array of finite numbers, length equal to 4 times n, checked against n only when n is valid, otherwise reported as its own problem); `solid.min: 3 finite numbers required`; `solid.max: 3 finite numbers required`; `solid.mat: integer required`.
8. Add to the header comment a numbered list of these changes as the second pass's substitutions.

Gate `scripts/solids-test.mjs`. The twelve landed checks stay verbatim, in order, with their names. The import line gains `makeHit` and `checkSolid`. The gate gains a rolled seed printed as `seeds {"solids":<n>}` before the checks, read from `process.env.SEED` when set, else rolled. Then these checks, appended after the twelve:

13. `two records: raycasts into two makeHit records do not disturb each other at rolled solids` — at a rolled seed build two unit boxes at rolled positions along the x axis (centers between 3 and 40, at least 3 apart), cast the x ray from -100 into record one against the near box alone and into record two against the far box alone, snapshot record one, then assert record one is unchanged after the second cast and each record holds its own entry distance and solid index. 300 rolls.
14. `default record and passed record agree` — the same world cast through the default record and through a fresh makeHit record gives equal t, tx, nx, ny, nz, solid, mat, path.
15. `the contract counts every problem of a broken solid` — `checkSolid({ planes: [0, 0, 0], n: 3, min: [0, 0], max: [0, 0, "a"], mat: 1.5 })` returns exactly 5 problems; `checkSolid(makeBox(0, 0, 0, 1, 1, 1, 3))` returns 0; `checkSolid(null)` returns 1.
16. `the module imports only from its own folder or a sibling module` — read the module file with fs and assert every `import ... from "<x>"` specifier matches `^\.\.\/[a-z0-9-]+\/` or `^\.\/`; solids has no imports, so the check passes on an empty list.

The count line becomes `solids-test: 16 PASS / 0 FAIL`, then `solids-test PASS`, exit 0. Any FAIL stops the task.

## Steps

1. Read the list above. Confirm.
2. Write the module changes.
3. Write the gate changes.
4. Run, from the worktree root, twice: `node scripts/solids-test.mjs`. Both runs must print 16 PASS lines, the count line, and the verdict, exit 0. Paste both outputs whole in the report.
5. Write `docs/plans/phase-0.0.76-solids.md` in the worktree, this shape:

```
# Phase 0.0.76 — solids: the hit record handed in

Status: PLANNED. Built in worktree, awaiting the landing.
<!-- At landing this line becomes: Status: LANDED, commit `<hash>`, <date>. Gate: 16 PASS / 0 FAIL; bracket unmoved. -->

<One paragraph: the second pass over the solids module under the general parts order, phase A2; what moved, in plain words.>

## Lift kind

SHAPED second pass — the landed arithmetic is untouched; the changes are the numbered substitutions in the module header.

## Acceptance arithmetic for the phase

Every number below is the run's output (rolled seeds <the two seeds>).

- `node scripts/solids-test.mjs` prints a seeds line, 16 PASS lines, then `solids-test: 16 PASS / 0 FAIL`, then `solids-test PASS`, exit 0.
- The twelve landed checks are verbatim.
- Bracket, run at the landing: solids, ballistics, voxel, support, senses.

## Tasks

- 0.0.76-1 — the second pass. → `task-0.0.76-1-solids.md`
```

6. Commit on your branch, all three files, with this message exactly:

```
phase 0.0.76 — solids: the hit record handed in

Second pass under the general parts order. makeHit, the record as an argument, the solid contract. Gate 16 PASS / 0 FAIL at rolled seeds; the twelve landed checks verbatim.

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

- `node scripts/solids-test.mjs`: seeds 557096677 and 1277914957; 16 PASS lines, `solids-test: 16 PASS / 0 FAIL`, `solids-test PASS`, exit 0, twice.
- Bracket at the landing: solids, ballistics, voxel, support, senses, every tail PASS.
- Branch commit be1b000 on phase/0.0.76-solids, landed by squash into main.
- Nonconformities the agent named: the gate's header comment still said twelve seedless checks (corrected at the landing to sixteen, the rest at a rolled seed); checks 13 and 14 needed a rolling mechanism the brief gave only as ranges (a local seeded stream, boxes on the x axis, one box per cast); the planes rule under an invalid n is reported as its own problem, the reading that gives the brief's stated five.
