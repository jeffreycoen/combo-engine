// COLDSNAP DEPOT — mines.js (P7 T10): watched points, never bodies. The
// TRIGGER is the protection (owner, 2026-08-17): a device fires only on an
// other-team crosser — but a tripped blast is a blast, anyone in the area,
// both sides, through the engine's own explode.
import { explode, addBody } from "../engine/core.js";
export const MINE_TRIG = 1.4, WIRE_TRIG = 1.0, FLARE_S = 6;          // provisional (F5)
export const MINE_BLAST = { r: 3.4, kv: 20, dmg: 90, crater: 0.4 };  // a real blast — anyone in the area (owner) // provisional (F5)
export const WIRE_BLAST = { r: 2.2, kv: 3, dmg: 25, crater: 0 };     // the small charge // provisional (F5)
export const MINE_COST = 6, WIRE_COST = 4;                            // provisional (F5)
export function stepMines(world, mines) {
  // 4 Hz caller cadence. Deterministic order; zero draws.
  for (const m of mines) {
    if (!m.live) continue;
    const trig = m.kind === "wire" ? WIRE_TRIG : MINE_TRIG;
    let hit = null;
    for (const b of world.bodies) {
      if ((b.kind !== "unit" && b.kind !== "vehicle") || !b.alive || b.team === m.team || b.riding) continue;
      if (Math.hypot(b.pos.x - m.x, b.pos.z - m.z) < trig) { hit = b; break; }
    }
    if (!hit) continue;
    m.live = false;
    const gy = world.field.heightAt(m.x, m.z);
    const attacker = m.team === 1 ? "player" : "enemy";
    if (m.kind === "mine") {
      // the trigger was the protection; the blast is a blast (owner, 2026-08-17)
      explode(world, m.x, gy + 0.2, m.z, { ...MINE_BLAST, attacker });
    } else {
      world.events.push({ type: "flare", x: m.x, z: m.z });
      const eye = addBody(world, { kind: "flag", team: m.team, mass: 0, hx: 0.05, hy: 0.05, hz: 0.05, x: m.x, y: gy + 2.5, z: m.z });
      eye.sleeping = true; eye._dieT = world.t + FLARE_S;   // an eye, not a banner: no flagPole, nothing draws
      explode(world, m.x, gy + 0.2, m.z, { ...WIRE_BLAST, attacker });
    }
  }
  // spent flares burn out
  for (let i = world.bodies.length - 1; i >= 0; i--) {
    const b = world.bodies[i];
    if (b.kind === "flag" && b._dieT != null && world.t >= b._dieT) { world.byId.delete(b.id); world.bodies.splice(i, 1); }
  }
}
export function minePrices(counts, priced) { return { mine: priced(MINE_COST, "mine", counts), wire: priced(WIRE_COST, "wire", counts) }; }

// P7 T10 DEVIATION (named, mirrors the P7 T8 precedent — ferryDecide/
// flankDrop in ai.js): the enemy seeding decision and its placement pick are
// factored into pure functions here so they are directly testable without a
// live DepotGame closure (the plan's own Step 1(d) assert needs behavior,
// not just source shape). ringBell (DepotGame.jsx) still draws both rolls
// unconditionally every bell and still builds the candidate list itself
// (PASSES + territory seam sampling — both closure-scoped, game-layer only);
// it just calls these two instead of inlining the gate/stride math.
export function mineSeedRoll(mineRoll, hasSapper, scrap, price3) {
  return mineRoll < 0.5 && hasSapper && scrap >= price3;   // provisional (F5)
}
export function mineSeedPlace(cands, placeRoll) {
  if (!cands || cands.length < 3) return [];
  const stride = Math.max(1, Math.floor(cands.length / 3));
  const start = Math.min(cands.length - 1, Math.floor(placeRoll * cands.length));
  const out = [];
  for (let k = 0; k < 3; k++) out.push(cands[(start + k * stride) % cands.length]);
  return out;
}
