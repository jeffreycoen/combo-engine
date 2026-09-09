# Task 0.1.2-3 — the ship at scale and the mech bay

One job: the hull lands at the ground's scale and the walker rides in the mech bay. A module is a 10 m box on a 10.7 m pitch; the hull lands on the line from the depot toward the map's centre, the bridge 26 m out and the rest beyond it, inside the rim; the modules' footprints block coldsnap's grid; coldsnap's placement radius centres on the bridge; she and the hands stand off the bridge's face; FIX walks her to a module's face and the weld-back moves anyone the box would land on; the starter hull carries a mech bay; the walker lies wrecked at the bay's door, a hull without a bay lands without one, a walker down at TAKE OFF is lost until a new bay is bought. Two checks join the ark's gate and four of its pins are re-taught, each named below. Every edit is an anchored replacement checked by hash; write exactly what is written, run the listed gates, report. You design nothing.

Suggested model: Sonnet 5.

Required reading, in order (confirm at the top of your report):
1. This file, whole.
2. `docs/plans/phase-0.1.2-the-findings.md`, whole.

No demo file is read or written. Nothing under `/home/batman/coldsnap` is read, written, or run.

## Steps

Run from `/home/batman/combo-engine`. A failed assert, a wrong required value, or a FAILED hash line stops the task: report the step and its verbatim output, run nothing further. Never edit a file to make a hash match.

1. Assert the ground: the tracked files clean at task 2's landing, the seven files this task edits at their landed hashes. The gates were recorded green at that landing and are not run again here.

```sh
git status --short | grep -v "^??" | wc -l
while read -r hash path; do test "$(sha256sum "$path" | cut -c1-16)" = "$hash" && echo "OK $path" || echo "FAILED $path"; done <<'GROUND'
68ea04de15132b5b src/games/gravitys-ark/ground.js
7c1946286f88012f src/games/gravitys-ark/stations.js
e92dbff194751307 scripts/gravitys-ark-test.mjs
762beced89d02260 docs/gravitys-ark/main.js
95f28f739967a0c8 docs/gravitys-ark/ground.js
1b39828aab751a0b README.md
ba01e9d8b8930d9a docs/parts/parts-source.json
GROUND
```

Required: `0`, seven OK lines.

2. The ark's ground layer: the site line and the scale, the footprints stamped into the grid, the placement radius on the bridge, the crew off the bridge's face, the module's face for FIX and the weld-back, the walker in the bay, the walker lost at TAKE OFF. Syntax check; the hash line must print OK.

