# Task 0.0.22-1 — Amendment 1

One correction to step 7, check 3. The plan pinned the old-number reference count at 1, counting only the seeds task's historical step-8 line. The two new phase documents each carry one deliberate history line ("Landed first as task 0.0.19-...") — written by this same plan's step 4 and missed by its own count, because the trial's grep ran before those documents existed.

The check becomes:

- `grep -rn "0\.0\.19-1\.5\|0\.0\.19-2" docs/plans/ | wc -l` prints `3`, and the three hits are exactly: the seeds task document's historical step-8 line, and the one "Landed first as task ..." history line in each of the two new phase documents. Any other hit stops the task.

Nothing else changes. The agent's steps 1-6 stand as executed; on approval it re-runs step 7 with the corrected count and proceeds to step 8 (move, commit, push) as printed.
