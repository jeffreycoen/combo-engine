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
