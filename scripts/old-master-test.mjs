// COMBO-ENGINE — old-master-test: OM-1's gate, the page and the walk.
// Nine checks. Seed 1 boots the war; no seed is special. The hero rides
// the live sim: the hashes below pin the whole world with the master in it.
import { bootWar, tickWar, defaultTickInput, runHash } from "../src/depot/api.js";
import { worldHash } from "../src/engine/core.js";
import { spawnHero, stepHero, heroInput, HERO } from "../src/games/old-master/hero.js";

let pass = 0, fail = 0;
const check = (name, ok) => { if (ok) { pass++; console.log("PASS " + name); } else { fail++; console.log("FAIL " + name); } };
const near = (a, b, e) => Math.abs(a - b) < (e || 1e-9);
const STEP = 1 / 120;

const bootWithHero = () => { const war = bootWar({ seed: 1 }); const hero = spawnHero(war, 0, 20); return { war, hero }; };

{ const { war, hero } = bootWithHero();
  check("spawn: the master stands on the ground at (0, 20), team 1, 200 hp, marked",
    hero.alive && hero.team === 1 && hero.hp === 200 && hero.omHero === true
    && near(hero.pos.y, war.field.heightAt(0, 20) + HERO.hy + 0.2)); }

{ const { war, hero } = bootWithHero();
  const input = defaultTickInput(), hIn = heroInput();
  for (let i = 0; i < 1200; i++) { stepHero(war, hero, hIn, STEP); tickWar(war, STEP, input); }
  check("ten idle seconds: the master is alive and near the ground in the live war",
    hero.alive === true && Math.abs(hero.pos.y - war.field.heightAt(hero.pos.x, hero.pos.z) - HERO.hy) < 2.0);
  check("the world hash with the master in it holds its pin", worldHash(war.world) === 3344951042);
  check("the run hash holds its pin", runHash(war.run) === 997895256); }

{ const run = () => { const { war, hero } = bootWithHero();
    const input = defaultTickInput(), hIn = heroInput();
    for (let i = 0; i < 1200; i++) { stepHero(war, hero, hIn, STEP); tickWar(war, STEP, input); }
    return worldHash(war.world) + ":" + runHash(war.run) + ":" + hero.pos.x + ":" + hero.pos.z; };
  check("determinism: two boots from seed 1 land bit-identical worlds and master positions", run() === run()); }

{ const { war, hero } = bootWithHero();
  const input = defaultTickInput();
  const x0 = hero.pos.x;
  for (let i = 0; i < 240; i++) { stepHero(war, hero, { vx: 1, vz: 0 }, STEP); tickWar(war, STEP, input); }
  check("the walk: two seconds of full stick carries the master east at walking pace",
    hero.pos.x - x0 > HERO.walk * 2 * 0.6 && hero.pos.x - x0 < HERO.walk * 2 * 1.2);
  check("the walk stays near the ground: alive, within a body height of the field", hero.alive === true && Math.abs(hero.pos.y - war.field.heightAt(hero.pos.x, hero.pos.z) - HERO.hy) < 2.0); }

{ const { war, hero } = bootWithHero();
  const input = defaultTickInput();
  for (let i = 0; i < 240; i++) { stepHero(war, hero, { vx: 0.6, vz: 0.8 }, STEP); tickWar(war, STEP, input); }
  const moved = Math.hypot(hero.pos.x - 0, hero.pos.z - 20);
  for (let i = 0; i < 240; i++) { stepHero(war, hero, { vx: 0, vz: 0 }, STEP); tickWar(war, STEP, input); }
  const speedAfter = Math.hypot(hero.v.x, hero.v.z);
  check("stick release: the master walks a diagonal, then stops when the stick does",
    moved > 5 && speedAfter < 1.0); }

{ const war = bootWar({ seed: 1 });
  const before = war.world.bodies.length;
  spawnHero(war, 0, 20);
  check("one body: the spawn adds exactly the master and touches nothing else",
    war.world.bodies.length === before + 1); }

console.log(`old-master-test: ${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
console.log("old-master-test PASS");
