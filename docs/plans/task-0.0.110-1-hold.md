# Task 0.0.110-1 — the hold: the crash, the Grip waves, her, REPAIR, WALL and GUN, the mast, the boss, TAKE OFF

One job: the eighth phase of GRAVITY'S ARK. A headless module for frames 1 and 2 on a flat field in two dimensions, written new to the design document's numbers: the hull set down by the crash, the Grip stepping out of a ring in waves that never stop, her fighting or fixing and never both, the hands, walls and guns bought in scrap, the mast's low arc, the boss walker, TAKE OFF and ABANDON SHIP; and five more checks in the game's gate. Write exactly the design below, run the gate, write the phase document, commit on your branch, report. You design nothing beyond this brief; anything it did not foresee stops the task and is reported as a labeled nonconformity.

Model: Sonnet 5.

Where you work: the worktree at `/home/batman/combo-wt/hold`, branch `phase/0.0.110-hold`, cut from main after phase 0.0.103 landed. You never touch `/home/batman/combo-engine`. You never edit `scripts/gate.mjs`, `README.md`, `package.json`, `src/modules/registry/registry.js`, any module under `src/modules/`, `src/games/gravitys-ark/galaxy.js`, or any document of another phase. You never edit a demo file.

Working method, required: no single response or tool call may carry more than about 150 lines of new text. Right after the read-confirmation, make your first write. Append each file piece by piece with bash heredocs and run `node --check` after each piece once it can parse. Keep your own reasoning short; this brief has made every decision.

Required reading, in order, whole (confirm each with its line count at the top of your report):
1. This file.
2. `/home/batman/combo-engine/docs/plans/batch-ark-1.md`, the sections "The scale table", "The rules of the run", and "Stream G, the ground frames".
3. `/home/batman/combo-wt/hold/src/modules/determinism/determinism.js`, whole.
4. `/home/batman/combo-wt/hold/scripts/gravitys-ark-test.mjs`, whole: the game's gate with its first five checks, which you extend.
5. `/home/batman/combo-wt/hold/docs/plans/phase-0.0.103-galaxy.md`, as the shape of a phase document.

## The shapes this phase consumes

- A hull `{ list: [{ t, gx, gy }, ...] }` with the bridge first, the module table's masses: bridge 900, engine 1,400, pod 600, tank 500, shield 1,100, mount 800, strut 150, rcs 250, rack 550, grapple 400, mechbay 1,800 kg. Write it as `const MODULE_KG` in the module, not exported; the landing swaps it for the stations module's table.
- A crew `[{ name, kg, kills }, ...]`.

## The design, fixed

New file `src/games/gravitys-ark/hold.js`. No imports. No randomness inside the module: every draw comes through an `rng` argument handed to `makeHold`, held on the state, and read in one fixed order. Every position is metres on a flat field, the bridge at the origin at the start; every rate is per second; the tick is the caller's dt.

```js
export const HOLD_DIALS = { crashPitch: 0.35, slideFrac: 0.6, crashStop: 0.3, weldNormal: 1.2e5, weldWeak: 5e4, firstWaveAt: 8, firstWaveN: 4, waveEvery: 20, waveAdd: 2, ringR: 38, gripKg: 80, gripHp: 58, gripSpeed: 2.2, clawModule: 6, clawWalker: 2, clawPerson: 12, reach: 1.5, repairWalker: 10, repairBase: 5, repairPerM: 1.5, wallScrap: 300, gunScrap: 600, keepOut: 3.5, startScrap: 900, gripPays: 50, mastH: 3, mastMin: 5, mastEvery: 2.5, mastDamage: 40, mastRadius: 3, mastSelf: 8, mastG: 9.8, bossWave: 4, bossFrom: 44, bossHp: 950, bossStandoff: 14, bossEvery: 3, bossDamage: 60, bossDown: 5, bossDownCost: 150, handHp: 58, handSpeed: 3.2, handDamage: 14, handEvery: 1.2, handRange: 24, satchel: 70, satchelEvery: 8, satchelRange: 5.5, herHp: 58, herSpeed: 3.2, walkerHp: 900, walkerDamage: 30, walkerEvery: 1, walkerReach: 3, moduleHp: 400, wallHp: 500, gunHp: 300, gunDamage: 20, gunEvery: 1, gunRange: 30, cell: 1.7 };
export const ACTS = ["repairWalker", "repair", "fight", "idle"];
```

