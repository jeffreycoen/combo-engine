# Task 0.1.1-4 — the walker

One job: her walker lies wrecked beside the hull at the crash; REPAIR WALKER sends her to the wreck and coldsnap's own mech stands there once her seconds run down, on her side at coldsnap's own scale; FIGHT with the walker up takes it through coldsnap's possession door, the stick and FIRE drive it, HOLD gives it back; the walker down ends her act; three checks in the ark's gate. The boss walker is coldsnap's attacker's own, fielded by its brain when its picks allow; nothing here adds it. Every edit is an anchored replacement checked by hash; write exactly what is written, run the listed gates, report. You design nothing.

Suggested model: Sonnet 5.

Required reading, in order (confirm at the top of your report):
1. This file, whole.
2. `docs/plans/phase-0.1.1-the-hold.md`, whole.

No demo file is read or written. Nothing under `/home/batman/coldsnap` is read, written, or run.

## Steps

Run from `/home/batman/combo-engine`. A failed assert, a wrong required value, or a FAILED hash line stops the task: report the step and its verbatim output, run nothing further. Never edit a file to make a hash match.

1. Assert the ground: the tracked files clean at task 3's landing, the five files this task edits at their landed hashes. The gates were recorded green at that landing and are not run again here.

```sh
git status --short | grep -v "^??" | wc -l
while read -r hash path; do test "$(sha256sum "$path" | cut -c1-16)" = "$hash" && echo "OK $path" || echo "FAILED $path"; done <<'GROUND'
7ebf4f860d02aef4 src/games/gravitys-ark/ground.js
7d1a9e67467a3102 docs/gravitys-ark/ground.js
f71f9b023e7d77ba docs/gravitys-ark/index.html
9825bb28bc66194d docs/gravitys-ark/main.js
c7545cf301d91a70 scripts/gravitys-ark-test.mjs
GROUND
```

Required: `0`, five OK lines.

2. The ground layer gains the walker: its dials, the wreck, the raising, its life, the stick, taking and leaving it, her repair of it, FIGHT in it, HOLD, FIRE, its fall, and the walker in the summary. Every anchor is asserted; syntax check; the hash line must print OK.

