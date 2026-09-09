# Task 0.0.112-1 — the parts page

One job: land the parts page's generator, its authored source, its builders, its page template, and its gate; widen the manifest tool by two roots; register the gate; carry the status vocabulary into the plan templates; put the seed export on every screen of the game page; build the page once with every gate; close the records. Every file's full content is below; write exactly what is written, run the listed gates, report. You design nothing.

Suggested model: Sonnet 5.

Required reading, in order (confirm at the top of your report):
1. This file, whole.
2. `docs/plans/phase-0.0.112-parts-page.md`, whole.

No demo file is read or written by this task. The coldsnap checkout at `/home/batman/coldsnap` is read by the generator for hashes only; nothing there is touched.

## Steps

Run from `/home/batman/combo-engine`. A failed assert or a FAILED hash line stops the task; report the step and its verbatim output, run nothing further.

1. Assert the ground: the manifest gate green, the parts folder absent, no parts gate registered, and the record already committed at e5d2300 with a clean tracked tree.

```sh
node scripts/gate.mjs manifest | tail -1
ls docs/parts 2>/dev/null || echo absent
grep -c '"parts"' scripts/gate.mjs
git status --short | grep -v "^??" | wc -l
git log --oneline -1 -- docs/plans/ark-shelf.md | cut -c1-7
```

Required: `manifest-test PASS`, `absent`, `0`, `0`, and `e5d2300`.

2. Write `docs/parts/parts-source.json`, exactly. The hash line must print OK.

