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

// bootMission(def) -> { war, mission } — booted dev, forces placed, no tick.
export function bootMission(def) {
  const war = bootWar({ seed: def.seed, dev: true });
  for (const f of def.friendlies) {
    const sq = makeSquad(war.run.nextSquadId++, f.type, 1, f.x, f.z);
    spawnSquadMembers(war.world, sq);
    war.run.squads.push(sq);
  }
  for (const e of def.enemies) spawnEnemy(war.world, { x: e.x, z: e.z }, e.tag);
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
