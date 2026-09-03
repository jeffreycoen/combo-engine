// COLDSNAP DEPOT — sight.js: who sees what. Pure geometry, zero rng draws.
// A side's sight is the union of what its eyes see. An eye is a raised point
// on a living body; a spot is seen if a straight line from the eye to the
// spot (at man height) clears the terrain and every solid thing in between.
// Elevation is the whole trick: a higher eye's line passes over low cover.
//
// mk0.71 — THE FAST EYE. mk0.70's ray asked every body in the world at every
// step of every sight line: the cost probe measured 2,284ms per recompute
// against a 4ms budget. The world is now swept ONCE per recompute into two
// flat maps over the sight grid — the ground's height per cell, and the top
// of the tallest solid standing in the cell — and a sight line marches cell
// by cell reading two numbers per step, touching no body at all. Blocking is
// therefore MAP-RESOLUTION: a solid blocks its whole 2m cell. That is coarser
// than mk0.70's exact box test, still deterministic, and the accepted trade
// (Vision plan, Task 1b).

// How far each kind of eye sees (meters). Wider than any gun it guides —
// a gun must never out-range its own eyes. // all provisional (F5)
export const SIGHT = {
  unit: 24,        // any infantryman, either side
  sniper: 40,      // a marksman's scope (u.tag or u.role "sniper")
  spotter: 46,     // the binoculars — the pair's whole point (u.role)
  vehicle: 36,     // tank commander, above ENEMY_FIRE.tank.range 34
  tower: 32,       // tall — covers every tower gun's range
  flag: 36,        // the depot garrison, watching from the yard
  mech: 40,        // the crown's tall eye // provisional (F5)
};
// The eye sits above the body: a man's eyes, a tower's top, the banner.
export function eyeOf(b) {
  if (b.kind === "tower") return { x: b.pos.x, y: b.pos.y + b.hy + 0.45, z: b.pos.z, r: SIGHT.tower };
  if (b.kind === "flag")  return { x: b.pos.x, y: b.pos.y + 4.0, z: b.pos.z, r: SIGHT.flag };
  if (b.kind === "mech") return { x: b.pos.x, y: b.pos.y + 2.6, z: b.pos.z, r: SIGHT.mech };
  if (b.kind === "vehicle") return { x: b.pos.x, y: b.pos.y + 1.4, z: b.pos.z, r: SIGHT.vehicle };
  const r = b.role === "spotter" ? SIGHT.spotter
          : (b.role === "sniper" || b.tag === "sniper") ? SIGHT.sniper : SIGHT.unit;
  return { x: b.pos.x, y: b.pos.y + 0.8, z: b.pos.z, r }; // mk2.02: the 2m man's eye — 1.8m over his feet
}
// TARGET_H: a spot is "seen" at man height, not at the dirt — the same 1.2m
// convention the reach preview uses (accuracy.js TARGET_H).
export const SIGHT_TARGET_H = 1.2;

// makeSight(T): the maps over the territory grid.
//   seen1[i]/seen2[i] — 1 where that team sees cell i
//   gnd[i]            — the ground's height at cell i's center
//   occ[i]            — the top of the tallest solid standing in cell i
//                       (-Infinity when the cell holds none)
// All derived state: never saved, rebuilt on resume by the first recompute.
export function makeSight(T) {
  return { nx: T.nx, nz: T.nz, cs: T.cs, halfU: T.halfU, halfV: T.halfV,
           seen1: new Uint8Array(T.nx * T.nz), seen2: new Uint8Array(T.nx * T.nz),
           gnd: new Float32Array(T.nx * T.nz), occ: new Float32Array(T.nx * T.nz) };
}
export function seenAt(SG, x, z, team) {
  const ix = Math.floor((x + SG.halfU) / SG.cs), iz = Math.floor((z + SG.halfV) / SG.cs);
  if (ix < 0 || ix >= SG.nx || iz < 0 || iz >= SG.nz) return false;
  return (team === 2 ? SG.seen2 : SG.seen1)[iz * SG.nx + ix] === 1;
}

