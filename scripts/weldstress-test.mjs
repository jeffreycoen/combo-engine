// COMBO-ENGINE — weldstress-test: the weld-stress module's gate. Nine
// checks, seedless arithmetic on the demo's own numbers, composing with the
// builder module.
//
// Second pass: checks 10-12 exercise the load factor, the welds contract,
// and the import law, at a rolled seed.
import { makeBuilder } from "../src/modules/builder/builder.js";
import { weldLoads, ratedLimits, breaking, splitByRoot, LOAD_FACTOR, checkWelds } from "../src/modules/weldstress/weldstress.js";
import { readFileSync } from "node:fs";

let pass = 0, fail = 0;
const check = (name, ok) => { if (ok) { pass++; console.log("PASS " + name); } else { fail++; console.log("FAIL " + name); } };
const near = (a, b) => Math.abs(a - b) < 1e-9;
const nearRel = (a, b, tol = 1e-9) => Math.abs(a - b) <= tol * Math.max(1, Math.abs(a), Math.abs(b));

// the small seeded stream the other gates use
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const SEED = process.env.SEED ? (parseInt(process.env.SEED, 10) >>> 0) : ((Math.random() * 0xffffffff) >>> 0);
console.log(`seeds {"weldstress":${SEED}}`);
const rng = mulberry32(SEED);
const rollIn = (lo, hi) => lo + rng() * (hi - lo);

const SPEC = {
  bridge: { kg: 4.0, ports: ["E", "W", "N", "S"] },
  engine: { kg: 6.0, ports: ["E", "N", "S"], thrust: 55 },
  pod: { kg: 3.0, ports: ["E", "W", "N", "S"] },
  strut: { kg: 0.8, ports: ["E", "W", "N", "S"], weak: true },
};
const B = makeBuilder({ spec: SPEC });
const starter = [{ t: "bridge", gx: 0, gy: 0 }, { t: "engine", gx: -1, gy: 0 }, { t: "pod", gx: 1, gy: 0 }];
const ws = B.weldsOf(starter);

{ const loads = weldLoads(B, SPEC, starter, ws, 1);
  check("smaller sides: engine weld carries 6 kg, pod weld 3 kg", loads[0].om === 6 && loads[1].om === 3);
  check("load law at 1 u/s2: 54 and 27 (mass x 9)", near(loads[0].load, 54) && near(loads[1].load, 27)); }
{ const lims = ratedLimits(B, SPEC, starter, ws);
  check("rated limits: 1200/(6x9) and 1200/(3x9)", near(lims[0].gLim, 1200 / 54) && near(lims[1].gLim, 1200 / 27)); }
{ const loads = weldLoads(B, SPEC, starter, ws, 3.526);
  check("full burn (3.526 u/s2) breaks nothing on the starter", breaking(loads, ws).length === 0); }
{ const loads = weldLoads(B, SPEC, starter, ws, 23);
  check("23 u/s2 shears exactly the engine weld (54x23=1242 > 1200; 27x23=621 holds)", breaking(loads, ws).length === 1 && breaking(loads, ws)[0] === 0); }
{ const strutted = [...starter, { t: "strut", gx: 2, gy: 0 }];
  const ws2 = B.weldsOf(strutted);
  const loads = weldLoads(B, SPEC, strutted, ws2, 63);
  const idx = breaking(loads, ws2);
  check("a strut joint is weak (500) and its rating is 500/(0.8x9); at 63 u/s2 the engine weld shears",
    near(ratedLimits(B, SPEC, strutted, ws2)[2].gLim, 500 / (0.8 * 9)) && idx.includes(0)); }
{ // the split: cut the engine weld, the bridge keeps the pod, the engine goes
  const cut = ws.filter((w) => !(w.a === 0 && w.b === 1));
  const r = splitByRoot(B, starter, cut, 0);
  check("splitting on a cut engine weld keeps bridge+pod, sheds the engine",
    r.kept.length === 2 && r.kept[0].t === "bridge" && r.kept[1].t === "pod" && r.gone.length === 1 && r.gone[0].t === "engine");
  check("the kept ship's weld is reindexed and whole", r.welds.length === 1 && r.welds[0].a === 0 && r.welds[0].b === 1 &&
    B.connectedFrom(r.kept, r.welds, 0).size === 2); }
check("an uncut ship splits into itself: nothing gone",
  (() => { const r = splitByRoot(B, starter, ws, 0); return r.kept.length === 3 && r.gone.length === 0; })());

{ let ok = true;
  const omKnown = [6, 3];
  for (let i = 0; i < 200; i++) {
    const k = rollIn(1, 30);
    const aMag = rollIn(0.1, 50);
    const loads = weldLoads(B, SPEC, starter, ws, aMag, k);
    const lims = ratedLimits(B, SPEC, starter, ws, k);
    for (let j = 0; j < 2; j++) {
      const expLoad = aMag * omKnown[j] * k;
      const expGLim = ws[j].strength / Math.max(omKnown[j], 0.1) / k;
      if (!nearRel(loads[j].load, expLoad)) ok = false;
      if (!nearRel(lims[j].gLim, expGLim)) ok = false;
    }
  }
  check("weldstress: a rolled factor scales every load and every rating exactly", ok); }

{ const bad = checkWelds([{ a: 0.5, b: "x", strength: 0 }]);
  const good = checkWelds(ws);
  const none = checkWelds(null);
  check("weldstress: the contract counts every problem", bad.length === 3 && good.length === 0 && none.length === 1); }

{ const src = readFileSync(new URL("../src/modules/weldstress/weldstress.js", import.meta.url), "utf8");
  const specifiers = [...src.matchAll(/^import\s+.*?\bfrom\s+["']([^"']+)["']/gm)].map((m) => m[1]);
  const ok = specifiers.every((spec) => /^\.\.\/[a-z0-9-]+\//.test(spec) || /^\.\//.test(spec));
  check("weldstress: the module imports only from its own folder or a sibling module", ok); }

console.log(`weldstress-test: ${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
console.log("weldstress-test PASS");
