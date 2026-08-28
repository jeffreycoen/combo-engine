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
- [ ] Module registry and the standard sockets (tick input, renderer flags, sound events)
- [ ] The module pattern: skeleton, seam definitions, and the module-author's rule sheet
- [ ] The manifest tool: a map of what every file imports from the engine, kept mechanically

### The harness layer (universal — these pay off in every game)

- [ ] Determinism kit: one seeded random stream for the sim, a second for effects, bit-exact state hashing
- [ ] The contract pattern: tables declared as data, checked at boot, every problem reported at once
- [ ] Headless gates and the boot self-test badge: fixed run from a seed, hashes printed, checks shown at start
- [ ] The input tape: every action recorded with its tick, a seed plus the tape replays a run exactly
- [ ] The receipt log: events stated as plain-language numbers
- [ ] The phone-first page kit: touch hardening, safe-area layout, light and dark theme

### From coldsnap (the spine)

- [ ] The war engine core: bodies, terrain, craters, welds, projectiles, the determinism laws
- [ ] The api surface and the roster contract pattern
- [ ] The sound engine and its acoustics reference: spatial model, event vocabulary, continuous beds
- [ ] The renderer

### From the mech demo

- [ ] The position-based physics core (the mech island coldsnap already reserves a hook for)
- [ ] Mount failure envelopes: four load types, one utilization number, honest tearing
- [ ] Torque-limited joint actuators with finite stiffness
- [ ] The rig table: a whole machine as data, mirrored per side, assembled from the table
- [ ] Leg inverse kinematics
- [ ] The balance controller and the walking planner
- [ ] Labeled-cheat presets: every relaxed rule named, with its measured consequence
- [ ] Per-joint load telemetry as an engine output

### From the shooting-range demo

- [ ] The ballistics solver and the material table: drag, wind, ricochet, perforation, embed, energy receipts
- [ ] Plane-set solids: boxes, turned boxes, prisms, one ray routine for all of them
- [ ] Voxel destruction: damage only where hit, bored tunnels, support collapse, rubble that stacks
- [ ] Support propagation: unsupported structure falls; decoration goes with its host
- [ ] The non-lethal opponent model: per-part thresholds, knockdown by impulse, a lethal line that fails the mission
- [ ] Opponent senses and cover reasoning
- [ ] The greybox part library: stairs, facades, vehicles, figures, at true human scale
- [ ] The 3-D lit renderer: shadows, baked lamps, sky, finishing pass, edge outlines, instanced debris

### From the space-hauler demo

- [ ] The conservation ledger: every unit declared at world start, audited to zero drift forever
- [ ] Market pools: prices that move with every trade, players and computer traders in the same pools
- [ ] Contracts with escrow, open races, and expiry
- [ ] The ship builder: parts on a grid, connection ports, derived mass, balance, and turn authority
- [ ] Weld stress with load-based breaking and honest ship splitting
- [ ] The grapple rope: taut constraint, both ends pulled by their masses, yank, snap
- [ ] Frozen-time aiming: stop the sim, show the reach, predict with the sim's own step, commit or cancel
- [ ] The 2-D canvas renderer, with the gravity-warped grid

### From the fleet demo

- [ ] The fleet order model: select, move, attack, guard — orders as data on units
- [ ] The 3-D movement disc: order movement in three dimensions with a flat pointer
- [ ] Steering behaviors: acceleration, capped turning, banking, strafe and guard orbits
- [ ] The selection and feedback layer: brackets, health ramps, order lines, formation links
- [ ] The touch command grammar: the right mouse button, solved for a phone
- [ ] The space backdrop and effects kit: starfield, nebulae, trails, beams, explosion rings
- [ ] Musical cues folded into the sound engine's vocabulary

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

## Status

At the very beginning. The coldsnap extraction is in flight in its own repository. The demos are not in this tree yet. Nothing on the checklist has landed.

## License

MIT.
