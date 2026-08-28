// COLDSNAP DEPOT — api.js: the war engine's one surface (war-engine-extraction
// task 0, mk2.69). A game imports from this file and from engine/index.js
// only, never from DepotGame.jsx. Five parts, in order: shapes, the roster
// contract, the map adapter (deleted at step 2), the surface, the command
// line. The typedefs are the declared form of objects the tree builds today;
// each field list is derived from the constructors plus every field
// assignment in src/ — a mismatch either way is a finding against this file.

import { worldHash } from "../engine/core.js";
import { serializeFront } from "./save.js";
import { bootWar } from "./boot.js";
import { tickWar } from "./tick.js";
export { bootWar, tickWar };

// The graphics surface (graphics-engine T2, mk2.81): the war game's one
// drawing door. A game imports makeRenderer and renderPortrait from THIS
// file; src/graphics is the war's own engine (forked from src/render at
// mk2.75), and src/render belongs to the old screens alone.
import { makeRenderer } from "../graphics/renderer.js";
import { renderPortrait } from "../graphics/portrait.js";
export { makeRenderer, renderPortrait };

// The sound surface (the sound door, mk2.83, owner's ruling: door only,
// no fork): the war game's audio comes through THIS file. The engine
// itself stays src/platform/audio.js, shared with every other screen.
import { makeGameAudio } from "../platform/audio.js";
export { makeGameAudio };

// The storage surface (the storage door, mk2.85): the war game's
// persistence comes through THIS file. The store itself stays the
// platform shim (artifact runtime first, localStorage behind it).
export { storage } from "../platform/storage.js";

// ============================================================ part 1: shapes
// JSDoc only — nothing in this part runs.

/**
 * @typedef {Object} Field — the heightfield (engine/core.js makeField).
 * @property {number} n            grid points per side
 * @property {number} cs           cell size, meters
 * @property {Float32Array} h      heights, n*n, row-major
 * @property {number} half         half the world extent, meters
 * @property {number} carveFloor   lowest height carve() may cut to (the war dials this to -12)
 * @property {boolean} dirty       set by carve/terrain writes; the renderer clears it
 * @property {function(number,number):number} idx        (i, j) -> flat index
 * @property {function(number,number):number} heightAt   bilinear height at world (x, z)
 * @property {function(number,number,Object):Object} normalAt   surface normal at (x, z) into out
 * @property {function(number,number,number,number):void} carve  crater at (x, z, radius, depth)
 */

