# Task 0.1.1-5 — the hold retires

One job: the ground on coldsnap becomes the page's only ground. The address flag goes; the ark's own hold file, its screen code, its buttons, and its five checks leave; the parts source marks the old hold left behind; the README says the ground and the walker as built; the version goes to 0.1.1; the phase lands. Every edit is an anchored replacement or a marked cut checked by hash; write exactly what is written, run the listed gates, report. You design nothing.

Suggested model: Sonnet 5.

Required reading, in order (confirm at the top of your report):
1. This file, whole.
2. `docs/plans/phase-0.1.1-the-hold.md`, whole.

No demo file is read or written. Nothing under `/home/batman/coldsnap` is read, written, or run.

## Steps

Run from `/home/batman/combo-engine`. A failed assert, a wrong required value, or a FAILED hash line stops the task: report the step and its verbatim output, run nothing further. Never edit a file to make a hash match.

1. Assert the ground: the tracked files clean at task 4's landing, the six files this task edits at their landed hashes, the old hold file present. The gates were recorded green at that landing and are not run again here.

```sh
git status --short | grep -v "^??" | wc -l
while read -r hash path; do test "$(sha256sum "$path" | cut -c1-16)" = "$hash" && echo "OK $path" || echo "FAILED $path"; done <<'GROUND'
4912e2226f41c8ff docs/gravitys-ark/main.js
48b9b50a33048d70 docs/gravitys-ark/index.html
fd6fe591e7de65a6 scripts/gravitys-ark-test.mjs
8f2d68a0a86be011 docs/parts/parts-source.json
051427586e2c156f README.md
135a0b5830485b64 package.json
GROUND
ls src/games/gravitys-ark/hold.js | wc -l
```

Required: `0`, six OK lines, `1`.

2. The main file: the flag goes and the old hold's code with it; the ground is the ground. Every anchor is asserted, every cut runs between two markers that each occur once; syntax check; the hash line must print OK.

```sh
python3 - <<'ARK_EOF_2'
def edit(p, reps):
    s = open(p, encoding="utf-8").read()
    for old, new in reps:
        assert s.count(old) == 1, (p, old[:70])
        s = s.replace(old, new)
    open(p, "w", encoding="utf-8").write(s)
def cut(p, start, end, keep_end=True):
    s = open(p, encoding="utf-8").read()
    assert s.count(start) == 1 and s.count(end) == 1, (p, start[:40], end[:40])
    a = s.index(start); b = s.index(end) + (0 if keep_end else len(end))
    assert a < b
    open(p, "w", encoding="utf-8").write(s[:a] + s[b:])
edit("docs/gravitys-ark/main.js", [
('import { makeHold, order as holdOrder, tick as holdTick, summary as holdSummary } from "../../src/games/gravitys-ark/hold.js";\n', ''),
("// phase 0.0.110's page step: the hold, the ground frames, on the same canvas\nconst holdRng = simStream((seed + 4) >>> 0), OPENING_CRASH = 30;   // the opening: the hull down at 30 m/s on the plague world, the engine off its weld, PROPOSED\nlet hold = null, view = \"space\", fieldTap = null;\n// phase 0.1.1: the ground on coldsnap, behind ?ground=1 until the hold is whole; the old hold stays the default until then\nconst groundOn = q.has(\"ground\");\n",
 "// phase 0.1.1's page step: the ground on coldsnap\nconst OPENING_CRASH = 30;   // the opening: the hull down at 30 m/s on the plague world, the engine off its weld, PROPOSED\nlet view = \"space\";\n"),
('function enterGround(v) { view = "ground"; fieldTap = null; GS.enter(', 'function enterGround(v) { view = "ground"; GS.enter('),
('function enterHold(v) { if (groundOn) { enterGround(v); return; } hold = makeHold(hull, crew, v, holdRng); view = "hold"; fieldTap = null; state.events.push({ k: "on the ground at " + fmt(v, 1) + " m/s", t: state.t }); }\nfunction leaveHold() { view = "space"; hold = null; }\n',
 'function enterHold(v) { enterGround(v); }\n'),
('  if (view === "hold" && hold) { drawHold(); return; }\n', ''),
('  const inHold = view === "hold" && hold; $("btns").style.display = inHold || inGround ? "none" : "grid"; $("holdBtns").style.display = inHold ? "grid" : "none"; $("groundBtns").style.display = inGround ? "grid" : "none"; if (inHold) { holdPane(); $("dock").style.display = "none"; }\n',
 '  $("btns").style.display = inGround ? "none" : "grid"; $("groundBtns").style.display = inGround ? "grid" : "none";\n'),
('cv.addEventListener("pointerup", (e) => { if (dragStart && view === "hold" && Math.hypot(e.clientX - dragStart[0], e.clientY - dragStart[1]) < 12) fieldTap = { x: (e.clientX - W() / 2) / FIELD_PX, y: (e.clientY - H() / 2) / FIELD_PX }; dragStart = null; });\n',
 'cv.addEventListener("pointerup", () => { dragStart = null; });\n'),
('      if (view === "hold" && hold) holdStep(); stepStations(S, DT); ship.dry = hullMass();\n', '      stepStations(S, DT); ship.dry = hullMass();\n'),
('  $("dock").style.display = sid && view !== "hold" && view !== "ground" ? "block" : "none";\n  if (!sid || view === "hold" || view === "ground") return;\n',
 '  $("dock").style.display = sid && view !== "ground" ? "block" : "none";\n  if (!sid || view === "ground") return;\n'),
])
cut("docs/gravitys-ark/main.js", "// the hold's screen: a flat field top-down, four pixels a metre, the bridge at the centre\n", '$("gTakeoff").onclick = ')
cut("docs/gravitys-ark/main.js", '$("hTakeoff").onclick = ', "enterHold(OPENING_CRASH);\n")
ARK_EOF_2
node --check docs/gravitys-ark/main.js && echo "syntax ok main.js"
test "$(sha256sum docs/gravitys-ark/main.js | cut -c1-16)" = "25d2719324fb636e" && echo OK docs/gravitys-ark/main.js || echo FAILED docs/gravitys-ark/main.js
```