```sh
python3 - <<'ARK_EOF_2'
p = "src/games/gravitys-ark/ground.js"; s = open(p, encoding="utf-8").read()
reps = [
('// welds, her and the hands as troopers, the orders, the take-off. The page\'s\n// ground screen draws it. Every number here is PROPOSED.\n',
 '// welds, her and the hands as troopers, her walker, the orders, the take-off.\n// The page\'s ground screen draws it. Every number here is PROPOSED.\n'),
('import { stampBag } from "../../depot/boot.js";\n',
 'import { stampBag } from "../../depot/boot.js";\nimport { buildMech, mechCommand } from "../../engine/mech.js";\nimport { MECH } from "../../depot/specs.js";\n'),
('  return { seed: groundSeed(seed, w), war, run, world, input, events, cues, placement, dials: d, scrapKgIn: scrapKg, her: null, hands: [] };\n',
 '  return { seed: groundSeed(seed, w), war, run, world, input, events, cues, placement, dials: d, scrapKgIn: scrapKg, her: null, hands: [], walker: null, stick: { f: 0, l: 0, h: null } };\n'),
('// herBody(G): her living body, or null.\n',
 '// WALKER: hers, coldsnap\'s own mech at coldsnap\'s own scale, 5.4 m tall, two and a\n// half troopers; it lies wrecked beside the hull at the crash until she repairs it.\n// repair: her seconds at the wreck; spotX, spotZ: the wreck\'s spot from the bridge, in\n// metres; s: the scale. PROPOSED.\nexport const WALKER = { s: 1, repair: 10, spotX: 0, spotZ: -8 };\n\n// wreckWalker(G): the walker lies wrecked at its spot; nothing stands until she repairs it.\nexport function wreckWalker(G) {\n  const s0 = G.hull ? G.hull.slots[0] : { x: G.run.focus.x, z: G.run.focus.z };\n  G.walker = { mech: null, spot: { x: s0.x + WALKER.spotX, z: s0.z + WALKER.spotZ }, wrecked: true, alive: false, possessed: false };\n  return G.walker;\n}\n\n// raiseWalker(G): the repair\'s mechanism: coldsnap\'s mech built at the wreck\'s spot on the player\'s side, hers.\nexport function raiseWalker(G) {\n  const W = G.walker;\n  if (!W || W.mech) return null;\n  const m = buildMech(G.world, { x: W.spot.x, z: W.spot.z, yaw: 0, team: 1, hp: MECH.hp, s: WALKER.s });\n  m.thrustersOn = true; m.thrustAssist = true; m.hull.maxHp = MECH.hp;\n  W.mech = m; W.wrecked = false; W.alive = true;\n  return m;\n}\n\n// walkerAlive(G): the walker stands and lives.\nexport function walkerAlive(G) { const W = G.walker; return !!(W && W.mech && W.mech.hull.alive); }\n\n// setStick(G, f, l, h): the page\'s stick for the possessed walker: travel and lateral as fractions, heading in radians or null.\nexport function setStick(G, f, l, h) { G.stick.f = f; G.stick.l = l; G.stick.h = h; }\n\n// takeWalker / leaveWalker: she takes the walker through coldsnap\'s own possession door; the stick feeds its commands\nfunction takeWalker(G) {\n  const W = G.walker;\n  G.input.possess = { kind: "mech", id: W.mech.hull.id };\n  G.input.feedMech = (m) => { const s = G.stick; mechCommand(m, { travel: s.f, lateral: s.l, heading: s.h }); };\n  W.possessed = true;\n}\nfunction leaveWalker(G) {\n  G.input.possess = null; G.input.feedMech = null; G.input.fireHeld = false;\n  if (G.walker) G.walker.possessed = false;\n}\n\n// herBody(G): her living body, or null.\n'),
('  if (!b) { if (her.alive) { her.alive = false; out.push({ k: "herDead", t: G.world.t }); } }\n  else if (her.act === "fix" && her.target != null) {\n',
 '  const W = G.walker;\n  if (W && W.alive && !(W.mech && W.mech.hull.alive)) { W.alive = false; out.push({ k: "walkerDown", t: G.world.t }); if (W.possessed) leaveWalker(G); if (her.act === "walker") rest(); }\n  if (!b) { if (her.alive) { her.alive = false; out.push({ k: "herDead", t: G.world.t }); if (W && W.possessed) leaveWalker(G); } }\n  else if (her.act === "repairWalker" && W) {\n    if (Math.hypot(W.spot.x - b.pos.x, W.spot.z - b.pos.z) <= HER.reach + 2) {\n      her.actT -= dt;\n      if (her.actT <= 0) { raiseWalker(G); out.push({ k: "walkerUp", t: G.world.t }); rest(); }\n    }\n  }\n  else if (her.act === "fix" && her.target != null) {\n'),
('  if (kind === "fight") {   // she fights: she stands where she is and her sidearm answers\n    const b = herBody(G);\n    if (!b) return { ok: false, reason: "she is dead" };\n    const sq = G.her.squad;\n    sq.order = "defend"; sq.dest = null; sq._build = null; sq.holdFire = false;\n    G.her.act = "fight"; G.her.target = null; G.her.actT = 0;\n    G.events.push({ k: "fightHer", t: G.world.t });\n    return { ok: true };\n  }\n',
 '  if (kind === "fight") {   // she fights: in the walker when it stands, else where she is with her sidearm\n    const b = herBody(G);\n    if (!b) return { ok: false, reason: "she is dead" };\n    const sq = G.her.squad;\n    sq.order = "defend"; sq.dest = null; sq._build = null;\n    if (walkerAlive(G)) { takeWalker(G); sq.holdFire = true; G.her.act = "walker"; G.her.target = null; G.her.actT = 0; G.events.push({ k: "walkerTaken", t: G.world.t }); return { ok: true, walker: true }; }\n    sq.holdFire = false; G.her.act = "fight"; G.her.target = null; G.her.actT = 0;\n    G.events.push({ k: "fightHer", t: G.world.t });\n    return { ok: true, walker: false };\n  }\n  if (kind === "hold") {   // she stands down: out of the walker, her fire free, where she is\n    const b = herBody(G);\n    if (!b) return { ok: false, reason: "she is dead" };\n    if (G.walker && G.walker.possessed) leaveWalker(G);\n    const sq = G.her.squad;\n    sq.order = "defend"; sq.dest = null; sq._build = null; sq.holdFire = false;\n    G.her.act = "hold"; G.her.target = null; G.her.actT = 0;\n    return { ok: true };\n  }\n  if (kind === "repairWalker") {   // she raises the walker: she walks to the wreck and her seconds run down there\n    const b = herBody(G);\n    if (!b) return { ok: false, reason: "she is dead" };\n    if (!G.walker) return { ok: false, reason: "no walker here" };\n    if (walkerAlive(G)) return { ok: false, reason: "the walker stands" };\n    if (G.walker.possessed) leaveWalker(G);\n    const sq = G.her.squad;\n    sq.order = "move"; sq.dest = { x: G.walker.spot.x, z: G.walker.spot.z }; sq._route = null; sq._routeDest = null; sq._build = null; sq.holdFire = true;\n    G.her.act = "repairWalker"; G.her.target = null; G.her.actT = WALKER.repair;\n    G.events.push({ k: "repairWalker", t: G.world.t, seconds: WALKER.repair });\n    return { ok: true, seconds: WALKER.repair };\n  }\n  if (kind === "fire") { G.input.fireHeld = !!x; return { ok: true }; }\n'),
('  const her = G.her ? { alive: !!herBody(G), act: G.her.act, actT: G.her.actT } : null;\n',
 '  const her = G.her ? { alive: !!herBody(G), act: G.her.act, actT: G.her.actT } : null;\n  const walker = G.walker ? { wrecked: !G.walker.mech, alive: walkerAlive(G), hp: G.walker.mech ? G.walker.mech.hull.hp : 0, possessed: G.walker.possessed } : null;\n'),
('  return { t: world.t, bell: run.bell, bellIn: Math.max(0, run.bellAt - world.t), scrap: run.resources, scrapKg: run.resources * G.dials.kgPerScrap, foes, guns, modules, her, hands,\n',
 '  return { t: world.t, bell: run.bell, bellIn: Math.max(0, run.bellAt - world.t), scrap: run.resources, scrapKg: run.resources * G.dials.kgPerScrap, foes, guns, modules, her, hands, walker,\n'),
]
for old, new in reps:
    assert s.count(old) == 1, old[:60]
    s = s.replace(old, new)
open(p, "w", encoding="utf-8").write(s)
ARK_EOF_2
node --check src/games/gravitys-ark/ground.js && echo "syntax ok ground.js"
test "$(sha256sum src/games/gravitys-ark/ground.js | cut -c1-16)" = "0606a4bee2a65ad4" && echo OK src/games/gravitys-ark/ground.js || echo FAILED src/games/gravitys-ark/ground.js
```

