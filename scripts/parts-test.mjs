// COMBO-ENGINE — parts-test: the parts page's gate. Laws over the authored
// source, the generated table, and the builders the page draws with. Seedless:
// the tree is the fixture. The generator runs here twice with no gates, into a
// scratch folder, so the gate never spends the suite's minutes.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { STATES, BUCKETS, derive, renderAll } from "../docs/parts/views.js";

let pass = 0, fail = 0;
const check = (name, ok) => { if (ok) { pass++; console.log("PASS " + name); } else { fail++; console.log("FAIL " + name); } };
console.log("seeds {} — the tree is the fixture");

const ROOT = process.cwd();
const src = JSON.parse(fs.readFileSync(path.join(ROOT, "docs/parts/parts-source.json"), "utf8"));
const frameIds = new Set(src.frames.map((f) => f.id)), gapIds = new Set(src.gaps.map((g) => g.id));

// 1. the source: ids unique; every part has a source, a group, a plan; every frame and gap it names exists
{
  const ids = src.parts.map((p) => p.id);
  const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
  const shaped = src.parts.every((p) => ["coldsnap", "deadweight", "ark"].includes(p.source) && p.group && p.plan && p.name && p.does);
  const named = src.parts.every((p) => (p.serves || []).every((f) => frameIds.has(f)) && (p.closes || []).every((g) => gapIds.has(g)))
    && src.coldsnapGroups.every((g) => (g.serves || []).every((f) => frameIds.has(f)) && (g.closes || []).every((x) => gapIds.has(x)));
  check("parts: the source has unique ids, a source, group, plan, name and does on every part, and names only real frames and gaps", dupes.length === 0 && shaped && named);
}
// 2. every part that is built serves a frame or closes a gap; tooling is the one exempt group
check("parts: every part not left behind serves a frame or closes a gap, tooling excepted",
  src.parts.every((p) => ["leave", "decide"].includes(p.plan) || p.group === "Tooling" || (p.serves && p.serves.length) || (p.closes && p.closes.length))
  && src.coldsnapGroups.every((g) => ["leave", "decide"].includes(g.plan) || (g.serves && g.serves.length) || (g.closes && g.closes.length)));

