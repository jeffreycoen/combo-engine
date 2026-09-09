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
import { makeBuilder } from "../src/modules/builder/builder.js";
import { weldLoads, breaking, splitByRoot } from "../src/modules/weldstress/weldstress.js";
import { accel } from "../src/modules/wells/wells.js";
import { WRECK_DIALS, shellDv, shell, shellOnHull, wreckOf, shedToWrecks, makeField, stepWrecks, makeGrappler, cast, stepGrappler, take, massOf } from "../src/games/gravitys-ark/wrecks.js";
import { PRICE_DIALS, herPrice, listingsFor, makePirates, stepPirates, pay, killPirate, hireValue, hireOut, herReturns } from "../src/games/gravitys-ark/price.js";
import { makeBook } from "../src/modules/escrow/escrow.js";
import { GATE_DIALS, ENDINGS, makeGate, atGate, need, fixGate, payToll, sellToFitters, pass as gatePass, aheadOfEdge, respawn, checkGateState } from "../src/games/gravitys-ark/gate.js";
import { ARK_LINES, makeLog, logFromJSON, galaxyName, buildCard, checkCard } from "../src/games/gravitys-ark/card.js";
import { receiptLog } from "../src/modules/receipts/receipts.js";
import { makeGround, order as groundOrder, tick as groundTick, hash as groundHash, GROUND_DIALS, crashHull, looseModules, weldBack, HULL_DIALS, fieldCrew, herBody, stepHer, HER, wreckWalker, walkerAlive, setStick, WALKER, standOff, SHAPE, shapeOf, summary as groundSummary } from "../src/games/gravitys-ark/ground.js";
import { SQUAD_SPECS } from "../src/depot/squads.js";
import { INFANTRY_ARMS } from "../src/depot/specs.js";

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
  let ok = d0.m === 5200 && d0.F === 60000 && d0.fuelCap === 3000;   // the starter carries the mech bay: 3,400 kg and 1,800 more
  const strutIdx = hull.list.length;
  ok = ok && install(hull, "strut", 2, 0) === true;
  ok = ok && derive(hull).m === 5350;
  ok = ok && install(hull, "strut", 5, 5) === false;
  const bridgeIdx = hull.list.findIndex((m) => m.t === "bridge");
  ok = ok && remove(hull, bridgeIdx) === false;
  ok = ok && remove(hull, strutIdx) === true;
  ok = ok && derive(hull).m === 5200;
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

const rollIn = (lo, hi) => lo + rng() * (hi - lo);

// the module table, the order's own, repeated here as the gate's copy

// the stand-in star and its wells list, the pit first (and only)
const star = { x: 0, y: 0, r: 4000, g: 30, soft: 1000, mu: 30 * Math.pow(4000 * 4000 + 1000 * 1000, 1.65) };
const wells = [{ ...star, name: "hole" }];

const newBuilder = () => makeBuilder({ spec: MODULES, cell: 1.7, weldStrength: 1.2e5, weldWeak: 5e4, baseFuel: 0 });
const newHull = () => ({ builder: newBuilder(), list: STARTER_HULL.slice(), scrap: 0, spares: [], cargo: [] });

{ // 18. the shell's shove falls off with distance, points outward, and never touches worlds
  let ok = true;
  const bodies = [];
  for (let i = 0; i < 100; i++) {
    const dist = rollIn(1000, 200000);
    const ang = rng() * 2 * Math.PI;
    bodies.push({ x: Math.cos(ang) * dist, y: Math.sin(ang) * dist, vx: 0, vy: 0, mass: 1 });
  }
  const worlds = [{ id: 0, i: 0, x: 111, y: 222, r: 700, g: 9, soft: 175, mu: 42, state: "alive" }];
  const worldsBefore = JSON.stringify(worlds);
  const dvs = shell(bodies, star, WRECK_DIALS);
  const rows = bodies.map((b, i) => ({ dist: Math.hypot(b.x - star.x, b.y - star.y), dv: dvs[i], vx: b.vx, vy: b.vy, x: b.x, y: b.y }));
  for (const r of rows) {
    ok = ok && r.dv === shellDv(r.dist, WRECK_DIALS);
    const ux = r.dist === 0 ? 1 : (r.x - star.x) / r.dist, uy = r.dist === 0 ? 0 : (r.y - star.y) / r.dist;
    ok = ok && (r.vx * ux + r.vy * uy) > 0;
  }
  const sorted = rows.slice().sort((a, b) => a.dist - b.dist);
  for (let i = 1; i < sorted.length; i++) ok = ok && sorted[i].dv <= sorted[i - 1].dv;
  ok = ok && JSON.stringify(worlds) === worldsBefore;
  check("ark: the shell's shove falls off with distance, points outward, and never touches worlds", ok);
}

{ // 19. the shell breaks welds by the weldstress law and the shed modules become wrecks with their mass
  let ok = true;
  const dist19 = rollIn(0, 20000);
  const ang19 = rng() * 2 * Math.PI;
  const ship19 = { x: Math.cos(ang19) * dist19, y: Math.sin(ang19) * dist19, vx: 0, vy: 0, dry: 3400, fuel: 0 };
  const hull19 = newHull();
  const list19 = hull19.list;
  const result = shellOnHull(hull19, star, ship19, WRECK_DIALS);
  const ws = hull19.builder.weldsOf(list19);
  const loads = weldLoads(hull19.builder, MODULES, list19, ws, result.a, 1);   // re-taught with the module: the load factor 1 at the order's scale
  const broken = breaking(loads, ws);
  const ws2 = ws.filter((w, k) => !broken.includes(k));
  const split = splitByRoot(hull19.builder, list19, ws2, 0);
  ok = ok && JSON.stringify(result.shed) === JSON.stringify(split.gone);
  ok = ok && JSON.stringify(result.kept) === JSON.stringify(split.kept);
  ok = ok && JSON.stringify(hull19.list) === JSON.stringify(split.kept);

  const wrecks19 = shedToWrecks(result.shed, ship19, rng);
  ok = ok && wrecks19.length === result.shed.length;
  const shedKg = result.shed.reduce((s, m) => s + MODULES[m.t].kg, 0);
  const wreckKg = wrecks19.reduce((s, w) => s + w.mass, 0);
  ok = ok && Math.abs(shedKg - wreckKg) < 1e-9;

  const shipFar = { x: 500000, y: 0, vx: 0, vy: 0, dry: 3400, fuel: 0 };
  const hullFar = newHull();
  const resultFar = shellOnHull(hullFar, star, shipFar, WRECK_DIALS);
  ok = ok && resultFar.shed.length === 0;
  ok = ok && JSON.stringify(hullFar.list) === JSON.stringify(STARTER_HULL);

  check("ark: the shell breaks welds by the weldstress law and the shed modules become wrecks with their mass", ok);
}

