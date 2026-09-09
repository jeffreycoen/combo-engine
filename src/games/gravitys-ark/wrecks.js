// MODULE of the game GRAVITY'S ARK: wrecks, the order's phase 0.0.107, frames
// 4 and 6 headless, every number PROPOSED from the order's scale table, the
// weld law the weldstress module's, the rope the grapple module's, the fall
// the wells law.

import { accel } from "../../modules/wells/wells.js";
import { weldLoads, breaking, splitByRoot } from "../../modules/weldstress/weldstress.js";
import { castGrapple, bite, tapGrapple, stepFly, stepRewind, stepRope, GRAP } from "../../modules/grapple/grapple.js";

// The module table, the order's own (batch-ark-1, "The scale table"). At the
// landing this becomes an import from ./stations.js; kept as a local const,
// not exported, so the swap is one line.
import { MODULES } from "./stations.js";   // the landing swapped the brief's copy for the stations module's table

export const WRECK_DIALS = { shellDv: 120, shellR: 60000, shellT: 2, fieldN: 12, fieldR: 40000, fieldMin: 6000, scrapMin: 200, scrapMax: 1500, crateMin: 300, crateMax: 2000, biteR: 6, takeR: GRAP.CLOSE, headKg: 15 };
export const WRECK_KINDS = ["scrap", "crate", "module", "hull"];
export const ROPE = { ...GRAP, SNAP: 52000, RANGE: 300, TIME: 10 };   // the grapple module's dials at the order's scale, PROPOSED: the snap threshold times 200 for masses in real kilograms, the range and the flight time for space

// shellDv(dist, d): the collapse shove at a distance, weaker with distance.
export function shellDv(dist, d) { return d.shellDv / (1 + Math.pow(dist / d.shellR, 2)); }

// shell(bodies, star, d): shove every body outward from the star. Worlds and
// stations are never handed in. Returns the dv applied, in order.
export function shell(bodies, star, d) {
  const dvs = [];
  for (const b of bodies) {
    const dist = Math.hypot(b.x - star.x, b.y - star.y);
    let ux, uy;
    if (dist === 0) { ux = 1; uy = 0; } else { ux = (b.x - star.x) / dist; uy = (b.y - star.y) / dist; }
    const dv = shellDv(dist, d);
    b.vx += ux * dv; b.vy += uy * dv;
    dvs.push(dv);
  }
  return dvs;
}

// shellOnHull(hull, star, ship, d): the shove as a load on the hull's welds.
// Whatever breaks is shed; hull.list becomes the kept component.
export function shellOnHull(hull, star, ship, d) {
  const dist = Math.hypot(ship.x - star.x, ship.y - star.y);
  const a = shellDv(dist, d) / d.shellT;
  const ws = hull.builder.weldsOf(hull.list);
  const loads = weldLoads(hull.builder, MODULES, hull.list, ws, a, 1);   // amended in the page step: at the order's scale a load is mass times acceleration in newtons, the factor 1
  const broken = breaking(loads, ws);
  if (!broken.length) return { shed: [], kept: hull.list, a };
  const ws2 = ws.filter((w, k) => !broken.includes(k));
  const split = splitByRoot(hull.builder, hull.list, ws2, 0);
  hull.list = split.kept;
  return { shed: split.gone, kept: split.kept, a };
}

// wreckOf(kind, x, y, vx, vy, mass, extra): a wreck record.
export function wreckOf(kind, x, y, vx, vy, mass, extra) {
  return { kind, x, y, vx, vy, mass, taken: false, ...extra };
}

// shedToWrecks(shed, ship, rng): one wreck per shed module, scattered near
// the ship at its own velocity.
export function shedToWrecks(shed, ship, rng) {
  return shed.map((m) => {
    const dx = (rng() * 2 - 1) * 20, dy = (rng() * 2 - 1) * 20;
    return wreckOf("module", ship.x + dx, ship.y + dy, ship.vx, ship.vy, MODULES[m.t].kg, { module: m.t });
  });
}

// makeField(star, rng, d): d.fieldN wrecks rolled around the pit, shoved by
// the shell law.
export function makeField(star, rng, d) {
  const out = [];
  for (let i = 0; i < d.fieldN; i++) {
    const dist = d.fieldMin + rng() * (d.fieldR - d.fieldMin);
    const ang = rng() * 2 * Math.PI;
    const kind = WRECK_KINDS[Math.floor(rng() * 4)];
    let mass, extra;
    if (kind === "scrap") { mass = d.scrapMin + rng() * (d.scrapMax - d.scrapMin); extra = undefined; }
    else if (kind === "crate") { mass = 200; extra = { value: Math.round(d.crateMin + rng() * (d.crateMax - d.crateMin)) }; }
    else if (kind === "module") { const module = Object.keys(MODULES)[Math.floor(rng() * 11)]; mass = MODULES[module].kg; extra = { module }; }
    else { mass = 1000 + rng() * 2000; extra = undefined; }
    const x = star.x + Math.cos(ang) * dist, y = star.y + Math.sin(ang) * dist;
    const w = wreckOf(kind, x, y, 0, 0, mass, extra);
    shell([w], star, d);
    out.push(w);
  }
  return out;
}

