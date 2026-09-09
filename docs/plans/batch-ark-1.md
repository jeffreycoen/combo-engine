# Batch order: GRAVITY'S ARK, the first road

Status: ACTIVE. Written 2026-09-08 on the owner's word to plan and dispatch through the night; the record below fills at each landing.

The game from the design document "GRAVITY'S ARK — Design Document, 2026-09-08": you are a ship; she is a mechanic who can fix anything; a star dies behind you and becomes a black hole that eats the galaxy one world at a time; a gate at the far end is the only way out, broken, and she is the only one who can fix it. Nine frames. This order builds the first road: the space frames end to end with their machinery, then the ground frames, on the engine's landed parts, in the game's own folder, deployed after every landing.

## Rulings from the owner, 2026-09-08

1. Authority for the night: the assistant takes the design document's own proposals as provisional rulings on its OPEN items, marks each PROPOSED, and lands and deploys phase by phase without a word on each. The owner reviews the order, the night log, and the page in the morning; any provisional ruling he overturns is a phase to redo, never a fault in the record.
2. One scale, ground units everywhere: kilograms, metres, seconds, in space and on the ground. The space-hauler numbers that were in demo units are set anew under this rule, stated in the scale table below as PROPOSED.
3. The walker stands at the ruled scale, twice a trooper's height, in this order: a physics phase on the balance controller, with an uncertain end. If it cannot stand by the phase's own arithmetic, the phase records the failure and the walker ships at trooper scale, marked.
4. The pirate's lock and the tramps are written new from the design document's words; the deadweight demo is read only for its numbers.

## The finding that shapes the order

The document marks BUILT what is not in this repository: the landing band, the hands pool, the scrub, the pirate bounty, the crash pose, the Grip and its waves, REPAIR WALKER, WALL and GUN in scrap, the mast, the boss walker, the TAKE OFF condition, the roster by kills, the registry of worlds. Surveyed on 2026-09-08 (the night log, 22:40). Every such item is a PROPOSED law here, built new to the document's own numbers. What this tree does carry, and this order stands on: wells (the field law and the predictors), render2d (the warped grid), market (the pools), escrow (contracts), ledger, builder, weldstress, grapple, tape, determinism, receipts, and on the ground the rig, gait, legik, presets, physics-pb, solids, ballistics, opponent, senses, greybox.

## Provisional rulings, PROPOSED, from the design document

- Her name stays pending; she is "she" in every string. No world or station has a fixed name; every place is a role the seed fills. People have names from the seed, women and men.
- The five factions as proposed: the Authority holds the gate and sets the toll; the Charter holds the markets and hires her out; the Militia holds the fronts and its walker is the boss; the Fitters follow the edge and buy at the gate; the Wreckers are the pirates.
- The storyteller is not in this order. Her rescue on foot, the hands' wants, the floppy line, and the visitor model are not in this order.
- The planets are drawn in their pits: the grid law places each sphere at the depth its well makes.
- The edge is not drawn; it is computed from the hull's engines and fuel against the pull, and shown as the last world a hull can still leave.
- The collapse fires on the second or third takeoff, chosen by the seed; the shell is an impulse on bodies falling off with distance; stations and worlds are not shoved. The star's mass does not change until the collapse, so the pit does not either; only the light does.
- Scrap is one material, counted in kilograms, with a price per kilogram.
- Wages are credits per day of game time, due at each dock. Debt is a number on the respawn screen.
- The log has no voice; one line per event; it is the record the card is built from; it survives closing the game through the page's storage.

## The scale table, PROPOSED, one scale everywhere

