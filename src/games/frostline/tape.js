// games/frostline/tape.js — FL-6, the tape. Every order is recorded at its
// tick; a contract replays bit-exact from seed plus tape. The load-bearing
// idea: ONE battle step, driven here, that the page and the headless replay
// both call — a replay cannot diverge from play because they are the same
// code. Orders name squads by INDEX and targets by POSITION (body ids
// shift across boots; ground does not). No rng here; the sim's own stream
// is the only chance in the war.
import { tickWar, defaultTickInput } from "../../depot/api.js";
import { bootMission, missionState } from "./mission.js";
import { orderMove, orderDone } from "./command.js";
import { makeTriggerState, checkTriggers } from "./pause.js";
import { makeTurns, startTurns, spend, clampMove, beginExec, stepExec, stepEnemy, heldInput } from "./turns.js";
import { setOverwatch, clearOverwatch, applyFireControl, toggleDiscipline, markTarget, focusOrder } from "./verbs.js";
import { knownThreats } from "./cover.js";

export const STEP = 1 / 120;

// makeCtx: the battle's whole running state in one bag — the war, the
// mission, the turn machine, the pause triggers, the tick count.
export function makeCtx(war, mission) {
  return { war, mission, trig: makeTriggerState(), ts: makeTurns(), input: defaultTickInput(), tick: 0, over: false, won: false, contactTick: null };
}

// stepBattle(ctx): ONE sim tick under the page's own laws — fire control
// written, the enemy held on the player's half, contact freezing free time,
// the halves flipping, the mission judged. Returns the tick's events and
// flags for the page's purse and overlays.
export function stepBattle(ctx) {
  const { war, mission, ts } = ctx;
  const squads = war.run.squads;
  for (const sq of squads) {
    if (sq.focusId != null) { const f = war.world.byId.get(sq.focusId); if (!f || !f.alive) sq.focusId = null; }
  }
  applyFireControl(ts, squads);
  heldInput(ctx.input, ts.phase === "exec");
  const out = tickWar(war, STEP, ctx.input);
  ctx.tick++;
  if (ts.phase === "free") {
    const t = checkTriggers(war, ctx.trig, out.events);
    if (t.contact !== null) { startTurns(ts, squads); ctx.contactTick = ctx.tick; }
  } else if (ts.phase === "exec") {
    const allDone = squads.every((sq) => orderDone(sq) || !sq.memberIds.some((id) => { const b = war.world.byId.get(id); return b && b.alive; }));
    stepExec(ts, STEP, allDone);
  } else if (ts.phase === "enemy") {
    stepEnemy(ts, STEP, squads);
  }
  const s = missionState(war, mission);
  if (s.won || s.lost) { ctx.over = true; ctx.won = s.won; }
  return out;
}

// nearestThreat(war, x, z): the tape's target resolution — the closest
// known enemy to a recorded position, inside the same 6 m the page's own
// tap uses. Deterministic scan order.
export function nearestThreat(war, x, z, within = 6) {
  let best = null, bd = within;
  for (const t of knownThreats(war)) {
    const d = Math.hypot(t.pos.x - x, t.pos.z - z);
    if (d < bd) { bd = d; best = t; }
  }
  return best;
}

// applyOp(ctx, op): one recorded order onto the running battle — the exact
// writes the page's confirm button makes, and nothing else. Free actions
// (mark, disc) spend nothing; priced actions spend only outside free time,
// exactly as the page prices them.
export function applyOp(ctx, op) {
  const { war, ts } = ctx;
  const sq = war.run.squads[op.i];
  if (op.op === "end") { if (ts.phase === "orders") beginExec(ts); return true; }
  if (!sq) return false;
  const free = ts.phase === "free";
  const priced = op.op !== "mark" && op.op !== "disc";
  // targets resolve BEFORE the point spends — a refused order costs nothing
  let target = null;
  if (op.op === "attack" || op.op === "mark") { target = nearestThreat(war, op.x, op.z); if (!target) return false; }
  if (!free && priced && !spend(ts, sq)) return false;
  if (op.op === "move") { sq.focusId = null; clearOverwatch(sq); const d = free ? { x: op.x, z: op.z } : clampMove(sq, op.x, op.z); orderMove(sq, d.x, d.z); }
  else if (op.op === "attack") { clearOverwatch(sq); focusOrder(sq, target); }
  else if (op.op === "hold") { sq.focusId = null; clearOverwatch(sq); sq.order = "defend"; sq.dest = null; }
  else if (op.op === "ow") { sq.focusId = null; setOverwatch(sq, op.x, op.z, op.pts || 1); }
  else if (op.op === "mark") markTarget(war, target);
  else if (op.op === "disc") toggleDiscipline(sq);
  else return false;
  return true;
}

// record(tape, ctx, op): the order onto the tape at its tick. The page
// calls this at every CONFIRM; ops in one frozen moment share a tick and
// keep their order.
export function record(tape, ctx, op) {
  tape.push({ t: ctx.tick, ...op });
}

// replay(def, seed, roster, tape, capTicks) -> the finished ctx. Boots the
// same battle and drives the same step; each op lands before the tick it
// was recorded at. Deterministic end to end: same seed, same tape, same
// world, every time.
export function replay(def, seed, roster, tape, capTicks = 200000, men = null) {
  const { war, mission } = bootMission(def, seed, roster, men);
  const ctx = makeCtx(war, mission);
  let p = 0;
  while (!ctx.over && ctx.tick < capTicks) {
    while (p < tape.length && tape[p].t === ctx.tick) { applyOp(ctx, tape[p]); p++; }
    if (p >= tape.length && ctx.ts.phase === "orders") beginExec(ctx.ts); // a spent tape never strands the war frozen
    stepBattle(ctx);
  }
  return ctx;
}