3. The screen: the wreck at entry, the walker's events, the stick from keys or the left touch stick through the camera, the camera on the walker when she is in it, the pane's walker line, the REPAIR WALKER, HOLD, and FIRE buttons, the space bar. Every anchor is asserted; syntax check; the hash line must print OK.

```sh
python3 - <<'ARK_EOF_3'
p = "docs/gravitys-ark/ground.js"; s = open(p, encoding="utf-8").read()
reps = [
('// buttons; the hull crashes onto the ground at entry and she and the hands take\n// the field. The main file takes only the hookup lines.\n',
 '// buttons; the hull crashes onto the ground at entry, she and the hands take\n// the field, and her walker lies wrecked until she raises it. The main file\n// takes only the hookup lines.\n'),
('import { makeGround, crashHull, fieldCrew, order, tick, summary, price, GUNS } from "../../src/games/gravitys-ark/ground.js";\n',
 'import { makeGround, crashHull, fieldCrew, wreckWalker, setStick, order, tick, summary, price, GUNS } from "../../src/games/gravitys-ark/ground.js";\n'),
('    fieldCrew(G, crew || []);\n    say("she is on the ground" + (G.hands.length ? " with " + G.hands.map((h) => h.name).join(", ") : ", alone"));\n    mode = "gun"; wallStart = null;\n',
 '    fieldCrew(G, crew || []);\n    wreckWalker(G);\n    say("she is on the ground" + (G.hands.length ? " with " + G.hands.map((h) => h.name).join(", ") : ", alone") + "; the walker lies wrecked");\n    mode = "gun"; wallStart = null; held.clear(); stickVec = { x: 0, z: 0 }; setNub(0, 0);\n'),
('      else if (e.k === "herDead") say("SHE IS DEAD");\n',
 '      else if (e.k === "herDead") say("SHE IS DEAD");\n      else if (e.k === "repairWalker") say("she goes to the walker, " + fmt(e.seconds, 0) + " s of work");\n      else if (e.k === "walkerUp") say("the walker stands");\n      else if (e.k === "walkerTaken") say("she takes the walker");\n      else if (e.k === "walkerDown") say("the walker is down");\n'),
('  function draw(dt) { if (!G || !R) return; if (A) A.tick(G.world, dt); R.render(dt, focus, aim); }\n',
 '  // the stick for the walker: keys or the left touch stick, world-aligned through the camera, the play page\'s own law\n  const held = new Set();\n  addEventListener("keydown", (e) => { held.add(e.code); });\n  addEventListener("keyup", (e) => { held.delete(e.code); });\n  const stickEl = $(ids.stick), nub = $(ids.nub);\n  let stickVec = { x: 0, z: 0 }, stickId = null;\n  const setNub = (dx, dz) => { nub.style.transform = "translate(" + dx * 34 + "px," + dz * 34 + "px)"; };\n  stickEl.addEventListener("pointerdown", (e) => { stickId = e.pointerId; stickEl.setPointerCapture(stickId); });\n  stickEl.addEventListener("pointermove", (e) => {\n    if (e.pointerId !== stickId) return;\n    const r = stickEl.getBoundingClientRect();\n    let dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2), dz = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);\n    const m = Math.hypot(dx, dz); if (m > 1) { dx /= m; dz /= m; }\n    stickVec = { x: dx, z: dz }; setNub(dx, dz);\n  });\n  const stickEnd = (e) => { if (e.pointerId === stickId) { stickId = null; stickVec = { x: 0, z: 0 }; setNub(0, 0); } };\n  stickEl.addEventListener("pointerup", stickEnd); stickEl.addEventListener("pointercancel", stickEnd);\n  function feedStick() {\n    if (!G || !R || !(G.walker && G.walker.possessed)) return;\n    let sx = 0, sz = 0;\n    if (held.has("ArrowUp") || held.has("KeyW")) sz -= 1; if (held.has("ArrowDown") || held.has("KeyS")) sz += 1;\n    if (held.has("ArrowLeft") || held.has("KeyA")) sx -= 1; if (held.has("ArrowRight") || held.has("KeyD")) sx += 1;\n    if (sx === 0 && sz === 0) { sx = stickVec.x; sz = stickVec.z; }\n    const f = R.camBasis.fwd, rt = R.camBasis.right, fl = Math.hypot(f.x, f.z) || 1;\n    const vx = rt.x * sx + (f.x / fl) * -sz, vz = rt.z * sx + (f.z / fl) * -sz;\n    const mag = Math.min(1, Math.hypot(vx, vz));\n    setStick(G, mag, 0, mag > 0.1 ? Math.atan2(vx, vz) : null);\n  }\n  function draw(dt) { if (!G || !R) return; feedStick(); if (A) A.tick(G.world, dt); const s = summary(G); if (s.walker && s.walker.possessed && G.walker.mech) { const h = G.walker.mech.hull; focus = { x: h.pos.x, y: h.pos.y, z: h.pos.z }; } R.render(dt, focus, aim); }\n'),
('      "she: " + (s.her ? (s.her.alive ? s.her.act + (s.her.act === "fix" ? " " + fmt(s.her.actT, 1) + " s" : "") : "DEAD") : "not here") + "   hands " + s.hands.alive + " of " + s.hands.total,\n',
 '      "she: " + (s.her ? (s.her.alive ? (s.her.act === "walker" ? "in the walker" : s.her.act + (s.her.act === "fix" || s.her.act === "repairWalker" ? " " + fmt(s.her.actT, 1) + " s" : "")) : "DEAD") : "not here") + "   hands " + s.hands.alive + " of " + s.hands.total\n        + "   walker " + (s.walker ? (s.walker.wrecked ? "wrecked" : s.walker.alive ? fmt(s.walker.hp) + " hp" : "DOWN") : "none"),\n'),
('    $(ids.fix).disabled = !(s.her && s.her.alive && s.modules && s.modules.loose > 0);\n    $(ids.fight).disabled = !(s.her && s.her.alive);\n  }\n',
 '    $(ids.fix).disabled = !(s.her && s.her.alive && s.modules && s.modules.loose > 0);\n    $(ids.fight).disabled = !(s.her && s.her.alive);\n    $(ids.fight).textContent = s.walker && s.walker.alive ? "FIGHT: WALKER" : "FIGHT";\n    $(ids.repairWalker).disabled = !(s.her && s.her.alive && s.walker && !s.walker.alive);\n    $(ids.hold).disabled = !(s.her && s.her.alive);\n    $(ids.fire).disabled = !(s.walker && s.walker.possessed);\n    stickEl.style.display = s.walker && s.walker.possessed ? "block" : "none";\n  }\n  $(ids.repairWalker).onclick = () => { if (!G) return; const r = order(G, "repairWalker"); if (!r.ok) say("no repair: " + r.reason); };\n  $(ids.hold).onclick = () => { if (!G) return; const r = order(G, "hold"); if (!r.ok) say("no hold: " + r.reason); };\n  $(ids.fire).onpointerdown = (e) => { e.preventDefault(); if (G) order(G, "fire", true); };\n  addEventListener("pointerup", () => { if (G) order(G, "fire", false); });\n  addEventListener("keydown", (e) => { if (e.code === "Space" && G && G.walker && G.walker.possessed) { e.preventDefault(); order(G, "fire", true); } });\n  addEventListener("keyup", (e) => { if (e.code === "Space" && G) order(G, "fire", false); });\n'),
('  function leave() { if (R) { R.dispose(); R = null; } if (A) { A.dispose(); A = null; } gv.style.display = "none"; G = null; }\n',
 '  function leave() { if (R) { R.dispose(); R = null; } if (A) { A.dispose(); A = null; } gv.style.display = "none"; stickEl.style.display = "none"; G = null; }\n'),
]
for old, new in reps:
    assert s.count(old) == 1, old[:60]
    s = s.replace(old, new)
open(p, "w", encoding="utf-8").write(s)
ARK_EOF_3
node --check docs/gravitys-ark/ground.js && echo "syntax ok screen"
test "$(sha256sum docs/gravitys-ark/ground.js | cut -c1-16)" = "3988ca0a17488489" && echo OK docs/gravitys-ark/ground.js || echo FAILED docs/gravitys-ark/ground.js
```

