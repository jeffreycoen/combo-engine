import "./platform/storage.js";
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./ui/App.jsx";
import SoundBoard from "./ui/SoundBoard.jsx";
import Roadmap from "./ui/Roadmap.jsx";

// ?sounds=1 mounts the SOUNDBOARD instead of the game (mk0.57): a bench for
// auditioning every voice in src/platform/audio.js by tapping a button, rather
// than waiting for the right thing to happen on the field. ?roadmap=1 mounts
// THE ROAD AHEAD the same way (mk0.59) — a page of text showing which phase
// the project is on. Both are resolved once, the same way DepotGame reads
// ?seed and ?perf — with no flag in the URL the game path is byte-for-byte
// what it was.
const q = new URLSearchParams(window.location.search);
const sounds = q.get("sounds") === "1";
const roadmap = q.get("roadmap") === "1";

createRoot(document.getElementById("root")).render(
  roadmap ? <Roadmap /> : sounds ? <SoundBoard /> : <App />
);
