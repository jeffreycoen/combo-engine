# Task 0.0.75-1 — registry: the ghosts registered, the self-test made whole

One job: phase A1 of the general parts order. Three modules join the registry table, the self-test reads the gate table instead of carrying its own list, and the badge gate proves it. Write exactly the design below, run the gates, write the phase document, commit on your branch, report. You design nothing beyond this brief; anything it did not foresee stops the task and is reported as a nonconformity.

Model: Sonnet 5.

Where you work: the worktree at `/home/batman/combo-wt/registry`, branch `phase/0.0.75-registry`. You never touch `/home/batman/combo-engine` (the main tree). This phase is the one exception to the shared-file rule: you edit `src/modules/registry/registry.js`, `scripts/selftest.mjs`, and `scripts/badge-test.mjs`. You never edit `scripts/gate.mjs`, `README.md`, `package.json`, any other module, or any document of another phase. You never edit a demo file.

Required reading, in order, whole (confirm each with its line count at the top of your report):
1. This file.
2. `/home/batman/combo-engine/docs/plans/batch-general-1.md`, the sections "The rules of the run" and "A1, registry".
3. `/home/batman/combo-wt/registry/src/modules/registry/registry.js`.
4. `/home/batman/combo-wt/registry/scripts/registry-test.mjs`.
5. `/home/batman/combo-wt/registry/scripts/selftest.mjs`.
6. `/home/batman/combo-wt/registry/scripts/badge-test.mjs`.
7. `/home/batman/combo-wt/registry/scripts/gate.mjs`, to know the table's shape. You do not edit it.
8. `/home/batman/combo-wt/registry/src/depot/api.js`, lines 450 to 460 only, the entry-point guard you copy the shape of.
9. `/home/batman/combo-wt/registry/docs/plans/phase-0.0.73-aim.md`, as the shape of a phase document.

## The design, fixed

1. `src/modules/registry/registry.js`: in the REGISTRY table, directly after the `render2d` entry and before the `// carved depot organs` comment, add three lines:

```js
  telemetry: { seam: "sample", gate: "telemetry" },
  opponent: { seam: "consume", gate: "opponent" },
  senses: { seam: "sample", gate: "senses" },
```

Nothing else in the file changes.

2. `scripts/selftest.mjs`: the hard-coded GATES list goes. In its place, `export function gateNames()` reads `scripts/gate.mjs` with fs, takes the text between `const GATES = {` and the first following `};`, and returns, in file order, every key matching a line of the form `"<name>": [` (the regex `^\s*"([a-z0-9-]+)":\s*\[` applied per line). The run loop is unchanged in behavior but runs over `gateNames()`, and it runs only when the file is the entry point, guarded the way `src/depot/api.js` guards its main (compare `import.meta.url` to `process.argv[1]`), so an importer gets the function without running the suite. The header comment says the list is read from the gate table and can never go stale.

3. `scripts/badge-test.mjs`: the two landed checks stay verbatim. The import line gains `import { gateNames } from "./selftest.mjs";` and `import fs from "node:fs";`. Add one check after the two, named `badge: the self-test's list equals the gate table's keys` — count the lines of `scripts/gate.mjs` between `const GATES = {` and the next `};` that match `^\s*"[a-z0-9-]+":\s*\[` with your own regex here, and assert `gateNames()` has that many names, its first name is `api`, and it includes `registry`, `aim`, and `render2d`. The count line becomes `badge-test: 3 PASS / 0 FAIL`.

4. `scripts/registry-test.mjs` is not edited. With the three lines added it prints 5 PASS lines and `registry-test: 5 PASS / 0 FAIL`.

## Steps

1. Read the list above. Confirm.
2. Write the three edits.
3. Run, from the worktree root: `node scripts/gate.mjs registry` twice, and `node scripts/gate.mjs badge` twice. registry must print 5 PASS lines then `registry-test: 5 PASS / 0 FAIL` then `registry-test PASS`, exit 0. badge must print its seeds line, 3 PASS lines, `badge-test: 3 PASS / 0 FAIL`, `badge-test PASS`, exit 0. Paste all four outputs whole in the report. Do not run the self-test itself; the landing runs it.
4. Write `docs/plans/phase-0.0.75-registry.md` in the worktree, this shape:

```
# Phase 0.0.75 — registry: the ghosts registered, the self-test made whole

Status: PLANNED. Built in worktree, awaiting the landing.
<!-- At landing this line becomes: Status: LANDED, commit `<hash>`, <date>. Gate: registry 5 PASS / 0 FAIL, badge 3 PASS / 0 FAIL; bracket unmoved. -->

<One paragraph: phase A1 of the general parts order; what moved, in plain words: the three ghost modules registered, the self-test reading the gate table, the badge gate proving it.>

## Lift kind

SHAPED — engine housekeeping under the order; no demo source.

## Acceptance arithmetic for the phase

Every number below is the run's output (badge rolled seeds <the two seeds>; registry is seedless, the tree is its fixture).

- `node scripts/gate.mjs registry` prints 5 PASS lines, then `registry-test: 5 PASS / 0 FAIL`, then `registry-test PASS`, exit 0. The standing red is closed.
- `node scripts/gate.mjs badge` prints a seeds line, 3 PASS lines, then `badge-test: 3 PASS / 0 FAIL`, then `badge-test PASS`, exit 0.
- Bracket, run at the landing: registry, badge, describe, and the full self-test.

## Tasks

- 0.0.75-1 — the edits. → `task-0.0.75-1-registry.md`
```

5. Commit on your branch, all four files, with this message exactly:

```
phase 0.0.75 — registry: the ghosts registered, the self-test made whole

Phase A1 of the general parts order. telemetry, opponent, and senses join the registry table; the self-test reads the gate table's keys; the badge gate proves the list. registry 5 PASS / 0 FAIL, badge 3 PASS / 0 FAIL.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01QSq3kZC3Bk9SC5RwnqYUfs
```

Do not push. Do not touch main.

## Rules

- No timed simulations. No replays. Rolled seeds, printed.
- The landed checks stay verbatim; only the count lines move.
- Never edit a demo file, the gate table, the README, the package version, any module but the registry, or another phase's documents.

## Report

Read-confirmation first (each file, its line count). One line of outcome. Then bullets: all four gate outputs whole; the diff summary as files and line counts (`git diff --stat` against main); the commit hash on your branch; every nonconformity as its own labeled bullet. Fixture seeds: badge's two rolled seeds; registry is seedless; no seed is special.

## The report's gate lines

- `node scripts/gate.mjs registry`: 5 PASS lines, `registry-test: 5 PASS / 0 FAIL`, `registry-test PASS`, exit 0, twice. The standing red is closed.
- `node scripts/gate.mjs badge`: seeds 372934942 and 861443875; `badge-test: 3 PASS / 0 FAIL`, `badge-test PASS`, exit 0, twice.
- Branch commit b40489f on phase/0.0.75-registry, landed by squash into main. Nonconformities: none reported.
