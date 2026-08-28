# Task 0.0.10-1 — the ballistics module

One job: write the ballistics module and its gate exactly as printed below, register the gate, prove the numbers, close the records. Every file's full content is below; write exactly what is written, run the listed gates, report. You design nothing.

Suggested model: Sonnet 5.

Required reading, in order (confirm at the top of your report):
1. This file, whole.
2. `docs/plans/phase-0.0.10-ballistics-module.md`, whole.

Source of the math (reference only — do not edit it): `holdover-greybox-range-r55-claude-opus-5.html` lines 64–117 and 218–443.

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
ls src/modules/ballistics 2>/dev/null || echo absent
```

2. Write `src/modules/ballistics/ballistics.js`, exactly as printed, ending at the final `}`; the commands after the block set the file's exact ending mechanically, however the writing tool ended the file:

```js
// modules/ballistics — the ballistics solver and its material and round
// tables, lifted from the shooting-range demo
// (holdover-greybox-range-r55-claude-opus-5.html: constants and tables lines
// 64-117, the Ballistics class lines 218-443; verbatim math). Projectiles
// fly with drag, wind, and gravity; against a solid they ricochet,
// perforate, or embed by the material table, every outcome an event with
// its energy receipts. Substitutions from the demo, and only these:
// `export` added to the top-level constants, tables, mulberry32, and the
// class; raycastWorld and hit imported from the solids module (the demo
// holds them in the same script scope); this header added.
import { raycastWorld, hit } from "../solids/solids.js";

export const G = 9.80665;
export const V_STOP = 30;
export const MAX_CHORD_AIR = 1.0;
export const DX_SOLID = 0.0005;
export const TICK_HZ = 120;
export const TICK_DT = 1 / TICK_HZ;
export const POOL = 64;
export const EVCAP = 512;

export const F_DESTABILIZED = 1;
export const F_DEFORMED = 2;
export const F_SPENT = 4;

export const EV_IMPACT = 1, EV_PERFORATE = 2, EV_EMBED = 3, EV_RICOCHET = 4, EV_EXPIRE = 5;

