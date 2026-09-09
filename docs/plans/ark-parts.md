# GRAVITY'S ARK, the parts list: every module from each game, and what the story still lacks

Status: OUTLINE. No code, no plan. Both games come in whole. This lists every part by what it does, where it stands in this tree, and what the story needs that neither game has.

## The two decisions this list stands on

- Space runs in deadweight's own units. The ground runs in coldsnap's metres and kilograms. One factor sits at the seam: a space kilogram lands as 250 ground kilograms, the slice's number, PROPOSED.
- Coldsnap's engine and systems come in as they are, verbatim by hash from the local checkout at commit 111b9cb. Its screens do not. Every ark screen is written in the page's own way, one file each.

## Part one: coldsnap, whole

Eighty-three source files at head. This tree carries 42 from the older commit 82b5524; 35 of those now differ; 46 are not here. Grouped by what they do:

**The engine, two files, both here and behind head.**
- core.js: the physics core. Bodies, the height field, welds, projectiles, damage and killing, the drive, the solver, the step, the proving-grounds map. 2,598 lines at head.
- mech.js: the walker. Hinge joints, the mech island, the rig builder, the gait controller, and at head the leap, the gas store, the piston, the aimed nozzles, the shear tap. 3,301 lines at head, 375 ahead of the copy here.

**The drawing, three files, here and behind head.**
- graphics/renderer.js: the war's renderer. The lit cel world, shadows from one sun, painted roads and territory, instanced stones, troops from the troop kit, vehicles, the mech's links, tracers, smears, the outline pass.
- graphics/troopkit.js: troop identity. Side by coat, role by tool, weight by size.
- graphics/portrait.js: the info card's live picture.
- The render/ trio at head is the pre-fork copy of the same three files. Superseded; not needed.

