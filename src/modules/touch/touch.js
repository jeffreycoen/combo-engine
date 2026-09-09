// MODULE: touch — the touch commands, a SHAPED lift from the fleet demo
// (homeworld_fleet_command.jsx lines 153, 1097-1162, 1170-1196). Serves the
// checklist box "The touch commands: the right mouse button, solved for a
// phone". Seam: consume (events in, intents out).
//
// The LAW carried, cited by line:
//   - the middle button, or alt plus the left button, starts an orbit drag
//     (1099);
//   - the right button with a selection orders attack on an enemy under the
//     pointer, guard on a friend under it that is not selected, else opens
//     the disc on the ground point and, without the modifier, orders a move
//     at once (1100-1125);
//   - the left button without alt starts a box (1126);
//   - a move while orbiting turns the camera by dx times 0.005 and dy times
//     0.005 with the pitch clamped to 0.15..1.5, or pans by dx times 0.12
//     and dy times 0.12 with shift held and no follow, or turns the follow
//     camera by the same 0.005 (1129);
//   - a box counts once the pointer moves more than 5 pixels on x or y
//     (1130); with the disc open and the modifier held a move drags the
//     disc by dy (1131; the disc module applies the gain and the sign);
//   - the right button's release with the disc open and the modifier held
//     commits the disc (1135); the left button's release ends a box or is a
//     click (1138-1139);
//   - the wheel changes the camera distance by deltaY times 0.08 clamped
//     15..500, or the follow distance by deltaY times 0.04 clamped 8..60
//     (1143-1147);
//   - the keys: Shift holds the modifier, Tab toggles the sensor view, ctrl
//     or meta plus a selects all, f follows the one selected unit at
//     distance 20, h homes the camera, Escape releases the follow or clears
//     the selection, space pauses (1148-1162);
//   - on touch: one finger held 500 ms without moving opens the disc when a
//     selection exists and holds the modifier (1170); a single moving finger
//     drags the disc when it is open with the modifier, else orbits by 0.006;
//     two fingers pinch the distance by their spacing ratio clamped 15..500
//     and pan by 0.15 (1171); a release with the disc open and the modifier
//     commits it and drops the modifier; a tap in move mode opens the disc
//     with an auto move; a tap in attack mode orders attack on an enemy under
//     it, else an attack-move to the ground point; a second tap within 350 ms
//     opens the disc with an auto move; a plain tap is a selection request
//     (1172-1196).
// What is NEW: the page binds the events, hands each one in with what it
// found under the pointer, and applies the intents; this module owns the
// thresholds, the timings, the clamps, and the camera numbers. No DOM, no
// timers, no three.js: the long press is a clock read in tick(t).
// Readings where the demo's page code had no plain counterpart, stated:
//   - the camera intent carries the numbers of whichever camera moved, with
//     follow true when it was the follow camera;
//   - the pan intent carries dx and dy times the gain; the demo applies -dx
//     along the camera's right vector and +dy up, which is the page's;
//   - the f key yields the follow intent with the demo's distance 20, not a
//     key intent; h yields the key intent home and resets the distance to
//     the seeded camera's own;
//   - discOpen in the state means the modifier holds the disc for a drag;
//     an auto disc (a tap in move mode, a second tap) is the disc module's
//     own clock and leaves the state closed;
//   - a plain tap yields select with the friend the page handed, or null;
//     the page resolves and clears. The clear kind is reserved and unused.

export const TOUCH_DIALS = { longPressMs: 500, doubleTapMs: 350, boxDragPx: 5, orbitMouse: 0.005, orbitTouch: 0.006, panMouse: 0.12, panTouch: 0.15, wheelZoom: 0.08, zoomMin: 15, zoomMax: 500, followWheel: 0.04, followMin: 8, followMax: 60, phiMin: 0.15, phiMax: 1.5 };

const CAMERA_SEED = { theta: 0, phi: 0.8, dist: 110, followTheta: 0, followPhi: 0.8, followDist: 20 };
const FOLLOW_DIST = 20; // the demo's G.followDist = 20 on f (1152)

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const spacing = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);
const rectOf = (a, b) => ({ x1: Math.min(a.x, b.x), y1: Math.min(a.y, b.y), x2: Math.max(a.x, b.x), y2: Math.max(a.y, b.y) });

