# Task 0.1.3-1 — the opening

One job: the opening she can survive. Her row carries her own body with 250 hit points; a rifle squad of coldsnap's stands guard behind her stand at the crash and the hands behind it; the opening crash shakes 1,500 kg of scrap loose for the ground's purse; welding runs at half a second per metre slid. One check joins the ark's gate. Every edit is an anchored replacement checked by hash; write exactly what is written, run the listed gates, report. You design nothing.

Suggested model: Sonnet 5.

Required reading, in order (confirm at the top of your report):
1. This file, whole.
2. `docs/plans/phase-0.1.3-the-nine-findings.md`, whole.

No demo file is read or written. Nothing under `/home/batman/coldsnap` is read, written, or run.

## Steps

Run from `/home/batman/combo-engine`. A failed assert, a wrong required value, or a FAILED hash line stops the task: report the step and its verbatim output, run nothing further. Never edit a file to make a hash match.

1. Assert the ground: the tracked files clean at phase 0.1.2's landing, the five files this task edits at their landed hashes. The gates were recorded green at that landing and are not run again here.

```sh
git status --short | grep -v "^??" | wc -l
while read -r hash path; do test "$(sha256sum "$path" | cut -c1-16)" = "$hash" && echo "OK $path" || echo "FAILED $path"; done <<'GROUND'
57b19d0a24f7eb54 src/games/gravitys-ark/ground.js
84166f4be3ebe1b8 docs/gravitys-ark/main.js
695d3c51b2ce799c docs/gravitys-ark/ground.js
5658482c2ba46004 scripts/gravitys-ark-test.mjs
49f425b74620c62e README.md
GROUND
```

Required: `0`, five OK lines.

2. The ark's ground layer: her own body row, the guard squads behind her stand, the hands behind the guard, the welding rate, the guards counted in the summary. Syntax check; the hash line must print OK.

```sh
python3 - <<'ARK_EOF_2'
def edit(p, reps):
    s = open(p, encoding="utf-8").read()
    for old, new in reps:
        assert s.count(old) == 1, (p, old[:70])
        s = s.replace(old, new)
    open(p, "w", encoding="utf-8").write(s)
edit("src/games/gravitys-ark/ground.js", [
("her: null, hands: [], walker: null, stick: { f: 0, l: 0, h: null }, site, recomputeFlow };\n", "her: null, hands: [], guards: [], walker: null, stick: { f: 0, l: 0, h: null }, site, recomputeFlow };\n"),
("// reach: how close she must stand to a module to work on it; repairBase and\n// repairPerM: the weld-back's seconds, plus seconds per metre the module slid;\n",
 "// member: her own body, a man's size with her own hit points; guards: how many of\n// coldsnap's rifle squads stand guard beside her at the crash; guardOff: how far behind\n// her stand they stand. reach: how close she must stand to a module to work on it;\n// repairBase and repairPerM: the weld-back's seconds, plus seconds per metre the module slid;\n"),
("  squad: { n: 1, cost: 0, speed: 3.2, label: \"THE ENGINEER\" },\n", "  squad: { n: 1, cost: 0, speed: 3.2, label: \"THE ENGINEER\", member: { mass: 80, hx: 0.28, hy: 1.0, hz: 0.28, hp: 250 } },\n"),
("  reach: 2.5, repairBase: 5, repairPerM: 1.5, standOff: 4,\n", "  reach: 2.5, repairBase: 5, repairPerM: 0.5, standOff: 4, guards: 1, guardOff: 4,\n"),
("// fieldCrew(G, crew): she stands off the bridge as a squad of one on her own row; the\n// hands stand as rifle squads of up to four, each man carrying his name.\n",
 "// fieldCrew(G, crew): she stands off the bridge as a squad of one on her own row; the\n// guard, coldsnap's own rifle squads, stands behind her; the hands stand behind the\n// guard as rifle squads of up to four, each man carrying his name.\n"),
("  spawnSquadMembers(world, squad); run.squads.push(squad);\n  const names = (crew || []).map((h) => h.name), hands = [];\n",
 "  spawnSquadMembers(world, squad); run.squads.push(squad);\n  const guards = [];\n  for (let k = 0; k < d.guards; k++) {\n    const o = off + d.guardOff + 3 * k;\n    const gq = makeSquad(run.nextSquadId++, \"rifles\", 1, at.x - r.x * o, at.z - r.z * o);\n    spawnSquadMembers(world, gq); run.squads.push(gq); guards.push(gq);\n  }\n  G.guards = guards;\n  const names = (crew || []).map((h) => h.name), hands = [];\n"),
("    const o = off + 3 + 3 * (k / 4);\n", "    const o = off + d.guardOff + 3 * d.guards + 3 * (k / 4);\n"),
("  const hands = { alive: G.hands.filter((h) => h.alive).length, total: G.hands.length };\n",
 "  const hands = { alive: G.hands.filter((h) => h.alive).length, total: G.hands.length };\n  const gIds = G.guards.flatMap((sq) => sq.memberIds), guards = { alive: gIds.filter((id) => { const u = world.byId.get(id); return !!(u && u.alive); }).length, total: gIds.length };\n"),
("foes, guns, modules, her, hands, walker,\n", "foes, guns, modules, her, hands, guards, walker,\n"),
])
ARK_EOF_2
node --check src/games/gravitys-ark/ground.js && echo "syntax ok ground.js"
test "$(sha256sum src/games/gravitys-ark/ground.js | cut -c1-16)" = "19a6d48d0fbf5742" && echo OK src/games/gravitys-ark/ground.js || echo FAILED src/games/gravitys-ark/ground.js
```

