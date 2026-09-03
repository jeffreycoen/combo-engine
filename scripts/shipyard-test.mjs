// COMBO-ENGINE — shipyard-test: the grid builder's gate. VERBATIM MATH is
// ratified against the demo's own text: rotLegal, adjacencyOK, weldsOf,
// derive, and connectedFrom are lifted from deadweight-hangar.html at run
// time, their page globals shimmed, and driven twin with the module on
// rolled builds — every output must match exactly. NO HARDWIRED SEEDS.
import fs from "node:fs";
import { SPEC, CELL, WELD_S, WELD_WEAK, BRIDGE_RCS_TAU, BRIDGE_RCS_N, occupied, portDirs, rotLegal, nextFacing, adjacencyOK, weldsOf, derive, connectedFrom } from "../src/modules/shipyard/shipyard.js";

let pass = 0, fail = 0;
const check = (name, ok) => { if (ok) { pass++; console.log("PASS " + name); } else { fail++; console.log("FAIL " + name); } };
const SEED = process.env.SEED ? +process.env.SEED : Math.floor(Math.random() * 1e9);
console.log("seeds " + JSON.stringify({ builds: SEED }));
let a = SEED >>> 0;
const rnd = () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const TYPES = Object.keys(SPEC);
const rollBuild = () => {
  const n = 2 + Math.floor(rnd() * 9);
  const list = [{ t: "bridge", gx: 0, gy: 0 }];
  while (list.length < n) {
    const base = list[Math.floor(rnd() * list.length)];
    const [dx, dy] = [[1, 0], [-1, 0], [0, 1], [0, -1]][Math.floor(rnd() * 4)];
    const gx = base.gx + dx, gy = base.gy + dy;
    if (list.some((m) => m.gx === gx && m.gy === gy)) continue;
    const md = { t: TYPES[Math.floor(rnd() * TYPES.length)], gx, gy };
    if (rnd() < 0.4) md.f = Math.floor(rnd() * 4);
    list.push(md);
  }
  return list;
};

// the demo's own functions, lifted with their globals shimmed
const src = fs.readFileSync(new URL("../deadweight-hangar.html", import.meta.url), "utf8");
const fnSrc = (name, stop) => {
  const i = src.indexOf("function " + name + "(");
  const j = src.indexOf(stop, i + 1);
  return src.slice(i, j).trim().replace("function " + name, "function");
};
const GLOBALS = "SPEC,CELL,WELD_S,WELD_WEAK,BRIDGE_RCS_TAU,BRIDGE_RCS_N,build,portDirs";
const demoSPEC = JSON.parse(JSON.stringify(SPEC)); // the demo reads only law fields the module carries
const mk = (name, stop) => (build, ...args) => new Function(GLOBALS, "return (" + fnSrc(name, stop) + ")")(
  demoSPEC, CELL, WELD_S, WELD_WEAK, BRIDGE_RCS_TAU, BRIDGE_RCS_N, build, (m) => portDirs(m))(...args);
const dRotLegal = mk("rotLegal", "function nextFacing");
const dAdj = mk("adjacencyOK", "function weldsOf");
const dWelds = mk("weldsOf", "function derive");
const dDerive = mk("derive", "function connectedFrom");
const dConn = mk("connectedFrom", "/* =");

const numsOf = (d) => JSON.stringify([d.m, d.cx, d.cy, d.I, d.F, d.tq, d.tau, d.rcsN, d.fuelCap, d.pods, d.hasShield, d.engF.length, d.engR.length, d.engines.length, !!d.mount, !!d.rack, !!d.grap]);

