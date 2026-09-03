# Task 0.0.66-1 — the manifest tool

One job: land the manifest tool and its gate, byte-for-byte from this plan. Write exactly what is written, run the listed gates, report. You design nothing.

Suggested model: Sonnet 5.

Required reading, in order (confirm at the top of your report):
1. This file, whole.
2. `docs/plans/phase-0.0.66-manifest.md`, whole.

## Steps

Run from `/home/batman/combo-engine`. A failed assert stops the task; report the step and its verbatim output, run nothing further.

1. Assert the ground:

```sh
node scripts/gate.mjs frostline > /tmp/fl.out 2>&1; tail -1 /tmp/fl.out   # must print: frostline-test PASS
ls scripts/manifest.mjs 2>/dev/null || echo absent   # must print: absent
```

2. Write `scripts/manifest.mjs`, exactly:

```js
// COMBO-ENGINE — manifest.mjs: the import map, kept mechanically. Walks
// src/ and docs/ page code, reads every import line, and prints who pulls
// what from where — one line per edge, sorted, so two runs on one tree are
// byte-identical and any drift is a diff.
import fs from "node:fs";
import path from "node:path";
const ROOTS = ["src", "docs/frostline", "docs/play"];
export function manifest(rootDir) {
  const edges = [];
  const walk = (d) => {
    for (const e of fs.readdirSync(path.join(rootDir, d), { withFileTypes: true })) {
      const rel = path.join(d, e.name);
      if (e.isDirectory()) { if (e.name !== "node_modules") walk(rel); continue; }
      if (!/\.(js|mjs)$/.test(e.name)) continue;
      const text = fs.readFileSync(path.join(rootDir, rel), "utf8");
      for (const m of text.matchAll(/^import\s[^;]*?from\s+"([^"]+)"/gm)) edges.push(rel + " <- " + m[1]);
      for (const m of text.matchAll(/^export\s\*\sfrom\s+"([^"]+)"/gm)) edges.push(rel + " <- " + m[1]);
    }
  };
  for (const r of ROOTS) if (fs.existsSync(path.join(rootDir, r))) walk(r);
  return edges.sort();
}
if (process.argv[1] && process.argv[1].endsWith("manifest.mjs")) {
  const edges = manifest(process.cwd());
  for (const e of edges) console.log(e);
  console.log("manifest: " + edges.length + " import edges");
}
```

Then `sha256sum scripts/manifest.mjs` — must print `d103fc7c6b7d8cb817b0e3eb3c48d94113ae599bf52f1382c61381e52fdbde1c`.

3. Write `scripts/manifest-test.mjs`, exactly:

```js
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
```

Then `sha256sum scripts/manifest-test.mjs` — must print `af4fff2b5c5fcd8b4f579c2ccedcc77a576d7403882d7c34c1965fc26c86be97`.

4. In `scripts/gate.mjs`, in the GATES table, add one line after the `"receipts"` entry (or after the line the previous api-batch rung added, keeping this batch's entries together):

```js
  "manifest": ["scripts/manifest-test.mjs"],
```

5. Run the new gate — seeds line, 3 PASS lines, `manifest-test: 3 PASS / 0 FAIL`, `manifest-test PASS`, exit 0:

```sh
node scripts/gate.mjs manifest
```

6. Prior gates unmoved: rerun the step-1 frostline command; same tail.

7. Close the records: `package.json` version to `0.0.66`; the phase doc's status line to LANDED as its comment shows; in `docs/plans/batch-api-1.md` flip this rung's box; in `README.md` flip the checklist box starting `- [ ] The manifest tool` to `- [x]`, and add the line `- [x] manifest (scripts/manifest.mjs) — the import map, kept mechanically — 0.0.66` at the bottom of the "Serving checklist items" list.

8. Commit and push, then stamp:

```sh
git add scripts/manifest.mjs scripts/manifest-test.mjs scripts/gate.mjs package.json README.md docs/plans/phase-0.0.66-manifest.md docs/plans/task-0.0.66-1-manifest.md docs/plans/batch-api-1.md
git commit -m "phase 0.0.66 — the manifest tool

Gate 3 PASS / 0 FAIL at rolled seeds; frostline unmoved.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push origin main
H=$(git rev-parse --short HEAD)
sed -i "s/commit stamped below/commit \`$H\`/" docs/plans/phase-0.0.66-manifest.md
git add docs/plans/phase-0.0.66-manifest.md && git commit -m "phase 0.0.66 record stamped — $H

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push origin main
```

## Acceptance

- Every sha256 above exact; the gate `3 PASS / 0 FAIL` then `manifest-test PASS`; frostline's tail unchanged; records flipped riding the landing; pushes accepted.

## Report

Read-confirmation first, then one line of outcome, then bullets: the sha256 lines verbatim, the new gate's seeds/count/verdict lines, the frostline tail, both commit hashes, the push results. Every nonconformity its own labeled bullet.
