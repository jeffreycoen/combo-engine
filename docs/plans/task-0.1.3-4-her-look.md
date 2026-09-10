# Task 0.1.3-4 — her look

One job: she wears a purple jumpsuit and longish brown hair. Coldsnap's drawing takes one more dress, hers, a purple palette over its own man parts, a listed difference of three lines; the ground layer gives her body that dress; the ark's own look file draws her hair over it, a cap and strands following her position and facing. One check joins the ark's gate. Every edit is an anchored replacement checked by hash; write exactly what is written, run the listed gates, report. You design nothing.

Suggested model: Sonnet 5.

Required reading, in order (confirm at the top of your report):
1. This file, whole.
2. `docs/plans/phase-0.1.3-the-nine-findings.md`, whole.

No demo file is read or written. Nothing under `/home/batman/coldsnap` is read, written, or run.

## Steps

Run from `/home/batman/combo-engine`. A failed assert, a wrong required value, or a FAILED hash line stops the task: report the step and its verbatim output, run nothing further. Never edit a file to make a hash match.

1. Assert the ground: the tracked files clean at task 3's landing, the six files this task edits at their landed hashes, the new file absent. The gates were recorded green at that landing and are not run again here.

```sh
git status --short | grep -v "^??" | wc -l
while read -r hash path; do test "$(sha256sum "$path" | cut -c1-16)" = "$hash" && echo "OK $path" || echo "FAILED $path"; done <<'GROUND'
0db618e8c5b886c9 src/graphics/renderer.js
d1343049b8e3241e src/games/gravitys-ark/ground.js
1d0171aefdd6d331 docs/gravitys-ark/ground.js
3a9ae130d853eac4 scripts/gravitys-ark-test.mjs
2300f6b3272367d6 README.md
a5082b6db1db9435 docs/parts/parts-source.json
GROUND
ls docs/gravitys-ark/her-look.js 2>/dev/null || echo absent
```

Required: `0`, six OK lines, `absent`.

2. Coldsnap's drawing takes her dress: a purple palette beside the android's, and the two lines that pick a man's palette read it. The listed difference. Syntax check; the hash line must print OK.

```sh
python3 - <<'ARK_EOF_2'
def edit(p, reps):
    s = open(p, encoding="utf-8").read()
    for old, new in reps:
        assert s.count(old) == 1, (p, old[:70])
        s = s.replace(old, new)
    open(p, "w", encoding="utf-8").write(s)
edit("src/graphics/renderer.js", [
("  const AND_DEAD = mkPal({ dom: 0x6d747c, sec: 0x474d54, acc: 0x596069, skin: 0x8b929a, gun: 0x14171a });\n",
 "  const AND_DEAD = mkPal({ dom: 0x6d747c, sec: 0x474d54, acc: 0x596069, skin: 0x8b929a, gun: 0x14171a });\n  // the ark's mechanic: a purple jumpsuit over the same part table, and a dulled purple for the dead; a listed difference from the checkout (phase 0.1.3)\n  const HER_LIVE = mkPal({ dom: 0x6a3fa0, sec: 0x3e2466, acc: 0x8b5a2b, skin: 0xd9c6a0, gun: 0x14171a });\n  const HER_DEAD = mkPal({ dom: 0x3a2a4a, sec: 0x241a30, acc: 0x4a3222, skin: 0x8a7a62, gun: 0x101314 });\n"),
("(b.dress === \"android\" ? (b.alive ? AND_LIVE : AND_DEAD) : (b.alive ? INF_LIVE : INF_DEAD)[kitPal]).gun);\n",
 "(b.dress === \"android\" ? (b.alive ? AND_LIVE : AND_DEAD) : b.dress === \"her\" ? (b.alive ? HER_LIVE : HER_DEAD) : (b.alive ? INF_LIVE : INF_DEAD)[kitPal]).gun);\n"),
("            const pal = b.dress === \"android\" ? (b.alive ? AND_LIVE : AND_DEAD) : kitPal === \"medic\"",
 "            const pal = b.dress === \"android\" ? (b.alive ? AND_LIVE : AND_DEAD) : b.dress === \"her\" ? (b.alive ? HER_LIVE : HER_DEAD) : kitPal === \"medic\""),
])
ARK_EOF_2
node --check src/graphics/renderer.js && echo "syntax ok renderer.js"
test "$(sha256sum src/graphics/renderer.js | cut -c1-16)" = "5ed783a2524e6bbf" && echo OK src/graphics/renderer.js || echo FAILED src/graphics/renderer.js
```

