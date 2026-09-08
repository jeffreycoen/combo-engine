# Task 0.0.82-1 — presets: the labeled cheats

One job: lift the labeled-cheat presets from the mech demo into a module under the general parts order, phase B2. Write exactly the design below, run the gate, write the phase document, commit on your branch, report. You design nothing beyond this brief; anything it did not foresee stops the task and is reported as a nonconformity.

Model: Sonnet 5.

Where you work: the worktree at `/home/batman/combo-wt/presets`, branch `phase/0.0.82-presets`. You never touch `/home/batman/combo-engine` (the main tree). You never edit `scripts/gate.mjs`, `README.md`, `package.json`, `src/modules/registry/registry.js`, or any document of another phase. You never edit a demo file.

Required reading, in order, whole (confirm each with its line count at the top of your report):
1. This file.
2. `/home/batman/combo-engine/docs/plans/batch-general-1.md`, the sections "The generalization law", "The rules of the run", and "B2, presets".
3. `/home/batman/combo-engine/mech-mk1-live-opus-5.html`, lines 1660 to 1693 and 1712 to 1735 only. Read-only source material.
4. `/home/batman/combo-wt/presets/src/modules/physics-pb/physics.js`, the Body, Weld, and Hinge classes (lines 118 to 394) and the export block (lines 633 to 646).
5. `/home/batman/combo-wt/presets/src/modules/rig/rig.js`, whole.
6. `/home/batman/combo-wt/presets/scripts/rig-test.mjs`, whole, to see how a gate assembles a rig.
7. `/home/batman/combo-wt/presets/docs/modules/module-pattern.md`.
8. `/home/batman/combo-wt/presets/docs/plans/phase-0.0.73-aim.md`, as the shape of a phase document.

## The design, fixed

New module `src/modules/presets/presets.js`, lifted VERBATIM MATH from demo lines 1664 to 1693, with the fallback defaults from 1722 to 1731. Substitutions, numbered in the module header, and only these:

1. The six preset rows carry every dial field the demo sets, flat on the row and untouched: label, hipOffset, footWidth, copClamp, torque, envelope, inertia, gravity, swing, whichever the row has. The demo's `steps` field is renamed `consequence`, its text verbatim. A `rule` field is added, its text the demo's own bold sentence from the note with the tags and the leading word "Breaks " dropped (for example `W1: the centre of pressure may sit outside the support polygon.`). The `note` field carries the demo's note text with its HTML tags dropped. The verified row carries `rule: ""`, `baseline: true`.
2. `applyPreset(rig, p)` is the demo's function verbatim, reading the flat fields, with `m3inv` imported from the physics-pb module.
3. Added: `export const PRESET_DEFAULTS = { gravity: 9.81, friction: 1.0, copClamp: 0.45, swing: 0.90 };`, the demo's buildWorld fallbacks, and `export function resolvePreset(p)` returning a copy of the row with every missing one of those four filled from the defaults.
4. `export` added to PRESETS and applyPreset.
5. Added: `export const PRESET_CONTRACT = { label: "string", inertia: "number > 0, optional", torque: "number > 0, optional", envelope: "number > 0, optional", gravity: "number >= 0, optional", hipOffset: "number > 0, optional", footWidth: "number > 0, optional", copClamp: "number > 0, optional", swing: "number > 0, optional", consequence: "non-empty string", rule: "non-empty string unless baseline" };` and `export function checkPreset(p)` returning a list of plain problem strings, empty when clean, every problem in one pass: not an object gives the single problem `preset: not an object`; then `preset.label: string required`; for each optional dial present and not obeying its bound, `preset.<dial>: number > 0 required` (gravity: `number >= 0 required`); `preset.consequence: non-empty string required`; `preset.rule: non-empty string required` unless `p.baseline === true`.

The module header states the lift: MODULE: presets, the box it serves, the demo lines, the substitutions.

Gate `scripts/presets-test.mjs`, new. A rolled seed printed as `seeds {"presets":<n>}`, read from `process.env.SEED` when set, else rolled, with the small seeded stream the other gates use. A rig is assembled the way rig-test does it: a physics-pb World and assembleMech, once per check that needs one. Checks, in this order and with these names:

