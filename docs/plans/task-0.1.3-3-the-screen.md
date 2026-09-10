# Task 0.1.3-3 — the screen

One job: the ground's screen says what matters and the landing explains itself. The pane is three short lines; the log shows two; the buttons are two rows of four: the gun kind, WALL, FIX, TAKE OFF; FIGHT or HOLD as one button, FIX WALKER only while the walker lies wrecked or down, FIRE only while she is in it, SOUND. At the landing a card says what the crash broke and that the mechanic must fix it, with one button, GO; the war stands still until GO. No gate reads the page's files; the parts build at the landing is the proof. Every edit is an anchored replacement checked by hash; write exactly what is written, run what is listed, report. You design nothing.

Suggested model: Sonnet 5.

Required reading, in order (confirm at the top of your report):
1. This file, whole.
2. `docs/plans/phase-0.1.3-the-nine-findings.md`, whole.

No demo file is read or written. Nothing under `/home/batman/coldsnap` is read, written, or run.

## Steps

Run from `/home/batman/combo-engine`. A failed assert, a wrong required value, or a FAILED hash line stops the task: report the step and its verbatim output, run nothing further. Never edit a file to make a hash match.

1. Assert the ground: the tracked files clean at task 2's landing, the four files this task edits at their landed hashes. The gates were recorded green at that landing and are not run again here.

```sh
git status --short | grep -v "^??" | wc -l
while read -r hash path; do test "$(sha256sum "$path" | cut -c1-16)" = "$hash" && echo "OK $path" || echo "FAILED $path"; done <<'GROUND'
cb9a8f6646055159 docs/gravitys-ark/index.html
33b929a03089bb51 docs/gravitys-ark/ground.js
fe9fba8e96af74fd docs/gravitys-ark/main.js
f7adabbd93079fa9 README.md
GROUND
```

Required: `0`, four OK lines.

2. The page's markup and style: two rows of four, the log and the stick above them, the landing's card. The hash line must print OK.

```sh
python3 - <<'ARK_EOF_2'
def edit(p, reps):
    s = open(p, encoding="utf-8").read()
    for old, new in reps:
        assert s.count(old) == 1, (p, old[:70])
        s = s.replace(old, new)
    open(p, "w", encoding="utf-8").write(s)
edit("docs/gravitys-ark/index.html", [
("  /* the ground's layout: the space panes, the space buttons, the dock, the gate, and the flat canvas hide; the pane at the top left; the buttons in three rows of three above the fixed cluster; the log and the stick above the buttons */\n",
 "  /* the ground's layout: the space panes, the space buttons, the dock, the gate, and the flat canvas hide; the pane at the top left; the buttons in two rows of four above the fixed cluster; the log and the stick above the buttons; the landing's card in the middle */\n"),
("width: min(420px, calc(100vw - 24px)); grid-template-columns: repeat(3, 1fr); gap: 6px; }\n", "width: min(420px, calc(100vw - 24px)); grid-template-columns: repeat(4, 1fr); gap: 6px; }\n"),
("  #gLog { display: none; right: 12px; bottom: max(196px, calc(env(safe-area-inset-bottom) + 188px)); max-width: 60vw; max-height: 22vh; overflow: hidden; color: rgba(233,237,242,.8); }\n",
 "  #gLog { display: none; right: 12px; bottom: max(150px, calc(env(safe-area-inset-bottom) + 142px)); max-width: 60vw; max-height: 22vh; overflow: hidden; color: rgba(233,237,242,.8); }\n  #gCard { display: none; left: 50%; top: 42%; transform: translate(-50%, -50%); pointer-events: auto; min-width: 240px; max-width: 86vw; padding: 14px 16px; border-radius: 12px; border: 1.5px solid rgba(233,178,92,.5); background: rgba(7,9,13,.94); font: 500 12px/1.7 system-ui, sans-serif; white-space: normal; }\n  #gCard .t { font-weight: 700; letter-spacing: 0.12em; color: #e9b25c; margin-bottom: 6px; }\n  #gCard button { margin-top: 10px; }\n"),
("  #gStick { position: fixed; left: 18px; bottom: max(196px, calc(env(safe-area-inset-bottom) + 188px)); width: 108px;", "  #gStick { position: fixed; left: 18px; bottom: max(150px, calc(env(safe-area-inset-bottom) + 142px)); width: 108px;"),
('<div id="groundBtns"><button id="gKind">GUN</button><button id="gWall">WALL</button><button id="gFix">FIX</button><button id="gFight">FIGHT</button><button id="gHold">HOLD</button><button id="gRepairWalker">REPAIR WALKER</button><button id="gFire">FIRE</button><button id="gSound">SOUND ON</button><button id="gTakeoff">TAKE OFF</button></div>\n<div id="gStick" style="display:none"><div id="gNub"></div></div>\n',
 '<div id="groundBtns"><button id="gKind">GUN</button><button id="gWall">WALL</button><button id="gFix">FIX</button><button id="gTakeoff">TAKE OFF</button><button id="gFight">FIGHT</button><button id="gRepairWalker">FIX WALKER</button><button id="gFire">FIRE</button><button id="gSound">SOUND ON</button></div>\n<div id="gStick" style="display:none"><div id="gNub"></div></div>\n<div id="gCard" class="pane"><div class="t">THE SHIP IS DOWN</div><div id="gCardBody"></div><button id="gGo">GO</button></div>\n'),
])
ARK_EOF_2
test "$(sha256sum docs/gravitys-ark/index.html | cut -c1-16)" = "9bfbcbe9c71d7bf1" && echo OK docs/gravitys-ark/index.html || echo FAILED docs/gravitys-ark/index.html
```

