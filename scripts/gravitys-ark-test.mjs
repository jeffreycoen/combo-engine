// COMBO-ENGINE — gravitys-ark-test: the game GRAVITY'S ARK's one gate,
// grown by every phase after 0.0.103. This landing's checks: twin
// identity, the layout laws, the name draws, the galaxy contract, the
// import fence.
import { makeGalaxy, checkGalaxy, rollPerson, FACTIONS, WOMEN, MEN, FAMILY } from "../src/games/gravitys-ark/galaxy.js";
import { makeRoad, STARTER, escapeSpeed } from "../src/games/gravitys-ark/road.js";
import { simStream } from "../src/modules/determinism/determinism.js";
import { readFileSync } from "node:fs";
import { makeStations, makePurse, listings, hirePrice, hire, wagesDue, dock, buy, sell, makeHull, derive, install, remove, stepStations, carryPeople, deliverPeople, MODULES, STARTER_HULL } from "../src/games/gravitys-ark/stations.js";
import { makeLedger } from "../src/modules/ledger/ledger.js";

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
      const pull = w.mu * w.r / Math.pow(w.r * w.r + w.soft * w.soft, 1.65);   // re-taught in 0.0.105: the wells pull carries the distance
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
    roadF.ship.vx = 0; roadF.ship.vy = -(v + escapeSpeed(w));   // re-taught in 0.0.105: the band is the excess over the descent burn
    const res = roadF.land();
    if (v < 7.5) {
      if (!(res.ok === true && res.crash === false)) ok = false;
    } else if (v < 22.5) {
      if (!(res.ok === true && res.crash === true && Math.abs(res.load - v) < 1e-6)) ok = false;
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

{ // 12. ark: a hull that reaches a surface lands by the band and never passes through (added in 0.0.105)
  let ok = true;
  for (let iter = 0; iter < 20 && ok; iter++) {
    const gal = makeGalaxy(rollSeed()), rd = makeRoad(gal), w = gal.worlds[Math.floor(rng() * gal.n)];
    rd.ship.landed = null; rd.ship.x = w.x; rd.ship.y = w.y + w.r + 50; rd.ship.vx = 0; rd.ship.vy = 0;
    let steps = 0; while (rd.ship.landed === null && rd.ship.alive && steps++ < 20000) rd.tick(1 / 60);
    const ev = rd.state.events[rd.state.events.length - 1];
    if (!(rd.ship.landed === w.i && ev && ev.k === "land" && Math.abs(rd.ship.y - (w.y + w.r)) < 1e-9)) ok = false;
    const rd2 = makeRoad(gal); rd2.ship.landed = null; rd2.ship.x = w.x; rd2.ship.y = w.y + w.r + 3000; rd2.ship.vx = 0; rd2.ship.vy = -(escapeSpeed(w) + 30);
    steps = 0; while (rd2.ship.landed === null && rd2.ship.alive && steps++ < 20000) rd2.tick(1 / 60);
    if (!(rd2.ship.alive === false && rd2.ship.landed === null)) ok = false;
    const rd3 = makeRoad(gal); const t0 = rd3.takeoff(); const v0 = Math.hypot(rd3.ship.vx, rd3.ship.vy);
    if (!(t0.ok && v0 >= escapeSpeed(gal.worlds[0]))) ok = false;
  }
  check("ark: a hull that reaches a surface lands by the band and never passes through", ok);
}



// one further rolled seed, off the same stream, for the twin-identity checks (14, 17)
const TWIN_SEED = Math.floor(rng() * 0x100000000) >>> 0;
console.log(`twin seed ${TWIN_SEED}`);

// the common harness every check builds: a fresh galaxy and stations from
// SEED, a purse, a hull (for cargo.people), an empty crew list, and a
// ledger with the five sources declared over them.
function makeStandardLedger(S, purse, hull, crew) {
  const ledger = makeLedger({ dimensions: ["credits", "people"] });
  ledger.declare("credits", purse.credits);
  for (const sid in S.stations) ledger.declare("credits", S.stations[sid].credits);
  for (const sid in S.stations) ledger.declare("people", S.stations[sid].parts.people.q);
  ledger.source("purse", () => ({ credits: purse.credits }));
  ledger.source("stations", () => {
    let credits = 0, people = 0;
    for (const sid in S.stations) { credits += S.stations[sid].credits; people += S.stations[sid].parts.people.q; }
    return { credits, people };
  });
  ledger.source("escrow", () => {
    let credits = 0;
    for (const ct of S.book.list) if (ct.open) credits += ct.escrow;
    return { credits };
  });
  ledger.source("wages", () => ({ credits: S.wagesPaid }));
  ledger.source("crew", () => ({ people: crew.length + hull.cargo.people }));
  ledger.seal();
  return ledger;
}
function setupWorld() {
  const G = makeGalaxy(SEED);
  const S = makeStations(G);
  S.rollPerson = rollPerson;
  const purse = makePurse(50000, 0);
  const hull = makeHull(STARTER_HULL);
  const crew = [];
  const ledger = makeStandardLedger(S, purse, hull, crew);
  return { G, S, purse, hull, crew, ledger };
}
// the trades of check 12: at a rolled station, one of six kinds; a refused
// trade counts as a trade. Shared by checks 12 and 17 so 17 truly replays 12.
function runTrades(S, purse, hull, crew, rngX, count, afterEach) {
  const sids = Object.keys(S.stations);
  const kinds = ["buyScrap", "sellScrap", "buyFuel", "sellFuel", "buyModule", "hire"];
  const moduleKinds = Object.keys(MODULES);
  const succeeded = { buyScrap: false, sellScrap: false, buyFuel: false, sellFuel: false, buyModule: false, hire: false };
  for (let i = 0; i < count; i++) {
    const sid = sids[Math.floor(rngX() * sids.length)];
    const kind = kinds[Math.floor(rngX() * kinds.length)];
    if (kind === "buyScrap") {
      const n = 1 + Math.floor(rngX() * 500);
      if (buy(S, sid, "scrap", n, purse) !== null) { hull.scrap += n; succeeded.buyScrap = true; }
    } else if (kind === "sellScrap") {
      const n = hull.scrap;
      if (n > 0 && sell(S, sid, "scrap", n, purse) !== null) { hull.scrap -= n; succeeded.sellScrap = true; }
    } else if (kind === "buyFuel") {
      const n = 1 + Math.floor(rngX() * 500);
      if (buy(S, sid, "fuel", n, purse) !== null) succeeded.buyFuel = true;
    } else if (kind === "sellFuel") {
      const n = 1 + Math.floor(rngX() * 500);
      if (sell(S, sid, "fuel", n, purse) !== null) succeeded.sellFuel = true;
    } else if (kind === "buyModule") {
      const mk = moduleKinds[Math.floor(rngX() * moduleKinds.length)];
      if (buy(S, sid, "mod:" + mk, 1, purse) !== null) succeeded.buyModule = true;
    } else {
      const hand = hire(S, sid, purse, rngX, i);
      if (hand !== null) { crew.push(hand); succeeded.hire = true; }
    }
    if (afterEach) afterEach(i);
  }
  return succeeded;
}

{ // 12. pools conserve credits and people on the ledger through rolled trades
  const { S, purse, hull, crew, ledger } = setupWorld();
  let auditOk = true;
  const succeeded = runTrades(S, purse, hull, crew, rng, 200, () => { auditOk = ledger.audit().ok && auditOk; });
  check("ark: pools conserve credits and people on the ledger through rolled trades", auditOk && Object.values(succeeded).every(Boolean));
}

{ // 13. listings are dearer nearer the pit
  const { G, S } = setupWorld();
  let priceOk = true;
  for (const sid in S.stations) {
    const st = S.stations[sid];
    const lst = listings(S, sid);
    const wantScrap = Math.round(S.dials.scrapPrice * st.bias);
    const wantFuel = Math.round(S.dials.fuelPrice * st.bias);
    if (Math.abs(lst.scrap - wantScrap) > 1) priceOk = false;
    if (Math.abs(lst.fuel - wantFuel) > 1) priceOk = false;
  }
  const order = G.worlds.map((w) => ({ sid: w.id, dist: Math.hypot(w.x, w.y) })).sort((a, b) => a.dist - b.dist);
  let biasOk = true;
  for (let i = 1; i < order.length; i++) if (S.stations[order[i].sid].bias > S.stations[order[i - 1].sid].bias + 1e-9) biasOk = false;
  check("ark: listings are dearer nearer the pit", priceOk && biasOk);
}

{ // 14. hands come from the seed, rise six percent per hire, and wages fall due at the dock
  const { G, S, purse } = setupWorld();
  // a rolled station with room for four full-price hires: hire() refuses once its
  // people pool sits at 1, so four successes need a pool that starts above 4.
  const candidates = G.worlds.filter((w) => w.ring !== 2 && S.stations[w.id].parts.people.q > 4);
  const w14 = candidates[Math.floor(rng() * candidates.length)];
  const sid = w14.id;
  const bias = S.stations[sid].bias;
  const rngA = mulberry32(TWIN_SEED);
  const hands = [];
  let priceLawOk = true;
  for (let k = 0; k < 4; k++) {
    const before = purse.credits;
    const hand = hire(S, sid, purse, rngA, 0);
    const paid = before - purse.credits;
    hands.push(hand);
    if (paid !== Math.ceil(650 * bias * Math.pow(1.06, k))) priceLawOk = false;
  }
  let sexOk = true;
  for (const hand of hands) {
    const first = hand.name.split(" ")[0];
    const table = hand.sex === "f" ? WOMEN : MEN;
    if (!table.includes(first)) sexOk = false;
  }
  const S2 = makeStations(makeGalaxy(SEED)); S2.rollPerson = rollPerson;
  const purse2 = makePurse(50000, 0);
  const rngB = mulberry32(TWIN_SEED);
  const names2 = [];
  for (let k = 0; k < 4; k++) names2.push(hire(S2, sid, purse2, rngB, 0).name);
  const namesMatch = hands.every((h, i) => h.name === names2[i]);
  const interval = 1000 + rng() * 99000;
  const due = wagesDue(hands, interval, 0, S.dials);
  const wagesLawOk = Math.abs(due - (4 * 40 * interval / 600)) < 1e-9;
  const purse3 = makePurse(10, 0);
  dock(S, purse3, hands, interval);
  const dockOk = Math.abs(purse3.debt - (due - 10)) < 1e-6 && purse3.credits === 0;
  check("ark: hands come from the seed, rise six percent per hire, and wages fall due at the dock", priceLawOk && sexOk && namesMatch && wagesLawOk && dockOk);
}

{ // 15. the build screen derives the starter's mass and thrust and refuses a loose module
  const hull = makeHull(STARTER_HULL);
  const d0 = derive(hull);
  let ok = d0.m === 3400 && d0.F === 60000 && d0.fuelCap === 3000;
  const strutIdx = hull.list.length;
  ok = ok && install(hull, "strut", 2, 0) === true;
  ok = ok && derive(hull).m === 3550;
  ok = ok && install(hull, "strut", 5, 5) === false;
  const bridgeIdx = hull.list.findIndex((m) => m.t === "bridge");
  ok = ok && remove(hull, bridgeIdx) === false;
  ok = ok && remove(hull, strutIdx) === true;
  ok = ok && derive(hull).m === 3400;
  check("ark: the build screen derives the starter's mass and thrust and refuses a loose module", ok);
}

{ // 16. a starving far station posts the contract to move people, and delivering pays the escrow once
  const { G, S, purse, hull, ledger } = setupWorld();
  let auditOk = true;
  for (let i = 0; i < 61; i++) { stepStations(S, 1); auditOk = ledger.audit().ok && auditOk; }
  const ct = S.book.list.find((c) => c.open && c.part === "people" && G.worlds.find((w) => w.id === c.at && w.ring === 2));
  const hasContract = !!ct;
  const w0 = G.worlds.find((w) => w.ring === 0);
  const carryOk = carryPeople(S, w0.id, hull, purse, 1) !== null;
  const pay1 = ct ? deliverPeople(S, ct, hull, purse) : 0;
  const pay2 = ct ? deliverPeople(S, ct, hull, purse) : -1;
  check("ark: a starving far station posts the contract to move people, and delivering pays the escrow once",
    auditOk && hasContract && carryOk && pay1 > 0 && pay2 === 0);
}

{ // 17. twin station books from one rolled seed agree
  const worldC = setupWorld(); runTrades(worldC.S, worldC.purse, worldC.hull, worldC.crew, mulberry32(TWIN_SEED), 200);
  const worldD = setupWorld(); runTrades(worldD.S, worldD.purse, worldD.hull, worldD.crew, mulberry32(TWIN_SEED), 200);
  const ok = JSON.stringify(worldC.S.stations) === JSON.stringify(worldD.S.stations) && JSON.stringify(worldC.purse) === JSON.stringify(worldD.purse);
  check("ark: twin station books from one rolled seed agree", ok);
}

console.log(`gravitys-ark-test: ${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
console.log("gravitys-ark-test PASS");
