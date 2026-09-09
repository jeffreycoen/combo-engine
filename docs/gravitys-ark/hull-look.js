// GRAVITY'S ARK — hull-look.js: the ship's look on the ground, phase 0.1.2. Deadweight's
// module drawing carried as solid shapes in coldsnap's lit scene: the prism per kind with
// its own footprint and height, the glyph and the letter on the top face, the station's
// colours, a strut as a beam, a coupler as a joint on every weld that holds, the engine's
// nozzle, the mech bay dark on its door side, the balance mark, and a loose module ringed in
// amber. SHAPED from deadweight-hangar.html lines 898 to 1031: the demo's shapes, colours,
// glyphs, and letters at the ground's scale. Nothing here moves a body; the bodies move this.
import * as THREE from "three";
import { toon } from "../../src/graphics/renderer.js";
import { HULL_DIALS } from "../../src/games/gravitys-ark/ground.js";

// the demo's station colours, top face then sides (its dark palette, the one that reads under a
// sun), and its letters; the bay's letter is the ark's own
export const ORIGIN = { clo: ["#5b82c8", "#33507e"], hol: ["#9a7a52", "#5e4a30"], sal: ["#c2704a", "#7a4228"], gen: ["#8b93a0", "#4d5560"] };
export const OLETTER = { bridge: "B", engine: "E", pod: "P", tank: "T", mount: "M", rack: "R", grapple: "G", rcs: "Q", shield: "D", strut: "", mechbay: "W" };
const AW = "rgba(255,255,255,.92)", AW2 = "rgba(255,255,255,.55)", AK = "rgba(0,0,0,.55)", TAU = Math.PI * 2;
const AMBER = 0xe9b25c, INK = 0x141820, COUPLER = ["#2c343f", "#181e26"], NOZZLE = "#10161f", DOOR = "#12161c";
const GLYPH_PX = 256, GLYPH_S = 100;   // the glyph canvas and the demo's accent size on it

// glyph(c2, t, cx, cy, s): the demo's type accent, white ink, drawn flat: its strokes without its
// screen squash; the bay's is the ark's own, a box open on one side
function glyph(c2, t, cx, cy, s) {
  c2.save(); c2.translate(cx, cy); c2.scale(s / 22, s / 22); c2.lineCap = "round";
  if (t === "bridge") { c2.strokeStyle = AW2; c2.lineWidth = 2;
    c2.beginPath(); c2.moveTo(0, -11); c2.lineTo(11, 0); c2.lineTo(0, 11); c2.lineTo(-11, 0); c2.closePath(); c2.stroke();
    c2.fillStyle = AW; c2.beginPath(); c2.ellipse(0, -2, 7, 4.4, 0, 0, TAU); c2.fill(); }
  else if (t === "engine") { c2.strokeStyle = AW2; c2.lineWidth = 1.6;
    c2.beginPath(); c2.moveTo(-8, -9); c2.lineTo(7, -9); c2.lineTo(13, 0); c2.lineTo(7, 9); c2.lineTo(-8, 9); c2.closePath(); c2.stroke();
    c2.fillStyle = AW; c2.beginPath(); c2.moveTo(8, -7); c2.lineTo(17, 0); c2.lineTo(8, 7); c2.closePath(); c2.fill(); }
  else if (t === "pod") { c2.strokeStyle = AW; c2.lineWidth = 2.4; c2.strokeRect(-10, -10, 20, 20);
    c2.strokeStyle = AW2; c2.lineWidth = 1.6;
    c2.beginPath(); c2.moveTo(0, -10); c2.lineTo(0, 10); c2.moveTo(-10, 0); c2.lineTo(10, 0); c2.stroke(); }
  else if (t === "tank") { c2.fillStyle = AW;
    c2.beginPath(); c2.roundRect(-12, -6.5, 24, 13, 6.5); c2.fill();
    c2.strokeStyle = "rgba(0,0,0,.25)"; c2.lineWidth = 1; c2.stroke(); }
  else if (t === "mount") { c2.fillStyle = AW;
    c2.beginPath(); c2.moveTo(-9, 10); c2.lineTo(0, -11); c2.lineTo(9, 10); c2.closePath(); c2.fill(); }
  else if (t === "rack") { for (const ox of [-6.5, 6.5]) {
    c2.fillStyle = AW; c2.beginPath(); c2.arc(ox, 0, 6, 0, TAU); c2.fill();
    c2.fillStyle = AK; c2.beginPath(); c2.arc(ox, 0, 2.7, 0, TAU); c2.fill(); } }
  else if (t === "grapple") { c2.strokeStyle = AW; c2.lineWidth = 3.2;
    c2.beginPath(); c2.moveTo(0, -13); c2.lineTo(0, -1); c2.arc(0, 5, 6.5, -Math.PI / 2, Math.PI * 0.78, false); c2.stroke(); }
  else if (t === "rcs") { c2.strokeStyle = AW; c2.lineWidth = 2.8;
    c2.beginPath();
    c2.moveTo(0, -13); c2.lineTo(0, -6); c2.moveTo(0, 6); c2.lineTo(0, 13);
    c2.moveTo(-13, 0); c2.lineTo(-6, 0); c2.moveTo(6, 0); c2.lineTo(13, 0); c2.stroke(); }
  else if (t === "shield") { c2.strokeStyle = AW; c2.lineWidth = 2.4;
    c2.beginPath(); c2.arc(-3, 0, 11, Math.PI * 0.6, Math.PI * 1.4, false); c2.stroke();
    c2.beginPath(); c2.arc(3, 0, 11, -Math.PI * 0.4, Math.PI * 0.4, false); c2.stroke(); }
  else if (t === "mechbay") { c2.strokeStyle = AW; c2.lineWidth = 2.4;
    c2.beginPath(); c2.moveTo(10, -10); c2.lineTo(-10, -10); c2.lineTo(-10, 10); c2.lineTo(10, 10); c2.stroke(); }
  c2.restore();
}