// The static-solid kind/mobility rule, mirrored from accuracy.js's
// solidBlocksPoint: masonry chunks and trees block even though physics lets
// them move; everything else must be immovable to block. Units and vehicles
// are never in the set, so men never blind each other.
const SOLID = new Set(["rock", "wall", "tower", "tree", "chunk"]);
// fillMaps: one sweep of the world into gnd/occ. gnd is refilled every
// recompute too (terrain only re-carves on craters, but the fill is cheap and
// always true); occ must be, because walls fall and rubble moves.
export function fillMaps(world, SG, toUV, toWorld) {
  for (let iz = 0; iz < SG.nz; iz++) for (let ix = 0; ix < SG.nx; ix++) {
    const w = toWorld(-SG.halfU + (ix + 0.5) * SG.cs, -SG.halfV + (iz + 0.5) * SG.cs);
    SG.gnd[iz * SG.nx + ix] = world.field.heightAt(w.x, w.z);
  }
  SG.occ.fill(-Infinity);
  for (const b of world.bodies) {
    if (!b.alive || !SOLID.has(b.kind)) continue;
    if (b.invM > 0 && b.kind !== "chunk" && b.kind !== "tree") continue; // solidBlocksPoint's own mobility rule
    const c = toUV(b.pos.x, b.pos.z);
    const rr = Math.max(b.hx, b.hz);                    // conservative footprint under rotation
    const top = b.pos.y + b.hy;
    const ix0 = Math.max(0, Math.floor((c.u - rr + SG.halfU) / SG.cs));
    const ix1 = Math.min(SG.nx - 1, Math.floor((c.u + rr + SG.halfU) / SG.cs));
    const iz0 = Math.max(0, Math.floor((c.v - rr + SG.halfV) / SG.cs));
    const iz1 = Math.min(SG.nz - 1, Math.floor((c.v + rr + SG.halfV) / SG.cs));
    for (let iz = iz0; iz <= iz1; iz++) for (let ix = ix0; ix <= ix1; ix++) {
      const i = iz * SG.nx + ix;
      if (top > SG.occ[i]) SG.occ[i] = top;
    }
  }
}

// gridEye(SG, e, toUV): the eye placed in the grid's own frame — canonical
// meters (u, v) plus the cell indices (iu, iv) every march starts from,
// computed once per eye instead of once per cell tested.
export function gridEye(SG, e, toUV) {
  const c = toUV(e.x, e.z);
  return { u: c.u, v: c.v, y: e.y, r: e.r, selfId: e.selfId,
           iu: Math.floor((c.u + SG.halfU) / SG.cs), iv: Math.floor((c.v + SG.halfV) / SG.cs) };
}

// canSee(SG, eye, tu, tv): can this eye see the center of cell (tu, tv)?
// Marches the index-space line, longest axis stepped one cell at a time, and
// compares the line's height against the ground and the tallest solid in each
// intermediate cell. The eye's own cell and the target's own cell are never
// tested — an eye is not blocked by the wall it stands on, and a target is
// seen AT its cell, not through it.
export function canSee(SG, eye, tu, tv) {
  const du = tu - eye.iu, dv = tv - eye.iv;
  const n = Math.max(Math.abs(du), Math.abs(dv));
  if (n * SG.cs > eye.r + SG.cs) return false;          // coarse reject, in cells
  const cu = -SG.halfU + (tu + 0.5) * SG.cs, cv = -SG.halfV + (tv + 0.5) * SG.cs;
  if (Math.hypot(cu - eye.u, cv - eye.v) > eye.r) return false;   // the true reach, in meters
  // mk2.57 (owner): THE LIT ROOF — an occupied cell is seen at its SURFACE.
  // The old law tested the ground under the building (always walled off by
  // the building itself), so every roof was dark and the possessed reticle
  // stopped at the wall's base while the owner looked straight at the roof.
  // Now the eye tests to the surface the reticle would rest on (sight.js
  // surfaceAt's own rule: a solid's top when one stands there, the ground
  // otherwise) plus the same man-height allowance either way. Honest line
  // of sight is kept: ground hidden BEHIND a building stays dark, and a big
  // roof lights only as far as the eye can truly see over its near rim.
  const ti = tv * SG.nx + tu;
  const ty = (SG.occ[ti] > SG.gnd[ti] ? SG.occ[ti] : SG.gnd[ti]) + SIGHT_TARGET_H;
  for (let k = 1; k < n; k++) {
    const t = k / n;
    // clamped: an eye shoved past the rim would otherwise round to a negative
    // column and read the previous row's cells.
    const iu = Math.min(SG.nx - 1, Math.max(0, Math.round(eye.iu + du * t)));
    const iv = Math.min(SG.nz - 1, Math.max(0, Math.round(eye.iv + dv * t)));
    const i = iv * SG.nx + iu;
    const y = eye.y + (ty - eye.y) * t;
    if (SG.gnd[i] > y || SG.occ[i] > y) return false;
  }
  return true;
}