{ // 20. wrecks fall toward the pit under the wells law
  let ok = true;
  const field20 = makeField(star, rng, WRECK_DIALS);
  for (const w of field20) { w.vx = 0; w.vy = 0; }
  const pre = field20.map((w) => [w.x, w.y]);
  stepWrecks(field20, wells, 1 / 60);
  for (let i = 0; i < field20.length; i++) {
    const w = field20[i];
    const [px, py] = pre[i];
    const [ax, ay] = accel(wells, px, py);
    const dirx = star.x - px, diry = star.y - py;
    ok = ok && (w.vx * dirx + w.vy * diry) > 0;
    const expectMag = Math.hypot(ax, ay) * (1 / 60);
    const actualMag = Math.hypot(w.vx, w.vy);
    ok = ok && Math.abs(actualMag - expectMag) <= 1e-9 * Math.max(expectMag, 1e-12);
  }
  check("ark: wrecks fall toward the pit under the wells law", ok);
}

{ // 21. the grappler reels a wreck in and books its mass on the ledger
  let ok = true;
  const shipMass21 = 3400;
  const ship21 = { x: 0, y: 0, vx: 0, vy: 0, dry: shipMass21, fuel: 0 };
  const wreckMass21 = WRECK_DIALS.scrapMin + rng() * (WRECK_DIALS.scrapMax - WRECK_DIALS.scrapMin);
  const wreck21 = wreckOf("scrap", 40, 0, 0, 0, wreckMass21);
  const wrecks21 = [wreck21];
  const hull21 = newHull();
  const purse21 = { credits: 0 };

  const ledger21 = makeLedger({ dimensions: ["mass"] });
  ledger21.declare("mass", massOf(hull21, wrecks21));
  ledger21.seal();
  ledger21.source("hull+wrecks", () => ({ mass: massOf(hull21, wrecks21) }));
  const auditBefore = ledger21.audit();
  ok = ok && auditBefore.ok && auditBefore.drift.mass === 0;

  // no wells handed in: check 21 is the rope's own mechanics, not the pit's
  // pull; at any real distance from this fixture star its pull overpowers a
  // 34 m/s, 95 m grapple shot outright (a separate finding, reported).
  const gr21 = makeGrappler(ship21);
  cast(gr21, ship21, shipMass21, wreck21, WRECK_DIALS);
  let takenResult = null;
  for (let i = 0; i < 3000 && !takenResult; i++) {
    const r = stepGrappler(gr21, ship21, shipMass21, [], 1 / 60, WRECK_DIALS);
    if (r && r.taken) takenResult = r.taken;
  }
  ok = ok && !!takenResult;
  if (takenResult) take(hull21, purse21, wreck21);

  const auditAfter = ledger21.audit();
  ok = ok && auditAfter.ok && auditAfter.drift.mass === 0;

  console.log(`  check 21 detail: wreck mass ${wreckMass21.toFixed(1)} kg, final grapple state ${gr21.g ? gr21.g.state : "null"}, taken ${!!takenResult}`);
  check("ark: the grappler reels a wreck in and books its mass on the ledger", ok);
}

{ // 22. twin wreck fields from one rolled seed agree
  const seed22 = Math.floor(rng() * 0xffffffff) >>> 0;
  console.log(`twin seed (check 22): ${seed22}`);
  const streamA = mulberry32(seed22), streamB = mulberry32(seed22);
  const fieldA = makeField(star, streamA, WRECK_DIALS);
  const fieldB = makeField(star, streamB, WRECK_DIALS);
  for (let i = 0; i < 60; i++) { stepWrecks(fieldA, wells, 1 / 60); stepWrecks(fieldB, wells, 1 / 60); }
  const ok = JSON.stringify(fieldA) === JSON.stringify(fieldB);
  check("ark: twin wreck fields from one rolled seed agree", ok);
}







{ // 23. the lock, the demand, pay or outrun, and the shot clock
  const G = makeGalaxy(SEED);
  if (!G.worlds.some((w) => w.holder === "wreckers")) G.worlds[1].holder = "wreckers";
  const P = makePirates(G, rng);
  const p = P.list[0];
  const ring = G.worlds[p.i].ring;
  let ok = true;

  const ship = { x: p.x + 2000, y: p.y, vx: 0, vy: 0 };
  const cargo = Math.round(rng() * 20000);
  let ev = stepPirates(P, ship, ring, cargo, 1 / 60);
  if (!ev.some((e) => e.k === "chase") || p.state !== "chase") ok = false;

  ship.x = p.x + 100;
  ev = stepPirates(P, ship, ring, cargo, 1 / 60);
  const lockEv = ev.find((e) => e.k === "lock");
  const wantDemand = Math.max(herPrice(ring), cargo);
  if (!lockEv || lockEv.demand.demand !== wantDemand) ok = false;

  ship.x = p.x + 5000;
  ev = stepPirates(P, ship, ring, cargo, 1 / 60);
  if (!ev.some((e) => e.k === "outrun") || p.state !== "roost" || p.demand !== null) ok = false;

  ship.x = p.x + 100;
  stepPirates(P, ship, ring, cargo, 1 / 60);
  stepPirates(P, ship, ring, cargo, 1 / 60);
  if (p.state !== "lock") ok = false;

  const dt = 1 / 60;
  let ticks = 0, fired = false, fireTicks = 0, shot = false;
  for (let k = 0; k < 1200 && !shot; k++) {
    ev = stepPirates(P, ship, ring, cargo, dt);
    ticks++;
    const t = ticks * dt;
    const f = ev.find((e) => e.k === "fire");
    if (f && !fired) {
      fired = true; fireTicks = ticks;
      if (Math.abs(t - PRICE_DIALS.lockT) > dt) ok = false;
    }
    const sh = ev.find((e) => e.k === "shot");
    if (sh) {
      shot = true;
      const sinceFire = (ticks - fireTicks) * dt;
      if (Math.abs(sinceFire - PRICE_DIALS.shotEvery) > dt) ok = false;
      if (sh.damage !== 150) ok = false;
    }
  }
  if (!fired || !shot) ok = false;

  const hull = { scrap: 400, cargo: { people: 2 }, spares: ["s1", "s2"] };
  p.demand = { takes: "cargo" };
  const takes1 = pay(P, p, hull, {});
  if (takes1 !== "cargo" || !p.loot || p.loot.scrap !== 400 || p.loot.people !== 2 ||
      p.loot.spares.length !== 2 || hull.scrap !== 0 || hull.cargo.people !== 0 ||
      hull.spares.length !== 0 || p.demand !== null) ok = false;

  p.demand = { takes: "her" };
  const herObj = {};
  const takes2 = pay(P, p, hull, herObj);
  if (takes2 !== "her" || herObj.taken !== true || p.demand !== null) ok = false;

  check("ark: the lock, the demand, pay or outrun, and the shot clock", ok);
}

