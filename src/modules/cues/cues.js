// MODULE: cues — musical cues as vocabulary. Serves the checklist box
// "Musical cues folded into the sound engine's vocabulary." Source: the
// fleet demo, read-only, lines 51 to 151 (init 53 to 138, the twelve
// triggers 139 to 150) and the ten call sites. SHAPED: the law carried as
// data is the twelve cues, each note, duration, and offset the demo
// plays, and the eleven voices' synth settings. New: cueFor, a lookup
// that turns a cue into timed note events for any sound engine. No sound
// library. Playing the cues through the coldsnap sound engine is a later
// ruling.

export const MASTER_DB = -8;

// The demo's two call-site chances (lines 1044 and 1048): data for the
// caller's own roll. This module rolls nothing itself.
export const CUE_GATES = { fire: 0.3, explode: 0.4 };

export const VOICES = {
  fire: {
    kind: "noise",
    noise: { type: "white" },
    envelope: { attack: 0.002, decay: 0.06, sustain: 0, release: 0.03 },
    filter: { type: "bandpass", hz: 3000 },
    gainDb: -14,
  },
  missile: {
    kind: "synth",
    oscillator: { type: "sawtooth" },
    envelope: { attack: 0.01, decay: 0.3, sustain: 0, release: 0.1 },
    filter: { type: "lowpass", hz: 2000 },
    gainDb: -16,
  },
  beam: {
    kind: "fm",
    oscillator: { type: "square" },
    envelope: { attack: 0.05, decay: 0.1, sustain: 0.8, release: 0.3 },
    modulation: { type: "sawtooth" },
    modulationEnvelope: { attack: 0.1, decay: 0.2, sustain: 0.6, release: 0.2 },
    modulationIndex: 8,
    harmonicity: 2,
    filter: { type: "lowpass", hz: 1500 },
    gainDb: -20,
  },
  explode: {
    kind: "noise",
    noise: { type: "brown" },
    envelope: { attack: 0.005, decay: 0.4, sustain: 0.05, release: 0.5 },
    filter: { type: "lowpass", hz: 800 },
    gainDb: -10,
  },
  bigExplode: {
    kind: "noise",
    noise: { type: "brown" },
    envelope: { attack: 0.01, decay: 0.8, sustain: 0.1, release: 0.8 },
    filter: { type: "lowpass", hz: 500 },
    gainDb: -8,
  },
  click: {
    kind: "synth",
    oscillator: { type: "sine" },
    envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.02 },
    gainDb: -18,
  },
  alert: {
    kind: "synth",
    oscillator: { type: "square" },
    envelope: { attack: 0.01, decay: 0.15, sustain: 0.1, release: 0.1 },
    filter: { type: "lowpass", hz: 4000 },
    gainDb: -14,
  },
  chime: {
    kind: "poly",
    oscillator: { type: "triangle" },
    envelope: { attack: 0.01, decay: 0.3, sustain: 0, release: 0.2 },
    gainDb: -14,
  },
  research: {
    kind: "poly",
    oscillator: { type: "sine" },
    envelope: { attack: 0.02, decay: 0.5, sustain: 0.1, release: 0.4 },
    reverb: 1.5,
    gainDb: -12,
  },
  victory: {
    kind: "poly",
    oscillator: { type: "triangle" },
    envelope: { attack: 0.05, decay: 0.8, sustain: 0.2, release: 0.5 },
    reverb: 2,
    gainDb: -10,
  },
  ambient: {
    kind: "fm",
    oscillator: { type: "sine" },
    envelope: { attack: 2, decay: 0, sustain: 1, release: 2 },
    modulation: { type: "sine" },
    modulationEnvelope: { attack: 2, decay: 0, sustain: 1, release: 2 },
    modulationIndex: 1,
    harmonicity: 0.5,
    filter: { type: "lowpass", hz: 200 },
    gainDb: -28,
    startNote: "C1",
  },
};

