# OLD MASTER — the game plan

Status: DRAFT, awaiting the owner's review. No phase approved, no task written, no code.

The pitch is `docs/old-master-pitch.md`. This document is the build skeleton: the phases, their order, what each lands, and what each gate proves. Every phase follows the extraction law — trial first, task documents served alone with full file contents, arithmetic acceptance, prior gates bracketing, the record close riding the landing, deploy on every landing. Task documents are written one phase at a time, only after the owner rules on this skeleton.

## Standing proposals inside this plan (rulings pending)

1. **Numbering.** Game phases continue the engine's sequence — 0.0.16, 0.0.17, ... — because they land code, gates, and records in this tree like any other phase. Lean: yes.
2. **Where the game lives.** `src/games/old-master/` — the game imports from `src/depot/api.js` and `src/modules/*` only; the manifest tool proves it. Lean: yes.
3. **The page.** GitHub Pages serves the repository's `/docs` folder (no second branch to maintain); the playable page lives at `docs/play/` with the engine imported by relative path and the three library vendored beside it (Pages has no build step and no package installs). Lean: yes.
4. **Fan-demo naming.** No franchise names anywhere in code, page, or commit history. The game says OLD MASTER; the roster says troopers, automata, armor, the walker.

## The phases

Each line is one phase: what lands, and the acceptance in one breath. Full task documents come at each phase's turn, trialed before serving, per the law.

- [LANDED] **OM-1 — the page and the walk.** The browser page boots the war from a seed on the coldsnap map with the war's own renderer; a hero body spawns in the pass; the third-person camera rides it; keys and the twin sticks walk it; the page deploys to Pages. Gate: a headless boot with the hero present prints stable world and run hashes twice from one seed; the eleven engine gates unmoved; the owner's live phone-and-desktop check is the look acceptance.
- **OM-2 — GRIP.** The grapple module mounts on the hero: reticle lock, reel, hold, hurl, the snap ceiling, strain as the audible grip. Gate: closed-form pulls against fixture bodies — light flies to the hand, heavy drags the master, the walker snaps the line at the demo's 260.
- **OM-3 — REPULSE.** The api's blast rides the palm: the shove (damage low, knockback high), the directed slam, the big push that carves. Gate: knockback and crater numbers from fixed seeds; structure damage on a fixture wall; a returned grenade's flight replayed by tape.
- **OM-4 — the roster.** The game's own spec table through the roster contract: troopers, automata (Dominion-immune, no morale), armor, the walker, and neutral civilians with the flee behavior. Gate: `checkSpecs` clean; a fixed-seed wave replays to a pinned hash; a civilian under fire flees indoors on tape.
- **OM-5 — the staff.** Guard as the ricochet-law parry arc; the sweep as the full-circle short blast. Gate: deflection arithmetic at pinned graze angles; a surrounded fixture ring leaves the ground on one sweep, bit-identical by seed.
- **OM-6 — LIGHTNING.** The tesla arc system re-aimed from the hand, chain limits and costs as spec dials. Gate: chain counts and damage receipts from fixed formations.
- **OM-7 — DOMINION.** Possession re-skinned as the mind: seize squad, tower, vehicle, walker; the worn body's burn drain; the snap-back stagger; the camera handoff. Automata refuse it. Gate: possession tapes replay; burn arithmetic pinned; the automata check.
- **OM-8 — wrath and the Force.** Bounties feed the one meter; restraint and slaughter earn at their rates; civilian harm stains hardest; the meter prices every discipline. Gate: ledger arithmetic on scripted tapes — the same fight fought clean and fought dirty lands the two pinned meters.
- **OM-9 — the campaign.** The valley shaped into acts: pickets at the passes, convoy interdiction against the manifest, the town with flags and people, the depot's stones as the last act; win and loss conditions. Gate: each act's scripted tape reaches its pinned end-state hash.
- **OM-10 — sound.** The disciplines join the event vocabulary: grip bed on strain, repulse air, the tesla voice, the Dominion heartbeat, the staff hum. Mechanics gated by event counts; the sound itself is the owner's ear alone.
- **OM-11 — the second circle.** LEAP, FOCUS (lands the frozen-time roadmap box), VEIL (the sight-map edit), CALL. Each its own gate; queued, never folded in early.
- **OM-12 — closeout.** README gains the game's section and screenshots re-checked against the shipped page; the polish queue emptied or carried forward by ruling.

## What this plan does not decide

Look, feel, and sound are the owner's at every landing — the deployed page is the acceptance the numbers cannot give. Tuning values (costs, drains, earn rates) start at proposed numbers in each task document and move only on playtest word.

## First dispatch after approval

Write OM-1's task document: trial the page boot and the hero body in the scratchpad, prove the hashes, embed the files, rehearse, serve alone.
