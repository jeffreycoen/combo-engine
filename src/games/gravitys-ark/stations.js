// MODULE: stations — GRAVITY'S ARK, the order's phase 0.0.106, frame 3.
// Every number PROPOSED from the order's scale table. The pools are the
// market module's; the contracts are the escrow module's; the hull is the
// builder's.

import { poolBuy, poolSell, price1 } from "../../modules/market/market.js";
import { makeBook, fulfilContract, stepContracts } from "../../modules/escrow/escrow.js";
import { makeBuilder } from "../../modules/builder/builder.js";

export const STATION_DIALS = { handsBase: 650, handsRise: 0.06, wagePerDay: 40, daySeconds: 600, scrapPrice: 2, fuelPrice: 3, pitBias: 0.5, biasRange: 60000, scrapQ: 20000, fuelQ: 20000, moduleQ: 3, credits: 15000, farPeople: 1, personKg: 80 };
export const MODULES = {
  bridge: { kg: 900, price: 12000, ports: ["E", "W", "N", "S"] }, engine: { kg: 1400, price: 9000, thrust: 60000, ports: ["E", "N", "S"] },
  pod: { kg: 600, price: 4500, holds: 2000, ports: ["E", "W", "N", "S"] }, tank: { kg: 500, price: 3800, tank: 3000, ports: ["E", "W", "N", "S"] },
  shield: { kg: 1100, price: 11000, ports: ["W"] }, mount: { kg: 800, price: 7500, ports: ["W"] }, strut: { kg: 150, price: 900, weak: true, ports: ["E", "W", "N", "S"] },
  rcs: { kg: 250, price: 2600, ports: ["E", "W", "N", "S"] }, rack: { kg: 550, price: 6500, ports: ["W"] }, grapple: { kg: 400, price: 5200, ports: ["W"] }, mechbay: { kg: 1800, price: 8000, ports: ["W"] },
};
export const STARTER_HULL = [{ t: "bridge", gx: 0, gy: 0 }, { t: "engine", gx: -1, gy: 0 }, { t: "tank", gx: 1, gy: 0 }, { t: "pod", gx: 0, gy: 1 }];
export const PART_ORDER = ["people", "scrap", "fuel"];

export function biasAt(w, d) {
  return 1 + d.pitBias * Math.max(0, 1 - Math.hypot(w.x, w.y) / d.biasRange);
}

export function makeStations(galaxy, opts) {
  const d = { ...STATION_DIALS, ...(opts && opts.dials) };
  const stations = {};
  for (const w of galaxy.worlds) {
    const b = biasAt(w, d);
    const peopleQ = w.ring === 2 ? d.farPeople : w.station.hands;
    const parts = {
      scrap: { q: d.scrapQ, c: Math.round(d.scrapPrice * b * d.scrapQ) },
      fuel: { q: d.fuelQ, c: Math.round(d.fuelPrice * b * d.fuelQ) },
      people: { q: peopleQ, c: Math.round(d.handsBase * b * Math.max(1, peopleQ)) },
    };
    for (const k in MODULES) parts["mod:" + k] = { q: d.moduleQ, c: Math.round(MODULES[k].price * b * d.moduleQ) };
    stations[w.id] = { credits: d.credits, cool: 0, faction: w.station.faction, bias: b, i: w.i, parts };
  }
  return { stations, book: makeBook(), dials: d, hired: 0, wagesPaid: 0 };
}

export function makePurse(credits, t) {
  return { credits, debt: 0, lastDock: t };
}

export function listings(S, sid) {
  const p = S.stations[sid].parts;
  const modules = {};
  for (const k in MODULES) modules[k] = price1(p["mod:" + k]);
  return { scrap: price1(p.scrap), fuel: price1(p.fuel), hands: hirePrice(S, sid), modules };
}

export function hirePrice(S, sid) {
  return Math.ceil(S.dials.handsBase * S.stations[sid].bias * Math.pow(1 + S.dials.handsRise, S.hired));
}

