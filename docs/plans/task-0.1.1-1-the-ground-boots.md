# Task 0.1.1-1 — the ground boots

One job: put coldsnap's war on the ark's page as the ground, behind `?ground=1`: the ark's ground layer in its own file, the ground's screen in its own file, the page's hookup lines, two checks in the ark's gate, the parts source, the README's line. Every file's full content is below; write exactly what is written, run the listed gates, report. You design nothing.

Suggested model: Sonnet 5.

Required reading, in order (confirm at the top of your report):
1. This file, whole.
2. `docs/plans/phase-0.1.1-the-hold.md`, whole.

No demo file is read or written. Nothing under `/home/batman/coldsnap` is read, written, or run.

## Steps

Run from `/home/batman/combo-engine`. A failed assert, a wrong required value, or a FAILED hash line stops the task: report the step and its verbatim output, run nothing further. Never edit a file to make a hash match.

**Resuming.** The first run stopped at step 8: the second new check read the purse after the first tick, and the ground pays by the tick. Step 6 is amended below. Steps 2 to 5 and 7 stand as applied and proven; they are not run again. Run step 0R, then step 6, then steps 8 to 10.

0R. Assert the five applied files at their hashes, and put the gate file back to its committed state.

```sh
while read -r hash path; do test "$(sha256sum "$path" | cut -c1-16)" = "$hash" && echo "OK $path" || echo "FAILED $path"; done <<'STAND'
2f01f0efd76397c4 src/games/gravitys-ark/ground.js
c7efd469517c680f docs/gravitys-ark/ground.js
f93f50c15a29bca9 docs/gravitys-ark/index.html
3a37b4af977f82eb docs/gravitys-ark/main.js
8f2d68a0a86be011 docs/parts/parts-source.json
STAND
git checkout -- scripts/gravitys-ark-test.mjs
test "$(sha256sum scripts/gravitys-ark-test.mjs | cut -c1-16)" = "0aedea3b45b5a61b" && echo OK scripts/gravitys-ark-test.mjs || echo FAILED scripts/gravitys-ark-test.mjs
```

Required: six OK lines.

1. Assert the ground: the tracked files clean at the 0.1.0 landing, the version at 0.1.0, the five files this task edits at their hashes, the two new files absent. The gates were recorded green at that landing and are not run again here.

```sh
git status --short | grep -v "^??" | wc -l
grep -c '"version": "0.1.0"' package.json
while read -r hash path; do test "$(sha256sum "$path" | cut -c1-16)" = "$hash" && echo "OK $path" || echo "FAILED $path"; done <<'GROUND'
181e2655a579576d docs/gravitys-ark/index.html
8bfaca5e2956fa11 docs/gravitys-ark/main.js
0aedea3b45b5a61b scripts/gravitys-ark-test.mjs
ea905ff27e48f6b0 docs/parts/parts-source.json
7ba0c78f9ef69b2a README.md
GROUND
ls src/games/gravitys-ark/ground.js docs/gravitys-ark/ground.js 2>/dev/null | wc -l
```

Required: `0`, `1`, five OK lines, `0`.

2. Write the ark's ground layer, exactly. The file must pass a syntax check and the hash line must print OK.

```sh
cat > src/games/gravitys-ark/ground.js <<'ARK_EOF_2'
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
ARK_EOF_2
node --check src/games/gravitys-ark/ground.js && echo "syntax ok ground.js"
test "$(sha256sum src/games/gravitys-ark/ground.js | cut -c1-16)" = "2f01f0efd76397c4" && echo OK src/games/gravitys-ark/ground.js || echo FAILED src/games/gravitys-ark/ground.js
```

3. Write the ground's screen, exactly. Syntax check, then the hash line must print OK.

