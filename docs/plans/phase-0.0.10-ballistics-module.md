# Phase 0.0.10 — the ballistics solver and the material table

Status: LANDED, commit stamped below, 2026-08-28. Gate: 14 PASS / 0 FAIL; prior gates unmoved.
<!-- At landing this line becomes: Status: LANDED, commit `<hash>`, <date>. Gate: 14 PASS / 0 FAIL; prior gates unmoved. -->

The organ is the shooting-range demo's projectile engine: rounds fly with drag, wind, and gravity at 120 ticks a second; against a solid the material table decides ricochet, perforation, or embedding, and every outcome lands in a typed event buffer with its energy receipts. Source: `holdover-greybox-range-r55-claude-opus-5.html`, lines 64–117 (constants, the seeded random maker, the material and round tables) and lines 218–443 (the `Ballistics` class). It composes with the landed solids module: the ray comes from `raycastWorld` and the shared `hit` record. This is the phase's composition proof — the first module that imports another lifted module.

## Lift kind

VERBATIM MATH — the formulas are the demo's exactly; the substitutions below, and only those. Anything else differing from the cited lines is a finding against the plan.

1. `export ` prefixed to the top-level `const` declarations (the eight constants, the three flag values, the one event-code line, `MEDIA`, `M`, `ROUNDS`, `R`), to `function mulberry32`, and to `class Ballistics`.
2. `import { raycastWorld, hit } from "../solids/solids.js";` added — the demo holds those in the same script scope; the module reaches them through the solids module's surface.
3. An eleven-line header comment added at the top of the module file, naming the source lines and these substitutions.

## Acceptance arithmetic for the phase

Every number below was produced by running the exact planned code at plan-writing time (trial in the session scratchpad).

- `node scripts/gate.mjs ballistics` prints 14 PASS lines, then `ballistics-test: 14 PASS / 0 FAIL`, then `ballistics-test PASS`, exit 0.
- Load-bearing knowns inside the checks:
  - one vacuum tick matches the closed form exactly: x advances 0.5, the drop is g/2·dt²;
  - `mulberry32(1)` opens with `0.6270739405881613`;
  - a rifle round through a 4 cm wood wall: perforates in a 1906-tick flight, energy in `2812.5863776576302` J, out `2405.951332518563` J, path `0.04000000013755928` m;
  - the same round into 2 m of sandbag: embeds at depth `0.23859612577842754` m, nothing out;
  - a beanbag grazing thin steel at 5° in vacuum: ricochets with exactly retain 0.5 — 128 J in, 32 J out, speed 40, bounced upward;
  - twin engines with scatter on, seeds 42 and 99: every event bit-identical, 2119 ticks, 4 events, first impact x `5.02`, last expiry x `436.8950233214441`;
  - the 65th shot recycles the oldest pool slot; `drain()` returns the count and zeroes the buffer.
- File identity, proven at trial: `src/modules/ballistics/ballistics.js` sha256 `4b35fd998e5dea53f4c1e7a168f55b5009358379e70c480805e5aa84950c883a` (14200 bytes); `scripts/ballistics-test.mjs` sha256 `b048a877028eca6cb36042949b4fec2cbe257ad6188d5d9a0fa45961d8e22228` (5188 bytes).
- All prior gates unmoved, tails as re-run at plan-writing time:
  - api: `seed 1  seconds 90 (10800 steps)  worldHash 3367709165  runHash 2717846799`
  - combat: `ALL PASS`
  - accuracy: `11/11`
  - market: `market-test PASS`
  - builder: `builder-test PASS`
  - ledger: `ledger-test PASS`
  - weldstress: `weldstress-test PASS`
  - tape: `tape-test PASS`
  - physics-pb: `physics-pb-test PASS`
  - rig: `rig-test PASS`
  - solids: `solids-test PASS`

## Tasks

- 0.0.10-1 — write the ballistics module and its gate, register the gate, close the records. → `task-0.0.10-1-ballistics.md`

Suggested model: Sonnet 5 — every file's full content is in the plan.