3. The page: the opening's scrap before the opening crash, with its log line; the ground screen's log names the guard and its pane counts it. Syntax checks; both hash lines must print OK.

```sh
python3 - <<'ARK_EOF_3'
def edit(p, reps):
    s = open(p, encoding="utf-8").read()
    for old, new in reps:
        assert s.count(old) == 1, (p, old[:70])
        s = s.replace(old, new)
    open(p, "w", encoding="utf-8").write(s)
edit("docs/gravitys-ark/main.js", [
("const OPENING_CRASH = 30;   // the opening: the hull down at 30 m/s on the plague world, the engine off its weld, PROPOSED\n",
 "const OPENING_CRASH = 30, OPENING_SCRAP_KG = 1500;   // the opening: the hull down at 30 m/s on the plague world, the crash shaking the ship's own stores loose as scrap for the ground, PROPOSED\n"),
("enterHold(OPENING_CRASH);\n", "hull.scrap += OPENING_SCRAP_KG; state.events.push({ k: \"the crash shakes \" + fmt(OPENING_SCRAP_KG) + \" kg of scrap loose\", t: state.t });\nenterHold(OPENING_CRASH);\n"),
])
edit("docs/gravitys-ark/ground.js", [
("(Wk ? \"; the walker lies wrecked at the bay's door\" : \"; no walker aboard\"));\n", "(Wk ? \"; the walker lies wrecked at the bay's door\" : \"; no walker aboard\"));\n    if (G.guards.length) say(summary(G).guards.total + \" riflemen stand guard\");\n"),
("\"   hands \" + s.hands.alive + \" of \" + s.hands.total\n", "\"   hands \" + s.hands.alive + \" of \" + s.hands.total + \"   guards \" + s.guards.alive + \" of \" + s.guards.total\n"),
])
ARK_EOF_3
node --check docs/gravitys-ark/main.js && echo "syntax ok main.js"
node --check docs/gravitys-ark/ground.js && echo "syntax ok screen"
test "$(sha256sum docs/gravitys-ark/main.js | cut -c1-16)" = "fe9fba8e96af74fd" && echo OK docs/gravitys-ark/main.js || echo FAILED docs/gravitys-ark/main.js
test "$(sha256sum docs/gravitys-ark/ground.js | cut -c1-16)" = "33b929a03089bb51" && echo OK docs/gravitys-ark/ground.js || echo FAILED docs/gravitys-ark/ground.js
```

