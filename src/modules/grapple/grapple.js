// modules/grapple — the grapple rope, a SHAPED lift from the deadweight
// demo (deadweight-hangar.html lines 1781-1936). The LAW is the demo's,
// carried exactly and cited by line; the CODE differs only in that the
// demo's game entities become arguments: the ship is any body with
// {x, y, vx, vy, w, M, I}, the target any body with {x, y, vx, vy} plus its
// mass, the anchor a point the caller supplies, and gravity a callback.
// What the head bites and what a torn weld yields stay with the game. The
// law:
//   - one line at a time; the tap grammar is fly -> rewind, stuck -> reel,
//     reel -> cut (1785-1789);
//   - the cast leaves 2.2 ahead of the anchor at 34 u/s plus ship velocity,
//     and the ship pays the recoil J = 0.15 * 34 with its torque arm
//     (1790-1797);
//   - a cast spends past range 95 or 5 seconds and rewinds home at 44,
//     rearming within 2.5 (1806-1825); an adrift or embedded head is
//     recovered within 3 of the ship (1826-1839);
//   - the rope: rest length set at the bite; slack inside it; BEYOND it a
//     constraint, not a spring — the anchor's velocity rides the hull's
//     spin, the radial separation rate against the winch's demand (reeling
//     asks 8 u/s of closing) is killed by an impulse J = rel * mu with mu
//     the reduced mass M*tm/(M+tm), applied to BOTH ends and as torque at
//     the mount (1839-1887);
//   - the first taut moment is THE JERK: J * 1.15, and past 260 the line
//     snaps and the head stays embedded (1871-1875); a yank is one
//     commanded haul J = mu * 22 under the same snap law, eating the slack
//     first (1856-1866);
//   - the line does not stretch: the position error splits by inverse mass
//     (1884-1886);
//   - reeling shortens the rest length 8 u/s to a floor of 4 (1854);
//   - strain: reeling against a bite adds J to the tear account, a yank
//     adds 0.6 J, slack bleeds it at 60 u/s (1866, 1882, 1887) — what tears
//     at what number is the game's ruling, the account is the module's.

export const GRAP_V0 = 34;
export const GRAP_RECOIL = 0.15;
export const GRAP_RANGE = 95;
export const GRAP_TIME = 5;
export const GRAP_REWIND = 44;
export const GRAP_HOME = 2.5;
export const GRAP_RECOVER = 3;
export const GRAP_REEL = 8;
export const GRAP_REST_MIN = 4;
export const GRAP_CLOSE = 8;
export const GRAP_JERK = 1.15;
export const GRAP_SNAP = 260;
export const GRAP_YANK = 22;
export const GRAP_YANK_TEAR = 0.6;
export const GRAP_TEAR_BLEED = 60;

// castGrapple: the head leaves the anchor and the ship pays the recoil
// (demo 1790-1797). arm is the anchor's lever against the hull's centre.
export function castGrapple(ship, ax, ay, armY) {
  const c = Math.cos(ship.ang), s2 = Math.sin(ship.ang);
  const g = {
    x: ax + c * 2.2, y: ay + s2 * 2.2,
    vx: ship.vx + c * GRAP_V0, vy: ship.vy + s2 * GRAP_V0,
    state: 'fly', t: 0, tension: 0,
  };
  const J = GRAP_RECOIL * GRAP_V0;
  ship.vx -= c * J / ship.M; ship.vy -= s2 * J / ship.M;
  ship.w -= armY * J / ship.I;
  return g;
}

// tapGrapple: the demo's tap grammar (1785-1789). Returns the grapple, or
// null when the tap cuts the line.
export function tapGrapple(g) {
  if (g.state === 'fly') { g.state = 'rewind'; return g; }
  if (g.state === 'stuck') { g.state = 'reel'; return g; }
  if (g.state === 'reel') return null;
  return g;
}

// bite: the head takes hold — rest length is set on first taut (1852).
export function bite(g) {
  g.state = 'stuck'; g.taut = false; g.tear = 0; g.restLen = undefined;
  return g;
}

// stepFly: ballistic head; spent past range or time, it rewinds (1806-1819).
export function stepFly(g, accelFn, ax, ay, dt) {
  g.t += dt;
  const [gax, gay] = accelFn(g.x, g.y);
  g.vx += gax * dt; g.vy += gay * dt; g.x += g.vx * dt; g.y += g.vy * dt;
  if (Math.hypot(g.x - ax, g.y - ay) > GRAP_RANGE || g.t > GRAP_TIME) g.state = 'rewind';
  return g;
}

