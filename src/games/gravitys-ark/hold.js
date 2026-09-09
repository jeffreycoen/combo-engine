// MODULE of the game GRAVITY'S ARK: the hold, the order's phase 0.0.110,
// frames 1 and 2 headless in two dimensions, written new to the design
// document's numbers; every number PROPOSED from the order's scale table.
// The hull comes down by the crash pose and slides its loose modules; the
// Grip step out of the ring in waves that never stop; she fights in the
// walker or she fixes, never both; the hands shoot and throw satchels;
// walls and guns cost scrap and keep clear of the bridge; the mast's arc is
// a plain lob at forty-five degrees; the boss walker stands off and fires;
// TAKE OFF needs every surviving module welded; the bridge lost is ABANDON
// SHIP. No randomness beyond the handed stream, read in one fixed order.
// The boss goes down only from a blow of bossDownCost or more; no weapon
// here deals that in one blow, so the boss never goes down from the mast
// alone. Positions are metres on a flat field, the bridge at the origin.
// Written by the orchestrator as the plan-writer's own trial after the
// phase's agent stalled; recorded in the night log.

export const HOLD_DIALS = { crashPitch: 0.35, slideFrac: 0.6, crashStop: 0.3, weldNormal: 1.2e5, weldWeak: 5e4, firstWaveAt: 8, firstWaveN: 4, waveEvery: 20, waveAdd: 2, ringR: 38, gripKg: 80, gripHp: 58, gripSpeed: 2.2, clawModule: 6, clawWalker: 2, clawPerson: 12, reach: 1.5, repairWalker: 10, repairBase: 5, repairPerM: 1.5, wallScrap: 300, gunScrap: 600, keepOut: 3.5, startScrap: 900, gripPays: 50, mastH: 3, mastMin: 5, mastEvery: 2.5, mastDamage: 40, mastRadius: 3, mastSelf: 8, mastG: 9.8, bossWave: 4, bossFrom: 44, bossHp: 950, bossStandoff: 14, bossEvery: 3, bossDamage: 60, bossDown: 5, bossDownCost: 150, handHp: 58, handSpeed: 3.2, handDamage: 14, handEvery: 1.2, handRange: 24, satchel: 70, satchelEvery: 8, satchelRange: 5.5, herHp: 58, herSpeed: 3.2, walkerHp: 900, walkerDamage: 30, walkerEvery: 1, walkerReach: 3, moduleHp: 400, wallHp: 500, gunHp: 300, gunDamage: 20, gunEvery: 1, gunRange: 30, cell: 1.7 };
export const ACTS = ["repairWalker", "repair", "fight", "idle"];
const MODULE_KG = { bridge: 900, engine: 1400, pod: 600, tank: 500, shield: 1100, mount: 800, strut: 150, rcs: 250, rack: 550, grapple: 400, mechbay: 1800 };
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

// crashLoads(hull, v, d): the crash's deceleration is the arrival speed over the
// stop time; every module after the bridge hangs on its weld to the grid
// neighbour nearest the bridge (the lowest index among neighbours at grid
// distance 1); the load is its mass times the deceleration; a strut on either
// side makes the weld weak.
export function crashLoads(hull, v, d) {
  const dd = { ...HOLD_DIALS, ...d }, a = v / dd.crashStop, out = [];
  for (let i = 1; i < hull.list.length; i++) {
    const m = hull.list[i]; let nb = -1;
    for (let j = 0; j < hull.list.length; j++) { if (j === i) continue; const o = hull.list[j]; if (Math.abs(o.gx - m.gx) + Math.abs(o.gy - m.gy) === 1) { nb = j; break; } }
    const weak = m.t === "strut" || (nb >= 0 && hull.list[nb].t === "strut");
    const load = MODULE_KG[m.t] * a, strength = weak ? dd.weldWeak : dd.weldNormal;
    out.push({ i, load, strength, broken: load > strength });
  }
  return out;
}

