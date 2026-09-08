# Task 0.0.77-1 — legik: leg inverse kinematics

One job: lift the leg inverse kinematics from the mech demo into a module under the general parts order, phase B1. Write exactly the design below, run the gate, write the phase document, commit on your branch, report. You design nothing beyond this brief; anything it did not foresee stops the task and is reported as a nonconformity.

Model: Sonnet 5.

Where you work: the worktree at `/home/batman/combo-wt/legik`, branch `phase/0.0.77-legik`. You never touch `/home/batman/combo-engine` (the main tree). You never edit `scripts/gate.mjs`, `README.md`, `package.json`, `src/modules/registry/registry.js`, or any document of another phase. You never edit a demo file.

Required reading, in order, whole (confirm each with its line count at the top of your report):
1. This file.
2. `/home/batman/combo-engine/docs/plans/batch-general-1.md`, the sections "The generalization law", "The rules of the run", and "B1, legik".
3. `/home/batman/combo-engine/mech-mk1-live-opus-5.html`, lines 791 to 857 only. Read-only source material.
4. `/home/batman/combo-wt/legik/src/modules/telemetry/telemetry.js`, as the shape of a small landed module.
5. `/home/batman/combo-wt/legik/scripts/telemetry-test.mjs`, as the shape of a landed gate.
6. `/home/batman/combo-wt/legik/docs/modules/module-pattern.md`.
7. `/home/batman/combo-wt/legik/docs/plans/phase-0.0.73-aim.md`, as the shape of a phase document.

## The design, fixed

New module `src/modules/legik/legik.js`, lifted VERBATIM MATH from demo lines 807 to 857. The arithmetic of legIK and legFK is copied exactly. Substitutions, numbered in the module header, and only these:

1. `const LEG = { thigh: 1.50, shin: 1.45 };` becomes `export const LEG = { thigh: 1.50, shin: 1.45 };` The option names thigh, shin, maxExtend and the default 0.995 are the demo's own and stay.
2. legFK's `V(a, b, c)` (the demo's vector maker) becomes the plain object literal `{ x: a, y: b, z: c }`. No import.
3. `export` is added to legIK and legFK. legFK carries as the verifier the demo names it.
4. Added: `export const LEGS_CONTRACT = { thigh: "number > 0", shin: "number > 0", maxExtend: "number in (0, 1], optional" };` and `export function checkLegs(o)` returning a list of plain problem strings, empty when clean, every problem in one pass: not an object gives the single problem `legs: not an object`; then `legs.thigh: number > 0 required`; `legs.shin: number > 0 required`; `legs.maxExtend: number in (0, 1] required` only when the field is present.

The module header states the lift: MODULE: legik, the box it serves, the demo lines, the substitutions.

Gate `scripts/legik-test.mjs`, new. A rolled seed printed as `seeds {"legik":<n>}`, read from `process.env.SEED` when set, else rolled; a small seeded stream like the landed gates use. Checks, in this order and with these names:

1. `legik: legFK of legIK returns the target within 1e-9 at rolled reachable targets` — 500 rolls: a target d with d.x in -1 to 1, d.z in -1 to 1, d.y negative, with the distance from the origin between the leg's difference plus 0.05 and 0.99 times the leg's sum (rescale the rolled direction to a rolled distance in that band); assert every component of legFK(legIK(d)) is within 1e-9 of d.
2. `legik: an unreachable target reports reach at least 1 and the solved leg spans maxExtend times the full length` — 200 rolls at distances between 1.01 and 3 times the leg's sum: legIK's reach is at least 1 and the length of legFK(legIK(d)) equals 0.995 times (thigh plus shin) within 1e-9.
3. `legik: a rolled leg table moves the reach exactly` — 200 rolls of thigh and shin in 0.5 to 2 and maxExtend in 0.5 to 1, an unreachable target: the length of legFK(legIK(d, opts), opts) equals the demo's own clamp, the larger of maxExtend times (thigh plus shin) and the difference of thigh and shin plus 1e-4, within 1e-9. (Amended: the first wording named only the upper cap; the demo's lower floor can win when the legs differ widely and maxExtend is small.)
4. `legik: the sole stays level — the three pitch joints sum to zero and the ankle roll cancels the hip roll` — 500 rolls of reachable targets: hipPitch plus knee plus anklePitch is within 1e-12 of 0 and ankleRoll equals minus hipRoll.
5. `legik: twin calls agree` — the same rolled target solved twice gives identical numbers in every field.
6. `legik: the contract counts every problem` — `checkLegs({ thigh: -1, shin: "x", maxExtend: 2 })` returns exactly 3 problems; `checkLegs(LEG)` returns 0; `checkLegs(null)` returns 1.
7. `legik: the module imports only from its own folder or a sibling module` — read the module file with fs and assert every `import ... from "<x>"` specifier matches `^\.\.\/[a-z0-9-]+\/` or `^\.\/`; legik has no imports, so the check passes on an empty list.

