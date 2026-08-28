// COLDSNAP RENDER — portrait.js (P7.1 T10): the info card's live picture.
// One shared offscreen painter for the whole session (the mk1.55 pooled
// lesson — never a WebGL context per card); models come from the SAME
// sources the battlefield draws: INFANTRY + troopKit for men, the
// renderer's exported builders for towers and hulls. A failed paint is a
// blank corner, never a dead card. Pure render layer — no sim, no rng.
import * as THREE from "three";
import { INFANTRY } from "../engine/core.js";
import { troopKit, MEDIC_HEX, DAVY_HEX } from "./troopkit.js";
import { toon, buildBison, buildApc, buildTowerMesh } from "./renderer.js";

const SIZE = 128;
let P = null; // the one painter: { renderer, scene, cam, mount }
function painter() {
  if (P) return P;
  const cv = document.createElement("canvas");
  cv.width = SIZE; cv.height = SIZE;
  const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: false, alpha: true });
  renderer.setSize(SIZE, SIZE, false);
  const scene = new THREE.Scene();
  scene.add(new THREE.AmbientLight(0xffffff, 0.75));
  const sun = new THREE.DirectionalLight(0xffffff, 0.9);
  sun.position.set(2, 3, 2.2);
  scene.add(sun);
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 60);
  const mount = new THREE.Group();
  scene.add(mount);
  P = { renderer, scene, cam, mount };
  return P;
}
// the rifle's real pre-rotation, composed exactly as the renderer composes
// RIFLE_Q (Rz · Ry · Rx off the same table entry the pool geometry bakes)
function rifleQ(preRot) {
  const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), preRot[2]);
  const qa = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), preRot[1]);
  const qb = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), preRot[0]);
  return q.multiply(qa).multiply(qb);
}
const PROP_KEYS = { prop: 0, prop2: 1, prop3: 2 };
// a standing man from the con table + his squad kit — the buildInfPools
// geometry recipe and the sync loop's compose conventions, statically.
export function buildPortraitMan(utype) {
  const b = { team: 1, utype, alive: true };
  const KIT = troopKit(b, true, false);
  const spec = INFANTRY.con;
  const pal = KIT.pal === "medic" ? { ...INFANTRY.pal.con, ...MEDIC_HEX } : KIT.pal === "davy" ? { ...INFANTRY.pal.con, ...DAVY_HEX } : INFANTRY.pal[KIT.pal];
  const g = new THREE.Group();
  const riflePre = spec.find((p) => p.key === "rifle").preRot;
  for (const p of spec) {
    let geo;
    if (p.cyl) { geo = new THREE.CylinderGeometry(p.cyl[0], p.cyl[1], p.cyl[2], p.cyl[3], 1); if (p.rotY) geo.rotateY(p.rotY); }
    else geo = new THREE.BoxGeometry(p.box[0], p.box[1], p.box[2]);
    if (p.ty) geo.translate(0, p.ty, 0);
    if (p.preRot) { geo.rotateX(p.preRot[0]); geo.rotateY(p.preRot[1]); geo.rotateZ(p.preRot[2]); }
    let off = p.off, sx = 1, sy = 1, sz = 1, quat = null;
    const pi = PROP_KEYS[p.key];
    if (pi !== undefined) {
      const pr = KIT.props[pi];
      if (!pr) continue; // inert slot
      off = pr.off; sx = pr.s[0]; sy = pr.s[1]; sz = pr.s[2];
      if (pr.aim === "barrel") quat = rifleQ(riflePre);
      else if (pr.tilt) quat = new THREE.Quaternion().setFromAxisAngle(
        [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1)][pr.tilt[0]], pr.tilt[1]);
    } else if (p.key === "rifle") {
      if (!KIT.rifle) continue;
      sx = sy = sz = KIT.rifle;
    }
    const m = new THREE.Mesh(geo, toon(pal[(pi !== undefined && KIT.props[pi] && KIT.props[pi].role) || p.role]));
    const bulk = pi !== undefined ? 1 : 1; // props keep literal scale (the shear law)
    const bw = pi !== undefined ? 1 : KIT.bw, bh = pi !== undefined ? 1 : KIT.bh;
    m.position.set(off[0] * bw, off[1] * bh, off[2] * bw);
    m.scale.set(bw * sx * bulk, bh * sy * bulk, bw * sz * bulk);
    if (quat) m.quaternion.copy(quat);
    g.add(m);
  }
  return g;
}
// THE MECH (owner, 2026-08-20): boxes-first miniature — grey toon slabs at
// the walker's own proportions (mech.js RIG, literal numbers — this card
// never moves, so no rig import is worth the coupling).
export function buildPortraitMech() {
  const g = new THREE.Group();
  const grey = toon(0x5f6e80), dark = toon(0x2f353d);
  const box = (mat, hx, hy, hz, x, y, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(hx * 2, hy * 2, hz * 2), mat);
    m.position.set(x, y, z);
    g.add(m);
  };
  const ankleH = 0.42, L1 = 1.9, L2 = 1.7, hipX = 0.85;
  const hipY = ankleH + L1 + L2;
  for (const sx of [-1, 1]) {
    box(dark, 0.60, 0.20, 0.78, sx * hipX, ankleH / 2, 0.14);
    box(grey, 0.34, 0.85, 0.40, sx * hipX, ankleH + L2 / 2, 0);
    box(grey, 0.42, 0.95, 0.50, sx * hipX, ankleH + L2 + L1 / 2, 0);
  }
  box(grey, 1.15, 0.62, 0.95, 0, hipY + 0.62, 0); // hull
  box(grey, 2.05, 0.58, 1.15, 0, hipY + 1.24 + 0.58, 0); // torso
  box(dark, 0.62, 0.30, 0.48, 0, hipY + 1.24 + 1.16 + 0.30, 0); // head
  box(dark, 0.75, 0.58, 1.45, -1.35, hipY + 1.24 + 0.58, 0); // shoulder pod
  return g;
}
// key -> model. sq_* are men off their own kit; towers and hulls are the
// renderer's real builders, player dress.
export function buildPortraitModel(key) {
  if (key && key.startsWith("sq_")) return buildPortraitMan(key.slice(3));
  if (key === "hero_bison") return buildBison(1);
  if (key === "hero_apc") return buildApc(1);
  if (key === "hero_mech") return buildPortraitMech();
  return buildTowerMesh(key); // mg | gun | mortar | rocket | frost
}
// renderPortrait(cardCanvas, key): build, frame, paint once, blit, dispose
// the model. The card canvas is a plain 2D canvas — WebGL never touches it.
export function renderPortrait(cardCanvas, key) {
  try {
    const p = painter();
    const model = buildPortraitModel(key);
    p.mount.add(model);
    const box = new THREE.Box3().setFromObject(model);
    const c = box.getCenter(new THREE.Vector3());
    const r = Math.max(0.6, box.getSize(new THREE.Vector3()).length() * 0.36);
    p.cam.left = -r; p.cam.right = r; p.cam.top = r; p.cam.bottom = -r;
    p.cam.updateProjectionMatrix();
    // the game's own three-quarter look: low orbit, slight height
    p.cam.position.set(c.x + r * 1.6, c.y + r * 1.1, c.z + r * 1.6);
    p.cam.lookAt(c.x, c.y, c.z);
    p.renderer.render(p.scene, p.cam);
    const ctx = cardCanvas.getContext("2d");
    ctx.clearRect(0, 0, cardCanvas.width, cardCanvas.height);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(p.renderer.domElement, 0, 0, cardCanvas.width, cardCanvas.height);
    p.mount.remove(model);
    model.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
  } catch (e) { /* a blank corner, never a dead card */ }
}
