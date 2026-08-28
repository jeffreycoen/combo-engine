# Task 0.0.6-1 — the tape module

One job: create the sixth module — the input tape shaped from deadweight — with its gate, then land the phase with the record close riding the landing commit. Every file's full content is below; write exactly what is written, run the listed gates, report. You design nothing.

Suggested model: Sonnet 5.

Required reading, in order (confirm at the top of your report):
1. This file, whole.
2. `docs/plans/phase-0.0.6-tape-module.md`, whole.

Source of the law (reference only — do not edit it): `deadweight-hangar.html` lines 446–447 and 2589–2626.

## Steps

Run from `/home/batman/combo-engine`. A failed assert stops the task; report the step and its verbatim output, run nothing further.

1. Assert the ground: seven gates green, destination absent. Required tails — api ends `worldHash 3367709165  runHash 2717846799`; combat `ALL PASS`; accuracy `11/11`; market `market-test PASS`; builder `builder-test PASS`; ledger `ledger-test PASS`; weldstress `weldstress-test PASS`; the `ls` prints `absent`.

```sh
node scripts/gate.mjs api | tail -1
node scripts/gate.mjs combat | tail -1
node scripts/gate.mjs accuracy | tail -1
node scripts/gate.mjs market | tail -1
node scripts/gate.mjs builder | tail -1
node scripts/gate.mjs ledger | tail -1
node scripts/gate.mjs weldstress | tail -1
ls src/modules/tape 2>/dev/null || echo absent
```

2. Write `src/modules/tape/tape.js`, exactly:

```js
// modules/tape — the input tape, shaped from the deadweight demo
// (deadweight-hangar.html lines 446-447 recAction, 2589-2626 the headless
// driver: "the replay IS the save"). A tape is a recording of commands, each
// stamped with the tick it happened on; a seed plus the tape replays a run
// exactly. The law carried: actions are applied IN RECORDED ORDER, all of a
// tick's actions BEFORE that tick's step, and the tape only ever moves
// forward in time. The code around the law is new and game-free: the game
// supplies apply(action) and step(tick); the tape supplies order and time.

export const ACTION_CONTRACT = { t: "integer >= 0, never decreasing", k: "non-empty string" };

// checkAction(a) -> problem strings, empty when clean. Pure.
export function checkAction(a) {
  if (!a || typeof a !== "object") return ["action: not an object"];
  const problems = [];
  if (!Number.isInteger(a.t) || a.t < 0) problems.push("action.t: integer >= 0 required");
  if (typeof a.k !== "string" || !a.k.length) problems.push("action.k: non-empty string required");
  return problems;
}

// makeTape() -> the recorder. record(tick, kind, data) stamps and stores;
// time never runs backward. toJSON/fromJSON carry a tape between sessions.
export function makeTape(actions = []) {
  const tape = actions.slice();
  return {
    record(tick, kind, data) {
      const a = Object.assign({ t: tick, k: kind }, data || {});
      const problems = checkAction(a);
      if (problems.length) throw new Error("tape: " + problems.join("; "));
      if (tape.length && a.t < tape[tape.length - 1].t) throw new Error("tape: time ran backward");
      tape.push(a);
      return a;
    },
    get actions() { return tape.slice(); },
    get length() { return tape.length; },
    toJSON() { return JSON.stringify(tape); },
  };
}

export function tapeFromJSON(text) {
  const raw = JSON.parse(text);
  if (!Array.isArray(raw)) throw new Error("tape: not an array");
  for (const a of raw) {
    const problems = checkAction(a);
    if (problems.length) throw new Error("tape: " + problems.join("; "));
  }
  return makeTape(raw);
}

// replayTape(actions, {apply, step}, ticks) — the demo's driver loop, made
// generic: for every tick, apply that tick's actions in recorded order, then
// step. Returns how many actions were consumed; actions stamped past `ticks`
// are left unconsumed, never dropped silently.
export function replayTape(actions, hooks, ticks) {
  let i = 0;
  for (let t = 0; t < ticks; t++) {
    while (i < actions.length && actions[i].t === t) { hooks.apply(actions[i]); i++; }
    hooks.step(t);
  }
  return { consumed: i, remaining: actions.length - i };
}
```

3. Write `scripts/tape-test.mjs`, exactly:

```js
// COMBO-ENGINE — tape-test: the input-tape module's gate. Nine checks. The
// replay proof drives the market module as the toy world: a wallet trading a
// pool on taped commands, one credit of income per tick. Seedless — the tape
// itself is the only source of events, which is the point.
import { checkAction, makeTape, tapeFromJSON, replayTape } from "../src/modules/tape/tape.js";
import { poolBuy, poolSell } from "../src/modules/market/market.js";

let pass = 0, fail = 0;
const check = (name, ok) => { if (ok) { pass++; console.log("PASS " + name); } else { fail++; console.log("FAIL " + name); } };

check("contract accepts {t:0, k:'fire'}", checkAction({ t: 0, k: "fire" }).length === 0);
check("contract rejects junk (2 problems named)", checkAction({ t: -1, k: "" }).length === 2);
check("recording stamps and keeps order; time never runs backward",
  (() => { const T = makeTape(); T.record(3, "a"); T.record(3, "b"); T.record(7, "c");
    try { T.record(5, "late"); return false; } catch (e) { return T.length === 3 && T.actions[1].k === "b"; } })());

// the toy world: wallet + pool on the market module, one credit income per tick
const world = () => ({ wallet: 10000, held: 0, pool: { q: 14, c: 44800 } });
const hooks = (s) => ({
  apply(a) {
    if (a.k === "buy") { const c2 = poolBuy(s.pool, 1); if (c2 !== null) { s.wallet -= c2; s.held += 1; } }
    if (a.k === "sell" && s.held > 0) { s.wallet += poolSell(s.pool, 1); s.held -= 1; }
  },
  step() { s.wallet += 1; },
});
const play = (actions, ticks) => { const s = world(); replayTape(actions, hooks(s), ticks); return s; };
const flat = (s) => s.wallet + "/" + s.held + "/" + s.pool.q + "/" + s.pool.c;

// the tape under test: buy at 5, buy at 5 again, sell at 40, buy at 99
const T = makeTape();
T.record(5, "buy"); T.record(5, "buy"); T.record(40, "sell"); T.record(99, "buy");

check("replaying the same tape twice lands the identical state",
  flat(play(T.actions, 100)) === flat(play(T.actions, 100)));
check("the end state is the tape's own known number: 2631/2/12/52269",
  flat(play(T.actions, 100)) === "2631/2/12/52269");
check("one altered action changes the outcome (the tape is load-bearing)",
  (() => { const a2 = T.actions; a2[2] = { t: 40, k: "buy" }; return flat(play(a2, 100)) !== "2631/2/12/52269"; })());
check("a tape survives its own serialization: JSON round trip replays identical",
  flat(play(tapeFromJSON(T.toJSON()).actions, 100)) === "2631/2/12/52269");
check("an empty tape is pure stepping: 100 ticks of income, nothing else",
  flat(play([], 100)) === "10100/0/14/44800");
check("actions past the horizon are reported unconsumed, never silently dropped",
  (() => { const r = replayTape(T.actions, hooks(world()), 50); return r.consumed === 3 && r.remaining === 1; })());

console.log(`tape-test: ${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
console.log("tape-test PASS");
```

4. In `scripts/gate.mjs`, in the `GATES` table (currently seven entries ending with `"weldstress"`), add one line after the `"weldstress"` entry:

```js
  "tape": ["scripts/tape-test.mjs"],
```

Touch nothing else in the file.

5. Run the new gate. Required output: nine PASS lines, then exactly `tape-test: 9 PASS / 0 FAIL`, then `tape-test PASS`, exit 0. Any FAIL stops the task before step 6.

```sh
node scripts/gate.mjs tape
```

6. Assert the prior gates did not move (same required tails as step 1).

7. Close the records in this landing:
   - Bump `package.json` version to `0.0.6`.
   - In `docs/plans/phase-0.0.6-tape-module.md`, replace the status line with: `Status: LANDED, commit pending, 2026-08-28. Gate: 9 PASS / 0 FAIL; prior gates unmoved.`
   - In `README.md`, flip `- [ ] The input tape: every action recorded with its tick, a seed plus the tape replays a run exactly` to `- [x]`.
   - In `docs/plans/STATE.md`: set the first line to `Current phase: none active. Last landed: 0.0.6.`; append ` · 0.0.6 tape (pending)` to the Landed line; add `tape` to the gates line; remove `the input tape · ` from the next-candidates line.

8. Commit, stamp the real hash into both pending records, amend, push:

```sh
git add src/modules/tape scripts/tape-test.mjs scripts/gate.mjs README.md package.json docs/plans
git commit -m "phase 0.0.6 — the input tape lands

Deadweight's law: causes, not state — tick-stamped commands, applied in
order before the step, replayed exactly. Gate: 9 PASS / 0 FAIL, driving
the market module as the toy world.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
H=$(git rev-parse --short HEAD)
sed -i "s/commit pending/commit \\`$H\\`/" docs/plans/phase-0.0.6-tape-module.md
sed -i "s/0.0.6 tape (pending)/0.0.6 tape (\\`$H\\`)/" docs/plans/STATE.md
git add docs/plans && git commit --amend --no-edit
git push origin main
```

## Acceptance

- Step 5: `tape-test: 9 PASS / 0 FAIL` then `tape-test PASS`, exit 0, and an `ok` line in `.superpowers/gates.log`.
- Step 6: all seven prior gates print their pinned tails unchanged.
- Step 7's four records flipped, riding the landing commit (hash stamped by step 8).
- Push accepted by origin.

## Report

Read-confirmation first, then one line of outcome, then bullets: the tape gate's count and verdict lines verbatim, the seven prior-gate tails, the final commit hash, the push result. Every nonconformity its own labeled bullet. Fixture seeds: none — the tape is the only event source, which is the point; the api re-check runs seed 1; no seed is special.