- Units: kilograms, metres, seconds, credits.
- The road runs along x. The pit sits at x 0. Worlds sit at x from 20,000 to 200,000 m, y within 30,000 m of the road, eight to twelve of them; the gate 15,000 m past the last world. Lanes join consecutive worlds by x.
- A world: radius 600 to 1,400 m; its own gravity 6 to 14 m/s² at the surface; the wells law is the engine's, mu over (r² + soft²)^1.65, with mu set so the surface pull equals the world's gravity, soft a quarter of the radius. The star: radius 4,000 m, surface pull 30 m/s², at the pit. Bodies fall by the same law.
- The ship: eleven module kinds in 1.6 m boxes on a 1.7 m pitch, welds at 1.2e5 N and 5e4 N at a strut. Masses and prices: bridge 900 kg ¢12,000; engine 1,400 kg ¢9,000, thrust 60,000 N; pod 600 kg ¢4,500, holds 2,000 kg; tank 500 kg ¢3,800, holds 3,000 kg of fuel; shield 1,100 kg ¢11,000; mount 800 kg ¢7,500; strut 150 kg ¢900, weak; rcs 250 kg ¢2,600; rack 550 kg ¢6,500; grapple 400 kg ¢5,200; mech bay 1,800 kg ¢8,000. The starter hull: bridge, engine, tank, pod.
- Fuel is mass. A burn at thrust F for dt spends F × dt / 3,000 kg (the exhaust speed 3,000 m/s). The velocity a hull can still gain is 3,000 × ln(mass with fuel over mass without).
- Landing: LAND within 40 m of a surface under 7.5 m/s; a crash band from 7.5 to 22.5 m/s; death above it. A landing or a takeoff burns the world's escape speed, root of 2 g R, charged to the tank. A crash is a hold: the welds take the arrival speed as a load.
- The hole: from the collapse, the edge grows from the star's radius at 40 m/s through empty space; when it reaches a world's distance, that world is gone and the hole's mu steps up by that world's mu. The schedule is computable from the layout before launch.
- The edge for a hull: the world nearest the pit that the hull can still leave, where leaving needs the world's escape speed plus the work against the hole's pull across the lane to the next world.
- Hands: 80 kg each, ¢650 at the first station's pool, rising 6% per hire; wages ¢40 per day of game time, a day 600 s, due at each dock.
- The Wreckers' lock: a roost; sight 2,700 m; lock 140 m; six seconds to the first shot; the demand is her or the cargo, whichever lists higher; the Authority bounty ¢3,000.
- Scrap price ¢2 per kg at the pools, bent by distance to the pit. A wall costs 300 kg of scrap, a gun 600 kg, nothing within 3.5 m of the bridge; a hull lands with 900 kg; a Grip pays 50.
- The ground numbers, the document's own: the crash pose nose-down 0.35 rad sliding at 0.6 of the arrival speed; the first wave at 8 s from 38 m, four strong; a Grip 80 kg, 58 hp, 2.2 m/s, no guns, clawing 6 hp/s at a module, 2 hp/s at the walker, 12 hp/s at a person, their dead do not rise; REPAIR WALKER in 10 s; REPAIR joins the nearest loose module in 5 s plus 1.5 s per metre slid; two more Grip each wave, every 20 s; the boss walker on the fourth wave from 44 m, 950 hp, standing off at 14 m, firing every 3 s, five seconds down costing it 150; TAKE OFF only when every surviving module is welded; the bridge lost is ABANDON SHIP; the waves never stop. A hand: 58 hp, 3.2 m/s, 14 damage every 1.2 s within 24 m, a 70-damage satchel every 8 s from 5.5 m. Her walker: 900 hp, twice a trooper's height.

## The folder, the page, the deploy

- The game: `src/games/gravitys-ark/`, one file per phase. Its page: `docs/gravitys-ark/index.html` and `docs/gravitys-ark/main.js`, in the shape of `docs/frostline/`, written by the orchestrator at each landing as the page step of the phase.
- The deploy is the push: pages serve the repository root from main. The link is fixed from the first page landing: https://jeffreycoen.github.io/combo-engine/docs/gravitys-ark/
- The gate: `scripts/gravitys-ark-test.mjs`, registered in `scripts/gate.mjs` at the first landing and grown by every phase: the landed checks stay verbatim, only the count line moves. Every check a law at rolled seeds; twin identity replaces pinned numbers.
- Every page step ships for phone and desktop.

## The rules of the run

- Every phase lands in number order: its gate green twice at rolled seeds, the bracket green, the record edits, the commit, the stamp, the push. The page is live at the link after every push that touches it.
- Agents are Sonnet 5, one brief per phase, in worktrees under `/home/batman/combo-wt/`. Agents build headless modules and gate checks; the orchestrator wires the page. A brief fixes every name, number, and law; an agent designs nothing and stops on anything the brief did not foresee, reporting it as a labeled nonconformity.
- Every brief carries the piecewise rule: no single response or tool call over about 150 lines of new text; files are appended piece by piece and parsed after each piece. An agent silent for twenty minutes after its reading with nothing written is stopped, and the orchestrator builds the phase from the brief as the plan-writer's own trial, recorded in the night log.
- No hardwired seeds. No timed simulations beyond a phase's own fixed tick count. Demo files are read only.
- The full self-test runs after 0.0.107 and at the close.
- Words never outrun code: nothing is named, priced, or drawn on the page unless its mechanism exists in the tree.

