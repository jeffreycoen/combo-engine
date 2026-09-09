# Task 0.1.2-5 — space as deadweight draws it

One job: space is drawn as deadweight draws it, in a screen file of the page's own. The warped grid with the wells' pits, the worlds as faceted planets in their pits by climate with an atmosphere and a sun-side rim, the sun with its glow and its kill ring, the hole with its turning disc and its edge, the lanes, the gate as lit posts, the ship as deadweight's prisms with a coupler on every weld and plumes when it burns, its heading and its velocity, the balance mark, the coast line ahead, wrecks and pirates as prisms, the grapple line, the ship panel with its modules and welds, and the map of the galaxy. The page's main file keeps the camera, the panes, and the controls and draws nothing of space itself. One check joins the ark's gate; the phase lands with this task and the version goes to 0.1.2. Every edit is an anchored replacement or a marked cut checked by hash; write exactly what is written, run the listed gates, report. You design nothing.

Suggested model: Sonnet 5.

Required reading, in order (confirm at the top of your report):
1. This file, whole.
2. `docs/plans/phase-0.1.2-the-findings.md`, whole.

Source of the drawing, reference only, never opened by this task: `deadweight-hangar.html` lines 898 to 1461. Nothing under `/home/batman/coldsnap` is read, written, or run.

## Steps

Run from `/home/batman/combo-engine`. A failed assert, a wrong required value, or a FAILED hash line stops the task: report the step and its verbatim output, run nothing further. Never edit a file to make a hash match.

1. Assert the ground: the tracked files clean at task 4's landing, the five files this task edits at their landed hashes, the new file absent. The gates were recorded green at that landing and are not run again here.

```sh
git status --short | grep -v "^??" | wc -l
while read -r hash path; do test "$(sha256sum "$path" | cut -c1-16)" = "$hash" && echo "OK $path" || echo "FAILED $path"; done <<'GROUND'
0dbdfbab0457c407 docs/gravitys-ark/main.js
543338674b7c5a73 scripts/gravitys-ark-test.mjs
3d4be15a542e051d README.md
29101869bb488688 docs/parts/parts-source.json
6584836d9d10ff75 package.json
GROUND
ls docs/gravitys-ark/space.js 2>/dev/null || echo absent
```

Required: `0`, five OK lines, `absent`.

2. The space screen, a new file of the page, written exactly. Syntax check; the hash line must print OK.

