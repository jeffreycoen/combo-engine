# Task 0.0.41-1 — wind carved out

One job: move the wind stream into its own module and leave the depot a one-line front door. Write exactly what is written, run the listed gates, report. You design nothing.

Suggested model: Sonnet 5.

Required reading, in order (confirm at the top of your report):
1. This file, whole.
2. `docs/plans/phase-0.0.41-wind.md`, whole.

## Steps

Run from `/home/batman/combo-engine`. A failed assert stops the task; report the step and its verbatim output, run nothing further.

1. Assert the ground:

```sh
sha256sum src/depot/wind.js   # must print f60764cd6483df5b730d156879fd0cf1a9594a9990193c077ade0bede72b3a33
node scripts/gate.mjs ballistics | tail -1   # must print: ballistics-test PASS
node scripts/gate.mjs accuracy | tail -1     # must print: 11/11
ls src/modules/wind 2>/dev/null || echo absent   # must print: absent
```

2. The move, byte-identical:

```sh
mkdir -p src/modules/wind
cp src/depot/wind.js src/modules/wind/wind.js
sha256sum src/modules/wind/wind.js   # must print f60764cd6483df5b730d156879fd0cf1a9594a9990193c077ade0bede72b3a33
```

3. Write `src/depot/wind.js`, exactly (replacing the whole file):

```js
// The wind stream lives in its own module now (phase 0.0.41); this file is
// the depot's unchanged front door — every depot import keeps working.
export * from "../modules/wind/wind.js";
```

Then `sha256sum src/depot/wind.js` — must print `8e7098ff931ac6ef480028facbd32e3aa1863b77cdc8b299e69c8218edf1ee87`.

4. The gates, all four, unmoved:

```sh
node scripts/gate.mjs ballistics | tail -1   # must print: ballistics-test PASS
node scripts/gate.mjs accuracy | tail -1     # must print: 11/11
node scripts/gate.mjs combat | tail -1       # must print: ALL PASS
node scripts/gate.mjs frostline | tail -1    # must print: frostline-test PASS (count line: 63 PASS / 0 FAIL)
```

5. Close the records in this landing: bump `package.json` version to `0.0.41`; in `docs/plans/phase-0.0.41-wind.md` replace the status line with `Status: LANDED, commit stamped below, 2026-09-03. Gate: prior gates unmoved, hashes identical.`; in `docs/plans/batch-extractions-1.md` flip `- [ ] 0.0.41 wind` to `- [x] 0.0.41 wind`.

6. Commit and push the landing, then stamp the real hash in a second small commit — NEVER amend after stamping:

```sh
git add src/modules/wind src/depot/wind.js package.json docs/plans
git commit -m "phase 0.0.41 — wind carved out

The wind stream moved whole into its own module, hash-identical; the depot keeps a one-line front door. Four gates unmoved.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push origin main
H=$(git rev-parse --short HEAD)
sed -i "s/commit stamped below/commit \`$H\`/" docs/plans/phase-0.0.41-wind.md
git add docs/plans && git commit -m "phase 0.0.41 record stamped — $H

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push origin main
```

## Acceptance

- Step 2: the module file's sha256 is `f60764cd6483df5b730d156879fd0cf1a9594a9990193c077ade0bede72b3a33` — identical to the depot original.
- Step 3: the shim's sha256 is `8e7098ff931ac6ef480028facbd32e3aa1863b77cdc8b299e69c8218edf1ee87`.
- Step 4: all four gates print their tails unchanged; frostline's count line is `63 PASS / 0 FAIL` at its own rolled seeds.
- Records flipped riding the landing; both pushes accepted.

## Report

Read-confirmation first, then one line of outcome, then bullets: both sha256 lines verbatim, the four gate tails verbatim (frostline with its seeds line), both commit hashes, the push results. Every nonconformity its own labeled bullet. Seeds: frostline rolls fresh and prints; the rest are seedless arithmetic.
