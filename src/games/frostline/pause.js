// games/frostline/pause.js — FL-1: the frozen moment's triggers. Pause is
// the absence of a tick; this module only decides WHEN. Pure over the
// tick's own returns and the sight map — gate-testable without a page.
import { seenAt } from "../../depot/sight.js";

// makeTriggerState() — what the trigger scan remembers between ticks:
// which enemy ids have already been seen (contact fires once per body),
// and which squads held a move order last tick (completion fires on the
// flip, squads.js:657).
export function makeTriggerState() {
  return { seen: new Set(), moving: new Set() };
}

// checkTriggers(war, ts, events) -> { contact, manDown, ordersDone } — ids
// and squads, or null each. Sight queries convert through map.invW: the
// sight grid is canonical, world coords silently miss (sight.js:53, the
// dossier's number-one landmine).
export function checkTriggers(war, ts, events) {
  const out = { contact: null, manDown: null, ordersDone: null };
  const sight = war.T.sight;
  if (sight) {
    for (const b of war.world.bodies) {
      if (b.kind !== "unit" || !b.alive || b.team !== 2 || ts.seen.has(b.id)) continue;
      const c = war.map.invW(b.pos.x, b.pos.z);
      if (seenAt(sight, c.u, c.v, 1)) { ts.seen.add(b.id); if (!out.contact) out.contact = b.id; }
    }
  }
  if (events) {
    for (const ev of events) {
      if (ev.type !== "kill") continue;
      const body = war.world.byId.get(ev.id);
      if (body && body.kind === "unit" && body.team === 1) { out.manDown = ev.id; break; }
    }
  }
  for (const sq of war.run.squads) {
    const moving = sq.order === "move" && !!sq.dest;
    if (ts.moving.has(sq.id) && !moving) { out.ordersDone = sq.id; ts.moving.delete(sq.id); }
    else if (moving) ts.moving.add(sq.id);
  }
  return out;
}

// firedAny(t) — one boolean for the page's pause latch.
export function firedAny(t) {
  return t.contact !== null || t.manDown !== null || t.ordersDone !== null;
}
