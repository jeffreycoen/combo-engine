# Task 0.1.3-5 — the ground remembers

One job: defences abandoned on a world persist there. At TAKE OFF every gun standing and every wall course on the ground is written on the world, kind and place; at the next landing on that world they stand again before the war runs, made as coldsnap makes them; nobody comes back for them. One check joins the ark's gate; the phase lands with this task and the version goes to 0.1.3. Every edit is an anchored replacement checked by hash; write exactly what is written, run the listed gates, report. You design nothing.

Suggested model: Sonnet 5.

Required reading, in order (confirm at the top of your report):
1. This file, whole.
2. `docs/plans/phase-0.1.3-the-nine-findings.md`, whole.

No demo file is read or written. Nothing under `/home/batman/coldsnap` is read, written, or run.

## Steps

Run from `/home/batman/combo-engine`. A failed assert, a wrong required value, or a FAILED hash line stops the task: report the step and its verbatim output, run nothing further. Never edit a file to make a hash match.

1. Assert the ground: the tracked files clean at task 4's landing, the six files this task edits at their landed hashes. The gates were recorded green at that landing and are not run again here.

```sh
git status --short | grep -v "^??" | wc -l
while read -r hash path; do test "$(sha256sum "$path" | cut -c1-16)" = "$hash" && echo "OK $path" || echo "FAILED $path"; done <<'GROUND'
babf3b13d53b40bd src/games/gravitys-ark/ground.js
7dd800dafcfd7479 docs/gravitys-ark/ground.js
9c622ae209ab5a58 docs/gravitys-ark/main.js
6f70387b189aba1b scripts/gravitys-ark-test.mjs
67b010e3fe31ea0d README.md
f9dd7a75d527a971 package.json
GROUND
```

Required: `0`, six OK lines.

2. The ark's ground layer: what the ground keeps at TAKE OFF, and the guns and walls standing again at the landing. Syntax check; the hash line must print OK.

```sh
python3 - <<'ARK_EOF_2'
def edit(p, reps):
    s = open(p, encoding="utf-8").read()
    for old, new in reps:
        assert s.count(old) == 1, (p, old[:70])
        s = s.replace(old, new)
    open(p, "w", encoding="utf-8").write(s)
edit("src/games/gravitys-ark/ground.js", [
('import { spawnSquadMembers } from "../../depot/state.js";\n', 'import { spawnSquadMembers, spawnWallCourses, effRange } from "../../depot/state.js";\n'),
("// joined(G): the modules joined to the bridge through unbroken welds between living modules.\n",
 "// leftBehind(G): what the ground keeps when the ship leaves: every gun standing and every wall\n// course on the ground, kind and place; abandoned, and there again on return.\nexport function leftBehind(G) {\n  const towers = [], walls = [];\n  for (const b of G.world.bodies) {\n    if (!b.alive || b.team !== 1) continue;\n    if (b.kind === \"tower\") towers.push({ key: b.towerType, x: b.pos.x, z: b.pos.z });\n    else if (b.kind === \"wall\" && b.course === 0) walls.push({ x: b.pos.x, z: b.pos.z, orient: b.orient || 0 });\n  }\n  return { towers, walls };\n}\n\n// standDefences(G, left): the guns and walls a landing before left on this world stand again\n// before the war runs, made as coldsnap makes them: a tower as its placement does, placement.js\n// lines 232 to 240; a wall as its build line lays a course, buildlines.js lines 173 to 178. A cell\n// no longer free is skipped; the paths recompute once. Returns how many stood.\nexport function standDefences(G, left) {\n  const out = { towers: 0, walls: 0 };\n  if (!left) return out;\n  const { world, war } = G, grid = war.grid, field = war.field;\n  const freeCell = (x, z) => { const g = grid.worldToGrid(x, z); if (!grid.inBounds(g.gx, g.gz)) return null; const cell = grid.cells[grid.idx(g.gx, g.gz)]; return cell.water || cell.ice || cell.blocked || cell.wallId ? null : { g, cell }; };\n  for (const t of left.towers || []) {\n    const spec = TOWER_SPECS[t.key], f = spec && freeCell(t.x, t.z); if (!f) continue;\n    f.cell.blocked = true;\n    const wp = grid.gridToWorld(f.g.gx, f.g.gz);\n    const b = addBody(world, { kind: \"tower\", team: 1, mass: 0, hx: 0.8, hy: spec.hy, hz: 0.8, x: wp.x, y: field.heightAt(wp.x, wp.z) + spec.hy, z: wp.z, hp: spec.hp });\n    b.towerType = t.key; b.flagPole = true; b.maxHp = b.hp;\n    b.effRange = effRange(world, { x: b.pos.x, y: b.pos.y + b.hy + 0.45, z: b.pos.z }, spec);\n    f.cell.wallId = b.id; f.cell.bTeam = 1; out.towers++;\n  }\n  for (const w of left.walls || []) {\n    const f = freeCell(w.x, w.z); if (!f) continue;\n    f.cell.blocked = true;\n    const b = spawnWallCourses(world, w.x, field.heightAt(w.x, w.z), w.z, w.orient, 1)[0];\n    f.cell.wallId = b.id; f.cell.bTeam = 1; out.walls++;\n  }\n  if (out.towers || out.walls) G.recomputeFlow();\n  return out;\n}\n\n// joined(G): the modules joined to the bridge through unbroken welds between living modules.\n"),
("walkerLost: !!(G.walker && G.walker.mech && !G.walker.mech.hull.alive) };\n", "walkerLost: !!(G.walker && G.walker.mech && !G.walker.mech.hull.alive), left: leftBehind(G) };\n"),
])
ARK_EOF_2
node --check src/games/gravitys-ark/ground.js && echo "syntax ok ground.js"
test "$(sha256sum src/games/gravitys-ark/ground.js | cut -c1-16)" = "0c9b9bcbbaaf132d" && echo OK src/games/gravitys-ark/ground.js || echo FAILED src/games/gravitys-ark/ground.js
```

