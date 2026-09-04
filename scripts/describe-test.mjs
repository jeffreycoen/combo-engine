// COMBO-ENGINE — describe-test. Laws at rolled seeds: a bad description is
// refused whole with every problem named; a clean one boots twin worlds;
// each dial provably reaches its mechanism — gravity the world field, wind
// the tick switch, trees the grid rule; a spec override is checked and
// merged; a named module attaches and answers on its own surface.
import { bootWorld, describeProblems, WORLD_DEFAULTS } from "../src/modules/describe/describe.js";
import { worldHash } from "../src/modules/determinism/determinism.js";
import { accel } from "../src/modules/wells/wells.js";
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

// specs: a bad value in one table and an unknown table name both land in
// the same refusal, alongside an unrelated top-level problem.
{ const p = describeProblems({ seed: "x", specs: { TOWER_SPECS: { mg: { cost: "cheap" } }, GHOST_SPECS: { a: {} } } });
  check("describe: a bad spec value refuses whole — the wrong type, the unknown table, and the unrelated problem all land in one pass",
    p.length === 3 && p.some((s) => s.includes("seed")) && p.some((s) => s.includes("specs.TOWER_SPECS.mg.cost")) && p.some((s) => s.includes("specs.GHOST_SPECS"))); }

// specs: a stranger field on a known table's row is refused too.
{ const p = describeProblems({ seed: SEED, specs: { TOWER_SPECS: { mg: { madeUpField: 1 } } } });
  check("describe: a stranger field on a known spec table's row is refused",
    p.length === 1 && p[0].includes("specs.TOWER_SPECS.mg.madeUpField")); }

// modules: an unknown module name is refused, alongside another problem.
{ const p = describeProblems({ seed: "x", modules: ["wells", "not-a-module"] });
  check("describe: an unknown module name is refused alongside the rest",
    p.length === 2 && p.some((s) => s.includes("seed")) && p.some((s) => s.includes("modules.not-a-module"))); }

// twin-boot world-hash identity holds with a spec override present — the
// override changes the returned specs table, never the war's own hash law.
{ const a = bootWorld({ seed: SEED, specs: { TOWER_SPECS: { mg: { cost: 999 } } } });
  const b = bootWorld({ seed: SEED, specs: { TOWER_SPECS: { mg: { cost: 999 } } } });
  check("describe: twin-boot world-hash identity holds with a spec override present",
    worldHash(a.war.world) === worldHash(b.war.world) && a.desc.specs.TOWER_SPECS.mg.cost === 999); }

// a spec override merges onto the row, leaving every other field and every
// other row untouched — the door only ever moves what the row names.
{ const w = bootWorld({ seed: SEED, specs: { TOWER_SPECS: { mg: { cost: 999 } } } });
  check("describe: an omitted spec field keeps its specs.js default; an omitted table keeps the whole table",
    w.desc.specs.TOWER_SPECS.mg.cost === 999 && w.desc.specs.TOWER_SPECS.mg.range === 15
    && w.desc.specs.TOWER_SPECS.gun.cost === 38 && w.desc.specs.MAN.rifle.hp === 58); }

// an attached module is reachable on its own surface and answers a direct
// call — wells' accel, checked against the module's own function.
{ const w = bootWorld({ seed: SEED, modules: ["wells", "solids"] });
  const wellsMod = w.modules.sample.find((m) => m.name === "wells");
  const [ax, ay] = wellsMod.surface.accel([{ x: 10, y: 0, mu: 5, soft: 1 }], 0, 0);
  const [bx, by] = accel([{ x: 10, y: 0, mu: 5, soft: 1 }], 0, 0);
  check("describe: an attached module is reachable and functional on its own surface, grouped by seam",
    w.modules.sample.length === 2 && ax === bx && ay === by
    && w.modules.sample.some((m) => m.name === "solids" && typeof m.surface.makePrism === "function")); }

console.log(`describe-test: ${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
console.log("describe-test PASS");
