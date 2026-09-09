# Task 0.0.103-1 — galaxy: one seed makes everything

One job: the first phase of GRAVITY'S ARK. A pure module that makes the galaxy from one seed, and the game's gate with its first five checks. Write exactly the design below, run the gate, write the phase document, commit on your branch, report. You design nothing beyond this brief; anything it did not foresee stops the task and is reported as a labeled nonconformity.

Model: Sonnet 5.

Where you work: the worktree at `/home/batman/combo-wt/galaxy`, branch `phase/0.0.103-galaxy`. You never touch `/home/batman/combo-engine` (the main tree). You never edit `scripts/gate.mjs`, `README.md`, `package.json`, `src/modules/registry/registry.js`, any module under `src/modules/`, or any document of another phase. You never edit a demo file.

Working method, required: no single response or tool call may carry more than about 150 lines of new text. Right after the read-confirmation, make your first write. Append each file piece by piece with bash heredocs (`cat >> file <<'EOF' ... EOF`) and run `node --check` on it after each piece once it can parse. Keep your own reasoning short; this brief has made every decision.

Required reading, in order, whole (confirm each with its line count at the top of your report):
1. This file.
2. `/home/batman/combo-engine/docs/plans/batch-ark-1.md`, the sections "The scale table", "The rules of the run", and "Stream S, the space frames".
3. `/home/batman/combo-wt/galaxy/src/modules/determinism/determinism.js`, whole, for `simStream` and `stateHash`.
4. `/home/batman/combo-wt/galaxy/src/modules/wells/wells.js`, lines 1 to 41, for `makeWell` and `accel`.
5. `/home/batman/combo-wt/galaxy/scripts/disc-test.mjs`, lines 1 to 40, the shape of a gate's seed line and check helper.
6. `/home/batman/combo-wt/galaxy/docs/plans/phase-0.0.73-aim.md`, as the shape of a phase document.

## The design, fixed

New file `src/games/gravitys-ark/galaxy.js`. It imports only `simStream` from `../../modules/determinism/determinism.js`. Exports, in this order:

```js
export const GALAXY_DIALS = { worldsMin: 8, worldsMax: 12, xMin: 20000, xMax: 200000, yHalf: 30000, gateGap: 15000, rMin: 600, rMax: 1400, gMin: 6, gMax: 14, starR: 4000, starG: 30, tollMin: 4000, tollMax: 12000, scrapMin: 300, scrapMax: 900, timeMin: 60, timeMax: 240, modulesMin: 1, modulesMax: 3, gripChance: 0.2, nobodyChance: 0.1, handsMin: 4, handsMax: 8 };
export const CLIMATES = ["SNOW", "ASH", "MUD", "ROCK", "WOOD"];
export const FACTIONS = ["authority", "charter", "militia", "fitters", "wreckers"];
export const WOMEN = ["Ada", "Beatrix", "Carys", "Dagny", "Edith", "Freya", "Greta", "Hilde", "Ines", "Jorunn", "Kaja", "Liv", "Maren", "Nadia", "Oona", "Petra", "Runa", "Sigrid", "Tove", "Vera"];
export const MEN = ["Anders", "Bram", "Casimir", "Dov", "Emil", "Fenn", "Gustav", "Hakon", "Ivo", "Jonas", "Kol", "Lars", "Matthias", "Nils", "Osk", "Piet", "Rurik", "Soren", "Teodor", "Viggo"];
export const FAMILY = ["Aske", "Brandt", "Corvin", "Dahl", "Ekholm", "Falk", "Grieg", "Halvorsen", "Idris", "Juel", "Kessler", "Lindqvist", "Moller", "Nygaard", "Ostrem", "Pahl", "Ravn", "Solberg", "Thune", "Vinter"];
```

