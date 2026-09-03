// src/depot/economy.js — the attacker's books + the book-value verdict.
// Pure state-in/state-out; rng only in makeRegiment (exactly 2 draws).
import { holderAt, EMIT } from "../../depot/territory.js";

const TOWN_PAY = 4; // scrap/scrap per standing building per wave (Task 5 may retune)

// Town pay at stall: every standing (non-ruined) town building pays its
// holder — green ground pays the player scrap, red ground pays the
// attacker's regiment, seam ground pays nobody. `buildings` is DepotGame's
// own buildTown() output ({x, z, ruined}); reused as-is rather than
// duplicated here. Returns the two deltas so the caller (DepotGame.jsx)
// applies them to S.resources / S.reg.scrap — this stays pure/testable.
export function payTown(buildings, T) {
  let player = 0, regiment = 0;
  for (const b of buildings) {
    if (b.ruined || b.marker) continue; // mk2.63: markers pay nobody (the field walls' standing; the well is a building and pays)
    const h = holderAt(T, b.x, b.z);
    if (h === 1) player += TOWN_PAY;
    else if (h === 2) regiment += TOWN_PAY;
  }
  return { player, regiment };
}

export function makeRegiment(rng) {
  // seed-varied strength: 300-500 heads, 8-14 tanks; 2 rng draws, always.
  const heads = 300 + Math.floor(rng() * 201);
  const tanks = 8 + Math.floor(rng() * 7);
  return { heads, tanks, heads0: heads, tanks0: tanks, scrap: 60 };
}

export const STIPEND = 90; // mk2.49 (owner): RETIRED FROM THE BELL — income is the per-second clock, both sides, ground-scaled (groundRate below). The constant stands as the fixtures' floor-income shorthand (1/second x the 90-second bell) and for the one source pin that guards it.

// THE GROUND PAYS (mk2.49, owner): income is the clock, scaled by held
// ground — one law, one schedule, both sides. INCOME_CELLS is the ground
// worth 1 scrap/second: one full depot-emitter disc of territory cells
// (radius EMIT.depot.r, cell area 4 m^2) — a shared number derived from
// the same table both depots emit with, so neither side's divisor can
// drift. groundRate never falls under 1 (owner: the floor) and scales
// continuously above it, fractions included.
export const INCOME_CELLS = Math.round(Math.PI * EMIT.depot.r * EMIT.depot.r / 4);
export function groundRate(heldCells) {
  return Math.max(1, heldCells / INCOME_CELLS);
}

// THE KILL CUT (owner, 2026-08-20): the fraction of a victim's live market
// price the killing side banks. The score ledger takes the whole price;
// the books take this cut of it. // provisional (F5)
export const KILL_CUT = 0.30;

export const RESULTS = {
  // uncapped by decision (Jeff)
  structureDmg: 0.06, // scrap per hp of wall/tower damage dealt
  buildingKill: 8, // town buildings carry no market price — the law's named edge, hand-set
  leak: 10,
};

export function payResults(reg, ev) {
  // ev: {structureDmg, buildingKills, leaks} — tower and wall kills pay
  // through the kill law now (state.js scoreKill), never twice.
  const won = ev.structureDmg * RESULTS.structureDmg
    + ev.buildingKills * RESULTS.buildingKill + (ev.leaks || 0) * RESULTS.leak;
  reg.scrap += won;
  if (won > 0) reg.earned = (reg.earned || 0) + won; // mk2.53: the earned muster's till — a zero credit accrues NOTHING (a defined 0 would defeat the fixtures' curve fallback)
}

export function combatIneffective(reg) {
  // attrition victory threshold
  return reg.heads < 0.12 * reg.heads0 && reg.tanks === 0;
}

// bookValue({scrap, assets}) -> number
// Contract: total book value = scrap on hand + assets, where `assets` is a
// single number the CALLER computes ahead of time as
//   assets = Σ over owned builds of (build cost / purchase price)
// i.e. assets is already a total, not a list to reduce here. Kept trivial
// and total on purpose — no per-item bookkeeping lives in this function.
export function bookValue({ scrap, assets }) {
  return scrap + assets;
}
