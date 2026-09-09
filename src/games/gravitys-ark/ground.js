// MODULE of the game GRAVITY'S ARK: the ground, phase 0.1.1. The crash world
// runs on coldsnap's engine, whole: its map maker, its war, its attacker with
// its brain, its books and its bell, its build law for guns. This file is the
// ark's layer over that engine and nothing more: the boot from the ark's own
// world seed, the one purse the hold's scrap feeds, the hull as bodies on
// welds, the orders, the take-off. The page's ground screen draws it. Every
// number here is PROPOSED.
import { bootWar, tickWar, defaultTickInput, runHash, serializeRun } from "../../depot/api.js";
import { buildSnapshotOf } from "../../depot/tick.js";
import { buildEmitters } from "../../depot/boot.js";
import { makePlacement } from "../../depot/placement.js";
import { computeFlowField } from "../../depot/mapgen.js";
import { stepTerritory } from "../../depot/territory.js";
import { TOWER_SPECS, TOWER_ORDER } from "../../depot/specs.js";
import { worldHash, addBody, addWeld } from "../../engine/core.js";
import { weldLoads, breaking } from "../../modules/weldstress/weldstress.js";
import { MODULES } from "./stations.js";

// kgPerScrap: the seam's rate between the ark's scrap in kilograms and coldsnap's
// scrap. heldSteps and heldStep: territory steps run at the boot, so the crash
// site is the player's ground from the first frame; the war's own clock takes it
// from there. All PROPOSED.
export const GROUND_DIALS = { kgPerScrap: 10, heldSteps: 4, heldStep: 0.25 };
export const GUNS = TOWER_ORDER.slice();

// groundSeed(seed, w): one seed per world of the galaxy, from the galaxy's own seed.
export function groundSeed(seed, w) { return (seed + 7919 * (w.i + 1)) >>> 0; }

// makeGround(seed, w, scrapKg, opts): the crash world, booted. No draft: the war
// starts at once, the attacker's opening already fielded by coldsnap's own muster.
export function makeGround(seed, w, scrapKg, opts) {
  const d = { ...GROUND_DIALS, ...(opts && opts.dials) };
  const war = bootWar({ seed: groundSeed(seed, w) });
  const run = war.run, world = war.world;
  run.started = true;
  run.resources = Math.floor(scrapKg / d.kgPerScrap);
  for (let i = 0; i < d.heldSteps; i++) stepTerritory(war.T, buildEmitters(world, war.map), d.heldStep);
  const objG = war.grid.worldToGrid(war.map.OBJ_POS.x, war.map.OBJ_POS.z);
  const recomputeFlow = () => computeFlowField(war.grid, objG.gx, objG.gz);
  const events = [], cues = [];
  const say = (k, extra) => { const e = { k, t: world.t, ...(extra || {}) }; events.push(e); return e; };
  const cue = (name) => { cues.push({ type: name }); };
  const depotP = war.map.TOWN.find((t) => t.depot && t.team !== 2);
  const input = defaultTickInput();
  const townUV = war.town.map((b) => { const c = war.map.invW(b.x, b.z); return { id: b.id, x: c.u, z: c.v, marker: b.marker, get ruined() { return b.ruined; } }; });
  // the bell's context: its cues go to the page as sound events; the one save draw per bell stays coldsnap's own
  input.bellCtx = { cue, toast: (text) => say("toast", { text }), townUV, buildSnapshot: () => buildSnapshotOf(war), nextApcSeq: () => ++war.seq.apc, saveFront: () => { serializeRun(war); }, possessed: () => false };
  const placement = makePlacement({ world, run, view: {}, input, map: war.map, grid: war.grid, field: war.field, T: war.T, R: null, dev: false,
    toast: (text) => say("toast", { text }), cue, setHud: () => {}, nextApcSeq: () => ++war.seq.apc, depotP, recomputeFlow });
  return { seed: groundSeed(seed, w), war, run, world, input, events, cues, placement, dials: d, scrapKgIn: scrapKg };
}

