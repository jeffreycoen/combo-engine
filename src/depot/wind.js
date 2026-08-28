// src/depot/wind.js — deterministic wind field. Pure function of (seed, t):
// multiplayer twin-sims and resumed runs must agree at any t without replay.
export function windAt(seed, t) {
  const p1 = (seed % 977) * 0.013, p2 = (seed % 761) * 0.017, p3 = (seed % 541) * 0.029;
  const dir = p1 * 6.283 + Math.sin(t * 0.011 + p2) * 1.1 + Math.sin(t * 0.0037 + p3) * 1.9; // slow heading drift
  const mag = 2.2 + 2.0 * Math.sin(t * 0.019 + p3) + 1.4 * Math.sin(t * 0.0071 + p1);        // 0..~5.6 m/s envelope
  const m = Math.max(0, mag);
  return { x: Math.cos(dir) * m, z: Math.sin(dir) * m, mag: m };
}
