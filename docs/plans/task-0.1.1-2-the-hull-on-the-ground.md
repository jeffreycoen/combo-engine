# Task 0.1.1-2 — the hull on the ground

One job: the hull's modules become bodies on the ground at the crash, welded by the weld-stress rule at the seam's scale; TAKE OFF is refused while a living module is loose and names what was lost; the weld-back mechanism exists for the next task's repair; two checks in the ark's gate. Every edit is an anchored replacement checked by hash; write exactly what is written, run the listed gates, report. You design nothing.

Suggested model: Sonnet 5.

Required reading, in order (confirm at the top of your report):
1. This file, whole.
2. `docs/plans/phase-0.1.1-the-hold.md`, whole.

No demo file is read or written. Nothing under `/home/batman/coldsnap` is read, written, or run.

## Steps

Run from `/home/batman/combo-engine`. A failed assert, a wrong required value, or a FAILED hash line stops the task: report the step and its verbatim output, run nothing further. Never edit a file to make a hash match.

1. Assert the ground: the tracked files clean at task 1's landing, the four files this task edits at their landed hashes. The gates were recorded green at that landing and are not run again here.

```sh
git status --short | grep -v "^??" | wc -l
while read -r hash path; do test "$(sha256sum "$path" | cut -c1-16)" = "$hash" && echo "OK $path" || echo "FAILED $path"; done <<'GROUND'
2f01f0efd76397c4 src/games/gravitys-ark/ground.js
c7efd469517c680f docs/gravitys-ark/ground.js
3a37b4af977f82eb docs/gravitys-ark/main.js
1b3b37289700fe12 scripts/gravitys-ark-test.mjs
GROUND
```

Required: `0`, four OK lines.

2. The ground layer gains the hull: the seam's dials, the crash, the joined set, the loose modules, the weld-back, the take-off's refusals and report, the modules in the summary. Every anchor is asserted; syntax check; the hash line must print OK.

