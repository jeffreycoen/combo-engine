# Task 0.0.106-1 — stations: pools, hands, wages, listings, the build screen, the people contract

One job: the fourth phase of GRAVITY'S ARK. A headless module for the ring's ordinary business on the engine's market, escrow, builder, and ledger modules; and six more checks in the game's gate. Write exactly the design below, run the gate, write the phase document, commit on your branch, report. You design nothing beyond this brief; anything it did not foresee stops the task and is reported as a labeled nonconformity.

Model: Sonnet 5.

Where you work: the worktree at `/home/batman/combo-wt/stations`, branch `phase/0.0.106-stations`, cut from main before phases 0.0.103 to 0.0.105 land. The galaxy module this phase consumes is not in your tree; its shape is fixed below and your gate uses a stand-in for it exactly as given, which the landing replaces with the real import. You never touch `/home/batman/combo-engine`. You never edit `scripts/gate.mjs`, `README.md`, `package.json`, `src/modules/registry/registry.js`, any module under `src/modules/`, or any document of another phase. You never edit a demo file.

Working method, required: no single response or tool call may carry more than about 150 lines of new text. Right after the read-confirmation, make your first write. Append each file piece by piece with bash heredocs and run `node --check` after each piece once it can parse. Keep your own reasoning short; this brief has made every decision.

Required reading, in order, whole (confirm each with its line count at the top of your report):
1. This file.
2. `/home/batman/combo-engine/docs/plans/batch-ark-1.md`, the sections "The scale table", "The rules of the run", and "Stream S, the space frames".
3. `/home/batman/combo-wt/stations/src/modules/market/market.js`, whole.
4. `/home/batman/combo-wt/stations/src/modules/escrow/escrow.js`, whole.
5. `/home/batman/combo-wt/stations/src/modules/builder/builder.js`, whole.
6. `/home/batman/combo-wt/stations/src/modules/ledger/ledger.js`, whole.
7. `/home/batman/combo-wt/stations/src/modules/determinism/determinism.js`, whole.
8. `/home/batman/combo-wt/stations/scripts/disc-test.mjs`, lines 1 to 40.
9. `/home/batman/combo-wt/stations/docs/plans/phase-0.0.73-aim.md`, as the shape of a phase document.

## The galaxy shape this phase consumes, fixed by phase 0.0.103

`{ seed, n, worlds, star, lanes, gate, collapseAt }`; each world `{ id, i, x, y, r, g, soft, mu, climate, ring, holder, state, station: { faction, hands } }`, sorted by x. Names for people: `rollPerson(rng)` returns `{ name, sex }`; in your tree use the stand-in below.

## The design, fixed

New file `src/games/gravitys-ark/stations.js`. Imports: `poolBuy, poolSell, price1` from `../../modules/market/market.js`; `makeBook, fulfilContract, stepContracts` from `../../modules/escrow/escrow.js`; `makeBuilder` from `../../modules/builder/builder.js`; nothing else. No randomness inside the module: every draw comes through an `rng` argument.

```js
export const STATION_DIALS = { handsBase: 650, handsRise: 0.06, wagePerDay: 40, daySeconds: 600, scrapPrice: 2, fuelPrice: 3, pitBias: 0.5, biasRange: 60000, scrapQ: 20000, fuelQ: 20000, moduleQ: 3, credits: 15000, farPeople: 1, personKg: 80 };
export const MODULES = {
  bridge: { kg: 900, price: 12000, ports: ["E", "W", "N", "S"] }, engine: { kg: 1400, price: 9000, thrust: 60000, ports: ["E", "N", "S"] },
  pod: { kg: 600, price: 4500, holds: 2000, ports: ["E", "W", "N", "S"] }, tank: { kg: 500, price: 3800, tank: 3000, ports: ["E", "W", "N", "S"] },
  shield: { kg: 1100, price: 11000, ports: ["W"] }, mount: { kg: 800, price: 7500, ports: ["W"] }, strut: { kg: 150, price: 900, weak: true, ports: ["E", "W", "N", "S"] },
  rcs: { kg: 250, price: 2600, ports: ["E", "W", "N", "S"] }, rack: { kg: 550, price: 6500, ports: ["W"] }, grapple: { kg: 400, price: 5200, ports: ["W"] }, mechbay: { kg: 1800, price: 8000, ports: ["W"] },
};
export const STARTER_HULL = [{ t: "bridge", gx: 0, gy: 0 }, { t: "engine", gx: -1, gy: 0 }, { t: "tank", gx: 1, gy: 0 }, { t: "pod", gx: 0, gy: 1 }];
export const PART_ORDER = ["people", "scrap", "fuel"];
```

