# Task 0.0.62-1 — the receipt log

One job: land the receipt log and its gate, byte-for-byte from this plan. Write exactly what is written, run the listed gates, report. You design nothing.

Suggested model: Sonnet 5.

Required reading, in order (confirm at the top of your report):
1. This file, whole.
2. `docs/plans/phase-0.0.62-receipts.md`, whole.

## Steps

Run from `/home/batman/combo-engine`. A failed assert stops the task; report the step and its verbatim output, run nothing further.

1. Assert the ground:

```sh
node scripts/gate.mjs frostline > /tmp/fl.out 2>&1; tail -1 /tmp/fl.out   # must print: frostline-test PASS
ls src/modules/receipts 2>/dev/null || echo absent   # must print: absent
```

2. Write `src/modules/receipts/receipts.js`, exactly:

```js
// MODULE: receipts — the harness's receipt log. Every sim event rendered as
// one plain line a person can read: what happened, to what, for how much,
// where. SHAPED: the law is the checklist's words; the shapes are the
// engine's own event objects. Never throws; an unknown event still gets an
// honest line. Pure; no globals, no rng.
const fmt = (v) => (typeof v === "number" && !Number.isInteger(v) ? v.toFixed(1) : v);
const at = (ev) => (ev.x !== undefined && ev.z !== undefined ? " at " + fmt(ev.x) + "," + fmt(ev.z) : "");

const LINES = {
  kill: (ev) => "a " + (ev.kind || "unit") + " on side " + ev.team + " fell" + (ev.attacker ? " to " + ev.attacker : "") + at(ev),
  shipkill: (ev) => "a ship on side " + ev.team + " broke up, bounty " + fmt(ev.bounty) + at(ev),
  strike: (ev) => "a strike landed" + at(ev),
  splat: (ev) => "ground torn, crater " + fmt(ev.r) + at(ev),
  weldbreak: (ev) => (ev.ice ? "an ice weld" : "a weld") + " snapped" + at(ev),
  collapse: (ev) => "a structure collapsed" + at(ev),
  structureLost: (ev) => "structure " + ev.id + " (" + ev.kind + ") was lost",
};

// receipt(ev) -> one plain line, always.
export function receipt(ev) {
  if (!ev || typeof ev !== "object" || !ev.type) return "an unreadable event";
  const f = LINES[ev.type];
  if (f) { try { return f(ev); } catch { /* fall through to the honest line */ } }
  const nums = Object.keys(ev).filter((k) => k !== "type" && typeof ev[k] === "number").map((k) => k + " " + fmt(ev[k]));
  return ev.type + (nums.length ? " — " + nums.join(", ") : "");
}

// receiptLog(events) -> the tick's ledger, one line per event, in order.
export function receiptLog(events) { return (events || []).map(receipt); }
```

Then `sha256sum src/modules/receipts/receipts.js` — must print `671f9e5249c6797c372b4cd288c4cc1a78a12dd37d681491deca7ea5a5f61a09`.

3. Write `scripts/receipts-test.mjs`, exactly:

```js
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
```

Then `sha256sum scripts/receipts-test.mjs` — must print `ceb295f9547a7d4ea3c9a036e7a51964bb00c21d04ca44cbda2fabbf45a4e22c`.

4. In `scripts/gate.mjs`, in the GATES table, add one line after the `"wells"` entry (or after the line the previous harness rung added, keeping this batch's entries together):

```js
  "receipts": ["scripts/receipts-test.mjs"],
```

5. Run the new gate. Must print a seeds line, 4 PASS lines, `receipts-test: 4 PASS / 0 FAIL`, `receipts-test PASS`, exit 0:

```sh
node scripts/gate.mjs receipts
```

6. Prior gates unmoved: rerun the step-1 frostline command; same tail.

7. Close the records: `package.json` version to `0.0.62`; the phase doc's status line to LANDED as its comment shows; in `docs/plans/batch-harness-1.md` flip this rung's box; in `README.md` flip the checklist box starting `- [ ] The receipt log` to `- [x]`, and add the line `- [x] receipts — the receipt log — 0.0.62` at the bottom of the "Serving checklist items" list.

8. Commit and push, then stamp:

```sh
git add src/modules/receipts/receipts.js scripts/receipts-test.mjs scripts/gate.mjs package.json README.md docs/plans/phase-0.0.62-receipts.md docs/plans/task-0.0.62-1-receipts.md docs/plans/batch-harness-1.md
git commit -m "phase 0.0.62 — the receipt log

Checklist: The receipt log. Gate 4 PASS / 0 FAIL at rolled seeds.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push origin main
H=$(git rev-parse --short HEAD)
sed -i "s/commit stamped below/commit \`$H\`/" docs/plans/phase-0.0.62-receipts.md
git add docs/plans/phase-0.0.62-receipts.md && git commit -m "phase 0.0.62 record stamped — $H

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push origin main
```

## Acceptance

- Every sha256 above exact; the gate `4 PASS / 0 FAIL` then `receipts-test PASS` at rolled seeds; frostline's tail unchanged; records flipped riding the landing; pushes accepted.

## Report

Read-confirmation first, then one line of outcome, then bullets: the sha256 lines verbatim, the new gate's seeds/count/verdict lines verbatim, the frostline tail, both commit hashes, the push results. Every nonconformity its own labeled bullet.
