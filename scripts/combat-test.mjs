// The depot-combat guard gate. Every depot combat rule (glancing damage,
// armour thresholds, tree shredding, wind drift, direct-hit component) is
// flag-gated: with world.depotCombat off, the engine must behave exactly as
// the frozen demo / sandbox / tower defence always did. This file asserts
// only that flag-off half — the on-half's tuning numbers are gameplay
// behaviour and were retired in the C0 purge (mk0.31).
import { makeWorld, addBody, fireProjectile, stepWorld, applyDamage, CAUSE } from "../src/engine/core.js";
import { windAt } from "../src/depot/wind.js";

const fails = [];
const ok = (name, cond, detail = "") => { console.log(`${cond ? "PASS" : "FAIL"} — ${name}${detail ? `  [${detail}]` : ""}`); if (!cond) fails.push(name); };

function runOnce({ depotCombat, grazing }) {
  const world = makeWorld({ seed: 1 });
  if (depotCombat) world.depotCombat = true;
  const target = addBody(world, { kind: "vehicle", hx: 1, hy: 1, hz: 1, x: 0, y: 5, z: 20, mass: 500, hp: 1000 });
  // fire toward the target's center (0,5,20); face normal being struck is the
  // z axis. head-on: velocity purely along +z (theta ~ 0, cos ~ 1). grazing:
  // velocity mostly along x with a small z component (~75deg off the normal),
  // aimed so the straight line still passes through the target's center.
  const dir = grazing
    ? { x: Math.sin(75 * Math.PI / 180), y: 0, z: Math.cos(75 * Math.PI / 180) }
    : { x: 0, y: 0, z: 1 };
  const D = 25;
  const from = { x: 0 - dir.x * D, y: 5, z: 20 - dir.z * D };
  // r:0 keeps explode()'s blast contribution at (or effectively at) zero on
  // the very body it struck, isolating the direct-impact damage path (a flat
  // 90 for "shell" in stepProjectiles) so the test measures only the
  // glancing scale-down, not blast falloff noise.
  fireProjectile(world, from, dir, 60, { kind: "shell", r: 0, kv: 12, dmg: 55, crater: 0, attacker: "player" });
  for (let i = 0; i < 240 && world.projectiles.length; i++) stepWorld(world);
  return target.hp;
}


const headOnNoFlag = runOnce({ depotCombat: false, grazing: false });
const grazeNoFlag = runOnce({ depotCombat: false, grazing: true });
ok("guard: without depotCombat, head-on and grazing deal identical damage", headOnNoFlag === grazeNoFlag, `head-on hp=${headOnNoFlag} graze hp=${grazeNoFlag}`);

// Armor thresholds: under world.depotCombat, a ballistic hit whose dmg is
// below b.armor glances off (dmg * 0.15); dmg >= armor penetrates for full.
// Blast damage bypasses armor entirely (concussion). Guard proof: without
// the flag, armor is ignored regardless of value.
function armorHp(depotCombat, dmg, cause) {
  const world = makeWorld({ seed: 1 });
  if (depotCombat) world.depotCombat = true;
  const b = addBody(world, { kind: "vehicle", hx: 1, hy: 1, hz: 1, x: 0, y: 5, z: 20, mass: 500, hp: 1000 });
  b.armor = 40;
  applyDamage(world, b, dmg, { cause, attacker: "player" });
  return 1000 - b.hp;
}

ok("guard: without depotCombat, armor is ignored (30 hp lost)", armorHp(false, 30, CAUSE.PROJECTILE) === 30, `lost=${armorHp(false, 30, CAUSE.PROJECTILE)}`);

// Tree combat: under world.depotCombat, mg direct hits shred a tree's hp
// (default 30) at 4/hit — ~8 hits fells it. A shell/rocket direct hit
// ignites (t.burning = world.t) instead of killing outright; a burning
// tree loses 2 hp/s off world dt/t (not wall clock) and dies ~15s later.
// Unflagged worlds: trees are inert to direct rounds (TD/campaign keep
// their existing blast-only tree damage, unchanged).
function makeTreeWorld(depotCombat) {
  const world = makeWorld({ seed: 1 });
  if (depotCombat) world.depotCombat = true;
  const tree = addBody(world, { kind: "tree", hx: 0.28, hy: 1.6, hz: 0.28, x: 0, y: 1.62, z: 20, mass: 260, friction: 0.5 });
  return { world, tree };
}
// mg: minimal blast (r/dmg near-zero) so the ~8-hit fell is attributable to
// the new direct 4hp/hit path, not the pre-existing (unguarded) blast-on-tree
// mechanic every projectile already triggers via explode(). shell: a real
// blast, to prove ignite fires on the SAME hit that lands it (set before
// explode() runs, so it survives even if that same blast kills the tree).
function fireAt(world, kind) {
  const spec = kind === "mg" ? { kind, r: 0.05, kv: 0.3, dmg: 1, crater: 0, attacker: "player" }
    : { kind, r: 3, kv: 12, dmg: 55, crater: 0, attacker: "player" };
  fireProjectile(world, { x: 0, y: 1.62, z: 0 }, { x: 0, y: 0, z: 1 }, 90, spec);
  for (let i = 0; i < 60 && world.projectiles.length; i++) stepWorld(world);
}


