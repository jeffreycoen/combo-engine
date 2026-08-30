# FROSTLINE

A squad-based tactical game in the coldsnap valley. Small teams, real physics, orders given in frozen moments. Third-person-of-many: you command, the men fight.

The war game asked you to run an economy while the shells fell. FROSTLINE removes the economy and keeps the shells: a handful of squads, a mission, and time that stops whenever a decision is yours to make.

## The frozen moment

The sim advances only when the page ticks it — so the pause is not a feature bolted on, it is the engine's natural state, and the game chooses when to leave it. Time stops automatically on the moments a commander would want it stopped:

- **Contact** — a squad sights an enemy it hadn't seen (the sight maps already know);
- **A man down** — any friendly casualty;
- **Orders complete** — a squad finishes its move with nothing queued;
- **The hand of the player** — tap anywhere to freeze at will.

In the frozen moment you issue orders; releasing time plays them out. Because the whole sim is deterministic and every order lands in the input tape, an entire mission replays bit-exact from seed plus tape — a bug report is a saved battle, and every mission in the campaign is a gate the machine can check.

## The command grammar

The fleet demo's order model — already extracted, landed, and gated as the orders module — is the command layer: orders live as data on units, verbs are exclusive, and a group move fans onto the grid in formation. FROSTLINE speaks it over coldsnap squads:

- **Select** a squad (tap its marker; cycle with a key or swipe);
- **Move** — the grid fan places the men; the movement grid's own blocked/steep/cover facts shape the path;
- **Attack** — focus fire on a marked target;
- **Guard** — overwatch a point, engaging what enters reach;
- **Discipline** per squad — the war's own careful/free switch decides who shoots first.

Order routes draw with the renderer's existing order-path overlay; the gridlines the engine already draws become the game's tactical read.

## The mission shape

The map generator bakes a 90 × 90-cell valley (180 m); a smaller world is not a dial today, said plainly. So a mission is a **box drawn on the valley**: a play area (the town, a pass, the stream crossing), a fixed friendly force, a fixed enemy force placed with the engine's own spawner, and the depot economy OFF via the engine's built-in sandbox switch — no waves, no build lines, no resources. Objectives from what the engine already measures: hold the flags, reach the point, fewer than N casualties, silence the tower.

A campaign is a ladder of such boxes across the same valley, weather and light turning as it climbs.

## What lands nearly free

- Squads, unit AI, cover behavior, per-man specs, morale-adjacent bravery — the depot sim's own.
- Sight and territory maps for contact detection and fog-honest information.
- The orders module for the grammar; the steering module later if formations want smoother motion.
- Craters, wrecks, smears — fights leave marks; ice fracture for one memorable mission.
- The page kit as hardened this week: live mk and fps, sticks, the browser-smoke law, Pages deploy at every landing.
- Determinism end to end: auto-pause costs nothing because pause is just not ticking.

## What is genuinely new

The selection-and-orders view layer (markers, taps, the frozen-moment UI), the pause-trigger wiring over existing events, mission definitions as data (the box, the forces, the objective), and a win/loss screen. No new physics, no new AI, no bespoke hero body — the lesson of OLD MASTER applied.

## OLD MASTER

Parked, not unwound: its landings, gates, and page stay live at `docs/play/`. FROSTLINE takes `docs/frostline/`. The master may yet walk into a late mission as a special unit.

## First playable, for ruling when ready

One mission box near the town: two friendly squads, one enemy squad placed fixed, waves off. Select, move-order with the grid fan, auto-pause on contact and on completion, tap-to-freeze, deployed to Pages. Combat already works because the engine already fights; the first playable is about whether commanding feels right.
