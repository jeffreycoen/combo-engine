# Task 0.1.3-2 — the field

One job: the field is the ship's. The war boots without coldsnap's town; the ship flies its own flag over the bridge, so the ground around it is the player's to build on; the attacker's objective and the paths' end move to the bridge; placement reaches 60 m from the bridge; the crash gouges the ground back along the line the ship came in on and fells the trees along it. Two doors open in coldsnap's files, each one line and a listed difference: the boot skips the town when asked, and the placement radius takes the ark's own number. One check joins the ark's gate and one is re-taught, named below. Every edit is an anchored replacement checked by hash; write exactly what is written, run the listed gates, report. You design nothing.

Suggested model: Sonnet 5.

Required reading, in order (confirm at the top of your report):
1. This file, whole.
2. `docs/plans/phase-0.1.3-the-nine-findings.md`, whole.

No demo file is read or written. Nothing under `/home/batman/coldsnap` is read, written, or run.

## Steps

Run from `/home/batman/combo-engine`. A failed assert, a wrong required value, or a FAILED hash line stops the task: report the step and its verbatim output, run nothing further. Never edit a file to make a hash match.

1. Assert the ground: the tracked files clean at task 1's landing, the five files this task edits at their landed hashes. The gates were recorded green at that landing and are not run again here.

```sh
git status --short | grep -v "^??" | wc -l
while read -r hash path; do test "$(sha256sum "$path" | cut -c1-16)" = "$hash" && echo "OK $path" || echo "FAILED $path"; done <<'GROUND'
19a6d48d0fbf5742 src/games/gravitys-ark/ground.js
e1c453b452d63aaa src/depot/boot.js
48506941ea78d47f src/depot/placement.js
82b1b00952d862e3 scripts/gravitys-ark-test.mjs
1bfbbbc8930f40d7 README.md
GROUND
```

Required: `0`, five OK lines.

2. The ark's ground layer: the boot without the town, the placement radius, the ship's flag, the objective at the bridge, the gouge, the felled trees, the held steps at the crash. Syntax check; the hash line must print OK.

