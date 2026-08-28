// COLDSNAP DEPOT — Phase 0/1 specs. Tower and enemy numbers ported straight
// from src/game/ColdsnapTD.jsx (the reference implementation, left untouched).
// Waves here are flat conscript-only ramps — mixed enemy types, tanks and
// the mech boss all return in later phases.
// mg tower dirDmg is NOT dmg (5) verbatim, same reason as INFANTRY_ARMS
// rifles/mg below: a direct hit lands its full value every time, while the
// blast law it replaces averaged well under dmg per hit. Measured flagged
// (world.depotCombat=true) vs a soft fixture: dmg-equal dirDmg (5) drifted
// tower-mg DPS +45.4% over the pre-wiring baseline; rescaled to 3.4 to land
// within the +/-10% replaces-not-adds contract (measured -1.2%). See
// scripts/depot-test.mjs's towerShot DPS assert.
// SLOW FRONT C0 Task 4 (mk0.33) — ARTILLERY CADENCE HALVED, Jeff-ratified.
// Every tube on the map reloads twice as slowly: mortar fireRate 2.3 -> 4.6,
// rocket 4.4 -> 8.8, and by the symmetry law the infantry mirrors move with
// them (INFANTRY_ARMS.mortars 3.0 -> 6.0, ENEMY_FIRE.lob.cd 3.0 -> 6.0).
// Damage, blast, accuracy and wind are UNTOUCHED — only the wait between
// shells. This is a pace preview, so all four numbers stay provisional (F5).
// P1.5 Task 1 (mk0.50, Jeff) — TOWER PRICES +~50%, integers: mg 15->23,
// gun 25->38, mortar 35->53, rocket 50->75, frost 20->30. Only `cost` moved;
// range/damage/cadence/accuracy are all untouched. Enemy bounties below are
// DELIBERATELY not raised alongside these — the interim cost asymmetry is
// documented in full at SQUAD_SPECS (src/depot/squads.js) and the mercenary
// market is what repairs it. All five prices provisional (F5).
// WEAPON TAGS (P1.5 Task 3, mk0.56): every fire spec in this file carries a
// `weapon` — WHICH GUN this is, as opposed to `kind`, which is what the round
// physically is (a "shell" is fired by the gun tower, the mortar tower, the
// rocket tower, a tank and a grenadier alike, and every infantry arm is
// kind:"mg" whatever it actually is). shooterFire threads it into the
// projectile spec, core.js's fireProjectile hangs it on the muzzle event, and
// src/platform/audio.js gives each tag its own voice. Purely a sound label:
// nothing mechanical reads it, and no spec's numbers moved to add it.
// tesla carries weapon:"tesla" from mk2.15 — the tag names the voice; the
// chain itself never fires a projectile (state.js teslaStrike/stepTesla).
export const TOWER_SPECS = {
  // mk0.99 (owner's lethality ruling): 3.4 -> 8 — the MG tower rises flatter
  // than rifles; a six-round burst kills a conscript. The ±10% replaces-not-
  // adds calibration this line once carried is superseded.
  mg:     { range: 15, fireRate: 0.17, projSpeed: 95, dmg: 5, dirDmg: 8, blastR: 0.3, kv: 0.5, cost: 23, hp: 80,  crater: 0, label: "SPITTER",     icon: "⊞", kind: "mg",    weapon: "mg",     hy: 1.0, acc: 0.090, windF: 0.06, windComp: 0,   blurb: "Fast, cheap, short reach", occl: "arc" },
  gun:    { range: 19, fireRate: 1.05, projSpeed: 58, dmg: 25, blastR: 2.3, kv: 8,   cost: 38, hp: 130, crater: 0.55, label: "FIELD GUN",    icon: "⚑", kind: "shell", weapon: "shell",  hy: 1.5, acc: 0.07, windF: 0.9,  windComp: 0.6, blurb: "Flat-trajectory workhorse", occl: "auto" /* mk2.02 (owner): THE AUTOMATIC LOB — flat when the flat arc reaches, mortar root when it cannot */ },
  mortar: { range: 26, fireRate: 4.6 /* halved cadence (C0 T4) // provisional (F5) */ /* mk1.74 (owner): tightened 0.020 -> 0.005 — the lob lands where it looks */,  projSpeed: 33, dmg: 38, blastR: 3.8, kv: 10,  cost: 53, hp: 95,  crater: 0.8, label: "MORTAR", icon: "◎", kind: "shell", weapon: "mortar", hy: 0.8, acc: 0.005, windF: 0.04, windComp: 0.6, blurb: "Arcs over walls, big blast", occl: "lofted", elevCap: 85, chargeSig: 0.01 },  // mk2.56 (owner): THE TIGHTEST ARC — the tube solves charge and angle together (accuracy.js tightSolve) // provisional (F5)
  rocket: { range: 23, fireRate: 8.8 /* halved cadence (C0 T4) // provisional (F5) */,  projSpeed: 18, dmg: 27, blastR: 3.4, kv: 9,   cost: 75, hp: 110, volley: 4, crater: 0.7, label: "SALVO RACK", icon: "▲", kind: "shell", weapon: "rocket", hy: 1.2, acc: 0.021, windF: 1.3  /* lobbed retune (mk0.25): swept 0.020-0.035 vs the pinned flat baseline 2.4592, curve in the F1.5 artillery plan // provisional (F5) */, windComp: 0.5, blurb: "Four-round salvo, slow reload", occl: "arc" /* mk1.74 (owner): THE GENTLE ARC — flat solve at 18 m/s, ~22° and a 2.3m apex at full reach; terrain checks honest */, elevCap: 85, chargeSig: 0.01 },  // mk2.56 (owner): THE TIGHTEST ARC // provisional (F5)
  tesla:  { range: 16, fireRate: 5, projSpeed: 95, dmg: 35, blastR: 0, kv: 0, cost: 55, hp: 85, label: "TESLA COIL", icon: "⚡", kind: "mg", weapon: "tesla", acc: 0.02, windF: 0, windComp: 0, tesla: true, hy: 1.35, blurb: "Chain lightning arcs to everything near" }, // mk2.15 (owner): THE TESLA COIL replaces frost — key renamed, no save migration (standing orders). projSpeed is sight-math only (arcClears/effRange run the mg's flat check); no projectile ever flies.
};
export const TOWER_ORDER = ["mg", "gun", "mortar", "rocket", "tesla"];

