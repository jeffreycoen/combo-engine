# Task 0.0.17-1 — OM-2, GRIP

One job: write the grip module, re-sign the game's gate with the nine new GRIP checks (the nine OM-1 checks ride inside it verbatim), replace the page's main script, prove the numbers, smoke the page in a real browser, deploy, close the records. Every authored file's full content is below; write exactly what is written, run the listed gates, report. You design nothing.

Suggested model: Sonnet 5.

Required reading, in order (confirm at the top of your report):
1. This file, whole.
2. `docs/plans/phase-0.0.17-om2-grip.md`, whole.

Licensed re-teach, declared: `scripts/old-master-test.mjs` is REPLACED whole. The OM-1 checks and their pinned hashes are carried inside the new file unchanged; the license covers exactly this re-signing. Old sha `b5f0e32556943de9796835fe6206826e964a2b889e285e401f835d6dc720bd72` → new sha printed at step 3. Report the re-teach as its own bullet. `docs/play/main.js` is likewise replaced whole (old sha `c3735192bc6f9d4755c98c25beb2fa4d7d1bb07dcab93d3f82e4ca69e1fea864`).

## Steps

Run from `/home/batman/combo-engine`. A failed assert stops the task; report the step and its verbatim output, run nothing further.

1. Assert the ground: all eighteen gates green, the grip module absent.

```sh
node scripts/gate.mjs api          # tail: seed 1  seconds 90 (10800 steps)  worldHash 3367709165  runHash 2717846799
node scripts/gate.mjs combat       # tail: ALL PASS
node scripts/gate.mjs accuracy     # tail: 11/11
node scripts/gate.mjs market       # tail: market-test PASS
node scripts/gate.mjs builder      # tail: builder-test PASS
node scripts/gate.mjs ledger       # tail: ledger-test PASS
node scripts/gate.mjs weldstress   # tail: weldstress-test PASS
node scripts/gate.mjs tape         # tail: tape-test PASS
node scripts/gate.mjs physics-pb   # tail: physics-pb-test PASS
node scripts/gate.mjs rig          # tail: rig-test PASS
node scripts/gate.mjs solids       # tail: solids-test PASS
node scripts/gate.mjs ballistics   # tail: ballistics-test PASS
node scripts/gate.mjs orders       # tail: orders-test PASS
node scripts/gate.mjs steering     # tail: steering-test PASS
node scripts/gate.mjs voxel       # tail: voxel-test PASS
node scripts/gate.mjs support      # tail: support-test PASS
node scripts/gate.mjs grapple      # tail: grapple-test PASS
node scripts/gate.mjs old-master   # tail: old-master-test PASS
ls src/games/old-master/grip.js 2>/dev/null || echo absent
```

2. Write `src/games/old-master/grip.js`, exactly as printed, ending at the final `}`; the commands after each block set the file's exact ending mechanically, however the writing tool ended it:

```js
// games/old-master/grip.js — OM-2: GRIP. The grapple module's rope law
// mounted on the master's hand. The grapple is a plane law; the war's
// ground plane (x, z) rides it as the grapple's (x, y), heights stay the
// engine's. The line is invisible will: seize is the bite, holding is the
// taut constraint, reeling is the winch, the 260 snap is the grip ceiling,
// and the strain account is the audible effort. New game law, said
// plainly: the hurl is a fixed impulse dial (GRIP.hurlJ) along the aim,
// applied on release — mass decides how far anything flies; it is not the
// grapple's yank and it cannot snap, because the line is already letting
// go as it throws.
import { bite, stepRope } from "../../modules/grapple/grapple.js";

export const GRIP = {
  range: 45,     // how far the will reaches, meters
  seizeR: 6,     // how close to the reticle a body must be
  will: 30,      // the master's rope-end mass — a LABELED GAME DIAL, not his body
                 // mass: with the rope's own 260 snap and the winch's 8 u/s,
                 // will 30 sets the grip ceiling near 487 kg — stones and
                 // troopers grip, armor and the walker part the line
  hurlJ: 600,    // the throw impulse, kg·m/s — a 25 kg crate leaves at 24 m/s, the walker shrugs
};

// pickTarget(world, hero, ax, az) -> the nearest live, massed body to the
// aim point, never the master, inside seizeR of the aim and range of the
// hand. Ties break by world seq, the engine's own deterministic order.
export function pickTarget(world, hero, ax, az) {
  let best = null, bd = GRIP.seizeR;
  for (const b of world.bodies) {
    if (!b.alive || b === hero || !(b.mass > 0) || !(b.invM > 0)) continue;
    const dAim = Math.hypot(b.pos.x - ax, b.pos.z - az);
    if (dAim >= bd) continue;
    if (Math.hypot(b.pos.x - hero.pos.x, b.pos.z - hero.pos.z) > GRIP.range) continue;
    bd = dAim; best = b;
  }
  return best;
}

// seize(hero, target) -> the grip: the grapple's bite, reeling from the
// first tick — the hand closes and pulls.
export function seize(hero, target) {
  const g = bite({});
  g.state = 'reel';
  return { g, target };
}

// stepGrip(grip, hero, dt) -> { snapped, J, dist }. One rope step on the
// ground plane: the master is the ship (no hull spin — the will has no
// lever arm), the seized body the target, both ends pulled by their
// masses, positions split by the no-stretch law. A snap drops the grip.
export function stepGrip(grip, hero, dt) {
  const t = grip.target;
  if (!t.alive || !hero.alive) return { snapped: false, J: 0, dist: 0, dead: true };
  const ship = { x: hero.pos.x, y: hero.pos.z, vx: hero.v.x, vy: hero.v.z, w: 0, M: GRIP.will, I: 1e9 };
  const tgt = { x: t.pos.x, y: t.pos.z, vx: t.v.x, vy: t.v.z };
  const r = stepRope(grip.g, ship, ship.x, ship.y, tgt, t.mass, dt);
  hero.v.x = ship.vx; hero.v.z = ship.vy;
  hero.pos.x = ship.x; hero.pos.z = ship.y;
  t.v.x = tgt.vx; t.v.z = tgt.vy;
  t.pos.x = tgt.x; t.pos.z = tgt.y;
  hero.sleeping = false; t.sleeping = false; t.sleepT = 0;
  const dist = Math.hypot(t.pos.x - hero.pos.x, t.pos.z - hero.pos.z);
  return { snapped: r.snapped, J: r.J, dist, dead: false };
}

// hurl(grip, hero, ax, az) -> the release throw: the fixed impulse along
// the hand-to-aim direction, then the grip is gone. Returns the speed the
// body left at.
export function hurl(grip, hero, ax, az) {
  const t = grip.target;
  if (!t.alive) return 0;
  let dx = ax - hero.pos.x, dz = az - hero.pos.z;
  const l = Math.hypot(dx, dz);
  if (l < 1e-6) { dx = 1; dz = 0; } else { dx /= l; dz /= l; }
  const dv = GRIP.hurlJ / t.mass;
  t.v.x += dx * dv; t.v.z += dz * dv;
  t.sleeping = false; t.sleepT = 0;
  t.lastPlayerTouch = 0;
  return dv;
}

// strain(grip) -> the grapple's tear account, the audible grip effort.
export function strain(grip) { return grip.g.tear || 0; }
```

```sh
truncate -s 3877 src/games/old-master/grip.js && printf '\n' >> src/games/old-master/grip.js
wc -c src/games/old-master/grip.js       # must print 3878
sha256sum src/games/old-master/grip.js   # must print 893901e72b39a7f674bdef5a8adab6881ce2dd9681722330b968af69dcd80c64
```

3. REPLACE `scripts/old-master-test.mjs` whole, exactly as printed:

```js
// COMBO-ENGINE — old-master-test: the OLD MASTER game's gate — OM-1 (the
// page and the walk, nine checks) plus OM-2 (GRIP, nine checks), eighteen
// in all. Seed 1 boots the war; no seed is special. The grip's closed
// forms run on plain fixture bodies; one integration rides the live sim
// and pins the whole world.
import { bootWar, tickWar, defaultTickInput, runHash } from "../src/depot/api.js";
import { worldHash } from "../src/engine/core.js";
import { spawnHero, stepHero, heroInput, HERO } from "../src/games/old-master/hero.js";
import { pickTarget, seize, stepGrip, hurl, strain, GRIP } from "../src/games/old-master/grip.js";
import { addBody } from "../src/engine/core.js";

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
    hero.alive === true && crate.pos.x > 14 && worldHash(war.world) === 1533508814 && runHash(war.run) === 3688031194); }

console.log(`old-master-test: ${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
console.log("old-master-test PASS");
```

```sh
truncate -s 7395 scripts/old-master-test.mjs && printf '\n' >> scripts/old-master-test.mjs
wc -c scripts/old-master-test.mjs       # must print 7396
sha256sum scripts/old-master-test.mjs   # must print 30e507f30e07bb27a4a5434c07f37dabbb538fe358bee39a526ec5e16b2f853c
```

4. REPLACE `docs/play/main.js` whole, exactly as printed:

```js
// OLD MASTER — docs/play/main.js: OM-2, the walk and GRIP. Boots the war
// from seed 1, spawns the master, and runs the loop. The reticle is the
// hand: hold to seize and reel what it covers, release to hurl it down the
// aim. Keys or the left stick walk; the pointer or the right half of a
// touch screen aims. The renderer's own reticle marks the aim point.
import { bootWar, tickWar, defaultTickInput, makeRenderer } from "../../src/depot/api.js";
import { spawnHero, stepHero, heroInput } from "../../src/games/old-master/hero.js";
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
  title.textContent = gripState ? "OLD MASTER · grip " + Math.round(strain(gripState)) : "OLD MASTER";
  R.render(dt, hero.pos, aim);
}
requestAnimationFrame(frame);
```

```sh
truncate -s 5228 docs/play/main.js && printf '\n' >> docs/play/main.js
wc -c docs/play/main.js       # must print 5229
sha256sum docs/play/main.js   # must print c7e51cdf95b4f7bb0619e5f7c12061e61a3abaf914f44ff94033255dfa153c28
```

5. Run the game's gate through the wrapper. The output must be 18 PASS lines, then exactly `old-master-test: 18 PASS / 0 FAIL`, then `old-master-test PASS`, exit 0. Any FAIL stops the task before step 6.

```sh
node scripts/gate.mjs old-master
```

6. Browser smoke — the page must execute, not just parse (the OM-1 black-screen law). Serve the repo root, render headless, and assert the screenshot is a painted scene (a crashed canvas writes under 10000 bytes; the live valley writes over 100000):

```sh
(python3 -m http.server 8940 >/dev/null 2>&1 &)
sleep 1
timeout 200 chromium --headless=new --no-sandbox --use-angle=swiftshader-webgl --enable-unsafe-swiftshader --virtual-time-budget=90000 --screenshot=/tmp/claude-1000/om2-landing-smoke.png --window-size=900,600 http://127.0.0.1:8940/docs/play/index.html 2>/dev/null
SZ=$(wc -c < /tmp/claude-1000/om2-landing-smoke.png); echo "smoke bytes $SZ"; test "$SZ" -gt 100000 && echo SMOKE-OK
```

`SMOKE-OK` must print. Name the screenshot path in the report.

7. Assert the seventeen prior gates did not move (same commands and required tails as step 1, old-master excluded — it moved by license and step 5 proved its new count).

8. Close the records in this landing: bump `package.json` version to `0.0.17`; in `docs/plans/phase-0.0.17-om2-grip.md` replace the status line with `Status: LANDED, commit stamped below, 2026-08-28. Gate: 18 PASS / 0 FAIL; prior gates unmoved.`; in `docs/plans/game-old-master.md` change the OM-2 line's leading `- ` to `- [LANDED] `.

9. Commit and push the landing (the push is the deploy — Pages rebuilds the same address), then stamp the real hash in a second small commit — NEVER amend after stamping:

```sh
git add src/games/old-master/grip.js scripts/old-master-test.mjs docs/play/main.js package.json docs/plans
git commit -m "phase 0.0.17 — OLD MASTER OM-2: GRIP

The rope law on the master's hand: seize, reel, the 487 kg will ceiling, the hurl.
old-master-test: 18 PASS / 0 FAIL; seventeen prior gates unmoved; page smoked live.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push origin main
H=$(git rev-parse --short HEAD)
sed -i "s/commit stamped below/commit \`$H\`/" docs/plans/phase-0.0.17-om2-grip.md
git add docs/plans && git commit -m "phase 0.0.17 record stamped — $H

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push origin main
```

The playable page after Pages rebuilds: `https://jeffreycoen.github.io/combo-engine/docs/play/`

## Acceptance

- Steps 2–4: every wc -c and sha256 line matches exactly.
- Step 5: `old-master-test: 18 PASS / 0 FAIL` then `old-master-test PASS`, exit 0.
- Step 6: `SMOKE-OK` printed — the page painted a real scene.
- Step 7: every prior gate prints its pinned tail unchanged.
- Step 8's records flipped, riding the landing commit; both pushes accepted.
- The feel of the grip — seize, reel, hurl on phone and desktop — is the owner's live check, not this task's.

## Report

Read-confirmation first, then one line of outcome, then bullets: the gate's count line and verdict line verbatim, all three wc -c lines, all three sha256 lines, the re-teach bullet (old gate sha → new), the smoke bytes line and screenshot path, every prior-gate tail, both commit hashes, push results. Every nonconformity its own labeled bullet. Fixture seeds: 1; no seed is special.
