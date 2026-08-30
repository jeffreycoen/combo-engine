// games/frostline/cover.js — FROSTLINE's cover read and hit estimate.
// Cover is geometry: the same solids and terrain the live rounds fly
// through, sampled with the engine's own primitives (solidBlocksPoint,
// scatterSigma, accuracy.js). The displayed number is an ESTIMATE built
// from the facts the sim actually uses — never a rule the sim obeys; the
// rounds stay physical.
import { scatterSigma } from "../../depot/accuracy.js";
import { seenAt } from "../../depot/sight.js";
import { INFANTRY_ARMS } from "../../depot/specs.js";

// The silhouette: three heights of a standing man above his ground.
const SILHOUETTE = [0.35, 1.0, 1.65];
const SEG_SAMPLES = 8;
const SOLID_KINDS = new Set(["rock", "wall", "tower", "tree", "chunk"]);

// segBoxT(m, tx, ty, tz, b): exact segment-against-box slab test — thin
// walls never slip between samples (the trial's own finding: point samples
// 1.15 m apart stepped clean over a 0.4 m wall).
function segBoxT(m, tx, ty, tz, b) {
  const dx = tx - m.x, dy = ty - m.y, dz = tz - m.z;
  let t0 = 0.08, t1 = 0.95;
  const axes = [[m.x, dx, b.pos.x, b.hx], [m.y, dy, b.pos.y, b.hy], [m.z, dz, b.pos.z, b.hz]];
  for (const [o, d, c, h] of axes) {
    if (d > -1e-9 && d < 1e-9) { if (Math.abs(o - c) > h) return false; continue; }
    let a = (c - h - o) / d, bb = (c + h - o) / d;
    if (a > bb) { const tmp = a; a = bb; bb = tmp; }
    if (a > t0) t0 = a;
    if (bb < t1) t1 = bb;
    if (t0 > t1) return false;
  }
  return true;
}

// lineBlocked(world, muzzle, tx, ty, tz): the shield's ray, one silhouette
// height — exact against static solids, sampled against terrain.
function lineBlocked(world, m, tx, ty, tz, selfId) {
  for (let k = 1; k <= SEG_SAMPLES; k++) {
    const t = 0.12 + (k / SEG_SAMPLES) * 0.82;
    const sx = m.x + (tx - m.x) * t, sy = m.y + (ty - m.y) * t, sz = m.z + (tz - m.z) * t;
    if (world.field.heightAt(sx, sz) > sy + 0.15) return true;
  }
  for (const b of world.bodies) {
    if (!b.alive || (selfId != null && b.id === selfId)) continue;
    if (!SOLID_KINDS.has(b.kind)) continue;
    if (b.invM > 0 && b.kind !== "chunk" && b.kind !== "tree") continue;
    if (segBoxT(m, tx, ty, tz, b)) return true;
  }
  return false;
}

// exposure(world, muzzle, x, z, selfId) -> fraction of the silhouette the
// threat can reach, 0..1 in thirds.
export function exposure(world, m, x, z, selfId) {
  const gy = world.field.heightAt(x, z);
  let open = 0;
  for (const h of SILHOUETTE) if (!lineBlocked(world, m, x, gy + h, z, selfId)) open++;
  return open / SILHOUETTE.length;
}

// coverAt(world, muzzle, x, z) -> "open" | "half" | "full" — the shield.
export function coverAt(world, m, x, z, selfId) {
  const e = exposure(world, m, x, z, selfId);
  if (e >= 0.99) return "open";
  if (e > 0.01) return "half";
  return "full";
}

// knownThreats(war) -> living enemy units the player side has actually seen
// (the sight map, canonical coordinates through map.invW — never world).
export function knownThreats(war) {
  const out = [];
  const sight = war.T.sight;
  if (!sight) return out;
  for (const b of war.world.bodies) {
    if (b.kind !== "unit" || !b.alive || b.team !== 2) continue;
    const c = war.map.invW(b.pos.x, b.pos.z);
    if (seenAt(sight, c.u, c.v, 1)) out.push(b);
  }
  return out;
}

// muzzleOf(world, b) -> the firing point convention: chest height.
export function muzzleOf(world, b) {
  return { x: b.pos.x, y: b.pos.y + 0.4, z: b.pos.z };
}

// destShield(war, x, z) -> the worst shield at a point against every known
// threat — what the move confirmation shows. No threats seen: "open" is
// honest and unlabeled danger is none.
export function destShield(war, x, z) {
  const threats = knownThreats(war);
  if (!threats.length) return "open";
  let worst = 1;
  for (const t of threats) {
    const e = exposure(war.world, muzzleOf(war.world, t), x, z, t.id);
    if (e < worst) worst = e;
  }
  if (worst >= 0.99) return "open";
  if (worst > 0.01) return "half";
  return "full";
}

// erf approximation (Abramowitz-Stegun 7.1.26), for the aim-cone integral.
function erf(v) {
  const s = v < 0 ? -1 : 1, a = Math.abs(v);
  const t = 1 / (1 + 0.3275911 * a);
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-a * a);
  return s * y;
}

// hitChance(war, shooter, target, armsRow) -> 0..1 estimate: the engine's
// own scatterSigma (range, elevation, grazing cover, bracing) makes the
// cone; the target's half-width against the lateral spread at that range
// makes the geometry; the silhouette exposure scales what the cone can
// touch. Clamped to [0.02, 0.98] — war never promises certainty.
export function hitChance(war, shooter, target, armsRow) {
  const spec = armsRow || INFANTRY_ARMS.rifles;
  const m = muzzleOf(war.world, shooter);
  const aim = { x: target.pos.x, y: target.pos.y + 0.3, z: target.pos.z };
  const dist = Math.hypot(aim.x - m.x, aim.z - m.z);
  if (dist < 0.5) return 0.98;
  const sigma = scatterSigma(war.world, m, aim, spec);
  const lateral = Math.max(1e-6, sigma * dist);
  const pGeom = erf((target.hx || 0.28) / (lateral * Math.SQRT2));
  const e = exposure(war.world, m, target.pos.x, target.pos.z, shooter.id);
  return Math.min(0.98, Math.max(0.02, pGeom * e));
}
