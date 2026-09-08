// MODULE: disc — the 3-D movement disc, lifted SHAPED from the fleet demo
// (homeworld_fleet_command.jsx). Box: "The 3-D movement disc: order
// movement in three dimensions with a flat pointer." Demo lines: 880 (the
// ground hit — a pointer ray meeting the ground plane), 1091-1093
// (issueMove's grid fan, cited only — it carries as the orders module's
// own orderMove; showDiscFn and hideDisc, the open and auto-hide law),
// 1122 (a right press on ground opens the disc and, without the modifier
// held, orders the move at once), 1131 (a mouse drag changes height by
// minus dy times 0.25), 1135 (a release with the modifier held orders the
// move at the disc's point and height), 1170 (a 500 ms long press opens
// the disc on touch), 1171 (a touch drag changes height by dy times 0.3),
// 1172 (a touch release with the modifier held orders the move). The law
// carried: the ray-plane ground hit; the two drag gains and the clamp to
// plus or minus 40; the long press; the auto-hide after an order. What is
// new: a plain-data surface (makeDisc) and a pure groundHit; no three.js,
// no DOM, no timers — the page hands in pointer events and the clock, and
// feeds the committed point and height to the orders module's orderMove
// itself. The meshes and the pulse stay with the page.

// DISC_DIALS: the demo's own numbers as defaults.
export const DISC_DIALS = { mouseGain: 0.25, touchGain: 0.3, clamp: 40, autoHideMs: 600, longPressMs: 500 };

// groundHit(origin, dir, planeY): the demo's ray-plane hit (880), general
// over any horizontal plane. origin and dir are [x,y,z] arrays. Returns
// the point on the plane at planeY, or null when the ray is parallel to
// the plane (dir's y within 1e-12 of zero) or the plane lies behind the
// origin (the meeting parameter t under 0).
export function groundHit(origin, dir, planeY) {
  if (Math.abs(dir[1]) < 1e-12) return null;
  const t = (planeY - origin[1]) / dir[1];
  if (t < 0) return null;
  return [origin[0] + dir[0] * t, planeY, origin[2] + dir[2] * t];
}

// makeDisc(opts): one surface owning the disc's state. opts.dials
// overrides any of DISC_DIALS; the rest keep their default.
export function makeDisc(opts) {
  const o = opts || {};
  const dials = { ...DISC_DIALS, ...o.dials };

  const disc = {
    active: false,
    h: 0,
    point: null,
    openedAt: null,
    hideAt: null,

    // open(point, t): the demo's showDiscFn (1092) — the disc appears at
    // point, its height starting at the point's own y.
    open(point, t) {
      disc.active = true;
      disc.point = point.slice();
      disc.h = point[1];
      disc.openedAt = t;
      return disc;
    },

    // drag(dy, source): the demo's two altitude laws, verbatim signs —
    // mouse subtracts dy times its gain (1131), touch adds dy times its
    // gain (1171); both clamp to plus or minus clamp.
    drag(dy, source) {
      if (disc.active) {
        const delta = source === "mouse" ? -dy * dials.mouseGain : dy * dials.touchGain;
        disc.h = Math.max(-dials.clamp, Math.min(dials.clamp, disc.h + delta));
      }
      return disc.h;
    },

    // target(): the disc's own point and height, or null when closed.
    target() {
      return disc.active ? [disc.point[0], disc.h, disc.point[2]] : null;
    },

    // commit(t): the demo's order-and-hide (1122, 1135, 1172) — returns
    // the target to order and starts the auto-hide clock.
    commit(t) {
      if (!disc.active) return null;
      const tgt = disc.target();
      disc.hideAt = t + dials.autoHideMs;
      return tgt;
    },

    // tick(t): the demo's setTimeout(hideDisc, 600) (1092-1093, 1122,
    // 1135, 1172), made a clock read instead of a timer.
    tick(t) {
      if (disc.active && disc.hideAt !== null && t >= disc.hideAt) disc.close();
      return disc.active;
    },

    // close(): the demo's hideDisc (1093).
    close() {
      disc.active = false;
      disc.hideAt = null;
      return disc;
    },

    // longPress(downT, nowT): the demo's touch long-press timer (1170),
    // made a pure predicate for a page's own timer.
    longPress(downT, nowT) {
      return nowT - downT >= dials.longPressMs;
    },
  };
  return disc;
}

// DISC_CONTRACT / checkDiscDials: every dial a number over 0, every
// problem reported at once, none thrown.
export const DISC_CONTRACT = { mouseGain: "number > 0", touchGain: "number > 0", clamp: "number > 0", autoHideMs: "number > 0", longPressMs: "number > 0" };

export function checkDiscDials(d) {
  if (!d || typeof d !== "object") return ["dials: not an object"];
  const problems = [];
  for (const name of Object.keys(DISC_CONTRACT)) {
    if (typeof d[name] !== "number" || !(d[name] > 0)) problems.push(`dials.${name}: number > 0 required`);
  }
  return problems;
}