- `export function biasAt(w, d)`: `1 + d.pitBias * Math.max(0, 1 - Math.hypot(w.x, w.y) / d.biasRange)`: listings are dearer nearer the pit.
- `export function makeStations(galaxy, opts)`: `d = { ...STATION_DIALS, ...(opts && opts.dials) }`. For every world `w`, a station keyed by `w.id`: `{ credits: d.credits, cool: 0, faction: w.station.faction, bias: b, i: w.i, parts }` with `b = biasAt(w, d)` and `parts`: `scrap: { q: d.scrapQ, c: Math.round(d.scrapPrice * b * d.scrapQ) }`, `fuel: { q: d.fuelQ, c: Math.round(d.fuelPrice * b * d.fuelQ) }`, `people: { q: w.ring === 2 ? d.farPeople : w.station.hands, c: Math.round(d.handsBase * b * Math.max(1, w.ring === 2 ? d.farPeople : w.station.hands)) }`, and for every module kind `k` a part `"mod:" + k`: `{ q: d.moduleQ, c: Math.round(MODULES[k].price * b * d.moduleQ) }`. Returns `{ stations, book: makeBook(), dials: d, hired: 0, wagesPaid: 0 }`.
- `export function makePurse(credits, t)`: `{ credits, debt: 0, lastDock: t }`.
- `export function listings(S, sid)`: `{ scrap: price1(p.scrap), fuel: price1(p.fuel), hands: hirePrice(S, sid), modules: { k: price1(p["mod:" + k]) for every kind } }`.
- `export function hirePrice(S, sid)`: `Math.ceil(S.dials.handsBase * S.stations[sid].bias * Math.pow(1 + S.dials.handsRise, S.hired))`.
- `export function hire(S, sid, purse, rng, t)`: the station's people part; if its `q <= 1` return null; `price = hirePrice(S, sid)`; if `purse.credits < price` return null; `purse.credits -= price; st.credits += price; p.q -= 1; S.hired += 1`; the hand `{ ...rollPerson(rng), kg: d.personKg, kills: 0, hiredAt: t }` (rollPerson handed in as `S.rollPerson`, set by the caller: `S.rollPerson = rollPerson`); returns the hand. Hiring is not a pool trade: the pool's `c` does not move.
- `export function wagesDue(crew, t, since, d)`: `crew.length * d.wagePerDay * (t - since) / d.daySeconds`.
- `export function dock(S, purse, crew, t)`: `due = wagesDue(crew, t, purse.lastDock, S.dials)`; `purse.credits -= due`; if `purse.credits < 0` then `purse.debt += -purse.credits; purse.credits = 0`; `S.wagesPaid += due; purse.lastDock = t`; returns `due`. Wages leave the world into the hands' pockets; the audit counts `wagesPaid` as a holder.
- `export function buy(S, sid, part, n, purse)`: `p = S.stations[sid].parts[part]`; `trial = poolBuy({ ...p }, n)`; if `trial === null || trial > purse.credits` return null; `cost = poolBuy(p, n); purse.credits -= cost; S.stations[sid].credits += cost`; returns `cost`.
- `export function sell(S, sid, part, n, purse)`: `out = poolSell({ ...p }, n)`; if `out > S.stations[sid].credits` return null; `poolSell(p, n); purse.credits += out; S.stations[sid].credits -= out`; returns `out`.
- `export function makeHull(list)`: `builder = makeBuilder({ spec: MODULES, cell: 1.7, weldStrength: 1.2e5, weldWeak: 5e4, baseFuel: 0 })`; returns `{ builder, list: list.map((m) => ({ ...m })), scrap: 0, spares: [], cargo: { people: 0 } }`.
- `export function derive(hull)`: `hull.builder.derive(hull.list)`; the road reads `{ dry: m, thrust: F, fuelCap }` from it.
- `export function install(hull, t, gx, gy)`: if `hull.builder.occupied(hull.list, gx, gy)` or not `hull.builder.adjacencyOK(hull.list, gx, gy, t)` return false; push `{ t, gx, gy }`; return true.
- `export function remove(hull, idx)`: the bridge (index of the first module with `t === "bridge"`) is never removed; otherwise the list without idx must stay connected from the bridge (`connectedFrom(list2, weldsOf(list2), bridgeIdx2).size === list2.length`) or the removal is refused; returns true when removed.
- `export function stepStations(S, dt)`: `stepContracts(S.book, S.stations, dt, PART_ORDER)`. The escrow's own scan posts a contract at a station whose first starved part (people, at the far ring, whose pool sits at `farPeople`) has `q <= 1`: the contract to move people away from the star.
- `export function carryPeople(S, sid, hull, purse, n)`: `buy(S, sid, "people", n, purse)`; if null return null; `hull.cargo.people += n`; returns the cost. The pod's capacity is not enforced here.
- `export function deliverPeople(S, ct, hull, purse)`: if `ct.part !== "people" || !ct.open || hull.cargo.people < ct.n` return 0; `hull.cargo.people -= ct.n`; `pay = fulfilContract(S.stations, ct, S.book.dials)`; `purse.credits += pay`; returns `pay`.
- `export const STATION_CONTRACT` and `export function checkStation(st)`: not an object gives `station: not an object`; then `station.credits: number >= 0 required`, `station.bias: number >= 1 required`, `station.parts: object required`, and for each of scrap, fuel, people missing from parts, `station.parts.<name>: pool required`.