- `export function crashLoads(hull, v, d)`: the crash's deceleration `a = v / d.crashStop`; for every module after the bridge, the weld it hangs on is to its grid neighbour nearest the bridge (the neighbour of index lowest in the list among those at grid distance 1); its load is `MODULE_KG[t] * a`; its strength `d.weldWeak` when either side is a strut, else `d.weldNormal`; returns `[{ i, load, strength, broken: load > strength }]`.
- `export function makeHold(hull, crew, v, rng, opts)`: `d = { ...HOLD_DIALS, ...(opts && opts.dials) }`. The modules from the crash: for each module `m` of the hull, `{ t, x: m.gx * d.cell, y: m.gy * d.cell, hp: d.moduleHp, welded: true, slid: 0 }`; then for every weld broken by `crashLoads(hull, v, d)` the module is loose: `welded = false; slid = d.slideFrac * v; x += slid` (slid along +x). The state:
  `{ t: 0, pitch: d.crashPitch, modules, scrap: d.startScrap, grip: [], walls: [], guns: [], hands, her, walker, wave: 0, nextWaveAt: d.firstWaveAt, events: [], boss: null, abandoned: false, mastT: 0, rng, dials: d }`
  with `hands` one per crew member `{ name, x: 2 + k * 1.2, y: -3, hp: d.handHp, fireT: 0, satchelT: 0, alive: true }`, `her` `{ x: 0, y: 3, hp: d.herHp, act: "idle", actT: 0, target: null, inWalker: false, alive: true }`, `walker` `{ x: 4, y: 3, hp: d.walkerHp, dead: true, hitT: 0 }`.
