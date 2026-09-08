// COMBO-ENGINE — selftest.mjs: the one-call headless run. Every registered
// gate in order, each verdict on one line, the api's fixed hashes printed,
// exit 0 only when every gate passes. This is the boot self-test the badge
// points at, runnable by anyone from a clean clone. The gate list is read
// from scripts/gate.mjs itself, in file order, so it can never go stale.
import { spawnSync } from "node:child_process";
import fs from "node:fs";

export function gateNames() {
  const text = fs.readFileSync("scripts/gate.mjs", "utf8");
  const start = text.indexOf("const GATES = {");
  const end = text.indexOf("};", start);
  const body = text.slice(start, end);
  const names = [];
  for (const line of body.split("\n")) {
    const m = line.match(/^\s*"([a-z0-9-]+)":\s*\[/);
    if (m) names.push(m[1]);
  }
  return names;
}

function main() {
  const GATES = gateNames();
  let bad = 0;
  for (const g of GATES) {
    const r = spawnSync(process.execPath, ["scripts/gate.mjs", g], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
    const lines = (r.stdout + r.stderr).split("\n").filter((l) => l.trim());
    const tail = lines[lines.length - 1] || "";
    const ok = r.status === 0;
    if (!ok) bad++;
    console.log((ok ? "PASS " : "FAIL ") + g + " — " + tail.slice(0, 100));
  }
  console.log(bad ? `selftest: ${bad} of ${GATES.length} gates FAILED` : `selftest: all ${GATES.length} gates PASS`);
  process.exit(bad ? 1 : 0);
}

// main() runs only when this file is the entry point — the shape src/depot/api.js
// guards its own main with, compared here so an importer gets gateNames() alone.
function runningAsEntry() {
  if (typeof process === "undefined" || !process.versions || !process.versions.node || !process.argv[1]) return false;
  const here = decodeURIComponent(import.meta.url.replace(/^file:\/\//, ""));
  const arg = process.argv[1];
  const argAbs = arg.startsWith("/") ? arg : process.cwd() + "/" + arg;
  return here === argAbs;
}
if (runningAsEntry()) main();