```sh
cat > docs/gravitys-ark/space.js <<'ARK_SPACE_EOF'
// GRAVITY'S ARK — space.js: the space screen, phase 0.1.2. Deadweight's flight drawing
// carried onto the ark's own space: the warped grid with the wells' pits, the worlds as
// faceted planets in their pits with an atmosphere and a sun-side rim, the sun with its
// glow and its kill ring, the hole with its turning disc and its edge, the lanes, the gate
// as lit posts, the ship as deadweight's prisms with a coupler on every weld, its plumes
// when it burns, its heading and its velocity, the balance mark, the coast line ahead, the
// wrecks and the pirates as prisms, the grapple line, the ship panel with its modules and
// welds, and the map of the galaxy. SHAPED from deadweight-hangar.html lines 898 to 1461
// with the ark's data; the grid, the pits, and the projection are the render2d module's,
// lifted from the same demo earlier. The page's main file keeps the hookup lines and the
// panes; this file draws and nothing more. Every number of the ark's own is PROPOSED.
import { makeRender2d } from "../../src/modules/render2d/render2d.js";
import { accel } from "../../src/modules/wells/wells.js";
import { SHAPE } from "../../src/games/gravitys-ark/ground.js";
import { OLETTER } from "./hull-look.js";

const TAU = Math.PI * 2, C30 = Math.cos(Math.PI / 6), S30 = 0.5;
// the demo's palette in the dark theme, the ark's night; the module colours as the ground's look wears them
const PAL = { bg: "#07090d", net: "80,96,122", grav: "62,100,232", ink: "228,234,246", glass: "rgba(20,25,33,.92)" };
const ORIGIN = { clo: ["#5b82c8", "#33507e"], hol: ["#9a7a52", "#5e4a30"], sal: ["#c2704a", "#7a4228"], gen: ["#8b93a0", "#4d5560"] };
const AW = "rgba(255,255,255,.92)", AW2 = "rgba(255,255,255,.55)", AK = "rgba(0,0,0,.55)";
// the worlds by climate: each a palette in the demo's shape, hi, mid, lo, band, and an atmosphere
const CLIMATE = {
  SNOW: { atm: "rgba(180,210,240,.18)", hi: [236, 244, 250], mid: [190, 206, 222], lo: [110, 128, 150], band: [214, 226, 238], cap: [250, 252, 255] },
  ASH: { atm: "rgba(120,120,130,.16)", hi: [190, 186, 182], mid: [126, 122, 118], lo: [58, 56, 54], band: [104, 100, 96], cap: [150, 146, 142] },
  MUD: { atm: "rgba(196,122,61,.18)", hi: [236, 183, 130], mid: [201, 138, 82], lo: [122, 70, 32], band: [168, 101, 58], cap: [222, 170, 120] },
  ROCK: { atm: "rgba(150,140,130,.15)", hi: [206, 194, 178], mid: [160, 148, 132], lo: [84, 74, 62], band: [130, 118, 104], cap: [180, 168, 152] },
  WOOD: { atm: "rgba(70,140,110,.17)", hi: [168, 212, 176], mid: [79, 138, 74], lo: [36, 74, 46], band: [66, 118, 66], cap: [201, 228, 210], sea: [46, 81, 107] },
};
const STAR_COL = ["#fff6dc", "#ffd27a", "#ff9a4a", "#ff5a3a", "#c8302a"];   // whiter to redder, one step per takeoff
const SHIP_PX = 16, WRECK_PX = 9, PIRATE_PX = 8;   // the ship's pitch on the screen, and a wreck's and a pirate's size, in pixels at any zoom
const COAST = { dt: 0.75, steps: 480, every: 4, minV: 1 }, MAP_COAST = { dt: 2, steps: 900, every: 6 };   // the coast line ahead: six minutes; the map's: thirty

// makeSpaceScreen(cv, ctx, opts): the screen over the page's flat canvas. opts.cam seeds the camera.
export function makeSpaceScreen(cv, ctx, opts) {
  const R = makeRender2d({ ctx, wells: [], deep: 1300, gridR: 44, gridSp: 5000, cam: opts.cam, pal: { net: PAL.net, grav: PAL.grav } });
  let W = 0, H = 0, T = 0;
  const iso = (x, y, h) => R.project(x, y, h);

  // prismAt: the demo's prism, a box seen from above with its four sides and its top, at a heading
  function prismAt(x, y, ang, w2, d2, Hh, top, side) {
    const c = Math.cos(ang), s = Math.sin(ang);
    const P = [[-w2, -d2], [w2, -d2], [w2, d2], [-w2, d2]].map(([a, b]) => [x + a * c - b * s, y + a * s + b * c]);
    const G = P.map(([a, b]) => iso(a, b, 0)), Tp = P.map(([a, b]) => iso(a, b, Hh));
    ctx.fillStyle = side;
    for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; if ((G[i][1] + G[j][1]) / 2 < (Tp[i][1] + Tp[j][1]) / 2) continue;
      ctx.beginPath(); ctx.moveTo(G[i][0], G[i][1]); ctx.lineTo(G[j][0], G[j][1]); ctx.lineTo(Tp[j][0], Tp[j][1]); ctx.lineTo(Tp[i][0], Tp[i][1]); ctx.closePath(); ctx.fill(); }
    ctx.fillStyle = top; ctx.beginPath(); Tp.forEach(([a, b], i) => (i ? ctx.lineTo(a, b) : ctx.moveTo(a, b))); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "rgba(20,24,32,.4)"; ctx.lineWidth = 1.1; ctx.stroke(); return Tp;
  }
  // glyph: the demo's type accent, white ink, on a top face seen from above
  function glyph(t, cx, cy, s, rot) {
    const c2 = ctx;
    c2.save(); c2.translate(cx, cy); c2.scale(s / 22, s / 22 * 0.72); if (rot) c2.rotate(rot); c2.lineCap = "round";
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
  // drawModule: the demo's module at a world point with a heading, its prism at the given scale (world units per demo unit)
  function drawModule(t, x, y, ang, k, list, m) {
    const OC = ORIGIN[(m && m.org) || "gen"];
    if (t === "strut") {
      let horiz = true;
      if (list && m) { horiz = list.some((m2) => Math.abs(m2.gx - m.gx) === 1 && m2.gy === m.gy);
        if (!horiz && !list.some((m2) => m2.gx === m.gx && Math.abs(m2.gy - m.gy) === 1)) horiz = true; }
      prismAt(x, y, ang, (horiz ? 2.0 : 0.6) * k, (horiz ? 0.6 : 2.0) * k, 0.7 * k, OC[0], OC[1]);
      return;
    }
    const S = SHAPE[t] || [1.7, 1.7, 1.5];
    prismAt(x, y, ang, S[0] * k, S[1] * k, S[2] * k, OC[0], OC[1]);
    const [tx, ty] = iso(x, y, S[2] * k + 0.05 * k);
    const gs = Math.min(26, S[0] * k * R.cam.z * 1.15);
    glyph(t, tx, ty, gs, t === "engine" ? ang : 0);
    if (gs > 13 && OLETTER[t]) { ctx.fillStyle = "rgba(255,255,255,.85)"; ctx.font = "700 " + Math.max(6, gs * 0.3) + "px -apple-system,sans-serif"; ctx.textAlign = "left"; ctx.fillText(OLETTER[t], tx + gs * 0.34, ty + gs * 0.42); }
  }
  // drawCoupler: the demo's joint between two module centres, its prism and its amber ring
  function drawCoupler(ax, ay, bx, by, k) {
    const mx = (ax + bx) / 2, my2 = (ay + by) / 2, axAng = Math.atan2(by - ay, bx - ax);
    prismAt(mx, my2, axAng, 1.15 * k, 0.5 * k, 0.95 * k, "#2c343f", "#181e26");
    const [qx, qy] = iso(mx, my2, 1.0 * k);
    ctx.strokeStyle = "rgba(233,178,92,.8)"; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.ellipse(qx, qy, 2.6, 1.4, -0.5, 0, TAU); ctx.stroke();
  }
  // comSym: the demo's balance mark, a quartered disc
  function comSym(x, y, h) {
    const [px, py] = iso(x, y, h), r = 5;
    ctx.save(); ctx.lineWidth = 1.4; ctx.strokeStyle = "#1d222b"; ctx.fillStyle = "#1d222b";
    ctx.beginPath(); ctx.moveTo(px, py); ctx.arc(px, py, r, 0, Math.PI / 2); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(px, py); ctx.arc(px, py, r, Math.PI, Math.PI * 1.5); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.moveTo(px, py); ctx.arc(px, py, r, Math.PI / 2, Math.PI); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(px, py); ctx.arc(px, py, r, Math.PI * 1.5, TAU); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.arc(px, py, r, 0, TAU); ctx.stroke(); ctx.restore();
  }
  function label(t, x, y, col) { ctx.font = "700 9px -apple-system,sans-serif"; ctx.fillStyle = col || "rgba(233,237,242,.7)"; ctx.textAlign = "center"; ctx.fillText(t, x, y); ctx.textAlign = "left"; }
  function shadow(x, y, r, a) { const [sx, sy] = iso(x, y, 0); const g2 = ctx.createRadialGradient(sx, sy + 2, 1, sx, sy + 2, r);
    g2.addColorStop(0, "rgba(40,48,64," + a + ")"); g2.addColorStop(1, "rgba(40,48,64,0)"); ctx.fillStyle = g2; ctx.beginPath(); ctx.ellipse(sx, sy + 2, r, r * 0.5, 0, 0, TAU); ctx.fill(); }

  // planet: the demo's faceted body in its pit, lit from one side, with an atmosphere and a rim toward the sun
  function planet(w, star, isEdge) {
    const z = R.cam.z, rp = Math.max(4, w.r * z);
    R.potLock = Math.max(0, R.pot(w.x, w.y) - rp * 0.62);
    const [cx, cy] = iso(w.x, w.y, 0);
    const C = CLIMATE[w.climate] || CLIMATE.ROCK;
    const ag = ctx.createRadialGradient(cx, cy, rp * 0.6, cx, cy, rp * 2.2);
    ag.addColorStop(0, C.atm); ag.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = ag; ctx.beginPath(); ctx.ellipse(cx, cy, rp * 2.2, rp * 2.2 * 0.8, 0, 0, TAU); ctx.fill();
    const fine = rp >= 30, LA = fine ? 9 : 6, LO = fine ? 16 : 10, spin = T * 0.04 + w.i * 0.7;
    let Lx3 = -0.50, Ly3 = 0.62, Lz3 = 0.60; const Ln = Math.hypot(Lx3, Ly3, Lz3); Lx3 /= Ln; Ly3 /= Ln; Lz3 /= Ln;
    const P = (la, lo) => { const sy = Math.cos(la), sr = Math.sin(la); const x = sr * Math.cos(lo), zz = sr * Math.sin(lo); return { x, y: sy, z: zz, px: cx + x * rp, py: cy - sy * rp }; };
    for (let i = 0; i < LA; i++) {
      const la0 = (i / LA) * Math.PI, la1 = ((i + 1) / LA) * Math.PI;
      for (let j = 0; j < LO; j++) {
        const lo0 = (j / LO) * TAU + spin, lo1 = ((j + 1) / LO) * TAU + spin;
        const a = P(la0, lo0), b = P(la0, lo1), c = P(la1, lo1), d2 = P(la1, lo0);
        const nz = (a.z + b.z + c.z + d2.z) / 4;
        if (nz <= 0.02) continue;
        const nx = (a.x + b.x + c.x + d2.x) / 4, ny = (a.y + b.y + c.y + d2.y) / 4, nl = Math.hypot(nx, ny, nz) || 1;
        const sh = Math.max(0, (nx / nl) * Lx3 + (ny / nl) * Ly3 + (nz / nl) * Lz3);
        let base = i % 2 ? C.band : C.mid;
        if (i < 1 || i >= LA - 1) base = C.cap;
        else if (C.sea && Math.sin(i * 3.1 + j * 5.3) > 0.55) base = C.sea;
        const t2 = 0.35 + 0.65 * sh, hi = Math.max(0, sh - 0.75) * 1.6;
        const R2 = Math.round(C.lo[0] + (base[0] - C.lo[0]) * t2 + (C.hi[0] - base[0]) * hi);
        const G2 = Math.round(C.lo[1] + (base[1] - C.lo[1]) * t2 + (C.hi[1] - base[1]) * hi);
        const B2 = Math.round(C.lo[2] + (base[2] - C.lo[2]) * t2 + (C.hi[2] - base[2]) * hi);
        ctx.fillStyle = "rgb(" + R2 + "," + G2 + "," + B2 + ")";
        ctx.beginPath(); ctx.moveTo(a.px, a.py); ctx.lineTo(b.px, b.py); ctx.lineTo(c.px, c.py); ctx.lineTo(d2.px, d2.py); ctx.closePath(); ctx.fill();
        if (fine) { ctx.strokeStyle = "rgba(20,24,32,.16)"; ctx.lineWidth = 0.5; ctx.stroke(); }
      }
    }
    const la2 = Math.atan2(star.y - w.y, star.x - w.x);
    const [lsx, lsy] = iso(w.x + Math.cos(la2) * 10, w.y + Math.sin(la2) * 10, 0);
    const sA = Math.atan2(lsy - cy, lsx - cx);
    ctx.strokeStyle = "rgba(255,236,200,.35)"; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(cx, cy, rp * 1.0, sA - 0.9, sA + 0.9); ctx.stroke();
    if (z >= 0.003) label(w.id + " " + w.climate.toLowerCase() + (w.holder ? " " + w.holder : ""), cx, cy + rp + 14);
    if (isEdge) label("EDGE", cx, cy - rp - 8, "#ff5a3a");
    R.potLock = false;
  }
  // gone: a world the hole took, a dark disc where it was
  function gone(w) {
    const rp = Math.max(4, w.r * R.cam.z); R.potLock = Math.max(0, R.pot(w.x, w.y) - rp * 0.62);
    const [cx, cy] = iso(w.x, w.y, 0);
    ctx.fillStyle = "#1a1c22"; ctx.beginPath(); ctx.arc(cx, cy, rp, 0, TAU); ctx.fill();
    ctx.strokeStyle = "rgba(233,237,242,.15)"; ctx.lineWidth = 1; ctx.stroke();
    if (R.cam.z >= 0.003) label("gone " + w.id, cx, cy + rp + 14, "rgba(233,237,242,.35)");
    R.potLock = false;
  }
  // sun: the demo's sun, its glow, its body, and its kill ring riding the pit; after the collapse the hole, its turning disc and its edge
  function sun(star, hole, takeoffs) {
    const z = R.cam.z, rp = Math.max(6, star.r * z);
    if (!hole.born) {
      R.potLock = Math.max(0, R.pot(star.x, star.y) - rp * 0.6);
      const [cx, cy] = iso(star.x, star.y, 0);
      const co = ctx.createRadialGradient(cx, cy, rp * 0.4, cx, cy, rp * 2.6); co.addColorStop(0, "rgba(240,180,90,.5)"); co.addColorStop(1, "rgba(240,180,90,0)");
      ctx.fillStyle = co; ctx.beginPath(); ctx.ellipse(cx, cy, rp * 2.6, rp * 2.6 * 0.72, 0, 0, TAU); ctx.fill();
      const bg = ctx.createRadialGradient(cx, cy, 1, cx, cy, rp); bg.addColorStop(0, "#fff6e8"); bg.addColorStop(0.5, STAR_COL[Math.min(4, takeoffs)]); bg.addColorStop(1, "#c47a3d");
      ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(cx, cy, rp, 0, TAU); ctx.fill();
      const pl = R.potLock; R.potLock = false;
      ctx.beginPath();
      for (let i = 0; i <= 48; i++) { const a2 = i / 48 * TAU; const [qx, qy] = iso(star.x + Math.cos(a2) * star.r, star.y + Math.sin(a2) * star.r, 0); i ? ctx.lineTo(qx, qy) : ctx.moveTo(qx, qy); }
      ctx.closePath(); ctx.fillStyle = "rgba(192,57,43,.08)"; ctx.fill();
      ctx.setLineDash([4, 5]); ctx.strokeStyle = "rgba(192,57,43,.75)"; ctx.lineWidth = 1.8; ctx.stroke(); ctx.setLineDash([]);
      R.potLock = pl;
      label("THE SUN", cx, cy - rp * 2.7);
      R.potLock = false;
      return;
    }
    R.potLock = R.pot(star.x, star.y) - z * 7;
    const [cx, cy] = iso(star.x, star.y, 0);
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(T * 0.6);
    ctx.strokeStyle = "rgba(140,170,255,.6)"; ctx.lineWidth = 2; ctx.setLineDash([9, 6]);
    ctx.beginPath(); ctx.ellipse(0, 0, Math.max(26, rp * 2.4), Math.max(8, rp * 0.75), 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]); ctx.restore();
    ctx.fillStyle = "#0a0c10"; ctx.beginPath(); ctx.arc(cx, cy, Math.max(11, rp), 0, TAU); ctx.fill();
    ctx.strokeStyle = "rgba(233,237,242,.5)"; ctx.lineWidth = 1; ctx.stroke();
    R.potLock = false;
    ctx.strokeStyle = "rgba(200,48,42,.55)"; ctx.setLineDash([4, 6]); ctx.lineWidth = 1; ctx.beginPath();
    for (let k = 0; k <= 72; k++) { const a = k / 72 * TAU, e = hole.edge; const p = iso(star.x + Math.cos(a) * e, star.y + Math.sin(a) * e, 0); k ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); }
    ctx.stroke(); ctx.setLineDash([]);
    label("THE HOLE", cx, cy - Math.max(11, rp) - 12);
  }
  // fieldRings: where a well bites, four rings on the net
  function fieldRings(wells) {
    for (const q of wells) {
      const base = q.r;
      for (let k = 0; k < 4; k++) {
        const r = base * [1.3, 1.9, 2.8, 4.0][k];
        ctx.strokeStyle = "rgba(138,90,16," + [0.22, 0.15, 0.10, 0.06][k] + ")"; ctx.lineWidth = k === 0 ? 1.6 : 1;
        ctx.beginPath();
        for (let i = 0; i <= 28; i++) { const a2 = i / 28 * TAU; const [px2, py2] = iso(q.x + Math.cos(a2) * r, q.y + Math.sin(a2) * r, 0); i ? ctx.lineTo(px2, py2) : ctx.moveTo(px2, py2); }
        ctx.stroke();
      }
    }
  }
  // gate: the demo's lit posts and lintel where the galaxy's gate stands
  function gate(g) {
    const pu = 0.5 + 0.5 * Math.sin(T * 2.5), hw = 30;
    const c = iso(g.x, g.y, 0), b1 = [c[0] - hw, c[1]], b2 = [c[0] + hw, c[1]], t1 = [b1[0], b1[1] - 30], t2 = [b2[0], b2[1] - 30];
    ctx.save(); ctx.shadowColor = "rgba(30,140,70,.4)"; ctx.shadowBlur = 14;
    ctx.fillStyle = "rgba(30,140,70," + (0.08 + pu * 0.05) + ")";
    ctx.beginPath(); ctx.moveTo(b1[0], b1[1]); ctx.lineTo(t1[0], t1[1]); ctx.lineTo(t2[0], t2[1]); ctx.lineTo(b2[0], b2[1]); ctx.closePath(); ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = "rgba(30,140,70," + (0.55 + pu * 0.25) + ")";
    ctx.beginPath(); ctx.moveTo(b1[0], b1[1]); ctx.lineTo(t1[0], t1[1]); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(b2[0], b2[1]); ctx.lineTo(t2[0], t2[1]); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(t1[0], t1[1]); ctx.lineTo(t2[0], t2[1]); ctx.stroke(); ctx.restore();
    label("GATE", c[0], t1[1] - 8, "#a9e0ac");
  }
  // shipWorld: the ship's modules laid on its own grid around its balance point, at the screen's pitch, turned to its heading
  function shipWorld(S) {
    const P = SHIP_PX / R.cam.z, k = P / 4, c = Math.cos(S.heading), s = Math.sin(S.heading);
    const at = (m) => { const lx = (m.gx - S.balance.gx) * P, ly = (m.gy - S.balance.gy) * P; return [S.ship.x + lx * c - ly * s, S.ship.y + lx * s + ly * c]; };
    return { P, k, at };
  }
  // plumes: the demo's layered bloom behind every engine while the ship burns, along the burn's own line
  function plumes(S, sw) {
    if (!S.burning || S.ship.fuel <= 0) return;
    const nx = -S.aim[0], ny = -S.aim[1], k = sw.k;
    S.hull.list.forEach((m, i) => {
      if (m.t !== "engine") return;
      const [mx, my] = sw.at(m);
      const f = (0.85 + 0.15 * Math.sin(T * 34 + m.gx * 3));
      const [ex, ey] = iso(mx + 2.4 * k * nx, my + 2.4 * k * ny, 0.8 * k);
      const [tx2, ty2] = iso(mx + (2.4 + 13 * f) * k * nx, my + (2.4 + 13 * f) * k * ny, 0.8 * k);
      const dx = tx2 - ex, dy = ty2 - ey;
      const pg = ctx.createRadialGradient(ex, ey, 0, ex + dx * 0.4, ey + dy * 0.4, 22 * f);
      pg.addColorStop(0, "rgba(90,140,235,.5)"); pg.addColorStop(1, "rgba(58,98,196,0)");
      ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(ex + dx * 0.3, ey + dy * 0.3, 20 * f, 0, TAU); ctx.fill();
      ctx.save(); ctx.translate(ex, ey); ctx.rotate(Math.atan2(dy, dx));
      const L = Math.hypot(dx, dy), cg = ctx.createLinearGradient(0, 0, L, 0);
      cg.addColorStop(0, "rgba(220,236,255,.95)"); cg.addColorStop(0.35, "rgba(120,166,240,.7)"); cg.addColorStop(1, "rgba(58,98,196,0)");
      ctx.fillStyle = cg; ctx.beginPath(); ctx.moveTo(0, -3.4 * f); ctx.lineTo(L * 0.75, -1.1 * f); ctx.lineTo(L, 0); ctx.lineTo(L * 0.75, 1.1 * f); ctx.lineTo(0, 3.4 * f); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "rgba(235,245,255,.85)";
      for (const q of [0.22, 0.45, 0.68]) { ctx.beginPath(); ctx.ellipse(L * q, 0, 2.6 * f * (1 - q * 0.7), 1.3 * f * (1 - q * 0.7), 0, 0, TAU); ctx.fill(); }
      ctx.restore();
      ctx.save(); ctx.shadowColor = "rgba(200,225,255,.95)"; ctx.shadowBlur = 14;
      ctx.fillStyle = "#f2f8ff"; ctx.beginPath(); ctx.arc(ex, ey, 2.6 * f + 0.6, 0, TAU); ctx.fill(); ctx.restore();
      if (i === S.hull.list.findIndex((q) => q.t === "engine") && (T % 2.6) < 0.45) {   // the occasional flare, on the first engine
        const a = 1 - Math.abs((T % 2.6) / 0.45 * 2 - 1);
        const fg = ctx.createLinearGradient(ex - 130, ey, ex + 130, ey);
        fg.addColorStop(0, "rgba(140,190,255,0)"); fg.addColorStop(0.5, "rgba(190,220,255," + (0.5 * a) + ")"); fg.addColorStop(1, "rgba(140,190,255,0)");
        ctx.strokeStyle = fg; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(ex - 130, ey); ctx.lineTo(ex + 130, ey); ctx.stroke();
        ctx.fillStyle = "rgba(220,240,255," + (0.55 * a) + ")"; ctx.beginPath(); ctx.arc(ex, ey, 3.4 * a + 1, 0, TAU); ctx.fill();
      }
    });
  }
  // ship: the modules as prisms with a coupler on every weld, sorted back to front, then the heading, the velocity, and the balance mark
  function ship(S) {
    const sw = shipWorld(S), list = S.hull.list, ws = S.hull.builder.weldsOf(list);
    plumes(S, sw);
    R.potLock = R.pot(S.ship.x, S.ship.y);
    const items = list.map((m) => { const [mx, my] = sw.at(m); return { k: mx + my, f: () => drawModule(m.t, mx, my, S.heading, sw.k, list, m) }; });
    for (const w of ws) { const [ax, ay] = sw.at(list[w.a]), [bx, by] = sw.at(list[w.b]); items.push({ k: (ax + ay + bx + by) / 2 - 0.01, f: () => drawCoupler(ax, ay, bx, by, sw.k) }); }
    items.sort((p, q) => p.k - q.k); for (const it of items) it.f();
    R.potLock = false;
    const [c0x, c0y] = iso(S.ship.x, S.ship.y, 2.2 * sw.k), z = R.cam.z;
    const [h1x, h1y] = iso(S.ship.x + S.aim[0] * 40 / z, S.ship.y + S.aim[1] * 40 / z, 2.2 * sw.k);
    ctx.strokeStyle = S.burning ? "#e9b25c" : "rgba(233,178,92,.6)"; ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.moveTo(c0x, c0y); ctx.lineTo(h1x, h1y); ctx.stroke();
    const v = Math.hypot(S.ship.vx, S.ship.vy);
    if (v > 0.5) { const [v1x, v1y] = iso(S.ship.x + S.ship.vx / v * 26 / z, S.ship.y + S.ship.vy / v * 26 / z, 2.2 * sw.k);
      ctx.strokeStyle = "rgba(58,98,196,.9)"; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(c0x, c0y); ctx.lineTo(v1x, v1y); ctx.stroke(); }
    comSym(S.ship.x, S.ship.y, 2.6 * sw.k);
    if (!S.ship.alive) { ctx.strokeStyle = "#c8302a"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(c0x, c0y, 16, 0, TAU); ctx.stroke(); }
  }
  // coast: the demo's line ahead, the ship carried on by the wells' own pull, red where a well would take it
  function coast(S, wells, C, mark) {
    const v = Math.hypot(S.ship.vx, S.ship.vy);
    if (v < COAST.minV || S.ship.landed !== null || !S.ship.alive) return;
    let px = S.ship.x, py = S.ship.y, pvx = S.ship.vx, pvy = S.ship.vy;
    for (let i = 0; i < C.steps; i++) {
      const [ax2, ay2] = accel(wells, px, py);
      let md2 = 1e9; for (const w of wells) md2 = Math.min(md2, Math.hypot(w.x - px, w.y - py) / (w.r || 6));
      pvx += ax2 * C.dt; pvy += ay2 * C.dt; px += pvx * C.dt; py += pvy * C.dt;
      if (i % C.every === 0) mark(px, py, md2 < 2, i / C.steps);
      if (md2 < 1.02) break;
    }
  }
  // wreck: a wreck as the demo draws wreckage, a module by its kind, a crate golden, scrap and hulls grey with an amber ring
  function wreck(w) {
    const k = WRECK_PX / R.cam.z / 4;
    R.potLock = R.pot(w.x, w.y);
    if (w.kind === "module" && w.t) drawModule(w.t, w.x, w.y, T * 0.2, k, null, null);
    else if (w.kind === "crate") { prismAt(w.x, w.y, T * 0.5, 1.1 * k, 1.1 * k, 1.0 * k, "#8a5a10", "#4d330c"); label(Math.round(w.mass) + " kg", ...iso(w.x, w.y - 6 * k, 0)); }
    else { const big = w.kind === "hull" ? 1.6 : 1.2; prismAt(w.x, w.y, T * 0.1, big * k, big * k, 0.9 * k, "#4d5560", "#2d333c");
      ctx.strokeStyle = "rgba(138,90,16,.7)"; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.ellipse(...iso(w.x, w.y, 1.2 * k), 6, 3.4, 0, 0, TAU); ctx.stroke(); }
    R.potLock = false;
  }
  // pirate: the demo's pirate, two prisms with a hunting glow, and its roost
  function pirate(p, S) {
    const k = PIRATE_PX / R.cam.z / 4;
    { const [rx2, ry2] = iso(p.home.x, p.home.y, 0); ctx.strokeStyle = "rgba(192,57,43,.3)"; ctx.lineWidth = 1; ctx.setLineDash([3, 4]);
      ctx.beginPath(); ctx.ellipse(rx2, ry2, 10, 5.7, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]); }
    R.potLock = R.pot(p.x, p.y);
    const va = Math.atan2(p.vy, p.vx) || 0;
    shadow(p.x, p.y, 13, 0.15);
    prismAt(p.x - 1 * k * Math.cos(va), p.y - 1 * k * Math.sin(va), va, 2.4 * k, 1.2 * k, 0.9 * k, "#5a3a3a", "#362121");
    prismAt(p.x + 2 * k * Math.cos(va), p.y + 2 * k * Math.sin(va), va, 1.0 * k, 1.0 * k, 1.4 * k, "#4a2d2d", "#2a1818");
    if (p.state !== "roost") { const [ex, ey] = iso(p.x - 3.8 * k * Math.cos(va), p.y - 3.8 * k * Math.sin(va), 0.7 * k);
      const pg = ctx.createRadialGradient(ex, ey, 0, ex, ey, 8); pg.addColorStop(0, "rgba(226,84,62,.6)"); pg.addColorStop(1, "rgba(226,84,62,0)");
      ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(ex, ey, 7, 0, TAU); ctx.fill(); }
    label("☠ w" + p.i, ...iso(p.x, p.y - 8 * k, 0), "#e05a4a");
    R.potLock = false;
    if (p.demand) { const s = iso(S.ship.x, S.ship.y, 0); ctx.strokeStyle = "#c8302a"; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(s[0], s[1], 14, 0, TAU); ctx.stroke(); }
  }
  // panel: the demo's ship panel, the modules on their grid with their glyphs and the welds between them, the frame coloured by the hull's health
  function panel(S) {
    const mods = S.hull.list, ws = S.hull.builder.weldsOf(mods);
    if (!mods.length) return;
    let minx = 99, maxx = -99, miny = 99, maxy = -99;
    for (const m of mods) { minx = Math.min(minx, m.gx); maxx = Math.max(maxx, m.gx); miny = Math.min(miny, m.gy); maxy = Math.max(maxy, m.gy); }
    const CS = 15, pw = (maxx - minx + 1) * CS + 22, ph = (maxy - miny + 1) * CS + 30;
    const ox = W - pw - 12, oy = H - ph - 150;
    ctx.fillStyle = PAL.glass; ctx.strokeStyle = "rgba(" + PAL.ink + ",.14)";
    ctx.beginPath(); ctx.roundRect(ox, oy, pw, ph, 10); ctx.fill(); ctx.stroke();
    ctx.font = "800 7px -apple-system,sans-serif"; ctx.fillStyle = "#8b93a0"; ctx.textAlign = "left";
    ctx.fillText("SHIP · HULL " + Math.max(0, Math.round(S.hullHp)), ox + 8, oy + 11);
    const px = (m) => ox + 11 + (m.gx - minx) * CS + CS / 2, py = (m) => oy + 20 + (m.gy - miny) * CS + CS / 2;
    const health = Math.max(0, Math.min(1, S.hullHp / 1000)), g = [46, 125, 91], r = [192, 57, 43];
    const col = "rgb(" + g.map((gv, i) => Math.round(gv + (r[i] - gv) * (1 - health))).join(",") + ")";
    for (const w of ws) { const a = mods[w.a], b = mods[w.b]; ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(px(a), py(a)); ctx.lineTo(px(b), py(b)); ctx.stroke(); }
    for (const m of mods) { ctx.fillStyle = ORIGIN[m.org || "gen"][0]; ctx.fillRect(px(m) - 5.5, py(m) - 5.5, 11, 11); ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.strokeRect(px(m) - 5.5, py(m) - 5.5, 11, 11); glyph(m.t, px(m), py(m), 9, 0); }
  }
  // map: the demo's minimap made the galaxy's: every world by its climate, the sun or the hole and its edge, the gate, the pirates, the wrecks, the ship, and the long coast ahead
  function map(S, wells) {
    const mw = 150, mh = 120, ox = 12, oy = 128;
    let Rg = 1; for (const w of S.galaxy.worlds) Rg = Math.max(Rg, Math.hypot(w.x, w.y) + w.r); Rg = Math.max(Rg, Math.hypot(S.galaxy.gate.x, S.galaxy.gate.y) + 4000);
    const sc = (mw / 2 - 8) / Rg, mx = (x) => ox + mw / 2 + x * sc, my = (y) => oy + mh / 2 + y * sc * (mh / mw);
    ctx.fillStyle = PAL.glass; ctx.strokeStyle = "rgba(" + PAL.ink + ",.15)";
    ctx.beginPath(); ctx.roundRect(ox, oy, mw, mh, 10); ctx.fill(); ctx.stroke();
    const dot = (x, y, c, r) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(mx(x), my(y), r || 2, 0, TAU); ctx.fill(); };
    coast(S, wells, MAP_COAST, (x, y, hot, f) => { ctx.fillStyle = hot ? "rgba(192,57,43,.7)" : "rgba(58,98,196," + (0.55 - f * 0.4).toFixed(2) + ")"; ctx.beginPath(); ctx.arc(mx(x), my(y), 0.7, 0, TAU); ctx.fill(); });
    if (S.state.hole.born) { ctx.strokeStyle = "rgba(200,48,42,.6)"; ctx.setLineDash([2, 3]); ctx.beginPath(); ctx.ellipse(mx(S.star.x), my(S.star.y), S.state.hole.edge * sc, S.state.hole.edge * sc * (mh / mw), 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]); }
    const CC = { SNOW: "#dfe8f2", ASH: "#8d8a86", MUD: "#8a6a3f", ROCK: "#a09484", WOOD: "#4f8a4a" };
    for (const w of S.galaxy.worlds) dot(w.x, w.y, w.state === "alive" ? CC[w.climate] || "#aaa" : "#2a2d34", w.state === "alive" ? 3 : 2);
    dot(S.star.x, S.star.y, S.state.hole.born ? "#0a0c10" : STAR_COL[Math.min(4, S.takeoffs)], S.state.hole.born ? 3.4 : 5);
    ctx.strokeStyle = "rgba(30,140,70,.8)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(mx(S.galaxy.gate.x) - 4, my(S.galaxy.gate.y)); ctx.lineTo(mx(S.galaxy.gate.x) + 4, my(S.galaxy.gate.y)); ctx.stroke();
    for (const p of S.pirates) if (p.alive) dot(p.x, p.y, "#c0392b", 2.2);
    for (const w of S.wrecks) if (!w.taken) dot(w.x, w.y, "#8b93a0", 1.4);
    dot(S.ship.x, S.ship.y, S.ship.alive ? "#e9edf2" : "#c8302a", 2.6);
  }

  // drawWells(S): the grid's wells, the bodies the road flies with draw radii the funnels can be seen by
  function drawWells(S) {
    const list = [{ x: S.star.x, y: S.star.y, mu: S.state.hole.mu, r: 20000 + (S.state.hole.born ? S.state.hole.edge : 0), name: S.state.hole.born ? "hole" : "sun" }];
    for (const w of S.galaxy.worlds) if (w.state === "alive") list.push({ x: w.x, y: w.y, mu: w.mu, r: 8000, name: "world" });
    return list;
  }
  // draw(dt, S): one frame of space from the page's snapshot S: galaxy, star, ship, state, hull, hullHp, wrecks, pirates, grapple, burning, aim, heading, balance, edge, takeoffs, t, and flyWells, the road's own wells
  function draw(dt, S) {
    T = S.t;
    ctx.fillStyle = PAL.bg; ctx.fillRect(0, 0, W, H);
    const wells = drawWells(S);
    R.wells = wells; R.cam.x = S.ship.x; R.cam.y = S.ship.y; R.frame(W, H);
    R.drawGrid();
    fieldRings(wells);
    ctx.strokeStyle = "rgba(233,237,242,.10)"; ctx.lineWidth = 1;
    for (const [a, b] of S.galaxy.lanes) { const A = S.galaxy.worlds[a], B = S.galaxy.worlds[b]; const p = iso(A.x, A.y, 0), r2 = iso(B.x, B.y, 0); ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(r2[0], r2[1]); ctx.stroke(); }
    sun(S.star, S.state.hole, S.takeoffs);
    for (const w of S.galaxy.worlds) (w.state === "alive" ? planet(w, S.star, w.i === S.edge) : gone(w));
    gate(S.galaxy.gate);
    coast(S, S.flyWells, COAST, (x, y, hot, f) => { const [q1x, q1y] = iso(x, y, 0); ctx.lineWidth = 1.2; ctx.strokeStyle = hot ? "rgba(192,57,43,.55)" : "rgba(58,98,196," + (0.4 - f * 0.30).toFixed(2) + ")"; ctx.beginPath(); ctx.arc(q1x, q1y, 0.8, 0, TAU); ctx.stroke(); });
    for (const w of S.wrecks) if (!w.taken) wreck(w);
    for (const p of S.pirates) if (p.alive) pirate(p, S);
    if (S.grapple) { const s = iso(S.ship.x, S.ship.y, 1.2), h = iso(S.grapple.x, S.grapple.y, 0.8);
      ctx.strokeStyle = "rgba(233,178,92,.85)"; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(s[0], s[1]); ctx.quadraticCurveTo((s[0] + h[0]) / 2, (s[1] + h[1]) / 2 + 6, h[0], h[1]); ctx.stroke();
      ctx.fillStyle = "#33281c"; ctx.beginPath(); ctx.arc(h[0], h[1], 2.4, 0, TAU); ctx.fill(); ctx.strokeStyle = "rgba(233,178,92,.8)"; ctx.lineWidth = 1; ctx.stroke(); }
    if (S.ship.landed === null) ship(S);
    panel(S);
    map(S, S.flyWells);
  }
  function resize(w, h) { W = w; H = h; R.resize(w, h); }
  // screenToWorldDir(sx, sy): a screen drag to a world direction, the projection's own axes inverted
  function screenToWorldDir(sx, sy) {
    const z = R.cam.z, a = sx / (C30 * z), b = sy / (S30 * z);
    const x = (a + b) / 2, y = (b - a) / 2, l = Math.hypot(x, y) || 1;
    return [x / l, y / l];
  }
  return { draw, resize, screenToWorldDir, cam: R.cam, surface: R };
}
ARK_SPACE_EOF
node --check docs/gravitys-ark/space.js && echo "syntax ok space.js"
test "$(sha256sum docs/gravitys-ark/space.js | cut -c1-16)" = "5ae12804e6495061" && echo OK docs/gravitys-ark/space.js || echo FAILED docs/gravitys-ark/space.js
```

