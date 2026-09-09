// MODULE: backdrop — the space backdrop and effects kit. Serves the
// checklist box "The space backdrop and effects kit: starfield, nebulae,
// trails, beams, explosion rings" (batch-general-1.md, B10).
//
// Source: the fleet demo, read-only. homeworld_fleet_command.jsx lines
// 653-667 (the starfield: counts, radii, colours, sizes), 683-750 (the
// nebulae: counts, sizes, hue/saturation/lightness buckets, alphas, the
// second-pass offsets, positions, rotations), 755-782 (the galactic core's
// six layers), 784-788 (the dust: counts and spread), 593 (the trail
// particle's size and alpha ramps), 1047-1069 (the explosion's particle
// counts, spreads, colours, sizes, lifetimes, and its ring), 1568 and 1580
// (the beam's flicker and particle count), 1650-1656 (the ring's decay,
// scale, and opacity), 532-549 (the bloom's weights, intensity,
// aberration, and vignette, carried as data).
//
// Law carried: every count, range, colour, lifetime, and ramp the demo
// draws by; the bloom's numbers as data.
//
// New: generation runs on a handed seeded stream (the determinism kit's
// fxStream) in place of the demo's unseeded Math.random, every draw kept
// in the demo's own order; the trail, ring, beam, and explosion laws are
// pure functions; no three.js, no canvas, no DOM. A renderer reads the
// plain lists this module returns and draws them.
//
// Named difference: the demo's sky was different on every load; this
// module's sky is the seed's.

import { fxStream } from "../determinism/determinism.js";

export const BACKDROP_DIALS = {
  stars: { desktop: 5000, mobile: 2500, rMin: 300, rSpan: 700, sizeMin: 0.3, sizeSpan: 2 },
  nebulae: { desktop: 42, mobile: 20, sizeMin: 100, sizeSpan: 250, alphaMin: 0.06, alphaSpan: 0.14 },
  core: { layers: 6, sizeMin: 130, sizeStep: 100, alphaMin: 0.22, alphaStep: 0.03 },
  dust: { desktop: 600, mobile: 250, spreadXZ: 600, spreadY: 120 },
  trail: { sizeFloor: 0.4, sizeSpan: 0.6, alpha: 0.8 },
  ring: { decay: 0.3, opacity: 0.6, sizeMul: 14 },
  beam: { maxParticles: 6, perLength: 4 },
  bloom: { weights: [0.227027, 0.1945946, 0.1216216, 0.054054, 0.016216], intensity: 0.65, aberration: 0.003, vignette: 0.35 },
};

// dials merged over the defaults: each group shallow-merged over its
// default group, so a caller may hand a partial group without losing its
// untouched siblings.
function mergeDials(base, over) {
  if (!over) return base;
  const out = {};
  for (const group of Object.keys(base)) {
    const b = base[group], o = over[group];
    out[group] = o && typeof o === "object" && !Array.isArray(o) ? { ...b, ...o } : (o !== undefined ? o : b);
  }
  return out;
}

