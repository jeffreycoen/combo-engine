// FROSTLINE — docs/frostline/space-main.js: the route, FL-8's minimal
// skirmish. A hot contract flies through an ambush: three fighters against
// three, the same turn machine as the ground, the flat black canvas. Won,
// the job continues on the ground; lost, back to the board. Kills pay ship
// bounties into the one purse.
import { makeSpaceBattle, stepSpace, contactMade, enemyOrders, wingState, liveShips, drainSpaceEvents, SPACE_STEP, SHIP_SPECS } from "../../src/games/frostline/space.js";
import { orderMove, orderAttack } from "../../src/modules/orders/orders.js";
import { makeTurns, startTurns, apOf, spend, beginExec, stepExec, stepEnemy, TURNS } from "../../src/games/frostline/turns.js";
import { makeBoard } from "../../src/games/frostline/contracts.js";
import { loadPurse, savePurse } from "../../src/games/frostline/purse.js";
import { stream } from "../../src/games/frostline/contracts.js";

const params = new URL(location.href).searchParams;
const boardSeed = parseInt(params.get("board") || "", 10);
const jobIx = parseInt(params.get("job") || "", 10);
const bareSeed = parseInt(params.get("space") || "", 10);
const contract = Number.isFinite(boardSeed) && Number.isFinite(jobIx) ? makeBoard(boardSeed)[jobIx] || null : null;
const spaceSeed = contract ? contract.spaceSeed : (Number.isFinite(bareSeed) ? bareSeed : 12345);
const purse = loadPurse(localStorage);
const battle = makeSpaceBattle(spaceSeed);
const ts = makeTurns();
let paid = 0, over = false, pending = null, mode = null;
let selected = liveShips(battle, 1)[0];

// the wings close from the first breath; the droids fly their own mind
orderMove(liveShips(battle, 1), 0, 0, 0);
enemyOrders(battle);

// ---- DOM
const cv = document.getElementById("cv"), ctx2d = cv.getContext("2d");
const hud = document.getElementById("hud"), titleEl = document.getElementById("title");
const banner = document.getElementById("banner"), reason = document.getElementById("reason");
const actionsEl = document.getElementById("actions");
const actMove = document.getElementById("actMove"), actAttack = document.getElementById("actAttack"), actEnd = document.getElementById("actEnd");
const popup = document.getElementById("popup"), popTitle = document.getElementById("popTitle"), popBody = document.getElementById("popBody");
const card = document.getElementById("card"), cardTitle = document.getElementById("cardTitle"), cardBody = document.getElementById("cardBody"), cardGo = document.getElementById("cardGo");
const chipBox = document.getElementById("ships");
let mkText = "mk ?";
fetch("../../package.json", { cache: "no-store" }).then((r) => r.json()).then((p) => { mkText = "mk " + p.version; }).catch(() => {});
titleEl.textContent = "THE ROUTE" + (contract ? " · " + contract.name : "");
function say(top, sub) {
  banner.style.display = top ? "block" : "none"; banner.textContent = top || "";
  reason.style.display = sub ? "block" : "none"; reason.textContent = sub || "";
}
say("", "AMBUSH ON THE ROUTE — TIME STOPS AT FIRST CONTACT");

const chips = liveShips(battle, 1).map((s, i) => {
  const el = document.createElement("button");
  el.className = "chip";
  el.addEventListener("click", () => { if (s.hp > 0) { selected = s; mode = null; } });
  chipBox.appendChild(el);
  return { s, el, name: "FIGHTER " + (i + 1) };
});
function drawChips() {
  for (const c of chips) {
    c.el.className = "chip" + (c.s === selected ? " sel" : "");
    const ap = ts.phase === "free" ? "" : " · " + "●".repeat(apOf(ts, c.s)) + "○".repeat(Math.max(0, TURNS.ap - apOf(ts, c.s)));
    c.el.textContent = c.name + " · " + Math.max(0, Math.ceil(c.s.hp)) + ap;
    c.el.style.opacity = c.s.hp > 0 ? 1 : 0.35;
  }
  actionsEl.style.display = ts.phase === "orders" && !over ? "grid" : "none";
  actMove.className = "act" + (mode === "move" ? " on" : "");
  actAttack.className = "act" + (mode === "attack" ? " on" : "");
}

