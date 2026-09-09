# Phase 0.1.2 — the five findings

Status: DISPATCHED. Task 2 landed, commit stamped below, 2026-09-09; task 3 is planned next.
<!-- The status word is one of PLANNED, SERVED, APPROVED, DISPATCHED, LANDED, ACCEPTED, RETURNED, moved by the plan-writer at each step; the parts page reads it. The phase lands when its last task lands; each task's row below records its own landing. At landing this line becomes: Status: LANDED, commit `<hash>`, <date>. Acceptance is recorded per part under a heading "## Acceptance" as "- <part id>: accepted" or "- <part id>: returned, <finding>", on the owner's word. -->

The five findings returned from the playtest of the landed ground, recorded under Acceptance in `phase-0.1.1-the-hold.md`, fixed in one phase of five tasks in the recorded order: the ground screen's layout, her clearance when the walker stands, the ship at its ground scale with the mech bay, the ship's look on the ground from deadweight's drawing, and space drawn as deadweight draws it. Each task is planned after the one before it lands, written once for one reader. The game stays playable at every landing.

## Lift kind

SHAPED. The first three tasks are the ark's own layer, new code in its own files; nothing in coldsnap's files changes, and a door coldsnap's drawing needs is made here as a listed difference from the checkout. The two drawing tasks carry deadweight's drawing from `deadweight-hangar.html`, cited by line in their own task plans, the law carried and the code new; the demo is read only, never edited, never read by a gate. Every number of the ark's layer is PROPOSED.

## Decisions inside this plan

- One phase, five tasks, in the order the findings were recorded; each task landed and deployed on its own.
- The ground's screen has a layout of its own. One mark on the page's body says the ground is up; by it the page's own panes, buttons, dock, gate pane, and flat canvas hide, and the ground's own pane, log, and buttons show. The numbers stand at the top left; the buttons in three rows of three above the fixed cluster; the log and the stick above the buttons. Phone and desktop share the layout.
- She steps aside. Her stand for the walker's repair is 4.5 m off the wreck, coldsnap's own room distance for a mech. At the moment the walker stands, any of hers still inside that room, her or a hand, is moved to the nearest clear point on the ring by coldsnap's own clear-slot rule, before the walker is built.
- A module is 10 m on the ground, on a 10.7 m pitch, by the mass factor: 250 times the mass is 6.3 times the length, so the 1.6 m box of the seam's table lands as 10 m. The crash site moves so the whole hull stands inside the map's rim and clear of the depot. The modules' footprints are stamped into coldsnap's grid so guns, walls, and paths go around them.
- The walker rides in the mech bay. The bay holds it: it lies wrecked at the bay on the ground; a hull without a bay lands without a walker; the starter hull gains a bay, 1,800 kg more to fly; a walker down on the ground at TAKE OFF is lost until a new bay is bought.
- The ship's look on the ground is deadweight's, as solid shapes in coldsnap's scene at the ground's scale: the prism per kind with its own footprint and height, the glyph and the letter on the top face, the station's colour, struts as beams, the couplers as joints, the engine's nozzle, the mech bay open for the walker.
- Space is drawn as deadweight draws it, from the demo's lines 849 to 1461: the warped grid with the wells' pits, the planets and the sun in their pits, the hole and its edge, the ship's modules as prisms with their plumes, the line ahead, the status panel, and the minimap, in a screen file of its own; the page's main file keeps only the hookup lines. The fifth finding's fix line in phase 0.1.1's record is corrected to say so.

## Tasks

- 0.1.2-1 — the ground's layout: the ground's own pane, log, and button rows; the space panes hidden on the ground; the page's main file down to hookup lines. LANDED, commit `6e4bd59`. → `task-0.1.2-1-the-ground-layout.md`
- 0.1.2-2 — she steps aside: her stand off the wreck at coldsnap's room distance; anyone of hers inside it moved clear by coldsnap's own rule before the walker is built. LANDED, commit stamped below. → `task-0.1.2-2-she-steps-aside.md`
- 0.1.2-3 — the ship at scale and the mech bay: 10 m modules on a 10.7 m pitch, the crash site inside the rim, the footprints stamped into the grid, the bay on the starter hull, the walker in the bay. Planned after task 2 lands.
- 0.1.2-4 — the ship's look on the ground: deadweight's module drawing as solid shapes in coldsnap's scene, through one listed door. Planned after task 3 lands.
- 0.1.2-5 — space as deadweight draws it: the drawing from the demo's lines 849 to 1461 in a space screen file of its own. Planned after task 4 lands.

Suggested model: Sonnet 5 — every edit is in the plan; nothing is designed.

## The walk, task 1

Phone and desktop share the layout; the desktop keeps its keys.

- **Landing.** The crash opens the ground as before through `enterGround` in `docs/gravitys-ark/main.js`; the screen's `enter` in `docs/gravitys-ark/ground.js` now also puts the mark `ground` on the page's body. By that mark the title, the ship pane, the clocks, the space log, the six space buttons, the dock pane, the gate pane, and the flat canvas hide; the ground's canvas, pane, log, and buttons show.
- **The pane** at the top left: the same five lines as before from `summary` and `price`, wrapping to the screen's width, written by the screen's own `hud`.
- **The log** at the right above the buttons: the last eight lines of the road's event list, the same lines the space log shows, through one line-maker shared by both.
- **The buttons** in three rows of three above the fixed cluster: GUN, WALL, FIX; FIGHT, HOLD, REPAIR WALKER; FIRE, SOUND, TAKE OFF. Each does what it did; labels and states as before. On the phone the rows span the width; on the desktop they sit at the bottom right, 420 px wide.
- **The stick** at the left above the buttons while she is in the walker; the fixed cluster stays at the bottom left with its zoom, pause, and SEED.
- **Leaving** the ground through TAKE OFF or ABANDON SHIP takes the mark off the body; everything of space returns as it was.
- **Nothing else moves:** no order, spend, or number changes; the parts gate finds the same seed hooks in the page's files.

## Acceptance arithmetic, task 1

Every hash below is its scratch copy's own after the edit; the gate counts are the counts last recorded in the parts table at the 0.1.1 landing. No gate reads what this task changes; the parts build at the landing runs every gate and is the proof.

- The three hash lines in the task print OK; both syntax checks print ok.
- The parts build names 50 gates and every verdict is ok; inside it the ark's gate stands at 43 PASS / 0 FAIL.

## The walk, task 2

Phone and desktop the same; nothing on the screen moves.

- **REPAIR WALKER** sends her not to the wreck's spot but to a stand just outside the walker's room: 4.5 m, coldsnap's own placement distance for a mech, plus her half width and half a metre, on her own side of the spot, through coldsnap's clear-slot rule so the stand is never inside masonry. The log says "she goes to the walker" as before; the pane counts her seconds down while she is within 10 m of the spot.
- **The raise.** When her seconds run out, everyone of hers still inside the room, her or a hand, is moved to such a stand first; then coldsnap's mech is built at the spot and the log says "the walker stands". No body of hers is inside the walker when it is built, so the engine's ejection has no one to throw.
- **Outside the room** nobody moves: a hand standing 7.5 m off stays where it stood.
- **Nothing else changes:** FIGHT, HOLD, FIRE, the stick, and the walker's own numbers as before.

## Acceptance arithmetic, task 2

- `node scripts/gate.mjs gravitys-ark` prints 45 PASS lines, two more than the recorded 43, then `gravitys-ark-test: 45 PASS / 0 FAIL`, then `gravitys-ark-test PASS`.
- The parts build names 50 gates and every verdict is ok.
- The two hash lines in the task print OK.
