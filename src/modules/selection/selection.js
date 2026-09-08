// MODULE: selection — the selection and feedback layer, lifted SHAPED from
// the fleet demo (homeworld_fleet_command.jsx). Box: "The selection and
// feedback layer: brackets, health ramps, order lines, formation links."
// Demo lines: 815-825 (the mothership bracket, squeezed to 0.15 in x),
// 934-968 (the selection ring, the health bar planes, the enemy and
// friendly brackets), 1084-1090 (select), 1130 (the box-drag threshold),
// 1138-1139 (box select's inclusive screen-rect test, the follow window,
// the shift toggle), 1529-1543 (bar opacities and the health colour ramp,
// bracket opacities), 1668-1710 (order lines and their diamond markers),
// 1712-1724 (formation links). The law carried: every bracket size and leg
// ratio, the mothership's x squeeze, the bar's size and up-offset and its
// two-branch colour ramp, every opacity (background, bar, bracket, ring,
// line, link), the order-line colours by verb and their precedence (move,
// then guard, then attack), the dash and gap lengths, the diamond marker's
// ring, the box-drag pixel threshold, and the follow-click window. What is
// new: plain units in, plain drawing data out — makeSelection(opts) owns
// the ordered selection list and yields frame(units, t) for any renderer;
// no three.js, no DOM, no clocks. isEnemy, typeOf, scaleOf, and posOf are
// handed in as functions so the unit shape stays the caller's.

// SELECTION_DIALS: the demo's own numbers as defaults.
export const SELECTION_DIALS = {
  bracket: 2.2, bracketArm: 0.4,
  bigBracket: 28, bigArm: 0.3, bigAspect: 0.15,
  barWidth: 3, barHeight: 0.15, barUp: 2.5,
  ringInner: 1.4, ringOuter: 1.7, ringSegments: 24, ringOpacity: 0.45,
  dash: 1.5, gap: 1, lineOpacity: 0.3, linkOpacity: 0.1,
  boxDragPx: 5, followMs: 400,
  colors: { move: 0x9adcd4, guard: 0x88aa44, attack: 0xdd6644, enemyBracket: 0xff3333, collectorBracket: 0xddaa44, friendBracket: 0xccbb88 },
};

const CORNERS = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

// bracketLegs(size, leg, aspect): the demo's L-shaped corner brackets —
// eight segments, two per corner, corner by corner in the demo's order
// (942-943 the friendly/enemy brackets, 816-821 the mothership's, aspect
// 0.15 there squeezing x).
export function bracketLegs(size, leg, aspect = 1) {
  const segments = [];
  for (const [cx, cy] of CORNERS) {
    segments.push([[cx * size * aspect, cy * size], [cx * size * aspect, cy * (size - leg)]]);
    segments.push([[cx * size * aspect, cy * size], [cx * (size * aspect - leg * aspect), cy * size]]);
  }
  return segments;
}

// barColor(ratio): the demo's green-yellow-red health ramp (1534-1536),
// branching at 0.5.
export function barColor(ratio) {
  if (ratio > 0.5) return [0.2 + (0.8 - ratio) * 1.6, 0.85, 0.2];
  return [0.85, ratio * 1.7, 0.15];
}

// dashes(from, to, dash, gap): the demo's dashed-line loop (1680-1691) —
// segments of [start, end] points, each point from + (to - from) * fraction.
export function dashes(from, to, dash, gap) {
  const dim = from.length;
  let sumSq = 0;
  for (let i = 0; i < dim; i++) { const diff = to[i] - from[i]; sumSq += diff * diff; }
  const len = Math.sqrt(sumSq);
  const at = (fraction) => {
    const p = new Array(dim);
    for (let i = 0; i < dim; i++) p[i] = from[i] + (to[i] - from[i]) * fraction;
    return p;
  };
  const segments = [];
  let d = 0;
  while (d < len) {
    const start = d / len, end = Math.min((d + dash) / len, 1);
    segments.push([at(start), at(end)]);
    d += dash + gap;
  }
  return segments;
}

