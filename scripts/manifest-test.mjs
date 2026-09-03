// COMBO-ENGINE — manifest-test. Laws: two walks of one tree are byte-equal;
// a planted file's edges appear exactly and vanish with the file; the live
// tree's known front doors are on the map. Seedless arithmetic.
import fs from "node:fs";
import { manifest } from "./manifest.mjs";
let pass = 0, fail = 0;
const check = (n, ok) => { if (ok) { pass++; console.log("PASS " + n); } else { fail++; console.log("FAIL " + n); } };
console.log("seeds {} — seedless arithmetic");
const root = process.cwd();
{ const a = manifest(root), b = manifest(root);
  check("manifest: two walks of one tree are byte-identical", JSON.stringify(a) === JSON.stringify(b) && a.length > 50); }
{ const probe = "src/__manifest_probe.mjs";
  fs.writeFileSync(probe, 'import { worldHash } from "./engine/core.js";\nexport * from "./version.js";\n');
  const withProbe = manifest(root).filter((e) => e.includes("__manifest_probe"));
  fs.unlinkSync(probe);
  const gone = manifest(root).some((e) => e.includes("__manifest_probe"));
  check("manifest: a planted file's two edges appear exactly and vanish with the file", withProbe.length === 2 && !gone); }
{ const m = manifest(root);
  check("manifest: the depot front doors are on the map",
    m.some((e) => e.startsWith("src/depot/sight.js <- ../modules/sight/sight.js")) &&
    m.some((e) => e.includes("docs/frostline/main.js <- "))); }
console.log(`manifest-test: ${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
console.log("manifest-test PASS");
