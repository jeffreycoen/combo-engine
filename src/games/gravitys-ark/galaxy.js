// MODULE of the game GRAVITY'S ARK: galaxy, the order's phase 0.0.103,
// frames 3 and 5 as data, every number PROPOSED from the order's scale
// table, the draws in one fixed order from the determinism kit's stream.
import { simStream } from "../../modules/determinism/determinism.js";

export const GALAXY_DIALS = { worldsMin: 8, worldsMax: 12, xMin: 20000, xMax: 200000, yHalf: 30000, gateGap: 15000, rMin: 600, rMax: 1400, gMin: 6, gMax: 14, starR: 4000, starG: 30, tollMin: 4000, tollMax: 12000, scrapMin: 300, scrapMax: 900, timeMin: 60, timeMax: 240, modulesMin: 1, modulesMax: 3, gripChance: 0.2, nobodyChance: 0.1, handsMin: 4, handsMax: 8 };
export const CLIMATES = ["SNOW", "ASH", "MUD", "ROCK", "WOOD"];
export const FACTIONS = ["authority", "charter", "militia", "fitters", "wreckers"];
export const WOMEN = ["Ada", "Beatrix", "Carys", "Dagny", "Edith", "Freya", "Greta", "Hilde", "Ines", "Jorunn", "Kaja", "Liv", "Maren", "Nadia", "Oona", "Petra", "Runa", "Sigrid", "Tove", "Vera"];
export const MEN = ["Anders", "Bram", "Casimir", "Dov", "Emil", "Fenn", "Gustav", "Hakon", "Ivo", "Jonas", "Kol", "Lars", "Matthias", "Nils", "Osk", "Piet", "Rurik", "Soren", "Teodor", "Viggo"];
export const FAMILY = ["Aske", "Brandt", "Corvin", "Dahl", "Ekholm", "Falk", "Grieg", "Halvorsen", "Idris", "Juel", "Kessler", "Lindqvist", "Moller", "Nygaard", "Ostrem", "Pahl", "Ravn", "Solberg", "Thune", "Vinter"];

// muFor(g, R, soft): the mu that makes the wells law's pull at distance R
// equal to g. Wells law: mu / (r^2 + soft^2)^1.65.
export function muFor(g, R, soft) { return g * Math.pow(R * R + soft * soft, 1.65); }

// personName(rng, sex): a first name from the sex's table, a family name
// from FAMILY, the first name drawn first.
export function personName(rng, sex) {
  const table = sex === "f" ? WOMEN : MEN;
  const first = table[Math.floor(rng() * table.length)];
  const family = FAMILY[Math.floor(rng() * FAMILY.length)];
  return first + " " + family;
}

// rollPerson(rng): the sex drawn first, then the name.
export function rollPerson(rng) {
  const sex = rng() < 0.5 ? "f" : "m";
  const name = personName(rng, sex);
  return { name, sex };
}

// makeGalaxy(seed, dials): one seed makes the whole layout, one world at
// a time, in the exact draw order the order's brief fixes.
export function makeGalaxy(seed, dials) {
  const d = { ...GALAXY_DIALS, ...dials };
  const rng = simStream(seed);
  const n = d.worldsMin + Math.floor(rng() * (d.worldsMax - d.worldsMin + 1));
  const lane = (d.xMax - d.xMin) / n;
  const worlds = [];
  for (let i = 0; i < n; i++) {
    const x = d.xMin + lane * i + rng() * lane * 0.6;
    const y = (rng() * 2 - 1) * d.yHalf;
    const r = d.rMin + rng() * (d.rMax - d.rMin);
    const g = d.gMin + rng() * (d.gMax - d.gMin);
    const climate = CLIMATES[Math.floor(rng() * 5)];
    const ring = Math.floor(3 * i / n);
    let holder;
    if (ring === 2) {
      holder = "authority";
    } else {
      const h = rng();
      if (h < d.gripChance) holder = "grip";
      else if (h < d.gripChance + d.nobodyChance) holder = null;
      else if (ring === 0) holder = rng() < 0.5 ? "militia" : "charter";
      else holder = rng() < 0.5 ? "fitters" : "wreckers";
    }
    const hands = d.handsMin + Math.floor(rng() * (d.handsMax - d.handsMin + 1));
    worlds.push({
      id: "w" + i, i, x, y, r, g, soft: r / 4, mu: muFor(g, r, r / 4),
      climate, ring, holder, state: "alive",
      station: { faction: holder === "grip" || holder === null ? "charter" : holder, hands },
    });
  }
  const star = { x: 0, y: 0, r: d.starR, g: d.starG, soft: d.starR / 4, mu: muFor(d.starG, d.starR, d.starR / 4) };
  const gate = {
    x: worlds[n - 1].x + d.gateGap, y: 0,
    toll: Math.round(d.tollMin + rng() * (d.tollMax - d.tollMin)),
    bill: {
      time: Math.round(d.timeMin + rng() * (d.timeMax - d.timeMin)),
      scrap: Math.round(d.scrapMin + rng() * (d.scrapMax - d.scrapMin)),
      modules: d.modulesMin + Math.floor(rng() * (d.modulesMax - d.modulesMin + 1)),
    },
  };
  const collapseAt = rng() < 0.5 ? 2 : 3;
  const lanes = [];
  for (let i = 0; i < n - 1; i++) lanes.push([i, i + 1]);
  return { seed, n, worlds, star, lanes, gate, collapseAt, dials: d };
}

// GALAXY_CONTRACT: the shape of a galaxy as data.
export const GALAXY_CONTRACT = {
  seed: "integer >= 0",
  worlds: "list of 8 to 12, each finite x, y, r, g, mu",
  star: "object",
  gate: "object with finite x and toll",
  collapseAt: "2 or 3",
};

// checkGalaxy(gal): every problem in one pass, empty when clean.
export function checkGalaxy(gal) {
  const problems = [];
  if (!gal || typeof gal !== "object") {
    problems.push("galaxy: not an object");
    return problems;
  }
  if (!Number.isInteger(gal.seed) || gal.seed < 0) {
    problems.push("galaxy.seed: integer >= 0 required");
  }
  if (!Array.isArray(gal.worlds) || gal.worlds.length < 8 || gal.worlds.length > 12) {
    problems.push("galaxy.worlds: list of 8 to 12 required");
  }
  if (Array.isArray(gal.worlds)) {
    for (let i = 0; i < gal.worlds.length; i++) {
      const w = gal.worlds[i];
      const bad = !w || typeof w !== "object" || !Number.isFinite(w.x) || !Number.isFinite(w.y) || !Number.isFinite(w.r) || !Number.isFinite(w.g) || !Number.isFinite(w.mu);
      if (bad) problems.push("galaxy.worlds[" + i + "]: finite x, y, r, g, mu required");
    }
  }
  if (!gal.star || typeof gal.star !== "object") {
    problems.push("galaxy.star: object required");
  }
  if (!gal.gate || typeof gal.gate !== "object" || !Number.isFinite(gal.gate.x) || !Number.isFinite(gal.gate.toll)) {
    problems.push("galaxy.gate: object with finite x and toll required");
  }
  if (gal.collapseAt !== 2 && gal.collapseAt !== 3) {
    problems.push("galaxy.collapseAt: 2 or 3 required");
  }
  return problems;
}