```sh
cat > docs/gravitys-ark/ground.js <<'ARK_EOF_3'
// GRAVITY'S ARK — ground.js: the ground's screen, phase 0.1.1. Coldsnap's
// drawing on its own canvas, its sound, the camera, the taps, the pane, the
// buttons. The main file takes only the hookup lines.
import { makeRenderer, makeGameAudio } from "../../src/depot/api.js";
import { TOWER_SPECS } from "../../src/depot/specs.js";
import { makeGround, order, tick, summary, price, GUNS } from "../../src/games/gravitys-ark/ground.js";
import { makeGestures } from "../../src/modules/pagekit/pagekit.js";

const fmt = (n, d = 0) => Number(n).toLocaleString("en-US", { maximumFractionDigits: d, minimumFractionDigits: d });

// makeGroundScreen(ids, hooks): ids names the canvas and the three buttons; hooks.log takes one line for the log pane.
export function makeGroundScreen(ids, hooks) {
  const $ = (id) => document.getElementById(id);
  const gv = $(ids.canvas);
  const say = (line) => { if (hooks && hooks.log) hooks.log(line); };
  let G = null, R = null, A = null, focus = null, aim = null, zoom = 1, gunI = 1, muted = false;
  const kind = () => GUNS[gunI];

  // a screen point to the ground: a point on the camera's near plane plus the view
  // direction down to the focus height, the play page's own law
  function screenToGround(cx, cy) {
    const nx = (cx / innerWidth) * 2 - 1, ny = -((cy / innerHeight) * 2 - 1);
    const cp = R.cameraPos(), rt = R.camBasis.right, up = R.camBasis.up, f = R.camBasis.fwd;
    const hw = R.camBasis.halfW(), hh = R.camBasis.halfH();
    const px = cp.x + rt.x * nx * hw + up.x * ny * hh, py = cp.y + rt.y * nx * hw + up.y * ny * hh, pz = cp.z + rt.z * nx * hw + up.z * ny * hh;
    const t = (focus.y - py) / f.y;
    return { x: px + f.x * t, z: pz + f.z * t };
  }

  function enter(seed, w, scrapKg) {
    G = makeGround(seed, w, scrapKg);
    gv.style.display = "block";
    R = makeRenderer(gv, G.world, { camera: "tactical", town: false, fadeDecals: true });
    A = makeGameAudio(); A.setMuted(muted);
    const f = G.run.focus; focus = { x: f.x, y: f.y, z: f.z }; aim = { x: f.x, z: f.z }; zoom = 1;
    A.setListener(focus.x, focus.z, 60);
    say("on the ground at " + w.id + ": " + fmt(scrapKg) + " kg of scrap is " + fmt(G.run.resources) + " scrap here");
  }
  function leave() { if (R) { R.dispose(); R = null; } if (A) { A.dispose(); A = null; } gv.style.display = "none"; G = null; }
  function step(dt) {
    if (!G) return null;
    const r = tick(G, dt);
    if (R) R.consume(r.events);
    if (A) { A.consume(r.events); if (r.cues.length) A.consume(r.cues); }
    for (const e of G.events.splice(0)) { if (e.k === "toast") say(String(e.text).toLowerCase()); else if (e.k === "gun") say(TOWER_SPECS[e.key].label.toLowerCase() + " placed for " + e.cost + " scrap"); }
    if (r.flags.bell) say("the bell: assault " + G.run.bell);
    return r;
  }
  function draw(dt) { if (!G || !R) return; if (A) A.tick(G.world, dt); R.render(dt, focus, aim); }
  function pane() {
    if (!G) return "";
    const s = summary(G);
    return ["THE GROUND  t " + fmt(s.t, 1) + " s   assault " + s.bell + "   next in " + fmt(s.bellIn, 0) + " s",
      "scrap " + fmt(s.scrap) + " (" + fmt(s.scrapKg) + " kg)   guns " + s.guns + "   enemy afield " + s.foes,
      "the hull stands " + fmt(s.standing * 100, 0) + "%" + (s.lost ? "   THE HULL IS LOST" : ""),
      "tap the ground to place a " + TOWER_SPECS[kind()].label.toLowerCase() + " for " + fmt(price(G, kind())) + " scrap; two fingers turn and zoom"].join("\n");
  }
  function buttons() {
    if (!G) return;
    $(ids.kind).textContent = TOWER_SPECS[kind()].label + " " + fmt(price(G, kind()));
    $(ids.sound).textContent = muted ? "SOUND OFF" : "SOUND ON";
    $(ids.takeoff).disabled = !!G.run.gameOver;
  }
  $(ids.kind).onclick = () => { gunI = (gunI + 1) % GUNS.length; buttons(); };
  $(ids.sound).onclick = () => { muted = !muted; if (A) { A.ensure(); A.setMuted(muted); } buttons(); };
  makeGestures(gv, {
    tap: (x, y) => { if (!G || !R) return; if (A) A.ensure(); const p = screenToGround(x, y); aim = { x: p.x, z: p.z }; const r = order(G, "gun", p.x, p.z, kind()); if (!r.ok) say("no " + TOWER_SPECS[kind()].label.toLowerCase() + ": " + String(r.reason).toLowerCase()); },
    pinch: (k) => { if (R) { zoom = Math.max(0.5, Math.min(2.6, zoom * k)); R.setZoom(zoom); } },
    twist: (a) => { if (R) R.rotateBy(a); },
  });
  addEventListener("keydown", (e) => { if (!R) return; if (e.key === "1") R.rotateBy(0.35); if (e.key === "3") R.rotateBy(-0.35); });
  return { enter, leave, step, draw, pane, buttons, active: () => !!G,
    zoomIn: () => { if (R) { zoom = Math.min(2.6, zoom * 1.25); R.setZoom(zoom); } },
    zoomOut: () => { if (R) { zoom = Math.max(0.5, zoom / 1.25); R.setZoom(zoom); } },
    takeoff: () => (G ? order(G, "takeoff") : { ok: false, reason: "not on the ground" }) };
}
ARK_EOF_3
node --check docs/gravitys-ark/ground.js && echo "syntax ok screen"
test "$(sha256sum docs/gravitys-ark/ground.js | cut -c1-16)" = "c7efd469517c680f" && echo OK docs/gravitys-ark/ground.js || echo FAILED docs/gravitys-ark/ground.js
```