// makeHold(hull, crew, v, rng, opts): the field after the crash.
export function makeHold(hull, crew, v, rng, opts) {
  const d = { ...HOLD_DIALS, ...(opts && opts.dials) };
  const modules = hull.list.map((m) => ({ t: m.t, x: m.gx * d.cell, y: m.gy * d.cell, hp: d.moduleHp, welded: true, slid: 0 }));
  for (const c of crashLoads(hull, v, d)) if (c.broken) { const m = modules[c.i]; m.welded = false; m.slid = d.slideFrac * v; m.x += m.slid; }
  const hands = crew.map((h, k) => ({ name: h.name, x: 2 + k * 1.2, y: -3, hp: d.handHp, fireT: 0, satchelT: 0, alive: true, kills: 0 }));
  return { t: 0, pitch: d.crashPitch, modules, scrap: d.startScrap, grip: [], walls: [], guns: [], shots: [], hands,
    her: { x: 0, y: 3, hp: d.herHp, act: "idle", actT: 0, target: null, inWalker: false, alive: true },
    walker: { x: 4, y: 3, hp: d.walkerHp, dead: true, hitT: 0 },
    wave: 0, nextWaveAt: d.firstWaveAt, events: [], boss: null, abandoned: false, mastT: 0, rng, dials: d };
}

// order(H, kind, x, y): the player's orders and her acts.
export function order(H, kind, x, y) {
  const d = H.dials, her = H.her, ev = (k, extra) => { const e = { k, t: H.t, ...(extra || {}) }; H.events.push(e); return e; };
  if (kind === "wall" || kind === "gun") {
    if (Math.hypot(x, y) < d.keepOut) return null;
    const cost = kind === "wall" ? d.wallScrap : d.gunScrap; if (H.scrap < cost) return null;
    H.scrap -= cost;
    const it = kind === "wall" ? { x, y, hp: d.wallHp } : { x, y, hp: d.gunHp, fireT: 0 };
    (kind === "wall" ? H.walls : H.guns).push(it); ev(kind); return it;
  }
  if (kind === "fire") {
    if (Math.hypot(x, y) < d.mastMin || H.mastT > 0) return null;
    const R = Math.hypot(x, y), tf = Math.sqrt(2 * R / d.mastG);
    const shot = { x, y, landAt: H.t + tf }; H.shots.push(shot); H.mastT = d.mastEvery; ev("fire"); return shot;
  }
  if (kind === "repair") {
    if (!her.alive) return null;
    let best = null, bd = Infinity;
    for (const m of H.modules) if (!m.welded && m.hp > 0) { const dm = dist(m, her); if (dm < bd) { bd = dm; best = m; } }
    if (!best) return null;
    her.target = best; her.actT = d.repairBase + d.repairPerM * best.slid; her.act = "repair"; her.inWalker = false; ev("repair"); return her;
  }
  if (kind === "repairWalker") { if (!her.alive || !H.walker.dead) return null; her.act = "repairWalker"; her.actT = d.repairWalker; her.inWalker = false; her.target = null; ev("repairWalker"); return her; }
  if (kind === "fight") { if (!her.alive || H.walker.dead) return null; her.act = "fight"; her.inWalker = true; her.target = null; ev("fight"); return her; }
  if (kind === "idle") { her.act = "idle"; her.inWalker = false; her.target = null; ev("idle"); return her; }
  if (kind === "takeoff") {
    if (H.abandoned) return { ok: false, reason: "abandoned" };
    if (H.modules.some((m) => m.hp > 0 && !m.welded)) return { ok: false, reason: "loose" };
    ev("takeoff"); return { ok: true };
  }
  return null;
}

