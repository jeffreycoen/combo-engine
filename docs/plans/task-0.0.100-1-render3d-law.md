# Task 0.0.100-1 — render3d, first half: the law

One job: lift the library-free half of the 3-D lit renderer from the shooting-range demo into a module under the general parts order, phase B5. The mesh builder, the lamp bake, the matrices, the lamp packing, the instance packing, the dials, the palettes, and the shader text as text. Nothing here draws. Write exactly the design below, run the gate, write the phase document, commit on your branch, report. You design nothing beyond this brief; anything it did not foresee stops the task and is reported as a nonconformity.

Model: Sonnet 5.

Where you work: the worktree at `/home/batman/combo-wt/render3d`, branch `phase/0.0.100-render3d-law`, branched from main after phase 0.0.91 (voxel) landed. You never touch `/home/batman/combo-engine` (the main tree). You never edit `scripts/gate.mjs`, `README.md`, `package.json`, `src/modules/registry/registry.js`, any other module, or any document of another phase. You never edit a demo file.

Required reading, in order, whole (confirm each with its line count at the top of your report):
1. This file.
2. `/home/batman/combo-engine/docs/plans/batch-general-1.md`, the sections "The generalization law", "The rules of the run", "B5, render3d, first half", and "B6, render3d, second half".
3. `/home/batman/combo-engine/holdover-greybox-range-r55-claude-opus-5.html`, these lines only, read-only source material: 456 to 503, 727 to 795, 956 to 1046, 1048 to 1093, 1097 to 1137, 1169 to 1200, 1219 to 1268, 1270 to 1474, 2070 to 2152, 2154 to 2164, 2436 to 2455, 2599 to 2611, 2635, 2638, 2641, 2670 to 2725, 2819 to 2827, 3280 to 3296, 3705, 3816 to 3827.
4. `/home/batman/combo-wt/render3d/src/modules/solids/solids.js`, whole, for rayBlocked.
5. `/home/batman/combo-wt/render3d/src/modules/voxel/voxel.js`, whole, for voxCentre, the field shape, the debris and cluster shapes, and the second pass's options.
6. `/home/batman/combo-wt/render3d/src/modules/greybox/greybox.js`, whole, for the part descriptors buildMesh consumes.
7. `/home/batman/combo-wt/render3d/docs/modules/module-pattern.md`.
8. `/home/batman/combo-wt/render3d/docs/plans/phase-0.0.73-aim.md`, as the shape of a phase document.

## The design, fixed

New module `src/modules/render3d/render3d.js`, VERBATIM MATH inside a SHAPED lift. Every function's arithmetic is the demo's exactly; the page globals each read become arguments. Substitutions, numbered in the module header, and only these:

1. Data, exported verbatim: `PALETTES`, `PAL_NAMES`, `INK`, `EMISSIVE`, `WETNESS`, `FACE`, `EDGE`, the four block dials as `BLOCK = { m: 1.55, max: 4, minArea: 2.2, amt: 0.135 }`, `PATCH_M`, `SKY_SETS`, `BLOOM_CUT`, `RAY_AMT`, `BLOOM_AMT`, `EMIS_BOOST`, `FOG_K`, `OUTLINE_PX`, `SHAD_N`, `SHAD_HALF`, `ZOOMS`. The demo's `usePalette` becomes `paletteOf(name)` returning a fresh copy of the named palette (overcast when unknown); no module-level PAL.
2. `prismMesh`, `wedgeMesh`, `rotX`, `rotY`, `primCorners`, `hash3`, `blockTint`, `lerp3`, `pushPanelled`, `pushEdge`, `pushPoly` verbatim, exported; `ngon` imported from the greybox module.
3. `buildMesh(level, want, base, pal)`: the demo's function with the palette handed in as the fourth argument in place of the global PAL; EMISSIVE and WETNESS are the module's own tables.
4. `boxMinusBox`, `patchBox` verbatim, exported.
5. `bakeLampLight(mesh, lamps, solids)` verbatim, with `rayBlocked` imported from the solids module.
6. `collectLamps(level, pal)` returns the lamp list in place of writing the global; `packLights(lamps, flashes, camPos, night)` returns `{ litA, litB }`, two Float32Array(16), with `camPos` an array of 3 in place of CAM.pos and `night` a boolean in place of the palette-index test (true gives the 1.6 boost, false 1.0); `addFlash(flashes, x, y, z, r, g, b, rad, inten, life)` and `stepFlashes(flashes, dt)` take the list as their first argument.
7. `m4mul`, `m4ortho`, `m4lookDir`, `m4persp`, `m4view` verbatim, exported; `projPx(M, x, y, z, out, vpW, vpH)` with the viewport size as arguments.
8. `cubeGeom` verbatim, exported.
9. `lightMatrix(camPos, forward, light, shadHalf = SHAD_HALF, shadN = SHAD_N)`: the demo's function with CAM.pos, basis.f, LIGHT, SHAD_HALF, and SHAD_N as arguments, `forward` an array of 3 and `light` an array of 3.
10. The instance packing the voxel lift left behind, as functions taking the voxel world first: `packAll(vox, out, colFn)`, `unpackCell(vox, f, i)`, `intactInstances(vox, out, colFn)`, `dynInstances(vox, out, colOf)`, `clusterInstances(vox, out, from, colOf)`, the demo's arithmetic exactly, with `voxCentre` imported from the voxel module; `colOf(entry)` returns `[r, g, b]` for a debris or cluster entry and defaults to reading the entry's r, g, b fields, else `[1, 1, 1]`, since the lifted voxel world carries no colour. The 11-float layout per instance is the demo's.
11. The shader sources as text, verbatim, in one exported object `SHADERS` keyed by the demo's own names: VS_SOLID, FS_SOLID, VS_MIN, FS_MIN, FS_SKY_MIN, VS_EDGE, FS_EDGE, VS_FLAT, FS_FLAT, VS_DEPTH, FS_DEPTH, VS_DEPTH_INST, VS_TRAIL, FS_TRAIL, VS_SKY, FS_SKY, VS_QUAD, FS_BRIGHT, FS_BLUR, FS_RAYS, FS_COMP, VS_INST. Plus `uniformsOf(text)` returning the list of uniform names a shader string declares (each `uniform <type> <name>` line, the name without any array suffix).
12. Contracts: `PALETTE_CONTRACT` and `checkPalette(p)` returning a list of plain problem strings, empty when clean, every problem in one pass: not an object gives the single problem `palette: not an object`; then `palette.<name>: 3 finite numbers required` for every entry that is not an array of 3 finite numbers. `checkLamp(l)`: `lamp: not an object`; then `lamp.<f>: finite number required` for x, y, z, r, g, b, rad, inten.

The module header states the lift: MODULE: render3d, the box it serves, the demo lines, the substitutions, and that the draw half arrives in the next phase.

Gate `scripts/render3d-test.mjs`, new. A rolled seed printed as `seeds {"render3d":<n>}`, read from `process.env.SEED` when set, else rolled, with the small seeded stream the other gates use. Checks, in this order and with these names:

