// games/frostline/turns.js — the turn machine, modeled on Zero Company's
// shape over this engine's grain (owner's rulings, 2026-08-30): free
// movement until first contact; from contact, alternating sides — the
// player's squads execute with the enemy held by the engine's own dummy
// switch, then the enemy side runs while the player holds. Squads are the
// operators: three points each per turn, one point per confirmed order,
// moves capped in distance. Pure state over plain data; the page drives
// the ticks.
export const TURNS = {
  ap: 1,          // one point, one order, per squad per turn (owner's ruling)
  moveCap: 22,    // meters one move order may reach // provisional (F5)
  jetCap: 35,     // the hunter's jetpack line — his move flies farther // provisional (F5)
  execCapS: 8,    // seconds the player half may run before it yields // provisional (F5)
  enemyS: 6,      // seconds the enemy half runs // provisional (F5)
};

// Phases: "free" (real time, no points) -> "orders" (frozen, spend points)
// -> "exec" (player orders play out, enemy held) -> "enemy" (enemy runs,
// player holds) -> "orders" ...
export function makeTurns() {
  return { phase: "free", turn: 0, ap: {}, execT: 0, enemyT: 0 };
}

// startTurns(ts, squads): first contact — the war becomes turns.
export function startTurns(ts, squads) {
  ts.phase = "orders";
  ts.turn = 1;
  refill(ts, squads);
}

export function refill(ts, squads) {
  ts.ap = {};
  for (const sq of squads) ts.ap[sq.id] = TURNS.ap;
}

export function apOf(ts, sq) { return ts.ap[sq.id] || 0; }

// spend(ts, sq): one point for one confirmed order; false when the pool is dry.
export function spend(ts, sq) {
  if ((ts.ap[sq.id] || 0) <= 0) return false;
  ts.ap[sq.id]--;
  return true;
}

// capOf(sq): the hunter flies his jetpack line; everyone else marches.
export function capOf(sq) { return sq.type === "hunter" ? TURNS.jetCap : TURNS.moveCap; }

// clampMove(sq, x, z): the move cap — a destination past the cap lands ON
// the cap along the same line. Returns the priced destination.
export function clampMove(sq, x, z) {
  const cap = capOf(sq);
  const ax = sq.anchor.x, az = sq.anchor.z;
  const d = Math.hypot(x - ax, z - az);
  if (d <= cap) return { x, z };
  const s = cap / d;
  return { x: ax + (x - ax) * s, z: az + (z - az) * s };
}

// beginExec(ts): the orders are in — the player half runs.
export function beginExec(ts) { ts.phase = "exec"; ts.execT = 0; }

// stepExec(ts, dt, allDone): the player half ends when every ordered squad
// has finished or the cap elapses; then the enemy half begins.
export function stepExec(ts, dt, allDone) {
  ts.execT += dt;
  if (allDone || ts.execT >= TURNS.execCapS) { ts.phase = "enemy"; ts.enemyT = 0; return true; }
  return false;
}

// stepEnemy(ts, dt, squads): the enemy half is a fixed window; when it
// closes, a new orders phase opens with every pool refilled.
export function stepEnemy(ts, dt, squads) {
  ts.enemyT += dt;
  if (ts.enemyT >= TURNS.enemyS) {
    ts.phase = "orders";
    ts.turn++;
    refill(ts, squads);
    return true;
  }
  return false;
}

// heldInput(input, held): the engine's own switch — the enemy side freezes
// when devDummies is true. The page flips it by phase: exec holds the
// enemy, enemy phase releases it.
export function heldInput(input, held) { input.devDummies = !!held; return input; }