export function makeTouch(opts) {
  const o = opts || {};
  const dials = { ...TOUCH_DIALS, ...(o.dials || {}) };
  const camera = { ...CAMERA_SEED, ...(o.camera || {}) };
  const home = { ...camera };
  const state = { shiftHeld: false, dragging: false, boxing: false, discOpen: false, discModifier: false, follow: false, mode: null, camera };

  // page-side globals of the demo, now private to the surface
  let lastM = null;      // last pointer point while orbiting or disc-dragging
  let boxStart = null;   // the left button's down point
  let rDown = false;     // the right button is down with the disc open
  let touchPrev = null;  // the last touch points
  let touchMoved = false;
  let pinching = false;
  let pinchDist = 0;
  let tapPos = null;
  let tapTime = -Infinity;
  let press = null;      // the pending long press: { t, ground, selected }

  const modifier = (ev) => state.shiftHeld || !!ev.shift;
  const under = (ev) => ev.under || {};

  function cameraIntent(follow) {
    return follow
      ? { kind: "camera", theta: camera.followTheta, phi: camera.followPhi, dist: camera.followDist, follow: true }
      : { kind: "camera", theta: camera.theta, phi: camera.phi, dist: camera.dist, follow: false };
  }

  function onDown(ev, out) {
    if (ev.button === 1 || (ev.button === 0 && ev.alt)) {           // 1099
      state.dragging = true; lastM = { x: ev.x, y: ev.y };
      out.push({ kind: "orbitStart" });
    } else if (ev.button === 2) {                                     // 1100-1125
      if (!(ev.selected > 0)) return;
      const u = under(ev);
      if (u.enemy) out.push({ kind: "attack", target: u.enemy });
      else if (u.friend && !u.friendSelected) out.push({ kind: "guard", target: u.friend });
      else if (u.ground) {
        rDown = true; lastM = { x: ev.x, y: ev.y };
        const held = modifier(ev);               // the modifier holds the disc open for a drag
        state.discOpen = held; state.discModifier = held;
        out.push({ kind: "discOpen", point: u.ground, auto: false });
        if (!held) out.push({ kind: "move", point: u.ground });
      }
    } else if (ev.button === 0 && !ev.alt) {                          // 1126
      boxStart = { x: ev.x, y: ev.y }; state.boxing = false;
      out.push({ kind: "boxStart", x: ev.x, y: ev.y });
    }
  }

  function onMove(ev, out) {
    if (state.dragging && lastM) {                                    // 1129
      const dx = ev.x - lastM.x, dy = ev.y - lastM.y;
      if (modifier(ev) && !state.follow) {
        out.push({ kind: "pan", dx: dx * dials.panMouse, dy: dy * dials.panMouse });
      } else if (state.follow) {
        camera.followTheta += dx * dials.orbitMouse;
        camera.followPhi = clamp(camera.followPhi - dy * dials.orbitMouse, dials.phiMin, dials.phiMax);
        out.push(cameraIntent(true));
      } else {
        camera.theta += dx * dials.orbitMouse;
        camera.phi = clamp(camera.phi - dy * dials.orbitMouse, dials.phiMin, dials.phiMax);
        out.push(cameraIntent(false));
      }
      lastM = { x: ev.x, y: ev.y };
    }
    if (boxStart) {                                                   // 1130
      if (Math.abs(ev.x - boxStart.x) > dials.boxDragPx || Math.abs(ev.y - boxStart.y) > dials.boxDragPx) state.boxing = true;
      if (state.boxing) out.push({ kind: "boxDrag", rect: rectOf(boxStart, ev) });
    }
    if (state.discOpen && modifier(ev) && rDown && lastM) {           // 1131
      out.push({ kind: "discDrag", dy: ev.y - lastM.y, source: "mouse" });
      lastM = { x: ev.x, y: ev.y };
    }
  }

  function onUp(ev, out) {
    if (ev.button === 1 || (ev.button === 0 && ev.alt)) state.dragging = false;
    if (ev.button === 2 && state.discOpen && modifier(ev)) {          // 1135
      out.push({ kind: "discCommit" });
      state.discOpen = false; state.discModifier = false;
    }
    if (ev.button === 2) rDown = false;
    if (ev.button === 0) {                                            // 1138-1139
      if (state.boxing && boxStart) out.push({ kind: "boxEnd", rect: rectOf(boxStart, ev) });
      else if (!state.boxing && boxStart) out.push({ kind: "click", x: ev.x, y: ev.y, shift: modifier(ev) });
      boxStart = null; state.boxing = false;
    }
  }

  function onWheel(ev, out) {                                         // 1143-1147
    const d = Number(ev.deltaY) || 0;
    if (state.follow) {
      camera.followDist = clamp(camera.followDist + d * dials.followWheel, dials.followMin, dials.followMax);
      out.push(cameraIntent(true));
    } else {
      camera.dist = clamp(camera.dist + d * dials.wheelZoom, dials.zoomMin, dials.zoomMax);
      out.push(cameraIntent(false));
    }
  }

  function onKeyDown(ev, out) {                                       // 1148-1161
    const k = ev.key;
    if (k === "Shift") state.shiftHeld = true;
    if (k === "Tab") out.push({ kind: "key", name: "sensor" });
    if (k === "a" && (ev.ctrl || ev.meta)) out.push({ kind: "key", name: "selectAll" });
    if ((k === "f" || k === "F") && ev.selected === 1) {
      state.follow = true; camera.followDist = FOLLOW_DIST;
      out.push({ kind: "follow", dist: FOLLOW_DIST });
    }
    if (k === "h" || k === "H") {
      state.follow = false; camera.dist = home.dist;
      out.push({ kind: "key", name: "home" });
    }
    if (k === "Escape") {
      if (state.follow) { state.follow = false; out.push({ kind: "key", name: "releaseFollow" }); }
      else out.push({ kind: "key", name: "clearSelection" });
    }
    if (k === " ") out.push({ kind: "key", name: "pause" });
  }

  function onKeyUp(ev) {                                              // 1162
    if (ev.key === "Shift") state.shiftHeld = false;
  }

  function onTouchStart(ev) {                                         // 1170
    const t = ev.touches || [];
    touchPrev = t.map((p) => ({ x: p.x, y: p.y }));
    touchMoved = false;
    if (t.length === 1) {
      tapPos = { x: t[0].x, y: t[0].y };
      press = { t: ev.t, ground: under(ev).ground || null, selected: ev.selected || 0 };
    } else if (t.length === 2) {
      press = null; pinching = true; pinchDist = spacing(t[0], t[1]);
    }
  }

  function onTouchMove(ev, out) {                                     // 1171
    const t = ev.touches || [];
    touchMoved = true;
    if (t.length === 1 && !pinching) {
      press = null;
      if (touchPrev && touchPrev.length >= 1) {
        if (state.discOpen && modifier(ev)) {
          out.push({ kind: "discDrag", dy: touchPrev[0].y - t[0].y, source: "touch" });
        } else {
          const dx = t[0].x - touchPrev[0].x, dy = t[0].y - touchPrev[0].y;
          camera.theta += dx * dials.orbitTouch;
          camera.phi = clamp(camera.phi - dy * dials.orbitTouch, dials.phiMin, dials.phiMax);
          out.push(cameraIntent(false));
        }
      }
      touchPrev = [{ x: t[0].x, y: t[0].y }];
    } else if (t.length === 2) {
      press = null;
      const dist = spacing(t[0], t[1]);
      if (pinchDist > 0 && dist > 0) {
        camera.dist = clamp(camera.dist * (pinchDist / dist), dials.zoomMin, dials.zoomMax);
        out.push(cameraIntent(false));
      }
      pinchDist = dist;
      if (touchPrev && touchPrev.length >= 2) {
        const mx = (t[0].x + t[1].x) / 2, my = (t[0].y + t[1].y) / 2;
        const pmx = (touchPrev[0].x + touchPrev[1].x) / 2, pmy = (touchPrev[0].y + touchPrev[1].y) / 2;
        out.push({ kind: "pan", dx: (mx - pmx) * dials.panTouch, dy: (my - pmy) * dials.panTouch });
      }
      touchPrev = [{ x: t[0].x, y: t[0].y }, { x: t[1].x, y: t[1].y }];
    }
  }

  function onTouchEnd(ev, out) {                                      // 1172-1196
    press = null;
    const remaining = ev.touches ? ev.touches.length : 0;
    if (state.discOpen && modifier(ev)) {
      out.push({ kind: "discCommit" });
      state.discOpen = false; state.discModifier = false; state.shiftHeld = false;
      pinching = false; pinchDist = 0;
      return;
    }
    if (!touchMoved && tapPos && remaining === 0) {
      const u = under(ev), sel = ev.selected > 0;
      if (state.mode === "move" && sel) {
        if (u.ground) out.push({ kind: "discOpen", point: u.ground, auto: true });
      } else if (state.mode === "attack" && sel) {
        if (u.enemy) out.push({ kind: "attack", target: u.enemy });
        else if (u.ground) out.push({ kind: "attackMove", point: u.ground });
      } else if (ev.t - tapTime < dials.doubleTapMs) {
        if (sel && u.ground) out.push({ kind: "discOpen", point: u.ground, auto: true });
        tapTime = -Infinity;
      } else {
        tapTime = ev.t;
        out.push({ kind: "select", x: tapPos.x, y: tapPos.y, target: u.friend || null });
      }
    }
    pinching = false; pinchDist = 0;
  }

  const surface = {
    dials,
    state,
    feed(ev) {
      const out = [];
      switch (ev.type) {
        case "down": onDown(ev, out); break;
        case "move": onMove(ev, out); break;
        case "up": onUp(ev, out); break;
        case "wheel": onWheel(ev, out); break;
        case "keydown": onKeyDown(ev, out); break;
        case "keyup": onKeyUp(ev); break;
        case "touchstart": onTouchStart(ev); break;
        case "touchmove": onTouchMove(ev, out); break;
        case "touchend": onTouchEnd(ev, out); break;
        default: break;
      }
      return out;
    },
    // tick(t): the demo's 500 ms long-press timer (1170) as a clock read;
    // fires once, opens the disc, and holds the modifier for the drag and
    // the release.
    tick(t) {
      const out = [];
      if (press && !touchMoved && t - press.t >= dials.longPressMs) {
        if (press.selected > 0 && press.ground) {
          state.discOpen = true; state.discModifier = true; state.shiftHeld = true;
          out.push({ kind: "discOpen", point: press.ground, auto: false });
        }
        press = null;
      }
      return out;
    },
    setMode(mode) { state.mode = mode === "move" || mode === "attack" ? mode : null; return state.mode; },
    setFollow(on) { state.follow = !!on; return state.follow; },
  };
  return surface;
}

// TOUCH_CONTRACT / checkTouchDials: every dial a number over 0, the three
// clamp pairs ordered, every problem reported at once, none thrown.
const DIAL_NAMES = Object.keys(TOUCH_DIALS);
const CLAMP_PAIRS = [["zoomMin", "zoomMax"], ["followMin", "followMax"], ["phiMin", "phiMax"]];
export const TOUCH_CONTRACT = Object.freeze({
  ...Object.fromEntries(DIAL_NAMES.map((n) => [n, "number > 0"])),
  pairs: "zoomMin under zoomMax; followMin under followMax; phiMin under phiMax",
});
export function checkTouchDials(d) {
  if (!d || typeof d !== "object") return ["dials: not an object"];
  const problems = [];
  for (const n of DIAL_NAMES) if (!(typeof d[n] === "number" && d[n] > 0)) problems.push(`dials.${n}: number > 0 required`);
  for (const [lo, hi] of CLAMP_PAIRS) {
    if (typeof d[lo] === "number" && typeof d[hi] === "number" && !(d[lo] < d[hi])) problems.push(`dials.${lo}: under ${hi} required`);
  }
  return problems;
}
