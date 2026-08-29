# OLD MASTER

A fan demo in the shape the old films left in us, with none of their names. One figure in the snow against a war machine. Third person. Everything breaks.

The order is gone. The depot in the valley never got the message. An old master walks down out of the pass to deliver it.

## The stance, not the hands

No left-hand/right-hand split. The master has one reticle and four disciplines, cycled like the war game already cycles possession. Each discipline changes what the same aim means:

| Discipline | What it is | What it runs on |
|---|---|---|
| GRIP | Seize what the reticle holds: pull it, hold it hovering, hurl it | The grapple module — reel, yank, reduced mass, the 260 snap as the grip ceiling |
| REPULSE | A radial shove from the master outward, or a directed slam down the reticle | The api's blast — damage low, knockback high, crater on the big one |
| LIGHTNING | Chained arcs leaping body to body | The war's live tesla system — the arcs and the possessed-tower trigger, re-aimed from a palm |
| DOMINION | Take an enemy's mind and wear it | The possession system, exactly as it exists — possess covers squads, towers, vehicles, and the walker already |

The war's tick input already carries one possess lane, one reticle, one stick. Four disciplines over that lane is a mode byte, not a new input system.

## Dominion is the crown jewel

The engine's strangest existing feature is the design's best power. `possess {kind: "squad"|"tower"|"vehicle"|"mech"}` is mind control, finished and gated. Seize a tank crew and drive their tank into their own column. Take a tesla tower and turn the depot's lightning on the depot. Take the walker. The dark cost: a dominated body burns — its hp drains while worn, and when it dies under you, you snap back to the master, staggered. Dominion of the walker is the late-game fantasy and it is already simulated.

## The Sith question

The master does not start dark. Wrath is the economy: the war's bounty system already prices every kill, so bounties feed a single meter — the Force — that all four disciplines spend. Restraint (knockdowns, disarms, routing squads that then flee) earns slowly and keeps the robe brown. Slaughter earns fast and stains it. At full wrath the lightning stops needing a tower's blessing and the title card's OLD gains a red glyph. Same meter, two readings; the player chooses what the master became. No dialogue needed.

## Outposts and the shape of the campaign

The valley already has the structure of a campaign in it:

1. **The pickets.** Enemy towers stand at the passes — each one an outpost with its garrison. Every tower type is a different fight: the mortar tower must be gripped mid-shell; the tesla tower is a Dominion target, not a Repulse target.
2. **The convoy ladder.** The war's manifest system runs supply down the roads on its own clock. Interdiction is a whole act: shove trucks off the ice, pull the cargo to the master's cave. Starve the depot and its assaults thin — the standing and starvation ledgers already track this and already change enemy behavior.
3. **The town.** Holder flags, garrisons, civilians' rooftops. Take it without leveling it, or level it — territory and the flag system score either choice.
4. **The depot itself.** Its walls are censused stones with break forces. The last act is architectural: tear the fortress down stone by stone, bury the garrison in their own masonry — the burial mechanic exists — and walk out.

## Ultimate destruction, itemized from the live engine

