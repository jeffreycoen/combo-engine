# Task 0.1.0-1 — the spine

One job: restore the tree from the stopped first run; write coldsnap's taken files from the checkout at `111b9cb`, sixteen module files through the substitution rule, and three carried files with their added lines; move theme.js into the bench group of the parts source; turn three pinned hashes in the old-master gate into laws; move the engine's two id counters onto the world in the lifted copies and add the spine gate that holds that law; run the bracket; close the records; build the parts page; commit and push. Every file is a copy checked by hash or an edit at an anchor that occurs once. Write exactly what is written, run the listed gates, report. You design nothing.

Suggested model: Sonnet 5.

Required reading, in order (confirm at the top of your report):
1. This file, whole.
2. `docs/plans/phase-0.1.0-the-spine.md`, whole.

Source: the coldsnap checkout at `/home/batman/coldsnap`, commit `111b9cb`, read by `git show` only. Nothing there is touched. No demo file is read or written.

## Steps

Run from `/home/batman/combo-engine`. A failed assert, a wrong required value, or a FAILED hash line stops the task: report the step and its verbatim output, run nothing further. Never edit a file to make a hash match.

0. Restore the tree. The first run stopped at step 7 with steps 2 to 6 applied. Put every tracked file back to the commit and remove the eight files the lift added, and nothing else: the three untracked demo files at the root stay.

```sh
git checkout -- src scripts docs/parts README.md package.json
rm -f src/depot/hooks.js src/depot/orders.js src/depot/palette.js src/depot/placement.js src/depot/styles.js
rm -rf src/aar src/game src/ui
git status --short | grep -v "^??" | wc -l
git status --short | grep "^??" | grep -cE "src/|scripts/|docs/"
```

Required: `0`, `0`.

1. Assert the ground: the tracked tree clean, the checkout holding the commit, the version at 0.0.112, the three new folders absent, the five files already at head, the four files this task edits at their current hashes.

```sh
git status --short | grep -v "^??" | wc -l
git -C /home/batman/coldsnap cat-file -t 111b9cb
grep -c '"version": "0.0.112"' package.json
ls -d src/aar src/game src/ui 2>/dev/null | wc -l
while read -r hash path; do test "$(sha256sum "$path" | cut -c1-16)" = "$hash" && echo "OK $path" || echo "FAILED $path"; done <<'GROUND'
b9a9ce120ec7c53a src/depot/api.js
c199e3d3bc1446ff src/depot/infocards.js
16a138aefefb4ea5 src/platform/autosave.js
b81cc1e4790757bf src/platform/keymap.js
1a4bf92a5ea45905 src/platform/storage.js
c61509c9aeeadf47 scripts/old-master-test.mjs
af69018fb34cefe9 docs/parts/parts-source.json
4f57d693a57e84f5 README.md
faf9426ef9bc15da scripts/gate.mjs
GROUND
```

Required: `0`, `commit`, `1`, `0`, then nine OK lines.

Then the bracket, green as recorded. Each command's last line must be the value beside it. The api gate runs about two minutes; do not stop it.

```sh
node scripts/gate.mjs combat | tail -1
node scripts/gate.mjs accuracy | tail -1
node scripts/gate.mjs contract | tail -1
node scripts/gate.mjs ledger | tail -1
node scripts/gate.mjs market | tail -1
node scripts/gate.mjs determinism | tail -1
node scripts/gate.mjs frostline | tail -1
node scripts/gate.mjs old-master | tail -1
node scripts/gate.mjs manifest | tail -1
node scripts/gate.mjs parts | tail -1
node scripts/gate.mjs api | tail -1
```

Required, in order: `ALL PASS`, `11/11`, `contract-test PASS`, `ledger-test PASS`, `market-test PASS`, `determinism-test PASS`, `frostline-test PASS`, `old-master-test PASS`, `manifest-test PASS`, `parts-test PASS`, `seed 1  seconds 90 (10800 steps)  worldHash 3367709165  runHash 2717846799`.

2. Write the 23 verbatim files from the checkout. Every line must print OK.

