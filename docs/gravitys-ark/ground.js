// GRAVITY'S ARK — ground.js: the ground's screen, phase 0.1.1. Coldsnap's
// drawing on its own canvas, its sound, the camera, the taps, the pane, the
// buttons; the hull crashes onto the ground at entry, she and the hands take
// the field, and her walker lies wrecked until she raises it. The main file
// takes only the hookup lines.
import { makeRenderer, makeGameAudio } from "../../src/depot/api.js";
import { TOWER_SPECS } from "../../src/depot/specs.js";
import { makeGround, crashHull, fieldCrew, wreckWalker, setStick, order, tick, summary, price, GUNS } from "../../src/games/gravitys-ark/ground.js";
import { makeGestures } from "../../src/modules/pagekit/pagekit.js";

const fmt = (n, d = 0) => Number(n).toLocaleString("en-US", { maximumFractionDigits: d, minimumFractionDigits: d });

// makeGroundScreen(ids, hooks): ids names the canvas, the pane, the log, the stick, and the nine buttons; hooks.log takes one line for the log.
export function makeGroundScreen(ids, hooks) {
  const $ = (id) => document.getElementById(id);
  const gv = $(ids.canvas);
  const say = (line) => { if (hooks && hooks.log) hooks.log(line); };
  let G = null, R = null, A = null, focus = null, aim = null, zoom = 1, gunI = 1, muted = false, mode = "gun", wallStart = null;
  const kind = () => GUNS[gunI];

  // a screen point to the ground: a point on the camera's near plane plus the view
  // direction down to the focus height, the play page's own law
  function screenToGround(cx, cy) {
    const nx = (cx / innerWidth) * 2 - 1, ny = -((cy / innerHeight) * 2 - 1);
    const cp = R.cameraPos(), rt = R.camBasis.right, up = R.camBasis.up, f = R.camBasis.fwd;
    const hw = R.camBasis.halfW(), hh = R.camBasis.halfH();
    const px = cp.x + rt.x * nx * hw + up.x * ny * hh, py = cp.y + rt.y * nx * hw + up.y * ny * hh, pz = cp.z + rt.z * nx * hw + up.z * ny * hh;
    const t = (focus.y - py) / f.y;
    return { x: px + f.x * t, z: pz + f.z * t };
  }

  function enter(seed, w, scrapKg, hull, v, crew) {
    G = makeGround(seed, w, scrapKg);
    const H = crashHull(G, hull, v);
    say("the hull is down: " + H.bodies.length + " modules, " + H.loose.length + " loose");
    fieldCrew(G, crew || []);
    wreckWalker(G);
    say("she is on the ground" + (G.hands.length ? " with " + G.hands.map((h) => h.name).join(", ") : ", alone") + "; the walker lies wrecked");
    mode = "gun"; wallStart = null; held.clear(); stickVec = { x: 0, z: 0 }; setNub(0, 0);
    gv.style.display = "block"; document.body.classList.add("ground");
    R = makeRenderer(gv, G.world, { camera: "tactical", town: false, fadeDecals: true });
    A = makeGameAudio(); A.setMuted(muted);
    const f = G.run.focus; focus = { x: f.x, y: f.y, z: f.z }; aim = { x: f.x, z: f.z }; zoom = 1;
    A.setListener(focus.x, focus.z, 60);
    say("on the ground at " + w.id + ": " + fmt(scrapKg) + " kg of scrap is " + fmt(G.run.resources) + " scrap here");
  }
  function leave() { if (R) { R.dispose(); R = null; } if (A) { A.dispose(); A = null; } gv.style.display = "none"; stickEl.style.display = "none"; document.body.classList.remove("ground"); G = null; }
  function step(dt) {
    if (!G) return null;
    const r = tick(G, dt);
    if (R) R.consume(r.events);
    if (A) { A.consume(r.events); if (r.cues.length) A.consume(r.cues); }
    for (const e of G.events.splice(0)) {
      if (e.k === "toast") say(String(e.text).toLowerCase());
      else if (e.k === "gun") say(TOWER_SPECS[e.key].label.toLowerCase() + " placed for " + e.cost + " scrap");
      else if (e.k === "fix") say("she goes to the " + e.module + ", " + fmt(e.seconds, 1) + " s of welding");
      else if (e.k === "fightHer") say("she stands and fights");
      else if (e.k === "repaired") say("the " + e.module + " is welded back");
      else if (e.k === "herDead") say("SHE IS DEAD");
      else if (e.k === "repairWalker") say("she goes to the walker, " + fmt(e.seconds, 0) + " s of work");
      else if (e.k === "walkerUp") say("the walker stands");
      else if (e.k === "walkerTaken") say("she takes the walker");
      else if (e.k === "walkerDown") say("the walker is down");
      else if (e.k === "handDead") say(e.name + " is dead");
    }
    if (r.flags.bell) say("the bell: assault " + G.run.bell);
    return r;
  }
  // the stick for the walker: keys or the left touch stick, world-aligned through the camera, the play page's own law
  const held = new Set();
  addEventListener("keydown", (e) => { held.add(e.code); });
  addEventListener("keyup", (e) => { held.delete(e.code); });
  const stickEl = $(ids.stick), nub = $(ids.nub);
  let stickVec = { x: 0, z: 0 }, stickId = null;
  const setNub = (dx, dz) => { nub.style.transform = "translate(" + dx * 34 + "px," + dz * 34 + "px)"; };
  stickEl.addEventListener("pointerdown", (e) => { stickId = e.pointerId; stickEl.setPointerCapture(stickId); });
  stickEl.addEventListener("pointermove", (e) => {
    if (e.pointerId !== stickId) return;
    const r = stickEl.getBoundingClientRect();
    let dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2), dz = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
    const m = Math.hypot(dx, dz); if (m > 1) { dx /= m; dz /= m; }
    stickVec = { x: dx, z: dz }; setNub(dx, dz);
  });
  const stickEnd = (e) => { if (e.pointerId === stickId) { stickId = null; stickVec = { x: 0, z: 0 }; setNub(0, 0); } };
  stickEl.addEventListener("pointerup", stickEnd); stickEl.addEventListener("pointercancel", stickEnd);
  function feedStick() {
    if (!G || !R || !(G.walker && G.walker.possessed)) return;
    let sx = 0, sz = 0;
    if (held.has("ArrowUp") || held.has("KeyW")) sz -= 1; if (held.has("ArrowDown") || held.has("KeyS")) sz += 1;
    if (held.has("ArrowLeft") || held.has("KeyA")) sx -= 1; if (held.has("ArrowRight") || held.has("KeyD")) sx += 1;
    if (sx === 0 && sz === 0) { sx = stickVec.x; sz = stickVec.z; }
    const f = R.camBasis.fwd, rt = R.camBasis.right, fl = Math.hypot(f.x, f.z) || 1;
    const vx = rt.x * sx + (f.x / fl) * -sz, vz = rt.z * sx + (f.z / fl) * -sz;
    const mag = Math.min(1, Math.hypot(vx, vz));
    setStick(G, mag, 0, mag > 0.1 ? Math.atan2(vx, vz) : null);
  }
  function draw(dt) { if (!G || !R) return; feedStick(); if (A) A.tick(G.world, dt); const s = summary(G); if (s.walker && s.walker.possessed && G.walker.mech) { const h = G.walker.mech.hull; focus = { x: h.pos.x, y: h.pos.y, z: h.pos.z }; } R.render(dt, focus, aim); }
  function pane() {
    if (!G) return "";
    const s = summary(G);
    return ["THE GROUND  t " + fmt(s.t, 1) + " s   assault " + s.bell + "   next in " + fmt(s.bellIn, 0) + " s",
      "scrap " + fmt(s.scrap) + " (" + fmt(s.scrapKg) + " kg)   guns " + s.guns + "   enemy afield " + s.foes,
      "modules " + (s.modules ? s.modules.alive + " of " + s.modules.total + " standing, " + s.modules.loose + " loose" : "none") + "   the hull stands " + fmt(s.standing * 100, 0) + "%" + (s.lost ? "   THE BRIDGE IS LOST" : ""),
      "she: " + (s.her ? (s.her.alive ? (s.her.act === "walker" ? "in the walker" : s.her.act + (s.her.act === "fix" || s.her.act === "repairWalker" ? " " + fmt(s.her.actT, 1) + " s" : "")) : "DEAD") : "not here") + "   hands " + s.hands.alive + " of " + s.hands.total
        + "   walker " + (s.walker ? (s.walker.wrecked ? "wrecked" : s.walker.alive ? fmt(s.walker.hp) + " hp" : "DOWN") : "none"),
      mode === "wall" ? (wallStart ? "tap where the wall ends" : "tap where the wall starts") : "tap the ground to place a " + TOWER_SPECS[kind()].label.toLowerCase() + " for " + fmt(price(G, kind())) + " scrap; two fingers turn and zoom"].join("\n");
  }
  function buttons() {
    if (!G) return;
    $(ids.kind).textContent = TOWER_SPECS[kind()].label + " " + fmt(price(G, kind()));
    $(ids.sound).textContent = muted ? "SOUND OFF" : "SOUND ON";
    const s = summary(G);
    $(ids.takeoff).disabled = s.lost;
    $(ids.wall).textContent = mode === "wall" ? (wallStart ? "WALL: END" : "WALL: START") : "WALL";
    $(ids.fix).disabled = !(s.her && s.her.alive && s.modules && s.modules.loose > 0);
    $(ids.fight).disabled = !(s.her && s.her.alive);
    $(ids.fight).textContent = s.walker && s.walker.alive ? "FIGHT: WALKER" : "FIGHT";
    $(ids.repairWalker).disabled = !(s.her && s.her.alive && s.walker && !s.walker.alive);
    $(ids.hold).disabled = !(s.her && s.her.alive);
    $(ids.fire).disabled = !(s.walker && s.walker.possessed);
    stickEl.style.display = s.walker && s.walker.possessed ? "block" : "none";
  }
  // hud(lines): the ground's own panes: the numbers at the top left, the log above the buttons, the buttons' labels and states
  function hud(lines) { if (!G) return; $(ids.pane).textContent = pane(); $(ids.log).textContent = lines.join("\n"); buttons(); }
  $(ids.repairWalker).onclick = () => { if (!G) return; const r = order(G, "repairWalker"); if (!r.ok) say("no repair: " + r.reason); };
  $(ids.hold).onclick = () => { if (!G) return; const r = order(G, "hold"); if (!r.ok) say("no hold: " + r.reason); };
  $(ids.fire).onpointerdown = (e) => { e.preventDefault(); if (G) order(G, "fire", true); };
  addEventListener("pointerup", () => { if (G) order(G, "fire", false); });
  addEventListener("keydown", (e) => { if (e.code === "Space" && G && G.walker && G.walker.possessed) { e.preventDefault(); order(G, "fire", true); } });
  addEventListener("keyup", (e) => { if (e.code === "Space" && G) order(G, "fire", false); });
  $(ids.wall).onclick = () => { mode = mode === "wall" ? "gun" : "wall"; wallStart = null; buttons(); };
  $(ids.fix).onclick = () => { if (!G) return; const r = order(G, "fix"); if (!r.ok) say("no fix: " + r.reason); };
  $(ids.fight).onclick = () => { if (!G) return; const r = order(G, "fight"); if (!r.ok) say("no fight: " + r.reason); };
  $(ids.kind).onclick = () => { gunI = (gunI + 1) % GUNS.length; buttons(); };
  $(ids.sound).onclick = () => { muted = !muted; if (A) { A.ensure(); A.setMuted(muted); } buttons(); };
  makeGestures(gv, {
    tap: (x, y) => {
      if (!G || !R) return;
      if (A) A.ensure();
      const p = screenToGround(x, y); aim = { x: p.x, z: p.z };
      if (mode === "wall") {
        if (!wallStart) { wallStart = p; buttons(); return; }
        const r = order(G, "wall", wallStart.x, wallStart.z, p); wallStart = null; mode = "gun"; buttons();
        say(r.ok ? "she lays a wall of " + r.sections + " sections" : "no wall: " + r.reason);
        return;
      }
      const r = order(G, "gun", p.x, p.z, kind()); if (!r.ok) say("no " + TOWER_SPECS[kind()].label.toLowerCase() + ": " + String(r.reason).toLowerCase());
    },
    pinch: (k) => { if (R) { zoom = Math.max(0.5, Math.min(2.6, zoom * k)); R.setZoom(zoom); } },
    twist: (a) => { if (R) R.rotateBy(a); },
  });
  addEventListener("keydown", (e) => { if (!R) return; if (e.key === "1") R.rotateBy(0.35); if (e.key === "3") R.rotateBy(-0.35); });
  return { enter, leave, step, draw, pane, buttons, hud, active: () => !!G, lost: () => !!(G && summary(G).lost), herDead: () => !!(G && G.her && !G.her.alive),
    zoomIn: () => { if (R) { zoom = Math.min(2.6, zoom * 1.25); R.setZoom(zoom); } },
    zoomOut: () => { if (R) { zoom = Math.max(0.5, zoom / 1.25); R.setZoom(zoom); } },
    takeoff: () => (G ? order(G, "takeoff") : { ok: false, reason: "not on the ground" }) };
}