// mk2.02: ONE BODY TABLE (owner) — every man, both sides, reads this row;
// the player's numbers seed it and every man stands 2m. Speeds/bounties
// stay per-side rows; the speed audit is the roster-mirror closing task.
export const MAN = {
  rifle: { mass: 80, hx: 0.28, hy: 1.0, hz: 0.28, hp: 58 },
};

// The zoo returns (Phase 3 Task 2) — ported straight from ColdsnapTD.jsx's
// ENEMY_SPECS (:569-574) and TANK (:836). bounty === TD's price value.
export const ENEMY_SPECS = {
  "":     { ...MAN.rifle, bounty: 4,  speed: 3.2, gain: 14, label: "conscript" },
  gren:   { ...MAN.rifle, bounty: 8,  speed: 2.6, gain: 12, label: "grenadier" },
  sapper: { ...MAN.rifle, bounty: 7,  speed: 3.8, gain: 16, label: "sapper" },
  // Their sniper (Phase 5 Task 4C): marches until VANTAGE (units.js), then
  // holds and works with INFANTRY_ARMS.sniper — one table, both sides.
  // The pair (6.5 Task 6): a marksman buy fields TWO men — sniper + spotter
  // — so bounty (the buy price ai.js spends) rises 30 -> 45, mirroring the
  // player's own 45-scrap pair. Kill payout stays symmetric: units.js splits
  // the 45 across the two bodies (30 sniper + 15 spotter) at spawn.
  // MIRROR BROKEN, INTERIM (P1.5 Task 1, mk0.50): the player's pair now costs
  // 68 and this bounty stays 45 — see the asymmetry note at SQUAD_SPECS
  // (src/depot/squads.js). Deliberate, temporary, market-repaired.
  // RE-DRESSED (C0 T4, mk0.33 — Jeff): dress "android" DELETED. They are
  // ordinary men in the enemy's cold slate coat now, not silver machines;
  // troopkit's coat-is-side rule palettes them by team with no dress field at
  // all. units.js's spotter copies dress from this same spec, so the one
  // deletion re-dresses the whole pair. Campaign androids are unaffected —
  // that dress lives on scenario bodies (src/game/scenario.js), not here.
  sniper: { ...MAN.rifle, bounty: 45, speed: 2.9, gain: 14, label: "sniper" },
  // P7.1 T6 (owner): the pick pool is the player's full list — his MG team
  // and his engineers join the roster. Bounties provisional (F5).
  mg:  { ...MAN.rifle, bounty: 8, speed: 3.2, gain: 14, label: "gunners" },
  eng: { ...MAN.rifle, bounty: 6, speed: 3.2, gain: 14, label: "engineer" },
  // P7.2 T6: his medic — the conscript frame, no weapon (units.js's medic
  // branch never fires). Bounty is the kill payout. // provisional (F5)
  medic: { ...MAN.rifle, bounty: 8, speed: 3.2, gain: 14, label: "medic" },
  // P7.2 T7: his mechanic — the conscript frame, no weapon (units.js's
  // mechanic branch never fires). Bounty is the kill payout. // provisional (F5)
  mechanic: { ...MAN.rifle, bounty: 8, speed: 3.2, gain: 14, label: "mechanic" },
  // mk2.02 (owner): the roster surgery — rocket troops replace runners,
  // the mortar team joins so the player's tube has its mirror. Dials
  // provisional (F5).
  rocket: { ...MAN.rifle, bounty: 8, speed: 3.2, gain: 16, label: "rocket team" },
  mortar: { ...MAN.rifle, bounty: 8, speed: 3.2, gain: 14, label: "mortar team" },
  // mk2.08 (owner): THE DAVY CROCKETT — the atomic crew, both sides, one
  // price. bounty equals the player's 450 so the shared market prices the
  // two sides identically. The slowest men on the map. // provisional (F5)
  davy: { ...MAN.rifle, bounty: 450, speed: 2.0, gain: 14, label: "atomic crew" },
};