```sh
mkdir -p src/aar src/game src/ui
while read -r hash path; do
  git -C /home/batman/coldsnap show "111b9cb:$path" > "$path"
  test "$(sha256sum "$path" | cut -c1-16)" = "$hash" && echo "OK $path" || echo "FAILED $path"
done <<'INVENTORY'
75868333de12796e src/engine/core.js
c18bba4e18c9bec8 src/engine/mech.js
0174cfe631736591 src/graphics/renderer.js
46dcaf28c5c679b6 src/graphics/troopkit.js
bee7890c42ad4249 src/graphics/portrait.js
eb5c7216b3dea57e src/platform/audio.js
9ebf0f7846299bfe src/depot/bell.js
e1c453b452d63aaa src/depot/boot.js
cba986aee7e59bc6 src/depot/buildlines.js
c92e177b6a6fdf65 src/depot/drivers.js
6a5ccd0bf8d3178f src/depot/market.js
f7f7b52df2deaac5 src/depot/muster.js
4a3b1a75f3a74811 src/depot/sim.js
78091ffe7364a63e src/depot/tick.js
29fb917ad88197c5 src/depot/units.js
b2d6be4ae329ada8 src/aar/compose.js
cf30eba50a8f6f09 src/depot/hooks.js
c775db898a562892 src/depot/orders.js
767b43a6dce24e25 src/depot/palette.js
48506941ea78d47f src/depot/placement.js
c7d22018cd578ba5 src/depot/styles.js
42aab73b71fe824f src/game/mechReadout.js
1d5a821755afc336 src/ui/theme.js
INVENTORY
```

3. Write the 16 module files: head's depot file through the substitution rule, in this order of the two rules and no other change. Every line must print OK.

```sh
while read -r hash name; do
  git -C /home/batman/coldsnap show "111b9cb:src/depot/$name.js" | sed -e 's#from "\.\./#from "../../#' -e 's#from "\./#from "../../depot/#' > "src/modules/$name/$name.js"
  test "$(sha256sum "src/modules/$name/$name.js" | cut -c1-16)" = "$hash" && echo "OK $name" || echo "FAILED $name"
done <<'MODULES'
f60764cd6483df5b wind
5c08b411f0d1485f fog
ee316b8706b59671 economy
0731725c06586b7e accuracy
b5d027f2a2a667ce ai
d74aa25c44ff4347 cards
8936f02ecc57d8a7 intel
ee7cc67f232122ae lists
4b816d55876dd5ff mapgen
642aec05b3580468 mines
e87bc2de23c922a3 orient
f574fb0fac928ac7 route
c5dafa68b6bf357a save
d90820e71978e6c2 sight
108120167fb9e258 territory
503f020aa501a0a5 transports
MODULES
```

4. Write the three carried files: head's text, then the added lines at anchors that occur once. Each anchor is asserted; the three hash lines must print OK.

