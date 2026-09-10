# combo-engine

A swiss-army-knife game engine and verification harness. Every part is proven in a playable demo before it enters the engine.

## What this is

Engine parts are built inside working game demos first — a part gets made where it can be seen running and played, then moves into the engine once it has earned its place. The current demos hold the first generation of parts; future parts arrive the same way. Nothing enters the engine untested.

The project has two halves. The **engine** is the parts: physics, renderers, sound, economy, control. The **harness** is what makes the parts trustworthy: determinism laws, data contracts, state hashes, and headless gates that ratify every change with numbers instead of judgment. The harness is also what makes fast prototyping safe — a new game idea can be generated quickly, and the gates say mechanically whether anything broke.

The spine is the coldsnap war engine, being extracted in its own repository now. Four demos contribute the rest.

## How it works

- **One api, there to help.** The api is the paved road: boot a world, attach modules, run the loop, all from one call. Games are free to import modules directly when that serves them better. A manifest tool maps who imports what, so the wiring is always visible either way.
- **A game is data.** A game = a world description + spec tables + a choice of blades, handed to one boot call. Everything is defaulted, so the shortest call boots a sensible world; everything is overridable, so "moon gravity, no wind, this renderer, that rig with wider feet" is one object. Contracts validate the description at the door and report every problem at once.
- **Standard sockets.** Input comes in each tick as one command object. The sim tells the renderer what changed through flags. The sim tells the sound engine what happened through events. Modules never know which game is running.
- **A module pattern.** Every blade has the same five parts: a maker that takes one options object and returns one surface; a declared seam (tick, consume, draw, or sample); a contract for its inputs; a headless gate that prints a number; a clean manifest. New blades are made by filling the skeleton.
- **Dials name their law.** Any argument that relaxes a verified rule says which rule, and states the measured consequence. Flexibility never becomes a quiet cheat.

## The blades

- Body physics and terrain, with craters and deterministic replay (coldsnap)
- Position-based jointed physics: stiff machines, breakable mounts, torque-limited actuators (the mech demo)
- Ballistics with a material table, plus voxel destruction and structural collapse (the shooting-range demo)
- A conservation ledger, moving-price markets, and escrow contracts (the space-hauler demo)
- Fleet orders and steering for units in open space (the fleet demo)
- Three renderers: coldsnap's, a 3-D lit renderer, a 2-D canvas renderer
- Procedural spatial sound, built from published acoustics, no asset files (coldsnap)
- An input module (touch sticks, zones, keyboard) and a widget kit (telemetry, logs, minimaps, reports)

## The checklist

What moves into the engine, from where it was proven. Unchecked boxes are the roadmap; checking them is the ship history. Every item lands with a contract and a gate, and is reachable through the api.

### The api itself

- [ ] Boot from a world description object (seed, terrain, gravity and wind, spec tables, module choices, dials)
- [x] Module registry and the standard sockets (tick input, renderer flags, sound events)
- [x] The module pattern: skeleton, seam definitions, and the module-author's rule sheet (minted by the market module)
- [x] The manifest tool: a map of what every file imports from the engine, kept mechanically

### The harness layer (universal — these pay off in every game)

- [x] Determinism kit: one seeded random stream for the sim, a second for effects, bit-exact state hashing
- [x] The contract pattern: tables declared as data, checked at boot, every problem reported at once
- [x] Headless gates and the boot self-test badge: fixed run from a seed, hashes printed, checks shown at start
- [x] The input tape: every action recorded with its tick, a seed plus the tape replays a run exactly
- [x] The receipt log: events stated as plain-language numbers
- [x] The phone-first page kit: touch hardening, safe-area layout, light and dark theme

### From coldsnap (the spine)

- [x] The war engine core: bodies, terrain, craters, welds, projectiles, the determinism laws
- [x] The api surface and the roster contract pattern
- [x] The sound engine: spatial model, event vocabulary, continuous beds (its acoustics reference doc still to come over)
- [x] The renderer
- [x] The spine at coldsnap 111b9cb: every taken file matching the checkout by hash; the walker's leap and gas system, the jeep on springs, real tanks with hull-borne launch loads, the order chain, the placement layer, the harness — 0.1.0

