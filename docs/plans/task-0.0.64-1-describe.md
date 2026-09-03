# Task 0.0.64-1 — the described-world boot door

One job: land the described-world boot door and its gate, byte-for-byte from this plan. Write exactly what is written, run the listed gates, report. You design nothing.

Suggested model: Sonnet 5.

Required reading, in order (confirm at the top of your report):
1. This file, whole.
2. `docs/plans/phase-0.0.64-describe.md`, whole.

## Steps

Run from `/home/batman/combo-engine`. A failed assert stops the task; report the step and its verbatim output, run nothing further.

1. Assert the ground:

```sh
node scripts/gate.mjs frostline > /tmp/fl.out 2>&1; tail -1 /tmp/fl.out   # must print: frostline-test PASS
ls src/modules/describe/describe.js 2>/dev/null || echo absent   # must print: absent
```

2. Write `src/modules/describe/describe.js`, exactly:

```js
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
```

Then `sha256sum src/modules/describe/describe.js` — must print `1cef3f840d1eebbeadfbfaceb5078cce11ef19479a4f7611e4c31aa027d2b5bc`.

3. Write `scripts/describe-test.mjs`, exactly:

```js
// COMBO-ENGINE — describe-test. Laws at rolled seeds: a bad description is
// refused whole with every problem named; a clean one boots twin worlds;
// each dial provably reaches its mechanism — gravity the world field, wind
// the tick switch, trees the grid rule.
import { bootWorld, describeProblems, WORLD_DEFAULTS } from "../src/modules/describe/describe.js";
import { worldHash } from "../src/modules/determinism/determinism.js";
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
console.log(`describe-test: ${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
console.log("describe-test PASS");
```

Then `sha256sum scripts/describe-test.mjs` — must print `f4eacc770a2b0c9f79ba1c2d3b08017d6765cb4d9d951bdeb1760975fa21e8fe`.

4. In `scripts/gate.mjs`, in the GATES table, add one line after the `"receipts"` entry (or after the line the previous api-batch rung added, keeping this batch's entries together):

```js
  "describe": ["scripts/describe-test.mjs"],
```

5. Run the new gate — seeds line, 5 PASS lines, `describe-test: 5 PASS / 0 FAIL`, `describe-test PASS`, exit 0:

```sh
node scripts/gate.mjs describe
```

6. Prior gates unmoved: rerun the step-1 frostline command; same tail.

7. Close the records: `package.json` version to `0.0.64`; the phase doc's status line to LANDED as its comment shows; in `docs/plans/batch-api-1.md` flip this rung's box; in `README.md` add (the checklist box stays open, per the phase document) the line `- [x] describe — the described-world boot door (its checklist box stays open: spec tables and module choices are not yet mechanisms) — 0.0.64` at the bottom of the "Serving checklist items" list.

8. Commit and push, then stamp:

```sh
git add src/modules/describe/describe.js scripts/describe-test.mjs scripts/gate.mjs package.json README.md docs/plans/phase-0.0.64-describe.md docs/plans/task-0.0.64-1-describe.md docs/plans/batch-api-1.md
git commit -m "phase 0.0.64 — the described-world boot door

Gate 5 PASS / 0 FAIL at rolled seeds; frostline unmoved.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push origin main
H=$(git rev-parse --short HEAD)
sed -i "s/commit stamped below/commit \`$H\`/" docs/plans/phase-0.0.64-describe.md
git add docs/plans/phase-0.0.64-describe.md && git commit -m "phase 0.0.64 record stamped — $H

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push origin main
```

## Acceptance

- Every sha256 above exact; the gate `5 PASS / 0 FAIL` then `describe-test PASS`; frostline's tail unchanged; records flipped riding the landing; pushes accepted.

## Report

Read-confirmation first, then one line of outcome, then bullets: the sha256 lines verbatim, the new gate's seeds/count/verdict lines, the frostline tail, both commit hashes, the push results. Every nonconformity its own labeled bullet.
