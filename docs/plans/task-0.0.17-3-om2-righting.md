# Task 0.0.17-3 — OM-2 follow-up: the righting law and the tamed aim

One job: land the two playtest fixes exactly as printed — THE MASTER DOES NOT FALL OVER (except to a real blow, and then only briefly), and the aim reticle chases the stick at a capped speed instead of teleporting — prove the numbers, smoke the page, deploy. The owner's report drove both: the character tumbled and stayed down from plain walking, and the right stick moved insanely fast.

Suggested model: Sonnet 5.

Required reading, in order (confirm at the top of your report):
1. This file, whole.
2. `docs/plans/phase-0.0.17-om2-grip.md`, whole (this task rides that phase).

Declared changes, plainly:
- `src/games/old-master/hero.js` changes BEHAVIOR by design — that is this task's job, ruled by the owner: each step the master's rotation is held to yaw alone and his spin zeroed, EXCEPT for 1.6 seconds after a single blow of 12 or more hp (read from his own ledger), when physics owns him whole and he cannot walk. Old sha `e25f8cd0b7f926f34f657c37fd56abbda7e5e937fcd943a807e7387b866fc592`.
- `scripts/old-master-test.mjs` is REPLACED whole (licensed re-teach): three righting checks join; the two live-war hash pins move BECAUSE the righting law changes the sim — worldHash `3344951042` → `3344950406` (idle) and `1533508814` → `1533505030` (grip run); the run hashes hold. Old sha `30e507f30e07bb27a4a5434c07f37dabbb538fe358bee39a526ec5e16b2f853c`.
- `docs/play/main.js` is REPLACED whole (licensed re-teach): the touch aim chases its target at 30 m/s with reach scaled by deflection; the title reads DOWN while he is floored. Old sha `5c87231dbdeb553e612f76da2fb1a539968dce0e70bb3e1d9f0bf2dd503d4ef9`.

## Steps

Run from `/home/batman/combo-engine`. A failed assert stops the task; report the step and its verbatim output, run nothing further.

1. Assert the ground: the landed gate is the 18-check version and green.

```sh
node scripts/gate.mjs old-master   # count line: old-master-test: 18 PASS / 0 FAIL; tail: old-master-test PASS
```

2. REPLACE `src/games/old-master/hero.js` whole, exactly as printed; the commands after each block set the file's exact ending mechanically:

```js
// games/old-master/hero.js — OM-1: the master's body and the walk. One
// figure in the war's world: a unit-kind body the engine grounds, buries,
// and freezes like any other, driven each tick by a plain stick input the
// page supplies. Imports ride the api and the engine surface only.
//
// The hero is not possessed and not rostered: the game steps it BEFORE
// tickWar each tick, so a headless run with no input is bit-stable and a
// taped input stream replays exactly.

import { addBody } from "../../engine/core.js";

// The master's sheet — OM-1 carries only what walking needs. Later phases
// (grip, repulse, staff) add their rows beside it.
export const HERO = {
  mass: 80, hx: 0.28, hy: 1.0, hz: 0.28, hp: 200,
  walk: 6.0,      // meters per second on the flat
  accel: 18.0,    // how hard the legs chase the stick, per second
  floorDmg: 12,   // a single blow this hard breaks his footing
  downS: 1.6,     // seconds the floor owns him before the will stands him up
};

// spawnHero(war, x, z) -> the hero body, standing on the ground at (x, z).
export function spawnHero(war, x, z) {
  const y = war.field.heightAt(x, z) + HERO.hy + 0.2;
  const hero = addBody(war.world, {
    kind: "unit", team: 1, tag: "",
    x, y, z,
    hx: HERO.hx, hy: HERO.hy, hz: HERO.hz,
    mass: HERO.mass, hp: HERO.hp,
  });
  hero.maxHp = HERO.hp;
  hero.omHero = true;
  return hero;
}

// heroInput(): the page's per-tick command for the hero — a world-space
// stick, magnitude 0..1. Headless callers pass this default: no walk.
export function heroInput() {
  return { vx: 0, vz: 0 };
}

// The righting law: THE MASTER DOES NOT FALL OVER — walking, terrain, and
// shoves never floor him; each step his rotation is held to yaw alone and
// his spin zeroed, while the engine keeps owning height and collision.
// EXCEPT: a single blow of floorDmg or more (a real hit, read from his own
// hp ledger) breaks his footing — for downS seconds physics owns him whole,
// he cannot walk, and then the will stands him back up.
function rightHero(hero) {
  const q = hero.q;
  const yaw = Math.atan2(2 * (q.w * q.y + q.x * q.z), 1 - 2 * (q.y * q.y + q.x * q.x));
  q.x = 0; q.z = 0; q.y = Math.sin(yaw / 2); q.w = Math.cos(yaw / 2);
  const l = Math.hypot(q.y, q.w) || 1; q.y /= l; q.w /= l;
  hero.w.x = 0; hero.w.y = 0; hero.w.z = 0;
}

export function heroDown(hero) { return (hero.omDownT || 0) > 0; }

// stepHero(war, hero, input, dt): the walk under the righting law. The
// stick names a desired velocity; the legs chase it at HERO.accel; the
// engine owns gravity, ground, and everything that can go wrong. Call
// BEFORE tickWar.
export function stepHero(war, hero, input, dt) {
  if (!hero.alive) return;
  if (hero.omHpLast === undefined) hero.omHpLast = hero.hp;
  if (hero.omHpLast - hero.hp >= HERO.floorDmg && !(hero.omDownT > 0)) hero.omDownT = HERO.downS;
  hero.omHpLast = hero.hp;
  if (hero.omDownT > 0) {
    hero.omDownT -= dt;
    if (hero.omDownT > 0) return;
    hero.omDownT = 0;
    rightHero(hero);
  }
  rightHero(hero);
  const mag = Math.min(1, Math.hypot(input.vx, input.vz));
  let dx = 0, dz = 0;
  if (mag > 1e-6) { dx = input.vx / Math.hypot(input.vx, input.vz); dz = input.vz / Math.hypot(input.vx, input.vz); }
  const wantX = dx * HERO.walk * mag;
  const wantZ = dz * HERO.walk * mag;
  const k = Math.min(1, HERO.accel * dt);
  hero.v.x += (wantX - hero.v.x) * k;
  hero.v.z += (wantZ - hero.v.z) * k;
  if (mag > 1e-6) hero.sleeping = false;
}
```

```sh
truncate -s 3497 src/games/old-master/hero.js && printf '\n' >> src/games/old-master/hero.js
wc -c src/games/old-master/hero.js       # must print 3498
sha256sum src/games/old-master/hero.js   # must print 6ce86081b62198eb265361f5eb67063236748783c450b4310debee7382142033
```

3. REPLACE `scripts/old-master-test.mjs` whole, exactly as printed:

```js
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
```

```sh
truncate -s 8971 scripts/old-master-test.mjs && printf '\n' >> scripts/old-master-test.mjs
wc -c scripts/old-master-test.mjs       # must print 8972
sha256sum scripts/old-master-test.mjs   # must print c61509c9aeeadf470f15b3d93e241e28e7d4e5fd1b371c6e5ecf0a042ad6fa9e
```

4. REPLACE `docs/play/main.js` whole, exactly as printed:

```js
// OLD MASTER — docs/play/main.js: OM-2, the walk and GRIP. Boots the war
// from seed 1, spawns the master, and runs the loop. The reticle is the
// hand: hold to seize and reel what it covers, release to hurl it down the
// aim. Keys or the left stick walk; the pointer or the right half of a
// touch screen aims. The renderer's own reticle marks the aim point.
import { bootWar, tickWar, defaultTickInput, makeRenderer } from "../../src/depot/api.js";
import { spawnHero, stepHero, heroInput, heroDown } from "../../src/games/old-master/hero.js";
import { pickTarget, seize, stepGrip, hurl, strain } from "../../src/games/old-master/grip.js";

const canvas = document.getElementById("cv");
const war = bootWar({ seed: 1 });
const hero = spawnHero(war, 0, 20);
const R = makeRenderer(canvas, war.world, {});
const input = defaultTickInput();
const hIn = heroInput();

// keys: arrows or WASD walk, world-aligned through the camera basis
const held = new Set();
addEventListener("keydown", (e) => { held.add(e.code); });
addEventListener("keyup", (e) => { held.delete(e.code); });
function keyStick() {
  let x = 0, z = 0;
  if (held.has("ArrowUp") || held.has("KeyW")) z -= 1;
  if (held.has("ArrowDown") || held.has("KeyS")) z += 1;
  if (held.has("ArrowLeft") || held.has("KeyA")) x -= 1;
  if (held.has("ArrowRight") || held.has("KeyD")) x += 1;
  return { x, z };
}

// the left touch stick: one floating nub, radius-normalized
const stickEl = document.getElementById("stick"), nub = document.getElementById("nub");
let stickVec = { x: 0, z: 0 }, stickId = null;
function setNub(dx, dz) { nub.style.transform = "translate(" + dx * 34 + "px," + dz * 34 + "px)"; }
stickEl.addEventListener("pointerdown", (e) => { stickId = e.pointerId; stickEl.setPointerCapture(stickId); });
stickEl.addEventListener("pointermove", (e) => {
  if (e.pointerId !== stickId) return;
  const r = stickEl.getBoundingClientRect();
  let dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
  let dz = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
  const m = Math.hypot(dx, dz); if (m > 1) { dx /= m; dz /= m; }
  stickVec = { x: dx, z: dz }; setNub(dx, dz);
});
const stickEnd = (e) => { if (e.pointerId === stickId) { stickId = null; stickVec = { x: 0, z: 0 }; setNub(0, 0); } };
stickEl.addEventListener("pointerup", stickEnd);
stickEl.addEventListener("pointercancel", stickEnd);

// screen -> world on the master's ground plane, through the orthographic
// camera: point on the near plane plus the view direction to his height
function screenToWorld(cx, cy) {
  const nx = (cx / innerWidth) * 2 - 1;
  const ny = -((cy / innerHeight) * 2 - 1);
  const cp = R.cameraPos();
  const rt = R.camBasis.right, up = R.camBasis.up, f = R.camBasis.fwd;
  const hw = R.camBasis.halfW(), hh = R.camBasis.halfH();
  const px = cp.x + rt.x * nx * hw + up.x * ny * hh;
  const py = cp.y + rt.y * nx * hw + up.y * ny * hh;
  const pz = cp.z + rt.z * nx * hw + up.z * ny * hh;
  const t = (hero.pos.y - py) / f.y;
  return { x: px + f.x * t, z: pz + f.z * t };
}

// the aim: pointer on desktop; on touch, dragging the screen's right half
// steers the reticle around the master
let aim = { x: 0, z: 20 };
let gripState = null, aimId = null;
addEventListener("pointermove", (e) => { if (e.pointerType === "mouse") aim = screenToWorld(e.clientX, e.clientY); });
addEventListener("pointerdown", (e) => {
  if (e.target === stickEl || e.target === nub) return;
  if (e.pointerType === "mouse" && e.button !== 0) return;
  aimId = e.pointerId;
  aim = screenToWorld(e.clientX, e.clientY);
  const t = pickTarget(war.world, hero, aim.x, aim.z);
  if (t) gripState = seize(hero, t);
});
addEventListener("pointermove", (e) => { if (e.pointerId === aimId && e.pointerType !== "mouse") aim = screenToWorld(e.clientX, e.clientY); });
const gripEnd = (e) => {
  if (e.pointerId !== aimId) return;
  aimId = null;
  if (gripState) { hurl(gripState, hero, aim.x, aim.z); gripState = null; }
};
addEventListener("pointerup", gripEnd);
addEventListener("pointercancel", gripEnd);

// stick -> world through the camera basis: stick-up walks away from the camera
function worldStick() {
  const k = keyStick();
  const sx = Math.abs(k.x) + Math.abs(k.z) > 0 ? k.x : stickVec.x;
  const sz = Math.abs(k.x) + Math.abs(k.z) > 0 ? k.z : stickVec.z;
  const f = R.camBasis.fwd, rt = R.camBasis.right;
  const fx = f.x, fz = f.z, fl = Math.hypot(fx, fz) || 1;
  return { vx: rt.x * sx + (fx / fl) * -sz, vz: rt.z * sx + (fz / fl) * -sz };
}

const title = document.getElementById("title");

// the right touch stick: the aim, orbiting the master — reach scales with
// the stick's deflection, and the reticle CHASES the stick at a capped
// speed instead of jumping (the owner's report: the raw stick was insanely
// fast)
const AIM_R = 28, AIM_SPD = 30;
const astickEl = document.getElementById("astick"), anub = document.getElementById("anub");
let aimVec = { x: 1, z: 0 }, astickId = null;
function setAnub(dx, dz) { anub.style.transform = "translate(" + dx * 34 + "px," + dz * 34 + "px)"; }
astickEl.addEventListener("pointerdown", (e) => {
  astickId = e.pointerId; astickEl.setPointerCapture(astickId);
  const t = pickTarget(war.world, hero, aim.x, aim.z);
  if (t) gripState = seize(hero, t);
});
astickEl.addEventListener("pointermove", (e) => {
  if (e.pointerId !== astickId) return;
  const r = astickEl.getBoundingClientRect();
  let dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
  let dz = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
  const m = Math.hypot(dx, dz); if (m > 1) { dx /= m; dz /= m; }
  setAnub(dx, dz);
  if (m > 0.15) {
    const f = R.camBasis.fwd, rt = R.camBasis.right;
    const fl = Math.hypot(f.x, f.z) || 1;
    aimVec = { x: rt.x * dx + (f.x / fl) * -dz, z: rt.z * dx + (f.z / fl) * -dz };
  }
});
const astickEnd = (e) => {
  if (e.pointerId !== astickId) return;
  astickId = null; setAnub(0, 0);
  if (gripState) { hurl(gripState, hero, aim.x, aim.z); gripState = null; }
};
astickEl.addEventListener("pointerup", astickEnd);
astickEl.addEventListener("pointercancel", astickEnd);

// the HUD: the deployed version, read live from the repository's own
// package.json (never cached), and a twice-a-second frame rate
const hud = document.getElementById("hud");
let mkText = "mk ?";
fetch("../../package.json", { cache: "no-store" }).then((r) => r.json())
  .then((p) => { mkText = "mk " + p.version; }).catch(() => { mkText = "mk ?"; });
let fpsFrames = 0, fpsT = 0, fpsText = "- fps";

const STEP = 1 / 120;
let last = performance.now(), acc = 0;
function frame(now) {
  requestAnimationFrame(frame);
  let dt = Math.min(0.1, (now - last) / 1000); last = now;
  acc += dt;
  const w = worldStick();
  hIn.vx = w.vx; hIn.vz = w.vz;
  let guard = 0;
  while (acc >= STEP && guard++ < 12) {
    acc -= STEP;
    if (gripState) {
      const r = stepGrip(gripState, hero, STEP);
      if (r.snapped || r.dead) gripState = null;
    }
    stepHero(war, hero, hIn, STEP);
    tickWar(war, STEP, input);
  }
  if (astickId !== null || matchMedia("(pointer: coarse)").matches) {
    const tx = hero.pos.x + aimVec.x * AIM_R, tz = hero.pos.z + aimVec.z * AIM_R;
    let ddx = tx - aim.x, ddz = tz - aim.z;
    const dl = Math.hypot(ddx, ddz), maxStep = AIM_SPD * dt;
    if (dl > maxStep) { ddx = ddx / dl * maxStep; ddz = ddz / dl * maxStep; }
    aim = { x: aim.x + ddx, z: aim.z + ddz };
  }
  fpsFrames++; fpsT += dt;
  if (fpsT >= 0.5) { fpsText = Math.round(fpsFrames / fpsT) + " fps"; fpsFrames = 0; fpsT = 0; }
  hud.innerHTML = mkText + "<br>" + fpsText;
  title.textContent = heroDown(hero) ? "OLD MASTER · DOWN" : gripState ? "OLD MASTER · grip " + Math.round(strain(gripState)) : "OLD MASTER";
  R.render(dt, hero.pos, aim);
}
requestAnimationFrame(frame);
```