// glyphTexture(t): one canvas per kind, the accent at the centre and the letter at its corner as the demo places them
const textures = new Map();
function glyphTexture(t) {
  if (textures.has(t)) return textures.get(t);
  const cv = document.createElement("canvas"); cv.width = GLYPH_PX; cv.height = GLYPH_PX;
  const c2 = cv.getContext("2d"), cx = GLYPH_PX / 2, cy = GLYPH_PX / 2, s = GLYPH_S;
  glyph(c2, t, cx, cy, s);
  if (OLETTER[t]) { c2.fillStyle = "rgba(255,255,255,.85)"; c2.font = "700 " + Math.max(6, s * 0.3) + "px -apple-system,sans-serif"; c2.fillText(OLETTER[t], cx + s * 0.34, cy + s * 0.42); }
  const tex = new THREE.CanvasTexture(cv);
  textures.set(t, tex);
  return tex;
}

// worldSide(axis, dgx, dgy): a step on the ship's own grid as a unit vector in the world
const worldSide = (axis, dgx, dgy) => ({ x: axis.u.x * dgx + axis.r.x * dgy, z: axis.u.z * dgx + axis.r.z * dgy });
// faceIndex(side): which face of a box a world side names, in the box's material order: +x, -x, +y, -y, +z, -z
const faceIndex = (side) => (side.x > 0 ? 0 : side.x < 0 ? 1 : side.z > 0 ? 4 : 5);