// ---- the confirmation
function present(p) { pending = p; popTitle.textContent = p.title; popBody.innerHTML = p.body; popup.style.display = "block"; }
function dismiss() { pending = null; popup.style.display = "none"; }
document.getElementById("popNo").addEventListener("click", dismiss);
document.getElementById("popOk").addEventListener("click", () => {
  if (!pending) return;
  const p = pending;
  dismiss();
  const free = ts.phase === "free";
  if (!free && !spend(ts, p.ship)) return;
  if (p.kind === "move") orderMove([p.ship], p.x, 0, p.z);
  else if (p.kind === "attack") orderAttack([p.ship], p.target);
  mode = null;
});
actMove.addEventListener("click", () => { mode = mode === "move" ? null : "move"; });
actAttack.addEventListener("click", () => { mode = mode === "attack" ? null : "attack"; });
actEnd.addEventListener("click", () => { if (ts.phase === "orders") { beginExec(ts); say("", ""); } });

// ---- the view: a fixed window on the black, world units to pixels
let scale = 1, W = 0, H = 0;
function fit() { W = innerWidth; H = innerHeight; cv.width = W; cv.height = H; scale = Math.min(W, H) / 220; }
fit(); addEventListener("resize", fit);
const toScreen = (x, z) => [W / 2 + x * scale, H / 2 + z * scale];
const toWorld = (px, py) => [(px - W / 2) / scale, (py - H / 2) / scale];
const stars = (() => { const r = stream(spaceSeed ^ 0x5f5f5f5f); const out = []; for (let i = 0; i < 140; i++) out.push([r() * 2 - 1, r() * 2 - 1, 0.3 + r() * 0.9]); return out; })();

cv.addEventListener("pointerdown", (e) => {
  if (over || pending) return;
  const [wx, wz] = toWorld(e.clientX, e.clientY);
  const own = liveShips(battle, 1);
  let hit = null, hd = 8;
  for (const s of own) { const d = Math.hypot(s.pos[0] - wx, s.pos[2] - wz); if (d < hd) { hd = d; hit = s; } }
  if (hit && mode === null) { selected = hit; return; }
  const free = ts.phase === "free";
  if (!free && ts.phase !== "orders") return;
  if (!selected || selected.hp <= 0) return;
  if (!free && apOf(ts, selected) <= 0) return;
  if (mode === "attack") {
    let best = null, bd = 10;
    for (const t of liveShips(battle, 2)) { const d = Math.hypot(t.pos[0] - wx, t.pos[2] - wz); if (d < bd) { bd = d; best = t; } }
    if (!best) return;
    present({ kind: "attack", ship: selected, target: best, title: "ATTACK",
      body: "close and engage<br>" + (free ? "free time — no cost" : "cost 1 point · " + (apOf(ts, selected) - 1) + " after") });
    return;
  }
  present({ kind: "move", ship: selected, x: wx, z: wz, title: "MOVE",
    body: "burn to that point<br>" + (free ? "free time — no cost" : "cost 1 point · " + (apOf(ts, selected) - 1) + " after") });
});

// ---- the end card
function showCard(won) {
  cardTitle.textContent = won ? "THE ROUTE IS CLEAR" : "THE WING BROKE";
  cardBody.innerHTML = "ship bounties: " + paid + "<br>the purse: " + purse.scrap +
    (contract ? "<br>" + (won ? "the job waits on the ground" : "the contract is lost") : "");
  cardGo.textContent = won && contract ? "CONTINUE TO THE JOB" : "BACK TO THE BOARD";
  cardGo.onclick = () => {
    if (won && contract) location.href = "index.html?board=" + contract.boardSeed + "&job=" + contract.job;
    else location.href = "index.html?board=" + (contract ? contract.boardSeed : Math.floor(Math.random() * 1e9));
  };
  card.style.display = "block";
}