// Wave armor: an engine vehicle on the engine's own tread physics (see
// src/depot/units.js's stepTank) — 3.4 tonnes with a cannon. Ported from
// ColdsnapTD.jsx :836.
export const TANK = { mass: 3400, hx: 1.5, hy: 0.8, hz: 2.4, hp: 260, bounty: 25, gunCd: 4.6, gunRange: 34, dmg: 30, blastR: 2.5 };

// P7 T2 (mk1.31): THE BISON — the starting hero tank, one parked at each
// depot at war start. ONE row, both sides — symmetry is law; the enemy's is
// this same machine (its commander arrives in Task 5). Killable and dear:
// replacement is the hero tier's business. All dials provisional (F5).
// P7 T9 (owner): cost is the HERO TIER's convoy price — the wall (market.js's
// heroBison family, K 1) plus the field wall are what make it ruinous; this
// is the base the curve multiplies. // provisional (F5)
export const BISON = { mass: 3800, hx: 2.2, hy: 0.95, hz: 3.3, hp: 420, armor: 160, bounty: 60, cost: 200 };
// The Bison's guns — every aimed shot through shooterFire like the rest of
// DEPOT. The main gun is the wave tank's round on a hero cadence; the coax
// is the mg family's stream. weapon tags are voice only.
export const BISON_FIRE = {
  gun: { projSpeed: 85, dmg: TANK.dmg, kind: "shell", weapon: "tank", blastR: TANK.blastR, kv: 8, crater: 0.5, acc: 0.070, windF: 0.9, windComp: 0.6, cd: 2.6, range: 30, occl: "auto", elevCap: 85, chargeSig: 0.01 },  // mk2.02 (owner): THE AUTOMATIC LOB — flat when the flat arc reaches, mortar root when it cannot // mk2.55 (owner): THE LOBBED SHELL — elevCap in degrees, this gun alone; the barrel rises to 85° at a fitted speed and the shell lands where the reticle stands (accuracy.js elevCapOf). The wind stays on the shell (owner, 2026-08-25): the ring shows the drift. // provisional (F5)
  mg:  { projSpeed: 100, dmg: 5, dirDmg: 8, kind: "mg", weapon: "mg", blastR: 0.3, kv: 0.5, crater: 0, acc: 0.080, burst: 6, burstGap: 0.17, cd: 1.6, range: 18, occl: "arc", windF: 0.06, windComp: 0 },  // provisional (F5)
};
// mk2.05 (owner): THE TRUE MUZZLE — the shot and the laser leave the barrel
// TIP. Numbers mirror the drawn meshes (renderer buildBison/buildWaveTank):
// pivot height over hull center, pivot forward offset, tube length. The
// Bison coax keeps its hull offset — a stub, not a tube. // provisional (F5)
export const BARRELS = {
  bison: { up: 1.47, fwd: 0.6, len: 3.6 },
  tank:  { up: 1.05, fwd: 0.5, len: 2.8 },
};

