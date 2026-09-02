# Task 0.0.35-1 — the endings, and no hardwired seeds

Two ruled repairs in one landing. The endings: a broke and wiped company gets a card, never a crash; RESET asks first; the owned hunter's buy button stays dark. The seeds: the whole gate converted to the new standing order — every seed rolls fresh at run time and prints, every check a law that holds at any seed; the pinned world hash, exact board prices, and pinned cover numbers are gone.

**Suggested model:** Sonnet — one verbatim file move with a hash, plus verbatim edits from a run trial; no design.

**Required reading, verified in the tree at dcaf8b5:**
- `docs/plans/task-0.0.35-1-frostline-test-inventory.mjs` (the new gate, whole file, 412 lines — read it as the code it is)
- `src/games/frostline/purse.js` lines 80–116
- `docs/frostline/main.js` lines 14, 34–56, 288–326
- `scripts/frostline-test.mjs` (whole current file, for the before-picture)

Open your report by confirming all four were read.

## The walk

The player's path this touches. A campaign with no man standing in any slot and a purse too dry to buy a refill or any team lands on THE COMPANY IS FINISHED — the record (earned, kills, the dead) and one button, NEW CAMPAIGN, which wipes the vault and starts fresh. The card shows instead of any boot, on any address, so the old crash path is closed; after a fatal last battle the debrief shows first, with a button through to the record. RESET PURSE now asks before it wipes. The hunter's buy button stays dark once he is owned, whatever the purse holds. Phone and desktop the same. The gate's behavior at the terminal: every run prints its rolled seeds on the first line; a failed run reruns exactly with `SEEDS='{...}'` in the environment.

## The seed law, applied

Every check in the new gate holds at any seed. Where the old gate pinned one seed's output, the law replaces it: the world hash pin is now twin-boot identity at a rolled seed; exact board prices are now the pay-band and shape laws on three rolled boards; the four pinned cover numbers are now ordering, scaling, and floor laws; "every asked seed as asked" is now "each within its asked seed's own window" (a rolled valley may step, by the boot's own law). Three scene-vetting hunts keep the laws honest on any valley: the cover scene proves its lane flat and fully open before its walls go up; the fire and hunter ranges clear the mission's own patrol and vet every member's lane to both placed targets. All of it is in the inventory file, already run.

## Steps, in order

**1. Gates green before anything.** Run and require exact:

```
node scripts/gate.mjs frostline
```

Must end `frostline-test [mission turns cover fire purse board tape space hunter]: 62 PASS / 0 FAIL`. Any other number stops the task.

**2. The gate, moved verbatim.** Copy `docs/plans/task-0.0.35-1-frostline-test-inventory.mjs` over `scripts/frostline-test.mjs`, byte-identical. Then verify:

```
sha256sum scripts/frostline-test.mjs
```

Must print exactly `cc4c723d50fc6d357913286b40f07083b8ec65538110a8fb2c902812ddccfd20`. Any other hash stops the task.

**3. The ending's arithmetic, `src/games/frostline/purse.js`.** Directly above the line `// refillCost(purse) -> the bill to bring every squad back to strength.` insert:

```js
// campaignOver(purse) -> true when the company is finished: no man standing
// in any slot, and the purse cannot buy a refill or any new team. The one
// honest ending — checked at the debrief and before any boot.
export function campaignOver(purse) {
  if (menOf(purse).some((n) => n > 0)) return false;
  if (purse.scrap >= refillCost(purse)) return false;
  for (const type of FOR_SALE) {
    if (type === "hunter" && purse.roster.includes("hunter")) continue;
    if (purse.scrap >= teamPrice(type)) return false;
  }
  return true;
}

```

**4. The page, `docs/frostline/main.js`.** Six replacements, each old text appearing exactly once; any other count stops the task.

4a. The import — replace:

```js
import { loadPurse, savePurse, earnFromEvents, winBonus, buyTeam, teamPrice, FOR_SALE, STORE_KEY, fieldedTypes, menOf, recordCasualties, refillCost, buyRefill } from "../../src/games/frostline/purse.js";
```

with

```js
import { loadPurse, savePurse, earnFromEvents, winBonus, buyTeam, teamPrice, FOR_SALE, STORE_KEY, fieldedTypes, menOf, recordCasualties, refillCost, buyRefill, campaignOver } from "../../src/games/frostline/purse.js";
```

4b. A finished company never reaches the board draw — replace:

```js
const boardOnly = Number.isFinite(boardSeed) && !contract;
if (boardOnly) {
```

