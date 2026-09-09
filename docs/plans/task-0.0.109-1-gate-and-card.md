# Task 0.0.109-1 — gate and card: the bill and the toll, the Fitters, passing, death and respawn, the log and the card

One job: the seventh phase of GRAVITY'S ARK. Two headless modules for frames 8 and 9: the gate shut until she fixes it with time, scrap, and modules by seed; the toll; selling to the Fitters at the gate; passing; death and the respawn ahead of the edge with mercy fuel and debt; the log on the receipts module and the card built from it, with the galaxy's name; and five more checks in the game's gate. Write exactly the design below, run the gate, write the phase document, commit on your branch, report. You design nothing beyond this brief; anything it did not foresee stops the task and is reported as a labeled nonconformity.

Model: Sonnet 5.

Where you work: the worktree at `/home/batman/combo-wt/gatecard`, branch `phase/0.0.109-gate-and-card`, cut from main after phase 0.0.103 landed. The road and stations modules this phase consumes are not in your tree; the shapes it needs are fixed below and your gate builds them by hand. You never touch `/home/batman/combo-engine`. You never edit `scripts/gate.mjs`, `README.md`, `package.json`, `src/modules/registry/registry.js`, any module under `src/modules/`, `src/games/gravitys-ark/galaxy.js`, or any document of another phase. You never edit a demo file.

Working method, required: no single response or tool call may carry more than about 150 lines of new text. Right after the read-confirmation, make your first write. Append each file piece by piece with bash heredocs and run `node --check` after each piece once it can parse. Keep your own reasoning short; this brief has made every decision.

Required reading, in order, whole (confirm each with its line count at the top of your report):
1. This file.
2. `/home/batman/combo-engine/docs/plans/batch-ark-1.md`, the sections "Provisional rulings", "The scale table", "The rules of the run", and "Stream S, the space frames".
3. `/home/batman/combo-wt/gatecard/src/games/gravitys-ark/galaxy.js`, whole.
4. `/home/batman/combo-wt/gatecard/src/modules/receipts/receipts.js`, whole.
5. `/home/batman/combo-wt/gatecard/src/modules/ledger/ledger.js`, whole.
6. `/home/batman/combo-wt/gatecard/src/modules/determinism/determinism.js`, whole.
7. `/home/batman/combo-wt/gatecard/scripts/gravitys-ark-test.mjs`, whole: the game's gate with its first five checks, which you extend.
8. `/home/batman/combo-wt/gatecard/docs/plans/phase-0.0.103-galaxy.md`, as the shape of a phase document.

## The shapes this phase consumes

- The galaxy from `makeGalaxy(seed)`: worlds `{ id, i, x, y, r, climate, ring, holder, state }`, the star, `gate: { x, y, toll, bill: { time, scrap, modules } }`.
- A ship `{ x, y, vx, vy, dry, fuel, thrust, landed, alive }` and a road state `{ t, hole: { born, edge, swallowed }, events }`.
- A hull `{ list, scrap, spares, cargo: { people } }`; a purse `{ credits, debt, lastDock }`; her `{ taken, away, sold }`.
- The module table: bridge 900 kg ¢12,000, engine 1,400 ¢9,000, pod 600 ¢4,500, tank 500 ¢3,800, shield 1,100 ¢11,000, mount 800 ¢7,500, strut 150 ¢900, rcs 250 ¢2,600, rack 550 ¢6,500, grapple 400 ¢5,200, mechbay 1,800 ¢8,000. Write it as `const MODULE_PRICE = { bridge: 12000, ... }` and `const MODULE_KG = { bridge: 900, ... }` in `gate.js`, not exported; the landing swaps them for the stations module's table.

## The design, fixed

New file `src/games/gravitys-ark/gate.js`. No imports. No randomness.

```js
export const GATE_DIALS = { nearR: 2000, fittersCut: 0.6, scrapPrice: 2, personPrice: 650, mercyFuel: 60, respawnDebt: 5000, starterDry: 3400, starterThrust: 60000 };
export const ENDINGS = ["through with her", "through without her", "sold her and passed", "stayed and fell", "no station left ahead of the edge"];
```

