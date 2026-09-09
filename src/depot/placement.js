import { addBody, heading } from "../engine/core.js";
import { buildMech } from "../engine/mech.js";
import { TOWER_SPECS, BISON, APC, JEEP, MECH, INFANTRY_ARMS, fitJeep } from "./specs.js";
import { SQUAD_SPECS, makeSquad, slotBlockedPublic, roomMaskPublic } from "./squads.js";
import { effRange, validatePlacement, PENDING_ARM_S, pendingArmed, spawnSquadMembers, spawnWallCourses, wallOrientAt, forgetWelds, takeHandCard, placeZoneMask, WALL_COST } from "./state.js";
import { reachPolygon } from "./accuracy.js";
import { spawnUnit } from "./units.js";
import { armorSpread, armorStable, MECH_SPREAD, PICK_POOL } from "./muster.js";
import { canBuild } from "./territory.js";
import { PALETTE_BY_KEY, FOE_RACK_BY_KEY } from "./palette.js";

export function makePlacement(ctx) {
  const { world, run, view, input, map, grid, field, T, R, dev,
    toast, cue, setHud, nextApcSeq, depotP, recomputeFlow } = ctx;
      // THE LIVING MARKET: the live price for a bar key, falling
      // back to the base cost whenever the market cache hasn't computed yet
      // (the first second of a run). buyPaced is the once-a-second purchase
      // limiter — towers and squads only (interpretation line 3: engineer
      // line pieces are priced live but not paced).
      const priceNow = (key, base) => (dev ? 0 : run._market && run._market.player[key] != null ? run._market.player[key] : base);
      const buyPaced = () => {
        if (dev) return true;
        if (world.t - run._buyAt < 1) { toast("THE MARKET PACES YOU — one purchase a second"); return false; }
        return true;
      };
      const buildAt = (gx, gz, mode) => {
        if (!grid.inBounds(gx, gz)) return;
        const cell = grid.cells[grid.idx(gx, gz)];
        if (cell.water) { toast("NO GROUND — open water"); return; }
        if (cell.blocked || cell.wallId) { toast("OCCUPIED"); return; }
        if (cell.ice) { toast("NO GROUND — frozen water"); return; }
        {
          const wp0 = grid.gridToWorld(gx, gz), c0 = map.invW(wp0.x, wp0.z);
          if (!(dev || canBuild(T, c0.u, c0.v))) { toast("GROUND NOT HELD"); return; }
        }
        const spec = mode === "wall" ? null : TOWER_SPECS[mode];
        const cost = spec ? priceNow(mode, spec.cost) : (dev ? 0 : WALL_COST); // walls: no TOWER_SPECS row, state.js owns the price
        if (run.resources < cost) { toast("NO SCRAP"); return; }
        cell.blocked = true;
        // The road rule EXPUNGED — a sealed map is the
        // attacker's problem; the siege flow marches it onto the wall.
        if (!buyPaced()) { cell.blocked = false; return; }
        const wp = grid.gridToWorld(gx, gz);
        const y = field.heightAt(wp.x, wp.z);
        let b;
        if (spec) {
          b = addBody(world, { kind: "tower", team: 1, mass: 0, hx: 0.8, hy: spec.hy, hz: 0.8, x: wp.x, y: y + spec.hy, z: wp.z, hp: spec.hp });
          b.towerType = mode;
          b.flagPole = true;
          // effRange cached once: towers are static, so the
          // elevation-scaled acquisition range never changes after this.
          // Derived from the LIVE body so it matches towerShot's muzzle
          // (pos.y + hy + 0.45 = turret TOP + 0.45) and can never drift —
          // the old ground+hy+0.45 form sat a full half-height below the
          // muzzle and under-computed the elevation bonus.
          b.effRange = effRange(world, { x: b.pos.x, y: b.pos.y + b.hy + 0.45, z: b.pos.z }, spec);
        } else {
          // One wall, three welded courses (state.js owns the
          // dimensions, the hp split and the weld). The CELL owns all three;
          // cell.wallId is the BOTTOM course, because its death is what
          // releases the ground and brings the rest down.
          // Walls are thin faces now — default broadside to the
          // enemy's advance (canonical v is the advance axis, so the long
          // axis lies along canonical u: world x when map.ORIENT is even, world
          // z when odd), and a wall built next to a wall continues its line.
          b = spawnWallCourses(world, wp.x, y, wp.z, wallOrientAt(world, wp.x, wp.z, map.ORIENT % 2))[0];
        }
        b.maxHp = b.hp;
        cell.wallId = b.id;
        cell.bTeam = b.team || 1;
        run.resources -= cost;
        run._buyAt = world.t;
        recomputeFlow();
        standDown();
      };
      // Validate-only twin of buildAt's early checks: used to gate
      // entry into the pending-confirm flow WITHOUT mutating anything —
      // cell.blocked stays false, no scrap moves, until confirmPending()
      // below actually calls buildAt. Mirrors buildAt's checks exactly
      // (same order, same toasts) so a cell that would fail at confirm time
      // never gets this far in the first place.
      const canBuildAt = (gx, gz, mode) => {
        if (!grid.inBounds(gx, gz)) return { ok: false };
        const cell = grid.cells[grid.idx(gx, gz)];
        if (cell.water) return { ok: false, msg: "NO GROUND — open water" };
        const wp = grid.gridToWorld(gx, gz), c0 = map.invW(wp.x, wp.z);
        const spec = TOWER_SPECS[mode];
        const v = validatePlacement({
          blocked: !!(cell.blocked || cell.wallId), ice: !!cell.ice,
          held: (dev || canBuild(T, c0.u, c0.v)), resources: run.resources, cost: priceNow(mode, spec.cost),
        });
        return v.ok ? { ok: true, spec, wp } : v;
      };
      // Pending placement: tap a buildable cell in tower mode ->
      // ghost + reach polygon + ✓/✗, armed after 350ms, no scrap spent until
      // confirmPending. Walls stay exempt (instant, via buildAt directly) —
      // a ring/confirm pair on a 5-scrap wall is meaningless (brief).
      const clearPending = () => {
        if (view.pending && view.pending.hire) { view.hirePlace = null; if (view.openManifest) view.openManifest(); }
        view.pending = null;
      };
      const startPending = (gx, gz, mode, v) => {
        const spec = v.spec, wp = v.wp;
        const y = field.heightAt(wp.x, wp.z);
        // Ghost muzzle at the TRUE turret top (ground + 2*hy + 0.45) —
        // same height buildAt's body-derived effRange and towerShot use, so
        // the preview's sightlines originate where the tower will fire from.
        const muzzle = { x: wp.x, y: y + spec.hy * 2 + 0.45, z: wp.z };
        let poly = null, ringR = 0, color = 0xff5544;
        if (mode === "tesla") {
          // aura, not a gun: plain radius, no LOS clipping, blue-white —
          // "honest about what it does" (brief).
          ringR = spec.range;
          color = 0x9fdcff;
        } else {
          // T deliberately null (playtest fix): the preview shows what the
          // tower COULD reach — terrain/solid clipping only (arcClears is
          // unconditional inside reachPolygon). Live acquisition stays
          // fog-gated (stepTowers' own fieldReaches) — the guns obey what is.
          poly = reachPolygon(world, null, muzzle, spec, 1, map.invW);
        }
        view.pending = { gx, gz, mode, wp, y, poly, ringR, color, cost: priceNow(mode, spec.cost), armedAt: world.t + PENDING_ARM_S };
      };
      // A PLACEMENT STANDS THE MENU DOWN — success clears
      // the armed mode and its ground tint back to plain command.
      // The bench's enemy rack keeps repeat placement; refusals keep the arm.
      const standDown = () => {
        run.mode = null; view.pending = null; view.buildPt0 = null;
        setHud((h) => ({ ...h, mode: null }));
      };
      const confirmPending = () => {
        const p = view.pending;
        // The arm guard stays (the opening tap must not double-fire
        // as the confirm), but an early ✓ tap SAYS so instead of vanishing —
        // and leaves the pending exactly as it was, so the next tap works.
        if (!pendingArmed(p, world.t)) { if (p) toast("HOLD — ARMING"); return; }
        // The confirm ghosts — ✓ runs the REAL placer; a refusal
        // (bad ground, too far, no scrap) leaves the ghost standing.
        if (p.deal) { const n0 = view._placeQueue.length; placePick(p.wp); if (view._placeQueue.length !== n0) view.pending = null; return; }
        if (p.hire) { placeHire(p.wp); if (!view.hirePlace) view.pending = null; return; }
        if (p.hero) { if (placeHero(p.hero, p.wp)) view.pending = null; return; }
        view.pending = null;
        if (p.squad) { placeSquadAt(p.gx, p.gz, p.squad); return; }
        buildAt(p.gx, p.gz, p.mode);
      };
      // ---------------------------------------------- squads
      // Build-bar mode keys -> squad type. Prefixed (sq_mg vs mg) because the
      // MG TOWER already owns the bare "mg" mode key.
      const SQUAD_MODE = { sq_sniper: "sniper", sq_rifles: "rifles", sq_mg: "mg", sq_sappers: "sappers", sq_mortars: "mortars", sq_engineers: "engineers", sq_rockets: "rockets", sq_grenadiers: "grenadiers", sq_medics: "medics", sq_mechanics: "mechanics", sq_davy: "davy" };
      // Hero keys are placement modes — the one law.
      const HERO_MODE = { hero_bison: "bison", hero_apc: "apc", hero_jeep: "jeep", hero_mech: "mech" };
      // The ghost's true footprint, by key — a hull its hull, the mech its
      // vetted spread, a tower its post, a squad the stand its men take.
      const ghostFp = (key) => {
        const pk = PICK_POOL.find((x) => x.key === key);
        if (!pk) return null;
        if (pk.kind === "hull") { const s = pk.vtype === "apc" ? APC : pk.vtype === "jeep" ? JEEP : BISON; return { x: s.hx * 2, z: s.hz * 2, h: s.hy * 2 }; }
        if (pk.kind === "mech") return { x: MECH_SPREAD.hx * 2, z: MECH_SPREAD.hz * 2, h: 4.2 };
        if (pk.kind === "tower") { const s = TOWER_SPECS[pk.key]; return { x: 1.7, z: 1.7, h: s.hy * 2 }; }
        return { x: 2.2, z: 2.2, h: 1.05 };
      };
      // Infantry/sandbag placement checks: same validatePlacement gate as
      // towers (occupied/ice/held/afford) — men don't claim the grid cell
      // (no cell.blocked write, no connectivity re-check: bodies, not
      // structures), but they place by the same ground rules.
      const canPlaceInfantryAt = (gx, gz, cost) => {
        if (!grid.inBounds(gx, gz)) return { ok: false, msg: "OFF THE FIELD" };
        const cell = grid.cells[grid.idx(gx, gz)];
        if (cell.water) return { ok: false, msg: "NO GROUND — open water" };
        const wp = grid.gridToWorld(gx, gz), c0 = map.invW(wp.x, wp.z);
        const v = validatePlacement({
          blocked: !!(cell.blocked || cell.wallId), ice: !!cell.ice,
          held: (dev || canBuild(T, c0.u, c0.v)), resources: run.resources, cost,
        });
        return v.ok ? { ok: true, wp } : v;
      };
      const HOMELAND_R = 36; // provisional (F5)
      const placeSquadAt = (gx, gz, type) => {
        const price = priceNow("sq_" + type, SQUAD_SPECS[type].cost);
        const v = canPlaceInfantryAt(gx, gz, price);
        if (!v.ok) { toast(v.msg); return; }
        if (!buyPaced()) return;
        const sq = makeSquad(run.nextSquadId++, type, 1, v.wp.x, v.wp.z);
        spawnSquadMembers(world, sq);
        run.squads.push(sq);
        // A placed squad comes up already selected with
        // its radial open — defend-here is already its standing order (the
        // intrinsic default, no tap needed).
        view.selSquadId = sq.id; view.selSquadIds = null; view.selArmedAt = world.t + PENDING_ARM_S; view.pieOpen = true;
        view.teachPie("squad", sq);
        run.resources -= price;
        run._buyAt = world.t;
        standDown();
      };
      // One picked unit onto the ground — vetted per kind, free
      // (the starting kit costs nothing), inside the homeland only.
      const placePick = (p) => {
        const key = view._placeQueue[0];
        const pk = PICK_POOL.find((x) => x.key === key);
        if (!pk) { view._placeQueue.shift(); return; }
        if (Math.hypot(p.x - depotP.x, p.z - depotP.z) > HOMELAND_R) { toast("TOO FAR FROM THE DEPOT"); return; }
        const g = grid.worldToGrid(p.x, p.z);
        if (!grid.inBounds(g.gx, g.gz)) { toast("OFF THE FIELD"); return; }
        const cell = grid.cells[grid.idx(g.gx, g.gz)];
        const wp = grid.gridToWorld(g.gx, g.gz);
        if (pk.kind === "squad") {
          if (cell.water || cell.ice || cell.blocked || cell.wallId) { toast("NO GROUND"); return; }
          const sq = makeSquad(run.nextSquadId++, pk.type, 1, wp.x, wp.z);
          spawnSquadMembers(world, sq);
          run.squads.push(sq);
        } else if (pk.kind === "hull") {
          if (cell.water || cell.ice || cell.blocked || cell.wallId) { toast("NO GROUND"); return; }
          const spec = pk.vtype === "apc" ? APC : pk.vtype === "jeep" ? JEEP : BISON;
          if (!armorStable(field, wp.x, wp.z, spec)) { toast("TOO STEEP TO PARK"); return; }
          if (slotBlockedPublic(world, wp.x, wp.z, Math.hypot(spec.hx, spec.hz) + 1.0)) { toast("NO ROOM"); return; }
          const v = addBody(world, { kind: "vehicle", team: 1, mass: spec.mass, hx: spec.hx, hy: spec.hy, hz: spec.hz,
            x: wp.x, y: field.heightAt(wp.x, wp.z) + spec.hy + 0.05, z: wp.z, hp: spec.hp, friction: 0.85,
            q: heading(null, Math.atan2(-wp.x, -wp.z)) });
          v.armor = spec.armor; v.vtype = pk.vtype; v.maxHp = spec.hp;
          v.homeX = wp.x; v.homeZ = wp.z; v.sleeping = true;
          if (pk.vtype === "apc" || pk.vtype === "jeep") v.apcSeq = nextApcSeq();
          v.drv = pk.vtype === "apc" ? "apc" : pk.vtype === "jeep" ? "jeep" : "armor"; v.depotDrive = "auto"; v.order = "defend"; v.tracks = "careful"; v.driver = "player";
          if (pk.vtype === "jeep") fitJeep(v);
        } else if (pk.kind === "mech") {
          if (cell.water || cell.ice || cell.blocked || cell.wallId) { toast("NO GROUND"); return; }
          if (!(armorSpread(field, wp.x, wp.z, MECH_SPREAD) < 0.28)) { toast("TOO STEEP TO PARK"); return; }
          if (slotBlockedPublic(world, wp.x, wp.z, 4.5)) { toast("NO ROOM"); return; }
          const m = buildMech(world, { x: wp.x, z: wp.z, yaw: Math.atan2(-wp.x, -wp.z), team: 1, hp: MECH.hp });
          m.thrustersOn = true; m.thrustAssist = true;
          m.hull.drv = "mech"; m.hull.order = "defend"; m.hull.tracks = "careful";
          m.hull.maxHp = MECH.hp; m.hull.homeX = wp.x; m.hull.homeZ = wp.z;
        } else { // tower — free, rights-free (territory hasn't grown), road still owed
          if (cell.water || cell.ice || cell.blocked || cell.wallId) { toast("NO GROUND"); return; }
          cell.blocked = true;
          const spec = TOWER_SPECS[pk.key];
          const b = addBody(world, { kind: "tower", team: 1, mass: 0, hx: 0.8, hy: spec.hy, hz: 0.8, x: wp.x, y: field.heightAt(wp.x, wp.z) + spec.hy, z: wp.z, hp: spec.hp });
          b.towerType = pk.key; b.flagPole = true; b.maxHp = b.hp;
          b.effRange = effRange(world, { x: b.pos.x, y: b.pos.y + b.hy + 0.45, z: b.pos.z }, spec);
          cell.wallId = b.id; cell.bTeam = 1;
          recomputeFlow();
        }
        view._placeQueue.shift();
        const next = view._placeQueue[0];
        if (next && view.openInfo) view.openInfo(next, "deal"); // the next card deals before its unit places
        setHud((h) => ({ ...h, placing: next || "done" }));
        toast(next ? "PLACED — NEXT: " + (PALETTE_BY_KEY[next] || {}).label : "ALL PLACED — TAKE COMMAND");
      };
      // Squad placement rides the tower pending-confirm flow. Sniper preview
      // is the reachPolygon fan with INFANTRY_ARMS.sniper, fog-INDEPENDENT
      // (null territory — the Phase-5 preview rule: show what he COULD see,
      // clipped by terrain/solids only; live fire stays fog-gated in
      // squadFire). Rifles/MG get a plain range ring — their reach is short
      // and omnidirectional enough that a fan reads as noise.
      const startPendingSquad = (gx, gz, mode, wp) => {
        const type = SQUAD_MODE[mode];
        const arms = INFANTRY_ARMS[type];
        const y = field.heightAt(wp.x, wp.z);
        let poly = null, ringR = 0;
        if (type === "sniper") {
          const muzzle = { x: wp.x, y: y + 1.24, z: wp.z }; // ground + 0.74 seat + 0.5 squadFire muzzle
          poly = reachPolygon(world, null, muzzle, arms, 1, map.invW);
        } else {
          // sappers carry no arms entry (no rifle) — no reach preview at all;
          // their reach is their feet.
          ringR = arms ? arms.range : 0;
        }
        view.pending = { gx, gz, mode, squad: type, wp, y, poly, ringR, color: 0xffd27a, cost: priceNow(mode, SQUAD_SPECS[type].cost), armedAt: world.t + PENDING_ARM_S }; // amber: a green fan vanishes into the held-terrain wash
      };
      const sellAt = (gx, gz) => {
        if (!grid.inBounds(gx, gz)) return;
        const cell = grid.cells[grid.idx(gx, gz)];
        const id = cell.wallId;
        if (!id || !world.byId.has(id)) { toast("NOTHING HERE"); return; }
        const b = world.byId.get(id);
        const refund = b.kind === "tower" ? Math.floor(TOWER_SPECS[b.towerType].cost * 0.6) : 3;
        // ONE cell, ONE structure — and a wall is three courses
        // standing on that cell, so selling takes the whole stack. Matched by
        // FOOTPRINT (which cell each body stands on), never by id: ids do not
        // survive a save/resume, a wall never moves, and this is exactly the
        // rule the restore path re-claims cells by.
        const stack = b.kind === "wall"
          ? world.bodies.filter((w) => {
            if (w.kind !== "wall") return false;
            const wg = grid.worldToGrid(w.pos.x, w.pos.z);
            return wg.gx === gx && wg.gz === gz;
          })
          : [b];
        for (const s of stack) {
          forgetWelds(world, s);
          world.byId.delete(s.id);
          const bi = world.bodies.indexOf(s);
          if (bi >= 0) world.bodies.splice(bi, 1);
        }
        cell.wallId = null; cell.blocked = false; cell.bTeam = 0;
        run.resources += refund;
        recomputeFlow();
        toast("+" + refund + " scrap");
      };
      const sellById = (id) => {
        const b = world.byId.get(id);
        if (!b) return;
        const g = grid.worldToGrid(b.pos.x, b.pos.z);
        sellAt(g.gx, g.gz);
        view.inspectId = null;
      };
      const placeHire = (p) => {
        const key = view.hirePlace.key;
        const pk = PICK_POOL.find((x) => x.key === key);
        if (!pk) { view.hirePlace = null; return; }
        const price = priceNow(key, PALETTE_BY_KEY[key].cost);
        if (run.resources < price) { toast("NO SCRAP"); return; } // the ghost STANDS (the GROUND NOT HELD precedent) — prices breathe by the second; ✗ still returns the card
        const g = grid.worldToGrid(p.x, p.z);
        if (!grid.inBounds(g.gx, g.gz)) { toast("OFF THE FIELD"); return; }
        const cell = grid.cells[grid.idx(g.gx, g.gz)];
        const wp = grid.gridToWorld(g.gx, g.gz);
        const c0 = map.invW(wp.x, wp.z);
        if (!(dev || canBuild(T, c0.u, c0.v))) { toast("GROUND NOT HELD"); return; }
        if (cell.water || cell.ice || cell.blocked || cell.wallId) { toast("NO GROUND"); return; }
        if (pk.kind === "squad") {
          const sq = makeSquad(run.nextSquadId++, pk.type, 1, wp.x, wp.z);
          spawnSquadMembers(world, sq);
          run.squads.push(sq);
          view.selSquadId = sq.id; view.selSquadIds = null; view.selArmedAt = world.t + PENDING_ARM_S; view.pieOpen = true;
          view.teachPie("squad", sq);
        } else if (pk.kind === "hull") {
          const spec = pk.vtype === "apc" ? APC : pk.vtype === "jeep" ? JEEP : BISON;
          if (!armorStable(field, wp.x, wp.z, spec)) { toast("TOO STEEP TO PARK"); return; }
          if (slotBlockedPublic(world, wp.x, wp.z, Math.hypot(spec.hx, spec.hz) + 1.0)) { toast("NO ROOM"); return; }
          const v = addBody(world, { kind: "vehicle", team: 1, mass: spec.mass, hx: spec.hx, hy: spec.hy, hz: spec.hz,
            x: wp.x, y: field.heightAt(wp.x, wp.z) + spec.hy + 0.05, z: wp.z, hp: spec.hp, friction: 0.85,
            q: heading(null, Math.atan2(-wp.x, -wp.z)) });
          v.armor = spec.armor; v.vtype = pk.vtype; v.maxHp = spec.hp;
          v.homeX = wp.x; v.homeZ = wp.z; v.sleeping = true;
          if (pk.vtype === "apc" || pk.vtype === "jeep") v.apcSeq = nextApcSeq();
          v.drv = pk.vtype === "apc" ? "apc" : pk.vtype === "jeep" ? "jeep" : "armor"; v.depotDrive = "auto"; v.order = "defend"; v.tracks = "careful"; v.driver = "player";
          if (pk.vtype === "jeep") fitJeep(v);
        } else if (pk.kind === "mech") {
          if (!(armorSpread(field, wp.x, wp.z, MECH_SPREAD) < 0.28)) { toast("TOO STEEP TO PARK"); return; }
          if (slotBlockedPublic(world, wp.x, wp.z, 4.5)) { toast("NO ROOM"); return; }
          const m = buildMech(world, { x: wp.x, z: wp.z, yaw: Math.atan2(-wp.x, -wp.z), team: 1, hp: MECH.hp });
          m.thrustersOn = true; m.thrustAssist = true;
          m.hull.drv = "mech"; m.hull.order = "defend"; m.hull.tracks = "careful";
          m.hull.maxHp = MECH.hp; m.hull.homeX = wp.x; m.hull.homeZ = wp.z;
        } else { // tower — the build law: cell claim + the road owed
          cell.blocked = true;
          const spec = TOWER_SPECS[pk.key];
          const b = addBody(world, { kind: "tower", team: 1, mass: 0, hx: 0.8, hy: spec.hy, hz: 0.8, x: wp.x, y: field.heightAt(wp.x, wp.z) + spec.hy, z: wp.z, hp: spec.hp });
          b.towerType = pk.key; b.flagPole = true; b.maxHp = b.hp;
          b.effRange = effRange(world, { x: b.pos.x, y: b.pos.y + b.hy + 0.45, z: b.pos.z }, spec);
          cell.wallId = b.id; cell.bTeam = 1;
          recomputeFlow();
        }
        takeHandCard(run.manifest, key, 1);
        run.resources -= price;
        view.hirePlace = null;
        if (run.manifest && run.manifest.hand.length && view.openManifest) view.openManifest(); // multi-buy is one visit — the hand returns for the next card (the calm window returns with it, the ruled pause of an open hand)
        cue("uitick");
        toast("THE HIRE FIELDS — ◆" + price);
      };
      // THE ENEMY RACK's placer — sandbox only. Real spawners, real
      // vets where the kind has one (a hull still refuses a slope), team 2
      // throughout. rng draws are lawful here: the sandbox is its own
      // stream and never saves.
      const devSpawnAt = (p) => {
        const it = FOE_RACK_BY_KEY[view.devSpawn];
        if (!it) return;
        const d = map.clampToRim(p.x, p.z);
        if (map.streamAt(d.x, d.z)) { toast("OPEN WATER"); return; }
        if (it.tower) {
          const g = grid.worldToGrid(d.x, d.z);
          if (!grid.inBounds(g.gx, g.gz)) { toast("OFF THE FIELD"); return; }
          const cell = grid.cells[grid.idx(g.gx, g.gz)];
          if (cell.water || cell.ice || cell.blocked || cell.wallId) { toast("NO GROUND"); return; }
          const wp = grid.gridToWorld(g.gx, g.gz);
          const spec = TOWER_SPECS[it.tower];
          const b = addBody(world, { kind: "tower", team: 2, mass: 0, hx: 0.8, hy: spec.hy, hz: 0.8, x: wp.x, y: field.heightAt(wp.x, wp.z) + spec.hy, z: wp.z, hp: spec.hp });
          b.towerType = it.tower; b.flagPole = true; b.maxHp = b.hp;
          b.effRange = effRange(world, { x: b.pos.x, y: b.pos.y + b.hy + 0.45, z: b.pos.z }, spec);
          b.discipline = "free"; // the enemy's doctrine (muster.js parkTower's own stamp)
          cell.blocked = true; cell.wallId = b.id; cell.bTeam = 2;
          recomputeFlow();
        } else if (it.hull) {
          const spec = it.hull === "apc" ? APC : it.hull === "jeep" ? JEEP : BISON;
          if (!armorStable(field, d.x, d.z, spec)) { toast("TOO STEEP TO PARK"); return; }
          if (slotBlockedPublic(world, d.x, d.z, Math.hypot(spec.hx, spec.hz) + 1.0)) { toast("NO ROOM"); return; }
          const v = addBody(world, { kind: "vehicle", team: 2, mass: spec.mass, hx: spec.hx, hy: spec.hy, hz: spec.hz,
            x: d.x, y: field.heightAt(d.x, d.z) + spec.hy + 0.05, z: d.z, hp: spec.hp, friction: 0.85,
            q: heading(null, Math.atan2(-d.x, -d.z)) });
          v.armor = spec.armor; v.vtype = it.hull; v.maxHp = spec.hp; v.bounty = spec.bounty;
          v.homeX = d.x; v.homeZ = d.z; v.sleeping = true;
          if (it.hull === "apc" || it.hull === "jeep") v.apcSeq = nextApcSeq();
          v.drv = it.hull === "apc" ? "apc" : it.hull === "jeep" ? "jeep" : "armor"; v.depotDrive = "auto"; v.order = "defend"; v.tracks = "careful";
          if (it.hull === "jeep") fitJeep(v);
        } else if (it.mech) {
          if (!(armorSpread(field, d.x, d.z, MECH_SPREAD) < 0.28)) { toast("TOO STEEP TO PARK"); return; }
          if (slotBlockedPublic(world, d.x, d.z, 4.5)) { toast("NO ROOM"); return; }
          const m = buildMech(world, { x: d.x, z: d.z, yaw: Math.atan2(-d.x, -d.z), team: 2, hp: MECH.hp });
          m.thrustersOn = true; m.thrustAssist = true;
          m.hull.drv = "mech"; m.hull.order = "defend"; m.hull.tracks = "careful";
          m.hull.maxHp = MECH.hp; m.hull.homeX = d.x; m.hull.homeZ = d.z; m.hull.bounty = MECH.bounty;
        } else {
          for (let k = 0; k < it.n; k++) spawnUnit(world, { x: d.x, z: d.z }, it.tag);
        }
      };
      // THE HERO FIELDS BY THE ONE PLACEMENT LAW — the bar
      // arms a mode, the ground tap sets the ghost, the ✓ runs this. The
      // enemy's own heroes keep bell.js's replacement walk at its depot.
      const placeHero = (key, p) => {
        const pk = PICK_POOL.find((x) => x.key === key);
        if (!pk) return true;
        const price = priceNow(key, PALETTE_BY_KEY[key].cost);
        if (run.resources < price) { toast("NO SCRAP"); return false; }
        if (!buyPaced()) return false;
        const g = grid.worldToGrid(p.x, p.z);
        if (!grid.inBounds(g.gx, g.gz)) { toast("OFF THE FIELD"); return false; }
        const cell = grid.cells[grid.idx(g.gx, g.gz)];
        const wp = grid.gridToWorld(g.gx, g.gz);
        const c0 = map.invW(wp.x, wp.z);
        if (!(dev || canBuild(T, c0.u, c0.v))) { toast("GROUND NOT HELD"); return false; }
        if (cell.water || cell.ice || cell.blocked || cell.wallId) { toast("NO GROUND"); return false; }
        if (pk.kind === "mech") {
          if (!(armorSpread(field, wp.x, wp.z, MECH_SPREAD) < 0.28)) { toast("TOO STEEP TO PARK"); return false; }
          if (slotBlockedPublic(world, wp.x, wp.z, 4.5)) { toast("NO ROOM"); return false; }
          const m = buildMech(world, { x: wp.x, z: wp.z, yaw: Math.atan2(-wp.x, -wp.z), team: 1, hp: MECH.hp });
          m.thrustersOn = true; m.thrustAssist = true;
          m.hull.drv = "mech"; m.hull.order = "defend"; m.hull.tracks = "careful";
          m.hull.maxHp = MECH.hp; m.hull.homeX = wp.x; m.hull.homeZ = wp.z;
        } else {
          const spec = pk.vtype === "apc" ? APC : pk.vtype === "jeep" ? JEEP : BISON;
          if (!armorStable(field, wp.x, wp.z, spec)) { toast("TOO STEEP TO PARK"); return false; }
          if (slotBlockedPublic(world, wp.x, wp.z, Math.hypot(spec.hx, spec.hz) + 1.0)) { toast("NO ROOM"); return false; }
          const v = addBody(world, { kind: "vehicle", team: 1, mass: spec.mass, hx: spec.hx, hy: spec.hy, hz: spec.hz,
            x: wp.x, y: field.heightAt(wp.x, wp.z) + spec.hy + 0.05, z: wp.z, hp: spec.hp, friction: 0.85,
            q: heading(null, Math.atan2(-wp.x, -wp.z)) });
          v.armor = spec.armor; v.vtype = pk.vtype; v.maxHp = spec.hp;
          v.homeX = wp.x; v.homeZ = wp.z; v.sleeping = true;
          if (pk.vtype === "apc" || pk.vtype === "jeep") v.apcSeq = nextApcSeq();
          v.drv = pk.vtype === "apc" ? "apc" : pk.vtype === "jeep" ? "jeep" : "armor"; v.depotDrive = "auto"; v.order = "defend"; v.tracks = "careful"; v.driver = "player";
          if (pk.vtype === "jeep") fitJeep(v);
        }
        run.resources -= price;
        run._buyAt = world.t;
        cue("uitick");
        toast("THE CONVOY DELIVERS — ◆" + price);
        standDown();
        return true;
      };
      // THE PLACEMENT ZONE — while a confirm placement is armed, the
      // ground it may take is shown: held ground for towers, squads, hires
      // and heroes; the homeland ring for the pre-start deal. ~4Hz, wall time.
      const refreshZone = () => {
        if (!R) return;
        const dealPhase = !run.started && view._placeQueue && view._placeQueue.length;
        const armedKey = dealPhase ? view._placeQueue[0]
          : view.hirePlace ? view.hirePlace.key
          : run.mode && (TOWER_SPECS[run.mode] || SQUAD_MODE[run.mode] || HERO_MODE[run.mode]) ? run.mode : null;
        if (!armedKey || run.gameOver || run.victory) { R.overlay.setZone(false); return; }
        const heldAt = dealPhase
          ? (x, z) => Math.hypot(x - depotP.x, z - depotP.z) <= HOMELAND_R
          : dev ? () => true
          : (x, z) => { const c = map.invW(x, z); return canBuild(T, c.u, c.v); };
        // The zone tells the ARMED unit's own truth — the
        // ground's permanent laws AND the room standing bodies take right
        // now. Hulls vet their flat parking and their clearance; the mech
        // its spread and its 4.5m; squads and towers place by the shared
        // laws alone (their placers refuse on neither slope nor room).
        const pk = PICK_POOL.find((x) => x.key === armedKey);
        let vetAt = null, room = null;
        if (pk && pk.kind === "hull") {
          const spec = pk.vtype === "apc" ? APC : pk.vtype === "jeep" ? JEEP : BISON;
          vetAt = (x, z) => armorStable(field, x, z, spec);
          room = roomMaskPublic(world, grid, Math.hypot(spec.hx, spec.hz) + 1.0);
        } else if (pk && pk.kind === "mech") {
          vetAt = (x, z) => armorStable(field, x, z, MECH_SPREAD);
          room = roomMaskPublic(world, grid, 4.5);
        }
        R.overlay.setZone(true, grid, placeZoneMask(grid, heldAt, vetAt, room), (x, z) => field.heightAt(x, z), 0x4aff8c);
      };
  return { priceNow, buyPaced, buildAt, canBuildAt, clearPending,
    startPending, standDown, confirmPending, SQUAD_MODE, HERO_MODE,
    ghostFp, canPlaceInfantryAt, placeSquadAt, startPendingSquad,
    sellAt, sellById, placeHire, devSpawnAt, placeHero, refreshZone };
}
