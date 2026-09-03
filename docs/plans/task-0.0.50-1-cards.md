# Task 0.0.50-1 — cards carved out

One job: move `cards` into its own module and leave the depot a one-line front door. Write exactly what is written, run the listed gates, report. You design nothing.

Suggested model: Sonnet 5.

Required reading, in order (confirm at the top of your report):
1. This file, whole.
2. `docs/plans/phase-0.0.50-cards.md`, whole.

## Steps

Run from `/home/batman/combo-engine`. A failed assert stops the task; report the step and its verbatim output, run nothing further.

1. Assert the ground:

```sh
sha256sum src/depot/cards.js   # must print 8daa4fcf24ea12d71a1dbc6346254f8c1b7ea0fb5fb7ae13790142eaf72b0d00
node scripts/gate.mjs combat | tail -1   # must print: ALL PASS
ls src/modules/cards 2>/dev/null || echo absent   # must print: absent
mkdir -p src/modules/cards
```

2. Write `src/modules/cards/cards.js`, exactly (the source file with its import paths rewritten — the one substitution):

```js
// COLDSNAP DEPOT — cards.js: THE CARD REGISTRY (Task 1, mk2.39). One home
// for every card the game shows. CARDS is the market's nineteen (moved
// verbatim from infocards.js, which now re-exports from here); TEACH is the
// teaching table — empty until Task 2 writes the owner-ruled copy. Numbers
// are READ from the live spec tables at load — a card can never drift from
// the gun it describes. Pure data.
import { TOWER_SPECS, INFANTRY_ARMS, BISON, APC, MECH, SATCHEL } from "../../depot/specs.js";
import { SQUAD_SPECS, squadSpeed } from "../../depot/squads.js";

const ORDERS_ARMED = ["DEFEND", "MOVE", "ATTACK", "PATROL", "ATTACK STRUCTURES", "TAKE CONTROL"];
const ORDERS_TOWER = ["CAREFUL / FREE", "TAKE CONTROL", "SELL"];
const ORDERS_HULL = ["DEFEND", "MOVE", "PATROL", "ESCORT", "TRACKS SAFETY", "TAKE CONTROL"];
const dmgOf = (a) => (a && (a.dirDmg != null ? a.dirDmg : a.dmg)) ?? null;
const sq = (type, role, skills, dmg) => {
  const s = SQUAD_SPECS[type], a = INFANTRY_ARMS[type] || null;
  const M = s.member || { hp: 58 };
  return { label: s.label, role, n: s.n, hp: M.hp, dmg: dmg !== undefined ? dmg : dmgOf(a),
    range: a ? a.range : null, speed: squadSpeed(type), skills };
};
const tw = (t, role, skills) => {
  const s = TOWER_SPECS[t];
  return { label: s.label, role, n: null, hp: s.hp, dmg: s.fireRate > 0 ? dmgOf(s) : null,
    range: s.range, speed: null, skills };
};
export const CARDS = {
  mg:     tw("mg", "Fast, cheap, short reach. Chews infantry; useless against stone.", ORDERS_TOWER),
  gun:    tw("gun", "The flat-trajectory workhorse. Cracks men and masonry alike.", ORDERS_TOWER),
  mortar: tw("mortar", "Arcs over walls. Big blast, slow reload.", ORDERS_TOWER),
  rocket: tw("rocket", "A four-rocket salvo, then a long reload. Saturation over precision.", ORDERS_TOWER),
  tesla:  tw("tesla", "Chain lightning. Strikes one, then arcs to everything near — friend, foe, stone, or water.", ORDERS_TOWER),
  sq_sniper:    sq("sniper", "A marksman and his spotter. The longest rifle on the field; the spotter's binoculars are the farthest eyes.", ORDERS_ARMED),
  sq_rifles:    sq("rifles", "Four riflemen. The working infantry of the line.", ORDERS_ARMED),
  sq_mg:        sq("mg", "A gunner and his loader. Six-round bursts that stop a rush.", ORDERS_ARMED),
  sq_sappers:   sq("sappers", "Two men, two satchel charges. They breach masonry and rarely survive the work. They also lay mines and tripwires.", ["DEFEND", "MOVE", "ATTACK (SATCHELS)", "TAKE CONTROL", "LAY MINES", "LAY WIRES"], SATCHEL.dmg),
  sq_mortars:   sq("mortars", "Two men and a tube. Shells over any wall from a distance.", ORDERS_ARMED),
  sq_engineers: sq("engineers", "Two builders — shovels, not rifles. They lay sandbag and wall lines where you draw them.", ["DEFEND", "MOVE", "ATTACK", "TAKE CONTROL", "BUILD BAGS", "BUILD WALLS"], null),
  sq_rockets:    sq("rockets", "A rocket pair. Slow salvos that crack armor and stone.", ORDERS_ARMED),
  sq_grenadiers: sq("grenadiers", "Four throwers. Short live grenades over the near wall.", ORDERS_ARMED),
  sq_medics:    sq("medics", "Two medics in white, the red cross front and back, a black bag in hand. They walk to the wounded and kneel to treat — no rifle, no fight.", ["DEFEND", "MOVE", "PATROL", "TREAT THE WOUNDED", "TAKE CONTROL"], null),
  sq_mechanics: sq("mechanics", "Two mechanics with a toolbox. They kneel at broken machines and masonry — hulls, towers, walls, bags — and every point of repair is paid in scrap.", ["DEFEND", "MOVE", "PATROL", "REPAIR — PAID IN SCRAP", "TAKE CONTROL"], null),
  sq_davy: sq("davy", "Two men in orange and the smallest atomic weapon ever fielded. The blast spares nobody — outrun it or die with it. Thirty seconds to reload.", ["DEFEND", "MOVE", "ATTACK", "TAKE CONTROL"], 200),
  hero_bison: { label: "BISON", role: "The Bison. Main gun, coax, and tracks that brake for your own. Dear, and dearer to replace.",
    n: null, hp: BISON.hp, dmg: null, range: null, speed: null, skills: ORDERS_HULL },
  hero_apc:   { label: "APC", role: "The transport. Four sealed seats — riders see nothing, fire nothing, and die with the hull.",
    n: null, hp: APC.hp, dmg: null, range: null, speed: null, skills: [...ORDERS_HULL, "LOAD / UNLOAD"] },
  hero_mech: { label: "MECH", role: "The crown machine. A walking siege engine — cannon, rocket salvo, and a saturation barrage; men die under its feet. Slow, dear, and answered only by another.",
    n: null, hp: MECH.hp, dmg: null, range: null, speed: null, skills: ["DEFEND", "MOVE", "PATROL", "ESCORT", "TRACKS SAFETY", "TAKE CONTROL"] },
};
// TEACH — the teaching cards (Task 2, owner-ruled copy — do not edit a word
// without a ruling). label/role/skills is InfoCard's own contract; roleTouch
// is the phone voice where the controls differ; desktopOnly marks the one
// card phones never see. Tasks 3/4/7 serve these; nothing reads them yet.
// TEACH_REV — the teaching cards' revision stamp (the MANUAL_REV law):
// bumped when the cards change materially, the door then greets everyone
// once more. Rev 1 = Task 3, the door opens. Rev 2 = Task 4, the brief copy.
export const TEACH_REV = 2;
export const TEACH = {
  the_hand: { label: "THE HAND", role: "Seven cards dealt. Pick five, free. Units place near your depot; plans open your build bar. The enemy drafts its own five.", hint: "The first thing after TAKE COMMAND.", skills: [] },
  placing: { label: "PLACING", role: "Tap ground near the depot. ✓ fields it, ✗ puts it back. Green ground is yours to use.", hint: "Right after the draft.", skills: [] },
  scrap: { label: "SCRAP", role: "The till. One scrap a second, both sides. Kills pay more.", hint: "Top bar — the ◆ count.", skills: [] },
  bell: { label: "THE BELL", role: "Every 90 seconds: the convoy's offer. The war saves at every bell.", hint: "Top bar — the clock.", skills: [] },
  kill_price: { label: "THE SCORE", role: "Every death is priced at its live market value. Yours green, theirs red.", skills: [] },
  convoy: { label: "THE CONVOY", role: "The war waits while the window is up. Plans cost half and open the bar; hires field at once. LATER parks it until the next bell.", hint: "It rings in with every bell.", skills: [] },
  fog: { label: "SIGHT", role: "What your side can't see, you can't shoot. This switch only paints the fog.", hint: "Top bar — and the whole war.", skills: [] },
  wind: { label: "WIND", role: "One wind. Every shot drifts, both sides. OFF is dead calm.", skills: [] },
  spare_ours: { label: "SPARE OURS", role: "On: the tesla and the atomic crew hold fire while your own stand in the blast.", skills: [] },
  market: { label: "THE MARKET", role: "One market, both armies. What the field is full of costs more. One purchase a second.", hint: "Bottom bar — the BUILD crate.", skills: [] },
  sell: { label: "SELLING", role: "60 percent back. Tap SELL, then the tower or wall.", hint: "Inside the BUILD crates.", skills: [] },
  defend: { label: "DEFEND", role: "Dig in where they stand.", hint: "Tap any squad — the ring of orders.", skills: [] },
  move: { label: "MOVE", role: "Tap the ground. They walk there without picking fights.", hint: "The same ring.", skills: [] },
  attack: { label: "ATTACK", role: "Tap the ground. They fight their way there.", hint: "The same ring.", skills: [] },
  possess_squad: { label: "TAKE CONTROL", role: "WASD walks. Mouse aims; hold left to fire. RELEASE hands them back.", roleTouch: "Left stick walks. Right stick aims; hold FIRE. RELEASE hands them back.", skills: [] },
  select_all: { label: "SELECT ALL", role: "Every squad of this type joins the order.", hint: "The same ring.", skills: [] },
  patrol: { label: "PATROL", role: "Two taps: start, far end. ✓ and they walk it forever.", hint: "The same ring.", skills: [] },
  structures: { label: "STRUCTURES", role: "On: walls and towers before men.", hint: "The ring, armed squads only.", skills: [] },
  engineer_lines: { label: "THE LINES", role: "Two taps: start, far end. The ghost shows pieces and price. ✓ and they lay.", hint: "The engineers' own ring.", skills: [] },
  sapper_lines: { label: "MINES & WIRES", role: "The same two taps, buried. Invisible to the enemy — theirs to you. Wires flare; mines wait.", skills: [] },
  discipline: { label: "CAREFUL / FREE", role: "CAREFUL holds a shot that would hit your own stone. FREE fires regardless.", skills: [] },
  possess_tower: { label: "TAKE CONTROL", role: "Mouse aims; hold left to fire. Your trigger — CAREFUL does not hold it for you.", roleTouch: "Right stick aims; hold FIRE. Your trigger — CAREFUL does not hold it for you.", skills: [] },
  escort: { label: "ESCORT", role: "Tap a squad. The hull shadows it.", skills: [] },
  tracks: { label: "TRACKS", role: "CAREFUL brakes for your own men. FREE does not.", skills: [] },
  possess_vehicle: { label: "TAKE CONTROL", role: "WASD drives. Mouse aims; left fires the gun, right the coax. The APC has one gun — FIRE alone.", roleTouch: "Left stick drives; right stick aims. FIRE the gun, MG the coax. The APC has one gun — FIRE alone.", skills: [] },
  possess_mech: { label: "TAKE CONTROL", role: "WASD walks; A/D turn, hold to pivot. Mouse aims. Hold left to fire; V missiles, B barrage, C punt, T about-face.", roleTouch: "Left stick walks; right stick turns, hard over pivots. Slider sets range, ◀ ▶ trim. FIRE, MSL, BRG, PUNT.", skills: [] },
  load: { label: "LOAD", role: "LOAD: tap a squad; they board. Sealed seats — riders die with the hull. UNLOAD drops the ramp.", skills: [] },
  desktop_keys: { label: "THE KEYS", role: "WASD pans. Q/E rotate — tap snaps, hold swings. Wheel zooms. M mutes. ESC leaves.", desktopOnly: true, hint: "The keys, whenever you hold the field.", skills: [] },
};
export const cardFor = (key) => TEACH[key] || CARDS[key] || null;
```

