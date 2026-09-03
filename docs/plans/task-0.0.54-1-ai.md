# Task 0.0.54-1 — ai carved out

One job: move `ai` into its own module and leave the depot a one-line front door. Write exactly what is written, run the listed gates, report. You design nothing.

Suggested model: Sonnet 5.

Required reading, in order (confirm at the top of your report):
1. This file, whole.
2. `docs/plans/phase-0.0.54-ai.md`, whole.

## Steps

Run from `/home/batman/combo-engine`. A failed assert stops the task; report the step and its verbatim output, run nothing further.

1. Assert the ground:

```sh
sha256sum src/depot/ai.js   # must print 1a76037bc6305cec8e81bc9c3deaf77f7282ea2d9bd31c97b141d2f00813dd6f
node scripts/gate.mjs combat | tail -1   # must print: ALL PASS
ls src/modules/ai 2>/dev/null || echo absent   # must print: absent
mkdir -p src/modules/ai
```

2. Write `src/modules/ai/ai.js`, exactly (the source file with its import paths rewritten — the one substitution):

```js
// src/depot/ai.js — the attacker's buy brain. One fixed doctrine, blended
// counter-weights (never a pure counter), tank-push/surge banking. Pure:
// (regiment, buildSnapshot, bell, rng, tags) -> {buys, banked}. Mutates reg
// (heads/tanks/scrap depletion IS the purchase — see brief) but takes no
// other state; identical inputs (incl. rng stream) yield identical output.
// Since P1 Task 1 this is the ONLY composer of an assault — the static WAVES
// table is gone; size comes from the bell index and roster from the tier caps
// state.js's enemyTierState hands in.
import { ENEMY_SPECS, TANK } from "../../depot/specs.js";

// Infantry types this brain shops from (ENEMY_SPECS keys, minus the boss).
const INF_TYPES = ["", "rocket", "gren", "sapper", "mortar"];
const cost = (type) => (type === "tank" ? TANK.bounty : ENEMY_SPECS[type].bounty);

const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);

// bellBudget(bell) — baseline scrap-spend ramp: ~20 at the first bell, ~120
// by bell 50. Curve shape is tunable (F5 owns it); export kept so callers/
// tests can reference the same baseline the brain uses.
// mk2.53: superseded as the LIVE baseline by reg.earned (THE EARNED MUSTER);
// stands as the fixture fallback and the pre-income-era reference curve.
export function bellBudget(bell) {
  const w = Math.max(0, bell);
  return 20 + 100 * Math.pow(Math.min(w, 50) / 50, 0.85) + Math.max(0, w - 50) * 0.6;
}

// spawnDelayFor(bell) — seconds between men leaving the spawn points. Same
// ramp the deleted WAVES table carried (0.9s at the first bell, floored at
// 0.18s), now read off the bell index. // provisional (F5)
export function spawnDelayFor(bell) {
  return Math.max(0.18, 0.9 - Math.max(0, bell) * 0.014);
}

// MIN_WAVE_FLOOR — the smallest muster still worth calling: 4 bare
// conscripts (ENEMY_SPECS[""].bounty each). Below this, reg.scrap can't even
// buy the cheapest possible wave (a wave with as few as one live body still
// makes the attacker "field" something), so scrap under the floor is read
// as genuine economic paralysis rather than a doctrine choosing to bank
// (see state.js's "spent offensive" trigger, Phase 3 Task 8). 4 is
// deliberately small — this must only fire when the attacker truly can't
// afford a token muster, not merely a thin one.
export const MIN_WAVE_FLOOR = 4 * cost("");

// snapSquads: count of live player squads from the build snapshot.
// DepotGame's buildSnapshot supplies `squads` (S.squads filtered to squads
// holding a live member). Tolerates absent/null snap for old fixtures.
export function snapSquads(snap) {
  return (snap && snap.squads) || 0;
}

// Counter-weight signals from the build snapshot, each 0..1.
function signals(snap) {
  return {
    mortar: clamp01((snap.mortars || 0) / 6),
    wall: clamp01((snap.walls || 0) / 8),
    tesla: clamp01((snap.teslas || 0) / 5),
    mg: clamp01((snap.mgs || 0) / 8),
  };
}

function dominantCounter(sig) {
  let best = null, bestV = 0.15; // deadband: no dominant signal below this
  for (const k of ["mortar", "wall", "tesla", "mg"]) {
    if (sig[k] > bestV) { bestV = sig[k]; best = k; }
  }
  return best;
}

// Blended infantry shares (sum to 1) + a separate tank-preference scalar.
// Base doctrine, then additive counter deltas, then renormalized — additive
// deltas only ever push shares up, so renormalizing dilutes everything
// else proportionally: a blend, never a pure hard-counter swap.
// mk2.02 (owner): the roster surgery — rockets take the fast seat, the
// mortar team joins, sappers inherit the heavy's wall signal (the breach
// role). // provisional (F5)
function computeShares(snap, jitter) {
  const sig = signals(snap);
  const base = { "": 0.30, rocket: 0.175, gren: 0.175, sapper: 0.175, mortar: 0.175 };
  const raw = { ...base };
  raw.rocket += 0.35 * sig.mortar;
  raw.sapper += 0.22 * sig.wall;
  raw.sapper += 0.18 * sig.wall;
  raw.gren += 0.30 * sig.tesla; // the enemy still counters coil clusters with spread grenadiers
  // small deterministic jitter (bounded, well under counter-delta scale)
  // so the doctrine isn't perfectly rigid without swamping the counters.
  const j = (jitter - 0.5) * 0.06;
  raw.rocket = Math.max(0.02, raw.rocket + j);
  raw.gren = Math.max(0.02, raw.gren - j);
  const sum = raw[""] + raw.rocket + raw.gren + raw.sapper + raw.mortar;
  const shares = {};
  for (const t of INF_TYPES) shares[t] = raw[t] / sum;
  shares.tankPref = sig.mg; // 0..1, drives tank eagerness outside banking too
  return shares;
}

// Shares restricted to the tier-open types, renormalized so a capped roster
// still spends its whole budget (an early bell puts everything into
// conscripts rather than banking the runners' share). Pure, no draws — the
// jitter that shaped `shares` was drawn before any of this.
function tierShares(shares, types) {
  let sum = 0;
  for (const t of types) sum += shares[t];
  const out = {};
  for (const t of types) out[t] = sum > 0 ? shares[t] / sum : 1 / types.length;
  return out;
}

// Spend `budget` scrap across `types` by share, respecting reg.heads and
// reg.scrap; appends/merges into `buys`. Never goes negative. `price` is the
// per-type cost function — the market's live price when priceOf is threaded
// in from planWave, otherwise the base cost() default.
function buyInfantryMix(shares, types, budget, reg, buys, price) {
  const spend = Math.max(0, Math.min(budget, reg.scrap));
  let spent = 0;
  const take = (type, n) => {
    if (n <= 0) return;
    const c = price(type);
    reg.heads -= n;
    reg.scrap -= n * c;
    spent += n * c;
    const existing = buys.find((b) => b.type === type);
    if (existing) existing.n += n; else buys.push({ type, n });
  };
  for (const type of types) {
    if (spent >= spend || reg.heads <= 0) break;
    const c = price(type);
    const alloc = spend * shares[type];
    take(type, Math.min(Math.floor(alloc / c), reg.heads, Math.floor(reg.scrap / c)));
  }
  // Spend-down pass (playtest fix, 2026-08-10): the share pass floors each
  // type's allocation by its unit cost with no rollover, so a small budget
  // (waves 1-4, spend ~= 24) leaves ~80% unspent and fields one conscript —
  // or nobody at all — while the regiment is solvent. Roll the combined
  // remainder into the cheapest affordable types (cost-ascending) so any
  // budget >= one conscript's cost always fields something.
  for (const type of types.slice().sort((a, b) => price(a) - price(b))) {
    if (reg.heads <= 0) break;
    const c = price(type);
    take(type, Math.min(Math.floor((spend - spent) / c), reg.heads, Math.floor(reg.scrap / c)));
  }
}

// Marksman counter-buy (Task 4D): player squads on the field make a
// sniper (ENEMY_SPECS.sniper, 30 scrap of regiment head) worth fielding.
// Mirrors buyTanks' shape; one head per sniper.
function buySnipers(n, reg, buys, price) {
  const c = price("sniper");
  const take = Math.min(Math.max(0, n), reg.heads, Math.floor(reg.scrap / c));
  if (take <= 0) return 0;
  reg.heads -= take;
  reg.scrap -= take * c;
  const existing = buys.find((b) => b.type === "sniper");
  if (existing) existing.n += take; else buys.push({ type: "sniper", n: take });
  return take;
}

function buyTanks(n, reg, buys, price) {
  const c = price("tank");
  const take = Math.min(Math.max(0, n), reg.tanks, Math.floor(reg.scrap / c));
  if (take <= 0) return 0;
  reg.tanks -= take;
  reg.scrap -= take * c;
  const existing = buys.find((b) => b.type === "tank");
  if (existing) existing.n += take; else buys.push({ type: "tank", n: take });
  return take;
}

// planWave(reg, snap, bell, rng, tags, priceOf) -> {buys:[{type,n}], banked}
// Exactly 4 rng() draws, ALWAYS, on every branch — multiplayer contract:
// both clients must consume the identical rng stream length regardless of
// which path (bank/erupt/normal) this assault takes, or later bells desync.
//   draw 1: spend jitter        draw 2: share jitter
//   draw 3: thin-screen / tank-push size roll   draw 4: reserved (escort mix)
// All four are drawn up front, before any branch reads them, so the tier cap
// clamps what the draws BUY and never how many draws happen — the same
// draw-then-clamp discipline the rest of the depot lives under.
//
// tags: the tier cap (state.js's enemyTierState().tags) — every ENEMY_SPECS
// tag this bell's assault may contain, "tank" included. null/omitted means
// ungated (probes and fixtures that don't model the ladder).
//
// priceOf: mk1.13, the living market — the enemy's own per-type price
// function (src/depot/market.js's computed foe table), threaded down to
// every buy helper. null/omitted (every existing caller) falls back to the
// base cost() this module always used — byte-identical behavior.
export function planWave(reg, snap, bell, rng, tags = null, priceOf = null) {
  const price = priceOf || cost;
  const jitterSpend = 0.85 + rng() * 0.15; // 1
  const jitterShare = rng();               // 2
  const sizeRoll = rng();                  // 3
  rng();                                   // 4 — reserved, kept for stream parity

  const allow = tags ? (t) => tags.indexOf(t) >= 0 : () => true;
  const infTypes = INF_TYPES.filter(allow);
  const tanksOpen = allow("tank");
  const snipersOpen = allow("sniper");

  // mk2.53 (owner): THE EARNED MUSTER — the budget is what the ground paid
  // since the last bell (reg.earned, accrued at every credit site, zeroed by
  // fireBell after the spend). A regiment with no accumulator — every test
  // fixture, an old save's first resumed bell — takes the old curve exactly.
  const baseline = reg.earned != null ? reg.earned : bellBudget(bell);
  const shares = tierShares(computeShares(snap, jitterShare), infTypes);
  const sig = signals(snap);
  const dominant = dominantCounter(sig);
  // tankPref rides on the signal, not the share table — read it before the
  // renormalization above drops it.
  const tankPref = sig.mg;

  const buys = [];
  let banked = false;

  // Marksman counter-weight: modest and deterministic (NO rng draw — the
  // 4-draw stream contract stays intact). At >=2 live player squads, once
  // the marksman's tier is open, one sniper goes forward per bell, provided
  // the buy leaves at least a token muster's scrap behind. Banking bells skip
  // it (a thin screen doesn't carry a scope). 3+ squads reads as saturation
  // and is still one sniper — they're 45 scrap of regiment head each.
  const sniperWanted = snipersOpen && snapSquads(snap) >= 2 &&
    reg.scrap >= price("sniper") + MIN_WAVE_FLOOR ? 1 : 0;

  const bankThreshold = 1.8 * baseline;
  if (reg.scrap > bankThreshold) {
    const goal = dominant === "mg" ? "tankPush" : "surge";
    const tankC = price("tank");
    const surgeThreshold = 2.2 * baseline;
    const tankPushReady = tanksOpen && reg.tanks >= 2 && reg.scrap >= 2 * tankC;
    // Saturated wall pressure (a fully fortified position, signals.wall at
    // its clamp01 ceiling) reads as desperate — the doctrine skips the
    // patient 2.2x surge wait and throws whatever's banked at the wire now.
    // Only ever fires at the signal's max (walls >= 8), so a moderate
    // defense (median-strength builds) never trips it — only a maxed-out
    // wall count does.
    const desperate = dominant === "wall" && sig.wall >= 0.999;
    const erupt = goal === "tankPush" ? tankPushReady : (desperate || reg.scrap >= surgeThreshold);

    if (erupt && goal === "tankPush") {
      if (sniperWanted) buySnipers(sniperWanted, reg, buys, price);
      const want = 2 + Math.floor(sizeRoll * 3); // 2..4
      buyTanks(want, reg, buys, price);
      const screenBudget = Math.min(reg.scrap, baseline);
      buyInfantryMix(shares, infTypes, screenBudget, reg, buys, price);
      banked = false;
    } else if (erupt) {
      if (sniperWanted) buySnipers(sniperWanted, reg, buys, price);
      const spend = reg.scrap * jitterSpend;
      buyInfantryMix(shares, infTypes, spend, reg, buys, price);
      banked = false;
    } else {
      // not yet affordable: bank, buy a thin screen only. Floored at 2
      // conscripts (playtest fix): the computed budget at early-bell
      // baselines quantized to zero bodies, making a "banking" bell an
      // ABSENT assault. A banking bell is thin, never absent.
      const screenBudget = Math.min(reg.scrap, Math.max(baseline * 0.25 * (0.5 + sizeRoll * 0.5), 2 * price("")));
      buyInfantryMix(shares, infTypes, screenBudget, reg, buys, price);
      banked = true;
    }
  } else {
    // mg pressure buys a tank first (reserving its cost) before the
    // infantry mix spends down the rest of the bell's budget.
    if (sniperWanted) buySnipers(sniperWanted, reg, buys, price);
    if (tanksOpen && tankPref > 0.3 && reg.tanks > 0 && reg.scrap >= price("tank")) {
      buyTanks(1, reg, buys, price);
    }
    const spend = Math.min(reg.scrap, baseline * jitterSpend);
    buyInfantryMix(shares, infTypes, spend, reg, buys, price);
    banked = false;
  }

  return { buys, banked };
}

// P7 T6 (mk1.35, owner): THE DEFENSIVE OPENING. Half of an early muster
// stays home and digs in; the share fades to nothing by ~bell 8 and the
// war matures into full assaults. Pure math here — the game layer applies
// it AFTER planWave, so the 4-draw contract above is untouched.
export function homeShare(bell) {
  return Math.max(0, 0.5 - (Math.max(1, bell) - 1) * 0.07); // provisional (F5)
}
// The home detail: rifle-family tags only — grenadiers and sappers carry no
// hold discipline (units.js) and would march off the post. Splices from the
// FRONT of the mix bag (nextSpawnTag pops the back), deterministic.
const HOLD_TAGS = ["", "rocket", "sniper", "mortar"];
export function pickHomeDetail(mixBag, n) {
  const out = [];
  for (let i = 0; i < mixBag.length && out.length < n; ) {
    if (HOLD_TAGS.indexOf(mixBag[i]) >= 0) out.push(mixBag.splice(i, 1)[0]);
    else i++;
  }
  return out;
}
export const HOME_GUARD_CAP = 12; // provisional (F5)

// ==== P7 T8: THE ENEMY LEARNS TO DRIVE =======================================
// THE COMMANDER — one draw per war, uniform, hidden. cmdrOf consumes exactly
// ONE world-rng draw (DepotGame's boot, fresh war only — a RESUME restores
// S.cmdr from the save and draws nothing, exactly makeRegiment's pattern).
export const CMDRS = ["cautious", "bold", "stubborn"];
export function cmdrOf(rng) { return CMDRS[Math.min(2, Math.floor(rng() * 3))]; } // provisional (F5)

// The commander's bell decision for the Bison. ctx: { bell, fielded,
// heldRatio, atFront, committed }. Returns "forward" | "home". Pure — the
// game layer (ringBell) reads territory/S.ws and writes the order, this only
// decides. Once committed (game layer stamps v.committed = 1 forever, on the
// first "forward"), cautious behaves bold-equivalent thereafter.
export function cmdrBellOrders(profile, ctx) {
  if (profile === "stubborn") return "home";
  const go = profile === "bold" ? true
    : (ctx.committed || ctx.heldRatio >= 0.55 || ctx.bell >= 8);   // provisional (F5)
  if (!go) return "home";
  return ctx.fielded ? "forward" : "home";                          // rides with assaults; home between them
}

// P7.2 T8 (owner): THE DRAFT PICK, commander-colored — pure, ZERO draws.
// Bold takes units; cautious takes towers and plans; stubborn takes
// standing defensive iron first. Stable sort; deal order breaks ties.
const DRAFT_TOWERS = ["mg", "gun", "mortar", "rocket", "tesla"];
export function draftPick(cards, cmdr) {
  const score = (c) => {
    const tower = DRAFT_TOWERS.indexOf(c.k) >= 0;
    if (cmdr === "bold") return c.plan ? 0 : 2;
    if (cmdr === "cautious") return (tower ? 2 : 0) + (c.plan ? 1 : 0);
    return (tower ? 2 : 0) + (c.plan ? 0 : 1); // stubborn
  };
  return cards.slice().sort((a, b) => score(b) - score(a)).slice(0, 5);
}

// THE FERRY GATE — pure. `eligible` is the game layer's own gate (an APC in
// hand, not already ferrying, hold empty, a muster worth the trip); the roll
// is drawn EVERY bell regardless (draw-then-clamp) — this only reads it.
export function ferryDecide(roll, eligible) {
  return !!eligible && roll < 0.4; // provisional (F5)
}

// THE DROP DRAW — pure. `cands` is the game layer's precomputed candidate
// list ({x, z, u}, canonical u already resolved); `depotRef` is the PLAYER
// depot's own reference point ({x, z, u}) the "never within 18m" and "wide
// of the direct line" rules measure against. Prefers the WIDE set (>15m off
// the depot's own canonical u) among candidates already >18m from the depot;
// falls back to the >18m set, then the raw pool, so a real map (PASSES
// always yields far candidates) never fails to pick. Deterministic index
// pick by roll. Empty cands -> null (the caller has already drawn the roll).
export function flankDrop(cands, roll, depotRef) {
  if (!cands || !cands.length) return null;
  const far = depotRef ? cands.filter((c) => Math.hypot(c.x - depotRef.x, c.z - depotRef.z) > 18) : cands;
  const wide = depotRef ? far.filter((c) => Math.abs(c.u - depotRef.u) > 15) : far;
  const pool = wide.length ? wide : far.length ? far : cands;
  return pool[Math.min(pool.length - 1, Math.floor(roll * pool.length))];
}
// ==== end P7 T8 ==============================================================

// ==== P7.1 T7: HIS SHOVELS ===================================================
// Two unconditional draws per bell (the ferry/mine law). The gate is pure;
// the kind is a derived fraction of the same roll — no third draw.
export function engBuildDecide(roll, hasIdleEng, scrap, estCost) {
  return roll < 0.6 && hasIdleEng && scrap >= estCost; // provisional (F5)
}
export function engBuildKind(roll) {
  return (roll * 10) % 1 < 0.35 ? "walls" : "bags"; // provisional (F5)
}
export function engSeedPlace(cands, roll) {
  if (!cands || !cands.length) return null;
  return cands[Math.min(cands.length - 1, Math.floor(roll * cands.length))];
}
```