```sh
python3 - <<'ARK_EOF_2'
def edit(p, reps):
    s = open(p, encoding="utf-8").read()
    for old, new in reps:
        assert s.count(old) == 1, (p, old[:70])
        s = s.replace(old, new)
    open(p, "w", encoding="utf-8").write(s)
edit("src/games/gravitys-ark/ground.js", [
("  const depotP = war.map.TOWN.find((t) => t.depot && t.team !== 2);\n  const input = defaultTickInput();\n",
 "  const depotP = war.map.TOWN.find((t) => t.depot && t.team !== 2);\n  const site = { x: depotP.x, z: depotP.z };   // the homeland's centre for coldsnap's placement radius: the depot's spot until the hull lands, then the bridge\n  world.slotTreesBlock = true;   // coldsnap's own switch: loose chunks and trees are ground too, so no slot or spawn ever lands a man inside a module\n  const input = defaultTickInput();\n"),
("nextApcSeq: () => ++war.seq.apc, depotP, recomputeFlow });\n", "nextApcSeq: () => ++war.seq.apc, depotP: site, recomputeFlow });\n"),
("her: null, hands: [], walker: null, stick: { f: 0, l: 0, h: null } };\n}\n", "her: null, hands: [], walker: null, stick: { f: 0, l: 0, h: null }, site, recomputeFlow };\n}\n"),
("// HULL_DIALS, the seam's numbers and the crash law, all PROPOSED. kgPerKg: a space\n// kilogram lands as this many ground kilograms. box and pitch: a module's half size\n// and the grid step, in metres. lift: how far above the ground a module is set.\n// crashStop: the crash's stop time; the arrival speed over it is the deceleration.\n// slideFrac: how far a loose module slides, in metres per metre a second of arrival\n// speed. moduleHp: a module's hit points. offsetX, offsetZ: the crash site from the\n// depot's spot, in metres.\nexport const HULL_DIALS = { kgPerKg: 250, box: 0.8, pitch: 1.7, lift: 0.02, crashStop: 0.3, slideFrac: 0.6, moduleHp: 400, offsetX: 14, offsetZ: 0 };\n",
 "// HULL_DIALS, the seam's numbers and the crash law, all PROPOSED. kgPerKg: a space\n// kilogram lands as this many ground kilograms. box and pitch: a module's half size\n// and the grid step, in metres: 250 times the mass is 6.3 times the length, so the\n// 1.6 m box of the seam's table lands as 10 m on a 10.7 m pitch. lift: how far above\n// the ground a module is set. crashStop: the crash's stop time; the arrival speed over\n// it is the deceleration. slideFrac: how far a loose module slides, in metres per metre\n// a second of arrival speed. moduleHp: a module's hit points. site: how far from the\n// depot's spot the bridge lands, along the line to the map's centre snapped to the\n// nearest axis; the hull's own gx axis runs on along that line, away from the depot,\n// and its gy axis across it, so the whole hull stands beyond the bridge, clear of the depot.\nexport const HULL_DIALS = { kgPerKg: 250, box: 5, pitch: 10.7, lift: 0.02, crashStop: 0.3, slideFrac: 0.6, moduleHp: 400, site: 26 };\n"),
("  const slide = d.slideFrac * v;\n  const slots = list.map((m) => ({ x: f.x + d.offsetX + m.gx * d.pitch, z: f.z + d.offsetZ + m.gy * d.pitch }));\n  const bodies = list.map((m, i) => {\n    const loose = !keep.has(i);\n    const x = slots[i].x + (loose ? slide : 0), z = slots[i].z;\n",
 "  const slide = d.slideFrac * v;\n  // the site line: from the depot's spot toward the map's centre, snapped to the nearest axis; u runs on along it away from the depot, r across it\n  const u = Math.abs(f.x) >= Math.abs(f.z) ? { x: -Math.sign(f.x) || -1, z: 0 } : { x: 0, z: -Math.sign(f.z) || -1 };\n  const r = { x: -u.z, z: u.x };\n  const site = { x: f.x + u.x * d.site, z: f.z + u.z * d.site };\n  const slots = list.map((m) => ({ x: site.x + u.x * m.gx * d.pitch + r.x * m.gy * d.pitch, z: site.z + u.z * m.gx * d.pitch + r.z * m.gy * d.pitch }));\n  const bodies = list.map((m, i) => {\n    const loose = !keep.has(i);\n    const x = slots[i].x + (loose ? u.x * slide : 0), z = slots[i].z + (loose ? u.z * slide : 0);\n"),
("  G.hull = { list, builder: hull.builder, bodies, slots, welds, v, a, broken: [...broken], loose: list.map((m, i) => i).filter((i) => !keep.has(i)), dials: d };\n  return G.hull;\n}\n",
 "  G.site.x = site.x; G.site.z = site.z;   // the bridge is the homeland's centre for coldsnap's placement radius\n  G.hull = { list, builder: hull.builder, bodies, slots, welds, v, a, broken: [...broken], loose: list.map((m, i) => i).filter((i) => !keep.has(i)), dials: d, axis: { u, r }, site, walkerLost: !!hull.walkerLost, bay: -1, stamped: [] };\n  stampHull(G);\n  return G.hull;\n}\n\n// stampHull(G): the hull's footprints in coldsnap's grid: every cell whose centre lies under a\n// living module is blocked, so guns, walls, and paths go around it; the old stamp is lifted\n// first, the cells the ground itself blocks are never touched, and the paths recompute.\nexport function stampHull(G) {\n  const H = G.hull, grid = G.war.grid;\n  if (!H) return 0;\n  for (const i of H.stamped) grid.cells[i].blocked = false;\n  H.stamped = [];\n  for (const b of H.bodies) {\n    if (!b.alive) continue;\n    const cs = [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz]) => grid.worldToGrid(b.pos.x + sx * b.hx, b.pos.z + sz * b.hz));\n    const gx0 = Math.min(...cs.map((c) => c.gx)), gx1 = Math.max(...cs.map((c) => c.gx)), gz0 = Math.min(...cs.map((c) => c.gz)), gz1 = Math.max(...cs.map((c) => c.gz));\n    for (let gz = gz0; gz <= gz1; gz++) for (let gx = gx0; gx <= gx1; gx++) {\n      if (!grid.inBounds(gx, gz)) continue;\n      const i = grid.idx(gx, gz), cell = grid.cells[i], p = grid.gridToWorld(gx, gz);\n      if (cell.blocked || Math.abs(p.x - b.pos.x) > b.hx || Math.abs(p.z - b.pos.z) > b.hz) continue;\n      cell.blocked = true; H.stamped.push(i);\n    }\n  }\n  G.recomputeFlow();\n  return H.stamped.length;\n}\n"),
("// standOff: where she and the hands stand from the bridge at the crash. All PROPOSED.\n", "// standOff: how far off the bridge's face she stands at the crash, across the site line, the hands behind her. All PROPOSED.\n"),
("  const { run, world } = G, H = G.hull, d = HER;\n  const at = H ? H.slots[0] : { x: run.focus.x, z: run.focus.z };\n  const squad = makeSquad(run.nextSquadId++, \"her\", 1, at.x, at.z + d.standOff);\n",
 "  const { run, world } = G, H = G.hull, d = HER;\n  const at = H ? H.slots[0] : { x: run.focus.x, z: run.focus.z }, r = H ? H.axis.r : { x: 0, z: 1 }, off = (H ? H.dials.box : 0) + d.standOff;   // across the site line, on the bridge's free side, off its face\n  const squad = makeSquad(run.nextSquadId++, \"her\", 1, at.x - r.x * off, at.z - r.z * off);\n"),
("    const sq = makeSquad(run.nextSquadId++, \"rifles\", 1, at.x, at.z - d.standOff - 2 * (k / 4));\n",
 "    const o = off + 3 + 3 * (k / 4);\n    const sq = makeSquad(run.nextSquadId++, \"rifles\", 1, at.x - r.x * o, at.z - r.z * o);\n"),
("// WALKER: hers, coldsnap's own mech at coldsnap's own scale, 5.4 m tall, two and a\n// half troopers; it lies wrecked beside the hull at the crash until she repairs it.\n// repair: her seconds at the wreck; spotX, spotZ: the wreck's spot from the bridge, in\n// metres; s: the scale. room: the room the walker needs around its spot, coldsnap's own\n// placement distance for a mech; standPad: how far past the room her stand is; reach: how\n// far from the spot her seconds still run. PROPOSED.\nexport const WALKER = { s: 1, repair: 10, spotX: 0, spotZ: -8, room: 4.5, standPad: 0.5, reach: 10 };\n\n// wreckWalker(G): the walker lies wrecked at its spot; nothing stands until she repairs it.\nexport function wreckWalker(G) {\n  const s0 = G.hull ? G.hull.slots[0] : { x: G.run.focus.x, z: G.run.focus.z };\n  G.walker = { mech: null, spot: { x: s0.x + WALKER.spotX, z: s0.z + WALKER.spotZ }, wrecked: true, alive: false, possessed: false };\n  return G.walker;\n}\n",
 "// WALKER: hers, coldsnap's own mech at coldsnap's own scale, 5.4 m tall, two and a\n// half troopers; it rides in the mech bay and lies wrecked at the bay's door at the\n// crash until she repairs it. repair: her seconds at the wreck; s: the scale; door: how\n// far off the bay's open face it lies and stands; room: the room the walker needs around\n// its spot, coldsnap's own placement distance for a mech; standPad: how far past the room\n// her stand is; reach: how far from the spot her seconds still run. PROPOSED.\nexport const WALKER = { s: 1, repair: 10, door: 4, room: 4.5, standPad: 0.5, reach: 10 };\n\n// bayDoor(G): the bay's open side: the first of across, back across, on, and back on the\n// site line with no module of the hull beside it, as a unit vector in the world.\nfunction bayDoor(G) {\n  const H = G.hull, b = H.list[H.bay], { u, r } = H.axis;\n  for (const [dgx, dgy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {\n    if (H.list.some((m) => m.gx === b.gx + dgx && m.gy === b.gy + dgy)) continue;\n    return { x: u.x * dgx + r.x * dgy, z: u.z * dgx + r.z * dgy };\n  }\n  return { x: r.x, z: r.z };\n}\n\n// walkerSpot(G): where the walker lies and stands: off the bay's open face, wherever the bay lies now.\nexport function walkerSpot(G) {\n  const H = G.hull, bay = H.bodies[H.bay], s = bayDoor(G), k = H.dials.box + WALKER.door;\n  return { x: bay.pos.x + s.x * k, z: bay.pos.z + s.z * k };\n}\n\n// wreckWalker(G): the walker rides in the mech bay: with a bay aboard and the walker not\n// lost, it lies wrecked at the bay's door; nothing stands until she repairs it. Without a\n// bay, or with the walker lost on an earlier ground, there is no walker.\nexport function wreckWalker(G) {\n  const H = G.hull, bay = H ? H.list.findIndex((m) => m.t === \"mechbay\") : -1;\n  if (bay < 0 || H.walkerLost) { G.walker = null; return null; }\n  H.bay = bay;\n  G.walker = { mech: null, bay, spot: walkerSpot(G), wrecked: true, alive: false, possessed: false };\n  return G.walker;\n}\n"),
("  if (!W || W.mech) return null;\n  clearRoom(G);\n", "  if (!W || W.mech) return null;\n  W.spot = walkerSpot(G);\n  clearRoom(G);\n"),
("  b.v.x = 0; b.v.y = 0; b.v.z = 0; b.w.x = 0; b.w.y = 0; b.w.z = 0; b.sleeping = true; b.tint = \"wall\";\n  let n = 0;\n  for (const w of H.builder.weldsOf(H.list)) {\n    if (w.a !== i && w.b !== i) continue;\n    const o = H.bodies[w.a === i ? w.b : w.a];\n    if (!o.alive) continue;\n",
 "  b.v.x = 0; b.v.y = 0; b.v.z = 0; b.w.x = 0; b.w.y = 0; b.w.z = 0; b.sleeping = true; b.tint = \"wall\";\n  clearBox(G, b); stampHull(G);\n  const j = joined(G);   // only a neighbour joined to the bridge takes a weld; a loose neighbour gets its own weld-back\n  let n = 0;\n  for (const w of H.builder.weldsOf(H.list)) {\n    if (w.a !== i && w.b !== i) continue;\n    const k = w.a === i ? w.b : w.a, o = H.bodies[k];\n    if (!o.alive || !j.has(k)) continue;\n"),
("// joined(G): the modules joined to the bridge through unbroken welds between living modules.\n",
 "// boxDist(m, b): how far body b stands off module m's faces, zero inside its box.\nfunction boxDist(m, b) { return Math.hypot(Math.max(0, Math.abs(b.pos.x - m.pos.x) - m.hx), Math.max(0, Math.abs(b.pos.z - m.pos.z) - m.hz)); }\n\n// faceOf(G, m, b): the point just off module m's face nearest body b, a body's width and a\n// pad off the face, by coldsnap's clear-slot rule.\nfunction faceOf(G, m, b) {\n  const dx = b.pos.x - m.pos.x, dz = b.pos.z - m.pos.z, pad = b.hx + 0.6, cl = (v, h) => Math.max(-h, Math.min(h, v));\n  const p = Math.abs(dx) / m.hx >= Math.abs(dz) / m.hz\n    ? { x: m.pos.x + (dx < 0 ? -1 : 1) * (m.hx + pad), z: m.pos.z + cl(dz, m.hz) }\n    : { x: m.pos.x + cl(dx, m.hx), z: m.pos.z + (dz < 0 ? -1 : 1) * (m.hz + pad) };\n  return clearSlot(G.world, p.x, p.z, b.hx + 0.35);\n}\n\n// clearBox(G, m): everyone of hers inside module m's box, grown by a body's width and coldsnap's\n// pad, is moved off its nearest face, so a module set back in its slot never stands on anyone.\nexport function clearBox(G, m) {\n  const moved = [];\n  for (const b of G.world.bodies) {\n    if (!b.alive || b.team !== 1 || b.kind !== \"unit\") continue;\n    if (Math.abs(b.pos.x - m.pos.x) > m.hx + b.hx + 0.35 || Math.abs(b.pos.z - m.pos.z) > m.hz + b.hz + 0.35) continue;\n    const p = faceOf(G, m, b);\n    b.pos.x = p.x; b.pos.z = p.z; b.pos.y = G.war.field.heightAt(p.x, p.z) + b.hy + 0.02;\n    b.v.x = 0; b.v.y = 0; b.v.z = 0;\n    moved.push(b);\n  }\n  return moved;\n}\n\n// joined(G): the modules joined to the bridge through unbroken welds between living modules.\n"),
("    else if (Math.hypot(m.pos.x - b.pos.x, m.pos.z - b.pos.z) <= HER.reach) {\n", "    else if (boxDist(m, b) <= HER.reach) {\n"),
("    sq.order = \"move\"; sq.dest = { x: m.pos.x, z: m.pos.z }; sq._route = null; sq._routeDest = null; sq._build = null; sq.holdFire = true;\n",
 "    const fp = faceOf(G, m, b);\n    sq.order = \"move\"; sq.dest = { x: fp.x, z: fp.z }; sq._route = null; sq._routeDest = null; sq._build = null; sq.holdFire = true;\n"),
("    if (walkerAlive(G)) return { ok: false, reason: \"the walker stands\" };\n    if (G.walker.possessed) leaveWalker(G);\n    const sq = G.her.squad;\n    const st = standOff(G, b);\n",
 "    if (walkerAlive(G)) return { ok: false, reason: \"the walker stands\" };\n    if (!G.hull.bodies[G.walker.bay].alive) return { ok: false, reason: \"the bay is destroyed\" };\n    if (G.walker.possessed) leaveWalker(G);\n    G.walker.spot = walkerSpot(G);\n    const sq = G.her.squad;\n    const st = standOff(G, b);\n"),
("// price, one purchase a second. \"takeoff\" hands the purse back as kilograms, names\n// the modules lost, and refuses while a living module is loose or the bridge is dead.\n",
 "// price, one purchase a second. \"takeoff\" hands the purse back as kilograms, names\n// the modules lost and a walker down as lost, and refuses while a living module is\n// loose or the bridge is dead.\n"),
("    const out = { ok: true, scrapKg: run.resources * G.dials.kgPerScrap, lost: [], keptList: null, abandoned: false };\n",
 "    const out = { ok: true, scrapKg: run.resources * G.dials.kgPerScrap, lost: [], keptList: null, abandoned: false, walkerLost: !!(G.walker && G.walker.mech && !G.walker.mech.hull.alive) };\n"),
])
ARK_EOF_2
node --check src/games/gravitys-ark/ground.js && echo "syntax ok ground.js"
test "$(sha256sum src/games/gravitys-ark/ground.js | cut -c1-16)" = "bcacd20ef8535d1e" && echo OK src/games/gravitys-ark/ground.js || echo FAILED src/games/gravitys-ark/ground.js
```