let twins = true, detail = "";
for (let i = 0; i < 800 && twins; i++) {
  const list = rollBuild();
  const ws1 = weldsOf(list), ws2 = dWelds(list, list);
  if (JSON.stringify(ws1) !== JSON.stringify(ws2)) { twins = false; detail = "welds"; break; }
  if (numsOf(derive(list)) !== numsOf(dDerive(list, list))) { twins = false; detail = "derive"; break; }
  const root = Math.floor(rnd() * list.length);
  if (JSON.stringify([...connectedFrom(list, ws1, root)].sort()) !== JSON.stringify([...dConn(list, list, ws1, root)].sort())) { twins = false; detail = "conn"; break; }
  for (let gx = -3; gx <= 3 && twins; gx++) for (let gy = -3; gy <= 3 && twins; gy++) {
    const t = TYPES[Math.floor(rnd() * TYPES.length)];
    if (adjacencyOK(list, gx, gy, t) !== dAdj(list, gx, gy, t)) { twins = false; detail = "adjacency"; }
  }
  const md = list[Math.floor(rnd() * list.length)];
  for (let f2 = 0; f2 < 4 && twins; f2++) if (rotLegal(list, md, f2) !== dRotLegal(list, md, f2)) { twins = false; detail = "rot"; }
}
check("shipyard: 800 rolled builds run twin with the demo's own text — welds, derive, connectivity, adjacency, the nozzle rule" + (detail ? " [" + detail + "]" : ""), twins);

// the laws, stated on their own
{
  const dart = [{ t: "bridge", gx: 0, gy: 0 }, { t: "engine", gx: -1, gy: 0 }, { t: "pod", gx: 1, gy: 0 }];
  const d = derive(dart);
  check("shipyard: the starter dart derives — mass is the table's sum, one forward engine, base fuel plus nothing",
    Math.abs(d.m - 13) < 1e-12 && d.engF.length === 1 && d.engR.length === 0 && d.F === 55 && d.fuelCap === 260);
  const ws = weldsOf(dart);
  check("shipyard: the dart's two joints weld at full strength", ws.length === 2 && ws.every((w) => w.strength === WELD_S));
  const strutted = [{ t: "bridge", gx: 0, gy: 0 }, { t: "strut", gx: 1, gy: 0 }];
  check("shipyard: a strut joint is the weak weld, by design", weldsOf(strutted)[0].strength === WELD_WEAK);
  check("shipyard: the hull is one piece from the bridge", connectedFrom(dart, ws, 0).size === 3);
  const split = [{ t: "bridge", gx: 0, gy: 0 }, { t: "pod", gx: 5, gy: 5 }];
  check("shipyard: a floating part is not the hull", connectedFrom(split, weldsOf(split), 0).size === 1);
  check("shipyard: a shield's lone west port refuses an east-side neighbor and takes a west-side one",
    adjacencyOK([{ t: "shield", gx: 0, gy: 0 }], 1, 0, "pod") === false && adjacencyOK([{ t: "pod", gx: 0, gy: 0 }], 1, 0, "shield") === true);
  const eng = { t: "engine", gx: 1, gy: 0 };
  const hull = [{ t: "bridge", gx: 0, gy: 0 }, eng];
  check("shipyard: the nozzle never points into the hull — west-facing exhaust lands on the bridge and is refused",
    rotLegal(hull, eng, 0) === false && rotLegal(hull, eng, 2) === true && nextFacing(hull, eng) !== 0);
  check("shipyard: an occupied cell answers, an empty one does not",
    occupied(hull, 1, 0) === eng && occupied(hull, 9, 9) === undefined);
  const winged = [{ t: "bridge", gx: 0, gy: 0 }, { t: "rcs", gx: 4, gy: 0 }];
  const near = [{ t: "bridge", gx: 0, gy: 0 }, { t: "rcs", gx: 1, gy: 0 }];
  check("shipyard: wingtips are leverage — the far quad turns harder than the near one",
    derive(winged).tau > derive(near).tau && derive(near).rcsN === BRIDGE_RCS_N + SPEC.rcs.rcsN);
}
console.log(`shipyard-test: ${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
console.log("shipyard-test PASS");