- `export function muFor(g, R, soft)` returns `g * Math.pow(R * R + soft * soft, 1.65)`: the mu that makes the wells law's pull at distance R equal to g. (The wells law is `mu / (r² + soft²)^1.65`, so at r = R the pull is exactly g.)
- `export function personName(rng, sex)` returns `first + " " + family` where `first` is drawn from WOMEN when `sex === "f"` and from MEN otherwise, and `family` from FAMILY, each by `Math.floor(rng() * table.length)`, the first name drawn first.
- `export function rollPerson(rng)` returns `{ name, sex }` with `sex` `"f"` when `rng() < 0.5` else `"m"` (that draw first), then the name from `personName(rng, sex)`.
- `export function makeGalaxy(seed, dials)`: `d = { ...GALAXY_DIALS, ...dials }`, `rng = simStream(seed)`, and every draw below in this exact order, one world at a time:
  1. `n = d.worldsMin + Math.floor(rng() * (d.worldsMax - d.worldsMin + 1))`.
  2. `lane = (d.xMax - d.xMin) / n`. For `i` from 0 to n − 1, in order, draw: `x = d.xMin + lane * i + rng() * lane * 0.6`; `y = (rng() * 2 - 1) * d.yHalf`; `r = d.rMin + rng() * (d.rMax - d.rMin)`; `g = d.gMin + rng() * (d.gMax - d.gMin)`; `climate = CLIMATES[Math.floor(rng() * 5)]`; `ring = Math.floor(3 * i / n)`; the holder: for ring 2 it is `"authority"` with no draw; otherwise draw `h = rng()`: under `d.gripChance` the holder is `"grip"`, under `d.gripChance + d.nobodyChance` it is `null`, else for ring 0 it is `rng() < 0.5 ? "militia" : "charter"` and for ring 1 `rng() < 0.5 ? "fitters" : "wreckers"` (that second draw only on this branch); `hands = d.handsMin + Math.floor(rng() * (d.handsMax - d.handsMin + 1))`. The world: `{ id: "w" + i, i, x, y, r, g, soft: r / 4, mu: muFor(g, r, r / 4), climate, ring, holder, state: "alive", station: { faction: holder === "grip" || holder === null ? "charter" : holder, hands } }`.
  3. The star: `{ x: 0, y: 0, r: d.starR, g: d.starG, soft: d.starR / 4, mu: muFor(d.starG, d.starR, d.starR / 4) }`.
  4. The gate: `{ x: worlds[n - 1].x + d.gateGap, y: 0, toll: Math.round(d.tollMin + rng() * (d.tollMax - d.tollMin)), bill: { time: Math.round(d.timeMin + rng() * (d.timeMax - d.timeMin)), scrap: Math.round(d.scrapMin + rng() * (d.scrapMax - d.scrapMin)), modules: d.modulesMin + Math.floor(rng() * (d.modulesMax - d.modulesMin + 1)) } }`, the toll drawn first, then time, scrap, modules.
  5. `collapseAt = rng() < 0.5 ? 2 : 3`.
  6. Returns `{ seed, n, worlds, star, lanes, gate, collapseAt, dials: d }` where `lanes` is `[[0, 1], [1, 2], ...]`, n − 1 pairs.
- `export const GALAXY_CONTRACT` as a plain field description and `export function checkGalaxy(gal)` returning a list of plain problem strings, empty when clean, every problem in one pass: not an object gives the single problem `galaxy: not an object`; then `galaxy.seed: integer >= 0 required`; `galaxy.worlds: list of 8 to 12 required`; for each world that is not an object with finite x, y, r, g, mu, `galaxy.worlds[i]: finite x, y, r, g, mu required`; `galaxy.star: object required`; `galaxy.gate: object with finite x and toll required`; `galaxy.collapseAt: 2 or 3 required`.

The file header states: MODULE of the game GRAVITY'S ARK: galaxy, the order's phase 0.0.103, frames 3 and 5 as data, every number PROPOSED from the order's scale table, the draws in one fixed order from the determinism kit's stream.

Gate `scripts/gravitys-ark-test.mjs`, new, the game's one gate, grown by every phase after this one. A rolled seed printed as `seeds {"gravitys-ark":<n>}`, read from `process.env.SEED` when set, else rolled, with the small seeded stream the other gates use (copy the disc gate's `mulberry32` and its seed line). Checks, in this order and with these names:

1. `ark: twin galaxies from one rolled seed are identical` — `makeGalaxy(SEED)` twice: `JSON.stringify` equal, and equal to a third made with `dials` `{}`.
2. `ark: the layout laws hold at rolled seeds` — 50 seeds drawn from the stream (`Math.floor(rng() * 2 ** 32)`): n in 8 to 12; worlds' x strictly ascending with every gap at least 0.4 times lane; every |y| at most yHalf; r and g inside their bounds; for every world the wells pull at distance r, computed as `w.mu / Math.pow(w.r * w.r + w.soft * w.soft, 1.65)`, equals g within 1e-9 relative; every world's ring is `Math.floor(3 * i / n)`; every ring-2 holder is `"authority"`; every station's faction is one of FACTIONS; the gate's x is the last world's x plus gateGap; the toll inside its bounds; collapseAt 2 or 3; lanes n − 1 consecutive pairs.
3. `ark: names come from the seed, women and men` — two streams from one rolled seed give the same 200 `rollPerson` results; over the 200, both sexes appear, every first name is in its sex's table, every family name in FAMILY.
4. `ark: the galaxy contract counts every problem` — `checkGalaxy({ seed: -1, worlds: [1, 2], star: null, gate: {}, collapseAt: 4 })` returns exactly 7 problems (seed, worlds count, two bad worlds, star, gate, collapseAt); `checkGalaxy(makeGalaxy(SEED))` returns 0; `checkGalaxy(null)` returns 1.
5. `ark: the game's files import only from the engine's modules or their own folder` — read `galaxy.js` with fs and assert every `import ... from "<x>"` specifier matches `^\.\.\/\.\.\/modules\/[a-z0-9-]+\/` or `^\.\/`.

