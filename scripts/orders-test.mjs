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
