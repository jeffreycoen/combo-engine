// COLDSNAP DEPOT — mapgen.js: the map frame, moved VERBATIM out of
// DepotGame.jsx (P7 T18, the route.js precedent). One canonical square,
// four rotations; the generator, the terrain, the trees, the grid, the
// flow, the connectivity — and the frame's own state (ORIENT, the drawn
// map data), exported as live bindings so makeMap's writes reach every
// reader exactly as they did in the component. Zero behavior change; the
// T6 keystone (hash AND draws) pins the proof.
import { fwdUFor, fwdDirFor, invWFor, clampToRimFor } from "../../depot/orient.js";
import { mulberry32 } from "../../engine/core.js";
import { MASON } from "../../depot/specs.js";
import { stampTerrainMasks } from "../../depot/route.js";
// ============================================================== the map
// THE FRONT (mk1.00): a 120x120 SQUARE — one canonical frame, four rotations.
// AMENDMENT 3 (mk1.02): the flow/build grid covers the FULL rim — the old
// 1m inset is gone. Cell centers sit at u,v = ±59; cell edges land exactly
// on the ±60 rim, so a stream running the rim's full width has no off-grid
// endpoint.
export const GRID_CS = 2.0, GRID_W = 90, GRID_H = 90;
export const GRID_OX = -(GRID_W * GRID_CS) / 2, GRID_OZ = -(GRID_H * GRID_CS) / 2;
export let ORIENT = 0;
// Transform formulas live in orient.js (pure, ORIENT-explicit, headlessly
// testable) — these wrappers just apply them against the module's current
// ORIENT, same call sites/behavior as before.
export const fwdU = (u, v) => fwdUFor(ORIENT, u, v);
export const fwdDir = (du, dv) => fwdDirFor(ORIENT, du, dv);
export const invW = (x, z) => invWFor(ORIENT, x, z);
// THE PLAYABLE RIM, once. buildDepotTerrain's falloff box is 60x60 in
// canonical (u, v) — beyond it there is no ground to stand on, only the
// painted horizon. world.inRim, the renderer's rim descriptor and the order
// clamp below all read THESE two numbers so they cannot drift apart.
export const RIM_HALF_U = 90, RIM_HALF_V = 90;
// P1.5 Task 1 (mk0.50): an off-map destination tap becomes the nearest point
// still on the field. The transform itself is orient.js's (pure, testable);
// this is the same thin ORIENT-binding wrapper fwdU/invW are.
export const clampToRim = (x, z) => clampToRimFor(ORIENT, x, z, RIM_HALF_U, RIM_HALF_V);
export let OBJ_POS = { x: 0, z: 49 };
export let SPAWN_POINTS = [], PONDS = [], ROCKS = [], TOWN = [], ROADS = [], PASSES = [], BANDS = [], MAP_SEED = 0, SPAWN_U = [];
export let STREAM = null; // T3: { pts:[{u,v}...], w, v, bridgeU } — canonical, regrown from seed
// STREAM OFF (mk1.94, owner): the water made too many impassable places. One
// switch guards the draw, the road bend and every clearance in genMap; the
// downstream machinery (the carve, grid water, slot and order refusals, the
// ribbons) already keys off STREAM staying null and waits dormant. Flip to
// true and the stream returns whole.
export const STREAM_ON = false;
export let HILLS = []; // T5: [{u, v, r, h}...] — canonical, regrown from seed
export let CLUSTERS = []; // mk2.63: [{kind, x, z, r, n}] — the named ground

