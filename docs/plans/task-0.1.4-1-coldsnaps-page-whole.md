# Task 0.1.4-1 — coldsnap's page whole

One job: coldsnap's page, whole, built here and served from `docs/coldsnap/`, unchanged. Its 36 page files come over from the checkout by hash at their own paths; its shell and its page maker's setting come over with four substitutions; its page maker is installed and run; a gate holds the laws over the built page. Every copy is checked by hash; write exactly what is written, run what is listed, report. You design nothing.

Suggested model: Sonnet 5.

Required reading, in order (confirm at the top of your report):
1. This file, whole.
2. `docs/plans/phase-0.1.4-the-two-games-whole.md`, whole.

The checkout at `/home/batman/coldsnap` is read only: files are copied out of it and hashed; nothing in it is written, run, or committed. No demo file is read or written.

## Inventory

Thirty-six files, verbatim, at the checkout's own paths, with their hashes at the checkout's commit `111b9cb`:

```
be82647f1df31917 src/demo/coldsnap-proving-grounds.jsx
64ab7dafc37ecc9a src/depot/Crate.jsx
31f91d405049601a src/depot/DepotGame.jsx
59e378b93c58aebe src/depot/Dispatch.jsx
c70ba50ee000d891 src/depot/DraftScreen.jsx
6b6249de4e7b0df2 src/depot/InfoCard.jsx
5a226e05e007f92d src/depot/pies.jsx
6ebda69ac1b4f212 src/depot/RadialMenu.jsx
3f14106081a7e7f4 src/game/ColdsnapTD.jsx
e9ab5d8f8991b67d src/game/MechRange.jsx
fd7ae426141c4625 src/game/predicate.js
eeecc237e8b33570 src/game/runner/trials.js
14d471695ebd3573 src/game/runner/Typed.jsx
a522d372653db308 src/game/scenario.js
1e3ea3813f7eb676 src/game/scenarios/ac-01-interdiction.json
672a3a21c397338d src/game/scenarios/ac-01-plate.json
43c30aefcce33b59 src/game/scenarios/ac-02-battery.json
baf2fb4720f55b24 src/game/scenarios/ac-03-route.json
7b1dd2f79ea7b384 src/game/scenarios/ac-04-crossing.json
a85b90723db356d3 src/game/scenarios/ac-05-steading.json
1d7ff65b7d204874 src/game/scenarios/ac-06-halt.json
b339852e094d707b src/game/scenarios/ac-07-village.json
c3cfc769ff3ccd68 src/game/scenarios/ac-08-sheet.json
f418f41ac0920bc0 src/game/scenarios/proving-grounds.json
a5432e86337f7de9 src/main.jsx
42740bce562580ed src/render/portrait.js
362bc294a1e2443b src/render/renderer.js
46dcaf28c5c679b6 src/render/troopkit.js
cef0ed7b05aa1260 src/ui/App.jsx
3d2272c31711f1bb src/ui/Controls.jsx
ed0688d6dd4c3cad src/ui/DemosScreen.jsx
593d78bb171e6358 src/ui/Roadmap.jsx
62ca7fcb05308abf src/ui/SoundBoard.jsx
9f24e30ea77b054c src/ui/soundboard-legacy-audio.js
160f2c766918114e src/ui/StartScreen.jsx
3bebdf5aad21027d src/ui/startview.js
```

## Substitution table

The page's shell and its page maker's setting come over from the checkout's `index.html` and `vite.config.js`, and only these four things differ:

1. The shell moves to `app/coldsnap/index.html`, and its entry line `src="/src/main.jsx"` becomes `src="../../src/main.jsx"`, the same file from the shell's new place.
2. The setting gains `root: "app/coldsnap",` so the page maker starts at the shell.
3. Its `base: "/coldsnap/"` becomes `base: "/combo-engine/docs/coldsnap/"`, this site's path.
4. Its build gains `outDir: "../../docs/coldsnap",` and `emptyOutDir: true,` so the built page lands in `docs/coldsnap/`.

The page maker's own packages, the checkout's own list at the same versions, join this repository's package file: react and react-dom as dependencies; @vitejs/plugin-react, terser, and vite as development dependencies; a script `build:coldsnap` that runs `vite build`.

