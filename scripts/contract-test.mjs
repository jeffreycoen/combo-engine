// COMBO-ENGINE — contract-test. Laws at rolled tables: a clean table reports
// nothing; every planted defect is reported, all in one pass; the boot door
// throws once with the whole list; the engine's live squad table is clean
// under its own contract.
import { checkTable, assertTables } from "../src/modules/contract/contract.js";
import { SQUAD_SPECS } from "../src/depot/squads.js";

let pass = 0, fail = 0;
const check = (n, ok) => { if (ok) { pass++; console.log("PASS " + n); } else { fail++; console.log("FAIL " + n); } };
const SEED = process.env.SEED ? +process.env.SEED : Math.floor(Math.random() * 1e9);
console.log("seeds " + JSON.stringify({ tables: SEED }));
let a = SEED >>> 0;
const rnd = () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

const C = { fields: { cost: { type: "number", required: true, min: 0 }, n: { type: "number", required: true, min: 1, max: 12 }, tag: { type: "string", oneOf: ["a", "b", "c"] } } };
const cleanRow = () => ({ cost: Math.floor(rnd() * 500), n: 1 + Math.floor(rnd() * 12), tag: ["a", "b", "c"][Math.floor(rnd() * 3)] });

{ let clean = true;
  for (let i = 0; i < 200 && clean; i++) { const t = {}; for (let k = 0; k < 1 + Math.floor(rnd() * 8); k++) t["r" + k] = cleanRow();
    clean = checkTable("t", t, C).length === 0; }
  check("contract: two hundred rolled clean tables report nothing", clean); }
{ let exact = true;
  for (let i = 0; i < 200 && exact; i++) {
    const t = { good: cleanRow(), bad: cleanRow() };
    const defects = 1 + Math.floor(rnd() * 3);
    // one defect per field, disjoint: cost goes missing, n mis-types, tag leaves the list
    const kinds = ["missing", "type", "oneOf"].sort(() => rnd() - 0.5).slice(0, defects);
    for (const k of kinds) { if (k === "missing") delete t.bad.cost; if (k === "type") t.bad.n = "two"; if (k === "oneOf") t.bad.tag = "z"; }
    const got = checkTable("t", t, C);
    exact = got.length === defects && got.every((p) => p.startsWith("t.bad."));
  }
  check("contract: every planted defect is reported, all in one pass, none extra", exact); }
{ const t = { r: { cost: -3, n: 20, tag: "a" } };
  const got = checkTable("t", t, C);
  check("contract: the floor and the ceiling each report their own number",
    got.length === 2 && got.some((p) => p.includes("under the floor")) && got.some((p) => p.includes("over the ceiling"))); }
{ const t = { r: { cost: -1, n: 99, tag: "z" } };
  let threw = null; try { assertTables([{ name: "t", table: t, contract: C }]); } catch (e) { threw = e; }
  check("contract: the boot door throws once with the whole report", !!threw && threw.problems.length === 3); }
{ const SC = { fields: { cost: { type: "number", required: true, min: 1 }, n: { type: "number", required: true, min: 1 } } };
  check("contract: the engine's live squad table is clean under its own contract", checkTable("SQUAD_SPECS", SQUAD_SPECS, SC).length === 0); }
{ check("contract: a missing table is one plain problem, never a crash", checkTable("gone", null, C).length === 1); }

console.log(`contract-test: ${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
console.log("contract-test PASS");
