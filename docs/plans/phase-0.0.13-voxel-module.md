# Phase 0.0.13 — voxel destruction

Status: LANDED, commit `be4f371`, 2026-08-28. Gate: 14 PASS / 0 FAIL; prior gates unmoved.
<!-- At landing this line becomes: Status: LANDED, commit `<hash>`, <date>. Gate: 14 PASS / 0 FAIL; prior gates unmoved. -->

The organ is the shooting-range demo's destruction: a solid voxelizes on first wound, damage carves cells only where hit, a perforating shot bores a tunnel with entry and exit spall, unsupported cells leave as falling clusters that bake into rubble or shatter, and settled rubble stacks by a height map so later debris lands on the heap. Source: `holdover-greybox-range-r55-claude-opus-5.html` lines 1750–2470 (fields, damage, contacts, debris, ray, anchors, collapse, clusters) and 2457–2567 (the bored tunnel). Composes with solids (`raycastWorld`, the shared `hit`) and ballistics (`MEDIA`, `G`, and the gate's seeded stream from `mulberry32`).

## Lift kind

SHAPED — the law carried, the code new only where said:

- LAW (the demo's, carried in substance and cited by line in the module header): the VOX limits; voxelize with its halving cap; the carve radius `min(2.6·brittle, (0.20 + √E·0.028)·brittle)` with brittle 1.9 for glass, 1.4 for other breakables; nearest cells fly up to the 340-cube pool, overflow drops as floor crumbs with the demo's hash jitter; the live fraction under 0.32 marks the prim gone; the bored tunnel's depth, bore, and spall laws; the DDA field ray; the one world query where the nearer of solid and field wins; anchors (floor, sound neighbour, ledge); collapse by search from anchors into capped clusters with real mass; cluster flight that bakes under 7.5 m/s and shatters over it; the rubble height map with its slope-of-repose slide; pair contacts over a spatial hash; the debris step's bounces, sleep, and baking.
- NEW, and only this (numbered in the module header): (1) no renderer — instance buffers, packing, and color plumbing gone; settled debris bakes into a plain rubble list; (2) no unseeded randomness — every `Math.random` in debris and cluster tumble draws from a caller-seeded stream, so runs replay bit-exact; (3) the cell-size table keys demo part names, so it rides as options data with the demo's values as the fixture; (4) `MEDIA` imports from the ballistics module. The demo's `dropPrimAsCluster` (decoration falling with its host) stays behind — it belongs to the support-propagation box, a later phase.

## Acceptance arithmetic for the phase

Every number below was produced by running the exact planned code at plan-writing time (trial in the session scratchpad). Acceptance is the gate's arithmetic alone; there is no byte-identity claim against the demo.

- `node scripts/gate.mjs voxel` prints 14 PASS lines, then `voxel-test: 14 PASS / 0 FAIL`, then `voxel-test PASS`, exit 0.
- Load-bearing knowns inside the checks — a 1 × 2 × 0.2 concrete wall at the demo's concrete cell size 0.115:
  - the wall voxelizes to a 9 × 17 × 2 field of 306 cells; a 10-cube at target size halves to 22³ = 10648 under the 13000 cap;
  - the pristine ray enters at 4.9 with path 0.2 and carries concrete;
  - 900 J opens radius 1.04 — 8 of 306 cells survive, 298 fly (inside the 340 pool), the prim is gone;
  - a perforating tunnel removes exactly 18 cells and the same ray then passes clean down the bore;
  - anchors on the floor-standing wall: 36 (the floor layer plus the demo's ledge ring);
  - severing a horizontal slice drops one 144-cell cluster of mass ρ·cell·144 ≈ 451.765 kg; it lands in 55 steps and bakes 144 rubble cells, raising the height map past 0.9;
  - the same cluster at 10 m/s shatters into 144 debris cubes instead;
  - two seed-9 worlds settle 295 rubble cells with 3 still moving, bit-identical;
  - the height map only ever rises; fields index after solids in the world query.
- File identity, proven at trial: `src/modules/voxel/voxel.js` sha256 `477697cc00b6946dcb6ea8be8c232a42b64c379a564ddd9525ce8e329ab4d1a4` (29070 bytes); `scripts/voxel-test.mjs` sha256 `12e2dafa92adab96045cd71cc89df69d31eb477ddc421343de625792150aa730` (6302 bytes).
- All prior gates unmoved, tails as re-run at plan-writing time:
  - api: `seed 1  seconds 90 (10800 steps)  worldHash 3367709165  runHash 2717846799`
  - combat: `ALL PASS`
  - accuracy: `11/11`
  - market: `market-test PASS` · builder: `builder-test PASS` · ledger: `ledger-test PASS` · weldstress: `weldstress-test PASS` · tape: `tape-test PASS` · physics-pb: `physics-pb-test PASS` · rig: `rig-test PASS` · solids: `solids-test PASS` · ballistics: `ballistics-test PASS` · orders: `orders-test PASS` · steering: `steering-test PASS`

## Tasks

- 0.0.13-1 — write the voxel module and its gate, register the gate, close the records. → `task-0.0.13-1-voxel.md`

Suggested model: Sonnet 5 — every file's full content is in the plan.
