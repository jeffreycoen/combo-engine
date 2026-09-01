# FROSTLINE — the game plan

A fan-fiction tactics game in the clone-war shape: a bounty hunter and clone squads working contracts on the ground and in space, one purse across both theaters. The pitch is `docs/frostline-pitch.md`; this document is the build skeleton. Plans are served for approval; code moves only on the go-ahead; arithmetic acceptance, prior gates bracketing, browser smoke for pages, deploy at every landing.

## The design

- **The fiction:** a bounty hunter crew in a clone war. The hunter loosely resembles the armored hunter of the era — helmeted, jetpack silhouette, twin sidearms — resemblance in shape and palette only, never in name. The squads are clones; the enemy is the droid army — no morale, no mind, marching in formation, which is what the engine's enemies already do. Contracts come from the underground and sometimes from the lawful side; a legitimacy tag on each job trades pay against heat. No franchise names in code, page, or commit history — the theme reads through silhouettes, colors, and structure.
- **The turns:** free movement until first contact, then alternating side turns — the player's half runs with the enemy held by the engine's own switch, then the enemy half runs while the player holds. Squads are the operators: three action points each per turn, one point per confirmed order, moves capped in distance. Every action, move included, prices itself in a confirmation before the point spends.
- **Cover and the shot:** cover is geometry — the same solids and terrain the rounds fly through, read as open/half/full shields. The chance-to-hit beside a target is a displayed estimate built from the engine's own scatter arithmetic and silhouette exposure; the rounds stay physical.
- **The money:** every enemy defeated pays its bounty — the engine's own kill scoring — into the purse; the purse buys upgrades between contracts. The bounty hunter frame and the engine's arithmetic use the same word.
- **The space theater:** turn-based ship fighting on the landed orders and steering modules — orders as data, formation fans, banking, strafe and guard orbits — under the same turn machine and confirmation grammar, ships as the operators, paying into the same purse. Its one missing piece is a drawing layer; the roadmap holds two candidates (the fleet demo's kit, the space-hauler's flat renderer) and the choice is ruled when its phase opens.

## Standing facts, verified in the tree

- `bootWar({seed, dev: true})` is the skirmish boot — no starting muster, no bell, no census, loss checks inert; unit AI, squads, combat, physics, sight all still run.
- Squads form with the engine's own makers; enemies place with the engine's spawner; a move order is two field writes the sim already obeys, and arrival flips the squad to defend — the completion signal.
- Sight queries convert through the map's canonical coordinates — the number-one landmine.
- The world hash is id-free and bit-stable across twin boots; the run hash is polluted by module-global body ids — game gates pin the world hash and mission facts, never the run hash.
- Enemy specs carry bounty prices and the sim scores every kill — the money is already arithmetic.
- OLD MASTER is parked intact at `docs/play/`; FROSTLINE lives at `docs/frostline/` and `src/games/frostline/`.
- A mission is rules over a seeded map: forces place on double-vetted ground (solids and the movement grid's foot rule), every valley proves its spawn-to-exit road before a man spawns, and a refused valley steps deterministically to the next seed. A saved battle is its seed; the page pins it in the address.

## The phases

- [LANDED] **FL-1 — the mission and the turns.** REACH THE FAR SIDE: rifle, gunner, and sniper squads put someone through the western exit past a droid patrol. Free time to contact; alternating turns; move / attack / hold with confirmations carrying the shield and the chance-to-hit; win and loss cards; deployed. Gate: boot and end-state world hashes, the exact contact tick, the turn machine pure, the cover and estimate arithmetic, the scripted crossing to won, twin-run identity.
- [LANDED] **FL-2 — the fight's verbs.** Overwatch cones with point investment, focus fire, discipline per squad, target marking.
- [LANDED] **FL-3 — the estimate audited.** A fixed long tape fires at a fixed layout; the gate pins the measured hit rate inside a band around the displayed number.
- [LANDED] **FL-4 — the purse.** Bounties per kill into the purse; the upgrade screen between contracts; upgrades as data through the roster contract (squad strength, weapon rows, new team types).
- [LANDED] **FL-5 — the contract board.** Missions as data with a posted price and a legitimacy tag; clean jobs pay less, underground jobs pay more and raise the heat; the board is the campaign's spine.
- [LANDED] **FL-6 — the tape.** Orders recorded at their tick; a contract replays from seed plus tape; the replay is the campaign gate.
- [LANDED] **FL-7 — casualties that matter.** The men persist between contracts and the dead stay dead: survivors carry, a wiped squad fields nothing, replacements cost the table's own split price as a class, the medic team joins the shop on the engine's tend machinery, and the score card tells the losses. No revivable knockdown in the engine, so no wounded-and-downed state; rally not in this phase.
- [LANDED] **FL-8 — the space theater.** Ship contracts on the orders and steering modules under the same turn machine: ships as operators, the drawing-layer choice ruled here, the purse shared.
- [LANDED] **FL-9 — the hunter.** The bounty hunter as a commandable piece beside the squads — one armored man, twin sidearms, a jetpack line that flies 35 where a squad marches 22; bought once, one of a kind.
- [LANDED] **FL-10 — the ladder and closeout.** The contract board as campaign, persistence through the storage door, the game's README section, screenshots re-checked.
- **FL-11 — map types.** The generator's internal dials exposed as named profiles (city, forest, tundra, mountain and the rest); the passability proof extended to the craggy family; the placement anchor revisited for townless ground. Moved to the ladder's end on the owner's word after the seeded-valley landing.
- **FL-12 — bolts and burn marks.** Rounds drawn as energy bolts in each side's color; scorch marks through the ground-mark machinery. Moved to the ladder's end with FL-11.

Look, feel, and sound are decided at the deployed page at every landing; tuning numbers move only on playtest word.

## The repair — the state after the first full playtest

The core ladder (FL-1 through FL-10) is landed and gated, and the owner's playtest found the game hollow in places the gates cannot see. The record of what stands open, written before the repair begins:

- **The point economy is fiction.** A squad carries ONE order (the slots are exclusive by engine law — a new order overwrites the last), so three points buy three overwrites and only the final order plays. Overwatch's second point is the lone real multi-spend. Fix directions awaiting the owner's ruling: an order queue (points buy a sequence, executed in order on the player's half — the deep fix); reprice to one point per squad per turn (cheap truth); points as mid-half interrupts.
- **Every contract boots the same mission.** Job names (escort, hold, convoy) promise mission shapes that do not exist; only the valley and the pay change.
- **Heat is kept and displayed and spends nothing.**
- **The tape records and saves every battle; nothing can play one back.**
- **A finished free skirmish strands its address** — no path back to the board; a reloaded `?seed=` address never shows a board.
- **The exit marker draws off-screen** at mission start with no edge pointer — the mission opens with no visible goal.
- **The hunter draws as an ordinary trooper** — no silhouette, no flight visual.
- **The sniper's long shot:** the display prices a shot the territory doctrine will never allow.
- **Space is thin:** move and attack only, one hull, no tape, no camera control, the wing free to lose.
- **Small:** RESET PURSE wipes without confirmation; the board never scales to the purse.

**The repair order, ruled:** FIRST an audit document — the player's whole path traced against the code, every screen, button, spend, and displayed number marked TRUE, HOLLOW, or MISSING — so the repair is planned once, completely. Then repairs in truth order: the point economy made real; the path closed (board door, exit pointer, replay door); words squared with code (job names mapped to missions that exist, heat priced or removed from display); space to the same standard. One rung per playtest, per the standing cadence. FL-11 (map types) and FL-12 (bolts and burn marks) stay the parked tail behind the repair.