## Stream S, the space frames

- 0.0.103 galaxy: `galaxy.js`. One seed makes the layout, the worlds with their radius, gravity, climate, ring, holder, and station; the lanes; the gate; the pit; the collapse count; the toll and the repair bill; the name tables. Frame 5's map and frame 3's ring, as data. Gate: twin identity, the layout laws, the contract.
- 0.0.104 road: `road.js`. The ship as a body under the wells law over every world and the star; burns and fuel; LAND, the crash band, TAKE OFF with their charges; the collapse on the seeded takeoff; the hole's growth and steps; worlds gone behind the edge; the edge per hull. Frames 4 and 5, headless. Gate: twin identity, fuel on the ledger, the schedule ahead, the edge order, the crash band.
- 0.0.105 the page: the orchestrator's page step. The galaxy on the warped grid, the worlds in their pits, the ship, the three clocks, LAND, TAKE OFF, and a burn control; a seed in the address. The first deploy.
- 0.0.106 stations: `stations.js`. Pools for scrap, fuel, and modules; the hands pool and the roster with names; wages due at dock; the listings bent toward the pit; the build screen data on the builder; the contract to move people away from the star on escrow. Frame 3. Gate: pools conserve on the ledger, wages, the bias law, twin identity.
- 0.0.107 wrecks: `wrecks.js`. The collapse shell on bodies, welds under it through weldstress, wreck fields falling to the pit, the grappler on wrecks and scrap and modules with the pull both ways, found modules held or installed. Frames 4 and 6. Gate: the falloff law, the break law, mass on the ledger, twin identity. The full self-test follows the landing.
- 0.0.108 price: `price.js`. The Wreckers' lock and demand, pay or outrun, the bounty; the Charter's hire-out on escrow; her price by ring; the listings per faction. Frame 7. Gate: the lock law, the demand law, twin identity.
- 0.0.109 gate and card: `gate.js`, `card.js`. The gate's bill and toll by seed; selling to the Fitters at the gate; passing; death, respawn ahead of the edge with mercy fuel, debt; the log on receipts and the card from it, with the galaxy's name. Frames 8 and 9. Gate: the bill and toll from the seed, the card from the log, twin identity.

## Stream G, the ground frames

- 0.0.110 the hold: `hold.js`. The crash pose, the settlement block, the Grip waves, REPAIR and REPAIR WALKER, WALL and GUN, the mast's arc through ballistics, the boss walker as a unit, TAKE OFF and ABANDON SHIP, headless on a flat field. Frames 1 and 2. Gate: the wave schedule, the claw rates, the repair times, the take-off condition, twin identity.
- 0.0.111 the walker's stance: the physics phase on gait and rig at the ruled scale, from the walker survey's numbers. Gate: the rig stands ten seconds at the ruled scale with zero breaks, or the phase records the failure and the walker ships at trooper scale.

## The dispatch table

| Phase | Stream | File | Depends on |
|---|---|---|---|
| 0.0.103 | S galaxy | galaxy.js | none |
| 0.0.104 | S road | road.js | the galaxy shape, fixed in the brief |
| 0.0.105 | S page | docs/gravitys-ark/ | 0.0.103, 0.0.104 |
| 0.0.106 | S stations | stations.js | 0.0.103 |
| 0.0.107 | S wrecks | wrecks.js | 0.0.104 |
| 0.0.108 | S price | price.js | 0.0.106 |
| 0.0.109 | S gate and card | gate.js, card.js | 0.0.106 |
| 0.0.110 | G hold | hold.js | none |
| 0.0.111 | G walker stance | gait, rig | the walker survey |

## The record

- [x] 0.0.103 galaxy
- [x] 0.0.104 road
- [x] 0.0.105 the page
- [x] 0.0.106 stations
- [x] 0.0.107 wrecks
- [ ] 0.0.108 price
- [ ] 0.0.109 gate and card
- [ ] 0.0.110 the hold
- [ ] 0.0.111 the walker's stance

## Gaps

- Every number in the scale table is a design choice, PROPOSED, until the owner rules or a measurement replaces it.
- The star's stages on the page, the collapse's held shot, and the sound are look and sound: the owner's, at the page.
- The frame rate on a phone with the ground frames is unmeasured.