```sh
truncate -s 7795 docs/play/main.js && printf '\n' >> docs/play/main.js
wc -c docs/play/main.js       # must print 7796
sha256sum docs/play/main.js   # must print 26f507e3b6f4f0796f3e8ae20808616fbc5bca7f628f8335d5665d9fef48fdf8
```

5. Run the game's gate: 21 PASS lines, `old-master-test: 21 PASS / 0 FAIL`, `old-master-test PASS`, exit 0. Any FAIL stops the task.

```sh
node scripts/gate.mjs old-master
```

6. Browser smoke: the scene must paint and the HUD must carry the live version.

```sh
(python3 -m http.server 8942 >/dev/null 2>&1 &)
sleep 1
timeout 200 chromium --headless=new --no-sandbox --use-angle=swiftshader-webgl --enable-unsafe-swiftshader --virtual-time-budget=90000 --screenshot=/tmp/claude-1000/om2c-landing-smoke.png --window-size=900,600 http://127.0.0.1:8942/docs/play/index.html 2>/dev/null
SZ=$(wc -c < /tmp/claude-1000/om2c-landing-smoke.png); echo "smoke bytes $SZ"; test "$SZ" -gt 100000 && echo SMOKE-OK
```

```sh
timeout 200 chromium --headless=new --no-sandbox --use-angle=swiftshader-webgl --enable-unsafe-swiftshader --virtual-time-budget=90000 --dump-dom http://127.0.0.1:8942/docs/play/index.html 2>/dev/null | grep -o '<div id="hud">[^<]*<br>[^<]*</div>'
```

