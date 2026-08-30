# Task 0.0.18-1.5 — the camera obeys the hand: pinch zooms, twist and keys rotate

One job: rewire the FROSTLINE page's input so the camera can zoom and rotate on phone and on desktop, using renderer surfaces already in the tree. Two files change, both pages: `docs/frostline/index.html` and `docs/frostline/main.js`. No engine file, no game module, no gate file moves. Every edit below is exact; the final file hashes are the acceptance. You design nothing.

This document lives at `docs/plans/task-0.0.18-1.5-camera.md` when the task lands.

## Required reading, verified in the tree

1. This document, whole.
2. `docs/frostline/main.js` — the file you edit, whole (195 lines today).
3. `docs/frostline/index.html` — the file you edit, whole (60 lines today).
4. `src/graphics/renderer.js` lines 556–594 only — the yaw state, `rotateStep`, `rotateBy`; the basis vectors mutate in place, so `screenToWorld` and tap-picking follow rotation with no page work.

Your report opens with a read-confirmation naming these four items.

## What changes and why

- Today the page zooms only by mouse wheel and never rotates. The renderer already exports `setZoom`, `rotateStep` (90° steps, eased), and `rotateBy` (free twist). This task wires them: pinch zooms, two-finger twist rotates, Q and E step-rotate, and two on-screen buttons step-rotate for phone and mouse alike.
- Orders move from finger-down to finger-up. Today a confirmation pops the moment a finger lands, so the first finger of a pinch would pop a move order. After this task a tap is down-and-up under 9 pixels with no second finger; two fingers are always the camera and never an order.

## Steps

**Step 1 — the gate is green before anything moves.** Run `node scripts/gate.mjs frostline`. It must print 16 PASS lines, then `frostline-test: 16 PASS / 0 FAIL`, then `frostline-test PASS`, exit 0. Any other result stops the task.

**Step 2 — the rotate buttons enter the page.** In `docs/frostline/index.html`, make exactly these two insertions.

After the line:

```
  .chip.sel { border-color: #6fbf73; color: #a9e0ac; }
```

insert:

```
  #camBtns { position: fixed; left: 12px; top: max(48px, calc(env(safe-area-inset-top) + 38px)); display: flex; gap: 6px; }
  #camBtns button { width: 44px; height: 44px; border-radius: 10px; border: 1.5px solid rgba(233,237,242,.4);
    background: rgba(13,17,23,.55); color: #e9edf2; font: 600 18px system-ui, sans-serif; }
```

After the line:

```
<div id="banner">PAUSED</div>
```

insert:

```
<div id="camBtns"><button id="rotL">⟲</button><button id="rotR">⟳</button></div>
```

**Step 3 — the gesture layer replaces the tap handler.** In `docs/frostline/main.js`, replace the opening of the canvas pointer handler. The three lines:

```js
canvas.addEventListener("pointerdown", (e) => {
  if (over || pending) return;
  const w = screenToWorld(e.clientX, e.clientY);
```

become:

```js
// ---- gestures: a tap orders; two fingers are the camera (pinch zooms,
// twist rotates) and never order. A tap is down-and-up under 9 px with no
// second finger; orders moved from pointerdown to the release so the first
// finger of a pinch never pops a confirmation.
const clampZoom = (z) => Math.max(0.5, Math.min(2.6, z));
const ptrs = new Map();
let gesture = false, tapStart = null, pinchD = 0, twistA = 0;
canvas.addEventListener("pointerdown", (e) => {
  ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (ptrs.size === 2) {
    gesture = true; tapStart = null;
    const [a, b] = [...ptrs.values()];
    pinchD = Math.hypot(b.x - a.x, b.y - a.y);
    twistA = Math.atan2(b.y - a.y, b.x - a.x);
  } else if (ptrs.size === 1) tapStart = { id: e.pointerId, x: e.clientX, y: e.clientY };
});
canvas.addEventListener("pointermove", (e) => {
  const p = ptrs.get(e.pointerId);
  if (!p) return;
  p.x = e.clientX; p.y = e.clientY;
  if (gesture && ptrs.size === 2) {
    const [a, b] = [...ptrs.values()];
    const d = Math.hypot(b.x - a.x, b.y - a.y);
    const ang = Math.atan2(b.y - a.y, b.x - a.x);
    if (pinchD > 0) { zoom = clampZoom(zoom * (d / pinchD)); R.setZoom(zoom); }
    let da = ang - twistA;
    if (da > Math.PI) da -= 2 * Math.PI;
    if (da < -Math.PI) da += 2 * Math.PI;
    R.rotateBy(-da);
    pinchD = d; twistA = ang;
  }
});
canvas.addEventListener("pointerup", (e) => {
  const wasTap = tapStart && tapStart.id === e.pointerId && !gesture &&
    Math.hypot(e.clientX - tapStart.x, e.clientY - tapStart.y) < 9;
  ptrs.delete(e.pointerId);
  if (ptrs.size === 0) gesture = false;
  tapStart = null;
  if (wasTap) tapAt(e.clientX, e.clientY);
});
canvas.addEventListener("pointercancel", (e) => { ptrs.delete(e.pointerId); if (ptrs.size === 0) gesture = false; tapStart = null; });
document.getElementById("rotL").addEventListener("click", () => R.rotateStep(1));
document.getElementById("rotR").addEventListener("click", () => R.rotateStep(-1));

function tapAt(cx, cy) {
  if (over || pending) return;
  const w = screenToWorld(cx, cy);
```

