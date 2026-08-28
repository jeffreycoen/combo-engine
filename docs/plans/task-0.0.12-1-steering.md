# Task 0.0.12-1 — the steering module

One job: write the steering module and its gate exactly as printed below, register the gate, prove the numbers, close the records. Every file's full content is below; write exactly what is written, run the listed gates, report. You design nothing.

Suggested model: Sonnet 5.

Required reading, in order (confirm at the top of your report):
1. This file, whole.
2. `docs/plans/phase-0.0.12-steering-module.md`, whole.

Source of the law (reference only — do not edit it): `homeworld_fleet_command.jsx` lines 969–993 and 1339–1465.

## Steps

Run from `/home/batman/combo-engine`. A failed assert stops the task; report the step and its verbatim output, run nothing further.

1. Assert the ground: all prior gates green, destination absent. Each command must end with the tail shown; `absent` must print.

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
ls src/modules/steering 2>/dev/null || echo absent
```

2. Write `src/modules/steering/steering.js`, exactly as printed, ending at the final `}`; the commands after the block set the file's exact ending mechanically, however the writing tool ended the file:

```js
// modules/steering — fleet steering behaviors, a SHAPED lift from the fleet
// demo (homeworld_fleet_command.jsx lines 1339-1465). The LAW is the demo's,
// carried exactly and cited by line; the CODE is new — plain [x, y, z]
// arrays, no renderer types, no game globals, no randomness (orbit phase
// and direction are caller-seeded state). The law:
//   - move: braking distance v^2 / (2 * accel * 0.3); inside brakeDist + 2
//     the desired speed is maxSpeed * max(0.05, dist / (brakeDist + 2)),
//     else maxSpeed; speed approaches desired at dt * accel and clamps to
//     [0, maxSpeed]; position advances dir * speed * dt * 60 (1424-1436);
//   - within distance 1 the unit coasts, speed * 0.95 (1449-1451);
//   - turning is a fractional approach: the heading rotates toward the goal
//     direction by fraction dt * turnRate — half rate while orbiting
//     (1439-1442, 1370-1374, 1400-1402);
//   - banking: the bank angle chases clamp(cross(forward, dir).y * gain,
//     +/-limit) at rate dt * 1.5 — gain 0.7 limit 0.4 moving, 0.8/0.4
//     strafing, 0.6/0.35 guarding (1444-1447, 1376-1380, 1403-1405);
//   - strafe orbit: angle advances strafeDir * dt * strafeRate; the orbit
//     point is target + [cos(a) * R, sin(a * 0.7) * 3, sin(a) * R]; desired
//     speed min(maxSpeed, orbitDist * 0.3) (1348-1365);
//   - guard orbit: radius strafeRadius if it strafes else 10; angle rate
//     guardRate; weave sin(a * 0.5) * 2; desired speed min(maxSpeed,
//     orbitDist * 0.25) (1383-1398);
//   - idle drift: phase advances dt * 0.12 * idleRate; the drift offset is
//     [cos(p) * 0.3, sin(p * 1.3) * 0.1, sin(p) * 0.3] * dt; speed * 0.98;
//     the bank returns to level at 1 - dt * 4 and snaps flat under 0.01
//     (1454-1464).
// The demo keys its orbit rates off ship type names (0.7/0.4 strafing,
// 0.5/0.3 guarding, 1/0.3 idling, interceptor first); here they are spec
// data — strafeRate, guardRate, idleRate — with the demo's values as the
// fixture. Composes with the orders module: resolveMode picks the branch,
// these functions move the unit.

// The motion spec contract: every problem reported at once, none thrown.
export function checkMotionSpec(row) {
  const problems = [];
  if (!row || typeof row !== "object") return ["row: not an object"];
  for (const f of ["speed", "accel", "turnRate", "strafeRadius", "strafeRate", "guardRate", "idleRate"]) {
    if (typeof row[f] !== "number" || !Number.isFinite(row[f])) problems.push(`${f}: missing or not a number`);
  }
  return problems;
}

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const len = (a) => Math.hypot(a[0], a[1], a[2]);
const norm = (a) => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// rotateToward: turn unit vector a toward unit vector b by fraction f of
// the angle between them — the demo's quaternion slerp, said as vectors.
export function rotateToward(a, b, f) {
  if (f >= 1) return b.slice();
  const c = clamp(dot(a, b), -1, 1);
  const ang = Math.acos(c);
  if (ang < 1e-9) return b.slice();
  const ax = cross(a, b);
  const al = len(ax);
  if (al < 1e-9) return a.slice();
  const [ux, uy, uz] = [ax[0] / al, ax[1] / al, ax[2] / al];
  const t = ang * f, ct = Math.cos(t), st = Math.sin(t);
  const d = dot([ux, uy, uz], a) * (1 - ct);
  return norm([
    a[0] * ct + (uy * a[2] - uz * a[1]) * st + ux * d,
    a[1] * ct + (uz * a[0] - ux * a[2]) * st + uy * d,
    a[2] * ct + (ux * a[1] - uy * a[0]) * st + uz * d,
  ]);
}

