# Batch order: the general parts round

The engine is a kit of parts harvested from demos, and any combination of the parts should build a game. Today 9 of the 26 checklist modules combine on plain data, 16 still carry their demo's names and numbers, and 10 checklist boxes are still in the demos. This order runs two streams at once, the second pass over the 16 and the harvest of the 10, and closes with one headless proof that parts from four demos compose. Your approval of this document approves the batch; your word interrupts anywhere.

Phase 0.0.74, the 2-D canvas renderer, is planned and rehearsed and lands first on your word. This order starts at 0.0.75. The boot box stays open by ruling and is not in this order.

## The rulings this order carries

Ruled at the question round:

1. No frame. Parts stay libraries. A game imports the parts it wants and steps them itself, the way FROSTLINE does. The war stays whole. The described-world box and the 0.1.0 mark stay open.
2. Streams run at once. Agents work in worktrees, one phase each. Landings are serialized through the orchestrator in number order.
3. The look-and-sound boxes ride now as modules with headless gates on their laws. Viewing pages come later, with games, judged by your eye then.
4. Continuous approval. Every phase runs trial, plan from the run, rehearsal, dispatch, without a per-plan sitting. Every landing is reported.

Proposed here, approved with this document:

5. Agents write code from a fixed brief. The brief carries every option name, default, contract field, and gate law from this order's phase text. The agent adds no option and no law beyond the brief; anything the brief did not foresee is reported as a nonconformity and the phase stops. The orchestrator reads the diff, runs the bracket, and lands. The rule that the plan-writer builds every trial by hand is suspended for this order only. Without this ruling the streams collapse to one, since one hand builds every trial.
6. The record shape for this order: each phase has a phase document (the template, numbers from the run) and a task document that is the dispatch brief plus the report's gate lines. The diff is git's.
7. Agents never touch the shared files. The gate table, the registry table, the README, the package version, and other phases' documents are the landing's own edits, made in the main tree by the orchestrator.
8. Each second-pass landing appends "; generalized 0.0.N" to the module's line in the README's modules list. Each harvest landing flips its checklist box and adds its modules-list line, as before.

## The generalization law

A part passes the second pass when every line below holds. Numbers ratify each line.

- L1, every dial is an option. Every literal that is a dial becomes an option with the demo's value as its default. Proof: the module run with defaults passes every landed check unchanged, and the same laws pass at a rolled second spec that is not the demo's.
- L2, a contract. A check function returns every problem in one pass. Proof: the gate feeds a broken input and counts the problems.
- L3, tables are handed in, never imported. A module imports only functions from its own folder or a sibling module. Constants and tables cross a module boundary as arguments or options. Proof: the module's import lines, read by the gate.
- L4, no module-level mutable state a caller cannot replace. Scratch records come from a maker and are passed. Where a default scratch record stays for the verbatim callers, it is named as the default and the passed record is the law.
- L5, the landed checks stay. The old gate's checks stay verbatim inside the new gate; only the count line moves. The sweep license covers the count line and nothing else.

A harvest phase passes when its lift kind's own acceptance holds (verbatim math or shaped, as the phase says), its gate holds laws at rolled inputs, and lines L2 through L4 hold from the first landing.

## The rules of the run

- Numbers. Phases carry their phase numbers from the dispatch order below. Dispatch is in number order. Landing is in number order. A finished worktree holds until its predecessor lands. Up to four worktrees are open at once.
- Worktrees. One worktree per phase, branched from main, under /home/batman/combo-wt/. The agent works only there. The worktree is removed at landing.
- What an agent writes. Its module file or files, its gate file, its phase document at status PLANNED with the run's numbers. Nothing else.
- What an agent runs. Its own gate, directly by file for a new gate, through the wrapper for a replaced one. Rolled seeds, printed. No pinned literals. No timed simulations. No full replays.
- What an agent reports. Read-confirmation first, one line of outcome, the gate's seeds, count, and verdict lines verbatim, the diff summary as files and line counts, every nonconformity as its own labeled bullet.
- The landing, in the main tree, by the orchestrator. Rebase the phase onto main. Run the phase's gate and its named bracket. Add the gate-table line for a new gate. Add the registry line for a new module. Flip the README. Bump the version. Commit, push, stamp. Then remove the worktree.
- The bracket. Every landing runs the phase's own gate plus every gate named in its bracket line. The full self-test runs at three points: after the last second-pass landing, after the last harvest landing, after the proof.
- Sizes below are line counts from the surveys, not acceptance numbers. Acceptance numbers come from each phase's run and ride its phase document.
- Models. Agents are Sonnet 5. No Opus. Fable only on your word.
- Demos. Read-only, cited by line, never committed.

