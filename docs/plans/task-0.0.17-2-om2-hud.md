# Task 0.0.17-2 — OM-2 follow-up: the HUD and the right stick

One job: re-sign the page's two files exactly as printed — the deployed version and frame rate shown live, and a visible right aim stick on touch — prove the numbers, smoke the page, deploy, stamp. The owner's playtest drove both: the shipped page showed no version (so a stale cache is invisible) and the touch aim had no widget (so the phone showed one lone stick). No sim code moves; the game's gate must not move.

Suggested model: Sonnet 5.

Required reading, in order (confirm at the top of your report):
1. This file, whole.
2. `docs/plans/phase-0.0.17-om2-grip.md`, whole (this task rides that phase; its status line is already LANDED and stays).

Licensed re-teach, declared: both page files are REPLACED whole. `docs/play/index.html` old sha `06e5bd7c639992e9feeccd0a986242dc00f67476dad3b0f6fd33c2198fc7c5ae` → new printed at step 2; `docs/play/main.js` old sha `c7e51cdf95b4f7bb0619e5f7c12061e61a3abaf914f44ff94033255dfa153c28` → new printed at step 3. Report both as one re-teach bullet.

## Steps

Run from `/home/batman/combo-engine`. A failed assert stops the task; report the step and its verbatim output, run nothing further.

1. Assert the ground: the game's gate green as landed.

```sh
node scripts/gate.mjs old-master   # tail: old-master-test PASS, count line old-master-test: 18 PASS / 0 FAIL
```

2. REPLACE `docs/play/index.html` whole, exactly as printed; the commands after each block set the file's exact ending mechanically:

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
  #astick { position: fixed; right: 18px; bottom: max(18px, env(safe-area-inset-bottom)); width: 108px; height: 108px;
    border-radius: 50%; border: 1.5px solid rgba(233,178,92,.45); background: rgba(23,17,13,.25); display: none; }
  #anub { position: absolute; left: 50%; top: 50%; width: 40px; height: 40px; margin: -20px 0 0 -20px;
    border-radius: 50%; background: rgba(233,178,92,.55); }
  #hud { position: fixed; top: max(10px, env(safe-area-inset-top)); right: 12px; color: rgba(233,237,242,.75);
    font: 500 11px/1.4 ui-monospace, monospace; pointer-events: none; text-shadow: 0 1px 4px rgba(0,0,0,.5); text-align: right; }
  @media (pointer: coarse) { #stick, #astick { display: block; } }
</style>
</head>
<body>
<canvas id="cv"></canvas>
<div id="title">OLD&nbsp;MASTER</div>
<div id="stick"><div id="nub"></div></div>
<div id="astick"><div id="anub"></div></div>
<div id="hud">mk -<br>- fps</div>
<script type="importmap">{ "imports": { "three": "./three.module.js" } }</script>
<script type="module" src="./main.js"></script>
</body>
</html>
```

```sh
truncate -s 2092 docs/play/index.html && printf '\n' >> docs/play/index.html
wc -c docs/play/index.html       # must print 2093
sha256sum docs/play/index.html   # must print c1329873cc7f809498ca58d83e811194549a8c4f82f0922ec2f7341adf95db56
```

3. REPLACE `docs/play/main.js` whole, exactly as printed:

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

// the right touch stick: the aim, orbiting the master at a fixed reach
const AIM_R = 28;
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
    aim = { x: hero.pos.x + aimVec.x * AIM_R, z: hero.pos.z + aimVec.z * AIM_R };
  }
  fpsFrames++; fpsT += dt;
  if (fpsT >= 0.5) { fpsText = Math.round(fpsFrames / fpsT) + " fps"; fpsFrames = 0; fpsT = 0; }
  hud.innerHTML = mkText + "<br>" + fpsText;
  title.textContent = gripState ? "OLD MASTER · grip " + Math.round(strain(gripState)) : "OLD MASTER";
  R.render(dt, hero.pos, aim);
}
requestAnimationFrame(frame);
```

```sh
truncate -s 7340 docs/play/main.js && printf '\n' >> docs/play/main.js
wc -c docs/play/main.js       # must print 7341
sha256sum docs/play/main.js   # must print 5c87231dbdeb553e612f76da2fb1a539968dce0e70bb3e1d9f0bf2dd503d4ef9
```

4. Run the game's gate — it must not move: 18 PASS lines, `old-master-test: 18 PASS / 0 FAIL`, `old-master-test PASS`, exit 0.

```sh
node scripts/gate.mjs old-master
```

5. Browser smoke with the HUD assert — the scene must paint AND the HUD must carry the live version:

```sh
(python3 -m http.server 8941 >/dev/null 2>&1 &)
sleep 1
timeout 200 chromium --headless=new --no-sandbox --use-angle=swiftshader-webgl --enable-unsafe-swiftshader --virtual-time-budget=90000 --screenshot=/tmp/claude-1000/om2b-landing-smoke.png --window-size=900,600 http://127.0.0.1:8941/docs/play/index.html 2>/dev/null
SZ=$(wc -c < /tmp/claude-1000/om2b-landing-smoke.png); echo "smoke bytes $SZ"; test "$SZ" -gt 100000 && echo SMOKE-OK
timeout 200 chromium --headless=new --no-sandbox --use-angle=swiftshader-webgl --enable-unsafe-swiftshader --virtual-time-budget=90000 --dump-dom http://127.0.0.1:8941/docs/play/index.html 2>/dev/null | grep -o '<div id="hud">[^<]*<br>[^<]*</div>'
```

`SMOKE-OK` must print, and the hud line must read `mk 0.0.17` with a numeric fps. Both go in the report verbatim.

6. Commit and push (the push is the deploy):

```sh
git add docs/play/index.html docs/play/main.js docs/plans
git commit -m "task 0.0.17-2 — the page tells the truth: live mk and fps, a real right stick

The deployed version reads from package.json uncached, so a stale cache is
visible at a glance; the touch aim gains its own stick beside the walk stick.
old-master-test unmoved at 18 PASS / 0 FAIL; page smoked with the hud asserted.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push origin main
```

## Acceptance

- Steps 2–3: wc -c and sha256 match exactly.
- Step 4: the gate unmoved at `old-master-test: 18 PASS / 0 FAIL`.
- Step 5: `SMOKE-OK` and the hud line `mk 0.0.17` with numeric fps, verbatim in the report.
- Push accepted. The owner's live check on the phone — two sticks visible, mk and fps on screen — is the acceptance the numbers cannot give.

## Report

Read-confirmation first, then one line of outcome, then bullets: the gate's count and verdict lines, both wc -c lines, both sha256 lines, the re-teach bullet (both old→new), the smoke bytes line and the hud line verbatim, the commit hash, the push result. Every nonconformity its own labeled bullet. Fixture seeds: 1.