1. `presets: at a rolled multiplier set every hinge's tauMax, kp, kd, and limits and every body's inertia scale exactly, and invI is the inverse of the scaled inertia` — 20 rolls: inertia in 0.2 to 2, torque in 0.5 to 3, envelope in 0.3 to 3; a fresh rig; snapshot every hinge's tauMax, kp, kd, lim, every weld's lim, every body's I; applyPreset; every hinge tauMax equals old times torque, kp and kd old times inertia, every lim field old times envelope, every weld lim old times envelope, every body I element old times inertia, and every body invI equals m3inv of its new I element by element, all exactly (===).
2. `presets: the verified preset changes nothing` — a fresh rig; snapshot; applyPreset with PRESETS.verified; every field above unchanged.
3. `presets: every preset names its rule and its consequence` — every row's consequence is a non-empty string; every row's rule is a non-empty string except the baseline row; exactly one row is the baseline.
4. `presets: resolvePreset fills the demo's fallbacks and keeps the row's own values` — resolvePreset(PRESETS.lunar).gravity is 3.0; resolvePreset(PRESETS.narrow).gravity is 9.81, friction 1.0, copClamp 0.95, swing 0.90; resolvePreset(PRESETS.heavy).swing is 1.25.
5. `presets: twin rigs under one rolled preset agree` — two fresh rigs, one rolled preset applied to both: every field above equal.
6. `presets: the contract counts every problem` — `checkPreset({ label: 3, torque: 0, envelope: -1, consequence: "", rule: "" })` returns exactly 5 problems; `checkPreset(PRESETS.heavy)` returns 0; `checkPreset(null)` returns 1.
7. `presets: the module imports only from its own folder or a sibling module` — read the module file with fs and assert every `import ... from "<x>"` specifier matches `^\.\.\/[a-z0-9-]+\/` or `^\.\/`; presets imports physics-pb only.

The count line is `presets-test: 7 PASS / 0 FAIL`, then `presets-test PASS`, exit 0. Any FAIL stops the task.

## Steps

1. Read the list above. Confirm.
2. Write the module.
3. Write the gate.
4. Run, from the worktree root, twice: `node scripts/presets-test.mjs`. Both runs must print the seeds line, 7 PASS lines, the count line, and the verdict, exit 0. Paste both outputs whole in the report.
5. Write `docs/plans/phase-0.0.82-presets.md` in the worktree, this shape:

```
# Phase 0.0.82 — presets: the labeled cheats

Status: PLANNED. Built in worktree, awaiting the landing.
<!-- At landing this line becomes: Status: LANDED, commit `<hash>`, <date>. Gate: 7 PASS / 0 FAIL; bracket unmoved. -->

Serves the checklist box "Labeled-cheat presets: every relaxed rule named, with its measured consequence". Source: the mech demo, read-only, lines 1664 to 1693 (the six presets and applyPreset) and 1722 to 1731 (the fallbacks). <One more sentence in plain words: what the module does.>

## Lift kind

VERBATIM MATH — applyPreset and every preset number are the demo's exactly. The numbered substitutions are in the module header (five of them: the row fields, the import, the fallbacks, the exports, the contract). Anything else differing from the cited lines is a finding against the plan.

## Rulings inside this plan

- The measured consequences are the demo's own words, carried as text. No consequence is re-measured here; no walk is run.
- Registry seam: consume. The registry and gate-table lines are the landing's.

## Acceptance arithmetic for the phase

Every number below is the run's output (rolled seeds <the two seeds>).

- `node scripts/presets-test.mjs` prints a seeds line, 7 PASS lines, then `presets-test: 7 PASS / 0 FAIL`, then `presets-test PASS`, exit 0.
- Load-bearing knowns from the demo's own lines: the six presets' dials; the fallbacks gravity 9.81, friction 1.0, copClamp 0.45, swing 0.90.
- Bracket, run at the landing: presets, physics-pb, rig.

## Tasks

- 0.0.82-1 — the lift. → `task-0.0.82-1-presets.md`
```

6. Commit on your branch, all three files, with this message exactly:

```
phase 0.0.82 — presets: the labeled cheats

Checklist: labeled-cheat presets, every relaxed rule named with its measured consequence. The six presets and applyPreset carried verbatim from the mech demo, the fallbacks and a contract added. Gate 7 PASS / 0 FAIL at rolled seeds.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01QSq3kZC3Bk9SC5RwnqYUfs
```

Do not push. Do not touch main.

## Rules

- No timed simulations. No replays. No walking. Rolled seeds, printed. No literal that is one seed's own output.
- Never edit a demo file, the gate table, the README, the package version, the registry table, or another phase's documents.

## Report

Read-confirmation first (each file, its line count). One line of outcome. Then bullets: both gate outputs whole; the diff summary as files and line counts (`git diff --stat` against main); the commit hash on your branch; every nonconformity as its own labeled bullet. Fixture seeds: the two rolled seeds; no seed is special.

## The report's gate lines

- `node scripts/presets-test.mjs`: seeds 900952603 and 871101437; 7 PASS lines, `presets-test: 7 PASS / 0 FAIL`, `presets-test PASS`, exit 0, twice.
- Bracket at the landing: presets, physics-pb, rig, registry, every tail PASS. The gate-table and registry lines are the landing's.
- Branch commit 8ee1b46 on phase/0.0.82-presets, landed by squash into main.
- Nonconformity the agent named: the brief cited the physics export block at lines 633 to 646; the file is 645 lines and the block is 637 to 645. The agent read a superset. A citation error in the brief, not in the module.