## Steps

Run from `/home/batman/combo-engine`. A failed assert, a wrong required value, or a FAILED hash line stops the task: report the step and its verbatim output, run nothing further. Never edit a file to make a hash match.

1. Assert the ground: the tracked files clean at phase 0.1.3's landing, the checkout at its commit, the three files this task edits at their landed hashes, every destination absent.

```sh
git status --short | grep -v "^??" | wc -l
git -C /home/batman/coldsnap rev-parse --short HEAD
while read -r hash path; do test "$(sha256sum "$path" | cut -c1-16)" = "$hash" && echo "OK $path" || echo "FAILED $path"; done <<'GROUND'
5cc5cba56c64a939 package.json
162dd125f744fff4 scripts/gate.mjs
48deabcbcf8d792d README.md
GROUND
n=0; for p in src/demo/coldsnap-proving-grounds.jsx src/depot/Crate.jsx src/depot/DepotGame.jsx src/depot/Dispatch.jsx src/depot/DraftScreen.jsx src/depot/InfoCard.jsx src/depot/pies.jsx src/depot/RadialMenu.jsx src/game/ColdsnapTD.jsx src/game/MechRange.jsx src/game/predicate.js src/game/runner/trials.js src/game/runner/Typed.jsx src/game/scenario.js src/game/scenarios/proving-grounds.json src/main.jsx src/render/renderer.js src/ui/App.jsx app/coldsnap/index.html vite.config.js docs/coldsnap/index.html scripts/pages-test.mjs; do [ -e "$p" ] || n=$((n+1)); done; echo "absent $n"
```

Required: `0`, `111b9cb`, three OK lines, `absent 22`.

2. The 36 files, copied out of the checkout to their own paths and checked by hash. Every line must print OK.

```sh
while read -r hash path; do mkdir -p "$(dirname "$path")"; cp "/home/batman/coldsnap/$path" "$path"; test "$(sha256sum "$path" | cut -c1-16)" = "$hash" && echo "OK $path" || echo "FAILED $path"; done <<'INVENTORY'
be82647f1df31917 src/demo/coldsnap-proving-grounds.jsx
64ab7dafc37ecc9a src/depot/Crate.jsx
31f91d405049601a src/depot/DepotGame.jsx
59e378b93c58aebe src/depot/Dispatch.jsx
c70ba50ee000d891 src/depot/DraftScreen.jsx
6b6249de4e7b0df2 src/depot/InfoCard.jsx
5a226e05e007f92d src/depot/pies.jsx
6ebda69ac1b4f212 src/depot/RadialMenu.jsx
3f14106081a7e7f4 src/game/ColdsnapTD.jsx
e9ab5d8f8991b67d src/game/MechRange.jsx
fd7ae426141c4625 src/game/predicate.js
eeecc237e8b33570 src/game/runner/trials.js
14d471695ebd3573 src/game/runner/Typed.jsx
a522d372653db308 src/game/scenario.js
1e3ea3813f7eb676 src/game/scenarios/ac-01-interdiction.json
672a3a21c397338d src/game/scenarios/ac-01-plate.json
43c30aefcce33b59 src/game/scenarios/ac-02-battery.json
baf2fb4720f55b24 src/game/scenarios/ac-03-route.json
7b1dd2f79ea7b384 src/game/scenarios/ac-04-crossing.json
a85b90723db356d3 src/game/scenarios/ac-05-steading.json
1d7ff65b7d204874 src/game/scenarios/ac-06-halt.json
b339852e094d707b src/game/scenarios/ac-07-village.json
c3cfc769ff3ccd68 src/game/scenarios/ac-08-sheet.json
f418f41ac0920bc0 src/game/scenarios/proving-grounds.json
a5432e86337f7de9 src/main.jsx
42740bce562580ed src/render/portrait.js
362bc294a1e2443b src/render/renderer.js
46dcaf28c5c679b6 src/render/troopkit.js
cef0ed7b05aa1260 src/ui/App.jsx
3d2272c31711f1bb src/ui/Controls.jsx
ed0688d6dd4c3cad src/ui/DemosScreen.jsx
593d78bb171e6358 src/ui/Roadmap.jsx
62ca7fcb05308abf src/ui/SoundBoard.jsx
9f24e30ea77b054c src/ui/soundboard-legacy-audio.js
160f2c766918114e src/ui/StartScreen.jsx
3bebdf5aad21027d src/ui/startview.js
INVENTORY
```