The count line is `legik-test: 7 PASS / 0 FAIL`, then `legik-test PASS`, exit 0. Any FAIL stops the task.

## Steps

1. Read the list above. Confirm.
2. Write the module.
3. Write the gate.
4. Run, from the worktree root, twice: `node scripts/legik-test.mjs`. Both runs must print the seeds line, 7 PASS lines, the count line, and the verdict, exit 0. Paste both outputs whole in the report.
5. Write `docs/plans/phase-0.0.77-legik.md` in the worktree, this shape:

```
# Phase 0.0.77 — legik: leg inverse kinematics

Status: PLANNED. Built in worktree, awaiting the landing.
<!-- At landing this line becomes: Status: LANDED, commit `<hash>`, <date>. Gate: 7 PASS / 0 FAIL; bracket unmoved. -->

Serves the checklist box "Leg inverse kinematics". Source: the mech demo, read-only, lines 807 to 857 (the leg table, legIK, legFK). <One more sentence in plain words: what the module does.>

## Lift kind

VERBATIM MATH — the formulas are the demo's exactly. The numbered substitutions are in the module header (four of them: the exported leg table, the plain vector literal, the exports, the contract). Anything else differing from the cited lines is a finding against the plan.

## Rulings inside this plan

- The option names and the 0.995 default are the demo's own.
- Registry seam: consume. The registry and gate-table lines are the landing's.

## Acceptance arithmetic for the phase

Every number below is the run's output (rolled seeds <the two seeds>).

- `node scripts/legik-test.mjs` prints a seeds line, 7 PASS lines, then `legik-test: 7 PASS / 0 FAIL`, then `legik-test PASS`, exit 0.
- Load-bearing knowns from the demo's own lines: thigh 1.50, shin 1.45, maxExtend 0.995.
- Bracket, run at the landing: legik.

## Tasks

- 0.0.77-1 — the lift. → `task-0.0.77-1-legik.md`
```

6. Commit on your branch, all three files, with this message exactly:

```
phase 0.0.77 — legik: leg inverse kinematics

Checklist: leg inverse kinematics. legIK and legFK carried verbatim from the mech demo, the leg table exported, a contract added. Gate 7 PASS / 0 FAIL at rolled seeds.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01QSq3kZC3Bk9SC5RwnqYUfs
```

Do not push. Do not touch main.

## Rules

- No timed simulations. No replays. Rolled seeds, printed. No literal that is one seed's own output.
- Never edit a demo file, the gate table, the README, the package version, the registry table, or another phase's documents.

## Report

Read-confirmation first (each file, its line count). One line of outcome. Then bullets: both gate outputs whole; the diff summary as files and line counts (`git diff --stat` against main); the commit hash on your branch; every nonconformity as its own labeled bullet. Fixture seeds: the two rolled seeds; no seed is special.

## The report's gate lines

- `node scripts/legik-test.mjs`: seeds 331972384 and 853509696; 7 PASS lines, `legik-test: 7 PASS / 0 FAIL`, `legik-test PASS`, exit 0, twice.
- Bracket at the landing: legik, registry, telemetry, every tail PASS.
- Branch commit 0ce6775 on phase/0.0.77-legik, landed by squash into main; the gate-table and registry lines are the landing's.
- Amendment: the brief's check 3 first named only the upper cap; the demo's lower floor (the leg difference plus 1e-4) wins when the legs differ widely and maxExtend is small. The agent stopped on it (four of eight first-run gate runs failed, seeds 792629521, 52153264, 964857821, 162696475); the brief was amended to the demo's own two-way clamp; the module never changed.