```sh
git -C /home/batman/coldsnap show 111b9cb:src/depot/state.js > src/depot/state.js
git -C /home/batman/coldsnap show 111b9cb:src/depot/squads.js > src/depot/squads.js
git -C /home/batman/coldsnap show 111b9cb:src/depot/specs.js | sed -e 's#from "\.\./#from "../../#' -e 's#from "\./#from "../../depot/#' > src/modules/specs/specs.js
python3 - <<'SPINE_EOF_4'
def edit(p, reps):
    s = open(p, encoding="utf-8").read()
    for old, new in reps:
        assert s.count(old) == 1, (p, old[:70])
        s = s.replace(old, new)
    open(p, "w", encoding="utf-8").write(s)
edit("src/depot/state.js", [
('  if (squad.order === "build") return;  // mk0.60: a building squad keeps quiet, exactly as a moving one does (draws nothing)\n',
 '  if (squad.order === "build") return;  // mk0.60: a building squad keeps quiet, exactly as a moving one does (draws nothing)\n  // FROSTLINE FL-2: the game layer\'s per-squad safety — unset everywhere in\n  // the depot game, so this line is inert outside FROSTLINE (draws nothing).\n  if (squad.holdFire) return;\n'),
('        if ((e.kind !== "unit" && e.kind !== "vehicle" && e.kind !== "mech") || !e.alive || e.team !== enemyTeam) continue;\n        const dx = e.pos.x - u.pos.x, dz = e.pos.z - u.pos.z;\n',
 '        if ((e.kind !== "unit" && e.kind !== "vehicle" && e.kind !== "mech") || !e.alive || e.team !== enemyTeam) continue;\n        // FROSTLINE FL-2: the overwatch cone — a set fireArc {b, half} keeps\n        // every shot inside its bearing window; unset everywhere else (inert).\n        if (squad.fireArc) {\n          let da = Math.atan2(e.pos.x - u.pos.x, e.pos.z - u.pos.z) - squad.fireArc.b;\n          while (da > Math.PI) da -= Math.PI * 2;\n          while (da < -Math.PI) da += Math.PI * 2;\n          if (Math.abs(da) > squad.fireArc.half) continue;\n        }\n        const dx = e.pos.x - u.pos.x, dz = e.pos.z - u.pos.z;\n'),
('    let best = null, bestIsStruct = false;\n    if (squad.prefStruct) {\n',
 '    let best = null, bestIsStruct = false;\n    // FROSTLINE FL-2: focus fire — a marked focusId that is alive, hostile,\n    // in range, seen, and clear of the arc outranks the nearest scan. The\n    // cone does not bind an explicit focus. Unset everywhere else (inert).\n    if (squad.focusId != null) {\n      const f = world.byId.get(squad.focusId);\n      if (f && f.alive && f.team === enemyTeam && (f.kind === "unit" || f.kind === "vehicle" || f.kind === "mech")) {\n        const fdx = f.pos.x - u.pos.x, fdz = f.pos.z - u.pos.z;\n        if (fdx * fdx + fdz * fdz < eR * eR) {\n          const fc = toUV(f.pos.x, f.pos.z);\n          if (fieldReaches(T, fc.u, fc.v, squad.team) && arcClears(world, muzzle, f.pos, spec, u.id)) best = f;\n        }\n      }\n    }\n    if (!best) if (squad.prefStruct) {\n'),
('    if (!best) continue;\n    // T7: the corridor holds this man\'s shot if a live teammate stands\n',
 '    if (!best) continue;\n    squad._lastTargetId = best.id; // FROSTLINE FL-2: gate observability — which body the trigger chose\n    // T7: the corridor holds this man\'s shot if a live teammate stands\n'),
('export function spawnSquadMembers(world, squad) {\n  const spec = SQUAD_SPECS[squad.type];\n  for (let i = 0; i < spec.n; i++) {\n',
 '// FROSTLINE FL-7: an optional head count — a squad that lost men between\n// contracts fields what it has. Every existing caller passes nothing and\n// spawns spec.n exactly as before (inert outside FROSTLINE).\nexport function spawnSquadMembers(world, squad, n) {\n  const spec = SQUAD_SPECS[squad.type];\n  const count = n != null ? Math.max(0, Math.min(n, spec.n)) : spec.n;\n  for (let i = 0; i < count; i++) {\n'),
])
edit("src/depot/squads.js", [
('  medics: { n: 2, cost: 55, label: "MEDIC TEAM" },\n',
 '  medics: { n: 2, cost: 55, label: "MEDIC TEAM" },\n  // FROSTLINE FL-9: THE HUNTER — one armored man, twin sidearms,\n  // the jetpack line. Additive row: no depot code names it. // provisional (F5)\n  hunter: { n: 1, cost: 120, speed: 3.6, label: "THE HUNTER" },\n'),
('    if (Math.abs(x - b.pos.x) <= b.hx + clear && Math.abs(z - b.pos.z) <= b.hz + clear) return true;\n  }\n  // P7 T12: THE HULL IS GROUND TOO',
 '    if (Math.abs(x - b.pos.x) <= b.hx + clear && Math.abs(z - b.pos.z) <= b.hz + clear) return true;\n  }\n  // FROSTLINE FL-2.5: TREES ARE GROUND TOO, on the game\'s word — a slot\n  // inside a dynamic tree or loose chunk ejects the man and bulldozes the\n  // trunk. Opt-in per world (world.slotTreesBlock, set only by FROSTLINE\'s\n  // mission boot; no depot code sets it), so every existing behavior pin\n  // holds. The solids pool already carries dynamic trees/chunks under the\n  // kind-not-mobility rule; the statics loop above has the rest.\n  if (world.slotTreesBlock) {\n    const tpool = world._L ? world._L.solids : world.bodies;\n    for (const b of tpool) {\n      if (!b.alive || !(b.invM > 0) || (b.kind !== "tree" && b.kind !== "chunk")) continue;\n      if (Math.abs(x - b.pos.x) <= b.hx + clear && Math.abs(z - b.pos.z) <= b.hz + clear) return true;\n    }\n  }\n  // P7 T12: THE HULL IS GROUND TOO'),
])
edit("src/modules/specs/specs.js", [
('            acc: 0.090, occl: "arc", windF: 0.06, windComp: 0.6 },\n  // mk0.99: 3.6 -> 8 — the MG family rises\n',
 '            acc: 0.090, occl: "arc", windF: 0.06, windComp: 0.6 },\n  // FROSTLINE FL-9: THE TWIN SIDEARMS — the hunter\'s own irons. A\n  // two-round pull (one from each hand), short reach, quick cadence, real\n  // hurt up close. Additive row: no depot code names it. // provisional (F5)\n  hunter: { projSpeed: 80, kind: "mg", weapon: "sidearms", dmg: 5, dirDmg: 11, burst: 2, burstGap: 0.10,\n            fireRate: 0.8, range: 12, acc: 0.075, occl: "arc", windF: 0.06, windComp: 0.6 },\n  // mk0.99: 3.6 -> 8 — the MG family rises\n'),
])
print("carried lines in place")
SPINE_EOF_4
test "$(sha256sum src/depot/state.js | cut -c1-16)" = "4a2816b4e8354097" && echo OK src/depot/state.js || echo FAILED src/depot/state.js
test "$(sha256sum src/depot/squads.js | cut -c1-16)" = "1ed2ccc987177a77" && echo OK src/depot/squads.js || echo FAILED src/depot/squads.js
test "$(sha256sum src/modules/specs/specs.js | cut -c1-16)" = "2306ca69c52a1229" && echo OK src/modules/specs/specs.js || echo FAILED src/modules/specs/specs.js
```

