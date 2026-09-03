# Task 0.0.39-1 — the conserve module

One job: land the conservation books module and its gate, byte-for-byte from this plan. Every file's full content is below; write exactly what is written, run the listed gates, report. You design nothing.

Suggested model: Sonnet 5.

Required reading, in order (confirm at the top of your report):
1. This file, whole.
2. `docs/plans/phase-0.0.39-conserve.md`, whole.

Source of the math (reference only — do not edit it): `deadweight-hangar.html` lines 254-262, 316-344.

## Steps

Run from `/home/batman/combo-engine`. A failed assert stops the task; report the step and its verbatim output, run nothing further.

1. Assert the ground: prior gates green, destination absent.

```sh
node scripts/gate.mjs wells    # must end: wells-test: 9 PASS / 0 FAIL, then wells-test PASS
node scripts/gate.mjs escrow   # must end: escrow-test: 7 PASS / 0 FAIL, then escrow-test PASS
ls src/modules/conserve 2>/dev/null || echo absent   # must print: absent
```

2. Write `src/modules/conserve/conserve.js`, exactly:

```js
// MODULE: conserve — the deadweight hangar's books: a genesis declaration
// and the audit that proves credits, fuel, ordnance, and matter conserved
// across everything that ever trades, burns, or breaks. Lifted VERBATIM
// MATH from deadweight-hangar.html lines 254-262 and 316-344. Pure
// functions over plain objects; no globals, no clocks, no rng.
//
// Substitutions from the demo, numbered, and only these:
//   1. The module-scope GEN -> a genesis object from makeGenesis().
//   2. genesis()'s MKT walk -> genesisStations(gen, stations): the same
//      fold, the station table passed in (fuelPool/ordKg/credits keys and
//      part pools beside them, the demo's own shape).
//   3. audit()'s page-global walk (build, world.tramps, pirates, crates,
//      CONTRACTS, AUTH, FRONTIER, wreckage, debris, ship.hold, MKT) -> one
//      census object from makeCensus(seed) plus one count* helper per
//      entity class, each helper the demo's own fold with the global as an
//      argument. audit(gen, cz) carries lines 341-344 verbatim.
//   4. audit()'s accumulator initialization from the L ledger (line 317)
//      -> makeCensus({C, F, O}): the caller seeds the sums.

export function makeGenesis() { return { C0: 0, F0: 0, ORD0: 0, PARTS0: {} }; }

// genesisStations(gen, stations): every station's pools, treasury, fuel,
// and ordnance declared — the demo's genesis() fold, lines 256-261.
export function genesisStations(gen, stations) {
  for (const sid in stations) { const m = stations[sid];
    for (const k in m) { if (k === "fuelPool") { gen.F0 += m[k].q; gen.C0 += m[k].c; }
      else if (k === "ordKg") gen.ORD0 += m[k];
      else if (k === "credits") gen.C0 += m[k];
      else if (typeof m[k] !== "object") continue;
      else { gen.C0 += m[k].c; gen.PARTS0[k] = (gen.PARTS0[k] || 0) + m[k].q; } } }
}

// declare(gen, {credits, fuel, ord, parts}): the demo's inline GEN.C0+=...
// declarations, gathered behind one door.
export function declare(gen, d) {
  gen.C0 += d.credits || 0; gen.F0 += d.fuel || 0; gen.ORD0 += d.ord || 0;
  if (d.parts) for (const k in d.parts) gen.PARTS0[k] = (gen.PARTS0[k] || 0) + d.parts[k];
}

// makeCensus({C, F, O}): the audit's accumulators, seeded by the caller's
// own ledger — the demo's line 317.
export function makeCensus(seed) { return { C: seed.C || 0, F: seed.F || 0, O: seed.O || 0, P: {} }; }

// each count* helper is the demo's own fold with its global as an argument
export function countParts(cz, list, partKeyOf) { for (const md of list) cz.P[partKeyOf[md.t]] = (cz.P[partKeyOf[md.t]] || 0) + 1; }
export function countTramps(cz, tramps) { for (const tr of tramps) { cz.C += tr.credits; cz.F += tr.fuel;
  for (const k in tr.cargo) cz.P[k] = (cz.P[k] || 0) + tr.cargo[k]; } }
export function countPirates(cz, pirates, crates) {
  for (const pi of pirates) { cz.C += pi.credits; cz.F += pi.fuel; }
  for (const cr of crates) { cz.C += cr.credits; cz.F += cr.fuelU; } }
export function countEscrow(cz, contracts) { for (const ct of contracts) cz.C += ct.escrow; }
export function countPurse(cz, purse) { cz.C += purse.credits; cz.F += purse.fuel || 0; }
export function countWreckage(cz, wreckage, partKeyOf) {
  for (const wk of wreckage) { if (wk.t) cz.P[partKeyOf[wk.t]] = (cz.P[partKeyOf[wk.t]] || 0) + 1;
    cz.C += wk.credits || 0; cz.F += wk.fuelU || 0; } }
export function countStations(cz, stations) {
  for (const sid in stations) { const m = stations[sid];
    for (const k in m) { if (k === "fuelPool") { cz.F += m[k].q; cz.C += m[k].c; }
      else if (k === "ordKg") cz.O += m[k];
      else if (k === "credits") cz.C += m[k];
      else if (typeof m[k] !== "object") continue;
      else { cz.C += m[k].c; cz.P[k] = (cz.P[k] || 0) + m[k].q; } } }
}

// audit(gen, cz): the verdict — the demo's lines 341-344, verbatim.
export function audit(gen, cz) {
  const cD = cz.C - gen.C0, fD = cz.F - gen.F0, oD = cz.O - gen.ORD0;
  let pD = 0; for (const k in gen.PARTS0) pD += Math.abs((cz.P[k] || 0) - gen.PARTS0[k]);
  return { cD, fD: +fD.toFixed(6), oD: +oD.toFixed(6), pD, ok: cD === 0 && Math.abs(fD) < 1e-6 && Math.abs(oD) < 1e-9 && pD === 0 };
}
```