3. The ground's screen: the three-line pane, the two-line log, FIGHT and HOLD as one button, FIX WALKER and FIRE shown only when they can act, the landing's card and GO, the wait. Syntax check; the hash line must print OK.

```sh
python3 - <<'ARK_EOF_3'
def edit(p, reps):
    s = open(p, encoding="utf-8").read()
    for old, new in reps:
        assert s.count(old) == 1, (p, old[:70])
        s = s.replace(old, new)
    open(p, "w", encoding="utf-8").write(s)
edit("docs/gravitys-ark/ground.js", [
("// makeGroundScreen(ids, hooks): ids names the canvas, the pane, the log, the stick, and the nine buttons; hooks.log takes one line for the log.\n",
 "// makeGroundScreen(ids, hooks): ids names the canvas, the pane, the log, the stick, the landing's card and its button, and the eight buttons; hooks.log takes one line for the log.\n"),
("  let G = null, R = null, A = null, look = null, focus = null, aim = null, zoom = 1, gunI = 1, muted = false, mode = \"gun\", wallStart = null;\n",
 "  let G = null, R = null, A = null, look = null, focus = null, aim = null, zoom = 1, gunI = 1, muted = false, mode = \"gun\", wallStart = null, waiting = false;\n"),
("    if (G.guards.length) say(summary(G).guards.total + \" riflemen stand guard\");\n    mode = \"gun\"; wallStart = null;",
 "    if (G.guards.length) say(summary(G).guards.total + \" riflemen stand guard\");\n    // the landing's card: what happened and what she must do; the war stands still until GO\n    const s0 = summary(G);\n    $(ids.cardBody).textContent = \"The crash broke \" + (s0.modules ? s0.modules.loose : 0) + \" of \" + (s0.modules ? s0.modules.total : 0) + \" modules loose\" + (Wk ? \" and wrecked the walker in its bay\" : \"\") + \". Your mechanic must weld the ship back\" + (Wk ? \" and raise the walker\" : \"\") + \" before you can take off. \" + (s0.guards.total ? s0.guards.total + \" riflemen stand guard. \" : \"\") + \"The first assault comes \" + fmt(s0.bellIn, 0) + \" s after you go.\";\n    $(ids.card).style.display = \"block\"; waiting = true;\n    mode = \"gun\"; wallStart = null;"),
("  function leave() { if (look) { look.dispose(); look = null; } if (R) { R.dispose(); R = null; }", "  function leave() { $(ids.card).style.display = \"none\"; waiting = false; if (look) { look.dispose(); look = null; } if (R) { R.dispose(); R = null; }"),
("    return [\"THE GROUND  t \" + fmt(s.t, 1) + \" s   assault \" + s.bell + \"   next in \" + fmt(s.bellIn, 0) + \" s\",\n      \"scrap \" + fmt(s.scrap) + \" (\" + fmt(s.scrapKg) + \" kg)   guns \" + s.guns + \"   enemy afield \" + s.foes,\n      \"modules \" + (s.modules ? s.modules.alive + \" of \" + s.modules.total + \" standing, \" + s.modules.loose + \" loose\" : \"none\") + \"   the hull stands \" + fmt(s.standing * 100, 0) + \"%\" + (s.lost ? \"   THE BRIDGE IS LOST\" : \"\"),\n      \"she: \" + (s.her ? (s.her.alive ? (s.her.act === \"walker\" ? \"in the walker\" : s.her.act + (s.her.act === \"fix\" || s.her.act === \"repairWalker\" ? \" \" + fmt(s.her.actT, 1) + \" s\" : \"\")) : \"DEAD\") : \"not here\") + \"   hands \" + s.hands.alive + \" of \" + s.hands.total + \"   guards \" + s.guards.alive + \" of \" + s.guards.total\n        + \"   walker \" + (s.walker ? (s.walker.wrecked ? \"wrecked\" : s.walker.alive ? fmt(s.walker.hp) + \" hp\" : \"DOWN\") : \"none\"),\n      mode === \"wall\" ? (wallStart ? \"tap where the wall ends\" : \"tap where the wall starts\") : \"tap the ground to place a \" + TOWER_SPECS[kind()].label.toLowerCase() + \" for \" + fmt(price(G, kind())) + \" scrap; two fingers turn and zoom\"].join(\"\\n\");\n",
 "    // three lines: the purse and the clock; the hull, her, the walker, the crew; the tap\n    const her = s.her ? (s.her.alive ? (s.her.act === \"walker\" ? \"in the walker\" : s.her.act === \"fix\" ? \"welding, \" + fmt(s.her.actT, 0) + \" s\" : s.her.act === \"repairWalker\" ? \"at the walker, \" + fmt(s.her.actT, 0) + \" s\" : s.her.act === \"fight\" ? \"fighting\" : \"standing by\") : \"DEAD\") : \"not here\";\n    return [\"scrap \" + fmt(s.scrap) + \"   next assault in \" + fmt(s.bellIn, 0) + \" s   enemy \" + s.foes + (s.lost ? \"   THE BRIDGE IS LOST\" : \"\"),\n      (s.modules ? s.modules.loose + \" loose of \" + s.modules.total : \"no hull\") + \"   she: \" + her + \"   walker \" + (s.walker ? (s.walker.wrecked ? \"wrecked\" : s.walker.alive ? \"up\" : \"DOWN\") : \"none\") + \"   guards \" + s.guards.alive + (s.hands.total ? \"   hands \" + s.hands.alive : \"\"),\n      mode === \"wall\" ? (wallStart ? \"tap where the wall ends\" : \"tap where the wall starts\") : \"tap the ground: \" + TOWER_SPECS[kind()].label.toLowerCase() + \" for \" + fmt(price(G, kind())) + \" scrap\"].join(\"\\n\");\n"),
("    $(ids.fight).disabled = !(s.her && s.her.alive);\n    $(ids.fight).textContent = s.walker && s.walker.alive ? \"FIGHT: WALKER\" : \"FIGHT\";\n    $(ids.repairWalker).disabled = !(s.her && s.her.alive && s.walker && !s.walker.alive);\n    $(ids.hold).disabled = !(s.her && s.her.alive);\n    $(ids.fire).disabled = !(s.walker && s.walker.possessed);\n",
 "    const fighting = !!(s.her && s.her.alive && (s.her.act === \"fight\" || s.her.act === \"walker\"));   // one button: FIGHT sends her, HOLD stands her down\n    $(ids.fight).disabled = !(s.her && s.her.alive);\n    $(ids.fight).textContent = fighting ? \"HOLD\" : (s.walker && s.walker.alive ? \"FIGHT: WALKER\" : \"FIGHT\");\n    $(ids.repairWalker).style.display = s.her && s.her.alive && s.walker && !s.walker.alive ? \"\" : \"none\";   // only while the walker lies wrecked or down\n    $(ids.fire).style.display = s.walker && s.walker.possessed ? \"\" : \"none\";   // only while she is in it\n"),
("  function hud(lines) { if (!G) return; $(ids.pane).textContent = pane(); $(ids.log).textContent = lines.join(\"\\n\"); buttons(); }\n",
 "  function hud(lines) { if (!G) return; $(ids.pane).textContent = pane(); $(ids.log).textContent = lines.slice(-2).join(\"\\n\"); buttons(); }\n  $(ids.go).onclick = () => { $(ids.card).style.display = \"none\"; waiting = false; if (A) A.ensure(); };\n"),
("  $(ids.hold).onclick = () => { if (!G) return; const r = order(G, \"hold\"); if (!r.ok) say(\"no hold: \" + r.reason); };\n", ""),
("  $(ids.fight).onclick = () => { if (!G) return; const r = order(G, \"fight\"); if (!r.ok) say(\"no fight: \" + r.reason); };\n",
 "  $(ids.fight).onclick = () => { if (!G) return; const s = summary(G), fighting = !!(s.her && s.her.alive && (s.her.act === \"fight\" || s.her.act === \"walker\")); const r = order(G, fighting ? \"hold\" : \"fight\"); if (!r.ok) say((fighting ? \"no hold: \" : \"no fight: \") + r.reason); };\n"),
("  return { enter, leave, step, draw, pane, buttons, hud, active: () => !!G, lost:", "  return { enter, leave, step, draw, pane, buttons, hud, waiting: () => waiting, active: () => !!G, lost:"),
])
ARK_EOF_3
node --check docs/gravitys-ark/ground.js && echo "syntax ok screen"
test "$(sha256sum docs/gravitys-ark/ground.js | cut -c1-16)" = "1d0171aefdd6d331" && echo OK docs/gravitys-ark/ground.js || echo FAILED docs/gravitys-ark/ground.js
```

