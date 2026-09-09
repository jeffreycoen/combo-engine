# Task 0.1.2-2 — she steps aside

One job: nobody of hers is inside the walker's room when it stands. REPAIR WALKER sends her to a stand just outside the room, on her own side of the wreck, by coldsnap's own clear-slot rule, and her seconds run within reach of the spot; at the moment the walker is built, anyone of hers still inside the room, her or a hand, is moved out to such a stand first. Two checks join the ark's gate. Every edit is an anchored replacement checked by hash; write exactly what is written, run the listed gates, report. You design nothing.

Suggested model: Sonnet 5.

Required reading, in order (confirm at the top of your report):
1. This file, whole.
2. `docs/plans/phase-0.1.2-the-findings.md`, whole.

No demo file is read or written. Nothing under `/home/batman/coldsnap` is read, written, or run.

## Steps

Run from `/home/batman/combo-engine`. A failed assert, a wrong required value, or a FAILED hash line stops the task: report the step and its verbatim output, run nothing further. Never edit a file to make a hash match.

1. Assert the ground: the tracked files clean at task 1's landing, the two files this task edits at their landed hashes. The gates were recorded green at that landing and are not run again here.

```sh
git status --short | grep -v "^??" | wc -l
while read -r hash path; do test "$(sha256sum "$path" | cut -c1-16)" = "$hash" && echo "OK $path" || echo "FAILED $path"; done <<'GROUND'
0606a4bee2a65ad4 src/games/gravitys-ark/ground.js
166ce2f81c17875d scripts/gravitys-ark-test.mjs
GROUND
```

Required: `0`, two OK lines.

2. The ark's ground layer: the walker's room, her stand, the room cleared before the walker is built, the repair order sent to the stand, her seconds within reach. Syntax check; the hash line must print OK.

