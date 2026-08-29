// games/old-master/grip.js — OM-2: GRIP. The grapple module's rope law
// mounted on the master's hand. The grapple is a plane law; the war's
// ground plane (x, z) rides it as the grapple's (x, y), heights stay the
// engine's. The line is invisible will: seize is the bite, holding is the
// taut constraint, reeling is the winch, the 260 snap is the grip ceiling,
// and the strain account is the audible effort. New game law, said
// plainly: the hurl is a fixed impulse dial (GRIP.hurlJ) along the aim,
// applied on release — mass decides how far anything flies; it is not the
// grapple's yank and it cannot snap, because the line is already letting
// go as it throws.
import { bite, stepRope } from "../../modules/grapple/grapple.js";

export const GRIP = {
  range: 45,     // how far the will reaches, meters
  seizeR: 6,     // how close to the reticle a body must be
  will: 30,      // the master's rope-end mass — a LABELED GAME DIAL, not his body
                 // mass: with the rope's own 260 snap and the winch's 8 u/s,
                 // will 30 sets the grip ceiling near 487 kg — stones and
                 // troopers grip, armor and the walker part the line
  hurlJ: 600,    // the throw impulse, kg·m/s — a 25 kg crate leaves at 24 m/s, the walker shrugs
};

// pickTarget(world, hero, ax, az) -> the nearest live, massed body to the
// aim point, never the master, inside seizeR of the aim and range of the
// hand. Ties break by world seq, the engine's own deterministic order.
export function pickTarget(world, hero, ax, az) {
  let best = null, bd = GRIP.seizeR;
  for (const b of world.bodies) {
    if (!b.alive || b === hero || !(b.mass > 0) || !(b.invM > 0)) continue;
    const dAim = Math.hypot(b.pos.x - ax, b.pos.z - az);
    if (dAim >= bd) continue;
    if (Math.hypot(b.pos.x - hero.pos.x, b.pos.z - hero.pos.z) > GRIP.range) continue;
    bd = dAim; best = b;
  }
  return best;
}

// seize(hero, target) -> the grip: the grapple's bite, reeling from the
// first tick — the hand closes and pulls.
export function seize(hero, target) {
  const g = bite({});
  g.state = 'reel';
  return { g, target };
}

// stepGrip(grip, hero, dt) -> { snapped, J, dist }. One rope step on the
// ground plane: the master is the ship (no hull spin — the will has no
// lever arm), the seized body the target, both ends pulled by their
// masses, positions split by the no-stretch law. A snap drops the grip.
export function stepGrip(grip, hero, dt) {
  const t = grip.target;
  if (!t.alive || !hero.alive) return { snapped: false, J: 0, dist: 0, dead: true };
  const ship = { x: hero.pos.x, y: hero.pos.z, vx: hero.v.x, vy: hero.v.z, w: 0, M: GRIP.will, I: 1e9 };
  const tgt = { x: t.pos.x, y: t.pos.z, vx: t.v.x, vy: t.v.z };
  const r = stepRope(grip.g, ship, ship.x, ship.y, tgt, t.mass, dt);
  hero.v.x = ship.vx; hero.v.z = ship.vy;
  hero.pos.x = ship.x; hero.pos.z = ship.y;
  t.v.x = tgt.vx; t.v.z = tgt.vy;
  t.pos.x = tgt.x; t.pos.z = tgt.y;
  hero.sleeping = false; t.sleeping = false; t.sleepT = 0;
  const dist = Math.hypot(t.pos.x - hero.pos.x, t.pos.z - hero.pos.z);
  return { snapped: r.snapped, J: r.J, dist, dead: false };
}

// hurl(grip, hero, ax, az) -> the release throw: the fixed impulse along
// the hand-to-aim direction, then the grip is gone. Returns the speed the
// body left at.
export function hurl(grip, hero, ax, az) {
  const t = grip.target;
  if (!t.alive) return 0;
  let dx = ax - hero.pos.x, dz = az - hero.pos.z;
  const l = Math.hypot(dx, dz);
  if (l < 1e-6) { dx = 1; dz = 0; } else { dx /= l; dz /= l; }
  const dv = GRIP.hurlJ / t.mass;
  t.v.x += dx * dv; t.v.z += dz * dv;
  t.sleeping = false; t.sleepT = 0;
  t.lastPlayerTouch = 0;
  return dv;
}

// strain(grip) -> the grapple's tear account, the audible grip effort.
export function strain(grip) { return grip.g.tear || 0; }