// makeHullLook(scene, H, opts): the hull's shapes in the scene. H is the ground's hull as
// crashHull makes it; opts.balance, if given, is the ship's balance point on its own grid, in
// cells, for the mark. Returns update(loose) and dispose().
export function makeHullLook(scene, H, opts) {
  const root = new THREE.Group(); scene.add(root);
  const groups = [], edges = [], couplers = [];
  const list = H.list, axis = H.axis;
  const neighbourOf = (m) => { for (const [dgx, dgy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (list.some((o) => o.gx === m.gx + dgx && o.gy === m.gy + dgy)) return [dgx, dgy]; return null; };
  const doorOf = (m) => { for (const [dgx, dgy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) if (!list.some((o) => o.gx === m.gx + dgx && o.gy === m.gy + dgy)) return [dgx, dgy]; return [0, 1]; };
  list.forEach((m, i) => {
    const b = H.bodies[i], oc = ORIGIN[m.org || "gen"], g = new THREE.Group();
    const geo = new THREE.BoxGeometry(b.hx * 2, b.hy * 2, b.hz * 2);
    const side = toon(oc[1]), top = toon(oc[0]), mats = [side, side, top, side, side, side];
    if (m.t === "mechbay") { const [dgx, dgy] = doorOf(m); mats[faceIndex(worldSide(axis, dgx, dgy))] = toon(DOOR); }   // the bay is dark on its open side
    const prism = new THREE.Mesh(geo, mats); prism.castShadow = true; prism.receiveShadow = true; g.add(prism);
    const line = new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: INK })); g.add(line); edges.push(line);
    if (m.t !== "strut") {   // the type accent and the letter on the top face, the demo's own, sized to the face
      const w = Math.min(b.hx, b.hz) * 1.5, plane = new THREE.Mesh(new THREE.PlaneGeometry(w, w), new THREE.MeshBasicMaterial({ map: glyphTexture(m.t), transparent: true, depthWrite: false }));
      plane.rotation.x = -Math.PI / 2; plane.position.y = b.hy + 0.03; g.add(plane);
    }
    if (m.t === "engine") {   // the nozzle on the face away from its neighbour, the plume's anchor
      const n = neighbourOf(m) || [1, 0], back = worldSide(axis, -n[0], -n[1]);
      const noz = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.15, 1.0, 18), toon(NOZZLE)); noz.castShadow = true;
      const hh = back.x !== 0 ? b.hx : b.hz;
      noz.position.set(back.x * (hh + 0.5), -b.hy * 0.2, back.z * (hh + 0.5));
      noz.rotation.z = back.x !== 0 ? Math.PI / 2 : 0; noz.rotation.x = back.z !== 0 ? Math.PI / 2 : 0;
      g.add(noz);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.08, 8, 24), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 }));
      ring.position.copy(noz.position).add(new THREE.Vector3(back.x * 0.55, 0, back.z * 0.55));
      ring.rotation.y = back.x !== 0 ? Math.PI / 2 : 0;
      g.add(ring);
    }
    root.add(g); groups.push(g);
  });
  // the balance mark: the demo's quartered disc, flat on the ground at the ship's balance point on its own grid
  if (opts && opts.balance) {
    const bal = opts.balance, u = axis.u, r = axis.r, p = H.dials.pitch;
    const x = H.site.x + u.x * bal.gx * p + r.x * bal.gy * p, z = H.site.z + u.z * bal.gx * p + r.z * bal.gy * p;
    const mark = new THREE.Group();
    [[0, "#1d222b"], [1, "#ffffff"], [2, "#1d222b"], [3, "#ffffff"]].forEach(([q, col]) => {
      const wedge = new THREE.Mesh(new THREE.CircleGeometry(1.2, 12, q * Math.PI / 2, Math.PI / 2), new THREE.MeshBasicMaterial({ color: col })); mark.add(wedge);
    });
    mark.rotation.x = -Math.PI / 2; mark.position.set(x, (opts.groundY || 0) + 0.12, z);
    root.add(mark);
  }
  // coupler(k): the joint on weld k, the demo's prism with its amber ring, laid along the two modules' line
  function coupler() {
    const u = HULL_DIALS.unit, g = new THREE.Group();
    const box = new THREE.Mesh(new THREE.BoxGeometry(2.3 * u, 0.95 * u, 1.0 * u), [toon(COUPLER[1]), toon(COUPLER[1]), toon(COUPLER[0]), toon(COUPLER[1]), toon(COUPLER[1]), toon(COUPLER[1])]);
    box.castShadow = true; g.add(box);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.5 * u, 0.06 * u, 8, 24), new THREE.MeshBasicMaterial({ color: AMBER }));
    ring.rotation.x = Math.PI / 2; ring.position.y = 0.95 * u / 2 + 0.05; g.add(ring);
    root.add(g);
    return g;
  }
  function update(loose) {
    const looseSet = new Set(loose || []);
    groups.forEach((g, i) => {
      const b = H.bodies[i];
      g.visible = !!b.alive;
      g.position.set(b.pos.x, b.pos.y, b.pos.z);
      if (b.q) g.quaternion.set(b.q.x, b.q.y, b.q.z, b.q.w);
      edges[i].material.color.setHex(looseSet.has(i) ? AMBER : INK);
    });
    for (let k = 0; k < H.welds.length; k++) {
      if (!couplers[k]) couplers[k] = coupler();
      const w = H.welds[k], a = H.bodies[w.a], c = H.bodies[w.b], g = couplers[k];
      g.visible = !w.weld.broken && a.alive && c.alive;
      if (!g.visible) continue;
      g.position.set((a.pos.x + c.pos.x) / 2, (a.pos.y + c.pos.y) / 2, (a.pos.z + c.pos.z) / 2);
      g.rotation.y = -Math.atan2(c.pos.z - a.pos.z, c.pos.x - a.pos.x);
    }
  }
  function dispose() {
    root.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((mt) => mt.dispose()); });
    scene.remove(root);
  }
  update([]);
  return { update, dispose, root };
}
