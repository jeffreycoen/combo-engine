# Task 0.0.15-1 — the grapple module

One job: write the grapple rope module and its gate exactly as printed below, register the gate, prove the numbers, close the records. Every file's full content is below; write exactly what is written, run the listed gates, report. You design nothing.

Suggested model: Sonnet 5.

Required reading, in order (confirm at the top of your report):
1. This file, whole.
2. `docs/plans/phase-0.0.15-grapple-module.md`, whole.

Source of the law (reference only — do not edit it): `deadweight-hangar.html` lines 1781–1936.

## Steps

Run from `/home/batman/combo-engine`. A failed assert stops the task; report the step and its verbatim output, run nothing further.

1. Assert the ground: all prior gates green, destination absent. Each command must end with the tail shown; `absent` must print.

```sh
node scripts/gate.mjs api          # tail: seed 1  seconds 90 (10800 steps)  worldHash 3367709165  runHash 2717846799
node scripts/gate.mjs combat       # tail: ALL PASS
node scripts/gate.mjs accuracy     # tail: 11/11
node scripts/gate.mjs market       # tail: market-test PASS
node scripts/gate.mjs builder      # tail: builder-test PASS
node scripts/gate.mjs ledger       # tail: ledger-test PASS
node scripts/gate.mjs weldstress   # tail: weldstress-test PASS
node scripts/gate.mjs tape         # tail: tape-test PASS
node scripts/gate.mjs physics-pb   # tail: physics-pb-test PASS
node scripts/gate.mjs rig          # tail: rig-test PASS
node scripts/gate.mjs solids       # tail: solids-test PASS
node scripts/gate.mjs ballistics   # tail: ballistics-test PASS
node scripts/gate.mjs orders       # tail: orders-test PASS
node scripts/gate.mjs steering     # tail: steering-test PASS
node scripts/gate.mjs voxel        # tail: voxel-test PASS
node scripts/gate.mjs support      # tail: support-test PASS
ls src/modules/grapple 2>/dev/null || echo absent
```

2. Write `src/modules/grapple/grapple.js`, exactly as printed, ending at the final `}`; the commands after the block set the file's exact ending mechanically, however the writing tool ended the file:

```js
// modules/grapple — the grapple rope, a SHAPED lift from the deadweight
// demo (deadweight-hangar.html lines 1781-1936). The LAW is the demo's,
// carried exactly and cited by line; the CODE differs only in that the
// demo's game entities become arguments: the ship is any body with
// {x, y, vx, vy, w, M, I}, the target any body with {x, y, vx, vy} plus its
// mass, the anchor a point the caller supplies, and gravity a callback.
// What the head bites and what a torn weld yields stay with the game. The
// law:
//   - one line at a time; the tap grammar is fly -> rewind, stuck -> reel,
//     reel -> cut (1785-1789);
//   - the cast leaves 2.2 ahead of the anchor at 34 u/s plus ship velocity,
//     and the ship pays the recoil J = 0.15 * 34 with its torque arm
//     (1790-1797);
//   - a cast spends past range 95 or 5 seconds and rewinds home at 44,
//     rearming within 2.5 (1806-1825); an adrift or embedded head is
//     recovered within 3 of the ship (1826-1839);
//   - the rope: rest length set at the bite; slack inside it; BEYOND it a
//     constraint, not a spring — the anchor's velocity rides the hull's
//     spin, the radial separation rate against the winch's demand (reeling
//     asks 8 u/s of closing) is killed by an impulse J = rel * mu with mu
//     the reduced mass M*tm/(M+tm), applied to BOTH ends and as torque at
//     the mount (1839-1887);
//   - the first taut moment is THE JERK: J * 1.15, and past 260 the line
//     snaps and the head stays embedded (1871-1875); a yank is one
//     commanded haul J = mu * 22 under the same snap law, eating the slack
//     first (1856-1866);
//   - the line does not stretch: the position error splits by inverse mass
//     (1884-1886);
//   - reeling shortens the rest length 8 u/s to a floor of 4 (1854);
//   - strain: reeling against a bite adds J to the tear account, a yank
//     adds 0.6 J, slack bleeds it at 60 u/s (1866, 1882, 1887) — what tears
//     at what number is the game's ruling, the account is the module's.

export const GRAP_V0 = 34;
export const GRAP_RECOIL = 0.15;
export const GRAP_RANGE = 95;
export const GRAP_TIME = 5;
export const GRAP_REWIND = 44;
export const GRAP_HOME = 2.5;
export const GRAP_RECOVER = 3;
export const GRAP_REEL = 8;
export const GRAP_REST_MIN = 4;
export const GRAP_CLOSE = 8;
export const GRAP_JERK = 1.15;
export const GRAP_SNAP = 260;
export const GRAP_YANK = 22;
export const GRAP_YANK_TEAR = 0.6;
export const GRAP_TEAR_BLEED = 60;

// castGrapple: the head leaves the anchor and the ship pays the recoil
// (demo 1790-1797). arm is the anchor's lever against the hull's centre.
export function castGrapple(ship, ax, ay, armY) {
  const c = Math.cos(ship.ang), s2 = Math.sin(ship.ang);
  const g = {
    x: ax + c * 2.2, y: ay + s2 * 2.2,
    vx: ship.vx + c * GRAP_V0, vy: ship.vy + s2 * GRAP_V0,
    state: 'fly', t: 0, tension: 0,
  };
  const J = GRAP_RECOIL * GRAP_V0;
  ship.vx -= c * J / ship.M; ship.vy -= s2 * J / ship.M;
  ship.w -= armY * J / ship.I;
  return g;
}

// tapGrapple: the demo's tap grammar (1785-1789). Returns the grapple, or
// null when the tap cuts the line.
export function tapGrapple(g) {
  if (g.state === 'fly') { g.state = 'rewind'; return g; }
  if (g.state === 'stuck') { g.state = 'reel'; return g; }
  if (g.state === 'reel') return null;
  return g;
}

// bite: the head takes hold — rest length is set on first taut (1852).
export function bite(g) {
  g.state = 'stuck'; g.taut = false; g.tear = 0; g.restLen = undefined;
  return g;
}

// stepFly: ballistic head; spent past range or time, it rewinds (1806-1819).
export function stepFly(g, accelFn, ax, ay, dt) {
  g.t += dt;
  const [gax, gay] = accelFn(g.x, g.y);
  g.vx += gax * dt; g.vy += gay * dt; g.x += g.vx * dt; g.y += g.vy * dt;
  if (Math.hypot(g.x - ax, g.y - ay) > GRAP_RANGE || g.t > GRAP_TIME) g.state = 'rewind';
  return g;
}

// stepRewind: the winch brings the head home at 44; within 2.5 the line is
// home and armed again (1820-1825). Returns null when home.
export function stepRewind(g, ax, ay, dt) {
  const dx = ax - g.x, dy = ay - g.y, dd = Math.hypot(dx, dy) || 1;
  g.vx = dx / dd * GRAP_REWIND; g.vy = dy / dd * GRAP_REWIND;
  g.x += g.vx * dt; g.y += g.vy * dt;
  return dd < GRAP_HOME ? null : g;
}

// stepAdrift: a loose head coasts under gravity; fly to it and it is
// recovered within 3 (1826-1831). Returns null when recovered.
export function stepAdrift(g, accelFn, sx, sy, dt) {
  const [gax, gay] = accelFn(g.x, g.y);
  g.vx += gax * dt; g.vy += gay * dt; g.x += g.vx * dt; g.y += g.vy * dt;
  return Math.hypot(g.x - sx, g.y - sy) < GRAP_RECOVER ? null : g;
}

// stepEmbedded: a snapped head rides its target; recover within 3 of the
// ship (1832-1839). Returns null when recovered.
export function stepEmbedded(g, tgt, sx, sy) {
  g.x = tgt.x; g.y = tgt.y; g.vx = tgt.vx || 0; g.vy = tgt.vy || 0;
  return Math.hypot(g.x - sx, g.y - sy) < GRAP_RECOVER ? null : g;
}

export function requestYank(g) { g.yankReq = true; return g; }

// stepRope: the taut law (demo 1839-1887) — yank, constraint impulse with
// the jerk and the snap, the no-stretch position split, the strain account.
// ship: {x, y, vx, vy, w, M, I}; tgt: {x, y, vx, vy}; tm: target mass;
// ax, ay: the anchor point on the hull. Returns what happened.
export function stepRope(g, ship, ax, ay, tgt, tm, dt) {
  g.x = tgt.x; g.y = tgt.y;
  const dx = tgt.x - ax, dy = tgt.y - ay, dd = Math.hypot(dx, dy) || 1;
  if (g.restLen === undefined) g.restLen = dd;
  if (g.state === 'reel') g.restLen = Math.max(GRAP_REST_MIN, g.restLen - GRAP_REEL * dt);
  const M = ship.M, mu = (M * tm) / (M + tm);
  const rx = ax - ship.x, ry = ay - ship.y;
  const out = { snapped: false, taut: false, J: 0 };
  if (g.yankReq) {
    g.yankReq = false;
    g.restLen = Math.min(g.restLen, dd);
    const nx = dx / dd, ny = dy / dd;
    const J = mu * GRAP_YANK;
    if (J > GRAP_SNAP) {
      g.state = 'embedded'; g.taut = false; g.tear = 0;
      out.snapped = true; return out;
    }
    ship.vx += nx * J / M; ship.vy += ny * J / M;
    ship.w += (rx * ny - ry * nx) * J / ship.I;
    tgt.vx -= nx * J / tm; tgt.vy -= ny * J / tm;
    g.tear = (g.tear || 0) + J * GRAP_YANK_TEAR;
    out.J = J;
  }
  if (dd > g.restLen) {
    const avx = ship.vx - ship.w * ry, avy = ship.vy + ship.w * rx;
    const nx = dx / dd, ny = dy / dd;
    const vrad = (tgt.vx - avx) * nx + (tgt.vy - avy) * ny;
    const want = g.state === 'reel' ? -GRAP_CLOSE : 0;
    const rel = vrad - want;
    if (rel > 0) {
      let J = rel * mu;
      if (!g.taut) {
        J *= GRAP_JERK;
        if (J > GRAP_SNAP) {
          g.state = 'embedded'; g.taut = false; g.tear = 0;
          out.snapped = true; return out;
        }
      }
      ship.vx += nx * J / M; ship.vy += ny * J / M;
      ship.w += (rx * ny - ry * nx) * J / ship.I;
      tgt.vx -= nx * J / tm; tgt.vy -= ny * J / tm;
      if (g.state === 'reel') g.tear = (g.tear || 0) + J;
      out.J += J;
    }
    g.taut = true;
    const err = dd - g.restLen, wS = tm / (M + tm), wT = M / (M + tm);
    const nx2 = dx / dd, ny2 = dy / dd;
    ship.x += nx2 * err * wS; ship.y += ny2 * err * wS;
    tgt.x -= nx2 * err * wT; tgt.y -= ny2 * err * wT;
    out.taut = true;
  } else {
    g.taut = false;
    g.tear = Math.max(0, (g.tear || 0) - GRAP_TEAR_BLEED * dt);
  }
  return out;
}
```