```sh
mkdir -p docs/parts
cat > docs/parts/parts-source.json <<'PARTS_EOF_2'
{
 "title": "GRAVITY'S ARK, the parts",
 "coldsnap": {
  "checkout": "/home/batman/coldsnap",
  "commit": "111b9cb",
  "treeCommit": "82b5524"
 },
 "frames": [
  {
   "id": "bay",
   "n": 1,
   "name": "The bay",
   "see": "Your hull in pieces on a plague world under a star too big for the sky. A walker with dead actuators. The engineer, with a torch."
  },
  {
   "id": "hold",
   "n": 2,
   "name": "The hold",
   "see": "Every wave she fights or she fixes, never both. You leave when the hull is whole and the waves are still coming."
  },
  {
   "id": "ring",
   "n": 3,
   "name": "The ring under the star",
   "see": "Two or three worlds of ordinary business while the star swells and reddens and nothing names it."
  },
  {
   "id": "star",
   "n": 4,
   "name": "The star",
   "see": "On a takeoff it goes. A shell shoves everything outward. The light is gone, the pit is still there, and it starts to grow."
  },
  {
   "id": "road",
   "n": 5,
   "name": "The road",
   "see": "Eight to twelve worlds, the whole map known, the gate marked, and an edge that is wherever your engines lose to the pull."
  },
  {
   "id": "wrecks",
   "n": 6,
   "name": "The wrecks",
   "see": "Everything the shell threw out is falling back in, and the grappler eats it. Your ship is built from it."
  },
  {
   "id": "price",
   "n": 7,
   "name": "The price",
   "see": "Every station lists a price for her. A pirate demands her or your cargo, whichever is worth more."
  },
  {
   "id": "gate",
   "n": 8,
   "name": "The gate",
   "see": "Shut until she fixes it, with time, scrap, and modules. Then pay the toll and pass. Cannot pay? Sell your ship to the Fitters, module by module."
  },
  {
   "id": "card",
   "n": 9,
   "name": "The card",
   "see": "What came through, what the hole ate, and the name the galaxy gave you."
  }
 ],
 "gaps": [
  {
   "id": "g-mechbay",
   "name": "The mech bay",
   "what": "The walker rides only if a mech bay module is welded: it carries the rig's mass, sets the walker beside the hull at landing, boards it at takeoff."
  },
  {
   "id": "g-engineer",
   "name": "The engineer as one figure",
   "what": "Her price and hire-out in space, her body on the ground, fight or fix: one state on both sides of the seam."
  },
  {
   "id": "g-gate-seed",
   "name": "The gate by seed",
   "what": "Working with a high toll, broken, blockaded, or both, rolled by the seed; the blockade reuses the pirates with the holder's coin."
  },
  {
   "id": "g-save",
   "name": "A save of the whole run",
   "what": "The road, the registry of worlds, the log, and the ground as one saved run."
  },
  {
   "id": "g-dialogue",
   "name": "Dialogue as data and the ship computer",
   "what": "Lines as speaker, trigger, condition, text; the ship's own flat voice reading instruments and records."
  },
  {
   "id": "g-star-frame",
   "name": "The star in every frame",
   "what": "A camera law that keeps MORS in frame, bigger and redder per landing, and holds the shot at the collapse."
  },
  {
   "id": "g-ground-light",
   "name": "The ground's light",
   "what": "The one light from the star reddening per landing, the shadows lengthening."
  },
  {
   "id": "g-hands",
   "name": "The hands' words",
   "what": "A hand unpaid walks, the home line when the hole takes her world, the card's list of who did not come through."
  },
  {
   "id": "g-tramps",
   "name": "Tramps that leave",
   "what": "Plain bodies on a burn schedule leaving the near stations for the gate, never coming back."
  },
  {
   "id": "g-plague",
   "name": "The plague world",
   "what": "No market, the Grip's ground; the galaxy carries the world's kind."
  },
  {
   "id": "g-scrub",
   "name": "The scrub as a listing line",
   "what": "A clawed hull carries the Grip; a station scrubs it for a price on the listing."
  },
  {
   "id": "g-weapons",
   "name": "Weapons on the hull",
   "what": "The slug driver, the rack, the shield, from deadweight's lift, so a blockade can be fought and the sold module kinds do something."
  },
  {
   "id": "g-storyteller",
   "name": "The storyteller",
   "what": "A seeded pacer with a quiet dial at zero; may delay a wave, never shrinks one, never touches the hole."
  },
  {
   "id": "g-walker-scale",
   "name": "The walker at the ruled scale",
   "what": "Twice a trooper's height, standing. Open on coldsnap's bench."
  },
  {
   "id": "g-sound",
   "name": "Sound",
   "what": "Coldsnap's procedural engine on the ground; nothing in space yet."
  },
  {
   "id": "g-onboarding",
   "name": "Onboarding",
   "what": "The first minute explained; the ship computer's lines are the candidate."
  }
 ],
 "coldsnapGroups": [
  {
   "id": "cs-engine",
   "name": "The engine",
   "match": [
    "src/engine/"
   ],
   "serves": [
    "bay",
    "hold"
   ],
   "plan": "take"
  },
  {
   "id": "cs-drawing",
   "name": "The drawing",
   "match": [
    "src/graphics/"
   ],
   "serves": [
    "bay",
    "hold"
   ],
   "closes": [
    "g-ground-light"
   ],
   "plan": "take"
  },
  {
   "id": "cs-war",
   "name": "The war's systems",
   "match": [
    "src/depot/"
   ],
   "exclude": [
    ".jsx"
   ],
   "serves": [
    "bay",
    "hold"
   ],
   "plan": "take"
  },
  {
   "id": "cs-platform",
   "name": "The platform",
   "match": [
    "src/platform/"
   ],
   "serves": [
    "hold"
   ],
   "closes": [
    "g-sound",
    "g-save"
   ],
   "plan": "take"
  },
  {
   "id": "cs-mech-bench",
   "name": "The walker's bench",
   "match": [
    "src/game/mechReadout.js"
   ],
   "serves": [
    "hold"
   ],
   "closes": [
    "g-walker-scale"
   ],
   "plan": "take"
  },
  {
   "id": "cs-report",
   "name": "The after-action report",
   "match": [
    "src/aar/"
   ],
   "serves": [
    "card"
   ],
   "plan": "take"
  },
  {
   "id": "cs-superseded",
   "name": "The pre-fork drawing, superseded",
   "match": [
    "src/render/"
   ],
   "plan": "leave"
  },
  {
   "id": "cs-screens",
   "name": "Screens, rebuilt in the page's own way",
   "match": [
    "src/depot/",
    "src/ui/",
    "src/game/",
    "src/main.jsx"
   ],
   "only": [
    ".jsx"
   ],
   "plan": "leave"
  },
  {
   "id": "cs-ui",
   "name": "Screen helpers, left with the screens",
   "match": [
    "src/ui/"
   ],
   "plan": "leave"
  },
  {
   "id": "cs-campaign",
   "name": "The campaign pipeline, unused by the frames",
   "match": [
    "src/game/scenario.js",
    "src/game/predicate.js",
    "src/game/scenarios/",
    "src/game/runner/"
   ],
   "plan": "leave"
  },
  {
   "id": "cs-frozen-demo",
   "name": "The frozen demo the golden gate reads",
   "match": [
    "src/demo/"
   ],
   "plan": "decide"
  },
  {
   "id": "cs-version",
   "name": "The version mark",
   "match": [
    "src/version.js"
   ],
   "plan": "leave"
  }
 ],
 "parts": [
  {
   "id": "dw-determinism",
   "source": "deadweight",
   "group": "Lifted",
   "name": "determinism",
   "does": "The seeded stream and the state hash.",
   "module": "determinism",
   "gate": "determinism",
   "serves": [
    "bay",
    "hold",
    "ring",
    "star",
    "road",
    "wrecks",
    "price",
    "gate",
    "card"
   ],
   "plan": "keep"
  },
  {
   "id": "dw-market",
   "source": "deadweight",
   "group": "Lifted",
   "name": "market",
   "does": "Pools whose price moves with every trade.",
   "module": "market",
   "gate": "market",
   "serves": [
    "ring",
    "price"
   ],
   "plan": "keep"
  },
  {
   "id": "dw-ledger",
   "source": "deadweight",
   "group": "Lifted",
   "name": "ledger",
   "does": "Every unit declared at genesis, audited to zero drift.",
   "module": "ledger",
   "gate": "ledger",
   "serves": [
    "ring",
    "wrecks"
   ],
   "plan": "keep"
  },
  {
   "id": "dw-escrow",
   "source": "deadweight",
   "group": "Lifted",
   "name": "escrow",
   "does": "Contracts with escrow, rescues, the Authority's pay.",
   "module": "escrow",
   "gate": "escrow",
   "serves": [
    "ring",
    "price"
   ],
   "plan": "keep"
  },
  {
   "id": "dw-builder",
   "source": "deadweight",
   "group": "Lifted",
   "name": "builder",
   "does": "Ports, welds, mass and thrust, connectivity, rotate, remove.",
   "module": "builder",
   "gate": "builder",
   "serves": [
    "wrecks"
   ],
   "plan": "keep"
  },
  {
   "id": "dw-wells",
   "source": "deadweight",
   "group": "Lifted",
   "name": "wells",
   "does": "The field, the pair's orbit, the stop prediction.",
   "module": "wells",
   "gate": "wells",
   "serves": [
    "star",
    "road"
   ],
   "plan": "keep"
  },
  {
   "id": "dw-grapple",
   "source": "deadweight",
   "group": "Lifted",
   "name": "grapple",
   "does": "Cast, bite, reel, yank, snap.",
   "module": "grapple",
   "gate": "grapple",
   "serves": [
    "wrecks"
   ],
   "plan": "keep"
  },
  {
   "id": "dw-aim",
   "source": "deadweight",
   "group": "Lifted",
   "name": "aim",
   "does": "Frozen-time aiming: the cone, the shot prediction.",
   "module": "aim",
   "gate": "aim",
   "serves": [
    "wrecks",
    "price"
   ],
   "plan": "keep"
  },
  {
   "id": "dw-render2d",
   "source": "deadweight",
   "group": "Lifted",
   "name": "render2d",
   "does": "The projection, the warp, the gravity-warped grid.",
   "module": "render2d",
   "gate": "render2d",
   "serves": [
    "ring",
    "star",
    "road"
   ],
   "plan": "keep"
  },
  {
   "id": "dw-tape",
   "source": "deadweight",
   "group": "Lifted",
   "name": "tape",
   "does": "Every action with its tick; the replay is the save.",
   "module": "tape",
   "gate": "tape",
   "serves": [
    "road",
    "card"
   ],
   "closes": [
    "g-save"
   ],
   "plan": "keep"
  },
  {
   "id": "dw-world",
   "source": "deadweight",
   "group": "Not lifted",
   "name": "the world's extras",
   "does": "The nebula's drag, the gusher as a repelling well, the comet, the rocks that fall in and feed the eaten mass, the boundary, the frontier that replaces the dead, the sun's heat and kill radius.",
   "demoFns": [
    "makeWorld",
    "inNeb",
    "accel"
   ],
   "serves": [
    "road",
    "star"
   ],
   "plan": "lift"
  },
  {
   "id": "dw-flight",
   "source": "deadweight",
   "group": "Not lifted",
   "name": "the flight",
   "does": "The ship as a rigid body: thrust at each mount, torque off the balance point, the thruster quads, fuel as mass, the wells, the kill radii, the boundary, docking; the mass books; dock, undock, launch, the ship rebuilt from the build list; death, respawn on debt, the run's end; the rating mode.",
   "demoFns": [
    "stepWorld",
    "stepFlight",
    "holdKg",
    "holdCap",
    "totalM",
    "rebuildShipAt",
    "dock",
    "undock",
    "launch",
    "syncBuild",
    "die",
    "respawn",
    "finish"
   ],
   "serves": [
    "star",
    "road"
   ],
   "plan": "lift"
  },
  {
   "id": "dw-welds",
   "source": "deadweight",
   "group": "Not lifted",
   "name": "welds in flight",
   "does": "Load from thrust and impact, breaking, the ship splitting, shed modules becoming wreckage.",
   "demoFns": [
    "breakWeld",
    "shedModule",
    "fracture"
   ],
   "serves": [
    "star",
    "wrecks"
   ],
   "plan": "lift"
  },
  {
   "id": "dw-hangar",
   "source": "deadweight",
   "group": "Not lifted",
   "name": "the hangar",
   "does": "The parts tray priced from the docked pools, tap to place, rotate, remove, blueprints, the module card, the build drawn with couplers and the balance mark, the hull gallery, the wallet, FLY.",
   "demoFns": [
    "trayInit",
    "setSel",
    "screenToCell",
    "modCard",
    "drawPartThumb",
    "drawHangar",
    "hullStats",
    "hullSil",
    "hullsShow",
    "bpCost",
    "loadBlueprint"
   ],
   "serves": [
    "wrecks"
   ],
   "closes": [
    "g-weapons"
   ],
   "plan": "lift"
  },
  {
   "id": "dw-weapons",
   "source": "deadweight",
   "group": "Not lifted",
   "name": "weapons",
   "does": "The slug driver with recoil at its mount, the rack's four birds, lead and intercept, the shield that drinks fuel, dust and burn effects.",
   "demoFns": [
    "fireSlug",
    "stepSlugs",
    "fireMissile",
    "fireMissileAt",
    "stepMissiles",
    "interceptAng",
    "aimCandidates",
    "cycleAimTarget"
   ],
   "serves": [
    "price"
   ],
   "closes": [
    "g-weapons"
   ],
   "plan": "lift"
  },
  {
   "id": "dw-salvage",
   "source": "deadweight",
   "group": "Not lifted",
   "name": "salvage",
   "does": "Scavenging a wreck into the hold, hot goods fenced at a cut, salvage sold by station rate, the hold dumped under a lock.",
   "demoFns": [
    "nearWreck",
    "nearWreckStub",
    "scavenge",
    "dumpHold"
   ],
   "serves": [
    "wrecks"
   ],
   "plan": "lift"
  },
  {
   "id": "dw-fabric",
   "source": "deadweight",
   "group": "Not lifted",
   "name": "the fabric",
   "does": "Every mass as one list for the rope and the shell; bodies tied by the rope pull both ways.",
   "demoFns": [
    "collectBodies",
    "grapFabricAttach",
    "stepFabric"
   ],
   "serves": [
    "wrecks",
    "star"
   ],
   "plan": "lift"
  },
  {
   "id": "dw-sling",
   "source": "deadweight",
   "group": "Not lifted",
   "name": "the sling planner",
   "does": "A planned burn at a chosen point on the swing, committed in frozen time.",
   "demoFns": [
    "stepPlan",
    "doSling"
   ],
   "serves": [
    "road"
   ],
   "plan": "lift"
  },
  {
   "id": "dw-tramps",
   "source": "deadweight",
   "group": "Not lifted",
   "name": "tramps",
   "does": "The arbitrage brain, their mass and value, death and respawn from the frontier, derelicts that become tows.",
   "demoFns": [
    "trampBrain",
    "trampMass",
    "stepTramps",
    "trampValue",
    "playerValue",
    "trampDie",
    "trampRespawn"
   ],
   "serves": [
    "ring",
    "road"
   ],
   "closes": [
    "g-tramps"
   ],
   "plan": "lift"
  },
  {
   "id": "dw-pirates",
   "source": "deadweight",
   "group": "Not lifted",
   "name": "pirates",
   "does": "Roost, mark the richest, chase, lock, demand, fire, cool; paying; the Authority's purse and the bounty.",
   "demoFns": [
    "stepPirates",
    "pirateDemand",
    "pirateHit",
    "payPirate"
   ],
   "serves": [
    "price"
   ],
   "closes": [
    "g-gate-seed"
   ],
   "plan": "lift"
  },
  {
   "id": "dw-scene",
   "source": "deadweight",
   "group": "Not lifted",
   "name": "the scene drawing",
   "does": "Box prisms, module glyphs and letters, bodies wearing their station of origin, shadows, couplers, the balance mark, faceted planets in their pits, the sun and its kill ring, the hole, the field rings, tramps, the line, pirates, wreckage, crates, stations, the gate, the plumes, weld seams tinted by load, the coast line, the ship panel, the minimap.",
   "demoFns": [
    "prismAt",
    "setTheme",
    "glyphCanvas",
    "glyphSVG",
    "drawModule",
    "shadow",
    "drawCoupler",
    "comSym",
    "planet",
    "label",
    "drawWorld",
    "drawShipFlight",
    "lerpCol",
    "drawStatus",
    "minimap"
   ],
   "serves": [
    "ring",
    "star",
    "road",
    "wrecks",
    "price",
    "gate"
   ],
   "closes": [
    "g-star-frame"
   ],
   "plan": "lift"
  },
  {
   "id": "dw-page",
   "source": "deadweight",
   "group": "Not lifted",
   "name": "the page's loop and rail",
   "does": "The fixed step, the camera follow with burn shake and auto-zoom near wells, the rail, the flight readout, the intro card, the report, the badge, the theme switch.",
   "demoFns": [
    "loop",
    "fit",
    "chrome",
    "selftest",
    "reportErr"
   ],
   "serves": [
    "ring",
    "star",
    "road",
    "wrecks",
    "price",
    "gate",
    "card"
   ],
   "plan": "screens"
  },
  {
   "id": "ark-galaxy",
   "source": "ark",
   "group": "Keep",
   "name": "galaxy",
   "does": "One seed makes the worlds with radius, gravity, climate, ring, holder, station, and hands; the gate with toll and bill; the collapse count; names, women and men.",
   "files": [
    "src/games/gravitys-ark/galaxy.js"
   ],
   "gate": "gravitys-ark",
   "phase": "0.0.103",
   "serves": [
    "ring",
    "road"
   ],
   "closes": [
    "g-plague",
    "g-gate-seed"
   ],
   "plan": "keep"
  },
  {
   "id": "ark-road",
   "source": "ark",
   "group": "Retire",
   "name": "road",
   "does": "The point ship under the wells law; the hole's mass steps, the schedule ahead, the edge per hull move into the ark's layer.",
   "files": [
    "src/games/gravitys-ark/road.js"
   ],
   "gate": "gravitys-ark",
   "phase": "0.0.104",
   "serves": [
    "star",
    "road"
   ],
   "plan": "retire"
  },
  {
   "id": "ark-page",
   "source": "ark",
   "group": "Split",
   "name": "the page",
   "does": "One file holding every screen today; to be split, one file per screen, the main file keeping the hookups.",
   "files": [
    "docs/gravitys-ark/main.js",
    "docs/gravitys-ark/index.html"
   ],
   "phase": "0.0.105",
   "serves": [
    "bay",
    "hold",
    "ring",
    "star",
    "road",
    "wrecks",
    "price",
    "gate",
    "card"
   ],
   "plan": "split"
  },
  {
   "id": "ark-stations",
   "source": "ark",
   "group": "Keep",
   "name": "stations",
   "does": "Hands by name at a rising price, wages due at dock, debt, the people contract, carry and deliver; on top of deadweight's markets.",
   "files": [
    "src/games/gravitys-ark/stations.js"
   ],
   "gate": "gravitys-ark",
   "phase": "0.0.106",
   "serves": [
    "ring"
   ],
   "closes": [
    "g-hands",
    "g-scrub"
   ],
   "plan": "keep"
  },
  {
   "id": "ark-wrecks",
   "source": "ark",
   "group": "Retire",
   "name": "wrecks",
   "does": "The shell, the field, the grappler at real scale; deadweight's wreckage and grapple take over.",
   "files": [
    "src/games/gravitys-ark/wrecks.js"
   ],
   "gate": "gravitys-ark",
   "phase": "0.0.107",
   "serves": [
    "star",
    "wrecks"
   ],
   "plan": "retire"
  },
  {
   "id": "ark-price",
   "source": "ark",
   "group": "Keep",
   "name": "price",
   "does": "Her price by ring, the factions' listings, the hire-out, the bounty's purse; the lock joins deadweight's pirates demanding her or the cargo.",
   "files": [
    "src/games/gravitys-ark/price.js"
   ],
   "gate": "gravitys-ark",
   "phase": "0.0.108",
   "serves": [
    "price"
   ],
   "closes": [
    "g-engineer"
   ],
   "plan": "keep"
  },
  {
   "id": "ark-gate",
   "source": "ark",
   "group": "Keep",
   "name": "gate",
   "does": "The bill only she pays, the toll, the Fitters, passing, respawn ahead of the edge, the endings.",
   "files": [
    "src/games/gravitys-ark/gate.js"
   ],
   "gate": "gravitys-ark",
   "phase": "0.0.109",
   "serves": [
    "gate"
   ],
   "closes": [
    "g-gate-seed"
   ],
   "plan": "keep"
  },
  {
   "id": "ark-card",
   "source": "ark",
   "group": "Keep",
   "name": "card",
   "does": "The log on receipts, the card with the manifest and the galaxy's name.",
   "files": [
    "src/games/gravitys-ark/card.js"
   ],
   "gate": "gravitys-ark",
   "phase": "0.0.109",
   "serves": [
    "card"
   ],
   "closes": [
    "g-hands"
   ],
   "plan": "keep"
  },
  {
   "id": "ark-hold",
   "source": "ark",
   "group": "Retire",
   "name": "hold",
   "does": "The flat field: waves, claws, repair, walls and guns, the mast, the boss; the ground moves to coldsnap.",
   "files": [
    "src/games/gravitys-ark/hold.js"
   ],
   "gate": "gravitys-ark",
   "phase": "0.0.110",
   "serves": [
    "bay",
    "hold"
   ],
   "plan": "retire"
  },
  {
   "id": "ark-walker-scale",
   "source": "ark",
   "group": "Keep",
   "name": "the scale option",
   "does": "One scaling law across the rig, the balance controller, and the leg lengths; the stance at 0.607 does not hold.",
   "files": [
    "src/modules/rig/rig.js",
    "src/modules/gait/gait.js"
   ],
   "gate": "rig",
   "phase": "0.0.111",
   "serves": [
    "hold"
   ],
   "closes": [
    "g-walker-scale"
   ],
   "plan": "keep"
  },
  {
   "id": "ark-parts-page",
   "source": "ark",
   "group": "Tooling",
   "name": "the parts page",
   "does": "This page: the generator, the table, the views, the feedback store.",
   "files": [
    "scripts/parts.mjs",
    "docs/parts/views.js",
    "docs/parts/template.html",
    "docs/parts/parts-source.json"
   ],
   "gate": "parts",
   "phase": "0.0.112",
   "plan": "new"
  },
  {
   "id": "ark-spine",
   "source": "ark",
   "group": "New",
   "name": "the spine refresh",
   "does": "Coldsnap's plain files at 111b9cb into the tree, verbatim by hash.",
   "serves": [
    "bay",
    "hold"
   ],
   "plan": "new"
  },
  {
   "id": "ark-seam",
   "source": "ark",
   "group": "New",
   "name": "the seam",
   "does": "The hull down as bodies with the factor, the status back up, one clock.",
   "serves": [
    "bay",
    "hold",
    "star",
    "road"
   ],
   "closes": [
    "g-engineer"
   ],
   "plan": "new"
  },
  {
   "id": "ark-ground",
   "source": "ark",
   "group": "New",
   "name": "the ground on coldsnap",
   "does": "The crash as welds, the Grip in waves, repair with drag, walls and guns, the walker with the leap, the boss, men by name, the engineer on foot, infection, the registry.",
   "serves": [
    "bay",
    "hold"
   ],
   "closes": [
    "g-engineer",
    "g-plague",
    "g-scrub"
   ],
   "plan": "new"
  },
  {
   "id": "ark-gate-seed",
   "source": "ark",
   "group": "New",
   "name": "the gate by seed",
   "does": "State, holder, toll, bill on the galaxy; the blockade on the pirates.",
   "serves": [
    "gate"
   ],
   "closes": [
    "g-gate-seed"
   ],
   "plan": "new"
  },
  {
   "id": "ark-mechbay",
   "source": "ark",
   "group": "New",
   "name": "the mech bay",
   "does": "The walker rides only if a mech bay is welded.",
   "serves": [
    "bay",
    "wrecks"
   ],
   "closes": [
    "g-mechbay"
   ],
   "plan": "new"
  },
  {
   "id": "ark-save",
   "source": "ark",
   "group": "New",
   "name": "the save",
   "does": "The whole run as one saved thing.",
   "serves": [
    "card"
   ],
   "closes": [
    "g-save"
   ],
   "plan": "new"
  },
  {
   "id": "ark-dialogue",
   "source": "ark",
   "group": "New",
   "name": "dialogue and the ship computer",
   "does": "Lines as data; the ship's flat voice.",
   "serves": [
    "bay",
    "hold",
    "ring",
    "star",
    "road",
    "price",
    "gate",
    "card"
   ],
   "closes": [
    "g-dialogue",
    "g-onboarding"
   ],
   "plan": "new"
  },
  {
   "id": "ark-camera",
   "source": "ark",
   "group": "New",
   "name": "the camera law",
   "does": "The star in every frame; the held shot.",
   "serves": [
    "ring",
    "star"
   ],
   "closes": [
    "g-star-frame"
   ],
   "plan": "new"
  },
  {
   "id": "ark-ground-light",
   "source": "ark",
   "group": "New",
   "name": "the ground's light",
   "does": "One light from the star, reddening per landing.",
   "serves": [
    "bay",
    "hold"
   ],
   "closes": [
    "g-ground-light"
   ],
   "plan": "new"
  },
  {
   "id": "ark-hands",
   "source": "ark",
   "group": "New",
   "name": "the hands' words",
   "does": "The walk when unpaid, the home line, the card's dead.",
   "serves": [
    "ring",
    "card"
   ],
   "closes": [
    "g-hands"
   ],
   "plan": "new"
  },
  {
   "id": "ark-tramps-leave",
   "source": "ark",
   "group": "New",
   "name": "tramps that leave",
   "does": "The exodus as a brain change on deadweight's tramps.",
   "serves": [
    "ring"
   ],
   "closes": [
    "g-tramps"
   ],
   "plan": "new"
  },
  {
   "id": "ark-storyteller",
   "source": "ark",
   "group": "New",
   "name": "the storyteller",
   "does": "The seeded pacer, quiet at zero.",
   "serves": [
    "hold",
    "price"
   ],
   "closes": [
    "g-storyteller"
   ],
   "plan": "later"
  },
  {
   "id": "ark-sound",
   "source": "ark",
   "group": "New",
   "name": "sound",
   "does": "Coldsnap's engine on the ground.",
   "serves": [
    "bay",
    "hold"
   ],
   "closes": [
    "g-sound"
   ],
   "plan": "later"
  },
  {
   "id": "scr-space",
   "source": "ark",
   "group": "Screens",
   "name": "the space screen",
   "does": "Deadweight's flight and drawing under the ark's rail, in its own file.",
   "serves": [
    "ring",
    "star",
    "road",
    "wrecks",
    "price"
   ],
   "plan": "new"
  },
  {
   "id": "scr-hangar",
   "source": "ark",
   "group": "Screens",
   "name": "the hangar screen",
   "does": "The build screen at a dock, in its own file.",
   "serves": [
    "wrecks"
   ],
   "plan": "new"
  },
  {
   "id": "scr-ground",
   "source": "ark",
   "group": "Screens",
   "name": "the ground screen",
   "does": "The coldsnap renderer with the hold's rail, in its own file.",
   "serves": [
    "bay",
    "hold"
   ],
   "plan": "new"
  },
  {
   "id": "scr-dock",
   "source": "ark",
   "group": "Screens",
   "name": "the dock pane",
   "does": "Listings, the purse, hands, the people contract, in its own file.",
   "serves": [
    "ring",
    "price"
   ],
   "plan": "new"
  },
  {
   "id": "scr-gate",
   "source": "ark",
   "group": "Screens",
   "name": "the gate pane",
   "does": "The bill, the toll, the Fitters' stall, in its own file.",
   "serves": [
    "gate"
   ],
   "plan": "new"
  },
  {
   "id": "scr-card",
   "source": "ark",
   "group": "Screens",
   "name": "the card",
   "does": "The manifest, the dead, the eaten, the name, in its own file.",
   "serves": [
    "card"
   ],
   "plan": "new"
  },
  {
   "id": "dec-gate-hidden",
   "source": "ark",
   "group": "Decisions on the shelf",
   "name": "the gate's state hidden until the rumour or arrival",
   "does": "The map shows the gate; its state is the one thing the map does not show. Lean: hidden.",
   "serves": [
    "road",
    "gate"
   ],
   "closes": [],
   "plan": "decide"
  },
  {
   "id": "dec-run-blockade",
   "source": "ark",
   "group": "Decisions on the shelf",
   "name": "running a blockade under fire",
   "does": "Allowed, as the lock law already lets a hull outrun. Lean: allowed.",
   "serves": [
    "gate"
   ],
   "closes": [],
   "plan": "decide"
  },
  {
   "id": "dec-unbacked-kinds",
   "source": "ark",
   "group": "Decisions on the shelf",
   "name": "the five unbacked module kinds withheld",
   "does": "Mounts, racks, shields, thrusters, and the mech bay leave every listing until their mechanism lands. Lean: withheld.",
   "serves": [
    "ring",
    "wrecks"
   ],
   "closes": [],
   "plan": "decide"
  },
  {
   "id": "dec-fitters-machines",
   "source": "ark",
   "group": "Decisions on the shelf",
   "name": "the Fitters as machines",
   "does": "They buy scrap, spares, modules, and her, never people; the button that sells people at the gate goes. Lean: machines.",
   "serves": [
    "gate",
    "price"
   ],
   "closes": [],
   "plan": "decide"
  },
  {
   "id": "dec-infection",
   "source": "ark",
   "group": "Decisions on the shelf",
   "name": "infection",
   "does": "A clawed hull carries the Grip, a landing marks the world, the dead rise there, a station scrubs for a price. Lean: in.",
   "serves": [
    "bay",
    "hold",
    "ring"
   ],
   "closes": [
    "g-scrub",
    "g-plague"
   ],
   "plan": "decide"
  },
  {
   "id": "dec-tramps-when",
   "source": "ark",
   "group": "Decisions on the shelf",
   "name": "tramps, this order or later",
   "does": "Plain bodies on a burn schedule leaving the near stations. Lean: later.",
   "serves": [
    "ring"
   ],
   "closes": [
    "g-tramps"
   ],
   "plan": "decide"
  },
  {
   "id": "dec-storyteller-when",
   "source": "ark",
   "group": "Decisions on the shelf",
   "name": "the storyteller, later",
   "does": "The seeded pacer with a quiet dial at zero. Lean: later.",
   "serves": [
    "hold"
   ],
   "closes": [
    "g-storyteller"
   ],
   "plan": "decide"
  },
  {
   "id": "dec-militia-levy",
   "source": "ark",
   "group": "Decisions on the shelf",
   "name": "the Militia's levy",
   "does": "One hand per dock at its stations unless a levy is paid. Lean: in.",
   "serves": [
    "ring",
    "price"
   ],
   "closes": [],
   "plan": "decide"
  },
  {
   "id": "dec-star-name",
   "source": "ark",
   "group": "Decisions on the shelf",
   "name": "the star's name",
   "does": "Named for death. MORS proposed; HEL and THANATOS the alternatives.",
   "serves": [
    "ring",
    "star"
   ],
   "closes": [],
   "plan": "decide"
  },
  {
   "id": "pro-charter-rumour",
   "source": "ark",
   "group": "Proposed on the shelf",
   "name": "the Charter's rumour",
   "does": "A listing line that shows the gate's state and bill before you reach it, for a price.",
   "serves": [
    "ring",
    "gate"
   ],
   "closes": [],
   "plan": "new"
  },
  {
   "id": "pro-places-by-role",
   "source": "ark",
   "group": "Proposed on the shelf",
   "name": "places by role",
   "does": "No fixed names: the ash world under the Militia, the Charter's step, the Wreckers' roost. Role words for climates, holders, and stations.",
   "serves": [
    "road",
    "ring"
   ],
   "closes": [],
   "plan": "new"
  },
  {
   "id": "pro-first-line",
   "source": "ark",
   "group": "Proposed on the shelf",
   "name": "the first line in the log",
   "does": "The walker's driver's name, and he walks in the first wave.",
   "serves": [
    "bay"
   ],
   "closes": [],
   "plan": "new"
  }
 ],
 "feedbackKinds": [
  "wrong status",
  "not wired",
  "missing part",
  "priority",
  "playtest finding",
  "a number",
  "a word",
  "a decision"
 ]
}
PARTS_EOF_2
test "$(sha256sum docs/parts/parts-source.json | cut -c1-16)" = "af69018fb34cefe9" && echo OK docs/parts/parts-source.json || echo FAILED docs/parts/parts-source.json
```
3. Write `docs/parts/views.js`, exactly. The hash line must print OK.