Required: 36 OK lines.

3. The shell and the page maker's setting, copied out of the checkout and given the four substitutions. Both hash lines must print OK.

```sh
mkdir -p app/coldsnap && cp /home/batman/coldsnap/index.html app/coldsnap/index.html && cp /home/batman/coldsnap/vite.config.js vite.config.js
test "$(sha256sum app/coldsnap/index.html | cut -c1-16)" = "c4a3ceb518c3a211" && echo OK shell copied || echo FAILED shell copied
test "$(sha256sum vite.config.js | cut -c1-16)" = "357792728971c34c" && echo OK setting copied || echo FAILED setting copied
python3 - <<'ARK_EOF_3'
def edit(p, reps):
    s = open(p, encoding="utf-8").read()
    for old, new in reps:
        assert s.count(old) == 1, (p, old[:70])
        s = s.replace(old, new)
    open(p, "w", encoding="utf-8").write(s)
edit("app/coldsnap/index.html", [('<script type="module" src="/src/main.jsx"></script>', '<script type="module" src="../../src/main.jsx"></script>')])
edit("vite.config.js", [
('// Served at https://jeffreycoen.github.io/coldsnap/\nexport default defineConfig({\n  base: "/coldsnap/",\n', '// Served at https://jeffreycoen.github.io/combo-engine/docs/coldsnap/ (phase 0.1.4: the page whole, built here; root, base, and the output are the substitutions)\nexport default defineConfig({\n  root: "app/coldsnap",\n  base: "/combo-engine/docs/coldsnap/",\n'),
('  build: {\n    minify: "terser",', '  build: {\n    outDir: "../../docs/coldsnap",\n    emptyOutDir: true,\n    minify: "terser",'),
])
ARK_EOF_3
node --check vite.config.js && echo "syntax ok setting"
test "$(sha256sum app/coldsnap/index.html | cut -c1-16)" = "6defa117039bb2e6" && echo OK app/coldsnap/index.html || echo FAILED app/coldsnap/index.html
test "$(sha256sum vite.config.js | cut -c1-16)" = "0274143431e93e2b" && echo OK vite.config.js || echo FAILED vite.config.js
```

Required: four OK lines, `syntax ok setting`.

4. The page maker's packages join the package file, and are installed. The hash line must print OK; the install must end without an error line.

```sh
python3 - <<'ARK_EOF_4'
import json
p = "package.json"; d = json.load(open(p, encoding="utf-8"))
d["dependencies"] = { "react": "^18.3.1", "react-dom": "^18.3.1", "three": "0.128.0" }
d["devDependencies"] = { "@vitejs/plugin-react": "^4.3.4", "terser": "^5.51.0", "vite": "^6.3.5" }
d.setdefault("scripts", {})["build:coldsnap"] = "vite build"
open(p, "w", encoding="utf-8").write(json.dumps(d, indent=2) + "\n")
ARK_EOF_4
test "$(sha256sum package.json | cut -c1-16)" = "0ecb73ed1703cde0" && echo OK package.json || echo FAILED package.json
npm install --no-audit --no-fund 2>&1 | tail -3
ls node_modules/react/package.json node_modules/vite/package.json node_modules/@vitejs/plugin-react/package.json node_modules/terser/package.json | wc -l
```

Required: `OK package.json`, no line starting with `npm ERR`, `4`.

5. The build. It must exit 0 and write the page and its one script. Coldsnap's own build writes one asset file and no stylesheet, since none of its page files carries one.

```sh
npx vite build 2>&1 | tail -6
ls docs/coldsnap/index.html && ls docs/coldsnap/assets | head -5 && ls docs/coldsnap/assets | wc -l
```

Required: a `built in` line from the page maker, `docs/coldsnap/index.html`, one asset listed, its name `index-` then letters and digits then `.js`, a count of `1`.

