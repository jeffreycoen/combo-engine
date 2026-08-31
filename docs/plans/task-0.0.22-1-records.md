# Task 0.0.22-1 — the records follow the versioning rule

One job: records only, no game code. The two landings misfiled inside stamped phase 0.0.19 become their own phases per the standing rule — every landing is a phase, phases bump the third part, package.json tracks the last landed phase. The page's mk line reads package.json live, so the displayed mark becomes truthful at the same stroke. You design nothing.

This work is itself phase 0.0.22 (records are a landing too; the rule binds this task the same as any).

## Required reading, verified in the tree

1. This document, whole.
2. `docs/plans/phase-0.0.19-frostline-2.md` — the Tasks list you edit.
3. `CLAUDE.md`, the Versioning section.

Your report opens with a read-confirmation naming these.

## Steps

**Step 1 — green before anything moves.** Run `node -p "require('./package.json').version"` — must print `0.0.19`. Run `ls docs/plans/ | grep -c "0.0.19"` — must print `3`. Any other output stops the task.

**Step 2 — the groundwork landing becomes phase 0.0.20.**

```
git mv docs/plans/task-0.0.19-1.5-groundwork.md docs/plans/task-0.0.20-1-groundwork.md
sed -i 's/0\.0\.19-1\.5/0.0.20-1/g' docs/plans/task-0.0.20-1-groundwork.md
```

**Step 3 — the seeded-valley landing becomes phase 0.0.21.**

```
git mv docs/plans/task-0.0.19-2-seeds.md docs/plans/task-0.0.21-1-seeds.md
sed -i 's/0\.0\.19-2/0.0.21-1/g' docs/plans/task-0.0.21-1-seeds.md
```

One reference survives inside this file's own step-8 text naming the old `0.0.19-1.5` line it appended after at landing time — that is the record of what was executed; leave it.

**Step 4 — the two phase documents.** Write `docs/plans/phase-0.0.20-groundwork.md` and `docs/plans/phase-0.0.21-seeds.md` exactly as printed in the served companion files (they accompany this plan; at landing they are copied in verbatim).

**Step 5 — phase 0.0.19's index gives up the misfiled lines.** In `docs/plans/phase-0.0.19-frostline-2.md`, the two lines:

```
- 0.0.19-1.5 — spawns on vetted ground (trees block slots on the game's word), the phone layout kept in lanes, four pins re-taught. → `task-0.0.19-1.5-groundwork.md`
- 0.0.19-2 — the seed picks the valley: missions as rules, the road proven, the seed shown and pinned in the address. → `task-0.0.19-2-seeds.md`
```

become:

```

Follow-on landings first misfiled under this phase now hold their own phase numbers per the versioning rule: the groundwork landing is phase 0.0.20; the seeded-valley landing is phase 0.0.21.
```

**Step 6 — the version.** In `package.json`, `"version": "0.0.19"` becomes `"version": "0.0.22"` (0.0.20 and 0.0.21 are the re-recorded landings; this records task is 0.0.22).

**Step 7 — functional checks, output exact.**

- `node -p "require('./package.json').version"` prints `0.0.22`.
- `ls docs/plans/ | grep -E "0.0.2[012]"` prints exactly four lines: the two phase documents and the two task documents.
- `grep -rn "0\.0\.19-1\.5\|0\.0\.19-2" docs/plans/ | wc -l` prints `1` (the historical step-8 line named above).

**Step 8 — records and deploy.** Move this document to `docs/plans/task-0.0.22-1-records.md`. Commit everything with message:

```
phase 0.0.22 — the records follow the versioning rule

The groundwork and seeded-valley landings become phases 0.0.20 and 0.0.21,
each with its own record; package.json moves to 0.0.22 so the page's mk line
tells builds apart again. Records only; no game code.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
```

Push. No smoke, no page loads, no screenshots.

## Known limits, said plainly

- Stamped history keeps the old task numbers inside old commits and inside the landed plans' own step text — git is the record; nothing is rewritten.
- Task 0.0.18-1.5 (the camera landing) is also misnumbered under the rule, but it sits between two stamped phases and renumbering it would cascade through 0.0.19–0.0.21's identities. It stays as recorded history; the rule binds every landing from here.

## Report shape

Read-confirmation first, then one line of outcome, then bullets: every step-7 check's output verbatim, commit hash, push result. Every nonconformity its own labeled bullet. No fixture seeds — no test boots a world in this task.

## Suggested model

Sonnet 5 — mechanical renames and printed edits; the checks ratify.
