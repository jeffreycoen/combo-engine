# Task 0.0.88-1 — senses: the view as dials

One job: the second pass over the senses module under the general parts order, phase A15. Write exactly the design below, run the gate, write the phase document, commit on your branch, report. You design nothing beyond this brief; anything it did not foresee stops the task and is reported as a nonconformity.

Model: Sonnet 5.

Where you work: the worktree at `/home/batman/combo-wt/senses`, branch `phase/0.0.88-senses`. You never touch `/home/batman/combo-engine` (the main tree). You never edit `scripts/gate.mjs`, `README.md`, `package.json`, `src/modules/registry/registry.js`, any other module, or any document of another phase. You never edit a demo file.

Required reading, in order, whole (confirm each with its line count at the top of your report):
1. This file.
2. `/home/batman/combo-engine/docs/plans/batch-general-1.md`, the sections "The generalization law", "The rules of the run", and "A15, senses".
3. `/home/batman/combo-wt/senses/src/modules/senses/senses.js`.
4. `/home/batman/combo-wt/senses/scripts/senses-test.mjs`.
5. `/home/batman/combo-wt/senses/src/modules/opponent/opponent.js`, for AG.
6. `/home/batman/combo-wt/senses/docs/modules/module-pattern.md`.
7. `/home/batman/combo-wt/senses/docs/plans/phase-0.0.73-aim.md`, as the shape of a phase document.

## The design, fixed

Module `src/modules/senses/senses.js`. Both functions keep their names, their landed arguments in their order, and their exports; the arithmetic is unchanged except that its literals are read from a dials object. Changes, and only these:

1. Add `export const SENSE_DIALS = { viewM: AG.VIEW_M, viewDeg: AG.VIEW_DEG, eyeUp: 0.35, eyeClear: 0.45, chest: 0.32 };` The import of AG stays, for these defaults only.
2. `canSee(a, solids, px, py, pz, blockedFn, dials = SENSE_DIALS)`: the eye height `c[1] + 0.35` reads `dials.eyeUp`; the range test reads `dials.viewM`; the cone test reads `dials.viewDeg`; the clearance `0.45 / d` reads `dials.eyeClear`. The local distance variable keeps its name; the new argument is named `dials`.
3. `coverSolid(a, solids, px, py, pz, dials = SENSE_DIALS)`: the chest offset `* 0.32` in the three coordinates reads `dials.chest`.
4. Add `export const AGENT_BODY_CONTRACT = { body: "object with c or cc, 3 numbers", fx: "finite number", fz: "finite number", down: "0/1 or boolean, optional" };` and `export function checkAgentBody(a)` returning a list of plain problem strings, empty when clean, every problem in one pass: not an object gives the single problem `agent: not an object`; then `agent.body: object with c or cc of 3 finite numbers required`; `agent.fx: finite number required`; `agent.fz: finite number required`.
5. Add `export function checkSenseDials(d)`: not an object gives `dials: not an object`; then for each of viewM, viewDeg, eyeUp, eyeClear, chest: `dials.<name>: number > 0 required` when missing or not a number over 0; and `dials.viewDeg: at most 360 required` when over 360.
6. Add to the header comment a numbered list of these changes as the second pass's substitutions.

Gate `scripts/senses-test.mjs`. The five landed checks stay verbatim, in order, with their names; the seeds line stays. The import line gains `SENSE_DIALS`, `checkAgentBody`, `checkSenseDials`. Then these checks, appended after the five:

6. `senses: at rolled view dials a point just inside the range and cone is seen and one just outside is not` — 200 rolls: viewM in 10 to 200 and viewDeg in 20 to 300 on a copy of the defaults; a watcher facing (0, 1); a point on the facing axis at 0.99 times viewM is seen and at 1.01 times viewM is not; at distance 5 a point 0.02 radians inside the half angle is seen and 0.02 outside is not.
7. `senses: a rolled chest offset moves the cover ray's start` — 200 rolls: chest in 0.1 to 0.9 on a copy of the defaults; the watcher's body at (0, 1, 0), the point at (0, 1, 10); a thin box (0.3 wide, 2 tall, 0.05 deep) centred at z equal to half the chest offset is not cover (minus one); the same box centred at z equal to the chest offset plus 0.5 is cover (index 0).
8. `senses: the contracts count every problem` — `checkAgentBody({ body: {}, fx: "a" })` returns exactly 3 problems; `checkAgentBody({ down: 0, body: { c: [0, 1, 0] }, fx: 0, fz: 1 })` returns 0; `checkAgentBody(null)` returns 1; `checkSenseDials({ ...SENSE_DIALS, viewM: 0 })` returns 1; `checkSenseDials(SENSE_DIALS)` returns 0.
9. `senses: the module imports only from its own folder or a sibling module` — read the module file with fs and assert every `import ... from "<x>"` specifier matches `^\.\.\/[a-z0-9-]+\/` or `^\.\/`.

The count line becomes `senses-test: 9 PASS / 0 FAIL`, then `senses-test PASS`, exit 0. Any FAIL stops the task.

## Steps

1. Read the list above. Confirm.
2. Write the module changes.
3. Write the gate changes.
4. Run, from the worktree root, twice: `node scripts/senses-test.mjs`. Both runs must print the seeds line, 9 PASS lines, the count line, and the verdict, exit 0. Paste both outputs whole in the report.
5. Write `docs/plans/phase-0.0.88-senses.md` in the worktree, this shape:

```
# Phase 0.0.88 — senses: the view as dials

Status: PLANNED. Built in worktree, awaiting the landing.
<!-- At landing this line becomes: Status: LANDED, commit `<hash>`, <date>. Gate: 9 PASS / 0 FAIL; bracket unmoved. -->

<One paragraph: the second pass over the senses module under the general parts order, phase A15; what moved, in plain words.>

## Lift kind

SHAPED second pass — the sight and cover arithmetic is untouched; its five literals ride one dials object handed in last, defaults the demo's; the agent body and dials contracts. The changes are the numbered list in the module header.

## Acceptance arithmetic for the phase

Every number below is the run's output (rolled seeds <the two seeds>).

- `node scripts/senses-test.mjs` prints a seeds line, 9 PASS lines, then `senses-test: 9 PASS / 0 FAIL`, then `senses-test PASS`, exit 0.
- The five landed checks are verbatim.
- Bracket, run at the landing: senses.

## Tasks

- 0.0.88-1 — the second pass. → `task-0.0.88-1-senses.md`
```

6. Commit on your branch, all three files, with this message exactly:

```
phase 0.0.88 — senses: the view as dials

Second pass under the general parts order. Five literals ride one dials object handed in last; the agent body and dials contracts. Gate 9 PASS / 0 FAIL at rolled seeds; the five landed checks verbatim.

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

- `node scripts/senses-test.mjs`: seeds 572055352 and 679991715; 9 PASS lines, `senses-test: 9 PASS / 0 FAIL`, `senses-test PASS`, exit 0, twice.
- Bracket at the landing: senses, opponent, registry, every tail PASS.
- Branch commit 14236b0 on phase/0.0.88-senses, landed by squash into main.
- Nonconformities the agent named: the diff summary was taken against the branch's fork point, main having moved on under it; check 6's cone offset sign was not stated, and the agent rolled it, the law being even in the angle; check 7's box call shape was read from the landed gate's own call, solids not being on the reading list. None moved a check or an option.