```sh
python3 - <<'ARK_EOF_2'
def edit(p, reps):
    s = open(p, encoding="utf-8").read()
    for old, new in reps:
        assert s.count(old) == 1, (p, old[:70])
        s = s.replace(old, new)
    open(p, "w", encoding="utf-8").write(s)
edit("src/games/gravitys-ark/ground.js", [
('import { makeSquad, SQUAD_SPECS } from "../../depot/squads.js";\n', 'import { makeSquad, SQUAD_SPECS, clearSlot } from "../../depot/squads.js";\n'),
("// WALKER: hers, coldsnap's own mech at coldsnap's own scale, 5.4 m tall, two and a\n// half troopers; it lies wrecked beside the hull at the crash until she repairs it.\n// repair: her seconds at the wreck; spotX, spotZ: the wreck's spot from the bridge, in\n// metres; s: the scale. PROPOSED.\nexport const WALKER = { s: 1, repair: 10, spotX: 0, spotZ: -8 };\n",
 "// WALKER: hers, coldsnap's own mech at coldsnap's own scale, 5.4 m tall, two and a\n// half troopers; it lies wrecked beside the hull at the crash until she repairs it.\n// repair: her seconds at the wreck; spotX, spotZ: the wreck's spot from the bridge, in\n// metres; s: the scale. room: the room the walker needs around its spot, coldsnap's own\n// placement distance for a mech; standPad: how far past the room her stand is; reach: how\n// far from the spot her seconds still run. PROPOSED.\nexport const WALKER = { s: 1, repair: 10, spotX: 0, spotZ: -8, room: 4.5, standPad: 0.5, reach: 10 };\n"),
("// raiseWalker(G): the repair's mechanism: coldsnap's mech built at the wreck's spot on the player's side, hers.\nexport function raiseWalker(G) {\n  const W = G.walker;\n  if (!W || W.mech) return null;\n  const m = buildMech(",
 "// inRoom(G, b): coldsnap's own room rule turned around: the body's box, grown by the room, holds the spot.\nfunction inRoom(G, b) { const s = G.walker.spot; return Math.abs(s.x - b.pos.x) <= b.hx + WALKER.room && Math.abs(s.z - b.pos.z) <= b.hz + WALKER.room; }\n\n// standOff(G, b): where a body of hers stands for the walker's repair: just outside the room on\n// its own side of the spot, by coldsnap's clear-slot rule; if the clear point falls back inside\n// the room, farther out along the same bearing, up to three tries.\nexport function standOff(G, b) {\n  const s = G.walker.spot, dx = b.pos.x - s.x, dz = b.pos.z - s.z, l = Math.hypot(dx, dz);\n  const ux = l > 1e-9 ? dx / l : 0, uz = l > 1e-9 ? dz / l : 1, m = Math.max(Math.abs(ux), Math.abs(uz));\n  let p = null;\n  for (const extra of [0, 1.5, 3]) {\n    const k = (WALKER.room + b.hx + WALKER.standPad + extra) / m;\n    p = clearSlot(G.world, s.x + ux * k, s.z + uz * k, b.hx + 0.35);\n    if (!inRoom(G, { pos: p, hx: b.hx, hz: b.hz })) return p;\n  }\n  return p;\n}\n\n// clearRoom(G): everyone of hers still inside the walker's room, her or a hand, is moved to\n// a stand just outside it before the walker is built, so no one is inside it when it stands.\nexport function clearRoom(G) {\n  const moved = [];\n  if (!G.walker) return moved;\n  for (const b of G.world.bodies) {\n    if (!b.alive || b.team !== 1 || b.kind !== \"unit\" || !inRoom(G, b)) continue;\n    const p = standOff(G, b);\n    b.pos.x = p.x; b.pos.z = p.z; b.pos.y = G.war.field.heightAt(p.x, p.z) + b.hy + 0.02;\n    b.v.x = 0; b.v.y = 0; b.v.z = 0;\n    moved.push(b);\n  }\n  return moved;\n}\n\n// raiseWalker(G): the repair's mechanism: the room cleared, then coldsnap's mech built at the wreck's spot on the player's side, hers.\nexport function raiseWalker(G) {\n  const W = G.walker;\n  if (!W || W.mech) return null;\n  clearRoom(G);\n  const m = buildMech("),
("    if (Math.hypot(W.spot.x - b.pos.x, W.spot.z - b.pos.z) <= HER.reach + 2) {\n", "    if (Math.hypot(W.spot.x - b.pos.x, W.spot.z - b.pos.z) <= WALKER.reach) {\n"),
("  if (kind === \"repairWalker\") {   // she raises the walker: she walks to the wreck and her seconds run down there\n", "  if (kind === \"repairWalker\") {   // she raises the walker: she walks to a stand just outside its room and her seconds run down there\n"),
("    sq.order = \"move\"; sq.dest = { x: G.walker.spot.x, z: G.walker.spot.z }; sq._route = null; sq._routeDest = null; sq._build = null; sq.holdFire = true;\n    G.her.act = \"repairWalker\";",
 "    const st = standOff(G, b);\n    sq.order = \"move\"; sq.dest = { x: st.x, z: st.z }; sq._route = null; sq._routeDest = null; sq._build = null; sq.holdFire = true;\n    G.her.act = \"repairWalker\";"),
])
ARK_EOF_2
node --check src/games/gravitys-ark/ground.js && echo "syntax ok ground.js"
test "$(sha256sum src/games/gravitys-ark/ground.js | cut -c1-16)" = "68ea04de15132b5b" && echo OK src/games/gravitys-ark/ground.js || echo FAILED src/games/gravitys-ark/ground.js
```

3. The ark's gate: two checks join at the end, before the count line. Syntax check; the hash line must print OK.