```sh
python3 - <<'ARK_EOF_2'
def edit(p, reps):
    s = open(p, encoding="utf-8").read()
    for old, new in reps:
        assert s.count(old) == 1, (p, old[:70])
        s = s.replace(old, new)
    open(p, "w", encoding="utf-8").write(s)
edit("src/games/gravitys-ark/ground.js", [
("// kgPerScrap: the seam's rate between the ark's scrap in kilograms and coldsnap's\n// scrap. heldSteps and heldStep: territory steps run at the boot, so the crash\n// site is the player's ground from the first frame; the war's own clock takes it\n// from there. All PROPOSED.\nexport const GROUND_DIALS = { kgPerScrap: 10, heldSteps: 4, heldStep: 0.25 };\n",
 "// kgPerScrap: the seam's rate between the ark's scrap in kilograms and coldsnap's\n// scrap. heldSteps and heldStep: territory steps run at the crash, once the ship\n// flies its flag, so the ground around it is the player's from the first frame; the\n// war's own clock takes it from there. homelandR: how far from the bridge coldsnap's\n// placement reaches, the ark's own radius through the placement's option. All PROPOSED.\nexport const GROUND_DIALS = { kgPerScrap: 10, heldSteps: 8, heldStep: 0.25, homelandR: 60 };\n"),
("  const war = bootWar({ seed: groundSeed(seed, w) });\n", "  const war = bootWar({ seed: groundSeed(seed, w), town: false });   // no town: the ark's ground has only the ship to defend\n"),
("depotP: site, recomputeFlow });\n", "depotP: site, homelandR: d.homelandR, recomputeFlow });\n"),
("stick: { f: 0, l: 0, h: null }, site, recomputeFlow };\n", "stick: { f: 0, l: 0, h: null }, site, objG, recomputeFlow };\n"),
("// nearest axis; the hull's own gx axis runs on along that line, away from the depot,\n// and its gy axis across it, so the whole hull stands beyond the bridge, clear of the depot.\nexport const HULL_DIALS = { kgPerKg: 250, unit: 2.675, pitch: 10.7, lift: 0.02, crashStop: 0.3, slideFrac: 0.6, moduleHp: 400, site: 26 };\n",
 "// nearest axis; the hull's own gx axis runs on along that line, away from the depot,\n// and its gy axis across it, so the whole hull stands beyond the bridge, clear of the depot.\n// flagUp: how high over the bridge's roof the ship's flag flies. The gouge: the crash's\n// mark behind the hull along the line it came in on, gougeLen metres long, deepest\n// gougeDeep metres behind the bridge, gougeHalf metres to either side, gougeDepth metres\n// deep at the deepest; the trees within treeReach metres of its edge are felled along it.\nexport const HULL_DIALS = { kgPerKg: 250, unit: 2.675, pitch: 10.7, lift: 0.02, crashStop: 0.3, slideFrac: 0.6, moduleHp: 400, site: 26, flagUp: 1.5, gougeLen: 45, gougeDeep: 12, gougeHalf: 8, gougeDepth: 2.5, treeReach: 2 };\n"),
("  const slots = list.map((m) => ({ x: site.x + u.x * m.gx * d.pitch + r.x * m.gy * d.pitch, z: site.z + u.z * m.gx * d.pitch + r.z * m.gy * d.pitch }));\n  const bodies = list.map((m, i) => {\n",
 "  const slots = list.map((m) => ({ x: site.x + u.x * m.gx * d.pitch + r.x * m.gy * d.pitch, z: site.z + u.z * m.gx * d.pitch + r.z * m.gy * d.pitch }));\n  gougeGround(war.field, site, u, d);   // the ground takes the crash's mark first, so the modules sit in it\n  const bodies = list.map((m, i) => {\n"),
("  stampHull(G);\n  return G.hull;\n}\n",
 "  // the ship flies its flag: coldsnap's own emitter body, as its depot's is made at sim.js line 432, over the bridge's roof; the ground around the ship is the player's\n  const flag = addBody(world, { kind: \"flag\", team: 1, mass: 0, hx: 0.05, hy: 0.05, hz: 0.05, x: site.x, y: bodies[0].pos.y + bodies[0].hy + d.flagUp, z: site.z });\n  flag.sleeping = true; flag.flagPole = true; flag.town = \"hull\"; G.hull.flag = flag;\n  // the ship is the objective: the attacker's mark and the paths' end move to the bridge\n  war.map.OBJ_POS.x = site.x; war.map.OBJ_POS.z = site.z;\n  const og = war.grid.worldToGrid(site.x, site.z); G.objG.gx = og.gx; G.objG.gz = og.gz;\n  G.hull.felled = fellTrees(world, war.field, site, u, r, d);\n  for (let i = 0; i < G.dials.heldSteps; i++) stepTerritory(war.T, buildEmitters(world, war.map), G.dials.heldStep);\n  stampHull(G);\n  return G.hull;\n}\n\n// gougeGround(F, site, u, d): the crash's mark: the ground lowered along the line the ship came\n// in on, from under the hull back toward where it came from, deepest gougeDeep metres behind\n// the bridge and shallowing to nothing at gougeLen, in a trough gougeHalf metres to either side\n// with a rounded floor; the terrain marks itself dirty and redraws.\nexport function gougeGround(F, site, u, d) {\n  let n = 0;\n  for (let j = 0; j < F.n; j++) for (let i = 0; i < F.n; i++) {\n    const x = i * F.cs - F.half, z = j * F.cs - F.half;\n    const t = (site.x - x) * u.x + (site.z - z) * u.z, a = Math.abs((x - site.x) * -u.z + (z - site.z) * u.x);\n    if (t < 0 || t > d.gougeLen || a > d.gougeHalf) continue;\n    const s = t < d.gougeDeep ? t / d.gougeDeep : (d.gougeLen - t) / (d.gougeLen - d.gougeDeep);\n    F.h[F.idx(i, j)] -= d.gougeDepth * s * (1 - (a / d.gougeHalf) ** 2); n++;\n  }\n  F.dirty = true;\n  return n;\n}\n\n// qToR(q, R): a body's basis from its turn, coldsnap's own, core.js lines 54 to 65, copied here because the engine keeps it private.\nfunction qToR(q, R) {\n  const x = q.x, y = q.y, z = q.z, w = q.w;\n  const x2 = x + x, y2 = y + y, z2 = z + z;\n  const xx = x * x2, xy = x * y2, xz = x * z2;\n  const yy = y * y2, yz = y * z2, zz = z * z2;\n  const wx = w * x2, wy = w * y2, wz = w * z2;\n  R[0] = 1 - (yy + zz); R[1] = xy + wz; R[2] = xz - wy;\n  R[3] = xy - wz; R[4] = 1 - (xx + zz); R[5] = yz + wx;\n  R[6] = xz + wy; R[7] = yz - wx; R[8] = 1 - (xx + yy);\n  return R;\n}\n\n// fellTrees(world, F, site, u, r, d): every tree standing in the gouge or within treeReach of its edge\n// is felled along the line the ship came in on: dead, laid flat with its crown toward the ship, asleep\n// on the gouged ground. Returns how many fell.\nexport function fellTrees(world, F, site, u, r, d) {\n  let n = 0;\n  const k = { x: u.z, z: -u.x }, sn = Math.sin(Math.PI / 4), cs = Math.cos(Math.PI / 4);   // the turn that lays a trunk's up along u\n  for (const b of world.bodies) {\n    if (b.kind !== \"tree\" || !b.alive) continue;\n    const t = (site.x - b.pos.x) * u.x + (site.z - b.pos.z) * u.z, a = Math.abs((b.pos.x - site.x) * r.x + (b.pos.z - site.z) * r.z);\n    if (t < 0 || t > d.gougeLen || a > d.gougeHalf + d.treeReach) continue;\n    b.alive = false; b.hp = 0;\n    b.q.x = k.x * sn; b.q.y = 0; b.q.z = k.z * sn; b.q.w = cs; qToR(b.q, b.R);\n    b.pos.x += u.x * b.hy; b.pos.z += u.z * b.hy; b.pos.y = F.heightAt(b.pos.x, b.pos.z) + b.hx + 0.05;\n    b.v.x = 0; b.v.y = 0; b.v.z = 0; b.w.x = 0; b.w.y = 0; b.w.z = 0; b.sleeping = true;\n    n++;\n  }\n  return n;\n}\n"),
])
ARK_EOF_2
node --check src/games/gravitys-ark/ground.js && echo "syntax ok ground.js"
test "$(sha256sum src/games/gravitys-ark/ground.js | cut -c1-16)" = "d74736311d317c5e" && echo OK src/games/gravitys-ark/ground.js || echo FAILED src/games/gravitys-ark/ground.js
```

