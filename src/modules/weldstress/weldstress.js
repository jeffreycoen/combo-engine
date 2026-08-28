// modules/weldstress — weld loading, rating, and ship splitting, lifted from
// the deadweight demo (deadweight-hangar.html: in-flight loading lines
// 674-685, the split on a broken weld lines 747-768, the hangar's rated
// joint limit lines 1484-1490; verbatim math). Composes with the builder
// module: welds come from weldsOf, connectivity from connectedFrom.
//
// The law of the load: a weld carries the acceleration of the SMALLER side
// of the ship it holds on — load = |accel| * smallerSideMass * 9. Past its
// strength it breaks; whichever side lost the root becomes debris.


// weldLoads(builder, spec, list, ws, aMag) -> per-weld {load, om}; ws gains
// nothing, the caller keeps its own weld objects. Pure over its arguments.
export function weldLoads(builder, spec, list, ws, aMag) {
  return ws.map((w) => {
    const sideA = builder.connectedFrom(list, ws.filter((x) => x !== w), w.a);
    const sideB = builder.connectedFrom(list, ws.filter((x) => x !== w), w.b);
    const small = sideA.size <= sideB.size ? sideA : sideB;
    let om = 0; for (const i of small) om += spec[list[i].t].kg;
    return { load: aMag * om * 9, om };
  });
}

// ratedLimit: the hangar's number — the acceleration at which this weld
// breaks. gLim = strength / (smallerSideMass * 9).
export function ratedLimits(builder, spec, list, ws) {
  return weldLoads(builder, spec, list, ws, 1).map((r, i) => ({
    gLim: ws[i].strength / Math.max(r.om, 0.1) / 9, om: r.om,
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