5. Move `src/ui/theme.js` into the walker's bench group of the parts source. The hash line must print OK.

```sh
python3 - <<'SPINE_EOF_5'
p = "docs/parts/parts-source.json"; s = open(p, encoding="utf-8").read()
old = '   "match": [\n    "src/game/mechReadout.js"\n   ],'
assert s.count(old) == 1, "bench anchor"
open(p, "w", encoding="utf-8").write(s.replace(old, '   "match": [\n    "src/game/mechReadout.js",\n    "src/ui/theme.js"\n   ],'))
SPINE_EOF_5
test "$(sha256sum docs/parts/parts-source.json | cut -c1-16)" = "ea905ff27e48f6b0" && echo OK parts-source.json || echo FAILED parts-source.json
```

6. Turn the old-master gate's three pinned hashes into laws: two checks compare against a twin boot, one against a twin run. The count stays 21. The file must pass a syntax check and the hash line must print OK.

```sh
python3 - <<'SPINE_EOF_6'
p = "scripts/old-master-test.mjs"; s = open(p, encoding="utf-8").read()
reps = [
('  check("the world hash with the master in it holds its pin", worldHash(war.world) === 3344950406);\n  check("the run hash holds its pin", runHash(war.run) === 997895256); }\n',
 '  const twin = bootWithHero(), tIn = defaultTickInput(), tHIn = heroInput();\n  for (let i = 0; i < 1200; i++) { stepHero(twin.war, twin.hero, tHIn, STEP); tickWar(twin.war, STEP, tIn); }\n  check("the world hash with the master in it repeats on a twin boot", worldHash(war.world) === worldHash(twin.war.world));\n  check("the run hash repeats on a twin boot", runHash(war.run) === runHash(twin.war.run)); }\n'),
('{ const war = bootWar({ seed: 1 });\n  const hero = spawnHero(war, 0, 20);\n  const crate = addBody(war.world, { kind: "prop", team: 0, x: 12, y: war.field.heightAt(12, 20) + 0.5, z: 20, hx: 0.4, hy: 0.4, hz: 0.4, mass: 25, hp: 50 });\n  const grip = seize(hero, crate);\n  const input = defaultTickInput(), hIn = heroInput();\n  for (let i = 0; i < 120; i++) { stepGrip(grip, hero, STEP); stepHero(war, hero, hIn, STEP); tickWar(war, STEP, input); }\n  hurl(grip, hero, 60, 20);\n  for (let i = 0; i < 120; i++) { stepHero(war, hero, hIn, STEP); tickWar(war, STEP, input); }\n  check("live war: a crate reeled for a second and hurled east — the master stands, the world pins",\n    hero.alive === true && crate.pos.x > 14 && worldHash(war.world) === 1533505030 && runHash(war.run) === 3688031194); }\n',
 '{ const run = () => { const war = bootWar({ seed: 1 });\n    const hero = spawnHero(war, 0, 20);\n    const crate = addBody(war.world, { kind: "prop", team: 0, x: 12, y: war.field.heightAt(12, 20) + 0.5, z: 20, hx: 0.4, hy: 0.4, hz: 0.4, mass: 25, hp: 50 });\n    const grip = seize(hero, crate);\n    const input = defaultTickInput(), hIn = heroInput();\n    for (let i = 0; i < 120; i++) { stepGrip(grip, hero, STEP); stepHero(war, hero, hIn, STEP); tickWar(war, STEP, input); }\n    hurl(grip, hero, 60, 20);\n    for (let i = 0; i < 120; i++) { stepHero(war, hero, hIn, STEP); tickWar(war, STEP, input); }\n    return { stands: hero.alive === true, east: crate.pos.x > 14, hash: worldHash(war.world) + ":" + runHash(war.run) }; };\n  const a = run(), b = run();\n  check("live war: a crate reeled for a second and hurled east — the master stands, and a twin run lands the same world",\n    a.stands && a.east && a.hash === b.hash); }\n'),
]
for old, new in reps:
    assert s.count(old) == 1, old[:70]
    s = s.replace(old, new)
open(p, "w", encoding="utf-8").write(s)
SPINE_EOF_6
node --check scripts/old-master-test.mjs && echo "syntax ok"
test "$(sha256sum scripts/old-master-test.mjs | cut -c1-16)" = "07910e89a9c90a86" && echo OK old-master-test.mjs || echo FAILED old-master-test.mjs
```

