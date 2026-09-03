# The realignment — the extraction program put back under the README

The finding, stated once: the README's checklist was the extraction scope from the start, and the three batch orders ignored it. Twenty-eight phases landed one new checklist item, four second copies of items already checked, and twenty-three internal moves of engine code that no box asked for. The gates are green and nothing landed is broken — the failure is scope, duplication, and a record that no longer reads straight. This document is the proposed fix. Nothing below moves until approved.

## Part 1 — stop the drift where it stands

- Batch 3 closes at the rung now in flight. Its remaining rungs (squads, buildlines, units, drivers, muster, bell) are withdrawn — none serves a checklist item. The batch record and the README's in-flight list are corrected to say landed / withdrawn, plainly.
- The landed carve-outs stay. They are hash-proven moves with green gates; unwinding them is churn with no buyer. But the README stops calling them extraction: they move to their own section — engine housekeeping, code moved, no capability added — so the extraction record only claims what the checklist earned.

## Part 2 — reconcile the duplicates

Three capabilities now have two modules each, from the two lifts of the same demo family:

| Capability | First lift | Second lift |
|---|---|---|
| Moving-price markets | market (0.0.2) | poolmarket (0.0.36) |
| Conservation ledger | ledger (0.0.4) | conserve (0.0.39) |
| Ship builder | builder (0.0.3) | shipyard (0.0.52) |

One task: a comparison of each pair — surface, laws, gate strength — served as a short document with a stated lean per pair. The ruling picks the canonical module; the other is retired (file removed, gate removed, README line struck) or kept under a new name only if it carries a law the canonical one lacks. Escrow (0.0.37) and wells (0.0.38) stand: escrow newly earned its box; wells carries the predictors the frozen-time-aiming box will need.

## Part 3 — the README made the governor in fact

- The modules list is regrouped under the checklist items each module serves; a module that serves no item sits in the housekeeping section, and that placement is itself the record of Part 1's finding.
- The Status section is rewritten to current truth: what the checklist shows landed, what FROSTLINE ships, what the housekeeping moved.
- The standing order already written stays the law: every future batch order and phase names its checklist item; reading the README alone shows what is extracted, what is in flight, and why.

## Part 4 — the forward road, derived from the unchecked boxes

The next extractions come from the checklist, in an order that serves the middle-digit goal (0.1.0 = the described-world boot). The proposed sequence, each phase naming its box:

1. **The harness layer first** — determinism kit; the contract pattern; headless gates and the boot self-test badge; the receipt log. These pay off in every later box and mostly formalize machinery the tree already half-has.
2. **The api itself** — boot from a world description object; module registry and the standard sockets; the manifest tool. The carve-outs, whatever their scope sin, made this rung mechanically easier: the organs are already files with front doors.
3. **Demo capabilities with living source in this tree** — frozen-time aiming and the 2-D canvas renderer with the gravity-warped grid (the deadweight demo, wells module already carrying the predictors); the fleet demo's selection layer, movement disc, touch grammar.
4. **Demo capabilities whose demos are not in this tree** (mech envelopes, actuators, IK, balance; the shooting-range opponent model, greybox library, 3-D renderer) — each needs its demo committed as read-only source first, same as the deadweight demo was; they queue behind the ones above.

Each numbered group would be its own batch order, served for approval, one checklist item per phase, trial-proven as before. The continuous mode itself worked — every landing was gate-clean; it stays available, aimed at the right targets.

## Part 5 — the other open ledger, unchanged

The FROSTLINE repair ladder (real missions behind the job names, heat, the mark's rule, the replay door, space to standard) stands where the audit and storyboard left it — plan-and-playtest work, not batch work. It is listed here so this document is the whole picture, and it waits its own word.

## The decisions this plan needs, when the owner is ready

1. Close batch 3 at the in-flight rung and withdraw the rest — yes or no.
2. The duplicate pairs — comparison document first, or a direct ruling now.
3. Part 4's order — harness first, or the api boot first, or a different order.
