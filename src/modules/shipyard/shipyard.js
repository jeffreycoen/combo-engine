// MODULE: shipyard — the deadweight hangar's grid builder laws, lifted
// VERBATIM MATH from deadweight-hangar.html: the part table (171-182), the
// grid cell and weld strengths (195, 227-229), occupancy and ports
// (347-348), the nozzle rule (349-352), next facing (353-354), placement
// adjacency (365-371), the weld list (372-377), the derived body (378-397),
// and hull connectivity (398-400). Pure functions over plain objects; no
// globals, no clocks, no rng.
//
// Substitutions from the demo, numbered, and only these:
//   1. The page-global `build` -> the `list` argument on occupied, rotLegal,
//      nextFacing, and adjacencyOK.
//   2. The render color rows (col) are dropped from the part table — the
//      module ships laws, not paint. Every other field is the demo's.
//   3. doRot/doRm/slog (wallet, pools, log lines) stay on the page; their
//      connectivity guard is connectedFrom, carried here.
//   4. derive's two dead stores (lines 390-392: an F and tq the return
//      recomputes and shadows) are dropped; the returned arithmetic is
//      untouched and twin-proven against the demo's own text.

export const SPEC = {
  bridge: { nm: "BRIDGE", kg: 4.0, price: 12000, ports: ["E", "W", "N", "S"] },
  engine: { nm: "ENGINE", kg: 6.0, price: 9000, ports: ["E", "N", "S"], thrust: 55 },
  pod: { nm: "CARGO POD", kg: 3.0, price: 4500, ports: ["E", "W", "N", "S"] },
  tank: { nm: "FUEL TANK", kg: 2.5, price: 3800, ports: ["E", "W", "N", "S"], tank: 300 },
  shield: { nm: "SHIELD GEN", kg: 5.0, price: 11000, ports: ["W"] },
  mount: { nm: "SLUG MOUNT", kg: 3.5, price: 7500, ports: ["W"], slugs: 40 },
  strut: { nm: "STRUT", kg: 0.8, price: 900, ports: ["E", "W", "N", "S"], weak: true },
  rcs: { nm: "RCS QUAD", kg: 1.2, price: 2600, ports: ["E", "W", "N", "S"], rcsN: 16 },
  rack: { nm: "MISSILE RACK", kg: 2.5, price: 6500, ports: ["W"], birds: 4 },
  grapple: { nm: "GRAPPLE", kg: 2.0, price: 5200, ports: ["W"] },
};
export const CELL = 4;
export const WELD_S = 1200, WELD_WEAK = 500;
export const BRIDGE_RCS_TAU = 26, BRIDGE_RCS_N = 5;

export function occupied(list, gx, gy) { return list.find((m) => m.gx === gx && m.gy === gy); }
export function portDirs(m) { return SPEC[m.t].ports.map((p) => ({ E: [1, 0], W: [-1, 0], N: [0, -1], S: [0, 1] }[p])); }

// rotLegal(list, md, f2): one law — the nozzle never points into the hull.
export function rotLegal(list, md, f2) {
  const ldx = [1, 0, -1, 0][f2], ldy = [0, 1, 0, -1][f2];
  const nx2 = md.gx - ldx, ny2 = md.gy - ldy;
  return !list.some((n) => n !== md && n.gx === nx2 && n.gy === ny2);
}
export function nextFacing(list, md) {
  for (let k = 1; k <= 4; k++) { const f2 = ((md.f || 0) + k) % 4;
    if (rotLegal(list, md, f2)) return f2; } return md.f || 0;
}

// adjacencyOK(list, gx, gy, t): a cell is placeable if some neighbor's port
// faces it AND the new part has a port facing back.
export function adjacencyOK(list, gx, gy, t) {
  for (const m of list) { const dx = gx - m.gx, dy = gy - m.gy;
    if (Math.abs(dx) + Math.abs(dy) !== 1) continue;
    const out = portDirs(m).some((d) => d[0] === dx && d[1] === dy);
    const back = SPEC[t].ports.map((p) => ({ E: [1, 0], W: [-1, 0], N: [0, -1], S: [0, 1] }[p])).some((d) => d[0] === -dx && d[1] === -dy);
    if (out && back) return true; }
  return false;
}

export function weldsOf(list) {
  const ws = [];
  for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
    const a = list[i], b = list[j];
    if (Math.abs(a.gx - b.gx) + Math.abs(a.gy - b.gy) === 1)
      ws.push({ a: i, b: j, strength: (SPEC[a.t].weak || SPEC[b.t].weak) ? WELD_WEAK : WELD_S }); }
  return ws;
}

export function derive(list) {
  let m = 0, cx = 0, cy = 0;
  for (const md of list) { const kg = SPEC[md.t].kg; m += kg; cx += md.gx * CELL * kg; cy += md.gy * CELL * kg; }
  cx /= m; cy /= m;
  let I = 0; for (const md of list) { const kg = SPEC[md.t].kg; const r2 = (md.gx * CELL - cx) ** 2 + (md.gy * CELL - cy) ** 2; I += kg * (r2 + 3); }
  const engines = list.filter((md) => md.t === "engine");
  const tanks = list.filter((md) => md.t === "tank");
  const rcsMods = list.filter((md) => md.t === "rcs");
  let tau = list.some((md) => md.t === "bridge") ? BRIDGE_RCS_TAU : 0;
  let rcsN = list.some((md) => md.t === "bridge") ? BRIDGE_RCS_N : 0;
  for (const r of rcsMods) { const arm = Math.hypot(r.gx * CELL - cx, r.gy * CELL - cy);
    tau += SPEC.rcs.rcsN * Math.max(arm, 1.8); rcsN += SPEC.rcs.rcsN; }
  const engF = engines.filter((e) => !(e.f || 0)), engR = engines.filter((e) => (e.f || 0) === 2);
  return { m, cx, cy, I, F: engF.length * SPEC.engine.thrust, tq: engF.reduce((a, e) => a + (-(e.gy * CELL - cy)) * SPEC.engine.thrust, 0),
    engF, engR, tau, rcsN, engines, fuelCap: 260 + tanks.length * 300,
    hasShield: list.some((md) => md.t === "shield"), mount: list.find((md) => md.t === "mount"), rack: list.find((md) => md.t === "rack"), grap: list.find((md) => md.t === "grapple"), pods: list.filter((md) => md.t === "pod").length };
}

export function connectedFrom(list, ws, rootIdx) {
  const seen = new Set([rootIdx]); let ch = 1;
  while (ch) { ch = 0; for (const w of ws) { if (seen.has(w.a) && !seen.has(w.b)) { seen.add(w.b); ch = 1; } if (seen.has(w.b) && !seen.has(w.a)) { seen.add(w.a); ch = 1; } } }
  return seen;
}
