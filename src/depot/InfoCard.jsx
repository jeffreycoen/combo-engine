// COLDSNAP DEPOT — InfoCard.jsx (P7.1 T4): one card, three doors. The
// manifest door carries CONFIRM PICK / ✗ (the decision gate before a bell
// pick); the bar door carries CLOSE (an owned type's reference); the deal
// door (P7.1 T8) carries PLACE IT. Pure presentation — every action is a
// prop (the Dispatch.jsx discipline).
import React from "react";

export default function InfoCard({ card, price, armed, door, portrait, onConfirm, onCancel, afford, onBack, series }) {
  if (!card) return null;
  const B = { background: "#1a212b", border: "1px solid #48515f", color: "#e6ebf1", borderRadius: 8, padding: "10px 16px", fontFamily: "inherit", fontSize: 14, minHeight: 44, minWidth: 44, cursor: "pointer" };
  const row = (k, v) => (v == null ? null : (
    <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginTop: 4 }}>
      <span style={{ opacity: 0.65, letterSpacing: 1 }}>{k}</span><span>{v}</span>
    </div>
  ));
  return (
    <div data-info-card={door} style={{ position: "absolute", top: 52, right: 10, zIndex: 7, width: "min(300px, 62vw)", background: "rgba(14,18,24,0.96)", border: "1px solid #9fdcff", borderRadius: 8, padding: 12, fontFamily: "ui-monospace, Menlo, Consolas, monospace", color: "#e6ebf1" }}>
      {door === "teach" && series && series.n > 1 && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
          <span style={{ fontSize: 10, letterSpacing: 2, opacity: 0.6 }}>{series.i + 1}/{series.n}</span>
          <button data-teach-skip style={{ ...B, minHeight: 0, minWidth: 0, padding: "2px 8px", fontSize: 10, opacity: 0.8 }} onClick={onCancel}>SKIP ✕</button>
        </div>
      )}
      <div style={{ color: "#9fdcff", letterSpacing: 2, fontSize: 14 }}>{card.label}</div>
      {portrait && (
        <canvas data-info-portrait width={128} height={128}
          ref={(cv) => { if (cv) portrait(cv); }}
          style={{ display: "block", width: 92, height: 92, margin: "8px auto 0", imageRendering: "pixelated", background: "rgba(20,26,34,0.6)", border: "1px solid #2c3846", borderRadius: 6 }} />
      )}
      <div style={{ fontSize: 12, opacity: 0.85, lineHeight: 1.5, marginTop: 6 }}>{card.role}</div>
      {row("HEALTH", card.n ? `${card.hp} × ${card.n} men` : card.hp)}
      {row("DAMAGE", card.dmg)}
      {row("RANGE", card.range)}
      {row("SPEED", card.speed != null ? card.speed + " m/s" : null)}
      {row("PRICE", price != null ? "◆" + price : null)}
      {card.hint && <div data-card-hint style={{ marginTop: 8, fontSize: 11, letterSpacing: 1, color: "#9fdcff", opacity: 0.85 }}>{card.hint}</div>}
      <div style={{ marginTop: 8, fontSize: 10, letterSpacing: 1, opacity: 0.7 }}>SKILLS</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
        {card.skills.map((s) => <span key={s} style={{ fontSize: 10, letterSpacing: 1, border: "1px solid #2c3846", borderRadius: 4, padding: "2px 6px", color: "#ffd27a" }}>{s}</span>)}
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        {door === "manifest" ? (
          <>
            <button data-info-confirm style={{ ...B, flex: 1, borderColor: "#4aff8c", color: "#4aff8c", opacity: armed ? 1 : 0.5 }} onClick={onConfirm}>CONFIRM PICK</button>
            <button data-info-cancel style={{ ...B, borderColor: "#ff6b5e", color: "#ff6b5e" }} onClick={onCancel}>✗</button>
          </>
        ) : door === "hire" ? (
          <>
            <button data-info-hire disabled={afford === false} style={{ ...B, flex: 1, borderColor: afford === false ? "#48515f" : "#7dffa8", color: afford === false ? "#8a93a1" : "#7dffa8", opacity: armed && afford !== false ? 1 : 0.5, cursor: afford === false ? "default" : "pointer" }} onClick={onConfirm}>{afford === false ? "NO SCRAP — ◆" + price : "CONFIRM HIRE"}</button>
            <button data-info-cancel style={{ ...B, borderColor: "#ff6b5e", color: "#ff6b5e" }} onClick={onCancel}>✗</button>
          </>
        ) : door === "deal" ? (
          <button data-info-place style={{ ...B, flex: 1, borderColor: "#4aff8c", color: "#4aff8c", opacity: armed ? 1 : 0.5 }} onClick={onConfirm}>PLACE IT</button>
        ) : door === "teach" ? (
          <>
            {series && series.i > 0 && <button data-teach-back style={B} onClick={onBack}>← BACK</button>}
            <button data-teach-next style={{ ...B, flex: 1, borderColor: "#9fd4e4", color: "#9fd4e4" }} onClick={onConfirm}>
              {series && series.i < series.n - 1 ? "NEXT →" : "CLOSE"}
            </button>
          </>
        ) : (
          <button data-info-close style={{ ...B, flex: 1 }} onClick={onCancel}>CLOSE</button>
        )}
      </div>
    </div>
  );
}