// stepSight(world, SG, toUV, toWorld): full recompute — sweep the maps, then
// light every cell each side's eyes can reach. Deterministic: bodies iterate
// in world order, no dice. toUV/toWorld are DEPOT's own world<->canonical
// transforms (invW/fwdU), passed in like everywhere else.
export function stepSight(world, SG, toUV, toWorld) {
  SG.seen1.fill(0); SG.seen2.fill(0);
  fillMaps(world, SG, toUV, toWorld);
  // one eye per occupied cell per team — the tallest wins the cell
  const eyes1 = new Map(), eyes2 = new Map();
  for (const b of world.bodies) {
    if (!b.alive) continue;
    const isEye = b.kind === "unit" || b.kind === "vehicle" || b.kind === "tower" || b.kind === "flag";
    if (!isEye || (b.team !== 1 && b.team !== 2)) continue;
    if (b.riding) continue; // P7 T4: the hold is sealed — a rider is not an eye; the APC is
    const raw = eyeOf(b); raw.selfId = b.id;
    const e = gridEye(SG, raw, toUV);
    const key = e.iv * SG.nx + e.iu;
    const m = b.team === 2 ? eyes2 : eyes1;
    const prev = m.get(key);
    if (!prev || e.y > prev.y) m.set(key, e);
  }
  const sweep = (eyes, seen) => {
    for (const e of eyes.values()) {
      const cellR = Math.ceil(e.r / SG.cs);
      for (let iz = Math.max(0, e.iv - cellR); iz <= Math.min(SG.nz - 1, e.iv + cellR); iz++) {
        for (let ix = Math.max(0, e.iu - cellR); ix <= Math.min(SG.nx - 1, e.iu + cellR); ix++) {
          const i = iz * SG.nx + ix;
          if (seen[i]) continue;                       // another eye already lit it
          if (canSee(SG, e, ix, iz)) seen[i] = 1;
        }
      }
    }
  };
  sweep(eyes1, SG.seen1);
  sweep(eyes2, SG.seen2);
}

// POSSESSION T4/T5 (mk0.93/0.94): THE CARRIED RETICLE. The right stick
// steers an OFFSET from the possessed unit — deflection is velocity, the
// offset holds on release, and walking carries the reticle with the unit.
// It can only exist inside the unit's own sight circle on ground the side
// currently sees: dark ground stops the steer dead, and ground that goes
// dark under a carried reticle drops it home to the unit's own cell. Pure
// functions: the game layer owns the state, these own the rules.
export const RETICLE_SPEED = 14;   // m/s at full tilt // provisional (F5)
export function steerReticle(SG, team, center, radius, off, vx, vz, dt, toUV) {
  let dx = off.dx + vx * RETICLE_SPEED * dt, dz = off.dz + vz * RETICLE_SPEED * dt;
  const d = Math.hypot(dx, dz);
  if (d > radius && d > 1e-9) { dx *= radius / d; dz *= radius / d; }
  // mk2.58 (owner): THE COMMANDER'S EYE — the possessed reticle is the
  // player's own sight; it roams the whole circle, dark ground included.
  // The radius clamp above is the only law left here.
  return { dx, dz };
}
export function reclampReticle(SG, team, center, radius, off, toUV) {
  let dx = off.dx, dz = off.dz;
  const d = Math.hypot(dx, dz);
  if (d > radius && d > 1e-9) { dx *= radius / d; dz *= radius / d; }
  return { dx, dz }; // mk2.58 (owner): THE COMMANDER'S EYE — no dark-ground home; the circle is the only law
}

// mk2.01: THE SURFACE LAW. What the reticle rests on is what the guns aim
// at: a solid's top when it sits on one (rooftops, wall tops), the ground
// otherwise. Nothing clamps the steer any more — the landing predictor
// (accuracy.js) shows where the shot truly ends. Pure, zero draws.
export function surfaceAt(SG, x, z, toUV) {
  const c = toUV(x, z);
  const ix = Math.floor((c.u + SG.halfU) / SG.cs), iz = Math.floor((c.v + SG.halfV) / SG.cs);
  if (ix < 0 || ix >= SG.nx || iz < 0 || iz >= SG.nz) return { y: 0, solid: false };
  const i = iz * SG.nx + ix;
  return SG.occ[i] > SG.gnd[i] ? { y: SG.occ[i], solid: true } : { y: SG.gnd[i], solid: false };
}
