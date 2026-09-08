# Phase 0.0.74 — the 2-D canvas renderer core, with the gravity-warped grid

Status: LANDED, commit `fb4f416`, 2026-09-08. Gate: 5 PASS / 0 FAIL; prior gates unmoved.
<!-- At landing this line becomes: Status: LANDED, commit `<hash>`, <date>. Gate: 5 PASS / 0 FAIL; prior gates unmoved. -->

Serves the checklist box "The 2-D canvas renderer, with the gravity-warped grid." Source: the deadweight hangar demo, read-only — cam (line 841), the screen-center and lock globals (842), the iso projection (843–848), the well render profile (849–853), the dip depth and reference (854), the dip itself (855–858), the two-pass grid draw (860–897), the per-frame bookkeeping (2642, 2658). The demo's higher draws (world, ship, status) are page-owned and do not move; the wells module's potField already proved this substitution pattern at 0.0.38.

## Lift kind

VERBATIM MATH — the formulas are the demo's exactly: the projection, the profile, the dip with its clamp, both grid passes with every constant. The numbered substitutions are in the module header (eight of them: the page globals cam, VCX/VCY, potLock, DEEP/_pR, ctx, the palette keys, and the mode-flag guard move onto the maker's surface; the demo's own local constants C30/S30 carry unchanged). Anything else differing from the cited lines is a finding against the plan.

## Rulings inside this plan

- The maker's defaults are the demo's numbers: dip depth 4.4, grid reach 44, spacing 5, the light theme's two palette values (the only keys the grid draw reads).
- The flatten guard (the demo's non-flight mode) is the option `flat`, named as the rule it relaxes: flat=true draws the fabric unwarped.
- The gate alone lands the module. No viewing page ships; look is judged live on your word, not in a phase gate.
- Registry seam: draw.

## The walk

No page ships. The path touched is a renderer author's calls: make the surface with a drawing context and wells, resize, frame, project, drawGrid. Phone and desktop: no interface in this phase.

## Standing condition, named

The registry gate's line `registry-test: 4 PASS / 1 FAIL` (the ghost check, red before this phase) is pinned unchanged on both sides. This task registers its own module, so it adds no ghost.

## Acceptance arithmetic for the phase

Every number below was produced by running the exact planned code at plan-writing time (scratch trial, rolled seeds 525311021, 264690287, 513776275, 168615911, 492252882, 11526673).

- `node scripts/gate.mjs render2d` prints a rolled seeds line, 5 PASS lines, then `render2d-test: 5 PASS / 0 FAIL`, then `render2d-test PASS`, exit 0. The gate runs headless on a recording stub context; no picture is judged.
- Load-bearing knowns carried from the demo's own lines: dip depth 4.4, grid reach 44 and spacing 5, the 30-degree projection constants, the palette keys net and grav.
- Prior gates: `wells-test PASS` and `aim-test PASS` unmoved; `registry-test: 4 PASS / 1 FAIL` unmoved.

## Tasks

- 0.0.74-1 — land the renderer core, its gate, its registry and gate-table lines, the record close. → `task-0.0.74-1-render2d.md`

Suggested model: Sonnet 5 — every file's full content is in the plan.