```sh
python3 - <<'ARK_EOF_3'
p = "scripts/gravitys-ark-test.mjs"; s = open(p, encoding="utf-8").read()
old = 'import { makeGround, order as groundOrder, tick as groundTick, hash as groundHash, GROUND_DIALS, crashHull, looseModules, weldBack, HULL_DIALS, fieldCrew, herBody, stepHer, HER, wreckWalker, walkerAlive, setStick, WALKER } from "../src/games/gravitys-ark/ground.js";\n'
assert s.count(old) == 1, "ground import"
s = s.replace(old, old.replace("setStick, WALKER }", "setStick, WALKER, standOff }"))
anchor = "console.log(`gravitys-ark-test: ${pass} PASS / ${fail} FAIL`);\n"
assert s.count(anchor) == 1, "tail anchor"
block = '''{ // 48. ark: REPAIR WALKER sends her to a stand just outside the walker's room, and her seconds run there
  // 49. ark: the walker's raise moves anyone of hers still inside its room out past its edge, alive, and leaves everyone outside where they stood
  const gSeed = rollSeed(), g = makeGalaxy(gSeed), w = g.worlds[0];
  const G = makeGround(gSeed, w, 900); crashHull(G, makeHull(STARTER_HULL), 10); fieldCrew(G, [{ name: "Cato" }, { name: "Dag" }]); wreckWalker(G);
  const spot = G.walker.spot, hb = herBody(G);
  const inside = (b) => Math.abs(spot.x - b.pos.x) <= b.hx + WALKER.room && Math.abs(spot.z - b.pos.z) <= b.hz + WALKER.room;
  const r = groundOrder(G, "repairWalker");
  const stand = G.her.squad.dest, st = standOff(G, hb);
  const standOut = !!stand && stand.x === st.x && stand.z === st.z && !inside({ pos: stand, hx: hb.hx, hz: hb.hz }) && Math.hypot(stand.x - spot.x, stand.z - spot.z) <= WALKER.reach;
  hb.pos.x = stand.x; hb.pos.z = stand.z;   // she arrives at the stand
  const t0 = G.her.actT, ev0 = stepHer(G, 1 / 120);
  check("ark: REPAIR WALKER sends her to a stand just outside the walker's room, and her seconds run there",
    r.ok && G.her.act === "repairWalker" && standOut && G.her.actT < t0 && !ev0.some((e) => e.k === "walkerUp"));
  const hands = G.hands.map((h) => G.world.byId.get(h.id));
  hb.pos.x = spot.x; hb.pos.z = spot.z;                                    // she stands on the spot itself
  hands[0].pos.x = spot.x + 1; hands[0].pos.z = spot.z - 1;               // one hand inside the room
  hands[1].pos.x = spot.x + WALKER.room + 3; hands[1].pos.z = spot.z;     // one hand outside it
  const far = { x: hands[1].pos.x, z: hands[1].pos.z };
  const ev = stepHer(G, G.her.actT + 1e-6);   // her seconds run out on this call: the room is cleared, the walker is built
  const all = [hb, hands[0], hands[1]];
  check("ark: the walker's raise moves anyone of hers still inside its room out past its edge, alive, and leaves everyone outside where they stood",
    ev.some((e) => e.k === "walkerUp") && walkerAlive(G) && all.every((b) => b.alive && !inside(b)) && hands[1].pos.x === far.x && hands[1].pos.z === far.z
    && [hb, hands[0]].every((b) => Math.max(Math.abs(b.pos.x - spot.x), Math.abs(b.pos.z - spot.z)) <= WALKER.room + 10));
}

'''
s = s.replace(anchor, block + anchor)
open(p, "w", encoding="utf-8").write(s)
ARK_EOF_3
node --check scripts/gravitys-ark-test.mjs && echo "syntax ok gate"
test "$(sha256sum scripts/gravitys-ark-test.mjs | cut -c1-16)" = "e92dbff194751307" && echo OK scripts/gravitys-ark-test.mjs || echo FAILED scripts/gravitys-ark-test.mjs
```

4. Run the ark's gate. It must print 45 PASS lines, two more than the recorded 43, then `gravitys-ark-test: 45 PASS / 0 FAIL`, then `gravitys-ark-test PASS`. Any FAIL stops the task here.

