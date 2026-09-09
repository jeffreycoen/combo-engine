# Task 0.1.1-3 — her and the hands

One job: she takes the field as a squad of one on her own row, installed into coldsnap's tables at the boot; the hands take it as rifle squads by name; FIX sends her to the nearest loose module and the weld-back lands when her seconds run down within reach; FIGHT frees her fire; WALL gives her squad coldsnap's build line; three checks in the ark's gate. Every edit is an anchored replacement checked by hash; write exactly what is written, run the listed gates, report. You design nothing.

Suggested model: Sonnet 5.

Required reading, in order (confirm at the top of your report):
1. This file, whole.
2. `docs/plans/phase-0.1.1-the-hold.md`, whole.

No demo file is read or written. Nothing under `/home/batman/coldsnap` is read, written, or run.

## Steps

Run from `/home/batman/combo-engine`. A failed assert, a wrong required value, or a FAILED hash line stops the task: report the step and its verbatim output, run nothing further. Never edit a file to make a hash match.

1. Assert the ground: the tracked files clean at task 2's landing, the five files this task edits at their landed hashes. The gates were recorded green at that landing and are not run again here.

```sh
git status --short | grep -v "^??" | wc -l
while read -r hash path; do test "$(sha256sum "$path" | cut -c1-16)" = "$hash" && echo "OK $path" || echo "FAILED $path"; done <<'GROUND'
24be72c5620ba2be src/games/gravitys-ark/ground.js
d1395365054c75bc docs/gravitys-ark/ground.js
f93f50c15a29bca9 docs/gravitys-ark/index.html
8b72a0767f5499bd docs/gravitys-ark/main.js
fe7d183f1fbb9276 scripts/gravitys-ark-test.mjs
GROUND
```

Required: `0`, five OK lines.

2. The ground layer gains her and the hands: her row and arms installed at the boot, the crew fielded, her body, her step, the FIX, FIGHT, and WALL orders, the build-line driver, her and the hands in the summary. Every anchor is asserted; syntax check; the hash line must print OK.

