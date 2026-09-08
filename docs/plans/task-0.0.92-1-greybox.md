# Task 0.0.92-1 — greybox: the part library

One job: lift the greybox part library from the shooting-range demo into a module under the general parts order, phase B4. Write exactly the design below, run the gate, write the phase document, commit on your branch, report. You design nothing beyond this brief; anything it did not foresee stops the task and is reported as a nonconformity.

Model: Sonnet 5.

Where you work: the worktree at `/home/batman/combo-wt/greybox`, branch `phase/0.0.92-greybox`. You never touch `/home/batman/combo-engine` (the main tree). You never edit `scripts/gate.mjs`, `README.md`, `package.json`, `src/modules/registry/registry.js`, any other module, or any document of another phase. You never edit a demo file.

Required reading, in order, whole (confirm each with its line count at the top of your report):
1. This file.
2. `/home/batman/combo-engine/docs/plans/batch-general-1.md`, the sections "The generalization law", "The rules of the run", and "B4, greybox".
3. `/home/batman/combo-engine/holdover-greybox-range-r55-claude-opus-5.html`, lines 445 to 455 and 505 to 724 and 1202 to 1217 only. Read-only source material.
4. `/home/batman/combo-wt/greybox/src/modules/solids/solids.js`, whole, for the three makers buildSolids calls.
5. `/home/batman/combo-wt/greybox/src/modules/support/support.js`, lines 1 to 27 (the law) and the `PRIM_CONTRACT` block from line 170 to its closing brace, for the prim shape the library's descriptors share.
6. `/home/batman/combo-wt/greybox/docs/modules/module-pattern.md`.
7. `/home/batman/combo-wt/greybox/docs/plans/phase-0.0.73-aim.md`, as the shape of a phase document.

## The design, fixed

New module `src/modules/greybox/greybox.js`, lifted VERBATIM MATH from demo lines 445 (HUMAN), 447 to 454 (ngon), 507 to 724 (the thirteen builders), and 1202 to 1217 (buildSolids). Every builder's arithmetic, every offset, every default, every part id suffix, every material name string is copied exactly. Substitutions, numbered in the module header, and only these:

1. The builders live inside a factory `function builders(HUMAN)`, the parameter named as the demo's global, so every `HUMAN.` read in the builders stays verbatim and reads the handed table (partRailing, partStair, partFacade, partDoor, partWall, partBuilding read it; the rest read nothing global). No builder body renames anything; partBuilding's own local `var H` is the demo's and stays. `export const HUMAN = { eye: 1.72, door: 2.05, rail: 1.06, step: 0.175, tread: 0.29, floor: 3.30, sill: 0.95 };` is the demo's table. The module exports the defaults bound to HUMAN: `export const { ngon, partColumn, partPipe, partRailing, partStair, partDrum, partFacade, partDoor, partWheel, partCarBody, partFigure, partWall, partBuilding } = builders(HUMAN);` and `export function makeGreybox(opts)` returning `builders({ ...HUMAN, ...(opts && opts.human) })`.
2. `buildSolids(level)` is the demo's function verbatim, exported, with makeBox, makeBoxYaw, and makePrism imported from the solids module. It reads no global.
3. `var` stays `var`; the demo's own function bodies are not restyled.
4. Added: `export const HUMAN_CONTRACT`, `export const PART_CONTRACT`, and two check functions returning a list of plain problem strings, empty when clean, every problem in one pass: `checkHuman(h)`: not an object gives `human: not an object`; then `human.<name>: number > 0 required` for each of eye, door, rail, step, tread, floor, sill. `checkPart(pr)`: not an object gives `part: not an object`; then `part.id: string required`; `part.c: 3 finite numbers required` unless cc is present and valid (`part.cc: 3 finite numbers required` when cc is present and bad); `part.s: 3 finite numbers required`; `part.p: string required` when p is present and not a string; `part.m: integer required`.

The module header states the lift: MODULE: greybox, the box it serves, the demo lines, the substitutions.

Gate `scripts/greybox-test.mjs`, new. A rolled seed printed as `seeds {"greybox":<n>}`, read from `process.env.SEED` when set, else rolled, with the small seeded stream the other gates use. Checks, in this order and with these names:

1. `greybox: a stair of rolled steps rises steps times step and runs steps times tread` — 200 rolls of steps in 1 to 30 and width in 0.5 to 4: partStair at a rolled base; the highest descriptor's top (c[1] plus s[1] over 2) equals base plus steps times HUMAN.step within 1e-9; the last tread's far edge along the run direction is steps times HUMAN.tread from the start within 1e-9; the count equals steps.
2. `greybox: a building of rolled floors stands floors times floor tall, and a door is door tall` — 100 rolls of floors in 1 to 8, width 4 to 20, depth 4 to 20: partBuilding's two side walls have height floors times HUMAN.floor exactly; partDoor's frame is HUMAN.door tall and its leaf HUMAN.door minus 0.10 tall exactly.
3. `greybox: the figure's head top sits at 1.84 at the default scale` — partFigure at base 0: the head descriptor's top equals 1.84 within 1e-9; the torso is centred at 1.16; there are 8 descriptors.
4. `greybox: a rolled human table moves the stair, the building, and the door exactly` — 100 rolls of a human table (each of the seven in 0.05 to 5): makeGreybox({ human }) gives a stair whose top is steps times step, a building whose walls are floors times floor tall, and a door frame door tall, all with the rolled numbers, within 1e-9; the default exports are unchanged by the call.
5. `greybox: buildSolids turns a rolled part list into as many solids as parts, with matching bounds, skipping decoration` — 100 rolls: a list of 1 to 12 plain box parts (no kind, no ry) at rolled centres and sizes with rolled integer m, plus 0 to 3 parts flagged deco; the result's solids count equals the plain count; each solid's min equals c minus s over 2 and max c plus s over 2 within 1e-9, mat equals m, and the map holds the source indices in order.
6. `greybox: twin calls give identical descriptor lists` — the same rolled arguments to partCarBody and partWall twice: JSON.stringify of the two lists is equal.
7. `greybox: the contracts count every problem` — `checkHuman({ eye: 0, door: "x" })` returns exactly 7 problems; `checkHuman(HUMAN)` returns 0; `checkPart({ id: 3, c: [0], s: "s", p: 4, m: 1.5 })` returns exactly 5 problems; `checkPart(partColumn("c", 0, 0, 0, 3, 0.2, "concrete", 1)[0])` returns 0; `checkPart(null)` returns 1.
8. `greybox: the module imports only from its own folder or a sibling module` — read the module file with fs and assert every `import ... from "<x>"` specifier matches `^\.\.\/[a-z0-9-]+\/` or `^\.\/`.

