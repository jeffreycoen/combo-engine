# Task 0.0.67-1 — the mount failure envelopes

One job: land the mount failure envelopes, byte-for-byte from this plan. Write exactly what is written, run the listed gates, report. You design nothing.

Suggested model: Sonnet 5.

Required reading, in order (confirm at the top of your report):
1. This file, whole.
2. `docs/plans/phase-0.0.67-envelope.md`, whole.

## Steps

Run from `/home/batman/combo-engine`. A failed assert stops the task; report the step and its verbatim output, run nothing further.

1. Assert the ground:

```sh
node scripts/gate.mjs physics-pb | tail -1   # must print: physics-pb-test PASS
ls scripts/envelope-test.mjs 2>/dev/null || echo absent   # must print: absent
```

2. Write `scripts/envelope-test.mjs`, exactly:

```js
// COMBO-ENGINE — envelope-test: the mount failure envelope's laws, on the
// engine's own Weld and structuralUtil (byte-identical with the mech
// demo's live text, proven at lift time). Laws at rolled limits and loads:
// the four terms combine by the root of squares; compression never tears;
// fatigue weakens; the tear is honest — at 1 less damage, and never below.
import { structuralUtil, NO_LIMIT, Weld, Body, V, boxInertia, World } from "../src/modules/physics-pb/physics.js";
let pass = 0, fail = 0;
const check = (n, ok) => { if (ok) { pass++; console.log("PASS " + n); } else { fail++; console.log("FAIL " + n); } };
const SEED = process.env.SEED ? +process.env.SEED : Math.floor(Math.random() * 1e9);
console.log("seeds " + JSON.stringify({ loads: SEED }));
let a = SEED >>> 0;
const rnd = () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const rollLim = () => ({ tension: 100 + rnd() * 5000, shear: 100 + rnd() * 5000, bend: 50 + rnd() * 2000, torsion: 50 + rnd() * 2000 });

{ let law = true;
  for (let i = 0; i < 2000 && law; i++) {
    const L = rollLim();
    const Fax = (rnd() - 0.3) * 4000, Fsh = rnd() * 4000, Mb = rnd() * 1500, Mt = rnd() * 1500;
    const u = structuralUtil(L, Fax, Fsh, Mb, Mt);
    const t = Math.max(0, Fax) / L.tension;
    const want = Math.sqrt(t * t + (Fsh / L.shear) ** 2 + (Mb / L.bend) ** 2 + (Mt / L.torsion) ** 2);
    law = Math.abs(u - want) < 1e-12;
  }
  check("envelope: two thousand rolled loads — the root-of-squares over four terms, exact", law); }
{ let comp = true;
  for (let i = 0; i < 500 && comp; i++) {
    const L = rollLim();
    comp = structuralUtil(L, -(1 + rnd() * 1e6), 0, 0, 0) === 0;
  }
  check("envelope: compression never tears — any crushing load reads zero", comp); }
{ let single = true;
  for (let i = 0; i < 500 && single; i++) {
    const L = rollLim(); const f = rnd() * 3;
    single = Math.abs(structuralUtil(L, L.tension * f, 0, 0, 0) - f) < 1e-9
      && Math.abs(structuralUtil(L, 0, L.shear * f, 0, 0) - f) < 1e-9;
  }
  check("envelope: one load type alone reads its own fraction of its own limit", single); }
{ // fatigue: the damage law is measure()'s own — util over 0.6 accrues, the tear line drops
  const mk = (damage) => { const w = new Weld({ a: new Body({ mass: 0 }), b: new Body({ mass: 1, inertia: boxInertia(1, 1, 1, 1) }), ra: V(), rb: V(), lim: { tension: 100, shear: 1e9, bend: 1e9, torsion: 1e9 }, damageRate: 1 });
    w.damage = damage; return w; };
  const h = 1 / 240;
  const at = (w, axial) => { w.reset(); w.lp = V(0, axial * h * h, 0); w.la = V(); w.axis = V(0, 1, 0); w.a.q = { x: 0, y: 0, z: 0, w: 1 }; w.measure(h); return w; };
  const fresh = at(mk(0), 95);          // util .95 under the line — holds
  const worn = at(mk(0.2), 95);         // same load, worn to 0.8 line — tears
  const floor = at(mk(5), 9);           // damage floors at 0.9 — the line never drops under 0.1
  check("envelope: the tear line is 1 less damage — a worn mount tears where a fresh one holds",
    !fresh.broken && fresh.util > 0.9 && worn.broken && worn.brokeAtUtil > 0.9); }
{ const w = new Weld({ a: new Body({ mass: 0 }), b: new Body({ mass: 1, inertia: boxInertia(1, 1, 1, 1) }), ra: V(), rb: V(), lim: { tension: 100, shear: 1e9, bend: 1e9, torsion: 1e9 }, damageRate: 1 });
  w.damage = 5; w.reset(); w.lp = V(0, 11 * (1 / 240) ** 2, 0); w.axis = V(0, 1, 0); w.measure(1 / 240);
  check("envelope: fatigue floors at ninety percent — a ruin still carries a tenth", w.broken === (w.util >= 0.1) && w.damage >= 5); }
console.log(`envelope-test: ${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
console.log("envelope-test PASS");
```

Then `sha256sum scripts/envelope-test.mjs` — must print `c702713e23f40134503fce9e891841b750c2483ea5b163d868f6445f2b402764`.

3. In `scripts/gate.mjs`, in the GATES table, add one line after the `"manifest"` entry:

```js
  "envelope": ["scripts/envelope-test.mjs"],
```

4. Run the new gate — seeds line, 5 PASS lines, `envelope-test: 5 PASS / 0 FAIL`, `envelope-test PASS`, exit 0:

```sh
node scripts/gate.mjs envelope
```

5. Bracket unmoved: `node scripts/gate.mjs physics-pb | tail -1` — must print `physics-pb-test PASS`.

6. Close the records: `package.json` version to `0.0.67`; the phase doc's status line to LANDED as its comment shows; in `docs/plans/batch-harvest-1.md` flip this rung's box; in `README.md` flip the checklist box starting `- [ ] Mount failure envelopes` to `- [x]`, and add the line `- [x] envelope laws (mechanism in physics-pb since 0.0.7; laws gated 0.0.67) — mount failure envelopes — 0.0.67` at the bottom of the "Serving checklist items" list.

7. Commit and push, then stamp:

```sh
git add scripts/envelope-test.mjs scripts/gate.mjs package.json README.md docs/plans/phase-0.0.67-envelope.md docs/plans/task-0.0.67-1-envelope.md docs/plans/batch-harvest-1.md
git commit -m "phase 0.0.67 — the mount failure envelopes

Checklist: Mount failure envelopes. Gate 5 PASS / 0 FAIL at rolled seeds; physics-pb unmoved.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push origin main
H=$(git rev-parse --short HEAD)
sed -i "s/commit stamped below/commit \`$H\`/" docs/plans/phase-0.0.67-envelope.md
git add docs/plans/phase-0.0.67-envelope.md && git commit -m "phase 0.0.67 record stamped — $H

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push origin main
```

## Acceptance

- Every sha256 above exact; the gate `5 PASS / 0 FAIL` then `envelope-test PASS` at rolled seeds; physics-pb's tail unchanged; records flipped riding the landing; pushes accepted.

## Report

Read-confirmation first, then one line of outcome, then bullets: the sha256 lines verbatim, the new gate's seeds/count/verdict lines, the physics-pb tail, both commit hashes, the push results. Every nonconformity its own labeled bullet.