4. The ark's gate: one check joins at the end. Syntax check; the hash line must print OK.

```sh
python3 - <<'ARK_EOF_4'
p = "scripts/gravitys-ark-test.mjs"; s = open(p, encoding="utf-8").read()
imp = "setStick, WALKER, standOff, SHAPE, shapeOf } from \"../src/games/gravitys-ark/ground.js\";\n"
assert s.count(imp) == 1, "ground import"
s = s.replace(imp, "setStick, WALKER, standOff, SHAPE, shapeOf, summary as groundSummary } from \"../src/games/gravitys-ark/ground.js\";\n")
anchor = "console.log(`gravitys-ark-test: ${pass} PASS / ${fail} FAIL`);\n"
assert s.count(anchor) == 1, "tail anchor"
block = '''{ // 54. ark: her own row carries her hit points, coldsnap's riflemen stand guard beside her at the crash and clear of every module, and the summary counts them
  const gSeed = rollSeed(), g = makeGalaxy(gSeed), w = g.worlds[0];
  const G = makeGround(gSeed, w, 900); crashHull(G, makeHull(STARTER_HULL), 10); fieldCrew(G, [{ name: "Eir" }]);
  const hb = herBody(G), hp = HER.squad.member.hp;
  const men = G.guards.flatMap((sq) => sq.memberIds.map((id) => G.world.byId.get(id)));
  const clear = (u) => G.hull.bodies.every((m) => Math.abs(u.pos.x - m.pos.x) > m.hx + u.hx || Math.abs(u.pos.z - m.pos.z) > m.hz + u.hz);
  const s = groundSummary(G);
  check("ark: her own row carries her hit points, coldsnap's riflemen stand guard beside her at the crash and clear of every module, and the summary counts them",
    !!hb && hb.hp === hp && hb.maxHp === hp && hp > 58 && G.guards.length === HER.guards && G.guards.every((sq) => sq.type === "rifles" && sq.team === 1 && sq.order === "defend")
    && men.length === HER.guards * SQUAD_SPECS.rifles.n && men.every((u) => u && u.alive && u.team === 1 && clear(u)) && clear(hb) && s.guards.alive === men.length && s.guards.total === men.length && s.hands.total === 1);
}

'''
s = s.replace(anchor, block + anchor)
open(p, "w", encoding="utf-8").write(s)
ARK_EOF_4
node --check scripts/gravitys-ark-test.mjs && echo "syntax ok gate"
test "$(sha256sum scripts/gravitys-ark-test.mjs | cut -c1-16)" = "82b1b00952d862e3" && echo OK scripts/gravitys-ark-test.mjs || echo FAILED scripts/gravitys-ark-test.mjs
```

5. The record that rides the landing: the README's ground line says the crew as built. The hash line must print OK.

```sh
python3 - <<'ARK_EOF_5'
def edit(p, reps):
    s = open(p, encoding="utf-8").read()
    for old, new in reps:
        assert s.count(old) == 1, (p, old[:70])
        s = s.replace(old, new)
    open(p, "w", encoding="utf-8").write(s)
edit("README.md", [
("She is a trooper of her own row and the hands are riflemen by name;", "She is a trooper of her own row with 250 hit points, a rifle squad of coldsnap's stands guard beside her from the first frame, the opening crash shakes 1,500 kg of scrap loose for the ground's purse, and the hands are riflemen by name;"),
])
ARK_EOF_5
test "$(sha256sum README.md | cut -c1-16)" = "1bfbbbc8930f40d7" && echo OK README.md || echo FAILED README.md
```

6. Run the ark's gate. It must print 50 PASS lines, one more than the recorded 49, then `gravitys-ark-test: 50 PASS / 0 FAIL`, then `gravitys-ark-test PASS`. Any FAIL stops the task here.

