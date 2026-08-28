// modules/ledger — the conservation ledger, shaped from the deadweight demo
// (deadweight-hangar.html lines 254-344: GEN, genesis(), audit()). The law is
// deadweight's exactly: every conserved unit is declared at world start, and
// the audit sums every holder and must come back to zero drift, forever. The
// code around the law is new: the demo walked its game's lists by name; here
// holders REGISTER a counting function, and the module only sums.
//
// Life cycle: declare() during genesis -> seal() -> source()/audit() during
// the run. Genesis never moves after sealing except through writeOff(), the
// demo's "a star can eat money — genesis records it", made explicit and
// reason-carrying.

export const LEDGER_CONTRACT = {
  dimensions: "array of 1+ distinct non-empty strings",
  source: "name + function returning {dimension: finite number} (missing dimensions count as 0)",
};

// checkDimensions(dims) -> problem strings, empty when clean. Pure.
export function checkDimensions(dims) {
  if (!Array.isArray(dims) || dims.length < 1) return ["dimensions: array of 1+ strings required"];
  const problems = [];
  const seen = new Set();
  for (const d of dims) {
    if (typeof d !== "string" || !d.length) { problems.push("dimensions: non-empty strings only"); continue; }
    if (seen.has(d)) problems.push("dimensions: duplicate \"" + d + "\"");
    seen.add(d);
  }
  return problems;
}

export function makeLedger(opts) {
  const problems = checkDimensions(opts && opts.dimensions);
  if (problems.length) throw new Error("makeLedger: " + problems.join("; "));
  const dims = [...opts.dimensions];
  const genesis = {}; for (const d of dims) genesis[d] = 0;
  const sources = new Map();
  const writeOffs = [];
  let sealed = false;

  return {
    // genesis: declare what exists before the world runs
    declare(dimension, amount) {
      if (sealed) throw new Error("ledger: declare after seal");
      if (!(dimension in genesis)) throw new Error("ledger: unknown dimension \"" + dimension + "\"");
      if (!Number.isFinite(amount)) throw new Error("ledger: non-finite declare");
      genesis[dimension] += amount;
    },
    seal() { sealed = true; },
    get sealed() { return sealed; },

    // holders of value register how to count themselves; re-registering a
    // name replaces its counter (a holder that changes shape re-registers)
    source(name, count) {
      if (typeof name !== "string" || !name.length) throw new Error("ledger: source needs a name");
      if (typeof count !== "function") throw new Error("ledger: source needs a counting function");
      sources.set(name, count);
    },
    dropSource(name) { sources.delete(name); },

    // the world destroyed value on purpose; the books record it, with a reason
    writeOff(dimension, amount, reason) {
      if (!(dimension in genesis)) throw new Error("ledger: unknown dimension \"" + dimension + "\"");
      if (!Number.isFinite(amount)) throw new Error("ledger: non-finite writeOff");
      genesis[dimension] -= amount;
      writeOffs.push({ dimension, amount, reason: String(reason || "unstated") });
    },
    get writeOffs() { return writeOffs.slice(); },

    // sum every holder, subtract genesis: zero drift or a named finding
    audit(epsilon = 1e-9) {
      const totals = {}; for (const d of dims) totals[d] = 0;
      for (const [name, count] of sources) {
        const held = count();
        for (const d of dims) {
          const v = held && Number.isFinite(held[d]) ? held[d] : 0;
          totals[d] += v;
          if (held && d in held && !Number.isFinite(held[d]))
            return { ok: false, drift: null, finding: "source \"" + name + "\" returned non-finite " + d };
        }
      }
      const drift = {}; let ok = true;
      for (const d of dims) { drift[d] = totals[d] - genesis[d]; if (Math.abs(drift[d]) > epsilon) ok = false; }
      return { ok, drift, finding: ok ? null : "drift" };
    },
  };
}
