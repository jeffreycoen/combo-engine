// COMBO-ENGINE — gravitys-ark-test: the game GRAVITY'S ARK's one gate,
// grown by every phase after 0.0.103. This landing's checks: twin
// identity, the layout laws, the name draws, the galaxy contract, the
// import fence.
import { makeGalaxy, checkGalaxy, rollPerson, FACTIONS, WOMEN, MEN, FAMILY } from "../src/games/gravitys-ark/galaxy.js";
import { simStream } from "../src/modules/determinism/determinism.js";
import { readFileSync } from "node:fs";

let pass = 0, fail = 0;
const check = (name, ok) => { if (ok) { pass++; console.log("PASS " + name); } else { fail++; console.log("FAIL " + name); } };

// the small seeded stream the other gates use
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const SEED = process.env.SEED ? (parseInt(process.env.SEED, 10) >>> 0) : ((Math.random() * 0xffffffff) >>> 0);
console.log(`seeds {"gravitys-ark":${SEED}}`);
const rng = mulberry32(SEED);

{ // 1. twin galaxies from one rolled seed are identical
  const g1 = makeGalaxy(SEED);
  const g2 = makeGalaxy(SEED);
  const g3 = makeGalaxy(SEED, {});
  const ok = JSON.stringify(g1) === JSON.stringify(g2) && JSON.stringify(g1) === JSON.stringify(g3);
  check("ark: twin galaxies from one rolled seed are identical", ok);
}

{ // 2. the layout laws hold at rolled seeds
  let ok = true;
  for (let k = 0; k < 50 && ok; k++) {
    const s = Math.floor(rng() * 2 ** 32);
    const gal = makeGalaxy(s);
    const d = gal.dials;
    const lane = (d.xMax - d.xMin) / gal.n;
    if (gal.n < 8 || gal.n > 12) ok = false;
    for (let i = 0; i < gal.worlds.length && ok; i++) {
      const w = gal.worlds[i];
      if (i > 0) {
        const prev = gal.worlds[i - 1];
        if (!(w.x > prev.x) || w.x - prev.x < lane * 0.4) ok = false;
      }
      if (Math.abs(w.y) > d.yHalf) ok = false;
      if (w.r < d.rMin || w.r > d.rMax) ok = false;
      if (w.g < d.gMin || w.g > d.gMax) ok = false;
      const pull = w.mu / Math.pow(w.r * w.r + w.soft * w.soft, 1.65);
      if (Math.abs(pull - w.g) > Math.abs(w.g) * 1e-9) ok = false;
      if (w.ring !== Math.floor(3 * i / gal.n)) ok = false;
      if (w.ring === 2 && w.holder !== "authority") ok = false;
      if (!FACTIONS.includes(w.station.faction)) ok = false;
    }
    if (gal.gate.x !== gal.worlds[gal.n - 1].x + d.gateGap) ok = false;
    if (gal.gate.toll < d.tollMin || gal.gate.toll > d.tollMax) ok = false;
    if (gal.collapseAt !== 2 && gal.collapseAt !== 3) ok = false;
    if (gal.lanes.length !== gal.n - 1) ok = false;
    for (let i = 0; i < gal.lanes.length && ok; i++) {
      if (gal.lanes[i][0] !== i || gal.lanes[i][1] !== i + 1) ok = false;
    }
  }
  check("ark: the layout laws hold at rolled seeds", ok);
}

{ // 3. names come from the seed, women and men
  const rngA = simStream(SEED);
  const rngB = simStream(SEED);
  const resA = [];
  for (let i = 0; i < 200; i++) resA.push(rollPerson(rngA));
  const resB = [];
  for (let i = 0; i < 200; i++) resB.push(rollPerson(rngB));
  let ok = true, sawF = false, sawM = false;
  for (let i = 0; i < 200; i++) {
    if (resA[i].name !== resB[i].name || resA[i].sex !== resB[i].sex) ok = false;
    if (resA[i].sex === "f") sawF = true;
    else if (resA[i].sex === "m") sawM = true;
    else ok = false;
    const table = resA[i].sex === "f" ? WOMEN : MEN;
    const parts = resA[i].name.split(" ");
    if (!table.includes(parts[0]) || !FAMILY.includes(parts[1])) ok = false;
  }
  if (!sawF || !sawM) ok = false;
  check("ark: names come from the seed, women and men", ok);
}

{ // 4. the galaxy contract counts every problem
  const broken = checkGalaxy({ seed: -1, worlds: [1, 2], star: null, gate: {}, collapseAt: 4 });
  const clean = checkGalaxy(makeGalaxy(SEED));
  const notObject = checkGalaxy(null);
  check("ark: the galaxy contract counts every problem", broken.length === 7 && clean.length === 0 && notObject.length === 1);
}

{ // 5. the game's files import only from the engine's modules or their own folder
  const src = readFileSync(new URL("../src/games/gravitys-ark/galaxy.js", import.meta.url), "utf8");
  const specifiers = [...src.matchAll(/^import\s+.*?\bfrom\s+["']([^"']+)["']/gm)].map((m) => m[1]);
  const ok = specifiers.every((spec) => /^\.\.\/\.\.\/modules\/[a-z0-9-]+\//.test(spec) || /^\.\//.test(spec));
  check("ark: the game's files import only from the engine's modules or their own folder", ok);
}

console.log(`gravitys-ark-test: ${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
console.log("gravitys-ark-test PASS");