3. The main file: its own drawing leaves and the space screen takes it; the camera, the panes, and the controls stay. Every cut runs between two markers that each occur once. Syntax check; the hash line must print OK.

```sh
python3 - <<'ARK_EOF_3'
def edit(p, reps):
    s = open(p, encoding="utf-8").read()
    for old, new in reps:
        assert s.count(old) == 1, (p, old[:70])
        s = s.replace(old, new)
    open(p, "w", encoding="utf-8").write(s)
def cut(p, start, end):
    s = open(p, encoding="utf-8").read()
    assert s.count(start) == 1 and s.count(end) == 1, (p, start[:40], end[:40])
    a = s.index(start); b = s.index(end)
    assert a < b
    open(p, "w", encoding="utf-8").write(s[:a] + s[b:])
p = "docs/gravitys-ark/main.js"
edit(p, [('import { makeRender2d } from "../../src/modules/render2d/render2d.js";\n', 'import { makeSpaceScreen } from "./space.js";\n')])
cut(p, "const C30 = Math.cos(Math.PI / 6), S30 = 0.5;\n", "function W() { return cv.width / DPR; }")
edit(p, [
("function W() { return cv.width / DPR; }", "// the space screen: deadweight's drawing over the ark's space, in its own file; the page keeps the camera, the panes, and the controls\nconst SS = makeSpaceScreen(cv, ctx, { cam: { x: ship.x, y: ship.y, z: ZOOMS[zi], rot: 0 } }), R = SS.surface;\nfunction W() { return cv.width / DPR; }"),
("R.resize(W(), H()); }\n", "SS.resize(W(), H()); }\n"),
("aimDrag = screenToWorldDir(dx, dy);", "aimDrag = SS.screenToWorldDir(dx, dy);"),
])
cut(p, "// a screen drag to a world direction: the iso projection's own axes, inverted\n", "function draw() {\n")
cut(p, "function draw() {\n", "// the panes: the ship's numbers, the clocks, the log\n")
edit(p, [
("// the panes: the ship's numbers, the clocks, the log\n",
 "// draw(): the ground's screen while the ground is up, else the space screen from one snapshot of the page's state\nfunction draw() {\n  if (view === \"ground\") { GS.draw(frameDt); return; }\n  const dv = derive(hull), cell = 1.7, v = Math.hypot(ship.vx, ship.vy), hd = v > 1e-6 ? [ship.vx / v, ship.vy / v] : aimVector();\n  SS.draw(frameDt, { galaxy, star, ship, state, hull, hullHp, wrecks, pirates: P.list, grapple: gr.g, burning, aim: aimVector(), heading: Math.atan2(hd[1], hd[0]), balance: { gx: dv.cx / cell, gy: dv.cy / cell },\n    edge: state.hole.born ? road.edgeFor({ dry: ship.dry, fuel: ship.fuel }).index : -1, takeoffs: state.takeoffs, t: state.t, flyWells: road.wells() });\n}\n\n// the panes: the ship's numbers, the clocks, the log\n"),
])
cut(p, 'const WRECK_COL = { scrap: "#9aa3ad", crate: "#e9b25c", module: "#7fd1e0", hull: "#5c6470" };\n', '$("castB").onclick = ')
ARK_EOF_3
node --check docs/gravitys-ark/main.js && echo "syntax ok main.js"
test "$(sha256sum docs/gravitys-ark/main.js | cut -c1-16)" = "84166f4be3ebe1b8" && echo OK docs/gravitys-ark/main.js || echo FAILED docs/gravitys-ark/main.js
```

