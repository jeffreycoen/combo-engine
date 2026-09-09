import { PENDING_ARM_S, pendingArmed, canvasTapConsumesPending, TAP_SQUAD_M, TAP_HULL_M, TAP_TOWER_M, nextPick, squadIdsOfType, WALL_FIELD_COST, SANDBAG_FIELD_COST } from "./state.js";
import { reclampReticle, seenAt, eyeOf } from "./sight.js";
import { JEEP, INFANTRY_ARMS, TOWER_SPECS } from "./specs.js";
import { unloadApc, apcSeated, seatsOf } from "./transports.js";
import { startBuildLine, linePieces, stepBuildLine } from "./buildlines.js";
import { fieldPrices } from "./market.js";
import { MINE_COST, WIRE_COST } from "./mines.js";
import { SQUAD_SPECS } from "./squads.js";
import { PALETTE_BY_KEY } from "./palette.js";

export function makeOrders(ctx) {
  const { world, run, view, input, map, grid, field, T, R, dev,
    toast, canvas, groundPoint, stampBag, objG, recomputeFlow,
    clearPending, canPlaceInfantryAt, startPendingSquad, canBuildAt,
    startPending, sellAt, devSpawnAt, priceNow, SQUAD_MODE, HERO_MODE,
    ghostFp } = ctx;
      view.toggleGear = () => {
        const P2 = input.possess;
        if (!P2 || P2.kind !== "vehicle") return;
        const v = world.byId.get(P2.id);
        if (!v || v.vtype !== "jeep") return;
        v.gear = (v.gear || "2h") === "2h" ? "4l" : "2h";
        if (v.gear === "4l") { v.spdF = JEEP.spd4l; v.accCap = JEEP.cap4l; } else { v.spdF = JEEP.spd2h; v.accCap = JEEP.cap2h; }
      };
      // Selection: tap within 1.6m of any live member selects his squad.
      const squadAtPoint = (p) => {
        for (const sq of run.squads) {
          if (sq.ridingIn != null) continue; // a sealed squad is not tappable
          for (const id of sq.memberIds) {
            const u = world.byId.get(id);
            if (u && u.alive && Math.hypot(u.pos.x - p.x, u.pos.z - p.z) < TAP_SQUAD_M) return sq;
          }
        }
        return null;
      };
      const selectedSquad = () => (view.selSquadId != null ? run.squads.find((q) => q.id === view.selSquadId) || null : null);
      // The order fan-out — the SELECT ALL group when one is up,
      // else the one selected squad. Primary first; dead ids drop out.
      const selectedGroup = () => {
        if (view.selSquadIds && view.selSquadIds.length) return view.selSquadIds.map((id) => run.squads.find((q) => q.id === id)).filter(Boolean);
        const sq = selectedSquad();
        return sq ? [sq] : [];
      };
      const selectedVehicle = () => (view.selVehId != null ? world.byId.get(view.selVehId) || null : null);
      // The Bison's own radial orders — DEFEND is instant (mirrors
      // view.orderSquad's defend branch); MOVE/PATROL/ESCORT arm the aiming
      // mode and consumeVehOrderTap's ground/squad tap finishes them.
      view.orderVehicle = (kind) => {
        if (run.gameOver || run.victory) return;
        const v = selectedVehicle();
        if (!v || world.t < view.selArmedAt) return;
        if (kind === "defend") { v.order = "defend"; v.dest = null; v.goal = null; v._route = null; v._routeDest = null; v._queue = null; view.vehOrderMode = null; view.buildPt0 = null; }
        else if (kind === "move" || kind === "attack" || kind === "patrol" || kind === "escort" || kind === "load") {
          if (view.vehOrderMode === kind) { view.vehOrderMode = null; view.buildPt0 = null; return; }
          view.vehOrderMode = kind; view.buildPt0 = null;
        }
      };
      // THE OVERRUN SAFETY toggle — CAREFUL (default) brakes for the
      // Bison's own men; FREE takes the safety off (drivers.js reads v.tracks).
      view.toggleTracks = () => {
        const v = selectedVehicle();
        if (!v || world.t < view.selArmedAt) return;
        v.tracks = (v.tracks || "careful") === "careful" ? "free" : "careful";
      };
      // UNLOAD — the pie's own button (only shown when the APC
      // carries riders); unloadApc (transports.js) does the real work.
      view.unloadVehicle = () => {
        const v = selectedVehicle();
        if (!v || world.t < view.selArmedAt) return;
        unloadApc(world, run.squads, v);
      };
      // TAKE CONTROL on the Bison — same hygiene as
      // view.takeControl/view.takeControlTower: digs in (order defend, goal/route
      // cleared), hands the stick over, clears every other selection/order
      // UI state.
      view.takeControlVehicle = () => {
        const v = selectedVehicle();
        if (!v || world.t < view.selArmedAt) return;
        v.order = "defend"; v.dest = null; v.goal = null; v._route = null; v._routeDest = null; v._queue = null;
        input.fireHeld = false; input.mgHeld = false;
        view.reticleLockId = null;
        if (v.kind === "mech") {
          // THE MECH: possessed as its own kind — no reticle, the
          // torso+range convention (mechAimDir/aimRange) owns the aim.
          input.possess = { kind: "mech", id: v.id };
          view.reticleOff = null; input.reticle = null;
        } else {
          input.possess = { kind: "vehicle", id: v.id };
          const pc2 = possessCenter();
          view.reticleOff = pc2 ? reclampReticle(T.sight, 1, pc2, possessSightR(), { dx: 0, dz: 6 }, map.invW) : null;
          input.reticle = pc2 && view.reticleOff ? { x: pc2.x + view.reticleOff.dx, z: pc2.z + view.reticleOff.dz } : null;
        }
        view.selVehId = null; view.vehOrderMode = null; view.selSquadId = null; view.selSquadIds = null; view.orderMode = null; view.buildPt0 = null; view.linePending = null; view.pieOpen = false;
        R.overlay.setLinePreview(false);
      };
      // Order chips (DEFEND | ATTACK). 350ms arming (selArmedAt, same
      // trailing-tap guard as pending ✓) so the selecting tap can't
      // double-fire a chip. DEFEND digs in where the men stand (anchor =
      // live-member centroid); ATTACK arms the next ground tap as dest.
      view.orderSquad = (kind) => {
        if (run.gameOver || run.victory) return;   // the war is over — no more orders
        const sq = selectedSquad();
        if (!sq || world.t < view.selArmedAt) return;
        if (kind === "defend") {
          for (const gsq of selectedGroup()) {
            let cx = 0, cz = 0, n = 0;
            for (const id of gsq.memberIds) { const u = world.byId.get(id); if (u && u.alive) { cx += u.pos.x; cz += u.pos.z; n++; } }
            if (n) gsq.anchor = { x: cx / n, z: cz / n };
            gsq.order = "defend"; gsq.dest = null; gsq._legTarget = null; gsq._pauseT = 0; gsq._threatSig = undefined;
            gsq._surveyPending = true;
            gsq._build = null;
            gsq._queue = null; // a plain order wipes the chain
          }
          view.orderMode = null; view.buildPt0 = null;
        } else if (kind === "attack" || kind === "move") {
          // Both aiming orders arm the same "tap the ground" flow —
          // the chip only decides whether the men fight their way there.
          view.orderMode = kind; view.buildPt0 = null;
        } else if (kind === "build_bags" || kind === "build_walls") {
          // Engineers only. The chip arms a TWO-tap flow (start, then
          // end); re-tapping the armed chip before the second point cancels it
          // cleanly, which is the only way out of a half-given order.
          if (sq.type !== "engineers") return;
          view.selSquadIds = null; // a line is one squad's job — the group narrows to the primary
          if (view.orderMode === kind) { view.orderMode = null; view.buildPt0 = null; return; }
          view.orderMode = kind; view.buildPt0 = null;
        } else if (kind === "build_mines" || kind === "build_wires") {
          // The sapper build gate — engineers' own two-tap shape, sappers only.
          if (sq.type !== "sappers") return;
          view.selSquadIds = null; // a line is one squad's job — the group narrows to the primary
          if (view.orderMode === kind) { view.orderMode = null; view.buildPt0 = null; return; }
          view.orderMode = kind; view.buildPt0 = null;
        } else if (kind === "patrol") {
          // The same two-tap flow the build orders use —
          // no type restriction here (the pie only offers the wedge to
          // squads that aren't engineers or sappers; consumeOrderTap's
          // patrol branch trusts that, same as 2.4's build branch did with
          // its engineer guard).
          if (view.orderMode === kind) { view.orderMode = null; view.buildPt0 = null; return; }
          view.orderMode = kind; view.buildPt0 = null;
        }
      };
      // STRUCTURES — an instant toggle, like DEFEND: it
      // flips squad.prefStruct and the wedge's act closes the pie AND
      // deselects (call site does the deselect, same as DEFEND's). Armed
      // types only (an INFANTRY_ARMS row) — engineers and sappers never get
      // the wedge. squadFire (state.js) reads the flag every tick; it rides
      // a save as a plain boolean (save.js's generic squad serializer).
      view.toggleStructFirst = () => {
        const sq = selectedSquad();
        if (!sq || world.t < view.selArmedAt) return;
        if (!INFANTRY_ARMS[sq.type]) return;
        const v = !sq.prefStruct;
        for (const gsq of selectedGroup()) gsq.prefStruct = v;
      };
      // SELECT ALL OF TYPE — every squad of the selected
      // type joins; one-squad results collapse back to plain selection.
      view.selectAllType = () => {
        const sq = selectedSquad();
        if (!sq || world.t < view.selArmedAt) return;
        const ids = squadIdsOfType(world, run.squads, sq.type);
        view.selSquadIds = ids.length > 1 ? ids : null;
      };
      // THE SCREEN SELECT — every live player squad and hull
      // the camera sees at the button's moment joins one group; the group
      // reticle (three wedges) orders them together. The group does not
      // re-follow the camera afterward.
      view.selectScreen = () => {
        if (run.gameOver || run.victory || input.possess) return;
        const onScreen = (x, y, z) => {
          const nd = R.project(x, y, z);
          return !!nd && Math.abs(nd.x) <= 1 && Math.abs(nd.y) <= 1;
        };
        const sqIds = [];
        for (const sq of run.squads) {
          for (const id of sq.memberIds) {
            const u = world.byId.get(id);
            if (u && u.alive && onScreen(u.pos.x, u.pos.y, u.pos.z)) { sqIds.push(sq.id); break; }
          }
        }
        const vehIds = [];
        for (const b of world.bodies) {
          if ((b.kind !== "vehicle" && b.kind !== "mech") || !b.alive || b.team !== 1 || !b.drv) continue;
          if (onScreen(b.pos.x, b.pos.y, b.pos.z)) vehIds.push(b.id);
        }
        if (!sqIds.length && !vehIds.length) { toast("NO ONE ON SCREEN"); return; }
        view.selSquadId = null; view.selSquadIds = null; view.orderMode = null; view.buildPt0 = null; view.linePending = null;
        view.selVehId = null; view.vehOrderMode = null; view.inspectId = null; view.queueOn = false;
        view.groupSel = { sqIds, vehIds }; view.groupOrderMode = null;
        view.selArmedAt = world.t + PENDING_ARM_S; view.pieOpen = true;
        R.overlay.setLinePreview(false);
      };
      // The group orders: DEFEND lands at once (the squad pie's defend,
      // fanned, plus the hull's); MOVE and ATTACK arm the one ground tap
      // that consumeGroupOrderTap finishes.
      view.orderGroup = (kind) => {
        if (run.gameOver || run.victory) return;
        const gs = view.groupSel;
        if (!gs || world.t < view.selArmedAt) return;
        if (kind === "defend") {
          for (const qid of gs.sqIds) {
            const gsq = run.squads.find((q) => q.id === qid);
            if (!gsq) continue;
            let cx = 0, cz = 0, n = 0;
            for (const id of gsq.memberIds) { const u = world.byId.get(id); if (u && u.alive) { cx += u.pos.x; cz += u.pos.z; n++; } }
            if (n) gsq.anchor = { x: cx / n, z: cz / n };
            gsq.order = "defend"; gsq.dest = null; gsq._legTarget = null; gsq._pauseT = 0; gsq._threatSig = undefined;
            gsq._surveyPending = true;
            gsq._build = null;
            gsq._queue = null;
          }
          for (const vid of gs.vehIds) {
            const gv = world.byId.get(vid);
            if (!gv || !gv.alive) continue;
            gv.order = "defend"; gv.dest = null; gv.goal = null; gv._route = null; gv._routeDest = null; gv._queue = null;
          }
          view.groupSel = null; view.groupOrderMode = null; view.pieOpen = false;
        } else if (kind === "move" || kind === "attack") {
          view.groupOrderMode = view.groupOrderMode === kind ? null : kind;
        }
      };
      // THE CHAIN BUILDER's controls. QUEUE is a light on the
      // pie: lit, aimed orders append; a chain is one unit's, never a group's.
      view.toggleQueue = () => {
        if (view.selSquadIds && view.selSquadIds.length) { toast("ONE SQUAD AT A TIME — A CHAIN IS ONE UNIT'S"); return; }
        view.queueOn = !view.queueOn;
      };
      view.clearChain = () => {
        const o = view.selVehId != null ? world.byId.get(view.selVehId) : selectedSquad();
        if (o) o._queue = null;
      };
      view.deleteLeg = (i) => {
        const o = view.selVehId != null ? world.byId.get(view.selVehId) : selectedSquad();
        if (o && o._queue && i >= 0 && i < o._queue.length) { o._queue.splice(i, 1); if (!o._queue.length) o._queue = null; }
      };
      // THE ROSTER's jump — a tapped row centers the camera
      // on the unit, selects it with the pick branch's own hygiene, and
      // opens its pie; the panel closes.
      view.rosterJump = (kindR, idR) => {
        let x = null, z = null;
        if (kindR === "sq") {
          const sq = run.squads.find((q) => q.id === idR);
          if (!sq) return;
          x = sq.anchor.x; z = sq.anchor.z;
          view.selSquadId = idR; view.selVehId = null;
        } else {
          const vb = world.byId.get(idR);
          if (!vb || !vb.alive) return;
          x = vb.pos.x; z = vb.pos.z;
          view.selVehId = idR; view.selSquadId = null;
        }
        view.selSquadIds = null; view.inspectId = null; view.orderMode = null; view.vehOrderMode = null;
        view.buildPt0 = null; view.linePending = null; view.groupSel = null; view.groupOrderMode = null; view.queueOn = false;
        view.selArmedAt = world.t + PENDING_ARM_S; view.pieOpen = true;
        run.focus.x = x; run.focus.z = z; run.focus.y = field.heightAt(x, z);
        view.rosterOpen = false;
        R.overlay.setLinePreview(false);
      };

      // The possessed unit's own sight circle: a
      // squad sees with its best living eye (a sniper pair's spotter reaches
      // 46), a tower with its height. The reticle lives inside THIS circle —
      // the ruling that closes the far-eyes range question.
      const possessCenter = () => {
        const P = input.possess;
        if (!P) return null;
        if (P.kind === "tower") { const b = world.byId.get(P.id); return b ? { x: b.pos.x, z: b.pos.z } : null; }
        if (P.kind === "vehicle") { const b = world.byId.get(P.id); return b ? { x: b.pos.x, z: b.pos.z } : null; }
        const sq = run.squads.find((q) => q.id === P.id);
        return sq ? { x: sq.anchor.x, z: sq.anchor.z } : null;
      };
      const possessSightR = () => {
        const P = input.possess;
        if (!P) return 0;
        if (P.kind === "tower") { const b = world.byId.get(P.id); return b ? eyeOf(b).r : 0; }
        if (P.kind === "vehicle") { const b = world.byId.get(P.id); return b ? eyeOf(b).r : 0; }
        const sq = run.squads.find((q) => q.id === P.id);
        let r = 0;
        if (sq) for (const id of sq.memberIds) { const u = world.byId.get(id); if (u && u.alive) r = Math.max(r, eyeOf(u).r); }
        return r;
      };
      // TAKE CONTROL — every squad type gets the
      // wedge. Digs the squad in where it stands (defend), hands the stick
      // over, and clears every other selection/order UI state the way
      // DEFEND's own instant action does.
      view.takeControl = () => {
        const sq = selectedSquad();
        if (!sq || world.t < view.selArmedAt) return;
        sq.order = "defend"; sq.dest = null; sq._legTarget = null; sq._pauseT = 0; sq._build = null; sq._threatSig = undefined; sq._queue = null;
        input.possess = { kind: "squad", id: sq.id };
        input.possessInput = { vx: 0, vz: 0 };
        // POSSESSION HYGIENE: a
        // stale reticle or a FIRE flag stuck by a mid-hold bell release can
        // never carry into the next possession — cleared on every take, same
        // as on release; the offset is then freshly seeded 4m ahead
        // (reclampReticle legalizes any seed) and the world point derived.
        input.fireHeld = false;
        view.reticleLockId = null;
        const pc0 = possessCenter();
        view.reticleOff = pc0 ? reclampReticle(T.sight, 1, pc0, possessSightR(), { dx: 0, dz: 4 }, map.invW) : null;
        input.reticle = pc0 && view.reticleOff ? { x: pc0.x + view.reticleOff.dx, z: pc0.z + view.reticleOff.dz } : null;
        view.selSquadId = null; view.selSquadIds = null; view.orderMode = null; view.buildPt0 = null; view.linePending = null;
        R.overlay.setLinePreview(false);
      };
      // TAKE CONTROL on a tower — gun towers
      // only (the tower pie's possess slot is gated on spec.fireRate > 0;
      // frost has none). No stick, no selection to clear beyond inspect.
      view.takeControlTower = (id) => {
        const b = world.byId.get(id);
        if (!b || b.kind !== "tower") return;
        input.possess = { kind: "tower", id: b.id };
        input.fireHeld = false;
        view.reticleLockId = null;
        const pc1 = possessCenter();
        view.reticleOff = pc1 ? reclampReticle(T.sight, 1, pc1, possessSightR(), { dx: 0, dz: 4 }, map.invW) : null;
        input.reticle = pc1 && view.reticleOff ? { x: pc1.x + view.reticleOff.dx, z: pc1.z + view.reticleOff.dz } : null;
        view.inspectId = null; view.pieOpen = false;
      };
      input.releasePossession = () => {
        if (!input.possess) return;
        const wasSquad = input.possess.kind === "squad";
        const sq = wasSquad ? run.squads.find((q) => q.id === input.possess.id) : null;
        // The Bison released where you left it — back to
        // auto driving, dug in (order defend), same intrinsic default a
        // released squad gets.
        if (input.possess.kind === "vehicle") {
          const pv = world.byId.get(input.possess.id);
          if (pv && pv.alive) { pv.depotDrive = "auto"; pv.order = "defend"; pv.dest = null; pv.goal = null; }
        }
        // THE MECH: released back to depotDrive-less auto — the
        // driver's own goal policy (drivers.js DRIVERS.mech) resumes next
        // tick off the hull's order/dest, no ctl channel involved.
        if (input.possess.kind === "mech") {
          const pm = world.byId.get(input.possess.id);
          if (pm && pm.alive) { pm.order = "defend"; pm.dest = null; pm._route = null; pm._routeDest = null; }
          R.setTraj(null); // the ballistic preview dies with the possession
        }
        input.possess = null; input.possessInput = null;
        // POSSESSION HYGIENE: the
        // same stale-trigger clear, on every release — the reticle and its
        // offset die with the possession, fireHeld can't stick from a
        // mid-hold bell release.
        input.reticle = null; view.reticleOff = null; input.fireHeld = false; input.mgHeld = false;
        view.reticleLockId = null;
        // THE CONVOY WAITS — a hand dealt during the
        // possession opens the moment the possession ends.
        if (run.manifest && run.manifest.hand.length && !run.manifest.cardUp) { run.manifest.cardUp = true; run.manifest.armedAt = world.t + PENDING_ARM_S; }
        if (sq) {
          // released where you left them: dig in — the intrinsic default
          sq.order = "defend"; sq.dest = null; sq._legTarget = null; sq._threatSig = undefined;
          sq._surveyPending = true;
        }
      };

      // =================================== THE TWO-POINT BUILD LINE
      // Tap where the line starts, tap where it ends. The squad walks to the
      // start, lays end-to-end along the line, and digs in at the far end.
      //
      // GEOMETRY, stated once because it is the whole design constraint: the
      // build grid's pitch is map.GRID_CS (2.0m) and BOTH pieces are 1.8m along
      // their long axis (a bag is 1.8 x 0.9 x 0.7; a wall course is a 1.8m-wide
      // face, WALL_HALF 0.9 / WALL_THIN 0.35). So a straight run lays pieces
      // 2.0m apart that are each 1.8m long: end-to-end bar a 0.2m joint at every
      // cell boundary — exactly the joint a hand-built line already has, since
      // both go through the same grid. The pitch is the constraint, not the
      // piece, and closing it would mean re-pitching every buildable in the game.
      //
      // ONE ROTATION FOR THE WHOLE LINE — this supersedes the
      // per-step "staircase" rotation the brief described. The engine's boxes
      // are axis-aligned and there is no rotated collider in this codebase, so
      // a line gets the CLOSEST LOGICAL ROTATION to its overall start->end
      // direction — its dominant axis, computed once at order time — and every
      // piece on the line is laid at that one angle. Most orders are drawn
      // axis-aligned anyway; on an off-axis order the cell path still walks the
      // true segment (4-connected, so consecutive cells always share an EDGE),
      // which puts the uniformly-rotated pieces into parallel offset runs where
      // the path sidesteps. That offset is accepted: a line of pieces all facing
      // the same way reads as one work, and alternating them at every sidestep
      // THE PROPOSED LINE. The second tap of a
      // two-point order proposes; nothing walks until the owner of the tap
      // accepts. Ghost pieces skip exactly the cells laying would skip
      // (scrap aside — that is walk-time), so the preview never lies.
      const LINE_END_R = 2.5;   // m — a tap this close to an endpoint disc picks it up
      const refreshLinePreview = () => {
        const lp = view.linePending;
        if (!lp) { R.overlay.setLinePreview(false); return; }
        const pieces = linePieces(grid, field, T, lp.kind, lp.a, lp.b, map);
        lp.count = pieces.length;
        const fpPrev = run._market ? fieldPrices(run._market.counts, WALL_FIELD_COST, SANDBAG_FIELD_COST) : { wall: WALL_FIELD_COST, bag: SANDBAG_FIELD_COST };
        const mpPrev = run._minePrices || { mine: MINE_COST, wire: WIRE_COST };
        lp.cost = lp.kind === "walls" ? pieces.length * fpPrev.wall
                : lp.kind === "bags" ? pieces.length * fpPrev.bag
                : lp.kind === "mines" ? pieces.length * mpPrev.mine
                : lp.kind === "wires" ? pieces.length * mpPrev.wire : 0;
        R.overlay.setLinePreview(true, {
          a: { x: lp.a.x, z: lp.a.z, y: field.heightAt(lp.a.x, lp.a.z) },
          b: { x: lp.b.x, z: lp.b.z, y: field.heightAt(lp.b.x, lp.b.z) },
          pieces,
          color: lp.kind === "walls" ? 0x9fdcff : lp.kind === "patrol" ? 0x7fd7ff : 0xffd27a,
        });
      };
      const acceptLine = () => {
        const lp = view.linePending;
        if (!lp) return;
        if (!pendingArmed(lp, world.t)) { toast("HOLD — ARMING"); return; }
        if (lp.veh != null) {
          const v = world.byId.get(lp.veh);
          view.linePending = null;
          R.overlay.setLinePreview(false);
          if (v && v.alive) {
            // QUEUE lit with a moving head — the patrol appends as
            // the terminal leg and the light goes out.
            if (view.queueOn && (v.order === "move" || v.order === "attack") && v.dest) {
              (v._queue || (v._queue = [])).push({ kind: "patrol", ax: lp.a.x, az: lp.a.z, bx: lp.b.x, bz: lp.b.z });
              view.queueOn = false;
            } else {
              v._patA = { x: lp.a.x, z: lp.a.z }; v._patB = { x: lp.b.x, z: lp.b.z };
              v.order = "patrol"; v.dest = { x: lp.a.x, z: lp.a.z }; v._route = null; v._routeDest = null;
              v._queue = null; // a plain order wipes the chain
            }
          }
          view.selVehId = null; view.vehOrderMode = null; view.buildPt0 = null;
          return;
        }
        const sq = run.squads.find((q) => q.id === lp.sq);
        view.linePending = null;
        R.overlay.setLinePreview(false);
        if (sq) {
          if (lp.kind === "patrol") {
            // Accept arms the loop — for the
            // whole SELECT ALL group when one proposed the line.
            const group = (lp.sqs && lp.sqs.length ? lp.sqs : [lp.sq]).map((id) => run.squads.find((q) => q.id === id)).filter(Boolean);
            // With QUEUE lit and a moving head, the accepted patrol
            // APPENDS as the chain's terminal leg and puts the light out.
            const qsq0 = group.length === 1 ? group[0] : null;
            if (view.queueOn && qsq0 && (qsq0.order === "move" || qsq0.order === "attack" || qsq0.order === "build") && qsq0.dest) {
              (qsq0._queue || (qsq0._queue = [])).push({ kind: "patrol", ax: lp.a.x, az: lp.a.z, bx: lp.b.x, bz: lp.b.z });
              view.queueOn = false;
            } else for (const gsq of group) {
              gsq._patA = { x: lp.a.x, z: lp.a.z };
              gsq._patB = { x: lp.b.x, z: lp.b.z };
              gsq.order = "patrol";
              gsq.dest = { x: lp.a.x, z: lp.a.z };   // walk to the near end first
              gsq._legTarget = null; gsq._pauseT = 0; gsq._cohesionHoldT = 0; gsq._build = null;
              gsq._queue = null; // a plain order wipes the chain
            }
          }
          else if (view.queueOn && (sq.order === "move" || sq.order === "attack" || sq.order === "build") && sq.dest) {
            // The queued line — the chain carries it to the ground;
            // the light STAYS lit (a line is mid-chain, not terminal).
            (sq._queue || (sq._queue = [])).push({ kind: "line", line: lp.kind, ax: lp.a.x, az: lp.a.z, bx: lp.b.x, bz: lp.b.z });
          }
          else { startBuildLine(grid, sq, lp.kind, lp.a, lp.b, toast); sq._queue = null; } // a plain line wipes the chain
        }
        view.selSquadId = null; view.orderMode = null; view.buildPt0 = null; view.selSquadIds = null;
      };
      const rejectLine = () => {
        view.linePending = null;
        R.overlay.setLinePreview(false);
        view.selSquadId = null; view.orderMode = null; view.buildPt0 = null; view.selSquadIds = null;
        view.selVehId = null; view.vehOrderMode = null;
      };
      view.acceptLine = acceptLine; view.rejectLine = rejectLine;
      // The driver, once per sim tick per squad carrying a job.
      const layCtx = { stampBag, recomputeFlow, objG, setMines: (m) => R.setMines(m) };
      input.stepBuildLine = (sq) => stepBuildLine(world, grid, field, T, run, sq, layCtx, toast, map);
      // THE QUEUED LINE — when the chain's next leg is a
      // line, the squad stands at its arrival point until the scrap covers
      // the WHOLE line (the pending-preview's own arithmetic), then the
      // entry shifts and the line starts. Mid-line dryness keeps its own
      // law ("THE LINE STOPS HERE") — this gate is the start, not the laying.
      input.stepChainBuild = (sq) => {
        if (sq._build || sq.order !== "defend" || !sq._queue || !sq._queue.length || sq._queue[0].kind !== "line") return;
        const q = sq._queue[0];
        const a = { x: q.ax, z: q.az }, b = { x: q.bx, z: q.bz };
        const pieces = linePieces(grid, field, T, q.line, a, b, map);
        const fp = run._market ? fieldPrices(run._market.counts, WALL_FIELD_COST, SANDBAG_FIELD_COST) : { wall: WALL_FIELD_COST, bag: SANDBAG_FIELD_COST };
        const mp = run._minePrices || { mine: MINE_COST, wire: WIRE_COST };
        const price = q.line === "walls" ? pieces.length * fp.wall
                    : q.line === "bags" ? pieces.length * fp.bag
                    : q.line === "mines" ? pieces.length * mp.mine
                    : pieces.length * mp.wire;
        if (run.resources < price) return; // stand and wait
        sq._queue.shift(); if (!sq._queue.length) sq._queue = null;
        startBuildLine(grid, sq, q.line, a, b, toast);
      };
      // The enemy's build driver — same machinery, his books. The
      // façade carries reg.scrap through run-shaped fields and settles after.
      input.stepFoeBuildLine = (sq) => {
        const SE = { resources: run.reg.scrap, mines: run.mines, sandbagOrient: 0, _market: run._market, _minePrices: run._minePrices };
        stepBuildLine(world, grid, field, T, SE, sq, { stampBag, recomputeFlow, objG, setMines: (m) => R.setMines(m) }, () => {}, map);
        run.reg.scrap = SE.resources;
      };
      // The order flow's ground taps, in one place. tapAt calls this with the
      // point its ray hit; the debug harness calls it with a world point
      // directly, so both drive the identical code.
      // The group's ground tap — MOVE or ATTACK lands on every squad
      // and hull in the sweep at once, then the group is released.
      const consumeGroupOrderTap = (p) => {
        const om = view.groupOrderMode;
        if (!om || !view.groupSel) return false;
        const d = map.clampToRim(p.x, p.z);
        if (map.streamAt(d.x, d.z)) { toast("OPEN WATER — find the crossing"); return true; }
        const gs = view.groupSel;
        for (const qid of gs.sqIds) {
          const gsq = run.squads.find((q) => q.id === qid);
          if (gsq) { gsq.order = om; gsq.dest = { x: d.x, z: d.z }; gsq._legTarget = null; gsq._pauseT = 0; gsq._build = null; gsq._queue = null; }
        }
        for (const vid of gs.vehIds) {
          const gv = world.byId.get(vid);
          if (gv && gv.alive) { gv.order = om; gv.dest = { x: d.x, z: d.z }; gv._route = null; gv._routeDest = null; gv._queue = null; }
        }
        view.groupSel = null; view.groupOrderMode = null; view.pieOpen = false;
        return true;
      };
      const consumeOrderTap = (p) => {
        const om = view.orderMode;
        if (!om) return false;
        const osq = selectedSquad();
        // OFF-MAP CLAMP: the tap ray hits the painted ground well past
        // the playable rim, and a squad ordered out there walks off the field
        // and never arrives. BOTH points of a build order clamp through here
        // too — this is THE site where a ground tap becomes a destination.
        const d = map.clampToRim(p.x, p.z);
        // Open water takes no orders — the river is ground for nobody.
        if (map.streamAt(d.x, d.z)) { toast("OPEN WATER — find the crossing"); return true; }
        if (om === "attack" || om === "move") {
          // THE CHAIN BUILDER — with QUEUE lit the tap
          // APPENDS to the selected squad's chain; the selection and the aim
          // stay up so taps keep laying legs. A moving head is required: the
          // first tap on an idle squad becomes the active order. A standing
          // patrol is terminal — nothing chains after it.
          if (view.queueOn) {
            const qsq = selectedSquad();
            if (qsq) {
              if (qsq.order === "patrol") { toast("THE CHAIN ENDS AT A PATROL"); return true; }
              if ((qsq.order === "move" || qsq.order === "attack" || qsq.order === "build") && qsq.dest) {
                (qsq._queue || (qsq._queue = [])).push({ kind: om, x: d.x, z: d.z });
                return true;
              }
              qsq.order = om; qsq.dest = { x: d.x, z: d.z }; qsq._legTarget = null; qsq._pauseT = 0; qsq._build = null;
              return true;
            }
          }
          for (const gsq of selectedGroup()) { gsq.order = om; gsq.dest = { x: d.x, z: d.z }; gsq._legTarget = null; gsq._pauseT = 0; gsq._build = null; gsq._queue = null; }
          view.orderMode = null;
          // The order's final ground tap landed — the
          // squad is released (deselected), same as an instant order.
          view.selSquadId = null; view.selSquadIds = null;
          return true;
        }
        if (om === "build_bags" || om === "build_walls") {
          if (!osq || osq.type !== "engineers") { view.orderMode = null; view.buildPt0 = null; view.selSquadId = null; view.selSquadIds = null; return true; }
          if (!view.buildPt0) { view.buildPt0 = { x: d.x, z: d.z }; toast("LINE START — TAP THE FAR END"); return true; }
          // The second tap PROPOSES — view.linePending goes
          // up, the squad stays selected, and nothing walks until acceptLine.
          view.linePending = { kind: om === "build_walls" ? "walls" : "bags", sq: osq.id,
            a: { x: view.buildPt0.x, z: view.buildPt0.z }, b: { x: d.x, z: d.z },
            moving: null, armedAt: world.t + PENDING_ARM_S };
          view.buildPt0 = null; view.orderMode = null;
          refreshLinePreview();
          return true;
        }
        // MINES and WIRES — the identical two-tap shape build_bags/
        // build_walls use, sapper-gated (the type check mirrors the
        // engineer build gate above).
        if (om === "build_mines" || om === "build_wires") {
          if (!osq || osq.type !== "sappers") { view.orderMode = null; view.buildPt0 = null; view.selSquadId = null; view.selSquadIds = null; return true; }
          if (!view.buildPt0) { view.buildPt0 = { x: d.x, z: d.z }; toast("LINE START — TAP THE FAR END"); return true; }
          view.linePending = { kind: om === "build_mines" ? "mines" : "wires", sq: osq.id,
            a: { x: view.buildPt0.x, z: view.buildPt0.z }, b: { x: d.x, z: d.z },
            moving: null, armedAt: world.t + PENDING_ARM_S };
          view.buildPt0 = null; view.orderMode = null;
          refreshLinePreview();
          return true;
        }
        if (om === "patrol") {
          // Same shape as the build branch above, kind
          // "patrol", no engineer guard — every squad type the pie offers
          // this wedge to (not engineers, not sappers) rides it.
          if (!osq) { view.orderMode = null; view.buildPt0 = null; view.selSquadId = null; view.selSquadIds = null; return true; }
          if (!view.buildPt0) { view.buildPt0 = { x: d.x, z: d.z }; toast("PATROL START — TAP THE FAR END"); return true; }
          view.linePending = { kind: "patrol", sq: osq.id, sqs: selectedGroup().map((q) => q.id),
            a: { x: view.buildPt0.x, z: view.buildPt0.z }, b: { x: d.x, z: d.z },
            moving: null, armedAt: world.t + PENDING_ARM_S };
          view.buildPt0 = null; view.orderMode = null;
          refreshLinePreview();
          return true;
        }
        return false;
      };
      // The Bison's own ground taps — mirrors consumeOrderTap's
      // shape. ESCORT catches a squad tap here (before squad selection would
      // steal it — tapAt's order matters).
      const consumeVehOrderTap = (p) => {
        const om = view.vehOrderMode;
        if (!om) return false;
        const v = selectedVehicle();
        if (!v) { view.vehOrderMode = null; view.selVehId = null; view.buildPt0 = null; return true; }
        if (om === "escort") {
          const sq = squadAtPoint(p);
          if (!sq) { toast("TAP A SQUAD TO ESCORT"); return true; }
          // With QUEUE lit and a moving head, ESCORT appends as the
          // chain's terminal link and the light goes out — patrol's own law.
          if (view.queueOn) {
            if (v.order === "patrol") { toast("THE CHAIN ENDS AT A PATROL"); return true; }
            if ((v.order === "move" || v.order === "attack") && v.dest) {
              (v._queue || (v._queue = [])).push({ kind: "escort", escortId: sq.id });
              view.queueOn = false;
              view.vehOrderMode = null;
              return true;
            }
          }
          v.order = "escort"; v.escortId = sq.id; v.dest = null; v.goal = null; v._route = null; v._routeDest = null; v._queue = null;
          view.vehOrderMode = null; view.selVehId = null;
          return true;
        }
        // LOAD — tap a squad, it walks to the ramp and boards.
        if (om === "load") {
          if (v.vtype !== "apc" && v.vtype !== "jeep") { view.vehOrderMode = null; return true; }
          const sq = squadAtPoint(p);
          if (!sq) { toast("TAP A SQUAD TO LOAD"); return true; }
          if (input.possess && input.possess.kind === "squad" && input.possess.id === sq.id) { toast("RELEASE THEM FIRST"); return true; }
          let live = 0;
          for (const id of sq.memberIds) { const u = world.byId.get(id); if (u && u.alive) live++; }
          const free = seatsOf(v) - apcSeated(world, run.squads, v.apcSeq);
          if (live > free) { toast("NO ROOM — " + free + (free === 1 ? " SEAT" : " SEATS")); return true; }
          sq._boarding = v.apcSeq; sq._build = null;
          view.vehOrderMode = null; view.selVehId = null;
          return true;
        }
        const d = map.clampToRim(p.x, p.z);
        if (map.streamAt(d.x, d.z)) { toast("OPEN WATER — find the crossing"); return true; }
        if (om === "move" || om === "attack") {
          // The chain builder — QUEUE lit appends; see the squad tap.
          if (view.queueOn) {
            if (v.order === "patrol") { toast("THE CHAIN ENDS AT A PATROL"); return true; }
            if ((v.order === "move" || v.order === "attack") && v.dest) {
              (v._queue || (v._queue = [])).push({ kind: om, x: d.x, z: d.z });
              return true;
            }
            v.order = om; v.dest = { x: d.x, z: d.z }; v._route = null; v._routeDest = null;
            return true;
          }
          v.order = om; v.dest = { x: d.x, z: d.z }; v._route = null; v._routeDest = null; v._queue = null;
          view.vehOrderMode = null; view.selVehId = null;
          return true;
        }
        if (om === "patrol") {   // the two-point confirm law, verbatim from squads
          if (!view.buildPt0) { view.buildPt0 = { x: d.x, z: d.z }; toast("PATROL START — TAP THE FAR END"); return true; }
          view.linePending = { kind: "patrol", veh: v.id, a: { x: view.buildPt0.x, z: view.buildPt0.z }, b: { x: d.x, z: d.z }, moving: null, armedAt: world.t + PENDING_ARM_S };
          view.buildPt0 = null; view.vehOrderMode = null;
          refreshLinePreview();
          return true;
        }
        return false;
      };
      // Per-tower fire discipline toggle — the tower
      // radial's CAREFUL/FREE slot. Mirrors stepTowers's own fallback chain.
      view.setTowerDiscipline = (id) => {
        const b = world.byId.get(id);
        if (!b || b.kind !== "tower") return;
        b.discipline = (b.discipline || input.discipline || "careful") === "careful" ? "free" : "careful";
      };
      const tapAt = (cx, cy) => {
        // PLACE MODE — pre-start ground taps put the picks down.
        if (!run.started && view._placeQueue && view._placeQueue.length) {
          if (view.infoKey) return; // the card is up — read it first (PLACE IT closes it)
          const p0 = groundPoint(cx, cy);
          // The tap sets or MOVES a confirm ghost — nothing
          // fields until the ✓. Wall-clock arming: the sim is frozen here.
          if (p0) view.pending = { deal: view._placeQueue[0], wp: { x: p0.x, z: p0.z }, y: field.heightAt(p0.x, p0.z), poly: null, ringR: 0, color: 0x4aff8c, cost: 0, wallArm: true, armedAtWall: performance.now() / 1000 + PENDING_ARM_S, fp: ghostFp(view._placeQueue[0]) };
          return;
        }
        // An armed enemy-rack pick owns every ground tap — repeated
        // taps keep placing until the rack button is tapped again.
        if (dev && view.devSpawn) {
          const pd = groundPoint(cx, cy);
          if (pd) devSpawnAt(pd);
          return;
        }
        if (!run.started || run.gameOver || run.victory) return;
        // THE HIRE'S TAP — an armed placement owns the ground tap.
        if (view.hirePlace) {
          const ph = groundPoint(cx, cy);
          // The tap sets or MOVES the confirm ghost.
          if (ph) view.pending = { hire: view.hirePlace.key, wp: { x: ph.x, z: ph.z }, y: field.heightAt(ph.x, ph.z), poly: null, ringR: 0, color: 0x7dffa8, cost: priceNow(view.hirePlace.key, (PALETTE_BY_KEY[view.hirePlace.key] || { cost: 10 }).cost), armedAt: world.t + PENDING_ARM_S, fp: ghostFp(view.hirePlace.key) };
          return;
        }
        // any tap on the canvas while a placement is pending resolves it —
        // confirm/cancel are the ✓/✗ HTML buttons (separate DOM elements,
        // so their own onClick fires instead of this canvas handler); a tap
        // that reaches here is by definition "elsewhere" and cancels.
        // Only while the ✓/✗ pair is actually ON SCREEN. Panned off
        // the viewport, the pending is invisible, and eating the player's
        // next ground tap to "resolve" it is a stolen tap.
        if (canvasTapConsumesPending(view.pending, view.pendingScreen, canvas.getBoundingClientRect())) { clearPending(); return; }
        if (view.pending) clearPending();
        const p = groundPoint(cx, cy);
        if (!p) { view.inspectId = null; return; }
        // TAP TO AIM — while possessed, a ground tap JUMPS the
        // reticle: clamped to the sight circle (steerReticle's own
        // arithmetic), refused on dark ground (the reticle stays put), and
        // the loop's sticky snap lands any nearby lock. Fire stays on the
        // trigger. The mech keeps no reticle.
        if (input.possess) {
          if (input.possess.kind === "mech") return;
          const rc0 = possessCenter();
          if (rc0 && view.reticleOff) {
            let dx0 = p.x - rc0.x, dz0 = p.z - rc0.z;
            const rR0 = possessSightR(), d0 = Math.hypot(dx0, dz0);
            if (d0 > rR0 && d0 > 1e-9) { dx0 *= rR0 / d0; dz0 *= rR0 / d0; }
            const cc0 = map.invW(rc0.x + dx0, rc0.z + dz0);
            if (seenAt(T.sight, cc0.u, cc0.v, 1)) {
              view.reticleOff = { dx: dx0, dz: dz0 };
              input.reticle = { x: rc0.x + dx0, z: rc0.z + dz0 };
            }
          }
          return;
        }
        // While a proposed line is up, ground taps belong
        // to it — tap an endpoint disc to pick it up, tap ground to re-place a
        // picked-up endpoint. Accept/reject (the buttons) are the only exits;
        // a stray tap can never fire the order or steal the selection.
        if (view.linePending) {
          const lp = view.linePending;
          if (lp.moving) {
            const m = map.clampToRim(p.x, p.z);
            lp[lp.moving] = { x: m.x, z: m.z };
            lp.moving = null;
            lp.armedAt = world.t + PENDING_ARM_S;
            refreshLinePreview();
          } else if (Math.hypot(p.x - lp.a.x, p.z - lp.a.z) < LINE_END_R) { lp.moving = "a"; toast("TAP THE NEW START"); }
          else if (Math.hypot(p.x - lp.b.x, p.z - lp.b.z) < LINE_END_R) { lp.moving = "b"; toast("TAP THE NEW END"); }
          return;
        }
        // Squad order flow: an armed ATTACK/MOVE consumes this ground tap as the
        // destination (flag marker renders at dest until arrival); an armed
        // BUILD consumes TWO — the line's start, then its far end.
        if (consumeOrderTap(p)) return;
        if (consumeGroupOrderTap(p)) return;
        if (consumeVehOrderTap(p)) return;
        // THE TAP CYCLES. Every pickable thing near the tap —
        // squads, hulls, towers (towers only in plain command, so a build
        // tap is never stolen by the tower next door; the exact-cell tower
        // tap below keeps today's behavior in every mode) — nearest first;
        // tapping again hands the pick to the next one around.
        const cands = [];
        for (const sq of run.squads) {
          if (sq.ridingIn != null) continue; // a sealed squad is not tappable
          let dBest = Infinity;
          for (const id of sq.memberIds) {
            const u = world.byId.get(id);
            if (u && u.alive) { const d2 = Math.hypot(u.pos.x - p.x, u.pos.z - p.z); if (d2 < dBest) dBest = d2; }
          }
          if (dBest <= TAP_SQUAD_M) cands.push({ key: "sq:" + sq.id, d: dBest });
        }
        for (const b of world.bodies) {
          if (!b.alive || b.team !== 1) continue;
          if (b.kind === "vehicle" || b.kind === "mech") {
            const d2 = Math.hypot(b.pos.x - p.x, b.pos.z - p.z);
            if (d2 <= TAP_HULL_M) cands.push({ key: "veh:" + b.id, d: d2 });
          } else if (b.kind === "tower" && !run.mode && !view.sellMode) {
            const d2 = Math.hypot(b.pos.x - p.x, b.pos.z - p.z);
            if (d2 <= TAP_TOWER_M) cands.push({ key: "twr:" + b.id, d: d2 });
          }
        }
        const curSel = view.selSquadId != null ? "sq:" + view.selSquadId
          : view.selVehId != null ? "veh:" + view.selVehId
          : view.inspectId != null && cands.some((c) => c.key === "twr:" + view.inspectId) ? "twr:" + view.inspectId : null;
        const pick = nextPick(cands, curSel);
        if (pick) {
          const id = +pick.key.slice(pick.key.indexOf(":") + 1);
          view.selSquadId = null; view.selSquadIds = null; view.selVehId = null; view.inspectId = null;
          view.orderMode = null; view.vehOrderMode = null; view.buildPt0 = null;
          view.groupSel = null; view.groupOrderMode = null; // a single pick releases the group
          view.queueOn = false; // a fresh selection starts unlit
          view.selArmedAt = world.t + PENDING_ARM_S; view.pieOpen = true;
          if (pick.key.startsWith("sq:")) view.selSquadId = id;
          else if (pick.key.startsWith("veh:")) view.selVehId = id;
          else view.inspectId = id;
          if (pick.key.startsWith("sq:")) view.teachPie("squad", run.squads.find((q) => q.id === id));
          else if (pick.key.startsWith("veh:")) view.teachPie("veh", world.byId.get(id));
          else view.teachPie("tower", world.byId.get(id));
          return;
        }
        if (view.groupSel) { view.groupSel = null; view.groupOrderMode = null; view.pieOpen = false; return; }
        if (view.selSquadId != null) { view.selSquadId = null; view.selSquadIds = null; view.orderMode = null; view.buildPt0 = null; view.pieOpen = false; view.queueOn = false; return; }
        if (view.selVehId != null) { view.selVehId = null; view.vehOrderMode = null; view.buildPt0 = null; view.pieOpen = false; view.queueOn = false; return; }
        const g = grid.worldToGrid(p.x, p.z);
        if (!grid.inBounds(g.gx, g.gz)) { view.inspectId = null; return; }
        const cell2 = grid.cells[grid.idx(g.gx, g.gz)];
        if (view.sellMode) { view.inspectId = null; sellAt(g.gx, g.gz); return; }
        if (cell2.wallId && world.byId.has(cell2.wallId)) { view.inspectId = cell2.wallId; view.pieOpen = true; return; }
        view.inspectId = null;
        if (SQUAD_MODE[run.mode]) {
          const v = canPlaceInfantryAt(g.gx, g.gz, priceNow(run.mode, SQUAD_SPECS[SQUAD_MODE[run.mode]].cost));
          if (!v.ok) { toast(v.msg); return; }
          startPendingSquad(g.gx, g.gz, run.mode, v.wp);
          return;
        }
        if (HERO_MODE[run.mode]) {
          const price = priceNow(run.mode, PALETTE_BY_KEY[run.mode].cost);
          const v = canPlaceInfantryAt(g.gx, g.gz, price);
          if (!v.ok) { toast(v.msg); return; }
          view.pending = { hero: run.mode, wp: v.wp, y: field.heightAt(v.wp.x, v.wp.z), poly: null, ringR: 0, color: 0x9fdcff, cost: price, armedAt: world.t + PENDING_ARM_S, fp: ghostFp(run.mode) };
          return;
        }
        if (run.mode && TOWER_SPECS[run.mode]) {
          const v = canBuildAt(g.gx, g.gz, run.mode);
          if (!v.ok) { toast(v.msg); return; }
          startPending(g.gx, g.gz, run.mode, v);
        }
      };

  return { tapAt, consumeOrderTap, possessCenter, possessSightR };
}
