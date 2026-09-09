# Phase 0.0.112 — the parts page

Status: SERVED. Served for review on 2026-09-09; no task dispatched.
<!-- The status word is one of PLANNED, SERVED, APPROVED, DISPATCHED, LANDED, ACCEPTED, RETURNED, moved by the plan-writer at each step; the parts page reads it. At landing this line becomes: Status: LANDED, commit `<hash>`, <date>. Gate: 14 PASS / 0 FAIL; manifest 3 PASS / 0 FAIL with its two new roots. Acceptance is recorded per part under a heading "## Acceptance" as "- <part id>: accepted" or "- <part id>: returned, <finding>", on the owner's word. -->

The first phase of the order that builds GRAVITY'S ARK from both games whole. Before any module moves, the page that tracks every module: a generator that builds one table from the record, a page that draws it four ways, and a store the owner writes feedback and verdicts into. With it, the seed export on every screen of the game page, so a finding starts as one paste. The table lists every coldsnap source file at commit 111b9cb against the tree, every deadweight system lifted or not, the ark's own layer, and the story's gaps, with the evidence measured for each: hashes, exports, imports, gate runs with their seeds, and the phase document's status word. Every later landing regenerates the table and republishes the page, by the standing order added on 2026-09-09.

## Lift kind

No lift. New tooling, plain files, no dependency but the tree, the coldsnap checkout, and the gates already registered. Nothing on the page is typed by hand: the authored source names the parts and what they serve; the generator measures the rest.

## Rulings inside this plan

- Two status fields, never one. The mechanical state is measured: absent, present, changed here, behind, current, wired, gate green, gate red, exports exercised. The process state is read from the phase document's status line and nothing else: not started, planned, served, approved, in progress, ready for acceptance, accepted, returned. Not started, ready for acceptance, and the current phase are derived, never stored.
- Acceptance is per part. A landed part is ready for acceptance until the owner's verdict. Verdicts arrive in the store; the orchestrator stamps them under an Acceptance heading in the phase document with a small commit; the page then shows them. A phase reads accepted when every part in it is accepted.
- The page runs where the store runs. Opened elsewhere it renders whole and keeps feedback on the device as unsent drafts, sent when it next opens where the store answers.
- The manifest tool gains two roots, the ark page's folder and the parts folder, so the wiring of the game's own page is on the map. Its three checks are unchanged.
- Coldsnap's 84 files roll up to their groups in the frame view, the matrix, and the graph; the files stand one per row under By source. The file state has a fourth value, changed here: 19 depot files in this tree match neither coldsnap commit, because the housekeeping phases moved their code into modules. The spine refresh will read that column.
- Every gate runs in every build, about four minutes. The page shows each gate's seeds line as printed; three early gates print none and the page says so.
- The page is one file by necessity: a published page loads no local script files. Its builders live in their own file and are inlined at build, so the page and the gate run the same functions.
- A return carries its finding. Return opens the row's own form: the finding, the seed, a screenshot; one press writes the verdict and the feedback entry together. Accept stays one press.
- The seed field takes a bare number or the game's whole address and reads the number out of it.
- A screenshot rides inside its entry, shrunk in the browser to under 180 KB, since the store holds documents to 256 KB and nothing else. What will not fit is sent in the session.
- The shelf's nine open decisions and three proposed mechanisms stand in the picture as rows, decision pending or not started, each on the frames they touch, so the picture is whole before anything is ruled.
- The seed export is its own file in the game's folder: a SEED button in the fixed cluster, visible in space and in the hold, and a COPY SEED button on the card; both copy the page's address with the seed and say so in the log, with a prompt as the fallback when the clipboard is refused. The main file takes one import and one call.

## The walk

Phone: one column, groups collapsed, tabs sticky at the top. Desktop: the same at 1,100 px with wider forms. Both themes: deadweight's light palette, the ark's dark palette.

