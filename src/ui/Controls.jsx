import React, { useEffect, useState } from "react";
import { ACTIONS, DEFAULTS, formatKey, MODIFIER_KEYS, UNBINDABLE_KEYS } from "../platform/keymap.js";
import { COLORS, FONT, btn } from "./theme.js";

export default function Controls({ keymap, onChange, onBack }) {
  const [listening, setListening] = useState(null); // action id awaiting a key

  // Capture the next keydown for the row being rebound. The global remapper
  // is suspended outside the demo, so this capture listener sees raw keys.
  useEffect(() => {
    if (!listening) return;
    const cap = (e) => {
      e.stopImmediatePropagation();
      if (e.cancelable) e.preventDefault();
      const k = (e.key || "").toLowerCase();
      if (!k) return;
      if (k === "escape") { setListening(null); return; }
      // modifiers wait for the real key of a chord (Shift+X binds X, not
      // Shift); system/IME keys never deliver clean down/up pairs — skip both
      if (MODIFIER_KEYS.has(k) || UNBINDABLE_KEYS.has(k)) return;
      const next = { ...keymap };
      const prev = next[listening];
      for (const a of ACTIONS) if (next[a.id] === k && a.id !== listening) next[a.id] = prev; // swap, never conflict
      next[listening] = k;
      onChange(next);
      setListening(null);
    };
    window.addEventListener("keydown", cap, true);
    return () => window.removeEventListener("keydown", cap, true);
  }, [listening, keymap, onChange]);

  // ESC backs out when not listening for a key.
  useEffect(() => {
    const onEsc = (e) => { if (e.key === "Escape") onBack(); };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [onBack]);

  const row = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "7px 0", borderBottom: `1px solid rgba(74,83,97,0.35)` };
  const chip = (hot) => ({
    ...btn,
    padding: "5px 10px",
    fontSize: 12,
    minWidth: 110,
    textAlign: "center",
    borderColor: hot ? COLORS.borderHot : COLORS.btnBorder,
    color: hot ? COLORS.red : COLORS.bright,
  });

  return (
    <div style={{ position: "fixed", inset: 0, background: COLORS.bg, fontFamily: FONT, color: COLORS.text, display: "flex", overflow: "auto", userSelect: "none", WebkitUserSelect: "none" }}>
      <div style={{ width: "min(460px, 94vw)", padding: "24px 0", margin: "auto" }}>
        <div style={{ color: COLORS.red, fontSize: 18, letterSpacing: 4, marginBottom: 4 }}>CONTROLS</div>
        <div style={{ fontSize: 11, opacity: 0.65, marginBottom: 10 }}>
          Click a binding, then press the new key. A key already in use swaps with the old one.
        </div>

        <div style={{ ...row, opacity: 0.6 }}>
          <span>AIM / MAIN GUN / ZOOM</span>
          <span style={{ fontSize: 12 }}>MOUSE · CLICK · WHEEL (fixed)</span>
        </div>

        {ACTIONS.map((a) => (
          <div key={a.id} style={row}>
            <span style={{ fontSize: 13 }}>{a.label}</span>
            <button data-bind={a.id} style={chip(listening === a.id)} onClick={() => setListening(listening === a.id ? null : a.id)}>
              {listening === a.id ? "PRESS A KEY…" : formatKey(keymap[a.id])}
            </button>
          </div>
        ))}

        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button data-menu="back" style={{ ...btn, borderColor: COLORS.borderHot, color: COLORS.red }} onClick={onBack}>← BACK</button>
          <button data-menu="defaults" style={btn} onClick={() => { setListening(null); onChange({ ...DEFAULTS }); }}>RESET DEFAULTS</button>
        </div>
        <div style={{ marginTop: 10, fontSize: 11, opacity: 0.55 }}>ESC cancels a rebind, or backs out of this screen. Modifier and system keys can't be bound.</div>
      </div>
    </div>
  );
}