6. The gate over the pages, written exactly, registered, and run. It must print 3 PASS lines, then `pages-test: 3 PASS / 0 FAIL`, then `pages-test PASS`.

```sh
cat > scripts/pages-test.mjs <<'ARK_PAGES_EOF'
// COMBO-ENGINE — pages-test: laws over the two games served whole (phase 0.1.4).
// Coldsnap's page is built here from its own files by its own page maker and
// served from docs/coldsnap; every one of its page files stands at its own path.
// Seedless arithmetic.
import fs from "node:fs";
let pass = 0, fail = 0;
const check = (n, ok) => { if (ok) { pass++; console.log("PASS " + n); } else { fail++; console.log("FAIL " + n); } };
console.log("seeds {} — seedless arithmetic");
const read = (p) => (fs.existsSync(p) ? fs.readFileSync(p, "utf8") : "");
const PAGE_FILES = ["src/main.jsx", "src/ui/App.jsx", "src/ui/StartScreen.jsx", "src/ui/Controls.jsx", "src/depot/DepotGame.jsx", "src/depot/DraftScreen.jsx", "src/depot/Dispatch.jsx", "src/depot/InfoCard.jsx", "src/depot/Crate.jsx", "src/depot/RadialMenu.jsx", "src/depot/pies.jsx", "src/game/ColdsnapTD.jsx", "src/game/MechRange.jsx", "src/game/scenario.js", "src/render/renderer.js"];
check("pages: coldsnap's page files stand at their own paths, the war page and its panels among them", PAGE_FILES.every((p) => fs.existsSync(p)));
const shell = read("app/coldsnap/index.html"), cfg = read("vite.config.js");
check("pages: the page's shell loads coldsnap's own entry and the page maker builds it under the site's path into docs/coldsnap",
  shell.includes('src="../../src/main.jsx"') && cfg.includes('root: "app/coldsnap"') && cfg.includes('base: "/combo-engine/docs/coldsnap/"') && cfg.includes('outDir: "../../docs/coldsnap"'));
const built = read("docs/coldsnap/index.html");
const scripts = [...built.matchAll(/<script[^>]+src="([^"]+)"/g)].map((m) => m[1]);
check("pages: the built page exists and loads its built script from the site's path", built.length > 0 && scripts.length > 0 && scripts.every((s) => s.startsWith("/combo-engine/docs/coldsnap/assets/") && fs.existsSync("docs/coldsnap/assets/" + s.split("/assets/")[1])));
console.log(`pages-test: ${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
console.log("pages-test PASS");
ARK_PAGES_EOF
test "$(sha256sum scripts/pages-test.mjs | cut -c1-16)" = "49c7e9af89138acc" && echo OK scripts/pages-test.mjs || echo FAILED scripts/pages-test.mjs
python3 - <<'ARK_EOF_6'
def edit(p, reps):
    s = open(p, encoding="utf-8").read()
    for old, new in reps:
        assert s.count(old) == 1, (p, old[:70])
        s = s.replace(old, new)
    open(p, "w", encoding="utf-8").write(s)
edit("scripts/gate.mjs", [('  "parts": ["scripts/parts-test.mjs"],\n', '  "pages": ["scripts/pages-test.mjs"],\n  "parts": ["scripts/parts-test.mjs"],\n')])
edit("README.md", [("The deadweight hangar demo rides in the tree as read-only source.", "The deadweight hangar demo rides in the tree as read-only source. Coldsnap's own page stands whole at `docs/coldsnap/`, its 36 page files at their own paths and built here by its own page maker, phase 0.1.4; the ark's own screens are set aside for the bridge between the two games.")])
ARK_EOF_6
test "$(sha256sum scripts/gate.mjs | cut -c1-16)" = "10f43f79fa04ab58" && echo OK scripts/gate.mjs || echo FAILED scripts/gate.mjs
test "$(sha256sum README.md | cut -c1-16)" = "2bbfabb8beecdd10" && echo OK README.md || echo FAILED README.md
node scripts/gate.mjs pages
```

Required: three OK lines, then the gate's 3 PASS lines, `pages-test: 3 PASS / 0 FAIL`, `pages-test PASS`.

7. The record: the phase document's task row and status line. Then the parts build over every gate, about five minutes; it must name 51 gates and every verdict must be ok. Its coldsnap rows are the checkout's 84 files at its commit, whatever stands here; what moves is their state: the 36 copied files read current, and none reads absent.

```sh
python3 - <<'ARK_EOF_7'
ph = "docs/plans/phase-0.1.4-the-two-games-whole.md"; s = open(ph, encoding="utf-8").read()
old = "the build into `docs/coldsnap/`, a gate over it. DISPATCHED. →"
assert s.count(old) == 1, "task row"
s = s.replace(old, "the build into `docs/coldsnap/`, a gate over it. LANDED, commit stamped below. →")
old2 = "Status: DISPATCHED. Task 1 dispatched."
assert s.count(old2) == 1, "status line"
s = s.replace(old2, "Status: DISPATCHED. Task 1 landed, commit stamped below, 2026-09-09; task 2 is planned next.")
open(ph, "w", encoding="utf-8").write(s)
ARK_EOF_7
grep -c "commit stamped below" docs/plans/phase-0.1.4-the-two-games-whole.md
node scripts/parts.mjs --gates all
node -e 'const t=require("./docs/parts/parts.json");const bad=Object.values(t.gates).filter(g=>g.verdict!=="ok").map(g=>g.name);console.log(Object.keys(t.gates).length+" gates, "+bad.length+" not ok"+(bad.length?": "+bad.join(", "):""));process.exit(bad.length?1:0)'
node -e 'const t=require("./docs/parts/parts.json");const c={};for(const p of t.parts)if(p.source==="coldsnap")c[p.mech.file]=(c[p.mech.file]||0)+1;console.log(Object.keys(c).sort().map(k=>k+" "+c[k]).join(", "))'
```

Required: `2`, a count line naming 51 gates and 84 coldsnap files, `51 gates, 0 not ok`, then `behind 1, current 60, differs 23`.

8. Commit and push the landing, then stamp the real hash into the status line and the task row in a second small commit. Never amend after stamping.

```sh
git add src app vite.config.js package.json package-lock.json docs/coldsnap scripts/pages-test.mjs scripts/gate.mjs README.md docs/parts docs/plans
git commit -m "phase 0.1.4 task 1 — coldsnap's page whole: its 36 page files at their own paths, its shell and page maker with four substitutions, built here into docs/coldsnap

Nothing of coldsnap's page is rewritten; the page maker's packages join the package file.
pages-test 3 PASS / 0 FAIL; the parts build over 51 gates, every verdict ok.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01QSq3kZC3Bk9SC5RwnqYUfs"
git push origin main
H=$(git rev-parse --short HEAD)
sed -i "s/commit stamped below/commit \`$H\`/g" docs/plans/phase-0.1.4-the-two-games-whole.md
git add docs/plans && git commit -m "phase 0.1.4 task 1 row stamped — $H

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01QSq3kZC3Bk9SC5RwnqYUfs"
git push origin main
```

## Acceptance

- Step 1: `0`, `111b9cb`, three OK lines, `absent 22`.
- Step 2: 36 OK lines.
- Step 3: four OK lines, `syntax ok setting`.
- Step 4: `OK package.json`, an install without an `npm ERR` line, `4`.
- Step 5: a `built in` line, the page and its one script, count `1`.
- Step 6: three OK lines, `pages-test: 3 PASS / 0 FAIL`, `pages-test PASS`.
- Step 7: `2`; the count line names 51 gates and 84 coldsnap files; `51 gates, 0 not ok`; the states `behind 1, current 60, differs 23`, the 36 copied files current where the record had them absent.
- Step 8: push accepted by origin; the stamp commit pushed.

After the landing the orchestrator republishes the parts page and names it, with the page's address https://jeffreycoen.github.io/combo-engine/docs/coldsnap/, in the landing report.

## Report

Read-confirmation first, then one line of outcome, then bullets: every OK line's count per step; the build's `built in` line verbatim; the gate's three lines verbatim; the parts build's count line, the verdict line, and the states line verbatim; both commit hashes; the push results. Every nonconformity its own labeled bullet, with the verbatim output. Fixture seeds: none, seedless arithmetic.