4. The main file's hookup lines: the card's ids handed to the screen, the war held while the card waits. Syntax check; the hash line must print OK.

```sh
python3 - <<'ARK_EOF_4'
def edit(p, reps):
    s = open(p, encoding="utf-8").read()
    for old, new in reps:
        assert s.count(old) == 1, (p, old[:70])
        s = s.replace(old, new)
    open(p, "w", encoding="utf-8").write(s)
edit("docs/gravitys-ark/main.js", [
('fight: "gFight", repairWalker: "gRepairWalker", hold: "gHold", fire: "gFire", ', 'fight: "gFight", repairWalker: "gRepairWalker", fire: "gFire", card: "gCard", cardBody: "gCardBody", go: "gGo", '),
('      if (view === "ground") { GS.step(DT / 2); GS.step(DT / 2); if (ship.alive && GS.lost())', '      if (view === "ground" && !GS.waiting()) { GS.step(DT / 2); GS.step(DT / 2); if (ship.alive && GS.lost())'),
])
ARK_EOF_4
node --check docs/gravitys-ark/main.js && echo "syntax ok main.js"
test "$(sha256sum docs/gravitys-ark/main.js | cut -c1-16)" = "9c622ae209ab5a58" && echo OK docs/gravitys-ark/main.js || echo FAILED docs/gravitys-ark/main.js
```

