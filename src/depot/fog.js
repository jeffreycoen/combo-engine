// COLDSNAP DEPOT — fog.js (mk2.09): THE GREEN FOG. The atomic blast leaves
// a poison patch on the crater: radius 6, 4 damage a second to any living
// man inside, both sides, fading out after 25 seconds. Watched points, the
// mines' shape — never bodies, never drawn here. Poison pays and scores
// nobody (attacker "world", the kill law's own rule). Deterministic; zero
// rng draws anywhere in this module.
import { applyDamage } from "../engine/core.js";

export const FOG_R = 6, FOG_DPS = 4, FOG_S = 25; // provisional (F5)

// addFogPatch: a fresh blast on old ground RESTARTS the patch (owner) — any
// patch whose center lies inside the new one is absorbed, never stacked.
export function addFogPatch(list, x, z, t) {
  for (let i = list.length - 1; i >= 0; i--) {
    if (Math.hypot(list[i].x - x, list[i].z - z) < FOG_R) list.splice(i, 1);
  }
  list.push({ x, z, r: FOG_R, until: t + FOG_S });
}

// stepFog: the territory clock's cadence — dt is the caller's step (0.25s).
export function stepFog(world, list, dt) {
  for (let i = list.length - 1; i >= 0; i--) {
    const p = list[i];
    if (world.t >= p.until) { list.splice(i, 1); continue; }
    for (const b of world.bodies) {
      if (b.kind !== "unit" || !b.alive || b.riding) continue;
      if (Math.hypot(b.pos.x - p.x, b.pos.z - p.z) < p.r) applyDamage(world, b, FOG_DPS * dt, { attacker: "world" });
    }
  }
}
