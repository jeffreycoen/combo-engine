# Task 0.0.107-1 — wrecks: the collapse shell, welds under it, wreck fields, the grappler

One job: the fifth phase of GRAVITY'S ARK. A headless module for the shell that shoves everything outward at the collapse, the welds that break under it through the weldstress module, the wreck field that falls back toward the pit under the wells law, and the grappler that reels wrecks in on the grapple module's rope; and five more checks in the game's gate. Write exactly the design below, run the gate, write the phase document, commit on your branch, report. You design nothing beyond this brief; anything it did not foresee stops the task and is reported as a labeled nonconformity.

Model: Sonnet 5.

Where you work: the worktree at `/home/batman/combo-wt/wrecks`, branch `phase/0.0.107-wrecks`, cut from main before phases 0.0.103 to 0.0.106 land. The road and stations modules this phase consumes are not in your tree; the shapes it needs are fixed below and your gate builds them by hand. You never touch `/home/batman/combo-engine`. You never edit `scripts/gate.mjs`, `README.md`, `package.json`, `src/modules/registry/registry.js`, any module under `src/modules/`, or any document of another phase. You never edit a demo file.

Working method, required: no single response or tool call may carry more than about 150 lines of new text. Right after the read-confirmation, make your first write. Append each file piece by piece with bash heredocs and run `node --check` after each piece once it can parse. Keep your own reasoning short; this brief has made every decision.

Required reading, in order, whole (confirm each with its line count at the top of your report):
1. This file.
2. `/home/batman/combo-engine/docs/plans/batch-ark-1.md`, the sections "The scale table", "The rules of the run", and "Stream S, the space frames".
3. `/home/batman/combo-wt/wrecks/src/modules/wells/wells.js`, lines 1 to 41.
4. `/home/batman/combo-wt/wrecks/src/modules/weldstress/weldstress.js`, whole.
5. `/home/batman/combo-wt/wrecks/src/modules/builder/builder.js`, whole.
6. `/home/batman/combo-wt/wrecks/src/modules/grapple/grapple.js`, whole.
7. `/home/batman/combo-wt/wrecks/src/modules/ledger/ledger.js`, whole.
8. `/home/batman/combo-wt/wrecks/src/modules/determinism/determinism.js`, whole.
9. `/home/batman/combo-wt/wrecks/scripts/disc-test.mjs`, lines 1 to 40.
10. `/home/batman/combo-wt/wrecks/docs/plans/phase-0.0.73-aim.md`, as the shape of a phase document.

## The shapes this phase consumes, fixed by phases 0.0.103 to 0.0.106

- A galaxy `{ worlds, star }`: each world `{ id, i, x, y, r, g, soft, mu, state }`; the star `{ x: 0, y: 0, r, g, soft, mu }`.
- A wells list, the road's `wells()`: `[{ x, y, mu, soft, r, name }, ...]`, the pit first.
- A hull, the stations module's: `{ builder, list, scrap, spares, cargo }` where `builder` is `makeBuilder({ spec: MODULES, cell: 1.7, weldStrength: 1.2e5, weldWeak: 5e4, baseFuel: 0 })` over the module table below and `list` is `[{ t, gx, gy }, ...]` with the bridge first.
- The ship body, the road's ship: `{ x, y, vx, vy, dry, fuel }`.

```js
export const MODULES = {
  bridge: { kg: 900, price: 12000, ports: ["E", "W", "N", "S"] }, engine: { kg: 1400, price: 9000, thrust: 60000, ports: ["E", "N", "S"] },
  pod: { kg: 600, price: 4500, holds: 2000, ports: ["E", "W", "N", "S"] }, tank: { kg: 500, price: 3800, tank: 3000, ports: ["E", "W", "N", "S"] },
  shield: { kg: 1100, price: 11000, ports: ["W"] }, mount: { kg: 800, price: 7500, ports: ["W"] }, strut: { kg: 150, price: 900, weak: true, ports: ["E", "W", "N", "S"] },
  rcs: { kg: 250, price: 2600, ports: ["E", "W", "N", "S"] }, rack: { kg: 550, price: 6500, ports: ["W"] }, grapple: { kg: 400, price: 5200, ports: ["W"] }, mechbay: { kg: 1800, price: 8000, ports: ["W"] },
};
export const STARTER_HULL = [{ t: "bridge", gx: 0, gy: 0 }, { t: "engine", gx: -1, gy: 0 }, { t: "tank", gx: 1, gy: 0 }, { t: "pod", gx: 0, gy: 1 }];
```

