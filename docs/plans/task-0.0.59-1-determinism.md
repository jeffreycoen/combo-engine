# Task 0.0.59-1 — the determinism kit

One job: land the determinism kit and its gate, byte-for-byte from this plan. Write exactly what is written, run the listed gates, report. You design nothing.

Suggested model: Sonnet 5.

Required reading, in order (confirm at the top of your report):
1. This file, whole.
2. `docs/plans/phase-0.0.59-determinism.md`, whole.

## Steps

Run from `/home/batman/combo-engine`. A failed assert stops the task; report the step and its verbatim output, run nothing further.

1. Assert the ground:

```sh
node scripts/gate.mjs frostline > /tmp/fl.out 2>&1; tail -1 /tmp/fl.out   # must print: frostline-test PASS
ls src/modules/determinism 2>/dev/null || echo absent   # must print: absent
```

2. Write `src/modules/determinism/determinism.js`, exactly:

```js
// MODULE: determinism — the harness's determinism kit. One seeded stream
// for the sim (the engine's own), a second for effects the sim never
// reads, and bit-exact hashing for state. The sim stream is re-exported
// from the engine so there is exactly one; the hash fold is lifted
// VERBATIM MATH from the deadweight demo (deadweight-hangar.html lines
// 134-153), its module-scope buffer and seed constant carried whole.
import { mulberry32, worldHash } from "../../engine/core.js";

export { mulberry32 as simStream, worldHash };

// fxStream(seed): the effects draw — its own stream, decoupled by a fixed
// fold so no page can accidentally hand the sim's sequence to sparks.
export const FX_SALT = 0x9e3779b9;
export function fxStream(seed) { return mulberry32((seed ^ FX_SALT) >>> 0); }

// the hash fold, the demo's own: doubles through one buffer, FNV-1a step
const _buf = new ArrayBuffer(8);
const _dv = new DataView(_buf);
export const FNV_SEED = 0x811c9dc5;
export function hashFloats(hash, ...vals) {
  let h = hash >>> 0;
  for (const v of vals) {
    _dv.setFloat64(0, +v || 0);
    for (let i = 0; i < 8; i++) { h ^= _dv.getUint8(i); h = Math.imul(h, 0x01000193) >>> 0; }
  }
  return h >>> 0;
}
// stateHash(seed, rows): a whole state as one number — rows of plain
// numbers folded in order from the FNV seed.
export function stateHash(rows) {
  let h = FNV_SEED;
  for (const r of rows) h = hashFloats(h, ...r);
  return h >>> 0;
}
```

Then `sha256sum src/modules/determinism/determinism.js` — must print `98b3d9f25a8fd5b6d11183a9edc0461b243526f075d803de3b084c0783f5533b`.

3. Write `scripts/determinism-test.mjs`, exactly:

```js
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
```

Then `sha256sum scripts/determinism-test.mjs` — must print `66807062cd0a66413a6eb9165a749ebfe99f2c31c663652c36aa4612bba80288`.

4. In `scripts/gate.mjs`, in the GATES table, add one line after the `"wells"` entry (or after the line the previous harness rung added, keeping this batch's entries together):

```js
  "determinism": ["scripts/determinism-test.mjs"],
```

5. Run the new gate. Must print a seeds line, 5 PASS lines, `determinism-test: 5 PASS / 0 FAIL`, `determinism-test PASS`, exit 0:

```sh
node scripts/gate.mjs determinism
```

6. Prior gates unmoved: rerun the step-1 frostline command; same tail.

7. Close the records: `package.json` version to `0.0.59`; the phase doc's status line to LANDED as its comment shows; in `docs/plans/batch-harness-1.md` flip this rung's box; in `README.md` flip the checklist box starting `- [ ] Determinism kit` to `- [x]`, and add the line `- [x] determinism — the determinism kit — 0.0.59` at the bottom of the "Serving checklist items" list.

8. Commit and push, then stamp:

```sh
git add src/modules/determinism/determinism.js scripts/determinism-test.mjs scripts/gate.mjs package.json README.md docs/plans/phase-0.0.59-determinism.md docs/plans/task-0.0.59-1-determinism.md docs/plans/batch-harness-1.md
git commit -m "phase 0.0.59 — the determinism kit

Checklist: Determinism kit. Gate 5 PASS / 0 FAIL at rolled seeds.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push origin main
H=$(git rev-parse --short HEAD)
sed -i "s/commit stamped below/commit \`$H\`/" docs/plans/phase-0.0.59-determinism.md
git add docs/plans/phase-0.0.59-determinism.md && git commit -m "phase 0.0.59 record stamped — $H

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push origin main
```

## Acceptance

- Every sha256 above exact; the gate `5 PASS / 0 FAIL` then `determinism-test PASS` at rolled seeds; frostline's tail unchanged; records flipped riding the landing; pushes accepted.

## Report

Read-confirmation first, then one line of outcome, then bullets: the sha256 lines verbatim, the new gate's seeds/count/verdict lines verbatim, the frostline tail, both commit hashes, the push results. Every nonconformity its own labeled bullet.
