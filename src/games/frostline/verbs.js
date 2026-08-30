// games/frostline/verbs.js — FL-2, the fight's verbs: overwatch cones with
// point investment, focus fire on a marked target, discipline per squad.
// Pure state over plain squad fields; the engine's squadFire reads three
// per-squad fields (holdFire, fireArc, focusId) that stay unset everywhere
// outside FROSTLINE. The page and the gate drive these helpers; nothing
// here draws from the rng.
export const OVERWATCH = {
  half1: Math.PI / 4,  // 1 point invested: a 90 degree cone // provisional (F5)
  half2: Math.PI / 2,  // 2 points invested: a 180 degree cone // provisional (F5)
  reach: 24,           // meters the drawn cone reads on the snow // provisional (F5)
};

// setOverwatch(sq, x, z, pts): the squad stands its ground and watches a
// bearing; 1 point buys the narrow cone, 2 the wide one. Ordering overwatch
// again re-aims it; the width rides the total points sunk this turn.
export function setOverwatch(sq, x, z, pts) {
  const b = Math.atan2(x - sq.anchor.x, z - sq.anchor.z);
  sq.order = "defend";
  sq.dest = null;
  sq._route = null;
  sq._routeDest = null;
  sq._ow = { b, half: pts >= 2 ? OVERWATCH.half2 : OVERWATCH.half1, pts };
}

export function clearOverwatch(sq) { sq._ow = null; }

// markTarget(war, body): the mark is one shared target the whole side can
// see; marking is free — information costs nothing.
export function markTarget(war, body) { war.run._markId = body ? body.id : null; }
export function markedTarget(war) {
  const id = war.run._markId;
  if (id == null) return null;
  const b = war.world.byId.get(id);
  return b && b.alive ? b : null;
}

// focusOrder(sq, target): focus fire — the squad's trigger prefers this
// body while it lives and stays reachable; the attack march rides FL-1's
// own two field writes.
export function focusOrder(sq, target) {
  sq.focusId = target.id;
  sq.order = "attack";
  sq.dest = { x: target.pos.x, z: target.pos.z };
  sq._route = null;
  sq._routeDest = null;
}

// Discipline per squad: CAREFUL holds fire on the enemy's half unless an
// overwatch cone covers the shot; FREE fires at anything seen, any half.
export function discOf(sq) { return sq._disc || "careful"; }
export function toggleDiscipline(sq) { sq._disc = discOf(sq) === "careful" ? "free" : "careful"; return sq._disc; }

// applyFireControl(ts, squads): run every tick before tickWar — writes the
// three engine-read fields from the turn phase, the discipline, and the
// overwatch state. Free time and the player's own half fight as FL-1 did;
// the enemy's half is where discipline and the cone rule.
export function applyFireControl(ts, squads) {
  for (const sq of squads) {
    if (sq.focusId != null) { /* cleared by the page when the target dies or a new order lands */ }
    if (ts.phase === "enemy" && discOf(sq) === "careful") {
      if (sq._ow) { sq.holdFire = false; sq.fireArc = { b: sq._ow.b, half: sq._ow.half }; }
      else { sq.holdFire = true; sq.fireArc = null; }
    } else {
      sq.holdFire = false;
      sq.fireArc = sq._ow && ts.phase === "enemy" ? { b: sq._ow.b, half: sq._ow.half } : null;
    }
  }
}

// inArc(arc, fx, fz, tx, tz): the cone's own test, offered to the gate.
export function inArc(arc, fx, fz, tx, tz) {
  let da = Math.atan2(tx - fx, tz - fz) - arc.b;
  while (da > Math.PI) da -= Math.PI * 2;
  while (da < -Math.PI) da += Math.PI * 2;
  return Math.abs(da) <= arc.half;
}

// owPaths(squads, heightAt): the drawn cone — two edge rays and a five-point
// arc as order-path polylines, riding the renderer's existing overlay.
export function owPaths(squads, heightAt) {
  const out = [];
  for (const sq of squads) {
    if (!sq._ow) continue;
    const { b, half } = sq._ow, R = OVERWATCH.reach;
    const pt = (az, r) => ({ x: sq.anchor.x + Math.sin(az) * r, y: heightAt(sq.anchor.x + Math.sin(az) * r, sq.anchor.z + Math.cos(az) * r), z: sq.anchor.z + Math.cos(az) * r });
    const o = { x: sq.anchor.x, y: heightAt(sq.anchor.x, sq.anchor.z), z: sq.anchor.z };
    out.push([o, pt(b - half, R)]);
    out.push([o, pt(b + half, R)]);
    const arc = [];
    for (let k = 0; k <= 4; k++) arc.push(pt(b - half + (k / 4) * 2 * half, R));
    out.push(arc);
  }
  return out;
}