{ // 24. her price rises every ring and the listings follow it
  const G = makeGalaxy(SEED);
  if (!G.worlds.some((w) => w.holder === "wreckers")) G.worlds[1].holder = "wreckers";
  const P = makePirates(G, rng);
  void P;
  let ok = true;
  const h0 = herPrice(0), h1 = herPrice(1), h2 = herPrice(2);
  if (!(h0 < h1 && h1 < h2)) ok = false;
  for (let k = 0; k < 50 && ok; k++) {
    const ring = Math.floor(rng() * 3);
    const cargo = Math.round(rng() * 30000);
    const her = herPrice(ring);
    const L = listingsFor(ring, cargo);
    if (L.wreckers.demand !== Math.max(her, cargo)) ok = false;
    if (L.wreckers.takes !== (cargo > her ? "cargo" : "her")) ok = false;
    if (!(L.fitters.her > her)) ok = false;
  }
  check("ark: her price rises every ring and the listings follow it", ok);
}

{ // 25. the bounty moves from the Authority's purse
  const G = makeGalaxy(SEED);
  if (!G.worlds.some((w) => w.holder === "wreckers")) G.worlds[1].holder = "wreckers";
  const P = makePirates(G, rng);
  const p = P.list[0];
  const purse = { credits: 1000 };
  const ledger = makeLedger({ dimensions: ["credits"] });
  ledger.declare("credits", P.authority.credits + purse.credits);
  ledger.seal();
  ledger.source("authority", () => ({ credits: P.authority.credits }));
  ledger.source("purse", () => ({ credits: purse.credits }));
  let ok = true;
  if (!ledger.audit().ok) ok = false;
  const paid1 = killPirate(P, p, purse);
  if (paid1 !== PRICE_DIALS.bounty) ok = false;
  if (!ledger.audit().ok) ok = false;
  const paid2 = killPirate(P, p, purse);
  if (paid2 !== 0) ok = false;
  if (!ledger.audit().ok) ok = false;
  check("ark: the bounty moves from the Authority's purse", ok);
}

{ // 26. the hire-out pays more nearer the edge and pays once
  const G = makeGalaxy(SEED);
  if (!G.worlds.some((w) => w.holder === "wreckers")) G.worlds[1].holder = "wreckers";
  const P = makePirates(G, rng);
  void P;
  const stations = {
    near: { credits: 15000, cool: 0, parts: {} },
    far: { credits: 15000, cool: 0, parts: {} },
  };
  const stationNear = { x: 30000, y: 0 };
  const stationFar = { x: 120000, y: 0 };
  const hole = { born: true, edge: 10000 };
  let ok = true;
  const vNear = hireValue(stationNear, hole);
  const vFar = hireValue(stationFar, hole);
  if (!(vNear > vFar)) ok = false;

  const book = makeBook();
  const purse = { credits: 0 };
  const ledger = makeLedger({ dimensions: ["credits"] });
  ledger.declare("credits", stations.near.credits + stations.far.credits + purse.credits);
  ledger.seal();
  ledger.source("stations", () => ({ credits: Object.values(stations).reduce((s, m) => s + m.credits, 0) }));
  ledger.source("purse", () => ({ credits: purse.credits }));
  ledger.source("escrow", () => ({ credits: book.list.reduce((s, c) => s + (c.open ? c.escrow : 0), 0) }));
  if (!ledger.audit().ok) ok = false;

  const her = {};
  const creditsBefore = stations.near.credits;
  const ct = hireOut(book, stations, "near", stationNear, hole, her, 0);
  const wantEscrow = Math.min(creditsBefore, book.dials.rescueBase + Math.round(vNear * book.dials.rescueCut));
  if (!ct || ct.escrow !== wantEscrow || !her.away) ok = false;
  if (!ledger.audit().ok) ok = false;

  const paid0 = herReturns(stations, her, purse, her.away.until - 1);
  if (paid0 !== 0) ok = false;
  if (!ledger.audit().ok) ok = false;

  const until = her.away.until;
  const paid1 = herReturns(stations, her, purse, until);
  if (paid1 !== wantEscrow) ok = false;
  if (!ledger.audit().ok) ok = false;

  const paid2 = herReturns(stations, her, purse, until);
  if (paid2 !== 0) ok = false;
  if (!ledger.audit().ok) ok = false;

  check("ark: the hire-out pays more nearer the edge and pays once", ok);
}

{ // 27. twin pirate fields from one rolled seed agree
  const G = makeGalaxy(SEED);
  if (!G.worlds.some((w) => w.holder === "wreckers")) G.worlds[1].holder = "wreckers";
  const s = Math.floor(rng() * 2 ** 32);
  const rngA = mulberry32(s);
  const rngB = mulberry32(s);
  const P1 = makePirates(G, rngA);
  const P2 = makePirates(G, rngB);
  const p0 = P1.list[0];
  const ship = { x: p0.x + 2000, y: p0.y, vx: 0, vy: 0 };
  const ring = G.worlds[p0.i].ring;
  for (let k = 0; k < 120; k++) {
    stepPirates(P1, ship, ring, 0, 1 / 60);
    stepPirates(P2, ship, ring, 0, 1 / 60);
  }
  const ok = JSON.stringify(P1) === JSON.stringify(P2);
  check("ark: twin pirate fields from one rolled seed agree", ok);
}














function arkFixture() {
  const G = makeGalaxy(SEED);
  const w0 = G.worlds[0];
  const ship = { x: w0.x, y: w0.y + w0.r, vx: 0, vy: 0, dry: 3400, fuel: 3000, thrust: 60000, landed: 0, alive: true };
  const hull = { list: [{ t: "bridge", gx: 0, gy: 0 }, { t: "engine", gx: -1, gy: 0 }, { t: "tank", gx: 1, gy: 0 }, { t: "pod", gx: 0, gy: 1 }], scrap: 0, spares: [], cargo: { people: 0 } };
  const purse = { credits: 20000, debt: 0, lastDock: 0 };
  const her = { taken: false, away: null, sold: false };
  const gs = makeGate(G);
  return { G, ship, hull, purse, her, gs };
}

const keysARK = Object.keys(ARK_LINES);
function rollArkFields(type, i, nWorlds) {
  switch (type) {
    case "land": case "crash": return { i: i % nWorlds, v: rng() * 30 };
    case "takeoff": case "swallow": return { i: i % nWorlds };
    case "death": return { v: rng() * 30 };
    case "hire": return { name: "Rolled Hand " + i };
    case "dock": return { due: Math.round(rng() * 500) };
    case "buy": return { n: 1 + Math.floor(rng() * 10), part: "scrap", cost: Math.round(rng() * 5000) };
    case "sell": return { n: 1 + Math.floor(rng() * 10), part: "scrap", out: Math.round(rng() * 5000) };
    case "lock": case "pay": return { takes: "cargo" };
    case "shot": return { damage: Math.round(rng() * 100) };
    case "kill": return { bounty: 3000 };
    case "hireout": return { pay: Math.round(rng() * 5000) };
    case "toll": return { toll: Math.round(rng() * 12000) };
    case "sold": return { kind: "scrap", price: Math.round(rng() * 5000) };
    case "pass": return { ending: ENDINGS[Math.floor(rng() * ENDINGS.length)] };
    case "respawn": return { world: i % nWorlds, debt: 5000 };
    default: return {};
  }
}