(This table is repeated here so your tree can build a hull; at the landing the module imports it from `./stations.js` and the copy is removed. Write the copy as `const MODULES`, not exported, so the swap is one line.)

## The design, fixed

New file `src/games/gravitys-ark/wrecks.js`. Imports: `accel` from `../../modules/wells/wells.js`; `weldLoads, breaking, splitByRoot` from `../../modules/weldstress/weldstress.js`; `castGrapple, bite, tapGrapple, stepFly, stepRewind, stepRope, GRAP` from `../../modules/grapple/grapple.js`; nothing else. No randomness inside the module: every draw comes through an `rng` argument.

```js
export const WRECK_DIALS = { shellDv: 120, shellR: 60000, shellT: 2, fieldN: 12, fieldR: 40000, fieldMin: 6000, scrapMin: 200, scrapMax: 1500, crateMin: 300, crateMax: 2000, biteR: 6, takeR: GRAP.CLOSE, headKg: 15 };
export const WRECK_KINDS = ["scrap", "crate", "module", "hull"];
```

- `export function shellDv(dist, d)`: `d.shellDv / (1 + Math.pow(dist / d.shellR, 2))`: the shove, weaker with distance.
- `export function shell(bodies, star, d)`: for every body `{ x, y, vx, vy, mass }`: `dist = Math.hypot(b.x - star.x, b.y - star.y)`; the outward unit direction (for dist 0, `[1, 0]`); `dv = shellDv(dist, d)`; `b.vx += ux * dv; b.vy += uy * dv`. Returns the list of dv values in order. Worlds and stations are never handed in.
- `export function shellOnHull(hull, star, ship, d)`: the shell's acceleration on the hull `a = shellDv(dist, d) / d.shellT` where dist is the ship's distance from the pit; `ws = hull.builder.weldsOf(hull.list)`; `loads = weldLoads(hull.builder, MODULES, hull.list, ws, a)`; `broken = breaking(loads, ws)`; if none broken return `{ shed: [], kept: hull.list, a }`; else `ws2 = ws.filter((w, k) => !broken.includes(k))` (breaking returns the indices of the welds that break; read weldstress to confirm and use its own shape), `split = splitByRoot(hull.builder, hull.list, ws2, 0)` (the bridge is index 0), replace `hull.list` with the kept modules, and return `{ shed, kept, a }` where `shed` is the list of shed module records.
- `export function wreckOf(kind, x, y, vx, vy, mass, extra)`: `{ kind, x, y, vx, vy, mass, taken: false, ...extra }`.
- `export function shedToWrecks(shed, ship, rng)`: one wreck per shed module: `wreckOf("module", ship.x + (rng() * 2 - 1) * 20, ship.y + (rng() * 2 - 1) * 20, ship.vx, ship.vy, MODULES[m.t].kg, { module: m.t })`, the two draws per module in that order.
- `export function makeField(star, rng, d)`: `d.fieldN` wrecks at rolled positions around the pit: for each, in order: `dist = d.fieldMin + rng() * (d.fieldR - d.fieldMin)`, `ang = rng() * 2 * Math.PI`, `kind = WRECK_KINDS[Math.floor(rng() * 4)]`, then the mass: scrap `d.scrapMin + rng() * (d.scrapMax - d.scrapMin)`; crate: mass 200 and `value = Math.round(d.crateMin + rng() * (d.crateMax - d.crateMin))`; module: `module = Object.keys(MODULES)[Math.floor(rng() * 11)]` and mass its kg; hull: mass `1000 + rng() * 2000`. Position `star.x + Math.cos(ang) * dist, star.y + Math.sin(ang) * dist`, velocity zero, then `shell([w], star, d)` gives it the shove. Returns the list.
- `export function stepWrecks(wrecks, wells, dt)`: for every wreck not taken: `[ax, ay] = accel(wells, w.x, w.y)`; `vx += ax * dt; vy += ay * dt; x += vx * dt; y += vy * dt`.
- `export function makeGrappler(ship)`: `{ g: null, ship2d: null, target: null, hooked: null }`.
- `export function ship2d(ship, mass)`: `{ x: ship.x, y: ship.y, vx: ship.vx, vy: ship.vy, w: 0, ang: 0, M: mass, I: mass * 4 }`.
- `export function cast(gr, ship, mass, wreck, d)`: `gr.ship2d = ship2d(ship, mass)`; `gr.ship2d.ang = Math.atan2(wreck.y - ship.y, wreck.x - ship.x)`; `gr.g = castGrapple(gr.ship2d, ship.x, ship.y, 0)`; `gr.target = wreck`; write the recoil back: `ship.vx = gr.ship2d.vx; ship.vy = gr.ship2d.vy`. Returns `gr.g`.
- `export function stepGrappler(gr, ship, mass, wells, dt, d)`: if no `gr.g` return null. Sync `gr.ship2d` from the ship (x, y, vx, vy, M). By state: `"fly"`: `stepFly(gr.g, (x, y) => accel(wells, x, y), ship.x, ship.y, dt)`; if the head is within `d.biteR` of the target, `bite(gr.g)` then `tapGrapple(gr.g)` (stuck to reel at once); `"rewind"`: `stepRewind(gr.g, ship.x, ship.y, dt)` and when it returns null, `gr.g = null`; `"stuck"` or `"reel"`: `stepRope(gr.g, gr.ship2d, ship.x, ship.y, gr.target, gr.target.mass, dt)`, then write the ship's velocity back from `gr.ship2d`, and if the target is within `d.takeR` of the ship, take it: `gr.target.taken = true; gr.hooked = gr.target; gr.g = null; return { taken: gr.target }`. Returns `{ state }` otherwise. Read the grapple module whole for the states and use them exactly.
- `export function take(hull, purse, wreck)`: by kind: scrap `hull.scrap += wreck.mass`; module `hull.spares.push(wreck.module)`; crate `purse.credits += wreck.value` and `hull.scrap += wreck.mass`; hull `hull.scrap += wreck.mass`. Returns the kind.
- `export function massOf(hull, wrecks)`: `hull.scrap + hull.spares.reduce((s, k) => s + MODULES[k].kg, 0) + wrecks.filter((w) => !w.taken).reduce((s, w) => s + w.mass, 0)`: the mass the ledger audits.
- `export const WRECK_CONTRACT` and `export function checkWreck(w)`: not an object gives `wreck: not an object`; then `wreck.kind: one of scrap, crate, module, hull required`, `wreck.mass: number > 0 required`, and `wreck.<f>: finite number required` for x, y, vx, vy.

