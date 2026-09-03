// COMBO-ENGINE — selftest.mjs: the one-call headless run. Every registered
// gate in order, each verdict on one line, the api's fixed hashes printed,
// exit 0 only when every gate passes. This is the boot self-test the badge
// points at, runnable by anyone from a clean clone.
import { spawnSync } from "node:child_process";
const GATES = ["api", "combat", "accuracy", "market", "builder", "ledger", "weldstress", "tape", "physics-pb", "rig",
  "solids", "ballistics", "orders", "steering", "voxel", "support", "grapple", "old-master", "frostline", "escrow", "wells"];
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