**The war's systems, the depot, plain files.** Here and behind head: api (the one surface), boot, tick, sim, state, muster (the fresh-war boot block), specs (tower and enemy numbers), units (unit behavior), squads (squad brains), drivers (the motor pool), accuracy (the one scatter model), ai (the attacker's buy brain), economy (the attacker's books), intel, sight (who sees what), territory (who holds the ground), wind, fog, mines, buildlines (the two-point lay for walls), bell, market (the living market), cards and infocards, transports (boarding), route, orient, lists, mapgen (the map frame: valleys, towns, depots), save (saves). Not here, plain: orders (selection, move, attack, defend, possession), placement (live prices and placement verdicts), palette (the build palette), hooks (the debug harness), styles. Not here, screens: DepotGame, Crate, Dispatch, DraftScreen, InfoCard, RadialMenu, pies. Screens are rebuilt in the page's own way, not taken.

**The rest.** platform: audio (the shared sound engine, procedural), autosave, storage, keymap; here. game: mechReadout (the walker's drawn readout, plain, take), MechRange (the walker's bench screen, rebuild if wanted), scenario and predicate and the scenario tables (the campaign's contract pipeline, unused by the ark's frames), runner. aar/compose (the after-action report; a candidate for the card). ui: the start screen, controls, the sound board, the roadmap, theme; screens, not taken. demo/coldsnap-proving-grounds.jsx: the byte-frozen reference that coldsnap's golden gate reads; if the golden gate comes, the demo comes with it, an exception like the deadweight file already in git. version.js and main.jsx: not needed.

**What the ark's frames use from it.** The engine, the renderer, the troop kit, the mech with the leap, accuracy, units and squads for the men, buildlines and the towers for walls and guns, market and placement and palette for the build rail, transports for boarding, sight and territory and the bell for the front, save, the sound engine when sound is ruled in, mapgen when worlds get valleys.

## Part two: deadweight, whole

One file of 2,824 lines, the script from line 117 to 2,823. Nine systems are already modules here. The rest is not lifted.

**Lifted:** determinism (the seeded stream and the hash), market (the pools), ledger (genesis and the audit), escrow (contracts, rescues, the Authority's pay), builder (ports, welds, mass and thrust, connectivity, rotate, remove), wells (the field, the pair's orbit, the stop prediction), grapple (cast, bite, reel, yank, snap), aim (frozen-time aiming, the cone, the shot prediction), render2d (the projection, the warp, the grid), tape (every action with its tick; the replay is the save).

**Not lifted, by system:**
1. The world. The fixed map is replaced by the galaxy. Still needed from it: the nebula's drag, the gusher as a repelling well, the comet, the rocks that fall in and feed the wells' eaten mass, the boundary, the frontier that replaces the dead from a finite pool, the sun's heat and kill radius, the hole's kill radius.
2. The flight. The ship as a rigid body: thrust at each engine's mount, torque off the balance point, the thruster quads' turning, fuel as mass, the wells, the nebula, the sun's heat, the kill radii, the boundary, the docking rings, the pirate lock. The mass books: total mass, the hold's weight and capacity. Dock, undock, launch, the ship rebuilt from the build list. Death, respawn on debt at the hangar, the run's end. The rating mode, where the Authority rates your flying.
3. Welds in flight. Load from thrust and impact, breaking, the ship splitting along the broken welds, shed modules becoming wreckage. The weldstress module carries the law; the fracture and the shedding stayed in the demo.
4. The hangar, the ship builder's screen. The parts tray priced from the docked pools; tap to place, rotate, remove; blueprints priced as sell-the-build-buy-the-print; the module card with its description, stats, and picture; the build drawn in iso with couplers, the balance mark, and weld lines; the hull gallery with silhouettes and stats; the wallet; FLY.
5. Weapons. The slug driver, mass fired with recoil at its mount. The rack, four birds with motors, the ejection kick. Lead and intercept. The shield, a pocket repeller that shoves rocks and slugs off line and drinks fuel. Dust and burn effects.
6. Salvage. Scavenging a wreck into the hold, hot goods fenced at a cut, salvage mass sold by station rate, the hold dumped under a pirate lock.
7. The fabric. Every mass as one list for the rope and the shell; bodies tied by the rope pull both ways.
8. The sling planner. A planned burn at a chosen point on the swing, committed in frozen time.
9. Tramps. The arbitrage brain, their mass and value, death and respawn from the frontier, derelicts that become tows and rescue contracts.
10. Pirates. Roost, mark the richest, chase, lock, demand, fire, cool; the demand; the hit; paying; the Authority's purse and the bounty.
11. The drawing. Box prisms, module glyphs and letters, module bodies with their station of origin, shadows, couplers, the balance mark, faceted planets in their pits, the sun and its kill ring, the hole, the field rings, the nebula, the gusher, the comet, rocks and debris, the boundary, the armed stop, tramps, the line, payout toasts, pirates and roosts, wreckage, crates, stations with dock rings and contract flags, the gate, the plumes with shock diamonds and flare, burn effects, weld seams tinted by load, heading and velocity, the coast line, the ship panel, the minimap, missiles and slugs and dust, the sling fan, the aim cone, the banners.
12. The page. The loop with its camera follow, burn shake, and auto-zoom near wells; the rail; the flight readout; the intro card with the seed; the report; the badge; the theme switch. Screens, in the page's own way.

## Part three: the ark's own layer

**From the night, at real scale, to be re-dialed to deadweight's units in space:**
- galaxy: keep. One seed makes the worlds with radius, gravity, climate, ring, holder, station, and hands; the gate with toll and bill; the collapse count; names, women and men; the lanes. Gains the world's kind and the gate's seeded state.
- road: retire. Deadweight's flight replaces the point ship. Its laws that deadweight lacks move into the ark's layer: the hole's mass stepping with each world eaten, the schedule ahead, the edge per hull.
- stations: keep on top of deadweight's markets. Hands by name at a rising price, wages due at dock, debt, the people contract, carry and deliver.
- wrecks: retire. Deadweight's wreckage and grapple, with the collapse shell from the slice.
- price: keep her price, the factions' listings, the hire-out, the bounty's purse. The lock joins deadweight's pirates, demanding her or the cargo instead of credits.
- gate and card: keep. The bill, the toll, the Fitters, passing, respawn ahead of the edge, the endings, the log, the card. Gains the gate by seed.
- hold: retire. The ground runs on coldsnap.

**From the slice, rewritten properly, not copied:** the seam with the factor; the ground layer: the crash pose as physics, the Grip as units in waves, repair with drag, walls and guns, the walker with repair, possess, fire, and leap, the boss with knockdowns, men by name with kills, crew who deploy and board, her on foot, infection and the rising dead, scars and the registry, the front; the star's stages, the collapse shell, the land rings.

## Part four: what the story still lacks

Built in neither game nor the night:
1. The mech bay. The walker rides only if a mech bay module is welded. A module kind with a mechanism: it carries the rig's mass, sets the walker beside the hull at landing, boards it at takeoff.
2. Her as one figure across both games. In space her price and her hire-out; on the ground the slice's pilot as a war unit; the night's fight-or-fix. One state, both sides of the seam.
3. The gate by seed: working with a high toll, broken, blockaded, or both. The blockade reuses the pirates with the holder's coin.
4. A save. Deadweight saves the tape; coldsnap saves the war; the ark needs the road, the registry, the log, and the ground as one saved run. The registry lives in memory only.
5. Dialogue as data and the ship computer.
6. The star in every frame and the held shot at the collapse. A camera law.
7. The ground's light reddening per landing, the shadows lengthening.
8. The hands' walk when unpaid, the home line, the card's list of who did not come through.
9. Tramps that leave. Deadweight's tramps trade; the exodus is a brain change.
10. The plague world distinguished: no market, the Grip's ground. The galaxy needs the kind; the night trades everywhere.
11. The scrub as a priced listing line.
12. Weapons on the ark's hull, from deadweight's lift, so a blockade can be fought and the module kinds sold today do something.
13. The storyteller, later.
14. The walker at the ruled scale. Open on coldsnap's bench.
15. Sound. Coldsnap's engine exists; deadweight has none; the ark has none by the standing note.
16. Onboarding. Nowhere; the ship computer's lines are the candidate.

## Part five: the seam

- Down: the build list with each module's station of origin, the hold, fuel, salvage, crew by name, infection, the arrival speed, the world's kind and holder.
- Up: which modules were lost, detached, or destroyed; whether the ship is whole; the crew back and the crew lost; the time spent on the ground; infection carried.
- One clock: the ground's seconds are the road's seconds. The hole's schedule runs while you are down.
- The factor: 250 ground kilograms per space kilogram, PROPOSED. Modules are 1.6 m boxes on a 1.7 m pitch, set down from 1.5 m; a crash comes in nose-down and sliding.

## How they come in

- Coldsnap: verbatim by hash from the local checkout, the plain files whole, the screens left behind.
- Deadweight: as modules by system, exact math with substitution tables and dials, each with a gate holding its laws at rolled seeds.
- The ark's layer: new code, PROPOSED numbers, gates.
- Every screen: its own file. The page's main file takes only the hookup lines.
