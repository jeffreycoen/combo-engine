// THE SOUNDBOARD (mk0.58) — an audition bench for the game's sounds, reached
// by opening the page with ?sounds=1. It mounts INSTEAD of the game: no world,
// no physics, no renderer, just the sound engines.
//
// The one rule this file lives by: it NEVER makes a sound of its own. Every
// card hands hand-built EVENTS to a real consume() — the same shapes
// src/engine/core.js pushes when a gun fires and the same bare {type} cues
// DepotGame's bell cycle pushes — so what Jeff hears here is exactly what the
// game plays, coalescer, arrival delay, echo taps and all. If a card ever
// synthesised its own approximation the page would be worthless.
//
// mk0.58 adds A/B. Every card has two buttons. NEW runs the events through
// src/platform/audio.js — the live engine the game ships. OLD runs the SAME
// events through src/ui/soundboard-legacy-audio.js, a frozen photograph of
// that module as it stood at mk0.57. Two engines means two AudioContexts,
// side by side in one page, so the comparison is the sound and nothing else.
import React, { useEffect, useRef, useState } from "react";
import { COLORS, FONT } from "./theme.js";
import { makeGameAudio } from "../platform/audio.js";
import { makeLegacyGameAudio } from "./soundboard-legacy-audio.js";
import { MK } from "../version.js";

// WINTER FRONT sets its listener range to 46 / zoom every frame (DepotGame
// ~line 2140); at the default zoom of 1 that is 46 metres. Matching it matters
// for more than loudness: the sniper's echo ring scales on dist/listener.range.
const RANGE = 46;
// "beside you" and "across the map": ~4 m and ~0.9 * range, both off-axis so
// the stereo pan is doing something.
const NEAR = { x: 3, z: -2.6 };    // 3.97 m
const FAR = { x: 12, z: -39.62 };  // 41.4 m — arrives ~121 ms late, by design
// Echo taps need reflectors, or echoes() returns immediately and the sniper
// has nothing to answer it. Three stand-in rock ridges, placed so all three
// clear the 45 ms tap floor from BOTH source points: from FAR they land at
// ~64/80/147 ms — the rolling answer — and from NEAR much later and far
// quieter, which is how a shot at your feet behaves in the game too.
const REFLECTORS = [
  { x: 30, z: -6, r: 8 },
  { x: -14, z: -34, r: 10 },
  { x: 24, z: -62, r: 9 },
];

// A muzzle event exactly as fireProjectile() writes it: kind is what the ROUND
// is, weapon is WHICH GUN fired. consume() reads type/x/z/weapon/kind.
const muzzle = (weapon, kind, at) => ({ type: "muzzle", x: at.x, y: 1, z: at.z, dx: 0, dy: 0, dz: -1, kind, weapon });
// n identical muzzles delivered in ONE drain — which is precisely how a burst
// or a volley reaches the engine. The real coalescer groups them (one key per
// weapon), hands the voice mass = sqrt(n), and WEAPON.mg undoes the sqrt to
// lay six rounds back out at machine-gun cadence. Nothing here shortcuts that.
const burst = (weapon, kind, n, at) => Array.from({ length: n }, () => muzzle(weapon, kind, at));

