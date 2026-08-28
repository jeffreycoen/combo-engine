# Task 0.0.8-1 — the rig table and assembly

One job: extract the eighth module — the mech demo's rig layer, verbatim by hash — write its gate, and land the phase with the record close and the two-commit stamp. You design nothing.

Suggested model: Sonnet 5.

Required reading, in order (confirm at the top of your report):
1. This file, whole.
2. `docs/plans/phase-0.0.8-rig-module.md`, whole.

Source (READ ONLY — the extraction command reads it; nothing ever writes to it): `mech-mk1-live-opus-5.html` lines 860–1063.

## Steps

Run from `/home/batman/combo-engine`. A failed assert stops the task; report the step and its verbatim output, run nothing further.

1. Assert the ground: nine gates green, destination absent. Required tails — api ends `worldHash 3367709165  runHash 2717846799`; combat `ALL PASS`; accuracy `11/11`; market, builder, ledger, weldstress, tape, physics-pb each end `<name>-test PASS`; the `ls` prints `absent`.

```sh
for g in api combat accuracy market builder ledger weldstress tape physics-pb; do node scripts/gate.mjs $g | tail -1; done
ls src/modules/rig 2>/dev/null || echo absent
```

2. Extract the module: the import line, the demo's lines verbatim, the export block — exactly as written here.

```sh
mkdir -p src/modules/rig
cat > src/modules/rig/rig.js <<'HEAD'
// COMBO-ENGINE import line — with the export block below, the ONLY additions
// to the demo's text (mech-mk1-live-opus-5.html lines 860-1063, verbatim;
// the demo's header says these were gated modules with module syntax
// removed — these two blocks put it back, against the physics-pb module).
import { V, vadd, vsub, vmul, vnorm, vcross, Q, qmul, qrot, qAxisAngle,
  Body, boxInertia, Hinge, Weld, PairCollision } from "../physics-pb/physics.js";
HEAD
sed -n '860,1063p' mech-mk1-live-opus-5.html >> src/modules/rig/rig.js
cat >> src/modules/rig/rig.js <<'TAIL'

// COMBO-ENGINE export block — see the import note above.
export { MECH_SPEC, sideChain, buildLinkTable, perpTo, assembleMech, groundRig, comAnkleOffset, rigStats };
TAIL
```

3. The file hash is the verbatim proof. Must print OK.

```sh
echo "a8f50db14961872d6e0a7cd61a5e181326098eba12ba34f0f568cfb8c36b0208  src/modules/rig/rig.js" | sha256sum -c
```

4. Write `scripts/rig-test.mjs`, exactly:

```js
// COMBO-ENGINE — rig-test: the rig module's gate. Nine checks against the
// demo's own numbers, standing on the physics-pb module. Seedless — assembly
// and the solver contain no randomness.
import { MECH_SPEC, buildLinkTable, assembleMech, groundRig, comAnkleOffset, rigStats } from "../src/modules/rig/rig.js";
import { World } from "../src/modules/physics-pb/physics.js";

let pass = 0, fail = 0;
const check = (name, ok) => { if (ok) { pass++; console.log("PASS " + name); } else { fail++; console.log("FAIL " + name); } };

const build = () => { const w = new World({ substeps: 12, iterations: 4, contact: { mu: 1.0 } }); const rig = assembleMech(w); groundRig(rig); return { w, rig }; };

check("the table names 17 links: 3 core + 7 per side",
  Object.keys(buildLinkTable(MECH_SPEC)).length === 17);
{ const { w, rig } = build(); const s = rigStats(rig);
  check("the assembled MK1 weighs exactly 8140 kg — the demo's own title chip", s.mass === 8140);
  check("17 bodies, 14 hinges, 2 welds, 2 collision pairs",
    Object.keys(rig.bodies).length === 17 && Object.keys(rig.joints).length === 14 &&
    Object.keys(rig.welds).length === 2 && w.pairs.length === 2);
  check("groundRig puts the lowest point exactly on the ground", s.bottom === 0);
  check("the crouched stance stands 4.91 m tall (within 5 mm of the measured 4.9137)",
    Math.abs(s.height - 4.9137) < 0.005);
  check("the balance debt is small by construction: |com-to-ankle| under 1 mm",
    Math.abs(comAnkleOffset(rig).x) < 0.001);
  for (let i = 0; i < 120; i++) w.step(1 / 60);
  check("it STANDS: one second under gravity, zero breaks, pelvis at 3.515 m within 5 mm",
    w.breakEvents.length === 0 && Math.abs(rig.bodies.pelvis.x.y - 3.5151) < 0.005);
  const { w: w2, rig: rig2 } = build();
  for (let i = 0; i < 120; i++) w2.step(1 / 60);
  check("the stand is bit-deterministic across two worlds",
    rig2.bodies.pelvis.x.y === rig.bodies.pelvis.x.y); }
check("design-sweep overrides land: footWidth 0.55 and hipOffset 0.42 reach the built table",
  (() => { const w3 = new World({}); const r3 = assembleMech(w3, { footWidth: 0.55, hipOffset: 0.42 });
    return r3.bodies.footL.dim.z === 0.55 && Math.abs(r3.table.hipYokeL.jp[2]) === 0.42; })());

console.log(`rig-test: ${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
console.log("rig-test PASS");
```

Then its hash. Must print OK.

```sh
echo "29934c3729fd18be05249032305c43b16888cabd2744a2e99d6fb8e41c623fe4  scripts/rig-test.mjs" | sha256sum -c
```

5. In `scripts/gate.mjs`, in the `GATES` table (currently nine entries ending with `"physics-pb"`), add one line after the `"physics-pb"` entry:

```js
  "rig": ["scripts/rig-test.mjs"],
```

Touch nothing else in the file.

6. Run the new gate. Required output: nine PASS lines, then exactly `rig-test: 9 PASS / 0 FAIL`, then `rig-test PASS`, exit 0. Any FAIL stops the task before step 7.

```sh
node scripts/gate.mjs rig
```

7. Assert the prior gates did not move (same required tails as step 1), then close the records in this landing:
   - Bump `package.json` version to `0.0.8`.
   - In `docs/plans/phase-0.0.8-rig-module.md`, replace the status line with: `Status: LANDED, commit stamped below, 2026-08-28. Gate: 9 PASS / 0 FAIL; prior gates unmoved.`
   - In `README.md`, flip `- [ ] The rig table: a whole machine as data, mirrored per side, assembled from the table` to `- [x]`.
   - In `docs/plans/STATE.md`: set the first line to `Current phase: none active. Last landed: 0.0.8.`; append ` · 0.0.8 rig (pending)` to the Landed line; add `rig` to the gates line; replace `mech failure envelopes and rig table onto physics-pb` in the next-candidates line with `mech leg kinematics onto the rig`.

8. Commit and push the landing, then stamp the real hash in a second small commit — NEVER amend after stamping:

```sh
git add src/modules/rig scripts/rig-test.mjs scripts/gate.mjs README.md package.json docs/plans
git commit -m "phase 0.0.8 — the rig table and assembly land, verbatim by hash

The MK1 as data on the physics core: 17 links, mirrored limbs, 8140 kg
exactly, standing deterministic. Gate: 9 PASS / 0 FAIL.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push origin main
H=$(git rev-parse --short HEAD)
sed -i "s/commit stamped below/commit \\`$H\\`/" docs/plans/phase-0.0.8-rig-module.md
sed -i "s/0.0.8 rig (pending)/0.0.8 rig (\\`$H\\`)/" docs/plans/STATE.md
git add docs/plans && git commit -m "phase 0.0.8 record stamped — $H

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push origin main
```

## Acceptance

- Steps 3 and 4: both sha256 checks print OK.
- Step 6: `rig-test: 9 PASS / 0 FAIL` then `rig-test PASS`, exit 0, and an `ok` line in `.superpowers/gates.log`.
- Step 7: all nine prior gates unchanged; four records flipped riding the landing commit.
- Step 8: both pushes accepted; the stamped hash is the pushed landing commit's.

## Report

Read-confirmation first, then one line of outcome, then bullets: both hash-check outputs, the rig gate's count and verdict lines verbatim, the nine prior-gate tails, both commit hashes (landing and stamp), the push results. Every nonconformity its own labeled bullet. Fixture seeds: none — assembly and solver contain no randomness; the api re-check runs seed 1; no seed is special.
