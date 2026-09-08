# Task 0.0.80-1 — escrow: the prices as dials

One job: the second pass over the escrow module under the general parts order, phase A8. Write exactly the design below, run the gate, write the phase document, commit on your branch, report. You design nothing beyond this brief; anything it did not foresee stops the task and is reported as a nonconformity.

Model: Sonnet 5.

Where you work: the worktree at `/home/batman/combo-wt/escrow`, branch `phase/0.0.80-escrow`. You never touch `/home/batman/combo-engine` (the main tree). You never edit `scripts/gate.mjs`, `README.md`, `package.json`, `src/modules/registry/registry.js`, or any document of another phase. You never edit a demo file.

Required reading, in order, whole (confirm each with its line count at the top of your report):
1. This file.
2. `/home/batman/combo-engine/docs/plans/batch-general-1.md`, the sections "The generalization law", "The rules of the run", and "A8, escrow".
3. `/home/batman/combo-wt/escrow/src/modules/escrow/escrow.js`.
4. `/home/batman/combo-wt/escrow/scripts/escrow-test.mjs`.
5. `/home/batman/combo-wt/escrow/docs/modules/module-pattern.md`.
6. `/home/batman/combo-wt/escrow/docs/plans/phase-0.0.73-aim.md`, as the shape of a phase document.

## The design, fixed

Module `src/modules/escrow/escrow.js`. Every function keeps its name and its export; the arithmetic is unchanged except that the literals become dials. Changes, and only these:

1. Add `export const ESCROW_DIALS = { margin: 1.55, base: 120, floor: 200, rescueBase: 600, rescueCut: 0.3, partTerm: 120, rescueTerm: 150, cool: 30, scanEvery: 60 };`
2. `makeBook(opts)` returns `{ list: [], seq: 0, scan: 0, dials: { ...ESCROW_DIALS, ...(opts && opts.dials) } }`. A call with no argument keeps the demo's numbers.
3. `postContract(book, stations, sid, otherSid, part)` reads `book.dials`: `pay = Math.ceil(srcSpot * d.margin + d.base)`; refused when `pay < d.floor`; the row's `t` is `d.partTerm`. The rest is unchanged.
4. `postRescueAt(book, stations, sid, value)` reads `book.dials`: `fee = Math.min(m.credits, d.rescueBase + Math.round(value * d.rescueCut))`; refused when `fee < d.floor`; the row's `t` is `d.rescueTerm`.
5. `fulfilContract(stations, ct, dials = ESCROW_DIALS)` sets `stations[ct.at].cool = dials.cool`. The two landed arguments and their meaning are unchanged; a book with its own dials passes `book.dials` as the third argument.
6. `stepContracts(book, stations, dt, partOrder)` reads `book.dials`: expiry sets `cool = d.cool`; the scan gate is `if ((book.scan++) % d.scanEvery) return;`; the posting inside it goes through postContract, which reads the same book.
7. Add `export const STATIONS_CONTRACT = { "<sid>": { credits: "number >= 0", cool: "number", parts: { "<part>": { q: "integer", c: "integer" } } } };`
8. Add `export function checkStations(stations)` returning a list of plain problem strings, empty when clean, every problem in one pass: not an object gives the single problem `stations: not an object`; then per station `stations.<sid>.credits: number >= 0 required`, `stations.<sid>.cool: number required`, `stations.<sid>.parts: object required`, and per part `stations.<sid>.parts.<part>.q: integer required`, `stations.<sid>.parts.<part>.c: integer required`.
9. Add to the header comment, after the numbered substitutions, a second numbered list for the second pass: the dials, the contract.

Gate `scripts/escrow-test.mjs`. The seven landed checks stay verbatim, in order, with their names. The import line gains `ESCROW_DIALS` and `checkStations`. Then these checks, appended after the seven:

8. `escrow: at rolled dials the posted pay is ceil(spot times margin plus base), capped by the treasury, refused under the floor` — 300 rolls: dials with margin in 1 to 3, base in 0 to 500, floor in 50 to 400; rolled stations; a book from makeBook({ dials }); postContract alpha from beta for engine; the expectation computed the way the landed first check computes it, with the rolled dials in place of 1.55, 120, and 200.
9. `escrow: a rolled term expires exactly at the term and returns the escrow` — 100 rolls: partTerm in 10 to 300 (an integer), a book with those dials, alpha rich, a contract posted; stepContracts with dt equal to the term minus 0.5 leaves it open; one more step of 0.5 closes it, escrow 0, the treasury plus escrow unchanged from before the post.
10. `escrow: credits conserve through every path at rolled dials` — the landed storm (six hundred rolled steps) run once more with a rolled dials object on the book and `book.dials` passed to fulfilContract: treasuries plus escrow plus payouts equal the start.
11. `escrow: the contract counts every problem` — `checkStations({ a: { credits: -1, cool: "x", parts: { p: { q: 1.5, c: "c" } } } })` returns exactly 4 problems; `checkStations(rollStations())` returns 0; `checkStations(null)` returns 1.
12. `escrow: the module imports only from its own folder or a sibling module` — read the module file with fs and assert every `import ... from "<x>"` specifier matches `^\.\.\/[a-z0-9-]+\/` or `^\.\/`; escrow has no imports, so the check passes on an empty list.

The count line becomes `escrow-test: 12 PASS / 0 FAIL`, then `escrow-test PASS`, exit 0. Any FAIL stops the task.

## Steps

1. Read the list above. Confirm.
2. Write the module changes.
3. Write the gate changes.
4. Run, from the worktree root, twice: `node scripts/escrow-test.mjs`. Both runs must print the seeds line, 12 PASS lines, the count line, and the verdict, exit 0. Paste both outputs whole in the report.
5. Write `docs/plans/phase-0.0.80-escrow.md` in the worktree, this shape:

```
# Phase 0.0.80 — escrow: the prices as dials

Status: PLANNED. Built in worktree, awaiting the landing.
<!-- At landing this line becomes: Status: LANDED, commit `<hash>`, <date>. Gate: 12 PASS / 0 FAIL; bracket unmoved. -->

<One paragraph: the second pass over the escrow module under the general parts order, phase A8; what moved, in plain words.>

## Lift kind

SHAPED second pass — the demo's arithmetic is untouched; its nine literals are dials on the book with the demo's values as defaults. The changes are the second numbered list in the module header.

## Acceptance arithmetic for the phase

Every number below is the run's output (rolled seeds <the two seeds>).

- `node scripts/escrow-test.mjs` prints a seeds line, 12 PASS lines, then `escrow-test: 12 PASS / 0 FAIL`, then `escrow-test PASS`, exit 0.
- The seven landed checks are verbatim.
- Bracket, run at the landing: escrow.

## Tasks

- 0.0.80-1 — the second pass. → `task-0.0.80-1-escrow.md`
```

6. Commit on your branch, all three files, with this message exactly:

```
phase 0.0.80 — escrow: the prices as dials

Second pass under the general parts order. Nine literals become dials on the book, defaults the demo's; the stations contract. Gate 12 PASS / 0 FAIL at rolled seeds; the seven landed checks verbatim.

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

- `node scripts/escrow-test.mjs`: seeds 469172833 and 185049731; 12 PASS lines, `escrow-test: 12 PASS / 0 FAIL`, `escrow-test PASS`, exit 0, twice.
- Bracket at the landing: escrow, PASS.
- Branch commit 380ad71 on phase/0.0.80-escrow, landed by squash into main. Nonconformities: none.