4. The page's markup gains the three buttons and the touch stick, and the main file names them. Every anchor is asserted; syntax check on the main file; both hash lines must print OK.

```sh
python3 - <<'ARK_EOF_4'
p = "docs/gravitys-ark/index.html"; s = open(p, encoding="utf-8").read()
reps = [
('<button id="gKind">GUN</button><button id="gWall">WALL</button><button id="gFix">FIX</button><button id="gFight">FIGHT</button><button id="gSound">SOUND ON</button><button id="gTakeoff">TAKE OFF</button></div>\n',
 '<button id="gKind">GUN</button><button id="gWall">WALL</button><button id="gFix">FIX</button><button id="gRepairWalker">REPAIR WALKER</button><button id="gFight">FIGHT</button><button id="gHold">HOLD</button><button id="gFire">FIRE</button><button id="gSound">SOUND ON</button><button id="gTakeoff">TAKE OFF</button></div>\n<div id="gStick" style="display:none"><div id="gNub"></div></div>\n'),
('  #gv { position: fixed; left: 0; top: 0; width: 100%; height: 100%; }\n',
 '  #gv { position: fixed; left: 0; top: 0; width: 100%; height: 100%; }\n  #gStick { position: fixed; left: 18px; bottom: max(70px, calc(env(safe-area-inset-bottom) + 62px)); width: 108px; height: 108px; border-radius: 50%; border: 1.5px solid rgba(233,237,242,.35); background: rgba(7,9,13,.25); touch-action: none; }\n  #gNub { position: absolute; left: 50%; top: 50%; width: 40px; height: 40px; margin: -20px 0 0 -20px; border-radius: 50%; background: rgba(233,237,242,.5); }\n'),
]
for old, new in reps:
    assert s.count(old) == 1, old[:60]
    s = s.replace(old, new)
open(p, "w", encoding="utf-8").write(s)
p = "docs/gravitys-ark/main.js"; s = open(p, encoding="utf-8").read()
old = 'const GS = makeGroundScreen({ canvas: "gv", kind: "gKind", wall: "gWall", fix: "gFix", fight: "gFight", sound: "gSound", takeoff: "gTakeoff" }, { log: (line) => state.events.push({ k: line, t: state.t }) });\n'
assert s.count(old) == 1, "screen maker"
open(p, "w", encoding="utf-8").write(s.replace(old, 'const GS = makeGroundScreen({ canvas: "gv", kind: "gKind", wall: "gWall", fix: "gFix", fight: "gFight", repairWalker: "gRepairWalker", hold: "gHold", fire: "gFire", stick: "gStick", nub: "gNub", sound: "gSound", takeoff: "gTakeoff" }, { log: (line) => state.events.push({ k: line, t: state.t }) });\n'))
ARK_EOF_4
node --check docs/gravitys-ark/main.js && echo "syntax ok main.js"
test "$(sha256sum docs/gravitys-ark/index.html | cut -c1-16)" = "48b9b50a33048d70" && echo OK docs/gravitys-ark/index.html || echo FAILED docs/gravitys-ark/index.html
test "$(sha256sum docs/gravitys-ark/main.js | cut -c1-16)" = "4912e2226f41c8ff" && echo OK docs/gravitys-ark/main.js || echo FAILED docs/gravitys-ark/main.js
```

