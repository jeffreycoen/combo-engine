# Task 0.0.72-1 — the boot door grows

One job: land the grown boot door, byte-for-byte from this plan. Write exactly what is written, run the listed gates, report. You design nothing.

Suggested model: Sonnet 5.

Required reading, in order (confirm at the top of your report):
1. This file, whole.
2. `docs/plans/phase-0.0.72-bootdoor.md`, whole.

## Steps

Run from `/home/batman/combo-engine`. A failed assert stops the task; report the step and its verbatim output, run nothing further.

1. Assert the ground:

```sh
node scripts/gate.mjs describe | tail -1   # must print: describe-test PASS
node scripts/gate.mjs wells | tail -1      # must print: wells-test PASS
node scripts/gate.mjs registry | tail -1   # must print: registry-test: 4 PASS / 1 FAIL  (the standing red, named in the phase doc)
sha256sum src/modules/describe/describe.js src/modules/registry/registry.js scripts/describe-test.mjs
# must print exactly:
# 1cef3f840d1eebbeadfbfaceb5078cce11ef19479a4f7611e4c31aa027d2b5bc  src/modules/describe/describe.js
# 2141d02acbd3ea06572a1faf7aa945e4447f470e8f210e353d0f1e4ef06e0303  src/modules/registry/registry.js
# f4eacc770a2b0c9f79ba1c2d3b08017d6765cb4d9d951bdeb1760975fa21e8fe  scripts/describe-test.mjs
```

2. Overwrite `src/modules/describe/describe.js`, exactly:

```js
// MODULE: describe — the described-world boot door. One call takes one
// plain object and returns a running world: the description is checked at
// the door by the contract pattern, every default stated, every dial a
// mechanism the engine really reads. SHAPED. The checklist box this serves
// stays OPEN at this landing: module choices reach only pure-function
// surfaces so far, and words never outrun code — the door grows those
// dials in their own rungs, and the box flips when the whole sentence is
// true.
import { bootWar, defaultTickInput } from "../../depot/api.js";
import { checkTable } from "../contract/contract.js";
import { canAttach, attach } from "../registry/registry.js";
import * as SPECS from "../specs/specs.js";

// Every dial and its default, stated once. gravity writes the world field
// every body reads; wind rides the tick input's own switch; treesBlock is
// the movement grid's trunk rule; dev is the skirmish boot. specs and
// modules carry no default value of their own — an omitted specs table
// falls to specs.js, an omitted modules list attaches nothing.
export const WORLD_DEFAULTS = { dev: true, gravity: 9.8, wind: true, treesBlock: false };
export const WORLD_CONTRACT = {
  fields: {
    seed: { type: "number", required: true, min: 0 },
    dev: { type: "boolean" },
    gravity: { type: "number", min: 0, max: 100 },
    wind: { type: "boolean" },
    treesBlock: { type: "boolean" },
    specs: { type: "object" },
    modules: { type: "array" },
  },
  allowExtra: false,
};

// The spec tables a description is allowed to override — every row-shaped
// table specs.js holds (name -> { rowKey: { field: value, ... } }). The
// flat single-row tables (TANK, BISON, MASON, ...) are not table-shaped
// and stay out of this door for now — the checklist box names that gap.
export const SPECS_TABLE_NAMES = ["TOWER_SPECS", "MAN", "ENEMY_SPECS", "INFANTRY_ARMS", "ENEMY_FIRE", "BISON_FIRE", "BARRELS"];

// inferContract(table) -> a contract built from the table's own rows: every
// field any row carries becomes a typed field, the type its own default
// value's type. A stranger field or a wrong-typed value is refused; the
// law is specs.js's own shape, stated once instead of copied by hand.
function inferContract(table) {
  const fields = {};
  for (const rowKey in table) {
    const row = table[rowKey];
    for (const f in row) if (!fields[f]) fields[f] = { type: Array.isArray(row[f]) ? "array" : typeof row[f] };
  }
  return { fields, allowExtra: false };
}
const SPECS_CONTRACTS = {};
for (const n of SPECS_TABLE_NAMES) SPECS_CONTRACTS[n] = inferContract(SPECS[n]);

// mergeRows(base, override) -> a new table, every overridden row spread
// over its base row; rows the override never names pass through untouched.
function mergeRows(base, override) {
  const out = { ...base };
  for (const rowKey in override) out[rowKey] = { ...base[rowKey], ...override[rowKey] };
  return out;
}

// specsProblems(specs) -> every problem across every named table, one pass.
// An unknown table name is its own problem; a known one is checked whole.
function specsProblems(specs) {
  const problems = [];
  if (specs == null) return problems;
  if (typeof specs !== "object" || Array.isArray(specs)) return ["specs: the table is missing"];
  for (const name in specs) {
    if (!SPECS_CONTRACTS[name]) { problems.push("specs." + name + ": not a known spec table"); continue; }
    problems.push(...checkTable("specs." + name, specs[name], SPECS_CONTRACTS[name]));
  }
  return problems;
}

// modulesProblems(names) -> a problem per unknown module name; attaching
// happens only after the door is clean.
function modulesProblems(names) {
  const problems = [];
  if (names == null) return problems;
  if (!Array.isArray(names)) return ["modules: must be a list of names"];
  for (const name of names) if (typeof name !== "string" || !canAttach(name)) problems.push("modules." + name + ": unknown module, cannot attach");
  return problems;
}

// describeProblems(desc) -> every problem in one pass: the contract's own,
// plus every spec-table problem, plus every unknown module name.
export function describeProblems(desc) {
  const d = desc || {};
  const problems = checkTable("world", { description: d }, WORLD_CONTRACT);
  problems.push(...specsProblems(d.specs));
  problems.push(...modulesProblems(d.modules));
  return problems;
}

// bootWorld(desc) -> { war, input, desc, modules }. Throws with the whole
// report on a bad description; a clean one boots with every default
// filled, every dial applied, every named spec table merged onto
// specs.js's own, and every named module attached and grouped by seam.
export function bootWorld(desc) {
  const problems = describeProblems(desc);
  if (problems.length) { const e = new Error("world description refused:\n" + problems.join("\n")); e.problems = problems; throw e; }
  const d = { ...WORLD_DEFAULTS, ...desc };
  const war = bootWar({ seed: d.seed, dev: d.dev });
  war.world.gravity = d.gravity;
  war.world.slotTreesBlock = !!d.treesBlock;
  const input = defaultTickInput();
  input.windOn = d.wind;

  d.specs = {};
  for (const name of SPECS_TABLE_NAMES) {
    const override = desc && desc.specs && desc.specs[name];
    d.specs[name] = override ? mergeRows(SPECS[name], override) : SPECS[name];
  }

  const modules = {};
  for (const name of (d.modules || [])) {
    const m = attach(name);
    (modules[m.seam] || (modules[m.seam] = [])).push(m);
  }

  return { war, input, desc: d, modules };
}
```

Then `sha256sum src/modules/describe/describe.js` — must print `743682d3c3e0c5bcb2e9d2e262f5d9acf5b0b30ba75d151e9c1a94499560804f`.

3. Overwrite `src/modules/registry/registry.js`, exactly:

```js
// MODULE: registry — the module registry and the standard sockets. One
// table naming every landed module, its seam, and its gate; three socket
// shapes said once instead of by convention. SHAPED: the law is the
// checklist's words; the table is the tree's own truth, proven by its gate
// against the filesystem and the gate table. Pure data plus lookups.
import * as wells from "../wells/wells.js";
import * as solids from "../solids/solids.js";

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

// The attach makers — one module name to a function returning its surface.
// Static imports, not a dynamic import() per call: both wells and solids
// are plain function surfaces with no seam to wire, so the whole module's
// export namespace IS the surface. A module needing setup gets its own
// maker here later; the map is the only place that changes.
const MAKERS = { wells: () => wells, solids: () => solids };

// canAttach(name) -> true when a maker exists. The describe door checks
// this before it ever calls attach, so a bad name is reported, not thrown.
export function canAttach(name) { return !!MAKERS[name]; }

// attach(name, opts) -> { name, seam, surface }. Throws when the name has
// no maker — callers that already checked canAttach never hit this.
export function attach(name, opts) {
  const mod = moduleOf(name);
  const make = MAKERS[name];
  if (!mod || !make) throw new Error("registry: no attach maker for \"" + name + "\"");
  return { name, seam: mod.seam, surface: make(opts) };
}
```