4. The ark's gate: one check joins at the end, the law that the page's screens are their own files hooked into the main file. Syntax check; the hash line must print OK.

```sh
python3 - <<'ARK_EOF_4'
p = "scripts/gravitys-ark-test.mjs"; s = open(p, encoding="utf-8").read()
anchor = "console.log(`gravitys-ark-test: ${pass} PASS / ${fail} FAIL`);\n"
assert s.count(anchor) == 1, "tail anchor"
block = '''{ // 53. ark: the page's screens are their own files hooked into the main file, which draws nothing of space or the ground itself
  const read = (f) => readFileSync(f, "utf8");
  const main = read("docs/gravitys-ark/main.js"), space = read("docs/gravitys-ark/space.js"), look = read("docs/gravitys-ark/hull-look.js"), gscreen = read("docs/gravitys-ark/ground.js");
  check("ark: the page's screens are their own files hooked into the main file, which draws nothing of space or the ground itself",
    /export function makeSpaceScreen\\(/.test(space) && main.includes('from "./space.js"') && !/function drawDisc\\(|drawWrecks\\(|makeRender2d|prismAt\\(/.test(main)
    && /export function makeHullLook\\(/.test(look) && gscreen.includes('from "./hull-look.js"') && /export function makeGroundScreen\\(/.test(gscreen) && main.includes('from "./ground.js"'));
}

'''
s = s.replace(anchor, block + anchor)
open(p, "w", encoding="utf-8").write(s)
ARK_EOF_4
node --check scripts/gravitys-ark-test.mjs && echo "syntax ok gate"
test "$(sha256sum scripts/gravitys-ark-test.mjs | cut -c1-16)" = "5658482c2ba46004" && echo OK scripts/gravitys-ark-test.mjs || echo FAILED scripts/gravitys-ark-test.mjs
```

