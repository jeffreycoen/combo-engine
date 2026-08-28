# Task 0.0.11-1 — the orders module

One job: write the fleet order model and its gate exactly as printed below, register the gate, prove the numbers, close the records. Every file's full content is below; write exactly what is written, run the listed gates, report. You design nothing.

Suggested model: Sonnet 5.

Required reading, in order (confirm at the top of your report):
1. This file, whole.
2. `docs/plans/phase-0.0.11-orders-module.md`, whole.

Source of the law (reference only — do not edit it): `homeworld_fleet_command.jsx` lines 10–16, 979, 1091–1118, 1343–1465, 1468–1473, 1503.

## Steps

Run from `/home/batman/combo-engine`. A failed assert stops the task; report the step and its verbatim output, run nothing further.

1. Assert the ground: all prior gates green, destination absent. Each command must end with the tail shown; `absent` must print.

```sh
node scripts/gate.mjs api          # tail: seed 1  seconds 90 (10800 steps)  worldHash 3367709165  runHash 2717846799
node scripts/gate.mjs combat       # tail: ALL PASS
node scripts/gate.mjs accuracy     # tail: 11/11
node scripts/gate.mjs market       # tail: market-test PASS
node scripts/gate.mjs builder      # tail: builder-test PASS
node scripts/gate.mjs ledger       # tail: ledger-test PASS
node scripts/gate.mjs weldstress   # tail: weldstress-test PASS
node scripts/gate.mjs tape         # tail: tape-test PASS
node scripts/gate.mjs physics-pb   # tail: physics-pb-test PASS
node scripts/gate.mjs rig          # tail: rig-test PASS
node scripts/gate.mjs solids       # tail: solids-test PASS
node scripts/gate.mjs ballistics   # tail: ballistics-test PASS
ls src/modules/orders 2>/dev/null || echo absent
```

2. Write `src/modules/orders/orders.js`, exactly as printed, ending at the final `}`; the commands after the block set the file's exact ending mechanically, however the writing tool ended the file:

```js
// modules/orders — the fleet order model, a SHAPED lift from the fleet demo
// (homeworld_fleet_command.jsx). The LAW is the demo's, carried exactly and
// cited by line; the CODE is new — plain data, no renderer types, no game
// globals. The law:
//   - four order slots per unit: moveTarget, attackTarget, guardTarget,
//     harvestTarget (line 979);
//   - order verbs are exclusive — move clears attack/guard/harvest (1091),
//     attack sets its slot plus a move toward the target and clears
//     guard/harvest (1110), guard clears move/attack/harvest (1118);
//   - a group move fans into a square grid: sq = ceil(sqrt(n)), offsets
//     ((i % sq) - sq/2) * 2.5 and (floor(i / sq) - sq/2) * 2.5 (1091);
//   - resolution priority each tick: attack > guard > move > idle, a dead
//     target never holds its branch (1343-1465 branch order, 1344, 1417);
//   - arrival within distance 1 completes a move (1421, 1450);
//   - while guarding, an armed unit acquires the nearest foe within
//     range * 1.2 (1408-1411);
//   - an armed unit with no live attack target acquires the nearest foe
//     within range * (1.5 if it strafes, else 1) (1468-1473);
//   - a target beyond range drops the attack slot (1503).
// Positions are [x, y, z] arrays. Units are plain objects from makeUnit.

// The unit spec contract: every problem reported at once, none thrown.
export function checkSpec(spec) {
  const problems = [];
  if (!spec || typeof spec !== "object") return ["spec: not an object"];
  for (const [t, row] of Object.entries(spec)) {
    for (const f of ["hp", "speed", "dmg", "range", "turnRate", "accel", "strafeRadius"]) {
      if (typeof row[f] !== "number" || !Number.isFinite(row[f])) problems.push(`${t}.${f}: missing or not a number`);
    }
  }
  return problems;
}

const d3 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

// makeUnit: one plain unit from the spec row — stats copied, orders empty.
export function makeUnit(spec, type, pos) {
  const row = spec[type];
  return {
    type, pos: pos.slice(), hp: row.hp, maxHp: row.hp,
    dmg: row.dmg, range: row.range, strafeRadius: row.strafeRadius,
    moveTarget: null, attackTarget: null, guardTarget: null, harvestTarget: null,
  };
}

// orderMove: the demo's grid fan (1091). Clears every other slot.
export function orderMove(units, x, y, z) {
  const n = units.length, sq = Math.ceil(Math.sqrt(n));
  units.forEach((u, i) => {
    u.moveTarget = [x + (i % sq - sq / 2) * 2.5, y, z + (Math.floor(i / sq) - sq / 2) * 2.5];
    u.attackTarget = null; u.harvestTarget = null; u.guardTarget = null;
  });
}

// orderAttack: the demo's attack order (1110) — slot plus a move toward the
// target's position, guard and harvest cleared.
export function orderAttack(units, target) {
  units.forEach((u) => {
    u.attackTarget = target; u.moveTarget = target.pos.slice();
    u.guardTarget = null; u.harvestTarget = null;
  });
}

// orderGuard: the demo's guard order (1118) — every other slot cleared.
export function orderGuard(units, target) {
  units.forEach((u) => {
    u.guardTarget = target; u.moveTarget = null; u.attackTarget = null; u.harvestTarget = null;
  });
}

const live = (t) => t !== null && t !== undefined && t.hp > 0;

// resolveMode: the demo's branch order (1343-1465) — attack > guard > move
// > idle, dead targets falling through.
export function resolveMode(u) {
  if (live(u.attackTarget)) return "attack";
  if (live(u.guardTarget)) return "guard";
  if (u.moveTarget) return "move";
  return "idle";
}

// arriveMove: within distance 1 the move completes and its slot clears
// (1421, 1450). Returns true on arrival.
export function arriveMove(u) {
  if (!u.moveTarget) return false;
  if (d3(u.pos, u.moveTarget) > 1) return false;
  u.moveTarget = null;
  return true;
}

// nearest foe within radius, or null — the demo's acquisition scan (1471).
function nearestWithin(u, foes, radius) {
  let best = null, bd = radius;
  for (const f of foes) { const d = d3(u.pos, f.pos); if (d < bd) { bd = d; best = f; } }
  return best;
}

// acquire: an armed unit with no live attack target seeks the nearest foe —
// radius range * 1.5 when it strafes, range otherwise (1468-1473); while
// guarding, radius range * 1.2 (1408-1411). Unarmed units never acquire.
export function acquire(u, foes) {
  if (!(u.dmg > 0) || live(u.attackTarget)) return u.attackTarget || null;
  const radius = live(u.guardTarget) ? u.range * 1.2 : u.range * (u.strafeRadius > 0 ? 1.5 : 1);
  const best = nearestWithin(u, foes, radius);
  u.attackTarget = best;
  return best;
}

// dropBeyondRange: a target past range loses the slot (1503).
export function dropBeyondRange(u) {
  if (live(u.attackTarget) && d3(u.pos, u.attackTarget.pos) > u.range) u.attackTarget = null;
  return u.attackTarget;
}
```

Then set the exact ending and assert identity:

```sh
truncate -s 4821 src/modules/orders/orders.js   # end exactly at the final }, however the writing tool ended the file
printf '\n' >> src/modules/orders/orders.js     # the final line's newline
wc -c src/modules/orders/orders.js       # must print 4822
sha256sum src/modules/orders/orders.js   # must print 705b5aac4eeb5e9c671ed053c149143ae65e4c1992fccaf8df901fff032d48c0
```

3. Write `scripts/orders-test.mjs`, exactly as printed; the commands after the block set the ending the same way:

```js
// COMBO-ENGINE — orders-test: the fleet order model's gate. Thirteen checks,
// seedless arithmetic. The spec rows are the fleet demo's own ship table
// (homeworld_fleet_command.jsx lines 10-16): interceptor range 20 strafing,
// corvette range 24 strafing, frigate range 38 no strafe, collector unarmed.
import { checkSpec, makeUnit, orderMove, orderAttack, orderGuard, resolveMode, arriveMove, acquire, dropBeyondRange } from "../src/modules/orders/orders.js";

let pass = 0, fail = 0;
const check = (name, ok) => { if (ok) { pass++; console.log("PASS " + name); } else { fail++; console.log("FAIL " + name); } };
const near = (a, b) => Math.abs(a - b) < 1e-9;

const SPEC = {
  interceptor: { hp: 50, speed: .55, dmg: 4, range: 20, turnRate: 3.0, accel: 2.0, strafeRadius: 12 },
  corvette: { hp: 180, speed: .28, dmg: 14, range: 24, turnRate: 1.5, accel: 1.0, strafeRadius: 8 },
  frigate: { hp: 500, speed: .12, dmg: 30, range: 38, turnRate: .5, accel: .3, strafeRadius: 0 },
  collector: { hp: 120, speed: .22, dmg: 0, range: 0, turnRate: 1.2, accel: .8, strafeRadius: 0 },
};

check("contract: a clean spec reports zero problems", checkSpec(SPEC).length === 0);
check("contract: a broken row reports every missing field at once",
  checkSpec({ bad: { hp: 1, speed: .1 } }).length === 5 && checkSpec(null).length === 1);

{ const u = makeUnit(SPEC, "interceptor", [1, 2, 3]);
  check("makeUnit: stats copied, four order slots empty, position its own array",
    u.hp === 50 && u.range === 20 && u.strafeRadius === 12 && u.moveTarget === null
    && u.attackTarget === null && u.guardTarget === null && u.harvestTarget === null
    && u.pos !== SPEC && u.pos[2] === 3); }

{ const g = [0, 1, 2, 3].map(() => makeUnit(SPEC, "interceptor", [0, 0, 0]));
  orderMove(g, 10, 0, 20);
  check("move fan: four units land on the demo's 2x2 grid at 2.5 spacing",
    near(g[0].moveTarget[0], 7.5) && near(g[0].moveTarget[2], 17.5)
    && near(g[1].moveTarget[0], 10) && near(g[1].moveTarget[2], 17.5)
    && near(g[2].moveTarget[0], 7.5) && near(g[2].moveTarget[2], 20)
    && near(g[3].moveTarget[0], 10) && near(g[3].moveTarget[2], 20));
  const foe = makeUnit(SPEC, "corvette", [50, 0, 0]);
  orderAttack(g, foe);
  check("attack order: slot set, move toward the target, guard and harvest cleared",
    g[0].attackTarget === foe && near(g[0].moveTarget[0], 50) && g[0].guardTarget === null);
  orderMove(g, 0, 0, 0);
  check("verbs are exclusive: a move order wipes the attack slot", g[0].attackTarget === null);
  const friend = makeUnit(SPEC, "frigate", [5, 0, 0]);
  orderGuard(g, friend);
  check("guard order: slot set, move and attack cleared", g[0].guardTarget === friend && g[0].moveTarget === null); }

{ const u = makeUnit(SPEC, "corvette", [0, 0, 0]);
  const foe = makeUnit(SPEC, "interceptor", [1, 0, 0]);
  const friend = makeUnit(SPEC, "frigate", [2, 0, 0]);
  u.attackTarget = foe; u.guardTarget = friend; u.moveTarget = [9, 0, 0];
  check("priority: attack outranks guard outranks move", resolveMode(u) === "attack"
    && (foe.hp = 0, resolveMode(u) === "guard")
    && (friend.hp = 0, resolveMode(u) === "move")
    && (u.moveTarget = null, resolveMode(u) === "idle")); }

{ const u = makeUnit(SPEC, "frigate", [0, 0, 0]);
  u.moveTarget = [0.6, 0.8, 0];
  const far = makeUnit(SPEC, "frigate", [0, 0, 0]); far.moveTarget = [3, 4, 0];
  check("arrival: distance 1 completes the move, distance 5 does not",
    arriveMove(u) === true && u.moveTarget === null && arriveMove(far) === false && far.moveTarget !== null); }

{ const i = makeUnit(SPEC, "interceptor", [0, 0, 0]);
  const f = makeUnit(SPEC, "frigate", [0, 0, 0]);
  const foes = [makeUnit(SPEC, "corvette", [29, 0, 0]), makeUnit(SPEC, "corvette", [45, 0, 0])];
  check("acquisition: a strafer seeks at range x1.5 (30), so 29 is taken and the seek picks the nearest",
    acquire(i, foes) === foes[0]);
  check("acquisition: the frigate does not strafe, so it seeks at bare range (38) — 39 is out, 37 is taken",
    (() => { const far = [makeUnit(SPEC, "corvette", [39, 0, 0])];
      const nearFoe = [makeUnit(SPEC, "corvette", [37, 0, 0])];
      return acquire(f, far) === null && acquire(f, nearFoe) === nearFoe[0]; })()); }

{ const f = makeUnit(SPEC, "frigate", [0, 0, 0]);
  const ward = makeUnit(SPEC, "corvette", [1, 0, 0]);
  f.guardTarget = ward;
  const foes = [makeUnit(SPEC, "interceptor", [45, 0, 0])];
  check("guard acquisition: range x1.2 (45.6) reaches a foe at 45; unarmed never acquires",
    acquire(f, foes) === foes[0] && acquire(makeUnit(SPEC, "collector", [0, 0, 0]), foes) === null); }

{ const f = makeUnit(SPEC, "frigate", [0, 0, 0]);
  const near_ = makeUnit(SPEC, "corvette", [38, 0, 0]);
  f.attackTarget = near_;
  const kept = dropBeyondRange(f);
  near_.pos = [38.5, 0, 0];
  check("range law: a target at 38 holds a 38-range frigate, at 38.5 the slot drops",
    kept === near_ && dropBeyondRange(f) === null && f.attackTarget === null); }

console.log(`orders-test: ${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
console.log("orders-test PASS");
```

Then set the exact ending and assert identity:

```sh
truncate -s 5074 scripts/orders-test.mjs   # end exactly at the final character of the last line
printf '\n' >> scripts/orders-test.mjs     # the final line's newline
wc -c scripts/orders-test.mjs       # must print 5075
sha256sum scripts/orders-test.mjs   # must print a6ac12800fc8b680f64e500da0a15890767320f3557da4dca01002ecf839b12e
```

4. In `scripts/gate.mjs`, in the `GATES` table (currently 12 entries ending with `"ballistics"`), add one line after the `"ballistics"` entry:

```js
  "orders": ["scripts/orders-test.mjs"],
```

Touch nothing else in the file.

5. Run the new gate through the wrapper. The output must be 13 PASS lines, then exactly `orders-test: 13 PASS / 0 FAIL`, then `orders-test PASS`, exit 0. Any FAIL stops the task before step 6.

```sh
node scripts/gate.mjs orders
```

6. Assert the prior gates did not move (same commands and required tails as step 1).

7. Close the records in this landing: bump `package.json` version to `0.0.11`; in `docs/plans/phase-0.0.11-orders-module.md` replace the status line with `Status: LANDED, commit stamped below, 2026-08-28. Gate: 13 PASS / 0 FAIL; prior gates unmoved.`; in `README.md` flip the earned checklist box `- [ ] The fleet order model: select, move, attack, guard — orders as data on units` to `- [x]`.

8. Commit and push the landing, then stamp the real hash in a second small commit — NEVER amend after stamping (an amend rewrites the commit and makes every stamped hash stale; phase 0.0.6 proved it):

```sh
git add src/modules/orders scripts/orders-test.mjs scripts/gate.mjs README.md package.json docs/plans
git commit -m "phase 0.0.11 — the fleet order model lands, shaped

Orders as data on units: exclusive verbs, the grid fan, attack > guard > move > idle.
orders-test: 13 PASS / 0 FAIL; twelve prior gates unmoved.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push origin main
H=$(git rev-parse --short HEAD)
sed -i "s/commit stamped below/commit \`$H\`/" docs/plans/phase-0.0.11-orders-module.md
git add docs/plans && git commit -m "phase 0.0.11 record stamped — $H

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push origin main
```

## Acceptance

- Step 2 and step 3 wc -c and sha256 lines match exactly.
- Step 5: `orders-test: 13 PASS / 0 FAIL` then `orders-test PASS`, exit 0, and an `ok` line in `.superpowers/gates.log`.
- Step 6: every prior gate prints its pinned tail unchanged.
- Step 7's three records flipped, riding the landing commit.
- Push accepted by origin.

## Report

Read-confirmation first, then one line of outcome, then bullets: the gate's count line and verdict line verbatim, both wc -c lines, both sha256 lines, every prior-gate tail, both commit hashes (landing and stamp), the push results. Every nonconformity its own labeled bullet. Fixture seeds: none — seedless arithmetic; no seed is special.