5. The record that rides the landing: the README's ground and walker lines say the screen as built. The hash line must print OK.

```sh
python3 - <<'ARK_EOF_5'
def edit(p, reps):
    s = open(p, encoding="utf-8").read()
    for old, new in reps:
        assert s.count(old) == 1, (p, old[:70])
        s = s.replace(old, new)
    open(p, "w", encoding="utf-8").write(s)
edit("README.md", [
("FIGHT is her sidearm, or the walker when it stands. The hold's scrap is the one purse,", "FIGHT is her sidearm, or the walker when it stands, and the same button reads HOLD to stand her down. At the landing a card says what the crash broke and that the mechanic must fix it; the war stands still until GO. The pane is three lines: the purse and the clock; the hull, her, the walker, the crew; the tap. The hold's scrap is the one purse,"),
("lies wrecked at the bay's door at the crash until REPAIR WALKER sends her to a stand outside its room;", "lies wrecked at the bay's door at the crash until FIX WALKER, shown only while it lies there, sends her to a stand outside its room;"),
])
ARK_EOF_5
test "$(sha256sum README.md | cut -c1-16)" = "2300f6b3272367d6" && echo OK README.md || echo FAILED README.md
```

6. The record: the phase document's task row and status line. Then the parts build over every gate, about four minutes; it must name 50 gates and every verdict must be ok, the ark's gate among them at 51 PASS and 0 FAIL.