1. `render3d: buildMesh of one plain box yields 12 triangles and 12 edge quads, and a panelled box tints deterministically` — a level of one box marked deco with a rolled size 0.5 to 3 under the nightfall palette: pos holds 36 vertices, edge.a holds 72; a second level of one structural box of size 4 by 4 by 4 built twice gives bit-equal pos, col, and edge arrays, and its vertex count exceeds 36.
2. `render3d: bakeLampLight lights nothing behind a wall and lights the facing side in the open` — a mesh of one box at the origin; a lamp at x 6 with radius 20; with a wall box between them at x 3 every baked value is 0; without the wall the vertices whose normal points toward the lamp carry a positive value and those facing away carry 0.
3. `render3d: the matrices` — m4mul(A, identity) equals A bit for bit at a rolled A; m4persp maps a point on the near plane to a clip z over w of minus 1 within 1e-6; m4ortho maps the corner (hw, hh, minus n) to (1, 1, minus 1) within 1e-6; m4view and m4lookDir both map their own eye position to the origin within 1e-6 at rolled inputs; projPx at a rolled viewport puts the eye-forward point at the viewport's centre.
4. `render3d: packLights picks the four nearest lamps by distance minus radius and scales by night` — 12 rolled lamps and a rolled camera: the four chosen equal the four smallest distance-minus-radius values in that order, litA carries their positions and radii, litB their colours times intensity times 1.6 when night is true and 1.0 when false; a lamp farther than radius plus 42 is never chosen.
5. `render3d: cubeGeom is 36 vertices with unit normals` — pos length 108, nrm length 108, every normal of length 1 within 1e-9.
6. `render3d: instance packing counts equal live cells, debris, and cluster cells at a rolled voxel world` — a voxel world over a rolled prim; damage at the prim's centre with a rolled energy: intactInstances returns the live cell count; dynInstances returns the debris count; a second prim dropped as a cluster: clusterInstances from 0 returns its cell count; packAll returns the live count and one unpackCell lowers packN by one and clears that cell's slot.
7. `render3d: lightMatrix at a rolled camera and light is the demo's own arithmetic with its texel snap` — the gate recomputes the matrix with the module's own m4lookDir, m4ortho, and m4mul from the snapped centre and asserts bit equality; the snapped centre's x and z are whole multiples of 2 times shadHalf over shadN within 1e-9.
8. `render3d: every shader carries the uniforms the draw half binds` — uniformsOf over SHADERS, array suffixes dropped: FS_SOLID declares uCam, uLA, uLB, uFogC, uSunDir, uShad, uP, uQ, uSkyC, uGndC; VS_SOLID and VS_INST each declare uMVP, uLMVP, uL, uCam; FS_FLAT declares uCol, uFogC, uFogK; FS_SKY declares uTop, uBot, uHaze, uSun, uT; FS_COMP declares uScene, uBloom, uRays, uBloomAmt, uRayAmt, uVig, uGrain; FS_BRIGHT declares uCut; FS_BLUR declares uDir; VS_EDGE declares uMVP and uPx; VS_DEPTH and VS_DEPTH_INST declare uLMVP; the total count of distinct uniform names across every shader is at least 40.
9. `render3d: twin builds agree` — a rolled level of boxes, prisms, and wedges built twice: every Float32Array bit-equal.
10. `render3d: the contracts count every problem` — `checkPalette({ a: [1, 2], b: "x" })` returns exactly 2 problems; `checkPalette(PALETTES.nightfall)` returns 0; `checkPalette(null)` returns 1; `checkLamp({ x: 1 })` returns 7.
11. `render3d: the module imports only from its own folder or a sibling module` — read the module file with fs and assert every `import ... from "<x>"` specifier matches `^\.\.\/[a-z0-9-]+\/` or `^\.\/`.

The count line is `render3d-test: 11 PASS / 0 FAIL`, then `render3d-test PASS`, exit 0. Any FAIL stops the task.

## Steps

1. Read the list above. Confirm.
2. Write the module.
3. Write the gate.
4. Run, from the worktree root, twice: `node scripts/render3d-test.mjs`. Both runs must print the seeds line, 11 PASS lines, the count line, and the verdict, exit 0. Paste both outputs whole in the report.
5. Write `docs/plans/phase-0.0.100-render3d-law.md` in the worktree, this shape:

```
# Phase 0.0.100 — render3d, first half: the law

Status: PLANNED. Built in worktree, awaiting the landing.
<!-- At landing this line becomes: Status: LANDED, commit `<hash>`, <date>. Gate: 11 PASS / 0 FAIL; bracket unmoved. -->

The first of two phases for the checklist box "The 3-D lit renderer: shadows, baked lamps, sky, finishing pass, edge outlines, instanced debris"; the box flips at the second. Source: the shooting-range demo, read-only, the lines the task names. <One more sentence in plain words: what this half holds and what the next half adds.>

## Lift kind

VERBATIM MATH inside a SHAPED lift — the mesh builder, the lamp bake, the matrices, the packing, and the shader text are the demo's exactly; the page globals they read are arguments. The numbered substitutions are in the module header.

## Rulings inside this plan

- The demo has no three.js; nothing here draws. The draw half arrives in phase 0.0.101 on a context object with a recording stub for its gate.
- Registry seam: sample for this half; draw once the second half lands. The registry and gate-table lines are the landing's.

## Acceptance arithmetic for the phase

Every number below is the run's output (rolled seeds <the two seeds>).

- `node scripts/render3d-test.mjs` prints a seeds line, 11 PASS lines, then `render3d-test: 11 PASS / 0 FAIL`, then `render3d-test PASS`, exit 0.
- Load-bearing knowns from the demo's own lines: the dials listed in substitution 1; the 11-float instance layout.
- Bracket, run at the landing: render3d, solids, voxel, greybox.

## Tasks

- 0.0.100-1 — the law. → `task-0.0.100-1-render3d-law.md`
```

6. Commit on your branch, all three files, with this message exactly:

```
phase 0.0.100 — render3d, first half: the law

The 3-D lit renderer's library-free half carried from the shooting-range demo: the mesh builder, the lamp bake, the matrices, the lamp and instance packing, the dials, the palettes, and the shader text as text. Gate 11 PASS / 0 FAIL at rolled seeds.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01QSq3kZC3Bk9SC5RwnqYUfs
```

Do not push. Do not touch main.

## Rules

- No WebGL, no canvas, no DOM in this half. Rolled seeds, printed. No literal that is one seed's own output.
- Never edit a demo file, the gate table, the README, the package version, the registry table, another module, or another phase's documents.

## Report

Read-confirmation first (each file, its line count). One line of outcome. Then bullets: both gate outputs whole; the diff summary as files and line counts (`git diff --stat` against main); the commit hash on your branch; every nonconformity as its own labeled bullet. Fixture seeds: the two rolled seeds; no seed is special.

## Amendment

Check 8 as first written placed uL, uFogK, and uLMVP in FS_SOLID and uSunDir in FS_SKY. The demo's own shader text declares uL and uLMVP in VS_SOLID and VS_INST, uFogK in FS_FLAT, and the sky's sun as uSun; uSunDir belongs to FS_SOLID. The check is rewritten above to the demo's declarations, read from the lifted text. The agent stopped on the first wording, 10 PASS / 1 FAIL at two seeds with every other check green, and resumed on this one. Also recorded: the agent read the voxel gate for the shared check convention, off the reading list.

## The report's gate lines

- `node scripts/render3d-test.mjs`: seeds 3938695847 and 2676723997; 11 PASS lines, `render3d-test: 11 PASS / 0 FAIL`, `render3d-test PASS`, exit 0, twice.
- Bracket at the landing: render3d, solids, voxel, greybox, registry, every tail PASS. The gate-table and registry lines are the landing's; the README box waits for the second half.
- Branch commit 38e3b6d on phase/0.0.100-render3d-law, landed by squash into main.
- Nonconformities the agent named: check 8 placed uniforms in the wrong shaders, a brief error resolved by the amendment above, the first run stopping at 10 PASS / 1 FAIL at seeds 2575001125 and 966515420; the voxel gate was read off the list for the shared check convention. Self-caught before any run: a dropped closing brace in blockTint's extraction and six missing exports; check 3's rolled eye range narrowed from 20 to 4 so float32 round-trips stay inside 1e-6. None moved a check or an option.