Then `sha256sum src/modules/ai/ai.js` — must print `80d057c456238cb294dd0c4900e3f9cd407d73faaf3abf78496f5a38950a052c`.

3. Write `src/depot/ai.js`, exactly (replacing the whole file):

```js
// ai lives in its own module now; this file is the depot's unchanged
// front door — every depot import keeps working.
export * from "../modules/ai/ai.js";
```

Then `sha256sum src/depot/ai.js` — must print `9ca3475565cca8571826fe31a363df542fbaf061c1b3c23189cc40aad5f84f08`.

4. The gates, all four, unmoved. Each its own command; frostline once, through a file:

```sh
node scripts/gate.mjs api | tail -1         # must print: seed 1  seconds 90 (10800 steps)  worldHash 3367709165  runHash 2717846799
node scripts/gate.mjs combat | tail -1      # must print: ALL PASS
node scripts/gate.mjs frostline > /tmp/fl.out 2>&1; head -1 /tmp/fl.out; tail -2 /tmp/fl.out   # seeds line, then 63 PASS / 0 FAIL, then frostline-test PASS
node scripts/gate.mjs old-master | tail -1  # must print: old-master-test PASS
```

5. Close the records in this landing: bump `package.json` version to `0.0.54`; in `docs/plans/phase-0.0.54-ai.md` replace the status line with `Status: LANDED, commit stamped below, 2026-09-03. Gate: prior gates unmoved, hashes identical.`; in `docs/plans/batch-extractions-3.md` flip `- [ ] 0.0.54 ai` to `- [x] 0.0.54 ai`; in `README.md` flip `- [ ] ai — 0.0.54` to `- [x] ai — 0.0.54` — the modules list carries the progress, every landing.

