# Phase 0.0.107 — wrecks: the collapse shell, welds under it, wreck fields, the grappler

Status: LANDED, commit stamped below, 2026-09-09. Gate: 23 PASS / 0 FAIL; the full self-test all gates PASS.
<!-- At landing this line becomes: Status: LANDED, commit `<hash>`, <date>. Gate: 22 PASS / 0 FAIL; the full self-test all gates PASS. -->

The fifth phase of GRAVITY'S ARK under the order batch-ark-1: frames 4 and 6 headless. At the collapse a shell shoves every body outward, weaker with distance, and never worlds or stations; the hull's welds take the shove as a load by the weldstress module's law and shed what breaks as wrecks with their mass; a field of wrecks falls back toward the pit under the wells law; the grappler casts on the grapple module's rope, bites, reels with the pull both ways, and takes what comes within reach: scrap by the kilogram, crates with credits, modules as spares. A later page step will show the shell's push, the wreck field drifting near the ship, and a grapple control that fires the rope and reels in what it catches.

## Lift kind

No lift. New code to the order's scale table; every number PROPOSED; the weld, rope, and fall laws the engine's own.

## Rulings inside this plan

- The bite and the take are the game's own radii; the rope's account is the grapple module's.
- The full self-test runs at this landing, the order's midpoint.
- The grapple module's own dials are the demo's, sized for masses of a few kilograms. At the order's scale the first taut pull on any wreck exceeded the snap threshold outright, so the module hands the grapple calls a rope dials object, `ROPE`: the snap threshold times 200 for real kilograms, the range 300 m, the flight time 10 s, everything else the grapple module's own.

## Acceptance arithmetic for the phase

Every number below is the run's output (rolled seeds 657599207, 1023486730).

- `node scripts/gravitys-ark-test.mjs` prints a seeds line, 5 PASS lines in the worktree, then `gravitys-ark-test: 5 PASS / 0 FAIL`, then `gravitys-ark-test PASS`, exit 0; 22 at the landing.
- Bracket, run at the landing: gravitys-ark, weldstress, grapple, wells, ledger, then the full self-test.

## Tasks

- 0.0.107-1 — the wrecks. → `task-0.0.107-1-wrecks.md`
