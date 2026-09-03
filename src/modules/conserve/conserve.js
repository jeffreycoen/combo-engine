// MODULE: conserve — the deadweight hangar's books: a genesis declaration
// and the audit that proves credits, fuel, ordnance, and matter conserved
// across everything that ever trades, burns, or breaks. Lifted VERBATIM
// MATH from deadweight-hangar.html lines 254-262 and 316-344. Pure
// functions over plain objects; no globals, no clocks, no rng.
//
// Substitutions from the demo, numbered, and only these:
//   1. The module-scope GEN -> a genesis object from makeGenesis().
//   2. genesis()'s MKT walk -> genesisStations(gen, stations): the same
//      fold, the station table passed in (fuelPool/ordKg/credits keys and
//      part pools beside them, the demo's own shape).
//   3. audit()'s page-global walk (build, world.tramps, pirates, crates,
//      CONTRACTS, AUTH, FRONTIER, wreckage, debris, ship.hold, MKT) -> one
//      census object from makeCensus(seed) plus one count* helper per
//      entity class, each helper the demo's own fold with the global as an
//      argument. audit(gen, cz) carries lines 341-344 verbatim.
//   4. audit()'s accumulator initialization from the L ledger (line 317)
//      -> makeCensus({C, F, O}): the caller seeds the sums.

export function makeGenesis() { return { C0: 0, F0: 0, ORD0: 0, PARTS0: {} }; }

// genesisStations(gen, stations): every station's pools, treasury, fuel,
// and ordnance declared — the demo's genesis() fold, lines 256-261.
export function genesisStations(gen, stations) {
  for (const sid in stations) { const m = stations[sid];
    for (const k in m) { if (k === "fuelPool") { gen.F0 += m[k].q; gen.C0 += m[k].c; }
      else if (k === "ordKg") gen.ORD0 += m[k];
      else if (k === "credits") gen.C0 += m[k];
      else if (typeof m[k] !== "object") continue;
      else { gen.C0 += m[k].c; gen.PARTS0[k] = (gen.PARTS0[k] || 0) + m[k].q; } } }
}

// declare(gen, {credits, fuel, ord, parts}): the demo's inline GEN.C0+=...
// declarations, gathered behind one door.
export function declare(gen, d) {
  gen.C0 += d.credits || 0; gen.F0 += d.fuel || 0; gen.ORD0 += d.ord || 0;
  if (d.parts) for (const k in d.parts) gen.PARTS0[k] = (gen.PARTS0[k] || 0) + d.parts[k];
}

// makeCensus({C, F, O}): the audit's accumulators, seeded by the caller's
// own ledger — the demo's line 317.
export function makeCensus(seed) { return { C: seed.C || 0, F: seed.F || 0, O: seed.O || 0, P: {} }; }

// each count* helper is the demo's own fold with its global as an argument
export function countParts(cz, list, partKeyOf) { for (const md of list) cz.P[partKeyOf[md.t]] = (cz.P[partKeyOf[md.t]] || 0) + 1; }
export function countTramps(cz, tramps) { for (const tr of tramps) { cz.C += tr.credits; cz.F += tr.fuel;
  for (const k in tr.cargo) cz.P[k] = (cz.P[k] || 0) + tr.cargo[k]; } }
export function countPirates(cz, pirates, crates) {
  for (const pi of pirates) { cz.C += pi.credits; cz.F += pi.fuel; }
  for (const cr of crates) { cz.C += cr.credits; cz.F += cr.fuelU; } }
export function countEscrow(cz, contracts) { for (const ct of contracts) cz.C += ct.escrow; }
export function countPurse(cz, purse) { cz.C += purse.credits; cz.F += purse.fuel || 0; }
export function countWreckage(cz, wreckage, partKeyOf) {
  for (const wk of wreckage) { if (wk.t) cz.P[partKeyOf[wk.t]] = (cz.P[partKeyOf[wk.t]] || 0) + 1;
    cz.C += wk.credits || 0; cz.F += wk.fuelU || 0; } }
export function countStations(cz, stations) {
  for (const sid in stations) { const m = stations[sid];
    for (const k in m) { if (k === "fuelPool") { cz.F += m[k].q; cz.C += m[k].c; }
      else if (k === "ordKg") cz.O += m[k];
      else if (k === "credits") cz.C += m[k];
      else if (typeof m[k] !== "object") continue;
      else { cz.C += m[k].c; cz.P[k] = (cz.P[k] || 0) + m[k].q; } } }
}

// audit(gen, cz): the verdict — the demo's lines 341-344, verbatim.
export function audit(gen, cz) {
  const cD = cz.C - gen.C0, fD = cz.F - gen.F0, oD = cz.O - gen.ORD0;
  let pD = 0; for (const k in gen.PARTS0) pD += Math.abs((cz.P[k] || 0) - gen.PARTS0[k]);
  return { cD, fD: +fD.toFixed(6), oD: +oD.toFixed(6), pD, ok: cD === 0 && Math.abs(fD) < 1e-6 && Math.abs(oD) < 1e-9 && pD === 0 };
}