The file header states: MODULE of the game GRAVITY'S ARK: wrecks, the order's phase 0.0.107, frames 4 and 6 headless, every number PROPOSED from the order's scale table, the weld law the weldstress module's, the rope the grapple module's, the fall the wells law.

Gate `scripts/gravitys-ark-test.mjs`: in your tree write it new with the disc gate's `mulberry32` and the seed line `seeds {"gravitys-ark":<n>}`. A stand-in star `{ x: 0, y: 0, r: 4000, g: 30, soft: 1000, mu: 30 * Math.pow(4000 * 4000 + 1000 * 1000, 1.65) }` and a wells list `[{ ...star, name: "hole" }]`. A hull from `makeBuilder` over the module table and `STARTER_HULL` as the stations shape says. Checks numbered 18 to 22, named as below; at the landing they are appended after the first seventeen verbatim.

18. `ark: the shell's shove falls off with distance, points outward, and never touches worlds` — 100 rolled bodies at rolled distances 1,000 to 200,000 m: every dv equals `shellDv(dist)`; sorted by distance the dv never rises; every velocity change points outward (its dot with the outward unit is positive); a worlds list handed alongside is untouched (JSON equal before and after).
19. `ark: the shell breaks welds by the weldstress law and the shed modules become wrecks with their mass` — a starter hull with the ship at a rolled distance under 20,000 m: `shellOnHull` gives `a`; recompute `weldLoads` and `breaking` in the check the same way and assert the shed set equals the split's shed and `hull.list` equals the kept set; `shedToWrecks` gives one wreck per shed module whose masses sum to the shed kilograms; a starter hull at 500,000 m sheds nothing.
20. `ark: wrecks fall toward the pit under the wells law` — a field from `makeField`; one `stepWrecks` of 1/60 from rest (zero the velocities first): every wreck's new velocity points toward the pit (its dot with the direction to the pit is positive), and its magnitude equals the wells pull at its position times dt within 1e-9 relative.
21. `ark: the grappler reels a wreck in and books its mass on the ledger` — a scrap wreck at rest 40 m from a ship at rest, mass 3400 dry: `cast`, then `stepGrappler` at 1/60 until it returns a taken result, at most 3,000 steps; `take` moves the wreck's mass into `hull.scrap`; a ledger with dimension mass, genesis the field's mass plus the hull's scrap, sources hull and wrecks through `massOf`, audits ok with zero drift before and after.
22. `ark: twin wreck fields from one rolled seed agree` — two fields from twin streams stepped 60 ticks: JSON-equal.

