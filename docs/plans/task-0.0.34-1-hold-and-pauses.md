# Task 0.0.34-1 — the hold and the pauses

Two rulings land: on the enemy's half your squads stand — no marching — with the trigger live under the shipped fire rules; and a man down or orders done in free time freezes the war with its banner until a tap. The banner stops lying about whose turn it is, and two triggers the code already computes finally reach the player.

**Suggested model:** Sonnet — verbatim edits from a run trial, no design.

**Required reading, verified in the tree at 5654f52:**
- `src/games/frostline/tape.js` (whole file, 110 lines)
- `src/games/frostline/pause.js` (whole file, 46 lines)
- `docs/frostline/main.js` lines 77–82, 223–232, 355–375
- `scripts/frostline-test.mjs` lines 268–300 (the tape area)

Open your report by confirming all four were read.

## The walk

The player's path this touches. On ENEMY TURN your squads stop in place — a squad mid-march stands where it is, keeps its order, and resumes the march on your next half; while standing it shoots by the shipped rules (careful holds fire unless a cone covers the shot, free fires at will), so overwatch keeps its whole point. In free time, when one of your men falls, the war freezes with MAN DOWN / TAP TO GO ON; when a squad finishes its move, ORDERS DONE / TAP TO GO ON. A tap anywhere clears the banner and time runs again. First contact outranks both — its freeze into turns is unchanged. The tick's bounties are paid before any freeze, and a battle that ends on the same tick shows its card, not a banner. Phone and desktop the same; nothing layout-shaped changes. The replay stays bit-exact: the hold lives inside the shared battle step, and a pause is the absence of a tick — it never touches the sim.

## Steps, in order

**1. Gates green before anything.** Run and require exact:

```
node scripts/gate.mjs frostline tape
```

Must end `frostline-test [tape]: 5 PASS / 0 FAIL`. Any other number stops the task.

**2. The hold and the pause flags, `src/games/frostline/tape.js`.** Two replacements, each old text appearing exactly once.

2a. Replace:

```js
  applyFireControl(ts, squads);
  heldInput(ctx.input, ts.phase === "exec");
  const out = tickWar(war, STEP, ctx.input);
  ctx.tick++;
```

with

```js
  applyFireControl(ts, squads);
  heldInput(ctx.input, ts.phase === "exec");
  // the hold, your side: on the enemy half every squad stands — the move
  // stashed for this tick and restored after, so the march resumes on your
  // own half; the trigger stays live under discipline and the cones.
  const stood = ts.phase === "enemy" ? squads.map((sq) => ({ sq, order: sq.order, dest: sq.dest })) : null;
  if (stood) for (const h of stood) { h.sq.order = "defend"; h.sq.dest = null; }
  const out = tickWar(war, STEP, ctx.input);
  if (stood) for (const h of stood) { h.sq.order = h.order; h.sq.dest = h.dest; }
  ctx.tick++;
```

2b. Replace:

```js
    const t = checkTriggers(war, ctx.trig, out.events);
    if (t.contact !== null) { startTurns(ts, squads); ctx.contactTick = ctx.tick; }
  } else if (ts.phase === "exec") {
```

with

```js
    const t = checkTriggers(war, ctx.trig, out.events);
    if (t.contact !== null) { startTurns(ts, squads); ctx.contactTick = ctx.tick; }
    else if (t.manDown !== null) { out.flags = out.flags || {}; out.flags.pause = "MAN DOWN"; }
    else if (t.ordersDone !== null) { out.flags = out.flags || {}; out.flags.pause = "ORDERS DONE"; }
  } else if (ts.phase === "exec") {
```

**3. The new tests, `scripts/frostline-test.mjs`.** Two replacements.

3a. The import — replace:

```js
import { makeCtx, stepBattle, applyOp, record } from "../src/games/frostline/tape.js";
```

with

```js
import { makeCtx, stepBattle, applyOp, record } from "../src/games/frostline/tape.js";
import { checkTriggers } from "../src/games/frostline/pause.js";
```

3b. At the end of the tape area — replace:

```js
    ctx.ts.phase = "free";
    const t0 = ctx.tick;
    const out = stepBattle(ctx);
    check("tape: one battle step is one tick with the tick's own events returned",
      ctx.tick === t0 + 1 && Array.isArray(out.events));
```

with

