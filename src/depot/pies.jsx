// COLDSNAP DEPOT — pies.jsx: the four wedge discs. Each takes its hud
// slice and the component's live handles; the bodies are the component's
// own, moved whole. press is the long-press card opener (teachPress);
// closeBuild folds the build tree on a TAKE CONTROL.
import React from "react";
import RadialMenu from "./RadialMenu.jsx";

export function SquadPie({ sq, stateRef, press, closeBuild, isTouch }) {
  // DEFEND, MOVE, ATTACK — engineers additionally
  // get BAGS and WALLS. Same view.orderSquad actions, same order-state
  // colors the old chip row used.
  // DEFEND is instant — its act also fully
  // deselects (view.selSquadId = null), the same rule SELL/CAREFUL-FREE
  // follow on the tower pie. MOVE/ATTACK/BAGS/WALLS stay selected —
  // they arm view.orderMode and consumeOrderTap's ground tap(s) finish
  // them (and deselect there, at completion).
  const slots = [
    { key: "defend", icon: "∴", label: "DEFEND", color: "#7dffa8", on: sq.order === "defend", card: "defend", act: () => { const C = stateRef.current; if (C) { C.view.orderSquad("defend"); C.view.selSquadId = null; C.view.selSquadIds = null; } } },
    { key: "move", icon: "→", label: "MOVE", color: "#7fd7ff", on: sq.aimingMove || sq.order === "move", card: "move", act: () => stateRef.current && stateRef.current.view.orderSquad("move") },
    { key: "queue", icon: "⛓", label: "QUEUE", color: "#ffd27a", on: sq.queueOn, card: "queue_chain", act: () => { const C = stateRef.current; if (C) { C.view.toggleQueue(); C.view._keepPie = true; } } },
    ...(sq.chained ? [{ key: "clearchain", icon: "✂", label: "CLEAR (" + sq.chained + ")", color: "#ff9a7a", on: false, card: "clear_chain", act: () => { const C = stateRef.current; if (C) { C.view.clearChain(); C.view._keepPie = true; } } }] : []),
    { key: "attack", icon: "⚑", label: "ATTACK", color: "#ff6b5e", on: sq.aiming, card: "attack", act: () => stateRef.current && stateRef.current.view.orderSquad("attack") },
    // TAKE CONTROL — every squad type,
    // instant like DEFEND (deselects on choose; the pie itself closes
    // via RadialMenu's onChoose regardless).
    // The build tree closes with the take — all three TAKE CONTROLs.
    { key: "possess", icon: "✥", label: "TAKE CONTROL", color: "#7dffa8", on: false, card: "possess_squad", act: () => { closeBuild(); const C = stateRef.current; if (C) C.view.takeControl(); } },
    { key: "select_all", icon: "∷", label: "SELECT ALL", color: "#9fdcff", on: sq.count > 1, card: "select_all", act: () => { const C = stateRef.current; if (C) { C.view.selectAllType(); C.view._keepPie = true; } } },
  ];
  // PATROL — two taps propose a route through the
  // same proposed-line confirm the build orders use; accept and the
  // squad walks it forever. Every type except engineers and sappers.
  if (sq.patrolOk) {
    slots.push({ key: "patrol", icon: "⇄", label: "PATROL", color: "#7fd7ff", on: sq.aimingPatrol || sq.order === "patrol", card: "patrol", act: () => stateRef.current && stateRef.current.view.orderSquad("patrol") });
  }
  // STRUCTURES — instant toggle, armed types
  // only (an INFANTRY_ARMS row; not engineers, not sappers). Lit when
  // on. Its act also fully deselects, the DEFEND/SELL/CAREFUL-FREE
  // rule for instant pie actions.
  if (sq.structOk) {
    slots.push({ key: "structures", icon: "▨", label: "ATTACK STRUCTURES", color: "#c9a0ff", on: sq.structFirst, toggle: sq.structFirst, card: "structures", act: () => { const C = stateRef.current; if (C) { C.view.toggleStructFirst(); C.view.selSquadId = null; C.view.selSquadIds = null; } } });
  }
  if (sq.engineer) {
    slots.push(
      { key: "build_bags", icon: "▬", label: "BAGS", color: "#ffd27a", on: sq.building === "bags", card: "engineer_lines", act: () => stateRef.current && stateRef.current.view.orderSquad("build_bags") },
      { key: "build_walls", icon: "▦", label: "WALLS", color: "#ffd27a", on: sq.building === "walls", card: "engineer_lines", act: () => stateRef.current && stateRef.current.view.orderSquad("build_walls") },
    );
  }
  // MINES and WIRES — the sapper team's own two wedges, the
  // identical two-tap build shape the engineer wedges above use.
  if (sq.sapper) {
    slots.push(
      { key: "build_mines", icon: "◆", label: "MINES", color: "#ffb45e", on: sq.building === "mines", card: "sapper_lines", act: () => stateRef.current && stateRef.current.view.orderSquad("build_mines") },
      { key: "build_wires", icon: "⌁", label: "WIRES", color: "#ffb45e", on: sq.building === "wires", card: "sapper_lines", act: () => stateRef.current && stateRef.current.view.orderSquad("build_wires") },
    );
  }
  // A proposed line up takes over the status —
  // it outranks the building/aiming lines below since view.orderMode is
  // already null by the time view.linePending goes up.
  const status = sq.linePending ? " — ACCEPT OR ADJUST THE LINE"
    : sq.building
    ? (sq.buildStart ? " — TAP THE FAR END" : " — TAP THE LINE START")
    // Patrol's two-tap status rides the same
    // view.buildPt0 field the build orders' status does.
    : sq.aimingPatrol
    ? (sq.buildStart ? " — TAP THE FAR END" : " — TAP THE PATROL START")
    : sq.aiming || sq.aimingMove ? " — TAP GROUND" : "";
  const lbl = sq.count > 1 ? sq.label + " ×" + sq.count : sq.label;
  // Pie open -> the wedge disc; pie closed but
  // still selected (an aiming order armed) -> the center label chip
  // alone, so the ground stays fully tappable for the follow-up taps.
  return sq.showPie
    ? <RadialMenu cx={sq.x} cy={sq.y} label={lbl + status} slots={slots} armed={sq.armed} onChoose={() => { const C = stateRef.current; if (C) { if (C.view._keepPie) C.view._keepPie = false; else if (!C.view.queueOn) C.view.pieOpen = false; } }} press={press} showInfo={!isTouch} onCard={(k) => { const C = stateRef.current; if (C && C.view.openInfo) C.view.openInfo(k, "bar"); }} />
    : <div style={{ position: "absolute", left: sq.x, top: sq.y + 26, transform: "translate(-50%,0)", fontSize: 10, letterSpacing: 1, color: "#7dffa8", background: "rgba(14,18,24,0.85)", padding: "1px 6px", borderRadius: 4, zIndex: 7, pointerEvents: "none" }}>{lbl + status}</div>;
}

