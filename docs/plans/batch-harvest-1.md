# Batch order — the harvest round

Five rungs from the README's unchecked boxes, harvested from the local demo files under the standing orders: demos read-only and never committed, fidelity proven in each trial at lift time, gates holding laws only. The owner's approval of this document approves the batch; his word interrupts anywhere.

## The rungs

From the mech demo (`mech-mk1-live-opus-5.html`, local, 1925 lines):

1. **0.0.67 — mount failure envelopes.** Checklist: "four load types, one utilization number, honest tearing." The demo's own law is clean at its seam: tension (compression uncounted), shear, bend, torsion, combined as one root-sum utilization, failure at 1 less accumulated damage (lines 371-376 and the weld's limit and damage fields). VERBATIM MATH.
2. **0.0.68 — torque-limited joint actuators.** Checklist: "finite stiffness." The demo's servo: a spring-damper drive clamped by the joint's own torque ceiling per substep (the tauMax, kp, kd arithmetic near lines 490-520). VERBATIM MATH; the trial names the exact lines.
3. **0.0.69 — per-joint load telemetry.** Checklist: "as an engine output." The force, torque, utilization, and peak each mount reports per substep — the fields the envelope already writes, shaped into the standard flags socket. SHAPED, small, riding rung 1's module.

From the shooting-range demo (`holdover-greybox-range-r55-claude-opus-5.html`, local, 4126 lines):

4. **0.0.70 — the non-lethal opponent model.** Checklist: "per-part thresholds, knockdown by impulse, a lethal line that fails the mission." The demo's agentHit: per-part energy and impulse thresholds, stun accumulation, limp, sedation, the lethal line (lines 1599-1643 and the part table). VERBATIM MATH.
5. **0.0.71 — opponent senses and cover reasoning.** Checklist as written. The demo's sight and cover reads (agentCanSee, agentCoverSolid, lines 1645 on). VERBATIM MATH where the seam is clean; anything leaning on page state becomes a named substitution or the rung stops.

## Named as staying behind, rulings not misses

- The boot box's second half (spec tables, module choices) — needs its own design sitting.
- The 3-D lit renderer, greybox part library, fleet selection layer, movement disc, touch grammar, backdrop, musical cues — look and sound are the owner's domain; each needs his eye per landing, not a continuous run.
- Leg IK and the balance controller — control design beyond a lift; their own order later.
- Frozen-time aiming and the canvas renderer — page-shaped; they follow when a page exists to carry them.

## The rules of the run

As the api batch ran, plus the new law: no demo enters git; every trial proves fidelity against the local demo text at lift time and the plan records the numbers; gates assert laws at rolled inputs only. Each landing flips its phase record, the batch box, its README checklist box, and its modules-list line in one commit.

## The record

- [x] 0.0.67 mount envelopes
- [x] 0.0.68 torque actuators
- [ ] 0.0.69 joint telemetry
- [ ] 0.0.70 opponent model
- [ ] 0.0.71 senses and cover
