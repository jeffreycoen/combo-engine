// modules/weldstress — weld loading, rating, and ship splitting, lifted from
// the deadweight demo (deadweight-hangar.html: in-flight loading lines
// 674-685, the split on a broken weld lines 747-768, the hangar's rated
// joint limit lines 1484-1490; verbatim math). Composes with the builder
// module: welds come from weldsOf, connectivity from connectedFrom.
//
// The law of the load: a weld carries the acceleration of the SMALLER side
// of the ship it holds on — load = |accel| * smallerSideMass * factor. Past
// its strength it breaks; whichever side lost the root becomes debris.
//
// Second pass, the general parts order, phase A11. Substitutions, and only
// these:
//   1. The literal 9 becomes LOAD_FACTOR, exported, the default factor.
//   2. weldLoads takes a last argument k, default LOAD_FACTOR, and computes
//      load: aMag * om * k.
//   3. ratedLimits takes a last argument k, default LOAD_FACTOR, calls
//      weldLoads(builder, spec, list, ws, 1, k), and computes
//      gLim: ws[i].strength / Math.max(r.om, 0.1) / k.
//   4. WELDS_CONTRACT names the welds shape; checkWelds(ws) returns every
//      problem in one pass, empty when clean.

export const LOAD_FACTOR = 9;

// weldLoads(builder, spec, list, ws, aMag, k = LOAD_FACTOR) -> per-weld
// {load, om}; ws gains nothing, the caller keeps its own weld objects. Pure
// over its arguments.
export function weldLoads(builder, spec, list, ws, aMag, k = LOAD_FACTOR) {
  return ws.map((w) => {
    const sideA = builder.connectedFrom(list, ws.filter((x) => x !== w), w.a);
    const sideB = builder.connectedFrom(list, ws.filter((x) => x !== w), w.b);
    const small = sideA.size <= sideB.size ? sideA : sideB;
    let om = 0; for (const i of small) om += spec[list[i].t].kg;
    return { load: aMag * om * k, om };
  });
}

// ratedLimit: the hangar's number — the acceleration at which this weld
// breaks. gLim = strength / (smallerSideMass * k).
export function ratedLimits(builder, spec, list, ws, k = LOAD_FACTOR) {
  return weldLoads(builder, spec, list, ws, 1, k).map((r, i) => ({
    gLim: ws[i].strength / Math.max(r.om, 0.1) / k, om: r.om,
  }));
}

// breaking(loads, ws) -> indices of welds whose load exceeds their strength
export function breaking(loads, ws) {
  const out = [];
  for (let i = 0; i < ws.length; i++) if (loads[i].load > ws[i].strength) out.push(i);
  return out;
}

// splitByRoot(builder, list, ws, rootIdx) -> { kept, welds, gone } — the
// demo's breakWeld remainder: the component holding the root stays, welds
// reindexed onto it; everything else is gone (debris is the caller's world).
export function splitByRoot(builder, list, ws, rootIdx) {
  const keep = builder.connectedFrom(list, ws, rootIdx);
  if (keep.size === list.length) return { kept: list.slice(), welds: ws.slice(), gone: [] };
  const gone = [];
  list.forEach((m, idx) => { if (!keep.has(idx)) gone.push(m); });
  const keptIdx = [...keep].sort((a, b) => a - b);
  const remap = new Map(keptIdx.map((old, idx) => [old, idx]));
  const kept = keptIdx.map((i) => list[i]);
  const welds = ws.filter((w) => remap.has(w.a) && remap.has(w.b))
    .map((w) => ({ ...w, a: remap.get(w.a), b: remap.get(w.b) }));
  return { kept, welds, gone };
}

// WELDS_CONTRACT: the weld row shape. checkWelds(ws) returns every problem
// in one pass, empty when clean.
export const WELDS_CONTRACT = { a: "integer index", b: "integer index", strength: "number > 0" };

export function checkWelds(ws) {
  const problems = [];
  if (!Array.isArray(ws)) { problems.push("welds: not an array"); return problems; }
  ws.forEach((w, i) => {
    if (!(Number.isInteger(w.a) && w.a >= 0)) problems.push(`welds.${i}.a: integer index required`);
    if (!(Number.isInteger(w.b) && w.b >= 0)) problems.push(`welds.${i}.b: integer index required`);
    if (!(typeof w.strength === "number" && w.strength > 0)) problems.push(`welds.${i}.strength: number > 0 required`);
  });
  return problems;
}
