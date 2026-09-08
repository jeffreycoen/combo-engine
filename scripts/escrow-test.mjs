// COMBO-ENGINE — escrow-test: the contract escrow gate. Laws at rolled
// worlds: every credit is conserved through post, fulfil, and expiry; the
// fee and bounty arithmetic is the demo's own (deadweight-hangar.html
// 267-302); the scan posts only for starvation, once, and honors cooldown.
// NO HARDWIRED SEEDS: the world rolls fresh each run and prints; rerun with
// SEED=<n> in the environment.
import fs from "node:fs";
import { makeBook, postContract, postRescueAt, fulfilContract, stepContracts, ESCROW_DIALS, checkStations } from "../src/modules/escrow/escrow.js";

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

// at rolled dials the posted pay follows the same law, capped and floored by the rolled numbers
let dialBounty = true;
for (let i = 0; i < 300 && dialBounty; i++) {
  const dials = { margin: 1 + rnd() * 2, base: rnd() * 500, floor: 50 + rnd() * 350 };
  const st = rollStations(); const book = makeBook({ dials });
  postContract(book, st, "alpha", "beta", "engine");
  const other = st.beta.parts.engine;
  const expect = Math.min(Math.ceil((other.c / Math.max(1, other.q)) * dials.margin + dials.base), st.alpha.credits + (book.list[0] ? book.list[0].escrow : 0));
  if (book.list.length) {
    dialBounty = book.list[0].pay === expect && book.list[0].escrow === book.list[0].pay && expect >= dials.floor;
  } else dialBounty = expect < dials.floor;
}
check("escrow: at rolled dials the posted pay is ceil(spot times margin plus base), capped by the treasury, refused under the floor", dialBounty);

// a rolled term expires exactly at the term and returns the escrow
let termLaw = true;
for (let i = 0; i < 100 && termLaw; i++) {
  const partTerm = 10 + Math.floor(rnd() * 291);
  const dials = { ...ESCROW_DIALS, partTerm };
  const st = rollStations(); st.alpha.credits += 50000;
  const book = makeBook({ dials });
  const t0 = treasury(st);
  postContract(book, st, "alpha", "beta", "engine");
  const ct = book.list[0];
  stepContracts(book, st, partTerm - 0.5, PARTS);
  const stillOpen = ct.open === true;
  stepContracts(book, st, 0.5, PARTS);
  termLaw = stillOpen && !ct.open && ct.escrow === 0 && treasury(st) + escrowed(book) === t0;
}
check("escrow: a rolled term expires exactly at the term and returns the escrow", termLaw);

// the landed storm, once more, at a rolled dials object on the book, dials passed through to fulfilContract
{
  const dials = {
    margin: 1 + rnd() * 2,
    base: rnd() * 500,
    floor: 50 + rnd() * 350,
    rescueBase: 200 + Math.floor(rnd() * 801),
    rescueCut: rnd(),
    partTerm: 10 + Math.floor(rnd() * 291),
    rescueTerm: 10 + Math.floor(rnd() * 291),
    cool: 5 + rnd() * 55,
    scanEvery: 10 + Math.floor(rnd() * 91),
  };
  const st = rollStations(); st.alpha.credits += 40000; st.beta.credits += 40000;
  const book = makeBook({ dials });
  let paidOut = 0;
  const t0 = treasury(st);
  for (let k = 0; k < 600; k++) {
    stepContracts(book, st, 0.5 + rnd(), PARTS);
    if (rnd() < 0.1) { const open = book.list.filter((c) => c.open); if (open.length) paidOut += fulfilContract(st, open[0], book.dials); }
    if (rnd() < 0.05) { const sid = rnd() < 0.5 ? "alpha" : "beta"; const p = PARTS[Math.floor(rnd() * 3)]; st[sid].parts[p].q = 1; }
    if (rnd() < 0.03) postRescueAt(book, st, rnd() < 0.5 ? "alpha" : "beta", Math.floor(rnd() * 4000));
  }
  check("escrow: credits conserve through every path at rolled dials", treasury(st) + escrowed(book) + paidOut === t0);
}

// the stations contract counts every problem in one pass
{
  const p1 = checkStations({ a: { credits: -1, cool: "x", parts: { p: { q: 1.5, c: "c" } } } });
  const p2 = checkStations(rollStations());
  const p3 = checkStations(null);
  check("escrow: the contract counts every problem", p1.length === 4 && p2.length === 0 && p3.length === 1);
}

// the module's own manifest: no import reaches outside its folder or a sibling module
{
  const src = fs.readFileSync(new URL("../src/modules/escrow/escrow.js", import.meta.url), "utf8");
  const specifiers = [...src.matchAll(/import[^'"]*from\s*["']([^"']+)["']/g)].map((m) => m[1]);
  const ok = specifiers.every((s) => /^\.\.\/[a-z0-9-]+\//.test(s) || /^\.\//.test(s));
  check("escrow: the module imports only from its own folder or a sibling module", ok);
}

console.log(`escrow-test: ${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
console.log("escrow-test PASS");
