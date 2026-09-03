# Task 0.0.37-1 — the escrow module

One job: land the contract escrow module and its gate, byte-for-byte from this plan. Every file's full content is below; write exactly what is written, run the listed gates, report. You design nothing.

Suggested model: Sonnet 5.

Required reading, in order (confirm at the top of your report):
1. This file, whole.
2. `docs/plans/phase-0.0.37-escrow.md`, whole.

Source of the math (reference only — do not edit it): `deadweight-hangar.html` lines 267-302.

## Steps

Run from `/home/batman/combo-engine`. A failed assert stops the task; report the step and its verbatim output, run nothing further.

1. Assert the ground: prior gates green, destination absent.

```sh
node scripts/gate.mjs poolmarket   # must end: poolmarket-test: 10 PASS / 0 FAIL, then poolmarket-test PASS
node scripts/gate.mjs market       # must end: market-test: 8 PASS / 0 FAIL, then market-test PASS
ls src/modules/escrow 2>/dev/null || echo absent   # must print: absent
```

2. Write `src/modules/escrow/escrow.js`, exactly:

```js
// MODULE: escrow — station contracts with money held in escrow, lifted
// VERBATIM MATH from the deadweight hangar demo (deadweight-hangar.html
// lines 267-302). A starving station locks part of its treasury behind a
// posted bounty; fulfilment pays the escrow once and restocks; expiry
// returns every cent to the treasury. Credits are conserved through every
// path. Pure state over plain objects; no globals, no clocks, no rng.
//
// Substitutions from the demo, numbered, and only these:
//   1. The module-scope CONTRACTS array and ctSeq/ctScan counters -> a book
//      object from makeBook(): { list, seq, scan }.
//   2. The module-scope MKT table -> the `stations` argument:
//      { [sid]: { parts: { [part]: {q, c} }, credits, cool } } — the demo's
//      station object keyed the pools directly beside credits; here the
//      pools live under `parts`, the one shape change the lift makes.
//   3. postContract's hard-coded other station (cloister/hollow pair) ->
//      the `otherSid` argument.
//   4. postRescue's trampValue(tr) and nearest-station scan -> the caller
//      passes `sid` and `value`; the fee law is the demo's line 281 exactly.
//   5. stepContracts' fixed part scan list -> the `partOrder` argument.
//   6. Function name postRescue -> postRescueAt (the scan moved out).

export function makeBook() { return { list: [], seq: 0, scan: 0 }; }

// postContract(book, stations, sid, otherSid, part): the starving station
// escrows a bounty priced off the OTHER station's spot plus the daring
// margin. Refuses under 200 — a broke station posts nothing.
export function postContract(book, stations, sid, otherSid, part) {
  const m = stations[sid];
  const other = stations[otherSid].parts[part];
  const srcSpot = other.c / Math.max(1, other.q);
  let pay = Math.ceil(srcSpot * 1.55 + 120);
  pay = Math.min(pay, m.credits);
  if (pay < 200) return;
  m.credits -= pay;
  book.list.push({ id: "C" + (++book.seq), at: sid, part, n: 1, pay, escrow: pay, t: 120, open: true });
}

// postRescueAt(book, stations, sid, value): the rescue fee — the station
// pays 600 plus 30% of the stranded value, capped by its whole treasury.
export function postRescueAt(book, stations, sid, value) {
  const m = stations[sid];
  const fee = Math.min(m.credits, 600 + Math.round(value * 0.3));
  if (fee < 200) return null;
  m.credits -= fee;
  const ct = { id: "R" + (++book.seq), kind: "rescue", at: sid, pay: fee, escrow: fee, t: 150, open: true };
  book.list.push(ct); return ct;
}

// fulfilContract(stations, ct): pays the escrow once; a part contract
// restocks its station; a second fulfil pays nothing.
export function fulfilContract(stations, ct) {
  if (!ct.open) return 0;
  ct.open = false;
  if (ct.kind !== "rescue") stations[ct.at].parts[ct.part].q += ct.n;
  const pay = ct.escrow; ct.escrow = 0;
  stations[ct.at].cool = 30;
  return pay;
}

// stepContracts(book, stations, dt, partOrder): expiry returns escrow to
// the treasury; every 60th call scans each cooled station and posts one
// contract for its first starved part.
export function stepContracts(book, stations, dt, partOrder) {
  for (const ct of book.list) if (ct.open) { ct.t -= dt;
    if (ct.t <= 0) { ct.open = false; stations[ct.at].credits += ct.escrow; ct.escrow = 0; stations[ct.at].cool = 30; } }
  for (const sid in stations) if (stations[sid].cool > 0) stations[sid].cool -= dt;
  if ((book.scan++) % 60) return;
  const sids = Object.keys(stations);
  for (const sid of sids) { const m = stations[sid];
    if (m.cool > 0) continue;
    if (book.list.some((c) => c.open && c.kind !== "rescue" && c.at === sid)) continue;
    for (const part of partOrder) {
      if (m.parts[part].q <= 1) { postContract(book, stations, sid, sids.find((o) => o !== sid), part); break; } } }
}
```