/**
 * @typedef {Object} Body — one physics body (engine/core.js makeBody).
 * Core fields, present on every body:
 * @property {number} id           module-global counter — NEVER stable across worlds or saves
 * @property {number} seq          world-local counter — the deterministic tiebreaker
 * @property {string} kind         "unit"|"vehicle"|"tower"|"wall"|"chunk"|"rock"|"tree"|"flag"|"grenade"|"wreck"|"truck"|"ice"|"anchor"|"mech"|"mechlink"|"mechfoot"|"prop"
 * @property {number} team         0 neutral, 1 player, 2 enemy
 * @property {string} tag          game roster tag (ENEMY_SPECS key on enemy infantry)
 * @property {number} hx @property {number} hy @property {number} hz   half extents
 * @property {number} mass @property {number} invM
 * @property {Object} invIb        inverse body-space inertia diag {x,y,z}
 * @property {Object} pos {x,y,z} @property {Object} q {x,y,z,w}
 * @property {Object} v {x,y,z} @property {Object} w {x,y,z}
 * @property {Float32Array} R      3x3 rotation, column-major body axes
 * @property {Float32Array} invIw  3x3 world-space inverse inertia
 * @property {number} hp @property {boolean} alive
 * @property {boolean} sleeping @property {number} sleepT
 * @property {boolean} grounded @property {number} airT @property {number} subT @property {number} flipT
 * @property {?Object} lastImp     {src, attacker, t, volley}
 * @property {number} lastPlayerTouch
 * @property {number} fallingSince chunks: weld broken and moving
 * @property {?string} driver @property {string} group
 * @property {number} friction @property {number} restitution
 * @property {?Object} home        census stamp — where the stone was built (save-critical)
 * @property {boolean} _filed @property {?Array} _cells   broadphase books — never saved
 * Engine-set during stepping (all optional): groundedNow, bodyGroundedNow,
 * bodyGroundedLast, deadT, vy0, gndT, hitT, buriedNow, buriedBy, buryT,
 * swimT, onBody, ctl, goal, recoverT, recoverR4, recoverN, wph, pinned.
 * Game-assigned (all optional; the depot layer hangs these):
 * maxHp, bounty, utype, vtype, towerType, discipline, effRange, targetId,
 * tgtId, scanCd, fireCd, flashT, dmgT, armor, smearStyle, dress, role,
 * pairId, settled, hold, brave, squadId, squad, drv, depotDrive, driverSpec,
 * order, dest, escortId, tracks, homeX, homeZ, committed, apcSeq, riding,
 * rideApc, ferry, gunT, mgT, grenCd, _aimYaw, _aimPitch, _fuse, _standPt,
 * _spotPt, _coverHit, _coverT, _paceHit, _paceHitT, _effR, _route,
 * _routeDest, _routeD, _routeT, _avoid, _stuckN, _pp, _ppT, _backT, _brakeT,
 * _noRoute, _mHead, _yield, _yieldHome, _detourHx, _detourHz, _detourT,
 * _detourSide, _slotGoal, _tending, _repairCredit, _kneltOnce, kneel,
 * _davyReadyAt, _davyScanCd, _post, _huntHit, _huntPt, _huntT, lostT,
 * frostMul, frosted, hold, garrison, course, orient, seatY, capTop, town,
 * gpos, bornT, tint, rockRef, sandbag, bagSide, flagPole, _dieT, _hatch,
 * _unloadT, grenade, mechRef, visTag, burning, bossHp, coverT, coverX,
 * coverZ, coverIn, gT, _fGrace, hitT, ruined, _patA, _patB.
 */

/**
 * @typedef {Object} World — the sim world (engine/core.js makeWorld).
 * Core fields: t, dt, gravity, field (Field), water, bodies (Body[]),
 * byId (Map id->Body), welds, projectiles, events, rng (mulberry32),
 * warm, contacts, control, bisonId, volleySeq, killCount, seq, ach.
 * Engine-internal (optional): weldsOf, _weldPairs, _weldPairsDirty, _bp,
 * _bpEpoch, _trc, strikeAt, scare, threat, ice, iceFractureOn, mechs,
 * mechStep (READ BY CORE — the mech island hook), _mechPairs (READ BY CORE),
 * pg, dbgUnit, dbg.
 * Game-assigned (optional):
 * @property {boolean} [depotCombat]  READ BY CORE — gates every depot combat divergence
 * @property {boolean} [_tdStruct]    READ BY CORE — blasts damage structures
 * @property {?Object} [wind]         READ BY CORE — {x, z, mag}, projectile drift
 * @property {function} [pondAt] @property {function} [inRim] @property {function} [streamAt]
 * @property {?Object} [_mech]        the repair books — {take(team, n) -> boolean}
 * @property {boolean} [_devDummies]  sandbox fight switch
 * @property {?Object} [_holdArea]    {1: boolean, 2: boolean} — area-weapon hold
 * @property {?Object} [_L]           typed body pools (lists.js) or null
 * @property {?Array}  [_grenades]    live thrown grenades (state.js)
 */

/**
 * @typedef {Object} GameMap — the map frame, one object (makeMap's return —
 * mapgen.js builds and asserts it). Keys keep the mapgen.js export names so the step-2 substitution
 * is a pure prefix (TOWN -> map.TOWN).
 * Constants: GRID_CS, GRID_W, GRID_H, GRID_OX, GRID_OZ, RIM_HALF_U,
 * RIM_HALF_V. Drawn state: ORIENT, OBJ_POS, SPAWN_POINTS, PONDS, ROCKS,
 * TOWN, ROADS, PASSES, BANDS, MAP_SEED, SPAWN_U, STREAM (null with the
 * stream off), HILLS, CLUSTERS. Functions over the live map: fwdU, invW,
 * fwdDir, clampToRim, pondAt, rockAt, streamAt, stoneCount. Builders
 * (makeMap, buildDepotTerrain, makeGrid, planTrees, computeFlowField,
 * layDressing) stay out — they are mapgen.js's own exports.
 */

