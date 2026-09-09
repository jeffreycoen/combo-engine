// MODULE of the game GRAVITY'S ARK: card, the order's phase 0.0.109,
// frames 8 and 9 headless, every number PROPOSED from the order's scale
// table, the log's lines on the receipts module.
// Imports receiptLog from ../../modules/receipts/receipts.js. No randomness.
import { receiptLog } from "../../modules/receipts/receipts.js";

const fmt = (n) => Math.round(n).toLocaleString("en-US");

export const ARK_LINES = {
  land: (e) => `landed on ${e.i} at ${fmt(e.v)} m/s`, crash: (e) => `crashed on ${e.i} at ${fmt(e.v)} m/s`, takeoff: (e) => `took off from ${e.i}`,
  collapse: () => `the light went out`, swallow: (e) => `the hole took ${e.i}`, fell: () => `fell into the pit`, death: (e) => `the ship died at ${fmt(e.v)} m/s`,
  hire: (e) => `hired ${e.name}`, dock: (e) => `docked, wages ${fmt(e.due)}`, buy: (e) => `bought ${e.n} ${e.part} for ${fmt(e.cost)}`, sell: (e) => `sold ${e.n} ${e.part} for ${fmt(e.out)}`,
  lock: (e) => `a lock: they want ${e.takes}`, pay: (e) => `paid the pirate with ${e.takes}`, shot: (e) => `hit for ${e.damage}`, kill: (e) => `a bounty of ${fmt(e.bounty)}`,
  hireout: (e) => `she went to work for ${fmt(e.pay)}`, fix: (e) => `she fixed the gate`, toll: (e) => `paid the toll ${fmt(e.toll)}`, sold: (e) => `sold ${e.kind} to the Fitters for ${fmt(e.price)}`,
  pass: (e) => `passed the gate: ${e.ending}`, respawn: (e) => `woke at ${e.world} in debt ${fmt(e.debt)}`,
};

// makeLog(): the receipts the page and the modules push into, one event
// at a time, plain data, never thrown away.
export function makeLog() {
  return {
    events: [],
    add(type, t, data) { const e = { type, t, ...(data || {}) }; this.events.push(e); return e; },
    lines(lines = ARK_LINES) { return receiptLog(this.events, lines); },
    toJSON() { return JSON.stringify(this.events); },
  };
}

// logFromJSON(text): a log whose events are the stored record, read back.
export function logFromJSON(text) {
  const log = makeLog();
  log.events = JSON.parse(text);
  return log;
}

const CARD_ENDINGS = ["through with her", "through without her", "sold her and passed", "stayed and fell", "no station left ahead of the edge"];

// galaxyName(log, galaxy): three words — the climate landed on most, the
// side fought most, what was carried most.
export function galaxyName(log, galaxy) {
  const landCounts = new Map();
  for (const e of log.events) {
    if (e.type === "land" || e.type === "crash") landCounts.set(e.i, (landCounts.get(e.i) || 0) + 1);
  }
  let bestWorld = null, bestLandCount = 0;
  for (const i of [...landCounts.keys()].sort((a, b) => a - b)) {
    const c = landCounts.get(i);
    if (c > bestLandCount) { bestLandCount = c; bestWorld = i; }
  }
  const found = bestWorld === null ? null : galaxy.worlds.find((w) => w.i === bestWorld);
  const climate = found ? found.climate : "NOWHERE";

  let kills = 0, shots = 0;
  for (const e of log.events) {
    if (e.type === "kill") kills++;
    else if (e.type === "shot") shots++;
  }
  const side = kills > shots ? "HUNTER" : shots > kills ? "HUNTED" : "QUIET";

  const buyTotals = new Map();
  for (const e of log.events) {
    if (e.type === "buy") buyTotals.set(e.part, (buyTotals.get(e.part) || 0) + e.n);
  }
  let bestPart = null, bestN = 0;
  for (const [part, n] of buyTotals) {
    if (n > bestN) { bestN = n; bestPart = part; }
  }
  const carried = bestPart === null ? "EMPTY" : String(bestPart).toUpperCase();

  return [climate, side, carried].join(" · ");
}

// buildCard(log, galaxy, hull, crew, ending): the finished record — what
// she flew with, who rode, what the star ate, and the story's name.
export function buildCard(log, galaxy, hull, crew, ending) {
  return {
    ending,
    manifest: {
      hull: hull.list.map((m) => m.t),
      hands: crew.map((h) => h.name),
      scrap: hull.scrap,
      spares: hull.spares.slice(),
      people: hull.cargo.people,
    },
    eaten: galaxy.worlds.filter((w) => w.state !== "alive").map((w) => w.id),
    name: galaxyName(log, galaxy),
    lines: log.lines(),
  };
}

// checkCard(c): every problem in one pass, empty when clean.
export function checkCard(c) {
  if (!c || typeof c !== "object") return ["card: not an object"];
  const problems = [];
  if (!CARD_ENDINGS.includes(c.ending)) problems.push("card.ending: one of the endings required");
  if (!c.manifest || typeof c.manifest !== "object") problems.push("card.manifest: object required");
  if (typeof c.name !== "string" || !c.name.length) problems.push("card.name: non-empty string required");
  return problems;
}