3. The page's markup: the old hold's buttons leave. The hash line must print OK.

```sh
python3 - <<'ARK_EOF_3'
p = "docs/gravitys-ark/index.html"; s = open(p, encoding="utf-8").read()
assert s.count('<div id="holdBtns"') == 1, "hold buttons"
a = s.index('<div id="holdBtns"'); b = s.index("\n", a) + 1
open(p, "w", encoding="utf-8").write(s[:a] + s[b:])
ARK_EOF_3
test "$(sha256sum docs/gravitys-ark/index.html | cut -c1-16)" = "1d9b9541e06dd9fe" && echo OK docs/gravitys-ark/index.html || echo FAILED docs/gravitys-ark/index.html
```

4. The ark's gate: the old hold's import, its fixtures, and its five checks leave. Syntax check; the hash line must print OK.

```sh
python3 - <<'ARK_EOF_4'
p = "scripts/gravitys-ark-test.mjs"; s = open(p, encoding="utf-8").read()
old = 'import { makeHold, order, tick, summary, crashLoads, HOLD_DIALS } from "../src/games/gravitys-ark/hold.js";\n'
assert s.count(old) == 1, "hold import"
s = s.replace(old, "")
start = "// the hold's fixtures: the starter hull, a crew of three, a hold at a speed v from the run's stream\n"
end = 'check("ark: twin holds from one rolled seed agree", run() === run());\n}\n'
assert s.count(start) == 1 and s.count(end) == 1, "hold block markers"
a = s.index(start); b = s.index(end) + len(end)
assert a < b
open(p, "w", encoding="utf-8").write(s[:a] + s[b:])
ARK_EOF_4
node --check scripts/gravitys-ark-test.mjs && echo "syntax ok gate"
test "$(sha256sum scripts/gravitys-ark-test.mjs | cut -c1-16)" = "166ce2f81c17875d" && echo OK scripts/gravitys-ark-test.mjs || echo FAILED scripts/gravitys-ark-test.mjs
```

5. The old hold file leaves the repository.

```sh
git rm -q src/games/gravitys-ark/hold.js
ls src/games/gravitys-ark/hold.js 2>/dev/null | wc -l
```

Required: `0`.

