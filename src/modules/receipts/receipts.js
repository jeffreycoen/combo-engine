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