// stepWrecks(wrecks, wells, dt): every wreck not taken falls under the wells
// law.
export function stepWrecks(wrecks, wells, dt) {
  for (const w of wrecks) {
    if (w.taken) continue;
    const [ax, ay] = accel(wells, w.x, w.y);
    w.vx += ax * dt; w.vy += ay * dt;
    w.x += w.vx * dt; w.y += w.vy * dt;
  }
}

// makeGrappler(ship): the grappler's own state, unarmed.
export function makeGrappler(ship) {
  return { g: null, ship2d: null, target: null, hooked: null };
}

// ship2d(ship, mass): the ship as a 2D rope-physics body.
export function ship2d(ship, mass) {
  return { x: ship.x, y: ship.y, vx: ship.vx, vy: ship.vy, w: 0, ang: 0, M: mass, I: mass * 4 };
}

// cast(gr, ship, mass, wreck, d): fire the grapple at a wreck; the ship pays
// the recoil.
export function cast(gr, ship, mass, wreck, d) {
  gr.ship2d = ship2d(ship, mass);
  gr.ship2d.ang = Math.atan2(wreck.y - ship.y, wreck.x - ship.x);
  gr.g = castGrapple(gr.ship2d, ship.x, ship.y, 0, ROPE);
  gr.target = wreck;
  ship.vx = gr.ship2d.vx; ship.vy = gr.ship2d.vy;
  return gr.g;
}

// stepGrappler(gr, ship, mass, wells, dt, d): one tick of the grapple's own
// state machine. Returns null when unarmed, { taken } on a catch, { state }
// otherwise.
export function stepGrappler(gr, ship, mass, wells, dt, d) {
  if (!gr.g) return null;
  gr.ship2d.x = ship.x; gr.ship2d.y = ship.y; gr.ship2d.vx = ship.vx; gr.ship2d.vy = ship.vy; gr.ship2d.M = mass;
  const state = gr.g.state;
  if (state === "fly") {
    stepFly(gr.g, (x, y) => accel(wells, x, y), ship.x, ship.y, dt, ROPE);
    if (Math.hypot(gr.g.x - gr.target.x, gr.g.y - gr.target.y) < d.biteR) {
      bite(gr.g);
      tapGrapple(gr.g);
    }
  } else if (state === "rewind") {
    if (stepRewind(gr.g, ship.x, ship.y, dt, ROPE) === null) gr.g = null;
  } else if (state === "stuck" || state === "reel") {
    stepRope(gr.g, gr.ship2d, ship.x, ship.y, gr.target, gr.target.mass, dt, ROPE);
    ship.vx = gr.ship2d.vx; ship.vy = gr.ship2d.vy;
    if (Math.hypot(gr.target.x - ship.x, gr.target.y - ship.y) < d.takeR) {
      gr.target.taken = true; gr.hooked = gr.target; gr.g = null;
      return { taken: gr.target };
    }
  }
  return { state };
}

// take(hull, purse, wreck): book a caught wreck by kind. Returns the kind.
export function take(hull, purse, wreck) {
  if (wreck.kind === "scrap") { hull.scrap += wreck.mass; }
  else if (wreck.kind === "module") { hull.spares.push(wreck.module); }
  else if (wreck.kind === "crate") { purse.credits += wreck.value; hull.scrap += wreck.mass; }
  else if (wreck.kind === "hull") { hull.scrap += wreck.mass; }
  return wreck.kind;
}

// massOf(hull, wrecks): the mass the ledger audits — the hull's scrap and
// spares, plus every wreck not yet taken.
export function massOf(hull, wrecks) {
  return hull.scrap + hull.spares.reduce((s, k) => s + MODULES[k].kg, 0)
    + wrecks.filter((w) => !w.taken).reduce((s, w) => s + w.mass, 0);
}

export const WRECK_CONTRACT = { kind: "one of scrap, crate, module, hull", mass: "number > 0", x: "finite", y: "finite", vx: "finite", vy: "finite" };

// checkWreck(w): every problem in one pass, empty when clean.
export function checkWreck(w) {
  const problems = [];
  if (typeof w !== "object" || w === null) { problems.push("wreck: not an object"); return problems; }
  if (!WRECK_KINDS.includes(w.kind)) problems.push("wreck.kind: one of scrap, crate, module, hull required");
  if (!(typeof w.mass === "number" && w.mass > 0)) problems.push("wreck.mass: number > 0 required");
  for (const f of ["x", "y", "vx", "vy"]) {
    if (!Number.isFinite(w[f])) problems.push(`wreck.${f}: finite number required`);
  }
  return problems;
}
