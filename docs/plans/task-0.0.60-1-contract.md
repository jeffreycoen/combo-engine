# Task 0.0.60-1 — the contract pattern

One job: land the contract pattern and its gate, byte-for-byte from this plan. Write exactly what is written, run the listed gates, report. You design nothing.

Suggested model: Sonnet 5.

Required reading, in order (confirm at the top of your report):
1. This file, whole.
2. `docs/plans/phase-0.0.60-contract.md`, whole.

## Steps

Run from `/home/batman/combo-engine`. A failed assert stops the task; report the step and its verbatim output, run nothing further.

1. Assert the ground:

```sh
node scripts/gate.mjs frostline > /tmp/fl.out 2>&1; tail -1 /tmp/fl.out   # must print: frostline-test PASS
ls src/modules/contract 2>/dev/null || echo absent   # must print: absent
```

2. Write `src/modules/contract/contract.js`, exactly:

```js
// MODULE: contract — the harness's table checker. A contract declares what
// a spec table's rows must carry; the check walks every row against every
// rule and returns EVERY problem in one pass — a bad table never reaches
// the sim, and the report never stops at the first fault. SHAPED: the law
// is the checklist's words; the code is new. Pure; no globals, no rng.

// A contract: { fields: { name: { type: "number"|"string"|"boolean"|"array"|"object",
//   required, min, max, oneOf } }, allowExtra }.
// checkTable(name, table, contract) -> a list of plain problem strings, empty when clean.
export function checkTable(name, table, contract) {
  const problems = [];
  if (table == null || typeof table !== "object") return [name + ": the table is missing"];
  for (const rowKey in table) {
    const row = table[rowKey];
    if (row == null || typeof row !== "object") { problems.push(name + "." + rowKey + ": the row is not an object"); continue; }
    for (const f in contract.fields) {
      const rule = contract.fields[f];
      const v = row[f];
      if (v === undefined) { if (rule.required) problems.push(name + "." + rowKey + "." + f + ": required, missing"); continue; }
      const t = Array.isArray(v) ? "array" : typeof v;
      if (rule.type && t !== rule.type) { problems.push(name + "." + rowKey + "." + f + ": is " + t + ", must be " + rule.type); continue; }
      if (rule.min !== undefined && v < rule.min) problems.push(name + "." + rowKey + "." + f + ": " + v + " under the floor " + rule.min);
      if (rule.max !== undefined && v > rule.max) problems.push(name + "." + rowKey + "." + f + ": " + v + " over the ceiling " + rule.max);
      if (rule.oneOf && !rule.oneOf.includes(v)) problems.push(name + "." + rowKey + "." + f + ": " + v + " not one of " + rule.oneOf.join("/"));
    }
    if (contract.allowExtra === false) for (const f in row) if (!(f in contract.fields)) problems.push(name + "." + rowKey + "." + f + ": not in the contract");
  }
  return problems;
}

// assertTables(pairs) -> the boot's door: every table checked, every
// problem gathered, one throw carrying the whole report or a clean pass.
export function assertTables(pairs) {
  const all = [];
  for (const { name, table, contract } of pairs) all.push(...checkTable(name, table, contract));
  if (all.length) { const e = new Error("contract check failed:\n" + all.join("\n")); e.problems = all; throw e; }
  return true;
}
```

Then `sha256sum src/modules/contract/contract.js` — must print `6b030c170ee2d445bdbaecd3252f7dcfc50bd444952b9ac0d327e0b77c26386a`.

3. Write `scripts/contract-test.mjs`, exactly:

```js
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
```

Then `sha256sum scripts/contract-test.mjs` — must print `c9c89b19a86ed3ca284a0dbd3320620ffdadf7110acbe5c7476df368b0a53927`.

4. In `scripts/gate.mjs`, in the GATES table, add one line after the `"wells"` entry (or after the line the previous harness rung added, keeping this batch's entries together):

```js
  "contract": ["scripts/contract-test.mjs"],
```

5. Run the new gate. Must print a seeds line, 6 PASS lines, `contract-test: 6 PASS / 0 FAIL`, `contract-test PASS`, exit 0:

```sh
node scripts/gate.mjs contract
```

6. Prior gates unmoved: rerun the step-1 frostline command; same tail.

7. Close the records: `package.json` version to `0.0.60`; the phase doc's status line to LANDED as its comment shows; in `docs/plans/batch-harness-1.md` flip this rung's box; in `README.md` flip the checklist box starting `- [ ] The contract pattern` to `- [x]`, and add the line `- [x] contract — the contract pattern — 0.0.60` at the bottom of the "Serving checklist items" list.

8. Commit and push, then stamp:

```sh
git add src/modules/contract/contract.js scripts/contract-test.mjs scripts/gate.mjs package.json README.md docs/plans/phase-0.0.60-contract.md docs/plans/task-0.0.60-1-contract.md docs/plans/batch-harness-1.md
git commit -m "phase 0.0.60 — the contract pattern

Checklist: The contract pattern. Gate 6 PASS / 0 FAIL at rolled seeds.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push origin main
H=$(git rev-parse --short HEAD)
sed -i "s/commit stamped below/commit \`$H\`/" docs/plans/phase-0.0.60-contract.md
git add docs/plans/phase-0.0.60-contract.md && git commit -m "phase 0.0.60 record stamped — $H

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push origin main
```

## Acceptance

- Every sha256 above exact; the gate `6 PASS / 0 FAIL` then `contract-test PASS` at rolled seeds; frostline's tail unchanged; records flipped riding the landing; pushes accepted.

## Report

Read-confirmation first, then one line of outcome, then bullets: the sha256 lines verbatim, the new gate's seeds/count/verdict lines verbatim, the frostline tail, both commit hashes, the push results. Every nonconformity its own labeled bullet.
