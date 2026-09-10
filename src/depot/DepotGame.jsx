// COLDSNAP DEPOT — Phase 0/1 playable scaffold. Seeded from
// src/game/ColdsnapTD.jsx (the frozen reference implementation — read it
// before touching this file). Same map/grid/flow-field/build-sell/tower-fire
// skeleton, stripped to what Phase 0/1 ships: no tanks, no mech boss, no
// off-map strikes, no village-protection payouts, flat conscript-only waves.
// Every gameplay rng call runs through world.rng() (mulberry32, seeded with
// the map) — the JS built-in unseeded generator is forbidden here — so runs
// replay exactly from ?seed=.
import React, { useEffect, useMemo, useRef, useState } from "react";
import { MK } from "../version.js";
import {
  makeField, makeWorld, addWeld, stepWorld,
  mulberry32, explode,
} from "../engine/core.js";
import { TOWER_SPECS, MASON, INFANTRY_ARMS, BISON, APC, MECH, BISON_FIRE, BARRELS } from "./specs.js";
import { cardFor } from "./infocards.js";
import { TEACH, TEACH_REV } from "./cards.js";
import { HUD0, BELL_PERIOD_S, stepBell, fireBell, nextSpawnTag, withdrawDue, executeWithdrawal, checkLoss, makeEndDispatch, towerShot, friendlyFouls, fieldReaches, PENDING_ARM_S, pendingArmed, pendingButtonsVisible, END_CARD_DELAY_S, stampEnd, endCardReady, censusDepotChunks, depotStandingFraction, stepDepotCensus, squadFire, possessedVolley, possessedTowerFire, spawnSandbag, WALL_HALF, WALL_THIN, makeManifestState, makeFoeState, takeHandCard, scoreKill, POSSESS_ACC, stickyLock } from "./state.js";
import { marketCounts, computePrices, priced } from "./market.js";
import { stepMines, minePrices } from "./mines.js";
import { addFogPatch, stepFog } from "./fog.js";
import { SQUAD_SPECS, clearSlot } from "./squads.js";
import { arcClears, squadReach, towerReachCached, scatterSigma, predictRing } from "./accuracy.js";
import { possessedArmorFire, possessedArmorMg, mechSighted, barrelTip } from "./drivers.js";
import { apcSeated, seatsOf } from "./transports.js";
import { makeRegiment, payTown, groundRate } from "./economy.js";
import { makeTerritory, stepTerritory, holderAt, fogStateFor, valueAt, EMIT } from "./territory.js";
import { makeSight, stepSight, seenAt, steerReticle, reclampReticle, surfaceAt } from "./sight.js";
import { SAVE_KEY, burnFront, restoreBodies, restoreWelds, restoreCensus, restoreSquads } from "./save.js";
import { serializeRun, makeRenderer, renderPortrait, makeGameAudio, storage } from "./api.js";
import { makeBodyLists, rebuildBodyLists } from "./lists.js";
import Dispatch from "./Dispatch.jsx";
import InfoCard from "./InfoCard.jsx";
import CrateChip, { StockTag } from "./Crate.jsx";
import { P } from "./styles.js";
import { SquadPie, TowerPie, VehiclePie, GroupPie } from "./pies.jsx";
import DraftScreen from "./DraftScreen.jsx";
import { PALETTE, PALETTE_BY_KEY, PALETTE_LABEL, FOE_RACK, TREE_BRANCHES, branchOf, QM_LINES, LATTICE } from "./palette.js";
import { makeMap, buildDepotTerrain, makeGrid, planTrees, computeFlowField } from "./mapgen.js";
import { musterFreshStart } from "./muster.js";
import { ringBell as ringBellOut } from "./bell.js";
import { mechCommand, mechFire, mechMissiles, mechBarrage, mechPunt, mechAboutFace, mechPivot, mechAimDir } from "../engine/mech.js";
import { stepDepot, buildTown, townFootprint, makeDepotAssaultState, clockStr } from "./sim.js";
import { bootWar, stampBag as bootStampBag } from "./boot.js";
import { tickWar, buildSnapshotOf } from "./tick.js";
import { makePlacement } from "./placement.js";
import { makeOrders } from "./orders.js";
import { installDepotHooks } from "./hooks.js";

// The quartermaster's quiet flag — the purpose lines speak in the
// first war only, then go quiet for good once the first bell has rung.
const QM_KEY = "coldsnap-qm-quiet";
// The teaching cards' seen store — one key, rev-gated
// (the MANUAL_REV law). seen may carry the sentinel "*": every card
// silenced, the smoke test's scripted wars ride under it.
const CARDS_KEY = "coldsnap-wf-cards";