// The descriptions say what NEW is meant to be. OLD is whatever mk0.57 did.
const CARDS = [
  { id: "bell", name: "MUSTER BELL", desc: "A big bronze bell struck once. It should ARRIVE — a hard bright knock at the front, then the bell itself: a sad minor voice in the middle of your hearing, with a deep hum under it that keeps going after the rest has gone. Everything else in the mix steps back while it rings.", ev: () => [{ type: "bell" }] },
  { id: "pretoll", name: "PRE-TOLL", desc: "A whisper-quiet tick of the same bell, with no hammer on it — the rope taking up slack before the strike. Blink and you miss it.", ev: () => [{ type: "pretoll" }] },
  { id: "sniper-near", name: "SNIPER, NEAR", desc: "A heavy shot right beside you: a real deep BANG with a whipcrack riding on top of it, not just the whipcrack. The biggest, lowest report of the three infantry arms.", ev: () => [muzzle("sniper", "mg", NEAR)] },
  { id: "sniper-far", name: "SNIPER, FAR", desc: "The same rifle from across the map. Arrives a beat late, duller and quieter up front — but the map answers it: a rolling echo that outlasts the shot itself.", ev: () => [muzzle("sniper", "mg", FAR)] },
  { id: "rifle", name: "RIFLE", desc: "The same shape of sound as the sniper but smaller in every direction: the bang is higher, shorter and lighter, and the crack on top is thinner. The two should never blur.", ev: () => [muzzle("rifle", "mg", NEAR)] },
  { id: "rifle-volley", name: "RIFLE VOLLEY", desc: "Several rifles in the same instant — one denser, thicker report. Still the light gun, just more of it.", ev: () => burst("rifle", "mg", 4, NEAR) },
  { id: "mg", name: "MG BURST", desc: "Ratatata: six rapid, distinct light bangs at machine-gun pace. The RATE is what says machine gun — a burst you could count, not one fat noise.", ev: () => burst("mg", "mg", 6, NEAR) },
  { id: "mortar", name: "MORTAR", desc: "A hollow, deep THOOMP — a tube, not a gun. Unchanged by the retune.", ev: () => [muzzle("mortar", "shell", NEAR)] },
  { id: "rocket", name: "ROCKET", desc: "A whooshing roar as the salvo leaves the rail. Unchanged by the retune.", ev: () => [muzzle("rocket", "shell", NEAR)] },
  { id: "tank", name: "TANK / SHELL", desc: "A heavy, flat BANG with real chest to it. The biggest single gun on the field. Unchanged by the retune.", ev: () => [muzzle("tank", "shell", NEAR)] },
  { id: "gren-toss", name: "GRENADE TOSS", desc: "A short soft throw — cloth and effort, no machine in it. Blink and you miss it.", ev: () => [{ type: "muzzle", x: 0, y: 1.5, z: 6, dx: 0, dy: 0.6, dz: 0.8, kind: "mg", weapon: "grenade" }] },
  { id: "gren-bounce", name: "GRENADE BOUNCE", desc: "A hard little clink off frozen ground — one knock, bright, gone.", ev: () => [{ type: "gbounce", x: 0, z: 8 }] },
  { id: "gren-blast", name: "GRENADE BLAST", desc: "A real blast in the middle of your hearing, shorter and sharper than a shell — a crack, a thump, and the map answering.", ev: () => [{ type: "boom", x: 0, z: 10, r: 2, kind: "grenade" }] },
  { id: "tesla-strike", name: "TESLA STRIKE", desc: "The first bolt: a bright electrical sizzle — frying, crackling, right at the arc — and under it the first thunder, a long low rumble that outlasts the crack.", ev: () => [{ type: "zap", x: 0, z: 6, x2: 4, z2: 6, hop: 0 }] },
  { id: "tesla-chain", name: "TESLA CHAIN", desc: "Five hits walking away at 150ms steps. Each hit sizzles and then rolls its own thunder, each a shade deeper and longer than the last — a storm rolling across the field, never one clap.", ev: () => Array.from({ length: 5 }, (_, i) => ({ type: "zap", x: i * 3, z: 6, x2: (i + 1) * 3, z2: 6, hop: i, dly: i * 0.15 })) },
  { id: "tesla-pond", name: "ELECTRIFIED POND", desc: "A frozen pond taking the chain: a wide fizzing wash across the whole surface, hissing, no thunder of its own.", ev: () => [{ type: "pondzap", x: 0, z: 8, r: 6 }] },
];

const WIND = {
  id: "wind",
  desc: "Weather, not a hum. It should have real weight down low, thin out as it goes up, and never sit still: a slow swell over tens of seconds, gusts over a few, and a fast flutter on top, all wandering at once and never repeating. Gusts should get HISSIER as well as louder.",
};

// tick(world, dt) walks world.bodies twice unguarded and reaches for
// projectiles/contacts/mechs behind guards — so the smallest world that
// satisfies it is a handful of empty lists. The wind bed itself needs nothing
// from the world at all; it is driven by dt.
const STUB_WORLD = { t: 0, bodies: [], projectiles: [], contacts: [], mechs: [] };

