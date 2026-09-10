// COLDSNAP — startview.js (Task 9, mk2.47): THE OPENING VIEW, captured.
// The menu shows the war's own first frame: the real world boots with no
// sim, the war renderer draws one settled frame at the opening camera
// (tactical, focused on the player depot), the pixels copy to the menu
// canvas, and the world and its GL context are dropped. makeMap bumps a
// fouled seed; the installed map.MAP_SEED is returned — the number shown and
// handed on is always the map drawn.
import { makeField, makeWorld, addBody } from "../engine/core.js";
import { makeRenderer } from "../depot/api.js";
import { makeMap, buildDepotTerrain, makeGrid, planTrees } from "../depot/mapgen.js";
import { buildTown } from "../depot/sim.js";

export function captureStartView(target, seed) {
  const map = makeMap(seed);
  const field = makeField(181, 2.0, map.MAP_SEED);
  field.carveFloor = -12;
  buildDepotTerrain(field, map.MAP_SEED);
  const grid = makeGrid(field);
  const world = makeWorld({ field, seed: map.MAP_SEED });
  world._tdStruct = true;
  buildTown(world, grid, field, map);
  // rocks and trees exactly as the fresh boot lays them — bodies, so the
  // renderer gives them their real silhouettes and shadows
  for (const k of map.ROCKS) {
    const b = addBody(world, { kind: "rock", team: 0, mass: 0, hx: k.r * 0.55, hy: k.h * 0.8, hz: k.r * 0.55, x: k.x, y: field.heightAt(k.x, k.z) - k.h * 0.2, z: k.z, hp: 90 + k.r * 20 });
    b.maxHp = b.hp; b.rockRef = k;
  }
  for (const p of planTrees()) {
    const u = addBody(world, { kind: "tree", team: 0, mass: 260, hx: 0.28, hy: 1.6, hz: 0.28, x: p.x, y: field.heightAt(p.x, p.z) + 1.62, z: p.z, hp: 70, friction: 0.5 });
    u.sleeping = true;
  }
  const dpr = window.devicePixelRatio || 1;
  const w = Math.max(1, Math.round(target.clientWidth * dpr)), h = Math.max(1, Math.round(target.clientHeight * dpr));
  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  cv.dataset.w = String(w); cv.dataset.h = String(h); // renderer.resize() reads these off-DOM
  let R = null;
  try {
    R = makeRenderer(cv, world, {
      town: false, camera: "tactical",
      rim: { halfU: map.RIM_HALF_U, halfV: map.RIM_HALF_V, toCanonical: map.invW, toWorld: map.fwdU },
    });
    // the stream's visible water — the mount's own sampling
    const streamRibs = [];
    if (map.STREAM) {
      let run = [];
      const flush = () => { if (run.length >= 2) streamRibs.push({ pts: run, w: map.STREAM.w + 1 }); run = []; };
      for (let u = -90; u <= 90; u += 2) {
        if (Math.abs(u - map.STREAM.bridgeU) < 3) { flush(); continue; }
        const i2 = Math.max(0, Math.min(map.STREAM.pts.length - 2, Math.floor((u + 90) / 15)));
        const a = map.STREAM.pts[i2], b = map.STREAM.pts[i2 + 1];
        const t = Math.max(0, Math.min(1, (u - a.u) / (b.u - a.u || 1)));
        const wp = map.fwdU(u, a.v + (b.v - a.v) * t);
        run.push({ x: wp.x, y: 0.78, z: wp.z });
      }
      flush();
    }
    R.setDressing({ rocks: map.ROCKS, ponds: map.PONDS, streams: streamRibs });
    R.setRoads(map.ROADS); // the menu's opening view shows the same roads
    // the opening camera: the mount's own focus — the player depot
    const depotT = map.TOWN.find((t) => t.depot && t.team !== 2) || { x: 0, z: 52 };
    const focus = { x: depotT.x, y: field.heightAt(depotT.x, depotT.z), z: depotT.z };
    R.render(1 / 60, focus, { x: 0, z: -500 }, 0);
    R.render(1 / 60, focus, { x: 0, z: -500 }, 0); // second frame — tweens settled, shadows warm
    target.width = w; target.height = h;
    target.getContext("2d").drawImage(cv, 0, 0); // synchronous with the GL render — the buffer is live
  } finally {
    if (R) R.dispose();
  }
  return map.MAP_SEED;
}