```sh
python3 - <<'ARK_EOF_2'
p = "src/games/gravitys-ark/ground.js"; s = open(p, encoding="utf-8").read()
reps = [
('// MODULE of the game GRAVITY\'S ARK: the ground, phase 0.1.1. The crash world\n// runs on coldsnap\'s engine, whole: its map maker, its war, its attacker with\n// its brain, its books and its bell, its build law for guns. This file is the\n// ark\'s layer over that engine and nothing more: the boot from the ark\'s own\n// world seed, the one purse the hold\'s scrap feeds, the orders, the take-off.\n// The page\'s ground screen draws it. Every number here is PROPOSED.\n',
 '// MODULE of the game GRAVITY\'S ARK: the ground, phase 0.1.1. The crash world\n// runs on coldsnap\'s engine, whole: its map maker, its war, its attacker with\n// its brain, its books and its bell, its build law for guns. This file is the\n// ark\'s layer over that engine and nothing more: the boot from the ark\'s own\n// world seed, the one purse the hold\'s scrap feeds, the hull as bodies on\n// welds, the orders, the take-off. The page\'s ground screen draws it. Every\n// number here is PROPOSED.\n'),
('import { worldHash } from "../../engine/core.js";\n',
 'import { worldHash, addBody, addWeld } from "../../engine/core.js";\nimport { weldLoads, breaking } from "../../modules/weldstress/weldstress.js";\nimport { MODULES } from "./stations.js";\n'),
('// order(G, kind, x, z, which): the player\'s orders. "gun" places one of coldsnap\'s\n// towers at the ground point by its build law: held ground, a free cell, the live\n// price, one purchase a second. "takeoff" hands the purse back as kilograms.\n',
 '// HULL_DIALS, the seam\'s numbers and the crash law, all PROPOSED. kgPerKg: a space\n// kilogram lands as this many ground kilograms. box and pitch: a module\'s half size\n// and the grid step, in metres. lift: how far above the ground a module is set.\n// crashStop: the crash\'s stop time; the arrival speed over it is the deceleration.\n// slideFrac: how far a loose module slides, in metres per metre a second of arrival\n// speed. moduleHp: a module\'s hit points. offsetX, offsetZ: the crash site from the\n// depot\'s spot, in metres.\nexport const HULL_DIALS = { kgPerKg: 250, box: 0.8, pitch: 1.7, lift: 0.02, crashStop: 0.3, slideFrac: 0.6, moduleHp: 400, offsetX: 14, offsetZ: 0 };\n\n// crashHull(G, hull, v, opts): the hull\'s modules become bodies at the crash site,\n// set down at rest and asleep as coldsnap\'s masonry is, welded to their grid\n// neighbours with the ship\'s own weld strengths at the seam\'s scale. The crash\'s\n// deceleration is the arrival speed over the stop time; a weld whose load beats\n// its strength by the weld-stress rule is not made, and every module cut off from\n// the bridge by the broken welds is loose and slides.\nexport function crashHull(G, hull, v, opts) {\n  const d = { ...HULL_DIALS, ...(opts && opts.dials) };\n  const { world, war } = G, f = G.run.focus;\n  const list = hull.list, ws = hull.builder.weldsOf(list);\n  const a = v / d.crashStop;\n  const broken = new Set(breaking(weldLoads(hull.builder, MODULES, list, ws, a, 1), ws));\n  const held = ws.filter((w, k) => !broken.has(k));\n  const keep = hull.builder.connectedFrom(list, held, 0);\n  const slide = d.slideFrac * v;\n  const slots = list.map((m) => ({ x: f.x + d.offsetX + m.gx * d.pitch, z: f.z + d.offsetZ + m.gy * d.pitch }));\n  const bodies = list.map((m, i) => {\n    const loose = !keep.has(i);\n    const x = slots[i].x + (loose ? slide : 0), z = slots[i].z;\n    const b = addBody(world, { kind: "chunk", team: 1, mass: MODULES[m.t].kg * d.kgPerKg, hx: d.box, hy: d.box, hz: d.box, x, y: war.field.heightAt(x, z) + d.box + d.lift, z, hp: d.moduleHp, friction: 0.65, restitution: 0.02 });\n    b.sleeping = true; b.town = "hull"; b.module = m.t; b.maxHp = d.moduleHp; b.tint = loose ? "timber" : "wall";\n    return b;\n  });\n  const welds = [];\n  for (const w of held) if (keep.has(w.a) && keep.has(w.b)) welds.push({ a: w.a, b: w.b, weld: addWeld(world, bodies[w.a], bodies[w.b], w.strength * d.kgPerKg) });\n  G.hull = { list, builder: hull.builder, bodies, slots, welds, v, a, broken: [...broken], loose: list.map((m, i) => i).filter((i) => !keep.has(i)), dials: d };\n  return G.hull;\n}\n\n// joined(G): the modules joined to the bridge through unbroken welds between living modules.\nfunction joined(G) {\n  const H = G.hull;\n  if (!H || !H.bodies[0].alive) return new Set();\n  const ws = H.welds.filter((w) => !w.weld.broken && H.bodies[w.a].alive && H.bodies[w.b].alive).map((w) => ({ a: w.a, b: w.b }));\n  return H.builder.connectedFrom(H.list, ws, 0);\n}\n\n// looseModules(G): the living modules not joined to the bridge.\nexport function looseModules(G) {\n  if (!G.hull) return [];\n  const j = joined(G);\n  return G.hull.bodies.map((b, i) => i).filter((i) => G.hull.bodies[i].alive && !j.has(i));\n}\n\n// weldBack(G, i): a module back in its slot, welded to every living grid neighbour it\n// is not yet welded to. The repair\'s mechanism; her act comes in the next task.\nexport function weldBack(G, i) {\n  const H = G.hull, d = H.dials, b = H.bodies[i];\n  if (!b || !b.alive) return 0;\n  const s = H.slots[i];\n  b.pos.x = s.x; b.pos.z = s.z; b.pos.y = G.war.field.heightAt(s.x, s.z) + d.box + d.lift;\n  b.v.x = 0; b.v.y = 0; b.v.z = 0; b.w.x = 0; b.w.y = 0; b.w.z = 0; b.sleeping = true; b.tint = "wall";\n  let n = 0;\n  for (const w of H.builder.weldsOf(H.list)) {\n    if (w.a !== i && w.b !== i) continue;\n    const o = H.bodies[w.a === i ? w.b : w.a];\n    if (!o.alive) continue;\n    if (H.welds.some((x) => ((x.a === w.a && x.b === w.b) || (x.a === w.b && x.b === w.a)) && !x.weld.broken)) continue;\n    H.welds.push({ a: w.a, b: w.b, weld: addWeld(G.world, H.bodies[w.a], H.bodies[w.b], w.strength * d.kgPerKg) }); n++;\n  }\n  return n;\n}\n\n// order(G, kind, x, z, which): the player\'s orders. "gun" places one of coldsnap\'s\n// towers at the ground point by its build law: held ground, a free cell, the live\n// price, one purchase a second. "takeoff" hands the purse back as kilograms, names\n// the modules lost, and refuses while a living module is loose or the bridge is dead.\n'),
('  if (kind === "takeoff") return { ok: true, scrapKg: run.resources * G.dials.kgPerScrap };\n',
 '  if (kind === "takeoff") {\n    const out = { ok: true, scrapKg: run.resources * G.dials.kgPerScrap, lost: [], keptList: null, abandoned: false };\n    if (G.hull) {\n      const H = G.hull;\n      if (!H.bodies[0].alive) return { ok: false, reason: "the bridge is lost", abandoned: true };\n      const loose = looseModules(G);\n      if (loose.length) return { ok: false, reason: loose.length + (loose.length > 1 ? " modules loose" : " module loose"), loose };\n      const j = joined(G);\n      out.lost = H.list.map((m, i) => i).filter((i) => !j.has(i)).map((i) => H.list[i].t);\n      out.keptList = H.list.filter((m, i) => j.has(i)).map((m) => ({ ...m }));\n    }\n    return out;\n  }\n'),
('  return { t: world.t, bell: run.bell, bellIn: Math.max(0, run.bellAt - world.t), scrap: run.resources, scrapKg: run.resources * G.dials.kgPerScrap, foes, guns,\n    standing: run.depotStanding == null ? 1 : run.depotStanding, lost: !!run.gameOver };\n',
 '  const H = G.hull, alive = H ? H.bodies.filter((b) => b.alive).length : 0;\n  const modules = H ? { total: H.bodies.length, alive, loose: looseModules(G).length } : null;\n  return { t: world.t, bell: run.bell, bellIn: Math.max(0, run.bellAt - world.t), scrap: run.resources, scrapKg: run.resources * G.dials.kgPerScrap, foes, guns, modules,\n    standing: H ? alive / H.bodies.length : (run.depotStanding == null ? 1 : run.depotStanding), lost: !!(H && !H.bodies[0].alive), warOver: !!run.gameOver };\n'),
]
for old, new in reps:
    assert s.count(old) == 1, old[:60]
    s = s.replace(old, new)
open(p, "w", encoding="utf-8").write(s)
ARK_EOF_2
node --check src/games/gravitys-ark/ground.js && echo "syntax ok ground.js"
test "$(sha256sum src/games/gravitys-ark/ground.js | cut -c1-16)" = "24be72c5620ba2be" && echo OK src/games/gravitys-ark/ground.js || echo FAILED src/games/gravitys-ark/ground.js
```

