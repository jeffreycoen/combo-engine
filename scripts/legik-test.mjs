// COMBO-ENGINE — legik-test. One target inside reach, one beyond it, one
// rolled leg table, the level-sole identity, twin calls, the contract, the
// import fence: legFK undoes legIK exactly inside reach, clamps to
// maxExtend times the leg's length beyond it, and the sole stays level at
// every solve.
import fs from "node:fs";
import { LEG, legIK, legFK, checkLegs } from "../src/modules/legik/legik.js";

let pass = 0, fail = 0;
const check = (n, ok) => { if (ok) { pass++; console.log("PASS " + n); } else { fail++; console.log("FAIL " + n); } };
const SEED = process.env.SEED ? +process.env.SEED : Math.floor(Math.random() * 1e9);
console.log("seeds " + JSON.stringify({ legik: SEED }));
let a = SEED >>> 0;
const rnd = () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

// a rolled direction (x,z in -1..1, y negative), rescaled to a rolled distance in [loDist, hiDist]
const rolledTarget = (loDist, hiDist) => {
  const rx = rnd() * 2 - 1, rz = rnd() * 2 - 1, ry = -rnd();
  const rawLen = Math.hypot(rx, ry, rz);
  const dist = loDist + rnd() * (hiDist - loDist);
  const scale = dist / rawLen;
  return { x: rx * scale, y: ry * scale, z: rz * scale };
};

{ // 1. legFK of legIK returns the target within 1e-9 at rolled reachable targets
  const lo = Math.abs(LEG.thigh - LEG.shin) + 0.05;
  const hi = 0.99 * (LEG.thigh + LEG.shin);
  let ok = true;
  for (let i = 0; i < 500 && ok; i++) {
    const d = rolledTarget(lo, hi);
    const p = legFK(legIK(d));
    ok = Math.abs(p.x - d.x) < 1e-9 && Math.abs(p.y - d.y) < 1e-9 && Math.abs(p.z - d.z) < 1e-9;
  }
  check("legik: legFK of legIK returns the target within 1e-9 at rolled reachable targets", ok);
}

{ // 2. an unreachable target reports reach at least 1 and the solved leg spans maxExtend times the full length
  const sum = LEG.thigh + LEG.shin;
  let ok = true;
  for (let i = 0; i < 200 && ok; i++) {
    const d = rolledTarget(sum * 1.01, sum * 3);
    const q = legIK(d);
    const p = legFK(q);
    const len = Math.hypot(p.x, p.y, p.z);
    ok = q.reach >= 1 && Math.abs(len - 0.995 * sum) < 1e-9;
  }
  check("legik: an unreachable target reports reach at least 1 and the solved leg spans maxExtend times the full length", ok);
}

{ // 3. a rolled leg table moves the reach exactly (the demo's own two-way clamp:
  // capped by maxExtend times the sum, floored by the thigh-shin difference plus
  // 1e-4; the larger of the two wins)
  let ok = true;
  for (let i = 0; i < 200 && ok; i++) {
    const opts = { thigh: 0.5 + rnd() * 1.5, shin: 0.5 + rnd() * 1.5, maxExtend: 0.5 + rnd() * 0.5 };
    const sum = opts.thigh + opts.shin;
    const d = rolledTarget(sum * 2, sum * 5); // safely beyond reach for any maxExtend <= 1
    const q = legIK(d, opts);
    const p = legFK(q, opts);
    const len = Math.hypot(p.x, p.y, p.z);
    const expect = Math.max(opts.maxExtend * sum, Math.abs(opts.thigh - opts.shin) + 1e-4);
    ok = Math.abs(len - expect) < 1e-9;
  }
  check("legik: a rolled leg table moves the reach exactly", ok);
}

{ // 4. the sole stays level — the three pitch joints sum to zero and the ankle roll cancels the hip roll
  const lo = Math.abs(LEG.thigh - LEG.shin) + 0.05;
  const hi = 0.99 * (LEG.thigh + LEG.shin);
  let ok = true;
  for (let i = 0; i < 500 && ok; i++) {
    const q = legIK(rolledTarget(lo, hi));
    ok = Math.abs(q.hipPitch + q.knee + q.anklePitch) < 1e-12 && q.ankleRoll === -q.hipRoll;
  }
  check("legik: the sole stays level — the three pitch joints sum to zero and the ankle roll cancels the hip roll", ok);
}

{ // 5. twin calls agree
  let ok = true;
  for (let i = 0; i < 200 && ok; i++) {
    const d = rolledTarget(0.1, 3 * (LEG.thigh + LEG.shin));
    const q1 = legIK(d), q2 = legIK(d);
    const sameQ = q1.hipRoll === q2.hipRoll && q1.hipPitch === q2.hipPitch && q1.knee === q2.knee
      && q1.anklePitch === q2.anklePitch && q1.ankleRoll === q2.ankleRoll && q1.reach === q2.reach;
    const p1 = legFK(q1), p2 = legFK(q1);
    ok = sameQ && p1.x === p2.x && p1.y === p2.y && p1.z === p2.z;
  }
  check("legik: twin calls agree", ok);
}

{ // 6. the contract counts every problem
  const broken = checkLegs({ thigh: -1, shin: "x", maxExtend: 2 });
  const clean = checkLegs(LEG);
  const notObject = checkLegs(null);
  check("legik: the contract counts every problem", broken.length === 3 && clean.length === 0 && notObject.length === 1);
}

{ // 7. the module imports only from its own folder or a sibling module
  const src = fs.readFileSync(new URL("../src/modules/legik/legik.js", import.meta.url), "utf8");
  const specs = [...src.matchAll(/import[^\n]*from\s*["']([^"']+)["']/g)].map((m) => m[1]);
  const ok = specs.every((s) => /^\.\.\/[a-z0-9-]+\//.test(s) || /^\.\//.test(s));
  check("legik: the module imports only from its own folder or a sibling module", ok);
}

console.log(`legik-test: ${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
console.log("legik-test PASS");