6a. Move the engine's two id counters onto the world, in the lifted copies here. This is the one listed difference from the checkout in the engine: world-making sets both counts to one, body-making and walker-making take the world's next number. Both files must pass a syntax check and both hash lines must print OK.

```sh
python3 - <<'SPINE_EOF_6A'
def edit(p, reps):
    s = open(p, encoding="utf-8").read()
    for old, new in reps:
        assert s.count(old) == 1, (p, old[:60])
        s = s.replace(old, new)
    open(p, "w", encoding="utf-8").write(s)
edit("src/engine/core.js", [
("let BODY_ID = 1;\n", ""),
("export function makeBody(o) {\n", "export function makeBody(o, id) {\n"),
('    id: BODY_ID++, kind: o.kind || "prop", team: o.team || 0, tag: o.tag || "",\n', '    id, kind: o.kind || "prop", team: o.team || 0, tag: o.tag || "",\n'),
("    bisonId: 0, volleySeq: 1, killCount: 0, seq: 0,\n", "    bisonId: 0, volleySeq: 1, killCount: 0, seq: 0, nextId: 1, nextMechId: 1,\n"),
("export function addBody(world, o) { const b = makeBody(o); b.seq = world.seq++; world.bodies.push(b); world.byId.set(b.id, b); return b; } // seq is world-local (unlike the module-global id) so parity-keyed AI stays deterministic across rebuilds\n",
 "export function addBody(world, o) { const id = world.nextId || 1; world.nextId = id + 1; const b = makeBody(o, id); b.seq = world.seq++; world.bodies.push(b); world.byId.set(b.id, b); return b; } // the id and the seq are both the world's own: every world numbers from one, so two boots from one seed are twins in every record that names a body\n"),
])
edit("src/engine/mech.js", [
("let MECH_ID = 1;\n", ""),
("  const mech = {\n    id: MECH_ID++, s, joints: [], links: [], legs: {}, _contacts: [],\n",
 "  const mechId = world.nextMechId || 1; world.nextMechId = mechId + 1; // the world's own count, like body ids\n  const mech = {\n    id: mechId, s, joints: [], links: [], legs: {}, _contacts: [],\n"),
])
print("the counters are the world's own")
SPINE_EOF_6A
node --check src/engine/core.js && echo "syntax ok core.js"
node --check src/engine/mech.js && echo "syntax ok mech.js"
test "$(sha256sum src/engine/core.js | cut -c1-16)" = "eda9db9bb687307a" && echo OK src/engine/core.js || echo FAILED src/engine/core.js
test "$(sha256sum src/engine/mech.js | cut -c1-16)" = "c9ed940fd02671a7" && echo OK src/engine/mech.js || echo FAILED src/engine/mech.js
```

