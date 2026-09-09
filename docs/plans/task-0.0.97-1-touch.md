# Task 0.0.97-1 — touch: the touch commands

One job: lift the touch commands from the fleet demo into a module under the general parts order, phase B9: events in, intents out, no page. Write exactly the design below, run the gate, write the phase document, commit on your branch, report. You design nothing beyond this brief; anything it did not foresee stops the task and is reported as a nonconformity.

Model: Sonnet 5.

Where you work: the worktree at `/home/batman/combo-wt/touch`, branch `phase/0.0.97-touch`. You never touch `/home/batman/combo-engine` (the main tree). You never edit `scripts/gate.mjs`, `README.md`, `package.json`, `src/modules/registry/registry.js`, any other module, or any document of another phase. You never edit a demo file.

Required reading, in order, whole (confirm each with its line count at the top of your report):
1. This file.
2. `/home/batman/combo-engine/docs/plans/batch-general-1.md`, the sections "The generalization law", "The rules of the run", and "B9, touch".
3. `/home/batman/combo-engine/homeworld_fleet_command.jsx`, lines 153, 1097 to 1162, and 1170 to 1196 only. Read-only source material; a React and three.js file. You lift the law, not the page.
4. `/home/batman/combo-wt/touch/src/modules/disc/disc.js`, whole, the module this one feeds.
5. `/home/batman/combo-wt/touch/src/modules/selection/selection.js`, whole, the other module this one feeds.
6. `/home/batman/combo-wt/touch/docs/modules/module-pattern.md`.
7. `/home/batman/combo-wt/touch/docs/plans/phase-0.0.73-aim.md`, as the shape of a phase document.

## The design, fixed

