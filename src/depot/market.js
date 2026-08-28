// COLDSNAP DEPOT — market.js: the living market (mk1.13, owner's rulings).
// Every purchasable belongs to a TYPE FAMILY; a family's price is its base
// cost times min(4, 1 + standing/K) — both armies' standing stock counted
// together, one shared table both sides pay. Pure counting and arithmetic:
// no rng, no world mutation, recomputed each second by the game layer.
import { TOWER_SPECS, ENEMY_SPECS, TANK, BISON, APC, MECH } from "./specs.js";
import { SQUAD_SPECS } from "./squads.js";

// THE TWO WALLS (mk1.20, owner's rulings): both pressures are the same
// asymptotic wall, wall(n, pole) = pole/(pole - n), clamped at 50x.
// The TYPE wall's pole is twice the type's K — the doubling point stays at
// K exactly as before, but the curve goes vertical approaching 2K (the old
// flat 4x cap is dead). The FIELD wall's pole is 88 living men, both
// armies — just past the mk1.19 ramp's confirmed 80: 11x at the measured
// limit, 22x at 84, 50x beyond. The last slots on the field cost like the
// last seats on the plane. // provisional (F5), every number
export const MARKET_KG = 88;
export const WALL_CLAMP = 50;
// K: the standing count at which a family's price doubles. // provisional (F5)
export const MARKET_K = {
  rifles: 16, marksman: 4, sapper: 4, mortarcrew: 6, mgteam: 6, engineer: 6,
  rocketteam: 6, grenadier: 8, tank: 3,
  mgtower: 4, guntower: 4, mortartower: 3, rockettower: 3, teslatower: 4,
  wall: 30, sandbag: 40,
  // P7 T9 set the hero tier at K 1 — one hull doubled, two hit the clamp.
  // SUPERSEDED KNOWINGLY (owner, 2026-08-21, mk1.95): hero prices behave
  // like every other price, symmetrically — K 3, the tank family's machine
  // precedent. One shared table, both sides' iron, unchanged below.
  heroBison: 3, heroApc: 3,
  heroMech: 3, // provisional (F5)
  // P7 T10 (owner): mine/wire families — a per-side budget rides the market
  // so a mine war stays under the engine ceiling. Both sides' LIVE devices
  // count together, one shared table (provisional F5).
  mine: 12, wire: 16,
  medic: 6, // P7.2 T6 // provisional (F5)
  mechanic: 6, // P7.2 T7 // provisional (F5)
  davy: 2, // mk2.08 — nukes double fast // provisional (F5)
};
const FAMILY_OF_SQUAD = { rifles: "rifles", sniper: "marksman", sappers: "sapper", mortars: "mortarcrew", mg: "mgteam", engineers: "engineer", rockets: "rocketteam", grenadiers: "grenadier", medics: "medic", mechanics: "mechanic", davy: "davy" };
const FAMILY_OF_TAG = { "": "rifles", sniper: "marksman", sapper: "sapper", gren: "grenadier", rocket: "rocketteam", mortar: "mortarcrew", mg: "mgteam", eng: "engineer", medic: "medic", mechanic: "mechanic", davy: "davy" };
const FAMILY_OF_TOWER = { mg: "mgtower", gun: "guntower", mortar: "mortartower", rocket: "rockettower", tesla: "teslatower" };

// marketCounts(world, squads, mines) -> { family: standing count }. Men for
// infantry families (live bodies), things for the rest. One pass over
// world.bodies plus the squads array; deterministic. `mines` (P7 T10,
// optional) is the game layer's own S.mines watched-point list — this
// module stays pure and never imports mines.js (module purity), so the
// caller hands the live list in and marketCounts just counts it, both
// sides together, same as every other family.
export function marketCounts(world, squads, mines) {
  const c = {};
  const add = (fam, n) => { if (fam) c[fam] = (c[fam] || 0) + n; };
  for (const sq of squads || []) {
    let live = 0;
    for (const id of sq.memberIds) { const u = world.byId.get(id); if (u && u.alive) live++; }
    add(FAMILY_OF_SQUAD[sq.type], live);
  }
  for (const b of world.bodies) {
    if (!b.alive) continue;
    if (b.kind === "unit") c._men = (c._men || 0) + 1; // both armies — squad men are unit bodies too
    if (b.kind === "unit" && b.team === 2) add(FAMILY_OF_TAG[b.tag || ""], 1);
    else if (b.kind === "vehicle" && b.team === 2 && b.tag === "tank") add("tank", 1); // P7 T2: only wave armor prices the tank family
    // P7 T9: THE HERO TIER — one shared market, BOTH teams' standing hulls
    // count into the same family (the wall that makes a second hero absurd
    // has to see both sides' iron).
    else if (b.kind === "vehicle" && b.vtype === "bison") add("heroBison", 1);
    else if (b.kind === "vehicle" && b.vtype === "apc") add("heroApc", 1);
    else if (b.kind === "mech" && b.alive) add("heroMech", 1);
    else if (b.kind === "tower" && FAMILY_OF_TOWER[b.towerType]) add(FAMILY_OF_TOWER[b.towerType], 1);
    else if (b.kind === "wall" && !b.course) add("wall", 1);
    else if (b.kind === "chunk" && b.sandbag) add("sandbag", 1);
  }
  // P7 T10: mine/wire, both sides' LIVE devices together.
  for (const m of mines || []) { if (m.live) add(m.kind === "wire" ? "wire" : "mine", 1); }
  return c;
}