3. The screen: the hull crashes at entry, the pane's modules line, the take-off button follows the bridge, the lost state. Every anchor is asserted; syntax check; the hash line must print OK.

```sh
python3 - <<'ARK_EOF_3'
p = "docs/gravitys-ark/ground.js"; s = open(p, encoding="utf-8").read()
reps = [
('// GRAVITY\'S ARK — ground.js: the ground\'s screen, phase 0.1.1. Coldsnap\'s\n// drawing on its own canvas, its sound, the camera, the taps, the pane, the\n// buttons. The main file takes only the hookup lines.\n',
 '// GRAVITY\'S ARK — ground.js: the ground\'s screen, phase 0.1.1. Coldsnap\'s\n// drawing on its own canvas, its sound, the camera, the taps, the pane, the\n// buttons; the hull crashes onto the ground at entry. The main file takes only\n// the hookup lines.\n'),
('import { makeGround, order, tick, summary, price, GUNS } from "../../src/games/gravitys-ark/ground.js";\n',
 'import { makeGround, crashHull, order, tick, summary, price, GUNS } from "../../src/games/gravitys-ark/ground.js";\n'),
('  function enter(seed, w, scrapKg) {\n    G = makeGround(seed, w, scrapKg);\n',
 '  function enter(seed, w, scrapKg, hull, v) {\n    G = makeGround(seed, w, scrapKg);\n    const H = crashHull(G, hull, v);\n    say("the hull is down: " + H.bodies.length + " modules, " + H.loose.length + " loose");\n'),
('      "the hull stands " + fmt(s.standing * 100, 0) + "%" + (s.lost ? "   THE HULL IS LOST" : ""),\n',
 '      "modules " + (s.modules ? s.modules.alive + " of " + s.modules.total + " standing, " + s.modules.loose + " loose" : "none") + "   the hull stands " + fmt(s.standing * 100, 0) + "%" + (s.lost ? "   THE BRIDGE IS LOST" : ""),\n'),
('    $(ids.takeoff).disabled = !!G.run.gameOver;\n', '    $(ids.takeoff).disabled = summary(G).lost;\n'),
('  return { enter, leave, step, draw, pane, buttons, active: () => !!G,\n', '  return { enter, leave, step, draw, pane, buttons, active: () => !!G, lost: () => !!(G && summary(G).lost),\n'),
]
for old, new in reps:
    assert s.count(old) == 1, old[:60]
    s = s.replace(old, new)
open(p, "w", encoding="utf-8").write(s)
ARK_EOF_3
node --check docs/gravitys-ark/ground.js && echo "syntax ok screen"
test "$(sha256sum docs/gravitys-ark/ground.js | cut -c1-16)" = "d1395365054c75bc" && echo OK docs/gravitys-ark/ground.js || echo FAILED docs/gravitys-ark/ground.js
```

