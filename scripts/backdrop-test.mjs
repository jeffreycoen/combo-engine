#!/usr/bin/env node
// GATE: backdrop-test — the space backdrop and effects kit's acceptance.
// Rolls a seed (or reads one from SEED), runs the module's laws against
// it, and prints PASS/FAIL lines, a count line, and a verdict line.
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  BACKDROP_DIALS,
  makeBackdrop,
  trailPoint,
  ringStep,
  ringState,
  ringMaxSize,
  explosion,
  beamFlicker,
  beamParticles,
  checkBackdropDials,
} from "../src/modules/backdrop/backdrop.js";
import { fxStream } from "../src/modules/determinism/determinism.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const SEED = process.env.SEED ? Number(process.env.SEED) : Math.floor(Math.random() * 0x7fffffff);
console.log(`seeds ${JSON.stringify({ backdrop: SEED })}`);

let pass = 0;
let fail = 0;
function check(name, fn) {
  try {
    fn();
    pass++;
    console.log(`PASS: ${name}`);
  } catch (e) {
    fail++;
    console.log(`FAIL: ${name}: ${e.message}`);
  }
}

const COLOR_TRIPLES = [
  [0.7, 0.8, 1],
  [1, 0.92, 0.8],
  [1, 0.8, 0.6],
  [1, 0.97, 0.92],
];
function isOneOfColors(c) {
  return COLOR_TRIPLES.some((t) => t[0] === c[0] && t[1] === c[1] && t[2] === c[2]);
}

const desktop = makeBackdrop({ seed: SEED, mobile: false });
const mobileBackdrop = makeBackdrop({ seed: SEED, mobile: true });
const testRnd = fxStream(SEED);

check("backdrop: twin backdrops from one rolled seed are identical", () => {
  const a = makeBackdrop({ seed: SEED, mobile: false });
  const b = makeBackdrop({ seed: SEED, mobile: false });
  assert.equal(JSON.stringify(a), JSON.stringify(b));
});

check("backdrop: the counts are exact per flag", () => {
  assert.equal(desktop.stars.length, 5000);
  assert.equal(desktop.nebulae.length, 42);
  assert.equal(desktop.core.length, 6);
  assert.equal(desktop.dust.length, 600);
  assert.equal(mobileBackdrop.stars.length, 2500);
  assert.equal(mobileBackdrop.nebulae.length, 20);
  assert.equal(mobileBackdrop.core.length, 6);
  assert.equal(mobileBackdrop.dust.length, 250);
});

check("backdrop: every star sits in the radius band with a size in the size band and a colour from the four", () => {
  for (const star of desktop.stars) {
    const dist = Math.sqrt(star.x * star.x + star.y * star.y + star.z * star.z);
    assert.ok(dist >= 300 && dist <= 1000, `distance ${dist} out of band`);
    assert.ok(star.size >= 0.3 && star.size <= 2.3, `size ${star.size} out of band`);
    assert.ok(isOneOfColors(star.color), `color ${star.color} not one of the four`);
  }
});

check("backdrop: every nebula's alpha, size, and placement obey the demo's ranges", () => {
  for (const neb of desktop.nebulae) {
    assert.ok(neb.alpha >= 0.06 && neb.alpha <= 0.2, `alpha ${neb.alpha} out of band`);
    assert.ok(neb.size >= 100 && neb.size <= 350, `size ${neb.size} out of band`);
    const [x, , z] = neb.position;
    const y = neb.position[1];
    assert.ok(z >= -530 && z <= -80, `z ${z} out of band`);
    assert.ok(y >= -175 && y <= 175, `y ${y} out of band`);
    if (neb.type < 0.55) assert.ok(x >= -10, `warm cloud x ${x} below -10`);
  }
});

check("backdrop: the ring law at rolled life", () => {
  for (let i = 0; i < 200; i++) {
    const life = testRnd();
    const size = 0.5 + testRnd() * 3.5;
    const maxSize = ringMaxSize(size);
    const state = ringState(life, maxSize);
    assert.ok(Math.abs(state.scale - (1 + (1 - life) * size * 14)) <= 1e-12, `scale at life=${life} size=${size}`);
    assert.ok(Math.abs(state.opacity - life * 0.6) <= 1e-12, `opacity at life=${life}`);
    const dt = testRnd();
    assert.ok(Math.abs(ringStep(life, dt) - (life - dt * 0.3)) <= 1e-12, `ringStep at life=${life} dt=${dt}`);
  }
});

