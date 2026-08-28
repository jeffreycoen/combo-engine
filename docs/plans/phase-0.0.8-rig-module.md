# Phase 0.0.8 — the rig table and assembly

Status: LANDED, commit `6f45e61`, 2026-08-28. Gate: 9 PASS / 0 FAIL; prior gates unmoved.

The mech demo's machine-as-data layer, onto the physics core landed in 0.0.7: the whole MK1 as one table (mass, box size, joint anchors, hinge axes, torque caps, mount limits per link), limbs mirrored per side, assembled breadth-first into bodies, hinges, welds, and the two collision pairs — plus grounding, the balance-debt measure, and rig statistics. Source: `mech-mk1-live-opus-5.html` lines 860–1063, the whole `rig/mech.mjs` section.

## Lift kind

VERBATIM by hash — the module file is the demo's lines 860–1063 extracted byte-for-byte, with exactly two additions: an import line at the top (the names the section used as in-scope globals, now taken from the physics-pb module) and an export block at the end. Acceptance for the file is its sha256. Nothing inside the demo's text may differ.

## Trial finding, recorded

The first import line missed `PairCollision` (used at the demo's line 1012 for the foot and shin pairs) and the trial threw on assembly; the name was added and the run went green. The plan's import line carries all fifteen names.

## Acceptance arithmetic for the phase

Every number below was produced by running the exact planned files at plan-writing time.

- The module file's sha256 is `a8f50db14961872d6e0a7cd61a5e181326098eba12ba34f0f568cfb8c36b0208`; the gate file's is `29934c3729fd18be05249032305c43b16888cabd2744a2e99d6fb8e41c623fe4`.
- `node scripts/gate.mjs rig` prints nine PASS lines, then `rig-test: 9 PASS / 0 FAIL`, then `rig-test PASS`, exit 0.
- Load-bearing knowns: the built table names 17 links; the assembled MK1 weighs exactly 8140 kg — the demo's own title chip; 17 bodies, 14 hinges, 2 welds, 2 pairs; groundRig lands the lowest point exactly at 0; the crouched stance measures 4.9137 m; the com-to-ankle debt is under 1 mm; one second under gravity stands with zero breaks, pelvis at 3.5151 m, bit-deterministic across two worlds; the footWidth/hipOffset design-sweep overrides reach the built table.
- The nine prior gates unmoved: api worldHash 3367709165 / runHash 2717846799, combat 7 PASS, accuracy 11/11, market, builder, ledger, weldstress, tape, physics-pb all `PASS`.

## The composition

The rig stands on physics-pb — fourth cross-module proof, and the first where one demo's module is assembled inside another lift's solver world.

## Tasks

- 0.0.8-1 — the rig module: extraction, gate, registration, record close, commit, stamp, push. → `task-0.0.8-1-rig.md`

Suggested model: Sonnet 5 — the module is extracted by command and hash-checked; the gate is written byte-for-byte.