// P7 T4 (mk1.33): THE APC — the starting transport, one parked at each
// depot beside the Bison. Four seats: one squad of four or two teams of
// two. Riders are SEALED — no eyes, no fire — and die with the vehicle;
// loading is a real decision (owner). Its only gun is the coax
// (BISON_FIRE.mg — one mg table, every hull). All dials provisional (F5).
// P7 T9 (owner): cost — the hero tier's convoy price, same story as BISON.cost above. // provisional (F5)
export const APC = { mass: 2600, hx: 1.6, hy: 1.0, hz: 3.0, hp: 300, armor: 120, bounty: 45, seats: 4, cost: 140 };

// THE MECH (owner, 2026-08-20): the crown machine, both sides — the engine
// walker fielded as a hero. Dear, slow, unanswerable except by another.
export const MECH = { hp: 900, cost: 400, bounty: 120 }; // provisional (F5)

// Enemy fire specs — acc/windF/windComp EQUAL to the analogous tower (Jeff's
// decision: aim fully equal). rifle mirrors TOWER_SPECS.mg, lob mirrors
// TOWER_SPECS.mortar, tank mirrors TOWER_SPECS.gun. cd/cdVar/range are the
// TD driver's own halt-range and fire-cadence constants (ColdsnapTD.jsx
// :678-721 rifle, :723-754 grenadier, :597-615 tank gun).
// rifle dirDmg: was LEFT at 5 (dmg-equal) while riflemen only ever targeted
// structures (hitOnly: "structure" — the direct-hit component is inert
// against walls/towers, 0% drift, see the enemy-rifle-vs-wall DPS assert).
// Phase 5 Task 4A gives riflemen an anti-personnel pass (units.js's
// nearestPlayerUnit), so dirDmg now FIRES against unit bodies — measured
// flagged (world.depotCombat=true) vs a pinned soft-unit fixture (bodies
// re-pinned per tick: knockback dynamics made a free fixture chaotic):
// dmg-equal dirDmg (5) drifted DPS +7.5% over the pre-wiring blast-only
// baseline (1.9763 -> 2.1254); rescaled to 4.5 (1.9182, -2.9%) to sit
// centered in the ±10% replaces-not-adds contract, mirroring INFANTRY_ARMS'
// own rifles rescale. See depot-test.mjs's "==== TASK 4A" parity assert.
// The wall path is unaffected (dirDmg still inert there).
export const ENEMY_FIRE = {
  // mk0.99 (owner's lethality ruling): 4.5 -> 15 — symmetry holds, both
  // sides rise. The ±10% replaces-not-adds calibration above is superseded.
  rifle: { projSpeed: 70, dmg: 5, dmgHeavy: 9, dirDmg: 15, kind: "mg", weapon: "rifle", blastR: 0.6, kv: 1.0, crater: 0, acc: 0.090, windF: 0.06, windComp: 0, cd: 1.5, cdVar: 0.5, range: 13, occl: "arc" },
  // lob cd 3.0 -> 6.0 (C0 T4, mk0.33): the grenadier's tube halves its cadence
  // alongside TOWER_SPECS.mortar and INFANTRY_ARMS.mortars — symmetry is law,
  // so their lob slows exactly as much as ours. cdVar is a separate dial and
  // was not moved. // provisional (F5)
  lob:   { projSpeed: 28, dmg: 20, kind: "shell", weapon: "mortar", blastR: 2.6, kv: 6, crater: 0.45, acc: 0.005 /* mk1.74 (owner): tightened 0.020 -> 0.005 — the lob lands where it looks */, windF: 0.04, windComp: 0.6, cd: 6.0, cdVar: 0.6, range: 21, occl: "lofted", elevCap: 85, chargeSig: 0.01 },  // mk2.56 (owner): THE TIGHTEST ARC — mirrors INFANTRY_ARMS.mortars, aim fully equal // provisional (F5)
  tank:  { projSpeed: 85, dmg: TANK.dmg, kind: "shell", weapon: "tank", blastR: TANK.blastR, kv: 8, crater: 0.5, acc: 0.070, windF: 0.9, windComp: 0.6, cd: TANK.gunCd, cdVar: 1.2, range: TANK.gunRange, occl: "auto" }, // mk2.02 (owner): THE AUTOMATIC LOB — flat when the flat arc reaches, mortar root when it cannot
};