The file header states: MODULE of the game GRAVITY'S ARK: stations, the order's phase 0.0.106, frame 3, every number PROPOSED from the order's scale table, the pools the market module's, the contracts the escrow module's, the hull the builder's.

Gate `scripts/gravitys-ark-test.mjs`: in your tree write it new with the disc gate's `mulberry32` and the seed line `seeds {"gravitys-ark":<n>}`, then these stand-ins, exactly:

```js
// stand-ins for phase 0.0.103's makeGalaxy and rollPerson, replaced by the real imports at the landing
const WOMEN = ["Ada", "Beatrix", "Carys", "Dagny"], MEN = ["Anders", "Bram", "Casimir", "Dov"], FAMILY = ["Aske", "Brandt", "Corvin", "Dahl"];
function rollPerson(r) { const sex = r() < 0.5 ? "f" : "m"; const t = sex === "f" ? WOMEN : MEN; const first = t[Math.floor(r() * t.length)]; return { name: first + " " + FAMILY[Math.floor(r() * FAMILY.length)], sex }; }
function standInGalaxy(seed) {
  const r = mulberry32(seed); const n = 8 + Math.floor(r() * 5); const worlds = []; const lane = 180000 / n;
  for (let i = 0; i < n; i++) { const R = 600 + r() * 800, g = 6 + r() * 8, soft = R / 4;
    worlds.push({ id: "w" + i, i, x: 20000 + lane * i + r() * lane * 0.6, y: (r() * 2 - 1) * 30000, r: R, g, soft, mu: g * Math.pow(R * R + soft * soft, 1.65), climate: "ROCK", ring: Math.floor(3 * i / n), holder: null, state: "alive", station: { faction: "charter", hands: 4 + Math.floor(r() * 5) } }); }
  const star = { x: 0, y: 0, r: 4000, g: 30, soft: 1000, mu: 30 * Math.pow(4000 * 4000 + 1000 * 1000, 1.65) };
  return { seed, n, worlds, star, lanes: worlds.slice(1).map((w, i) => [i, i + 1]), gate: { x: worlds[n - 1].x + 15000, y: 0, toll: 8000, bill: { time: 120, scrap: 600, modules: 2 } }, collapseAt: r() < 0.5 ? 2 : 3 };
}
```