export const TOWN_STONE_CAP = 6000; // owner, 2026-08-26 — provisional until the Pi collapse capture // provisional (F5)
export function genMap(seed) {
  const r = mulberry32(seed);
  // THE SEAT OF THE WAR (P7 T3, owner): the depots press into OPPOSITE
  // CORNERS, point-symmetric — the longest front the square holds. Depth
  // hugs the rim; the u side is drawn once and mirrored with a hair of
  // jitter. genMap's rng is its own free stream — draw shape is ours.
  const depotDepth = 66 + r() * 12;                       // provisional (F5)
  const cornerSide = r() < 0.5 ? 1 : -1;
  const depotU1 = cornerSide * (51 + r() * 21);          // the player's corner
  const depotU2 = -depotU1 + (r() - 0.5) * 12;            // the far corner
  const objU = depotU1, objV = depotDepth - 3; // the objective sits 3m field-side of the player depot
  // THE BANDS (T2): 2-4 rock bands, evenly seeded across the middle ground,
  // each jittered — the fixed three-band skeleton is gone.
  const nBands = 2 + Math.floor(r() * 3);
  const bands = [];
  for (let i = 0; i < nBands; i++) bands.push(-42 + (i + 0.5) * (87 / nBands) + (r() - 0.5) * 15);
  // THE PASSES (T2): 1-3 gaps per band, drawn anywhere across the width.
  const passes = bands.map((z) => {
    const n = 1 + Math.floor(r() * 3);
    const out = [];
    for (let i = 0; i < n; i++) out.push({ x: -75 + r() * 150, z });
    return out;
  });
  // THE STREAM (T3, mk1.02): one per map — full width, meandering, in a
  // drawn gap clear of the bands, capped |v|<=22 so it can never touch a
  // depot pad. ONE causeway crossing at bridgeU. Canonical space throughout.
  // Drawn here (right after the bands, ahead of rocks) so every clearance
  // chain below — rocks, spawns-adjacent ponds, benches, ruins — can read
  // streamV; genMap's rng is its own free stream, so the draw order is ours.
  let stream = null, streamV = 0, bridgeU = 0;
  if (STREAM_ON) {
    streamV = (bands[0] + bands[1]) / 2;   // fallback: between the first two bands
    for (let i = 0; i < 20; i++) {
      const v = -33 + r() * 66;
      if (bands.every((b) => Math.abs(v - b) >= 8)) { streamV = v; break; }
    }
    const streamW = 2.2 + r() * 1.8;         // half-width: a 4.4-8m channel // provisional (F5)
    bridgeU = (r() - 0.5) * 135;
    const streamPts = [];
    for (let u = -90; u <= 90; u += 15) streamPts.push({ u, v: streamV + (r() - 0.5) * 6 });
    stream = { pts: streamPts, w: streamW, v: streamV, bridgeU };
  }
  const rocks = [];
  for (let bi = 0; bi < bands.length; bi++) {
    const density = 0.35 + r() * 0.65;
    for (let x = -82.5; x <= 82.5; x += 8.25 + r() * 4.5) {
      if (r() > density) continue;
      const z = bands[bi] + (r() - 0.5) * 2.5;
      if (passes[bi].some((g) => Math.abs(x - g.x) < 6.5)) continue;
      // T2: a wandering depot can meet a band — rocks keep 12m off both
      if (Math.hypot(x - depotU1, z - depotDepth) < 12 || Math.hypot(x - depotU2, z + depotDepth) < 12) continue;
      if (STREAM_ON && Math.abs(z - streamV) < 9) continue; // T3: rocks stay clear of the stream
      rocks.push({ x, z, r: 3.4 + r() * 1.2, h: 3.0 + r() * 0.9 });
    }
  }
  // THE SPAWNS (T2): 2-4, spread across the enemy edge with jitter.
  const nSpawn = 2 + Math.floor(r() * 3);
  const spawns = [];
  for (let i = 0; i < nSpawn; i++) spawns.push({ x: -67.5 + (i + 0.5) * (135 / nSpawn) + (r() - 0.5) * 15, z: GRID_OZ + 2 });
  // THE ROADS (T2): 0-3 — a front owes nobody a road. Each drawn road runs
  // spawn -> one pass per band -> the objective. Roads are terrain and looks;
  // the march runs the flow field either way.
  const nRoads = Math.floor(r() * 4);
  const roads = [];
  for (let ri = 0; ri < nRoads; ri++) {
    const pts = [[spawns[ri % spawns.length].x, GRID_OZ + 2]];
    let bridged = false;
    for (const band of passes) {
      const g = band[Math.floor(r() * band.length)];
      if (STREAM_ON && !bridged && g.z > streamV) { pts.push([bridgeU, streamV]); bridged = true; }
      pts.push([g.x, g.z]);
    }
    if (STREAM_ON && !bridged) pts.push([bridgeU, streamV]);
    pts.push([objU, objV]);
    // mk2.67 (owner): a road is KEPT or BROKEN, drawn here — the paint
    // reads the flag; the flag rides the array (survives the world transform).
    roads.push(Object.assign(pts, { broken: r() < 0.45 }));
  }
  const roadDist = (x, z) => {
    let best = 1e9;
    for (const route of roads) for (let i = 0; i < route.length - 1; i++) {
      const a = route[i], b2 = route[i + 1];
      const dx = b2[0] - a[0], dz = b2[1] - a[1];
      const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz)));
      best = Math.min(best, Math.hypot(x - (a[0] + dx * t), z - (a[1] + dz * t)));
    }
    return best;
  };
  const ponds = [];
  const nP = 1 + Math.floor(r() * 4);
  for (let i = 0; i < 30 && ponds.length < nP; i++) {
    const x = -75 + r() * 150, z = -18 + r() * 72, rad = 5.5 + r() * 2.5;
    if (passes.flat().some((g) => Math.abs(x - g.x) < 9 && Math.abs(z - g.z) < 14)) continue;
    if (roadDist(x, z) < rad + 6) continue;
    // T2: clear of BOTH depots (the old check knew one fixed objective)
    if (Math.hypot(x - depotU1, z - depotDepth) < 16 || Math.hypot(x - depotU2, z + depotDepth) < 16) continue;
    if (ponds.some((q) => Math.hypot(x - q.x, z - q.z) < q.r + rad + 6)) continue;
    if (STREAM_ON && Math.abs(z - streamV) < rad + 10) continue; // T3: ponds stay clear of the stream
    ponds.push({ x, z, r: rad, level: 0 });
  }
  // T5: THE HIGH GROUND (owner's rulings: 1-3 hills, never zero; overlook
  // allowed — only the stream, ponds and roads push a hill away). Canonical
  // coords like the stream; buildDepotTerrain lifts them in its own frame.
  const hills = [];
  const nHills = 1 + Math.floor(r() * 3);
  for (let k = 0, placed = 0; k < 60 && placed < nHills; k++) {
    const hu = -72 + r() * 144, hv = -69 + r() * 132;
    const hr = 10 + r() * 5, hh = 3 + r() * 2;
    if (STREAM_ON && Math.abs(hv - streamV) < hr + 10) continue;
    if (ponds.some((q) => Math.hypot(hu - q.x, hv - q.z) < q.r + hr * 0.7 + 4)) continue;
    if (roadDist(hu, hv) < hr * 0.7 + 4) continue;
    hills.push({ u: hu, v: hv, r: hr, h: hh });
    placed++;
  }
  // THE FORM BOOK (mk2.63, owner): every shape the valley can lay. The old
  // ten stay; the new forms join — row houses with partition walls, the inn
  // with its yard, the smithy with its chimney, the well, the mill, the bell
  // tower and graveyard as chapel children, the wayside cross, the gateposts,
  // the springhouse. marker: no flag, no pay (the field walls' standing).
  const F = {
    croft: { t: "croft", nx: 4, nz: 3, ny: 3 },
    house6: { t: "house", nx: 6, nz: 5, ny: 4, cols: true },
    house5: { t: "house", nx: 5, nz: 4, ny: 4 },
    long: { t: "long", nx: 8, nz: 4, ny: 3, cols: true },
    watch: { t: "watch", nx: 2, nz: 2, ny: 8 },
    granary: { t: "granary", nx: 3, nz: 3, ny: 7 },
    yard: { t: "yard", nx: 6, nz: 5, ny: 2, roof: false },
    shed: { t: "shed", nx: 4, nz: 4, ny: 3 },
    chapel: { t: "chapel", nx: 5, nz: 6, ny: 5, cols: true },
    keep: { t: "keep", nx: 7, nz: 6, ny: 5, cols: true, cren: true },  // mk2.66: crenellated top, no roof course
    row: { t: "row", nx: 9, nz: 4, ny: 3, parts: [3, 6], noswap: true },
    inn: { t: "inn", nx: 6, nz: 5, ny: 4, cols: true, child: "innyard" },
    innyard: { t: "innyard", nx: 6, nz: 5, ny: 2, roof: false, door: -1 },
    smithy: { t: "smithy", nx: 4, nz: 3, ny: 3, child: "chimneyc" },
    chimneyc: { t: "chimneyc", nx: 1, nz: 1, ny: 5, roof: false, door: -1, marker: true },
    well: { t: "well", nx: 2, nz: 2, ny: 1, roof: false, door: -1 },
    mill: { t: "mill", nx: 3, nz: 3, ny: 6 },
    belltower: { t: "belltower", nx: 2, nz: 2, ny: 8, roof: false, door: -1 },
    graveyard: { t: "graveyard", nx: 6, nz: 5, ny: 2, roof: false, door: -1, stones: true },
    cross: { t: "cross", nx: 1, nz: 1, ny: 2, roof: false, door: -1, marker: true },
    gatepost: { t: "gatepost", nx: 1, nz: 1, ny: 3, roof: false, door: -1, marker: true },
    spring: { t: "spring", nx: 2, nz: 2, ny: 2, marker: true },  // 9 stones — under the marker line (ruling 3)
  };
  // T2: both depots at their DRAWN positions — same lattice, same template.
  const town = [
    { id: "depot", x: depotU1, z: depotDepth, nx: 12, nz: 9, ny: 7, door: 5, depot: true },
    { id: "depot2", x: depotU2, z: -depotDepth, nx: 12, nz: 9, ny: 7, door: 5, depot: true, team: 2 },
  ];
  // T2: BOTH depots run the foul check the enemy's alone used to run —
  // except the ROAD clause, which checks depot2 only (AMENDMENT 2): every
  // drawn road terminates AT the player depot by design (its own supply
  // road), so road proximity is a foul for the enemy's ground alone.
  // P7 T3 fix (dispatch-time anchor mismatch): this was hardcoded to the OLD
  // 9x7 dims, not derived from the TOWN entries above — with the depot grown
  // to 12x9 it under-cleared the real footprint (found by FRONT F1's sweep,
  // two seeds where depot2 read as clear of a spawn it actually crowded).
  const dHalfDiag = Math.hypot(town[0].nx, town[0].nz) * MASON.pitch / 2;
  const dFoul = (d, roadChecked) =>
    (roadChecked && roadDist(d.x, d.z) <= dHalfDiag + 2) ||
    spawns.some((sp) => Math.hypot(d.x - sp.x, d.z - sp.z) < dHalfDiag + 2) ||
    ponds.some((q) => Math.hypot(d.x - q.x, d.z - q.z) < q.r + dHalfDiag) ||
    rocks.some((q) => Math.hypot(d.x - q.x, d.z - q.z) < q.r + dHalfDiag);
  const depotFoul = dFoul(town[0], false) || dFoul(town[1], true);
  // T4: THE BIG FORMS (owner's ruling: 2-4 per map) — the proving grounds'
  // slab-roof drive-through hangar and columned warehouse, placed before the
  // benches so the landmarks go down first and the benches fill around them.
  // The shape flags (slab/drive/cols) are read by buildTown.
  const BIG = [
    { t: "hangar", nx: 9, nz: 10, ny: 5, slab: true, drive: true },
    { t: "warehouse", nx: 8, nz: 6, ny: 4, cols: true },
  ];
  let bid = 0;
  let plannedStones = 0; // mk2.64: the one stone ledger — big forms, clusters, fill, walls, all of it
  const nBig = 2 + Math.floor(r() * 3);
  for (let k = 0, placed = 0; k < 120 && placed < nBig; k++) {
    const tpl = BIG[Math.floor(r() * BIG.length)];
    const swap = r() < 0.5;
    const nx = swap ? tpl.nz : tpl.nx, nz = swap ? tpl.nx : tpl.nz;
    const x = -72 + r() * 144;
    const z = -66 + r() * 126;
    const rad = Math.max(nx, nz) * MASON.pitch / 2 + 2;
    if (passes.flat().some((g) => Math.abs(x - g.x) < rad + 4 && Math.abs(z - g.z) < 12)) continue;
    if (spawns.some((sp) => Math.hypot(x - sp.x, z - sp.z) < rad + 4)) continue;
    if (ponds.some((q) => Math.hypot(x - q.x, z - q.z) < q.r + rad + 3)) continue;
    if (rocks.some((q) => Math.hypot(x - q.x, z - q.z) < q.r + rad + 1.5)) continue;
    if (roadDist(x, z) < rad + 3) continue;
    if (town.some((q) => Math.hypot(x - q.x, z - q.z) < rad + Math.max(q.nx, q.nz) * MASON.pitch / 2 + 2.5)) continue;
    if (STREAM_ON && Math.abs(z - streamV) < rad + 9) continue;
    const eBig = { id: tpl.t + bid++, x, z, nx, nz, ny: tpl.ny,
      door: tpl.drive ? -1 : (r() < 0.5 ? 0 : nx - 1),
      slab: tpl.slab, drive: tpl.drive, cols: tpl.cols };
    town.push(eBig);
    plannedStones += stoneCount(eBig); // mk2.64: EVERYTHING counts against the cap
    placed++;
  }
  // THE SETTLED VALLEY (mk2.63, owner): clusters replace the bench scatter —
  // one town, hamlets, dead hamlets, singles. Places, not sprinkles.
  // Placement plans in stones (stoneCount) and stops at TOWN_STONE_CAP.
  const benches = [];
  for (let i = 0; i + 1 < bands.length; i++) benches.push([bands[i] + 8, bands[i + 1] - 7]);
  benches.push([bands[bands.length - 1] + 8, depotDepth - 8]);
  const CL = [];
  // the one vet every placement runs — the standing foul checks, shared.
  const vetAt = (x, z, nx, nz, offRoad) => {
    const rad = Math.max(nx, nz) * MASON.pitch / 2 + 2;
    if (x < -78 || x > 78 || z < -69 || z > 69) return false;
    // mk2.65: THE YARD STANDS CLEAR — no placed building crowds either
    // depot's ground; the bag ring and the armor parking ring stay open.
    if (Math.hypot(x - depotU1, z - depotDepth) < rad + 32 || Math.hypot(x - depotU2, z + depotDepth) < rad + 32) return false;
    if (passes.flat().some((g) => Math.abs(x - g.x) < rad + 4 && Math.abs(z - g.z) < 12)) return false;
    if (spawns.some((sp) => Math.hypot(x - sp.x, z - sp.z) < rad + 4)) return false;
    if (ponds.some((q) => Math.hypot(x - q.x, z - q.z) < q.r + rad + 3)) return false;
    if (rocks.some((q) => Math.hypot(x - q.x, z - q.z) < q.r + rad + 1.5)) return false;
    if (offRoad && roadDist(x, z) < rad + 3) return false;
    if (STREAM_ON && Math.abs(z - streamV) < rad + 9) return false;
    if (town.some((q) => Math.hypot(x - q.x, z - q.z) < rad + Math.max(q.nx, q.nz) * MASON.pitch / 2 + 2.5)) return false;
    return true;
  };
  // put: one entry down if it vets and the stone budget allows. Doors face
  // the cluster's center when one is given; door -1 templates keep no door.
  const put = (fk, x, z, opts) => {
    const tpl = F[fk];
    const swap = tpl.noswap ? false : r() < 0.5;
    const nx = swap ? tpl.nz : tpl.nx, nz = swap ? tpl.nx : tpl.nz;
    if (!vetAt(x, z, nx, nz, !(opts && opts.onRoad))) return null;
    const e = { id: tpl.t + bid++, x, z, nx, nz, ny: tpl.ny,
      door: tpl.door === -1 ? -1 : (opts && opts.face != null ? (x > opts.face.x ? 0 : nx - 1) : (r() < 0.5 ? 0 : nx - 1)),
      roof: tpl.roof, cols: tpl.cols, parts: tpl.parts, stones: tpl.stones, marker: tpl.marker,
      dead: opts && opts.dead ? true : undefined, form: opts && opts.form };
    const cost = stoneCount(e);
    if (plannedStones + cost > TOWN_STONE_CAP) return null;
    plannedStones += cost;
    town.push(e);
    return e;
  };
  // a child stands against its parent — tried on four sides, first that vets.
  const putChild = (fk, p, opts) => {
    const tpl = F[fk];
    // snug against the parent: the shared vet would push a child a building's
    // width away, so a child vets against everything EXCEPT its own parent.
    const gap = ((Math.max(p.nx, p.nz) + Math.max(tpl.nx, tpl.nz)) / 2) * MASON.pitch + 0.9;
    const s0 = Math.floor(r() * 4);
    for (let i = 0; i < 4; i++) {
      const a = ((s0 + i) % 4) * Math.PI / 2;
      const x = p.x + Math.sin(a) * gap, z = p.z + Math.cos(a) * gap;
      const swap = tpl.noswap ? false : r() < 0.5;
      const nx = swap ? tpl.nz : tpl.nx, nz = swap ? tpl.nx : tpl.nz;
      const pi = town.indexOf(p);
      const others = town.filter((q, qi) => qi !== pi);
      const rad = Math.max(nx, nz) * MASON.pitch / 2 + 2;
      if (x < -78 || x > 78 || z < -69 || z > 69) continue;
      if (passes.flat().some((g) => Math.abs(x - g.x) < rad + 4 && Math.abs(z - g.z) < 12)) continue;
      if (spawns.some((sp) => Math.hypot(x - sp.x, z - sp.z) < rad + 4)) continue;
      if (ponds.some((q) => Math.hypot(x - q.x, z - q.z) < q.r + rad + 3)) continue;
      if (rocks.some((q) => Math.hypot(x - q.x, z - q.z) < q.r + rad + 1.5)) continue;
      if (roadDist(x, z) < rad + 3) continue;
      if (STREAM_ON && Math.abs(z - streamV) < rad + 9) continue;
      if (others.some((q) => Math.hypot(x - q.x, z - q.z) < rad + Math.max(q.nx, q.nz) * MASON.pitch / 2 + 1.2)) continue;
      const e = { id: tpl.t + bid++, x, z, nx, nz, ny: tpl.ny, door: tpl.door === -1 ? -1 : (r() < 0.5 ? 0 : nx - 1),
        roof: tpl.roof, cols: tpl.cols, parts: tpl.parts, stones: tpl.stones, marker: tpl.marker,
        dead: opts && opts.dead ? true : undefined, form: opts && opts.form };
      const cost = stoneCount(e);
      if (plannedStones + cost > TOWN_STONE_CAP) return null;
      plannedStones += cost;
      town.push(e);
      return e;
    }
    return null;
  };
  // a cluster: a center form, then members rung around it. Returns the row
  // CLUSTERS carries so later work can name the ground.
  const cluster = (kind, centerFk, pool, nMin, nMax, seat, opts) => {
    for (let k = 0; k < 40; k++) {
      const cx = seat.x0 + r() * (seat.x1 - seat.x0), cz = seat.z0 + r() * (seat.z1 - seat.z0);
      if (opts && opts.nearRoad && roads.length && k < 25 && (roadDist(cx, cz) < 5 || roadDist(cx, cz) > 20)) continue;
      if (opts && opts.nearHill && hills.length && k < 25 && !hills.some((h) => Math.hypot(cx - h.u, cz - h.v) < h.r + 28)) continue;
      const cf = F[centerFk];
      if (!vetAt(cx, cz, cf.nx, cf.nz, true)) continue;
      const center = put(centerFk, cx, cz, opts && opts.dead ? { dead: true, form: "shell" } : null);
      if (!center) continue;
      if (cf.child) putChild(cf.child, center);
      const want = nMin + Math.floor(r() * (nMax - nMin + 1));
      let got = 0;
      for (let m = 0; m < want * 9 && got < want; m++) {
        const fk = pool[Math.floor(r() * pool.length)];
        const a = r() * 6.28, d = 7 + r() * 9;
        const dd = opts && opts.dead ? { dead: true, form: ["shell", "stump", "mound", "chimney"][Math.floor(r() * 4)] } : { face: center };
        const e = put(fk, cx + Math.sin(a) * d, cz + Math.cos(a) * d, dd);
        if (e) { got++; if (F[fk].child && !dd.dead) putChild(F[fk].child, e); }
      }
      const row = { kind, x: cx, z: cz, r: 18, n: got + 1 };
      CL.push(row);
      return row;
    }
    return null;
  };
  const midBench = benches[Math.floor(benches.length / 2)];
  // THE TOWN — one, near a road when the map drew one, the chapel (with its
  // tower or its graveyard) or the inn at the center, gateposts on the road.
  const centerPick = r();
  const townCenterFk = centerPick < 0.4 ? "chapel" : centerPick < 0.7 ? "inn" : "chapel";
  const TOWN_POOL = ["row", "house6", "house5", "croft", "long", "shed", "smithy", "cross"];
  let townRow = cluster("town", townCenterFk, TOWN_POOL,
    8, 12, { x0: -60, z0: midBench[0], x1: 60, z1: Math.max(midBench[0] + 4, midBench[1]) },
    roads.length ? { nearRoad: true } : null);
  // a refused middle bench does not leave the valley townless — every bench
  // gets its turn, roads-near first, then anywhere.
  for (let bi = 0; !townRow && bi < benches.length; bi++) {
    townRow = cluster("town", townCenterFk, TOWN_POOL,
      8, 12, { x0: -70, z0: benches[bi][0], x1: 70, z1: Math.max(benches[bi][0] + 4, benches[bi][1]) }, null);
  }
  if (townRow) {
    const ct = town.find((q) => Math.hypot(q.x - townRow.x, q.z - townRow.z) < 4);
    if (ct && ct.id.indexOf("chapel") === 0) putChild(centerPick < 0.4 ? "belltower" : "graveyard", ct);
    if (roads.length) { // the gateposts flank the road at the town's edge
      for (const sgn of [-1, 1]) {
        for (let g = 0; g < 12; g++) {
          const gx = townRow.x + (r() - 0.5) * 30, gz = townRow.z + (r() - 0.5) * 30;
          if (roadDist(gx, gz) > 4.5 || roadDist(gx, gz) < 2.5) continue;
          if (put("gatepost", gx, gz, { onRoad: true })) break;
        }
      }
    }
  }
  // THE HAMLETS — two or three, off the roads, crofts and sheds about a yard
  // or a well.
  const nHam = 3 + Math.floor(r() * 2);
  for (let h = 0; h < nHam; h++) {
    const b0 = Math.floor(r() * benches.length);
    const ctr = r() < 0.5 ? "yard" : "well";
    // a refused bench does not lose the hamlet — every bench gets its turn.
    for (let bi = 0; bi < benches.length; bi++) {
      const b = benches[(b0 + bi) % benches.length];
      if (cluster("hamlet", ctr, ["croft", "shed", "croft", "smithy"],
        3, 5, { x0: -70, z0: b[0], x1: 70, z1: Math.max(b[0] + 4, b[1]) }, null)) break;
    }
  }
  // THE DEAD HAMLETS — one or two, born ruins with a mound and a chimney,
  // against a hill when the map has one.
  const nDead = 1 + Math.floor(r() * 2);
  for (let h = 0; h < nDead; h++) {
    const bi = Math.floor(r() * benches.length);
    cluster("dead", "croft", ["croft", "shed", "house5"],
      2, 3, { x0: -70, z0: benches[bi][0], x1: 70, z1: Math.max(benches[bi][0] + 4, benches[bi][1]) },
      { dead: true, nearHill: hills.length > 0 });
  }
  // THE SINGLES — one to three lone forms on open ground.
  const nSingle = 2 + Math.floor(r() * 3);
  const SINGLES = ["mill", "keep", "watch", "granary", "long"];
  for (let i = 0, got = 0; i < 40 && got < nSingle; i++) {
    const bi = Math.floor(r() * benches.length);
    const x = -70 + r() * 140, z = benches[bi][0] + r() * Math.max(2, benches[bi][1] - benches[bi][0]);
    if (put(SINGLES[Math.floor(r() * SINGLES.length)], x, z, null)) got++;
  }
  // THE SPRINGHOUSE — beside the first pond, its own vet (it belongs at the
  // water the shared vet keeps everything else away from).
  if (ponds.length) {
    for (let g = 0; g < 12; g++) {
      const q = ponds[0], a = r() * 6.28;
      const sx = q.x + Math.sin(a) * (q.r + 2.2), sz = q.z + Math.cos(a) * (q.r + 2.2);
      const rad = F.spring.nx * MASON.pitch / 2 + 1;
      if (spawns.some((sp) => Math.hypot(sx - sp.x, sz - sp.z) < rad + 4)) continue;
      if (rocks.some((k) => Math.hypot(sx - k.x, sz - k.z) < k.r + rad + 1.5)) continue;
      if (roadDist(sx, sz) < rad + 3) continue;
      if (town.some((t2) => Math.hypot(sx - t2.x, sz - t2.z) < rad + Math.max(t2.nx, t2.nz) * MASON.pitch / 2 + 2)) continue;
      const e = { id: "spring" + bid++, x: sx, z: sz, nx: 2, nz: 2, ny: 2, door: 0, marker: true };
      const cost = stoneCount(e);
      if (plannedStones + cost > TOWN_STONE_CAP) break;
      plannedStones += cost; town.push(e);
      break;
    }
  }
  // THE FILL (mk2.64, owner: fill the valley with buildings) — after the
  // clusters, real houses join around the drawn centers until the valley
  // carries its mass. Markers and ruins are done; this pass lays LIVE forms
  // only, and stops at the fill line or when the ground refuses.
  const FILL_TARGET = 5200; // provisional (F5)
  const FILL_POOL = ["croft", "shed", "house5", "house6", "long", "row"];
  for (let k = 0; k < 2400 && plannedStones < FILL_TARGET && CL.length; k++) {
    const c = CL[Math.floor(r() * CL.length)];
    if (c.kind === "dead") continue;
    const a = r() * 6.28, d = 6 + r() * 26;
    const e = put(FILL_POOL[Math.floor(r() * FILL_POOL.length)], c.x + Math.sin(a) * d, c.z + Math.cos(a) * d, { face: c });
    if (e) c.n++;
  }
  // THE SECOND FILL (mk2.65): the clusters' rings run out of legal ground
  // long before the doubled line — the rest of the mass spreads across the
  // open valley, anywhere the vet allows.
  for (let k = 0; k < 3000 && plannedStones < FILL_TARGET; k++) {
    const x = -76 + r() * 152, z = -66 + r() * 126;
    put(FILL_POOL[Math.floor(r() * FILL_POOL.length)], x, z, null);
  }
  // T4: FIELD WALLS (owner's rulings: they block the grid; axis-aligned) —
  // freestanding masonry screens, 3-8 stones long, 2-4 courses, one stone
  // thick. Town entries like any building: footprint claim, ruin bookkeeping.
  const nWalls = 2 + Math.floor(r() * 4);
  for (let k = 0, placed = 0; k < 90 && placed < nWalls; k++) {
    const L = 3 + Math.floor(r() * 6), H = 2 + Math.floor(r() * 3);
    const swap = r() < 0.5;
    const nx = swap ? 1 : L, nz = swap ? L : 1;
    const x = -75 + r() * 150;
    const z = -66 + r() * 126;
    const rad = L * MASON.pitch / 2 + 1;
    if (passes.flat().some((g) => Math.abs(x - g.x) < rad + 4 && Math.abs(z - g.z) < 8)) continue;
    if (spawns.some((sp) => Math.hypot(x - sp.x, z - sp.z) < rad + 3)) continue;
    if (ponds.some((q) => Math.hypot(x - q.x, z - q.z) < q.r + rad + 2)) continue;
    if (rocks.some((q) => Math.hypot(x - q.x, z - q.z) < q.r + rad + 1.5)) continue;
    if (roadDist(x, z) < rad + 2.5) continue;
    if (town.some((q) => Math.hypot(x - q.x, z - q.z) < rad + Math.max(q.nx, q.nz) * MASON.pitch / 2 + 2)) continue;
    if (STREAM_ON && Math.abs(z - streamV) < rad + 9) continue;
    const eWall = { id: "fwall" + placed, x, z, nx, nz, ny: H, door: -1, roof: false };
    if (plannedStones + stoneCount(eWall) > TOWN_STONE_CAP) break; // mk2.64: the walls obey the ledger too
    plannedStones += stoneCount(eWall);
    town.push(eWall);
    placed++;
  }
  const T = (o) => { const w = fwdU(o.x, o.z); o.x = w.x; o.z = w.z; return o; };
  for (const k of rocks) T(k);
  for (const q of ponds) T(q);
  for (const t of town) { T(t); if (ORIENT % 2) { const nx0 = t.nx; t.nx = t.nz; t.nz = nx0; t.door = Math.min(t.door, t.nx - 1); } }
  const spawnU = spawns.map((sp) => sp.x);
  for (const sp of spawns) T(sp);
  for (const band of passes) for (const g of band) T(g);
  for (const route of roads) for (const pt of route) { const w = fwdU(pt[0], pt[1]); pt[0] = w.x; pt[1] = w.z; }
  for (const c of CL) { const w = fwdU(c.x, c.z); c.x = w.x; c.z = w.z; }
  return { seed, bands, passes, rocks, ponds, spawns, spawnU, town, roads, depotFoul, objU, objV, depotU1, depotU2, depotDepth, stream, hills, clusters: CL };
}
export function makeMap(seed) {
  for (let attempt = 0; attempt < 24; attempt++) {   // T2: wilder maps foul more — a deeper retry pocket
    const sd = seed + attempt * 7919;
    ORIENT = sd % 4;
    const m = genMap(sd);
    OBJ_POS = fwdU(m.objU, m.objV);                  // T2: the objective follows the DRAWN depot, set after genMap
    MAP_SEED = sd; BANDS = m.bands; PASSES = m.passes; ROCKS = m.rocks;
    PONDS = m.ponds; SPAWN_POINTS = m.spawns; TOWN = m.town; ROADS = m.roads;
    SPAWN_U = m.spawnU; STREAM = m.stream; HILLS = m.hills; CLUSTERS = m.clusters;
    const g = makeGrid(null);
    for (const t of TOWN) {
      if (t.dead && t.form !== "mound") continue; // T2: a born ruin blocks no cell — except the mound (owner): the router goes around
      const hx = (t.nx * MASON.pitch) / 2, hz = (t.nz * MASON.pitch) / 2;
      for (let gz = 0; gz < GRID_H; gz++) for (let gx = 0; gx < GRID_W; gx++) {
        const wp = g.gridToWorld(gx, gz);
        if (Math.abs(wp.x - t.x) < hx + 1.0 && Math.abs(wp.z - t.z) < hz + 1.0) {
          if (Math.hypot(wp.x - OBJ_POS.x, wp.z - OBJ_POS.z) < 5) continue;
          g.cells[g.idx(gx, gz)].blocked = true;
        }
      }
    }
    const og = g.worldToGrid(OBJ_POS.x, OBJ_POS.z);
    // T2: the enemy doorway derives from the DRAWN depot2 — 5m behind its center.
    const d2door = fwdU(m.depotU2, -m.depotDepth - 5);
    const dg = g.worldToGrid(d2door.x, d2door.z);
    // T2: the grown predicate — town minimum, no depot foul, explicit spacing
    // (guaranteed by construction, asserted anyway), both connectivities.
    if (TOWN.length >= 6 && !m.depotFoul &&
        Math.hypot(m.depotU1 - m.depotU2, 2 * m.depotDepth) >= 105 &&
        checkConnectivity(g, SPAWN_POINTS, og.gx, og.gz) &&
        checkConnectivity(g, SPAWN_POINTS, dg.gx, dg.gz)) return liveGameMap();
  }
  return liveGameMap(); // the deepest retry stands — return what was installed
}

