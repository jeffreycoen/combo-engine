# Phase 0.0.9 — plane-set solids and the one ray routine

Status: LANDED, commit stamped below, 2026-08-28. Gate: 12 PASS / 0 FAIL; prior gates unmoved.
<!-- At landing this line becomes: Status: LANDED, commit `<hash>`, <date>. Gate: 12 PASS / 0 FAIL; prior gates unmoved. -->

The organ is the shooting-range demo's collision geometry: a solid is a set of planes `[nx,ny,nz,d]` plus a bounding box, and one clip routine serves every shape. Four makers (box, yawed box, n-gon prism, slab), the shared `hit` record, the single-solid ray clip, the world raycast, and the segment occlusion test. Source: `holdover-greybox-range-r55-claude-opus-5.html`, lines 118–216 (makers, `hit`, `raySolid`, `raycastWorld`) and lines 1139–1168 (`rayBlocked`). The demo's `makeWorldQuery` (lines 2224–2245) stays behind — it needs the voxel fields, which are a later phase.

## Lift kind

VERBATIM MATH — the formulas are the demo's exactly; the substitutions below, and only those. Anything else differing from the cited lines is a finding against the plan.

1. `export ` prefixed to the seven function declarations (`makePrism`, `makeBoxYaw`, `makeBox`, `makeSlab`, `raySolid`, `raycastWorld`, `rayBlocked`) and to the `const hit` record.
2. A seven-line header comment added at the top of the module file, naming the source lines and these substitutions.

## Acceptance arithmetic for the phase

Every number below was produced by running the exact planned code at plan-writing time (trial in the session scratchpad, first run green).

- `node scripts/gate.mjs solids` prints 12 PASS lines, then `solids-test: 12 PASS / 0 FAIL`, then `solids-test PASS`, exit 0.
- Load-bearing knowns inside the checks — closed-form distances the demo's geometry implies, not fitted numbers:
  - unit box from x=−10: enter 9.5, exit 10.5, path exactly 1, entry normal (−1,0,0);
  - a 2-cube yawed 45°: the x ray meets its corner at 10 − √2;
  - a 4-gon prism (ring offset π/n): face at 10 − √(1/2);
  - a 64-gon prism: face at 10 − cos(π/64); cap entry at 9;
  - a ray born inside a solid reports no world hit; maxT excludes a hit past it.
- File identity, proven at trial: `src/modules/solids/solids.js` sha256 `6d3ff187f703d0cdc1af56a209bae0b133379c2f8f9b1ed92f534cfceb0bd958`; `scripts/solids-test.mjs` sha256 `f9d23ed832b888b55af029c1b1a185562558c3de518b0c843153e3526592f01c`.
- All prior gates unmoved, tails as re-run at plan-writing time:
  - api: `seed 1  seconds 90 (10800 steps)  worldHash 3367709165  runHash 2717846799`
  - combat: `ALL PASS`
  - accuracy: `11/11`
  - market: `market-test: 8 PASS / 0 FAIL`
  - builder: `builder-test: 10 PASS / 0 FAIL`
  - ledger: `ledger-test: 9 PASS / 0 FAIL`
  - weldstress: `weldstress-test: 9 PASS / 0 FAIL`
  - tape: `tape-test: 9 PASS / 0 FAIL`
  - physics-pb: `physics-pb-test: 11 PASS / 0 FAIL`
  - rig: `rig-test: 9 PASS / 0 FAIL`

## Tasks

- 0.0.9-1 — write the solids module and its gate, register the gate, close the records. → `task-0.0.9-1-solids.md`

Suggested model: Sonnet 5 — every file's full content is in the plan.
