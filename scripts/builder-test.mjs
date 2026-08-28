// COMBO-ENGINE — builder-test: the builder module's gate. Ten checks, all
// arithmetic against the deadweight demo's own numbers. No randomness.
import { checkSpec, makeBuilder } from "../src/modules/builder/builder.js";

let pass = 0, fail = 0;
const check = (name, ok) => { if (ok) { pass++; console.log("PASS " + name); } else { fail++; console.log("FAIL " + name); } };
const near = (a, b) => Math.abs(a - b) < 1e-9;

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

console.log(`builder-test: ${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
console.log("builder-test PASS");
