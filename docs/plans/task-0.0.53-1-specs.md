# Task 0.0.53-1 — specs carved out

One job: move `specs` into its own module and leave the depot a one-line front door. Write exactly what is written, run the listed gates, report. You design nothing.

Suggested model: Sonnet 5.

Required reading, in order (confirm at the top of your report):
1. This file, whole.
2. `docs/plans/phase-0.0.53-specs.md`, whole.

## Steps

Run from `/home/batman/combo-engine`. A failed assert stops the task; report the step and its verbatim output, run nothing further.

1. Assert the ground:

```sh
sha256sum src/depot/specs.js   # must print ec313ba529110489f65dd98003448f084b121b6127cfd21749fb178a3196babe
node scripts/gate.mjs combat | tail -1   # must print: ALL PASS
ls src/modules/specs 2>/dev/null || echo absent   # must print: absent
mkdir -p src/modules/specs
```

2. The move, byte-identical:

```sh
mkdir -p src/modules/specs
cp src/depot/specs.js src/modules/specs/specs.js
sha256sum src/modules/specs/specs.js   # must print ec313ba529110489f65dd98003448f084b121b6127cfd21749fb178a3196babe
```

3. Write `src/depot/specs.js`, exactly (replacing the whole file):

```js
// specs lives in its own module now; this file is the depot's unchanged
// front door — every depot import keeps working.
export * from "../modules/specs/specs.js";
```

Then `sha256sum src/depot/specs.js` — must print `e3bfa317386aed957a7b84ab3e691ee14cd4dc6b51f4e0bb084ab73469f93816`.

4. The gates, all four, unmoved. Each its own command; frostline once, through a file:

```sh
node scripts/gate.mjs api | tail -1         # must print: seed 1  seconds 90 (10800 steps)  worldHash 3367709165  runHash 2717846799
node scripts/gate.mjs combat | tail -1      # must print: ALL PASS
node scripts/gate.mjs frostline > /tmp/fl.out 2>&1; head -1 /tmp/fl.out; tail -2 /tmp/fl.out   # seeds line, then 63 PASS / 0 FAIL, then frostline-test PASS
node scripts/gate.mjs old-master | tail -1  # must print: old-master-test PASS
```

5. Close the records in this landing: bump `package.json` version to `0.0.53`; in `docs/plans/phase-0.0.53-specs.md` replace the status line with `Status: LANDED, commit stamped below, 2026-09-03. Gate: prior gates unmoved, hashes identical.`; in `docs/plans/batch-extractions-3.md` flip `- [ ] 0.0.53 specs` to `- [x] 0.0.53 specs`; in `README.md` flip `- [ ] specs — 0.0.53` to `- [x] specs — 0.0.53` — the modules list carries the progress, every landing.

6. Commit and push the landing, then stamp the real hash in a second small commit — NEVER amend after stamping. Add the named files only:

```sh
git add src/modules/specs/specs.js src/depot/specs.js package.json README.md docs/plans/phase-0.0.53-specs.md docs/plans/task-0.0.53-1-specs.md docs/plans/batch-extractions-3.md
git commit -m "phase 0.0.53 — specs carved out

Moved whole into its own module; the depot keeps a one-line front door. Four gates unmoved.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push origin main
H=$(git rev-parse --short HEAD)
sed -i "s/commit stamped below/commit \`$H\`/" docs/plans/phase-0.0.53-specs.md
git add docs/plans/phase-0.0.53-specs.md && git commit -m "phase 0.0.53 record stamped — $H

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push origin main
```

## Acceptance

- Step 2's and step 3's sha256 lines exactly as printed above.
- Step 4: all four gates print their tails unchanged; frostline at its own rolled seeds, seeds and verdict from the one saved run.
- Records flipped riding the landing — phase status, batch box, README line; both pushes accepted.

## Report

Read-confirmation first, then one line of outcome, then bullets: the sha256 lines verbatim, the four gate tails verbatim (frostline with its seeds line), both commit hashes, the push results. Every nonconformity its own labeled bullet. Seeds: frostline rolls fresh and prints; the rest are seedless or the api gate's own fixed harness.