export function TowerPie({ tr, stateRef, press, closeBuild, isTouch }) {
  const slots = [];
  // Both tower actions are instant — each act
  // also fully deselects (view.inspectId = null). sellById already nulls
  // it internally; the discipline flip does so explicitly here.
  {
    slots.push({
      key: "discipline",
      icon: tr.discipline === "free" ? "●" : "◐",
      label: tr.discipline === "free" ? "FREE" : "CAREFUL",
      color: tr.discipline === "free" ? "#ff7a7a" : "#4aff8c",
      on: true,
      card: "discipline",
      act: () => { const C = stateRef.current; if (C) { C.view.setTowerDiscipline(tr.id); C.view.inspectId = null; } },
    });
  }
  // TAKE CONTROL — same wedge as the squad
  // pie, gated on canPossess (gun towers only; frost has none).
  if (tr.canPossess) {
    slots.push({
      key: "possess",
      icon: "✥",
      label: "TAKE CONTROL",
      color: "#7dffa8",
      on: false,
      card: "possess_tower",
      act: () => { closeBuild(); const C = stateRef.current; if (C) C.view.takeControlTower(tr.id); },
    });
  }
  slots.push({
    key: "sell",
    icon: "◆",
    label: `SELL ◆${tr.refund}`,
    color: "#ffb45e",
    on: true,
    card: "sell",
    act: () => stateRef.current && stateRef.current.view.sellById(tr.id),
  });
  return tr.showPie
    ? <RadialMenu cx={tr.x} cy={tr.y} label={tr.label} slots={slots} armed={true} onChoose={() => { const C = stateRef.current; if (C) C.view.pieOpen = false; }} press={press} showInfo={!isTouch} onCard={(k) => { const C = stateRef.current; if (C && C.view.openInfo) C.view.openInfo(k, "bar"); }} />
    : null;
}

