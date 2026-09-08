// MODULE: receipts — the harness's receipt log. Every sim event rendered as
// one plain line a person can read: what happened, to what, for how much,
// where. SHAPED: the law is the checklist's words; the shapes are the
// engine's own event objects. Never throws; an unknown event still gets an
// honest line. Pure; no globals, no rng.
//
// Second pass, the substitutions:
// 1. LINES is exported; the table itself is untouched.
// 2. receipt(ev) becomes receipt(ev, lines = LINES); reads lines[ev.type] where it read LINES[ev.type].
// 3. receiptLog(events) becomes receiptLog(events, lines = LINES) and passes lines to receipt.
// 4. LINES_CONTRACT states the shape: every key a function(event) -> string.
// 5. checkLines(table) returns every problem in one pass, empty when clean.
const fmt = (v) => (typeof v === "number" && !Number.isInteger(v) ? v.toFixed(1) : v);
const at = (ev) => (ev.x !== undefined && ev.z !== undefined ? " at " + fmt(ev.x) + "," + fmt(ev.z) : "");

export const LINES = {
  kill: (ev) => "a " + (ev.kind || "unit") + " on side " + ev.team + " fell" + (ev.attacker ? " to " + ev.attacker : "") + at(ev),
  shipkill: (ev) => "a ship on side " + ev.team + " broke up, bounty " + fmt(ev.bounty) + at(ev),
  strike: (ev) => "a strike landed" + at(ev),
  splat: (ev) => "ground torn, crater " + fmt(ev.r) + at(ev),
  weldbreak: (ev) => (ev.ice ? "an ice weld" : "a weld") + " snapped" + at(ev),
  collapse: (ev) => "a structure collapsed" + at(ev),
  structureLost: (ev) => "structure " + ev.id + " (" + ev.kind + ") was lost",
};

export const LINES_CONTRACT = {
  kill: "function(event) -> string",
  shipkill: "function(event) -> string",
  strike: "function(event) -> string",
  splat: "function(event) -> string",
  weldbreak: "function(event) -> string",
  collapse: "function(event) -> string",
  structureLost: "function(event) -> string",
};

export function checkLines(table) {
  if (!table || typeof table !== "object") return ["lines: not an object"];
  const problems = [];
  for (const key of Object.keys(table)) {
    if (typeof table[key] !== "function") problems.push("lines." + key + ": function required");
  }
  return problems;
}

// receipt(ev) -> one plain line, always.
export function receipt(ev, lines = LINES) {
  if (!ev || typeof ev !== "object" || !ev.type) return "an unreadable event";
  const f = lines[ev.type];
  if (f) { try { return f(ev); } catch { /* fall through to the honest line */ } }
  const nums = Object.keys(ev).filter((k) => k !== "type" && typeof ev[k] === "number").map((k) => k + " " + fmt(ev[k]));
  return ev.type + (nums.length ? " — " + nums.join(", ") : "");
}

// receiptLog(events) -> the tick's ledger, one line per event, in order.
export function receiptLog(events, lines = LINES) { return (events || []).map((ev) => receipt(ev, lines)); }
