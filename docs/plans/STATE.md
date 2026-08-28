# STATE — where the work stands

Updated in every landing commit. A fresh session reads CLAUDE.md, this file,
and the last ~20 commit subjects, and is oriented.

## Now

Nothing in flight. Last landed phase: 0.0.8.

## Landed

| Phase | What | Commit |
|-------|------|--------|
| 0.0.1 | coldsnap engine, 42 files verbatim | `090f043` |
| 0.0.2 | market pools + the module pattern | `8e72a5e` |
| 0.0.3 | ship builder | `509d706` |
| 0.0.4 | conservation ledger | `0fc9b18` |
| 0.0.5 | weld stress | `e3fb9d6` |
| 0.0.6 | input tape | `048b837` |
| 0.0.7 | position-based physics core | `0ca4186` |
| 0.0.8 | rig table + assembly | `6f45e61` |

## Gates

All green: api, combat, accuracy, market, builder, ledger, weldstress, tape,
physics-pb, rig. Run any with `node scripts/gate.mjs <name>`. Each phase
document pins its gate's required numbers.

## Next, as last ruled

1. Rig generalization (ruled 2026-08-28): limb chains become spec data, the
   MK1 becomes the gate's fixture. Acceptance: the data-driven assembly must
   reproduce 8140 kg, 17 bodies, and the bit-identical standing pelvis.
2. Mech leg kinematics, onto the rig.
3. Deadweight grapple rope.
4. Deadweight frozen-time aiming.

No ruling on which is next.

## Standing rulings not in CLAUDE.md

- Coldsnap material arrives by plain copy at a pinned commit; coldsnap keeps
  its own engine and is never re-pointed or touched.
- The demo files stay out of git.

## Loose ends

- Coldsnap reference docs (sound profiles, systems, test manifest) not yet
  copied over.
- The four demo reuse-map documents were lost with the old session's
  scratchpad; the README checklist carries their conclusions.