// The 50-row WAVES table is DELETED (P1 Task 1, mk0.40). Nothing composes an
// assault from a table any more: ai.js's planWave is the only composer, sized
// by the bell index and rostered by state.js's enemyTierState tier caps.

// ------------------------------------------------------------ THE TWO LADDERS
// P1 Task 2 (mk0.41). Both sides climb the SAME bells (state.js's TIER_BELLS,
// [1, 3, 5]) — the symmetry is the design, so the two columns are written here
// together where a reader can check one against the other:
//
//              PLAYER (build-menu keys)                    ENEMY (ENEMY_SPECS tags)
//   START      sq_rifles · sq_engineers                    "" conscripts (never gated)
//   TIER 1     mg · sq_mg · frost · sq_rockets · sq_grenadiers   rocket · gren
//   TIER 2     gun · sq_sniper · sq_mortars                mortar · sapper
//   TIER 3     mortar · rocket · sq_sappers                sniper (marksman) · tank
//   TIER 4     hero_bison · hero_apc                       hero_bison · hero_apc (P7 T9, bell 10 — the hero tier)
//
// The enemy column is a READING of state.js's ENEMY_TIERS, not a second copy:
// the live gate stays where Task 1 put it and nothing here is consulted for
// enemy composition. Only the player column is data.
//
// Keys are DepotGame.jsx's palette mode keys exactly — bare keys are
// TOWER_SPECS types, sq_* are squad placement modes (SQUAD_SPECS types with
// the sq_ prefix the MG TOWER/MG TEAM name collision forced) — so the build
// menu's unlocked filter is a plain membership test with no translation table
// in between. // provisional (F5)
// P1.5 Task 4 (mk0.60): the ENGINEER TEAM joins the starting kit — every match
// now opens with rifles AND engineers, so the two-point build order is on the
// bar from bell 0 and never has to be won off the convoy. The enemy column is
// untouched: engineers build, they do not fight, so nothing on the other side
// mirrors them (the sapper split is the "Engineers & Arms" phase's business).
export const PLAYER_START = []; // P7.2 T3 (owner): THE BAR STARTS EMPTY — the free starting plans die; every build option is bought off the hand. Supersedes the mk0.60/mk1.12 starting kit.
export const PLAYER_TIERS = [
  // P7 T7 (mk1.36, owner): the tier-1 mirror closes — sq_rockets and
  // sq_grenadiers join mg/sq_mg/frost, matching the enemy's own rocket/gren.
  // P7.2 T6: the medic's price-family seat — rows gate nothing since T2
  ["mg", "sq_mg", "tesla", "sq_rockets", "sq_grenadiers", "sq_medics"],
  ["gun", "sq_sniper", "sq_mortars"],
  // P7.2 T7: the mechanic's price-family seat — the ruled tier-3 row
  ["mortar", "rocket", "sq_sappers", "sq_mechanics"],
  // P7 T9 (owner): THE HERO TIER — bell 10, replacement armor off the
  // convoy at a ruinous, market-walled price.
  ["hero_bison", "hero_apc", "sq_davy"],
];

// P7.2 T2 (owner): THE HAND IS UNGATED — the full fifteen, one table, from
// bell one; price and the market wall do all the refusing. The tier ladders
// above stop gating offers (they remain as rows and price families).
export const HAND_KEYS = ["mg", "gun", "mortar", "rocket", "tesla", "sq_sniper", "sq_rifles", "sq_mg", "sq_sappers", "sq_mortars", "sq_engineers", "sq_rockets", "sq_grenadiers", "sq_medics", "sq_mechanics", "sq_davy", "hero_bison", "hero_apc", "hero_mech"];