6. Commit and push the landing, then stamp the real hash in a second small commit — NEVER amend after stamping. Add the named files only:

```sh
git add src/modules/ai/ai.js src/depot/ai.js package.json README.md docs/plans/phase-0.0.54-ai.md docs/plans/task-0.0.54-1-ai.md docs/plans/batch-extractions-3.md
git commit -m "phase 0.0.54 — ai carved out

Moved whole into its own module; the depot keeps a one-line front door. Four gates unmoved.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push origin main
H=$(git rev-parse --short HEAD)
sed -i "s/commit stamped below/commit \`$H\`/" docs/plans/phase-0.0.54-ai.md
git add docs/plans/phase-0.0.54-ai.md && git commit -m "phase 0.0.54 record stamped — $H

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push origin main
```

## Acceptance

- Step 2's and step 3's sha256 lines exactly as printed above.
- Step 4: all four gates print their tails unchanged; frostline at its own rolled seeds, seeds and verdict from the one saved run.
- Records flipped riding the landing — phase status, batch box, README line; both pushes accepted.

## Report

Read-confirmation first, then one line of outcome, then bullets: the sha256 lines verbatim, the four gate tails verbatim (frostline with its seeds line), both commit hashes, the push results. Every nonconformity its own labeled bullet. Seeds: frostline rolls fresh and prints; the rest are seedless or the api gate's own fixed harness.
