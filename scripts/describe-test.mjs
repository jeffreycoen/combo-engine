// COMBO-ENGINE — describe-test. Laws at rolled seeds: a bad description is
// refused whole with every problem named; a clean one boots twin worlds;
// each dial provably reaches its mechanism — gravity the world field, wind
// the tick switch, trees the grid rule.
import { bootWorld, describeProblems, WORLD_DEFAULTS } from "../src/modules/describe/describe.js";
import { worldHash } from "../src/modules/determinism/determinism.js";
let pass = 0, fail = 0;
const check = (n, ok) => { if (ok) { pass++; console.log("PASS " + n); } else { fail++; console.log("FAIL " + n); } };
const SEED = process.env.SEED ? +process.env.SEED : Math.floor(Math.random() * 1e9);
console.log("seeds " + JSON.stringify({ world: SEED }));

{ const p = describeProblems({ seed: "x", gravity: -1, moons: 3 });
  check("describe: a bad description names every problem in one pass — type, floor, and the stranger",
    p.length === 3 && p.some((s) => s.includes("seed")) && p.some((s) => s.includes("gravity")) && p.some((s) => s.includes("moons"))); }
{ let threw = null; try { bootWorld({ gravity: 5 }); } catch (e) { threw = e; }
  check("describe: the door refuses whole — no seed, no world", !!threw && threw.problems.length === 1); }
{ const a = bootWorld({ seed: SEED }), b = bootWorld({ seed: SEED });
  check("describe: one description, twin worlds — the hash agrees at a rolled seed",
    worldHash(a.war.world) === worldHash(b.war.world)); }
{ const w = bootWorld({ seed: SEED, gravity: 1.6, wind: false, treesBlock: true });
  check("describe: every dial reaches its mechanism — gravity on the world, wind on the tick, trees on the grid",
    w.war.world.gravity === 1.6 && w.input.windOn === false && w.war.world.slotTreesBlock === true); }
{ const w = bootWorld({ seed: SEED });
  check("describe: the defaults are the stated ones",
    w.desc.gravity === WORLD_DEFAULTS.gravity && w.desc.wind === true && w.war.world.gravity === 9.8); }
console.log(`describe-test: ${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
console.log("describe-test PASS");