6b. Write the spine gate, exactly, and register it after the parts line of the gate table. The gate file must pass a syntax check; both hash lines must print OK.

```sh
cat > scripts/spine-test.mjs <<'SPINE_EOF_6B'
// COMBO-ENGINE — spine-test: laws over the coldsnap engine this tree carries
// with listed differences from the checkout. The one difference today: a
// world numbers its own bodies and walkers from one, so two boots from one
// seed in one process are twins in every hash, the run record included.
// NO HARDWIRED SEEDS: the seeds roll fresh each run and print; rerun with
// SEED=<n> in the environment.
import { makeWorld, addBody, worldHash } from "../src/engine/core.js";
import { buildMech } from "../src/engine/mech.js";
import { bootWar, runHash } from "../src/depot/api.js";

let pass = 0, fail = 0;
const check = (name, ok) => { if (ok) { pass++; console.log("PASS " + name); } else { fail++; console.log("FAIL " + name); } };
const SEED = process.env.SEED ? +process.env.SEED : Math.floor(Math.random() * 1e6) + 1;
console.log("seeds " + JSON.stringify({ world: SEED, war: SEED }));

const flat = { heightAt: () => 0, dirty: false, carve: () => {}, normalAt: (x, z, o) => { o.x = 0; o.y = 1; o.z = 0; return o; } };
const box = { kind: "prop", team: 0, mass: 10, hx: 0.5, hy: 0.5, hz: 0.5, x: 0, y: 0.5, z: 0 };

// 1. every world numbers its bodies from one, densely
{
  const w1 = makeWorld({ field: flat, seed: SEED }), w2 = makeWorld({ field: flat, seed: SEED + 1 });
  const a1 = addBody(w1, box), a2 = addBody(w1, box), a3 = addBody(w1, box), b1 = addBody(w2, box);
  check("spine: the first body of a world is body 1, in every world", a1.id === 1 && b1.id === 1);
  check("spine: ids are dense within a world — the third body is body 3 and the next would be 4", a2.id === 2 && a3.id === 3 && w1.nextId === 4);
}
// 2. every world numbers its walkers from one
{
  const w1 = makeWorld({ field: flat, seed: SEED }), w2 = makeWorld({ field: flat, seed: SEED });
  const m1 = buildMech(w1, { x: 0, z: 0, yaw: 0, team: 1 }), m2 = buildMech(w2, { x: 0, z: 0, yaw: 0, team: 1 });
  check("spine: the first walker of a world is walker 1, in every world", m1.id === 1 && m2.id === 1);
}
// 3. twin boots from one rolled seed in one process: one world hash, one run hash, the enemy roster's member ids the same
{
  const A = bootWar({ seed: SEED }), B = bootWar({ seed: SEED });
  check("spine: twin boots from one rolled seed hash the same world", worldHash(A.world) === worldHash(B.world));
  check("spine: twin boots from one rolled seed hash the same run", runHash(A.run) === runHash(B.run));
  const ids = (w) => JSON.stringify(w.run.foeSquads.map((s) => s.memberIds));
  check("spine: the enemy roster carries the same member ids in both boots", ids(A) === ids(B));
}
console.log(`spine-test: ${pass} PASS / ${fail} FAIL`);
console.log(fail ? "spine-test FAIL" : "spine-test PASS");
process.exit(fail ? 1 : 0);
SPINE_EOF_6B
node --check scripts/spine-test.mjs && echo "syntax ok spine-test.mjs"
test "$(sha256sum scripts/spine-test.mjs | cut -c1-16)" = "b3f7781653ee20f0" && echo OK scripts/spine-test.mjs || echo FAILED scripts/spine-test.mjs
python3 - <<'SPINE_EOF_6C'
p = "scripts/gate.mjs"; s = open(p, encoding="utf-8").read()
old = '  "parts": ["scripts/parts-test.mjs"],\n'
assert s.count(old) == 1, "parts line"
open(p, "w", encoding="utf-8").write(s.replace(old, old + '  "spine": ["scripts/spine-test.mjs"],\n'))
SPINE_EOF_6C
test "$(sha256sum scripts/gate.mjs | cut -c1-16)" = "162dd125f744fff4" && echo OK scripts/gate.mjs || echo FAILED scripts/gate.mjs
```

