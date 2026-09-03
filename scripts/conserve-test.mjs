// COMBO-ENGINE — conserve-test: the books' gate. A rolled world is declared
// at genesis, torn through trades, burns, thefts, and wrecks that only MOVE
// value, and audited to zero drift; then one minted credit, one leaked gram
// of fuel, and one vanished part are each caught by name. NO HARDWIRED
// SEEDS: the world rolls fresh each run and prints; rerun with SEED=<n>.
import { makeGenesis, genesisStations, declare, makeCensus, countParts, countTramps, countPirates, countEscrow, countPurse, countWreckage, countStations, audit } from "../src/modules/conserve/conserve.js";

let pass = 0, fail = 0;
const check = (name, ok) => { if (ok) { pass++; console.log("PASS " + name); } else { fail++; console.log("FAIL " + name); } };
const SEED = process.env.SEED ? +process.env.SEED : Math.floor(Math.random() * 1e9);
console.log("seeds " + JSON.stringify({ world: SEED }));
let a = SEED >>> 0;
const rnd = () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const PARTS = ["pods", "engine", "tank"];
const PKEY = { pod: "pods", engine: "engine", tank: "tank" };

function rollWorld() {
  const stations = {};
  for (const sid of ["alpha", "beta"]) {
    const st = { credits: Math.floor(rnd() * 20000), ordKg: Math.floor(rnd() * 300), fuelPool: { q: Math.floor(rnd() * 9000), c: Math.floor(rnd() * 80000) } };
    for (const p of PARTS) st[p] = { q: 1 + Math.floor(rnd() * 20), c: 1000 + Math.floor(rnd() * 40000) };
    stations[sid] = st;
  }
  const tramps = []; for (let i = 0; i < 2 + Math.floor(rnd() * 3); i++)
    tramps.push({ credits: Math.floor(rnd() * 9000), fuel: Math.floor(rnd() * 400), cargo: rnd() < 0.5 ? { pods: 1 + Math.floor(rnd() * 3) } : {} });
  const pirates = [{ credits: Math.floor(rnd() * 800), fuel: Math.floor(rnd() * 300) }];
  const crates = []; const contracts = []; const wreckage = [];
  const build = [{ t: "pod" }, { t: "engine" }].filter(() => rnd() < 0.9);
  const L = { playerC: Math.floor(rnd() * 50000), shipFuel: Math.floor(rnd() * 500), exhaust: 0, shipOrdKg: Math.floor(rnd() * 50), worldOrdKg: 0 };
  const auth = { credits: Math.floor(rnd() * 40000), fuel: 0 };
  const frontier = { credits: Math.floor(rnd() * 50000), fuel: Math.floor(rnd() * 900) };
  return { stations, tramps, pirates, crates, contracts, wreckage, build, L, auth, frontier };
}
function declareAll(w) {
  const gen = makeGenesis();
  genesisStations(gen, w.stations);
  declare(gen, { credits: w.L.playerC, fuel: w.L.shipFuel, ord: w.L.shipOrdKg });
  for (const tr of w.tramps) declare(gen, { credits: tr.credits, fuel: tr.fuel, parts: tr.cargo });
  for (const pi of w.pirates) declare(gen, { credits: pi.credits, fuel: pi.fuel });
  const bp = {}; for (const md of w.build) bp[PKEY[md.t]] = (bp[PKEY[md.t]] || 0) + 1;
  declare(gen, { parts: bp });
  declare(gen, { credits: w.auth.credits });
  declare(gen, { credits: w.frontier.credits, fuel: w.frontier.fuel });
  return gen;
}
function censusAll(w) {
  const cz = makeCensus({ C: w.L.playerC, F: w.L.shipFuel + w.L.exhaust, O: w.L.shipOrdKg + w.L.worldOrdKg });
  countParts(cz, w.build, PKEY);
  countTramps(cz, w.tramps);
  countPirates(cz, w.pirates, w.crates);
  countEscrow(cz, w.contracts);
  countPurse(cz, w.auth); countPurse(cz, w.frontier);
  countWreckage(cz, w.wreckage, PKEY);
  countStations(cz, w.stations);
  return cz;
}

