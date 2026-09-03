# Task 0.0.63-1 — the phone-first page kit

One job: land the phone-first page kit and its gate, byte-for-byte from this plan. Write exactly what is written, run the listed gates, report. You design nothing.

Suggested model: Sonnet 5.

Required reading, in order (confirm at the top of your report):
1. This file, whole.
2. `docs/plans/phase-0.0.63-pagekit.md`, whole.

## Steps

Run from `/home/batman/combo-engine`. A failed assert stops the task; report the step and its verbatim output, run nothing further.

1. Assert the ground:

```sh
node scripts/gate.mjs frostline > /tmp/fl.out 2>&1; tail -1 /tmp/fl.out   # must print: frostline-test PASS
ls src/modules/pagekit/pagekit.js 2>/dev/null || echo absent   # must print: absent
```

2. Write `src/modules/pagekit/pagekit.js`, exactly:

```js
// MODULE: pagekit — the phone-first page kit. Touch hardening (the tap /
// pinch / twist discrimination the FROSTLINE page proved), the safe-area
// layout snippet, and the light and dark theme as one variable set.
// SHAPED: the gesture law is the live page's own, gathered behind one
// maker; the page code becomes a caller. Pure state over a passed-in
// element; no globals, no rng.

// makeGestures(el, on): the one tracker. A tap is down-and-up under 9 px
// with no second finger; two fingers are the camera — pinch scales, twist
// rotates — and never tap. on = { tap(x, y), pinch(factor), twist(rad) }.
export const TAP_SLOP_PX = 9;
export function makeGestures(el, on) {
  const ptrs = new Map();
  let gesture = false, tapStart = null, pinchD = 0, twistA = 0;
  const down = (e) => {
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.size === 2) {
      gesture = true; tapStart = null;
      const [a, b] = [...ptrs.values()];
      pinchD = Math.hypot(b.x - a.x, b.y - a.y);
      twistA = Math.atan2(b.y - a.y, b.x - a.x);
    } else if (ptrs.size === 1) tapStart = { id: e.pointerId, x: e.clientX, y: e.clientY };
  };
  const move = (e) => {
    const p = ptrs.get(e.pointerId);
    if (!p) return;
    p.x = e.clientX; p.y = e.clientY;
    if (gesture && ptrs.size === 2) {
      const [a, b] = [...ptrs.values()];
      const d = Math.hypot(b.x - a.x, b.y - a.y);
      const ang = Math.atan2(b.y - a.y, b.x - a.x);
      if (pinchD > 0 && on.pinch) on.pinch(d / pinchD);
      let da = ang - twistA;
      if (da > Math.PI) da -= 2 * Math.PI;
      if (da < -Math.PI) da += 2 * Math.PI;
      if (on.twist) on.twist(-da);
      pinchD = d; twistA = ang;
    }
  };
  const up = (e) => {
    const wasTap = tapStart && tapStart.id === e.pointerId && !gesture &&
      Math.hypot(e.clientX - tapStart.x, e.clientY - tapStart.y) < TAP_SLOP_PX;
    ptrs.delete(e.pointerId);
    if (ptrs.size === 0) gesture = false;
    tapStart = null;
    if (wasTap && on.tap) on.tap(e.clientX, e.clientY);
  };
  const cancel = (e) => { ptrs.delete(e.pointerId); if (ptrs.size === 0) gesture = false; tapStart = null; };
  el.addEventListener("pointerdown", down);
  el.addEventListener("pointermove", move);
  el.addEventListener("pointerup", up);
  el.addEventListener("pointercancel", cancel);
  return { _handlers: { down, move, up, cancel } }; // exposed for the gate's synthetic pointers
}

// the safe-area layout snippet: the max(...) insets the pages already use
export const SAFE_AREA_CSS = `  .pk-top { top: max(10px, env(safe-area-inset-top)); }
  .pk-bottom { bottom: max(16px, env(safe-area-inset-bottom)); }`;

// the theme: one variable set, two values; a page adopts by using the
// variables and calling applyTheme.
export const THEME_CSS = `  :root { --pk-bg: #0d1117; --pk-ink: #e9edf2; --pk-ink-dim: rgba(233,237,242,.85);
    --pk-accent: #e9b25c; --pk-good: #6fbf73; --pk-panel: rgba(13,17,23,.6); }
  .pk-light { --pk-bg: #f2f4f7; --pk-ink: #1a2230; --pk-ink-dim: rgba(26,34,48,.85);
    --pk-accent: #9a6a12; --pk-good: #2c7a33; --pk-panel: rgba(242,244,247,.75); }`;
export function applyTheme(root, name) {
  root.classList.toggle("pk-light", name === "light");
  return name === "light" ? "light" : "dark";
}
```

Then `sha256sum src/modules/pagekit/pagekit.js` — must print `c3b56ca5fc2ed74203c4cbd8e53bb882cb03741b7fa7048da1be7b14c0d4ae3f`.

3. Write `scripts/pagekit-test.mjs`, exactly:

```js
// COMBO-ENGINE — pagekit-test. The gesture law driven by synthetic
// pointers at rolled positions: a tap under the slop lands, a drag over it
// does not, a second finger kills the tap and drives pinch and twist by
// exact arithmetic. The theme toggles a class and answers its name.
import { makeGestures, applyTheme, TAP_SLOP_PX, SAFE_AREA_CSS, THEME_CSS } from "../src/modules/pagekit/pagekit.js";
let pass = 0, fail = 0;
const check = (n, ok) => { if (ok) { pass++; console.log("PASS " + n); } else { fail++; console.log("FAIL " + n); } };
const SEED = process.env.SEED ? +process.env.SEED : Math.floor(Math.random() * 1e9);
console.log("seeds " + JSON.stringify({ touch: SEED }));
let a = SEED >>> 0;
const rnd = () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const fakeEl = () => ({ addEventListener() {} });
const ev = (id, x, y) => ({ pointerId: id, clientX: x, clientY: y });

{ let taps = 0, lastX = 0;
  const g = makeGestures(fakeEl(), { tap: (x) => { taps++; lastX = x; } })._handlers;
  let ok = true;
  for (let i = 0; i < 300 && ok; i++) {
    taps = 0;
    const x = rnd() * 800, y = rnd() * 600;
    const dx = (rnd() - 0.5) * 2 * (TAP_SLOP_PX - 1e-6);
    g.down(ev(1, x, y)); g.move(ev(1, x + dx, y)); g.up(ev(1, x + dx, y));
    ok = taps === 1 && Math.abs(lastX - (x + dx)) < 1e-9;
  }
  check("pagekit: three hundred rolled taps under the slop all land at their own point", ok); }
{ let taps = 0;
  const g = makeGestures(fakeEl(), { tap: () => taps++ })._handlers;
  g.down(ev(1, 100, 100)); g.move(ev(1, 100 + TAP_SLOP_PX + 1, 100)); g.up(ev(1, 100 + TAP_SLOP_PX + 1, 100));
  check("pagekit: a drag past the slop is no tap", taps === 0); }
{ let taps = 0, pinches = [], twists = [];
  const g = makeGestures(fakeEl(), { tap: () => taps++, pinch: (f) => pinches.push(f), twist: (r) => twists.push(r) })._handlers;
  g.down(ev(1, 100, 100)); g.down(ev(2, 200, 100));
  g.move(ev(2, 300, 100));                       // pinch out: 100 -> 200 apart
  g.move(ev(2, 100, 300));                       // twist a quarter turn
  g.up(ev(1, 100, 100)); g.up(ev(2, 100, 300));
  const f = pinches[0];
  check("pagekit: two fingers never tap; the pinch factor is the distance ratio exactly",
    taps === 0 && Math.abs(f - 2) < 1e-9);
  check("pagekit: the twist hands back the turned angle, sign and wrap correct",
    twists.length === 2 && Math.abs(twists[1] + Math.PI / 2) < 1e-9); }
{ const root = { _c: new Set(), classList: { toggle(c, on) { on ? root._c.add(c) : root._c.delete(c); } } };
  const l = applyTheme(root, "light"), d = applyTheme(root, "dark");
  check("pagekit: the theme toggles the class and answers its name",
    l === "light" && d === "dark" && !root._c.has("pk-light") && THEME_CSS.includes("--pk-bg") && SAFE_AREA_CSS.includes("safe-area-inset")); }

console.log(`pagekit-test: ${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
console.log("pagekit-test PASS");
```

Then `sha256sum scripts/pagekit-test.mjs` — must print `807bc4d34d467a725c94f2cc6f6bd2e3e773f661c0a84dccc659d8255e73ceda`.

4. In `scripts/gate.mjs`, in the GATES table, add one line after the `"receipts"` entry (or after the line the previous api-batch rung added, keeping this batch's entries together):

```js
  "pagekit": ["scripts/pagekit-test.mjs"],
```

5. The page becomes a caller. In `docs/frostline/main.js`, two replacements, each old text appearing exactly once.

Replace:

```js
import { makeBoard, completionPay, doneOf, markJobDone } from "../../src/games/frostline/contracts.js";
```

with

```js
import { makeBoard, completionPay, doneOf, markJobDone } from "../../src/games/frostline/contracts.js";
import { makeGestures } from "../../src/modules/pagekit/pagekit.js";
```

Then replace the whole gesture block — from the line `// ---- gestures: a tap orders; two fingers are the camera (pinch zooms,` down to and including the `pointercancel` listener line (the four canvas listeners and their comment; the two `rotL`/`rotR` button lines below it stay) — with:

```js
// ---- gestures: the page kit's one tracker — a tap orders; two fingers
// are the camera (pinch zooms, twist rotates) and never order. The law
// this page proved lives in the kit now; this page is a caller.
const clampZoom = (z) => Math.max(0.5, Math.min(2.6, z));
makeGestures(canvas, {
  tap: (x, y) => tapAt(x, y),
  pinch: (f) => { zoom = clampZoom(zoom * f); R.setZoom(zoom); },
  twist: (r) => R.rotateBy(r),
});
```

Then `node --check docs/frostline/main.js` — silent. The walk: nothing on any screen changes — same tap, same pinch, same twist, same slop, phone and desktop; the law moved house, the page kept its behavior, and the frostline gate's unchanged tail is the arithmetic witness.

6. Run the new gate — seeds line, 5 PASS lines, `pagekit-test: 5 PASS / 0 FAIL`, `pagekit-test PASS`, exit 0:

```sh
node scripts/gate.mjs pagekit
```

7. Prior gates unmoved: rerun the step-1 frostline command; same tail.

8. Close the records: `package.json` version to `0.0.63`; the phase doc's status line to LANDED as its comment shows; in `docs/plans/batch-api-1.md` flip this rung's box; in `README.md` flip the checklist box starting `- [ ] The phone-first page kit` to `- [x]`, and add the line `- [x] pagekit — the phone-first page kit — 0.0.63` at the bottom of the "Serving checklist items" list.

9. Commit and push, then stamp:

```sh
git add src/modules/pagekit/pagekit.js scripts/pagekit-test.mjs docs/frostline/main.js scripts/gate.mjs package.json README.md docs/plans/phase-0.0.63-pagekit.md docs/plans/task-0.0.63-1-pagekit.md docs/plans/batch-api-1.md
git commit -m "phase 0.0.63 — the phone-first page kit

Gate 5 PASS / 0 FAIL at rolled seeds; frostline unmoved.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push origin main
H=$(git rev-parse --short HEAD)
sed -i "s/commit stamped below/commit \`$H\`/" docs/plans/phase-0.0.63-pagekit.md
git add docs/plans/phase-0.0.63-pagekit.md && git commit -m "phase 0.0.63 record stamped — $H

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push origin main
```

## Acceptance

- Every sha256 above exact; the gate `5 PASS / 0 FAIL` then `pagekit-test PASS`; frostline's tail unchanged; records flipped riding the landing; pushes accepted.

## Report

Read-confirmation first, then one line of outcome, then bullets: the sha256 lines verbatim, the new gate's seeds/count/verdict lines, the frostline tail, both commit hashes, the push results. Every nonconformity its own labeled bullet.
