# Task 0.0.90-1 — disc: the 3-D movement disc

One job: lift the movement disc's law from the fleet demo into a module under the general parts order, phase B7. Write exactly the design below, run the gate, write the phase document, commit on your branch, report. You design nothing beyond this brief; anything it did not foresee stops the task and is reported as a nonconformity.

Model: Sonnet 5.

Where you work: the worktree at `/home/batman/combo-wt/disc`, branch `phase/0.0.90-disc`. You never touch `/home/batman/combo-engine` (the main tree). You never edit `scripts/gate.mjs`, `README.md`, `package.json`, `src/modules/registry/registry.js`, any other module, or any document of another phase. You never edit a demo file.

Required reading, in order, whole (confirm each with its line count at the top of your report):
1. This file.
2. `/home/batman/combo-engine/docs/plans/batch-general-1.md`, the sections "The generalization law", "The rules of the run", and "B7, disc".
3. `/home/batman/combo-engine/homeworld_fleet_command.jsx`, lines 880, 1091 to 1093, 1122, 1131, 1135, and 1170 to 1172 only. Read-only source material. It is a React and three.js file; you lift the law, not the page.
4. `/home/batman/combo-wt/disc/src/modules/orders/orders.js`, whole, to see the move order the disc feeds.
5. `/home/batman/combo-wt/disc/src/modules/tape/tape.js`, whole, as the shape of a small maker module.
6. `/home/batman/combo-wt/disc/docs/modules/module-pattern.md`.
7. `/home/batman/combo-wt/disc/docs/plans/phase-0.0.73-aim.md`, as the shape of a phase document.

## The design, fixed

New module `src/modules/disc/disc.js`, a SHAPED lift. The law carried, cited by line: the ground point is the pointer's ray meeting the ground plane (880); a right press on ground opens the disc at that point and, without the modifier held, orders the move at once (1122); with the modifier held a mouse drag of dy pixels changes the disc's height by minus dy times 0.25 (1131) and a touch drag by dy times 0.3 (1171), both clamped to minus 40 to 40; a release with the modifier held orders the move at the disc's point and height (1135, 1172); a long press of 500 ms opens the disc on touch (1170); the disc hides 600 ms after an order (1092); the grid fan of the move order is the orders module's own (1091, already lifted as orderMove). The code is new: no three.js, no DOM, no timers; the page hands in pointer events and the clock.

Exports:

- `export const DISC_DIALS = { mouseGain: 0.25, touchGain: 0.3, clamp: 40, autoHideMs: 600, longPressMs: 500 };`
- `export function groundHit(origin, dir, planeY)`: origin and dir are `[x, y, z]` arrays; returns the point `[x, planeY, z]` where the ray meets the horizontal plane at planeY, or null when dir's y is within 1e-12 of zero or the meeting point lies behind the origin (t under 0).
- `export function makeDisc(opts)`: `dials` is `{ ...DISC_DIALS, ...opts.dials }`. Returns a surface with:
  - `open(point, t)`: sets active true, `point` a copy of the array, `h` equal to point's y, `openedAt` t; returns the surface.
  - `drag(dy, source)`: when active, `h` changes by minus dy times mouseGain when source is "mouse" and by dy times touchGain when source is "touch" (the demo's two signs, verbatim), then clamps to minus clamp to clamp; returns h.
  - `target()`: when active, `[point x, h, point z]`; else null.
  - `commit(t)`: when active, returns the target and records `hideAt` equal to t plus autoHideMs, keeping the disc active until `tick(t)` passes hideAt; else null.
  - `tick(t)`: when active and hideAt is set and t is at least hideAt, closes the disc; returns active.
  - `close()`: active false, hideAt null; returns the surface.
  - `longPress(downT, nowT)`: true when nowT minus downT is at least longPressMs, a pure helper for a page's touch timer.
  - `active`, `h`, `point`, `hideAt` readable as fields.
- `export const DISC_CONTRACT = { mouseGain: "number > 0", touchGain: "number > 0", clamp: "number > 0", autoHideMs: "number > 0", longPressMs: "number > 0" };` and `export function checkDiscDials(d)` returning a list of plain problem strings, empty when clean, every problem in one pass: not an object gives the single problem `dials: not an object`; then `dials.<name>: number > 0 required` for each of the five when missing or not a number over 0.

The module header states the lift: MODULE: disc, the box it serves, the demo lines, the law carried, what is new.

Gate `scripts/disc-test.mjs`, new. A rolled seed printed as `seeds {"disc":<n>}`, read from `process.env.SEED` when set, else rolled, with the small seeded stream the other gates use. Checks, in this order and with these names:

1. `disc: at rolled drags the height is the clamped sum of dy times the source's gain` — 300 rolls: rolled dials (gains in 0.05 to 1, clamp in 5 to 100), a disc opened at a rolled point, a rolled sequence of 1 to 12 drags with dy in minus 200 to 200 and source mouse or touch; the height equals a running clamp computed in the check from the same law, exactly (===).
2. `disc: groundHit's point lies on the plane and on the ray at rolled rays, and a ray parallel to the plane gives null` — 300 rolls: an origin above a rolled planeY, a direction with a negative y; the point's y equals planeY exactly and the point equals origin plus t times dir within 1e-9 for some t over 0; a direction with y 0 gives null; a direction pointing away (positive y from above the plane) gives null.
3. `disc: open, commit, and the auto-hide follow the clock` — a disc opened at t 0 with rolled dials; commit at a rolled t returns the target and the disc stays active; tick at t plus autoHideMs minus 1 keeps it active; tick at t plus autoHideMs closes it; target is null after.
4. `disc: the long press is the dial` — longPress at nowT minus downT equal to longPressMs minus 1 is false and at longPressMs is true, at rolled dials.
5. `disc: twin surfaces agree` — two discs with the same rolled dials and the same rolled event sequence end with equal h, point, active, and target.
6. `disc: the contract counts every problem` — `checkDiscDials({ mouseGain: 0, touchGain: "x", clamp: -1 })` returns exactly 5 problems (three bad, two missing); `checkDiscDials(DISC_DIALS)` returns 0; `checkDiscDials(null)` returns 1.
7. `disc: the module imports only from its own folder or a sibling module` — read the module file with fs and assert every `import ... from "<x>"` specifier matches `^\.\.\/[a-z0-9-]+\/` or `^\.\/`; disc has no imports, so the check passes on an empty list.

The count line is `disc-test: 7 PASS / 0 FAIL`, then `disc-test PASS`, exit 0. Any FAIL stops the task.

## Steps

1. Read the list above. Confirm.
2. Write the module.
3. Write the gate.
4. Run, from the worktree root, twice: `node scripts/disc-test.mjs`. Both runs must print the seeds line, 7 PASS lines, the count line, and the verdict, exit 0. Paste both outputs whole in the report.
5. Write `docs/plans/phase-0.0.90-disc.md` in the worktree, this shape:

```
# Phase 0.0.90 — disc: the 3-D movement disc

Status: PLANNED. Built in worktree, awaiting the landing.
<!-- At landing this line becomes: Status: LANDED, commit `<hash>`, <date>. Gate: 7 PASS / 0 FAIL; bracket unmoved. -->

Serves the checklist box "The 3-D movement disc: order movement in three dimensions with a flat pointer". Source: the fleet demo, read-only, lines 880, 1091 to 1093, 1122, 1131, 1135, 1170 to 1172. <One more sentence in plain words: what the module does.>

## Lift kind

SHAPED — the law carried: the ground hit, the two drag gains and the clamp, the long press, the auto-hide, the move at the disc's point and height. The code is new: no three.js, no DOM, no timers; the page hands in events and the clock. The meshes and the pulse stay with the page.

## Rulings inside this plan

- The dials are the demo's numbers as defaults.
- Registry seam: consume. The registry and gate-table lines are the landing's.

## Acceptance arithmetic for the phase

Every number below is the run's output (rolled seeds <the two seeds>).

- `node scripts/disc-test.mjs` prints a seeds line, 7 PASS lines, then `disc-test: 7 PASS / 0 FAIL`, then `disc-test PASS`, exit 0.
- Load-bearing knowns from the demo's own lines: gains 0.25 and 0.3, clamp 40, auto-hide 600 ms, long press 500 ms.
- Bracket, run at the landing: disc.

## Tasks

- 0.0.90-1 — the lift. → `task-0.0.90-1-disc.md`
```

6. Commit on your branch, all three files, with this message exactly:

```
phase 0.0.90 — disc: the 3-D movement disc

Checklist: the 3-D movement disc. The ground hit, the drag gains and clamp, the long press, and the auto-hide carried from the fleet demo as a maker over plain data; the page keeps the meshes. Gate 7 PASS / 0 FAIL at rolled seeds.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01QSq3kZC3Bk9SC5RwnqYUfs
```

Do not push. Do not touch main.

## Rules

- No timed simulations. No timers. No DOM. Rolled seeds, printed. No literal that is one seed's own output.
- Never edit a demo file, the gate table, the README, the package version, the registry table, another module, or another phase's documents.

## Report

Read-confirmation first (each file, its line count). One line of outcome. Then bullets: both gate outputs whole; the diff summary as files and line counts (`git diff --stat` against main); the commit hash on your branch; every nonconformity as its own labeled bullet. Fixture seeds: the two rolled seeds; no seed is special.

## The report's gate lines

- `node scripts/disc-test.mjs`: seeds 2977658158 and 1356020820; 7 PASS lines, `disc-test: 7 PASS / 0 FAIL`, `disc-test PASS`, exit 0, twice.
- Bracket at the landing: disc, orders, registry, every tail PASS. The gate-table and registry lines are the landing's.
- Branch commit efbee54 on phase/0.0.90-disc, landed by squash into main.
- No nonconformity named.
