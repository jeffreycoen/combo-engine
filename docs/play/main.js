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
  R.render(dt, hero.pos, hero.pos);
}
requestAnimationFrame(frame);
