# Phase 0.1.1 — the hold on coldsnap

Status: DISPATCHED. Task 0.1.1-1 amended, approved 2026-09-09, and dispatched to Sonnet 5 on the resume.
<!-- The status word is one of PLANNED, SERVED, APPROVED, DISPATCHED, LANDED, ACCEPTED, RETURNED, moved by the plan-writer at each step; the parts page reads it. The phase lands when its last task lands; each task's row below records its own landing. At landing this line becomes: Status: LANDED, commit `<hash>`, <date>. Acceptance is recorded per part under a heading "## Acceptance" as "- <part id>: accepted" or "- <part id>: returned, <finding>", on the owner's word. -->

Frames 1 and 2, the bay and the hold, move onto coldsnap's engine, whole. The crash world is one of coldsnap's own war maps, made from the galaxy's seed; the war on it is coldsnap's whole, its attacker with its brain, its books, and its bell; its guns and walls are placed by its build law; its drawing and its sound are the ground's. Over that engine sits the ark's own layer: the hull as bodies on broken welds, her as one trooper with her own row, the hands as troopers, the walker at twice a trooper's height, the one purse the hold's scrap feeds, and TAKE OFF when every surviving module is welded. The ark's own hold from batch-ark-1 retires when the last task lands.

The phase is five tasks. Each task is planned after the one before it lands, written once for one reader. Until the last task lands, the new ground stands behind `?ground=1` in the address and the old hold stays the page's default, so the live page never loses a screen while the new one is built.

## Lift kind

SHAPED. Coldsnap's laws are carried through its own doors, the boot, the tick, the placement, the drawing, and the sound; the ark's layer is new code in its own files. Nothing in coldsnap's files changes. Every number of the ark's layer is PROPOSED.

## Decisions inside this plan

- The whole hold moves at once, in one phase of five tasks, each landed and deployed on its own.
- The crash world comes from coldsnap's own map maker; the hull lands where the crash pose says.
- Every module is a body, welded; the crash breaks welds by the weld-breaking rule.
- She is a coldsnap trooper in a squad of one, with her own row. Her row is installed into coldsnap's tables at the ground's boot from the ark's own file, so coldsnap's copies stay verbatim.
- The walker is coldsnap's mech at twice a trooper's height at least. The stance at that height did not hold on the old engine; whether it holds on the new one is measured in the walker's own task, and a failure there is a finding, not a fix.
- The enemy is coldsnap's attacker whole. Walls and guns are coldsnap's build lines and towers.
- One purse, fed by the hold's scrap and the ground's pay: ten kilograms of the ark's scrap to one of coldsnap's, PROPOSED; what is left comes back up at TAKE OFF.
- Sound on, coldsnap's, from the first task.
- The seam's numbers stay the slice's, marked PROPOSED: 250 ground kilograms per space kilogram; modules 1.6 m boxes on a 1.7 m pitch, set down from 1.5 m; the crash nose-down and sliding.
- The crash site is the player's ground from the first frame: four territory steps run at the boot; the war's own clock takes it from there.
- The war steps at coldsnap's own 1/120 of a second, two steps per frame step of the page.
- The hull's modules are coldsnap masonry, kind chunk on the player's side, set down at rest and asleep on the ground as coldsnap's own stones are; the 1.5 m drop waits for the crash as physics. Their welds carry the ship's own strengths at the seam's scale, 250 to one, so a lattice at rest holds and a blast can still break one. Which welds break at the crash is the weld-stress rule's verdict, the same rule the shell uses in space, at the arrival speed over a 0.3 s stop; a module cut off from the bridge is loose and slides 0.6 m per metre a second of arrival speed. The crash site is 14 m from the depot's spot, PROPOSED. A loose module wears the timber tint, a welded one the wall tint, so the two read apart without new drawing code.
- TAKE OFF refuses while a living module is loose, and names the dead as lost; the bridge dead is ABANDON SHIP, the ship lost.

## The walk, task 2

Phone and desktop as task 1.

- **The crash.** On entering the ground the hull's modules stand as bodies 14 m from the depot's spot, on the ship's own grid at a 1.7 m pitch; every module the weld-stress rule cuts off lies slid along the crash line in the timber tint. The log says how many modules are down and how many loose.
- **The pane** gains the modules line: standing of total, loose; the hull's standing is the living modules over all of them; THE BRIDGE IS LOST when it is.
- **TAKE OFF** asks the ground first. While a living module is loose it refuses and the log says how many; once every living module is welded to the bridge it takes off by the road's rule, the purse comes back as kilograms, the modules lost leave the build list, and the log names them.
- **The bridge destroyed** is ABANDON SHIP: the ship is lost, the card comes up as it does for any death.
- **Repair** has its mechanism, the weld-back, and no button yet: her act comes in task 3.