export function VehiclePie({ vr, stateRef, press, closeBuild, isTouch }) {
  const vLabel = vr.kind === "mech" ? "MECH" : vr.vtype === "apc" ? "APC" : vr.vtype === "jeep" ? "JEEP" : "BISON";   // label by kind, then vtype
  const slots = [
    { key: "defend", icon: "∴", label: "DEFEND", color: "#7dffa8", on: vr.order === "defend", card: "defend", act: () => { const C = stateRef.current; if (C) { C.view.orderVehicle("defend"); C.view.selVehId = null; } } },
    { key: "move", icon: "→", label: "MOVE", color: "#7fd7ff", on: vr.aimingMove || vr.order === "move", card: "move", act: () => stateRef.current && stateRef.current.view.orderVehicle("move") },
    { key: "attack", icon: "✕", label: "ATTACK", color: "#ff9a7a", on: vr.aimingAttack || vr.order === "attack", card: "attack", act: () => stateRef.current && stateRef.current.view.orderVehicle("attack") },
    { key: "queue", icon: "⛓", label: "QUEUE", color: "#ffd27a", on: vr.queueOn, card: "queue_chain", act: () => { const C = stateRef.current; if (C) { C.view.toggleQueue(); C.view._keepPie = true; } } },
    ...(vr.chained ? [{ key: "clearchain", icon: "✂", label: "CLEAR (" + vr.chained + ")", color: "#ff9a7a", on: false, card: "clear_chain", act: () => { const C = stateRef.current; if (C) { C.view.clearChain(); C.view._keepPie = true; } } }] : []),
    { key: "patrol", icon: "⇄", label: "PATROL", color: "#7fd7ff", on: vr.aimingPatrol || vr.order === "patrol", card: "patrol", act: () => stateRef.current && stateRef.current.view.orderVehicle("patrol") },
    { key: "escort", icon: "⛨", label: "ESCORT", color: "#c9a0ff", on: vr.aimingEscort || vr.order === "escort", card: "escort", act: () => stateRef.current && stateRef.current.view.orderVehicle("escort") },
    { key: "tracks", icon: vr.tracks === "free" ? "●" : "◐", label: vr.tracks === "free" ? "TRACKS FREE" : "TRACKS CAREFUL", color: vr.tracks === "free" ? "#ff7a7a" : "#4aff8c", on: true, toggle: vr.tracks !== "free", card: "tracks", act: () => { const C = stateRef.current; if (C) { C.view.toggleTracks(); C.view.selVehId = null; } } },
    { key: "possess", icon: "✥", label: "TAKE CONTROL", color: "#7dffa8", on: false, card: vr.kind === "mech" ? "possess_mech" : "possess_vehicle", act: () => { closeBuild(); const C = stateRef.current; if (C) C.view.takeControlVehicle(); } },
  ];
  // LOAD/UNLOAD — APC only, offered only when there's a seat to
  // fill or a rider to drop.
  if ((vr.vtype === "apc" || vr.vtype === "jeep") && vr.seatsFree > 0) {
    slots.push({ key: "load", icon: "⬒", label: "LOAD (" + vr.seatsFree + ")", color: "#ffd27a", on: vr.aimingLoad, card: "load", act: () => stateRef.current && stateRef.current.view.orderVehicle("load") });
  }
  if ((vr.vtype === "apc" || vr.vtype === "jeep") && vr.riders > 0) {
    slots.push({ key: "unload", icon: "⬓", label: "UNLOAD (" + vr.riders + ")", color: "#ffd27a", on: false, card: "load", act: () => { const C = stateRef.current; if (C) { C.view.unloadVehicle(); C.view.selVehId = null; } } });
  }
  const status = vr.linePending ? " — ACCEPT OR ADJUST THE LINE"
    : vr.aimingPatrol ? (vr.patrolStart ? " — TAP THE FAR END" : " — TAP THE PATROL START")
    : vr.aimingEscort ? " — TAP A SQUAD"
    : vr.aimingLoad ? " — TAP A SQUAD"
    : vr.aimingAttack ? " — TAP THE TARGET GROUND"
    : vr.aimingMove ? " — TAP GROUND" : "";
  return vr.showPie
    ? <RadialMenu cx={vr.x} cy={vr.y} label={vLabel + status} slots={slots} armed={vr.armed} onChoose={() => { const C = stateRef.current; if (C) { if (C.view._keepPie) C.view._keepPie = false; else if (!C.view.queueOn) C.view.pieOpen = false; } }} press={press} showInfo={!isTouch} onCard={(k) => { const C = stateRef.current; if (C && C.view.openInfo) C.view.openInfo(k, "bar"); }} />
    : <div style={{ position: "absolute", left: vr.x, top: vr.y + 26, transform: "translate(-50%,0)", fontSize: 10, letterSpacing: 1, color: "#7dffa8", background: "rgba(14,18,24,0.85)", padding: "1px 6px", borderRadius: 4, zIndex: 7, pointerEvents: "none" }}>{vLabel + status}</div>;
}

