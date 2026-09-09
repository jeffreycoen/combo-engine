# Task 0.0.104-1 — road: the ship under gravity, the landing band, the collapse, the hole, the edge

One job: the second phase of GRAVITY'S ARK. A headless module that flies the ship over the galaxy under the wells law, lands and takes off by the order's band and charges, fires the collapse on the seeded takeoff, grows the hole on a schedule computable ahead, and computes the edge for a hull; and six more checks in the game's gate. Write exactly the design below, run the gate, write the phase document, commit on your branch, report. You design nothing beyond this brief; anything it did not foresee stops the task and is reported as a labeled nonconformity.

Model: Sonnet 5.

Where you work: the worktree at `/home/batman/combo-wt/road`, branch `phase/0.0.104-road`, cut from main before phase 0.0.103 lands. The galaxy module this phase consumes is not in your tree yet; its shape is fixed below and you write a small stand-in in the gate for it exactly as given, which the landing replaces with the real import. You never touch `/home/batman/combo-engine` (the main tree). You never edit `scripts/gate.mjs`, `README.md`, `package.json`, `src/modules/registry/registry.js`, any module under `src/modules/`, or any document of another phase. You never edit a demo file.

Working method, required: no single response or tool call may carry more than about 150 lines of new text. Right after the read-confirmation, make your first write. Append each file piece by piece with bash heredocs and run `node --check` after each piece once it can parse. Keep your own reasoning short; this brief has made every decision.

Required reading, in order, whole (confirm each with its line count at the top of your report):
1. This file.
2. `/home/batman/combo-engine/docs/plans/batch-ark-1.md`, the sections "The scale table", "The rules of the run", and "Stream S, the space frames".
3. `/home/batman/combo-wt/road/src/modules/wells/wells.js`, lines 1 to 41, for `accel`.
4. `/home/batman/combo-wt/road/src/modules/determinism/determinism.js`, whole, for `simStream` and `stateHash`.
5. `/home/batman/combo-wt/road/scripts/disc-test.mjs`, lines 1 to 40, the shape of a gate's seed line and check helper.
6. `/home/batman/combo-wt/road/docs/plans/phase-0.0.73-aim.md`, as the shape of a phase document.

## The galaxy shape this phase consumes, fixed by phase 0.0.103

An object `{ seed, n, worlds, star, lanes, gate, collapseAt }` where each world is `{ id, i, x, y, r, g, soft, mu, climate, ring, holder, state: "alive", station }`, sorted by x ascending; `star` is `{ x: 0, y: 0, r, g, soft, mu }`; `gate` is `{ x, y: 0, toll, bill }`; `collapseAt` is 2 or 3. The wells law is the engine's: the pull at distance `r` from a body is `mu / (r² + soft²)^1.65` toward it, and `mu` was set so the pull at the body's own radius equals its `g`.

## The design, fixed

New file `src/games/gravitys-ark/road.js`. It imports `accel` from `../../modules/wells/wells.js` and `stateHash` from `../../modules/determinism/determinism.js`, nothing else. No randomness inside the module. Exports, in this order:

```js
export const ROAD_DIALS = { ve: 3000, landR: 40, landV: 7.5, crashV: 22.5, edgeSpeed: 40, launchV: 60, launchGap: 200 };
export const STARTER = { dry: 3400, fuel: 2500, thrust: 60000 };
export function escapeSpeed(w) { return Math.sqrt(2 * w.g * w.r); }
export function dvAvailable(ship, ve) { return ve * Math.log((ship.dry + ship.fuel) / ship.dry); }
export function fuelForDv(ship, dv, ve) { return (ship.dry + ship.fuel) * (1 - Math.exp(-dv / ve)); }
```

