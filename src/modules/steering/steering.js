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
