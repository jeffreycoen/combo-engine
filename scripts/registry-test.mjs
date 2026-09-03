// COMBO-ENGINE — registry-test. The table is proven against the tree: every
// registered module's file exists; every named gate is in the gate table;
// every module directory on disk is registered — no ghost, no orphan.
import fs from "node:fs";
import { REGISTRY, SEAMS, SOCKETS, moduleOf, modulesBySeam } from "../src/modules/registry/registry.js";
let pass = 0, fail = 0;
const check = (n, ok) => { if (ok) { pass++; console.log("PASS " + n); } else { fail++; console.log("FAIL " + n); } };
console.log("seeds {} — the tree is the fixture");
{ const missing = Object.keys(REGISTRY).filter((n) => !fs.existsSync("src/modules/" + n + "/" + (REGISTRY[n].file || n + ".js")));
  check("registry: every registered module's file exists on disk", missing.length === 0); }
{ const onDisk = fs.readdirSync("src/modules").filter((d) => fs.existsSync("src/modules/" + d + "/" + d + ".js"));
  const ghosts = onDisk.filter((d) => !REGISTRY[d]);
  check("registry: every module directory on disk is registered — no ghosts", ghosts.length === 0); }
{ const gateTable = fs.readFileSync("scripts/gate.mjs", "utf8");
  const bad = Object.entries(REGISTRY).filter(([n, r]) => r.gate && !gateTable.includes('"' + r.gate + '":'));
  check("registry: every named gate sits in the gate table", bad.length === 0); }
{ const badSeam = Object.values(REGISTRY).filter((r) => !SEAMS.includes(r.seam));
  check("registry: every seam is one of the four", badSeam.length === 0); }
{ check("registry: the lookups answer — a module by name, the modules of a seam, the three sockets",
    moduleOf("wells").seam === "sample" && moduleOf("nothing") === null
    && modulesBySeam("tick").includes("ballistics") && Object.keys(SOCKETS).length === 3); }
console.log(`registry-test: ${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
console.log("registry-test PASS");