4. The page's markup: the 3-D canvas, its size rule, the ground's three buttons, and the import map that resolves `three` for coldsnap's drawing. Every anchor is asserted; the hash line must print OK.

```sh
python3 - <<'ARK_EOF_4'
p = "docs/gravitys-ark/index.html"; s = open(p, encoding="utf-8").read()
reps = [
('  #zoom #seedB { width: auto; min-width: 60px; padding: 0 10px; font-size: 11px; letter-spacing: 0.12em; }\n',
 '  #zoom #seedB { width: auto; min-width: 60px; padding: 0 10px; font-size: 11px; letter-spacing: 0.12em; }\n  #gv { position: fixed; left: 0; top: 0; width: 100%; height: 100%; }\n'),
('<canvas id="cv"></canvas>\n', '<canvas id="cv"></canvas>\n<canvas id="gv" style="display:none"></canvas>\n'),
('<button id="hTakeoff">TAKE OFF</button></div>\n',
 '<button id="hTakeoff">TAKE OFF</button></div>\n<div id="groundBtns" style="display:none; position: fixed; right: 12px; bottom: max(16px, env(safe-area-inset-bottom)); grid-template-columns: repeat(2, minmax(92px, 1fr)); gap: 6px;"><button id="gKind">GUN</button><button id="gSound">SOUND ON</button><button id="gTakeoff">TAKE OFF</button></div>\n'),
('<script type="module" src="./main.js"></script>\n', '<script type="importmap">{ "imports": { "three": "../play/three.module.js" } }</script>\n<script type="module" src="./main.js"></script>\n'),
]
for old, new in reps:
    assert s.count(old) == 1, old[:60]
    s = s.replace(old, new)
open(p, "w", encoding="utf-8").write(s)
ARK_EOF_4
test "$(sha256sum docs/gravitys-ark/index.html | cut -c1-16)" = "f93f50c15a29bca9" && echo OK docs/gravitys-ark/index.html || echo FAILED docs/gravitys-ark/index.html
```