3. The stations: the mech bay on the starter hull, a new bay bringing a walker. Syntax check; the hash line must print OK.

```sh
python3 - <<'ARK_EOF_3'
def edit(p, reps):
    s = open(p, encoding="utf-8").read()
    for old, new in reps:
        assert s.count(old) == 1, (p, old[:70])
        s = s.replace(old, new)
    open(p, "w", encoding="utf-8").write(s)
edit("src/games/gravitys-ark/stations.js", [
('export const STARTER_HULL = [{ t: "bridge", gx: 0, gy: 0 }, { t: "engine", gx: -1, gy: 0 }, { t: "tank", gx: 1, gy: 0 }, { t: "pod", gx: 0, gy: 1 }];\n',
 'export const STARTER_HULL = [{ t: "bridge", gx: 0, gy: 0 }, { t: "engine", gx: -1, gy: 0 }, { t: "tank", gx: 1, gy: 0 }, { t: "pod", gx: 0, gy: 1 }, { t: "mechbay", gx: 1, gy: 1 }];   // the bay rides beside the tank and the pod: the walker comes with the ship\n'),
("  hull.list.push({ t, gx, gy });\n  return true;\n}\n", "  hull.list.push({ t, gx, gy });\n  if (t === \"mechbay\") hull.walkerLost = false;   // a new bay brings a walker\n  return true;\n}\n"),
])
ARK_EOF_3
node --check src/games/gravitys-ark/stations.js && echo "syntax ok stations.js"
test "$(sha256sum src/games/gravitys-ark/stations.js | cut -c1-16)" = "aacb89efa41cebd3" && echo OK src/games/gravitys-ark/stations.js || echo FAILED src/games/gravitys-ark/stations.js
```