`SMOKE-OK` must print and the hud line must read `mk 0.0.17` with a numeric fps; both go in the report verbatim.

7. Assert the seventeen engine gates did not move (api through grapple, same commands and tails as every prior OM task; the game's own gate moved by license and step 5 proved it).

8. Commit and push (the push is the deploy):

```sh
git add src/games/old-master/hero.js scripts/old-master-test.mjs docs/play/main.js docs/plans
git commit -m "task 0.0.17-3 — the master does not fall over; the aim learns manners

The righting law: yaw-only and spin-zeroed every step, except 1.6 s after a
real blow of 12+ hp, when the floor owns him and the will then stands him up.
The touch aim chases its target at 30 m/s, reach scaled by deflection.
old-master-test: 21 PASS / 0 FAIL (two live pins moved by the law, declared);
seventeen engine gates unmoved; page smoked with the hud asserted.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push origin main
```

## Acceptance

- Steps 2–4: every wc -c and sha256 line matches exactly.
- Step 5: `old-master-test: 21 PASS / 0 FAIL` then `old-master-test PASS`, exit 0.
- Step 6: `SMOKE-OK` and the hud line, verbatim in the report.
- Step 7: every engine gate prints its pinned tail unchanged.
- Push accepted. The feel — no tumbling on a walk, a knockdown only when ordnance lands, an aim that glides — is the owner's live check.

## Report

Read-confirmation first, then one line of outcome, then bullets: the gate's count and verdict lines, all three wc -c lines, all three sha256 lines, the declared-change bullet (all three old→new, the two moved pins named), the smoke bytes line and hud line verbatim, every engine-gate tail, the commit hash, the push result. Every nonconformity its own labeled bullet. Fixture seeds: 1.
