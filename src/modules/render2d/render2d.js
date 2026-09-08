// MODULE: render2d — the 2-D canvas renderer core, lifted VERBATIM MATH
// from the deadweight hangar demo (deadweight-hangar.html lines 841-858,
// 860-897, 2642, 2658). The camera's iso projection, the well warp
// (wellProf/pot), and the gravity-warped grid draw (gridDraw) are copied
// exactly; only the globals that carried them move onto the maker's
// surface. No DOM, no window: draws through any ctx object exposing the
// canvas 2d calls gridDraw uses.
//
// Substitutions from the demo, numbered, and only these:
//   1. cam (line 841): the page's `let cam={x:0,y:0,z:5,rot:0}` ->
//      surface.cam, seeded from opts.cam, same default shape.
//   2. VCX/VCY/potLock (line 842): page globals -> surface.VCX,
//      surface.VCY (both start 0), surface.potLock (opts.potLock,
//      default false — the demo's null-sentinel "no lock" reads as
//      surface.potLock == null, so false and null both mean unlocked).
//   3. iso (843-848): page function -> surface.project(x,y,h). cam.* ->
//      this.cam.*; potLock -> this.potLock; _pR -> this._pR; pot(x,y) ->
//      this.pot(x,y). C30/S30 (the demo's own module-level constants,
//      Math.cos(Math.PI/6) and .5, defined at its line 156) are carried
//      as unchanged local constants — they are not in the substituted
//      globals list.
//   4. wellProf (849-853): page function -> surface.wellProf(w). DEEP ->
//      this.deep. w.name/w.mu/w.r are well-object fields, not globals,
//      and are unchanged.
//   5. DEEP/_pR (854): `const DEEP=4.4;let _pR=0;` -> opts.deep (default
//      4.4) seeding surface.deep; surface._pR starts 0.
//   6. pot (855-858): page function -> surface.pot(x,y). `mode!=='flight'`
//      -> `this.flat` (the flatten guard named as an option: flat=true
//      is the demo's non-flight, un-warped mode); world.wells ->
//      this.wells; wellProf(w) -> this.wellProf(w); cam.z -> this.cam.z;
//      DEEP -> this.deep.
//   7. gridDraw (860-897): page function(R,sp) -> surface.drawGrid(),
//      reading this.gridR/this.gridSp (opts.gridR default 44,
//      opts.gridSp default 5). cam.x/cam.y -> this.cam.x/this.cam.y;
//      ctx -> this.ctx; PAL.net/PAL.grav -> this.pal.net/this.pal.grav;
//      `mode==='flight'` -> `!this.flat`; pot(mx,my2) -> this.pot(mx,my2);
//      iso(...) -> this.project(...).
//   8. frame bookkeeping (lines 2642 frameRef, 2658): the page's
//      `VCX=W()/2;VCY=H()/2+8;_pR=(mode==='flight')?pot(cam.x,cam.y):0`
//      -> surface.resize(w,h) sets VCX/VCY; surface.frame() sets and
//      returns _pR from the same law (flat inverts the flight test, as
//      in substitution 6).

const C30 = Math.cos(Math.PI / 6), S30 = .5; // demo's own constants, line 156 — unchanged

const DEFAULT_PAL = { net: '50,60,80', grav: '62,100,232' }; // THEMES.light's own values, the only PAL keys gridDraw reads

