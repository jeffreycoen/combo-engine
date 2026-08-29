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
