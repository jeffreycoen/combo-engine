# Task 0.0.81-1 — grapple: the constants as dials

One job: the second pass over the grapple module under the general parts order, phase A9. Write exactly the design below, run the gate, write the phase document, commit on your branch, report. You design nothing beyond this brief; anything it did not foresee stops the task and is reported as a nonconformity.

Model: Sonnet 5.

Where you work: the worktree at `/home/batman/combo-wt/grapple`, branch `phase/0.0.81-grapple`. You never touch `/home/batman/combo-engine` (the main tree). You never edit `scripts/gate.mjs`, `README.md`, `package.json`, `src/modules/registry/registry.js`, or any document of another phase. You never edit a demo file.

Required reading, in order, whole (confirm each with its line count at the top of your report):
1. This file.
2. `/home/batman/combo-engine/docs/plans/batch-general-1.md`, the sections "The generalization law", "The rules of the run", and "A9, grapple".
3. `/home/batman/combo-wt/grapple/src/modules/grapple/grapple.js`.
4. `/home/batman/combo-wt/grapple/scripts/grapple-test.mjs`.
5. `/home/batman/combo-wt/grapple/src/games/old-master/grip.js`, whole, to see the one game caller; you do not edit it.
6. `/home/batman/combo-wt/grapple/docs/modules/module-pattern.md`.
7. `/home/batman/combo-wt/grapple/docs/plans/phase-0.0.73-aim.md`, as the shape of a phase document.

## The design, fixed

Module `src/modules/grapple/grapple.js`. Every function keeps its name, its landed arguments in their order, and its export; the arithmetic is unchanged except that the constants are read from a dials object. Changes, and only these:

1. The fifteen `export const GRAP_...` lines stay exactly as they are. After them add one exported dials object built from them:

```js
export const GRAP = { V0: GRAP_V0, RECOIL: GRAP_RECOIL, RANGE: GRAP_RANGE, TIME: GRAP_TIME, REWIND: GRAP_REWIND, HOME: GRAP_HOME, RECOVER: GRAP_RECOVER, REEL: GRAP_REEL, REST_MIN: GRAP_REST_MIN, CLOSE: GRAP_CLOSE, JERK: GRAP_JERK, SNAP: GRAP_SNAP, YANK: GRAP_YANK, YANK_TEAR: GRAP_YANK_TEAR, TEAR_BLEED: GRAP_TEAR_BLEED };
```

2. Every function that reads a constant gains a last argument `d = GRAP` and reads `d.<NAME>` where it read `GRAP_<NAME>`: `castGrapple(ship, ax, ay, armY, d = GRAP)`, `stepFly(g, accelFn, ax, ay, dt, d = GRAP)`, `stepRewind(g, ax, ay, dt, d = GRAP)`, `stepAdrift(g, accelFn, sx, sy, dt, d = GRAP)`, `stepEmbedded(g, tgt, sx, sy, d = GRAP)`, `stepRope(g, ship, ax, ay, tgt, tm, dt, d = GRAP)`. tapGrapple, bite, and requestYank read no constant and do not change.
3. Add `export const SHIP_CONTRACT = { x: "finite", y: "finite", vx: "finite", vy: "finite", w: "finite", ang: "finite", M: "number > 0", I: "number > 0" };` and `export const TARGET_CONTRACT = { x: "finite", y: "finite", vx: "finite, optional", vy: "finite, optional" };`
4. Add `export function checkShip(s)` returning a list of plain problem strings, empty when clean, every problem in one pass: not an object gives the single problem `ship: not an object`; then `ship.<field>: finite number required` for x, y, vx, vy, w, ang; `ship.M: number > 0 required`; `ship.I: number > 0 required`.
5. Add `export function checkTarget(t)`: not an object gives `target: not an object`; then `target.x: finite number required`, `target.y: finite number required`, and for vx and vy, when the field is present and not a finite number, `target.<field>: finite number required`.
6. Add to the header comment a numbered list of these changes as the second pass's substitutions.

Gate `scripts/grapple-test.mjs`. The sixteen landed checks stay verbatim, in order, with their names, seedless as they are. The import line gains `GRAP`, `checkShip`, `checkTarget`. Before the first check add a rolled seed printed as `seeds {"grapple":<n>}`, read from `process.env.SEED` when set, else rolled, with the small seeded stream the other gates use. Then these checks, appended after the sixteen:

17. `grapple: at a rolled snap threshold a jerk over it snaps and one under it holds` — 100 rolls of SNAP in 50 to 200 (the dials object is a copy of GRAP with SNAP replaced): the landed jerk scenario (a bitten rope, restLen 10, state stuck, the target at 12 moving away at 2, the ship M 100 I 500) with target mass 10000 gives a jerk of about 228 and must snap; the same scenario with target mass 25 gives a jerk of 46 and must hold, taut, with the same J the landed eighth check computes.
18. `grapple: a rolled reel rate shortens the rest length by rate times dt to the rolled floor` — 100 rolls of REEL in 1 to 20 and REST_MIN in 1 to 5 with dt 1/60: from restLen 10 one reeling step gives max(REST_MIN, 10 minus REEL times dt) exactly; from restLen equal to REST_MIN plus REEL times dt times 0.5 one step gives REST_MIN.
19. `grapple: the contracts count every problem` — `checkShip({ x: "a", y: 0, vx: 0, vy: NaN, w: 0, ang: 0, M: 0, I: -1 })` returns exactly 4 problems; `checkShip(mkShip())` returns 0; `checkTarget({ x: NaN, y: 0, vx: "v" })` returns 2; `checkTarget(null)` returns 1.
20. `grapple: the module imports only from its own folder or a sibling module` — read the module file with fs and assert every `import ... from "<x>"` specifier matches `^\.\.\/[a-z0-9-]+\/` or `^\.\/`; grapple has no imports, so the check passes on an empty list.

The count line becomes `grapple-test: 20 PASS / 0 FAIL`, then `grapple-test PASS`, exit 0. Any FAIL stops the task.

## Steps

1. Read the list above. Confirm.
2. Write the module changes.
3. Write the gate changes.
4. Run, from the worktree root, twice: `node scripts/grapple-test.mjs`. Both runs must print the seeds line, 20 PASS lines, the count line, and the verdict, exit 0. Paste both outputs whole in the report.
5. Write `docs/plans/phase-0.0.81-grapple.md` in the worktree, this shape:

```
# Phase 0.0.81 — grapple: the constants as dials

Status: PLANNED. Built in worktree, awaiting the landing.
<!-- At landing this line becomes: Status: LANDED, commit `<hash>`, <date>. Gate: 20 PASS / 0 FAIL; bracket unmoved. -->

<One paragraph: the second pass over the grapple module under the general parts order, phase A9; what moved, in plain words.>

## Lift kind

SHAPED second pass — the rope law is untouched; the fifteen constants ride one dials object handed in last, defaults the demo's. The changes are the numbered list in the module header.

## Acceptance arithmetic for the phase

Every number below is the run's output (rolled seeds <the two seeds>).

- `node scripts/grapple-test.mjs` prints a seeds line, 20 PASS lines, then `grapple-test: 20 PASS / 0 FAIL`, then `grapple-test PASS`, exit 0.
- The sixteen landed checks are verbatim.
- Bracket, run at the landing: grapple, old-master.

## Tasks

- 0.0.81-1 — the second pass. → `task-0.0.81-1-grapple.md`
```

6. Commit on your branch, all three files, with this message exactly:

```
phase 0.0.81 — grapple: the constants as dials

Second pass under the general parts order. The fifteen constants ride one dials object handed in last; the ship and target contracts. Gate 20 PASS / 0 FAIL at rolled seeds; the sixteen landed checks verbatim.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01QSq3kZC3Bk9SC5RwnqYUfs
```

Do not push. Do not touch main.

## Rules

- No timed simulations. No replays. Rolled seeds, printed. No literal that is one seed's own output.
- The landed checks stay verbatim; only the count line moves.
- Never edit a demo file, the gate table, the README, the package version, the registry table, a game file, or another phase's documents.

## Report

Read-confirmation first (each file, its line count). One line of outcome. Then bullets: both gate outputs whole; the diff summary as files and line counts (`git diff --stat` against main); the commit hash on your branch; every nonconformity as its own labeled bullet. Fixture seeds: the two rolled seeds; no seed is special.

## The report's gate lines

- `node scripts/grapple-test.mjs`: seeds 434462352 and 2211613565; 20 PASS lines, `grapple-test: 20 PASS / 0 FAIL`, `grapple-test PASS`, exit 0, twice.
- Bracket at the landing: grapple, old-master, every tail PASS.
- Branch commit f323290 on phase/0.0.81-grapple, landed by squash into main.
- Nonconformity the agent named: the brief's seeded-stream phrase pointed at no file on its reading list; the agent wrote the same small generator the other gates carry, printing the same seeds line.