// a freshly declared world audits to zero drift
let clean = true;
for (let i = 0; i < 200 && clean; i++) { const w = rollWorld(); const r = audit(declareAll(w), censusAll(w)); clean = r.ok && r.cD === 0 && r.pD === 0; }
check("conserve: a declared world audits to zero drift, 200 rolled worlds", clean);

// a storm of MOVES — trades, thefts, burns, wrecks — never breaks the books
let stormOk = true;
for (let i = 0; i < 60 && stormOk; i++) {
  const w = rollWorld(); const gen = declareAll(w);
  for (let k = 0; k < 300; k++) {
    const roll = rnd();
    if (roll < 0.2) { const amt = Math.floor(rnd() * 500); const tr = w.tramps[Math.floor(rnd() * w.tramps.length)]; const take = Math.min(amt, tr.credits); tr.credits -= take; w.stations.alpha.credits += take; }
    else if (roll < 0.4) { const burn = rnd() * 20; const b2 = Math.min(burn, w.L.shipFuel); w.L.shipFuel -= b2; w.L.exhaust += b2; }
    else if (roll < 0.55) { const pi = w.pirates[0]; const tr = w.tramps[0]; const loot = Math.min(Math.floor(rnd() * 300), tr.credits); tr.credits -= loot; pi.credits += loot; }
    else if (roll < 0.7) { const st = w.stations.beta; const fee = Math.min(Math.floor(rnd() * 400), st.credits); st.credits -= fee; w.contracts.push({ escrow: fee }); }
    else if (roll < 0.8) { const ct = w.contracts.pop(); if (ct) w.L.playerC += ct.escrow; }
    else if (roll < 0.9) { if (w.build.length) { const md = w.build.pop(); w.wreckage.push({ t: md.t, credits: 0, fuelU: 0 }); } }
    else { const fr = w.frontier; const give = Math.min(Math.floor(rnd() * 200), fr.credits); fr.credits -= give; w.tramps[0].credits += give; }
  }
  stormOk = audit(gen, censusAll(w)).ok;
}
check("conserve: three hundred rolled moves per world never bend the books, 60 worlds", stormOk);

// each kind of leak is caught by its own needle
{
  const w = rollWorld(); const gen = declareAll(w);
  w.L.playerC += 1;
  const minted = audit(gen, censusAll(w));
  w.L.playerC -= 1; w.L.shipFuel += 0.5;
  const leakedF = audit(gen, censusAll(w));
  w.L.shipFuel -= 0.5;
  w.stations.alpha.pods.q -= 1;
  const lostPart = audit(gen, censusAll(w));
  w.stations.alpha.pods.q += 1;
  w.L.worldOrdKg += 2;
  const ordUp = audit(gen, censusAll(w));
  check("conserve: a minted credit reads cD 1 and fails", !minted.ok && minted.cD === 1);
  check("conserve: half a unit of leaked fuel reads fD 0.5 and fails", !leakedF.ok && leakedF.fD === 0.5);
  check("conserve: a vanished part reads pD 1 and fails", !lostPart.ok && lostPart.pD === 1);
  check("conserve: loose ordnance reads oD 2 and fails", !ordUp.ok && ordUp.oD === 2);
}

// the float rail: drift under a millionth passes, at a millionth fails
{
  const w = rollWorld(); const gen = declareAll(w);
  w.L.exhaust += 4e-7;
  const tiny = audit(gen, censusAll(w));
  w.L.exhaust += 1e-6;
  const over = audit(gen, censusAll(w));
  check("conserve: the fuel rail forgives under a millionth and no more", tiny.ok && !over.ok);
}

console.log(`conserve-test: ${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
console.log("conserve-test PASS");
