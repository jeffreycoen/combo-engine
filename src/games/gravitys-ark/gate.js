// MODULE of the game GRAVITY'S ARK: gate, the order's phase 0.0.109,
// frames 8 and 9 headless, every number PROPOSED from the order's scale
// table, the log's lines on the receipts module.
// No imports. No randomness.

import { MODULES } from "./stations.js";   // the landing swapped the brief's copies for the stations module's table
const MODULE_PRICE = Object.fromEntries(Object.entries(MODULES).map(([k, m]) => [k, m.price]));
const MODULE_KG = Object.fromEntries(Object.entries(MODULES).map(([k, m]) => [k, m.kg]));

export const GATE_DIALS = { nearR: 2000, fittersCut: 0.6, scrapPrice: 2, personPrice: 650, mercyFuel: 60, respawnDebt: 5000, starterDry: 3400, starterThrust: 60000 };
export const ENDINGS = ["through with her", "through without her", "sold her and passed", "stayed and fell", "no station left ahead of the edge"];

// makeGate(galaxy, d): the gate's state at first sight, her bill copied
// off the galaxy, nothing paid yet.
export function makeGate(galaxy, d) {
  return {
    toll: galaxy.gate.toll,
    bill: { ...galaxy.gate.bill },
    work: 0,
    scrapPaid: 0,
    modulesPaid: 0,
    fixed: false,
    tolled: false,
    passed: false,
    sold: [],
    authority: { credits: 0 },
    fitters: { credits: 30000 },
    dials: { ...GATE_DIALS, ...d },
  };
}

// atGate(ship, galaxy, d): within the near radius of the gate's mark.
export function atGate(ship, galaxy, d) {
  return Math.hypot(ship.x - galaxy.gate.x, ship.y - galaxy.gate.y) < d.nearR;
}

// need(gs): what the bill still wants, in time, scrap, and modules.
export function need(gs) {
  return { time: Math.max(0, gs.bill.time - gs.work), scrap: gs.bill.scrap - gs.scrapPaid, modules: gs.bill.modules - gs.modulesPaid };
}

// fixGate(gs, hull, her, dt): only she can fix it; the tick banks time,
// then pays down scrap and modules from what the hull is carrying.
export function fixGate(gs, hull, her, dt) {
  if (gs.fixed) return need(gs);
  if (her.taken || her.away || her.sold) return need(gs);
  gs.work += dt;
  if (gs.scrapPaid < gs.bill.scrap && hull.scrap >= gs.bill.scrap - gs.scrapPaid) {
    const owed = gs.bill.scrap - gs.scrapPaid;
    hull.scrap -= owed;
    gs.scrapPaid = gs.bill.scrap;
  }
  while (gs.modulesPaid < gs.bill.modules && hull.spares.length) {
    hull.spares.pop();
    gs.modulesPaid += 1;
  }
  gs.fixed = gs.work >= gs.bill.time && gs.scrapPaid >= gs.bill.scrap && gs.modulesPaid >= gs.bill.modules;
  return need(gs);
}

// payToll(gs, purse): the toll leaves the purse and lands with the
// Authority, once.
export function payToll(gs, purse) {
  if (gs.tolled) return 0;
  if (purse.credits < gs.toll) return null;
  purse.credits -= gs.toll;
  gs.authority.credits += gs.toll;
  gs.tolled = true;
  return gs.toll;
}

// sellToFitters(gs, hull, purse, item): the Fitters buy a spare, scrap,
// people, or her, at their cut, if their credits can cover the price.
// NONCONFORMITY: the pinned signature carries no `her`; the "her" kind's
// her.sold mutation the brief describes has nothing to act on here, so
// this branch settles the price and books it and leaves that mutation to
// the caller.
export function sellToFitters(gs, hull, purse, item) {
  const cut = gs.dials.fittersCut;
  let price;
  if (item.kind === "spare") price = Math.round(MODULE_PRICE[item.k] * cut);
  else if (item.kind === "scrap") price = Math.round(item.kg * gs.dials.scrapPrice * cut);
  else if (item.kind === "people") price = Math.round(item.n * gs.dials.personPrice * cut);
  else price = item.price;
  if (gs.fitters.credits < price) return null;
  if (item.kind === "spare") {
    const idx = hull.spares.indexOf(item.k);
    if (idx >= 0) hull.spares.splice(idx, 1);
  } else if (item.kind === "scrap") {
    hull.scrap -= item.kg;
  } else if (item.kind === "people") {
    hull.cargo.people -= item.n;
  }
  gs.fitters.credits -= price;
  purse.credits += price;
  gs.sold.push({ ...item, price });
  return price;
}