with

```js
const boardOnly = Number.isFinite(boardSeed) && !contract;
if (boardOnly && !campaignOver(purse)) {
```

4c. The ending card, and the boot guard — replace:

```js
// the battle: everything below runs only when a contract or a bare seed
// asked for one — the board screen never boots a war.
if (!boardOnly) startBattle();
```

with

```js
// the ending: a finished company never boots and never crashes — the card
// tells the record and offers the fresh start.
function showEnding() {
  const bd = document.getElementById("board");
  document.getElementById("bdTitle").textContent = "THE COMPANY IS FINISHED";
  document.getElementById("bdBody").innerHTML = "no man standing, no money for men<br>earned this campaign: " + purse.earned
    + "<br>kills: " + purse.kills + " · the dead: " + purse.fallen;
  const jobsEl = document.getElementById("bdJobs");
  const nb = document.createElement("button");
  nb.textContent = "NEW CAMPAIGN";
  nb.addEventListener("click", () => { localStorage.removeItem(STORE_KEY); location.href = location.pathname; });
  jobsEl.appendChild(nb);
  bd.style.display = "block";
  document.getElementById("title").textContent = "FROSTLINE";
}
// the battle: everything below runs only when a contract or a bare seed
// asked for one — the board screen never boots a war.
if (campaignOver(purse)) showEnding();
else if (!boardOnly) startBattle();
```

4d. The fatal last battle's debrief opens a door to the record — replace:

```js
  debriefEl.style.display = "block";
}
```

with

```js
  debriefEl.style.display = "block";
  if (campaignOver(purse)) {
    dbShop.innerHTML = "";
    const eb = document.createElement("button");
    eb.textContent = "THE COMPANY IS FINISHED — THE RECORD";
    eb.addEventListener("click", () => { debriefEl.style.display = "none"; showEnding(); });
    dbShop.appendChild(eb);
  }
}
```

4e. The owned hunter's button stays dark — replace:

```js
    if (type === "hunter" && purse.roster.includes("hunter")) b.disabled = true;
    b.disabled = purse.scrap < price;
```

with

```js
    b.disabled = purse.scrap < price || (type === "hunter" && purse.roster.includes("hunter"));
```

4f. RESET asks first — replace:

```js
document.getElementById("dbReset").addEventListener("click", () => {
  localStorage.removeItem(STORE_KEY);
  location.href = location.pathname;
});
```

with

```js
document.getElementById("dbReset").addEventListener("click", () => {
  if (!confirm("Wipe the whole campaign — purse, roster, board, the dead? This cannot be undone.")) return;
  localStorage.removeItem(STORE_KEY);
  location.href = location.pathname;
});
```

**5. The gate, three rolled runs.** Run three times and require each to end:

```
node scripts/gate.mjs frostline
```

`frostline-test [mission turns cover fire purse board tape space hunter]: 63 PASS / 0 FAIL` — with a different `seeds {...}` first line each run. Record all three seed lines for the report. Any FAIL stops the task; report the run's seed line with it.

**6. Syntax on the page.** `node --check docs/frostline/main.js` — silent.

**7. Land it.** `package.json` version to `0.0.35`. `git add` the three changed files plus `docs/plans/task-0.0.35-1-endings-and-seeds.md` and `docs/plans/task-0.0.35-1-frostline-test-inventory.mjs`, commit `phase 0.0.35 — the endings, and no hardwired seeds` with the standard trailer, push. The owner's live check is the acceptance.

## Substitution table

Every difference from the tree at dcaf8b5: scripts/frostline-test.mjs replaced whole by the inventory file (hash above, the only ratifier); purse.js one insert (step 3); main.js six replacements (step 4); package.json version. An unlisted difference stops the task.

## Arithmetic acceptance

The trial ran every edit above; these numbers are that run's output, not predictions:

- inventory file hash: **cc4c723d50fc6d357913286b40f07083b8ec65538110a8fb2c902812ddccfd20**
- the gate at rolled seeds: **63 PASS / 0 FAIL** — clean across a twenty-run soak in the trial, and at the two seed sets that failed during the trial's own hunt (both recorded in the trial, both now law-clean)
- seeds: rolled fresh every run and printed on the gate's first line; no seed named here, per the standing order.

## Report shape

One line of outcome; the read confirmation; the hash line verbatim; the three gate runs' seed lines and totals verbatim; the commit hash; every nonconformity, deviation, or skipped step its own labeled bullet.
