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
