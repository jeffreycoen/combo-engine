// COLDSNAP DEPOT — bell.js: the bell's ring, moved VERBATIM out of
// DepotGame.jsx (P7 T21, the muster.js/buildlines.js precedent). This code
// lived in the mount's closure, not module scope — every closure variable
// the mount held (world, grid, field, T, S, and the small context bundle:
// cue, toast, townUV, buildSnapshot, nextApcSeq, saveFront) becomes an
// explicit argument here; nothing else changes. The bell's cards
// (S.ackIntel/openManifest/dismissManifest/pickManifest) stay in the mount —
// presentation, not the ring.
//
// DRAW ORDER IS THE CONTRACT: fireBell's own planWave draws (4), the
// ferry's unconditional 2, the sapper's unconditional 2, and intel's
// variable draws on top — their order and count per bell are byte-fixed.
// Zero behavior change.
import { payTown } from "./economy.js";
import { fireBell, WALL_FIELD_COST, SANDBAG_FIELD_COST } from "./state.js";
import { homeShare, pickHomeDetail, HOME_GUARD_CAP, cmdrBellOrders, ferryDecide, flankDrop, engBuildDecide, engBuildKind, engSeedPlace } from "./ai.js";
import { clearSlot } from "./squads.js";
import { spawnUnit } from "./units.js";
import { parkArmor, parkMech, mirrorFieldKey } from "./muster.js";
import { mineSeedRoll, mineSeedPlace, MINE_COST } from "./mines.js";
import { MASON, BISON, APC, MECH } from "./specs.js";
import { startBuildLine } from "./buildlines.js";
import { fieldPrices } from "./market.js";

