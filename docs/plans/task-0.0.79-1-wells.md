# Task 0.0.79-1 — wells: any number of wells, each with its own softening

One job: the second pass over the wells module under the general parts order, phase A6. Write exactly the design below, run the gate, write the phase document, commit on your branch, report. You design nothing beyond this brief; anything it did not foresee stops the task and is reported as a nonconformity.

Model: Sonnet 5.

Where you work: the worktree at `/home/batman/combo-wt/wells`, branch `phase/0.0.79-wells`. You never touch `/home/batman/combo-engine` (the main tree). You never edit `scripts/gate.mjs`, `README.md`, `package.json`, `src/modules/registry/registry.js`, or any document of another phase. You never edit a demo file.

Required reading, in order, whole (confirm each with its line count at the top of your report):
1. This file.
2. `/home/batman/combo-engine/docs/plans/batch-general-1.md`, the sections "The generalization law", "The rules of the run", and "A6, wells".
3. `/home/batman/combo-wt/wells/src/modules/wells/wells.js`.
4. `/home/batman/combo-wt/wells/scripts/wells-test.mjs`.
5. `/home/batman/combo-wt/wells/docs/modules/module-pattern.md`.
6. `/home/batman/combo-wt/wells/docs/plans/phase-0.0.73-aim.md`, as the shape of a phase document.

## The design, fixed

Module `src/modules/wells/wells.js`. Every function keeps its name, its signature, and its export. Changes, and only these:

1. In predStop, the pair pull over exactly two wells becomes a pull over every ordered pair. The demo's lines

```js
    for (const [a, b] of [[wl[0], wl[1]], [wl[1], wl[0]]]) { const dx = b.x - a.x, dy = b.y - a.y, r2 = dx * dx + dy * dy + 9;
      const s2 = .01 * b.mu / Math.pow(r2, 1.65); a.vx += dx * s2 * pdt; a.vy += dy * s2 * pdt; }
    wl[0].x += wl[0].vx * pdt; wl[0].y += wl[0].vy * pdt; wl[1].x += wl[1].vx * pdt; wl[1].y += wl[1].vy * pdt;
```

become

```js
    for (const p of wl) for (const q of wl) { if (q === p) continue; const dx = q.x - p.x, dy = q.y - p.y, r2 = dx * dx + dy * dy + q.soft * q.soft;
      const s2 = .01 * q.mu / Math.pow(r2, 1.65); p.vx += dx * s2 * pdt; p.vy += dy * s2 * pdt; }
    for (const p of wl) { p.x += p.vx * pdt; p.y += p.vy * pdt; }
```

The order of operations for two wells is the demo's own: the first well's velocity from the second, the second's from the first, then both positions in order. With soft 3 on both wells the numbers are identical to the demo's, since 3 times 3 is 9. Nothing else in predStop changes.

2. Add `export const WELL_CONTRACT = { x: "finite number", y: "finite number", mu: "finite number", soft: "number > 0", r: "number >= 0" };`
3. Add `export function checkWell(w)` returning a list of plain problem strings, empty when clean, every problem in one pass: not an object gives the single problem `well: not an object`; then `well.x: finite number required`; `well.y: finite number required`; `well.mu: finite number required`; `well.soft: number > 0 required`; `well.r: number >= 0 required`.
4. Add to the header comment, after the numbered substitutions, a second numbered list for the second pass: the pair loop over every well with its own softening, the contract.

Gate `scripts/wells-test.mjs`. The nine landed checks stay verbatim, in order, with their names, including the first check that reads the demo's text (it is grandfathered). The import line gains `checkWell`. Then these checks, appended after the nine:

10. `wells: at rolled two-well fixtures with soft 3 the new predStop equals the two-well reference` — the gate carries a private function `refStop`, the demo's own two-well predStop copied verbatim from the landed module's text before your change (the whole function, renamed, and only renamed). Roll two wells with `rollWell()` and set both softs to 3; roll a ship as the landed sixth check does; call predStop and refStop with the same drive; the results are both null or equal in x, y, and t exactly (===). 40 rolls.
11. `wells: three wells give a finite answer or null` — 20 rolls of three wells and a rolled ship: the result is null or has finite x, y, t with t at least 0.
12. `wells: a well with no mass changes nothing` — 40 rolls: one rolled well alone, then the same well beside a second well with mu 0 placed 1000 away; predStop gives results that are both null or equal in x, y, and t exactly.
13. `wells: the contract counts every problem` — `checkWell({ x: "a", y: NaN, mu: Infinity, soft: 0, r: -1 })` returns exactly 5 problems; `checkWell(makeWell(1, 2, 3, 4, 5, "n"))` returns 0; `checkWell(null)` returns 1.
14. `wells: the module imports only from its own folder or a sibling module` — read the module file with fs and assert every `import ... from "<x>"` specifier matches `^\.\.\/[a-z0-9-]+\/` or `^\.\/`; wells has no imports, so the check passes on an empty list.

The count line becomes `wells-test: 14 PASS / 0 FAIL`, then `wells-test PASS`, exit 0. Any FAIL stops the task.

## Steps

1. Read the list above. Confirm.
2. Copy predStop's current text into the gate as refStop first, then write the module change.
3. Write the gate changes.
4. Run, from the worktree root, twice: `node scripts/wells-test.mjs`. Both runs must print the seeds line, 14 PASS lines, the count line, and the verdict, exit 0. Paste both outputs whole in the report.
5. Write `docs/plans/phase-0.0.79-wells.md` in the worktree, this shape:

```
# Phase 0.0.79 — wells: any number of wells, each with its own softening

Status: PLANNED. Built in worktree, awaiting the landing.
<!-- At landing this line becomes: Status: LANDED, commit `<hash>`, <date>. Gate: 14 PASS / 0 FAIL; bracket unmoved. -->

<One paragraph: the second pass over the wells module under the general parts order, phase A6; what moved, in plain words.>

## Lift kind

SHAPED second pass — the field law and every predictor formula are untouched; the pair pull in the stop predictor reads every well and each well's own softening, and two wells with soft 3 give the demo's numbers exactly. The changes are the second numbered list in the module header.

## Acceptance arithmetic for the phase

Every number below is the run's output (rolled seeds <the two seeds>).

- `node scripts/wells-test.mjs` prints a seeds line, 14 PASS lines, then `wells-test: 14 PASS / 0 FAIL`, then `wells-test PASS`, exit 0.
- The nine landed checks are verbatim.
- Bracket, run at the landing: wells, aim, describe.

## Tasks

- 0.0.79-1 — the second pass. → `task-0.0.79-1-wells.md`
```

6. Commit on your branch, all three files, with this message exactly:

```
phase 0.0.79 — wells: any number of wells, each with its own softening

Second pass under the general parts order. The stop predictor pulls every pair by each well's own softening; the well contract. Gate 14 PASS / 0 FAIL at rolled seeds; the nine landed checks verbatim.

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

- `node scripts/wells-test.mjs`: seeds 243858690 and 181739558; 14 PASS lines, `wells-test: 14 PASS / 0 FAIL`, `wells-test PASS`, exit 0, twice.
- Bracket at the landing: wells, aim, describe, every tail PASS.
- Branch commit 976dbd2 on phase/0.0.79-wells, landed by squash into main. Nonconformities: none.