5. The page's hookup lines in the main file: the import, the flag, enter and leave, the draw and the steps, the pane and buttons, the zoom buttons, the dock pane, the ground's TAKE OFF. Every anchor is asserted; syntax check; the hash line must print OK.

```sh
python3 - <<'ARK_EOF_5'
p = "docs/gravitys-ark/main.js"; s = open(p, encoding="utf-8").read()
reps = [
('import { wireSeed } from "./seed.js";\n', 'import { wireSeed } from "./seed.js";\nimport { makeGroundScreen } from "./ground.js";\n'),
('let hold = null, view = "space", fieldTap = null;\nfunction enterHold(v) { hold = makeHold(hull, crew, v, holdRng); view = "hold"; fieldTap = null; state.events.push({ k: "on the ground at " + fmt(v, 1) + " m/s", t: state.t }); }\n',
 'let hold = null, view = "space", fieldTap = null;\n// phase 0.1.1: the ground on coldsnap, behind ?ground=1 until the hold is whole; the old hold stays the default until then\nconst groundOn = q.has("ground");\nconst GS = makeGroundScreen({ canvas: "gv", kind: "gKind", sound: "gSound", takeoff: "gTakeoff" }, { log: (line) => state.events.push({ k: line, t: state.t }) });\nfunction enterGround(v) { view = "ground"; fieldTap = null; GS.enter(seed, galaxy.worlds[ship.landed], hull.scrap); hull.scrap = 0; state.events.push({ k: "on the ground at " + fmt(v, 1) + " m/s", t: state.t }); }\nfunction leaveGround() { const r = GS.takeoff(); if (r.ok) hull.scrap += r.scrapKg; GS.leave(); view = "space"; }\nfunction enterHold(v) { if (groundOn) { enterGround(v); return; } hold = makeHold(hull, crew, v, holdRng); view = "hold"; fieldTap = null; state.events.push({ k: "on the ground at " + fmt(v, 1) + " m/s", t: state.t }); }\n'),
('function draw() {\n  if (view === "hold" && hold) { drawHold(); return; }\n', 'function draw() {\n  if (view === "ground") { GS.draw(frameDt); return; }\n  if (view === "hold" && hold) { drawHold(); return; }\n'),
('  const inHold = view === "hold" && hold; $("btns").style.display = inHold ? "none" : "grid"; $("holdBtns").style.display = inHold ? "grid" : "none"; if (inHold) { holdPane(); $("dock").style.display = "none"; }\n',
 '  const inGround = view === "ground";\n  const inHold = view === "hold" && hold; $("btns").style.display = inHold || inGround ? "none" : "grid"; $("holdBtns").style.display = inHold ? "grid" : "none"; $("groundBtns").style.display = inGround ? "grid" : "none"; if (inHold) { holdPane(); $("dock").style.display = "none"; }\n  if (inGround) { $("clocks").textContent = GS.pane(); GS.buttons(); $("dock").style.display = "none"; cv.style.display = "none"; } else cv.style.display = "block";\n'),
('$("zoomIn").onclick = () => { zi = Math.min(ZOOMS.length - 1, zi + 1); R.cam.z = ZOOMS[zi]; };\n$("zoomOut").onclick = () => { zi = Math.max(0, zi - 1); R.cam.z = ZOOMS[zi]; };\n',
 '$("zoomIn").onclick = () => { if (view === "ground") { GS.zoomIn(); return; } zi = Math.min(ZOOMS.length - 1, zi + 1); R.cam.z = ZOOMS[zi]; };\n$("zoomOut").onclick = () => { if (view === "ground") { GS.zoomOut(); return; } zi = Math.max(0, zi - 1); R.cam.z = ZOOMS[zi]; };\n'),
('const DT = 1 / 60; let last = performance.now(), acc = 0;\nfunction frame(now) {\n  acc += Math.min(0.05, (now - last) / 1000); last = now;\n',
 'const DT = 1 / 60; let last = performance.now(), acc = 0, frameDt = 0;\nfunction frame(now) {\n  frameDt = Math.min(0.05, (now - last) / 1000); acc += frameDt; last = now;\n'),
('      if (view === "hold" && hold) holdStep(); stepStations(S, DT); ship.dry = hullMass();\n',
 '      if (view === "ground") { GS.step(DT / 2); GS.step(DT / 2); }   // the war steps at coldsnap\'s own 1/120\n      if (view === "hold" && hold) holdStep(); stepStations(S, DT); ship.dry = hullMass();\n'),
('  $("dock").style.display = sid && view !== "hold" ? "block" : "none";\n  if (!sid || view === "hold") return;\n',
 '  $("dock").style.display = sid && view !== "hold" && view !== "ground" ? "block" : "none";\n  if (!sid || view === "hold" || view === "ground") return;\n'),
('$("hTakeoff").onclick = () => {', '$("gTakeoff").onclick = () => { if (view !== "ground") return; const t = road.takeoff(); if (!t.ok) { state.events.push({ k: "no takeoff: " + t.reason, t: state.t }); return; } if (t.collapse) collapseT = state.t; leaveGround(); };\n$("hTakeoff").onclick = () => {'),
]
for old, new in reps:
    assert s.count(old) == 1, old[:60]
    s = s.replace(old, new)
open(p, "w", encoding="utf-8").write(s)
ARK_EOF_5
node --check docs/gravitys-ark/main.js && echo "syntax ok main.js"
test "$(sha256sum docs/gravitys-ark/main.js | cut -c1-16)" = "3a37b4af977f82eb" && echo OK docs/gravitys-ark/main.js || echo FAILED docs/gravitys-ark/main.js
```

