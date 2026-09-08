# Task 0.0.83-1 — ballistics: the tables handed in

One job: the second pass over the ballistics module under the general parts order, phase A3. Write exactly the design below, run the gate, write the phase document, commit on your branch, report. You design nothing beyond this brief; anything it did not foresee stops the task and is reported as a nonconformity.

Model: Sonnet 5.

Where you work: the worktree at `/home/batman/combo-wt/ballistics`, branch `phase/0.0.83-ballistics`, branched from main after phase 0.0.76 landed, so `makeHit` exists in the solids module. You never touch `/home/batman/combo-engine` (the main tree). You never edit `scripts/gate.mjs`, `README.md`, `package.json`, `src/modules/registry/registry.js`, any other module, or any document of another phase. You never edit a demo file.

Required reading, in order, whole (confirm each with its line count at the top of your report):
1. This file.
2. `/home/batman/combo-engine/docs/plans/batch-general-1.md`, the sections "The generalization law", "The rules of the run", and "A3, ballistics".
3. `/home/batman/combo-wt/ballistics/src/modules/ballistics/ballistics.js`.
4. `/home/batman/combo-wt/ballistics/scripts/ballistics-test.mjs`.
5. `/home/batman/combo-wt/ballistics/src/modules/solids/solids.js`, for makeHit and the record's shape.
6. `/home/batman/combo-wt/ballistics/src/modules/voxel/voxel.js`, lines 122 to 144 only, the world query that writes the record; you do not edit it.
7. `/home/batman/combo-wt/ballistics/docs/modules/module-pattern.md`.
8. `/home/batman/combo-wt/ballistics/docs/plans/phase-0.0.73-aim.md`, as the shape of a phase document.

## The design, fixed

Module `src/modules/ballistics/ballistics.js`. Every top-level export stays (G, V_STOP, MAX_CHORD_AIR, DX_SOLID, TICK_HZ, TICK_DT, POOL, EVCAP, the flag and event constants, mulberry32, MEDIA, M, ROUNDS, R, Ballistics). The arithmetic of flight, traverse, ricochet, perforation, and embed is unchanged. Changes, and only these:

1. The import line becomes `import { raycastWorld, hit, makeHit } from "../solids/solids.js";`
2. The constructor reads six new options, each defaulting to the module's own table or constant: `media` (default MEDIA), `rounds` (default ROUNDS), `pool` (default POOL), `evCap` (default EVCAP), `tickHz` (default TICK_HZ), `hit` (default the solids record `hit`). It stores `this.media`, `this.rounds` (a copy of the handed rounds where every row without `area` gets `area = Math.PI * (dia / 2) * (dia / 2)`; the handed table is never written), `this.M` and `this.R` (name to index maps built from the two tables), `this.pool`, `this.evCap`, `this.tickHz`, `this.tickDt = 1 / this.tickHz`, `this.hit`. `airId` defaults to `this.M.air` when the handed media has a row named air, else 0. Every typed array sized by POOL is sized by `this.pool`; every array sized by EVCAP is sized by `this.evCap`.
3. `fire(typeId, ...)` accepts a round name (a string, looked up in `this.R`) or an index, and reads `this.rounds[typeId]`. Every loop over `POOL` inside the class runs over `this.pool`.
4. Every read of `MEDIA[...]` inside the class reads `this.media[...]`; every read of `TICK_DT` inside the class reads `this.tickDt`; `pushEvent` caps at `this.evCap`.
5. In stepTick the world raycast passes the record: `raycastWorld(this.solids, px, py, pz, ux, uy, uz, seg, this.hit)`, and the query path passes it too: `this.query(px, py, pz, ux, uy, uz, seg, this.hit)`. Every read of `hit.` after a hit reads `this.hit.`. A query that ignores its last argument writes the default record, which is `this.hit` unless a game handed another; the voxel pass teaches the query to honor the argument.
6. Add `export const MEDIA_CONTRACT` and `export const ROUNDS_CONTRACT` as plain field descriptions, and two check functions returning a list of plain problem strings, empty when clean, every problem in one pass:
   - `checkMedia(table)`: not an array gives the single problem `media: not an array`; then per row i: `media.<i>.name: string required`; `.rho: number >= 0 required`; `.cd: number >= 0 required`; `.yieldV: number >= 0 required`; `.ricochetDeg: number required`; `.shatterV: number >= 0 required`; `.deformV: number > 0 required` (Infinity allowed); `.areaMult: number > 0 required`; `.retain: number in 0 to 1 required`.
   - `checkRounds(table)`: not an array gives `rounds: not an array`; then per row: `.name: string required`; `.mass: number > 0 required`; `.dia: number > 0 required`; `.muzzle: number > 0 required`.
7. Add to the header comment a numbered list of these changes as the second pass's substitutions.

Gate `scripts/ballistics-test.mjs`. The fourteen landed checks stay verbatim, in order, with their names; their seeds 7, 42, 99 stay as they are, since they are the landed fixture. The import lines gain `makeHit` from solids and `checkMedia`, `checkRounds` from ballistics. Before the first check add a rolled seed printed as `seeds {"ballistics":<n>}`, read from `process.env.SEED` when set, else rolled, with the small seeded stream the other gates use. Then these checks, appended after the fourteen:

15. `ballistics: at a rolled media table every event's energy out is at most its energy in and every material index is inside the handed table` — 20 rolls: a media table of four rows, the first named air (rho 0.5 to 2, cd 0.5 to 1.5, yieldV 0, ricochetDeg -1, shatterV 0, deformV Infinity, areaMult 1, retain 0), then three solids (rho 500 to 8000, cd 0.5 to 1.5, yieldV 1e5 to 1e9, ricochetDeg 0 to 30, shatterV 0 to 1500, deformV 100 to 400, areaMult 1 to 4, retain 0.2 to 0.6); a 4 by 4 wall 0.1 thick at x 5 whose mat is a rolled index 1 to 3; an engine with that media and scatter off; the demo's hostile rifle fired at it; runToRest; every event has eout at most ein, and every event's mat is between 0 and 3 or is -1 for an expiry.
16. `ballistics: a rolled rounds table fires by name and the events carry its index` — a rounds table of two rolled rows with rolled names (`"r" + floor(rnd() * 1e6)`), masses 0.005 to 0.06, dia 0.005 to 0.03, muzzle 60 to 800; an engine with those rounds and no solids; fire the second by name and the first by index 0; the two slots' typeId are 1 and 0 and `b.R[name]` is 1; runToRest; every event's pid maps to a slot whose typeId is inside the handed table.
17. `ballistics: pool 8 recycles the oldest slot on the ninth shot` — an engine with pool 8 and no solids; nine shots; liveCount is 8.
18. `ballistics: a handed hit record gives the same events as the default record` — twin engines on the landed wood wall, one with `hit: makeHit()`, the demo's rifle at seed 7; runToRest; the event counts, types, and x positions are identical.
19. `ballistics: the contracts count every problem` — `checkMedia([{ name: 1, rho: -1, cd: "x", yieldV: -2, ricochetDeg: "d", shatterV: -1, deformV: 0, areaMult: 0, retain: 2 }])` returns exactly 9 problems; `checkMedia(MEDIA)` returns 0; `checkMedia(null)` returns 1; `checkRounds([{ name: 5, mass: 0, dia: -1, muzzle: "m" }])` returns 4; `checkRounds(ROUNDS)` returns 0.
20. `ballistics: the module imports only from its own folder or a sibling module` — read the module file with fs and assert every `import ... from "<x>"` specifier matches `^\.\.\/[a-z0-9-]+\/` or `^\.\/`.

The count line becomes `ballistics-test: 20 PASS / 0 FAIL`, then `ballistics-test PASS`, exit 0. Any FAIL stops the task.

## Steps

1. Read the list above. Confirm.
2. Write the module changes.
3. Write the gate changes.
4. Run, from the worktree root, twice: `node scripts/ballistics-test.mjs`. Both runs must print the seeds line, 20 PASS lines, the count line, and the verdict, exit 0. Paste both outputs whole in the report.
5. Write `docs/plans/phase-0.0.83-ballistics.md` in the worktree, this shape:

```
# Phase 0.0.83 — ballistics: the tables handed in

Status: PLANNED. Built in worktree, awaiting the landing.
<!-- At landing this line becomes: Status: LANDED, commit `<hash>`, <date>. Gate: 20 PASS / 0 FAIL; bracket unmoved. -->

<One paragraph: the second pass over the ballistics module under the general parts order, phase A3; what moved, in plain words.>

## Lift kind

SHAPED second pass — the flight and impact arithmetic is untouched; the material and round tables, the pool, the event cap, the tick rate, and the hit record are handed in, defaults the demo's. The changes are the numbered list in the module header.

## Acceptance arithmetic for the phase

Every number below is the run's output (rolled seeds <the two seeds>; the landed checks keep their fixture seeds 7, 42, 99).

- `node scripts/ballistics-test.mjs` prints a seeds line, 20 PASS lines, then `ballistics-test: 20 PASS / 0 FAIL`, then `ballistics-test PASS`, exit 0.
- The fourteen landed checks are verbatim.
- Bracket, run at the landing: ballistics, voxel, support.

## Tasks

- 0.0.83-1 — the second pass. → `task-0.0.83-1-ballistics.md`
```

6. Commit on your branch, all three files, with this message exactly:

```
phase 0.0.83 — ballistics: the tables handed in

Second pass under the general parts order. Media, rounds, pool, event cap, tick rate, and the hit record are options with the demo's defaults; the media and rounds contracts. Gate 20 PASS / 0 FAIL at rolled seeds; the fourteen landed checks verbatim.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01QSq3kZC3Bk9SC5RwnqYUfs
```

Do not push. Do not touch main.

## Rules

- No timed simulations beyond the landed checks' own runToRest calls, which stay as they are. Rolled seeds, printed. No new literal that is one seed's own output.
- The landed checks stay verbatim; only the count line moves.
- Never edit a demo file, the gate table, the README, the package version, the registry table, another module, or another phase's documents.

## Report

Read-confirmation first (each file, its line count). One line of outcome. Then bullets: both gate outputs whole; the diff summary as files and line counts (`git diff --stat` against main); the commit hash on your branch; every nonconformity as its own labeled bullet. Fixture seeds: the two rolled seeds, and the landed 7, 42, 99; no seed is special.

## The report's gate lines

- `node scripts/ballistics-test.mjs`: seeds 448226642 and 102145908; 20 PASS lines, `ballistics-test: 20 PASS / 0 FAIL`, `ballistics-test PASS`, exit 0, twice.
- Bracket at the landing: ballistics, voxel, support, registry, every tail PASS.
- Branch commit a146ad3 on phase/0.0.83-ballistics, landed by squash into main.
- Nonconformity the agent named: the gate's top comment said fourteen checks; it now says twenty and names the two seed regimes. A comment only; no check moved.
