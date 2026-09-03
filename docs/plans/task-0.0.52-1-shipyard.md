# Task 0.0.52-1 — the shipyard module

One job: land the grid builder's laws and their gate, byte-for-byte from this plan. Every file's full content is below; write exactly what is written, run the listed gates, report. You design nothing.

Suggested model: Sonnet 5.

Required reading, in order (confirm at the top of your report):
1. This file, whole.
2. `docs/plans/phase-0.0.52-shipyard.md`, whole.

Source of the math (reference only — do not edit it): `deadweight-hangar.html` lines 171-182, 195, 227-229, 347-400.

## Steps

Run from `/home/batman/combo-engine`. A failed assert stops the task; report the step and its verbatim output, run nothing further.

1. Assert the ground: prior gates green, destination absent.

```sh
node scripts/gate.mjs wells | tail -1      # must print: wells-test PASS
node scripts/gate.mjs conserve | tail -1   # must print: conserve-test PASS
ls src/modules/shipyard 2>/dev/null || echo absent   # must print: absent
```

2. Write `src/modules/shipyard/shipyard.js`, exactly:

```js
// MODULE: shipyard — the deadweight hangar's grid builder laws, lifted
// VERBATIM MATH from deadweight-hangar.html: the part table (171-182), the
// grid cell and weld strengths (195, 227-229), occupancy and ports
// (347-348), the nozzle rule (349-352), next facing (353-354), placement
// adjacency (365-371), the weld list (372-377), the derived body (378-397),
// and hull connectivity (398-400). Pure functions over plain objects; no
// globals, no clocks, no rng.
//
// Substitutions from the demo, numbered, and only these:
//   1. The page-global `build` -> the `list` argument on occupied, rotLegal,
//      nextFacing, and adjacencyOK.
//   2. The render color rows (col) are dropped from the part table — the
//      module ships laws, not paint. Every other field is the demo's.
//   3. doRot/doRm/slog (wallet, pools, log lines) stay on the page; their
//      connectivity guard is connectedFrom, carried here.
//   4. derive's two dead stores (lines 390-392: an F and tq the return
//      recomputes and shadows) are dropped; the returned arithmetic is
//      untouched and twin-proven against the demo's own text.

export const SPEC = {
  bridge: { nm: "BRIDGE", kg: 4.0, price: 12000, ports: ["E", "W", "N", "S"] },
  engine: { nm: "ENGINE", kg: 6.0, price: 9000, ports: ["E", "N", "S"], thrust: 55 },
  pod: { nm: "CARGO POD", kg: 3.0, price: 4500, ports: ["E", "W", "N", "S"] },
  tank: { nm: "FUEL TANK", kg: 2.5, price: 3800, ports: ["E", "W", "N", "S"], tank: 300 },
  shield: { nm: "SHIELD GEN", kg: 5.0, price: 11000, ports: ["W"] },
  mount: { nm: "SLUG MOUNT", kg: 3.5, price: 7500, ports: ["W"], slugs: 40 },
  strut: { nm: "STRUT", kg: 0.8, price: 900, ports: ["E", "W", "N", "S"], weak: true },
  rcs: { nm: "RCS QUAD", kg: 1.2, price: 2600, ports: ["E", "W", "N", "S"], rcsN: 16 },
  rack: { nm: "MISSILE RACK", kg: 2.5, price: 6500, ports: ["W"], birds: 4 },
  grapple: { nm: "GRAPPLE", kg: 2.0, price: 5200, ports: ["W"] },
};
export const CELL = 4;
export const WELD_S = 1200, WELD_WEAK = 500;
export const BRIDGE_RCS_TAU = 26, BRIDGE_RCS_N = 5;

export function occupied(list, gx, gy) { return list.find((m) => m.gx === gx && m.gy === gy); }
export function portDirs(m) { return SPEC[m.t].ports.map((p) => ({ E: [1, 0], W: [-1, 0], N: [0, -1], S: [0, 1] }[p])); }

// rotLegal(list, md, f2): one law — the nozzle never points into the hull.
export function rotLegal(list, md, f2) {
  const ldx = [1, 0, -1, 0][f2], ldy = [0, 1, 0, -1][f2];
  const nx2 = md.gx - ldx, ny2 = md.gy - ldy;
  return !list.some((n) => n !== md && n.gx === nx2 && n.gy === ny2);
}
export function nextFacing(list, md) {
  for (let k = 1; k <= 4; k++) { const f2 = ((md.f || 0) + k) % 4;
    if (rotLegal(list, md, f2)) return f2; } return md.f || 0;
}

// adjacencyOK(list, gx, gy, t): a cell is placeable if some neighbor's port
// faces it AND the new part has a port facing back.
export function adjacencyOK(list, gx, gy, t) {
  for (const m of list) { const dx = gx - m.gx, dy = gy - m.gy;
    if (Math.abs(dx) + Math.abs(dy) !== 1) continue;
    const out = portDirs(m).some((d) => d[0] === dx && d[1] === dy);
    const back = SPEC[t].ports.map((p) => ({ E: [1, 0], W: [-1, 0], N: [0, -1], S: [0, 1] }[p])).some((d) => d[0] === -dx && d[1] === -dy);
    if (out && back) return true; }
  return false;
}

export function weldsOf(list) {
  const ws = [];
  for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
    const a = list[i], b = list[j];
    if (Math.abs(a.gx - b.gx) + Math.abs(a.gy - b.gy) === 1)
      ws.push({ a: i, b: j, strength: (SPEC[a.t].weak || SPEC[b.t].weak) ? WELD_WEAK : WELD_S }); }
  return ws;
}

export function derive(list) {
  let m = 0, cx = 0, cy = 0;
  for (const md of list) { const kg = SPEC[md.t].kg; m += kg; cx += md.gx * CELL * kg; cy += md.gy * CELL * kg; }
  cx /= m; cy /= m;
  let I = 0; for (const md of list) { const kg = SPEC[md.t].kg; const r2 = (md.gx * CELL - cx) ** 2 + (md.gy * CELL - cy) ** 2; I += kg * (r2 + 3); }
  const engines = list.filter((md) => md.t === "engine");
  const tanks = list.filter((md) => md.t === "tank");
  const rcsMods = list.filter((md) => md.t === "rcs");
  let tau = list.some((md) => md.t === "bridge") ? BRIDGE_RCS_TAU : 0;
  let rcsN = list.some((md) => md.t === "bridge") ? BRIDGE_RCS_N : 0;
  for (const r of rcsMods) { const arm = Math.hypot(r.gx * CELL - cx, r.gy * CELL - cy);
    tau += SPEC.rcs.rcsN * Math.max(arm, 1.8); rcsN += SPEC.rcs.rcsN; }
  const engF = engines.filter((e) => !(e.f || 0)), engR = engines.filter((e) => (e.f || 0) === 2);
  return { m, cx, cy, I, F: engF.length * SPEC.engine.thrust, tq: engF.reduce((a, e) => a + (-(e.gy * CELL - cy)) * SPEC.engine.thrust, 0),
    engF, engR, tau, rcsN, engines, fuelCap: 260 + tanks.length * 300,
    hasShield: list.some((md) => md.t === "shield"), mount: list.find((md) => md.t === "mount"), rack: list.find((md) => md.t === "rack"), grap: list.find((md) => md.t === "grapple"), pods: list.filter((md) => md.t === "pod").length };
}

export function connectedFrom(list, ws, rootIdx) {
  const seen = new Set([rootIdx]); let ch = 1;
  while (ch) { ch = 0; for (const w of ws) { if (seen.has(w.a) && !seen.has(w.b)) { seen.add(w.b); ch = 1; } if (seen.has(w.b) && !seen.has(w.a)) { seen.add(w.a); ch = 1; } } }
  return seen;
}
```

