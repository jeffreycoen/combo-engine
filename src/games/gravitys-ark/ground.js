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
import { makeSquad, SQUAD_SPECS, clearSlot } from "../../depot/squads.js";
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
  const site = { x: depotP.x, z: depotP.z };   // the homeland's centre for coldsnap's placement radius: the depot's spot until the hull lands, then the bridge
  world.slotTreesBlock = true;   // coldsnap's own switch: loose chunks and trees are ground too, so no slot or spawn ever lands a man inside a module
  const input = defaultTickInput();
  const townUV = war.town.map((b) => { const c = war.map.invW(b.x, b.z); return { id: b.id, x: c.u, z: c.v, marker: b.marker, get ruined() { return b.ruined; } }; });
  // the bell's context: its cues go to the page as sound events; the one save draw per bell stays coldsnap's own
  input.bellCtx = { cue, toast: (text) => say("toast", { text }), townUV, buildSnapshot: () => buildSnapshotOf(war), nextApcSeq: () => ++war.seq.apc, saveFront: () => { serializeRun(war); }, possessed: () => false };
  const placement = makePlacement({ world, run, view: {}, input, map: war.map, grid: war.grid, field: war.field, T: war.T, R: null, dev: false,
    toast: (text) => say("toast", { text }), cue, setHud: () => {}, nextApcSeq: () => ++war.seq.apc, depotP: site, recomputeFlow });
  // the build-line driver: her squad lays walls along a two-point line by coldsnap's own law, paid from the one purse
  const buildCtx = { objG, recomputeFlow, stampBag: (b, side) => stampBag(war.grid, b, side), setMines: () => {} };
  input.stepBuildLine = (sq) => stepBuildLine(world, war.grid, war.field, war.T, run, sq, buildCtx, (text) => say("toast", { text }), war.map);
  return { seed: groundSeed(seed, w), war, run, world, input, events, cues, placement, dials: d, scrapKgIn: scrapKg, her: null, hands: [], walker: null, stick: { f: 0, l: 0, h: null }, site, recomputeFlow };
}

// HULL_DIALS, the seam's numbers and the crash law, all PROPOSED. kgPerKg: a space
// kilogram lands as this many ground kilograms. pitch: the grid step in metres: 250
// times the mass is 6.3 times the length, so the seam's 1.7 m pitch lands as 10.7 m.
// unit: one of deadweight's drawing units on the ground, the pitch over the demo's cell
// of four, so every kind's footprint and height is the demo's own. lift: how far above
// the ground a module is set. crashStop: the crash's stop time; the arrival speed over
// it is the deceleration. slideFrac: how far a loose module slides, in metres per metre
// a second of arrival speed. moduleHp: a module's hit points. site: how far from the
// depot's spot the bridge lands, along the line to the map's centre snapped to the
// nearest axis; the hull's own gx axis runs on along that line, away from the depot,
// and its gy axis across it, so the whole hull stands beyond the bridge, clear of the depot.
export const HULL_DIALS = { kgPerKg: 250, unit: 2.675, pitch: 10.7, lift: 0.02, crashStop: 0.3, slideFrac: 0.6, moduleHp: 400, site: 26 };

// SHAPE: deadweight's silhouette per kind, half width along the ship's own gx, half depth
// along gy, and full height, in the demo's units, its lines 989 to 991; a strut is a beam
// along its connections, its lines 973 to 977; the mech bay is the ark's own, a cell wide and
// tall enough for the walker. PROPOSED at the ground's scale through HULL_DIALS.unit.
export const SHAPE = { bridge: [1.45, 1.45, 2.0], engine: [1.9, 1.6, 1.15], pod: [1.7, 1.7, 1.8], tank: [1.6, 1.35, 0.9], shield: [1.4, 1.4, 1.35], mount: [1.55, 1.3, 1.0], rcs: [1.15, 1.15, 1.05], rack: [1.7, 1.7, 1.5], grapple: [1.7, 1.7, 1.5], strut: [2.0, 0.6, 0.7], mechbay: [2.0, 2.0, 2.6] };

