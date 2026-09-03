// src/depot/territory.js — who holds the ground. Deterministic, rng-free.
// Cells: 2m over the playable extent (reuse the rim halfU/halfV extents).
export function makeTerritory(halfU, halfV) {
  const cs = 2, nx = Math.ceil((halfU * 2) / cs), nz = Math.ceil((halfV * 2) / cs);
  return { cs, nx, nz, halfU, halfV, v: new Float32Array(nx * nz) }; // v: -1 (red) .. +1 (green)
}
export const DECAY_TAU = 75;        // s — slow revert (Jeff)
export const EMIT = {               // influence/s at the emitter cell, falling linearly to 0 at r
  // wall.r bumped 4 -> 9 (Task 5 probe re-check): under the build-rights
  // rule a wall's own footprint must reach the NEXT build slot behind it for
  // a defensive line to be buildable at all — 4m left field-reach gaps of
  // ~6-7m between a chokepoint wall and the tower row behind it, so median/
  // strong defenses could never actually build past their wall line. 9m
  // (matching tower.r) closes those gaps; see docs plan Task 5 results.
  // depot.r doubled 18 -> 36 (Task 3, Jeff): the starting zone reads as a
  // homeland, not a footprint — anchor stays r 14, the attacker's muster
  // ground is a strip, not doubled (probe re-check in Task 6 validates).
  depot: { w: 2.4, r: 36 }, tower: { w: 1.2, r: 9 }, wall: { w: 0.5, r: 9 },
  unit: { w: 0.6, r: 5 }, vehicle: { w: 0.9, r: 7 },
  anchor: { w: 2.4, r: 14 },        // attacker spawn edge, permanent red
};

// world (x, z) -> cell (ix, iz), origin at (-halfU, -halfV)
function cellOf(T, x, z) {
  const ix = Math.floor((x + T.halfU) / T.cs);
  const iz = Math.floor((z + T.halfV) / T.cs);
  return { ix, iz };
}

export function stepTerritory(T, emitters, dt) {
  const { v, nx, nz, cs } = T;
  // decay toward 0 — exponential, factor exp(-dt/τ); half-life = τ·ln2 ≈ 52s at τ=75.
  const decay = Math.exp(-dt / DECAY_TAU);
  for (let i = 0; i < v.length; i++) v[i] *= decay;

  for (const e of emitters) {
    const { x, z, w, r, sign } = e;
    if (!(r > 0) || w === 0) continue;
    const { ix: cx, iz: cz } = cellOf(T, x, z);
    const cellR = Math.ceil(r / cs);
    const izLo = Math.max(0, cz - cellR), izHi = Math.min(nz - 1, cz + cellR);
    const ixLo = Math.max(0, cx - cellR), ixHi = Math.min(nx - 1, cx + cellR);
    for (let iz = izLo; iz <= izHi; iz++) {
      for (let ix = ixLo; ix <= ixHi; ix++) {
        // center of this cell in world space
        const wx = -T.halfU + (ix + 0.5) * cs;
        const wz = -T.halfV + (iz + 0.5) * cs;
        const dx = wx - x, dz = wz - z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist > r) continue;
        const contrib = sign * w * dt * Math.max(0, 1 - dist / r);
        const idx = iz * nx + ix;
        let val = v[idx] + contrib;
        if (val > 1) val = 1;
        else if (val < -1) val = -1;
        v[idx] = val;
      }
    }
  }
}

export function holderAt(T, x, z) {
  const { ix, iz } = cellOf(T, x, z);
  if (ix < 0 || ix >= T.nx || iz < 0 || iz >= T.nz) return 0; // out of bounds -> neutral
  const val = T.v[iz * T.nx + ix];
  if (val > 0.15) return 1;
  if (val < -0.15) return 2;
  return 0;
}

// fogStateFor: the SAME field, read from either side. team 1 (the player)
// reads the raw value (positive = held); team 2 (the attacker) reads it
// sign-flipped, so "their" held ground is where the field runs negative.
// This is the one gate both towers (DepotGame.jsx's stepTowers) and enemy
// shooters (units.js's stepRifleman/stepGrenadier, drivers.js's tank) call — a target
// is acquirable only where the acquiring side's own field reaches it.
export function fogStateFor(T, x, z, team) {
  const { ix, iz } = cellOf(T, x, z);
  if (ix < 0 || ix >= T.nx || iz < 0 || iz >= T.nz) return "unheld"; // out of bounds -> neutral/unheld
  let val = T.v[iz * T.nx + ix];
  if (team === 2) val = -val;
  if (val > 0.15) return "held";
  if (val >= -0.15) return "seam";
  return "unheld";
}
export function fogStateAt(T, x, z) { return fogStateFor(T, x, z, 1); }

// fogStateForContested is GONE (mk0.72, VISION Task 2). It was the F1.6
// bridge: while targeting rode ground control, each side's own emission made
// its own ground "unheld" for the other, so men standing at contact were
// mutually weapon-proof, and one cell of grace across the boundary papered
// over it. Targeting is sight now (state.js's fieldReaches -> sight.js), so
// there is no boundary to paper over — men at contact see each other.
// Everything below and above still serves OWNERSHIP, which sight did not
// replace: the ground wash, the fog tint and build rights are unchanged.

// valueAt: the RAW field value (-1..+1, unflipped — always the player's
// sign convention) at a world/canonical (x,z). Used by the renderer's area
// wash (Task 3), which needs continuous field strength for its alpha ramp,
// not just the tri-state holderAt/fogStateFor bucket.
export function valueAt(T, x, z) {
  const { ix, iz } = cellOf(T, x, z);
  if (ix < 0 || ix >= T.nx || iz < 0 || iz >= T.nz) return 0;
  return T.v[iz * T.nx + ix];
}

// canBuild: ground rights for placement (towers AND walls) — green only.
export function canBuild(T, x, z) { return holderAt(T, x, z) === 1; }
// P7.1 T7: the same rights, either side — his engineers build on HIS ground.
export function canBuildFor(T, x, z, team) { return holderAt(T, x, z) === team; }
