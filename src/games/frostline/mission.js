// games/frostline/mission.js — a mission is RULES over a seeded map, not
// coordinates. The seed picks the valley; the rules read the map the boot
// built (the town, the western ground, the movement grid) and place the
// forces on ground that is proven clear and proven connected. Same seed,
// same mission, every time — a saved battle is its seed. The dev boot
// fields no army, rings no bell, counts no census.
import { bootWar } from "../../depot/api.js";
import { makeSquad } from "../../depot/squads.js";
import { spawnSquadMembers } from "../../depot/state.js";
import { spawnEnemy } from "../../depot/sim.js";

// MISSION_R1: REACH THE FAR SIDE. Three squads start east of the town and
// must put someone through the western exit; a patrol blocks the ground
// between. Won on arrival with anyone alive; lost with the side wiped.
// All dials provisional (F5), moved on playtest word.
export const MISSION_R1 = {
  name: "REACH THE FAR SIDE",
  friendlies: [{ type: "rifles" }, { type: "mg" }, { type: "sniper" }],
  enemyCount: 4,
  exitR: 6,
  tries: 24, // seeds stepped past an unplaceable or disconnected valley
};

// ---- the ground vets. clearGround: no live solid (static or dynamic)
// inside the disc; footPassable: the movement grid's own foot rule.
const SPAWN_SOLIDS = new Set(["rock", "wall", "tower", "tree", "chunk"]);
function groundBlocked(world, x, z, r) {
  for (const b of world.bodies) {
    if (!b.alive || !SPAWN_SOLIDS.has(b.kind)) continue;
    if (Math.abs(x - b.pos.x) <= b.hx + r && Math.abs(z - b.pos.z) <= b.hz + r) return true;
  }
  return false;
}
function footPassable(war, x, z) {
  const c = war.grid.cellAt(x, z);
  return !!c && !c.blocked && !c.drop;
}
// openGround: the first point on a fixed ring scan (radii then azimuths —
// deterministic, no draws) that both vets pass; null when nothing near.
export function openGround(war, x, z, r) {
  const ok = (cx, cz) => footPassable(war, cx, cz) && !groundBlocked(war.world, cx, cz, r);
  if (ok(x, z)) return { x, z };
  for (let rr = 0.6; rr <= r + 9.1; rr += 0.6) {
    for (let k = 0; k < 16; k++) {
      const az = (k / 16) * Math.PI * 2;
      const cx = x + Math.sin(az) * rr, cz = z + Math.cos(az) * rr;
      if (ok(cx, cz)) return { x: cx, z: cz };
    }
  }
  return null;
}
const SQUAD_PAD = 2.0; // covers the 1.2 m spawn ring plus a man's width // provisional (F5)
const MAN_PAD = 0.7;   // a single enemy's footprint // provisional (F5)

// townAnchor: the centroid of the standing town (the depot pad excluded).
function townAnchor(war) {
  let sx = 0, sz = 0, n = 0;
  for (const t of war.map.TOWN) {
    if (t.depot) continue;
    sx += t.x; sz += t.z; n++;
  }
  return n ? { x: sx / n, z: sz / n } : { x: 0, z: 0 };
}

// westExit: the westernmost open ground on a fixed scan of the west third,
// nearest the town's own latitude first.
function westExit(war, tz) {
  for (let x = -80; x <= -40; x += 2) {
    for (let dz = 0; dz <= 60; dz += 2) {
      for (const z of dz === 0 ? [tz] : [tz - dz, tz + dz]) {
        if (z < -80 || z > 80) continue;
        const g = openGround(war, x, z, 1.2);
        if (g && Math.hypot(g.x - x, g.z - z) < 1e-9) return g;
      }
    }
  }
  return null;
}

// connected(war, a, b): the passability proof — a breadth-first walk over
// the movement grid's foot-passable cells from a to b. A mission must be
// born crossable; weapons may carve shortcuts, never the only road.
export function connected(war, a, b) {
  const g = war.grid, W = g.w, H = g.h;
  const at = (gx, gz) => g.cells[g.idx(gx, gz)];
  const sa = g.worldToGrid(a.x, a.z), sb = g.worldToGrid(b.x, b.z);
  if (!g.inBounds(sa.gx, sa.gz) || !g.inBounds(sb.gx, sb.gz)) return false;
  const seen = new Uint8Array(W * H);
  const q = [sa.gz * W + sa.gx];
  seen[q[0]] = 1;
  const goalI = sb.gz * W + sb.gx;
  while (q.length) {
    const i = q.pop();
    if (i === goalI) return true;
    const gx = i % W, gz = (i / W) | 0;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = gx + dx, nz = gz + dz;
      if (nx < 0 || nz < 0 || nx >= W || nz >= H) continue;
      const j = nz * W + nx;
      if (seen[j]) continue;
      const c = at(nx, nz);
      if (!c || c.blocked || c.drop) continue;
      seen[j] = 1;
      q.push(j);
    }
  }
  return false;
}

// placeMission(war, def): the rules against one booted valley. Returns the
// resolved mission (forces placed, exit fixed) or null when this valley
// refuses (no exit, no clear stand, or no road between).
function placeMission(war, def) {
  const ta = townAnchor(war);
  const exit = westExit(war, ta.z);
  if (!exit) return null;
  const squadAt = [];
  const offs = [[10, 0], [14, -5], [12, 7]]; // east of the town, a loose line // provisional (F5)
  for (let i = 0; i < def.friendlies.length; i++) {
    const g = openGround(war, ta.x + offs[i % offs.length][0], ta.z + offs[i % offs.length][1], SQUAD_PAD);
    if (!g) return null;
    squadAt.push(g);
  }
  const foes = [];
  const jit = [3, -3, 6, -6, 9, -9];
  for (let i = 0; i < def.enemyCount; i++) {
    const t = 0.45 + 0.05 * i;
    const px = ta.x + (exit.x - ta.x) * t, pz = ta.z + (exit.z - ta.z) * t;
    const dx = exit.x - ta.x, dz = exit.z - ta.z, d = Math.hypot(dx, dz) || 1;
    const g = openGround(war, px + (-dz / d) * jit[i % jit.length], pz + (dx / d) * jit[i % jit.length], MAN_PAD);
    if (!g) return null;
    foes.push(g);
  }
  if (!connected(war, squadAt[0], exit)) return null;
  return { exit: { x: exit.x, z: exit.z, r: def.exitR }, squadAt, foes };
}

// bootMission(def, seed) -> { war, mission, seed } — the seed picks the
// valley; a valley the rules refuse steps to the next seed, deterministically,
// so the same asked seed always lands the same battle. The returned seed is
// the one that took; the page shows it and the address bar pins it.
export function bootMission(def, seed = 3) {
  for (let k = 0; k < (def.tries || 24); k++) {
    const s = seed + k;
    const war = bootWar({ seed: s, dev: true });
    war.world.slotTreesBlock = true; // trees are ground here: no slot, spawn, or survey goal ever lands in a trunk
    const placed = placeMission(war, def);
    if (!placed) continue;
    def.friendlies.forEach((f, i) => {
      const sq = makeSquad(war.run.nextSquadId++, f.type, 1, placed.squadAt[i].x, placed.squadAt[i].z);
      spawnSquadMembers(war.world, sq);
      war.run.squads.push(sq);
    });
    for (const g of placed.foes) spawnEnemy(war.world, { x: g.x, z: g.z }, "");
    return { war, mission: { name: def.name, exit: placed.exit }, seed: s };
  }
  throw new Error("no placeable valley within " + (def.tries || 24) + " seeds of " + seed);
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
