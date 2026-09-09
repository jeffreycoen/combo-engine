# Task 0.0.101-1 — render3d, second half: the draw

One job: lift the drawing half of the 3-D lit renderer from the shooting-range demo onto a context object under the general parts order, phase B6, and flip the box. Write exactly the design below, run the gate, write the phase document, commit on your branch, report. You design nothing beyond this brief; anything it did not foresee stops the task and is reported as a nonconformity.

Model: Sonnet 5.

Where you work: the worktree at `/home/batman/combo-wt/render3d-draw`, branch `phase/0.0.101-render3d-draw`, branched from main after phase 0.0.100 landed. You never touch `/home/batman/combo-engine` (the main tree). You never edit `scripts/gate.mjs`, `README.md`, `package.json`, `src/modules/registry/registry.js`, any other module, `src/modules/render3d/render3d.js` (the law half, landed), or any document of another phase. You never edit a demo file.

Required reading, in order, whole (confirm each with its line count at the top of your report):
1. This file.
2. `/home/batman/combo-engine/docs/plans/batch-general-1.md`, the sections "The generalization law", "The rules of the run", and "B6, render3d, second half".
3. `/home/batman/combo-engine/holdover-greybox-range-r55-claude-opus-5.html`, these lines only, read-only source material: 1476 to 1488, 2607 to 2652, 2654 to 2668, 2713 to 2725, 2727 to 2817, 3298 to 3330, 3582 to 3703, 3706 to 3814, 3829 to 3928, 3941 to 4017.
4. `/home/batman/combo-wt/render3d-draw/src/modules/render3d/render3d.js`, whole, the law half this half calls.
5. `/home/batman/combo-wt/render3d-draw/scripts/render3d-test.mjs`, whole, the gate you extend.
6. `/home/batman/combo-wt/render3d-draw/src/modules/render2d/render2d.js` and `/home/batman/combo-wt/render3d-draw/scripts/render2d-test.mjs`, whole, the landed renderer and its recording-stub gate, the shape to follow.
7. `/home/batman/combo-wt/render3d-draw/src/modules/greybox/greybox.js` (buildSolids) and `/home/batman/combo-wt/render3d-draw/src/modules/voxel/voxel.js` (the world query and the fields), whole.
8. `/home/batman/combo-wt/render3d-draw/docs/modules/module-pattern.md`.
9. `/home/batman/combo-wt/render3d-draw/docs/plans/phase-0.0.100-render3d-law.md`, the first half's record.

## The design, fixed

New file `src/modules/render3d/draw.js`, a SHAPED lift, exporting `makeRender3d(opts)`. The law carried, cited by line: program compilation with the demo's fallbacks (1476 to 1488, 3946 to 3967); the buffer set per mesh (2654 to 2668); the static, added, and dynamic rebuilds, the patch split, and the hide queue (2727 to 2817); the flashes (2713 to 2725), which the law half already carries as addFlash and stepFlashes, imported and called on the surface's own list, not lifted again; the instanced draw with its 11-float, 44-byte layout (3298 to 3330); the frame's pass order, sky, shadow, static, added, dynamic, instanced, flat trails and markers and bore, the depth clear and the weapon set, post (3582 to 3701); the targets and the post chain (3706 to 3814); the shadow pass, the depth-instanced pass, the shadow binding, the draw sets with the outline branch or the line branch (3829 to 3928); the renderer part of init, the cube buffers, the instance arrays, the shadow target (3941 to 4017). The code is new in one way only: every page global becomes a field of the surface, the context and the clock are handed in, and nothing here touches the DOM, a canvas element, requestAnimationFrame, or a clock.

The surface, from `makeRender3d({ gl, palette, dials })`:

- Fields, seeded from the demo's globals: `gl`; `ext` (from `gl.getExtension("ANGLE_instanced_arrays")`, or null); the programs `progS, progSky, progD, progDI, progTrail, progBright, progBlur, progRays, progComp, progF, progEdge, progI`; the buffer sets `bS, bD, bW, bA, bCube, bQuad, bSky, bTrail, bMark, bBore`; the counts `nS, nSL, nA, nAL, nD, nDL, nW, nWL, nInstS, nInstD`; `shadTex, shadRB, shadFB, shadOn, LMVP`; `postOn, postW, postH, sceneFB, sceneTex, sceneRB, bloomFB, bloomTex, rayFB, rayTex`; `pal` (paletteOf(palette), default nightfall), `palIdx` (0, 1, 2 by the palette's name), `night` (palIdx equals 2); the sky set for that index as `skyTop, skyBot, haze, ambSky, ambGnd, fogC`; `light` (the sky set's sun direction, a copy); `cam` `{ pos, yaw, pitch, fov }` seeded with the demo's `[0, 7.4, 6], 0.04, -0.055, 46`; `basis` `{ r, u, f }` seeded `[1, 0, 0], [0, 1, 0], [0, 0, -1]`; `level` (empty), `world` (null), `splitBase` (0), `staticRanges` (null), `zeroScratch` (null), `hideQueue` (empty), `addedDirty` (0), `pendingRebuild` (0); `lamps`, `flashes`, `litA`, `litB`; `vox` (null), `instS`, `instD`; `trails` (empty object), `sparks`, `markers` (empty lists), `showBore` (0); `vpW`, `vpH` (1); `shaderErr`, `glLimits`; and the dials `{ outline: OUTLINE_PX, shadN: SHAD_N, shadHalf: SHAD_HALF, fogK: FOG_K, grain: 0.028, vignette: 0.62 }` merged over `opts.dials`.
- Methods, the demo's functions with the globals read from the fields: `init()` (the renderer part of init: programs with their fallbacks, the quad and sky buffers, the trail buffer, mkbuf on the four sets, the mark and bore buffers, the extension and the instanced programs, the cube buffers and the instance arrays sized by the voxel limits, the shadow texture, renderbuffer, and framebuffer); `resize(w, h)` (stores vpW and vpH; the canvas is the page's); `setLevel(level, splitBase)` then `rebuildStatic(full)`, `rebuildDynamic()`; `setVoxels(vox)`; `packInstances(colFn)` (fills instS from the law half's intactInstances and instD from dynInstances plus clusterInstances, uploads both to bCube.s and bCube.d, sets nInstS and nInstD); `setCamera(cam, basis)`; `setLight(light)`; `mkbuf`, `upload`, `patchAt`, `hideStaticPrim`, `flushHides`, `queueHide`, `mkTarget`, `buildPost`, `fsQuad`, `sunScreenUV(MVP)`, `postPass(MVP, t)`, `shadowPass()`, `drawDepthInstanced`, `bindShadow(prog, t)`, `drawSet(MVP, b, nTri, nLine)`, `disableAttrs`, `bind`, `drawInstanced`; and `frame(t)`, the draw part of the demo's frame in the demo's order: the shadow pass when shadOn, buildPost and the scene target when postOn, the clear, the sky, the perspective and view from the law half's m4persp and m4view, the three draw sets, the two instanced draws, the flat program for trails and sparks and markers, the bore when showBore, the depth clear and the weapon set, and the post pass; `t` is the clock in seconds, handed in, used where the demo read performance.now. The stick, the reticle, the hurt overlay, the hud, and the frame scheduling stay with the page.
- `export const RENDER_DIALS_CONTRACT` and `export function checkRenderDials(d)` returning a list of plain problem strings, empty when clean, every problem in one pass: not an object gives the single problem `dials: not an object`; then `dials.outline: number > 0 required`, `dials.shadN: integer > 0 required`, `dials.shadHalf: number > 0 required`, `dials.fogK: number >= 0 required`, `dials.grain: number >= 0 required`, `dials.vignette: number >= 0 required`.

The file header states the lift: MODULE: render3d, the draw half, the box it flips, the demo lines, the law carried, what is new.

Gate `scripts/render3d-test.mjs`: the eleven landed checks stay verbatim, in order, with their names. Add a recording stub context in the gate, the way the 2-D renderer's gate records its canvas: an object whose every WebGL method records its name and its arguments into a log and returns what the demo expects: createShader, createProgram, createBuffer, createTexture, createFramebuffer, createRenderbuffer return fresh handles; getShaderParameter and getProgramParameter return true; getUniformLocation returns a stable object per program and name; getAttribLocation returns a stable index per name, at least 0; getExtension("ANGLE_instanced_arrays") returns a stub with vertexAttribDivisorANGLE and drawArraysInstancedANGLE that record; checkFramebufferStatus returns the FRAMEBUFFER_COMPLETE constant; getParameter returns 256; every constant the module reads (TRIANGLES, LINES, POINTS, ARRAY_BUFFER, FLOAT, DEPTH_TEST, BLEND, and the rest) is a distinct number. Then these checks, appended after the eleven:

12. `render3d draw: init compiles the twelve programs and builds the shadow target on a recording stub` — after `makeRender3d({ gl: stub }).init()` the log holds exactly 12 createProgram calls, 24 createShader calls, 1 createTexture, 1 createRenderbuffer, 1 createFramebuffer, and shadOn is 1.
13. `render3d draw: one frame issues the passes in the stated order with draw calls equal to the sets present` — a surface after init, resize(640, 480), a level of three boxes (structural), and a ghost box, `setLevel` then `rebuildDynamic`, no voxels, no trails, no markers; `frame(1.5)`: the ordered list of programs handed to useProgram equals `[progD, progSky, progS, progEdge, progS, progEdge, progF, progBright, progBlur, progBlur, progRays, progComp]`, and the drawArrays count is 12 (two in the shadow pass, one sky, two per drawn set, five in the post chain); the post targets were built once (4 createTexture and 4 createFramebuffer calls since init).
14. `render3d draw: twin frames on twin stubs record identical call logs` — two surfaces over two stubs, the same level and the same t: the logs' JSON is equal.
15. `render3d draw: the outline branch draws when its dial is on and not when off` — a surface built with `dials: { outline: 0 }` compiles no edge program (progEdge null) and its frame uses progF with LINES for each set's lines instead of progEdge; the default surface uses progEdge and no LINES draw for the sets.
16. `render3d draw: instances draw when a voxel world is set` — a surface with a voxel world holding a damaged prim (debris over 0) and a dropped cluster; `packInstances(() => [1, 1, 1])` gives nInstD over 0; the next frame records drawArraysInstancedANGLE with count nInstD under progI, and the shadow pass records it under progDI.
17. `render3d draw: patchAt splits a prim into at most six rest boxes and a patch, hides the original, and queues a rebuild` — a level with one box of size 4 by 3 by 4 at the origin; `patchAt(pr, x, y, z)` at a rolled point inside: the level grows by at most 7 and at least 2, the original is dead and in the hide queue, addedDirty and pendingRebuild are 1; `flushHides()` on a surface whose static ranges exist records bufferSubData calls and zeroes the prim's ranges.
18. `render3d draw: the contract counts every problem` — `checkRenderDials({ outline: 0, shadN: 1.5, shadHalf: 70, fogK: -1, grain: 0.028, vignette: 0.62 })` returns exactly 3 problems; the surface's own dials return 0; null returns 1.
19. `render3d draw: the draw half imports only from its own folder or a sibling module` — read draw.js with fs and assert every `import ... from "<x>"` specifier matches `^\.\.\/[a-z0-9-]+\/` or `^\.\/`.

The count line becomes `render3d-test: 19 PASS / 0 FAIL`, then `render3d-test PASS`, exit 0. Any FAIL stops the task.

## Steps

1. Read the list above. Confirm.
2. Write `src/modules/render3d/draw.js`.
3. Extend the gate.
4. Run, from the worktree root, twice: `node scripts/render3d-test.mjs`. Both runs must print the seeds line, 19 PASS lines, the count line, and the verdict, exit 0. Paste both outputs whole in the report.
5. Write `docs/plans/phase-0.0.101-render3d-draw.md` in the worktree, this shape:

```
# Phase 0.0.101 — render3d, second half: the draw

Status: PLANNED. Built in worktree, awaiting the landing.
<!-- At landing this line becomes: Status: LANDED, commit `<hash>`, <date>. Gate: 19 PASS / 0 FAIL; bracket unmoved. -->

The second of two phases for the checklist box "The 3-D lit renderer: shadows, baked lamps, sky, finishing pass, edge outlines, instanced debris"; the box flips here. Source: the shooting-range demo, read-only, the lines the task names. <One more sentence in plain words: what this half does on a context object and what the page keeps.>

## Lift kind

SHAPED — the law carried: the pass order, the shadow map, the four-light budget, the outline pass, the post chain, the instanced draw and its layout. New: one surface over a handed context and clock; every page global a field; no DOM, no canvas element, no frame scheduling.

## Rulings inside this plan

- The gate proves the mechanism on a recording stub; the look waits for a page, by ruling.
- Registry seam: draw. The registry line changes at the landing; the gate-table line stands.

## Acceptance arithmetic for the phase

Every number below is the run's output (rolled seeds <the two seeds>).

- `node scripts/render3d-test.mjs` prints a seeds line, 19 PASS lines, then `render3d-test: 19 PASS / 0 FAIL`, then `render3d-test PASS`, exit 0.
- The eleven landed checks are verbatim.
- Bracket, run at the landing: render3d, greybox, voxel.

## Tasks

- 0.0.101-1 — the draw. → `task-0.0.101-1-render3d-draw.md`
```

6. Commit on your branch, all three files, with this message exactly:

```
phase 0.0.101 — render3d, second half: the draw

Checklist: the 3-D lit renderer. The drawing half carried from the shooting-range demo onto one surface over a handed context and clock: the pass order, the shadow map, the lamps, the outline pass, the post chain, the instanced debris. Gate 19 PASS / 0 FAIL on a recording stub at rolled seeds.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01QSq3kZC3Bk9SC5RwnqYUfs
```

Do not push. Do not touch main.

## Rules

- No DOM, no canvas element, no clocks, no frame scheduling in the module. Rolled seeds, printed. No literal that is one seed's own output.
- The landed checks stay verbatim; only the count line moves.
- Never edit a demo file, the gate table, the README, the package version, the registry table, the law half, another module, or another phase's documents.

## Report

Read-confirmation first (each file, its line count). One line of outcome. Then bullets: both gate outputs whole; the diff summary as files and line counts (`git diff --stat` against main); the commit hash on your branch; every nonconformity as its own labeled bullet. Fixture seeds: the two rolled seeds; no seed is special.

## The report's gate lines

- `node scripts/render3d-test.mjs`: seeds 2825518153 and 2681662100; 19 PASS lines, `render3d-test: 19 PASS / 0 FAIL`, `render3d-test PASS`, exit 0, twice. The eleven landed checks verbatim.
- Bracket at the landing: render3d, greybox, voxel, registry, every tail PASS; then the full self-test, the second of the order's three. The registry seam turns to draw and the README box flips at this landing.
- Branch commit 12290c1 on phase/0.0.101-render3d-draw, cut from the 0.0.100 branch and rebased onto main at the landing.
- Nonconformities the agent named, each a reading where the brief was silent: the trail colour table, defined outside every cited range, carried as a local constant; the clock stored in a field for the shadow binding, the fixed signatures carrying no clock; setCamera and setLight as plain setters, the demo having none; check 19's import pattern reads a multi-line import, check 11's not; two page-side demo globals dropped; setLevel rebuilds the static set itself. The first attempt was cut off by the output cap before any file reached the worktree; the rebuild went in pieces, the surface assembled by helper functions rather than one literal. None moved a law or a check.
- The full self-test on the merged tree at the landing: `selftest: all 46 gates PASS`.