3. Write `scripts/conserve-test.mjs`, exactly:

```js
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
```

4. In `scripts/gate.mjs`, in the `GATES` table (currently 22 entries ending with `"wells"`), add one line after the `"wells"` entry:

```js
  "conserve": ["scripts/conserve-test.mjs"],
```

Touch nothing else in the file.

5. Run the new gate through the wrapper. The output must be a seeds line, 7 PASS lines, then exactly `conserve-test: 7 PASS / 0 FAIL`, then `conserve-test PASS`, exit 0. Any FAIL stops the task before step 6; report it with the run's seeds line.

```sh
node scripts/gate.mjs conserve
```

6. Assert the prior gates did not move (same required tails as step 1).

7. Close the records in this landing: bump `package.json` version to `0.0.39`; in `docs/plans/phase-0.0.39-conserve.md` replace the status line with `Status: LANDED, commit stamped below, 2026-09-03. Gate: 7 PASS / 0 FAIL; prior gates unmoved.`; in `docs/plans/batch-extractions-1.md` flip `- [ ] 0.0.39 conservation-audit` to `- [x] 0.0.39 conservation-audit`.

8. Commit and push the landing, then stamp the real hash in a second small commit — NEVER amend after stamping:

```sh
git add src/modules/conserve scripts/conserve-test.mjs scripts/gate.mjs package.json docs/plans
git commit -m "phase 0.0.39 — the books

Genesis and audit lifted verbatim from the deadweight demo; rolled worlds prove zero drift and every leak is caught by its needle. 7 PASS / 0 FAIL.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push origin main
H=$(git rev-parse --short HEAD)
sed -i "s/commit stamped below/commit \`$H\`/" docs/plans/phase-0.0.39-conserve.md
git add docs/plans && git commit -m "phase 0.0.39 record stamped — $H

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push origin main
```

## Acceptance

- Step 5: `conserve-test: 7 PASS / 0 FAIL` then `conserve-test PASS`, exit 0, and an `ok` line in `.superpowers/gates.log`.
- Step 6: both prior gates print their pinned tails unchanged.
- Step 7's records flipped, riding the landing commit.
- Push accepted by origin.
- File hashes after step 3: `src/modules/conserve/conserve.js` sha256 da3ca1f79bca0ad5d520abba28315e442e50b8fb373083b3bc4cbcc54affd28f; `scripts/conserve-test.mjs` sha256 3131d4f1cf9ac901d5f79fd9db5de0267d5c6dc5b1e34b047488b0b7d4d107d7.

## Report

Read-confirmation first, then one line of outcome, then bullets: the gate's seeds line, count line, and verdict line verbatim, every prior-gate tail, both commit hashes (landing and stamp), the push results. Every nonconformity its own labeled bullet. Seeds: rolled fresh at run time and printed; no seed is special.
