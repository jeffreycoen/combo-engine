// COMBO-ENGINE — frostline-audit: FL-3's live-fire audit. NOT a per-task
// gate — this fires thousands of simulated rounds and takes minutes; it
// runs on the owner's word and on CI, never inside a task brief that
// doesn't name it. One pinned shooter, one held dummy, three ranges: the
// measured hit rate must sit inside the band around the number the page
// would display, and the exact deterministic counts pin the fixture.
// Seed 3 is the fixture; no seed is special.
import { tickWar, defaultTickInput } from "../src/depot/api.js";
import { addBody } from "../src/engine/core.js";
import { bootMission, MISSION_R1 } from "../src/games/frostline/mission.js";
import { hitChance } from "../src/games/frostline/cover.js";
import { arcClears } from "../src/depot/accuracy.js";
import { INFANTRY_ARMS } from "../src/depot/specs.js";

let pass = 0, fail = 0;
const check = (name, ok) => { if (ok) { pass++; console.log("PASS " + name); } else { fail++; console.log("FAIL " + name); } };
const STEP = 1 / 120;
const TICKS = 120 * 100; // 100 simulated seconds a range
const BAND = 0.10;       // the display may miss the measured truth by ten points, no more // provisional (F5)

function fireRange(range, type = "rifles") {
  const { war } = bootMission(MISSION_R1, 3);
  const w = war.world;
  const sq = war.run.squads.find((q) => q.type === type);
  const spec = INFANTRY_ARMS[type === "sniper" ? "sniper" : "rifles"];
  let ax = null, az = null;
  outer: for (let x = -30; x <= 30; x += 3) for (let z = -20; z <= 30; z += 3) {
    const m = { x, y: war.field.heightAt(x, z) + 1.2, z };
    const t = { x, y: war.field.heightAt(x, z + range) + 0.7, z: z + range };
    if (arcClears(w, m, t, spec, -1)) { ax = x; az = z; break outer; }
  }
  const members = sq.memberIds.map((id) => w.byId.get(id)).filter((u) => u && u.alive);
  members.forEach((u, i) => { if (i > 0) u.alive = false; }); // one trigger: the spotter never fires anyway
  const u = members[0];
  u.pos.x = ax; u.pos.z = az; u.pos.y = war.field.heightAt(ax, az) + 0.7; u.fireCd = 0;
  sq.anchor = { x: ax, z: az }; sq.order = "defend";
  const tz = az + range;
  const tgt = addBody(w, { kind: "unit", x: ax, y: war.field.heightAt(ax, tz) + 0.7, z: tz, hx: 0.28, hy: 0.7, hz: 0.28, mass: 80, hp: 1e9, team: 2 });
  tgt.maxHp = 1e9;
  const displayed = hitChance(war, u, tgt, spec);
  const input = defaultTickInput(); input.devDummies = true;
  let hits = 0, last = tgt.lastHit, shots = 0;
  for (let i = 0; i < TICKS; i++) {
    const cdBefore = u.fireCd || 0;
    tickWar(war, STEP, input);
    if ((u.fireCd || 0) > cdBefore + 0.5) shots++;
    if (tgt.lastHit !== last) { hits++; last = tgt.lastHit; }
    u.pos.x = ax; u.pos.z = az; tgt.pos.x = ax; tgt.pos.z = tz;
  }
  return { range, displayed, shots, hits, rate: hits / Math.max(1, shots) };
}

// PINS: exact deterministic counts, produced by running this exact file at
// plan-writing time. A moved count is a finding, never a re-teach in flight.
// The sniper's long shot is deliberately absent: the audit proved the
// territory field gates the trigger before the estimate ever matters — a
// lone pair's field never reaches a 18+ m lane, so zero rounds fire and no
// rate exists to audit. The finding stands in the task record for a later
// ruling (the page can display a chance for a shot doctrine will not take).
const SCENARIOS = [
  { range: 6, type: "rifles" }, { range: 10, type: "rifles" }, { range: 14, type: "rifles" },
];
const PINS = { // exact deterministic counts from the plan-writing run, seed 3
  "6:rifles": { shots: 77, hits: 70 },
  "10:rifles": { shots: 74, hits: 54 },
  "14:rifles": { shots: 75, hits: 43 },
};

for (const sc of SCENARIOS) {
  const r = fireRange(sc.range, sc.type);
  const key = sc.range + ":" + sc.type;
  const line = `${sc.range} m ${sc.type}: displayed ${(r.displayed * 100).toFixed(1)}%, measured ${r.hits}/${r.shots} = ${(r.rate * 100).toFixed(1)}%`;
  console.log("  " + line);
  check(`the display tells the truth at ${sc.range} m ${sc.type} (band ±${BAND * 100} points)`, r.shots > 0 && Math.abs(r.rate - r.displayed) <= BAND);
  if (PINS[key]) check(`the ${key} fixture pins: ${PINS[key].hits}/${PINS[key].shots}`, r.hits === PINS[key].hits && r.shots === PINS[key].shots);
}

console.log(`frostline-audit: ${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
console.log("frostline-audit PASS");
