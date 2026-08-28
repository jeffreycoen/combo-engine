// COMBO-ENGINE — grapple-test: the grapple rope module's gate. Sixteen
// checks, seedless arithmetic. The knowns are the demo's own constants run
// closed-form: recoil 0.15 x 34 = 5.1, the winch's 8 u/s demand, the jerk's
// 1.15, the 260 snap line, the yank's mu x 22.
import { castGrapple, tapGrapple, bite, stepFly, stepRewind, stepAdrift, stepEmbedded, requestYank, stepRope, GRAP_SNAP } from "../src/modules/grapple/grapple.js";

let pass = 0, fail = 0;
const check = (name, ok) => { if (ok) { pass++; console.log("PASS " + name); } else { fail++; console.log("FAIL " + name); } };
const near = (a, b, e) => Math.abs(a - b) < (e || 1e-9);
const noG = () => [0, 0];
const mkShip = (M, I) => ({ x: 0, y: 0, vx: 0, vy: 0, w: 0, ang: 0, M: M || 100, I: I || 500 });

{ const s = mkShip();
  const g = castGrapple(s, 2, 0, 1.5);
  check("cast: the head leaves 2.2 ahead at 34 plus ship velocity, state fly",
    near(g.x, 4.2) && near(g.y, 0) && near(g.vx, 34) && near(g.vy, 0) && g.state === 'fly');
  check("recoil: the ship pays J = 0.15 x 34 = 5.1 — velocity -J/M, spin -arm J/I",
    near(s.vx, -5.1 / 100) && near(s.w, -(1.5 * 5.1) / 500)); }

{ const g = { state: 'fly' };
  check("tap grammar: fly calls it back, stuck starts the reel, reeling cuts",
    tapGrapple(g).state === 'rewind'
    && (g.state = 'stuck', tapGrapple(g).state === 'reel')
    && tapGrapple(g) === null); }

{ const s = mkShip();
  const g = castGrapple(s, 0, 0, 0);
  for (let k = 0; k < 400 && g.state === 'fly'; k++) stepFly(g, noG, 0, 0, 1 / 60);
  check("spent cast: past range 95 the head turns for home on its own",
    g.state === 'rewind' && Math.hypot(g.x, g.y) > 95); }

{ const g = { state: 'rewind', x: 40, y: 0, vx: 0, vy: 0 };
  let r = g, steps = 0;
  while (r && steps++ < 200) r = stepRewind(r, 0, 0, 1 / 60);
  check("rewind: home at 44 u/s, the line rearms inside 2.5 — 53 steps",
    r === null && steps === 53); }

{ const g = { state: 'adrift', x: 2.9, y: 0, vx: 0, vy: 0 };
  check("recovery: fly within 3 of an adrift head and it is recovered",
    stepAdrift(g, noG, 0, 0, 1 / 60) === null);
  const tgt = { x: 10, y: 0, vx: 1, vy: 0 };
  const e = { state: 'embedded' };
  check("embedded: a snapped head rides its target until fetched",
    stepEmbedded(e, tgt, 0, 0) === e && e.x === 10 && near(e.vx, 1)
    && stepEmbedded(e, { x: 1, y: 0, vx: 0, vy: 0 }, 0, 0) === null); }

{ const s = mkShip(100, 500);
  const g = bite({});
  const tgt = { x: 10, y: 0, vx: 0.5, vy: 0 };
  const r = stepRope(g, s, 0, 0, tgt, 25, 1 / 60);
  check("the bite sets the rest length: inside it the rope is slack and nothing pulls",
    near(g.restLen, 10) && r.taut === false && s.vx === 0 && tgt.vx === 0.5); }

