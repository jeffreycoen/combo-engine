# Task 0.0.40-1 — sight carved out

One job: move the sight map into its own module and leave the depot a one-line front door. Write exactly what is written, run the listed gates, report. You design nothing.

Suggested model: Sonnet 5.

Required reading, in order (confirm at the top of your report):
1. This file, whole.
2. `docs/plans/phase-0.0.40-sight.md`, whole.

## Steps

Run from `/home/batman/combo-engine`. A failed assert stops the task; report the step and its verbatim output, run nothing further.

1. Assert the ground:

```sh
sha256sum src/depot/sight.js   # must print 528f7cc8c71d7bbbc7d107abc7b1f6372b6eb11f0e7a24be4f2350fbb76578aa
node scripts/gate.mjs combat | tail -1        # must print: ALL PASS
node scripts/gate.mjs old-master | tail -1    # must print: old-master-test PASS
node scripts/gate.mjs frostline | tail -1     # must print: frostline-test PASS
ls src/modules/sight 2>/dev/null || echo absent   # must print: absent
```

2. The move, byte-identical:

```sh
mkdir -p src/modules/sight
cp src/depot/sight.js src/modules/sight/sight.js
sha256sum src/modules/sight/sight.js   # must print 528f7cc8c71d7bbbc7d107abc7b1f6372b6eb11f0e7a24be4f2350fbb76578aa
```

3. Write `src/depot/sight.js`, exactly (replacing the whole file):

```js
// The sight map lives in its own module now (phase 0.0.40); this file is
// the depot's unchanged front door — every depot import keeps working.
export * from "../modules/sight/sight.js";
```

Then `sha256sum src/depot/sight.js` — must print `c2505b8181757081ee674e90de220d2b50e1881635739dd74ed0405697e4b08c`.

4. The gates, all four, unmoved:

```sh
node scripts/gate.mjs frostline | tail -2   # must end: frostline-test PASS (count line: 63 PASS / 0 FAIL)
node scripts/gate.mjs combat | tail -1      # must print: ALL PASS
node scripts/gate.mjs old-master | tail -1  # must print: old-master-test PASS
node scripts/gate.mjs api | tail -1         # must print: seed 1  seconds 90 (10800 steps)  worldHash 3367709165  runHash 2717846799
```

5. Close the records in this landing: bump `package.json` version to `0.0.40`; in `docs/plans/phase-0.0.40-sight.md` replace the status line with `Status: LANDED, commit stamped below, 2026-09-03. Gate: prior gates unmoved, hashes identical.`; in `docs/plans/batch-extractions-1.md` flip `- [ ] 0.0.40 sight` to `- [x] 0.0.40 sight`.

6. Commit and push the landing, then stamp the real hash in a second small commit — NEVER amend after stamping:

```sh
git add src/modules/sight src/depot/sight.js package.json docs/plans
git commit -m "phase 0.0.40 — sight carved out

The sight map moved whole into its own module, hash-identical; the depot keeps a one-line front door. Four gates unmoved.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push origin main
H=$(git rev-parse --short HEAD)
sed -i "s/commit stamped below/commit \`$H\`/" docs/plans/phase-0.0.40-sight.md
git add docs/plans && git commit -m "phase 0.0.40 record stamped — $H

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push origin main
```

## Acceptance

- Step 2: the module file's sha256 is `528f7cc8c71d7bbbc7d107abc7b1f6372b6eb11f0e7a24be4f2350fbb76578aa` — identical to the depot original.
- Step 3: the shim's sha256 is `c2505b8181757081ee674e90de220d2b50e1881635739dd74ed0405697e4b08c`.
- Step 4: all four gates print their tails unchanged; frostline's count line is `63 PASS / 0 FAIL` at its own rolled seeds.
- Records flipped riding the landing; both pushes accepted.

## Report

Read-confirmation first, then one line of outcome, then bullets: both sha256 lines verbatim, the four gate tails verbatim (frostline with its seeds line), both commit hashes, the push results. Every nonconformity its own labeled bullet. Seeds: frostline rolls fresh and prints; the api gate's seed-1 print is that gate's own fixed harness, unchanged by this task.