3. Write `scripts/shipyard-test.mjs`, exactly:

```js
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
```

4. In `scripts/gate.mjs`, in the `GATES` table (currently 23 entries ending with `"conserve"`), add one line after the `"conserve"` entry:

```js
  "shipyard": ["scripts/shipyard-test.mjs"],
```

Touch nothing else in the file.

5. Run the new gate through the wrapper. The output must be a seeds line, 10 PASS lines, then exactly `shipyard-test: 10 PASS / 0 FAIL`, then `shipyard-test PASS`, exit 0. Any FAIL stops the task before step 6; report it with the run's seeds line.

```sh
node scripts/gate.mjs shipyard
```

6. Assert the prior gates did not move (same required tails as step 1).

7. Close the records in this landing: bump `package.json` version to `0.0.52`; in `docs/plans/phase-0.0.52-shipyard.md` replace the status line with `Status: LANDED, commit stamped below, 2026-09-03. Gate: 10 PASS / 0 FAIL; prior gates unmoved.`; in `docs/plans/batch-extractions-2.md` flip `- [ ] 0.0.52 shipyard` to `- [x] 0.0.52 shipyard`. README: the ship-builder box is already flipped from the space-hauler lift; no README change is earned, and none is made.

8. Commit and push the landing, then stamp the real hash in a second small commit — NEVER amend after stamping. Add the named files only:

```sh
git add src/modules/shipyard/shipyard.js scripts/shipyard-test.mjs scripts/gate.mjs package.json docs/plans/phase-0.0.52-shipyard.md docs/plans/task-0.0.52-1-shipyard.md docs/plans/batch-extractions-2.md
git commit -m "phase 0.0.52 — the shipyard

Grid builder laws lifted verbatim from the deadweight demo; 800 rolled builds twin-drive the demo's own text. 10 PASS / 0 FAIL.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push origin main
H=$(git rev-parse --short HEAD)
sed -i "s/commit stamped below/commit \`$H\`/" docs/plans/phase-0.0.52-shipyard.md
git add docs/plans/phase-0.0.52-shipyard.md && git commit -m "phase 0.0.52 record stamped — $H

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push origin main
```

## Acceptance

- Step 5: `shipyard-test: 10 PASS / 0 FAIL` then `shipyard-test PASS`, exit 0, and an `ok` line in `.superpowers/gates.log`.
- Step 6: both prior gates print their pinned tails unchanged.
- Step 7's records flipped, riding the landing commit.
- Push accepted by origin.
- File hashes after step 3: `src/modules/shipyard/shipyard.js` sha256 170d40b45030c2e78a7cdca1396f1d6ecbecac5c95c79beb65d6351efa8d968f; `scripts/shipyard-test.mjs` sha256 98691b56ea6be4bae2a4f78ed7aefb3683ffb58e980ab37818e6fdc09cad52ba.

## Report

Read-confirmation first, then one line of outcome, then bullets: the gate's seeds line, count line, and verdict line verbatim, both prior-gate tails, both commit hashes (landing and stamp), the push results. Every nonconformity its own labeled bullet. Seeds: rolled fresh at run time and printed; no seed is special.
