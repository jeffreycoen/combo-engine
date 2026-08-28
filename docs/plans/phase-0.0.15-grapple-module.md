# Phase 0.0.15 — the grapple rope

Status: LANDED, commit stamped below, 2026-08-28. Gate: 16 PASS / 0 FAIL; prior gates unmoved.
<!-- At landing this line becomes: Status: LANDED, commit `<hash>`, <date>. Gate: 16 PASS / 0 FAIL; prior gates unmoved. -->

The organ is the deadweight demo's grapple: a cast head that recoils the ship, a tap grammar (fly calls it back, stuck starts the reel, reeling cuts), and the rope itself — rest length set at the bite, slack inside it, beyond it a constraint that pulls both ends by their masses, with the first-taut jerk, the commanded yank, and the snap that leaves the head embedded. Source: `deadweight-hangar.html` lines 1781–1936. What the head bites, and what a torn weld yields, stay with the game; the strain account is the module's, the tearing threshold is the caller's.

## Lift kind

SHAPED — the law carried, the code new only where said:

- LAW (the demo's, carried exactly and cited by line in the module header): cast 2.2 ahead at 34 u/s plus ship velocity, recoil J = 0.15·34 with its torque arm; spent past range 95 or 5 s, rewinding home at 44, rearming inside 2.5; adrift and embedded heads recovered within 3; the taut constraint — the anchor's velocity rides the hull's spin, the separation rate against the winch's demand (reeling asks 8 u/s of closing) killed by J = rel·mu with mu the reduced mass, applied to both ends and as torque at the mount; the first-taut jerk ×1.15 and the 260 snap; the yank J = mu·22 under the same snap law, eating slack first; the no-stretch position split by inverse mass; the reel shortening the rest length 8 u/s to a floor of 4; strain booked at J while reeling, 0.6·J on a yank, bled at 60 u/s when slack.
- NEW, and only this: the demo's game entities become arguments — the ship is any body with `{x, y, vx, vy, w, M, I}`, the target any body plus its mass, the anchor a supplied point, gravity a callback; the bite itself and the strain threshold belong to the caller. Every constant is exported under its demo value.

## Acceptance arithmetic for the phase

Every number below was produced by running the exact planned code at plan-writing time (trial in the session scratchpad). Acceptance is the gate's arithmetic alone; there is no byte-identity claim against the demo.

- `node scripts/gate.mjs grapple` prints 16 PASS lines, then `grapple-test: 16 PASS / 0 FAIL`, then `grapple-test PASS`, exit 0.
- Load-bearing knowns inside the checks — the demo's constants run closed-form on a 100-mass, 500-inertia ship:
  - recoil exactly 5.1 = 0.15 × 34, split as −J/M velocity and −arm·J/I spin;
  - the rewind from 40 units homes in 53 steps at 60 steps a second;
  - the jerk on a 25-mass target separating at 2 u/s: J = 2·mu·1.15 with mu = 20, momentum conserved through the line, the 2-unit stretch split 0.4 to the ship and 1.6 to the target;
  - the winch demands 8 u/s: J = 8·mu, the rest length shrinks 8·dt, the strain books J;
  - a runaway 10000-mass target makes the jerk exceed 260 — snapped, head embedded, no impulse lands;
  - the yank on a 10-mass target: J = mu·22 ≈ 200, both ends move, strain books 0.6·J less one step of slack bleed; the same yank on a 25-mass target tops 260 and parts the line;
  - the mount 5 above a spinning hull's centre turns w = 1 into 5 u/s of separation, paid back as J = 5·mu with its −5·J/500 torque.
- File identity, proven at trial: `src/modules/grapple/grapple.js` sha256 `6030a8eb2f00074f455feda07193fbeb5c7dcce0be1f43dd6bcb265d3c74a50c` (7372 bytes); `scripts/grapple-test.mjs` sha256 `15e8e58d83776bfe16530512326e9b520c07acbf1e9c1d38a49ebe48ff443c58` (5994 bytes).
- All prior gates unmoved, tails as re-run at plan-writing time:
  - api: `seed 1  seconds 90 (10800 steps)  worldHash 3367709165  runHash 2717846799`
  - combat: `ALL PASS`
  - accuracy: `11/11`
  - market: `market-test PASS` · builder: `builder-test PASS` · ledger: `ledger-test PASS` · weldstress: `weldstress-test PASS` · tape: `tape-test PASS` · physics-pb: `physics-pb-test PASS` · rig: `rig-test PASS` · solids: `solids-test PASS` · ballistics: `ballistics-test PASS` · orders: `orders-test PASS` · steering: `steering-test PASS` · voxel: `voxel-test PASS` · support: `support-test PASS`

## Tasks

- 0.0.15-1 — write the grapple module and its gate, register the gate, close the records. → `task-0.0.15-1-grapple.md`

Suggested model: Sonnet 5 — every file's full content is in the plan.
