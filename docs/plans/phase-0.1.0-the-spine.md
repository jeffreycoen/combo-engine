# Phase 0.1.0 — the spine: coldsnap at 111b9cb

Status: LANDED, commit stamped below, 2026-09-09. Bracket: eleven gates at their recorded counts and the spine gate green; the parts build 50 gates, every verdict ok.
<!-- The status word is one of PLANNED, SERVED, APPROVED, DISPATCHED, LANDED, ACCEPTED, RETURNED, moved by the plan-writer at each step; the parts page reads it. At landing this line becomes: Status: LANDED, commit `<hash>`, <date>. Bracket: eleven gates at their recorded counts and the spine gate green; the parts build 50 gates, every verdict ok. Acceptance is recorded per part under a heading "## Acceptance" as "- <part id>: accepted" or "- <part id>: returned, <finding>", on the owner's word. -->

The first phase of the build of GRAVITY'S ARK, frame by frame in the player's order. Frames 1 and 2, the bay and the hold, stand on coldsnap's engine, and nothing of them is built until the engine is current. Coldsnap's taken files come in whole from the local checkout at `/home/batman/coldsnap`, commit `111b9cb`, replacing the copies this tree took at `82b5524`. Head brings the walker's leap with its gas store, piston, aimed nozzles, and braked landing; the jeep on springs; real tanks with hull-borne launch loads, twist and pinch; the order chain, the roster, and the credit trail; and coldsnap's own housekeeping, where the order layer, the placement layer, the harness, the palette, and the styles walked out of the shell into plain files. Fifty-five commits.

Checklist item served: a new box under "From coldsnap (the spine)" in the README, flipped in this landing.

## Lift kind

Two kinds, nothing shaped.

**VERBATIM, 23 files written, 21 kept verbatim.** Each is written from the checkout by `git show` and must match its hash. Fifteen replace copies that were behind head, seven are new here from the recorded take list, and one, `src/ui/theme.js`, is the one file outside that list: the walker's readout imports it, and it is 44 lines of colors and a font with no imports of its own. Five more files already match head and are asserted, not written. Two of the written files, the engine core and the walker, then take the listed substitutions below and end as VERBATIM MATH.

| hash | file |
|---|---|
| 75868333de12796e | src/engine/core.js |
| c18bba4e18c9bec8 | src/engine/mech.js |
| 0174cfe631736591 | src/graphics/renderer.js |
| 46dcaf28c5c679b6 | src/graphics/troopkit.js |
| bee7890c42ad4249 | src/graphics/portrait.js |
| eb5c7216b3dea57e | src/platform/audio.js |
| 9ebf0f7846299bfe | src/depot/bell.js |
| e1c453b452d63aaa | src/depot/boot.js |
| cba986aee7e59bc6 | src/depot/buildlines.js |
| c92e177b6a6fdf65 | src/depot/drivers.js |
| 6a5ccd0bf8d3178f | src/depot/market.js |
| f7f7b52df2deaac5 | src/depot/muster.js |
| 4a3b1a75f3a74811 | src/depot/sim.js |
| 78091ffe7364a63e | src/depot/tick.js |
| 29fb917ad88197c5 | src/depot/units.js |
| b2d6be4ae329ada8 | src/aar/compose.js |
| cf30eba50a8f6f09 | src/depot/hooks.js |
| c775db898a562892 | src/depot/orders.js |
| 767b43a6dce24e25 | src/depot/palette.js |
| 48506941ea78d47f | src/depot/placement.js |
| c7d22018cd578ba5 | src/depot/styles.js |
| 42aab73b71fe824f | src/game/mechReadout.js |
| 1d5a821755afc336 | src/ui/theme.js |

Already at head, asserted: `src/depot/api.js` b9a9ce120ec7c53a, `src/depot/infocards.js` c199e3d3bc1446ff, `src/platform/autosave.js` 16a138aefefb4ea5, `src/platform/keymap.js` b81cc1e4790757bf, `src/platform/storage.js` 1a4bf92a5ea45905.

**VERBATIM MATH, 2 engine files.** The checkout is never written, so the engine's one defect is fixed here as a listed difference. Head's engine numbers every body from a counter at line 160 of core.js that lives as long as the process, and every walker from a second counter at line 519 of mech.js; a world made from a seed knows nothing of either, so the second world booted in a process numbers its bodies from where the first left off. The world hash reads positions, life, projectile count, and time, never ids, so every gate at home is green; but the run record names the enemy's engineers by their member ids, and two boots from one seed in one process hash two runs. Measured on head's engine: two boots of seed 1, ten idle seconds each, one world hash both times, run hashes 3699178626 and 2243315202, the member ids 4411, 4412 against 8826, 8827 the only difference. After the substitutions the counters live on the world, set to one when the world is made; every boot numbers as the first boot of a process does at home. The save writes no counter, restore makes its bodies through the same door, and the pages make a new renderer with every boot, so nothing keyed by id outlives a world. Seven lines, and only these:

1. core.js: the line `let BODY_ID = 1;` is removed.
2. core.js: `export function makeBody(o) {` → `export function makeBody(o, id) {`
3. core.js: `    id: BODY_ID++, kind: o.kind || "prop", …` → `    id, kind: o.kind || "prop", …`
4. core.js, in makeWorld: `bisonId: 0, volleySeq: 1, killCount: 0, seq: 0,` → the same line with `nextId: 1, nextMechId: 1,` appended.
5. core.js, addBody: `const b = makeBody(o);` → `const id = world.nextId || 1; world.nextId = id + 1; const b = makeBody(o, id);`, and its trailing comment says the id and the sequence are both the world's own.
6. mech.js: the line `let MECH_ID = 1;` is removed.
7. mech.js, in buildMech: `id: MECH_ID++,` → `id: mechId,`, with `const mechId = world.nextMechId || 1; world.nextMechId = mechId + 1;` the line above the object.

| hash | file |
|---|---|
| eda9db9bb687307a | src/engine/core.js |
| c9ed940fd02671a7 | src/engine/mech.js |

The law is held by a new gate, spine, `scripts/spine-test.mjs`, six checks at a rolled seed printed first: every world's first body is body 1 and its ids are dense; every world's first walker is walker 1; two boots from one seed in one process hash the same world, the same run, and the same enemy member ids. Hash b3f7781653ee20f0; registered after the parts line of the gate table, gate.mjs at 162dd125f744fff4.

**VERBATIM MATH, 16 module files.** Seventeen depot systems live in modules here behind three-line front doors, and the front doors stay. Sixteen of the module files become head's depot file with two substitutions and nothing else. The substitution rule, applied in this order: every `from "../` becomes `from "../../`; every `from "./` becomes `from "../../depot/`. Applied to the old commit's files, this rule reproduces every one of the sixteen module files in the tree today byte for byte, so the rule is the carve-out's own rule. At head it touches exactly these nineteen lines:

1. fog: `from "../engine/core.js"` → `from "../../engine/core.js"`
2. economy: `from "./territory.js"` → `from "../../depot/territory.js"`
3. accuracy: `from "./state.js"` → `from "../../depot/state.js"`
4. accuracy: `from "./specs.js"` → `from "../../depot/specs.js"`
5. accuracy: `from "../engine/core.js"` → `from "../../engine/core.js"`
6. ai: `from "./specs.js"` → `from "../../depot/specs.js"`
7. cards: `from "./specs.js"` → `from "../../depot/specs.js"`
8. cards: `from "./squads.js"` → `from "../../depot/squads.js"`
9. mapgen: `from "./orient.js"` → `from "../../depot/orient.js"`
10. mapgen: `from "../engine/core.js"` → `from "../../engine/core.js"`
11. mapgen: `from "./specs.js"` → `from "../../depot/specs.js"`
12. mapgen: `from "./route.js"` → `from "../../depot/route.js"`
13. mines: `from "../engine/core.js"` → `from "../../engine/core.js"`
14. save: `from "../engine/core.js"` → `from "../../engine/core.js"`
15. save: `from "../version.js"` → `from "../../version.js"`
16. save: `from "../platform/storage.js"` → `from "../../platform/storage.js"`
17. transports: `from "../engine/core.js"` → `from "../../engine/core.js"`
18. transports: `from "./squads.js"` → `from "../../depot/squads.js"`
19. transports: `from "./specs.js"` → `from "../../depot/specs.js"`

Wind, intel, lists, orient, route, sight, and territory import nothing and change by no line.

| hash | module file |
|---|---|
| f60764cd6483df5b | src/modules/wind/wind.js |
| 5c08b411f0d1485f | src/modules/fog/fog.js |
| ee316b8706b59671 | src/modules/economy/economy.js |
| 0731725c06586b7e | src/modules/accuracy/accuracy.js |
| b5d027f2a2a667ce | src/modules/ai/ai.js |
| d74aa25c44ff4347 | src/modules/cards/cards.js |
| 8936f02ecc57d8a7 | src/modules/intel/intel.js |
| ee7cc67f232122ae | src/modules/lists/lists.js |
| 4b816d55876dd5ff | src/modules/mapgen/mapgen.js |
| 642aec05b3580468 | src/modules/mines/mines.js |
| e87bc2de23c922a3 | src/modules/orient/orient.js |
| f574fb0fac928ac7 | src/modules/route/route.js |
| c5dafa68b6bf357a | src/modules/save/save.js |
| d90820e71978e6c2 | src/modules/sight/sight.js |
| 108120167fb9e258 | src/modules/territory/territory.js |
| 503f020aa501a0a5 | src/modules/transports/transports.js |

