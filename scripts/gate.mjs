#!/usr/bin/env node
// COMBO-ENGINE — gate.mjs: the gate-log wrapper, carried over from coldsnap
// (mk1.98, owner). Runs one named gate unchanged, mirrors its output, and
// appends one line per run to .superpowers/gates.log so a status check can
// read which gates ran and what they returned without anyone's scrollback.
// CI calls the gates directly and never writes this log.
//
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const GATES = {
  "api": ["src/depot/api.js", "gate", "1", "90"],
  "combat": ["scripts/combat-test.mjs"],
  "accuracy": ["scripts/accuracy-test.mjs"],
  "market": ["scripts/market-test.mjs"],
  "builder": ["scripts/builder-test.mjs"],
  "ledger": ["scripts/ledger-test.mjs"],
  "weldstress": ["scripts/weldstress-test.mjs"],
  "tape": ["scripts/tape-test.mjs"],
  "physics-pb": ["scripts/physics-pb-test.mjs"],
  "rig": ["scripts/rig-test.mjs"],
  "solids": ["scripts/solids-test.mjs"],
  "ballistics": ["scripts/ballistics-test.mjs"],
};
const name = process.argv[2];
if (!GATES[name]) {
  const known = Object.keys(GATES);
  console.error(known.length
    ? `gate.mjs: unknown gate "${name}" — one of: ${known.join(", ")}`
    : `gate.mjs: no gates registered yet — the table fills as modules land`);
  process.exit(2);
}
const t0 = Date.now();
const r = spawnSync(process.execPath, GATES[name], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, env: process.env });
process.stdout.write(r.stdout || "");
process.stderr.write(r.stderr || "");
const secs = ((Date.now() - t0) / 1000).toFixed(1);
const lines = ((r.stdout || "") + (r.stderr || "")).split("\n").filter((l) => l.trim().length);
const pass = lines.filter((l) => l.startsWith("PASS")).length;
const fail = lines.filter((l) => l.startsWith("FAIL")).length;
const tail = (lines[lines.length - 1] || "").slice(0, 120);
const verdict = r.status === 0 ? "ok" : "FAIL(" + r.status + ")";
fs.mkdirSync(".superpowers", { recursive: true });
fs.appendFileSync(path.join(".superpowers", "gates.log"),
  `${new Date().toISOString()} ${name} ${verdict} ${pass} PASS / ${fail} FAIL — ${tail} (${secs}s)\n`);
process.exit(r.status == null ? 1 : r.status);