export default function SoundBoard() {
  // one engine per side. Both are built up front but neither opens an
  // AudioContext until its first ensure(), which is inside a tap.
  const engines = useRef(null);
  const rafRef = useRef(0);
  const [wind, setWind] = useState(null);   // null | "old" | "new"
  const [last, setLast] = useState(null);   // "<cardId>:<side>"

  if (!engines.current) {
    const mk = (make) => { const A = make(); A.setListener(0, 0, RANGE); A.setReflectors(REFLECTORS); return A; };
    engines.current = { old: mk(makeLegacyGameAudio), new: mk(makeGameAudio) };
  }

  useEffect(() => () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    for (const k of ["old", "new"]) { try { engines.current[k].dispose(); } catch (e) {} }
  }, []);

  // Browsers only allow a context to start inside a gesture, so ensure() is
  // called on every tap — it is idempotent and also resumes a suspended
  // context (iOS suspends on the way back from a lock screen).
  const fire = (card, side) => {
    const A = engines.current[side];
    A.ensure();
    A.consume(card.ev());
    setLast(card.id + ":" + side);
  };

  // Only one wind bed runs at a time: tapping either side stops whichever was
  // going. tick() re-asserts its loops every call so a bed can never decay
  // itself away; stopAll (behind setMuted) is the engine's own way to end a
  // continuous voice, and it is flicked straight back off so cards still sound.
  const stopWind = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
    for (const k of ["old", "new"]) { const A = engines.current[k]; A.setMuted(true); A.setMuted(false); }
  };
  const toggleWind = (side) => {
    const running = wind;
    stopWind();
    setLast(WIND.id + ":" + side);
    if (running === side) { setWind(null); return; }
    const A = engines.current[side];
    A.ensure();
    setWind(side);
    let prev = performance.now();
    const step = (now) => {
      const dt = Math.min(0.1, (now - prev) / 1000);
      prev = now;
      STUB_WORLD.t += dt;
      A.tick(STUB_WORLD, dt);
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
  };

  const cardStyle = {
    background: COLORS.btnBg,
    border: `2px solid ${COLORS.btnBorder}`,
    padding: "14px 14px 12px",
    marginTop: 12,
  };
  const abStyle = (hot, isNew) => ({
    flex: 1,
    background: hot ? (isNew ? "rgba(56,86,72,0.95)" : "rgba(70,62,52,0.95)") : "rgba(0,0,0,0.25)",
    border: `2px solid ${hot ? (isNew ? "#9fe4bc" : "#e0c48c") : COLORS.btnBorder}`,
    color: hot ? (isNew ? "#9fe4bc" : "#e0c48c") : COLORS.text,
    fontFamily: FONT,
    fontSize: 14,
    letterSpacing: 3,
    padding: "12px 0",
    cursor: "pointer",
    touchAction: "manipulation",
    WebkitTapHighlightColor: "transparent",
  });

  const pair = (id, oldOn, newOn, onOld, onNew, oldLabel, newLabel) => (
    <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
      <button data-sound={id} data-ab="old" style={abStyle(oldOn, false)} onClick={onOld}>{oldLabel}</button>
      <button data-sound={id} data-ab="new" style={abStyle(newOn, true)} onClick={onNew}>{newLabel}</button>
    </div>
  );

  return (
    <div data-soundboard style={{ position: "fixed", inset: 0, overflow: "auto", background: COLORS.bg, color: COLORS.text, fontFamily: FONT, userSelect: "none", WebkitUserSelect: "none" }}>
      <div style={{ width: "min(460px, 94vw)", margin: "0 auto", padding: "22px 0 40px" }}>
        <div style={{ textAlign: "center", marginBottom: 10 }}>
          <div style={{ fontSize: 24, color: COLORS.red, letterSpacing: 6 }}>SOUNDBOARD</div>
          <div data-mk style={{ opacity: 0.5, letterSpacing: 2, fontSize: 10, marginTop: 4 }}>{MK}</div>
          <div style={{ fontSize: 12, opacity: 0.8, marginTop: 8, letterSpacing: 1 }}>Tap any card. Wearing headphones is best.</div>
          <div style={{ fontSize: 12, opacity: 0.85, marginTop: 6, lineHeight: 1.5 }}>
            <span style={{ color: "#e0c48c" }}>OLD</span> = mk0.57 sounds, <span style={{ color: "#9fe4bc" }}>NEW</span> = the retune.
          </div>
        </div>

        {CARDS.map((c) => (
          <div key={c.id} style={cardStyle}>
            <div style={{ color: COLORS.bright, fontSize: 15, letterSpacing: 2 }}>{c.name}</div>
            <div style={{ fontSize: 12, opacity: 0.8, marginTop: 6, lineHeight: 1.45 }}>{c.desc}</div>
            {pair(c.id, last === c.id + ":old", last === c.id + ":new", () => fire(c, "old"), () => fire(c, "new"), "OLD", "NEW")}
          </div>
        ))}

        <div style={cardStyle}>
          <div style={{ color: COLORS.bright, fontSize: 15, letterSpacing: 2 }}>WIND: {wind ? wind.toUpperCase() + " RUNNING" : "OFF"}</div>
          <div style={{ fontSize: 12, opacity: 0.8, marginTop: 6, lineHeight: 1.45 }}>{WIND.desc}</div>
          {pair(WIND.id, wind === "old", wind === "new", () => toggleWind("old"), () => toggleWind("new"), wind === "old" ? "OLD: ON" : "OLD", wind === "new" ? "NEW: ON" : "NEW")}
        </div>

        <div style={{ textAlign: "center", marginTop: 18, fontSize: 11, opacity: 0.5, lineHeight: 1.5 }}>
          Every sound here is played by a game engine — nothing on this page is a re-creation.
          <br />Drop the ?sounds=1 from the address to go back to the game.
        </div>
      </div>
    </div>
  );
}
