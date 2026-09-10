import React, { useState } from "react";
import { P } from "./styles.js";
import CrateChip, { StockTag } from "./Crate.jsx";
import { PALETTE_BY_KEY } from "./palette.js";

// THE DRAFT SCREEN — a NEW pre-start surface, shared DOM
// phone and desktop. Seven cards up, tap toggles a pick, five max; CONFIRM
// arms at exactly five. Styled on the pre-start overlay's own P.btn idiom
// (P.slot's build-bar card, ~44px touch target both platforms).
export default function DraftScreen({ cards, onConfirm }) {
  const [picked, setPicked] = useState([]);
  const toggle = (k) => {
    if (picked.includes(k)) { setPicked(picked.filter((x) => x !== k)); return; }
    if (picked.length >= 5) return;
    setPicked([...picked, k]);
  };
  return (
    <div style={P.ovl}>
      <style>{`@keyframes cs-deal { from { opacity: 0; transform: translate(-16px, 12px) rotate(-8deg) scale(0.85); } to { opacity: 1; transform: var(--restT, none); } }`}</style>
      <div style={{ fontSize: 20, letterSpacing: 3, color: "#9fdcff", marginBottom: 4 }}>THE OPENING DRAFT</div>
      <CrateChip label="THE CONVOY" icon="⚒" open={true} style={{ marginBottom: 6 }} />
      <div style={{ fontSize: 12, opacity: 0.85, maxWidth: 460, lineHeight: 1.6, marginBottom: 14 }}>
        Seven cards dealt — units and plans together. Pick five, free.
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 8, maxWidth: 520, marginBottom: 14 }}>
        {cards.map((c, ci) => {
          const it = PALETTE_BY_KEY[c.k];
          const on = picked.includes(c.k);
          return (
            <StockTag key={c.k} data-draft-card={c.k} data-draft-kind={c.plan ? "plan" : "unit"}
              tilt={ci % 2 ? 1.5 : -2} delay={(ci * 0.06) + "s"}
              onClick={() => toggle(c.k)}
              style={{ minWidth: 88, minHeight: 56, borderColor: on ? "#2f7a44" : "#8f8768", background: on ? "#d3d6a8" : "#cfc6a5" }}>
              <div style={{ fontSize: 16 }}>{it ? it.icon : "?"}</div>
              <div>{it ? it.label : c.k}</div>
              <div style={{ fontSize: 10, fontWeight: 600, color: c.plan ? "#31556a" : "#7a5a1e" }}>{c.plan ? "PLAN" : "UNIT"}</div>
            </StockTag>
          );
        })}
      </div>
      <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 10 }}>PICKED {picked.length} OF 5</div>
      <button data-draft-confirm disabled={picked.length !== 5}
        style={{ ...P.btn, fontSize: 15, padding: "10px 26px", minHeight: 44, minWidth: 44, borderColor: picked.length === 5 ? "#4aff8c" : "#48515f", color: picked.length === 5 ? "#4aff8c" : "#e6ebf1", opacity: picked.length === 5 ? 1 : 0.55 }}
        onClick={() => onConfirm(cards.filter((c) => picked.includes(c.k)))}>
        FIELD THESE FIVE
      </button>
    </div>
  );
}
