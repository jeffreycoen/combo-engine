# Task 0.1.2-4 — the ship's look on the ground

One job: the ship on the ground looks like deadweight's ship. Every module takes deadweight's own shape at the ground's scale, as a body and as a drawing: the bridge tall and square, the engine long and low with its nozzle, the pod a box, the tank low, a strut a beam along its connections, the mech bay a hangar dark on its door side. The drawing is the ark's own file over coldsnap's lit scene: the prism in the station's colours, the demo's glyph and letter on the top face, the edges inked and amber when the module is loose, a coupler with its amber ring on every weld that holds, the balance mark on the ground. Coldsnap's drawing opens one door, its scene, a listed difference from the checkout. The camera opens on the bridge, wide enough for the hull. One check joins the ark's gate. Every edit is an anchored replacement checked by hash; write exactly what is written, run the listed gates, report. You design nothing.

Suggested model: Sonnet 5.

Required reading, in order (confirm at the top of your report):
1. This file, whole.
2. `docs/plans/phase-0.1.2-the-findings.md`, whole.

Source of the shapes, reference only, never opened by this task: `deadweight-hangar.html` lines 898 to 1031. Nothing under `/home/batman/coldsnap` is read, written, or run.

## Steps

Run from `/home/batman/combo-engine`. A failed assert, a wrong required value, or a FAILED hash line stops the task: report the step and its verbatim output, run nothing further. Never edit a file to make a hash match.

1. Assert the ground: the tracked files clean at task 3's landing, the six files this task edits at their landed hashes, the new file absent. The gates were recorded green at that landing and are not run again here.

```sh
git status --short | grep -v "^??" | wc -l
while read -r hash path; do test "$(sha256sum "$path" | cut -c1-16)" = "$hash" && echo "OK $path" || echo "FAILED $path"; done <<'GROUND'
bcacd20ef8535d1e src/games/gravitys-ark/ground.js
0174cfe631736591 src/graphics/renderer.js
5e62630dca0c0c3d docs/gravitys-ark/ground.js
8214832731967b2a scripts/gravitys-ark-test.mjs
7029df61230d773a README.md
9b94865e110f5bdb docs/parts/parts-source.json
GROUND
ls docs/gravitys-ark/hull-look.js 2>/dev/null || echo absent
```

Required: `0`, six OK lines, `absent`.

2. The ark's ground layer: deadweight's shape table and the shape of a module in the world; every body takes its kind's own footprint and height; the weld-back, the walker's door, and the crew's stand read the body's own size. Syntax check; the hash line must print OK.