Then `sha256sum src/modules/cards/cards.js` — must print `1e7cbfd86fe29d78c6ce1ef6bf209b60d058a1ccc0b5d6a8809c162682d09c76`.

3. Write `src/depot/cards.js`, exactly (replacing the whole file):

```js
// cards lives in its own module now; this file is the depot's unchanged
// front door — every depot import keeps working.
export * from "../modules/cards/cards.js";
```

Then `sha256sum src/depot/cards.js` — must print `2621bde15a8e22787aa89357367b468fd8739718b684f960f108a5cfc3e2de81`.

4. The gates, all four, unmoved:

```sh
node scripts/gate.mjs api | tail -1         # must print: seed 1  seconds 90 (10800 steps)  worldHash 3367709165  runHash 2717846799
node scripts/gate.mjs combat | tail -1      # must print: ALL PASS
node scripts/gate.mjs frostline | tail -1   # must print: frostline-test PASS (count line: 63 PASS / 0 FAIL)
node scripts/gate.mjs old-master | tail -1  # must print: old-master-test PASS
```

5. Close the records in this landing: bump `package.json` version to `0.0.50`; in `docs/plans/phase-0.0.50-cards.md` replace the status line with `Status: LANDED, commit stamped below, 2026-09-03. Gate: prior gates unmoved, hashes identical.`; in `docs/plans/batch-extractions-2.md` flip `- [ ] 0.0.50 cards` to `- [x] 0.0.50 cards`. No README box is earned by a carve; none is touched.

