// GRAVITY'S ARK — the page. Phase 0.0.105 of batch-ark-1: the galaxy on the
// warped grid, the worlds in their pits, the ship, the clocks, LAND, TAKE
// OFF, and a burn. The page binds the events and draws; every law lives in
// src/games/gravitys-ark/ and the engine's modules. A seed in the address
// (?seed=N) makes the same galaxy for anyone.
import { makeGalaxy } from "../../src/games/gravitys-ark/galaxy.js";
import { makeRoad, dvAvailable } from "../../src/games/gravitys-ark/road.js";
import { makeRender2d } from "../../src/modules/render2d/render2d.js";
import { makeGestures } from "../../src/modules/pagekit/pagekit.js";
import { makeStations, makePurse, listings, hire, dock, buy, sell, makeHull, derive, STARTER_HULL, stepStations, carryPeople, deliverPeople } from "../../src/games/gravitys-ark/stations.js";
import { rollPerson } from "../../src/games/gravitys-ark/galaxy.js";
import { simStream } from "../../src/modules/determinism/determinism.js";
import { MODULES } from "../../src/games/gravitys-ark/stations.js";
import { WRECK_DIALS, ROPE, shell, shellOnHull, shedToWrecks, makeField, stepWrecks, makeGrappler, cast, stepGrappler, take } from "../../src/games/gravitys-ark/wrecks.js";
import { PRICE_DIALS, makePirates, stepPirates, pay, cargoValue, hireOut, herReturns } from "../../src/games/gravitys-ark/price.js";
import { listingsFor } from "../../src/games/gravitys-ark/price.js";
import { makeGate, atGate, need, fixGate, payToll, sellToFitters, pass as passGate, respawn, GATE_DIALS } from "../../src/games/gravitys-ark/gate.js";
import { makeLog, logFromJSON, buildCard, ARK_LINES } from "../../src/games/gravitys-ark/card.js";
import { makeHold, order as holdOrder, tick as holdTick, summary as holdSummary } from "../../src/games/gravitys-ark/hold.js";
import { wireSeed } from "./seed.js";

const q = new URLSearchParams(location.search);
const seed = q.has("seed") ? (parseInt(q.get("seed"), 10) >>> 0) : ((Math.random() * 0xffffffff) >>> 0);
const galaxy = makeGalaxy(seed);
const road = makeRoad(galaxy);
const ship = road.ship, state = road.state, star = galaxy.star;
wireSeed(seed, { buttons: ["seedB", "seedCard"], log: (line) => state.events.push({ k: line, t: state.t }) });   // the seed export, one button on every screen: the fixed cluster and the card
// phase 0.0.106's page step: the stations, the purse, the hull, the crew
const S = makeStations(galaxy); S.rollPerson = rollPerson;
const purse = makePurse(20000, 0), hull = makeHull(STARTER_HULL), crew = [], nameRng = simStream((seed + 1) >>> 0);
const PERSON_KG = 80;
function hullMass() { return derive(hull).m + hull.scrap + hull.spares.reduce((a, k) => a + MODULES[k].kg, 0) + PERSON_KG * (crew.length + hull.cargo.people); }
// phases 0.0.107 and 0.0.108's page step: the wreck field and the grappler, the pirates and her price
const fieldRng = simStream((seed + 2) >>> 0), pirateRng = simStream((seed + 3) >>> 0);
let wrecks = [], collapsed = false, hullHp = 1000;
const gr = makeGrappler(ship), P = makePirates(galaxy, pirateRng), her = { taken: false, away: null, sold: false };
function ringOf() { const n = road.nearest(); return n ? n.w.ring : 2; }
function onCollapse() {
  collapsed = true; const body = { x: ship.x, y: ship.y, vx: ship.vx, vy: ship.vy, mass: ship.dry + ship.fuel };
  if (ship.landed === null) { shell([body], star, WRECK_DIALS); ship.vx = body.vx; ship.vy = body.vy; }
  const r = shellOnHull(hull, star, ship, WRECK_DIALS);
  if (r.shed.length) { wrecks.push(...shedToWrecks(r.shed, ship, fieldRng)); state.events.push({ k: "shell shed " + r.shed.map((m) => m.t).join(" "), t: state.t }); }
  wrecks.push(...makeField(star, fieldRng, WRECK_DIALS));
}
// phase 0.0.109's page step: the gate, the Fitters, the endings, the respawn, the log, the card
const gs = makeGate(galaxy); let ending = null, seenEvents = 0;
const LOG_KEY = "gravitys-ark-log-" + seed;
let log = makeLog(); try { const saved = localStorage.getItem(LOG_KEY); if (saved) log = logFromJSON(saved); } catch (e) { /* no storage: the log lives for the session */ }
function logAdd(type, data) { log.add(type, state.t, data); try { localStorage.setItem(LOG_KEY, log.toJSON()); } catch (e) { /* no storage */ } }
const ROAD_TYPES = { land: "land", crash: "crash", takeoff: "takeoff", collapse: "collapse", swallow: "swallow", fell: "fell", death: "death" };
function logRoadEvents() { for (; seenEvents < state.events.length; seenEvents++) { const e = state.events[seenEvents]; const type = ROAD_TYPES[e.k]; if (type) logAdd(type, { i: e.i, id: e.i !== undefined ? galaxy.worlds[e.i].id : undefined, v: e.v }); } }
const PAGE_LINES = { ...ARK_LINES, land: (e) => `landed on ${e.id} at ${Math.round(e.v)} m/s`, crash: (e) => `crashed on ${e.id} at ${Math.round(e.v)} m/s`, takeoff: (e) => `took off from ${e.id}`, swallow: (e) => `the hole took ${e.id}` };
function showCard(end) { ending = end; const c = buildCard(log, galaxy, hull, crew, end); $("cardBody").textContent = [c.ending.toUpperCase(), "", "hull: " + c.manifest.hull.join(" "), "hands: " + (c.manifest.hands.join(", ") || "none"), "scrap " + fmt(c.manifest.scrap) + " kg, spares " + (c.manifest.spares.join(" ") || "none") + ", people " + c.manifest.people, "the hole ate: " + (c.eaten.join(" ") || "nothing"), "", "the galaxy named you " + c.name, "", ...log.lines(PAGE_LINES).slice(-12)].join("\n"); $("card").style.display = "block"; }
// phase 0.0.110's page step: the hold, the ground frames, on the same canvas
const holdRng = simStream((seed + 4) >>> 0), OPENING_CRASH = 30;   // the opening: the hull down at 30 m/s on the plague world, the engine off its weld, PROPOSED
let hold = null, view = "space", fieldTap = null;
function enterHold(v) { hold = makeHold(hull, crew, v, holdRng); view = "hold"; fieldTap = null; state.events.push({ k: "on the ground at " + fmt(v, 1) + " m/s", t: state.t }); }
function leaveHold() { view = "space"; hold = null; }
function lockedPirate() { return P.list.find((p) => p.alive && p.demand) || null; }
function nearestWreck() { let best = null, bd = ROPE.RANGE; for (const w of wrecks) { if (w.taken) continue; const d = Math.hypot(w.x - ship.x, w.y - ship.y); if (d < bd) { bd = d; best = w; } } return best; }
function stationHere() { return ship.landed !== null ? galaxy.worlds[ship.landed].id : null; }
function openContractHere(sid) { return S.book.list.find((c) => c.open && c.part === "people" && c.at === sid) || null; }

