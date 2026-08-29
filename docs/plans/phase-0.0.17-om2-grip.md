# Phase 0.0.17 — OLD MASTER OM-2: GRIP

Status: LANDED, commit stamped below, 2026-08-28. Gate: 18 PASS / 0 FAIL; prior gates unmoved.
<!-- At landing this line becomes: Status: LANDED, commit `<hash>`, <date>. Gate: 18 PASS / 0 FAIL; prior gates unmoved. -->

The second OM phase of `docs/plans/game-old-master.md`: the grapple module's rope law mounted on the master's hand. Hold the reticle on a body to seize and reel it; release to hurl it down the aim; the rope's own 260 snap is the grip ceiling. The page grows the aim (pointer on desktop, right-half touch drag on the phone) and the renderer's own reticle marks it. Deploys to the same Pages address at landing.

## Lift kind

SHAPED — new game code composing the landed grapple module with the live war:

- The grapple is a plane law; the war's ground plane (x, z) rides it as the grapple's (x, y). Heights stay the engine's.
- Seize is the bite reeling from the first tick; holding and reeling are `stepRope` verbatim — reduced mass, the first-taut jerk, the winch's 8 u/s, the no-stretch split, the 260 snap, the strain account (surfaced in the title bar as the grip effort).
- Two labeled game dials, said plainly: **the will** (30) is the master's rope-end mass — not his 80 kg body — and with the rope's own constants it sets the grip ceiling near 487 kg, so stones and troopers grip while armor and the walker part the line; **the hurl** (impulse 600) is a fixed throw on release, not the grapple's yank — it cannot snap because the line is letting go as it throws, and mass alone decides how far anything flies (a 25 kg crate leaves at 24 m/s; the walker shrugs).
- Target pick: nearest live massed body to the aim, inside 6 of the reticle and 45 of the hand, never the master, ties broken by the world's own deterministic order.

## Acceptance arithmetic for the phase

Every number below was produced by running the exact planned code at plan-writing time (trial in the session scratchpad against the live engine; the page smoked in a real headless browser, scene rendered).

- `node scripts/gate.mjs old-master` prints 18 PASS lines, then `old-master-test: 18 PASS / 0 FAIL`, then `old-master-test PASS`, exit 0 — the nine OM-1 checks verbatim plus nine GRIP checks.
- Load-bearing knowns inside the new checks:
  - the first reel taut on a 25 kg crate lands exactly `8 · mu · 1.15` with mu = 30·25/55, under 260; three reeled seconds bring a 10 m crate to the rope's own 4 m floor;
  - the no-stretch split drags the master toward a 100 kg stone at 100/30 of the stone's share (ratio pinned 3.0–3.7);
  - the walker's first taut tops 260 — snapped, nothing moves; the ceiling sits by the rope's own law: 400 kg grips, 600 kg parts;
  - the hurl sends the 25 kg crate east at exactly 24; strain books while reeling;
  - live war, seed 1: a fixture crate reeled one second and hurled east — the master stands, the crate passes 14, and the whole world pins (worldHash `1533508814`, runHash `3688031194`).
- File identity, proven at trial: `src/games/old-master/grip.js` `893901e72b39a7f674bdef5a8adab6881ce2dd9681722330b968af69dcd80c64` (3878 B); `scripts/old-master-test.mjs` re-signed to `30e507f30e07bb27a4a5434c07f37dabbb538fe358bee39a526ec5e16b2f853c` (7396 B, licensed — OM-1 checks carried unchanged); `docs/play/main.js` re-signed to `c7e51cdf95b4f7bb0619e5f7c12061e61a3abaf914f44ff94033255dfa153c28` (5229 B).
- Browser smoke, per the OM-1 lesson now law for page tasks: the page executes headless and paints the valley (screenshot over 100000 bytes; a crashed canvas writes under 10000). The task repeats the smoke on the landed tree and must print `SMOKE-OK`.
- All seventeen prior gates unmoved, tails as re-run at plan-writing time: api `seed 1  seconds 90 (10800 steps)  worldHash 3367709165  runHash 2717846799` · combat `ALL PASS` · accuracy `11/11` · market, builder, ledger, weldstress, tape, physics-pb, rig, solids, ballistics, orders, steering, voxel, support, grapple — each `<name>-test PASS`.

## Known gap, named

The grip has no drawn line or beam yet — the reticle, the moving body, and the title-bar strain are the whole read. The visual belongs to look-and-feel; the polish queue carries it unless the owner rules otherwise at the live check.

## Deploy

The landing push rebuilds `https://jeffreycoen.github.io/combo-engine/docs/play/`. Hold on a crate or a stone near the town, watch it come; release to throw it.

## Tasks

- 0.0.17-1 — grip module, re-signed gate, re-signed page script, browser smoke, deploy, records. → `task-0.0.17-1-om2-grip.md`

Suggested model: Sonnet 5 — every authored file's full content is in the plan.