### From the mech demo

- [x] The position-based physics core (the mech island coldsnap already reserves a hook for)
- [x] Mount failure envelopes: four load types, one utilization number, honest tearing
- [x] Torque-limited joint actuators with finite stiffness
- [x] The rig table: a whole machine as data, mirrored per side, assembled from the table
- [x] Leg inverse kinematics
- [x] The balance controller and the walking planner
- [x] Labeled-cheat presets: every relaxed rule named, with its measured consequence
- [x] Per-joint load telemetry as an engine output

### From the shooting-range demo

- [x] The ballistics solver and the material table: drag, wind, ricochet, perforation, embed, energy receipts
- [x] Plane-set solids: boxes, turned boxes, prisms, one ray routine for all of them
- [x] Voxel destruction: damage only where hit, bored tunnels, support collapse, rubble that stacks
- [x] Support propagation: unsupported structure falls; decoration goes with its host
- [x] The non-lethal opponent model: per-part thresholds, knockdown by impulse, a lethal line that fails the mission
- [x] Opponent senses and cover reasoning
- [x] The greybox part library: stairs, facades, vehicles, figures, at true human scale
- [x] The 3-D lit renderer: shadows, baked lamps, sky, finishing pass, edge outlines, instanced debris

### From the space-hauler demo

- [x] The conservation ledger: every unit declared at world start, audited to zero drift forever
- [x] Market pools: prices that move with every trade, players and computer traders in the same pools
- [x] Contracts with escrow, open races, and expiry
- [x] The ship builder: parts on a grid, connection ports, derived mass, balance, and turn authority
- [x] Weld stress with load-based breaking and honest ship splitting
- [x] The grapple rope: taut constraint, both ends pulled by their masses, yank, snap
- [x] Frozen-time aiming: stop the sim, show the reach, predict with the sim's own step, commit or cancel
- [x] The 2-D canvas renderer, with the gravity-warped grid

### From the fleet demo

- [x] The fleet order model: select, move, attack, guard — orders as data on units
- [x] The 3-D movement disc: order movement in three dimensions with a flat pointer
- [x] Steering behaviors: acceleration, capped turning, banking, strafe and guard orbits
- [x] The selection and feedback layer: brackets, health ramps, order lines, formation links
- [x] The touch commands: the right mouse button, solved for a phone
- [x] The space backdrop and effects kit: starfield, nebulae, trails, beams, explosion rings
- [x] Musical cues folded into the sound engine's vocabulary

## Building a game

The intended workflow, for a person or an agent. Untested until the api lands — this section is the test script for that day.

1. **Read the api surface.** The typedefs and contracts in the api file are the required reading. No need to read any module's insides to use it.
2. **Write data first.** A game starts as a world description object and its spec tables. Both are plain data.
3. **Check at the door.** Run the contract checkers. Every missing field is reported at once; a bad description never reaches the sim.
4. **Boot headless and gate.** Run the described world a fixed distance from a seed with no commands; it prints its hashes. Stable hashes twice means the world is real and deterministic — before any picture exists.
5. **Add mechanics on the sockets, ratified by numbers.** Each system reads the tick input, writes world state, emits events. Gate after each one; read the receipt log to confirm it did what was claimed.
6. **Script scenarios as input tapes.** A tape of timed commands replays headless; its end-state hash becomes that scenario's pinned test. This is how an agent plays the game without playing it.
7. **Attach blades and look.** Choose the renderer and sound module in the description, boot in a browser, screenshot at fixed ticks. Mechanics are verified by numbers; look, feel, and sound are judged by a person.
8. **Hand over a reproducible thing.** The deliverable is the description, the tables, the tapes, and the gate numbers. Same seed, same hashes, for anyone. A bug report is a seed plus a tape.

## FROSTLINE — the playable game

A fan-fiction tactics campaign in the clone-war shape, live at `docs/frostline/` on the published pages. Ten phases landed (0.0.18 through 0.0.29, records in `docs/plans/`); every claim below is checkable at the page and in the gate.