// The GameMap (api.js part 1's typedef): the map frame as ONE object.
// makeMap returns it; the export-let shim above stays assigned in parallel
// for this phase (the extraction plan's step 2b migrates consumers; its
// closing task deletes the shim). assertMap and GAME_MAP_KEYS moved here
// verbatim from api.js part 3, which this change deletes.
export const GAME_MAP_KEYS = [
  "GRID_CS", "GRID_W", "GRID_H", "GRID_OX", "GRID_OZ", "ORIENT",
  "RIM_HALF_U", "RIM_HALF_V", "OBJ_POS", "SPAWN_POINTS", "PONDS", "ROCKS",
  "TOWN", "ROADS", "PASSES", "BANDS", "MAP_SEED", "SPAWN_U", "STREAM",
  "HILLS", "CLUSTERS",
  "fwdU", "invW", "fwdDir", "clampToRim", "pondAt", "rockAt", "streamAt", "stoneCount",
];

export function assertMap(map) {
  const missing = GAME_MAP_KEYS.filter((key) => !(key in map));
  if (missing.length) throw new Error("assertMap: missing " + missing.join(", "));
  if (!map.TOWN || map.TOWN.length === 0) throw new Error("assertMap: TOWN is empty — makeMap(seed) has not run");
  return map;
}

