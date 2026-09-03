// MODULE: wells — gravity wells and the flight field, lifted VERBATIM MATH
// from the deadweight hangar demo (deadweight-hangar.html lines 403,
// 438-441, 596-602, 855-858, 2124-2149, 2541-2572). The field law is
// mu / (r^2 + soft^2)^1.65; the binary pair pulls itself at 0.01 of that
// law; the predictors integrate the real field. Pure functions over plain
// objects; no globals, no clocks, no rng.
//
// Substitutions from the demo, numbered, and only these:
//   1. stepPair: stepWorld's wl.varn / wl.moth -> the a / b arguments.
//   2. potField: pot's wellProf(w) (a render profile) -> the profOf
//      argument; the camera scaling (cam.z/2.3)*DEEP and the flight-mode
//      guard stay on the page. The clamped sum is the law carried.
//   3. predStop: the page's ship/derive globals -> arguments: `s` the ship
//      state {x, y, vx, vy, ang, w, fuel}, `M` the mass, `drv` the drive
//      {F, tau, I, nF, nR, thrust} where nF/nR replace engF.length /
//      engR.length and thrust replaces SPEC.engine.thrust. TAU -> the
//      2*Math.PI literal.
//   4. predictBallistic: predictShot's page wiring (module anchors, world
//      entity scans, aim kinds) -> arguments: start {x, y, vx, vy}, dials
//      {life, thrust, thrustFuel, maxRange}, `ghosts` (movers, already
//      shaped {n, x, y, vx, vy, r, trail}), `rocks`. The grap/msl dial
//      values live with the caller; the integration loop is verbatim.

// makeWell(x, y, mu, soft, r, name): a well at rest — the demo's line 403.
export function makeWell(x, y, mu, soft, r, name) { return { x, y, vx: 0, vy: 0, mu, soft, r: r || 0, p: 2.3, name }; }

// accel(wells, x, y): the field at a point — the demo's lines 438-441.
export function accel(wells, x, y) {
  let ax = 0, ay = 0;
  for (const w of wells) { const dx = w.x - x, dy = w.y - y; const r2 = dx * dx + dy * dy + w.soft * w.soft;
    const s = w.mu / Math.pow(r2, 1.65); ax += dx * s; ay += dy * s; }
  return [ax, ay];
}

// stepPair(a, b, dt): the binary's mutual pull and drift — stepWorld's own
// lines 598-602, both directions then both integrations.
export function stepPair(a, b, dt) {
  for (const [p, q] of [[a, b], [b, a]]) {
    const dx = q.x - p.x, dy = q.y - p.y, r2 = dx * dx + dy * dy + q.soft * q.soft;
    const s = .01 * q.mu / Math.pow(r2, 1.65); p.vx += dx * s * dt; p.vy += dy * s * dt; }
  a.x += a.vx * dt; a.y += a.vy * dt;
  b.x += b.vx * dt; b.y += b.vy * dt;
}

// potField(wells, x, y, profOf): the warp depth at a point — pot's clamped
// sum (lines 855-858); profOf(w) -> [A, r0].
export function potField(wells, x, y, profOf) {
  let d = 0;
  for (const w of wells) { const r2 = (x - w.x) ** 2 + (y - w.y) ** 2;
    const [A, r0] = profOf(w); d += A * r0 * r0 / (r2 + r0 * r0); }
  return Math.max(-60, Math.min(230, d));
}

// predStop(s, M, drv, wells): where a killing burn ends — the demo's
// lines 2124-2149, the ship and drive passed in.
export function predStop(s, M, drv, wells) {
  if (s.fuel <= 0) return null;
  let x = s.x, y = s.y, vx = s.vx, vy = s.vy, ang = s.ang, w = s.w;
  const wl = wells.map((q) => ({ ...q }));
  const pdt = 1 / 60;
  for (let i = 0; i < 5400; i++) {
    for (const [a, b] of [[wl[0], wl[1]], [wl[1], wl[0]]]) { const dx = b.x - a.x, dy = b.y - a.y, r2 = dx * dx + dy * dy + 9;
      const s2 = .01 * b.mu / Math.pow(r2, 1.65); a.vx += dx * s2 * pdt; a.vy += dy * s2 * pdt; }
    wl[0].x += wl[0].vx * pdt; wl[0].y += wl[0].vy * pdt; wl[1].x += wl[1].vx * pdt; wl[1].y += wl[1].vy * pdt;
    let ax = 0, ay = 0;
    for (const q of wl) { const dx = q.x - x, dy = q.y - y; const r2 = dx * dx + dy * dy + q.soft * q.soft;
      const s2 = q.mu / Math.pow(r2, 1.65); ax += dx * s2; ay += dy * s2; }
    const v = Math.hypot(vx, vy);
    const gM = Math.hypot(ax, ay);
    if (v < Math.max(0.12, 2.2 * gM * M / drv.F)) return { x, y, t: i * pdt };
    const va = Math.atan2(vy, vx);
    const useR = drv.nR > 0;
    let err = (useR ? va : va + Math.PI) - ang;
    while (err > Math.PI) err -= 2 * Math.PI; while (err < -Math.PI) err += 2 * Math.PI;
    w += Math.sign(err) * Math.min(Math.abs(err) * 6, drv.tau / drv.I) * pdt * 30; w *= .9;
    if (Math.abs(err) < .35) { const dec = (useR ? drv.nR : drv.nF) * drv.thrust * Math.min(1, v / 2) / M;
      const bd = useR ? -1 : 1;
      ax += bd * Math.cos(ang) * dec; ay += bd * Math.sin(ang) * dec; }
    vx += ax * pdt; vy += ay * pdt; x += vx * pdt; y += vy * pdt; ang += w * pdt;
  }
  return null;
}

// predictBallistic(start, dials, wells, ghosts, rocks): the shot through
// the real field — predictShot's integration loop (lines 2560-2571), the
// world's movers passed in as ghosts.
export function predictBallistic(start, dials, wells, ghosts, rocks) {
  let x = start.x, y = start.y, vx = start.vx, vy = start.vy;
  const pts = []; let hit = null; const dt2 = 1 / 30; let mFuel = dials.thrustFuel || 0;
  const gh = ghosts;
  for (let t = 0; t < dials.life && !hit; t += dt2) {
    const [gax, gay] = accel(wells, x, y);
    if (dials.thrust && mFuel > 0) { const sp = Math.hypot(vx, vy) || 1; vx += vx / sp * dials.thrust * dt2; vy += vy / sp * dials.thrust * dt2; mFuel -= dt2; }
    vx += gax * dt2; vy += gay * dt2; x += vx * dt2; y += vy * dt2;
    pts.push([x, y]);
    if (dials.maxRange && Math.hypot(x - pts[0][0], y - pts[0][1]) > dials.maxRange) break;
    for (const g2 of gh) {
      const [ga2x, ga2y] = accel(wells, g2.x, g2.y);
      g2.vx += ga2x * dt2; g2.vy += ga2y * dt2; g2.x += g2.vx * dt2; g2.y += g2.vy * dt2;
      if ((t * 30 | 0) % 8 === 0) g2.trail.push([g2.x, g2.y]);
      if (!hit && Math.hypot(x - g2.x, y - g2.y) < g2.r) hit = { n: g2.n, x: g2.x, y: g2.y }; }
    if (!hit) for (const r of rocks) { if (Math.hypot(x - r.x, y - r.y) < r.r + .5) { hit = { n: "rock", x: r.x, y: r.y }; break; } }
  }
  return { pts, hit, gh };
}
