// Amended in phase 0.0.105 (the page step): a hull that reaches a surface lands by
// the band and never passes through; the descent burn kills up to the escape
// speed and the band is the excess; a takeoff leaves at the escape speed outward.
// MODULE of the game GRAVITY'S ARK: road, the order's phase 0.0.104, frames
// 4 and 5 headless, every number PROPOSED from the order's scale table, the
// wells law the engine's own, no randomness.
import { accel } from "../../modules/wells/wells.js";
import { stateHash } from "../../modules/determinism/determinism.js";

export const ROAD_DIALS = { ve: 3000, landR: 40, landV: 7.5, crashV: 22.5, edgeSpeed: 40, launchV: 60, launchGap: 200 };
export const STARTER = { dry: 3400, fuel: 2500, thrust: 60000 };
export function escapeSpeed(w) { return Math.sqrt(2 * w.g * w.r); }
export function dvAvailable(ship, ve) { return ve * Math.log((ship.dry + ship.fuel) / ship.dry); }
export function fuelForDv(ship, dv, ve) { return (ship.dry + ship.fuel) * (1 - Math.exp(-dv / ve)); }

export function makeRoad(galaxy, opts) {
  const d = { ...ROAD_DIALS, ...(opts && opts.dials) };
  const star = galaxy.star;
  const w0 = galaxy.worlds[0];
  const ship = { dry: STARTER.dry, fuel: STARTER.fuel, thrust: STARTER.thrust, x: w0.x, y: w0.y + w0.r, vx: 0, vy: 0, landed: 0, alive: true, ...(opts && opts.ship) };
  const state = { t: 0, takeoffs: 0, spent: 0, hole: { born: false, r: star.r, mu: star.mu, edge: star.r, swallowed: [] }, events: [] };

  return {
    galaxy, ship, dials: d, state,

    wells() {
      const list = [{ x: star.x, y: star.y, mu: state.hole.mu, soft: star.soft, r: star.r, name: state.hole.born ? "hole" : "sun" }];
      for (const w of galaxy.worlds) if (w.state === "alive") list.push({ x: w.x, y: w.y, mu: w.mu, soft: w.soft, r: w.r, name: "world" });
      return list;
    },

    burn(ux, uy, dt) {
      if (ship.landed !== null || !ship.alive || ship.fuel <= 0) return 0;
      const a = ship.thrust / (ship.dry + ship.fuel);
      ship.vx += ux * a * dt; ship.vy += uy * a * dt;
      const dm = Math.min(ship.fuel, ship.thrust * dt / d.ve);
      ship.fuel -= dm; state.spent += dm;
      return dm;
    },

    tick(dt) {
      const events = [];
      state.t += dt;
      if (ship.landed === null && ship.alive) {
        const [ax, ay] = accel(this.wells(), ship.x, ship.y);
        ship.vx += ax * dt; ship.vy += ay * dt;
        ship.x += ship.vx * dt; ship.y += ship.vy * dt;
        if (Math.hypot(ship.x - star.x, ship.y - star.y) < star.r) {
          ship.alive = false;
          const ev = { k: "fell", t: state.t };
          state.events.push(ev); events.push(ev);
        } else {
          const n = this.nearest();
          if (n && n.dist <= 0) { const r = this.land(); const ev = state.events[state.events.length - 1]; if (r && ev) events.push(ev); }
        }
      }
      if (state.hole.born) {
        state.hole.edge += d.edgeSpeed * dt;
        const order = galaxy.worlds.filter(w => w.state === "alive")
          .map(w => ({ w, dist: Math.hypot(w.x, w.y) - w.r }))
          .sort((a, b) => a.dist - b.dist);
        for (const { w, dist } of order) {
          if (dist <= state.hole.edge) {
            w.state = "gone";
            state.hole.mu += w.mu;
            state.hole.swallowed.push(w.i);
            const ev = { k: "swallow", i: w.i, t: state.t };
            state.events.push(ev); events.push(ev);
          }
        }
      }
      return events;
    },

    nearest() {
      let best = null;
      for (const w of galaxy.worlds) {
        if (w.state !== "alive") continue;
        const dist = Math.hypot(ship.x - w.x, ship.y - w.y) - w.r;
        if (best === null || dist < best.dist) best = { w, i: w.i, dist };
      }
      return best;
    },

    land() {
      if (ship.landed !== null || !ship.alive) return { ok: false, reason: "state" };
      const n = this.nearest();
      if (!n || n.dist > d.landR) return { ok: false, reason: "far" };
      const v = Math.max(0, Math.hypot(ship.vx, ship.vy) - escapeSpeed(n.w));   // the descent burn kills up to the escape speed; the band is the excess
      if (v > d.crashV) {
        ship.alive = false;
        const ev = { k: "death", t: state.t, v };
        state.events.push(ev);
        return { ok: false, reason: "death", v };
      }
      const need = fuelForDv(ship, escapeSpeed(n.w), d.ve);
      const dm = Math.min(ship.fuel, need);
      ship.fuel -= dm; state.spent += dm;
      ship.landed = n.i; ship.vx = 0; ship.vy = 0; ship.x = n.w.x; ship.y = n.w.y + n.w.r;
      const crash = v > d.landV;
      const ev = { k: crash ? "crash" : "land", i: n.i, t: state.t, v };
      state.events.push(ev);
      return { ok: true, crash, load: v, world: n.i, fuel: dm };
    },

    takeoff() {
      if (ship.landed === null || !ship.alive) return { ok: false, reason: "state" };
      const w = galaxy.worlds[ship.landed];
      const need = fuelForDv(ship, escapeSpeed(w), d.ve);
      if (ship.fuel < need) return { ok: false, reason: "fuel" };
      ship.fuel -= need; state.spent += need; state.takeoffs += 1;
      ship.landed = null; ship.x = w.x; ship.y = w.y + w.r + d.launchGap; ship.vx = d.launchV; ship.vy = escapeSpeed(w);
      const ev = { k: "takeoff", i: w.i, t: state.t };
      state.events.push(ev);
      if (state.takeoffs === galaxy.collapseAt && !state.hole.born) this.collapse();
      return { ok: true, collapse: state.hole.born, fuel: need };
    },

    collapse() {
      state.hole.born = true; state.hole.edge = star.r;
      const ev = { k: "collapse", t: state.t };
      state.events.push(ev);
    },

    schedule() {
      return galaxy.worlds.filter(w => w.state === "alive")
        .map(w => ({ i: w.i, after: (Math.hypot(w.x, w.y) - w.r - star.r) / d.edgeSpeed }))
        .sort((a, b) => a.after - b.after);
    },

    edgeFor(hull) {
      const dv = dvAvailable(hull, d.ve);
      const needs = galaxy.worlds.map((w, idx) => {
        const dist = Math.hypot(w.x, w.y);
        const pull = state.hole.mu * dist / Math.pow(dist * dist + star.soft * star.soft, 1.65);   // amended in 0.0.105: the wells pull carries the distance
        const next = galaxy.worlds[idx + 1];
        const lane = next ? Math.hypot(next.x - w.x, next.y - w.y) : Math.hypot(galaxy.gate.x - w.x, galaxy.gate.y - w.y);
        return escapeSpeed(w) + Math.sqrt(2 * pull * lane);
      });
      let index = needs.findIndex(need => dv >= need);
      if (index === -1) index = galaxy.n;
      return { index, needs };
    },

    hash() {
      return stateHash([
        [ship.x, ship.y, ship.vx, ship.vy, ship.fuel, state.spent],
        [state.t, state.takeoffs, state.hole.edge, state.hole.mu, state.hole.born ? 1 : 0],
        [state.hole.swallowed.length, state.events.length]
      ]);
    }
  };
}

export const SHIP_CONTRACT = "ship: dry (number > 0), fuel (number >= 0), thrust (number > 0), x, y, vx, vy (finite numbers)";
export function checkShip(s) {
  const problems = [];
  if (typeof s !== "object" || s === null) { problems.push("ship: not an object"); return problems; }
  if (!(typeof s.dry === "number" && s.dry > 0)) problems.push("ship.dry: number > 0 required");
  if (!(typeof s.fuel === "number" && s.fuel >= 0)) problems.push("ship.fuel: number >= 0 required");
  if (!(typeof s.thrust === "number" && s.thrust > 0)) problems.push("ship.thrust: number > 0 required");
  for (const f of ["x", "y", "vx", "vy"]) {
    if (!(typeof s[f] === "number" && Number.isFinite(s[f]))) problems.push("ship." + f + ": finite number required");
  }
  return problems;
}
