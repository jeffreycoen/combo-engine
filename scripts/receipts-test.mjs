// COMBO-ENGINE — receipts-test. Laws at rolled events: every known engine
// event yields a line carrying its own numbers; unknown events get an
// honest line; nothing ever throws; the log keeps order and count.
import { receipt, receiptLog } from "../src/modules/receipts/receipts.js";
let pass = 0, fail = 0;
const check = (n, ok) => { if (ok) { pass++; console.log("PASS " + n); } else { fail++; console.log("FAIL " + n); } };
const SEED = process.env.SEED ? +process.env.SEED : Math.floor(Math.random() * 1e9);
console.log("seeds " + JSON.stringify({ events: SEED }));
let a = SEED >>> 0;
const rnd = () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

{ let carry = true;
  for (let i = 0; i < 300 && carry; i++) {
    const b = Math.floor(rnd() * 500);
    const evs = [
      { type: "kill", kind: "unit", team: 2, attacker: "player", id: 1, x: rnd() * 100, z: rnd() * 100 },
      { type: "shipkill", team: 2, bounty: b, x: 1, z: 2 },
      { type: "splat", x: 3, z: 4, r: rnd() * 10 },
      { type: "weldbreak", x: 0, y: 0, z: 0, ice: rnd() < 0.5 },
      { type: "structureLost", id: 7, kind: "tower", course: 2 },
    ];
    const log = receiptLog(evs);
    carry = log.length === 5 && log.every((l) => typeof l === "string" && l.length > 5)
      && log[1].includes(String(b)) && log[0].includes("side 2") && log[4].includes("tower");
  }
  check("receipts: three hundred rolled ticks — every known event carries its own numbers", carry); }
{ const l = receipt({ type: "somethingNew", n: 3, deep: { x: 1 } });
  check("receipts: an unknown event still gets an honest line with its numbers", l.startsWith("somethingNew") && l.includes("n 3")); }
{ let calm = true;
  for (const bad of [null, 7, "x", {}, { type: null }, { type: "kill" }]) { try { receipt(bad); } catch { calm = false; } }
  check("receipts: nothing ever throws — broken events get plain lines", calm); }
{ const log = receiptLog(null);
  check("receipts: an empty tick is an empty ledger", Array.isArray(log) && log.length === 0); }

console.log(`receipts-test: ${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
console.log("receipts-test PASS");