**VERBATIM MATH, 3 carried files.** Two depot files and the specs module carry lines this tree added after `82b5524`, and the frostline gate reads them: a per-squad safety, a fire arc, a focus, and a head count in `src/depot/state.js`; the hunter's roster row and the trees-block rule in `src/depot/squads.js`; the hunter's arms row in `src/modules/specs/specs.js`. Each file is head's text, the specs module through the substitution rule above, plus those same lines inserted at anchors that occur once in head. The lines are the tree's own, copied as they stand, except two comment tags reading "(owner)" that are dropped; nothing else differs. The substitutions, by file:

- state.js, five insertions, 56 lines: the safety return after the build-order return; the fire-arc test inside the unit scan; the focus scan before the structure preference, whose opening line becomes `if (!best) if (squad.prefStruct) {`; the chosen-target note after `if (!best) continue;`; and the head count, where `spawnSquadMembers(world, squad)` becomes `spawnSquadMembers(world, squad, n)` looping to `count`, three comment lines above it.
- squads.js, two insertions, 16 lines: the hunter row after the medics row; the trees-block rule before the hull-is-ground comment.
- specs.js module, one insertion, 5 lines: the hunter's arms row after the rifles row.

| hash | file |
|---|---|
| 4a2816b4e8354097 | src/depot/state.js |
| 1ed2ccc987177a77 | src/depot/squads.js |
| 2306ca69c52a1229 | src/modules/specs/specs.js |

**Not taken, by the recorded list.** The screens and their helpers except theme.js, the campaign pipeline, the pre-fork drawing, the frozen demo and its golden gate, and `src/version.js`, which stays as it is. Coldsnap's depot suite stays out for now.

## Decisions inside this plan

- In place, whole, one task. Head's engine and head's depot agree with each other and not with the old copies, so a partial refresh is a mismatched spine. Every game and every gate in this tree runs on head after this landing.
- Two gate checks change, in `scripts/old-master-test.mjs`, because they pin four hashes that are one seed's own output at the old engine and the standing orders forbid such pins: "the world hash with the master in it holds its pin" and "the run hash holds its pin" become the same two hashes compared against a twin boot; "the world pins" in the live-war check becomes a twin run landing the same world. The count stays 21. The gate's seed 1 stays as it is; it is not this phase's subject.
- The engine's two id counters move onto the world, in the lifted copies here, the one listed difference from the checkout in the engine. The first dispatch found the leak: old-master 18 PASS / 3 FAIL, every red check a run hash compared across twin boots in one process. With the counters the world's own, twin boots are twins in every hash; the spine gate holds the law at a rolled seed, and every later refresh carries the seven substituted lines.
- The README's status sentence quotes the api gate's two hashes at seed 1 over 90 seconds. Those move with the engine and are not computable from the checkout; the landing re-records them from its own run, and the report names the old and new numbers as a re-pin.
- The parts source moves `src/ui/theme.js` into the walker's bench group, so the page shows why the file is here.
- No plan document in coldsnap is read or changed. Nothing in the checkout is touched.

## The walk

This phase adds no screen and changes no button, spend, or displayed number. Phone and desktop ship as they are.

- **The two pages that load the depot through api.js**, under `docs/frostline` and `docs/play`, load head's engine, drawing, and systems. The bare `three` import in the renderer resolves through each page's import map, unchanged.
- **The ark's page** under `docs/gravitys-ark` reaches the engine core through the determinism module and nothing else of the spine; its gate is in the build.
- **The parts page.** After the build, 48 files stand at coldsnap's paths: 26 read current; the seventeen front doors, the two carried files, and the two engine files read changed here; the version mark reads behind. The page is republished after the landing.

## Acceptance arithmetic for the phase

Every hash above was computed from the checkout at `111b9cb` and from the three carried files and the two engine files assembled in scratch; the spine gate's hash is its scratch copy's. Every gate count below is the count last recorded in the parts table at commit `313ca84`. The agent's run at landing is the proof; a moved number is a finding.

- The bracket, asserted green in step 1 and again after the lift: combat `ALL PASS` (7 checks); accuracy `11/11`; contract 6; ledger 9; market 8; determinism 5; frostline 63; old-master 21; manifest 3; parts 14; spine, new, 6 at a rolled seed; api prints `seed 1  seconds 90 (10800 steps)  worldHash <W>  runHash <R>` and exits 0, where W and R are 3367709165 and 2717846799 before the lift and the landing's own numbers after it.
- Coldsnap's own gate log at home holds combat 7 PASS and accuracy 11/11 at head; those two scripts are byte-identical here, so the numbers are the same numbers.
- The parts build: `node scripts/parts.mjs --gates all` names 50 gates and every verdict in `docs/parts/parts.json` is ok.
- The fifty-seven hash lines in the task print OK.

## Tasks

- 0.1.0-1 — the spine. → `task-0.1.0-1-the-spine.md`

Suggested model: Sonnet 5 — every step is a copy checked by hash or an edit at an anchor that occurs once; nothing is designed.
