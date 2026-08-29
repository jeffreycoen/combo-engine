# Task 0.0.16-1 — OM-1, the page and the walk

One job: write the OLD MASTER hero module, its gate, and the playable page exactly as printed below, vendor the three library by copy, register the gate, prove the numbers, deploy to GitHub Pages, close the records. Every authored file's full content is below; write exactly what is written, run the listed gates, report. You design nothing.

Suggested model: Sonnet 5.

Required reading, in order (confirm at the top of your report):
1. This file, whole.
2. `docs/plans/phase-0.0.16-old-master-1.md`, whole.

## Steps

Run from `/home/batman/combo-engine`. A failed assert stops the task; report the step and its verbatim output, run nothing further.

1. Assert the ground: all prior gates green, destinations absent. Each command must end with the tail shown; both `absent` lines must print.

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
node scripts/gate.mjs voxel        # tail: voxel-test PASS
node scripts/gate.mjs support      # tail: support-test PASS
node scripts/gate.mjs grapple      # tail: grapple-test PASS
ls src/games 2>/dev/null || echo absent
ls docs/play 2>/dev/null || echo absent
```

2. Write `src/games/old-master/hero.js`, exactly as printed, ending at the final `}`; the commands after each block set the file's exact ending mechanically, however the writing tool ended it:

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

// stepHero(war, hero, input, dt): the walk. The stick names a desired
// velocity; the legs chase it at HERO.accel; the engine owns gravity,
// ground, and everything that can go wrong. Call BEFORE tickWar.
export function stepHero(war, hero, input, dt) {
  if (!hero.alive) return;
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
truncate -s 2179 src/games/old-master/hero.js && printf '\n' >> src/games/old-master/hero.js
wc -c src/games/old-master/hero.js       # must print 2180
sha256sum src/games/old-master/hero.js   # must print e25f8cd0b7f926f34f657c37fd56abbda7e5e937fcd943a807e7387b866fc592
```

3. Write `scripts/old-master-test.mjs`, exactly as printed:

```js
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
```

```sh
truncate -s 3531 scripts/old-master-test.mjs && printf '\n' >> scripts/old-master-test.mjs
wc -c scripts/old-master-test.mjs       # must print 3532
sha256sum scripts/old-master-test.mjs   # must print b5f0e32556943de9796835fe6206826e964a2b889e285e401f835d6dc720bd72
```

