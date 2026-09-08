// COMBO-ENGINE — solids-test: the plane-set solids module's gate. Sixteen
// checks, the first twelve seedless and the rest at a rolled seed; the knowns are closed-form distances the
// demo's own geometry implies (a 45-degree box corner at 10 - sqrt(2), a
// 4-gon prism's face at 10 - sqrt(1/2), a 64-gon's face at 10 - cos(pi/64)).
import fs from "node:fs";
import { makeBox, makeBoxYaw, makePrism, makeSlab, hit, raySolid, raycastWorld, rayBlocked, makeHit, checkSolid } from "../src/modules/solids/solids.js";

let pass = 0, fail = 0;
const check = (name, ok) => { if (ok) { pass++; console.log("PASS " + name); } else { fail++; console.log("FAIL " + name); } };
const near = (a, b) => Math.abs(a - b) < 1e-9;

// a small seeded stream so checks 13-14 roll fresh positions every run, printed for replay.
function makeRng(seed) {
  let s = seed >>> 0;
  return function () {
    s |= 0; s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const SEED = process.env.SEED !== undefined ? (Number(process.env.SEED) >>> 0) : Math.floor(Math.random() * 2 ** 31);
console.log("seeds " + JSON.stringify({ solids: SEED }));
const rng = makeRng(SEED);

const unit = makeBox(0, 0, 0, 1, 1, 1, 3);

check("box entry: unit box from x=-10 enters at 9.5, exits at 10.5, normal (-1,0,0)",
  raySolid(unit, -10, 0, 0, 1, 0, 0) && near(hit.t, 9.5) && near(hit.tx, 10.5) && hit.nx === -1 && hit.ny === 0 && hit.nz === 0);

check("box miss: the same ray two units up finds nothing",
  raySolid(unit, -10, 2, 0, 1, 0, 0) === false);

check("world hit: path through the unit box is exactly 1, material carried, solid indexed",
  raycastWorld([unit], -10, 0, 0, 1, 0, 0, 100) && near(hit.path, 1) && hit.mat === 3 && hit.solid === 0);

check("inside start: a ray born inside the box reports no world hit",
  raycastWorld([unit], 0, 0, 0, 1, 0, 0, 100) === false);

check("slab is box: makeSlab returns the same six planes as makeBox",
  (() => { const s = makeSlab(1, 2, 3, 4, 5, 6, 7), b = makeBox(1, 2, 3, 4, 5, 6, 7);
    if (s.n !== b.n || s.mat !== b.mat) return false;
    for (let i = 0; i < 24; i++) if (s.planes[i] !== b.planes[i]) return false;
    return true; })());

check("turned box: a 2-cube yawed 45 degrees meets the x ray at its corner, 10 - sqrt(2)",
  raySolid(makeBoxYaw(0, 0, 0, 2, 2, 2, 0, Math.PI / 4), -10, 0, 0, 1, 0, 0) && near(hit.t, 10 - Math.SQRT2));

check("zero yaw short-circuits: makeBoxYaw(ry=0) is makeBox's axis-aligned planes",
  (() => { const y = makeBoxYaw(0, 0, 0, 2, 2, 2, 0, 0);
    return y.n === 6 && y.planes[0] === 1 && y.planes[3] === 1; })());

check("4-gon prism: the ring sits a face at 10 - sqrt(1/2) on the x ray",
  raySolid(makePrism(0, 0, 0, 2, 2, 2, 0, 4, "y"), -10, 0, 0, 1, 0, 0) && near(hit.t, 10 - Math.SQRT1_2));

check("prism cap: straight down onto the y=1 cap enters at 9",
  raySolid(makePrism(0, 0, 0, 2, 2, 2, 0, 4, "y"), 0, 10, 0, 0, -1, 0) && near(hit.t, 9));

check("64-gon prism: a near-cylinder's face meets the x ray at 10 - cos(pi/64)",
  raySolid(makePrism(0, 0, 0, 2, 2, 2, 0, 64, "y"), -10, 0, 0, 1, 0, 0) && near(hit.t, 10 - Math.cos(Math.PI / 64)));

check("nearest wins, maxT rules: of two boxes the near one is chosen; past maxT nothing is",
  (() => { const far = makeBox(5, 0, 0, 1, 1, 1, 9);
    const both = raycastWorld([far, unit], -10, 0, 0, 1, 0, 0, 100) && hit.solid === 1 && near(hit.t, 9.5);
    const capped = raycastWorld([far], -10, 0, 0, 1, 0, 0, 5) === false;
    return both && capped; })());

check("occlusion: the wall blocks the lamp segment, the offset segment passes clean",
  (() => { const wall = makeBox(0, 0, 0, 1, 4, 4, 0);
    return rayBlocked([wall], -5, 0, 0, 5, 0, 0, -1) === 1
      && rayBlocked([wall], -5, 5, 0, 5, 5, 0, -1) === 0
      && rayBlocked([wall], -5, 0, 10, 5, 0, 10, -1) === 0; })());

check("two records: raycasts into two makeHit records do not disturb each other at rolled solids",
  (() => {
    let ok = true;
    for (let i = 0; i < 300; i++) {
      const cNear = 3 + rng() * 34;
      const cFar = cNear + 3 + rng() * (40 - cNear - 3);
      const boxNear = makeBox(cNear, 0, 0, 1, 1, 1, 3);
      const boxFar = makeBox(cFar, 0, 0, 1, 1, 1, 9);
      const r1 = makeHit(), r2 = makeHit();
      const got1 = raycastWorld([boxNear], -100, 0, 0, 1, 0, 0, 1000, r1);
      const snap = { t: r1.t, tx: r1.tx, nx: r1.nx, ny: r1.ny, nz: r1.nz, solid: r1.solid, path: r1.path, mat: r1.mat };
      const got2 = raycastWorld([boxFar], -100, 0, 0, 1, 0, 0, 1000, r2);
      const unchanged = Object.keys(snap).every((k) => snap[k] === r1[k]);
      const own1 = near(r1.t, cNear + 99.5) && r1.solid === 0;
      const own2 = near(r2.t, cFar + 99.5) && r2.solid === 0;
      if (!(got1 && got2 && unchanged && own1 && own2)) { ok = false; break; }
    }
    return ok;
  })());

check("default record and passed record agree",
  (() => {
    const cA = 3 + rng() * 34;
    const cB = cA + 3 + rng() * (40 - cA - 3);
    const world = [makeBox(cA, 0, 0, 1, 1, 1, 3), makeBox(cB, 0, 0, 1, 1, 1, 5)];
    const gotDefault = raycastWorld(world, -100, 0, 0, 1, 0, 0, 1000);
    const rec = makeHit();
    const gotPassed = raycastWorld(world, -100, 0, 0, 1, 0, 0, 1000, rec);
    return gotDefault && gotPassed &&
      near(hit.t, rec.t) && near(hit.tx, rec.tx) && near(hit.nx, rec.nx) &&
      near(hit.ny, rec.ny) && near(hit.nz, rec.nz) &&
      hit.solid === rec.solid && hit.mat === rec.mat && near(hit.path, rec.path);
  })());

check("the contract counts every problem of a broken solid",
  checkSolid({ planes: [0, 0, 0], n: 3, min: [0, 0], max: [0, 0, "a"], mat: 1.5 }).length === 5 &&
  checkSolid(makeBox(0, 0, 0, 1, 1, 1, 3)).length === 0 &&
  checkSolid(null).length === 1);

check("the module imports only from its own folder or a sibling module",
  (() => {
    const src = fs.readFileSync(new URL("../src/modules/solids/solids.js", import.meta.url), "utf8");
    const re = /import\s+[^;]*?from\s+["']([^"']+)["']/g;
    const specs = [];
    let m;
    while ((m = re.exec(src))) specs.push(m[1]);
    return specs.every((x) => /^\.\.\/[a-z0-9-]+\//.test(x) || /^\.\//.test(x));
  })());

console.log(`solids-test: ${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
console.log("solids-test PASS");
