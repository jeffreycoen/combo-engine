// COMBO-ENGINE — spine-test: laws over the coldsnap engine this tree carries
// with listed differences from the checkout. The one difference today: a
// world numbers its own bodies and walkers from one, so two boots from one
// seed in one process are twins in every hash, the run record included.
// NO HARDWIRED SEEDS: the seeds roll fresh each run and print; rerun with
// SEED=<n> in the environment.
import { makeWorld, addBody, worldHash } from "../src/engine/core.js";
import { buildMech } from "../src/engine/mech.js";
import { bootWar, runHash } from "../src/depot/api.js";

let pass = 0, fail = 0;
const check = (name, ok) => { if (ok) { pass++; console.log("PASS " + name); } else { fail++; console.log("FAIL " + name); } };
const SEED = process.env.SEED ? +process.env.SEED : Math.floor(Math.random() * 1e6) + 1;
console.log("seeds " + JSON.stringify({ world: SEED, war: SEED }));

const flat = { heightAt: () => 0, dirty: false, carve: () => {}, normalAt: (x, z, o) => { o.x = 0; o.y = 1; o.z = 0; return o; } };
const box = { kind: "prop", team: 0, mass: 10, hx: 0.5, hy: 0.5, hz: 0.5, x: 0, y: 0.5, z: 0 };

// 1. every world numbers its bodies from one, densely
{
  const w1 = makeWorld({ field: flat, seed: SEED }), w2 = makeWorld({ field: flat, seed: SEED + 1 });
  const a1 = addBody(w1, box), a2 = addBody(w1, box), a3 = addBody(w1, box), b1 = addBody(w2, box);
  check("spine: the first body of a world is body 1, in every world", a1.id === 1 && b1.id === 1);
  check("spine: ids are dense within a world — the third body is body 3 and the next would be 4", a2.id === 2 && a3.id === 3 && w1.nextId === 4);
}
// 2. every world numbers its walkers from one
{
  const w1 = makeWorld({ field: flat, seed: SEED }), w2 = makeWorld({ field: flat, seed: SEED });
  const m1 = buildMech(w1, { x: 0, z: 0, yaw: 0, team: 1 }), m2 = buildMech(w2, { x: 0, z: 0, yaw: 0, team: 1 });
  check("spine: the first walker of a world is walker 1, in every world", m1.id === 1 && m2.id === 1);
}
// 3. twin boots from one rolled seed in one process: one world hash, one run hash, the enemy roster's member ids the same
{
  const A = bootWar({ seed: SEED }), B = bootWar({ seed: SEED });
  check("spine: twin boots from one rolled seed hash the same world", worldHash(A.world) === worldHash(B.world));
  check("spine: twin boots from one rolled seed hash the same run", runHash(A.run) === runHash(B.run));
  const ids = (w) => JSON.stringify(w.run.foeSquads.map((s) => s.memberIds));
  check("spine: the enemy roster carries the same member ids in both boots", ids(A) === ids(B));
}
console.log(`spine-test: ${pass} PASS / ${fail} FAIL`);
console.log(fail ? "spine-test FAIL" : "spine-test PASS");
process.exit(fail ? 1 : 0);