- `export function makeRoad(galaxy, opts)`: `d = { ...ROAD_DIALS, ...(opts && opts.dials) }`; the ship `{ dry: STARTER.dry, fuel: STARTER.fuel, thrust: STARTER.thrust, x: w0.x, y: w0.y + w0.r, vx: 0, vy: 0, landed: 0, alive: true, ...(opts && opts.ship) }` where `w0` is `galaxy.worlds[0]`: the game starts landed on the first world. The state `{ t: 0, takeoffs: 0, spent: 0, hole: { born: false, r: star.r, mu: star.mu, edge: star.r, swallowed: [] }, events: [] }`. Returns a surface with the fields `galaxy, ship, dials, state` and these methods:
  - `wells()`: a list starting with the pit `{ x: star.x, y: star.y, mu: state.hole.mu, soft: star.soft, r: star.r, name: state.hole.born ? "hole" : "sun" }` followed by every world whose state is `"alive"` as `{ x, y, mu, soft, r, name: "world" }`, in world order.
  - `burn(ux, uy, dt)`: if the ship is landed, dead, or out of fuel, returns 0. Else `a = ship.thrust / (ship.dry + ship.fuel)`; `ship.vx += ux * a * dt; ship.vy += uy * a * dt`; `dm = Math.min(ship.fuel, ship.thrust * dt / d.ve)`; `ship.fuel -= dm; state.spent += dm`; returns `dm`. The caller hands a unit direction.
  - `tick(dt)`: `state.t += dt`. If the ship is not landed and alive: `[ax, ay] = accel(this.wells(), ship.x, ship.y)`, `vx += ax * dt`, `vy += ay * dt`, `x += vx * dt`, `y += vy * dt`; then if `Math.hypot(ship.x - star.x, ship.y - star.y) < star.r` the ship dies: `alive = false`, event `{ k: "fell", t }`. If the hole is born: `state.hole.edge += d.edgeSpeed * dt`; then for every alive world, in order of its surface distance from the pit (`Math.hypot(w.x, w.y) - w.r`, ascending), whose surface distance is at most `state.hole.edge`: `w.state = "gone"`, `state.hole.mu += w.mu`, `state.hole.swallowed.push(w.i)`, event `{ k: "swallow", i: w.i, t }`. Returns the events pushed this tick as a list.
  - `nearest()`: over alive worlds, the one with the least `Math.hypot(ship.x - w.x, ship.y - w.y) - w.r`; returns `{ w, i: w.i, dist }` or null when none.
  - `land()`: if landed or dead, returns `{ ok: false, reason: "state" }`. `n = this.nearest()`; if none or `n.dist > d.landR`, `{ ok: false, reason: "far" }`. `v = Math.hypot(ship.vx, ship.vy)`. If `v > d.crashV`: `ship.alive = false`, event `{ k: "death", t, v }`, return `{ ok: false, reason: "death", v }`. Else the descent burn: `need = fuelForDv(ship, escapeSpeed(n.w), d.ve)`, `dm = Math.min(ship.fuel, need)`, `ship.fuel -= dm; state.spent += dm`; `ship.landed = n.i; ship.vx = 0; ship.vy = 0; ship.x = n.w.x; ship.y = n.w.y + n.w.r`; `crash = v > d.landV`; event `{ k: crash ? "crash" : "land", i: n.i, t, v }`; return `{ ok: true, crash, load: v, world: n.i, fuel: dm }`.
  - `takeoff()`: if not landed or dead, `{ ok: false, reason: "state" }`. `w = galaxy.worlds[ship.landed]`; `need = fuelForDv(ship, escapeSpeed(w), d.ve)`; if `ship.fuel < need`, `{ ok: false, reason: "fuel" }`. Else `ship.fuel -= need; state.spent += need; state.takeoffs += 1; ship.landed = null; ship.x = w.x; ship.y = w.y + w.r + d.launchGap; ship.vx = d.launchV; ship.vy = 0`; event `{ k: "takeoff", i: w.i, t }`; if `state.takeoffs === galaxy.collapseAt` and the hole is not born, `this.collapse()`; return `{ ok: true, collapse: state.hole.born, fuel: need }`.
  - `collapse()`: `state.hole.born = true; state.hole.edge = star.r`; event `{ k: "collapse", t }`.
  - `schedule()`: for every alive world, `{ i: w.i, after: (Math.hypot(w.x, w.y) - w.r - star.r) / d.edgeSpeed }`, the seconds after the collapse at which the edge reaches it, sorted by `after` ascending. Computable before launch; independent of anything the player does.
  - `edgeFor(hull)`: `hull` is `{ dry, fuel }`; `dv = dvAvailable(hull, d.ve)`. For every world in order (index ascending, the pit's side first), `need_i = escapeSpeed(w_i) + Math.sqrt(2 * pull_i * lane_i)` where `pull_i = state.hole.mu / Math.pow(dist_i² + star.soft², 1.65)` with `dist_i = Math.hypot(w_i.x, w_i.y)`, and `lane_i` the distance from `w_i` to the next world (or to the gate for the last). Returns `{ index, needs }` where `index` is the least `i` with `dv >= need_i`, or `n` when no world is leavable, and `needs` the list of `need_i`. A heavier hull with the same fuel has less dv, so its index is never lower.
  - `hash()`: `stateHash([[ship.x, ship.y, ship.vx, ship.vy, ship.fuel, state.spent], [state.t, state.takeoffs, state.hole.edge, state.hole.mu, state.hole.born ? 1 : 0], [state.hole.swallowed.length, state.events.length]])`.
- `export const SHIP_CONTRACT` as a plain field description and `export function checkShip(s)` returning a list of plain problem strings, every problem in one pass: not an object gives `ship: not an object`; then `ship.dry: number > 0 required`, `ship.fuel: number >= 0 required`, `ship.thrust: number > 0 required`, and `ship.<f>: finite number required` for x, y, vx, vy.

The file header states: MODULE of the game GRAVITY'S ARK: road, the order's phase 0.0.104, frames 4 and 5 headless, every number PROPOSED from the order's scale table, the wells law the engine's own, no randomness.

Gate `scripts/gravitys-ark-test.mjs`: in your tree this file does not exist yet (phase 0.0.103 writes its first five checks). Write it new with the same header shape (the disc gate's `mulberry32`, the seed line `seeds {"gravitys-ark":<n>}`), then a stand-in galaxy maker used only by your checks, exactly this:

```js
// stand-in for phase 0.0.103's makeGalaxy, replaced by the real import at the landing
function standInGalaxy(seed) {
  const r = mulberry32(seed); const n = 8 + Math.floor(r() * 5); const worlds = []; const lane = 180000 / n;
  for (let i = 0; i < n; i++) { const R = 600 + r() * 800, g = 6 + r() * 8, soft = R / 4;
    worlds.push({ id: "w" + i, i, x: 20000 + lane * i + r() * lane * 0.6, y: (r() * 2 - 1) * 30000, r: R, g, soft, mu: g * Math.pow(R * R + soft * soft, 1.65), climate: "ROCK", ring: Math.floor(3 * i / n), holder: null, state: "alive", station: { faction: "charter", hands: 4 } }); }
  const star = { x: 0, y: 0, r: 4000, g: 30, soft: 1000, mu: 30 * Math.pow(4000 * 4000 + 1000 * 1000, 1.65) };
  return { seed, n, worlds, star, lanes: worlds.slice(1).map((w, i) => [i, i + 1]), gate: { x: worlds[n - 1].x + 15000, y: 0, toll: 8000, bill: { time: 120, scrap: 600, modules: 2 } }, collapseAt: r() < 0.5 ? 2 : 3 };
}
```

Your checks are numbered 6 to 11 and named as below; at the landing they are appended after the first five verbatim, with `standInGalaxy` replaced by the real `makeGalaxy`. Every check builds its galaxy from `standInGalaxy(SEED)` unless it says otherwise.

6. `ark: twin roads from one rolled seed end with one hash` — a burn tape: 300 entries drawn from the stream, each `{ burn: rng() < 0.1, ux: cos(a), uy: sin(a) }` with `a = rng() * 2 * Math.PI` (the angle drawn only when burn is true, in that order). Two roads over two galaxies from the same seed: `takeoff()` first, then for each entry `burn` when true then `tick(1 / 60)`: the two `hash()` values equal and the two event lists JSON-equal.
7. `ark: fuel is conserved on the road` — after the same tape on a fresh road, `ship.fuel + state.spent` equals `STARTER.fuel` within 1e-9.
8. `ark: the collapse fires on the seeded takeoff` — a fresh road: repeat: `takeoff()`, then set the ship back on world 0 by hand (`ship.x = w0.x; ship.y = w0.y + w0.r + 10; ship.vx = 0; ship.vy = 0`) and `land()`; after each takeoff assert `state.hole.born === (state.takeoffs >= galaxy.collapseAt)`; run four takeoffs; also assert the takeoff's return carries `collapse` true exactly on the collapse.
9. `ark: the hole's schedule is computable ahead and swallows worlds in distance order` — a fresh road; `takeoff()` then `collapse()` by hand; `sch = schedule()`; tick at 1/60 until `state.t` exceeds `sch[0].after` by one tick: the world `sch[0].i` is gone, was alive one tick before the edge reached it, `state.hole.mu` equals the star's mu plus that world's mu within 1e-9 relative, and `state.hole.swallowed` is `[sch[0].i]`.
10. `ark: the landing band` — 100 rolls: a fresh road with the ship placed by hand 20 m above world k's surface (`k = Math.floor(rng() * n)`, `ship.landed = null`, `ship.x = w.x`, `ship.y = w.y + w.r + 20`) with speed `v` rolled in 0 to 30 straight down (`vx = 0, vy = -v`), re-rolled while within 1e-6 of 7.5 or 22.5: `land()` gives `ok` true and `crash` false under 7.5; `ok` true, `crash` true, `load` v between; `ok` false, reason death, and the ship dead above 22.5.
11. `ark: the edge moves nearer for a heavier hull` — a fresh road with the hole born by hand (`takeoff()`, `collapse()`): `edgeFor({ dry: 3400, fuel: 2500 }).index <= edgeFor({ dry: 6800, fuel: 2500 }).index`; `edgeFor({ dry: 3400, fuel: 0 }).index === galaxy.n`; every `needs` entry is finite and positive.

In your tree the count line is `gravitys-ark-test: 6 PASS / 0 FAIL`, then `gravitys-ark-test PASS`, exit 0 (checks 6 to 11 only; the landing makes it 11). Any FAIL stops the task.

## Steps

1. Read the list above. Confirm.
2. Write the module in pieces.
3. Write the gate in pieces.
4. Run, from the worktree root, twice: `node scripts/gravitys-ark-test.mjs`. Both runs must print the seeds line, 6 PASS lines, the count line, and the verdict, exit 0. Paste both outputs whole in the report.
5. Write `docs/plans/phase-0.0.104-road.md` in the worktree, this shape:

```
# Phase 0.0.104 — road: the ship under gravity, the collapse, the hole, the edge

Status: PLANNED. Built in worktree, awaiting the landing.
<!-- At landing this line becomes: Status: LANDED, commit `<hash>`, <date>. Gate: 11 PASS / 0 FAIL; bracket unmoved. -->

The second phase of GRAVITY'S ARK under the order batch-ark-1: frames 4 and 5 headless. The ship flies under the wells law over every world and the pit; burns spend fuel as mass; LAND inside 40 m under 7.5 m/s, a crash between 7.5 and 22.5, death above; landings and takeoffs burn the world's escape speed; the collapse fires on the seeded takeoff; the hole's edge grows at a fixed speed and steps its mass at every world it swallows, on a schedule computable before launch; the edge for a hull is the nearest world it can still leave. <One more sentence in plain words: what the page will do with it.>

## Lift kind

No lift. New code to the order's scale table; every number PROPOSED; the wells law the engine's own.

## Rulings inside this plan

- No randomness in the road: every draw a game needs comes from the caller's tape.
- The gate's checks 6 to 11 run over a stand-in galaxy in the worktree and over the real one from the landing on.

## Acceptance arithmetic for the phase

Every number below is the run's output (rolled seeds <the two seeds>).

- `node scripts/gravitys-ark-test.mjs` prints a seeds line, 6 PASS lines in the worktree, then `gravitys-ark-test: 6 PASS / 0 FAIL`, then `gravitys-ark-test PASS`, exit 0; 11 at the landing.
- Bracket, run at the landing: gravitys-ark, wells, determinism.

## Tasks

- 0.0.104-1 — the road. → `task-0.0.104-1-road.md`
```

6. Commit on your branch, all three files, with this message exactly:

```
phase 0.0.104 — road: the ship under gravity, the collapse, the hole, the edge

GRAVITY'S ARK, the first road. The ship as a body under the wells law; burns as mass; the landing band and its charges; the collapse on the seeded takeoff; the hole's growth and steps on a schedule computable ahead; the edge per hull. Gate checks 6 to 11 green at rolled seeds.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01QSq3kZC3Bk9SC5RwnqYUfs
```

Do not push. Do not touch main.

## Rules

- No page, no DOM, no timers, no randomness in the module. Rolled seeds in the gate, printed. No literal that is one seed's own output.
- Never edit a demo file, the gate table, the README, the package version, the registry table, any engine module, or another phase's documents.

## Report

Read-confirmation first (each file, its line count). One line of outcome. Then bullets: both gate outputs whole; the diff summary (`git diff --stat $(git merge-base HEAD main)`); the commit hash on your branch; every nonconformity as its own labeled bullet. Fixture seeds: the two rolled seeds; no seed is special.

## The report's gate lines

- `node scripts/gravitys-ark-test.mjs` in the worktree over the stand-in galaxy: seeds 3764341314 and 3921624694; 6 PASS lines, `gravitys-ark-test: 6 PASS / 0 FAIL`, `gravitys-ark-test PASS`, exit 0, twice. At the landing, joined after the five landed checks over the real galaxy: `gravitys-ark-test: 11 PASS / 0 FAIL`, twice.
- Bracket at the landing: gravitys-ark, wells, determinism, every tail PASS.
- Branch commit 10addaa on phase/0.0.104-road, landed by squash into main; the gate file joined by hand, the stand-in replaced by the galaxy import.
- Nonconformities the agent named: edgeFor walks every world, alive or gone, the brief not saying; the lane length is the plain distance to the next world, the brief not giving the formula. Neither moved a law.
