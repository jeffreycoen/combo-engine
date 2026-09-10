import React from "react";

// THE PIE. One disc of wedges around the selected
// thing. Equal sectors, twelve o'clock first, hole in the middle so the
// unit stays visible. Choosing ANY wedge closes the pie (the owner's rule:
// the screen must be free for the follow-up taps an order needs) — every
// wedge's onClick runs its action, then onChoose (the call site sets
// view.pieOpen = false there), one mechanism for every slot rather than
// repeating a close in each act.
export default function RadialMenu({ cx, cy, label, slots, armed, onChoose, press, onCard, showInfo }) {
  const N = slots.length, R0 = 36, R1 = 104;
  const wedge = (i) => {
    const a0 = -Math.PI / 2 + (i - 0.5) * (2 * Math.PI / N);
    const a1 = a0 + 2 * Math.PI / N;
    const p = (r, a) => `${cx + Math.cos(a) * r},${cy + Math.sin(a) * r}`;
    const large = (2 * Math.PI / N) > Math.PI ? 1 : 0;
    return `M ${p(R0, a0)} A ${R0} ${R0} 0 ${large} 1 ${p(R0, a1)} L ${p(R1, a1)} A ${R1} ${R1} 0 ${large} 0 ${p(R1, a0)} Z`;
  };
  return (
    <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 7, pointerEvents: "none", overflow: "visible" }}>
      {slots.map((s, i) => {
        const mid = -Math.PI / 2 + i * (2 * Math.PI / N);
        const lx = cx + Math.cos(mid) * 72, ly = cy + Math.sin(mid) * 72;
        return (
          <g key={s.key} data-radial={s.key} style={{ pointerEvents: "auto", cursor: "pointer" }} onClick={() => { s.act(); onChoose && onChoose(); }} opacity={armed ? 1 : 0.5} {...(s.card && press ? press(s.card) : {})}>
            {/* The wedge keeps its dark panel fill even when lit — the lit
                state is the accent BORDER and a faint tint, and every label
                paints a dark halo under itself (paintOrder stroke) so it
                reads on any fill, any terrain. */}
            <path d={wedge(i)} fill="rgba(14,18,24,0.88)" stroke={s.on ? s.color : "#48515f"} strokeWidth={s.on ? 2.5 : 1.5} />
            {s.on && <path d={wedge(i)} fill={s.color} fillOpacity="0.14" stroke="none" />}
            <text x={lx} y={ly - 4} textAnchor="middle" fontSize="15" fill={s.color} stroke="#0e1218" strokeWidth="3" paintOrder="stroke" style={{ userSelect: "none" }}>{s.icon || ""}</text>
            <text x={lx} y={ly + 12} textAnchor="middle" fontSize="10" letterSpacing="1" fill={s.color} stroke="#0e1218" strokeWidth="3" paintOrder="stroke" fontFamily="inherit" style={{ userSelect: "none" }}>{s.label}</text>
            {s.card && showInfo && (
              <text data-wedge-info={s.card} x={lx} y={s.toggle != null ? ly - 22 : ly + 26} textAnchor="middle" fontSize="11" fill="#9fdcff" stroke="#0e1218" strokeWidth="3" paintOrder="stroke" style={{ cursor: "pointer" }}
                onClick={(e) => { e.stopPropagation(); onCard && onCard(s.card); }}>ⓘ</text>
            )}
            {/* A toggle wedge wears a slider — black at
                rest, slid over and bright green in use. Only slots that
                carry s.toggle draw it; every other wedge is untouched. */}
            {s.toggle != null && (
              <g>
                <rect x={lx - 11} y={ly + 17} width={22} height={10} rx={5}
                  fill={s.toggle ? "rgba(74,255,140,0.28)" : "#0a0d12"}
                  stroke={s.toggle ? "#4aff8c" : "#48515f"} strokeWidth="1" />
                <circle cx={s.toggle ? lx + 6 : lx - 6} cy={ly + 22} r={4}
                  fill={s.toggle ? "#4aff8c" : "#14171a"}
                  stroke={s.toggle ? "#4aff8c" : "#48515f"} strokeWidth="1" />
              </g>
            )}
          </g>
        );
      })}
      <foreignObject x={cx - 60} y={cy + R1 + 6} width="120" height="40" style={{ pointerEvents: "none", overflow: "visible" }}>
        <div style={{ textAlign: "center" }}>
          <span style={{ fontSize: 10, letterSpacing: 1, color: "#7dffa8", background: "rgba(14,18,24,0.85)", padding: "1px 6px", borderRadius: 4 }}>{label}</span>
        </div>
      </foreignObject>
    </svg>
  );
}