5. Three checks in the ark's gate. Both anchors are asserted; syntax check; the hash line must print OK.

```sh
python3 - <<'ARK_EOF_5'
p = "scripts/gravitys-ark-test.mjs"; s = open(p, encoding="utf-8").read()
reps = [
('import { makeGround, order as groundOrder, tick as groundTick, hash as groundHash, GROUND_DIALS, crashHull, looseModules, weldBack, HULL_DIALS, fieldCrew, herBody, stepHer, HER } from "../src/games/gravitys-ark/ground.js";\n',
 'import { makeGround, order as groundOrder, tick as groundTick, hash as groundHash, GROUND_DIALS, crashHull, looseModules, weldBack, HULL_DIALS, fieldCrew, herBody, stepHer, HER, wreckWalker, walkerAlive, setStick, WALKER } from "../src/games/gravitys-ark/ground.js";\n'),
('console.log(`gravitys-ark-test: ${pass} PASS / ${fail} FAIL`);\n',
 '{ // 45. ark: the walker lies wrecked at the crash and stands once her seconds at the wreck run down, coldsnap\'s own mech on her side, and twin raisings agree\n  // 46. ark: FIGHT with the walker up takes it through coldsnap\'s possession door, the stick feeds its commands, and HOLD gives it back\n  // 47. ark: the walker down comes back as its event, her act ends, and the possession is released\n  const gSeed = rollSeed(), g = makeGalaxy(gSeed), w = g.worlds[0];\n  const mk = () => { const G = makeGround(gSeed, w, 900); crashHull(G, makeHull(STARTER_HULL), 10); fieldCrew(G, []); wreckWalker(G); return G; };\n  const raise = (G) => { const r = groundOrder(G, "repairWalker"); const b = herBody(G); b.pos.x = G.walker.spot.x + 1; b.pos.z = G.walker.spot.z; const ev = stepHer(G, r.seconds); return { r, ev }; };\n  const A = mk(), B = mk();\n  const wrecked = !!A.walker && A.walker.wrecked && !walkerAlive(A) && A.walker.mech === null;\n  const ra = raise(A), rb = raise(B);\n  const hull = A.walker.mech ? A.walker.mech.hull : null;\n  check("ark: the walker lies wrecked at the crash and stands once her seconds at the wreck run down, coldsnap\'s own mech on her side, and twin raisings agree",\n    wrecked && ra.r.ok && ra.r.seconds === WALKER.repair && A.her.act === "hold" && ra.ev.some((e) => e.k === "walkerUp") && walkerAlive(A) && hull.team === 1 && A.walker.mech.s === WALKER.s\n    && A.world.mechs.includes(A.walker.mech) && rb.ev.some((e) => e.k === "walkerUp") && JSON.stringify([hull.pos.x, hull.pos.y, hull.pos.z]) === JSON.stringify([B.walker.mech.hull.pos.x, B.walker.mech.hull.pos.y, B.walker.mech.hull.pos.z]));\n  const fight = groundOrder(A, "fight");\n  setStick(A, 0.8, 0, 0.5);\n  A.input.feedMech(A.walker.mech, 1 / 120);\n  const driven = A.walker.mech.state.cmdT.f === 0.8 && A.walker.mech.state.headingT === 0.5;\n  const possessed = fight.ok && fight.walker === true && A.input.possess && A.input.possess.kind === "mech" && A.input.possess.id === hull.id && A.her.act === "walker" && A.her.squad.holdFire === true && A.walker.possessed === true;\n  const hold = groundOrder(A, "hold");\n  check("ark: FIGHT with the walker up takes it through coldsnap\'s possession door, the stick feeds its commands, and HOLD gives it back",\n    possessed && driven && hold.ok && A.input.possess === null && A.input.feedMech === null && A.walker.possessed === false && A.her.act === "hold" && A.her.squad.holdFire === false);\n  groundOrder(A, "fight");\n  hull.alive = false; hull.hp = 0;\n  const down = stepHer(A, 1 / 120);\n  check("ark: the walker down comes back as its event, her act ends, and the possession is released",\n    down.some((e) => e.k === "walkerDown") && !walkerAlive(A) && A.walker.alive === false && A.input.possess === null && A.her.act === "hold");\n}\n\nconsole.log(`gravitys-ark-test: ${pass} PASS / ${fail} FAIL`);\n'),
]
for old, new in reps:
    assert s.count(old) == 1, old[:60]
    s = s.replace(old, new)
open(p, "w", encoding="utf-8").write(s)
ARK_EOF_5
node --check scripts/gravitys-ark-test.mjs && echo "syntax ok gate"
test "$(sha256sum scripts/gravitys-ark-test.mjs | cut -c1-16)" = "fd6fe591e7de65a6" && echo OK scripts/gravitys-ark-test.mjs || echo FAILED scripts/gravitys-ark-test.mjs
```