```sh
python3 - <<'ARK_EOF_2'
def edit(p, reps):
    s = open(p, encoding="utf-8").read()
    for old, new in reps:
        assert s.count(old) == 1, (p, old[:70])
        s = s.replace(old, new)
    open(p, "w", encoding="utf-8").write(s)
edit("src/games/gravitys-ark/ground.js", [
("// HULL_DIALS, the seam's numbers and the crash law, all PROPOSED. kgPerKg: a space\n// kilogram lands as this many ground kilograms. box and pitch: a module's half size\n// and the grid step, in metres: 250 times the mass is 6.3 times the length, so the\n// 1.6 m box of the seam's table lands as 10 m on a 10.7 m pitch. lift: how far above\n",
 "// HULL_DIALS, the seam's numbers and the crash law, all PROPOSED. kgPerKg: a space\n// kilogram lands as this many ground kilograms. pitch: the grid step in metres: 250\n// times the mass is 6.3 times the length, so the seam's 1.7 m pitch lands as 10.7 m.\n// unit: one of deadweight's drawing units on the ground, the pitch over the demo's cell\n// of four, so every kind's footprint and height is the demo's own. lift: how far above\n"),
("export const HULL_DIALS = { kgPerKg: 250, box: 5, pitch: 10.7, lift: 0.02, crashStop: 0.3, slideFrac: 0.6, moduleHp: 400, site: 26 };\n",
 "export const HULL_DIALS = { kgPerKg: 250, unit: 2.675, pitch: 10.7, lift: 0.02, crashStop: 0.3, slideFrac: 0.6, moduleHp: 400, site: 26 };\n\n// SHAPE: deadweight's silhouette per kind, half width along the ship's own gx, half depth\n// along gy, and full height, in the demo's units, its lines 989 to 991; a strut is a beam\n// along its connections, its lines 973 to 977; the mech bay is the ark's own, a cell wide and\n// tall enough for the walker. PROPOSED at the ground's scale through HULL_DIALS.unit.\nexport const SHAPE = { bridge: [1.45, 1.45, 2.0], engine: [1.9, 1.6, 1.15], pod: [1.7, 1.7, 1.8], tank: [1.6, 1.35, 0.9], shield: [1.4, 1.4, 1.35], mount: [1.55, 1.3, 1.0], rcs: [1.15, 1.15, 1.05], rack: [1.7, 1.7, 1.5], grapple: [1.7, 1.7, 1.5], strut: [2.0, 0.6, 0.7], mechbay: [2.0, 2.0, 2.6] };\n\n// shapeOf(m, list, axis, unit): a module's half sizes in the world: the demo's shape at the\n// ground's scale, its gx side laid along the site line and its gy side across it; a strut\n// turns to lie along its connections, and along the line when it has none.\nexport function shapeOf(m, list, axis, unit) {\n  let [w, d, h] = SHAPE[m.t] || [1.7, 1.7, 1.5];\n  if (m.t === \"strut\") {\n    let along = list.some((o) => Math.abs(o.gx - m.gx) === 1 && o.gy === m.gy);\n    if (!along && !list.some((o) => o.gx === m.gx && Math.abs(o.gy - m.gy) === 1)) along = true;\n    if (!along) [w, d] = [d, w];\n  }\n  const a = w * unit, c = d * unit, hy = h * unit / 2;\n  return axis.u.x !== 0 ? { hx: a, hz: c, hy } : { hx: c, hz: a, hy };\n}\n"),
("    const x = slots[i].x + (loose ? u.x * slide : 0), z = slots[i].z + (loose ? u.z * slide : 0);\n    const b = addBody(world, { kind: \"chunk\", team: 1, mass: MODULES[m.t].kg * d.kgPerKg, hx: d.box, hy: d.box, hz: d.box, x, y: war.field.heightAt(x, z) + d.box + d.lift, z, hp: d.moduleHp, friction: 0.65, restitution: 0.02 });\n",
 "    const x = slots[i].x + (loose ? u.x * slide : 0), z = slots[i].z + (loose ? u.z * slide : 0), sh = shapeOf(m, list, { u, r }, d.unit);\n    const b = addBody(world, { kind: \"chunk\", team: 1, mass: MODULES[m.t].kg * d.kgPerKg, hx: sh.hx, hy: sh.hy, hz: sh.hz, x, y: war.field.heightAt(x, z) + sh.hy + d.lift, z, hp: d.moduleHp, friction: 0.65, restitution: 0.02 });\n"),
("  b.pos.x = s.x; b.pos.z = s.z; b.pos.y = G.war.field.heightAt(s.x, s.z) + d.box + d.lift;\n", "  b.pos.x = s.x; b.pos.z = s.z; b.pos.y = G.war.field.heightAt(s.x, s.z) + b.hy + d.lift;\n"),
("  const H = G.hull, bay = H.bodies[H.bay], s = bayDoor(G), k = H.dials.box + WALKER.door;\n", "  const H = G.hull, bay = H.bodies[H.bay], s = bayDoor(G), k = (s.x !== 0 ? bay.hx : bay.hz) + WALKER.door;\n"),
("  const at = H ? H.slots[0] : { x: run.focus.x, z: run.focus.z }, r = H ? H.axis.r : { x: 0, z: 1 }, off = (H ? H.dials.box : 0) + d.standOff;   // across the site line, on the bridge's free side, off its face\n",
 "  const at = H ? H.slots[0] : { x: run.focus.x, z: run.focus.z }, r = H ? H.axis.r : { x: 0, z: 1 }, off = (H ? (r.x !== 0 ? H.bodies[0].hx : H.bodies[0].hz) : 0) + d.standOff;   // across the site line, on the bridge's free side, off its face\n"),
])
ARK_EOF_2
node --check src/games/gravitys-ark/ground.js && echo "syntax ok ground.js"
test "$(sha256sum src/games/gravitys-ark/ground.js | cut -c1-16)" = "57b19d0a24f7eb54" && echo OK src/games/gravitys-ark/ground.js || echo FAILED src/games/gravitys-ark/ground.js
```