```sh
python3 - <<'ARK_EOF_2'
p = "src/games/gravitys-ark/ground.js"; s = open(p, encoding="utf-8").read()
reps = [
('// world seed, the one purse the hold\'s scrap feeds, the hull as bodies on\n// welds, the orders, the take-off. The page\'s ground screen draws it. Every\n// number here is PROPOSED.\n',
 '// world seed, the one purse the hold\'s scrap feeds, the hull as bodies on\n// welds, her and the hands as troopers, the orders, the take-off. The page\'s\n// ground screen draws it. Every number here is PROPOSED.\n'),
('import { MODULES } from "./stations.js";\n',
 'import { MODULES } from "./stations.js";\nimport { makeSquad, SQUAD_SPECS } from "../../depot/squads.js";\nimport { spawnSquadMembers } from "../../depot/state.js";\nimport { INFANTRY_ARMS } from "../../depot/specs.js";\nimport { startBuildLine, stepBuildLine } from "../../depot/buildlines.js";\nimport { stampBag } from "../../depot/boot.js";\n'),
('  const placement = makePlacement({ world, run, view: {}, input, map: war.map, grid: war.grid, field: war.field, T: war.T, R: null, dev: false,\n    toast: (text) => say("toast", { text }), cue, setHud: () => {}, nextApcSeq: () => ++war.seq.apc, depotP, recomputeFlow });\n  return { seed: groundSeed(seed, w), war, run, world, input, events, cues, placement, dials: d, scrapKgIn: scrapKg };\n',
 '  const placement = makePlacement({ world, run, view: {}, input, map: war.map, grid: war.grid, field: war.field, T: war.T, R: null, dev: false,\n    toast: (text) => say("toast", { text }), cue, setHud: () => {}, nextApcSeq: () => ++war.seq.apc, depotP, recomputeFlow });\n  // the build-line driver: her squad lays walls along a two-point line by coldsnap\'s own law, paid from the one purse\n  const buildCtx = { objG, recomputeFlow, stampBag: (b, side) => stampBag(war.grid, b, side), setMines: () => {} };\n  input.stepBuildLine = (sq) => stepBuildLine(world, war.grid, war.field, war.T, run, sq, buildCtx, (text) => say("toast", { text }), war.map);\n  return { seed: groundSeed(seed, w), war, run, world, input, events, cues, placement, dials: d, scrapKgIn: scrapKg, her: null, hands: [] };\n'),
('// joined(G): the modules joined to the bridge through unbroken welds between living modules.\n',
 '// HER: her row and her arms, installed into coldsnap\'s tables at the ground\'s boot so\n// its copies stay verbatim; her sidearm is the hunter\'s, her body the one MAN row.\n// reach: how close she must stand to a module to work on it; repairBase and\n// repairPerM: the weld-back\'s seconds, plus seconds per metre the module slid;\n// standOff: where she and the hands stand from the bridge at the crash. All PROPOSED.\nexport const HER = {\n  squad: { n: 1, cost: 0, speed: 3.2, label: "THE ENGINEER" },\n  arms: { projSpeed: 80, kind: "mg", weapon: "sidearms", dmg: 5, dirDmg: 11, burst: 2, burstGap: 0.10, fireRate: 0.8, range: 12, acc: 0.075, occl: "arc", windF: 0.06, windComp: 0.6 },\n  reach: 2.5, repairBase: 5, repairPerM: 1.5, standOff: 4,\n};\nexport function installHer() { SQUAD_SPECS.her = { ...HER.squad }; INFANTRY_ARMS.her = { ...HER.arms }; }\n\n// fieldCrew(G, crew): she stands off the bridge as a squad of one on her own row; the\n// hands stand as rifle squads of up to four, each man carrying his name.\nexport function fieldCrew(G, crew) {\n  installHer();\n  const { run, world } = G, H = G.hull, d = HER;\n  const at = H ? H.slots[0] : { x: run.focus.x, z: run.focus.z };\n  const squad = makeSquad(run.nextSquadId++, "her", 1, at.x, at.z + d.standOff);\n  spawnSquadMembers(world, squad); run.squads.push(squad);\n  const names = (crew || []).map((h) => h.name), hands = [];\n  for (let k = 0; k < names.length; k += 4) {\n    const some = names.slice(k, k + 4);\n    const sq = makeSquad(run.nextSquadId++, "rifles", 1, at.x, at.z - d.standOff - 2 * (k / 4));\n    spawnSquadMembers(world, sq, some.length); run.squads.push(sq);\n    sq.memberIds.forEach((id, j) => { const u = world.byId.get(id); if (u) u.handName = some[j]; hands.push({ id, name: some[j], alive: true }); });\n  }\n  G.her = { squad, act: "hold", target: null, actT: 0, alive: true };\n  G.hands = hands;\n  return G.her;\n}\n\n// herBody(G): her living body, or null.\nexport function herBody(G) {\n  const id = G.her && G.her.squad.memberIds[0];\n  const b = id != null ? G.world.byId.get(id) : null;\n  return b && b.alive ? b : null;\n}\n\n// stepHer(G, dt): her act. Fixing, she stands within reach of her module and the\n// seconds run down, then the weld-back; a wall order ends when the line is laid. The\n// hands\' deaths and hers come back as events by name.\nexport function stepHer(G, dt) {\n  const out = [], her = G.her;\n  if (!her) return out;\n  const b = herBody(G);\n  const rest = () => { her.act = "hold"; her.target = null; her.squad.holdFire = false; if (her.squad.order === "move") { her.squad.order = "defend"; her.squad.dest = null; } };\n  if (!b) { if (her.alive) { her.alive = false; out.push({ k: "herDead", t: G.world.t }); } }\n  else if (her.act === "fix" && her.target != null) {\n    const m = G.hull.bodies[her.target];\n    if (!m.alive) rest();\n    else if (Math.hypot(m.pos.x - b.pos.x, m.pos.z - b.pos.z) <= HER.reach) {\n      her.actT -= dt;\n      if (her.actT <= 0) { weldBack(G, her.target); out.push({ k: "repaired", t: G.world.t, module: G.hull.list[her.target].t }); rest(); }\n    }\n  } else if (her.act === "wall" && !her.squad._build) rest();\n  for (const h of G.hands) { if (!h.alive) continue; const u = G.world.byId.get(h.id); if (!u || !u.alive) { h.alive = false; out.push({ k: "handDead", t: G.world.t, name: h.name }); } }\n  return out;\n}\n\n// joined(G): the modules joined to the bridge through unbroken welds between living modules.\n'),
('  if (kind === "takeoff") {\n    const out = { ok: true, scrapKg: run.resources * G.dials.kgPerScrap, lost: [], keptList: null, abandoned: false };\n',
 '  if (kind === "fix") {   // she fixes: she walks to the nearest loose module and welds it back, her fire held meanwhile\n    const b = herBody(G);\n    if (!b) return { ok: false, reason: "she is dead" };\n    const loose = looseModules(G);\n    if (!loose.length) return { ok: false, reason: "nothing loose" };\n    let best = null, bd = Infinity;\n    for (const i of loose) { const m = G.hull.bodies[i]; const dd = Math.hypot(m.pos.x - b.pos.x, m.pos.z - b.pos.z); if (dd < bd) { bd = dd; best = i; } }\n    const m = G.hull.bodies[best], sq = G.her.squad;\n    sq.order = "move"; sq.dest = { x: m.pos.x, z: m.pos.z }; sq._route = null; sq._routeDest = null; sq._build = null; sq.holdFire = true;\n    const slid = Math.hypot(m.pos.x - G.hull.slots[best].x, m.pos.z - G.hull.slots[best].z);\n    G.her.act = "fix"; G.her.target = best; G.her.actT = HER.repairBase + HER.repairPerM * slid;\n    G.events.push({ k: "fix", t: G.world.t, module: G.hull.list[best].t, seconds: G.her.actT });\n    return { ok: true, target: best, seconds: G.her.actT };\n  }\n  if (kind === "fight") {   // she fights: she stands where she is and her sidearm answers\n    const b = herBody(G);\n    if (!b) return { ok: false, reason: "she is dead" };\n    const sq = G.her.squad;\n    sq.order = "defend"; sq.dest = null; sq._build = null; sq.holdFire = false;\n    G.her.act = "fight"; G.her.target = null; G.her.actT = 0;\n    G.events.push({ k: "fightHer", t: G.world.t });\n    return { ok: true };\n  }\n  if (kind === "wall") {   // she lays a wall from (x, z) to which, by coldsnap\'s build line, one purse\n    const b = herBody(G);\n    if (!b) return { ok: false, reason: "she is dead" };\n    if (!which || typeof which.x !== "number") return { ok: false, reason: "no end" };\n    const sq = G.her.squad;\n    startBuildLine(war.grid, sq, "walls", { x, z }, { x: which.x, z: which.z }, (text) => G.events.push({ k: "toast", t: G.world.t, text }), 1);\n    sq.holdFire = true; G.her.act = "wall"; G.her.target = null; G.her.actT = 0;\n    return { ok: true, sections: sq._build.rows.length };\n  }\n  if (kind === "takeoff") {\n    const out = { ok: true, scrapKg: run.resources * G.dials.kgPerScrap, lost: [], keptList: null, abandoned: false };\n'),
('export function tick(G, dt) {\n  const r = tickWar(G.war, dt, G.input);\n  return { events: r.events, flags: r.flags, cues: G.cues.splice(0) };\n}\n',
 'export function tick(G, dt) {\n  const r = tickWar(G.war, dt, G.input);\n  for (const e of stepHer(G, dt)) G.events.push(e);\n  return { events: r.events, flags: r.flags, cues: G.cues.splice(0) };\n}\n'),
('  return { t: world.t, bell: run.bell, bellIn: Math.max(0, run.bellAt - world.t), scrap: run.resources, scrapKg: run.resources * G.dials.kgPerScrap, foes, guns, modules,\n    standing: H ? alive / H.bodies.length : (run.depotStanding == null ? 1 : run.depotStanding), lost: !!(H && !H.bodies[0].alive), warOver: !!run.gameOver };\n',
 '  const her = G.her ? { alive: !!herBody(G), act: G.her.act, actT: G.her.actT } : null;\n  const hands = { alive: G.hands.filter((h) => h.alive).length, total: G.hands.length };\n  return { t: world.t, bell: run.bell, bellIn: Math.max(0, run.bellAt - world.t), scrap: run.resources, scrapKg: run.resources * G.dials.kgPerScrap, foes, guns, modules, her, hands,\n    standing: H ? alive / H.bodies.length : (run.depotStanding == null ? 1 : run.depotStanding), lost: !!(H && !H.bodies[0].alive), warOver: !!run.gameOver };\n'),
]
for old, new in reps:
    assert s.count(old) == 1, old[:60]
    s = s.replace(old, new)
open(p, "w", encoding="utf-8").write(s)
ARK_EOF_2
node --check src/games/gravitys-ark/ground.js && echo "syntax ok ground.js"
test "$(sha256sum src/games/gravitys-ark/ground.js | cut -c1-16)" = "7ebf4f860d02aef4" && echo OK src/games/gravitys-ark/ground.js || echo FAILED src/games/gravitys-ark/ground.js
```

