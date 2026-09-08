// COMBO-ENGINE — opponent-test. Laws at rolled hits: the lethal line kills
// through any part at its own energy and never under it; knockdown is
// accumulated impulse against the part's own drop and carry; legs limp;
// darts dose and the full dose starts the clock; a downed man takes no
// more; the log keeps every hit.
import { AG, makeAgentState, hitAgent, makeOpponent, checkParts } from "../src/modules/opponent/opponent.js";
import { readFileSync } from "node:fs";
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
{ let ok = true;
  const partTable = { "": { drop: 1 + rnd() * 19, carry: 0.1 + rnd() * 0.9, lethalE: 100 + rnd() * 2900, label: "r-" + rnd().toString(36).slice(2) } };
  const rolledKeys = ["p1", "p2", "p3"];
  for (const k of rolledKeys) partTable[k] = { drop: 1 + rnd() * 19, carry: 0.1 + rnd() * 0.9, lethalE: 100 + rnd() * 2900, label: "r-" + rnd().toString(36).slice(2) };
  const op = makeOpponent({ parts: partTable });
  const allKeys = ["", ...rolledKeys];
  for (let i = 0; i < 200 && ok; i++) {
    const k = allKeys[Math.floor(rnd() * allKeys.length)];
    const row = partTable[k];
    const over = op.hitAgent(makeAgentState(), k, row.lethalE * (1.01 + rnd()), 0.1, "ball");
    const fresh = makeAgentState();
    const J = rnd() * (row.drop * 0.5 / row.carry);
    op.hitAgent(fresh, k, row.lethalE * rnd() * 0.99, J, "ball");
    ok = over.lethal === 1 && Math.abs(fresh.stun - (J / row.drop) * row.carry) < 1e-12 && fresh.down === 0;
  }
  check("opponent: at a rolled part table a round over the handed lethal energy kills and one under it adds impulse over drop times carry to the stun exactly", ok); }
{ const name = "sed-" + rnd().toString(36).slice(2, 10);
  const op = makeOpponent({ sedative: [name] });
  const a = makeAgentState();
  const hitRolled = op.hitAgent(a, "", 1, rnd(), name);
  const b = makeAgentState();
  const hitDart = op.hitAgent(b, "", 1, 0.01 + rnd() * 0.5, "tranq_dart");
  check("opponent: a rolled sedative round name sedates, and the demo's dart name is an ordinary hit under it",
    (hitRolled.effect.startsWith("darted") || hitRolled.effect === "sedated, going under") && hitDart.effect.startsWith("hit ")); }
{ const bad = checkParts({ h: { drop: 0, carry: 2, lethalE: -1, label: 3 } });
  const good = checkParts(AG.PART);
  const notObj = checkParts(null);
  check("opponent: the contract counts every problem", bad.length === 5 && good.length === 0 && notObj.length === 1); }
{ const src = readFileSync(new URL("../src/modules/opponent/opponent.js", import.meta.url), "utf8");
  const specs = [...src.matchAll(/^\s*import\s[^;\n]*\sfrom\s+["']([^"']+)["']/gm)].map(m => m[1]);
  const ok = specs.every(s => /^\.\.\/[a-z0-9-]+\//.test(s) || /^\.\//.test(s));
  check("opponent: the module imports only from its own folder or a sibling module", ok); }
console.log(`opponent-test: ${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
console.log("opponent-test PASS");
