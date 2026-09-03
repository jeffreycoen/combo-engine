// src/depot/intel.js — the bureau's field-recon desk. Reads the attacker's
// last committed buy (a planWave return, one full wave old — see state.js's
// intelPlan handoff) and the live regiment, and files short recon prose.
// Never speculates past what a listening post or a captured man could say.
// Never lies: a family's condition must be materially true or it stays
// silent — the RNG only ever SILENCES a true line, it never invents or
// alters one. No digits in any emitted line, ever (mechanically enforced by
// scripts/depot-test.mjs's regex over 200 seeded compositions).

// strengthWord(n) -> word bucket, no digits ever leave this module.
export function strengthWord(n) {
  if (n <= 3) return "a handful";
  if (n <= 8) return "a squad's worth";
  if (n <= 15) return "in number";
  return "company strength";
}
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

const totalUnits = (buys) => (buys || []).reduce((s, b) => s + b.n, 0);
const buyOf = (buys, type) => (buys || []).find((b) => b.type === type);

// Line pools — 3 workshopped variants per family so repeat encounters don't
// read canned. {strength}/{Strength} are the only placeholders; substituted
// with strengthWord output (words only, never counts).
const ARMOR = [
  "Rail offload observed after dark. Engine noise, {strength}.",
  "Track marks fresh past the tree line. Armor present, {strength}.",
  "Flatcars logged at the spur, tarped. Loadout consistent with armor, {strength}.",
];
const SURGE = [
  "Muster fires counted beyond the ridge. {Strength} under canvas.",
  "Assembly area lit past dusk. {Strength} standing to.",
  "Column noise on the frozen road, {strength}, moving toward muster.",
];
const BANKING = [
  "Enemy expenditure below establishment. Purpose unassessed.",
  "Requisition traffic light this cycle. Reserve accumulation suspected.",
  "Quartermaster wagons idle at the yard. Stores withheld, purpose unassessed.",
];
const REGIMENT_LOW = [
  "Deserter interview: companies filing understrength.",
  "Two deserters taken at the wire. Billets reported thinning.",
  "Prisoner statement: sick list lengthening, replacements not arriving.",
];
const SAPPERS = [
  "Stores manifest intercepted: fuse wire, satchel canvas.",
  "Engineer stores logged moving forward: wire cutters, demolition charges.",
  "Captured requisition slip: breaching charges, quantity withheld.",
];

const MARKSMAN = [
  "Marksman activity reported forward of the line.",
  "Single-shot reports at long interval. Pattern deliberate.",
  "A scope flash logged at the ridge. Range disputed.",
];

// P7 T8: THE COMMANDER — the bureau's read on the enemy's own armor doctrine
// (ai.js's cmdrOf/cmdrBellOrders), keyed by S.cmdr. Digit-free, three
// variants per profile, same silence rule as every other family. Not tied
// to any buy — a standing read on a hidden profile, not a one-wave report.
const COMMANDER = {
  cautious: ["Their armor idles under nets. The commander counts his ground.",
             "Engine warm-ups logged, no movement. A patient hand opposite.",
             "Armor holds the yard. Doctrine reads deliberate."],
  bold:     ["Track noise forward with the infantry. Their armor rides the assault.",
             "The commander opposite leads with steel. Expect armor early.",
             "Armor seen at the muster line, engines hot."],
  stubborn: ["Their armor has not moved in days. Dug in at the yard.",
             "The commander opposite will not risk his steel. It guards the gate.",
             "Armor static under guard. It is not coming."],
};

const GAP_CHANCE = 0.25; // seeded silence — see composeIntel's draw order below

// composeIntel(prevPlan, reg, rng) -> string[] (0-3 lines)
// prevPlan is the ONE-WAVE-OLD planWave() return (state.js buffers this —
// intel at stall n reports the buy that governed wave n-1, not the wave
// that just fought). null/undefined prevPlan (run's first wave, or
// useTable runs with no regiment) silently drops every plan-keyed family.
//
// Draw order (fixed, so a seeded rng fixture is reproducible): families are
// checked in this order — armor, surge, banking, regiment-low, sappers.
// A family whose condition is false consumes NO draws. A family whose
// condition is true consumes exactly one gap draw (25% silent, never
// altered), then — only if not silenced — one more draw to pick among its
// line variants. Collection stops once 3 lines are held; later true
// families still consume no draws once stopped, since they're never
// reached (early-exit before the condition check).
export function composeIntel(prevPlan, reg, rng, cmdr) {
  const lines = [];
  const buys = prevPlan && prevPlan.buys;

  const tryFamily = (active, pool, strength) => {
    if (lines.length >= 3) return;
    if (!active) return;
    const gapRoll = rng();
    if (gapRoll < GAP_CHANCE) return; // silence — the line is dropped, never rewritten
    const pick = pool[Math.floor(rng() * pool.length) % pool.length];
    const word = strength != null ? strengthWord(strength) : null;
    const line = word == null ? pick : pick.replace("{strength}", word).replace("{Strength}", cap(word));
    lines.push(line);
  };

  const armorBuy = buys && buyOf(buys, "tank");
  tryFamily(!!(armorBuy && armorBuy.n > 0), ARMOR, armorBuy && armorBuy.n);

  const infantryTotal = buys ? totalUnits(buys) - (armorBuy ? armorBuy.n : 0) : 0;
  tryFamily(!!(buys && prevPlan.banked === false && infantryTotal >= 12), SURGE, infantryTotal);

  tryFamily(!!(prevPlan && prevPlan.banked === true), BANKING, null);

  tryFamily(!!(reg && reg.heads0 && reg.heads < 0.4 * reg.heads0), REGIMENT_LOW, null);

  const sapperBuy = buys && buyOf(buys, "sapper");
  tryFamily(!!(sapperBuy && sapperBuy.n > 0), SAPPERS, null);

  // marksman (Task 4D): sniper purchases, same 1-wave delay as everything
  // above (prevPlan key), same 25% gap. APPENDED LAST in the draw order so
  // every previously-seeded composition is byte-identical.
  const sniperBuy = buys && buyOf(buys, "sniper");
  tryFamily(!!(sniperBuy && sniperBuy.n > 0), MARKSMAN, null);

  // P7 T8: the commander family — APPENDED LAST in draw order (a run with no
  // cmdr arg, every existing caller, is byte-stable: `active` is false and
  // the family consumes no draw at all).
  tryFamily(!!(cmdr && COMMANDER[cmdr]), COMMANDER[cmdr] || [], null);

  return lines;
}

// openingIntel(reg) -> single-line strength estimate for the run's first
// dispatch. Words only, per the campaign's no-digits rule. Keyed off
// heads0 (the regiment's starting muster) since heads depletes at buy time
// across the run and the opening estimate is a scale read, not a live count.
export function openingIntel(reg) {
  const h = (reg && (reg.heads0 != null ? reg.heads0 : reg.heads)) || 0;
  let word;
  if (h < 360) word = "understrength";
  else if (h <= 440) word = "at establishment";
  else word = "reinforced";
  return `Regimental strength estimate: ${word}.`;
}
