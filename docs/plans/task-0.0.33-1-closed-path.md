# Task 0.0.33-1 — the closed path

The campaign's spine, closed: a won job leaves the board; an emptied board rolls its next three jobs by itself; THE BOARD always returns to the campaign's own board; a mid-contract reload keeps the contract; an edge arrow points at the exit whenever it is off-screen. The rulings behind this plan: gone on completion, self-refreshing board, edge arrow.

**Suggested model:** Sonnet — verbatim edits from a run trial, no design.

**Required reading, verified in the tree at b0adf22:**
- `src/games/frostline/contracts.js` (whole file, 76 lines)
- `src/games/frostline/purse.js` lines 14–31
- `docs/frostline/main.js` (whole file, 376 lines)
- `docs/frostline/index.html` lines 56–66
- `scripts/frostline-test.mjs` lines 210–266 (the purse and board areas)

Open your report by confirming all five were read.

## The walk

The player's path this touches. A bare load opens the campaign's own board — the one saved in the purse — not a fresh roll; only a brand-new campaign rolls one. Winning a contract removes that job from the board; the debrief's THE BOARD button and the next bare load both show the board one job lighter. Winning the third job rolls the next board automatically; the address follows it. Any old board address redirects to the campaign's current board. A battle's address stays `?board=B&job=K` for its whole run, so a mid-battle reload boots the same contract battle with the posted price intact; only a free skirmish pins `?seed=`. A won job's address boots no battle — it lands on the board. In battle, a green arrow sits at the screen edge pointing toward the exit whenever the exit is off-screen, phone and desktop alike; it hides when the exit is in view and when the battle is over. No new spends, no new prices, no layout moved.

The one law this writes that a hand-typed address can reach: winning a job on a non-current board makes that board the campaign's current board, minus the won job. Only typed addresses reach it; buttons never do.

## Steps, in order

**1. Gates green before anything.** Run and require exact:

```
node scripts/gate.mjs frostline purse board
```

Must end `frostline-test [purse board]: 14 PASS / 0 FAIL`. Any other number stops the task.

**2. Board turnover in `src/games/frostline/contracts.js`.** Directly above the line `// completionPay(purse, contract) -> the posted price into the purse, plus` (line 68), insert:

```js
// nextBoardSeed(boardSeed) -> the seed the emptied board refreshes to.
// Deterministic: the chain of boards is part of the address law.
export function nextBoardSeed(boardSeed) {
  return Math.floor(stream((boardSeed ^ 0x9e3779b9) >>> 0)() * 1e9);
}

// doneOf(purse, boardSeed) -> the completed job indexes on this board; a
// board the purse has never seen starts clean.
export function doneOf(purse, boardSeed) {
  return purse.board && purse.board.seed === boardSeed ? purse.board.done : [];
}

// markJobDone(purse, boardSeed, jobIx): the won job leaves the board; an
// emptied board rolls the next one. Returns the board seed now current.
export function markJobDone(purse, boardSeed, jobIx) {
  if (!purse.board || purse.board.seed !== boardSeed) purse.board = { seed: boardSeed, done: [] };
  if (!purse.board.done.includes(jobIx)) purse.board.done.push(jobIx);
  if (purse.board.done.length >= BOARD_JOBS) purse.board = { seed: nextBoardSeed(boardSeed), done: [] };
  return purse.board.seed;
}

```

**3. The board rides the vault, `src/games/frostline/purse.js`.** Line 17 — replace exactly:

```js
  return { scrap: 0, earned: 0, kills: 0, roster: [], heat: 0, men: null, fallen: 0 };
```

with

```js
  return { scrap: 0, earned: 0, kills: 0, roster: [], heat: 0, men: null, fallen: 0, board: null };
```

Line 29 — replace exactly:

```js
      men: Array.isArray(p.men) ? p.men.map((v) => Math.max(0, v | 0)) : null, fallen: p.fallen || 0 };
```

with

```js
      men: Array.isArray(p.men) ? p.men.map((v) => Math.max(0, v | 0)) : null, fallen: p.fallen || 0,
      board: p.board && typeof p.board.seed === "number" && Array.isArray(p.board.done)
        ? { seed: p.board.seed, done: p.board.done.map((v) => v | 0) } : null };
```

**4. The new tests, `scripts/frostline-test.mjs`.** Line 26's import — replace exactly:

```js
import { makeBoard, completionPay, CLEAN_PAY, UNDER_PAY, BOARD_JOBS } from "../src/games/frostline/contracts.js";
```

with

