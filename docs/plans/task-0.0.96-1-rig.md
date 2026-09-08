# Task 0.0.96-1 — rig: the machine as data

One job: the second pass over the rig module under the general parts order, phase A13. Write exactly the design below, run the gate, write the phase document, commit on your branch, report. You design nothing beyond this brief; anything it did not foresee stops the task and is reported as a nonconformity.

Model: Sonnet 5.

Where you work: the worktree at `/home/batman/combo-wt/rig`, branch `phase/0.0.96-rig`. You never touch `/home/batman/combo-engine` (the main tree). You never edit `scripts/gate.mjs`, `README.md`, `package.json`, `src/modules/registry/registry.js`, any other module, or any document of another phase. You never edit a demo file.

Required reading, in order, whole (confirm each with its line count at the top of your report):
1. This file.
2. `/home/batman/combo-engine/docs/plans/batch-general-1.md`, the sections "The generalization law", "The rules of the run", and "A13, rig".
3. `/home/batman/combo-wt/rig/src/modules/rig/rig.js`.
4. `/home/batman/combo-wt/rig/scripts/rig-test.mjs`.
5. `/home/batman/combo-wt/rig/scripts/presets-test.mjs` and `/home/batman/combo-wt/rig/scripts/telemetry-test.mjs`, whole, the two gates that assemble a rig; you do not edit them.
6. `/home/batman/combo-wt/rig/docs/modules/module-pattern.md`.
7. `/home/batman/combo-wt/rig/docs/plans/phase-0.0.73-aim.md`, as the shape of a phase document.

## The design, fixed

Module `src/modules/rig/rig.js`. Every export stays and every number is unchanged. Changes, and only these:

1. The limb chain becomes data. `MECH_SPEC` gains `limbChain`, an array of the seven rows sideChain builds, verbatim numbers, in the same order, each row with: `name` (the base name without the side letter, for example upperArm), `parent` (a core link name or a base name), `mass`, `dim`, `type`, `axis`, `angle0`, `jp`, `jc`, `tauMax`, `range`, `lim` as the demo has them, plus `jpSide: true` on the two rows whose jp the demo passes through `S()` (upperArm and hipYoke), meaning jp's z flips with the side.
2. `sideChain(s, side, spec = MECH_SPEC)` builds its rows from `spec.limbChain`: name is `row.name + side`; parent is `row.parent + side` when the parent is a base name in the chain, else the parent as written; jp is a copy with z times s when `jpSide` is true, else a copy; every other field is copied. With MECH_SPEC the seven rows are byte for byte what the demo's function returned.
3. `buildLinkTable(spec = MECH_SPEC)` calls `sideChain(s, side, spec)`.
4. `assembleMech(world, opts)` names its links through options: `opts.footLinks` (default `["footL", "footR"]`) for the footWidth override, `opts.hipLinks` (default `["hipYokeL", "hipYokeR"]`) for the hipOffset override, and `opts.pairs` (default `[["footL", "footR", opts.footClearance ?? 0.04], ["shinL", "shinR", 0.02]]`) for the collision pairs, each pair a name, a name, and a margin. The footClearance option keeps its meaning through the default.
5. Add `export const RIG_SPEC_CONTRACT` as a plain field description, and `export function checkRigSpec(spec)` returning a list of plain problem strings, empty when clean, every problem in one pass: not an object gives the single problem `rigSpec: not an object`; then `rigSpec.root: names an existing link required`; `rigSpec.links: object required`; per link `rigSpec.links.<name>.mass: number > 0 required`, `.dim: 3 numbers required`, `.parent: an existing link required` when present; `rigSpec.limbs: array required`; `rigSpec.limbChain: array required`; per chain row i: `rigSpec.limbChain.<i>.name: string required`, `.parent: string required`, `.mass: number > 0 required`, `.dim: 3 numbers required`, `.type: hinge or weld required`, `.jp: 3 numbers required`, `.jc: 3 numbers required`.
6. Add to the header comment a numbered list of these changes as the second pass's substitutions.

Gate `scripts/rig-test.mjs`. The nine landed checks stay verbatim, in order, with their names, seedless as they are. The import line gains `sideChain` and `checkRigSpec`. Before the first check add a rolled seed printed as `seeds {"rig":<n>}`, read from `process.env.SEED` when set, else rolled, with the small seeded stream the other gates use. Then these checks, appended after the nine:

10. `rig: the chain as data rebuilds the demo's seven rows exactly` — for each side, sideChain(s, side) from MECH_SPEC gives seven rows whose names, parents, and every number equal a copy of the demo's rows written out in the gate (name, parent, mass, dim, jp, jc, tauMax, range, angle0, type), JSON.stringify equal row by row.
11. `rig: a rolled spec with renamed links and the demo's dimensions assembles with the same body count and total mass as the default` — a copy of MECH_SPEC whose limbChain names carry a rolled prefix (`"p" + floor(rnd() * 1e4)` before each base name, parents renamed to match, core links untouched); assembleMech with footLinks, hipLinks, and pairs renamed the same way; 17 bodies, mass exactly 8140, 14 hinges, 2 welds, 2 pairs.
12. `rig: twin assembly identity at the default` — two rigs from two worlds: every body's position equal bit for bit, in the same order of names.
13. `rig: the contract counts every problem` — `checkRigSpec({ root: "nope", links: { a: { mass: 0, dim: [1] } }, limbs: [], limbChain: [{ name: 3 }] })` returns exactly 10 problems (root; a's mass and dim; the chain row's name, parent, mass, dim, type, jp, jc); `checkRigSpec(MECH_SPEC)` returns 0; `checkRigSpec(null)` returns 1.
14. `rig: the module imports only from its own folder or a sibling module` — read the module file with fs and assert every `import ... from "<x>"` specifier matches `^\.\.\/[a-z0-9-]+\/` or `^\.\/`.

The count line becomes `rig-test: 14 PASS / 0 FAIL`, then `rig-test PASS`, exit 0. Any FAIL stops the task.

## Steps

1. Read the list above. Confirm.
2. Write the module changes.
3. Write the gate changes.
4. Run, from the worktree root, twice: `node scripts/rig-test.mjs`. Both runs must print the seeds line, 14 PASS lines, the count line, and the verdict, exit 0. Paste both outputs whole in the report. Then run `node scripts/presets-test.mjs` and `node scripts/telemetry-test.mjs` once each; both must still print their count lines unchanged and their PASS verdicts; paste their last two lines.
5. Write `docs/plans/phase-0.0.96-rig.md` in the worktree, this shape:

```
# Phase 0.0.96 — rig: the machine as data

Status: PLANNED. Built in worktree, awaiting the landing.
<!-- At landing this line becomes: Status: LANDED, commit `<hash>`, <date>. Gate: 14 PASS / 0 FAIL; bracket unmoved. -->

<One paragraph: the second pass over the rig module under the general parts order, phase A13; what moved, in plain words.>

## Lift kind

SHAPED second pass — every number is the demo's; the limb chain is data on the spec, the overrides name their links, the spec contract. The changes are the numbered list in the module header.

## Acceptance arithmetic for the phase

Every number below is the run's output (rolled seeds <the two seeds>).

- `node scripts/rig-test.mjs` prints a seeds line, 14 PASS lines, then `rig-test: 14 PASS / 0 FAIL`, then `rig-test PASS`, exit 0.
- The nine landed checks are verbatim. presets and telemetry count lines unchanged in the worktree.
- Bracket, run at the landing: rig, telemetry, presets.

## Tasks

- 0.0.96-1 — the second pass. → `task-0.0.96-1-rig.md`
```

6. Commit on your branch, all three files, with this message exactly:

```
phase 0.0.96 — rig: the machine as data

Second pass under the general parts order. The limb chain is data on the spec; the overrides name their links; the spec contract. Gate 14 PASS / 0 FAIL at rolled seeds; the nine landed checks verbatim.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01QSq3kZC3Bk9SC5RwnqYUfs
```

Do not push. Do not touch main.

## Rules

- No timed simulations beyond the landed checks' own steps. Rolled seeds, printed. No literal that is one seed's own output.
- The landed checks stay verbatim; only the count line moves.
- Never edit a demo file, the gate table, the README, the package version, the registry table, another module, or another phase's documents.

## Report

Read-confirmation first (each file, its line count). One line of outcome. Then bullets: both gate outputs whole and the two other tails; the diff summary as files and line counts (`git diff --stat` against main); the commit hash on your branch; every nonconformity as its own labeled bullet. Fixture seeds: the two rolled seeds; no seed is special.

## The report's gate lines

- `node scripts/rig-test.mjs`: seeds 246862655 and 457311270; 14 PASS lines, `rig-test: 14 PASS / 0 FAIL`, `rig-test PASS`, exit 0, twice. The presets and telemetry tails in the worktree: `presets-test: 7 PASS / 0 FAIL`, seed 906840030; `telemetry-test: 4 PASS / 0 FAIL`, seed 48972770.
- Bracket at the landing: rig, presets, telemetry, physics-pb, registry, every tail PASS.
- The full self-test on the merged tree at the landing, the first of the order's three: `selftest: all 42 gates PASS`.
- Branch commit 93f2cf9 on phase/0.0.96-rig, landed by squash into main.
- No nonconformity named.
