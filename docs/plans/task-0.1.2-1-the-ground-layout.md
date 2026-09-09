# Task 0.1.2-1 — the ground's layout

One job: the ground's screen gets a layout of its own. A mark on the page's body hides the page's space panes, buttons, dock, gate pane, and flat canvas while the ground is up; the ground's numbers stand at the top left, its buttons in three rows of three above the fixed cluster, its log and the stick above the buttons; the page's main file keeps only the hookup lines. Every edit is an anchored replacement checked by hash; write exactly what is written, run what is listed, report. You design nothing.

Suggested model: Sonnet 5.

Required reading, in order (confirm at the top of your report):
1. This file, whole.
2. `docs/plans/phase-0.1.2-the-findings.md`, whole.

No demo file is read or written. Nothing under `/home/batman/coldsnap` is read, written, or run.

## Steps

Run from `/home/batman/combo-engine`. A failed assert, a wrong required value, or a FAILED hash line stops the task: report the step and its verbatim output, run nothing further. Never edit a file to make a hash match.

1. Assert the ground: the tracked files clean, the three files this task edits at their landed hashes. The gates were recorded green at the 0.1.1 landing and are not run again here.

```sh
git status --short | grep -v "^??" | wc -l
while read -r hash path; do test "$(sha256sum "$path" | cut -c1-16)" = "$hash" && echo "OK $path" || echo "FAILED $path"; done <<'GROUND'
1d9b9541e06dd9fe docs/gravitys-ark/index.html
3988ca0a17488489 docs/gravitys-ark/ground.js
25d2719324fb636e docs/gravitys-ark/main.js
GROUND
```

Required: `0`, three OK lines.

2. The page's markup and style: the ground's layout rules under the body's mark, the ground's own pane and log, the buttons in their rows without inline style. The hash line must print OK.

```sh
python3 - <<'ARK_EOF_2'
def edit(p, reps):
    s = open(p, encoding="utf-8").read()
    for old, new in reps:
        assert s.count(old) == 1, (p, old[:70])
        s = s.replace(old, new)
    open(p, "w", encoding="utf-8").write(s)
edit("docs/gravitys-ark/index.html", [
('  #gStick { position: fixed; left: 18px; bottom: max(70px, calc(env(safe-area-inset-bottom) + 62px)); width: 108px; height: 108px; border-radius: 50%; border: 1.5px solid rgba(233,237,242,.35); background: rgba(7,9,13,.25); touch-action: none; }\n',
 '  /* the ground\'s layout: the space panes, the space buttons, the dock, the gate, and the flat canvas hide; the pane at the top left; the buttons in three rows of three above the fixed cluster; the log and the stick above the buttons */\n'
 '  body.ground #title, body.ground #ship, body.ground #clocks, body.ground #log, body.ground #btns, body.ground #dock, body.ground #gatePane, body.ground #cv { display: none !important; }\n'
 '  #gPane { display: none; top: max(10px, env(safe-area-inset-top)); left: 12px; max-width: calc(100vw - 24px); white-space: pre-wrap; }\n'
 '  #groundBtns { position: fixed; display: none; right: 12px; bottom: max(64px, calc(env(safe-area-inset-bottom) + 56px)); width: min(420px, calc(100vw - 24px)); grid-template-columns: repeat(3, 1fr); gap: 6px; }\n'
 '  #groundBtns button { min-width: 0; padding: 10px 4px; font-size: 10px; letter-spacing: 0.06em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }\n'
 '  #gLog { display: none; right: 12px; bottom: max(196px, calc(env(safe-area-inset-bottom) + 188px)); max-width: 60vw; max-height: 22vh; overflow: hidden; color: rgba(233,237,242,.8); }\n'
 '  body.ground #gPane, body.ground #gLog { display: block; }\n'
 '  body.ground #groundBtns { display: grid; }\n'
 '  #gStick { position: fixed; left: 18px; bottom: max(196px, calc(env(safe-area-inset-bottom) + 188px)); width: 108px; height: 108px; border-radius: 50%; border: 1.5px solid rgba(233,237,242,.35); background: rgba(7,9,13,.25); touch-action: none; }\n'),
('<div id="groundBtns" style="display:none; position: fixed; right: 12px; bottom: max(16px, env(safe-area-inset-bottom)); grid-template-columns: repeat(2, minmax(92px, 1fr)); gap: 6px;"><button id="gKind">GUN</button><button id="gWall">WALL</button><button id="gFix">FIX</button><button id="gRepairWalker">REPAIR WALKER</button><button id="gFight">FIGHT</button><button id="gHold">HOLD</button><button id="gFire">FIRE</button><button id="gSound">SOUND ON</button><button id="gTakeoff">TAKE OFF</button></div>\n',
 '<div id="gPane" class="pane">-</div>\n'
 '<div id="gLog" class="pane"></div>\n'
 '<div id="groundBtns"><button id="gKind">GUN</button><button id="gWall">WALL</button><button id="gFix">FIX</button><button id="gFight">FIGHT</button><button id="gHold">HOLD</button><button id="gRepairWalker">REPAIR WALKER</button><button id="gFire">FIRE</button><button id="gSound">SOUND ON</button><button id="gTakeoff">TAKE OFF</button></div>\n'),
])
ARK_EOF_2
test "$(sha256sum docs/gravitys-ark/index.html | cut -c1-16)" = "cb9a8f6646055159" && echo OK docs/gravitys-ark/index.html || echo FAILED docs/gravitys-ark/index.html
```

