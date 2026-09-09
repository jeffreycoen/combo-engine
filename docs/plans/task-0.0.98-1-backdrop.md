# Task 0.0.98-1 — backdrop: the space backdrop and effects kit

One job: lift the space backdrop's generation and the effects' laws from the fleet demo into a module under the general parts order, phase B10. Write exactly the design below, run the gate, write the phase document, commit on your branch, report. You design nothing beyond this brief; anything it did not foresee stops the task and is reported as a nonconformity.

Model: Sonnet 5.

Where you work: the worktree at `/home/batman/combo-wt/backdrop`, branch `phase/0.0.98-backdrop`. You never touch `/home/batman/combo-engine` (the main tree). You never edit `scripts/gate.mjs`, `README.md`, `package.json`, `src/modules/registry/registry.js`, any other module, or any document of another phase. You never edit a demo file.

Required reading, in order, whole (confirm each with its line count at the top of your report):
1. This file.
2. `/home/batman/combo-engine/docs/plans/batch-general-1.md`, the sections "The generalization law", "The rules of the run", and "B10, backdrop".
3. `/home/batman/combo-engine/homeworld_fleet_command.jsx`, lines 524 to 599, 653 to 789, 1047 to 1069, 1559 to 1607, and 1650 to 1659 only. Read-only source material; a React and three.js file. You lift the numbers and the laws, not the drawing.
4. `/home/batman/combo-wt/backdrop/src/modules/determinism/determinism.js`, whole, for the effects stream.
5. `/home/batman/combo-wt/backdrop/docs/modules/module-pattern.md`.
6. `/home/batman/combo-wt/backdrop/docs/plans/phase-0.0.73-aim.md`, as the shape of a phase document.

## The design, fixed

New module `src/modules/backdrop/backdrop.js`, a SHAPED lift. The law carried, cited by line: the starfield's counts, radii, colours, and sizes (653 to 667); the nebulae's counts, sizes, hue and saturation and lightness buckets, alphas, second-pass offsets, positions, and rotations (683 to 750); the galactic core's six layers (755 to 782); the dust's counts and spread (784 to 788); the trail particle's size and alpha ramps (593); the explosion's particle counts, spreads, colours, sizes, and lifetimes and its ring (1047 to 1069); the beam's flicker and particle count (1568, 1580); the ring's decay, scale, and opacity (1650 to 1656); the bloom's weights, intensity, aberration, and vignette as data (532 to 549). The code is new: generation on a handed seeded stream in place of the demo's unseeded random (a named difference), every draw in the demo's own order; effects laws as pure functions; no three.js, no canvas, no DOM. A renderer reads the plain lists and draws them.

Exports:

- `export const BACKDROP_DIALS = { stars: { desktop: 5000, mobile: 2500, rMin: 300, rSpan: 700, sizeMin: 0.3, sizeSpan: 2 }, nebulae: { desktop: 42, mobile: 20, sizeMin: 100, sizeSpan: 250, alphaMin: 0.06, alphaSpan: 0.14 }, core: { layers: 6, sizeMin: 130, sizeStep: 100, alphaMin: 0.22, alphaStep: 0.03 }, dust: { desktop: 600, mobile: 250, spreadXZ: 600, spreadY: 120 }, trail: { sizeFloor: 0.4, sizeSpan: 0.6, alpha: 0.8 }, ring: { decay: 0.3, opacity: 0.6, sizeMul: 14 }, beam: { maxParticles: 6, perLength: 4 }, bloom: { weights: [0.227027, 0.1945946, 0.1216216, 0.054054, 0.016216], intensity: 0.65, aberration: 0.003, vignette: 0.35 } };`
- `export function makeBackdrop(opts)`: `seed` (required), `mobile` (default false), `dials` merged over the defaults, `stream` (default the determinism kit's fxStream(seed)). Returns plain lists built with the stream's draws in the demo's own order: `stars` (each `{ x, y, z, color: [r, g, b], size }`), `nebulae` (each `{ size, type, h, s, l, alpha, offset2: [dx, dy], hue2, position: [x, y, z], rotation: [rx, ry, rz] }`), `hueBase`, `warmth`, `core` (six `{ size, alpha, position: [x, y, z], rotationZ, coreHue }`), `dust` (each `{ x, y, z }`), and `mobile`.
- `export function trailPoint(life, maxLife, size, dials = BACKDROP_DIALS.trail)`: `{ size: size * (sizeFloor + t * sizeSpan), alpha: t * alpha }` with t equal to life over maxLife.
- `export function ringStep(life, dt, dials = BACKDROP_DIALS.ring)`: life minus dt times decay.
- `export function ringState(life, maxSize, dials = BACKDROP_DIALS.ring)`: `{ scale: 1 + (1 - life) * maxSize, opacity: life * opacity }`.
- `export function ringMaxSize(size, dials = BACKDROP_DIALS.ring)`: size times sizeMul.
- `export function explosion(pos, size, mobile, rnd, dials)`: the demo's emitted particles as a plain list, in the demo's order and with the demo's draws: the fireball (15 mobile or 30, each velocity per axis (rnd minus 0.5) times 0.2 times size, colour 0xffaa44 when rnd over 0.5 else 0xff5522, size times (1.5 plus rnd times 3), life 2.4 plus rnd times 2), the white-hot core (8, colour 0xffeedd, size times 1.2, life 0.8 plus rnd times 0.4, no velocity), the embers (6 mobile or 12, velocity per axis (rnd minus 0.5) times 0.12 times size, colour 0xdd6622 when rnd over 0.5 else 0x884411, size times (0.5 plus rnd), life 3 plus rnd times 2); plus the ring `{ life: 1, maxSize: size * 14 }`.
- `export function beamFlicker(t, r)`: 0.6 plus sin(t times 30) times 0.2 plus sin(t times 47) times 0.1 plus r times 0.1.
- `export function beamParticles(length, dials = BACKDROP_DIALS.beam)`: min(maxParticles, floor(length over perLength)).
- `export const BACKDROP_CONTRACT` as a plain field description and `export function checkBackdropDials(d)` returning a list of plain problem strings, empty when clean, every problem in one pass: not an object gives the single problem `dials: not an object`; then for each group missing gives `dials.<group>: object required`; for each count `dials.<group>.<name>: integer >= 0 required`; for each range or gain `dials.<group>.<name>: number >= 0 required`; `dials.bloom.weights: 5 numbers required`.

The module header states the lift: MODULE: backdrop, the box it serves, the demo lines, the law carried, what is new, and the named difference that the sky is the seed's.

Gate `scripts/backdrop-test.mjs`, new. A rolled seed printed as `seeds {"backdrop":<n>}`, read from `process.env.SEED` when set, else rolled. Checks, in this order and with these names:

1. `backdrop: twin backdrops from one rolled seed are identical` — makeBackdrop twice with the same seed and flag: JSON.stringify equal.
2. `backdrop: the counts are exact per flag` — desktop 5000 stars, 42 nebulae, 6 core layers, 600 dust; mobile 2500, 20, 6, 250.
3. `backdrop: every star sits in the radius band with a size in the size band and a colour from the four` — every star's distance from the origin in 300 to 1000, size in 0.3 to 2.3, colour one of the four demo triples.
4. `backdrop: every nebula's alpha, size, and placement obey the demo's ranges` — alpha in 0.06 to 0.20, size in 100 to 350, z in minus 530 to minus 80, y in minus 175 to 175, and a warm cloud (type under 0.55) has x at least 80 minus 0.2 times 450.
5. `backdrop: the ring law at rolled life` — 200 rolls of life in 0 to 1 and size in 0.5 to 4: ringState gives scale 1 plus (1 minus life) times size times 14 and opacity life times 0.6 within 1e-12; ringStep at rolled dt subtracts dt times 0.3.
6. `backdrop: the trail ramp is monotone in life` — for life stepped 0 to maxLife, size and alpha never decrease as life rises; at full life size equals the base size and alpha 0.8.
7. `backdrop: the beam laws` — beamParticles(length) equals min(6, floor(length over 4)) at rolled lengths 0 to 60; beamFlicker(t, 0) at rolled t equals the formula within 1e-12.
8. `backdrop: an explosion emits the demo's counts and its ring` — desktop: 30 plus 8 plus 12 particles and a ring with maxSize size times 14; mobile: 15 plus 8 plus 6; every fireball life in 2.4 to 4.4, every ember life in 3 to 5.
9. `backdrop: the contract counts every problem` — `checkBackdropDials({ ...BACKDROP_DIALS, stars: { ...BACKDROP_DIALS.stars, desktop: -1 }, bloom: { ...BACKDROP_DIALS.bloom, weights: [1] } })` returns exactly 2 problems; `checkBackdropDials(BACKDROP_DIALS)` returns 0; `checkBackdropDials(null)` returns 1.
10. `backdrop: the module imports only from its own folder or a sibling module` — read the module file with fs and assert every `import ... from "<x>"` specifier matches `^\.\.\/[a-z0-9-]+\/` or `^\.\/`.

The count line is `backdrop-test: 10 PASS / 0 FAIL`, then `backdrop-test PASS`, exit 0. Any FAIL stops the task.

## Steps

1. Read the list above. Confirm.
2. Write the module.
3. Write the gate.
4. Run, from the worktree root, twice: `node scripts/backdrop-test.mjs`. Both runs must print the seeds line, 10 PASS lines, the count line, and the verdict, exit 0. Paste both outputs whole in the report.
5. Write `docs/plans/phase-0.0.98-backdrop.md` in the worktree, this shape:

```
# Phase 0.0.98 — backdrop: the space backdrop and effects kit

Status: PLANNED. Built in worktree, awaiting the landing.
<!-- At landing this line becomes: Status: LANDED, commit `<hash>`, <date>. Gate: 10 PASS / 0 FAIL; bracket unmoved. -->

Serves the checklist box "The space backdrop and effects kit: starfield, nebulae, trails, beams, explosion rings". Source: the fleet demo, read-only, lines 524 to 599, 653 to 789, 1047 to 1069, 1559 to 1607, 1650 to 1659. <One more sentence in plain words: what the module yields and what a renderer does with it.>

## Lift kind

SHAPED — the law carried: every count, range, colour, lifetime, and ramp the demo draws by, and the bloom's numbers as data. The code is new: generation on a handed seeded stream, the demo's draw order kept; effects laws as pure functions; no three.js, no canvas, no DOM. Named difference: the demo's sky was different on every load; the module's is the seed's.

## Rulings inside this plan

- The dials are the demo's numbers as defaults.
- Registry seam: sample. The registry and gate-table lines are the landing's.

## Acceptance arithmetic for the phase

Every number below is the run's output (rolled seeds <the two seeds>).

- `node scripts/backdrop-test.mjs` prints a seeds line, 10 PASS lines, then `backdrop-test: 10 PASS / 0 FAIL`, then `backdrop-test PASS`, exit 0.
- Load-bearing knowns from the demo's own lines: the dials listed in the module.
- Bracket, run at the landing: backdrop, determinism.

## Tasks

- 0.0.98-1 — the lift. → `task-0.0.98-1-backdrop.md`
```

6. Commit on your branch, all three files, with this message exactly:

```
phase 0.0.98 — backdrop: the space backdrop and effects kit

Checklist: the space backdrop and effects kit. Stars, nebulae, the core, and dust generated on a seeded stream in the demo's order; the trail, ring, beam, and explosion laws as pure functions; the bloom's numbers as data. Gate 10 PASS / 0 FAIL at rolled seeds.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01QSq3kZC3Bk9SC5RwnqYUfs
```

Do not push. Do not touch main.

## Rules

- No three.js. No canvas. No DOM. No unseeded random. Rolled seeds, printed. No literal that is one seed's own output.
- Never edit a demo file, the gate table, the README, the package version, the registry table, another module, or another phase's documents.

## Report

Read-confirmation first (each file, its line count). One line of outcome. Then bullets: both gate outputs whole; the diff summary as files and line counts (`git diff --stat` against main); the commit hash on your branch; every nonconformity as its own labeled bullet. Fixture seeds: the two rolled seeds; no seed is special.

## The report's gate lines

- `node scripts/backdrop-test.mjs`: seeds 2129456974 and 1438870005; 10 PASS lines, `backdrop-test: 10 PASS / 0 FAIL`, `backdrop-test PASS`, exit 0, twice. Its PASS lines carry a colon after the word, unlike the other gates; the count and verdict lines are the standard ones.
- Bracket at the landing: backdrop, determinism, registry, every tail PASS. The gate-table and registry lines are the landing's.
- Branch commit 7ea1bf5 on phase/0.0.98-backdrop, landed by squash into main.
- Nonconformities the agent named, each a reading where the brief was silent: explosion's dials argument is required and shaped like the ring dials; a particle is velocity, colour, size, life, the core's velocity null, kinds told apart by position; explosion's pos is accepted and unused, the ring shape carrying no position; the contract is named checkBackdropDials as the brief says, where the order's B10 section said checkBackdropOpts; counts are the eight how-many fields and the rest are ranges; dials merge one level per group. None moved a check.
