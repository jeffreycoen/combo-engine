// COMBO-ENGINE — old-master-test: the OLD MASTER game's gate — OM-1 (the
// page and the walk, nine checks) plus OM-2 (GRIP, nine checks), eighteen
// twenty-one in all. Seed 1 boots the war; no seed is special. The grip's closed
// forms run on plain fixture bodies; one integration rides the live sim
// and pins the whole world.
import { bootWar, tickWar, defaultTickInput, runHash } from "../src/depot/api.js";
import { worldHash } from "../src/engine/core.js";
import { spawnHero, stepHero, heroInput, heroDown, HERO } from "../src/games/old-master/hero.js";
import { pickTarget, seize, stepGrip, hurl, strain, GRIP } from "../src/games/old-master/grip.js";
import { addBody, explode } from "../src/engine/core.js";

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
  check("the world hash with the master in it holds its pin", worldHash(war.world) === 3344950406);
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


// ============================================================ OM-2: GRIP
const fakeBody = (m, x, z) => ({ alive: true, pos: { x, y: 5, z }, v: { x: 0, y: 0, z: 0 }, mass: m, invM: m > 0 ? 1 / m : 0, sleeping: false, sleepT: 0 });
const fakeWorld = (bodies) => ({ bodies });

{ const h = fakeBody(80, 0, 0); h.omHero = true;
  const near_ = fakeBody(25, 10, 0), far = fakeBody(25, 14, 0), heavy = fakeBody(0, 9, 0);
  const w = fakeWorld([h, far, near_, heavy]);
  check("grip pick: the nearest massed body to the aim wins; the master and the massless never do",
    pickTarget(w, h, 10, 0) === near_ && pickTarget(w, h, 100, 0) === null); }

{ const h = fakeBody(80, 0, 0);
  const crate = fakeBody(25, 10, 0);
  const grip = seize(h, crate);
  const mu = GRIP.will * 25 / (GRIP.will + 25);
  const r1 = stepGrip(grip, h, 1 / 120);
  check("reel, first taut: the jerk lands 8 x mu x 1.15 on a 25 kg crate and holds under 260",
    near(r1.J, 8 * mu * 1.15, 1e-9) && r1.snapped === false && 8 * mu * 1.15 < 260);
  let minDist = r1.dist;
  for (let i = 0; i < 360; i++) { const r = stepGrip(grip, h, 1 / 120); if (!r.snapped && r.dist < minDist) minDist = r.dist; }
  check("light flies to the hand: three reeled seconds bring a 10 m crate to the rope's own 4 m floor", minDist < 4.6);
  check("strain: the reel books the grip effort", strain(grip) >= 0 && r1.J > 0); }

{ const h = fakeBody(80, 0, 0);
  const stone = fakeBody(100, 10, 0);
  const grip = seize(h, stone);
  stepGrip(grip, h, 1 / 120);
  const hx0 = h.pos.x, sx0 = stone.pos.x;
  stepGrip(grip, h, 1 / 120);
  const heroMoved = h.pos.x - hx0, stoneMoved = sx0 - stone.pos.x;
  check("heavy drags the master: the no-stretch split moves him 100/30 of the stone's share",
    heroMoved > 0 && stoneMoved > 0 && heroMoved / stoneMoved > 3.0 && heroMoved / stoneMoved < 3.7); }

{ const h = fakeBody(80, 0, 0);
  const walker = fakeBody(10000, 12, 0);
  const grip = seize(h, walker);
  const r = stepGrip(grip, h, 1 / 120);
  check("the ceiling: the walker's first taut tops 260 — the line parts, nothing moves",
    r.snapped === true && walker.v.x === 0 && h.v.x === 0);
  const holds = seize(fakeBody(80, 0, 0), fakeBody(400, 12, 0));
  const rHold = stepGrip(holds, fakeBody(80, 0, 0), 1 / 120);
  const parts = seize(fakeBody(80, 0, 0), fakeBody(600, 12, 0));
  const rPart = stepGrip(parts, fakeBody(80, 0, 0), 1 / 120);
  check("the ceiling sits near 487 kg by the rope's own law: 400 grips, 600 parts",
    rHold.snapped === false && rPart.snapped === true); }

{ const h = fakeBody(80, 0, 0);
  const crate = fakeBody(25, 2, 0);
  const grip = seize(h, crate);
  const dv = hurl(grip, h, 50, 0);
  check("the hurl: the fixed 600 impulse sends a 25 kg crate east at exactly 24",
    near(dv, 24) && near(crate.v.x, 24) && crate.v.z === 0); }

{ const war = bootWar({ seed: 1 });
  const hero = spawnHero(war, 0, 20);
  const crate = addBody(war.world, { kind: "prop", team: 0, x: 12, y: war.field.heightAt(12, 20) + 0.5, z: 20, hx: 0.4, hy: 0.4, hz: 0.4, mass: 25, hp: 50 });
  const grip = seize(hero, crate);
  const input = defaultTickInput(), hIn = heroInput();
  for (let i = 0; i < 120; i++) { stepGrip(grip, hero, STEP); stepHero(war, hero, hIn, STEP); tickWar(war, STEP, input); }
  hurl(grip, hero, 60, 20);
  for (let i = 0; i < 120; i++) { stepHero(war, hero, hIn, STEP); tickWar(war, STEP, input); }
  check("live war: a crate reeled for a second and hurled east — the master stands, the world pins",
    hero.alive === true && crate.pos.x > 14 && worldHash(war.world) === 1533505030 && runHash(war.run) === 3688031194); }


// ================================================ OM-2 follow-up: righting
{ const war = bootWar({ seed: 1 });
  const hero = spawnHero(war, 0, 20);
  const input = defaultTickInput();
  let yawOnly = true;
  for (let i = 0; i < 600; i++) {
    const a = i / 600 * Math.PI * 2;
    stepHero(war, hero, { vx: Math.cos(a), vz: Math.sin(a) }, STEP);
    if (!heroDown(hero) && (Math.abs(hero.q.x) > 1e-9 || Math.abs(hero.q.z) > 1e-9)) yawOnly = false;
    tickWar(war, STEP, input);
  }
  check("the master does not fall over: five hard-walked seconds, rotation held to yaw whenever he is not floored",
    yawOnly && hero.alive === true); }

{ const war = bootWar({ seed: 1 });
  const hero = spawnHero(war, 0, 20);
  const input = defaultTickInput();
  for (let i = 0; i < 240; i++) { stepHero(war, hero, { vx: 1, vz: 0 }, STEP); tickWar(war, STEP, input); }
  const hp0 = hero.hp;
  explode(war.world, hero.pos.x, hero.pos.y, hero.pos.z, { r: 5, kv: 3e4, dmg: 40, crater: 0 });
  stepHero(war, hero, { vx: 0, vz: 0 }, STEP);
  check("a real blast breaks his footing: the hp ledger drops past floorDmg and the floor owns him",
    hp0 - hero.hp >= HERO.floorDmg && heroDown(hero) === true);
  let downTicks = 0;
  while (heroDown(hero) && downTicks++ < 1000) { tickWar(war, STEP, input); stepHero(war, hero, { vx: 0, vz: 0 }, STEP); }
  check("the will stands him up: floored for the dialed 1.6 seconds, then upright, alive, yaw-only",
    downTicks === 192 && hero.alive === true && Math.abs(hero.q.x) < 1e-9 && Math.abs(hero.q.z) < 1e-9); }

console.log(`old-master-test: ${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
console.log("old-master-test PASS");
