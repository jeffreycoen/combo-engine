// COMBO-ENGINE — wells-test: the gravity field gate. The field law is
// ratified against the demo's own text (accel lifted from
// deadweight-hangar.html at run time, twin-driven on rolled points); the
// pair step, potential, and predictors are ratified by laws at rolled
// worlds. NO HARDWIRED SEEDS: rolls fresh each run and prints; rerun with
// SEED=<n> in the environment.
import fs from "node:fs";
import { makeWell, accel, stepPair, potField, predStop, predictBallistic } from "../src/modules/wells/wells.js";

let pass = 0, fail = 0;
const check = (name, ok) => { if (ok) { pass++; console.log("PASS " + name); } else { fail++; console.log("FAIL " + name); } };
const SEED = process.env.SEED ? +process.env.SEED : Math.floor(Math.random() * 1e9);
console.log("seeds " + JSON.stringify({ field: SEED }));
let a = SEED >>> 0;
const rnd = () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const rollWell = () => makeWell((rnd() - 0.5) * 600, (rnd() - 0.5) * 600, 500 + rnd() * 12000, 2 + rnd() * 8, 5 + rnd() * 40, "w" + Math.floor(rnd() * 100));

// the demo's own accel, lifted from its text
const demoSrc = fs.readFileSync(new URL("../deadweight-hangar.html", import.meta.url), "utf8");
const i0 = demoSrc.indexOf("function accel(");
const demoAccel = new Function("return (" + demoSrc.slice(i0, demoSrc.indexOf("function inNeb")).trim().replace("function accel", "function") + ")")();

let twin = true;
for (let i = 0; i < 3000 && twin; i++) {
  const wells = [rollWell(), rollWell(), rollWell()];
  const x = (rnd() - 0.5) * 800, y = (rnd() - 0.5) * 800;
  const [ax, ay] = accel(wells, x, y);
  const [bx, by] = demoAccel(wells, x, y);
  twin = ax === bx && ay === by;
}
check("wells: 3000 rolled field reads run twin with the demo's own text", twin);

check("wells: a made well is at rest with the demo's shape",
  (() => { const w = makeWell(1, 2, 3, 4, 5, "n"); return w.vx === 0 && w.vy === 0 && w.p === 2.3 && w.r === 5 && makeWell(0, 0, 0, 0, 0, "m").r === 0; })());

// the field points at the well and weakens with distance
let attract = true;
for (let i = 0; i < 500 && attract; i++) {
  const w = rollWell();
  const [ax, ay] = accel([w], w.x - 50, w.y);
  const [bx] = accel([w], w.x - 200, w.y);
  attract = ax > 0 && Math.abs(ay) < 1e-12 && ax > bx && bx > 0;
}
check("wells: the field points at the well and weakens with distance", attract);

// equal softening conserves the pair's mu-weighted momentum exactly
let momentum = true;
for (let i = 0; i < 300 && momentum; i++) {
  const p = rollWell(), q = rollWell();
  q.soft = p.soft;
  p.vx = (rnd() - 0.5) * 2; p.vy = (rnd() - 0.5) * 2; q.vx = (rnd() - 0.5) * 2; q.vy = (rnd() - 0.5) * 2;
  const px0 = p.mu * p.vx + q.mu * q.vx, py0 = p.mu * p.vy + q.mu * q.vy;
  stepPair(p, q, 1 / 60);
  momentum = Math.abs(p.mu * p.vx + q.mu * q.vx - px0) < 1e-9 * Math.max(1, Math.abs(px0))
    && Math.abs(p.mu * p.vy + q.mu * q.vy - py0) < 1e-9 * Math.max(1, Math.abs(py0));
}
check("wells: equal softening conserves the pair's mu-weighted momentum through a step", momentum);

// the potential clamps to the demo's own rails and adds per well
{
  const w1 = rollWell(), w2 = rollWell();
  const prof = () => [46, 30];
  const single = potField([w1], w1.x, w1.y, prof);
  const both = potField([w1, w2], w1.x, w1.y, prof);
  const far = potField([w1], w1.x + 5000, w1.y, prof);
  const deep = potField([w1, w1, w1, w1, w1, w1], w1.x, w1.y, prof);
  const neg = potField([w1, w1], w1.x, w1.y, () => [-52, 26]);
  check("wells: the warp adds per well, fades far out, and clamps to the demo's rails",
    both >= single && far < 1 && deep === 230 && neg === -60 && single === 46);
}

// a dry tank predicts nothing; a strong drive kills rolled velocity inside the horizon
let stops = true, dry = true;
for (let i = 0; i < 40 && stops; i++) {
  const wells = [rollWell(), rollWell()];
  const s = { x: 0, y: 0, vx: (rnd() - 0.5) * 20, vy: (rnd() - 0.5) * 20, ang: rnd() * 6.28, w: 0, fuel: 100 };
  const r = predStop(s, 10, { F: 400, tau: 300, I: 60, nF: 2, nR: 0, thrust: 200 }, wells);
  stops = r !== null && r.t >= 0 && Number.isFinite(r.x + r.y);
  dry = dry && predStop({ ...s, fuel: 0 }, 10, { F: 400, tau: 300, I: 60, nF: 2, nR: 0, thrust: 200 }, wells) === null;
}
check("wells: the stop predictor kills rolled velocity with fuel and refuses without", stops && dry);

// no wells, no thrust: the shot flies straight at fixed spacing
{
  const start = { x: 0, y: 0, vx: 12, vy: 5 };
  const r = predictBallistic(start, { life: 2 }, [], [], []);
  let straight = r.pts.length > 30 && !r.hit;
  for (let k = 1; k < r.pts.length && straight; k++) {
    const [x1, y1] = r.pts[k - 1], [x2, y2] = r.pts[k];
    straight = Math.abs((x2 - x1) - 12 / 30) < 1e-9 && Math.abs((y2 - y1) - 5 / 30) < 1e-9;
  }
  check("wells: a shot in empty space flies straight at the integrator's own spacing", straight);
}

// a ghost on the path is hit; the range dial breaks the line
{
  const ghost = { n: "mark", x: 20, y: 0, vx: 0, vy: 0, r: 3, trail: [] };
  const r = predictBallistic({ x: 0, y: 0, vx: 30, vy: 0 }, { life: 5 }, [], [ghost], []);
  const ranged = predictBallistic({ x: 0, y: 0, vx: 30, vy: 0 }, { life: 5, maxRange: 40 }, [], [], []);
  const last = ranged.pts[ranged.pts.length - 1];
  const flew = Math.hypot(last[0] - ranged.pts[0][0], last[1] - ranged.pts[0][1]);
  check("wells: a mover on the path is hit by name; the range dial breaks one step past its line",
    r.hit && r.hit.n === "mark" && flew <= 40 + 30 / 30 + 1e-9 && flew > 40 && ranged.pts.length < 60);
}

// thrust bends the trajectory farther than the coasting shot
{
  const coast = predictBallistic({ x: 0, y: 0, vx: 10, vy: 0 }, { life: 3 }, [], [], []);
  const burn = predictBallistic({ x: 0, y: 0, vx: 10, vy: 0 }, { life: 3, thrust: 26, thrustFuel: 4 }, [], [], []);
  const cx = coast.pts[coast.pts.length - 1][0], bx = burn.pts[burn.pts.length - 1][0];
  check("wells: the missile's burn carries it farther than the coasting shot", bx > cx + 10);
}

console.log(`wells-test: ${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
console.log("wells-test PASS");
