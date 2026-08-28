// COMBO-ENGINE — ballistics-test: the ballistics module's gate. Fourteen
// checks. Seeds 7, 42, 99 drive the projectile streams; no seed is special.
// The knowns are the demo's own laws run headless: a vacuum tick matches the
// closed form, a 5-degree graze on thin steel returns exactly retain (0.5)
// of its speed, wood and sandbag receipts pinned from the plan trial.
import { makeBox } from "../src/modules/solids/solids.js";
import { Ballistics, mulberry32, MEDIA, M, ROUNDS, R, TICK_DT, POOL, EV_PERFORATE, EV_EMBED, EV_RICOCHET, EV_EXPIRE } from "../src/modules/ballistics/ballistics.js";

let pass = 0, fail = 0;
const check = (name, ok) => { if (ok) { pass++; console.log("PASS " + name); } else { fail++; console.log("FAIL " + name); } };
const near = (a, b) => Math.abs(a - b) < 1e-9;

check("tables: 10 media, 7 rounds, indexes and precomputed areas hold",
  MEDIA.length === 10 && M.air === 0 && M.sandbag === 9 && ROUNDS.length === 7
  && R.hostile_rifle === 5 && near(ROUNDS[0].area, Math.PI * 0.00925 * 0.00925));

check("mulberry32: seed 1 opens with 0.6270739405881613",
  mulberry32(1)() === 0.6270739405881613);

{ const b = new Ballistics({ solids: [], airId: M.vacuum, scatter: false });
  b.fire(R.line_thrower, 0, 0, 0, 1, 0, 0, 7); b.stepTick();
  check("vacuum tick: one tick matches the closed form (x 0.5, drop g/2 dt^2)",
    near(b.px[0], 0.5) && near(b.py[0], -9.80665 / 2 * TICK_DT * TICK_DT)); }

{ const b = new Ballistics({ solids: [], scatter: false });
  b.fire(R.rubber_slug, 0, 0, 0, 1, 0, 0, 7);
  let prev = 360, mono = true;
  for (let k = 0; k < 10; k++) { b.stepTick(); const s = Math.hypot(b.vx[0], b.vy[0], b.vz[0]); if (s >= prev) mono = false; prev = s; }
  check("air drag: a rubber slug sheds speed every tick", mono && prev < 360); }

{ const b = new Ballistics({ solids: [], wind: [0, 0, 5], scatter: false });
  b.fire(R.rubber_slug, 0, 0, 0, 1, 0, 0, 7);
  for (let k = 0; k < 60; k++) b.stepTick();
  check("wind: a 5 m/s crosswind bends the track sideways", b.pz[0] > 0); }

const wood = makeBox(5, 0, 0, 0.04, 4, 4, M.wood);
{ const b = new Ballistics({ solids: [wood], scatter: false });
  b.fire(R.hostile_rifle, 0, 0, 0, 1, 0, 0, 7);
  const n = b.runToRest(20000);
  const e = b.ev;
  check("wood perforation: one perforate then one expire, in 1906 ticks",
    n === 1906 && e.n === 2 && e.type[0] === EV_PERFORATE && e.type[1] === EV_EXPIRE);
  check("wood receipts: energy in 2812.5863776576302, out 2405.951332518563, path 0.04000000013755928",
    near(e.ein[0], 2812.5863776576302) && near(e.eout[0], 2405.951332518563) && near(e.path[0], 0.04000000013755928));
  check("receipts obey the ledger: out below in, both positive, wall path is the wall",
    e.eout[0] < e.ein[0] && e.eout[0] > 0 && Math.abs(e.path[0] - 0.04) < 1e-6); }

{ const bag = makeBox(6, 0, 0, 2, 4, 4, M.sandbag);
  const b = new Ballistics({ solids: [bag], scatter: false });
  b.fire(R.hostile_rifle, 0, 0, 0, 1, 0, 0, 7);
  b.runToRest(20000);
  const e = b.ev;
  check("sandbag embed: one embed event, depth 0.23859612577842754, nothing out, pool empty",
    e.n === 1 && e.type[0] === EV_EMBED && near(e.path[0], 0.23859612577842754) && e.eout[0] === 0 && b.liveCount === 0); }

{ const plate = makeBox(10, -1.5, 0, 20, 1, 20, M.steel_thin);
  const b = new Ballistics({ solids: [plate], scatter: false, gravity: 0, airId: M.vacuum });
  const a = 5 * Math.PI / 180;
  b.fire(R.beanbag, 0, 0, 0, Math.cos(a), -Math.sin(a), 0, 7);
  for (let k = 0; k < 480; k++) b.stepTick();
  const e = b.ev;
  check("ricochet: a 5-degree graze on thin steel bounces up with retain 0.5 — 128 J in, 32 J out, speed 40",
    e.n === 1 && e.type[0] === EV_RICOCHET && near(e.ein[0], 128) && near(e.eout[0], 32)
    && near(Math.hypot(b.vx[0], b.vy[0], b.vz[0]), 40) && b.vy[0] > 0); }

{ const mk = () => { const b = new Ballistics({ solids: [wood] });
    b.fire(R.hostile_smg, 0, 0.5, 0, 1, 0, 0, 42); b.fire(R.hostile_rifle, 0, -0.5, 0.2, 1, 0, -0.02, 99); return b; };
  const b1 = mk(), b2 = mk();
  const n1 = b1.runToRest(30000), n2 = b2.runToRest(30000);
  let same = b1.ev.n === b2.ev.n;
  for (let k = 0; k < b1.ev.n; k++) if (b1.ev.x[k] !== b2.ev.x[k] || b1.ev.type[k] !== b2.ev.type[k]) same = false;
  check("determinism: twin engines with scatter on land every event bit-identical",
    same && n1 === 2119 && n2 === 2119 && b1.ev.n === 4);
  check("determinism pins: first impact x 5.02, last expiry x 436.8950233214441",
    near(b1.ev.x[0], 5.02) && near(b1.ev.x[b1.ev.n - 1], 436.8950233214441)); }

{ const b = new Ballistics({ solids: [], scatter: false });
  for (let k = 0; k < POOL + 1; k++) b.fire(R.tranq_dart, 0, 0, 0, 1, 0, 0, k + 1);
  check("pool: the 65th shot recycles the oldest slot, live count holds at 64", b.liveCount === POOL); }

{ const b = new Ballistics({ solids: [wood], scatter: false });
  b.fire(R.hostile_rifle, 0, 0, 0, 1, 0, 0, 7);
  b.runToRest(20000);
  const n = b.drain();
  check("drain: hands back the event count and resets the buffer to zero", n === 2 && b.ev.n === 0); }

console.log(`ballistics-test: ${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
console.log("ballistics-test PASS");