3. The ark's ground layer: her body wears her dress. Syntax check; the hash line must print OK.

```sh
python3 - <<'ARK_EOF_3'
def edit(p, reps):
    s = open(p, encoding="utf-8").read()
    for old, new in reps:
        assert s.count(old) == 1, (p, old[:70])
        s = s.replace(old, new)
    open(p, "w", encoding="utf-8").write(s)
edit("src/games/gravitys-ark/ground.js", [
("  spawnSquadMembers(world, squad); run.squads.push(squad);\n  const guards = [];\n",
 "  spawnSquadMembers(world, squad); run.squads.push(squad);\n  const hb = world.byId.get(squad.memberIds[0]); if (hb) hb.dress = \"her\";   // her own dress: the purple jumpsuit, coldsnap's own man drawn in her palette\n  const guards = [];\n"),
])
ARK_EOF_3
node --check src/games/gravitys-ark/ground.js && echo "syntax ok ground.js"
test "$(sha256sum src/games/gravitys-ark/ground.js | cut -c1-16)" = "babf3b13d53b40bd" && echo OK src/games/gravitys-ark/ground.js || echo FAILED src/games/gravitys-ark/ground.js
```

4. Her hair, a new file of the page, written exactly. Syntax check; the hash line must print OK.

```sh
cat > docs/gravitys-ark/her-look.js <<'ARK_HER_EOF'
// GRAVITY'S ARK — her-look.js: the mechanic's hair, phase 0.1.3. Longish brown hair drawn
// over her body in coldsnap's scene: a cap over the head and strands to the shoulders, following
// her position and her facing every frame. The purple jumpsuit is coldsnap's own man drawn in
// her dress. Shaped from coldsnap's man parts, core.js lines 2161 to 2170: the head 0.54 up
// from the body's centre, its cap at 0.705. Nothing here moves a body; the body moves this.
import * as THREE from "three";
import { toon } from "../../src/graphics/renderer.js";

const HAIR = "#5a3a22", HAIR_DARK = "#3e2816";

// makeHerLook(scene, body): the hair on her body. Returns update() and dispose().
export function makeHerLook(scene, body) {
  const g = new THREE.Group(); scene.add(g);
  const cap = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.2, 0.36), toon(HAIR)); cap.position.set(0, 0.72, 0); cap.castShadow = true; g.add(cap);
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.42, 0.1), toon(HAIR_DARK)); back.position.set(0, 0.46, -0.16); back.castShadow = true; g.add(back);
  for (const sx of [-1, 1]) { const strand = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.38, 0.24), toon(HAIR_DARK)); strand.position.set(sx * 0.19, 0.49, -0.02); g.add(strand); }
  function update() {
    if (!body || !body.alive) { g.visible = false; return; }
    g.visible = true;
    g.position.set(body.pos.x, body.pos.y, body.pos.z);
    g.rotation.y = Math.atan2(body.R[6], body.R[8]);   // the man faces his own forward: coldsnap's facing law, units.js faceTravel
  }
  function dispose() { g.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); }); scene.remove(g); }
  update();
  return { update, dispose, group: g };
}
ARK_HER_EOF
node --check docs/gravitys-ark/her-look.js && echo "syntax ok her-look.js"
test "$(sha256sum docs/gravitys-ark/her-look.js | cut -c1-16)" = "a7bf2df6e2eb35ce" && echo OK docs/gravitys-ark/her-look.js || echo FAILED docs/gravitys-ark/her-look.js
```

5. The ground's screen: her hair built on the scene at entry, moved every frame, disposed at leave. Syntax check; the hash line must print OK.

