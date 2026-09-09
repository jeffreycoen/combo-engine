// MODULE of the game GRAVITY'S ARK: the ground, phase 0.1.1. The crash world
// runs on coldsnap's engine, whole: its map maker, its war, its attacker with
// its brain, its books and its bell, its build law for guns. This file is the
// ark's layer over that engine and nothing more: the boot from the ark's own
// world seed, the one purse the hold's scrap feeds, the orders, the take-off.
// The page's ground screen draws it. Every number here is PROPOSED.
import { bootWar, tickWar, defaultTickInput, runHash, serializeRun } from "../../depot/api.js";
import { buildSnapshotOf } from "../../depot/tick.js";
import { buildEmitters } from "../../depot/boot.js";
import { makePlacement } from "../../depot/placement.js";
import { computeFlowField } from "../../depot/mapgen.js";
import { stepTerritory } from "../../depot/territory.js";
import { TOWER_SPECS, TOWER_ORDER } from "../../depot/specs.js";
import { worldHash } from "../../engine/core.js";

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

// order(G, kind, x, z, which): the player's orders. "gun" places one of coldsnap's
// towers at the ground point by its build law: held ground, a free cell, the live
// price, one purchase a second. "takeoff" hands the purse back as kilograms.
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
  if (kind === "takeoff") return { ok: true, scrapKg: run.resources * G.dials.kgPerScrap };
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
  return { t: world.t, bell: run.bell, bellIn: Math.max(0, run.bellAt - world.t), scrap: run.resources, scrapKg: run.resources * G.dials.kgPerScrap, foes, guns,
    standing: run.depotStanding == null ? 1 : run.depotStanding, lost: !!run.gameOver };
}

// hash(G): the world's hash and the run's, for twin checks.
export function hash(G) { return worldHash(G.world) + ":" + runHash(G.run); }
