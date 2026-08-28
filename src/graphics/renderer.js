// graphics/renderer.js — the WAR GAME's own renderer, forked byte-identical
// from src/render/renderer.js at mk2.75 (graphics-engine T1). Owned
// separately from the old file from mk2.8 on. Originally extracted VERBATIM from
// src/demo/coldsnap-proving-grounds.jsx (lines 2099-2761), with the module
// imports the single-file version got from its own top-of-file scope.
import * as THREE from "three";
import { POOL, INFANTRY, BAYER4, snapCam, ICE_CREEP, ICE_CREEP_T } from "../engine/core.js";
import { troopKit, RIFLE_PREROT, MEDIC_HEX, DAVY_HEX } from "./troopkit.js";

// ==================================================================== render
const PAL = { bisonBlue: 0x33619c, scoutRed: 0x8a4a44, snow: 0xe9edf2, uiRed: 0xd8433a }; // player is blue steel; the enemy wears the red now
function makeGradientMap() {
  const d = new Uint8Array([70, 70, 70, 255, 128, 128, 128, 255, 190, 190, 190, 255, 255, 255, 255, 255]);
  const t = new THREE.DataTexture(d, 4, 1, THREE.RGBAFormat);
  t.minFilter = THREE.NearestFilter; t.magFilter = THREE.NearestFilter;
  t.generateMipmaps = false; t.needsUpdate = true;
  return t;
}
const grad = makeGradientMap();
export const toon = (color, extra) => Object.assign(new THREE.MeshToonMaterial({ color, gradientMap: grad }), extra || {});
function makeTreadTex() {
  // P7.1 T10 A1: headless — the suite builds hulls with no browser canvas;
  // a one-pixel flat tread stands in. The browser path below is untouched.
  if (typeof document === "undefined") {
    const t = new THREE.DataTexture(new Uint8Array([90, 90, 96, 255]), 1, 1, THREE.RGBAFormat);
    t.needsUpdate = true;
    return t;
  }
  const c = document.createElement("canvas"); c.width = 16; c.height = 4;
  const x = c.getContext("2d");
  x.fillStyle = "#1b1e22"; x.fillRect(0, 0, 16, 4);
  x.fillStyle = "#3a4048"; x.fillRect(0, 0, 3, 4); x.fillRect(8, 0, 3, 4);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.RepeatWrapping; t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(7, 1);
  t.minFilter = THREE.NearestFilter; t.magFilter = THREE.NearestFilter; t.generateMipmaps = false;
  return t;
}
// P7 T2 (mk1.31): team parameterizes the dress — undefined (the demo) is
// today's colors exactly; team 2 (the enemy's own Bison) rides a slate-red
// dress instead of the player's blue. Symmetric build, one function.
export function buildBison(team) {
  const g = new THREE.Group();
  const hull = new THREE.Mesh(new THREE.BoxGeometry(3.3, 1.5, 6.4), toon(team === 2 ? 0x6e3a34 : PAL.bisonBlue));
  hull.position.y = 0.35;
  hull.castShadow = true; hull.receiveShadow = true; g.add(hull);
  const treadMats = [];
  for (const sx of [-1, 1]) {
    const tex = makeTreadTex();
    const tm = new THREE.MeshBasicMaterial({ map: tex, color: 0xffffff });
    treadMats.push(tm);
    const tread = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.15, 6.9), tm);
    tread.position.set(sx * 1.78, -0.42, 0); tread.castShadow = true; g.add(tread);
    for (const wz of [-2.5, -0.85, 0.85, 2.5]) {
      const wheel = new THREE.Mesh(new THREE.BoxGeometry(1.02, 0.62, 0.62), toon(0x101317));
      wheel.position.set(sx * 1.78, -0.62, wz); g.add(wheel);
    }
    const fender = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.16, 7.1), toon(team === 2 ? 0x3a2320 : 0x1e3a56));
    fender.position.set(sx * 1.78, 0.28, 0); g.add(fender);
  }
  g.userData.treadMats = treadMats;
  const blade = new THREE.Mesh(new THREE.BoxGeometry(4.8, 1.15, 0.5), toon(0x777d84));
  blade.position.set(0, -0.45, 3.5); blade.rotation.x = -0.24; blade.castShadow = true; g.add(blade);
  const tur = new THREE.Group(); tur.position.y = 1.35;
  const turBox = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.95, 2.7), toon(team === 2 ? 0x5a2f2a : 0x2a5082)); turBox.castShadow = true; tur.add(turBox);
  // mk2.03 (owner): the barrel rises and falls — a pivot at the mantlet,
  // the tube a child, pitch driven by b._aimPitch in the sync below.
  const gpiv = new THREE.Group(); gpiv.position.set(0, 0.12, 0.6); tur.add(gpiv); g.userData.gunPitch = gpiv;
  const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.36, 3.6), toon(0x33383d)); barrel.position.set(0, 0, 1.8); barrel.castShadow = true; gpiv.add(barrel);
  const star = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.14, 0.9), toon(0xe0c34a)); star.position.set(0, 1.13, 0); g.add(star);
  // coax .50 stub riding right of the main gun
  const coax = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.5, 6), tur.material);
  coax.rotation.x = Math.PI / 2; coax.position.set(0.55, 0.3, 1.5);
  tur.add(coax);
  // THE BULB (P7 T2, owner, 2026-08-14): a small lamp on the turret rear —
  // GREEN with the tracks safety on (CAREFUL), RED with it off (FREE).
  // Bodies with no b.tracks field (the demo, the enemy's Bison before
  // Task 5) read green — see the vehicle sync loop below.
  const bulb = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.22), new THREE.MeshBasicMaterial({ color: 0x35ff6a }));
  bulb.position.set(0, 0.62, -1.2);
  tur.add(bulb); g.userData.bulb = bulb;
  g.add(tur); g.userData.turret = tur;
  return g;
}
// mk2.03 (owner): the wave tank finally shows its gun — hull, turret, and a
// barrel that elevates. DEPOT-only (vtype "tank"); the demo's scouts and
// trucks render untouched.
export function buildWaveTank(team) {
  const g = new THREE.Group();
  const hull = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.1, 4.2), toon(team === 2 ? 0x6e3a34 : 0x3f5a78)); hull.position.y = 0.15; hull.castShadow = true; g.add(hull);
  const tur = new THREE.Group(); tur.position.y = 0.95; g.add(tur); g.userData.turret = tur;
  const box = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.7, 2.0), toon(team === 2 ? 0x5a2f2a : 0x2a5082)); box.castShadow = true; tur.add(box);
  const gp = new THREE.Group(); gp.position.set(0, 0.1, 0.5); tur.add(gp); g.userData.gunPitch = gp;
  const bar = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.28, 2.8), toon(0x33383d)); bar.position.z = 1.4; bar.castShadow = true; gp.add(bar);
  return g;
}
// P7 T4 (mk1.33): the APC — four seats, one coax. team parameterizes the
// dress exactly as buildBison does.
export function buildApc(team) {
  const g = new THREE.Group();
  const hullC = team === 2 ? 0x6e3a34 : 0x3f5a78, topC = team === 2 ? 0x5a2f2a : 0x2f4a66, fenderC = team === 2 ? 0x3a2320 : 0x1e3a56;
  const hull = new THREE.Mesh(new THREE.BoxGeometry(3.1, 1.5, 5.6), toon(hullC));
  hull.position.y = 0.25; hull.castShadow = true; hull.receiveShadow = true; g.add(hull);
  const glacis = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.9, 1.4), toon(topC));
  glacis.position.set(0, 0.95, 2.0); glacis.rotation.x = 0.35; glacis.castShadow = true; g.add(glacis);
  const cupola = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.5, 1.1), toon(topC));
  cupola.position.set(-0.6, 1.25, 0.4); cupola.castShadow = true; g.add(cupola);
  const coax = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.2, 6), toon(0x33383d));
  coax.rotation.x = Math.PI / 2; coax.position.set(-0.6, 1.35, 1.2); g.add(coax);
  for (const sx of [-1, 1]) {
    const tread = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.0, 6.0), toon(0x1b1e22));
    tread.position.set(sx * 1.6, -0.45, 0); tread.castShadow = true; g.add(tread);
    const fender = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.14, 6.2), toon(fenderC));
    fender.position.set(sx * 1.6, 0.22, 0); g.add(fender);
  }
  // THE RAMP (owner, 2026-08-14): CLOSED on the march, OPEN when troops
  // are loading or unloading — hinged at the tail's foot, swinging down
  // to the snow. The game layer stamps b._hatch; the sync loop eases it.
  const hinge = new THREE.Group(); hinge.position.set(0, -0.5, -2.8); g.add(hinge);
  const ramp = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.35, 0.16), toon(topC));
  ramp.position.y = 0.68; ramp.castShadow = true; hinge.add(ramp);
  g.userData.ramp = hinge;
  // the safety bulb — the Bison's law: green safe, red off
  const bulb = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.22), new THREE.MeshBasicMaterial({ color: 0x35ff6a }));
  bulb.position.set(-0.6, 1.62, 0.4); g.add(bulb);
  g.userData.bulb = bulb;
  return g;
}
const TOWER_VIS = { mg: { color: 0x5c7a3a, hy: 1.0 }, gun: { color: 0x33619c, hy: 1.5 }, mortar: { color: 0x8a5a1c, hy: 0.8 }, rocket: { color: 0x8a3a3a, hy: 1.2 }, frost: { color: 0x3a7a9c, hy: 1.35 } };
export function buildTowerMesh(type) {
  const spec = TOWER_VIS[type] || TOWER_VIS.gun;
  const g = new THREE.Group();
  const steel = toon(spec.color), dark = toon(new THREE.Color(spec.color).multiplyScalar(0.55).getHex());
  const iron = toon(0x2a2f36), snowM = toon(0xeef4fa);
  // a revetment of sandbags on a timber frame: reads at 20px, and it is not
  // another pile of grey cubes
  const bagM = toon(0x6f6a58), bagM2 = toon(0x5d594a);
  for (let iy = 0; iy < 3; iy++) {
    const r2 = 1.02 - iy * 0.05, n2 = 10;
    for (let i = 0; i < n2; i++) {
      const a = (i / n2) * Math.PI * 2 + iy * 0.31;
      const bag = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.3, 0.34), i % 2 ? bagM : bagM2);
      bag.position.set(Math.cos(a) * r2, -spec.hy + 0.2 + iy * 0.31, Math.sin(a) * r2);
      bag.rotation.y = -a; bag.castShadow = true; g.add(bag);
    }
  }
  const frame = new THREE.Mesh(new THREE.BoxGeometry(1.5, spec.hy * 1.25, 1.5), toon(0x3b3029));
  frame.position.y = -spec.hy * 0.05; frame.castShadow = true; g.add(frame);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.2, spec.hy * 1.5, 0.2), toon(0x2a221d));
    post.position.set(sx * 0.72, -spec.hy * 0.02, sz * 0.72); post.castShadow = true; g.add(post);
  }
  const capStone = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.22, 1.9), toon(0xeef4fa));
  capStone.position.y = spec.hy * 0.62; g.add(capStone);
  if (type === "mg") {
    const slit = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.26, 1.2), steel); slit.position.y = spec.hy * 0.38; g.add(slit);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.16, 1.8), snowM); cap.position.y = spec.hy * 0.82; g.add(cap);
    const t = new THREE.Group(); t.position.y = spec.hy * 0.42; g.add(t); g.userData.turret = t;
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.11, 1.5), iron); bar.position.z = 0.75; t.add(bar);
  } else if (type === "gun") {
    const deck = new THREE.Mesh(new THREE.BoxGeometry(2.16, 0.3, 2.16), dark); deck.position.y = spec.hy * 0.72; deck.castShadow = true; g.add(deck);
    const t = new THREE.Group(); t.position.y = spec.hy * 1.05; g.add(t); g.userData.turret = t;
    const mant = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.62, 1.15), dark); mant.castShadow = true; t.add(mant);
    const gp = new THREE.Group(); t.add(gp); g.userData.gunPitch = gp; // mk2.03: the tube elevates
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 2.3), iron); bar.position.z = 1.2; gp.add(bar);
    const brake = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.26, 0.3), iron); brake.position.z = 2.25; gp.add(brake);
  } else if (type === "mortar") {
    const lip = new THREE.Mesh(new THREE.CylinderGeometry(1.24, 1.24, 0.2, 8), snowM); lip.position.y = spec.hy * 0.72; g.add(lip);
    const t = new THREE.Group(); t.position.y = spec.hy * 0.5; g.add(t); g.userData.turret = t;
    const tube = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.9, 0.3), iron);
    tube.position.set(0, 0.55, 0.2); tube.rotation.x = -0.62; tube.castShadow = true; t.add(tube);
    const bipod = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.1, 0.1), iron); bipod.position.set(0, 0.2, 0.6); t.add(bipod);
  } else if (type === "rocket") {
    const t = new THREE.Group(); t.position.y = spec.hy * 0.6; g.add(t); g.userData.turret = t;
    const rack = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.9, 1.0), dark); rack.castShadow = true; t.add(rack);
    for (let i = 0; i < 4; i++) {
      const tube = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.24, 1.5), iron);
      tube.position.set((i % 2 ? 0.32 : -0.32), (i < 2 ? 0.26 : -0.16), 0.7);
      t.add(tube);
    }
    t.rotation.x = -0.22;
  } else {
    // tesla (mk2.16): a squat plinth, a wound coil, a bright toroid crown —
    // and a glow bulb the frame loop pulses (userData.glow).
    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.9, 0.7, 8), new THREE.MeshToonMaterial({ color: 0x3a4250, gradientMap: grad }));
    plinth.position.y = 0.35; plinth.castShadow = true; g.add(plinth);
    const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.42, spec.hy * 1.1, 8), new THREE.MeshToonMaterial({ color: 0x6b7686, gradientMap: grad }));
    stack.position.y = 0.7 + spec.hy * 0.55; stack.castShadow = true; g.add(stack);
    for (let i = 0; i < 4; i++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.44, 0.05, 6, 14), new THREE.MeshToonMaterial({ color: 0x9fb6c8, gradientMap: grad }));
      ring.rotation.x = Math.PI / 2; ring.position.y = 0.75 + i * spec.hy * 0.26; g.add(ring);
    }
    const crown = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.14, 8, 18), new THREE.MeshToonMaterial({ color: 0xcfe6f4, gradientMap: grad }));
    crown.rotation.x = Math.PI / 2; crown.position.y = 0.75 + spec.hy * 1.12; g.add(crown);
    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), new THREE.MeshBasicMaterial({ color: 0xdff2ff, transparent: true, opacity: 0.7 }));
    glow.position.y = 0.75 + spec.hy * 1.12; g.add(glow);
    g.userData.glow = glow;
    g.userData.crownY = 0.75 + spec.hy * 1.12;
  }
  return g;
}
// DEPOT-only grid-line faction tint. Reads a value cell in the same masonry
// grid the base grid lines are drawn into (see paintBase below), painted
// with rgba() over the existing line color rather than replacing it — the
// underlying grey grid never disappears, it just gets a wash.
const TERR_TINT = {
  held: "rgba(94,148,94,0.55)",    // muted green — player ground
  unheld: "rgba(150,84,76,0.55)",  // muted red (PAL.scoutRed family) — enemy/neutral-far
  seam: null,                      // no wash — the base grey line already reads as no-man's-land
};
function makeSplat(town, span) {
  const cv = document.createElement("canvas");
  cv.width = 1024; cv.height = 1024; // DIVERGENCE from the demo (512): block-scale grid needs the resolution
  const cx = cv.getContext("2d");
  // grid geometry constants. THE FRONT (mk1.00): derived from the caller's
  // field span when supplied (DEPOT passes its real 240m field, so the block
  // grid finally sits at the true 0.83m pitch and lines align with world
  // positions); the 188.7 literal is the frozen demo's field and stays the
  // fallback so TD/campaign/sandbox render byte-identically.
  const SPAN = span || 188.7;
  const W2Ug = 1024 / SPAN, U0g = SPAN / 2, BLK = 0.83;
  const gridPx = (worldCoord) => (worldCoord + U0g) * W2Ug;
  const paintBase = () => {
    cx.globalAlpha = 1; cx.fillStyle = "#f2f6fa"; cx.fillRect(0, 0, 1024, 1024);
    cx.fillStyle = "#e2eaf3";
    for (let i = 0; i < 900; i++) { const x = (i * 137) % 1024, y = (i * 89 + ((i * i) % 7) * 31) % 1024; cx.fillRect(x, y, 2, 2); }
    cx.fillStyle = "#cdd9e6";
    for (let i = 0; i < 260; i++) { const x = (i * 251) % 1024, y = (i * 173 + ((i * i) % 11) * 17) % 1024; cx.fillRect(x, y, 1, 1); }
    // ---- the town, painted into the base so a range reset repaints it ----
    // (feature-detected: the jsdom e2e canvas stub only implements what three
    // needs — path/arc calls on it would kill the mount)
    // ---- tactical grid: 4m minors, 20m majors, painted into the base so
    // range resets repaint it. fillRect only — it must draw under the jsdom
    // stub too (the feature-detect below bails before the town lanes). The
    // lines drape over the heightfield via the terrain UVs, so relief reads
    // at a glance: they bend over the hill and dive into the bowl.
    {
      // DIVERGENCE from the demo's 4m/20m grid: cells are one masonry block
      // (0.83m PITCH) with a heavier line every 4 blocks, so terrain relief
      // reads in the same visual unit as every wall and house.
      for (let k = Math.ceil(-U0g / BLK); k * BLK <= U0g; k++) {
        const gp = Math.round(gridPx(k * BLK));
        cx.fillStyle = k % 4 === 0 ? "rgba(78,92,110,0.7)" : "rgba(116,130,148,0.7)"; // opaque enough to read on open snow
        cx.fillRect(gp, 0, 1, 1024);
        cx.fillRect(0, gp, 1024, 1);
      }
    }
    // the town lanes/plaza/pond shore are proving-grounds furniture — campaign
    // maps opt out (a pond outline on a dry map reads as an artifact)
    if (!town) return;
    if (!cx.beginPath || !cx.stroke || !cx.arc || !cx.strokeRect) return;
    const W2U = 1024 / 188.7, U0 = 94.35; // world meters -> canvas px
    const uu = (x2) => (x2 + U0) * W2U, vv2 = (z2) => (z2 + U0) * W2U;
    const lane = (x0, z0, x1, z1, wm, col) => {
      cx.strokeStyle = col || "rgba(101,92,80,0.55)"; cx.lineCap = "round";
      cx.lineWidth = wm * W2U;
      cx.beginPath(); cx.moveTo(uu(x0), vv2(z0)); cx.lineTo(uu(x1), vv2(z1)); cx.stroke();
    };
    lane(0, -50, 0, 76, 7);                       // main street: spawn to convoy road
    for (const o of [-1.2, 1.2]) lane(o, -50, o, 76, 0.6, "rgba(66,58,48,0.35)"); // wheel ruts
    lane(-3.5, 2, 14, 2, 5);                      // cross street to the east houses
    lane(-3, -26, -20, -24, 5); lane(-20, -24, -20, -8, 6); // hangar drive
    lane(3.5, 41, 15, 41, 4);                     // warehouse spur
    cx.fillStyle = "rgba(150,143,132,0.45)";      // plaza around the keep
    cx.beginPath(); cx.arc(uu(-7), vv2(2), 8.5 * W2U, 0, Math.PI * 2); cx.fill();
    cx.strokeStyle = "rgba(140,128,110,0.4)"; cx.lineWidth = 6; // pond shore
    cx.strokeRect(uu(-8.6), vv2(19.4), 17.2 * W2U, 17.2 * W2U);
  };
  paintBase();
  // ---- THE ROAD PAINTED (mk2.67, owner): roads are ground paint, not
  // bodies — stamped over the base art so fades keep them, under the smear
  // ledger's replay. fillRect only (the jsdom stub has no paths). A KEPT
  // road is a solid packed-earth ribbon with a worn center; a BROKEN road
  // drops out in hash-drawn stretches — the years ate it. Deterministic
  // from world positions; identical maps paint identical ground.
  let roadRows = [];
  const paintRoads = () => {
    for (const rd of roadRows) {
      const pts = rd.pts;
      let s = (Math.imul(Math.round(pts[0][0] * 8) | 0, 374761393) ^ Math.imul(Math.round(pts[0][1] * 8) | 0, 668265263)) | 0;
      const rnd = () => { s = Math.imul(s ^ (s >>> 15), 2246822519) | 0; return ((s >>> 8) & 0xffff) / 0x10000; };
      let skipT = 0;
      for (let i = 0; i + 1 < pts.length; i++) {
        const ax = pts[i][0], az = pts[i][1], bx = pts[i + 1][0], bz = pts[i + 1][1];
        const segL = Math.hypot(bx - ax, bz - az), steps = Math.max(1, Math.ceil(segL / 0.7));
        for (let k = 0; k <= steps; k++) {
          const wx = ax + (bx - ax) * (k / steps), wz = az + (bz - az) * (k / steps);
          if (rd.broken) {
            if (skipT > 0) { skipT--; continue; }
            if (rnd() < 0.06) { skipT = 5 + Math.floor(rnd() * 14); continue; }
          }
          const u = gridPx(wx), v = gridPx(wz);
          const half = 2.1 * W2Ug + (rnd() - 0.5) * 3;
          cx.globalAlpha = 1;
          cx.fillStyle = "rgba(122,104,82,0.88)";                    // packed earth
          cx.fillRect(Math.round(u - half), Math.round(v - half), Math.round(half * 2), Math.round(half * 2));
          cx.fillStyle = "rgba(94,78,60,0.55)";                      // the worn center
          cx.fillRect(Math.round(u - 2), Math.round(v - 2), 4, 4);
        }
      }
    }
  };
  // ---- kill smears: painted once, then REPLAYED after every fade ----------
  // PERMANENT MEANS PERMANENT (C0 T4): the DEPOT decal-fade re-blends the
  // clean base over the whole canvas every few seconds, which would grey a
  // smear out along with the scorch it was meant to outlive. So every smear's
  // parameters go into this ledger and get repainted at full strength at the
  // end of each fade pass. The ledger is unbounded on purpose — a mark left
  // where a man fell never expires — and is only ever cleared by clear() (a
  // range reset repaints the base; a fresh world starts on clean snow).
  // Inert for every caller that never arms the fade (TD/campaign/demo push
  // nothing here beyond the array they already never read).
  const smearLog = [];
  // The paint body, shared by the live smear() and the fade replay. Shape is
  // derived from the WORLD position (wx, wz) so identical runs paint identical
  // ground; the replay hands back the stored values rather than re-deriving
  // anything, so a repaint is byte-for-byte the same streak. fillRect only —
  // the jsdom e2e canvas stub has no paths.
  const paintSmear = (u, v, style, wx, wz) => {
    let s = (Math.imul(Math.round(wx * 8) | 0, 374761393) ^ Math.imul(Math.round(wz * 8) | 0, 668265263)) | 0;
    const rnd = () => { s = Math.imul(s ^ (s >>> 15), 2246822519) | 0; return ((s >>> 8) & 0xffff) / 0x10000; };
    const ang = rnd() * Math.PI * 2, len = 10 + rnd() * 7;
    const dx = Math.cos(ang), dy = Math.sin(ang);
    cx.globalAlpha = 1;
    cx.fillStyle = style === "human" ? "rgba(206,22,16,0.9)" : style === "scorch" ? "rgba(10,10,12,0.92)" : "rgba(22,24,28,0.85)";
    if (style === "scorch") {
      // the black smudge: a charred round blot, not a streak — soot rings
      // stamped tight around the fall, thinning outward. Same position-hashed
      // rnd(), so identical runs paint identical ground.
      for (let i = 0; i < 26; i++) {
        const a2 = rnd() * Math.PI * 2, rr = Math.pow(rnd(), 1.6) * 7;
        const w = Math.max(1, Math.round(3 * (1 - rr / 7) + rnd()));
        cx.fillRect(Math.round(u + Math.cos(a2) * rr - w / 2), Math.round(v + Math.sin(a2) * rr - w / 2), w, w);
      }
    } else {
      for (let i = 0; i < len; i++) {
        const w = Math.max(1, Math.round(3.6 * (1 - i / len) + rnd()));
        cx.fillRect(Math.round(u + dx * i - w / 2), Math.round(v + dy * i - w / 2), w, w);
      }
    }
    if (style === "human") {
      cx.fillStyle = "rgba(228,48,30,0.85)"; // spray droplets past the streak
      for (let i = 0; i < 5; i++) cx.fillRect(Math.round(u + (rnd() - 0.5) * len * 1.7), Math.round(v + (rnd() - 0.5) * len * 1.7), 1, 1);
    } else if (style !== "scorch") {
      // silver has to READ against scorch marks: bright dashes down the
      // streak, not lone pixels — spilled machinery, unmistakably not soot
      cx.fillStyle = "rgba(216,224,234,0.95)";
      for (let i = 0; i < 9; i++) {
        const t = rnd() * len;
        cx.fillRect(Math.round(u + dx * t + (rnd() - 0.5) * 3), Math.round(v + dy * t + (rnd() - 0.5) * 3), 2, 2);
      }
      for (let i = 0; i < 4; i++) cx.fillRect(Math.round(u + dx * rnd() * len * 1.4 + (rnd() - 0.5) * 5), Math.round(v + dy * rnd() * len * 1.4 + (rnd() - 0.5) * 5), 1, 1);
    }
  };
  // clean-base snapshot for the fade pass (DEPOT only, see fade() below):
  // a second canvas holding the untouched ground art, redrawn over the live
  // canvas at low alpha so old scorch/tread/smear staining greys out toward
  // it instead of vanishing to a flat wipe. Skipped when the caller never
  // fades (TD/campaign/demo never allocate it — no cost, no behavior change).
  let baseCv = null, baseCx = null;
  const tex = new THREE.CanvasTexture(cv);
  tex.minFilter = THREE.NearestFilter; tex.magFilter = THREE.NearestFilter; tex.generateMipmaps = false;
  return {
    tex,
    // The ledger itself, exposed read-only-by-convention so the DEPOT save
    // (src/depot/save.js) can write the marks down and replay them through
    // smear() on resume. Nothing here mutates it but smear() and clear().
    log: smearLog,
    clear() { paintBase(); smearLog.length = 0; tex.needsUpdate = true; },
    // mk2.67: the road rows land once at boot — repaint base, roads, then
    // the smear ledger back on top; refresh the fade snapshot so a fade
    // greys toward roads, never over them.
    setRoads(list) {
      roadRows = (list || []).map((r2) => ({ pts: r2.pts || r2, broken: !!r2.broken }));
      paintBase();
      paintRoads();
      if (baseCv) { baseCx.drawImage(cv, 0, 0); }
      for (const m of smearLog) paintSmear(m.u, m.v, m.style, m.wx, m.wz);
      tex.needsUpdate = true;
    },
    // called once by callers that want the fade pass; cheap (one extra
    // 1024x1024 canvas), so only DEPOT opts into it.
    armFade() {
      if (baseCv) return;
      baseCv = document.createElement("canvas");
      baseCv.width = 1024; baseCv.height = 1024;
      baseCx = baseCv.getContext("2d");
      if (baseCx.drawImage) baseCx.drawImage(cv, 0, 0);
    },
    // re-blend the clean base over the live canvas at a low alpha: a batched,
    // periodic call (every few seconds, from the render loop) — never per
    // frame. Fresh damage repaints darker than the fade can keep up with, so
    // it stays legible while old staining gradually greys out.
    fade(alpha) {
      if (!baseCx || !cx.drawImage) return;
      cx.globalAlpha = alpha;
      cx.drawImage(baseCv, 0, 0);
      cx.globalAlpha = 1;
      // ...then put the kill smears back, at full strength, exactly as they
      // were first painted. Scorch and treads keep greying out; the marks
      // where men fell do not. Cost is one repaint per fade tick (every few
      // seconds), never per frame — and the counter is NOT touched, since no
      // new man died.
      for (let i = 0; i < smearLog.length; i++) {
        const m = smearLog[i];
        paintSmear(m.u, m.v, m.style, m.wx, m.wz);
      }
      tex.needsUpdate = true;
    },
    // DEPOT-only: grid-line faction tint, region-batched on territory change.
    // prevState holds one byte per territory cell (0 seam/unpainted, 1 held,
    // 2 unheld) from the last call; only cells whose state actually flipped
    // get their crossing grid-line segments repainted — a fast-moving front
    // touches a handful of cells, a static line touches none. Called at the
    // territory field's own ~4Hz tick (DepotGame.jsx), never per frame.
    _terrPrev: null,
    retintTerritory(T, toWorld, sample) {
      if (!cx.fillRect) return; // jsdom e2e stub — feature-detect like paintBase
      const { nx, nz, cs, halfU, halfV } = T;
      if (!this._terrPrev || this._terrPrev.length !== nx * nz) this._terrPrev = new Uint8Array(nx * nz);
      const prev = this._terrPrev;
      const code = (s) => s === "held" ? 1 : s === "unheld" ? 2 : 0;
      for (let iz = 0; iz < nz; iz++) {
        for (let ix = 0; ix < nx; ix++) {
          const u = -halfU + (ix + 0.5) * cs, v = -halfV + (iz + 0.5) * cs;
          const st = sample(u, v);
          const c = code(st);
          const idx = iz * nx + ix;
          if (c === prev[idx]) continue;
          prev[idx] = c;
          const w = toWorld(u, v); // canonical -> world (90deg-step transforms preserve axis alignment)
          const half = cs / 2;
          const wxLo = w.x - half, wxHi = w.x + half, wzLo = w.z - half, wzHi = w.z + half;
          const pxLo = gridPx(wxLo), pxHi = gridPx(wxHi), pzLo = gridPx(wzLo), pzHi = gridPx(wzHi);
          const tint = TERR_TINT[st];
          // vertical grid lines crossing this cell's x-span
          for (let k = Math.ceil((wxLo - U0g) / BLK - 0.001); k * BLK + U0g <= wxHi + 0.001; k++) {
            const gp = Math.round(gridPx(k * BLK));
            cx.fillStyle = k % 4 === 0 ? "rgba(78,92,110,0.7)" : "rgba(116,130,148,0.7)";
            cx.fillRect(gp, Math.min(pzLo, pzHi), 1, Math.abs(pzHi - pzLo) + 1);
            if (tint) { cx.fillStyle = tint; cx.fillRect(gp, Math.min(pzLo, pzHi), 1, Math.abs(pzHi - pzLo) + 1); }
          }
          // horizontal grid lines crossing this cell's z-span
          for (let k = Math.ceil((wzLo - U0g) / BLK - 0.001); k * BLK + U0g <= wzHi + 0.001; k++) {
            const gp = Math.round(gridPx(k * BLK));
            cx.fillStyle = k % 4 === 0 ? "rgba(78,92,110,0.7)" : "rgba(116,130,148,0.7)";
            cx.fillRect(Math.min(pxLo, pxHi), gp, Math.abs(pxHi - pxLo) + 1, 1);
            if (tint) { cx.fillStyle = tint; cx.fillRect(Math.min(pxLo, pxHi), gp, Math.abs(pxHi - pxLo) + 1, 1); }
          }
          tex.needsUpdate = true;
        }
      }
    },
    treads: 0,
    tread(u, v) {
      cx.globalAlpha = 1;
      cx.fillStyle = "rgba(52,42,32,0.42)"; // churned earth through the snow
      cx.fillRect(u - 1, v - 1, 2, 2);
      this.treads++;
      tex.needsUpdate = true;
    },
    scorch(u, v, rPx) {
      const g = cx.createRadialGradient(u, v, 1, u, v, rPx);
      g.addColorStop(0, "rgba(24,20,18,0.9)"); g.addColorStop(0.55, "rgba(38,32,28,0.55)"); g.addColorStop(1, "rgba(38,32,28,0)");
      cx.globalAlpha = 1; cx.fillStyle = g;
      cx.beginPath(); cx.arc(u, v, rPx, 0, Math.PI * 2); cx.fill();
      tex.needsUpdate = true;
    },
    // DIVERGENCE from the demo: kill smears. Any body tagged with smearStyle
    // leaves a permanent mark where it died — humans a bright scarlet streak,
    // androids a dark spill flecked with silver. Campaign bodies carry the tag
    // from their scenario dress; from C0 T4 every DEPOT infantryman on both
    // sides carries it too. The paint itself lives in paintSmear above; this
    // wrapper is the one that counts the death and logs it for the fade replay.
    smears: 0,
    smear(u, v, style, wx, wz) {
      paintSmear(u, v, style, wx, wz);
      smearLog.push({ u, v, style, wx, wz }); // so the fade pass can put it back
      this.smears++;
      tex.needsUpdate = true;
    },
  };
}
const POST_VERT = "varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }";
const POST_FRAG = `
uniform sampler2D tCol; uniform sampler2D tNor; uniform sampler2D tDep; uniform sampler2D tBayer;
uniform vec2 uRes; uniform vec2 uShift; uniform float uOutline; uniform float uDither; uniform float uPalette; uniform float uLevels; uniform float uFlash;
uniform float uGrade; uniform float uT;
varying vec2 vUv;
void main(){
  vec2 px = 1.0 / uRes;
  vec2 uv = vUv + uShift * px;
  vec3 c = texture2D(tCol, uv).rgb;
  vec3 n0 = texture2D(tNor, uv).xyz;
  float d0 = texture2D(tDep, uv).x;
  vec3 nx = texture2D(tNor, uv + vec2(px.x, 0.0)).xyz;
  vec3 ny = texture2D(tNor, uv + vec2(0.0, px.y)).xyz;
  float dx = texture2D(tDep, uv + vec2(px.x, 0.0)).x;
  float dy = texture2D(tDep, uv + vec2(0.0, px.y)).x;
  float en = step(0.42, distance(n0, nx) + distance(n0, ny));
  float ed = step(0.0022, abs(d0 - dx) + abs(d0 - dy));
  float edge = max(en, ed) * uOutline;
  // THE GRADE — the record as palette, composed BEFORE the retro
  // quantization so the treatment survives it. uGrade 0 = the shipped look
  // (demo and sandbox never set it). Negative: selective desaturation that
  // preserves the red axis — the coats and the stamps are already scarlet.
  // Positive: dawn warmth on the snow plus a slow aurora wash up the frame.
  if (uGrade < 0.0) {
    float g = -uGrade;
    float luma = dot(c, vec3(0.299, 0.587, 0.114));
    float redness = clamp((c.r - max(c.g, c.b)) * 3.2, 0.0, 1.0);
    c = mix(c, mix(vec3(luma), c, redness), g * 0.85);
  } else if (uGrade > 0.0) {
    float g = uGrade;
    c = mix(c, c * vec3(1.07, 1.0, 0.93) + vec3(0.030, 0.012, 0.0), g * 0.45);
    float band = smoothstep(0.45, 1.0, vUv.y);
    vec3 aur = vec3(0.06, 0.16, 0.10) * (0.5 + 0.5 * sin(vUv.x * 8.0 + uT * 0.20))
             + vec3(0.08, 0.03, 0.14) * (0.5 + 0.5 * sin(vUv.x * 4.6 - uT * 0.12 + 1.7));
    c += aur * band * g * 0.55;
  }
  // mk2.12: THE ATOMIC FLASH — the whole frame washes white and decays.
  c = mix(c, vec3(1.0), uFlash);
  float bay = texture2D(tBayer, fract(uv * uRes / 4.0)).r - 0.5;
  vec3 q = floor(c * uLevels + bay * uDither + 0.5) / uLevels;
  c = mix(c, q, step(0.5, uPalette));
  c = mix(c, c * vec3(0.93, 0.97, 1.06), 0.35 * step(0.5, uPalette));
  c = mix(c, c * 0.2, edge);
  gl_FragColor = vec4(c, 1.0);
}`;
// DEPOT area wash (Task 3) alpha ramp — module-level and exported so
// depot-test.mjs can pin the curve with a cheap DOM-free unit check
// instead of a pixel/screenshot assert: 0 at the seam threshold (0.15,
// matching fogStateFor/holderAt), linear up to 0.20 at |v|=1.0 (doubled from
// the original 0.10 per playtest feedback — the wash read as too faint to
// tell held ground apart from unheld at a glance).
export const WASH_SEAM = 0.15, WASH_MAX_A = 0.20;
export function washAlpha(v) {
  const av = v < 0 ? -v : v;
  if (av <= WASH_SEAM) return 0;
  const t = (av - WASH_SEAM) / (1 - WASH_SEAM);
  return (t > 1 ? 1 : t) * WASH_MAX_A;
}
// P7 T10: MINES AND TRIPWIRES — invisible always to the other side (owner's
// law). The list-builder R.setMines(list) mirrors: only team-1 LIVE devices
// are ever drawn — the enemy's are never in the list, minefields are learned
// by loss like the real war. Pure and exported so that law is directly
// testable without a THREE/WebGL context (P7 T10 plan Step 1(g)).
export function minesToDraw(list) {
  return (list || []).filter((m) => m.team === 1 && m.live);
}
export function makeRenderer(canvas, world0, opts = {}) {
  let world = world0;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: "high-performance" });
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.BasicShadowMap;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xc4d2e0);
  scene.fog = new THREE.Fog(0xc4d2e0, 95, 230);
  const NORM_BG = new THREE.Color(0x8080ff);
  // camera: fixed RA orientation; only position moves (texel-snapped).
  // "tactical" (tower defense): 34° pitch + a wider frustum band + deeper
  // zoom range — same rig otherwise, so the texel-snap path is untouched.
  const tac = opts.camera === "tactical";
  const cam = new THREE.OrthographicCamera(-40, 40, 25, -25, 2, 400);
  const pitchA = ((tac ? 34 : 32) * Math.PI) / 180, camDist = 150;
  // yaw is STATE now (tactical mode rotates in 90° steps); the basis
  // vectors mutate IN PLACE so every closure that captured them — texel
  // snap, billboards, picking, drag-pan — follows the turn for free
  let yawA = (194 * Math.PI) / 180, yawTgt = yawA;
  const back = { x: 0, y: 0, z: 0 };
  const camQ = new THREE.Quaternion();
  const camFwd = { x: 0, y: 0, z: 0 };
  const camRight = new THREE.Vector3();
  const camUp = new THREE.Vector3();
  function applyYaw() {
    back.x = Math.sin(yawA) * Math.cos(pitchA); back.y = Math.sin(pitchA); back.z = Math.cos(yawA) * Math.cos(pitchA);
    cam.position.set(back.x * camDist, back.y * camDist, back.z * camDist);
    cam.up.set(0, 1, 0);
    cam.lookAt(0, 0, 0);
    cam.updateMatrixWorld();
    camQ.copy(cam.quaternion);
    camFwd.x = -back.x; camFwd.y = -back.y; camFwd.z = -back.z;
    camRight.set(1, 0, 0).applyQuaternion(camQ);
    camUp.set(0, 1, 0).applyQuaternion(camQ);
  }
  applyYaw();
  // 90° step: eased tween; texel snap suspends while turning (rotZoom in
  // render()) so the shimmer never shows
  function rotateStep(dir) { yawTgt += (dir > 0 ? 1 : -1) * Math.PI / 2; }
  // P7.1 T1: continuous rotation — small increments stream in from a held
  // key or a two-finger twist. Only yawTgt moves: the existing tween chases
  // it, so smoothing and the mid-turn texel-snap suspension come for free.
  function rotateBy(d) { yawTgt += d; }
  const R3 = (v) => ({ x: v.x, y: v.y, z: v.z });
  // lights
  const hemi = new THREE.HemisphereLight(0xe2ecf7, 0x7e8fa3, 0.62);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff0da, 0.92);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -60; sun.shadow.camera.right = 60;
  sun.shadow.camera.top = 60; sun.shadow.camera.bottom = -60;
  sun.shadow.camera.near = 5; sun.shadow.camera.far = 220;
  sun.shadow.bias = -0.002;
  scene.add(sun); scene.add(sun.target);
  // terrain
  const F = world.field;
  const Wd = (F.n - 1) * F.cs;
  const terraGeo = new THREE.PlaneGeometry(Wd, Wd, F.n - 1, F.n - 1);
  terraGeo.rotateX(-Math.PI / 2);
  const splat = makeSplat(opts.town !== false, opts.rim ? Wd : null); // default keeps the demo/sandbox ground art
  // SCORCH DECALS LIGHTEN OVER TIME (DEPOT-only, opts.fadeDecals gated —
  // TD/campaign/demo never set it, so their splat stays byte-identical):
  // every FADE_EVERY seconds, re-blend the clean base over the whole canvas
  // at FADE_ALPHA. Batched on world.t, not per frame — a couple of minutes
  // of light passes greys out old battle staining while fresh hits (painted
  // at full alpha in consume()) still read as the newest damage.
  const FADE_EVERY = 4, FADE_ALPHA = 0.03;
  let nextFadeT = FADE_EVERY;
  if (opts.fadeDecals) splat.armFade();
  const terraMat = toon(0xffffff); terraMat.map = splat.tex;
  const terra = new THREE.Mesh(terraGeo, terraMat);
  terra.receiveShadow = true;
  scene.add(terra);
  // THE WORLD ENDS at the playfield rim (DEPOT-only, opts.rim gated — TD,
  // campaign and demo pass no rim and render byte-identical): collapse every
  // vertex outside the rim box onto its boundary in x/z. The overhung strip
  // degenerates to zero area, so ground, grid AND any splat decal painted
  // out there simply has no geometry left to show it — a hard edge instead
  // of a shelf trailing into the fog. Static, one-time pass on plane build.
  if (opts.rim) {
    const { halfU, halfV, toCanonical, toWorld } = opts.rim;
    const pa = terraGeo.attributes.position;
    for (let k = 0; k < pa.count; k++) {
      const x = pa.getX(k), z = pa.getZ(k);
      const c = toCanonical(x, z);
      const cu = Math.max(-halfU, Math.min(halfU, c.u));
      const cv = Math.max(-halfV, Math.min(halfV, c.v));
      if (cu !== c.u || cv !== c.v) {
        const w = toWorld(cu, cv);
        pa.setX(k, w.x); pa.setZ(k, w.z);
      }
    }
    pa.needsUpdate = true;
  }
  // DEPOT-only fog terrain wash: a snapshot of syncTerrain's slope-shaded
  // color, taken fresh every time the terrain rebuilds, so the 4Hz fog pass
  // (updateFogWash below) always blends FROM the true relief shade rather
  // than from a color that already carries a previous tick's wash — no
  // cumulative drift as a cell's held/seam/unheld state flips back and forth.
  let terrBaseColor = null;
  function syncTerrain() {
    const pa = terraGeo.attributes.position;
    for (let j = 0; j < F.n; j++) for (let i = 0; i < F.n; i++) pa.setY(j * F.n + i, F.h[j * F.n + i]);
    pa.needsUpdate = true;
    terraGeo.computeVertexNormals();
    // relief shading: the toon band collapses every slope under ~24° into the
    // same white, so hills and the pond bowl were physically there yet
    // invisible. Bake slope into vertex colors (steeper = darker), with a
    // cool tint below the waterline so the basin reads as a basin.
    let ca = terraGeo.attributes.color;
    if (!ca) {
      terraGeo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(F.n * F.n * 3), 3));
      ca = terraGeo.attributes.color;
      terraMat.vertexColors = true; terraMat.needsUpdate = true;
    }
    for (let j = 0; j < F.n; j++) for (let i = 0; i < F.n; i++) {
      const k = j * F.n + i;
      const iw = i > 0 ? k - 1 : k, ie = i < F.n - 1 ? k + 1 : k;
      const jn = j > 0 ? k - F.n : k, js = j < F.n - 1 ? k + F.n : k;
      const g = Math.hypot(F.h[ie] - F.h[iw], F.h[js] - F.h[jn]) / (2 * F.cs);
      const shade = 1 - Math.min(0.3, g * 0.62);
      const wet = F.h[k] < POOL.level - 0.15;
      ca.setXYZ(k, shade * (wet ? 0.84 : 1), shade * (wet ? 0.9 : 1), shade * (wet ? 0.98 : 1));
    }
    ca.needsUpdate = true;
    F.dirty = false;
    if (opts.territory) {
      if (!terrBaseColor || terrBaseColor.length !== ca.array.length) terrBaseColor = new Float32Array(ca.array.length);
      terrBaseColor.set(ca.array);
    }
  }
  // DEPOT-only: unheld ground reads colder/desaturated — a slow blue-grey
  // wash toward the base relief shade, blended per vertex from terrBaseColor
  // (never compounding). Full strength unheld, half strength at the seam,
  // untouched when held. Called at the territory field's ~4Hz tick, same
  // cadence as retintTerritory — never per frame (F.n*F.n ~14.6k vertices is
  // cheap at 4Hz, not at 60).
  const FOG_COLD = { r: 0.62, g: 0.72, b: 0.86 };
  // DEPOT-only area wash (Task 3): held ground gets a low-opacity color wash
  // — green for the player's side, red (scoutRed family) mirrored for the
  // enemy's. Layering, cheapest-first: (1) base relief shade, (2) area wash
  // blended in, (3) fog desaturation composed ON TOP of the washed color —
  // so held ground washes green but unheld/seam ground's blue-grey fog cast
  // rides over whatever red wash it carries (wash reads faintly through fog,
  // by design — see brief). The grid-line tint (splat canvas, retintTerritory)
  // is a separate texture layer that multiplies over all of this, unaffected
  // by wash/fog ordering. alpha ramps linearly 0 at |v|=0.15 (the same seam
  // threshold as fogStateFor/holderAt) to 0.10 at |v|=1.0 — same per-vertex
  // loop as the fog pass, so Pi frame cost is unchanged (a handful of extra
  // multiplies at ~4Hz over F.n*F.n vertices, not per-frame).
  const WASH_GREEN = { r: 0.35, g: 0.85, b: 0.35 };
  const WASH_RED = { r: 0.85, g: 0.30, b: 0.28 };
  // BUILDABLE-EDGE LINE (playtest item 3): a crisp, full-opacity contour
  // right where holderAt/sampleVal crosses the WASH_SEAM threshold on the
  // PLAYER's sign (v > WASH_SEAM) — i.e. the actual build-rights boundary,
  // not the fog seam band (which is a soft f=0.24 tint, not a hard line).
  // Phase 5 Task 5: the Phase 4.1 version painted this into the terrain
  // VERTEX COLORS, so its minimum width was one grid cell — a ground-space
  // band that got fatter on screen the further you zoomed in (Jeff: too
  // thick). Now it is an OVERLAY-PASS stroke: a marching-squares contour
  // (linear-interpolated at v = WASH_SEAM, so it is smooth, not staircased)
  // built from the same vals[] grid, drawn as THREE.LineSegments on layer 1
  // in the color pass. WebGL lines rasterize exactly 1 RT pixel wide no
  // matter the projection, so the stroke is screen-constant at every zoom
  // and every Q/E rotation BY CONSTRUCTION — no zoom-inverse width math to
  // keep in sync with the frustum (which was the alternative, rejected
  // because the vertex-color band can never go below one cell and a quad
  // strip contour would need per-frame rebuild on zoom). A second
  // LineSegments sharing the same geometry, offset half an RT pixel
  // diagonally in camera space each frame, doubles the rasterized footprint
  // to ~1.5px at dpr 1 and keeps the hairline from drowning in the
  // dither/quantize post pass. Geometry rebuilds at the territory tick
  // (~4Hz), never per frame; DEPOT-gated (created lazily inside
  // updateFogWash, which bails without opts.territory).
  const EDGE_GREEN = { r: 0.42, g: 1.0, b: 0.34 };
  let edgeLineA = null, edgeLineB = null;
  function rebuildEdgeContour(vals, pa, N) {
    if (!edgeLineA) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(0), 3));
      const mat = new THREE.LineBasicMaterial({ color: new THREE.Color(EDGE_GREEN.r, EDGE_GREEN.g, EDGE_GREEN.b) });
      edgeLineA = new THREE.LineSegments(geo, mat);
      edgeLineB = new THREE.LineSegments(geo, mat); // same geometry, screen-space-offset in render()
      for (const m of [edgeLineA, edgeLineB]) { m.layers.set(1); m.frustumCulled = false; scene.add(m); }
    }
    const TH = WASH_SEAM, out = [];
    const LIFT = 0.16; // same ground clearance as the placement-preview edge loop
    // crossing point on the grid edge between vertices ka/kb, lifted to terrain
    const cross = (ka, kb) => {
      const da = vals[ka] - TH, db = vals[kb] - TH;
      let t = da / (da - db);
      if (!(t >= 0 && t <= 1)) t = 0.5;
      out.push(
        pa.getX(ka) + (pa.getX(kb) - pa.getX(ka)) * t,
        pa.getY(ka) + (pa.getY(kb) - pa.getY(ka)) * t + LIFT,
        pa.getZ(ka) + (pa.getZ(kb) - pa.getZ(ka)) * t);
    };
    const pts = [];
    for (let j = 0; j < N - 1; j++) for (let i = 0; i < N - 1; i++) {
      const k00 = j * N + i, k10 = k00 + 1, k01 = k00 + N, k11 = k01 + 1;
      const g00 = vals[k00] > TH, g10 = vals[k10] > TH, g01 = vals[k01] > TH, g11 = vals[k11] > TH;
      if (g00 === g10 && g00 === g01 && g00 === g11) continue;
      pts.length = 0;
      if (g00 !== g10) pts.push([k00, k10]);
      if (g10 !== g11) pts.push([k10, k11]);
      if (g01 !== g11) pts.push([k01, k11]);
      if (g00 !== g01) pts.push([k00, k01]);
      // 2 crossings -> one segment; 4 (saddle) -> two, paired as listed
      for (let p = 0; p + 1 < pts.length; p += 2) { cross(pts[p][0], pts[p][1]); cross(pts[p + 1][0], pts[p + 1][1]); }
    }
    const geo = edgeLineA.geometry;
    if (geo.attributes.position.array.length < out.length) {
      geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(Math.ceil(out.length * 1.5)), 3));
    }
    geo.attributes.position.array.set(out);
    geo.attributes.position.needsUpdate = true;
    geo.setDrawRange(0, out.length / 3);
  }
  function updateFogWash(sample, sampleVal) {
    if (!opts.territory || !terrBaseColor) return;
    const ca = terraGeo.attributes.color;
    const pa = terraGeo.attributes.position;
    const N = F.n;
    // pass 1: per-vertex value cache (avoids re-sampling neighbors twice)
    const vals = updateFogWash._vals && updateFogWash._vals.length === N * N ? updateFogWash._vals : (updateFogWash._vals = new Float32Array(N * N));
    if (sampleVal) {
      for (let k = 0; k < N * N; k++) { const wx = pa.getX(k), wz = pa.getZ(k); vals[k] = sampleVal(wx, wz); }
    } else vals.fill(0);
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const k = j * N + i;
      const wx = pa.getX(k), wz = pa.getZ(k);
      const st = sample(wx, wz);
      const f = st === "unheld" ? 0.55 : st === "seam" ? 0.24 : 0;
      const v = vals[k];
      const wa = v ? washAlpha(v) : 0;
      const bi = k * 3;
      let br, bg, bb;
      if (f === 0 && wa === 0) { br = terrBaseColor[bi]; bg = terrBaseColor[bi + 1]; bb = terrBaseColor[bi + 2]; }
      else {
        br = terrBaseColor[bi]; bg = terrBaseColor[bi + 1]; bb = terrBaseColor[bi + 2];
        if (wa > 0) {
          const wc = v > 0 ? WASH_GREEN : WASH_RED;
          br = br * (1 - wa) + wc.r * wa;
          bg = bg * (1 - wa) + wc.g * wa;
          bb = bb * (1 - wa) + wc.b * wa;
        }
        if (f !== 0) {
          br = br * (1 - f) + FOG_COLD.r * br * f;
          bg = bg * (1 - f) + FOG_COLD.g * bg * f;
          bb = bb * (1 - f) + FOG_COLD.b * bb * f;
        }
      }
      ca.array[bi] = br; ca.array[bi + 1] = bg; ca.array[bi + 2] = bb;
    }
    ca.needsUpdate = true;
    rebuildEdgeContour(vals, pa, N);
  }
  syncTerrain();
  // water
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(POOL.x1 - POOL.x0, POOL.z1 - POOL.z0),
    new THREE.MeshBasicMaterial({ color: 0x2b4a5c, transparent: true, opacity: 0.82 })
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set((POOL.x0 + POOL.x1) / 2, POOL.level, (POOL.z0 + POOL.z1) / 2);
  water.layers.set(1);
  scene.add(water);
  // reticle
  const reticle = new THREE.Mesh(new THREE.RingGeometry(0.7, 1.05, 20), new THREE.MeshBasicMaterial({ color: 0xff6b5e, transparent: true, opacity: 1.0, depthWrite: false }));
  reticle.rotation.x = -Math.PI / 2; reticle.layers.set(1);
  scene.add(reticle);
  // DIVERGENCE from the frozen demo: trajectory preview — a sampled arc
  // from muzzle to reticle, fed by the game layer via setTraj(points, hitIdx).
  // Segments past the first obstruction dim; the obstruction gets a marker.
  const TRAJ_N = 48;
  // The arc draws as instanced pips, not a THREE.Line: WebGL lines rasterize
  // one pixel wide and the dither/quantize post pass swallows them on snow.
  // Pips are sized in world meters like every other sprite — amber to the
  // obstruction, smaller grey past it, red ring on the hit.
  const trajMesh = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.2, 0.2, 0.2),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, depthWrite: false }),
    TRAJ_N);
  trajMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  trajMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(TRAJ_N * 3).fill(1), 3);
  trajMesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
  trajMesh.count = 0; trajMesh.layers.set(1); trajMesh.frustumCulled = false;
  scene.add(trajMesh);
  const TRAJ_AMBER = new THREE.Color(0xd98a2b), TRAJ_GREY = new THREE.Color(0x707a86);
  const _trajO = new THREE.Object3D();
  const trajHit = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.85, 16), new THREE.MeshBasicMaterial({ color: 0xff6b5e, transparent: true, opacity: 0.9, depthWrite: false }));
  trajHit.layers.set(1); trajHit.visible = false;
  scene.add(trajHit);
  function setTraj(points, hitIdx) {
    if (!points || points.length < 2) { trajMesh.count = 0; trajHit.visible = false; return; }
    let n = 0;
    for (let i = 0; i < points.length && n < TRAJ_N; i += 2) {
      const p = points[i];
      const past = hitIdx != null && i > hitIdx;
      _trajO.position.set(p.x, p.y, p.z);
      _trajO.scale.setScalar(past ? 0.55 : 1);
      _trajO.updateMatrix();
      trajMesh.setMatrixAt(n, _trajO.matrix);
      if (trajMesh.setColorAt) trajMesh.setColorAt(n, past ? TRAJ_GREY : TRAJ_AMBER);
      n++;
    }
    trajMesh.count = n;
    trajMesh.instanceMatrix.needsUpdate = true;
    if (trajMesh.instanceColor) trajMesh.instanceColor.needsUpdate = true;
    if (hitIdx != null && hitIdx < points.length) {
      const h = points[hitIdx];
      trajHit.position.set(h.x, h.y + 0.15, h.z); trajHit.rotation.x = -Math.PI / 2; trajHit.visible = true;
    } else trajHit.visible = false;
  }
  // volley strike marker: pulses at the painted point while the rockets fall
  const strikeRing = new THREE.Mesh(new THREE.RingGeometry(1.6, 2.1, 24), new THREE.MeshBasicMaterial({ color: 0xffa24a, transparent: true, opacity: 0, depthWrite: false }));
  strikeRing.rotation.x = -Math.PI / 2; strikeRing.layers.set(1); strikeRing.visible = false;
  scene.add(strikeRing);
  // mk2.12: the shockwave ring — born at the davy's burst, out past the
  // blast radius in under a second, gone.
  const davyRing = new THREE.Mesh(new THREE.RingGeometry(0.92, 1.0, 64), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
  davyRing.rotation.x = -Math.PI / 2; davyRing.layers.set(1); davyRing.visible = false;
  scene.add(davyRing);
  // trial focus marker: pulsing gold ring at the current objective
  let treadAcc = 0;
  // vehicles (individual groups by body id)
  const vehMap = new Map();
  function buildTruck() {
    const g = new THREE.Group();
    const bed = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.0, 3.4), toon(0x4c5a49));
    bed.position.set(0, 0.15, -0.7); bed.castShadow = true; g.add(bed);
    const canvasTop = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.8, 3.2), toon(0x6b7565));
    canvasTop.position.set(0, 0.95, -0.7); canvasTop.castShadow = true; g.add(canvasTop);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.15, 1.5), toon(0x3f4c3e));
    cab.position.set(0, 0.2, 1.75); cab.castShadow = true; g.add(cab);
    for (const wz of [-1.6, 1.3]) for (const sx of [-1, 1]) {
      const wheel = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.75, 0.75), toon(0x15181c));
      wheel.position.set(sx * 1.05, -0.6, wz); g.add(wheel);
    }
    return g;
  }
  function buildScout() {
    const g = new THREE.Group();
    const hull = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.4, 3.7), toon(PAL.scoutRed));
    hull.castShadow = true; hull.receiveShadow = true; g.add(hull); g.userData.hull = hull;
    const top = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.6, 1.4), toon(0x6f3b36)); top.position.y = 1.0; top.castShadow = true; g.add(top); g.userData.top = top;
    return g;
  }
  // instanced pools
  const dummy = new THREE.Object3D();
  function pool(geo, mat, n, shadow) {
    const m = new THREE.InstancedMesh(geo, mat, n);
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    // instanceColor must exist BEFORE the first compile: USE_INSTANCING_COLOR is a
    // compile-time program key (WebGLPrograms: object.instanceColor !== null), and a
    // count-0 pool that compiles early locks the define out forever — setColorAt
    // then writes into a buffer no shader reads. Born white = identity multiply.
    m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(n * 3).fill(1), 3);
    m.instanceColor.setUsage(THREE.DynamicDrawUsage);
    m.count = 0; if (shadow) m.castShadow = true;
    scene.add(m);
    return m;
  }
  // table-driven infantry pools from the INFANTRY dress spec (one pool per part)
  const buildInfPools = (spec, n, pal) => spec.map((p) => {
    let g;
    if (p.cyl) { g = new THREE.CylinderGeometry(p.cyl[0], p.cyl[1], p.cyl[2], p.cyl[3], 1); if (p.rotY) g.rotateY(p.rotY); }
    else g = new THREE.BoxGeometry(p.box[0], p.box[1], p.box[2]);
    if (p.ty) g.translate(0, p.ty, 0);
    if (p.preRot) { g.rotateX(p.preRot[0]); g.rotateY(p.preRot[1]); g.rotateZ(p.preRot[2]); }
    // material stays WHITE: instanceColor MULTIPLIES material color in the shader,
    // so painting both squares the palette (rust^2 = brick, slate^2 = black — the
    // "pencil sketch soldiers" bug). instanceColor is the single source of color.
    const m = pool(g, toon(0xffffff), n, true);
    if (p.key === "coat" || p.key === "chest") m.receiveShadow = true;
    return m;
  });
  const conPools = buildInfPools(INFANTRY.con, 96, INFANTRY.pal.con);
  const grenPools = buildInfPools(INFANTRY.gren, 24, INFANTRY.pal.gren);
  const INF_LIVE = { con: {}, gren: {} }, INF_DEAD = { con: {}, gren: {} };
  for (const t of ["con", "gren"]) for (const k in INFANTRY.pal[t]) { INF_LIVE[t][k] = new THREE.Color(INFANTRY.pal[t][k]); INF_DEAD[t][k] = new THREE.Color(INFANTRY.dead[t][k]); }
  // DIVERGENCE from the demo: android dress. A campaign unit tagged
  // b.dress === "android" wears whitish silver over the same part table —
  // porcelain face, pale shell, dark steel weapon. Dead androids drop to
  // spent gunmetal instead of the winter-kill browns. Untagged units
  // (demo parity, sandbox) keep the con/gren palettes exactly.
  const mkPal = (o) => { const p = {}; for (const k in o) p[k] = new THREE.Color(o[k]); return p; };
  const AND_LIVE = mkPal({ dom: 0xdde3ea, sec: 0x9aa6b2, acc: 0xc0cbd6, skin: 0xeef2f6, gun: 0x2a2e34 });
  const AND_DEAD = mkPal({ dom: 0x6d747c, sec: 0x474d54, acc: 0x596069, skin: 0x8b929a, gun: 0x14171a });
  // P7.2 T6 (owner): the medic's whites — MEDIC_HEX over the con palette
  // (skin inherits), and a winter-kill grey of the same dress for the dead.
  const MED_LIVE = mkPal({ ...INFANTRY.pal.con, ...MEDIC_HEX });
  const MED_DEAD = mkPal({ ...INFANTRY.dead.con, dom: 0x8f9498, sec: 0x7d8286, acc: 0x6e3531, gun: 0x101214 });
  // mk2.12: the atomic crew's orange — DAVY_HEX over the con palette, and a
  // scorched grey-orange for the dead.
  const DAVY_LIVE = mkPal({ ...INFANTRY.pal.con, ...DAVY_HEX });
  const DAVY_DEAD = mkPal({ ...INFANTRY.dead.con, dom: 0x7a4a20, sec: 0x5c3816, acc: 0x8a7430, gun: 0x101214 });
  // DIVERGENCE (guarded, mk0.99): HIT FEEDBACK palette — a struck man flashes
  // toward this red for 0.18s (see hurtK below).
  const HIT_C = new THREE.Color(0xff5230), _hitC = new THREE.Color();
  const _swq = new THREE.Quaternion(), _bq = new THREE.Quaternion(), _AXX = new THREE.Vector3(1, 0, 0);
  // ---- mk0.23 troop identity (DEPOT-gated, see src/render/troopkit.js) ----
  // The barrel quaternion: the rifle's preRot baked as Rz*Ry*Rx (exactly the
  // order buildInfPools applies it to the geometry), so a prop marked
  // aim:"barrel" rides the real barrel axis instead of an eyeballed tilt.
  const _rifleSpec = INFANTRY.con.find((p) => p.key === "rifle");
  const _pr = (_rifleSpec && _rifleSpec.preRot) || RIFLE_PREROT;
  const RIFLE_Q = new THREE.Quaternion();
  {
    const qa = new THREE.Quaternion(), qb = new THREE.Quaternion();
    RIFLE_Q.setFromAxisAngle(new THREE.Vector3(0, 0, 1), _pr[2]);
    qa.setFromAxisAngle(new THREE.Vector3(0, 1, 0), _pr[1]);
    qb.setFromAxisAngle(_AXX, _pr[0]);
    RIFLE_Q.multiply(qa).multiply(qb);
  }
  const PROP_KEYS = { prop: 0, prop2: 1, prop3: 2 };
  const _TILT_AX = [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1)];
  const chunkGeo = new THREE.BoxGeometry(1.2, 1.2, 1.2);
  // CHUNK_CAP (Jeff, 2026-08-11): the draw cap and the pool are ONE constant,
  // doubled from the old 1000 cap after FRONT F1's enemy depot pushed boot
  // chunks to 1154 and silently un-drew sandbags + 154 town stones (the loop
  // guard and this allocation had drifted apart). If the map ever exceeds
  // this again, the on-screen stones counter (DepotGame HUD) shows it
  // saturating — that readout is the alarm.
  // T4 (mk1.03, owner's ruling): 2000 -> 3000. The proving-grounds forms
  // (2-4 big buildings, columns in the wide templates, field walls) push a
  // dense seed's boot stones past the old pool. The Pi collapse capture is
  // the judge of the raised cap; the stones counter stays the alarm.
  // Settled Ground T1 (mk2.61, owner 2026-08-26): 3000 -> 4000 beside
  // TOWN_STONE_CAP 3000 (mapgen.js) — physics sleeps boot stones, the pool
  // is a draw limit. Provisional until the Pi collapse capture; the stones
  // counter stays the alarm.
  // mk2.65 (owner): the crowded valley — 6000 town + depots + rubble headroom.
  const CHUNK_CAP = 7000;
  let chunkStats = { drawn: 0, cap: CHUNK_CAP, total: 0 };
  const chunkMesh = pool(chunkGeo, toon(0xa6b2c0), CHUNK_CAP, true);
  chunkMesh.receiveShadow = true;
  // mk2.66 (owner): THE TWO TINTS — slate roofs, dark timber. Per-instance
  // color on the one chunk pool; wall stones stay the material's own gray.
  const CHUNK_WALL_C = new THREE.Color(0xffffff), CHUNK_ROOF_C = new THREE.Color(0x5a626e), CHUNK_TIMBER_C = new THREE.Color(0x33291f);
  // mech walker links: plain instanced steel boxes (rig art comes later)
  const mechMesh = pool(new THREE.BoxGeometry(1, 1, 1), toon(0xffffff), 96, true);
  mechMesh.receiveShadow = true;
  const MECH_HULL_C = new THREE.Color(0x5f6e80), MECH_LINK_C = new THREE.Color(0x434c58), MECH_FOOT_C = new THREE.Color(0x2f353d);
  const POD_LOCK_C = new THREE.Color(0x6b3226); // rust-red while the rack holds a live lock
  const _podQ = new THREE.Quaternion(), _podUp = new THREE.Vector3();
  // thruster plumes: tapered additive CONES, hot white core inside an
  // amber sheath, base at the bell and tip trailing down the exhaust
  const plumeMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false });
  const plumeMesh = pool(new THREE.ConeGeometry(0.5, 1, 8), plumeMat, 20, false);
  const PLUME_CORE = new THREE.Color(1.0, 0.98, 0.9), PLUME_SHEATH = new THREE.Color(1.0, 0.62, 0.22), PLUME_SNOW = new THREE.Color(0.85, 0.92, 1.0);
  // snow spray: solid little tumbling chips thrown off the blast point
  const snowMat = new THREE.MeshBasicMaterial({ color: 0xf4f8ff, transparent: true, opacity: 0.9 });
  const snowMesh = pool(new THREE.BoxGeometry(0.22, 0.22, 0.22), snowMat, 24, false);
  const _plQ = new THREE.Quaternion(), _plUp = new THREE.Vector3(0, 1, 0), _plDir = new THREE.Vector3();
  const iceMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.66, depthWrite: true });
  const _iceC = new THREE.Color();
  const _iceR = new Float32Array(80); // display envelope: fast attack, slow decay
  const iceMesh = pool(new THREE.BoxGeometry(1, 1, 1), iceMat, 80, false); // 8x8 sheet = 64 plates (the old 20 silently truncated)
  iceMesh.receiveShadow = false;
  const wreckTint = new THREE.Color(0x3c4046);
  const debrisMesh = pool(new THREE.BoxGeometry(0.18, 0.18, 0.18), toon(0x6a6f76), 200, false);
  // mk2.13 (owner): THE WHITE CLOUD — the material goes white and every
  // instance paints itself (instance color multiplies material color, the
  // infantry pools' rule). Battle smoke keeps the old dark grey; the
  // mushroom cloud's drift particles wear white. // provisional (F5)
  const smokeMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, depthWrite: false });
  const SMOKE_GREY = new THREE.Color(0x2c3036), SMOKE_WHITE = new THREE.Color(0xf2f4f6);
  // mk2.12: SMOKE_CAP — 128 carried every battle until the mushroom cloud
  // needed a sky's worth. One constant, every guard reads it.
  const SMOKE_CAP = 384;
  const smokeMesh = pool(new THREE.PlaneGeometry(1, 1), smokeMat, SMOKE_CAP, true); smokeMesh.layers.set(1);
  const fireMat = new THREE.MeshBasicMaterial({ color: 0xffb257, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false });
  const fireMesh = pool(new THREE.PlaneGeometry(1, 1), fireMat, 96, false); fireMesh.layers.set(1);
  // NORMAL blending: additive ADDED the hue to bright snow and every round
  // read white. Solid saturated bodies keep their color on any ground, and
  // a near-black halo box under each round buys contrast that survives
  // zoom-out — legibility comes from darkness, not brightness.
  const tracerMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.98, depthWrite: false }); // white base: per-instance colors carry the hue
  const tracerMesh = pool(new THREE.BoxGeometry(0.09, 0.09, 1), tracerMat, 64, false); tracerMesh.layers.set(1);
  const haloMat = new THREE.MeshBasicMaterial({ color: 0x140f16, transparent: true, opacity: 0.5, depthWrite: false });
  const haloMesh = pool(new THREE.BoxGeometry(0.16, 0.16, 1.15), haloMat, 64, false); haloMesh.layers.set(1);
  tracerMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(64 * 3).fill(1), 3);
  tracerMesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
  // snow washes out pale amber — munitions burn ORANGE-RED, tracers gold
  const TRC_MG = new THREE.Color(0xff5230), TRC_SHELL = new THREE.Color(0xff8c24), TRC_BRIGHT = new THREE.Color(0xffd94f);
  // DIVERGENCE from the demo: rockets get their own pool with NORMAL blending
  // (additive washes to white over snow) — orange on the climb, red on the
  // dive, so a volley reads as six burning things coming down
  const rocketMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.98, depthWrite: false });
  const rocketMesh = pool(new THREE.BoxGeometry(0.09, 0.09, 1), rocketMat, 16, false); rocketMesh.layers.set(1);
  const RKT_ORANGE = new THREE.Color(0xff8a2e), RKT_RED = new THREE.Color(0xff3b26);
  const blobMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.34, depthWrite: false });
  const blobMesh = pool(new THREE.CircleGeometry(1, 12), blobMat, 96, false); blobMesh.layers.set(1);
  // survey stakes: the flagged work site. world.trialFocus was set by both
  // runners but nothing ever drew it (the demo's "pulsing gold ring" comment
  // is an orphan) — six timber stakes with gold pennants now ring the
  // acceptance radius. Drawn only when the focus declares a radius, so the
  // sandbox's point-focus trials are untouched.
  const stakeMesh = pool(new THREE.BoxGeometry(0.09, 1.4, 0.09), toon(0x4a4038), 8, true);
  const pennantGeo = new THREE.BoxGeometry(0.64, 0.28, 0.05); pennantGeo.translate(0.36, 0, 0);
  const pennantMesh = pool(pennantGeo, toon(0xffc95c), 8, false); // bright gold — the outline pass eats duller inks at pennant size
  const _stakeUp = new THREE.Vector3(0, 1, 0);

  // depot flags: pole + cloth at every body carrying b.flagPole === true.
  // Same instanced-pennant trick as the survey stakes above, scaled up and
  // driven by world.wind instead of a fixed flutter — heading tracks
  // atan2(wind.z, wind.x), ripple amplitude/stiffness track wind.mag. No
  // world.wind means no flags drawn (TD/campaign/demo untouched).
  // mk2.54: 96 -> 192 — towers share this pool with town flags; a late war's tower count starved the town of its flags
  const flagPoleMesh = pool(new THREE.BoxGeometry(0.1, 2.6, 0.1), toon(0x4a4038), 192, true);
  const flagClothGeo = new THREE.BoxGeometry(1.0, 0.6, 0.04); flagClothGeo.translate(0.52, 0, 0);
  const flagClothMesh = pool(flagClothGeo, toon(0xffc95c), 192, false);
  const _flagUp = new THREE.Vector3(0, 1, 0);
  const _flagQ1 = new THREE.Quaternion(), _flagQ2 = new THREE.Quaternion();
  // FRONT F1: cloth tint keys on the flag body's team. instanceColor
  // MULTIPLIES the gold material color, so the enemy multiplier is chosen so
  // gold(0xffc95c) * mult == the enemy scarlet family (PAL.scoutRed 0x8a4a44)
  // exactly, component-wise. Team 1/undefined stays identity white (gold).
  // DEPOT-gated by the existing world.wind gate above — no-wind (TD/campaign/
  // demo) renders never draw flags at all, byte-identical.
  const _flagGold = new THREE.Color(0xffc95c);
  const _flagScarlet = new THREE.Color(0x8a4a44);
  const _flagEnemyMult = new THREE.Color(
    _flagScarlet.r / _flagGold.r, _flagScarlet.g / _flagGold.g, _flagScarlet.b / _flagGold.b);
  const _flagWhite = new THREE.Color(1, 1, 1);

  // lens glint (DEPOT pair, 6.5 Task 6): a small additive flash at a holding
  // spotter's eyes — BOTH SIDES (it is also how the player spots the enemy's
  // pair once it's out of the fog). world.t-driven phase keyed off the body's
  // own position: deterministic, no rng. Drawn only for fully-visible units
  // in DEPOT (world.depotCombat) — fog seam silhouettes stay generic.
  const glintMat = new THREE.MeshBasicMaterial({ color: 0xfff6c8, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
  const glintMesh = pool(new THREE.PlaneGeometry(1, 1), glintMat, 8, false); glintMesh.layers.set(1);

  // P7.1 T3: HEALTH BARS — a dark plate and a green-to-red fill over any
  // hurt body that carries maxHp. DEPOT only (world.depotCombat) and
  // toggleable (setHealth) — every other mode draws these pools at count 0.
  // Left-anchored geometry: scaling x drains the fill from the right.
  const barBackGeo = new THREE.PlaneGeometry(1, 1); barBackGeo.translate(0.5, 0, 0);
  const barFillGeo = new THREE.PlaneGeometry(1, 1); barFillGeo.translate(0.5, 0, 0);
  const BAR_CAP = 256; // provisional (F5)
  const barBackMesh = pool(barBackGeo, new THREE.MeshBasicMaterial({ color: 0x10141a, transparent: true, opacity: 0.85, depthWrite: false }), BAR_CAP, false); barBackMesh.layers.set(1);
  const barFillMesh = pool(barFillGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95, depthWrite: false }), BAR_CAP, false); barFillMesh.layers.set(1);
  const BAR_HI = new THREE.Color(0x4aff8c), BAR_LO = new THREE.Color(0xff4433), _barC = new THREE.Color();
  let healthOn = true;
  function setHealth(v) { healthOn = !!v; }
  const _bars = [];
  const pushBar = (b, w, lift) => {
    if (!healthOn || !world.depotCombat) return;
    if (!b.maxHp || !b.alive || !(b.hp > 0) || b.hp >= b.maxHp) return;
    _bars.push({ b, w, lift });
  };

  // snowfall: instanced flakes drifting in a box around the camera focus
  const flakeMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, depthWrite: false });
  const flakeMesh = pool(new THREE.PlaneGeometry(0.14, 0.14), flakeMat, 220, false);
  flakeMesh.layers.set(1);
  const flakes = [];
  for (let i = 0; i < 220; i++) flakes.push({ x: (Math.random() - 0.5) * 64, y: Math.random() * 34, z: (Math.random() - 0.5) * 64, vy: 1.4 + Math.random() * 1.6, ph: Math.random() * 6.3 });

  // particles
  const debris = [], smoke = [], fire = [];
  // mk2.16: TESLA BOLTS. Each row is one live bolt (strike, hop, idle arc or
  // pond flash), REGENERATED EVERY FRAME from fresh Math.random midpoint
  // displacement — no two frames, no two strikes alike (owner). Renderer
  // dice are lawful; the sim never reads any of this.
  const bolts = [];
  const BOLT_SEGS = 14, BOLT_CAP = 48;
  function spawnBolt(ax, ay, az, bx, by, bz, life, amp) {
    if (bolts.length >= BOLT_CAP) bolts.shift();
    bolts.push({ ax, ay, az, bx, by, bz, life, age: 0, amp });
  }
  // Amendment 2: BOXES, NOT LINES. A GL line is one RT pixel and drowns in
  // the dither/quantize post pass (the edge-contour comment above documents
  // this exact failure); the tracer pools are the proven-visible idiom.
  // White core inside a fat saturated-blue halo — the blue is what reads
  // against snow. pool() adds to the scene and pre-fills instanceColor.
  const BOLT_SEG_CAP = 2048; // Amendment 3: fractal bolts run ~40 segments each
  const boltCoreMesh = pool(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95, depthWrite: false }), BOLT_SEG_CAP, false);
  const boltHaloMesh = pool(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0x2e9bff, transparent: true, opacity: 0.42, depthWrite: false }), BOLT_SEG_CAP, false);
  boltCoreMesh.layers.set(1); boltHaloMesh.layers.set(1);
  const boltFrom = new THREE.Vector3(), boltTo = new THREE.Vector3(), boltAxis = new THREE.Vector3(0, 0, 1), boltDir = new THREE.Vector3();
  function writeBolts(dt) {
    let bi = 0;
    const sMin = Math.max(1, 1.35 / zoom); // the tracer pass's screen floor
    const put = (x1, y1, z1, x2, y2, z2, th) => {
      if (bi >= BOLT_SEG_CAP) return;
      boltFrom.set(x1, y1, z1); boltTo.set(x2, y2, z2);
      const len = boltFrom.distanceTo(boltTo);
      if (len < 1e-4) return;
      boltDir.subVectors(boltTo, boltFrom).divideScalar(len);
      dummy.position.set((x1 + x2) / 2, (y1 + y2) / 2, (z1 + z2) / 2);
      dummy.quaternion.setFromUnitVectors(boltAxis, boltDir);
      dummy.scale.set(th, th, len);
      dummy.updateMatrix();
      boltCoreMesh.setMatrixAt(bi, dummy.matrix);
      dummy.scale.set(th * 2.4, th * 2.4, len);
      dummy.updateMatrix();
      boltHaloMesh.setMatrixAt(bi++, dummy.matrix);
    };
    for (let i = bolts.length - 1; i >= 0; i--) {
      const b = bolts[i];
      b.age += dt;
      if (b.age >= b.life) { bolts.splice(i, 1); continue; }
      const fade = 1 - b.age / b.life;
      const th = 0.34 * sMin * (0.55 + 0.45 * fade) * (0.8 + Math.random() * 0.4);
      // Amendment 3 (owner): FRACTAL GROWTH. Recursive midpoint splitting:
      // each level displaces the midpoint and may throw a fork that splits
      // again, thinner each generation. Fresh dice every frame — the bolt
      // crawls and crackles for its whole life.
      const grow = (x1, y1, z1, x2, y2, z2, amp, depth, w2) => {
        if (depth <= 0 || amp < 0.12) { put(x1, y1, z1, x2, y2, z2, w2); return; }
        const mx = (x1 + x2) / 2 + (Math.random() - 0.5) * amp;
        const my = (y1 + y2) / 2 + (Math.random() - 0.5) * amp * 0.6;
        const mz = (z1 + z2) / 2 + (Math.random() - 0.5) * amp;
        grow(x1, y1, z1, mx, my, mz, amp * 0.55, depth - 1, w2);
        grow(mx, my, mz, x2, y2, z2, amp * 0.55, depth - 1, w2);
        if (Math.random() < 0.45) {
          const fl = amp * (0.8 + Math.random());
          grow(mx, my, mz, mx + (Math.random() - 0.5) * fl * 2, my - fl * (0.2 + Math.random() * 0.9), mz + (Math.random() - 0.5) * fl * 2, amp * 0.5, depth - 2, w2 * 0.55);
        }
      };
      grow(b.ax, b.ay, b.az, b.bx, b.by, b.bz, b.amp * fade, 4, th);
    }
    boltCoreMesh.count = bi; boltCoreMesh.instanceMatrix.needsUpdate = true;
    boltHaloMesh.count = bi; boltHaloMesh.instanceMatrix.needsUpdate = true;
    boltCoreMesh.material.opacity = 0.55 + Math.random() * 0.4;
    boltHaloMesh.material.opacity = 0.3 + Math.random() * 0.22;
  }
  function spawnBoom(x, y, z, r) {
    for (let i = 0; i < 12; i++) {
      if (debris.length >= 200) break;
      const a = Math.random() * Math.PI * 2, up = 3 + Math.random() * 6;
      debris.push({ x, y: y + 0.3, z, vx: Math.cos(a) * (2 + Math.random() * 5), vy: up, vz: Math.sin(a) * (2 + Math.random() * 5), rot: Math.random() * 6, spin: (Math.random() - 0.5) * 10, life: 1.3 + Math.random() * 0.5 });
    }
    for (let i = 0; i < 9; i++) {
      if (smoke.length >= SMOKE_CAP) break;
      smoke.push({ x: x + (Math.random() - 0.5) * r * 0.5, y: y + 0.4, z: z + (Math.random() - 0.5) * r * 0.5, vy: 1.6 + Math.random() * 1.4, s: 0.8 + Math.random() * 0.9, life: 1.5 + Math.random() * 0.7, age: 0 });
    }
    for (let i = 0; i < 6; i++) {
      if (fire.length >= 96) break;
      fire.push({ x: x + (Math.random() - 0.5) * r * 0.4, y: y + 0.3 + Math.random() * 0.6, z: z + (Math.random() - 0.5) * r * 0.4, s: 0.7 + Math.random() * r * 0.35, life: 0.32, age: 0 });
    }
  }
  // spawnDemo: the satchel's signature (SIEGE FIX mk0.21). Roughly four times
  // a shell's debris, a smoke COLUMN (tall, slow, stacked up the y axis rather
  // than sprayed flat) and a fireball twice the radius — deliberately over
  // spawnBoom so a demolition never reads as a near miss. Pool caps are still
  // respected, so a busy frame degrades instead of stalling.
  function spawnDemo(x, y, z, r) {
    spawnBoom(x, y, z, r);                              // the base blast under it
    for (let i = 0; i < 34; i++) {
      if (debris.length >= 200) break;
      const a = Math.random() * Math.PI * 2, up = 7 + Math.random() * 11;
      debris.push({ x, y: y + 0.3, z, vx: Math.cos(a) * (3 + Math.random() * 10), vy: up, vz: Math.sin(a) * (3 + Math.random() * 10), rot: Math.random() * 6, spin: (Math.random() - 0.5) * 16, life: 1.8 + Math.random() * 1.2 });
    }
    for (let i = 0; i < 26; i++) {                      // the column: stacked, rising, slow
      if (smoke.length >= SMOKE_CAP) break;
      const t = i / 26;
      smoke.push({ x: x + (Math.random() - 0.5) * r * (0.5 + t), y: y + 0.4 + t * r * 1.6, z: z + (Math.random() - 0.5) * r * (0.5 + t), vy: 2.6 + Math.random() * 2.2, s: 1.4 + Math.random() * 1.6 + t * 1.2, life: 2.4 + Math.random() * 1.4, age: 0 });
    }
    for (let i = 0; i < 14; i++) {                      // the fireball
      if (fire.length >= 96) break;
      fire.push({ x: x + (Math.random() - 0.5) * r * 0.9, y: y + 0.3 + Math.random() * 1.6, z: z + (Math.random() - 0.5) * r * 0.9, s: 1.4 + Math.random() * r * 0.8, life: 0.5, age: 0 });
    }
  }
  // mk2.12 (owner): THE ATOMIC BLAST — the demolition column's idiom driven
  // to the sky. A stem climbs hard from the crater; the cap spawns high,
  // spreads wide, hangs (long life), and the smoke step below drifts every
  // `drift` particle with the wind until it thins to nothing. Fire floods
  // the base. Dials are the owner's, live. // provisional (F5)
  function spawnNuke(x, y, z) {
    spawnDemo(x, y, z, 8);
    for (let i = 0; i < 90; i++) {                     // the stem
      if (smoke.length >= SMOKE_CAP) break;
      const t = i / 90;
      smoke.push({ x: x + (Math.random() - 0.5) * (2 + t * 3), y: y + 0.5 + t * 20, z: z + (Math.random() - 0.5) * (2 + t * 3),
        vy: 2.2 + Math.random() * 1.2, s: 2.2 + Math.random() * 2 + t * 2, life: 12 + Math.random() * 6, age: 0, drift: true }); // mk2.13 (owner): half the climb, twice the life // provisional (F5)
    }
    for (let i = 0; i < 140; i++) {                    // the cap
      if (smoke.length >= SMOKE_CAP) break;
      const a = Math.random() * Math.PI * 2, rr = Math.pow(Math.random(), 0.5) * 11;
      smoke.push({ x: x + Math.cos(a) * rr, y: y + 20 + Math.random() * 5 - rr * 0.18, z: z + Math.sin(a) * rr,
        vy: 0.35 + Math.random() * 0.3, s: 3.5 + Math.random() * 3, life: 26 + Math.random() * 10, age: 0, drift: true }); // mk2.13 (owner): the cap hangs twice as long // provisional (F5)
    }
    for (let i = 0; i < 24; i++) {                     // the base fire
      if (fire.length >= 96) break;
      fire.push({ x: x + (Math.random() - 0.5) * 6, y: y + 0.4 + Math.random() * 3, z: z + (Math.random() - 0.5) * 6,
        s: 2 + Math.random() * 3, life: 0.8, age: 0 });
    }
  }
  function puff(x, y, z, n, col) {
    for (let i = 0; i < n; i++) {
      if (smoke.length >= SMOKE_CAP) break;
      smoke.push({ x: x + (Math.random() - 0.5) * 0.8, y, z: z + (Math.random() - 0.5) * 0.8, vy: 1.2, s: 0.5 + Math.random() * 0.5, life: 0.9, age: 0, col });
    }
  }
  // post pipeline
  const bayerTex = new THREE.DataTexture(new Uint8Array(BAYER4.flatMap((v) => [v * 17, v * 17, v * 17, 255])), 4, 4, THREE.RGBAFormat);
  bayerTex.minFilter = THREE.NearestFilter; bayerTex.magFilter = THREE.NearestFilter;
  bayerTex.wrapS = THREE.RepeatWrapping; bayerTex.wrapT = THREE.RepeatWrapping; bayerTex.needsUpdate = true;
  const postScene = new THREE.Scene();
  const postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const postMat = new THREE.ShaderMaterial({
    vertexShader: POST_VERT, fragmentShader: POST_FRAG,
    uniforms: {
      tCol: { value: null }, tNor: { value: null }, tDep: { value: null }, tBayer: { value: bayerTex },
      uRes: { value: new THREE.Vector2(320, 200) }, uShift: { value: new THREE.Vector2(0, 0) },
      uOutline: { value: 1 }, uDither: { value: 1 }, uPalette: { value: 1 }, uLevels: { value: 7 },
      uGrade: { value: 0 }, uT: { value: 0 }, uFlash: { value: 0 },
    },
    depthTest: false, depthWrite: false,
  });
  postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), postMat));
  const normMat = new THREE.MeshNormalMaterial();
  let rtColor = null, rtNormal = null, rtW = 320, rtH = 200;
  const gfx = { scale: 1, outline: 1, dither: 1, palette: 1 }; // 1x default: crisp pixels at phone DPI, retro treatment kept
  let cssW = 0, cssH = 0, halfH = 22, halfW = 36, zoom = 1;
  function applyFrustum() {
    const a = cssW / Math.max(1, cssH);
    if (a >= 1) { halfH = (tac ? 26 : 22) / zoom; halfW = halfH * a; }
    else { halfW = (tac ? 19 : 18.5) / zoom; halfH = Math.min(halfW / a, halfW * (tac ? 2.6 : 2.9)); }
    cam.left = -halfW; cam.right = halfW; cam.top = halfH; cam.bottom = -halfH;
    cam.updateProjectionMatrix();
  }
  function rebuildRTs() {
    const w = Math.max(64, Math.floor(cssW / gfx.scale));
    const h = Math.max(64, Math.floor(cssH / gfx.scale));
    rtW = w; rtH = h;
    if (rtColor) { rtColor.dispose(); rtNormal.dispose(); }
    const depthTexture = new THREE.DepthTexture(w, h);
    rtColor = new THREE.WebGLRenderTarget(w, h, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthBuffer: true, depthTexture });
    rtNormal = new THREE.WebGLRenderTarget(w, h, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthBuffer: true });
    postMat.uniforms.tCol.value = rtColor.texture;
    postMat.uniforms.tDep.value = rtColor.depthTexture;
    postMat.uniforms.tNor.value = rtNormal.texture;
    postMat.uniforms.uRes.value.set(w, h);
  }
  function resize() {
    const w = canvas.clientWidth || +(canvas.dataset && canvas.dataset.w) || 960;
    const h = canvas.clientHeight || +(canvas.dataset && canvas.dataset.h) || 600;
    if (w === cssW && h === cssH) return;
    cssW = w; cssH = h;
    renderer.setSize(w, h, false);
    applyFrustum();
    rebuildRTs();
  }
  function setZoom(z) {
    zoom = tac ? Math.max(0.5, Math.min(2.6, z)) : Math.max(0.7, Math.min(2, z));
    applyFrustum();
  }
  function setGfx(p) {
    if (p.preset === "retro") Object.assign(gfx, { scale: 3, outline: 1, dither: 1, palette: 1 });
    else if (p.preset === "clean") Object.assign(gfx, { scale: 2, outline: 1, dither: 0, palette: 1 });
    if (p.scale) gfx.scale = Math.max(1, Math.min(4, p.scale | 0));
    for (const k of ["outline", "dither", "palette"]) if (p[k] != null) gfx[k] = p[k] ? 1 : 0;
    postMat.uniforms.uOutline.value = gfx.outline;
    postMat.uniforms.uDither.value = gfx.dither;
    postMat.uniforms.uPalette.value = gfx.palette;
    rebuildRTs();
  }
  // DEPOT-only fog-of-war: default ON whenever a territory sampler is
  // supplied; toggled visuals-only by setFog (menu FOG on/off) — never gates
  // targeting, which reads fogStateFor directly in units.js/state.js.
  let fogOn = true;
  function setFog(v) { fogOn = !!v; }
  function updateTerritory() {
    if (!opts.territory) return;
    const { T, toWorld, sampleUV, sample, sampleVal } = opts.territory;
    splat.retintTerritory(T, toWorld, sampleUV);
    updateFogWash(sample, sampleVal);
  }
  const SIL_C = new THREE.Color(0x2c2f34); // flat dark grey — seam silhouettes, no team dress
  // fog debug counters (DEPOT-only): total team-2 alive bodies vs how many
  // were actually rendered this frame — cheap, DOM-readable via
  // window.__DEPOTFOGDBG__ (DepotGame.jsx), used by smoke.mjs's fog assert
  // instead of anything pixel-based.
  let fogDbgTotal = 0, fogDbgVisible = 0;
  function getFogDebug() { return { total: fogDbgTotal, visible: fogDbgVisible }; }
  let shake = 0;
  let flashV = 0, davyFx = null;
  function consume(events) {
    for (const e of events) {
      if (e.type === "boom") {
        // mk2.12: the davy's burst is its own event — flash, ring, cloud,
        // and the shake pinned at its ceiling.
        if (e.weapon === "davy") {
          spawnNuke(e.x, e.y, e.z);
          flashV = 1.25;                    // a beat of pure white before the decay shows
          shake = 1.5;
          davyFx = { x: e.x, z: e.z, t0: world.t };
        } else {
          spawnBoom(e.x, e.y, e.z, e.r);
          shake = Math.min(1.5, shake + 0.28 + e.r * 0.1);
        }
      } else if (e.type === "demo") {
        // SIEGE FIX (mk0.21) — DEPOT's demolition charge (squads.js/units.js
        // push this beside core's own boom; core.js is frozen and its boom
        // can't say "satchel"). A sapper's charge must read as a BUILDING
        // COMING DOWN, not another shell landing: the same instanced pools,
        // driven much harder — a standing column of smoke instead of a puff,
        // a wide fireball, stone thrown high and far, and a shake that stops
        // the screen. No new pools, no new materials, cosmetic only.
        spawnDemo(e.x, e.y, e.z, e.r);
        shake = 1.5;
      } else if (e.type === "splat") {
        // 1024: the canvas doubled for the block grid; the demo's 512 factors
        // here were painting craters (and treads below) at half position
        const u = ((e.x + F.half) / Wd) * 1024, v = ((e.z + F.half) / Wd) * 1024;
        splat.scorch(u, v, (e.r / Wd) * 1024);
      } else if (e.type === "kill") {
        const kb = world.byId.get(e.id);
        // mk2.15: a lightning kill scorches — black smudge, no matter the dress
        if (kb && kb.smearStyle) splat.smear(((e.x + F.half) / Wd) * 1024, ((e.z + F.half) / Wd) * 1024, e.cause === "ZAP" ? "scorch" : kb.smearStyle, e.x, e.z);
      } else if (e.type === "muzzle") {
        fire.push({ x: e.x, y: e.y, z: e.z, s: 1.1, life: 0.12, age: 0 });
        shake = Math.min(1.5, shake + 0.12);
      } else if (e.type === "gmuzzle") {
        fire.push({ x: e.x, y: e.y + 0.4, z: e.z, s: 0.8, life: 0.1, age: 0 });
      } else if (e.type === "weldbreak") puff(e.x, e.y, e.z, e.ice ? 3 : 2, e.ice ? 0xe8f4fb : 0x8a8f96);
      else if (e.type === "zap") {
        // Amendment 3 (owner): the strike bolt lives ONE FULL SECOND and
        // crackles (re-jagged every frame); hops ride shorter so the march
        // still reads. Amplitude scales with span — long bolts fork wide.
        const span = Math.hypot(e.x2 - e.x, e.z2 - e.z);
        spawnBolt(e.x, e.y, e.z, e.x2, e.y2 + 0.6, e.z2, e.hop ? 0.6 : 1.0, Math.max(1.8, span * 0.3));
        fire.push({ x: e.x2, y: e.y2 + 0.8, z: e.z2, s: 0.9, life: 0.14, age: 0 });
        shake = Math.min(1.5, shake + 0.1);
      } else if (e.type === "pondzap") {
        // the surface lights: radial bolts flat across the ice
        for (let pi = 0; pi < 6; pi++) {
          const a2 = Math.random() * Math.PI * 2, rr = e.r * (0.5 + Math.random() * 0.5);
          const py = F.heightAt(e.x, e.z) + 0.25;
          spawnBolt(e.x, py, e.z, e.x + Math.cos(a2) * rr, py, e.z + Math.sin(a2) * rr, 0.4, 0.9);
        }
      }
      else if (e.type === "splash") puff(e.x, POOL.level + 0.2, e.z, 4, 0x9fc4d8);
    }
  }
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3();
  function writeInst(mesh, i, x, y, z, q, sx, sy, sz) {
    dummy.position.set(x, y, z);
    if (q) dummy.quaternion.set(q.x, q.y, q.z, q.w); else dummy.quaternion.identity();
    dummy.scale.set(sx, sy, sz);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }
  // ---- towers (tower defense): one Group per body, distinct silhouette per
  // type — ported from ColdsnapTD's renderer. Visual params only; gameplay
  // stats stay in the game layer. Activated by kind "tower" bodies existing,
  // so every current mode renders exactly as before.
  const towerGroups = new Map();
  // frost aura rings under live frost towers
  const frostRingMesh = pool(new THREE.RingGeometry(0.72, 1.0, 40), new THREE.MeshBasicMaterial({ color: 0x8fd8ff, transparent: true, opacity: 0.14, depthWrite: false }), 16, false);
  frostRingMesh.layers.set(1);
  // player walls (tower defense): stone block + a cap of snow, instanced.
  // mk0.54 (Jeff: "a wall should just be 3 stacks of 3 blocks"): each course
  // BODY draws as a 3x3 grid of blocks, so a full wall is a 3-wide, 3-tall
  // block face from every side — the same masonry language as the town and
  // the depots, at wall scale. Render-only: the course bodies and the support
  // rule are untouched. 27 instances per wall; the pool covers ~85 fully
  // drawn walls (beyond that extra walls stop drawing blocks — the same
  // saturating-cap idiom as CHUNK_CAP, and far beyond any real build order).
  const WALL_INST = 2304;
  const WALL_BLOCKS = 3; // per course, per horizontal axis
  const wallMesh = pool(new THREE.BoxGeometry(1.8, 1.8, 1.8), toon(0x8e97a4), WALL_INST, true);
  const wallCapMesh = pool(new THREE.BoxGeometry(1.86, 0.22, 1.86), toon(0xeef4fa), 256, false);
  // THE SEAMS. The outline post-pass draws an edge wherever depth or normal
  // jumps between neighbouring pixels, so courses (and sandbags laid shoulder
  // to shoulder) only read as separate blocks if there is a gap between them
  // to find. These insets shrink what is DRAWN — the bodies keep their true
  // size, so cover, sightlines, arcs and occupancy are untouched. The vertical
  // inset is the one that matters: it opens the 0.6m course pitch to a ~0.11m
  // visible joint, wide enough to survive the retro downsample.
  const SEAM_XZ = 0.05, SEAM_Y = 0.045, SEAM_BAG = 0.04;
  // trees (tower defense): snow-laden pine — trunk + canopy pools, colored
  // per body (alive dark spruce, dead winter-kill brown); pose comes from
  // the BODY, so a blasted tree lies where physics dropped it
  // T5 (mk1.04, owner's ruling): copses + rare forests — the tree pool
  // rises behind ONE constant (trunk, canopy, canopy colors, flames, and
  // both loop guards read it; a missed site silently truncates). The old
  // cap was a set of bare literals; the suite forbids them returning.
  // mk2.65 (owner): four times the trees.
  const TREE_CAP = 800;
  const treeTrunkMesh = pool(new THREE.BoxGeometry(0.3, 1.4, 0.3), toon(0x4a3626), TREE_CAP, true);
  const treeCanopyMesh = pool(new THREE.ConeGeometry(1.05, 2.6, 6), toon(0xffffff), TREE_CAP, true);
  treeCanopyMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(TREE_CAP * 3).fill(1), 3);
  treeCanopyMesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
  const TREE_LIVE = new THREE.Color(0x2e5240), TREE_DEAD = new THREE.Color(0x594a38);
  const TREE_CHARRED = new THREE.Color(0x1c1712);
  const _treeC = new THREE.Color();
  const _swayAxis = new THREE.Vector3(), _swayQ = new THREE.Quaternion(), _treeQ = new THREE.Quaternion();
  // DEPOT: burning tree flame — a small additive plane pool, one per burning
  // tree (indexed 1:1 with the tree loop below so no id map is needed).
  // Flicker is derived from world.t + the tree's own position, never
  // Math.random (house rule: renderer never rolls its own dice).
  const treeFlameMesh = pool(new THREE.PlaneGeometry(0.9, 1.5), fireMat, TREE_CAP, false); treeFlameMesh.layers.set(1);
  // map dressing (tower defense): rock prisms + frozen-pond discs, built once
  const dressG = new THREE.Group();
  scene.add(dressG);
  function setDressing(spec) {
    while (dressG.children.length) dressG.remove(dressG.children[0]);
    for (const k of spec.rocks || []) {
      // no two boulders alike: a per-rock hash drives prism count, full
      // three-axis tilt, and how deep each block has sunk into the snow —
      // some barely break the crust, some heave a shoulder out of it
      let hsh = Math.abs(Math.sin(k.x * 12.9898 + k.z * 78.233) * 43758.5453) % 1;
      const rnd = () => { hsh = (hsh * 9301 + 0.49297) % 1; return hsh; };
      const nP = 2 + Math.floor(rnd() * 2);
      for (let i = 0; i < nP; i++) {
        const m = new THREE.Mesh(
          new THREE.BoxGeometry(k.r * (0.65 + rnd() * 0.7), k.h * (0.7 + rnd() * 0.7), k.r * (0.6 + rnd() * 0.65)),
          toon(i % 2 ? 0x5c636e : 0x6a7280));
        const sink = k.h * (0.1 + rnd() * 0.45);
        m.position.set(
          k.x + (rnd() - 0.5) * k.r * 0.7,
          F.heightAt(k.x, k.z) + k.h * 0.2 * i - sink,
          k.z + (rnd() - 0.5) * k.r * 0.7);
        m.rotation.set((rnd() - 0.5) * 0.5, rnd() * Math.PI * 2, (rnd() - 0.5) * 0.5);
        m.castShadow = true;
        dressG.add(m);
      }
    }
    for (const p of spec.ponds || []) {
      const disc = new THREE.Mesh(new THREE.CircleGeometry(p.r, 30), new THREE.MeshBasicMaterial({ color: 0xbfe0f0, transparent: true, opacity: 0.88 }));
      disc.rotation.x = -Math.PI / 2;
      disc.position.set(p.x, p.level + 0.06, p.z);
      dressG.add(disc);
    }
    // T3 (DEPOT-gated by data): stream water — a flat ribbon strip per run,
    // built from the centerline points, at the level the game supplies.
    for (const s of spec.streams || []) {
      const n2 = s.pts.length;
      if (n2 < 2) continue;
      const pos = new Float32Array(n2 * 2 * 3);
      for (let i = 0; i < n2; i++) {
        const p = s.pts[i];
        const q0 = s.pts[Math.max(0, i - 1)], q1 = s.pts[Math.min(n2 - 1, i + 1)];
        let dx = q1.x - q0.x, dz = q1.z - q0.z;
        const L = Math.hypot(dx, dz) || 1;
        const px = (-dz / L) * s.w, pz = (dx / L) * s.w;
        pos.set([p.x + px, p.y, p.z + pz, p.x - px, p.y, p.z - pz], i * 6);
      }
      const idx = [];
      for (let i = 0; i + 1 < n2; i++) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      geo.setIndex(idx);
      const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0x2b4a5c, transparent: true, opacity: 0.82, depthWrite: false }));
      m.layers.set(1);
      dressG.add(m);
    }
  }

  // P7 T10: MINES AND TRIPWIRES — the two tiny instanced pools (a setDressing-
  // style setter: the game layer calls R.setMines on lay/trigger/restore, not
  // every frame). Dark disc for mines, a peg for wires; capacity 96 each,
  // count-clamped. minesToDraw (module-level, above) filters to team-1 LIVE
  // devices only — the enemy's are never in the list.
  const MINE_CAP = 96, WIRE_CAP = 96;
  const mineDiscMesh = pool(new THREE.CylinderGeometry(0.32, 0.32, 0.08, 10), toon(0x2a2f36), MINE_CAP, false);
  const wirePegMesh = pool(new THREE.BoxGeometry(0.06, 0.35, 0.06), toon(0x8a7a52), WIRE_CAP, false);
  function setMines(list) {
    const live = minesToDraw(list);
    let mi = 0, wi = 0;
    for (const m of live) {
      const gy = F.heightAt(m.x, m.z);
      if (m.kind === "wire") {
        if (wi >= WIRE_CAP) continue;
        writeInst(wirePegMesh, wi++, m.x, gy + 0.18, m.z, null, 1, 1, 1);
      } else {
        if (mi >= MINE_CAP) continue;
        writeInst(mineDiscMesh, mi++, m.x, gy + 0.04, m.z, null, 1, 1, 1);
      }
    }
    mineDiscMesh.count = mi; mineDiscMesh.instanceMatrix.needsUpdate = true;
    wirePegMesh.count = wi; wirePegMesh.instanceMatrix.needsUpdate = true;
  }

  // mk2.50: TOWN FLAGS — render-only holder markers on standing buildings.
  // The game layer hands {x, y, z, team} rows at the territory cadence
  // (DepotGame). Rows only: nothing here is a body, an eye, or a territory
  // emitter — a kind:"flag" BODY is both, which is exactly why none is made.
  let townFlags = [];
  function setTownFlags(list) { townFlags = list || []; }

  // mk2.04 (owner): THE GRENADE, SEEN — green, blinking red, and the blink
  // QUICKENS as the fuse runs out (per grenade, its own clock). Instanced
  // box fed per frame by the game layer (R.setGrenades). Render-only; the
  // 2.0 here is a display mirror of GRENADE.fuse. // provisional (F5)
  const GREN_CAP = 32;
  const GREEN_C = new THREE.Color(0x35ff6a), RED_C = new THREE.Color(0xff2020);
  const grenMesh = pool(new THREE.BoxGeometry(0.22, 0.22, 0.22), new THREE.MeshBasicMaterial({ color: 0xffffff }), GREN_CAP, false);
  function setGrenades(list, t) {
    let gi = 0;
    if (list) for (const g of list) {
      if (!g.alive || gi >= GREN_CAP) continue;
      const left = g.grenade ? Math.max(0, 2.0 - (t - g.grenade.t0)) : 1;
      const period = 0.05 + 0.11 * left;   // ~6Hz fresh, ~20Hz at the burst
      grenMesh.setColorAt(gi, (performance.now() / 1000) % period < period / 2 ? RED_C : GREEN_C);
      writeInst(grenMesh, gi++, g.pos.x, g.pos.y, g.pos.z, null, 1, 1, 1);
    }
    if (grenMesh.instanceColor) grenMesh.instanceColor.needsUpdate = true;
    grenMesh.count = gi; grenMesh.instanceMatrix.needsUpdate = true;
  }

  // mk2.09: THE GREEN FOG — poison ground haze. Camera-facing instanced
  // planes over each patch; every offset and bob phase derives from the
  // patch's own position and world time (no rng — house rule). The last
  // five seconds thin to nothing. Phone and desktop draw the same pool.
  const FOGP_CAP = 96, FOGP_PER = 12;
  const fogpMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3, depthWrite: false });
  const fogpMesh = pool(new THREE.PlaneGeometry(2.6, 1.6), fogpMat, FOGP_CAP, false); fogpMesh.layers.set(1);
  const _fogG1 = new THREE.Color(0x39e05a), _fogG2 = new THREE.Color(0x1d7a33);
  function setGreenFog(list, t) {
    let fi = 0;
    if (list) for (const p of list) {
      const left = p.until - t;
      if (left <= 0) continue;
      const a = Math.min(1, left / 5);
      for (let k = 0; k < FOGP_PER && fi < FOGP_CAP; k++) {
        const ph = p.x * 3.7 + p.z * 1.9 + k * 2.399;
        const rr = (0.25 + 0.65 * ((k * 37 % 16) / 16)) * p.r;
        const az = ph + t * 0.13;
        const bx = p.x + Math.cos(az) * rr, bz = p.z + Math.sin(az) * rr;
        const by = F.heightAt(bx, bz) + 0.5 + 0.45 * Math.sin(t * 0.7 + ph);
        dummy.position.set(bx, by, bz); dummy.quaternion.copy(camQ);
        const s = (0.8 + 0.5 * Math.sin(t * 0.5 + ph * 1.7)) * a;
        dummy.scale.set(s * 2.2, s, 1); dummy.updateMatrix();
        fogpMesh.setMatrixAt(fi, dummy.matrix);
        if (fogpMesh.setColorAt) fogpMesh.setColorAt(fi, k % 3 ? _fogG1 : _fogG2);
        fi++;
      }
    }
    fogpMesh.count = fi; fogpMesh.instanceMatrix.needsUpdate = true;
    if (fogpMesh.instanceColor) fogpMesh.instanceColor.needsUpdate = true;
  }

  // ---- build overlay (tower defense): ghost pad + range preview + objective
  // marker + spawn banners. Lazy nulls until the game layer calls them, so
  // nothing here exists for the other modes.
  const OK_C = new THREE.Color(0x4aff8c), BAD_C = new THREE.Color(0xff6b5e);
  let hoverPad = null, hoverRing = null, hoverFill = null, objMark = null;
  let pendingPad = null, pendingFill = null, pendingEdge = null, pendingAuraRing = null, pendingAuraFill = null;
  let reachFill = null, reachEdge = null;
  let lineGroup = null; // COMMAND T2 (mk0.84): the proposed line's group, rebuilt on endpoint taps only.
  let pathPool = null;
  const PATH_VERT_CAP = 4096;   // segment vertices — ~30 ordered units at full route length // provisional (F5)
  let retRing = null, retPoly = null; // POSSESSION T5 / mk2.02: the crosshair group + the footprint loop
  let zoneMesh = null; // mk1.95: THE PLACEMENT ZONE — lazy like everything here
  const overlay = {
    // POSSESSION T5 (mk0.94): the possessed reticle — its own red ring, not
    // the build ghost. Lazy like everything here; the game layer drives it
    // only while a possession is live.
    // mk1.99: solid, spread-sized, and standing on a wall hit.
    // mk2.00 (owner): band 30% of radius, red brightened.
    setReticle(on, x, z, y, r, hit, pts) {
      if (!retRing) {
        const rmat = new THREE.MeshBasicMaterial({ color: 0xf0143c, depthWrite: false, side: THREE.DoubleSide, fog: false });
        retRing = new THREE.Group();
        // THE LARGE CROSSHAIR (mk2.01) — four bars, scaling and tilting as one.
        for (let ci = 0; ci < 4; ci++) {
          const bar = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.85), rmat);
          const ca = (ci * Math.PI) / 2;
          bar.position.set(Math.sin(ca) * 1.35, Math.cos(ca) * 1.35, 0);
          bar.rotation.z = -ca;
          retRing.add(bar);
        }
        retRing.rotation.x = -Math.PI / 2;
        for (const ch of retRing.children) ch.layers.set(1);
        scene.add(retRing);
        // mk2.02: THE FOOTPRINT POLYGON — the landing bound drawn through
        // its 16 landed points, each at its own ground, hugging hillsides.
        // The circle band is dead; the truth has corners.
        retPoly = new THREE.LineLoop(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0xf0143c, fog: false }));
        retPoly.layers.set(1); scene.add(retPoly);
      }
      retRing.visible = !!on;
      const havePts = !!(on && !hit && pts && pts.length > 2);
      retPoly.visible = havePts;
      if (on) {
        const rr = Math.max(0.4, r || 1.2);
        retRing.scale.set(rr, rr, 1);
        // a wall hit stands the crosshair upright on the face, square to
        // the fire line; ground and rooftops keep it flat at the landing.
        if (hit) { retRing.position.set(x, hit.y, z); retRing.rotation.set(0, hit.yaw, 0); }
        else { retRing.position.set(x, y + 0.1, z); retRing.rotation.set(-Math.PI / 2, 0, 0); }
      }
      if (havePts) {
        const arr = new Float32Array(pts.length * 3);
        for (let i = 0; i < pts.length; i++) { arr[i * 3] = pts[i].x; arr[i * 3 + 1] = pts[i].y + 0.14; arr[i * 3 + 2] = pts[i].z; }
        retPoly.geometry.dispose();
        retPoly.geometry = new THREE.BufferGeometry();
        retPoly.geometry.setAttribute("position", new THREE.BufferAttribute(arr, 3));
      }
    },
    // ghost build cursor: pad snapped to a cell (cs meters), ring/fill at range r
    setHover(on, x, z, y, r, okFlag, cs) {
      if (!hoverPad) {
        hoverPad = new THREE.Mesh(new THREE.BoxGeometry(1, 0.12, 1), new THREE.MeshBasicMaterial({ color: 0x4aff8c, transparent: true, opacity: 0.45, depthWrite: false }));
        hoverPad.layers.set(1); scene.add(hoverPad);
        hoverRing = new THREE.Mesh(new THREE.RingGeometry(0.97, 1.0, 44), new THREE.MeshBasicMaterial({ color: 0x9fdcff, transparent: true, opacity: 0.55, depthWrite: false }));
        hoverRing.rotation.x = -Math.PI / 2; hoverRing.layers.set(1); scene.add(hoverRing);
        hoverFill = new THREE.Mesh(new THREE.CircleGeometry(1, 44), new THREE.MeshBasicMaterial({ color: 0x6fb6dd, transparent: true, opacity: 0.09, depthWrite: false }));
        hoverFill.rotation.x = -Math.PI / 2; hoverFill.layers.set(1); scene.add(hoverFill);
      }
      hoverPad.visible = !!on; hoverRing.visible = !!on && r > 0; hoverFill.visible = hoverRing.visible;
      if (!on) return;
      // cs: number (square cell pad) or {x,z} (oriented footprint — sandbag
      // ghost passes the bag's live long-axis so the toggle reads instantly).
      if (typeof cs === "object" && cs) hoverPad.scale.set(cs.x, 1, cs.z);
      else hoverPad.scale.set(cs - 0.08, 1, cs - 0.08);
      hoverPad.position.set(x, y + 0.08, z);
      hoverPad.material.color.copy(okFlag ? OK_C : BAD_C);
      if (r > 0) {
        hoverRing.position.set(x, y + 0.12, z); hoverRing.scale.set(r, r, 1);
        hoverFill.position.set(x, y + 0.1, z); hoverFill.scale.set(r, r, 1);
      }
    },
    // objective: mast + flag + pulsing ground ring at the depot
    setObjective(x, z, y) {
      if (!objMark) {
        objMark = new THREE.Group();
        // the mast clears the depot's bastions — the flag is visible from
        // anywhere on the field, which is the whole point of a flag
        const mast = new THREE.Mesh(new THREE.BoxGeometry(0.2, 11.5, 0.2), toon(0x2a2f36));
        mast.position.y = 5.75; mast.castShadow = true; objMark.add(mast);
        const flag = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.4), new THREE.MeshBasicMaterial({ color: 0x4aff8c, side: THREE.DoubleSide }));
        flag.position.set(1.25, 10.5, 0); objMark.add(flag);
        objMark.userData.flag = flag;
        const ring = new THREE.Mesh(new THREE.RingGeometry(4.2, 5.0, 36), new THREE.MeshBasicMaterial({ color: 0x4aff8c, transparent: true, opacity: 0.5, depthWrite: false }));
        ring.rotation.x = -Math.PI / 2; ring.position.y = 0.12; ring.layers.set(1); objMark.add(ring);
        scene.add(objMark);
      }
      objMark.position.set(x, y, z);
    },
    // Task 3: placement preview — translucent ghost pad + a filled/edged
    // reach polygon (or a plain aura ring for frost, which sets pts=null
    // and uses ringR instead — an aura isn't LOS-clipped, so no polygon).
    // Lazily built on first use, same pattern as hoverPad/hoverRing above.
    setPending(on, x, y, z, pts, ringR, color, fp) {
      if (!pendingPad) {
        pendingPad = new THREE.Mesh(new THREE.BoxGeometry(1, 1.8, 1), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.32, depthWrite: false }));
        pendingPad.layers.set(1); scene.add(pendingPad);
        pendingFill = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ color: 0xff5544, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide }));
        pendingFill.layers.set(1); scene.add(pendingFill);
        pendingEdge = new THREE.LineLoop(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0xff5544, transparent: true, opacity: 0.85 }));
        pendingEdge.layers.set(1); scene.add(pendingEdge);
        pendingAuraRing = new THREE.Mesh(new THREE.RingGeometry(0.96, 1.0, 48), new THREE.MeshBasicMaterial({ color: 0x9fdcff, transparent: true, opacity: 0.7, depthWrite: false }));
        pendingAuraRing.rotation.x = -Math.PI / 2; pendingAuraRing.layers.set(1); scene.add(pendingAuraRing);
        pendingAuraFill = new THREE.Mesh(new THREE.CircleGeometry(1, 48), new THREE.MeshBasicMaterial({ color: 0x9fdcff, transparent: true, opacity: 0.14, depthWrite: false }));
        pendingAuraFill.rotation.x = -Math.PI / 2; pendingAuraFill.layers.set(1); scene.add(pendingAuraFill);
      }
      const havePoly = on && pts && pts.length > 2;
      const haveAura = on && !havePoly && ringR > 0;
      pendingPad.visible = !!on;
      pendingFill.visible = havePoly;
      pendingEdge.visible = havePoly;
      pendingAuraRing.visible = haveAura;
      pendingAuraFill.visible = haveAura;
      if (!on) return;
      if (fp) { pendingPad.scale.set(fp.x, fp.h / 1.8, fp.z); pendingPad.position.set(x, y + fp.h / 2, z); }
      else { pendingPad.scale.set(1, 1, 1); pendingPad.position.set(x, y + 0.9, z); }
      if (havePoly) {
        const n = pts.length;
        const posArr = new Float32Array((n + 1) * 3);
        posArr[0] = x; posArr[1] = y + 0.14; posArr[2] = z;
        for (let i = 0; i < n; i++) { posArr[(i + 1) * 3] = pts[i].x; posArr[(i + 1) * 3 + 1] = y + 0.14; posArr[(i + 1) * 3 + 2] = pts[i].z; }
        const idx = [];
        for (let i = 1; i <= n; i++) idx.push(0, i, (i % n) + 1);
        pendingFill.geometry.dispose();
        pendingFill.geometry = new THREE.BufferGeometry();
        pendingFill.geometry.setAttribute("position", new THREE.BufferAttribute(posArr, 3));
        pendingFill.geometry.setIndex(idx);
        const edgeArr = new Float32Array(n * 3);
        for (let i = 0; i < n; i++) { edgeArr[i * 3] = pts[i].x; edgeArr[i * 3 + 1] = y + 0.16; edgeArr[i * 3 + 2] = pts[i].z; }
        pendingEdge.geometry.dispose();
        pendingEdge.geometry = new THREE.BufferGeometry();
        pendingEdge.geometry.setAttribute("position", new THREE.BufferAttribute(edgeArr, 3));
        pendingFill.material.color.setHex(color || 0xff5544);
        pendingEdge.material.color.setHex(color || 0xff5544);
      } else if (haveAura) {
        pendingAuraRing.position.set(x, y + 0.14, z); pendingAuraRing.scale.set(ringR, ringR, 1);
        pendingAuraFill.position.set(x, y + 0.12, z); pendingAuraFill.scale.set(ringR, ringR, 1);
      }
    },
    // mk1.95: THE PLACEMENT ZONE — the ground a confirm placement may take,
    // shown while one is armed. mk1.97 (owner): the whole field's verdict,
    // two colors — legal in the passed color (the buildable green), everything
    // else in the refusal red, 0.5 both. Merged vertex-colored quads over
    // the game layer's passed grid mask; rebuilt only at its ~4Hz zone tick.
    // The grid's cells are 2m and ORIENT is quarter-turns, so flat
    // axis-aligned quads at cell-center height are exact.
    setZone(on, grid, mask, heightAt, color) {
      if (!zoneMesh) {
        zoneMesh = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide }));
        zoneMesh.layers.set(1); scene.add(zoneMesh);
      }
      zoneMesh.visible = !!on;
      if (!on) return;
      const legal = new THREE.Color(color || 0x4aff8c), illegal = new THREE.Color(0xff5544);
      const pos = [], col = [], idx = [];
      const h = grid.cs * 0.5;
      for (let gz = 0; gz < grid.h; gz++) for (let gx = 0; gx < grid.w; gx++) {
        const okC = mask[gz * grid.w + gx] ? legal : illegal;
        const wp = grid.gridToWorld(gx, gz);
        const y = heightAt(wp.x, wp.z) + 0.14;
        const b = pos.length / 3;
        pos.push(wp.x - h, y, wp.z - h, wp.x + h, y, wp.z - h, wp.x + h, y, wp.z + h, wp.x - h, y, wp.z + h);
        for (let k = 0; k < 4; k++) col.push(okC.r, okC.g, okC.b);
        idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
      }
      zoneMesh.geometry.dispose();
      zoneMesh.geometry = new THREE.BufferGeometry();
      zoneMesh.geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(pos), 3));
      zoneMesh.geometry.setAttribute("color", new THREE.BufferAttribute(new Float32Array(col), 3));
      zoneMesh.geometry.setIndex(idx);
    },
    // selected-squad reach fan (sniper): same fill+edge treatment as the
    // pending preview, minus the ghost pad — this marks sight, not a build.
    // (cx, cz) is the shooter's own position (the fan's triangulation center
    // and the point the rays were marched from), not a grid cell.
    setReach(on, cx, y, cz, pts, color) {
      if (!reachFill) {
        reachFill = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ color: 0xffd27a, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide }));
        reachFill.layers.set(1); scene.add(reachFill);
        reachEdge = new THREE.LineLoop(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0xffd27a, transparent: true, opacity: 0.8 }));
        reachEdge.layers.set(1); scene.add(reachEdge);
      }
      const have = on && pts && pts.length > 2;
      reachFill.visible = have; reachEdge.visible = have;
      if (!have) return;
      const n = pts.length;
      const posArr = new Float32Array((n + 1) * 3);
      posArr[0] = cx; posArr[1] = y + 0.14; posArr[2] = cz;
      for (let i = 0; i < n; i++) { posArr[(i + 1) * 3] = pts[i].x; posArr[(i + 1) * 3 + 1] = y + 0.14; posArr[(i + 1) * 3 + 2] = pts[i].z; }
      const idx = [];
      for (let i = 1; i <= n; i++) idx.push(0, i, (i % n) + 1);
      reachFill.geometry.dispose();
      reachFill.geometry = new THREE.BufferGeometry();
      reachFill.geometry.setAttribute("position", new THREE.BufferAttribute(posArr, 3));
      reachFill.geometry.setIndex(idx);
      const edgeArr = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { edgeArr[i * 3] = pts[i].x; edgeArr[i * 3 + 1] = y + 0.16; edgeArr[i * 3 + 2] = pts[i].z; }
      reachEdge.geometry.dispose();
      reachEdge.geometry = new THREE.BufferGeometry();
      reachEdge.geometry.setAttribute("position", new THREE.BufferAttribute(edgeArr, 3));
      reachFill.material.color.setHex(color || 0xffd27a);
      reachEdge.material.color.setHex(color || 0xffd27a);
    },
    // COMMAND T2 (mk0.84): the proposed line — endpoint discs, a dashed
    // path, one ghost box per piece the order would lay. Rebuilt only on
    // endpoint taps, never per frame.
    setLinePreview(on, spec) {
      if (lineGroup) {
        scene.remove(lineGroup);
        lineGroup.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
        lineGroup = null;
      }
      if (!on || !spec) return;
      lineGroup = new THREE.Group();
      const disc = (pt, color) => {
        const m = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.18, 24),
          new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, depthWrite: false }));
        m.position.set(pt.x, pt.y + 0.1, pt.z);
        lineGroup.add(m);
      };
      disc(spec.a, 0x4aff8c);                               // start: green
      disc(spec.b, 0xffd27a);                               // end: amber — where the buttons live
      const lg = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(spec.a.x, spec.a.y + 0.25, spec.a.z),
        new THREE.Vector3(spec.b.x, spec.b.y + 0.25, spec.b.z)]);
      const line = new THREE.Line(lg, new THREE.LineDashedMaterial({ color: spec.color || 0xffd27a, dashSize: 0.8, gapSize: 0.5, transparent: true, opacity: 0.9 }));
      line.computeLineDistances();
      lineGroup.add(line);
      for (const g of spec.pieces || []) {
        const m = new THREE.Mesh(new THREE.BoxGeometry(g.hx * 2, g.hy * 2, g.hz * 2),
          new THREE.MeshBasicMaterial({ color: spec.color || 0xffd27a, transparent: true, opacity: 0.3, depthWrite: false }));
        m.position.set(g.x, g.y, g.z);
        lineGroup.add(m);
      }
      lineGroup.traverse((o) => o.layers && o.layers.set(1));
      scene.add(lineGroup);
    },
    // P7 T24: THE GREEN THREADS, POOLED — the mk1.44 dispose-and-rebuild
    // churned enough garbage to stall the Pi's collector for whole seconds
    // (measured; the stutter's root). ONE geometry, born once, written in
    // place: segment pairs with per-path dash distances, drawRange sized to
    // the tick's real content. Zero allocation after birth.
    setOrderPaths(paths) {
      if (!pathPool) {
        const pos = new Float32Array(PATH_VERT_CAP * 3);
        const dist = new Float32Array(PATH_VERT_CAP);
        const geo = new THREE.BufferGeometry();
        geo.setAttribute("position", new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
        geo.setAttribute("lineDistance", new THREE.BufferAttribute(dist, 1).setUsage(THREE.DynamicDrawUsage));
        const under = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0x0c2416, transparent: true, opacity: 0.85, depthWrite: false }));
        const over = new THREE.LineSegments(geo, new THREE.LineDashedMaterial({ color: 0x4aff8c, dashSize: 1.4, gapSize: 0.6, transparent: true, opacity: 0.95, depthWrite: false }));
        under.frustumCulled = false; over.frustumCulled = false;
        under.layers.set(1); over.layers.set(1);
        scene.add(under); scene.add(over);
        pathPool = { geo, pos, dist, under, over };
      }
      const P = pathPool;
      let v = 0; // vertex cursor (segment pairs)
      for (const p of paths || []) {
        let run = 0, px = 0, py = 0, pz = 0, has = false;
        for (let i = 0; i + 1 < p.pts.length; i++) {
          const a = p.pts[i], b = p.pts[i + 1];
          const d = Math.hypot(b.x - a.x, b.z - a.z), n = Math.max(1, Math.ceil(d / 2));
          for (let k = 0; k <= n; k++) {
            const x = a.x + ((b.x - a.x) * k) / n, z = a.z + ((b.z - a.z) * k) / n;
            const y = F.heightAt(x, z) + 0.34;
            if (has) {
              if (v + 2 > PATH_VERT_CAP) break;
              P.pos[v * 3] = px; P.pos[v * 3 + 1] = py; P.pos[v * 3 + 2] = pz; P.dist[v] = run;
              run += Math.hypot(x - px, z - pz);
              P.pos[v * 3 + 3] = x; P.pos[v * 3 + 4] = y; P.pos[v * 3 + 5] = z; P.dist[v + 1] = run;
              v += 2;
            }
            px = x; py = y; pz = z; has = true;
          }
          if (v + 2 > PATH_VERT_CAP) break;
        }
      }
      P.geo.setDrawRange(0, v);
      P.geo.attributes.position.needsUpdate = true;
      P.geo.attributes.lineDistance.needsUpdate = true;
      P.under.visible = v > 0; P.over.visible = v > 0;
    },
    // spawn banners: red cloth on a pole at each entry point
    setBanners(pts) {
      for (const sp of pts) {
        const g = new THREE.Group();
        const pole = new THREE.Mesh(new THREE.BoxGeometry(0.14, 3.2, 0.14), toon(0x2a2f36)); pole.position.y = 1.6; g.add(pole);
        const cloth = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.9), new THREE.MeshBasicMaterial({ color: 0xd8433a, side: THREE.DoubleSide })); cloth.position.set(0.72, 2.6, 0); g.add(cloth);
        g.position.set(sp.x, F.heightAt(sp.x, sp.z), sp.z);
        scene.add(g);
      }
    },
  };

  function render(dt, focus, aim, turretYaw) {
    resize();
    water.visible = world.water != null; // dry ranges have no pond to float
    if (F.dirty) syncTerrain();
    if (opts.fadeDecals && world.t >= nextFadeT) {
      splat.fade(FADE_ALPHA);
      nextFadeT = world.t + FADE_EVERY;
    }
    fogDbgTotal = 0; fogDbgVisible = 0;
    _bars.length = 0;
    // vehicles sync
    for (const b of world.bodies) {
      // DIVERGENCE from the demo: kind "truck" joins the loop. The demo's
      // filter (vehicle|wreck) never rendered trucks at all — its own
      // dead-truck tint branch below was unreachable code. Latent there
      // (demo trucks are distant dressing); fatal for AC-03's column.
      if (b.kind !== "vehicle" && b.kind !== "wreck" && b.kind !== "truck") continue;
      let g = vehMap.get(b.id);
      if (!g) {
        // P7 T2/T4: b.vtype === "bison"/"apc" (DEPOT's starting armor, both
        // sides) joins the demo-global bisonId path — buildBison/buildApc
        // dress each side; the demo's undefined team is untouched (parity
        // by construction).
        g = b.vtype === "apc" ? buildApc(b.team) : b.vtype === "tank" ? buildWaveTank(b.team) : (b.vtype === "bison" || b.id === world.bisonId) ? buildBison(b.team) : (b.vtype === "truck" ? buildTruck() : buildScout());
        vehMap.set(b.id, g); scene.add(g);
      }
      // DEPOT fog (opts.territory, gated by fogOn): unheld enemy vehicles
      // are not rendered; seam vehicles drop to a flat silhouette (no team
      // dress color). Player/neutral vehicles and everything when fog is off
      // are untouched.
      let fogHide = false, fogSil = false;
      if (opts.territory && b.team === 2 && b.alive) {
        fogDbgTotal++;
        if (fogOn) {
          const st = opts.territory.sample(b.pos.x, b.pos.z);
          fogHide = st === "unheld";
          fogSil = st === "seam";
        }
        if (!fogHide) fogDbgVisible++;
      }
      g.visible = !fogHide;
      if (fogHide) continue;
      g.position.set(b.pos.x, b.pos.y, b.pos.z);
      g.quaternion.set(b.q.x, b.q.y, b.q.z, b.q.w);
      if (b.kind === "vehicle") pushBar(b, 2.6, 1.0); // provisional (F5)
      if ((b.kind === "wreck" || (b.kind === "truck" && !b.alive)) && !g.userData.dead) {
        g.userData.dead = true;
        g.traverse((o) => { if (o.isMesh) { o.material = o.material.clone(); o.material.color.lerp(wreckTint, 0.75); } });
      }
      if (g.userData.hull && !g.userData.dead) {
        if (fogSil) { g.userData.hull.material.color.copy(SIL_C); if (g.userData.top) g.userData.top.material.color.copy(SIL_C); g.userData.fogSil = true; }
        else if (g.userData.fogSil) { g.userData.hull.material.color.setHex(PAL.scoutRed); if (g.userData.top) g.userData.top.material.color.setHex(0x6f3b36); g.userData.fogSil = false; }
      }
      // P7 T2: a driven hull's turret follows its own aim yaw (world azimuth
      // minus the hull's own yaw, R[6]/R[8] atan2 — the group already
      // carries the hull quaternion); falls back to the demo's turretYaw
      // when b._aimYaw is absent (parity by construction).
      if (g.userData.turret) g.userData.turret.rotation.y = b._aimYaw != null ? b._aimYaw - Math.atan2(b.R[6], b.R[8]) : turretYaw;
      if (g.userData.gunPitch) g.userData.gunPitch.rotation.x = -(b._aimPitch || 0);
      // THE BULB (P7 T2): GREEN with the tracks safety on, RED with it off.
      // A body with no b.tracks (the demo, the enemy's Bison before Task 5)
      // reads green.
      if (g.userData.bulb) g.userData.bulb.material.color.setHex(b.tracks === "free" ? 0xff4433 : 0x35ff6a);
      // P7 T4: the ramp eases toward its game-layer-stamped state (b._hatch:
      // 0 closed, 1 open) — render-only, no sim reads it.
      if (g.userData.ramp) g.userData.ramp.rotation.x += ((b._hatch ? -1.9 : 0) - g.userData.ramp.rotation.x) * 0.12;
    }
    for (const [id, g] of vehMap) if (!world.byId.has(id)) { scene.remove(g); vehMap.delete(id); }
    // towers (tower defense): group per body; turret tracks target, recoil on
    // fire, hurt shrink, frost spin + aura ring
    let fri = 0;
    for (const b of world.bodies) {
      if (b.kind !== "tower") continue;
      // mk2.37: DEPOT fog — the tower loop learns the vehicles' law. An
      // unheld enemy tower is not rendered (group hidden, bar/aura/sparks
      // skip with it); a SEAM tower draws whole but drops its bar — towers
      // wear no team dress (one mesh both sides), so there is no color to
      // silhouette. Live team-2 only; render-only; DEPOT-only (opts.territory).
      let fogSilT = false;
      if (opts.territory && b.team === 2 && b.alive) {
        fogDbgTotal++;
        if (fogOn) {
          const st = opts.territory.sample(b.pos.x, b.pos.z);
          if (st === "unheld") { const g0 = towerGroups.get(b.id); if (g0) g0.visible = false; continue; }
          fogSilT = st === "seam";
        }
        fogDbgVisible++;
      }
      let g = towerGroups.get(b.id);
      if (!g) { g = buildTowerMesh(b.towerType); towerGroups.set(b.id, g); scene.add(g); }
      g.visible = true;
      g.position.set(b.pos.x, b.pos.y, b.pos.z);
      if (!fogSilT) pushBar(b, 1.6, 1.0); // provisional (F5)
      const hurt = b.maxHp ? b.hp / b.maxHp : 1;
      if (g.userData.turret) {
        const tgt = b.targetId ? world.byId.get(b.targetId) : null;
        if (tgt && tgt.alive) g.userData.turret.rotation.y = Math.atan2(tgt.pos.x - b.pos.x, tgt.pos.z - b.pos.z);
        const since = world.t - (b.flashT || -9);
        g.userData.turret.position.z = since < 0.14 ? -(1 - since / 0.14) * 0.3 : 0;
        if (g.userData.gunPitch) g.userData.gunPitch.rotation.x = -(b._aimPitch || 0);
      }
      if (g.userData.spin) g.rotation.y = world.t * 0.5;
      if (g.userData.glow) {
        // mk2.16: the coil breathes — and crawls with small arcs at a loose
        // regular interval, denser in the half-second before the trigger
        g.userData.glow.material.opacity = 0.45 + 0.3 * Math.sin(world.t * 6 + b.id) + (b.fireCd != null && b.fireCd < 0.6 ? 0.25 : 0);
        if (Math.random() < dt * 3.5) {
          const cy = b.pos.y + g.userData.crownY;
          const a2 = Math.random() * Math.PI * 2, a3 = a2 + 1 + Math.random() * 3;
          spawnBolt(b.pos.x + Math.cos(a2) * 0.8, cy + (Math.random() - 0.5) * 0.3, b.pos.z + Math.sin(a2) * 0.8,
            b.pos.x + Math.cos(a3) * 0.8, cy + (Math.random() - 0.5) * 0.3, b.pos.z + Math.sin(a3) * 0.8, 0.3, 0.35);
        }
      }
      g.scale.setScalar(hurt < 0.999 ? 0.94 + 0.06 * hurt : 1);
      if (world.t - (b.hitT || -9) < 0.12) g.scale.multiplyScalar(1.06);
      if (b.towerType === "frost" && b.alive && fri < 16 && b.auraR) {
        // RingGeometry faces +Z: lay it flat on the snow
        dummy.position.set(b.pos.x, F.heightAt(b.pos.x, b.pos.z) + 0.15, b.pos.z);
        dummy.rotation.set(-Math.PI / 2, 0, 0);
        dummy.scale.set(b.auraR, b.auraR, 1);
        dummy.updateMatrix();
        frostRingMesh.setMatrixAt(fri, dummy.matrix);
        dummy.rotation.set(0, 0, 0);
        fri++;
      }
    }
    frostRingMesh.count = fri; frostRingMesh.instanceMatrix.needsUpdate = true;
    for (const [id, g] of towerGroups) if (!world.byId.has(id)) { scene.remove(g); towerGroups.delete(id); }
    // player walls (tower defense). mk0.54: every course BODY draws as a 3x3
    // grid of inset blocks (Jeff: "3 stacks of 3 blocks") so the outline pass
    // finds a joint at every block boundary — the town's masonry look at wall
    // scale. The snow cap still spans the whole TOP LIVING course — b.capTop
    // is stamped by the depot's support pass (state.js); a plain single-body
    // wall has no course, never sets it, and draws as one block as it always
    // did (the F3-ready enemy wall and TD keep their exact old look).
    let wi = 0, wci = 0;
    for (const b of world.bodies) {
      if (b.kind !== "wall" || wi >= WALL_INST) continue;
      const hurtW = b.maxHp ? Math.max(0.75, b.hp / b.maxHp) : 1;
      const dy = Math.max(0.05, b.hy - SEAM_Y);
      pushBar(b, 1.2, 0.5); // provisional (F5)
      if (b.course == null) {
        const dx = Math.max(0.05, b.hx - SEAM_XZ), dz = Math.max(0.05, b.hz - SEAM_XZ);
        writeInst(wallMesh, wi, b.pos.x, b.pos.y, b.pos.z, b.q, dx / 0.9 * hurtW, dy / 0.9, dz / 0.9 * hurtW);
        wi++;
      } else {
        // mk0.55 (Jeff: "this is 3x3x3, not 3x3x1"): a course draws as 3
        // blocks in a ROW along its LONG axis — the wall is a FACE, one
        // block deep, matching its thin collider. Damage shrink applies per
        // block, so a chewed course visibly thins.
        const alongX = b.hx >= b.hz;
        const long = alongX ? b.hx : b.hz, thin = alongX ? b.hz : b.hx;
        const step = (long * 2) / WALL_BLOCKS;
        const bh = Math.max(0.04, step / 2 - SEAM_XZ);
        const bt = Math.max(0.04, thin - SEAM_XZ);
        for (let k = 0; k < WALL_BLOCKS && wi < WALL_INST; k++) {
          const o = -long + (k + 0.5) * step;
          const px = b.pos.x + (alongX ? o : 0), pz = b.pos.z + (alongX ? 0 : o);
          writeInst(wallMesh, wi, px, b.pos.y, pz, b.q,
            (alongX ? bh : bt) / 0.9 * hurtW, dy / 0.9, (alongX ? bt : bh) / 0.9 * hurtW);
          wi++;
        }
      }
      // cap follows the course's own footprint (a thin wall wears a thin
      // snow cap; the single-body TD wall still gets the classic full slab)
      if (b.capTop !== false && wci < 256) { writeInst(wallCapMesh, wci, b.pos.x, b.pos.y + dy + 0.08, b.pos.z, b.q, (b.hx + 0.03) / 0.93, 1, (b.hz + 0.03) / 0.93); wci++; }
    }
    wallMesh.count = wi; wallMesh.instanceMatrix.needsUpdate = true;
    wallCapMesh.count = wci; wallCapMesh.instanceMatrix.needsUpdate = true;
    // trees (tower defense); DEPOT (world.depotCombat) adds burning
    // flame/char progression — inert without the flag, existing TD path
    // (alive green / felled TREE_DEAD) is untouched.
    let tri = 0, tfi = 0;
    const windSway = world.wind; // tree lean/oscillation only exists when a wind field is present
    for (const b of world.bodies) {
      if (b.kind !== "tree" || tri >= TREE_CAP) continue;
      const R2b = b.R;
      const cx = b.pos.x + R2b[3] * b.hy * 0.85, cy = b.pos.y + R2b[4] * b.hy * 0.85, cz = b.pos.z + R2b[5] * b.hy * 0.85;
      let treeQ = b.q;
      if (windSway && b.alive) {
        // lean + oscillation scaled by wind.mag, phase from position (no rng);
        // felled/charred-dead trees (!b.alive) are untouched
        const mag = windSway.mag || 0;
        const phase = b.pos.x * 1.3 + b.pos.z * 0.9;
        const angle = mag * 0.035 + mag * 0.02 * Math.sin(world.t * 1.6 + phase);
        const wm = Math.hypot(windSway.x, windSway.z) || 1;
        _swayAxis.set(windSway.z / wm, 0, -windSway.x / wm);
        _swayQ.setFromAxisAngle(_swayAxis, angle);
        _treeQ.set(b.q.x, b.q.y, b.q.z, b.q.w).premultiply(_swayQ);
        treeQ = _treeQ;
      }
      writeInst(treeTrunkMesh, tri, b.pos.x, b.pos.y - b.hy * 0.35, b.pos.z, treeQ, 1, 1, 1);
      // canopy rides the trunk's up axis so a felled tree carries its crown over
      writeInst(treeCanopyMesh, tri, cx, cy, cz, treeQ, 1, 1, 1);
      if (treeCanopyMesh.setColorAt) {
        if (world.depotCombat && b.burning != null) {
          const denom = b.maxHp || 30;
          const burnFrac = Math.max(0, Math.min(1, 1 - b.hp / denom));
          _treeC.copy(b.alive ? TREE_LIVE : TREE_DEAD).lerp(TREE_CHARRED, b.alive ? burnFrac : 1);
          treeCanopyMesh.setColorAt(tri, _treeC);
        } else {
          treeCanopyMesh.setColorAt(tri, b.alive ? TREE_LIVE : TREE_DEAD);
        }
      }
      if (world.depotCombat && b.burning != null && b.alive && tfi < TREE_CAP) {
        // flicker phase keyed off the tree's own position (deterministic,
        // no Math.random) so each burning tree licks independently
        const phase = (b.pos.x * 3.1 + b.pos.z * 1.7);
        const flick = 0.75 + 0.25 * Math.sin(world.t * 9 + phase);
        const s = flick * (0.6 + 0.4 * Math.min(1, (world.t - b.burning) / 2));
        dummy.position.set(cx, cy - b.hy * 0.2, cz); dummy.quaternion.copy(camQ);
        dummy.scale.set(s, s, 1); dummy.updateMatrix();
        treeFlameMesh.setMatrixAt(tfi++, dummy.matrix);
      }
      tri++;
    }
    treeTrunkMesh.count = tri; treeTrunkMesh.instanceMatrix.needsUpdate = true;
    treeCanopyMesh.count = tri; treeCanopyMesh.instanceMatrix.needsUpdate = true;
    if (treeCanopyMesh.instanceColor) treeCanopyMesh.instanceColor.needsUpdate = true;
    treeFlameMesh.count = tfi; treeFlameMesh.instanceMatrix.needsUpdate = true;
    // units: table-driven multi-part infantry with a speed-keyed march swing.
    // Limb quats compose body * local-X(phase); dead men freeze mid-stride and
    // take the winter-kill tint per role.
    let ci = 0, gi = 0, gli = 0;
    for (const b of world.bodies) {
      if (b.kind !== "unit") continue;
      if (b.riding) continue; // P7 T4: the hold is sealed — a rider draws nowhere
      const R = b.R;
      const isG = b.utype === "gren";
      if (isG ? gi >= 24 : ci >= 96) continue;
      // DEPOT fog (opts.territory, gated by fogOn): an enemy standing in
      // unheld ground is not rendered at all — a shell from the fog is
      // information earned, a soldier standing there is not. In the seam,
      // render but force the flat silhouette palette below (no dress read).
      let fogSil = false;
      if (opts.territory && b.team === 2 && b.alive) {
        fogDbgTotal++;
        if (fogOn) {
          const st = opts.territory.sample(b.pos.x, b.pos.z);
          if (st === "unheld") continue;
          fogSil = st === "seam";
        }
        fogDbgVisible++;
      }
      if (!fogSil) pushBar(b, 0.9, 0.55); // provisional (F5) — a silhouette keeps its secrets
      const sp = b.alive ? Math.hypot(b.v.x, b.v.z) : 0;
      b.wph = (b.wph || 0) + sp * dt * 3.4;
      const sw = Math.sin(b.wph) * Math.min(0.5, sp * 0.24);
      const spec = isG ? INFANTRY.gren : INFANTRY.con;
      const pools = isG ? grenPools : conPools;
      const idx = isG ? gi : ci;
      // The pair's look (DEPOT-gated, 6.5 Task 6): b.role drives pose/prop.
      // Spotter — no rifle ever; binoculars-up while holding (settled).
      // Sniper — settled low pose on his directed ground. All of it keys on
      // world.depotCombat AND b.role, so every other mode (and every
      // role-less DEPOT body) renders byte-identical to before; fog seam
      // silhouettes (fogSil) stay generic man-shapes — fog costs exactly
      // this identification, by design.
      const pairLook = world.depotCombat && b.alive && !fogSil && (b.role === "spotter" || b.role === "sniper");
      const crouch = pairLook && b.role === "sniper" && b.settled ? 0.7 : 1;
      // mk0.23 troop identity: pure function of team/utype/tag/role/dress —
      // no rng, no world.t. Outside DEPOT it returns the pre-mk0.23 look and
      // zero-scale props, so every other mode draws byte-identically.
      const KIT = troopKit(b, !!world.depotCombat, fogSil);
      // DIVERGENCE (guarded, mk0.99): HIT FEEDBACK — a struck man dips and
      // flashes red for 0.18s. b.dmgT only ever exists under depotCombat
      // (core.js applyDamage); every other mode renders byte-identical.
      const hurtAge = world.depotCombat && b.alive && b.dmgT != null ? world.t - b.dmgT : 1;
      const hurtK = hurtAge < 0.18 ? 1 - hurtAge / 0.18 : 0;
      // mk2.02: TWO-METER MEN (owner) — depot bodies are 2m (hy 1.0); the
      // drawn man stretches to match. Demo modes render byte-identical.
      const bw = KIT.bw, bh = KIT.bh * (world.depotCombat ? 2.0 / 1.44 : 1);
      const kitPal = KIT.pal;
      for (let pi = 0; pi < spec.length; pi++) {
        const p = spec[pi];
        let o = p.off, ksx = 1, ksy = 1, ksz = 1, tilt = null, aim = null, propRole = null;
        const propI = PROP_KEYS[p.key];
        if (propI !== undefined) {
          const pr = KIT.props[propI];
          // inert slot: a degenerate instance (this is the whole reason the
          // spare slots are free everywhere but DEPOT)
          if (!pr) { writeInst(pools[pi], idx, b.pos.x, b.pos.y, b.pos.z, b.q, 0, 0, 0); continue; }
          o = pr.off; ksx = pr.s[0]; ksy = pr.s[1]; ksz = pr.s[2];
          tilt = pr.tilt || null; aim = pr.aim || null;
          propRole = pr.role || null; // P7.2 T6: a prop may name its own color role
        } else if (p.key === "rifle") { ksx = ksy = ksz = KIT.rifle; }
        // bulk scales the RIG (offsets + body part scale). Props keep their
        // own literal scale: an aim:"barrel" prop must stay UNIFORMLY scaled
        // or the baked rotation shears it — and no bulked unit carries one.
        const bpx = propI !== undefined ? 1 : bw, bpy = propI !== undefined ? 1 : bh;
        const ox = o[0] * (propI !== undefined ? 1 : bw), oz = o[2] * (propI !== undefined ? 1 : bw);
        const oy = o[1] * (propI !== undefined ? 1 : bh) * crouch - (crouch < 1 ? 0.06 : 0) - 0.10 * hurtK;
        const px = b.pos.x + R[0] * ox + R[3] * oy + R[6] * oz;
        const py = b.pos.y + R[1] * ox + R[4] * oy + R[7] * oz;
        const pz = b.pos.z + R[2] * ox + R[5] * oy + R[8] * oz;
        let q = b.q;
        if (p.swing) {
          _bq.set(b.q.x, b.q.y, b.q.z, b.q.w);
          // binoculars-up: a holding spotter's arms lift to his face (fixed
          // raise replaces the march swing) — same quat compose, new angle
          const raise = pairLook && b.role === "spotter" && b.settled && (p.key === "armL" || p.key === "armR");
          _swq.setFromAxisAngle(_AXX, raise ? -2.2 : sw * p.swing * p.swingK);
          _bq.multiply(_swq);
          q = _bq;
        }
        // a prop that must sit ON the barrel takes the rifle's REAL preRot
        // quaternion (RIFLE_Q, composed from the same table entry the pool
        // geometry bakes); a free prop takes its own unit-local axis tilt
        if (aim === "barrel") { _bq.set(b.q.x, b.q.y, b.q.z, b.q.w); _bq.multiply(RIFLE_Q); q = _bq; }
        else if (tilt) { _bq.set(b.q.x, b.q.y, b.q.z, b.q.w); _swq.setFromAxisAngle(_TILT_AX[tilt[0]], tilt[1]); _bq.multiply(_swq); q = _bq; }
        if (pairLook && b.role === "spotter" && p.key === "rifle") {
          if (b.settled) {
            // the rifle slot doubles as the binoculars: a stub at the eyes
            const bx = b.pos.x + R[3] * 0.5 + R[6] * 0.2;
            const by = b.pos.y + R[4] * 0.5 + R[7] * 0.2;
            const bz = b.pos.z + R[5] * 0.5 + R[8] * 0.2;
            writeInst(pools[pi], idx, bx, by, bz, b.q, 1.6, 1.6, 0.3);
          } else {
            writeInst(pools[pi], idx, px, py, pz, q, 0, 0, 0); // no rifle on the march either
          }
          if (pools[pi].setColorAt) pools[pi].setColorAt(idx, fogSil ? SIL_C : (b.dress === "android" ? (b.alive ? AND_LIVE : AND_DEAD) : (b.alive ? INF_LIVE : INF_DEAD)[kitPal]).gun);
          continue;
        }
        writeInst(pools[pi], idx, px, py, pz, q, bpx * ksx, bpy * ksy, bpx * ksz);
        if (pools[pi].setColorAt) {
          if (fogSil) pools[pi].setColorAt(idx, SIL_C);
          else {
            const pal = b.dress === "android" ? (b.alive ? AND_LIVE : AND_DEAD) : kitPal === "medic" ? (b.alive ? MED_LIVE : MED_DEAD) : kitPal === "davy" ? (b.alive ? DAVY_LIVE : DAVY_DEAD) : (b.alive ? INF_LIVE : INF_DEAD)[kitPal];
            if (hurtK > 0) { _hitC.copy(pal[propRole || p.role]).lerp(HIT_C, 0.7 * hurtK); pools[pi].setColorAt(idx, _hitC); }
            else pools[pi].setColorAt(idx, pal[propRole || p.role]);
          }
        }
      }
      // periodic lens glint from a holding spotter (both sides): world.t-
      // driven phase off his own position — deterministic, no rng, no state
      if (pairLook && b.role === "spotter" && b.settled && gli < 8) {
        const ph = world.t * 0.45 + b.pos.x * 0.13 + b.pos.z * 0.29;
        const f = ph - Math.floor(ph);
        if (f < 0.16) {
          const s = 0.55 * Math.sin((f / 0.16) * Math.PI);
          dummy.position.set(b.pos.x + R[3] * 0.55 + R[6] * 0.24, b.pos.y + R[4] * 0.55 + R[7] * 0.24, b.pos.z + R[5] * 0.55 + R[8] * 0.24);
          dummy.quaternion.copy(camQ); dummy.scale.set(s, s, 1); dummy.updateMatrix();
          glintMesh.setMatrixAt(gli++, dummy.matrix);
        }
      }
      if (isG) gi++; else ci++;
    }
    glintMesh.count = gli; glintMesh.instanceMatrix.needsUpdate = true;
    for (const m of conPools) { m.count = ci; m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; }
    for (const m of grenPools) { m.count = gi; m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; }
    // chunks
    let ki = 0;
    for (const b of world.bodies) {
      if (b.kind !== "chunk" || ki >= CHUNK_CAP) continue;
      // Sandbags get the wall's seam treatment (P1.5 T2) — bags laid in a line
      // are drawn a hair inside their bodies so the outline reads each block.
      // Town/depot masonry is untouched: its 3cm laying pitch already does it.
      const bs = b.sandbag ? SEAM_BAG : 0;
      if (b.sandbag) pushBar(b, 1.2, 0.4); // provisional (F5)
      writeInst(chunkMesh, ki, b.pos.x, b.pos.y, b.pos.z, b.q, (b.hx - bs) / 0.6, (b.hy - bs) / 0.6, (b.hz - bs) / 0.6);
      chunkMesh.setColorAt(ki, b.tint === "roof" ? CHUNK_ROOF_C : b.tint === "timber" ? CHUNK_TIMBER_C : CHUNK_WALL_C);
      ki++;
    }
    chunkMesh.count = ki; chunkMesh.instanceMatrix.needsUpdate = true; if (chunkMesh.instanceColor) chunkMesh.instanceColor.needsUpdate = true;
    chunkStats = { drawn: ki, cap: CHUNK_CAP, total: world.bodies.reduce((n, b) => n + (b.kind === "chunk" ? 1 : 0), 0) };
    // P7.1 T3: the collected bars — plate first, fill on top, camera-facing,
    // left edge anchored so the fill drains rightward as hp falls.
    {
      let bi2 = 0;
      for (const e of _bars) {
        if (bi2 >= BAR_CAP) break;
        const b = e.b, f = Math.max(0, Math.min(1, b.hp / b.maxHp));
        dummy.position.set(b.pos.x, b.pos.y + b.hy + e.lift, b.pos.z);
        dummy.position.addScaledVector(camRight, -e.w / 2);
        dummy.quaternion.copy(camQ);
        dummy.scale.set(e.w, 0.28, 1); dummy.updateMatrix();
        barBackMesh.setMatrixAt(bi2, dummy.matrix);
        dummy.scale.set(e.w * f, 0.20, 1); dummy.updateMatrix();
        barFillMesh.setMatrixAt(bi2, dummy.matrix);
        _barC.copy(BAR_LO).lerp(BAR_HI, f);
        if (barFillMesh.setColorAt) barFillMesh.setColorAt(bi2, _barC);
        bi2++;
      }
      barBackMesh.count = bi2; barBackMesh.instanceMatrix.needsUpdate = true;
      barFillMesh.count = bi2; barFillMesh.instanceMatrix.needsUpdate = true;
      if (barFillMesh.instanceColor) barFillMesh.instanceColor.needsUpdate = true;
    }
    // mech links (kind filter lesson: name EVERY kind explicitly)
    const torsos = [];
    let mi = 0;
    for (const b of world.bodies) {
      if ((b.kind !== "mech" && b.kind !== "mechlink" && b.kind !== "mechfoot") || mi >= 88) continue;
      // mk2.37: DEPOT fog — unheld enemy mech pieces write no instance (the
      // pod/thruster hardware skips with its torso); seam pieces write the
      // flat silhouette and no bar. Live team-2 only; render-only.
      let fogSilM = false;
      if (opts.territory && b.mechRef && b.mechRef.team === 2 && b.alive) {
        fogDbgTotal++;
        if (fogOn) {
          const st = opts.territory.sample(b.pos.x, b.pos.z);
          if (st === "unheld") continue;
          fogSilM = st === "seam";
        }
        fogDbgVisible++;
      }
      if (b.visTag === "torso") torsos.push(b);
      if (b.kind === "mech" && !fogSilM) pushBar(b, 3.2, 7.5); // hull only — the one mech kind carrying maxHp // provisional (F5)
      writeInst(mechMesh, mi, b.pos.x, b.pos.y, b.pos.z, b.q, b.hx * 2, b.hy * 2, b.hz * 2);
      if (mechMesh.setColorAt) mechMesh.setColorAt(mi, fogSilM ? SIL_C : (b.kind === "mech" ? MECH_HULL_C : b.kind === "mechfoot" ? MECH_FOOT_C : MECH_LINK_C));
      mi++;
    }
    // per-mech hardware (P7 T "the mech", mk1.92): the pod + thruster block
    // runs once per torso now — pool indices (mi/pli/sni) thread across
    // every mech on the field instead of resetting.
    let pli = 0, sni = 0;
    for (const torsoB of torsos) {
    // GINORMOUS shoulder missile pod (design 2026-08-01): an MLRS-scale
    // rack on the RIGHT shoulder, drawn as two boxes riding the torso frame
    // (render-only — physics keeps the logical mount)
    if (torsoB && mi < 84) {
      _bq.set(torsoB.q.x, torsoB.q.y, torsoB.q.z, torsoB.q.w);
      const _off = new THREE.Vector3(-1.35, 0.62, -0.05).applyQuaternion(_bq);
      const plx = torsoB.pos.x + _off.x, ply = torsoB.pos.y + _off.y, plz = torsoB.pos.z + _off.z;
      writeInst(mechMesh, mi, plx, ply, plz, torsoB.q, 0.45, 0.4, 0.7); // pylon (fixed mount)
      if (mechMesh.setColorAt) mechMesh.setColorAt(mi, MECH_LINK_C);
      mi++;
      // the pod SLEWS independent of the torso: yaw about its own mount by
      // the engine's tracked launcher bearing (mech.mslYaw, world frame)
      const mch = torsoB.mechRef;
      const tYaw = Math.atan2(torsoB.R[6], torsoB.R[8]);
      let rel = (mch && mch.mslYaw != null ? mch.mslYaw : tYaw) - tYaw;
      while (rel > Math.PI) rel -= 2 * Math.PI;
      while (rel < -Math.PI) rel += 2 * Math.PI;
      _swq.setFromAxisAngle(_podUp.set(0, 1, 0), rel);
      _podQ.copy(_bq).multiply(_swq);
      _off.set(0, 0.48, 0.12).applyQuaternion(_podQ);
      writeInst(mechMesh, mi, plx + _off.x, ply + _off.y, plz + _off.z, _podQ, 0.75, 0.58, 1.45); // the pod (halved per Jeff, 2026-08-02)
      if (mechMesh.setColorAt) mechMesh.setColorAt(mi, mch && mch.podLock ? POD_LOCK_C : MECH_FOOT_C);
      mi++;
    }
    // thruster hardware + plumes: bells always visible; burning nozzles get
    // an additive flame stretched along the exhaust and a snow blast where
    // the plume meets the pad
    if (torsoB && torsoB.mechRef && torsoB.mechRef.thrusters) {
      const mch2 = torsoB.mechRef;
      const tq = _bq; // torso quaternion already set above
      const nowT = performance.now() * 0.001;
      for (let ti2 = 0; ti2 < mch2.thrusters.length && mi < 96; ti2++) {
        const th = mch2.thrusters[ti2];
        const mp = new THREE.Vector3(th.p.x, th.p.y, th.p.z).applyQuaternion(tq);
        const mx = torsoB.pos.x + mp.x, my = torsoB.pos.y + mp.y, mz = torsoB.pos.z + mp.z;
        _plDir.set(th.e.x, th.e.y, th.e.z).applyQuaternion(tq);
        _plQ.setFromUnitVectors(_plUp, _plDir);
        writeInst(mechMesh, mi, mx, my, mz, _plQ, 0.30, 0.38, 0.30); // bell, aimed along its exhaust
        if (mechMesh.setColorAt) mechMesh.setColorAt(mi, MECH_FOOT_C);
        mi++;
        if (th.cur > 0.03 && pli < 18) {
          const flick = 0.86 + 0.14 * Math.sin(nowT * 31 + ti2 * 2.1) * Math.sin(nowT * 17.3 + ti2);
          const len = (0.9 + 3.4 * th.cur) * flick;
          // sheath cone: base at the bell, tip trailing away
          plumeMesh.setColorAt && plumeMesh.setColorAt(pli, PLUME_SHEATH);
          writeInst(plumeMesh, pli, mx + _plDir.x * len * 0.5, my + _plDir.y * len * 0.5, mz + _plDir.z * len * 0.5, _plQ, 0.42 + 0.25 * th.cur, len, 0.42 + 0.25 * th.cur);
          pli++;
          // hot core, shorter and thin
          if (pli < 18) {
            const lc = len * 0.55;
            plumeMesh.setColorAt && plumeMesh.setColorAt(pli, PLUME_CORE);
            writeInst(plumeMesh, pli, mx + _plDir.x * lc * 0.5, my + _plDir.y * lc * 0.5, mz + _plDir.z * lc * 0.5, _plQ, 0.20 + 0.1 * th.cur, lc, 0.20 + 0.1 * th.cur);
            pli++;
          }
          // snow blast where the plume meets the pad: a soft splash disc
          // plus tumbling chips thrown outward, all animated render-side
          if (_plDir.y < -0.2) {
            const tGround = (my - world.field.heightAt(mx, mz)) / -_plDir.y;
            if (tGround < 4.5) {
              const gx = mx + _plDir.x * tGround, gz = mz + _plDir.z * tGround;
              const gy = world.field.heightAt(gx, gz);
              if (pli < 18) {
                const r2 = (0.9 + 1.7 * th.cur) * (0.9 + 0.2 * Math.sin(nowT * 23 + ti2 * 3.3));
                plumeMesh.setColorAt && plumeMesh.setColorAt(pli, PLUME_SNOW);
                _plQ.setFromUnitVectors(_plUp, _plDir); // reuse; disc lies flat via squash
                writeInst(plumeMesh, pli, gx, gy + 0.10, gz, null, r2, 0.18, r2);
                pli++;
              }
              for (let ci = 0; ci < 3 && sni < 24; ci++) {
                const ph3 = nowT * (2.2 + ci * 0.7) + ti2 * 2.3 + ci * 2.1;
                const fr = ph3 % 1;
                const ang3 = ci * 2.094 + ti2 * 0.9 + Math.floor(ph3) * 1.7;
                const rr = (0.5 + 1.5 * fr) * (0.8 + th.cur);
                const sy = gy + (0.9 * fr - 0.9 * fr * fr) * 2.4 * (0.5 + th.cur); // ballistic hop
                _swq.setFromAxisAngle(_plUp, ph3 * 4.1);
                writeInst(snowMesh, sni, gx + Math.cos(ang3) * rr, sy + 0.1, gz + Math.sin(ang3) * rr, _swq, 1 - 0.6 * fr, 1 - 0.6 * fr, 1 - 0.6 * fr);
                sni++;
              }
            }
          }
        }
      }
    }
    }
    snowMesh.count = sni; snowMesh.instanceMatrix.needsUpdate = true;
    plumeMesh.count = pli; plumeMesh.instanceMatrix.needsUpdate = true;
    if (plumeMesh.instanceColor) plumeMesh.instanceColor.needsUpdate = true;
    mechMesh.count = mi; mechMesh.instanceMatrix.needsUpdate = true;
    if (mechMesh.instanceColor) mechMesh.instanceColor.needsUpdate = true;
    // ice plates — tinted by how close their welds are to failing (shock or creep)
    let ip = 0;
    if (world.ice) {
      for (const b of world.bodies) {
        if (b.kind !== "ice" || ip >= 80) continue;
        writeInst(iceMesh, ip, b.pos.x, b.pos.y, b.pos.z, b.q, b.hx * 2, b.hy * 2, b.hz * 2);
        let r = 0;
        for (const wd of world.welds) {
          if (wd.broken || (wd.a !== b && wd.b !== b)) continue;
          // danger begins at the creep threshold; full slate is the creep countdown itself
          const sr = Math.max(((wd.stress || 0) / ICE_CREEP) * 0.75, (wd.hiT || 0) / ICE_CREEP_T);
          if (sr > r) r = sr;
        }
        r = Math.pow(Math.min(1, r), 0.6);
        r = Math.max(r, _iceR[ip] - 3.0 * dt);
        _iceR[ip] = r;
        _iceC.setRGB(0.851 + (0.329 - 0.851) * r, 0.929 + (0.42 - 0.929) * r, 0.965 + (0.49 - 0.965) * r);
        iceMesh.setColorAt(ip, _iceC);
        ip++;
      }
      if (iceMesh.instanceColor) iceMesh.instanceColor.needsUpdate = true;
    }
    iceMesh.count = ip; iceMesh.instanceMatrix.needsUpdate = true;
    // debris/smoke/fire step
    let di = 0;
    for (let i = debris.length - 1; i >= 0; i--) {
      const p = debris[i];
      p.life -= dt; p.vy -= 9.8 * dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.rot += p.spin * dt;
      const h = F.heightAt(p.x, p.z);
      if (p.y < h + 0.09) { p.y = h + 0.09; p.vy *= -0.3; p.vx *= 0.6; p.vz *= 0.6; p.spin *= 0.5; }
      if (p.life <= 0) { debris.splice(i, 1); continue; }
      const s = Math.min(1, p.life * 2);
      dummy.position.set(p.x, p.y, p.z); dummy.quaternion.setFromEuler(new THREE.Euler(p.rot, p.rot * 0.7, 0));
      dummy.scale.set(s, s, s); dummy.updateMatrix();
      if (di < 200) chunkFillDebris(di++, dummy.matrix);
    }
    function chunkFillDebris(i, m) { debrisMesh.setMatrixAt(i, m); }
    debrisMesh.count = di; debrisMesh.instanceMatrix.needsUpdate = true;
    let si = 0;
    for (let i = smoke.length - 1; i >= 0; i--) {
      const p = smoke[i];
      p.age += dt; p.y += p.vy * dt;
      // mk2.12: cloud particles ride the wind and thin downwind.
      if (p.drift && world.wind) { p.x += world.wind.x * 0.35 * dt; p.z += world.wind.z * 0.35 * dt; }
      if (p.age >= p.life) { smoke.splice(i, 1); continue; }
      const t = p.age / p.life, s = p.s * (0.6 + t * 1.8);
      dummy.position.set(p.x, p.y, p.z); dummy.quaternion.copy(camQ);
      dummy.scale.set(s, s, 1); dummy.updateMatrix();
      if (si < SMOKE_CAP) { smokeMesh.setColorAt(si, p.drift ? SMOKE_WHITE : SMOKE_GREY); smokeMesh.setMatrixAt(si++, dummy.matrix); }
    }
    smokeMesh.count = si; smokeMesh.instanceMatrix.needsUpdate = true;
    if (smokeMesh.instanceColor) smokeMesh.instanceColor.needsUpdate = true;
    let fi = 0;
    for (let i = fire.length - 1; i >= 0; i--) {
      const p = fire[i];
      p.age += dt;
      if (p.age >= p.life) { fire.splice(i, 1); continue; }
      const t = 1 - p.age / p.life, s = p.s * (0.7 + t);
      dummy.position.set(p.x, p.y, p.z); dummy.quaternion.copy(camQ);
      dummy.scale.set(s, s, 1); dummy.updateMatrix();
      if (fi < 96) fireMesh.setMatrixAt(fi++, dummy.matrix);
    }
    fireMesh.count = fi; fireMesh.instanceMatrix.needsUpdate = true;
    writeBolts(dt);
    // tracers from live projectiles
    let ti = 0, ri = 0;
    for (const p of world.projectiles) {
      if (p.spec.delay && p.spec.delay > 0) continue;
      const L = Math.hypot(p.v.x, p.v.y, p.v.z) || 1;
      dummy.position.set(p.pos.x, p.pos.y, p.pos.z);
      dummy.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(p.v.x / L, p.v.y / L, p.v.z / L));
      // DIVERGENCE from the frozen demo's uniform tracers: rockets and tagged
      // MG tracer rounds draw long and thick so a volley reads as six incoming
      // things; untagged MG rounds draw short and thin so the stream has
      // rhythm instead of noise. p.tracer is set by the campaign action layer.
      const kind = p.spec.kind;
      if (kind === "rocket") {
        if (ri >= 16) continue;
        const rMin = Math.max(1, 1.35 / zoom);
        dummy.scale.set(2.6 * rMin, 2.6 * rMin, 4.2);
        dummy.updateMatrix();
        rocketMesh.setMatrixAt(ri, dummy.matrix);
        if (rocketMesh.setColorAt) rocketMesh.setColorAt(ri, p.v.y > 0 ? RKT_ORANGE : RKT_RED);
        ri++;
        continue;
      }
      if (ti >= 64) continue;
      // screen-space floor: zoomed out, a world-accurate round vanishes —
      // thickness grows with 1/zoom so ammo never drops under ~2px
      const sMin = Math.max(1, 1.35 / zoom);
      const th = (p.tracer ? 2.2 : kind === "mg" ? 0.7 : 1) * sMin;
      const ln = (p.tracer ? 3.2 : kind === "mg" ? 1.1 : 1.8) * Math.max(1, sMin * 0.8);
      dummy.scale.set(th, th, ln);
      dummy.updateMatrix();
      if (tracerMesh.setColorAt) tracerMesh.setColorAt(ti, p.tracer ? TRC_BRIGHT : kind === "mg" ? TRC_MG : TRC_SHELL);
      tracerMesh.setMatrixAt(ti, dummy.matrix);
      haloMesh.setMatrixAt(ti++, dummy.matrix); // same pose; the geometry is fatter
    }
    tracerMesh.count = ti; tracerMesh.instanceMatrix.needsUpdate = true;
    haloMesh.count = ti; haloMesh.instanceMatrix.needsUpdate = true;
    if (tracerMesh.instanceColor) tracerMesh.instanceColor.needsUpdate = true;
    rocketMesh.count = ri; rocketMesh.instanceMatrix.needsUpdate = true;
    if (rocketMesh.instanceColor) rocketMesh.instanceColor.needsUpdate = true;
    // blob shadows for airborne bodies
    let bi = 0;
    for (const b of world.bodies) {
      if (bi >= 96 || b.invM === 0 || b.sleeping) continue;
      if (b.airT < 0.06) continue;
      const h = F.heightAt(b.pos.x, b.pos.z);
      dummy.position.set(b.pos.x, h + 0.04, b.pos.z);
      dummy.quaternion.setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
      const fp = Math.max(b.hx, b.hz) * 1.15;
      dummy.scale.set(fp, fp, 1); dummy.updateMatrix();
      blobMesh.setMatrixAt(bi++, dummy.matrix);
    }
    blobMesh.count = bi; blobMesh.instanceMatrix.needsUpdate = true;
    // survey stakes ring the flagged work site; pennants hold one wind
    // direction with a slow deterministic flutter off world time
    {
      const f = world.trialFocus;
      let si = 0;
      if (f && typeof f.r === "number") {
        const rr = f.r * 0.92;
        for (; si < 6; si++) {
          const a = si * (Math.PI / 3);
          const sx = f.x + Math.cos(a) * rr, sz = f.z + Math.sin(a) * rr;
          const gy = F.heightAt(sx, sz);
          dummy.position.set(sx, gy + 0.7, sz);
          dummy.quaternion.setFromAxisAngle(_stakeUp, 0.7 + Math.sin(world.t * 2.6 + si * 1.7) * 0.24);
          dummy.scale.set(1, 1, 1);
          dummy.updateMatrix();
          stakeMesh.setMatrixAt(si, dummy.matrix);
          dummy.position.y = gy + 1.26;
          dummy.updateMatrix();
          pennantMesh.setMatrixAt(si, dummy.matrix);
        }
      }
      stakeMesh.count = si; stakeMesh.instanceMatrix.needsUpdate = true;
      pennantMesh.count = si; pennantMesh.instanceMatrix.needsUpdate = true;
    }
    // depot flags — wind-driven, only when world.wind exists
    {
      let fi = 0;
      const wind = world.wind;
      if (wind) {
        const heading = Math.atan2(wind.z, wind.x);
        const mag = wind.mag || 0;
        const amp = Math.min(0.55, mag * 0.13); // no floor: dead calm = limp cloth // provisional (F5)
        const stiff = 2.2 + mag * 0.9; // stronger wind = faster flutter (looser stiffness reads as quicker snap)
        for (const b of world.bodies) {
          if (!b.flagPole || fi >= 192) continue;
          dummy.position.set(b.pos.x, b.pos.y + 1.3, b.pos.z);
          dummy.quaternion.identity();
          dummy.scale.set(1, 1, 1);
          dummy.updateMatrix();
          flagPoleMesh.setMatrixAt(fi, dummy.matrix);
          const phase = b.pos.x * 2.3 + b.pos.z * 1.9; // deterministic per-position flutter, no rng
          const flutter = Math.sin(world.t * stiff + phase) * amp;
          _flagQ1.setFromAxisAngle(_flagUp, heading);
          _flagQ2.setFromAxisAngle(_flagUp, flutter);
          dummy.quaternion.copy(_flagQ1).multiply(_flagQ2);
          dummy.position.set(b.pos.x, b.pos.y + 2.2, b.pos.z);
          dummy.scale.set(1, 1, 1 + Math.abs(flutter) * 0.3);
          dummy.updateMatrix();
          flagClothMesh.setMatrixAt(fi, dummy.matrix);
          flagClothMesh.setColorAt(fi, b.team === 2 ? _flagEnemyMult : _flagWhite);
          fi++;
        }
        // mk2.50: the town's holder flags — same pole, same cloth, same
        // wind; f.y is the building's roof height (game-layer supplied).
        for (const f of townFlags) {
          if (fi >= 192) break;
          dummy.position.set(f.x, f.y + 1.3, f.z);
          dummy.quaternion.identity();
          dummy.scale.set(1, 1, 1);
          dummy.updateMatrix();
          flagPoleMesh.setMatrixAt(fi, dummy.matrix);
          const phase = f.x * 2.3 + f.z * 1.9;
          const flutter = Math.sin(world.t * stiff + phase) * amp;
          _flagQ1.setFromAxisAngle(_flagUp, heading);
          _flagQ2.setFromAxisAngle(_flagUp, flutter);
          dummy.quaternion.copy(_flagQ1).multiply(_flagQ2);
          dummy.position.set(f.x, f.y + 2.2, f.z);
          dummy.scale.set(1, 1, 1 + Math.abs(flutter) * 0.3);
          dummy.updateMatrix();
          flagClothMesh.setMatrixAt(fi, dummy.matrix);
          flagClothMesh.setColorAt(fi, f.team === 2 ? _flagEnemyMult : _flagWhite);
          fi++;
        }
        if (flagClothMesh.instanceColor) flagClothMesh.instanceColor.needsUpdate = true;
      }
      flagPoleMesh.count = fi; flagPoleMesh.instanceMatrix.needsUpdate = true;
      flagClothMesh.count = fi; flagClothMesh.instanceMatrix.needsUpdate = true;
    }
    // snowfall drifts around the focus, wrapping in a 64x34x64 box
    for (let i = 0; i < flakes.length; i++) {
      const fk = flakes[i];
      fk.y -= fk.vy * dt;
      fk.x += Math.sin(fk.ph + fk.y * 0.4) * 0.35 * dt;
      if (fk.y < 0) { fk.y += 34; fk.x = (Math.random() - 0.5) * 64; fk.z = (Math.random() - 0.5) * 64; }
      writeInst(flakeMesh, i, focus.x + fk.x, focus.y + fk.y - 4, focus.z + fk.z, camQ, 1, 1, 1);
    }
    flakeMesh.count = flakes.length;
    flakeMesh.instanceMatrix.needsUpdate = true;

    // bison treads: scroll links with track speed, stamp marks into the splat
    const bb = world.byId.get(world.bisonId);
    const bmesh = bb ? vehMap.get(bb.id) : null;
    if (bb && bmesh && bmesh.userData.treadMats) {
      const fx = bb.R[6], fz = bb.R[8];
      const vF = bb.v.x * fx + bb.v.z * fz;
      const sL = vF + bb.w.y * 1.78, sR = vF - bb.w.y * 1.78;
      bmesh.userData.treadMats[0].map.offset.x -= sL * dt * 0.42;
      bmesh.userData.treadMats[1].map.offset.x -= sR * dt * 0.42;
      const sp = Math.hypot(bb.v.x, bb.v.z);
      if (bb.R[4] > 0.5 && sp > 0.5) {
        treadAcc += sp * dt;
        if (treadAcc > 0.34) {
          treadAcc = 0;
          const sxr = bb.R[0], szr = bb.R[2];
          for (const sgn of [-1, 1]) {
            const px = bb.pos.x + sxr * 1.78 * sgn, pz = bb.pos.z + szr * 1.78 * sgn;
            splat.tread(((px + F.half) / Wd) * 1024, ((pz + F.half) / Wd) * 1024);
          }
        }
      }
    }
    // reticle + beam + trial ring
    reticle.position.set(aim.x, F.heightAt(aim.x, aim.z) + 0.06, aim.z);
    const sk = world.strikeAt;
    if (sk && world.t < sk.until) {
      const ph = 1 - (sk.until - world.t) / 1.35;
      strikeRing.visible = true;
      strikeRing.position.set(sk.x, F.heightAt(sk.x, sk.z) + 0.08, sk.z);
      const sc = 1 + 0.35 * Math.sin(world.t * 18);
      strikeRing.scale.set(sc, sc, 1);
      strikeRing.material.opacity = 0.55 + 0.4 * (1 - ph);
    } else strikeRing.visible = false;
    // mk2.12: the davy ring travels
    if (davyFx) {
      const age = world.t - davyFx.t0;
      if (age > 1.0) { davyFx = null; davyRing.visible = false; }
      else {
        const rr = 2 + 28 * age;
        davyRing.visible = true;
        davyRing.position.set(davyFx.x, F.heightAt(davyFx.x, davyFx.z) + 0.25, davyFx.z);
        davyRing.scale.set(rr, rr, 1);
        davyRing.material.opacity = 0.9 * (1 - age);
      }
    }
    // camera: snap position to view texels; residual + shake go to screen shift
    shake = Math.max(0, shake - dt * 4.2);
    // yaw tween toward the commanded 90° step
    const yerr = yawTgt - yawA;
    const turning = Math.abs(yerr) > 0.0005;
    if (turning) {
      yawA += yerr * Math.min(1, dt * 6);
      if (Math.abs(yawTgt - yawA) <= 0.0005) yawA = yawTgt;
      applyYaw();
    }
    const texel = (2 * halfW) / rtW;
    // buildable-edge stroke B: half an RT pixel diagonal offset in camera
    // space — thickens the 1px WebGL line to ~1.5px on screen at any zoom or
    // yaw (texel already carries the current frustum/zoom; camRight/camUp
    // mutate with the yaw tween, so rotation is covered for free)
    if (edgeLineB) edgeLineB.position.set(0, 0, 0).addScaledVector(camRight, texel * 0.5).addScaledVector(camUp, texel * 0.5);
    const desired = { x: focus.x + back.x * camDist, y: focus.y + back.y * camDist, z: focus.z + back.z * camDist };
    const shx = (Math.random() - 0.5) * shake * 1.15, shy = (Math.random() - 0.5) * shake * 1.15;
    if (turning) {
      // mid-turn the texel snap would shimmer — ride the raw position
      cam.position.set(desired.x, desired.y, desired.z);
      cam.quaternion.copy(camQ);
      postMat.uniforms.uShift.value.set(shx, shy);
    } else {
      const sr = snapCam(desired, R3(camRight), R3(camUp), camFwd, texel);
      cam.position.set(sr.pos.x, sr.pos.y, sr.pos.z);
      cam.quaternion.copy(camQ);
      postMat.uniforms.uShift.value.set(-sr.errX + shx, -sr.errY + shy);
    }
    postMat.uniforms.uT.value = world.t; // aurora clock (inert at uGrade 0)
    // mk2.12: the flash holds a beat, then dies in about half a second.
    flashV = Math.max(0, flashV - dt * 2.2);
    postMat.uniforms.uFlash.value = Math.min(1, flashV);
    // sun rig follows focus
    sun.position.set(focus.x + 38, focus.y + 52, focus.z + 22);
    sun.target.position.set(focus.x, focus.y, focus.z);
    // pass 1: color+depth
    cam.layers.enable(1);
    renderer.setRenderTarget(rtColor);
    renderer.render(scene, cam);
    // pass 2: normals (layer 0 only)
    cam.layers.set(0);
    scene.overrideMaterial = normMat;
    const bg = scene.background; scene.background = NORM_BG;
    renderer.setRenderTarget(rtNormal);
    renderer.render(scene, cam);
    scene.overrideMaterial = null; scene.background = bg;
    cam.layers.enable(1);
    // pass 3: post to screen
    renderer.setRenderTarget(null);
    renderer.render(postScene, postCam);
  }
  function setWorld(nw) {
    world = nw;
    for (const [, g] of vehMap) scene.remove(g);
    vehMap.clear();
    debris.length = 0; smoke.length = 0; fire.length = 0;
    splat.clear();
    nextFadeT = world.t + FADE_EVERY;
    syncTerrain();
  }
  resize(); rebuildRTs();
  // THE GRADE (campaign-only): the runner sets [-1, 1]; everyone else
  // never calls this and keeps the shipped look exactly
  function setGrade(g) { postMat.uniforms.uGrade.value = Math.max(-1, Math.min(1, g || 0)); }
  const project = (x, y, z) => { const v = new THREE.Vector3(x, y, z); v.project(cam); return { x: v.x, y: v.y }; };
  return { render, consume, setGfx, setZoom, setWorld, setTraj, setGrade, gfx, overlay, setDressing, setRoads: (list) => splat.setRoads(list), setMines, setTownFlags, setGrenades, setGreenFog, rotateStep, rotateBy, updateTerritory, setFog, setHealth, getFogDebug, chunkStats: () => chunkStats, dispose() { renderer.dispose(); }, project, cameraPos: () => ({ x: cam.position.x, y: cam.position.y, z: cam.position.z }), smearLog: () => splat.log, smear: (u, v, style, wx, wz) => splat.smear(u, v, style, wx, wz), camBasis: { right: camRight, up: camUp, fwd: camFwd, halfW: () => halfW, halfH: () => halfH } };
}