## Stream A: the second pass, 16 phases

Each phase names what moves, the contract, the new gate laws, and the bracket. The landed checks stay verbatim in every case.

### A1, registry: the ghosts registered, the self-test made whole

- Moves: three lines join the registry table, telemetry (sample), opponent (consume), senses (sample), each naming its gate. The registry's ghost check turns green. The self-test script stops carrying its own list of gates and reads the gate table's keys from the gate file, so it can never go stale again.
- Gate: registry-test 4 PASS / 1 FAIL becomes 5 PASS / 0 FAIL. badge-test gains one check: the self-test's list equals the gate table's keys.
- Bracket: registry, badge, describe.

### A2, solids: the hit record handed in

- Moves: makeHit() is exported. raySolid and raycastWorld take a record as their last argument, default the exported record. The exported record is named the default scratch. rayBlocked is unchanged.
- Contract: checkSolid(s): planes a float array of n times 4, n at least 4, min and max arrays of 3 finite numbers, mat an integer.
- New laws: two records from makeHit filled by two raycasts do not disturb each other at rolled solids; the default-record path and the passed-record path agree; the contract counts every problem of a broken solid.
- Bracket: solids, ballistics, voxel, support, senses.

### A3, ballistics: the tables handed in

- Moves: the maker takes media (default the demo's table), rounds (default the demo's table), pool (default 64), evCap (default 512), tickHz (default 120), and hit (default the solids record). The index maps M and R are built per instance from the handed tables. fire accepts a round name or an index. The physical constants stay laws: G, V_STOP, MAX_CHORD_AIR, DX_SOLID.
- Contract: checkMedia(table): name a string, rho and cd at least 0, yieldV at least 0, ricochetDeg a number, shatterV at least 0, deformV over 0, areaMult over 0, retain in 0 to 1. checkRounds(table): name a string, mass, dia, and muzzle over 0.
- New laws: at a rolled media table every event's energy out is at most its energy in and every material index is inside the handed table; a rolled rounds table fires by name and the events carry its index; pool 8 recycles the oldest slot on the ninth shot; the contracts count every problem.
- Bracket: ballistics, voxel, support.

### A4, voxel: media and gravity handed in

- Moves: makeVoxWorld takes media (default the ballistics table), gravity (default G), limits (default the VOX table), and hit (default the solids record). Every read of MEDIA, G, and VOX inside the world reads the instance's own.
- Contract: checkPrim(pr): c or cc an array of 3, s an array of 3, m an integer index into the handed media, p an optional string, brk an optional boolean.
- New laws: with rho doubled in a handed table, debris mass and cluster mass double exactly; limits with MAX_DYN 10 cap the debris list at 10; gravity 0 leaves a debris cube's vertical speed unchanged over one step; the contract counts every problem.
- Bracket: voxel, support.

### A5, support: tolerances handed in, the prim declared

- Moves: a tolerances object is the last argument of linkDeco, findUnsupported, primSupported, sweepDeco, and settleWorld, default the demo's numbers: overlap 0.05, rest band 0.22 below and 0.06 above, span 0.02, ground base 0.16, host gap 0.45, passes 24, sweeps 6.
- Contract: checkPrim(pr): c or cc, s, and the optional flags deco, ghost, dead, deb, tgt, down, weld as booleans, host an index or undefined.
- New laws: at a rolled rest band a prim resting at a rolled gap is supported exactly when the gap is inside the band; passes 1 leaves the top of a tall stack floating where the default finds it; the contract counts every problem.
- Bracket: support.