4. The ark's gate: four pins re-taught by this task's own change, the starter hull's mass in the build check from 3,400 to 5,200 kg and 3,550 to 5,350 with the bay aboard; the crash check's loose set at 30 m/s to the weld-stress rule's own verdict and its kept counts to the starter's length; the FIX check's loose count after one weld-back to one fewer; the WALL check's line moved off the hull's free side, clear of every module. Two checks join at the end. Syntax check; the hash line must print OK.

```sh
python3 - <<'ARK_EOF_4'
def edit(p, reps):
    s = open(p, encoding="utf-8").read()
    for old, new in reps:
        assert s.count(old) == 1, (p, old[:70])
        s = s.replace(old, new)
    open(p, "w", encoding="utf-8").write(s)
p = "scripts/gravitys-ark-test.mjs"
edit(p, [
("  let ok = d0.m === 3400 && d0.F === 60000 && d0.fuelCap === 3000;\n", "  let ok = d0.m === 5200 && d0.F === 60000 && d0.fuelCap === 3000;   // the starter carries the mech bay: 3,400 kg and 1,800 more\n"),
("  ok = ok && derive(hull).m === 3550;\n", "  ok = ok && derive(hull).m === 5350;\n"),
("  ok = ok && derive(hull).m === 3400;\n", "  ok = ok && derive(hull).m === 5200;\n"),
("  const C = mk(30);   // at 30 m/s the engine's weld breaks by the rule: 1400 kg at 100 m/s/s beats 120000 N\n  const refused = groundOrder(C.G, \"takeoff\");\n",
 "  const C = mk(30);   // at 30 m/s the engine's weld breaks by the rule: 1400 kg at 100 m/s/s beats 120000 N; the rule says what else does\n  const ws30 = hull.builder.weldsOf(hull.list), broken30 = new Set(breaking(weldLoads(hull.builder, MODULES, hull.list, ws30, 30 / HULL_DIALS.crashStop, 1), ws30));\n  const keep30 = hull.builder.connectedFrom(hull.list, ws30.filter((x, k) => !broken30.has(k)), 0), expectLoose30 = hull.list.map((m, i) => i).filter((i) => !keep30.has(i));\n  const refused = groundOrder(C.G, \"takeoff\");\n"),
("    C.H.loose.length === 1 && C.H.loose[0] === 1 && !refused.ok && refused.loose.length === 1 && allowed.ok && allowed.lost.length === 0 && allowed.keptList.length === 4\n    && lostPod.ok && lostPod.lost.length === 1 && lostPod.lost[0] === \"pod\" && lostPod.keptList.length === 3 && !abandoned.ok && abandoned.abandoned === true);\n",
 "    JSON.stringify(C.H.loose) === JSON.stringify(expectLoose30) && C.H.loose.includes(1) && !refused.ok && refused.loose.length === C.H.loose.length && allowed.ok && allowed.lost.length === 0 && allowed.keptList.length === STARTER_HULL.length\n    && lostPod.ok && lostPod.lost.length === 1 && lostPod.lost[0] === \"pod\" && lostPod.keptList.length === STARTER_HULL.length - 1 && !abandoned.ok && abandoned.abandoned === true);\n"),
("  const fix = groundOrder(A, \"fix\");\n  const m = A.hull.bodies[fix.target], slid", "  const loose0 = looseModules(A).length;\n  const fix = groundOrder(A, \"fix\");\n  const m = A.hull.bodies[fix.target], slid"),
("  const welded = ev.some((e) => e.k === \"repaired\") && looseModules(A).length === 0 && A.her.act === \"hold\" && herSq.holdFire === false;\n",
 "  const welded = ev.some((e) => e.k === \"repaired\") && looseModules(A).length === loose0 - 1 && A.her.act === \"hold\" && herSq.holdFire === false;\n"),
("  const s0 = A.hull.slots[0];\n  const wall = groundOrder(A, \"wall\", s0.x - 6, s0.z + 8, { x: s0.x + 6, z: s0.z + 8 });\n",
 "  const s0 = A.hull.slots[0], ax = A.hull.axis, wz = A.hull.dials.box + 14;   // a line across the site line, well off the bridge's free side, clear of every module\n  const wall = groundOrder(A, \"wall\", s0.x - ax.r.x * wz - ax.u.x * 6, s0.z - ax.r.z * wz - ax.u.z * 6, { x: s0.x - ax.r.x * wz + ax.u.x * 6, z: s0.z - ax.r.z * wz + ax.u.z * 6 });\n"),
])
s = open(p, encoding="utf-8").read()
anchor = "console.log(`gravitys-ark-test: ${pass} PASS / ${fail} FAIL`);\n"
assert s.count(anchor) == 1, "tail anchor"
block = '''{ // 50. ark: the hull lands at the ground's scale on the site line, axis-aligned and inside the rim, the bridge the homeland's centre, its footprints blocking the grid, and twin sites agree
  // 51. ark: the walker rides in the mech bay: wrecked at the bay's door with a bay aboard, absent without one or once lost, lost at TAKE OFF when it is down, and a new bay brings one
  const gSeed = rollSeed(), g = makeGalaxy(gSeed), w = g.worlds[0];
  const mk = (list) => { const G = makeGround(gSeed, w, 900); const H = crashHull(G, makeHull(list), 5); return { G, H }; };
  const A = mk(STARTER_HULL), B = mk(STARTER_HULL), f = A.G.run.focus, d = HULL_DIALS;
  const bridge = A.H.bodies[0], engine = A.H.bodies[1], bay = A.H.list.findIndex((m) => m.t === "mechbay");
  const scale = A.H.bodies.every((b) => b.hx === d.box && b.hy === d.box && b.hz === d.box && b.mass === MODULES[b.module].kg * d.kgPerKg);
  const onLine = Math.abs(Math.hypot(bridge.pos.x - f.x, bridge.pos.z - f.z) - d.site) < 1e-9 && Math.abs(Math.hypot(engine.pos.x - bridge.pos.x, engine.pos.z - bridge.pos.z) - d.pitch) < 1e-9
    && (A.H.axis.u.x === 0 || A.H.axis.u.z === 0) && Math.hypot(engine.pos.x - f.x, engine.pos.z - f.z) < d.site;
  const inRim = A.H.bodies.every((b) => A.G.world.inRim(b.pos.x, b.pos.z));
  const centred = A.G.site.x === bridge.pos.x && A.G.site.z === bridge.pos.z;
  const stamped = A.H.stamped.length > 0 && A.H.bodies.every((b) => A.G.war.grid.cellAt(b.pos.x, b.pos.z).blocked === true);
  const onHull = groundOrder(A.G, "gun", bridge.pos.x, bridge.pos.z, "mg");
  const twin = JSON.stringify(A.H.slots) === JSON.stringify(B.H.slots);
  check("ark: the hull lands at the ground's scale on the site line, axis-aligned and inside the rim, the bridge the homeland's centre, its footprints blocking the grid, and twin sites agree",
    scale && onLine && inRim && centred && stamped && !onHull.ok && twin);
  fieldCrew(A.G, []);
  const W = wreckWalker(A.G), bayB = A.H.bodies[bay];
  const atDoor = !!W && W.bay === bay && Math.abs(Math.max(Math.abs(W.spot.x - bayB.pos.x), Math.abs(W.spot.z - bayB.pos.z)) - (d.box + WALKER.door)) < 1e-9 && Math.min(Math.abs(W.spot.x - bayB.pos.x), Math.abs(W.spot.z - bayB.pos.z)) < 1e-9;
  const none = mk(STARTER_HULL.filter((m) => m.t !== "mechbay")); fieldCrew(none.G, []);
  const noBay = wreckWalker(none.G) === null && none.G.walker === null && !groundOrder(none.G, "repairWalker").ok;
  const lostHull = makeHull(STARTER_HULL); lostHull.walkerLost = true;
  const L = makeGround(gSeed, w, 900); crashHull(L, lostHull, 5); fieldCrew(L, []);
  const wasLost = wreckWalker(L) === null && L.hull.walkerLost === true;
  const rested = groundOrder(A.G, "takeoff").walkerLost === false;   // still wrecked in its bay: it rides
  const r = groundOrder(A.G, "repairWalker"); const hb = herBody(A.G); hb.pos.x = W.spot.x + 1; hb.pos.z = W.spot.z; stepHer(A.G, r.seconds);
  const up = walkerAlive(A.G);
  A.G.walker.mech.hull.alive = false; A.G.walker.mech.hull.hp = 0;
  const down = groundOrder(A.G, "takeoff");
  const bought = makeHull(STARTER_HULL.filter((m) => m.t !== "mechbay")); bought.walkerLost = true;
  const brings = install(bought, "mechbay", 1, 1) === true && bought.walkerLost === false;
  check("ark: the walker rides in the mech bay: wrecked at the bay's door with a bay aboard, absent without one or once lost, lost at TAKE OFF when it is down, and a new bay brings one",
    atDoor && noBay && wasLost && rested && r.ok && up && down.ok && down.walkerLost === true && brings);
}

'''
s = s.replace(anchor, block + anchor)
open(p, "w", encoding="utf-8").write(s)
ARK_EOF_4
node --check scripts/gravitys-ark-test.mjs && echo "syntax ok gate"
test "$(sha256sum scripts/gravitys-ark-test.mjs | cut -c1-16)" = "8214832731967b2a" && echo OK scripts/gravitys-ark-test.mjs || echo FAILED scripts/gravitys-ark-test.mjs
```