```sh
mkdir -p docs/parts
cat > docs/parts/views.js <<'PARTS_EOF_3'
// COMBO-ENGINE — docs/parts/views.js: the parts page's pure builders. Takes the
// generated table and returns HTML strings; no window, no document. The page
// inlines this file and the parts gate runs it in node, so what the page shows
// and what the gate proves are the same functions.

export const STATES = ["not started", "planned", "served", "approved", "in progress", "ready for acceptance", "accepted", "returned", "left behind", "decision pending"];
export const BUCKET_OF = { "not started": "ghost", "planned": "paper", "served": "paper", "approved": "paper", "in progress": "progress", "ready for acceptance": "landed", "accepted": "accepted", "returned": "returned", "left behind": "ghost", "decision pending": "ghost" };
export const BUCKETS = ["accepted", "landed", "progress", "paper", "ghost", "returned"];
export const BUCKET_NAMES = { accepted: "accepted", landed: "landed", progress: "in progress", paper: "on paper", ghost: "not started", returned: "returned" };
const WORD_STATE = { PLANNED: "planned", SERVED: "served", APPROVED: "approved", DISPATCHED: "in progress", LANDED: "ready for acceptance", ACCEPTED: "accepted", RETURNED: "returned" };

export function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

// derive(table): every computed field the views read, added onto a copy of the table.
export function derive(table) {
  const t = JSON.parse(JSON.stringify(table));
  const phaseByNum = Object.fromEntries((t.phases || []).map((p) => [p.num, p]));
  const byId = Object.fromEntries(t.parts.map((p) => [p.id, p]));
  const stateOfPhase = (num, partId) => {
    const ph = phaseByNum[num];
    if (!ph) return null;
    const word = WORD_STATE[ph.status] || "planned";
    if (word !== "ready for acceptance") return word;
    const acc = (ph.acceptance || []).find((a) => a.part === partId);
    if (acc && acc.verdict === "accepted") return "accepted";
    if (acc && acc.verdict === "returned") return "returned";
    return "ready for acceptance";
  };
  t.rollups = t.rollups || [];
  for (const p of t.parts.concat(t.rollups)) {
    if (p.plan === "leave") p.state = "left behind";
    else if (p.plan === "decide") p.state = "decision pending";
    else {
      const num = p.phase || (p.phaseOf && byId[p.phaseOf] ? byId[p.phaseOf].phase : null);
      p.state = (num && stateOfPhase(num, p.id)) || "not started";
    }
    p.bucket = BUCKET_OF[p.state];
    const m = p.mech || {};
    p.mechBadges = [];
    if (p.source === "coldsnap") p.mechBadges.push(m.file === "differs" ? "changed here" : (m.file || "absent"));
    else if (p.files && p.files.length) p.mechBadges.push(m.present ? "present" : "absent");
    if (m.wired) p.mechBadges.push("wired");
    if (m.gate) p.mechBadges.push("gate " + m.gate.verdict + (m.gate.pass != null ? " " + m.gate.pass + "/" + (m.gate.pass + m.gate.fail) : ""));
    if (m.exports && m.exports.total) p.mechBadges.push("exercised " + m.exports.exercised + "/" + m.exports.total);
  }
  const count = (parts) => { const c = Object.fromEntries(BUCKETS.map((b) => [b, 0])); for (const p of parts) c[p.bucket]++; c.total = parts.length; return c; };
  // units: the authored parts plus coldsnap's groups as one row each; files stay under By source
  t.units = t.parts.filter((p) => p.source !== "coldsnap").concat(t.rollups);
  t.frames.forEach((f) => { f.parts = t.units.filter((p) => (p.serves || []).includes(f.id)); f.counts = count(f.parts); });
  t.gaps.forEach((g) => { g.parts = t.units.filter((p) => (p.closes || []).includes(g.id)); g.counts = count(g.parts); });
  const sources = [["coldsnap", "Coldsnap"], ["deadweight", "Deadweight"], ["ark", "The ark's own layer"]];
  t.sources = sources.map(([id, name]) => {
    const parts = t.parts.filter((p) => p.source === id);
    const groups = [];
    for (const p of parts) { let g = groups.find((x) => x.name === p.group); if (!g) { g = { name: p.group, parts: [] }; groups.push(g); } g.parts.push(p); }
    groups.forEach((g) => { g.counts = count(g.parts); });
    return { id, name, parts, groups, counts: count(parts) };
  });
  t.overall = count(t.units.filter((p) => p.plan !== "leave"));
  t.ready = (t.phases || []).map((ph) => ({ phase: ph, parts: t.units.filter((p) => p.state === "ready for acceptance" && (p.phase === ph.num || (p.phaseOf && byId[p.phaseOf] && byId[p.phaseOf].phase === ph.num))) })).filter((r) => r.parts.length);
  t.current = (t.phases || []).filter((ph) => ["SERVED", "APPROVED", "DISPATCHED"].includes(ph.status));
  return t;
}

// meter(counts): one stacked bar, six buckets in fixed order, a 2px gap between fills, the counts in text beside it.
export function meter(counts, label) {
  const total = counts.total || 0;
  const segs = BUCKETS.filter((b) => counts[b] > 0).map((b) => `<span class="seg seg-${b}" style="flex:${counts[b]}" title="${BUCKET_NAMES[b]} ${counts[b]}"></span>`).join("");
  const text = BUCKETS.filter((b) => counts[b] > 0).map((b) => `<span class="k k-${b}">${counts[b]} ${BUCKET_NAMES[b]}</span>`).join("");
  return `<div class="meter" role="img" aria-label="${esc(label || "")}: ${total} parts">${segs || '<span class="seg seg-empty" style="flex:1"></span>'}</div><div class="meter-text">${text || "no parts yet"}</div>`;
}

export function chip(state) { return `<span class="chip chip-${BUCKET_OF[state]}"><i></i>${esc(state)}</span>`; }

function frameNames(t, ids) { return (ids || []).map((id) => { const f = t.frames.find((x) => x.id === id); return f ? f.n + " " + f.name : id; }); }
function gapNames(t, ids) { return (ids || []).map((id) => { const g = t.gaps.find((x) => x.id === id); return g ? g.name : id; }); }

// evidence(p): what the generator measured, as a definition list. Nothing here is typed by hand.
export function evidence(t, p) {
  const m = p.mech || {}, rows = [];
  if (p.source === "coldsnap") {
    rows.push(["file", `<code>${esc(p.path)}</code> · ${p.lines} lines`]);
    rows.push(["at " + esc(t.coldsnap.commit), `<code>${esc(m.hashHead || "")}</code>`]);
    rows.push(["in the tree", m.hashTree ? `<code>${esc(m.hashTree)}</code>` + (m.file === "behind" ? " · identical to " + esc(t.coldsnap.treeCommit) : m.file === "current" ? " · identical to head" : " · changed in this tree, matches neither") : "absent"]);
  }
  if (p.isRollup) rows.push(["files", `${p.count} at ${esc(t.coldsnap.commit)}: ` + Object.entries(p.fileStates || {}).map(([k, v]) => `${v} ${esc(k)}`).join(", ")]);
  if (p.files && p.files.length && !p.isRollup) rows.push(["files", p.files.map((f) => `<code>${esc(f)}</code>` + (m.missing && m.missing.includes(f) ? " (missing)" : "")).join("<br>")]);
  if (p.demoFns && p.demoFns.length) rows.push(["in the demo", p.demoFns.map((f) => `${esc(f)}${m.demoLines && m.demoLines[f] ? " at line " + m.demoLines[f] : " (not found)"}`).join(", ")]);
  if (m.importedBy && m.importedBy.length) rows.push(["imported by", m.importedBy.map((f) => `<code>${esc(f)}</code>`).join(", ")]);
  if (m.imports && m.imports.length) rows.push(["imports", m.imports.map((f) => `<code>${esc(f)}</code>`).join(", ")]);
  if (m.gate) {
    const g = m.gate;
    rows.push(["gate", `<code>${esc(g.name)}</code> · ${esc(g.verdict)} · ${g.pass} PASS / ${g.fail} FAIL · ${g.seconds} s`]);
    if (g.seeds) rows.push(["seeds", `<code>${esc(g.seeds)}</code>`]);
    if (g.checks && g.checks.length) rows.push(["checks", `<ol class="checks">${g.checks.map((c) => `<li class="${c.startsWith("FAIL") ? "bad" : ""}">${esc(c)}</li>`).join("")}</ol>`]);
  }
  if (m.exports && m.exports.total) rows.push(["surface", `${m.exports.exercised} of ${m.exports.total} exports exercised by the gate` + (m.exports.untested.length ? `<br>untested: ${m.exports.untested.map(esc).join(", ")}` : "")]);
  if (p.phase) { const ph = (t.phases || []).find((x) => x.num === p.phase); rows.push(["phase", ph ? `${esc(ph.num)} ${esc(ph.name)} · ${esc(ph.line)}` : `${esc(p.phase)} · no phase document`]); }
  if (p.serves && p.serves.length) rows.push(["serves", frameNames(t, p.serves).map(esc).join(", ")]);
  if (p.closes && p.closes.length) rows.push(["closes", gapNames(t, p.closes).map(esc).join(", ")]);
  rows.push(["plan", esc(p.plan)]);
  return `<dl class="ev">${rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${v}</dd>`).join("")}</dl>`;
}