```sh
node scripts/gate.mjs gravitys-ark > /tmp/ark-gate.txt; tail -3 /tmp/ark-gate.txt; grep -m1 '^seeds' /tmp/ark-gate.txt
```

5. The record: the phase document's task row and status line. Then the parts build over every gate, about four minutes; it must name 50 gates and every verdict must be ok, the ark's gate among them at 45 PASS and 0 FAIL.

```sh
python3 - <<'ARK_EOF_5'
ph = "docs/plans/phase-0.1.2-the-findings.md"; s = open(ph, encoding="utf-8").read()
old = "moved clear by coldsnap's own rule before the walker is built. DISPATCHED. →"
assert s.count(old) == 1, "task row"
s = s.replace(old, "moved clear by coldsnap's own rule before the walker is built. LANDED, commit stamped below. →")
old2 = "Status: DISPATCHED. Task 2 dispatched."
assert s.count(old2) == 1, "status line"
s = s.replace(old2, "Status: DISPATCHED. Task 2 landed, commit stamped below, 2026-09-09; task 3 is planned next.")
open(ph, "w", encoding="utf-8").write(s)
ARK_EOF_5
grep -c "commit stamped below" docs/plans/phase-0.1.2-the-findings.md
node scripts/parts.mjs --gates all
node -e 'const t=require("./docs/parts/parts.json");const bad=Object.values(t.gates).filter(g=>g.verdict!=="ok").map(g=>g.name);const a=t.gates["gravitys-ark"];console.log(Object.keys(t.gates).length+" gates, "+bad.length+" not ok"+(bad.length?": "+bad.join(", "):""));console.log("gravitys-ark "+a.pass+" PASS / "+a.fail+" FAIL; "+a.seeds);process.exit(bad.length||a.pass!==45?1:0)'
```

Required: `2`, a count line naming 50 gates, `50 gates, 0 not ok`, `gravitys-ark 45 PASS / 0 FAIL;` with its seeds.

6. Commit and push the landing, then stamp the real hash into the status line and the task row in a second small commit. Never amend after stamping.

```sh
git add src/games/gravitys-ark/ground.js scripts/gravitys-ark-test.mjs docs/parts/parts.json docs/parts/parts.html docs/plans
git commit -m "phase 0.1.2 task 2 — she steps aside: her stand just outside the walker's room, the room cleared of hers before the walker is built

REPAIR WALKER sends her to a stand by coldsnap's clear-slot rule; anyone of hers inside the room at the raise is moved out first.
gravitys-ark-test 45 PASS / 0 FAIL; the parts build over 50 gates, every verdict ok.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01QSq3kZC3Bk9SC5RwnqYUfs"
git push origin main
H=$(git rev-parse --short HEAD)
sed -i "s/commit stamped below/commit \`$H\`/g" docs/plans/phase-0.1.2-the-findings.md
git add docs/plans && git commit -m "phase 0.1.2 task 2 row stamped — $H

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01QSq3kZC3Bk9SC5RwnqYUfs"
git push origin main
```

## Acceptance

- Step 1: `0`, two OK lines.
- Steps 2 and 3: two OK lines, `syntax ok` twice.
- Step 4: `gravitys-ark-test: 45 PASS / 0 FAIL`, `gravitys-ark-test PASS`, a seeds line.
- Step 5: `2`; the count line names 50 gates; `50 gates, 0 not ok`; `gravitys-ark 45 PASS / 0 FAIL;` with its seeds.
- Step 6: push accepted by origin; the stamp commit pushed.

After the landing the orchestrator republishes the page from `docs/parts/parts.html` to its fixed address and names it, with the game's address, in the landing report.

## Report

Read-confirmation first, then one line of outcome, then bullets: step 4's lines verbatim; every OK line; the parts build's count line and the verdict line verbatim; the ark's gate line verbatim; both commit hashes; the push results. Every nonconformity its own labeled bullet. Fixture seeds: the seeds line the ark's gate printed in step 4 and the one from step 5's line; no seed is special.