3. Coldsnap's drawing opens one door: the scene rides on what the renderer returns. One token, the listed difference. Syntax check; the hash line must print OK.

```sh
python3 - <<'ARK_EOF_3'
p = "src/graphics/renderer.js"; s = open(p, encoding="utf-8").read()
old = "  return { render, consume, setGfx, setZoom, setWorld, setTraj, setGrade, gfx, overlay, setDressing, "
assert s.count(old) == 1, "renderer return"
s = s.replace(old, "  return { scene, render, consume, setGfx, setZoom, setWorld, setTraj, setGrade, gfx, overlay, setDressing, ")
open(p, "w", encoding="utf-8").write(s)
ARK_EOF_3
node --check src/graphics/renderer.js && echo "syntax ok renderer.js"
test "$(sha256sum src/graphics/renderer.js | cut -c1-16)" = "0db618e8c5b886c9" && echo OK src/graphics/renderer.js || echo FAILED src/graphics/renderer.js
```

4. The ship's look, a new file of the page, written exactly. Syntax check; the hash line must print OK.

```sh
cat > docs/gravitys-ark/hull-look.js <<'ARK_LOOK_EOF'
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
ARK_LOOK_EOF
node --check docs/gravitys-ark/hull-look.js && echo "syntax ok hull-look.js"
test "$(sha256sum docs/gravitys-ark/hull-look.js | cut -c1-16)" = "c1f0c530ff4d9f9a" && echo OK docs/gravitys-ark/hull-look.js || echo FAILED docs/gravitys-ark/hull-look.js
```

5. The ground's screen: the look built on the scene at entry with the ship's balance point, fed the loose modules every frame, disposed at leave; the camera opens on the bridge at a wide zoom. Syntax check; the hash line must print OK.

```sh
python3 - <<'ARK_EOF_5'
def edit(p, reps):
    s = open(p, encoding="utf-8").read()
    for old, new in reps:
        assert s.count(old) == 1, (p, old[:70])
        s = s.replace(old, new)
    open(p, "w", encoding="utf-8").write(s)
edit("docs/gravitys-ark/ground.js", [
("// the field, and her walker lies wrecked until she raises it. The main file\n// takes only the hookup lines.\n", "// the field, and her walker lies wrecked until she raises it. The ship's look is\n// hull-look.js's; the main file takes only the hookup lines.\n"),
("import { makeGround, crashHull, fieldCrew, wreckWalker, setStick, order, tick, summary, price, GUNS } from \"../../src/games/gravitys-ark/ground.js\";\nimport { makeGestures } from \"../../src/modules/pagekit/pagekit.js\";\n",
 "import { makeGround, crashHull, fieldCrew, wreckWalker, setStick, order, tick, summary, price, GUNS, looseModules } from \"../../src/games/gravitys-ark/ground.js\";\nimport { derive } from \"../../src/games/gravitys-ark/stations.js\";\nimport { makeGestures } from \"../../src/modules/pagekit/pagekit.js\";\nimport { makeHullLook } from \"./hull-look.js\";\n"),
("  let G = null, R = null, A = null, focus = null,", "  let G = null, R = null, A = null, look = null, focus = null,"),
("    R = makeRenderer(gv, G.world, { camera: \"tactical\", town: false, fadeDecals: true });\n    A = makeGameAudio(); A.setMuted(muted);\n    const f = G.run.focus; focus = { x: f.x, y: f.y, z: f.z }; aim = { x: f.x, z: f.z }; zoom = 1;\n",
 "    R = makeRenderer(gv, G.world, { camera: \"tactical\", town: false, fadeDecals: true });\n    const dv = derive(hull), cell = 1.7;   // the ship's balance point on its own grid, the builder's cell as makeHull sets it\n    look = makeHullLook(R.scene, G.hull, { balance: { gx: dv.cx / cell, gy: dv.cy / cell }, groundY: G.war.field.heightAt(G.site.x, G.site.z) });\n    A = makeGameAudio(); A.setMuted(muted);\n    const f = G.site; focus = { x: f.x, y: G.war.field.heightAt(f.x, f.z), z: f.z }; aim = { x: f.x, z: f.z }; zoom = 0.6; R.setZoom(zoom);   // the camera opens on the bridge, wide enough for the hull, PROPOSED\n"),
("  function leave() { if (R) { R.dispose(); R = null; }", "  function leave() { if (look) { look.dispose(); look = null; } if (R) { R.dispose(); R = null; }"),
("focus = { x: h.pos.x, y: h.pos.y, z: h.pos.z }; } R.render(dt, focus, aim); }\n", "focus = { x: h.pos.x, y: h.pos.y, z: h.pos.z }; } if (look) look.update(looseModules(G)); R.render(dt, focus, aim); }\n"),
])
ARK_EOF_5
node --check docs/gravitys-ark/ground.js && echo "syntax ok screen"
test "$(sha256sum docs/gravitys-ark/ground.js | cut -c1-16)" = "695d3c51b2ce799c" && echo OK docs/gravitys-ark/ground.js || echo FAILED docs/gravitys-ark/ground.js
```