export function row(t, p, prefix) {
  const badges = (p.mechBadges || []).map((b) => `<span class="badge ${b.startsWith("gate FAIL") || b === "absent" ? "badge-bad" : ""}">${esc(b)}</span>`).join("");
  return `<details class="part" id="${esc(prefix || "s")}-part-${esc(p.id)}" data-part="${esc(p.id)}" data-state="${esc(p.state)}">
<summary><span class="name">${esc(p.name)}</span>${chip(p.state)}<span class="badges">${badges}</span><span class="does">${esc(p.does || "")}</span></summary>
<div class="body">${evidence(t, p)}
<form class="fb" data-part="${esc(p.id)}"><label>Feedback on <b>${esc(p.name)}</b></label>
<select name="kind">${(t.feedbackKinds || []).map((k) => `<option>${esc(k)}</option>`).join("")}</select>
<input name="seed" placeholder="seed, or paste the game's address">
<textarea name="text" rows="3" placeholder="what you saw, what you want" required></textarea>
<label class="img"><input type="file" name="image" accept="image/*"><span>Add a screenshot, kept under 180 KB</span></label>
<button type="submit">Send</button><span class="fb-status" aria-live="polite"></span></form></div></details>`;
}

function groupBlock(t, title, parts, counts, open, prefix) {
  return `<details class="group"${open ? " open" : ""}><summary><span class="gname">${esc(title)}</span><span class="gcount">${parts.length}</span>${meter(counts, title)}</summary><div class="rows">${parts.map((p) => row(t, p, prefix)).join("")}</div></details>`;
}

export function byFrame(t) {
  return t.frames.map((f) => {
    const bySrc = t.sources.map((s) => ({ s, parts: f.parts.filter((p) => p.source === s.id) })).filter((x) => x.parts.length);
    return `<section class="frame" id="frame-${esc(f.id)}"><h2><span class="fn">${f.n}</span> ${esc(f.name)}</h2><p class="see">${esc(f.see)}</p>${meter(f.counts, f.name)}
${bySrc.map((x) => groupBlock(t, x.s.name, x.parts, derive_count(x.parts), false, "f")).join("")}</section>`;
  }).join("") + `<section class="frame" id="frame-gaps"><h2><span class="fn">+</span> What the story still lacks</h2><p class="see">Built in neither game nor the night. A gap closes when a part that names it is accepted.</p>
${t.gaps.map((g) => groupBlock(t, g.name + " — " + g.what, g.parts, g.counts, false, "f")).join("")}</section>`;
}
function derive_count(parts) { const c = Object.fromEntries(BUCKETS.map((b) => [b, 0])); for (const p of parts) c[p.bucket]++; c.total = parts.length; return c; }

export function bySource(t) {
  return t.sources.map((s) => `<section class="frame" id="source-${esc(s.id)}"><h2>${esc(s.name)}</h2>${meter(s.counts, s.name)}
${s.groups.map((g) => groupBlock(t, g.name, g.parts, g.counts, false, "s")).join("")}</section>`).join("");
}

// graph(t): layered by depth, left to right: the spine, the modules, the game's own layer, the screens.
export function graph(t) {
  const LAYERS = [["spine", "the spine"], ["modules", "modules"], ["game", "the game's layer"], ["screens", "screens"]];
  const nodes = (t.graph && t.graph.nodes) || [], edges = (t.graph && t.graph.edges) || [];
  const cols = LAYERS.map(([id]) => nodes.filter((n) => n.layer === id));
  const rowH = 26, colW = 260, pad = 24, maxRows = Math.max(1, ...cols.map((c) => c.length));
  const W = pad * 2 + colW * LAYERS.length, H = pad * 2 + 30 + rowH * maxRows;
  const pos = {};
  cols.forEach((c, ci) => c.forEach((n, ri) => { pos[n.id] = { x: pad + ci * colW + 8, y: pad + 30 + ri * rowH }; }));
  const byId = Object.fromEntries(t.parts.concat(t.rollups || []).map((p) => [p.id, p]));
  const box = (n) => { const p = pos[n.id], part = byId[n.id] || {}; const st = part.bucket || "ghost"; const g = part.mech && part.mech.gate ? (part.mech.gate.verdict === "ok" ? "gate-green" : "gate-red") : "";
    return `<g class="node ${g}" data-part="${esc(n.id)}"><rect x="${p.x}" y="${p.y}" width="${colW - 40}" height="${rowH - 6}" rx="4" class="nb nb-${st}"/><text x="${p.x + 8}" y="${p.y + 14}" class="nt">${esc(n.name.length > 30 ? n.name.slice(0, 29) + "…" : n.name)}</text></g>`; };
  const line = (e) => { const a = pos[e.from], b = pos[e.to]; if (!a || !b) return ""; const x1 = a.x + colW - 40, y1 = a.y + (rowH - 6) / 2, x2 = b.x, y2 = b.y + (rowH - 6) / 2; const mx = (x1 + x2) / 2;
    return `<path d="M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}" class="edge"/>`; };
  const heads = LAYERS.map(([, name], ci) => `<text x="${pad + ci * colW + 8}" y="${pad + 12}" class="lh">${esc(name)}</text>`).join("");
  return `<div class="graph-wrap"><svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" class="graph" role="img" aria-label="module dependencies">${heads}${edges.map(line).join("")}${nodes.map(box).join("")}</svg></div>
<p class="legend">Fill is the process state. A green ring is a gate that ran green in this build; a red ring, red. An edge runs from the importer on the left to what it imports on the right.</p>`;
}

// matrix(t): parts down the side, frames and gaps across; a filled cell is a claim the part makes.
export function matrix(t) {
  const cols = t.frames.map((f) => ({ id: f.id, name: f.n + " " + f.name, kind: "frame" })).concat(t.gaps.map((g) => ({ id: g.id, name: g.name, kind: "gap" })));
  const parts = t.units.filter((p) => p.plan !== "leave");
  const head = `<tr><th class="ph">part</th>${cols.map((c) => `<th class="${c.kind}"><span>${esc(c.name)}</span></th>`).join("")}</tr>`;
  const body = parts.map((p) => `<tr><th scope="row"><a href="#s-part-${esc(p.id)}" data-goto="${esc(p.id)}">${esc(p.name)}</a> ${chip(p.state)}</th>${cols.map((c) => { const on = (c.kind === "frame" ? p.serves : p.closes) || []; return `<td class="${on.includes(c.id) ? "on on-" + p.bucket : ""}" title="${esc(p.name)} → ${esc(c.name)}">${on.includes(c.id) ? "●" : ""}</td>`; }).join("")}</tr>`).join("");
  const empties = cols.filter((c) => !parts.some((p) => ((c.kind === "frame" ? p.serves : p.closes) || []).includes(c.id))).map((c) => c.name);
  return `<div class="matrix-wrap"><table class="matrix">${head}${body}</table></div><p class="legend">An empty column is a frame or a gap nothing serves${empties.length ? ": " + empties.map(esc).join(", ") : ". None today."}</p>`;
}

export function strip(t) {
  if (!t.ready.length) return `<div class="strip empty">Nothing is waiting for acceptance.</div>`;
  return `<div class="strip"><h2>Ready for acceptance</h2>${t.ready.map((r) => `<details class="ready" data-phase="${esc(r.phase.num)}"><summary><b>${esc(r.phase.num)}</b> ${esc(r.phase.name)} · ${r.parts.length} part${r.parts.length > 1 ? "s" : ""}<span class="acts"><button class="accept-all" data-phase="${esc(r.phase.num)}">Accept all</button></span></summary>
<ul>${r.parts.map((p) => `<li data-part="${esc(p.id)}"><a href="#s-part-${esc(p.id)}" data-goto="${esc(p.id)}">${esc(p.name)}</a><span class="acts"><button class="accept" data-part="${esc(p.id)}">Accept</button><button class="return" data-part="${esc(p.id)}">Return</button></span><span class="verdict" aria-live="polite"></span>
<form class="ret" data-part="${esc(p.id)}" data-phase="${esc(r.phase.num)}" hidden><textarea name="text" rows="2" placeholder="the finding: what you saw at the page" required></textarea><input name="seed" placeholder="seed, or paste the game's address"><label class="img"><input type="file" name="image" accept="image/*"><span>Add a screenshot</span></label><span class="acts"><button type="submit" class="return">Return with this finding</button><button type="button" class="cancel">Cancel</button></span><span class="fb-status" aria-live="polite"></span></form></li>`).join("")}</ul></details>`).join("")}</div>`;
}

export function banner(t) {
  if (!t.current.length) return `<div class="banner quiet">No phase in flight.</div>`;
  return t.current.map((ph) => `<div class="banner"><b>Current phase</b> ${esc(ph.num)} ${esc(ph.name)} · ${esc(ph.status.toLowerCase())}</div>`).join("");
}

export function header(t) {
  return `<div class="stamp">built from <code>${esc(t.meta.commit)}</code> · ${esc(t.meta.builtAt)} · ${t.meta.gatesRun} gates run in ${t.meta.gateSeconds} s</div>${meter(t.overall, "all parts")}`;
}