3. The two doors in coldsnap's files, one line each, the listed differences: the boot skips the town when asked; the placement radius takes the ark's own number. Syntax checks; both hash lines must print OK.

```sh
python3 - <<'ARK_EOF_3'
def edit(p, reps):
    s = open(p, encoding="utf-8").read()
    for old, new in reps:
        assert s.count(old) == 1, (p, old[:70])
        s = s.replace(old, new)
    open(p, "w", encoding="utf-8").write(s)
edit("src/depot/boot.js", [("    town = buildTown(world, grid, field, map);\n", "    town = opts.town === false ? [] : buildTown(world, grid, field, map);   // the ark boots its ground without the town: a listed difference from the checkout (phase 0.1.3)\n")])
edit("src/depot/placement.js", [("      const HOMELAND_R = 36; // provisional (F5)\n", "      const HOMELAND_R = ctx.homelandR || 36; // provisional (F5); the ark passes its own radius: a listed difference from the checkout (phase 0.1.3)\n")])
ARK_EOF_3
node --check src/depot/boot.js && echo "syntax ok boot.js"
node --check src/depot/placement.js && echo "syntax ok placement.js"
test "$(sha256sum src/depot/boot.js | cut -c1-16)" = "4c1822d04727da60" && echo OK src/depot/boot.js || echo FAILED src/depot/boot.js
test "$(sha256sum src/depot/placement.js | cut -c1-16)" = "95a48574a0384259" && echo OK src/depot/placement.js || echo FAILED src/depot/placement.js
```