const cv = document.getElementById("cv"), ctx = cv.getContext("2d");
const $ = (id) => document.getElementById(id);
const DPR = Math.min(2, window.devicePixelRatio || 1);
const ZOOMS = [0.0015, 0.003, 0.006, 0.012, 0.024];
let zi = 1, paused = false, burning = false, aimMode = "gate", aimDrag = [1, 0], dragStart = null;
const C30 = Math.cos(Math.PI / 6), S30 = 0.5;

// the grid's wells: the same bodies the road flies, with draw radii the funnels can be seen by
const R = makeRender2d({ ctx, wells: [], deep: 1300, gridR: 44, gridSp: 5000, cam: { x: ship.x, y: ship.y, z: ZOOMS[zi], rot: 0 },
  pal: { net: "80,96,122", grav: "62,100,232" } });
function gridWells() {
  const list = [{ x: star.x, y: star.y, mu: state.hole.mu, r: 20000 + (state.hole.born ? state.hole.edge : 0), name: "sun" }];
  for (const w of galaxy.worlds) if (w.state === "alive") list.push({ x: w.x, y: w.y, mu: w.mu, r: 8000, name: "world" });
  return list;
}

const CLIMATE_COL = { SNOW: "#dfe8f2", ASH: "#8d8a86", MUD: "#8a6a3f", ROCK: "#a09484", WOOD: "#4f8a4a" };
const STAR_COL = ["#fff6dc", "#ffd27a", "#ff9a4a", "#ff5a3a", "#c8302a"];   // whiter to redder, one step per takeoff
function W() { return cv.width / DPR; } function H() { return cv.height / DPR; }
function resize() { cv.width = Math.floor(innerWidth * DPR); cv.height = Math.floor(innerHeight * DPR); ctx.setTransform(DPR, 0, 0, DPR, 0, 0); R.resize(W(), H()); }
addEventListener("resize", resize); resize();

function aimVector() {
  if (aimMode === "gate") { const dx = galaxy.gate.x - ship.x, dy = galaxy.gate.y - ship.y, l = Math.hypot(dx, dy) || 1; return [dx / l, dy / l]; }
  return aimDrag;
}
// a screen drag to a world direction: the iso projection's own axes, inverted
function screenToWorldDir(sx, sy) {
  const z = R.cam.z, a = sx / (C30 * z), b = sy / (S30 * z);   // a = x - y, b = x + y
  const x = (a + b) / 2, y = (b - a) / 2, l = Math.hypot(x, y) || 1;
  return [x / l, y / l];
}

function drawDisc(px, py, r, fill, stroke) {
  ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke(); }
}
function label(px, py, text, col) { ctx.fillStyle = col || "rgba(233,237,242,.8)"; ctx.font = "500 10px ui-monospace, monospace"; ctx.textAlign = "center"; ctx.fillText(text, px, py); }

