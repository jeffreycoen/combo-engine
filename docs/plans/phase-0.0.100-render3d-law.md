# Phase 0.0.100 — render3d, first half: the law

Status: LANDED, commit stamped below, 2026-09-08. Gate: 11 PASS / 0 FAIL; bracket unmoved.
<!-- At landing this line becomes: Status: LANDED, commit `<hash>`, <date>. Gate: 11 PASS / 0 FAIL; bracket unmoved. -->

The first of two phases for the checklist box "The 3-D lit renderer: shadows, baked lamps, sky, finishing pass, edge outlines, instanced debris"; the box flips at the second. Source: the shooting-range demo, read-only, the lines the task names. This half holds the math and the data; the next half draws it to the screen.

## Lift kind

VERBATIM MATH inside a SHAPED lift — the mesh builder, the lamp bake, the matrices, the packing, and the shader text are the demo's exactly; the page globals they read are arguments. The numbered substitutions are in the module header.

## Rulings inside this plan

- The demo has no three.js; nothing here draws. The draw half arrives in phase 0.0.101 on a context object with a recording stub for its gate.
- Registry seam: sample for this half; draw once the second half lands. The registry and gate-table lines are the landing's.

## Acceptance arithmetic for the phase

Every number below is the run's output (rolled seeds 3938695847, 2676723997).

- `node scripts/render3d-test.mjs` prints a seeds line, 11 PASS lines, then `render3d-test: 11 PASS / 0 FAIL`, then `render3d-test PASS`, exit 0.
- Load-bearing knowns from the demo's own lines: the dials listed in substitution 1; the 11-float instance layout.
- Bracket, run at the landing: render3d, solids, voxel, greybox.

## Tasks

- 0.0.100-1 — the law. → `task-0.0.100-1-render3d-law.md`
