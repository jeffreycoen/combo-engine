// COLDSNAP DEPOT — Crate.jsx (mk2.28, redrawn mk2.30): THE QUARTERMASTER'S
// STORES. The crate IS the button — a large wireframe crate in the
// dot-matrix line voice, stencil label painted on its face, hinged lid.
// StockTag is the paper: a manila tag, clipped corner, punched hole, dark
// stencil text, resting at its own small tilt. Pure presentation — no
// state, no handlers of its own. One DOM, phone and desktop.
import React from "react";

export default function CrateChip({ label, icon, count, open, line, active, style, ...rest }) {
  const col = active ? "#9fdcff" : "#aeb6c2";
  return (
    <div {...rest} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0,
      padding: "2px 2px 0", background: "none", border: "none", fontSize: 11,
      cursor: "pointer", color: col, ...style }}>
      <svg width="76" height="50" viewBox="0 0 76 50" style={{ display: "block", overflow: "visible" }}>
        <g stroke="currentColor" strokeWidth="1.6" fill="rgba(14,18,24,0.85)" strokeLinecap="round">
          <rect x="4" y="14" width="68" height="34" rx="1.5" />
          <line x1="4" y1="24" x2="72" y2="24" opacity="0.4" />
          <line x1="24" y1="14" x2="24" y2="48" opacity="0.25" />
          <line x1="52" y1="14" x2="52" y2="48" opacity="0.25" />
          <g style={{ transformOrigin: "4px 14px", transform: open ? "rotate(-78deg)" : "none", transition: "transform 0.2s ease-out" }}>
            <rect x="4" y="7" width="68" height="7" rx="1.5" fill="rgba(14,18,24,0.95)" />
          </g>
        </g>
        <text x="38" y="32" textAnchor="middle" fontSize="10" letterSpacing="2" fill="currentColor" fontFamily="inherit">{label}</text>
        <text x="38" y="43" textAnchor="middle" fontSize="7.5" fill="currentColor" opacity="0.7" fontFamily="inherit">{icon}{count != null ? "  " + count : ""}</text>
      </svg>
      <div style={{ fontSize: 9, opacity: 0.65, minHeight: 11, letterSpacing: 1 }}>{line || ""}</div>
    </div>
  );
}

// The paper. tilt is the tag's resting angle (degrees); the deal keyframe
// ends at var(--restT), so the tilt survives the animation (fill stays
// backwards — the dimming law). Children paint the tag's face.
export function StockTag({ tilt = 0, delay = "0s", style, children, ...rest }) {
  return (
    <div {...rest} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1,
      minWidth: 56, minHeight: 52, padding: "10px 8px 6px", position: "relative",
      background: "#cfc6a5", color: "#1a2016", border: "1px solid #8f8768",
      clipPath: "polygon(0 9px, 9px 0, 100% 0, 100% 100%, 0 100%)",
      fontSize: 11, letterSpacing: 1, cursor: "pointer",
      transform: "rotate(" + tilt + "deg)", "--restT": "rotate(" + tilt + "deg)",
      animation: "cs-deal 0.16s ease-out backwards", animationDelay: delay,
      ...style }}>
      <span style={{ position: "absolute", top: 3, left: 11, width: 6, height: 6, borderRadius: "50%", border: "1.2px solid #8f8768", background: "rgba(14,18,24,0.45)" }} />
      {children}
    </div>
  );
}