4. The main file: the seam down carries the hull and the arrival speed; the seam up takes the purse and the kept build list; the bridge lost is the ship lost; TAKE OFF asks the ground first, then the road. Every anchor is asserted; syntax check; the hash line must print OK.

```sh
python3 - <<'ARK_EOF_4'
p = "docs/gravitys-ark/main.js"; s = open(p, encoding="utf-8").read()
reps = [
('function enterGround(v) { view = "ground"; fieldTap = null; GS.enter(seed, galaxy.worlds[ship.landed], hull.scrap); hull.scrap = 0; state.events.push({ k: "on the ground at " + fmt(v, 1) + " m/s", t: state.t }); }\nfunction leaveGround() { const r = GS.takeoff(); if (r.ok) hull.scrap += r.scrapKg; GS.leave(); view = "space"; }\n',
 'function enterGround(v) { view = "ground"; fieldTap = null; GS.enter(seed, galaxy.worlds[ship.landed], hull.scrap, hull, v); hull.scrap = 0; state.events.push({ k: "on the ground at " + fmt(v, 1) + " m/s", t: state.t }); }\n// leaveGround(g): the seam up, after the road has let the ship go: the purse back as kilograms, the modules lost gone from the build list\nfunction leaveGround(g) { hull.scrap += g.scrapKg; if (g.keptList) hull.list = g.keptList; if (g.lost.length) state.events.push({ k: "lost on the ground: " + g.lost.join(" "), t: state.t }); GS.leave(); view = "space"; }\n'),
('      if (view === "ground") { GS.step(DT / 2); GS.step(DT / 2); }   // the war steps at coldsnap\'s own 1/120\n',
 '      if (view === "ground") { GS.step(DT / 2); GS.step(DT / 2); if (ship.alive && GS.lost()) { ship.alive = false; state.events.push({ k: "ABANDON SHIP", t: state.t }); logAdd("death", { v: 0 }); } }   // the war steps at coldsnap\'s own 1/120; the bridge lost is the ship lost\n'),
('$("gTakeoff").onclick = () => { if (view !== "ground") return; const t = road.takeoff(); if (!t.ok) { state.events.push({ k: "no takeoff: " + t.reason, t: state.t }); return; } if (t.collapse) collapseT = state.t; leaveGround(); };\n',
 '$("gTakeoff").onclick = () => { if (view !== "ground") return; const g = GS.takeoff(); if (!g.ok) { state.events.push({ k: "no takeoff: " + g.reason, t: state.t }); return; } const t = road.takeoff(); if (!t.ok) { state.events.push({ k: "no takeoff: " + t.reason, t: state.t }); return; } if (t.collapse) collapseT = state.t; leaveGround(g); };\n'),
]
for old, new in reps:
    assert s.count(old) == 1, old[:60]
    s = s.replace(old, new)
open(p, "w", encoding="utf-8").write(s)
ARK_EOF_4
node --check docs/gravitys-ark/main.js && echo "syntax ok main.js"
test "$(sha256sum docs/gravitys-ark/main.js | cut -c1-16)" = "8b72a0767f5499bd" && echo OK docs/gravitys-ark/main.js || echo FAILED docs/gravitys-ark/main.js
```