5. The records that ride the landing: the README's page line says space as built; the parts source's space screen row carries the file and the phase; the version to 0.1.2. The three hash lines must print OK.

```sh
python3 - <<'ARK_EOF_5'
import json
def edit(p, reps):
    s = open(p, encoding="utf-8").read()
    for old, new in reps:
        assert s.count(old) == 1, (p, old[:70])
        s = s.replace(old, new)
    open(p, "w", encoding="utf-8").write(s)
edit("README.md", [
("- **The page:** the galaxy on the warped grid with the worlds in their pits, the ship, the clocks, LAND, TAKE OFF, and a burn aimed at the gate or by a drag",
 "- **The page (0.1.2):** space drawn as deadweight draws it, in the space screen's own file: the warped grid with the wells' pits, the worlds as faceted planets in their pits by climate, the sun with its kill ring, the hole with its turning disc and its edge, the gate as lit posts, the ship as deadweight's prisms with a coupler on every weld and plumes when it burns, its heading, its velocity, the balance mark, the coast line ahead, wrecks and pirates as prisms, the grapple line, the ship panel, and the map of the galaxy; the clocks, LAND, TAKE OFF, and a burn aimed at the gate or by a drag"),
])
edit("docs/parts/parts-source.json", [
('   "name": "the space screen",\n   "does": "Deadweight\'s flight and drawing under the ark\'s rail, in its own file.",\n',
 '   "name": "the space screen",\n   "files": [\n    "docs/gravitys-ark/space.js"\n   ],\n   "phase": "0.1.2",\n   "does": "Deadweight\'s drawing under the ark\'s rail, in its own file: the grid and the pits, faceted planets, the sun and the hole, the gate, the ship as prisms with plumes, the coast line, wrecks and pirates, the ship panel, the map.",\n'),
])
json.loads(open("docs/parts/parts-source.json", encoding="utf-8").read())
edit("package.json", [('"version": "0.1.1"', '"version": "0.1.2"')])
ARK_EOF_5
test "$(sha256sum README.md | cut -c1-16)" = "49f425b74620c62e" && echo OK README.md || echo FAILED README.md
test "$(sha256sum docs/parts/parts-source.json | cut -c1-16)" = "a5082b6db1db9435" && echo OK docs/parts/parts-source.json || echo FAILED docs/parts/parts-source.json
test "$(sha256sum package.json | cut -c1-16)" = "f9dd7a75d527a971" && echo OK package.json || echo FAILED package.json
```

