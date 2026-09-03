# Batch order — the harness layer

The first batch under the README's governance, from the checklist's harness section. Four rungs, one checklist item each. The owner's approval of this document approves the batch; his word interrupts anywhere.

## The rules of the run

As proven in the extraction batches: trial first, plan from the run, rehearsal green, dispatch without a per-plan review sitting; gates bracket every task; no hardwired seeds; landing commits add named files only; each landing flips its phase record, the batch box here, and its README checklist box in the same commit. One difference, because these rungs are built new rather than lifted: **each rung's design questions are served to the owner before that rung's trial is built** — a rung with an unruled design never reaches a trial. The batch runs continuously between rulings.

## The rungs

1. **0.0.59 — the determinism kit.** Checklist: "one seeded random stream for the sim, a second for effects, bit-exact state hashing." The engine already carries the sim stream and two hashes; the rung makes them one named module with a law: same seed, same hashes, any machine — and an effects stream the sim never reads.
2. **0.0.60 — the contract pattern.** Checklist: "tables declared as data, checked at boot, every problem reported at once." One checker the boot calls on every spec table; a bad table never reaches the sim; the report names every problem in one pass, not the first.
3. **0.0.61 — headless gates and the boot self-test badge.** Checklist: "fixed run from a seed, hashes printed, checks shown at start." The gate wrapper exists; the rung adds the badge — every page boots with its self-test result visible — and the one-call headless run that prints its hashes.
4. **0.0.62 — the receipt log.** Checklist: "events stated as plain-language numbers." The sim's events rendered as one readable ledger line each — what fired, what paid, what fell — consumable by a page, a test, or a person.

## Known risks, stated now

- These are SHAPED builds, not lifts: the law comes from the checklist's words and the engine's existing machinery; the code is new. Design questions are expected and are served per rung, not guessed at.
- The badge (rung 3) touches live pages; that rung's plan carries the walk, phone and desktop named.
- The no-hardwired-seeds order and the determinism kit meet head-on: the kit's own gate proves twin-run identity at rolled seeds, never a pinned hash.

## The record

- [x] 0.0.59 determinism kit
- [x] 0.0.60 contract pattern
- [x] 0.0.61 gates and the boot badge
- [x] 0.0.62 receipt log