{ const s = mkShip(100, 500);
  const g = bite({}); g.restLen = 10; g.state = 'stuck';
  const tgt = { x: 12, y: 0, vx: 2, vy: 0 };
  const mu = (100 * 25) / 125;
  const J = 2 * mu * 1.15;
  const p0 = 100 * s.vx + 25 * tgt.vx;
  const r = stepRope(g, s, 0, 0, tgt, 25, 1 / 60);
  check("the jerk: first taut kills the separation at rel x mu x 1.15, both ends pulled by their masses",
    r.taut === true && near(r.J, J) && near(s.vx, J / 100) && near(tgt.vx, 2 - J / 25));
  check("momentum holds through the line", near(100 * s.vx + 25 * tgt.vx, p0));
  check("the line does not stretch: the 2-unit error splits by inverse mass — ship 0.4, target 1.6",
    near(s.x, 2 * (25 / 125)) && near(tgt.x, 12 - 2 * (100 / 125))); }

{ const s = mkShip(100, 500);
  const g = bite({}); g.restLen = 10; g.state = 'reel'; g.taut = true;
  const tgt = { x: 12, y: 0, vx: 0, vy: 0 };
  const dt = 1 / 60;
  const rest1 = Math.max(4, 10 - 8 * dt);
  const mu = (100 * 25) / 125;
  const r = stepRope(g, s, 0, 0, tgt, 25, dt);
  check("the winch: reeling shortens the rest length 8 u/s and demands 8 u/s of closing — J = 8 x mu, strain booked",
    near(g.restLen, rest1) && near(r.J, 8 * mu) && near(g.tear, 8 * mu)); }

{ const s = mkShip(100, 500);
  const g = bite({}); g.restLen = 5; g.state = 'stuck';
  const tgt = { x: 20, y: 0, vx: 20, vy: 0 };
  const r = stepRope(g, s, 0, 0, tgt, 10000, 1 / 60);
  check("the snap: a runaway mass makes the jerk exceed 260 — the line parts, the head stays embedded",
    r.snapped === true && g.state === 'embedded' && s.vx === 0 && tgt.vx === 20); }

{ const s = mkShip(100, 500);
  const g = bite({}); g.restLen = 20; g.state = 'stuck'; g.taut = true;
  const tgt = { x: 10, y: 0, vx: 0, vy: 0 };
  const mu = (100 * 10) / 110;
  requestYank(g);
  const r = stepRope(g, s, 0, 0, tgt, 10, 1 / 60);
  check("the yank: one commanded haul J = mu x 22 eats the slack, moves both ends, books 0.6 J of strain (less one step of slack bleed)",
    near(g.restLen, 10) && near(r.J, mu * 22, 1e-6) && near(s.vx, mu * 22 / 100)
    && near(tgt.vx, -mu * 22 / 10) && near(g.tear, mu * 22 * 0.6 - 60 / 60)
    && mu * 22 < GRAP_SNAP); }

{ const s = mkShip(100, 500);
  const g = bite({}); g.restLen = 20; g.state = 'stuck'; g.taut = true;
  const tgt = { x: 10, y: 0, vx: 0, vy: 0 };
  requestYank(g);
  const r = stepRope(g, s, 0, 0, tgt, 25, 1 / 60);
  check("yank snap: hauling a mass whose mu x 22 tops 260 parts the line instead of moving anything",
    r.snapped === true && g.state === 'embedded' && s.vx === 0 && tgt.vx === 0); }

{ const s = mkShip(100, 500);
  s.w = 1;
  const g = bite({}); g.restLen = 10; g.state = 'stuck'; g.taut = true;
  const tgt = { x: 12, y: 5, vx: 0, vy: 0 };
  const mu = (100 * 25) / 125;
  stepRope(g, s, 0, 5, tgt, 25, 1 / 60);
  // anchor (0,5) on a hull spinning at w=1: avx = -w*ry = -5, so the still
  // target separates at 5 u/s; J = 5*mu, torque (rx*ny - ry*nx)*J/I = -5J/500
  check("the anchor rides the hull's spin: the mount 5 above centre turns spin into 5 u/s of separation",
    near(s.vx, 5 * mu / 100) && near(s.w, 1 - 5 * (5 * mu) / 500) && near(tgt.vx, -5 * mu / 25)); }

console.log(`grapple-test: ${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
console.log("grapple-test PASS");