// HULL_DIALS, the seam's numbers and the crash law, all PROPOSED. kgPerKg: a space
// kilogram lands as this many ground kilograms. box and pitch: a module's half size
// and the grid step, in metres. lift: how far above the ground a module is set.
// crashStop: the crash's stop time; the arrival speed over it is the deceleration.
// slideFrac: how far a loose module slides, in metres per metre a second of arrival
// speed. moduleHp: a module's hit points. offsetX, offsetZ: the crash site from the
// depot's spot, in metres.
export const HULL_DIALS = { kgPerKg: 250, box: 0.8, pitch: 1.7, lift: 0.02, crashStop: 0.3, slideFrac: 0.6, moduleHp: 400, offsetX: 14, offsetZ: 0 };

// crashHull(G, hull, v, opts): the hull's modules become bodies at the crash site,
// set down at rest and asleep as coldsnap's masonry is, welded to their grid
// neighbours with the ship's own weld strengths at the seam's scale. The crash's
// deceleration is the arrival speed over the stop time; a weld whose load beats
// its strength by the weld-stress rule is not made, and every module cut off from
// the bridge by the broken welds is loose and slides.
export function crashHull(G, hull, v, opts) {
  const d = { ...HULL_DIALS, ...(opts && opts.dials) };
  const { world, war } = G, f = G.run.focus;
  const list = hull.list, ws = hull.builder.weldsOf(list);
  const a = v / d.crashStop;
  const broken = new Set(breaking(weldLoads(hull.builder, MODULES, list, ws, a, 1), ws));
  const held = ws.filter((w, k) => !broken.has(k));
  const keep = hull.builder.connectedFrom(list, held, 0);
  const slide = d.slideFrac * v;
  const slots = list.map((m) => ({ x: f.x + d.offsetX + m.gx * d.pitch, z: f.z + d.offsetZ + m.gy * d.pitch }));
  const bodies = list.map((m, i) => {
    const loose = !keep.has(i);
    const x = slots[i].x + (loose ? slide : 0), z = slots[i].z;
    const b = addBody(world, { kind: "chunk", team: 1, mass: MODULES[m.t].kg * d.kgPerKg, hx: d.box, hy: d.box, hz: d.box, x, y: war.field.heightAt(x, z) + d.box + d.lift, z, hp: d.moduleHp, friction: 0.65, restitution: 0.02 });
    b.sleeping = true; b.town = "hull"; b.module = m.t; b.maxHp = d.moduleHp; b.tint = loose ? "timber" : "wall";
    return b;
  });
  const welds = [];
  for (const w of held) if (keep.has(w.a) && keep.has(w.b)) welds.push({ a: w.a, b: w.b, weld: addWeld(world, bodies[w.a], bodies[w.b], w.strength * d.kgPerKg) });
  G.hull = { list, builder: hull.builder, bodies, slots, welds, v, a, broken: [...broken], loose: list.map((m, i) => i).filter((i) => !keep.has(i)), dials: d };
  return G.hull;
}

// joined(G): the modules joined to the bridge through unbroken welds between living modules.
function joined(G) {
  const H = G.hull;
  if (!H || !H.bodies[0].alive) return new Set();
  const ws = H.welds.filter((w) => !w.weld.broken && H.bodies[w.a].alive && H.bodies[w.b].alive).map((w) => ({ a: w.a, b: w.b }));
  return H.builder.connectedFrom(H.list, ws, 0);
}

// looseModules(G): the living modules not joined to the bridge.
export function looseModules(G) {
  if (!G.hull) return [];
  const j = joined(G);
  return G.hull.bodies.map((b, i) => i).filter((i) => G.hull.bodies[i].alive && !j.has(i));
}