// shapeOf(m, list, axis, unit): a module's half sizes in the world: the demo's shape at the
// ground's scale, its gx side laid along the site line and its gy side across it; a strut
// turns to lie along its connections, and along the line when it has none.
export function shapeOf(m, list, axis, unit) {
  let [w, d, h] = SHAPE[m.t] || [1.7, 1.7, 1.5];
  if (m.t === "strut") {
    let along = list.some((o) => Math.abs(o.gx - m.gx) === 1 && o.gy === m.gy);
    if (!along && !list.some((o) => o.gx === m.gx && Math.abs(o.gy - m.gy) === 1)) along = true;
    if (!along) [w, d] = [d, w];
  }
  const a = w * unit, c = d * unit, hy = h * unit / 2;
  return axis.u.x !== 0 ? { hx: a, hz: c, hy } : { hx: c, hz: a, hy };
}

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
  // the site line: from the depot's spot toward the map's centre, snapped to the nearest axis; u runs on along it away from the depot, r across it
  const u = Math.abs(f.x) >= Math.abs(f.z) ? { x: -Math.sign(f.x) || -1, z: 0 } : { x: 0, z: -Math.sign(f.z) || -1 };
  const r = { x: -u.z, z: u.x };
  const site = { x: f.x + u.x * d.site, z: f.z + u.z * d.site };
  const slots = list.map((m) => ({ x: site.x + u.x * m.gx * d.pitch + r.x * m.gy * d.pitch, z: site.z + u.z * m.gx * d.pitch + r.z * m.gy * d.pitch }));
  const bodies = list.map((m, i) => {
    const loose = !keep.has(i);
    const x = slots[i].x + (loose ? u.x * slide : 0), z = slots[i].z + (loose ? u.z * slide : 0), sh = shapeOf(m, list, { u, r }, d.unit);
    const b = addBody(world, { kind: "chunk", team: 1, mass: MODULES[m.t].kg * d.kgPerKg, hx: sh.hx, hy: sh.hy, hz: sh.hz, x, y: war.field.heightAt(x, z) + sh.hy + d.lift, z, hp: d.moduleHp, friction: 0.65, restitution: 0.02 });
    b.sleeping = true; b.town = "hull"; b.module = m.t; b.maxHp = d.moduleHp; b.tint = loose ? "timber" : "wall";
    return b;
  });
  const welds = [];
  for (const w of held) if (keep.has(w.a) && keep.has(w.b)) welds.push({ a: w.a, b: w.b, weld: addWeld(world, bodies[w.a], bodies[w.b], w.strength * d.kgPerKg) });
  G.site.x = site.x; G.site.z = site.z;   // the bridge is the homeland's centre for coldsnap's placement radius
  G.hull = { list, builder: hull.builder, bodies, slots, welds, v, a, broken: [...broken], loose: list.map((m, i) => i).filter((i) => !keep.has(i)), dials: d, axis: { u, r }, site, walkerLost: !!hull.walkerLost, bay: -1, stamped: [] };
  stampHull(G);
  return G.hull;
}

// stampHull(G): the hull's footprints in coldsnap's grid: every cell whose centre lies under a
// living module is blocked, so guns, walls, and paths go around it; the old stamp is lifted
// first, the cells the ground itself blocks are never touched, and the paths recompute.
export function stampHull(G) {
  const H = G.hull, grid = G.war.grid;
  if (!H) return 0;
  for (const i of H.stamped) grid.cells[i].blocked = false;
  H.stamped = [];
  for (const b of H.bodies) {
    if (!b.alive) continue;
    const cs = [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz]) => grid.worldToGrid(b.pos.x + sx * b.hx, b.pos.z + sz * b.hz));
    const gx0 = Math.min(...cs.map((c) => c.gx)), gx1 = Math.max(...cs.map((c) => c.gx)), gz0 = Math.min(...cs.map((c) => c.gz)), gz1 = Math.max(...cs.map((c) => c.gz));
    for (let gz = gz0; gz <= gz1; gz++) for (let gx = gx0; gx <= gx1; gx++) {
      if (!grid.inBounds(gx, gz)) continue;
      const i = grid.idx(gx, gz), cell = grid.cells[i], p = grid.gridToWorld(gx, gz);
      if (cell.blocked || Math.abs(p.x - b.pos.x) > b.hx || Math.abs(p.z - b.pos.z) > b.hz) continue;
      cell.blocked = true; H.stamped.push(i);
    }
  }
  G.recomputeFlow();
  return H.stamped.length;
}