// liveGameMap: the module's current drawn state as a GameMap. Internal —
// makeMap's return is the door. The functions are the module's own (they
// read the live lets), so a map built here stays live with the shim; step
// 2b's consumers call them as map.<name> with identical behavior.
function liveGameMap() {
  return assertMap({
    GRID_CS, GRID_W, GRID_H, GRID_OX, GRID_OZ, ORIENT, RIM_HALF_U, RIM_HALF_V,
    OBJ_POS, SPAWN_POINTS, PONDS, ROCKS, TOWN, ROADS, PASSES, BANDS, MAP_SEED,
    SPAWN_U, STREAM, HILLS, CLUSTERS,
    fwdU, invW, fwdDir, clampToRim, pondAt, rockAt, streamAt, stoneCount,
  });
}

export function buildDepotTerrain(field, seed = 11) {
  const r = mulberry32(seed);
  const { n, cs, h, half } = field;
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const x = i * cs - half, z = j * cs - half;
    const cuv = invW(x, z);
    const stepUp = (v0, w, h2) => { const t = Math.min(1, Math.max(0, (cuv.v - v0) / w + 0.5)); return h2 * t * t * (3 - 2 * t); };
    let y = 2.0
      + Math.sin(x * 0.075 + 1.3) * 0.42
      + Math.cos(z * 0.061 - 0.6) * 0.38
      + Math.sin((x + z) * 0.032) * 0.30
      + (r() - 0.5) * 0.06;
    for (let bi = 0; bi < BANDS.length; bi++) y += stepUp(BANDS[bi] - 1, 10, 1.8 + 0.2 * (bi % 3));
    // T5: the high ground — the proving grounds' bump form, per drawn hill.
    for (const hb of HILLS) {
      const dh = ((cuv.u - hb.u) * (cuv.u - hb.u) + (cuv.v - hb.v) * (cuv.v - hb.v)) / (hb.r * hb.r);
      y += hb.h * Math.exp(-dh);
    }
    const over = Math.max(0, Math.abs(cuv.u) - RIM_HALF_U, Math.abs(cuv.v) - RIM_HALF_V);
    if (over > 0) y = Math.max(-6, y - over * over * 0.55);
    for (const k of ROCKS) {
      const d = Math.hypot(x - k.x, z - k.z) / k.r;
      if (d < 1.6) y += k.h * Math.exp(-d * d * 2.1);
    }
    for (const p of PONDS) {
      const d = Math.hypot(x - p.x, z - p.z);
      const lip = p.r + 4.5;
      if (d < lip) {
        const t = Math.min(1, (lip - d) / 4.5);
        y = y * (1 - t) + p.level * t;
      }
    }
    h[j * n + i] = y;
  }
  for (const t of TOWN) {
    const rad = Math.hypot(t.nx, t.nz) * MASON.pitch / 2 + (t.depot ? 4.0 : 2.0);
    const ph = h[Math.round((t.z + half) / cs) * n + Math.round((t.x + half) / cs)] + (t.depot ? 0.5 : 0);
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const x = i * cs - half, z = j * cs - half;
      const d = Math.hypot(x - t.x, z - t.z);
      if (d >= rad) continue;
      h[j * n + i] += (ph - h[j * n + i]) * Math.min(1, (rad - d) / 1.8);
    }
  }
  const maxStep = Math.tan(0.52) * cs, dStep = maxStep * Math.SQRT2;
  for (let pass = 0; pass < 3; pass++) {
    for (let j = 1; j < n - 1; j++) for (let i = 1; i < n - 1; i++) {
      const k = j * n + i;
      const lo = Math.min(h[k - 1], h[k + 1], h[k - n], h[k + n]) + maxStep;
      const lod = Math.min(h[k - n - 1], h[k - n + 1], h[k + n - 1], h[k + n + 1]) + dStep;
      const cap = Math.min(lo, lod);
      if (h[k] > cap) h[k] = cap;
    }
  }
  // T3: THE STREAM. Carved after the relax (banks stay banks), before the
  // roads (the causeway ramp smooths). Bed at 0.2, water at 0.78 — absolute
  // levels; base terrain never dips below ~0.9, so the plane stays banked.
  if (STREAM) {
    const P = STREAM.pts, W = STREAM.w;
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const x = i * cs - half, z = j * cs - half;
      const c = invW(x, z);
      let dS = 1e9;
      for (let k2 = 0; k2 + 1 < P.length; k2++) {
        const a = P[k2], b = P[k2 + 1];
        const du = b.u - a.u, dv = b.v - a.v;
        const t = Math.max(0, Math.min(1, ((c.u - a.u) * du + (c.v - a.v) * dv) / (du * du + dv * dv)));
        dS = Math.min(dS, Math.hypot(c.u - (a.u + du * t), c.v - (a.v + dv * t)));
      }
      if (dS >= W + 3) continue;
      const k = j * n + i;
      const target = dS < W ? 0.2 : 0.2 + ((dS - W) / 3) * (h[k] - 0.2);
      // the causeway: untouched within 3m of the crossing, full carve by 6m
      const cw = Math.min(1, Math.max(0, (Math.abs(c.u - STREAM.bridgeU) - 3) / 3));
      const carved = h[k] * (1 - cw) + Math.min(h[k], target) * cw;
      if (carved < h[k]) h[k] = carved;
    }
  }
  const segD = (x, z, a, b) => {
    const dx = b[0] - a[0], dz = b[1] - a[1];
    const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz)));
    return Math.hypot(x - (a[0] + dx * t), z - (a[1] + dz * t));
  };
  const onRoad = new Uint8Array(n * n);
  for (let j = 1; j < n - 1; j++) for (let i = 1; i < n - 1; i++) {
    const x = i * cs - half, z = j * cs - half;
    for (const route of ROADS) {
      for (let sgi = 0; sgi < route.length - 1 && !onRoad[j * n + i]; sgi++) {
        if (segD(x, z, route[sgi], route[sgi + 1]) < 4.5) onRoad[j * n + i] = 1;
      }
    }
  }
  const roadStep = Math.tan(0.10) * cs;
  for (let pass = 0; pass < 60; pass++) {
    for (let j = 1; j < n - 1; j++) for (let i = 1; i < n - 1; i++) {
      const k = j * n + i;
      if (!onRoad[k]) continue;
      const cap = Math.min(h[k - 1], h[k + 1], h[k - n], h[k + n]) + roadStep;
      if (h[k] > cap) h[k] = cap;
    }
  }
  field.dirty = true;
}
export function pondAt(x, z) { for (const p of PONDS) if (Math.hypot(x - p.x, z - p.z) < p.r) return p; return null; }
export function rockAt(x, z) { for (const k of ROCKS) if (Math.hypot(x - k.x, z - k.z) < k.r * 0.78) return k; return null; }

