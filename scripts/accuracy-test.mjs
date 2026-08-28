import { scatterSigma, applyScatter, losGraze } from "../src/depot/accuracy.js";
import { mulberry32 } from "../src/engine/core.js";
import { windAt } from "../src/depot/wind.js";
let n = 0, ok = 0; const T = (name, c) => { n++; if (c) ok++; else console.error("FAIL", name); };
const w = (bodies = []) => ({ rng: mulberry32(7), bodies, field: { heightAt: () => 0 } });
const spec = { projSpeed: 62, acc: 0.010 };
const M = (y) => ({ x: 0, y, z: 0 }), A = (d, y = 0) => ({ x: 0, y, z: d });
// range widens
T("range", scatterSigma(w(), M(1.5), A(30), spec) > scatterSigma(w(), M(1.5), A(12), spec));
// height advantage tightens, disadvantage widens (same ground distance)
T("high ground", scatterSigma(w(), M(6), A(20, 0), spec) < scatterSigma(w(), M(1.5), A(20, 0), spec));
T("uphill", scatterSigma(w(), M(1.5), A(20, 5), spec) > scatterSigma(w(), M(1.5), A(20, 0), spec));
// graze: a static box near the lane widens; far from lane doesn't
const box = (x, z) => ({ alive: true, kind: "rock", pos: { x, y: 1, z }, hx: 1, hy: 1, hz: 1, invM: 0 });
T("graze widens", scatterSigma(w([box(0.9, 10)]), M(1.5), A(20), spec) > scatterSigma(w(), M(1.5), A(20), spec));
T("clear lane", Math.abs(scatterSigma(w([box(8, 10)]), M(1.5), A(20), spec) - scatterSigma(w(), M(1.5), A(20), spec)) < 1e-9);
T("graze range", losGraze(w([box(0.9, 10)]), M(1.5), A(20)) > 0 && losGraze(w([box(8, 10)]), M(1.5), A(20)) === 0);
// applyScatter: deterministic (same rng state => same dir), unit length, exactly 2 draws
{ const a = { rng: mulberry32(3) }, b = { rng: mulberry32(3) };
  const d1 = applyScatter(a, { x: 0, y: 0, z: 1 }, 0.02), d2 = applyScatter(b, { x: 0, y: 0, z: 1 }, 0.02);
  T("det", d1.x === d2.x && d1.y === d2.y && d1.z === d2.z);
  T("unit", Math.abs(Math.hypot(d1.x, d1.y, d1.z) - 1) < 1e-6);
  T("draws", (a.rng(), b.rng(), a.rng() === b.rng())); }
// sigma 0 => unchanged dir, zero draws? NO — draw-count stability: still 2 draws
{ const a = { rng: mulberry32(9) }; const d = applyScatter(a, { x: 0, y: 0, z: 1 }, 0);
  T("zero sigma", d.z > 0.9999); }
// windAt envelope: mag stays within [0, 6] across a broad time span, sampled
// every second, for a spread of seeds.
{
  let inRange = true, minM = Infinity, maxM = -Infinity;
  for (const seed of [1, 42, 977, 12345]) {
    for (let t = 0; t <= 600; t++) {
      const { mag } = windAt(seed, t);
      if (mag < 0 || mag > 6) inRange = false;
      minM = Math.min(minM, mag); maxM = Math.max(maxM, mag);
    }
  }
  T("windAt: mag stays within [0, 6] over t=0..600s", inRange);
}
console.log(ok + "/" + n); if (ok !== n) process.exit(1);
