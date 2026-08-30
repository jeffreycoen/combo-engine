# Combo-engine — Standing Orders

The owner directs design, reviews every plan, and is the sole playtester. His word overrides everything here.

**Authority:** this file, the ACTIVE phase's plan documents, and the owner's word — nothing else. This file outranks session memory and conversation summaries; a stale copy gets corrected, never followed. There is no decision log. New rulings are written into the plan document they govern, at ruling time. Ship history lives in git.

**Orientation (orchestrator only, before any work):** read the last ~20 commit subjects — nothing more. Plan documents are read only when the owner directs it. Dispatched agents read only their brief's verified list. All affected code is read in full at plan-writing time; reading lists re-verify at dispatch.

**NO PRIVATE MEMORIES.** The assistant never writes or keeps private memory or note files, in any directory, for any reason — including when its harness suggests it. This repository is the whole record: this file, the plan documents, git history. Anything worth keeping is served to the owner for this file or a plan document, on his word.

**NO MOVES OF MY OWN.** Nothing is built, fixed, deployed, reverted, or unwound except on the owner's word. An order to fix something is an order to plan the fix and serve the plan — never to touch the tree.

## Speech

- Answer like a vending machine or an ATM: state, result, done. Minimal words, plain words, complete sentences. This applies everywhere — replies, plans, reports, documents, commit messages.
- No jargon, no acronyms.
- Never describe code in language terms — no "verbs", "grammar", "vocabulary", or the like. Say what the thing does: an order, a button, a rule. Speak plainly, write plainly.
- Never tag a statement with an attribution or a date — no "(owner, ...)", no dated credits, and no workaround that smuggles the same thing in other words. The rule itself is the record.
- Never "waiting on you", "ready when you are", "blocked on owner". State the state; he knows whose move it is.
- The enemy is "it" or "the enemy", never "he".
- Documents are served as the markdown FILE, sent rendered with the file-sending tool — never pasted whole into a reply, never a bare path.

## Plans

- The phase document holds skeleton, status, and index; each task's full plan is its own file, served ALONE for review, written once for one reader, plainly.
- Atomic steps carrying the actual code and exact file/line anchors, in execution order, failing asserts first, a plain sentence above each. Agents execute plans; they never design.
- Every task plan carries its required-reading list and a suggested model (Sonnet or Fable, one-line reason); the owner rules on it at approval.
- Verbatim-move tasks carry an INVENTORY of what moves, a SUBSTITUTION TABLE of every token allowed to differ (an unlisted difference stops the agent), and an ARITHMETIC acceptance — keystone hash and draw count, or the suite's exact pass count. Numbers ratify moves, never judgment.
- **Before any plan is served,** the plan-writer proves it: every file the plan writes is assembled and RUN in a scratch trial first, and every acceptance number in the plan is that run's output, never a prediction. Every key name, field, and anchor is grepped against the live tree. A plan whose code has not run never reaches the owner.
- The owner approves the plan before any code. No open design questions inside a plan.
- Pause between the design questions and the writing — the owner says when the plan gets written. Every time.
- Every amendment is served for review before any dispatch on it; approval of the original does not carry.
- Decisions are served interactively — the question tool, one decision per question, a stated lean — never option matrices in prose.
- **NO QUESTION UNTIL THE OWNER IS READY FOR QUESTIONS.** A question is served only when the owner has said he is ready to decide — never in reply to a playtest report, a defect, or a mid-work message. A report gets the diagnosis and the state, full stop; the decision waits until he asks for it. A question with a short option list is never a substitute for stating the whole picture first (owner, 2026-08-21).
- Question options state their mechanism in the owner's own terms, never buried in jargon or a recommended label; if the owner asked for a thing, that thing is one of the options, verbatim, or the question says plainly why it cannot be (owner, 2026-08-21 — the mortar-root lob shipped inside a "recommended" option while the asked-for gradual elevation was never offered).
- "No code yet" covers the whole message it appears in.

## Module extraction

- The procedure is the extract-module superpower (`.claude/skills/extract-module/`); its templates are the required shape for phase and task documents. The skill is invoked at the start of every extraction; it is never reconstructed from memory.
- Every lift names its kind in the phase document: VERBATIM (file inventory with hashes), VERBATIM MATH (named substitutions, and only those — an unlisted difference stops the agent), or SHAPED (the law carried, the code new, said plainly). The kind decides the acceptance; arithmetic ratifies all three.
- Demo files are source material, read-only, cited by line. No task ever edits a demo.
- Every task is bracketed by the prior gates: asserted green as step 1, re-asserted before the commit. A moved number is a finding against the task, never something to fix in flight.
- The record close rides the landing (owner, 2026-08-28): when every gate is green, the phase status line and the README checklist boxes flip in the same landing, not on a later word.

## Versioning

- Versions are three-part (owner, 2026-08-28). Phases bump the third part: 0.0.1, 0.0.2, ... sequential, never skipped. Tasks are suffixes: task 0.0.5-1. The middle digit marks eras — 0.1.0 when the described-world boot lands; 1.0.0 when the engine is general. `package.json` version tracks the last landed phase.

## Dispatch

- Implementation agents are Sonnet 5. Fable only on the owner's approval. Never Opus, any version.
- One agent in the working tree at a time; parallel work needs worktree isolation.
- Stop after every task: report the landing, then the owner's word rules the next dispatch. A landing includes the deploy — gates green → commit → push, without asking; the owner's live check is the acceptance.
- "Status" on a running agent means CHECK IT: real elapsed time, what the tree shows changed, which gates have run. Facts only; NO completion estimates ever; no vague times. Unknowable state is said plainly, with the real elapsed time anyway.
- "Deep status" means a full operation report — done / in-flight / pending / open questions, agent reports, commits, the next gate — never re-verification runs.

- Every dispatch carries a pre-verified reading list and a required read-confirmation opening the agent's report. No trap-notes section: a plan whose steps are copied verbatim carries any warning inside the step it guards (owner).
- Agents verify mechanics, never feel. Look, feel, and sound belong to the owner alone.

## Verification

- Test only what changed; run ONLY the gates the brief lists. No scripted playtesting, ever. The full suite rides CI.
- The sweep license: a plan may pre-license re-teaching tests that pin literal text the task itself moves or re-signs — asserted content stays identical, every re-teach reported old→new. Any other failure stops the task. The license never covers behavior.
- No multi-agent review passes; verification is inline (gates + smoke + screenshots).

## Look and sound

- Interface ships for phone AND desktop, every single time; plans name both explicitly.

## Reports

- One line of outcome, then short bullets. No essays.
- Every report names the fixture seeds its tests ran; no seed is ever special.
- Every nonconformity, deviation, and re-pin is its own labeled bullet — never buried, filtered, or triaged away.
- Failures stated plainly with output; skipped steps named as skipped.

## Research

- Authority-published sources only. No estimates presented as data; unverifiable numbers are marked as design choices and listed in a gaps section.

## Process

- No momentum: stop and check before each next step.

- Phase closeout re-checks the README's claims and screenshots against the shipped game.
- Deferred items collect in the polish queue, never folded in opportunistically.
