// COMBO-ENGINE — gravitys-ark-test: the game GRAVITY'S ARK's one gate,
// grown by every phase after 0.0.103. This landing's checks: twin
// identity, the layout laws, the name draws, the galaxy contract, the
// import fence.
import { makeGalaxy, checkGalaxy, rollPerson, FACTIONS, WOMEN, MEN, FAMILY } from "../src/games/gravitys-ark/galaxy.js";
import { makeRoad, STARTER } from "../src/games/gravitys-ark/road.js";
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

const rollSeed = () => (rng() * 0xffffffff) >>> 0;

{ // 6. ark: twin roads from one rolled seed end with one hash
  // 7. ark: fuel is conserved on the road (shares the tape with check 6)
  const gSeed = rollSeed();
  const galaxyA = makeGalaxy(gSeed);
  const galaxyB = makeGalaxy(gSeed);
  const tape = [];
  for (let i = 0; i < 300; i++) {
    const burn = rng() < 0.1;
    let ux = 0, uy = 0;
    if (burn) { const a = rng() * 2 * Math.PI; ux = Math.cos(a); uy = Math.sin(a); }
    tape.push({ burn, ux, uy });
  }

  const roadA = makeRoad(galaxyA);
  const roadB = makeRoad(galaxyB);
  roadA.takeoff(); roadB.takeoff();
  for (const e of tape) {
    if (e.burn) { roadA.burn(e.ux, e.uy, 1 / 60); roadB.burn(e.ux, e.uy, 1 / 60); }
    roadA.tick(1 / 60); roadB.tick(1 / 60);
  }
  const twin = roadA.hash() === roadB.hash() && JSON.stringify(roadA.state.events) === JSON.stringify(roadB.state.events);
  check("ark: twin roads from one rolled seed end with one hash", twin);

  const galaxyC = makeGalaxy(rollSeed());
  const roadC = makeRoad(galaxyC);
  roadC.takeoff();
  for (const e of tape) {
    if (e.burn) roadC.burn(e.ux, e.uy, 1 / 60);
    roadC.tick(1 / 60);
  }
  const conserved = Math.abs((roadC.ship.fuel + roadC.state.spent) - STARTER.fuel) < 1e-9;
  check("ark: fuel is conserved on the road", conserved);
}

{ // 8. ark: the collapse fires on the seeded takeoff
  const galaxyD = makeGalaxy(rollSeed());
  const roadD = makeRoad(galaxyD);
  const w0 = galaxyD.worlds[0];
  let ok = true;
  for (let i = 0; i < 4; i++) {
    const res = roadD.takeoff();
    if (!res.ok) ok = false;
    if (roadD.state.hole.born !== (roadD.state.takeoffs >= galaxyD.collapseAt)) ok = false;
    if (roadD.state.takeoffs === galaxyD.collapseAt && res.collapse !== true) ok = false;
    roadD.ship.x = w0.x; roadD.ship.y = w0.y + w0.r + 10; roadD.ship.vx = 0; roadD.ship.vy = 0;
    const landRes = roadD.land();
    if (!landRes.ok) ok = false;
  }
  check("ark: the collapse fires on the seeded takeoff", ok);
}

{ // 9. ark: the hole's schedule is computable ahead and swallows worlds in distance order
  const galaxyE = makeGalaxy(rollSeed());
  const roadE = makeRoad(galaxyE);
  roadE.takeoff();
  roadE.collapse();
  const sch = roadE.schedule();
  const target = sch[0];
  const w = galaxyE.worlds.find(x => x.i === target.i);
  let aliveBefore = null;
  while (roadE.state.t <= target.after) {
    aliveBefore = (w.state === "alive");
    roadE.tick(1 / 60);
  }
  const expectMu = galaxyE.star.mu + w.mu;
  const muOk = Math.abs(roadE.state.hole.mu - expectMu) <= 1e-9 * Math.abs(expectMu);
  const swallowedOk = JSON.stringify(roadE.state.hole.swallowed) === JSON.stringify([target.i]);
  const ok = w.state === "gone" && aliveBefore === true && muOk && swallowedOk;
  check("ark: the hole's schedule is computable ahead and swallows worlds in distance order", ok);
}

{ // 10. ark: the landing band
  let ok = true;
  for (let iter = 0; iter < 100; iter++) {
    const galaxyF = makeGalaxy(rollSeed());
    const roadF = makeRoad(galaxyF);
    const k = Math.floor(rng() * galaxyF.n);
    const w = galaxyF.worlds[k];
    roadF.ship.landed = null;
    roadF.ship.x = w.x; roadF.ship.y = w.y + w.r + 20;
    let v;
    do { v = rng() * 30; } while (Math.abs(v - 7.5) < 1e-6 || Math.abs(v - 22.5) < 1e-6);
    roadF.ship.vx = 0; roadF.ship.vy = -v;
    const res = roadF.land();
    if (v < 7.5) {
      if (!(res.ok === true && res.crash === false)) ok = false;
    } else if (v < 22.5) {
      if (!(res.ok === true && res.crash === true && Math.abs(res.load - v) < 1e-9)) ok = false;
    } else {
      if (!(res.ok === false && res.reason === "death" && roadF.ship.alive === false)) ok = false;
    }
  }
  check("ark: the landing band", ok);
}

{ // 11. ark: the edge moves nearer for a heavier hull
  const galaxyG = makeGalaxy(rollSeed());
  const roadG = makeRoad(galaxyG);
  roadG.takeoff();
  roadG.collapse();
  const light = roadG.edgeFor({ dry: 3400, fuel: 2500 });
  const heavy = roadG.edgeFor({ dry: 6800, fuel: 2500 });
  const empty = roadG.edgeFor({ dry: 3400, fuel: 0 });
  const allNeeds = [...light.needs, ...heavy.needs, ...empty.needs];
  const needsOk = allNeeds.every(nv => Number.isFinite(nv) && nv > 0);
  const ok = light.index <= heavy.index && empty.index === galaxyG.n && needsOk;
  check("ark: the edge moves nearer for a heavier hull", ok);
}

console.log(`gravitys-ark-test: ${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
console.log("gravitys-ark-test PASS");