// P7.2 T4: the key -> enemy-tag map for HIS side of the hand. Tower keys
// are deliberately absent — a tower is not a wave tag: his tower plans
// ROUTE to S.foe.towers (the plans ledger he builds from), full symmetry.
export const HAND_TAGS = { sq_rifles: "", sq_rockets: "rocket", sq_grenadiers: "gren", sq_sappers: "sapper", sq_mortars: "mortar", sq_sniper: "sniper", sq_mg: "mg", sq_engineers: "eng", sq_medics: "medic", sq_mechanics: "mechanic", sq_davy: "davy", hero_bison: "hero_bison", hero_apc: "hero_apc", hero_mech: "hero_mech" };

export const MASON = { hcs: 0.40, pitch: 0.83, mass: 100, breakF: 8.0e4 };

// FRONT F1 Task 4.5 — THE satchel charge, one spec for both sides (the enemy
// sapper's stepSapper and the player sapper squad detonate this exact object;
// symmetry is law). Raised from {r:3.4, kv:9} by Jeff's decision 2026-08-11:
// the old charge peaked at 89,268 force vs the depot's 120,000 joint strength
// — sappers could never breach a depot. Tuned by measurement (see
// scripts/measure-satchel.mjs for the full {r,kv} curve): {r:5, kv:30} is the
// knee. Measured THROUGH PLAY (real squads walking in, wasting charges on
// scattered rubble like real sappers do): kv 30 -> 56 teams, kv 38 -> 18,
// kv 42 -> 17, kv 45 -> 9, kv 60 -> 10 (rubble-waste plateau). kv 45 is the
// smallest charge that breaches with a single-digit team count from the real
// plant distance (hx + 1.3). dmg/crater unchanged from the old charge.
// SIEGE FIX (mk0.21) — Jeff 2026-08-11 directive 1: the charge is DOUBLED.
// Force AND damage double (kv 45 -> 90, dmg 150 -> 300); the radius is a
// separate dial he did not move, so r stays 5. Known consequences, measured
// and reported rather than tuned around: the mk0.17 satchel-vs-wall band
// moves (walls have hp — 150 already one-shot a 100hp wall, 300 merely
// one-shots it harder); the infantry lethal radius grows; and the ENEMY
// sapper carries this same doubled charge against the player's depot and
// walls (symmetry is the law). Depot stones have NO hp at all — displacement
// past DEPOT_STANDING_TOL and weld-breaking (120,000 at a depot) is the only
// demolition currency there, which is what kv buys.
export const SATCHEL = { r: 5, kv: 90, dmg: 300, crater: 0.6, hitStruct: true }; // provisional (F5)

// SIEGE FIX (mk0.21) — Jeff's directive 4: get as close as possible before
// planting. The plant gate was arm's length (chunk hx + 1.3); this is CONTACT
// range, and it is the tightest value the player sapper can physically reach:
// squads.js hands every member a clearSlot-vetted goal, and clearSlot rejects
// any point within (stone hx + member hx 0.28 + SLOT_CLEAR_PAD 0.35) of a
// solid — so hx + 0.63 is the closest a man's CENTER can be legally parked,
// and seekGoal settles within 0.15 of that goal. hx + 0.7 is that floor plus
// a hair of settle margin. The enemy sapper (flow-field driven, no slot
// vetting) can and does close further; he shares the constant so the trigger
// is identical on both signs. Closer plant = more of the blast's force lands
// on the stone, which is the physics reason the old 1.3 under-delivered.
export const SAPPER_PLANT_PAD = 0.7;

