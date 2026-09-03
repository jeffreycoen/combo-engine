# Task 0.0.65-1 — the module registry and the sockets

One job: land the module registry and the sockets and its gate, byte-for-byte from this plan. Write exactly what is written, run the listed gates, report. You design nothing.

Suggested model: Sonnet 5.

Required reading, in order (confirm at the top of your report):
1. This file, whole.
2. `docs/plans/phase-0.0.65-registry.md`, whole.

## Steps

Run from `/home/batman/combo-engine`. A failed assert stops the task; report the step and its verbatim output, run nothing further.

1. Assert the ground:

```sh
node scripts/gate.mjs frostline > /tmp/fl.out 2>&1; tail -1 /tmp/fl.out   # must print: frostline-test PASS
ls src/modules/registry/registry.js 2>/dev/null || echo absent   # must print: absent
```

2. Write `src/modules/registry/registry.js`, exactly:

```js
// MODULE: registry — the module registry and the standard sockets. One
// table naming every landed module, its seam, and its gate; three socket
// shapes said once instead of by convention. SHAPED: the law is the
// checklist's words; the table is the tree's own truth, proven by its gate
// against the filesystem and the gate table. Pure data plus lookups.

// The seams, per the module pattern: tick (steps state), consume (pure
// calls on demand), draw (renders), sample (answers queries).
export const REGISTRY = {
  market: { seam: "consume", gate: "market" },
  builder: { seam: "consume", gate: "builder" },
  ledger: { seam: "consume", gate: "ledger" },
  weldstress: { seam: "tick", gate: "weldstress" },
  tape: { seam: "consume", gate: "tape" },
  "physics-pb": { seam: "tick", gate: "physics-pb", file: "physics.js" },
  rig: { seam: "consume", gate: "rig" },
  solids: { seam: "sample", gate: "solids" },
  ballistics: { seam: "tick", gate: "ballistics" },
  orders: { seam: "consume", gate: "orders" },
  steering: { seam: "tick", gate: "steering" },
  voxel: { seam: "tick", gate: "voxel" },
  support: { seam: "tick", gate: "support" },
  grapple: { seam: "tick", gate: "grapple" },
  escrow: { seam: "consume", gate: "escrow" },
  wells: { seam: "sample", gate: "wells" },
  determinism: { seam: "consume", gate: "determinism" },
  contract: { seam: "consume", gate: "contract" },
  receipts: { seam: "consume", gate: "receipts" },
  pagekit: { seam: "draw", gate: "pagekit" },
  registry: { seam: "consume", gate: "registry" },
  describe: { seam: "consume", gate: "describe" },
  // carved depot organs, behind their front doors
  sight: { seam: "sample", gate: null },
  wind: { seam: "sample", gate: null },
  lists: { seam: "consume", gate: null },
  orient: { seam: "sample", gate: null },
  route: { seam: "sample", gate: null },
  territory: { seam: "tick", gate: null },
  intel: { seam: "consume", gate: null },
  fog: { seam: "tick", gate: null },
  mines: { seam: "tick", gate: null },
  economy: { seam: "consume", gate: null },
  cards: { seam: "consume", gate: null },
  transports: { seam: "tick", gate: null },
  specs: { seam: "consume", gate: null },
  ai: { seam: "consume", gate: null },
  save: { seam: "consume", gate: null },
  accuracy: { seam: "sample", gate: null },
  mapgen: { seam: "consume", gate: null },
};
export const SEAMS = ["tick", "consume", "draw", "sample"];

// The three standard sockets, stated once. Shapes only — the law each
// socket obeys is its owner's gate.
export const SOCKETS = {
  tickInput: "one command object per tick; defaultTickInput() in the depot api is the template",
  rendererFlags: "the tick's returned flags object; a renderer reads, never writes",
  soundEvents: "the tick's returned events list; consumed once per tick, receipts.receiptLog reads the same list",
};

export function moduleOf(name) { return REGISTRY[name] || null; }
export function modulesBySeam(seam) { return Object.keys(REGISTRY).filter((k) => REGISTRY[k].seam === seam); }
```

Then `sha256sum src/modules/registry/registry.js` — must print `2141d02acbd3ea06572a1faf7aa945e4447f470e8f210e353d0f1e4ef06e0303`.

3. Write `scripts/registry-test.mjs`, exactly:

```js
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
```

Then `sha256sum scripts/registry-test.mjs` — must print `b3061d485b427cc048d1a08195c8c5d7ca68bfb53ee4511a6d094dd98e3db0a9`.

4. In `scripts/gate.mjs`, in the GATES table, add one line after the `"receipts"` entry (or after the line the previous api-batch rung added, keeping this batch's entries together):

```js
  "registry": ["scripts/registry-test.mjs"],
```

5. Run the new gate — seeds line, 5 PASS lines, `registry-test: 5 PASS / 0 FAIL`, `registry-test PASS`, exit 0:

```sh
node scripts/gate.mjs registry
```

6. Prior gates unmoved: rerun the step-1 frostline command; same tail.

7. Close the records: `package.json` version to `0.0.65`; the phase doc's status line to LANDED as its comment shows; in `docs/plans/batch-api-1.md` flip this rung's box; in `README.md` flip the checklist box starting `- [ ] Module registry and the standard sockets` to `- [x]`, and add the line `- [x] registry — the module registry and the standard sockets — 0.0.65` at the bottom of the "Serving checklist items" list.

8. Commit and push, then stamp:

```sh
git add src/modules/registry/registry.js scripts/registry-test.mjs scripts/gate.mjs package.json README.md docs/plans/phase-0.0.65-registry.md docs/plans/task-0.0.65-1-registry.md docs/plans/batch-api-1.md
git commit -m "phase 0.0.65 — the module registry and the sockets

Gate 5 PASS / 0 FAIL at rolled seeds; frostline unmoved.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push origin main
H=$(git rev-parse --short HEAD)
sed -i "s/commit stamped below/commit \`$H\`/" docs/plans/phase-0.0.65-registry.md
git add docs/plans/phase-0.0.65-registry.md && git commit -m "phase 0.0.65 record stamped — $H

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push origin main
```

## Acceptance

- Every sha256 above exact; the gate `5 PASS / 0 FAIL` then `registry-test PASS`; frostline's tail unchanged; records flipped riding the landing; pushes accepted.

## Report

Read-confirmation first, then one line of outcome, then bullets: the sha256 lines verbatim, the new gate's seeds/count/verdict lines, the frostline tail, both commit hashes, the push results. Every nonconformity its own labeled bullet.