// tick(H, dt): the field's clock, in the order the design fixes.
export function tick(H, dt) {
  const d = H.dials, out = [], ev = (k, extra) => { const e = { k, t: H.t, ...(extra || {}) }; H.events.push(e); out.push(e); return e; };
  H.t += dt; H.mastT = Math.max(0, H.mastT - dt);
  // 2. the waves, forever
  while (H.t >= H.nextWaveAt) {
    H.wave += 1; const n = d.firstWaveN + d.waveAdd * (H.wave - 1);
    for (let k = 0; k < n; k++) { const a = H.rng() * 2 * Math.PI; H.grip.push({ x: Math.cos(a) * d.ringR, y: Math.sin(a) * d.ringR, hp: d.gripHp, alive: true }); }
    if (H.wave === d.bossWave && !H.boss) { const a = H.rng() * 2 * Math.PI; H.boss = { x: Math.cos(a) * d.bossFrom, y: Math.sin(a) * d.bossFrom, hp: d.bossHp, alive: true, fireT: 0, downT: 0 }; }
    ev("wave", { n: H.wave, count: n }); H.nextWaveAt += d.waveEvery;
  }
  // 3. the Grip walk at the nearest living thing and claw
  const walker = H.walker, her = H.her;
  const targets = () => {
    const list = [];
    for (const m of H.modules) if (m.hp > 0) list.push({ o: m, kind: "module" });
    if (!walker.dead) list.push({ o: walker, kind: "walker" });
    if (her.alive && !her.inWalker) list.push({ o: her, kind: "person" });
    for (const h of H.hands) if (h.alive) list.push({ o: h, kind: "person" });
    for (const w of H.walls) if (w.hp > 0) list.push({ o: w, kind: "module" });
    for (const g of H.guns) if (g.hp > 0) list.push({ o: g, kind: "module" });
    return list;
  };
  const tl = targets();
  for (const g of H.grip) {
    if (!g.alive) continue;
    let best = null, bd = Infinity;
    for (const t of tl) { if (t.o.hp <= 0) continue; const dd = dist(g, t.o); if (dd < bd) { bd = dd; best = t; } }
    if (!best) continue;
    if (bd > d.reach) { const ux = (best.o.x - g.x) / bd, uy = (best.o.y - g.y) / bd; const step = Math.min(d.gripSpeed * dt, bd - d.reach); g.x += ux * step; g.y += uy * step; }
    else { const rate = best.kind === "module" ? d.clawModule : best.kind === "walker" ? d.clawWalker : d.clawPerson; best.o.hp -= rate * dt; }
  }
  for (const h of H.hands) if (h.alive && h.hp <= 0) { h.alive = false; ev("handDead", { name: h.name }); }
  if (her.alive && her.hp <= 0) { her.alive = false; her.inWalker = false; ev("herDead"); }
  if (!walker.dead && walker.hp <= 0) { walker.dead = true; her.inWalker = false; if (her.act === "fight") her.act = "idle"; ev("walkerDown"); }
  if (H.modules[0].hp <= 0 && !H.abandoned) { H.abandoned = true; ev("abandon"); }
  // 4. the boss stands off and fires; down only from a blow of bossDownCost
  const B = H.boss;
  if (B && B.alive) {
    if (B.downT > 0) B.downT -= dt;
    else {
      let best = null, bd = Infinity;
      for (const m of H.modules) if (m.hp > 0) { const dd = dist(B, m); if (dd < bd) { bd = dd; best = m; } }
      if (best) {
        if (bd > d.bossStandoff + 0.1) { const ux = (best.x - B.x) / bd, uy = (best.y - B.y) / bd; B.x += ux * d.gripSpeed * dt; B.y += uy * d.gripSpeed * dt; }
        else if (bd < d.bossStandoff - 0.1) { const ux = (best.x - B.x) / bd, uy = (best.y - B.y) / bd; B.x -= ux * d.gripSpeed * dt; B.y -= uy * d.gripSpeed * dt; }
        B.fireT -= dt;
        if (B.fireT <= 0) { best.hp -= d.bossDamage; ev("bossShot"); B.fireT += d.bossEvery; }
      }
    }
  }
  const hit = (target, dmg) => { target.hp -= dmg; if (target === B && dmg >= d.bossDownCost) B.downT = d.bossDown; };
  const foes = () => { const l = H.grip.filter((g) => g.alive && g.hp > 0); if (B && B.alive && B.hp > 0) l.push(B); return l; };
  // 5. the hands shoot and throw
  for (const h of H.hands) {
    if (!h.alive) continue;
    h.fireT -= dt; h.satchelT -= dt;
    let best = null, bd = Infinity;
    for (const f of foes()) { const dd = dist(h, f); if (dd < bd) { bd = dd; best = f; } }
    if (best && bd <= d.handRange && h.fireT <= 0) { hit(best, d.handDamage); h.fireT += d.handEvery; if (best.hp <= 0) h.kills += 1; }
    if (best && bd <= d.satchelRange && h.satchelT <= 0) { hit(best, d.satchel); h.satchelT += d.satchelEvery; if (best.hp <= 0) h.kills += 1; }
  }
  // 6. the guns
  for (const gn of H.guns) {
    if (gn.hp <= 0) continue; gn.fireT -= dt;
    let best = null, bd = Infinity;
    for (const g of H.grip) if (g.alive && g.hp > 0) { const dd = dist(gn, g); if (dd < bd) { bd = dd; best = g; } }
    if (best && bd <= d.gunRange && gn.fireT <= 0) { best.hp -= d.gunDamage; gn.fireT += d.gunEvery; }
  }
  // 7. the mast's shots land
  H.shots = H.shots.filter((s) => {
    if (s.landAt > H.t) return true;
    for (const f of foes()) if (dist(s, f) <= d.mastRadius) hit(f, d.mastDamage);
    for (const m of H.modules) if (m.hp > 0 && dist(s, m) <= d.mastRadius) m.hp -= d.mastSelf;
    ev("shell", { x: s.x, y: s.y }); return false;
  });
  // 8. her: she fights or she fixes, never both
  if (her.alive) {
    if (her.act === "repairWalker") { her.actT -= dt; if (her.actT <= 0) { walker.dead = false; walker.hp = d.walkerHp; her.act = "idle"; ev("walkerUp"); } }
    else if (her.act === "repair") { her.actT -= dt; if (her.actT <= 0) { const m = her.target; if (m) { m.welded = true; m.x -= m.slid; m.slid = 0; } her.target = null; her.act = "idle"; ev("repaired"); } }
    else if (her.act === "fight" && her.inWalker && !walker.dead) {
      walker.hitT -= dt;
      let best = null, bd = Infinity;
      for (const g of H.grip) if (g.alive && g.hp > 0) { const dd = dist(walker, g); if (dd < bd) { bd = dd; best = g; } }
      if (best && bd <= d.walkerReach && walker.hitT <= 0) { best.hp -= d.walkerDamage; walker.hitT += d.walkerEvery; }
    }
  }
  // 9. the dead pay in scrap; their dead do not rise
  for (const g of H.grip) if (g.alive && g.hp <= 0) { g.alive = false; H.scrap += d.gripPays; ev("gripDead"); }
  if (B && B.alive && B.hp <= 0) { B.alive = false; ev("bossDead"); }
  return out;
}

export function summary(H) {
  return { t: H.t, wave: H.wave, gripAlive: H.grip.filter((g) => g.alive).length, gripDead: H.grip.filter((g) => !g.alive).length,
    modulesAlive: H.modules.filter((m) => m.hp > 0).length, loose: H.modules.filter((m) => m.hp > 0 && !m.welded).length, scrap: H.scrap,
    herAlive: H.her.alive, walkerDead: H.walker.dead, bossAlive: !!(H.boss && H.boss.alive), abandoned: H.abandoned };
}

export const HOLD_CONTRACT = { modules: "list", scrap: "number >= 0", wave: "integer >= 0" };
export function checkHold(H) {
  if (!H || typeof H !== "object") return ["hold: not an object"];
  const p = [];
  if (!Array.isArray(H.modules)) p.push("hold.modules: list required");
  if (!(typeof H.scrap === "number" && H.scrap >= 0)) p.push("hold.scrap: number >= 0 required");
  if (!(Number.isInteger(H.wave) && H.wave >= 0)) p.push("hold.wave: integer >= 0 required");
  return p;
}