// pass(gs, ship, galaxy, her): passing needs the fix, the toll, and the
// place; the ending depends on what became of her.
export function pass(gs, ship, galaxy, her) {
  if (!gs.fixed || !gs.tolled || !atGate(ship, galaxy, gs.dials)) return null;
  gs.passed = true;
  return her.sold ? ENDINGS[2] : her.taken ? ENDINGS[1] : ENDINGS[0];
}

// aheadOfEdge(galaxy, hole): the alive worlds still standing beyond the
// hole's edge, in world order.
export function aheadOfEdge(galaxy, hole) {
  return galaxy.worlds.filter((w) => w.state === "alive" && Math.hypot(w.x, w.y) - w.r > hole.edge);
}

// respawn(galaxy, ship, state, hull, purse, d): the lost hull's parts stay
// on the books; she wakes at the nearest station still ahead of the edge,
// or the road ends.
export function respawn(galaxy, ship, state, hull, purse, d) {
  const k = (ship.landed === null || ship.landed === undefined) ? nearestAlive(galaxy, ship) : ship.landed;
  galaxy.worlds[k].left = (galaxy.worlds[k].left || []).concat(hull.list.map((m) => m.t));

  const ahead = aheadOfEdge(galaxy, state.hole);
  if (!ahead.length) return { ending: ENDINGS[4] };

  let w = ahead[0], bestDist = Math.hypot(ship.x - w.x, ship.y - w.y);
  for (const cand of ahead) {
    const dist = Math.hypot(ship.x - cand.x, ship.y - cand.y);
    if (dist < bestDist) { bestDist = dist; w = cand; }
  }

  ship.x = w.x; ship.y = w.y + w.r; ship.vx = 0; ship.vy = 0;
  ship.landed = w.i; ship.alive = true;
  ship.dry = d.starterDry; ship.fuel = d.mercyFuel; ship.thrust = d.starterThrust;

  hull.list = [{ t: "bridge", gx: 0, gy: 0 }, { t: "engine", gx: -1, gy: 0 }, { t: "tank", gx: 1, gy: 0 }, { t: "pod", gx: 0, gy: 1 }];
  hull.scrap = 0;
  hull.spares = [];
  hull.cargo.people = 0;

  purse.debt += d.respawnDebt;
  return { world: w.i, debt: purse.debt };
}

// nearestAlive(galaxy, ship): the alive world nearest the ship's position.
function nearestAlive(galaxy, ship) {
  let best = null, bestDist = Infinity;
  for (const w of galaxy.worlds) {
    if (w.state !== "alive") continue;
    const dist = Math.hypot(ship.x - w.x, ship.y - w.y);
    if (dist < bestDist) { bestDist = dist; best = w.i; }
  }
  return best;
}

// checkGateState(gs): every problem in one pass, empty when clean.
export function checkGateState(gs) {
  if (!gs || typeof gs !== "object") return ["gate: not an object"];
  const problems = [];
  if (!(typeof gs.toll === "number" && gs.toll > 0)) problems.push("gate.toll: number > 0 required");
  if (!(gs.bill && typeof gs.bill === "object" && "time" in gs.bill && "scrap" in gs.bill && "modules" in gs.bill)) problems.push("gate.bill: object with time, scrap, modules required");
  if (!(typeof gs.work === "number" && gs.work >= 0)) problems.push("gate.work: number >= 0 required");
  return problems;
}
