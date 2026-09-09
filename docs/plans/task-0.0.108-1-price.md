# Task 0.0.108-1 — price: the Wreckers' lock, her price, the factions' listings, the bounty, the hire-out

One job: the sixth phase of GRAVITY'S ARK. A headless module for frame 7, written new from the design document's words: the pirate's lock and its demand, pay or outrun, the shot clock; her price rising every ring and the factions' listings that follow it; the Authority's bounty; the Charter's hire-out on the escrow module; and five more checks in the game's gate. Write exactly the design below, run the gate, write the phase document, commit on your branch, report. You design nothing beyond this brief; anything it did not foresee stops the task and is reported as a labeled nonconformity.

Model: Sonnet 5.

Where you work: the worktree at `/home/batman/combo-wt/price`, branch `phase/0.0.108-price`, cut from main after phase 0.0.103 landed. The stations module this phase consumes is not in your tree; the escrow stations shape it needs is fixed below and your gate builds it by hand. You never touch `/home/batman/combo-engine`. You never edit `scripts/gate.mjs`, `README.md`, `package.json`, `src/modules/registry/registry.js`, any module under `src/modules/`, `src/games/gravitys-ark/galaxy.js`, or any document of another phase. You never edit a demo file.

Working method, required: no single response or tool call may carry more than about 150 lines of new text. Right after the read-confirmation, make your first write. Append each file piece by piece with bash heredocs and run `node --check` after each piece once it can parse. Keep your own reasoning short; this brief has made every decision.

Required reading, in order, whole (confirm each with its line count at the top of your report):
1. This file.
2. `/home/batman/combo-engine/docs/plans/batch-ark-1.md`, the sections "The scale table", "The rules of the run", and "Stream S, the space frames".
3. `/home/batman/combo-wt/price/src/games/gravitys-ark/galaxy.js`, whole: the landed galaxy maker your gate uses.
4. `/home/batman/combo-wt/price/src/modules/escrow/escrow.js`, whole.
5. `/home/batman/combo-wt/price/src/modules/ledger/ledger.js`, whole.
6. `/home/batman/combo-wt/price/src/modules/determinism/determinism.js`, whole.
7. `/home/batman/combo-wt/price/scripts/gravitys-ark-test.mjs`, whole: the game's gate with its first five checks, which you extend.
8. `/home/batman/combo-wt/price/docs/plans/phase-0.0.103-galaxy.md`, as the shape of a phase document.

## The shapes this phase consumes

- The galaxy from `makeGalaxy(seed)`: worlds `{ id, i, x, y, r, ring, holder, station: { faction, hands } }`, the star, the gate; `holder === "wreckers"` marks a pirate world.
- A ship body `{ x, y, vx, vy }`.
- The escrow stations shape, `{ [sid]: { credits, cool, parts: { [part]: { q, c } } } }`, and a book from `makeBook()`.
- The hole state `{ born, edge }` from the road.

## The design, fixed

New file `src/games/gravitys-ark/price.js`. Imports: `postRescueAt, fulfilContract` from `../../modules/escrow/escrow.js`; nothing else. No randomness inside the module: every draw comes through an `rng` argument.

```js
export const PRICE_DIALS = { sight: 2700, lockR: 140, lockT: 6, shotEvery: 4, shotDamage: 150, outrun: 1.5, bounty: 3000, authorityCredits: 40000, herBase: 4000, herRise: 0.5, fittersBid: 1.25, hireBase: 1500, hireRange: 60000, hireDuration: 120, pirateSpeed: 45, pirateAccel: 2.6, roostR: 6000, pirateCredits: 3000 };
export const FACTIONS = ["authority", "charter", "militia", "fitters", "wreckers"];
```

