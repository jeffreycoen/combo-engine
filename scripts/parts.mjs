#!/usr/bin/env node
// COMBO-ENGINE — parts.mjs: the parts table and the parts page, built from the
// record. Reads the authored parts source, the tree, the coldsnap checkout, the
// README's modules list, the phase documents, the manifest tool, and the gates,
// and writes docs/parts/parts.json and docs/parts/parts.html. Every status is
// measured here; the page only draws it.
//
//   node scripts/parts.mjs [--root DIR] [--src FILE] [--out DIR] [--gates all|none|a,b,c] [--reuse FILE]
//
// --reuse takes gate results from an earlier parts.json instead of running the
// gates; the parts gate uses it to prove twin identity of the derivation.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const ROOT = path.resolve(opt("--root", process.cwd()));
const SRC = path.resolve(opt("--src", path.join(ROOT, "docs/parts/parts-source.json")));
const OUT = path.resolve(opt("--out", path.join(ROOT, "docs/parts")));
const GATES_OPT = opt("--gates", "all");
const REUSE = opt("--reuse", null);
const TEMPLATE = path.resolve(opt("--template", path.join(path.dirname(SRC), "template.html")));
const VIEWS = path.resolve(opt("--views", path.join(path.dirname(SRC), "views.js")));

const sha = (buf) => crypto.createHash("sha256").update(buf).digest("hex").slice(0, 12);
const read = (p) => fs.readFileSync(p, "utf8");
const exists = (p) => fs.existsSync(p);
const git = (cwd, ...a) => { const r = spawnSync("git", a, { cwd, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }); if (r.status !== 0) throw new Error("git " + a.join(" ") + ": " + r.stderr); return r.stdout; };
const gitShowBuf = (cwd, ref, file) => { const r = spawnSync("git", ["show", ref + ":" + file], { cwd, maxBuffer: 64 * 1024 * 1024 }); return r.status === 0 ? r.stdout : null; };

const src = JSON.parse(read(SRC));
const t0 = Date.now();

