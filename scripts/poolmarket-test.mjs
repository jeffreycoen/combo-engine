// COMBO-ENGINE — poolmarket-test: the constant-product pool gate. VERBATIM
// MATH is ratified against the demo's own text: the three pool functions are
// extracted from deadweight-hangar.html at run time and driven side by side
// with the module on rolled pools — every output must match exactly. Laws
// (conservation, monotone prices, no money pump) run on rolled pools too.
// NO HARDWIRED SEEDS: pools roll fresh each run and print; rerun a failure
// with SEED=<n> in the environment.
import fs from "node:fs";
import { poolBuy, poolSell, price1, netRefit } from "../src/modules/poolmarket/poolmarket.js";

let pass = 0, fail = 0;
const check = (name, ok) => { if (ok) { pass++; console.log("PASS " + name); } else { fail++; console.log("FAIL " + name); } };

const SEED = process.env.SEED ? +process.env.SEED : Math.floor(Math.random() * 1e9);
console.log("seeds " + JSON.stringify({ pools: SEED }));
let a = SEED >>> 0;
const rnd = () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const rollPool = () => ({ q: 2 + Math.floor(rnd() * 60), c: 500 + Math.floor(rnd() * 120000) });

// the demo's own functions, lifted from its text at run time
const demoSrc = fs.readFileSync(new URL("../deadweight-hangar.html", import.meta.url), "utf8");
const lift = (name) => {
  const i = demoSrc.indexOf("function " + name + "(");
  const j = demoSrc.indexOf("function", i + 1);
  const body = demoSrc.slice(i, j).trim();
  return new Function("return (" + body.replace("function " + name, "function") + ")")();
};
const demoBuy = lift("poolBuy"), demoSell = lift("poolSell");
const demoPrice1 = (() => {
  const i = demoSrc.indexOf("function price1(");
  const body = demoSrc.slice(i, demoSrc.indexOf("\n", i)).trim();
  return new Function("return (" + body.replace("function price1", "function") + ")")();
})();

// twin drive: 4000 rolled trades, module vs demo, byte-equal pools throughout
let twins = true;
for (let i = 0; i < 4000 && twins; i++) {
  const p1 = rollPool(); const p2 = { ...p1 };
  const n = 1 + Math.floor(rnd() * 3);
  const op = rnd() < 0.5 ? "buy" : "sell";
  const r1 = op === "buy" ? poolBuy(p1, n) : poolSell(p1, n);
  const r2 = op === "buy" ? demoBuy(p2, n) : demoSell(p2, n);
  twins = r1 === r2 && p1.q === p2.q && p1.c === p2.c;
}
check("poolmarket: 4000 rolled trades run twin with the demo's own text — outputs and pools identical", twins);
let priceTwin = true;
for (let i = 0; i < 1000 && priceTwin; i++) { const p = rollPool(); priceTwin = price1(p) === demoPrice1({ ...p }); }
check("poolmarket: the posted price is the demo's own, on 1000 rolled pools", priceTwin);

// conservation: every credit a buyer pays lands in the pool; every unit moves
let conserve = true;
for (let i = 0; i < 1000 && conserve; i++) {
  const p = rollPool(); const q0 = p.q, c0 = p.c;
  const cost = poolBuy(p, 1);
  conserve = cost !== null && p.q === q0 - 1 && p.c === c0 + cost;
}
check("poolmarket: a buy conserves — stock down one, every credit paid into the pool", conserve);
let conserve2 = true;
for (let i = 0; i < 1000 && conserve2; i++) {
  const p = rollPool(); const q0 = p.q, c0 = p.c;
  const out = poolSell(p, 1);
  conserve2 = p.q === q0 + 1 && p.c === c0 - out && out >= 0;
}
check("poolmarket: a sell conserves — stock up one, every credit paid from the pool", conserve2);

// no money pump: buy then sell returns at most what was paid, on any pool
let pump = false;
for (let i = 0; i < 2000 && !pump; i++) {
  const p = rollPool();
  const cost = poolBuy(p, 1); if (cost === null) continue;
  const back = poolSell(p, 1);
  if (back > cost) pump = true;
}
check("poolmarket: no money pump — a round trip never profits the trader", !pump);

// the price rises as stock drains; a buy that would empty the pool refuses whole
let mono = true;
for (let i = 0; i < 500 && mono; i++) {
  const p = rollPool(); if (p.q < 3) continue;
  const c1 = poolBuy(p, 1), c2 = poolBuy(p, 1);
  if (c2 === null) continue;
  mono = c2 >= c1;
}
const pr = { q: 2, c: 1000 }; const refuse = poolBuy(pr, 2);
check("poolmarket: the price rises as stock drains; an emptying buy refuses whole", mono && refuse === null && pr.q === 2 && pr.c === 1000);
check("poolmarket: price1 posts a buy's exact cost and moves nothing",
  (() => { const p = rollPool(); const posted = price1(p); const q0 = p.q, c0 = p.c; const moved = p.q !== q0 || p.c !== c0; const cost = poolBuy({ ...p }, 1); return !moved && posted === cost; })());

// netRefit: exactly sell-everything-then-buy-everything on a copy, pools unmoved
const KEY = { bridge: "bridge", engine: "engine", pod: "pods" };
let refitLaw = true, untouched = true;
for (let i = 0; i < 500 && refitLaw; i++) {
  const pools = { bridge: rollPool(), engine: rollPool(), pods: rollPool() };
  const snap = JSON.stringify(pools);
  const current = ["bridge", "engine", "pod"].filter(() => rnd() < 0.7);
  const target = ["bridge", "engine", "pod", "pod"].filter(() => rnd() < 0.7);
  const net = netRefit(pools, KEY, current, target);
  untouched = untouched && JSON.stringify(pools) === snap;
  const cp = { bridge: { ...pools.bridge }, engine: { ...pools.engine }, pods: { ...pools.pods } };
  let expect = 0, refused = false;
  for (const t of current) expect -= poolSell(cp[KEY[t]], 1);
  for (const t of target) { const c = poolBuy(cp[KEY[t]], 1); if (c === null) { refused = true; break; } expect += c; }
  refitLaw = refused ? net === null : net === expect;
}
check("poolmarket: a refit nets exactly sell-all-then-buy-all through the pool's own math", refitLaw);
check("poolmarket: a refit prices on copies — the live pools never move", untouched);
const thin = { bridge: { q: 1, c: 9000 } };
check("poolmarket: a target the pool cannot cover refuses whole", netRefit(thin, KEY, [], ["bridge"]) === null);

console.log(`poolmarket-test: ${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
console.log("poolmarket-test PASS");