6. The ark's gate: the scale check reads each kind's own shape, the walker's door reads the bay's own half, the WALL check's line reads the bridge's own half; one check joins at the end. Syntax check; the hash line must print OK.

```sh
python3 - <<'ARK_EOF_6'
def edit(p, reps):
    s = open(p, encoding="utf-8").read()
    for old, new in reps:
        assert s.count(old) == 1, (p, old[:70])
        s = s.replace(old, new)
    open(p, "w", encoding="utf-8").write(s)
p = "scripts/gravitys-ark-test.mjs"
edit(p, [
("setStick, WALKER, standOff } from \"../src/games/gravitys-ark/ground.js\";\n", "setStick, WALKER, standOff, SHAPE, shapeOf } from \"../src/games/gravitys-ark/ground.js\";\n"),
("  const s0 = A.hull.slots[0], ax = A.hull.axis, wz = A.hull.dials.box + 14;   // a line across the site line, well off the bridge's free side, clear of every module\n",
 "  const s0 = A.hull.slots[0], ax = A.hull.axis, wz = (ax.r.x !== 0 ? A.hull.bodies[0].hx : A.hull.bodies[0].hz) + 14;   // a line across the site line, well off the bridge's free side, clear of every module\n"),
("  const scale = A.H.bodies.every((b) => b.hx === d.box && b.hy === d.box && b.hz === d.box && b.mass === MODULES[b.module].kg * d.kgPerKg);\n",
 "  const scale = A.H.bodies.every((b, i) => { const sh = shapeOf(A.H.list[i], A.H.list, A.H.axis, d.unit); return b.hx === sh.hx && b.hy === sh.hy && b.hz === sh.hz && b.mass === MODULES[b.module].kg * d.kgPerKg; });\n"),
("  const atDoor = !!W && W.bay === bay && Math.abs(Math.max(Math.abs(W.spot.x - bayB.pos.x), Math.abs(W.spot.z - bayB.pos.z)) - (d.box + WALKER.door)) < 1e-9 && Math.min(Math.abs(W.spot.x - bayB.pos.x), Math.abs(W.spot.z - bayB.pos.z)) < 1e-9;\n",
 "  const doorHalf = !!W && (Math.abs(W.spot.x - bayB.pos.x) > 1e-9 ? bayB.hx : bayB.hz);\n  const atDoor = !!W && W.bay === bay && Math.abs(Math.max(Math.abs(W.spot.x - bayB.pos.x), Math.abs(W.spot.z - bayB.pos.z)) - (doorHalf + WALKER.door)) < 1e-9 && Math.min(Math.abs(W.spot.x - bayB.pos.x), Math.abs(W.spot.z - bayB.pos.z)) < 1e-9;\n"),
])
s = open(p, encoding="utf-8").read()
anchor = "console.log(`gravitys-ark-test: ${pass} PASS / ${fail} FAIL`);\n"
assert s.count(anchor) == 1, "tail anchor"
block = '''{ // 52. ark: the ship's shapes on the ground are deadweight's at the ground's scale: each kind its own footprint and height, the bay taller than the walker, a strut a beam turned along its connections
  const ax = { u: { x: 0, z: -1 }, r: { x: 1, z: 0 } }, unit = HULL_DIALS.unit;
  const list = [{ t: "bridge", gx: 0, gy: 0 }, { t: "strut", gx: 1, gy: 0 }, { t: "strut", gx: 0, gy: 1 }, { t: "mechbay", gx: -1, gy: 0 }];
  const b = shapeOf(list[0], list, ax, unit), sAlong = shapeOf(list[1], list, ax, unit), sAcross = shapeOf(list[2], list, ax, unit), bay = shapeOf(list[3], list, ax, unit);
  const distinct = new Set(Object.keys(SHAPE).map((t) => SHAPE[t].join(","))).size;
  const near = (a, c) => Math.abs(a - c) < 1e-9;
  check("ark: the ship's shapes on the ground are deadweight's at the ground's scale: each kind its own footprint and height, the bay taller than the walker, a strut a beam turned along its connections",
    near(unit, HULL_DIALS.pitch / 4) && near(b.hz, 1.45 * unit) && near(b.hx, 1.45 * unit) && near(b.hy, unit) && near(sAlong.hz, 2.0 * unit) && near(sAlong.hx, 0.6 * unit)
    && near(sAcross.hx, 2.0 * unit) && near(sAcross.hz, 0.6 * unit) && bay.hy * 2 > 5.4 && near(bay.hx, 2.0 * unit) && distinct >= 8 && Object.keys(MODULES).every((t) => !!SHAPE[t]));
}

'''
s = s.replace(anchor, block + anchor)
open(p, "w", encoding="utf-8").write(s)
ARK_EOF_6
node --check scripts/gravitys-ark-test.mjs && echo "syntax ok gate"
test "$(sha256sum scripts/gravitys-ark-test.mjs | cut -c1-16)" = "543338674b7c5a73" && echo OK scripts/gravitys-ark-test.mjs || echo FAILED scripts/gravitys-ark-test.mjs
```

