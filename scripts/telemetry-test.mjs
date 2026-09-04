// COMBO-ENGINE — telemetry-test. One measured weld, one driven hinge, one
// call: the rows carry the solver's own numbers, name for name, field for
// field; the worst mount is the one nearest its tear line, broken first.
import { Weld, Hinge, Body, V, boxInertia, vlen } from "../src/modules/physics-pb/physics.js";
import { jointLoads, worstMount } from "../src/modules/telemetry/telemetry.js";
let pass = 0, fail = 0;
const check = (n, ok) => { if (ok) { pass++; console.log("PASS " + n); } else { fail++; console.log("FAIL " + n); } };
const SEED = process.env.SEED ? +process.env.SEED : Math.floor(Math.random() * 1e9);
console.log("seeds " + JSON.stringify({ loads: SEED }));
let a = SEED >>> 0;
const rnd = () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const H = 1 / 240;
const mkW = (axial, tension) => { const w = new Weld({ a: new Body({ mass: 0 }), b: new Body({ mass: 1, inertia: boxInertia(1, 1, 1, 1) }), ra: V(), rb: V(), lim: { tension, shear: 1e9, bend: 1e9, torsion: 1e9 } });
  w.reset(); w.lp = V(0, axial * H * H, 0); w.axis = V(0, 1, 0); w.measure(H); return w; };

{ let mirror = true;
  for (let i = 0; i < 300 && mirror; i++) {
    const axial = rnd() * 500, tension = 100 + rnd() * 1000;
    const w = mkW(axial, tension);
    const rows = jointLoads({ shoulder: w });
    const r = rows[0];
    mirror = rows.length === 1 && r.name === "shoulder" && r.util === w.util && r.peakUtil === w.peakUtil
      && r.axial === w.Fax && r.shear === w.Fsh && r.bend === w.Mb && r.torsion === w.Mt
      && Math.abs(r.force - vlen(w.F)) < 1e-12 && r.broken === w.broken && r.angle === null;
  }
  check("telemetry: three hundred rolled welds — every row is the solver's own numbers, field for field", mirror); }
{ const h = new Hinge({ a: new Body({ mass: 0 }), b: new Body({ mass: 1, inertia: boxInertia(1, 1, 1, 1) }), ra: V(), rb: V(), axisA: V(0, 1, 0), refA: V(1, 0, 0), tauMax: 50, target: 1 });
  h.reset(); h.solve(H);
  const r = jointLoads({ knee: h })[0];
  check("telemetry: a hinge row carries its angle and its saturation flag", r.angle === h.angle && r.saturated === h.saturated); }
{ const light = mkW(10, 1000), heavy = mkW(900, 1000), snapped = mkW(2000, 1000);
  const rows = jointLoads({ light, heavy, snapped });
  check("telemetry: the worst mount is the broken one, else the one nearest its tear line",
    worstMount(rows).name === "snapped" && worstMount(jointLoads({ light, heavy })).name === "heavy"); }
{ check("telemetry: an empty machine is an empty report, and its worst mount is nothing",
    jointLoads({}).length === 0 && worstMount([]) === null); }
console.log(`telemetry-test: ${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
console.log("telemetry-test PASS");
