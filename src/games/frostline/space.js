// games/frostline/space.js — FL-8, the space theater's minimal skirmish.
// Ships are the operators: the landed orders module owns the slots and the
// landed steering module moves the hulls; this file adds only the wing, the
// guns, the sides' holds, and the end of the fight. Deterministic end to
// end: one local draw stream seeded by the battle, no clocks, no globals.
// The turn machine is the ground game's own (turns.js) — ships carry an
// anchor view so the same spend/clamp arithmetic rules both theaters.
import { makeUnit, orderMove, orderAttack, resolveMode, arriveMove, acquire, dropBeyondRange } from "../../modules/orders/orders.js";
import { attachMotion, stepMove, stepStrafe, stepIdle } from "../../modules/steering/steering.js";
import { stream } from "./contracts.js";

export const SPACE_STEP = 1 / 60;

// One hull both sides fly for now; the roster contract brings more later.
// All dials provisional (F5).
export const SHIP_SPECS = {
  fighter: {
    hp: 40, speed: 0.5, dmg: 7, range: 28, turnRate: 2.2, accel: 2.2,
    strafeRadius: 12, strafeRate: 0.7, guardRate: 0.5, idleRate: 1,
    fireRate: 0.9, bounty: 12,
  },
};
export const WING = 3;          // ships a side // provisional (F5)
export const SIGHT_R = 55;      // first contact freezes free time // provisional (F5)
export const HIT_NEAR = 0.85, HIT_FAR = 0.25; // hit chance at zero and full range // provisional (F5)

// makeSpaceBattle(seed) -> the fight: two wings placed by the seed's own
// stream, facing each other across the black.
export function makeSpaceBattle(seed) {
  const r = stream(seed >>> 0);
  const ships = [];
  let nextId = 1;
  const spawn = (team, x0, face) => {
    for (let i = 0; i < WING; i++) {
      const u = makeUnit(SHIP_SPECS, "fighter", [x0 + (r() - 0.5) * 10, 0, (i - (WING - 1) / 2) * 18 + (r() - 0.5) * 8]);
      attachMotion(u, SHIP_SPECS.fighter, [face, 0, 0], r() * Math.PI * 2, r() < 0.5 ? 1 : -1, r() * Math.PI * 2);
      u.id = nextId++;
      u.team = team;
      u.fireCd = 0;
      u.bounty = SHIP_SPECS.fighter.bounty;
      // the anchor view: turns.js clamps and prices off {x, z}
      Object.defineProperty(u, "anchor", { get() { return { x: this.pos[0], z: this.pos[2] }; } });
      ships.push(u);
    }
  };
  spawn(1, -70, 1);
  spawn(2, 70, -1);
  return { ships, rng: r, tick: 0, over: false, won: false, events: [] };
}

export const liveShips = (b, team) => b.ships.filter((s) => s.hp > 0 && s.team === team);

// contactMade(b): any pair across the line inside sight — the free-time
// freeze, the same law the ground game's patrol triggers.
export function contactMade(b) {
  for (const a of liveShips(b, 1)) for (const e of liveShips(b, 2))
    if (Math.hypot(a.pos[0] - e.pos[0], a.pos[2] - e.pos[2]) <= SIGHT_R) return true;
  return false;
}

// enemyOrders(b): the droid wing's whole mind — every ship attacks the
// nearest living player hull. Runs only on the enemy's half.
export function enemyOrders(b) {
  const foes = liveShips(b, 1);
  for (const e of liveShips(b, 2)) {
    if (!foes.length) return;
    let best = foes[0], bd = Infinity;
    for (const f of foes) { const d = Math.hypot(f.pos[0] - e.pos[0], f.pos[2] - e.pos[2]); if (d < bd) { bd = d; best = f; } }
    orderAttack([e], best);
  }
}

// stepShip: the modules' own branch order, with the attack branch closing
// to range then strafing — the fleet demo's fight, minimal.
function stepShip(b, u, foes, dt) {
  acquire(u, foes);
  dropBeyondRange(u);
  const mode = resolveMode(u);
  if (mode === "attack") {
    const t = u.attackTarget;
    const d = Math.hypot(t.pos[0] - u.pos[0], t.pos[2] - u.pos[2]);
    if (d > u.range * 0.9) { u.moveTarget = t.pos.slice(); stepMove(u, dt); }
    else stepStrafe(u, t.pos, dt);
    u.fireCd -= dt;
    if (d <= u.range && u.fireCd <= 0) {
      u.fireCd = SHIP_SPECS.fighter.fireRate;
      const p = HIT_NEAR + (HIT_FAR - HIT_NEAR) * (d / u.range);
      if (b.rng() < p) {
        t.hp -= u.dmg;
        if (t.hp <= 0) b.events.push({ type: "shipkill", team: t.team, bounty: t.bounty, x: t.pos[0], z: t.pos[2] });
      }
    }
  } else if (mode === "move") { stepMove(u, dt); arriveMove(u); }
  else stepIdle(u, dt);
}

// stepSpace(b, held): one tick. A held side is frozen whole — no motion,
// no guns — the space half of the ground game's own dummy switch. The
// rng draw order is the ships' own fixed order, so twin runs stay twins.
export function stepSpace(b, held = { player: false, enemy: false }) {
  const foesOf = { 1: liveShips(b, 2), 2: liveShips(b, 1) };
  for (const u of b.ships) {
    if (u.hp <= 0) continue;
    if (u.team === 1 && held.player) continue;
    if (u.team === 2 && held.enemy) continue;
    stepShip(b, u, foesOf[u.team], SPACE_STEP);
  }
  b.tick++;
  if (!liveShips(b, 2).length) { b.over = true; b.won = true; }
  else if (!liveShips(b, 1).length) { b.over = true; b.won = false; }
}

// drainSpaceEvents(b) -> this stretch's kills, the queue cleared — the page
// pays bounties from these exactly as the ground game pays from its ticks.
export function drainSpaceEvents(b) {
  const out = b.events;
  b.events = [];
  return out;
}

// wingState(b) -> the score card's numbers.
export function wingState(b) {
  return { friendly: liveShips(b, 1).length, enemy: liveShips(b, 2).length, over: b.over, won: b.won };
}