In your tree the count line is `gravitys-ark-test: 5 PASS / 0 FAIL`, then `gravitys-ark-test PASS`, exit 0 (checks 18 to 22 only; the landing makes it 22). Any FAIL stops the task.

## Steps

1. Read the list above. Confirm.
2. Write the module in pieces.
3. Write the gate in pieces.
4. Run, from the worktree root, twice: `node scripts/gravitys-ark-test.mjs`. Both runs must print the seeds line, 5 PASS lines, the count line, and the verdict, exit 0. Paste both outputs whole in the report.
5. Write `docs/plans/phase-0.0.107-wrecks.md` in the worktree, this shape:

```
# Phase 0.0.107 — wrecks: the collapse shell, welds under it, wreck fields, the grappler

Status: PLANNED. Built in worktree, awaiting the landing.
<!-- At landing this line becomes: Status: LANDED, commit `<hash>`, <date>. Gate: 22 PASS / 0 FAIL; the full self-test all gates PASS. -->

The fifth phase of GRAVITY'S ARK under the order batch-ark-1: frames 4 and 6 headless. At the collapse a shell shoves every body outward, weaker with distance, and never worlds or stations; the hull's welds take the shove as a load by the weldstress module's law and shed what breaks as wrecks with their mass; a field of wrecks falls back toward the pit under the wells law; the grappler casts on the grapple module's rope, bites, reels with the pull both ways, and takes what comes within reach: scrap by the kilogram, crates with credits, modules as spares. <One more sentence in plain words: what the page will do with it.>

## Lift kind

No lift. New code to the order's scale table; every number PROPOSED; the weld, rope, and fall laws the engine's own.

## Rulings inside this plan

- The bite and the take are the game's own radii; the rope's account is the grapple module's.
- The full self-test runs at this landing, the order's midpoint.

## Acceptance arithmetic for the phase

Every number below is the run's output (rolled seeds <the two seeds>).

- `node scripts/gravitys-ark-test.mjs` prints a seeds line, 5 PASS lines in the worktree, then `gravitys-ark-test: 5 PASS / 0 FAIL`, then `gravitys-ark-test PASS`, exit 0; 22 at the landing.
- Bracket, run at the landing: gravitys-ark, weldstress, grapple, wells, ledger, then the full self-test.

## Tasks

- 0.0.107-1 — the wrecks. → `task-0.0.107-1-wrecks.md`
```

6. Commit on your branch, all three files, with this message exactly:

```
phase 0.0.107 — wrecks: the collapse shell, welds under it, wreck fields, the grappler

GRAVITY'S ARK, the first road. The shell at the collapse shoves bodies outward and never worlds; welds under it break by the weldstress law and shed wrecks with their mass; wreck fields fall to the pit under the wells law; the grappler reels them in on the grapple module's rope and books the mass. Gate checks 18 to 22 green at rolled seeds.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01QSq3kZC3Bk9SC5RwnqYUfs
```

Do not push. Do not touch main.

## Rules

- No page, no DOM, no timers, no randomness in the module. Rolled seeds in the gate, printed. No literal that is one seed's own output.
- Never edit a demo file, the gate table, the README, the package version, the registry table, any engine module, or another phase's documents.

## Report

Read-confirmation first (each file, its line count). One line of outcome. Then bullets: both gate outputs whole; the diff summary (`git diff --stat $(git merge-base HEAD main)`); the commit hash on your branch; every nonconformity as its own labeled bullet. Fixture seeds: the two rolled seeds; no seed is special.