7. Run the bracket on the lifted tree, with the spine gate. Required last lines are the same as step 1 for the first ten gates; the spine gate's last line must be `spine-test PASS`. The api gate's last line must begin `seed 1  seconds 90 (10800 steps)  worldHash ` and the command must exit 0; its two numbers are new, and they are recorded in step 8 and reported. Any FAIL, any other last line, stops the task here.

```sh
node scripts/gate.mjs combat | tail -1
node scripts/gate.mjs accuracy | tail -1
node scripts/gate.mjs contract | tail -1
node scripts/gate.mjs ledger | tail -1
node scripts/gate.mjs market | tail -1
node scripts/gate.mjs determinism | tail -1
node scripts/gate.mjs frostline | tail -1
node scripts/gate.mjs old-master | tail -1
node scripts/gate.mjs manifest | tail -1
node scripts/gate.mjs parts | tail -1
node scripts/gate.mjs spine | tail -1
node scripts/gate.mjs api | tail -1
```

8. Close the records in this landing: the version to 0.1.0; the README's new box, its housekeeping note, and its status sentence with the api numbers read from the gate log's last api line; the phase document's status line. Every assert must hold and the four grep counts must be as required.

```sh
python3 - <<'SPINE_EOF_8'
import re
log = open(".superpowers/gates.log", encoding="utf-8").read().splitlines()
api = [l for l in log if " api ok " in l][-1]
m = re.search(r"worldHash (\d+)  runHash (\d+)", api); assert m, "api line"
W, R = m.group(1), m.group(2)
p = "package.json"; s = open(p, encoding="utf-8").read(); assert s.count('"version": "0.0.112"') == 1; open(p, "w", encoding="utf-8").write(s.replace('"version": "0.0.112"', '"version": "0.1.0"'))
rd = "README.md"; s = open(rd, encoding="utf-8").read()
old = "- [x] The renderer\n"
assert s.count(old) == 1, "renderer box"
s = s.replace(old, old + "- [x] The spine at coldsnap 111b9cb: every taken file matching the checkout by hash; the walker's leap and gas system, the jeep on springs, real tanks with hull-borne launch loads, the order chain, the placement layer, the harness — 0.1.0\n")
old = "Engine housekeeping — depot code moved into module files behind unchanged front doors, no capability added, no checklist item claimed (phases 0.0.40–0.0.57): sight, wind, lists, orient, route, territory, intel, fog, mines, economy, cards, transports, specs, ai, save, accuracy, mapgen."
assert s.count(old) == 1, "housekeeping note"
s = s.replace(old, old + " From 0.1.0 those module files hold coldsnap's code at 111b9cb, the import paths the only difference; specs carries five added lines, listed in that phase's plan.")
old = "The coldsnap engine has landed: 42 files, verbatim at coldsnap commit `82b5524`, proven here by the same gate numbers it prints at home (`node scripts/gate.mjs api` — worldHash 3367709165, runHash 2717846799)."
assert s.count(old) == 1, "status sentence"
s = s.replace(old, "The coldsnap engine stands at coldsnap commit `111b9cb`: 48 files at its paths, 26 matching the checkout by hash, 17 front doors whose code sits in modules at the same commit, four carrying listed differences from the 0.1.0 plan, and the version mark left as it was; `node scripts/gate.mjs api` prints worldHash " + W + ", runHash " + R + ".")
open(rd, "w", encoding="utf-8").write(s)
ph = "docs/plans/phase-0.1.0-the-spine.md"; s = open(ph, encoding="utf-8").read()
assert len(re.findall(r"^Status: (?:PLANNED|SERVED|APPROVED|DISPATCHED)\b[^\n]*$", s, re.M)) == 1, "phase status anchor"
open(ph, "w", encoding="utf-8").write(re.sub(r"^Status: (?:PLANNED|SERVED|APPROVED|DISPATCHED)\b[^\n]*$", "Status: LANDED, commit stamped below, 2026-09-09. Bracket: eleven gates at their recorded counts and the spine gate green; the parts build 50 gates, every verdict ok.", s, count=1, flags=re.M))
print("records closed; api worldHash " + W + " runHash " + R)
SPINE_EOF_8
grep -c '"version": "0.1.0"' package.json
grep -c 'The spine at coldsnap 111b9cb' README.md
grep -c 'worldHash 3367709165' README.md
grep -c '^Status: LANDED' docs/plans/phase-0.1.0-the-spine.md
```

