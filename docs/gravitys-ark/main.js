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

const q = new URLSearchParams(location.search);
const seed = q.has("seed") ? (parseInt(q.get("seed"), 10) >>> 0) : ((Math.random() * 0xffffffff) >>> 0);
const galaxy = makeGalaxy(seed);
const road = makeRoad(galaxy);
const ship = road.ship, state = road.state, star = galaxy.star;
// phase 0.0.106's page step: the stations, the purse, the hull, the crew
const S = makeStations(galaxy); S.rollPerson = rollPerson;
const purse = makePurse(20000, 0), hull = makeHull(STARTER_HULL), crew = [], nameRng = simStream((seed + 1) >>> 0);
const PERSON_KG = 80;
function hullMass() { return derive(hull).m + hull.scrap + PERSON_KG * (crew.length + hull.cargo.people); }
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
}

// the panes: the ship's numbers, the clocks, the log
function fmt(n, d = 0) { return Number(n).toLocaleString("en-US", { maximumFractionDigits: d, minimumFractionDigits: d }); }
function hud() {
  const w = ship.landed !== null ? galaxy.worlds[ship.landed] : null;
  $("ship").textContent = [
    "seed " + seed,
    "fuel " + fmt(ship.fuel) + " kg   mass " + fmt(ship.dry + ship.fuel) + " kg   credits " + fmt(purse.credits) + (purse.debt ? "   debt " + fmt(purse.debt) : ""),
    "dv " + fmt(dvAvailable(ship, road.dials.ve)) + " m/s   speed " + fmt(Math.hypot(ship.vx, ship.vy), 1) + " m/s",
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
  $("burn").classList.toggle("on", burning); $("aim").textContent = aimMode === "gate" ? "AIM: GATE" : "AIM: DRAG"; $("pause").classList.toggle("on", paused);
  if (!ship.alive && $("card").style.display !== "block") { $("cardBody").textContent = "The ship is lost at t " + fmt(state.t, 1) + " s, " + fmt(state.hole.swallowed.length) + " worlds eaten. The card of the crossing lands in a later phase."; $("card").style.display = "block"; }
}
let collapseT = 0;

// the controls: buttons for the phone, keys for the desktop, a drag for the aim
$("land").onclick = () => { const r = road.land(); if (r.ok) { if (r.crash) state.events.push({ k: "crash-load " + fmt(r.load, 1), t: state.t }); const due = dock(S, purse, crew, state.t); state.events.push({ k: "dock wages " + fmt(due), t: state.t }); } };
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
cv.addEventListener("pointerup", () => { dragStart = null; });
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
  while (acc >= DT) { if (!paused && ship.alive) { if (burning) { const a = aimVector(); road.burn(a[0], a[1], DT); } const before = ship.landed; road.tick(DT); if (before === null && ship.landed !== null) { const due = dock(S, purse, crew, state.t); state.events.push({ k: "dock wages " + fmt(due), t: state.t }); } stepStations(S, DT); ship.dry = hullMass(); } acc -= DT; }
  draw(); hud(); dockPane();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// the dock pane: the station's listings and the purse, live only when landed
function dockPane() {
  const sid = stationHere();
  $("dock").style.display = sid ? "block" : "none";
  if (!sid) return;
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
$("buyFuel").onclick = () => { const sid = stationHere(); if (!sid) return; const n = Math.min(500, Math.max(0, Math.floor(derive(hull).fuelCap - ship.fuel))); const cost = n > 0 ? buy(S, sid, "fuel", n, purse) : null; if (cost !== null) { ship.fuel += n; state.events.push({ k: "fuel +" + n + " kg for " + fmt(cost), t: state.t }); } };
$("buyScrap").onclick = () => { const sid = stationHere(); if (!sid) return; const cost = buy(S, sid, "scrap", 500, purse); if (cost !== null) { hull.scrap += 500; state.events.push({ k: "scrap +500 kg for " + fmt(cost), t: state.t }); } };
$("sellScrap").onclick = () => { const sid = stationHere(); if (!sid || hull.scrap <= 0) return; const n = Math.floor(hull.scrap); const out = sell(S, sid, "scrap", n, purse); if (out !== null) { hull.scrap -= n; state.events.push({ k: "sold " + n + " kg scrap for " + fmt(out), t: state.t }); } };
$("hireHand").onclick = () => { const sid = stationHere(); if (!sid) return; const h = hire(S, sid, purse, nameRng, state.t); if (h) { crew.push(h); state.events.push({ k: "hired " + h.name, t: state.t }); } };
$("takePeople").onclick = () => { const sid = stationHere(); if (!sid) return; const cost = carryPeople(S, sid, hull, purse, 1); if (cost !== null) state.events.push({ k: "took 1 person aboard for " + fmt(cost), t: state.t }); };
$("deliver").onclick = () => { const sid = stationHere(); if (!sid) return; const ct = openContractHere(sid); if (!ct) return; const pay = deliverPeople(S, ct, hull, purse); if (pay) state.events.push({ k: "delivered people for " + fmt(pay), t: state.t }); };
