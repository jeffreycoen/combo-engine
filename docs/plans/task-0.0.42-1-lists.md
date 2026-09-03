# Task 0.0.42-1 — lists carved out

One job: move `lists` into its own module and leave the depot a one-line front door. Write exactly what is written, run the listed gates, report. You design nothing.

Suggested model: Sonnet 5.

Required reading, in order (confirm at the top of your report):
1. This file, whole.
2. `docs/plans/phase-0.0.42-lists.md`, whole.

## Steps

Run from `/home/batman/combo-engine`. A failed assert stops the task; report the step and its verbatim output, run nothing further.

1. Assert the ground:

```sh
sha256sum src/depot/lists.js   # must print ee7cc67f232122ae6af5a104e645aae660ce8cd6cf7627c4a95ae1b6397423cc
node scripts/gate.mjs combat | tail -1   # must print: ALL PASS
ls src/modules/lists 2>/dev/null || echo absent   # must print: absent
mkdir -p src/modules/lists
```

2. The move, byte-identical:

```sh
mkdir -p src/modules/lists
cp src/depot/lists.js src/modules/lists/lists.js
sha256sum src/modules/lists/lists.js   # must print ee7cc67f232122ae6af5a104e645aae660ce8cd6cf7627c4a95ae1b6397423cc
```

3. Write `src/depot/lists.js`, exactly (replacing the whole file):

```js
// lists lives in its own module now; this file is the depot's unchanged
// front door — every depot import keeps working.
export * from "../modules/lists/lists.js";
```

Then `sha256sum src/depot/lists.js` — must print `68d4bc55d116ed8c7e9ca24e17de0449dd6c58bc906c8e4ce564d4b717617554`.

4. The gates, all four, unmoved:

```sh
node scripts/gate.mjs api | tail -1         # must print: seed 1  seconds 90 (10800 steps)  worldHash 3367709165  runHash 2717846799
node scripts/gate.mjs combat | tail -1      # must print: ALL PASS
node scripts/gate.mjs frostline | tail -1   # must print: frostline-test PASS (count line: 63 PASS / 0 FAIL)
node scripts/gate.mjs old-master | tail -1  # must print: old-master-test PASS
```

5. Close the records in this landing: bump `package.json` version to `0.0.42`; in `docs/plans/phase-0.0.42-lists.md` replace the status line with `Status: LANDED, commit stamped below, 2026-09-03. Gate: prior gates unmoved, hashes identical.`; in `docs/plans/batch-extractions-2.md` flip `- [ ] 0.0.42 lists` to `- [x] 0.0.42 lists`. No README box is earned by a carve; none is touched.

6. Commit and push the landing, then stamp the real hash in a second small commit — NEVER amend after stamping. Add the named files only:

```sh
git add src/modules/lists/lists.js src/depot/lists.js package.json docs/plans/phase-0.0.42-lists.md docs/plans/task-0.0.42-1-lists.md docs/plans/batch-extractions-2.md
git commit -m "phase 0.0.42 — lists carved out

Moved whole into its own module; the depot keeps a one-line front door. Four gates unmoved.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push origin main
H=$(git rev-parse --short HEAD)
sed -i "s/commit stamped below/commit \`$H\`/" docs/plans/phase-0.0.42-lists.md
git add docs/plans/phase-0.0.42-lists.md && git commit -m "phase 0.0.42 record stamped — $H

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push origin main
```

## Acceptance

- Step 2's and step 3's sha256 lines exactly as printed above.
- Step 4: all four gates print their tails unchanged; frostline at its own rolled seeds.
- Records flipped riding the landing; both pushes accepted.

## Report

Read-confirmation first, then one line of outcome, then bullets: the sha256 lines verbatim, the four gate tails verbatim (frostline with its seeds line), both commit hashes, the push results. Every nonconformity its own labeled bullet. Seeds: frostline rolls fresh and prints; the rest are seedless or the api gate's own fixed harness.
