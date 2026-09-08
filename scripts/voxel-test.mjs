// COMBO-ENGINE — voxel-test: the voxel destruction module's gate. Twenty
// checks. Seed 9 drives every debris stream in the fourteen landed checks;
// the six added roll a seed, printed; no seed is special. The
// fixture is a 1 x 2 x 0.2 concrete wall voxelized at the demo's own
// concrete cell size (0.115 -> a 9 x 17 x 2 field of 306 cells); the demo's
// full size table rides as options data.
import fs from "node:fs";
import { makeBox, hit, makeHit } from "../src/modules/solids/solids.js";
import { M, mulberry32 } from "../src/modules/ballistics/ballistics.js";
import { VOX, voxelize, voxCentre, voxRay, makeWorldQuery, computeAnchors, makeVoxWorld, checkPrim } from "../src/modules/voxel/voxel.js";

let pass = 0, fail = 0;
const check = (name, ok) => { if (ok) { pass++; console.log("PASS " + name); } else { fail++; console.log("FAIL " + name); } };
const near = (a, b, e) => Math.abs(a - b) < (e || 1e-9);

const SIZES = { glass: 0.07, wood: 0.10, strut: 0.07, concrete: 0.115, steel: 0.09, steelD: 0.09, hub: 0.07, target: 0.055, def: 0.11 };
const wallPr = () => ({ c: [0, 1, 0], s: [1, 2, 0.2], p: 'concrete', m: M.concrete });
const groundAt = (w) => { const g = makeBox(0, -0.5, 0, w, 1, w, 0); g.prim = null; return g; };

const SEED = process.env.SEED ? Number(process.env.SEED) : Math.floor(Math.random() * 0x100000000);
console.log(`seeds ${JSON.stringify({ voxel: SEED })}`);
const rng = mulberry32(SEED);
const roll = (lo, hi) => lo + rng() * (hi - lo);

{ const f = voxelize(wallPr(), SIZES.concrete);
  check("voxelize: the wall becomes a 9 x 17 x 2 field of 306 cells, cell sizes s/n",
    f.nx === 9 && f.ny === 17 && f.nz === 2 && f.count === 306
    && near(f.sx, 1 / 9) && near(f.sy, 2 / 17) && near(f.sz, 0.1)); }

check("halving cap: a 10-cube at target size halves down to 22 x 22 x 22 = 10648, under MAX_PER_PRIM",
  (() => { const f = voxelize({ c: [0, 0, 0], s: [10, 10, 10], p: 'target', m: 0 }, SIZES.target);
    return f.nx === 22 && f.ny === 22 && f.nz === 22 && f.count === 10648 && f.count <= VOX.MAX_PER_PRIM; })());

{ const f = voxelize(wallPr(), SIZES.concrete);
  const out = [0, 0, 0];
  voxCentre(f, 0, out);
  check("voxCentre: cell 0 sits half a cell in from the field origin",
    near(out[0], f.ox + f.sx / 2) && near(out[1], f.oy + f.sy / 2) && near(out[2], f.oz + f.sz / 2)); }

{ const f = voxelize(wallPr(), SIZES.concrete);
  const ok = voxRay(f, 0.01, 1.01, -5, 0, 0, 1, 100);
  check("pristine ray: straight through the wall enters at 4.9, path the full 0.2 thickness, concrete carried",
    ok === true && near(hit.t, 4.9, 1e-5) && near(hit.path, 0.2, 1e-4) && hit.mat === M.concrete); }

{ const w = makeVoxWorld({ rng: mulberry32(9), sizes: SIZES });
  const pr = wallPr();
  const frac = w.damage(pr, 0, 1, -0.1, 900, 0, 0, 0.5);
  check("carve law: 900 J opens radius min(2.6, 0.2 + 30 x 0.028) = 1.04 — 8 of 306 cells survive, prim gone",
    near(frac, 8 / 306) && pr.gone === 1);
  check("debris budget: 298 cells fly, all inside the 340 pool, overflow none",
    w.dyn.length === 298 && w.dyn.length <= VOX.MAX_DYN && w.rubble.length === 0); }