// 3. the generator, twice, no gates: identical tables but for the clock
const tmpA = fs.mkdtempSync(path.join(os.tmpdir(), "parts-a-")), tmpB = fs.mkdtempSync(path.join(os.tmpdir(), "parts-b-"));
const run = (out) => spawnSync(process.execPath, ["scripts/parts.mjs", "--gates", "none", "--out", out], { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
const ra = run(tmpA), rb = run(tmpB);
check("parts: the generator runs clean twice on this tree", ra.status === 0 && rb.status === 0 && fs.existsSync(path.join(tmpA, "parts.json")) && fs.existsSync(path.join(tmpB, "parts.html")));
const strip = (o) => { const c = JSON.parse(JSON.stringify(o)); delete c.meta.builtAt; delete c.meta.buildSeconds; return JSON.stringify(c); };
const A = ra.status === 0 ? JSON.parse(fs.readFileSync(path.join(tmpA, "parts.json"), "utf8")) : null;
const B = rb.status === 0 ? JSON.parse(fs.readFileSync(path.join(tmpB, "parts.json"), "utf8")) : null;
check("parts: twin builds of one tree are identical but for the clock", !!A && !!B && strip(A) === strip(B));

if (A) {
  const t = derive(A);
  // 4. coldsnap rows: the file state follows the hashes
  const cs = t.parts.filter((p) => p.source === "coldsnap");
  check("parts: every coldsnap row's file state follows its three hashes", cs.length > 50 && cs.every((p) => p.mech.hashHead && (
    (p.mech.file === "absent" && !p.mech.hashTree) || (p.mech.file === "current" && p.mech.hashTree === p.mech.hashHead) ||
    (p.mech.file === "behind" && p.mech.hashTree === p.mech.hashOld && p.mech.hashTree !== p.mech.hashHead) || (p.mech.file === "differs" && p.mech.hashTree && p.mech.hashTree !== p.mech.hashHead && p.mech.hashTree !== p.mech.hashOld))));
  // 5. every state is one of the vocabulary, and the overall meter sums to the units not left behind
  const sum = (c) => BUCKETS.reduce((s, b) => s + c[b], 0);
  check("parts: every unit's state is in the vocabulary and every meter sums to what it counts",
    t.units.every((p) => STATES.includes(p.state)) && sum(t.overall) === t.units.filter((p) => p.plan !== "leave").length && t.frames.every((f) => sum(f.counts) === f.parts.length) && t.sources.every((s) => sum(s.counts) === s.parts.length));
  // 6. the phase documents' status words are all in the vocabulary the standing orders name
  const WORDS = ["PLANNED", "SERVED", "APPROVED", "DISPATCHED", "LANDED", "ACCEPTED", "RETURNED"];
  check("parts: every phase document's status word is one the standing orders name (" + t.phases.length + " documents)", t.phases.length > 0 && t.phases.every((p) => WORDS.includes(p.status)));
  // 7. every gate a part names is in the gate table; exercised never exceeds the surface
  const gateNames = new Set(Object.keys(JSON.parse(JSON.stringify(A.gates))).concat(readGateTable()));
  check("parts: every gate a part names is registered, and exercised exports never exceed the surface",
    t.parts.every((p) => !p.gate || gateNames.has(p.gate)) && t.parts.every((p) => !p.mech.exports || (p.mech.exports.exercised <= p.mech.exports.total && p.mech.exports.untested.length === p.mech.exports.total - p.mech.exports.exercised)));
  // 8. the views carry every unit: each authored part under By source, each unit with a claim under By frame, each in the matrix
  const R = renderAll(A);
  const authored = t.parts.filter((p) => p.source !== "coldsnap");
  const inSource = authored.every((p) => R.bySource.includes(`id="s-part-${p.id}"`)) && cs.every((p) => R.bySource.includes(`id="s-part-${p.id}"`));
  const inFrame = t.units.filter((p) => (p.serves || []).length || (p.closes || []).length).every((p) => R.byFrame.includes(`id="f-part-${p.id}"`));
  const inMatrix = t.units.filter((p) => p.plan !== "leave").every((p) => R.matrix.includes(`data-goto="${p.id}"`));
  check("parts: every part is drawn where it belongs: files under By source, units with a claim under By frame, units in the matrix", inSource && inFrame && inMatrix);
  // 9. the graph: every node is a unit or a rollup, every edge joins two nodes, and the ark's page reaches its game files
  const nodeIds = new Set(A.graph.nodes.map((n) => n.id)), unitIds = new Set(t.units.map((u) => u.id));
  const wired = t.parts.filter((p) => p.id.startsWith("ark-") && p.files && p.files.some((f) => f.startsWith("src/games/gravitys-ark/")));
  check("parts: every graph node is a unit, every edge joins two nodes, and the ark's game files are wired to the page", [...nodeIds].every((id) => unitIds.has(id)) && A.graph.edges.every((e) => nodeIds.has(e.from) && nodeIds.has(e.to)) && wired.length > 0 && wired.every((p) => p.mech.wired));
  // 10. the page embeds the table and the builders
  const html = fs.readFileSync(path.join(tmpA, "parts.html"), "utf8");
  check("parts: the page embeds the table it was built from and the builders that draw it", html.includes('"commit":"' + A.meta.commit + '"') && html.includes("function renderAll(") && !html.includes("/*__DATA__*/") && !html.includes("/*__VIEWS__*/"));
  // 11. the feedback path: the seed field takes the game's address, an image rides under the store's cap, and a return carries its finding
  const capLine = html.match(/const IMAGE_CAP = (\d+) \* 1024;/);
  check("parts: the page parses a seed out of the game's address, caps an image under the store's 256 KB, and returns with a finding through the same form",
    html.includes("function parseSeed(") && html.includes("[?&]seed=") && !!capLine && +capLine[1] * 1024 < 256 * 1024 && html.includes("async function shrink(") && (R.strip.includes('class="ret"') || t.ready.length === 0) && html.includes('verdict: "returned", finding: doc.text'));
  // 12. the shelf's decisions are rows in the picture, each on a frame
  const decisions = t.parts.filter((p) => p.plan === "decide" && p.source === "ark");
  check("parts: the shelf's open decisions stand in the picture as decision pending, each on a frame (" + decisions.length + ")", decisions.length >= 9 && decisions.every((p) => p.state === "decision pending" && (p.serves || []).length > 0));
  // 13. the seed export: one file, wired into the game page, a button in the fixed cluster and one on the card
  const seedFile = path.join(ROOT, "docs/gravitys-ark/seed.js"), pageHtml = path.join(ROOT, "docs/gravitys-ark/index.html"), pageMain = path.join(ROOT, "docs/gravitys-ark/main.js");
  const seedOk = fs.existsSync(seedFile) && /export function wireSeed\(/.test(fs.readFileSync(seedFile, "utf8")) && fs.readFileSync(pageMain, "utf8").includes('from "./seed.js"') && /id="seedB"/.test(fs.readFileSync(pageHtml, "utf8")) && /id="seedCard"/.test(fs.readFileSync(pageHtml, "utf8"));
  check("parts: the seed export is its own file, hooked into the game page, with a button in the fixed cluster and one on the card", seedOk);
}
function readGateTable() { const g = fs.readFileSync(path.join(ROOT, "scripts/gate.mjs"), "utf8"); return [...g.matchAll(/^\s*"([a-z0-9-]+)":\s*\[/gm)].map((m) => m[1]); }
fs.rmSync(tmpA, { recursive: true, force: true }); fs.rmSync(tmpB, { recursive: true, force: true });
console.log(`parts-test: ${pass} PASS / ${fail} FAIL`);
console.log(fail ? "parts-test FAIL" : "parts-test PASS");
process.exit(fail ? 1 : 0);
