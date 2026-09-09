// COMBO-ENGINE — touch-test: the touch commands module's gate. Ten checks:
// the long press against its dial, the double tap against its window, the
// box drag against its threshold, the right button's three orders and the
// modifier-held disc, the camera clamps under orbit, pan, pinch, and wheel,
// the key names, the mobile modes, twin-surface agreement, the dials
// contract, and the import fence. Every event is scripted through feed and
// tick at rolled times; no timers.
import { TOUCH_DIALS, makeTouch, checkTouchDials } from "../src/modules/touch/touch.js";
import { readFileSync } from "node:fs";

let pass = 0, fail = 0;
const check = (name, ok) => { if (ok) { pass++; console.log("PASS " + name); } else { fail++; console.log("FAIL " + name); } };

// the small seeded stream the other gates use
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const SEED = process.env.SEED ? (parseInt(process.env.SEED, 10) >>> 0) : ((Math.random() * 0xffffffff) >>> 0);
console.log(`seeds {"touch":${SEED}}`);
const rng = mulberry32(SEED);
const rollIn = (lo, hi) => lo + rng() * (hi - lo);
const rollPt = () => ({ x: rollIn(0, 1200), y: rollIn(0, 800) });
const rollGround = () => [rollIn(-200, 200), 0, rollIn(-200, 200)];
const near = (a, b, eps = 1e-9) => Math.abs(a - b) <= eps;
const kinds = (list) => list.map((i) => i.kind);
const has = (list, kind) => list.some((i) => i.kind === kind);
const only = (list, kind) => list.length === 1 && list[0].kind === kind;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const tap = (s, t, pt, extra) => [...s.feed({ type: "touchstart", t, touches: [pt], ...extra }), ...s.feed({ type: "touchend", t, touches: [], ...extra })];

{ // 1. a press held past the long-press dial opens the disc and one under it selects
  let ok = true;
  for (let i = 0; i < 100 && ok; i++) {
    const longPressMs = rollIn(100, 900);
    let hold; do { hold = rollIn(0, 1000); } while (Math.abs(hold - longPressMs) < 1e-6);
    const t0 = rollIn(0, 1000), pt = rollPt(), ground = rollGround();
    const s = makeTouch({ dials: { longPressMs } });
    const start = s.feed({ type: "touchstart", t: t0, touches: [pt], selected: 1, under: { ground } });
    const due = s.tick(t0 + hold);
    const opened = has(due, "discOpen");
    if (start.length !== 0 || opened !== (hold >= longPressMs)) ok = false;
    if (opened && !(due[0].auto === false && due[0].point === ground && s.state.discOpen && s.state.shiftHeld)) ok = false;
    if (opened && s.tick(t0 + hold + 1).length !== 0) ok = false;         // fires once
    const s2 = makeTouch({ dials: { longPressMs } });
    const hold2 = rollIn(0, longPressMs * 0.99);
    s2.feed({ type: "touchstart", t: t0, touches: [pt], selected: 1, under: { ground } });
    const end = s2.feed({ type: "touchend", t: t0 + hold2, touches: [], selected: 1, under: { ground } });
    if (!only(end, "select") || s2.tick(t0 + longPressMs + 1).length !== 0 || s2.state.discOpen) ok = false;
  }
  check("touch: a press held past the long-press dial opens the disc and one under it selects", ok);
}

{ // 2. two taps inside the double-tap window open the disc with an auto move, outside it they do not
  let ok = true;
  for (let i = 0; i < 100 && ok; i++) {
    const doubleTapMs = rollIn(100, 600);
    let gap; do { gap = rollIn(0, 700); } while (Math.abs(gap - doubleTapMs) < 1e-6);
    const t0 = rollIn(0, 1000), pt = rollPt(), ground = rollGround();
    const s = makeTouch({ dials: { doubleTapMs } });
    const first = tap(s, t0, pt, { selected: 1, under: { ground } });
    const second = tap(s, t0 + gap, pt, { selected: 1, under: { ground } });
    if (!only(first, "select")) ok = false;
    const opened = has(second, "discOpen");
    if (opened !== (gap < doubleTapMs)) ok = false;
    if (opened && !(second.length === 1 && second[0].auto === true && second[0].point === ground)) ok = false;
    if (!opened && !only(second, "select")) ok = false;
  }
  check("touch: two taps inside the double-tap window open the disc with an auto move, outside it they do not", ok);
}