{ const w = makeVoxWorld({ rng: mulberry32(9), sizes: SIZES });
  const pr = wallPr();
  const frac = w.damageTunnel(pr, 0, 1, -0.12, 0, 1, 0.12, 0, 0, 3, 2400, 1);
  const bored = voxRay(pr.__f, 0, 1, -5, 0, 0, 1, 100);
  check("bored tunnel: a perforating shot removes 18 cells (288/306 live) and the ray now passes down the bore",
    near(frac, 288 / 306) && w.dyn.length === 18 && bored === false); }

{ const w = makeVoxWorld({ rng: mulberry32(9), sizes: SIZES });
  const pr = wallPr();
  const f = w.fieldFor(pr);
  const n = computeAnchors(f, [groundAt(20)], pr);
  check("anchors: the floor layer plus the demo's ledge ring above it — 36 anchored cells",
    n === 36 && f.anchorCount === 36); }

{ const w = makeVoxWorld({ rng: mulberry32(9), sizes: SIZES });
  const pr = wallPr();
  const f = w.fieldFor(pr);
  const ground = groundAt(20);
  for (let i = 0; i < f.count; i++) { const iy = ((i / f.nz) | 0) % f.ny; if (iy === 8) f.alive[i] = 0; }
  const made = w.collapse(f, [ground]);
  const C = w.clusters[0];
  check("collapse: the severed top comes off as one cluster of 144 cells with mass rho x cell volume x 144",
    made === 1 && C.nc === 144 && near(C.mass, 2400 * f.sx * f.sy * f.sz * 144, 1e-6));
  let steps = 0;
  while (w.clusters.length && steps++ < 2000) w.stepClusters(1 / 120, [ground]);
  check("rubble that stacks: the cluster lands in 55 steps, bakes 144 rubble cells, the height map rises",
    steps === 55 && w.rubble.length === 144 && w.rubbleTop(C.x, C.z) > 0.9); }

{ const w = makeVoxWorld({ rng: mulberry32(9), sizes: SIZES });
  const pr = wallPr();
  const f = w.fieldFor(pr);
  const ground = groundAt(20);
  for (let i = 0; i < f.count; i++) { const iy = ((i / f.nz) | 0) % f.ny; if (iy === 8) f.alive[i] = 0; }
  w.collapse(f, [ground]);
  const C = w.clusters[0];
  C.vy = -10; C.y = 0.6;
  let steps = 0;
  while (w.clusters.length && steps++ < 20) w.stepClusters(1 / 120, [ground]);
  check("shatter: past 7.5 m/s the landing cluster bursts into debris cubes instead of baking",
    w.clusters.length === 0 && w.dyn.length === 144 && w.rubble.length === 0); }

{ const run = () => { const w = makeVoxWorld({ rng: mulberry32(9), sizes: SIZES });
    const pr = wallPr(); w.damage(pr, 0, 1, -0.1, 900, 0, 0, 0.5);
    const ground = groundAt(40);
    for (let k = 0; k < 240; k++) w.step(1 / 120, [ground]);
    return [w.dyn.length, w.rubble.length, w.rubble[w.rubble.length - 1].x]; };
  const a = run(), b = run();
  check("determinism: two seeded worlds settle 295 rubble cells with 3 still moving, bit-identical",
    a[0] === 3 && a[1] === 295 && a[0] === b[0] && a[1] === b[1] && a[2] === b[2]); }

{ const w = makeVoxWorld({ rng: mulberry32(9), sizes: SIZES });
  w.raiseRubble(1, 1, 0.5); w.raiseRubble(1, 1, 0.3);
  check("height map: the top of a rubble cell only ever rises", w.rubbleTop(1, 1) === 0.5); }

{ const pr = wallPr();
  const f = voxelize(pr, SIZES.concrete);
  const nearBox = makeBox(0, 1, -2, 1, 1, 0.2, 3);
  const q = makeWorldQuery(() => [nearBox], () => [f]);
  const solidWins = q(0.01, 1.01, -5, 0, 0, 1, 100) && hit.solid === 0 && hit.mat === 3;
  const q2 = makeWorldQuery(() => [], () => [f]);
  const fieldWins = q2(0.01, 1.01, -5, 0, 0, 1, 100) && hit.solid === 0 && hit.mat === M.concrete;
  check("one query: the nearer of plane-set solid and voxel field wins, fields index after solids",
    solidWins && fieldWins); }

