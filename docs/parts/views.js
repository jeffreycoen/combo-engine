// COMBO-ENGINE — docs/parts/views.js: the parts page's pure builders. Takes the
// generated table and returns HTML strings; no window, no document. The page
// inlines this file and the parts gate runs it in node, so what the page shows
// and what the gate proves are the same functions.

export const STATES = ["not started", "planned", "served", "approved", "in progress", "ready for acceptance", "accepted", "returned", "left behind", "decision pending"];
export const BUCKET_OF = { "not started": "ghost", "planned": "paper", "served": "paper", "approved": "paper", "in progress": "progress", "ready for acceptance": "landed", "accepted": "accepted", "returned": "returned", "left behind": "ghost", "decision pending": "ghost" };
export const BUCKETS = ["accepted", "landed", "progress", "paper", "ghost", "returned"];
export const BUCKET_NAMES = { accepted: "accepted", landed: "landed", progress: "in progress", paper: "on paper", ghost: "not started", returned: "returned" };
const WORD_STATE = { PLANNED: "planned", SERVED: "served", APPROVED: "approved", DISPATCHED: "in progress", LANDED: "ready for acceptance", ACCEPTED: "accepted", RETURNED: "returned" };

export function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

// derive(table): every computed field the views read, added onto a copy of the table.
export function derive(table) {
  const t = JSON.parse(JSON.stringify(table));
  const phaseByNum = Object.fromEntries((t.phases || []).map((p) => [p.num, p]));
  const byId = Object.fromEntries(t.parts.map((p) => [p.id, p]));
  const stateOfPhase = (num, partId) => {
    const ph = phaseByNum[num];
    if (!ph) return null;
    const word = WORD_STATE[ph.status] || "planned";
    if (word !== "ready for acceptance") return word;
    const acc = (ph.acceptance || []).find((a) => a.part === partId);
    if (acc && acc.verdict === "accepted") return "accepted";
    if (acc && acc.verdict === "returned") return "returned";
    return "ready for acceptance";
  };
  t.rollups = t.rollups || [];
  for (const p of t.parts.concat(t.rollups)) {
    if (p.plan === "leave") p.state = "left behind";
    else if (p.plan === "decide") p.state = "decision pending";
    else {
      const num = p.phase || (p.phaseOf && byId[p.phaseOf] ? byId[p.phaseOf].phase : null);
      p.state = (num && stateOfPhase(num, p.id)) || "not started";
    }
    p.bucket = BUCKET_OF[p.state];
    const m = p.mech || {};
    p.mechBadges = [];
    if (p.source === "coldsnap") p.mechBadges.push(m.file === "differs" ? "changed here" : (m.file || "absent"));
    else if (p.files && p.files.length) p.mechBadges.push(m.present ? "present" : "absent");
    if (m.wired) p.mechBadges.push("wired");
    if (m.gate) p.mechBadges.push("gate " + m.gate.verdict + (m.gate.pass != null ? " " + m.gate.pass + "/" + (m.gate.pass + m.gate.fail) : ""));
    if (m.exports && m.exports.total) p.mechBadges.push("exercised " + m.exports.exercised + "/" + m.exports.total);
  }
  const count = (parts) => { const c = Object.fromEntries(BUCKETS.map((b) => [b, 0])); for (const p of parts) c[p.bucket]++; c.total = parts.length; return c; };
  // units: the authored parts plus coldsnap's groups as one row each; files stay under By source
  t.units = t.parts.filter((p) => p.source !== "coldsnap").concat(t.rollups);
  t.frames.forEach((f) => { f.parts = t.units.filter((p) => (p.serves || []).includes(f.id)); f.counts = count(f.parts); });
  t.gaps.forEach((g) => { g.parts = t.units.filter((p) => (p.closes || []).includes(g.id)); g.counts = count(g.parts); });
  const sources = [["coldsnap", "Coldsnap"], ["deadweight", "Deadweight"], ["ark", "The ark's own layer"]];
  t.sources = sources.map(([id, name]) => {
    const parts = t.parts.filter((p) => p.source === id);
    const groups = [];
    for (const p of parts) { let g = groups.find((x) => x.name === p.group); if (!g) { g = { name: p.group, parts: [] }; groups.push(g); } g.parts.push(p); }
    groups.forEach((g) => { g.counts = count(g.parts); });
    return { id, name, parts, groups, counts: count(parts) };
  });
  t.overall = count(t.units.filter((p) => p.plan !== "leave"));
  t.ready = (t.phases || []).map((ph) => ({ phase: ph, parts: t.units.filter((p) => p.state === "ready for acceptance" && (p.phase === ph.num || (p.phaseOf && byId[p.phaseOf] && byId[p.phaseOf].phase === ph.num))) })).filter((r) => r.parts.length);
  t.current = (t.phases || []).filter((ph) => ["SERVED", "APPROVED", "DISPATCHED"].includes(ph.status));
  return t;
}