The count line is `greybox-test: 8 PASS / 0 FAIL`, then `greybox-test PASS`, exit 0. Any FAIL stops the task.

## Steps

1. Read the list above. Confirm.
2. Write the module.
3. Write the gate.
4. Run, from the worktree root, twice: `node scripts/greybox-test.mjs`. Both runs must print the seeds line, 8 PASS lines, the count line, and the verdict, exit 0. Paste both outputs whole in the report.
5. Write `docs/plans/phase-0.0.92-greybox.md` in the worktree, this shape:

```
# Phase 0.0.92 — greybox: the part library

Status: PLANNED. Built in worktree, awaiting the landing.
<!-- At landing this line becomes: Status: LANDED, commit `<hash>`, <date>. Gate: 8 PASS / 0 FAIL; bracket unmoved. -->

Serves the checklist box "The greybox part library: stairs, facades, vehicles, figures, at true human scale". Source: the shooting-range demo, read-only, lines 445 to 455, 505 to 724, 1202 to 1217. <One more sentence in plain words: what the module does.>

## Lift kind

VERBATIM MATH — every builder's arithmetic and the human scale table are the demo's exactly. The numbered substitutions are in the module header (four of them: the factory over the scale table, the solids import, the style kept, the contracts). Anything else differing from the cited lines is a finding against the plan.

## Rulings inside this plan

- The scale table's seven numbers are the demo's defaults.
- Registry seam: sample. The registry and gate-table lines are the landing's.

## Acceptance arithmetic for the phase

Every number below is the run's output (rolled seeds <the two seeds>).

- `node scripts/greybox-test.mjs` prints a seeds line, 8 PASS lines, then `greybox-test: 8 PASS / 0 FAIL`, then `greybox-test PASS`, exit 0.
- Load-bearing knowns from the demo's own lines: the seven scale numbers; the figure's head top 1.84.
- Bracket, run at the landing: greybox, solids.

## Tasks

- 0.0.92-1 — the lift. → `task-0.0.92-1-greybox.md`
```

6. Commit on your branch, all three files, with this message exactly:

```
phase 0.0.92 — greybox: the part library

Checklist: the greybox part library at true human scale. Thirteen builders, the scale table, and buildSolids carried verbatim from the shooting-range demo; the scale table handed to a maker; contracts added. Gate 8 PASS / 0 FAIL at rolled seeds.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01QSq3kZC3Bk9SC5RwnqYUfs
```

Do not push. Do not touch main.

## Rules

- No timed simulations. No replays. Rolled seeds, printed. No literal that is one seed's own output.
- Never edit a demo file, the gate table, the README, the package version, the registry table, another module, or another phase's documents.

## Report

Read-confirmation first (each file, its line count). One line of outcome. Then bullets: both gate outputs whole; the diff summary as files and line counts (`git diff --stat` against main); the commit hash on your branch; every nonconformity as its own labeled bullet. Fixture seeds: the two rolled seeds; no seed is special.

## Amendment

Substitution 1 as first written named the factory parameter `H` and read `H.` for `HUMAN.`. The demo's partBuilding declares its own local `var H` (line 717), which JavaScript hoists over the whole function, so the read at line 714 saw the height, not the table, and the default building threw. The parameter is now named `HUMAN`, the demo's own name, and the builders' bodies stay verbatim. The agent stopped on the first wording, the gate crashing at check 2 at two seeds, and resumed on this one. Two brief wordings are also noted here: the seeded stream phrase named no file, and the agent read the legik gate for it; lines 507 to 724 hold twelve builders, ngon at 447 to 454 being the thirteenth.

## The report's gate lines

- `node scripts/greybox-test.mjs`: seeds 463853799 and 838848187; 8 PASS lines, `greybox-test: 8 PASS / 0 FAIL`, `greybox-test PASS`, exit 0, twice.
- Bracket at the landing: greybox, solids, support, registry, every tail PASS. The gate-table and registry lines are the landing's.
- Branch commit 7a6d76b on phase/0.0.92-greybox, landed by squash into main.
- Nonconformities the agent named: the factory parameter H collided with partBuilding's own local, a brief error resolved by the amendment above, the first run crashing at check 2 at seeds 463426903 and 225460306; the seeded stream was read from the legik gate, off the reading list; "the thirteen builders" counted ngon; the contract wording and the unnamed roll ranges were the agent's, inside the laws. None moved a check or an option.