Required: `1`, `1`, `0`, `1`.

9. Build the parts table and the page with every gate. About four minutes; do not stop it. The count line must name 50 gates, the build must end with a `wrote docs/parts/parts.json` line, and the verdict check must print `50 gates, 0 not ok`. Any gate not ok stops the task here.

```sh
node scripts/parts.mjs --gates all
node -e 'const t=require("./docs/parts/parts.json");const bad=Object.values(t.gates).filter(g=>g.verdict!=="ok").map(g=>g.name);console.log(Object.keys(t.gates).length+" gates, "+bad.length+" not ok"+(bad.length?": "+bad.join(", "):""));process.exit(bad.length?1:0)'
```

10. Commit and push the landing, then stamp the real hash in a second small commit. Never amend after stamping.

```sh
git add src/engine src/graphics src/platform src/depot src/aar src/game src/ui src/modules scripts/old-master-test.mjs scripts/spine-test.mjs scripts/gate.mjs docs/parts README.md package.json docs/plans
git commit -m "phase 0.1.0 — the spine: coldsnap at 111b9cb by hash, the carved modules refreshed, the world's own ids, the era opens

Twenty-three files from the checkout, sixteen module files through the substitution rule, three files with their added lines at anchors, the engine's two id counters moved onto the world in its two files; theme.js with the walker's readout; three pinned hashes in the old-master gate turned into laws; the spine gate holds the world's-own-ids law.
Bracket of eleven gates at their recorded counts, the spine gate green; the parts build over 50 gates, every verdict ok.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01QSq3kZC3Bk9SC5RwnqYUfs"
git push origin main
H=$(git rev-parse --short HEAD)
sed -i "s/commit stamped below/commit \`$H\`/" docs/plans/phase-0.1.0-the-spine.md
git add docs/plans && git commit -m "phase 0.1.0 record stamped — $H

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01QSq3kZC3Bk9SC5RwnqYUfs"
git push origin main
```

## Acceptance

- Step 0: `0`, `0`.
- Step 1: the four values and nine OK lines; the eleven recorded last lines.
- Steps 2 through 6b: forty-eight OK lines in all, and `syntax ok` four times, in steps 6, 6a, and 6b.
- Step 7: the first ten last lines unchanged from step 1; `spine-test PASS`; the api line with its new numbers, exit 0.
- Step 8: the four counts `1`, `1`, `0`, `1`.
- Step 9: the count line names 50 gates; `50 gates, 0 not ok`.
- Step 10: push accepted by origin; the stamp commit pushed.

After the landing the orchestrator republishes the page from `docs/parts/parts.html` to its fixed address and names it in the landing report.

## Report

Read-confirmation first, then one line of outcome, then bullets: every last line from steps 1 and 7 verbatim; every OK line; the api gate's old and new numbers as a labeled re-pin; the parts build's count line verbatim and the verdict line; both commit hashes; the push results. Every nonconformity its own labeled bullet. Fixture seeds: the seeds lines printed by the frostline, contract, determinism, parts, and spine gates in step 7, and the gravitys-ark seeds line from `docs/parts/parts.json`; no seed is special.