{ // 28. ark: the gate opens only when she has paid its bill in time, scrap, and modules
  let ok = true;
  const dt = 1 / 60;

  const f1 = arkFixture();
  f1.hull.scrap = f1.gs.bill.scrap;
  f1.hull.spares = new Array(f1.gs.bill.modules).fill("strut");
  let crossedRight = false, needAtFix = null;
  const cap1 = Math.ceil(f1.gs.bill.time / dt) + 5;
  for (let i = 0; i < cap1; i++) {
    const wasFixed = f1.gs.fixed;
    const n = fixGate(f1.gs, f1.hull, f1.her, dt);
    if (!wasFixed && f1.gs.fixed) { crossedRight = true; needAtFix = n; break; }
  }
  if (!crossedRight) ok = false;
  if (needAtFix && (needAtFix.time !== 0 || needAtFix.scrap !== 0 || needAtFix.modules !== 0)) ok = false;

  const f2 = arkFixture();
  f2.hull.scrap = f2.gs.bill.scrap;
  f2.hull.spares = new Array(f2.gs.bill.modules).fill("strut");
  f2.her.taken = true;
  const snapshot = JSON.stringify(f2.gs);
  for (let i = 0; i < 600; i++) fixGate(f2.gs, f2.hull, f2.her, dt);
  if (JSON.stringify(f2.gs) !== snapshot) ok = false;

  const f3 = arkFixture();
  f3.hull.scrap = f3.gs.bill.scrap;
  f3.hull.spares = [];
  const cap3 = Math.ceil(f3.gs.bill.time / dt) + 5;
  let n3;
  for (let i = 0; i < cap3; i++) n3 = fixGate(f3.gs, f3.hull, f3.her, dt);
  if (f3.gs.fixed !== false) ok = false;
  if (n3.modules !== f3.gs.bill.modules) ok = false;

  check("ark: the gate opens only when she has paid its bill in time, scrap, and modules", ok);
}

{ // 29. ark: the toll moves to the Authority and passing needs the fix, the toll, and the place
  let ok = true;
  const { G, ship, hull, purse, her, gs } = arkFixture();
  hull.scrap = gs.bill.scrap + 50;
  hull.spares = new Array(gs.bill.modules).fill("strut").concat(["engine"]);
  hull.cargo.people = 4;

  const ledger = makeLedger({ dimensions: ["credits"] });
  ledger.declare("credits", purse.credits + gs.authority.credits + gs.fitters.credits);
  ledger.source("purse", () => ({ credits: purse.credits }));
  ledger.source("authority", () => ({ credits: gs.authority.credits }));
  ledger.source("fitters", () => ({ credits: gs.fitters.credits }));
  ledger.seal();

  ship.x = G.gate.x; ship.y = G.gate.y;
  if (gatePass(gs, ship, G, her) !== null) ok = false; // before the fix

  const dt = 1 / 60;
  const cap = Math.ceil(gs.bill.time / dt) + 5;
  for (let i = 0; i < cap && !gs.fixed; i++) fixGate(gs, hull, her, dt);
  if (!gs.fixed) ok = false;

  if (gatePass(gs, ship, G, her) !== null) ok = false; // before the toll

  const p1 = payToll(gs, purse);
  if (p1 !== gs.toll) ok = false;
  const p2 = payToll(gs, purse);
  if (p2 !== 0) ok = false;

  const priceSpare = sellToFitters(gs, hull, purse, { kind: "spare", k: "strut" });
  const priceScrap = sellToFitters(gs, hull, purse, { kind: "scrap", kg: 50 });
  const pricePeople = sellToFitters(gs, hull, purse, { kind: "people", n: 4 });
  if (priceSpare === null || priceScrap === null || pricePeople === null) ok = false;

  const audit = ledger.audit();
  if (!audit.ok) ok = false;

  ship.x = G.gate.x + 1e6; ship.y = G.gate.y;
  if (gatePass(gs, ship, G, her) !== null) ok = false; // away from the gate

  ship.x = G.gate.x; ship.y = G.gate.y;
  const ending1 = gatePass(gs, ship, G, her);
  if (ending1 !== ENDINGS[0]) ok = false;

  her.sold = true;
  const ending2 = gatePass(gs, ship, G, her);
  if (ending2 !== ENDINGS[2]) ok = false;

  check("ark: the toll moves to the Authority and passing needs the fix, the toll, and the place", ok);
}

{ // 30. ark: death wakes at a station ahead of the edge with mercy fuel and debt, or ends the road
  let ok = true;
  const { G, ship, hull, purse } = arkFixture();
  const state = { hole: { born: true, edge: 0, swallowed: [] } };

  ship.landed = null;
  ship.x = G.worlds[1].x + 500;
  ship.y = G.worlds[1].y + G.worlds[1].r + 500;
  ship.alive = false;
  const sx = ship.x, sy = ship.y;

  let expected = G.worlds[0], bestDist = Infinity;
  for (const w of G.worlds) {
    const dist = Math.hypot(sx - w.x, sy - w.y);
    if (dist < bestDist) { bestDist = dist; expected = w; }
  }

  const lostParts = hull.list.map((m) => m.t);
  const res = respawn(G, ship, state, hull, purse, GATE_DIALS);

  if (res.world !== expected.i) ok = false;
  if (ship.landed !== expected.i) ok = false;
  if (Math.abs(ship.x - expected.x) > 1e-9 || Math.abs(ship.y - (expected.y + expected.r)) > 1e-9) ok = false;
  if (ship.alive !== true) ok = false;
  if (ship.fuel !== GATE_DIALS.mercyFuel) ok = false;
  if (ship.dry !== GATE_DIALS.starterDry) ok = false;
  if (purse.debt !== GATE_DIALS.respawnDebt) ok = false;
  if (res.debt !== purse.debt) ok = false;
  if (JSON.stringify(G.worlds[expected.i].left) !== JSON.stringify(lostParts)) ok = false;

  const f2 = arkFixture();
  const farEdge = Math.max(...f2.G.worlds.map((w) => Math.hypot(w.x, w.y) - w.r)) + 1e6;
  const state2 = { hole: { born: true, edge: farEdge, swallowed: [] } };
  const res2 = respawn(f2.G, f2.ship, state2, f2.hull, f2.purse, GATE_DIALS);
  if (res2.ending !== ENDINGS[4]) ok = false;

  check("ark: death wakes at a station ahead of the edge with mercy fuel and debt, or ends the road", ok);
}