6. Two checks in the ark's gate: twin boots of the ground are twins in every hash after one tick; the hold's scrap is the purse, read before the first tick since the ground pays by the tick, a gun at the crash site spends it by coldsnap's build law, and what is left comes back up in kilograms. Both anchors are asserted; syntax check; the hash line must print OK.

```sh
python3 - <<'ARK_EOF_6'
p = "scripts/gravitys-ark-test.mjs"; s = open(p, encoding="utf-8").read()
reps = [
('import { makeHold, order, tick, summary, crashLoads, HOLD_DIALS } from "../src/games/gravitys-ark/hold.js";\n',
 'import { makeHold, order, tick, summary, crashLoads, HOLD_DIALS } from "../src/games/gravitys-ark/hold.js";\nimport { makeGround, order as groundOrder, tick as groundTick, hash as groundHash, GROUND_DIALS } from "../src/games/gravitys-ark/ground.js";\n'),
('console.log(`gravitys-ark-test: ${pass} PASS / ${fail} FAIL`);\n',
 '{ // 38. ark: the ground boots on coldsnap from the galaxy\'s seed, and twin boots are twins in every hash after one tick\n  // 39. ark: the hold\'s scrap is the purse, a gun at the crash site spends it by coldsnap\'s build law, and what is left comes back up in kilograms\n  const gSeed = rollSeed();\n  const g = makeGalaxy(gSeed), w = g.worlds[0];\n  const kg = 500 + Math.floor(rng() * 1000);\n  const A = makeGround(gSeed, w, kg), B = makeGround(gSeed, w, kg);\n  const purse0 = A.run.resources;   // read before the first tick: the ground pays by the tick\n  groundTick(A, 1 / 120); groundTick(B, 1 / 120);\n  check("ark: the ground boots on coldsnap from the galaxy\'s seed, and twin boots are twins in every hash", A.seed === B.seed && A.run.started === true && groundHash(A) === groundHash(B));\n  const purse1 = A.run.resources, f = A.run.focus;\n  let placed = null;\n  for (let dz = -8; dz <= 8 && !placed; dz += 2) for (let dx = -8; dx <= 8 && !placed; dx += 2) { const r = groundOrder(A, "gun", f.x + dx, f.z + dz, "mg"); if (r.ok) placed = r; }\n  const guns = A.world.bodies.filter((b) => b.alive && b.kind === "tower" && b.team === 1).length;\n  const up = groundOrder(A, "takeoff");\n  check("ark: the hold\'s scrap is the purse, a gun at the crash site spends it by coldsnap\'s build law, and what is left comes back up in kilograms",\n    purse0 === Math.floor(kg / GROUND_DIALS.kgPerScrap) && purse1 > purse0 && !!placed && placed.cost > 0 && Math.abs(A.run.resources - (purse1 - placed.cost)) < 1e-9 && guns === 1 && up.ok && up.scrapKg === A.run.resources * GROUND_DIALS.kgPerScrap);\n}\n\nconsole.log(`gravitys-ark-test: ${pass} PASS / ${fail} FAIL`);\n'),
]
for old, new in reps:
    assert s.count(old) == 1, old[:60]
    s = s.replace(old, new)
open(p, "w", encoding="utf-8").write(s)
ARK_EOF_6
node --check scripts/gravitys-ark-test.mjs && echo "syntax ok gate"
test "$(sha256sum scripts/gravitys-ark-test.mjs | cut -c1-16)" = "1b3b37289700fe12" && echo OK scripts/gravitys-ark-test.mjs || echo FAILED scripts/gravitys-ark-test.mjs
```

