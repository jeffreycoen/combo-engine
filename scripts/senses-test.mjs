// COMBO-ENGINE — senses-test. Laws at rolled scenes: sight dies past the
// range and outside the cone; a downed watcher sees nothing; the blocked
// ray is asked with the eye clear of the body; cover is the nearest solid
// on the chest line, by index, and open ground is minus one.
import { readFileSync } from "node:fs";
import { AG } from "../src/modules/opponent/opponent.js";
import { canSee, coverSolid, SENSE_DIALS, checkAgentBody, checkSenseDials } from "../src/modules/senses/senses.js";
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
{ let dialled = true;
  for (let i = 0; i < 200 && dialled; i++) {
    const dials = { ...SENSE_DIALS, viewM: 10 + rnd() * 190, viewDeg: 20 + rnd() * 280 };
    const a = watcher(0, 1);
    const near = dials.viewM * 0.99, far = dials.viewM * 1.01;
    const half = dials.viewDeg * Math.PI / 360;
    const inside = (half - 0.02) * (rnd() < 0.5 ? 1 : -1), outside = (half + 0.02) * (rnd() < 0.5 ? 1 : -1);
    dialled = canSee(a, [], 0, 1.35, near, open, dials) === 1
      && canSee(a, [], 0, 1.35, far, open, dials) === 0
      && canSee(a, [], Math.sin(inside) * 5, 1.35, Math.cos(inside) * 5, open, dials) === 1
      && canSee(a, [], Math.sin(outside) * 5, 1.35, Math.cos(outside) * 5, open, dials) === 0;
  }
  check("senses: at rolled view dials a point just inside the range and cone is seen and one just outside is not", dialled); }
{ let moved = true;
  for (let i = 0; i < 200 && moved; i++) {
    const dials = { ...SENSE_DIALS, chest: 0.1 + rnd() * 0.8 };
    const a = { body: { c: [0, 1, 0] } };
    const behind = makeBoxYaw(0, 1, dials.chest / 2, 0.3, 2, 0.05, 0, 0);
    const ahead = makeBoxYaw(0, 1, dials.chest + 0.5, 0.3, 2, 0.05, 0, 0);
    moved = coverSolid(a, [behind], 0, 1, 10, dials) === -1
      && coverSolid(a, [ahead], 0, 1, 10, dials) === 0;
  }
  check("senses: a rolled chest offset moves the cover ray's start", moved); }
{ check("senses: the contracts count every problem",
    checkAgentBody({ body: {}, fx: "a" }).length === 3
    && checkAgentBody({ down: 0, body: { c: [0, 1, 0] }, fx: 0, fz: 1 }).length === 0
    && checkAgentBody(null).length === 1
    && checkSenseDials({ ...SENSE_DIALS, viewM: 0 }).length === 1
    && checkSenseDials(SENSE_DIALS).length === 0); }
{ const src = readFileSync(new URL("../src/modules/senses/senses.js", import.meta.url), "utf8");
  const specs = [...src.matchAll(/import\s+[^;]*?\bfrom\s+["']([^"']+)["']/g)].map(m => m[1]);
  const clean = specs.length > 0 && specs.every(x => /^\.\.\/[a-z0-9-]+\//.test(x) || /^\.\//.test(x));
  check("senses: the module imports only from its own folder or a sibling module", clean); }
console.log(`senses-test: ${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
console.log("senses-test PASS");
