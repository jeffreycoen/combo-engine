# Phase 0.0.111 — the walker's stance at the ruled scale

Status: LANDED, commit stamped below, 2026-09-09. Gate: 16 PASS / 0 FAIL; gait 11 PASS and 0 FAIL; the stance at 0.607 does not hold, the walker ships at trooper scale by the ruling.
<!-- At landing this line becomes: Status: LANDED, commit `<hash>`, <date>. Gates: rig <16 or 17> PASS / 0 FAIL, gait 11 PASS / 0 FAIL; bracket unmoved. -->

The ninth phase of GRAVITY'S ARK under the order batch-ark-1, the physics phase the owner ruled: a scale option across the rig, the balance controller, and the leg lengths, with one scaling law for lengths, masses, actuators, gains, and limits; the law proven at rolled scales; the stance at the ruled scale 0.607, twice a trooper's height, measured under gravity for ten seconds. It does not stand: zero break events, but the right foot leaves the ground at 7.42 s, after the first 0.5 s; the pelvis itself holds within 1.2 percent, 2.1248 m to 2.1000 m.

## Lift kind

Second pass on rig and gait: the landed laws untouched at scale 1; the scaling law new, PROPOSED.

## The measurement

Measured twice. The first attempt found the balance controller's own pivot scaled, but the state estimate and the gait controller still placed the foot pivot at the full-scale offset. The design was amended to scale the pivot everywhere it is used; the stance was measured again on the amended design. The second run is the phase's record.

### First attempt, before the pivot amendment

The trial's last line:

```
stand 0.607: breaks 0 airborne yes pelvis 2.1248 -> 2.0921
```

The 0.5 s table:

```
assembled: scale=0.607 mass=1820.4991 kg height=2.9826 m pelvisY0=2.1389 m
t=0.5s pelvisY=2.1248 breaks=0 airborne=no
t=1.0s pelvisY=2.1246 breaks=0 airborne=no
t=1.5s pelvisY=2.1259 breaks=0 airborne=no
t=2.0s pelvisY=2.1250 breaks=0 airborne=no
t=2.5s pelvisY=2.1246 breaks=0 airborne=no
t=3.0s pelvisY=2.1245 breaks=0 airborne=no
t=3.5s pelvisY=2.1246 breaks=0 airborne=no
t=4.0s pelvisY=2.1247 breaks=0 airborne=no
t=4.5s pelvisY=2.1248 breaks=0 airborne=no
t=5.0s pelvisY=2.1243 breaks=0 airborne=no
t=5.5s pelvisY=2.1245 breaks=0 airborne=no
t=6.0s pelvisY=2.1251 breaks=0 airborne=no
t=6.5s pelvisY=2.1232 breaks=0 airborne=no
t=7.0s pelvisY=2.1190 breaks=0 airborne=no
t=7.5s pelvisY=2.1141 breaks=0 airborne=no
t=8.0s pelvisY=2.1081 breaks=0 airborne=no
t=8.5s pelvisY=2.1061 breaks=0 airborne=no
t=9.0s pelvisY=2.1068 breaks=0 airborne=no
t=9.5s pelvisY=2.1031 breaks=0 airborne=no
t=10.0s pelvisY=2.0921 breaks=0 airborne=no
```

Zero breaks. The right foot lost contact at t = 7.55 s, the first such moment after the first 0.5 s, 11 of the 570 post-0.5-s steps.

### Second attempt, after the pivot amendment — the record

The trial's last line:

```
stand 0.607: breaks 0 airborne yes pelvis 2.1248 -> 2.1000
```

The 0.5 s table:

```
assembled: scale=0.607 mass=1820.4991 kg height=2.9826 m pelvisY0=2.1389 m
t=0.5s pelvisY=2.1248 breaks=0 airborne=no
t=1.0s pelvisY=2.1248 breaks=0 airborne=no
t=1.5s pelvisY=2.1260 breaks=0 airborne=no
t=2.0s pelvisY=2.1250 breaks=0 airborne=no
t=2.5s pelvisY=2.1247 breaks=0 airborne=no
t=3.0s pelvisY=2.1246 breaks=0 airborne=no
t=3.5s pelvisY=2.1248 breaks=0 airborne=no
t=4.0s pelvisY=2.1246 breaks=0 airborne=no
t=4.5s pelvisY=2.1244 breaks=0 airborne=no
t=5.0s pelvisY=2.1242 breaks=0 airborne=no
t=5.5s pelvisY=2.1240 breaks=0 airborne=no
t=6.0s pelvisY=2.1237 breaks=0 airborne=no
t=6.5s pelvisY=2.1227 breaks=0 airborne=no
t=7.0s pelvisY=2.1175 breaks=0 airborne=no
t=7.5s pelvisY=2.1124 breaks=0 airborne=no
t=8.0s pelvisY=2.1069 breaks=0 airborne=no
t=8.5s pelvisY=2.1062 breaks=0 airborne=no
t=9.0s pelvisY=2.1099 breaks=0 airborne=no
t=9.5s pelvisY=2.1058 breaks=0 airborne=no
t=10.0s pelvisY=2.1000 breaks=0 airborne=no
```

It does not stand. The walker ships at trooper scale, marked, by the ruling.

There is no break: `breaks 0` the whole run, both attempts. The law's other clause is still what fails, moved but not closed by the amendment: the right foot loses contact at t = 7.42 s, the first such moment after the first 0.5 s (a diagnostic run, same setup, off the committed trial script, found this by sampling contact every physics step rather than only at the 0.5 s marks — the 0.5 s table above never lands on the airborne frames, all 15 of them, scattered across 570 post-0.5-s steps). The quantity out of bound is foot contact, not a structural limit. No joint or weld crossed its tension, shear, bend, or torsion line. The pelvis holds within 1.2 percent, inside the 5 percent band, both attempts.

## Acceptance arithmetic for the phase

Every number below is the run's output (rolled seeds 722540624, 358019720 for rig; 347137849, 661044027 for gait).

- `node scripts/rig-test.mjs`: 16 PASS lines, then `rig-test: 16 PASS / 0 FAIL`, exit 0.
- `node scripts/gait-test.mjs`: 11 PASS lines, then `gait-test: 11 PASS / 0 FAIL`, exit 0.
- Bracket, run at the landing: rig, gait, legik, presets, telemetry, physics-pb.

## Tasks

- 0.0.111-1 — the stance. → `task-0.0.111-1-walker-stance.md`