5. Two checks in the ark's gate: the crash at a rolled speed against the weld-stress rule computed in the check itself, and twin crashes agreeing; TAKE OFF refused while loose, allowed once welded back, the dead lost, the bridge dead abandoning. Both anchors are asserted; syntax check; the hash line must print OK.

```sh
python3 - <<'ARK_EOF_5'
p = "scripts/gravitys-ark-test.mjs"; s = open(p, encoding="utf-8").read()
reps = [
('import { makeGround, order as groundOrder, tick as groundTick, hash as groundHash, GROUND_DIALS } from "../src/games/gravitys-ark/ground.js";\n',
 'import { makeGround, order as groundOrder, tick as groundTick, hash as groundHash, GROUND_DIALS, crashHull, looseModules, weldBack, HULL_DIALS } from "../src/games/gravitys-ark/ground.js";\n'),
('console.log(`gravitys-ark-test: ${pass} PASS / ${fail} FAIL`);\n',
 '{ // 40. ark: the crash puts the hull on the ground as bodies welded by the weld-stress rule at a rolled speed, and twin crashes agree\n  // 41. ark: TAKE OFF is refused while a module is loose, allowed once every loose module is welded back, and the dead are lost\n  const gSeed = rollSeed(), g = makeGalaxy(gSeed), w = g.worlds[0], v = rng() * 30;\n  const mk = (speed) => { const G = makeGround(gSeed, w, 900); const H = crashHull(G, makeHull(STARTER_HULL), speed); return { G, H }; };\n  const A = mk(v), B = mk(v);\n  const hull = makeHull(STARTER_HULL), ws = hull.builder.weldsOf(hull.list);\n  const broken = new Set(breaking(weldLoads(hull.builder, MODULES, hull.list, ws, v / HULL_DIALS.crashStop, 1), ws));\n  const keep = hull.builder.connectedFrom(hull.list, ws.filter((x, k) => !broken.has(k)), 0);\n  const expectLoose = hull.list.map((m, i) => i).filter((i) => !keep.has(i));\n  const expectWelds = ws.filter((x, k) => !broken.has(k) && keep.has(x.a) && keep.has(x.b)).length;\n  const pos = (X) => JSON.stringify(X.H.bodies.map((b) => [b.pos.x, b.pos.y, b.pos.z, b.mass, b.alive]));\n  check("ark: the crash puts the hull on the ground as bodies welded by the weld-stress rule at a rolled speed, and twin crashes agree",\n    A.H.bodies.length === STARTER_HULL.length && A.H.bodies.every((b) => b.kind === "chunk" && b.alive && b.team === 1) && JSON.stringify(A.H.loose) === JSON.stringify(expectLoose) && A.H.welds.length === expectWelds && pos(A) === pos(B));\n  const C = mk(30);   // at 30 m/s the engine\'s weld breaks by the rule: 1400 kg at 100 m/s/s beats 120000 N\n  const refused = groundOrder(C.G, "takeoff");\n  for (const i of looseModules(C.G)) weldBack(C.G, i);\n  const allowed = groundOrder(C.G, "takeoff");\n  C.H.bodies[3].alive = false; C.H.bodies[3].hp = 0;\n  const lostPod = groundOrder(C.G, "takeoff");\n  C.H.bodies[0].alive = false; C.H.bodies[0].hp = 0;\n  const abandoned = groundOrder(C.G, "takeoff");\n  check("ark: TAKE OFF is refused while a module is loose, allowed once every loose module is welded back, and the dead are lost",\n    C.H.loose.length === 1 && C.H.loose[0] === 1 && !refused.ok && refused.loose.length === 1 && allowed.ok && allowed.lost.length === 0 && allowed.keptList.length === 4\n    && lostPod.ok && lostPod.lost.length === 1 && lostPod.lost[0] === "pod" && lostPod.keptList.length === 3 && !abandoned.ok && abandoned.abandoned === true);\n}\n\nconsole.log(`gravitys-ark-test: ${pass} PASS / ${fail} FAIL`);\n'),
]
for old, new in reps:
    assert s.count(old) == 1, old[:60]
    s = s.replace(old, new)
open(p, "w", encoding="utf-8").write(s)
ARK_EOF_5
node --check scripts/gravitys-ark-test.mjs && echo "syntax ok gate"
test "$(sha256sum scripts/gravitys-ark-test.mjs | cut -c1-16)" = "fe7d183f1fbb9276" && echo OK scripts/gravitys-ark-test.mjs || echo FAILED scripts/gravitys-ark-test.mjs
```

