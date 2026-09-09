# Phase 0.0.101 — render3d, second half: the draw

Status: LANDED, commit `22785ba`, 2026-09-08. Gate: 19 PASS / 0 FAIL; bracket unmoved.
<!-- At landing this line becomes: Status: LANDED, commit `<hash>`, <date>. Gate: 19 PASS / 0 FAIL; bracket unmoved. -->

The second of two phases for the checklist box "The 3-D lit renderer: shadows, baked lamps, sky, finishing pass, edge outlines, instanced debris"; the box flips here. Source: the shooting-range demo, read-only, the lines the task names. This half draws the law half's meshes and matrices to a handed WebGL context, one call per frame; the page keeps the canvas, the clock, and the frame scheduling.

## Lift kind

SHAPED — the law carried: the pass order, the shadow map, the four-light budget, the outline pass, the post chain, the instanced draw and its layout. New: one surface over a handed context and clock; every page global a field; no DOM, no canvas element, no frame scheduling.

## Rulings inside this plan

- The gate proves the mechanism on a recording stub; the look waits for a page, by ruling.
- Registry seam: draw. The registry line changes at the landing; the gate-table line stands.

## Acceptance arithmetic for the phase

Every number below is the run's output (rolled seeds 2825518153, 2681662100).

- `node scripts/render3d-test.mjs` prints a seeds line, 19 PASS lines, then `render3d-test: 19 PASS / 0 FAIL`, then `render3d-test PASS`, exit 0.
- The eleven landed checks are verbatim.
- Bracket, run at the landing: render3d, greybox, voxel.

## Tasks

- 0.0.101-1 — the draw. → `task-0.0.101-1-render3d-draw.md`