### A6, wells: any number of wells, each with its own softening

- Moves: predStop loops over every well and every ordered pair, reading each well's own soft in place of the literal 9. Two wells with soft 3 give the demo's numbers exactly.
- Contract: checkWell(w): x, y, mu finite, soft over 0, r at least 0.
- New laws: at rolled two-well fixtures with soft 3 the new predStop equals the two-well formula carried in the gate as the reference; three wells give a finite answer or null; one well pulls no pair; the contract counts every problem.
- Bracket: wells, aim, describe.

### A7, aim: the names handed in

- Moves: the maker takes skip (a predicate over a body, default the demo's own: own equals ship, or kind head, slug, missile), minRange (default 3), and armAction (default "aim"). Every commit name already lives in the kinds table.
- Contract: checkKinds(table): cone, reach, V0, life numbers or null, thrust and thrustFuel at least 0, maxRange a number or null, commitKind a string.
- New laws: a rolled arm action name comes back from arm and cancel; a handed skip predicate filters a rolled body set exactly; the contract counts every problem.
- Bracket: aim.

### A8, escrow: the prices as dials

- Moves: makeBook takes dials, default the demo's: margin 1.55, base 120, floor 200, rescue base 600, rescue cut 0.3, part term 120, rescue term 150, cool 30, scan every 60. Every function reads the book's dials.
- Contract: checkStations(stations): credits at least 0, cool a number, every part row q and c integers.
- New laws: at rolled dials the posted pay is ceil(spot times margin plus base) capped by the treasury and refused under the floor; a rolled term expires exactly at the term and returns the escrow; credits conserve through every path at rolled dials; the contract counts every problem.
- Bracket: escrow.

### A9, grapple: the constants as dials

- Moves: the fifteen constants become one exported dials object, GRAP, and every function takes a dials argument last, default GRAP.
- Contract: checkShip(s): x, y, vx, vy, w finite, M and I over 0. checkTarget(t): x, y, vx, vy finite.
- New laws: at a rolled snap threshold a jerk over it snaps and one under it holds; a rolled reel rate shortens the rest length by rate times dt to the rolled floor; the contracts count every problem.
- Bracket: grapple, old-master.

### A10, builder: roles as data

- Moves: a spec row may carry role, one of bridge, engine, tank, rcs, or any other word; a row without one takes its key when the key is one of the four. derive reads the role, never the key.
- Contract: the row contract gains role, an optional string.
- New laws: a rolled spec whose engine part is keyed thruster with role engine derives the same thrust and torque as the demo-keyed spec; the contract counts a bad role.
- Bracket: builder, weldstress.

### A11, weldstress: the load factor as an argument

- Moves: weldLoads and ratedLimits take a factor argument, default 9.
- Contract: checkWelds(ws): a and b indices, strength over 0.
- New laws: a rolled factor scales every load by factor over 9 against the default exactly; the contract counts every problem.
- Bracket: weldstress.

### A12, physics-pb: the ground as an option, a maker for the world

- Moves: the world takes groundY, default 0, and ground contacts read it in the margin test and the depth. makeWorld(opts) is exported beside the class. Nothing else in the solver moves.
- Contract: checkBody(o): mass over 0 unless kinematic, inertia nine finite numbers when given.
- New laws: at a rolled groundY a dropped box comes to rest with its lowest corner at groundY within tolerance; the energy law of the landed gate holds at a rolled groundY; the contract counts every problem.
- Bracket: physics-pb, rig, telemetry, envelope, actuator.

### A13, rig: the machine as data

- Moves: the limb chain becomes data, spec.limbChain, rows with lateral offsets marked to flip per side; the demo's chain rides MECH_SPEC verbatim as the default. The overrides name their links: footLinks, hipLinks, pairs, with the MK1 names as defaults.
- Contract: checkRigSpec(spec): links rows with mass over 0, dim three numbers, parent an existing link or the root; limbs rows; limbChain rows with name, parent, mass, dim, type hinge or weld, axis, jp, jc.
- New laws: a rolled spec with renamed links and the demo's dimensions assembles with the same body count and total mass as the default; twin assembly identity at the default; the contract counts every problem.
- Bracket: rig, telemetry.

### A14, opponent: the part table as data

- Moves: makeOpponent(opts) returns hitAgent and makeAgentState bound to opts.parts (default the demo's table), opts.dials (default the demo's numbers), and opts.sedative (default the list ["tranq_dart"]). The flat exports stay as the defaults.
- Contract: checkParts(table): drop over 0, carry in 0 to 1, lethalE over 0, label a string.
- New laws: at a rolled part table a round over the handed lethal energy kills and one under it adds impulse over drop times carry to the stun exactly; a rolled sedative round name sedates; the contract counts every problem.
- Bracket: opponent, senses.

### A15, senses: the view as dials

- Moves: canSee and coverSolid take a dials argument last, default the opponent module's numbers: view range, view angle, eye height 0.35, eye clearance 0.45, chest offset 0.32.
- Contract: checkAgentBody(a): body with c or cc, fx and fz finite.
- New laws: at rolled view dials a point just inside the range and cone is seen and one just outside is not; the contract counts every problem.
- Bracket: senses.

### A16, receipts: the line table handed in

- Moves: LINES is exported; receipt and receiptLog take a lines table last, default LINES.
- Contract: checkLines(table): every value a function.
- New laws: a rolled line table renders a rolled event type through the handed function; an unknown type still gets the generic line; the contract counts every problem.
- Bracket: receipts.

## Stream B: the harvest, 10 boxes in 11 phases

Anchors are from the three surveys, spot-checked against the demo text. Each phase names its box, its source lines, its lift kind, what carries, what is new, the contract, the gate laws, the seam, the size, and the bracket. No page ships in any phase; look is judged later.

### B1, legik: leg inverse kinematics

- Box: "Leg inverse kinematics". Source: mech demo lines 791 to 857 (LEG 807, legIK 813 to 846, legFK 849 to 857).
- Kind: VERBATIM MATH. Substitutions, and only these: the LEG table becomes opts.legs with the demo's values (thigh 1.50, shin 1.45); maxExtend stays a default of 0.995; export added. legFK carries as the verifier the demo names it.
- Contract: checkLegs(legs): thigh and shin over 0, maxExtend in 0 to 1.
- Laws: legFK of legIK returns the target within 1e-9 at rolled reachable targets; an unreachable target clamps to maxExtend times the leg's reach; a rolled leg table moves that reach exactly; twin identity; the contract counts every problem.
- Seam: consume. Size: 67 lines. Bracket: legik.

### B2, presets: the labeled cheats

- Box: "Labeled-cheat presets: every relaxed rule named, with its measured consequence". Source: mech demo lines 1664 to 1693 (PRESETS 1664 to 1680, applyPreset 1684 to 1693), plus the fallback defaults at 1722 to 1731 (gravity 9.81, friction 1.0, copClamp 0.45, swing 0.90).
- Kind: VERBATIM MATH. The six presets carry as data, each with its label, its dials, its rule (the relaxed rule the demo names), and its consequence (the measured text the demo states). applyPreset carries verbatim, m3inv imported from physics-pb. New: resolvePreset fills omitted fields from the demo's fallbacks.
- Contract: checkPreset(p): every multiplier over 0; rule and consequence non-empty strings for every preset but verified.
- Laws: at a rolled multiplier set every hinge's tauMax, kp, kd, and limits and every body's inertia scale exactly as the demo's function states, with invI the inverse of the scaled inertia; the verified preset changes nothing; every preset names its rule and its consequence; twin identity; the contract counts every problem.
- Seam: consume. Size: about 60 lines. Bracket: presets, physics-pb, rig.

### B3, gait: the balance controller and the walking planner

- Box: "The balance controller and the walking planner". Source: mech demo lines 1065 to 1658 (posture 1065 to 1112, balance 1114 to 1272, dcm 1274 to 1393, gait 1395 to 1658).
- Kind: SHAPED. The law carried whole: every control formula, every dial, and the four classes. Substitutions, numbered, and only these: (1) the module-level gravity and setGravity become opts.gravity on the controllers, default 9.81; (2) groundTruthState drops its unused world argument; (3) Posture's dead buildLinkTable call is dropped; (4) legIK is imported from the legik module; (5) the copOverride back-channel stays as the module's own, between the two classes it owns.
- Contract: checkGaitDials(k): every field a finite number; the stance angles numbers.
- Laws, single calls only, no walking: Posture.apply at a rolled pelvis and feet writes hinge targets equal to legIK's angles; BalanceController.update on a synthetic support state writes every feed-forward torque inside plus or minus tauMax and the stance targets, and writes nothing when support is null; buildPhases at rolled dials yields phases whose durations sum as the law says and whose kinds alternate; the plan's divergent-motion value is continuous at every phase boundary within tolerance; buildPlan at a rolled stride spaces footholds by the stride and keeps lateral separation at least minFootSep; twin identity of one update call on twin rigs; the contract counts every problem.
- Seam: tick. Size: about 600 lines, the largest control lift. Bracket: gait, legik, physics-pb, rig, telemetry.

### B4, greybox: the part library

- Box: "The greybox part library: stairs, facades, vehicles, figures, at true human scale". Source: range demo line 445 (HUMAN), 447 to 454 (ngon), 507 to 724 (the thirteen builders), 1202 to 1217 (buildSolids).
- Kind: VERBATIM MATH. Substitutions, and only these: HUMAN becomes the maker's human table with the demo's seven numbers as defaults; buildSolids takes the part list and the material map as arguments in place of the page's level and M; export added.
- Contract: checkHuman(h): seven numbers over 0. checkPart(pr): id, c and s arrays of 3, p a string, m an integer.
- Laws: at rolled step counts a stair rises steps times step and runs steps times tread; at rolled floors a building is floors times floor tall; a door frame is door tall and its leaf door minus 0.10; the figure's head top is 1.84 at the default scale; a rolled human table moves those heights exactly; buildSolids turns a rolled part list into as many solids as parts with matching min and max; twin identity; the contracts count every problem.
- Seam: sample. Size: about 250 lines. Bracket: greybox, solids.

### B5, render3d, first half: the law

- Box: "The 3-D lit renderer" (first of two phases; the box flips at B6). Source: range demo 456 to 503 (prism and wedge meshes), 956 to 1043 (the mesh helpers), 1045 to 1046 (emissive and wetness tables), 1048 to 1093 (buildMesh), 1097 to 1137 (the patch-split math), 1169 to 1200 (bakeLampLight), 1219 to 1268 (the matrix math), 1270 to 1474 and 2154 to 2164 (shader text), 2599 to 2606 (post dials, sky sets), 2635, 2638, 2641, 3705 (dials), 2670 to 2711 (collectLamps, packLights), 2819 to 2827 (projPx), 3280 to 3296 (cubeGeom), 3816 to 3827 (lightMatrix), and the instance packing 2070 to 2152 and 2436 to 2455 that the voxel lift left behind.
- Kind: VERBATIM MATH inside a SHAPED lift. The math carries exactly; the page globals it read (palette, camera, light, level, the voxel world) become arguments. The demo has no three.js; nothing here draws.
- Contract: checkPalette(p): every named colour three numbers.
- Laws: buildMesh of one box yields 12 triangles and 12 edge quads and a deterministic panel tint at rolled boxes; bakeLampLight lights nothing behind a wall and lights a face in the open; the view matrix times its inverse is identity within tolerance and a point on the near plane maps to the near depth; packLights picks the four nearest lamps at rolled lamp sets; cubeGeom is 36 vertices; instance packing counts equal live cells, debris, and cluster cells at a rolled voxel world; lightMatrix at a rolled camera and light is orthographic with the stated half-width; the shader text carries every uniform the draw half binds; twin identity; the contract counts every problem.
- Seam: sample. Size: about 600 lines. Bracket: render3d, solids, voxel.

### B6, render3d, second half: the draw

- Box: "The 3-D lit renderer" flips here. Source: range demo 1476 to 1488 (compile), 2654 to 2668 (buffers), 2713 to 2725 (flashes), 2727 to 2817 (static, added, dynamic rebuilds and patches), 3298 to 3330 (instanced draw), 3706 to 3814 (targets, post pass), 3829 to 3874 (shadow pass), 3876 to 3928 (draw sets), the draw part of frame 3582 to 3701, the renderer part of init 3941 to 4017.
- Kind: SHAPED. The law carried: the pass order (sky, shadow, static, added, dynamic, instanced, post), the shadow map and its bias and filter, the four-light budget, the outline pass, the post chain (bloom, rays, anti-aliasing, tonemap, vignette, grain). New: one surface from makeRender3d({ gl, palette, dials }) with setLevel, setVoxels, setCamera, setLight, resize, and frame(t); every page global becomes a field of the surface; no DOM, no clocks, no frame scheduling.
- Contract: checkRenderDials(d): every dial a finite number, the palette index in range.
- Laws, on a recording stub context, the way the 2-D renderer's gate works: init compiles the listed programs and builds the shadow and post targets; one frame issues the passes in the stated order with draw-call counts equal to the sets present; twin frames on twin stubs record identical call logs; the outline branch draws when its dial is on and not when off; the contract counts every problem. Look is judged at a page later, by ruling.
- Seam: draw. Size: about 900 lines, the largest phase. Bracket: render3d.

### B7, disc: the 3-D movement disc

- Box: "The 3-D movement disc: order movement in three dimensions with a flat pointer". Source: fleet demo line 880 (the ground hit), 1131 (mouse altitude), 1171 (touch altitude), 1092 to 1093 (show, hide), 1135 (confirm). The meshes and the pulse (827 to 838, 1662 to 1663) stay out.
- Kind: SHAPED. The law carried: the ray-plane hit; the altitude change as dy times the source's gain, 0.25 mouse and 0.3 touch, clamped to plus or minus 40; auto-hide 600 ms; long press 500 ms opens. New: makeDisc(opts) with open, drag, point, close, and groundHit(origin, dir, planeY).
- Contract: checkDiscOpts(o): gains and clamp over 0, timings over 0.
- Laws: at rolled drags the altitude is the clamped sum of dy times the source's gain; groundHit's point lies on the plane and on the ray at rolled rays, and a ray parallel to the plane gives null; twin identity; the contract counts every problem.
- Seam: consume. Size: about 60 lines. Bracket: disc.

### B8, selection: the selection and feedback layer

- Box: "The selection and feedback layer: brackets, health ramps, order lines, formation links". Source: fleet demo 815 to 825 (the mothership bracket), 934 to 968 (rings, bars, brackets), 1084 to 1090 (select), 1130 (box drag), 1138 to 1139 (box select, the follow window), 1529 to 1543 (bar opacities and the health ramp), 1668 to 1710 (order lines and markers), 1712 to 1724 (formation links).
- Kind: SHAPED. The law carried: bracket size scale times 2.2 and arm 0.4 of that; the bar 3 by 0.15 at 2.5 scales up; the ramp with its branch at 0.5 and the demo's two colour formulas; order-line colours by verb, dash 1.5, gap 1; the marker ring; formation links as consecutive pairs of the selection list; box drag 5 px; the follow window 400 ms. New: makeSelection(opts) keeping its own ordered list, isEnemy handed in as a predicate, and frame(units, scaleOf) returning plain drawing data for any renderer.
- Contract: checkSelectionOpts(o): sizes over 0, the threshold in 0 to 1, colours three numbers each.
- Laws: bracket size and arm exact at rolled scales; the ramp's two branches meet at 0.5 and each is monotone; links are exactly n minus 1 consecutive pairs; box select at rolled rectangles over projected points; the follow window at rolled click times; twin identity; the contract counts every problem.
- Seam: sample. Size: about 130 lines. Bracket: selection, orders.

### B9, grammar: the touch command grammar

- Box: "The touch command grammar: the right mouse button, solved for a phone". Source: fleet demo 153 (the mobile flag), 1097 to 1127 (mouse down), 1128 to 1132 (mouse move), 1133 to 1142 (mouse up), 1143 to 1147 (wheel), 1148 to 1162 (keys), 1170 to 1196 (touch).
- Kind: SHAPED. The law carried as an input classifier: events in (down, move, up, wheel, key, touch start, move, end, with positions, buttons, times, and what the page found under the pointer: ground point, own unit, enemy unit) and intents out (select, toggle, box start, drag, end, order move, attack, guard, open disc, drag altitude, orbit, pan, zoom, follow, the key commands). Dials, the demo's: long press 500 ms, double tap 350 ms, box drag 5 px, orbit 0.005 mouse and 0.006 touch, pan 0.12 and 0.15, wheel 0.08 clamped 15 to 500, follow wheel 0.04 clamped 8 to 60, pinch clamped 15 to 500, pitch clamped 0.15 to 1.5, follow double click 400 ms. No DOM: the page binds events and hands them in.
- Contract: checkGrammarDials(d): every timing and threshold over 0, every clamp a low under a high.
- Laws, scripted sequences at rolled timings: a press held past the long-press dial opens the disc and one under it selects; two taps inside the double-tap window follow and outside it do not; a drag past the box dial boxes and under it clicks; the right button on an enemy orders attack, on a friend guard, on ground move; pinch and wheel zoom stay inside their clamps; pitch stays inside its clamp; twin identity; the contract counts every problem.
- Seam: consume. Size: about 150 lines. Bracket: grammar, disc.

### B10, backdrop: the space backdrop and effects kit

- Box: "The space backdrop and effects kit: starfield, nebulae, trails, beams, explosion rings". Source: fleet demo 653 to 681 (stars), 683 to 753 (nebulae), 755 to 782 (the core glow), 784 to 789 (dust), 561 to 599 (trails), 1047 to 1069 (explosions), 1559 to 1607 (beam flicker and particles), 1650 to 1659 (rings), 524 to 558 (the bloom weights, as data).
- Kind: SHAPED. The law carried: every count, range, and lifetime formula. New: generation on a handed seeded stream (the determinism kit's effects stream) in place of the demo's unseeded random, a named difference; counts by a mobile flag; every range a dial; effects laws as pure functions; drawing stays out.
- Contract: checkBackdropOpts(o): counts integers at least 0, every range a low under a high.
- Laws: twin identity at a rolled seed; counts exact per flag (2500 or 5000 stars, 20 or 42 nebulae, 250 or 600 dust); star radius in 300 to 1000 and size in 0.3 to 2.3; nebula alpha in 0.06 to 0.20; the ring law at rolled life (scale 1 plus (1 minus life) times size times 14, opacity life times 0.6, decay dt times 0.3); the trail ramp monotone in life; beam particles min(6, floor(length over 4)); the contract counts every problem.
- Seam: sample. Size: about 220 lines. Bracket: backdrop, determinism.

### B11, cues: musical cues as vocabulary

- Box: "Musical cues folded into the sound engine's vocabulary". Source: fleet demo 51 to 151 (init 53 to 138, the twelve triggers 139 to 150) and the call sites the survey lists.
- Kind: SHAPED. The law carried: the twelve cues as data, each a list of note events (notes, duration, offset) exactly as the demo plays them, and the voices as data (oscillator, envelope, filter, gain). New: cueFor(event, t0, table) returns the timed note events for any sound engine; no sound library. The buildDone cue is recorded as defined and never called. The hookup into the coldsnap sound engine is its own later ruling.
- Contract: checkCues(table): notes strings, durations strings or numbers, offsets non-decreasing within a cue.
- Laws: every cue's notes and offsets equal the table's; offsets never run backward; an unknown event gives an empty list; a rolled table is read through; twin identity; the contract counts every problem.
- Seam: consume. Size: about 90 lines. Bracket: cues.

## The proof phase: the yard

One headless gate wires parts from four demos by hand, the way a game would, and proves they compose on plain data. No page.

- Fleet units from orders and steering fly a seeded course over a floor of greybox parts turned into solids.
- Each tick a unit in range fires a ballistics round at a target solid, through a handed media table.
- A hit carves the target through voxel and settles the pile through support.
- A ledger declares the rounds at world start and audits fired plus live plus spent to zero drift every tick.
- Every order records to a tape at its tick.
- Laws: twin-run identity of the state hash; replay from seed plus tape reproduces the hash; the ledger audits to zero at every tick; a rolled media table changes the outcome while every law still holds.
- Bracket: the yard, and the full self-test.

## The dispatch order and numbers

| Phase | Name | Stream | Size | After |
|---|---|---|---|---|
| 0.0.75 | A1 registry | second pass | tiny | 0.0.74 |
| 0.0.76 | A2 solids | second pass | small | |
| 0.0.77 | B1 legik | harvest | small | |
| 0.0.78 | A16 receipts | second pass | tiny | |
| 0.0.79 | A6 wells | second pass | small | |
| 0.0.80 | A8 escrow | second pass | small | |
| 0.0.81 | A9 grapple | second pass | small | |
| 0.0.82 | B2 presets | harvest | small | |
| 0.0.83 | A3 ballistics | second pass | medium | 0.0.76 |
| 0.0.84 | A5 support | second pass | small | |
| 0.0.85 | A10 builder | second pass | small | |
| 0.0.86 | A11 weldstress | second pass | small | |
| 0.0.87 | A14 opponent | second pass | small | |
| 0.0.88 | A15 senses | second pass | small | |
| 0.0.89 | A7 aim | second pass | small | |
| 0.0.90 | B7 disc | harvest | small | |
| 0.0.91 | A4 voxel | second pass | medium | 0.0.83 |
| 0.0.92 | B4 greybox | harvest | medium | |
| 0.0.93 | B11 cues | harvest | small | |
| 0.0.94 | B8 selection | harvest | small | |
| 0.0.95 | A12 physics-pb | second pass | medium | |
| 0.0.96 | A13 rig | second pass | medium | |
| 0.0.97 | B9 grammar | harvest | medium | 0.0.90 |
| 0.0.98 | B10 backdrop | harvest | medium | |
| 0.0.99 | B3 gait | harvest | large | 0.0.77 |
| 0.0.100 | B5 render3d law | harvest | large | 0.0.91 |
| 0.0.101 | B6 render3d draw | harvest | large | 0.0.100 |
| 0.0.102 | the yard | proof | medium | every phase above |

The full self-test runs after 0.0.96, after 0.0.101, and after 0.0.102.

## The record

- [x] 0.0.75 registry
- [x] 0.0.76 solids
- [x] 0.0.77 legik
- [x] 0.0.78 receipts
- [x] 0.0.79 wells
- [x] 0.0.80 escrow
- [x] 0.0.81 grapple
- [x] 0.0.82 presets
- [x] 0.0.83 ballistics
- [x] 0.0.84 support
- [x] 0.0.85 builder
- [x] 0.0.86 weldstress
- [x] 0.0.87 opponent
- [x] 0.0.88 senses
- [ ] 0.0.89 aim
- [ ] 0.0.90 disc
- [ ] 0.0.91 voxel
- [ ] 0.0.92 greybox
- [ ] 0.0.93 cues
- [ ] 0.0.94 selection
- [ ] 0.0.95 physics-pb
- [ ] 0.0.96 rig
- [ ] 0.0.97 grammar
- [ ] 0.0.98 backdrop
- [ ] 0.0.99 gait
- [ ] 0.0.100 render3d law
- [ ] 0.0.101 render3d draw
- [ ] 0.0.102 the yard

## Gaps, said plainly

- No frame, by ruling. A game is not data. The 0.1.0 mark stays open.
- The war stays whole. Its organs stay bound to it.
- No CI exists. The self-test is the suite and this order runs it at three points.
- Solids keeps a default scratch record for the verbatim callers. The passed record is the law.
- The physics ground is a level height, not a field. A height field is its own phase later.
- The 3-D renderer is raw WebGL and cannot be seen headlessly. Its gate proves the mechanism on a recording stub; the look waits for a page.
- The cue voices are data. Playing them through the coldsnap sound engine is a later ruling.
- The grammar's hit tests stay page-side; the page tells the grammar what was under the pointer.
- The backdrop's random becomes seeded. The demo's sky was different on every load; the module's is the seed's.
