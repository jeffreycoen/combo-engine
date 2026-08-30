# Phase 0.0.18 — FROSTLINE FL-1: the mission and the turns

Status: LANDED, commit `77a3717`, 2026-08-30. Gate: 16 PASS / 0 FAIL; prior gates unmoved.
<!-- At landing this line becomes: Status: LANDED, commit `<hash>`, <date>. Gate: 16 PASS / 0 FAIL; prior gates unmoved. -->

The first playable of `docs/plans/game-frostline.md`, built to the ruled design: MISSION_R1, REACH THE FAR SIDE. Rifles, gunners, and the sniper pair start by the town and must put someone through the western exit; a four-man enemy patrol blocks the ground — and marches east on its own law, so the block presses. Free time until first sighting; alternating turns from then on, three action points a squad, one point per confirmed order, moves capped in distance; every action — move included — prices itself in a confirmation carrying the cover shield and the chance-to-hit. Won on arrival with anyone alive; lost with the side wiped. Deploys to `docs/frostline/`.

## Lift kind

SHAPED — new game code on engine surfaces already in the tree, no demo source:

- **Turns over a continuous sim:** the player's half runs with the enemy held by the engine's own dummy switch; the enemy half runs while the player's squads hold; free time is the same loop before first contact. The turn machine is pure state; the page drives ticks.
- **Cover is geometry:** the same solids and terrain the live rounds fly through, read at three silhouette heights with an exact segment-against-box test (the trial's own finding: point samples 1.15 m apart stepped clean over a 0.4 m wall — exactness is load-bearing) over the live body list (the engine's typed solid pool is a boot-time cache).
- **The hit number is an estimate, not a rule:** the engine's own scatter arithmetic (range, elevation, grazing cover, bracing) makes the cone; silhouette exposure scales it; clamped to [0.02, 0.98]. The rounds stay physical.
- **The gate pins worldHash and mission facts, never runHash** (module-global body ids pollute the run bag across boots in one process while the sim stays bit-identical).
- Labeled provisional dials, moved on playtest word: move cap 22 m, player-half cap 8 s, enemy half 6 s, mission positions.

## Acceptance arithmetic for the phase

Every number below was produced by running the exact planned code at plan-writing time; the mission was crossed headless under the full turn loop and the page smoked in a real browser.

- `node scripts/gate.mjs frostline` prints 16 PASS lines, then `frostline-test: 16 PASS / 0 FAIL`, then `frostline-test PASS`, exit 0.
- Load-bearing knowns, seed 3:
  - boot: three squads, eight friendlies, four blockers, worldHash `230891517`; the sight map has seen no one;
  - the turn machine pure: three points a squad, a dry pool refuses, the 22 m cap lands a 100 m ask on the cap along the same line, the halves cycle and refill;
  - cover: open ground open, a chest-high wall half with exposure exactly one third (the head shows), a tall wall full at zero;
  - the estimate orders itself: open beats the low wall beats the tall wall, near beats far, everything inside [0.02, 0.98];
  - free time ends at first sight: contact at tick 835 exactly;
  - the scripted crossing wins on turn 3 at tick 4195, seven of eight standing, end-state worldHash `1467228477`;
  - twin missions land bit-identical worlds on the id-free hash.
- File identity, proven at trial (full values in the task document): mission 2273 B, command 2167 B, pause 1955 B, turns 3114 B, cover 5317 B, gate 7468 B, page 3824 + 10376 B, vendored three 1140878 B by copy.
- Browser smoke: the town renders on the tactical camera with the squads and their action-point dots on the chips, the action bar and turn banner live — in the trial's unattended run the patrol made contact and the banner froze time on its own. The landing repeats the smoke and the HUD assert mechanically.
- All eighteen prior gates unmoved, tails as re-run at plan-writing time.

## Deploy

The landing push publishes `https://jeffreycoen.github.io/combo-engine/docs/frostline/`. OLD MASTER stays live at `docs/play/`. Phone and desktop: taps and chips both; wheel or pinch for zoom.

## Tasks

- 0.0.18-1 — five game modules, gate, page, vendored three, smoke, deploy, records. → `task-0.0.18-1-frostline.md`
- 0.0.18-1.5 — camera control wired: pinch zoom, twist and Q/E and buttons rotate, orders on release. → `task-0.0.18-1.5-camera.md`

Suggested model: Sonnet 5 — every authored file's full content is in the plan; the one large file is a pinned copy.
