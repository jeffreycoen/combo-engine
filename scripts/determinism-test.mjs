// COMBO-ENGINE — determinism-test. Laws at rolled seeds: twin streams are
// identical; the effects stream never touches the sim's sequence; the hash
// fold is bit-exact, order-sensitive, and twin with the demo's own text.
import fs from "node:fs";
import { simStream, fxStream, hashFloats, stateHash, FNV_SEED } from "../src/modules/determinism/determinism.js";

let pass = 0, fail = 0;
const check = (n, ok) => { if (ok) { pass++; console.log("PASS " + n); } else { fail++; console.log("FAIL " + n); } };
const SEED = process.env.SEED ? +process.env.SEED : Math.floor(Math.random() * 1e9);
console.log("seeds " + JSON.stringify({ kit: SEED }));

{ const a = simStream(SEED), b = simStream(SEED); let twin = true;
  for (let i = 0; i < 5000; i++) if (a() !== b()) { twin = false; break; }
  check("determinism: twin sim streams from one rolled seed are identical for 5000 draws", twin); }
{ const a = simStream(SEED); const ref = []; for (let i = 0; i < 100; i++) ref.push(a());
  const s = simStream(SEED); const fx = fxStream(SEED);
  const out = []; for (let i = 0; i < 100; i++) { fx(); fx(); out.push(s()); }
  check("determinism: effects draws never move the sim's sequence", JSON.stringify(out) === JSON.stringify(ref)); }
{ const fx = fxStream(SEED), s = simStream(SEED); let differ = false;
  for (let i = 0; i < 50 && !differ; i++) if (fx() !== s()) differ = true;
  check("determinism: the effects stream is its own, not the sim's", differ); }
{ const h1 = stateHash([[1, 2.5, SEED]]), h2 = stateHash([[1, 2.5, SEED]]);
  const h3 = stateHash([[1, 2.5, SEED + 1]]), h4 = stateHash([[2.5, 1, SEED]]);
  check("determinism: the state hash is bit-exact, seed-sensitive, order-sensitive",
    h1 === h2 && h1 !== h3 && h1 !== h4 && h1 === (h1 >>> 0)); }
{ const src = fs.readFileSync(new URL("../deadweight-hangar.html", import.meta.url), "utf8");
  const i = src.indexOf("function hashFloats"); const j = src.indexOf("\n}", i) + 2;
  const demoHF = new Function("_dv", "return (" + src.slice(i, j).replace("function hashFloats", "function") + ")")(new DataView(new ArrayBuffer(8)));
  let twin = true;
  const r = simStream(SEED ^ 7);
  for (let k = 0; k < 500 && twin; k++) { const v = [r() * 1000, r() - 0.5, k];
    twin = hashFloats(FNV_SEED, ...v) === demoHF(FNV_SEED, ...v); }
  check("determinism: the hash fold runs twin with the demo's own text on 500 rolled rows", twin); }

console.log(`determinism-test: ${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
console.log("determinism-test PASS");
