# Phase 0.0.11 — the fleet order model

Status: LANDED, commit stamped below, 2026-08-28. Gate: 13 PASS / 0 FAIL; prior gates unmoved.
<!-- At landing this line becomes: Status: LANDED, commit `<hash>`, <date>. Gate: 13 PASS / 0 FAIL; prior gates unmoved. -->

The organ is the fleet demo's order model: orders live as data on each unit, commands are exclusive verbs over a selected set, and one priority chain resolves what a unit is doing each tick. Source: `homeworld_fleet_command.jsx` — the four order slots (line 979), the exclusive verbs (lines 1091, 1110, 1118), the branch priority and its transitions (lines 1343–1465), acquisition radii (lines 1408–1411, 1468–1473), the range drop (line 1503). Selection itself is the caller's array: every verb acts on the set handed in, which is the demo's `G.selected`.

## Lift kind

SHAPED — the law carried, the code new, said plainly:

- LAW (the demo's, cited above): four order slots per unit; move fans a group onto a square grid at 2.5 spacing (`sq = ceil(sqrt(n))`); each verb clears the other slots exactly as the demo's handlers do; resolution priority is attack > guard > move > idle with dead targets falling through; arrival within distance 1 completes a move; an armed unit with no live target acquires the nearest foe within `range × 1.5` if it strafes, `range × 1` if not, and `range × 1.2` while guarding; unarmed units never acquire; a target beyond range loses the slot.
- NEW (this module's): plain-data code — positions are `[x, y, z]` arrays, units are plain objects from `makeUnit`, no renderer types, no game globals, and a `checkSpec` contract that reports every problem at once. The demo's quaternions, meshes, and per-frame motion stay behind; steering is a later phase.

## Acceptance arithmetic for the phase

Every number below was produced by running the exact planned code at plan-writing time (trial in the session scratchpad). Acceptance is the gate's arithmetic alone; there is no byte-identity claim against the demo.

- `node scripts/gate.mjs orders` prints 13 PASS lines, then `orders-test: 13 PASS / 0 FAIL`, then `orders-test PASS`, exit 0.
- Load-bearing knowns inside the checks — the demo's own ship table rows (lines 10–16) drive them:
  - four units fan onto the 2×2 grid at exactly 7.5/10 × 17.5/20 around (10, 0, 20);
  - the interceptor (range 20, strafes) acquires at 30 — a foe at 29 is taken;
  - the frigate (range 38, no strafe) seeks at bare 38 — 39 is out, 37 is taken;
  - guarding raises the frigate's reach to 45.6 — a foe at 45 is taken; the unarmed collector never acquires;
  - a target at 38 holds a 38-range frigate, at 38.5 the slot drops;
  - a broken spec row reports its 5 missing fields at once.
- File identity, proven at trial: `src/modules/orders/orders.js` sha256 `705b5aac4eeb5e9c671ed053c149143ae65e4c1992fccaf8df901fff032d48c0` (4822 bytes); `scripts/orders-test.mjs` sha256 `a6ac12800fc8b680f64e500da0a15890767320f3557da4dca01002ecf839b12e` (5075 bytes).
- All prior gates unmoved, tails as re-run at plan-writing time:
  - api: `seed 1  seconds 90 (10800 steps)  worldHash 3367709165  runHash 2717846799`
  - combat: `ALL PASS`
  - accuracy: `11/11`
  - market: `market-test PASS` · builder: `builder-test PASS` · ledger: `ledger-test PASS` · weldstress: `weldstress-test PASS` · tape: `tape-test PASS` · physics-pb: `physics-pb-test PASS` · rig: `rig-test PASS` · solids: `solids-test PASS` · ballistics: `ballistics-test PASS`

## Tasks

- 0.0.11-1 — write the orders module and its gate, register the gate, close the records. → `task-0.0.11-1-orders.md`

Suggested model: Sonnet 5 — every file's full content is in the plan.