- Craters that persist and re-crater; the field's carve floor is a dial.
- Structure damage flag on: blasts wreck walls, towers, the depot's stones.
- **The frozen lake.** Ice fracture is in the world and switchable. Lightning across a lake a squad is crossing. That is the trailer shot.
- Wind: thrown wrecks and returned grenades drift on it; a blizzard scene is a dial, not a feature.
- Buried, burning, tumbling, sleeping bodies; wreck physics; smears that keep the whole fight painted on the snow.
- GRIP composes with all of it: everything destruction produces (chunks, wrecks, stones, the mortar's own shell) is ammunition.

## Third person

The camera rides behind and above the master's body — the renderer's zoom and focus already track a possessed unit, so the chase camera is a focus policy, not a renderer change. On Dominion the camera hands off to the worn body, which the engine also already does. Phone and desktop both: sticks for walk and aim, discipline wheel on a tap, per the standing interface law.

## What is genuinely new

One hero module (a body, the discipline wheel, the Force meter, the wrath ledger), one spec table (four disciplines, their costs and dials), the camera focus policy, a title card. The map, renderer, enemies, towers, convoys, territory, tesla, possession, saving, hashing, and the input tape all ride as they are. Scripted encounters become input tapes; every discipline lands with a gate.

## Sound

Coldsnap's sound engine came over whole: procedural and spatial, built from published acoustics, no asset files, driven by an event vocabulary. The master's kit joins that vocabulary — the grip is a low sustained bed that pitches with strain (the strain account is already a number every tick), the repulse is the blast family with the crack softened and the air kept, lightning is the tesla voice the engine already speaks, and Dominion gets a heartbeat bed that quickens as the worn body burns. A staff hum is one continuous bed with pitch on swing speed. All synthesized, all spatial, nothing downloaded.

## The staff

The double-bladed staff, ours to name — the pilgrim's staff, lit at both ends. Mechanically it is two things the engine already prices:

- **The deflection stance.** Holding guard turns the master's front arc into a parry: incoming rounds ricochet by the same graze-angle-and-retain law the material table uses. Walking slowly through rifle fire behind a spinning staff is the fantasy, and it is arithmetic.
- **The sweep.** A close-arc impulse — the blast law shaped into a fan, knockback high, reach short. Spin the staff, and the ring of troopers around you leaves the ground. The double blade is why the sweep hits the full circle; a single blade would only honestly cover the front.

The staff is also the wrath dial made visible: restrained, it knocks down; stained, it kills.

## The roster

Enemies are a spec table, and the roster contract exists so a second game can supply its own. OLD MASTER's table, all reskins of gated rows: **troopers** (the infantry specs — helmets, white in the snow, terrible aim by table), **automata** (walking tin soldiers on the enemy-spec chassis — slower, tougher, no morale, immune to Dominion; the mind trick needs a mind), the **armor** (tank and carrier as they stand), the **walker** (the mech), and the towers. The automata/trooper split gives Dominion its counterplay for free: dominate the flesh, dismantle the tin.

## Civilians

The town keeps its people — neutral team, unarmed bodies, spec rows with no fire tables. They flee the bell, hide indoors, and cheer a liberated flag. They are the wrath meter's conscience: a civilian caught in a repulse or under a thrown wreck stains the robe faster than any trooper kill, and a town liberated with its people standing pays the largest restraint dividend in the game. The engine already runs neutral bodies, flags, and holder logic; the civilians are rows and a flee behavior.

## Controls

Phone and desktop, both first-class, per the standing law.

- **Desktop:** move on the keys, aim with the pointer, hold to GRIP and release to hurl, tap for REPULSE, the discipline wheel on the number row or a key-cycle, guard on hold, Dominion by aiming and committing. The war game's reticle and possession bindings are the skeleton.
- **Phone:** the twin sticks — left walks, right aims — with the discipline wheel as a tap-fan around the right thumb, hold-to-grip on the aim stick itself, and guard as a left-edge hold. The mech demo's floating stick widget and coldsnap's touch plumbing carry it; no gesture requires two thumbs to leave the sticks.
- Every input lands in the one TickInput lane either way, so a phone fight and a desktop fight replay from the same tape.

## Other disciplines, the second circle

Held for later phases, each one an existing system re-aimed:

- **LEAP** — the blast law applied to the master's own body, a carve stamped where the landing hits. Crossing the valley in three thunderclaps.
- **FOCUS** — the frozen-time aiming law from the roadmap: stop the sim, choose the chunk and the arc, commit. The force-time power, and it checks an owed box.
- **VEIL** — the sight system already keeps per-team seen-maps; the veil edits the master out of the enemy's for its duration. Stealth as bookkeeping, not new senses.
- **CALL** — the convoy interdiction power: a standing grip that drags cargo off a moving truck, built from the grapple against the manifest system.

## Deploy

Yes — and not only at the end. Static modules, no build step, pushed to GitHub Pages at every landing, the final game included; the last landing is the finished page at the same address you watched it grow at. Seed plus tape reproduces any fight you report.

## First playable, for ruling when ready

The master walking the live map, GRIP and REPULSE working against real squads and real walls, waves on, deployed to Pages. Lightning, Dominion, wrath, and the campaign shape land as later phases, each behind its own gate.