Then `sha256sum src/modules/registry/registry.js` — must print `37da09a3429d1832eede2be4e60a27d572caeafa2909b4200d75001fd73c6fe9`.

4. Overwrite `scripts/describe-test.mjs`, exactly:

```js
// COMBO-ENGINE — describe-test. Laws at rolled seeds: a bad description is
// refused whole with every problem named; a clean one boots twin worlds;
// each dial provably reaches its mechanism — gravity the world field, wind
// the tick switch, trees the grid rule; a spec override is checked and
// merged; a named module attaches and answers on its own surface.
import { bootWorld, describeProblems, WORLD_DEFAULTS } from "../src/modules/describe/describe.js";
import { worldHash } from "../src/modules/determinism/determinism.js";
import { accel } from "../src/modules/wells/wells.js";
let pass = 0, fail = 0;
const check = (n, ok) => { if (ok) { pass++; console.log("PASS " + n); } else { fail++; console.log("FAIL " + n); } };
const SEED = process.env.SEED ? +process.env.SEED : Math.floor(Math.random() * 1e9);
console.log("seeds " + JSON.stringify({ world: SEED }));

{ const p = describeProblems({ seed: "x", gravity: -1, moons: 3 });
  check("describe: a bad description names every problem in one pass — type, floor, and the stranger",
    p.length === 3 && p.some((s) => s.includes("seed")) && p.some((s) => s.includes("gravity")) && p.some((s) => s.includes("moons"))); }
{ let threw = null; try { bootWorld({ gravity: 5 }); } catch (e) { threw = e; }
  check("describe: the door refuses whole — no seed, no world", !!threw && threw.problems.length === 1); }
{ const a = bootWorld({ seed: SEED }), b = bootWorld({ seed: SEED });
  check("describe: one description, twin worlds — the hash agrees at a rolled seed",
    worldHash(a.war.world) === worldHash(b.war.world)); }
{ const w = bootWorld({ seed: SEED, gravity: 1.6, wind: false, treesBlock: true });
  check("describe: every dial reaches its mechanism — gravity on the world, wind on the tick, trees on the grid",
    w.war.world.gravity === 1.6 && w.input.windOn === false && w.war.world.slotTreesBlock === true); }
{ const w = bootWorld({ seed: SEED });
  check("describe: the defaults are the stated ones",
    w.desc.gravity === WORLD_DEFAULTS.gravity && w.desc.wind === true && w.war.world.gravity === 9.8); }

// specs: a bad value in one table and an unknown table name both land in
// the same refusal, alongside an unrelated top-level problem.
{ const p = describeProblems({ seed: "x", specs: { TOWER_SPECS: { mg: { cost: "cheap" } }, GHOST_SPECS: { a: {} } } });
  check("describe: a bad spec value refuses whole — the wrong type, the unknown table, and the unrelated problem all land in one pass",
    p.length === 3 && p.some((s) => s.includes("seed")) && p.some((s) => s.includes("specs.TOWER_SPECS.mg.cost")) && p.some((s) => s.includes("specs.GHOST_SPECS"))); }

// specs: a stranger field on a known table's row is refused too.
{ const p = describeProblems({ seed: SEED, specs: { TOWER_SPECS: { mg: { madeUpField: 1 } } } });
  check("describe: a stranger field on a known spec table's row is refused",
    p.length === 1 && p[0].includes("specs.TOWER_SPECS.mg.madeUpField")); }

// modules: an unknown module name is refused, alongside another problem.
{ const p = describeProblems({ seed: "x", modules: ["wells", "not-a-module"] });
  check("describe: an unknown module name is refused alongside the rest",
    p.length === 2 && p.some((s) => s.includes("seed")) && p.some((s) => s.includes("modules.not-a-module"))); }

// twin-boot world-hash identity holds with a spec override present — the
// override changes the returned specs table, never the war's own hash law.
{ const a = bootWorld({ seed: SEED, specs: { TOWER_SPECS: { mg: { cost: 999 } } } });
  const b = bootWorld({ seed: SEED, specs: { TOWER_SPECS: { mg: { cost: 999 } } } });
  check("describe: twin-boot world-hash identity holds with a spec override present",
    worldHash(a.war.world) === worldHash(b.war.world) && a.desc.specs.TOWER_SPECS.mg.cost === 999); }

// a spec override merges onto the row, leaving every other field and every
// other row untouched — the door only ever moves what the row names.
{ const w = bootWorld({ seed: SEED, specs: { TOWER_SPECS: { mg: { cost: 999 } } } });
  check("describe: an omitted spec field keeps its specs.js default; an omitted table keeps the whole table",
    w.desc.specs.TOWER_SPECS.mg.cost === 999 && w.desc.specs.TOWER_SPECS.mg.range === 15
    && w.desc.specs.TOWER_SPECS.gun.cost === 38 && w.desc.specs.MAN.rifle.hp === 58); }

// an attached module is reachable on its own surface and answers a direct
// call — wells' accel, checked against the module's own function.
{ const w = bootWorld({ seed: SEED, modules: ["wells", "solids"] });
  const wellsMod = w.modules.sample.find((m) => m.name === "wells");
  const [ax, ay] = wellsMod.surface.accel([{ x: 10, y: 0, mu: 5, soft: 1 }], 0, 0);
  const [bx, by] = accel([{ x: 10, y: 0, mu: 5, soft: 1 }], 0, 0);
  check("describe: an attached module is reachable and functional on its own surface, grouped by seam",
    w.modules.sample.length === 2 && ax === bx && ay === by
    && w.modules.sample.some((m) => m.name === "solids" && typeof m.surface.makePrism === "function")); }

console.log(`describe-test: ${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
console.log("describe-test PASS");
```

Then `sha256sum scripts/describe-test.mjs` — must print `0b47073d61a35376ab28f59862f0f3c370a66ccdc932e12042e60aeaf153ec08`.

5. Run the grown gate — a rolled seeds line, 11 PASS lines, `describe-test: 11 PASS / 0 FAIL`, `describe-test PASS`, exit 0. The count 5 to 11 is this plan's licensed re-teach; any FAIL stops the task.

```sh
node scripts/gate.mjs describe
```

6. Bracket unmoved:

```sh
node scripts/gate.mjs wells | tail -1      # must print: wells-test PASS
node scripts/gate.mjs registry | tail -1   # must print: registry-test: 4 PASS / 1 FAIL  (unchanged)
```

7. Close the records: `package.json` version to `0.0.72`; the phase doc's status line to LANDED as its comment shows; in `README.md` replace the whole describe line in the modules list with:

```
- [x] describe — the described-world boot door (grown 0.0.72: spec-table overrides and module choices come through the door; the box stays open until module choices reach the loop's seams) — 0.0.64
```

The checklist box "Boot from a world description object" stays `- [ ]` — the phase doc says why.

8. Commit and push, then stamp:

```sh
git add src/modules/describe/describe.js src/modules/registry/registry.js scripts/describe-test.mjs package.json README.md docs/plans/phase-0.0.72-bootdoor.md docs/plans/task-0.0.72-1-bootdoor.md
git commit -m "phase 0.0.72 — the boot door grows spec tables and module choices

Spec-table overrides checked and merged at the door; module choices attach pure-call surfaces via the registry's new attach. Gate 11 PASS / 0 FAIL at rolled seeds; wells unmoved; registry's standing red unchanged.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push origin main
H=$(git rev-parse --short HEAD)
sed -i "s/commit stamped below/commit \`$H\`/" docs/plans/phase-0.0.72-bootdoor.md
git add docs/plans/phase-0.0.72-bootdoor.md && git commit -m "phase 0.0.72 record stamped — $H

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push origin main
```

## Acceptance

- Every sha256 above exact; the gate `describe-test: 11 PASS / 0 FAIL` then `describe-test PASS` at rolled seeds; wells tail unchanged; registry's line `4 PASS / 1 FAIL` unchanged on both sides; records flipped riding the landing; pushes accepted.

## Report

Read-confirmation first, then one line of outcome, then bullets: the sha256 lines verbatim, the gate's seeds/count/verdict lines, the wells and registry tails, both commit hashes, the push results. Every nonconformity its own labeled bullet. Fixture seeds: rolled at run time, printed by the gate; no seed is special.