7. The records that ride the landing: the README's ground line says the look as built and its engine line counts the fifth listed difference; the parts source's ground screen row carries the new file. Both hash lines must print OK.

```sh
python3 - <<'ARK_EOF_7'
import json
def edit(p, reps):
    s = open(p, encoding="utf-8").read()
    for old, new in reps:
        assert s.count(old) == 1, (p, old[:70])
        s = s.replace(old, new)
    open(p, "w", encoding="utf-8").write(s)
edit("README.md", [
("landed on the line from the depot toward the map's centre with the bridge 26 m out and the hull beyond it; the footprints block coldsnap's grid, so guns, walls, and paths go around them. She is a trooper",
 "landed on the line from the depot toward the map's centre with the bridge 26 m out and the hull beyond it; the footprints block coldsnap's grid, so guns, walls, and paths go around them. Each kind wears deadweight's own shape at that scale, the bridge tall, the engine long with its nozzle, the tank low, a strut a beam, the mech bay a hangar dark on its door side, with the demo's glyph and letter on the top face, its station colours, a coupler on every weld that holds, the balance mark on the ground, and a loose module ringed in amber; the drawing is the ark's own file over coldsnap's scene. She is a trooper"),
("26 matching the checkout by hash, 17 front doors whose code sits in modules at the same commit, four carrying listed differences from the 0.1.0 plan,",
 "25 matching the checkout by hash, 17 front doors whose code sits in modules at the same commit, four carrying listed differences from the 0.1.0 plan and one from the 0.1.2 plan, the drawing's scene opened as a door,"),
])
edit("docs/parts/parts-source.json", [
('   "name": "the ground screen",\n   "files": [\n    "docs/gravitys-ark/ground.js"\n   ],\n   "phase": "0.1.1",\n   "does": "The coldsnap renderer with the hold\'s rail, in its own file.",\n',
 '   "name": "the ground screen",\n   "files": [\n    "docs/gravitys-ark/ground.js",\n    "docs/gravitys-ark/hull-look.js"\n   ],\n   "phase": "0.1.2",\n   "does": "The coldsnap renderer with the hold\'s rail, in its own file; the ship\'s look in hull-look.js, deadweight\'s shapes, glyphs, and colours as solid shapes in coldsnap\'s scene.",\n'),
])
json.loads(open("docs/parts/parts-source.json", encoding="utf-8").read())
ARK_EOF_7
test "$(sha256sum README.md | cut -c1-16)" = "3d4be15a542e051d" && echo OK README.md || echo FAILED README.md
test "$(sha256sum docs/parts/parts-source.json | cut -c1-16)" = "29101869bb488688" && echo OK docs/parts/parts-source.json || echo FAILED docs/parts/parts-source.json
```

