// games/frostline/mission.js — a mission is data; booting one is three
// engine calls. The dev boot fields no army, rings no bell, counts no
// census; the mission places its own forces and the fight runs on the
// sim's unchanged laws. FROSTLINE owns win and loss.
import { bootWar } from "../../depot/api.js";
import { makeSquad } from "../../depot/squads.js";
import { spawnSquadMembers } from "../../depot/state.js";
import { spawnEnemy } from "../../depot/sim.js";

// MISSION_R1: REACH THE FAR SIDE (owner's design, 2026-08-30). Three squads
// start by the town and must put someone through the western exit; an enemy
// patrol blocks the ground between — and marches east on its own law, so
// the block presses. Won on arrival with anyone alive; lost with the side
// wiped. Positions provisional (F5), moved on playtest word.
export const MISSION_R1 = {
  name: "REACH THE FAR SIDE",
  seed: 3,
  friendlies: [
    { type: "rifles", x: 8, z: 26 },
    { type: "mg", x: 14, z: 24 },
    { type: "sniper", x: 10, z: 32 },
  ],
  enemies: [
    { tag: "", x: -30, z: 12 }, { tag: "", x: -27, z: 16 },
    { tag: "", x: -33, z: 15 }, { tag: "", x: -29, z: 9 },
  ],
  exit: { x: -52, z: 8, r: 6 },
};

// clearGround(world, x, z, r): the spawn vet. The engine's own slot vet
// (clearSlot) sees only static solids — trees and loose chunks are DYNAMIC
// bodies, so a squad placed on a tree line spawned inside the trunks and
// knocked them flat. This vet reads every live solid-kind body, dynamic or
// not; a blocked point sweeps the same fixed ring clearSlot sweeps (radii
// then azimuths, deterministic, no draws) for the nearest clear ground.
const SPAWN_SOLIDS = new Set(["rock", "wall", "tower", "tree", "chunk"]);
function groundBlocked(world, x, z, r) {
  for (const b of world.bodies) {
    if (!b.alive || !SPAWN_SOLIDS.has(b.kind)) continue;
    if (Math.abs(x - b.pos.x) <= b.hx + r && Math.abs(z - b.pos.z) <= b.hz + r) return true;
  }
  return false;
}
export function clearGround(world, x, z, r) {
  if (!groundBlocked(world, x, z, r)) return { x, z };
  for (let rr = 0.6; rr <= r + 7.3; rr += 0.6) { // the sweep reaches past the asked disc, whatever its size
    for (let k = 0; k < 16; k++) {
      const az = (k / 16) * Math.PI * 2;
      const cx = x + Math.sin(az) * rr, cz = z + Math.cos(az) * rr;
      if (!groundBlocked(world, cx, cz, r)) return { x: cx, z: cz };
    }
  }
  return { x, z };
}
const SQUAD_PAD = 2.0; // covers the 1.2 m spawn ring plus a man's width // provisional (F5)
const MAN_PAD = 0.7;   // a single enemy's footprint // provisional (F5)

// bootMission(def) -> { war, mission } — booted dev, forces placed on
// vetted ground (no squad ever starts inside a tree), no tick.
export function bootMission(def) {
  const war = bootWar({ seed: def.seed, dev: true });
  war.world.slotTreesBlock = true; // trees are ground here: no slot, spawn, or survey goal ever lands in a trunk
  for (const f of def.friendlies) {
    const g = clearGround(war.world, f.x, f.z, SQUAD_PAD);
    const sq = makeSquad(war.run.nextSquadId++, f.type, 1, g.x, g.z);
    spawnSquadMembers(war.world, sq);
    war.run.squads.push(sq);
  }
  for (const e of def.enemies) {
    const g = clearGround(war.world, e.x, e.z, MAN_PAD);
    spawnEnemy(war.world, { x: g.x, z: g.z }, e.tag);
  }
  return { war, mission: def };
}

// missionState(war, def) -> { friendlies, enemies, won, lost }. Won: any
// living friendly unit inside the exit ring. Lost: none standing.
export function missionState(war, def) {
  let friendlies = 0, enemies = 0, reached = false;
  for (const b of war.world.bodies) {
    if (b.kind !== "unit" || !b.alive) continue;
    if (b.team === 1) {
      friendlies++;
      if (Math.hypot(b.pos.x - def.exit.x, b.pos.z - def.exit.z) <= def.exit.r) reached = true;
    } else if (b.team === 2) enemies++;
  }
  return { friendlies, enemies, won: reached && friendlies > 0, lost: friendlies === 0 };
}