// ============================================================== component
function detectTouch() {
  return (typeof window !== "undefined") && ("ontouchstart" in window || (navigator.maxTouchPoints || 0) > 0);
}
// `resume`: a PARSED save object, or null for a fresh front. The
// start screen does the async probe and the mark check (save.js's probeFront)
// and hands the data down already validated, so this mount effect stays
// synchronous — a boot that awaited storage mid-construction would be a world
// half-built for however long the read took.
export default function DepotGame({ onExit, resume = null, dev = false, seed: menuSeed = null }) {
  const canvasRef = useRef(null);
  const stateRef = useRef(null);
  // The knob's screen position is pushed
  // straight to the DOM from the pointer handlers below — not React state —
  // the same discipline the sandbox's own joystick uses, so a drag
  // never queues a re-render.
  const joyKnobRef = useRef(null);
  // The right stick's own knob ref — same discipline
  // as joyKnobRef, a separate DOM element and a separate live drag state.
  const joyRKnobRef = useRef(null);
  // FIRE FEEDBACK: the FIRE button's own ref — setFireHeld paints
  // its held state straight to the DOM.
  const fireBtnRef = useRef(null);
  // The Bison's coax MG button — same discipline as fireBtnRef.
  const mgBtnRef = useRef(null);
  // Held in a ref, not read from props inside the effect, for the same reason
  // every other loop input is: the effect must never close over a value React
  // can change under it. Captured once, at mount.
  const resumeRef = useRef(resume);
  const menuSeedRef = useRef(menuSeed);
  const [isTouch] = useState(detectTouch);
  const [hud, setHud] = useState(HUD0);
  const [fatal, setFatal] = useState(null);
  const [runId, setRunId] = useState(0);
  const [rereadDispatch, setRereadDispatch] = useState(false);
  // The quartermaster's purpose lines — quiet by default; the probe
  // opens them only for a first-timer.
  const [qmQuiet, setQmQuiet] = useState(true);
  // The tree's presentation state — never the sim's business.
  const [buildOpen, setBuildOpen] = useState(false);
  const [branch, setBranch] = useState("troops");
  // THE FOLD — packing plays every exit animation, then the trunk's
  // onAnimationEnd unmounts. _packNext carries what stands after the fold:
  // null = all closed; a category key = switch to it. Pure presentation.
  const [packing, setPacking] = useState(false);
  const packNextRef = useRef({ next: null, closeAll: false });
  const beginPack = (next, closeAll) => {
    if (packing) return;
    // No lattice standing = nothing to fold — close without
    // ceremony (the trunk's onAnimationEnd is the only finisher).
    if (!branch) { setBranch(next); if (closeAll) setBuildOpen(false); return; }
    packNextRef.current = { next, closeAll };
    setPacking(true);
  };
  const finishPack = () => {
    const t = packNextRef.current;
    setPacking(false);
    setBranch(t.next);
    if (t.closeAll) setBuildOpen(false);
  };
  useEffect(() => {
    if (resumeRef.current || dev) return; // a resumed war is not a first entry; the sandbox never speaks
    let live = true;
    (async () => {
      try {
        const r = await storage.get(QM_KEY);
        if (live && !r) setQmQuiet(false);
      }
      catch (e) {}
    })();
    return () => { live = false; };
  }, []);
  // The quartermaster's lines go quiet for good once the first bell rings.
  useEffect(() => {
    if (hud.bell >= 1 && !qmQuiet) {
      try { storage.set(QM_KEY, "1"); } catch (e) {}
      setQmQuiet(true);
    }
  }, [hud.bell, qmQuiet]);
  const restart = () => { setFatal(null); setHud({ ...HUD0 }); setRunId((r) => r + 1); };
  // THE DEAD BUTTON, diagnosed: makeEndDispatch() was called inline
  // in the render, so every HUD tick (~8Hz) handed Dispatch a brand-new
  // object. Dispatch's arming effect keys on [dispatch] and re-arms over
  // 500ms, so the timer restarted every 120ms and RETURN TO BASE never armed
  // — permanently disabled, exactly as it played. Memoized on the values the
  // card actually shows, so the reference is stable and the arm completes.
  // (The between-wave card was always fine: its dispatch is a stable object
  // carried on state.)
  const endDispatch = useMemo(
    () => (hud.gameOver || hud.victory ? makeEndDispatch({ victory: hud.victory, score: hud.score }) : null),
    [hud.gameOver, hud.victory, hud.score.pk, hud.score.pv, hud.score.ek, hud.score.ev],
  );
  // Leaving a live battle is a two-tap decision (the NEW CAMPAIGN
  // pattern): first tap arms, five seconds of silence disarms.
  const [menuArmed, setMenuArmed] = useState(false);
  useEffect(() => {
    if (!menuArmed) return;
    const t = setTimeout(() => setMenuArmed(false), 5000);
    return () => clearTimeout(t);
  }, [menuArmed]);
  // DRAW RATE. Touch draws every other frame by default; the sim is
  // untouched either way (see the frame loop). The ref is what the loop boots
  // from — the loop effect must not re-key on this, or toggling would restart
  // the run — and the state is only the button's label. Persisted through
  // the storage door (the artifact/Pages shim behind it), NOT the localStorage the fog
  // and discipline toggles use, per the settings-restore discipline in
  // platform/autosave.js: the default writes nothing, so a saved choice can
  // never be clobbered before the async restore lands, and only a real toggle
  // saves.
  // Stale "coldsnap-depot-fps" storage keys are simply ignored.

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let raf = 0, disposed = false;
    let R = null;
    try {
      // ------------------------------------------------------- THE BOOT ORDER
      // T4 (war-engine-extraction): the boot moved out to boot.js's bootWar.
      // The component resolves the seed and the resume/dev flags, calls
      // through the one door, then re-derives its own pure reads off the
      // returned war (map/town/grid are static; these are cheap).
      const RES = resumeRef.current;
      const urlSeed = parseInt(new URLSearchParams(window.location.search).get("seed"), 10);
      const seed = RES ? RES.map.seed
        : dev ? Math.floor(Date.now() % 1000000)
        : Number.isFinite(urlSeed) ? urlSeed
        : menuSeedRef.current != null ? menuSeedRef.current
        : Math.floor(Date.now() % 1000000);
      const war = bootWar({ seed, resume: RES, dev });
      const { map, field, grid, world, T, town, run } = war;
      const depotCensus = war.census, depotCensus2 = war.census2;
      const rocksLive = war.rocksLive;
      const nextApcSeq = () => ++war.seq.apc;
      const stampBag = (b, side) => bootStampBag(grid, b, side);
      const depotP = map.TOWN.find((t) => t.depot && t.team !== 2), depotE = map.TOWN.find((t) => t.depot && t.team === 2);
      const objG = grid.worldToGrid(map.OBJ_POS.x, map.OBJ_POS.z);
      const townUV = town.map((b) => { const c = map.invW(b.x, b.z); return { id: b.id, x: c.u, z: c.v, marker: b.marker, get ruined() { return b.ruined; } }; });
      const townFlagMeta = new Map(map.TOWN.map((t) => [t.id, { ny: t.ny, depot: !!t.depot, fwall: t.id.startsWith("fwall"), marker: !!t.marker }]));
      if (dev) {
        // THE SANDBOX OPENING — no draft, no enemy opening, no
        // commander (nothing bell-driven ever reads run.cmdr here). The war
        // starts standing, every plan unlocked, and the till is dead weight:
        // priceNow answers 0 on the bench.
        run.started = true;
        run.manifest.unlocked = PALETTE.map((p) => p.key);
      }
      let zoneAcc = 0.25; // the zone's own wall-time accumulator — starts due
      R = makeRenderer(canvas, world, {
        town: false, camera: "tactical", fadeDecals: true,
        // playable rim (matches buildDepotTerrain's falloff box, 60x60
        // canonical): ground/grid/decals beyond it get no geometry to
        // paint on (see renderer.js). TD/campaign/demo pass no rim.
        rim: { halfU: map.RIM_HALF_U, halfV: map.RIM_HALF_V, toCanonical: map.invW, toWorld: map.fwdU },
        // Grid-line faction tint + fog. sample() (WORLD space) drives
        // per-frame enemy visibility and the terrain fog cast; sampleUV
        // (CANONICAL space, matches T's own grid) drives the 4Hz splat-line
        // retint + terrain fog wash via R.updateTerritory().
        territory: {
          T,
          toWorld: map.fwdU,
          // VISION: what the screen hides now follows what your side
          // SEES, not what it holds. Binary — a spot is seen or it is not, so
          // the renderer's "seam" silhouette branch never fires again.
          sample: (x, z) => { const c = map.invW(x, z); return seenAt(T.sight, c.u, c.v, 1) ? "held" : "unheld"; },
          sampleUV: (u, v) => fogStateFor(T, u, v, 1),   // grid tint: ownership, unchanged
          // Raw signed field strength (world space), feeding the area-wash
          // alpha ramp — the ground wash still shows who HOLDS the ground,
          // which is also what build rights read.
          sampleVal: (x, z) => { const c = map.invW(x, z); return valueAt(T, c.u, c.v); },
        },
      });
      const EXT = { x: 95, z: 95 }; // square rim 90 + 5m margin; same at every rotation
      const A = makeGameAudio();
      A.setReflectors([
        ...map.ROCKS.filter((k) => k.r >= 4),
        ...map.TOWN.map((t) => ({ x: t.x, z: t.z, r: Math.max(t.nx, t.nz) * MASON.pitch * 0.6 })),
      ]);
      // T3: the stream's visible water — the canonical centerline sampled at
      // 2m, split at the causeway, widened, world-transformed, at 0.78.
      const streamRibs = [];
      if (map.STREAM) {
        let run = [];
        const flush = () => { if (run.length >= 2) streamRibs.push({ pts: run, w: map.STREAM.w + 1 }); run = []; };
        for (let u = -90; u <= 90; u += 2) {
          if (Math.abs(u - map.STREAM.bridgeU) < 3) { flush(); continue; }
          const i2 = Math.max(0, Math.min(map.STREAM.pts.length - 2, Math.floor((u + 90) / 15)));
          const a = map.STREAM.pts[i2], b = map.STREAM.pts[i2 + 1];
          const t = Math.max(0, Math.min(1, (u - a.u) / (b.u - a.u || 1)));
          const w = map.fwdU(u, a.v + (b.v - a.v) * t);
          run.push({ x: w.x, y: 0.78, z: w.z });
        }
        flush();
      }
      // rocksLive, not map.ROCKS: on a resume a ridge the war already breached
      // must not be painted back onto the ground it no longer occupies.
      R.setDressing({ rocks: rocksLive, ponds: map.PONDS, streams: streamRibs });
      R.setRoads(map.ROADS); // the roads painted — kept ribbons and broken ones, before any smear replays
      R.overlay.setObjective(map.OBJ_POS.x, map.OBJ_POS.z, field.heightAt(map.OBJ_POS.x, map.OBJ_POS.z));
      R.overlay.setBanners(map.SPAWN_POINTS);
      const AIM_OFF = { x: 0, z: -500 };
      // FOG toggle: visuals only (see renderer.js setFog) — default ON,
      // persisted with the same localStorage-key pattern the old campaign
      // used for "coldsnap-camp-deployed". Targeting (fieldReaches in
      // state.js, a sight read) is untouched by this flag.
      let fogOn = true;
      try { fogOn = window.localStorage.getItem("coldsnap-depot-fog") !== "0"; } catch (e) {}
      R.setFog(fogOn);

      // FIRE DISCIPLINE toggle: CAREFUL (default) holds a tower's trigger
      // pull when its round's flight path would foul a friendly wall/tower/
      // town chunk (state.js's friendlyFouls) — FREE fires regardless, the
      // pre-Task-2 behavior. Same coldsnap-depot-* persistence pattern as
      // the FOG toggle above. Enemy fire never consults this.
      let discipline = "careful";
      try { const v = window.localStorage.getItem("coldsnap-depot-discipline"); if (v === "free" || v === "careful") discipline = v; } catch (e) {}

      // WIND toggle: OFF = dead calm — every shot's drift and hold-off zero
      // out through the one world.wind read in stepDepot. Both sides feel
      // it equally (aim fully equal, the standing law). Same persistence
      // pattern as FOG/DISCIPLINE above. Default ON.
      let windOn = true;
      try { windOn = window.localStorage.getItem("coldsnap-depot-wind") !== "0"; } catch (e) {}

      // HEALTH BARS toggle — visual only, beside FOG.
      // Same coldsnap-depot-* persistence pattern. Default ON.
      let healthOn = true;
      try { healthOn = window.localStorage.getItem("coldsnap-depot-health") !== "0"; } catch (e) {}
      R.setHealth(healthOn);

      // T3 SPLIT: presentation — nothing the sim reads. Every UI method the
      // mount hangs on the state hangs here.
      const view = {
        sellMode: false, inspectId: null,
        paused: false, speed: 1, fogOn, healthOn,
        setFog: (v) => { fogOn = v; view.fogOn = v; R.setFog(v); try { window.localStorage.setItem("coldsnap-depot-fog", v ? "1" : "0"); } catch (e) {} },
        setHealth: (v) => { healthOn = v; view.healthOn = v; R.setHealth(v); try { window.localStorage.setItem("coldsnap-depot-health", v ? "1" : "0"); } catch (e) {} },
        acc: 0, t: 0, fps: 60, fpsAcc: 0, fpsN: 0,
        hover: null, pointer: null, toasts: [], pending: null,
        hirePlace: null, // the hire's armed placement ({ key } or null)
        devSpawn: null, // the armed enemy-rack pick (sandbox only)
        infoKey: null, infoDoor: null, infoArmedAt: 0, // the info card's own state
        _teachQ: [], _teachIdx: 0, _teachSeen: null, // the door — the queue pages by index; seen null until the load lands
        // Squads: selection/order UI state. selArmedAt
        // mirrors pending's 350ms trailing-tap guard so the tap that
        // selected a squad can't double-fire an order chip.
        // buildPt0: the FIRST of a build order's two taps, held here
        // until the second lands. Null whenever no build order is half-given.
        // pieOpen: true while the wedge disc is on
        // screen around the selected squad/tower; a wedge tap closes it
        // (view.pieOpen = false) but an aiming order keeps the squad selected
        // so the ground stays tappable — see consumeOrderTap.
        selSquadId: null, selSquadIds: null, selArmedAt: 0, orderMode: null, buildPt0: null, pieOpen: false,
        // The selected vehicle's own selection/order state — the
        // squad selection fields' exact shape, one Bison at a time.
        selVehId: null, vehOrderMode: null,
        groupSel: null, groupOrderMode: null, // the screen select — { sqIds, vehIds } and its own MOVE/ATTACK aim
        queueOn: false, chainScreens: null, // the chain builder — the QUEUE light and the legs' projected flags
        rosterOpen: false, // the roster panel
        // THE CARRIED RETICLE. reticleOff is
        // the reticle's offset from the possessed unit; joy is the touch
        // stick's own live drag state (DOM handlers below).
        reticleOff: null, reticleLockId: null, joy: null, joyR: null,
        linePending: null, // the proposed line, awaiting accept/reject
        hudT: 0, keys: {}, sellById: null, audio: A,
        // Tap = the 90° snap, hold = continuous — accumulated hold
        // time per key, read on keyup to decide tap-vs-hold.
        _rotHeld: { q: 0, e: 0 },
      };
      // T3 SPLIT: the per-tick command object (api.js's TickInput) — every
      // field the sim reads each tick that save.js never touches.
      const input = {
        // { kind: "squad", id } while live, else
        // null. possessInput is the frame's world-space stick vector.
        possess: null, possessInput: null,
        // The reticle is the derived world point the guns and the red ring
        // read, recomputed every possessed frame; fireHeld/mgHeld mirror the
        // FIRE/coax button state — true while held, read once per sim tick.
        reticle: null, fireHeld: false, mgHeld: false,
        mechWant: null,
        devDummies: false, // THEY FIGHT by default; true = dummies (sandbox only)
        windOn, discipline,
        releasePossession: null, stepBuildLine: null, stepFoeBuildLine: null, stepChainBuild: null,
        feedMech: (mech, cdt) => feedMechCommands(mech, cdt),
        bellCtx: null,
      };
      // setDiscipline/setWind: dead code (never called via view.setDiscipline/
      // view.setWind anywhere in this file) — kept as view-hung methods,
      // unassigned by the T3 table since no view.setDiscipline/view.setWind read
      // exists anywhere to derive a bag from (finding, reported at landing).
      view.setDiscipline = (v) => { discipline = v; input.discipline = v; try { window.localStorage.setItem("coldsnap-depot-discipline", v); } catch (e) {} };
      view.setWind = (v) => { windOn = v; input.windOn = v; try { window.localStorage.setItem("coldsnap-depot-wind", v ? "1" : "0"); } catch (e) {} };
      // THE FIRST-ENCOUNTER DOOR. A card fires once, the
      // first time its moment comes; the war pauses while it is up (the
      // convoy idiom, in the frame loop's sdt gate). The sandbox never
      // fires one; the "*" sentinel silences the door for scripted runs.
      view.teachFire = (key) => {
        if (dev) return;
        const tc = TEACH[key];
        if (!tc || (tc.desktopOnly && isTouch)) return;
        if (!view._teachSeen || view._teachSeen.has("*") || view._teachSeen.has(key) || view._teachQ.includes(key)) return;
        view._teachQ.push(key);
      };
      view.teachNext = () => {
        const k = view._teachQ[view._teachIdx];
        if (k && view._teachSeen) {
          view._teachSeen.add(k);
          try { storage.set(CARDS_KEY, JSON.stringify({ rev: TEACH_REV, seen: [...view._teachSeen] })); } catch (e) {}
        }
        view._teachIdx++;
        if (view._teachIdx >= view._teachQ.length) { view._teachQ = []; view._teachIdx = 0; }
      };
      view.teachBack = () => { if (view._teachIdx > 0) view._teachIdx--; };
      view.teachSkip = () => {
        if (view._teachSeen) {
          for (const k of view._teachQ) view._teachSeen.add(k);
          try { storage.set(CARDS_KEY, JSON.stringify({ rev: TEACH_REV, seen: [...view._teachSeen] })); } catch (e) {}
        }
        view._teachQ = []; view._teachIdx = 0;
      };
      // The pie's teaching order — the first unseen wedge card, one per
      // open. Wedge cards shared across pies (defend, move, patrol) are
      // seen once and cover both.
      const PIE_CARDS = {
        squad: (sq) => ["defend", "move", "attack", "possess_squad", "select_all",
          ...(sq.type !== "engineers" && sq.type !== "sappers" ? ["patrol"] : []),
          ...(INFANTRY_ARMS[sq.type] ? ["structures"] : []),
          ...(sq.type === "engineers" ? ["engineer_lines"] : []),
          ...(sq.type === "sappers" ? ["sapper_lines"] : [])],
        tower: () => ["discipline", "possess_tower", "sell"],
        veh: (b) => ["defend", "move", "patrol", "escort", "tracks",
          b.kind === "mech" ? "possess_mech" : "possess_vehicle",
          ...(b.vtype === "apc" ? ["load"] : [])],
      };
      view.teachPie = (kind, thing) => {
        if (!thing || !view._teachSeen || view._teachSeen.has("*")) return;
        for (const k of PIE_CARDS[kind](thing)) view.teachFire(k);
      };
      // THE WALK — the taught order. SHOW ME THE
      // FRONT fills the queue whole (seen-state deliberately not consulted:
      // the walk replays for whoever asks); the paging chrome does the rest,
      // NEXT marks each seen, SKIP the remainder, and an empty queue lands
      // back on the overlay. Touch skips the desktop-only keys card.
      const WALK = ["desktop_keys", "the_hand", "placing", "scrap", "bell", "convoy", "market", "sell", "defend", "move", "attack", "patrol", "engineer_lines", "structures", "select_all", "fog"];
      view.teachWalk = () => {
        view._teachQ = WALK.filter((k) => TEACH[k] && !(TEACH[k].desktopOnly && isTouch));
        view._teachIdx = 0;
      };
      // The seen set loads once, async, off the shim — rev mismatch resets.
      (async () => {
        let seen = [];
        try {
          const r = await storage.get(CARDS_KEY);
          const d = JSON.parse(r.value);
          if (d && Array.isArray(d.seen) && (d.rev === TEACH_REV || d.seen.includes("*"))) seen = d.seen;
        } catch (e) {}
        if (!disposed) view._teachSeen = new Set(seen);
      })();
      if (RES) R.setZoom(run.zoom);
      stateRef.current = { run, view, input };
      // R.setMines is a setDressing-style setter — called once here
      // at boot/restore (fresh boot: run.mines is empty, harmless), then again
      // on every lay and every trigger tick.
      R.setMines(run.mines);
      // Step 6, last: the ground remembers. Every mark where a man fell is
      // replayed through the same paint the kill handler uses, so the snow
      // comes back stained exactly as it was left. Scorch and tread
      // staining are NOT in the ledger and do not come back — the accepted
      // visual loss, stated in the plan.
      if (RES && R.smear) for (const m of RES.smears || []) R.smear(m.u, m.v, m.s, m.x, m.z);

      const toast = (txt) => { view.toasts.push({ txt, t: performance.now() / 1000 }); if (view.toasts.length > 4) view.toasts.shift(); };
      const recomputeFlow = () => computeFlowField(grid, objG.gx, objG.gz);
      const { priceNow, buyPaced, buildAt, canBuildAt, clearPending, startPending, standDown, confirmPending, SQUAD_MODE, HERO_MODE, ghostFp, canPlaceInfantryAt, placeSquadAt, startPendingSquad, sellAt, sellById, placeHire, devSpawnAt, placeHero, refreshZone } = makePlacement({
        world, run, view, input, map, grid, field, T, R, dev,
        toast, cue: (t) => cue(t), setHud, nextApcSeq, depotP, recomputeFlow,
      });
      const groundPoint = (cx, cy) => {
        const nd = toNdc(cx, cy);
        const cb = R.camBasis, cp = R.cameraPos();
        const hw = cb.halfW(), hh = cb.halfH();
        const ox = cp.x + cb.right.x * nd.x * hw + cb.up.x * nd.y * hh;
        const oy = cp.y + cb.right.y * nd.x * hw + cb.up.y * nd.y * hh;
        const oz = cp.z + cb.right.z * nd.x * hw + cb.up.z * nd.y * hh;
        const f = cb.fwd;
        let lo = 0, hi = 400;
        let prev = 0, found = -1;
        // 0.75m march (was 1.5): a thin crest wholly inside one step would be
        // skipped and the tap would land BEHIND the visible ridge.
        for (let t = 0; t <= 400; t += 0.75) {
          const x = ox + f.x * t, y2 = oy + f.y * t, z = oz + f.z * t;
          if (y2 <= pickHeightAt(x, z)) { found = t; lo = prev; hi = t; break; }
          prev = t;
        }
        if (found < 0) return null;
        for (let i = 0; i < 12; i++) {
          const mid = (lo + hi) / 2;
          const x = ox + f.x * mid, y2 = oy + f.y * mid, z = oz + f.z * mid;
          if (y2 <= pickHeightAt(x, z)) hi = mid; else lo = mid;
        }
        const t = (lo + hi) / 2;
        return { x: ox + f.x * t, z: oz + f.z * t };
      };
      const { tapAt, consumeOrderTap, possessCenter, possessSightR } = makeOrders({
        world, run, view, input, map, grid, field, T, R, dev,
        toast, canvas, groundPoint, stampBag, objG, recomputeFlow,
        clearPending, canPlaceInfantryAt, startPendingSquad, canBuildAt,
        startPending, sellAt, devSpawnAt, priceNow, SQUAD_MODE, HERO_MODE,
        ghostFp,
      });
      view.sellById = sellById;
      view.confirmPending = confirmPending;
      view.clearPending = clearPending;
      view.rotate = (d) => R.rotateStep(d);
      const onStructureLost = (b) => {
        for (const c of grid.cells) if (c.wallId === b.id) { c.wallId = null; c.blocked = false; c.bTeam = 0; }
        recomputeFlow();
      };
      const onRuin = () => recomputeFlow();

      const toNdc = (cx, cy) => {
        const r = canvas.getBoundingClientRect();
        return { x: ((cx - r.left) / Math.max(1, r.width)) * 2 - 1, y: -(((cy - r.top) / Math.max(1, r.height)) * 2 - 1) };
      };
      // pickHeightAt (mound-ray smallfix): height of the RENDERED terrain —
      // the same triangulated PlaneGeometry surface the player sees (two
      // triangles per grid quad, split on the b–d anti-diagonal, matching
      // THREE.PlaneGeometry's index order; syncTerrain maps vertex (i,j) to
      // F.h[j*n+i] 1:1) — NOT field.heightAt's bilinear patch. On convex
      // relief (the depot mound's crest) the bilinear surface bulges ABOVE
      // the drawn triangles, so a tap ray grazing the crest hit a phantom
      // bulge the player can't see and selected a nearer cell than the one
      // visibly under the cursor. Picking against the drawn surface makes
      // taps land where they look. Sim/physics still use field.heightAt —
      // this is view-space picking only.
      const pickHeightAt = (x, z) => {
        const F = field, fx = (x + F.half) / F.cs, fz = (z + F.half) / F.cs;
        let i = Math.floor(fx), j = Math.floor(fz);
        i = Math.max(0, Math.min(F.n - 2, i)); j = Math.max(0, Math.min(F.n - 2, j));
        const tx = Math.max(0, Math.min(1, fx - i)), tz = Math.max(0, Math.min(1, fz - j));
        const h00 = F.h[j * F.n + i], h10 = F.h[j * F.n + i + 1];
        const h01 = F.h[(j + 1) * F.n + i], h11 = F.h[(j + 1) * F.n + i + 1];
        return tx + tz <= 1
          ? h00 + tx * (h10 - h00) + tz * (h01 - h00)
          : h11 + (1 - tx) * (h01 - h11) + (1 - tz) * (h10 - h11);
      };

      const pointers = new Map();
      let pinchD0 = 0, pinchZ0 = 1, pinchA = 0, dragTotal = 0, downPt = null;
      const onPointerDown = (e) => {
        A.ensure();
        // DESKTOP FIRE: while possessed,
        // the left mouse button IS the trigger — held, it volleys like the
        // phone FIRE button; the click never becomes a pan or a tap. The
        // possession release paths already clear fireHeld.
        // DESKTOP COAX: while possessing the Bison,
        // the right mouse button IS the coax trigger — held, like FIRE/MG.
        // Checked before the left-button main-gun branch so a right-click
        // never falls through to it.
        if (input.possess && input.possess.kind === "vehicle" && e.pointerType === "mouse" && e.button === 2) {
          // The APC has no coax-and-main-gun split — one gun, FIRE
          // alone. A right-click on the APC does nothing (consumed, not
          // captured — never falls through to a pan/tap).
          const pv0 = world.byId.get(input.possess.id);
          if (!pv0 || pv0.vtype !== "apc") {
            canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId);
            input.mgHeld = true;
          }
          return;
        }
        if (input.possess && e.pointerType === "mouse" && e.button === 0) {
          canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId);
          input.fireHeld = true;
          return;
        }
        canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId);
        pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (pointers.size === 1) { dragTotal = 0; downPt = { x: e.clientX, y: e.clientY }; }
        else if (pointers.size === 2) {
          const ps = [...pointers.values()];
          pinchD0 = Math.hypot(ps[0].x - ps[1].x, ps[0].y - ps[1].y);
          pinchZ0 = run.zoom;
          pinchA = Math.atan2(ps[1].y - ps[0].y, ps[1].x - ps[0].x); // the twist's running angle
          downPt = null;
        }
      };
      const onPointerMove = (e) => {
        view.pointer = { x: e.clientX, y: e.clientY };
        const pt = pointers.get(e.pointerId);
        if (!pt) return;
        const dx = e.clientX - pt.x, dy = e.clientY - pt.y;
        pt.x = e.clientX; pt.y = e.clientY;
        if (pointers.size === 1) {
          dragTotal += Math.hypot(dx, dy);
          if (dragTotal > 12) {
            const cb = R.camBasis;
            const r = canvas.getBoundingClientRect();
            const kx = (2 * cb.halfW()) / Math.max(1, r.width);
            const ky = (2 * cb.halfH()) / Math.max(1, r.height);
            run.focus.x -= cb.right.x * dx * kx - cb.up.x * dy * ky;
            run.focus.z -= cb.right.z * dx * kx - cb.up.z * dy * ky;
            run.focus.x = Math.max(-EXT.x, Math.min(EXT.x, run.focus.x));
            run.focus.z = Math.max(-EXT.z, Math.min(EXT.z, run.focus.z));
          }
        } else if (pointers.size === 2 && pinchD0 > 0) {
          const ps = [...pointers.values()];
          const d = Math.hypot(ps[0].x - ps[1].x, ps[0].y - ps[1].y);
          run.zoom = Math.max(0.5, Math.min(2.6, pinchZ0 * (d / pinchD0)));
          R.setZoom(run.zoom);
          // TWO-FINGER ROTATION — the twist between the touches
          // steers the yaw. Incremental with wrap, so fingers crossing the
          // ±π seam never jump the view.
          const a = Math.atan2(ps[1].y - ps[0].y, ps[1].x - ps[0].x);
          let da = a - pinchA;
          while (da > Math.PI) da -= 2 * Math.PI;
          while (da < -Math.PI) da += 2 * Math.PI;
          pinchA = a;
          R.rotateBy(da);
        }
      };
      const onPointerUp = (e) => {
        if (e.pointerType === "mouse" && e.button === 2 && input.mgHeld) { input.mgHeld = false; pointers.delete(e.pointerId); return; }
        if (input.fireHeld && e.pointerType === "mouse") { input.fireHeld = false; pointers.delete(e.pointerId); return; }
        pointers.delete(e.pointerId);
        if (downPt && dragTotal <= 12 && pointers.size === 0) tapAt(e.clientX, e.clientY);
        if (pointers.size < 2) pinchD0 = 0;
        if (pointers.size === 0) downPt = null;
      };
      const onWheel = (e) => {
        e.preventDefault();
        run.zoom = Math.max(0.5, Math.min(2.6, run.zoom * (e.deltaY > 0 ? 0.9 : 1.11)));
        R.setZoom(run.zoom);
      };
      // Tap = the 90° snap, hold = continuous. The frame loop
      // accumulates hold time and rotates past the window; keyup reads the
      // accumulated time to decide tap-vs-hold.
      const ROT_HOLD_S = 0.22, ROT_SPEED = 1.6; // provisional (F5)
      const onKey = (e, down) => { view.keys[e.key.toLowerCase()] = down; };
      const kd = (e) => {
        A.ensure();
        if (e.key === "m" || e.key === "M") { A.setMuted(!A.muted); setHud((h) => ({ ...h, muted: A.muted })); }
        // THE MECH: desktop one-shot triggers, active only while a
        // mech is possessed — FIRE is the held left-click (already generic
        // to any possession, above); these are edge-triggered here exactly
        // like MechRange's own keydown bindings.
        if (!e.repeat && input.possess && input.possess.kind === "mech") {
          const k = e.key.toLowerCase();
          if (k === "v" || k === "b" || k === "c" || k === "t") {
            const w = input.mechWant || (input.mechWant = {});
            if (k === "v") w.msl = true;
            else if (k === "b") w.brg = true;
            else if (k === "c") w.punt = true;
            else if (k === "t") w.face = true;
          }
        }
        onKey(e, true);
      };
      const ku = (e) => {
        const k = e.key.toLowerCase();
        if (k === "q" || k === "e") {
          if ((view._rotHeld[k] || 0) <= ROT_HOLD_S) R.rotateStep(k === "q" ? -1 : 1);
          view._rotHeld[k] = 0;
        }
        onKey(e, false);
      };
      const blockTouch = (e) => e.preventDefault();
      // The right mouse button is the coax trigger while possessing
      // the Bison — the browser's own context menu must never steal it.
      const onCtxMenu = (e) => e.preventDefault();
      canvas.addEventListener("pointerdown", onPointerDown);
      canvas.addEventListener("pointermove", onPointerMove);
      canvas.addEventListener("pointerup", onPointerUp);
      canvas.addEventListener("pointercancel", onPointerUp);
      canvas.addEventListener("contextmenu", onCtxMenu);
      canvas.addEventListener("wheel", onWheel, { passive: false });
      canvas.addEventListener("touchstart", blockTouch, { passive: false });
      window.addEventListener("keydown", kd);
      window.addEventListener("keyup", ku);

      // --- THE FRONT, KEPT -------------------------------------------------
      // One slot, written at every bell and nowhere else. saveFront draws the
      // resumed run's seed FIRST and unconditionally — that draw is the only
      // rng this feature spends, it happens exactly once per bell whatever
      // else goes right or wrong below, and the draw-count law holds because
      // saving is not optional (see save.js law 2). Serialization is
      // synchronous into a string; the store write is fire-and-forget so the
      // frame never awaits it.
      // --- THE CUE QUEUE -----------------------------------------------------
      // Audio-only events for the bell cycle. They cannot ride world.events
      // directly: that array is wiped at the top of every frame's sim bracket
      // (see `world.events.length = 0` in the loop) and the bell — like every
      // UI tap — lands outside that bracket, so anything pushed there would be
      // erased unheard. Cues queue here instead and are merged into the drained
      // stream once per frame, downstream of the wipe, so A.consume hears each
      // exactly once. They carry a type and nothing else: no coordinates, no
      // randomness, no sim effect. R.consume ignores types it doesn't know.
      const cues = [];
      const cueN = {};   // debug tally only — see window.__DEPOTCUES__
      const cue = (type) => { cues.push({ type }); cueN[type] = (cueN[type] || 0) + 1; };
      // Last whole second the countdown was seen at — the pre-toll's edge.
      let preTollSec = null;

      let saveStat = null;
      const saveFront = () => {
        if (dev) return; // the sandbox never saves — the one rng draw below is never drawn either (no live stream compares against a sandbox run)
        try {
          const t0 = performance.now();
          const json = serializeRun(war, { smears: R.smearLog ? R.smearLog() : [] });
          saveStat = { ms: +(performance.now() - t0).toFixed(2), bytes: json.length, bell: run.bell };
          cue("uitick"); // the record was written — the one acknowledgement it gets
          // fire-and-forget, but never an unhandled rejection: a store that
          // refuses the write (quota, a runtime that says no) must cost the
          // frame nothing and must not surface as a page error.
          Promise.resolve(storage.set(SAVE_KEY, json)).catch(() => {});
        } catch (e) {
          console.warn("COLDSNAP front save failed", e);
          saveStat = { ms: -1, bytes: 0, bell: run.bell, error: String(e && e.message ? e.message : e) };
        }
      };
      // A lost war does not get replayed, and a won one has nothing left to
      // resume: the slot burns the moment the verdict lands, six seconds
      // BEFORE the end card mounts. Idempotent — the first verdict tick owns
      // it, same discipline as stampEnd.
      const burnSave = () => {
        if (dev) return; // the sandbox owns no slot to burn — a real front's save must survive a sandbox session untouched
        if (run._saveBurned) return;
        run._saveBurned = true;
        burnFront();
      };

      // THE BELL rings here and nowhere else. Town pay closes the cycle
      // alongside the assault's results (fireBell books those): green ground
      // pays the player, red ground pays the regiment, seam ground nobody.
      const bellCtx = { cue, toast, townUV, buildSnapshot: () => buildSnapshotOf(war), nextApcSeq, saveFront: () => saveFront(), possessed: () => !!input.possess };
      input.bellCtx = bellCtx;
      // --- the bell's cards. Nothing here touches the sim: they are
      // presentation state, armed on WORLD time via the same trailing-tap law
      // the ✓/✗ confirm pair lives under (PENDING_ARM_S), and they never gate
      // anything. The manifest chip re-opens a dismissed card until the NEXT
      // bell overwrites the offer.
      view.ackIntel = () => { run.intelUp = false; };
      view.openManifest = () => {
        const M = run.manifest;
        if (!M || M.hand.length === 0) return;
        M.cardUp = true;
        M.armedAt = world.t + PENDING_ARM_S;
        M.armedAtWall = performance.now() / 1000 + PENDING_ARM_S;
      };
      view.dismissManifest = () => { if (run.manifest) run.manifest.cardUp = false; };
      // THE INFO CARD — two doors, one state. The manifest door's
      // CONFIRM runs the real pick (its own arming and stale-offer guards
      // intact); the card adds its own trailing-tap arm on top.
      view.openInfo = (key, door) => { view.infoKey = key; view.infoDoor = door; view.infoArmedAt = world.t + PENDING_ARM_S; view.infoArmedWall = performance.now() / 1000 + PENDING_ARM_S; };
      view.closeInfo = () => { view.infoKey = null; view.infoDoor = null; };
      view.confirmInfo = () => {
        const armed = performance.now() / 1000 >= view.infoArmedWall;
        if (!armed) { toast("HOLD — ARMING"); return; }
        const k = view.infoKey, door = view.infoDoor;
        view.closeInfo();
        if (k && door === "manifest") view.pickManifest(k);
        else if (k && door === "hire") view.armHire(k);
        // The deal door just closes — the ground tap places next.
      };
      // The five picks are FREE — the pick is the payment.
      // Plans open the bar at once; units join the deal-placement queue.
      view.confirmDraft = (picked) => {
        if (!picked || picked.length !== 5) return;
        for (const c of picked) if (c.plan && run.manifest.unlocked.indexOf(c.k) < 0) run.manifest.unlocked.push(c.k);
        view._placeQueue = picked.filter((c) => !c.plan).map((c) => c.k);
        view._placeTotal = view._placeQueue.length;
        if (view._placeQueue.length) view.teachFire("placing");
        view._draftDone = true; view._draftOpen = false; run.draft = null;
        setHud((h) => ({ ...h, drafting: null, unlocked: run.manifest.unlocked.slice(), placing: view._placeQueue[0] || "done" }));
        if (view._placeQueue.length && view.openInfo) view.openInfo(view._placeQueue[0], "deal");
      };
      view.pickManifest = (key) => {
        const M = run.manifest;
        if (!M || performance.now() / 1000 < (M.armedAtWall ?? 0)) { toast("HOLD — ARMING"); return; }
        // A PLAN COSTS HALF the live price — the ladder
        // itself gained a price; each build after pays full. The convoy's
        // window is EXEMPT from the one-buy-per-second law (the hand is
        // one visit): no pacing check, no purchase stamp.
        const it = PALETTE_BY_KEY[key];
        const price = Math.max(1, Math.ceil(priceNow(key, it ? it.cost : 10) / 2));
        if (run.resources < price) { toast("NO SCRAP"); return; }
        if (!takeHandCard(M, key, 0)) return;
        M.unlocked.push(key);
        run.resources -= price;
        cue("uitick"); // the plan is bought
        toast((PALETTE_LABEL[key] || key) + " — PLANS BOUGHT ◆" + price);
        // THE PICK ARMS THE BAR — every key; hero keys are placement modes under the one law now.
        setMode(key);
      };
      // A HIRE FIELDS AT ONCE, placed by your own ground
      // tap on held ground. Payment lands only when the unit actually
      // fields — the ✗ cancels, charges nothing, and reopens the hand.
      view.armHire = (key) => {
        const M = run.manifest;
        if (!M || performance.now() / 1000 < (M.armedAtWall ?? 0)) { toast("HOLD — ARMING"); return; }
        if (!M.hand.some((c) => c.k === key && c.hire === 1)) return;
        // AFFORDABILITY IS CHECKED FIRST — a hire
        // the till can't cover is refused here, before any ceremony: the card
        // stays in the hand, the window stays open, and the toast names the
        // price. Found live: a Bison hire armed at bell one and died at the
        // last step's tiny toast after the whole ghost dance.
        const price = priceNow(key, (PALETTE_BY_KEY[key] || { cost: 10 }).cost);
        if (run.resources < price) { toast("NO SCRAP — ◆" + price + " TO HIRE"); return; }
        view.hirePlace = { key };
        M.cardUp = false; // the window steps aside for the placement tap
        toast("PLACE THE HIRE — tap held ground");
      };
      view.cancelHire = () => { view.hirePlace = null; };

      const uninstallHooks = installDepotHooks({ world, run, view, input, map, grid, field, T, R, canvas, stateRef,
        RES, buildAt, groundPoint, pickHeightAt, consumeOrderTap, getSaveStat: () => saveStat, cueN });

      let last = performance.now();
      const STEP = 1 / 120;
      // THE STOPWATCH (?perf=1). A measurement probe, not a feature:
      // it brackets the fixed-step sim block and the R.render call and drops
      // the pair into a ring buffer that scripts/diag-perf.mjs reads back.
      // The flag is resolved ONCE, here — with no ?perf=1 in the URL every
      // probe site below is a single already-false boolean test, nothing is
      // allocated, nothing is sampled and window.__DEPOTPERF__ never exists.
      // Typed arrays, never per-frame objects, so the stopwatch cannot feed
      // the garbage collector it is trying to measure. Body/chunk counts are
      // sampled at ~1Hz (the census cadence), not per frame.
      const perf = new URLSearchParams(window.location.search).get("perf") === "1";
      const PCAP = 4096; // ~68s at 60fps, ~136s at 30 — a 60s window always fits
      let pT = null, pSimA = null, pRenA = null, pFrmA = null, pDrewA = null;
      let pI = 0, pN = 0, pSampT = 0, pBodies = 0, pChunksDrawn = 0, pChunksTotal = 0;
      if (perf) {
        pT = new Float64Array(PCAP); pSimA = new Float64Array(PCAP);
        pRenA = new Float64Array(PCAP); pFrmA = new Float64Array(PCAP);
        pDrewA = new Uint8Array(PCAP);
        window.__DEPOTPERF__ = () => {
          const n = Math.min(pN, PCAP), out = [];
          for (let k = 0; k < n; k++) {
            const j = (pI - n + k + PCAP) % PCAP; // oldest-first
            out.push({ t: pT[j], sim: pSimA[j], render: pRenA[j], frame: pFrmA[j], drew: !!pDrewA[j] });
          }
          return {
            n, cap: PCAP, overflowed: pN > PCAP,
            bodies: pBodies, chunksDrawn: pChunksDrawn, chunksTotal: pChunksTotal,
            frames: out,
          };
        };
        window.__DEPOTPERF__.reset = () => { pI = 0; pN = 0; };
      }
      // THE MECH: possessed commands, ported from MechRange.jsx's
      // feedCommands (jets omitted — no jet mode in the war). Fed once per
      // SIM TICK from inside the accumulator loop below — the range's own
      // cadence law: per-frame feeds fall the machine. Left stick/WASD walk
      // (screen-relative, like the possessed vehicle above); right
      // stick/A,D turn with the steering lock and the hard-over pivot; aim
      // range/yaw from the touch trim+slider or the desktop mouse
      // (groundPoint — the same raycast the reticle uses, not a synthetic
      // screen-offset: the camera is hull-locked, so the mouse already
      // points at the world the way it does for every other possession).
      const feedMechCommands = (mech, cdt) => {
        let tf = view.keys.w ? 0.6 : view.keys.s ? -0.42 : 0;
        let tl = 0;
        if (view.joy && view.joy.active && (Math.abs(view.joy.s) > 0.12 || Math.abs(view.joy.t) > 0.12)) {
          const cb = R.camBasis;
          const fl = Math.hypot(cb.up.x, cb.up.z) || 1, rl = Math.hypot(cb.right.x, cb.right.z) || 1;
          const wxS = (cb.right.x / rl) * view.joy.s + (cb.up.x / fl) * view.joy.t;
          const wzS = (cb.right.z / rl) * view.joy.s + (cb.up.z / fl) * view.joy.t;
          const hS = mech.state.heading;
          const fS = wxS * Math.sin(hS) + wzS * Math.cos(hS);
          const lS = wxS * Math.cos(hS) - wzS * Math.sin(hS);
          tf = fS >= 0 ? Math.min(0.6, fS * 0.6) : Math.max(-0.42, fS * 0.42);
          tl = Math.max(-0.22, Math.min(0.22, lS * 0.26));
        }
        if (view.mechYawT == null) view.mechYawT = mech.state.heading;
        if (view.keys.a) view.mechYawT += 0.7 * cdt;
        if (view.keys.d) view.mechYawT -= 0.7 * cdt;
        view.mechKeyTurnT = (view.keys.a || view.keys.d) ? (view.mechKeyTurnT || 0) + cdt : 0;
        if (view.mechKeyTurnT > 0.6 && mech.state.mode === "WALK" && !mech.state.aboutFace) { mechPivot(world, mech); view.mechKeyTurnT = 0; }
        if (!view.keys.a && !view.keys.d && view.mechKeyTurnPrev && mech.state.afLive && mech.state.aboutFace) { mech.state.aboutFace = null; mech.state.headingT = mech.state.heading; view.mechYawT = mech.state.heading; mech.state.recoverT = Math.max(mech.state.recoverT || 0, 0.5); }
        view.mechKeyTurnPrev = view.keys.a || view.keys.d;
        if (view.joyR && view.joyR.active && Math.abs(view.joyR.s) > 0.15) view.mechYawT -= view.joyR.s * 0.9 * cdt;
        view.mechHardT = view.joyR && view.joyR.active && Math.abs(view.joyR.s) > 0.5 ? (view.mechHardT || 0) + cdt : 0;
        if (view.mechHardT > 0.6 && mech.state.mode === "WALK" && !mech.state.aboutFace) { mechPivot(world, mech); view.mechHardT = 0; }
        {
          const anchor = mech.state.heading;
          let lead = view.mechYawT - anchor;
          while (lead > Math.PI) lead -= 2 * Math.PI;
          while (lead < -Math.PI) lead += 2 * Math.PI;
          view.mechYawT = anchor + Math.max(-0.5, Math.min(0.5, lead));
        }
        if (isTouch) {
          if (view.mechAimHeld) view.mechAimOff = Math.max(-0.85, Math.min(0.85, (view.mechAimOff || 0) + view.mechAimHeld * 0.9 * cdt));
          mech.aimYaw = mech.state.heading + (view.mechAimOff || 0);
          mech.aimRange = view.mechAimRange || 26;
        } else if (view.pointer) {
          const torso = mech.waist ? mech.waist.b : mech.hull;
          const gp = groundPoint(view.pointer.x, view.pointer.y);
          if (gp) {
            mech.aimYaw = Math.atan2(gp.x - torso.pos.x, gp.z - torso.pos.z);
            mech.aimRange = Math.max(6, Math.min(120, Math.hypot(gp.x - torso.pos.x, gp.z - torso.pos.z)));
          }
        }
        if (mech.waist && Math.abs(mech.waist.target) > 0.6 * 0.87 && Math.hypot(tf, tl) > 0.05)
          view.mechYawT += Math.sign(mech.waist.target) * 0.12 * cdt;
        mechCommand(mech, { travel: tf, lateral: tl, heading: mech.state.aboutFace ? null : view.mechYawT });
      };
      const frame = (now) => {
        if (disposed) return;
        raf = requestAnimationFrame(frame);
        let dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        const pFrame0 = perf ? performance.now() : 0;
        let pSim = 0, pRen = 0, pDrew = 0;
        try {
          view.fpsAcc += dt; view.fpsN++;
          if (view.fpsAcc > 0.5) { view.fps = Math.round(view.fpsN / view.fpsAcc); view.fpsAcc = 0; view.fpsN = 0; }
          // The verdict no longer freezes the world.
          // It stamps the clock; the collapse plays out for END_CARD_DELAY_S
          // of world time, and only when the card is actually up does the sim
          // stop. Orders and building are locked from the verdict itself.
          // (stampEnd itself now runs inside tickWar, once per fixed step.)
          // The record burns with the war, and it burns FIRST — the end card
          // is still six world-seconds away when this runs.
          if (run.gameOver || run.victory) burnSave();
          const cardUp = endCardReady(run, world.t);
          // THE WAR PAUSES FOR THE CONVOY — the whole sim
          // freezes while the hand's window is up; LATER or buying out the
          // hand resumes it. Prices and the bell freeze for free: every
          // accumulator below feeds on sdt.
          const convoyUp = !!(run.manifest && run.manifest.cardUp);
          const teachUp = view._teachQ.length > 0; // a teaching card freezes the sim, the convoy's own law
          const sdt = view.paused || !run.started || cardUp || convoyUp || teachUp ? 0 : dt * view.speed;
          const pan = 34 * dt / Math.max(0.5, run.zoom);
          // screen-relative like touch drag: W = screen-up whatever the Q/E yaw
          const cb = R.camBasis;
          const ul = Math.hypot(cb.up.x, cb.up.z) || 1, rl = Math.hypot(cb.right.x, cb.right.z) || 1;
          const ux = cb.up.x / ul, uz = cb.up.z / ul, rx = cb.right.x / rl, rz = cb.right.z / rl;
          // Held rotation keys — past the tap window the key swings
          // the view continuously; a release inside it snaps 90° (see ku).
          if (view.keys.q) { view._rotHeld.q += dt; if (view._rotHeld.q > ROT_HOLD_S) R.rotateBy(-ROT_SPEED * dt); }
          if (view.keys.e) { view._rotHeld.e += dt; if (view._rotHeld.e > ROT_HOLD_S) R.rotateBy(ROT_SPEED * dt); }
          // While possessed, WASD drives the
          // squad, NOT the camera — the pan block is gated off entirely.
          if (!input.possess) {
            if (view.keys.w || view.keys.arrowup) { run.focus.x += ux * pan; run.focus.z += uz * pan; }
            if (view.keys.s || view.keys.arrowdown) { run.focus.x -= ux * pan; run.focus.z -= uz * pan; }
            if (view.keys.a || view.keys.arrowleft) { run.focus.x -= rx * pan * 0.8; run.focus.z -= rz * pan * 0.8; }
            if (view.keys.d || view.keys.arrowright) { run.focus.x += rx * pan * 0.8; run.focus.z += rz * pan * 0.8; }
            run.focus.x = Math.max(-EXT.x, Math.min(EXT.x, run.focus.x));
            run.focus.z = Math.max(-EXT.z, Math.min(EXT.z, run.focus.z));
            run.focus.y = field.heightAt(run.focus.x, run.focus.z);
          }
          if (input.possess && input.possess.kind === "squad") {
            // The stick, camera-relative (the sandbox's own twin-stick math):
            // joystick wins if it's live,
            // WASD/arrows otherwise. The camera locks to the squad — no pan,
            // no drift; a touch drag one finger off the stick still nudges
            // it (pointermove below), but it snaps back here next frame.
            const cb2 = R.camBasis;
            const fl = Math.hypot(cb2.up.x, cb2.up.z) || 1, rl2 = Math.hypot(cb2.right.x, cb2.right.z) || 1;
            let st = 0, ss = 0;
            if (view.joy && view.joy.active) { st = view.joy.t; ss = view.joy.s; }
            else {
              st = (view.keys.w || view.keys.arrowup ? 1 : 0) + (view.keys.s || view.keys.arrowdown ? -1 : 0);
              ss = (view.keys.d || view.keys.arrowright ? 1 : 0) + (view.keys.a || view.keys.arrowleft ? -1 : 0);
            }
            input.possessInput = {
              vx: (cb2.right.x / rl2) * ss + (cb2.up.x / fl) * st,
              vz: (cb2.right.z / rl2) * ss + (cb2.up.z / fl) * st,
            };
            const psq = run.squads.find((q) => q.id === input.possess.id);
            if (psq) { run.focus.x = psq.anchor.x; run.focus.z = psq.anchor.z; run.focus.y = field.heightAt(run.focus.x, run.focus.z); }
          } else if (input.possess && input.possess.kind === "tower") {
            // Towers don't walk — no stick, no
            // possessInput. Camera locks to the tower exactly as it does to
            // a possessed squad.
            const ptw = world.byId.get(input.possess.id);
            if (ptw) { run.focus.x = ptw.pos.x; run.focus.z = ptw.pos.z; run.focus.y = field.heightAt(run.focus.x, run.focus.z); }
          } else if (input.possess && input.possess.kind === "vehicle") {
            const pv = world.byId.get(input.possess.id);
            if (pv) {
              run.focus.x = pv.pos.x; run.focus.z = pv.pos.z; run.focus.y = field.heightAt(run.focus.x, run.focus.z);
              const cbv = R.camBasis;
              const flv = Math.hypot(cbv.up.x, cbv.up.z) || 1, rlv = Math.hypot(cbv.right.x, cbv.right.z) || 1;
              let st = 0, ss = 0;
              if (view.joy && view.joy.active) { st = view.joy.t; ss = view.joy.s; }
              else {
                st = (view.keys.w || view.keys.arrowup ? 1 : 0) + (view.keys.s || view.keys.arrowdown ? -1 : 0);
                ss = (view.keys.d || view.keys.arrowright ? 1 : 0) + (view.keys.a || view.keys.arrowleft ? -1 : 0);
              }
              const wxv = (cbv.right.x / rlv) * ss + (cbv.up.x / flv) * st;
              const wzv = (cbv.right.z / rlv) * ss + (cbv.up.z / flv) * st;
              const magv = Math.min(1, Math.hypot(ss, st));
              pv.depotDrive = "manual";
              if (!pv.ctl) pv.ctl = { throttle: 0, steer: 0, brake: false };
              if (magv > 0.03) {
                const desired = Math.atan2(wxv, wzv);
                let errY = desired - Math.atan2(pv.R[6], pv.R[8]);
                while (errY > Math.PI) errY -= 2 * Math.PI;
                while (errY < -Math.PI) errY += 2 * Math.PI;
                pv.ctl.steer = Math.max(-1, Math.min(1, errY * 1.8));
                pv.ctl.throttle = magv * Math.max(0, Math.cos(errY));
                pv.ctl.brake = false;
              } else { pv.ctl.throttle = 0; pv.ctl.steer = 0; pv.ctl.brake = false; }
            }
          } else if (input.possess && input.possess.kind === "mech") {
            // THE MECH: camera locks to the hull, exactly as a
            // possessed tower or vehicle — the stick/keys/mouse are read at
            // SIM-TICK cadence inside feedMechCommands below, not here
            // (per-frame feeds fall the machine, the range's own law).
            const pm = world.byId.get(input.possess.id);
            if (pm) { run.focus.x = pm.pos.x; run.focus.z = pm.pos.z; run.focus.y = field.heightAt(run.focus.x, run.focus.z); }
          }
          if (input.possess) {
            // THE CARRIED RETICLE. The right
            // stick wins if it's live (steerReticle — deflection is
            // velocity, the OFFSET holds on release, so walking carries the
            // reticle with the unit), same precedence the left stick uses
            // (view.joy.active above); otherwise the mouse sets the offset, the
            // sandbox's own convention — positional, not velocity. Either way the offset is bounded to
            // the possessed unit's live sight circle every frame
            // (reclampReticle); its ground can go dark and it falls home to
            // the unit's cell. The world point the guns and the red ring
            // read is derived last.
            const rc = possessCenter();
            const rR = possessSightR();
            if (rc && view.reticleOff) {
              if (view.joyR && view.joyR.active) {
                const cb3 = R.camBasis;
                const fl3 = Math.hypot(cb3.up.x, cb3.up.z) || 1, rl3 = Math.hypot(cb3.right.x, cb3.right.z) || 1;
                const rv = {
                  vx: (cb3.right.x / rl3) * view.joyR.s + (cb3.up.x / fl3) * view.joyR.t,
                  vz: (cb3.right.z / rl3) * view.joyR.s + (cb3.up.z / fl3) * view.joyR.t,
                };
                view.reticleOff = steerReticle(T.sight, 1, rc, rR, view.reticleOff, rv.vx, rv.vz, dt, map.invW);
              } else if (!isTouch && view.pointer) {
                const gp = groundPoint(view.pointer.x, view.pointer.y);
                if (gp) view.reticleOff = { dx: gp.x - rc.x, dz: gp.z - rc.z };
              }
              view.reticleOff = reclampReticle(T.sight, 1, rc, rR, view.reticleOff, map.invW);
              input.reticle = { x: rc.x + view.reticleOff.dx, z: rc.z + view.reticleOff.dz };
              // THE SURFACE LAW — nothing blocks the steer; the
              // ground the reticle rests on aims the guns: a solid's top
              // when it sits on one (rooftops, wall tops), the dirt
              // otherwise. Where the shot truly ends is the predictor's
              // ring, never a steering clamp.
              input.reticle.y = surfaceAt(T.sight, input.reticle.x, input.reticle.z, map.invW).y;
              // THE STICKY SNAP — the RAW offset steers; the lock
              // only bends the derived aim onto the man, so pulling the raw
              // point past the radius is the deliberate escape.
              const lk9 = stickyLock(world, view.reticleLockId, input.reticle, T, map.invW);
              view.reticleLockId = lk9 ? lk9.id : null;
              if (lk9) input.reticle = { x: lk9.pos.x, z: lk9.pos.z };
              // Keep the turret honest while possessed — the hull's
              // own aim yaw follows the live reticle every frame, not just
              // on a shot.
              if (input.possess.kind === "vehicle" && input.reticle) {
                const pv2 = world.byId.get(input.possess.id);
                if (pv2) pv2._aimYaw = Math.atan2(input.reticle.x - pv2.pos.x, input.reticle.z - pv2.pos.z);
              }
            }
          }
          if (!isTouch && view.pointer && run.started && !run.gameOver && !run.victory && !view.pending) {
            const p = groundPoint(view.pointer.x, view.pointer.y);
            if (p) {
              const g = grid.worldToGrid(p.x, p.z);
              if (grid.inBounds(g.gx, g.gz)) {
                const cell = grid.cells[grid.idx(g.gx, g.gz)];
                const wp = grid.gridToWorld(g.gx, g.gz);
                const spec = run.mode === "wall" ? null : TOWER_SPECS[run.mode];
                view.hover = { x: wp.x, z: wp.z, valid: !cell.blocked && !cell.wallId && !cell.ice, range: spec ? spec.range : 0 };
              } else view.hover = null;
            } else view.hover = null;
          } else view.hover = null;
          if (view.inspectId) {
            const ib = world.byId.get(view.inspectId);
            if (!ib) { view.inspectId = null; view.inspectReach = null; }
            else {
              const ispec = ib.kind === "tower" ? TOWER_SPECS[ib.towerType] : null;
              if (ispec && ib.towerType !== "tesla") {
                // An inspected GUN tower shows its true reach fan
                // (towerReachCached: real muzzle, fog-independent, computed
                // once per selection — static body). Frost keeps its aura
                // ring below (it is not a gun); walls keep no fan.
                if (!view.inspectReach) view.inspectReach = {};
                towerReachCached(view.inspectReach, world, ib, ispec, map.invW);
                view.hover = { x: ib.pos.x, z: ib.pos.z, valid: true, range: 0 };
              } else {
                view.inspectReach = null;
                view.hover = { x: ib.pos.x, z: ib.pos.z, valid: true, range: ispec ? ispec.range : 0 };
              }
            }
          } else view.inspectReach = null;
          // Selected squad: ring overlay at the anchor via the EXISTING hover
          // overlay API (read-only use — renderer belongs to a parallel
          // task). Ring radius = the squad's own weapon range.
          const selSq = view.selSquadId != null ? run.squads.find((q) => q.id === view.selSquadId) : null;
          // Honest ring: ring + chip render at the LIVE-MEMBER CENTROID, not
          // squad.anchor — the anchor is a virtual march point and can lead
          // the men (rubber-band bounds it to COHESION_M, but the ring should
          // sit on the troops, not the ghost). Render-only; falls back to the
          // anchor if no member is alive this frame.
          let sqCx = 0, sqCz = 0;
          if (selSq) {
            let nLive = 0;
            for (const id of selSq.memberIds) {
              const u = world.byId.get(id);
              if (u && u.alive) { sqCx += u.pos.x; sqCz += u.pos.z; nLive++; }
            }
            if (nLive) { sqCx /= nLive; sqCz /= nLive; }
            else { sqCx = selSq.anchor.x; sqCz = selSq.anchor.z; }
          }
          if (selSq) {
            // Every selected squad shows the TRUE reach fan (the
            // sniper's path, generalized to rifles/mg) — squadReach fires
            // from the member's head (pos.y + 0.5, squadFire's own muzzle),
            // elevation-scaled and terrain/solid-clipped, fog-independent
            // like the placement preview (null territory: what he COULD
            // see). The old flat spec.range ring read from the anchor's
            // ground and under-sold every elevated or crest-line shooter.
            // 1Hz refresh: defend micro-shuffles and attack legs move him.
            if (!view.selReach || view.selReach.id !== selSq.id || world.t - view.selReach.t > 1) {
              const u0 = selSq.memberIds.map((id) => world.byId.get(id)).find((u) => u && u.alive);
              const pts = u0 ? squadReach(world, selSq, null, map.invW) : null;
              view.selReach = pts ? { id: selSq.id, t: world.t, pts, cx: u0.pos.x, cz: u0.pos.z } : null;
            }
            view.hover = { x: sqCx, z: sqCz, valid: true, range: 0 };
          } else view.selReach = null;
          if (run.started && !run.gameOver && !run.victory) {
            if (run.manifest && run.manifest.cardUp) view.teachFire("convoy"); // idempotent — seen/queue gates inside
            // THE PRE-TOLL. The last five seconds are counted out
            // loud. Edge-triggered on the countdown crossing each whole second
            // — ceiling-rounded exactly as the chip reads it — so it fires once
            // per second at any frame rate, once at 30fps and once at 120, and
            // not at all while paused (run.bellT only moves with world.t). The
            // ring itself resets bellT upward, which is not a crossing
            // downward, so the bell never gets a sixth tick.
            const bellSec = Math.ceil(run.bellT);
            if (bellSec !== preTollSec) {
              if (preTollSec != null && bellSec < preTollSec && bellSec >= 1 && bellSec <= 5) cue("pretoll");
              preTollSec = bellSec;
            }
          }
          view.acc += sdt;
          // The bell, spawn/withdrawal, income,
          // territory/sight, mines, fog, dead-bag release, the pool rebuild,
          // stepDepot, the possessed triggers, the event drain, the census
          // and the market all moved into tickWar — one call per fixed
          // sub-step below. TickFlags tells the component which renderer
          // twins to refresh.
          let terrFlagged = false, dressFlagged = false;
          const frameEvents = [];
          const pSim0 = perf ? performance.now() : 0; // stopwatch: sim bracket opens
          let guard = 0;
          while (view.acc >= STEP && guard++ < 6) {
            view.acc -= STEP;
            const { events, flags } = tickWar(war, STEP, input);
            frameEvents.push(...events);
            if (flags.bell) { view.teachFire("bell"); run.manifest.armedAtWall = performance.now() / 1000 + PENDING_ARM_S; }
            if (flags.territory) terrFlagged = true;
            if (flags.dressing) dressFlagged = true;
            if (flags.withdrew) toast("THEY BREAK CONTACT");
            if (flags.teslaFired) view._teslaFired = (view._teslaFired || 0) + 1;
            for (const e of events) if (e.type === "kill") view.teachFire("kill_price");
          }
          if (perf) pSim = performance.now() - pSim0; // ...and closes
          if (view.acc > STEP * 6) view.acc = 0;
          // grid-line retint + terrain fog wash: same 4Hz cadence as the
          // territory field itself, not per frame (see renderer.js
          // updateTerritory/retintTerritory/updateFogWash).
          if (terrFlagged && R.updateTerritory) R.updateTerritory();
          // TRIGGERS — a 4Hz game-layer step, beside the territory
          // accumulator (NOT per sim tick). Cheap: setMines only rewrites the
          // two instanced pools when a device actually fired this tick.
          if (terrFlagged) R.setMines(run.mines);
          // map.TOWN FLAGS — holder-colored, render-only; neutral and
          // contested ground fly nothing, ruined buildings fly nothing
          // (they already pay nothing — economy.js payTown). Territory
          // cadence; derived, never saved.
          if (terrFlagged && R.setTownFlags) {
            const rows = [];
            for (const b of town) {
              const m = townFlagMeta.get(b.id);
              if (!m || m.depot || m.fwall || m.marker || b.ruined) continue;
              const c = map.invW(b.x, b.z);
              const h = holderAt(T, c.u, c.v);
              if (h !== 1 && h !== 2) continue;
              rows.push({ x: b.x, y: field.heightAt(b.x, b.z) + m.ny * MASON.pitch, z: b.z, team: h });
            }
            R.setTownFlags(rows);
          }
          // THE GREEN THREADS — every friendly ordered path,
          // green on the ground, refreshed with the other derived overlays.
          if (terrFlagged) {
            const paths = [];
            for (const sq of run.squads) {
              if (!sq.dest || sq.ridingIn != null) continue;
              if (sq.order !== "move" && sq.order !== "attack" && sq.order !== "build" && sq.order !== "patrol") continue;
              paths.push({ pts: [{ x: sq.anchor.x, z: sq.anchor.z }, ...(sq._route || []), { x: sq.dest.x, z: sq.dest.z }] });
            }
            for (const b of world.bodies) {
              if (b.kind !== "vehicle" || !b.alive || b.team !== 1 || !b.dest) continue;
              if (b.order !== "move" && b.order !== "patrol" && b.order !== "escort") continue;
              paths.push({ pts: [{ x: b.pos.x, z: b.pos.z }, ...(b._route || []), { x: b.dest.x, z: b.dest.z }] });
            }
            R.overlay.setOrderPaths(paths);
          }
          // A davy burst carved the ground, or a rock
          // breached — re-lay the rock dressing so surviving boulders sink
          // to the new surface instead of floating over the crater.
          if (dressFlagged) { R.setDressing({ rocks: rocksLive, ponds: map.PONDS, streams: streamRibs }); toast("THE RIDGE IS BREACHED"); }
          // THE MOVED BLOCK: selection pruning is view
          // work — it left stepDepot and lands here, once per frame instead
          // of once per sim tick (a presentation-only cadence change).
          if (view.selSquadIds) { view.selSquadIds = view.selSquadIds.filter((id) => run.squads.some((q) => q.id === id)); if (view.selSquadIds.length < 2) view.selSquadIds = null; }
          if (view.selSquadId != null && !run.squads.some((q) => q.id === view.selSquadId)) {
            const nextId = view.selSquadIds ? view.selSquadIds.find((id) => id !== view.selSquadId) : null; // the group promotes its next squad
            if (nextId != null) view.selSquadId = nextId;
            else { view.selSquadId = null; view.orderMode = null; view.buildPt0 = null; view.selSquadIds = null; }
          }
          const evs = frameEvents;
          for (const e of evs) if (e.type === "zap") view._teslaZaps = (view._teslaZaps || 0) + 1;
          // ...and the frame's audio-only cues join the stream here, after the
          // wipe that would have eaten them (see the cue queue above).
          if (cues.length) { for (const c of cues) evs.push(c); cues.length = 0; }
          R.consume(evs);
          A.setListener(run.focus.x, run.focus.z, 46 / Math.max(0.6, run.zoom));
          A.consume(evs);
          A.tick(world, dt);
          // The reticle draws through its own red
          // ring, and the build hover never paints while possessed.
          // THE TRUE RETICLE — the ring is the LANDING BOUND: center at the
          // predicted impact (predictRing — the engine's own flight
          // arithmetic), radius at applyScatter's hard cap. No shot can
          // land outside it. For a squad the bound is drawn from the
          // farthest living shooter — every member's cone lands inside.
          R.setGrenades(world._grenades, world.t); // the grenade is seen — green, blinking red, quickening
          R.setGreenFog(run.fog, world.t); // the poison ground, seen
          let rr9 = 1.2, hit9 = null, ctr9 = null, pts9 = null;
          if (input.possess && input.reticle) {
            const P9 = input.possess;
            let spec9 = null, pb0 = null;
            if (P9.kind === "squad") {
              const sq9 = run.squads.find((q) => q.id === P9.id); spec9 = sq9 ? INFANTRY_ARMS[sq9.type] : null;
              if (sq9) for (const id of sq9.memberIds) {
                const u = world.byId.get(id);
                if (u && u.alive && u.role !== "spotter" && (!pb0 || Math.hypot(u.pos.x - input.reticle.x, u.pos.z - input.reticle.z) > Math.hypot(pb0.pos.x - input.reticle.x, pb0.pos.z - input.reticle.z))) pb0 = u;
              }
            }
            else { pb0 = world.byId.get(P9.id); if (pb0) spec9 = P9.kind === "tower" ? TOWER_SPECS[pb0.towerType] : P9.kind === "vehicle" ? BISON_FIRE.gun : null; }
            const rc9 = possessCenter();
            if (spec9 && spec9.acc != null && rc9) {
              const aim9 = { x: input.reticle.x, y: input.reticle.y != null ? input.reticle.y : field.heightAt(input.reticle.x, input.reticle.z), z: input.reticle.z }; // the surface itself — no phantom
              const muzzle9 = pb0 && P9.kind === "vehicle" ? barrelTip(pb0, aim9, spec9, pb0.vtype === "tank" ? BARRELS.tank : BARRELS.bison)
                                  : pb0 ? { x: pb0.pos.x, y: pb0.pos.y + (P9.kind === "tower" ? pb0.hy + 0.45 : 0.5), z: pb0.pos.z }
                                  : { x: rc9.x, y: field.heightAt(rc9.x, rc9.z) + 0.5, z: rc9.z };
              const sig9 = scatterSigma(world, muzzle9, aim9, { ...spec9, acc: spec9.acc * POSSESS_ACC });
              const pr9 = predictRing(T.sight, muzzle9, aim9, spec9, sig9, world.wind, map.invW);
              ctr9 = pr9.center;
              rr9 = Math.max(0.4, pr9.r);
              pts9 = pr9.pts;
              hit9 = pr9.center.wall ? { y: pr9.center.y, yaw: Math.atan2(pr9.rawDir.x, pr9.rawDir.z) } : null;
              // A possessed gun's barrel wears the live pitch.
              if (pb0) pb0._aimPitch = Math.asin(Math.max(-1, Math.min(1, pr9.rawDir.y)));
            }
          }
          R.overlay.setReticle(!!(input.possess && input.reticle),
            ctr9 ? ctr9.x : (input.reticle ? input.reticle.x : 0), ctr9 ? ctr9.z : (input.reticle ? input.reticle.z : 0),
            ctr9 ? ctr9.y : (input.reticle ? field.heightAt(input.reticle.x, input.reticle.z) : 0), rr9, hit9, pts9);
          if (!input.possess && view.hover) {
            R.overlay.setHover(true, view.hover.x, view.hover.z, field.heightAt(view.hover.x, view.hover.z), view.hover.range, view.hover.valid, map.GRID_CS);
          }
          else R.overlay.setHover(false);
          // THE PLACEMENT ZONE — its own ~4Hz WALL-time tick (the deal
          // phase runs with the sim frozen, so sdt can never drive it).
          zoneAcc += dt;
          if (zoneAcc >= 0.25) { zoneAcc = 0; refreshZone(); }
          if (view.pending) {
            const P0 = view.pending;
            R.overlay.setPending(true, P0.wp.x, P0.y, P0.wp.z, P0.poly, P0.ringR, P0.color, P0.fp);
          } else R.overlay.setPending(false);
          if (R.overlay.setReach) {
            // One overlay slot, one look: squad fan wins if a squad is
            // selected, else the inspected tower's cached fan.
            const fan = view.selReach || (view.inspectReach && view.inspectReach.pts ? view.inspectReach : null);
            if (fan) R.overlay.setReach(true, fan.cx, field.heightAt(fan.cx, fan.cz), fan.cz, fan.pts, 0xffd27a);
            else R.overlay.setReach(false);
          }
          // THE MECH: the trajectory preview, ported from
          // MechRange.jsx :418-441 — a low-passed ballistic arc from muzzle
          // to the commanded range, drawn through the war renderer's own
          // R.setTraj. Render-only; cleared on release (input.releasePossession).
          if (input.possess && input.possess.kind === "mech") {
            const pmR = world.byId.get(input.possess.id);
            if (pmR && pmR.mechRef) {
              try {
                const mech = pmR.mechRef;
                const raw = mechAimDir(world, mech);
                if (!view.pv) view.pv = { m: { ...raw.muzzle }, d: { ...raw.dir } };
                const k3 = Math.min(1, dt / 0.45);
                for (const ax of ["x", "y", "z"]) {
                  view.pv.m[ax] += (raw.muzzle[ax] - view.pv.m[ax]) * k3;
                  view.pv.d[ax] += (raw.dir[ax] - view.pv.d[ax]) * k3;
                }
                const dn = Math.hypot(view.pv.d.x, view.pv.d.y, view.pv.d.z) || 1;
                const muzzle = view.pv.m, dir = { x: view.pv.d.x / dn, y: view.pv.d.y / dn, z: view.pv.d.z / dn };
                const pts = [];
                let px = muzzle.x, py = muzzle.y, pz = muzzle.z;
                let vx = dir.x * 120, vy = dir.y * 120, vz = dir.z * 120;
                let hitIdx = -1;
                const st2 = ((mech.aimRange || 26) / 120) / 14;
                for (let k2 = 0; k2 < 22; k2++) {
                  pts.push({ x: px, y: py, z: pz });
                  vy -= 9.81 * st2;
                  px += vx * st2; py += vy * st2; pz += vz * st2;
                  if (py <= world.field.heightAt(px, pz)) { pts.push({ x: px, y: world.field.heightAt(px, pz), z: pz }); hitIdx = pts.length - 1; break; }
                }
                R.setTraj(pts, hitIdx);
              } catch (e) {}
            }
          }
          // The draw gate is gone — every frame draws (the
          // evidence run showed physics, not drawing, owns the frame budget).
          {
            const pRen0 = perf ? performance.now() : 0; // stopwatch: draw bracket
            R.render(dt, run.focus, AIM_OFF, 0);
            if (perf) { pRen = performance.now() - pRen0; pDrew = 1; }
            // ✓/✗ screen-space anchor: rotation-proof because it's
            // recomputed from the live camera via project() — Q/E view
            // rotation or a pan moves the cell's projected point, and this
            // just follows it, rather than being pinned once at tap time.
            // Written to a ref-adjacent plain field on view (not React state)
            // so it doesn't force a rerender every frame; the hud tick
            // below (throttled to ~8Hz) is what actually pushes it to React.
            if (view.pending) {
              const P0 = view.pending;
              const nd = R.project ? R.project(P0.wp.x, P0.y + 1.6, P0.wp.z) : null;
              if (nd) {
                const rect = canvas.getBoundingClientRect();
                view.pendingScreen = { x: rect.left + (nd.x * 0.5 + 0.5) * rect.width, y: rect.top + (-nd.y * 0.5 + 0.5) * rect.height };
              } else view.pendingScreen = null;
              // Pan/rotate far enough and the ✓/✗ pair leaves the
              // viewport — an invisible pending that still eats taps. Cancel
              // it out loud the moment its anchor goes off screen.
              if (!pendingButtonsVisible(view.pendingScreen, canvas.getBoundingClientRect())) {
                clearPending(); view.pendingScreen = null; toast("PLACEMENT CANCELLED — MOVED OFF SCREEN");
              }
            } else view.pendingScreen = null;
            // The proposed line's END point only — the
            // buttons live there. Same screen-space recipe as pendingScreen,
            // but going off-screen HIDES the buttons WITHOUT cancelling the
            // pending (the line is big; panning around it is normal work).
            if (view.linePending && R.project) {
              const lp = view.linePending;
              const rect4 = canvas.getBoundingClientRect();
              const nd4 = R.project(lp.b.x, field.heightAt(lp.b.x, lp.b.z) + 1.2, lp.b.z);
              view.lineScreen = nd4 ? { x: rect4.left + (nd4.x * 0.5 + 0.5) * rect4.width, y: rect4.top + (-nd4.y * 0.5 + 0.5) * rect4.height } : null;
            } else view.lineScreen = null;
            // Squad chip + attack-flag anchors: screen-space, recomputed from
            // the live camera (rotation/pan-proof, same rationale as
            // pendingScreen above).
            if (selSq && R.project) {
              const rect2 = canvas.getBoundingClientRect();
              const toScreen = (x, y, z) => {
                const nd = R.project(x, y, z);
                return nd ? { x: rect2.left + (nd.x * 0.5 + 0.5) * rect2.width, y: rect2.top + (-nd.y * 0.5 + 0.5) * rect2.height } : null;
              };
              view.squadScreen = toScreen(sqCx, field.heightAt(sqCx, sqCz) + 2.2, sqCz);
              view.flagScreen = selSq.dest ? toScreen(selSq.dest.x, field.heightAt(selSq.dest.x, selSq.dest.z) + 1.6, selSq.dest.z) : null;
            } else { view.squadScreen = null; view.flagScreen = null; }
            // The Bison's pie anchor — same screen-space recipe,
            // projected off the hull top (the towerScreen recipe).
            if (view.selVehId != null && R.project) {
              const vb = world.byId.get(view.selVehId);
              if (vb && vb.alive) {
                const rect5 = canvas.getBoundingClientRect();
                const nd5 = R.project(vb.pos.x, vb.pos.y + vb.hy + 1.4, vb.pos.z);
                view.vehScreen = nd5 ? { x: rect5.left + (nd5.x * 0.5 + 0.5) * rect5.width, y: rect5.top + (-nd5.y * 0.5 + 0.5) * rect5.height } : null;
              } else view.vehScreen = null;
            } else view.vehScreen = null;
            // The group reticle's anchor — the sweep's centroid of
            // living members, projected fresh every frame (rotation/pan-proof,
            // the squad chip anchor's own recipe). All dead = group clears.
            if (view.groupSel && R.project) {
              const gsA = view.groupSel;
              let gx = 0, gz = 0, gn = 0;
              for (const qid of gsA.sqIds) {
                const gsq = run.squads.find((q) => q.id === qid);
                if (!gsq) continue;
                for (const id of gsq.memberIds) { const u = world.byId.get(id); if (u && u.alive) { gx += u.pos.x; gz += u.pos.z; gn++; } }
              }
              for (const vid of gsA.vehIds) { const gv = world.byId.get(vid); if (gv && gv.alive) { gx += gv.pos.x; gz += gv.pos.z; gn++; } }
              if (gn) {
                const rect6 = canvas.getBoundingClientRect();
                const nd6 = R.project(gx / gn, field.heightAt(gx / gn, gz / gn) + 2.2, gz / gn);
                view.groupScreen = nd6 ? { x: rect6.left + (nd6.x * 0.5 + 0.5) * rect6.width, y: rect6.top + (-nd6.y * 0.5 + 0.5) * rect6.height } : null;
              } else { view.groupSel = null; view.groupOrderMode = null; view.groupScreen = null; }
            } else view.groupScreen = null;
            // The chain's numbered flags — the selected unit's queued
            // legs, projected fresh every frame (a patrol leg flags its near
            // end). Same recipe as every screen anchor above.
            const chainOwner = view.groupSel == null ? (view.selVehId != null ? world.byId.get(view.selVehId) : selSq) : null;
            if (chainOwner && chainOwner._queue && chainOwner._queue.length && R.project) {
              const rect7 = canvas.getBoundingClientRect();
              view.chainScreens = chainOwner._queue.map((q, i) => {
                if (q.kind === "escort") return null; // no ground point — the panel carries it
                const qx = q.kind === "patrol" || q.kind === "line" ? q.ax : q.x, qz = q.kind === "patrol" || q.kind === "line" ? q.az : q.z;
                const nd7 = R.project(qx, field.heightAt(qx, qz) + 1.6, qz);
                return nd7 ? { x: rect7.left + (nd7.x * 0.5 + 0.5) * rect7.width, y: rect7.top + (-nd7.y * 0.5 + 0.5) * rect7.height, i, pat: q.kind === "patrol" ? 1 : 0, line: q.kind === "line" ? 1 : 0 } : null;
              }).filter(Boolean);
            } else view.chainScreens = null;
            // Tower radial anchor: the same screen-space
            // convention as the squad chip anchor above — projected off the
            // tower's top from the live camera every frame, rotation/pan-proof.
            if (view.inspectId && R.project) {
              const ib2 = world.byId.get(view.inspectId);
              if (ib2 && ib2.kind === "tower") {
                const rect3 = canvas.getBoundingClientRect();
                const nd3 = R.project(ib2.pos.x, ib2.pos.y + ib2.hy + 1.2, ib2.pos.z);
                view.towerScreen = nd3 ? { x: rect3.left + (nd3.x * 0.5 + 0.5) * rect3.width, y: rect3.top + (-nd3.y * 0.5 + 0.5) * rect3.height } : null;
              } else view.towerScreen = null;
            } else view.towerScreen = null;
          }
          view.hudT += dt;
          if (view.hudT > 0.12) {
            view.hudT = 0;
            let en = 0, nw = 0, nt = 0;
            for (const b of world.bodies) {
              if (b.kind === "unit" && b.alive && b.team === 2) en++;
              else if (b.kind === "wall") { if (!b.course) nw++; } // the HUD counts WALLS, not courses
              else if (b.kind === "tower") nt++;
            }
            // The idle gate's flag —
            // the war is hot (pools worth building) while any enemy or
            // tower stands, or any squad is fielded. Stashed here (already
            // a full body walk) rather than adding a second one.
            run._hot = en > 0 || nt > 0 || run.squads.length > 0;
            const nowS = performance.now() / 1000;
            view.toasts = view.toasts.filter((t) => nowS - t.t < 2.2);
            setHud({
              // The bell being counted down TO — run.bell is the one that last
              // rang, so the top bar names the next one.
              fps: view.fps, bell: run.bell + 1, bellT: run.bellT, enemies: en,
              stones: R.chunkStats ? `${R.chunkStats().drawn}/${R.chunkStats().cap}` : "",
              resources: Math.floor(run.resources), walls: nw, towers: nt,
              score: { pk: run.score.p.kills, pv: Math.round(run.score.p.value), ek: run.score.e.kills, ev: Math.round(run.score.e.value) },
              lastDispatch: run.lastDispatch,
              // THE LIVING MARKET: the bar and the manifest read
              // prices off this same cache, out to the render each hud tick.
              prices: run._market ? { ...run._market.player } : null,
              // The manifest's mirror. Both cards arm on WORLD time (the
              // trailing-tap law), so the armed flag is computed here on the
              // hud tick exactly the way the pending ✓ already is.
              unlocked: run.manifest.unlocked.slice(),
              manifest: run.manifest.hand.length > 0 ? {
                up: !!run.manifest.cardUp, armed: performance.now() / 1000 >= (run.manifest.armedAtWall ?? 0),
                bell: run.manifest.offerBell,
                hand: run.manifest.hand.map((c) => {
                  const base = (PALETTE_BY_KEY[c.k] || { cost: 10 }).cost;
                  const live = priceNow(c.k, base);
                  return { k: c.k, hire: c.hire, price: c.hire ? live : Math.max(1, Math.ceil(live / 2)) };
                }),
              } : null,
              hiring: view.hirePlace ? { key: view.hirePlace.key, label: (PALETTE_BY_KEY[view.hirePlace.key] || {}).label } : null,
              info: view.infoKey ? { key: view.infoKey, door: view.infoDoor, armed: performance.now() / 1000 >= view.infoArmedWall } : null,
              teach: view._teachQ.length ? { key: view._teachQ[view._teachIdx], i: view._teachIdx, n: view._teachQ.length } : null,
              intel: run.intelUp && run.lastDispatch ? { armed: world.t >= run.intelArmedAt } : null,
              started: run.started, gameOver: run.gameOver, victory: run.victory,
              placing: view._placeQueue ? (view._placeQueue[0] || "done") : null, // place mode must survive the ticker
              drafting: view._draftOpen && run.draft && !view._draftDone ? run.draft.map((c) => ({ k: c.k, plan: c.plan })) : null, // the draft survives the ticker
              endCard: endCardReady(run, world.t),   // the card waits out the collapse
              breach: run.breach, enemyBreach: run.enemyBreach,
              depotStanding: run.depotStanding != null ? run.depotStanding : 1,
              enemyStanding: run.enemyStanding != null ? run.enemyStanding : 1,
              mode: run.mode, sellMode: view.sellMode, sandbagOrient: run.sandbagOrient || 0, devSpawn: view.devSpawn, devDummies: input.devDummies,
              paused: view.paused, speed: view.speed,
              muted: A.muted, fogOn: view.fogOn, windOn: input.windOn, healthOn: view.healthOn, holdAreaOn: !!(run.holdArea && run.holdArea[1]), discipline: input.discipline, seed: map.MAP_SEED,
              toasts: view.toasts.map((t) => t.txt),
              squadSel: (() => {
                const sq = view.selSquadId != null ? run.squads.find((q) => q.id === view.selSquadId) : null;
                if (!sq || !view.squadScreen) return null;
                return { id: sq.id, label: SQUAD_SPECS[sq.type].label, order: sq.order, count: view.selSquadIds ? view.selSquadIds.length : 1, x: view.squadScreen.x, y: view.squadScreen.y, armed: world.t >= view.selArmedAt, aiming: view.orderMode === "attack", aimingMove: view.orderMode === "move",
                  queueOn: view.queueOn, chained: (sq._queue && sq._queue.length) || 0,
                  // The pie is up only while view.pieOpen —
                  // a wedge tap closes it but (for aiming orders) keeps the
                  // squad selected, so the status chip renders on its own.
                  showPie: !!view.pieOpen,
                  // The BUILD chips exist for engineer squads and no
                  // other type, so the row is per-squad-type by construction.
                  engineer: sq.type === "engineers",
                  // The sapper build gate — mirrors the engineer flag above.
                  sapper: sq.type === "sappers",
                  building: view.orderMode === "build_bags" ? "bags" : view.orderMode === "build_walls" ? "walls"
                          : view.orderMode === "build_mines" ? "mines" : view.orderMode === "build_wires" ? "wires" : null,
                  buildStart: !!view.buildPt0,
                  // PATROL rides every squad type
                  // except engineers and sappers (tools, not shooters — the
                  // wedge would order them to walk a line they never fight
                  // on).
                  patrolOk: sq.type !== "engineers" && sq.type !== "sappers",
                  aimingPatrol: view.orderMode === "patrol",
                  // STRUCTURES rides every armed squad
                  // type (an INFANTRY_ARMS row) — not engineers, not sappers,
                  // same population PATROL offers the wedge to. structFirst
                  // is the wedge's lit state.
                  structOk: !!INFANTRY_ARMS[sq.type],
                  structFirst: !!sq.prefStruct,
                  // The squad stays selected while its
                  // line is up for confirmation — the center chip says so.
                  linePending: !!view.linePending };
              })(),
              squadFlag: view.flagScreen ? { x: view.flagScreen.x, y: view.flagScreen.y } : null,
              chainFlags: view.chainScreens, // the queued legs' numbered flags
              chainList: (() => { // the visible queue of commands
                const o = view.groupSel == null ? (view.selVehId != null ? world.byId.get(view.selVehId) : (view.selSquadId != null ? run.squads.find((q) => q.id === view.selSquadId) : null)) : null;
                if (!o || (!view.queueOn && !(o._queue && o._queue.length))) return null;
                const w = (k) => k === "move" ? "MOVE" : k === "attack" ? "ATTACK" : k === "patrol" ? "PATROL" : k === "build" ? "BUILD" : k === "escort" ? "ESCORT" : "DEFEND";
                return { active: w(o.order || "defend"), legs: (o._queue || []).map((q) => q.kind === "line" ? (q.line === "walls" ? "WALLS" : q.line === "bags" ? "BAGS" : q.line === "mines" ? "MINES" : "WIRE") : w(q.kind)) };
              })(),
              // The roster — the living force and its kills, built
              // only while the panel is open.
              roster: view.rosterOpen ? (() => {
                const rows = [];
                for (const sqR of run.squads) {
                  let live = 0;
                  for (const id of sqR.memberIds) { const u = world.byId.get(id); if (u && u.alive) live++; }
                  if (live) rows.push({ kind: "sq", id: sqR.id, label: SQUAD_SPECS[sqR.type].label, n: live, kills: sqR.kills || 0 });
                }
                for (const vb of world.bodies) {
                  if ((vb.kind !== "vehicle" && vb.kind !== "mech") || !vb.alive || vb.team !== 1 || !vb.drv) continue;
                  rows.push({ kind: "veh", id: vb.id, label: vb.kind === "mech" ? "MECH" : vb.vtype === "apc" ? "APC" : vb.vtype === "jeep" ? "JEEP" : "BISON", n: Math.max(1, Math.round(vb.hp)), kills: vb.kills || 0 });
                }
                return rows;
              })() : null,
              // The RELEASE button/
              // POSSESSED chip key off this — null the instant the squad or
              // tower is gone. The stick (data-joy) additionally checks
              // kind !== "tower" — towers don't walk.
              possessed: !input.possess ? null
                : input.possess.kind === "squad" ? (() => { const psq = run.squads.find((q) => q.id === input.possess.id); return psq ? { kind: "squad", label: SQUAD_SPECS[psq.type].label } : null; })()
                : input.possess.kind === "vehicle" ? (() => { const pv = world.byId.get(input.possess.id); return pv && pv.alive ? { kind: "vehicle", vtype: pv.vtype, gear: pv.gear || "2h", label: pv.vtype === "apc" ? "APC" : pv.vtype === "jeep" ? "JEEP" : "BISON" } : null; })()
                : input.possess.kind === "mech" ? (() => {
                    const pm = world.byId.get(input.possess.id);
                    if (!pm || !pm.alive || !pm.mechRef) return null;
                    return { kind: "mech", label: "MECH",
                      mslCd: Math.max(0, 6 - (world.t - (pm.mechRef._lastMsl ?? -99))),
                      brgCd: Math.max(0, 30 - (world.t - (pm.mechRef._lastBar ?? -99))),
                      aimRange: pm.mechRef.aimRange || 26 };
                  })()
                : (() => { const ptw = world.byId.get(input.possess.id); return ptw && ptw.kind === "tower" ? { kind: "tower", label: TOWER_SPECS[ptw.towerType].label } : null; })(),
              // The Bison's own pie, projected off the hull top (the
              // towerScreen recipe) — null unless a vehicle is selected.
              vehRadial: (() => {
                if (view.selVehId == null || !view.vehScreen) return null;
                const v = world.byId.get(view.selVehId);
                if (!v || !v.alive) return null;
                return { id: v.id, x: view.vehScreen.x, y: view.vehScreen.y, order: v.order || "defend", tracks: v.tracks || "careful",
                  kind: v.kind, vtype: v.vtype, seatsFree: v.vtype === "apc" || v.vtype === "jeep" ? seatsOf(v) - apcSeated(world, run.squads, v.apcSeq) : 0,
                  riders: v.vtype === "apc" || v.vtype === "jeep" ? apcSeated(world, run.squads, v.apcSeq) : 0, aimingLoad: view.vehOrderMode === "load",
                  aimingMove: view.vehOrderMode === "move", aimingAttack: view.vehOrderMode === "attack", aimingPatrol: view.vehOrderMode === "patrol", aimingEscort: view.vehOrderMode === "escort",
                  queueOn: view.queueOn, chained: (v._queue && v._queue.length) || 0,
                  patrolStart: !!view.buildPt0, armed: world.t >= view.selArmedAt, showPie: !!view.pieOpen, linePending: !!view.linePending };
              })(),
              // The group reticle — three wedges at the sweep's centroid.
              groupRadial: view.groupSel && view.groupScreen ? {
                x: view.groupScreen.x, y: view.groupScreen.y,
                count: view.groupSel.sqIds.length + view.groupSel.vehIds.length,
                aimingMove: view.groupOrderMode === "move", aimingAttack: view.groupOrderMode === "attack",
                armed: world.t >= view.selArmedAt, showPie: !!view.pieOpen,
              } : null,
              // The proposed line's accept/reject pair —
              // survives the end point going off-screen (buttons just hide).
              linePending: view.linePending && view.lineScreen ? {
                x: view.lineScreen.x, y: view.lineScreen.y,
                cost: view.linePending.cost, count: view.linePending.count,
                armed: pendingArmed(view.linePending, world.t), kind: view.linePending.kind,
              } : null,
              pending: view.pending && view.pendingScreen ? {
                x: view.pendingScreen.x, y: view.pendingScreen.y,
                cost: view.pending.cost, armed: pendingArmed(view.pending, world.t),
              } : null,
              inspect: (() => {
                if (!view.inspectId) return null;
                const b = world.byId.get(view.inspectId);
                if (!b) return null;
                const ispec = b.kind === "tower" ? TOWER_SPECS[b.towerType] : null;
                return {
                  id: b.id,
                  label: ispec ? ispec.label : "WALL",
                  hp: Math.max(0, Math.ceil(b.hp)), maxHp: b.maxHp,
                  refund: b.kind === "tower" ? Math.floor(ispec.cost * 0.6) : 3,
                  blurb: ispec ? ispec.blurb : "Bends their road.",
                };
              })(),
              // The tower radial — CAREFUL/FREE toggle
              // (frost towers have no gun, so they skip that slot) and SELL,
              // for the inspected tower only. Walls keep their inspect
              // behavior untouched (no radial).
              towerRadial: (() => {
                if (!view.inspectId || !view.towerScreen) return null;
                const b = world.byId.get(view.inspectId);
                if (!b || b.kind !== "tower") return null;
                const ispec = TOWER_SPECS[b.towerType];
                return {
                  id: b.id, x: view.towerScreen.x, y: view.towerScreen.y,
                  label: ispec.label,
                  discipline: b.discipline || discipline || "careful",
                  refund: Math.floor(ispec.cost * 0.6),
                  // TAKE CONTROL — gun towers
                  // only. Frost's fireRate is 0 (no gun to man).
                  canPossess: ispec.fireRate > 0,
                  showPie: !!view.pieOpen,
                };
              })(),
            });
          }
          if (perf) {
            // stopwatch: one ring slot per rAF, written last so `frame` covers
            // the whole tick. Skipped draws record render 0 with drew false —
            // the reader averages the draw cost over drawn frames only.
            const pNow = performance.now();
            pSampT += dt;
            if (pSampT >= 1) {
              pSampT = 0;
              pBodies = world.bodies.length;
              const cs = R.chunkStats ? R.chunkStats() : null;
              pChunksDrawn = cs ? cs.drawn : 0; pChunksTotal = cs ? cs.total : 0;
            }
            pT[pI] = pNow; pSimA[pI] = pSim; pRenA[pI] = pRen;
            pFrmA[pI] = pNow - pFrame0; pDrewA[pI] = pDrew;
            pI = (pI + 1) % PCAP; pN++;
          }
        } catch (err) {
          console.error("COLDSNAP DEPOT frame failed", err);
          // The overlay names the throwing SITE — "non-finite" alone left the fault anonymous on a phone
          const top = err && err.stack ? String(err.stack).split("\n").slice(0, 3).join(" ⏎ ") : "";
          setFatal(String(err && err.message ? err.message : err) + (top ? " — " + top : ""));
          disposed = true;
        }
      };
      raf = requestAnimationFrame(frame);

      return () => {
        disposed = true;
        cancelAnimationFrame(raf);
        canvas.removeEventListener("pointerdown", onPointerDown);
        canvas.removeEventListener("pointermove", onPointerMove);
        canvas.removeEventListener("pointerup", onPointerUp);
        canvas.removeEventListener("pointercancel", onPointerUp);
        canvas.removeEventListener("contextmenu", onCtxMenu);
        canvas.removeEventListener("wheel", onWheel);
        canvas.removeEventListener("touchstart", blockTouch);
        window.removeEventListener("keydown", kd);
        window.removeEventListener("keyup", ku);
        uninstallHooks();
        A.dispose();
        if (R) R.dispose();
        stateRef.current = null;
      };
    } catch (err) {
      console.error("COLDSNAP DEPOT boot failed", err);
      // The overlay names the throwing SITE — "non-finite" alone left the fault anonymous on a phone
      const top = err && err.stack ? String(err.stack).split("\n").slice(0, 3).join(" ⏎ ") : "";
      setFatal(String(err && err.message ? err.message : err) + (top ? " — " + top : ""));
      if (R) R.dispose();
    }
  }, [isTouch, runId]);

  const setMode = (m) => {
    const C = stateRef.current; if (!C) return;
    if (C.run.gameOver || C.run.victory) return;   // the war is over — nothing left to build
    // Hero keys are ordinary placement modes — no special case.
    // TAP AGAIN TO PUT IT AWAY — the active build button is
    // a toggle; the second tap clears back to plain command.
    if (C.run.mode === m) {
      if (C.view.linePending && C.view.rejectLine) C.view.rejectLine();
      C.run.mode = null; C.view.pending = null; C.view.buildPt0 = null; C.view.devSpawn = null;
      setHud((h) => ({ ...h, mode: null, devSpawn: null }));
      return;
    }
    // Switching build-menu mode with a line still up
    // clears it through the same door ✗ uses (rejectLine also disposes the
    // renderer's preview group) — it never lingers behind the new mode.
    if (C.view.linePending && C.view.rejectLine) C.view.rejectLine();
    C.run.mode = m; C.view.sellMode = false; C.view.inspectId = null; C.view.pending = null; C.view.selSquadId = null; C.view.selSquadIds = null; C.view.orderMode = null; C.view.buildPt0 = null; C.view.devSpawn = null;
    setHud((h) => ({ ...h, mode: m, sellMode: false, devSpawn: null }));
    // The pick arms the bar — the tree lands on the armed type's branch.
    const b = branchOf(m);
    if (b) setBranch(b);
  };
  const toggleSell = () => {
    const C = stateRef.current; if (!C) return;
    if (C.view.linePending && C.view.rejectLine) C.view.rejectLine();
    C.view.sellMode = !C.view.sellMode; C.view.inspectId = null; C.view.pending = null;
    if (C.view.sellMode && C.view.teachFire) C.view.teachFire("sell");
    setHud((h) => ({ ...h, sellMode: C.view.sellMode }));
  };
  // Closing the tree clears back to plain command — the ruled
  // toggle-off, one door for mode, pending, half-given lines, and sell.
  const closeBuild = () => {
    beginPack(null, true);
    const C = stateRef.current; if (!C) return;
    if (C.view.linePending && C.view.rejectLine) C.view.rejectLine();
    C.run.mode = null; C.view.pending = null; C.view.buildPt0 = null; C.view.sellMode = false; C.view.devSpawn = null;
    setHud((h) => ({ ...h, mode: null, sellMode: false, devSpawn: null }));
  };
  const startGame = () => {
    const C = stateRef.current; if (!C) return;
    if (C.view.audio) C.view.audio.ensure();
    if (C.run.draft && C.run.draft.length && !C.view._draftDone) {
      // THE DRAFT — seven cards up, five picks, all free.
      C.view._draftOpen = true;
      if (C.view.teachFire) C.view.teachFire("the_hand");
      setHud((h) => ({ ...h, drafting: C.run.draft.map((c) => ({ k: c.k, plan: c.plan })) }));
      return;
    }
    C.view._placeQueue = null; // the war has begun — the ticker must yield nothing
    C.run.started = true;
    if (C.view.teachFire) C.view.teachFire("desktop_keys");
    setHud((h) => ({ ...h, started: true, placing: null }));
  };
  const toggleMute = () => {
    const C = stateRef.current; if (!C || !C.view.audio) return;
    C.view.audio.ensure();
    C.view.audio.setMuted(!C.view.audio.muted);
    setHud((h) => ({ ...h, muted: C.view.audio.muted }));
  };
  const toggleFog = () => {
    const C = stateRef.current; if (!C || !C.view.setFog) return;
    C.view.setFog(!C.view.fogOn);
    if (C.view.teachFire) C.view.teachFire("fog");
    setHud((h) => ({ ...h, fogOn: C.view.fogOn }));
  };
  const toggleWind = () => {
    const C = stateRef.current; if (!C || !C.view.setWind) return;
    C.view.setWind(!C.input.windOn);
    if (C.view.teachFire) C.view.teachFire("wind");
    setHud((h) => ({ ...h, windOn: C.input.windOn }));
  };
  const toggleHealth = () => {
    const C = stateRef.current; if (!C || !C.view.setHealth) return;
    C.view.setHealth(!C.view.healthOn);
    setHud((h) => ({ ...h, healthOn: C.view.healthOn }));
  };
  // THE SWITCH — area weapons (tesla chain, davy blast) hold fire
  // with a friendly in the spread. Per side; only side 1 (the player) ever
  // flips.
  const toggleHoldArea = () => {
    const C = stateRef.current; if (!C || !C.run.holdArea) return;
    C.run.holdArea[1] = !C.run.holdArea[1];
    if (C.view.teachFire) C.view.teachFire("spare_ours");
    setHud((h) => ({ ...h, holdAreaOn: C.run.holdArea[1] }));
  };
  // THE FIGHT SWITCH — sandbox only, live, any time.
  const toggleDevFight = () => {
    const C = stateRef.current; if (!C) return;
    C.input.devDummies = !C.input.devDummies;
    setHud((h) => ({ ...h, devDummies: C.input.devDummies }));
  };
  // FIRE FEEDBACK: the held state, and the LOOK of the held state,
  // set in one place — direct DOM writes (the joystick knob's discipline, no
  // React state in the hot path). A hold the browser cancels pops the button
  // dark the instant it dies, so a silent drop is visible.
  const setFireHeld = (v) => {
    const C = stateRef.current; if (C) C.input.fireHeld = v;
    if (fireBtnRef.current) {
      fireBtnRef.current.style.background = v ? "#ff6b5e" : "#2a1418";
      fireBtnRef.current.style.color = v ? "#1a0d0f" : "#ff6b5e";
    }
  };
  // The coax MG's held state — mirrors setFireHeld with its own ref.
  const setMgHeld = (v) => {
    const C = stateRef.current; if (C) C.input.mgHeld = v;
    if (mgBtnRef.current) {
      mgBtnRef.current.style.background = v ? "#ffd27a" : "#2a2214";
      mgBtnRef.current.style.color = v ? "#1a1608" : "#ffd27a";
    }
  };
  const sellInspected = () => { const C = stateRef.current; if (C && C.view.inspectId && C.view.sellById) C.view.sellById(C.view.inspectId); };

  // THE ON-DEMAND DOOR — hold a carded control 450ms and
  // its card opens through the market-card door (no pause, nothing marked
  // seen); the release's click is swallowed. Press state rides a ref keyed
  // by card, so the 8Hz interface refresh can't strand a timer.
  const lpRef = useRef({});
  const teachPress = (k) => ({
    onPointerDown: () => { const o = lpRef.current[k] = lpRef.current[k] || {}; o.fired = false; o.t = setTimeout(() => { o.fired = true; const C = stateRef.current; if (C && C.view.openInfo) C.view.openInfo(k, "bar"); }, 450); },
    onPointerUp: () => { const o = lpRef.current[k]; if (o && o.t) clearTimeout(o.t); },
    onPointerLeave: () => { const o = lpRef.current[k]; if (o && o.t) clearTimeout(o.t); },
    onPointerCancel: () => { const o = lpRef.current[k]; if (o && o.t) clearTimeout(o.t); }, // phones cancel pointers (gestures, second fingers) — a cancelled press must not open the card
    onClickCapture: (e) => { const o = lpRef.current[k]; if (o && o.fired) { o.fired = false; e.preventDefault(); e.stopPropagation(); } },
  });

  // The touch stick. Depot-styled port of the
  // sandbox's own joystick — radius
  // 56, deadzone 0.15, knob clamped to the radius and following the finger.
  // Unlike the sandbox's stick (a decorative pair with pointerEvents:none,
  // driven by a window-level proximity test) this one is its OWN real DOM
  // hit target, sitting above the canvas: a pointerdown on it never reaches
  // the canvas's pan/tap handlers at all (sibling elements, not ancestor/
  // descendant — the browser's own hit-test already settles it), and
  // setPointerCapture below pins every subsequent move/up to it too, so a
  // drag that strays off the knob still can't leak to the canvas underneath.
  const JOY_R = 56;
  const joyDz = (v) => (Math.abs(v) < 0.15 ? 0 : (v - Math.sign(v) * 0.15) / 0.85);
  const moveJoy = (e) => {
    const C = stateRef.current;
    if (!C || !C.view.joy || !C.view.joy.active) return;
    const r = e.currentTarget.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    let dx = e.clientX - cx, dy = e.clientY - cy;
    const L = Math.hypot(dx, dy);
    if (L > JOY_R) { dx *= JOY_R / L; dy *= JOY_R / L; }
    if (joyKnobRef.current) { joyKnobRef.current.style.left = 70 + dx - 22 + "px"; joyKnobRef.current.style.top = 70 + dy - 22 + "px"; }
    C.view.joy.t = joyDz(-dy / JOY_R);
    C.view.joy.s = joyDz(dx / JOY_R);
  };
  const releaseJoy = () => {
    const C = stateRef.current;
    if (C) C.view.joy = { active: false, t: 0, s: 0 };
    if (joyKnobRef.current) { joyKnobRef.current.style.left = "48px"; joyKnobRef.current.style.top = "48px"; }
  };
  // The right stick — same math, own knob ref, own
  // live state (view.joyR), mirrored from moveJoy/releaseJoy above.
  const moveJoyR = (e) => {
    const C = stateRef.current;
    if (!C || !C.view.joyR || !C.view.joyR.active) return;
    const r = e.currentTarget.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    let dx = e.clientX - cx, dy = e.clientY - cy;
    const L = Math.hypot(dx, dy);
    if (L > JOY_R) { dx *= JOY_R / L; dy *= JOY_R / L; }
    if (joyRKnobRef.current) { joyRKnobRef.current.style.left = 70 + dx - 22 + "px"; joyRKnobRef.current.style.top = 70 + dy - 22 + "px"; }
    C.view.joyR.t = joyDz(-dy / JOY_R);
    C.view.joyR.s = joyDz(dx / JOY_R);
  };
  const releaseJoyR = () => {
    const C = stateRef.current;
    if (C) C.view.joyR = { active: false, t: 0, s: 0 };
    if (joyRKnobRef.current) { joyRKnobRef.current.style.left = "48px"; joyRKnobRef.current.style.top = "48px"; }
  };

  // The bar shows the UNLOCKED set and nothing else: a locked
  // item does not render at all — no greyed teasers, because the manifest
  // card IS the reveal. PALETTE's own order is preserved, so an item always
  // arrives in the same slot position it will keep for the rest of the match.
  const unlocked = hud.unlocked || [];
  const palette = PALETTE.filter((p) => unlocked.indexOf(p.key) >= 0);

  // THE LATTICE's rung tags — a rack tag (foes) or a palette tag,
  // today's whole bodies carried over verbatim, packing appended on tap.
  const renderLatticeTag = (cat, k, ti, ri) => {
    const entranceDelay = (0.17 + ri * 0.06 + ti * 0.035) + "s";
    const tilt = ti % 2 ? 1.5 : -2;
    const packStyle = packing ? { animation: "cs-pack 0.12s ease-in forwards", animationDelay: (ti * 0.02) + "s" } : {};
    if (cat === "foes") {
      const f = FOE_RACK.find((x) => x.key === k);
      if (!f) return null;
      return (
        <StockTag key={f.key} data-foe-key={f.key}
          tilt={tilt} delay={entranceDelay}
          style={{ minWidth: isTouch ? 56 : 52, borderColor: hud.devSpawn === f.key ? "#ff6b5e" : "#8f8768", background: hud.devSpawn === f.key ? "#d8c9a5" : "#cfc6a5", ...packStyle }}
          onClick={() => {
            const C = stateRef.current; if (!C) return;
            C.view.devSpawn = C.view.devSpawn === f.key ? null : f.key;
            C.run.mode = null; C.view.pending = null; C.view.sellMode = false;
            setHud((h) => ({ ...h, devSpawn: C.view.devSpawn, mode: null, sellMode: false }));
            beginPack(null, true);
          }}>
          <div style={{ fontSize: 15 }}>{f.icon}</div>
          <div>{f.label}</div>
          <div style={{ color: "#8a2f2f", fontSize: 10, fontWeight: 600 }}>ENEMY</div>
        </StockTag>
      );
    }
    const p = palette.find((x) => x.key === k);
    if (!p) return null;
    const k2 = p.key;
    const sel = !hud.sellMode && hud.mode === k2;
    const priceP = hud.prices?.[k2] ?? p.cost;
    const afford = hud.resources >= priceP;
    return (
      <StockTag key={cat + ":" + k2} data-tower-key={k2}
        tilt={tilt} delay={entranceDelay}
        style={{ minWidth: isTouch ? 56 : 52, opacity: afford ? 1 : 0.45, borderColor: sel ? "#2f7a44" : "#8f8768", background: sel ? "#d3d6a8" : "#cfc6a5", ...packStyle }}
        onClick={() => { setMode(k2); beginPack(null, true); }}>
        <div data-info={k2} onClick={(e) => { e.stopPropagation(); const C = stateRef.current; if (C && C.view.openInfo) C.view.openInfo(k2, "bar"); }}
          style={{ position: "absolute", top: 1, right: 3, fontSize: 12, opacity: 0.6, padding: "2px 4px", cursor: "pointer" }}>ⓘ</div>
        <div style={{ fontSize: 15 }}>{p.icon}</div>
        <div>{p.label}</div>
        <div style={{ color: "#7a5a1e" }}>◆{priceP}</div>
      </StockTag>
    );
  };

  return (
    <div style={P.root}>
      <canvas key={runId} ref={canvasRef} style={P.cv} />
      {hud.possessed && (
        <div data-possessed-chip style={{ position: "absolute", top: 8, left: "50%", transform: "translateX(-50%)", zIndex: 6, background: "rgba(14,18,24,0.88)", border: "1px solid #7dffa8", color: "#7dffa8", borderRadius: 6, padding: "3px 12px", fontSize: 12, letterSpacing: 1, pointerEvents: "none" }}>
          POSSESSED — {hud.possessed.label}
        </div>
      )}
      {/* No stick for towers — they don't walk. */}
      {isTouch && hud.possessed && hud.possessed.kind !== "tower" && (
        <div data-joy
          style={{ position: "absolute", left: 92 - 70, bottom: 128 - 70, width: 140, height: 140, zIndex: 7, touchAction: "none" }}
          onPointerDown={(e) => {
            e.stopPropagation();
            e.currentTarget.setPointerCapture(e.pointerId);
            const C = stateRef.current; if (!C) return;
            C.view.joy = { active: true, t: 0, s: 0 };
            moveJoy(e);
          }}
          onPointerMove={(e) => { e.stopPropagation(); moveJoy(e); }}
          onPointerUp={(e) => { e.stopPropagation(); releaseJoy(); }}
          onPointerCancel={(e) => { e.stopPropagation(); releaseJoy(); }}
        >
          <div style={{ position: "absolute", left: 70 - 56, top: 70 - 56, width: 112, height: 112, borderRadius: "50%", border: "2px solid rgba(125,255,168,0.55)", background: "rgba(20,24,30,0.35)", pointerEvents: "none" }} />
          <div ref={joyKnobRef} style={{ position: "absolute", left: 48, top: 48, width: 44, height: 44, borderRadius: "50%", background: "rgba(125,255,168,0.75)", border: "2px solid #7dffa8", pointerEvents: "none" }} />
        </div>
      )}
      {/* The right stick — steers the reticle.
          Shown for BOTH possessed kinds (towers have no left stick, so this
          is their whole interface). */}
      {isTouch && hud.possessed && (
        <div data-joyr
          style={{ position: "absolute", right: 92 - 70, bottom: 208 - 70, width: 140, height: 140, zIndex: 7, touchAction: "none" }}
          onPointerDown={(e) => {
            e.stopPropagation();
            e.currentTarget.setPointerCapture(e.pointerId);
            const C = stateRef.current; if (!C) return;
            C.view.joyR = { active: true, t: 0, s: 0 };
            moveJoyR(e);
          }}
          onPointerMove={(e) => { e.stopPropagation(); moveJoyR(e); }}
          onPointerUp={(e) => { e.stopPropagation(); releaseJoyR(); }}
          onPointerCancel={(e) => { e.stopPropagation(); releaseJoyR(); }}
        >
          <div style={{ position: "absolute", left: 70 - 56, top: 70 - 56, width: 112, height: 112, borderRadius: "50%", border: "2px solid rgba(125,255,168,0.55)", background: "rgba(20,24,30,0.35)", pointerEvents: "none" }} />
          <div ref={joyRKnobRef} style={{ position: "absolute", left: 48, top: 48, width: 44, height: 44, borderRadius: "50%", background: "rgba(125,255,168,0.75)", border: "2px solid #7dffa8", pointerEvents: "none" }} />
        </div>
      )}
      {hud.possessed && (
        <button data-possess-release
          style={{ ...P.btnBig, position: "absolute", right: 16, bottom: 16, zIndex: 7, borderColor: "#ffb45e", color: "#ffb45e", fontWeight: "bold" }}
          onClick={() => stateRef.current && stateRef.current.input.releasePossession()}>
          RELEASE
        </button>
      )}
      {hud.possessed && hud.possessed.kind === "vehicle" && hud.possessed.vtype === "jeep" && (
        <button data-jeep-gear
          style={{ ...P.btnBig, position: "absolute", right: 16, bottom: 68, zIndex: 7, borderColor: hud.possessed.gear === "4l" ? "#ffd27a" : "#7fd7ff", color: hud.possessed.gear === "4l" ? "#ffd27a" : "#7fd7ff", fontWeight: "bold" }}
          onClick={() => stateRef.current && stateRef.current.view.toggleGear()}>
          {hud.possessed.gear === "4l" ? "4L" : "2H"}
        </button>
      )}
      {/* FIRE: hold-to-repeat, like the
          sandbox's own trigger. Sets input.fireHeld; the sim bracket (frame loop)
          is what actually attempts a volley, at most once per sim tick. */}
      {isTouch && hud.possessed && (
        <button data-possess-fire ref={fireBtnRef}
          style={{ ...P.btnBig, position: "absolute", right: 132, bottom: 16, zIndex: 7, width: 64, height: 64, borderRadius: "50%", borderColor: "#ff6b5e", color: "#ff6b5e", fontWeight: "bold", background: "#2a1418", touchAction: "none" }}
          onPointerDown={(e) => { e.stopPropagation(); e.currentTarget.setPointerCapture(e.pointerId); setFireHeld(true); }}
          onPointerUp={(e) => { e.stopPropagation(); setFireHeld(false); }}
          onPointerCancel={(e) => { e.stopPropagation(); setFireHeld(false); }}>
          FIRE
        </button>
      )}
      {/* The Bison's coax — vehicle possession only, beside FIRE.
          Not the APC — one gun, FIRE alone. */}
      {isTouch && hud.possessed && hud.possessed.kind === "vehicle" && hud.possessed.vtype !== "apc" && hud.possessed.vtype !== "jeep" && (
        <button data-possess-mg ref={mgBtnRef}
          style={{ ...P.btnBig, position: "absolute", right: 208, bottom: 16, zIndex: 7, width: 64, height: 64, borderRadius: "50%", borderColor: "#ffd27a", color: "#ffd27a", fontWeight: "bold", background: "#2a2214", touchAction: "none" }}
          onPointerDown={(e) => { e.stopPropagation(); e.currentTarget.setPointerCapture(e.pointerId); setMgHeld(true); }}
          onPointerUp={(e) => { e.stopPropagation(); setMgHeld(false); }}
          onPointerCancel={(e) => { e.stopPropagation(); setMgHeld(false); }}>
          MG
        </button>
      )}
      {/* THE MECH: PUNT/MSL/BRG stack above FIRE, cooldown-grey on
          MSL/BRG; the range slider + trim pair set view.mechAimRange/mechAimHeld,
          consumed by feedMechCommands at sim-tick cadence. */}
      {isTouch && hud.possessed && hud.possessed.kind === "mech" && (
        <>
          <button data-mech-punt
            onPointerDown={(e) => { e.stopPropagation(); const C = stateRef.current; if (C) (C.input.mechWant || (C.input.mechWant = {})).punt = true; }}
            style={{ ...P.btnBig, position: "absolute", right: 132, bottom: 100, zIndex: 7, touchAction: "none" }}>
            PUNT
          </button>
          <button data-mech-msl
            onPointerDown={(e) => { e.stopPropagation(); const C = stateRef.current; if (C) (C.input.mechWant || (C.input.mechWant = {})).msl = true; }}
            style={{ ...P.btnBig, position: "absolute", right: 132, bottom: 152, zIndex: 7, touchAction: "none", opacity: hud.possessed.mslCd > 0.1 ? 0.5 : 1, color: hud.possessed.mslCd > 0.1 ? "#7a6055" : "#e8c9b8" }}>
            {hud.possessed.mslCd > 0.1 ? "▲▲ " + Math.ceil(hud.possessed.mslCd) + "s" : "▲▲ MSL"}
          </button>
          <button data-mech-brg
            onPointerDown={(e) => { e.stopPropagation(); const C = stateRef.current; if (C) (C.input.mechWant || (C.input.mechWant = {})).brg = true; }}
            style={{ ...P.btnBig, position: "absolute", right: 132, bottom: 204, zIndex: 7, touchAction: "none", opacity: hud.possessed.brgCd > 0.1 ? 0.5 : 1, color: hud.possessed.brgCd > 0.1 ? "#7a6055" : "#e8c9b8" }}>
            {hud.possessed.brgCd > 0.1 ? "▲▲▲ " + Math.ceil(hud.possessed.brgCd) + "s" : "▲▲▲ BRG"}
          </button>
          <div data-mech-rangeslider
            onPointerDown={(e) => {
              e.stopPropagation(); e.currentTarget.setPointerCapture(e.pointerId);
              const C = stateRef.current; if (!C) return;
              C.view._mechRngGrab = true;
              const r = e.currentTarget.getBoundingClientRect();
              C.view.mechAimRange = 6 + Math.max(0, Math.min(1, (r.bottom - e.clientY) / r.height)) * 74;
            }}
            onPointerMove={(e) => {
              e.stopPropagation();
              const C = stateRef.current; if (!C || !C.view._mechRngGrab) return;
              const r = e.currentTarget.getBoundingClientRect();
              C.view.mechAimRange = 6 + Math.max(0, Math.min(1, (r.bottom - e.clientY) / r.height)) * 74;
            }}
            onPointerUp={(e) => { e.stopPropagation(); const C = stateRef.current; if (C) C.view._mechRngGrab = false; }}
            onPointerCancel={(e) => { e.stopPropagation(); const C = stateRef.current; if (C) C.view._mechRngGrab = false; }}
            style={{ position: "absolute", right: 12, bottom: 292, width: 44, height: 150, borderRadius: 8, background: "rgba(28,33,41,0.75)", border: "1px solid #7a6a4e", touchAction: "none", zIndex: 7 }}>
            <div style={{ position: "absolute", left: 20, top: 6, bottom: 6, width: 3, background: "#5f6e80" }} />
            <div style={{ position: "absolute", left: 4, width: 36, height: 22, borderRadius: 5, background: "#b89a5e", bottom: Math.max(0, Math.min(128, ((hud.possessed.aimRange - 6) / 74) * 128)) }} />
          </div>
          <div style={{ position: "absolute", right: 8, bottom: 446, width: 52, textAlign: "center", color: "#e8d9b8", fontSize: 13, textShadow: "0 1px 2px #000", zIndex: 7, pointerEvents: "none" }}>{Math.round(hud.possessed.aimRange)}m</div>
          <button data-mech-aiml
            onPointerDown={(e) => { e.stopPropagation(); const C = stateRef.current; if (C) C.view.mechAimHeld = -1; }}
            onPointerUp={(e) => { e.stopPropagation(); const C = stateRef.current; if (C) C.view.mechAimHeld = 0; }}
            onPointerLeave={() => { const C = stateRef.current; if (C) C.view.mechAimHeld = 0; }}
            onPointerCancel={() => { const C = stateRef.current; if (C) C.view.mechAimHeld = 0; }}
            style={{ ...P.btnBig, position: "absolute", left: "calc(50% - 100px)", bottom: 16, width: 56, zIndex: 7, touchAction: "none" }}>{"◀"}</button>
          <button data-mech-aimr
            onPointerDown={(e) => { e.stopPropagation(); const C = stateRef.current; if (C) C.view.mechAimHeld = 1; }}
            onPointerUp={(e) => { e.stopPropagation(); const C = stateRef.current; if (C) C.view.mechAimHeld = 0; }}
            onPointerLeave={() => { const C = stateRef.current; if (C) C.view.mechAimHeld = 0; }}
            onPointerCancel={() => { const C = stateRef.current; if (C) C.view.mechAimHeld = 0; }}
            style={{ ...P.btnBig, position: "absolute", left: "calc(50% + 44px)", bottom: 16, width: 56, zIndex: 7, touchAction: "none" }}>{"▶"}</button>
        </>
      )}
      <div style={P.top}>
        <div style={P.stat} {...teachPress("scrap")}><span style={{ color: "#ffd27a" }}>◆</span>{hud.resources}</div>
        {!dev && (
          <div data-bell style={{ ...P.stat, cursor: hud.lastDispatch ? "pointer" : "default" }}
            onClick={() => { if (hud.lastDispatch) setRereadDispatch(true); }}
            title={hud.lastDispatch ? "re-read last dispatch" : undefined}
            {...teachPress("bell")}>
            BELL {hud.bell} · {clockStr(hud.bellT)}
          </div>
        )}
        <div style={P.stat}>☠ {hud.enemies}</div>
        <div data-score style={P.stat} title="the match score — kills and value destroyed, yours then the enemy's" {...teachPress("kill_price")}>
          <span style={{ color: "#7dffa8" }}>⚔ {hud.score.pk} ◆{hud.score.pv}</span>
          <span style={{ opacity: 0.5 }}>·</span>
          <span style={{ color: "#ff7a7a" }}>{hud.score.ek} ◆{hud.score.ev}</span>
        </div>
        {/* The dismissed manifest waits here — and only until the next bell,
            which re-pools the offer. A skipped bell is a skipped pick. */}
        {hud.manifest && !hud.manifest.up && !hud.gameOver && !hud.victory && (
          <div data-manifest-chip style={{ ...P.stat, cursor: "pointer", borderColor: "#ffd27a", color: "#ffd27a" }}
            title="the convoy is still waiting on your pick"
            onClick={() => { const C = stateRef.current; if (C && C.view.openManifest) C.view.openManifest(); }}>
            ⛊ MANIFEST
          </div>
        )}
        {hud.started && !hud.victory && !hud.gameOver && (
          <>
            <button style={{ ...P.btn, padding: isTouch ? "5px 10px" : "4px 10px", borderColor: hud.paused ? "#ffd27a" : "#48515f", color: hud.paused ? "#ffd27a" : "#e6ebf1" }}
              onClick={() => { const C = stateRef.current; if (C) { C.view.paused = !C.view.paused; setHud((h) => ({ ...h, paused: C.view.paused })); } }}>
              {hud.paused ? "▶" : "❚❚"}
            </button>
            <button style={{ ...P.btn, padding: isTouch ? "5px 10px" : "4px 10px", borderColor: hud.speed > 1 ? "#7fd7ff" : "#48515f" }}
              onClick={() => { const C = stateRef.current; if (C) { C.view.speed = C.view.speed > 1 ? 1 : 2; setHud((h) => ({ ...h, speed: C.view.speed })); } }}>
              {hud.speed > 1 ? "2×" : "1×"}
            </button>
          </>
        )}
        {dev && (
          <button data-dev-reroll style={{ ...P.btn, marginLeft: "auto", padding: isTouch ? "5px 10px" : "4px 10px", borderColor: "#c9a04e", color: "#ffd27a" }} title="a fresh random valley — everything here is discarded" onClick={restart}>
            NEW VALLEY
          </button>
        )}
        {dev && (
          <button data-dev-fight style={{ ...P.btn, padding: isTouch ? "5px 10px" : "4px 10px", borderColor: hud.devDummies ? "#48515f" : "#ff6b5e", color: hud.devDummies ? "#e6ebf1" : "#ff6b5e" }} title="whether placed enemies fight back — flips live" onClick={toggleDevFight}>
            {hud.devDummies ? "THEY STAND" : "THEY FIGHT"}
          </button>
        )}
        <button style={{ ...P.btn, marginLeft: dev ? undefined : "auto", padding: isTouch ? "5px 10px" : "4px 10px" }} title="rotate view (Q/E)"
          onClick={() => { const C = stateRef.current; if (C && C.view.rotate) C.view.rotate(1); }}>⟳</button>
        <button style={{ ...P.btn, padding: isTouch ? "5px 10px" : "4px 10px", borderColor: hud.fogOn ? "#7fd7ff" : "#48515f", opacity: hud.fogOn ? 1 : 0.6 }} title="fog of war (visual only)" onClick={toggleFog} {...teachPress("fog")}>
          FOG {hud.fogOn ? "ON" : "OFF"}
        </button>
        <button data-health style={{ ...P.btn, padding: isTouch ? "5px 10px" : "4px 10px", borderColor: hud.healthOn ? "#7fd7ff" : "#48515f", opacity: hud.healthOn ? 1 : 0.6 }} title="health bars on hurt things (visual only)" onClick={toggleHealth}>
          HEALTH {hud.healthOn ? "ON" : "OFF"}
        </button>
        <button data-wind style={{ ...P.btn, padding: isTouch ? "5px 10px" : "4px 10px", borderColor: hud.windOn ? "#7fd7ff" : "#48515f", opacity: hud.windOn ? 1 : 0.6 }} title="wind (drift on every shot, both sides)" onClick={toggleWind} {...teachPress("wind")}>
          WIND {hud.windOn ? "ON" : "OFF"}
        </button>
        <button data-holdarea style={{ ...P.btn, padding: isTouch ? "5px 10px" : "4px 10px", borderColor: hud.holdAreaOn ? "#7fd7ff" : "#48515f", opacity: hud.holdAreaOn ? 1 : 0.6 }} title="area weapons (tesla chain, davy blast) hold fire while one of your own stands in the spread" onClick={toggleHoldArea} {...teachPress("spare_ours")}>
          SPARE OURS {hud.holdAreaOn ? "ON" : "OFF"}
        </button>
        <button style={{ ...P.btn, padding: isTouch ? "5px 10px" : "4px 10px", opacity: hud.muted ? 0.5 : 1 }} onClick={toggleMute}>
          {hud.muted ? "🔇" : "🔊"}
        </button>
        {onExit && (
          <button data-menu-exit
            style={{ ...P.btn, padding: isTouch ? "5px 10px" : "4px 10px", borderColor: menuArmed ? "#ff6b5e" : "#48515f", color: menuArmed ? "#ff6b5e" : "#e6ebf1" }}
            onClick={() => { if (menuArmed) { setMenuArmed(false); onExit(); } else setMenuArmed(true); }}>
            {menuArmed ? "LEAVE THE FIELD?" : "⏏ MENU"}
          </button>
        )}
        <div style={{ ...P.stat, opacity: 0.65 }}>{hud.fps} fps · {hud.stones || "0/0"} · {MK}</div>
      </div>

      {hud.toasts && hud.toasts.length > 0 && (
        <div style={P.toastWrap}>
          {hud.toasts.map((t, i) => <div key={i} style={P.toast}>{t}</div>)}
        </div>
      )}

      {/* THE INTEL CARD — first thing in the bell sequence. Floating, so it
          cannot eat a combat tap; dismissible; and the assault it precedes
          marches whether or not it is ever read. The bell chip re-reads it
          (as a proper modal) any time after. */}
      {hud.intel && hud.lastDispatch && !rereadDispatch && !hud.gameOver && !hud.victory && (
        <Dispatch
          dispatch={hud.lastDispatch}
          gating={false}
          floating
          armed={hud.intel.armed}
          label="ACKNOWLEDGE"
          onAcknowledge={() => { const C = stateRef.current; if (C && C.view.ackIntel) C.view.ackIntel(); }}
        />
      )}

      {/* Re-read: the bell chip's modal copy of the same dispatch. */}
      {rereadDispatch && hud.lastDispatch && (
        <Dispatch
          dispatch={hud.lastDispatch}
          gating={false}
          onAcknowledge={() => setRereadDispatch(false)}
        />
      )}

      {/* THE MANIFEST CARD — the convoy's offer. Same floating idiom as the
          intel card (no scrim, corner-parked, only the card box takes taps),
          pick buttons armed on world time. LATER dismisses it to the top-bar
          chip; the next bell overwrites the offer either way. */}
      {hud.manifest && hud.manifest.up && !hud.gameOver && !hud.victory && (
        <div style={P.cardWrap}>
          <div data-manifest-card style={{ ...P.panel, position: "static", pointerEvents: "auto", borderColor: "#ffd27a", width: "min(300px, 44vw)" }}>
            <style>{`@keyframes cs-deal { from { opacity: 0; transform: translate(-14px, 10px) rotate(-6deg) scale(0.88); } to { opacity: 1; transform: var(--restT, none); } }`}</style>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11, marginBottom: 10, borderBottom: "1px solid #2c3846", paddingBottom: 8 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <CrateChip label="THE CONVOY" icon="⚒" open={true} style={{ minWidth: 0, minHeight: 0, padding: "2px 6px", background: "transparent", border: "none" }} />
                <span style={{ color: "#ffd27a", letterSpacing: 2 }}>CONVOY MANIFEST</span>
              </span>
              <span style={{ opacity: 0.6 }}>BELL {hud.manifest.bell}</span>
            </div>
            <div style={{ fontSize: 11, opacity: 0.8, marginBottom: 10, lineHeight: 1.5 }}>
              Plans build; hires march. Take what your scrap can carry.
              {/* The teaching line, first truck only. Deterministic on
                  the bell index — bell 1 is the first bell of any match, so
                  nothing is stored, nothing is flagged, and a resumed save
                  shows it again only if it resumed to bell 1. */}
              {hud.manifest.bell === 1 && (
                <div data-manifest-teach style={{ marginTop: 6, color: "#ffd27a", opacity: 0.9 }}>
                  The convoy returns each bell — plans build, hires march.
                </div>
              )}
            </div>
            {hud.manifest.hand.map((c, ci) => {
              const it = PALETTE_BY_KEY[c.k];
              if (!it) return null;
              return (
                <StockTag key={ci + ":" + c.k} data-manifest-offer={c.k} data-hand-kind={c.hire ? "hire" : "plan"}
                  tilt={ci % 2 ? 0.8 : -1.2} delay={(ci * 0.05) + "s"}
                  style={{ boxSizing: "border-box", width: "100%", minHeight: 44, marginBottom: 6, flexDirection: "row", alignItems: "center", gap: 10, textAlign: "left", padding: "8px 10px 8px 22px", opacity: hud.manifest.armed ? 1 : 0.5 }}
                  onClick={() => { const C = stateRef.current; if (C && C.view.openInfo) C.view.openInfo(c.k, c.hire ? "hire" : "manifest"); }}>
                  <span style={{ fontSize: 18 }}>{it.icon}</span>
                  <span style={{ flex: 1 }}>{it.label}</span>
                  <span style={{ color: c.hire ? "#2f6a3a" : "#7a5a1e", fontSize: 11, letterSpacing: 1, fontWeight: 600 }}>{c.hire ? "HIRE" : "PLAN"} ◆{c.price}</span>
                </StockTag>
              );
            })}
            <button data-manifest-later
              style={{ ...P.btn, width: "100%", marginTop: 4, opacity: 0.75 }}
              onClick={() => { const C = stateRef.current; if (C && C.view.dismissManifest) C.view.dismissManifest(); }}>
              LATER
            </button>
          </div>
        </div>
      )}

      {hud.info && !hud.gameOver && !hud.victory && (
        <InfoCard card={(() => { const c = cardFor(hud.info.key); return c && isTouch && c.roleTouch ? { ...c, role: c.roleTouch } : c; })()} door={hud.info.door} armed={hud.info.armed}
          afford={hud.info.door === "hire" ? hud.resources >= ((hud.prices?.[hud.info.key] ?? PALETTE_BY_KEY[hud.info.key]?.cost) || 0) : undefined}
          price={(() => {
            if (hud.info.door === "deal") return null;
            const base = hud.prices?.[hud.info.key] ?? PALETTE_BY_KEY[hud.info.key]?.cost;
            return hud.info.door === "manifest" ? Math.max(1, Math.ceil(base / 2)) : base;
          })()}
          portrait={TEACH[hud.info.key] ? undefined : (cv) => renderPortrait(cv, hud.info.key)}
          onConfirm={() => { const C = stateRef.current; if (C && C.view.confirmInfo) C.view.confirmInfo(); }}
          onCancel={() => { const C = stateRef.current; if (C && C.view.closeInfo) C.view.closeInfo(); }} />
      )}

      {/* The teaching card — head of the fire queue, above every
          overlay (the draft sits at zIndex 8). The war is frozen while it
          is up; CLOSE marks it seen and resumes. */}
      {hud.teach && !hud.info && (() => {
        const tc = TEACH[hud.teach.key];
        if (!tc) return null;
        const card = { ...tc, role: isTouch && tc.roleTouch ? tc.roleTouch : tc.role };
        return (
          <div data-teach-card={hud.teach.key} style={{ position: "absolute", inset: 0, zIndex: 10, pointerEvents: "none" }}>
            <div style={{ pointerEvents: "auto" }}>
              <InfoCard card={card} door="teach" series={{ i: hud.teach.i, n: hud.teach.n }}
                onConfirm={() => { const C = stateRef.current; if (C && C.view.teachNext) C.view.teachNext(); }}
                onBack={() => { const C = stateRef.current; if (C && C.view.teachBack) C.view.teachBack(); }}
                onCancel={() => { const C = stateRef.current; if (C && C.view.teachSkip) C.view.teachSkip(); }} />
            </div>
          </div>
        );
      })()}

      {hud.pending && (
        <div style={{ position: "absolute", left: hud.pending.x, top: hud.pending.y, transform: "translate(-50%, -50%)", zIndex: 7, display: "flex", gap: 6, pointerEvents: "auto" }}>
          <button data-pending-confirm
            style={{ ...P.btnBig, borderColor: "#4aff8c", color: "#4aff8c", opacity: hud.pending.armed ? 1 : 0.5, fontWeight: "bold" }}
            onClick={() => stateRef.current && stateRef.current.view.confirmPending()}>
            {hud.pending.cost ? "✓ ◆" + hud.pending.cost : "✓ PLACE"}
          </button>
          <button data-pending-cancel
            style={{ ...P.btnBig, borderColor: "#ff6b5e", color: "#ff6b5e", fontWeight: "bold" }}
            onClick={() => stateRef.current && stateRef.current.view.clearPending()}>
            ✗
          </button>
        </div>
      )}

      {hud.linePending && (
        <div style={{ position: "absolute", left: hud.linePending.x, top: hud.linePending.y, transform: "translate(-50%, -50%)", zIndex: 7, display: "flex", gap: 6, pointerEvents: "auto" }}>
          <button data-line-accept
            style={{ ...P.btnBig, borderColor: "#4aff8c", color: "#4aff8c", opacity: hud.linePending.armed ? 1 : 0.5, fontWeight: "bold" }}
            onClick={() => stateRef.current && stateRef.current.view.acceptLine()}>
            {hud.linePending.kind === "patrol" ? "✓ PATROL" : `✓ UP TO ◆${hud.linePending.cost}`}
          </button>
          <button data-line-reject
            style={{ ...P.btnBig, borderColor: "#ff6b5e", color: "#ff6b5e", fontWeight: "bold" }}
            onClick={() => stateRef.current && stateRef.current.view.rejectLine()}>
            ✗
          </button>
        </div>
      )}

      {hud.squadSel && <SquadPie sq={hud.squadSel} stateRef={stateRef} press={teachPress} closeBuild={closeBuild} isTouch={isTouch} />}
      {hud.squadFlag && (
        <div data-squad-flag style={{ position: "absolute", left: hud.squadFlag.x, top: hud.squadFlag.y, transform: "translate(-50%, -100%)", zIndex: 6, pointerEvents: "none", color: "#ff6b5e", fontSize: 18 }}>⚑</div>
      )}
      {hud.roster && !hud.possessed && (
        <div data-roster style={{ position: "absolute", right: 8, top: "20%", zIndex: 6, display: "flex", flexDirection: "column", gap: 4, background: "rgba(14,18,24,0.92)", border: "1px solid #48515f", borderRadius: 8, padding: "6px 10px", pointerEvents: "auto", fontSize: 11, letterSpacing: 1, minWidth: 150, maxHeight: "55vh", overflowY: "auto" }}>
          <div style={{ color: "#9fdcff", fontSize: 10 }}>THE ROSTER</div>
          {hud.roster.length === 0 && <div style={{ opacity: 0.7 }}>NO ONE TO COMMAND</div>}
          {hud.roster.map((r) => (
            <div key={r.kind + r.id} data-roster-row={r.kind + ":" + r.id} style={{ display: "flex", alignItems: "center", gap: 8, color: "#e6ebf1", cursor: "pointer", padding: "2px 0" }}
              onClick={() => { const C = stateRef.current; if (C) C.view.rosterJump(r.kind, r.id); }}>
              <span style={{ flex: 1 }}>{r.label}</span>
              <span style={{ opacity: 0.7 }}>{r.kind === "sq" ? "×" + r.n : "HP " + r.n}</span>
              <span style={{ color: "#ffd27a", minWidth: 28, textAlign: "right" }}>✜ {r.kills}</span>
            </div>
          ))}
        </div>
      )}
      {hud.chainList && (
        <div data-chain-list style={{ position: "absolute", left: 8, top: "32%", zIndex: 6, display: "flex", flexDirection: "column", gap: 4, background: "rgba(14,18,24,0.88)", border: "1px solid #48515f", borderRadius: 8, padding: "6px 10px", pointerEvents: "auto", fontSize: 11, letterSpacing: 1, minWidth: 96 }}>
          <div style={{ color: "#ffd27a", fontSize: 10 }}>THE CHAIN</div>
          <div style={{ color: "#9fb2c8" }}>▶ {hud.chainList.active}</div>
          {hud.chainList.legs.map((l, i) => (
            <div key={i} data-chain-row={i} style={{ display: "flex", alignItems: "center", gap: 6, color: "#e6ebf1" }}>
              <span style={{ color: "#ffd27a" }}>{i + 1}</span>
              <span style={{ flex: 1 }}>{l}</span>
              <span style={{ color: "#ff6b5e", cursor: "pointer", padding: "0 4px" }}
                onClick={() => { const C = stateRef.current; if (C) C.view.deleteLeg(i); }}>✗</span>
            </div>
          ))}
        </div>
      )}
      {hud.chainFlags && hud.chainFlags.map((f) => (
        <div key={f.i} data-chain-flag={f.i} style={{ position: "absolute", left: f.x, top: f.y, transform: "translate(-50%, -100%)", zIndex: 6, pointerEvents: "auto", cursor: "pointer", color: "#ffd27a", fontSize: 14, textAlign: "center", textShadow: "0 1px 2px #000" }}
          onClick={() => { const C = stateRef.current; if (C) C.view.deleteLeg(f.i); }}>
          {f.line ? "▤" : f.pat ? "⇄" : "⚑"}<div style={{ fontSize: 10, lineHeight: "10px" }}>{f.i + 1}</div>
        </div>
      ))}

      {hud.inspect && (
        <div style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", bottom: isTouch ? 96 : 104, zIndex: 5 }}>
          <div style={{ ...P.panel, position: "static", borderColor: "#7fd7ff", display: "flex", alignItems: "center", gap: 10, padding: "6px 10px" }}>
            <div>
              <div style={{ color: "#7fd7ff", letterSpacing: 1 }}>{hud.inspect.label}</div>
              <div style={{ fontSize: 10, opacity: 0.8 }}>HP {hud.inspect.hp}/{hud.inspect.maxHp} · {hud.inspect.blurb}</div>
            </div>
            {/* SELL moved into the tower radial below —
                walls keep today's inspect behavior untouched (no radial). */}
            {!hud.towerRadial && (
              <button style={{ ...P.btn, borderColor: "#ffb45e", color: "#ffb45e" }} onClick={sellInspected}>
                SELL ◆{hud.inspect.refund}
              </button>
            )}
          </div>
        </div>
      )}
      {hud.towerRadial && <TowerPie tr={hud.towerRadial} stateRef={stateRef} press={teachPress} closeBuild={closeBuild} isTouch={isTouch} />}

      {hud.vehRadial && <VehiclePie vr={hud.vehRadial} stateRef={stateRef} press={teachPress} closeBuild={closeBuild} isTouch={isTouch} />}
      {hud.groupRadial && <GroupPie gr={hud.groupRadial} stateRef={stateRef} press={teachPress} isTouch={isTouch} />}

      {hud.started && !hud.gameOver && !hud.victory && !hud.possessed && buildOpen && branch && (
        <div data-lattice style={{ position: "absolute", left: 6, right: 6, bottom: "calc(150px + env(safe-area-inset-bottom, 0px))", zIndex: 4, display: "flex", flexDirection: "column-reverse", gap: 2, pointerEvents: packing ? "none" : "auto" }}>
          <div data-trunk style={{ position: "absolute", left: 14, top: -4, bottom: -10, width: 2, background: "#8f9aa8", transformOrigin: "bottom",
            animation: packing ? "cs-packtrunk 0.12s ease-in forwards" : "cs-climb 0.15s ease-out backwards",
            animationDelay: packing ? "0.22s" : "0s" }}
            onAnimationEnd={packing ? finishPack : undefined} />
          {(LATTICE[branch] || []).map((rung, ri) => (
            <div key={branch + ":" + rung.name} style={{ display: "flex", alignItems: "center", gap: 6, paddingLeft: 10 }}>
              <div style={{ fontSize: 9, letterSpacing: 1, color: "#b9a86a", border: "1px solid #6a5f3a", borderRadius: 2, padding: "1px 4px", background: "rgba(14,18,24,0.85)", zIndex: 1,
                animation: packing ? "cs-pack 0.1s ease-in forwards" : "cs-deal 0.1s ease-out backwards",
                animationDelay: packing ? "0.12s" : (0.12 + ri * 0.06) + "s", "--restT": "none" }}>{rung.name}</div>
              <div style={{ height: 2, width: 16, background: "#8f9aa8", transformOrigin: "left",
                animation: packing ? "cs-packline 0.1s ease-in forwards" : "cs-line 0.1s ease-out backwards",
                animationDelay: packing ? "0.12s" : (0.12 + ri * 0.06) + "s" }} />
              <div style={{ display: "flex", gap: 6, overflowX: "auto", padding: "6px 2px", alignItems: "center" }}>
                {rung.keys.map((k, ti) => renderLatticeTag(branch, k, ti, ri))}
              </div>
            </div>
          ))}
        </div>
      )}

      {hud.started && !hud.gameOver && !hud.victory && !hud.possessed && (
        <div style={{ ...P.bar, pointerEvents: packing ? "none" : "auto" }}>
          <style>{`
@keyframes cs-deal { from { opacity: 0; transform: translate(-16px, 12px) rotate(-8deg) scale(0.85); } to { opacity: 1; transform: var(--restT, none); } }
@keyframes cs-climb { from { transform: scaleY(0); } to { transform: scaleY(1); } }
@keyframes cs-line { from { transform: scaleX(0); } to { transform: scaleX(1); } }
@keyframes cs-pack { to { opacity: 0; transform: translate(-16px, 12px) rotate(-8deg) scale(0.85); } }
@keyframes cs-packline { to { transform: scaleX(0); } }
@keyframes cs-packtrunk { to { transform: scaleY(0); } }
`}</style>
          <button data-group-select
            style={{ ...P.slot, minHeight: 44, justifyContent: "center", borderColor: "#2f8f4f", background: "#12331f", color: "#7dffa8", fontWeight: "bold", letterSpacing: 1 }}
            onClick={() => { const C = stateRef.current; if (C) C.view.selectScreen(); }}>
            ∷ ALL
          </button>
          <button data-roster-toggle
            style={{ ...P.slot, minHeight: 44, justifyContent: "center", borderColor: "#3a6f8f", background: "#122433", color: "#9fdcff", fontWeight: "bold", letterSpacing: 1 }}
            onClick={() => { const C = stateRef.current; if (C) C.view.rosterOpen = !C.view.rosterOpen; }}>
            ⚏ ROSTER
          </button>
          <CrateChip data-build-toggle
            label={buildOpen ? "CLOSE" : "BUILD"} icon="⚒" open={buildOpen} active={buildOpen}
            line={!buildOpen ? (hud.sellMode ? "SELL" : hud.mode ? (PALETTE_LABEL[hud.mode] || "") : "") : ""}
            {...teachPress("market")}
            onClick={() => {
              if (buildOpen) { closeBuild(); return; }
              const C = stateRef.current;
              // No build tree over a live possession.
              if (C && C.input.possess) return;
              const b = C && C.run.mode ? branchOf(C.run.mode) : null;
              if (b) setBranch(b);
              setBuildOpen(true);
              if (C && C.view.teachFire) { C.view.teachFire("market"); C.view.teachFire("scrap"); }
            }} />
          {buildOpen && (dev ? [...TREE_BRANCHES, { key: "foes", label: "THE ENEMY", icon: "☠", match: () => false }] : TREE_BRANCHES).map((b) => (dev && b.key === "foes") || palette.some((p) => b.match(p.key)) ? (
            <CrateChip key={b.key} data-branch={b.key}
              label={b.label} icon={b.icon} open={branch === b.key} active={branch === b.key}
              count={b.key === "foes" ? FOE_RACK.length : palette.filter((p) => b.match(p.key)).length}
              line={!qmQuiet ? QM_LINES[b.key] : null}
              style={packing && packNextRef.current.closeAll
                ? { animation: "cs-pack 0.1s ease-in forwards", animationDelay: "0.18s" }
                : { animation: "cs-deal 0.14s ease-out backwards", animationDelay: (TREE_BRANCHES.indexOf(b) * 0.04) + "s" }}
              onClick={() => { branch === b.key ? beginPack(null, false) : (branch ? beginPack(b.key, false) : setBranch(b.key)); }} />
          ) : null)}
          {buildOpen && (
            <StockTag data-sell-toggle tilt={1.5} delay="0.09s"
              style={packing && packNextRef.current.closeAll
                ? { minWidth: isTouch ? 56 : 52, borderColor: hud.sellMode ? "#a85c1e" : "#8f8768", background: hud.sellMode ? "#dcc9a0" : "#cfc6a5", animation: "cs-pack 0.1s ease-in forwards", animationDelay: "0.18s" }
                : { minWidth: isTouch ? 56 : 52, borderColor: hud.sellMode ? "#a85c1e" : "#8f8768", background: hud.sellMode ? "#dcc9a0" : "#cfc6a5" }}
              {...teachPress("sell")}
              onClick={() => { toggleSell(); beginPack(null, true); }}>
              <div style={{ fontSize: 15 }}>✕</div>
              <div>SELL</div>
              <div style={{ opacity: 0.7 }}>60%</div>
            </StockTag>
          )}
        </div>
      )}

      {!hud.started && !hud.placing && !hud.drafting && !fatal && !dev && (
        <div style={P.ovl}>
          <div style={{ fontSize: 26, letterSpacing: 4, color: "#9fdcff" }}>COLDSNAP</div>
          <div style={{ fontSize: 13, letterSpacing: 8, color: "#ffd27a", marginBottom: 18 }}>WINTER FRONT</div>
          <button style={{ ...P.btn, fontSize: 15, padding: "10px 26px", borderColor: "#4aff8c", color: "#4aff8c" }} onClick={startGame}>
            TAKE COMMAND
          </button>
          <button data-menu="walk" style={{ ...P.btn, marginTop: 14, opacity: 0.8, fontSize: 12, letterSpacing: 1 }}
            onClick={() => { const C = stateRef.current; if (C && C.view.teachWalk) C.view.teachWalk(); }}>
            SHOW ME THE FRONT
          </button>
          <div style={{ fontSize: 10, opacity: 0.55, marginTop: 12, letterSpacing: 2 }}>FIELD ORDER #{hud.seed || "—"} · ?seed= replays a map</div>
        </div>
      )}

      {hud.drafting && !fatal && (
        <DraftScreen cards={hud.drafting} onConfirm={(picked) => { const C = stateRef.current; if (C && C.view.confirmDraft) C.view.confirmDraft(picked); }} />
      )}

      {hud.placing && !hud.info && !fatal && (() => {
        const C = stateRef.current;
        const remaining = C && C.view._placeQueue ? C.view._placeQueue.length : 0;
        const n = Math.max(1, (C && C.view._placeTotal ? C.view._placeTotal : remaining) - remaining + 1);
        return (
          <div style={{ position: "absolute", top: 10, left: "50%", transform: "translateX(-50%)", zIndex: 9,
            background: "#1a212b", border: "1px solid #4aff8c", borderRadius: 8, padding: "8px 16px",
            display: "flex", alignItems: "center", gap: 10, fontSize: 12, color: "#e6ebf1", textAlign: "center" }}>
            {hud.placing === "done" ? (
              <>
                <span>ALL PLACED</span>
                <button style={{ ...P.btn, borderColor: "#4aff8c", color: "#4aff8c" }} onClick={startGame}>TAKE COMMAND</button>
              </>
            ) : (
              <span>PLACE: {PALETTE_BY_KEY[hud.placing]?.label} — tap ground near your depot ({n} of {C && C.view._placeTotal ? C.view._placeTotal : remaining})</span>
            )}
          </div>
        );
      })()}

      {hud.hiring && !hud.info && !fatal && (
        <div data-hire-ticker style={{ position: "absolute", top: 10, left: "50%", transform: "translateX(-50%)", zIndex: 9,
          background: "#1a212b", border: "1px solid #7dffa8", borderRadius: 8, padding: "8px 16px",
          display: "flex", alignItems: "center", gap: 10, fontSize: 12, color: "#e6ebf1" }}>
          <span>PLACE THE HIRE: {hud.hiring.label} — tap held ground</span>
          <button data-hire-cancel style={{ ...P.btn, borderColor: "#ff6b5e", color: "#ff6b5e" }}
            onClick={() => { const C = stateRef.current; if (C && C.view.cancelHire) { C.view.cancelHire(); if (C.view.openManifest) C.view.openManifest(); } }}>✗</button>
        </div>
      )}

      {(hud.gameOver || hud.victory) && hud.endCard && !fatal && (
        <Dispatch
          dispatch={endDispatch}
          gating={false}
          outcome={hud.victory ? "win" : "loss"}
          label="RETURN TO BASE"
          onAcknowledge={() => { if (onExit) onExit(); else restart(); }}
        />
      )}

      {fatal && (
        <div style={P.ovl}>
          <div style={{ fontSize: 18, color: "#ff7a7a", marginBottom: 10 }}>ENGINE FAULT</div>
          <div style={{ fontSize: 11, opacity: 0.8, maxWidth: 480, marginBottom: 16, wordBreak: "break-word" }}>{fatal}</div>
          <button style={{ ...P.btn, borderColor: "#9fdcff", color: "#9fdcff" }} onClick={restart}>RESTART</button>
        </div>
      )}
    </div>
  );
}