// THE STONE COUNT (Settled Ground T1, mk2.61): the planned stone cost of one
// town entry, by buildTown's OWN lay rules (DepotGame.jsx, the non-depot
// branch) — perimeter walls, interior columns, the granular roof, the door
// carve, the drive-through carve, the decay hash, the slab. mapgen plans in
// the currency the renderer pays. The two depots are the precast branch and
// are outside this count by design (the suite excludes them too).
// Mirror discipline: any change to buildTown's lay rules changes this
// function in the same task, and era 33's equality sweep is the proof.
export function stoneCount(t) {
  // BORN RUINS (T2, mk2.62): a dead entry plans by its ruin form's own lay.
  if (t.dead) {
    if (t.form === "chimney") return 5;
    if (t.form === "mound") {
      let n = 0;
      for (let ix = 0; ix < t.nx; ix++) for (let iz = 0; iz < t.nz; iz++) {
        const h = ((ix * 31 + iz * 7 + t.nx * 13) % 100) / 100;
        if (h < 0.55) n++;
        if (h < 0.2) n++;
      }
      return n;
    }
    if (t.form === "stump") {
      let n = t.ny;
      for (let ix = 0; ix < t.nx; ix++) for (let iz = 0; iz < t.nz; iz++) {
        const perim = ix === 0 || ix === t.nx - 1 || iz === 0 || iz === t.nz - 1;
        if (perim && !(ix === 0 && iz === 0)) n++;
      }
      return n;
    }
    const H = Math.min(3, t.ny); // the shell
    let n = 0;
    for (let ix = 0; ix < t.nx; ix++) for (let iy = 0; iy < H; iy++) for (let iz = 0; iz < t.nz; iz++) {
      const perim = ix === 0 || ix === t.nx - 1 || iz === 0 || iz === t.nz - 1;
      if (!perim) continue;
      if (ix === t.door && (iz === 1 || iz === 2) && iy <= 2) continue;
      if (iy === H - 1 && ((ix * 31 + iy * 17 + iz * 7) % 100) / 100 < 0.4) continue;
      n++;
    }
    layDressing(t, () => n++); // mk2.66: the shell's fallen roof and beam count
    return n;
  }
  const colAt = t.cols
    ? (() => {
        const c1x = Math.floor(t.nx / 3), c1z = Math.floor(t.nz / 3);
        const c2x = t.nx - 1 - c1x, c2z = t.nz - 1 - c1z;
        return (ix, iz) => (ix === c1x && iz === c1z) || (ix === c2x && iz === c2z);
      })()
    : () => false;
  const driveZ = t.drive && t.nz >= t.nx;
  let n = 0;
  for (let ix = 0; ix < t.nx; ix++) for (let iy = 0; iy <= t.ny; iy++) for (let iz = 0; iz < t.nz; iz++) {
    const perim = ix === 0 || ix === t.nx - 1 || iz === 0 || iz === t.nz - 1;
    const part = t.parts && t.parts.indexOf(ix) >= 0;
    const stone0 = t.stones && iy === 0 && !perim && ((ix * 31 + iz * 7) % 100) / 100 < 0.35;
    if (iy < t.ny && !perim && !colAt(ix, iz) && !part && !stone0) continue;
    const pitchedForm = /^(croft|shed|house|long|granary|mill|smithy|inn|spring|row|chapel|warehouse|watch)/.test(t.id || "");
    if (iy === t.ny && (t.roof === false || t.slab || pitchedForm)) continue; // mk2.66: NO STONE LIDS (owner) — plates on structure, never a layer of cubes
    if (t.cren && iy === t.ny && (!perim || (ix + iz) % 2)) continue; // mk2.66: the keep's crenellations
    if (ix === t.door && (iz === 1 || iz === 2) && iy <= 2) continue;
    if (t.drive && iy < t.ny - 1 && (driveZ
      ? (iz === 0 || iz === t.nz - 1) && ix >= 1 && ix <= t.nx - 2
      : (ix === 0 || ix === t.nx - 1) && iz >= 1 && iz <= t.nz - 2)) continue;
    if (t.ruin && ((ix * 31 + iy * 17 + iz * 7) % 100) / 100 < t.ruin && iy > 0) continue;
    n++;
  }
  if (t.slab) n++; // the slab is ONE body, counted like buildTown's grid3 counts it
  layDressing(t, () => n++); // mk2.66: every beam and plate counts — one walker, no drift
  return n;
}