// ---- the loop
let last = performance.now(), acc = 0, fpsFrames = 0, fpsT = 0, fpsText = "- fps";
const wingOps = () => liveShips(battle, 1);
function frame(now) {
  requestAnimationFrame(frame);
  let dt = Math.min(0.1, (now - last) / 1000); last = now;
  const ticking = !over && !pending && (ts.phase === "free" || ts.phase === "exec" || ts.phase === "enemy");
  if (ticking) {
    acc += dt;
    let guard = 0;
    while (acc >= SPACE_STEP && guard++ < 8 && !over) {
      acc -= SPACE_STEP;
      if (ts.phase === "free") {
        stepSpace(battle);
        if (contactMade(battle)) { startTurns(ts, wingOps()); say("CONTACT", "YOUR TURN — 3 POINTS A SHIP"); }
      } else if (ts.phase === "exec") {
        stepSpace(battle, { player: false, enemy: true });
        if (stepExec(ts, SPACE_STEP, false)) { enemyOrders(battle); say("ENEMY TURN", ""); }
      } else if (ts.phase === "enemy") {
        stepSpace(battle);
        if (stepEnemy(ts, SPACE_STEP, wingOps())) say("YOUR TURN " + ts.turn, "3 POINTS A SHIP");
      }
      for (const ev of drainSpaceEvents(battle)) {
        if (ev.team === 2) { paid += ev.bounty; purse.scrap += ev.bounty; purse.earned += ev.bounty; purse.kills++; }
      }
      if (battle.over) {
        over = true;
        savePurse(localStorage, purse);
        say("", "");
        showCard(battle.won);
      }
    }
  } else if (!ticking) acc = 0;
  // ---- draw
  ctx2d.fillStyle = "#05070d"; ctx2d.fillRect(0, 0, W, H);
  for (const [sx, sy, m] of stars) { ctx2d.fillStyle = "rgba(233,237,242," + 0.25 * m + ")"; ctx2d.fillRect(W / 2 + sx * W * 0.7, H / 2 + sy * H * 0.7, m, m); }
  ctx2d.strokeStyle = "rgba(120,140,180,0.08)"; ctx2d.lineWidth = 1;
  for (let g = -100; g <= 100; g += 20) {
    const [x0, y0] = toScreen(g, -110), [x1, y1] = toScreen(g, 110);
    ctx2d.beginPath(); ctx2d.moveTo(x0, y0); ctx2d.lineTo(x1, y1); ctx2d.stroke();
    const [a0, b0] = toScreen(-110, g), [a1, b1] = toScreen(110, g);
    ctx2d.beginPath(); ctx2d.moveTo(a0, b0); ctx2d.lineTo(a1, b1); ctx2d.stroke();
  }
  for (const s of battle.ships) {
    if (s.hp <= 0) continue;
    const [sx, sy] = toScreen(s.pos[0], s.pos[2]);
    const ang = Math.atan2(s.heading[2], s.heading[0]);
    ctx2d.save(); ctx2d.translate(sx, sy); ctx2d.rotate(ang);
    ctx2d.fillStyle = s.team === 1 ? "#7fb4ff" : "#ff7a6b";
    ctx2d.beginPath(); ctx2d.moveTo(9, 0); ctx2d.lineTo(-6, 5); ctx2d.lineTo(-3, 0); ctx2d.lineTo(-6, -5); ctx2d.closePath(); ctx2d.fill();
    ctx2d.restore();
    if (s === selected) { ctx2d.strokeStyle = "#6fbf73"; ctx2d.beginPath(); ctx2d.arc(sx, sy, 13, 0, Math.PI * 2); ctx2d.stroke(); }
    ctx2d.fillStyle = "rgba(13,17,23,.7)"; ctx2d.fillRect(sx - 10, sy - 18, 20, 3);
    ctx2d.fillStyle = s.team === 1 ? "#6fbf73" : "#e9b25c"; ctx2d.fillRect(sx - 10, sy - 18, 20 * Math.max(0, s.hp / s.maxHp), 3);
  }
  fpsFrames++; fpsT += dt;
  if (fpsT >= 0.5) { fpsText = Math.round(fpsFrames / fpsT) + " fps"; fpsFrames = 0; fpsT = 0; }
  hud.innerHTML = mkText + "<br>" + fpsText + "<br>space " + spaceSeed + "<br>purse " + purse.scrap;
  drawChips();
}
requestAnimationFrame(frame);