export function renderAll(table) {
  const t = derive(table);
  return { t, header: header(t), banner: banner(t), strip: strip(t), byFrame: byFrame(t), bySource: bySource(t), graph: graph(t), matrix: matrix(t) };
}
PARTS_EOF_3
test "$(sha256sum docs/parts/views.js | cut -c1-16)" = "2cc91f83695b5848" && echo OK docs/parts/views.js || echo FAILED docs/parts/views.js
```
4. Write `docs/parts/template.html`, exactly. The hash line must print OK.

```sh
mkdir -p docs/parts
cat > docs/parts/template.html <<'PARTS_EOF_4'
<title>The Ark's Parts</title>
<style>
  :root { color-scheme: light; --bg: #f5f4f0; --panel: #fdfdfb; --ink: #1d222b; --ink2: #4d5560; --ink3: #8b93a0; --line: rgba(29,34,43,.14); --accent: #8a5a10; --link: #3a62c4;
    --c-accepted: #0d366b; --c-landed: #184f95; --c-progress: #2a78d6; --c-paper: #6da7ec; --c-returned: #ec835a; --c-ghost: transparent; --good: #0ca30c; --bad: #d03b3b; --focus: #3a62c4; }
  @media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { color-scheme: dark; --bg: #0d1117; --panel: #161b23; --ink: #e9edf2; --ink2: #96a0b2; --ink3: #6b7686; --line: rgba(230,235,245,.14); --accent: #e9b25c; --link: #8fb0ff;
    --c-accepted: #184f95; --c-landed: #256abf; --c-progress: #5598e7; --c-paper: #9ec5f4; --focus: #e9b25c; } }
  :root[data-theme="dark"] { color-scheme: dark; --bg: #0d1117; --panel: #161b23; --ink: #e9edf2; --ink2: #96a0b2; --ink3: #6b7686; --line: rgba(230,235,245,.14); --accent: #e9b25c; --link: #8fb0ff;
    --c-accepted: #184f95; --c-landed: #256abf; --c-progress: #5598e7; --c-paper: #9ec5f4; --focus: #e9b25c; }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--ink); font: 14px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif; }
  code, .stamp, .badge, .k, .chip, .ev dt, .lh, .nt, .gcount { font-family: ui-monospace, Menlo, Consolas, monospace; }
  a { color: var(--link); } a:focus-visible, button:focus-visible, select:focus-visible, input:focus-visible, textarea:focus-visible, summary:focus-visible { outline: 2px solid var(--focus); outline-offset: 2px; }
  main { max-width: 1100px; margin: 0 auto; padding: 16px 12px 48px; }
  header h1 { font-size: 20px; letter-spacing: .18em; text-transform: uppercase; margin: 0 0 2px; font-weight: 600; }
  header .sub { color: var(--ink2); margin: 0 0 10px; max-width: 65ch; }
  .stamp { font-size: 12px; color: var(--ink3); margin: 0 0 8px; }
  .meter { display: flex; gap: 2px; height: 10px; border-radius: 4px; overflow: hidden; background: transparent; margin: 6px 0 4px; }
  .seg { display: block; min-width: 3px; } .seg:first-child { border-radius: 4px 0 0 4px; } .seg:last-child { border-radius: 0 4px 4px 0; }
  .seg-accepted { background: var(--c-accepted); } .seg-landed { background: var(--c-landed); } .seg-progress { background: var(--c-progress); } .seg-paper { background: var(--c-paper); }
  .seg-returned { background: var(--c-returned); } .seg-ghost, .seg-empty { background: transparent; box-shadow: inset 0 0 0 1px var(--ink3); }
  .meter-text { font-size: 12px; color: var(--ink2); display: flex; flex-wrap: wrap; gap: 4px 12px; }
  .k::before { content: ""; display: inline-block; width: 9px; height: 9px; border-radius: 2px; margin-right: 5px; vertical-align: -1px; }
  .k-accepted::before { background: var(--c-accepted); } .k-landed::before { background: var(--c-landed); } .k-progress::before { background: var(--c-progress); } .k-paper::before { background: var(--c-paper); }
  .k-returned::before { background: var(--c-returned); } .k-ghost::before { box-shadow: inset 0 0 0 1px var(--ink3); }
  .banner { margin: 12px 0; padding: 8px 12px; border-left: 3px solid var(--accent); background: var(--panel); } .banner.quiet { color: var(--ink2); border-left-color: var(--ink3); }
  .strip { margin: 12px 0; padding: 10px 12px; background: var(--panel); border: 1px solid var(--line); border-radius: 6px; } .strip.empty { color: var(--ink2); }
  .strip h2 { font-size: 13px; text-transform: uppercase; letter-spacing: .12em; margin: 0 0 6px; color: var(--accent); }
  .strip ul { list-style: none; margin: 6px 0 0; padding: 0; } .strip li { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; padding: 4px 0; border-top: 1px solid var(--line); }
  .acts { margin-left: auto; display: flex; gap: 6px; } .verdict { font-size: 12px; color: var(--ink2); }
  button { font: inherit; font-size: 12px; padding: 5px 10px; border-radius: 6px; border: 1px solid var(--line); background: var(--bg); color: var(--ink); cursor: pointer; }
  button.accept, button.accept-all { border-color: var(--good); } button.return { border-color: var(--c-returned); } button[type=submit] { border-color: var(--accent); }
  nav.tabs { display: flex; gap: 6px; margin: 14px 0 10px; flex-wrap: wrap; position: sticky; top: 0; background: var(--bg); padding: 6px 0; z-index: 2; }
  nav.tabs button[aria-selected="true"] { background: var(--panel); border-color: var(--accent); color: var(--accent); }
  .view[hidden] { display: none; }
  section.frame { margin: 18px 0 8px; } section.frame h2 { font-size: 16px; margin: 0; text-wrap: balance; } .fn { color: var(--accent); margin-right: 6px; } .see { color: var(--ink2); margin: 2px 0 4px; max-width: 65ch; }
  details.group { margin: 8px 0; background: var(--panel); border: 1px solid var(--line); border-radius: 6px; } details.group > summary { padding: 8px 12px; cursor: pointer; list-style: none; display: grid; grid-template-columns: 1fr auto; align-items: center; column-gap: 10px; }
  details.group > summary::-webkit-details-marker { display: none; } details.group > summary .meter, details.group > summary .meter-text { grid-column: 1 / -1; }
  .gname { font-weight: 600; } .gcount { color: var(--ink3); font-size: 12px; }
  .rows { border-top: 1px solid var(--line); }
  details.part { border-top: 1px solid var(--line); } details.part:first-child { border-top: 0; }
  details.part > summary { padding: 8px 12px; cursor: pointer; list-style: none; display: grid; grid-template-columns: minmax(120px, 1fr) auto; column-gap: 10px; row-gap: 3px; align-items: center; }
  details.part > summary::-webkit-details-marker { display: none; }
  .name { font-weight: 600; } .does { grid-column: 1 / -1; color: var(--ink2); font-size: 13px; } .badges { grid-column: 1 / -1; display: flex; flex-wrap: wrap; gap: 4px; }
  .badge { font-size: 11px; padding: 1px 6px; border-radius: 4px; border: 1px solid var(--line); color: var(--ink2); } .badge-bad { border-color: var(--bad); color: var(--bad); }
  .chip { font-size: 11px; padding: 2px 8px; border-radius: 999px; border: 1px solid var(--line); white-space: nowrap; justify-self: end; }
  .chip i { display: inline-block; width: 8px; height: 8px; border-radius: 2px; margin-right: 6px; vertical-align: -1px; }
  .chip-accepted i { background: var(--c-accepted); } .chip-landed i { background: var(--c-landed); } .chip-progress i { background: var(--c-progress); } .chip-paper i { background: var(--c-paper); } .chip-returned i { background: var(--c-returned); } .chip-ghost i { box-shadow: inset 0 0 0 1px var(--ink3); }
  .body { padding: 4px 12px 12px; }
  .ev { display: grid; grid-template-columns: max-content 1fr; gap: 4px 12px; margin: 0 0 10px; font-size: 13px; } .ev dt { color: var(--ink3); font-size: 12px; } .ev dd { margin: 0; overflow-wrap: anywhere; }
  .checks { margin: 0; padding-left: 18px; font-size: 12px; } .checks li.bad { color: var(--bad); }
  form.fb { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; border-top: 1px dashed var(--line); padding-top: 8px; } form.fb label { grid-column: 1 / -1; font-size: 12px; color: var(--ink2); }
  form.fb textarea { grid-column: 1 / -1; } form.fb select, form.fb input, form.fb textarea { font: inherit; font-size: 13px; padding: 6px 8px; border: 1px solid var(--line); border-radius: 6px; background: var(--bg); color: var(--ink); }
  .fb-status { font-size: 12px; color: var(--ink2); align-self: center; }
  label.img { grid-column: 1 / -1; font-size: 12px; color: var(--ink2); display: flex; gap: 8px; align-items: center; } label.img input { font-size: 12px; }
  img.thumb { display: block; max-width: 240px; max-height: 160px; margin-top: 4px; border: 1px solid var(--line); border-radius: 4px; }
  form.ret { width: 100%; display: grid; grid-template-columns: 1fr 1fr; gap: 6px; padding: 6px 0 4px; } form.ret textarea { grid-column: 1 / -1; } form.ret .acts { grid-column: 1 / -1; margin-left: 0; }
  form.ret textarea, form.ret input { font: inherit; font-size: 13px; padding: 6px 8px; border: 1px solid var(--line); border-radius: 6px; background: var(--bg); color: var(--ink); }
  .graph-wrap, .matrix-wrap { overflow-x: auto; background: var(--panel); border: 1px solid var(--line); border-radius: 6px; padding: 8px; }
  svg.graph { display: block; } .nb { stroke: var(--line); stroke-width: 1; } .nb-accepted { fill: var(--c-accepted); } .nb-landed { fill: var(--c-landed); } .nb-progress { fill: var(--c-progress); } .nb-paper { fill: var(--c-paper); } .nb-returned { fill: var(--c-returned); } .nb-ghost { fill: var(--panel); stroke: var(--ink3); }
  .node.gate-green .nb { stroke: var(--good); stroke-width: 2; } .node.gate-red .nb { stroke: var(--bad); stroke-width: 2; }
  .nt { font-size: 11px; fill: var(--ink); } .nb-accepted + .nt, .nb-landed + .nt { fill: #ffffff; } .lh { font-size: 11px; fill: var(--ink3); letter-spacing: .1em; text-transform: uppercase; } .edge { fill: none; stroke: var(--ink3); stroke-opacity: .45; stroke-width: 1; }
  .node { cursor: pointer; }
  table.matrix { border-collapse: collapse; font-size: 12px; } .matrix th, .matrix td { border: 1px solid var(--line); padding: 3px 6px; text-align: center; } .matrix th.ph, .matrix th[scope=row] { text-align: left; white-space: nowrap; }
  .matrix th span { display: inline-block; writing-mode: vertical-rl; transform: rotate(180deg); max-height: 160px; font-weight: 500; } .matrix th.gap span { color: var(--accent); }
  .matrix td.on { color: transparent; } .matrix td.on-accepted { background: var(--c-accepted); } .matrix td.on-landed { background: var(--c-landed); } .matrix td.on-progress { background: var(--c-progress); } .matrix td.on-paper { background: var(--c-paper); } .matrix td.on-returned { background: var(--c-returned); } .matrix td.on-ghost { box-shadow: inset 0 0 0 1px var(--ink3); }
  .legend { color: var(--ink2); font-size: 12px; max-width: 65ch; }
  .sent { margin-top: 18px; padding-top: 10px; border-top: 1px solid var(--line); } .sent h2 { font-size: 13px; text-transform: uppercase; letter-spacing: .12em; color: var(--ink2); }
  .sent ul { list-style: none; padding: 0; margin: 0; font-size: 13px; } .sent li { padding: 4px 0; border-top: 1px solid var(--line); } .sent time { color: var(--ink3); font-size: 12px; margin-right: 8px; }
  @media (min-width: 900px) { form.fb { grid-template-columns: 1fr 1fr auto; } form.fb textarea { grid-column: 1 / 3; } }
  @media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
</style>
<main>
  <header>
    <h1>The Ark's Parts</h1>
    <p class="sub">Every part from coldsnap and deadweight, the ark's own layer, and what the story still lacks. Every status here was measured in the repository at build time; nothing is typed by hand.</p>
    <div id="hdr"></div>
  </header>
  <div id="banner"></div>
  <div id="strip"></div>
  <nav class="tabs" role="tablist" aria-label="views">
    <button role="tab" data-view="frame" aria-selected="true">By frame</button>
    <button role="tab" data-view="source" aria-selected="false">By source</button>
    <button role="tab" data-view="graph" aria-selected="false">Dependencies</button>
    <button role="tab" data-view="matrix" aria-selected="false">Matrix</button>
  </nav>
  <div id="view-frame" class="view" role="tabpanel"></div>
  <div id="view-source" class="view" role="tabpanel" hidden></div>
  <div id="view-graph" class="view" role="tabpanel" hidden></div>
  <div id="view-matrix" class="view" role="tabpanel" hidden></div>
  <section class="sent" id="general">
    <h2>General feedback</h2>
    <form class="fb" data-part="general"><label>Anything not tied to one part</label>
      <select name="kind"><option>missing part</option><option>priority</option><option>playtest finding</option><option>a number</option><option>a word</option><option>a decision</option><option>wrong status</option><option>not wired</option></select>
      <input name="seed" placeholder="seed, or paste the game's address">
      <textarea name="text" rows="3" placeholder="what you saw, what you want" required></textarea>
      <label class="img"><input type="file" name="image" accept="image/*"><span>Add a screenshot, kept under 180 KB</span></label>
      <button type="submit">Send</button><span class="fb-status" aria-live="polite"></span></form>
  </section>
  <section class="sent" id="sentbox"><h2>Sent from this page</h2><ul id="sent"><li>The store has not answered yet.</li></ul></section>
</main>
<script>
const TABLE = /*__DATA__*/null;
/*__VIEWS__*/
(function () {
  const $ = (id) => document.getElementById(id);
  const R = renderAll(TABLE);
  $("hdr").innerHTML = R.header; $("banner").innerHTML = R.banner; $("strip").innerHTML = R.strip;
  $("view-frame").innerHTML = R.byFrame; $("view-source").innerHTML = R.bySource; $("view-graph").innerHTML = R.graph; $("view-matrix").innerHTML = R.matrix;
  const tabs = document.querySelectorAll("nav.tabs button");
  function show(view) { tabs.forEach((b) => b.setAttribute("aria-selected", String(b.dataset.view === view))); ["frame", "source", "graph", "matrix"].forEach((v) => { $("view-" + v).hidden = v !== view; }); try { localStorage.setItem("parts-view", view); } catch (e) {} }
  tabs.forEach((b) => b.addEventListener("click", () => show(b.dataset.view)));
  let v0 = "frame"; try { v0 = localStorage.getItem("parts-view") || "frame"; } catch (e) {} show(v0);
  function goto(partId) { show("source"); const el = $("s-part-" + partId); if (el) { el.open = true; el.scrollIntoView({ block: "start" }); el.querySelector("summary").focus(); } }
  document.addEventListener("click", (e) => { const a = e.target.closest("[data-goto]"); if (a) { e.preventDefault(); goto(a.dataset.goto); return; } const n = e.target.closest(".node"); if (n) goto(n.dataset.part); });

  // The store: feedback and verdicts. Rendered without it; lit up when it answers.
  let db = null;
  const stamp = () => new Date().toISOString();
  const IMAGE_CAP = 180 * 1024;   // a screenshot rides inside its entry; the store's own cap is 256 KB per document
  function setStatus(form, text) { const s = form.querySelector(".fb-status"); if (s) s.textContent = text; }
  // parseSeed: a bare number, or the game's address with ?seed=N in it
  function parseSeed(v) { const m = String(v || "").match(/[?&]seed=(\d+)/); if (m) return m[1]; const d = String(v || "").trim(); return d || null; }
  // shrink: a picked image to a JPEG data URL under the cap, narrowing and then lowering quality until it fits
  async function shrink(file) {
    const url = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); });
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    let w = Math.min(img.width, 900), q = 0.72;
    for (let k = 0; k < 10; k++) {
      const c = document.createElement("canvas"), sc = w / img.width; c.width = Math.max(1, Math.round(img.width * sc)); c.height = Math.max(1, Math.round(img.height * sc));
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      const out = c.toDataURL("image/jpeg", q); if (out.length <= IMAGE_CAP) return out;
      if (q > 0.45) q -= 0.1; else w = Math.round(w * 0.75);
    }
    return null;
  }
  async function entryFrom(form, kind) {
    const doc = { part: form.dataset.part, kind, seed: parseSeed(form.seed.value), text: form.text.value.trim(), t: stamp(), build: TABLE.meta.commit };
    const f = form.image && form.image.files && form.image.files[0];
    if (f) { setStatus(form, "Shrinking the image…"); const image = await shrink(f); if (!image) { setStatus(form, "The image would not fit under 180 KB even reduced; send it in the session instead."); return null; } doc.image = image; }
    return doc;
  }
  function keepUnsent(doc) { try { const q = JSON.parse(localStorage.getItem("parts-unsent") || "[]"); q.push(doc); localStorage.setItem("parts-unsent", JSON.stringify(q)); } catch (x) {} }
  function clearForm(form) { form.text.value = ""; form.seed.value = ""; if (form.image) form.image.value = ""; }
  document.addEventListener("submit", async (e) => {
    const fb = e.target.closest("form.fb"), ret = e.target.closest("form.ret"); if (!fb && !ret) return; e.preventDefault();
    const form = fb || ret;
    if (!form.text.value.trim()) return;
    const doc = await entryFrom(form, fb ? form.kind.value : "returned"); if (!doc) return;
    if (!db) { keepUnsent(doc); setStatus(form, ret ? "The store is off in this view; a return cannot be recorded here. The finding is kept on this device." : "The store is off in this view; kept on this device only."); return; }
    setStatus(form, "Sending…");
    try {
      await db.collection("feedback").add(doc);
      if (ret) await db.collection("acceptance").add({ part: form.dataset.part, phase: form.dataset.phase, verdict: "returned", finding: doc.text, seed: doc.seed, t: doc.t, build: doc.build });
      clearForm(form); setStatus(form, ret ? "Returned." : "Sent."); if (ret) form.hidden = true;
    } catch (err) { setStatus(form, "Not sent: " + (err && err.code || "error") + ". Try again."); }
  });
  async function accept(partId, phase) {
    if (!db) { alert("The store is off in this view; verdicts cannot be recorded here."); return; }
    try { await db.collection("acceptance").add({ part: partId, phase, verdict: "accepted", finding: null, t: stamp(), build: TABLE.meta.commit }); }
    catch (err) { alert("Not recorded: " + (err && err.code || "error")); }
  }
  document.addEventListener("click", (e) => {
    const cancel = e.target.closest("form.ret button.cancel"); if (cancel) { e.preventDefault(); cancel.closest("form.ret").hidden = true; return; }
    const b = e.target.closest("button.accept, li[data-part] > .acts > button.return, button.accept-all"); if (!b) return; e.preventDefault();
    const li = b.closest("li[data-part]"), det = b.closest("details.ready");
    const phase = det ? det.dataset.phase : null;
    if (b.classList.contains("accept-all")) { det.querySelectorAll("li[data-part]").forEach((x) => accept(x.dataset.part, phase)); return; }
    if (b.classList.contains("accept")) { accept(li.dataset.part, phase); return; }
    const form = li.querySelector("form.ret"); form.hidden = !form.hidden; if (!form.hidden) form.text.focus();
  });
  function renderSent(items) {
    const ul = $("sent"); if (!items.length) { ul.innerHTML = "<li>Nothing sent yet.</li>"; return; }
    ul.innerHTML = items.map((d) => `<li><time>${esc((d.t || "").replace("T", " ").slice(0, 16))}</time><b>${esc(d.part || "")}</b> · ${esc(d.verdict ? d.verdict + (d.finding ? ": " + d.finding : "") : d.kind + ": " + d.text)}${d.seed ? " · seed " + esc(d.seed) : ""}${d.image && /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(d.image) ? `<img class="thumb" src="${d.image}" alt="screenshot sent with this entry">` : ""}</li>`).join("");
  }
  function markVerdicts(items) {
    document.querySelectorAll(".strip li[data-part] .verdict").forEach((s) => { s.textContent = ""; });
    for (const d of items) { if (!d.verdict) continue; const li = document.querySelector('.strip li[data-part="' + CSS.escape(d.part) + '"]'); if (li) li.querySelector(".verdict").textContent = d.verdict + ", awaiting the stamp"; }
  }
  (async () => {
    db = window.claude && window.claude.use ? await window.claude.use("db") : null;
    if (!db) { $("sent").innerHTML = "<li>The store is off in this view. Feedback is kept on this device until the page is opened where the store runs.</li>"; return; }
    let feedback = [], verdicts = [];
    const paint = () => { const all = feedback.concat(verdicts).sort((a, b) => (b.t || "").localeCompare(a.t || "")); renderSent(all.slice(0, 80)); markVerdicts(verdicts); };
    db.collection("feedback").orderBy("t", "desc").limit(60).onSnapshot((snap) => { feedback = snap.docs.map((d) => d.data()); paint(); }, (err) => { $("sent").innerHTML = "<li>The store stopped answering: " + esc(err.code) + "</li>"; });
    db.collection("acceptance").orderBy("t", "desc").limit(200).onSnapshot((snap) => { verdicts = snap.docs.map((d) => d.data()); paint(); }, () => {});
    try { const q = JSON.parse(localStorage.getItem("parts-unsent") || "[]"); if (q.length) { for (const d of q) await db.collection("feedback").add(d); localStorage.removeItem("parts-unsent"); } } catch (x) {}
  })();
})();
</script>
PARTS_EOF_4
test "$(sha256sum docs/parts/template.html | cut -c1-16)" = "1f060cd44b1f6f88" && echo OK docs/parts/template.html || echo FAILED docs/parts/template.html
```
5. Write `scripts/parts.mjs`, exactly. The hash line must print OK.

```sh
mkdir -p scripts
cat > scripts/parts.mjs <<'PARTS_EOF_5'
#!/usr/bin/env node
// COMBO-ENGINE — parts.mjs: the parts table and the parts page, built from the
// record. Reads the authored parts source, the tree, the coldsnap checkout, the
// README's modules list, the phase documents, the manifest tool, and the gates,
// and writes docs/parts/parts.json and docs/parts/parts.html. Every status is
// measured here; the page only draws it.
//
//   node scripts/parts.mjs [--root DIR] [--src FILE] [--out DIR] [--gates all|none|a,b,c] [--reuse FILE]
//
// --reuse takes gate results from an earlier parts.json instead of running the
// gates; the parts gate uses it to prove twin identity of the derivation.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const ROOT = path.resolve(opt("--root", process.cwd()));
const SRC = path.resolve(opt("--src", path.join(ROOT, "docs/parts/parts-source.json")));
const OUT = path.resolve(opt("--out", path.join(ROOT, "docs/parts")));
const GATES_OPT = opt("--gates", "all");
const REUSE = opt("--reuse", null);
const TEMPLATE = path.resolve(opt("--template", path.join(path.dirname(SRC), "template.html")));
const VIEWS = path.resolve(opt("--views", path.join(path.dirname(SRC), "views.js")));

const sha = (buf) => crypto.createHash("sha256").update(buf).digest("hex").slice(0, 12);
const read = (p) => fs.readFileSync(p, "utf8");
const exists = (p) => fs.existsSync(p);
const git = (cwd, ...a) => { const r = spawnSync("git", a, { cwd, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }); if (r.status !== 0) throw new Error("git " + a.join(" ") + ": " + r.stderr); return r.stdout; };
const gitShowBuf = (cwd, ref, file) => { const r = spawnSync("git", ["show", ref + ":" + file], { cwd, maxBuffer: 64 * 1024 * 1024 }); return r.status === 0 ? r.stdout : null; };

const src = JSON.parse(read(SRC));
const t0 = Date.now();

// ---- coldsnap rows: one per source file at the commit, classified by the authored groups
const CS = src.coldsnap;
const csFiles = git(CS.checkout, "ls-tree", "-r", "--name-only", CS.commit, "--", "src").split("\n").filter(Boolean);
const ext = (f) => path.extname(f);
function groupOf(f) {
  for (const g of src.coldsnapGroups) {
    if (!g.match.some((m) => f.startsWith(m) || f === m)) continue;
    if (g.only && !g.only.includes(ext(f))) continue;
    if (g.exclude && g.exclude.includes(ext(f))) continue;
    return g;
  }
  return null;
}
const firstLine = (text) => { const m = text.match(/^\s*(?:\/\/|\/\*|\*|#)\s*(.*)$/m); return m ? m[1].slice(0, 140) : ""; };
const csParts = [];
for (const f of csFiles) {
  const g = groupOf(f); if (!g) { console.error("unclassified coldsnap file: " + f); process.exit(2); }
  const head = gitShowBuf(CS.checkout, CS.commit, f), old = gitShowBuf(CS.checkout, CS.treeCommit, f);
  const treeP = path.join(ROOT, f), tree = exists(treeP) ? fs.readFileSync(treeP) : null;
  const hashHead = sha(head), hashOld = old ? sha(old) : null, hashTree = tree ? sha(tree) : null;
  const file = !tree ? "absent" : hashTree === hashHead ? "current" : hashTree === hashOld ? "behind" : "differs";
  csParts.push({ id: "cs:" + f, source: "coldsnap", group: g.name, groupId: g.id, name: path.basename(f), path: f, lines: head.toString("utf8").split("\n").length - 1,
    does: firstLine(head.toString("utf8")), files: tree ? [f] : [], serves: g.serves || [], closes: g.closes || [], plan: g.plan, phaseOf: g.plan === "take" ? "ark-spine" : null,
    mech: { file, hashHead, hashOld, hashTree } });
}

// ---- the README's modules list: module -> the phases that landed it
const readme = exists(path.join(ROOT, "README.md")) ? read(path.join(ROOT, "README.md")) : "";
const modulePhases = {};
for (const m of readme.matchAll(/^- \[x\] ([a-z0-9-]+)(?: \([^)]*\))? — .*? — ((?:0\.0\.\d+)(?:[^\n]*))$/gm)) {
  const nums = [...m[2].matchAll(/0\.0\.\d+/g)].map((x) => x[0]);
  modulePhases[m[1]] = nums;
}

// ---- the phase documents: number, name, status word, the status line, acceptance bullets
const plansDir = path.join(ROOT, "docs/plans");
const phases = [];
for (const f of (exists(plansDir) ? fs.readdirSync(plansDir) : []).sort()) {
  const m = f.match(/^phase-(\d+\.\d+\.\d+)-(.+)\.md$/); if (!m) continue;
  const text = read(path.join(plansDir, f));
  const st = text.match(/^Status:\s*([A-Z]+)(.*)$/m);
  const acceptance = [];
  const sec = text.split(/^## Acceptance\s*$/m)[1];
  if (sec) for (const a of sec.split(/^## /m)[0].matchAll(/^- ([A-Za-z0-9_:./-]+): (accepted|returned)(?:,\s*(.*))?$/gm)) acceptance.push({ part: a[1], verdict: a[2], finding: a[3] || null });
  phases.push({ num: m[1], name: m[2].replace(/-/g, " "), file: "docs/plans/" + f, status: st ? st[1] : "UNKNOWN", line: st ? ("Status: " + st[1] + st[2]).slice(0, 160) : "", acceptance });
}
const phaseNums = new Set(phases.map((p) => p.num));

// ---- the manifest tool: import edges, file to file
const { manifest } = await import(pathToFileURL(path.join(ROOT, "scripts/manifest.mjs")).href);
const edges = manifest(ROOT).map((e) => { const [from, to] = e.split(" <- "); return { from, to: path.normalize(path.join(path.dirname(from), to)) }; });

// ---- the gates: the table in gate.mjs, run fresh, or reused from an earlier build
const gateText = read(path.join(ROOT, "scripts/gate.mjs"));
const gateTable = {};
for (const m of gateText.slice(gateText.indexOf("const GATES = {"), gateText.indexOf("};", gateText.indexOf("const GATES = {"))).matchAll(/^\s*"([a-z0-9-]+)":\s*\[([^\]]*)\]/gm)) gateTable[m[1]] = m[2].split(",").map((s) => s.trim().replace(/^"|"$/g, "")).filter(Boolean);
let gateRuns = {};
if (REUSE) { gateRuns = JSON.parse(read(REUSE)).gates || {}; }
else {
  const names = GATES_OPT === "all" ? Object.keys(gateTable) : GATES_OPT === "none" ? [] : GATES_OPT.split(",");
  for (const name of names) {
    const s0 = Date.now();
    const r = spawnSync(process.execPath, ["scripts/gate.mjs", name], { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
    const lines = ((r.stdout || "") + (r.stderr || "")).split("\n").map((l) => l.trim()).filter(Boolean);
    const checks = lines.filter((l) => /^(PASS|FAIL)\b/.test(l)).map((l) => l.slice(0, 160));
    const seedsLine = lines.find((l) => /seed/i.test(l) && !/^(PASS|FAIL)\b/.test(l)) || "no seeds line printed";
    gateRuns[name] = { name, script: gateTable[name][0], verdict: r.status === 0 ? "ok" : "FAIL", pass: checks.filter((c) => c.startsWith("PASS")).length, fail: checks.filter((c) => c.startsWith("FAIL")).length,
      seeds: seedsLine.slice(0, 160), checks, seconds: +((Date.now() - s0) / 1000).toFixed(1), tail: (lines[lines.length - 1] || "").slice(0, 160) };
    process.stderr.write(`gate ${name}: ${gateRuns[name].verdict} ${gateRuns[name].pass}/${gateRuns[name].pass + gateRuns[name].fail} in ${gateRuns[name].seconds} s\n`);
  }
}

// ---- exports and the surface a gate exercises
function exportsOf(files) {
  const names = new Set();
  for (const f of files) {
    const p = path.join(ROOT, f); if (!exists(p) || !/\.(js|mjs)$/.test(f)) continue;
    const text = read(p);
    for (const m of text.matchAll(/^export\s+(?:async\s+)?(?:function\*?|const|let|var|class)\s+([A-Za-z_$][\w$]*)/gm)) names.add(m[1]);
    for (const m of text.matchAll(/^export\s*\{([^}]*)\}/gm)) for (const n of m[1].split(",")) { const nm = n.trim().split(/\s+as\s+/).pop(); if (nm) names.add(nm); }
  }
  return [...names].sort();
}
function gateImports(gateName, files) {
  if (!gateTable[gateName]) return null;
  const script = path.join(ROOT, gateTable[gateName][0]); if (!exists(script)) return null;
  const text = read(script), used = new Set();
  for (const m of text.matchAll(/import\s*\{([\s\S]*?)\}\s*from\s*"([^"]+)"/g)) {
    const target = path.normalize(path.join(path.dirname(gateTable[gateName][0]), m[2]));
    if (!files.includes(target)) continue;
    for (const n of m[1].split(",")) { const nm = n.trim().split(/\s+as\s+/)[0].trim(); if (nm) used.add(nm); }
  }
  return used;
}
const demo = exists(path.join(ROOT, "deadweight-hangar.html")) ? read(path.join(ROOT, "deadweight-hangar.html")).split("\n") : [];
function demoLine(fn) { const i = demo.findIndex((l) => l.startsWith("function " + fn + "(")); return i >= 0 ? i + 1 : null; }

// ---- the authored parts, enriched
const parts = [];
for (const p0 of src.parts) {
  const p = { ...p0, mech: {} };
  let files = p.files ? p.files.slice() : [];
  if (p.module) { const dir = path.join(ROOT, "src/modules", p.module); if (exists(dir)) files = fs.readdirSync(dir).filter((f) => /\.(js|mjs)$/.test(f)).map((f) => "src/modules/" + p.module + "/" + f); else p.mech.missing = ["src/modules/" + p.module + "/"]; }
  p.files = files;
  if (files.length) { p.mech.present = files.every((f) => exists(path.join(ROOT, f))); p.mech.missing = files.filter((f) => !exists(path.join(ROOT, f))); }
  if (p.module && !p.phase && modulePhases[p.module]) { p.phases = modulePhases[p.module]; p.phase = p.phases[p.phases.length - 1]; }
  if (p.demoFns) { p.mech.demoLines = {}; for (const fn of p.demoFns) p.mech.demoLines[fn] = demoLine(fn); }
  if (files.length) {
    const set = new Set(files);
    p.mech.importedBy = [...new Set(edges.filter((e) => set.has(e.to) && !set.has(e.from)).map((e) => e.from))].sort();
    p.mech.imports = [...new Set(edges.filter((e) => set.has(e.from) && !set.has(e.to)).map((e) => e.to))].sort();
    p.mech.wired = p.mech.importedBy.length > 0;
    const ex = exportsOf(files), used = p.gate ? gateImports(p.gate, files) : null;
    if (ex.length) p.mech.exports = { total: ex.length, exercised: used ? ex.filter((n) => used.has(n)).length : 0, untested: used ? ex.filter((n) => !used.has(n)) : ex };
  }
  if (p.gate && gateRuns[p.gate]) p.mech.gate = gateRuns[p.gate];
  else if (p.gate && !gateTable[p.gate]) p.mech.gateMissing = p.gate;
  parts.push(p);
}
for (const p of csParts) parts.push(p);

// ---- the graph: one node per part (coldsnap files fold into their group), edges from the manifest
const layerOf = (p) => p.source === "coldsnap" ? "spine" : p.id.startsWith("scr-") || p.id === "ark-page" ? "screens" : p.source === "deadweight" || p.module ? "modules" : "game";
const nodes = [];
const owner = {};   // file -> node id
for (const p of parts) {
  const nid = p.source === "coldsnap" ? p.groupId : p.id;
  if (!nodes.find((n) => n.id === nid)) nodes.push({ id: nid, name: p.source === "coldsnap" ? p.group : p.name, layer: layerOf(p), source: p.source });
  for (const f of p.files || []) owner[f] = nid;
}
const gEdges = new Map();
for (const e of edges) { const a = owner[e.from], b = owner[e.to]; if (a && b && a !== b) gEdges.set(a + ">" + b, { from: a, to: b }); }
// coldsnap rollups: one row per group for the frame view, the matrix, and the graph; the files stay under By source
const rollups = [];
for (const g of src.coldsnapGroups) { const rows = parts.filter((p) => p.groupId === g.id); if (!rows.length) continue;
  const fileStates = {}; for (const r of rows) fileStates[r.mech.file] = (fileStates[r.mech.file] || 0) + 1;
  rollups.push({ id: g.id, source: "coldsnap", group: g.name, name: g.name, does: rows.length + " files at " + CS.commit + ": " + Object.entries(fileStates).map(([k, v]) => v + " " + (k === "differs" ? "changed here" : k)).join(", "), files: [], count: rows.length, fileStates,
    serves: g.serves || [], closes: g.closes || [], plan: g.plan, phaseOf: g.plan === "take" ? "ark-spine" : null, isRollup: true,
    mech: { file: rows.every((r) => r.mech.file === "current") ? "current" : rows.some((r) => r.mech.file === "absent") ? "absent" : rows.some((r) => r.mech.file === "differs") ? "differs" : "behind" } }); }

const table = {
  title: src.title, coldsnap: { commit: CS.commit, treeCommit: CS.treeCommit, checkout: CS.checkout }, frames: src.frames, gaps: src.gaps, feedbackKinds: src.feedbackKinds,
  parts, rollups, phases, gates: gateRuns, graph: { nodes, edges: [...gEdges.values()] },
  meta: { commit: git(ROOT, "rev-parse", "--short", "HEAD").trim(), builtAt: new Date().toISOString().slice(0, 16).replace("T", " "), gatesRun: Object.keys(gateRuns).length, gateSeconds: +Object.values(gateRuns).reduce((s, g) => s + g.seconds, 0).toFixed(1), buildSeconds: 0 },
};
table.meta.buildSeconds = +((Date.now() - t0) / 1000).toFixed(1);

// ---- write the table and the page
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, "parts.json"), JSON.stringify(table, null, 1));
const views = read(VIEWS).replace(/^export\s+/gm, "");
const html = read(TEMPLATE).replace("/*__DATA__*/null", () => JSON.stringify(table)).replace("/*__VIEWS__*/", () => views);
fs.writeFileSync(path.join(OUT, "parts.html"), html);
console.log(`parts: ${parts.length} rows (${csParts.length} coldsnap files, ${src.parts.length} authored), ${phases.length} phase documents, ${edges.length} import edges, ${Object.keys(gateRuns).length} gates in ${table.meta.gateSeconds} s, build ${table.meta.buildSeconds} s`);
console.log(`wrote ${path.relative(ROOT, path.join(OUT, "parts.json"))} (${fs.statSync(path.join(OUT, "parts.json")).size} bytes) and parts.html (${fs.statSync(path.join(OUT, "parts.html")).size} bytes)`);
PARTS_EOF_5
test "$(sha256sum scripts/parts.mjs | cut -c1-16)" = "564ea7fe77a0683a" && echo OK scripts/parts.mjs || echo FAILED scripts/parts.mjs
```
6. Write `scripts/parts-test.mjs`, exactly. The hash line must print OK.

```sh
mkdir -p scripts
cat > scripts/parts-test.mjs <<'PARTS_EOF_6'
// COMBO-ENGINE — parts-test: the parts page's gate. Laws over the authored
// source, the generated table, and the builders the page draws with. Seedless:
// the tree is the fixture. The generator runs here twice with no gates, into a
// scratch folder, so the gate never spends the suite's minutes.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { STATES, BUCKETS, derive, renderAll } from "../docs/parts/views.js";

let pass = 0, fail = 0;
const check = (name, ok) => { if (ok) { pass++; console.log("PASS " + name); } else { fail++; console.log("FAIL " + name); } };
console.log("seeds {} — the tree is the fixture");

const ROOT = process.cwd();
const src = JSON.parse(fs.readFileSync(path.join(ROOT, "docs/parts/parts-source.json"), "utf8"));
const frameIds = new Set(src.frames.map((f) => f.id)), gapIds = new Set(src.gaps.map((g) => g.id));

// 1. the source: ids unique; every part has a source, a group, a plan; every frame and gap it names exists
{
  const ids = src.parts.map((p) => p.id);
  const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
  const shaped = src.parts.every((p) => ["coldsnap", "deadweight", "ark"].includes(p.source) && p.group && p.plan && p.name && p.does);
  const named = src.parts.every((p) => (p.serves || []).every((f) => frameIds.has(f)) && (p.closes || []).every((g) => gapIds.has(g)))
    && src.coldsnapGroups.every((g) => (g.serves || []).every((f) => frameIds.has(f)) && (g.closes || []).every((x) => gapIds.has(x)));
  check("parts: the source has unique ids, a source, group, plan, name and does on every part, and names only real frames and gaps", dupes.length === 0 && shaped && named);
}
// 2. every part that is built serves a frame or closes a gap; tooling is the one exempt group
check("parts: every part not left behind serves a frame or closes a gap, tooling excepted",
  src.parts.every((p) => ["leave", "decide"].includes(p.plan) || p.group === "Tooling" || (p.serves && p.serves.length) || (p.closes && p.closes.length))
  && src.coldsnapGroups.every((g) => ["leave", "decide"].includes(g.plan) || (g.serves && g.serves.length) || (g.closes && g.closes.length)));

// 3. the generator, twice, no gates: identical tables but for the clock
const tmpA = fs.mkdtempSync(path.join(os.tmpdir(), "parts-a-")), tmpB = fs.mkdtempSync(path.join(os.tmpdir(), "parts-b-"));
const run = (out) => spawnSync(process.execPath, ["scripts/parts.mjs", "--gates", "none", "--out", out], { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
const ra = run(tmpA), rb = run(tmpB);
check("parts: the generator runs clean twice on this tree", ra.status === 0 && rb.status === 0 && fs.existsSync(path.join(tmpA, "parts.json")) && fs.existsSync(path.join(tmpB, "parts.html")));
const strip = (o) => { const c = JSON.parse(JSON.stringify(o)); delete c.meta.builtAt; delete c.meta.buildSeconds; return JSON.stringify(c); };
const A = ra.status === 0 ? JSON.parse(fs.readFileSync(path.join(tmpA, "parts.json"), "utf8")) : null;
const B = rb.status === 0 ? JSON.parse(fs.readFileSync(path.join(tmpB, "parts.json"), "utf8")) : null;
check("parts: twin builds of one tree are identical but for the clock", !!A && !!B && strip(A) === strip(B));

if (A) {
  const t = derive(A);
  // 4. coldsnap rows: the file state follows the hashes
  const cs = t.parts.filter((p) => p.source === "coldsnap");
  check("parts: every coldsnap row's file state follows its three hashes", cs.length > 50 && cs.every((p) => p.mech.hashHead && (
    (p.mech.file === "absent" && !p.mech.hashTree) || (p.mech.file === "current" && p.mech.hashTree === p.mech.hashHead) ||
    (p.mech.file === "behind" && p.mech.hashTree === p.mech.hashOld && p.mech.hashTree !== p.mech.hashHead) || (p.mech.file === "differs" && p.mech.hashTree && p.mech.hashTree !== p.mech.hashHead && p.mech.hashTree !== p.mech.hashOld))));
  // 5. every state is one of the vocabulary, and the overall meter sums to the units not left behind
  const sum = (c) => BUCKETS.reduce((s, b) => s + c[b], 0);
  check("parts: every unit's state is in the vocabulary and every meter sums to what it counts",
    t.units.every((p) => STATES.includes(p.state)) && sum(t.overall) === t.units.filter((p) => p.plan !== "leave").length && t.frames.every((f) => sum(f.counts) === f.parts.length) && t.sources.every((s) => sum(s.counts) === s.parts.length));
  // 6. the phase documents' status words are all in the vocabulary the standing orders name
  const WORDS = ["PLANNED", "SERVED", "APPROVED", "DISPATCHED", "LANDED", "ACCEPTED", "RETURNED"];
  check("parts: every phase document's status word is one the standing orders name (" + t.phases.length + " documents)", t.phases.length > 0 && t.phases.every((p) => WORDS.includes(p.status)));
  // 7. every gate a part names is in the gate table; exercised never exceeds the surface
  const gateNames = new Set(Object.keys(JSON.parse(JSON.stringify(A.gates))).concat(readGateTable()));
  check("parts: every gate a part names is registered, and exercised exports never exceed the surface",
    t.parts.every((p) => !p.gate || gateNames.has(p.gate)) && t.parts.every((p) => !p.mech.exports || (p.mech.exports.exercised <= p.mech.exports.total && p.mech.exports.untested.length === p.mech.exports.total - p.mech.exports.exercised)));
  // 8. the views carry every unit: each authored part under By source, each unit with a claim under By frame, each in the matrix
  const R = renderAll(A);
  const authored = t.parts.filter((p) => p.source !== "coldsnap");
  const inSource = authored.every((p) => R.bySource.includes(`id="s-part-${p.id}"`)) && cs.every((p) => R.bySource.includes(`id="s-part-${p.id}"`));
  const inFrame = t.units.filter((p) => (p.serves || []).length || (p.closes || []).length).every((p) => R.byFrame.includes(`id="f-part-${p.id}"`));
  const inMatrix = t.units.filter((p) => p.plan !== "leave").every((p) => R.matrix.includes(`data-goto="${p.id}"`));
  check("parts: every part is drawn where it belongs: files under By source, units with a claim under By frame, units in the matrix", inSource && inFrame && inMatrix);
  // 9. the graph: every node is a unit or a rollup, every edge joins two nodes, and the ark's page reaches its game files
  const nodeIds = new Set(A.graph.nodes.map((n) => n.id)), unitIds = new Set(t.units.map((u) => u.id));
  const wired = t.parts.filter((p) => p.id.startsWith("ark-") && p.files && p.files.some((f) => f.startsWith("src/games/gravitys-ark/")));
  check("parts: every graph node is a unit, every edge joins two nodes, and the ark's game files are wired to the page", [...nodeIds].every((id) => unitIds.has(id)) && A.graph.edges.every((e) => nodeIds.has(e.from) && nodeIds.has(e.to)) && wired.length > 0 && wired.every((p) => p.mech.wired));
  // 10. the page embeds the table and the builders
  const html = fs.readFileSync(path.join(tmpA, "parts.html"), "utf8");
  check("parts: the page embeds the table it was built from and the builders that draw it", html.includes('"commit":"' + A.meta.commit + '"') && html.includes("function renderAll(") && !html.includes("/*__DATA__*/") && !html.includes("/*__VIEWS__*/"));
  // 11. the feedback path: the seed field takes the game's address, an image rides under the store's cap, and a return carries its finding
  const capLine = html.match(/const IMAGE_CAP = (\d+) \* 1024;/);
  check("parts: the page parses a seed out of the game's address, caps an image under the store's 256 KB, and returns with a finding through the same form",
    html.includes("function parseSeed(") && html.includes("[?&]seed=") && !!capLine && +capLine[1] * 1024 < 256 * 1024 && html.includes("async function shrink(") && (R.strip.includes('class="ret"') || t.ready.length === 0) && html.includes('verdict: "returned", finding: doc.text'));
  // 12. the shelf's decisions are rows in the picture, each on a frame
  const decisions = t.parts.filter((p) => p.plan === "decide" && p.source === "ark");
  check("parts: the shelf's open decisions stand in the picture as decision pending, each on a frame (" + decisions.length + ")", decisions.length >= 9 && decisions.every((p) => p.state === "decision pending" && (p.serves || []).length > 0));
  // 13. the seed export: one file, wired into the game page, a button in the fixed cluster and one on the card
  const seedFile = path.join(ROOT, "docs/gravitys-ark/seed.js"), pageHtml = path.join(ROOT, "docs/gravitys-ark/index.html"), pageMain = path.join(ROOT, "docs/gravitys-ark/main.js");
  const seedOk = fs.existsSync(seedFile) && /export function wireSeed\(/.test(fs.readFileSync(seedFile, "utf8")) && fs.readFileSync(pageMain, "utf8").includes('from "./seed.js"') && /id="seedB"/.test(fs.readFileSync(pageHtml, "utf8")) && /id="seedCard"/.test(fs.readFileSync(pageHtml, "utf8"));
  check("parts: the seed export is its own file, hooked into the game page, with a button in the fixed cluster and one on the card", seedOk);
}
function readGateTable() { const g = fs.readFileSync(path.join(ROOT, "scripts/gate.mjs"), "utf8"); return [...g.matchAll(/^\s*"([a-z0-9-]+)":\s*\[/gm)].map((m) => m[1]); }
fs.rmSync(tmpA, { recursive: true, force: true }); fs.rmSync(tmpB, { recursive: true, force: true });
console.log(`parts-test: ${pass} PASS / ${fail} FAIL`);
console.log(fail ? "parts-test FAIL" : "parts-test PASS");
process.exit(fail ? 1 : 0);
PARTS_EOF_6
test "$(sha256sum scripts/parts-test.mjs | cut -c1-16)" = "a553788bb3dc57ab" && echo OK scripts/parts-test.mjs || echo FAILED scripts/parts-test.mjs
```
7. Write `docs/gravitys-ark/seed.js`, exactly. The hash line must print OK.

```sh
mkdir -p docs/gravitys-ark
cat > docs/gravitys-ark/seed.js <<'PARTS_EOF_7'
// GRAVITY'S ARK — seed.js: the seed export, one button on every screen. The
// button copies the page's own address with the seed in it, so a bug report
// starts as one paste. The page's main file takes only the hookup line.
export function seedAddress(seed) {
  return location.origin + location.pathname + "?seed=" + seed;
}
// wireSeed(seed, opts): opts.buttons names the button ids to wire; opts.log
// takes one line to show. Copies through the clipboard when the browser
// allows it, and falls back to a prompt the player can copy from.
export function wireSeed(seed, opts) {
  const address = seedAddress(seed);
  const say = (line) => { if (opts && opts.log) opts.log(line); };
  const copy = async () => {
    try { if (navigator.clipboard && navigator.clipboard.writeText) { await navigator.clipboard.writeText(address); say("seed " + seed + " copied: " + address); return true; } } catch (e) { /* fall through to the prompt */ }
    prompt("Copy the address with the seed:", address);
    say("seed " + seed + ": " + address);
    return false;
  };
  for (const id of (opts && opts.buttons) || []) { const b = document.getElementById(id); if (b) b.onclick = (e) => { e.preventDefault(); copy(); }; }
  return { address, copy };
}
PARTS_EOF_7
test "$(sha256sum docs/gravitys-ark/seed.js | cut -c1-16)" = "8bbad90eea32ea7f" && echo OK docs/gravitys-ark/seed.js || echo FAILED docs/gravitys-ark/seed.js
```

8. Edit `scripts/manifest.mjs`: the roots gain the ark page's folder and the parts folder, one line. The hash line must print OK.

```sh
python3 - <<'PARTS_EOF_8'
p = "scripts/manifest.mjs"; s = open(p, encoding="utf-8").read()
old = 'const ROOTS = ["src", "docs/frostline", "docs/play"];'
assert s.count(old) == 1, "anchor"
open(p, "w", encoding="utf-8").write(s.replace(old, 'const ROOTS = ["src", "docs/frostline", "docs/play", "docs/gravitys-ark", "docs/parts"];'))
PARTS_EOF_8
test "$(sha256sum scripts/manifest.mjs | cut -c1-16)" = "0b718197f3391755" && echo OK scripts/manifest.mjs || echo FAILED scripts/manifest.mjs
```

9. Edit `scripts/gate.mjs`: one line after the `"gravitys-ark"` entry. Touch nothing else in the file. The hash line must print OK.

```sh
python3 - <<'PARTS_EOF_9'
p = "scripts/gate.mjs"; s = open(p, encoding="utf-8").read()
old = '  "gravitys-ark": ["scripts/gravitys-ark-test.mjs"],\n'
assert s.count(old) == 1, "anchor"
open(p, "w", encoding="utf-8").write(s.replace(old, old + '  "parts": ["scripts/parts-test.mjs"],\n'))
PARTS_EOF_9
test "$(sha256sum scripts/gate.mjs | cut -c1-16)" = "faf9426ef9bc15da" && echo OK scripts/gate.mjs || echo FAILED scripts/gate.mjs
```

10. Edit the two extract-module templates: the phase template's status comment carries the status vocabulary and the acceptance heading; the task template's record-close step runs the generator and commits the page. Both hash lines must print OK.

```sh
python3 - <<'PARTS_EOF_10'
p = ".claude/skills/extract-module/templates/phase.md"; s = open(p, encoding="utf-8").read()
old = "Status: PLANNED. No task dispatched.\n<!-- At landing this line becomes: Status: LANDED, commit `<hash>`, <date>. Gate: <count> PASS / 0 FAIL; prior gates unmoved. -->"
assert s.count(old) == 1, "phase template anchor"
new = "Status: PLANNED. No task dispatched.\n<!-- The status word is one of PLANNED, SERVED, APPROVED, DISPATCHED, LANDED, ACCEPTED, RETURNED, moved by the plan-writer at each step; the parts page reads it. At landing this line becomes: Status: LANDED, commit `<hash>`, <date>. Gate: <count> PASS / 0 FAIL; prior gates unmoved. Acceptance is recorded per part under a heading \"## Acceptance\" as \"- <part id>: accepted\" or \"- <part id>: returned, <finding>\", on the owner's word. -->"
open(p, "w", encoding="utf-8").write(s.replace(old, new))
t = ".claude/skills/extract-module/templates/task.md"; s = open(t, encoding="utf-8").read()
old7 = "7. Close the records in this landing: bump `package.json` version to the phase number; in `docs/plans/phase-0.0.N-<name>.md` replace the status line with `Status: LANDED, commit stamped below, <date>. Gate: <N> PASS / 0 FAIL; prior gates unmoved.`; in `README.md` flip the earned checklist box(es) `- [ ]` to `- [x]` for <named boxes>."
assert s.count(old7) == 1, "task template step 7"
s = s.replace(old7, old7 + " Then rebuild the parts table and the parts page, about four minutes since every gate runs: `node scripts/parts.mjs --gates all` must end with a `wrote docs/parts/parts.json` line; both files ride the landing commit, and the orchestrator republishes the page and names it in the landing report.")
old8 = "git add src/modules/<name> scripts/<name>-test.mjs scripts/gate.mjs README.md package.json docs/plans"
assert s.count(old8) == 1, "task template step 8"
s = s.replace(old8, old8 + " docs/parts/parts.json docs/parts/parts.html")
open(t, "w", encoding="utf-8").write(s)
PARTS_EOF_10
test "$(sha256sum .claude/skills/extract-module/templates/phase.md | cut -c1-16)" = "ee208d5a7670f634" && echo OK phase.md || echo FAILED phase.md
test "$(sha256sum .claude/skills/extract-module/templates/task.md | cut -c1-16)" = "8d6985c002c697c0" && echo OK task.md || echo FAILED task.md
```

11. Hook the seed export into the game page: one button in the fixed cluster, one on the card, one import and one call in the main file. Both hash lines must print OK.

```sh
python3 - <<'PARTS_EOF_11'
h = "docs/gravitys-ark/index.html"; s = open(h, encoding="utf-8").read()
old = '<div id="zoom"><button id="zoomOut">−</button><button id="zoomIn">+</button><button id="pause">II</button></div>'
assert s.count(old) == 1, "zoom anchor"
s = s.replace(old, '<div id="zoom"><button id="zoomOut">−</button><button id="zoomIn">+</button><button id="pause">II</button><button id="seedB">SEED</button></div>')
old2 = '<button id="wake" style="display:none">WAKE</button><button id="again">NEW SEED</button>'
assert s.count(old2) == 1, "card anchor"
s = s.replace(old2, '<button id="wake" style="display:none">WAKE</button><button id="seedCard">COPY SEED</button><button id="again">NEW SEED</button>')
old3 = '  #zoom button { min-width: 44px; width: 44px; height: 40px; padding: 0; font-size: 16px; }\n'
assert s.count(old3) == 1, "zoom css anchor"
s = s.replace(old3, old3 + '  #zoom #seedB { width: auto; min-width: 60px; padding: 0 10px; font-size: 11px; letter-spacing: 0.12em; }\n')
open(h, "w", encoding="utf-8").write(s)
m = "docs/gravitys-ark/main.js"; s = open(m, encoding="utf-8").read()
old = 'import { makeHold, order as holdOrder, tick as holdTick, summary as holdSummary } from "../../src/games/gravitys-ark/hold.js";\n'
assert s.count(old) == 1, "import anchor"
s = s.replace(old, old + 'import { wireSeed } from "./seed.js";\n')
old2 = 'const ship = road.ship, state = road.state, star = galaxy.star;\n'
assert s.count(old2) == 1, "state anchor"
s = s.replace(old2, old2 + 'wireSeed(seed, { buttons: ["seedB", "seedCard"], log: (line) => state.events.push({ k: line, t: state.t }) });   // the seed export, one button on every screen: the fixed cluster and the card\n')
open(m, "w", encoding="utf-8").write(s)
PARTS_EOF_11
test "$(sha256sum docs/gravitys-ark/index.html | cut -c1-16)" = "181e2655a579576d" && echo OK index.html || echo FAILED index.html
test "$(sha256sum docs/gravitys-ark/main.js | cut -c1-16)" = "8bfaca5e2956fa11" && echo OK main.js || echo FAILED main.js
```

12. Run the two gates through the wrapper. The manifest gate must print 3 PASS lines, then `manifest-test: 3 PASS / 0 FAIL`, then `manifest-test PASS`. The parts gate must print a seeds line, 14 PASS lines, then `parts-test: 14 PASS / 0 FAIL`, then `parts-test PASS`, exit 0. Any FAIL stops the task here.

```sh
node scripts/gate.mjs manifest
node scripts/gate.mjs parts
```

13. Build the table and the page with every gate. This takes about 192 to 257 seconds on this machine, measured; do not stop it. It must end with a `wrote docs/parts/parts.json` line, and the count line before it must name 49 gates.

```sh
node scripts/parts.mjs --gates all
test -s docs/parts/parts.json && test -s docs/parts/parts.html && echo OK page built || echo FAILED page build
```

14. Close the records in this landing: bump `package.json` to 0.0.112; add the parts page line to the README's Status section; set the phase document's status line. The README hash line must print OK.

```sh
python3 - <<'PARTS_EOF_14'
import re
p = "package.json"; s = open(p, encoding="utf-8").read(); assert '"version": "0.0.111"' in s; open(p, "w", encoding="utf-8").write(s.replace('"version": "0.0.111"', '"version": "0.0.112"'))
rd = "README.md"; s = open(rd, encoding="utf-8").read()
old = "The next extractions come from the checklist's unchecked boxes, harness layer first."
assert s.count(old) == 1, "README anchor"
open(rd, "w", encoding="utf-8").write(s.replace(old, old + " The parts page at `docs/parts/` lists every part from coldsnap and deadweight, the ark's own layer, and the story's gaps, with the evidence measured at each landing by `node scripts/parts.mjs`; it is published for acceptance and feedback and named in every landing report."))
ph = "docs/plans/phase-0.0.112-parts-page.md"; s = open(ph, encoding="utf-8").read()
assert len(re.findall(r"^Status: (?:PLANNED|SERVED|APPROVED|DISPATCHED)\b[^\n]*$", s, re.M)) == 1, "phase status anchor"
open(ph, "w", encoding="utf-8").write(re.sub(r"^Status: (?:PLANNED|SERVED|APPROVED|DISPATCHED)\b[^\n]*$", "Status: LANDED, commit stamped below, 2026-09-09. Gate: 14 PASS / 0 FAIL; manifest 3 PASS / 0 FAIL with its two new roots.", s, count=1, flags=re.M))
PARTS_EOF_14
test "$(sha256sum README.md | cut -c1-16)" = "4f57d693a57e84f5" && echo OK README.md || echo FAILED README.md
grep -c '"version": "0.0.112"' package.json
```

15. Commit and push the landing, then stamp the real hash in a second small commit. Never amend after stamping. The standing orders and the two shelf documents are already committed at e5d2300; the add below finds them unchanged, and the task does not edit them.

```sh
git add CLAUDE.md README.md package.json docs/plans docs/parts docs/gravitys-ark/seed.js docs/gravitys-ark/index.html docs/gravitys-ark/main.js scripts/parts.mjs scripts/parts-test.mjs scripts/gate.mjs scripts/manifest.mjs .claude/skills/extract-module/templates
git commit -m "phase 0.0.112 — the parts page: the table built from the record, the page with its four views and the feedback store, the parts gate, the seed export on every screen

Every part from coldsnap and deadweight, the ark's own layer, and the story's gaps, with the evidence measured in the tree.
parts-test 14 PASS / 0 FAIL; manifest-test 3 PASS / 0 FAIL with two new roots; the page built over 49 gates.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01QSq3kZC3Bk9SC5RwnqYUfs"
git push origin main
H=$(git rev-parse --short HEAD)
sed -i "s/commit stamped below/commit \`$H\`/" docs/plans/phase-0.0.112-parts-page.md
git add docs/plans && git commit -m "phase 0.0.112 record stamped — $H

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01QSq3kZC3Bk9SC5RwnqYUfs"
git push origin main
```

## Acceptance

- Step 12: `parts-test: 14 PASS / 0 FAIL` then `parts-test PASS`, exit 0; `manifest-test: 3 PASS / 0 FAIL` then `manifest-test PASS`; both with an `ok` line in `.superpowers/gates.log`.
- Step 13: the generator's count line names 49 gates and ends with `wrote docs/parts/parts.json`.
- Every hash line in steps 2 through 14 printed OK.
- The records closed in the landing commit; push accepted by origin; the stamp commit pushed.

After the landing the orchestrator republishes the page from `docs/parts/parts.html` to its fixed address and names it, with the live game's link, in the landing report.

## Report

Read-confirmation first, then one line of outcome, then bullets: the two gates' count lines and verdict lines verbatim, the generator's count line verbatim, every hash line, both commit hashes, the push results. Every nonconformity its own labeled bullet. Fixture seeds: the parts gate is seedless, the tree is its fixture; the generator's page carries the seeds every gate printed in the build, quote the seeds line of the `gravitys-ark` gate from `docs/parts/parts.json`.
