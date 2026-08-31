// games/frostline/purse.js — FL-4, the purse. Every enemy defeated pays its
// bounty, win or lose; a won contract adds the completion bonus; the purse
// buys new team types onto the roster between battles. Pure state over a
// plain object; persistence goes through an injected storage (the page
// hands in the browser's own; tests hand in a plain object) so nothing
// here touches a global. No rng anywhere.
import { SQUAD_SPECS } from "../../depot/squads.js";

export const WIN_BONUS = 25;            // provisional (F5)
export const STORE_KEY = "frostline-purse";
// The teams the debrief sells, priced by the engine's own squad table.
export const FOR_SALE = ["rifles", "mg", "sniper", "medics"];

export function makePurse() {
  // men: heads per fielded squad slot (base three first, bought teams after);
  // null means every squad at full strength. fallen: the campaign's dead.
  return { scrap: 0, earned: 0, kills: 0, roster: [], heat: 0, men: null, fallen: 0 };
}

// loadPurse(storage) -> a purse from the vault, or a fresh one. A broken
// or missing record never throws — the war starts broke, not crashed.
export function loadPurse(storage) {
  try {
    const raw = storage.getItem(STORE_KEY);
    if (!raw) return makePurse();
    const p = JSON.parse(raw);
    if (typeof p.scrap !== "number" || !Array.isArray(p.roster)) return makePurse();
    return { scrap: p.scrap, earned: p.earned || 0, kills: p.kills || 0, roster: p.roster.filter((t) => SQUAD_SPECS[t]), heat: p.heat || 0,
      men: Array.isArray(p.men) ? p.men.map((v) => Math.max(0, v | 0)) : null, fallen: p.fallen || 0 };
  } catch { return makePurse(); }
}

export function savePurse(storage, purse) {
  storage.setItem(STORE_KEY, JSON.stringify(purse));
}

// earnFromEvents(purse, war, events) -> scrap paid this call. A kill pays
// when the attacker is the player and the victim an enemy unit still on
// the books with a bounty; everything else pays nothing (the engine's own
// kill law: world and friendly fire pay nobody).
export function earnFromEvents(purse, war, events) {
  let paid = 0;
  for (const ev of events) {
    if (ev.type !== "kill" || ev.attacker !== "player" || ev.team !== 2 || ev.kind !== "unit") continue;
    const victim = war.world.byId.get(ev.id);
    const bounty = victim && victim.bounty ? victim.bounty : 0;
    if (bounty <= 0) continue;
    paid += bounty;
    purse.kills++;
  }
  purse.scrap += paid;
  purse.earned += paid;
  return paid;
}

// winBonus(purse) -> the completion bonus, credited once; the caller owns
// the once (the page pays it when the win card first shows).
export function winBonus(purse) {
  purse.scrap += WIN_BONUS;
  purse.earned += WIN_BONUS;
  return WIN_BONUS;
}

export function teamPrice(type) {
  return SQUAD_SPECS[type] ? SQUAD_SPECS[type].cost : Infinity;
}

// buyTeam(purse, type) -> true when the price was met: the team joins the
// roster and the purse pays. A dry purse refuses and changes nothing.
export function buyTeam(purse, type) {
  const price = teamPrice(type);
  if (!SQUAD_SPECS[type] || purse.scrap < price) return false;
  purse.scrap -= price;
  purse.roster.push(type);
  if (purse.men) purse.men.push(SQUAD_SPECS[type].n); // a bought team arrives at full strength
  return true;
}

// ---- FL-7: the men persist; the dead stay dead; replacements cost scrap.
export const BASE_TYPES = ["rifles", "mg", "sniper"];
export function fieldedTypes(purse) { return BASE_TYPES.concat(purse.roster); }
export function menOf(purse) {
  const types = fieldedTypes(purse);
  if (purse.men && purse.men.length === types.length) return purse.men.slice();
  return types.map((t) => SQUAD_SPECS[t].n);
}
// a man's price: his squad's own table price split by heads, rounded up
export const manPrice = (type) => Math.ceil(SQUAD_SPECS[type].cost / SQUAD_SPECS[type].n);
// recordCasualties(purse, standing): the battle's survivors onto the books;
// returns how many fell. `standing` aligns with fieldedTypes order.
export function recordCasualties(purse, standing) {
  const before = menOf(purse);
  let fell = 0;
  for (let i = 0; i < before.length; i++) fell += Math.max(0, before[i] - (standing[i] | 0));
  purse.men = standing.map((v) => Math.max(0, v | 0));
  purse.fallen += fell;
  return fell;
}
// refillCost(purse) -> the bill to bring every squad back to strength.
export function refillCost(purse) {
  const types = fieldedTypes(purse), men = menOf(purse);
  let cost = 0;
  for (let i = 0; i < types.length; i++) cost += Math.max(0, SQUAD_SPECS[types[i]].n - men[i]) * manPrice(types[i]);
  return cost;
}
// buyRefill(purse) -> true when the whole bill was met: every squad refills.
// A short purse refuses and changes nothing — replacements come as a class.
export function buyRefill(purse) {
  const bill = refillCost(purse);
  if (bill <= 0 || purse.scrap < bill) return false;
  purse.scrap -= bill;
  purse.men = null; // full strength across the board
  return true;
}
