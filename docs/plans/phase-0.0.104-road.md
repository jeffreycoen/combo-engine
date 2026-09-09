# Phase 0.0.104 — road: the ship under gravity, the collapse, the hole, the edge

Status: LANDED, commit `97483aa`, 2026-09-09. Gate: 11 PASS / 0 FAIL; bracket unmoved.
<!-- At landing this line becomes: Status: LANDED, commit `<hash>`, <date>. Gate: 11 PASS / 0 FAIL; bracket unmoved. -->

The second phase of GRAVITY'S ARK under the order batch-ark-1: frames 4 and 5 headless. The ship flies under the wells law over every world and the pit; burns spend fuel as mass; LAND inside 40 m under 7.5 m/s, a crash between 7.5 and 22.5, death above; landings and takeoffs burn the world's escape speed; the collapse fires on the seeded takeoff; the hole's edge grows at a fixed speed and steps its mass at every world it swallows, on a schedule computable before launch; the edge for a hull is the nearest world it can still leave. The next phase's page shows the ship, the worlds, and the hole, and wires its LAND, TAKE OFF, and burn control to these numbers.

## Lift kind

No lift. New code to the order's scale table; every number PROPOSED; the wells law the engine's own.

## Rulings inside this plan

- No randomness in the road: every draw a game needs comes from the caller's tape.
- The gate's checks 6 to 11 run over a stand-in galaxy in the worktree and over the real one from the landing on.

## Acceptance arithmetic for the phase

Every number below is the run's output (rolled seeds 3764341314, 3921624694).

- `node scripts/gravitys-ark-test.mjs` prints a seeds line, 6 PASS lines in the worktree, then `gravitys-ark-test: 6 PASS / 0 FAIL`, then `gravitys-ark-test PASS`, exit 0; 11 at the landing.
- Bracket, run at the landing: gravitys-ark, wells, determinism.

## Tasks

- 0.0.104-1 — the road. → `task-0.0.104-1-road.md`
