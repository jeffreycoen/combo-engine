// MODULE: escrow — station contracts with money held in escrow, lifted
// VERBATIM MATH from the deadweight hangar demo (deadweight-hangar.html
// lines 267-302). A starving station locks part of its treasury behind a
// posted bounty; fulfilment pays the escrow once and restocks; expiry
// returns every cent to the treasury. Credits are conserved through every
// path. Pure state over plain objects; no globals, no clocks, no rng.
//
// Substitutions from the demo, numbered, and only these:
//   1. The module-scope CONTRACTS array and ctSeq/ctScan counters -> a book
//      object from makeBook(): { list, seq, scan }.
//   2. The module-scope MKT table -> the `stations` argument:
//      { [sid]: { parts: { [part]: {q, c} }, credits, cool } } — the demo's
//      station object keyed the pools directly beside credits; here the
//      pools live under `parts`, the one shape change the lift makes.
//   3. postContract's hard-coded other station (cloister/hollow pair) ->
//      the `otherSid` argument.
//   4. postRescue's trampValue(tr) and nearest-station scan -> the caller
//      passes `sid` and `value`; the fee law is the demo's line 281 exactly.
//   5. stepContracts' fixed part scan list -> the `partOrder` argument.
//   6. Function name postRescue -> postRescueAt (the scan moved out).

export function makeBook() { return { list: [], seq: 0, scan: 0 }; }

// postContract(book, stations, sid, otherSid, part): the starving station
// escrows a bounty priced off the OTHER station's spot plus the daring
// margin. Refuses under 200 — a broke station posts nothing.
export function postContract(book, stations, sid, otherSid, part) {
  const m = stations[sid];
  const other = stations[otherSid].parts[part];
  const srcSpot = other.c / Math.max(1, other.q);
  let pay = Math.ceil(srcSpot * 1.55 + 120);
  pay = Math.min(pay, m.credits);
  if (pay < 200) return;
  m.credits -= pay;
  book.list.push({ id: "C" + (++book.seq), at: sid, part, n: 1, pay, escrow: pay, t: 120, open: true });
}

// postRescueAt(book, stations, sid, value): the rescue fee — the station
// pays 600 plus 30% of the stranded value, capped by its whole treasury.
export function postRescueAt(book, stations, sid, value) {
  const m = stations[sid];
  const fee = Math.min(m.credits, 600 + Math.round(value * 0.3));
  if (fee < 200) return null;
  m.credits -= fee;
  const ct = { id: "R" + (++book.seq), kind: "rescue", at: sid, pay: fee, escrow: fee, t: 150, open: true };
  book.list.push(ct); return ct;
}

// fulfilContract(stations, ct): pays the escrow once; a part contract
// restocks its station; a second fulfil pays nothing.
export function fulfilContract(stations, ct) {
  if (!ct.open) return 0;
  ct.open = false;
  if (ct.kind !== "rescue") stations[ct.at].parts[ct.part].q += ct.n;
  const pay = ct.escrow; ct.escrow = 0;
  stations[ct.at].cool = 30;
  return pay;
}

// stepContracts(book, stations, dt, partOrder): expiry returns escrow to
// the treasury; every 60th call scans each cooled station and posts one
// contract for its first starved part.
export function stepContracts(book, stations, dt, partOrder) {
  for (const ct of book.list) if (ct.open) { ct.t -= dt;
    if (ct.t <= 0) { ct.open = false; stations[ct.at].credits += ct.escrow; ct.escrow = 0; stations[ct.at].cool = 30; } }
  for (const sid in stations) if (stations[sid].cool > 0) stations[sid].cool -= dt;
  if ((book.scan++) % 60) return;
  const sids = Object.keys(stations);
  for (const sid of sids) { const m = stations[sid];
    if (m.cool > 0) continue;
    if (book.list.some((c) => c.open && c.kind !== "rescue" && c.at === sid)) continue;
    for (const part of partOrder) {
      if (m.parts[part].q <= 1) { postContract(book, stations, sid, sids.find((o) => o !== sid), part); break; } } }
}
