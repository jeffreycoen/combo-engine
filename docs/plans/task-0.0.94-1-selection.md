# Task 0.0.94-1 — selection: the selection and feedback layer

One job: lift the selection and feedback layer's law from the fleet demo into a module under the general parts order, phase B8. Write exactly the design below, run the gate, write the phase document, commit on your branch, report. You design nothing beyond this brief; anything it did not foresee stops the task and is reported as a nonconformity.

Model: Sonnet 5.

Where you work: the worktree at `/home/batman/combo-wt/selection`, branch `phase/0.0.94-selection`. You never touch `/home/batman/combo-engine` (the main tree). You never edit `scripts/gate.mjs`, `README.md`, `package.json`, `src/modules/registry/registry.js`, any other module, or any document of another phase. You never edit a demo file.

Required reading, in order, whole (confirm each with its line count at the top of your report):
1. This file.
2. `/home/batman/combo-engine/docs/plans/batch-general-1.md`, the sections "The generalization law", "The rules of the run", and "B8, selection".
3. `/home/batman/combo-engine/homeworld_fleet_command.jsx`, lines 815 to 825, 934 to 968, 1084 to 1090, 1130, 1138 to 1139, 1529 to 1543, and 1668 to 1724 only. Read-only source material; a React and three.js file. You lift the law, not the drawing.
4. `/home/batman/combo-wt/selection/src/modules/orders/orders.js`, whole, for the unit shape (pos as an array, the three target slots).
5. `/home/batman/combo-wt/selection/src/modules/render2d/render2d.js`, whole, as the shape of a module that yields drawing without a page.
6. `/home/batman/combo-wt/selection/docs/modules/module-pattern.md`.
7. `/home/batman/combo-wt/selection/docs/plans/phase-0.0.73-aim.md`, as the shape of a phase document.

## The design, fixed

New module `src/modules/selection/selection.js`, a SHAPED lift. The law carried, cited by line: a bracket is four L-shaped corners at size scale times 2.2 with legs 0.4 of that (942 to 943, 956 to 957), the mothership's at size 28 with legs 0.3 of that and its x squeezed to 0.15 (816 to 821); the health bar is scale times 3 wide, 0.15 tall, scale times 2.5 up, scaled in x by the ratio, its background opacity enemy 0.25, selected 0.35, else 0.2, its bar opacity enemy 0.55, selected 0.65, else 0.35, its colour above ratio 0.5 (0.2 plus (0.8 minus ratio) times 1.6, 0.85, 0.2) and at or under 0.5 (0.85, ratio times 1.7, 0.15) (1530 to 1536); bracket opacity enemy 0.5 plus sin(t times 3) times 0.15, friendly selected 0.55 else 0.25 (1541 to 1542), bracket colour enemy 0xff3333, friendly collector 0xddaa44 else 0xccbb88 (949, 964); the selection ring is inner scale times 1.4, outer scale times 1.7, 24 segments, opacity 0.45 when selected else 0 (934, 1085 to 1087); an order line runs from the unit to its move target, else its guard target's position, else its attack target's position, in that precedence, colour move 0x9adcd4, guard 0x88aa44, attack 0xdd6644, dashed with dash 1.5 and gap 1 by the demo's loop, opacity 0.3, with a diamond marker (ring 0.3 to 0.5, 4 segments) at the target (1668 to 1710); formation links join consecutive units of the selection list, colour 0x9adcd4, opacity 0.1 (1712 to 1724); box select keeps units whose projected screen point lies inside the drag rectangle (1138), a drag counts past 5 pixels in x or y (1130), and a second click on the same unit inside 400 ms follows it (1139); a shift click toggles the unit in the list (1139). The code is new: plain data in and plain drawing data out; no three.js, no DOM, no clocks.

Exports:

- `export const SELECTION_DIALS = { bracket: 2.2, bracketArm: 0.4, bigBracket: 28, bigArm: 0.3, bigAspect: 0.15, barWidth: 3, barHeight: 0.15, barUp: 2.5, ringInner: 1.4, ringOuter: 1.7, ringSegments: 24, ringOpacity: 0.45, dash: 1.5, gap: 1, lineOpacity: 0.3, linkOpacity: 0.1, boxDragPx: 5, followMs: 400, colors: { move: 0x9adcd4, guard: 0x88aa44, attack: 0xdd6644, enemyBracket: 0xff3333, collectorBracket: 0xddaa44, friendBracket: 0xccbb88 } };`
- `export function bracketLegs(size, leg, aspect = 1)`: the eight segments as pairs of `[x, y]` points, corner by corner in the demo's order, each corner `[cx * size * aspect, cy * size]` to `[cx * size * aspect, cy * (size - leg)]` and `[cx * size * aspect, cy * size]` to `[cx * (size * aspect - leg * aspect), cy * size]`.
- `export function barColor(ratio)`: `[r, g, b]` by the two-branch law.
- `export function dashes(from, to, dash, gap)`: the list of `[start, end]` points along the line by the demo's loop, each point `from + (to - from) * fraction`.
- `export function makeSelection(opts)`: dials `{ ...SELECTION_DIALS, ...opts.dials }`; `isEnemy(u)` (default `u.isEnemy === true`); `typeOf(u)` (default `u.type`); `scaleOf(u)` (default `u.scale`); `posOf(u)` (default `u.pos`). Returns a surface with:
  - `list`, the ordered selection.
  - `select(units)`: replaces the list; marks each unit's `selected` true, the old ones false; returns the list.
  - `toggle(u)`: removes when present, appends when absent.
  - `clear()`.
  - `boxSelect(units, project, rect)`: `project(u)` gives `[sx, sy]`; rect is `{ x1, y1, x2, y2 }` already ordered; selects the units inside, inclusive.
  - `dragIs(start, now)`: true when `|now.x - start.x| > boxDragPx` or `|now.y - start.y| > boxDragPx`.
  - `click(u, t, shift)`: with shift, toggles and returns "toggle"; else when the same unit was clicked inside followMs, selects it alone and returns "follow"; else selects it alone and returns "select". Keeps the last click's unit and time.
  - `frame(units, t)`: returns plain drawing data: `brackets` (per unit: `segments` from bracketLegs at scale times bracket and that times bracketArm, `color`, `opacity` by the law), `bars` (per unit: `width`, `height`, `up`, `ratio` clamped at 0, `color` from barColor, `opacityBg`, `opacityBar`), `rings` (per unit: `inner`, `outer`, `segments`, `opacity`), `orderLines` (per selected unit with a target: `segments` from dashes, `color`, `opacity`, `marker: { at, inner: 0.3, outer: 0.5, segments: 4 }`), and `links` (consecutive pairs of the list: `a`, `b`, `color`, `opacity`). A target's position is `posOf(target)` for guard and attack, and the move target array itself for move.
  - `bigBracket()`: the mothership's segments from bracketLegs(bigBracket, bigBracket times bigArm, bigAspect).
- `export const SELECTION_CONTRACT` as a plain field description and `export function checkSelectionDials(d)` returning a list of plain problem strings, empty when clean, every problem in one pass: not an object gives the single problem `dials: not an object`; then `dials.<name>: number > 0 required` for every numeric dial that is missing or not over 0; `dials.colors: object required` when missing; per colour `dials.colors.<name>: integer required`.

The module header states the lift: MODULE: selection, the box it serves, the demo lines, the law carried, what is new.

Gate `scripts/selection-test.mjs`, new. A rolled seed printed as `seeds {"selection":<n>}`, read from `process.env.SEED` when set, else rolled, with the small seeded stream the other gates use. Checks, in this order and with these names:

1. `selection: bracket size and arm are exact at rolled scales, and the mothership's shape squeezes to 0.15` — 200 rolls of scale in 0.2 to 10: bracketLegs at scale times 2.2 and that times 0.4 has 8 segments, every corner point at plus or minus the size, every leg end at size minus leg on its axis; bracketLegs(28, 8.4, 0.15) has its x at plus or minus 4.2 exactly.
2. `selection: the bar colour's two branches switch at 0.5 and each is monotone` — for ratios stepped 0 to 1 by 0.01: above 0.5 the red channel falls as the ratio rises and green is 0.85; at or under 0.5 the green channel rises with the ratio and red is 0.85; barColor(0.5) is the lower branch and barColor(0.5000001) is the upper.
3. `selection: links are exactly n minus 1 consecutive pairs` — 100 rolls of n in 2 to 9 rolled units: frame's links length is n minus 1 and link i joins list[i] and list[i plus 1].
4. `selection: box select keeps exactly the projected points inside a rolled rectangle` — 100 rolls of 12 units with rolled screen points and a rolled ordered rectangle: the selected set equals the inside set, inclusive of edges.
5. `selection: the follow window and the drag threshold are the dials` — click the same unit at t and t plus 399 gives "follow"; at t plus 401 gives "select"; dragIs at exactly 5 pixels is false and at 6 is true; a shift click toggles.
6. `selection: order lines dash by the law and pick the verb's colour in the demo's precedence` — 100 rolls: a selected unit at the origin with a move target at rolled distance L in 1 to 60 on the x axis: the segment count equals ceil(L over 2.5), the first segment starts at the unit, every segment end fraction is at most 1, and the colour is move; a unit with only a guard target gets the guard colour and one with only an attack target the attack colour; a unit with both a move and an attack target gets the move colour.
7. `selection: bar and bracket opacities and the ring follow enemy and selected` — an enemy unit's bar opacities are 0.25 and 0.55 and its bracket opacity at rolled t is 0.5 plus sin(t times 3) times 0.15 within 1e-12; a selected friend's are 0.35, 0.65, bracket 0.55, ring 0.45; an unselected friend's are 0.2, 0.35, bracket 0.25, ring 0; a collector's bracket colour is the collector colour.
8. `selection: twin frames agree` — two surfaces over copies of the same rolled units and list give JSON-equal frames at the same t.
9. `selection: the contract counts every problem` — `checkSelectionDials({ bracket: 0, colors: { move: "x" } })` returns the count of every missing numeric dial plus 2 (bracket and the colour), computed in the check from the dial list; `checkSelectionDials(SELECTION_DIALS)` returns 0; `checkSelectionDials(null)` returns 1.
10. `selection: the module imports only from its own folder or a sibling module` — read the module file with fs and assert every `import ... from "<x>"` specifier matches `^\.\.\/[a-z0-9-]+\/` or `^\.\/`; selection has no imports, so the check passes on an empty list.

