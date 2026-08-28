# Task 0.0.1-3 — the gates

One job: register the three gates, run them, match the pinned numbers, then land the whole phase as one commit and push it.

Suggested model: Sonnet 5 — mechanical.

Required reading, in order (confirm at the top of your report):
1. This file, whole.
2. `docs/plans/phase-0.0.1-coldsnap-migration.md`, whole.

Precondition: tasks 0.0.1-1 and 0.0.1-2 landed. Assert:

```sh
sha256sum -c docs/plans/task-0.0.1-1-inventory.txt --quiet && test -d node_modules && echo READY
```

Must print `READY`.

## Steps

1. In `scripts/gate.mjs`, replace the empty table

```js
const GATES = {
};
```

with

```js
const GATES = {
  "api": ["src/depot/api.js", "gate", "1", "90"],
  "combat": ["scripts/combat-test.mjs"],
  "accuracy": ["scripts/accuracy-test.mjs"],
};
```

and delete the four header comment lines that say the table starts empty (the lines from `// The table is the registry` through the `//   "api": ...` example). Touch nothing else in the file.

2. Run the three gates through the wrapper:

```sh
node scripts/gate.mjs api
node scripts/gate.mjs combat
node scripts/gate.mjs accuracy
```

3. The arithmetic — the pinned numbers, captured from coldsnap at commit `82b5524` at plan-writing time. Each must match exactly:

- api: the line ends `worldHash 3367709165  runHash 2717846799`
- combat: `ALL PASS` with 7 PASS / 0 FAIL
- accuracy: `11/11`

Any other number stops the task — that is a finding against the copy, not something to fix here.

4. Run the api gate a second time; the two hash lines must be identical (determinism holds on this machine).

5. Write `.gitignore` at the repo root, exactly:

```
node_modules/
.superpowers/
```

6. Commit the phase — the copy, the scaffolding, the gate table, the ignore rules, and the plan documents — and push:

```sh
git add src scripts package.json package-lock.json .gitignore docs
git commit -m "phase 0.0.1 — the coldsnap engine arrives, verbatim at 82b5524

42 files, byte-identical to the pin. Gates green here:
api worldHash 3367709165 runHash 2717846799, combat 7 PASS, accuracy 11/11.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push origin main
```

## Acceptance

- Three `ok` lines in `.superpowers/gates.log` with the numbers of step 3.
- Step 4's two hash lines identical.
- `git status --short` clean after the commit except the untracked demo files and CLAUDE.md.
- Push accepted by origin.

## Report

One line of outcome, then: the three gate lines verbatim, the commit hash, and any nonconformity as its own labeled bullet. Fixture seed: 1 (the api gate's seed; no seed is special).