5. The page's hookup lines: the walker lost carried to the hull at the seam up; the log line at landing says where the walker lies, or that none is aboard. Syntax checks; both hash lines must print OK.

```sh
python3 - <<'ARK_EOF_5'
def edit(p, reps):
    s = open(p, encoding="utf-8").read()
    for old, new in reps:
        assert s.count(old) == 1, (p, old[:70])
        s = s.replace(old, new)
    open(p, "w", encoding="utf-8").write(s)
edit("docs/gravitys-ark/main.js", [
("function leaveGround(g) { hull.scrap += g.scrapKg; if (g.keptList) hull.list = g.keptList; ", "function leaveGround(g) { hull.scrap += g.scrapKg; if (g.keptList) hull.list = g.keptList; if (g.walkerLost) hull.walkerLost = true; "),
])
edit("docs/gravitys-ark/ground.js", [
("    wreckWalker(G);\n    say(\"she is on the ground\" + (G.hands.length ? \" with \" + G.hands.map((h) => h.name).join(\", \") : \", alone\") + \"; the walker lies wrecked\");\n",
 "    const Wk = wreckWalker(G);\n    say(\"she is on the ground\" + (G.hands.length ? \" with \" + G.hands.map((h) => h.name).join(\", \") : \", alone\") + (Wk ? \"; the walker lies wrecked at the bay's door\" : \"; no walker aboard\"));\n"),
])
ARK_EOF_5
node --check docs/gravitys-ark/main.js && echo "syntax ok main.js"
node --check docs/gravitys-ark/ground.js && echo "syntax ok screen"
test "$(sha256sum docs/gravitys-ark/main.js | cut -c1-16)" = "0dbdfbab0457c407" && echo OK docs/gravitys-ark/main.js || echo FAILED docs/gravitys-ark/main.js
test "$(sha256sum docs/gravitys-ark/ground.js | cut -c1-16)" = "5e62630dca0c0c3d" && echo OK docs/gravitys-ark/ground.js || echo FAILED docs/gravitys-ark/ground.js
```