export const CUES = {
  fire: { voice: "fire", notes: [{ note: null, dur: "16n", at: 0 }] },
  missile: { voice: "missile", notes: [{ note: "C5", dur: "8n", at: 0 }] },
  beamStart: { voice: "beam", notes: [{ note: "A2", dur: null, at: 0 }], hold: true },
  beamStop: { voice: "beam", notes: [], release: true },
  explodeSmall: { voice: "explode", notes: [{ note: null, dur: "8n", at: 0 }] },
  explodeBig: { voice: "bigExplode", notes: [{ note: null, dur: "4n", at: 0 }] },
  click: { voice: "click", notes: [{ note: "C6", dur: "32n", at: 0 }] },
  alert: {
    voice: "alert",
    notes: [
      { note: "E5", dur: "16n", at: 0 },
      { note: "A5", dur: "16n", at: 0.15 },
      { note: "E5", dur: "16n", at: 0.3 },
    ],
  },
  buildDone: {
    voice: "chime",
    notes: [
      { note: ["E5", "G5"], dur: "16n", at: 0 },
      { note: ["G5", "B5"], dur: "16n", at: 0.12 },
    ],
    called: false,
  },
  researchDone: {
    voice: "research",
    notes: [
      { note: ["C5", "E5", "G5"], dur: "4n", at: 0 },
      { note: ["E5", "G5", "B5"], dur: "4n", at: 0.3 },
    ],
  },
  victoryFanfare: {
    voice: "victory",
    notes: [
      { note: ["C4", "E4", "G4"], dur: "2n", at: 0 },
      { note: ["E4", "G4", "B4"], dur: "2n", at: 0.4 },
      { note: ["G4", "B4", "D5"], dur: "2n", at: 0.8 },
      { note: ["C4", "E4", "G4", "C5"], dur: "1n", at: 1.3 },
    ],
  },
  gameOver: {
    voice: "alert",
    notes: [
      { note: "A3", dur: "8n", at: 0 },
      { note: "E3", dur: "4n", at: 0.3 },
    ],
    releaseAmbient: true,
  },
};

// cueFor(event, t0, table) -> the cue's note events, timed from t0, in
// the cue's order. Copies hold, release, releaseAmbient onto the first
// entry when the cue carries them; a cue with no notes but a flag (such
// as beamStop) yields one no-note entry carrying the flag. An unknown
// event returns an empty list.
export function cueFor(event, t0 = 0, table = CUES) {
  const cue = table[event];
  if (!cue) return [];
  const flags = {};
  if (cue.hold) flags.hold = true;
  if (cue.release) flags.release = true;
  if (cue.releaseAmbient) flags.releaseAmbient = true;
  const notes = cue.notes || [];
  if (notes.length === 0) {
    if (Object.keys(flags).length === 0) return [];
    return [{ voice: cue.voice, note: null, dur: null, at: t0, ...flags }];
  }
  return notes.map((n, i) => {
    const entry = { voice: cue.voice, note: n.note, dur: n.dur, at: t0 + n.at };
    if (i === 0) Object.assign(entry, flags);
    return entry;
  });
}

export const CUES_CONTRACT = {
  voice: "string, a key of VOICES",
  notes: "array of { note, dur, at }",
  "notes[].note": "string, list of strings, or null",
  "notes[].dur": "string or null",
  "notes[].at": "number >= 0, non-decreasing within the cue",
};

// checkCues(table) -> every problem in one pass, empty when clean.
export function checkCues(table) {
  if (!table || typeof table !== "object") return ["cues: not an object"];
  const problems = [];
  for (const name of Object.keys(table)) {
    const cue = table[name] || {};
    if (typeof cue.voice !== "string") problems.push(`cues.${name}.voice: string required`);
    if (!Array.isArray(cue.notes)) {
      problems.push(`cues.${name}.notes: array required`);
      continue;
    }
    let prev = -Infinity;
    let backward = false;
    cue.notes.forEach((n, i) => {
      const note = n?.note;
      const okNote = note === null || typeof note === "string" || (Array.isArray(note) && note.every((x) => typeof x === "string"));
      if (!okNote) problems.push(`cues.${name}.notes.${i}.note: string, list of strings, or null required`);
      const dur = n?.dur;
      const okDur = dur === null || typeof dur === "string";
      if (!okDur) problems.push(`cues.${name}.notes.${i}.dur: string or null required`);
      const at = n?.at;
      const okAt = typeof at === "number" && at >= 0;
      if (!okAt) problems.push(`cues.${name}.notes.${i}.at: number >= 0 required`);
      if (okAt) {
        if (at < prev) backward = true;
        prev = at;
      }
    });
    if (backward) problems.push(`cues.${name}.notes: offsets must not run backward`);
  }
  return problems;
}
