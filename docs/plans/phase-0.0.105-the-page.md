# Phase 0.0.105 — the page: the galaxy on the warped grid, the ship, the clocks, LAND, TAKE OFF, a burn

Status: LANDED, commit stamped below, 2026-09-09. Gate: 12 PASS / 0 FAIL; bracket unmoved.
<!-- At landing this line becomes: Status: LANDED, commit `<hash>`, <date>. Gate: 12 PASS / 0 FAIL; bracket unmoved. -->

The third phase of GRAVITY'S ARK under the order batch-ark-1, the orchestrator's page step: the first deploy of the game at https://jeffreycoen.github.io/combo-engine/docs/gravitys-ark/ . The page binds the events and draws; every law lives in `src/games/gravitys-ark/` and the engine's modules. This phase also carries three amendments to the landed law, found by the page's own trial: the galaxy's mu formula, the road's surface arrival and landing band, and the takeoff's leaving speed; each is recorded below and in the night log.

## Lift kind

No lift. New page code in the shape of `docs/frostline/`; the warped grid the render2d module's.

## The walk

- **The screen.** The canvas with the warped grid, the pit as a white disc that reddens one step per takeoff (`STAR_COL` by `state.takeoffs`), the worlds as discs sunk in their pits by `render2d.project`, each labeled with its id, climate, and holder, the lanes between them, the gate as a green box, the ship as a triangle, and the aim as a line from the ship. After the collapse the pit is black with a dashed red circle at the hole's edge, and the word EDGE marks the nearest world the hull can still leave (`road.edgeFor`).
- **The top-left pane:** the seed; fuel in kg and mass in kg (`ship.fuel`, `ship.dry + ship.fuel`); dv in m/s (`dvAvailable`) and speed; the landed world or "in flight" or SHIP LOST.
- **The top-right pane:** the clock t. After the collapse: the edge in metres (`state.hole.edge`), the next world to go and the seconds until (`road.schedule`), and your edge world.
- **The bottom-left log:** the last six road events, one line each.
- **The buttons, phone and desktop:** LAND calls `road.land()`; TAKE OFF calls `road.takeoff()`, which fires the collapse on the seeded count; BURN, held, calls `road.burn` along the aim every tick; AIM toggles between the gate and the last drag; − and + step the zoom; II pauses; NEW SEED on the card reloads with a fresh seed.
- **The keys, desktop:** arrows or WASD aim along the road's axes, space burns, l lands, t takes off, p pauses, g aims at the gate.
- **The drag:** a drag on the canvas sets the aim in world directions through the iso projection's own axes; a pinch zooms.
- **The card:** when the ship is lost, a plain card with the time and the count of worlds eaten; the card of the crossing is phase 0.0.109's.

## Amendments carried by this phase

- The galaxy's `muFor` divides by the radius: the wells module's pull is mu times the distance over the soft-square power, and the brief's formula had left the distance out. The gate's check 2 re-taught to the module's own law; the surface pull equals the world's gravity, measured.
- The road: a hull that reaches a surface lands by the band and never passes through; the descent burn kills up to the escape speed and the band is the excess over it; a takeoff leaves at the escape speed outward plus the launch speed along the road. Check 10 re-taught for the excess band; check 12 added.

## Acceptance arithmetic for the phase

Every number below is the run's output (rolled seeds 2633338206 and the second run's).

- `node scripts/gravitys-ark-test.mjs` prints a seeds line, 12 PASS lines, then `gravitys-ark-test: 12 PASS / 0 FAIL`, then `gravitys-ark-test PASS`, exit 0.
- The page parses (`node --check docs/gravitys-ark/main.js`); its look is the owner's, at the link.
- Bracket, run at the landing: gravitys-ark, wells, render2d, pagekit.

## Tasks

- 0.0.105-1 — the page. → `task-0.0.105-1-the-page.md`