Every check builds `G = standInGalaxy(SEED)`, `S = makeStations(G)`, `S.rollPerson = rollPerson`, a purse `makePurse(50000, 0)`, and a ledger from `makeLedger({ dimensions: ["credits", "people"] })` with sources: `purse` (credits), `stations` (credits summed over stations, people summed over the people pools), `escrow` (credits summed over open contracts' escrow), `wages` (credits `S.wagesPaid`), `crew` (people `crew.length + hull.cargo.people`); genesis declares the purse's credits plus every station's credits, and every people pool's q. Checks numbered 12 to 17, named as below; at the landing they are appended after the first eleven verbatim with the stand-ins replaced.

12. `ark: pools conserve credits and people on the ledger through rolled trades` — 200 trades drawn from the stream: at a rolled station, one of buy scrap (1 to 500 kg), sell scrap (what the hull holds, if any), buy fuel, sell fuel, buy a rolled module kind, hire (with a crew list); a refused trade counts as a trade; after every trade `audit()` is ok with zero drift; at the end at least one trade of each kind succeeded.
13. `ark: listings are dearer nearer the pit` — for every station, `price1` of scrap is within 1 credit of `Math.round(scrapPrice * bias)` and of fuel within 1 of `Math.round(fuelPrice * bias)`; sorting the stations by distance from the pit, `bias` never rises with distance.
14. `ark: hands come from the seed, rise six percent per hire, and wages fall due at the dock` — at a rolled station with at least four people: hire four with a stream from a rolled seed; the four prices equal `ceil(650 * bias * 1.06^k)` for k 0 to 3; twin streams from the same seed give the same four names; every first name is in its sex's table; then `wagesDue(crew, t, since)` at a rolled interval equals `4 * 40 * interval / 600` within 1e-9; `dock` with a purse of 10 credits books the rest as debt and leaves the purse at 0.
15. `ark: the build screen derives the starter's mass and thrust and refuses a loose module` — `makeHull(STARTER_HULL)`: derive gives m 3400, F 60000, fuelCap 3000; `install(hull, "strut", 2, 0)` is true and m becomes 3550; `install(hull, "strut", 5, 5)` is false; `remove` of the bridge's index is false; `remove` of the strut's index is true and m returns to 3400.
16. `ark: a starving far station posts the contract to move people, and delivering pays the escrow once` — call `stepStations(S, 1)` 61 times: an open contract with part people exists at a station of ring 2; `carryPeople` from a ring-0 station of one person succeeds; `deliverPeople` pays the contract's pay into the purse; a second `deliverPeople` pays 0; the ledger audits ok with zero drift after each step.
17. `ark: twin station books from one rolled seed agree` — the trades of check 12 replayed on two fresh books from twin streams: the two `stations` objects and purses are JSON-equal.

In your tree the count line is `gravitys-ark-test: 6 PASS / 0 FAIL`, then `gravitys-ark-test PASS`, exit 0 (checks 12 to 17 only; the landing makes it 17). Any FAIL stops the task.

## Steps

1. Read the list above. Confirm.
2. Write the module in pieces.
3. Write the gate in pieces.
4. Run, from the worktree root, twice: `node scripts/gravitys-ark-test.mjs`. Both runs must print the seeds line, 6 PASS lines, the count line, and the verdict, exit 0. Paste both outputs whole in the report.
5. Write `docs/plans/phase-0.0.106-stations.md` in the worktree, this shape:

```
# Phase 0.0.106 — stations: pools, hands, wages, listings, the build screen, the people contract

Status: PLANNED. Built in worktree, awaiting the landing.
<!-- At landing this line becomes: Status: LANDED, commit `<hash>`, <date>. Gate: 17 PASS / 0 FAIL; bracket unmoved. -->

The fourth phase of GRAVITY'S ARK under the order batch-ark-1: frame 3, the ring's ordinary business, headless. Every station keeps pools for scrap, fuel, people, and each module kind on the market module's constant-product law, dearer nearer the pit; hands are hired from the people pool with names from the seed, women and men, at a price rising six percent per hire; wages fall due at every dock and go to debt when the purse is short; the build screen installs and removes modules on the builder's ports and derives the hull's mass and thrust; the far ring's starving stations post the contract to move people away from the star on the escrow module's law. <One more sentence in plain words: what the page will do with it.>

## Lift kind

No lift. New code to the order's scale table; every number PROPOSED; the pools, contracts, and hull laws the engine's own.

## Rulings inside this plan

- Hiring is not a pool trade: the price is the order's law, and the pool count drops by one.
- People are a part in the pools, so the escrow's own starving-station scan posts the contract to move them.

## Acceptance arithmetic for the phase

Every number below is the run's output (rolled seeds <the two seeds>).

- `node scripts/gravitys-ark-test.mjs` prints a seeds line, 6 PASS lines in the worktree, then `gravitys-ark-test: 6 PASS / 0 FAIL`, then `gravitys-ark-test PASS`, exit 0; 17 at the landing.
- Bracket, run at the landing: gravitys-ark, market, escrow, builder, ledger.

## Tasks

- 0.0.106-1 — the stations. → `task-0.0.106-1-stations.md`
```

6. Commit on your branch, all three files, with this message exactly:

```
phase 0.0.106 — stations: pools, hands, wages, listings, the build screen, the people contract

GRAVITY'S ARK, the first road. The ring's business headless: pools on the market's law dearer nearer the pit, hands from the seed at a rising price, wages due at the dock, the build screen on the builder, the contract to move people on the escrow. Gate checks 12 to 17 green at rolled seeds.

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

- `node scripts/gravitys-ark-test.mjs` in the worktree over the stand-ins: seeds 651279552 and 1866729076 (twin seeds 2855663043 and 80313664); 6 PASS lines, `gravitys-ark-test: 6 PASS / 0 FAIL`, exit 0, twice, and 25 more rolled runs clean. At the landing, joined after the twelve landed checks over the real galaxy: `gravitys-ark-test: 18 PASS / 0 FAIL`, twice.
- Bracket at the landing: gravitys-ark, market, escrow, builder, ledger, every tail PASS.
- Branch commit 8a383a8 on phase/0.0.106-stations, landed by squash into main; the gate joined by the orchestrator's helper, the stand-ins replaced by the galaxy's own maker and names.
- Nonconformities the agent named, each a reading where the brief was silent: the contract's wording; check 14 rolls among stations with more than four people, the hire law refusing at a pool of one; fuel trades in 1 to 500 kg and one module per purchase; a wage interval long enough to top a purse of 10; check 15 stands alone on the hull; a second rolled seed for the twin checks, printed on its own line. None moved a law.