6. Run the ark's gate. It must print 49 PASS lines, one more than the recorded 48, then `gravitys-ark-test: 49 PASS / 0 FAIL`, then `gravitys-ark-test PASS`. Any FAIL stops the task here.

```sh
node scripts/gate.mjs gravitys-ark > /tmp/ark-gate.txt; tail -3 /tmp/ark-gate.txt; grep -m1 '^seeds' /tmp/ark-gate.txt
```

7. The phase lands: its status line and the task row. Then the parts build over every gate, about four minutes; it must name 50 gates and every verdict must be ok, the ark's gate among them at 49 PASS and 0 FAIL.

```sh
python3 - <<'ARK_EOF_7'
ph = "docs/plans/phase-0.1.2-the-findings.md"; s = open(ph, encoding="utf-8").read()
old = "in a space screen file of its own. DISPATCHED. →"
assert s.count(old) == 1, "task row"
s = s.replace(old, "in a space screen file of its own. LANDED, commit stamped below. →")
old2 = "Status: DISPATCHED. Task 5 dispatched."
assert s.count(old2) == 1, "status line"
s = s.replace(old2, "Status: LANDED, commit stamped below, 2026-09-09. Five tasks landed; the ark's gate 49 PASS / 0 FAIL; the parts build 50 gates, every verdict ok.")
open(ph, "w", encoding="utf-8").write(s)
ARK_EOF_7
grep -c "commit stamped below" docs/plans/phase-0.1.2-the-findings.md
node scripts/parts.mjs --gates all
node -e 'const t=require("./docs/parts/parts.json");const bad=Object.values(t.gates).filter(g=>g.verdict!=="ok").map(g=>g.name);const a=t.gates["gravitys-ark"];console.log(Object.keys(t.gates).length+" gates, "+bad.length+" not ok"+(bad.length?": "+bad.join(", "):""));console.log("gravitys-ark "+a.pass+" PASS / "+a.fail+" FAIL; "+a.seeds);process.exit(bad.length||a.pass!==49?1:0)'
```