3. The page: the screen stands the defences at entry and says so; the main file keeps each world's memory, hands it to the screen at the landing, and takes it back at TAKE OFF with a log line. Syntax checks; both hash lines must print OK.

```sh
python3 - <<'ARK_EOF_3'
def edit(p, reps):
    s = open(p, encoding="utf-8").read()
    for old, new in reps:
        assert s.count(old) == 1, (p, old[:70])
        s = s.replace(old, new)
    open(p, "w", encoding="utf-8").write(s)
edit("docs/gravitys-ark/ground.js", [
("GUNS, looseModules, herBody } from \"../../src/games/gravitys-ark/ground.js\";\n", "GUNS, looseModules, herBody, standDefences } from \"../../src/games/gravitys-ark/ground.js\";\n"),
("  function enter(seed, w, scrapKg, hull, v, crew) {\n", "  function enter(seed, w, scrapKg, hull, v, crew, left) {\n"),
("    if (G.guards.length) say(summary(G).guards.total + \" riflemen stand guard\");\n    // the landing's card",
 "    if (G.guards.length) say(summary(G).guards.total + \" riflemen stand guard\");\n    const stood = standDefences(G, left); if (stood.towers || stood.walls) say(stood.towers + \" guns and \" + stood.walls + \" wall sections stand where you left them\");\n    // the landing's card"),
])
edit("docs/gravitys-ark/main.js", [
("let view = \"space\";\n", "let view = \"space\";\nconst groundMemory = {};   // what each world keeps when the ship leaves: the guns and walls abandoned there, standing again on return\n"),
("GS.enter(seed, galaxy.worlds[ship.landed], hull.scrap, hull, v, crew);", "GS.enter(seed, galaxy.worlds[ship.landed], hull.scrap, hull, v, crew, groundMemory[galaxy.worlds[ship.landed].id]);"),
("function leaveGround(g) { hull.scrap += g.scrapKg; if (g.keptList) hull.list = g.keptList; if (g.walkerLost) hull.walkerLost = true; if (g.lost.length) state.events.push({ k: \"lost on the ground: \" + g.lost.join(\" \"), t: state.t }); GS.leave(); view = \"space\"; }\n",
 "function leaveGround(g, wid) { hull.scrap += g.scrapKg; if (g.keptList) hull.list = g.keptList; if (g.walkerLost) hull.walkerLost = true; if (g.lost.length) state.events.push({ k: \"lost on the ground: \" + g.lost.join(\" \"), t: state.t }); if (g.left) { groundMemory[wid] = g.left; if (g.left.towers.length || g.left.walls.length) state.events.push({ k: \"abandoned on \" + wid + \": \" + g.left.towers.length + \" guns, \" + g.left.walls.length + \" wall sections\", t: state.t }); } GS.leave(); view = \"space\"; }\n"),
("const g = GS.takeoff(); if (!g.ok) { state.events.push({ k: \"no takeoff: \" + g.reason, t: state.t }); return; } const t = road.takeoff();", "const g = GS.takeoff(); if (!g.ok) { state.events.push({ k: \"no takeoff: \" + g.reason, t: state.t }); return; } const wid = galaxy.worlds[ship.landed].id; const t = road.takeoff();"),
("if (t.collapse) collapseT = state.t; leaveGround(g); };\n", "if (t.collapse) collapseT = state.t; leaveGround(g, wid); };\n"),
])
ARK_EOF_3
node --check docs/gravitys-ark/ground.js && echo "syntax ok screen"
node --check docs/gravitys-ark/main.js && echo "syntax ok main.js"
test "$(sha256sum docs/gravitys-ark/ground.js | cut -c1-16)" = "25d12e9bd98d3d78" && echo OK docs/gravitys-ark/ground.js || echo FAILED docs/gravitys-ark/ground.js
test "$(sha256sum docs/gravitys-ark/main.js | cut -c1-16)" = "417bba636455185c" && echo OK docs/gravitys-ark/main.js || echo FAILED docs/gravitys-ark/main.js
```