// Infantry arms — both teams use identical values (symmetry). All fire flows
// through shooterFire + the accuracy model; occl/windF/windComp like any shooter.
export const INFANTRY_ARMS = {
  sniper: { projSpeed: 120, kind: "mg", weapon: "sniper", dmg: 65, dirDmg: 130, fireRate: 4.5, range: 30,
            acc: 0.006, occl: "arc", windF: 0.10, windComp: 0.8 },
  // rifles/mg dirDmg is NOT dmg (5) verbatim: a direct hit always lands its
  // full value (only obliquity-scaled), while the old blast-only law it
  // replaces averaged well under dmg per hit (explode()'s distance falloff
  // across the burst). Measured flagged (world.depotCombat=true) vs a soft
  // fixture: dmg-equal dirDmg (5) drifted DPS +22.6%/+37.1% (rifles/mg) over
  // the pre-wiring baseline — dirDmg scaled down here (4.1/3.6) to bring
  // flagged DPS back within the ±10% replaces-not-adds contract (measured
  // +0.5%/-1.2%). See scripts/depot-test.mjs's squadFire DPS assert.
  // mk0.99 (owner's lethality ruling): 4.1 -> 15 — rifles kill now; the
  // ±10% replaces-not-adds calibration above is superseded.
  rifles: { projSpeed: 90, kind: "mg", weapon: "rifle", dmg: 5, dirDmg: 15, fireRate: 1.3, range: 15,
            acc: 0.090, occl: "arc", windF: 0.06, windComp: 0.6 },
  // mk0.99 (owner's lethality ruling): 3.6 -> 8 — the MG family rises
  // flatter than rifles; a six-round burst kills roughly one conscript.
  mg:     { projSpeed: 100, kind: "mg", weapon: "mg", dmg: 5, dirDmg: 8, burst: 6, burstGap: 0.17, fireRate: 2.2,
            range: 17, acc: 0.070, occl: "arc", windF: 0.06, windComp: 0.6 },
  // F1.5 Task 1: the tube comes off the tower — the player mirror of the
  // enemy grenadier's lob (ENEMY_FIRE.lob values verbatim, aim fully equal
  // per the standing law). dirDmg none: shells are blast weapons. cd ->
  // fireRate (squadFire's cooldown field), so it tracks ENEMY_FIRE.lob.cd
  // one-for-one: 3.0 -> 6.0 with the C0 T4 cadence halving. // provisional (F5)
  mortars: { projSpeed: 28, kind: "shell", weapon: "mortar", dmg: 20, blastR: 2.6, kv: 6, crater: 0.45,
             fireRate: 6.0, range: 21, acc: 0.005 /* mk1.74 (owner): tightened 0.020 -> 0.005 — the lob lands where it looks */, occl: "lofted", windF: 0.04, windComp: 0.6, elevCap: 85, chargeSig: 0.01 },  // mk2.56 (owner): THE TIGHTEST ARC // provisional (F5)
  // mk2.02 (owner): THE SHOULDER ROCKET — rocket troops replace runners,
  // both sides, one row. The tower rocket's round on infantry legs. // provisional (F5)
  rockets: { projSpeed: 18, kind: "shell", weapon: "rocket", dmg: 27, blastR: 3.4, kv: 9, crater: 0.7,
             fireRate: 8.8, range: 18, acc: 0.021, occl: "arc", windF: 1.3, windComp: 0.5, elevCap: 85, chargeSig: 0.01 },  // mk2.56 (owner): THE TIGHTEST ARC // provisional (F5)
  // mk2.03: thrown — see GRENADE; projectile fields below are dead weight
  // kept for the pie/reach displays.
  grenadiers: { projSpeed: 20, kind: "shell", weapon: "mortar", dmg: 16, blastR: 2.0, kv: 5, crater: 0.3,
                fireRate: 3.2, range: 12, acc: 0.010, occl: "lofted", windF: 0.03, windComp: 0.6, thrown: true },
};

// mk2.03 (owner): THE GRENADE — one body, both sides. Fuse 2.0s from
// release. // provisional (F5)
export const GRENADE = { v: 11, fuse: 2.0, r: 2.0, dmg: 16, kv: 5, crater: 0.3, mass: 0.4, hx: 0.09, hy: 0.09, hz: 0.09 };

// mk2.08 (owner): THE DAVY CROCKETT'S ROUND — one table, both sides. The
// biggest blast in the game; crater 10 carves the ruled bowl (10 deep,
// shallow rise to the blast's edge — the engine's standard carve shape).
// mk2.12 (owner): the trigger no longer kills — the blast alone rules, and
// a surviving crew reloads reloadS seconds, both sides. // provisional (F5)
export const DAVY_FIRE = { projSpeed: 28, kind: "shell", weapon: "davy", dmg: 200, blastR: 25, kv: 40, crater: 10, range: 20, acc: 0.005, occl: "lofted", windF: 0.04, windComp: 0.6, reloadS: 30 };