// attachMotion: add the demo's per-unit motion state (969-993) to a plain
// unit — speed starts at 0, the caller seeds heading and orbit phase.
export function attachMotion(u, row, heading, strafeAngle, strafeDir, idleOrbit) {
  u.maxSpeed = row.speed; u.accel = row.accel; u.turnRate = row.turnRate;
  u.strafeRadius = row.strafeRadius; u.strafeRate = row.strafeRate;
  u.guardRate = row.guardRate; u.idleRate = row.idleRate;
  u.currentSpeed = 0; u.heading = norm(heading);
  u.bank = 0; u.strafeAngle = strafeAngle; u.strafeDir = strafeDir; u.idleOrbit = idleOrbit;
  return u;
}

// desiredMoveSpeed: the demo's braking law (1424-1431), pure.
export function desiredMoveSpeed(u, dist) {
  const brakeDist = u.currentSpeed * u.currentSpeed / (2 * u.accel * 0.3);
  if (dist < brakeDist + 2) return u.maxSpeed * Math.max(0.05, dist / (brakeDist + 2));
  return u.maxSpeed;
}

function bankToward(u, forward, dir, gain, limit, dt) {
  const c = cross(forward, dir);
  const target = clamp(c[1] * gain, -limit, limit);
  u.bank += (target - u.bank) * dt * 1.5;
}

// stepMove: the demo's move branch (1417-1451). The orders module owns the
// slot; this moves the body. Returns the distance still to go.
export function stepMove(u, dt) {
  const forward = u.heading;
  const to = sub(u.moveTarget, u.pos);
  const dist = len(to);
  if (dist <= 1) { u.currentSpeed *= 0.95; return dist; }
  const dir = norm(to);
  u.currentSpeed += (desiredMoveSpeed(u, dist) - u.currentSpeed) * dt * u.accel;
  u.currentSpeed = clamp(u.currentSpeed, 0, u.maxSpeed);
  for (let k = 0; k < 3; k++) u.pos[k] += dir[k] * u.currentSpeed * dt * 60;
  u.heading = rotateToward(forward, dir, dt * u.turnRate);
  bankToward(u, forward, dir, 0.7, 0.4, dt);
  return dist;
}

function orbitStep(u, center, radius, rate, weaveMul, weaveAmp, speedMul, dt, gain, limit) {
  const forward = u.heading;
  u.strafeAngle += u.strafeDir * dt * rate;
  const a = u.strafeAngle;
  const orbit = [center[0] + Math.cos(a) * radius, center[1] + Math.sin(a * weaveMul) * weaveAmp, center[2] + Math.sin(a) * radius];
  const to = sub(orbit, u.pos);
  const od = len(to);
  if (od > 1) {
    const dir = norm(to);
    const ds = Math.min(u.maxSpeed, od * speedMul);
    u.currentSpeed += (ds - u.currentSpeed) * dt * u.accel;
    for (let k = 0; k < 3; k++) u.pos[k] += dir[k] * u.currentSpeed * dt * 60;
    u.heading = rotateToward(forward, dir, dt * u.turnRate * 0.5);
    bankToward(u, forward, dir, gain, limit, dt);
  }
  return od;
}

// stepStrafe: the demo's strafing orbit (1343-1380) around a target point.
export function stepStrafe(u, targetPos, dt) {
  return orbitStep(u, targetPos, u.strafeRadius, u.strafeRate, 0.7, 3, 0.3, dt, 0.8, 0.4);
}