- **The board is the spine.** Every load deals a contract board — posted jobs with a name, a price, a legitimacy tag, and sometimes a HOT ROUTE. Clean jobs pay less; underground jobs pay more and heat the hunter. One address names one exact job forever (`?board=B&job=K`).
- **Travel can be contested.** A hot route flies its ambush first: wings of fighters on the flat black, the same points and confirmations as the ground, on the landed fleet orders and steering modules. Won, the ground job waits past it.
- **The ground fight:** free time until first contact, then alternating halves — three points a squad, every action priced in a confirmation carrying the cover shield and an audited chance-to-hit (measured against live fire, inside a ten-point band). Overwatch cones, focus fire on a shared mark, discipline a squad at a time.
- **A battle is its seed.** Missions are rules over any seeded valley — forces on vetted ground, the spawn-to-exit road proven before a man spawns. Every order records to a tape at its tick; seed plus tape replays a battle bit-exact. A bug report is a saved battle.
- **The purse remembers.** Kills pay bounties win or lose; contracts pay their posted price; the shop sells squads, medics, and the hunter — one armored man, twin sidearms, a 35-meter jetpack line, one of a kind. The men persist between contracts and the dead stay dead until replaced at the table's own split price. Purse, roster, heat, and casualties ride the browser's storage with a reset.
- **The gate:** `node scripts/gate.mjs frostline` — one-call asserts grouped by area, seconds to run; long-run truths are the owner's playtest at the page, by standing ruling.

## GRAVITY'S ARK — the first road

You are a ship; she is a mechanic who can fix anything; a star dies behind you and becomes a black hole that eats the galaxy one world at a time; a gate at the far end is the only way out. Live at `docs/gravitys-ark/` on the published pages, built under `docs/plans/batch-ark-1.md`; every claim below is checkable at the page and in `scripts/gravitys-ark-test.mjs`. Every number is PROPOSED in that order's scale table until the owner rules.