3. The screen: the crew take the field at entry, her and the hands in the pane, the WALL, FIX, and FIGHT buttons, the wall's two taps, her events in the log. Every anchor is asserted; syntax check; the hash line must print OK.

```sh
python3 - <<'ARK_EOF_3'
p = "docs/gravitys-ark/ground.js"; s = open(p, encoding="utf-8").read()
reps = [
('// buttons; the hull crashes onto the ground at entry. The main file takes only\n// the hookup lines.\n',
 '// buttons; the hull crashes onto the ground at entry and she and the hands take\n// the field. The main file takes only the hookup lines.\n'),
('import { makeGround, crashHull, order, tick, summary, price, GUNS } from "../../src/games/gravitys-ark/ground.js";\n',
 'import { makeGround, crashHull, fieldCrew, order, tick, summary, price, GUNS } from "../../src/games/gravitys-ark/ground.js";\n'),
('  let G = null, R = null, A = null, focus = null, aim = null, zoom = 1, gunI = 1, muted = false;\n',
 '  let G = null, R = null, A = null, focus = null, aim = null, zoom = 1, gunI = 1, muted = false, mode = "gun", wallStart = null;\n'),
('  function enter(seed, w, scrapKg, hull, v) {\n    G = makeGround(seed, w, scrapKg);\n    const H = crashHull(G, hull, v);\n    say("the hull is down: " + H.bodies.length + " modules, " + H.loose.length + " loose");\n',
 '  function enter(seed, w, scrapKg, hull, v, crew) {\n    G = makeGround(seed, w, scrapKg);\n    const H = crashHull(G, hull, v);\n    say("the hull is down: " + H.bodies.length + " modules, " + H.loose.length + " loose");\n    fieldCrew(G, crew || []);\n    say("she is on the ground" + (G.hands.length ? " with " + G.hands.map((h) => h.name).join(", ") : ", alone"));\n    mode = "gun"; wallStart = null;\n'),
('    for (const e of G.events.splice(0)) { if (e.k === "toast") say(String(e.text).toLowerCase()); else if (e.k === "gun") say(TOWER_SPECS[e.key].label.toLowerCase() + " placed for " + e.cost + " scrap"); }\n',
 '    for (const e of G.events.splice(0)) {\n      if (e.k === "toast") say(String(e.text).toLowerCase());\n      else if (e.k === "gun") say(TOWER_SPECS[e.key].label.toLowerCase() + " placed for " + e.cost + " scrap");\n      else if (e.k === "fix") say("she goes to the " + e.module + ", " + fmt(e.seconds, 1) + " s of welding");\n      else if (e.k === "fightHer") say("she stands and fights");\n      else if (e.k === "repaired") say("the " + e.module + " is welded back");\n      else if (e.k === "herDead") say("SHE IS DEAD");\n      else if (e.k === "handDead") say(e.name + " is dead");\n    }\n'),
('      "modules " + (s.modules ? s.modules.alive + " of " + s.modules.total + " standing, " + s.modules.loose + " loose" : "none") + "   the hull stands " + fmt(s.standing * 100, 0) + "%" + (s.lost ? "   THE BRIDGE IS LOST" : ""),\n      "tap the ground to place a " + TOWER_SPECS[kind()].label.toLowerCase() + " for " + fmt(price(G, kind())) + " scrap; two fingers turn and zoom"].join("\\n");\n',
 '      "modules " + (s.modules ? s.modules.alive + " of " + s.modules.total + " standing, " + s.modules.loose + " loose" : "none") + "   the hull stands " + fmt(s.standing * 100, 0) + "%" + (s.lost ? "   THE BRIDGE IS LOST" : ""),\n      "she: " + (s.her ? (s.her.alive ? s.her.act + (s.her.act === "fix" ? " " + fmt(s.her.actT, 1) + " s" : "") : "DEAD") : "not here") + "   hands " + s.hands.alive + " of " + s.hands.total,\n      mode === "wall" ? (wallStart ? "tap where the wall ends" : "tap where the wall starts") : "tap the ground to place a " + TOWER_SPECS[kind()].label.toLowerCase() + " for " + fmt(price(G, kind())) + " scrap; two fingers turn and zoom"].join("\\n");\n'),
('    $(ids.takeoff).disabled = summary(G).lost;\n  }\n',
 '    const s = summary(G);\n    $(ids.takeoff).disabled = s.lost;\n    $(ids.wall).textContent = mode === "wall" ? (wallStart ? "WALL: END" : "WALL: START") : "WALL";\n    $(ids.fix).disabled = !(s.her && s.her.alive && s.modules && s.modules.loose > 0);\n    $(ids.fight).disabled = !(s.her && s.her.alive);\n  }\n  $(ids.wall).onclick = () => { mode = mode === "wall" ? "gun" : "wall"; wallStart = null; buttons(); };\n  $(ids.fix).onclick = () => { if (!G) return; const r = order(G, "fix"); if (!r.ok) say("no fix: " + r.reason); };\n  $(ids.fight).onclick = () => { if (!G) return; const r = order(G, "fight"); if (!r.ok) say("no fight: " + r.reason); };\n'),
('    tap: (x, y) => { if (!G || !R) return; if (A) A.ensure(); const p = screenToGround(x, y); aim = { x: p.x, z: p.z }; const r = order(G, "gun", p.x, p.z, kind()); if (!r.ok) say("no " + TOWER_SPECS[kind()].label.toLowerCase() + ": " + String(r.reason).toLowerCase()); },\n',
 '    tap: (x, y) => {\n      if (!G || !R) return;\n      if (A) A.ensure();\n      const p = screenToGround(x, y); aim = { x: p.x, z: p.z };\n      if (mode === "wall") {\n        if (!wallStart) { wallStart = p; buttons(); return; }\n        const r = order(G, "wall", wallStart.x, wallStart.z, p); wallStart = null; mode = "gun"; buttons();\n        say(r.ok ? "she lays a wall of " + r.sections + " sections" : "no wall: " + r.reason);\n        return;\n      }\n      const r = order(G, "gun", p.x, p.z, kind()); if (!r.ok) say("no " + TOWER_SPECS[kind()].label.toLowerCase() + ": " + String(r.reason).toLowerCase());\n    },\n'),
('  return { enter, leave, step, draw, pane, buttons, active: () => !!G, lost: () => !!(G && summary(G).lost),\n',
 '  return { enter, leave, step, draw, pane, buttons, active: () => !!G, lost: () => !!(G && summary(G).lost), herDead: () => !!(G && G.her && !G.her.alive),\n'),
]
for old, new in reps:
    assert s.count(old) == 1, old[:60]
    s = s.replace(old, new)
open(p, "w", encoding="utf-8").write(s)
ARK_EOF_3
node --check docs/gravitys-ark/ground.js && echo "syntax ok screen"
test "$(sha256sum docs/gravitys-ark/ground.js | cut -c1-16)" = "7d1a9e67467a3102" && echo OK docs/gravitys-ark/ground.js || echo FAILED docs/gravitys-ark/ground.js
```

