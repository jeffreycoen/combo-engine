---
name: extract-module
description: Use when extracting a system from a demo into src/modules/ — the proven phase workflow: scope, plan from templates, check, serve for review, dispatch, land with record close.
---

# Extract a module

The workflow that landed phases 0.2–0.4 (market, builder, ledger). Follow it in order; the owner's word decides at every step marked DECISION.

## 1. Scope with the owner

Name the organ, its source file and line range, and its lift kind:
- **VERBATIM** — files move byte-identical; acceptance is a hash inventory.
- **VERBATIM MATH** — formulas copied exactly; a short numbered substitution table (globals to options, module state to arguments) and nothing else may differ.
- **SHAPED** — the demo's law carried, the code new; say plainly what is law and what is new.

DECISION: the owner approves scope before anything is written.

## 2. Check the plan's code

Nothing runs. Every code block in the plan gets a syntax pass in the session scratchpad. Every source line number, export name, key name, field, and anchor is grepped against the live tree and the checkout it reads. Acceptance numbers come from the source and the record: a verbatim file's hash is computed from the checkout; a gate's count is the count last recorded in the parts table. The agent's run at landing proves them; a moved number is a finding.

## 3. Write the plan from the templates

- Phase document from `templates/phase.md` — status PLANNED, lift kind, source anchors, acceptance arithmetic (from the source and the record), task index.
- Task document from `templates/task.md` — full file contents embedded byte-for-byte, atomic steps, failing asserts first, prior-gate brackets on both ends, the record-close step, the report format.

File naming: `docs/plans/phase-0.0.N-<name>.md`, `docs/plans/task-0.0.N-M-<name>.md`. Phases bump the third part, sequential, never skipped; tasks are -M suffixes.

## 4. Serve for review

Serve the phase document and the task document ALONE, as rendered files, stating the checks: syntax passed, anchors grepped, numbers sourced.

DECISION: the owner's review decides the dispatch. Any amendment is re-served before dispatch.

## 5. Dispatch

One Sonnet 5 agent, one task, working tree. The brief: the two plan files as required reading, read-confirmation opening the report, execute steps exactly, stop on any deviated number and report it as a labeled nonconformity, never touch a demo file or the coldsnap tree. Commit and push only when every number matches.

## 6. Land and close

The task's final steps flip the records in the landing itself: phase status line to LANDED with commit and gate numbers, and the earned README checklist boxes. Report the landing: one line of outcome, gate lines verbatim, prior-gate tails, commit hash, push result, fixture seeds. Stop; the owner's word rules the next extraction.

## Invariants (also law in CLAUDE.md)

- Demos are read-only source material, cited by line.
- Prior gates bracket every task; a moved number is a finding, not a fix.
- New gate registered in `scripts/gate.mjs`; the module follows `docs/modules/module-pattern.md`.
- Numbers ratify everything; judgment ratifies nothing.