- `export function order(H, kind, x, y)`: `"wall"`: if `Math.hypot(x, y) < d.keepOut` return null; if `H.scrap < d.wallScrap` return null; `H.scrap -= d.wallScrap; H.walls.push({ x, y, hp: d.wallHp })`; return the wall. `"gun"`: the same with `gunScrap`, `gunHp`, `fireT: 0`, into `H.guns`. `"fire"`: the mast: if `Math.hypot(x, y) < d.mastMin` or `H.mastT > 0` return null; the low arc's flight time to range `R = Math.hypot(x, y)` at forty-five degrees from a mast `d.mastH` up: `tf = Math.sqrt(2 * R / d.mastG)`; `H.shots.push({ x, y, landAt: H.t + tf })` (add `shots: []` to the state); `H.mastT = d.mastEvery`; return the shot. `"repairWalker"`, `"repair"`, `"fight"`, `"idle"`: her act; `"repair"` takes the loose module nearest her as `her.target` and `her.actT = d.repairBase + d.repairPerM * target.slid`; `"repairWalker"`: if the walker is not dead return null; `her.actT = d.repairWalker`; `"fight"`: only if the walker is not dead: `her.inWalker = true`; any act other than fight sets `her.inWalker = false`. `"takeoff"`: if any surviving module (hp > 0) is not welded return `{ ok: false, reason: "loose" }`; if `H.abandoned` return `{ ok: false, reason: "abandoned" }`; return `{ ok: true }`. Every order that takes effect pushes an event `{ k: kind, t: H.t }`.
- `export function tick(H, dt)`: in this order, then return the events pushed this tick:
  1. `H.t += dt; H.mastT = Math.max(0, H.mastT - dt)`.
  2. Waves: while `H.t >= H.nextWaveAt`: `H.wave += 1`; `n = d.firstWaveN + d.waveAdd * (H.wave - 1)`; for each, an angle `rng() * 2 * Math.PI` (one draw each, in order): a Grip at `(Math.cos(a) * d.ringR, Math.sin(a) * d.ringR)` with `{ hp: d.gripHp, alive: true }`; if `H.wave === d.bossWave` and no boss yet: one more draw for its angle at `d.bossFrom` and `H.boss = { x, y, hp: d.bossHp, alive: true, fireT: 0, downT: 0 }`; event `{ k: "wave", n: H.wave, count: n, t }`; `H.nextWaveAt += d.waveEvery`. The waves never stop.
  3. The Grip: each living Grip walks at `d.gripSpeed` toward the nearest living thing among modules with hp > 0, the walker if not dead, her if not in the walker, living hands, walls, and guns; within `d.reach` it claws: modules and walls and guns lose `d.clawModule * dt`, the walker `d.clawWalker * dt`, her and hands `d.clawPerson * dt`. A thing at hp ≤ 0 dies: a module's death, a wall's, a gun's, a hand's (`alive = false`), hers (`alive = false`); the bridge's death sets `H.abandoned = true` with event `{ k: "abandon", t }`. Their dead do not rise: a dead Grip stays in the list with `alive: false` and is never revived.
  4. The boss: if alive and not down: it holds off at `d.bossStandoff` from the nearest module (walks toward it when farther, away when nearer); `fireT -= dt`; when `fireT <= 0`: the nearest module with hp > 0 takes `d.bossDamage`, event `{ k: "bossShot", t }`, `fireT += d.bossEvery`. When its hp falls to 0 or below it dies (alive false, event `{ k: "bossDead", t }`). `downT`: if the boss takes a hit of `d.bossDownCost` or more in one blow (the mast's), it is down for `d.bossDown` seconds and does nothing.
  5. Hands: each living hand: `fireT -= dt; satchelT -= dt`; the nearest living Grip (or the boss) within `d.handRange`: when `fireT <= 0`, it takes `d.handDamage`, `fireT += d.handEvery`, and the hand's `kills` rises when that kills it; within `d.satchelRange` when `satchelT <= 0`: `d.satchel` damage, `satchelT += d.satchelEvery`.
  6. Guns: each with hp > 0: `fireT -= dt`; the nearest living Grip within `d.gunRange`: when `fireT <= 0`, `d.gunDamage`, `fireT += d.gunEvery`.
  7. The mast's shots: each shot whose `landAt <= H.t`: every living Grip and the boss within `d.mastRadius` take `d.mastDamage` (the boss goes down when that is at least `bossDownCost`; it is not, so the boss never goes down from the mast alone: state that in the header); every module within `d.mastRadius` takes `d.mastSelf` (bruises your own hull); event `{ k: "shell", x, y, t }`; the shot is removed.
  8. Her: if not alive, nothing. By act: `repairWalker`: `actT -= dt`; at 0 or below, `walker.dead = false; walker.hp = d.walkerHp; her.act = "idle"`, event `{ k: "walkerUp", t }`. `repair`: `actT -= dt`; at 0 or below, `target.welded = true; target.x -= target.slid; target.slid = 0; her.act = "idle"`, event `{ k: "repaired", t }`. `fight` (in the walker, the walker not dead): `walker.hitT -= dt`; the nearest living Grip within `d.walkerReach` of the walker: when `hitT <= 0`, `d.walkerDamage`, `hitT += d.walkerEvery`. She fights or she fixes, never both: while `act` is repair or repairWalker no walker damage is dealt.
  9. Scrap: every Grip that died this tick pays `d.gripPays` kg into `H.scrap`, event `{ k: "gripDead", t }` once per Grip.
- `export function summary(H)`: `{ t, wave, gripAlive, gripDead, modulesAlive, loose, scrap, herAlive, walkerDead, bossAlive, abandoned }`.
- `export function checkHold(H)`: not an object gives `hold: not an object`; then `hold.modules: list required`, `hold.scrap: number >= 0 required`, `hold.wave: integer >= 0 required`.

The file header states: MODULE of the game GRAVITY'S ARK: the hold, the order's phase 0.0.110, frames 1 and 2 headless in two dimensions, written new to the design document's numbers, every number PROPOSED from the order's scale table, the mast's arc a plain lob at forty-five degrees.

Gate `scripts/gravitys-ark-test.mjs`: the landed five checks stay verbatim; append these, numbered 33 to 37, after them, with the import line gaining the hold module's exports. Every check builds a starter hull `[{ t: "bridge", gx: 0, gy: 0 }, { t: "engine", gx: -1, gy: 0 }, { t: "tank", gx: 1, gy: 0 }, { t: "pod", gx: 0, gy: 1 }]`, a crew of three named by hand, and `H = makeHold(hull, crew, v, mulberry32(SEED))` with `v` as each check says.

33. `ark: the crash sets the hull down by the pose and the slide` — for 50 rolled arrival speeds in 0 to 30: every module whose crash load is over its weld's strength is loose and slid `0.6 * v` along x; every other module is welded at its grid spot; the pitch is 0.35; at v 0 nothing is loose; at v 30 the engine (1,400 kg at 100 m/s² is 140,000 N over 120,000) is loose.
34. `ark: the waves come on the clock and never stop, and the boss walks in on the fourth` — ticking at 1/60 with `v` 0: no Grip before 8 s; the first wave's count is 4 on the tick 8 s is reached; the second wave at 28 s brings 6, the third at 48 s brings 8; the fourth at 68 s brings 10 and the boss at 44 m from the origin with 950 hp; kill the boss by hand (hp 0) and the fifth wave at 88 s still brings 12.
35. `ark: the Grip claws at the stated rates and their dead do not rise` — a Grip placed by hand within reach of a module, another within reach of the walker, another within reach of a hand, with her idle away from them: over 60 ticks of 1/60 the module loses 6, the walker 2, the hand 12, each within 1e-9; a Grip set to hp 0 by hand is dead after the tick and stays dead through 100 more ticks with no new one taking its place.
36. `ark: she fights or she fixes, and every act and order keeps its number` — `order(H, "repairWalker")` then ticking: the walker is dead one tick before 10 s and up on that tick; a module loose with slid 4: `order(H, "repair")` takes 11 s of ticks; while repairing, a Grip within the walker's reach takes no walker damage; `order(H, "fight")` then a Grip within reach loses 30 per second; `order(H, "wall", 1, 1)` is refused inside 3.5 m and `order(H, "wall", 6, 0)` costs 300 scrap; `order(H, "gun", 0, 6)` costs 600; `order(H, "fire", 2, 2)` is refused inside 5 m and `order(H, "fire", 12, 0)` lands after `sqrt(2 * 12 / 9.8)` seconds within one tick and damages a Grip placed there by 40; `order(H, "takeoff")` is refused while a module is loose and allowed once every surviving module is welded; the bridge set to hp 0 gives `abandoned` true after the tick.
37. `ark: twin holds from one rolled seed agree` — two holds from twin streams at the same rolled v, the same orders at the same ticks, 600 ticks: JSON-equal states.

The count line becomes `gravitys-ark-test: 10 PASS / 0 FAIL`, then `gravitys-ark-test PASS`, exit 0 (the five landed plus five). Any FAIL stops the task.

## Steps

1. Read the list above. Confirm.
2. Write the module in pieces.
3. Extend the gate in pieces.
4. Run, from the worktree root, twice: `node scripts/gravitys-ark-test.mjs`. Both runs must print the seeds line, 10 PASS lines, the count line, and the verdict, exit 0. Paste both outputs whole in the report.
5. Write `docs/plans/phase-0.0.110-hold.md` in the worktree, this shape:

```
# Phase 0.0.110 — the hold: the crash, the Grip waves, her, REPAIR, WALL and GUN, the mast, the boss, TAKE OFF

Status: PLANNED. Built in worktree, awaiting the landing.
<!-- At landing this line becomes: Status: LANDED, commit `<hash>`, <date>. Gate: 37 PASS / 0 FAIL; bracket unmoved. -->

The eighth phase of GRAVITY'S ARK under the order batch-ark-1: frames 1 and 2 headless on a flat field. The hull comes down by the crash pose and slides its loose modules; the Grip step out of the ring at 8 s, four strong, two more every wave every 20 s, forever, clawing at modules, the walker, and people at the document's rates, their dead never rising; she fights in the walker or she fixes, never both, REPAIR WALKER in 10 s and REPAIR in 5 s plus 1.5 per metre slid; the hands shoot and throw satchels; walls and guns cost scrap and keep clear of the bridge; the mast lobs a low arc that bruises your own hull; the boss walker stands off and fires every 3 s; TAKE OFF needs every surviving module welded; the bridge lost is ABANDON SHIP. <One more sentence in plain words: what the page will do with it.>

## Lift kind

No lift. New code to the design document's numbers under the order's ruling; every number PROPOSED; the mast's arc a plain lob.

## Rulings inside this plan

- The waves never stop; the boss falling changes nothing about the clock.
- The mast's arc is a lob at forty-five degrees, not the ballistics module: the order's stream line is amended at the landing to say so.

## Acceptance arithmetic for the phase

Every number below is the run's output (rolled seeds <the two seeds>).

- `node scripts/gravitys-ark-test.mjs` prints a seeds line, 10 PASS lines in the worktree, then `gravitys-ark-test: 10 PASS / 0 FAIL`, then `gravitys-ark-test PASS`, exit 0; 37 at the landing.
- Bracket, run at the landing: gravitys-ark, determinism.

## Tasks

- 0.0.110-1 — the hold. → `task-0.0.110-1-hold.md`
```

6. Commit on your branch, all three files, with this message exactly:

```
phase 0.0.110 — the hold: the crash, the Grip waves, her, REPAIR, WALL and GUN, the mast, the boss, TAKE OFF

GRAVITY'S ARK, the first road. Frames 1 and 2 headless on a flat field, new to the design document's numbers: the crash pose and slide, the Grip waves that never stop, her fighting or fixing, the hands, walls and guns in scrap, the mast's lob, the boss walker, TAKE OFF and ABANDON SHIP. Gate checks 33 to 37 green at rolled seeds.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01QSq3kZC3Bk9SC5RwnqYUfs
```

Do not push. Do not touch main.

## Rules

- No page, no DOM, no timers, no randomness in the module beyond the handed stream. Rolled seeds in the gate, printed. No literal that is one seed's own output.
- The landed checks stay verbatim; only the count line moves.
- Never edit a demo file, the gate table, the README, the package version, the registry table, any engine module, the galaxy module, or another phase's documents.

## Report

Read-confirmation first (each file, its line count). One line of outcome. Then bullets: both gate outputs whole; the diff summary (`git diff --stat $(git merge-base HEAD main)`); the commit hash on your branch; every nonconformity as its own labeled bullet. Fixture seeds: the two rolled seeds; no seed is special.
