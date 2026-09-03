# Task 0.0.48-1 — mines carved out

One job: move `mines` into its own module and leave the depot a one-line front door. Write exactly what is written, run the listed gates, report. You design nothing.

Suggested model: Sonnet 5.

Required reading, in order (confirm at the top of your report):
1. This file, whole.
2. `docs/plans/phase-0.0.48-mines.md`, whole.

## Steps

Run from `/home/batman/combo-engine`. A failed assert stops the task; report the step and its verbatim output, run nothing further.

1. Assert the ground:

```sh
sha256sum src/depot/mines.js   # must print 9fd0d048cd410996ba9de8f11cebaab44b991067263d532f602b4e6642c1851a
node scripts/gate.mjs combat | tail -1   # must print: ALL PASS
ls src/modules/mines 2>/dev/null || echo absent   # must print: absent
mkdir -p src/modules/mines
```

2. Write `src/modules/mines/mines.js`, exactly (the source file with its import paths rewritten — the one substitution):

```js
// COLDSNAP DEPOT — mines.js (P7 T10): watched points, never bodies. The
// TRIGGER is the protection (owner, 2026-08-17): a device fires only on an
// other-team crosser — but a tripped blast is a blast, anyone in the area,
// both sides, through the engine's own explode.
import { explode, addBody } from "../../engine/core.js";
export const MINE_TRIG = 1.4, WIRE_TRIG = 1.0, FLARE_S = 6;          // provisional (F5)
export const MINE_BLAST = { r: 3.4, kv: 20, dmg: 90, crater: 0.4 };  // a real blast — anyone in the area (owner) // provisional (F5)
export const WIRE_BLAST = { r: 2.2, kv: 3, dmg: 25, crater: 0 };     // the small charge // provisional (F5)
export const MINE_COST = 6, WIRE_COST = 4;                            // provisional (F5)
export function stepMines(world, mines) {
  // 4 Hz caller cadence. Deterministic order; zero draws.
  for (const m of mines) {
    if (!m.live) continue;
    const trig = m.kind === "wire" ? WIRE_TRIG : MINE_TRIG;
    let hit = null;
    for (const b of world.bodies) {
      if ((b.kind !== "unit" && b.kind !== "vehicle") || !b.alive || b.team === m.team || b.riding) continue;
      if (Math.hypot(b.pos.x - m.x, b.pos.z - m.z) < trig) { hit = b; break; }
    }
    if (!hit) continue;
    m.live = false;
    const gy = world.field.heightAt(m.x, m.z);
    const attacker = m.team === 1 ? "player" : "enemy";
    if (m.kind === "mine") {
      // the trigger was the protection; the blast is a blast (owner, 2026-08-17)
      explode(world, m.x, gy + 0.2, m.z, { ...MINE_BLAST, attacker });
    } else {
      world.events.push({ type: "flare", x: m.x, z: m.z });
      const eye = addBody(world, { kind: "flag", team: m.team, mass: 0, hx: 0.05, hy: 0.05, hz: 0.05, x: m.x, y: gy + 2.5, z: m.z });
      eye.sleeping = true; eye._dieT = world.t + FLARE_S;   // an eye, not a banner: no flagPole, nothing draws
      explode(world, m.x, gy + 0.2, m.z, { ...WIRE_BLAST, attacker });
    }
  }
  // spent flares burn out
  for (let i = world.bodies.length - 1; i >= 0; i--) {
    const b = world.bodies[i];
    if (b.kind === "flag" && b._dieT != null && world.t >= b._dieT) { world.byId.delete(b.id); world.bodies.splice(i, 1); }
  }
}
export function minePrices(counts, priced) { return { mine: priced(MINE_COST, "mine", counts), wire: priced(WIRE_COST, "wire", counts) }; }

// P7 T10 DEVIATION (named, mirrors the P7 T8 precedent — ferryDecide/
// flankDrop in ai.js): the enemy seeding decision and its placement pick are
// factored into pure functions here so they are directly testable without a
// live DepotGame closure (the plan's own Step 1(d) assert needs behavior,
// not just source shape). ringBell (DepotGame.jsx) still draws both rolls
// unconditionally every bell and still builds the candidate list itself
// (PASSES + territory seam sampling — both closure-scoped, game-layer only);
// it just calls these two instead of inlining the gate/stride math.
export function mineSeedRoll(mineRoll, hasSapper, scrap, price3) {
  return mineRoll < 0.5 && hasSapper && scrap >= price3;   // provisional (F5)
}
export function mineSeedPlace(cands, placeRoll) {
  if (!cands || cands.length < 3) return [];
  const stride = Math.max(1, Math.floor(cands.length / 3));
  const start = Math.min(cands.length - 1, Math.floor(placeRoll * cands.length));
  const out = [];
  for (let k = 0; k < 3; k++) out.push(cands[(start + k * stride) % cands.length]);
  return out;
}
```

Then `sha256sum src/modules/mines/mines.js` — must print `1228d61fa558cb90d3d07e7dc41a86172f6e7b0e4bdd22063ac04e228e1b5c69`.

3. Write `src/depot/mines.js`, exactly (replacing the whole file):

```js
// mines lives in its own module now; this file is the depot's unchanged
// front door — every depot import keeps working.
export * from "../modules/mines/mines.js";
```

Then `sha256sum src/depot/mines.js` — must print `26c7709f0cd6f9d93f40786fe203541b66c6afdfbcdc2e37558e7bbc006ede65`.

4. The gates, all four, unmoved:

```sh
node scripts/gate.mjs api | tail -1         # must print: seed 1  seconds 90 (10800 steps)  worldHash 3367709165  runHash 2717846799
node scripts/gate.mjs combat | tail -1      # must print: ALL PASS
node scripts/gate.mjs frostline | tail -1   # must print: frostline-test PASS (count line: 63 PASS / 0 FAIL)
node scripts/gate.mjs old-master | tail -1  # must print: old-master-test PASS
```

5. Close the records in this landing: bump `package.json` version to `0.0.48`; in `docs/plans/phase-0.0.48-mines.md` replace the status line with `Status: LANDED, commit stamped below, 2026-09-03. Gate: prior gates unmoved, hashes identical.`; in `docs/plans/batch-extractions-2.md` flip `- [ ] 0.0.48 mines` to `- [x] 0.0.48 mines`. No README box is earned by a carve; none is touched.

6. Commit and push the landing, then stamp the real hash in a second small commit — NEVER amend after stamping. Add the named files only:

```sh
git add src/modules/mines/mines.js src/depot/mines.js package.json docs/plans/phase-0.0.48-mines.md docs/plans/task-0.0.48-1-mines.md docs/plans/batch-extractions-2.md
git commit -m "phase 0.0.48 — mines carved out

Moved whole into its own module; the depot keeps a one-line front door. Four gates unmoved.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push origin main
H=$(git rev-parse --short HEAD)
sed -i "s/commit stamped below/commit \`$H\`/" docs/plans/phase-0.0.48-mines.md
git add docs/plans/phase-0.0.48-mines.md && git commit -m "phase 0.0.48 record stamped — $H

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push origin main
```

## Acceptance

- Step 2's and step 3's sha256 lines exactly as printed above.
- Step 4: all four gates print their tails unchanged; frostline at its own rolled seeds.
- Records flipped riding the landing; both pushes accepted.

## Report

Read-confirmation first, then one line of outcome, then bullets: the sha256 lines verbatim, the four gate tails verbatim (frostline with its seeds line), both commit hashes, the push results. Every nonconformity its own labeled bullet. Seeds: frostline rolls fresh and prints; the rest are seedless or the api gate's own fixed harness.
