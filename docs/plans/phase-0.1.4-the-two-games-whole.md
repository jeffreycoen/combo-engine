# Phase 0.1.4 — the two games whole

Status: DISPATCHED. Task 1 dispatched.
<!-- The status word is one of PLANNED, SERVED, APPROVED, DISPATCHED, LANDED, ACCEPTED, RETURNED, moved by the plan-writer at each step; the parts page reads it. The phase lands when its last task lands; each task's row below records its own landing. At landing this line becomes: Status: LANDED, commit `<hash>`, <date>. Acceptance is recorded per part under a heading "## Acceptance" as "- <part id>: accepted" or "- <part id>: returned, <finding>", on the owner's word. -->

The owner's direction after phase 0.1.3: all of coldsnap's functionality coupled with all of deadweight's, small tweaks to each, and a bridge between them; nothing rebuilt. Coldsnap's game is its own page, the war page with its start screen, its draft, selection and orders, the build menu with its green zone, the cards, the mech's piloting and readout, the sound board. Deadweight's game is the one file in this folder, its hangar, flight, stations, tramps, pirates, crates, contracts, missiles, and grapple. Both come over whole and are served as they are. The ark is the bridge between them and the tweaks inside them. The ark's own screens and its own space and ground layer, built new in batch-ark-1 and phases 0.1.1 to 0.1.3, are set aside.

## Lift kind

VERBATIM for both pages: coldsnap's 36 page files at their own paths, deadweight's one file, each by hash. VERBATIM MATH for coldsnap's page shell and page maker's setting, four substitutions and only those, listed in task 1. SHAPED for the bridge. Every tweak is a listed difference inside the page it touches, one per plan.

## Decisions inside this plan

- Coldsnap's page comes over whole: its 36 page files at the checkout's own paths, copied by hash from the checkout at `111b9cb`, read only; its shell and its page maker's setting with four substitutions; built here by its own page maker into `docs/coldsnap/` and served at https://jeffreycoen.github.io/combo-engine/docs/coldsnap/. It runs on this repository's copy of its engine, with the listed differences the record carries.
- Deadweight's page comes over whole: `docs/deadweight/index.html`, the demo file byte for byte, served at https://jeffreycoen.github.io/combo-engine/docs/deadweight/. The rule that demos are never committed yields to the owner's word: the demo is the game.
- The bridge: land on a world in deadweight's space and coldsnap's war opens with the ship's modules; TAKE OFF in coldsnap's war and deadweight's space returns with the purse and the modules as they stand. The handoff is small and its own task, written after both pages have landed and the owner has played them.
- The tweaks, each a listed difference inside one page, planned one at a time after the bridge from the owner's playtest: the hull as bodies at the crash, her and her look, the mech bay and the walker, the ship's flag and the objective, the scrap seam, the defences left behind, the crash's gouge. None before the bridge.
- The ark's own screens under `docs/gravitys-ark/` and its own layer under `src/games/gravitys-ark/` stay in the tree, set aside; the parts page marks them so when the bridge lands, and the entry page points at deadweight's page then.

## Tasks

- 0.1.4-1 — coldsnap's page whole: the 36 files, the shell, the page maker, the build into `docs/coldsnap/`, a gate over it. DISPATCHED. → `task-0.1.4-1-coldsnaps-page-whole.md`
- 0.1.4-2 — deadweight's page whole: `docs/deadweight/index.html` by hash, the gate extended. Planned after task 1 lands.
- 0.1.4-3 — the bridge: land and TAKE OFF between the two pages. Planned after task 2 lands and the owner has played both.
- 0.1.4-4 and on — the tweaks, one per task, on the owner's word.

Suggested model: Sonnet 5 — every file and every line is in the plan; nothing is designed.

## The walk, task 1

Phone and desktop, coldsnap's own.

- **The address** https://jeffreycoen.github.io/combo-engine/docs/coldsnap/ opens coldsnap's start screen, then every mode as coldsnap has it: the war with its draft, its controls, its cards, its mech piloting; the tower defense; the mech range; the demos; the sound board and the road ahead by their own flags in the address.
- **Nothing of the ark** is on that page. The ark's own page at `docs/gravitys-ark/` stands as it was until the bridge.

## Acceptance arithmetic, task 1

- The 36 copied files and the two shell files print OK at their hashes.
- `npx vite build` exits 0 and writes `docs/coldsnap/index.html` and `docs/coldsnap/assets/`.
- `node scripts/gate.mjs pages` prints 3 PASS lines, then `pages-test: 3 PASS / 0 FAIL`, then `pages-test PASS`.
- The parts build names 51 gates and every verdict is ok; its coldsnap file count rises from 84 to 120.