- `export function makeGate(galaxy, d)`: `{ toll: galaxy.gate.toll, bill: { ...galaxy.gate.bill }, work: 0, scrapPaid: 0, modulesPaid: 0, fixed: false, tolled: false, passed: false, sold: [], authority: { credits: 0 }, fitters: { credits: 30000 }, dials: { ...GATE_DIALS, ...d } }`.
- `export function atGate(ship, galaxy, d)`: `Math.hypot(ship.x - galaxy.gate.x, ship.y - galaxy.gate.y) < d.nearR`.
- `export function need(gs)`: `{ time: Math.max(0, gs.bill.time - gs.work), scrap: gs.bill.scrap - gs.scrapPaid, modules: gs.bill.modules - gs.modulesPaid }`.
- `export function fixGate(gs, hull, her, dt)`: if `gs.fixed` return `need(gs)`; if `her.taken || her.away || her.sold` return `need(gs)` unchanged: only she can fix it. `gs.work += dt`. If `gs.scrapPaid < gs.bill.scrap` and `hull.scrap >= gs.bill.scrap - gs.scrapPaid`: `hull.scrap -= that; gs.scrapPaid = gs.bill.scrap`. While `gs.modulesPaid < gs.bill.modules` and `hull.spares.length`: `hull.spares.pop(); gs.modulesPaid += 1`. `gs.fixed = gs.work >= gs.bill.time && gs.scrapPaid >= gs.bill.scrap && gs.modulesPaid >= gs.bill.modules`. Returns `need(gs)`.
- `export function payToll(gs, purse)`: if `gs.tolled` return 0; if `purse.credits < gs.toll` return null; `purse.credits -= gs.toll; gs.authority.credits += gs.toll; gs.tolled = true`; returns `gs.toll`.
- `export function sellToFitters(gs, hull, purse, item)`: `item` is `{ kind: "spare", k }`, `{ kind: "scrap", kg }`, `{ kind: "people", n }`, or `{ kind: "her" }`; the price: spare `Math.round(MODULE_PRICE[k] * cut)`, scrap `Math.round(kg * scrapPrice * cut)`, people `Math.round(n * personPrice * cut)`, her `item.price` handed in by the caller (the Fitters' listing from the price module); if the fitters' credits are under the price return null; the hull loses the item (a spare by index of its first match, scrap by kg, people by n; her: `her.sold = true`); `gs.fitters.credits -= price; purse.credits += price; gs.sold.push({ ...item, price })`; returns `price`.
- `export function pass(gs, ship, galaxy, her)`: if `!gs.fixed || !gs.tolled || !atGate(ship, galaxy, gs.dials)` return null; `gs.passed = true`; returns `her.sold ? ENDINGS[2] : her.taken ? ENDINGS[1] : ENDINGS[0]`.
- `export function aheadOfEdge(galaxy, hole)`: the alive worlds whose surface distance from the pit, `Math.hypot(w.x, w.y) - w.r`, exceeds `hole.edge`, in world order.
- `export function respawn(galaxy, ship, state, hull, purse, d)`: the lost hull's parts stay on the world on the books: `galaxy.worlds[k].left = (galaxy.worlds[k].left || []).concat(hull.list.map((m) => m.t))` where `k` is the nearest alive world to the ship (or the landed world); `ahead = aheadOfEdge(galaxy, state.hole)`; if none, return `{ ending: ENDINGS[4] }`. Else the nearest of `ahead` to the ship: `ship.x = w.x; ship.y = w.y + w.r; ship.vx = 0; ship.vy = 0; ship.landed = w.i; ship.alive = true; ship.dry = d.starterDry; ship.fuel = d.mercyFuel; ship.thrust = d.starterThrust`; `hull.list = [{ t: "bridge", gx: 0, gy: 0 }, { t: "engine", gx: -1, gy: 0 }, { t: "tank", gx: 1, gy: 0 }, { t: "pod", gx: 0, gy: 1 }]; hull.scrap = 0; hull.spares = []; hull.cargo.people = 0`; `purse.debt += d.respawnDebt`; returns `{ world: w.i, debt: purse.debt }`.
- `export function checkGateState(gs)`: not an object gives `gate: not an object`; then `gate.toll: number > 0 required`, `gate.bill: object with time, scrap, modules required`, `gate.work: number >= 0 required`.

New file `src/games/gravitys-ark/card.js`. Imports `receiptLog` from `../../modules/receipts/receipts.js`. No randomness.

```js
export const ARK_LINES = {
  land: (e) => `landed on ${e.i} at ${fmt(e.v)} m/s`, crash: (e) => `crashed on ${e.i} at ${fmt(e.v)} m/s`, takeoff: (e) => `took off from ${e.i}`,
  collapse: () => `the light went out`, swallow: (e) => `the hole took ${e.i}`, fell: () => `fell into the pit`, death: (e) => `the ship died at ${fmt(e.v)} m/s`,
  hire: (e) => `hired ${e.name}`, dock: (e) => `docked, wages ${fmt(e.due)}`, buy: (e) => `bought ${e.n} ${e.part} for ${fmt(e.cost)}`, sell: (e) => `sold ${e.n} ${e.part} for ${fmt(e.out)}`,
  lock: (e) => `a lock: they want ${e.takes}`, pay: (e) => `paid the pirate with ${e.takes}`, shot: (e) => `hit for ${e.damage}`, kill: (e) => `a bounty of ${fmt(e.bounty)}`,
  hireout: (e) => `she went to work for ${fmt(e.pay)}`, fix: (e) => `she fixed the gate`, toll: (e) => `paid the toll ${fmt(e.toll)}`, sold: (e) => `sold ${e.kind} to the Fitters for ${fmt(e.price)}`,
  pass: (e) => `passed the gate: ${e.ending}`, respawn: (e) => `woke at ${e.world} in debt ${fmt(e.debt)}`,
};
```
where `fmt` is a local `(n) => Math.round(n).toLocaleString("en-US")`. Every event handed to the log carries `type` (the key) and `t`; the page and the modules push them. `receipt` in the receipts module reads `ev.type`.

- `export function makeLog()`: `{ events: [], add(type, t, data) { const e = { type, t, ...(data || {}) }; this.events.push(e); return e; }, lines(lines = ARK_LINES) { return receiptLog(this.events, lines); }, toJSON() { return JSON.stringify(this.events); } }` and `export function logFromJSON(text)`: a log whose events are `JSON.parse(text)`.
- `export function galaxyName(log, galaxy)`: three words: the climate of the world landed on most (`land` and `crash` events by `i`, ties to the earlier world; none: `"NOWHERE"`); the side fought most (`kill` and `pay` and `shot` events: the count of `kill` against `shot`: more kills than shots taken gives `"HUNTER"`, more shots gives `"HUNTED"`, equal gives `"QUIET"`); what was carried most (`buy` events summed by part: the part with the largest summed `n`, upper-cased, none gives `"EMPTY"`). Joined with `" · "`.
- `export function buildCard(log, galaxy, hull, crew, ending)`: `{ ending, manifest: { hull: hull.list.map((m) => m.t), hands: crew.map((h) => h.name), scrap: hull.scrap, spares: hull.spares.slice(), people: hull.cargo.people }, eaten: galaxy.worlds.filter((w) => w.state !== "alive").map((w) => w.id), name: galaxyName(log, galaxy), lines: log.lines() }`.
- `export function checkCard(c)`: not an object gives `card: not an object`; then `card.ending: one of the endings required`, `card.manifest: object required`, `card.name: non-empty string required`.

Both file headers state: MODULE of the game GRAVITY'S ARK, the order's phase 0.0.109, frames 8 and 9 headless, every number PROPOSED from the order's scale table, the log's lines on the receipts module.

Gate `scripts/gravitys-ark-test.mjs`: the landed five checks stay verbatim; append these, numbered 28 to 32, after them, with the import line gaining both modules' exports and `makeLedger`. Every check builds `G = makeGalaxy(SEED)`, a ship landed on world 0 by hand as the shape says, a starter hull, a purse of 20,000, her `{ taken: false, away: null, sold: false }`, and a gate state `makeGate(G)`.

28. `ark: the gate opens only when she has paid its bill in time, scrap, and modules` — with the hull holding the bill's scrap and modules: `fixGate` at 1/60 steps until `work` first reaches `bill.time`: not fixed one tick before, fixed on that tick, and `need` reads zero on every part; a fresh gate state with her taken: 600 steps change nothing; a fresh state with no spares: after the time it is still not fixed and `need.modules` equals the bill's modules.
29. `ark: the toll moves to the Authority and passing needs the fix, the toll, and the place` — a ledger over the purse, the authority, and the fitters audits ok with zero drift through `payToll` (twice: the second pays 0) and a `sellToFitters` of a spare, of scrap, and of people; `pass` returns null before the fix and before the toll and away from the gate, and the first ending with the ship placed at the gate after both; with her sold it returns the third ending.
30. `ark: death wakes at a station ahead of the edge with mercy fuel and debt, or ends the road` — the hole born with edge 0: `respawn` puts the ship landed on the nearest alive world with fuel 60, the starter dry mass, debt 5,000, and the lost hull's parts on that world's `left`; with the edge past every world it returns the last ending.
31. `ark: the log's lines come from the receipts module and the card carries the name from the log` — a log with rolled events (20 of them drawn from ARK_LINES's keys with rolled fields): `lines()` equals `receiptLog(events, ARK_LINES)` line for line; `logFromJSON(log.toJSON())` gives the same lines; `galaxyName` on a log with two lands on w1 and one on w0, two kills and one shot, and buys of scrap 10 and people 3 gives `"<w1's climate> · HUNTER · SCRAP"`; `buildCard` carries the ending, the hull's kinds, the crew's names, the eaten worlds, and `checkCard` returns 0 on it and 1 on null.
32. `ark: twin cards from one rolled seed agree` — two logs fed the same rolled events on twin galaxies: JSON-equal cards.

The count line becomes `gravitys-ark-test: 10 PASS / 0 FAIL`, then `gravitys-ark-test PASS`, exit 0 (the five landed plus five). Any FAIL stops the task.

## Steps

1. Read the list above. Confirm.
2. Write the two modules in pieces.
3. Extend the gate in pieces.
4. Run, from the worktree root, twice: `node scripts/gravitys-ark-test.mjs`. Both runs must print the seeds line, 10 PASS lines, the count line, and the verdict, exit 0. Paste both outputs whole in the report.
5. Write `docs/plans/phase-0.0.109-gate-and-card.md` in the worktree, this shape:

```
# Phase 0.0.109 — gate and card: the bill, the toll, the Fitters, passing, respawn, the log, the card

Status: PLANNED. Built in worktree, awaiting the landing.
<!-- At landing this line becomes: Status: LANDED, commit `<hash>`, <date>. Gate: 32 PASS / 0 FAIL; bracket unmoved. -->

The seventh phase of GRAVITY'S ARK under the order batch-ark-1: frames 8 and 9 headless. The gate stays shut until she pays its bill in her time, scrap, and modules, set by the seed; the toll goes to the Authority; the Fitters at the gate buy spares, scrap, people, and her at their cut; passing needs the fix, the toll, and the place, and names its ending; a lost ship wakes at a station still ahead of the edge with mercy fuel and a debt, or the road ends; the log's lines come from the receipts module and the card is built from it, with the galaxy's name from what was done. <One more sentence in plain words: what the page will do with it.>

## Lift kind

No lift. New code to the order's scale table and the document's rulings; every number PROPOSED; the log's lines the receipts module's.

## Rulings inside this plan

- Only she fixes the gate; taken, away, or sold, the bill does not move.
- The galaxy's name is three words from the log: the climate landed on most, the side fought most, what was carried most.

## Acceptance arithmetic for the phase

Every number below is the run's output (rolled seeds <the two seeds>).

- `node scripts/gravitys-ark-test.mjs` prints a seeds line, 10 PASS lines in the worktree, then `gravitys-ark-test: 10 PASS / 0 FAIL`, then `gravitys-ark-test PASS`, exit 0; 32 at the landing.
- Bracket, run at the landing: gravitys-ark, receipts, ledger.

## Tasks

- 0.0.109-1 — the gate and the card. → `task-0.0.109-1-gate-and-card.md`
```

6. Commit on your branch, all four files, with this message exactly:

```
phase 0.0.109 — gate and card: the bill, the toll, the Fitters, passing, respawn, the log, the card

GRAVITY'S ARK, the first road. Frames 8 and 9 headless: the gate's bill in her time, scrap, and modules by seed; the toll to the Authority; the Fitters buying at the gate; the endings; death and the respawn ahead of the edge with mercy fuel and debt; the log on the receipts module and the card with the galaxy's name. Gate checks 28 to 32 green at rolled seeds.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01QSq3kZC3Bk9SC5RwnqYUfs
```

Do not push. Do not touch main.

## Rules

- No page, no DOM, no timers, no randomness in the modules. Rolled seeds in the gate, printed. No literal that is one seed's own output.
- The landed checks stay verbatim; only the count line moves.
- Never edit a demo file, the gate table, the README, the package version, the registry table, any engine module, the galaxy module, or another phase's documents.

## Report

Read-confirmation first (each file, its line count). One line of outcome. Then bullets: both gate outputs whole; the diff summary (`git diff --stat $(git merge-base HEAD main)`); the commit hash on your branch; every nonconformity as its own labeled bullet. Fixture seeds: the two rolled seeds; no seed is special.

## The report's gate lines

- `node scripts/gravitys-ark-test.mjs` in the worktree over the twelve landed checks: seeds 905414099 and 25050496; 17 PASS lines, `gravitys-ark-test: 17 PASS / 0 FAIL`, exit 0, twice, and five more rolled runs clean. At the landing, joined after the twenty-eight landed checks: `gravitys-ark-test: 33 PASS / 0 FAIL`, twice.
- Bracket at the landing: gravitys-ark, receipts, ledger, every tail PASS.
- Branch commit caad120 on phase/0.0.109-gate-and-card, landed by squash into main; the gate module's copies of the price and mass tables swapped for the stations import; the gate joined by the orchestrator's helper.
- Nonconformities the agent named: the worktree carried twelve landed checks, so its count line read 17; sellToFitters cannot mark her sold, its fixed signature carrying no her, so the page marks her sold itself when it sells her; the card's endings list is a local copy of the gate module's, the card's imports being fixed to one; the gate module's pass is imported under another name in the gate, the gate's own counter being called pass; the imports came as several lines. None moved a law.