```js
import { makeBoard, completionPay, CLEAN_PAY, UNDER_PAY, BOARD_JOBS, nextBoardSeed, doneOf, markJobDone } from "../src/games/frostline/contracts.js";
```

Directly after the line (230):

```js
    check("purse: a broken record loads broke, never crashed", loadPurse({ getItem: () => "{broken", setItem: () => {} }).scrap === 0);
```

insert:

```js
    p.board = { seed: 7, done: [1] };
    savePurse(storage, p);
    const qb = loadPurse(storage);
    check("purse: the vault carries the campaign's board", qb.board.seed === 7 && qb.board.done.join() === "1");
```

Directly after the line (265):

```js
    check("board: the posted price pays and the heat lands", completionPay(p, b7[0]) === 36 && p.scrap === 36 && p.heat === 1);
```

insert:

```js
    const p4 = makePurse();
    check("board: the won job leaves the board and the books remember",
      markJobDone(p4, 7, 0) === 7 && doneOf(p4, 7).join() === "0" && doneOf(p4, 11).join() === "");
    markJobDone(p4, 7, 1);
    const rolled = markJobDone(p4, 7, 2);
    check("board: the emptied board rolls its next three jobs, deterministically",
      rolled === nextBoardSeed(7) && rolled !== 7 && doneOf(p4, rolled).join() === "" && nextBoardSeed(7) === nextBoardSeed(7));
```

**5. The ground page, `docs/frostline/main.js`.** Six replacements, each string appearing exactly once; any other count stops the task.

5a. Line 15 import — replace:

```js
import { makeBoard, completionPay } from "../../src/games/frostline/contracts.js";
```

with

```js
import { makeBoard, completionPay, doneOf, markJobDone } from "../../src/games/frostline/contracts.js";
```

5b. The bare load opens the campaign's board — replace:

```js
if (!Number.isFinite(boardSeed) && !Number.isFinite(bareSeed)) {
  boardSeed = Math.floor(Math.random() * 1e9);
  history.replaceState(null, "", "?board=" + boardSeed);
}
```

with

```js
if (!Number.isFinite(boardSeed) && !Number.isFinite(bareSeed)) {
  boardSeed = purse.board ? purse.board.seed : Math.floor(Math.random() * 1e9);
  history.replaceState(null, "", "?board=" + boardSeed);
}
```

5c. A won job's address boots no battle — replace:

```js
if (Number.isFinite(boardSeed) && Number.isFinite(jobIx)) contract = makeBoard(boardSeed)[jobIx] || null;
```

with

```js
if (Number.isFinite(boardSeed) && Number.isFinite(jobIx)) contract = makeBoard(boardSeed)[jobIx] || null;
if (contract && doneOf(purse, contract.boardSeed).includes(contract.job)) contract = null;
```

5d. The board screen is the campaign's board, won jobs gone — replace:

```js
  const bd = document.getElementById("board"), jobsEl = document.getElementById("bdJobs");
```

with

```js
  const bd = document.getElementById("board"), jobsEl = document.getElementById("bdJobs");
  if (!purse.board) { purse.board = { seed: boardSeed, done: [] }; savePurse(localStorage, purse); }
  if (purse.board.seed !== boardSeed) { boardSeed = purse.board.seed; history.replaceState(null, "", "?board=" + boardSeed); }
  const done = doneOf(purse, boardSeed);
```

and replace:

```js
  for (const job of makeBoard(boardSeed)) {
    const b = document.createElement("button");
```

with

```js
  for (const job of makeBoard(boardSeed)) {
    if (done.includes(job.job)) continue; // a won job is gone
    const b = document.createElement("button");
```

5e. The stray address rewrite goes — replace:

```js
const tape = [];
function confirmOp(op) { if (applyOp(ctx, op)) { record(tape, ctx, op); return true; } return false; }
history.replaceState(null, "", "?seed=" + seed);
```

with

```js
const tape = [];
function confirmOp(op) { if (applyOp(ctx, op)) { record(tape, ctx, op); return true; } return false; }
```

(The guarded rewrite `if (!contract) history.replaceState(...)` seven lines up stays; after this step, `"?seed=" + seed` appears exactly once in the file.)

5f. The win consumes the job — replace:

```js
        if (ctx.won) bonusPaid = contract ? completionPay(purse, contract) : winBonus(purse);
```

with

```js
        if (ctx.won) bonusPaid = contract ? completionPay(purse, contract) : winBonus(purse);
        if (ctx.won && contract) markJobDone(purse, contract.boardSeed, contract.job);
```

