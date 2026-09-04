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
