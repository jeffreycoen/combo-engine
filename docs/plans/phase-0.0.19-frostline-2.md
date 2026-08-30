# Phase 0.0.19 — FROSTLINE FL-2: the fight's verbs

Status: LANDED, commit `4d867a6`, 2026-08-30. Gate: 24 PASS / 0 FAIL; prior gates unmoved.

The second rung of `docs/plans/game-frostline.md`: overwatch cones priced in points, focus fire on a shared mark, careful/free discipline a squad at a time — and every floating word on the page made readable on snow, phone and desktop. Same mission, same map; the verbs are the phase.

## Lift kind

SHAPED — new game code on engine surfaces, plus three deliberately inert hooks in the engine's own trigger:

- **The hooks live where the trigger lives:** `squadFire` (state.js) gains `holdFire` (the safety), `fireArc` (the cone), and `focusId` (focus fire) — per-squad fields no depot code ever sets, so every prior gate pins them inert. One observability stamp (`_lastTargetId`) lets the gate see which body the trigger chose.
- **The verbs are pure state:** `verbs.js` prices the cone (1 point 90°, 2 points 180°), holds the one shared mark, writes the three engine fields from the turn phase and discipline each tick, and draws the cone on the existing order-path overlay. No new renderer surface.
- **Discipline rules the enemy half:** CAREFUL holds fire unless a cone covers the shot; FREE fires at anything seen. The player's own half fights as FL-1 did.
- **Free actions exist now:** mark and discipline cost no points — information and doctrine are free; every priced action keeps its confirmation.
- **The words sit on chips:** title, hud, banner, reason each get a dark backdrop — the white-on-snow defect closed.
- Labeled provisional dials, moved on playtest word: cone widths, cone draw reach 24 m, careful as the default discipline.

## Acceptance arithmetic for the phase

Every number below was produced by running the exact planned code at plan-writing time; the page smoked in a real browser (347479-byte paint, the hud line and all three new buttons in the DOM, and in the unattended run the patrol made contact and froze time on its own).

- `node scripts/gate.mjs frostline` prints 24 PASS lines, then `frostline-test: 24 PASS / 0 FAIL`, then `frostline-test PASS`, exit 0 — FL-1's sixteen checks unmoved, eight new:
  - overwatch prices its width and re-aims; the cone's own arithmetic holds at the wrap seam;
  - discipline rules the enemy half: careful holds, the cone and free fire on, your own half everyone fights;
  - the safety is real: a holding squad never pulls; released, it takes the nearest man;
  - the cone binds the trigger: pointed away nothing fires, pointed on it fires;
  - focus fire outranks near, and a dead focus falls back to the scan;
  - the mark is one shared target and a dead mark clears itself;
  - the cone draws itself: two edges and a five-point arc on the existing overlay.
- All prior gates unmoved (the full suite, re-run at plan-writing time — the hooks are proven inert).
- File identity, proven at trial (full values in the task document): state 107954 B, verbs 4205 B, gate 11961 B, page 4689 + 15282 B.

## Deploy

The landing push publishes `https://jeffreycoen.github.io/combo-engine/docs/frostline/`. Phone and desktop: the new verbs ride the same action bar and confirmations; the text chips read in sun.

## Tasks

- 0.0.19-1 — the engine hooks, the verbs module, the page, the gate, smoke, deploy, records. → `task-0.0.19-1-verbs.md`
- 0.0.19-1.5 — spawns on vetted ground (trees block slots on the game's word), the phone layout kept in lanes, four pins re-taught. → `task-0.0.19-1.5-groundwork.md`

Suggested model: Sonnet 5 — every changed byte is printed in the task document; hashes ratify the outcome.