## Tasks

- 0.1.1-1 — the ground boots: coldsnap's war on the ark's page, guns by its build law, the one purse, sound, TAKE OFF. LANDED, commit `d793896`. → `task-0.1.1-1-the-ground-boots.md`
- 0.1.1-2 — the hull on the ground: modules as bodies from the ship's build list at the seam's scale, the crash pose, the welds and what breaks, the weld-back mechanism, TAKE OFF gated on every living module welded and naming the lost, the seam up and down. LANDED, commit `ebbcd81`. → `task-0.1.1-2-the-hull-on-the-ground.md`
- 0.1.1-3 — her and the hands: her row and her squad of one, her repair through the weld-back, the hands as troopers by name, fight or fix, walls by coldsnap's build lines. LANDED, commit `f1ec7ab`. → `task-0.1.1-3-her-and-the-hands.md`
- 0.1.1-4 — the walker and the boss: coldsnap's mech at twice a trooper's height at least, dead until repaired, hers to possess; the boss on the enemy's side; the stance measured. LANDED, commit `65c9104`. → `task-0.1.1-4-the-walker.md`
- 0.1.1-5 — the hold retires: the flag removed, the ark's own hold file and its checks retired, the parts source and the README's claims brought to the ground as built, the version to 0.1.1. DISPATCHED. → `task-0.1.1-5-the-hold-retires.md`

## The walk, task 1

Phone: one screen, the ground drawn full-size, the pane at the top right, the log at the bottom left, three buttons at the bottom right, the fixed cluster at the bottom left. Desktop: the same, with keys.

- **Landing.** With `?ground=1` in the address, the opening crash and every later crash open the ground instead of the old hold: `enterHold` in `docs/gravitys-ark/main.js` hands off to `enterGround`, which boots the ground from the galaxy's seed and the landed world through `makeGround` in `src/games/gravitys-ark/ground.js`, moves the hull's scrap into the purse at ten kilograms to one, and logs "on the ground at N m/s". The 2-D canvas hides; the 3-D canvas shows.
- **The picture.** Coldsnap's drawing of the war map through `makeRenderer`, the camera on the depot, one sun, shadows; the attacker's opening already fielded by coldsnap's own muster; assaults on coldsnap's bell.
- **The pane.** Time, the assault number, seconds to the next bell, scrap and its kilograms, guns standing, enemies afield, how much of the hull stands, and the tap line, from `summary` and `price`.
- **A tap on the ground** places the armed gun at the tapped point by coldsnap's build law through `placement.buildAt`: held ground, a free cell, the live price, one purchase a second. The log says what was placed and for how much, or why not, in coldsnap's own words: occupied, ground not held, no scrap, the market paces you.
- **The GUN button** cycles the five towers, its label the tower's name and live price. **SOUND ON/OFF** mutes coldsnap's sound; the first tap on the screen starts it, as browsers require. **TAKE OFF** takes off by the road's own rule, fuel and all, and hands the purse back to the hull as kilograms; the ground closes, the old space screen returns.
- **Two fingers** pinch to zoom and twist to turn the camera; the fixed cluster's + and − zoom too; keys 1 and 3 turn on desktop. Pause pauses the war with the road.
- **Without the flag** nothing changes: the old hold runs as it did.

## Acceptance arithmetic, task 1

Every hash below is its scratch copy's own after the edit. Every gate count is the count last recorded in the parts table at the 0.1.0 landing. The agent's run at landing is the proof; a moved number is a finding.

- `node scripts/gate.mjs gravitys-ark` prints 40 PASS lines, two more than the recorded 38, then `gravitys-ark-test: 40 PASS / 0 FAIL`, then `gravitys-ark-test PASS`.
- `node scripts/gate.mjs manifest` ends `manifest-test PASS`; `node scripts/gate.mjs parts` ends `parts-test PASS`.
- The parts build names 50 gates and every verdict is ok.
- The twelve hash lines in the task print OK.

## Acceptance arithmetic, task 2

- `node scripts/gate.mjs gravitys-ark` prints 42 PASS lines, two more than task 1's 40, then `gravitys-ark-test: 42 PASS / 0 FAIL`, then `gravitys-ark-test PASS`; manifest and parts end in their PASS lines.
- The parts build names 50 gates and every verdict is ok.
- The eight hash lines in the task print OK.

Suggested model for tasks 1 and 2: Sonnet 5 — every file is in the plan; nothing is designed.
