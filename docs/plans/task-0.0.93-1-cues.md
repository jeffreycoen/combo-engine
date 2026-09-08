# Task 0.0.93-1 — cues: musical cues as vocabulary

One job: lift the musical cues from the fleet demo into a module of plain data under the general parts order, phase B11. Write exactly the design below, run the gate, write the phase document, commit on your branch, report. You design nothing beyond this brief; anything it did not foresee stops the task and is reported as a nonconformity.

Model: Sonnet 5.

Where you work: the worktree at `/home/batman/combo-wt/cues`, branch `phase/0.0.93-cues`. You never touch `/home/batman/combo-engine` (the main tree). You never edit `scripts/gate.mjs`, `README.md`, `package.json`, `src/modules/registry/registry.js`, any other module, or any document of another phase. You never edit a demo file.

Required reading, in order, whole (confirm each with its line count at the top of your report):
1. This file.
2. `/home/batman/combo-engine/docs/plans/batch-general-1.md`, the sections "The generalization law", "The rules of the run", and "B11, cues".
3. `/home/batman/combo-engine/homeworld_fleet_command.jsx`, lines 51 to 151, and the single lines 1033, 1044, 1048, 1073, 1089, 1324, 1329, 1332, 1483, 1605 (the call sites). Read-only source material. Tone.js is the demo's sound library; none of it comes over.
4. `/home/batman/combo-wt/cues/src/modules/receipts/receipts.js`, whole, as the shape of a small data-and-lookup module.
5. `/home/batman/combo-wt/cues/docs/modules/module-pattern.md`.
6. `/home/batman/combo-wt/cues/docs/plans/phase-0.0.73-aim.md`, as the shape of a phase document.

## The design, fixed

New module `src/modules/cues/cues.js`, a SHAPED lift. The law carried: the twelve cues as data, each exactly the notes, durations, and offsets the demo's trigger methods play (lines 139 to 150), and the voices as data, each exactly the synth settings the demo builds (lines 60 to 136). The code is new: a lookup that turns a cue into timed note events for any sound engine. No sound library.

Exports:

- `export const CUES`, an object keyed by the demo's twelve method names: fire, missile, beamStart, beamStop, explodeSmall, explodeBig, click, alert, buildDone, researchDone, victoryFanfare, gameOver. Each is `{ voice, notes }` with `notes` a list of `{ note, dur, at }` in the demo's order: `note` a string, a list of strings for a chord, or null for a noise voice; `dur` the demo's duration string or null for a held note; `at` the demo's offset in seconds from the trigger. Exactly: fire: voice fire, one note null "16n" at 0. missile: voice missile, C5 "8n" at 0. beamStart: voice beam, A2, dur null, at 0, plus the field `hold: true`. beamStop: voice beam, no notes, plus `release: true`. explodeSmall: voice explode, null "8n" at 0. explodeBig: voice bigExplode, null "4n" at 0. click: voice click, C6 "32n" at 0. alert: voice alert, E5 "16n" at 0, A5 "16n" at 0.15, E5 "16n" at 0.3. buildDone: voice chime, [E5, G5] "16n" at 0, [G5, B5] "16n" at 0.12, plus the field `called: false` (defined in the demo, never called). researchDone: voice research, [C5, E5, G5] "4n" at 0, [E5, G5, B5] "4n" at 0.3. victoryFanfare: voice victory, [C4, E4, G4] "2n" at 0, [E4, G4, B4] "2n" at 0.4, [G4, B4, D5] "2n" at 0.8, [C4, E4, G4, C5] "1n" at 1.3. gameOver: voice alert, A3 "8n" at 0, E3 "4n" at 0.3, plus the field `releaseAmbient: true`.
- `export const VOICES`, an object keyed fire, missile, beam, explode, bigExplode, click, alert, chime, research, victory, ambient, each the demo's settings as plain data: `kind` (noise, synth, poly, fm), `oscillator` or `noise` type, `envelope` as `{ attack, decay, sustain, release }`, `modulation` and `modulationEnvelope` for fm, `modulationIndex` and `harmonicity` for fm, `filter` as `{ type, hz }` when the demo has one, `reverb` seconds when the demo has one, `gainDb`; ambient also carries `startNote: "C1"`. Plus `export const MASTER_DB = -8;`
- `export const CUE_GATES = { fire: 0.3, explode: 0.4 };` the demo's call-site chances (lines 1044 and 1048), data for the caller's own roll.
- `export function cueFor(event, t0 = 0, table = CUES)`: returns a list of `{ voice, note, dur, at }` with `at` equal to t0 plus the cue's offset, in the cue's order, and copies `hold`, `release`, `releaseAmbient` onto the first entry (or onto a single entry with no note for beamStop) when the cue carries them; an unknown event returns an empty list.
- `export const CUES_CONTRACT` as a plain field description and `export function checkCues(table)` returning a list of plain problem strings, empty when clean, every problem in one pass: not an object gives the single problem `cues: not an object`; then per cue: `cues.<name>.voice: string required`; `cues.<name>.notes: array required`; per note i: `cues.<name>.notes.<i>.note: string, list of strings, or null required`; `.dur: string or null required`; `.at: number >= 0 required`; and `cues.<name>.notes: offsets must not run backward` when any at is under the one before it.

The module header states the lift: MODULE: cues, the box it serves, the demo lines, the law carried as data, what is new, and that the coldsnap sound engine hookup is a later ruling.

Gate `scripts/cues-test.mjs`, new. A rolled seed printed as `seeds {"cues":<n>}`, read from `process.env.SEED` when set, else rolled, with the small seeded stream the other gates use. Checks, in this order and with these names:

1. `cues: every cue's notes, durations, and offsets are the demo's own` — the gate carries the twelve cues' notes, durations, and offsets written out as a reference table (the demo's lines 139 to 150 restated as data, the same shape as CUES without the extra fields) and asserts, cue by cue, JSON.stringify of CUES[name].notes equals the reference's, and the voice names match.
2. `cues: a rolled t0 shifts every note by t0 and offsets never run backward` — 100 rolls of t0 in 0 to 100 and a rolled cue name: every entry's at equals t0 plus the table's offset within 1e-12, and the ats are non-decreasing.
3. `cues: an unknown event gives an empty list, and a rolled table is read through` — cueFor("nothing") is empty; a rolled name with a table `{ [name]: { voice: "x", notes: [{ note: "C4", dur: "8n", at: 0.2 }] } }` gives one entry at t0 plus 0.2 with voice x.
4. `cues: the voices table names every voice the cues use, and the master and the two call-site gates are the demo's` — every CUES[name].voice is a key of VOICES; MASTER_DB is -8; CUE_GATES.fire is 0.3 and CUE_GATES.explode is 0.4; VOICES.ambient.startNote is C1.
5. `cues: the held beam and the ambient release ride the entries` — cueFor("beamStart") has one entry with hold true and dur null; cueFor("beamStop") has one entry with release true and no note; cueFor("gameOver") has releaseAmbient true on its first entry.
6. `cues: the contract counts every problem` — `checkCues({ a: { voice: 1, notes: "x" }, b: { voice: "v", notes: [{ note: 5, dur: 2, at: -1 }] } })` returns exactly 5 problems; `checkCues(CUES)` returns 0; `checkCues(null)` returns 1; `checkCues({ c: { voice: "v", notes: [{ note: "C4", dur: "8n", at: 1 }, { note: "C4", dur: "8n", at: 0.5 }] } })` returns 1 (the backward offset).
7. `cues: the module imports only from its own folder or a sibling module` — read the module file with fs and assert every `import ... from "<x>"` specifier matches `^\.\.\/[a-z0-9-]+\/` or `^\.\/`; cues has no imports, so the check passes on an empty list.

The count line is `cues-test: 7 PASS / 0 FAIL`, then `cues-test PASS`, exit 0. Any FAIL stops the task.

## Steps

1. Read the list above. Confirm.
2. Write the module.
3. Write the gate.
4. Run, from the worktree root, twice: `node scripts/cues-test.mjs`. Both runs must print the seeds line, 7 PASS lines, the count line, and the verdict, exit 0. Paste both outputs whole in the report.
5. Write `docs/plans/phase-0.0.93-cues.md` in the worktree, this shape:

```
# Phase 0.0.93 — cues: musical cues as vocabulary

Status: PLANNED. Built in worktree, awaiting the landing.
<!-- At landing this line becomes: Status: LANDED, commit `<hash>`, <date>. Gate: 7 PASS / 0 FAIL; bracket unmoved. -->

Serves the checklist box "Musical cues folded into the sound engine's vocabulary". Source: the fleet demo, read-only, lines 51 to 151 and the ten call sites. <One more sentence in plain words: what the module holds and what it does not.>

## Lift kind

SHAPED — the law carried as data: twelve cues, each note, duration, and offset the demo plays, and the eleven voices' settings. New: the lookup that turns a cue into timed note events. No sound library. Playing the cues through the coldsnap sound engine is a later ruling.

## Rulings inside this plan

- The buildDone cue is carried and marked never called, as the demo has it.
- Registry seam: consume. The registry and gate-table lines are the landing's.

## Acceptance arithmetic for the phase

Every number below is the run's output (rolled seeds <the two seeds>).

- `node scripts/cues-test.mjs` prints a seeds line, 7 PASS lines, then `cues-test: 7 PASS / 0 FAIL`, then `cues-test PASS`, exit 0.
- Load-bearing knowns from the demo's own lines: every note and offset in the reference table; master -8 dB; the call-site chances 0.3 and 0.4.
- Bracket, run at the landing: cues.

## Tasks

- 0.0.93-1 — the lift. → `task-0.0.93-1-cues.md`
```

6. Commit on your branch, all three files, with this message exactly:

```
phase 0.0.93 — cues: musical cues as vocabulary

Checklist: musical cues folded into the sound engine's vocabulary. Twelve cues and eleven voices carried from the fleet demo as plain data, with a lookup that yields timed note events; no sound library. Gate 7 PASS / 0 FAIL at rolled seeds.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01QSq3kZC3Bk9SC5RwnqYUfs
```

Do not push. Do not touch main.

## Rules

- No sound library. No timers. Rolled seeds, printed. No literal that is one seed's own output; the demo's own notes and offsets are known numbers, not seed outputs.
- Never edit a demo file, the gate table, the README, the package version, the registry table, another module, or another phase's documents.

## Report

Read-confirmation first (each file, its line count). One line of outcome. Then bullets: both gate outputs whole; the diff summary as files and line counts (`git diff --stat` against main); the commit hash on your branch; every nonconformity as its own labeled bullet. Fixture seeds: the two rolled seeds; no seed is special.

## The report's gate lines

- `node scripts/cues-test.mjs`: seeds 833551707 and 15710206; 7 PASS lines, `cues-test: 7 PASS / 0 FAIL`, `cues-test PASS`, exit 0, twice.
- Bracket at the landing: cues, receipts, registry, every tail PASS. The gate-table and registry lines are the landing's.
- Branch commit 873a850 on phase/0.0.93-cues, landed by squash into main.
- Nonconformities the agent named: the beam-stop entry carries note null and dur null, the brief having said "no note" without the literal; the contract's field wording follows the receipts module's, the brief having said "a plain field description" without the words. Neither moved a check or an option.