// makeBackdrop(opts): seed (required), mobile (default false), dials
// (merged over BACKDROP_DIALS), stream (default fxStream(seed)). Draws in
// the demo's own order: stars, then the nebula palette (hueBase, warmth),
// then each nebula, then the six core layers (derived, no draws), then
// the dust motes.
export function makeBackdrop(opts) {
  const { seed, mobile = false, dials: dialsOpt, stream } = opts;
  const dials = mergeDials(BACKDROP_DIALS, dialsOpt);
  const rnd = stream || fxStream(seed);

  // --- stars (653-667) ---
  const starCount = mobile ? dials.stars.mobile : dials.stars.desktop;
  const stars = [];
  for (let i = 0; i < starCount; i++) {
    const r = dials.stars.rMin + rnd() * dials.stars.rSpan;
    const th = rnd() * Math.PI * 2;
    const ph = Math.acos(2 * rnd() - 1);
    const x = r * Math.sin(ph) * Math.cos(th);
    const y = r * Math.sin(ph) * Math.sin(th);
    const z = r * Math.cos(ph);
    const t = rnd();
    let color;
    if (t < 0.15) color = [0.7, 0.8, 1];
    else if (t < 0.4) color = [1, 0.92, 0.8];
    else if (t < 0.55) color = [1, 0.8, 0.6];
    else color = [1, 0.97, 0.92];
    const size = dials.stars.sizeMin + rnd() * dials.stars.sizeSpan;
    stars.push({ x, y, z, color, size });
  }

  // --- nebula palette, drawn once per backdrop (683-686) ---
  const hueBase = rnd() * 360;
  const warmth = 0.5 + rnd() * 0.5;

  // --- nebulae (687-750) ---
  const nebCount = mobile ? dials.nebulae.mobile : dials.nebulae.desktop;
  const nebulae = [];
  for (let i = 0; i < nebCount; i++) {
    const size = dials.nebulae.sizeMin + rnd() * dials.nebulae.sizeSpan;
    const type = rnd();
    let h, s, l;
    if (type < 0.3) {
      h = (hueBase * 0.1 + 330 + rnd() * 50) % 360;
      s = 0.5 + rnd() * 0.4;
      l = 0.1 + rnd() * 0.15;
    } else if (type < 0.55) {
      h = (hueBase * 0.1 + 15 + rnd() * 35) % 360;
      s = 0.5 + rnd() * 0.4;
      l = 0.1 + rnd() * 0.14;
    } else if (type < 0.75) {
      h = (hueBase * 0.15 + 250 + rnd() * 40) % 360;
      s = 0.4 + rnd() * 0.5;
      l = 0.08 + rnd() * 0.12;
    } else if (type < 0.88) {
      h = (hueBase * 0.1 + 170 + rnd() * 30) % 360;
      s = 0.35 + rnd() * 0.4;
      l = 0.08 + rnd() * 0.1;
    } else {
      h = (hueBase * 0.05 + 350 + rnd() * 20) % 360;
      s = 0.5 + rnd() * 0.4;
      l = 0.12 + rnd() * 0.15;
    }
    const alpha = dials.nebulae.alphaMin + rnd() * dials.nebulae.alphaSpan;
    const dx = rnd() * 30 - 15;
    const dy = rnd() * 30 - 15;
    const hue2 = (h + rnd() * 40 - 20) % 360;
    const posX = type < 0.55 ? 80 + (rnd() - 0.2) * 450 : (rnd() - 0.5) * 600;
    const posY = (rnd() - 0.5) * 350;
    const posZ = -80 - rnd() * 450;
    const rotX = rnd() * Math.PI;
    const rotY = rnd() * Math.PI;
    const rotZ = rnd() * Math.PI;
    nebulae.push({ size, type, h, s, l, alpha, offset2: [dx, dy], hue2, position: [posX, posY, posZ], rotation: [rotX, rotY, rotZ] });
  }

  // --- galactic core, six layers, derived from hueBase and the loop index
  // only — no draws (755-782) ---
  const coreHue = (hueBase * 0.08 + 25) % 50;
  const core = [];
  for (let i = 0; i < dials.core.layers; i++) {
    const size = dials.core.sizeMin + i * dials.core.sizeStep;
    const alpha = dials.core.alphaMin - i * dials.core.alphaStep;
    core.push({ size, alpha, position: [220 + i * 25, 40 + i * 12, -450], rotationZ: i * 0.1, coreHue });
  }

  // --- dust (784-788) ---
  const dustCount = mobile ? dials.dust.mobile : dials.dust.desktop;
  const dust = [];
  for (let i = 0; i < dustCount; i++) {
    const x = (rnd() - 0.5) * dials.dust.spreadXZ;
    const y = (rnd() - 0.5) * dials.dust.spreadY;
    const z = (rnd() - 0.5) * dials.dust.spreadXZ;
    dust.push({ x, y, z });
  }

  return { stars, nebulae, hueBase, warmth, core, dust, mobile };
}

// trailPoint (593): the trail particle's size and alpha ramp, t = life /
// maxLife.
export function trailPoint(life, maxLife, size, dials = BACKDROP_DIALS.trail) {
  const t = life / maxLife;
  return { size: size * (dials.sizeFloor + t * dials.sizeSpan), alpha: t * dials.alpha };
}

// ringStep (1651): one tick of an explosion ring's life.
export function ringStep(life, dt, dials = BACKDROP_DIALS.ring) {
  return life - dt * dials.decay;
}

// ringState (1653-1655): an explosion ring's scale and opacity at its
// current life and maxSize.
export function ringState(life, maxSize, dials = BACKDROP_DIALS.ring) {
  return { scale: 1 + (1 - life) * maxSize, opacity: life * dials.opacity };
}

// ringMaxSize (1069): an explosion ring's maxSize from its source size.
export function ringMaxSize(size, dials = BACKDROP_DIALS.ring) {
  return size * dials.sizeMul;
}

// beamFlicker (1568): the ion beam's flicker intensity at time t, with a
// drawn value r for the last, random term.
export function beamFlicker(t, r) {
  return 0.6 + Math.sin(t * 30) * 0.2 + Math.sin(t * 47) * 0.1 + r * 0.1;
}