New module `src/modules/touch/touch.js`, a SHAPED lift. The law carried, cited by line: the middle button or alt plus the left button starts an orbit drag (1099); the right button with a selection orders attack on an enemy under the pointer, guard on a friend under it that is not selected, else opens the disc on the ground point and, without the modifier, orders a move at once (1100 to 1125); the left button without alt starts a box (1126); a move while orbiting turns the camera by dx times 0.005 and dy times 0.005 with the pitch clamped to 0.15 to 1.5, or pans by dx times 0.12 and dy times 0.12 with shift held and no follow, or turns the follow camera by the same 0.005 (1129); a box counts once the pointer moves more than 5 pixels in x or y (1130); with the disc open and the modifier held a move drags the disc by dy (1131, the disc module's law); the right button's release with the disc open and the modifier held commits the disc (1135); the left button's release ends a box or is a click (1138 to 1139); the wheel changes the camera distance by deltaY times 0.08 clamped 15 to 500, or the follow distance by deltaY times 0.04 clamped 8 to 60 (1143 to 1147); the keys: Shift holds the modifier, Tab toggles the sensor view, ctrl or meta plus a selects all, f follows the one selected unit, h homes the camera, Escape releases the follow or clears the selection, space pauses (1148 to 1162); on touch a single finger held 500 ms without moving opens the disc when a selection exists (1170), a single moving finger drags the disc when it is open with the modifier, else orbits by 0.006, two fingers pinch the distance by their spacing ratio clamped 15 to 500 and pan by 0.15 (1171), a release with the disc open commits it, a tap in move mode opens the disc with an auto move, a tap in attack mode orders attack on an enemy under it else an attack-move to the ground point, a second tap within 350 ms opens the disc with an auto move, and a plain tap selects or clears (1172 to 1196). The code is new: the page binds events, hands each one in with what it found under the pointer, and applies the intents; the module owns the thresholds, the timings, the clamps, and the camera numbers.

Exports:

- `export const TOUCH_DIALS = { longPressMs: 500, doubleTapMs: 350, boxDragPx: 5, orbitMouse: 0.005, orbitTouch: 0.006, panMouse: 0.12, panTouch: 0.15, wheelZoom: 0.08, zoomMin: 15, zoomMax: 500, followWheel: 0.04, followMin: 8, followMax: 60, phiMin: 0.15, phiMax: 1.5 };`
- `export function makeTouch(opts)`: dials `{ ...TOUCH_DIALS, ...opts.dials }`; camera state `{ theta, phi, dist, followTheta, followPhi, followDist }` seeded from `opts.camera` or `{ theta: 0, phi: 0.8, dist: 110, followTheta: 0, followPhi: 0.8, followDist: 20 }`. Returns a surface with `feed(event)`, `tick(t)`, `setMode(mode)`, `setFollow(on)`, `state` (readable: shiftHeld, dragging, boxing, discOpen, discModifier, follow, mode, camera), and `dials`.
  - An event is a plain object: `{ type, t, x, y, button, alt, shift, ctrl, meta, key, deltaY, touches, selected, under }` where `type` is one of down, move, up, wheel, keydown, keyup, touchstart, touchmove, touchend; `touches` a list of `{ x, y }`; `selected` the count of selected units; `under` what the page found under the pointer, `{ enemy, friend, ground }` with `enemy` and `friend` a unit or null and `ground` a point or null, and for a friend also `friendSelected` true when that friend is in the selection.
  - `feed(event)` returns a list of intents, each a plain object with a `kind`: `orbitStart`; `camera` with the new theta, phi, dist (after an orbit, a pinch, or a wheel); `pan` with dx, dy already scaled by the gain; `attack` with `target`; `guard` with `target`; `move` with `point`; `attackMove` with `point`; `discOpen` with `point` and `auto` true or false; `discDrag` with `dy` and `source`; `discCommit`; `discClose`; `boxStart` with x, y; `boxDrag` with `rect` `{ x1, y1, x2, y2 }` ordered; `boxEnd` with `rect`; `click` with x, y, shift; `follow` with `dist`; `key` with `name` one of sensor, selectAll, follow, home, releaseFollow, clearSelection, pause; `select` (a plain tap's selection request, the page resolves the unit); `clear`.
  - `tick(t)` returns the intents that fall due from time alone: the touch long press, when one finger has been down and unmoved for at least longPressMs and a selection exists, gives `discOpen` with the ground point the page handed at the touch start, once.
  - `setMode(mode)` sets the mobile command mode: "move", "attack", or null.
  - `setFollow(on)` tells the module the camera follows a unit; the page owns which.
- `export const TOUCH_CONTRACT` as a plain field description and `export function checkTouchDials(d)` returning a list of plain problem strings, empty when clean, every problem in one pass: not an object gives the single problem `dials: not an object`; then `dials.<name>: number > 0 required` for every dial missing or not over 0; and `dials.<lo>: under <hi> required` for each of the three clamp pairs when the low is not under the high.

The module header states the lift: MODULE: touch, the box it serves, the demo lines, the law carried, what is new.

Gate `scripts/touch-test.mjs`, new. A rolled seed printed as `seeds {"touch":<n>}`, read from `process.env.SEED` when set, else rolled, with the small seeded stream the other gates use. Every check scripts events through feed and tick with rolled times and positions; no timers. Checks, in this order and with these names:

1. `touch: a press held past the long-press dial opens the disc and one under it selects` — 100 rolls of a hold in 0 to 1000 ms with rolled dials (longPressMs in 100 to 900): a touchstart with selected 1 and a ground point, no move, tick at start plus hold: a discOpen intent exactly when hold is at least the dial; a touchend before the dial yields a select intent and no discOpen.
2. `touch: two taps inside the double-tap window open the disc with an auto move, outside it they do not` — a first tap (touchstart, touchend) with selected 1 and a ground point, then a second at a rolled gap in 0 to 700 ms, dials doubleTapMs rolled in 100 to 600: the second tap yields discOpen with auto true exactly when the gap is under the dial.
3. `touch: a left drag past the box dial boxes, and under it clicks` — a mouse down with button 0 at a rolled point, a move by a rolled offset in 0 to 12 pixels on one axis, then an up: boxStart on the down; boxDrag and boxEnd with an ordered rect exactly when the offset exceeds the dial; otherwise a click intent on the up.
4. `touch: the right button orders attack on an enemy, guard on an unselected friend, and a move on ground, and the modifier holds the disc` — with selected 1: a right down with an enemy under it yields attack; with an unselected friend yields guard; with a selected friend and a ground point yields discOpen and move; with shift held it yields discOpen only, a move with the disc open yields discDrag with the mouse source, and the right up yields discCommit.
5. `touch: orbit, pan, pinch, and the wheel stay inside their clamps` — 200 rolls of drags and wheels: an alt-left drag changes theta by dx times orbitMouse and phi by minus dy times orbitMouse clamped to the pitch dials; a shift drag with no follow yields pan dx and dy scaled by panMouse; a wheel changes dist by deltaY times wheelZoom clamped to zoomMin and zoomMax; with follow on, a wheel changes followDist by deltaY times followWheel clamped to followMin and followMax; a two-finger pinch scales dist by the spacing ratio and clamps the same way; a one-finger touch move with no disc orbits by orbitTouch.
6. `touch: the keys map to their names` — Shift down and up flips shiftHeld; Tab yields sensor; ctrl plus a yields selectAll; f with one selected yields follow and with two selected yields nothing; h yields home; Escape yields releaseFollow when following and clearSelection when not; space yields pause.
7. `touch: the mobile modes route a tap` — setMode("move") and a tap with a ground point yields discOpen with auto true; setMode("attack") and a tap on an enemy yields attack, on ground attackMove; setMode(null) and a tap yields select.
8. `touch: twin surfaces agree` — two surfaces fed the same rolled event script give JSON-equal intent lists and equal camera state.
9. `touch: the contract counts every problem` — `checkTouchDials({ ...TOUCH_DIALS, zoomMin: 600, boxDragPx: 0 })` returns exactly 2 problems; `checkTouchDials(TOUCH_DIALS)` returns 0; `checkTouchDials(null)` returns 1.
10. `touch: the module imports only from its own folder or a sibling module` — read the module file with fs and assert every `import ... from "<x>"` specifier matches `^\.\.\/[a-z0-9-]+\/` or `^\.\/`; touch has no imports, so the check passes on an empty list.

The count line is `touch-test: 10 PASS / 0 FAIL`, then `touch-test PASS`, exit 0. Any FAIL stops the task.

## Steps

1. Read the list above. Confirm.
2. Write the module.
3. Write the gate.
4. Run, from the worktree root, twice: `node scripts/touch-test.mjs`. Both runs must print the seeds line, 10 PASS lines, the count line, and the verdict, exit 0. Paste both outputs whole in the report.
5. Write `docs/plans/phase-0.0.97-touch.md` in the worktree, this shape:

```
# Phase 0.0.97 — touch: the touch commands

Status: PLANNED. Built in worktree, awaiting the landing.
<!-- At landing this line becomes: Status: LANDED, commit `<hash>`, <date>. Gate: 10 PASS / 0 FAIL; bracket unmoved. -->

Serves the checklist box "The touch commands: the right mouse button, solved for a phone". Source: the fleet demo, read-only, lines 153, 1097 to 1162, 1170 to 1196. <One more sentence in plain words: what the module does and what the page keeps.>

## Lift kind

SHAPED — the law carried: every threshold, timing, gain, clamp, and order rule the demo's handlers apply. The code is new: events in, intents out; the page binds events, hands in what lies under the pointer, and applies the intents.

## Rulings inside this plan

- The dials are the demo's numbers as defaults.
- Registry seam: consume. The registry and gate-table lines are the landing's.

## Acceptance arithmetic for the phase

Every number below is the run's output (rolled seeds <the two seeds>).

- `node scripts/touch-test.mjs` prints a seeds line, 10 PASS lines, then `touch-test: 10 PASS / 0 FAIL`, then `touch-test PASS`, exit 0.
- Load-bearing knowns from the demo's own lines: the fifteen dials.
- Bracket, run at the landing: touch, disc.

## Tasks

- 0.0.97-1 — the lift. → `task-0.0.97-1-touch.md`
```

6. Commit on your branch, all three files, with this message exactly:

```
phase 0.0.97 — touch: the touch commands

Checklist: the touch commands, the right mouse button solved for a phone. The demo's thresholds, timings, gains, clamps, and order rules carried as an input classifier: events in, intents out, no page. Gate 10 PASS / 0 FAIL at rolled seeds.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01QSq3kZC3Bk9SC5RwnqYUfs
```

Do not push. Do not touch main.

## Rules

- No DOM. No timers. No three.js. Rolled seeds, printed. No literal that is one seed's own output.
- Never edit a demo file, the gate table, the README, the package version, the registry table, another module, or another phase's documents.

## Report

Read-confirmation first (each file, its line count). One line of outcome. Then bullets: both gate outputs whole; the diff summary as files and line counts (`git diff --stat` against main); the commit hash on your branch; every nonconformity as its own labeled bullet. Fixture seeds: the two rolled seeds; no seed is special.

## Amendment

The module was first named after the box's old words. The name is now touch, the box's words "The touch commands: the right mouse button, solved for a phone", and every file, gate, seed key, and check name follows: `src/modules/touch/touch.js`, `scripts/touch-test.mjs`, `seeds {"touch":<n>}`, checks `touch: ...`, the phase document `phase-0.0.97-touch.md`, the branch `phase/0.0.97-touch`. The order's B9 section and the README box change words at the landing. Nothing else in the design moved.

## The report's gate lines

- `node scripts/touch-test.mjs`: seeds 504225704 and 149738354; 10 PASS lines, `touch-test: 10 PASS / 0 FAIL`, `touch-test PASS`, exit 0, twice.
- Bracket at the landing: touch, disc, selection, registry, every tail PASS. The gate-table and registry lines are the landing's.
- Branch commit 3aeb51f on phase/0.0.97-touch, landed by squash into main.
- Nonconformity: three agents in turn stalled on this brief, two cut off by the output limit with nothing written and one stopped after forty minutes without a write. The orchestrator wrote the module and the gate from the brief in the worktree, the plan-writer's own trial, and landed them under the same bracket. Readings where the brief was silent are listed in the module header: the camera intent carries the numbers of the camera that moved with a follow flag; the f key yields the follow intent with the demo's distance 20; h resets the distance to the seeded camera's; a plain tap yields select with the friend the page handed or null, and the clear kind is reserved; discOpen in the state means a modifier-held disc, an auto disc being the disc module's own clock. None moved a law.