6. The records that ride the landing: the parts source marks the old hold left behind; the README says the ground and the walker as built; the version to 0.1.1. The three hash lines must print OK.

```sh
python3 - <<'ARK_EOF_6'
import json
def edit(p, reps):
    s = open(p, encoding="utf-8").read()
    for old, new in reps:
        assert s.count(old) == 1, (p, old[:70])
        s = s.replace(old, new)
    open(p, "w", encoding="utf-8").write(s)
edit("docs/parts/parts-source.json", [
('   "name": "hold",\n   "does": "The flat field: waves, claws, repair, walls and guns, the mast, the boss; the ground moves to coldsnap.",\n   "files": [\n    "src/games/gravitys-ark/hold.js"\n   ],\n   "gate": "gravitys-ark",\n   "phase": "0.0.110",\n',
 '   "name": "hold",\n   "does": "The flat field of batch-ark-1, retired in 0.1.1: the ground runs on coldsnap.",\n   "files": [],\n   "phase": "0.0.110",\n'),
('   "plan": "retire"\n  },\n  {\n   "id": "ark-walker-scale",', '   "plan": "leave"\n  },\n  {\n   "id": "ark-walker-scale",'),
])
json.loads(open("docs/parts/parts-source.json", encoding="utf-8").read())
edit("README.md", [
("- **The ground:** the game opens on the crash world with the hull on broken welds and the walker dead; the Grip step out of the ring in waves that never stop; she fights or she fixes, never both; walls and guns in scrap; the mast's lob; the boss walker; TAKE OFF needs every surviving module welded.\n- **The ground on coldsnap (phase 0.1.1, in progress; behind `?ground=1` in the address until the hold is whole):** the crash world is one of coldsnap's own war maps, made from the galaxy's seed, and the war on it is coldsnap's whole: its attacker with its brain, its books, and its bell, its guns placed by its build law on held ground, its drawing and its sound. The hold's scrap is the one purse, ten kilograms to one of coldsnap's scrap; what is left comes back up at TAKE OFF. The hull, her, the hands, and the walker come in the phase's later tasks.\n- **The walker at scale:** a scale option across the rig, the balance controller, and the leg lengths with one scaling law, proven at rolled scales; at the ruled scale 0.607 the stance does not hold by the law (a foot leaves the ground at 7.42 s, zero breaks), so her walker ships at trooper scale, marked.\n",
 "- **The ground (0.1.1):** the game opens on the crash world, one of coldsnap's own war maps made from the galaxy's seed, and the war on it is coldsnap's whole: its attacker with its brain, its books, and its bell; its guns by its build law on held ground; its drawing and its sound. The hull's modules stand as coldsnap masonry on the ship's own welds, and the weld-stress rule at the arrival speed says which broke; a loose module slides. She is a trooper of her own row and the hands are riflemen by name; FIX walks her to the nearest loose module and her seconds run down within reach; WALL lays coldsnap's build line by her hands; FIGHT is her sidearm, or the walker when it stands. The hold's scrap is the one purse, ten kilograms to one of coldsnap's; TAKE OFF needs every living module welded to the bridge and hands the purse back; the bridge lost is ABANDON SHIP.\n- **The walker (0.1.1):** coldsnap's own mech at its own scale, 5.4 m, two and a half troopers, wrecked at the crash until REPAIR WALKER sends her to it; then hers to take through coldsnap's possession door, the stick to walk it, FIRE its gun, HOLD to give it back. The scaled walker of 0.0.111 stays on its bench as a module.\n"),
])
edit("package.json", [('"version": "0.1.0"', '"version": "0.1.1"')])
ARK_EOF_6
test "$(sha256sum docs/parts/parts-source.json | cut -c1-16)" = "ba01e9d8b8930d9a" && echo OK docs/parts/parts-source.json || echo FAILED docs/parts/parts-source.json
test "$(sha256sum README.md | cut -c1-16)" = "1b39828aab751a0b" && echo OK README.md || echo FAILED README.md
test "$(sha256sum package.json | cut -c1-16)" = "6584836d9d10ff75" && echo OK package.json || echo FAILED package.json
```

7. Run the three gates that read what changed. The ark's gate must print 43 PASS lines, five fewer than task 4's 48, then `gravitys-ark-test: 43 PASS / 0 FAIL`, then `gravitys-ark-test PASS`; the other two must end in their PASS lines. Any FAIL stops the task here.