(This lands before the `savePurse` five lines down, so the consumed job saves with the battle's books.)

5g. THE BOARD goes home — replace:

```js
document.getElementById("dbNew").addEventListener("click", () => {
  location.href = location.pathname + "?board=" + Math.floor(Math.random() * 1e9);
});
```

with

```js
document.getElementById("dbNew").addEventListener("click", () => {
  location.href = location.pathname + "?board=" + (purse.board ? purse.board.seed : Math.floor(Math.random() * 1e9));
});
```

**6. The edge arrow, `docs/frostline/main.js`.** Directly above the line:

```js
// ---- the overlay: order routes, overwatch cones, the mark's ring
```

insert:

```js
// ---- the exit arrow: points at the objective whenever it is off-screen
const exitArrow = document.getElementById("exitArrow");
function exitOnScreen() {
  const ex = mission.exit.x, ez = mission.exit.z;
  const ey = war.field.heightAt(ex, ez);
  const cp = R.cameraPos(), rt = R.camBasis.right, up = R.camBasis.up;
  const dx = ex - cp.x, dy = ey - cp.y, dz = ez - cp.z;
  const nx = (dx * rt.x + dy * rt.y + dz * rt.z) / R.camBasis.halfW();
  const ny = (dx * up.x + dy * up.y + dz * up.z) / R.camBasis.halfH();
  if (Math.abs(nx) <= 0.92 && Math.abs(ny) <= 0.92) { exitArrow.style.display = "none"; return; }
  const s = 0.92 / Math.max(Math.abs(nx), Math.abs(ny));
  const px = (nx * s * 0.5 + 0.5) * innerWidth, py = (0.5 - ny * s * 0.5) * innerHeight;
  exitArrow.style.display = "block";
  exitArrow.style.left = px + "px";
  exitArrow.style.top = py + "px";
  exitArrow.style.transform = "translate(-50%, -50%) rotate(" + Math.atan2(-ny, nx) + "rad)";
}

```

And in the frame loop, replace:

```js
  R.overlay.setObjective(mission.exit.x, mission.exit.z, war.field.heightAt(mission.exit.x, mission.exit.z));
```

with

```js
  R.overlay.setObjective(mission.exit.x, mission.exit.z, war.field.heightAt(mission.exit.x, mission.exit.z));
  if (ctx.over) exitArrow.style.display = "none"; else exitOnScreen();
```

**7. The arrow's element, `docs/frostline/index.html`.** In the style block, directly above `  #camBtns {`, insert:

```css
  #exitArrow { position: fixed; display: none; pointer-events: none; color: #6fbf73;
    font: 700 22px system-ui, sans-serif; text-shadow: 0 0 6px rgba(13,17,23,.9); z-index: 3; }
```

In the body, replace `<div id="camBtns">` (first and only occurrence) with:

```html
<div id="exitArrow">➤</div>
<div id="camBtns">
```

**8. The gates, changed areas only.** Run and require exact:

```
node scripts/gate.mjs frostline purse board
```

Must end `frostline-test [purse board]: 17 PASS / 0 FAIL`. Then the pre-commit bracket:

```
node scripts/gate.mjs frostline
```

Must end `frostline-test [mission turns cover fire purse board tape space hunter]: 60 PASS / 0 FAIL`.

**9. Syntax on the page.** `node --check docs/frostline/main.js` — silent.

**10. Land it.** `package.json` version to `0.0.33`. `git add` the five changed files plus `docs/plans/task-0.0.33-1-closed-path.md`, commit `phase 0.0.33 — the closed path` with the standard trailer, push. The owner's live check is the acceptance.

## Substitution table

Every difference from the tree at b0adf22 is a step above, verbatim; nothing else changes. The quick tally: contracts.js +23 lines (step 2); purse.js two lines (step 3); frostline-test.mjs one import and two inserts (step 4); main.js seven replacements and one insert (steps 5–6); index.html two inserts (step 7); package.json version. An unlisted difference stops the task.

## Arithmetic acceptance

The trial ran every edit above; these numbers are that run's output, not predictions:

- `frostline purse board` after the edits: **17 PASS / 0 FAIL** (was 14)
- full `frostline`: **60 PASS / 0 FAIL** (was 57)
- `nextBoardSeed(7)` = **982394376**
- after the edits, `"?seed=" + seed` appears exactly **once** in main.js
- fixture seeds: 3 (mission), boards 7, 11, 42, space 12345 — no seed special.

The arrow's geometry is page code behind the renderer's camera; its check is the syntax gate and the walk — look and placement are the owner's at the live page.

## Report shape

One line of outcome; the read confirmation; the two gate lines verbatim; the commit hash; seeds named; every nonconformity, deviation, or skipped step its own labeled bullet.