4. The page's markup gains the three buttons, and the main file hands the crew down and takes her death. Every anchor is asserted; syntax check on the main file; both hash lines must print OK.

```sh
python3 - <<'ARK_EOF_4'
p = "docs/gravitys-ark/index.html"; s = open(p, encoding="utf-8").read()
old = '<button id="gKind">GUN</button><button id="gSound">SOUND ON</button><button id="gTakeoff">TAKE OFF</button></div>\n'
assert s.count(old) == 1, "ground buttons"
open(p, "w", encoding="utf-8").write(s.replace(old, '<button id="gKind">GUN</button><button id="gWall">WALL</button><button id="gFix">FIX</button><button id="gFight">FIGHT</button><button id="gSound">SOUND ON</button><button id="gTakeoff">TAKE OFF</button></div>\n'))
p = "docs/gravitys-ark/main.js"; s = open(p, encoding="utf-8").read()
reps = [
('const GS = makeGroundScreen({ canvas: "gv", kind: "gKind", sound: "gSound", takeoff: "gTakeoff" }, { log: (line) => state.events.push({ k: line, t: state.t }) });\nfunction enterGround(v) { view = "ground"; fieldTap = null; GS.enter(seed, galaxy.worlds[ship.landed], hull.scrap, hull, v); hull.scrap = 0; state.events.push({ k: "on the ground at " + fmt(v, 1) + " m/s", t: state.t }); }\n',
 'const GS = makeGroundScreen({ canvas: "gv", kind: "gKind", wall: "gWall", fix: "gFix", fight: "gFight", sound: "gSound", takeoff: "gTakeoff" }, { log: (line) => state.events.push({ k: line, t: state.t }) });\nfunction enterGround(v) { view = "ground"; fieldTap = null; GS.enter(seed, galaxy.worlds[ship.landed], hull.scrap, hull, v, crew); hull.scrap = 0; state.events.push({ k: "on the ground at " + fmt(v, 1) + " m/s", t: state.t }); }\n'),
('      if (view === "ground") { GS.step(DT / 2); GS.step(DT / 2); if (ship.alive && GS.lost()) { ship.alive = false; state.events.push({ k: "ABANDON SHIP", t: state.t }); logAdd("death", { v: 0 }); } }   // the war steps at coldsnap\'s own 1/120; the bridge lost is the ship lost\n',
 '      if (view === "ground") { GS.step(DT / 2); GS.step(DT / 2); if (ship.alive && GS.lost()) { ship.alive = false; state.events.push({ k: "ABANDON SHIP", t: state.t }); logAdd("death", { v: 0 }); } if (GS.herDead() && !her.taken) { her.taken = true; state.events.push({ k: "SHE IS DEAD; the delivery is over", t: state.t }); } }   // the war steps at coldsnap\'s own 1/120; the bridge lost is the ship lost; her death ends the delivery\n'),
]
for old, new in reps:
    assert s.count(old) == 1, old[:60]
    s = s.replace(old, new)
open(p, "w", encoding="utf-8").write(s)
ARK_EOF_4
node --check docs/gravitys-ark/main.js && echo "syntax ok main.js"
test "$(sha256sum docs/gravitys-ark/index.html | cut -c1-16)" = "f71f9b023e7d77ba" && echo OK docs/gravitys-ark/index.html || echo FAILED docs/gravitys-ark/index.html
test "$(sha256sum docs/gravitys-ark/main.js | cut -c1-16)" = "9825bb28bc66194d" && echo OK docs/gravitys-ark/main.js || echo FAILED docs/gravitys-ark/main.js
```

