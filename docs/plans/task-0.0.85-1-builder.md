# Task 0.0.85-1 — builder: roles as data

One job: the second pass over the builder module under the general parts order, phase A10. Write exactly the design below, run the gate, write the phase document, commit on your branch, report. You design nothing beyond this brief; anything it did not foresee stops the task and is reported as a nonconformity.

Model: Sonnet 5.

Where you work: the worktree at `/home/batman/combo-wt/builder`, branch `phase/0.0.85-builder`. You never touch `/home/batman/combo-engine` (the main tree). You never edit `scripts/gate.mjs`, `README.md`, `package.json`, `src/modules/registry/registry.js`, any other module, or any document of another phase. You never edit a demo file.

Required reading, in order, whole (confirm each with its line count at the top of your report):
1. This file.
2. `/home/batman/combo-engine/docs/plans/batch-general-1.md`, the sections "The generalization law", "The rules of the run", and "A10, builder".
3. `/home/batman/combo-wt/builder/src/modules/builder/builder.js`.
4. `/home/batman/combo-wt/builder/scripts/builder-test.mjs`.
5. `/home/batman/combo-wt/builder/scripts/weldstress-test.mjs`, whole, to see the one module caller; you do not edit it.
6. `/home/batman/combo-wt/builder/docs/modules/module-pattern.md`.
7. `/home/batman/combo-wt/builder/docs/plans/phase-0.0.73-aim.md`, as the shape of a phase document.

## The design, fixed

Module `src/modules/builder/builder.js`. Every function keeps its name and its arguments; every formula is unchanged. Changes, and only these:

1. A spec row may carry `role`, a string. Inside makeBuilder add `const ROLE_KEYS = ["bridge", "engine", "tank", "rcs"];` and `const roleOf = (t) => spec[t].role ?? (ROLE_KEYS.includes(t) ? t : undefined);` A row without a role takes its key when the key is one of the four; any other key without a role has no role.
2. In derive, every test on the part's type key becomes a test on its role: `engines` are the parts with role engine, `tanks` role tank, `rcsMods` role rcs, and the bridge test is `list.some((md) => roleOf(md.t) === "bridge")` in both places it appears.
3. In derive, the three reads of a named row become reads of each part's own row: `spec.rcs.rcsN ?? 16` becomes `spec[r.t].rcsN ?? 16` inside the rcs loop (both uses); `spec.engine.thrust ?? 0` becomes, per engine part, `spec[e.t].thrust ?? 0`, so `F` is the sum over engF of each part's thrust and `tq` sums each part's own thrust in its term; `tanks.length * (spec.tank ? (spec.tank.tank ?? 300) : 300)` becomes the sum over tanks of `spec[t.t].tank ?? 300`. With the demo's spec, where every role part is keyed by its role and each role has one row, every number is the demo's.
4. `checkSpec` gains, per row, `<name>.role: string required` when a role is present and is not a string. `SPEC_ROW_CONTRACT` gains `role: "string, optional"`.
5. Add to the header comment a numbered list of these changes as the second pass's substitutions, replacing the sentence about the demo's role vocabulary with the new rule.

Gate `scripts/builder-test.mjs`. The ten landed checks stay verbatim, in order, with their names, seedless as they are. Before the first check add a rolled seed printed as `seeds {"builder":<n>}`, read from `process.env.SEED` when set, else rolled, with the small seeded stream the other gates use. Then these checks, appended after the ten:

11. `builder: a rolled spec whose engine part is keyed thruster with role engine derives the same thrust and torque as the demo-keyed spec` — 100 rolls of thrust in 10 to 100 and kg in 1 to 10: spec A is the landed SPEC with engine.thrust and engine.kg replaced by the rolls; spec B is spec A with the engine row moved to the key thruster and given role "engine"; the starter layout built with t "engine" under A and t "thruster" under B; derive gives equal m, cx, cy, I, F, tq, tau, rcsN, fuelCap.
12. `builder: rcs and tank parts are read by role, each from its own row` — a spec with bridge, two rcs rows (keys rcsA with rcsN 10 and rcsB with rcsN 30, both role "rcs", kg 1, all four ports) and two tank rows (keys tankA with tank 100 and tankB with tank 200, both role "tank", kg 1, all four ports); a layout with the bridge at 0,0, rcsA at 1,0, rcsB at 2,0, tankA at 0,1, tankB at 0,2; derive gives rcsN 5 plus 10 plus 30 and fuelCap 260 plus 300.
13. `builder: the contract counts a bad role` — `checkSpec({ x: { kg: 1, ports: ["E"], role: 5 } })` returns exactly 1 problem; the landed SPEC returns 0.
14. `builder: the module imports only from its own folder or a sibling module` — read the module file with fs and assert every `import ... from "<x>"` specifier matches `^\.\.\/[a-z0-9-]+\/` or `^\.\/`; builder has no imports, so the check passes on an empty list.

The count line becomes `builder-test: 14 PASS / 0 FAIL`, then `builder-test PASS`, exit 0. Any FAIL stops the task.

## Steps

1. Read the list above. Confirm.
2. Write the module changes.
3. Write the gate changes.
4. Run, from the worktree root, twice: `node scripts/builder-test.mjs`. Both runs must print the seeds line, 14 PASS lines, the count line, and the verdict, exit 0. Paste both outputs whole in the report. Then run `node scripts/weldstress-test.mjs` once; it must still print `weldstress-test: 9 PASS / 0 FAIL` and `weldstress-test PASS`; paste its last two lines.
5. Write `docs/plans/phase-0.0.85-builder.md` in the worktree, this shape:

```
# Phase 0.0.85 — builder: roles as data

Status: PLANNED. Built in worktree, awaiting the landing.
<!-- At landing this line becomes: Status: LANDED, commit `<hash>`, <date>. Gate: 14 PASS / 0 FAIL; bracket unmoved. -->

<One paragraph: the second pass over the builder module under the general parts order, phase A10; what moved, in plain words.>

## Lift kind

SHAPED second pass — every formula is untouched; parts are read by a role the row declares, with the demo's four keys as the default roles, and every part reads its own row. The changes are the numbered list in the module header.

## Acceptance arithmetic for the phase

Every number below is the run's output (rolled seeds <the two seeds>).

- `node scripts/builder-test.mjs` prints a seeds line, 14 PASS lines, then `builder-test: 14 PASS / 0 FAIL`, then `builder-test PASS`, exit 0.
- The ten landed checks are verbatim. `weldstress-test: 9 PASS / 0 FAIL` in the worktree.
- Bracket, run at the landing: builder, weldstress.

## Tasks

- 0.0.85-1 — the second pass. → `task-0.0.85-1-builder.md`
```

6. Commit on your branch, all three files, with this message exactly:

```
phase 0.0.85 — builder: roles as data

Second pass under the general parts order. Parts are read by a declared role, the demo's keys as default roles, each part from its own row; the contract gains role. Gate 14 PASS / 0 FAIL at rolled seeds; the ten landed checks verbatim.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01QSq3kZC3Bk9SC5RwnqYUfs
```

Do not push. Do not touch main.

## Rules

- No timed simulations. No replays. Rolled seeds, printed. No literal that is one seed's own output.
- The landed checks stay verbatim; only the count line moves.
- Never edit a demo file, the gate table, the README, the package version, the registry table, another module, or another phase's documents.

## Report

Read-confirmation first (each file, its line count). One line of outcome. Then bullets: both gate outputs whole and the weldstress tail; the diff summary as files and line counts (`git diff --stat` against main); the commit hash on your branch; every nonconformity as its own labeled bullet. Fixture seeds: the two rolled seeds; no seed is special.

## The report's gate lines

- `node scripts/builder-test.mjs`: seeds 3969711698 and 1255477467; 14 PASS lines, `builder-test: 14 PASS / 0 FAIL`, `builder-test PASS`, exit 0, twice.
- Bracket at the landing: builder, weldstress, registry, every tail PASS.
- Branch commit 024ea58 on phase/0.0.85-builder, landed by squash into main.
- Nonconformity the agent named: the gate's top comment said "No randomness"; it now names checks 11 to 14 and the rolled seed. A comment only; no check moved.