/**
 * @typedef {Object} Grid — the movement/build grid (mapgen.js makeGrid).
 * @property {Array} cells   per-cell: {blocked, terrain, ice, water, dx, dz,
 *   dist, wallId, building, bTeam, steep, drop, bag, bagId}
 * @property {number} w @property {number} h @property {number} cs
 * @property {number} ox @property {number} oz
 * @property {function} idx @property {function} worldToGrid
 * @property {function} gridToWorld @property {function} inBounds
 * @property {function} cellAt
 */

/**
 * @typedef {Object} Territory — who holds the ground (territory.js), plus
 * the sight maps the game hangs on it.
 * @property {number} cs @property {number} nx @property {number} nz
 * @property {number} halfU @property {number} halfV
 * @property {Float32Array} v      -1 (enemy) .. +1 (player)
 * @property {Object} [sight]      sight.js makeSight: {nx, nz, cs, halfU,
 *   halfV, seen1, seen2, gnd, occ} — derived, never saved
 */

/**
 * @typedef {Object} Run — the sim's run state: exactly the S. fields
 * save.js reads or writes (serializeFront + the restore path). Nothing else.
 * @property {number} resources @property {number} spawnRR
 * @property {Object} score        {p: {kills, value}, e: {kills, value}}
 * @property {number} bell
 * @property {boolean} started @property {?string} mode
 * @property {number} sandbagOrient @property {?string} cmdr
 * @property {number} nextSquadId @property {number} zoom
 * @property {Object} focus        {x, y, z}
 * @property {number} depotCensusAcc
 * @property {number} depotStanding @property {number} enemyStanding
 * @property {number} starvedStreak
 * @property {boolean} _reportedBreak @property {boolean} _reportedSpent
 * @property {Object} manifest     the convoy ladder — saved WHOLE, its
 *   presentation fields (cardUp, armedAt, armedAtWall) included; the
 *   byte-equality law forbids cleaning them out
 * @property {Object} foe          {unlocked, hired, towers}
 * @property {boolean} intelUp @property {number} intelArmedAt
 * @property {?Object} lastDispatch @property {?Object} pendingPlan
 * @property {?Object} intelPlan
 * @property {Object} ws           the assault ledger (makeAssaultState)
 * @property {Object} reg          the regiment (makeRegiment)
 * @property {Array} mines         watched points {x, z, team, kind, live}
 * @property {Array} fog           poison patches {x, z, r, until}
 * @property {Array} arcs          live tesla chains
 * @property {Object} holdArea     {1: boolean, 2: boolean}
 * @property {Array} squads @property {Array} foeSquads
 */

/**
 * @typedef {Object} War — one running war.
 * @property {GameMap} map @property {Field} field @property {Grid} grid
 * @property {World} world @property {Territory} T
 * @property {Array} town          buildTown's bookkeeping rows
 * @property {Run} run
 * @property {Array} census        the player depot's stone census (censusDepotChunks)
 * @property {Array} census2       the enemy depot's census
 * @property {Object} seq          never saved — {apc: number}, the armored-carrier seat counter
 * @property {Object} clock        never saved — holds the territory accumulator (terrAcc) and
 *   the structure-damage snapshot (_structHp, a Map)
 * @property {Array} rocksLive     the live ridge list; regrown on boot, culled on breach
 * @property {boolean} dev         sandbox mode, never saved
 */

/**
 * @typedef {Object} TickFlags — what the sim changed this tick that the
 * renderer must be told about; one boolean per renderer call that lives in
 * the sim slice today. Final list derives at step 5's dispatch (ruling,
 * 2026-08-27); this is the starting set.
 * @property {boolean} territory   territory/sight stepped — R.updateTerritory
 * @property {boolean} mines       device laid or fired — R.setMines
 * @property {boolean} townFlags   holder flags changed — R.setTownFlags
 * @property {boolean} orderPaths  ordered routes changed — R.overlay.setOrderPaths
 * @property {boolean} dressing    a rock breached or the ground re-carved — R.setDressing
 * @property {boolean} bell        the bell rang this call
 * @property {boolean} withdrew    a spent assault broke contact this call
 * @property {boolean} teslaFired  a possessed tower's tesla trigger fired this call
 */

