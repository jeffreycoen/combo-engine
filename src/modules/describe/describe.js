// MODULE: describe — the described-world boot door. One call takes one
// plain object and returns a running world: the description is checked at
// the door by the contract pattern, every default stated, every dial a
// mechanism the engine really reads. SHAPED. The checklist box this serves
// stays OPEN at this landing: spec tables and module choices are not yet
// mechanisms, and words never outrun code — the door grows those dials in
// their own rungs, and the box flips when the whole sentence is true.
import { bootWar, defaultTickInput } from "../../depot/api.js";
import { checkTable } from "../contract/contract.js";

// Every dial and its default, stated once. gravity writes the world field
// every body reads; wind rides the tick input's own switch; treesBlock is
// the movement grid's trunk rule; dev is the skirmish boot.
export const WORLD_DEFAULTS = { dev: true, gravity: 9.8, wind: true, treesBlock: false };
export const WORLD_CONTRACT = {
  fields: {
    seed: { type: "number", required: true, min: 0 },
    dev: { type: "boolean" },
    gravity: { type: "number", min: 0, max: 100 },
    wind: { type: "boolean" },
    treesBlock: { type: "boolean" },
  },
  allowExtra: false,
};

// describeProblems(desc) -> every problem in one pass, the contract's own.
export function describeProblems(desc) {
  return checkTable("world", { description: desc || {} }, WORLD_CONTRACT);
}

// bootWorld(desc) -> { war, input, desc }. Throws with the whole report on
// a bad description; a clean one boots with every default filled and every
// dial applied. The returned input is the tick template with the wind
// switch already set — the page hands it to every tick.
export function bootWorld(desc) {
  const problems = describeProblems(desc);
  if (problems.length) { const e = new Error("world description refused:\n" + problems.join("\n")); e.problems = problems; throw e; }
  const d = { ...WORLD_DEFAULTS, ...desc };
  const war = bootWar({ seed: d.seed, dev: d.dev });
  war.world.gravity = d.gravity;
  war.world.slotTreesBlock = !!d.treesBlock;
  const input = defaultTickInput();
  input.windOn = d.wind;
  return { war, input, desc: d };
}