function draw() {
  if (view === "hold" && hold) { drawHold(); return; }
  const z = R.cam.z;
  ctx.fillStyle = "#07090d"; ctx.fillRect(0, 0, W(), H());
  R.wells = gridWells(); R.cam.x = ship.x; R.cam.y = ship.y; R.frame(W(), H());
  R.drawGrid();
  // the lanes
  ctx.strokeStyle = "rgba(233,237,242,.10)"; ctx.lineWidth = 1;
  for (const [a, b] of galaxy.lanes) { const A = galaxy.worlds[a], B = galaxy.worlds[b]; const p = R.project(A.x, A.y, 0), r2 = R.project(B.x, B.y, 0);
    ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(r2[0], r2[1]); ctx.stroke(); }
  // the pit: the star until the collapse, then the hole and its edge
  const sp = R.project(star.x, star.y, 0);
  if (!state.hole.born) drawDisc(sp[0], sp[1], Math.max(6, star.r * z), STAR_COL[Math.min(4, state.takeoffs)], null);
  else { drawDisc(sp[0], sp[1], Math.max(5, star.r * z), "#000", "rgba(233,237,242,.5)");
    ctx.strokeStyle = "rgba(200,48,42,.55)"; ctx.setLineDash([4, 6]); ctx.beginPath();
    for (let k = 0; k <= 72; k++) { const a = k / 72 * Math.PI * 2, e = state.hole.edge; const p = R.project(star.x + Math.cos(a) * e, star.y + Math.sin(a) * e, 0); k ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); }
    ctx.stroke(); ctx.setLineDash([]); }
  // the worlds in their pits, the stations, the gate
  const edge = state.hole.born ? road.edgeFor({ dry: ship.dry, fuel: ship.fuel }).index : -1;
  for (const w of galaxy.worlds) {
    const p = R.project(w.x, w.y, 0), gone = w.state !== "alive";
    drawDisc(p[0], p[1], Math.max(4, w.r * z), gone ? "#1a1c22" : CLIMATE_COL[w.climate], gone ? "rgba(233,237,242,.15)" : "rgba(233,237,242,.35)");
    if (!gone) drawDisc(p[0], p[1], Math.max(4, w.r * z) + 4, null, "rgba(233,178,92,.45)");
    if (z >= 0.003) label(p[0], p[1] + Math.max(4, w.r * z) + 14, (gone ? "gone " : "") + w.id + " " + w.climate.toLowerCase() + (w.holder ? " " + w.holder : ""), gone ? "rgba(233,237,242,.35)" : undefined);
    if (w.i === edge) label(p[0], p[1] - Math.max(4, w.r * z) - 8, "EDGE", "#ff5a3a");
  }
  const gp = R.project(galaxy.gate.x, galaxy.gate.y, 0);
  ctx.strokeStyle = "#a9e0ac"; ctx.lineWidth = 1.5; ctx.strokeRect(gp[0] - 7, gp[1] - 7, 14, 14); label(gp[0], gp[1] + 20, "GATE", "#a9e0ac");
  // the ship and its aim
  const s = R.project(ship.x, ship.y, 0), v = Math.hypot(ship.vx, ship.vy);
  const hd = v > 1e-6 ? [ship.vx / v, ship.vy / v] : aimVector();
  const h1 = R.project(ship.x + hd[0] * 9 / z, ship.y + hd[1] * 9 / z, 0), h2 = R.project(ship.x - hd[1] * 5 / z, ship.y + hd[0] * 5 / z, 0), h3 = R.project(ship.x + hd[1] * 5 / z, ship.y - hd[0] * 5 / z, 0);
  ctx.fillStyle = ship.alive ? "#e9edf2" : "#c8302a"; ctx.beginPath(); ctx.moveTo(h1[0], h1[1]); ctx.lineTo(h2[0], h2[1]); ctx.lineTo(h3[0], h3[1]); ctx.closePath(); ctx.fill();
  const av = aimVector(), ap = R.project(ship.x + av[0] * 40 / z, ship.y + av[1] * 40 / z, 0);
  ctx.strokeStyle = burning ? "#e9b25c" : "rgba(233,178,92,.5)"; ctx.beginPath(); ctx.moveTo(s[0], s[1]); ctx.lineTo(ap[0], ap[1]); ctx.stroke();
  drawWrecks();
}