{ // 3. a left drag past the box dial boxes, and under it clicks
  let ok = true;
  for (let i = 0; i < 100 && ok; i++) {
    let d; do { d = rollIn(0, 12); } while (Math.abs(d - TOUCH_DIALS.boxDragPx) < 1e-6);
    const p = rollPt(), axis = rng() < 0.5 ? "x" : "y", sign = rng() < 0.5 ? -1 : 1;
    const q = { x: p.x, y: p.y }; q[axis] += sign * d;
    const s = makeTouch({});
    const down = s.feed({ type: "down", t: 0, x: p.x, y: p.y, button: 0 });
    const move = s.feed({ type: "move", t: 1, x: q.x, y: q.y });
    const up = s.feed({ type: "up", t: 2, x: q.x, y: q.y, button: 0 });
    if (!(only(down, "boxStart") && down[0].x === p.x && down[0].y === p.y)) ok = false;
    const rect = { x1: Math.min(p.x, q.x), y1: Math.min(p.y, q.y), x2: Math.max(p.x, q.x), y2: Math.max(p.y, q.y) };
    if (d > TOUCH_DIALS.boxDragPx) {
      if (!(only(move, "boxDrag") && JSON.stringify(move[0].rect) === JSON.stringify(rect))) ok = false;
      if (!(only(up, "boxEnd") && JSON.stringify(up[0].rect) === JSON.stringify(rect))) ok = false;
    } else {
      if (move.length !== 0) ok = false;
      if (!(only(up, "click") && up[0].x === q.x && up[0].y === q.y && up[0].shift === false)) ok = false;
    }
    if (s.state.boxing) ok = false;
  }
  check("touch: a left drag past the box dial boxes, and under it clicks", ok);
}

{ // 4. the right button orders attack on an enemy, guard on an unselected friend, and a move on ground, and the modifier holds the disc
  let ok = true;
  const E = { id: "enemy" }, F = { id: "friend" }, ground = rollGround(), p = rollPt();
  const s = makeTouch({});
  const a = s.feed({ type: "down", t: 0, x: p.x, y: p.y, button: 2, selected: 1, under: { enemy: E, ground } });
  s.feed({ type: "up", t: 1, x: p.x, y: p.y, button: 2 });
  if (!(only(a, "attack") && a[0].target === E)) ok = false;
  const g = s.feed({ type: "down", t: 2, x: p.x, y: p.y, button: 2, selected: 1, under: { friend: F, friendSelected: false, ground } });
  s.feed({ type: "up", t: 3, x: p.x, y: p.y, button: 2 });
  if (!(only(g, "guard") && g[0].target === F)) ok = false;
  const m = s.feed({ type: "down", t: 4, x: p.x, y: p.y, button: 2, selected: 1, under: { friend: F, friendSelected: true, ground } });
  const mu = s.feed({ type: "up", t: 5, x: p.x, y: p.y, button: 2 });
  if (!(kinds(m).join() === "discOpen,move" && m[0].auto === false && m[0].point === ground && m[1].point === ground && mu.length === 0 && !s.state.discOpen)) ok = false;
  const none = s.feed({ type: "down", t: 6, x: p.x, y: p.y, button: 2, selected: 0, under: { enemy: E, ground } });
  if (none.length !== 0) ok = false;
  s.feed({ type: "keydown", t: 7, key: "Shift" });
  const dy = rollIn(-50, 50);
  const o = s.feed({ type: "down", t: 8, x: p.x, y: p.y, button: 2, selected: 1, under: { friend: F, friendSelected: true, ground } });
  const held = s.state.discOpen && s.state.discModifier;
  const drag = s.feed({ type: "move", t: 9, x: p.x, y: p.y + dy });
  const commit = s.feed({ type: "up", t: 10, x: p.x, y: p.y + dy, button: 2 });
  if (!(only(o, "discOpen") && o[0].auto === false && held === true && !s.state.discOpen)) ok = false;
  if (!(only(drag, "discDrag") && near(drag[0].dy, dy) && drag[0].source === "mouse")) ok = false;
  if (!only(commit, "discCommit")) ok = false;
  check("touch: the right button orders attack on an enemy, guard on an unselected friend, and a move on ground, and the modifier holds the disc", ok);
}