/**
 * @typedef {Object} TickInput — the per-tick command object (ruling,
 * 2026-08-27): every field the sim reads each tick that save.js never
 * touches. Built fresh by the component each frame; a headless caller
 * passes defaultTickInput(). Derived from what stepDepot and the frame
 * loop's trigger blocks read.
 * @property {?Object} possess       {kind: "squad"|"tower"|"vehicle"|"mech", id} or null
 * @property {?Object} possessInput  {vx, vz} world-space stick, or null
 * @property {?Object} reticle       {x, z, y?} the derived aim point, or null
 * @property {?number} reticleLockId sticky-lock body id, or null — view-side at the T3 split; the sim never reads it
 * @property {boolean} fireHeld @property {boolean} mgHeld
 * @property {?Object} mechWant      {msl, brg, punt, face} one-shot wants, or null
 * @property {boolean} devDummies    sandbox fight switch
 * @property {boolean} windOn        wind toggle (localStorage-persisted, never saved)
 * @property {string}  discipline    "careful"|"free" — the global fallback stepTowers reads
 * @property {function():void} releasePossession
 * @property {?function(Object):void} stepBuildLine      the player build-line driver, or null
 * @property {?function(Object):void} stepFoeBuildLine   the enemy build-line driver, or null
 * @property {?function(Object,number):void} feedMech    per-tick callback (mech, dt) => void
 *   the component installs to feed the possessed walker's controls, or null
 * @property {?Object} bellCtx      the bell's side-effect context (cue/toast/townUV/...), or null —
 *   headless callers pass null and tickWar builds a silent one from the war itself
 */

/**
 * @typedef {Object} Specs — the roster module's export surface: the 21
 * names SPECS_CONTRACT lists. Game #2 supplies its own module with the
 * same names passing assertSpecs.
 */

// ================================================== part 2: roster contract
// One entry per name specs.js exports. Forms: "table" (an object of rows,
// every row carries every listed key), "object" (carries every listed key),
// "array", "number". The key lists are the MINIMUM shape — the keys present
// on every row today; step 7 narrows them to the keys consumers read.
export const SPECS_CONTRACT = {
  TOWER_SPECS: { form: "table", keys: ["range", "fireRate", "projSpeed", "dmg", "blastR", "kv", "cost", "hp", "label", "icon", "kind", "weapon", "hy", "acc", "windF", "windComp", "blurb"] },
  TOWER_ORDER: { form: "array" },
  MAN: { form: "table", keys: ["mass", "hx", "hy", "hz", "hp"] },
  ENEMY_SPECS: { form: "table", keys: ["mass", "hx", "hy", "hz", "hp", "bounty", "speed", "gain", "label"] },
  TANK: { form: "object", keys: ["mass", "hx", "hy", "hz", "hp", "bounty", "gunCd", "gunRange", "dmg", "blastR"] },
  BISON: { form: "object", keys: ["mass", "hx", "hy", "hz", "hp", "armor", "bounty", "cost"] },
  BISON_FIRE: { form: "table", keys: ["projSpeed", "dmg", "kind", "weapon", "blastR", "kv", "crater", "acc", "windF", "windComp", "cd", "range", "occl"] },
  BARRELS: { form: "table", keys: ["up", "fwd", "len"] },
  APC: { form: "object", keys: ["mass", "hx", "hy", "hz", "hp", "armor", "bounty", "seats", "cost"] },
  MECH: { form: "object", keys: ["hp", "cost", "bounty"] },
  ENEMY_FIRE: { form: "table", keys: ["projSpeed", "dmg", "kind", "weapon", "blastR", "kv", "crater", "acc", "windF", "windComp", "cd", "cdVar", "range", "occl"] },
  PLAYER_START: { form: "array" },
  PLAYER_TIERS: { form: "array" },
  HAND_KEYS: { form: "array" },
  HAND_TAGS: { form: "object", keys: [] },
  MASON: { form: "object", keys: ["hcs", "pitch", "mass", "breakF"] },
  SATCHEL: { form: "object", keys: ["r", "kv", "dmg", "crater", "hitStruct"] },
  SAPPER_PLANT_PAD: { form: "number" },
  INFANTRY_ARMS: { form: "table", keys: ["projSpeed", "kind", "weapon", "dmg", "fireRate", "range", "acc", "occl", "windF", "windComp"] },
  GRENADE: { form: "object", keys: ["v", "fuse", "r", "dmg", "kv", "crater", "mass", "hx", "hy", "hz"] },
  DAVY_FIRE: { form: "object", keys: ["projSpeed", "kind", "weapon", "dmg", "blastR", "kv", "crater", "range", "acc", "occl", "windF", "windComp", "reloadS"] },
};