export function ringBell(world, grid, field, T, run, ctx, map) {
  // POSSESSION T5 (mk0.94), REVERSING the mk0.90 rule by the owner's
  // playtest ruling: the bell does NOT release possession — the round
  // changes under your hands. The save it writes still never carries
  // one (serializeFront never reads run.possess; pinned by T1(c)/(d)).
  ctx.cue("bell"); // the toll itself, at the ring — before anything it causes
  const paid = payTown(ctx.townUV, T);
  run.resources += paid.player;
  if (run.reg) { run.reg.scrap += paid.regiment; if (paid.regiment > 0) run.reg.earned = (run.reg.earned || 0) + paid.regiment; } // mk2.53: town pay is earnings; a zero pay accrues nothing
  // fireBell runs the whole sequence and raises both cards; the assault
  // it musters marches regardless of whether either is ever read. The
  // regiment's own muster now pays the living market's price for
  // every type it buys (mk1.13) — the same table the player's bar
  // reads, off the cache this frame's market accumulator last filled.
  fireBell(run, {
    reg: run.reg, snap: ctx.buildSnapshot(), rng: world.rng, t: world.t,
    priceOf: (t) => (run._market ? run._market.foe[t === "tank" ? "tank" : t] : undefined),
    // P7.2 T4: HIS HAND pays the PLAYER'S OWN price table — one table to
    // the letter (owner). Null before the market's first tick: his walk
    // then buys nothing, and the five draws still burn (the law).
    priceP: (k) => (run._market && run._market.player[k] != null ? run._market.player[k] : null),
    possessed: !!(ctx.possessed && ctx.possessed()),
  });
  // P7.2 T4: HIS HIRES AND BUILDS FIELD AT ONCE — seeded ground at his
  // depot, the dealt-hand mirror's own machinery, draw-free. Bare fixtures
  // with no grid skip the fielding (the books were charged; state-layer only).
  if (run.foe && run.foe.hired && run.foe.hired.length) {
    const depotH = map.TOWN.find((tt) => tt.depot && tt.team === 2);
    if (grid && field && depotH) for (const k of run.foe.hired) mirrorFieldKey(world, run, depotH, grid, field, k, ctx.nextApcSeq, map);
    run.foe.hired = [];
  }
  // P7 T6 (owner): THE DEFENSIVE OPENING — part of an early muster
  // digs in at home instead of marching. Pure post-muster split: no
  // planWave draw moves. Rifle-family only; capped at HOME_GUARD_CAP
  // live defenders; spawn draws (3/man) are deterministic from the
  // bag and the live count.
  {
    const share = homeShare(run.bell);
    if (share > 0 && run.ws.mixBag.length) {
      let liveG = 0;
      for (const b of world.bodies) if (b.garrison && b.alive && b.team === 2) liveG++;
      const want = Math.min(Math.round(run.ws.spawnQueue * share), Math.max(0, HOME_GUARD_CAP - liveG));
      const detail = want > 0 ? pickHomeDetail(run.ws.mixBag, want) : [];
      run.ws.spawnQueue -= detail.length;
      const depotE3 = map.TOWN.find((tt) => tt.depot && tt.team === 2);
      if (depotE3) {
        const gR3 = Math.hypot(depotE3.nx, depotE3.nz) * MASON.pitch / 2 + 3.5;
        detail.forEach((tag, i) => {
          const a = ((i + liveG) / HOME_GUARD_CAP) * Math.PI * 2 + 1.1;
          const p = clearSlot(world, depotE3.x + Math.sin(a) * gR3, depotE3.z + Math.cos(a) * gR3, 0.28 + 0.35);
          const u = spawnUnit(world, { x: p.x, z: p.z }, tag);
          u.hold = true; u.garrison = true;
        });
      }
    }
  }
  // P7 T8: THE COMMANDER DRIVES. Bell-cadence only; orders go through
  // the same motor pool the player's armor rides. Held-ratio read off
  // the territory field, neutral ignored.
  {
    const eb = world.bodies.find((b) => b.kind === "vehicle" && b.team === 2 && b.vtype === "bison" && b.alive);
    if (eb && run.cmdr) {
      let pc = 0, ec = 0;
      for (let i2 = 0; i2 < T.v.length; i2++) { if (T.v[i2] > 0.15) pc++; else if (T.v[i2] < -0.15) ec++; }
      const heldRatio = ec + pc > 0 ? ec / (ec + pc) : 0;
      const atFront = Math.hypot(eb.pos.x - (eb.homeX || eb.pos.x), eb.pos.z - (eb.homeZ || eb.pos.z)) > 20;
      const order = cmdrBellOrders(run.cmdr, { bell: run.bell, fielded: run.ws.fielded > 0, heldRatio, atFront, committed: !!eb.committed });
      if (order === "forward") {
        eb.committed = 1;
        eb.order = "move"; eb.dest = { x: map.OBJ_POS.x, z: map.OBJ_POS.z }; eb._route = null; eb._routeDest = null;
      } else if (atFront || eb.order !== "defend") {
        eb.order = "move"; eb.dest = { x: eb.homeX != null ? eb.homeX : eb.pos.x, z: eb.homeZ != null ? eb.homeZ : eb.pos.z }; eb._route = null; eb._routeDest = null;
      }
    }
  }
  // P7 T8: THE FERRY. Two draws EVERY bell (draw-then-clamp law);
  // eligibility only gates what they buy. Drop = a drawn flank on the
  // player's half, wide of the direct line, never at the depot's feet.
  {
    const ferryRoll = world.rng(), dropRoll = world.rng();
    const ea = world.bodies.find((b) => b.kind === "vehicle" && b.team === 2 && b.vtype === "apc" && b.alive);
    const seated = ea ? world.bodies.filter((b) => b.kind === "unit" && b.rideApc === ea.apcSeq && b.alive).length : 0;
    const eligible = !!(ea && !ea.ferry && seated === 0 && run.ws.mixBag.length >= 4);
    if (ferryDecide(ferryRoll, eligible)) {
      const cands = [];
      for (const band of map.PASSES) for (const g of band) { const c = map.invW(g.x, g.z); if (c.v > 0 && c.v < 40) cands.push({ x: g.x, z: g.z, u: c.u }); }
      const depotP2 = map.TOWN.find((tt) => tt.depot && tt.team !== 2);
      const depotRef = depotP2 ? { x: depotP2.x, z: depotP2.z, u: map.invW(depotP2.x, depotP2.z).u } : null;
      const drop = flankDrop(cands, dropRoll, depotRef);
      if (drop) {
        const four = [];
        for (let k = 0; k < run.ws.mixBag.length && four.length < 4; ) {
          if (run.ws.mixBag[k] !== "tank") four.push(run.ws.mixBag.splice(k, 1)[0]); else k++;
        }
        run.ws.spawnQueue -= four.length;
        for (const tag of four) {
          const u = spawnUnit(world, { x: ea.pos.x, z: ea.pos.z }, tag);
          u.rideApc = ea.apcSeq;
        }
        ea.ferry = "out"; ea.order = "move"; ea.dest = { x: drop.x, z: drop.z }; ea._route = null; ea._routeDest = null;
      }
    }
  }
  // P7 T9: THE HERO TIER, their side — draw-free replacement off the
  // same table, one hull a bell, Bison first. The commander's own
  // doctrine finds the new hull on its own (it scans live bodies).
  {
    const heroPrice = (k) => (run._market ? run._market.foe[k] : (k === "hero_bison" ? BISON.cost : k === "hero_mech" ? MECH.cost : APC.cost));
    const has = (vt) => world.bodies.some((b) => b.kind === "vehicle" && b.team === 2 && b.vtype === vt && b.alive);
    const open = (tag) => run.foe.unlocked.indexOf(tag) >= 0; // P7.2 T4 (owner): a bought hero plan re-parks at ANY bell — the clamp is dead
    const depotE4 = map.TOWN.find((tt) => tt.depot && tt.team === 2);
    if (depotE4 && !has("bison") && open("hero_bison") && run.reg.scrap >= heroPrice("hero_bison")) {
      run.reg.scrap -= heroPrice("hero_bison"); parkArmor(world, grid, field, depotE4, 2, "bison", ctx.nextApcSeq, map);
    } else if (depotE4 && !has("apc") && open("hero_apc") && run.reg.scrap >= heroPrice("hero_apc")) {
      run.reg.scrap -= heroPrice("hero_apc"); parkArmor(world, grid, field, depotE4, 2, "apc", ctx.nextApcSeq, map);
    } else if (depotE4 && !(world.mechs || []).some((m) => m.team === 2 && m.hull.alive) && open("hero_mech") && run.reg.scrap >= heroPrice("hero_mech")) {
      run.reg.scrap -= heroPrice("hero_mech"); parkMech(world, grid, field, depotE4, 2, map);
    }
  }
  // P7 T10: THE ENEMY SAPPER BRAIN — two draws every bell (the law);
  // a committed roll seeds three mines on its approaches or the
  // contested seam, paid off the same table. mineSeedRoll/
  // mineSeedPlace (mines.js) carry the gate/pick arithmetic — the
  // candidate list stays here (PASSES + the territory seam sample are
  // both closure-scoped, game-layer only).
  {
    const mineRoll = world.rng(), minePlaceRoll = world.rng();
    const price3 = run._minePrices ? run._minePrices.mine * 3 : MINE_COST * 3;
    const hasSapper = run.ws.mixBag.indexOf("sapper") >= 0;
    if (mineSeedRoll(mineRoll, hasSapper, run.reg.scrap, price3)) {
      const cands = [];
      for (const band of map.PASSES) for (const g of band) { const c = map.invW(g.x, g.z); if (c.v < 0) cands.push({ x: g.x, z: g.z }); }
      for (let iz2 = 0; iz2 < T.nz; iz2 += 4) for (let ix2 = 0; ix2 < T.nx; ix2 += 4) {
        const vv = T.v[iz2 * T.nx + ix2];
        if (vv > -0.15 && vv < 0.15) { const w2 = map.fwdU(-T.halfU + (ix2 + 0.5) * T.cs, -T.halfV + (iz2 + 0.5) * T.cs); cands.push({ x: w2.x, z: w2.z }); }
      }
      const picks = mineSeedPlace(cands, minePlaceRoll);
      if (picks.length) {
        run.reg.scrap -= price3;
        for (const c3 of picks) run.mines.push({ x: c3.x, z: c3.z, team: 2, kind: "mine", live: true });
      }
    }
  }
  // P7.1 T7: HIS SHOVELS — two draws every bell (the law); a committed roll
  // sends an idle engineer squad to lay a line on his held ground, paid off
  // the same market table at lay time.
  {
    const lineRoll = world.rng(), placeRoll = world.rng();
    const eng = (run.foeSquads || []).find((q) => q.type === "engineers" && !q._build &&
      q.memberIds.some((id) => { const u = world.byId.get(id); return u && u.alive; }));
    const fp2 = run._market ? fieldPrices(run._market.counts, WALL_FIELD_COST, SANDBAG_FIELD_COST) : { wall: WALL_FIELD_COST, bag: SANDBAG_FIELD_COST };
    const kind2 = engBuildKind(lineRoll);
    const est = 6 * (kind2 === "walls" ? fp2.wall : fp2.bag);
    if (engBuildDecide(lineRoll, !!eng, run.reg.scrap, est)) {
      const depotE6 = map.TOWN.find((tt) => tt.depot && tt.team === 2);
      const cands = [];
      for (let iz3 = 0; iz3 < T.nz; iz3 += 4) for (let ix3 = 0; ix3 < T.nx; ix3 += 4) {
        if (T.v[iz3 * T.nx + ix3] >= -0.15) continue; // his ground only
        const w3 = map.fwdU(-T.halfU + (ix3 + 0.5) * T.cs, -T.halfV + (iz3 + 0.5) * T.cs);
        if (depotE6 && Math.hypot(w3.x - depotE6.x, w3.z - depotE6.z) > 50) continue;
        cands.push({ x: w3.x, z: w3.z });
      }
      if (!cands.length) for (const band of map.PASSES) for (const g of band) { const c = map.invW(g.x, g.z); if (c.v < 0) cands.push({ x: g.x, z: g.z }); }
      const spot = engSeedPlace(cands, placeRoll);
      if (spot && eng) {
        const cs2 = map.invW(spot.x, spot.z);
        const a2 = map.fwdU(cs2.u - 6, cs2.v), b3 = map.fwdU(cs2.u + 6, cs2.v);
        startBuildLine(grid, eng, kind2, { x: a2.x, z: a2.z }, { x: b3.x, z: b3.z }, () => {}, 2);
      }
    }
  }
  // The convoy is heard when its card comes up, and only then — a bell
  // whose pool had nothing left to offer raises no card and makes no
  // truck noise.
  if (run.manifest && run.manifest.cardUp) ctx.cue("manifest");
  ctx.toast("BELL " + run.bell + " — THEY MARCH");
  // The income's ledger line: the bell pays nothing itself now (income
  // is the clock) — only the ground the town actually held.
  if (paid.player > 0) ctx.toast("◆ +" + Math.round(paid.player) + " — GROUND HELD");
  // ...and the front is written down. The muster has been planned and
  // the queue is full, but not one man has walked yet — this is the
  // state you would want back, so this is the state that is kept.
  ctx.saveFront();
}