{ let ok15 = true;
  for (let i = 0; i < 20; i++) {
    const sx = roll(0.5, 2), sy = roll(0.5, 2), sz = roll(0.5, 2);
    const rho1 = roll(500, 5000);
    const mediaA = [{ name: 'air', rho: 1.225 }, { name: 'solid', rho: rho1 }];
    const mediaB = [{ name: 'air', rho: 1.225 }, { name: 'solid', rho: rho1 * 2 }];
    const dseed = Math.floor(rng() * 0x100000000);
    const w1 = makeVoxWorld({ rng: mulberry32(dseed), media: mediaA });
    const w2 = makeVoxWorld({ rng: mulberry32(dseed), media: mediaB });
    const pr1 = { c: [0, 0, 0], s: [sx, sy, sz], m: 1 };
    const pr2 = { c: [0, 0, 0], s: [sx, sy, sz], m: 1 };
    const energy = roll(200, 3000);
    const ivx = roll(-2, 2), ivy = roll(-2, 2), ivz = roll(-2, 2);
    w1.damage(pr1, 0, 0, 0, energy, ivx, ivy, ivz);
    w2.damage(pr2, 0, 0, 0, energy, ivx, ivy, ivz);
    w1.dropPrimAsCluster(pr1);
    w2.dropPrimAsCluster(pr2);
    if (w2.clusters[0].mass !== 2 * w1.clusters[0].mass) { ok15 = false; break; }
  }
  check("voxel: with rho doubled in a handed media table, debris mass and cluster mass double exactly", ok15); }

{ const w = makeVoxWorld({ rng: mulberry32(Math.floor(rng() * 0x100000000)), sizes: SIZES, limits: { MAX_DYN: 10 } });
  const pr = wallPr();
  w.damage(pr, 0, 1, -0.1, 900, 0, 0, 0.5);
  check("voxel: limits with MAX_DYN 10 cap the debris list at 10", w.dyn.length === 10); }

{ const vy0 = roll(-5, 5);
  const cube = () => ({ x: 0, y: 5, z: 0, vx: 0, vy: vy0, vz: 0, ra: 0, rb: 0, wa: 0, wb: 0, sx: 0.1, sy: 0.1, sz: 0.1, s: 0.1, t: 0, sleep: 0 });
  const w0 = makeVoxWorld({ gravity: 0 });
  w0.dyn.push(cube());
  w0.step(1 / 60, []);
  const okZero = w0.dyn.length === 1 && w0.dyn[0].vy === vy0;
  const w1 = makeVoxWorld({});
  w1.dyn.push(cube());
  w1.step(1 / 60, []);
  const okDefault = w1.dyn.length === 1 && near(w1.dyn[0].vy, vy0 - w1.g * (1 / 60), 1e-12);
  check("voxel: gravity 0 leaves a debris cube's vertical speed unchanged over one step", okZero && okDefault); }

{ const rec = makeHit();
  const before = hit.t;
  const boxSolid = makeBox(5, 0, 0, 1, 1, 1, 2);
  const q = makeWorldQuery(() => [boxSolid], () => [], rec);
  const ok = q(0, 0, 0, 1, 0, 0, 100) && rec.t > 0 && rec.solid === 0 && hit.t === before;
  check("voxel: a handed hit record is the one the query writes", ok); }

check("voxel: the contract counts every problem",
  checkPrim({ c: [0, 0], s: "x", m: 9, p: 5, brk: "y" }, [{ name: "air" }, { name: "wood" }]).length === 5 &&
  checkPrim({ c: [0, 1, 0], s: [1, 1, 1], m: 1 }, [{ name: "air" }, { name: "wood" }]).length === 0 &&
  checkPrim(null).length === 1);

{ const src = fs.readFileSync(new URL("../src/modules/voxel/voxel.js", import.meta.url), "utf8");
  const specifiers = [...src.matchAll(/^import\s.*?\sfrom\s+["']([^"']+)["']/gm)].map((m) => m[1]);
  const ok = specifiers.every((s) => /^\.\.\/[a-z0-9-]+\//.test(s) || /^\.\//.test(s));
  check("voxel: the module imports only from its own folder or a sibling module", ok); }

console.log(`voxel-test: ${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
console.log("voxel-test PASS");
