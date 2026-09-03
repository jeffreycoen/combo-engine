# Task 0.0.49-1 — economy carved out

One job: move `economy` into its own module and leave the depot a one-line front door. Write exactly what is written, run the listed gates, report. You design nothing.

Suggested model: Sonnet 5.

Required reading, in order (confirm at the top of your report):
1. This file, whole.
2. `docs/plans/phase-0.0.49-economy.md`, whole.

## Steps

Run from `/home/batman/combo-engine`. A failed assert stops the task; report the step and its verbatim output, run nothing further.

1. Assert the ground:

```sh
sha256sum src/depot/economy.js   # must print a02bc9fc3399fb1a69fe0e1b5374d978e832717ac905b83b53a38d919e06bb8d
node scripts/gate.mjs combat | tail -1   # must print: ALL PASS
ls src/modules/economy 2>/dev/null || echo absent   # must print: absent
mkdir -p src/modules/economy
```

2. Write `src/modules/economy/economy.js`, exactly (the source file with its import paths rewritten — the one substitution):

```js
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
```

Then `sha256sum src/modules/economy/economy.js` — must print `f80c60fb677ed25b67d1e23d0d13d479d6fe6d3ae702e6af98dc8898a303d406`.

3. Write `src/depot/economy.js`, exactly (replacing the whole file):

```js
// economy lives in its own module now; this file is the depot's unchanged
// front door — every depot import keeps working.
export * from "../modules/economy/economy.js";
```

Then `sha256sum src/depot/economy.js` — must print `0e776cd42f8b06490f5448166b878f3427d5afa2e4e60ca0d88d45cbac587923`.

4. The gates, all four, unmoved:

```sh
node scripts/gate.mjs api | tail -1         # must print: seed 1  seconds 90 (10800 steps)  worldHash 3367709165  runHash 2717846799
node scripts/gate.mjs combat | tail -1      # must print: ALL PASS
node scripts/gate.mjs frostline | tail -1   # must print: frostline-test PASS (count line: 63 PASS / 0 FAIL)
node scripts/gate.mjs old-master | tail -1  # must print: old-master-test PASS
```

5. Close the records in this landing: bump `package.json` version to `0.0.49`; in `docs/plans/phase-0.0.49-economy.md` replace the status line with `Status: LANDED, commit stamped below, 2026-09-03. Gate: prior gates unmoved, hashes identical.`; in `docs/plans/batch-extractions-2.md` flip `- [ ] 0.0.49 economy` to `- [x] 0.0.49 economy`. No README box is earned by a carve; none is touched.

6. Commit and push the landing, then stamp the real hash in a second small commit — NEVER amend after stamping. Add the named files only:

```sh
git add src/modules/economy/economy.js src/depot/economy.js package.json docs/plans/phase-0.0.49-economy.md docs/plans/task-0.0.49-1-economy.md docs/plans/batch-extractions-2.md
git commit -m "phase 0.0.49 — economy carved out

Moved whole into its own module; the depot keeps a one-line front door. Four gates unmoved.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push origin main
H=$(git rev-parse --short HEAD)
sed -i "s/commit stamped below/commit \`$H\`/" docs/plans/phase-0.0.49-economy.md
git add docs/plans/phase-0.0.49-economy.md && git commit -m "phase 0.0.49 record stamped — $H

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push origin main
```

## Acceptance

- Step 2's and step 3's sha256 lines exactly as printed above.
- Step 4: all four gates print their tails unchanged; frostline at its own rolled seeds.
- Records flipped riding the landing; both pushes accepted.

## Report

Read-confirmation first, then one line of outcome, then bullets: the sha256 lines verbatim, the four gate tails verbatim (frostline with its seeds line), both commit hashes, the push results. Every nonconformity its own labeled bullet. Seeds: frostline rolls fresh and prints; the rest are seedless or the api gate's own fixed harness.