6. Run the three gates that read what changed. The ark's gate must print 42 PASS lines, then `gravitys-ark-test: 42 PASS / 0 FAIL`, then `gravitys-ark-test PASS`; the other two must end in their PASS lines. Capture the ark's gate whole, then show its last three lines. Any FAIL stops the task here.

```sh
node scripts/gate.mjs gravitys-ark > /tmp/ark-gate.txt; tail -3 /tmp/ark-gate.txt; grep -m1 '^seeds' /tmp/ark-gate.txt
node scripts/gate.mjs manifest | tail -1
node scripts/gate.mjs parts | tail -1
```

7. The records: the phase document's task row. Then the parts build over every gate, about four minutes; it must name 50 gates and every verdict must be ok.

```sh
python3 - <<'ARK_EOF_7'
ph = "docs/plans/phase-0.1.1-the-hold.md"; s = open(ph, encoding="utf-8").read()
old = "the seam up and down. DISPATCHED. →"
assert s.count(old) == 1, "task row"
open(ph, "w", encoding="utf-8").write(s.replace(old, "the seam up and down. LANDED, commit stamped below. →"))
ARK_EOF_7
node scripts/parts.mjs --gates all
node -e 'const t=require("./docs/parts/parts.json");const bad=Object.values(t.gates).filter(g=>g.verdict!=="ok").map(g=>g.name);console.log(Object.keys(t.gates).length+" gates, "+bad.length+" not ok"+(bad.length?": "+bad.join(", "):""));process.exit(bad.length?1:0)'
```

Required: a count line naming 50 gates, `50 gates, 0 not ok`.

8. Commit and push the landing, then stamp the task row with the real hash in a second small commit. Never amend after stamping.

```sh
git add src/games/gravitys-ark/ground.js docs/gravitys-ark/ground.js docs/gravitys-ark/main.js scripts/gravitys-ark-test.mjs docs/parts docs/plans
git commit -m "phase 0.1.1 task 2 — the hull on the ground: modules as bodies welded by the weld-stress rule at the seam's scale, TAKE OFF gated on every living module welded, the lost named

The crash at the arrival speed over the stop time; loose modules slide; the weld-back mechanism waits for her. Two checks in the ark's gate.
gravitys-ark-test 42 PASS / 0 FAIL; manifest and parts green; the parts build over 50 gates, every verdict ok.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01QSq3kZC3Bk9SC5RwnqYUfs"
git push origin main
H=$(git rev-parse --short HEAD)
sed -i "s/the seam up and down. LANDED, commit stamped below. →/the seam up and down. LANDED, commit \`$H\`. →/" docs/plans/phase-0.1.1-the-hold.md
git add docs/plans && git commit -m "phase 0.1.1 task 2 row stamped — $H

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01QSq3kZC3Bk9SC5RwnqYUfs"
git push origin main
```

## Acceptance

- Step 1: `0`, four OK lines.
- Steps 2 through 5: four OK lines, `syntax ok` four times.
- Step 6: `gravitys-ark-test: 42 PASS / 0 FAIL`, `gravitys-ark-test PASS`, a seeds line, `manifest-test PASS`, `parts-test PASS`.
- Step 7: the count line names 50 gates; `50 gates, 0 not ok`.
- Step 8: push accepted by origin; the stamp commit pushed.

After the landing the orchestrator republishes the page from `docs/parts/parts.html` to its fixed address and names it in the landing report.

## Report

Read-confirmation first, then one line of outcome, then bullets: step 6's lines verbatim; every OK line; the parts build's count line and the verdict line verbatim; both commit hashes; the push results. Every nonconformity its own labeled bullet. Fixture seeds: the seeds line the ark's gate printed in step 6, and the gravitys-ark seeds line from `docs/parts/parts.json` after the build; no seed is special.