6. The records that ride the landing: the README's ground and walker lines as built; the parts source's mech bay row with its files, gate, and phase. Both hash lines must print OK.

```sh
python3 - <<'ARK_EOF_6'
import json
def edit(p, reps):
    s = open(p, encoding="utf-8").read()
    for old, new in reps:
        assert s.count(old) == 1, (p, old[:70])
        s = s.replace(old, new)
    open(p, "w", encoding="utf-8").write(s)
edit("README.md", [
("and the weld-stress rule at the arrival speed says which broke; a loose module slides. She is a trooper",
 "and the weld-stress rule at the arrival speed says which broke; a loose module slides. A module is a 10 m box on a 10.7 m pitch, 250 times the space mass and 6.3 times the length, landed on the line from the depot toward the map's centre with the bridge 26 m out and the hull beyond it; the footprints block coldsnap's grid, so guns, walls, and paths go around them. She is a trooper"),
("- **The walker (0.1.1):** coldsnap's own mech at its own scale, 5.4 m, two and a half troopers, wrecked at the crash until REPAIR WALKER sends her to it; then hers",
 "- **The walker (0.1.1, 0.1.2):** coldsnap's own mech at its own scale, 5.4 m, two and a half troopers. It rides in the mech bay, which the starter hull carries, and lies wrecked at the bay's door at the crash until REPAIR WALKER sends her to a stand outside its room; a hull without a bay lands without a walker, and a walker down at TAKE OFF is lost until a new bay is bought. Then hers"),
])
edit("docs/parts/parts-source.json", [
('   "name": "the mech bay",\n   "does": "The walker rides only if a mech bay is welded.",\n',
 '   "name": "the mech bay",\n   "files": [\n    "src/games/gravitys-ark/stations.js",\n    "src/games/gravitys-ark/ground.js"\n   ],\n   "gate": "gravitys-ark",\n   "phase": "0.1.2",\n   "does": "The walker rides only if a mech bay is welded: the starter hull carries one; the walker lies wrecked at its door; a hull without a bay lands without a walker; a walker down at TAKE OFF is lost until a new bay is bought.",\n'),
])
json.loads(open("docs/parts/parts-source.json", encoding="utf-8").read())
ARK_EOF_6
test "$(sha256sum README.md | cut -c1-16)" = "7029df61230d773a" && echo OK README.md || echo FAILED README.md
test "$(sha256sum docs/parts/parts-source.json | cut -c1-16)" = "9b94865e110f5bdb" && echo OK docs/parts/parts-source.json || echo FAILED docs/parts/parts-source.json
```

