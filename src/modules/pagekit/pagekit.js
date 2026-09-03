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