4. The ark's gate: one check joins at the end. Syntax check; the hash line must print OK.

```sh
python3 - <<'ARK_EOF_4'
p = "scripts/gravitys-ark-test.mjs"; s = open(p, encoding="utf-8").read()
imp = "summary as groundSummary, fellTrees } from \"../src/games/gravitys-ark/ground.js\";\n"
assert s.count(imp) == 1, "ground import"
s = s.replace(imp, "summary as groundSummary, fellTrees, leftBehind, standDefences } from \"../src/games/gravitys-ark/ground.js\";\nimport { spawnWallCourses } from \"../src/depot/state.js\";\n")
anchor = "console.log(`gravitys-ark-test: ${pass} PASS / ${fail} FAIL`);\n"
assert s.count(anchor) == 1, "tail anchor"
block = '''{ // 57. ark: the ground remembers: the guns and walls standing at TAKE OFF are what the world keeps, and they stand again on the next landing there, coldsnap's own bodies in the same cells, twin for twin
  const gSeed = rollSeed(), g = makeGalaxy(gSeed), w = g.worlds[0];
  const mk = () => { const G = makeGround(gSeed, w, 900); crashHull(G, makeHull(STARTER_HULL), 5); return G; };
  const A = mk(), r = A.hull.axis.r;
  let gun = null;
  for (let dz = -6; dz <= 6 && !gun; dz += 2) for (let dx = -6; dx <= 6 && !gun; dx += 2) { const q = groundOrder(A, "gun", A.site.x - r.x * 25 + dx, A.site.z - r.z * 25 + dz, "mg"); if (q.ok) gun = q; }
  let wp = null, wc = null;   // a free cell for a wall on the crew's side, the first the scan finds
  for (let dz = -6; dz <= 6 && !wp; dz += 2) for (let dx = -6; dx <= 6 && !wp; dx += 2) { const p = { x: A.site.x - r.x * 15 + dx, z: A.site.z - r.z * 15 + dz }, c = A.war.grid.cellAt(p.x, p.z); if (c && !c.blocked && !c.wallId && !c.water && !c.ice) { wp = p; wc = c; } }
  const wallOk = !!wp;
  if (wallOk) { wc.blocked = true; const b = spawnWallCourses(A.world, wp.x, A.war.field.heightAt(wp.x, wp.z), wp.z, 1, 1)[0]; wc.wallId = b.id; wc.bTeam = 1; }   // a wall laid as the build line lays one
  const up = groundOrder(A, "takeoff"), left = up.left;
  const kept = up.ok && !!gun && wallOk && !!left && left.towers.length === 1 && left.towers[0].key === "mg" && left.walls.length === 1 && left.walls[0].orient === 1;
  const B = mk(), C = mk(), sb = standDefences(B, left), sc = standDefences(C, left);
  const tower = B.world.bodies.find((b) => b.kind === "tower" && b.team === 1), wall = B.world.bodies.find((b) => b.kind === "wall" && b.team === 1 && b.course === 0);
  const tc = tower && B.war.grid.cellAt(tower.pos.x, tower.pos.z), wcB = wall && B.war.grid.cellAt(wall.pos.x, wall.pos.z);
  const stood = sb.towers === 1 && sb.walls === 1 && !!tower && tower.towerType === "mg" && Math.hypot(tower.pos.x - left.towers[0].x, tower.pos.z - left.towers[0].z) < 1e-6 && !!tc && tc.blocked === true && tc.wallId === tower.id
    && !!wall && wall.orient === 1 && Math.hypot(wall.pos.x - wp.x, wall.pos.z - wp.z) < 1e-9 && !!wcB && wcB.wallId === wall.id;
  const twin = JSON.stringify(sb) === JSON.stringify(sc) && JSON.stringify(leftBehind(B)) === JSON.stringify(leftBehind(C)) && JSON.stringify(leftBehind(B)) === JSON.stringify(left);
  check("ark: the ground remembers: the guns and walls standing at TAKE OFF are what the world keeps, and they stand again on the next landing there, coldsnap's own bodies in the same cells, twin for twin", kept && stood && twin);
}

'''
s = s.replace(anchor, block + anchor)
open(p, "w", encoding="utf-8").write(s)
ARK_EOF_4
node --check scripts/gravitys-ark-test.mjs && echo "syntax ok gate"
test "$(sha256sum scripts/gravitys-ark-test.mjs | cut -c1-16)" = "85c92b40b84c85f5" && echo OK scripts/gravitys-ark-test.mjs || echo FAILED scripts/gravitys-ark-test.mjs
```

