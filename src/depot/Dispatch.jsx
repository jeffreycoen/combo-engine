// depot/Dispatch.jsx — the between-wave stall card. Bureau transmission
// teletypes onto the card; ACKNOWLEDGE is the single gate back into build
// phase (a future multiplayer build swaps this button for a network-ready
// gate that calls the same state.js advance()).
//
// Modal hard-won lesson (verbatim, ported from campaign/TD): a card that
// appears in the same React flush as a tap gets dismissed unread by the
// trailing click. ACKNOWLEDGE is armed only after 500ms. Scrim clicks never
// dismiss — only the button does.
//
// Typed pattern copied from src/game/runner/Typed.jsx — depot stays
// self-contained, no cross-module imports.
import React, { useEffect, useState } from "react";

function Typed({ text, cps = 45, style }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    setN(0);
    const iv = setInterval(() => setN((v) => (v >= text.length ? v : v + 1)), 1000 / cps);
    return () => clearInterval(iv);
  }, [text, cps]);
  return <span style={style}>{text.slice(0, n)}{n < text.length ? <span style={{ opacity: 0.6 }}>{"▌"}</span> : null}</span>;
}

// outcome (optional, end-of-run cards only): "win" | "loss". Renders an
// explicit verdict banner above the teletyped body — the spent-offensive
// early WIN read as a defeat when the card carried no verdict at all.
//
// floating (P1 Task 2): the bell's intel card is NOT a modal — the war does
// not stop for a page of prose. With this set the scrim is gone entirely (a
// full-inset scrim eats every combat tap behind it), the card parks in a
// corner, and only the card's own box takes pointer events.
// armed (P1 Task 2): an external, WORLD-time arm gate (state.js's
// PENDING_ARM_S law, evaluated by the frame loop). It is ANDed with the card's
// own 500ms modal guard, never replaces it — both laws hold at once.
export default function Dispatch({ dispatch, gating, onAcknowledge, label, outcome, floating, armed: armedExt }) {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    setArmed(false);
    const t = setTimeout(() => setArmed(true), 500);
    return () => clearTimeout(t);
  }, [dispatch]);

  if (!dispatch) return null;
  const ready = armed && (armedExt === undefined || armedExt);

  return (
    <div style={floating ? S.float : S.scrim}>
      <div style={floating ? { ...S.card, ...S.cardFloat } : S.card} data-dispatch-wo={dispatch.wo}>
        <div style={S.head}>
          <span style={{ color: "#7fd7ff", letterSpacing: 2 }}>FIELD DISPATCH</span>
          <span style={{ opacity: 0.6 }}>{dispatch.wo}</span>
        </div>
        {outcome && (
          <div style={{ ...S.verdict, color: outcome === "win" ? "#4aff8c" : "#ff7a7a", borderColor: outcome === "win" ? "#2b7a4c" : "#7a2b2b" }}>
            {outcome === "win" ? "VICTORY — THE FIELD IS HELD" : "DEFEAT — THE FIELD IS LOST"}
          </div>
        )}
        <div style={S.body}>
          {dispatch.lines.map((line, i) => (
            <div key={i} style={S.line}><Typed text={line} /></div>
          ))}
        </div>
        <button
          style={{ ...S.ack, opacity: ready ? 1 : 0.4, cursor: ready ? "pointer" : "default" }}
          disabled={!ready}
          onClick={() => { if (ready) onAcknowledge(); }}
        >
          {label || (gating ? "ACKNOWLEDGE" : "CLOSE")}
        </button>
      </div>
    </div>
  );
}

const S = {
  scrim: { position: "absolute", inset: 0, background: "rgba(6,10,16,0.72)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 20 },
  // floating: parked under the top bar, left side (the manifest takes the
  // right). No inset box and pointerEvents "none" on the wrapper, so every
  // pixel that is not the card itself still belongs to the battle underneath.
  float: { position: "absolute", top: 52, left: 10, zIndex: 6, pointerEvents: "none" },
  cardFloat: { width: "min(330px, 44vw)", padding: "12px 14px", pointerEvents: "auto", opacity: 0.96 },
  card: { width: "min(420px, 86vw)", background: "#0d1420", border: "1px solid #2c3846", borderRadius: 6, padding: "16px 18px", boxShadow: "0 10px 40px rgba(0,0,0,0.5)" },
  verdict: { fontSize: 13, letterSpacing: 3, textAlign: "center", border: "1px solid", borderRadius: 4, padding: "6px 0", marginBottom: 12, fontFamily: "monospace" },
  head: { display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 12, borderBottom: "1px solid #2c3846", paddingBottom: 8 },
  body: { minHeight: 64, fontSize: 13, lineHeight: 1.7, color: "#e6ebf1", letterSpacing: 0.5, fontFamily: "monospace" },
  line: { marginBottom: 4 },
  ack: { marginTop: 14, width: "100%", padding: "9px 0", background: "transparent", border: "1px solid #4aff8c", color: "#4aff8c", letterSpacing: 2, fontSize: 12, borderRadius: 4 },
};