const wall = (n, pole) => {
  const m = Math.min(n, pole - 1); // stay off the pole
  return Math.min(WALL_CLAMP, pole / (pole - m));
};
// exported (P7 T10) so mines.js's minePrices can ride the exact same curve
// (module purity: mines.js has no reason to reimplement the wall formula).
export const priced = (base, fam, counts) =>
  Math.max(1, Math.round(base * wall(counts[fam] || 0, 2 * MARKET_K[fam]) * wall(counts._men || 0, MARKET_KG)));

// computePrices(counts) -> { player: {barKey: price}, foe: {tag: price} } —
// the one shared table, read by the bar, the manifest, every purchase
// commit, the engineer field costs, and the enemy's planWave.
export function computePrices(counts) {
  const player = {};
  for (const k in FAMILY_OF_TOWER) player[k] = priced(TOWER_SPECS[k].cost, FAMILY_OF_TOWER[k], counts);
  for (const t in FAMILY_OF_SQUAD) player["sq_" + t] = priced(SQUAD_SPECS[t].cost, FAMILY_OF_SQUAD[t], counts);
  // P7 T9: THE HERO TIER — one price table, both sides, off the specs' own cost.
  player.hero_bison = priced(BISON.cost, "heroBison", counts);
  player.hero_apc = priced(APC.cost, "heroApc", counts);
  player.hero_mech = priced(MECH.cost, "heroMech", counts);
  const foe = {};
  for (const t in FAMILY_OF_TAG) foe[t] = priced(ENEMY_SPECS[t].bounty, FAMILY_OF_TAG[t], counts);
  foe.tank = priced(TANK.bounty, "tank", counts);
  foe.hero_bison = priced(BISON.cost, "heroBison", counts);
  foe.hero_apc = priced(APC.cost, "heroApc", counts);
  foe.hero_mech = priced(MECH.cost, "heroMech", counts);
  return { player, foe, counts };
}

// field-piece prices for the engineer lines (wall stacks / bags), same curve.
export function fieldPrices(counts, wallBase, bagBase) {
  return { wall: priced(wallBase, "wall", counts), bag: priced(bagBase, "sandbag", counts) };
}

// THE KILL PRICE (owner, 2026-08-20): what one death is worth — the victim's
// live market price at the moment it dies, resolved from the kill event's own
// identity fields (core.js stamps them under depotCombat). Men price per
// head: a squad-family price over the men one buy fields (the sniper-pair
// split generalized). Machines and masonry price whole; `counted` marks what
// joins the kill integer (men and machines — masonry rides the value alone).
// Unpriced things — town stones, flags, loose rubble — return null: the law
// cannot reach them. wallBase/bagBase are threaded in like fieldPrices' own
// (module purity — state.js owns those two numbers).
export function killPrice(ev, counts, wallBase, bagBase) {
  const c = counts || {};
  if (ev.kind === "unit") {
    if (ev.team === 2) {
      const tag = ev.tag || "";
      const fam = FAMILY_OF_TAG[tag];
      const spec = ENEMY_SPECS[tag];
      if (!fam || !spec) return null;
      const per = tag === "sniper" || tag === "davy" ? 2 : 1; // one buy fields two men — sniper pair, atomic crew
      return { price: priced(spec.bounty, fam, c) / per, counted: true };
    }
    const sp = SQUAD_SPECS[ev.utype];
    const fam = FAMILY_OF_SQUAD[ev.utype];
    if (!sp || !fam) return null;
    return { price: priced(sp.cost, fam, c) / sp.n, counted: true };
  }
  if (ev.kind === "mech") return { price: priced(MECH.cost, "heroMech", c), counted: true };
  if (ev.kind === "vehicle") {
    if (ev.vtype === "bison") return { price: priced(BISON.cost, "heroBison", c), counted: true };
    if (ev.vtype === "apc") return { price: priced(APC.cost, "heroApc", c), counted: true };
    if (ev.tag === "tank") return { price: priced(TANK.bounty, "tank", c), counted: true };
    return null;
  }
  if (ev.kind === "tower") {
    const fam = FAMILY_OF_TOWER[ev.towerType];
    if (!fam) return null;
    return { price: priced(TOWER_SPECS[ev.towerType].cost, fam, c), counted: false };
  }
  if (ev.kind === "wall") return { price: priced(wallBase, "wall", c), counted: false };
  if (ev.kind === "chunk" && ev.sandbag) return { price: priced(bagBase, "sandbag", c), counted: false };
  return null;
}