4. The ark's gate: the purse check is re-taught to a ground that carries the ship, since held ground now grows from the ship's flag, its gun placed on the crew's side of the bridge; one check joins at the end. Syntax check; the hash line must print OK.

```sh
python3 - <<'ARK_EOF_4'
p = "scripts/gravitys-ark-test.mjs"; s = open(p, encoding="utf-8").read()
def edit(reps):
    global s
    for old, new in reps:
        assert s.count(old) == 1, old[:70]
        s = s.replace(old, new)
edit([
("  const A = makeGround(gSeed, w, kg), B = makeGround(gSeed, w, kg);\n", "  const A = makeGround(gSeed, w, kg), B = makeGround(gSeed, w, kg);\n  crashHull(A, makeHull(STARTER_HULL), 5); crashHull(B, makeHull(STARTER_HULL), 5);   // the ground is the ship's: held ground grows from its flag\n"),
("  const purse1 = A.run.resources, f = A.run.focus;\n", "  const purse1 = A.run.resources, f = { x: A.site.x - A.hull.axis.r.x * 18, z: A.site.z - A.hull.axis.r.z * 18 };   // the crew's side of the bridge: held ground, clear of the hull\n"),
])
anchor = "console.log(`gravitys-ark-test: ${pass} PASS / ${fail} FAIL`);\n"
assert s.count(anchor) == 1, "tail anchor"
block = '''{ // 55. ark: the field is the ship's: no town, the ship's flag the emitter, the objective at the bridge, placement to the ark's own radius, the gouge behind the hull, the trees along it felled
  const gSeed = rollSeed(), g = makeGalaxy(gSeed), w = g.worlds[0];
  const N = makeGround(gSeed, w, 900);   // the bare ground: the heights before any crash
  const G = makeGround(gSeed, w, 900), H = crashHull(G, makeHull(STARTER_HULL), 10);
  const noTown = G.war.town.length === 0 && !G.world.bodies.some((b) => b.kind === "chunk" && b.town && b.town !== "hull") && G.war.census.length === 0;
  const flag = G.world.bodies.find((b) => b.kind === "flag" && b.team === 1);
  const flagUp = !!flag && Math.abs(flag.pos.x - H.site.x) < 1e-9 && Math.abs(flag.pos.z - H.site.z) < 1e-9 && flag.pos.y > H.bodies[0].pos.y + H.bodies[0].hy;
  const objective = G.war.map.OBJ_POS.x === H.site.x && G.war.map.OBJ_POS.z === H.site.z && G.objG.gx === G.war.grid.worldToGrid(H.site.x, H.site.z).gx;
  const u = H.axis.u, r = H.axis.r, d = H.dials;
  const behind = (t, a) => ({ x: H.site.x - u.x * t + r.x * a, z: H.site.z - u.z * t + r.z * a });
  const deep = behind(d.gougeDeep, 0), rim = behind(d.gougeLen + 4, 0), side = behind(d.gougeDeep, d.gougeHalf + 3);
  const lower = (p) => N.war.field.heightAt(p.x, p.z) - G.war.field.heightAt(p.x, p.z);
  const gouged = lower(deep) > d.gougeDepth * 0.8 && Math.abs(lower(rim)) < 1e-6 && Math.abs(lower(side)) < 1e-6 && G.war.field.dirty === true;
  const where = (b) => ({ t: (H.site.x - b.pos.x) * u.x + (H.site.z - b.pos.z) * u.z, a: Math.abs((b.pos.x - H.site.x) * r.x + (b.pos.z - H.site.z) * r.z) });
  const trees = G.world.bodies.filter((b) => b.kind === "tree");
  const near = trees.filter((b) => { const q = where(b); return q.t >= -b.hy - 0.1 && q.t <= d.gougeLen && q.a <= d.gougeHalf + d.treeReach; });
  const far = trees.filter((b) => { const q = where(b); return q.t < -3 || q.t > d.gougeLen + 3 || q.a > d.gougeHalf + d.treeReach + 3; });
  const felled = near.every((b) => !b.alive && b.R[4] < 0.2) && far.every((b) => b.alive && b.R[4] > 0.9) && H.felled === trees.filter((b) => !b.alive).length;
  const nearGun = groundOrder(G, "gun", H.site.x - r.x * 25, H.site.z - r.z * 25, "mg"), farGun = groundOrder(G, "gun", H.site.x - r.x * 70, H.site.z - r.z * 70, "mg");
  const radius = nearGun.ok && !farGun.ok && /TOO FAR/i.test(String(farGun.reason));
  const r1 = groundTick(G, 1 / 120);
  check("ark: the field is the ship's: no town, the ship's flag the emitter, the objective at the bridge, placement to the ark's own radius, the gouge behind the hull, the trees along it felled",
    noTown && flagUp && objective && gouged && felled && radius && !G.run.gameOver && !!r1);
}

'''
s = s.replace(anchor, block + anchor)
open(p, "w", encoding="utf-8").write(s)
ARK_EOF_4
node --check scripts/gravitys-ark-test.mjs && echo "syntax ok gate"
test "$(sha256sum scripts/gravitys-ark-test.mjs | cut -c1-16)" = "282cfe7d2abbcc3f" && echo OK scripts/gravitys-ark-test.mjs || echo FAILED scripts/gravitys-ark-test.mjs
```

