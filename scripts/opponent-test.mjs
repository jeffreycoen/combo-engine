// COMBO-ENGINE — opponent-test. Laws at rolled hits: the lethal line kills
// through any part at its own energy and never under it; knockdown is
// accumulated impulse against the part's own drop and carry; legs limp;
// darts dose and the full dose starts the clock; a downed man takes no
// more; the log keeps every hit.
import { AG, makeAgentState, hitAgent } from "../src/modules/opponent/opponent.js";
let pass = 0, fail = 0;
const check = (n, ok) => { if (ok) { pass++; console.log("PASS " + n); } else { fail++; console.log("FAIL " + n); } };
const SEED = process.env.SEED ? +process.env.SEED : Math.floor(Math.random() * 1e9);
console.log("seeds " + JSON.stringify({ hits: SEED }));
let a2 = SEED >>> 0;
const rnd = () => { a2 = (a2 + 0x6d2b79f5) >>> 0; let t = a2; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const PARTS = Object.keys(AG.PART);

{ let lethal = true;
  for (let i = 0; i < 400 && lethal; i++) {
    const p = PARTS[Math.floor(rnd() * PARTS.length)];
    const over = hitAgent(makeAgentState(), p, AG.PART[p].lethalE * (1.01 + rnd()), 0.1, "ball");
    const under = hitAgent(makeAgentState(), p, AG.PART[p].lethalE * rnd() * 0.99, 0.01, "ball");
    lethal = over.lethal === 1 && under.lethal === 0;
  }
  check("opponent: the lethal line holds through every part — over kills, under never", lethal); }
{ let drop = true;
  for (let i = 0; i < 400 && drop; i++) {
    const p = PARTS[Math.floor(rnd() * PARTS.length)];
    const P = AG.PART[p];
    const a = makeAgentState();
    const r = hitAgent(a, p, 1, (P.drop / P.carry) * (1.001 + rnd()), "ball");
    drop = a.down === 1 && a.killed === 0 && r.lethal === 0;
  }
  check("opponent: knockdown by impulse — a part's own drop through its own carry puts a man down, alive", drop); }
{ let carry = true;
  for (let i = 0; i < 300 && carry; i++) {
    const a = makeAgentState();
    const imp = rnd() * 3;
    hitAgent(a, "", 1, imp, "ball");
    carry = Math.abs(a.stun - (imp / AG.PART[""].drop) * AG.PART[""].carry) < 1e-12;
  }
  check("opponent: a partial hit carries exactly its stated fraction", carry); }
{ const a = makeAgentState();
  hitAgent(a, "lgL", 1, 6, "ball");
  const b = makeAgentState();
  hitAgent(b, "arL", 1, 6, "ball");
  check("opponent: legs limp, arms never", a.limp === 0.5 && b.limp === 0); }
{ const a = makeAgentState();
  const half = hitAgent(a, "", 1, 0.3, "tranq_dart");
  const full = hitAgent(a, "", 1, 0.3, "tranq_dart");
  check("opponent: darts dose by impulse and the full dose starts the going-under clock",
    half.effect.startsWith("darted") && a.sed >= 1 && a.sedT === AG.SED_ONSET && full.effect === "sedated, going under"); }
{ const a = makeAgentState();
  hitAgent(a, "h", 999, 1, "ball");
  const again = hitAgent(a, "h", 9999, 99, "ball");
  check("opponent: a downed man takes no more, and the log kept every real hit",
    again.effect === "already down" && a.hitLog.length === 1); }
console.log(`opponent-test: ${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
console.log("opponent-test PASS");