5. Three checks in the ark's gate. Both anchors are asserted; syntax check; the hash line must print OK.

```sh
python3 - <<'ARK_EOF_5'
p = "scripts/gravitys-ark-test.mjs"; s = open(p, encoding="utf-8").read()
reps = [
('import { makeGround, order as groundOrder, tick as groundTick, hash as groundHash, GROUND_DIALS, crashHull, looseModules, weldBack, HULL_DIALS } from "../src/games/gravitys-ark/ground.js";\n',
 'import { makeGround, order as groundOrder, tick as groundTick, hash as groundHash, GROUND_DIALS, crashHull, looseModules, weldBack, HULL_DIALS, fieldCrew, herBody, stepHer, HER } from "../src/games/gravitys-ark/ground.js";\nimport { SQUAD_SPECS } from "../src/depot/squads.js";\nimport { INFANTRY_ARMS } from "../src/depot/specs.js";\n'),
('console.log(`gravitys-ark-test: ${pass} PASS / ${fail} FAIL`);\n',
 '{ // 42. ark: she takes the field as a squad of one on her own row and the hands as rifles by name, and twin fields agree\n  // 43. ark: FIX sends her to the nearest loose module with her fire held, the weld-back lands when her seconds run down within reach, and FIGHT frees her fire\n  // 44. ark: a WALL order gives her squad coldsnap\'s build line, section by section\n  const gSeed = rollSeed(), g = makeGalaxy(gSeed), w = g.worlds[0];\n  const crew = [{ name: "Aud" }, { name: "Bjorn" }];\n  const mk = () => { const G = makeGround(gSeed, w, 900); crashHull(G, makeHull(STARTER_HULL), 30); fieldCrew(G, crew); return G; };\n  const A = mk(), B = mk();\n  const place = (G) => JSON.stringify(G.run.squads.map((sq) => [sq.type, sq.memberIds.map((id) => { const u = G.world.byId.get(id); return [u.pos.x, u.pos.z, u.handName || null]; })]));\n  const herSq = A.her.squad, hb = herBody(A);\n  const hands = A.hands.map((h) => A.world.byId.get(h.id));\n  check("ark: she takes the field as a squad of one on her own row and the hands as rifles by name, and twin fields agree",\n    SQUAD_SPECS.her && INFANTRY_ARMS.her && herSq.type === "her" && herSq.memberIds.length === 1 && !!hb && hb.utype === "her" && hb.team === 1\n    && A.hands.length === 2 && hands.every((u) => u && u.alive && u.utype === "rifles") && hands.map((u) => u.handName).join(",") === "Aud,Bjorn" && place(A) === place(B));\n  const fix = groundOrder(A, "fix");\n  const m = A.hull.bodies[fix.target], slid = Math.hypot(m.pos.x - A.hull.slots[fix.target].x, m.pos.z - A.hull.slots[fix.target].z);\n  const sent = fix.ok && fix.target === 1 && herSq.order === "move" && herSq.holdFire === true && A.her.act === "fix" && Math.abs(fix.seconds - (HER.repairBase + HER.repairPerM * slid)) < 1e-9;\n  hb.pos.x = m.pos.x + HER.reach * 0.5; hb.pos.z = m.pos.z;   // she stands within reach\n  const ev = stepHer(A, fix.seconds);\n  const welded = ev.some((e) => e.k === "repaired") && looseModules(A).length === 0 && A.her.act === "hold" && herSq.holdFire === false;\n  const fight = groundOrder(A, "fight");\n  check("ark: FIX sends her to the nearest loose module with her fire held, the weld-back lands when her seconds run down within reach, and FIGHT frees her fire",\n    sent && welded && fight.ok && herSq.holdFire === false && herSq.order === "defend" && A.her.act === "fight");\n  const s0 = A.hull.slots[0];\n  const wall = groundOrder(A, "wall", s0.x - 6, s0.z + 8, { x: s0.x + 6, z: s0.z + 8 });\n  check("ark: a WALL order gives her squad coldsnap\'s build line, section by section",\n    wall.ok && wall.sections > 0 && !!herSq._build && herSq._build.kind === "walls" && herSq._build.rows.length === wall.sections && herSq.order === "build" && A.her.act === "wall");\n}\n\nconsole.log(`gravitys-ark-test: ${pass} PASS / ${fail} FAIL`);\n'),
]
for old, new in reps:
    assert s.count(old) == 1, old[:60]
    s = s.replace(old, new)
open(p, "w", encoding="utf-8").write(s)
ARK_EOF_5
node --check scripts/gravitys-ark-test.mjs && echo "syntax ok gate"
test "$(sha256sum scripts/gravitys-ark-test.mjs | cut -c1-16)" = "c7545cf301d91a70" && echo OK scripts/gravitys-ark-test.mjs || echo FAILED scripts/gravitys-ark-test.mjs
```