{ // 31. ark: the log's lines come from the receipts module and the card carries the name from the log
  let ok = true;
  const { G, hull } = arkFixture();

  const log = makeLog();
  for (let i = 0; i < 20; i++) {
    const type = keysARK[Math.floor(rng() * keysARK.length)];
    log.add(type, i, rollArkFields(type, i, G.n));
  }
  const linesA = log.lines();
  const linesB = receiptLog(log.events, ARK_LINES);
  if (JSON.stringify(linesA) !== JSON.stringify(linesB)) ok = false;

  const log2 = logFromJSON(log.toJSON());
  if (JSON.stringify(log2.lines()) !== JSON.stringify(linesA)) ok = false;

  const nameLog = makeLog();
  nameLog.add("land", 0, { i: 1, v: 5 });
  nameLog.add("land", 1, { i: 1, v: 5 });
  nameLog.add("land", 2, { i: 0, v: 5 });
  nameLog.add("kill", 3, { bounty: 3000 });
  nameLog.add("kill", 4, { bounty: 3000 });
  nameLog.add("shot", 5, { damage: 10 });
  nameLog.add("buy", 6, { n: 10, part: "scrap", cost: 100 });
  nameLog.add("buy", 7, { n: 3, part: "people", cost: 100 });
  const name = galaxyName(nameLog, G);
  if (name !== G.worlds[1].climate + " · HUNTER · SCRAP") ok = false;

  const G2worlds = G.worlds.map((w, idx) => (idx === 2 ? { ...w, state: "gone" } : w));
  const G2 = { ...G, worlds: G2worlds };
  const crew = [{ name: "Ada Aske" }, { name: "Bram Brandt" }];
  const ending = ENDINGS[0];
  const card = buildCard(nameLog, G2, hull, crew, ending);
  if (card.ending !== ending) ok = false;
  if (JSON.stringify(card.manifest.hull) !== JSON.stringify(hull.list.map((m) => m.t))) ok = false;
  if (JSON.stringify(card.manifest.hands) !== JSON.stringify(crew.map((h) => h.name))) ok = false;
  if (JSON.stringify(card.eaten) !== JSON.stringify([G2.worlds[2].id])) ok = false;
  if (checkCard(card).length !== 0) ok = false;
  if (checkCard(null).length !== 1) ok = false;

  check("ark: the log's lines come from the receipts module and the card carries the name from the log", ok);
}

{ // 32. ark: twin cards from one rolled seed agree
  const seed32 = rollSeed();
  const galaxyH = makeGalaxy(seed32);
  const galaxyI = makeGalaxy(seed32);

  const events = [];
  for (let i = 0; i < 20; i++) {
    const type = keysARK[Math.floor(rng() * keysARK.length)];
    events.push({ type, t: i, data: rollArkFields(type, i, galaxyH.n) });
  }

  const logH = makeLog();
  const logI = makeLog();
  for (const e of events) { logH.add(e.type, e.t, e.data); logI.add(e.type, e.t, e.data); }

  const hullTwin = { list: [{ t: "bridge", gx: 0, gy: 0 }, { t: "engine", gx: -1, gy: 0 }, { t: "tank", gx: 1, gy: 0 }, { t: "pod", gx: 0, gy: 1 }], scrap: 40, spares: ["strut"], cargo: { people: 2 } };
  const crewTwin = [{ name: "Ada Aske" }];
  const ending = ENDINGS[1];

  const cardH = buildCard(logH, galaxyH, hullTwin, crewTwin, ending);
  const cardI = buildCard(logI, galaxyI, hullTwin, crewTwin, ending);

  const ok = JSON.stringify(cardH) === JSON.stringify(cardI);
  check("ark: twin cards from one rolled seed agree", ok);
}















// one further rolled seed, off the same stream, for the twin-identity checks (14, 17)

// the common harness every check builds: a fresh galaxy and stations from
// SEED, a purse, a hull (for cargo.people), an empty crew list, and a
// ledger with the five sources declared over them.
// the trades of check 12: at a rolled station, one of six kinds; a refused
// trade counts as a trade. Shared by checks 12 and 17 so 17 truly replays 12.








{ // 38. ark: the ground boots on coldsnap from the galaxy's seed, and twin boots are twins in every hash after one tick
  // 39. ark: the hold's scrap is the purse, a gun at the crash site spends it by coldsnap's build law, and what is left comes back up in kilograms
  const gSeed = rollSeed();
  const g = makeGalaxy(gSeed), w = g.worlds[0];
  const kg = 500 + Math.floor(rng() * 1000);
  const A = makeGround(gSeed, w, kg), B = makeGround(gSeed, w, kg);
  const purse0 = A.run.resources;   // read before the first tick: the ground pays by the tick
  groundTick(A, 1 / 120); groundTick(B, 1 / 120);
  check("ark: the ground boots on coldsnap from the galaxy's seed, and twin boots are twins in every hash", A.seed === B.seed && A.run.started === true && groundHash(A) === groundHash(B));
  const purse1 = A.run.resources, f = A.run.focus;
  let placed = null;
  for (let dz = -8; dz <= 8 && !placed; dz += 2) for (let dx = -8; dx <= 8 && !placed; dx += 2) { const r = groundOrder(A, "gun", f.x + dx, f.z + dz, "mg"); if (r.ok) placed = r; }
  const guns = A.world.bodies.filter((b) => b.alive && b.kind === "tower" && b.team === 1).length;
  const up = groundOrder(A, "takeoff");
  check("ark: the hold's scrap is the purse, a gun at the crash site spends it by coldsnap's build law, and what is left comes back up in kilograms",
    purse0 === Math.floor(kg / GROUND_DIALS.kgPerScrap) && purse1 > purse0 && !!placed && placed.cost > 0 && Math.abs(A.run.resources - (purse1 - placed.cost)) < 1e-9 && guns === 1 && up.ok && up.scrapKg === A.run.resources * GROUND_DIALS.kgPerScrap);
}