7. The parts source: the ground part and the ground screen part gain their files and this phase. The hash line must print OK.

```sh
python3 - <<'ARK_EOF_7'
p = "docs/parts/parts-source.json"; s = open(p, encoding="utf-8").read()
reps = [
('   "name": "the ground on coldsnap",\n   "does":', '   "name": "the ground on coldsnap",\n   "files": [\n    "src/games/gravitys-ark/ground.js"\n   ],\n   "gate": "gravitys-ark",\n   "phase": "0.1.1",\n   "does":'),
('   "name": "the ground screen",\n   "does":', '   "name": "the ground screen",\n   "files": [\n    "docs/gravitys-ark/ground.js"\n   ],\n   "phase": "0.1.1",\n   "does":'),
]
for old, new in reps:
    assert s.count(old) == 1, old[:40]
    s = s.replace(old, new)
open(p, "w", encoding="utf-8").write(s)
import json; json.loads(s)
ARK_EOF_7
test "$(sha256sum docs/parts/parts-source.json | cut -c1-16)" = "8f2d68a0a86be011" && echo OK docs/parts/parts-source.json || echo FAILED docs/parts/parts-source.json
```

8. Run the three gates that read what changed. The ark's gate must print 40 PASS lines, then `gravitys-ark-test: 40 PASS / 0 FAIL`, then `gravitys-ark-test PASS`; the other two must end in their PASS lines. Any FAIL stops the task here.

```sh
node scripts/gate.mjs gravitys-ark | tail -3
node scripts/gate.mjs manifest | tail -1
node scripts/gate.mjs parts | tail -1
```

9. The records: the README's line under the ark's ground bullet; the phase document's task row. Then the parts build over every gate, about four minutes; it must name 50 gates and every verdict must be ok.

