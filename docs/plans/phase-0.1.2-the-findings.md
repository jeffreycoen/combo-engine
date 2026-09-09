# Phase 0.1.2 — the five findings

Status: LANDED, commit stamped below, 2026-09-09. Five tasks landed; the ark's gate 49 PASS / 0 FAIL; the parts build 50 gates, every verdict ok.
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
- 0.1.2-2 — she steps aside: her stand off the wreck at coldsnap's room distance; anyone of hers inside it moved clear by coldsnap's own rule before the walker is built. LANDED, commit `664d6c6`. → `task-0.1.2-2-she-steps-aside.md`
- 0.1.2-3 — the ship at scale and the mech bay: 10 m modules on a 10.7 m pitch, the crash site inside the rim, the footprints stamped into the grid, the bay on the starter hull, the walker in the bay. LANDED, commit `76f5262`. → `task-0.1.2-3-the-ship-at-scale.md`
- 0.1.2-4 — the ship's look on the ground: deadweight's module drawing as solid shapes in coldsnap's scene, through one listed door. LANDED, commit `98e11e5`. → `task-0.1.2-4-the-ships-look.md`
- 0.1.2-5 — space as deadweight draws it: the drawing from the demo's lines 849 to 1461 in a space screen file of its own. LANDED, commit stamped below. → `task-0.1.2-5-space-as-deadweight.md`

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

## The walk, task 3

Phone and desktop the same.

- **The crash.** The hull's five modules, 10 m boxes on a 10.7 m pitch, 250 times their space mass, land on the line from the depot toward the map's centre, snapped to the nearest axis: the bridge 26 m out, the engine nearer the depot, the tank beyond, the pod and the bay across; a loose module slides on along that line. The log's counts as before. Coldsnap's grid is blocked under every module, so guns, walls, and paths go around the hull; a tap on a module says NO GROUND.
- **The site.** Coldsnap's placement radius, 36 m, now centres on the bridge: a gun goes anywhere within it, held ground and a free cell as before.
- **The crew.** She stands 9 m off the bridge's free face, across the line; the hands behind her. Every slot and spawn on the ground now treats a module as ground, coldsnap's own switch.
- **FIX** walks her to the loose module's nearest face; her seconds run within 2.5 m of that face; the weld-back sets the module in its slot, moves anyone the box would land on off its face, welds it to every neighbour already joined to the bridge, and re-stamps the grid.
- **The walker** lies at the mech bay's door, 9 m off the bay's open face, wherever the bay lies; the log says "the walker lies wrecked at the bay's door". REPAIR WALKER goes to the door's stand; "the bay is destroyed" refuses it when the bay is dead. A hull without a bay lands without a walker: the log says "no walker aboard", the pane's walker line says none, REPAIR WALKER stays dark.
- **TAKE OFF** with the walker down marks it lost on the hull: the next crash lands without one until a mech bay is bought at a station, when a new walker comes with it.
- **Space.** The starter hull carries the bay: the ship pane's mass reads 1,800 kg more, and the road flies it.

## Acceptance arithmetic, task 3

- `node scripts/gate.mjs gravitys-ark` prints 47 PASS lines, two more than the recorded 45, then `gravitys-ark-test: 47 PASS / 0 FAIL`, then `gravitys-ark-test PASS`. Four pins re-taught by this task's own change, each named in the task: the build check's masses, the crash check's loose set to the rule's own verdict, the FIX check's loose count, the WALL check's line.
- The parts build names 50 gates and every verdict is ok.
- The seven hash lines in the task print OK.

## The walk, task 4

Phone and desktop the same.

