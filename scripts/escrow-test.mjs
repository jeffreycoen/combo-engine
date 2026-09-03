// COMBO-ENGINE — escrow-test: the contract escrow gate. Laws at rolled
// worlds: every credit is conserved through post, fulfil, and expiry; the
// fee and bounty arithmetic is the demo's own (deadweight-hangar.html
// 267-302); the scan posts only for starvation, once, and honors cooldown.
// NO HARDWIRED SEEDS: the world rolls fresh each run and prints; rerun with
// SEED=<n> in the environment.
import { makeBook, postContract, postRescueAt, fulfilContract, stepContracts } from "../src/modules/escrow/escrow.js";

let pass = 0, fail = 0;
const check = (name, ok) => { if (ok) { pass++; console.log("PASS " + name); } else { fail++; console.log("FAIL " + name); } };
const SEED = process.env.SEED ? +process.env.SEED : Math.floor(Math.random() * 1e9);
console.log("seeds " + JSON.stringify({ world: SEED }));
let a = SEED >>> 0;
const rnd = () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const PARTS = ["engine", "pods", "tank"];
const rollStations = () => {
  const st = {};
  for (const sid of ["alpha", "beta"]) {
    const parts = {};
    for (const p of PARTS) parts[p] = { q: 1 + Math.floor(rnd() * 12), c: 1000 + Math.floor(rnd() * 50000) };
    st[sid] = { parts, credits: Math.floor(rnd() * 30000), cool: 0 };
  }
  return st;
};
const treasury = (st) => st.alpha.credits + st.beta.credits;
const escrowed = (book) => book.list.reduce((s, c) => s + c.escrow, 0);

// the bounty law: spot-of-the-other times 1.55 plus 120, capped by the
// treasury, refused under 200 — checked on 500 rolled worlds
let bountyLaw = true, conserved = true;
for (let i = 0; i < 500 && bountyLaw && conserved; i++) {
  const st = rollStations(); const book = makeBook();
  const t0 = treasury(st);
  postContract(book, st, "alpha", "beta", "engine");
  const other = st.beta.parts.engine;
  const expect = Math.min(Math.ceil((other.c / Math.max(1, other.q)) * 1.55 + 120), st.alpha.credits + (book.list[0] ? book.list[0].escrow : 0));
  if (book.list.length) {
    bountyLaw = book.list[0].pay === expect && book.list[0].escrow === book.list[0].pay && expect >= 200;
  } else bountyLaw = expect < 200;
  conserved = treasury(st) + escrowed(book) === t0;
}
check("escrow: the bounty is the other station's spot, margined, treasury-capped, refused under 200", bountyLaw);
check("escrow: posting moves credits into escrow, none minted, none burned", conserved);

// the rescue fee law
let feeLaw = true, feeConserve = true;
for (let i = 0; i < 500 && feeLaw; i++) {
  const st = rollStations(); const book = makeBook();
  const t0 = treasury(st);
  const value = Math.floor(rnd() * 5000);
  const ct = postRescueAt(book, st, "beta", value);
  const expect = Math.min(st.beta.credits + (ct ? ct.escrow : 0), 600 + Math.round(value * 0.3));
  feeLaw = ct ? (ct.pay === expect && ct.kind === "rescue") : expect < 200;
  feeConserve = feeConserve && treasury(st) + escrowed(book) === t0;
}
check("escrow: the rescue fee is 600 plus thirty percent of the value, treasury-capped", feeLaw && feeConserve);

// fulfil pays once, restocks part contracts, never rescue ones
let payOnce = true;
for (let i = 0; i < 300 && payOnce; i++) {
  const st = rollStations(); st.alpha.credits += 50000;
  const book = makeBook();
  postContract(book, st, "alpha", "beta", "pods");
  const ct = book.list[0];
  const q0 = st.alpha.parts.pods.q;
  const p1 = fulfilContract(st, ct), p2 = fulfilContract(st, ct);
  payOnce = p1 === ct.pay && p2 === 0 && ct.escrow === 0 && !ct.open
    && st.alpha.parts.pods.q === q0 + 1 && st.alpha.cool === 30;
}
check("escrow: fulfilment pays the escrow once, restocks, and cools the station", payOnce);

// expiry returns every cent to the treasury
let expiry = true;
for (let i = 0; i < 300 && expiry; i++) {
  const st = rollStations(); st.beta.credits += 50000;
  const book = makeBook();
  postContract(book, st, "beta", "alpha", "tank");
  const ct = book.list[0];
  const t0 = treasury(st) + escrowed(book);
  stepContracts(book, st, 121, PARTS);
  expiry = !ct.open && ct.escrow === 0 && treasury(st) + escrowed(book) === t0 && st.beta.cool === 30 - 121;
}
check("escrow: an expired contract returns every cent and cools the station", expiry);

// the scan posts once, for starvation only, and honors the cooldown
{
  const st = rollStations();
  st.alpha.parts.engine.q = 1; st.alpha.credits = 30000;
  st.beta.parts.engine.q = 5; st.beta.parts.pods.q = 5; st.beta.parts.tank.q = 5; st.beta.credits = 30000;
  const book = makeBook();
  stepContracts(book, st, 0.1, PARTS);
  const posted = book.list.filter((c) => c.open);
  const one = posted.length === 1 && posted[0].at === "alpha" && posted[0].part === "engine";
  for (let k = 0; k < 59; k++) stepContracts(book, st, 0.1, PARTS); // off-scan calls
  const stillOne = book.list.length === 1;
  fulfilContract(st, book.list[0]);
  st.alpha.parts.engine.q = 1;
  stepContracts(book, st, 0.1, PARTS); // scan call, but alpha cooling
  const cooled = book.list.length === 1;
  st.alpha.cool = 0;
  for (let k = 0; k < 60; k++) stepContracts(book, st, 0.001, PARTS);
  const reposted = book.list.length === 2;
  check("escrow: the scan posts one contract for the starved part and honors the cooldown", one && stillOne && cooled && reposted);
}

// whole-world conservation through a rolled storm of activity
{
  const st = rollStations(); st.alpha.credits += 40000; st.beta.credits += 40000;
  const book = makeBook();
  let paidOut = 0;
  const t0 = treasury(st);
  for (let k = 0; k < 600; k++) {
    stepContracts(book, st, 0.5 + rnd(), PARTS);
    if (rnd() < 0.1) { const open = book.list.filter((c) => c.open); if (open.length) paidOut += fulfilContract(st, open[0]); }
    if (rnd() < 0.05) { const sid = rnd() < 0.5 ? "alpha" : "beta"; const p = PARTS[Math.floor(rnd() * 3)]; st[sid].parts[p].q = 1; }
    if (rnd() < 0.03) postRescueAt(book, st, rnd() < 0.5 ? "alpha" : "beta", Math.floor(rnd() * 4000));
  }
  check("escrow: six hundred rolled steps conserve every credit — treasuries plus escrow plus payouts", treasury(st) + escrowed(book) + paidOut === t0);
}

console.log(`escrow-test: ${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
console.log("escrow-test PASS");