export function makeRender2d(opts = {}) {
  const surface = {
    ctx: opts.ctx || null,
    pal: opts.pal || DEFAULT_PAL,
    wells: opts.wells || [],
    deep: opts.deep !== undefined ? opts.deep : 4.4,
    gridR: opts.gridR !== undefined ? opts.gridR : 44,
    gridSp: opts.gridSp !== undefined ? opts.gridSp : 5,
    flat: opts.flat !== undefined ? opts.flat : false,
    potLock: opts.potLock !== undefined ? opts.potLock : false,
    cam: opts.cam ? { ...opts.cam } : { x: 0, y: 0, z: 5, rot: 0 },
    VCX: 0, VCY: 0, _pR: 0,

    // resize(w,h): the demo's VCX=W()/2;VCY=H()/2+8 (line 2658).
    resize(w, h) { this.VCX = w / 2; this.VCY = h / 2 + 8; return this; },
    // frame(w,h): sets screen center (if given) then the demo's own
    // per-frame _pR law (frameRef, line 2642; also inlined at 2658).
    frame(w, h) {
      if (w !== undefined) this.resize(w, h);
      this._pR = this.flat ? 0 : this.pot(this.cam.x, this.cam.y);
      return this._pR;
    },

    // wellProf(w): the demo's funnel profile (849-853).
    wellProf(w) {
      if (w.name === 'hole') return [240 / this.deep, 30];
      if (w.name === 'sun') return [70, w.r * 1.5];
      if (w.mu < 0) return [-52, 26];
      return [w.mu > 2500 ? 46 : 40, w.r * 1.6];
    },

    // pot(x,y): the demo's warp depth at a point (855-858).
    pot(x, y) {
      if (this.flat) return 0;
      let d = 0;
      for (const w of this.wells) {
        const r2 = (x - w.x) ** 2 + (y - w.y) ** 2;
        const [A, r0] = this.wellProf(w);
        d += A * r0 * r0 / (r2 + r0 * r0);
      }
      return (this.cam.z / 2.3) * this.deep * Math.max(-60, Math.min(230, d));
    },

    // project(x,y,h): the demo's iso (843-848).
    project(x, y, h) {
      const cam = this.cam;
      if (cam.rot) {
        const c = Math.cos(cam.rot), s2 = Math.sin(cam.rot);
        const rx = x * c - y * s2, ry = x * s2 + y * c; x = rx; y = ry;
      }
      return [this.VCX + ((x - cam.x) - (y - cam.y)) * C30 * cam.z,
      this.VCY + ((x - cam.x) + (y - cam.y)) * S30 * cam.z - (h || 0) * cam.z * 1.15
        + ((this.potLock !== null && this.potLock !== false) ? this.potLock : this.pot(x, y)) - this._pR];
    },

    // drawGrid(): the demo's gridDraw(R,sp) (860-897), R/sp from
    // this.gridR/this.gridSp.
    drawGrid() {
      const ctx = this.ctx, cam = this.cam, R = this.gridR, sp = this.gridSp, pal = this.pal;
      const cgx = Math.round(cam.x / sp) * sp, cgy = Math.round(cam.y / sp) * sp;
      const RANGE = R * sp;
      // pass A: the fabric — every line a full-resolution polyline, vertex each sp
      for (let k = -R; k <= R; k++) {
        for (const axis of [0, 1]) {
          const lineCoord = (axis ? cgy : cgx) + k * sp;
          const perp = Math.abs(lineCoord - (axis ? cam.y : cam.x));
          const fade = Math.max(0, 1 - (perp / RANGE) ** 2) * .17;
          if (fade < .012) continue;
          ctx.strokeStyle = 'rgba(' + pal.net + ',' + fade.toFixed(3) + ')';
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          for (let g = 0; g <= 2 * R; g++) {
            const t2 = (-R + g) * sp;
            const wx = axis ? (cgx + t2) : lineCoord;
            const wy = axis ? lineCoord : (cgy + t2);
            const [qx, qy] = this.project(wx, wy, 0);
            g ? ctx.lineTo(qx, qy) : ctx.moveTo(qx, qy);
          }
          ctx.stroke();
        }
      }
      // pass B: gravity's blue, only where it bites
      if (!this.flat) {
        for (let k = -R; k <= R; k++) for (const axis of [0, 1]) {
          const lineCoord = (axis ? cgy : cgx) + k * sp;
          const perp = Math.abs(lineCoord - (axis ? cam.y : cam.x));
          if (perp > RANGE) continue;
          for (let g = 0; g < 2 * R; g++) {
            const t2 = (-R + g) * sp;
            const mx = axis ? cgx + t2 + sp / 2 : lineCoord, my2 = axis ? lineCoord : cgy + t2 + sp / 2;
            const d = this.pot(mx, my2); const t = Math.min(1, Math.max(0, d) / 95);
            if (t < 0.05) continue;
            const x1 = axis ? cgx + t2 : lineCoord, y1 = axis ? lineCoord : cgy + t2;
            const x2 = axis ? cgx + t2 + sp : lineCoord, y2 = axis ? lineCoord : cgy + t2 + sp;
            ctx.strokeStyle = 'rgba(' + pal.grav + ',' + Math.min(.92, t * 1.05).toFixed(2) + ')';
            ctx.lineWidth = 0.5 + t * 1.7;
            const [a1, a2] = this.project(x1, y1, 0), [b1, b2] = this.project(x2, y2, 0);
            ctx.beginPath(); ctx.moveTo(a1, a2); ctx.lineTo(b1, b2); ctx.stroke();
          }
        }
      }
    },
  };
  return surface;
}