// meter(counts): one stacked bar, six buckets in fixed order, a 2px gap between fills, the counts in text beside it.
export function meter(counts, label) {
  const total = counts.total || 0;
  const segs = BUCKETS.filter((b) => counts[b] > 0).map((b) => `<span class="seg seg-${b}" style="flex:${counts[b]}" title="${BUCKET_NAMES[b]} ${counts[b]}"></span>`).join("");
  const text = BUCKETS.filter((b) => counts[b] > 0).map((b) => `<span class="k k-${b}">${counts[b]} ${BUCKET_NAMES[b]}</span>`).join("");
  return `<div class="meter" role="img" aria-label="${esc(label || "")}: ${total} parts">${segs || '<span class="seg seg-empty" style="flex:1"></span>'}</div><div class="meter-text">${text || "no parts yet"}</div>`;
}

export function chip(state) { return `<span class="chip chip-${BUCKET_OF[state]}"><i></i>${esc(state)}</span>`; }

function frameNames(t, ids) { return (ids || []).map((id) => { const f = t.frames.find((x) => x.id === id); return f ? f.n + " " + f.name : id; }); }
function gapNames(t, ids) { return (ids || []).map((id) => { const g = t.gaps.find((x) => x.id === id); return g ? g.name : id; }); }

// evidence(p): what the generator measured, as a definition list. Nothing here is typed by hand.
export function evidence(t, p) {
  const m = p.mech || {}, rows = [];
  if (p.source === "coldsnap") {
    rows.push(["file", `<code>${esc(p.path)}</code> · ${p.lines} lines`]);
    rows.push(["at " + esc(t.coldsnap.commit), `<code>${esc(m.hashHead || "")}</code>`]);
    rows.push(["in the tree", m.hashTree ? `<code>${esc(m.hashTree)}</code>` + (m.file === "behind" ? " · identical to " + esc(t.coldsnap.treeCommit) : m.file === "current" ? " · identical to head" : " · changed in this tree, matches neither") : "absent"]);
  }
  if (p.isRollup) rows.push(["files", `${p.count} at ${esc(t.coldsnap.commit)}: ` + Object.entries(p.fileStates || {}).map(([k, v]) => `${v} ${esc(k)}`).join(", ")]);
  if (p.files && p.files.length && !p.isRollup) rows.push(["files", p.files.map((f) => `<code>${esc(f)}</code>` + (m.missing && m.missing.includes(f) ? " (missing)" : "")).join("<br>")]);
  if (p.demoFns && p.demoFns.length) rows.push(["in the demo", p.demoFns.map((f) => `${esc(f)}${m.demoLines && m.demoLines[f] ? " at line " + m.demoLines[f] : " (not found)"}`).join(", ")]);
  if (m.importedBy && m.importedBy.length) rows.push(["imported by", m.importedBy.map((f) => `<code>${esc(f)}</code>`).join(", ")]);
  if (m.imports && m.imports.length) rows.push(["imports", m.imports.map((f) => `<code>${esc(f)}</code>`).join(", ")]);
  if (m.gate) {
    const g = m.gate;
    rows.push(["gate", `<code>${esc(g.name)}</code> · ${esc(g.verdict)} · ${g.pass} PASS / ${g.fail} FAIL · ${g.seconds} s`]);
    if (g.seeds) rows.push(["seeds", `<code>${esc(g.seeds)}</code>`]);
    if (g.checks && g.checks.length) rows.push(["checks", `<ol class="checks">${g.checks.map((c) => `<li class="${c.startsWith("FAIL") ? "bad" : ""}">${esc(c)}</li>`).join("")}</ol>`]);
  }
  if (m.exports && m.exports.total) rows.push(["surface", `${m.exports.exercised} of ${m.exports.total} exports exercised by the gate` + (m.exports.untested.length ? `<br>untested: ${m.exports.untested.map(esc).join(", ")}` : "")]);
  if (p.phase) { const ph = (t.phases || []).find((x) => x.num === p.phase); rows.push(["phase", ph ? `${esc(ph.num)} ${esc(ph.name)} · ${esc(ph.line)}` : `${esc(p.phase)} · no phase document`]); }
  if (p.serves && p.serves.length) rows.push(["serves", frameNames(t, p.serves).map(esc).join(", ")]);
  if (p.closes && p.closes.length) rows.push(["closes", gapNames(t, p.closes).map(esc).join(", ")]);
  rows.push(["plan", esc(p.plan)]);
  return `<dl class="ev">${rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${v}</dd>`).join("")}</dl>`;
}

export function row(t, p, prefix) {
  const badges = (p.mechBadges || []).map((b) => `<span class="badge ${b.startsWith("gate FAIL") || b === "absent" ? "badge-bad" : ""}">${esc(b)}</span>`).join("");
  return `<details class="part" id="${esc(prefix || "s")}-part-${esc(p.id)}" data-part="${esc(p.id)}" data-state="${esc(p.state)}">
