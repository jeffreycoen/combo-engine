// MODULE of the game GRAVITY'S ARK: the ground, phase 0.1.1. The crash world
// runs on coldsnap's engine, whole: its map maker, its war, its attacker with
// its brain, its books and its bell, its build law for guns. This file is the
// ark's layer over that engine and nothing more: the boot from the ark's own
// world seed, the one purse the hold's scrap feeds, the hull as bodies on
// welds, her and the hands as troopers, her walker, the orders, the take-off.
// The page's ground screen draws it. Every number here is PROPOSED.
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
import { makeSquad, SQUAD_SPECS } from "../../depot/squads.js";
import { spawnSquadMembers } from "../../depot/state.js";
import { INFANTRY_ARMS } from "../../depot/specs.js";
import { startBuildLine, stepBuildLine } from "../../depot/buildlines.js";
import { stampBag } from "../../depot/boot.js";
import { buildMech, mechCommand } from "../../engine/mech.js";
import { MECH } from "../../depot/specs.js";

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
  // the build-line driver: her squad lays walls along a two-point line by coldsnap's own law, paid from the one purse
  const buildCtx = { objG, recomputeFlow, stampBag: (b, side) => stampBag(war.grid, b, side), setMines: () => {} };
  input.stepBuildLine = (sq) => stepBuildLine(world, war.grid, war.field, war.T, run, sq, buildCtx, (text) => say("toast", { text }), war.map);
  return { seed: groundSeed(seed, w), war, run, world, input, events, cues, placement, dials: d, scrapKgIn: scrapKg, her: null, hands: [], walker: null, stick: { f: 0, l: 0, h: null } };
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

// HER: her row and her arms, installed into coldsnap's tables at the ground's boot so
// its copies stay verbatim; her sidearm is the hunter's, her body the one MAN row.
// reach: how close she must stand to a module to work on it; repairBase and
// repairPerM: the weld-back's seconds, plus seconds per metre the module slid;
// standOff: where she and the hands stand from the bridge at the crash. All PROPOSED.
export const HER = {
  squad: { n: 1, cost: 0, speed: 3.2, label: "THE ENGINEER" },
  arms: { projSpeed: 80, kind: "mg", weapon: "sidearms", dmg: 5, dirDmg: 11, burst: 2, burstGap: 0.10, fireRate: 0.8, range: 12, acc: 0.075, occl: "arc", windF: 0.06, windComp: 0.6 },
  reach: 2.5, repairBase: 5, repairPerM: 1.5, standOff: 4,
};
export function installHer() { SQUAD_SPECS.her = { ...HER.squad }; INFANTRY_ARMS.her = { ...HER.arms }; }

// fieldCrew(G, crew): she stands off the bridge as a squad of one on her own row; the
// hands stand as rifle squads of up to four, each man carrying his name.
export function fieldCrew(G, crew) {
  installHer();
  const { run, world } = G, H = G.hull, d = HER;
  const at = H ? H.slots[0] : { x: run.focus.x, z: run.focus.z };
  const squad = makeSquad(run.nextSquadId++, "her", 1, at.x, at.z + d.standOff);
  spawnSquadMembers(world, squad); run.squads.push(squad);
  const names = (crew || []).map((h) => h.name), hands = [];
  for (let k = 0; k < names.length; k += 4) {
    const some = names.slice(k, k + 4);
    const sq = makeSquad(run.nextSquadId++, "rifles", 1, at.x, at.z - d.standOff - 2 * (k / 4));
    spawnSquadMembers(world, sq, some.length); run.squads.push(sq);
    sq.memberIds.forEach((id, j) => { const u = world.byId.get(id); if (u) u.handName = some[j]; hands.push({ id, name: some[j], alive: true }); });
  }
  G.her = { squad, act: "hold", target: null, actT: 0, alive: true };
  G.hands = hands;
  return G.her;
}

// WALKER: hers, coldsnap's own mech at coldsnap's own scale, 5.4 m tall, two and a
// half troopers; it lies wrecked beside the hull at the crash until she repairs it.
// repair: her seconds at the wreck; spotX, spotZ: the wreck's spot from the bridge, in
// metres; s: the scale. PROPOSED.
export const WALKER = { s: 1, repair: 10, spotX: 0, spotZ: -8 };

// wreckWalker(G): the walker lies wrecked at its spot; nothing stands until she repairs it.
export function wreckWalker(G) {
  const s0 = G.hull ? G.hull.slots[0] : { x: G.run.focus.x, z: G.run.focus.z };
  G.walker = { mech: null, spot: { x: s0.x + WALKER.spotX, z: s0.z + WALKER.spotZ }, wrecked: true, alive: false, possessed: false };
  return G.walker;
}