{ // 40. ark: the crash puts the hull on the ground as bodies welded by the weld-stress rule at a rolled speed, and twin crashes agree
  // 41. ark: TAKE OFF is refused while a module is loose, allowed once every loose module is welded back, and the dead are lost
  const gSeed = rollSeed(), g = makeGalaxy(gSeed), w = g.worlds[0], v = rng() * 30;
  const mk = (speed) => { const G = makeGround(gSeed, w, 900); const H = crashHull(G, makeHull(STARTER_HULL), speed); return { G, H }; };
  const A = mk(v), B = mk(v);
  const hull = makeHull(STARTER_HULL), ws = hull.builder.weldsOf(hull.list);
  const broken = new Set(breaking(weldLoads(hull.builder, MODULES, hull.list, ws, v / HULL_DIALS.crashStop, 1), ws));
  const keep = hull.builder.connectedFrom(hull.list, ws.filter((x, k) => !broken.has(k)), 0);
  const expectLoose = hull.list.map((m, i) => i).filter((i) => !keep.has(i));
  const expectWelds = ws.filter((x, k) => !broken.has(k) && keep.has(x.a) && keep.has(x.b)).length;
  const pos = (X) => JSON.stringify(X.H.bodies.map((b) => [b.pos.x, b.pos.y, b.pos.z, b.mass, b.alive]));
  check("ark: the crash puts the hull on the ground as bodies welded by the weld-stress rule at a rolled speed, and twin crashes agree",
    A.H.bodies.length === STARTER_HULL.length && A.H.bodies.every((b) => b.kind === "chunk" && b.alive && b.team === 1) && JSON.stringify(A.H.loose) === JSON.stringify(expectLoose) && A.H.welds.length === expectWelds && pos(A) === pos(B));
  const C = mk(30);   // at 30 m/s the engine's weld breaks by the rule: 1400 kg at 100 m/s/s beats 120000 N; the rule says what else does
  const ws30 = hull.builder.weldsOf(hull.list), broken30 = new Set(breaking(weldLoads(hull.builder, MODULES, hull.list, ws30, 30 / HULL_DIALS.crashStop, 1), ws30));
  const keep30 = hull.builder.connectedFrom(hull.list, ws30.filter((x, k) => !broken30.has(k)), 0), expectLoose30 = hull.list.map((m, i) => i).filter((i) => !keep30.has(i));
  const refused = groundOrder(C.G, "takeoff");
  for (const i of looseModules(C.G)) weldBack(C.G, i);
  const allowed = groundOrder(C.G, "takeoff");
  C.H.bodies[3].alive = false; C.H.bodies[3].hp = 0;
  const lostPod = groundOrder(C.G, "takeoff");
  C.H.bodies[0].alive = false; C.H.bodies[0].hp = 0;
  const abandoned = groundOrder(C.G, "takeoff");
  check("ark: TAKE OFF is refused while a module is loose, allowed once every loose module is welded back, and the dead are lost",
    JSON.stringify(C.H.loose) === JSON.stringify(expectLoose30) && C.H.loose.includes(1) && !refused.ok && refused.loose.length === C.H.loose.length && allowed.ok && allowed.lost.length === 0 && allowed.keptList.length === STARTER_HULL.length
    && lostPod.ok && lostPod.lost.length === 1 && lostPod.lost[0] === "pod" && lostPod.keptList.length === STARTER_HULL.length - 1 && !abandoned.ok && abandoned.abandoned === true);
}

{ // 42. ark: she takes the field as a squad of one on her own row and the hands as rifles by name, and twin fields agree
  // 43. ark: FIX sends her to the nearest loose module with her fire held, the weld-back lands when her seconds run down within reach, and FIGHT frees her fire
  // 44. ark: a WALL order gives her squad coldsnap's build line, section by section
  const gSeed = rollSeed(), g = makeGalaxy(gSeed), w = g.worlds[0];
  const crew = [{ name: "Aud" }, { name: "Bjorn" }];
  const mk = () => { const G = makeGround(gSeed, w, 900); crashHull(G, makeHull(STARTER_HULL), 30); fieldCrew(G, crew); return G; };
  const A = mk(), B = mk();
  const place = (G) => JSON.stringify(G.run.squads.map((sq) => [sq.type, sq.memberIds.map((id) => { const u = G.world.byId.get(id); return [u.pos.x, u.pos.z, u.handName || null]; })]));
  const herSq = A.her.squad, hb = herBody(A);
  const hands = A.hands.map((h) => A.world.byId.get(h.id));
  check("ark: she takes the field as a squad of one on her own row and the hands as rifles by name, and twin fields agree",
    SQUAD_SPECS.her && INFANTRY_ARMS.her && herSq.type === "her" && herSq.memberIds.length === 1 && !!hb && hb.utype === "her" && hb.team === 1
    && A.hands.length === 2 && hands.every((u) => u && u.alive && u.utype === "rifles") && hands.map((u) => u.handName).join(",") === "Aud,Bjorn" && place(A) === place(B));
  const loose0 = looseModules(A).length;
  const fix = groundOrder(A, "fix");
  const m = A.hull.bodies[fix.target], slid = Math.hypot(m.pos.x - A.hull.slots[fix.target].x, m.pos.z - A.hull.slots[fix.target].z);
  const sent = fix.ok && fix.target === 1 && herSq.order === "move" && herSq.holdFire === true && A.her.act === "fix" && Math.abs(fix.seconds - (HER.repairBase + HER.repairPerM * slid)) < 1e-9;
  hb.pos.x = m.pos.x + HER.reach * 0.5; hb.pos.z = m.pos.z;   // she stands within reach
  const ev = stepHer(A, fix.seconds);
  const welded = ev.some((e) => e.k === "repaired") && looseModules(A).length === loose0 - 1 && A.her.act === "hold" && herSq.holdFire === false;
  const fight = groundOrder(A, "fight");
  check("ark: FIX sends her to the nearest loose module with her fire held, the weld-back lands when her seconds run down within reach, and FIGHT frees her fire",
    sent && welded && fight.ok && herSq.holdFire === false && herSq.order === "defend" && A.her.act === "fight");
  const s0 = A.hull.slots[0], ax = A.hull.axis, wz = (ax.r.x !== 0 ? A.hull.bodies[0].hx : A.hull.bodies[0].hz) + 14;   // a line across the site line, well off the bridge's free side, clear of every module
  const wall = groundOrder(A, "wall", s0.x - ax.r.x * wz - ax.u.x * 6, s0.z - ax.r.z * wz - ax.u.z * 6, { x: s0.x - ax.r.x * wz + ax.u.x * 6, z: s0.z - ax.r.z * wz + ax.u.z * 6 });
  check("ark: a WALL order gives her squad coldsnap's build line, section by section",
    wall.ok && wall.sections > 0 && !!herSq._build && herSq._build.kind === "walls" && herSq._build.rows.length === wall.sections && herSq.order === "build" && A.her.act === "wall");
}

