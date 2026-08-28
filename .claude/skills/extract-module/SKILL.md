---
name: extract-module
description: Use when extracting a system from a demo into src/modules/ — the proven phase workflow: trial first, plan from templates, serve for review, dispatch, land with record close.
---

# Extract a module

The workflow that landed phases 0.2–0.4 (market, builder, ledger). Follow it in order; the owner's word rules at every gate marked RULING.

## 1. Scope with the owner

Name the organ, its source file and line range, and its lift kind:
- **VERBATIM** — files move byte-identical; acceptance is a hash inventory.
- **VERBATIM MATH** — formulas copied exactly; a short numbered substitution table (globals to options, module state to arguments) and nothing else may differ.
- **SHAPED** — the demo's law carried, the code new; say plainly what is law and what is new.

RULING: the owner approves scope before anything is written.

## 2. Build the trial

In the session scratchpad (never the repo), assemble the exact module file and the exact gate script, and RUN them. Iterate here until green. Every acceptance number in the plan must be an output of this run — never a prediction. Anchor claims (source line numbers, export names, known values from the demo's own self-tests) are grepped against the live tree now.

## 3. Write the plan from the templates

- Phase document from `templates/phase.md` — status PLANNED, lift kind, source anchors, acceptance arithmetic (the trial's outputs), task index.
- Task document from `templates/task.md` — full file contents embedded byte-for-byte from the trial, atomic steps, failing asserts first, prior-gate brackets on both ends, the record-close step, the report format.

File naming: `docs/plans/phase-0.0.N-<name>.md`, `docs/plans/task-0.0.N-M-<name>.md`. Phases bump the third part, sequential, never skipped; tasks are -M suffixes.

## 4. Rehearse, then serve for review

Before serving, REHEARSE the plan against its own text: extract the task document's shell blocks and run the file-producing steps in a fresh scratch directory; every hash check must print OK from the rehearsal alone. This has caught real plan defects twice (a truncated heredoc in 0.0.8, proven by a FAILED hash). Then serve the phase document and the task document ALONE, as rendered files, stating the pre-serve checks: trial green, anchors grepped, numbers are outputs, rehearsal passed.

RULING: the owner's review rules the dispatch. Any amendment is re-served before dispatch.

## 5. Dispatch

One Sonnet 5 agent, one task, working tree. The brief: the two plan files as required reading, read-confirmation opening the report, execute steps exactly, stop on any deviated number and report it as a labeled nonconformity, never touch a demo file or the coldsnap tree. Commit and push only when every number matches.

## 6. Land and close

The task's final steps flip the records in the landing itself: phase status line to LANDED with commit and gate numbers, and the earned README checklist boxes. Report the landing: one line of outcome, gate lines verbatim, prior-gate tails, commit hash, push result, fixture seeds. Stop; the owner's word rules the next extraction.

## Invariants (also law in CLAUDE.md)

- Demos are read-only source material, cited by line.
- Prior gates bracket every task; a moved number is a finding, not a fix.
- New gate registered in `scripts/gate.mjs`; the module follows `docs/modules/module-pattern.md`.
- Numbers ratify everything; judgment ratifies nothing.