// checkSpecs(specs) -> problem strings, empty when clean. Pure.
export function checkSpecs(specs) {
  const problems = [];
  for (const name in SPECS_CONTRACT) {
    const contract = SPECS_CONTRACT[name];
    const value = specs[name];
    if (value == null) { problems.push(name + ": missing"); continue; }
    if (contract.form === "number") {
      if (typeof value !== "number") problems.push(name + ": not a number");
      continue;
    }
    if (contract.form === "array") {
      if (!Array.isArray(value)) problems.push(name + ": not an array");
      continue;
    }
    if (Array.isArray(value) || typeof value !== "object") {
      problems.push(name + ": not an object (" + contract.form + " expected)");
      continue;
    }
    if (contract.form === "object") {
      for (const key of contract.keys) if (!(key in value)) problems.push(name + "." + key + ": missing");
      continue;
    }
    const rows = Object.keys(value);
    if (rows.length === 0) problems.push(name + ": empty table");
    for (const row of rows) {
      for (const key of contract.keys) {
        if (!(key in value[row])) problems.push(name + "." + row + "." + key + ": missing");
      }
    }
  }
  return problems;
}

// assertSpecs(specs) -> specs, or throws with every problem at once.
export function assertSpecs(specs) {
  const problems = checkSpecs(specs);
  if (problems.length) throw new Error("assertSpecs: " + problems.join("; "));
  return specs;
}

// ========================================================= part 4: surface
// Each body is one throw naming the plan step that fills it. The fill rule:
// when a step lands, replace the throw with an import from the new module
// and delete the step note.

/**
 * Serialize the war's run state — the same context the component's save
 * built, byte-equal to save.js's serializeFront by construction (this is
 * a pure argument mapping; serializeFront is untouched).
 * THE ONE DRAW: exactly one world.rng draw per call, unconditional — the
 * save law (save.js law 2). The caller saves the returned string or
 * discards it; the draw happened either way.
 * @param {War} war @param {Object} [opts] {smears} — the renderer's smear
 * ledger (R._splat.log); a headless caller has none and passes nothing.
 * @returns {string}
 */
export function serializeRun(war, opts = {}) {
  const rngSeed = Math.floor(war.world.rng() * 4294967296);
  return serializeFront({
    S: war.run, world: war.world, T: war.T, town: war.town,
    census: war.census, census2: war.census2,
    rocks: war.map.ROCKS, smears: opts.smears || [],
    mapSeed: war.map.MAP_SEED, rngSeed,
  });
}

// defaultTickInput(): the headless caller's no-command tick.
export function defaultTickInput() {
  return {
    possess: null, possessInput: null, reticle: null, reticleLockId: null,
    fireHeld: false, mgHeld: false, mechWant: null,
    devDummies: false, windOn: true, discipline: "careful",
    releasePossession: () => {}, stepBuildLine: null, stepFoeBuildLine: null,
    feedMech: null, bellCtx: null,
  };
}

// stableStringify: JSON with object keys sorted at every depth, so runHash
// is stable against insertion order. undefined serializes as null.
export function stableStringify(value) {
  if (value === undefined) return "null";
  if (value === null || typeof value !== "object") return String(JSON.stringify(value));
  if (Array.isArray(value)) return "[" + value.map(stableStringify).join(",") + "]";
  const keys = Object.keys(value).sort();
  return "{" + keys.map((key) => JSON.stringify(key) + ":" + stableStringify(value[key])).join(",") + "}";
}

