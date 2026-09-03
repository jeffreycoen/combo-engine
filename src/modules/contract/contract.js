// MODULE: contract — the harness's table checker. A contract declares what
// a spec table's rows must carry; the check walks every row against every
// rule and returns EVERY problem in one pass — a bad table never reaches
// the sim, and the report never stops at the first fault. SHAPED: the law
// is the checklist's words; the code is new. Pure; no globals, no rng.

// A contract: { fields: { name: { type: "number"|"string"|"boolean"|"array"|"object",
//   required, min, max, oneOf } }, allowExtra }.
// checkTable(name, table, contract) -> a list of plain problem strings, empty when clean.
export function checkTable(name, table, contract) {
  const problems = [];
  if (table == null || typeof table !== "object") return [name + ": the table is missing"];
  for (const rowKey in table) {
    const row = table[rowKey];
    if (row == null || typeof row !== "object") { problems.push(name + "." + rowKey + ": the row is not an object"); continue; }
    for (const f in contract.fields) {
      const rule = contract.fields[f];
      const v = row[f];
      if (v === undefined) { if (rule.required) problems.push(name + "." + rowKey + "." + f + ": required, missing"); continue; }
      const t = Array.isArray(v) ? "array" : typeof v;
      if (rule.type && t !== rule.type) { problems.push(name + "." + rowKey + "." + f + ": is " + t + ", must be " + rule.type); continue; }
      if (rule.min !== undefined && v < rule.min) problems.push(name + "." + rowKey + "." + f + ": " + v + " under the floor " + rule.min);
      if (rule.max !== undefined && v > rule.max) problems.push(name + "." + rowKey + "." + f + ": " + v + " over the ceiling " + rule.max);
      if (rule.oneOf && !rule.oneOf.includes(v)) problems.push(name + "." + rowKey + "." + f + ": " + v + " not one of " + rule.oneOf.join("/"));
    }
    if (contract.allowExtra === false) for (const f in row) if (!(f in contract.fields)) problems.push(name + "." + rowKey + "." + f + ": not in the contract");
  }
  return problems;
}

// assertTables(pairs) -> the boot's door: every table checked, every
// problem gathered, one throw carrying the whole report or a clean pass.
export function assertTables(pairs) {
  const all = [];
  for (const { name, table, contract } of pairs) all.push(...checkTable(name, table, contract));
  if (all.length) { const e = new Error("contract check failed:\n" + all.join("\n")); e.problems = all; throw e; }
  return true;
}
