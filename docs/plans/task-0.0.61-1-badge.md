# Task 0.0.61-1 — the gates and the boot badge

One job: land the gates and the boot badge and its gate, byte-for-byte from this plan. Write exactly what is written, run the listed gates, report. You design nothing.

Suggested model: Sonnet 5.

Required reading, in order (confirm at the top of your report):
1. This file, whole.
2. `docs/plans/phase-0.0.61-badge.md`, whole.

## Steps

Run from `/home/batman/combo-engine`. A failed assert stops the task; report the step and its verbatim output, run nothing further.

1. Assert the ground:

```sh
node scripts/gate.mjs frostline > /tmp/fl.out 2>&1; tail -1 /tmp/fl.out   # must print: frostline-test PASS
ls scripts/selftest.mjs 2>/dev/null || echo absent   # must print: absent
```

2. Write `scripts/selftest.mjs`, exactly:

```js
// COMBO-ENGINE — selftest.mjs: the one-call headless run. Every registered
// gate in order, each verdict on one line, the api's fixed hashes printed,
// exit 0 only when every gate passes. This is the boot self-test the badge
// points at, runnable by anyone from a clean clone.
import { spawnSync } from "node:child_process";
const GATES = ["api", "combat", "accuracy", "market", "builder", "ledger", "weldstress", "tape", "physics-pb", "rig",
  "solids", "ballistics", "orders", "steering", "voxel", "support", "grapple", "old-master", "frostline", "escrow", "wells"];
let bad = 0;
for (const g of GATES) {
  const r = spawnSync(process.execPath, ["scripts/gate.mjs", g], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  const lines = (r.stdout + r.stderr).split("\n").filter((l) => l.trim());
  const tail = lines[lines.length - 1] || "";
  const ok = r.status === 0;
  if (!ok) bad++;
  console.log((ok ? "PASS " : "FAIL ") + g + " — " + tail.slice(0, 100));
}
console.log(bad ? `selftest: ${bad} of ${GATES.length} gates FAILED` : `selftest: all ${GATES.length} gates PASS`);
process.exit(bad ? 1 : 0);
```

Then `sha256sum scripts/selftest.mjs` — must print `67edd599b2f171e2e4facb1c337762ea38f8398e5ca6b741aa5b8a7072a00019`.

3. Write `scripts/badge-test.mjs`, exactly:

```js
// COMBO-ENGINE — badge-test. The badge's number is a law: twin boots of one
// rolled mission seed carry one hash; a different seed carries another.
import { bootMission, MISSION_R1 } from "../src/games/frostline/mission.js";
import { worldHash } from "../src/modules/determinism/determinism.js";
let pass = 0, fail = 0;
const check = (n, ok) => { if (ok) { pass++; console.log("PASS " + n); } else { fail++; console.log("FAIL " + n); } };
const SEED = process.env.SEED ? +process.env.SEED : Math.floor(Math.random() * 1e9);
console.log("seeds " + JSON.stringify({ badge: SEED }));
const h1 = worldHash(bootMission(MISSION_R1, SEED).war.world);
const h2 = worldHash(bootMission(MISSION_R1, SEED).war.world);
const h3 = worldHash(bootMission(MISSION_R1, SEED + 40).war.world);
check("badge: twin boots of one rolled seed show one number", h1 === h2 && h1 === (h1 >>> 0));
check("badge: a different valley shows a different number", h1 !== h3);
console.log(`badge-test: ${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
console.log("badge-test PASS");
```

Then `sha256sum scripts/badge-test.mjs` — must print `bf01b4a7b1ebab2a28bb481b0ba11de88af44a41911a3be3d91d6212e0c573fd`.

4. In `scripts/gate.mjs`, in the GATES table, add one line after the `"wells"` entry (or after the line the previous harness rung added, keeping this batch's entries together):

```js
  "badge": ["scripts/badge-test.mjs"],
```

5. The badge on the page. In `docs/frostline/main.js`, three replacements, each old text appearing exactly once.

Replace:

```js
import { tickWar, defaultTickInput, makeRenderer } from "../../src/depot/api.js";
```

with

```js
import { tickWar, defaultTickInput, makeRenderer } from "../../src/depot/api.js";
import { worldHash } from "../../src/modules/determinism/determinism.js";
```

Replace:

```js
const R = makeRenderer(canvas, war.world, { camera: "tactical" });
```

with

```js
// the boot self-test badge: the booted world's own hash, shown from the
// first frame — same seed, same number, any device, or something is wrong
const bootHash = worldHash(war.world);
const R = makeRenderer(canvas, war.world, { camera: "tactical" });
```

Replace:

```js
  hud.innerHTML = mkText + "<br>" + fpsText + "<br>seed " + seed + "<br>purse " + purse.scrap + (purse.heat ? "<br>heat " + purse.heat : "");
```

with

```js
  hud.innerHTML = mkText + "<br>" + fpsText + "<br>seed " + seed + "<br>world " + bootHash + "<br>purse " + purse.scrap + (purse.heat ? "<br>heat " + purse.heat : "");
```

Then `node --check docs/frostline/main.js` — silent. The walk: the readout in the top corner gains one line, "world N", phone and desktop alike, from the first frame of any battle; the board and debrief screens are untouched; no spend, no button, no price changes.

6. Run the new gate. Must print a seeds line, 2 PASS lines, `badge-test: 2 PASS / 0 FAIL`, `badge-test PASS`, exit 0:

```sh
node scripts/gate.mjs badge
```

7. Prior gates unmoved: rerun the step-1 frostline command; same tail.

8. Close the records: `package.json` version to `0.0.61`; the phase doc's status line to LANDED as its comment shows; in `docs/plans/batch-harness-1.md` flip this rung's box; in `README.md` flip the checklist box starting `- [ ] Headless gates and the boot self-test badge` to `- [x]`, and add the line `- [x] badge (with scripts/selftest.mjs) — headless gates and the boot self-test badge — 0.0.61` at the bottom of the "Serving checklist items" list.

9. Commit and push, then stamp:

```sh
git add scripts/selftest.mjs scripts/badge-test.mjs docs/frostline/main.js scripts/gate.mjs package.json README.md docs/plans/phase-0.0.61-badge.md docs/plans/task-0.0.61-1-badge.md docs/plans/batch-harness-1.md
git commit -m "phase 0.0.61 — the gates and the boot badge

Checklist: Headless gates and the boot self-test badge. Gate 2 PASS / 0 FAIL at rolled seeds.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push origin main
H=$(git rev-parse --short HEAD)
sed -i "s/commit stamped below/commit \`$H\`/" docs/plans/phase-0.0.61-badge.md
git add docs/plans/phase-0.0.61-badge.md && git commit -m "phase 0.0.61 record stamped — $H

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push origin main
```

## Acceptance

- Every sha256 above exact; the gate `2 PASS / 0 FAIL` then `badge-test PASS` at rolled seeds; frostline's tail unchanged; records flipped riding the landing; pushes accepted.

## Report

Read-confirmation first, then one line of outcome, then bullets: the sha256 lines verbatim, the new gate's seeds/count/verdict lines verbatim, the frostline tail, both commit hashes, the push results. Every nonconformity its own labeled bullet.