3. The ground's screen: the mark goes on the body at enter and comes off at leave; the screen writes its own pane and log. Syntax check; the hash line must print OK.

```sh
python3 - <<'ARK_EOF_3'
def edit(p, reps):
    s = open(p, encoding="utf-8").read()
    for old, new in reps:
        assert s.count(old) == 1, (p, old[:70])
        s = s.replace(old, new)
    open(p, "w", encoding="utf-8").write(s)
edit("docs/gravitys-ark/ground.js", [
("// makeGroundScreen(ids, hooks): ids names the canvas and the three buttons; hooks.log takes one line for the log pane.\n",
 "// makeGroundScreen(ids, hooks): ids names the canvas, the pane, the log, the stick, and the nine buttons; hooks.log takes one line for the log.\n"),
('    gv.style.display = "block";\n    R = makeRenderer(', '    gv.style.display = "block"; document.body.classList.add("ground");\n    R = makeRenderer('),
('gv.style.display = "none"; stickEl.style.display = "none"; G = null; }\n', 'gv.style.display = "none"; stickEl.style.display = "none"; document.body.classList.remove("ground"); G = null; }\n'),
('  $(ids.repairWalker).onclick = ',
 "  // hud(lines): the ground's own panes: the numbers at the top left, the log above the buttons, the buttons' labels and states\n"
 '  function hud(lines) { if (!G) return; $(ids.pane).textContent = pane(); $(ids.log).textContent = lines.join("\\n"); buttons(); }\n'
 '  $(ids.repairWalker).onclick = '),
('  return { enter, leave, step, draw, pane, buttons, active: ', '  return { enter, leave, step, draw, pane, buttons, hud, active: '),
])
ARK_EOF_3
node --check docs/gravitys-ark/ground.js && echo "syntax ok ground.js"
test "$(sha256sum docs/gravitys-ark/ground.js | cut -c1-16)" = "95f28f739967a0c8" && echo OK docs/gravitys-ark/ground.js || echo FAILED docs/gravitys-ark/ground.js
```

4. The main file: the pane's and the log's ids handed to the screen, one line-maker for both logs, the ground's own hud called in place of the page's toggles. Syntax check; the hash line must print OK.

```sh
python3 - <<'ARK_EOF_4'
def edit(p, reps):
    s = open(p, encoding="utf-8").read()
    for old, new in reps:
        assert s.count(old) == 1, (p, old[:70])
        s = s.replace(old, new)
    open(p, "w", encoding="utf-8").write(s)
edit("docs/gravitys-ark/main.js", [
('const GS = makeGroundScreen({ canvas: "gv", kind: "gKind", ', 'const GS = makeGroundScreen({ canvas: "gv", pane: "gPane", log: "gLog", kind: "gKind", '),
('function fmt(n, d = 0) { return Number(n).toLocaleString("en-US", { maximumFractionDigits: d, minimumFractionDigits: d }); }\nfunction hud() {\n',
 'function fmt(n, d = 0) { return Number(n).toLocaleString("en-US", { maximumFractionDigits: d, minimumFractionDigits: d }); }\n'
 'const logLine = (e) => "t=" + fmt(e.t, 1) + " " + e.k + (e.i !== undefined ? " " + galaxy.worlds[e.i].id : "") + (e.v !== undefined ? " " + fmt(e.v, 1) + " m/s" : "");\n'
 'function hud() {\n'),
('  $("log").textContent = state.events.slice(-6).map((e) => "t=" + fmt(e.t, 1) + " " + e.k + (e.i !== undefined ? " " + galaxy.worlds[e.i].id : "") + (e.v !== undefined ? " " + fmt(e.v, 1) + " m/s" : "")).join("\\n");\n',
 '  $("log").textContent = state.events.slice(-6).map(logLine).join("\\n");\n'),
('  const inGround = view === "ground";\n  $("btns").style.display = inGround ? "none" : "grid"; $("groundBtns").style.display = inGround ? "grid" : "none";\n  if (inGround) { $("clocks").textContent = GS.pane(); GS.buttons(); $("dock").style.display = "none"; cv.style.display = "none"; } else cv.style.display = "block";\n',
 '  if (view === "ground") GS.hud(state.events.slice(-8).map(logLine));   // the ground\'s own panes; the page\'s own hide by the body\'s ground class\n'),
])
ARK_EOF_4
node --check docs/gravitys-ark/main.js && echo "syntax ok main.js"
test "$(sha256sum docs/gravitys-ark/main.js | cut -c1-16)" = "762beced89d02260" && echo OK docs/gravitys-ark/main.js || echo FAILED docs/gravitys-ark/main.js
```