check("backdrop: the trail ramp is monotone in life", () => {
  const maxLife = 1 + testRnd() * 3;
  const size = 0.5 + testRnd() * 3.5;
  const steps = 50;
  let prevSize = -Infinity;
  let prevAlpha = -Infinity;
  for (let i = 0; i <= steps; i++) {
    const life = (maxLife * i) / steps;
    const p = trailPoint(life, maxLife, size);
    assert.ok(p.size >= prevSize - 1e-9, `size decreased at life=${life}`);
    assert.ok(p.alpha >= prevAlpha - 1e-9, `alpha decreased at life=${life}`);
    prevSize = p.size;
    prevAlpha = p.alpha;
  }
  const full = trailPoint(maxLife, maxLife, size);
  assert.ok(Math.abs(full.size - size) <= 1e-12, `full-life size ${full.size} != base ${size}`);
  assert.ok(Math.abs(full.alpha - 0.8) <= 1e-12, `full-life alpha ${full.alpha} != 0.8`);
});

check("backdrop: the beam laws", () => {
  for (let i = 0; i < 100; i++) {
    const length = testRnd() * 60;
    assert.equal(beamParticles(length), Math.min(6, Math.floor(length / 4)), `length=${length}`);
  }
  for (let i = 0; i < 50; i++) {
    const t = testRnd() * 20;
    const expected = 0.6 + Math.sin(t * 30) * 0.2 + Math.sin(t * 47) * 0.1;
    assert.ok(Math.abs(beamFlicker(t, 0) - expected) <= 1e-12, `flicker at t=${t}`);
  }
});

check("backdrop: an explosion emits the demo's counts and its ring", () => {
  const size = 1 + testRnd() * 5;
  const pos = [0, 0, 0];

  const d = explosion(pos, size, false, testRnd, BACKDROP_DIALS.ring);
  assert.equal(d.particles.length, 30 + 8 + 12);
  assert.equal(d.ring.life, 1);
  assert.ok(Math.abs(d.ring.maxSize - size * 14) <= 1e-9);
  for (const p of d.particles.slice(0, 30)) assert.ok(p.life >= 2.4 && p.life <= 4.4, `fireball life ${p.life}`);
  for (const p of d.particles.slice(38)) assert.ok(p.life >= 3 && p.life <= 5, `ember life ${p.life}`);

  const m = explosion(pos, size, true, testRnd, BACKDROP_DIALS.ring);
  assert.equal(m.particles.length, 15 + 8 + 6);
  for (const p of m.particles.slice(0, 15)) assert.ok(p.life >= 2.4 && p.life <= 4.4, `mobile fireball life ${p.life}`);
  for (const p of m.particles.slice(23)) assert.ok(p.life >= 3 && p.life <= 5, `mobile ember life ${p.life}`);
});

check("backdrop: the contract counts every problem", () => {
  const broken = {
    ...BACKDROP_DIALS,
    stars: { ...BACKDROP_DIALS.stars, desktop: -1 },
    bloom: { ...BACKDROP_DIALS.bloom, weights: [1] },
  };
  assert.equal(checkBackdropDials(broken).length, 2);
  assert.equal(checkBackdropDials(BACKDROP_DIALS).length, 0);
  assert.equal(checkBackdropDials(null).length, 1);
});

check("backdrop: the module imports only from its own folder or a sibling module", () => {
  const src = readFileSync(join(__dirname, "../src/modules/backdrop/backdrop.js"), "utf8");
  const re = /import\s+[^'"]*?from\s+["']([^"']+)["']/g;
  const specs = [];
  let m;
  while ((m = re.exec(src))) specs.push(m[1]);
  assert.ok(specs.length > 0, "expected at least one import to check");
  for (const spec of specs) {
    assert.ok(/^\.\.\/[a-z0-9-]+\//.test(spec) || /^\.\//.test(spec), `bad import specifier: ${spec}`);
  }
});

console.log(`backdrop-test: ${pass} PASS / ${fail} FAIL`);
console.log(fail === 0 ? "backdrop-test PASS" : "backdrop-test FAIL");
process.exit(fail === 0 ? 0 : 1);
