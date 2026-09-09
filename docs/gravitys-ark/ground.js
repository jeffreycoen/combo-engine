// GRAVITY'S ARK — ground.js: the ground's screen, phase 0.1.1. Coldsnap's
// drawing on its own canvas, its sound, the camera, the taps, the pane, the
// buttons. The main file takes only the hookup lines.
import { makeRenderer, makeGameAudio } from "../../src/depot/api.js";
import { TOWER_SPECS } from "../../src/depot/specs.js";
import { makeGround, order, tick, summary, price, GUNS } from "../../src/games/gravitys-ark/ground.js";
import { makeGestures } from "../../src/modules/pagekit/pagekit.js";

const fmt = (n, d = 0) => Number(n).toLocaleString("en-US", { maximumFractionDigits: d, minimumFractionDigits: d });

// makeGroundScreen(ids, hooks): ids names the canvas and the three buttons; hooks.log takes one line for the log pane.
export function makeGroundScreen(ids, hooks) {
  const $ = (id) => document.getElementById(id);
  const gv = $(ids.canvas);
  const say = (line) => { if (hooks && hooks.log) hooks.log(line); };
  let G = null, R = null, A = null, focus = null, aim = null, zoom = 1, gunI = 1, muted = false;
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

  function enter(seed, w, scrapKg) {
    G = makeGround(seed, w, scrapKg);
    gv.style.display = "block";
    R = makeRenderer(gv, G.world, { camera: "tactical", town: false, fadeDecals: true });
    A = makeGameAudio(); A.setMuted(muted);
    const f = G.run.focus; focus = { x: f.x, y: f.y, z: f.z }; aim = { x: f.x, z: f.z }; zoom = 1;
    A.setListener(focus.x, focus.z, 60);
    say("on the ground at " + w.id + ": " + fmt(scrapKg) + " kg of scrap is " + fmt(G.run.resources) + " scrap here");
  }
  function leave() { if (R) { R.dispose(); R = null; } if (A) { A.dispose(); A = null; } gv.style.display = "none"; G = null; }
  function step(dt) {
    if (!G) return null;
    const r = tick(G, dt);
    if (R) R.consume(r.events);
    if (A) { A.consume(r.events); if (r.cues.length) A.consume(r.cues); }
    for (const e of G.events.splice(0)) { if (e.k === "toast") say(String(e.text).toLowerCase()); else if (e.k === "gun") say(TOWER_SPECS[e.key].label.toLowerCase() + " placed for " + e.cost + " scrap"); }
    if (r.flags.bell) say("the bell: assault " + G.run.bell);
    return r;
  }
  function draw(dt) { if (!G || !R) return; if (A) A.tick(G.world, dt); R.render(dt, focus, aim); }
  function pane() {
    if (!G) return "";
    const s = summary(G);
    return ["THE GROUND  t " + fmt(s.t, 1) + " s   assault " + s.bell + "   next in " + fmt(s.bellIn, 0) + " s",
      "scrap " + fmt(s.scrap) + " (" + fmt(s.scrapKg) + " kg)   guns " + s.guns + "   enemy afield " + s.foes,
      "the hull stands " + fmt(s.standing * 100, 0) + "%" + (s.lost ? "   THE HULL IS LOST" : ""),
      "tap the ground to place a " + TOWER_SPECS[kind()].label.toLowerCase() + " for " + fmt(price(G, kind())) + " scrap; two fingers turn and zoom"].join("\n");
  }
  function buttons() {
    if (!G) return;
    $(ids.kind).textContent = TOWER_SPECS[kind()].label + " " + fmt(price(G, kind()));
    $(ids.sound).textContent = muted ? "SOUND OFF" : "SOUND ON";
    $(ids.takeoff).disabled = !!G.run.gameOver;
  }
  $(ids.kind).onclick = () => { gunI = (gunI + 1) % GUNS.length; buttons(); };
  $(ids.sound).onclick = () => { muted = !muted; if (A) { A.ensure(); A.setMuted(muted); } buttons(); };
  makeGestures(gv, {
    tap: (x, y) => { if (!G || !R) return; if (A) A.ensure(); const p = screenToGround(x, y); aim = { x: p.x, z: p.z }; const r = order(G, "gun", p.x, p.z, kind()); if (!r.ok) say("no " + TOWER_SPECS[kind()].label.toLowerCase() + ": " + String(r.reason).toLowerCase()); },
    pinch: (k) => { if (R) { zoom = Math.max(0.5, Math.min(2.6, zoom * k)); R.setZoom(zoom); } },
    twist: (a) => { if (R) R.rotateBy(a); },
  });
  addEventListener("keydown", (e) => { if (!R) return; if (e.key === "1") R.rotateBy(0.35); if (e.key === "3") R.rotateBy(-0.35); });
  return { enter, leave, step, draw, pane, buttons, active: () => !!G,
    zoomIn: () => { if (R) { zoom = Math.min(2.6, zoom * 1.25); R.setZoom(zoom); } },
    zoomOut: () => { if (R) { zoom = Math.max(0.5, zoom / 1.25); R.setZoom(zoom); } },
    takeoff: () => (G ? order(G, "takeoff") : { ok: false, reason: "not on the ground" }) };
}