5. The record that rides the landing: the README's ground line says the field as built and its engine line counts the two new listed differences. The hash line must print OK.

```sh
python3 - <<'ARK_EOF_5'
def edit(p, reps):
    s = open(p, encoding="utf-8").read()
    for old, new in reps:
        assert s.count(old) == 1, (p, old[:70])
        s = s.replace(old, new)
    open(p, "w", encoding="utf-8").write(s)
edit("README.md", [
("the footprints block coldsnap's grid, so guns, walls, and paths go around them. Each kind wears",
 "the footprints block coldsnap's grid, so guns, walls, and paths go around them. The war boots without coldsnap's town; the ship flies its own flag, so the ground around it is the player's to build on, within 60 m of the bridge; the attacker marches on the bridge; the crash gouges the ground 45 m back along the line the ship came in on, 2.5 m deep at the deepest, and fells the trees along it. Each kind wears"),
("25 matching the checkout by hash, 17 front doors whose code sits in modules at the same commit, four carrying listed differences from the 0.1.0 plan and one from the 0.1.2 plan, the drawing's scene opened as a door,",
 "23 matching the checkout by hash, 17 front doors whose code sits in modules at the same commit, four carrying listed differences from the 0.1.0 plan and three from the 0.1.2 and 0.1.3 plans, the drawing's scene opened as a door, the war booting without its town, and the placement radius as an option,"),
])
ARK_EOF_5
test "$(sha256sum README.md | cut -c1-16)" = "bf670e0a89f4c4ef" && echo OK README.md || echo FAILED README.md
```

6. Run the ark's gate. It must print 51 PASS lines, one more than the recorded 50, then `gravitys-ark-test: 51 PASS / 0 FAIL`, then `gravitys-ark-test PASS`. Any FAIL stops the task here.