- `export function herPrice(ring, d)`: `Math.round(d.herBase * (1 + d.herRise * ring))`: her price rises every ring.
- `export function cargoValue(hull, scrapPrice)`: `hull.scrap * scrapPrice + hull.cargo.people * 650 + hull.spares.length * 3000`.
- `export function listingsFor(ring, cargo, d)`: `{ authority: { bounty: d.bounty }, charter: { hire: d.hireBase }, militia: { conscript: 0 }, fitters: { her: Math.round(herPrice(ring, d) * d.fittersBid) }, wreckers: { demand: Math.max(herPrice(ring, d), cargo), takes: cargo > herPrice(ring, d) ? "cargo" : "her" } }`: the factions speak only in prices; nobody explains anything.
- `export function makePirates(galaxy, rng, d)`: for every world whose holder is `"wreckers"`, in order, a roost at `ang = rng() * 2 * Math.PI`, `dist = d.roostR * (0.5 + rng() * 0.5)` (two draws in that order): `{ i: w.i, x: w.x + Math.cos(ang) * dist, y: w.y + Math.sin(ang) * dist, vx: 0, vy: 0, home: { x, y } (the same point), state: "roost", lockT: 0, shotT: 0, demand: null, credits: d.pirateCredits, alive: true }`. Returns `{ list, authority: { credits: d.authorityCredits }, dials: d }`.
- `export function stepPirates(P, ship, ring, cargo, dt)`: for every living pirate, `dist = Math.hypot(ship.x - p.x, ship.y - p.y)`; the events pushed to a list this call returns:
  - `"roost"`: if `dist < d.sight`, `p.state = "chase"`, event `{ k: "chase", i }`. Else drift home: move toward `home` at `d.pirateSpeed` when farther than 1 m from it.
  - `"chase"`: accelerate toward the ship: the unit direction times `d.pirateAccel * dt` added to the velocity, the speed capped at `d.pirateSpeed`; integrate; if `dist < d.lockR`: `p.state = "lock"; p.lockT = d.lockT; p.shotT = 0; p.demand = listingsFor(ring, cargo, d).wreckers`; event `{ k: "lock", i, demand: p.demand }`. If `dist > d.sight * d.outrun`: `p.state = "roost"; p.demand = null`, event `{ k: "outrun", i }`.
  - `"lock"`: match the ship's velocity (`p.vx = ship.vx; p.vy = ship.vy`) and integrate; if `dist > d.sight * d.outrun`: back to roost as above with the outrun event, the demand cleared. Else `p.lockT -= dt`; when `p.lockT <= 0` and it was above 0 before this tick, event `{ k: "fire", i }` and `p.shotT = d.shotEvery`, `p.state = "fire"`.
  - `"fire"`: as lock for motion and the outrun test; `p.shotT -= dt`; each time it reaches 0 or below, event `{ k: "shot", i, damage: d.shotDamage }` and `p.shotT += d.shotEvery`. The first shot is the one at the end of `lockT`; count it as fired by the `fire` event, and the next comes `shotEvery` later.
- `export function pay(P, p, hull, her)`: if `!p.demand` return null; `takes = p.demand.takes`; if `takes === "cargo"`: `p.loot = { scrap: hull.scrap, people: hull.cargo.people, spares: hull.spares.slice() }; hull.scrap = 0; hull.cargo.people = 0; hull.spares = []`; else `her.taken = true`. `p.state = "roost"; p.demand = null`; returns `takes`.
- `export function killPirate(P, p, purse)`: if `!p.alive` return 0; `p.alive = false`; `b = Math.min(P.authority.credits, P.dials.bounty)`; `P.authority.credits -= b; purse.credits += b`; returns `b`.
- `export function hireValue(station, hole, d)`: `closeness = hole.born ? Math.max(0, 1 - Math.max(0, Math.hypot(station.x, station.y) - hole.edge) / d.hireRange) : 0`; returns `Math.round(d.hireBase * (1 + closeness))`: more the closer the job is to the edge.
- `export function hireOut(book, stations, sid, station, hole, her, t, d)`: if `her.away` return null; `ct = postRescueAt(book, stations, sid, hireValue(station, hole, d))`; if `!ct` return null; `her.away = { until: t + d.hireDuration, ct }`; returns `ct`.
- `export function herReturns(stations, her, purse, t, dials)`: if `!her.away || t < her.away.until` return 0; `pay = fulfilContract(stations, her.away.ct, dials)`; `purse.credits += pay; her.away = null`; returns `pay`. While she is away, the page skips her repairs; that is the page's.
- `export const PIRATE_CONTRACT` and `export function checkPirate(p)`: not an object gives `pirate: not an object`; then `pirate.state: one of roost, chase, lock, fire required`, `pirate.credits: number >= 0 required`, and `pirate.<f>: finite number required` for x, y, vx, vy.

The file header states: MODULE of the game GRAVITY'S ARK: price, the order's phase 0.0.108, frame 7 headless, written new from the design document's words under the owner's ruling, every number PROPOSED from the order's scale table, the hire-out's escrow the escrow module's.

Gate `scripts/gravitys-ark-test.mjs`: the landed five checks stay verbatim; append these, numbered 23 to 27, after them, with the import line gaining the price module's exports and `makeBook` from escrow and `makeLedger` from ledger. Every check builds `G = makeGalaxy(SEED)` and `P = makePirates(G, rng)`; when the galaxy holds no wreckers world, the check sets `G.worlds[1].holder = "wreckers"` before making the pirates and says so in its own name-free way (no output line). Then:

23. `ark: the lock, the demand, pay or outrun, and the shot clock` — the first pirate; a ship placed at rest 2,000 m from it: one step gives a chase event and state chase; then the ship placed 100 m from the pirate and stepped once: a lock event with `demand.demand` equal to `Math.max(herPrice(ring), cargo)` for a rolled cargo value and ring; then the ship moved to 5,000 m and stepped: an outrun event, state roost, demand null; then a fresh lock (ship held at 100 m): stepping at 1/60, the fire event comes on the tick at which the summed dt first reaches lockT, within one tick, and the next shot event comes `shotEvery` later within one tick, carrying `damage` 150; `pay` with a cargo demand moves the hull's scrap, people, and spares to the pirate's loot and clears the demand; with a her demand it marks her taken.
24. `ark: her price rises every ring and the listings follow it` — `herPrice` strictly rising over rings 0, 1, 2; for 50 rolled cargo values, `listingsFor(ring, cargo).wreckers.demand` equals the larger of her price and the cargo, and `takes` names the larger; the fitters' bid is above her price at every ring.
25. `ark: the bounty moves from the Authority's purse` — a ledger with dimension credits, genesis the authority's credits plus a purse of 1,000, sources authority and purse: `killPirate` pays 3,000 into the purse and takes it from the authority; a second kill of the same pirate pays 0; the audit is ok with zero drift throughout.
26. `ark: the hire-out pays more nearer the edge and pays once` — a stations object with two charter stations built by hand (credits 15,000, cool 0, parts `{}`), one at 30,000 m from the pit and one at 120,000 m, the hole born with edge 10,000 m: `hireValue` is higher for the nearer; `hireOut` at the nearer posts a contract whose escrow equals the escrow module's own fee law (600 plus 30% of the value, capped by the treasury) and marks her away; `herReturns` before `until` pays 0; at `until` it pays the escrow once; a second call pays 0; a ledger over the purse, the stations' credits, and the open escrow audits ok with zero drift throughout.
27. `ark: twin pirate fields from one rolled seed agree` — two `makePirates` from twin streams, stepped 120 ticks against the same ship script (the ship at rest 2,000 m from the first pirate): JSON-equal.

The count line becomes `gravitys-ark-test: 10 PASS / 0 FAIL`, then `gravitys-ark-test PASS`, exit 0 (the five landed plus five). Any FAIL stops the task.

## Steps

1. Read the list above. Confirm.
2. Write the module in pieces.
3. Extend the gate in pieces.
4. Run, from the worktree root, twice: `node scripts/gravitys-ark-test.mjs`. Both runs must print the seeds line, 10 PASS lines, the count line, and the verdict, exit 0. Paste both outputs whole in the report.
5. Write `docs/plans/phase-0.0.108-price.md` in the worktree, this shape:

```
# Phase 0.0.108 — price: the Wreckers' lock, her price, the listings, the bounty, the hire-out

Status: PLANNED. Built in worktree, awaiting the landing.
<!-- At landing this line becomes: Status: LANDED, commit `<hash>`, <date>. Gate: 27 PASS / 0 FAIL; bracket unmoved. -->

The sixth phase of GRAVITY'S ARK under the order batch-ark-1: frame 7 headless, written new from the design document's words. A pirate at its roost sees a hull inside its sight, chases, locks inside its lock range, and demands her or the cargo, whichever lists higher; the hull pays or outruns, or the shots start six seconds later and come every four; her price rises every ring and every faction's listing follows it; the Authority pays a bounty from its own purse; the Charter hires her out on the escrow module's law, paying more the closer the job is to the edge. <One more sentence in plain words: what the page will do with it.>

## Lift kind

No lift. New code from the design document's words under the owner's ruling; every number PROPOSED; the escrow the engine's own.

## Rulings inside this plan

- The factions speak only in prices; nobody explains anything.
- Paying the pirate hands over the thing demanded, never credits.

## Acceptance arithmetic for the phase

Every number below is the run's output (rolled seeds <the two seeds>).

- `node scripts/gravitys-ark-test.mjs` prints a seeds line, 10 PASS lines in the worktree, then `gravitys-ark-test: 10 PASS / 0 FAIL`, then `gravitys-ark-test PASS`, exit 0; 27 at the landing.
- Bracket, run at the landing: gravitys-ark, escrow, ledger.

## Tasks

- 0.0.108-1 — the price. → `task-0.0.108-1-price.md`
```

6. Commit on your branch, all three files, with this message exactly:

```
phase 0.0.108 — price: the Wreckers' lock, her price, the listings, the bounty, the hire-out

GRAVITY'S ARK, the first road. Frame 7 headless, new from the design document's words: the pirate's sight, chase, lock, demand, pay or outrun, and shot clock; her price by ring and the factions' listings; the Authority's bounty; the Charter's hire-out on the escrow. Gate checks 23 to 27 green at rolled seeds.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01QSq3kZC3Bk9SC5RwnqYUfs
```

Do not push. Do not touch main.

## Rules

- No page, no DOM, no timers, no randomness in the module. Rolled seeds in the gate, printed. No literal that is one seed's own output.
- The landed checks stay verbatim; only the count line moves.
- Never edit a demo file, the gate table, the README, the package version, the registry table, any engine module, the galaxy module, or another phase's documents.

## Report

Read-confirmation first (each file, its line count). One line of outcome. Then bullets: both gate outputs whole; the diff summary (`git diff --stat $(git merge-base HEAD main)`); the commit hash on your branch; every nonconformity as its own labeled bullet. Fixture seeds: the two rolled seeds; no seed is special.