export function mulberry32(a) {
  let s = a >>> 0;
  return function () {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const MEDIA = [
  { name: 'air', rho: 1.225, cd: 1.0, yieldV: 0, ricochetDeg: -1, shatterV: 0, deformV: Infinity, areaMult: 1, retain: 0 },
  { name: 'vacuum', rho: 0, cd: 0, yieldV: 0, ricochetDeg: -1, shatterV: 0, deformV: Infinity, areaMult: 1, retain: 0 },
  { name: 'water', rho: 1000, cd: 0.30, yieldV: 0, ricochetDeg: 7, shatterV: 400, deformV: 150, areaMult: 4.0, retain: 0.55 },
  { name: 'glass_tempered', rho: 2500, cd: 0.9, yieldV: 4.0e6, ricochetDeg: 3, shatterV: 60, deformV: Infinity, areaMult: 1.0, retain: 0.30 },
  { name: 'glass_laminated', rho: 2400, cd: 1.1, yieldV: 9.0e6, ricochetDeg: 5, shatterV: 80, deformV: Infinity, areaMult: 1.2, retain: 0.35 },
  { name: 'wood', rho: 650, cd: 0.8, yieldV: 6.0e6, ricochetDeg: 20, shatterV: 0, deformV: 200, areaMult: 1.5, retain: 0.40 },
  { name: 'steel_thin', rho: 7850, cd: 1.2, yieldV: 2.6e8, ricochetDeg: 15, shatterV: 900, deformV: 250, areaMult: 2.0, retain: 0.50 },
  { name: 'steel_thick', rho: 7850, cd: 1.4, yieldV: 5.2e8, ricochetDeg: 12, shatterV: 1200, deformV: 200, areaMult: 2.5, retain: 0.60 },
  { name: 'concrete', rho: 2400, cd: 1.2, yieldV: 1.1e8, ricochetDeg: 25, shatterV: 0, deformV: 220, areaMult: 2.0, retain: 0.45 },
  { name: 'sandbag', rho: 1600, cd: 1.0, yieldV: 1.2e6, ricochetDeg: 30, shatterV: 0, deformV: 180, areaMult: 3.0, retain: 0.20 }
];
export const M = {};
MEDIA.forEach((m, i) => { M[m.name] = i; });

export const ROUNDS = [
  { name: 'rubber_slug', mass: 0.040, dia: 0.0185, muzzle: 360, family: 'people' },
  { name: 'beanbag', mass: 0.040, dia: 0.0300, muzzle: 80, family: 'people' },
  { name: 'tranq_dart', mass: 0.005, dia: 0.0080, muzzle: 120, family: 'people' },
  { name: 'breach_slug', mass: 0.055, dia: 0.0145, muzzle: 300, family: 'object' },
  { name: 'line_thrower', mass: 0.200, dia: 0.0200, muzzle: 60, family: 'utility' },
  // what the opposition carries. You are constrained; they are not.
  { name: 'hostile_rifle', mass: 0.0095, dia: 0.00762, muzzle: 780, family: 'lethal' },
  { name: 'hostile_smg', mass: 0.0080, dia: 0.00900, muzzle: 380, family: 'lethal' }
];
export const R = {};
ROUNDS.forEach((r, i) => { R[r.name] = i; r.area = Math.PI * (r.dia / 2) * (r.dia / 2); });

export class Ballistics {
  constructor(opts) {
    opts = opts || {};
    this.solids = opts.solids || [];
    this.query = opts.query || null;
    this.gravity = opts.gravity === undefined ? -G : opts.gravity;
    this.windBase = opts.wind ? opts.wind.slice() : [0, 0, 0];
    this.gust = opts.gust === undefined ? 0 : opts.gust;
    this.scatter = opts.scatter === undefined ? true : opts.scatter;
    this.airId = opts.airId === undefined ? M.air : opts.airId;
    this.maxTof = opts.maxTof === undefined ? 20 : opts.maxTof;
    this.maxDrop = opts.maxDrop === undefined ? -500 : opts.maxDrop;
    this.maxRange = opts.maxRange === undefined ? 5000 : opts.maxRange;
    this.tick = 0;
    this.acc = 0;

    const n = POOL;
    this.px = new Float64Array(n); this.py = new Float64Array(n); this.pz = new Float64Array(n);
    this.vx = new Float64Array(n); this.vy = new Float64Array(n); this.vz = new Float64Array(n);
    this.mass = new Float64Array(n); this.area = new Float64Array(n); this.tof = new Float64Array(n);
    this.yaw = new Float64Array(n); this.flags = new Uint8Array(n); this.typeId = new Uint8Array(n);
    this.act = new Uint8Array(n); this.rngS = new Uint32Array(n); this.born = new Float64Array(n);
    this.nextSlot = 0; this.liveCount = 0;

    this.ev = { type: new Uint8Array(EVCAP), x: new Float64Array(EVCAP), y: new Float64Array(EVCAP), z: new Float64Array(EVCAP), ix: new Float64Array(EVCAP), iy: new Float64Array(EVCAP), iz: new Float64Array(EVCAP), ein: new Float64Array(EVCAP), eout: new Float64Array(EVCAP), path: new Float64Array(EVCAP), dx: new Float64Array(EVCAP), dy: new Float64Array(EVCAP), dz: new Float64Array(EVCAP), mat: new Int16Array(EVCAP), solid: new Int16Array(EVCAP), pid: new Int16Array(EVCAP), n: 0 };
    this.stats = { steps: 0, rays: 0 };
  }

  rand(i) {
    let s = (this.rngS[i] + 0x6D2B79F5) >>> 0;
    this.rngS[i] = s;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  wind(t, ox, oy, oz, out) {
    let wx = this.windBase[0], wy = this.windBase[1], wz = this.windBase[2];
    if (this.gust > 0) {
      const h = Math.sin(t * 0.7 + ox * 0.013) * Math.cos(t * 0.31 + oz * 0.017);
      wx += this.gust * h; wz += this.gust * 0.4 * Math.sin(t * 0.53 + oy * 0.02);
    }
    out[0] = wx; out[1] = wy; out[2] = wz;
  }

  fire(typeId, ox, oy, oz, dx, dy, dz, seed) {
    let slot = -1;
    for (let k = 0; k < POOL; k++) { const i = (this.nextSlot + k) % POOL; if (!this.act[i]) { slot = i; break; } }
    if (slot < 0) {
      let oldest = 0, bt = Infinity;
      for (let i = 0; i < POOL; i++) if (this.born[i] < bt) { bt = this.born[i]; oldest = i; }
      slot = oldest;
    } else this.liveCount++;
    this.nextSlot = (slot + 1) % POOL;
    const r = ROUNDS[typeId];
    const l = Math.hypot(dx, dy, dz) || 1;
    const sp = r.muzzle;
    this.px[slot] = ox; this.py[slot] = oy; this.pz[slot] = oz;
    this.vx[slot] = dx / l * sp; this.vy[slot] = dy / l * sp; this.vz[slot] = dz / l * sp;
    this.mass[slot] = r.mass; this.area[slot] = r.area; this.tof[slot] = 0;
    this.yaw[slot] = 0; this.flags[slot] = 0; this.typeId[slot] = typeId;
    this.act[slot] = 1; this.rngS[slot] = (seed >>> 0) || 1; this.born[slot] = this.tick;
    return slot;
  }

  pushEvent(type, i, x, y, z, ix, iy, iz, ein, eout, path, mat, solid, dx, dy, dz) {
    const e = this.ev;
    if (e.n >= EVCAP) return;
    const k = e.n++;
    e.type[k] = type; e.x[k] = x; e.y[k] = y; e.z[k] = z;
    e.ix[k] = ix; e.iy[k] = iy; e.iz[k] = iz;
    e.ein[k] = ein; e.eout[k] = eout; e.path[k] = path; e.mat[k] = mat; e.solid[k] = solid; e.pid[k] = i;
    e.dx[k] = dx || 0; e.dy[k] = dy || 0; e.dz[k] = dz || 0;
  }
  drain() { const n = this.ev.n; this.ev.n = 0; return n; }

  traverse(i, medId, pathLen, speed) {
    const med = MEDIA[medId];
    if (!this.flags[i] && speed > med.deformV) { }
    if (speed > med.deformV && !(this.flags[i] & F_DEFORMED)) {
      this.area[i] *= med.areaMult;
      this.flags[i] |= F_DEFORMED;
    }
    const SD = this.mass[i] / this.area[i];
    const k = med.rho * med.cd / (2 * SD);
    const mu = med.yieldV / SD;
    let v = speed, x = 0, guard = 0;
    const dx = DX_SOLID;
    while (x < pathLen && guard++ < 2000000) {
      const step = Math.min(dx, pathLen - x);
      const dv = -(k * v + (v > 1e-6 ? mu / v : 0)) * step;
      const nv = v + dv;
      if (nv <= V_STOP) {
        const need = v - V_STOP;
        const rate = -(dv / step);
        const frac = rate > 1e-12 ? need / rate : step;
        return { v: V_STOP, x: x + Math.min(frac, step), stopped: true };
      }
      v = nv; x += step;
    }
    return { v, x: pathLen, stopped: false };
  }

  stepTick() {
    const dt = TICK_DT, t = this.tick * dt;
    const w = this._w || (this._w = new Float64Array(3));
    for (let i = 0; i < POOL; i++) {
      if (!this.act[i]) continue;
      let px = this.px[i], py = this.py[i], pz = this.pz[i];
      let vx = this.vx[i], vy = this.vy[i], vz = this.vz[i];
      const m = this.mass[i];
      const air = MEDIA[this.airId];
      let sp = Math.hypot(vx, vy, vz);
      let sub = Math.ceil(sp * dt / MAX_CHORD_AIR); if (sub < 1) sub = 1; if (sub > 64) sub = 64;
      const h = dt / sub;
      let alive = true;

      for (let s = 0; s < sub && alive; s++) {
        this.wind(t + s * h, px, py, pz, w);
        const SD = m / this.area[i];
        const k = air.rho * air.cd / (2 * SD);

        let rx = vx - w[0], ry = vy - w[1], rz = vz - w[2];
        let rs = Math.hypot(rx, ry, rz);
        const a1x = -k * rs * rx, a1y = -k * rs * ry + this.gravity, a1z = -k * rs * rz;
        const e1x = vx + a1x * h, e1y = vy + a1y * h, e1z = vz + a1z * h;
        rx = e1x - w[0]; ry = e1y - w[1]; rz = e1z - w[2]; rs = Math.hypot(rx, ry, rz);
        const a2x = -k * rs * rx, a2y = -k * rs * ry + this.gravity, a2z = -k * rs * rz;
        const nvx = vx + (a1x + a2x) * h * 0.5, nvy = vy + (a1y + a2y) * h * 0.5, nvz = vz + (a1z + a2z) * h * 0.5;

        const nx0 = px + (vx + nvx) * h * 0.5, ny0 = py + (vy + nvy) * h * 0.5, nz0 = pz + (vz + nvz) * h * 0.5;
        let dxr = nx0 - px, dyr = ny0 - py, dzr = nz0 - pz;
        const seg = Math.hypot(dxr, dyr, dzr);
        this.stats.steps++;

        if (seg > 1e-12 && this.solids.length) {
          const ux = dxr / seg, uy = dyr / seg, uz = dzr / seg;
          this.stats.rays++;
          const gotHit = this.query ? this.query(px, py, pz, ux, uy, uz, seg)
                                     : raycastWorld(this.solids, px, py, pz, ux, uy, uz, seg);
          if (gotHit) {
            const medId = hit.mat;
            const hx = px + ux * hit.t, hy = py + uy * hit.t, hz = pz + uz * hit.t;
            const vin = Math.hypot(vx, vy, vz);
            const ein = 0.5 * m * vin * vin;
            const med = MEDIA[medId];
            let nx = hit.nx, ny = hit.ny, nz = hit.nz;
            const nl = Math.hypot(nx, ny, nz) || 1; nx /= nl; ny /= nl; nz /= nl;
            const cosT = -(ux * nx + uy * ny + uz * nz);
            const theta = Math.acos(Math.max(-1, Math.min(1, cosT)));
            const alphaDeg = 90 - theta * 180 / Math.PI;

            if (med.ricochetDeg > 0 && alphaDeg < med.ricochetDeg && vin < med.shatterV
                && vin * med.retain > V_STOP) {
              const d = ux * nx + uy * ny + uz * nz;
              let ox2 = ux - 2 * d * nx, oy2 = uy - 2 * d * ny, oz2 = uz - 2 * d * nz;
              if (this.scatter) {
                const c = 0.12;
                ox2 += (this.rand(i) - 0.5) * c; oy2 += (this.rand(i) - 0.5) * c; oz2 += (this.rand(i) - 0.5) * c;
                const l2 = Math.hypot(ox2, oy2, oz2) || 1; ox2 /= l2; oy2 /= l2; oz2 /= l2;
              }
              const vout = vin * med.retain;
              const nvx = ox2 * vout, nvy = oy2 * vout, nvz = oz2 * vout;
              this.pushEvent(EV_RICOCHET, i, hx, hy, hz, m * (vx - nvx), m * (vy - nvy), m * (vz - nvz),
                ein, 0.5 * m * vout * vout, 0, medId, hit.solid, ux, uy, uz);
              px = hx + nx * 1e-4; py = hy + ny * 1e-4; pz = hz + nz * 1e-4;
              vx = nvx; vy = nvy; vz = nvz;
              this.flags[i] |= F_DESTABILIZED;
              continue;
            }

            const pathLen = hit.path;
            const res = this.traverse(i, medId, pathLen, vin);
            const exx = hx + ux * res.x, exy = hy + uy * res.x, exz = hz + uz * res.x;
            if (res.stopped) {
              this.pushEvent(EV_EMBED, i, exx, exy, exz, m * vx, m * vy, m * vz, ein, 0, res.x, medId, hit.solid, ux, uy, uz);
              this.act[i] = 0; this.liveCount--; alive = false; break;
            } else {
              const vout = res.v, sc = vout / vin;
              let nvx = vx * sc, nvy = vy * sc, nvz = vz * sc;
              const lost = 1 - (0.5 * m * vout * vout) / ein;
              this.yaw[i] += lost * 0.10;
              if (this.scatter && this.yaw[i] > 0) {
                const c = this.yaw[i];
                nvx += (this.rand(i) - 0.5) * c * vout; nvy += (this.rand(i) - 0.5) * c * vout; nvz += (this.rand(i) - 0.5) * c * vout;
                const l3 = Math.hypot(nvx, nvy, nvz) || 1; nvx = nvx / l3 * vout; nvy = nvy / l3 * vout; nvz = nvz / l3 * vout;
              }
              this.pushEvent(EV_PERFORATE, i, exx, exy, exz, m * (vx - nvx), m * (vy - nvy), m * (vz - nvz),
                ein, 0.5 * m * vout * vout, res.x, medId, hit.solid, ux, uy, uz);
              this.flags[i] |= F_DESTABILIZED;
              px = exx + ux * 1e-6; py = exy + uy * 1e-6; pz = exz + uz * 1e-6;
              vx = nvx; vy = nvy; vz = nvz;
              continue;
            }
          }
        }

        px = nx0; py = ny0; pz = nz0;
        vx = nvx; vy = nvy; vz = nvz;
      }

      if (!alive) continue;
      this.px[i] = px; this.py[i] = py; this.pz[i] = pz;
      this.vx[i] = vx; this.vy[i] = vy; this.vz[i] = vz;
      this.tof[i] += dt;
      if (this.tof[i] > this.maxTof || py < this.maxDrop || Math.hypot(px, py, pz) > this.maxRange) {
        this.pushEvent(EV_EXPIRE, i, px, py, pz, 0, 0, 0, 0, 0, 0, -1, -1);
        this.act[i] = 0; this.liveCount--;
      }
    }
    this.tick++;
  }

  advance(frameDt) {
    this.acc += frameDt;
    let guard = 0;
    while (this.acc >= TICK_DT && guard++ < 100000) { this.acc -= TICK_DT; this.stepTick(); }
  }

  runToRest(maxTicks) {
    let n = 0;
    while (this.liveCount > 0 && n++ < (maxTicks || 20000)) this.stepTick();
    return n;
  }
}
```

Then set the exact ending and assert identity:

```sh
truncate -s 14199 src/modules/ballistics/ballistics.js   # end exactly at the final }, however the writing tool ended the file
printf '\n' >> src/modules/ballistics/ballistics.js      # the final line's newline; this file has no closing empty line
wc -c src/modules/ballistics/ballistics.js       # must print 14200
sha256sum src/modules/ballistics/ballistics.js   # must print 4b35fd998e5dea53f4c1e7a168f55b5009358379e70c480805e5aa84950c883a
```

3. Write `scripts/ballistics-test.mjs`, exactly as printed, ending at the final line; the commands after the block set the ending the same way:

```js
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
```

Then set the exact ending and assert identity:

```sh
truncate -s 5187 scripts/ballistics-test.mjs   # end exactly at the final character of the last line
printf '\n' >> scripts/ballistics-test.mjs     # the final line's newline
wc -c scripts/ballistics-test.mjs       # must print 5188
sha256sum scripts/ballistics-test.mjs   # must print b048a877028eca6cb36042949b4fec2cbe257ad6188d5d9a0fa45961d8e22228
```

4. In `scripts/gate.mjs`, in the `GATES` table (currently 11 entries ending with `"solids"`), add one line after the `"solids"` entry:

```js
  "ballistics": ["scripts/ballistics-test.mjs"],
```

Touch nothing else in the file.

5. Run the new gate through the wrapper. The output must be 14 PASS lines, then exactly `ballistics-test: 14 PASS / 0 FAIL`, then `ballistics-test PASS`, exit 0. Any FAIL stops the task before step 6.

```sh
node scripts/gate.mjs ballistics
```

6. Assert the prior gates did not move (same commands and required tails as step 1).

7. Close the records in this landing: bump `package.json` version to `0.0.10`; in `docs/plans/phase-0.0.10-ballistics-module.md` replace the status line with `Status: LANDED, commit stamped below, 2026-08-28. Gate: 14 PASS / 0 FAIL; prior gates unmoved.`; in `README.md` flip the earned checklist box `- [ ] The ballistics solver and the material table: drag, wind, ricochet, perforation, embed, energy receipts` to `- [x]`.

8. Commit and push the landing, then stamp the real hash in a second small commit — NEVER amend after stamping (an amend rewrites the commit and makes every stamped hash stale; phase 0.0.6 proved it):

```sh
git add src/modules/ballistics scripts/ballistics-test.mjs scripts/gate.mjs README.md package.json docs/plans
git commit -m "phase 0.0.10 — the ballistics solver lands, verbatim math

Drag, wind, ricochet, perforation, embed, energy receipts; composes with solids.
ballistics-test: 14 PASS / 0 FAIL; eleven prior gates unmoved.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push origin main
H=$(git rev-parse --short HEAD)
sed -i "s/commit stamped below/commit \`$H\`/" docs/plans/phase-0.0.10-ballistics-module.md
git add docs/plans && git commit -m "phase 0.0.10 record stamped — $H

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push origin main
```

## Acceptance

- Step 2 and step 3 wc -c and sha256 lines match exactly.
- Step 5: `ballistics-test: 14 PASS / 0 FAIL` then `ballistics-test PASS`, exit 0, and an `ok` line in `.superpowers/gates.log`.
- Step 6: every prior gate prints its pinned tail unchanged.
- Step 7's three records flipped, riding the landing commit.
- Push accepted by origin.

## Report

Read-confirmation first, then one line of outcome, then bullets: the gate's count line and verdict line verbatim, both wc -c lines, both sha256 lines, every prior-gate tail, both commit hashes (landing and stamp), the push results. Every nonconformity its own labeled bullet. Fixture seeds: 7, 42, 99; no seed is special.
