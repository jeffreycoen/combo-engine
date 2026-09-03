# Task 0.0.58-1 — the realignment landing

One job: land the realignment's rulings — batch 3 closed and withdrawn, the three second-lift modules retired, the README regrouped under the checklist. Every edit ran in the trial; the gates below are that run's output. You design nothing.

Suggested model: Sonnet 5.

Required reading, in order (confirm at the top of your report):
1. This file, whole.
2. `docs/plans/the-realignment.md`, whole — the ruled fix this lands.

## Steps

Run from `/home/batman/combo-engine`. A failed assert stops the task; report the step and its verbatim output, run nothing further.

1. Assert the ground:

```sh
node scripts/gate.mjs market | tail -1   # must print: market-test PASS
node scripts/gate.mjs escrow | tail -1   # must print: escrow-test PASS
ls src/modules/poolmarket src/modules/conserve src/modules/shipyard >/dev/null && echo present   # must print: present
```

2. Retire the three second lifts:

```sh
git rm -r -q src/modules/poolmarket src/modules/conserve src/modules/shipyard
git rm -q scripts/poolmarket-test.mjs scripts/conserve-test.mjs scripts/shipyard-test.mjs
```

3. Trim their three lines from the GATES table in `scripts/gate.mjs` — remove exactly these lines, nothing else:

```js
  "poolmarket": ["scripts/poolmarket-test.mjs"],
  "conserve": ["scripts/conserve-test.mjs"],
  "shipyard": ["scripts/shipyard-test.mjs"],
```

(The conserve and shipyard lines sit apart from the poolmarket line; remove each where it stands.) Then `sha256sum scripts/gate.mjs` — must print `abafea3cc7e2d122c73b70115d64f8da91a93dc5dd1db899c405ba7ed4cd5d0e`.

4. Copy the trial-proven records over the live ones, byte-identical:

```sh
cp /tmp/claude-1000/-home-batman-combo-engine/a1b0267e-a945-4023-8ac1-3d22cbfcb6f0/scratchpad/trial-0.0.58/README.md README.md
cp /tmp/claude-1000/-home-batman-combo-engine/a1b0267e-a945-4023-8ac1-3d22cbfcb6f0/scratchpad/trial-0.0.58/batch-extractions-3.md docs/plans/batch-extractions-3.md
sha256sum README.md docs/plans/batch-extractions-3.md
```

Must print `a77e8217d97bc42197c5455307f51a0c76237fa14c9179f6e52954a0a3c3f976` for README.md and `7e4a413a0789a0b01d24440c392707136b59539dc4edadb1afa1c1bd40c42bcb` for the batch record.

5. The gates — the canonical modules and their neighbors, green after the retirement:

```sh
node scripts/gate.mjs market | tail -1     # market-test PASS
node scripts/gate.mjs ledger | tail -1     # ledger-test PASS
node scripts/gate.mjs builder | tail -1    # builder-test PASS
node scripts/gate.mjs escrow | tail -1     # escrow-test PASS
node scripts/gate.mjs wells | tail -1      # wells-test PASS
node scripts/gate.mjs frostline > /tmp/fl.out 2>&1; head -1 /tmp/fl.out; tail -2 /tmp/fl.out   # seeds, 63 PASS / 0 FAIL, frostline-test PASS
```

6. Close the records and land: bump `package.json` version to `0.0.58`. Commit and push, then stamp:

```sh
git add -A src/modules scripts package.json README.md docs/plans/batch-extractions-3.md docs/plans/the-realignment.md docs/plans/task-0.0.58-1-realignment.md
git commit -m "phase 0.0.58 — the realignment: batch 3 closed, second lifts retired, the README governs

Poolmarket, conserve, and shipyard retired for their canonical first lifts; six unlanded rungs withdrawn; the modules list regrouped under the checklist.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push origin main
```

## Acceptance

- Step 3: gate.mjs sha256 `abafea3cc7e2d122c73b70115d64f8da91a93dc5dd1db899c405ba7ed4cd5d0e` (trial output).
- Step 4: both record hashes exact.
- Step 5: five module gates PASS; frostline `63 PASS / 0 FAIL` at its rolled seeds — all trial outputs.
- Push accepted.

## Report

Read-confirmation first, then one line of outcome, then bullets: the three hash lines verbatim, the six gate tails verbatim (frostline with its seeds line), the commit hash, the push result. Every nonconformity its own labeled bullet. Seeds: frostline rolls fresh and prints; the rest seedless.
