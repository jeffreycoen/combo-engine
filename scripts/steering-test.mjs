// COMBO-ENGINE — steering-test: the steering module's gate. Twelve checks,
// seedless arithmetic, composing with the orders module. The spec rows are
// the fleet demo's own ship table (homeworld_fleet_command.jsx lines 10-16)
// plus its orbit rates as data: interceptor strafes at 0.7, guards at 0.5,
// idles at 1; capital ships 0.4 / 0.3 / 0.3.
import { makeUnit } from "../src/modules/orders/orders.js";
import { checkMotionSpec, attachMotion, rotateToward, desiredMoveSpeed, stepMove, stepStrafe, stepGuard, stepIdle } from "../src/modules/steering/steering.js";

let pass = 0, fail = 0;
const check = (name, ok) => { if (ok) { pass++; console.log("PASS " + name); } else { fail++; console.log("FAIL " + name); } };
const near = (a, b, e) => Math.abs(a - b) < (e || 1e-9);

const SPEC = {
  interceptor: { hp: 50, speed: .55, dmg: 4, range: 20, turnRate: 3.0, accel: 2.0, strafeRadius: 12, strafeRate: .7, guardRate: .5, idleRate: 1 },
  frigate: { hp: 500, speed: .12, dmg: 30, range: 38, turnRate: .5, accel: .3, strafeRadius: 0, strafeRate: .4, guardRate: .3, idleRate: .3 },
};
const mk = (t, pos, heading) => attachMotion(makeUnit(SPEC, t, pos), SPEC[t], heading || [1, 0, 0], 0, 1, 0);

check("contract: a clean row reports zero problems, a bare row reports its 7 at once",
  checkMotionSpec(SPEC.interceptor).length === 0 && checkMotionSpec({}).length === 7 && checkMotionSpec(null).length === 1);

{ const u = mk("interceptor", [1, 2, 3]);
  check("attachMotion: speed starts at 0, bank level, heading unit, rates carried",
    u.currentSpeed === 0 && u.bank === 0 && near(Math.hypot(...u.heading), 1)
    && u.maxSpeed === .55 && u.strafeRate === .7 && u.guardRate === .5 && u.idleRate === 1); }

check("turning law: a 90-degree goal at fraction 0.1 closes exactly 9 degrees",
  (() => { const h = rotateToward([1, 0, 0], [0, 0, 1], 0.1);
    const angLeft = Math.acos(h[0] * 0 + h[1] * 0 + h[2] * 1);
    return near(angLeft, Math.PI / 2 * 0.9) && near(Math.hypot(...h), 1); })());

check("braking law: far away wants maxSpeed; at rest inside the window wants dist/(0+2), floored at 5%",
  (() => { const u = mk("frigate", [0, 0, 0]);
    const far = desiredMoveSpeed(u, 100) === .12;
    const close = near(desiredMoveSpeed(u, 1.5), .12 * (1.5 / 2));
    const floor = near(desiredMoveSpeed(u, 0.05), .12 * .05);
    return far && close && floor; })());

check("braking window widens with speed: v^2/(2 a 0.3) joins the 2",
  (() => { const u = mk("frigate", [0, 0, 0]); u.currentSpeed = .12;
    const bd = .12 * .12 / (2 * .3 * .3);
    return near(desiredMoveSpeed(u, bd + 1), .12 * ((bd + 1) / (bd + 2))); })());

{ const u = mk("interceptor", [0, 0, 0]);
  u.moveTarget = [100, 0, 0];
  const dt = 1 / 60;
  stepMove(u, dt);
  const v1 = (0 + (.55 - 0) * dt * 2.0);
  check("move integration: one step lands speed (desired-v) dt accel and position dir v dt 60",
    near(u.currentSpeed, v1) && near(u.pos[0], v1 * dt * 60) && u.pos[1] === 0); }

{ const u = mk("interceptor", [0, 0, 0], [1, 0, 0]);
  u.moveTarget = [0, 0, 100];
  stepMove(u, 1 / 60);
  const bankTarget = Math.max(-.4, Math.min(.4, -1 * .7)); // cross([1,0,0],[0,0,1]).y = -1, gain 0.7, clamped to -0.4
  check("banking: a hard turn chases clamp(cross.y 0.7, limit 0.4) at rate 1.5",
    near(u.bank, (bankTarget - 0) * (1 / 60) * 1.5)); }

{ const u = mk("interceptor", [0.5, 0, 0]);
  u.moveTarget = [0.9, 0, 0]; u.currentSpeed = .4;
  stepMove(u, 1 / 60);
  check("arrival coast: within distance 1 the speed decays by 0.95 and the body holds",
    near(u.currentSpeed, .4 * .95) && near(u.pos[0], 0.5)); }

{ const u = mk("interceptor", [24, 0, 0]);
  const dt = 1 / 60;
  stepStrafe(u, [0, 0, 0], dt);
  const a = 1 * dt * .7;
  const orbit = [Math.cos(a) * 12, Math.sin(a * .7) * 3, Math.sin(a) * 12];
  const to = [orbit[0] - 24, orbit[1], orbit[2]];
  const od = Math.hypot(...to);
  const v1 = (Math.min(.55, od * .3) - 0) * dt * 2.0;
  check("strafe orbit: phase advances strafeDir dt 0.7; speed chases min(maxSpeed, dist 0.3); the demo's weave rides y",
    near(u.strafeAngle, a) && near(u.currentSpeed, v1)
    && near(u.pos[0], 24 + to[0] / od * v1 * dt * 60) && near(u.pos[1], to[1] / od * v1 * dt * 60)); }

{ const u = mk("frigate", [10, 0, 0]);
  const before = u.strafeAngle;
  stepGuard(u, [0, 0, 0], 1 / 60);
  check("guard orbit: a non-strafer guards at radius 10 and phase rate 0.3",
    near(u.strafeAngle - before, (1 / 60) * .3)); }

{ const u = mk("interceptor", [0, 0, 0]);
  u.currentSpeed = .5; u.bank = .3;
  const dt = 1 / 60;
  stepIdle(u, dt);
  check("idle drift: the demo's offsets at phase dt 0.12, coast 0.98, bank leveling 1 - dt 4",
    near(u.idleOrbit, dt * .12) && near(u.currentSpeed, .5 * .98) && near(u.bank, .3 * (1 - dt * 4))
    && near(u.pos[0], Math.cos(u.idleOrbit) * .3 * dt) && near(u.pos[2], Math.sin(u.idleOrbit) * .3 * dt)); }

{ const run = () => { const u = mk("interceptor", [0, 0, 0]); u.moveTarget = [40, 5, -20];
    for (let k = 0; k < 600; k++) stepMove(u, 1 / 60); return [u.pos, u.currentSpeed, u.bank, u.heading]; };
  const [p1, v1b, b1, h1] = run(), [p2, v2b, b2, h2] = run();
  check("determinism: six hundred identical steps land bit-identical position, speed, bank, heading",
    p1[0] === p2[0] && p1[1] === p2[1] && p1[2] === p2[2] && v1b === v2b && b1 === b2
    && h1[0] === h2[0] && h1[2] === h2[2]); }

console.log(`steering-test: ${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
console.log("steering-test PASS");
