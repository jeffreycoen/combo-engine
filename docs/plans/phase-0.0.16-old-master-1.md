# Phase 0.0.16 — OLD MASTER OM-1: the page and the walk

Status: LANDED, commit `6c7ffb2`, 2026-08-28. Gate: 9 PASS / 0 FAIL; prior gates unmoved.
<!-- At landing this line becomes: Status: LANDED, commit `<hash>`, <date>. Gate: 9 PASS / 0 FAIL; prior gates unmoved. -->

The first playable of the game planned in `docs/plans/game-old-master.md` (pitch: `docs/old-master-pitch.md`). One new body — the master — stands in the live coldsnap war, walks on keys or a touch stick, and the war's own renderer rides it as the camera focus. The page deploys to GitHub Pages so the owner can play the landing. No powers yet; OM-2 brings GRIP.

This phase also settles the plan's pending proposals the way its leans pointed: game phases continue the engine numbering (this is 0.0.16); the game lives at `src/games/old-master/`; Pages serves the repository root from main, so the engine's modules are reachable by relative path with no build step and no copy drift; the three library alone is vendored (a byte-pinned copy of the repository's own `node_modules/three/build/three.module.js`, r0.128.0 — `node_modules` is not in git, so the page needs its one dependency beside it); no franchise names anywhere.

## Lift kind

SHAPED — new game code on the landed api, no demo source:

- The hero is a unit-kind body added through the engine's own `addBody`; the engine owns gravity, ground, contacts, and everything that can hurt it. The walk is one law: the stick names a desired velocity, the legs chase it at a fixed acceleration, the sim is stepped BEFORE `tickWar` each tick so a no-input run is bit-stable and a taped stick stream replays exactly.
- The page boots `bootWar({seed: 1})`, spawns the master at (0, 20), and runs the fixed 120 Hz accumulator loop; the renderer's focus argument is the master's position — the camera rides the body the way it already rides any possessed unit. Keys (arrows or WASD) and one floating touch stick, both rotated through the renderer's own camera basis so stick-up walks away from the camera. Phone and desktop, per the standing law.

## Acceptance arithmetic for the phase

Every number below was produced by running the exact planned code at plan-writing time (trial in the session scratchpad, symlinked against the live engine).

- `node scripts/gate.mjs old-master` prints 9 PASS lines, then `old-master-test: 9 PASS / 0 FAIL`, then `old-master-test PASS`, exit 0.
- Load-bearing knowns inside the checks, seed 1:
  - the master spawns on the ground at (0, 20), team 1, 200 hp, marked `omHero`; the spawn adds exactly one body;
  - ten idle seconds in the live war: alive, near the ground, and the whole world pins — worldHash `3344951042`, runHash `997895256`;
  - two boots from seed 1 land bit-identical worlds and master positions;
  - two seconds of full stick carry the master east at walking pace (6 m/s law, 60–120% of the ideal run against live terrain and contacts); releasing the stick stops him under 1 m/s.
- File identity, proven at trial: `src/games/old-master/hero.js` `e25f8cd0b7f926f34f657c37fd56abbda7e5e937fcd943a807e7387b866fc592` (2180 B); `scripts/old-master-test.mjs` `b5f0e32556943de9796835fe6206826e964a2b889e285e401f835d6dc720bd72` (3532 B); `docs/play/index.html` `06e5bd7c639992e9feeccd0a986242dc00f67476dad3b0f6fd33c2198fc7c5ae` (1367 B); `docs/play/main.js` `b70a16a300e2c9f2574b4b5519b247937d01d7cfc6668715df341775c3d23673` (3212 B); vendored `docs/play/three.module.js` `af527c374b56b8688737a42d7fcea7cb8aaeb57a4e3c6da98b4dffd55bcc3514` (1140878 B, copied never retyped).
- All seventeen prior gates unmoved, tails as re-run at plan-writing time: api `seed 1  seconds 90 (10800 steps)  worldHash 3367709165  runHash 2717846799` · combat `ALL PASS` · accuracy `11/11` · market, builder, ledger, weldstress, tape, physics-pb, rig, solids, ballistics, orders, steering, voxel, support, grapple — each `<name>-test PASS`.
- The browser page is proven to syntax and to byte identity; it cannot be machine-played here. The deployed page on phone and desktop is the owner's acceptance, stated as such in the task.

## Deploy

The landing pushes `docs/play/` to main and attempts to enable GitHub Pages on the repository root via the command line; if the setting needs a hand, the task reports it plainly and the owner flips it once. The page: `https://jeffreycoen.github.io/combo-engine/docs/play/`. Every later OM phase redeploys the same address at its landing — the owner plays every phase.

## Tasks

- 0.0.16-1 — hero module, gate, page, vendored three, deploy, records. → `task-0.0.16-1-old-master.md`

Suggested model: Sonnet 5 — every authored file's full content is in the plan; the one large file is a pinned copy.