// HER: her row and her arms, installed into coldsnap's tables at the ground's boot so
// its copies stay verbatim; her sidearm is the hunter's, her body the one MAN row.
// reach: how close she must stand to a module to work on it; repairBase and
// repairPerM: the weld-back's seconds, plus seconds per metre the module slid;
// standOff: how far off the bridge's face she stands at the crash, across the site line, the hands behind her. All PROPOSED.
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
  const at = H ? H.slots[0] : { x: run.focus.x, z: run.focus.z }, r = H ? H.axis.r : { x: 0, z: 1 }, off = (H ? (r.x !== 0 ? H.bodies[0].hx : H.bodies[0].hz) : 0) + d.standOff;   // across the site line, on the bridge's free side, off its face
  const squad = makeSquad(run.nextSquadId++, "her", 1, at.x - r.x * off, at.z - r.z * off);
  spawnSquadMembers(world, squad); run.squads.push(squad);
  const names = (crew || []).map((h) => h.name), hands = [];
  for (let k = 0; k < names.length; k += 4) {
    const some = names.slice(k, k + 4);
    const o = off + 3 + 3 * (k / 4);
    const sq = makeSquad(run.nextSquadId++, "rifles", 1, at.x - r.x * o, at.z - r.z * o);
    spawnSquadMembers(world, sq, some.length); run.squads.push(sq);
    sq.memberIds.forEach((id, j) => { const u = world.byId.get(id); if (u) u.handName = some[j]; hands.push({ id, name: some[j], alive: true }); });
  }
  G.her = { squad, act: "hold", target: null, actT: 0, alive: true };
  G.hands = hands;
  return G.her;
}

// WALKER: hers, coldsnap's own mech at coldsnap's own scale, 5.4 m tall, two and a
// half troopers; it rides in the mech bay and lies wrecked at the bay's door at the
// crash until she repairs it. repair: her seconds at the wreck; s: the scale; door: how
// far off the bay's open face it lies and stands; room: the room the walker needs around
// its spot, coldsnap's own placement distance for a mech; standPad: how far past the room
// her stand is; reach: how far from the spot her seconds still run. PROPOSED.
export const WALKER = { s: 1, repair: 10, door: 4, room: 4.5, standPad: 0.5, reach: 10 };