7. Run the ark's gate. It must print 47 PASS lines, two more than the recorded 45, then `gravitys-ark-test: 47 PASS / 0 FAIL`, then `gravitys-ark-test PASS`. Any FAIL stops the task here.

```sh
node scripts/gate.mjs gravitys-ark > /tmp/ark-gate.txt; tail -3 /tmp/ark-gate.txt; grep -m1 '^seeds' /tmp/ark-gate.txt
```

8. The record: the phase document's task row and status line. Then the parts build over every gate, about four minutes; it must name 50 gates and every verdict must be ok, the ark's gate among them at 47 PASS and 0 FAIL.

```sh
python3 - <<'ARK_EOF_8'
ph = "docs/plans/phase-0.1.2-the-findings.md"; s = open(ph, encoding="utf-8").read()
old = "the bay on the starter hull, the walker in the bay. DISPATCHED. →"
assert s.count(old) == 1, "task row"
s = s.replace(old, "the bay on the starter hull, the walker in the bay. LANDED, commit stamped below. →")
old2 = "Status: DISPATCHED. Task 3 dispatched."
assert s.count(old2) == 1, "status line"
s = s.replace(old2, "Status: DISPATCHED. Task 3 landed, commit stamped below, 2026-09-09; task 4 is planned next.")
open(ph, "w", encoding="utf-8").write(s)
ARK_EOF_8
grep -c "commit stamped below" docs/plans/phase-0.1.2-the-findings.md
node scripts/parts.mjs --gates all
node -e 'const t=require("./docs/parts/parts.json");const bad=Object.values(t.gates).filter(g=>g.verdict!=="ok").map(g=>g.name);const a=t.gates["gravitys-ark"];console.log(Object.keys(t.gates).length+" gates, "+bad.length+" not ok"+(bad.length?": "+bad.join(", "):""));console.log("gravitys-ark "+a.pass+" PASS / "+a.fail+" FAIL; "+a.seeds);process.exit(bad.length||a.pass!==47?1:0)'
```