Required: `2`, a count line naming 50 gates, `50 gates, 0 not ok`, `gravitys-ark 49 PASS / 0 FAIL;` with its seeds.

8. Commit and push the landing, then stamp the real hash into the status line and the task row in a second small commit. Never amend after stamping.

```sh
git add docs/gravitys-ark/space.js docs/gravitys-ark/main.js scripts/gravitys-ark-test.mjs README.md package.json docs/parts docs/plans
git commit -m "phase 0.1.2 — the five findings: space as deadweight draws it, the phase lands, the version to 0.1.2

The space screen in its own file: the grid and the pits, faceted planets, the sun and the hole, the gate, the ship as prisms with plumes, the coast line, wrecks and pirates, the ship panel, the map; the main file keeps the hookup lines.
gravitys-ark-test 49 PASS / 0 FAIL; the parts build over 50 gates, every verdict ok.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01QSq3kZC3Bk9SC5RwnqYUfs"
git push origin main
H=$(git rev-parse --short HEAD)
sed -i "s/commit stamped below/commit \`$H\`/g" docs/plans/phase-0.1.2-the-findings.md
git add docs/plans && git commit -m "phase 0.1.2 record stamped — $H

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01QSq3kZC3Bk9SC5RwnqYUfs"
git push origin main
```

## Acceptance

- Step 1: `0`, five OK lines, `absent`.
- Steps 2 through 5: six OK lines, `syntax ok` three times.
- Step 6: `gravitys-ark-test: 49 PASS / 0 FAIL`, `gravitys-ark-test PASS`, a seeds line.
- Step 7: `2`; the count line names 50 gates; `50 gates, 0 not ok`; `gravitys-ark 49 PASS / 0 FAIL;` with its seeds.
- Step 8: push accepted by origin; the stamp commit pushed.

After the landing the orchestrator republishes the page from `docs/parts/parts.html` to its fixed address and names it, with the game's address, in the landing report.

## Report

Read-confirmation first, then one line of outcome, then bullets: step 6's lines verbatim; every OK line; the parts build's count line and the verdict line verbatim; the ark's gate line verbatim; both commit hashes; the push results. Every nonconformity its own labeled bullet, with the verbatim output. Fixture seeds: the seeds line the ark's gate printed in step 6 and the one from step 7's line; no seed is special.