{ // 45. ark: the walker lies wrecked at the crash and stands once her seconds at the wreck run down, coldsnap's own mech on her side, and twin raisings agree
  // 46. ark: FIGHT with the walker up takes it through coldsnap's possession door, the stick feeds its commands, and HOLD gives it back
  // 47. ark: the walker down comes back as its event, her act ends, and the possession is released
  const gSeed = rollSeed(), g = makeGalaxy(gSeed), w = g.worlds[0];
  const mk = () => { const G = makeGround(gSeed, w, 900); crashHull(G, makeHull(STARTER_HULL), 10); fieldCrew(G, []); wreckWalker(G); return G; };
  const raise = (G) => { const r = groundOrder(G, "repairWalker"); const b = herBody(G); b.pos.x = G.walker.spot.x + 1; b.pos.z = G.walker.spot.z; const ev = stepHer(G, r.seconds); return { r, ev }; };
  const A = mk(), B = mk();
  const wrecked = !!A.walker && A.walker.wrecked && !walkerAlive(A) && A.walker.mech === null;
  const ra = raise(A), rb = raise(B);
  const hull = A.walker.mech ? A.walker.mech.hull : null;
  check("ark: the walker lies wrecked at the crash and stands once her seconds at the wreck run down, coldsnap's own mech on her side, and twin raisings agree",
    wrecked && ra.r.ok && ra.r.seconds === WALKER.repair && A.her.act === "hold" && ra.ev.some((e) => e.k === "walkerUp") && walkerAlive(A) && hull.team === 1 && A.walker.mech.s === WALKER.s
    && A.world.mechs.includes(A.walker.mech) && rb.ev.some((e) => e.k === "walkerUp") && JSON.stringify([hull.pos.x, hull.pos.y, hull.pos.z]) === JSON.stringify([B.walker.mech.hull.pos.x, B.walker.mech.hull.pos.y, B.walker.mech.hull.pos.z]));
  const fight = groundOrder(A, "fight");
  setStick(A, 0.8, 0, 0.5);
  A.input.feedMech(A.walker.mech, 1 / 120);
  const driven = A.walker.mech.state.cmdT.f === 0.8 && A.walker.mech.state.headingT === 0.5;
  const possessed = fight.ok && fight.walker === true && A.input.possess && A.input.possess.kind === "mech" && A.input.possess.id === hull.id && A.her.act === "walker" && A.her.squad.holdFire === true && A.walker.possessed === true;
  const hold = groundOrder(A, "hold");
  check("ark: FIGHT with the walker up takes it through coldsnap's possession door, the stick feeds its commands, and HOLD gives it back",
    possessed && driven && hold.ok && A.input.possess === null && A.input.feedMech === null && A.walker.possessed === false && A.her.act === "hold" && A.her.squad.holdFire === false);
  groundOrder(A, "fight");
  hull.alive = false; hull.hp = 0;
  const down = stepHer(A, 1 / 120);
  check("ark: the walker down comes back as its event, her act ends, and the possession is released",
    down.some((e) => e.k === "walkerDown") && !walkerAlive(A) && A.walker.alive === false && A.input.possess === null && A.her.act === "hold");
}

{ // 48. ark: REPAIR WALKER sends her to a stand just outside the walker's room, and her seconds run there
  // 49. ark: the walker's raise moves anyone of hers still inside its room out past its edge, alive, and leaves everyone outside where they stood
  const gSeed = rollSeed(), g = makeGalaxy(gSeed), w = g.worlds[0];
  const G = makeGround(gSeed, w, 900); crashHull(G, makeHull(STARTER_HULL), 10); fieldCrew(G, [{ name: "Cato" }, { name: "Dag" }]); wreckWalker(G);
  const spot = G.walker.spot, hb = herBody(G);
  const inside = (b) => Math.abs(spot.x - b.pos.x) <= b.hx + WALKER.room && Math.abs(spot.z - b.pos.z) <= b.hz + WALKER.room;
  const r = groundOrder(G, "repairWalker");
  const stand = G.her.squad.dest, st = standOff(G, hb);
  const standOut = !!stand && stand.x === st.x && stand.z === st.z && !inside({ pos: stand, hx: hb.hx, hz: hb.hz }) && Math.hypot(stand.x - spot.x, stand.z - spot.z) <= WALKER.reach;
  hb.pos.x = stand.x; hb.pos.z = stand.z;   // she arrives at the stand
  const t0 = G.her.actT, ev0 = stepHer(G, 1 / 120);
  check("ark: REPAIR WALKER sends her to a stand just outside the walker's room, and her seconds run there",
    r.ok && G.her.act === "repairWalker" && standOut && G.her.actT < t0 && !ev0.some((e) => e.k === "walkerUp"));
  const hands = G.hands.map((h) => G.world.byId.get(h.id));
  hb.pos.x = spot.x; hb.pos.z = spot.z;                                    // she stands on the spot itself
  hands[0].pos.x = spot.x + 1; hands[0].pos.z = spot.z - 1;               // one hand inside the room
  hands[1].pos.x = spot.x + WALKER.room + 3; hands[1].pos.z = spot.z;     // one hand outside it
  const far = { x: hands[1].pos.x, z: hands[1].pos.z };
  const ev = stepHer(G, G.her.actT + 1e-6);   // her seconds run out on this call: the room is cleared, the walker is built
  const all = [hb, hands[0], hands[1]];
  check("ark: the walker's raise moves anyone of hers still inside its room out past its edge, alive, and leaves everyone outside where they stood",
    ev.some((e) => e.k === "walkerUp") && walkerAlive(G) && all.every((b) => b.alive && !inside(b)) && hands[1].pos.x === far.x && hands[1].pos.z === far.z
    && [hb, hands[0]].every((b) => Math.max(Math.abs(b.pos.x - spot.x), Math.abs(b.pos.z - spot.z)) <= WALKER.room + 10));
}

