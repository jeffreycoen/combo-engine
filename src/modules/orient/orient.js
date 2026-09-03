// src/depot/orient.js — DEPOT's four 90°-step assault orientations, as pure
// coordinate transforms. Factored out of DepotGame.jsx (where they used to
// live as closures over a module-local `let ORIENT`) so the exact transform
// used to convert body/spawn WORLD (x, z) positions into territory.js's
// CANONICAL (u, v) space is importable and headlessly testable.
//
// This is where the Task 2 coordinate-space bug hid: territory.js's own
// pure functions (fogStateAt/holderAt/canBuild) are orientation-agnostic —
// they just index a (u, v) grid — so testing them alone never exercised the
// world->canonical conversion at all. The bug was entirely in the caller
// (DepotGame.jsx passing raw world x/z into territory.js instead of
// invW(x,z)), and it was invisible on ORIENT===0 (the default, where invW is
// the identity) — exactly the orientation depot-test.mjs's map-dependent
// scenarios always ran under. Pinning fwdU/invW here, with round-trip and
// non-default-orientation asserts in depot-test.mjs, closes that blind spot.
export function fwdUFor(ORIENT, u, v) {
  return ORIENT === 0 ? { x: u, z: v }
    : ORIENT === 1 ? { x: -v, z: u }
    : ORIENT === 2 ? { x: -u, z: -v }
    : { x: v, z: -u };
}
export function fwdDirFor(ORIENT, du, dv) {
  return ORIENT === 0 ? { x: du, z: dv }
    : ORIENT === 1 ? { x: -dv, z: du }
    : ORIENT === 2 ? { x: -du, z: -dv }
    : { x: dv, z: -du };
}
// invWFor is fwdUFor's inverse: world (x, z) -> canonical (u, v).
export function invWFor(ORIENT, x, z) {
  return ORIENT === 0 ? { u: x, v: z }
    : ORIENT === 1 ? { u: z, v: -x }
    : ORIENT === 2 ? { u: -x, v: -z }
    : { u: -z, v: x };
}

// P1.5 Task 1 (mk0.50) — THE OFF-MAP CLAMP. Takes a WORLD (x, z) and returns
// the nearest point inside the playable rim, also in world coords.
//
// It lives here, with the other transforms, for the reason this module exists
// at all: the rim is an AXIS-ALIGNED box in canonical (u, v) and a ROTATED one
// in world coords, so clamping world x/z directly would slice the corners off
// at three of the four orientations — the same coordinate-space class of bug
// the header above describes. Clamping in canonical space and transforming
// back is correct at every orientation, and pure/importable so a headless test
// can prove that rather than assume it.
//
// halfU/halfV are the caller's rim half-extents — DepotGame passes exactly the
// numbers its world.inRim tests against, so a clamped point always satisfies
// inRim (the bound is inclusive on both).
export function clampToRimFor(ORIENT, x, z, halfU, halfV) {
  const c = invWFor(ORIENT, x, z);
  const u = Math.max(-halfU, Math.min(halfU, c.u));
  const v = Math.max(-halfV, Math.min(halfV, c.v));
  if (u === c.u && v === c.v) return { x, z }; // already on the field — untouched
  return fwdUFor(ORIENT, u, v);
}
