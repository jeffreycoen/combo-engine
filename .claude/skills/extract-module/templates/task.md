# Task 0.0.N-1 — <the module>

One job: <one sentence>. Every file's full content is below; write exactly what is written, run the listed gates, report. You design nothing.

Suggested model: Sonnet 5.

Required reading, in order (confirm at the top of your report):
1. This file, whole.
2. `docs/plans/phase-0.0.N-<name>.md`, whole.

Source of the math (reference only — do not edit it): `<demo file>` lines <a–b>.

## Steps

Run from `/home/batman/combo-engine`. A failed assert stops the task; report the step and its verbatim output, run nothing further.

1. Assert the ground: all prior gates green, destination absent. <List each gate command with its required tail; end with `ls src/modules/<name> 2>/dev/null || echo absent` requiring `absent`.>

2. Write `src/modules/<name>/<name>.js`, exactly:

```js
<the module file, byte for byte>
```

3. Write `scripts/<name>-test.mjs`, exactly:

```js
<the gate file, byte for byte>
```

4. In `scripts/gate.mjs`, in the `GATES` table (currently <k> entries ending with `"<last>"`), add one line after the `"<last>"` entry:

```js
  "<name>": ["scripts/<name>-test.mjs"],
```

Touch nothing else in the file.

5. Run the new gate through the wrapper. The output must be <N> PASS lines, then exactly `<name>-test: <N> PASS / 0 FAIL`, then `<name>-test PASS`, exit 0. Any FAIL stops the task before step 6.

```sh
node scripts/gate.mjs <name>
```

6. Assert the prior gates did not move (same required tails as step 1).

7. Close the records in this landing: bump `package.json` version to the phase number; in `docs/plans/phase-0.0.N-<name>.md` replace the status line with `Status: LANDED, commit stamped below, <date>. Gate: <N> PASS / 0 FAIL; prior gates unmoved.`; in `README.md` flip the earned checklist box(es) `- [ ]` to `- [x]` for <named boxes>. Then rebuild the parts table and the parts page, about four minutes since every gate runs: `node scripts/parts.mjs --gates all` must end with a `wrote docs/parts/parts.json` line; both files ride the landing commit, and the orchestrator republishes the page and names it in the landing report.

8. Commit and push the landing, then stamp the real hash in a second small commit — NEVER amend after stamping (an amend rewrites the commit and makes every stamped hash stale; phase 0.0.6 proved it):

```sh
git add src/modules/<name> scripts/<name>-test.mjs scripts/gate.mjs README.md package.json docs/plans docs/parts/parts.json docs/parts/parts.html
git commit -m "phase 0.0.N — <one line>

<two lines: what carried, the gate numbers>

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push origin main
H=$(git rev-parse --short HEAD)
sed -i "s/commit stamped below/commit \`$H\`/" docs/plans/phase-0.0.N-<name>.md
git add docs/plans && git commit -m "phase 0.0.N record stamped — $H

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push origin main
```

## Acceptance

- Step 5: `<name>-test: <N> PASS / 0 FAIL` then `<name>-test PASS`, exit 0, and an `ok` line in `.superpowers/gates.log`.
- Step 6: every prior gate prints its pinned tail unchanged.
- Step 7's three records flipped, riding the landing commit.
- Push accepted by origin.

## Report

Read-confirmation first, then one line of outcome, then bullets: the gate's count line and verdict line verbatim, every prior-gate tail, both commit hashes (landing and stamp), the push results. Every nonconformity its own labeled bullet. Fixture seeds: <list, or "none — seedless arithmetic">; no seed is special.