// stepGuard: the demo's guard orbit (1383-1405) around a ward's position.
export function stepGuard(u, guardPos, dt) {
  const radius = u.strafeRadius > 0 ? u.strafeRadius : 10;
  return orbitStep(u, guardPos, radius, u.guardRate, 0.5, 2, 0.25, dt, 0.6, 0.35);
}

// stepIdle: the demo's idle drift (1454-1464) — slow coast, level out.
export function stepIdle(u, dt) {
  u.idleOrbit += dt * 0.12 * u.idleRate;
  const p = u.idleOrbit;
  u.pos[0] += Math.cos(p) * 0.3 * dt;
  u.pos[1] += Math.sin(p * 1.3) * 0.1 * dt;
  u.pos[2] += Math.sin(p) * 0.3 * dt;
  u.currentSpeed *= 0.98;
  u.bank *= 1 - dt * 4;
  if (Math.abs(u.bank) < 0.01) u.bank = 0;
}
```

Then set the exact ending and assert identity:

```sh
truncate -s 7116 src/modules/steering/steering.js   # end exactly at the final }, however the writing tool ended the file
printf '\n' >> src/modules/steering/steering.js     # the final line's newline
wc -c src/modules/steering/steering.js       # must print 7117
sha256sum src/modules/steering/steering.js   # must print d4842c20406daefc81ce043bb043443f5d1276db188dbea4848dc318eaa2e15a
```

3. Write `scripts/steering-test.mjs`, exactly as printed; the commands after the block set the ending the same way:

```js
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
```

Then set the exact ending and assert identity:

```sh
truncate -s 5495 scripts/steering-test.mjs   # end exactly at the final character of the last line
printf '\n' >> scripts/steering-test.mjs     # the final line's newline
wc -c scripts/steering-test.mjs       # must print 5496
sha256sum scripts/steering-test.mjs   # must print 0bc138e8adb8342188e82a2b5675cc4f91dfaed367a6a909fced4c532412faf8
```

4. In `scripts/gate.mjs`, in the `GATES` table (currently 13 entries ending with `"orders"`), add one line after the `"orders"` entry:

```js
  "steering": ["scripts/steering-test.mjs"],
```

Touch nothing else in the file.

5. Run the new gate through the wrapper. The output must be 12 PASS lines, then exactly `steering-test: 12 PASS / 0 FAIL`, then `steering-test PASS`, exit 0. Any FAIL stops the task before step 6.

```sh
node scripts/gate.mjs steering
```

6. Assert the prior gates did not move (same commands and required tails as step 1).

7. Close the records in this landing: bump `package.json` version to `0.0.12`; in `docs/plans/phase-0.0.12-steering-module.md` replace the status line with `Status: LANDED, commit stamped below, 2026-08-28. Gate: 12 PASS / 0 FAIL; prior gates unmoved.`; in `README.md` flip the earned checklist box `- [ ] Steering behaviors: acceleration, capped turning, banking, strafe and guard orbits` to `- [x]`.

8. Commit and push the landing, then stamp the real hash in a second small commit — NEVER amend after stamping (an amend rewrites the commit and makes every stamped hash stale; phase 0.0.6 proved it):

```sh
git add src/modules/steering scripts/steering-test.mjs scripts/gate.mjs README.md package.json docs/plans
git commit -m "phase 0.0.12 — steering behaviors land, shaped

Braking law, fractional turning, banking, strafe and guard orbits, idle drift.
steering-test: 12 PASS / 0 FAIL; thirteen prior gates unmoved.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push origin main
H=$(git rev-parse --short HEAD)
sed -i "s/commit stamped below/commit \`$H\`/" docs/plans/phase-0.0.12-steering-module.md
git add docs/plans && git commit -m "phase 0.0.12 record stamped — $H

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push origin main
```

## Acceptance

- Step 2 and step 3 wc -c and sha256 lines match exactly.
- Step 5: `steering-test: 12 PASS / 0 FAIL` then `steering-test PASS`, exit 0, and an `ok` line in `.superpowers/gates.log`.
- Step 6: every prior gate prints its pinned tail unchanged.
- Step 7's three records flipped, riding the landing commit.
- Push accepted by origin.

## Report

Read-confirmation first, then one line of outcome, then bullets: the gate's count line and verdict line verbatim, both wc -c lines, both sha256 lines, every prior-gate tail, both commit hashes (landing and stamp), the push results. Every nonconformity its own labeled bullet. Fixture seeds: none — seedless arithmetic; no seed is special.