```sh
node scripts/gate.mjs gravitys-ark > /tmp/ark-gate.txt; tail -3 /tmp/ark-gate.txt; grep -m1 '^seeds' /tmp/ark-gate.txt
```

7. The record: the phase document's task row and status line. Then the parts build over every gate, about four minutes; it must name 50 gates and every verdict must be ok, the ark's gate among them at 50 PASS and 0 FAIL.

```sh
python3 - <<'ARK_EOF_7'
ph = "docs/plans/phase-0.1.3-the-nine-findings.md"; s = open(ph, encoding="utf-8").read()
old = "the opening scrap, faster welding. DISPATCHED. →"
assert s.count(old) == 1, "task row"
s = s.replace(old, "the opening scrap, faster welding. LANDED, commit stamped below. →")
old2 = "Status: DISPATCHED. Task 1 dispatched."
assert s.count(old2) == 1, "status line"
s = s.replace(old2, "Status: DISPATCHED. Task 1 landed, commit stamped below, 2026-09-09; task 2 is planned next.")
open(ph, "w", encoding="utf-8").write(s)
ARK_EOF_7
grep -c "commit stamped below" docs/plans/phase-0.1.3-the-nine-findings.md
node scripts/parts.mjs --gates all
node -e 'const t=require("./docs/parts/parts.json");const bad=Object.values(t.gates).filter(g=>g.verdict!=="ok").map(g=>g.name);const a=t.gates["gravitys-ark"];console.log(Object.keys(t.gates).length+" gates, "+bad.length+" not ok"+(bad.length?": "+bad.join(", "):""));console.log("gravitys-ark "+a.pass+" PASS / "+a.fail+" FAIL; "+a.seeds);process.exit(bad.length||a.pass!==50?1:0)'
```

Required: `2`, a count line naming 50 gates, `50 gates, 0 not ok`, `gravitys-ark 50 PASS / 0 FAIL;` with its seeds.

8. Commit and push the landing, then stamp the real hash into the status line and the task row in a second small commit. Never amend after stamping.

```sh
git add src/games/gravitys-ark/ground.js docs/gravitys-ark/main.js docs/gravitys-ark/ground.js scripts/gravitys-ark-test.mjs README.md docs/parts docs/plans
git commit -m "phase 0.1.3 task 1 — the opening: her hit points, a rifle squad on guard, 1,500 kg of scrap shaken loose, welding at half a second a metre

Her row carries her own body; coldsnap's riflemen stand behind her stand at the crash; the ground opens with 150 scrap.
gravitys-ark-test 50 PASS / 0 FAIL; the parts build over 50 gates, every verdict ok.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01QSq3kZC3Bk9SC5RwnqYUfs"
git push origin main
H=$(git rev-parse --short HEAD)
sed -i "s/commit stamped below/commit \`$H\`/g" docs/plans/phase-0.1.3-the-nine-findings.md
git add docs/plans && git commit -m "phase 0.1.3 task 1 row stamped — $H

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01QSq3kZC3Bk9SC5RwnqYUfs"
git push origin main
```

## Acceptance

- Step 1: `0`, five OK lines.
- Steps 2 through 5: five OK lines, `syntax ok` four times.
- Step 6: `gravitys-ark-test: 50 PASS / 0 FAIL`, `gravitys-ark-test PASS`, a seeds line.
- Step 7: `2`; the count line names 50 gates; `50 gates, 0 not ok`; `gravitys-ark 50 PASS / 0 FAIL;` with its seeds.
- Step 8: push accepted by origin; the stamp commit pushed.

After the landing the orchestrator republishes the page from `docs/parts/parts.html` to its fixed address and names it, with the game's address, in the landing report.

## Report

Read-confirmation first, then one line of outcome, then bullets: step 6's lines verbatim; every OK line; the parts build's count line and the verdict line verbatim; the ark's gate line verbatim; both commit hashes; the push results. Every nonconformity its own labeled bullet, with the verbatim output. Fixture seeds: the seeds line the ark's gate printed in step 6 and the one from step 7's line; no seed is special.