```sh
python3 - <<'ARK_EOF_5'
def edit(p, reps):
    s = open(p, encoding="utf-8").read()
    for old, new in reps:
        assert s.count(old) == 1, (p, old[:70])
        s = s.replace(old, new)
    open(p, "w", encoding="utf-8").write(s)
edit("docs/gravitys-ark/ground.js", [
("import { makeGround, crashHull, fieldCrew, wreckWalker, setStick, order, tick, summary, price, GUNS, looseModules } from \"../../src/games/gravitys-ark/ground.js\";\n",
 "import { makeGround, crashHull, fieldCrew, wreckWalker, setStick, order, tick, summary, price, GUNS, looseModules, herBody } from \"../../src/games/gravitys-ark/ground.js\";\n"),
("import { makeHullLook } from \"./hull-look.js\";\n", "import { makeHullLook } from \"./hull-look.js\";\nimport { makeHerLook } from \"./her-look.js\";\n"),
("  let G = null, R = null, A = null, look = null, focus = null,", "  let G = null, R = null, A = null, look = null, herLook = null, focus = null,"),
("    look = makeHullLook(R.scene, G.hull, { balance: { gx: dv.cx / cell, gy: dv.cy / cell }, groundY: G.war.field.heightAt(G.site.x, G.site.z) });\n",
 "    look = makeHullLook(R.scene, G.hull, { balance: { gx: dv.cx / cell, gy: dv.cy / cell }, groundY: G.war.field.heightAt(G.site.x, G.site.z) });\n    herLook = makeHerLook(R.scene, herBody(G));\n"),
("  function leave() { $(ids.card).style.display = \"none\"; waiting = false; if (look) { look.dispose(); look = null; }",
 "  function leave() { $(ids.card).style.display = \"none\"; waiting = false; if (herLook) { herLook.dispose(); herLook = null; } if (look) { look.dispose(); look = null; }"),
("if (look) look.update(looseModules(G)); R.render(dt, focus, aim); }\n", "if (look) look.update(looseModules(G)); if (herLook) herLook.update(); R.render(dt, focus, aim); }\n"),
])
ARK_EOF_5
node --check docs/gravitys-ark/ground.js && echo "syntax ok screen"
test "$(sha256sum docs/gravitys-ark/ground.js | cut -c1-16)" = "7dd800dafcfd7479" && echo OK docs/gravitys-ark/ground.js || echo FAILED docs/gravitys-ark/ground.js
```

6. The ark's gate: one check joins at the end. Syntax check; the hash line must print OK.

```sh
python3 - <<'ARK_EOF_6'
p = "scripts/gravitys-ark-test.mjs"; s = open(p, encoding="utf-8").read()
anchor = "console.log(`gravitys-ark-test: ${pass} PASS / ${fail} FAIL`);\n"
assert s.count(anchor) == 1, "tail anchor"
block = '''{ // 56. ark: she wears her own dress and the guard wears coldsnap's, so the drawing tells them apart
  const gSeed = rollSeed(), g = makeGalaxy(gSeed), w = g.worlds[0];
  const G = makeGround(gSeed, w, 900); crashHull(G, makeHull(STARTER_HULL), 10); fieldCrew(G, []);
  const hb = herBody(G), men = G.guards.flatMap((sq) => sq.memberIds.map((id) => G.world.byId.get(id)));
  check("ark: she wears her own dress and the guard wears coldsnap's, so the drawing tells them apart", !!hb && hb.dress === "her" && men.length > 0 && men.every((u) => u.dress === "human"));
}

'''
s = s.replace(anchor, block + anchor)
open(p, "w", encoding="utf-8").write(s)
ARK_EOF_6
node --check scripts/gravitys-ark-test.mjs && echo "syntax ok gate"
test "$(sha256sum scripts/gravitys-ark-test.mjs | cut -c1-16)" = "6f70387b189aba1b" && echo OK scripts/gravitys-ark-test.mjs || echo FAILED scripts/gravitys-ark-test.mjs
```

7. The records that ride the landing: the README's ground line says her look and its engine line counts the listed difference; the parts source's ground screen row carries the new file. Both hash lines must print OK.

```sh
python3 - <<'ARK_EOF_7'
import json
def edit(p, reps):
    s = open(p, encoding="utf-8").read()
    for old, new in reps:
        assert s.count(old) == 1, (p, old[:70])
        s = s.replace(old, new)
    open(p, "w", encoding="utf-8").write(s)
edit("README.md", [
("She is a trooper of her own row with 250 hit points,", "She is a trooper of her own row with 250 hit points, in a purple jumpsuit with longish brown hair, coldsnap's own man drawn in her dress with the ark's hair over it,"),
("two from the 0.1.2 and 0.1.3 plans, the drawing's scene opened as a door and the war booting without its town,", "three from the 0.1.2 and 0.1.3 plans, the drawing's scene opened as a door, the war booting without its town, and her dress in the drawing's palette,"),
])
edit("docs/parts/parts-source.json", [
('   "files": [\n    "docs/gravitys-ark/ground.js",\n    "docs/gravitys-ark/hull-look.js"\n   ],\n   "phase": "0.1.2",\n',
 '   "files": [\n    "docs/gravitys-ark/ground.js",\n    "docs/gravitys-ark/hull-look.js",\n    "docs/gravitys-ark/her-look.js"\n   ],\n   "phase": "0.1.3",\n'),
])
json.loads(open("docs/parts/parts-source.json", encoding="utf-8").read())
ARK_EOF_7
test "$(sha256sum README.md | cut -c1-16)" = "67b010e3fe31ea0d" && echo OK README.md || echo FAILED README.md
test "$(sha256sum docs/parts/parts-source.json | cut -c1-16)" = "ecc08124ae9273f7" && echo OK docs/parts/parts-source.json || echo FAILED docs/parts/parts-source.json
```