// bayDoor(G): the bay's open side: the first of across, back across, on, and back on the
// site line with no module of the hull beside it, as a unit vector in the world.
function bayDoor(G) {
  const H = G.hull, b = H.list[H.bay], { u, r } = H.axis;
  for (const [dgx, dgy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
    if (H.list.some((m) => m.gx === b.gx + dgx && m.gy === b.gy + dgy)) continue;
    return { x: u.x * dgx + r.x * dgy, z: u.z * dgx + r.z * dgy };
  }
  return { x: r.x, z: r.z };
}

// walkerSpot(G): where the walker lies and stands: off the bay's open face, wherever the bay lies now.
export function walkerSpot(G) {
  const H = G.hull, bay = H.bodies[H.bay], s = bayDoor(G), k = (s.x !== 0 ? bay.hx : bay.hz) + WALKER.door;
  return { x: bay.pos.x + s.x * k, z: bay.pos.z + s.z * k };
}

// wreckWalker(G): the walker rides in the mech bay: with a bay aboard and the walker not
// lost, it lies wrecked at the bay's door; nothing stands until she repairs it. Without a
// bay, or with the walker lost on an earlier ground, there is no walker.
export function wreckWalker(G) {
  const H = G.hull, bay = H ? H.list.findIndex((m) => m.t === "mechbay") : -1;
  if (bay < 0 || H.walkerLost) { G.walker = null; return null; }
  H.bay = bay;
  G.walker = { mech: null, bay, spot: walkerSpot(G), wrecked: true, alive: false, possessed: false };
  return G.walker;
}

// inRoom(G, b): coldsnap's own room rule turned around: the body's box, grown by the room, holds the spot.
function inRoom(G, b) { const s = G.walker.spot; return Math.abs(s.x - b.pos.x) <= b.hx + WALKER.room && Math.abs(s.z - b.pos.z) <= b.hz + WALKER.room; }

// standOff(G, b): where a body of hers stands for the walker's repair: just outside the room on
// its own side of the spot, by coldsnap's clear-slot rule; if the clear point falls back inside
// the room, farther out along the same bearing, up to three tries.
export function standOff(G, b) {
  const s = G.walker.spot, dx = b.pos.x - s.x, dz = b.pos.z - s.z, l = Math.hypot(dx, dz);
  const ux = l > 1e-9 ? dx / l : 0, uz = l > 1e-9 ? dz / l : 1, m = Math.max(Math.abs(ux), Math.abs(uz));
  let p = null;
  for (const extra of [0, 1.5, 3]) {
    const k = (WALKER.room + b.hx + WALKER.standPad + extra) / m;
    p = clearSlot(G.world, s.x + ux * k, s.z + uz * k, b.hx + 0.35);
    if (!inRoom(G, { pos: p, hx: b.hx, hz: b.hz })) return p;
  }
  return p;
}

// clearRoom(G): everyone of hers still inside the walker's room, her or a hand, is moved to
// a stand just outside it before the walker is built, so no one is inside it when it stands.
export function clearRoom(G) {
  const moved = [];
  if (!G.walker) return moved;
  for (const b of G.world.bodies) {
    if (!b.alive || b.team !== 1 || b.kind !== "unit" || !inRoom(G, b)) continue;
    const p = standOff(G, b);
    b.pos.x = p.x; b.pos.z = p.z; b.pos.y = G.war.field.heightAt(p.x, p.z) + b.hy + 0.02;
    b.v.x = 0; b.v.y = 0; b.v.z = 0;
    moved.push(b);
  }
  return moved;
}

// raiseWalker(G): the repair's mechanism: the room cleared, then coldsnap's mech built at the wreck's spot on the player's side, hers.
export function raiseWalker(G) {
  const W = G.walker;
  if (!W || W.mech) return null;
  W.spot = walkerSpot(G);
  clearRoom(G);
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
    if (Math.hypot(W.spot.x - b.pos.x, W.spot.z - b.pos.z) <= WALKER.reach) {
      her.actT -= dt;
      if (her.actT <= 0) { raiseWalker(G); out.push({ k: "walkerUp", t: G.world.t }); rest(); }
    }
  }
  else if (her.act === "fix" && her.target != null) {
    const m = G.hull.bodies[her.target];
    if (!m.alive) rest();
    else if (boxDist(m, b) <= HER.reach) {
      her.actT -= dt;
      if (her.actT <= 0) { weldBack(G, her.target); out.push({ k: "repaired", t: G.world.t, module: G.hull.list[her.target].t }); rest(); }
    }
  } else if (her.act === "wall" && !her.squad._build) rest();
  for (const h of G.hands) { if (!h.alive) continue; const u = G.world.byId.get(h.id); if (!u || !u.alive) { h.alive = false; out.push({ k: "handDead", t: G.world.t, name: h.name }); } }
  return out;
}

// boxDist(m, b): how far body b stands off module m's faces, zero inside its box.
function boxDist(m, b) { return Math.hypot(Math.max(0, Math.abs(b.pos.x - m.pos.x) - m.hx), Math.max(0, Math.abs(b.pos.z - m.pos.z) - m.hz)); }

