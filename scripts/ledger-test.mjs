// COMBO-ENGINE — ledger-test: the ledger module's gate. Nine checks. The
// conservation sweep reuses the market module: two pools and a wallet trading
// under the ledger's audit, drift exactly zero at every step. Fixture seed:
// 11 (no seed is special).
import { checkDimensions, makeLedger } from "../src/modules/ledger/ledger.js";
import { poolBuy, poolSell } from "../src/modules/market/market.js";
import { mulberry32 } from "../src/engine/core.js";

let pass = 0, fail = 0;
const check = (name, ok) => { if (ok) { pass++; console.log("PASS " + name); } else { fail++; console.log("FAIL " + name); } };

check("contract accepts [credits, units]", checkDimensions(["credits", "units"]).length === 0);
check("contract rejects junk (empty, blank, duplicate = 3 problems across calls)",
  checkDimensions([]).length === 1 && checkDimensions([""]).length === 1 && checkDimensions(["c", "c"]).length === 1);

// the toy world: one wallet, two market pools, genesis declared then sealed
const world = () => {
  const w = { credits: 500000, held: 0 };
  const a = { q: 14, c: 44800 };
  const b = { q: 30, c: 24000 };
  const L = makeLedger({ dimensions: ["credits", "units"] });
  L.declare("credits", w.credits + a.c + b.c);
  L.declare("units", a.q + b.q);
  L.seal();
  L.source("wallet", () => ({ credits: w.credits, units: w.held }));
  L.source("poolA", () => ({ credits: a.c, units: a.q }));
  L.source("poolB", () => ({ credits: b.c, units: b.q }));
  return { w, a, b, L };
};

check("a sealed genesis audits to zero drift", (() => { const { L } = world(); const r = L.audit(); return r.ok && r.drift.credits === 0 && r.drift.units === 0; })());
check("declare after seal throws", (() => { const { L } = world(); try { L.declare("credits", 1); return false; } catch (e) { return true; } })());

{ // the sweep: 10,000 seeded trades across both pools, audited every step
  const { w, a, b, L } = world();
  const r = mulberry32(11);
  let clean = true;
  for (let i = 0; i < 10000; i++) {
    const pool = r() < 0.5 ? a : b;
    if (r() < 0.5) { const c2 = poolBuy(pool, 1); if (c2 !== null) { w.credits -= c2; w.held += 1; } }
    else if (w.held > 0) { const o2 = poolSell(pool, 1); w.credits += o2; w.held -= 1; }
    if (!L.audit().ok) { clean = false; break; }
  }
  check("10,000 seeded trades audit to zero drift at every step", clean);

  // the mint: one credit from nowhere is caught, named, and exactly 1
  w.credits += 1;
  const caught = L.audit();
  check("a minted credit is caught: ok false, drift.credits exactly 1", caught.ok === false && caught.drift.credits === 1 && caught.drift.units === 0);

  // the write-off: the books record the destruction and balance again
  L.writeOff("credits", -1, "test mint reconciled");
  const after = L.audit();
  check("a write-off with a reason rebalances the books to zero", after.ok && after.drift.credits === 0 && L.writeOffs.length === 1 && L.writeOffs[0].reason === "test mint reconciled");
}

check("a dropped source shows as negative drift (value left the books)",
  (() => { const { a, L } = world(); L.dropSource("poolA"); const r2 = L.audit(); return !r2.ok && r2.drift.credits === -a.c && r2.drift.units === -a.q; })());
check("a source returning non-finite is a named finding, not a silent pass",
  (() => { const { L } = world(); L.source("bad", () => ({ credits: NaN })); const r2 = L.audit(); return r2.ok === false && String(r2.finding).includes("bad"); })());

console.log(`ledger-test: ${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
console.log("ledger-test PASS");