```sh
python3 - <<'ARK_EOF_9'
p = "README.md"; s = open(p, encoding="utf-8").read()
old = "- **The ground:** the game opens on the crash world with the hull on broken welds and the walker dead; the Grip step out of the ring in waves that never stop; she fights or she fixes, never both; walls and guns in scrap; the mast's lob; the boss walker; TAKE OFF needs every surviving module welded.\n"
assert s.count(old) == 1, "ground bullet"
new = old + "- **The ground on coldsnap (phase 0.1.1, in progress; behind `?ground=1` in the address until the hold is whole):** the crash world is one of coldsnap's own war maps, made from the galaxy's seed, and the war on it is coldsnap's whole: its attacker with its brain, its books, and its bell, its guns placed by its build law on held ground, its drawing and its sound. The hold's scrap is the one purse, ten kilograms to one of coldsnap's scrap; what is left comes back up at TAKE OFF. The hull, her, the hands, and the walker come in the phase's later tasks.\n"
open(p, "w", encoding="utf-8").write(s.replace(old, new))
ph = "docs/plans/phase-0.1.1-the-hold.md"; s = open(ph, encoding="utf-8").read()
old = "the one purse, sound, TAKE OFF. SERVED. →"
assert s.count(old) == 1, "task row"
open(ph, "w", encoding="utf-8").write(s.replace(old, "the one purse, sound, TAKE OFF. LANDED, commit stamped below. →"))
ARK_EOF_9
test "$(sha256sum README.md | cut -c1-16)" = "051427586e2c156f" && echo OK README.md || echo FAILED README.md
node scripts/parts.mjs --gates all
node -e 'const t=require("./docs/parts/parts.json");const bad=Object.values(t.gates).filter(g=>g.verdict!=="ok").map(g=>g.name);console.log(Object.keys(t.gates).length+" gates, "+bad.length+" not ok"+(bad.length?": "+bad.join(", "):""));process.exit(bad.length?1:0)'
```

Required: `OK README.md`, a count line naming 50 gates, `50 gates, 0 not ok`.

10. Commit and push the landing, then stamp the task row with the real hash in a second small commit. Never amend after stamping.

```sh
git add src/games/gravitys-ark/ground.js docs/gravitys-ark/ground.js docs/gravitys-ark/index.html docs/gravitys-ark/main.js scripts/gravitys-ark-test.mjs docs/parts README.md docs/plans
git commit -m "phase 0.1.1 task 1 — the ground boots: coldsnap's war on the ark's page behind ?ground=1, guns by its build law, the one purse, its drawing and sound, TAKE OFF

The ark's ground layer and its screen in their own files; the page takes the hookup lines. Two checks in the ark's gate: twin boots twin in every hash; the purse and a gun by the build law.
gravitys-ark-test 40 PASS / 0 FAIL; manifest and parts green; the parts build over 50 gates, every verdict ok.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01QSq3kZC3Bk9SC5RwnqYUfs"
git push origin main
H=$(git rev-parse --short HEAD)
sed -i "s/TAKE OFF. LANDED, commit stamped below. →/TAKE OFF. LANDED, commit \`$H\`. →/" docs/plans/phase-0.1.1-the-hold.md
git add docs/plans && git commit -m "phase 0.1.1 task 1 row stamped — $H

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01QSq3kZC3Bk9SC5RwnqYUfs"
git push origin main
```

## Acceptance

- Step 0R, on the resume: six OK lines.
- Step 1, on a first run: `0`, `1`, five OK lines, `0`.
- Steps 2 through 7: six OK lines, `syntax ok` four times; on the resume, step 6 alone: one OK line and `syntax ok gate`.
- Step 8: `gravitys-ark-test: 40 PASS / 0 FAIL`, `gravitys-ark-test PASS`, `manifest-test PASS`, `parts-test PASS`.
- Step 9: `OK README.md`; the count line names 50 gates; `50 gates, 0 not ok`.
- Step 10: push accepted by origin; the stamp commit pushed.

After the landing the orchestrator republishes the page from `docs/parts/parts.html` to its fixed address and names it, with the ground's address, in the landing report.

## Report

Read-confirmation first, then one line of outcome, then bullets: step 8's lines verbatim; every OK line; the parts build's count line and the verdict line verbatim; both commit hashes; the push results. Every nonconformity its own labeled bullet. Fixture seeds: the seeds line the ark's gate printed in step 8, and the gravitys-ark seeds line from `docs/parts/parts.json` after the build; no seed is special.