Required: `2`, a count line naming 50 gates, `50 gates, 0 not ok`, `gravitys-ark 47 PASS / 0 FAIL;` with its seeds.

9. Commit and push the landing, then stamp the real hash into the status line and the task row in a second small commit. Never amend after stamping.

```sh
git add src/games/gravitys-ark/ground.js src/games/gravitys-ark/stations.js scripts/gravitys-ark-test.mjs docs/gravitys-ark/main.js docs/gravitys-ark/ground.js README.md docs/parts docs/plans
git commit -m "phase 0.1.2 task 3 — the ship at scale and the mech bay: 10 m modules on the site line, footprints in the grid, the walker in the bay

The bridge lands 26 m from the depot toward the map's centre and the hull beyond it; the starter hull carries a mech bay; a hull without one lands without a walker.
gravitys-ark-test 47 PASS / 0 FAIL; the parts build over 50 gates, every verdict ok.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01QSq3kZC3Bk9SC5RwnqYUfs"
git push origin main
H=$(git rev-parse --short HEAD)
sed -i "s/commit stamped below/commit \`$H\`/g" docs/plans/phase-0.1.2-the-findings.md
git add docs/plans && git commit -m "phase 0.1.2 task 3 row stamped — $H

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01QSq3kZC3Bk9SC5RwnqYUfs"
git push origin main
```

## Acceptance

- Step 1: `0`, seven OK lines.
- Steps 2 through 6: seven OK lines, `syntax ok` five times.
- Step 7: `gravitys-ark-test: 47 PASS / 0 FAIL`, `gravitys-ark-test PASS`, a seeds line.
- Step 8: `2`; the count line names 50 gates; `50 gates, 0 not ok`; `gravitys-ark 47 PASS / 0 FAIL;` with its seeds.
- Step 9: push accepted by origin; the stamp commit pushed.

After the landing the orchestrator republishes the page from `docs/parts/parts.html` to its fixed address and names it, with the game's address, in the landing report.

## Report

Read-confirmation first, then one line of outcome, then bullets: step 7's lines verbatim; every OK line; the parts build's count line and the verdict line verbatim; the ark's gate line verbatim; both commit hashes; the push results. Every nonconformity its own labeled bullet, with the verbatim output. Fixture seeds: the seeds line the ark's gate printed in step 7 and the one from step 8's line; no seed is special.