// the panes: the ship's numbers, the clocks, the log
function fmt(n, d = 0) { return Number(n).toLocaleString("en-US", { maximumFractionDigits: d, minimumFractionDigits: d }); }
function hud() {
  const w = ship.landed !== null ? galaxy.worlds[ship.landed] : null;
  $("ship").textContent = [
    "seed " + seed,
    "fuel " + fmt(ship.fuel) + " kg   mass " + fmt(ship.dry + ship.fuel) + " kg   credits " + fmt(purse.credits) + (purse.debt ? "   debt " + fmt(purse.debt) : ""),
    "dv " + fmt(dvAvailable(ship, road.dials.ve)) + " m/s   speed " + fmt(Math.hypot(ship.vx, ship.vy), 1) + " m/s",
    "hull " + fmt(hullHp) + "   scrap " + fmt(hull.scrap) + " kg   spares " + (hull.spares.length ? hull.spares.join(" ") : "none") + (her.taken ? "   SHE IS TAKEN" : her.away ? "   she is away" : ""),
    (() => { const p = lockedPirate(); return p ? "LOCK: they want " + p.demand.takes + " for ¢" + fmt(p.demand.demand) : ""; })(),
    w ? "landed " + w.id + " " + w.climate.toLowerCase() + (w.holder ? " " + w.holder : "") : (ship.alive ? "in flight" : "SHIP LOST"),
  ].join("\n");
  const lines = ["t " + fmt(state.t, 1) + " s"];
  if (state.hole.born) {
    const sch = road.schedule(), next = sch[0];
    lines.push("edge " + fmt(state.hole.edge) + " m");
    if (next) lines.push("next " + galaxy.worlds[next.i].id + " in " + fmt(Math.max(0, next.after - (state.t - collapseT)), 0) + " s");
    const e = road.edgeFor({ dry: ship.dry, fuel: ship.fuel });
    lines.push(e.index < galaxy.n ? "your edge " + galaxy.worlds[e.index].id : "no world you can leave");
  }
  $("clocks").textContent = lines.join("\n");
  $("log").textContent = state.events.slice(-6).map((e) => "t=" + fmt(e.t, 1) + " " + e.k + (e.i !== undefined ? " " + galaxy.worlds[e.i].id : "") + (e.v !== undefined ? " " + fmt(e.v, 1) + " m/s" : "")).join("\n");
  $("land").disabled = ship.landed !== null || !ship.alive; $("takeoff").disabled = ship.landed === null || !ship.alive; $("burn").disabled = ship.landed !== null || !ship.alive;
  $("castB").disabled = ship.landed !== null || !!gr.g || !ship.alive; $("payB").disabled = !lockedPirate(); $("hireOut").disabled = ship.landed === null || !!her.away || her.taken;
  const inHold = view === "hold" && hold; $("btns").style.display = inHold ? "none" : "grid"; $("holdBtns").style.display = inHold ? "grid" : "none"; if (inHold) { holdPane(); $("dock").style.display = "none"; }
  $("burn").classList.toggle("on", burning); $("aim").textContent = aimMode === "gate" ? "AIM: GATE" : "AIM: DRAG"; $("pause").classList.toggle("on", paused);
  if (!ship.alive && !ending && $("card").style.display !== "block") { $("cardBody").textContent = "The ship is lost at t " + fmt(state.t, 1) + " s, " + fmt(state.hole.swallowed.length) + " worlds eaten. WAKE at a station still ahead of the edge, in a starter hull with " + GATE_DIALS.mercyFuel + " kg of fuel, in debt."; $("wake").style.display = "inline-block"; $("card").style.display = "block"; }
}
let collapseT = 0;

// the controls: buttons for the phone, keys for the desktop, a drag for the aim
$("land").onclick = () => { const r = road.land(); if (r.ok) { if (r.crash) { state.events.push({ k: "crash-load " + fmt(r.load, 1), t: state.t }); enterHold(r.load); } const due = dock(S, purse, crew, state.t); state.events.push({ k: "dock wages " + fmt(due), t: state.t }); logAdd("dock", { due }); } };
$("takeoff").onclick = () => { const r = road.takeoff(); if (r.ok && r.collapse) collapseT = state.t; };
$("burn").onpointerdown = (e) => { burning = true; e.preventDefault(); };
addEventListener("pointerup", () => { burning = false; });
$("aim").onclick = () => { aimMode = aimMode === "gate" ? "drag" : "gate"; };
$("zoomIn").onclick = () => { zi = Math.min(ZOOMS.length - 1, zi + 1); R.cam.z = ZOOMS[zi]; };
$("zoomOut").onclick = () => { zi = Math.max(0, zi - 1); R.cam.z = ZOOMS[zi]; };
$("pause").onclick = () => { paused = !paused; };
$("again").onclick = () => { location.search = "?seed=" + ((Math.random() * 0xffffffff) >>> 0); };
cv.addEventListener("pointerdown", (e) => { dragStart = [e.clientX, e.clientY]; });
cv.addEventListener("pointermove", (e) => { if (!dragStart) return; const dx = e.clientX - dragStart[0], dy = e.clientY - dragStart[1];
  if (Math.hypot(dx, dy) > 12) { aimDrag = screenToWorldDir(dx, dy); aimMode = "drag"; } });
cv.addEventListener("pointerup", (e) => { if (dragStart && view === "hold" && Math.hypot(e.clientX - dragStart[0], e.clientY - dragStart[1]) < 12) fieldTap = { x: (e.clientX - W() / 2) / FIELD_PX, y: (e.clientY - H() / 2) / FIELD_PX }; dragStart = null; });
makeGestures(cv, { pinch: (k) => { R.cam.z = Math.max(ZOOMS[0], Math.min(ZOOMS[ZOOMS.length - 1], R.cam.z * (k || 1))); } });
addEventListener("keydown", (e) => {
  const k = e.key;
  if (k === "ArrowRight" || k === "d") { aimDrag = [1, 0]; aimMode = "drag"; } if (k === "ArrowLeft" || k === "a") { aimDrag = [-1, 0]; aimMode = "drag"; }
  if (k === "ArrowUp" || k === "w") { aimDrag = [0, -1]; aimMode = "drag"; } if (k === "ArrowDown" || k === "s") { aimDrag = [0, 1]; aimMode = "drag"; }
  if (k === " ") { burning = true; e.preventDefault(); } if (k === "l") $("land").onclick(); if (k === "t") $("takeoff").onclick(); if (k === "p") paused = !paused; if (k === "g") aimMode = "gate";
});
addEventListener("keyup", (e) => { if (e.key === " ") burning = false; });