// stepRewind: the winch brings the head home at 44; within 2.5 the line is
// home and armed again (1820-1825). Returns null when home.
export function stepRewind(g, ax, ay, dt) {
  const dx = ax - g.x, dy = ay - g.y, dd = Math.hypot(dx, dy) || 1;
  g.vx = dx / dd * GRAP_REWIND; g.vy = dy / dd * GRAP_REWIND;
  g.x += g.vx * dt; g.y += g.vy * dt;
  return dd < GRAP_HOME ? null : g;
}

// stepAdrift: a loose head coasts under gravity; fly to it and it is
// recovered within 3 (1826-1831). Returns null when recovered.
export function stepAdrift(g, accelFn, sx, sy, dt) {
  const [gax, gay] = accelFn(g.x, g.y);
  g.vx += gax * dt; g.vy += gay * dt; g.x += g.vx * dt; g.y += g.vy * dt;
  return Math.hypot(g.x - sx, g.y - sy) < GRAP_RECOVER ? null : g;
}

// stepEmbedded: a snapped head rides its target; recover within 3 of the
// ship (1832-1839). Returns null when recovered.
export function stepEmbedded(g, tgt, sx, sy) {
  g.x = tgt.x; g.y = tgt.y; g.vx = tgt.vx || 0; g.vy = tgt.vy || 0;
  return Math.hypot(g.x - sx, g.y - sy) < GRAP_RECOVER ? null : g;
}

export function requestYank(g) { g.yankReq = true; return g; }

// stepRope: the taut law (demo 1839-1887) — yank, constraint impulse with
// the jerk and the snap, the no-stretch position split, the strain account.
// ship: {x, y, vx, vy, w, M, I}; tgt: {x, y, vx, vy}; tm: target mass;
// ax, ay: the anchor point on the hull. Returns what happened.
export function stepRope(g, ship, ax, ay, tgt, tm, dt) {
  g.x = tgt.x; g.y = tgt.y;
  const dx = tgt.x - ax, dy = tgt.y - ay, dd = Math.hypot(dx, dy) || 1;
  if (g.restLen === undefined) g.restLen = dd;
  if (g.state === 'reel') g.restLen = Math.max(GRAP_REST_MIN, g.restLen - GRAP_REEL * dt);
  const M = ship.M, mu = (M * tm) / (M + tm);
  const rx = ax - ship.x, ry = ay - ship.y;
  const out = { snapped: false, taut: false, J: 0 };
  if (g.yankReq) {
    g.yankReq = false;
    g.restLen = Math.min(g.restLen, dd);
    const nx = dx / dd, ny = dy / dd;
    const J = mu * GRAP_YANK;
    if (J > GRAP_SNAP) {
      g.state = 'embedded'; g.taut = false; g.tear = 0;
      out.snapped = true; return out;
    }
    ship.vx += nx * J / M; ship.vy += ny * J / M;
    ship.w += (rx * ny - ry * nx) * J / ship.I;
    tgt.vx -= nx * J / tm; tgt.vy -= ny * J / tm;
    g.tear = (g.tear || 0) + J * GRAP_YANK_TEAR;
    out.J = J;
  }
  if (dd > g.restLen) {
    const avx = ship.vx - ship.w * ry, avy = ship.vy + ship.w * rx;
    const nx = dx / dd, ny = dy / dd;
    const vrad = (tgt.vx - avx) * nx + (tgt.vy - avy) * ny;
    const want = g.state === 'reel' ? -GRAP_CLOSE : 0;
    const rel = vrad - want;
    if (rel > 0) {
      let J = rel * mu;
      if (!g.taut) {
        J *= GRAP_JERK;
        if (J > GRAP_SNAP) {
          g.state = 'embedded'; g.taut = false; g.tear = 0;
          out.snapped = true; return out;
        }
      }
      ship.vx += nx * J / M; ship.vy += ny * J / M;
      ship.w += (rx * ny - ry * nx) * J / ship.I;
      tgt.vx -= nx * J / tm; tgt.vy -= ny * J / tm;
      if (g.state === 'reel') g.tear = (g.tear || 0) + J;
      out.J += J;
    }
    g.taut = true;
    const err = dd - g.restLen, wS = tm / (M + tm), wT = M / (M + tm);
    const nx2 = dx / dd, ny2 = dy / dd;
    ship.x += nx2 * err * wS; ship.y += ny2 * err * wS;
    tgt.x -= nx2 * err * wT; tgt.y -= ny2 * err * wT;
    out.taut = true;
  } else {
    g.taut = false;
    g.tear = Math.max(0, (g.tear || 0) - GRAP_TEAR_BLEED * dt);
  }
  return out;
}
