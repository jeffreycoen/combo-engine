# Phase 0.1.3 — the nine findings

Status: DISPATCHED. Task 2 dispatched.
<!-- The status word is one of PLANNED, SERVED, APPROVED, DISPATCHED, LANDED, ACCEPTED, RETURNED, moved by the plan-writer at each step; the parts page reads it. The phase lands when its last task lands; each task's row below records its own landing. At landing this line becomes: Status: LANDED, commit `<hash>`, <date>. Acceptance is recorded per part under a heading "## Acceptance" as "- <part id>: accepted" or "- <part id>: returned, <finding>", on the owner's word. -->

The nine findings returned from the playtest of phase 0.1.2, recorded under Acceptance in `phase-0.1.2-the-findings.md`, fixed in one phase of five tasks: the opening she can survive, the field as the ship's own, the screen cut to what matters with the landing's popup, her look, and the ground that remembers its defences. Each task is planned after the one before it lands, written once for one reader. The game stays playable at every landing. Every number of the ark's own is PROPOSED.

## Lift kind

SHAPED. The ark's own layer, new code in its own files; coldsnap's files change only where a door is needed, each a listed difference from the checkout named in its task. Her look is shaped from coldsnap's own man parts; nothing is lifted from a demo.

## Decisions inside this plan

- **The opening she can survive.** Her row carries her own body, a man's size with 250 hit points. One rifle squad of coldsnap's, four men, stands guard behind her stand at the crash, in coldsnap's own defend order, and the hands stand behind the guard. The opening crash shakes 1,500 kg of the ship's own stores loose as scrap for the ground's purse, 150 scrap, enough for three field guns at once. Welding runs at half a second per metre a module slid, 14 s for a module that slid 18 m, over the 5 s base.
- **The field is the ship's.** The war boots without coldsnap's town, one listed difference in the boot; the census that would call the depot lost is empty, so the war ends only as the ark says. The attacker's objective moves to the bridge, and the paths recompute to it. Placement runs on any ground within 60 m of the bridge, the radius an option of coldsnap's placement, one listed difference. The ground is gouged along the line the ship came in on, from the bridge back 40 m toward where it came from, up to 2.5 m deep at the hull and shallowing away; the trees within 8 m of that line are felled along it.
- **The screen says what matters.** The pane is three short lines: scrap and the seconds to the next assault; loose modules, what she is doing and her seconds, the walker; the tap line. The log shows two lines. The buttons are two rows: the gun kind, WALL, FIX, TAKE OFF; FIGHT or HOLD as one toggle, REPAIR WALKER only while the walker lies wrecked, FIRE only while she is in it. SOUND joins the fixed cluster. At the landing a card says the ship and the mech were damaged and the mechanic must fix them, with one button, GO; the war stands still until GO.
- **Her look.** She wears a purple jumpsuit and longish brown hair: the ark's own look file draws them over her body, a coat in purple and a hair cap with two strands to the shoulders, following her position and facing, shaped from coldsnap's own man parts.
- **The ground remembers.** At TAKE OFF every gun and wall standing is written on the world, kind and place; at the next landing on that world they stand again before the crash, through coldsnap's own laws; nobody comes back for them. They are abandoned, and they persist.

## Tasks

- 0.1.3-1 — the opening: her hit points, the guard squad, the opening scrap, faster welding. LANDED, commit `358b2bf`. → `task-0.1.3-1-the-opening.md`
- 0.1.3-2 — the field: no town, the ship as the objective, placement room, the gouge, the felled trees. DISPATCHED. → `task-0.1.3-2-the-field.md`
- 0.1.3-3 — the screen: three lines, two rows, and the landing's card. Planned after task 2 lands.
- 0.1.3-4 — her look: the purple jumpsuit and the brown hair. Planned after task 3 lands.
- 0.1.3-5 — the ground remembers: defences abandoned and persisting. Planned after task 4 lands.

Suggested model: Sonnet 5 — every edit is in the plan; nothing is designed.

## The walk, task 1

Phone and desktop the same.

- **The opening.** The main file adds 1,500 kg of scrap to the hull before the opening crash and logs "the crash shakes 1,500 kg of scrap loose"; the ground opens with 150 scrap in the purse, so the first FIELD GUN 42 can be placed at once.
- **The crew.** She stands off the bridge's free face as before, now with 250 hit points on her own row; four of coldsnap's riflemen stand guard four metres behind her in coldsnap's own defend order, firing as any rifleman does; the hands stand behind them. The log says "4 riflemen stand guard"; the pane's crew line reads hands and guards.
- **FIX** runs at 5 s plus half a second per metre slid: the engine that slid 18 m takes 14 s, not 32.
- **Nothing else changes:** the orders, the walker, the ship's look, and space as they were.

## Acceptance arithmetic, task 1

- `node scripts/gate.mjs gravitys-ark` prints 50 PASS lines, one more than the recorded 49, then `gravitys-ark-test: 50 PASS / 0 FAIL`, then `gravitys-ark-test PASS`.
- The parts build names 50 gates and every verdict is ok.
- The five hash lines in the task print OK.

## The walk, task 2

Phone and desktop the same.

- **The field.** The war boots without coldsnap's town: no depot, no buildings, no depot flag. The ship flies its own flag over the bridge's roof, coldsnap's own kind of flag, and the ground around the ship is the player's: eight territory steps run at the crash, so a gun can go anywhere held within 60 m of the bridge from the first frame, and coldsnap's own law holds the ground it grows. The attacker's objective is the bridge, and every path recomputes to it; the assault comes at the ship.
- **The gouge.** Before the modules are set down, the ground is lowered along the line the ship came in on: from under the hull back 45 m, 2.5 m deep at the deepest 12 m behind the bridge, 8 m to either side with a rounded floor. The modules sit in it; the terrain redraws itself. Every tree in the gouge or within 2 m of its edge lies felled along the line, its crown toward the ship, dead and grey as coldsnap draws a dead tree.
- **The doors.** Two lines in coldsnap's files, listed differences: the boot skips the town when the ark asks; the placement radius takes the ark's number, 60 m. The README's engine line counts them.
- **Nothing else changes:** the orders, her, the guard, the walker, the ship's look, and space as they were.

## Acceptance arithmetic, task 2

- `node scripts/gate.mjs gravitys-ark` prints 51 PASS lines, one more than the recorded 50, then `gravitys-ark-test: 51 PASS / 0 FAIL`, then `gravitys-ark-test PASS`. One pin re-taught by this task's own change, named in the task: the purse check's ground carries the ship, since held ground grows from its flag.
- The parts build names 50 gates and every verdict is ok.
- The five hash lines in the task print OK.
