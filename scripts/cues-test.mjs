// COMBO-ENGINE — cues-test. Laws at rolled inputs: every cue's notes,
// durations, and offsets are the demo's own; a rolled t0 shifts every
// note and the offsets never run backward; an unknown event is empty and
// a handed table is read through; the voices table names every voice the
// cues use; the held beam and the ambient release ride the entries; the
// contract counts every problem; the module imports only from its own
// folder or a sibling module.
import fs from "node:fs";
import { CUES, VOICES, MASTER_DB, CUE_GATES, cueFor, checkCues } from "../src/modules/cues/cues.js";

let pass = 0, fail = 0;
const check = (n, ok) => { if (ok) { pass++; console.log("PASS " + n); } else { fail++; console.log("FAIL " + n); } };
const SEED = process.env.SEED ? +process.env.SEED : Math.floor(Math.random() * 1e9);
console.log("seeds " + JSON.stringify({ cues: SEED }));
let a = SEED >>> 0;
const rnd = () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

// The demo's twelve triggers, lines 139 to 150, restated as data — the
// same shape as CUES without the extra fields.
const REFERENCE = {
  fire: { voice: "fire", notes: [{ note: null, dur: "16n", at: 0 }] },
  missile: { voice: "missile", notes: [{ note: "C5", dur: "8n", at: 0 }] },
  beamStart: { voice: "beam", notes: [{ note: "A2", dur: null, at: 0 }] },
  beamStop: { voice: "beam", notes: [] },
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
  },
};

{ let ok = true;
  for (const name of Object.keys(REFERENCE)) {
    if (!CUES[name]) { ok = false; break; }
    if (JSON.stringify(CUES[name].notes) !== JSON.stringify(REFERENCE[name].notes)) { ok = false; break; }
    if (CUES[name].voice !== REFERENCE[name].voice) { ok = false; break; }
  }
  check("cues: every cue's notes, durations, and offsets are the demo's own", ok); }

{ const names = Object.keys(CUES);
  let ok = true;
  for (let i = 0; i < 100 && ok; i++) {
    const t0 = rnd() * 100;
    const name = names[Math.floor(rnd() * names.length)];
    const entries = cueFor(name, t0);
    const offsets = CUES[name].notes.length ? CUES[name].notes.map((n) => n.at) : [0];
    if (entries.length !== offsets.length) { ok = false; break; }
    let prevAt = -Infinity;
    for (let j = 0; j < entries.length; j++) {
      if (Math.abs(entries[j].at - (t0 + offsets[j])) >= 1e-12) { ok = false; break; }
      if (entries[j].at < prevAt) { ok = false; break; }
      prevAt = entries[j].at;
    }
  }
  check("cues: a rolled t0 shifts every note by t0 and offsets never run backward", ok); }

{ const empty = cueFor("nothing");
  const name = "cue" + Math.floor(rnd() * 1e6);
  const t0 = rnd() * 100;
  const table = { [name]: { voice: "x", notes: [{ note: "C4", dur: "8n", at: 0.2 }] } };
  const entries = cueFor(name, t0, table);
  const ok = Array.isArray(empty) && empty.length === 0
    && entries.length === 1 && Math.abs(entries[0].at - (t0 + 0.2)) < 1e-12 && entries[0].voice === "x";
  check("cues: an unknown event gives an empty list, and a rolled table is read through", ok); }

{ const voicesOk = Object.keys(CUES).every((name) => Object.prototype.hasOwnProperty.call(VOICES, CUES[name].voice));
  const ok = voicesOk && MASTER_DB === -8 && CUE_GATES.fire === 0.3 && CUE_GATES.explode === 0.4 && VOICES.ambient.startNote === "C1";
  check("cues: the voices table names every voice the cues use, and the master and the two call-site gates are the demo's", ok); }

{ const start = cueFor("beamStart");
  const stop = cueFor("beamStop");
  const over = cueFor("gameOver");
  const ok = start.length === 1 && start[0].hold === true && start[0].dur === null
    && stop.length === 1 && stop[0].release === true && stop[0].note === null
    && over.length >= 1 && over[0].releaseAmbient === true;
  check("cues: the held beam and the ambient release ride the entries", ok); }

{ const p1 = checkCues({ a: { voice: 1, notes: "x" }, b: { voice: "v", notes: [{ note: 5, dur: 2, at: -1 }] } });
  const p2 = checkCues(CUES);
  const p3 = checkCues(null);
  const p4 = checkCues({ c: { voice: "v", notes: [{ note: "C4", dur: "8n", at: 1 }, { note: "C4", dur: "8n", at: 0.5 }] } });
  const ok = p1.length === 5 && p2.length === 0 && p3.length === 1 && p4.length === 1;
  check("cues: the contract counts every problem", ok); }

{ const src = fs.readFileSync(new URL("../src/modules/cues/cues.js", import.meta.url), "utf8");
  const specifiers = [...src.matchAll(/import[^'"]*from\s*["']([^"']+)["']/g)].map((m) => m[1]);
  const ok = specifiers.every((s) => /^\.\.\/[a-z0-9-]+\//.test(s) || /^\.\//.test(s));
  check("cues: the module imports only from its own folder or a sibling module", ok); }

console.log(`cues-test: ${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
console.log("cues-test PASS");
