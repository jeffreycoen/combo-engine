// COMBO-ENGINE — badge-test. The badge's number is a law: twin boots of one
// rolled mission seed carry one hash; a different seed carries another.
import { bootMission, MISSION_R1 } from "../src/games/frostline/mission.js";
import { worldHash } from "../src/modules/determinism/determinism.js";
import { gateNames } from "./selftest.mjs";
import fs from "node:fs";
let pass = 0, fail = 0;
const check = (n, ok) => { if (ok) { pass++; console.log("PASS " + n); } else { fail++; console.log("FAIL " + n); } };
const SEED = process.env.SEED ? +process.env.SEED : Math.floor(Math.random() * 1e9);
console.log("seeds " + JSON.stringify({ badge: SEED }));
const h1 = worldHash(bootMission(MISSION_R1, SEED).war.world);
const h2 = worldHash(bootMission(MISSION_R1, SEED).war.world);
const h3 = worldHash(bootMission(MISSION_R1, SEED + 40).war.world);
check("badge: twin boots of one rolled seed show one number", h1 === h2 && h1 === (h1 >>> 0));
check("badge: a different valley shows a different number", h1 !== h3);
{ const text = fs.readFileSync("scripts/gate.mjs", "utf8");
  const start = text.indexOf("const GATES = {");
  const end = text.indexOf("};", start);
  const body = text.slice(start, end);
  const count = body.split("\n").filter((l) => /^\s*"[a-z0-9-]+":\s*\[/.test(l)).length;
  const names = gateNames();
  check("badge: the self-test's list equals the gate table's keys",
    names.length === count && names[0] === "api" && names.includes("registry") && names.includes("aim") && names.includes("render2d")); }
console.log(`badge-test: ${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
console.log("badge-test PASS");