// ========================================================== grid + flow
export function makeGrid(field) {
  const cells = new Array(GRID_W * GRID_H);
  for (let i = 0; i < cells.length; i++) cells[i] = { blocked: false, terrain: false, ice: false, dx: 0, dz: 0, dist: 1e9, wallId: null, building: null, bTeam: 0, steep: false, drop: false, bag: null, bagId: null };
  const G = {
    cells, w: GRID_W, h: GRID_H, cs: GRID_CS, ox: GRID_OX, oz: GRID_OZ,
    idx: (gx, gz) => gz * GRID_W + gx,
    worldToGrid: (x, z) => { const c = invW(x, z); return { gx: Math.floor((c.u - GRID_OX) / GRID_CS), gz: Math.floor((c.v - GRID_OZ) / GRID_CS) }; },
    gridToWorld: (gx, gz) => fwdU(GRID_OX + (gx + 0.5) * GRID_CS, GRID_OZ + (gz + 0.5) * GRID_CS),
    inBounds: (gx, gz) => gx >= 0 && gx < GRID_W && gz >= 0 && gz < GRID_H,
    cellAt(x, z) {
      const g = G.worldToGrid(x, z);
      if (!G.inBounds(g.gx, g.gz)) return null;
      return cells[G.idx(g.gx, g.gz)];
    },
  };
  for (let gz = 0; gz < GRID_H; gz++) for (let gx = 0; gx < GRID_W; gx++) {
    const wp = G.gridToWorld(gx, gz);
    const c = cells[G.idx(gx, gz)];
    if (rockAt(wp.x, wp.z)) { c.blocked = true; c.terrain = true; }
    else if (streamAt(wp.x, wp.z)) { c.blocked = true; c.water = true; }
    else if (pondAt(wp.x, wp.z)) c.ice = true;
  }
  // P7 T13: the terrain masks — steep ground a hull must not climb, cliff
  // lips a man must not walk off. Stamped once; craters do not restamp
  // (their ~0.5m sits under both thresholds). AMENDMENT 2: makeMap's
  // generation-time grid (makeGrid(null), ~line 309) carries no terrain
  // field and needs no masks — it only tests footprints; the guard keeps
  // its cells' steep/drop at their false defaults.
  if (field) stampTerrainMasks(G, field);
  return G;
}
// T3: is this WORLD point open water? Canonical distance to the stream
// centerline, minus the causeway exemption. The one water test everything
// reads — grid blocking, squad slots, order taps, placement.
export function streamAt(x, z) {
  if (!STREAM) return false;
  const c = invW(x, z);
  if (Math.abs(c.u - STREAM.bridgeU) < 3) return false; // the causeway
  const P = STREAM.pts;
  let best = 1e9;
  for (let i = 0; i + 1 < P.length; i++) {
    const a = P[i], b = P[i + 1];
    const du = b.u - a.u, dv = b.v - a.v;
    const t = Math.max(0, Math.min(1, ((c.u - a.u) * du + (c.v - a.v) * dv) / (du * du + dv * dv)));
    best = Math.min(best, Math.hypot(c.u - (a.u + du * t), c.v - (a.v + dv * t)));
  }
  return best < STREAM.w;
}
// T5: THE TREE PLAN — every tree a fresh boot plants, as data: the rim
// treeline, a copse on every hill's flanks, 2-5 drawn copses, 0-2 forests.
// Pure function of the regrown map on its own map-seed stream, so the test
// suite plans the exact trees the game plants. World coordinates out.
export function planTrees() {
  const rT = mulberry32(MAP_SEED ^ 0x517);
  const out = [];
  const roadD = (x, z) => {
    let best = 1e9;
    for (const route of ROADS) for (let i = 0; i + 1 < route.length; i++) {
      const a = route[i], b = route[i + 1];
      const dx = b[0] - a[0], dz = b[1] - a[1];
      const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz || 1)));
      best = Math.min(best, Math.hypot(x - (a[0] + dx * t), z - (a[1] + dz * t)));
    }
    return best;
  };
  const clearAt = (x, z) => {
    if (rockAt(x, z) || pondAt(x, z) || streamAt(x, z)) return false;
    if (SPAWN_POINTS.some((sp) => Math.hypot(x - sp.x, z - sp.z) < 4.5)) return false;
    if (roadD(x, z) < 3.5) return false;
    const c = invW(x, z);
    if (Math.abs(c.u) > 88 || Math.abs(c.v) > 88) return false;
    for (const t of TOWN) {
      if (Math.abs(x - t.x) < (t.nx * MASON.pitch) / 2 + 1.5 &&
          Math.abs(z - t.z) < (t.nz * MASON.pitch) / 2 + 1.5) return false;
    }
    return true;
  };
  // the rim treeline — the old edge dressing, kept (draws before tests, as before)
  for (let tu = -86; tu <= 86; tu += 1.6) {
    const w = fwdU(tu + (rT() - 0.5) * 1.6, -84.5 + rT() * 3.2);
    if (clearAt(w.x, w.z)) out.push({ x: w.x, z: w.z });
  }
  // a copse on every hill's flanks (the owner's wooded hills) — these RETRY
  // until planted (free stream) so a hill is never bald by bad luck.
  for (const hb of HILLS) {
    const n = 24 + Math.floor(rT() * 16);
    for (let i = 0, got = 0; i < 24 && got < n; i++) {
      const a = rT() * 6.28, rr = hb.r * (0.35 + rT() * 0.75);
      const w = fwdU(hb.u + Math.cos(a) * rr, hb.v + Math.sin(a) * rr);
      if (clearAt(w.x, w.z)) { out.push({ x: w.x, z: w.z }); got++; }
    }
  }
  // drawn copses: 2-5, anywhere clear on the map
  const nCop = 12 + Math.floor(rT() * 12);
  for (let c = 0; c < nCop; c++) {
    const cu = -78 + rT() * 156, cv = -78 + rT() * 156;
    const n = 10 + Math.floor(rT() * 10);
    for (let i = 0; i < n; i++) {
      const a = rT() * 6.28, rr = 1.5 + rT() * 4.5;
      const w = fwdU(cu + Math.cos(a) * rr, cv + Math.sin(a) * rr);
      if (clearAt(w.x, w.z)) out.push({ x: w.x, z: w.z });
    }
  }
  // rare forests: 0-2, 20-40 trees
  const nFor = 2 + Math.floor(rT() * 3);
  for (let f = 0; f < nFor; f++) {
    const fu = -72 + rT() * 144, fv = -72 + rT() * 144;
    const n = 20 + Math.floor(rT() * 21);
    for (let i = 0; i < n; i++) {
      const a = rT() * 6.28, rr = 2 + rT() * 9;
      const w = fwdU(fu + Math.cos(a) * rr, fv + Math.sin(a) * rr);
      if (clearAt(w.x, w.z)) out.push({ x: w.x, z: w.z });
    }
  }
  return out;
}
export function computeFlowField(grid, objGx, objGz) {
  const { cells } = grid;
  for (let i = 0; i < cells.length; i++) { cells[i].dist = 1e9; cells[i].dx = 0; cells[i].dz = 0; }
  if (!grid.inBounds(objGx, objGz)) return;
  const q = [{ gx: objGx, gz: objGz }];
  cells[grid.idx(objGx, objGz)].dist = 0;
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]];
  let head = 0;
  while (head < q.length) {
    const cur = q[head++];
    const cd = cells[grid.idx(cur.gx, cur.gz)].dist;
    for (const d of dirs) {
      const nx = cur.gx + d[0], nz = cur.gz + d[1];
      if (!grid.inBounds(nx, nz)) continue;
      const ni = grid.idx(nx, nz);
      if (cells[ni].blocked) continue;
      if (d[0] !== 0 && d[1] !== 0) {
        if (cells[grid.idx(cur.gx + d[0], cur.gz)].blocked || cells[grid.idx(cur.gx, cur.gz + d[1])].blocked) continue;
      }
      const step = (d[0] !== 0 && d[1] !== 0) ? 1.414 : 1;
      const nd = cd + step * (cells[ni].ice ? 0.72 : 1) * (cells[ni].drop ? 3 : 1);
      if (nd < cells[ni].dist - 1e-6) { cells[ni].dist = nd; q.push({ gx: nx, gz: nz }); }
    }
  }
  // mk1.96: THE SIEGE FLOW (owner — "Leave them a road" expunged). Ground the
  // objective cannot be reached from still owes the assault a direction: the
  // player's own masonry. Every unreachable open cell beside a player claim
  // (blocked, bTeam 1 — walls, towers, the depot's stones) seeds a second
  // flood at a 1e6 base — far under the 1e8 pathable line, far over any real
  // distance, and the two regions are sealed off from each other by
  // definition, so the floods never mix. The march walks its pseudo-flow to
  // the wall's face and halts there (a seed cell's descent rests at zero);
  // the guns, satchels and rams already know the rest. A breach re-floods
  // real distances through the gap on the standing recomputeFlow calls.
  const q2 = [];
  for (let gz = 0; gz < GRID_H; gz++) for (let gx = 0; gx < GRID_W; gx++) {
    const ci = grid.idx(gx, gz);
    if (cells[ci].blocked || cells[ci].dist < 1e8) continue;
    let seed = false;
    for (const d of dirs) {
      const nx = gx + d[0], nz = gz + d[1];
      if (!grid.inBounds(nx, nz)) continue;
      const nc = cells[grid.idx(nx, nz)];
      if (nc.blocked && nc.bTeam === 1) { seed = true; break; }
    }
    if (seed) { cells[ci].dist = 1e6; q2.push({ gx, gz }); }
  }
  head = 0;
  while (head < q2.length) {
    const cur = q2[head++];
    const cd = cells[grid.idx(cur.gx, cur.gz)].dist;
    for (const d of dirs) {
      const nx = cur.gx + d[0], nz = cur.gz + d[1];
      if (!grid.inBounds(nx, nz)) continue;
      const ni = grid.idx(nx, nz);
      if (cells[ni].blocked) continue;
      if (d[0] !== 0 && d[1] !== 0) {
        if (cells[grid.idx(cur.gx + d[0], cur.gz)].blocked || cells[grid.idx(cur.gx, cur.gz + d[1])].blocked) continue;
      }
      const step = (d[0] !== 0 && d[1] !== 0) ? 1.414 : 1;
      const nd = cd + step * (cells[ni].ice ? 0.72 : 1) * (cells[ni].drop ? 3 : 1);
      if (nd < cells[ni].dist - 1e-6) { cells[ni].dist = nd; q2.push({ gx: nx, gz: nz }); }
    }
  }
  for (let gz = 0; gz < GRID_H; gz++) for (let gx = 0; gx < GRID_W; gx++) {
    const ci = grid.idx(gx, gz);
    if (cells[ci].blocked || cells[ci].dist >= 1e8) continue;
    let bestD = cells[ci].dist, bx = 0, bz = 0;
    for (const d of dirs) {
      const nx = gx + d[0], nz = gz + d[1];
      if (!grid.inBounds(nx, nz)) continue;
      const nd = cells[grid.idx(nx, nz)].dist;
      if (nd < bestD) { bestD = nd; bx = d[0]; bz = d[1]; }
    }
    const L = Math.hypot(bx, bz) || 1;
    cells[ci].dx = bx / L; cells[ci].dz = bz / L;
  }
}
export function checkConnectivity(grid, spawns, objGx, objGz) {
  const visited = new Uint8Array(grid.w * grid.h);
  const q = [{ gx: objGx, gz: objGz }];
  visited[grid.idx(objGx, objGz)] = 1;
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  let head = 0;
  while (head < q.length) {
    const cur = q[head++];
    for (const d of dirs) {
      const nx = cur.gx + d[0], nz = cur.gz + d[1];
      if (!grid.inBounds(nx, nz)) continue;
      const ni = grid.idx(nx, nz);
      if (visited[ni] || grid.cells[ni].blocked) continue;
      visited[ni] = 1; q.push({ gx: nx, gz: nz });
    }
  }
  for (const sp of spawns) {
    const g = grid.worldToGrid(sp.x, sp.z);
    if (!grid.inBounds(g.gx, g.gz)) continue;
    if (!visited[grid.idx(g.gx, g.gz)]) return false;
  }
  return true;
}
// THE CARPENTER (mk2.66, owner): every beam, plate, and trim body a form
// wears, as ONE walker shared by buildTown (which lays real bodies) and
// stoneCount (which counts them) — plan and lay cannot drift by construction.
// THE BEAM is the working member: a long narrow box, shrunk or grown — ridge
// beams, lintels, sail arms, joists, posts, the windlass, the bell's yoke.
// NO STONE LIDS (owner): no roof is a layer of cubes; every roof is plates
// on structure. All dials provisional (F5).
export function formOf(t) { return (t.id || "").replace(/[0-9]+$/, ""); }
export function layDressing(t, put) {
  const f = formOf(t);
  const p = MASON.pitch, hcs = MASON.hcs;
  const L = Math.max(t.nx, t.nz), W = Math.min(t.nx, t.nz);
  const ridgeX = t.nx >= t.nz;
  const topY = t.ny * p;
  const beam = (dx, dy, dz, hx, hy, hz, axis, angle, mass) =>
    put({ dx, dy, dz, hx, hy, hz, axis, angle, tint: "timber", mass: mass || 140 });
  // the doorway: a lintel beam over the opening, and a timber door ajar.
  const doorway = () => {
    if (t.door == null || t.door < 0) return;
    const dxs = (t.door - (t.nx - 1) / 2) * p;
    const zc = (1.5 - (t.nz - 1) / 2) * p;
    beam(dxs, p * 2.3, zc, 0.09, 0.08, p * 1.35, null, 0, 90);           // the lintel — inside the opening, clear of the course above
    put({ dx: dxs, dy: p * 0.9, dz: zc, hx: 0.08, hy: p * 0.95, hz: p * 0.8,
      axis: "y", angle: 0.5, tint: "timber", mass: 90 });                 // the door, ajar
  };
  // the pitched roof: stepped stone gables, a RIDGE BEAM, two tilted plates
  // welded along it. The beam is the spine — shoot it out and the roof slumps.
  const pitched = (steep) => {
    const H = Math.max(1, Math.floor(W / 2));
    const ridgeH = H * p * (steep ? 1.25 : 0.85);
    const ang = Math.atan2(ridgeH, (W * p) / 2);
    for (let end = 0; end < 2; end++) {
      const e = end === 0 ? -(L - 1) / 2 : (L - 1) / 2;
      for (let st = 1; st <= H; st++) for (let j = st; j <= W - 1 - st; j++) {
        const w0 = (j - (W - 1) / 2) * p;
        put({ dx: ridgeX ? e * p : w0, dy: topY + (st - 1) * p, dz: ridgeX ? w0 : e * p,
          hx: hcs, hy: hcs, hz: hcs, stone: true });
      }
    }
    const rl = (L * p) / 2 + 0.3;
    beam(0, topY - hcs + ridgeH + 0.02, 0, ridgeX ? rl : 0.09, 0.09, ridgeX ? 0.09 : rl, null, 0, 160);
    const slope = Math.hypot((W * p) / 2, ridgeH) / 2 + 0.25;
    for (const sgn of [-1, 1]) {
      const off = sgn * (W * p) / 4;
      put({ dx: ridgeX ? 0 : off, dy: topY - hcs + ridgeH / 2 + 0.10, dz: ridgeX ? off : 0,
        hx: ridgeX ? (L * p) / 2 + 0.2 : slope, hy: 0.06, hz: ridgeX ? slope : (L * p) / 2 + 0.2,
        axis: ridgeX ? "x" : "z", angle: sgn * ang * (ridgeX ? 1 : -1), tint: "roof", mass: 320 });
    }
    return ridgeH;
  };
  if (t.depot) return;
  if (t.dead) {
    if (t.form === "shell") {   // the fallen roof, and its fallen ridge beam
      put({ dx: 0, dy: 1.05, dz: 0, hx: (Math.max(2, L - 2) * p) / 2, hy: 0.06, hz: (Math.max(1.5, W - 2) * p) / 2,
        axis: ridgeX ? "x" : "z", angle: 0.45, tint: "roof", mass: 320 });
      beam(ridgeX ? 0 : 0.6, 0.55, ridgeX ? 0.6 : 0, ridgeX ? (L * p) / 3 : 0.08, 0.08, ridgeX ? 0.08 : (L * p) / 3, ridgeX ? "z" : "x", 0.25, 120);
    }
    return;
  }
  if (f === "croft" || f === "shed" || f === "granary" || f === "spring") { pitched(false); doorway(); return; }
  if (f === "house" || f === "long") { pitched(false); doorway(); return; }
  if (f === "chapel") { pitched(true); doorway(); return; }
  if (f === "keep") { doorway(); return; }   // crenellations lay in the lattice; open ring, no lid
  if (f === "smithy") {                       // the framed awning: posts, eave beam, plate
    pitched(false); doorway();
    const aw = (L * p) / 2 - 0.2, az = -((W * p) / 2 + 0.75);
    beam(-aw + 0.2, p * 1.15, az, 0.08, p * 1.15, 0.08, null, 0, 70);
    beam(aw - 0.2, p * 1.15, az, 0.08, p * 1.15, 0.08, null, 0, 70);
    beam(0, p * 2.3, az, aw, 0.07, 0.07, null, 0, 90);
    put({ dx: 0, dy: p * 2.45, dz: az + 0.35, hx: aw, hy: 0.05, hz: 0.95, axis: "x", angle: -0.3, tint: "roof", mass: 140 });
    return;
  }
  if (f === "inn") {                          // the bracket beam and the hung sign
    pitched(false); doorway();
    beam((t.nx * p) / 2 + 0.45, p * 2.6, 0, 0.45, 0.07, 0.07, null, 0, 60);
    put({ dx: (t.nx * p) / 2 + 0.75, dy: p * 2.1, dz: 0, hx: 0.30, hy: 0.24, hz: 0.05, tint: "timber", mass: 40 });
    return;
  }
  if (f === "row") {                          // the stepped roofline, a ridge beam per segment
    const segs = [[0, 2], [3, 5], [6, t.nx - 1]];
    const H = Math.max(1, Math.floor(t.nz / 2));
    for (let si = 0; si < segs.length; si++) {
      const [a, b] = segs[si];
      const segL = (b - a + 1) * p, cx = ((a + b) / 2 - (t.nx - 1) / 2) * p;
      const ridgeH = H * p * 0.85 + (si % 2 ? 0.3 : 0);
      const ang = Math.atan2(ridgeH, (t.nz * p) / 2);
      const slope = Math.hypot((t.nz * p) / 2, ridgeH) / 2 + 0.2;
      beam(cx, topY - hcs + ridgeH + 0.02, 0, segL / 2 + 0.1, 0.08, 0.08, null, 0, 140);
      for (const sgn of [-1, 1]) {
        put({ dx: cx, dy: topY - hcs + ridgeH / 2 + 0.10, dz: sgn * (t.nz * p) / 4,
          hx: segL / 2 + 0.1, hy: 0.06, hz: slope, axis: "x", angle: sgn * ang, tint: "roof", mass: 300 });
      }
    }
    doorway();
    return;
  }
  if (f === "mill") {                         // THE FOUR SAILS: hub stone, four arm beams, four sail plates
    const rh = pitched(false); doorway();
    const face = ridgeX ? 1 : 0;              // the sails hang on a short-axis face
    const fy = topY + rh - 0.1, armL = 2.1;
    const fx = face ? 0 : (t.nx * p) / 2 + 0.16, fz = face ? (t.nz * p) / 2 + 0.16 : 0;
    put({ dx: fx, dy: fy, dz: fz, hx: 0.22, hy: 0.22, hz: 0.22, tint: "timber", mass: 120 }); // the hub
    for (const a of [0.785, 2.356, 3.927, 5.498]) {
      const ux = face ? Math.sin(a) : 0, uy = Math.cos(a), uz = face ? 0 : Math.sin(a);
      beam(fx + ux * (armL / 2 + 0.25), fy + uy * (armL / 2 + 0.25), fz + uz * (armL / 2 + 0.25),
        0.06, armL / 2, 0.06, face ? "z" : "x", face ? -a : a, 70);
      put({ dx: fx + ux * (armL * 0.72 + 0.25), dy: fy + uy * (armL * 0.72 + 0.25), dz: fz + uz * (armL * 0.72 + 0.25),
        hx: face ? 0.30 : 0.045, hy: armL * 0.30, hz: face ? 0.045 : 0.30,
        axis: face ? "z" : "x", angle: face ? -a : a, tint: "timber", mass: 50 });
    }
    return;
  }
  if (f === "belltower" || f === "watch") {   // the pyramid cap; the tower's own bell on its yoke
    const half = (t.nx * p) / 2;
    for (const [ax, sgn] of [["x", 1], ["x", -1], ["z", 1], ["z", -1]]) {
      put({ dx: ax === "z" ? sgn * half * 0.5 : 0, dy: topY + 0.35, dz: ax === "x" ? sgn * half * 0.5 : 0,
        hx: ax === "x" ? half : half * 0.55, hy: 0.05, hz: ax === "z" ? half : half * 0.55,
        axis: ax, angle: sgn * 0.7, tint: "roof", mass: 120 });
    }
    if (f === "belltower") {
      beam(0, topY - p * 0.6, 0, half - 0.05, 0.07, 0.07, null, 0, 60);   // the yoke
      put({ dx: 0, dy: topY - p * 1.15, dz: 0, hx: 0.16, hy: 0.20, hz: 0.16, tint: "timber", mass: 80 }); // the bell
    }
    return;
  }
  if (f === "well") {                         // posts, the windlass crossbar, the little roof
    beam(-(t.nx * p) / 2 + 0.1, p * 1.6, 0, 0.07, p * 1.6, 0.07, null, 0, 60);
    beam((t.nx * p) / 2 - 0.1, p * 1.6, 0, 0.07, p * 1.6, 0.07, null, 0, 60);
    beam(0, p * 2.5, 0, (t.nx * p) / 2 - 0.05, 0.06, 0.06, null, 0, 50); // the windlass
    for (const sgn of [-1, 1]) {
      put({ dx: 0, dy: p * 3.1, dz: sgn * (t.nz * p) / 4, hx: (t.nx * p) / 2 + 0.25, hy: 0.05, hz: 0.65,
        axis: "x", angle: sgn * 0.6, tint: "roof", mass: 90 });
    }
    return;
  }
  if (f === "warehouse") {                    // plank roof on joists — the lid is gone
    const jl = ridgeX ? (W * p) / 2 + 0.2 : (L * p) / 2 + 0.2;
    for (const e of [-1, 1]) {
      const off = e * (L * p) / 4;
      beam(ridgeX ? off : 0, topY - hcs + 0.08, ridgeX ? 0 : off, ridgeX ? 0.09 : jl, 0.09, ridgeX ? jl : 0.09, null, 0, 180);
    }
    for (const k of [-1, 0, 1]) {
      const off = k * (L * p) / 3.2;
      put({ dx: ridgeX ? off : 0, dy: topY - hcs + 0.26, dz: ridgeX ? 0 : off,
        hx: ridgeX ? (L * p) / 6.2 : jl, hy: 0.05, hz: ridgeX ? jl : (L * p) / 6.2,
        axis: ridgeX ? "x" : "z", angle: 0.06, tint: "roof", mass: 260 });
    }
    return;
  }
  if (f === "hangar") {                       // header beams over the drive openings, doors below
    const driveZ = t.drive && t.nz >= t.nx;
    const span = ((driveZ ? t.nx : t.nz) - 2) * p; // the OPENING's width — the leaves live between the jambs, never against them
    for (const end of [-1, 1]) {
      const e = end * ((driveZ ? t.nz : t.nx) - 1) / 2 * p;
      beam(driveZ ? 0 : e, (t.ny - 1) * p - 0.45, driveZ ? e : 0, driveZ ? span / 2 - 0.2 : 0.1, 0.08, driveZ ? 0.1 : span / 2 - 0.2, null, 0, 220);
      for (const half of [-1, 1]) {
        const lh = ((t.ny - 1) * p) / 2 - 0.35;
        put({ dx: driveZ ? half * span / 4 : e, dy: lh + 0.18, dz: driveZ ? e : half * span / 4,
          hx: driveZ ? span / 4 - 0.1 : 0.07, hy: lh, hz: driveZ ? 0.07 : span / 4 - 0.1,
          axis: "y", angle: half === end ? 0.7 : 0, tint: "timber", mass: 400 });
      }
    }
    return;
  }
  if (f === "gatepost") {                     // each post hangs its gate leaf
    put({ dx: 0.55, dy: p * 1.4, dz: 0, hx: 0.5, hy: p * 1.3, hz: 0.05, axis: "y", angle: 0.5, tint: "timber", mass: 120 });
    return;
  }
}
