# Task 0.0.55-1 — save carved out

One job: move `save` into its own module and leave the depot a one-line front door. Write exactly what is written, run the listed gates, report. You design nothing.

Suggested model: Sonnet 5.

Required reading, in order (confirm at the top of your report):
1. This file, whole.
2. `docs/plans/phase-0.0.55-save.md`, whole.

## Steps

Run from `/home/batman/combo-engine`. A failed assert stops the task; report the step and its verbatim output, run nothing further.

1. Assert the ground:

```sh
sha256sum src/depot/save.js   # must print af42dce82233281ea4ac4cf8180b9f55ad37f4233893bca6a2633d6b2a1a8281
node scripts/gate.mjs combat | tail -1   # must print: ALL PASS
ls src/modules/save 2>/dev/null || echo absent   # must print: absent
mkdir -p src/modules/save
```

2. Write `src/modules/save/save.js`, exactly (the source file with its import paths rewritten — the one substitution):

```js
// COLDSNAP DEPOT — save.js: the front, kept.
//
// ONE SLOT. The bell writes it, a loss or a victory burns it, and the start
// screen's RESUME FRONT is the only thing that reads it back. Everything here
// is plain data: no functions, no closures, no live references. What comes out
// of restore() is enough for DepotGame.jsx to boot a world that IS the one the
// player left — same ground, same craters, same men, same scrap, same unlocks.
//
// THE THREE LAWS THIS FILE LIVES UNDER
//
// 1. THE MAP IS NOT SAVED — IT IS REGROWN. genMap/makeMap are pure functions
//    of MAP_SEED (rocks, ponds, roads, town layouts, ORIENT, spawn points all
//    fall out of it), so the save stores the seed and DepotGame rebuilds the
//    map from it. Only what the WAR did to that map is stored: the
//    heightfield (craters, breached ridges) goes back over the rebuilt terrain
//    afterwards.
//
// 2. THE RNG IS RESEEDED, NOT RESUMED. mulberry32's internal state is closure-
//    hidden by design and there is no honest way to read it out. So at save
//    time the stream is drawn from ONCE and that value becomes the resumed
//    run's seed. It is a real draw and it is unconditional: exactly one per
//    bell, every bell, because the save happens at every bell. A resumed run
//    is internally deterministic from that seed; it intentionally diverges
//    from the run that was never interrupted. A return, not a replay.
//
// 3. BODY IDS ARE NOT STABLE. addBody hands out fresh ids on restore, so
//    nothing in the file refers to a body by id — every body reference is an
//    INDEX into the saved body array (welds, the sniper's pairId, squad
//    rosters, the depot censuses). Targeting caches (targetId/tgtId) are not
//    saved at all: they revalidate on the first tick.
//
// WHAT IS DELIBERATELY LOST (ratified, stated in the plan's Part One):
//   - scorch and tread staining (the smear ledger IS saved and replayed)
//   - rounds in flight at the bell (the muster's assault has not fired yet)
//   - the half-elapsed bell countdown: a resumed cycle restarts at the full
//     BELL_PERIOD_S. Simpler and kinder than restoring a partial timer.
import { addBody, addWeld } from "../../engine/core.js";
import { MK } from "../../version.js";
import { storage } from "../../platform/storage.js";

export const SAVE_KEY = "coldsnap-front-save";

// Rounding: the file is JSON and full float precision triples its size for
// nothing a player could ever see. Positions/heights to the millimetre,
// orientation/inertial values to 1e-4.
const r3 = (n) => Math.round(n * 1000) / 1000;
const r4 = (n) => Math.round(n * 10000) / 10000;

// ------------------------------------------------------------------ bodies
// Fields handled explicitly (or deliberately dropped) by the body writer.
// Everything else on a body is swept up generically into `x` — so a field
// added by a later task rides along without this file having to know about
// it. The drops: engine-derived matrices (rebuilt by makeBody), damage
// bookkeeping that revalidates, and every id-bearing cache.
const BODY_HANDLED = new Set([
  "id", "seq", "kind", "team", "tag", "mass", "invM", "invIb", "invIw", "R",
  "hx", "hy", "hz", "hp", "friction", "restitution", "alive", "sleeping",
  "pos", "q", "v", "w", "home", "gpos", "rockRef", "pairId",
  "lastImp", "lastHit", "driver", "_paceHit", "_coverHit", "targetId", "tgtId",
  "_filed", "_cells", // mk1.05's broadphase bookkeeping — NEVER saved: a restored
                      // stone marked filed against an empty book is a ghost (P7 T5)
  "_pp", "_ppT", "_backT", "_avoid", "_stuckN", // P7 T13: transient driving
                      // state — a resumed hull re-measures fresh
  "_yield", "_yieldHome", "_brakeT", // P7 T16: traffic transients — yields
                      // and patience re-measure fresh
]);

// A value the file can carry: a finite number, a string, a boolean, null, an
// array of finite numbers, or a flat object of finite numbers (goal/_standPt/
// driverSpec all have that shape). Anything else — a live body reference, a
// function, a nested structure — is skipped, and skipping is safe by
// construction: every such field in the depot layer is a cache that rebuilds.
function plainValue(v) {
  const t = typeof v;
  if (t === "number") return Number.isFinite(v) ? r4(v) : undefined;
  if (t === "string" || t === "boolean") return v;
  if (v === null) return null;
  if (Array.isArray(v)) return v.every((n) => typeof n === "number" && Number.isFinite(n)) ? v.map(r4) : undefined;
  if (t === "object") {
    const keys = Object.keys(v);
    if (!keys.length) return undefined;
    if (!keys.every((k) => typeof v[k] === "number" && Number.isFinite(v[k]))) return undefined;
    const o = {};
    for (const k of keys) o[k] = r4(v[k]);
    return o;
  }
  return undefined;
}

function writeBody(b, idx, rockIdx) {
  const o = {
    k: b.kind, tm: b.team, m: b.mass,
    h: [r4(b.hx), r4(b.hy), r4(b.hz)],
    p: [r3(b.pos.x), r3(b.pos.y), r3(b.pos.z)],
    hp: Number.isFinite(b.hp) ? r3(b.hp) : b.hp,
  };
  if (b.tag) o.tag = b.tag;
  if (b.q.x || b.q.y || b.q.z || b.q.w !== 1) o.q = [r4(b.q.x), r4(b.q.y), r4(b.q.z), r4(b.q.w)];
  if (b.v.x || b.v.y || b.v.z) o.v = [r3(b.v.x), r3(b.v.y), r3(b.v.z)];
  if (b.w.x || b.w.y || b.w.z) o.av = [r3(b.w.x), r3(b.w.y), r3(b.w.z)];
  if (b.friction !== 0.6) o.fr = r4(b.friction);
  if (b.restitution !== 0.05) o.rs = r4(b.restitution);
  if (!b.alive) o.dead = 1;
  if (b.sleeping) o.slp = 1;
  // b.home is the census stamp — where this stone was BUILT. It is the whole
  // basis of the standing/rubble verdict, so it must survive verbatim: a
  // re-census on resume would record a displaced stone's new spot as its home
  // and quietly forgive every hit the depot has taken.
  if (b.home) o.hm = [r3(b.home.x), r3(b.home.y), r3(b.home.z)];
  if (b.gpos) o.g = b.gpos.slice();
  // rockRef is a live reference into the map's ROCKS array (breachRock finds
  // it by identity) — stored as the array index and re-linked on restore.
  if (b.rockRef && rockIdx.has(b.rockRef)) o.rk = rockIdx.get(b.rockRef);
  if (b.pairId != null && idx.has(b.pairId)) o.pr = idx.get(b.pairId);
  const x = {};
  let any = false;
  for (const key in b) {
    if (BODY_HANDLED.has(key)) continue;
    const val = plainValue(b[key]);
    if (val === undefined) continue;
    x[key] = val; any = true;
  }
  if (any) o.x = x;
  return o;
}

function readBody(world, s, rocks) {
  const b = addBody(world, {
    kind: s.k, team: s.tm, tag: s.tag, mass: s.m,
    hx: s.h[0], hy: s.h[1], hz: s.h[2],
    x: s.p[0], y: s.p[1], z: s.p[2], hp: s.hp,
    friction: s.fr, restitution: s.rs,
    q: s.q ? { x: s.q[0], y: s.q[1], z: s.q[2], w: s.q[3] } : undefined,
  });
  if (s.v) { b.v.x = s.v[0]; b.v.y = s.v[1]; b.v.z = s.v[2]; }
  if (s.av) { b.w.x = s.av[0]; b.w.y = s.av[1]; b.w.z = s.av[2]; }
  if (s.dead) b.alive = false;
  // SLEEPING IS LOAD-BEARING, NOT COSMETIC. The two depots plus the village
  // are ~1,150 chunk bodies that sit asleep; restoring them awake would put
  // every one of them into the integrator on frame one — the C0 baseline
  // measured that cliff at ~450ms frames. Restore it exactly.
  if (s.slp) b.sleeping = true;
  if (s.hm) b.home = { x: s.hm[0], y: s.hm[1], z: s.hm[2] };
  if (s.g) b.gpos = s.g.slice();
  if (s.rk != null && rocks[s.rk]) b.rockRef = rocks[s.rk];
  if (s.x) for (const k in s.x) b[k] = s.x[k];
  // Targeting caches revalidate on the first scan — a restored sticky target
  // would be an id from a world that no longer exists.
  b.targetId = null; b.tgtId = null;
  // The broadphase re-files restored sleepers itself — a carried _filed
  // would tell it not to (the resume ghost, P7 T5).
  b._filed = false; b._cells = null;
  return b;
}

// ---------------------------------------------------------------- the write
// serializeFront(ctx) -> JSON string. SYNCHRONOUS and allocation-cheap by
// design: the caller runs this inside the bell tick and hands the string to
// storage.set fire-and-forget, so nothing awaits inside a frame.
//
// ctx:
//   S        the run state (DepotGame's ref-state object)
//   world    the live world (t, bodies, welds)
//   T        the territory field
//   town     buildTown's output (per-building ruined/n0 bookkeeping)
//   census   / census2  the two depot censuses (id + built-home rows)
//   rocks    the map's ROCKS array (for rockRef indices)
//   smears   the renderer's smear ledger (R._splat.log)
//   mapSeed  MAP_SEED — the map regrows from this
//   rngSeed  the ONE draw taken from world.rng by the caller (law 2 above)
export function serializeFront(ctx) {
  const { S, world, T, town, census, census2, rocks, smears, mapSeed, rngSeed } = ctx;

  // THE MECH's pieces are not loose boxes (Phase E, mk1.92): a live mech's
  // links carry mechRef and are skipped here — the mechs[] row below writes
  // the whole machine as one entity. A DEAD mech's pieces have had mechRef
  // stripped (the death block, Phase F) and ride this generic sweep as
  // plain boxes — a wreck is a wreck.
  const list = world.bodies.filter((b) => !b.mechRef);
  const idx = new Map();
  for (let i = 0; i < list.length; i++) idx.set(list[i].id, i);
  const rockIdx = new Map();
  for (let i = 0; i < rocks.length; i++) rockIdx.set(rocks[i], i);

  const bodies = new Array(list.length);
  for (let i = 0; i < list.length; i++) bodies[i] = writeBody(list[i], idx, rockIdx);

  // Welds by INDEX PAIR. rA/rB (the per-body anchor offsets addWeld derives
  // from the pose at weld time) travel with them so a lattice caught
  // mid-collapse restores with the exact joint it had, not one re-derived
  // from its current, displaced pose.
  const welds = [];
  for (const w of world.welds) {
    const a = idx.get(w.a.id), b = idx.get(w.b.id);
    if (a == null || b == null) continue;
    const row = { a, b, f: w.breakF, ra: [r4(w.rA.x), r4(w.rA.y), r4(w.rA.z)], rb: [r4(w.rB.x), r4(w.rB.y), r4(w.rB.z)], t: r3(w.born) };
    if (w.broken) row.br = 1;
    welds.push(row);
  }

  // The census rows keep their ORDER and their count. A row whose stone is
  // gone from the world entirely (welded off and swept) is written as -1:
  // depotStandingFraction already reads "no live body" as not-standing, and
  // dropping the row instead would quietly heal the depot.
  // P7 T6: the row's mass (`m`, stamped by censusDepotChunks) rides too —
  // it feeds the weighted standing fraction, and dropping it on save would
  // quietly revert every resumed war to the old unweighted arithmetic.
  // Omitted for rows with no mass (pre-T6 synthetic callers) — restoreCensus
  // mirrors the omission and depotStandingFraction's `c.m || 1` covers it.
  const cens = (rows) => (rows || []).map((c) => {
    const i = idx.has(c.id) ? idx.get(c.id) : -1;
    const o = { i, h: [r3(c.home.x), r3(c.home.y), r3(c.home.z)] };
    if (c.m != null) o.m = r3(c.m);
    return o;
  });

  const heights = new Array(world.field.h.length);
  for (let i = 0; i < heights.length; i++) heights[i] = r3(world.field.h[i]);
  const terr = new Array(T.v.length);
  for (let i = 0; i < terr.length; i++) terr[i] = r4(T.v[i]);

  // The squad serializer is generic over the squad object: every plain scalar
  // field rides along without this file knowing what it is.
  //
  // THE BUILD LINE IS DELIBERATELY NOT SAVED (P1.5 T4, mk0.60, ratified as
  // "reset on resume"). A half-laid line's job (sq._build) is a mixed
  // object — kind string, per-cell rows — so plainValue drops it, and that IS
  // the chosen behaviour rather than an oversight. What survives is everything
  // that matters: the pieces already laid are ordinary bodies in the file, and
  // the squad comes back still ordered "build" with its dest, so the men finish
  // the walk and dig in at the far end exactly as they would have. They just
  // stop laying — the order is forgotten, the work is not.
  const squadRow = (sq) => {
    const o = { members: sq.memberIds.map((id) => (idx.has(id) ? idx.get(id) : -1)).filter((i) => i >= 0) };
    for (const key in sq) {
      if (key === "memberIds" || key === "_legTarget" || key === "_avoid") continue; // the leg target is a per-leg cache; it re-derives
                      // _avoid: traffic scratch, re-marks live
      const val = plainValue(sq[key]);
      if (val === undefined) continue;
      o[key] = val;
    }
    return o;
  };

  const data = {
    mk: MK,
    at: S.bell,                       // the bell this save was taken at (display/diagnostics)
    map: { seed: mapSeed },
    rng: { seed: rngSeed },
    world: { t: r3(world.t) },
    field: { n: world.field.n, h: heights },
    terr: { nx: T.nx, nz: T.nz, v: terr },
    run: {
      resources: r3(S.resources), spawnRR: S.spawnRR,
      score: { pk: S.score.p.kills, pv: r3(S.score.p.value), ek: S.score.e.kills, ev: r3(S.score.e.value) },
      bell: S.bell, started: !!S.started, mode: S.mode, sandbagOrient: S.sandbagOrient || 0,
      cmdr: S.cmdr, // P7 T8: the drawn doctrine — explicit field, not the generic sweep
      nextSquadId: S.nextSquadId, zoom: r3(S.zoom),
      focus: { x: r3(S.focus.x), z: r3(S.focus.z) },
      depotCensusAcc: r4(S.depotCensusAcc || 0),
      depotStanding: S.depotStanding != null ? r4(S.depotStanding) : 1,
      enemyStanding: S.enemyStanding != null ? r4(S.enemyStanding) : 1,
      starvedStreak: S.starvedStreak || 0,
      reportedBreak: !!S._reportedBreak, reportedSpent: !!S._reportedSpent,
      // The ladders. S.foe.unlocked is the one that must never go missing:
      // enemyTierState defaults to conscripts-only without it, which would
      // silently disarm the enemy's whole ladder on every resume.
      manifest: JSON.parse(JSON.stringify(S.manifest)),
      foe: JSON.parse(JSON.stringify(S.foe)),
      intelUp: !!S.intelUp, intelArmedAt: r3(S.intelArmedAt || 0),
      lastDispatch: S.lastDispatch || null,
      pendingPlan: S.pendingPlan || null, intelPlan: S.intelPlan || null,
      // The assault's ledger, captured AFTER the muster and BEFORE the first
      // man walks: spawnQueue/mixBag are full, so a resumed front gets the
      // assault the bell actually called, not a cancelled one.
      ws: JSON.parse(JSON.stringify(S.ws)),
      reg: { ...S.reg },
      // P7 T10: watched points only — x/z/team/kind/live, rounded like every
      // other saved coordinate. Defaulted (S.mines || []) so a fixture/state
      // object built before this task (no mines field at all) still saves.
      mines: (S.mines || []).map((m) => ({ x: r3(m.x), z: r3(m.z), t: m.team, k: m.kind, l: m.live ? 1 : 0 })),
      // mk2.09: THE GREEN FOG — poison patches, watched points like mines.
      // `until` is an absolute sim-clock stamp; world.t rides the save too.
      fog: (S.fog || []).map((p) => ({ x: r3(p.x), z: r3(p.z), r: r3(p.r), u: r3(p.until) })),
      // mk2.15: live tesla chains — a save mid-chain resumes mid-chain.
      // `n` is nextAt (absolute sim clock, rides with world.t like fog's
      // `until`); water references re-attach on the next wet hop.
      arcs: (S.arcs || []).map((a) => ({ n: r3(a.nextAt), h: a.hits, d: r3(a.dmg), x: r3(a.fx), y: r3(a.fy), z: r3(a.fz), k: a.atk, t: a.tid, ids: a.hitIds.slice(), gx: a.gx != null ? r3(a.gx) : undefined, gy: a.gy != null ? r3(a.gy) : undefined, gz: a.gz != null ? r3(a.gz) : undefined })),
      holdArea: { 1: !!(S.holdArea && S.holdArea[1]), 2: !!(S.holdArea && S.holdArea[2]) },
    },
    towns: town.map((b) => ({ id: b.id, n0: b.n0, ruined: !!b.ruined })),
    census: cens(census), census2: cens(census2),
    bodies, welds, squads: S.squads.map(squadRow), foeSquads: (S.foeSquads || []).map(squadRow),
    smears: (smears || []).map((m) => ({ u: r3(m.u), v: r3(m.v), s: m.style, x: r3(m.wx), z: r3(m.wz) })),
    mechs: (world.mechs || []).map((m) => {
      const o = { x: r3(m.hull.pos.x), z: r3(m.hull.pos.z),
        yaw: r4(Math.atan2(m.hull.R[6], m.hull.R[8])), hp: r3(m.hull.hp), tm: m.team || 1 };
      const ex = {}; // A1: the orders bag rides its OWN key — never the position's `x`
      let any = false;
      for (const key of ["drv", "order", "tracks", "homeX", "homeZ", "bounty", "maxHp", "escortId"]) {
        const val = plainValue(m.hull[key]); if (val === undefined) continue; ex[key] = val; any = true;
      }
      if (m.hull.dest) { ex.dest = { x: r3(m.hull.dest.x), z: r3(m.hull.dest.z) }; any = true; }
      if (m.hull._patA) { ex._patA = { x: r3(m.hull._patA.x), z: r3(m.hull._patA.z) }; any = true; }
      if (m.hull._patB) { ex._patB = { x: r3(m.hull._patB.x), z: r3(m.hull._patB.z) }; any = true; }
      if (any) o.ex = ex;
      return o;
    }),
  };
  return JSON.stringify(data);
}

// ---------------------------------------------------------------- the read
// A save from a different mark is not migrated — it is refused and deleted.
// No migration machinery this era: the front has moved on.
export function parseFront(raw) {
  if (!raw) return { ok: false, reason: "empty" };
  let d = null;
  try { d = JSON.parse(raw); } catch (e) { return { ok: false, reason: "corrupt" }; }
  if (!d || typeof d !== "object" || !d.map || !d.run || !d.bodies) return { ok: false, reason: "corrupt" };
  if (d.mk !== MK) return { ok: false, reason: "mark", mk: d.mk };
  return { ok: true, data: d };
}

// Both stores, the campaign's own burn discipline: the storage door (the
// artifact runtime) AND localStorage (the Pages shim behind it).
export async function burnFront() {
  try { await storage.delete(SAVE_KEY); } catch (e) {}
  try { window.localStorage.removeItem(SAVE_KEY); } catch (e) {}
}

// probeFront(): the start screen's async existence check. A stale-mark save is
// burned here and reported as gone, so the menu never offers a resume it
// cannot honour. Never throws.
export async function probeFront() {
  let raw = null;
  try { const r = await storage.get(SAVE_KEY); raw = r && r.value; } catch (e) {}
  if (!raw) return { has: false };
  const p = parseFront(raw);
  if (!p.ok) {
    await burnFront();
    return { has: false, stale: p.reason === "mark" || p.reason === "corrupt" };
  }
  return { has: true, data: p.data, bell: p.data.run.bell };
}

// -------------------------------------------------------------- the rebuild
// restoreBodies(world, data, rocks) — step 3 of the boot order documented in
// DepotGame's mount effect. Bodies go back in saved order, then the two
// index-keyed links (welds, the sniper pair) are re-tied to the fresh ids.
// Returns the restored body array, index-aligned with data.bodies.
export function restoreBodies(world, data, rocks) {
  const out = new Array(data.bodies.length);
  for (let i = 0; i < data.bodies.length; i++) out[i] = readBody(world, data.bodies[i], rocks);
  for (let i = 0; i < data.bodies.length; i++) {
    const pr = data.bodies[i].pr;
    if (pr != null && out[pr]) out[i].pairId = out[pr].id;
  }
  return out;
}

export function restoreWelds(world, data, bodies) {
  for (const row of data.welds) {
    const a = bodies[row.a], b = bodies[row.b];
    if (!a || !b) continue;
    const w = addWeld(world, a, b, row.f);
    w.rA.x = row.ra[0]; w.rA.y = row.ra[1]; w.rA.z = row.ra[2];
    w.rB.x = row.rb[0]; w.rB.y = row.rb[1]; w.rB.z = row.rb[2];
    w.born = row.t;
    if (row.br) w.broken = true;
  }
}

// The censuses, rows and order intact (see cens() above for the -1 rule).
export function restoreCensus(rows, bodies) {
  return (rows || []).map((c) => {
    const row = {
      id: c.i >= 0 && bodies[c.i] ? bodies[c.i].id : -1,
      home: { x: c.h[0], y: c.h[1], z: c.h[2] },
    };
    if (c.m != null) row.m = c.m; // P7 T6: rides back if the file carries it
    return row;
  });
}

export function restoreSquads(data, bodies) {
  return (data.squads || []).map((s) => {
    const sq = { memberIds: [], _legTarget: null };
    for (const key in s) {
      if (key === "members") continue;
      sq[key] = s[key];
    }
    for (const i of s.members) if (bodies[i]) sq.memberIds.push(bodies[i].id);
    return sq;
  });
}
```