// weldBack(G, i): a module back in its slot, welded to every living grid neighbour it
// is not yet welded to. The repair's mechanism; her act comes in the next task.
export function weldBack(G, i) {
  const H = G.hull, d = H.dials, b = H.bodies[i];
  if (!b || !b.alive) return 0;
  const s = H.slots[i];
  b.pos.x = s.x; b.pos.z = s.z; b.pos.y = G.war.field.heightAt(s.x, s.z) + d.box + d.lift;
  b.v.x = 0; b.v.y = 0; b.v.z = 0; b.w.x = 0; b.w.y = 0; b.w.z = 0; b.sleeping = true; b.tint = "wall";
  let n = 0;
  for (const w of H.builder.weldsOf(H.list)) {
    if (w.a !== i && w.b !== i) continue;
    const o = H.bodies[w.a === i ? w.b : w.a];
    if (!o.alive) continue;
    if (H.welds.some((x) => ((x.a === w.a && x.b === w.b) || (x.a === w.b && x.b === w.a)) && !x.weld.broken)) continue;
    H.welds.push({ a: w.a, b: w.b, weld: addWeld(G.world, H.bodies[w.a], H.bodies[w.b], w.strength * d.kgPerKg) }); n++;
  }
  return n;
}

// order(G, kind, x, z, which): the player's orders. "gun" places one of coldsnap's
// towers at the ground point by its build law: held ground, a free cell, the live
// price, one purchase a second. "takeoff" hands the purse back as kilograms, names
// the modules lost, and refuses while a living module is loose or the bridge is dead.
export function order(G, kind, x, z, which) {
  const { war, run, placement } = G;
  if (kind === "gun") {
    const key = which || "gun";
    if (!TOWER_SPECS[key]) return { ok: false, reason: "no such gun" };
    const g = war.grid.worldToGrid(x, z);
    const before = run.resources, n0 = G.events.length;
    placement.buildAt(g.gx, g.gz, key);
    if (run.resources < before) { const cost = before - run.resources; G.events.push({ k: "gun", t: G.world.t, key, cost }); return { ok: true, key, cost }; }
    const last = G.events.length > n0 ? G.events[G.events.length - 1] : null;
    return { ok: false, reason: last && last.k === "toast" ? last.text : "refused" };
  }
  if (kind === "takeoff") {
    const out = { ok: true, scrapKg: run.resources * G.dials.kgPerScrap, lost: [], keptList: null, abandoned: false };
    if (G.hull) {
      const H = G.hull;
      if (!H.bodies[0].alive) return { ok: false, reason: "the bridge is lost", abandoned: true };
      const loose = looseModules(G);
      if (loose.length) return { ok: false, reason: loose.length + (loose.length > 1 ? " modules loose" : " module loose"), loose };
      const j = joined(G);
      out.lost = H.list.map((m, i) => i).filter((i) => !j.has(i)).map((i) => H.list[i].t);
      out.keptList = H.list.filter((m, i) => j.has(i)).map((m) => ({ ...m }));
    }
    return out;
  }
  return { ok: false, reason: "no such order" };
}

// price(G, key): what a gun costs now, the market's live price or the base cost.
export function price(G, key) { return G.placement.priceNow(key, TOWER_SPECS[key].cost); }

// tick(G, dt): one step of the war; the engine's events and the bell's cues come back for the page.
export function tick(G, dt) {
  const r = tickWar(G.war, dt, G.input);
  return { events: r.events, flags: r.flags, cues: G.cues.splice(0) };
}

// summary(G): the pane's numbers.
export function summary(G) {
  const { world, run } = G;
  let foes = 0, guns = 0;
  for (const b of world.bodies) {
    if (!b.alive) continue;
    if (b.team === 2 && (b.kind === "unit" || b.kind === "vehicle" || b.kind === "mech")) foes++;
    if (b.team === 1 && b.kind === "tower") guns++;
  }
  const H = G.hull, alive = H ? H.bodies.filter((b) => b.alive).length : 0;
  const modules = H ? { total: H.bodies.length, alive, loose: looseModules(G).length } : null;
  return { t: world.t, bell: run.bell, bellIn: Math.max(0, run.bellAt - world.t), scrap: run.resources, scrapKg: run.resources * G.dials.kgPerScrap, foes, guns, modules,
    standing: H ? alive / H.bodies.length : (run.depotStanding == null ? 1 : run.depotStanding), lost: !!(H && !H.bodies[0].alive), warOver: !!run.gameOver };
}

// hash(G): the world's hash and the run's, for twin checks.
export function hash(G) { return worldHash(G.world) + ":" + runHash(G.run); }