8. Run the ark's gate. It must print 48 PASS lines, one more than the recorded 47, then `gravitys-ark-test: 48 PASS / 0 FAIL`, then `gravitys-ark-test PASS`. Any FAIL stops the task here.

```sh
node scripts/gate.mjs gravitys-ark > /tmp/ark-gate.txt; tail -3 /tmp/ark-gate.txt; grep -m1 '^seeds' /tmp/ark-gate.txt
```

9. The record: the phase document's task row and status line. Then the parts build over every gate, about four minutes; it must name 50 gates and every verdict must be ok, the ark's gate among them at 48 PASS and 0 FAIL.

```sh
python3 - <<'ARK_EOF_9'
ph = "docs/plans/phase-0.1.2-the-findings.md"; s = open(ph, encoding="utf-8").read()
old = "as solid shapes in coldsnap's scene, through one listed door. DISPATCHED. →"
assert s.count(old) == 1, "task row"
s = s.replace(old, "as solid shapes in coldsnap's scene, through one listed door. LANDED, commit stamped below. →")
old2 = "Status: DISPATCHED. Task 4 dispatched."
assert s.count(old2) == 1, "status line"
s = s.replace(old2, "Status: DISPATCHED. Task 4 landed, commit stamped below, 2026-09-09; task 5 is planned next.")
open(ph, "w", encoding="utf-8").write(s)
ARK_EOF_9
grep -c "commit stamped below" docs/plans/phase-0.1.2-the-findings.md
node scripts/parts.mjs --gates all
node -e 'const t=require("./docs/parts/parts.json");const bad=Object.values(t.gates).filter(g=>g.verdict!=="ok").map(g=>g.name);const a=t.gates["gravitys-ark"];console.log(Object.keys(t.gates).length+" gates, "+bad.length+" not ok"+(bad.length?": "+bad.join(", "):""));console.log("gravitys-ark "+a.pass+" PASS / "+a.fail+" FAIL; "+a.seeds);process.exit(bad.length||a.pass!==48?1:0)'
```

Required: `2`, a count line naming 50 gates, `50 gates, 0 not ok`, `gravitys-ark 48 PASS / 0 FAIL;` with its seeds.

10. Commit and push the landing, then stamp the real hash into the status line and the task row in a second small commit. Never amend after stamping.

```sh
git add src/games/gravitys-ark/ground.js src/graphics/renderer.js docs/gravitys-ark/hull-look.js docs/gravitys-ark/ground.js scripts/gravitys-ark-test.mjs README.md docs/parts docs/plans
git commit -m "phase 0.1.2 task 4 — the ship's look on the ground: deadweight's shapes, glyphs, and colours as solid shapes in coldsnap's scene

Every module takes its kind's own footprint and height as a body and a drawing; couplers on the welds that hold; the balance mark; the camera opens on the bridge.
Coldsnap's drawing returns its scene, the fifth listed difference. gravitys-ark-test 48 PASS / 0 FAIL; the parts build over 50 gates, every verdict ok.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01QSq3kZC3Bk9SC5RwnqYUfs"
git push origin main
H=$(git rev-parse --short HEAD)
sed -i "s/commit stamped below/commit \`$H\`/g" docs/plans/phase-0.1.2-the-findings.md
git add docs/plans && git commit -m "phase 0.1.2 task 4 row stamped — $H

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01QSq3kZC3Bk9SC5RwnqYUfs"
git push origin main
```

## Acceptance

- Step 1: `0`, six OK lines, `absent`.
- Steps 2 through 7: seven OK lines, `syntax ok` five times.
- Step 8: `gravitys-ark-test: 48 PASS / 0 FAIL`, `gravitys-ark-test PASS`, a seeds line.
- Step 9: `2`; the count line names 50 gates; `50 gates, 0 not ok`; `gravitys-ark 48 PASS / 0 FAIL;` with its seeds.
- Step 10: push accepted by origin; the stamp commit pushed.

After the landing the orchestrator republishes the page from `docs/parts/parts.html` to its fixed address and names it, with the game's address, in the landing report.

## Report

Read-confirmation first, then one line of outcome, then bullets: step 8's lines verbatim; every OK line; the parts build's count line and the verdict line verbatim; the ark's gate line verbatim; both commit hashes; the push results. Every nonconformity its own labeled bullet, with the verbatim output. Fixture seeds: the seeds line the ark's gate printed in step 8 and the one from step 9's line; no seed is special.