6. Run the three gates that read what changed. The ark's gate must print 45 PASS lines, then `gravitys-ark-test: 45 PASS / 0 FAIL`, then `gravitys-ark-test PASS`; the other two must end in their PASS lines. Any FAIL stops the task here.

```sh
node scripts/gate.mjs gravitys-ark > /tmp/ark-gate.txt; tail -3 /tmp/ark-gate.txt; grep -m1 '^seeds' /tmp/ark-gate.txt
node scripts/gate.mjs manifest | tail -1
node scripts/gate.mjs parts | tail -1
```

7. The records: the phase document's task row. Then the parts build over every gate, about four minutes; it must name 50 gates and every verdict must be ok.

```sh
python3 - <<'ARK_EOF_7'
ph = "docs/plans/phase-0.1.1-the-hold.md"; s = open(ph, encoding="utf-8").read()
old = "walls by coldsnap's build lines. DISPATCHED. →"
assert s.count(old) == 1, "task row"
open(ph, "w", encoding="utf-8").write(s.replace(old, "walls by coldsnap's build lines. LANDED, commit stamped below. →"))
ARK_EOF_7
node scripts/parts.mjs --gates all
node -e 'const t=require("./docs/parts/parts.json");const bad=Object.values(t.gates).filter(g=>g.verdict!=="ok").map(g=>g.name);console.log(Object.keys(t.gates).length+" gates, "+bad.length+" not ok"+(bad.length?": "+bad.join(", "):""));process.exit(bad.length?1:0)'
```