8. Run the ark's gate. It must print 52 PASS lines, one more than the recorded 51, then `gravitys-ark-test: 52 PASS / 0 FAIL`, then `gravitys-ark-test PASS`. Any FAIL stops the task here.

```sh
node scripts/gate.mjs gravitys-ark > /tmp/ark-gate.txt; tail -3 /tmp/ark-gate.txt; grep -m1 '^seeds' /tmp/ark-gate.txt
```

9. The record: the phase document's task row and status line. Then the parts build over every gate, about four minutes; it must name 50 gates and every verdict must be ok, the ark's gate among them at 52 PASS and 0 FAIL.

```sh
python3 - <<'ARK_EOF_9'
ph = "docs/plans/phase-0.1.3-the-nine-findings.md"; s = open(ph, encoding="utf-8").read()
old = "the purple jumpsuit and the brown hair. DISPATCHED. →"
assert s.count(old) == 1, "task row"
s = s.replace(old, "the purple jumpsuit and the brown hair. LANDED, commit stamped below. →")
old2 = "Status: DISPATCHED. Task 4 dispatched."
assert s.count(old2) == 1, "status line"
s = s.replace(old2, "Status: DISPATCHED. Task 4 landed, commit stamped below, 2026-09-09; task 5 is planned next.")
open(ph, "w", encoding="utf-8").write(s)
ARK_EOF_9
grep -c "commit stamped below" docs/plans/phase-0.1.3-the-nine-findings.md
node scripts/parts.mjs --gates all
node -e 'const t=require("./docs/parts/parts.json");const bad=Object.values(t.gates).filter(g=>g.verdict!=="ok").map(g=>g.name);const a=t.gates["gravitys-ark"];console.log(Object.keys(t.gates).length+" gates, "+bad.length+" not ok"+(bad.length?": "+bad.join(", "):""));console.log("gravitys-ark "+a.pass+" PASS / "+a.fail+" FAIL; "+a.seeds);process.exit(bad.length||a.pass!==52?1:0)'
```

Required: `2`, a count line naming 50 gates, `50 gates, 0 not ok`, `gravitys-ark 52 PASS / 0 FAIL;` with its seeds.

10. Commit and push the landing, then stamp the real hash into the status line and the task row in a second small commit. Never amend after stamping.

```sh
git add src/graphics/renderer.js src/games/gravitys-ark/ground.js docs/gravitys-ark/her-look.js docs/gravitys-ark/ground.js scripts/gravitys-ark-test.mjs README.md docs/parts docs/plans
git commit -m "phase 0.1.3 task 4 — her look: the purple jumpsuit in coldsnap's drawing, the brown hair the ark's own over it

Her dress is a listed difference of three lines in the drawing; the hair follows her body and her facing.
gravitys-ark-test 52 PASS / 0 FAIL; the parts build over 50 gates, every verdict ok.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01QSq3kZC3Bk9SC5RwnqYUfs"
git push origin main
H=$(git rev-parse --short HEAD)
sed -i "s/commit stamped below/commit \`$H\`/g" docs/plans/phase-0.1.3-the-nine-findings.md
git add docs/plans && git commit -m "phase 0.1.3 task 4 row stamped — $H

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01QSq3kZC3Bk9SC5RwnqYUfs"
git push origin main
```

## Acceptance

- Step 1: `0`, six OK lines, `absent`.
- Steps 2 through 7: seven OK lines, `syntax ok` five times.
- Step 8: `gravitys-ark-test: 52 PASS / 0 FAIL`, `gravitys-ark-test PASS`, a seeds line.
- Step 9: `2`; the count line names 50 gates; `50 gates, 0 not ok`; `gravitys-ark 52 PASS / 0 FAIL;` with its seeds.
- Step 10: push accepted by origin; the stamp commit pushed.

After the landing the orchestrator republishes the page from `docs/parts/parts.html` to its fixed address and names it, with the game's address, in the landing report.

## Report

Read-confirmation first, then one line of outcome, then bullets: step 8's lines verbatim; every OK line; the parts build's count line and the verdict line verbatim; the ark's gate line verbatim; both commit hashes; the push results. Every nonconformity its own labeled bullet, with the verbatim output. Fixture seeds: the seeds line the ark's gate printed in step 8 and the one from step 9's line; no seed is special.