// ---- coldsnap rows: one per source file at the commit, classified by the authored groups
const CS = src.coldsnap;
const csFiles = git(CS.checkout, "ls-tree", "-r", "--name-only", CS.commit, "--", "src").split("\n").filter(Boolean);
const ext = (f) => path.extname(f);
function groupOf(f) {
  for (const g of src.coldsnapGroups) {
    if (!g.match.some((m) => f.startsWith(m) || f === m)) continue;
    if (g.only && !g.only.includes(ext(f))) continue;
    if (g.exclude && g.exclude.includes(ext(f))) continue;
    return g;
  }
  return null;
}
const firstLine = (text) => { const m = text.match(/^\s*(?:\/\/|\/\*|\*|#)\s*(.*)$/m); return m ? m[1].slice(0, 140) : ""; };
const csParts = [];
for (const f of csFiles) {
  const g = groupOf(f); if (!g) { console.error("unclassified coldsnap file: " + f); process.exit(2); }
  const head = gitShowBuf(CS.checkout, CS.commit, f), old = gitShowBuf(CS.checkout, CS.treeCommit, f);
  const treeP = path.join(ROOT, f), tree = exists(treeP) ? fs.readFileSync(treeP) : null;
  const hashHead = sha(head), hashOld = old ? sha(old) : null, hashTree = tree ? sha(tree) : null;
  const file = !tree ? "absent" : hashTree === hashHead ? "current" : hashTree === hashOld ? "behind" : "differs";
  csParts.push({ id: "cs:" + f, source: "coldsnap", group: g.name, groupId: g.id, name: path.basename(f), path: f, lines: head.toString("utf8").split("\n").length - 1,
    does: firstLine(head.toString("utf8")), files: tree ? [f] : [], serves: g.serves || [], closes: g.closes || [], plan: g.plan, phaseOf: g.plan === "take" ? "ark-spine" : null,
    mech: { file, hashHead, hashOld, hashTree } });
}

// ---- the README's modules list: module -> the phases that landed it
const readme = exists(path.join(ROOT, "README.md")) ? read(path.join(ROOT, "README.md")) : "";
const modulePhases = {};
for (const m of readme.matchAll(/^- \[x\] ([a-z0-9-]+)(?: \([^)]*\))? — .*? — ((?:0\.0\.\d+)(?:[^\n]*))$/gm)) {
  const nums = [...m[2].matchAll(/0\.0\.\d+/g)].map((x) => x[0]);
  modulePhases[m[1]] = nums;
}

// ---- the phase documents: number, name, status word, the status line, acceptance bullets
const plansDir = path.join(ROOT, "docs/plans");
const phases = [];
for (const f of (exists(plansDir) ? fs.readdirSync(plansDir) : []).sort()) {
  const m = f.match(/^phase-(\d+\.\d+\.\d+)-(.+)\.md$/); if (!m) continue;
  const text = read(path.join(plansDir, f));
  const st = text.match(/^Status:\s*([A-Z]+)(.*)$/m);
  const acceptance = [];
  const sec = text.split(/^## Acceptance\s*$/m)[1];
  if (sec) for (const a of sec.split(/^## /m)[0].matchAll(/^- ([A-Za-z0-9_:./-]+): (accepted|returned)(?:,\s*(.*))?$/gm)) acceptance.push({ part: a[1], verdict: a[2], finding: a[3] || null });
  phases.push({ num: m[1], name: m[2].replace(/-/g, " "), file: "docs/plans/" + f, status: st ? st[1] : "UNKNOWN", line: st ? ("Status: " + st[1] + st[2]).slice(0, 160) : "", acceptance });
}
const phaseNums = new Set(phases.map((p) => p.num));

// ---- the manifest tool: import edges, file to file
const { manifest } = await import(pathToFileURL(path.join(ROOT, "scripts/manifest.mjs")).href);
const edges = manifest(ROOT).map((e) => { const [from, to] = e.split(" <- "); return { from, to: path.normalize(path.join(path.dirname(from), to)) }; });

// ---- the gates: the table in gate.mjs, run fresh, or reused from an earlier build
const gateText = read(path.join(ROOT, "scripts/gate.mjs"));
const gateTable = {};
for (const m of gateText.slice(gateText.indexOf("const GATES = {"), gateText.indexOf("};", gateText.indexOf("const GATES = {"))).matchAll(/^\s*"([a-z0-9-]+)":\s*\[([^\]]*)\]/gm)) gateTable[m[1]] = m[2].split(",").map((s) => s.trim().replace(/^"|"$/g, "")).filter(Boolean);
let gateRuns = {};
if (REUSE) { gateRuns = JSON.parse(read(REUSE)).gates || {}; }
else {
  const names = GATES_OPT === "all" ? Object.keys(gateTable) : GATES_OPT === "none" ? [] : GATES_OPT.split(",");
  for (const name of names) {
    const s0 = Date.now();
    const r = spawnSync(process.execPath, ["scripts/gate.mjs", name], { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
    const lines = ((r.stdout || "") + (r.stderr || "")).split("\n").map((l) => l.trim()).filter(Boolean);
    const checks = lines.filter((l) => /^(PASS|FAIL)\b/.test(l)).map((l) => l.slice(0, 160));
    const seedsLine = lines.find((l) => /seed/i.test(l) && !/^(PASS|FAIL)\b/.test(l)) || "no seeds line printed";
    gateRuns[name] = { name, script: gateTable[name][0], verdict: r.status === 0 ? "ok" : "FAIL", pass: checks.filter((c) => c.startsWith("PASS")).length, fail: checks.filter((c) => c.startsWith("FAIL")).length,
      seeds: seedsLine.slice(0, 160), checks, seconds: +((Date.now() - s0) / 1000).toFixed(1), tail: (lines[lines.length - 1] || "").slice(0, 160) };
    process.stderr.write(`gate ${name}: ${gateRuns[name].verdict} ${gateRuns[name].pass}/${gateRuns[name].pass + gateRuns[name].fail} in ${gateRuns[name].seconds} s\n`);
  }
}

// ---- exports and the surface a gate exercises
function exportsOf(files) {
  const names = new Set();
  for (const f of files) {
    const p = path.join(ROOT, f); if (!exists(p) || !/\.(js|mjs)$/.test(f)) continue;
    const text = read(p);
    for (const m of text.matchAll(/^export\s+(?:async\s+)?(?:function\*?|const|let|var|class)\s+([A-Za-z_$][\w$]*)/gm)) names.add(m[1]);
    for (const m of text.matchAll(/^export\s*\{([^}]*)\}/gm)) for (const n of m[1].split(",")) { const nm = n.trim().split(/\s+as\s+/).pop(); if (nm) names.add(nm); }
  }
  return [...names].sort();
}
function gateImports(gateName, files) {
  if (!gateTable[gateName]) return null;
  const script = path.join(ROOT, gateTable[gateName][0]); if (!exists(script)) return null;
  const text = read(script), used = new Set();
  for (const m of text.matchAll(/import\s*\{([\s\S]*?)\}\s*from\s*"([^"]+)"/g)) {
    const target = path.normalize(path.join(path.dirname(gateTable[gateName][0]), m[2]));
    if (!files.includes(target)) continue;
    for (const n of m[1].split(",")) { const nm = n.trim().split(/\s+as\s+/)[0].trim(); if (nm) used.add(nm); }
  }
  return used;
}
const demo = exists(path.join(ROOT, "deadweight-hangar.html")) ? read(path.join(ROOT, "deadweight-hangar.html")).split("\n") : [];
function demoLine(fn) { const i = demo.findIndex((l) => l.startsWith("function " + fn + "(")); return i >= 0 ? i + 1 : null; }

// ---- the authored parts, enriched
const parts = [];
for (const p0 of src.parts) {
  const p = { ...p0, mech: {} };
  let files = p.files ? p.files.slice() : [];
  if (p.module) { const dir = path.join(ROOT, "src/modules", p.module); if (exists(dir)) files = fs.readdirSync(dir).filter((f) => /\.(js|mjs)$/.test(f)).map((f) => "src/modules/" + p.module + "/" + f); else p.mech.missing = ["src/modules/" + p.module + "/"]; }
  p.files = files;
  if (files.length) { p.mech.present = files.every((f) => exists(path.join(ROOT, f))); p.mech.missing = files.filter((f) => !exists(path.join(ROOT, f))); }
  if (p.module && !p.phase && modulePhases[p.module]) { p.phases = modulePhases[p.module]; p.phase = p.phases[p.phases.length - 1]; }
  if (p.demoFns) { p.mech.demoLines = {}; for (const fn of p.demoFns) p.mech.demoLines[fn] = demoLine(fn); }
  if (files.length) {
    const set = new Set(files);
    p.mech.importedBy = [...new Set(edges.filter((e) => set.has(e.to) && !set.has(e.from)).map((e) => e.from))].sort();
    p.mech.imports = [...new Set(edges.filter((e) => set.has(e.from) && !set.has(e.to)).map((e) => e.to))].sort();
    p.mech.wired = p.mech.importedBy.length > 0;
    const ex = exportsOf(files), used = p.gate ? gateImports(p.gate, files) : null;
    if (ex.length) p.mech.exports = { total: ex.length, exercised: used ? ex.filter((n) => used.has(n)).length : 0, untested: used ? ex.filter((n) => !used.has(n)) : ex };
  }
  if (p.gate && gateRuns[p.gate]) p.mech.gate = gateRuns[p.gate];
  else if (p.gate && !gateTable[p.gate]) p.mech.gateMissing = p.gate;
  parts.push(p);
}
for (const p of csParts) parts.push(p);

// ---- the graph: one node per part (coldsnap files fold into their group), edges from the manifest
const layerOf = (p) => p.source === "coldsnap" ? "spine" : p.id.startsWith("scr-") || p.id === "ark-page" ? "screens" : p.source === "deadweight" || p.module ? "modules" : "game";
const nodes = [];
const owner = {};   // file -> node id
for (const p of parts) {
  const nid = p.source === "coldsnap" ? p.groupId : p.id;
  if (!nodes.find((n) => n.id === nid)) nodes.push({ id: nid, name: p.source === "coldsnap" ? p.group : p.name, layer: layerOf(p), source: p.source });
  for (const f of p.files || []) owner[f] = nid;
}
const gEdges = new Map();
for (const e of edges) { const a = owner[e.from], b = owner[e.to]; if (a && b && a !== b) gEdges.set(a + ">" + b, { from: a, to: b }); }
// coldsnap rollups: one row per group for the frame view, the matrix, and the graph; the files stay under By source
const rollups = [];
for (const g of src.coldsnapGroups) { const rows = parts.filter((p) => p.groupId === g.id); if (!rows.length) continue;
  const fileStates = {}; for (const r of rows) fileStates[r.mech.file] = (fileStates[r.mech.file] || 0) + 1;
  rollups.push({ id: g.id, source: "coldsnap", group: g.name, name: g.name, does: rows.length + " files at " + CS.commit + ": " + Object.entries(fileStates).map(([k, v]) => v + " " + (k === "differs" ? "changed here" : k)).join(", "), files: [], count: rows.length, fileStates,
    serves: g.serves || [], closes: g.closes || [], plan: g.plan, phaseOf: g.plan === "take" ? "ark-spine" : null, isRollup: true,
    mech: { file: rows.every((r) => r.mech.file === "current") ? "current" : rows.some((r) => r.mech.file === "absent") ? "absent" : rows.some((r) => r.mech.file === "differs") ? "differs" : "behind" } }); }

const table = {
  title: src.title, coldsnap: { commit: CS.commit, treeCommit: CS.treeCommit, checkout: CS.checkout }, frames: src.frames, gaps: src.gaps, feedbackKinds: src.feedbackKinds,
  parts, rollups, phases, gates: gateRuns, graph: { nodes, edges: [...gEdges.values()] },
  meta: { commit: git(ROOT, "rev-parse", "--short", "HEAD").trim(), builtAt: new Date().toISOString().slice(0, 16).replace("T", " "), gatesRun: Object.keys(gateRuns).length, gateSeconds: +Object.values(gateRuns).reduce((s, g) => s + g.seconds, 0).toFixed(1), buildSeconds: 0 },
};
table.meta.buildSeconds = +((Date.now() - t0) / 1000).toFixed(1);

// ---- write the table and the page
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, "parts.json"), JSON.stringify(table, null, 1));
const views = read(VIEWS).replace(/^export\s+/gm, "");
const html = read(TEMPLATE).replace("/*__DATA__*/null", () => JSON.stringify(table)).replace("/*__VIEWS__*/", () => views);
fs.writeFileSync(path.join(OUT, "parts.html"), html);
console.log(`parts: ${parts.length} rows (${csParts.length} coldsnap files, ${src.parts.length} authored), ${phases.length} phase documents, ${edges.length} import edges, ${Object.keys(gateRuns).length} gates in ${table.meta.gateSeconds} s, build ${table.meta.buildSeconds} s`);
console.log(`wrote ${path.relative(ROOT, path.join(OUT, "parts.json"))} (${fs.statSync(path.join(OUT, "parts.json")).size} bytes) and parts.html (${fs.statSync(path.join(OUT, "parts.html")).size} bytes)`);