export function GroupPie({ gr, stateRef, press, isTouch }) {
  const slots = [
    { key: "gdefend", icon: "∴", label: "DEFEND", color: "#7dffa8", on: false, card: "defend", act: () => { const C = stateRef.current; if (C) C.view.orderGroup("defend"); } },
    { key: "gmove", icon: "→", label: "MOVE", color: "#7fd7ff", on: gr.aimingMove, card: "move", act: () => { const C = stateRef.current; if (C) C.view.orderGroup("move"); } },
    { key: "gattack", icon: "✕", label: "ATTACK", color: "#ff9a7a", on: gr.aimingAttack, card: "attack", act: () => { const C = stateRef.current; if (C) C.view.orderGroup("attack"); } },
  ];
  const status = gr.aimingAttack ? " — TAP THE TARGET GROUND" : gr.aimingMove ? " — TAP GROUND" : "";
  return gr.showPie
    ? <RadialMenu cx={gr.x} cy={gr.y} label={"GROUP (" + gr.count + ")" + status} slots={slots} armed={gr.armed} onChoose={() => { const C = stateRef.current; if (C) C.view.pieOpen = false; }} press={press} showInfo={!isTouch} onCard={(k) => { const C = stateRef.current; if (C && C.view.openInfo) C.view.openInfo(k, "bar"); }} />
    : <div style={{ position: "absolute", left: gr.x, top: gr.y + 26, transform: "translate(-50%,0)", fontSize: 10, letterSpacing: 1, color: "#7dffa8", background: "rgba(14,18,24,0.85)", padding: "1px 6px", borderRadius: 4, zIndex: 7, pointerEvents: "none" }}>{"GROUP (" + gr.count + ")" + status}</div>;
}