- **The ship.** Every module is a body and a drawing of deadweight's own shape at the ground's scale, one drawing unit 2.675 m, the pitch over the demo's cell: the bridge 7.8 m square and 5.4 m tall; the engine 10.2 m along the line by 8.6 m across, 3.1 m tall, its nozzle on the face away from its neighbour; the pod 9.1 m square, 4.8 m tall; the tank 8.6 by 7.2 m, 2.4 m tall; a strut a beam 10.7 m long and 3.2 m wide, turned along its connections; the mech bay 10.7 m square and 7 m tall, taller than the walker, dark on its door side. Each prism wears the station's colours, top and sides; the demo's glyph and letter lie on the top face; the edges are inked, amber while the module is loose. A coupler with its amber ring sits on every weld that holds and goes with the weld. The balance mark, the demo's quartered disc, lies on the ground at the ship's balance point. Coldsnap's sun lights and shadows all of it. The drawing is `docs/gravitys-ark/hull-look.js`, hooked from the ground's screen; it moves nothing.
- **The camera** opens on the bridge at a wide zoom, 0.6, so the hull is in view; pinch and the fixed cluster zoom as before.
- **The bodies** take the same shapes, so the room, the stand, the faces, the footprints in the grid, and the walker's door follow each kind's own size; no order, spend, or number changes.
- **The one door.** Coldsnap's drawing returns its scene alongside its other doors: one token in the renderer, the fifth listed difference from the checkout, counted in the README's engine line; the parts page measures it as changed here.

## Acceptance arithmetic, task 4

- `node scripts/gate.mjs gravitys-ark` prints 48 PASS lines, one more than the recorded 47, then `gravitys-ark-test: 48 PASS / 0 FAIL`, then `gravitys-ark-test PASS`.
- The parts build names 50 gates and every verdict is ok.
- The seven hash lines in the task print OK; the new file's hash among them.

## The walk, task 5

Phone and desktop the same; the controls, the panes, the dock, the gate pane, and the card are as they were.

- **Space** is drawn by `docs/gravitys-ark/space.js`, hooked from the main file, which hands it one snapshot of the page's state each frame and draws nothing of space itself. The grid, the pits, and the projection are the render2d module's, lifted from the demo earlier; the rest is the demo's drawing at the ark's scale.
- **The worlds** are faceted planets in their pits, each lit from one side, with an atmosphere and a rim toward the sun, coloured by climate; a world the hole took is a dark disc. The label under each names it, its climate, its holder, and EDGE where the road says so. Four rings on the net around every well say where its pull bites.
- **The sun** has its glow, its body reddening one step per takeoff, and its kill ring riding the pit, dashed red at the radius the road kills at. After the collapse the hole is a black disc with a turning dashed disc around it and its edge drawn as before.
- **The gate** stands as two lit posts and a lintel where the galaxy's gate is; the lanes as before.
- **The ship** is its modules as the demo's prisms around its balance point, at sixteen pixels a pitch at any zoom, turned to its velocity or, at rest, to its aim, with the demo's glyph and letter on each top face and a coupler on every weld; while it burns, a plume behind every engine along the burn's own line, with the demo's bloom, cone, shock diamonds, core, and occasional flare. Its heading line is amber, brighter while burning; its velocity line blue; the balance mark at its centre; a red ring when the ship is lost.
- **The coast line** runs six minutes ahead by the road's own gravity law, a dot every third second, red where a well would take it, ending where it would.
- **Wrecks** are prisms at their kind: a module by its shape, a crate golden with its kilograms, scrap and hulls grey with an amber ring. **Pirates** are the demo's two-prism boats with a hunting glow off the roost, their roost ringed, and the lock ring around the ship while one holds it. **The grapple** line sags to its hook.
- **The ship panel** at the bottom right draws the hull's modules on their grid with their glyphs and the welds between them, the frame coloured by the hull's health. **The map** at the top left draws the galaxy: every world by its climate, the sun or the hole and its edge, the gate, the pirates, the wrecks, the ship, and the coast half an hour ahead.
- **Nothing else moves:** no order, spend, or number changes; the camera, the zoom cluster, the drag to aim, and the keys are the page's as before.

## Acceptance arithmetic, task 5

- `node scripts/gate.mjs gravitys-ark` prints 49 PASS lines, one more than the recorded 48, then `gravitys-ark-test: 49 PASS / 0 FAIL`, then `gravitys-ark-test PASS`.
- The parts build names 50 gates and every verdict is ok.
- The six hash lines in the task print OK; the new file's hash among them.
- The phase lands with this task: the status line and the version to 0.1.2 ride the landing.