// the loop: a fixed step of 1/60 with a clamped catch-up, then the draw
const DT = 1 / 60; let last = performance.now(), acc = 0;
function frame(now) {
  acc += Math.min(0.05, (now - last) / 1000); last = now;
  while (acc >= DT) { if (!paused && ship.alive) { if (burning) { const a = aimVector(); road.burn(a[0], a[1], DT); } const before = ship.landed; road.tick(DT); if (before === null && ship.landed !== null) { const due = dock(S, purse, crew, state.t); state.events.push({ k: "dock wages " + fmt(due), t: state.t }); logAdd("dock", { due }); const crashEv = state.events.find((e) => e.k === "crash" && e.t === state.t); if (crashEv) enterHold(crashEv.v); }
      if (view === "hold" && hold) holdStep(); stepStations(S, DT); ship.dry = hullMass();
      if (state.hole.born && !collapsed) onCollapse();
      stepWrecks(wrecks, road.wells(), DT);
      const got = stepGrappler(gr, ship, ship.dry + ship.fuel, road.wells(), DT, WRECK_DIALS); if (got && got.taken) { const kind = take(hull, purse, got.taken); state.events.push({ k: "took " + kind + " " + fmt(got.taken.mass) + " kg", t: state.t }); }
      for (const ev of stepPirates(P, ship, ringOf(), cargoValue(hull, 2), DT)) { if (ev.k === "lock") { state.events.push({ k: "LOCK: they want " + ev.demand.takes + " (¢" + fmt(ev.demand.demand) + ")", t: state.t }); logAdd("lock", { takes: ev.demand.takes }); } if (ev.k === "shot") { hullHp -= ev.damage; state.events.push({ k: "hit for " + ev.damage, t: state.t }); logAdd("shot", { damage: ev.damage }); if (hullHp <= 0 && ship.alive) { ship.alive = false; state.events.push({ k: "death", t: state.t, v: 0 }); } } if (ev.k === "outrun") state.events.push({ k: "outran the lock", t: state.t }); }
      const pay0 = herReturns(S.stations, her, purse, state.t, S.book.dials); if (pay0) { state.events.push({ k: "she is back, paid " + fmt(pay0), t: state.t }); logAdd("hireout", { pay: pay0 }); }
      if (!gs.fixed && atGate(ship, galaxy, gs.dials)) { const was = gs.work; fixGate(gs, hull, her, DT); if (gs.fixed) { state.events.push({ k: "she fixed the gate", t: state.t }); logAdd("fix", {}); } else if (was === gs.work && ship.landed === null) { /* she is away or taken: the bill does not move */ } }
      logRoadEvents(); } acc -= DT; }
  draw(); hud(); dockPane(); gatePane();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// the dock pane: the station's listings and the purse, live only when landed
function dockPane() {
  const sid = stationHere();
  $("dock").style.display = sid && view !== "hold" ? "block" : "none";
  if (!sid || view === "hold") return;
  const st = S.stations[sid], L = listings(S, sid), ct = openContractHere(sid), cap = derive(hull).fuelCap;
  $("dockBody").textContent = [
    sid + " station, " + st.faction,
    "credits " + fmt(purse.credits) + (purse.debt ? "   debt " + fmt(purse.debt) : ""),
    "scrap ¢" + fmt(L.scrap) + "/kg   fuel ¢" + fmt(L.fuel) + "/kg   hand ¢" + fmt(L.hands),
    "hull scrap " + fmt(hull.scrap) + " kg   tank " + fmt(ship.fuel) + "/" + fmt(cap) + " kg",
    "crew " + (crew.length ? crew.map((h) => h.name).join(", ") : "none") + "   carrying " + hull.cargo.people + " people",
    "people here " + st.parts.people.q + (ct ? "   contract: bring " + ct.n + " for ¢" + fmt(ct.pay) : ""),
  ].join("\n");
  $("buyFuel").disabled = ship.fuel >= cap; $("hireHand").disabled = st.parts.people.q <= 1; $("takePeople").disabled = st.parts.people.q <= 1;
  $("deliver").disabled = !(ct && hull.cargo.people >= ct.n); $("sellScrap").disabled = hull.scrap <= 0;
}
$("buyFuel").onclick = () => { const sid = stationHere(); if (!sid) return; const n = Math.min(500, Math.max(0, Math.floor(derive(hull).fuelCap - ship.fuel))); const cost = n > 0 ? buy(S, sid, "fuel", n, purse) : null; if (cost !== null) { ship.fuel += n; state.events.push({ k: "fuel +" + n + " kg for " + fmt(cost), t: state.t }); logAdd("buy", { n, part: "fuel", cost }); } };
$("buyScrap").onclick = () => { const sid = stationHere(); if (!sid) return; const cost = buy(S, sid, "scrap", 500, purse); if (cost !== null) { hull.scrap += 500; state.events.push({ k: "scrap +500 kg for " + fmt(cost), t: state.t }); logAdd("buy", { n: 500, part: "scrap", cost }); } };
$("sellScrap").onclick = () => { const sid = stationHere(); if (!sid || hull.scrap <= 0) return; const n = Math.floor(hull.scrap); const out = sell(S, sid, "scrap", n, purse); if (out !== null) { hull.scrap -= n; state.events.push({ k: "sold " + n + " kg scrap for " + fmt(out), t: state.t }); logAdd("sell", { n, part: "scrap", out }); } };
$("hireHand").onclick = () => { const sid = stationHere(); if (!sid) return; const h = hire(S, sid, purse, nameRng, state.t); if (h) { crew.push(h); state.events.push({ k: "hired " + h.name, t: state.t }); logAdd("hire", { name: h.name }); } };
$("takePeople").onclick = () => { const sid = stationHere(); if (!sid) return; const cost = carryPeople(S, sid, hull, purse, 1); if (cost !== null) state.events.push({ k: "took 1 person aboard for " + fmt(cost), t: state.t }); };
$("deliver").onclick = () => { const sid = stationHere(); if (!sid) return; const ct = openContractHere(sid); if (!ct) return; const pay = deliverPeople(S, ct, hull, purse); if (pay) state.events.push({ k: "delivered people for " + fmt(pay), t: state.t }); };

// the wreck field, the rope, and the pirates on the canvas; the cast, the pay, the hire-out
const WRECK_COL = { scrap: "#9aa3ad", crate: "#e9b25c", module: "#7fd1e0", hull: "#5c6470" };
function drawWrecks() {
  const z = R.cam.z;
  for (const w of wrecks) { if (w.taken) continue; const p = R.project(w.x, w.y, 0); ctx.fillStyle = WRECK_COL[w.kind] || "#fff"; ctx.fillRect(p[0] - 2, p[1] - 2, 4, 4); }
  if (gr.g) { const s = R.project(ship.x, ship.y, 0), h = R.project(gr.g.x, gr.g.y, 0); ctx.strokeStyle = "#e9edf2"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(s[0], s[1]); ctx.lineTo(h[0], h[1]); ctx.stroke(); }
  for (const p of P.list) { if (!p.alive) continue; const q = R.project(p.x, p.y, 0); ctx.fillStyle = "#c8302a"; ctx.beginPath(); ctx.moveTo(q[0], q[1] - 5); ctx.lineTo(q[0] - 4, q[1] + 4); ctx.lineTo(q[0] + 4, q[1] + 4); ctx.closePath(); ctx.fill();
    if (p.demand) { const s = R.project(ship.x, ship.y, 0); ctx.strokeStyle = "#c8302a"; ctx.beginPath(); ctx.arc(s[0], s[1], 14, 0, Math.PI * 2); ctx.stroke(); } }
  void z;
}
$("castB").onclick = () => { if (ship.landed !== null || gr.g) return; const w = nearestWreck(); if (!w) { state.events.push({ k: "no wreck within " + ROPE.RANGE + " m", t: state.t }); return; } cast(gr, ship, ship.dry + ship.fuel, w, WRECK_DIALS); state.events.push({ k: "cast at " + w.kind, t: state.t }); };
$("payB").onclick = () => { const p = lockedPirate(); if (!p) return; const takes = pay(P, p, hull, her); state.events.push({ k: "paid with " + takes, t: state.t }); logAdd("pay", { takes }); };
$("hireOut").onclick = () => { const sid = stationHere(); if (!sid) return; const w = galaxy.worlds[ship.landed]; if (S.stations[sid].faction !== "charter") { state.events.push({ k: "only the Charter hires her out", t: state.t }); return; } const ct = hireOut(S.book, S.stations, sid, { x: w.x, y: w.y }, state.hole, her, state.t, PRICE_DIALS); if (ct) state.events.push({ k: "she went to work, escrow " + fmt(ct.escrow) + " for " + PRICE_DIALS.hireDuration + " s", t: state.t }); };

// the gate pane, live within the gate's reach; the Fitters' buttons; passing; waking
function gatePane() {
  const near = ship.alive && atGate(ship, galaxy, gs.dials);
  $("gatePane").style.display = near ? "block" : "none";
  if (!near) return;
  const n = need(gs), fit = gs.fitters.credits, herBid = listingsFor(ringOf(), cargoValue(hull, 2)).fitters.her;
  $("gateBody").textContent = [
    "THE GATE " + (gs.fixed ? "open" : "shut") + (gs.tolled ? ", toll paid" : ", toll ¢" + fmt(gs.toll)),
    gs.fixed ? "" : "her bill: " + fmt(n.time) + " s, " + fmt(n.scrap) + " kg scrap, " + n.modules + " modules" + (her.taken ? "  (she is taken)" : her.away ? "  (she is away)" : her.sold ? "  (she is sold)" : ""),
    "the Fitters hold ¢" + fmt(fit) + "; they pay " + Math.round(gs.dials.fittersCut * 100) + "% of the listing; for her ¢" + fmt(herBid),
    "credits " + fmt(purse.credits) + "   hull scrap " + fmt(hull.scrap) + " kg   spares " + (hull.spares.join(" ") || "none") + "   people " + hull.cargo.people,
  ].join("\n");
  $("tollB").disabled = gs.tolled || purse.credits < gs.toll; $("passB").disabled = !(gs.fixed && gs.tolled); $("sellSpare").disabled = !hull.spares.length; $("sellScrapF").disabled = hull.scrap <= 0; $("sellPeople").disabled = hull.cargo.people <= 0; $("sellHer").disabled = her.sold || her.taken || her.away;
}
$("tollB").onclick = () => { const t = payToll(gs, purse); if (t) { state.events.push({ k: "paid the toll " + fmt(t), t: state.t }); logAdd("toll", { toll: t }); } };
$("passB").onclick = () => { const end = passGate(gs, ship, galaxy, her); if (end) { logAdd("pass", { ending: end }); showCard(end); } };
$("sellSpare").onclick = () => { const k = hull.spares[0]; const p = sellToFitters(gs, hull, purse, { kind: "spare", k }); if (p) { state.events.push({ k: "sold " + k + " to the Fitters for " + fmt(p), t: state.t }); logAdd("sold", { kind: k, price: p }); } };
$("sellScrapF").onclick = () => { const kg = Math.floor(hull.scrap); const p = sellToFitters(gs, hull, purse, { kind: "scrap", kg }); if (p) { state.events.push({ k: "sold " + kg + " kg scrap to the Fitters for " + fmt(p), t: state.t }); logAdd("sold", { kind: "scrap", price: p }); } };
$("sellPeople").onclick = () => { const n = hull.cargo.people; const p = sellToFitters(gs, hull, purse, { kind: "people", n }); if (p) { state.events.push({ k: "sold " + n + " people to the Fitters for " + fmt(p), t: state.t }); logAdd("sold", { kind: "people", price: p }); } };
$("sellHer").onclick = () => { const price = listingsFor(ringOf(), cargoValue(hull, 2)).fitters.her; const p = sellToFitters(gs, hull, purse, { kind: "her", price }); if (p) { her.sold = true; state.events.push({ k: "sold her to the Fitters for " + fmt(p), t: state.t }); logAdd("sold", { kind: "her", price: p }); } };
$("wake").onclick = () => { const r = respawn(galaxy, ship, state, hull, purse, gs.dials); $("wake").style.display = "none"; if (r.ending) { logAdd("pass", { ending: r.ending }); showCard(r.ending); return; } hullHp = 1000; logAdd("respawn", { world: galaxy.worlds[r.world].id, debt: r.debt }); state.events.push({ k: "woke at " + galaxy.worlds[r.world].id + " in debt " + fmt(r.debt), t: state.t }); $("card").style.display = "none"; };

// the hold's screen: a flat field top-down, four pixels a metre, the bridge at the centre
const FIELD_PX = 4;
function fieldPt(x, y) { return [W() / 2 + x * FIELD_PX, H() / 2 + y * FIELD_PX]; }
function holdStep() {
  for (const e of holdTick(hold, DT)) {
    if (e.k === "wave") state.events.push({ k: "wave " + e.n + ": " + e.count + " of the Grip", t: state.t });
    if (e.k === "walkerUp") state.events.push({ k: "the walker stands", t: state.t });
    if (e.k === "repaired") state.events.push({ k: "a module welded back", t: state.t });
    if (e.k === "bossDead") state.events.push({ k: "the Militia's walker is down", t: state.t });
    if (e.k === "herDead") { her.taken = true; state.events.push({ k: "SHE IS DEAD; the delivery is over", t: state.t }); }
    if (e.k === "handDead") state.events.push({ k: e.name + " is dead", t: state.t });
    if (e.k === "abandon" && ship.alive) { ship.alive = false; state.events.push({ k: "ABANDON SHIP", t: state.t }); logAdd("death", { v: 0 }); }
  }
}
function drawHold() {
  ctx.fillStyle = "#0b0f0a"; ctx.fillRect(0, 0, W(), H());
  const c = fieldPt(0, 0), d = hold.dials;
  ctx.strokeStyle = "rgba(233,237,242,.12)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(c[0], c[1], d.ringR * FIELD_PX, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = "rgba(233,237,242,.06)"; for (let k = -60; k <= 60; k += 10) { const a = fieldPt(k, -60), b = fieldPt(k, 60); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); const a2 = fieldPt(-60, k), b2 = fieldPt(60, k); ctx.beginPath(); ctx.moveTo(a2[0], a2[1]); ctx.lineTo(b2[0], b2[1]); ctx.stroke(); }
  const box = (x, y, m, fill, stroke) => { const p = fieldPt(x, y), s = m * FIELD_PX; ctx.fillStyle = fill; ctx.fillRect(p[0] - s / 2, p[1] - s / 2, s, s); if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1.5; ctx.strokeRect(p[0] - s / 2, p[1] - s / 2, s, s); } };
  const dot = (x, y, r, fill) => { const p = fieldPt(x, y); ctx.fillStyle = fill; ctx.beginPath(); ctx.arc(p[0], p[1], r, 0, Math.PI * 2); ctx.fill(); };
  for (const m of hold.modules) box(m.x, m.y, 1.6, m.hp <= 0 ? "#1a1c22" : m.welded ? "#5a6b8a" : "#3d3a2a", m.hp > 0 && !m.welded ? "#e9b25c" : null);
  for (const w of hold.walls) if (w.hp > 0) box(w.x, w.y, 1.2, "#8d8a86", null);
  for (const g of hold.guns) if (g.hp > 0) box(g.x, g.y, 1.2, "#c97a2a", null);
  if (!hold.walker.dead) box(hold.walker.x, hold.walker.y, 2, "#4f7fd1", null); else box(hold.walker.x, hold.walker.y, 2, "#22304a", "#4f7fd1");
  for (const g of hold.grip) if (g.alive) dot(g.x, g.y, 3, "#6fbf73");
  if (hold.boss && hold.boss.alive) dot(hold.boss.x, hold.boss.y, 6, "#c8302a");
  for (const h of hold.hands) if (h.alive) dot(h.x, h.y, 2.5, "#7fd1e0");
  if (hold.her.alive) { const px = hold.her.inWalker ? hold.walker.x : hold.her.x, py = hold.her.inWalker ? hold.walker.y : hold.her.y; dot(px, py, 3, "#ffffff"); }
  for (const s of hold.shots) { const p = fieldPt(s.x, s.y); ctx.strokeStyle = "#e9b25c"; ctx.beginPath(); ctx.moveTo(p[0] - 5, p[1]); ctx.lineTo(p[0] + 5, p[1]); ctx.moveTo(p[0], p[1] - 5); ctx.lineTo(p[0], p[1] + 5); ctx.stroke(); }
  if (fieldTap) { const p = fieldPt(fieldTap.x, fieldTap.y); ctx.strokeStyle = "rgba(233,178,92,.7)"; ctx.beginPath(); ctx.arc(p[0], p[1], 7, 0, Math.PI * 2); ctx.stroke(); }
}
function holdPane() {
  const s = holdSummary(hold), h = hold.her, w = hold.walker;
  $("clocks").textContent = [
    "THE HOLD  t " + fmt(hold.t, 1) + " s   wave " + s.wave + "   next in " + fmt(Math.max(0, hold.nextWaveAt - hold.t), 0) + " s",
    "Grip " + s.gripAlive + " alive, " + s.gripDead + " dead   scrap " + fmt(s.scrap) + " kg",
    "she: " + (h.alive ? h.act + (h.actT > 0 && h.act !== "fight" && h.act !== "idle" ? " " + fmt(h.actT, 1) + " s" : "") : "DEAD") + "   walker " + (w.dead ? "DEAD" : fmt(w.hp) + " hp"),
    "modules " + s.modulesAlive + " alive, " + s.loose + " loose" + (s.bossAlive ? "   THE MILITIA'S WALKER " + fmt(hold.boss.hp) : "") + (hold.abandoned ? "   ABANDON SHIP" : ""),
    fieldTap ? "target " + fmt(fieldTap.x, 1) + ", " + fmt(fieldTap.y, 1) : "tap the field to set a target for WALL, GUN, FIRE",
  ].join("\n");
  $("hRepairWalker").disabled = !w.dead || !h.alive; $("hRepair").disabled = !h.alive || !hold.modules.some((m) => m.hp > 0 && !m.welded); $("hFight").disabled = w.dead || !h.alive;
  $("hWall").disabled = !fieldTap || hold.scrap < hold.dials.wallScrap; $("hGun").disabled = !fieldTap || hold.scrap < hold.dials.gunScrap; $("hFire").disabled = !fieldTap || hold.mastT > 0;
  $("hTakeoff").disabled = hold.abandoned || hold.modules.some((m) => m.hp > 0 && !m.welded);
}
$("hRepairWalker").onclick = () => { if (holdOrder(hold, "repairWalker")) state.events.push({ k: "REPAIR WALKER, " + hold.dials.repairWalker + " s", t: state.t }); };
$("hRepair").onclick = () => { const r = holdOrder(hold, "repair"); if (r) state.events.push({ k: "REPAIR, " + fmt(r.actT, 1) + " s", t: state.t }); };
$("hFight").onclick = () => { if (holdOrder(hold, "fight")) state.events.push({ k: "she takes the walker", t: state.t }); };
$("hIdle").onclick = () => { holdOrder(hold, "idle"); };
$("hWall").onclick = () => { if (fieldTap && holdOrder(hold, "wall", fieldTap.x, fieldTap.y)) state.events.push({ k: "WALL, 300 kg scrap", t: state.t }); };
$("hGun").onclick = () => { if (fieldTap && holdOrder(hold, "gun", fieldTap.x, fieldTap.y)) state.events.push({ k: "GUN, 600 kg scrap", t: state.t }); };
$("hFire").onclick = () => { if (fieldTap && holdOrder(hold, "fire", fieldTap.x, fieldTap.y)) state.events.push({ k: "FIRE from the mast", t: state.t }); };
$("hTakeoff").onclick = () => { const r = holdOrder(hold, "takeoff"); if (!r.ok) { state.events.push({ k: "no takeoff: " + r.reason, t: state.t }); return; } hull.scrap += hold.scrap; const t = road.takeoff(); if (t.ok) { if (t.collapse) collapseT = state.t; leaveHold(); } else state.events.push({ k: "no takeoff: " + t.reason, t: state.t }); };
enterHold(OPENING_CRASH);
