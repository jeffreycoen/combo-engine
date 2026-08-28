# Phase 0.0.14 — support propagation

Status: LANDED, commit `08fbabe`, 2026-08-28. Gate: 12 PASS / 0 FAIL; prior gates unmoved.
<!-- At landing this line becomes: Status: LANDED, commit `<hash>`, <date>. Gate: 12 PASS / 0 FAIL; prior gates unmoved. -->

The organ is the shooting-range demo's structural honesty: support propagates up from the ground in passes, so two floating pieces can never hold each other up; decoration is paint — it never bears load, never falls as a body, and goes when its host goes; settling drops every unsupported structural piece as one falling voxel cluster. Source: `holdover-greybox-range-r55-claude-opus-5.html` lines 2940–3060 (`primBox`, `restsOn`, `linkDeco`, `findUnsupported`, `sweepDeco`, `settleWorld`) and 2569–2597 (`dropPrimAsCluster`, which this phase adds to the voxel module). This closes what phase 0.0.13 left behind on purpose.

## Lift kind

SHAPED — the law carried, the code new only where said:

- LAW (the demo's, carried exactly and cited by line in the module header): the prim box; the rests-on ledger (footprint overlap within 0.05, bearing top in [−0.22, +0.06] of the base, or a spanning neighbour); ground at base ≤ 0.16, propagation in up-to-24 passes; the host resolved once by proximity — best overlap, else nearest gap within 0.45, never through other decoration; the deco sweep repeated to a guard of 6 so chained paint goes in one settle; welded prims never dropped; ghosts, the dead, debris, decoration, and downed targets never needing support; the whole-prim cluster with its 8-per-axis cap and real mass.
- NEW, and only this: the demo's globals become arguments — the level array is passed in, and what happens to a faller is the caller's callback (`onFall`, naturally `voxWorld.dropPrimAsCluster`); the voxel module gains `dropPrimAsCluster` with its tumble drawn from the seeded stream and its color plumbing gone, same as every other voxel verb.

## Acceptance arithmetic for the phase

Every number below was produced by running the exact planned code at plan-writing time (trial in the session scratchpad). Acceptance is the gate's arithmetic alone; there is no byte-identity claim against the demo.

- `node scripts/gate.mjs support` prints 12 PASS lines, then `support-test: 12 PASS / 0 FAIL`, then `support-test PASS`, exit 0.
- The voxel module changes in this phase, so its gate re-proves: `node scripts/gate.mjs voxel` still ends `voxel-test: 14 PASS / 0 FAIL` then `voxel-test PASS` — asserted in the trial against the extended file.
- Load-bearing knowns inside the checks — a post carrying a deck, rust painted on the post, a flag hung near the deck, a floater, a ghost:
  - the rust hosts on the post it overlaps (index 0), the flag on the deck it hangs near (index 1); a far-off decoration gets host −1;
  - only the floater floats; killing the post sets the deck adrift; two stacked floating slabs both fall;
  - the sweep takes the rust with its dead post and leaves the flag; the cascade settle counts 3 — the deck falls, the rust and the flag sweep in the same call;
  - the fallen floater leaves as one 4 × 4 × 4 cluster, mass 2400 · (0.5/4)³ · 64, at its own centre.
- File identity, proven at trial: `src/modules/support/support.js` sha256 `6dfd69ad893f42aab0b1002aaa0b97e343eeacc9deee66c3c21679b9de686d8a` (5817 bytes); `src/modules/voxel/voxel.js` after the extension sha256 `d28b949e1289bdd41dbbafd94cbb60ebd6c09fc663a2e0363efaeea14bf42922` (30433 bytes); `scripts/support-test.mjs` sha256 `920674c2910f7ac9ad9e5452e5305e472ab8d64147938716f9ec5e98e111b3bd` (4753 bytes).
- All prior gates unmoved, tails as re-run at plan-writing time:
  - api: `seed 1  seconds 90 (10800 steps)  worldHash 3367709165  runHash 2717846799`
  - combat: `ALL PASS`
  - accuracy: `11/11`
  - market: `market-test PASS` · builder: `builder-test PASS` · ledger: `ledger-test PASS` · weldstress: `weldstress-test PASS` · tape: `tape-test PASS` · physics-pb: `physics-pb-test PASS` · rig: `rig-test PASS` · solids: `solids-test PASS` · ballistics: `ballistics-test PASS` · orders: `orders-test PASS` · steering: `steering-test PASS` · voxel: `voxel-test PASS`

## Tasks

- 0.0.14-1 — write the support module, extend the voxel module, register the gate, close the records. → `task-0.0.14-1-support.md`

Suggested model: Sonnet 5 — every file's full content is in the plan.