6. Run the three gates that read what changed. The ark's gate must print 48 PASS lines, then `gravitys-ark-test: 48 PASS / 0 FAIL`, then `gravitys-ark-test PASS`; the other two must end in their PASS lines. Any FAIL stops the task here.

```sh
node scripts/gate.mjs gravitys-ark > /tmp/ark-gate.txt; tail -3 /tmp/ark-gate.txt; grep -m1 '^seeds' /tmp/ark-gate.txt
node scripts/gate.mjs manifest | tail -1
node scripts/gate.mjs parts | tail -1
```

7. The records: the phase document's task row. Then the parts build over every gate, about four minutes; it must name 50 gates and every verdict must be ok.

```sh
python3 - <<'ARK_EOF_7'
ph = "docs/plans/phase-0.1.1-the-hold.md"; s = open(ph, encoding="utf-8").read()
old = "the boss on the enemy's side; the stance measured. DISPATCHED. →"
assert s.count(old) == 1, "task row"
open(ph, "w", encoding="utf-8").write(s.replace(old, "the boss on the enemy's side; the stance measured. LANDED, commit stamped below. →"))
ARK_EOF_7
node scripts/parts.mjs --gates all
node -e 'const t=require("./docs/parts/parts.json");const bad=Object.values(t.gates).filter(g=>g.verdict!=="ok").map(g=>g.name);console.log(Object.keys(t.gates).length+" gates, "+bad.length+" not ok"+(bad.length?": "+bad.join(", "):""));process.exit(bad.length?1:0)'
```

