// COMBO-ENGINE — disc-test: the movement disc module's gate. Seven checks:
// the drag law's clamped running sum, the ray-plane ground hit, the
// open/commit/auto-hide clock, the long-press dial, twin-surface
// agreement, the dials contract, and the import fence.
import { DISC_DIALS, groundHit, makeDisc, checkDiscDials } from "../src/modules/disc/disc.js";
import { readFileSync } from "node:fs";

let pass = 0, fail = 0;
const check = (name, ok) => { if (ok) { pass++; console.log("PASS " + name); } else { fail++; console.log("FAIL " + name); } };

// the small seeded stream the other gates use
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const SEED = process.env.SEED ? (parseInt(process.env.SEED, 10) >>> 0) : ((Math.random() * 0xffffffff) >>> 0);
console.log(`seeds {"disc":${SEED}}`);
const rng = mulberry32(SEED);
const rollIn = (lo, hi) => lo + rng() * (hi - lo);
const rollDials = () => ({
  mouseGain: rollIn(0.05, 1),
  touchGain: rollIn(0.05, 1),
  clamp: rollIn(5, 100),
  autoHideMs: rollIn(50, 2000),
  longPressMs: rollIn(50, 2000),
});
const rollPoint = () => [rollIn(-50, 50), rollIn(-50, 50), rollIn(-50, 50)];

{ // 1. at rolled drags the height is the clamped sum of dy times the source's gain
  let ok = true;
  for (let i = 0; i < 300 && ok; i++) {
    const dials = { mouseGain: rollIn(0.05, 1), touchGain: rollIn(0.05, 1), clamp: rollIn(5, 100) };
    const point = rollPoint();
    const disc = makeDisc({ dials });
    disc.open(point, 0);
    let refH = point[1];
    const n = 1 + Math.floor(rng() * 12);
    for (let j = 0; j < n; j++) {
      const dy = rollIn(-200, 200);
      const source = rng() < 0.5 ? "mouse" : "touch";
      disc.drag(dy, source);
      const delta = source === "mouse" ? -dy * dials.mouseGain : dy * dials.touchGain;
      refH = Math.max(-dials.clamp, Math.min(dials.clamp, refH + delta));
    }
    ok = disc.h === refH;
  }
  check("disc: at rolled drags the height is the clamped sum of dy times the source's gain", ok);
}

{ // 2. groundHit's point lies on the plane and on the ray at rolled rays, and a ray parallel to the plane gives null
  let ok = true;
  for (let i = 0; i < 300 && ok; i++) {
    const planeY = rollIn(-50, 50);
    const above = rollIn(0.5, 50);
    const origin = [rollIn(-100, 100), planeY + above, rollIn(-100, 100)];
    const dir = [rollIn(-1, 1), -rollIn(0.05, 1), rollIn(-1, 1)];
    const pt = groundHit(origin, dir, planeY);
    const t = (planeY - origin[1]) / dir[1];
    const onPlane = pt !== null && pt[1] === planeY;
    const onRay = pt !== null && t > 0
      && Math.abs(pt[0] - (origin[0] + t * dir[0])) < 1e-9
      && Math.abs(pt[2] - (origin[2] + t * dir[2])) < 1e-9;
    const zeroY = groundHit(origin, [dir[0], 0, dir[2]], planeY) === null;
    const away = groundHit(origin, [dir[0], Math.abs(dir[1]), dir[2]], planeY) === null;
    ok = onPlane && onRay && zeroY && away;
  }
  check("disc: groundHit's point lies on the plane and on the ray at rolled rays, and a ray parallel to the plane gives null", ok);
}

{ // 3. open, commit, and the auto-hide follow the clock
  let ok = true;
  for (let i = 0; i < 200 && ok; i++) {
    const dials = rollDials();
    const disc = makeDisc({ dials });
    const point = rollPoint();
    disc.open(point, 0);
    const t = rollIn(0, 1000);
    const tgt = disc.commit(t);
    const committedOk = tgt !== null && tgt[0] === point[0] && tgt[2] === point[2] && disc.active === true;
    const beforeHide = disc.tick(t + dials.autoHideMs - 1);
    const stillActive = beforeHide === true && disc.active === true;
    const atHide = disc.tick(t + dials.autoHideMs);
    const closedNow = atHide === false && disc.active === false;
    const targetNull = disc.target() === null;
    ok = committedOk && stillActive && closedNow && targetNull;
  }
  check("disc: open, commit, and the auto-hide follow the clock", ok);
}

{ // 4. the long press is the dial
  let ok = true;
  for (let i = 0; i < 200 && ok; i++) {
    const dials = rollDials();
    const disc = makeDisc({ dials });
    const downT = rollIn(-1000, 1000);
    const under = disc.longPress(downT, downT + dials.longPressMs - 1);
    const at = disc.longPress(downT, downT + dials.longPressMs);
    ok = under === false && at === true;
  }
  check("disc: the long press is the dial", ok);
}

{ // 5. twin surfaces agree
  let ok = true;
  for (let i = 0; i < 100 && ok; i++) {
    const dials = rollDials();
    const a = makeDisc({ dials });
    const b = makeDisc({ dials });
    let clock = 0;
    const steps = 1 + Math.floor(rng() * 15);
    for (let j = 0; j < steps && ok; j++) {
      const kind = Math.floor(rng() * 5);
      clock += rollIn(0, 50);
      if (kind === 0) {
        const point = rollPoint();
        a.open(point, clock); b.open(point, clock);
      } else if (kind === 1) {
        const dy = rollIn(-200, 200);
        const source = rng() < 0.5 ? "mouse" : "touch";
        a.drag(dy, source); b.drag(dy, source);
      } else if (kind === 2) {
        a.commit(clock); b.commit(clock);
      } else if (kind === 3) {
        a.tick(clock); b.tick(clock);
      } else {
        a.close(); b.close();
      }
      const ta = a.target(), tb = b.target();
      const targetsEqual = ta === null ? tb === null : (tb !== null && ta[0] === tb[0] && ta[1] === tb[1] && ta[2] === tb[2]);
      const pointsEqual = a.point === null ? b.point === null : (b.point !== null && a.point[0] === b.point[0] && a.point[1] === b.point[1] && a.point[2] === b.point[2]);
      ok = a.h === b.h && a.active === b.active && pointsEqual && targetsEqual;
    }
  }
  check("disc: twin surfaces agree", ok);
}

{ // 6. the contract counts every problem
  const broken = checkDiscDials({ mouseGain: 0, touchGain: "x", clamp: -1 });
  const clean = checkDiscDials(DISC_DIALS);
  const notObject = checkDiscDials(null);
  check("disc: the contract counts every problem", broken.length === 5 && clean.length === 0 && notObject.length === 1);
}

{ // 7. the module imports only from its own folder or a sibling module
  const src = readFileSync(new URL("../src/modules/disc/disc.js", import.meta.url), "utf8");
  const specifiers = [...src.matchAll(/^import\s+.*?\bfrom\s+["']([^"']+)["']/gm)].map((m) => m[1]);
  const ok = specifiers.every((spec) => /^\.\.\/[a-z0-9-]+\//.test(spec) || /^\.\//.test(spec));
  check("disc: the module imports only from its own folder or a sibling module", ok);
}

console.log(`disc-test: ${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
console.log("disc-test PASS");
