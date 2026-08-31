// FROSTLINE — docs/frostline/main.js: FL-1, the mission, the turns, the
// confirmations. Free time until first contact; then alternating turns —
// pick a squad, pick an action, and every action (move included) prices
// itself in a confirmation before the point spends. The engine routes,
// walks, and fights on its own laws; the enemy side is held by its own
// switch during your half.
import { tickWar, defaultTickInput, makeRenderer } from "../../src/depot/api.js";
import { bootMission, missionState, MISSION_R1 } from "../../src/games/frostline/mission.js";
import { orderMove, orderDone, pickSquad, cycleSquad, orderPaths } from "../../src/games/frostline/command.js";
import { makeTriggerState, checkTriggers } from "../../src/games/frostline/pause.js";
import { makeTurns, startTurns, apOf, spend, clampMove, beginExec, stepExec, stepEnemy, heldInput, TURNS } from "../../src/games/frostline/turns.js";
import { destShield, hitChance, knownThreats } from "../../src/games/frostline/cover.js";
import { setOverwatch, clearOverwatch, applyFireControl, toggleDiscipline, discOf, markTarget, markedTarget, focusOrder, owPaths, OVERWATCH } from "../../src/games/frostline/verbs.js";
import { loadPurse, savePurse, earnFromEvents, winBonus, buyTeam, teamPrice, FOR_SALE, STORE_KEY } from "../../src/games/frostline/purse.js";
import { makeBoard, completionPay } from "../../src/games/frostline/contracts.js";
import { makeCtx, stepBattle, applyOp, record } from "../../src/games/frostline/tape.js";
import { INFANTRY_ARMS } from "../../src/depot/specs.js";