5. The records that ride the landing: the README's ground line says what the world keeps; the version to 0.1.3. Both hash lines must print OK.

```sh
python3 - <<'ARK_EOF_5'
def edit(p, reps):
    s = open(p, encoding="utf-8").read()
    for old, new in reps:
        assert s.count(old) == 1, (p, old[:70])
        s = s.replace(old, new)
    open(p, "w", encoding="utf-8").write(s)
edit("README.md", [("TAKE OFF needs every living module welded to the bridge and hands the purse back; the bridge lost is ABANDON SHIP.", "TAKE OFF needs every living module welded to the bridge and hands the purse back; every gun and wall standing then is what the world keeps, abandoned there and standing again on the next landing there; the bridge lost is ABANDON SHIP.")])
edit("package.json", [('"version": "0.1.2"', '"version": "0.1.3"')])
ARK_EOF_5
test "$(sha256sum README.md | cut -c1-16)" = "48deabcbcf8d792d" && echo OK README.md || echo FAILED README.md
test "$(sha256sum package.json | cut -c1-16)" = "5cc5cba56c64a939" && echo OK package.json || echo FAILED package.json
```

6. Run the ark's gate. It must print 53 PASS lines, one more than the recorded 52, then `gravitys-ark-test: 53 PASS / 0 FAIL`, then `gravitys-ark-test PASS`. Any FAIL stops the task here.