Then `sha256sum src/modules/save/save.js` — must print `711cfd29038ef5401fe5a086ead43cc4635af071d552339c2f2d955a3fc50aa4`.

3. Write `src/depot/save.js`, exactly (replacing the whole file):

```js
// save lives in its own module now; this file is the depot's unchanged
// front door — every depot import keeps working.
export * from "../modules/save/save.js";
```

Then `sha256sum src/depot/save.js` — must print `c09286bde205cd5af0b7e6403eb5372572326871cc35d3ceb44e1cf52113c8a1`.

4. The gates, all four, unmoved. Each its own command; frostline once, through a file:

```sh
node scripts/gate.mjs api | tail -1         # must print: seed 1  seconds 90 (10800 steps)  worldHash 3367709165  runHash 2717846799
node scripts/gate.mjs combat | tail -1      # must print: ALL PASS
node scripts/gate.mjs frostline > /tmp/fl.out 2>&1; head -1 /tmp/fl.out; tail -2 /tmp/fl.out   # seeds line, then 63 PASS / 0 FAIL, then frostline-test PASS
node scripts/gate.mjs old-master | tail -1  # must print: old-master-test PASS
```

5. Close the records in this landing: bump `package.json` version to `0.0.55`; in `docs/plans/phase-0.0.55-save.md` replace the status line with `Status: LANDED, commit stamped below, 2026-09-03. Gate: prior gates unmoved, hashes identical.`; in `docs/plans/batch-extractions-3.md` flip `- [ ] 0.0.55 save` to `- [x] 0.0.55 save`; in `README.md` flip `- [ ] save — 0.0.55` to `- [x] save — 0.0.55` — the modules list carries the progress, every landing.