```sh
node scripts/gate.mjs gravitys-ark > /tmp/ark-gate.txt; tail -3 /tmp/ark-gate.txt; grep -m1 '^seeds' /tmp/ark-gate.txt
node scripts/gate.mjs manifest | tail -1
node scripts/gate.mjs parts | tail -1
```

8. The phase lands: its status line and the task row. Then the parts build over every gate, about four minutes; it must name 50 gates and every verdict must be ok.

```sh
python3 - <<'ARK_EOF_8'
import re
ph = "docs/plans/phase-0.1.1-the-hold.md"; s = open(ph, encoding="utf-8").read()
assert len(re.findall(r"^Status: (?:PLANNED|SERVED|APPROVED|DISPATCHED)\b[^\n]*$", s, re.M)) == 1, "phase status anchor"
s = re.sub(r"^Status: (?:PLANNED|SERVED|APPROVED|DISPATCHED)\b[^\n]*$", "Status: LANDED, commit stamped below, 2026-09-09. Five tasks landed; the ark's gate 43 PASS / 0 FAIL; the parts build 50 gates, every verdict ok.", s, count=1, flags=re.M)
old = "the version to 0.1.1. DISPATCHED. →"
assert s.count(old) == 1, "task row"
s = s.replace(old, "the version to 0.1.1. LANDED, commit stamped below. →")
open(ph, "w", encoding="utf-8").write(s)
ARK_EOF_8
grep -c '^Status: LANDED' docs/plans/phase-0.1.1-the-hold.md
node scripts/parts.mjs --gates all
node -e 'const t=require("./docs/parts/parts.json");const bad=Object.values(t.gates).filter(g=>g.verdict!=="ok").map(g=>g.name);console.log(Object.keys(t.gates).length+" gates, "+bad.length+" not ok"+(bad.length?": "+bad.join(", "):""));process.exit(bad.length?1:0)'
```

Required: `1`, a count line naming 50 gates, `50 gates, 0 not ok`.

9. Commit and push the landing, then stamp the real hash into the status line and the task row in a second small commit. Never amend after stamping.

```sh
git add -A src/games/gravitys-ark docs/gravitys-ark/index.html docs/gravitys-ark/main.js scripts/gravitys-ark-test.mjs docs/parts README.md package.json docs/plans
git commit -m "phase 0.1.1 — the hold on coldsnap: the ground is the ground, the old hold retires, the version to 0.1.1

The flag and the ark's own hold leave; the README says the ground and the walker as built; the parts source marks the hold left behind.
gravitys-ark-test 43 PASS / 0 FAIL; manifest and parts green; the parts build over 50 gates, every verdict ok.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01QSq3kZC3Bk9SC5RwnqYUfs"
git push origin main
H=$(git rev-parse --short HEAD)
sed -i "s/commit stamped below/commit \`$H\`/g" docs/plans/phase-0.1.1-the-hold.md
git add docs/plans && git commit -m "phase 0.1.1 record stamped — $H

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01QSq3kZC3Bk9SC5RwnqYUfs"
git push origin main
```

## Acceptance

- Step 1: `0`, six OK lines, `1`.
- Steps 2 through 4: three OK lines, `syntax ok` twice.
- Step 5: `0`.
- Step 6: three OK lines.
- Step 7: `gravitys-ark-test: 43 PASS / 0 FAIL`, `gravitys-ark-test PASS`, a seeds line, `manifest-test PASS`, `parts-test PASS`.
- Step 8: `1`; the count line names 50 gates; `50 gates, 0 not ok`.
- Step 9: push accepted by origin; the stamp commit pushed.

After the landing the orchestrator republishes the page from `docs/parts/parts.html` to its fixed address and names it, with the game's address, in the landing report.

## Report

Read-confirmation first, then one line of outcome, then bullets: step 7's lines verbatim; every OK line; the parts build's count line and the verdict line verbatim; both commit hashes; the push results. Every nonconformity its own labeled bullet. Fixture seeds: the seeds line the ark's gate printed in step 7, and the gravitys-ark seeds line from `docs/parts/parts.json` after the build; no seed is special.