// faceOf(G, m, b): the point just off module m's face nearest body b, a body's width and a
// pad off the face, by coldsnap's clear-slot rule.
function faceOf(G, m, b) {
  const dx = b.pos.x - m.pos.x, dz = b.pos.z - m.pos.z, pad = b.hx + 0.6, cl = (v, h) => Math.max(-h, Math.min(h, v));
  const p = Math.abs(dx) / m.hx >= Math.abs(dz) / m.hz
    ? { x: m.pos.x + (dx < 0 ? -1 : 1) * (m.hx + pad), z: m.pos.z + cl(dz, m.hz) }
    : { x: m.pos.x + cl(dx, m.hx), z: m.pos.z + (dz < 0 ? -1 : 1) * (m.hz + pad) };
  return clearSlot(G.world, p.x, p.z, b.hx + 0.35);
}

// clearBox(G, m): everyone of hers inside module m's box, grown by a body's width and coldsnap's
// pad, is moved off its nearest face, so a module set back in its slot never stands on anyone.
export function clearBox(G, m) {
  const moved = [];
  for (const b of G.world.bodies) {
    if (!b.alive || b.team !== 1 || b.kind !== "unit") continue;
    if (Math.abs(b.pos.x - m.pos.x) > m.hx + b.hx + 0.35 || Math.abs(b.pos.z - m.pos.z) > m.hz + b.hz + 0.35) continue;
    const p = faceOf(G, m, b);
    b.pos.x = p.x; b.pos.z = p.z; b.pos.y = G.war.field.heightAt(p.x, p.z) + b.hy + 0.02;
    b.v.x = 0; b.v.y = 0; b.v.z = 0;
    moved.push(b);
  }
  return moved;
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
  b.pos.x = s.x; b.pos.z = s.z; b.pos.y = G.war.field.heightAt(s.x, s.z) + b.hy + d.lift;
  b.v.x = 0; b.v.y = 0; b.v.z = 0; b.w.x = 0; b.w.y = 0; b.w.z = 0; b.sleeping = true; b.tint = "wall";
  clearBox(G, b); stampHull(G);
  const j = joined(G);   // only a neighbour joined to the bridge takes a weld; a loose neighbour gets its own weld-back
  let n = 0;
  for (const w of H.builder.weldsOf(H.list)) {
    if (w.a !== i && w.b !== i) continue;
    const k = w.a === i ? w.b : w.a, o = H.bodies[k];
    if (!o.alive || !j.has(k)) continue;
    if (H.welds.some((x) => ((x.a === w.a && x.b === w.b) || (x.a === w.b && x.b === w.a)) && !x.weld.broken)) continue;
    H.welds.push({ a: w.a, b: w.b, weld: addWeld(G.world, H.bodies[w.a], H.bodies[w.b], w.strength * d.kgPerKg) }); n++;
  }
  return n;
}

// order(G, kind, x, z, which): the player's orders. "gun" places one of coldsnap's
// towers at the ground point by its build law: held ground, a free cell, the live
// price, one purchase a second. "takeoff" hands the purse back as kilograms, names
// the modules lost and a walker down as lost, and refuses while a living module is
// loose or the bridge is dead.
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
    const fp = faceOf(G, m, b);
    sq.order = "move"; sq.dest = { x: fp.x, z: fp.z }; sq._route = null; sq._routeDest = null; sq._build = null; sq.holdFire = true;
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
  if (kind === "repairWalker") {   // she raises the walker: she walks to a stand just outside its room and her seconds run down there
    const b = herBody(G);
    if (!b) return { ok: false, reason: "she is dead" };
    if (!G.walker) return { ok: false, reason: "no walker here" };
    if (walkerAlive(G)) return { ok: false, reason: "the walker stands" };
    if (!G.hull.bodies[G.walker.bay].alive) return { ok: false, reason: "the bay is destroyed" };
    if (G.walker.possessed) leaveWalker(G);
    G.walker.spot = walkerSpot(G);
    const sq = G.her.squad;
    const st = standOff(G, b);
    sq.order = "move"; sq.dest = { x: st.x, z: st.z }; sq._route = null; sq._routeDest = null; sq._build = null; sq.holdFire = true;
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
    const out = { ok: true, scrapKg: run.resources * G.dials.kgPerScrap, lost: [], keptList: null, abandoned: false, walkerLost: !!(G.walker && G.walker.mech && !G.walker.mech.hull.alive) };
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