Then set the exact ending and assert identity:

```sh
truncate -s 7371 src/modules/grapple/grapple.js   # end exactly at the final }, however the writing tool ended the file
printf '\n' >> src/modules/grapple/grapple.js     # the final line's newline
wc -c src/modules/grapple/grapple.js       # must print 7372
sha256sum src/modules/grapple/grapple.js   # must print 6030a8eb2f00074f455feda07193fbeb5c7dcce0be1f43dd6bcb265d3c74a50c
```

3. Write `scripts/grapple-test.mjs`, exactly as printed; the commands after the block set the ending the same way:

```js
// COMBO-ENGINE — grapple-test: the grapple rope module's gate. Sixteen
// checks, seedless arithmetic. The knowns are the demo's own constants run
// closed-form: recoil 0.15 x 34 = 5.1, the winch's 8 u/s demand, the jerk's
// 1.15, the 260 snap line, the yank's mu x 22.
import { castGrapple, tapGrapple, bite, stepFly, stepRewind, stepAdrift, stepEmbedded, requestYank, stepRope, GRAP_SNAP } from "../src/modules/grapple/grapple.js";

let pass = 0, fail = 0;
const check = (name, ok) => { if (ok) { pass++; console.log("PASS " + name); } else { fail++; console.log("FAIL " + name); } };
const near = (a, b, e) => Math.abs(a - b) < (e || 1e-9);
const noG = () => [0, 0];
const mkShip = (M, I) => ({ x: 0, y: 0, vx: 0, vy: 0, w: 0, ang: 0, M: M || 100, I: I || 500 });

{ const s = mkShip();
  const g = castGrapple(s, 2, 0, 1.5);
  check("cast: the head leaves 2.2 ahead at 34 plus ship velocity, state fly",
    near(g.x, 4.2) && near(g.y, 0) && near(g.vx, 34) && near(g.vy, 0) && g.state === 'fly');
  check("recoil: the ship pays J = 0.15 x 34 = 5.1 — velocity -J/M, spin -arm J/I",
    near(s.vx, -5.1 / 100) && near(s.w, -(1.5 * 5.1) / 500)); }

{ const g = { state: 'fly' };
  check("tap grammar: fly calls it back, stuck starts the reel, reeling cuts",
    tapGrapple(g).state === 'rewind'
    && (g.state = 'stuck', tapGrapple(g).state === 'reel')
    && tapGrapple(g) === null); }

{ const s = mkShip();
  const g = castGrapple(s, 0, 0, 0);
  for (let k = 0; k < 400 && g.state === 'fly'; k++) stepFly(g, noG, 0, 0, 1 / 60);
  check("spent cast: past range 95 the head turns for home on its own",
    g.state === 'rewind' && Math.hypot(g.x, g.y) > 95); }

{ const g = { state: 'rewind', x: 40, y: 0, vx: 0, vy: 0 };
  let r = g, steps = 0;
  while (r && steps++ < 200) r = stepRewind(r, 0, 0, 1 / 60);
  check("rewind: home at 44 u/s, the line rearms inside 2.5 — 53 steps",
    r === null && steps === 53); }

{ const g = { state: 'adrift', x: 2.9, y: 0, vx: 0, vy: 0 };
  check("recovery: fly within 3 of an adrift head and it is recovered",
    stepAdrift(g, noG, 0, 0, 1 / 60) === null);
  const tgt = { x: 10, y: 0, vx: 1, vy: 0 };
  const e = { state: 'embedded' };
  check("embedded: a snapped head rides its target until fetched",
    stepEmbedded(e, tgt, 0, 0) === e && e.x === 10 && near(e.vx, 1)
    && stepEmbedded(e, { x: 1, y: 0, vx: 0, vy: 0 }, 0, 0) === null); }

{ const s = mkShip(100, 500);
  const g = bite({});
  const tgt = { x: 10, y: 0, vx: 0.5, vy: 0 };
  const r = stepRope(g, s, 0, 0, tgt, 25, 1 / 60);
  check("the bite sets the rest length: inside it the rope is slack and nothing pulls",
    near(g.restLen, 10) && r.taut === false && s.vx === 0 && tgt.vx === 0.5); }

{ const s = mkShip(100, 500);
  const g = bite({}); g.restLen = 10; g.state = 'stuck';
  const tgt = { x: 12, y: 0, vx: 2, vy: 0 };
  const mu = (100 * 25) / 125;
  const J = 2 * mu * 1.15;
  const p0 = 100 * s.vx + 25 * tgt.vx;
  const r = stepRope(g, s, 0, 0, tgt, 25, 1 / 60);
  check("the jerk: first taut kills the separation at rel x mu x 1.15, both ends pulled by their masses",
    r.taut === true && near(r.J, J) && near(s.vx, J / 100) && near(tgt.vx, 2 - J / 25));
  check("momentum holds through the line", near(100 * s.vx + 25 * tgt.vx, p0));
  check("the line does not stretch: the 2-unit error splits by inverse mass — ship 0.4, target 1.6",
    near(s.x, 2 * (25 / 125)) && near(tgt.x, 12 - 2 * (100 / 125))); }

{ const s = mkShip(100, 500);
  const g = bite({}); g.restLen = 10; g.state = 'reel'; g.taut = true;
  const tgt = { x: 12, y: 0, vx: 0, vy: 0 };
  const dt = 1 / 60;
  const rest1 = Math.max(4, 10 - 8 * dt);
  const mu = (100 * 25) / 125;
  const r = stepRope(g, s, 0, 0, tgt, 25, dt);
  check("the winch: reeling shortens the rest length 8 u/s and demands 8 u/s of closing — J = 8 x mu, strain booked",
    near(g.restLen, rest1) && near(r.J, 8 * mu) && near(g.tear, 8 * mu)); }

{ const s = mkShip(100, 500);
  const g = bite({}); g.restLen = 5; g.state = 'stuck';
  const tgt = { x: 20, y: 0, vx: 20, vy: 0 };
  const r = stepRope(g, s, 0, 0, tgt, 10000, 1 / 60);
  check("the snap: a runaway mass makes the jerk exceed 260 — the line parts, the head stays embedded",
    r.snapped === true && g.state === 'embedded' && s.vx === 0 && tgt.vx === 20); }

{ const s = mkShip(100, 500);
  const g = bite({}); g.restLen = 20; g.state = 'stuck'; g.taut = true;
  const tgt = { x: 10, y: 0, vx: 0, vy: 0 };
  const mu = (100 * 10) / 110;
  requestYank(g);
  const r = stepRope(g, s, 0, 0, tgt, 10, 1 / 60);
  check("the yank: one commanded haul J = mu x 22 eats the slack, moves both ends, books 0.6 J of strain (less one step of slack bleed)",
    near(g.restLen, 10) && near(r.J, mu * 22, 1e-6) && near(s.vx, mu * 22 / 100)
    && near(tgt.vx, -mu * 22 / 10) && near(g.tear, mu * 22 * 0.6 - 60 / 60)
    && mu * 22 < GRAP_SNAP); }

{ const s = mkShip(100, 500);
  const g = bite({}); g.restLen = 20; g.state = 'stuck'; g.taut = true;
  const tgt = { x: 10, y: 0, vx: 0, vy: 0 };
  requestYank(g);
  const r = stepRope(g, s, 0, 0, tgt, 25, 1 / 60);
  check("yank snap: hauling a mass whose mu x 22 tops 260 parts the line instead of moving anything",
    r.snapped === true && g.state === 'embedded' && s.vx === 0 && tgt.vx === 0); }

{ const s = mkShip(100, 500);
  s.w = 1;
  const g = bite({}); g.restLen = 10; g.state = 'stuck'; g.taut = true;
  const tgt = { x: 12, y: 5, vx: 0, vy: 0 };
  const mu = (100 * 25) / 125;
  stepRope(g, s, 0, 5, tgt, 25, 1 / 60);
  // anchor (0,5) on a hull spinning at w=1: avx = -w*ry = -5, so the still
  // target separates at 5 u/s; J = 5*mu, torque (rx*ny - ry*nx)*J/I = -5J/500
  check("the anchor rides the hull's spin: the mount 5 above centre turns spin into 5 u/s of separation",
    near(s.vx, 5 * mu / 100) && near(s.w, 1 - 5 * (5 * mu) / 500) && near(tgt.vx, -5 * mu / 25)); }

console.log(`grapple-test: ${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
console.log("grapple-test PASS");
```

Then set the exact ending and assert identity:

```sh
truncate -s 5993 scripts/grapple-test.mjs   # end exactly at the final character of the last line
printf '\n' >> scripts/grapple-test.mjs     # the final line's newline
wc -c scripts/grapple-test.mjs       # must print 5994
sha256sum scripts/grapple-test.mjs   # must print 15e8e58d83776bfe16530512326e9b520c07acbf1e9c1d38a49ebe48ff443c58
```

4. In `scripts/gate.mjs`, in the `GATES` table (currently 16 entries ending with `"support"`), add one line after the `"support"` entry:

```js
  "grapple": ["scripts/grapple-test.mjs"],
```

Touch nothing else in the file.

5. Run the new gate through the wrapper. The output must be 16 PASS lines, then exactly `grapple-test: 16 PASS / 0 FAIL`, then `grapple-test PASS`, exit 0. Any FAIL stops the task before step 6.

```sh
node scripts/gate.mjs grapple
```

6. Assert the prior gates did not move (same commands and required tails as step 1).

7. Close the records in this landing: bump `package.json` version to `0.0.15`; in `docs/plans/phase-0.0.15-grapple-module.md` replace the status line with `Status: LANDED, commit stamped below, 2026-08-28. Gate: 16 PASS / 0 FAIL; prior gates unmoved.`; in `README.md` flip the earned checklist box `- [ ] The grapple rope: taut constraint, both ends pulled by their masses, yank, snap` to `- [x]`.

8. Commit and push the landing, then stamp the real hash in a second small commit — NEVER amend after stamping (an amend rewrites the commit and makes every stamped hash stale; phase 0.0.6 proved it):

```sh
git add src/modules/grapple scripts/grapple-test.mjs scripts/gate.mjs README.md package.json docs/plans
git commit -m "phase 0.0.15 — the grapple rope lands, shaped

Cast and recoil, the taut constraint by reduced mass, the jerk, yank, snap, strain.
grapple-test: 16 PASS / 0 FAIL; sixteen prior gates unmoved.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push origin main
H=$(git rev-parse --short HEAD)
sed -i "s/commit stamped below/commit \`$H\`/" docs/plans/phase-0.0.15-grapple-module.md
git add docs/plans && git commit -m "phase 0.0.15 record stamped — $H

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push origin main
```

## Acceptance

- Step 2 and step 3 wc -c and sha256 lines match exactly.
- Step 5: `grapple-test: 16 PASS / 0 FAIL` then `grapple-test PASS`, exit 0, and an `ok` line in `.superpowers/gates.log`.
- Step 6: every prior gate prints its pinned tail unchanged.
- Step 7's three records flipped, riding the landing commit.
- Push accepted by origin.

## Report

Read-confirmation first, then one line of outcome, then bullets: the gate's count line and verdict line verbatim, both wc -c lines, both sha256 lines, every prior-gate tail, both commit hashes (landing and stamp), the push results. Every nonconformity its own labeled bullet. Fixture seeds: none — seedless arithmetic; no seed is special.