{ // 50. ark: the hull lands at the ground's scale on the site line, axis-aligned and inside the rim, the bridge the homeland's centre, its footprints blocking the grid, and twin sites agree
  // 51. ark: the walker rides in the mech bay: wrecked at the bay's door with a bay aboard, absent without one or once lost, lost at TAKE OFF when it is down, and a new bay brings one
  const gSeed = rollSeed(), g = makeGalaxy(gSeed), w = g.worlds[0];
  const mk = (list) => { const G = makeGround(gSeed, w, 900); const H = crashHull(G, makeHull(list), 5); return { G, H }; };
  const A = mk(STARTER_HULL), B = mk(STARTER_HULL), f = A.G.run.focus, d = HULL_DIALS;
  const bridge = A.H.bodies[0], engine = A.H.bodies[1], bay = A.H.list.findIndex((m) => m.t === "mechbay");
  const scale = A.H.bodies.every((b, i) => { const sh = shapeOf(A.H.list[i], A.H.list, A.H.axis, d.unit); return b.hx === sh.hx && b.hy === sh.hy && b.hz === sh.hz && b.mass === MODULES[b.module].kg * d.kgPerKg; });
  const onLine = Math.abs(Math.hypot(bridge.pos.x - f.x, bridge.pos.z - f.z) - d.site) < 1e-9 && Math.abs(Math.hypot(engine.pos.x - bridge.pos.x, engine.pos.z - bridge.pos.z) - d.pitch) < 1e-9
    && (A.H.axis.u.x === 0 || A.H.axis.u.z === 0) && Math.hypot(engine.pos.x - f.x, engine.pos.z - f.z) < d.site;
  const inRim = A.H.bodies.every((b) => A.G.world.inRim(b.pos.x, b.pos.z));
  const centred = A.G.site.x === bridge.pos.x && A.G.site.z === bridge.pos.z;
  const stamped = A.H.stamped.length > 0 && A.H.bodies.every((b) => A.G.war.grid.cellAt(b.pos.x, b.pos.z).blocked === true);
  const onHull = groundOrder(A.G, "gun", bridge.pos.x, bridge.pos.z, "mg");
  const twin = JSON.stringify(A.H.slots) === JSON.stringify(B.H.slots);
  check("ark: the hull lands at the ground's scale on the site line, axis-aligned and inside the rim, the bridge the homeland's centre, its footprints blocking the grid, and twin sites agree",
    scale && onLine && inRim && centred && stamped && !onHull.ok && twin);
  fieldCrew(A.G, []);
  const W = wreckWalker(A.G), bayB = A.H.bodies[bay];
  const doorHalf = !!W && (Math.abs(W.spot.x - bayB.pos.x) > 1e-9 ? bayB.hx : bayB.hz);
  const atDoor = !!W && W.bay === bay && Math.abs(Math.max(Math.abs(W.spot.x - bayB.pos.x), Math.abs(W.spot.z - bayB.pos.z)) - (doorHalf + WALKER.door)) < 1e-9 && Math.min(Math.abs(W.spot.x - bayB.pos.x), Math.abs(W.spot.z - bayB.pos.z)) < 1e-9;
  const none = mk(STARTER_HULL.filter((m) => m.t !== "mechbay")); fieldCrew(none.G, []);
  const noBay = wreckWalker(none.G) === null && none.G.walker === null && !groundOrder(none.G, "repairWalker").ok;
  const lostHull = makeHull(STARTER_HULL); lostHull.walkerLost = true;
  const L = makeGround(gSeed, w, 900); crashHull(L, lostHull, 5); fieldCrew(L, []);
  const wasLost = wreckWalker(L) === null && L.hull.walkerLost === true;
  const rested = groundOrder(A.G, "takeoff").walkerLost === false;   // still wrecked in its bay: it rides
  const r = groundOrder(A.G, "repairWalker"); const hb = herBody(A.G); hb.pos.x = W.spot.x + 1; hb.pos.z = W.spot.z; stepHer(A.G, r.seconds);
  const up = walkerAlive(A.G);
  A.G.walker.mech.hull.alive = false; A.G.walker.mech.hull.hp = 0;
  const down = groundOrder(A.G, "takeoff");
  const bought = makeHull(STARTER_HULL.filter((m) => m.t !== "mechbay")); bought.walkerLost = true;
  const brings = install(bought, "mechbay", 1, 1) === true && bought.walkerLost === false;
  check("ark: the walker rides in the mech bay: wrecked at the bay's door with a bay aboard, absent without one or once lost, lost at TAKE OFF when it is down, and a new bay brings one",
    atDoor && noBay && wasLost && rested && r.ok && up && down.ok && down.walkerLost === true && brings);
}

{ // 52. ark: the ship's shapes on the ground are deadweight's at the ground's scale: each kind its own footprint and height, the bay taller than the walker, a strut a beam turned along its connections
  const ax = { u: { x: 0, z: -1 }, r: { x: 1, z: 0 } }, unit = HULL_DIALS.unit;
  const list = [{ t: "bridge", gx: 0, gy: 0 }, { t: "strut", gx: 1, gy: 0 }, { t: "strut", gx: 0, gy: 1 }, { t: "mechbay", gx: -1, gy: 0 }];
  const b = shapeOf(list[0], list, ax, unit), sAlong = shapeOf(list[1], list, ax, unit), sAcross = shapeOf(list[2], list, ax, unit), bay = shapeOf(list[3], list, ax, unit);
  const distinct = new Set(Object.keys(SHAPE).map((t) => SHAPE[t].join(","))).size;
  const near = (a, c) => Math.abs(a - c) < 1e-9;
  check("ark: the ship's shapes on the ground are deadweight's at the ground's scale: each kind its own footprint and height, the bay taller than the walker, a strut a beam turned along its connections",
    near(unit, HULL_DIALS.pitch / 4) && near(b.hz, 1.45 * unit) && near(b.hx, 1.45 * unit) && near(b.hy, unit) && near(sAlong.hz, 2.0 * unit) && near(sAlong.hx, 0.6 * unit)
    && near(sAcross.hx, 2.0 * unit) && near(sAcross.hz, 0.6 * unit) && bay.hy * 2 > 5.4 && near(bay.hx, 2.0 * unit) && distinct >= 8 && Object.keys(MODULES).every((t) => !!SHAPE[t]));
}

{ // 53. ark: the page's screens are their own files hooked into the main file, which draws nothing of space or the ground itself
  const read = (f) => readFileSync(f, "utf8");
  const main = read("docs/gravitys-ark/main.js"), space = read("docs/gravitys-ark/space.js"), look = read("docs/gravitys-ark/hull-look.js"), gscreen = read("docs/gravitys-ark/ground.js");
  check("ark: the page's screens are their own files hooked into the main file, which draws nothing of space or the ground itself",
    /export function makeSpaceScreen\(/.test(space) && main.includes('from "./space.js"') && !/function drawDisc\(|drawWrecks\(|makeRender2d|prismAt\(/.test(main)
    && /export function makeHullLook\(/.test(look) && gscreen.includes('from "./hull-look.js"') && /export function makeGroundScreen\(/.test(gscreen) && main.includes('from "./ground.js"'));
}

{ // 54. ark: her own row carries her hit points, coldsnap's riflemen stand guard beside her at the crash and clear of every module, and the summary counts them
  const gSeed = rollSeed(), g = makeGalaxy(gSeed), w = g.worlds[0];
  const G = makeGround(gSeed, w, 900); crashHull(G, makeHull(STARTER_HULL), 10); fieldCrew(G, [{ name: "Eir" }]);
  const hb = herBody(G), hp = HER.squad.member.hp;
  const men = G.guards.flatMap((sq) => sq.memberIds.map((id) => G.world.byId.get(id)));
  const clear = (u) => G.hull.bodies.every((m) => Math.abs(u.pos.x - m.pos.x) > m.hx + u.hx || Math.abs(u.pos.z - m.pos.z) > m.hz + u.hz);
  const s = groundSummary(G);
  check("ark: her own row carries her hit points, coldsnap's riflemen stand guard beside her at the crash and clear of every module, and the summary counts them",
    !!hb && hb.hp === hp && hb.maxHp === hp && hp > 58 && G.guards.length === HER.guards && G.guards.every((sq) => sq.type === "rifles" && sq.team === 1 && sq.order === "defend")
    && men.length === HER.guards * SQUAD_SPECS.rifles.n && men.every((u) => u && u.alive && u.team === 1 && clear(u)) && clear(hb) && s.guards.alive === men.length && s.guards.total === men.length && s.hands.total === 1);
}

console.log(`gravitys-ark-test: ${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
console.log("gravitys-ark-test PASS");