6. Commit and push the landing, then stamp the real hash in a second small commit — NEVER amend after stamping. Add the named files only:

```sh
git add src/modules/cards/cards.js src/depot/cards.js package.json docs/plans/phase-0.0.50-cards.md docs/plans/task-0.0.50-1-cards.md docs/plans/batch-extractions-2.md
git commit -m "phase 0.0.50 — cards carved out

Moved whole into its own module; the depot keeps a one-line front door. Four gates unmoved.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push origin main
H=$(git rev-parse --short HEAD)
sed -i "s/commit stamped below/commit \`$H\`/" docs/plans/phase-0.0.50-cards.md
git add docs/plans/phase-0.0.50-cards.md && git commit -m "phase 0.0.50 record stamped — $H

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push origin main
```

## Acceptance

- Step 2's and step 3's sha256 lines exactly as printed above.
- Step 4: all four gates print their tails unchanged; frostline at its own rolled seeds.
- Records flipped riding the landing; both pushes accepted.

## Report

Read-confirmation first, then one line of outcome, then bullets: the sha256 lines verbatim, the four gate tails verbatim (frostline with its seeds line), both commit hashes, the push results. Every nonconformity its own labeled bullet. Seeds: frostline rolls fresh and prints; the rest are seedless or the api gate's own fixed harness.