export function hire(S, sid, purse, rng, t) {
  const d = S.dials;
  const st = S.stations[sid];
  const p = st.parts.people;
  if (p.q <= 1) return null;
  const price = hirePrice(S, sid);
  if (purse.credits < price) return null;
  purse.credits -= price;
  st.credits += price;
  p.q -= 1;
  S.hired += 1;
  return { ...S.rollPerson(rng), kg: d.personKg, kills: 0, hiredAt: t };
}

export function wagesDue(crew, t, since, d) {
  return crew.length * d.wagePerDay * (t - since) / d.daySeconds;
}

export function dock(S, purse, crew, t) {
  const due = wagesDue(crew, t, purse.lastDock, S.dials);
  purse.credits -= due;
  if (purse.credits < 0) { purse.debt += -purse.credits; purse.credits = 0; }
  S.wagesPaid += due;
  purse.lastDock = t;
  return due;
}

export function buy(S, sid, part, n, purse) {
  const p = S.stations[sid].parts[part];
  const trial = poolBuy({ ...p }, n);
  if (trial === null || trial > purse.credits) return null;
  const cost = poolBuy(p, n);
  purse.credits -= cost;
  S.stations[sid].credits += cost;
  return cost;
}

export function sell(S, sid, part, n, purse) {
  const p = S.stations[sid].parts[part];
  const out = poolSell({ ...p }, n);
  if (out > S.stations[sid].credits) return null;
  poolSell(p, n);
  purse.credits += out;
  S.stations[sid].credits -= out;
  return out;
}

export function makeHull(list) {
  const builder = makeBuilder({ spec: MODULES, cell: 1.7, weldStrength: 1.2e5, weldWeak: 5e4, baseFuel: 0 });
  return { builder, list: list.map((m) => ({ ...m })), scrap: 0, spares: [], cargo: { people: 0 } };
}

export function derive(hull) {
  return hull.builder.derive(hull.list);
}

export function install(hull, t, gx, gy) {
  if (hull.builder.occupied(hull.list, gx, gy) || !hull.builder.adjacencyOK(hull.list, gx, gy, t)) return false;
  hull.list.push({ t, gx, gy });
  return true;
}

export function remove(hull, idx) {
  const bridgeIdx = hull.list.findIndex((m) => m.t === "bridge");
  if (idx === bridgeIdx) return false;
  const list2 = hull.list.filter((_, i) => i !== idx);
  const bridgeIdx2 = list2.findIndex((m) => m.t === "bridge");
  const ws2 = hull.builder.weldsOf(list2);
  if (hull.builder.connectedFrom(list2, ws2, bridgeIdx2).size !== list2.length) return false;
  hull.list = list2;
  return true;
}

export function stepStations(S, dt) {
  stepContracts(S.book, S.stations, dt, PART_ORDER);
}

export function carryPeople(S, sid, hull, purse, n) {
  const cost = buy(S, sid, "people", n, purse);
  if (cost === null) return null;
  hull.cargo.people += n;
  return cost;
}

export function deliverPeople(S, ct, hull, purse) {
  if (ct.part !== "people" || !ct.open || hull.cargo.people < ct.n) return 0;
  hull.cargo.people -= ct.n;
  const pay = fulfilContract(S.stations, ct, S.book.dials);
  purse.credits += pay;
  return pay;
}

export const STATION_CONTRACT = { credits: "number >= 0", bias: "number >= 1", parts: { scrap: "pool required", fuel: "pool required", people: "pool required" } };

// checkStation(st) -> problem strings, empty when clean. Pure.
export function checkStation(st) {
  if (!st || typeof st !== "object" || Array.isArray(st)) return ["station: not an object"];
  const problems = [];
  if (!(typeof st.credits === "number" && st.credits >= 0)) problems.push("station.credits: number >= 0 required");
  if (!(typeof st.bias === "number" && st.bias >= 1)) problems.push("station.bias: number >= 1 required");
  if (!st.parts || typeof st.parts !== "object" || Array.isArray(st.parts)) { problems.push("station.parts: object required"); return problems; }
  for (const name of ["scrap", "fuel", "people"]) if (!(name in st.parts)) problems.push("station.parts." + name + ": pool required");
  return problems;
}