const canvas = document.getElementById("cv");
// The address is the whole state: ?board=B lists that board's jobs; add
// &job=K and that exact contract's battle boots; a bare ?seed=N stays the
// old free skirmish. No address at all rolls a fresh board.
const params = new URL(location.href).searchParams;
const purse = loadPurse(localStorage);
let boardSeed = parseInt(params.get("board") || "", 10);
let jobIx = parseInt(params.get("job") || "", 10);
const bareSeed = parseInt(params.get("seed") || "", 10);
let contract = null;
if (!Number.isFinite(boardSeed) && !Number.isFinite(bareSeed)) {
  boardSeed = Math.floor(Math.random() * 1e9);
  history.replaceState(null, "", "?board=" + boardSeed);
}
if (Number.isFinite(boardSeed) && Number.isFinite(jobIx)) contract = makeBoard(boardSeed)[jobIx] || null;
const boardOnly = Number.isFinite(boardSeed) && !contract;
if (boardOnly) {
  // the board screen: jobs listed, nothing boots until one is taken
  const bd = document.getElementById("board"), jobsEl = document.getElementById("bdJobs");
  document.getElementById("bdBody").innerHTML = "the purse: " + purse.scrap + (purse.heat ? " · heat " + purse.heat : "") + "<br>roster: 3 + " + purse.roster.length + " bought";
  for (const job of makeBoard(boardSeed)) {
    const b = document.createElement("button");
    b.innerHTML = job.name + "<br><span class=\"legit\">" + job.legit.toUpperCase() + "</span> · pays " + job.price + (job.heat ? " · +" + job.heat + " heat" : "");
    b.addEventListener("click", () => { location.href = location.pathname + "?board=" + job.boardSeed + "&job=" + job.job; });
    jobsEl.appendChild(b);
  }
  bd.style.display = "block";
  document.getElementById("title").textContent = "FROSTLINE · THE BOARD";
}
// the battle: everything below runs only when a contract or a bare seed
// asked for one — the board screen never boots a war.
if (!boardOnly) startBattle();
function startBattle() {
const askSeed = contract ? contract.seed : (Number.isFinite(bareSeed) ? bareSeed : 3);
const { war, mission, seed } = bootMission(MISSION_R1, askSeed, purse.roster);
if (!contract) history.replaceState(null, "", "?seed=" + seed);
let battleEarned = 0, bonusPaid = 0;
// the tape: every confirmed order at its tick; saved with the battle's
// address at the end so any fight can be reported and replayed bit-exact
const ctx = makeCtx(war, mission);
const tape = [];
function confirmOp(op) { if (applyOp(ctx, op)) { record(tape, ctx, op); return true; } return false; }
history.replaceState(null, "", "?seed=" + seed);
const R = makeRenderer(canvas, war.world, { camera: "tactical" });
let zoom = 1.5;
R.setZoom(zoom);
const ts = ctx.ts;
const squads = war.run.squads;

let selected = squads[0];
let focus = { x: selected.anchor.x, y: war.field.heightAt(selected.anchor.x, selected.anchor.z), z: selected.anchor.z };
let aim = { x: mission.exit.x, z: mission.exit.z };

let mode = null;            // "move" | "attack" | null — the armed action awaiting its tap
let pending = null;         // the confirmation on screen: {kind, sq, x, z, target, label}

// ---- HUD
const hud = document.getElementById("hud");
let mkText = "mk ?";
fetch("../../package.json", { cache: "no-store" }).then((r) => r.json())
  .then((p) => { mkText = "mk " + p.version; }).catch(() => {});
let fpsFrames = 0, fpsT = 0, fpsText = "- fps";

// ---- banner + popup + chips + actions
const banner = document.getElementById("banner"), reason = document.getElementById("reason");
const popup = document.getElementById("popup"), popTitle = document.getElementById("popTitle"), popBody = document.getElementById("popBody");
const actionsEl = document.getElementById("actions");
const actMove = document.getElementById("actMove"), actAttack = document.getElementById("actAttack"), actHold = document.getElementById("actHold"), actEnd = document.getElementById("actEnd");
const actOw = document.getElementById("actOw"), actMark = document.getElementById("actMark"), actDisc = document.getElementById("actDisc");
function say(top, sub) {
  banner.style.display = top ? "block" : "none";
  banner.textContent = top || "";
  reason.style.display = sub ? "block" : "none";
  reason.textContent = sub || "";
}
const armsOf = (sq) => INFANTRY_ARMS[sq.type === "sniper" ? "sniper" : sq.type === "mg" ? "mg" : "rifles"] || INFANTRY_ARMS.rifles;
const liveMember = (sq) => { for (const id of sq.memberIds) { const b = war.world.byId.get(id); if (b && b.alive) return b; } return null; };
function liveCount(sq) { let n = 0; for (const id of sq.memberIds) { const b = war.world.byId.get(id); if (b && b.alive) n++; } return n; }

const chipBox = document.getElementById("squads");
const chips = squads.map((sq) => {
  const el = document.createElement("button");
  el.className = "chip";
  chipBox.appendChild(el);
  el.addEventListener("click", () => { selected = sq; mode = null; });
  return { sq, el };
});
const label = (sq) => sq.type === "mg" ? "MG" : sq.type === "sniper" ? "SNIPERS" : "RIFLES";
function drawChips() {
  for (const { sq, el } of chips) {
    el.className = "chip" + (sq === selected ? " sel" : "");
    const ap = ts.phase === "free" ? "" : " · " + "●".repeat(apOf(ts, sq)) + "○".repeat(Math.max(0, TURNS.ap - apOf(ts, sq)));
    el.textContent = label(sq) + " · " + liveCount(sq) + " · " + (discOf(sq) === "careful" ? "C" : "F") + ap;
  }
  const inOrders = ts.phase === "orders" && !ctx.over;
  actionsEl.style.display = inOrders ? "grid" : "none";
  actMove.className = "act" + (mode === "move" ? " on" : "");
  actAttack.className = "act" + (mode === "attack" ? " on" : "");
  actOw.className = "act" + (mode === "ow" ? " on" : "");
  actMark.className = "act" + (mode === "mark" ? " on" : "");
}

// ---- the confirmation: every action prices itself before the point spends
function present(p) {
  pending = p;
  popTitle.textContent = p.title;
  popBody.innerHTML = p.body;
  popup.style.display = "block";
}
function dismiss() { pending = null; popup.style.display = "none"; }
document.getElementById("popNo").addEventListener("click", dismiss);
document.getElementById("popOk").addEventListener("click", () => {
  if (!pending) return;
  const p = pending;
  dismiss();
  const i = squads.indexOf(p.sq);
  if (p.kind === "move") confirmOp({ op: "move", i, x: p.x, z: p.z });
  else if (p.kind === "attack") confirmOp({ op: "attack", i, x: p.target.pos.x, z: p.target.pos.z });
  else if (p.kind === "hold") confirmOp({ op: "hold", i });
  else if (p.kind === "ow") confirmOp({ op: "ow", i, x: p.x, z: p.z, pts: p.pts });
  else if (p.kind === "mark") confirmOp({ op: "mark", i, x: p.target.pos.x, z: p.target.pos.z });
  else if (p.kind === "disc") confirmOp({ op: "disc", i });
  R.overlay.setOrderPaths(allPaths());
  mode = null;
});

actMove.addEventListener("click", () => { mode = mode === "move" ? null : "move"; });
actAttack.addEventListener("click", () => { mode = mode === "attack" ? null : "attack"; });
actOw.addEventListener("click", () => { mode = mode === "ow" ? null : "ow"; });
actMark.addEventListener("click", () => { mode = mode === "mark" ? null : "mark"; });
actDisc.addEventListener("click", () => {
  const next = discOf(selected) === "careful" ? "FREE — fires at anything seen, any half" : "CAREFUL — holds fire on the enemy half unless a cone covers it";
  present({ kind: "disc", sq: selected, title: "DISCIPLINE — " + label(selected), body: next + "<br>free — no cost" });
});
actHold.addEventListener("click", () => {
  if (apOf(ts, selected) <= 0) return;
  const shield = destShield(war, selected.anchor.x, selected.anchor.z);
  present({ kind: "hold", sq: selected, title: "HOLD — " + label(selected), body: "cover here: " + shield + "<br>cost 1 point · " + (apOf(ts, selected) - 1) + " after" });
});
actEnd.addEventListener("click", () => { if (ts.phase === "orders") { confirmOp({ op: "end", i: -1 }); say("", ""); } });

// ---- screen to world
function screenToWorld(cx, cy) {
  const nx = (cx / innerWidth) * 2 - 1;
  const ny = -((cy / innerHeight) * 2 - 1);
  const cp = R.cameraPos();
  const rt = R.camBasis.right, up = R.camBasis.up, f = R.camBasis.fwd;
  const hw = R.camBasis.halfW(), hh = R.camBasis.halfH();
  const px = cp.x + rt.x * nx * hw + up.x * ny * hh;
  const py = cp.y + rt.y * nx * hw + up.y * ny * hh;
  const pz = cp.z + rt.z * nx * hw + up.z * ny * hh;
  const t = (focus.y - py) / f.y;
  return { x: px + f.x * t, z: pz + f.z * t };
}

// ---- gestures: a tap orders; two fingers are the camera (pinch zooms,
// twist rotates) and never order. A tap is down-and-up under 9 px with no
// second finger; orders moved from pointerdown to the release so the first
// finger of a pinch never pops a confirmation.
const clampZoom = (z) => Math.max(0.5, Math.min(2.6, z));
const ptrs = new Map();
let gesture = false, tapStart = null, pinchD = 0, twistA = 0;
canvas.addEventListener("pointerdown", (e) => {
  ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (ptrs.size === 2) {
    gesture = true; tapStart = null;
    const [a, b] = [...ptrs.values()];
    pinchD = Math.hypot(b.x - a.x, b.y - a.y);
    twistA = Math.atan2(b.y - a.y, b.x - a.x);
  } else if (ptrs.size === 1) tapStart = { id: e.pointerId, x: e.clientX, y: e.clientY };
});
canvas.addEventListener("pointermove", (e) => {
  const p = ptrs.get(e.pointerId);
  if (!p) return;
  p.x = e.clientX; p.y = e.clientY;
  if (gesture && ptrs.size === 2) {
    const [a, b] = [...ptrs.values()];
    const d = Math.hypot(b.x - a.x, b.y - a.y);
    const ang = Math.atan2(b.y - a.y, b.x - a.x);
    if (pinchD > 0) { zoom = clampZoom(zoom * (d / pinchD)); R.setZoom(zoom); }
    let da = ang - twistA;
    if (da > Math.PI) da -= 2 * Math.PI;
    if (da < -Math.PI) da += 2 * Math.PI;
    R.rotateBy(-da);
    pinchD = d; twistA = ang;
  }
});
canvas.addEventListener("pointerup", (e) => {
  const wasTap = tapStart && tapStart.id === e.pointerId && !gesture &&
    Math.hypot(e.clientX - tapStart.x, e.clientY - tapStart.y) < 9;
  ptrs.delete(e.pointerId);
  if (ptrs.size === 0) gesture = false;
  tapStart = null;
  if (wasTap) tapAt(e.clientX, e.clientY);
});
canvas.addEventListener("pointercancel", (e) => { ptrs.delete(e.pointerId); if (ptrs.size === 0) gesture = false; tapStart = null; });
document.getElementById("rotL").addEventListener("click", () => R.rotateStep(1));
document.getElementById("rotR").addEventListener("click", () => R.rotateStep(-1));

function tapAt(cx, cy) {
  if (ctx.over || pending) return;
  const w = screenToWorld(cx, cy);
  const hit = pickSquad(squads, w.x, w.z);
  if (hit && mode === null) { selected = hit; return; }
  const free = ts.phase === "free";
  if (!free && ts.phase !== "orders") return;
  if (!free && apOf(ts, selected) <= 0) return;
  if (mode === "attack") {
    const threats = knownThreats(war);
    let best = null, bd = 6;
    for (const t of threats) { const d = Math.hypot(t.pos.x - w.x, t.pos.z - w.z); if (d < bd) { bd = d; best = t; } }
    if (!best) return;
    const shooter = liveMember(selected);
    const pct = shooter ? Math.round(hitChance(war, shooter, best, armsOf(selected)) * 100) : 0;
    present({ kind: "attack", sq: selected, target: best, title: "ATTACK — " + label(selected),
      body: "chance to hit: " + pct + "%<br>" + (ts.phase === "free" ? "free time — no cost" : "cost 1 point · " + (apOf(ts, selected) - 1) + " after") });
    aim = { x: best.pos.x, z: best.pos.z };
    return;
  }
  if (mode === "ow") {
    const pts = selected._ow ? 2 : 1;
    const deg = pts >= 2 ? 180 : 90;
    present({ kind: "ow", sq: selected, x: w.x, z: w.z, pts, title: "OVERWATCH — " + label(selected),
      body: "a " + deg + "° cone on that bearing, enemy half only<br>" + (free ? "free time — no cost" : "cost 1 point · " + (apOf(ts, selected) - 1) + " after") + (pts === 1 ? "<br>overwatch again to widen" : "") });
    aim = { x: w.x, z: w.z };
    return;
  }
  if (mode === "mark") {
    const threats = knownThreats(war);
    let best = null, bd = 6;
    for (const t of threats) { const d = Math.hypot(t.pos.x - w.x, t.pos.z - w.z); if (d < bd) { bd = d; best = t; } }
    if (!best) return;
    present({ kind: "mark", sq: selected, target: best, title: "MARK TARGET", body: "the mark is the whole side's<br>free — no cost" });
    aim = { x: best.pos.x, z: best.pos.z };
    return;
  }
  // move — the default tap, and the MOVE button's tap
  const d = free ? { x: w.x, z: w.z } : clampMove(selected, w.x, w.z);
  const shield = destShield(war, d.x, d.z);
  const dist = Math.hypot(d.x - selected.anchor.x, d.z - selected.anchor.z);
  present({ kind: "move", sq: selected, x: d.x, z: d.z, title: "MOVE — " + label(selected),
    body: "cover there: " + shield + "<br>distance " + dist.toFixed(0) + " m" + (free ? "<br>free time — no cost" : " (cap " + TURNS.moveCap + ")<br>cost 1 point · " + (apOf(ts, selected) - 1) + " after") });
  aim = { x: d.x, z: d.z };
}
addEventListener("wheel", (e) => { zoom = clampZoom(zoom + (e.deltaY > 0 ? -0.12 : 0.12)); R.setZoom(zoom); }, { passive: true });
addEventListener("keydown", (e) => {
  if (e.code === "Tab") { e.preventDefault(); selected = cycleSquad(squads, selected); }
  else if (e.code === "KeyQ") R.rotateStep(1);
  else if (e.code === "KeyE") R.rotateStep(-1);
});

// ---- the overlay: order routes, overwatch cones, the mark's ring
function allPaths() {
  const hAt = (x, z) => war.field.heightAt(x, z);
  const paths = orderPaths(squads).concat(owPaths(squads, hAt));
  const m = markedTarget(war);
  if (m) {
    const ring = [];
    for (let k = 0; k <= 10; k++) { const a = (k / 10) * Math.PI * 2; const x = m.pos.x + Math.sin(a) * 1.2, z = m.pos.z + Math.cos(a) * 1.2; ring.push({ x, y: hAt(x, z), z }); }
    paths.push(ring);
  }
  return paths;
}

// ---- the debrief: the books shown, the shop open, the next battle a tap away
const debriefEl = document.getElementById("debrief");
const dbTitle = document.getElementById("dbTitle"), dbBody = document.getElementById("dbBody"), dbShop = document.getElementById("dbShop");
function showDebrief(won) {
  dbTitle.textContent = won ? (contract ? contract.name + " — PAID" : "THE FAR SIDE — CONTRACT COMPLETE") : "THE LINE BROKE";
  dbBody.innerHTML = "bounties this battle: " + battleEarned +
    (bonusPaid ? "<br>" + (contract ? "the posted price: " + bonusPaid : "completion bonus: " + bonusPaid) : "") +
    (contract && won && contract.heat ? "<br>heat +" + contract.heat + " (now " + purse.heat + ")" : "") +
    "<br>the purse: " + purse.scrap + "<br>roster: 3 + " + purse.roster.length + " bought" +
    "<br>the tape: " + tape.length + " orders, saved";
  dbShop.innerHTML = "";
  for (const type of FOR_SALE) {
    const b = document.createElement("button");
    const price = teamPrice(type);
    b.textContent = "BUY " + (type === "mg" ? "GUNNERS" : type === "sniper" ? "SNIPER PAIR" : "RIFLE SQUAD") + " — " + price;
    b.disabled = purse.scrap < price;
    b.addEventListener("click", () => { if (buyTeam(purse, type)) { savePurse(localStorage, purse); showDebrief(won); } });
    dbShop.appendChild(b);
  }
  debriefEl.style.display = "block";
}
document.getElementById("dbNew").addEventListener("click", () => {
  location.href = location.pathname + "?board=" + Math.floor(Math.random() * 1e9);
});
document.getElementById("dbReset").addEventListener("click", () => {
  localStorage.removeItem(STORE_KEY);
  location.href = location.pathname;
});

// ---- the loop
const title = document.getElementById("title");
const STEP = 1 / 120;
let last = performance.now(), acc = 0;
say("", "TAP THE SNOW TO MOVE OUT — TIME STOPS AT FIRST CONTACT");
function frame(now) {
  requestAnimationFrame(frame);
  let dt = Math.min(0.1, (now - last) / 1000); last = now;
  const ticking = !ctx.over && !pending && (ts.phase === "free" || ts.phase === "exec" || ts.phase === "enemy");
  if (ticking) {
    acc += dt;
    let guard = 0;
    while (acc >= STEP && guard++ < 12 && !ctx.over) {
      acc -= STEP;
      const before = ts.phase;
      const { events, flags } = stepBattle(ctx);
      if (before === "free" && ts.phase === "orders") say("CONTACT", "YOUR TURN — 3 POINTS A SQUAD");
      else if (before === "exec" && ts.phase === "enemy") say("ENEMY TURN", "");
      else if (before === "enemy" && ts.phase === "orders") say("YOUR TURN " + ts.turn, "3 POINTS A SQUAD");
      if (flags && flags.orderPaths) R.overlay.setOrderPaths(allPaths());
      battleEarned += earnFromEvents(purse, war, events);
      if (ctx.over) {
        if (ctx.won) bonusPaid = contract ? completionPay(purse, contract) : winBonus(purse);
        savePurse(localStorage, purse);
        localStorage.setItem("frostline-tape", JSON.stringify({ seed, board: contract ? contract.boardSeed : null, job: contract ? contract.job : null, roster: purse.roster.slice(), tape }));
        say("", "");
        showDebrief(ctx.won);
      }
    }
  } else { acc = 0; }
  if (selected && selected.anchor) {
    focus.x += (selected.anchor.x - focus.x) * Math.min(1, dt * 4);
    focus.z += (selected.anchor.z - focus.z) * Math.min(1, dt * 4);
    focus.y = war.field.heightAt(focus.x, focus.z);
    R.overlay.setHover(true, selected.anchor.x, selected.anchor.z, war.field.heightAt(selected.anchor.x, selected.anchor.z), 2.2, true, 2);
  }
  R.overlay.setObjective(mission.exit.x, mission.exit.z, war.field.heightAt(mission.exit.x, mission.exit.z));
  fpsFrames++; fpsT += dt;
  if (fpsT >= 0.5) { fpsText = Math.round(fpsFrames / fpsT) + " fps"; fpsFrames = 0; fpsT = 0; }
  hud.innerHTML = mkText + "<br>" + fpsText + "<br>seed " + seed + "<br>purse " + purse.scrap + (purse.heat ? "<br>heat " + purse.heat : "");
  drawChips();
  title.textContent = "FROSTLINE · " + mission.name + (ts.phase === "orders" ? " · TURN " + ts.turn : "");
  R.render(dt, focus, aim);
}
requestAnimationFrame(frame);
}
