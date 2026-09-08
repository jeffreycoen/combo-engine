# Task 0.0.95-1 — physics-pb: the ground as an option, a maker for the world

One job: the second pass over the physics-pb module under the general parts order, phase A12. Write exactly the design below, run the gate, write the phase document, commit on your branch, report. You design nothing beyond this brief; anything it did not foresee stops the task and is reported as a nonconformity.

Model: Sonnet 5.

Where you work: the worktree at `/home/batman/combo-wt/physics-pb`, branch `phase/0.0.95-physics-pb`. You never touch `/home/batman/combo-engine` (the main tree). You never edit `scripts/gate.mjs`, `README.md`, `package.json`, `src/modules/registry/registry.js`, any other module, or any document of another phase. You never edit a demo file.

Required reading, in order, whole (confirm each with its line count at the top of your report):
1. This file.
2. `/home/batman/combo-engine/docs/plans/batch-general-1.md`, the sections "The generalization law", "The rules of the run", and "A12, physics-pb".
3. `/home/batman/combo-wt/physics-pb/src/modules/physics-pb/physics.js`.
4. `/home/batman/combo-wt/physics-pb/scripts/physics-pb-test.mjs`.
5. `/home/batman/combo-wt/physics-pb/scripts/rig-test.mjs`, whole, to see one gate that stands on this module; you do not edit it.
6. `/home/batman/combo-wt/physics-pb/docs/modules/module-pattern.md`.
7. `/home/batman/combo-wt/physics-pb/docs/plans/phase-0.0.73-aim.md`, as the shape of a phase document.

## The design, fixed

Module `src/modules/physics-pb/physics.js`. Every class, function, and export stays; the solver's arithmetic is unchanged. Changes, and only these:

1. `GroundContacts` reads one more option: `this.groundY = o.groundY ?? 0;`. In `collect` the margin test becomes `if (wp.y < this.groundY + margin)`. In `solve` the depth becomes `const depth = this.groundY - wp.y;`. Nothing else in the class changes; the normal stays vertical.
2. `World` reads one more option: `this.groundY = o.groundY ?? 0;` and builds its contacts as `new GroundContacts({ ...(o.contact || {}), groundY: this.groundY })`.
3. Add `export function makeWorld(opts) { return new World(opts); }` after the class, before the export block, and add `makeWorld` to the export block.
4. Add `export const BODY_CONTRACT = { mass: "number > 0 unless kinematic", inertia: "9 finite numbers, optional", pos: "vector, optional", quat: "quaternion, optional" };` and `export function checkBody(o)` returning a list of plain problem strings, empty when clean, every problem in one pass: not an object gives the single problem `body: not an object`; then `body.mass: number > 0 required` when not kinematic and mass is missing or not over 0; `body.inertia: 9 finite numbers required` when inertia is present and is not an array of 9 finite numbers. Add both to the export block.
5. Add to the header comment (the first line of the file) a numbered list of these changes as the second pass's substitutions, keeping the demo's own first line.

Gate `scripts/physics-pb-test.mjs`. The eleven landed checks stay verbatim, in order, with their names, seedless as they are. The import line gains `makeWorld` and `checkBody`. Before the first check add a rolled seed printed as `seeds {"physics-pb":<n>}`, read from `process.env.SEED` when set, else rolled, with the small seeded stream the other gates use. Then these checks, appended after the eleven:

12. `physics-pb: at a rolled groundY a dropped box rests with its lowest corner at groundY within 2 mm` — 5 rolls of groundY in minus 5 to 5: a world like the landed mkWorld with groundY, a box like the landed mkBox at groundY plus 1.2; 180 steps of 1/60, the landed check's own settle; the box's centre y equals groundY plus 0.5 within 2e-3 and its vertical speed is under 1e-2.
13. `physics-pb: the resting weight law holds at a rolled groundY` — 5 rolls of groundY in minus 5 to 5: a box at groundY plus 0.51; 120 steps of 1/60; contactForce within 1 percent of 98.1.
14. `physics-pb: makeWorld builds the class's own world` — makeWorld({ substeps: 20, iterations: 1 }) is an instance of World; a free fall in it (ground off, the landed check's 60 steps) gives the same position bit for bit as one in new World with the same options.
15. `physics-pb: the contract counts every problem` — `checkBody({ mass: 0, inertia: [1, 2, 3] })` returns exactly 2 problems; `checkBody({ kinematic: true })` returns 0; `checkBody({ mass: 3 })` returns 0; `checkBody(null)` returns 1.
16. `physics-pb: the module imports only from its own folder or a sibling module` — read the module file with fs and assert every `import ... from "<x>"` specifier matches `^\.\.\/[a-z0-9-]+\/` or `^\.\/`; physics-pb has no imports, so the check passes on an empty list.

The count line becomes `physics-pb-test: 16 PASS / 0 FAIL`, then `physics-pb-test PASS`, exit 0. Any FAIL stops the task.

## Steps

1. Read the list above. Confirm.
2. Write the module changes.
3. Write the gate changes.
4. Run, from the worktree root, twice: `node scripts/physics-pb-test.mjs`. Both runs must print the seeds line, 16 PASS lines, the count line, and the verdict, exit 0. Paste both outputs whole in the report. Then run `node scripts/rig-test.mjs` once; it must still print `rig-test: 9 PASS / 0 FAIL` and `rig-test PASS`; paste its last two lines.
5. Write `docs/plans/phase-0.0.95-physics-pb.md` in the worktree, this shape:

```
# Phase 0.0.95 — physics-pb: the ground as an option, a maker for the world

Status: PLANNED. Built in worktree, awaiting the landing.
<!-- At landing this line becomes: Status: LANDED, commit `<hash>`, <date>. Gate: 16 PASS / 0 FAIL; bracket unmoved. -->

<One paragraph: the second pass over the physics-pb module under the general parts order, phase A12; what moved, in plain words.>

## Lift kind

SHAPED second pass — the solver is untouched; the ground plane's height is an option with the demo's 0 as the default; a maker joins the class; the body contract. The changes are the numbered list in the module header.

## Acceptance arithmetic for the phase

Every number below is the run's output (rolled seeds <the two seeds>).

- `node scripts/physics-pb-test.mjs` prints a seeds line, 16 PASS lines, then `physics-pb-test: 16 PASS / 0 FAIL`, then `physics-pb-test PASS`, exit 0.
- The eleven landed checks are verbatim. `rig-test: 9 PASS / 0 FAIL` in the worktree.
- Bracket, run at the landing: physics-pb, rig, telemetry, envelope, actuator, presets.

## Tasks

- 0.0.95-1 — the second pass. → `task-0.0.95-1-physics-pb.md`
```

6. Commit on your branch, all three files, with this message exactly:

```
phase 0.0.95 — physics-pb: the ground as an option, a maker for the world

Second pass under the general parts order. The ground height is an option with the demo's 0 as the default; makeWorld joins the class; the body contract. Gate 16 PASS / 0 FAIL at rolled seeds; the eleven landed checks verbatim.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01QSq3kZC3Bk9SC5RwnqYUfs
```

Do not push. Do not touch main.

## Rules

- No timed simulations beyond the landed checks' own settle counts, which the new checks reuse. Rolled seeds, printed. No literal that is one seed's own output.
- The landed checks stay verbatim; only the count line moves.
- Never edit a demo file, the gate table, the README, the package version, the registry table, another module, or another phase's documents.

## Report

Read-confirmation first (each file, its line count). One line of outcome. Then bullets: both gate outputs whole and the rig tail; the diff summary as files and line counts (`git diff --stat` against main); the commit hash on your branch; every nonconformity as its own labeled bullet. Fixture seeds: the two rolled seeds; no seed is special.

## The report's gate lines

- `node scripts/physics-pb-test.mjs`: seeds 1267550397 and 887510421; 16 PASS lines, `physics-pb-test: 16 PASS / 0 FAIL`, `physics-pb-test PASS`, exit 0, twice. The rig tail in the worktree: `rig-test: 9 PASS / 0 FAIL`.
- Bracket at the landing: physics-pb, rig, presets, registry, every tail PASS.
- Branch commit 3c25ae9 on phase/0.0.95-physics-pb, landed by squash into main.
- Nonconformities the agent named: the brief said both an inline export and a line in the trailing export block for makeWorld, BODY_CONTRACT, and checkBody, which is a duplicate export; the three ride the trailing block only, the file's own convention. Check 13's world was built like check 12's, the brief not restating it. The contract and check sit after makeWorld, the brief not placing them. The gate's top comment was left saying eleven seedless checks, and the landing corrected it to sixteen with the rolled seed named, a comment only. None moved a check or an option.
