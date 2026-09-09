import { fireProjectile, applyDamage } from "../engine/core.js";
import { buildMech } from "../engine/mech.js";
import { MECH } from "./specs.js";
import { windAt } from "./wind.js";
import { spawnEnemy } from "./sim.js";
import { SQUAD_SPECS, makeSquad } from "./squads.js";
import { holderAt, canBuild, fogStateFor } from "./territory.js";
import { endCardReady, pendingArmed, spawnSquadMembers, ASSAULT_TIMEOUT } from "./state.js";

// COLDSNAP DEPOT — hooks.js: the debug harness. Every window.__DEPOT*__
// hook the tests and staging scripts drive, installed by the component at
// mount over a context bag, removed by the returned uninstall at unmount.
// __DEPOTPERF__ is not here — the stopwatch reads the frame loop's own
// ring buffers and stays in the component.
export function installDepotHooks(ctx) {
  const { world, run, view, input, map, grid, field, T, R, canvas, stateRef,
    RES, buildAt, groundPoint, pickHeightAt, consumeOrderTap, getSaveStat, cueN } = ctx;
  window.__DEPOT__ = () => ({ t: world.t, scrap: run.resources, kills: run.score.p.kills, score: { pk: run.score.p.kills, pv: +run.score.p.value.toFixed(1), ek: run.score.e.kills, ev: +run.score.e.value.toFixed(1) }, bell: run.bell, bellT: run.bellT, bodies: world.bodies.length, fps: view.fps, paused: view.paused, speed: view.speed, reg: { ...run.reg }, depotStanding: run.depotStanding != null ? run.depotStanding : 1, breach: !!run.breach, enemyStanding: run.enemyStanding != null ? run.enemyStanding : 1, enemyBreach: !!run.enemyBreach, withdrew: run.ws.withdrew || 0, endedAt: run.endedAt != null ? run.endedAt : null, endCard: endCardReady(run, world.t) });
  // debug harness: the live pending + its screen anchor (smoke
  // asserts the tap-theft repairs through this).
  window.__DEPOTPENDING__ = () => (view.pending ? { armed: pendingArmed(view.pending, world.t), screen: view.pendingScreen, gx: view.pending.gx, gz: view.pending.gz } : null);
  window.__DEPOTBUILD__ = (gx, gz, mode) => buildAt(gx, gz, mode || "wall");
  // debug harness: world point -> grid cell, so a staging script can build
  // at a point __DEPOTFINDBUILDABLE__ handed it without driving the tap UI.
  window.__DEPOTGRIDAT__ = (x, z) => grid.worldToGrid(x, z);
  window.__DEPOTSPAWN__ = (n) => { for (let i = 0; i < (n || 1); i++) spawnEnemy(world, map.SPAWN_POINTS[run.spawnRR++ % map.SPAWN_POINTS.length]); };
  window.__DEPOTTESLA__ = () => { const C = stateRef.current; return { arcs: C && C.run.arcs ? C.run.arcs.length : -1, fired: C ? C.view._teslaFired || 0 : -1, zaps: C ? C.view._teslaZaps || 0 : -1, held: !!(C && C.input.fireHeld), pk: C && C.input.possess ? C.input.possess.kind : null }; };
  window.__DEPOTSTART__ = () => { run.started = true; };
  window.__DEPOTSETT__ = (t) => { world.t = t; world.wind = windAt(map.MAP_SEED, world.t); };
  window.__DEPOTFLAGS__ = () => world.bodies.filter((b) => b.flagPole).map((b) => ({ id: b.id, kind: b.kind, x: +b.pos.x.toFixed(2), y: +b.pos.y.toFixed(2), z: +b.pos.z.toFixed(2) }));
  window.__DEPOTTOWN__ = () => map.TOWN.map((t) => ({ id: t.id, x: +t.x.toFixed(2), z: +t.z.toFixed(2), nx: t.nx, nz: t.nz, ny: t.ny, slab: !!t.slab, cols: !!t.cols }));
  window.__DEPOTTREES__ = () => world.bodies.filter((b) => b.kind === "tree").map((b) => ({ id: b.id, x: +b.pos.x.toFixed(2), z: +b.pos.z.toFixed(2), y: +b.pos.y.toFixed(2), hp: +b.hp.toFixed(1), alive: b.alive, burning: b.burning }));
  // staging harness: the live wall courses, the welds holding them
  // and the loose rubble — so a save/resume run can prove three courses,
  // two welds and a half-dead wall all came back, and a collapse run can
  // watch the uppers leave the wall set.
  window.__DEPOTWALLS__ = () => ({
    courses: world.bodies.filter((b) => b.kind === "wall").map((b) => ({
      course: b.course != null ? b.course : -1, hp: +b.hp.toFixed(1), maxHp: b.maxHp, cap: !!b.capTop,
      x: +b.pos.x.toFixed(2), y: +b.pos.y.toFixed(2), z: +b.pos.z.toFixed(2),
    })),
    welds: world.welds.filter((w) => !w.broken && w.a.kind === "wall" && w.b.kind === "wall").length,
    fallen: world.bodies.filter((b) => b.kind === "chunk" && !b.town && !b.sandbag && b.invM > 0 && b.mass === 100 && b.hy > 0.2).length,
  });
  window.__DEPOTMG__ = (tx, ty, tz) => {
    // debug harness: fire a single mg round at a point (a tree, typically)
    // from 3m out — used for smoke-testing tree shredding under
    // depotCombat, same shot shape combat-test.mjs uses
    const from = { x: tx, y: ty, z: tz - 3 };
    fireProjectile(world, from, { x: 0, y: 0, z: 1 }, 90,
      { kind: "mg", r: 0.05, kv: 0.3, dmg: 1, crater: 0, attacker: "player" });
  };
  window.__DEPOTSHELL__ = (tx, ty, tz) => {
    // debug harness: a real GUN-tower round (noImpact:true, matching
    // TOWER_SPECS.gun and towerShot's fireProjectile call exactly — the
    // flat +55 point-blank impact bonus only applies to non-noImpact
    // specs, which a live tower never fires). A direct shell hit sets
    // tree.burning and, at 70hp, leaves it alive to burn down
    // ~2hp/s rather than dying in the same tick.
    const from = { x: tx, y: ty, z: tz - 3 };
    fireProjectile(world, from, { x: 0, y: 0, z: 1 }, 90,
      { kind: "shell", r: 2.3, kv: 8, dmg: 25, crater: 0.55, noImpact: true, attacker: "player" });
  };
  window.__DEPOTTHIN__ = () => {
    // debug harness: instantly clear the field — zero the spawn queue and
    // kill every live enemy — so tests can empty an assault without
    // waiting real time for it to walk (smoke.mjs uses this to stay
    // inside its budget under swiftshader).
    run.ws.spawnQueue = 0;
    for (const b of world.bodies) if (b.kind === "unit" && b.team === 2 && b.alive) applyDamage(world, b, 1e6, { cause: "BLAST", attacker: "player" });
  };
  window.__DEPOTWEDGE__ = () => {
    // debug harness: wedge the current assault — drain the spawn queue and
    // backdate its clock past ASSAULT_TIMEOUT so the next tick times out
    // and every live enemy withdraws (instead of waiting 75 real seconds).
    run.ws.spawnQueue = 0;
    run.ws.withdrawn = false;
    run.ws.spawnDoneT = world.t - (ASSAULT_TIMEOUT + 1);
  };
  window.__DEPOTBELL__ = (inS = 0) => {
    // debug harness: ring the bell now — pulls the next assault forward
    // without waiting out the period. An argument moves the due stamp that
    // many SIM seconds out instead (reaching the pre-toll window
    // without waiting two minutes).
    run.bellAt = world.t + Math.max(0, inS);
  };
  // debug harness: how many of each audio cue this run has raised.
  // Audio cannot be asserted headlessly; this at least proves the cues are
  // pushed where the design says they are.
  window.__DEPOTCUES__ = () => ({ ...cueN });
  window.__DEPOTMANIFEST__ = () => ({
    unlocked: run.manifest.unlocked.slice(), hand: run.manifest.hand.slice(),
    offerBell: run.manifest.offerBell, cardUp: !!run.manifest.cardUp,
    armed: world.t >= run.manifest.armedAt, intelUp: !!run.intelUp,
    foe: run.foe.unlocked.slice(),
  });
  window.__DEPOTPICK__ = (key) => { view.pickManifest(key); return run.manifest.unlocked.slice(); };
  // debug harness: what the last bell's save cost and whether this
  // mount is a resume. Reading it costs nothing; the numbers are recorded
  // by saveFront itself, not measured on demand.
  window.__DEPOTSAVE__ = () => ({ resumed: !!RES, burned: !!run._saveBurned, last: getSaveStat() });
  window.__DEPOTEND__ = (victory) => {
    // debug harness: force the run into its end state for screenshotting
    // the WIN/LOSS end card without simming 50 waves — pattern matches
    // the other window.__DEPOT*__ hooks above.
    if (victory) { run.victory = true; run.enemyBreach = true; } else { run.gameOver = true; run.breach = true; }
  };
  window.__DEPOTPAIR__ = (x, z) => {
    // debug harness: field a sniper PAIR at a world point,
    // cost-free — smoke asserts the spotter climbs / the sniper settles
    // and frames the screenshot without driving the placement UI.
    const sq = makeSquad(run.nextSquadId++, "sniper", 1, x, z);
    spawnSquadMembers(world, sq);
    run.squads.push(sq);
    return sq.id;
  };
  window.__DEPOTPAIRSTATE__ = (id) => {
    const sq = run.squads.find((q) => q.id === id);
    if (!sq) return null;
    return {
      type: sq.type,
      spotGoal: sq._spotGoal || null, snipeGoal: sq._snipeGoal || null,
      members: sq.memberIds.map((mid) => { const u = world.byId.get(mid); return u && { role: u.role || null, x: +u.pos.x.toFixed(2), z: +u.pos.z.toFixed(2), settled: !!u.settled, alive: u.alive }; }),
    };
  };
  window.__DEPOTCELL__ = (x, z) => {
    // debug harness: the grid's verdict on one world point — the same four
    // facts validatePlacement asks about, so a staging run can choose ground
    // that is actually buildable instead of walking a line into a ridge.
    const g = grid.worldToGrid(x, z);
    if (!grid.inBounds(g.gx, g.gz)) return null;
    const cell = grid.cells[grid.idx(g.gx, g.gz)];
    const wp = grid.gridToWorld(g.gx, g.gz), c0 = map.invW(wp.x, wp.z);
    return { gx: g.gx, gz: g.gz, x: +wp.x.toFixed(2), z: +wp.z.toFixed(2),
      blocked: !!(cell.blocked || cell.wallId), ice: !!cell.ice, held: canBuild(T, c0.u, c0.v) };
  };
  window.__DEPOTSQUAD__ = (type, x, z) => {
    // debug harness: field ANY squad type at a world point,
    // cost-free — __DEPOTPAIR__ generalised, so a staging run can put an
    // engineer team on the ground without driving the placement UI.
    if (!SQUAD_SPECS[type]) return null;
    const sq = makeSquad(run.nextSquadId++, type, 1, x, z);
    spawnSquadMembers(world, sq);
    run.squads.push(sq);
    return sq.id;
  };
  // THE PROBE'S INSTRUMENT: field a mech for either
  // team at a point, read every mech's state, order one directly — the
  // same debug-harness pattern as every __DEPOT*__ hook, cost-free.
  window.__DEPOTMECH__ = (team, x, z, yaw) => {
    const m = buildMech(world, { x, z, yaw: yaw || 0, team: team || 1, hp: MECH.hp });
    m.thrustersOn = true; m.thrustAssist = true;
    m.hull.drv = "mech"; m.hull.order = "defend"; m.hull.tracks = "careful";
    m.hull.maxHp = m.hull.hp; m.hull.homeX = x; m.hull.homeZ = z;
    if (team === 2) m.hull.bounty = MECH.bounty;
    return m.hull.id;
  };
  window.__DEPOTMECHS__ = () => (world.mechs || []).map((m) => ({
    id: m.hull.id, team: m.team, hp: +m.hull.hp.toFixed(1), mode: m.state.mode,
    x: +m.hull.pos.x.toFixed(2), z: +m.hull.pos.z.toFixed(2),
    falls: m.telem.falls, steps: m.telem.steps, order: m.hull.order || null,
  }));
  window.__DEPOTMECHORDER__ = (id, kind, x, z) => {
    const b = world.byId.get(id); if (!b || !b.mechRef) return null;
    b.order = kind; b.dest = x != null ? { x, z } : null; b._route = null; b._routeDest = null;
    return { order: b.order, dest: b.dest };
  };
  window.__DEPOTORDER__ = (id, kind, pts) => {
    // debug harness: give a squad an order through the REAL order
    // path — view.orderSquad arms the chip, consumeOrderTap eats the ground
    // points (one for ATTACK/MOVE, two for a build line). Only the camera
    // raycast is skipped; every clamp, gate and arming rule still applies.
    const sq = run.squads.find((q) => q.id === id);
    if (!sq) return null;
    view.selSquadId = id; view.selArmedAt = 0; view.orderMode = null; view.buildPt0 = null;
    view.orderSquad(kind);
    for (const p of (pts || [])) consumeOrderTap(p);
    // The debug path auto-accepts what a human tap
    // would still have to confirm — staging keeps driving the real order
    // path end to end without a screen to tap the ✓ on.
    // acceptLine gates on pendingArmed, and the
    // pending was created THIS tick with armedAt = world.t + PENDING_ARM_S
    // — the old auto-accept always missed its own arming window and
    // silently no-opped. The arming guard protects a human's trailing
    // tap; the staging path has no trailing tap, so backdate the arm,
    // then accept.
    if (view.linePending) { view.linePending.armedAt = world.t; view.acceptLine(); } // staging has no trailing tap — backdate the arm, then accept
    return { order: sq.order, dest: sq.dest, armed: view.orderMode, pt0: view.buildPt0,
      build: sq._build ? { kind: sq._build.kind, cells: sq._build.rows.length, phase: sq._build.phase, orient: sq._build.orient } : null };
  };
  window.__DEPOTFOCUS__ = (x, z, zoom) => {
    // debug harness: point the camera at a world point (e.g. a tree) so
    // smoke-test screenshots can frame a specific body tightly
    run.focus.x = x; run.focus.z = z; run.focus.y = field.heightAt(x, z);
    if (zoom) { run.zoom = zoom; R.setZoom(zoom); }
  };
  // debug harness: read the current camera focus (canvas-center world
  // point) — used by the smoke test's rotation-invariance check to know
  // the intended build cell without racing the render loop's tween.
  window.__DEPOTGETFOCUS__ = () => ({ x: run.focus.x, z: run.focus.z });
  window.__DEPOTHOLD__ = (x, z) => { const c = map.invW(x, z); return holderAt(T, c.u, c.v); };
  // VISION: the sight census — how many cells each side can see
  // right now. Sight is derived and never saved, so this is also the
  // resume check: after a reload the count comes back on the first
  // territory tick, from nothing but the bodies on the field.
  window.__DEPOTSIGHT__ = () => {
    const a = T.sight.seen1, b = T.sight.seen2;
    let lit1 = 0, lit2 = 0;
    for (let i = 0; i < a.length; i++) { lit1 += a[i]; lit2 += b[i]; }
    return { cells: a.length, lit1, lit2 };
  };
  window.__DEPOTSELREACH__ = () => {
    // Reports whichever fan is live — selected squad first,
    // else the inspected tower's cached fan (kind flags the source).
    const r = view.selReach || (view.inspectReach && view.inspectReach.pts ? view.inspectReach : null);
    if (!r) return null;
    return { id: r.id, kind: r === view.selReach ? "squad" : "tower", n: r.pts.length, cx: +r.cx.toFixed(2), cz: +r.cz.toFixed(2), maxR: +Math.max(...r.pts.map((p) => Math.hypot(p.x - r.cx, p.z - r.cz))).toFixed(2) };
  };
  // debug harness: the nearest buildable+held cell to the depot
  // flag. Build rights now gate placement on holderAt===1 — the depot's
  // own emitter greens ground near itself, but the smoke test's original
  // build-tap point (canvas center at the initial camera focus) sits
  // well outside that radius on the pinned seed. The smoke test polls
  // this until non-null, then points the camera there before tapping.
  // clearR (optional): also require no tower/wall/sandbag body
  // within clearR meters of the cell — squad members spawn on a 1.2m
  // ring and seek 2.4m formation slots, and a slot inside a static body
  // gets a man ejected/crushed by contact resolution (found live in the
  // smoke: 1 of 4 riflemen died at spawn next to the mg tower).
  window.__DEPOTFINDBUILDABLE__ = (clearR) => {
    const flag = world.bodies.find((b) => b.kind === "flag");
    if (!flag) return null;
    let best = null, bestD = 1e9;
    for (let gz = 0; gz < map.GRID_H; gz++) for (let gx = 0; gx < map.GRID_W; gx++) {
      const cell = grid.cells[grid.idx(gx, gz)];
      if (cell.blocked || cell.wallId || cell.ice) continue;
      const wp = grid.gridToWorld(gx, gz);
      const c = map.invW(wp.x, wp.z);
      if (!canBuild(T, c.u, c.v)) continue;
      if (clearR && world.bodies.some((b) => b.alive && (b.kind === "tower" || b.kind === "wall" || b.kind === "rock" || b.kind === "tree" || b.kind === "chunk") &&
        Math.hypot(wp.x - b.pos.x, wp.z - b.pos.z) < clearR)) continue;
      const d = Math.hypot(wp.x - flag.pos.x, wp.z - flag.pos.z);
      if (d < bestD) { bestD = d; best = { x: wp.x, z: wp.z }; }
    }
    return best;
  };
  // Screenshot harness only (verification, not a smoke-test dep):
  // the highest buildable+held cell within reach of the flag, and the
  // buildable+held cell nearest a live rock — so a ring-on-a-rise and a
  // ring-bitten-by-an-obstacle shot can be composed deterministically
  // on the pinned seed instead of eyeballing the procedural map.
  window.__DEPOTFINDRISE__ = () => {
    const flag = world.bodies.find((b) => b.kind === "flag");
    if (!flag) return null;
    let best = null, bestY = -1e9;
    for (let gz = 0; gz < map.GRID_H; gz++) for (let gx = 0; gx < map.GRID_W; gx++) {
      const cell = grid.cells[grid.idx(gx, gz)];
      if (cell.blocked || cell.wallId || cell.ice) continue;
      const wp = grid.gridToWorld(gx, gz);
      const c = map.invW(wp.x, wp.z);
      if (!canBuild(T, c.u, c.v)) continue;
      if (Math.hypot(wp.x - flag.pos.x, wp.z - flag.pos.z) > 40) continue;
      const y = field.heightAt(wp.x, wp.z);
      if (y > bestY) { bestY = y; best = { x: wp.x, z: wp.z, y }; }
    }
    return best;
  };
  window.__DEPOTFINDNEARROCK__ = () => {
    const rocks = world.bodies.filter((b) => b.kind === "rock" && b.alive);
    let best = null, bestD = 1e9;
    for (let gz = 0; gz < map.GRID_H; gz++) for (let gx = 0; gx < map.GRID_W; gx++) {
      const cell = grid.cells[grid.idx(gx, gz)];
      if (cell.blocked || cell.wallId || cell.ice) continue;
      const wp = grid.gridToWorld(gx, gz);
      const c = map.invW(wp.x, wp.z);
      if (!canBuild(T, c.u, c.v)) continue;
      for (const r of rocks) {
        const d = Math.hypot(wp.x - r.pos.x, wp.z - r.pos.z);
        if (d < bestD && d > 2) { bestD = d; best = { x: wp.x, z: wp.z }; }
      }
    }
    return best;
  };
  // Debug hooks: DOM/pixel-cheap fog asserts for smoke.mjs.
  // __DEPOTFOGDBG__ reports the renderer's own per-frame count of
  // team-2-alive bodies vs how many it actually rendered (some hidden
  // by fog when unheld) — no pixel sampling needed. __DEPOTFOGAT__
  // exposes fogStateFor at a world point for direct state checks.
  window.__DEPOTFOGDBG__ = () => R.getFogDebug();
  window.__DEPOTFOGAT__ = (x, z) => { const c = map.invW(x, z); return fogStateFor(T, c.u, c.v, 1); };
  // Debug hooks: squad + sandbag state reads for smoke.mjs, plus
  // the live center-ray ground point — the camera pivot TWEENS toward
  // run.focus, so a fixed post-focus sleep lands taps meters off under
  // swiftshader; the smoke polls this until it converges instead.
  window.__DEPOTGROUNDAT__ = (cx, cy) => groundPoint(cx, cy);
  // ...and the inverse: a world point's current client-pixel position,
  // so the smoke can tap a KNOWN cell instead of hoping the tweening
  // center ray lands on one.
  window.__DEPOTSCREENAT__ = (x, z) => {
    if (!R.project) return null;
    // pickHeightAt, not heightAt: project the point where it is DRAWN,
    // so the projection round-trips with groundPoint's mesh picking.
    const nd = R.project(x, pickHeightAt(x, z), z);
    if (!nd) return null;
    const rect = canvas.getBoundingClientRect();
    return { x: rect.left + (nd.x * 0.5 + 0.5) * rect.width, y: rect.top + (-nd.y * 0.5 + 0.5) * rect.height };
  };
  window.__DEPOTSQUADS__ = () => run.squads.map((sq) => ({
    id: sq.id, type: sq.type, order: sq.order,
    anchor: { x: +sq.anchor.x.toFixed(2), z: +sq.anchor.z.toFixed(2) },
    dest: sq.dest ? { x: +sq.dest.x.toFixed(2), z: +sq.dest.z.toFixed(2) } : null,
    sel: view.selSquadId === sq.id, ordering: view.selSquadId === sq.id && view.orderMode === "attack",
    // The live build job, if any — kind, how far down the cell list
    // the laying has got, what actually went down and what was skipped.
    build: sq._build ? {
      kind: sq._build.kind, phase: sq._build.phase, cells: sq._build.rows.length,
      i: sq._build.i, laid: sq._build.laid, skipped: sq._build.skipped, dry: !!sq._build.dry,
      pause: +(sq._pauseT || 0).toFixed(2), orient: sq._build.orient,
    } : null,
    members: sq.memberIds.map((id) => {
      const u = world.byId.get(id);
      return u ? { id, x: +u.pos.x.toFixed(2), z: +u.pos.z.toFixed(2), alive: u.alive } : null;
    }).filter(Boolean),
  }));
  window.__DEPOTSANDBAGS__ = () => world.bodies.filter((b) => b.sandbag).map((b) => ({ id: b.id, x: +b.pos.x.toFixed(2), z: +b.pos.z.toFixed(2), hx: b.hx, hz: b.hz, alive: b.alive }));
  window.__DEPOTLOAD__ = () => {
    // the load ramp's gauge: live men and the awake/asleep
    // stone split, counted fresh on each call — read-only, no cadence.
    let men = 0, awake = 0, asleep = 0;
    for (const b of world.bodies) {
      if (!b.alive) continue;
      if (b.kind === "unit") men++;
      else if (b.kind === "chunk") { if (b.sleeping) asleep++; else awake++; }
    }
    return { men, awake, asleep };
  };
  window.__DEPOTENEMYPOS__ = () => {
    const b = world.bodies.find((b2) => b2.kind === "unit" && b2.alive && b2.team === 2);
    return b ? { x: b.pos.x, y: b.pos.y, z: b.pos.z } : null;
  };

  return function uninstallDepotHooks() {
    for (const k of ["__DEPOT__", "__DEPOTBELL__", "__DEPOTBUILD__", "__DEPOTSPAWN__", "__DEPOTSTART__", "__DEPOTTREES__", "__DEPOTMG__", "__DEPOTSHELL__", "__DEPOTTHIN__", "__DEPOTEND__", "__DEPOTFOCUS__", "__DEPOTGETFOCUS__", "__DEPOTSETT__", "__DEPOTFLAGS__", "__DEPOTTOWN__", "__DEPOTHOLD__", "__DEPOTFINDBUILDABLE__", "__DEPOTFINDRISE__", "__DEPOTFINDNEARROCK__", "__DEPOTFOGDBG__", "__DEPOTFOGAT__", "__DEPOTENEMYPOS__", "__DEPOTSQUADS__", "__DEPOTSANDBAGS__", "__DEPOTGROUNDAT__", "__DEPOTSCREENAT__", "__DEPOTPENDING__", "__DEPOTMANIFEST__", "__DEPOTPICK__", "__DEPOTSAVE__", "__DEPOTGRIDAT__", "__DEPOTSQUAD__", "__DEPOTORDER__", "__DEPOTCELL__"]) delete window[k];
  };
}
