// COMBO-ENGINE — solids-test: the plane-set solids module's gate. Twelve
// checks, seedless arithmetic; the knowns are closed-form distances the
// demo's own geometry implies (a 45-degree box corner at 10 - sqrt(2), a
// 4-gon prism's face at 10 - sqrt(1/2), a 64-gon's face at 10 - cos(pi/64)).
import { makeBox, makeBoxYaw, makePrism, makeSlab, hit, raySolid, raycastWorld, rayBlocked } from "../src/modules/solids/solids.js";

let pass = 0, fail = 0;
const check = (name, ok) => { if (ok) { pass++; console.log("PASS " + name); } else { fail++; console.log("FAIL " + name); } };
const near = (a, b) => Math.abs(a - b) < 1e-9;

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

console.log(`solids-test: ${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
console.log("solids-test PASS");
