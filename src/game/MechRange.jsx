// MECH TEST RANGE — the walker's first visible surface. Flat proving pad,
// one biped frame, drive commands. Deliberately spare: this exists so the
// gait bring-up is WATCHABLE on the page while the march gate is WIP.
// The machine stands, weight-shifts, steps — and still falls; R reissues it.
import React, { useEffect, useRef, useState } from "react";
import { makeWorld, makeField, stepWorld, addBody, fireProjectile } from "../engine/core.js";
import { buildMech, mechCommand, respawnMech, mechFallen, mechFire, mechPunt, mechPoise, mechMissiles, mechAboutFace, mechPivot, mechAimDir, mechLeap, mechLeapRange } from "../engine/mech.js";
import { makeRenderer } from "../render/renderer.js";
import { detectTouch } from "./runner/trials.js";
import { BUILDERS } from "./scenario.js";
import { COLORS, FONT } from "../ui/theme.js";
import { makeGameAudio } from "../platform/audio.js";
import { makeMechReadout } from "./mechReadout.js";

export default function MechRange({ onExit }) {
  const canvasRef = useRef(null);
  const knobRef = useRef(null);
  const rsKnobRef = useRef(null);
  const rngThumbRef = useRef(null);
  const rngLabelRef = useRef(null);
  const isTouch = detectTouch();
  const [hud, setHud] = useState({ mode: "STAND", steps: 0, falls: 0, kills: 0, shots: 0, gyro: true, rcs: true });
  const gaugeRingRef = useRef(null);
  const pressureRef = useRef(null);
  const bubbleRef = useRef(null);
  const yawTickRef = useRef(null);
  // portrait phones have no room for a 3-wide action row between the stick
  // rings — stack it on the left edge instead; re-render on rotation
  const [winW, setWinW] = useState(window.innerWidth);
  useEffect(() => {
    const onRs = () => setWinW(window.innerWidth);
    window.addEventListener("resize", onRs);
    return () => window.removeEventListener("resize", onRs);
  }, []);
  const narrow = winW < 560;
  useEffect(() => {
    const field = makeField(64, 1.7, 5);
    field.h.fill(0);
    const world = makeWorld({ field, seed: 5 });
    // OUTPOST scenario (design 2026-08-01): the mech starts FAR from a
    // garrison that does not know it exists. Walk in, open fire, or blunder
    // inside their picket line — any of those wakes them up.
    const OUTPOST = { x: 0, z: 0 };
    const mech = buildMech(world, { x: 0, z: 41, yaw: Math.PI });
    mech.thrustersOn = true; // stabilization rockets live in the game (CI pins the gait thruster-free)
    mech.thrustAssist = true; // full stick engages the rocket-assisted overdrive (~0.61 m/s cruise) // approach from the TOP of the map (Jeff, 2026-08-02): the mech walks toward the camera, face-on — no more back-of-the-mech; standoff stays 41m
    const pg = { covers: [], shelters: [], wallIndex: 0 };
    BUILDERS.house(world, field, pg, { x: -10, z: -2, nx: 5, nz: 4, doorIx: 0, group: "rangeA" });
    BUILDERS.house(world, field, pg, { x: 9, z: -6, nx: 4, nz: 5, doorIx: 1, group: "rangeB" });
    BUILDERS.house(world, field, pg, { x: -1, z: 7, nx: 6, nz: 4, doorIx: 0, group: "rangeC" });
    BUILDERS.hangar(world, field, pg, { x: 16, z: 4, group: "rangeH" });
    for (const b of world.bodies) if (b.kind === "chunk") { b.sleeping = true; b.sleepT = 1; }
    // the garrison: a rifle squad on the street, scouts + truck parked —
    // mass, hp, and the full damage pipeline (shell, blast, CRUSH attribute)
    const hostiles = [];
    for (let i = 0; i < 5; i++) hostiles.push(addBody(world, { kind: "unit", team: 2, group: "tgtSquad", mass: 82, hx: 0.26, hy: 0.9, hz: 0.26, x: -5 + i * 2.1, y: 1.9, z: 1 + (i % 2) * 2, hp: 30, friction: 0.55 }));
    hostiles.push(addBody(world, { kind: "vehicle", team: 2, group: "tgtScout", mass: 950, hx: 1.25, hy: 0.7, hz: 1.85, x: 5, y: 1.7, z: -1, hp: 55, friction: 0.7 }));
    hostiles.push(addBody(world, { kind: "vehicle", team: 2, group: "tgtScout", mass: 950, hx: 1.25, hy: 0.7, hz: 1.85, x: -8, y: 1.7, z: 3, hp: 55, friction: 0.7 }));
    hostiles.push(addBody(world, { kind: "truck", team: 2, group: "tgtTruck", vtype: "truck", mass: 1400, hx: 1.15, hy: 1.05, hz: 2.6, x: 4, y: 2.05, z: 10, hp: 120, friction: 0.6 }));
    // GARRISON TANKS: parked at the outpost until the alarm — then the
    // engine's own tread physics + goal AI (stepDrive) hunts the mech.
    const tanks = [];
    for (const [tx, tz] of [[-14, -4], [13, 12]]) {
      const t = addBody(world, { kind: "vehicle", team: 2, group: "tankPlat", mass: 3400, hx: 1.5, hy: 0.8, hz: 2.4, x: tx, y: 1.8, z: tz, hp: 170, friction: 0.85 });
      t.squad = "tankPlat";
      t.driverSpec = { throttleHabit: 0.5 };
      tanks.push(t); hostiles.push(t);
    }
    for (const h of hostiles) h._hp0 = h.hp;
    const R = makeRenderer(canvasRef.current, world, { town: false });
    const A = makeGameAudio();
    const RD = makeMechReadout();
    A.setReflectors([{ x: -10, z: -2, r: 4 }, { x: 9, z: -6, r: 4 }, { x: -1, z: 7, r: 5 }, { x: 16, z: 4, r: 6 }]); // the range buildings

    const S = { acc: 0, last: performance.now(), keys: {}, yawT: Math.PI, aimYaw: null, aimRange: 26, aimOff: 0, aiT: 0, orbit: 0, tankFire: [2.5, 5.2], raf: 0, hudT: 0, dead: false, joyId: null, jx: 0, jy: 0, rsId: null, rx: 0, rngId: null, aimHeld: 0, fireHeld: false, leapAim: false
      , camPts: new Map(), pinchD0: 0, pinchA: 0, zoom: 1, zoom0: 1 };
    window.__MECHRANGE__ = {
      world, mech, R, addBody: (o) => addBody(world, o),
      reissue: () => { respawnMech(world, mech, 0, 41, Math.PI); S.yawT = Math.PI; S.aimYaw = null; mech.aimYaw = null; S.aimOff = 0; S.aimHeld = 0; S.rx = 0; mechCommand(mech, { travel: 0, lateral: 0, heading: 0 }); },
      aim: (dir) => { S.aimHeld = dir; },
      fireHeld: (v) => { S.fireHeld = v; },
      fire: () => mechFire(world, mech),
      punt: () => mechPunt(world, mech),
      poise: () => mechPoise(world, mech, "L"),
      missiles: () => mechMissiles(world, mech),
      about: () => mechAboutFace(world, mech),
      leap: () => {
        if (!S.leapAim) { S.leapAim = true; return; }
        const yawL = S.aimYaw != null ? S.aimYaw : mech.state.heading + (isTouch ? S.aimOff : 0);
        const rL = Math.min(S.aimRange, mechLeapRange(mech));
        if (mechLeap(world, mech, mech.hull.pos.x + Math.sin(yawL) * rL, mech.hull.pos.z + Math.cos(yawL) * rL)) S.leapAim = false;
      },
      gyro: () => { mech.gyroOn = mech.gyroOn === false; },
      jets: () => { S.jetMode = !S.jetMode; mech.jetCmd = null; },
      rcs: () => { mech.thrustersOn = !mech.thrustersOn; },
      dbg: () => ({ hardT: S.hardT || 0, rx: S.rx || 0, jy: S.jy || 0, jetMode: !!S.jetMode, af: mech.state.aboutFace || 0, afLive: !!mech.state.afLive, cmdTf: mech.state.cmdT.f, govF: mech.state.govF ?? null, thrV: mech.state._thrV ?? null, turnLpf: mech.state.turnLpf || 0, estT: mech.state.walkEstT || 0, burn: mech.thrusters ? Math.max(...mech.thrusters.map((t) => t.cur)) : 0, cad: mech.state.cadence || 1 }),
    };
    const joyBase = () => ({ x: 86, y: window.innerHeight - 130 });
    const rsBase = () => ({ x: window.innerWidth - 86, y: window.innerHeight - 130 });
    const onPD = (e) => {
      A.ensure();
      if (e.target.closest && e.target.closest("button")) return;
      if (e.pointerType === "mouse") { S.fireHeld = true; mechFire(world, mech); return; } // desktop: fire IMMEDIATELY on mousedown — a quick click released before the next loop tick never fired (audit-caught); holding still auto-fires
      const c = joyBase(), a = rsBase();
      if (S.joyId == null && Math.hypot(e.clientX - c.x, e.clientY - c.y) < 110) S.joyId = e.pointerId;
      else if (S.rsId == null && Math.hypot(e.clientX - a.x, e.clientY - a.y) < 110) S.rsId = e.pointerId;
      else {
        S.camPts.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (S.camPts.size === 2) {
          const ps = [...S.camPts.values()];
          S.pinchD0 = Math.hypot(ps[0].x - ps[1].x, ps[0].y - ps[1].y);
          S.zoom0 = S.zoom;
          S.pinchA = Math.atan2(ps[1].y - ps[0].y, ps[1].x - ps[0].x);
        }
      }
    };
    const setRange = (r) => {
      S.aimRange = Math.max(6, Math.min(80, r));
      const hgt = 150, top = window.innerHeight - 350;
      const t = (S.aimRange - 6) / 74;
      if (rngThumbRef.current) rngThumbRef.current.style.top = top + hgt - t * hgt - 12 + "px";
      if (rngLabelRef.current) rngLabelRef.current.textContent = Math.round(S.aimRange) + "m";
    };
    const sliderY = (clientY) => {
      // vertical slider along the right edge: bottom = 6m, top = 80m
      const hgt = 150, top = window.innerHeight - 350; // above the right (turn) stick
      const t = Math.max(0, Math.min(1, (top + hgt - clientY) / hgt));
      setRange(6 + t * 74);
    };
    window.__MECHRANGE__.sliderY = sliderY;
    window.__MECHRANGE__.grabRange = (id, y) => { S.rngId = id; sliderY(y); };
    const onPM = (e) => {
      if (e.pointerType === "mouse") {
        // camera yaw is fixed in the range: screen offset from centre maps
        // straight to a world aim heading, and DISTANCE from centre maps to
        // shot range (near the mech = close shots, screen edge = far)
        const dx = e.clientX - window.innerWidth / 2, dy = e.clientY - window.innerHeight / 2;
        const m = Math.hypot(dx, dy);
        if (m > 30) {
          S.aimYaw = Math.atan2(dx, -dy);
          const span = Math.min(window.innerWidth, window.innerHeight) / 2;
          S.aimRange = 6 + Math.min(1, m / span) * 74;
        }
        return;
      }
      if (e.pointerId === S.joyId) {
        const c = joyBase();
        S.jx = Math.max(-1, Math.min(1, (e.clientX - c.x) / 44));
        S.jy = Math.max(-1, Math.min(1, (e.clientY - c.y) / 44));
        if (knobRef.current) { knobRef.current.style.left = c.x - 20 + S.jx * 34 + "px"; knobRef.current.style.top = c.y - 20 + S.jy * 34 + "px"; }
      } else if (e.pointerId === S.rsId) {
        const a = rsBase();
        S.rx = Math.max(-1, Math.min(1, (e.clientX - a.x) / 44));
        S.ry = Math.max(-1, Math.min(1, (e.clientY - a.y) / 44));
        if (rsKnobRef.current) { rsKnobRef.current.style.left = a.x - 20 + S.rx * 34 + "px"; rsKnobRef.current.style.top = a.y - 20 + S.ry * 34 + "px"; }
      } else if (e.pointerId === S.rngId) {
        sliderY(e.clientY);
      }
      else if (S.camPts.has(e.pointerId)) {
        S.camPts.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (S.camPts.size === 2 && S.pinchD0 > 0) {
          const ps = [...S.camPts.values()];
          const d = Math.hypot(ps[0].x - ps[1].x, ps[0].y - ps[1].y);
          S.zoom = Math.max(0.5, Math.min(2.6, S.zoom0 * (d / S.pinchD0)));
          R.setZoom(S.zoom);
          // two-finger twist steers the yaw, incremental with wrap
          const a = Math.atan2(ps[1].y - ps[0].y, ps[1].x - ps[0].x);
          let da = a - S.pinchA;
          while (da > Math.PI) da -= 2 * Math.PI;
          while (da < -Math.PI) da += 2 * Math.PI;
          S.pinchA = a;
          R.rotateBy(da);
        }
      }
    };
    const onPU = (e) => {
      if (e.pointerType === "mouse") { S.fireHeld = false; return; }
      if (e.pointerId === S.joyId) {
        S.joyId = null; S.jx = 0; S.jy = 0;
        const c = joyBase();
        if (knobRef.current) { knobRef.current.style.left = c.x - 20 + "px"; knobRef.current.style.top = c.y - 20 + "px"; }
      } else if (e.pointerId === S.rsId) {
        S.rsId = null; S.rx = 0; S.ry = 0;
        // RELEASE = STOP TURNING (advisor): the residual heading target
        // (up to 0.5 rad of steering-lock lead) kept the turn machinery
        // grinding for seconds after the thumb left the stick — pivot
        // re-trigger cycles felled 2/6 post-release settles (traced).
        S.yawT = mech.state.heading; // command frame, not the wobbling measured yaw
        if (mech.state.afLive && mech.state.aboutFace) { mech.state.aboutFace = null; mech.state.headingT = mech.state.heading; mech.state.recoverT = Math.max(mech.state.recoverT || 0, 0.5); }
        const a = rsBase();
        if (rsKnobRef.current) { rsKnobRef.current.style.left = a.x - 20 + "px"; rsKnobRef.current.style.top = a.y - 20 + "px"; }
      } else if (e.pointerId === S.rngId) {
        S.rngId = null; // range HOLDS where you left it
      }
      S.camPts.delete(e.pointerId);
      if (S.camPts.size < 2) S.pinchD0 = 0;
    };
    window.addEventListener("pointerdown", onPD);
    window.addEventListener("pointermove", onPM);
    window.addEventListener("pointerup", onPU);
    // Q: native-touch reconciliation — pointer ids can cross under real
    // multi-touch (measured: releasing the RIGHT stick fired pointerup
    // with the LEFT grab's id, leaving the right stick STUCK at full
    // deflection with no finger down). When the native touch list goes
    // empty, every stick state clears unconditionally; when it shrinks,
    // any grab whose finger no longer exists is released.
    const onTE = (e) => {
      if (e.touches.length < 2) { S.camPts.clear(); S.pinchD0 = 0; }
      // per-SIDE liveness: a grab whose half of the screen holds no
      // surviving finger is released, whatever pointer id the browser
      // attributed the up-event to
      let leftAlive = false, rightAlive = false;
      for (const t of e.touches) { if (t.clientX < window.innerWidth / 2) leftAlive = true; else rightAlive = true; }
      if (!leftAlive && S.joyId != null) {
        S.joyId = null; S.jx = 0; S.jy = 0;
        const c = joyBase();
        if (knobRef.current) { knobRef.current.style.left = c.x - 20 + "px"; knobRef.current.style.top = c.y - 20 + "px"; }
      }
      if (!rightAlive) {
        if (S.rsId != null) {
          S.rsId = null; S.rx = 0; S.ry = 0;
          const a = rsBase();
          if (rsKnobRef.current) { rsKnobRef.current.style.left = a.x - 20 + "px"; rsKnobRef.current.style.top = a.y - 20 + "px"; }
        }
        S.rngId = null;
      }
    };
    window.addEventListener("touchend", onTE);
    window.addEventListener("touchcancel", onTE);
    window.addEventListener("pointercancel", onPU);
    const focus = { x: 0, y: 3, z: 0 };
    window.__MECHRANGE__.dbg = { focus, hull: null, trajEnd: null }; // perceptual-measurement taps (render-side only)
    const down = (e) => {
      A.ensure();
      if (e.repeat) return;
      if (e.code === "KeyM") { A.setMuted(!A.muted); }
      S.keys[e.code] = true;
      if (e.code === "KeyC") { mechPunt(world, mech); }
      if (e.code === "KeyX") { mechPoise(world, mech, "L"); }
      if (e.code === "KeyV") { mechMissiles(world, mech); }
      if (e.code === "KeyT") { mechAboutFace(world, mech); }
      if (e.code === "KeyG") { window.__MECHRANGE__ && window.__MECHRANGE__.gyro(); }
      if (e.code === "KeyH") { window.__MECHRANGE__ && window.__MECHRANGE__.rcs(); }
      if (e.code === "KeyJ") { window.__MECHRANGE__ && window.__MECHRANGE__.jets(); }
      if (e.code === "KeyB") { RD.toggle(); }
      if (e.code === "KeyL") {
        if (!S.leapAim) S.leapAim = true;
        else {
          const yawL = S.aimYaw != null ? S.aimYaw : mech.state.heading + (isTouch ? S.aimOff : 0);
          const rL = Math.min(S.aimRange, mechLeapRange(mech));
          if (mechLeap(world, mech, mech.hull.pos.x + Math.sin(yawL) * rL, mech.hull.pos.z + Math.cos(yawL) * rL)) S.leapAim = false;
        }
      }
      if (e.code === "Escape") S.leapAim = false;
      if (e.code === "KeyR") {
        respawnMech(world, mech, 0, 41, Math.PI);
        S.yawT = Math.PI; S.aimYaw = null; mech.aimYaw = null;
        mechCommand(mech, { travel: 0, lateral: 0, heading: 0 });
      }
    };
    const up = (e) => { S.keys[e.code] = false; };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    // Q: commands feed at SIM-TICK cadence, inside the substep loop — the
    // per-frame feed integrated stick/turn state with FRAME dt (up to 50ms,
    // 6 substeps per computation under swiftshader jitter), so the pivot
    // brake, steering lock, and aim state saw lumpy inputs the per-tick
    // harness never reproduced (the pivot-from-march phone fall class).
    // Game and harness now share one command cadence by construction.
    const feedCommands = (cdt) => {
      // §0b (rev 2026-08-01): LEFT stick = travel vector (strafe, never
      // rotates); RIGHT stick = body TURN rate; cannon has its OWN controls
      // (◀ ▶ turret slew + range slider). Keyboard follows the HOUSE
      // convention (every mode steers on A/D); Q/E strafe; mouse aims.
      let tf = S.keys.KeyW ? 0.6 : S.keys.KeyS ? -0.42 : 0; // reverse gait certified at -0.42 (2026-08-02) // 0.6 raw = overdrive request; the engine governor delivers up to 0.55 once the walk is established
      let tl = S.keys.KeyQ ? 0.22 : S.keys.KeyE ? -0.22 : 0;
      if (S.joyId != null && (Math.abs(S.jx) > 0.12 || Math.abs(S.jy) > 0.12)) {
        // SCREEN-RELATIVE movement (Jeff, 2026-08-03: "y axis is inverted"):
        // the stick points where the mech GOES ON SCREEN; the gait derives
        // forward/reverse/strafe from the current facing. Body-relative
        // "up = forward" reads inverted whenever the machine faces the
        // camera — which is the spawn. Screen->world: right = -x, up = +z;
        // frame = the SMOOTH command heading (measured yaw is self-noise).
        // screen-relative through the CAMERA's live frame: screen right is
        // the camera's right, screen up is the camera's forward on the
        // ground — the mapping the fixed camera baked in, now following it
        const cb9 = R.camBasis;
        const fh9 = Math.hypot(cb9.fwd.x, cb9.fwd.z) || 1;
        const wxS = -(cb9.right.x * S.jx) - (cb9.fwd.x / fh9) * S.jy;
        const wzS = -(cb9.right.z * S.jx) - (cb9.fwd.z / fh9) * S.jy;
        const hS = mech.state.heading;
        const fS = wxS * Math.sin(hS) + wzS * Math.cos(hS);
        const lS = wxS * Math.cos(hS) - wzS * Math.sin(hS);
        tf = fS >= 0 ? Math.min(0.6, fS * 0.6) : Math.max(-0.42, fS * 0.42);
        tl = Math.max(-0.22, Math.min(0.22, lS * 0.26));
      }
      if (S.keys.KeyA) S.yawT += 0.7 * cdt;
      if (S.keys.KeyD) S.yawT -= 0.7 * cdt;
      if (S.keys.Digit1) R.rotateBy(1.2 * cdt);
      if (S.keys.Digit3) R.rotateBy(-1.2 * cdt);
      // desktop held-turn pivots too (advisor): keyboard turning was still
      // grinding at machine rate (2 deg/s) with no pivot path
      S.keyTurnT = (S.keys.KeyA || S.keys.KeyD) ? (S.keyTurnT || 0) + cdt : 0;
      if (S.keyTurnT > 0.6 && mech.state.mode === "WALK" && !mech.state.aboutFace) { mechPivot(world, mech); S.keyTurnT = 0; }
      if (!S.keys.KeyA && !S.keys.KeyD && S.keyTurnPrev && mech.state.afLive && mech.state.aboutFace) { mech.state.aboutFace = null; mech.state.headingT = mech.state.heading; S.yawT = mech.state.heading; mech.state.recoverT = Math.max(mech.state.recoverT || 0, 0.5); }
      S.keyTurnPrev = S.keys.KeyA || S.keys.KeyD;
      // RIGHT stick = TURN (design 2026-08-01: cannon controls independent
      // of turning). Horizontal deflection is a turn-RATE command feeding
      // the same steering-locked heading target as A/D — the stick cannot
      // wind up a lead the machine can't follow.
      if (S.jetMode) {
        // JETS mode: right stick = the ROCKETS, nothing else. Left stick
        // still walks; the pilot blends legs and fire. (Driving the gait
        // from the burn vector measured falls at every authority tried —
        // walking + sustained burns needs the auto-stabilizer, and manual
        // mode is exactly the promise that it stays silent.)
        mech.jetCmd = { x: -(S.rx || 0), z: -(S.ry || 0) };
      } else {
        mech.jetCmd = null;
        if (Math.abs(S.rx) > 0.15) S.yawT -= S.rx * 0.9 * cdt;
        // HARD-OVER stick while walking = live pivot (advisor): intent is
        // only measurable here, upstream of the steering lock
        S.hardT = Math.abs(S.rx) > 0.5 ? (S.hardT || 0) + cdt : 0;
        if (S.hardT > 0.6 && mech.state.mode === "WALK" && !mech.state.aboutFace) { mechPivot(world, mech); S.hardT = 0; }
      }
      // steering lock: the heading COMMAND may lead the actual body by at
      // most 0.5 rad. Unbounded lead (chassis-follow wound to 3.7 rad for a
      // 1.6 rad aim) forced max-rate turning long after the stick released.
      {
        // steering lock anchors on the SMOOTH command frame, not measured
        // yaw (advisor): re-anchoring to the wobbling hull each frame fed
        // yaw measurement noise back into the heading command — the held-
        // stick target wobbled +-0.3 rad at browser frame rates and the
        // machine chased its own noise into falls (traced, 2/6 settles)
        const anchor = mech.state.heading;
        let lead = S.yawT - anchor;
        while (lead > Math.PI) lead -= 2 * Math.PI;
        while (lead < -Math.PI) lead += 2 * Math.PI;
        S.yawT = anchor + Math.max(-0.5, Math.min(0.5, lead));
      }
      // touch cannon = TURRET: ◀ ▶ slew a body-relative aim offset (clamped
      // inside the waist's reach so the reticle never promises a bearing the
      // torso can't hold), slider sets range. Turning the body sweeps the
      // reticle with it; the arrows trim on top. Desktop keeps mouse aim.
      if (isTouch) {
        if (S.aimHeld) S.aimOff = Math.max(-0.85, Math.min(0.85, S.aimOff + S.aimHeld * 0.9 * cdt));
        // aim rides the COMMAND frame, not measured yaw (advisor): the
        // measured anchor fed hull wobble through the 1800kg waist at
        // frame rate — post-turn recoveries jittered the torso into
        // topples (audit falls in the turn->aim->fire sequence, twice)
        mech.aimYaw = mech.state.heading + S.aimOff;
      } else mech.aimYaw = S.aimYaw;
      mech.aimRange = S.aimRange;
      // chassis-follow ONLY while moving: turning works well inside the
      // gait, but auto-dragging a PARKED mech through a sustained in-place
      // turn is its weakest maneuver — invisible to the player until it
      // fell. Stationary aim holds at the waist stop; turn with A/D or by
      // walking. Rate = actual machine capability, not 5x it.
      if (mech.waist && Math.abs(mech.waist.target) > 0.6 * 0.87 && Math.hypot(tf, tl) > 0.05)
        S.yawT += Math.sign(mech.waist.target) * 0.12 * cdt;
      // about-face owns the heading while it runs — writing S.yawT every
      // frame would overwrite the 180 target the maneuver is executing
      mechCommand(mech, { travel: tf, lateral: tl, heading: mech.state.aboutFace ? null : S.yawT });
      if (S.keys.Space || S.keys.KeyF || S.fireHeld) mechFire(world, mech); // rate-limited inside
    };
    const loop = () => {
      if (S.dead) return;
      const now = performance.now();
      let dt = Math.min(0.05, (now - S.last) / 1000);
      S.last = now;
      // awareness: the garrison wakes on proximity (inside the picket),
      // on ANY weapon discharge within earshot, or on taking damage
      const mh = mech.hull;
      S.aiT += dt;
      if (S.aiT > 0.3) {
        S.aiT = 0;
        if (!S.alert) {
          const dOut = Math.hypot(mh.pos.x - OUTPOST.x, mh.pos.z - OUTPOST.z);
          const fired = (mech.telem.shots || 0) + (mech.telem.salvos || 0) > 0;
          const hurt = hostiles.some((h) => !h.alive || h.hp < h._hp0);
          // picket 28 (was 42): the 41m spawn sits right where the old
          // picket line ran — the garrison would wake before the first step
          if (dOut < 28 || (fired && dOut < 90) || hurt) S.alert = true;
        }
      }
      // tank platoon AI: standoff orbit + gunnery — only once ALERTED
      S.aiT2 = (S.aiT2 || 0) + dt;
      if (S.aiT2 > 0.3 && S.alert) {
        S.aiT2 = 0;
        S.orbit += 0.045;
        for (let ti = 0; ti < tanks.length; ti++) {
          const t = tanks[ti];
          if (!t.alive) continue;
          const dx = t.pos.x - mh.pos.x, dz = t.pos.z - mh.pos.z;
          const d = Math.max(1, Math.hypot(dx, dz));
          const ang = Math.atan2(dx, dz) + S.orbit * 0 + 0; // ring point on the tank's current bearing
          const ring = 26;
          const oa = ang + Math.sin(S.orbit + ti * 2.1) * 0.5; // weave along the ring
          // ring points clamp INSIDE the field — a mech near the edge put
          // the ring outside the map and the platoon drove off the world
          const lim = world.field.half - 6;
          t.goal = {
            x: Math.max(-lim, Math.min(lim, mh.pos.x + Math.sin(oa) * ring)),
            z: Math.max(-lim, Math.min(lim, mh.pos.z + Math.cos(oa) * ring)),
          };
        }
      }
      for (let ti = 0; ti < tanks.length && S.alert; ti++) {
        const t = tanks[ti];
        if (!t.alive) continue;
        S.tankFire[ti] -= dt;
        const dx = mh.pos.x - t.pos.x, dz = mh.pos.z - t.pos.z;
        const d = Math.hypot(dx, dz);
        if (S.tankFire[ti] <= 0 && d > 14 && d < 55 && t.R[4] > 0.7) {
          S.tankFire[ti] = 4.6 + ti * 1.3;
          const tf = d / 95; // flight time
          const aim = { x: mh.pos.x + mh.v.x * tf - t.pos.x, y: mh.pos.y - (t.pos.y + 1.3) + 0.5 * 9.81 * tf * tf, z: mh.pos.z + mh.v.z * tf - t.pos.z };
          const n = Math.hypot(aim.x, aim.y, aim.z);
          const dir = { x: aim.x / n, y: aim.y / n, z: aim.z / n };
          const muzzle = { x: t.pos.x + dir.x * 2.8, y: t.pos.y + 1.3, z: t.pos.z + dir.z * 2.8 };
          fireProjectile(world, muzzle, dir, 95, { kind: "shell", pmass: 30, r: 2.0, kv: 14, dmg: 55, crater: 0.35, attacker: "world", owner: t.id });
          t.v.x -= dir.x * (30 * 95) / t.mass; t.v.z -= dir.z * (30 * 95) / t.mass;
        }
      }
      S.acc += dt;
      let guard = 0;
      // accumulate events across substeps — clearing per-substep starved the
      // renderer: muzzle flashes and explosions never drew in this mode
      const evs = [];
      while (S.acc >= world.dt && guard++ < 6) {
        feedCommands(world.dt); // Q: one command computation per sim tick — game == harness cadence
        world.events.length = 0;
        stepWorld(world);
        for (const e of world.events) evs.push(e);
        S.acc -= world.dt;
      }
      R.consume(evs);
      A.setListener(mech.hull.pos.x, mech.hull.pos.z, 50);
      A.consume(evs);
      A.tick(world, dt);
      const h = mech.hull;
      // CAMERA (perceptual campaign): critically-damped spring follow with
      // the gait band filtered out. The raw 4/dt lerp carried 82% of the
      // stride sway into the frame (0.34m lateral horizon pump measured) —
      // the whole WORLD walked with the machine. A second-order follow at
      // w=2.6 (xz) / 1.4 (y) rides through the 0.55 Hz sway and 1.1 Hz bob
      // while tracking real locomotion with ~0.4s of lag; the mech now bobs
      // WITHIN a steady frame, which is what reads as smooth.
      {
        const cdt = Math.min(0.05, dt);
        if (!S.camV) S.camV = { x: 0, y: 0, z: 0 };
        const tgt = { x: h.pos.x, y: h.pos.y - 1.2, z: h.pos.z };
        const far = Math.hypot(tgt.x - focus.x, tgt.z - focus.z);
        if (far > 6) { // reissue/teleport: snap, don't chase
          focus.x = tgt.x; focus.y = tgt.y; focus.z = tgt.z;
          S.camV.x = 0; S.camV.y = 0; S.camV.z = 0;
        } else {
          const axis = (p, v, t, om) => {
            const a = om * om * (t - p) - 2 * om * v;
            return [p + v * cdt + 0.5 * a * cdt * cdt, v + a * cdt];
          };
          let r;
          r = axis(focus.x, S.camV.x, tgt.x, 2.2); focus.x = r[0]; S.camV.x = r[1];
          r = axis(focus.z, S.camV.z, tgt.z, 2.2); focus.z = r[0]; S.camV.z = r[1];
          r = axis(focus.y, S.camV.y, tgt.y, 1.1); focus.y = r[0]; S.camV.y = r[1];
        }
      }
      // targeting: the shell's actual ballistic arc from the muzzle, drawn
      // with the same setTraj machinery the bison uses. Preview inputs are
      // LOW-PASSED (tau 0.3s): the raw torso pose carries the gait wobble
      // and the endpoint wandered FIVE METERS during a march (p2p 5.06m
      // measured) — the LPF'd preview shows the expected volley centre;
      // actual fire ballistics remain live and untouched.
      if (S.leapAim) {
        const yawL = S.aimYaw != null ? S.aimYaw : mech.state.heading + (isTouch ? S.aimOff : 0);
        const rMaxL = mechLeapRange(mech);
        const rL = Math.min(S.aimRange, rMaxL);
        const mx = mech.hull.pos.x + Math.sin(yawL) * rL, mz2 = mech.hull.pos.z + Math.cos(yawL) * rL;
        // the arc, sampled: 55-degree ballistic to the mark
        const TH = 0.96, g9 = 9.81;
        const v9 = Math.min(30, Math.sqrt(Math.max(6, rL) * g9 / Math.sin(2 * TH)));
        const vy9 = v9 * Math.sin(TH), vh9 = v9 * Math.cos(TH);
        const T9 = 2 * vy9 / g9;
        const pts9 = [];
        for (let k9 = 0; k9 <= 20; k9++) {
          const t9 = (k9 / 20) * T9;
          pts9.push({
            x: mech.hull.pos.x + Math.sin(yawL) * vh9 * t9,
            y: mech.hull.pos.y + vy9 * t9 - 0.5 * g9 * t9 * t9,
            z: mech.hull.pos.z + Math.cos(yawL) * vh9 * t9,
          });
        }
        R.setTraj(pts9, null);
        R.setLeapRing(mech.hull.pos.x, mech.hull.pos.z, rMaxL, { x: mx, z: mz2 });
      } else R.setLeapRing(null);
      if (!S.leapAim) try {
        const raw = mechAimDir(world, mech);
        if (!S.pv) S.pv = { m: { ...raw.muzzle }, d: { ...raw.dir } };
        const k3 = Math.min(1, dt / 0.45);
        for (const ax of ["x", "y", "z"]) {
          S.pv.m[ax] += (raw.muzzle[ax] - S.pv.m[ax]) * k3;
          S.pv.d[ax] += (raw.dir[ax] - S.pv.d[ax]) * k3;
        }
        const dn = Math.hypot(S.pv.d.x, S.pv.d.y, S.pv.d.z) || 1;
        const muzzle = S.pv.m, dir = { x: S.pv.d.x / dn, y: S.pv.d.y / dn, z: S.pv.d.z / dn };
        const pts = [];
        let px = muzzle.x, py = muzzle.y, pz = muzzle.z;
        let vx = dir.x * 120, vy = dir.y * 120, vz = dir.z * 120;
        let hitIdx = -1;
        const st2 = ((mech.aimRange || 26) / 120) / 14; // ~14 samples to the commanded range at any distance
        for (let k2 = 0; k2 < 22; k2++) {
          pts.push({ x: px, y: py, z: pz });
          vy -= 9.81 * st2;
          px += vx * st2; py += vy * st2; pz += vz * st2;
          if (py <= world.field.heightAt(px, pz)) { pts.push({ x: px, y: world.field.heightAt(px, pz), z: pz }); hitIdx = pts.length - 1; break; }
        }
        R.setTraj(pts, hitIdx);
        window.__MECHRANGE__.dbg.trajEnd = hitIdx >= 0 ? pts[hitIdx] : pts[pts.length - 1];
      } catch (e) {}
      window.__MECHRANGE__.dbg.hull = { x: h.pos.x, y: h.pos.y, z: h.pos.z };
      try { R.render(dt, focus, { x: h.pos.x, z: h.pos.z }, 0); } catch (e) {}
      try { RD.update(world, mech, dt); } catch (e) {}
      // bubble gauge: pitch/roll bubble + yaw compass tick + burn ring
      if (bubbleRef.current && gaugeRingRef.current && yawTickRef.current) {
        const Rh = mech.hull.R;
        let bx = -Rh[3] * 90, by = -Rh[5] * 90; // screen: right = -x, up = +z
        const mm = Math.hypot(bx, by);
        if (mm > 21) { bx *= 21 / mm; by *= 21 / mm; }
        bubbleRef.current.style.transform = "translate(" + bx.toFixed(1) + "px," + by.toFixed(1) + "px)";
        const tilt = Math.hypot(Rh[3], Rh[5]);
        bubbleRef.current.style.background = tilt < 0.06 ? "#7fd47f" : tilt < 0.14 ? "#e0b85e" : "#e06a5e";
        yawTickRef.current.style.transform = "rotate(" + (-Math.atan2(Rh[6], Rh[8])).toFixed(3) + "rad)";
        const burning = mech.thrusters && mech.thrustersOn && mech.thrusters.some((t2) => t2.cur > 0.1);
        gaugeRingRef.current.style.borderColor = burning ? "#c96a3a" : "#5f6e80";
      }
      if (pressureRef.current) pressureRef.current.style.height = Math.round((mech.leapP || 0) * 100) + "%";
      S.hudT += dt;
      if (S.hudT > 0.25) {
        S.hudT = 0;
        setHud({
          mode: mech.state.mode, steps: mech.telem.steps, falls: mech.telem.falls, kills: world.killCount, shots: mech.telem.shots || 0,
          alert: S.alert, gyro: mech.gyroOn !== false, rcs: !!mech.thrustersOn, jets: !!S.jetMode,
          maneuver: mech.leap ? "LEAP" : mech.state.aboutFace ? (mech.state.afLive ? "PIVOT" : "ABOUT-FACE") : mech.state.kick ? "PUNT" : mech.state.puntReq > 0 ? "PUNT PENDING" : null,
          poise: !!mech.state.poise,
          mslCd: Math.max(0, 6 - (world.t - (mech._lastMsl ?? -99))),
          hot: (mech.jetHeat || 0) > 0.5,
        });
      }
      S.raf = requestAnimationFrame(loop);
    };
    S.raf = requestAnimationFrame(loop);
    return () => {
      S.dead = true;
      cancelAnimationFrame(S.raf);
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("pointerdown", onPD);
      window.removeEventListener("pointermove", onPM);
      window.removeEventListener("pointerup", onPU);
      window.removeEventListener("touchend", onTE);
      window.removeEventListener("touchcancel", onTE);
      window.removeEventListener("pointercancel", onPU);
      delete window.__MECHRANGE__;
      RD.dispose();
      A.dispose();
      R.dispose();
    };
  }, []);
  const line = { margin: 0, fontFamily: FONT, fontSize: 12, letterSpacing: 1 };
  return (
    <div style={{ position: "fixed", inset: 0, background: "#000", touchAction: "none", userSelect: "none", WebkitUserSelect: "none", WebkitTouchCallout: "none" }}>
      <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />
      <div data-mech-hud style={{ position: "absolute", top: 10, left: 12, color: "#c7d0dc", pointerEvents: "none" }}>
        <p style={{ ...line, color: COLORS.gold, fontSize: 14, letterSpacing: 2 }}>MECH TEST RANGE</p>
        <p style={line}>BIPED FRAME MK1 — GAIT ACCEPTANCE PENDING</p>
        <p style={line}>{isTouch ? "L stick moves · R stick turns (or JETS) · ◀ ▶ aim · slider range" : "W/S walk · A/D turn · MOUSE aims · CLICK fire · V missiles · C punt · X one-leg · T 180 · G gyro · H rockets · J jets · 1/3 camera · L leap · B readout · R reissue"}</p>
        <p data-mech-status style={line}>
          {hud.mode === "FALLEN" ? "FRAME DOWN — R TO REISSUE" : hud.maneuver ? hud.mode + " · " + hud.maneuver : hud.mode} · steps {hud.steps} · falls {hud.falls} · kills {hud.kills} · shots {hud.shots} · <span style={{ color: hud.mslCd > 0.1 ? "#e0b85e" : "#7fd47f" }}>MSL {hud.mslCd > 0.1 ? Math.ceil(hud.mslCd) + "s" : "READY"}</span> · garrison {hud.alert ? "ALERTED" : "unaware"}
        </p>
      </div>
      <>
        {/* attitude bubble gauge: pitch/roll bubble, yaw compass tick,
            ring ignites while thrusters burn */}
        <div data-mech-pressure style={{ position: "absolute", left: "calc(50% - 78px)", top: 8, width: 34, height: 60, border: "1px solid #5f6e80", background: "rgba(16,20,26,0.55)", pointerEvents: "none", overflow: "hidden" }}>
          <div ref={pressureRef} style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "0%", background: "#b89a5e" }} />
        </div>
        <div ref={gaugeRingRef} style={{ position: "absolute", left: "calc(50% - 30px)", top: 8, width: 60, height: 60, borderRadius: 32, border: "1px solid #5f6e80", background: "rgba(16,20,26,0.55)", pointerEvents: "none" }}>
          <div style={{ position: "absolute", left: 22, top: 22, width: 16, height: 16, borderRadius: 9, border: "1px solid rgba(95,110,128,0.5)" }} />
          <div ref={yawTickRef} style={{ position: "absolute", left: 28, top: 2, width: 4, height: 8, background: "#e8d9b8", transformOrigin: "2px 28px" }} />
          <div ref={bubbleRef} style={{ position: "absolute", left: 25, top: 25, width: 10, height: 10, borderRadius: 6, background: "#7fd47f" }} />
        </div>
        <button data-mech-gyro onClick={() => { const m = window.__MECHRANGE__; if (m) m.gyro(); }}
          style={{ position: "absolute", right: 196, top: 90, padding: "10px 12px", fontFamily: FONT, fontSize: 12, letterSpacing: 1, color: hud.gyro ? "#c7d0dc" : "#e8c9b8", background: hud.gyro ? "#1a212b" : "#3a2118", border: hud.gyro ? "1px solid #5f6e80" : "1px solid #7a5e4e" }}>
          GYRO {hud.gyro ? "ON" : "OFF"}
        </button>
        <button data-mech-jets onClick={() => { const m = window.__MECHRANGE__; if (m) m.jets(); }}
          style={{ position: "absolute", right: 196, top: 198, padding: "10px 12px", fontFamily: FONT, fontSize: 12, letterSpacing: 1, color: hud.jets ? (hud.hot ? "#e06a5e" : "#e8c9b8") : "#c7d0dc", background: hud.jets ? "#3a2118" : "#1a212b", border: hud.jets ? (hud.hot ? "1px solid #a04a3a" : "1px solid #7a5e4e") : "1px solid #5f6e80" }}>
          R-STICK: {hud.jets ? "JETS" : "TURN"}
        </button>
        <button data-mech-rcs onClick={() => { const m = window.__MECHRANGE__; if (m) m.rcs(); }}
          style={{ position: "absolute", right: 196, top: 144, padding: "10px 12px", fontFamily: FONT, fontSize: 12, letterSpacing: 1, color: hud.rcs ? "#c7d0dc" : "#e8c9b8", background: hud.rcs ? "#1a212b" : "#3a2118", border: hud.rcs ? "1px solid #5f6e80" : "1px solid #7a5e4e" }}>
          ROCKETS {hud.rcs ? "ON" : "OFF"}
        </button>
        {/* action buttons + REISSUE/MENU: every device — desktop had no
            on-screen buttons at all and the 180/PUNT surface was invisible */}
          <button data-mech-msl onPointerDown={(e) => { e.stopPropagation(); const m = window.__MECHRANGE__; if (m) m.missiles(); }}
            style={{ position: "absolute", ...(narrow ? { left: 12, bottom: 200 } : { left: "calc(50% + 5px)", bottom: 90 }), width: 88, height: 48, fontFamily: FONT, fontSize: 13, letterSpacing: 1, color: hud.mslCd > 0.1 ? "#7a6055" : "#e8c9b8", background: hud.mslCd > 0.1 ? "rgba(30,22,18,0.9)" : "rgba(46,29,21,0.9)", border: "1px solid #7a5e4e", touchAction: "none", opacity: hud.mslCd > 0.1 ? 0.6 : 1 }}>
            {hud.mslCd > 0.1 ? "▲▲ " + Math.ceil(hud.mslCd) + "s" : "▲▲ MSL"}
          </button>
          <button data-mech-poise onPointerDown={(e) => { e.stopPropagation(); const m = window.__MECHRANGE__; if (m) m.poise(); }}
            style={{ position: "absolute", ...(narrow ? { left: 12, bottom: 252 } : { left: "calc(50% - 93px)", bottom: 90 }), width: 88, height: 48, fontFamily: FONT, fontSize: 13, letterSpacing: 1, color: "#c7d0dc", background: "rgba(29,37,49,0.9)", border: "1px solid #5f6e80", touchAction: "none" }}>
            {hud.poise ? "LOWER" : "ONE LEG"}
          </button>
          <button data-mech-about onPointerDown={(e) => { e.stopPropagation(); const m = window.__MECHRANGE__; if (m) m.about(); }}
            style={{ position: "absolute", ...(narrow ? { left: 12, bottom: 356 } : { left: "calc(50% + 103px)", bottom: 90 }), width: 88, height: 48, fontFamily: FONT, fontSize: 13, letterSpacing: 1, color: "#c7d0dc", background: "rgba(29,37,49,0.9)", border: "1px solid #5f6e80", touchAction: "none" }}>
            180
          </button>
          <button data-mech-punt onPointerDown={(e) => { e.stopPropagation(); const m = window.__MECHRANGE__; if (m) m.punt(); }}
            style={{ position: "absolute", ...(narrow ? { left: 12, bottom: 304 } : { left: "calc(50% - 191px)", bottom: 90 }), width: 88, height: 48, fontFamily: FONT, fontSize: 13, letterSpacing: 1, color: "#c7d0dc", background: "rgba(29,37,49,0.9)", border: "1px solid #5f6e80", touchAction: "none" }}>
            PUNT
          </button>
          <button data-mech-leap onPointerDown={(e) => { e.stopPropagation(); const m = window.__MECHRANGE__; if (m) m.leap(); }}
            style={{ position: "absolute", ...(narrow ? { left: 12, bottom: 408 } : { left: "calc(50% - 289px)", bottom: 90 }), width: 88, height: 48, fontFamily: FONT, fontSize: 13, letterSpacing: 1, color: "#c7d0dc", background: "rgba(29,37,49,0.9)", border: "1px solid #5f6e80", touchAction: "none" }}>
            LEAP
          </button>
          <button data-mech-reissue onClick={() => window.__MECHRANGE__ && window.__MECHRANGE__.reissue()}
            style={{ position: "absolute", right: 70, top: 90, padding: "12px 16px", fontFamily: FONT, fontSize: 13, letterSpacing: 1, color: "#c7d0dc", background: "#1a212b", border: "1px solid #5f6e80" }}>
            ⟲ REISSUE
          </button>
          <button data-mech-exit onClick={onExit}
            style={{ position: "absolute", right: 70, top: 144, padding: "12px 16px", fontFamily: FONT, fontSize: 13, letterSpacing: 1, color: "#c7d0dc", background: "#1a212b", border: "1px solid #444c58" }}>
            ⏏ MENU
          </button>
      </>
      {isTouch && (
        <>
          {/* LEFT stick: travel */}
          <div style={{ position: "absolute", left: 86 - 55, bottom: 130 - 55, width: 110, height: 110, borderRadius: 60, border: "1px solid #5f6e80", opacity: 0.55, pointerEvents: "none" }} />
          <div ref={knobRef} style={{ position: "absolute", left: 86 - 20, top: "calc(100% - 150px)", width: 40, height: 40, borderRadius: 22, background: "#5f6e80", opacity: 0.8, pointerEvents: "none" }} />
          {/* RIGHT stick: body turn (horizontal axis) */}
          <div style={{ position: "absolute", right: 86 - 55, bottom: 130 - 55, width: 110, height: 110, borderRadius: 60, border: "1px solid #5f6e80", opacity: 0.55, pointerEvents: "none" }} />
          <div style={{ position: "absolute", right: 86 - 26, bottom: 130 + 62, width: 52, textAlign: "center", color: "#8fa0b4", fontFamily: FONT, fontSize: 11, letterSpacing: 1, pointerEvents: "none" }}>TURN</div>
          <div ref={rsKnobRef} style={{ position: "absolute", left: "calc(100% - 106px)", top: "calc(100% - 150px)", width: 40, height: 40, borderRadius: 22, background: "#5f6e80", opacity: 0.8, pointerEvents: "none" }} />
          {/* cannon range slider, right edge above the turn stick */}
          <div data-mech-rangeslider
            onPointerDown={(e) => { e.stopPropagation(); const m = window.__MECHRANGE__; if (m) m.grabRange(e.pointerId, e.clientY); }}
            style={{ position: "absolute", right: 12, bottom: 200, width: 44, height: 150, borderRadius: 8, background: "rgba(28,33,41,0.75)", border: "1px solid #7a6a4e", touchAction: "none" }}>
            <div style={{ position: "absolute", left: 20, top: 6, bottom: 6, width: 3, background: "#5f6e80" }} />
          </div>
          <div ref={rngThumbRef} style={{ position: "absolute", right: 8, top: "calc(100% - 253px)", width: 52, height: 24, borderRadius: 6, background: "#b89a5e", pointerEvents: "none" }} />
          <div ref={rngLabelRef} style={{ position: "absolute", right: 8, bottom: 354, width: 52, textAlign: "center", color: "#e8d9b8", fontFamily: FONT, fontSize: 13, textShadow: "0 1px 2px #000" }}>26m</div>
          {/* CANNON cluster, bottom centre: turret slew arrows with FIRE between */}
          <button data-mech-aiml
            onPointerDown={(e) => { e.stopPropagation(); const m = window.__MECHRANGE__; if (m) m.aim(-1); }}
            onPointerUp={(e) => { e.stopPropagation(); const m = window.__MECHRANGE__; if (m) m.aim(0); }}
            onPointerLeave={() => { const m = window.__MECHRANGE__; if (m) m.aim(0); }}
            onPointerCancel={() => { const m = window.__MECHRANGE__; if (m) m.aim(0); }}
            style={{ position: "absolute", left: "calc(50% - 158px)", bottom: 16, width: 72, height: 62, fontFamily: FONT, fontSize: 22, color: "#e8d9b8", background: "rgba(42,29,21,0.9)", border: "1px solid #7a6a4e", touchAction: "none" }}>
            {"\u25C0\uFE0E"}
          </button>
          <button data-mech-aimr
            onPointerDown={(e) => { e.stopPropagation(); const m = window.__MECHRANGE__; if (m) m.aim(1); }}
            onPointerUp={(e) => { e.stopPropagation(); const m = window.__MECHRANGE__; if (m) m.aim(0); }}
            onPointerLeave={() => { const m = window.__MECHRANGE__; if (m) m.aim(0); }}
            onPointerCancel={() => { const m = window.__MECHRANGE__; if (m) m.aim(0); }}
            style={{ position: "absolute", left: "calc(50% + 86px)", bottom: 16, width: 72, height: 62, fontFamily: FONT, fontSize: 22, color: "#e8d9b8", background: "rgba(42,29,21,0.9)", border: "1px solid #7a6a4e", touchAction: "none" }}>
            {"\u25B6\uFE0E"}
          </button>
          <button data-mech-fire
            onPointerDown={(e) => { e.stopPropagation(); const m = window.__MECHRANGE__; if (m) m.fireHeld(true); }}
            onPointerUp={(e) => { e.stopPropagation(); const m = window.__MECHRANGE__; if (m) m.fireHeld(false); }}
            onPointerCancel={(e) => { e.stopPropagation(); const m = window.__MECHRANGE__; if (m) m.fireHeld(false); }}
            style={{ position: "absolute", left: "calc(50% - 48px)", bottom: 16, width: 96, height: 70, fontFamily: FONT, fontSize: 15, letterSpacing: 1, color: "#e8d9b8", background: "rgba(42,29,21,0.9)", border: "1px solid #7a6a4e", touchAction: "none" }}>
            {"\u25B2\uFE0E"} FIRE
          </button>
        </>
      )}

    </div>
  );
}