// makeSelection(opts): one surface owning the ordered selection list.
// opts.dials overrides any of SELECTION_DIALS; opts.isEnemy, opts.typeOf,
// opts.scaleOf, opts.posOf override the unit accessors.
export function makeSelection(opts) {
  const o = opts || {};
  const dials = { ...SELECTION_DIALS, ...o.dials };
  const isEnemy = o.isEnemy || ((u) => u.isEnemy === true);
  const typeOf = o.typeOf || ((u) => u.type);
  const scaleOf = o.scaleOf || ((u) => u.scale);
  const posOf = o.posOf || ((u) => u.pos);

  let lastClickUnit = null;
  let lastClickTime = null;

  const sel = {
    list: [],

    // select(units): the demo's selectShips (1084-1090) — replaces the
    // list, marking the old units unselected and the new ones selected.
    select(units) {
      sel.list.forEach((u) => { u.selected = false; });
      sel.list = units.slice();
      sel.list.forEach((u) => { u.selected = true; });
      return sel.list;
    },

    // toggle(u): removes when present, appends when absent.
    toggle(u) {
      const idx = sel.list.indexOf(u);
      if (idx >= 0) sel.list.splice(idx, 1);
      else sel.list.push(u);
      return sel.list;
    },

    // clear(): empties the selection.
    clear() {
      return sel.select([]);
    },

    // boxSelect(units, project, rect): the demo's box-select filter
    // (1138) — keeps units whose projected screen point lies inside rect,
    // inclusive of its edges, and selects them.
    boxSelect(units, project, rect) {
      const inside = units.filter((u) => {
        const [sx, sy] = project(u);
        return sx >= rect.x1 && sx <= rect.x2 && sy >= rect.y1 && sy <= rect.y2;
      });
      return sel.select(inside);
    },

    // dragIs(start, now): the demo's box-drag threshold (1130).
    dragIs(start, now) {
      return Math.abs(now.x - start.x) > dials.boxDragPx || Math.abs(now.y - start.y) > dials.boxDragPx;
    },

    // click(u, t, shift): the demo's click resolution (1139) — shift
    // toggles; else the follow window (400 ms) follows a repeat click on
    // the same unit; else a plain click selects the unit alone.
    click(u, t, shift) {
      let result;
      if (shift) {
        sel.toggle(u);
        result = "toggle";
      } else if (lastClickUnit === u && lastClickTime !== null && t - lastClickTime < dials.followMs) {
        sel.select([u]);
        result = "follow";
      } else {
        sel.select([u]);
        result = "select";
      }
      lastClickUnit = u;
      lastClickTime = t;
      return result;
    },

    // bigBracket(): the mothership's bracket segments (816-821).
    bigBracket() {
      return bracketLegs(dials.bigBracket, dials.bigBracket * dials.bigArm, dials.bigAspect);
    },

    // frame(units, t): plain drawing data — brackets, health bars, the
    // selection ring, order lines, and formation links.
    frame(units, t) {
      const selected = new Set(sel.list);
      const brackets = [];
      const bars = [];
      const rings = [];
      const orderLines = [];

      for (const u of units) {
        const enemy = isEnemy(u);
        const isSel = selected.has(u);
        const scale = scaleOf(u);
        const type = typeOf(u);

        const bSize = scale * dials.bracket;
        const bLeg = bSize * dials.bracketArm;
        const bColor = enemy ? dials.colors.enemyBracket : (type === "collector" ? dials.colors.collectorBracket : dials.colors.friendBracket);
        const bOpacity = enemy ? 0.5 + Math.sin(t * 3) * 0.15 : (isSel ? 0.55 : 0.25);
        brackets.push({ segments: bracketLegs(bSize, bLeg), color: bColor, opacity: bOpacity });

        const ratio = Math.max(0, u.hp / u.maxHp);
        bars.push({
          width: scale * dials.barWidth, height: dials.barHeight, up: scale * dials.barUp,
          ratio, color: barColor(ratio),
          opacityBg: enemy ? 0.25 : (isSel ? 0.35 : 0.2),
          opacityBar: enemy ? 0.55 : (isSel ? 0.65 : 0.35),
        });

        rings.push({ inner: scale * dials.ringInner, outer: scale * dials.ringOuter, segments: dials.ringSegments, opacity: isSel ? dials.ringOpacity : 0 });

        if (isSel) {
          let to = null, color = null;
          if (u.moveTarget) { to = u.moveTarget; color = dials.colors.move; }
          else if (u.guardTarget) { to = posOf(u.guardTarget); color = dials.colors.guard; }
          else if (u.attackTarget) { to = posOf(u.attackTarget); color = dials.colors.attack; }
          if (to) {
            const from = posOf(u);
            orderLines.push({
              segments: dashes(from, to, dials.dash, dials.gap), color, opacity: dials.lineOpacity,
              marker: { at: to, inner: 0.3, outer: 0.5, segments: 4 },
            });
          }
        }
      }

      const links = [];
      for (let i = 0; i < sel.list.length - 1; i++) {
        links.push({ a: sel.list[i], b: sel.list[i + 1], color: dials.colors.move, opacity: dials.linkOpacity });
      }

      return { brackets, bars, rings, orderLines, links };
    },
  };
  return sel;
}

// SELECTION_CONTRACT / checkSelectionDials: every numeric dial a number
// over 0; colors an object whose given entries are integers. Every
// problem reported at once, none thrown.
export const SELECTION_CONTRACT = {
  bracket: "number > 0", bracketArm: "number > 0",
  bigBracket: "number > 0", bigArm: "number > 0", bigAspect: "number > 0",
  barWidth: "number > 0", barHeight: "number > 0", barUp: "number > 0",
  ringInner: "number > 0", ringOuter: "number > 0", ringSegments: "number > 0", ringOpacity: "number > 0",
  dash: "number > 0", gap: "number > 0", lineOpacity: "number > 0", linkOpacity: "number > 0",
  boxDragPx: "number > 0", followMs: "number > 0",
  colors: "object of integers (move, guard, attack, enemyBracket, collectorBracket, friendBracket)",
};

const NUMERIC_DIALS = Object.keys(SELECTION_CONTRACT).filter((k) => k !== "colors");

export function checkSelectionDials(d) {
  if (!d || typeof d !== "object") return ["dials: not an object"];
  const problems = [];
  for (const name of NUMERIC_DIALS) {
    if (typeof d[name] !== "number" || !(d[name] > 0)) problems.push(`dials.${name}: number > 0 required`);
  }
  if (!d.colors || typeof d.colors !== "object") {
    problems.push("dials.colors: object required");
  } else {
    for (const name of Object.keys(d.colors)) {
      if (!Number.isInteger(d.colors[name])) problems.push(`dials.colors.${name}: integer required`);
    }
  }
  return problems;
}
