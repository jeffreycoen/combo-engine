# Phase 0.0.7 — the position-based physics core

Status: LANDED, commit stamped below, 2026-08-28. Gate: 11 PASS / 0 FAIL; prior gates unmoved.

The first organ from outside deadweight: the mech demo's rigid-body core — substepped position-based dynamics with welds and hinges that carry a four-load structural envelope (pull, sideways, bending, twist; one utilization number; honest tearing), torque-limited joint servos, ground contact with correct static friction, and box-pair separation. This is the solver coldsnap's engine reserves the mech-island hook for. Source: `mech-mk1-live-opus-5.html` lines 159–789 — the whole `core/physics.mjs` section, which the demo's own header says was bundled from gated modules "unmodified except module syntax removal."

## Lift kind

VERBATIM — and provably: the module file IS lines 159–789 of the demo, extracted byte-for-byte, plus one appended export block that puts the module syntax back. Acceptance for the file is its sha256. No substitution table; nothing inside the demo's text may differ.

## Trial findings, recorded

Two predictions died in the trial and were re-pinned from measurement, as the rule requires:

1. The one-second free-fall distance is the integrator's own closed form 9.81 × 1201/2400 = 4.9090875 m (each substep applies gravity before moving), not the continuous 4.905 m.
2. The weld's tension sign follows its axis: the axis must FACE the load or a hanging weight reads as compression, and compression never breaks a weld — the demo's own design ("compression does not pull the weld apart"). The break check orients the axis at the load.

## Acceptance arithmetic for the phase

Every number below was produced by running the exact planned files at plan-writing time.

- The module file's sha256 is `12d5ca25a5195b360f967d330f19d0cd3fefe1ea4963185ad2c4aca04b9e9b46`; the gate file's is `e70e05f543c17651d0d57e46d0aedca4d4c36bef9849dcf80af898850df1cdd5`.
- `node scripts/gate.mjs physics-pb` prints eleven PASS lines, then `physics-pb-test: 11 PASS / 0 FAIL`, then `physics-pb-test PASS`, exit 0.
- Load-bearing knowns: box inertia diag 13/10/5 exact; compound parallel-axis 2 kg·m²; utilization 0.5 at half tension and 0 in compression; free fall 4.9090875 m bit-deterministic across worlds; a dropped box rests at y=0.5 within 2 mm; the ground reports 98.1 N within 1%; a weld measures the hanging 98.1 N within 2% and a 50 N-limit weld breaks onto the event log with the body marked detached; a hinge servo reaches 0.3 rad within 0.01 in half a second; paired boxes never close below their margin.
- The eight prior gates unmoved: api worldHash 3367709165 / runHash 2717846799, combat 7 PASS, accuracy 11/11, market, builder, ledger, weldstress, tape all `PASS`.

## Tasks

- 0.0.7-1 — the physics core: extraction, gate, registration, record close, commit, stamp, push. → `task-0.0.7-1-physics-pb.md`

Suggested model: Sonnet 5 — the module is extracted by command, the gate is written byte-for-byte, both are hash-checked.
