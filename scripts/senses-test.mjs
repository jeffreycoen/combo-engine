// COMBO-ENGINE — senses-test. Laws at rolled scenes: sight dies past the
// range and outside the cone; a downed watcher sees nothing; the blocked
// ray is asked with the eye clear of the body; cover is the nearest solid
// on the chest line, by index, and open ground is minus one.
import { AG } from "../src/modules/opponent/opponent.js";
import { canSee, coverSolid } from "../src/modules/senses/senses.js";
import { makeBoxYaw } from "../src/modules/solids/solids.js";
let pass = 0, fail = 0;
const check = (n, ok) => { if (ok) { pass++; console.log("PASS " + n); } else { fail++; console.log("FAIL " + n); } };
const SEED = process.env.SEED ? +process.env.SEED : Math.floor(Math.random() * 1e9);
console.log("seeds " + JSON.stringify({ scenes: SEED }));
let a2 = SEED >>> 0;
const rnd = () => { a2 = (a2 + 0x6d2b79f5) >>> 0; let t = a2; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const watcher = (fx, fz) => ({ down: 0, body: { c: [0, 1, 0] }, fx, fz });
const open = () => false;

{ let range = true;
  for (let i = 0; i < 400 && range; i++) {
    const az = rnd() * Math.PI * 2;
    const near = 1 + rnd() * (AG.VIEW_M - 2), far = AG.VIEW_M * (1.01 + rnd());
    const a = watcher(Math.sin(az), Math.cos(az));
    range = canSee(a, [], Math.sin(az) * near, 1.35, Math.cos(az) * near, open) === 1
      && canSee(a, [], Math.sin(az) * far, 1.35, Math.cos(az) * far, open) === 0;
  }
  check("senses: sight holds inside the view range and dies past it, any rolled bearing", range); }
{ let cone = true;
  for (let i = 0; i < 400 && cone; i++) {
    const a = watcher(0, 1);
    const half = AG.VIEW_DEG * Math.PI / 360;
    const inside = (rnd() * 2 - 1) * (half - 0.02), outside = (half + 0.02 + rnd()) * (rnd() < 0.5 ? 1 : -1);
    const d = 5 + rnd() * 40;
    cone = canSee(a, [], Math.sin(inside) * d, 1.35, Math.cos(inside) * d, open) === 1
      && canSee(a, [], Math.sin(outside) * d, 1.35, Math.cos(outside) * d, open) === 0;
  }
  check("senses: the cone is the stated width — a hair inside sees, a hair outside never", cone); }
{ const a = watcher(0, 1); a.down = 1;
  check("senses: a downed watcher sees nothing", canSee(a, [], 0, 1.35, 5, open) === 0); }
{ let asked = null;
  canSee(watcher(0, 1), ["marker"], 0, 1.35, 10, (solids, sx, sy, sz) => { asked = { solids, sy, sz }; return true; });
  check("senses: the blocked ray is asked once, eye height, clear of the body, and a blocked ray is blind",
    asked !== null && asked.solids[0] === "marker" && Math.abs(asked.sy - 1.35) < 1e-9 && asked.sz > 0 && asked.sz < 1); }
{ let cover = true;
  for (let i = 0; i < 300 && cover; i++) {
    const z1 = 3 + rnd() * 5, z2 = z1 + 3 + rnd() * 5;
    const nearBox = makeBoxYaw(0, 1, z1, 2, 2, 0.3, 0, 0);
    const farBox = makeBoxYaw(0, 1, z2, 2, 2, 0.3, 0, 0);
    const a = { body: { c: [0, 1, 0] } };
    cover = coverSolid(a, [farBox, nearBox], 0, 1, z2 + 5) === 1
      && coverSolid(a, [farBox, nearBox], 5 + rnd() * 5, 1, -3) === -1;
  }
  check("senses: cover is the nearest solid on the chest line, by index; open ground is minus one", cover); }
console.log(`senses-test: ${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
console.log("senses-test PASS");
