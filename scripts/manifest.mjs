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