// raiseWalker(G): the repair's mechanism: coldsnap's mech built at the wreck's spot on the player's side, hers.
export function raiseWalker(G) {
  const W = G.walker;
  if (!W || W.mech) return null;
  const m = buildMech(G.world, { x: W.spot.x, z: W.spot.z, yaw: 0, team: 1, hp: MECH.hp, s: WALKER.s });
  m.thrustersOn = true; m.thrustAssist = true; m.hull.maxHp = MECH.hp;
  W.mech = m; W.wrecked = false; W.alive = true;
  return m;
}

// walkerAlive(G): the walker stands and lives.
export function walkerAlive(G) { const W = G.walker; return !!(W && W.mech && W.mech.hull.alive); }

// setStick(G, f, l, h): the page's stick for the possessed walker: travel and lateral as fractions, heading in radians or null.
export function setStick(G, f, l, h) { G.stick.f = f; G.stick.l = l; G.stick.h = h; }

// takeWalker / leaveWalker: she takes the walker through coldsnap's own possession door; the stick feeds its commands
function takeWalker(G) {
  const W = G.walker;
  G.input.possess = { kind: "mech", id: W.mech.hull.id };
  G.input.feedMech = (m) => { const s = G.stick; mechCommand(m, { travel: s.f, lateral: s.l, heading: s.h }); };
  W.possessed = true;
}
function leaveWalker(G) {
  G.input.possess = null; G.input.feedMech = null; G.input.fireHeld = false;
  if (G.walker) G.walker.possessed = false;
}

// herBody(G): her living body, or null.
export function herBody(G) {
  const id = G.her && G.her.squad.memberIds[0];
  const b = id != null ? G.world.byId.get(id) : null;
  return b && b.alive ? b : null;
}