```js
    ctx.ts.phase = "free";
    const t0 = ctx.tick;
    const out = stepBattle(ctx);
    check("tape: one battle step is one tick with the tick's own events returned",
      ctx.tick === t0 + 1 && Array.isArray(out.events));
    // the hold: one enemy-half tick — the ordered squad stands, the order kept
    const sq2 = war.run.squads[1];
    sq2.order = "move"; sq2.dest = { x: sq2.anchor.x + 20, z: sq2.anchor.z }; sq2._route = null; sq2._routeDest = null;
    ctx.ts.phase = "enemy"; ctx.ts.enemyT = 0;
    const a0 = { x: sq2.anchor.x, z: sq2.anchor.z };
    stepBattle(ctx);
    const stood = sq2.anchor.x === a0.x && sq2.anchor.z === a0.z && sq2.order === "move" && !!sq2.dest;
    ctx.ts.phase = "exec"; ctx.ts.execT = 0;
    stepBattle(ctx);
    check("tape: on the enemy half an ordered squad stands, order kept; on your own half it marches",
      stood && (sq2.anchor.x !== a0.x || sq2.anchor.z !== a0.z));
    // the pauses: orders done and man down ride the tick's flags
    ctx.ts.phase = "free";
    sq2.order = "defend"; sq2.dest = null;
    ctx.trig.moving.add(sq2.id);
    const outOD = stepBattle(ctx);
    const odFlag = outOD.flags && outOD.flags.pause === "ORDERS DONE";
    const ownId = war.run.squads[0].memberIds[0];
    const md = checkTriggers(war, ctx.trig, [{ type: "kill", id: ownId }]);
    check("tape: orders done flags its tick; a friendly kill event trips the man-down trigger",
      odFlag && md.manDown === ownId);
```

**4. The page freeze, `docs/frostline/main.js`.** Three replacements, each old text appearing exactly once.

4a. Replace:

```js
let mode = null;            // "move" | "attack" | null — the armed action awaiting its tap
```

with

```js
let mode = null;            // "move" | "attack" | null — the armed action awaiting its tap
let freezeMsg = null;       // a fired pause: the war waits until the next tap
```

4b. Replace:

```js
function tapAt(cx, cy) {
  if (ctx.over || pending) return;
```

with

```js
function tapAt(cx, cy) {
  if (freezeMsg) { freezeMsg = null; say("", ""); return; }
  if (ctx.over || pending) return;
```

4c. Replace:

```js
  const ticking = !ctx.over && !pending && (ts.phase === "free" || ts.phase === "exec" || ts.phase === "enemy");
```

with

```js
  const ticking = !ctx.over && !pending && !freezeMsg && (ts.phase === "free" || ts.phase === "exec" || ts.phase === "enemy");
```

4d. Replace:

```js
      battleEarned += earnFromEvents(purse, war, events);
```

with

```js
      battleEarned += earnFromEvents(purse, war, events);
      if (flags && flags.pause && !ctx.over) { freezeMsg = flags.pause; say(freezeMsg, "TAP TO GO ON"); break; }
```

(After the bounty pay, so the freezing tick still pays; the break stops the frame's remaining ticks; a battle over on the same tick shows its card instead.)

**5. The gate, changed area only.** Run and require exact:

```
node scripts/gate.mjs frostline tape
```

Must end `frostline-test [tape]: 7 PASS / 0 FAIL`. Then the pre-commit bracket:

```
node scripts/gate.mjs frostline
```

Must end `frostline-test [mission turns cover fire purse board tape space hunter]: 62 PASS / 0 FAIL`.

**6. Syntax on the page.** `node --check docs/frostline/main.js` — silent.

**7. Land it.** `package.json` version to `0.0.34`. `git add` the three changed files plus `docs/plans/task-0.0.34-1-hold-and-pauses.md`, commit `phase 0.0.34 — the hold and the pauses` with the standard trailer, push. The owner's live check is the acceptance.

## Substitution table

Every difference from the tree at 5654f52 is a step above, verbatim: tape.js two replacements (step 2); frostline-test.mjs two (step 3); main.js four (step 4); package.json version. An unlisted difference stops the task.

## Arithmetic acceptance

The trial ran every edit above; these numbers are that run's output, not predictions:

- `frostline tape` after the edits: **7 PASS / 0 FAIL** (was 5)
- full `frostline`: **62 PASS / 0 FAIL** (was 60)
- fixture seeds: 3 (mission), boards 7, 11, 42, space 12345 — no seed special.

One trial finding, recorded: a kill event applied before a tick never reaches that tick's own event return — the tick drains only its own events. The man-down test therefore asserts the trigger's own call directly; the page wiring is the same branch the orders-done test proves through the full step.

## Report shape

One line of outcome; the read confirmation; the two gate lines verbatim; the commit hash; seeds named; every nonconformity, deviation, or skipped step its own labeled bullet.
