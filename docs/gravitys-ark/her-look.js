// GRAVITY'S ARK — her-look.js: the mechanic's hair, phase 0.1.3. Longish brown hair drawn
// over her body in coldsnap's scene: a cap over the head and strands to the shoulders, following
// her position and her facing every frame. The purple jumpsuit is coldsnap's own man drawn in
// her dress. Shaped from coldsnap's man parts, core.js lines 2161 to 2170: the head 0.54 up
// from the body's centre, its cap at 0.705. Nothing here moves a body; the body moves this.
import * as THREE from "three";
import { toon } from "../../src/graphics/renderer.js";

const HAIR = "#5a3a22", HAIR_DARK = "#3e2816";

// makeHerLook(scene, body): the hair on her body. Returns update() and dispose().
export function makeHerLook(scene, body) {
  const g = new THREE.Group(); scene.add(g);
  const cap = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.2, 0.36), toon(HAIR)); cap.position.set(0, 0.72, 0); cap.castShadow = true; g.add(cap);
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.42, 0.1), toon(HAIR_DARK)); back.position.set(0, 0.46, -0.16); back.castShadow = true; g.add(back);
  for (const sx of [-1, 1]) { const strand = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.38, 0.24), toon(HAIR_DARK)); strand.position.set(sx * 0.19, 0.49, -0.02); g.add(strand); }
  function update() {
    if (!body || !body.alive) { g.visible = false; return; }
    g.visible = true;
    g.position.set(body.pos.x, body.pos.y, body.pos.z);
    g.rotation.y = Math.atan2(body.R[6], body.R[8]);   // the man faces his own forward: coldsnap's facing law, units.js faceTravel
  }
  function dispose() { g.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); }); scene.remove(g); }
  update();
  return { update, dispose, group: g };
}