6. Commit and push the landing, then stamp the real hash in a second small commit — NEVER amend after stamping. Add the named files only:

```sh
git add src/modules/save/save.js src/depot/save.js package.json README.md docs/plans/phase-0.0.55-save.md docs/plans/task-0.0.55-1-save.md docs/plans/batch-extractions-3.md
git commit -m "phase 0.0.55 — save carved out

Moved whole into its own module; the depot keeps a one-line front door. Four gates unmoved.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push origin main
H=$(git rev-parse --short HEAD)
sed -i "s/commit stamped below/commit \`$H\`/" docs/plans/phase-0.0.55-save.md
git add docs/plans/phase-0.0.55-save.md && git commit -m "phase 0.0.55 record stamped — $H

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push origin main
```

## Acceptance

- Step 2's and step 3's sha256 lines exactly as printed above.
- Step 4: all four gates print their tails unchanged; frostline at its own rolled seeds, seeds and verdict from the one saved run.
- Records flipped riding the landing — phase status, batch box, README line; both pushes accepted.

## Report

Read-confirmation first, then one line of outcome, then bullets: the sha256 lines verbatim, the four gate tails verbatim (frostline with its seeds line), both commit hashes, the push results. Every nonconformity its own labeled bullet. Seeds: frostline rolls fresh and prints; the rest are seedless or the api gate's own fixed harness.
