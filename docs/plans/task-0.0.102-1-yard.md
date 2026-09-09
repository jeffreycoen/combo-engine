# Task 0.0.102-1 — the yard: the combination proof

One job: the closing phase of the general parts order. One headless gate wires parts from four demos by hand, the way a game would, and proves they compose on plain data. No module ships; the gate is the deliverable. Write exactly the design below, run the gate, write the phase document, commit on your branch, report. You design nothing beyond this brief; anything it did not foresee stops the task and is reported as a nonconformity.

Model: Sonnet 5.

Where you work: the worktree at `/home/batman/combo-wt/yard`, branch `phase/0.0.102-yard`, branched from main after every other phase of the order landed. You never touch `/home/batman/combo-engine` (the main tree). You never edit `scripts/gate.mjs`, `README.md`, `package.json`, `src/modules/registry/registry.js`, any module, or any document of another phase. You never edit a demo file.

Required reading, in order, whole (confirm each with its line count at the top of your report):
1. This file.
2. `/home/batman/combo-engine/docs/plans/batch-general-1.md`, the sections "The generalization law", "The rules of the run", and "The proof phase: the yard".
3. In `/home/batman/combo-wt/yard/src/modules/`: `orders/orders.js`, `steering/steering.js`, `greybox/greybox.js`, `solids/solids.js`, `ballistics/ballistics.js`, `voxel/voxel.js`, `support/support.js`, `ledger/ledger.js`, `tape/tape.js`, `determinism/determinism.js`, each whole.
4. `/home/batman/combo-wt/yard/scripts/support-test.mjs`, whole, the one landed gate that composes three of these modules.
5. `/home/batman/combo-wt/yard/docs/plans/phase-0.0.73-aim.md`, as the shape of a phase document.

## The design, fixed

Gate `scripts/yard-test.mjs`, new. It imports only from `../src/modules/<name>/` and node's fs. It builds one scenario, `runYard(seed, opts)`, and asserts laws over it. No page, no timers, no unseeded random anywhere: every draw comes from the determinism kit's sim stream seeded from the run's seed.

The scenario, fixed:

- The floor: `buildSolids` from greybox over a part list made by `partWall("w", 0, 12, 12, 1, matWall)` (a one-floor wall of width 12 whose front face sits at z 12), plus two `partColumn` posts at x minus 4 and plus 4, z 8, height 3, radius 0.3, matWall. Every part is a prim for the voxel world and the support level too (the same objects). The material map is the yard's own: a media table of three rows, air, then `wall` and `post`, each rolled by the run's stream inside the ballistics contract's bounds (rho 500 to 8000, cd 0.5 to 1.5, yieldV 1e5 to 1e9, ricochetDeg 0 to 30, shatterV 0 to 1500, deformV 100 to 400, areaMult 1 to 4, retain 0.2 to 0.6); matWall is index 1 for the wall's structural parts and index 2 for the posts; glass parts keep index 1.
- The fleet: three units from `orders.makeUnit` with a spec `{ raider: { hp: 30, speed: 0.5, dmg: 1, range: 30, turnRate: 3, accel: 0.4, strafeRadius: 0, strafeRate: 0.7, guardRate: 0.5, idleRate: 1 } }`, placed at x minus 3, 0, plus 3 on z minus 6, y 1.2, each with `steering.attachMotion` (heading toward plus z, strafe angle 0, strafe direction 1, idle orbit rolled 0 to 6.28). A move order at tick 0 to `[0, 1.2, 4]` through `orders.orderMove`, recorded on the tape as `{ k: "move", x, y, z }` at tick 0. Each tick: `resolveMode` per unit; move units step with `stepMove`, idle units with `stepIdle`; a unit that arrives (`arriveMove`) goes idle.
- The guns: one `Ballistics` engine with the handed media and the demo's rounds, pool 64, scatter off, gravity default, solids from buildSolids, `query` from the voxel world's `makeWorldQuery` over those solids and its fields. Each tick, each unit whose distance to the wall's front-face centre `[0, 1.2, 12]` is under its range fires one `hostile_rifle` round from its position toward that point, with the shot's seed the next draw of the sim stream times 2^32, as long as its magazine (8 rounds) holds; then `stepTick` twice per tick (the engine runs at 120 per second, the yard at 60).
- The damage: after the engine steps, every `EV_PERFORATE` and `EV_EMBED` event whose `solid` index maps to a prim through buildSolids's `map` calls the voxel world's `damage(prim, x, y, z, ein minus eout, ix, iy, iz)`; then `drain()`. Then `support.settleWorld(level, (pr) => vox.dropPrimAsCluster(pr))` once per tick, followed by `vox.step(1/60, solids)` and `vox.stepClusters(1/60, solids)`.
- The books: a ledger with dimension `rounds`; at genesis `declare("rounds", 24)` (three magazines of eight); sources: `magazine` (the sum of the units' remaining rounds), `live` (the engine's liveCount), `spent` (a counter the yard raises on every embed, expire, and on a round recycled by the pool, which the yard detects when a fire returns a slot that was live); `audit()` every tick must be ok with zero drift.
- The clock: 90 ticks of 1/60.
- The hash: `determinism.stateHash(rows)` over, in order: every unit's position and speed; every live round's position; the voxel world's debris count, cluster count, and rubble count; the ledger's audit totals; the tape's length.
- `runYard(seed, { media, actions })` returns `{ hash, events, ledgerOk, hits, carved, tape }` where `actions` optional replaces the recorded orders with a replayed list through `tape.replayTape`, and `media` optional hands a media table (default: rolled from the seed's own stream first).

Checks, in this order and with these names:

1. `yard: twin runs from one rolled seed end with one state hash` — runYard(seed) twice: equal hashes and equal event counts.
2. `yard: replay from seed plus tape reproduces the hash` — run A records its tape; run B replays A's actions through replayTape's apply and step hooks with the same seed: equal hashes.
3. `yard: the ledger audits to zero drift at every tick` — ledgerOk true (every tick's audit ok).
4. `yard: every impact carries a material from the handed table and energy out at most in` — every perforate, embed, and ricochet event has mat in 0 to 2 and eout at most ein.
5. `yard: rounds reach the wall and carve it` — hits at least 1 and carved (the wall's field's live fraction under 1) true.
6. `yard: a second rolled media table keeps every law` — runYard with a second rolled table: checks 1, 3, and 4 hold again.
7. `yard: parts from four demos compose in this one gate` — read this gate's own file with fs and assert its import specifiers name exactly these ten module folders: orders, steering, greybox, solids, ballistics, voxel, support, ledger, tape, determinism.

The count line is `yard-test: 7 PASS / 0 FAIL`, then `yard-test PASS`, exit 0. Any FAIL stops the task. A rolled seed is printed as `seeds {"yard":<n>}`, read from `process.env.SEED` when set, else rolled.

## Steps

1. Read the list above. Confirm.
2. Write the gate.
3. Run, from the worktree root, twice: `node scripts/yard-test.mjs`. Both runs must print the seeds line, 7 PASS lines, the count line, and the verdict, exit 0. Paste both outputs whole in the report.
4. Write `docs/plans/phase-0.0.102-yard.md` in the worktree, this shape:

```
# Phase 0.0.102 — the yard: the combination proof

Status: PLANNED. Built in worktree, awaiting the landing.
<!-- At landing this line becomes: Status: LANDED, commit `<hash>`, <date>. Gate: 7 PASS / 0 FAIL; the full self-test all gates PASS. -->

The closing phase of the general parts order. One headless gate wires ten parts from four demos by hand: fleet units fly a course over a greybox floor; rounds fired through a handed material table carve voxels and settle the pile; a ledger audits every round; every order rides a tape; the state hash is the proof. No module ships; no page ships.

## Lift kind

No lift. The gate is new code over landed modules.

## Acceptance arithmetic for the phase

Every number below is the run's output (rolled seeds <the two seeds>).

- `node scripts/yard-test.mjs` prints a seeds line, 7 PASS lines, then `yard-test: 7 PASS / 0 FAIL`, then `yard-test PASS`, exit 0.
- Bracket, run at the landing: the yard, and the full self-test.

## Tasks

- 0.0.102-1 — the gate. → `task-0.0.102-1-yard.md`
```

5. Commit on your branch, both files, with this message exactly:

```
phase 0.0.102 — the yard: the combination proof

The closing phase of the general parts order. One headless gate wires ten parts from four demos by hand and proves they compose on plain data: twin identity, tape replay, a zero-drift ledger, honest impacts, a carved wall. Gate 7 PASS / 0 FAIL at rolled seeds.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01QSq3kZC3Bk9SC5RwnqYUfs
```

Do not push. Do not touch main.

## Rules

- No page. No timers. No unseeded random. Rolled seeds, printed. No literal that is one seed's own output.
- Never edit a demo file, any module, the gate table, the README, the package version, the registry table, or another phase's documents.

## Report

Read-confirmation first (each file, its line count). One line of outcome. Then bullets: both gate outputs whole; the diff summary as files and line counts (`git diff --stat` against main); the commit hash on your branch; every nonconformity as its own labeled bullet. Fixture seeds: the two rolled seeds; no seed is special.

## The report's gate lines

- `node scripts/yard-test.mjs`: seeds 2595252378 and 1754789186; 7 PASS lines, `yard-test: 7 PASS / 0 FAIL`, `yard-test PASS`, exit 0, twice.
- Bracket at the landing: the yard through the gate table, registry, every tail PASS. The gate-table line is the landing's; the yard has no registry entry, shipping no module.
- The full self-test on the merged tree at the landing, the third of the order's three: `selftest: all 47 gates PASS`.
- Branch commit 87f6313 on phase/0.0.102-yard, landed by squash into main.
- Nonconformity: the agent on this brief made no write in seventeen minutes after its reading and was stopped; the orchestrator wrote the gate from the brief as the plan-writer's own trial, in the scratchpad first and then in the worktree, and landed it under the same bracket. Readings where the brief was silent: the ledger's audit hands back its drift and not its totals, so the hash carries the drift; a hit on a carved part comes back through its field's index and maps to the same part; the solids are rebuilt after any damage so a carved part stops blocking, the demo's own practice; the replayed orders are recorded on the run's tape too, so the recorded run and the replay share one path and the tape's length matches. None moved a law.