// beamParticles (1580): the beam particle count for a beam of the given
// length.
export function beamParticles(length, dials = BACKDROP_DIALS.beam) {
  return Math.min(dials.maxParticles, Math.floor(length / dials.perLength));
}

// explosion (1047-1069): the demo's emitted particles as a plain list, in
// the demo's order and with the demo's draws — the fireball, the
// white-hot core (no velocity), the embers — plus the ring. pos is
// accepted for call-site symmetry with the demo's explode(pos, size) but
// is not placed into the output: the demo's own ring carries no position
// either (it is copied onto the mesh outside this law), so placement
// stays a renderer's concern throughout. dials is the ring-shaped dials
// (BACKDROP_DIALS.ring); it is the only law explosion borrows, for the
// ring's maxSize.
export function explosion(pos, size, mobile, rnd, dials) {
  const fireballN = mobile ? 15 : 30;
  const emberN = mobile ? 6 : 12;
  const particles = [];
  for (let i = 0; i < fireballN; i++) {
    const vx = (rnd() - 0.5) * 0.2 * size;
    const vy = (rnd() - 0.5) * 0.2 * size;
    const vz = (rnd() - 0.5) * 0.2 * size;
    const color = rnd() > 0.5 ? 0xffaa44 : 0xff5522;
    const s = size * (1.5 + rnd() * 3);
    const life = 2.4 + rnd() * 2;
    particles.push({ velocity: [vx, vy, vz], color, size: s, life });
  }
  for (let i = 0; i < 8; i++) {
    const life = 0.8 + rnd() * 0.4;
    particles.push({ velocity: null, color: 0xffeedd, size: size * 1.2, life });
  }
  for (let i = 0; i < emberN; i++) {
    const vx = (rnd() - 0.5) * 0.12 * size;
    const vy = (rnd() - 0.5) * 0.12 * size;
    const vz = (rnd() - 0.5) * 0.12 * size;
    const color = rnd() > 0.5 ? 0xdd6622 : 0x884411;
    const s = size * (0.5 + rnd());
    const life = 3 + rnd() * 2;
    particles.push({ velocity: [vx, vy, vz], color, size: s, life });
  }
  return { particles, ring: { life: 1, maxSize: ringMaxSize(size, dials) } };
}

// BACKDROP_CONTRACT: a plain field description backing checkBackdropDials
// — each dial's kind, so the check can walk every group and every field
// in one pass. "count": integer >= 0. "range": number >= 0. "weights5":
// an array of exactly five numbers.
export const BACKDROP_CONTRACT = {
  stars: { desktop: "count", mobile: "count", rMin: "range", rSpan: "range", sizeMin: "range", sizeSpan: "range" },
  nebulae: { desktop: "count", mobile: "count", sizeMin: "range", sizeSpan: "range", alphaMin: "range", alphaSpan: "range" },
  core: { layers: "count", sizeMin: "range", sizeStep: "range", alphaMin: "range", alphaStep: "range" },
  dust: { desktop: "count", mobile: "count", spreadXZ: "range", spreadY: "range" },
  trail: { sizeFloor: "range", sizeSpan: "range", alpha: "range" },
  ring: { decay: "range", opacity: "range", sizeMul: "range" },
  beam: { maxParticles: "count", perLength: "range" },
  bloom: { weights: "weights5", intensity: "range", aberration: "range", vignette: "range" },
};

// checkBackdropDials(d): every problem in one pass, empty when clean.
export function checkBackdropDials(d) {
  const problems = [];
  if (typeof d !== "object" || d === null || Array.isArray(d)) {
    problems.push("dials: not an object");
    return problems;
  }
  for (const group of Object.keys(BACKDROP_CONTRACT)) {
    const g = d[group];
    if (typeof g !== "object" || g === null || Array.isArray(g)) {
      problems.push(`dials.${group}: object required`);
      continue;
    }
    for (const [name, kind] of Object.entries(BACKDROP_CONTRACT[group])) {
      const v = g[name];
      if (kind === "count") {
        if (!(Number.isInteger(v) && v >= 0)) problems.push(`dials.${group}.${name}: integer >= 0 required`);
      } else if (kind === "range") {
        if (!(typeof v === "number" && isFinite(v) && v >= 0)) problems.push(`dials.${group}.${name}: number >= 0 required`);
      } else if (kind === "weights5") {
        if (!(Array.isArray(v) && v.length === 5 && v.every((w) => typeof w === "number" && isFinite(w)))) {
          problems.push(`dials.${group}.${name}: 5 numbers required`);
        }
      }
    }
  }
  return problems;
}
