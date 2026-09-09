// MODULE of the game GRAVITY'S ARK: price, the order's phase 0.0.108, frame
// 7 headless, written new from the design document's words under the
// owner's ruling, every number PROPOSED from the order's scale table, the
// hire-out's escrow the escrow module's.
import { postRescueAt, fulfilContract } from "../../modules/escrow/escrow.js";

export const PRICE_DIALS = { sight: 2700, lockR: 140, lockT: 6, shotEvery: 4, shotDamage: 150, outrun: 1.5, bounty: 3000, authorityCredits: 40000, herBase: 4000, herRise: 0.5, fittersBid: 1.25, hireBase: 1500, hireRange: 60000, hireDuration: 120, pirateSpeed: 45, pirateAccel: 2.6, roostR: 6000, pirateCredits: 3000 };
export const FACTIONS = ["authority", "charter", "militia", "fitters", "wreckers"];

// herPrice(ring, d): her price rises every ring.
export function herPrice(ring, d = PRICE_DIALS) {
  return Math.round(d.herBase * (1 + d.herRise * ring));
}

// cargoValue(hull, scrapPrice): what the hold is worth at the pit's scrap price.
export function cargoValue(hull, scrapPrice) {
  return hull.scrap * scrapPrice + hull.cargo.people * 650 + hull.spares.length * 3000;
}

// listingsFor(ring, cargo, d): the factions speak only in prices; nobody
// explains anything.
export function listingsFor(ring, cargo, d = PRICE_DIALS) {
  const her = herPrice(ring, d);
  return {
    authority: { bounty: d.bounty },
    charter: { hire: d.hireBase },
    militia: { conscript: 0 },
    fitters: { her: Math.round(her * d.fittersBid) },
    wreckers: { demand: Math.max(her, cargo), takes: cargo > her ? "cargo" : "her" },
  };
}

// makePirates(galaxy, rng, d): a roost for every wreckers world, in world
// order; two draws per roost, angle then distance.
export function makePirates(galaxy, rng, d = PRICE_DIALS) {
  const list = [];
  for (const w of galaxy.worlds) {
    if (w.holder !== "wreckers") continue;
    const ang = rng() * 2 * Math.PI;
    const dist = d.roostR * (0.5 + rng() * 0.5);
    const x = w.x + Math.cos(ang) * dist;
    const y = w.y + Math.sin(ang) * dist;
    list.push({
      i: w.i, x, y, vx: 0, vy: 0, home: { x, y },
      state: "roost", lockT: 0, shotT: 0, demand: null,
      credits: d.pirateCredits, alive: true,
    });
  }
  return { list, authority: { credits: d.authorityCredits }, dials: d };
}

// stepPirates(P, ship, ring, cargo, dt): sight, chase, lock, fire. Dials
// come from P.dials, set once at makePirates.
export function stepPirates(P, ship, ring, cargo, dt) {
  const d = P.dials;
  const events = [];
  for (const p of P.list) {
    if (!p.alive) continue;
    const dist = Math.hypot(ship.x - p.x, ship.y - p.y);
    if (p.state === "roost") {
      if (dist < d.sight) {
        p.state = "chase";
        events.push({ k: "chase", i: p.i });
      } else {
        const hx = p.home.x - p.x, hy = p.home.y - p.y;
        const hd = Math.hypot(hx, hy);
        if (hd > 1) {
          p.vx = (hx / hd) * d.pirateSpeed;
          p.vy = (hy / hd) * d.pirateSpeed;
          p.x += p.vx * dt; p.y += p.vy * dt;
        } else {
          p.vx = 0; p.vy = 0;
        }
      }
    } else if (p.state === "chase") {
      const ux = (ship.x - p.x) / dist, uy = (ship.y - p.y) / dist;
      p.vx += ux * d.pirateAccel * dt;
      p.vy += uy * d.pirateAccel * dt;
      const speed = Math.hypot(p.vx, p.vy);
      if (speed > d.pirateSpeed) {
        const s = d.pirateSpeed / speed;
        p.vx *= s; p.vy *= s;
      }
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (dist < d.lockR) {
        p.state = "lock"; p.lockT = d.lockT; p.shotT = 0;
        p.demand = listingsFor(ring, cargo, d).wreckers;
        events.push({ k: "lock", i: p.i, demand: p.demand });
      } else if (dist > d.sight * d.outrun) {
        p.state = "roost"; p.demand = null;
        events.push({ k: "outrun", i: p.i });
      }
    } else if (p.state === "lock") {
      p.vx = ship.vx; p.vy = ship.vy;
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (dist > d.sight * d.outrun) {
        p.state = "roost"; p.demand = null;
        events.push({ k: "outrun", i: p.i });
      } else {
        const before = p.lockT;
        p.lockT -= dt;
        if (p.lockT <= 0 && before > 0) {
          events.push({ k: "fire", i: p.i });
          p.shotT = d.shotEvery; p.state = "fire";
        }
      }
    } else if (p.state === "fire") {
      p.vx = ship.vx; p.vy = ship.vy;
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (dist > d.sight * d.outrun) {
        p.state = "roost"; p.demand = null;
        events.push({ k: "outrun", i: p.i });
      } else {
        p.shotT -= dt;
        if (p.shotT <= 0) {
          events.push({ k: "shot", i: p.i, damage: d.shotDamage });
          p.shotT += d.shotEvery;
        }
      }
    }
  }
  return events;
}