```sh
node scripts/gate.mjs gravitys-ark > /tmp/ark-gate.txt; tail -3 /tmp/ark-gate.txt; grep -m1 '^seeds' /tmp/ark-gate.txt
```

7. The phase lands: its status line and the task row. Then the parts build over every gate, about four minutes; it must name 50 gates and every verdict must be ok, the ark's gate among them at 53 PASS and 0 FAIL.

```sh
python3 - <<'ARK_EOF_7'
ph = "docs/plans/phase-0.1.3-the-nine-findings.md"; s = open(ph, encoding="utf-8").read()
old = "defences abandoned and persisting. DISPATCHED. →"
assert s.count(old) == 1, "task row"
s = s.replace(old, "defences abandoned and persisting. LANDED, commit stamped below. →")
old2 = "Status: DISPATCHED. Task 5 dispatched."
assert s.count(old2) == 1, "status line"
s = s.replace(old2, "Status: LANDED, commit stamped below, 2026-09-09. Five tasks landed; the ark's gate 53 PASS / 0 FAIL; the parts build 50 gates, every verdict ok.")
open(ph, "w", encoding="utf-8").write(s)
ARK_EOF_7
grep -c "commit stamped below" docs/plans/phase-0.1.3-the-nine-findings.md
node scripts/parts.mjs --gates all
node -e 'const t=require("./docs/parts/parts.json");const bad=Object.values(t.gates).filter(g=>g.verdict!=="ok").map(g=>g.name);const a=t.gates["gravitys-ark"];console.log(Object.keys(t.gates).length+" gates, "+bad.length+" not ok"+(bad.length?": "+bad.join(", "):""));console.log("gravitys-ark "+a.pass+" PASS / "+a.fail+" FAIL; "+a.seeds);process.exit(bad.length||a.pass!==53?1:0)'
```

Required: `2`, a count line naming 50 gates, `50 gates, 0 not ok`, `gravitys-ark 53 PASS / 0 FAIL;` with its seeds.

8. Commit and push the landing, then stamp the real hash into the status line and the task row in a second small commit. Never amend after stamping.

```sh
git add src/games/gravitys-ark/ground.js docs/gravitys-ark/ground.js docs/gravitys-ark/main.js scripts/gravitys-ark-test.mjs README.md package.json docs/parts docs/plans
git commit -m "phase 0.1.3 — the nine findings: the ground remembers its defences, the phase lands, the version to 0.1.3

Every gun and wall standing at TAKE OFF is what the world keeps; they stand again on the next landing there, as coldsnap makes them.
gravitys-ark-test 53 PASS / 0 FAIL; the parts build over 50 gates, every verdict ok.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01QSq3kZC3Bk9SC5RwnqYUfs"
git push origin main
H=$(git rev-parse --short HEAD)
sed -i "s/commit stamped below/commit \`$H\`/g" docs/plans/phase-0.1.3-the-nine-findings.md
git add docs/plans && git commit -m "phase 0.1.3 record stamped — $H

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01QSq3kZC3Bk9SC5RwnqYUfs"
git push origin main
```

## Acceptance

- Step 1: `0`, six OK lines.
- Steps 2 through 5: six OK lines, `syntax ok` four times.
- Step 6: `gravitys-ark-test: 53 PASS / 0 FAIL`, `gravitys-ark-test PASS`, a seeds line.
- Step 7: `2`; the count line names 50 gates; `50 gates, 0 not ok`; `gravitys-ark 53 PASS / 0 FAIL;` with its seeds.
- Step 8: push accepted by origin; the stamp commit pushed.

After the landing the orchestrator republishes the page from `docs/parts/parts.html` to its fixed address and names it, with the game's address, in the landing report.

## Report

Read-confirmation first, then one line of outcome, then bullets: step 6's lines verbatim; every OK line; the parts build's count line and the verdict line verbatim; the ark's gate line verbatim; both commit hashes; the push results. Every nonconformity its own labeled bullet, with the verbatim output. Fixture seeds: the seeds line the ark's gate printed in step 6 and the one from step 7's line; no seed is special.
