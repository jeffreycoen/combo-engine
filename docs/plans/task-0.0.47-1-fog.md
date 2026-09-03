# Task 0.0.47-1 — fog carved out

One job: move `fog` into its own module and leave the depot a one-line front door. Write exactly what is written, run the listed gates, report. You design nothing.

Suggested model: Sonnet 5.

Required reading, in order (confirm at the top of your report):
1. This file, whole.
2. `docs/plans/phase-0.0.47-fog.md`, whole.

## Steps

Run from `/home/batman/combo-engine`. A failed assert stops the task; report the step and its verbatim output, run nothing further.

1. Assert the ground:

```sh
sha256sum src/depot/fog.js   # must print 933837f4dd73db670e63d2293d22edacd6a0baab1d17db5c54593f6f1c08d18f
node scripts/gate.mjs combat | tail -1   # must print: ALL PASS
ls src/modules/fog 2>/dev/null || echo absent   # must print: absent
mkdir -p src/modules/fog
```

2. Write `src/modules/fog/fog.js`, exactly (the source file with its import paths rewritten — the one substitution):

```js
// COLDSNAP DEPOT — fog.js (mk2.09): THE GREEN FOG. The atomic blast leaves
// a poison patch on the crater: radius 6, 4 damage a second to any living
// man inside, both sides, fading out after 25 seconds. Watched points, the
// mines' shape — never bodies, never drawn here. Poison pays and scores
// nobody (attacker "world", the kill law's own rule). Deterministic; zero
// rng draws anywhere in this module.
import { applyDamage } from "../../engine/core.js";

export const FOG_R = 6, FOG_DPS = 4, FOG_S = 25; // provisional (F5)

// addFogPatch: a fresh blast on old ground RESTARTS the patch (owner) — any
// patch whose center lies inside the new one is absorbed, never stacked.
export function addFogPatch(list, x, z, t) {
  for (let i = list.length - 1; i >= 0; i--) {
    if (Math.hypot(list[i].x - x, list[i].z - z) < FOG_R) list.splice(i, 1);
  }
  list.push({ x, z, r: FOG_R, until: t + FOG_S });
}

// stepFog: the territory clock's cadence — dt is the caller's step (0.25s).
export function stepFog(world, list, dt) {
  for (let i = list.length - 1; i >= 0; i--) {
    const p = list[i];
    if (world.t >= p.until) { list.splice(i, 1); continue; }
    for (const b of world.bodies) {
      if (b.kind !== "unit" || !b.alive || b.riding) continue;
      if (Math.hypot(b.pos.x - p.x, b.pos.z - p.z) < p.r) applyDamage(world, b, FOG_DPS * dt, { attacker: "world" });
    }
  }
}
```

Then `sha256sum src/modules/fog/fog.js` — must print `7714db54b8bfc390b4539883b479a79aea886eeaf1f1f7d94955320918e9ddf4`.

3. Write `src/depot/fog.js`, exactly (replacing the whole file):

```js
// fog lives in its own module now; this file is the depot's unchanged
// front door — every depot import keeps working.
export * from "../modules/fog/fog.js";
```

Then `sha256sum src/depot/fog.js` — must print `f32d463d445b7d19130ca033eec991fba1af0f2dcc35367747d75979bb02485f`.

4. The gates, all four, unmoved:

```sh
node scripts/gate.mjs api | tail -1         # must print: seed 1  seconds 90 (10800 steps)  worldHash 3367709165  runHash 2717846799
node scripts/gate.mjs combat | tail -1      # must print: ALL PASS
node scripts/gate.mjs frostline | tail -1   # must print: frostline-test PASS (count line: 63 PASS / 0 FAIL)
node scripts/gate.mjs old-master | tail -1  # must print: old-master-test PASS
```

5. Close the records in this landing: bump `package.json` version to `0.0.47`; in `docs/plans/phase-0.0.47-fog.md` replace the status line with `Status: LANDED, commit stamped below, 2026-09-03. Gate: prior gates unmoved, hashes identical.`; in `docs/plans/batch-extractions-2.md` flip `- [ ] 0.0.47 fog` to `- [x] 0.0.47 fog`. No README box is earned by a carve; none is touched.

6. Commit and push the landing, then stamp the real hash in a second small commit — NEVER amend after stamping. Add the named files only:

```sh
git add src/modules/fog/fog.js src/depot/fog.js package.json docs/plans/phase-0.0.47-fog.md docs/plans/task-0.0.47-1-fog.md docs/plans/batch-extractions-2.md
git commit -m "phase 0.0.47 — fog carved out

Moved whole into its own module; the depot keeps a one-line front door. Four gates unmoved.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push origin main
H=$(git rev-parse --short HEAD)
sed -i "s/commit stamped below/commit \`$H\`/" docs/plans/phase-0.0.47-fog.md
git add docs/plans/phase-0.0.47-fog.md && git commit -m "phase 0.0.47 record stamped — $H

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push origin main
```

## Acceptance

- Step 2's and step 3's sha256 lines exactly as printed above.
- Step 4: all four gates print their tails unchanged; frostline at its own rolled seeds.
- Records flipped riding the landing; both pushes accepted.

## Report

Read-confirmation first, then one line of outcome, then bullets: the sha256 lines verbatim, the four gate tails verbatim (frostline with its seeds line), both commit hashes, the push results. Every nonconformity its own labeled bullet. Seeds: frostline rolls fresh and prints; the rest are seedless or the api gate's own fixed harness.