Required: a count line naming 50 gates, `50 gates, 0 not ok`.

8. Commit and push the landing, then stamp the task row with the real hash in a second small commit. Never amend after stamping.

```sh
git add src/games/gravitys-ark/ground.js docs/gravitys-ark/ground.js docs/gravitys-ark/index.html docs/gravitys-ark/main.js scripts/gravitys-ark-test.mjs docs/parts docs/plans
git commit -m "phase 0.1.1 task 4 — the walker: wrecked at the crash, raised by her seconds, coldsnap's own mech on her side, taken through the possession door, driven by the stick, FIRE, HOLD

The boss is coldsnap's attacker's own walker, fielded by its brain. Three checks in the ark's gate.
gravitys-ark-test 48 PASS / 0 FAIL; manifest and parts green; the parts build over 50 gates, every verdict ok.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01QSq3kZC3Bk9SC5RwnqYUfs"
git push origin main
H=$(git rev-parse --short HEAD)
sed -i "s/the boss on the enemy's side; the stance measured. LANDED, commit stamped below. →/the boss on the enemy's side; the stance measured. LANDED, commit \`$H\`. →/" docs/plans/phase-0.1.1-the-hold.md
git add docs/plans && git commit -m "phase 0.1.1 task 4 row stamped — $H

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01QSq3kZC3Bk9SC5RwnqYUfs"
git push origin main
```

## Acceptance

- Step 1: `0`, five OK lines.
- Steps 2 through 5: five OK lines, `syntax ok` four times.
- Step 6: `gravitys-ark-test: 48 PASS / 0 FAIL`, `gravitys-ark-test PASS`, a seeds line, `manifest-test PASS`, `parts-test PASS`.
- Step 7: the count line names 50 gates; `50 gates, 0 not ok`.
- Step 8: push accepted by origin; the stamp commit pushed.

After the landing the orchestrator republishes the page from `docs/parts/parts.html` to its fixed address and names it in the landing report.

## Report

Read-confirmation first, then one line of outcome, then bullets: step 6's lines verbatim; every OK line; the parts build's count line and the verdict line verbatim; both commit hashes; the push results. Every nonconformity its own labeled bullet. Fixture seeds: the seeds line the ark's gate printed in step 6, and the gravitys-ark seeds line from `docs/parts/parts.json` after the build; no seed is special.
