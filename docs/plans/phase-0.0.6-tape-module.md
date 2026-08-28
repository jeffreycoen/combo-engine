# Phase 0.0.6 — the input tape

Status: LANDED, commit `048b837`, 2026-08-28. Gate: 9 PASS / 0 FAIL; prior gates unmoved.

The fifth organ out of deadweight: the input tape — every command recorded with the tick it happened on, so a seed plus the tape replays a run exactly. The save format that stores causes instead of state; a bug report becomes a seed and a tape; a scenario test becomes a tape with a pinned end state. Source: `deadweight-hangar.html` lines 446–447 (the recorder) and 2589–2626 (the headless driver — "the replay IS the save").

On the name: "tape" is a cassette metaphor, kept because the artifact truly is a sequence recorded and played back in order. The verbs are functional: `makeTape()` records, `replayTape()` replays.

## Lift kind

SHAPED — the law carried, the code new. The law, verbatim from the demo's driver: actions are applied in recorded order; all of a tick's actions are applied BEFORE that tick's step; time never runs backward on the recorder. New around it: the game supplies `apply(action)` and `step(tick)` as hooks instead of the demo's hard-wired switch (its `apply` names sixteen game verbs — game-side, stays); serialization is explicit (`toJSON`/`tapeFromJSON`, validated on load); actions past the replay horizon are reported unconsumed, never silently dropped.

## Acceptance arithmetic for the phase

Every number below was produced by running the exact planned code at plan-writing time. The first known-number candidate was WRONG in the trial (a predicted 5090/2/13/51694 against a measured 2631/2/12/52269) and was re-pinned from the run — which is the trial rule working as intended.

- `node scripts/gate.mjs tape` prints nine PASS lines, then `tape-test: 9 PASS / 0 FAIL`, then `tape-test PASS`, exit 0.
- Load-bearing knowns: the test tape (buy at 5, buy at 5, sell at 40, buy at 99) driven over the market module for 100 ticks lands exactly `2631/2/12/52269` (wallet/held/pool q/pool c); the same tape twice lands identical; one altered action moves the outcome; the JSON round trip replays identical; an empty tape is pure stepping (`10100/0/14/44800`); a 50-tick horizon reports 3 consumed, 1 remaining.
- The seven prior gates unmoved: api worldHash 3367709165 / runHash 2717846799, combat 7 PASS, accuracy 11/11, market `market-test PASS`, builder `builder-test PASS`, ledger `ledger-test PASS`, weldstress `weldstress-test PASS`.

## The composition

The gate's toy world is the market module under taped commands — third cross-module proof.

## Tasks

- 0.0.6-1 — the tape module: code, gate, registration, record close, commit, push. → `task-0.0.6-1-tape.md`

Suggested model: Sonnet 5 — every file's full content is in the plan.