// pay(P, p, hull, her): the demand paid hands over the thing demanded,
// never credits.
export function pay(P, p, hull, her) {
  if (!p.demand) return null;
  const takes = p.demand.takes;
  if (takes === "cargo") {
    p.loot = { scrap: hull.scrap, people: hull.cargo.people, spares: hull.spares.slice() };
    hull.scrap = 0; hull.cargo.people = 0; hull.spares = [];
  } else {
    her.taken = true;
  }
  p.state = "roost"; p.demand = null;
  return takes;
}

// killPirate(P, p, purse): the bounty moves from the Authority's own purse.
export function killPirate(P, p, purse) {
  if (!p.alive) return 0;
  p.alive = false;
  const b = Math.min(P.authority.credits, P.dials.bounty);
  P.authority.credits -= b;
  purse.credits += b;
  return b;
}

// hireValue(station, hole, d): more the closer the job is to the edge.
export function hireValue(station, hole, d = PRICE_DIALS) {
  const closeness = hole.born
    ? Math.max(0, 1 - Math.max(0, Math.hypot(station.x, station.y) - hole.edge) / d.hireRange)
    : 0;
  return Math.round(d.hireBase * (1 + closeness));
}

// hireOut(book, stations, sid, station, hole, her, t, d): the Charter's
// hire-out, on the escrow module's own law.
export function hireOut(book, stations, sid, station, hole, her, t, d = PRICE_DIALS) {
  if (her.away) return null;
  const ct = postRescueAt(book, stations, sid, hireValue(station, hole, d));
  if (!ct) return null;
  her.away = { until: t + d.hireDuration, ct };
  return ct;
}

// herReturns(stations, her, purse, t, dials): while she is away, the page
// skips her repairs; that is the page's.
export function herReturns(stations, her, purse, t, dials) {
  if (!her.away || t < her.away.until) return 0;
  const pay = fulfilContract(stations, her.away.ct, dials);
  purse.credits += pay;
  her.away = null;
  return pay;
}

export const PIRATE_CONTRACT = {
  state: "one of roost, chase, lock, fire",
  credits: "number >= 0",
  x: "finite number", y: "finite number", vx: "finite number", vy: "finite number",
};

// checkPirate(p) -> problem strings, empty when clean.
export function checkPirate(p) {
  if (!p || typeof p !== "object") return ["pirate: not an object"];
  const problems = [];
  if (!["roost", "chase", "lock", "fire"].includes(p.state)) {
    problems.push("pirate.state: one of roost, chase, lock, fire required");
  }
  if (!(typeof p.credits === "number" && p.credits >= 0)) {
    problems.push("pirate.credits: number >= 0 required");
  }
  for (const f of ["x", "y", "vx", "vy"]) {
    if (!Number.isFinite(p[f])) problems.push("pirate." + f + ": finite number required");
  }
  return problems;
}