{ // 5. orbit, pan, pinch, and the wheel stay inside their clamps
  let ok = true;
  const D = TOUCH_DIALS;
  for (let i = 0; i < 200 && ok; i++) {
    const p = rollPt(), dx = rollIn(-400, 400), dy = rollIn(-400, 400);
    { const s = makeTouch({}); const c0 = { ...s.state.camera };
      const down = s.feed({ type: "down", t: 0, x: p.x, y: p.y, button: 0, alt: true });
      const mv = s.feed({ type: "move", t: 1, x: p.x + dx, y: p.y + dy });
      s.feed({ type: "up", t: 2, x: p.x + dx, y: p.y + dy, button: 0, alt: true });
      const want = { theta: c0.theta + dx * D.orbitMouse, phi: clamp(c0.phi - dy * D.orbitMouse, D.phiMin, D.phiMax) };
      if (!(only(down, "orbitStart") && only(mv, "camera") && near(mv[0].theta, want.theta) && near(mv[0].phi, want.phi) && mv[0].follow === false && s.state.dragging === false)) ok = false;
      if (!(s.state.camera.phi >= D.phiMin && s.state.camera.phi <= D.phiMax)) ok = false; }
    { const s = makeTouch({});
      s.feed({ type: "keydown", t: 0, key: "Shift" });
      s.feed({ type: "down", t: 1, x: p.x, y: p.y, button: 1 });
      const mv = s.feed({ type: "move", t: 2, x: p.x + dx, y: p.y + dy });
      if (!(only(mv, "pan") && near(mv[0].dx, dx * D.panMouse) && near(mv[0].dy, dy * D.panMouse))) ok = false; }
    { const s = makeTouch({}); const deltaY = rollIn(-5000, 5000);
      const w = s.feed({ type: "wheel", t: 0, deltaY });
      const want = clamp(110 + deltaY * D.wheelZoom, D.zoomMin, D.zoomMax);
      if (!(only(w, "camera") && near(w[0].dist, want) && near(s.state.camera.dist, want) && w[0].follow === false)) ok = false; }
    { const s = makeTouch({}); s.setFollow(true); const deltaY = rollIn(-5000, 5000);
      const w = s.feed({ type: "wheel", t: 0, deltaY });
      const want = clamp(20 + deltaY * D.followWheel, D.followMin, D.followMax);
      if (!(only(w, "camera") && near(w[0].dist, want) && near(s.state.camera.followDist, want) && w[0].follow === true && s.state.camera.dist === 110)) ok = false; }
    { const s = makeTouch({}); const a = rollPt(), b = rollPt(), a2 = rollPt(), b2 = rollPt();
      const s0 = Math.hypot(b.x - a.x, b.y - a.y), s1 = Math.hypot(b2.x - a2.x, b2.y - a2.y);
      s.feed({ type: "touchstart", t: 0, touches: [a, b] });
      const mv = s.feed({ type: "touchmove", t: 1, touches: [a2, b2] });
      const want = clamp(110 * (s0 / s1), D.zoomMin, D.zoomMax);
      const cam = mv.find((x) => x.kind === "camera"), pan = mv.find((x) => x.kind === "pan");
      const mdx = ((a2.x + b2.x) - (a.x + b.x)) / 2, mdy = ((a2.y + b2.y) - (a.y + b.y)) / 2;
      if (!(cam && near(cam.dist, want) && near(s.state.camera.dist, want) && pan && near(pan.dx, mdx * D.panTouch) && near(pan.dy, mdy * D.panTouch))) ok = false; }
    { const s = makeTouch({});
      s.feed({ type: "touchstart", t: 0, touches: [p], selected: 1 });
      const mv = s.feed({ type: "touchmove", t: 1, touches: [{ x: p.x + dx, y: p.y + dy }] });
      const want = { theta: dx * D.orbitTouch, phi: clamp(0.8 - dy * D.orbitTouch, D.phiMin, D.phiMax) };
      if (!(only(mv, "camera") && near(mv[0].theta, want.theta) && near(mv[0].phi, want.phi) && s.tick(1000).length === 0)) ok = false; }
  }
  check("touch: orbit, pan, pinch, and the wheel stay inside their clamps", ok);
}

{ // 6. the keys map to their names
  let ok = true;
  const s = makeTouch({});
  s.feed({ type: "keydown", t: 0, key: "Shift" }); if (!s.state.shiftHeld) ok = false;
  s.feed({ type: "keyup", t: 1, key: "Shift" }); if (s.state.shiftHeld) ok = false;
  const name = (list) => list.length === 1 && list[0].kind === "key" ? list[0].name : null;
  if (name(s.feed({ type: "keydown", t: 2, key: "Tab" })) !== "sensor") ok = false;
  if (name(s.feed({ type: "keydown", t: 3, key: "a", ctrl: true })) !== "selectAll") ok = false;
  if (name(s.feed({ type: "keydown", t: 3, key: "a", meta: true })) !== "selectAll") ok = false;
  if (s.feed({ type: "keydown", t: 3, key: "a" }).length !== 0) ok = false;
  const f1 = s.feed({ type: "keydown", t: 4, key: "f", selected: 1 });
  if (!(only(f1, "follow") && f1[0].dist === 20 && s.state.follow === true)) ok = false;
  if (name(s.feed({ type: "keydown", t: 5, key: "Escape" })) !== "releaseFollow" || s.state.follow) ok = false;
  if (name(s.feed({ type: "keydown", t: 6, key: "Escape" })) !== "clearSelection") ok = false;
  const s2 = makeTouch({});
  if (s2.feed({ type: "keydown", t: 0, key: "f", selected: 2 }).length !== 0 || s2.state.follow) ok = false;
  s2.feed({ type: "wheel", t: 1, deltaY: 1000 });
  if (name(s2.feed({ type: "keydown", t: 2, key: "h" })) !== "home" || s2.state.camera.dist !== 110) ok = false;
  if (name(s2.feed({ type: "keydown", t: 3, key: " " })) !== "pause") ok = false;
  check("touch: the keys map to their names", ok);
}