3. Write `scripts/escrow-test.mjs`, exactly:

```js
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
```

4. In `scripts/gate.mjs`, in the `GATES` table (currently 20 entries ending with `"poolmarket"`), add one line after the `"poolmarket"` entry:

```js
  "escrow": ["scripts/escrow-test.mjs"],
```

Touch nothing else in the file.

5. Run the new gate through the wrapper. The output must be a seeds line, 7 PASS lines, then exactly `escrow-test: 7 PASS / 0 FAIL`, then `escrow-test PASS`, exit 0. Any FAIL stops the task before step 6; report it with the run's seeds line.

```sh
node scripts/gate.mjs escrow
```

6. Assert the prior gates did not move (same required tails as step 1).

7. Close the records in this landing: bump `package.json` version to `0.0.37`; in `docs/plans/phase-0.0.37-escrow.md` replace the status line with `Status: LANDED, commit stamped below, 2026-09-03. Gate: 7 PASS / 0 FAIL; prior gates unmoved.`; in `docs/plans/batch-extractions-1.md` flip `- [ ] 0.0.37 escrow-contracts` to `- [x] 0.0.37 escrow-contracts`.

8. Commit and push the landing, then stamp the real hash in a second small commit — NEVER amend after stamping:

```sh
git add src/modules/escrow scripts/escrow-test.mjs scripts/gate.mjs package.json docs/plans
git commit -m "phase 0.0.37 — the escrow contracts

Contract escrow lifted verbatim from the deadweight demo; conservation ratifies every path at rolled seeds. 7 PASS / 0 FAIL.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push origin main
H=$(git rev-parse --short HEAD)
sed -i "s/commit stamped below/commit \`$H\`/" docs/plans/phase-0.0.37-escrow.md
git add docs/plans && git commit -m "phase 0.0.37 record stamped — $H

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push origin main
```

## Acceptance

- Step 5: `escrow-test: 7 PASS / 0 FAIL` then `escrow-test PASS`, exit 0, and an `ok` line in `.superpowers/gates.log`.
- Step 6: both prior gates print their pinned tails unchanged.
- Step 7's records flipped, riding the landing commit.
- Push accepted by origin.
- File hashes after step 3: `src/modules/escrow/escrow.js` sha256 7a6d48efbdb0a7fba18053a8f54a9e4e511304bfc9f6d9d8223886b8c0674f39; `scripts/escrow-test.mjs` sha256 1252098d60a9862ee3cdda617f3ce0309f17ce1b9b0f6661bac1b6640cf654f0.

## Report

Read-confirmation first, then one line of outcome, then bullets: the gate's seeds line, count line, and verdict line verbatim, every prior-gate tail, both commit hashes (landing and stamp), the push results. Every nonconformity its own labeled bullet. Seeds: rolled fresh at run time and printed; no seed is special.