- **The header.** The title, the build stamp (commit, time, gates run, seconds) from `table.meta`, and the overall stacked bar from `derive().overall`: accepted, landed, in progress, on paper, not started, returned, in that order, with the counts in text beside it.
- **The banner.** The current phase, from any phase document whose status word is SERVED, APPROVED, or DISPATCHED; otherwise "No phase in flight."
- **Ready for acceptance.** Every landed part not yet accepted, grouped by phase, each with Accept and Return, and Accept all per phase. Accept writes `{part, phase, verdict: "accepted", t, build}` to the `acceptance` collection. Return opens the row's return form: the finding, the seed or the game's address, a screenshot; Return with this finding writes the feedback entry with kind returned and the verdict `{verdict: "returned", finding, seed}` together. The row then shows the verdict, awaiting the stamp, from the store's own snapshot, so a press is seen to land.
- **By frame.** The nine frames with their one-line "what we see", each with its stacked bar, and under each the parts serving it grouped by source. A tenth section lists the sixteen gaps, each with the parts that name it. A part opens to its evidence and its feedback box.
- **By source.** Coldsnap by group, file by file with the file state; deadweight, lifted and not; the ark's own layer, keep, retire, split, new, screens, tooling.
- **Dependencies.** A layered drawing, left to right: the spine, the modules, the game's layer, the screens. A node's fill is its process state; a green or red ring is its gate's verdict in this build; an edge runs from importer to imported, from the manifest tool. Tap a node to open its row.
- **Matrix.** Units down the side, the nine frames and sixteen gaps across; a filled cell is a claim the part makes, colored by its state. The legend names any empty column.
- **A part's evidence.** For a coldsnap file: the path, its length, its hash at head, its hash in the tree, and which commit it matches. For a module: its files, who imports it, what it imports, its gate's name, verdict, counts, seconds, seeds line, and every check's name, the exports exercised and the untested ones, the phase document's status line, the frames it serves, the gaps it closes, and its plan.
- **Feedback.** On every row and once at the bottom: a kind (wrong status, not wired, missing part, priority, playtest finding, a number, a word, a decision), a seed field that takes a number or the game's address, the text, and a screenshot. Send shrinks the image under 180 KB and writes `{part, kind, seed, text, image, t, build}` to the `feedback` collection and says Sent. Without the store it says the store is off in this view and keeps the entry on the device.
- **Sent from this page.** The last entries in both collections, newest first, live, each screenshot as a thumbnail.
- **The game page, every screen.** SEED in the fixed cluster beside the zoom buttons, in space and in the hold; COPY SEED on the card. A press copies the address with the seed to the clipboard and writes "seed N copied" to the log pane; if the clipboard is refused, a prompt shows the address to copy.

## Acceptance arithmetic for the phase

Every number below is the run's output on a detached worktree of commit cbb679e with this plan's files applied.

- `node scripts/gate.mjs parts` prints `seeds {} — the tree is the fixture`, 14 PASS lines, then `parts-test: 14 PASS / 0 FAIL`, then `parts-test PASS`, exit 0.
- `node scripts/gate.mjs manifest` with the two new roots prints 3 PASS lines, then `manifest-test: 3 PASS / 0 FAIL`, then `manifest-test PASS`; the map grows from 222 edges to 235, the ark page's own imports.
- `node scripts/parts.mjs --gates all` prints one line per gate and ends: `parts: 148 rows (84 coldsnap files, 64 authored), 105 phase documents, 236 import edges, 49 gates in 255.5 s, build 256.5 s` then `wrote docs/parts/parts.json (227424 bytes) and parts.html (226686 bytes)`. The same build before the amendments ran in 191.8 s on an idle machine; this one ran beside the rehearsal. Eight gates print no seeds line and the page says so on their rows: combat, accuracy, market, ledger, tape, orders, steering, old-master.
- The page is published from the built `docs/parts/parts.html` with the store declared; a document written to the store from the session was read back from the session in the trial. The owner's press of Send at the page is the acceptance of the form itself.
- Bracket, run at the landing: manifest, parts.
- The page's fixed address: https://claude.ai/code/artifact/11f3fe5e-d389-4fad-aa52-2dd8955a8df5 . The trial build is published there now, private, with the store declared. After the landing the orchestrator republishes the built `docs/parts/parts.html` to that address, from any session, by passing it as the url; every later landing does the same. One trial document, id `trial-roundtrip` in the `feedback` collection, is deleted at the landing.

## Tasks

- 0.0.112-1 — the parts page. → `task-0.0.112-1-parts-page.md`

Suggested model: Sonnet 5 — every file's full content is in the plan; the task writes, runs, and commits.