```sh
node scripts/gate.mjs gravitys-ark > /tmp/ark-gate.txt; tail -3 /tmp/ark-gate.txt; grep -m1 '^seeds' /tmp/ark-gate.txt
```

7. The record: the phase document's task row and status line. Then the parts build over every gate, about four minutes; it must name 50 gates and every verdict must be ok, the ark's gate among them at 51 PASS and 0 FAIL.

```sh
python3 - <<'ARK_EOF_7'
ph = "docs/plans/phase-0.1.3-the-nine-findings.md"; s = open(ph, encoding="utf-8").read()
old = "placement room, the gouge, the felled trees. DISPATCHED. →"
assert s.count(old) == 1, "task row"
s = s.replace(old, "placement room, the gouge, the felled trees. LANDED, commit stamped below. →")
old2 = "Status: DISPATCHED. Task 2 dispatched."
assert s.count(old2) == 1, "status line"
s = s.replace(old2, "Status: DISPATCHED. Task 2 landed, commit stamped below, 2026-09-09; task 3 is planned next.")
open(ph, "w", encoding="utf-8").write(s)
ARK_EOF_7
grep -c "commit stamped below" docs/plans/phase-0.1.3-the-nine-findings.md
node scripts/parts.mjs --gates all
node -e 'const t=require("./docs/parts/parts.json");const bad=Object.values(t.gates).filter(g=>g.verdict!=="ok").map(g=>g.name);const a=t.gates["gravitys-ark"];console.log(Object.keys(t.gates).length+" gates, "+bad.length+" not ok"+(bad.length?": "+bad.join(", "):""));console.log("gravitys-ark "+a.pass+" PASS / "+a.fail+" FAIL; "+a.seeds);process.exit(bad.length||a.pass!==51?1:0)'
```

Required: `2`, a count line naming 50 gates, `50 gates, 0 not ok`, `gravitys-ark 51 PASS / 0 FAIL;` with its seeds.

8. Commit and push the landing, then stamp the real hash into the status line and the task row in a second small commit. Never amend after stamping.

```sh
git add src/games/gravitys-ark/ground.js src/depot/boot.js src/depot/placement.js scripts/gravitys-ark-test.mjs README.md docs/parts docs/plans
git commit -m "phase 0.1.3 task 2 — the field: no town, the ship's flag, the bridge the objective, placement to 60 m, the crash's gouge, the trees felled along it

Two listed differences: the boot skips the town when asked; the placement radius takes the ark's own number.
gravitys-ark-test 51 PASS / 0 FAIL; the parts build over 50 gates, every verdict ok.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01QSq3kZC3Bk9SC5RwnqYUfs"
git push origin main
H=$(git rev-parse --short HEAD)
sed -i "s/commit stamped below/commit \`$H\`/g" docs/plans/phase-0.1.3-the-nine-findings.md
git add docs/plans && git commit -m "phase 0.1.3 task 2 row stamped — $H

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01QSq3kZC3Bk9SC5RwnqYUfs"
git push origin main
```

## Acceptance

- Step 1: `0`, five OK lines.
- Steps 2 through 5: five OK lines, `syntax ok` four times.
- Step 6: `gravitys-ark-test: 51 PASS / 0 FAIL`, `gravitys-ark-test PASS`, a seeds line.
- Step 7: `2`; the count line names 50 gates; `50 gates, 0 not ok`; `gravitys-ark 51 PASS / 0 FAIL;` with its seeds.
- Step 8: push accepted by origin; the stamp commit pushed.

After the landing the orchestrator republishes the page from `docs/parts/parts.html` to its fixed address and names it, with the game's address, in the landing report.

## Report

Read-confirmation first, then one line of outcome, then bullets: step 6's lines verbatim; every OK line; the parts build's count line and the verdict line verbatim; the ark's gate line verbatim; both commit hashes; the push results. Every nonconformity its own labeled bullet, with the verbatim output. Fixture seeds: the seeds line the ark's gate printed in step 6 and the one from step 7's line; no seed is special.
