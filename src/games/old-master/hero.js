// games/old-master/hero.js — OM-1: the master's body and the walk. One
// figure in the war's world: a unit-kind body the engine grounds, buries,
// and freezes like any other, driven each tick by a plain stick input the
// page supplies. Imports ride the api and the engine surface only.
//
// The hero is not possessed and not rostered: the game steps it BEFORE
// tickWar each tick, so a headless run with no input is bit-stable and a
// taped input stream replays exactly.

import { addBody } from "../../engine/core.js";

// The master's sheet — OM-1 carries only what walking needs. Later phases
// (grip, repulse, staff) add their rows beside it.
export const HERO = {
  mass: 80, hx: 0.28, hy: 1.0, hz: 0.28, hp: 200,
  walk: 6.0,      // meters per second on the flat
  accel: 18.0,    // how hard the legs chase the stick, per second
  floorDmg: 12,   // a single blow this hard breaks his footing
  downS: 1.6,     // seconds the floor owns him before the will stands him up
};

// spawnHero(war, x, z) -> the hero body, standing on the ground at (x, z).
export function spawnHero(war, x, z) {
  const y = war.field.heightAt(x, z) + HERO.hy + 0.2;
  const hero = addBody(war.world, {
    kind: "unit", team: 1, tag: "",
    x, y, z,
    hx: HERO.hx, hy: HERO.hy, hz: HERO.hz,
    mass: HERO.mass, hp: HERO.hp,
  });
  hero.maxHp = HERO.hp;
  hero.omHero = true;
  return hero;
}

// heroInput(): the page's per-tick command for the hero — a world-space
// stick, magnitude 0..1. Headless callers pass this default: no walk.
export function heroInput() {
  return { vx: 0, vz: 0 };
}

// The righting law: THE MASTER DOES NOT FALL OVER — walking, terrain, and
// shoves never floor him; each step his rotation is held to yaw alone and
// his spin zeroed, while the engine keeps owning height and collision.
// EXCEPT: a single blow of floorDmg or more (a real hit, read from his own
// hp ledger) breaks his footing — for downS seconds physics owns him whole,
// he cannot walk, and then the will stands him back up.
function rightHero(hero) {
  const q = hero.q;
  const yaw = Math.atan2(2 * (q.w * q.y + q.x * q.z), 1 - 2 * (q.y * q.y + q.x * q.x));
  q.x = 0; q.z = 0; q.y = Math.sin(yaw / 2); q.w = Math.cos(yaw / 2);
  const l = Math.hypot(q.y, q.w) || 1; q.y /= l; q.w /= l;
  hero.w.x = 0; hero.w.y = 0; hero.w.z = 0;
}

export function heroDown(hero) { return (hero.omDownT || 0) > 0; }

// stepHero(war, hero, input, dt): the walk under the righting law. The
// stick names a desired velocity; the legs chase it at HERO.accel; the
// engine owns gravity, ground, and everything that can go wrong. Call
// BEFORE tickWar.
export function stepHero(war, hero, input, dt) {
  if (!hero.alive) return;
  if (hero.omHpLast === undefined) hero.omHpLast = hero.hp;
  if (hero.omHpLast - hero.hp >= HERO.floorDmg && !(hero.omDownT > 0)) hero.omDownT = HERO.downS;
  hero.omHpLast = hero.hp;
  if (hero.omDownT > 0) {
    hero.omDownT -= dt;
    if (hero.omDownT > 0) return;
    hero.omDownT = 0;
    rightHero(hero);
  }
  rightHero(hero);
  const mag = Math.min(1, Math.hypot(input.vx, input.vz));
  let dx = 0, dz = 0;
  if (mag > 1e-6) { dx = input.vx / Math.hypot(input.vx, input.vz); dz = input.vz / Math.hypot(input.vx, input.vz); }
  const wantX = dx * HERO.walk * mag;
  const wantZ = dz * HERO.walk * mag;
  const k = Math.min(1, HERO.accel * dt);
  hero.v.x += (wantX - hero.v.x) * k;
  hero.v.z += (wantZ - hero.v.z) * k;
  if (mag > 1e-6) hero.sleeping = false;
}