- **One seed makes everything:** `?seed=N` in the address gives the same galaxy to anyone: eight to twelve worlds on a road from the pit to the gate, each with its radius, gravity, climate, ring, holder, and station; the collapse count; the toll and the gate's bill; names for people, women and men.
- **The road:** the ship flies under the wells law over every world and the pit; burns spend fuel as mass; a hull that reaches a surface lands by the band, the descent burn killing up to the escape speed, a crash to 22.5 m/s over it, death above; the collapse fires on the seeded takeoff; the hole grows on a schedule computable before launch and eats worlds in distance order; the edge is the nearest world your hull can still leave.
- **The page (0.1.2):** space drawn as deadweight draws it, in the space screen's own file: the warped grid with the wells' pits, the worlds as faceted planets in their pits by climate, the sun with its kill ring, the hole with its turning disc and its edge, the gate as lit posts, the ship as deadweight's prisms with a coupler on every weld and plumes when it burns, its heading, its velocity, the balance mark, the coast line ahead, wrecks and pirates as prisms, the grapple line, the ship panel, and the map of the galaxy; the clocks, LAND, TAKE OFF, and a burn aimed at the gate or by a drag; phone and desktop.
- **The ring's business:** every station keeps pools for scrap, fuel, people, and modules on the market's law, dearer nearer the pit; hands hired by name from the seed at a rising price; wages due at every dock; the build screen on the builder; the far ring's starving stations post the contract to move people on the escrow.
- **The wrecks and the price:** the collapse shell shoves every body and tests the hull's welds; wreck fields fall to the pit; the grappler reels them in on the grapple module's rope; the Wreckers roost, chase, lock, and demand her or the cargo; pay or outrun; the Authority's bounty; the Charter's hire-out.
- **The gate and the card:** shut until she pays its bill in time, scrap, and modules by seed; the toll to the Authority; the Fitters buy at the gate; passing names its ending; a lost ship wakes ahead of the edge in debt or the road ends; the log on the receipts module and the card with the galaxy's name.
- **The ground (0.1.1):** the game opens on the crash world, one of coldsnap's own war maps made from the galaxy's seed, and the war on it is coldsnap's whole: its attacker with its brain, its books, and its bell; its guns by its build law on held ground; its drawing and its sound. The hull's modules stand as coldsnap masonry on the ship's own welds, and the weld-stress rule at the arrival speed says which broke; a loose module slides. A module is a 10 m box on a 10.7 m pitch, 250 times the space mass and 6.3 times the length, landed on the line from the depot toward the map's centre with the bridge 26 m out and the hull beyond it; the footprints block coldsnap's grid, so guns, walls, and paths go around them. The war boots without coldsnap's town; the ship flies its own flag, so the ground around it is the player's to build on, held 36 m out from the flag and 9 m more from every gun, coldsnap's own law; the attacker marches on the bridge; the crash gouges the ground 45 m back along the line the ship came in on, 2.5 m deep at the deepest, and fells the trees along it. Each kind wears deadweight's own shape at that scale, the bridge tall, the engine long with its nozzle, the tank low, a strut a beam, the mech bay a hangar dark on its door side, with the demo's glyph and letter on the top face, its station colours, a coupler on every weld that holds, the balance mark on the ground, and a loose module ringed in amber; the drawing is the ark's own file over coldsnap's scene. She is a trooper of her own row with 250 hit points, in a purple jumpsuit with longish brown hair, coldsnap's own man drawn in her dress with the ark's hair over it, a rifle squad of coldsnap's stands guard beside her from the first frame, the opening crash shakes 1,500 kg of scrap loose for the ground's purse, and the hands are riflemen by name; FIX walks her to the nearest loose module and her seconds run down within reach; WALL lays coldsnap's build line by her hands; FIGHT is her sidearm, or the walker when it stands, and the same button reads HOLD to stand her down. At the landing a card says what the crash broke and that the mechanic must fix it; the war stands still until GO. The pane is three lines: the purse and the clock; the hull, her, the walker, the crew; the tap. The hold's scrap is the one purse, ten kilograms to one of coldsnap's; TAKE OFF needs every living module welded to the bridge and hands the purse back; every gun and wall standing then is what the world keeps, abandoned there and standing again on the next landing there; the bridge lost is ABANDON SHIP.
- **The walker (0.1.1, 0.1.2):** coldsnap's own mech at its own scale, 5.4 m, two and a half troopers. It rides in the mech bay, which the starter hull carries, and lies wrecked at the bay's door at the crash until FIX WALKER, shown only while it lies there, sends her to a stand outside its room; a hull without a bay lands without a walker, and a walker down at TAKE OFF is lost until a new bay is bought. Then hers to take through coldsnap's possession door, the stick to walk it, FIRE its gun, HOLD to give it back. The scaled walker of 0.0.111 stays on its bench as a module.
- **The gate:** `node scripts/gate.mjs gravitys-ark`, 38 checks at rolled seeds.

## The extracted modules

Every module in `src/modules/`, the checklist item it serves, and the phase that landed it. Each has a headless gate in `scripts/gate.mjs`. The checklist governs extraction; this list carries the progress, flipped in each landing.

Serving checklist items:

- [x] market — market pools — 0.0.2
- [x] builder — the ship builder — 0.0.3; generalized 0.0.85
- [x] ledger — the conservation ledger — 0.0.4
- [x] weldstress — weld stress — 0.0.5; generalized 0.0.86
- [x] tape — the input tape — 0.0.6
- [x] physics-pb — the position-based physics core — 0.0.7; generalized 0.0.95
- [x] rig — the rig table — 0.0.8; generalized 0.0.96
- [x] solids — plane-set solids — 0.0.9; generalized 0.0.76
- [x] ballistics — the ballistics solver — 0.0.10; generalized 0.0.83
- [x] orders — the fleet order model — 0.0.11
- [x] steering — steering behaviors — 0.0.12
- [x] voxel — voxel destruction — 0.0.13; generalized 0.0.91
- [x] support — support propagation — 0.0.14; generalized 0.0.84
- [x] grapple — the grapple rope — 0.0.15; generalized 0.0.81
- [x] escrow — contracts with escrow — 0.0.37; generalized 0.0.80
- [x] wells — carries the field and predictors the frozen-time-aiming box needs — 0.0.38; generalized 0.0.79
- [x] determinism — the determinism kit — 0.0.59
- [x] contract — the contract pattern — 0.0.60
- [x] badge (with scripts/selftest.mjs) — headless gates and the boot self-test badge — 0.0.61; reads the gate table 0.0.75
- [x] receipts — the receipt log — 0.0.62; generalized 0.0.78
- [x] pagekit — the phone-first page kit — 0.0.63
- [x] describe — the described-world boot door (grown 0.0.72: spec-table overrides and module choices come through the door; the box stays open until module choices reach the loop's seams) — 0.0.64
- [x] registry — the module registry and the standard sockets — 0.0.65; ghosts registered 0.0.75
- [x] manifest (scripts/manifest.mjs) — the import map, kept mechanically — 0.0.66
- [x] envelope laws (mechanism in physics-pb since 0.0.7; laws gated 0.0.67) — mount failure envelopes — 0.0.67
- [x] actuator laws (mechanism in physics-pb since 0.0.7; laws gated 0.0.68) — torque-limited joint actuators — 0.0.68
- [x] telemetry — per-joint load telemetry as an engine output — 0.0.69
- [x] opponent — the non-lethal opponent model — 0.0.70; generalized 0.0.87
- [x] senses — opponent senses and cover reasoning — 0.0.71; generalized 0.0.88
- [x] aim — frozen-time aiming — 0.0.73; generalized 0.0.89
- [x] render2d — the 2-D canvas renderer, with the gravity-warped grid — 0.0.74
- [x] legik — leg inverse kinematics — 0.0.77
- [x] presets — labeled-cheat presets, every relaxed rule named with its measured consequence — 0.0.82
- [x] disc — the 3-D movement disc: order movement in three dimensions with a flat pointer — 0.0.90
- [x] greybox — the greybox part library: stairs, facades, vehicles, figures, at true human scale — 0.0.92
- [x] cues — musical cues folded into the sound engine's vocabulary — 0.0.93
- [x] selection — the selection and feedback layer: brackets, health ramps, order lines, formation links — 0.0.94
- [x] touch — the touch commands: the right mouse button, solved for a phone — 0.0.97
- [x] backdrop — the space backdrop and effects kit: starfield, nebulae, trails, beams, explosion rings — 0.0.98
- [x] gait — the balance controller and the walking planner — 0.0.99
- [x] render3d — the 3-D lit renderer: shadows, baked lamps, sky, finishing pass, edge outlines, instanced debris — 0.0.100 and 0.0.101

Engine housekeeping — depot code moved into module files behind unchanged front doors, no capability added, no checklist item claimed (phases 0.0.40–0.0.57): sight, wind, lists, orient, route, territory, intel, fog, mines, economy, cards, transports, specs, ai, save, accuracy, mapgen. From 0.1.0 those module files hold coldsnap's code at 111b9cb, the import paths the only difference; specs carries five added lines, listed in that phase's plan.

Retired: poolmarket (0.0.36), conserve (0.0.39), shipyard (0.0.52) — second lifts of already-landed capabilities; the first lifts are canonical by ruling. Withdrawn unlanded: squads, buildlines, units, drivers, muster, bell — batch 3 closed at mapgen; the realignment is `docs/plans/the-realignment.md`.

Staying in the depot by ruling, not by miss: tick, state, sim, boot, api — the engine's spine. Staying in the deadweight demo by ruling: the tramp and pirate brains and fracture — shaped lifts that wait on a design sitting.

## Status

The coldsnap engine stands at coldsnap commit `111b9cb`: 48 files at its paths, 24 matching the checkout by hash, 17 front doors whose code sits in modules at the same commit, four carrying listed differences from the 0.1.0 plan and three from the 0.1.2 and 0.1.3 plans, the drawing's scene opened as a door, the war booting without its town, and her dress in the drawing's palette, and the version mark left as it was; `node scripts/gate.mjs api` prints worldHash 1713367543, runHash 2888190349. FROSTLINE plays live at `docs/frostline/`, mid-repair per its audit. The deadweight hangar demo rides in the tree as read-only source. The next extractions come from the checklist's unchecked boxes, harness layer first. The parts page at `docs/parts/` lists every part from coldsnap and deadweight, the ark's own layer, and the story's gaps, with the evidence measured at each landing by `node scripts/parts.mjs`; it is published for acceptance and feedback and named in every landing report.

## License

MIT.