{ // 7. the mobile modes route a tap
  let ok = true;
  const E = { id: "enemy" }, ground = rollGround(), p = rollPt();
  const s = makeTouch({});
  if (s.setMode("move") !== "move") ok = false;
  const mv = tap(s, 1000, p, { selected: 1, under: { ground } });
  if (!(only(mv, "discOpen") && mv[0].auto === true && mv[0].point === ground)) ok = false;
  s.setMode("attack");
  const at = tap(s, 3000, p, { selected: 1, under: { enemy: E, ground } });
  const am = tap(s, 5000, p, { selected: 1, under: { ground } });
  if (!(only(at, "attack") && at[0].target === E && only(am, "attackMove") && am[0].point === ground)) ok = false;
  if (s.setMode(null) !== null) ok = false;
  const sel = tap(s, 7000, p, { selected: 1, under: { ground } });
  if (!(only(sel, "select") && sel[0].target === null && sel[0].x === p.x)) ok = false;
  check("touch: the mobile modes route a tap", ok);
}

{ // 8. twin surfaces agree
  const TYPES = ["down", "move", "up", "wheel", "keydown", "keyup", "touchstart", "touchmove", "touchend"];
  const KEYS = ["Shift", "Tab", "a", "f", "h", "Escape", " "];
  const script = [];
  let t = 0;
  for (let i = 0; i < 400; i++) {
    t += rollIn(0, 400);
    const type = TYPES[Math.floor(rng() * TYPES.length)], p = rollPt();
    const ev = { type, t, x: p.x, y: p.y, button: Math.floor(rng() * 3), alt: rng() < 0.2, shift: rng() < 0.2, ctrl: rng() < 0.2, meta: false,
      key: KEYS[Math.floor(rng() * KEYS.length)], deltaY: rollIn(-500, 500), selected: Math.floor(rng() * 3),
      touches: rng() < 0.5 ? [rollPt()] : rng() < 0.5 ? [rollPt(), rollPt()] : [],
      under: { enemy: rng() < 0.2 ? { id: "e" } : null, friend: rng() < 0.3 ? { id: "f" } : null, friendSelected: rng() < 0.5, ground: rng() < 0.7 ? rollGround() : null } };
    script.push(ev);
  }
  const run = () => { const s = makeTouch({}); const out = []; for (const ev of script) { out.push(s.feed(ev)); out.push(s.tick(ev.t + rollInFixed(ev))); } return { out: JSON.stringify(out), cam: JSON.stringify(s.state.camera), state: JSON.stringify(s.state) }; };
  const rollInFixed = (ev) => (ev.t * 7919) % 900;   // a fixed function of the event, the same for both twins
  const a = run(), b = run();
  check("touch: twin surfaces agree", a.out === b.out && a.cam === b.cam && a.state === b.state && a.out.length > 100);
}

{ // 9. the contract counts every problem
  const two = checkTouchDials({ ...TOUCH_DIALS, zoomMin: 600, boxDragPx: 0 });
  check("touch: the contract counts every problem", two.length === 2 && checkTouchDials(TOUCH_DIALS).length === 0 && checkTouchDials(null).length === 1);
}

{ // 10. the module imports only from its own folder or a sibling module
  const src = readFileSync(new URL("../src/modules/touch/touch.js", import.meta.url), "utf8");
  const specs = [...src.matchAll(/^import[\s\S]*?from\s+["']([^"']+)["']/gm)].map((m) => m[1]);
  check("touch: the module imports only from its own folder or a sibling module", specs.every((x) => /^\.\.\/[a-z0-9-]+\//.test(x) || /^\.\//.test(x)));
}

console.log(`touch-test: ${pass} PASS / ${fail} FAIL`);
console.log(fail === 0 ? "touch-test PASS" : "touch-test FAIL");
process.exit(fail === 0 ? 0 : 1);