<summary><span class="name">${esc(p.name)}</span>${chip(p.state)}<span class="badges">${badges}</span><span class="does">${esc(p.does || "")}</span></summary>
<div class="body">${evidence(t, p)}
<form class="fb" data-part="${esc(p.id)}"><label>Feedback on <b>${esc(p.name)}</b></label>
<select name="kind">${(t.feedbackKinds || []).map((k) => `<option>${esc(k)}</option>`).join("")}</select>
<input name="seed" placeholder="seed, or paste the game's address">
<textarea name="text" rows="3" placeholder="what you saw, what you want" required></textarea>
<label class="img"><input type="file" name="image" accept="image/*"><span>Add a screenshot, kept under 180 KB</span></label>
<button type="submit">Send</button><span class="fb-status" aria-live="polite"></span></form></div></details>`;
}

function groupBlock(t, title, parts, counts, open, prefix) {
  return `<details class="group"${open ? " open" : ""}><summary><span class="gname">${esc(title)}</span><span class="gcount">${parts.length}</span>${meter(counts, title)}</summary><div class="rows">${parts.map((p) => row(t, p, prefix)).join("")}</div></details>`;
}

export function byFrame(t) {
  return t.frames.map((f) => {
    const bySrc = t.sources.map((s) => ({ s, parts: f.parts.filter((p) => p.source === s.id) })).filter((x) => x.parts.length);
    return `<section class="frame" id="frame-${esc(f.id)}"><h2><span class="fn">${f.n}</span> ${esc(f.name)}</h2><p class="see">${esc(f.see)}</p>${meter(f.counts, f.name)}
${bySrc.map((x) => groupBlock(t, x.s.name, x.parts, derive_count(x.parts), false, "f")).join("")}</section>`;
  }).join("") + `<section class="frame" id="frame-gaps"><h2><span class="fn">+</span> What the story still lacks</h2><p class="see">Built in neither game nor the night. A gap closes when a part that names it is accepted.</p>
${t.gaps.map((g) => groupBlock(t, g.name + " — " + g.what, g.parts, g.counts, false, "f")).join("")}</section>`;
}
function derive_count(parts) { const c = Object.fromEntries(BUCKETS.map((b) => [b, 0])); for (const p of parts) c[p.bucket]++; c.total = parts.length; return c; }

export function bySource(t) {
  return t.sources.map((s) => `<section class="frame" id="source-${esc(s.id)}"><h2>${esc(s.name)}</h2>${meter(s.counts, s.name)}
${s.groups.map((g) => groupBlock(t, g.name, g.parts, g.counts, false, "s")).join("")}</section>`).join("");
}

// graph(t): layered by depth, left to right: the spine, the modules, the game's own layer, the screens.
export function graph(t) {
  const LAYERS = [["spine", "the spine"], ["modules", "modules"], ["game", "the game's layer"], ["screens", "screens"]];
  const nodes = (t.graph && t.graph.nodes) || [], edges = (t.graph && t.graph.edges) || [];
  const cols = LAYERS.map(([id]) => nodes.filter((n) => n.layer === id));
  const rowH = 26, colW = 260, pad = 24, maxRows = Math.max(1, ...cols.map((c) => c.length));
  const W = pad * 2 + colW * LAYERS.length, H = pad * 2 + 30 + rowH * maxRows;
  const pos = {};
  cols.forEach((c, ci) => c.forEach((n, ri) => { pos[n.id] = { x: pad + ci * colW + 8, y: pad + 30 + ri * rowH }; }));
  const byId = Object.fromEntries(t.parts.concat(t.rollups || []).map((p) => [p.id, p]));
  const box = (n) => { const p = pos[n.id], part = byId[n.id] || {}; const st = part.bucket || "ghost"; const g = part.mech && part.mech.gate ? (part.mech.gate.verdict === "ok" ? "gate-green" : "gate-red") : "";
    return `<g class="node ${g}" data-part="${esc(n.id)}"><rect x="${p.x}" y="${p.y}" width="${colW - 40}" height="${rowH - 6}" rx="4" class="nb nb-${st}"/><text x="${p.x + 8}" y="${p.y + 14}" class="nt">${esc(n.name.length > 30 ? n.name.slice(0, 29) + "…" : n.name)}</text></g>`; };
  const line = (e) => { const a = pos[e.from], b = pos[e.to]; if (!a || !b) return ""; const x1 = a.x + colW - 40, y1 = a.y + (rowH - 6) / 2, x2 = b.x, y2 = b.y + (rowH - 6) / 2; const mx = (x1 + x2) / 2;
    return `<path d="M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}" class="edge"/>`; };
  const heads = LAYERS.map(([, name], ci) => `<text x="${pad + ci * colW + 8}" y="${pad + 12}" class="lh">${esc(name)}</text>`).join("");
  return `<div class="graph-wrap"><svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" class="graph" role="img" aria-label="module dependencies">${heads}${edges.map(line).join("")}${nodes.map(box).join("")}</svg></div>