// stepHer(G, dt): her act. Fixing, she stands within reach of her module and the
// seconds run down, then the weld-back; a wall order ends when the line is laid. The
// hands' deaths and hers come back as events by name.
export function stepHer(G, dt) {
  const out = [], her = G.her;
  if (!her) return out;
  const b = herBody(G);
  const rest = () => { her.act = "hold"; her.target = null; her.squad.holdFire = false; if (her.squad.order === "move") { her.squad.order = "defend"; her.squad.dest = null; } };
  const W = G.walker;
  if (W && W.alive && !(W.mech && W.mech.hull.alive)) { W.alive = false; out.push({ k: "walkerDown", t: G.world.t }); if (W.possessed) leaveWalker(G); if (her.act === "walker") rest(); }
  if (!b) { if (her.alive) { her.alive = false; out.push({ k: "herDead", t: G.world.t }); if (W && W.possessed) leaveWalker(G); } }
  else if (her.act === "repairWalker" && W) {
    if (Math.hypot(W.spot.x - b.pos.x, W.spot.z - b.pos.z) <= HER.reach + 2) {
      her.actT -= dt;
      if (her.actT <= 0) { raiseWalker(G); out.push({ k: "walkerUp", t: G.world.t }); rest(); }
    }
  }
  else if (her.act === "fix" && her.target != null) {
    const m = G.hull.bodies[her.target];
    if (!m.alive) rest();
    else if (Math.hypot(m.pos.x - b.pos.x, m.pos.z - b.pos.z) <= HER.reach) {
      her.actT -= dt;
      if (her.actT <= 0) { weldBack(G, her.target); out.push({ k: "repaired", t: G.world.t, module: G.hull.list[her.target].t }); rest(); }
    }
  } else if (her.act === "wall" && !her.squad._build) rest();
  for (const h of G.hands) { if (!h.alive) continue; const u = G.world.byId.get(h.id); if (!u || !u.alive) { h.alive = false; out.push({ k: "handDead", t: G.world.t, name: h.name }); } }
  return out;
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
  if (kind === "fix") {   // she fixes: she walks to the nearest loose module and welds it back, her fire held meanwhile
    const b = herBody(G);
    if (!b) return { ok: false, reason: "she is dead" };
    const loose = looseModules(G);
    if (!loose.length) return { ok: false, reason: "nothing loose" };
    let best = null, bd = Infinity;
    for (const i of loose) { const m = G.hull.bodies[i]; const dd = Math.hypot(m.pos.x - b.pos.x, m.pos.z - b.pos.z); if (dd < bd) { bd = dd; best = i; } }
    const m = G.hull.bodies[best], sq = G.her.squad;
    sq.order = "move"; sq.dest = { x: m.pos.x, z: m.pos.z }; sq._route = null; sq._routeDest = null; sq._build = null; sq.holdFire = true;
    const slid = Math.hypot(m.pos.x - G.hull.slots[best].x, m.pos.z - G.hull.slots[best].z);
    G.her.act = "fix"; G.her.target = best; G.her.actT = HER.repairBase + HER.repairPerM * slid;
    G.events.push({ k: "fix", t: G.world.t, module: G.hull.list[best].t, seconds: G.her.actT });
    return { ok: true, target: best, seconds: G.her.actT };
  }
  if (kind === "fight") {   // she fights: in the walker when it stands, else where she is with her sidearm
    const b = herBody(G);
    if (!b) return { ok: false, reason: "she is dead" };
    const sq = G.her.squad;
    sq.order = "defend"; sq.dest = null; sq._build = null;
    if (walkerAlive(G)) { takeWalker(G); sq.holdFire = true; G.her.act = "walker"; G.her.target = null; G.her.actT = 0; G.events.push({ k: "walkerTaken", t: G.world.t }); return { ok: true, walker: true }; }
    sq.holdFire = false; G.her.act = "fight"; G.her.target = null; G.her.actT = 0;
    G.events.push({ k: "fightHer", t: G.world.t });
    return { ok: true, walker: false };
  }
  if (kind === "hold") {   // she stands down: out of the walker, her fire free, where she is
    const b = herBody(G);
    if (!b) return { ok: false, reason: "she is dead" };
    if (G.walker && G.walker.possessed) leaveWalker(G);
    const sq = G.her.squad;
    sq.order = "defend"; sq.dest = null; sq._build = null; sq.holdFire = false;
    G.her.act = "hold"; G.her.target = null; G.her.actT = 0;
    return { ok: true };
  }
  if (kind === "repairWalker") {   // she raises the walker: she walks to the wreck and her seconds run down there
    const b = herBody(G);
    if (!b) return { ok: false, reason: "she is dead" };
    if (!G.walker) return { ok: false, reason: "no walker here" };
    if (walkerAlive(G)) return { ok: false, reason: "the walker stands" };
    if (G.walker.possessed) leaveWalker(G);
    const sq = G.her.squad;
    sq.order = "move"; sq.dest = { x: G.walker.spot.x, z: G.walker.spot.z }; sq._route = null; sq._routeDest = null; sq._build = null; sq.holdFire = true;
    G.her.act = "repairWalker"; G.her.target = null; G.her.actT = WALKER.repair;
    G.events.push({ k: "repairWalker", t: G.world.t, seconds: WALKER.repair });
    return { ok: true, seconds: WALKER.repair };
  }
  if (kind === "fire") { G.input.fireHeld = !!x; return { ok: true }; }
  if (kind === "wall") {   // she lays a wall from (x, z) to which, by coldsnap's build line, one purse
    const b = herBody(G);
    if (!b) return { ok: false, reason: "she is dead" };
    if (!which || typeof which.x !== "number") return { ok: false, reason: "no end" };
    const sq = G.her.squad;
    startBuildLine(war.grid, sq, "walls", { x, z }, { x: which.x, z: which.z }, (text) => G.events.push({ k: "toast", t: G.world.t, text }), 1);
    sq.holdFire = true; G.her.act = "wall"; G.her.target = null; G.her.actT = 0;
    return { ok: true, sections: sq._build.rows.length };
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
  for (const e of stepHer(G, dt)) G.events.push(e);
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
  const her = G.her ? { alive: !!herBody(G), act: G.her.act, actT: G.her.actT } : null;
  const walker = G.walker ? { wrecked: !G.walker.mech, alive: walkerAlive(G), hp: G.walker.mech ? G.walker.mech.hull.hp : 0, possessed: G.walker.possessed } : null;
  const hands = { alive: G.hands.filter((h) => h.alive).length, total: G.hands.length };
  return { t: world.t, bell: run.bell, bellIn: Math.max(0, run.bellAt - world.t), scrap: run.resources, scrapKg: run.resources * G.dials.kgPerScrap, foes, guns, modules, her, hands, walker,
    standing: H ? alive / H.bodies.length : (run.depotStanding == null ? 1 : run.depotStanding), lost: !!(H && !H.bodies[0].alive), warOver: !!run.gameOver };
}

// hash(G): the world's hash and the run's, for twin checks.
export function hash(G) { return worldHash(G.world) + ":" + runHash(G.run); }