The count line is `selection-test: 10 PASS / 0 FAIL`, then `selection-test PASS`, exit 0. Any FAIL stops the task.

## Steps

1. Read the list above. Confirm.
2. Write the module.
3. Write the gate.
4. Run, from the worktree root, twice: `node scripts/selection-test.mjs`. Both runs must print the seeds line, 10 PASS lines, the count line, and the verdict, exit 0. Paste both outputs whole in the report.
5. Write `docs/plans/phase-0.0.94-selection.md` in the worktree, this shape:

```
# Phase 0.0.94 — selection: the selection and feedback layer

Status: PLANNED. Built in worktree, awaiting the landing.
<!-- At landing this line becomes: Status: LANDED, commit `<hash>`, <date>. Gate: 10 PASS / 0 FAIL; bracket unmoved. -->

Serves the checklist box "The selection and feedback layer: brackets, health ramps, order lines, formation links". Source: the fleet demo, read-only, lines 815 to 825, 934 to 968, 1084 to 1090, 1130, 1138 to 1139, 1529 to 1543, 1668 to 1724. <One more sentence in plain words: what the module yields and for whom.>

## Lift kind

SHAPED — the law carried: every size, ratio, colour, opacity, dash, threshold, and window the demo draws by. The code is new: plain units in, plain drawing data out; no three.js, no DOM, no clocks. The enemy test and the unit's scale are handed in as functions.

## Rulings inside this plan

- The dials are the demo's numbers as defaults.
- Registry seam: sample. The registry and gate-table lines are the landing's.

## Acceptance arithmetic for the phase

Every number below is the run's output (rolled seeds <the two seeds>).

- `node scripts/selection-test.mjs` prints a seeds line, 10 PASS lines, then `selection-test: 10 PASS / 0 FAIL`, then `selection-test PASS`, exit 0.
- Load-bearing knowns from the demo's own lines: the dials listed in the module.
- Bracket, run at the landing: selection, orders.

## Tasks

- 0.0.94-1 — the lift. → `task-0.0.94-1-selection.md`
```

6. Commit on your branch, all three files, with this message exactly:

```
phase 0.0.94 — selection: the selection and feedback layer

Checklist: the selection and feedback layer. Brackets, health ramps, order lines, and formation links carried from the fleet demo as plain drawing data over plain units; box select, the drag threshold, and the follow window as dials. Gate 10 PASS / 0 FAIL at rolled seeds.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01QSq3kZC3Bk9SC5RwnqYUfs
```

Do not push. Do not touch main.

## Rules

- No three.js. No DOM. No timers. Rolled seeds, printed. No literal that is one seed's own output.
- Never edit a demo file, the gate table, the README, the package version, the registry table, another module, or another phase's documents.

## Report

Read-confirmation first (each file, its line count). One line of outcome. Then bullets: both gate outputs whole; the diff summary as files and line counts (`git diff --stat` against main); the commit hash on your branch; every nonconformity as its own labeled bullet. Fixture seeds: the two rolled seeds; no seed is special.

## The report's gate lines

- `node scripts/selection-test.mjs`: seeds 2570175881 and 2531790004; 10 PASS lines, `selection-test: 10 PASS / 0 FAIL`, `selection-test PASS`, exit 0, twice.
- Bracket at the landing: selection, orders, render2d, registry, every tail PASS. The gate-table and registry lines are the landing's.
- Branch commit cf7f21d on phase/0.0.94-selection, landed by squash into main.
- Nonconformities the agent named, each a reading where the brief was silent: the frame reads selected state from the module's own list, not a unit field; the colour contract checks only the colours present; the click checks shift before the follow window as the brief says, where the demo's line 1139 checks the follow window first; links reuse the move colour, the same literal; toggle and clear return the list. The click precedence is a divergence from the demo, kept as the brief wrote it. None moved a check.
