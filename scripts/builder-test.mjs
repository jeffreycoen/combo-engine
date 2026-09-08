// COMBO-ENGINE — builder-test: the builder module's gate. Ten checks, all
// arithmetic against the deadweight demo's own numbers, seedless.
//
// Second pass: checks 11-14 exercise roles — a rolled spec whose engine
// part is moved to a role-only key, rcs and tank parts read by role from
// their own rows, the contract's role check, and the import-manifest check.
import { checkSpec, makeBuilder } from "../src/modules/builder/builder.js";
import { readFileSync } from "node:fs";

let pass = 0, fail = 0;
const check = (name, ok) => { if (ok) { pass++; console.log("PASS " + name); } else { fail++; console.log("FAIL " + name); } };
const near = (a, b) => Math.abs(a - b) < 1e-9;

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
console.log(`seeds {"builder":${SEED}}`);
const rng = mulberry32(SEED);
const rollIn = (lo, hi) => lo + rng() * (hi - lo);

// the demo's spec rows this gate needs, values verbatim from deadweight-hangar.html lines 171-182
const SPEC = {
  bridge: { kg: 4.0, ports: ["E", "W", "N", "S"] },
  engine: { kg: 6.0, ports: ["E", "N", "S"], thrust: 55 },
  pod: { kg: 3.0, ports: ["E", "W", "N", "S"] },
  tank: { kg: 2.5, ports: ["E", "W", "N", "S"], tank: 300 },
  mount: { kg: 3.5, ports: ["W"] },
  strut: { kg: 0.8, ports: ["E", "W", "N", "S"], weak: true },
  rcs: { kg: 1.2, ports: ["E", "W", "N", "S"], rcsN: 16 },
};

check("contract accepts the demo spec", checkSpec(SPEC).length === 0);
check("contract rejects junk (2 problems named)", checkSpec({ x: { kg: 0, ports: ["Q"] } }).length === 2);

const B = makeBuilder({ spec: SPEC });
// the starter dart: the demo's genesis build (deadweight-hangar.html line 346)
const starter = [{ t: "bridge", gx: 0, gy: 0 }, { t: "engine", gx: -1, gy: 0 }, { t: "pod", gx: 1, gy: 0 }];
const d = B.derive(starter);

check("starter mass is 13.0 kg (the demo's own self-test)", near(d.m, 13));
check("starter thrust is 55 N (the demo's own self-test)", d.F === 55);
check("starter balances: zero torque under burn, tau 26", near(d.tq, 0) && d.tau === 26);
check("starter fuel cap 260; one tank makes it 560",
  d.fuelCap === 260 && B.derive([...starter, { t: "tank", gx: 0, gy: 1 }]).fuelCap === 560);
check("starter welds: 2, both full strength 1200",
  (() => { const ws = B.weldsOf(starter); return ws.length === 2 && ws.every((w) => w.strength === 1200); })());
check("a strut joint is weak: 500",
  B.weldsOf([{ t: "bridge", gx: 0, gy: 0 }, { t: "strut", gx: 1, gy: 0 }])[0].strength === 500);
check("ports gate placement: open cell by the bridge yes, far cell no, mount's closed east face no",
  B.adjacencyOK(starter, 0, -1, "pod") === true &&
  B.adjacencyOK(starter, 5, 5, "pod") === false &&
  B.adjacencyOK([{ t: "mount", gx: 0, gy: 0 }], 1, 0, "pod") === false);
check("connectivity: whole starter reachable from the bridge; removing the engine leaves the rest whole",
  (() => {
    const all = B.connectedFrom(starter, B.weldsOf(starter), 0).size === 3;
    const rest = starter.filter((m) => m.t !== "engine");
    return all && B.connectedFrom(rest, B.weldsOf(rest), 0).size === rest.length;
  })());

{ let ok = true;
  for (let i = 0; i < 100; i++) {
    const thrust = rollIn(10, 100), kg = rollIn(1, 10);
    const specA = { ...SPEC, engine: { ...SPEC.engine, thrust, kg } };
    const specB = { ...specA };
    delete specB.engine;
    specB.thruster = { ...specA.engine, role: "engine" };
    const starterB = [{ t: "bridge", gx: 0, gy: 0 }, { t: "thruster", gx: -1, gy: 0 }, { t: "pod", gx: 1, gy: 0 }];
    const dA = makeBuilder({ spec: specA }).derive(starter);
    const dB = makeBuilder({ spec: specB }).derive(starterB);
    if (!(near(dA.m, dB.m) && near(dA.cx, dB.cx) && near(dA.cy, dB.cy) && near(dA.I, dB.I) &&
          near(dA.F, dB.F) && near(dA.tq, dB.tq) && dA.tau === dB.tau && dA.rcsN === dB.rcsN && dA.fuelCap === dB.fuelCap))
      ok = false;
  }
  check("builder: a rolled spec whose engine part is keyed thruster with role engine derives the same thrust and torque as the demo-keyed spec", ok); }

{ const specRT = {
    bridge: { kg: 4.0, ports: ["E", "W", "N", "S"] },
    rcsA: { kg: 1, ports: ["E", "W", "N", "S"], role: "rcs", rcsN: 10 },
    rcsB: { kg: 1, ports: ["E", "W", "N", "S"], role: "rcs", rcsN: 30 },
    tankA: { kg: 1, ports: ["E", "W", "N", "S"], role: "tank", tank: 100 },
    tankB: { kg: 1, ports: ["E", "W", "N", "S"], role: "tank", tank: 200 },
  };
  const BRT = makeBuilder({ spec: specRT });
  const layout = [
    { t: "bridge", gx: 0, gy: 0 },
    { t: "rcsA", gx: 1, gy: 0 },
    { t: "rcsB", gx: 2, gy: 0 },
    { t: "tankA", gx: 0, gy: 1 },
    { t: "tankB", gx: 0, gy: 2 },
  ];
  const dRT = BRT.derive(layout);
  check("builder: rcs and tank parts are read by role, each from its own row",
    dRT.rcsN === 5 + 10 + 30 && dRT.fuelCap === 260 + 100 + 200); }

check("builder: the contract counts a bad role",
  checkSpec({ x: { kg: 1, ports: ["E"], role: 5 } }).length === 1 && checkSpec(SPEC).length === 0);

{ const src = readFileSync(new URL("../src/modules/builder/builder.js", import.meta.url), "utf8");
  const specifiers = [...src.matchAll(/^import\s+.*?\bfrom\s+["']([^"']+)["']/gm)].map(m => m[1]);
  const ok = specifiers.every(spec => /^\.\.\/[a-z0-9-]+\//.test(spec) || /^\.\//.test(spec));
  check("builder: the module imports only from its own folder or a sibling module", ok); }

console.log(`builder-test: ${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
console.log("builder-test PASS");
