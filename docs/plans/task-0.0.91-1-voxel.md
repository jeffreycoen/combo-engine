# Task 0.0.91-1 — voxel: media and gravity handed in

One job: the second pass over the voxel module under the general parts order, phase A4. Write exactly the design below, run the gate, write the phase document, commit on your branch, report. You design nothing beyond this brief; anything it did not foresee stops the task and is reported as a nonconformity.

Model: Sonnet 5.

Where you work: the worktree at `/home/batman/combo-wt/voxel`, branch `phase/0.0.91-voxel`, branched from main after phase 0.0.83 landed, so the ballistics maker takes a hit record and the solids module exports makeHit. You never touch `/home/batman/combo-engine` (the main tree). You never edit `scripts/gate.mjs`, `README.md`, `package.json`, `src/modules/registry/registry.js`, any other module, or any document of another phase. You never edit a demo file.

Required reading, in order, whole (confirm each with its line count at the top of your report):
1. This file.
2. `/home/batman/combo-engine/docs/plans/batch-general-1.md`, the sections "The generalization law", "The rules of the run", and "A4, voxel".
3. `/home/batman/combo-wt/voxel/src/modules/voxel/voxel.js`.
4. `/home/batman/combo-wt/voxel/scripts/voxel-test.mjs`.
5. `/home/batman/combo-wt/voxel/src/modules/solids/solids.js`, for makeHit and the record.
6. `/home/batman/combo-wt/voxel/src/modules/ballistics/ballistics.js`, the constructor and the query call in stepTick, to see how the record is handed to a query.
7. `/home/batman/combo-wt/voxel/scripts/support-test.mjs`, whole, to see the one gate that composes with this module; you do not edit it.
8. `/home/batman/combo-wt/voxel/docs/modules/module-pattern.md`.
9. `/home/batman/combo-wt/voxel/docs/plans/phase-0.0.73-aim.md`, as the shape of a phase document.

## The design, fixed

Module `src/modules/voxel/voxel.js`. Every export stays; every formula is unchanged. Changes, and only these:

1. The import line from solids becomes `import { raycastWorld, hit, makeHit } from "../solids/solids.js";` The import from ballistics stays for the defaults.
2. `voxRay(f, ox, oy, oz, dx, dy, dz, maxT, out = hit)`: every write to `hit.` at the end becomes a write to `out.`.
3. `makeWorldQuery(getSolids, getFields, hitRecord = hit)` returns a function `(ox, oy, oz, dx, dy, dz, maxT, out)` where `out` defaults to `hitRecord`; it passes `out` to raycastWorld and to voxRay and reads and writes `out.` where it read and wrote `hit.`.
4. `makeVoxWorld(opts)`: the world stores `this.media` (opts.media, default the ballistics MEDIA), `this.g` (opts.gravity, default G), `this.limits` (`{ ...VOX, ...opts.limits }`), and `this.hit` (opts.hit, default the solids record). Every read of `MEDIA[...]` inside the world reads `this.media[...]`; every `G` inside step and stepClusters reads `this.g`; every `VOX.<NAME>` inside the world reads `this.limits.<NAME>`. The module-level VOX export stays as the default table.
5. Add `export const PRIM_CONTRACT = { c: "3 finite numbers (or cc)", s: "3 finite numbers", m: "integer index into the handed media", p: "string, optional", brk: "boolean or 0/1, optional" };` and `export function checkPrim(pr, media)` returning a list of plain problem strings, empty when clean, every problem in one pass: not an object gives the single problem `prim: not an object`; then `prim.c: 3 finite numbers required` unless cc is present and valid (`prim.cc: 3 finite numbers required` when cc is present and bad); `prim.s: 3 finite numbers required`; `prim.m: integer index into media required` (an integer at least 0 and, when a media table is given, under its length); `prim.p: string required` when p is present and not a string; `prim.brk: boolean or 0/1 required` when brk is present and not a boolean nor 0 nor 1.
6. Add to the header comment a numbered list of these changes as the second pass's differences, after the four the lift already names.

Gate `scripts/voxel-test.mjs`. The fourteen landed checks stay verbatim, in order, with their names; any fixture seeds they carry stay. The import line gains `checkPrim` from voxel and `makeHit` from solids. Before the first check add a rolled seed printed as `seeds {"voxel":<n>}`, read from `process.env.SEED` when set, else rolled, with the small seeded stream the other gates use. Then these checks, appended after the fourteen:

15. `voxel: with rho doubled in a handed media table, debris mass and cluster mass double exactly` — 20 rolls: a prim of rolled size (0.5 to 2 per side) at the origin with m 1, a media table of two rows (air, then a solid with rolled rho 500 to 5000) and a second table with that rho doubled; two worlds with the same seeded stream (fresh mulberry32 of the same rolled seed each) and the same sizes; damage each at the prim's centre with the same rolled energy and impulse; the second world's debris entries carry twice the first's mass where mass is read (the per-cell mass in the impulse share is not stored, so compare through a cluster instead: dropPrimAsCluster on each world's copy of the prim gives a cluster whose mass is exactly twice the first's).
16. `voxel: limits with MAX_DYN 10 cap the debris list at 10` — a world with limits `{ MAX_DYN: 10 }`, a prim big enough to shed more than ten cells, one damage call at its centre with a large energy: the debris list length is exactly 10.
17. `voxel: gravity 0 leaves a debris cube's vertical speed unchanged over one step` — a world with gravity 0, no solids; push one debris entry by hand with a rolled vy and t 0; one step of dt 1/60: vy is unchanged exactly; a world with the default gravity changes it by minus G times dt within 1e-12.
18. `voxel: a handed hit record is the one the query writes` — a world query from makeWorldQuery with a record from makeHit; a box solid on the x axis; a hit through the query fills that record (t over 0, solid 0) and leaves the module's default record's t as it was before the call.
19. `voxel: the contract counts every problem` — `checkPrim({ c: [0, 0], s: "x", m: 9, p: 5, brk: "y" }, [{ name: "air" }, { name: "wood" }])` returns exactly 5 problems; `checkPrim({ c: [0, 1, 0], s: [1, 1, 1], m: 1 }, [{ name: "air" }, { name: "wood" }])` returns 0; `checkPrim(null)` returns 1.
20. `voxel: the module imports only from its own folder or a sibling module` — read the module file with fs and assert every `import ... from "<x>"` specifier matches `^\.\.\/[a-z0-9-]+\/` or `^\.\/`.

The count line becomes `voxel-test: 20 PASS / 0 FAIL`, then `voxel-test PASS`, exit 0. Any FAIL stops the task.

## Steps

1. Read the list above. Confirm.
2. Write the module changes.
3. Write the gate changes.
4. Run, from the worktree root, twice: `node scripts/voxel-test.mjs`. Both runs must print the seeds line, 20 PASS lines, the count line, and the verdict, exit 0. Paste both outputs whole in the report. Then run `node scripts/support-test.mjs` once; it must still print its count line unchanged and `support-test PASS`; paste its last two lines.
5. Write `docs/plans/phase-0.0.91-voxel.md` in the worktree, this shape:

```
# Phase 0.0.91 — voxel: media and gravity handed in

Status: PLANNED. Built in worktree, awaiting the landing.
<!-- At landing this line becomes: Status: LANDED, commit `<hash>`, <date>. Gate: 20 PASS / 0 FAIL; bracket unmoved. -->

<One paragraph: the second pass over the voxel module under the general parts order, phase A4; what moved, in plain words.>

## Lift kind

SHAPED second pass — the carve, contact, debris, collapse, and cluster laws are untouched; the media table, gravity, the limits, and the hit record are handed to the maker, defaults the demo's; the prim contract. The changes are the numbered list in the module header.

## Acceptance arithmetic for the phase

Every number below is the run's output (rolled seeds <the two seeds>; the landed checks keep their fixture seeds).

- `node scripts/voxel-test.mjs` prints a seeds line, 20 PASS lines, then `voxel-test: 20 PASS / 0 FAIL`, then `voxel-test PASS`, exit 0.
- The fourteen landed checks are verbatim. The support gate's count line unchanged in the worktree.
- Bracket, run at the landing: voxel, support.

## Tasks

- 0.0.91-1 — the second pass. → `task-0.0.91-1-voxel.md`
```

6. Commit on your branch, all three files, with this message exactly:

```
phase 0.0.91 — voxel: media and gravity handed in

Second pass under the general parts order. Media, gravity, the limits, and the hit record are options with the demo's defaults; the world query honors a handed record; the prim contract. Gate 20 PASS / 0 FAIL at rolled seeds; the fourteen landed checks verbatim.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01QSq3kZC3Bk9SC5RwnqYUfs
```

Do not push. Do not touch main.

## Rules

- No timed simulations beyond the landed checks' own steps, which stay as they are. Rolled seeds, printed. No new literal that is one seed's own output.
- The landed checks stay verbatim; only the count line moves.
- Never edit a demo file, the gate table, the README, the package version, the registry table, another module, or another phase's documents.

## Report

Read-confirmation first (each file, its line count). One line of outcome. Then bullets: both gate outputs whole and the support tail; the diff summary as files and line counts (`git diff --stat` against main); the commit hash on your branch; every nonconformity as its own labeled bullet. Fixture seeds: the two rolled seeds, and the landed ones; no seed is special.

## The report's gate lines

- `node scripts/voxel-test.mjs`: seeds 23342392 and 1361230110; 20 PASS lines, `voxel-test: 20 PASS / 0 FAIL`, `voxel-test PASS`, exit 0, twice. The support tail in the worktree: `support-test: 16 PASS / 0 FAIL`, seed 2528614729.
- Bracket at the landing: voxel, support, ballistics, registry, every tail PASS.
- Branch commit 3ddb850 on phase/0.0.91-voxel, landed by squash into main.
- Nonconformities the agent named: the diff summary was taken against the branch's fork point, main having moved on under it; the gate's top comment was left saying fourteen checks and seed 9, and the landing corrected it to twenty checks with the rolled seed named, a comment only; the gate imports fs for check 20; the second-pass header list was composed in the pattern of the solids and ballistics headers; the roll ranges the brief left unnamed were chosen inside the stream. None moved a check or an option.