// runHash: a stable-key JSON hash of war.run — worldHash's own arithmetic
// over the serialized run.
export function runHash(run) {
  const text = stableStringify(run);
  let hash = 7;
  for (let i = 0; i < text.length; i++) hash = (Math.imul(hash, 31) + text.charCodeAt(i)) | 0;
  return hash >>> 0;
}

// ================================================ part 5: command-line entry
// importManifest(source): the names a file imports from engine/*.js,
// render/renderer.js, and depot/api.js. Handles named, aliased, namespace,
// default, and multi-line imports; aliases report the EXPORTED name.
const MANIFEST_TRACKED = [
  /engine\/[A-Za-z0-9_-]+\.js$/,
  /render\/renderer\.js$/,
  /graphics\/[A-Za-z0-9_-]+\.js$/,
  /depot\/api\.js$/,
  /^\.\/api\.js$/,
];
export function importManifest(source) {
  const out = {};
  const importRe = /import\s+([^'"]+?)\s+from\s+["']([^"']+)["']/g;
  let match;
  while ((match = importRe.exec(source))) {
    const specifier = match[2];
    if (!MANIFEST_TRACKED.some((re) => re.test(specifier))) continue;
    const clause = match[1].trim();
    const names = [];
    const star = clause.match(/\*\s+as\s+([A-Za-z0-9_$]+)/);
    if (star) names.push("* as " + star[1]);
    const braces = clause.match(/\{([\s\S]*?)\}/);
    if (braces) {
      for (const part of braces[1].split(",")) {
        const name = part.trim().replace(/\s+as\s+[\s\S]*$/, "");
        if (name) names.push(name);
      }
    }
    const head = clause.replace(/\{[\s\S]*?\}/, "").replace(/\*\s+as\s+[A-Za-z0-9_$]+/, "").split(",")[0].trim();
    if (head) names.push("default as " + head);
    const key = specifier.replace(/^[./]+/, "");
    out[key] = [...new Set([...(out[key] || []), ...names])].sort();
  }
  return out;
}

function usage() {
  console.error(
    "usage: node src/depot/api.js gate [seed=1] [seconds=90]\n" +
    "       node src/depot/api.js manifest [--write out.json] <file...>");
}

async function main() {
  const [command, ...rest] = process.argv.slice(2);
  if (command === "gate") {
    const seed = rest[0] != null ? parseInt(rest[0], 10) : 1;
    const seconds = rest[1] != null ? parseInt(rest[1], 10) : 90;
    const STEP = 1 / 120, steps = Math.round(seconds * 120);
    let war;
    try {
      war = bootWar({ seed });
    } catch (error) {
      console.error(String(error && error.message ? error.message : error));
      process.exit(1);
    }
    const input = defaultTickInput();
    for (let i = 0; i < steps; i++) tickWar(war, STEP, input);
    console.log(
      "seed " + seed + "  seconds " + seconds + " (" + steps + " steps)" +
      "  worldHash " + worldHash(war.world) + "  runHash " + runHash(war.run));
    return;
  }
  if (command === "manifest") {
    const { readFileSync, writeFileSync } = await import("node:fs");
    let outPath = null;
    const files = [];
    for (let i = 0; i < rest.length; i++) {
      if (rest[i] === "--write") { outPath = rest[++i]; continue; }
      files.push(rest[i]);
    }
    if (!files.length || (outPath === undefined)) { usage(); process.exit(2); }
    const all = {};
    for (const file of files) all[file] = importManifest(readFileSync(file, "utf8"));
    const json = JSON.stringify(all, null, 2) + "\n";
    if (outPath) { writeFileSync(outPath, json); console.log("wrote " + outPath); }
    else process.stdout.write(json);
    return;
  }
  usage();
  process.exit(2);
}

// main() runs only when this file is the entry point. No top-level await and
// no node: import up here — a browser bundle must transpile this file clean
// (the sim-lift build finding); the node:fs import stays dynamic inside main().
function runningAsEntry() {
  if (typeof process === "undefined" || !process.versions || !process.versions.node || !process.argv[1]) return false;
  const here = decodeURIComponent(import.meta.url.replace(/^file:\/\//, ""));
  const arg = process.argv[1];
  const argAbs = arg.startsWith("/") ? arg : process.cwd() + "/" + arg;
  return here === argAbs;
}
if (runningAsEntry()) main();
