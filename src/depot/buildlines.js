// COLDSNAP DEPOT — buildlines.js: the two-point lay machinery, moved
// VERBATIM out of DepotGame.jsx (P7 T20, the muster.js precedent). This
// code lived in mount closures, not module scope — every closure variable
// the mount held (grid, field, T, S, world, the context helpers) becomes an
// explicit argument here; nothing else changes. NO RNG ANYWHERE IN HERE —
// cell order is Bresenham, the advance is a projection of the squad anchor
// onto the line, and every rejection is a deterministic test. Zero
// behavior change.
import { checkConnectivity } from "./mapgen.js";
import {
  validatePlacement, spawnWallCourses, spawnSandbag, wallOrientAt, sandbagOrientAt, memberNearRow,
  WALL_HALF, WALL_THIN, SANDBAG_HX, SANDBAG_HY, SANDBAG_HZ, WALL_FIELD_COST, SANDBAG_FIELD_COST, WALL_LAY_PAUSE_S,
} from "./state.js";
import { fieldPrices } from "./market.js";
import { MINE_COST, WIRE_COST } from "./mines.js";
import { canBuild, canBuildFor } from "./territory.js";

// P7: THE TWO-POINT BUILD LINE. Tap where the line starts, tap where it
// ends. The squad walks to the start, lays end-to-end along the line, and
// digs in at the far end.
//
// NO RNG ANYWHERE IN HERE. Cell order is Bresenham, the advance is a
// projection of the squad anchor onto the line (a distance accumulator by
// another name), and every rejection is a deterministic test.
// Two numbers, and they are set against each other rather than guessed.
// The formation ring is 1.5m (squads.js slotFor), a piece is 0.9m from
// its centre to its end, a man is 0.28m — so a man standing on the line
// beside the anchor physically overlaps a piece within 1.18m of him, and
// has 0.32m of daylight at his slot. LAY_AHEAD therefore puts each piece
// down 4.5m in front of the anchor (3.0m clear of the leading man, who
// can never be more than the ring's 1.5m ahead of it), and LAY_MAN_PAD is
// a 0.15m safety margin on the hard overlap rather than the 0.35m slot
// pad — at 0.35 the formation's own men blocked every cell of a line run
// along their ring axis, and half a straight order laid nothing (measured,
// staging run, mk0.60: 4 of 8 bags).
const LAY_AHEAD = 4.5;      // m — a piece goes down this far in FRONT of the anchor
const LINE_MAX_CELLS = 64;  // a hard ceiling on one order's line
const LAY_MAN_PAD = 0.15;   // m — margin on top of a hard man-vs-piece overlap
const LAY_REACH = 3;   // m — no hands within reach, no piece // provisional (F5)
// P7 T10: the sapper's per-piece pause — a device is quicker to lay
// than a wall course (no masonry to stack), so it rides its own
// constant beside WALL_LAY_PAUSE_S rather than that one. Lives here
// (not state.js) — this task's commit list doesn't touch state.js.
const MINE_LAY_PAUSE_S = 0.6; // provisional (F5)
// lineCells: the grid cells a start->end segment runs through, in order.
// Bresenham with ONE axis moved per step (never the diagonal shortcut the
// stock algorithm takes) — that is what makes the staircase.
export function lineCells(grid, a, b) {
  const g0 = grid.worldToGrid(a.x, a.z), g1 = grid.worldToGrid(b.x, b.z);
  let x = g0.gx, z = g0.gz;
  const dx = Math.abs(g1.gx - x), dz = Math.abs(g1.gz - z);
  const sx = g1.gx >= x ? 1 : -1, sz = g1.gz >= z ? 1 : -1;
  let err = dx - dz, guard = 0;
  const out = [{ gx: x, gz: z }];
  while ((x !== g1.gx || z !== g1.gz) && guard++ < LINE_MAX_CELLS) {
    const stepX = z === g1.gz ? true : x === g1.gx ? false : 2 * err > -dz;
    if (stepX) { err -= dz; x += sx; } else { err += dx; z += sz; }
    out.push({ gx: x, gz: z });
  }
  return out;
}
// The footprint a piece will occupy, given its orientation. Bags and wall
// courses share one shape family (mk0.54/mk0.55) so this is one rule.
export function pieceHalf(kind, orient) {
  // P7 T10: a mine/wire ghost is a small flat disc, not a slab —
  // orientation-independent (a watched point has no facing).
  if (kind === "mines" || kind === "wires") return { hx: 0.3, hz: 0.3 };
  const long = kind === "walls" ? WALL_HALF : SANDBAG_HX;   // 0.9 either way
  const thin = kind === "walls" ? WALL_THIN : SANDBAG_HZ;   // 0.35 either way
  return orient === 1 ? { hx: thin, hz: long } : { hx: long, hz: thin };
}
export function startBuildLine(grid, sq, kind, a, b, toast, team = 1) {
  const dxw = b.x - a.x, dzw = b.z - a.z;
  const len = Math.hypot(dxw, dzw);
  const ux = len > 1e-6 ? dxw / len : 0, uz = len > 1e-6 ? dzw / len : 1;
  const cells = lineCells(grid, a, b);
  // THE LINE'S ONE ROTATION: the closest logical rotation to the whole
  // start->end direction — its dominant axis. |dx| vs |dz| in WORLD space
  // is the exact convention sandbagOrientAt/wallOrientAt already use, so
  // the two can never disagree and no ORIENT reasoning is needed here.
  // null only for a degenerate (zero-length) order, which then falls back
  // to the auto-continue convention.
  const orient = len > 1e-6 ? (Math.abs(dxw) >= Math.abs(dzw) ? 0 : 1) : null;
  const rows = cells.map((c) => {
    const wp = grid.gridToWorld(c.gx, c.gz);
    return { gx: c.gx, gz: c.gz, x: wp.x, z: wp.z, t: (wp.x - a.x) * ux + (wp.z - a.z) * uz };
  });
  sq._build = { kind, orient, ax: a.x, az: a.z, ux, uz, len, rows, i: 0, laid: 0, skipped: 0, dry: false, phase: "toStart", team };
  sq.order = "build";
  sq.dest = { x: a.x, z: a.z };
  sq._legTarget = null; sq._pauseT = 0; sq._cohesionHoldT = 0; sq._threatSig = undefined;
  toast((kind === "walls" ? "WALL" : kind === "mines" ? "MINE" : kind === "wires" ? "WIRE" : "BAG") + " LINE — " + rows.length + " SECTIONS");
}
// COMMAND T2 (mk0.84): THE PROPOSED LINE. The second tap of a
// two-point order proposes; nothing walks until the owner of the tap
// accepts. Ghost pieces skip exactly the cells laying would skip
// (scrap aside — that is walk-time), so the preview never lies.
export function linePieces(grid, field, T, kind, a, b, map) {
  if (kind === "patrol") return [];
  const isDevice = kind === "mines" || kind === "wires"; // P7 T10
  const orient = Math.abs(b.x - a.x) >= Math.abs(b.z - a.z) ? 0 : 1;
  const ph = pieceHalf(kind, orient);
  const hy = kind === "walls" ? 0.9 : isDevice ? 0.06 : SANDBAG_HY;
  const out = [];
  for (const c of lineCells(grid, a, b)) {
    if (!grid.inBounds(c.gx, c.gz)) continue;
    const cell = grid.cells[grid.idx(c.gx, c.gz)];
    const wp = grid.gridToWorld(c.gx, c.gz), c0 = map.invW(wp.x, wp.z);
    // P7 T10: a device is a watched point, never a body — no cell
    // claim, no validatePlacement (no held-ground gate); the ghost
    // must skip exactly what layPieceAt's device branch skips: water/
    // blocked-terrain cells only.
    if (isDevice) { if (cell.blocked || cell.ice) continue; }
    else if (cell.blocked || cell.wallId || cell.ice || !canBuild(T, c0.u, c0.v)) continue; // an honest gap
    out.push({ x: wp.x, z: wp.z, y: field.heightAt(wp.x, wp.z) + hy, hx: ph.hx, hy, hz: ph.hz });
  }
  return out;
}
// One piece. Returns "laid" | "skip" | "dry". Placement runs the REAL
// spawners and the REAL gate (validatePlacement, the same four checks the
// build menu makes) — a cell that is occupied, iced or unheld is skipped,
// never double-filled; running out of scrap stops the line for good.
export function layPieceAt(world, grid, field, T, S, job, row, ctx, map) {
  const team = job.team || 1;
  // P7 T10: THE TRIGGER IS THE PROTECTION — a mine/wire is a watched
  // point, never a physics body: no cell claim, no validatePlacement
  // (no ground-held gate, no occupied-cell gate — a wall/building cell
  // is fine to seed under, only water/blocked-terrain cells refuse).
  if (job.kind === "mines" || job.kind === "wires") {
    if (!grid.inBounds(row.gx, row.gz)) return "skip";
    const cell = grid.cells[grid.idx(row.gx, row.gz)];
    if (cell.blocked || cell.ice) return "skip";
    const mp = S._minePrices || { mine: MINE_COST, wire: WIRE_COST };
    const cost = job.kind === "mines" ? mp.mine : mp.wire;
    if (S.resources < cost) return "dry";
    S.mines.push({ x: row.x, z: row.z, team: 1, kind: job.kind === "mines" ? "mine" : "wire", live: true });
    S.resources -= cost;
    ctx.setMines(S.mines);
    return "laid";
  }
  if (!grid.inBounds(row.gx, row.gz)) return "skip";
  const cell = grid.cells[grid.idx(row.gx, row.gz)];
  const c0 = map.invW(row.x, row.z);
  const fp = S._market ? fieldPrices(S._market.counts, WALL_FIELD_COST, SANDBAG_FIELD_COST) : { wall: WALL_FIELD_COST, bag: SANDBAG_FIELD_COST };
  const cost = job.kind === "walls" ? fp.wall : fp.bag;
  const v = validatePlacement({
    blocked: !!(cell.blocked || cell.wallId), ice: !!cell.ice,
    held: canBuildFor(T, c0.u, c0.v, team), resources: S.resources, cost,
  });
  if (!v.ok) return v.msg === "NO SCRAP" ? "dry" : "skip";
  // The LINE's rotation, not the cell's: every piece on one order faces
  // the same way. The auto-continue conventions are the fallback for a
  // degenerate order only — they must never override the line's angle, or
  // a run laid beside an older line would turn to match the wrong thing.
  const orient = job.orient != null ? job.orient
    : job.kind === "walls" ? wallOrientAt(world, row.x, row.z, map.ORIENT % 2)
      : sandbagOrientAt(world, row.x, row.z, S.sandbagOrient || 0);
  // Never lay a piece around a living man. A static body spawned over a
  // dynamic one gets him depenetration-ejected, and the impact classifier
  // reads that ejection as a lethal slam (the masonry-slam hazard
  // squads.js's clearSlot exists for). A gap in the line is cheaper than a
  // dead engineer, so an occupied cell is skipped for good rather than
  // retried — retrying would deadlock behind the squad's own trailing man.
  const ph = pieceHalf(job.kind, orient);
  for (const u of world.bodies) {
    if (u.kind !== "unit" || !u.alive) continue;
    if (Math.abs(u.pos.x - row.x) <= ph.hx + u.hx + LAY_MAN_PAD &&
        Math.abs(u.pos.z - row.z) <= ph.hz + u.hz + LAY_MAN_PAD) return "skip";
  }
  if (job.kind === "walls") {
    // A wall claims the cell, so it owes the same road the build menu
    // owes: a line that seals the map off is refused cell by cell.
    cell.blocked = true;
    if (!checkConnectivity(grid, map.SPAWN_POINTS, ctx.objG.gx, ctx.objG.gz)) { cell.blocked = false; return "skip"; }
    const b = spawnWallCourses(world, row.x, field.heightAt(row.x, row.z), row.z, orient, team)[0];
    cell.wallId = b.id;
    cell.bTeam = team;
    ctx.recomputeFlow();
  } else {
    ctx.stampBag(spawnSandbag(world, row.x, row.z, orient, team), team);
  }
  S.resources -= cost;
  return "laid";
}
// The driver, once per sim tick per squad carrying a job.
export function stepBuildLine(world, grid, field, T, S, sq, ctx, toast, map) {
  const job = sq._build;
  if (!job) return;
  if (job.phase === "toStart") {
    // squads.js flips a finished leg to "defend" — that arrival IS the
    // handoff. The men are on the start point; now the dest becomes the
    // far end and the laying begins.
    if (sq.order === "build" && sq.dest) return;
    job.phase = "laying";
    sq.order = "build";
    sq.dest = { x: job.ax + job.ux * job.len, z: job.az + job.uz * job.len };
    sq._legTarget = null; sq._pauseT = 0; sq._cohesionHoldT = 0; sq._threatSig = undefined;
    return;
  }
  // THE ACCUMULATOR: how far along the start->end line the squad anchor
  // has travelled, as a projection — a pure function of the anchor, with
  // no clock and no rng in it.
  const t = (sq.anchor.x - job.ax) * job.ux + (sq.anchor.z - job.az) * job.uz;
  const arrived = sq.order !== "build"; // squads.js dug them in at the far end
  if (!job.dry && !(sq._pauseT > 0)) {
    while (job.i < job.rows.length) {
      const row = job.rows[job.i];
      if (!arrived && row.t > t + LAY_AHEAD) break;
      // P7 T17 (owner): ENGINEERS BUILD WITH THEIR HANDS — a row lays
      // only while a live member stands within reach; no one near, this
      // row and every row behind it wait for the men. The anchor keeps
      // walking (its escape stands) — rows it outruns lay late, when
      // hands pass them, or die unlaid with the job. Skips never charge.
      if (!memberNearRow(world, sq, row, LAY_REACH)) break;
      const r = layPieceAt(world, grid, field, T, S, job, row, ctx, map);
      if (r === "dry") { job.dry = true; toast("NO SCRAP — THE LINE STOPS HERE"); break; }
      job.i++;
      if (r === "laid") {
        job.laid++;
        // A WALL IS A COMMITMENT: the squad stands still while it goes up.
        // squad._pauseT is the attack-leg dwell field, reused verbatim —
        // squads.js holds the anchor and issues no new leg, and no rng is
        // touched by either side of the arrangement.
        if (job.kind === "walls" && !arrived) { sq._pauseT = WALL_LAY_PAUSE_S; break; }
        // P7 T10: a device costs the sapper a shorter commitment — the
        // same dwell field, its own constant.
        if ((job.kind === "mines" || job.kind === "wires") && !arrived) { sq._pauseT = MINE_LAY_PAUSE_S; break; }
      } else job.skipped++;
    }
  }
  if (arrived || job.i >= job.rows.length) {
    if (arrived) sq._build = null; // the line is finished and so is the order
  }
}