4. Write `docs/play/index.html`, exactly as printed:

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
<title>OLD MASTER</title>
<style>
  html, body { margin: 0; height: 100%; overflow: hidden; background: #0d1117; touch-action: none; }
  #cv { width: 100%; height: 100%; display: block; }
  #title { position: fixed; top: max(10px, env(safe-area-inset-top)); left: 0; right: 0; text-align: center;
    color: #e9edf2; font: 600 13px/1.4 system-ui, sans-serif; letter-spacing: 0.35em; pointer-events: none;
    text-shadow: 0 1px 4px rgba(0,0,0,.5); }
  #stick { position: fixed; left: 18px; bottom: max(18px, env(safe-area-inset-bottom)); width: 108px; height: 108px;
    border-radius: 50%; border: 1.5px solid rgba(233,237,242,.35); background: rgba(13,17,23,.25); display: none; }
  #nub { position: absolute; left: 50%; top: 50%; width: 40px; height: 40px; margin: -20px 0 0 -20px;
    border-radius: 50%; background: rgba(233,237,242,.5); }
  @media (pointer: coarse) { #stick { display: block; } }
</style>
</head>
<body>
<canvas id="cv"></canvas>
<div id="title">OLD&nbsp;MASTER</div>
<div id="stick"><div id="nub"></div></div>
<script type="importmap">{ "imports": { "three": "./three.module.js" } }</script>
<script type="module" src="./main.js"></script>
</body>
</html>
```

```sh
truncate -s 1366 docs/play/index.html && printf '\n' >> docs/play/index.html
wc -c docs/play/index.html       # must print 1367
sha256sum docs/play/index.html   # must print 06e5bd7c639992e9feeccd0a986242dc00f67476dad3b0f6fd33c2198fc7c5ae
```

5. Write `docs/play/main.js`, exactly as printed:

```js
// OLD MASTER — docs/play/main.js: OM-1, the page and the walk. Boots the
// war from seed 1, spawns the master, and runs the loop: hero step, war
// tick, render with the camera riding the master. Keys or the touch stick
// walk; everything else is the live war exactly as the gate proved it.
import { bootWar, tickWar, defaultTickInput, makeRenderer } from "../../src/depot/api.js";
import { spawnHero, stepHero, heroInput } from "../../src/games/old-master/hero.js";

const canvas = document.getElementById("cv");
const war = bootWar({ seed: 1 });
const hero = spawnHero(war, 0, 20);
const R = makeRenderer(canvas, war.world, {});
const input = defaultTickInput();
const hIn = heroInput();

// keys: arrows or WASD, world-aligned; the camera yaw is fixed at boot so
// screen-up is world-north enough for OM-1 (the camera policy phase refines it)
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

// the touch stick: one floating nub, radius-normalized
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

// screen stick -> world: rotate by the camera's fixed yaw so up on the
// stick walks away from the camera
function worldStick() {
  const k = keyStick();
  const sx = Math.abs(k.x) + Math.abs(k.z) > 0 ? k.x : stickVec.x;
  const sz = Math.abs(k.x) + Math.abs(k.z) > 0 ? k.z : stickVec.z;
  const f = R.camBasis.fwd, rt = R.camBasis.right;
  const fx = f.x, fz = f.z, fl = Math.hypot(fx, fz) || 1;
  return { vx: rt.x * sx + (fx / fl) * -sz, vz: rt.z * sx + (fz / fl) * -sz };
}

const STEP = 1 / 120;
let last = performance.now(), acc = 0;
function frame(now) {
  requestAnimationFrame(frame);
  let dt = Math.min(0.1, (now - last) / 1000); last = now;
  acc += dt;
  const w = worldStick();
  hIn.vx = w.vx; hIn.vz = w.vz;
  let guard = 0;
  while (acc >= STEP && guard++ < 12) { acc -= STEP; stepHero(war, hero, hIn, STEP); tickWar(war, STEP, input); }
  R.render(dt, hero.pos, null);
}
requestAnimationFrame(frame);
```

```sh
truncate -s 3211 docs/play/main.js && printf '\n' >> docs/play/main.js
wc -c docs/play/main.js       # must print 3212
sha256sum docs/play/main.js   # must print b70a16a300e2c9f2574b4b5519b247937d01d7cfc6668715df341775c3d23673
```

6. Vendor the three library by copy — never retyped:

```sh
cp node_modules/three/build/three.module.js docs/play/three.module.js
wc -c docs/play/three.module.js       # must print 1140878
sha256sum docs/play/three.module.js   # must print af527c374b56b8688737a42d7fcea7cb8aaeb57a4e3c6da98b4dffd55bcc3514
```

7. In `scripts/gate.mjs`, in the `GATES` table (currently 17 entries ending with `"grapple"`), add one line after the `"grapple"` entry:

```js
  "old-master": ["scripts/old-master-test.mjs"],
```

Touch nothing else in the file.

8. Run the new gate through the wrapper. The output must be 9 PASS lines, then exactly `old-master-test: 9 PASS / 0 FAIL`, then `old-master-test PASS`, exit 0. Any FAIL stops the task before step 9.

```sh
node scripts/gate.mjs old-master
```

9. Assert the prior gates did not move (same commands and required tails as step 1).

10. Close the records in this landing: bump `package.json` version to `0.0.16`; in `docs/plans/phase-0.0.16-old-master-1.md` replace the status line with `Status: LANDED, commit stamped below, 2026-08-28. Gate: 9 PASS / 0 FAIL; prior gates unmoved.`; in `docs/plans/game-old-master.md` change the OM-1 line's leading `- ` to `- [LANDED] `. README is untouched — the game earns its README section at OM-12.

11. Commit and push the landing, then stamp the real hash in a second small commit — NEVER amend after stamping:

```sh
git add src/games scripts/old-master-test.mjs scripts/gate.mjs package.json docs/play docs/plans docs/old-master-pitch.md
git commit -m "phase 0.0.16 — OLD MASTER OM-1: the page and the walk

The master's body in the live war, the walk, the playable page, deployed.
old-master-test: 9 PASS / 0 FAIL; seventeen prior gates unmoved.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push origin main
H=$(git rev-parse --short HEAD)
sed -i "s/commit stamped below/commit \`$H\`/" docs/plans/phase-0.0.16-old-master-1.md
git add docs/plans && git commit -m "phase 0.0.16 record stamped — $H

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push origin main
```

12. Deploy: ensure GitHub Pages serves the repository root from main. Attempt the enable; an "already exists" answer is success, any other failure is reported plainly and does NOT stop the task (the owner can flip the setting by hand):

```sh
gh api -X POST repos/jeffreycoen/combo-engine/pages -f "source[branch]=main" -f "source[path]=/" 2>&1 | tail -2
gh api repos/jeffreycoen/combo-engine/pages 2>&1 | grep -o '"html_url":[^,]*' | head -1
```

The playable page, once Pages is live: `https://jeffreycoen.github.io/combo-engine/docs/play/`

## Acceptance

- Steps 2–6: every wc -c and sha256 line matches exactly.
- Step 8: `old-master-test: 9 PASS / 0 FAIL` then `old-master-test PASS`, exit 0.
- Step 9: every prior gate prints its pinned tail unchanged.
- Step 10's records flipped, riding the landing commit; push accepted by origin.
- Step 12's Pages state reported verbatim. The look itself — the master walking the valley on phone and desktop — is the owner's live check, not this task's.

## Report

Read-confirmation first, then one line of outcome, then bullets: the gate's count line and verdict line verbatim, all five wc -c lines, all five sha256 lines, every prior-gate tail, both commit hashes, push results, the Pages api responses verbatim, the play URL. Every nonconformity its own labeled bullet. Fixture seeds: 1; no seed is special.
