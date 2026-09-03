# Batch order — the harness's last box, then the api

Four rungs from the checklist: the phone-first page kit closes the harness section, then the three api boxes — the road to 0.1.0. The owner's approval of this document approves the batch; his word interrupts anywhere.

## The rules of the run

As the harness batch ran: trial first, plan from the run, rehearsal green, dispatch without a per-plan review sitting; each rung's design questions served to the owner before its trial is built; gates bracket every task; no hardwired seeds; landing commits add named files only; each landing flips its phase record, the batch box here, its README checklist box, and its modules-list line in the same commit.

## The rungs

1. **0.0.63 — the phone-first page kit.** Checklist: "touch hardening, safe-area layout, light and dark theme." The FROSTLINE pages already carry the touch and safe-area machinery inline; the rung gathers it into one module the pages share, and adds the theme. Touches live pages — the plan carries the walk, phone and desktop named.
2. **0.0.64 — boot from a world description object.** Checklist: "seed, terrain, gravity and wind, spec tables, module choices, dials." One call takes one object and returns a running world; everything defaulted, everything overridable; the contract pattern checks the description at the door. The 0.1.0 era flips when this lands whole.
3. **0.0.65 — module registry and the standard sockets.** Checklist: "tick input, renderer flags, sound events." The description's module choices resolve through one registry; the three sockets become declared surfaces instead of conventions.
4. **0.0.66 — the manifest tool.** Checklist: "a map of what every file imports from the engine, kept mechanically." One script walks the tree and prints the map; its gate proves the map matches the imports on any tree state.

## Known risks, stated now

- Rung 2 is the largest design in the project so far; its questions come to the owner first, and its trial must boot twin worlds at rolled seeds before a plan exists. It may rule several sittings.
- Rungs 2 and 3 touch the engine's boot path; every rung brackets with the full four gates plus the one-call selftest.
- The version's middle digit moves to 0.1.0 only when rung 2's landing is whole — the owner's word rules the flip.

## The record

- [x] 0.0.63 page kit
- [x] 0.0.64 described-world boot
- [x] 0.0.65 registry and sockets
- [ ] 0.0.66 manifest tool