The count line is `gravitys-ark-test: 5 PASS / 0 FAIL`, then `gravitys-ark-test PASS`, exit 0. Any FAIL stops the task.

## Steps

1. Read the list above. Confirm.
2. Write the module in pieces.
3. Write the gate in pieces.
4. Run, from the worktree root, twice: `node scripts/gravitys-ark-test.mjs`. Both runs must print the seeds line, 5 PASS lines, the count line, and the verdict, exit 0. Paste both outputs whole in the report.
5. Write `docs/plans/phase-0.0.103-galaxy.md` in the worktree, this shape:

```
# Phase 0.0.103 — galaxy: one seed makes everything

Status: PLANNED. Built in worktree, awaiting the landing.
<!-- At landing this line becomes: Status: LANDED, commit `<hash>`, <date>. Gate: 5 PASS / 0 FAIL; bracket unmoved. -->

The first phase of GRAVITY'S ARK under the order batch-ark-1: the galaxy as data from one seed, frames 3 and 5 of the design document. Eight to twelve worlds on a road from the pit to the gate, each with its radius, gravity, climate, ring, holder, and station; the star at the pit; the gate with its toll and repair bill; the collapse count; names for people from the seed, women and men. <One more sentence in plain words: what the page will do with it.>

## Lift kind

No lift. New code to the order's scale table; every number PROPOSED.

## Rulings inside this plan

- The draws come in one fixed order from the determinism kit's stream, so one seed makes everything and twin galaxies agree.
- The game's gate is one file, grown by every phase; the gate-table line is the landing's.

## Acceptance arithmetic for the phase

Every number below is the run's output (rolled seeds <the two seeds>).

- `node scripts/gravitys-ark-test.mjs` prints a seeds line, 5 PASS lines, then `gravitys-ark-test: 5 PASS / 0 FAIL`, then `gravitys-ark-test PASS`, exit 0.
- Bracket, run at the landing: gravitys-ark, determinism, wells.

## Tasks

- 0.0.103-1 — the galaxy. → `task-0.0.103-1-galaxy.md`
```

6. Commit on your branch, all three files, with this message exactly:

```
phase 0.0.103 — galaxy: one seed makes everything

GRAVITY'S ARK, the first road. The galaxy as data from one seed: worlds on the road with their numbers, the star at the pit, the gate with its toll and bill, the collapse count, names for people. Gate 5 PASS / 0 FAIL at rolled seeds.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01QSq3kZC3Bk9SC5RwnqYUfs
```

Do not push. Do not touch main.

## Rules

- No page, no DOM, no timers. Rolled seeds, printed. No literal that is one seed's own output.
- Never edit a demo file, the gate table, the README, the package version, the registry table, any engine module, or another phase's documents.

## Report

Read-confirmation first (each file, its line count). One line of outcome. Then bullets: both gate outputs whole; the diff summary (`git diff --stat $(git merge-base HEAD main)`); the commit hash on your branch; every nonconformity as its own labeled bullet. Fixture seeds: the two rolled seeds; no seed is special.

## The report's gate lines

- `node scripts/gravitys-ark-test.mjs`: seeds 508345800 and 85451631; 5 PASS lines, `gravitys-ark-test: 5 PASS / 0 FAIL`, `gravitys-ark-test PASS`, exit 0, twice.
- Bracket at the landing: gravitys-ark, determinism, wells, every tail PASS. The gate-table line is the landing's.
- Branch commit 37f3ecf on phase/0.0.103-galaxy, landed by squash into main.
- Nonconformities the agent named: the contract's field wording was the agent's, the brief having given the checker's strings and not the description; the agent read past its list for the import-fence pattern. Neither moved a law.