5. The record: the phase document's task row and status line. Then the parts build over every gate, about four minutes; it must name 50 gates and every verdict must be ok, the ark's gate among them at 43 PASS and 0 FAIL.

```sh
python3 - <<'ARK_EOF_5'
ph = "docs/plans/phase-0.1.2-the-findings.md"; s = open(ph, encoding="utf-8").read()
old = "the page's main file down to hookup lines. DISPATCHED. →"
assert s.count(old) == 1, "task row"
s = s.replace(old, "the page's main file down to hookup lines. LANDED, commit stamped below. →")
old2 = "Status: DISPATCHED. Task 1 dispatched."
assert s.count(old2) == 1, "status line"
s = s.replace(old2, "Status: DISPATCHED. Task 1 landed, commit stamped below, 2026-09-09; task 2 is planned next.")
open(ph, "w", encoding="utf-8").write(s)
ARK_EOF_5
grep -c "commit stamped below" docs/plans/phase-0.1.2-the-findings.md
node scripts/parts.mjs --gates all
node -e 'const t=require("./docs/parts/parts.json");const bad=Object.values(t.gates).filter(g=>g.verdict!=="ok").map(g=>g.name);const a=t.gates["gravitys-ark"];console.log(Object.keys(t.gates).length+" gates, "+bad.length+" not ok"+(bad.length?": "+bad.join(", "):""));console.log("gravitys-ark "+a.pass+" PASS / "+a.fail+" FAIL; "+a.seeds);process.exit(bad.length||a.pass!==43?1:0)'
```

Required: `2`, a count line naming 50 gates, `50 gates, 0 not ok`, `gravitys-ark 43 PASS / 0 FAIL;` with its seeds.

6. Commit and push the landing, then stamp the real hash into the status line and the task row in a second small commit. Never amend after stamping.

```sh
git add docs/gravitys-ark/index.html docs/gravitys-ark/ground.js docs/gravitys-ark/main.js docs/parts/parts.json docs/parts/parts.html docs/plans
git commit -m "phase 0.1.2 task 1 — the ground's layout: the space panes hide on the ground, the numbers at the top left, the buttons in three rows above the fixed cluster, the log and the stick above them

The screen file owns the layout by one mark on the page's body; the main file keeps the hookup lines.
No gate reads the page's files; the parts build over 50 gates, every verdict ok; the ark's gate 43 PASS / 0 FAIL.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01QSq3kZC3Bk9SC5RwnqYUfs"
git push origin main
H=$(git rev-parse --short HEAD)
sed -i "s/commit stamped below/commit \`$H\`/g" docs/plans/phase-0.1.2-the-findings.md
git add docs/plans && git commit -m "phase 0.1.2 task 1 row stamped — $H

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01QSq3kZC3Bk9SC5RwnqYUfs"
git push origin main
```

## Acceptance

- Step 1: `0`, three OK lines.
- Steps 2 through 4: three OK lines, `syntax ok` twice.
- Step 5: `2`; the count line names 50 gates; `50 gates, 0 not ok`; `gravitys-ark 43 PASS / 0 FAIL;` with its seeds.
- Step 6: push accepted by origin; the stamp commit pushed.

After the landing the orchestrator republishes the page from `docs/parts/parts.html` to its fixed address and names it, with the game's address, in the landing report.

## Report

Read-confirmation first, then one line of outcome, then bullets: every OK line; the parts build's count line and the verdict line verbatim; the ark's gate line verbatim; both commit hashes; the push results. Every nonconformity its own labeled bullet. Fixture seeds: the gravitys-ark seeds from step 5's line; no seed is special.
