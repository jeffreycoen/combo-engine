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
