// modules/builder — the grid-ship builder, lifted from the deadweight demo
// (deadweight-hangar.html lines 348-400, verbatim math). Parts sit on integer
// grid cells; connection ports gate placement; welds join orthogonal
// neighbors; derive() turns a part list into flight properties: mass, center
// of mass, rotational inertia, thrust, torque under burn, turn authority.
//
// Generalization is by PARAMETER only: the demo's globals (SPEC, CELL,
// WELD_S, WELD_WEAK, the bridge's built-in attitude ring) become the maker's
// options; every formula is the demo's own. The spec table keeps the demo's
// role vocabulary (a row may carry thrust, tank, rcsN, weak, and the part
// types "bridge"/"engine"/"tank"/"rcs" are recognized by name in derive).

export const SPEC_ROW_CONTRACT = { kg: "number > 0", ports: "array of E|W|N|S" };

// checkSpec(spec) -> problem strings, empty when clean. Pure.
export function checkSpec(spec) {
  if (!spec || typeof spec !== "object" || Array.isArray(spec)) return ["spec: not an object"];
  const problems = [];
  const names = Object.keys(spec);
  if (!names.length) problems.push("spec: empty table");
  for (const name of names) {
    const row = spec[name];
    if (!row || typeof row !== "object") { problems.push(name + ": not an object"); continue; }
    if (!(typeof row.kg === "number" && row.kg > 0)) problems.push(name + ".kg: number > 0 required");
    if (!Array.isArray(row.ports) || row.ports.some((p) => !["E", "W", "N", "S"].includes(p)))
      problems.push(name + ".ports: array of E|W|N|S required");
  }
  return problems;
}

const DIR = { E: [1, 0], W: [-1, 0], N: [0, -1], S: [0, 1] };

export function makeBuilder(opts) {
  const spec = opts.spec;
  const problems = checkSpec(spec);
  if (problems.length) throw new Error("makeBuilder: " + problems.join("; "));
  const CELL = opts.cell ?? 4;
  const WELD_S = opts.weldStrength ?? 1200;
  const WELD_WEAK = opts.weldWeak ?? 500;
  const BRIDGE_RCS_TAU = opts.bridgeTau ?? 26;
  const BRIDGE_RCS_N = opts.bridgeRcsN ?? 5;

  const occupied = (list, gx, gy) => list.find((m) => m.gx === gx && m.gy === gy);
  const portDirs = (m) => spec[m.t].ports.map((p) => DIR[p]);

  // a cell is placeable if some neighbor's port faces it AND the new part has a port facing back
  function adjacencyOK(list, gx, gy, t) {
    for (const m of list) {
      const dx = gx - m.gx, dy = gy - m.gy;
      if (Math.abs(dx) + Math.abs(dy) !== 1) continue;
      const out = portDirs(m).some((d) => d[0] === dx && d[1] === dy);
      const back = spec[t].ports.map((p) => DIR[p]).some((d) => d[0] === -dx && d[1] === -dy);
      if (out && back) return true;
    }
    return false;
  }

  function weldsOf(list) {
    const ws = [];
    for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
      const a = list[i], b = list[j];
      if (Math.abs(a.gx - b.gx) + Math.abs(a.gy - b.gy) === 1)
        ws.push({ a: i, b: j, strength: (spec[a.t].weak || spec[b.t].weak) ? WELD_WEAK : WELD_S });
    }
    return ws;
  }

  function connectedFrom(list, ws, rootIdx) {
    const seen = new Set([rootIdx]); let ch = 1;
    while (ch) {
      ch = 0;
      for (const w of ws) {
        if (seen.has(w.a) && !seen.has(w.b)) { seen.add(w.b); ch = 1; }
        if (seen.has(w.b) && !seen.has(w.a)) { seen.add(w.a); ch = 1; }
      }
    }
    return seen;
  }

  function derive(list) {
    let m = 0, cx = 0, cy = 0;
    for (const md of list) { const kg = spec[md.t].kg; m += kg; cx += md.gx * CELL * kg; cy += md.gy * CELL * kg; }
    cx /= m; cy /= m;
    let I = 0;
    for (const md of list) { const kg = spec[md.t].kg; const r2 = (md.gx * CELL - cx) ** 2 + (md.gy * CELL - cy) ** 2; I += kg * (r2 + 3); }
    const engines = list.filter((md) => md.t === "engine");
    const tanks = list.filter((md) => md.t === "tank");
    const rcsMods = list.filter((md) => md.t === "rcs");
    let tau = list.some((md) => md.t === "bridge") ? BRIDGE_RCS_TAU : 0;
    let rcsN = list.some((md) => md.t === "bridge") ? BRIDGE_RCS_N : 0;
    for (const r of rcsMods) {
      const arm = Math.hypot(r.gx * CELL - cx, r.gy * CELL - cy);
      tau += (spec.rcs.rcsN ?? 16) * Math.max(arm, 1.8); rcsN += (spec.rcs.rcsN ?? 16);
    }
    const engF = engines.filter((e) => !(e.f || 0)), engR = engines.filter((e) => (e.f || 0) === 2);
    const thrust = spec.engine ? (spec.engine.thrust ?? 0) : 0;
    return {
      m, cx, cy, I,
      F: engF.length * thrust,
      tq: engF.reduce((a, e) => a + (-(e.gy * CELL - cy)) * thrust, 0),
      engF, engR, tau, rcsN, engines,
      fuelCap: (opts.baseFuel ?? 260) + tanks.length * (spec.tank ? (spec.tank.tank ?? 300) : 300),
    };
  }

  return { occupied, portDirs, adjacencyOK, weldsOf, connectedFrom, derive };
}
