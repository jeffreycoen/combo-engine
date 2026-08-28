# Task 0.0.1-1 — the copy

One job: bring 42 files from coldsnap commit `82b5524fb6c9acc258b9edb685c832f7465537f7` into this repo, byte-identical, paths unchanged. Nothing is edited, nothing is designed. Coldsnap is not touched.

Suggested model: Sonnet 5 — pure mechanical execution.

Required reading, in order (confirm at the top of your report):
1. This file, whole.
2. `docs/plans/phase-0.0.1-coldsnap-migration.md`, whole.

## Substitution table

Empty. No token in any file may differ from the pin. An unlisted difference stops the task.

## Steps

Each step's command is exact. Run them from `/home/batman/combo-engine`. A failed assert stops the task; report it and stop.

1. Assert the pin exists and is where coldsnap stands. Must print the hash twice, identical.

```sh
git -C /home/batman/coldsnap rev-parse 82b5524fb6c9acc258b9edb685c832f7465537f7
git -C /home/batman/coldsnap rev-parse HEAD
```

2. Assert the destination is empty of the move set. Must print nothing.

```sh
ls src 2>/dev/null
```

3. Copy the 42 files out of the pinned commit itself (not the working tree).

```sh
git -C /home/batman/coldsnap archive 82b5524fb6c9acc258b9edb685c832f7465537f7 \
  src/engine src/graphics src/platform src/version.js \
  $(git -C /home/batman/coldsnap ls-tree --name-only 82b5524fb6c9acc258b9edb685c832f7465537f7 src/depot/ | grep '\.js$') \
  scripts/combat-test.mjs scripts/accuracy-test.mjs | tar -x -C /home/batman/combo-engine
```

4. Assert exactly 42 files arrived. Must print `42`.

```sh
{ find src -type f; ls scripts/combat-test.mjs scripts/accuracy-test.mjs; } | wc -l
```

5. The arithmetic. Verify every file against the inventory below. Must end `42 verified, 0 failed`.

```sh
sha256sum -c docs/plans/task-0.0.1-1-inventory.txt && echo "$(grep -c . docs/plans/task-0.0.1-1-inventory.txt) verified, 0 failed"
```

## Inventory

The file `docs/plans/task-0.0.1-1-inventory.txt` sits beside this plan and is the checklist step 5 runs against — 42 lines, sha256 then path, generated from the pin at plan-writing time. It is part of this plan; do not regenerate it.

## Acceptance

- Step 1 prints the same hash twice.
- Step 4 prints 42.
- Step 5 reports 42 verified, 0 failed.
- `git -C /home/batman/coldsnap status --short` shows coldsnap unchanged (gates.log aside).

## Landing

Do NOT commit. Report the three acceptance numbers and stop; the commit rides with task 0.0.1-3 after the gates prove the copy runs.
