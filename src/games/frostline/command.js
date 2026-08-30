// games/frostline/command.js — FL-1: the command grammar over the engine's
// own squads. An order is two field writes the sim already obeys
// (sim.js:611 routes it, squads.js:621 walks it, squads.js:657 flips it to
// defend on arrival — the completion signal). Selection is the depot
// game's own tap radius and cycle order.
import { TAP_SQUAD_M, nextPick } from "../../depot/state.js";

// orderMove(sq, x, z): the engine's own move order — route cleared so the
// next tick replans (sim.js:38).
export function orderMove(sq, x, z) {
  sq.order = "move";
  sq.dest = { x, z };
  sq._route = null;
  sq._routeDest = null;
}

// orderDone(sq): the arrival flip, read back (squads.js:657-666).
export function orderDone(sq) {
  return sq.order === "defend" && !sq.dest;
}

// pickSquad(squads, x, z) -> the squad whose anchor is nearest the tap,
// inside the depot game's own 2.4 m tap radius, or null.
export function pickSquad(squads, x, z) {
  let best = null, bd = TAP_SQUAD_M;
  for (const sq of squads) {
    if (!sq.anchor) continue;
    const d = Math.hypot(sq.anchor.x - x, sq.anchor.z - z);
    if (d < bd) { bd = d; best = sq; }
  }
  return best;
}

// cycleSquad(squads, cur) -> the next squad after cur (by the depot's own
// nextPick order), for a key or swipe cycle.
export function cycleSquad(squads, cur) {
  if (!squads.length) return null;
  const cands = squads.map((sq) => ({ key: String(sq.id), sq }));
  const picked = nextPick(cands, cur ? String(cur.id) : null);
  return picked ? picked.sq : squads[0];
}

// routePts(sq) -> the overlay's path row for setOrderPaths
// (renderer.js:1842): anchor, the planned waypoints, the destination.
export function routePts(sq) {
  const pts = [];
  if (sq.anchor) pts.push({ x: sq.anchor.x, z: sq.anchor.z });
  if (sq._route) for (const w of sq._route) pts.push({ x: w.x, z: w.z });
  if (sq.dest) pts.push({ x: sq.dest.x, z: sq.dest.z });
  return { pts };
}

// orderPaths(squads) -> every squad with a live move order, drawn.
export function orderPaths(squads) {
  const rows = [];
  for (const sq of squads) if (sq.order === "move" && sq.dest) rows.push(routePts(sq));
  return rows;
}
