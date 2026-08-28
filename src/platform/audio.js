// platform/audio.js — the shared COLDSNAP sound engine. Procedural WebAudio,
// no asset files (artifact/Pages builds stay self-contained).
//
// Two layers, both driven by what the ENGINE says happened — never by which
// module is running:
//   consume(events)  — one-shots from the world's event stream (boom, muzzle,
//                      weldbreak, splash, kill...).
//   tick(world, dt)  — continuous state: vehicle engines rumble with speed
//                      and throttle, awake masonry grinds and knocks as it
//                      moves, mech footfalls and thruster roar, a wind bed.
//
// Spatial model (the anti-drum-machine pass): distance drives gain, an AIR
// lowpass (highs die first), the dry/wet split into a shared snowfield
// reverb, and true arrival delay (343 m/s). Loud events also cast up to
// three ECHO taps off registered reflectors (rock ridges, building faces):
// delay = path difference / 343, darker and quieter than the direct sound.
// Snow is acoustically dead, so the open field stays dry and short while
// masonry and granite clap back — that contrast is the map's acoustic
// signature. Every instance is humanized: ±12% pitch/length/gain and a few
// ms of onset jitter, with 3-8ms attack ramps so nothing clicks like a pad.
//
// mk0.58 RETUNE. The muster bell, the three infantry arms and the wind bed
// were rebuilt against published acoustics — bell partial ratios and strike
// note, forensic gunshot structure, wind turbulence spectra, and the ISO 226
// equal-loudness contours that say what any of it costs to hear. The spec of
// record, with every number's citation and every gap left open rather than
// guessed, is docs/superpowers/sound-profiles-reference.md; the
// section numbers in the comments below point into its PART TWO. The MUZZLE
// table (keyed on what the ROUND is) is deliberately untouched, so the demo,
// tower defense, the campaign and the mech keep the sounds they shipped with.
export function makeGameAudio() {
  let ctx = null, muted = false, master = null, comp = null, verb = null, verbGain = null;
  let bellBus = null, noiseBuf = null;
  const listener = { x: 0, z: 0, range: 60 };
  let reflectors = [];                    // [{x, z, r}] — big acoustic faces
  let voices = 0;
  const VOICE_CAP = 26;
  const C_SND = 343;                      // m/s
  const MASTER_G = 0.8;
  const fin = (v, d = 0) => (Number.isFinite(v) ? v : d); // HOTFIX mk1.37: the browser throws on non-finite params; a stray value degrades one sound, never the frame

  const ensure = () => {
    try {
      if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        ctx = new AC();
        comp = ctx.createDynamicsCompressor();
        comp.threshold.value = -18; comp.ratio.value = 6; comp.knee.value = 12;
        master = ctx.createGain(); master.gain.value = fin(MASTER_G, 0);
        master.connect(comp).connect(ctx.destination);
        // THE BELL'S OWN DOOR (mk0.58). Everything in the game goes out
        // through `master` into the compressor, and that compressor's job —
        // 250ms of recovery after every explosion — was quietly holding the
        // muster bell down for the whole five seconds it tried to ring. So
        // the bell leaves by a second bus that never meets the compressor,
        // and instead of the mix ducking the bell, the toll ducks the mix
        // (see duckMix). Same 0.8 trim, so nothing else about the balance
        // moves. Nothing but bellToll/preToll is ever routed here.
        bellBus = ctx.createGain(); bellBus.gain.value = fin(MASTER_G, 0);
        bellBus.connect(ctx.destination);
        const n = Math.floor(ctx.sampleRate * 2);
        noiseBuf = ctx.createBuffer(1, n, ctx.sampleRate);
        const d = noiseBuf.getChannelData(0);
        let b = 0; // pinkish: integrated white reads as rubble, not static
        for (let i = 0; i < n; i++) { const w = Math.random() * 2 - 1; b = (b + 0.04 * w) / 1.04; d[i] = (b * 3 + w * 0.35) * 0.8; }
        // snowfield impulse response: SHORT (fresh snow eats reflections),
        // dark, with a sparse early-reflection cluster so the tail has grain
        const irN = Math.floor(ctx.sampleRate * 0.9);
        const ir = ctx.createBuffer(2, irN, ctx.sampleRate);
        for (let chn = 0; chn < 2; chn++) {
          const cd = ir.getChannelData(chn);
          let lp = 0;
          for (let i = 0; i < irN; i++) {
            const t = i / irN;
            let v = (Math.random() * 2 - 1) * Math.exp(-t * 6.5);
            if (i < ctx.sampleRate * 0.09 && Math.random() < 0.004) v += (Math.random() * 2 - 1) * 0.5 * (1 - t * 4); // early slap grain
            lp += (v - lp) * 0.12; // darken the tail
            cd[i] = lp * 0.9;
          }
        }
        verb = ctx.createConvolver(); verb.buffer = ir;
        verbGain = ctx.createGain(); verbGain.gain.value = 0.9;
        verb.connect(verbGain).connect(master);
      }
      if (ctx && ctx.state === "suspended") ctx.resume().catch(() => {});
    } catch (e) {}
  };

  // ---- spatial plumbing ------------------------------------------------
  const dist = (x, z) => Math.hypot(x - listener.x, z - listener.z);
  const att = (d) => 1 / (1 + (d / listener.range) * 2.2);
  const panOf = (x) => Math.max(-0.8, Math.min(0.8, (x - listener.x) / listener.range));
  const vary = (v, pct = 0.12) => v * (1 + (Math.random() * 2 - 1) * pct);
  // one output chain per one-shot: air lowpass -> dry gain -> pan -> master,
  // with a wet split into the shared reverb. Returns the node to connect to
  // and the resolved start time (arrival delay + humanize jitter).
  // `out` picks the bus this voice leaves by: the shared (compressed) master
  // unless the caller hands over the bell bus.
  const chain = (x, z, baseGain, { wet = 0.35, delay = 0, dark = 1, out = null } = {}) => {
    const d = dist(x, z);
    const t0 = ctx.currentTime + delay + d / C_SND + Math.random() * 0.02;
    const near = Math.min(1, d / (listener.range * 1.6));
    const air = ctx.createBiquadFilter(); air.type = "lowpass";
    air.frequency.value = fin(Math.max(300, 9500 * Math.pow(1 - near, 1.6) * dark + 250), 440);
    const dry = ctx.createGain(); dry.gain.value = fin(baseGain * att(d) * (1 - wet * near * 0.8), 0);
    let tail = dry;
    if (ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = fin(panOf(x), 0); dry.connect(p); tail = p; }
    tail.connect(out || master);
    const wetG = ctx.createGain(); wetG.gain.value = fin(baseGain * att(d) * wet * (0.4 + near * 0.9), 0);
    air.connect(dry); air.connect(wetG); wetG.connect(verb);
    return { node: air, t0, d };
  };

  // ---- one-shot builders ----------------------------------------------
  const done = (src, t1) => { voices++; src.onended = () => { voices--; }; src.stop(fin(t1, ctx.currentTime)); };
  const ATK = 0.005; // attack ramp: pads click, munitions don't
  // `atk` (mk0.58) lets a caller ask for a faster onset than the anti-click
  // default — a muzzle blast is over in three milliseconds, so a five
  // millisecond ramp would BE the whole event. The onset jitter scales with
  // it, which leaves every pre-mk0.58 caller (atk = ATK) bit-for-bit as it was.
  const noise = (x, z, { f0 = 800, f1 = null, type = "lowpass", q = 1, dur = 0.1, gain = 0.2, rate = 1, delay = 0, wet = 0.35, dark = 1, atk = ATK }) => {
    if (muted || !ctx || voices >= VOICE_CAP) return;
    try {
      dur = vary(dur); gain = vary(gain); f0 = vary(f0);
      const { node, t0 } = chain(x, z, gain, { wet, delay, dark });
      const src = ctx.createBufferSource(); src.buffer = noiseBuf; src.playbackRate.value = fin(vary(rate), 1);
      src.loop = true; src.loopStart = Math.random() * 1.2;
      const f = ctx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(fin(f0, 440), fin(t0, ctx.currentTime)); f.Q.value = fin(q, 1);
      if (f1 != null) f.frequency.exponentialRampToValueAtTime(fin(Math.max(1e-4, Math.max(20, vary(f1))), 440), fin(t0 + dur, ctx.currentTime));
      const env = ctx.createGain();
      env.gain.setValueAtTime(0.0001, fin(t0, ctx.currentTime));
      env.gain.linearRampToValueAtTime(1, fin(t0 + atk + Math.random() * Math.min(0.004, atk * 0.8), ctx.currentTime));
      env.gain.setTargetAtTime(0.0001, t0 + atk, dur / 3); // convex settle, not a gate
      src.connect(f).connect(env).connect(node);
      src.start(fin(t0, ctx.currentTime));
      done(src, t0 + dur + 0.15);
    } catch (e) {}
  };
  const tone = (x, z, { f0 = 200, f1 = null, type = "sine", dur = 0.15, gain = 0.2, delay = 0, wet = 0.3, atk = ATK }) => {
    if (muted || !ctx || voices >= VOICE_CAP) return;
    try {
      dur = vary(dur); gain = vary(gain);
      const { node, t0 } = chain(x, z, gain, { wet, delay });
      const o = ctx.createOscillator(); o.type = type;
      o.frequency.setValueAtTime(fin(vary(f0, 0.06), 440), fin(t0, ctx.currentTime));
      if (f1 != null) o.frequency.exponentialRampToValueAtTime(fin(Math.max(1e-4, Math.max(15, f1)), 440), fin(t0 + dur, ctx.currentTime));
      const env = ctx.createGain();
      env.gain.setValueAtTime(0.0001, fin(t0, ctx.currentTime));
      env.gain.linearRampToValueAtTime(1, fin(t0 + atk, ctx.currentTime));
      env.gain.setTargetAtTime(0.0001, t0 + atk, dur / 3);
      o.connect(env).connect(node);
      o.start(fin(t0, ctx.currentTime));
      done(o, t0 + dur + 0.15);
    } catch (e) {}
  };
  // modal ring: 2-3 sharp resonant modes — this is what says "granite",
  // "stone on stone" instead of "snare"
  const modal = (x, z, modes, dur, gain, { delay = 0, wet = 0.4 } = {}) => {
    if (muted || !ctx || voices >= VOICE_CAP) return;
    try {
      const { node, t0 } = chain(x, z, vary(gain), { wet, delay });
      const src = ctx.createBufferSource(); src.buffer = noiseBuf; src.playbackRate.value = 1;
      src.loop = true; src.loopStart = Math.random() * 1.2;
      const sum = ctx.createGain(); sum.gain.value = 1;
      for (const m of modes) {
        const f = ctx.createBiquadFilter(); f.type = "bandpass";
        f.frequency.value = fin(vary(m.f, 0.08), 440); f.Q.value = fin(m.q || 22, 1);
        const g = ctx.createGain(); g.gain.value = fin(m.g || 1, 0);
        src.connect(f).connect(g).connect(sum);
      }
      const env = ctx.createGain();
      env.gain.setValueAtTime(0.0001, fin(t0, ctx.currentTime));
      env.gain.linearRampToValueAtTime(1, fin(t0 + 0.003, ctx.currentTime));
      env.gain.setTargetAtTime(0.0001, t0 + 0.003, dur / 3.2);
      sum.connect(env).connect(node);
      src.start(fin(t0, ctx.currentTime));
      done(src, t0 + dur + 0.1);
    } catch (e) {}
  };
  // echo taps: loud events bounce off up to 3 registered reflectors — a
  // darker, quieter copy delayed by the path difference. Skips tight taps
  // (<45ms) that would just phase against the direct sound.
  const echoes = (x, z, fire) => {
    if (!reflectors.length) return;
    const dDirect = dist(x, z);
    const taps = [];
    for (const r of reflectors) {
      const ds = Math.hypot(x - r.x, z - r.z), dl = Math.hypot(listener.x - r.x, listener.z - r.z);
      if (ds > 85 || ds < 3) continue;
      const delay = (ds + dl - dDirect) / C_SND;
      if (delay < 0.045 || delay > 0.7) continue;
      taps.push({ delay, k: (r.r || 4) / (8 + ds + dl), x: r.x, z: r.z });
    }
    taps.sort((a, b2) => b2.k - a.k);
    for (const tp of taps.slice(0, 3)) fire(tp.x, tp.z, tp.delay, Math.min(0.5, tp.k * 3));
  };
  // A SHOT (mk0.58 retune — docs/superpowers/sound-profiles-reference.md
  // §3.3). Forensic acoustics says a small-arms report is two events, not one:
  // the MUZZLE BLAST — the gas explosion at the barrel, under 5 ms long, peak
  // energy between 500 and 1000 Hz — and the CRACK, the bullet's shockwave,
  // above 2 kHz and under a third of a millisecond. The blast is the body of
  // the sound; the crack is the edge on it. Up to mk0.57 we shipped the edge
  // and nothing else, which is exactly why a sniper, a rifle and an MG were
  // three hisses with the corner moved.
  // Four layers, all riding ONE noise source through parallel branches, so a
  // whole shot costs a single voice (the old MG burst cost seventeen):
  //   A  blast body   — a wide band plus a tonal core at the same centre
  //   B  barrel echo  — layer A again 0.8 ms later at -6 dB (the pulse
  //                     reflecting back down the bore, a measured feature)
  //   C  crack        — a 1-2 ms highpassed edge on top, never the whole shot
  //   D  ground bounce— the whole report again ~2 ms later, -4 dB and dark:
  //                     every shot outdoors arrives twice. echoes() cannot do
  //                     this (it skips every tap under 45 ms, by design), so
  //                     the bounce is built here rather than by loosening a
  //                     floor that exists to stop map echoes phasing.
  // `gain` is a PRE-FILTER level: a bandpass at 550 Hz throws most of a noise
  // buffer away, so these read above 1 and still land quieter than the old
  // snaps did in peak.
  const shot = (x, z, { f = 700, bdur = 0.003, gain = 1, crack = 0.3, cdur = 0.0016, delay = 0, wet = 0.18, mass = 1 }) => {
    if (muted || !ctx || voices >= VOICE_CAP) return;
    try {
      const { node, t0 } = chain(x, z, vary(gain) * (0.72 + 0.28 * mass), { wet, delay });
      const src = ctx.createBufferSource(); src.buffer = noiseBuf;
      src.playbackRate.value = fin(vary(1, 0.06), 1);
      src.loop = true; src.loopStart = Math.random() * 1.2;
      const cf = vary(f, 0.06), bd = vary(bdur), cd = vary(cdur);
      const branch = (type, freq, q, atk, tau, amp) => {
        const flt = ctx.createBiquadFilter(); flt.type = type; flt.frequency.value = fin(freq, 440); flt.Q.value = fin(q, 1);
        const env = ctx.createGain();
        env.gain.setValueAtTime(0.0001, fin(t0, ctx.currentTime));
        env.gain.linearRampToValueAtTime(fin(amp, 0), fin(t0 + atk, ctx.currentTime));
        env.gain.setTargetAtTime(0.0001, t0 + atk, tau);
        src.connect(flt).connect(env);
        return env;
      };
      const A = ctx.createGain(); A.gain.value = 1;          // the blast
      branch("bandpass", cf, 1.0, 0.0008, bd / 3, 1).connect(A);
      branch("bandpass", cf, 3.5, 0.0008, bd / 3, 1.5).connect(A);
      const AC = ctx.createGain(); AC.gain.value = 1;        // blast + crack
      A.connect(AC);
      branch("highpass", 2200, 1, 0.0003, cd / 3, crack).connect(AC);
      AC.connect(node);
      const dB = ctx.createDelay(0.05); dB.delayTime.value = 0.0008;
      const gB = ctx.createGain(); gB.gain.value = 0.5;
      A.connect(dB).connect(gB).connect(node);
      const dG = ctx.createDelay(0.05); dG.delayTime.value = fin(0.0015 + Math.random() * 0.0015, 0);
      const lpG = ctx.createBiquadFilter(); lpG.type = "lowpass"; lpG.frequency.value = 4000;
      const gG = ctx.createGain(); gG.gain.value = 0.63;
      AC.connect(dG).connect(lpG).connect(gG).connect(node);
      src.start(fin(t0, ctx.currentTime));
      done(src, t0 + bd + 0.08);
    } catch (e) {}
  };

  // ---- the vocabulary --------------------------------------------------
  const explosion = (x, z, r = 2, echo = true) => {
    const big = Math.min(1, r / 4.5);
    // crack, then body, then tail — staggered onsets, not one stacked hit
    noise(x, z, { f0: 3400, type: "highpass", dur: 0.05, gain: 0.15 + big * 0.1, wet: 0.25 });
    tone(x, z, { f0: 90 + big * 30, f1: 26, type: "sine", dur: 0.4 + big * 0.3, gain: 0.5 + big * 0.35, delay: 0.02, atk: 0.012 });
    noise(x, z, { f0: 1300 - big * 400, f1: 110, dur: 0.35 + big * 0.4, gain: 0.4 + big * 0.3, delay: 0.03, wet: 0.5 });
    if (big > 0.4) noise(x, z, { f0: 210, f1: 55, dur: 1.0 + big * 0.4, gain: 0.24 * big, delay: 0.13, wet: 0.6, dark: 0.6 });
    if (echo) echoes(x, z, (ex, ez, dly, k) => noise(ex, ez, { f0: 500, f1: 90, dur: 0.3 + big * 0.2, gain: (0.3 + big * 0.25) * k, delay: dly, wet: 0.7, dark: 0.5 }));
  };
  // mk2.03: THE GRENADE BLAST — per the acoustics reference: the energy in
  // the 150-1200Hz band the ear reads as a real blast, short, one hard
  // crack on top, the map answering behind. // provisional, owner's ear rules
  function gblast(x, z) {
    noise(x, z, { f0: 3000, type: "highpass", dur: 0.02, gain: 0.18, wet: 0.15 });
    noise(x, z, { f0: 900, f1: 150, dur: 0.28, gain: 0.5, delay: 0.008, wet: 0.45 });
    tone(x, z, { f0: 96, f1: 44, type: "sine", dur: 0.16, gain: 0.3, atk: 0.006 });
    echoes(x, z, (ex, ez, dly, k) => noise(ex, ez, { f0: 480, f1: 90, dur: 0.22, gain: 0.24 * k, delay: dly, wet: 0.7, dark: 0.5 }));
  }
  // mk2.21: THE TESLA VOICE — provisional throughout (reference §6: no
  // published profile for an electric arc or for thunder; the owner's ear
  // rules on the soundboard). Two parts per hit: the sizzle (a bright
  // crackling burst at the bolt) and the thunder (a long rumble that
  // deepens and stretches as the chain walks — `hop` is the hit's index).
  //
  // Reference laws obeyed (sound-profiles-reference.md):
  // - §1/§5: nothing load-bearing below ~150 Hz. The rumble's BODY sits at
  //   340->150 Hz (audible on open-fit earbuds); the 88->60 Hz tone is
  //   weight under it, not the message. Gains lean toward the low body per
  //   the §1 correction (200 Hz owes ~+13 dB against the 3 kHz sizzle).
  // - §2.2(g): VOICE_CAP is 26 and overruns drop sounds SILENTLY. One zap
  //   spends exactly 3 voices (sizzle, body, weight); a full 8-hit chain
  //   with second-long tails overlaps ~9-12 voices across its 1.2s — inside
  //   budget beside a firefight. NO echoes() on zap (each tap is another
  //   voice; eight rolling thunders would starve the cap and kill the bell).
  function zap(x, z, hop = 0, dly = 0) {
    const deep = Math.min(1, hop * 0.15);
    noise(x, z, { f0: 5200, f1: 2600, type: "highpass", dur: 0.10, gain: 0.28, delay: dly, wet: 0.15 });
    noise(x, z, { f0: 340 - deep * 120, f1: 150, dur: 1.0 + deep * 0.8, gain: 0.42 + deep * 0.1, delay: dly + 0.05, wet: 0.55, dark: 0.6 });
    tone(x, z, { f0: 88, f1: 60, type: "sine", dur: 0.8 + deep * 0.5, gain: 0.16, delay: dly + 0.06, atk: 0.02 });
  }
  // the electrified pond: a wide fizzing wash, no thunder of its own (2 voices)
  function pondzap(x, z) {
    noise(x, z, { f0: 4200, f1: 1800, type: "highpass", dur: 0.45, gain: 0.24, wet: 0.3 });
    noise(x, z, { f0: 2200, type: "bandpass", q: 1.6, dur: 0.35, gain: 0.16, delay: 0.05, wet: 0.35 });
  }
  const MUZZLE = {
    mg:     (x, z, mass = 1) => { noise(x, z, { f0: 1900, type: "highpass", dur: 0.03 + mass * 0.012, gain: 0.13 + mass * 0.05, wet: 0.2 }); if (mass > 1.5) noise(x, z, { f0: 900, type: "bandpass", q: 1.2, dur: 0.05 + mass * 0.02, gain: 0.08 * mass, delay: 0.012, wet: 0.3 }); },
    shell:  (x, z, mass = 1) => {
      tone(x, z, { f0: 74, f1: 33, type: "sine", dur: 0.18, gain: 0.4 * mass, atk: 0.008 });
      modal(x, z, [{ f: 620, q: 9, g: 1 }, { f: 1080, q: 12, g: 0.5 }], 0.1, 0.26 * mass, { wet: 0.35 });
      echoes(x, z, (ex, ez, dly, k) => noise(ex, ez, { f0: 420, f1: 100, dur: 0.22, gain: 0.26 * k, delay: dly, wet: 0.7, dark: 0.5 }));
    },
    rocket: (x, z, mass = 1) => { noise(x, z, { f0: 380, f1: 1600, type: "bandpass", q: 1.4, dur: 0.4, gain: 0.22 * mass, wet: 0.35 }); },
    mortar: (x, z, mass = 1) => { tone(x, z, { f0: 128, f1: 52, type: "sine", dur: 0.2, gain: 0.3 * mass, atk: 0.01 }); noise(x, z, { f0: 520, dur: 0.14, gain: 0.15 * mass, delay: 0.015, wet: 0.4 }); },
  };
  // WEAPON VOICES (P1.5 Task 3, mk0.56). MUZZLE above is keyed on what the
  // ROUND is (kind) and is the only thing the frozen demo, tower defense, the
  // campaign and the mech ever produce — it is left exactly as it was so all
  // of those keep the sounds they shipped with. This second table is keyed on
  // WHICH GUN fired (the `weapon` tag WINTER FRONT's specs carry, threaded
  // through shooterFire and core.js's muzzle event), and consume() prefers it
  // when the tag is present. Four tubes fire kind:"shell" and every infantry
  // arm is kind:"mg", so without this table a sniper, a rifle and an MG burst
  // were literally the same sound.
  const WEAPON = {
    // RETUNED mk0.58. The three arms no longer differ by where a hiss is cut
    // off — they differ by the SIZE and PITCH of the blast, which is what
    // actually separates real guns: heavier means a lower, longer blast.
    // Levels are set against the reference measurement in the research doc
    // (§2.2/§3.3): the sniper stays exactly where it was, and the rifle and
    // the MG come up by the +4.0 dB the doc's equal-loudness table says you
    // owe a sound when you move its weight from 3 kHz down to 700 Hz.
    //
    // A sniper's report is the heavy one: blast centred 550 Hz, 4.5 ms long.
    // Its echo behaviour is untouched — at a distance the report arrives half
    // as a bang and half as the map answering it, so the direct sound
    // attenuates as everything does while the echo taps scale UP with range,
    // capped so a shot across the whole map does not out-shout one at your feet.
    sniper: (x, z, mass = 1) => {
      shot(x, z, { f: 550, bdur: 0.0045, gain: 1.46, crack: 0.30, cdur: 0.0020, wet: 0.12, mass });
      const far = Math.min(1, dist(x, z) / Math.max(1, listener.range));
      const ring = Math.min(0.44, 0.08 + far * 0.42); // inverted attenuation, capped
      echoes(x, z, (ex, ez, dly, k) => noise(ex, ez, { f0: 1500, f1: 380, dur: 0.16 + far * 0.26, gain: ring * k * 2.2, delay: dly, wet: 0.65, dark: 0.5 }));
    },
    // A rifle is the light arm: the blast sits higher (850 Hz) and is shorter
    // (2.5 ms), and the crack on top is thinner. Same family as the sniper,
    // smaller in every dimension — which is how the two stay told apart even
    // when they arrive at the same loudness.
    rifle: (x, z, mass = 1) => shot(x, z, { f: 850, bdur: 0.0025, gain: 1.22, crack: 0.24, cdur: 0.0016, wet: 0.18, mass }),
    // An MG fires a BURST, and the coalescer hands the whole burst over as one
    // event group — so mass is not "how loud", it is HOW MANY. Undo the
    // sqrt (n = mass²) and lay the rounds back out as separate taps at a real
    // machine-gun cadence (~950 rpm). mk0.58: the tap is now the light blast
    // rather than a bare hiss, and THE RATE IS THE GUN'S IDENTITY — so every
    // tap is the same shot, unscaled by mass, and only the count changes.
    mg: (x, z, mass = 1) => {
      const n = Math.max(2, Math.min(8, Math.round(mass * mass)));
      const gap = 0.063;
      tone(x, z, { f0: 150, f1: 62, type: "sine", dur: 0.05, gain: 0.1, atk: 0.006 });
      for (let i = 0; i < n; i++) shot(x, z, { f: 800, bdur: 0.0020, gain: 1.15, crack: 0.18, cdur: 0.0013, delay: i * gap, wet: 0.16 });
    },
    // The tubes keep the voices they already had — the tag only tells them
    // apart from each other, which `kind` could not (all four are "shell").
    mortar: (x, z, mass = 1) => MUZZLE.mortar(x, z, mass),
    rocket: (x, z, mass = 1) => MUZZLE.rocket(x, z, mass),
    shell:  (x, z, mass = 1) => MUZZLE.shell(x, z, mass),
    tank:   (x, z, mass = 1) => MUZZLE.shell(x, z, mass),
    // mk2.03: THE TOSS — no whistle anywhere in a grenade's life. A soft,
    // low, short puff of effort. // provisional, the owner's ear rules
    grenade: (x, z) => { noise(x, z, { f0: 300, f1: 120, dur: 0.08, gain: 0.10, wet: 0.3 }); },
  };
  // granite/masonry: three inharmonic modes, pitch scattered per stone
  const STONE_MODES = [{ f: 840, q: 20, g: 1 }, { f: 1310, q: 26, g: 0.6 }, { f: 2140, q: 30, g: 0.35 }];
  const stoneKnock = (x, z, s = 1) => {
    modal(x, z, STONE_MODES, 0.06 + 0.05 * Math.min(1, s), Math.min(0.3, 0.09 + 0.12 * s), { wet: 0.45 });
    if (s > 0.7) tone(x, z, { f0: 68, f1: 40, dur: 0.09, gain: 0.12 * s, atk: 0.006 });
  };
  const bodyFall = (x, z) => noise(x, z, { f0: 290, f1: 110, dur: 0.13, gain: 0.09, wet: 0.4 });
  const siren = (x, z) => {
    for (let i = 0; i < 3; i++) {
      tone(x, z, { f0: 660, type: "square", dur: 0.14, gain: 0.05, delay: i * 0.3, atk: 0.02 });
      tone(x, z, { f0: 520, type: "square", dur: 0.14, gain: 0.05, delay: i * 0.3 + 0.15, atk: 0.02 });
    }
  };
  // THE MUSTER BELL — REBUILT mk0.58 to the research doc's §2.3 target.
  //
  // What was wrong: the mk0.56 bell put its whole partial set (94-376 Hz) an
  // octave and a half below where a bell is readable, left out the top two
  // partials the ear needs, and had the loudness order upside down — the hum
  // loudest, the nominal quietest, the exact reverse of what a struck bell
  // does. It was also not really ringing: it was hiss squeezed through five
  // filters so narrow (1.5 Hz at the hum) that almost nothing came through,
  // measured twelve decibels below a single sniper crack. What weight it had
  // came from a 62 Hz sine that an unsealed earbud throws away.
  //
  // What this is: the tuned ratios 1 : 2 : 2.4 : 3 : 4 : 6 : 8 anchored so the
  // NOMINAL lands at 500 Hz — the bottom of the published 500-1500 Hz window
  // in which the ear builds a bell's strike note out of the top three
  // partials — which puts the hum at 125 Hz, still a bell of roughly three
  // tonnes. The tierce is the loudest partial (as on a real bell struck at
  // the soundbow), the quint is nearly silent (it has a node there), the hum
  // is present but not dominant, and the two missing uppers are back. Each
  // partial gets its OWN decay: the hum rings for nine seconds and carries
  // the depth, the bright middle dies in two or three and carries the arrival.
  //
  // It is rendered once into a buffer rather than played through filters,
  // because an impulse-struck resonator IS a sum of decaying sinusoids and a
  // filter bank at the Q this needs (500-1000) is not something to trust to
  // a browser's biquads. One bake, held for the session, taken lazily on the
  // first bell cue of the run — which is a PRE-toll, five seconds ahead of the
  // strike, so the toll itself is always free. Measured at 100 ms of main
  // thread on a Raspberry Pi under headless Chromium (three frames at 30 fps),
  // and 0 ms on every cue after. Per-toll variation is playback RATE within ±0.3%
  // (about 5 cents — half the ear's 10-cent resolution, and it moves the
  // whole stack together so the tuned ratios survive) plus gain. That is the
  // right amount: a bell is a tuned instrument and two strikes of the same
  // hammer really are near-identical. The old code detuned every partial
  // independently by up to ±133 cents, which scrambled the very relationships
  // that make a bell a bell.
  const BELL_PARTIALS = [
    { f: 125,  g: 0.45, t60: 9.0 },   // hum — the long tail, the "deep"
    { f: 250,  g: 0.55, t60: 5.0 },   // prime
    { f: 300,  g: 1.00, t60: 4.6 },   // tierce — the loudest partial
    { f: 375,  g: 0.12, t60: 3.5 },   // quint — nearly silent, by design
    { f: 500,  g: 0.90, t60: 3.0 },   // nominal      \
    { f: 750,  g: 0.70, t60: 2.6 },   // superquint    > the strike note
    { f: 1000, g: 0.50, t60: 2.2 },   // octave nominal/
    { f: 1290, g: 0.22, t60: 1.3 },   // I-7 — rim bite
  ];
  const BELL_S = 6.0;          // buffer length: past 4.5 tau on the longest partial
  const BELL_LOW = 85;         // support weight only — nothing load-bearing under 150 Hz
  const BELL_GAIN = 0.20;      // measured: ~7 dB over a sniper crack, loudness-weighted
  const PRETOLL_GAIN = 0.016;
  const BELL_KNOCK = 0.018;    // where the hammer transient has finished
  let bellBuf = null;
  const renderBell = () => {
    const sr = ctx.sampleRate, n = Math.floor(sr * BELL_S);
    const buf = ctx.createBuffer(1, n, sr);
    const d = buf.getChannelData(0);
    const acc = new Float64Array(n);
    // one exponentially decaying sinusoid, run as a two-tap recurrence so a
    // six-second render costs a multiply per sample instead of a sin(), and
    // stopped at its own T60 — past that the partial is 60 dB down and every
    // further sample is work spent on silence
    const ring = (f, g, t60) => {
      const w = 2 * Math.PI * f / sr, k = 2 * Math.cos(w), ph = Math.random() * Math.PI * 2;
      let y1 = Math.sin(ph - w), y2 = Math.sin(ph - 2 * w), e = g;
      const dec = Math.exp(-6.908 / (sr * t60));   // T60 = 60 dB down
      const end = Math.min(n, Math.ceil(sr * t60));
      for (let i = 0; i < end; i++) { const y = k * y1 - y2; y2 = y1; y1 = y; acc[i] += y * e; e *= dec; }
    };
    for (const p of BELL_PARTIALS) ring(p.f, p.g, p.t60);
    let pk = 0;
    for (let i = 0; i < n; i++) pk = Math.max(pk, Math.abs(acc[i]));
    ring(BELL_LOW, 0.316 * pk, 4.0);              // -10 dB under the partials
    pk = 0;
    for (let i = 0; i < n; i++) pk = Math.max(pk, Math.abs(acc[i]));
    const inv = 1 / (pk || 1);
    for (let i = 0; i < n; i++) acc[i] *= inv;    // partial sum now peaks at 1
    // THE HAMMER. A chimed bell is one clean impact: a hard bright knock,
    // 4 ms of broadband noise rolled off below ~1.8 kHz, six decibels over
    // the partials and gone inside fifteen. It costs almost nothing in
    // loudness terms (the ear needs no correction up there) and it is the
    // entire difference between a tone fading up and a bell ARRIVING.
    const m = Math.floor(sr * 0.02), a = 1 / (1 + 2 * Math.PI * 1800 / sr);
    const kn = new Float64Array(m);
    let x1 = 0, h1 = 0, u1 = 0, z1 = 0, kpk = 0;
    for (let i = 0; i < m; i++) {
      const w0 = Math.random() * 2 - 1;
      const h = a * (h1 + w0 - x1); x1 = w0; h1 = h;
      const zz = a * (z1 + h - u1); u1 = h; z1 = zz;
      const t = i / sr;
      kn[i] = zz * (t < 0.0004 ? t / 0.0004 : Math.exp(-(t - 0.0004) / 0.0016));
      kpk = Math.max(kpk, Math.abs(kn[i]));
    }
    const ks = 2 / (kpk || 1);
    for (let i = 0; i < m; i++) acc[i] += kn[i] * ks;
    // ramp the last 250 ms to true zero: the old bell was hard-cut while
    // still 28 dB above nothing, which is an audible chop
    const fade = Math.floor(sr * 0.25);
    for (let i = 0; i < n; i++) d[i] = acc[i] * (i > n - fade ? (n - i) / fade : 1);
    return buf;
  };
  // Duck the whole mix under the toll instead of letting the compressor duck
  // the toll: -4 dB, 200 ms down, held while the bell arrives, 1.5 s back up.
  const duckMix = (t0) => {
    if (!master) return;
    try {
      const g = master.gain, lo = MASTER_G * Math.pow(10, -4 / 20);
      g.cancelScheduledValues(t0);
      g.setValueAtTime(fin(g.value, MASTER_G), fin(t0, ctx.currentTime));
      g.linearRampToValueAtTime(fin(lo, 0), fin(t0 + 0.2, ctx.currentTime));
      g.setValueAtTime(fin(lo, 0), fin(t0 + 0.8, ctx.currentTime));
      g.linearRampToValueAtTime(fin(MASTER_G, 0), fin(t0 + 2.3, ctx.currentTime));
    } catch (e) {}
  };
  // Non-positional: it is the garrison's own bell hanging over the listener,
  // not a thing out on the field, so it rings at the listener's coordinates
  // (the jingles' convention) and never pans or attenuates. It is also the
  // one voice EXEMPT from VOICE_CAP: a single machine-gun burst used to be
  // able to claim enough of the 26 slots that a toll landing mid-firefight
  // was not quiet, it was never played at all.
  const bellToll = () => {
    if (muted || !ctx) return;
    try {
      if (!bellBuf) bellBuf = renderBell();
      const { node, t0 } = chain(listener.x, listener.z, vary(BELL_GAIN, 0.05), { wet: 0.4, out: bellBus });
      const src = ctx.createBufferSource();
      src.buffer = bellBuf;
      src.playbackRate.value = fin(vary(1, 0.003), 1);
      src.connect(node);
      src.start(fin(t0, ctx.currentTime));
      done(src, t0 + BELL_S + 0.05);
      duckMix(t0);
    } catch (e) {}
  };
  // A pre-toll: the last seconds before the bell, counted out. The same bell,
  // started PAST the hammer and cut off in a quarter second — the rope taking
  // up its slack, not a strike. It never ducks the mix and stays a whisper.
  const preToll = () => {
    if (muted || !ctx) return;
    try {
      if (!bellBuf) bellBuf = renderBell();
      const { node, t0 } = chain(listener.x, listener.z, vary(PRETOLL_GAIN, 0.08), { wet: 0.3, out: bellBus });
      const src = ctx.createBufferSource();
      src.buffer = bellBuf;
      src.playbackRate.value = fin(vary(1, 0.003), 1);
      const env = ctx.createGain();
      env.gain.setValueAtTime(0.0001, fin(t0, ctx.currentTime));
      env.gain.linearRampToValueAtTime(1, fin(t0 + 0.004, ctx.currentTime));
      env.gain.setTargetAtTime(0.0001, t0 + 0.004, 0.075);
      src.connect(env).connect(node);
      src.start(fin(t0, ctx.currentTime), BELL_KNOCK);
      done(src, t0 + 0.45);
    } catch (e) {}
  };
  // THE CONVOY — the manifest truck arriving. A diesel idle swelling up out
  // of nothing (slow attack: this one thing does NOT want the anti-click ramp,
  // it wants to be heard approaching), grit over it, then the tailgate: thin
  // sheet steel dropped on its chains, which is a modal ring with a low Q —
  // loose metal, not granite.
  const convoy = () => {
    const x = listener.x, z = listener.z;
    tone(x, z, { f0: 44, f1: 34, dur: 1.0, gain: 0.18, wet: 0.35, atk: 0.18 });
    noise(x, z, { f0: 92, f1: 180, dur: 0.7, gain: 0.2, rate: 0.4, wet: 0.4, dark: 0.75 });
    noise(x, z, { f0: 165, f1: 70, dur: 0.5, gain: 0.13, rate: 0.5, delay: 0.26, wet: 0.45, dark: 0.7 });
    modal(x, z, [{ f: 205, q: 11, g: 1 }, { f: 640, q: 15, g: 0.5 }, { f: 1480, q: 18, g: 0.25 }], 0.22, 0.19, { delay: 0.7, wet: 0.45 });
  };
  // The interface tick: one short, soft, dry blip for a choice taken or a
  // record written. Deliberately the quietest thing in the vocabulary.
  const uiTick = () => tone(listener.x, listener.z, { f0: 1180, f1: 860, type: "triangle", dur: 0.045, gain: 0.05, wet: 0.12, atk: 0.004 });

  // ---- event layer -----------------------------------------------------
  // coalescing: N same-WEAPON muzzles in one drain merge into ONE denser shot
  // (mass = sqrt(N)) at their centroid — massed fire is a crackle, not a
  // drum roll of identical ticks.
  // mk0.56: the group key prefers the weapon tag over kind. It has to: every
  // infantry arm is kind:"mg", so grouping by kind merged a sniper's single
  // crack into the rifle chatter around him and the whole squad came out one
  // sound. Still exactly one key per group (weapon OR kind, never both), so
  // the group count is unchanged for anything untagged.
  const consume = (events) => {
    if (muted || !ctx) return;
    const groups = new Map();
    for (const e of events) {
      if (e.type === "muzzle" || e.type === "gmuzzle" || e.type === "weldbreak") {
        const key = e.type + (e.weapon || e.kind || "") + (e.ice || "");
        let g = groups.get(key);
        if (!g) { g = { n: 0, x: 0, z: 0, e }; groups.set(key, g); }
        g.n++; g.x += e.x; g.z += e.z;
        continue;
      }
      if (e.type === "boom") e.kind === "grenade" ? gblast(e.x, e.z) : explosion(e.x, e.z, e.r || 2);
      else if (e.type === "gbounce") modal(e.x, e.z, [{ f: 1450, q: 18, g: 1 }, { f: 2300, q: 20, g: 0.4 }], 0.05, 0.12, { wet: 0.25 }); // mk2.03: the clatter
      else if (e.type === "splash") { noise(e.x, e.z, { f0: 1300, f1: 300, dur: 0.3, gain: 0.2, wet: 0.4 }); tone(e.x, e.z, { f0: 420, f1: 130, dur: 0.22, gain: 0.08, delay: 0.03 }); }
      else if (e.type === "kill" && e.kind === "unit") bodyFall(e.x, e.z);
      else if (e.type === "collapse") { noise(e.x, e.z, { f0: 480, f1: 75, dur: 1.2, gain: 0.4, wet: 0.55, dark: 0.7 }); tone(e.x, e.z, { f0: 58, f1: 30, dur: 0.9, gain: 0.3, delay: 0.05 }); echoes(e.x, e.z, (ex, ez, dly, k) => noise(ex, ez, { f0: 350, f1: 80, dur: 0.5, gain: 0.3 * k, delay: dly, wet: 0.7, dark: 0.5 })); }
      else if (e.type === "strike") siren(e.x, e.z);
      else if (e.type === "zap") zap(e.x2 != null ? e.x2 : e.x, e.z2 != null ? e.z2 : e.z, e.hop || 0, e.dly || 0);
      else if (e.type === "pondzap") pondzap(e.x, e.z);
      // The garrison's own cues (DEPOT's bell cycle). No coordinates: these
      // three carry nothing but a type — they play at the listener.
      else if (e.type === "bell") bellToll();
      else if (e.type === "pretoll") preToll();
      else if (e.type === "manifest") convoy();
      else if (e.type === "uitick") uiTick();
    }
    for (const [, g] of groups) {
      const x = g.x / g.n, z = g.z / g.n, mass = Math.sqrt(g.n);
      // weapon first, kind second (mk0.56): a tagged shot gets its own gun's
      // voice; an untagged one — the demo, tower defense, the campaign, the
      // mech — falls through to the kind table it has always used.
      if (g.e.type === "muzzle") ((g.e.weapon && WEAPON[g.e.weapon]) || MUZZLE[g.e.kind] || MUZZLE.shell)(x, z, mass);
      else if (g.e.type === "gmuzzle") MUZZLE.mortar(x, z, mass);
      else {
        stoneKnock(x, z, (g.e.ice ? 1.2 : 0.9) * mass);
        // a MASS of breaking welds reads as grinding failure, add grit
        if (g.n > 3) noise(x, z, { f0: 900, f1: 250, type: "bandpass", q: 2, dur: 0.25, gain: Math.min(0.3, 0.06 * g.n), wet: 0.5 });
      }
    }
  };

  // ---- continuous layer ------------------------------------------------
  const loops = new Map();
  const getLoop = (id, f0, type = "lowpass", q = 1) => {
    let L = loops.get(id);
    if (!L && ctx && !muted) {
      try {
        const src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
        src.loopStart = Math.random() * 1.5;
        const filt = ctx.createBiquadFilter(); filt.type = type; filt.frequency.value = fin(f0, 440); filt.Q.value = fin(q, 1);
        const gain = ctx.createGain(); gain.gain.value = 0.0001;
        src.connect(filt).connect(gain).connect(master);
        src.start();
        L = { src, filt, gain };
        loops.set(id, L);
      } catch (e) { return null; }
    }
    return L;
  };
  const setLoop = (L, gv, fv, dt) => {
    if (!L) return;
    const k = Math.min(1, dt * 8);
    L.gain.gain.value = fin(L.gain.gain.value + (gv - L.gain.gain.value) * k, 0);
    if (fv != null) L.filt.frequency.value = fin(L.filt.frequency.value + (fv - L.filt.frequency.value) * k, 440);
  };
  const knockCd = new Map();
  let knockBudget = 0;
  // WIND (mk0.58 retune, research doc §4.3). Two published facts killed the
  // old bed. Wind noise is BROADBAND AND FALLING — a slope, heaviest down low
  // and thinning upward — not the single 240-380 Hz band we had. And wind's
  // loudness wanders on every timescale at once with the biggest swings the
  // slowest, which a lone 48-second sine wave is not: over any listening
  // window that is a constant, and a constant is what Jeff heard as static.
  // So: three bands making the slope, worked by three summed random drifts.
  const WIND_BASE = 0.020;              // rumble level; body -6 dB, air -14 dB
  let wSurge = 0, wGust = 0, wFlut = 0;
  // one Ornstein-Uhlenbeck step: a random walk pulled back toward zero on the
  // given timescale, unit standard deviation, clamped so a gust stays a gust
  const drift = (v, tau, dt) => {
    const k = Math.min(1, dt / tau);
    return Math.max(-1, Math.min(1, v * (1 - k) + (Math.random() * 2 - 1) * 1.732 * Math.sqrt(2 * k)));
  };
  // incoming whistles: one per falling ballistic round (mortar shells,
  // strike rockets). Keyed on the projectile OBJECT — it lives until impact.
  const whistles = new Map();
  const stepWhistles = (world, dt) => {
    const live = new Set();
    if (world.projectiles) for (const p of world.projectiles) {
      if (!p.spec || (p.spec.kind !== "shell" && p.spec.kind !== "rocket")) continue;
      if (p.v.y > -6 || p.life < 0.35) continue; // only committed, falling arcs
      live.add(p);
      let w = whistles.get(p);
      if (!w && whistles.size < 8 && !muted) {
        try {
          const o = ctx.createOscillator(); o.type = "sine";
          const g = ctx.createGain(); g.gain.value = 0.0001;
          let tail = g;
          if (ctx.createStereoPanner) { const pan = ctx.createStereoPanner(); g.connect(pan); tail = pan; w = { o, g, pan }; }
          else w = { o, g };
          tail.connect(master);
          o.connect(g);
          o.start();
          whistles.set(p, w);
        } catch (e) { continue; }
      }
      if (!w) continue;
      // pitch climbs as it falls faster (the classic incoming shriek),
      // vibrato gives it air; loudness swells as it nears the ground
      const fall = Math.min(1, -p.v.y / 42);
      w.o.frequency.value = fin((620 + fall * 900) * (1 + Math.sin(p.life * 31) * 0.025), 440);
      const h = p.pos.y - (world.field ? world.field.heightAt(p.pos.x, p.pos.z) : 0);
      const near = Math.max(0, 1 - h / 45);
      w.g.gain.value = fin(0.05 * (0.25 + 0.75 * near * near) * att(dist(p.pos.x, p.pos.z)), 0);
      if (w.pan) w.pan.pan.value = fin(panOf(p.pos.x), 0);
    }
    for (const [p, w] of whistles) {
      if (live.has(p)) continue;
      try { w.g.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.02); w.o.stop(fin(ctx.currentTime + 0.1, ctx.currentTime)); } catch (e) {}
      whistles.delete(p);
    }
  };

  const tick = (world, dt) => {
    if (!ctx || muted) return;
    stepWhistles(world, dt);
    const seen = new Set();
    // wind bed: a falling slope worked by a slow surge (tens of seconds), a
    // gust (a few seconds) and a fast flutter, summed. Gusts BRIGHTEN as well
    // as swell — a gustier flow puts its energy into the smaller, faster
    // scales — so the air band rises while the rumble band gives a little back.
    wSurge = drift(wSurge, 35, dt);
    wGust = drift(wGust, 4, dt);
    wFlut = drift(wFlut, 0.3, dt);
    // WIND TOGGLE (mk0.96): the bed follows the GAME's wind. A depot world
    // carries world.wind — dead calm (mag 0, the toggle off) silences the
    // bed entirely and a real gale brings it up. Worlds with no wind field
    // (sandbox, campaign, demo, mech) keep the old ambient bed exactly.
    const wScale = world.wind ? Math.min(1, (world.wind.mag || 0) / 3.5) : 1; // provisional (F5)
    const wLvl = Math.pow(10, Math.max(-12, Math.min(9, wSurge * 6 + wGust * 4 + wFlut * 1.5)) / 20) * wScale;
    const wBri = wSurge * 2 + wGust * 4 + wFlut * 3;
    seen.add("wind-lo"); seen.add("wind-mid"); seen.add("wind-hi");
    setLoop(getLoop("wind-lo", 180, "lowpass", 1), WIND_BASE * wLvl * Math.pow(10, -wBri / 40), 165 + wBri * 4, dt);
    setLoop(getLoop("wind-mid", 450, "bandpass", 0.7), WIND_BASE * 0.5 * wLvl, 450 + wBri * 18, dt);
    setLoop(getLoop("wind-hi", 1200, "highpass", 1), WIND_BASE * 0.2 * wLvl * Math.pow(10, wBri / 20), 1200, dt);
    // vehicle engines
    for (const b of world.bodies) {
      if (b.kind !== "vehicle" || !b.alive) continue;
      const sp = Math.hypot(b.v.x, b.v.z);
      const thr = b.ctl ? Math.abs(b.ctl.throttle || 0) : 0;
      const a = att(dist(b.pos.x, b.pos.z));
      if (a < 0.06 && thr === 0 && sp < 0.5) continue;
      seen.add("veh" + b.id);
      const L = getLoop("veh" + b.id, 90);
      setLoop(L, (0.05 + thr * 0.2 + Math.min(0.12, sp * 0.02)) * a, 70 + sp * 22 + thr * 60, dt);
    }
    // masonry: awake stones grind (bed) + knock on hard contacts (modal)
    let ke = 0;
    for (const b of world.bodies) {
      if (b.kind !== "chunk" || b.sleeping) continue;
      const v2 = b.v.x * b.v.x + b.v.y * b.v.y + b.v.z * b.v.z;
      if (v2 < 0.04) continue;
      ke += Math.min(6, v2) * att(dist(b.pos.x, b.pos.z));
    }
    if (ke > 0.2 || loops.has("masonry")) {
      seen.add("masonry");
      const L = getLoop("masonry", 160);
      setLoop(L, Math.min(0.4, ke * 0.02), 120 + Math.min(300, ke * 8), dt);
    }
    knockBudget = Math.min(10, knockBudget + dt * 14);
    if (world.contacts) {
      const tNow = world.t;
      for (const c of world.contacts) {
        if (knockBudget < 1) break;
        if (!c.b || c.pn <= 0) continue;
        const ch = c.a.kind === "chunk" ? c.a : c.b.kind === "chunk" ? c.b : null;
        if (!ch) continue;
        const imp = c.pn / Math.max(1, ch.mass);
        if (imp < 0.9) continue;
        const last = knockCd.get(ch.id) || -9;
        if (tNow - last < 0.24) continue;
        knockCd.set(ch.id, tNow);
        knockBudget -= 1;
        stoneKnock(ch.pos.x, ch.pos.z, Math.min(1.6, imp * 0.35));
      }
    }
    // mechs: footfalls off the step counter, thruster roar while burning
    if (world.mechs) for (const mech of world.mechs) {
      if (!mech.hull) continue;
      const hx = mech.hull.pos.x, hz = mech.hull.pos.z;
      if (mech.telem && mech.telem.steps !== (mech._sndSteps || 0)) {
        mech._sndSteps = mech.telem.steps;
        tone(hx, hz, { f0: 55, f1: 32, dur: 0.17, gain: 0.4, atk: 0.008 });
        modal(hx, hz, [{ f: 320, q: 8, g: 1 }, { f: 940, q: 14, g: 0.3 }], 0.08, 0.16, { wet: 0.35 });
      }
      const burn = mech.thrusters && mech.thrustersOn ? Math.max(0, ...mech.thrusters.map((th) => th.cur || 0)) : 0;
      const id = "jet" + (mech.hull.id || 0);
      if (burn > 0.08 || loops.has(id)) {
        seen.add(id);
        const L = getLoop(id, 900, "bandpass", 0.7);
        setLoop(L, Math.min(0.35, burn * 0.4) * att(dist(hx, hz)), 700 + burn * 900, dt);
      }
    }
    for (const [id, L] of loops) {
      if (seen.has(id)) continue;
      L.gain.gain.value *= 1 - Math.min(1, dt * 10);
      if (L.gain.gain.value < 0.002) { try { L.src.stop(); } catch (e) {} loops.delete(id); }
    }
  };

  const stopAll = () => {
    for (const [, L] of loops) { try { L.src.stop(); } catch (e) {} } loops.clear();
    for (const [, w] of whistles) { try { w.o.stop(); } catch (e) {} } whistles.clear();
  };

  return {
    ensure, consume, tick,
    setListener(x, z, range) { listener.x = x; listener.z = z; if (range) listener.range = range; },
    // big acoustic faces for echo taps: [{x, z, r}] — rocks, buildings
    setReflectors(list) { reflectors = list || []; },
    setMuted(m) { muted = m; if (m) stopAll(); },
    get muted() { return muted; },
    dispose() { stopAll(); try { if (ctx) ctx.close(); } catch (e) {} ctx = null; bellBuf = null; },
    // UI jingles (campaign): kept so score/feedback cues stay distinct from sim audio
    jingleTrial() { tone(listener.x, listener.z, { f0: 523, f1: 784, type: "square", dur: 0.14, gain: 0.14, atk: 0.02 }); tone(listener.x, listener.z, { f0: 784, f1: 1046, type: "square", dur: 0.2, gain: 0.14, delay: 0.13, atk: 0.02 }); },
    jingleHook() { tone(listener.x, listener.z, { f0: 200, f1: 900, type: "sawtooth", dur: 0.4, gain: 0.12, atk: 0.02 }); },
    jingleKill() { tone(listener.x, listener.z, { f0: 760, f1: 1180, type: "square", dur: 0.06, gain: 0.07, atk: 0.01 }); },
  };
}
