import React, { useEffect, useRef, useState } from "react";
import ColdsnapProvingGrounds from "../demo/coldsnap-proving-grounds.jsx";
import StartScreen from "./StartScreen.jsx";
import DemosScreen from "./DemosScreen.jsx";
import MechRange from "../game/MechRange.jsx";
import ColdsnapTD from "../game/ColdsnapTD.jsx";
import DepotGame from "../depot/DepotGame.jsx";
import Controls from "./Controls.jsx";
import { DEFAULTS, loadKeymap, saveKeymap, installKeyRemap } from "../platform/keymap.js";
import { attachExternalAutosave } from "../platform/autosave.js";
import { COLORS, FONT } from "./theme.js";

const GAME_SCREENS = new Set(["demo"]); // remap + ESC live here
const RESUME_SCREENS = new Set(["demo"]); // what a reload returns to

export default function App() {
  const [screen, setScreen] = useState("menu"); // menu | controls | demo
  const [keymap, setKeymap] = useState(DEFAULTS);
  // WINTER FRONT's saved run (P1 Task 3). The start screen probes storage and
  // validates the mark, then hands the parsed save through here; null means a
  // fresh front. Cleared on the way out so a second entry never resumes a run
  // that has already been left.
  const [depotResume, setDepotResume] = useState(null);
  const [depotSeed, setDepotSeed] = useState(null);
  const mapRef = useRef(DEFAULTS);
  const remapRef = useRef(null);
  const dirtyRef = useRef(false); // a user rebind outranks the async load
  const screenLoadedRef = useRef(false); // don't persist "menu" before the resume load lands

  // resume where the player left off (menu is the default; controls never resumes)
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const r = await window.storage.get("coldsnap-screen");
        if (live && RESUME_SCREENS.has(r.value)) setScreen(r.value);
      } catch (e) {}
      screenLoadedRef.current = true;
    })();
    return () => { live = false; };
  }, []);

  useEffect(() => {
    if (!screenLoadedRef.current) return;
    try { window.storage.set("coldsnap-screen", RESUME_SCREENS.has(screen) ? screen : "menu"); } catch (e) {}
  }, [screen]);

  // the frozen demo autosaves settings/tally from outside via its debug api
  useEffect(() => {
    if (screen !== "demo") return;
    return attachExternalAutosave("coldsnap-tally");
  }, [screen]);

  useEffect(() => {
    let live = true;
    loadKeymap().then((m) => { if (live && !dirtyRef.current) { mapRef.current = m; setKeymap(m); } });
    const remap = installKeyRemap(() => mapRef.current);
    remap.setSuspended(true); // active only while the demo is up
    remapRef.current = remap;
    return () => { live = false; remap.uninstall(); };
  }, []);

  useEffect(() => {
    if (remapRef.current) remapRef.current.setSuspended(!GAME_SCREENS.has(screen));
  }, [screen]);

  // ESC leaves a game for the menu. Registered in bubble phase so the
  // remapper (capture) runs first — Escape is unbindable, so it always lands.
  useEffect(() => {
    if (!GAME_SCREENS.has(screen) && screen !== "mechrange" && screen !== "towerdef" && screen !== "depot" && screen !== "devsandbox") return; // the mech range exits on ESC too (range stays out of GAME_SCREENS: it reads raw key codes, no remap)
    const onEsc = (e) => { if (e.key === "Escape") setScreen("menu"); };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [screen]);

  const applyKeymap = (m) => { dirtyRef.current = true; mapRef.current = m; setKeymap(m); saveKeymap(m); };

  if (screen === "mechrange") {
    return <MechRange onExit={() => setScreen("menu")} />;
  }
  if (screen === "towerdef") {
    return <ColdsnapTD />;
  }
  if (screen === "depot") {
    return <DepotGame resume={depotResume} seed={depotSeed} onExit={() => { setDepotResume(null); setScreen("menu"); }} />;
  }
  if (screen === "devsandbox") {
    // the developer sandbox (mk2.24): the war screen under its dev switch —
    // never in RESUME_SCREENS, so a reload lands on the menu, never here.
    return <DepotGame dev onExit={() => setScreen("menu")} />;
  }
  if (screen === "controls") {
    return <Controls keymap={keymap} onChange={applyKeymap} onBack={() => setScreen("menu")} />;
  }
  if (screen === "demos") {
    return <DemosScreen
      onPlay={() => setScreen("demo")}
      onControls={() => setScreen("controls")} onMech={() => setScreen("mechrange")} onTowerDef={() => setScreen("towerdef")}
      onBack={() => setScreen("menu")} />;
  }
  if (GAME_SCREENS.has(screen)) {
    // the frozen demo keeps the overlay ⏏ button
    return (
      <div style={{ position: "relative", width: "100%", height: "100%" }}>
        <ColdsnapProvingGrounds />
        <button
          data-menu="exit"
          onClick={() => setScreen("menu")}
          style={{ position: "absolute", top: 118, left: 10, zIndex: 7, background: "rgba(28,33,41,0.85)", border: `2px solid ${COLORS.btnBorder}`, color: COLORS.bright, fontFamily: FONT, fontSize: 11, letterSpacing: 1, padding: "5px 9px", cursor: "pointer", touchAction: "manipulation" }}
        >⏏ MENU</button>
      </div>
    );
  }
  return <StartScreen
    onDepot={(s) => { setDepotResume(null); setDepotSeed(s != null ? s : null); setScreen("depot"); }}
    onDepotResume={(data) => { setDepotResume(data); setScreen("depot"); }}
    onDemos={() => setScreen("demos")}
    onDevSandbox={() => setScreen("devsandbox")}
    onControls={() => setScreen("controls")} />;
}
