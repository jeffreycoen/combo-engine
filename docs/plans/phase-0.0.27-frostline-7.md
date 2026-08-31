# Phase 0.0.27 — FROSTLINE FL-7: casualties that matter

Status: LANDED, commit `40f8679`, 2026-08-31. Gate: 54 PASS / 0 FAIL; prior gates unmoved.

The seventh rung of `docs/plans/game-frostline.md`: the men persist between contracts and the dead stay dead. Survivors carry to the next battle; replacements cost scrap; the medic team joins the shop on the engine's own tend machinery; the score card tells the losses. One honest correction to the ladder's old text: the engine carries no revivable knockdown — "pinned" is a transport state — so wounded-and-downed is not in this phase; what the engine truly owns (hp, death, medics healing the hurt mid-battle) is what ships.

## Lift kind

SHAPED — one inert engine hook, the books grown, the score card on the page:

- **The hook:** `spawnSquadMembers(world, squad, n)` takes an optional head count; every existing caller passes nothing and spawns exactly as before — the full suite proves it inert (api gate hashes byte-identical).
- **The books:** the purse carries `men` (heads per fielded slot) and `fallen` (the campaign's dead). A battle's survivors are recorded per slot; a wiped squad fields nothing next boot until replaced. A man's price is his squad's table price split by heads, rounded up; replacements come as a class — the whole bill or nothing.
- **The medics:** on sale beside the fighting squads; the engine's own tend machinery works on this ground unmodified — proven: a 3 hp man stands near full inside twenty simulated seconds.
- **The tape carries the heads:** a saved battle records its men so a replay boots the same battered roster.
- Provisional dials: man prices by table split (rifleman 8, gunner 19, sniper 34, medic 28), replacements-as-a-class.

## Acceptance arithmetic

Produced by running the exact planned files at plan-writing time, fixture seed 3:

- `node scripts/gate.mjs frostline` → 54 PASS lines, `frostline-test: 54 PASS / 0 FAIL`, `frostline-test PASS`, exit 0. Forty-five prior checks unmoved; nine new (head counts through the boot, the zero slot skipped, the score card's arithmetic, the man price, the bill, refusal and refill as a class, the vault round-trip, the medic tending).
- The full suite, every prior gate unmoved — the hook proven inert; api gate's line byte-identical: `seed 1  seconds 90 (10800 steps)  worldHash 3367709165  runHash 2717846799`.
- File identity in the task document.

## Tasks

- 0.0.27-1 — the hook, the books, the medics, the score card, the gate. → `task-0.0.27-1-casualties.md`

Suggested model: Sonnet 5 — every changed byte printed, hashes ratify.