Required: a count line naming 50 gates, `50 gates, 0 not ok`.

8. Commit and push the landing, then stamp the task row with the real hash in a second small commit. Never amend after stamping.

```sh
git add src/games/gravitys-ark/ground.js docs/gravitys-ark/ground.js docs/gravitys-ark/index.html docs/gravitys-ark/main.js scripts/gravitys-ark-test.mjs docs/parts docs/plans
git commit -m "phase 0.1.1 task 3 — her and the hands: her own row, the hands by name, FIX to the weld-back, FIGHT, WALL by coldsnap's build line

She is a squad of one on a row installed at the boot; the hands are rifle squads by name; her seconds run down within reach and the module welds back. Three checks in the ark's gate.
gravitys-ark-test 45 PASS / 0 FAIL; manifest and parts green; the parts build over 50 gates, every verdict ok.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01QSq3kZC3Bk9SC5RwnqYUfs"
git push origin main
H=$(git rev-parse --short HEAD)
sed -i "s/walls by coldsnap's build lines. LANDED, commit stamped below. →/walls by coldsnap's build lines. LANDED, commit \`$H\`. →/" docs/plans/phase-0.1.1-the-hold.md
git add docs/plans && git commit -m "phase 0.1.1 task 3 row stamped — $H

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01QSq3kZC3Bk9SC5RwnqYUfs"
git push origin main
```

## Acceptance

- Step 1: `0`, five OK lines.
- Steps 2 through 5: five OK lines, `syntax ok` four times.
- Step 6: `gravitys-ark-test: 45 PASS / 0 FAIL`, `gravitys-ark-test PASS`, a seeds line, `manifest-test PASS`, `parts-test PASS`.
- Step 7: the count line names 50 gates; `50 gates, 0 not ok`.
- Step 8: push accepted by origin; the stamp commit pushed.

After the landing the orchestrator republishes the page from `docs/parts/parts.html` to its fixed address and names it in the landing report.

## Report

Read-confirmation first, then one line of outcome, then bullets: step 6's lines verbatim; every OK line; the parts build's count line and the verdict line verbatim; both commit hashes; the push results. Every nonconformity its own labeled bullet. Fixture seeds: the seeds line the ark's gate printed in step 6, and the gravitys-ark seeds line from `docs/parts/parts.json` after the build; no seed is special.