<p class="legend">Fill is the process state. A green ring is a gate that ran green in this build; a red ring, red. An edge runs from the importer on the left to what it imports on the right.</p>`;
}

// matrix(t): parts down the side, frames and gaps across; a filled cell is a claim the part makes.
export function matrix(t) {
  const cols = t.frames.map((f) => ({ id: f.id, name: f.n + " " + f.name, kind: "frame" })).concat(t.gaps.map((g) => ({ id: g.id, name: g.name, kind: "gap" })));
  const parts = t.units.filter((p) => p.plan !== "leave");
  const head = `<tr><th class="ph">part</th>${cols.map((c) => `<th class="${c.kind}"><span>${esc(c.name)}</span></th>`).join("")}</tr>`;
  const body = parts.map((p) => `<tr><th scope="row"><a href="#s-part-${esc(p.id)}" data-goto="${esc(p.id)}">${esc(p.name)}</a> ${chip(p.state)}</th>${cols.map((c) => { const on = (c.kind === "frame" ? p.serves : p.closes) || []; return `<td class="${on.includes(c.id) ? "on on-" + p.bucket : ""}" title="${esc(p.name)} → ${esc(c.name)}">${on.includes(c.id) ? "●" : ""}</td>`; }).join("")}</tr>`).join("");
  const empties = cols.filter((c) => !parts.some((p) => ((c.kind === "frame" ? p.serves : p.closes) || []).includes(c.id))).map((c) => c.name);
  return `<div class="matrix-wrap"><table class="matrix">${head}${body}</table></div><p class="legend">An empty column is a frame or a gap nothing serves${empties.length ? ": " + empties.map(esc).join(", ") : ". None today."}</p>`;
}

export function strip(t) {
  if (!t.ready.length) return `<div class="strip empty">Nothing is waiting for acceptance.</div>`;
  return `<div class="strip"><h2>Ready for acceptance</h2>${t.ready.map((r) => `<details class="ready" data-phase="${esc(r.phase.num)}"><summary><b>${esc(r.phase.num)}</b> ${esc(r.phase.name)} · ${r.parts.length} part${r.parts.length > 1 ? "s" : ""}<span class="acts"><button class="accept-all" data-phase="${esc(r.phase.num)}">Accept all</button></span></summary>
<ul>${r.parts.map((p) => `<li data-part="${esc(p.id)}"><a href="#s-part-${esc(p.id)}" data-goto="${esc(p.id)}">${esc(p.name)}</a><span class="acts"><button class="accept" data-part="${esc(p.id)}">Accept</button><button class="return" data-part="${esc(p.id)}">Return</button></span><span class="verdict" aria-live="polite"></span>
<form class="ret" data-part="${esc(p.id)}" data-phase="${esc(r.phase.num)}" hidden><textarea name="text" rows="2" placeholder="the finding: what you saw at the page" required></textarea><input name="seed" placeholder="seed, or paste the game's address"><label class="img"><input type="file" name="image" accept="image/*"><span>Add a screenshot</span></label><span class="acts"><button type="submit" class="return">Return with this finding</button><button type="button" class="cancel">Cancel</button></span><span class="fb-status" aria-live="polite"></span></form></li>`).join("")}</ul></details>`).join("")}</div>`;
}

export function banner(t) {
  if (!t.current.length) return `<div class="banner quiet">No phase in flight.</div>`;
  return t.current.map((ph) => `<div class="banner"><b>Current phase</b> ${esc(ph.num)} ${esc(ph.name)} · ${esc(ph.status.toLowerCase())}</div>`).join("");
}

export function header(t) {
  return `<div class="stamp">built from <code>${esc(t.meta.commit)}</code> · ${esc(t.meta.builtAt)} · ${t.meta.gatesRun} gates run in ${t.meta.gateSeconds} s</div>${meter(t.overall, "all parts")}`;
}

export function renderAll(table) {
  const t = derive(table);
  return { t, header: header(t), banner: banner(t), strip: strip(t), byFrame: byFrame(t), bySource: bySource(t), graph: graph(t), matrix: matrix(t) };
}