{
  const { world, tree } = makeTreeWorld(false);
  let hits = 0;
  while (tree.alive && hits < 20) { fireAt(world, "mg"); hits++; }
  ok("guard: without depotCombat, mg direct hits do not fell a tree", tree.alive, `hits=${hits} alive=${tree.alive} hp=${tree.hp}`);
  fireAt(world, "shell");
  ok("guard: without depotCombat, shell direct hit does not ignite", tree.burning == null, `burning=${tree.burning}`);
}

// Wind: flat-fire shell with windF drifts leeward under strong constant
// world.wind vs a zero-wind twin (same seed, same everything else). Guard
// proof: without world.depotCombat set, wind is a no-op even with world.wind
// present. windAt determinism: two calls, same args, identical output.
function windLandingX({ depotCombat, wind }) {
  const world = makeWorld({ seed: 1 });
  if (depotCombat) world.depotCombat = true;
  if (wind) world.wind = wind;
  const p = fireProjectile(world, { x: 0, y: 2, z: 0 }, { x: 0, y: 0.02, z: 1 }, 58,
    { kind: "shell", r: 0, kv: 8, dmg: 25, crater: 0, attacker: "player", windF: 0.45 });
  let landX = p.pos.x;
  for (let i = 0; i < 240 && world.projectiles.length; i++) { stepWorld(world); landX = p.pos.x; }
  return landX;
}
const STRONG_WIND = { x: 6, z: 0, mag: 6 };
const guardOnX = windLandingX({ depotCombat: false, wind: STRONG_WIND });
const guardOffX = windLandingX({ depotCombat: false, wind: null });
ok("guard: without depotCombat, world.wind is a no-op (identical trajectories)", Math.abs(guardOnX - guardOffX) < 1e-9, `wind=${guardOnX} none=${guardOffX}`);

const w1 = windAt(42, 123.5), w2 = windAt(42, 123.5);
ok("windAt: deterministic for same (seed, t)", w1.x === w2.x && w1.z === w2.z && w1.mag === w2.mag);

// Direct-hit component (A1): under world.depotCombat, a noImpact spec with
// dirDmg set delivers that flat damage as a direct hit (CAUSE.PROJECTILE,
// armor consulted), on top of the existing noImpact-blast law which still
// hits everyone else in the burst. The struck body is marked via
// spec._directHitId so explode()'s noImpact blast-damage loop skips it —
// damage only, impulse/toss still applies. Guarded: without the flag, a
// dirDmg noImpact spec behaves exactly as before (pure blast, no direct
// component, no armor consultation).
function dirHitWorld({ depotCombat, grazing = false, armor = null, neighbor = false }) {
  const world = makeWorld({ seed: 1 });
  if (depotCombat) world.depotCombat = true;
  const target = addBody(world, { kind: "unit", hx: 0.4, hy: 0.9, hz: 0.4, x: 0, y: 1, z: 20, mass: 82, hp: 100 });
  if (armor != null) target.armor = armor;
  let neighborBody = null;
  if (neighbor) neighborBody = addBody(world, { kind: "unit", hx: 0.4, hy: 0.9, hz: 0.4, x: 1, y: 1, z: 20, mass: 82, hp: 100 });
  const dir = grazing
    ? { x: Math.sin(75 * Math.PI / 180), y: 0, z: Math.cos(75 * Math.PI / 180) }
    : { x: 0, y: 0, z: 1 };
  const D = 25;
  const from = { x: 0 - dir.x * D, y: 1, z: 20 - dir.z * D };
  fireProjectile(world, from, dir, 240, { kind: "mg", r: 3, kv: 4, dmg: 6, crater: 0, dirDmg: 20, noImpact: true, attacker: "player" });
  for (let i = 0; i < 240 && world.projectiles.length; i++) stepWorld(world);
  return { targetLoss: 100 - target.hp, neighborLoss: neighborBody ? 100 - neighborBody.hp : null };
}

// (e) unflagged world: dirDmg spec behaves as before (pure blast, guard proof)
const e = dirHitWorld({ depotCombat: false });
ok("A1(e): guard — without depotCombat, dirDmg spec is pure blast (not ~20 direct)", Math.abs(e.targetLoss - 20) > 1.5, `loss=${e.targetLoss}`);

console.log(fails.length ? `\n${fails.length} FAIL(S)` : "\nALL PASS");
process.exit(fails.length ? 1 : 0);