```sh
python3 - <<'ARK_EOF_6'
ph = "docs/plans/phase-0.1.3-the-nine-findings.md"; s = open(ph, encoding="utf-8").read()
old = "three lines, two rows, and the landing's card. DISPATCHED. →"
assert s.count(old) == 1, "task row"
s = s.replace(old, "three lines, two rows, and the landing's card. LANDED, commit stamped below. →")
old2 = "Status: DISPATCHED. Task 3 dispatched."
assert s.count(old2) == 1, "status line"
s = s.replace(old2, "Status: DISPATCHED. Task 3 landed, commit stamped below, 2026-09-09; task 4 is planned next.")
open(ph, "w", encoding="utf-8").write(s)
ARK_EOF_6
grep -c "commit stamped below" docs/plans/phase-0.1.3-the-nine-findings.md
node scripts/parts.mjs --gates all
node -e 'const t=require("./docs/parts/parts.json");const bad=Object.values(t.gates).filter(g=>g.verdict!=="ok").map(g=>g.name);const a=t.gates["gravitys-ark"];console.log(Object.keys(t.gates).length+" gates, "+bad.length+" not ok"+(bad.length?": "+bad.join(", "):""));console.log("gravitys-ark "+a.pass+" PASS / "+a.fail+" FAIL; "+a.seeds);process.exit(bad.length||a.pass!==51?1:0)'
```

Required: `2`, a count line naming 50 gates, `50 gates, 0 not ok`, `gravitys-ark 51 PASS / 0 FAIL;` with its seeds.

7. Commit and push the landing, then stamp the real hash into the status line and the task row in a second small commit. Never amend after stamping.

```sh
git add docs/gravitys-ark/index.html docs/gravitys-ark/ground.js docs/gravitys-ark/main.js README.md docs/parts docs/plans
git commit -m "phase 0.1.3 task 3 — the screen: three lines, two rows of four, FIGHT and HOLD as one, the landing's card and GO

The pane says the purse, the clock, the hull, her, the walker, the crew, and the tap; the war stands still until GO.
No gate reads the page's files; the parts build over 50 gates, every verdict ok; the ark's gate 51 PASS / 0 FAIL.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01QSq3kZC3Bk9SC5RwnqYUfs"
git push origin main
H=$(git rev-parse --short HEAD)
sed -i "s/commit stamped below/commit \`$H\`/g" docs/plans/phase-0.1.3-the-nine-findings.md
git add docs/plans && git commit -m "phase 0.1.3 task 3 row stamped — $H

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01QSq3kZC3Bk9SC5RwnqYUfs"
git push origin main
```

## Acceptance

- Step 1: `0`, four OK lines.
- Steps 2 through 5: four OK lines, `syntax ok` twice.
- Step 6: `2`; the count line names 50 gates; `50 gates, 0 not ok`; `gravitys-ark 51 PASS / 0 FAIL;` with its seeds.
- Step 7: push accepted by origin; the stamp commit pushed.

After the landing the orchestrator republishes the page from `docs/parts/parts.html` to its fixed address and names it, with the game's address, in the landing report.

## Report

Read-confirmation first, then one line of outcome, then bullets: every OK line; the parts build's count line and the verdict line verbatim; the ark's gate line verbatim; both commit hashes; the push results. Every nonconformity its own labeled bullet, with the verbatim output. Fixture seeds: the gravitys-ark seeds from step 6's line; no seed is special.