The body of the old handler continues unchanged below these lines and becomes the body of `tapAt`.

**Step 4 — the handler closes as a function; the keys learn rotation.** Still in `docs/frostline/main.js`, the block:

```js
  aim = { x: d.x, z: d.z };
});
addEventListener("wheel", (e) => { zoom = Math.max(0.5, Math.min(2.6, zoom + (e.deltaY > 0 ? -0.12 : 0.12))); R.setZoom(zoom); }, { passive: true });
addEventListener("keydown", (e) => { if (e.code === "Tab") { e.preventDefault(); selected = cycleSquad(squads, selected); } });
```

becomes:

```js
  aim = { x: d.x, z: d.z };
}
addEventListener("wheel", (e) => { zoom = clampZoom(zoom + (e.deltaY > 0 ? -0.12 : 0.12)); R.setZoom(zoom); }, { passive: true });
addEventListener("keydown", (e) => {
  if (e.code === "Tab") { e.preventDefault(); selected = cycleSquad(squads, selected); }
  else if (e.code === "KeyQ") R.rotateStep(1);
  else if (e.code === "KeyE") R.rotateStep(-1);
});
```

The `});` closing the old listener becomes `}` closing `tapAt`; nothing else in the block moves.

**Step 5 — file identity.** Run `node --check docs/frostline/main.js` (must print nothing, exit 0), then `wc -c` and `sha256sum` on both files. The numbers must be exactly:

- `docs/frostline/index.html` — 4235 bytes, sha256 `100a75757c557e423b797d6384f948bc401ca58b1e86cb2cbbb64646a622beea`
- `docs/frostline/main.js` — 12405 bytes, sha256 `79aba36b3e2c8afccf1db3575161587ed226a08e000817e4c9f20228ec42cb80`

A mismatch stops the task: report it, change nothing else.

**Step 6 — the gate is still green.** Run `node scripts/gate.mjs frostline` again. Same required output as step 1: 16 PASS / 0 FAIL, exit 0. (The gate never loads the page; a moved number means the tree was touched beyond this plan — stop and report.)

**Step 7 — browser smoke.** Serve the repository root, then run each block as its own command:

```
python3 -m http.server 8944 >/dev/null 2>&1 &
```

```
timeout 240 chromium --headless=new --no-sandbox --use-angle=swiftshader-webgl --enable-unsafe-swiftshader --virtual-time-budget=90000 --screenshot=/tmp/claude-1000/fl15-smoke.png --window-size=900,600 http://127.0.0.1:8944/docs/frostline/index.html 2>/dev/null
SZ=$(wc -c < /tmp/claude-1000/fl15-smoke.png); echo "smoke bytes $SZ"; test "$SZ" -gt 100000 && echo SMOKE-OK
```

```
timeout 240 chromium --headless=new --no-sandbox --use-angle=swiftshader-webgl --enable-unsafe-swiftshader --virtual-time-budget=90000 --dump-dom http://127.0.0.1:8944/docs/frostline/index.html 2>/dev/null | grep -oE '<div id="hud">[^<]*<br>[^<]*|id="rotL"|id="rotR"'
```

`SMOKE-OK` must print. The grep must print the hud line reading `mk 0.0.18` with a numeric fps, and both `id="rotL"` and `id="rotR"`. Report all lines verbatim, then kill the server. At the trial the smoke measured 349364 bytes and 10 fps under the software renderer; your byte count may differ, the threshold and the hud text may not.

**Step 8 — records and deploy.** Move this document into `docs/plans/task-0.0.18-1.5-camera.md`. In `docs/plans/phase-0.0.18-frostline-1.md`, under `## Tasks`, add after the 0.0.18-1 line:

```
- 0.0.18-1.5 — camera control wired: pinch zoom, twist and Q/E and buttons rotate, orders on release. → `task-0.0.18-1.5-camera.md`
```

Commit both pages and both plan documents with message:

```
task 0.0.18-1.5 — the camera obeys the hand: pinch zooms, twist and keys rotate

Renderer surfaces already in the tree, wired at the page: pinch and wheel zoom,
two-finger twist and Q/E and on-screen buttons rotate; orders confirm on the
finger's release so a pinch never orders. frostline-test: 16 PASS / 0 FAIL.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
```

Push. The push publishes `https://jeffreycoen.github.io/combo-engine/docs/frostline/`; the owner's live check is the acceptance for look and feel — rotation and pinch feel are his alone.

## Known limits, said plainly

- Headless smoke proves the page boots, paints, and carries the buttons; it does not drive a pinch or a twist. Gesture feel is verified only at the owner's live check.
- Tap-picking under rotation rides the renderer's own in-place basis mutation (its stated design); the owner's live check confirms it.
- The 9-pixel tap threshold and the button placement are provisional dials; they move on playtest word.

## Report shape

Read-confirmation first, then one line of outcome, then bullets: both gate count-and-verdict lines verbatim, both wc -c lines, both sha256 lines, the smoke bytes and grep lines verbatim, commit hash, push result, the play URL. Every nonconformity its own labeled bullet. Fixture seed: 3 (MISSION_R1's field); no seed is special.

## Suggested model

Sonnet 5 — every changed line is printed above and the hashes ratify the outcome.
