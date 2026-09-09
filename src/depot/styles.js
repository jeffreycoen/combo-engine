export const P = {
  root: { position: "fixed", inset: 0, background: "#0e1218", overflow: "hidden", fontFamily: "ui-monospace, Menlo, Consolas, monospace", color: "#e6ebf1", userSelect: "none", WebkitUserSelect: "none", touchAction: "none" },
  cv: { position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" },
  top: { position: "absolute", top: 0, left: 0, right: 0, display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: "linear-gradient(rgba(10,13,18,0.88), rgba(10,13,18,0))", zIndex: 4, fontSize: 12, flexWrap: "wrap" },
  panel: { position: "absolute", background: "rgba(14,18,24,0.88)", border: "1px solid #48515f", borderRadius: 8, padding: 10, fontSize: 12, zIndex: 5 },
  btn: { background: "#1a212b", border: "1px solid #48515f", color: "#e6ebf1", borderRadius: 6, padding: "4px 10px", fontFamily: "inherit", fontSize: 12, cursor: "pointer" },
  // The in-world taps (squad order chips, the ✓/✗ confirm pair) are
  // the ones a thumb has to find mid-game — ~1.5x the chrome button, and at
  // least the 44px touch target every phone guideline asks for.
  btnBig: { background: "#1a212b", border: "1px solid #48515f", color: "#e6ebf1", borderRadius: 8, padding: "10px 16px", fontFamily: "inherit", fontSize: 15, lineHeight: "20px", minHeight: 44, minWidth: 44, cursor: "pointer" },
  stat: { display: "flex", alignItems: "center", gap: 4, padding: "3px 8px", background: "rgba(20,26,34,0.75)", border: "1px solid #303a48", borderRadius: 6 },
  bar: { position: "absolute", left: 0, right: 0, bottom: 0, display: "flex", gap: 6, padding: "8px 8px calc(8px + env(safe-area-inset-bottom, 0px))", justifyContent: "center", background: "linear-gradient(rgba(10,13,18,0), rgba(10,13,18,0.9))", zIndex: 4, flexWrap: "wrap" },
  slot: { display: "flex", flexDirection: "column", alignItems: "center", gap: 2, minWidth: 64, minHeight: 52, padding: "8px 10px", background: "#1a212b", border: "1px solid #48515f", borderRadius: 8, fontSize: 12, cursor: "pointer" }, // wider/taller build slots — bottom bar, thumb reach
  ovl: { position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "rgba(10,13,18,0.72)", zIndex: 8, textAlign: "center", padding: 20 },
  toastWrap: { position: "absolute", top: 54, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, zIndex: 6, pointerEvents: "none" },
  // The manifest card's parking spot: top-right, under the top bar, mirroring
  // the intel card's top-left (Dispatch.jsx's `float`). pointerEvents none on
  // the wrapper — only the card box itself takes taps, so the battle behind it
  // keeps every pixel it isn't actually covering.
  cardWrap: { position: "absolute", top: 52, right: 10, zIndex: 6, pointerEvents: "none" },
  toast: { background: "rgba(14,18,24,0.92)", border: "1px solid #ffb45e", color: "#ffd9a0", borderRadius: 6, padding: "4px 12px", fontSize: 12 },
};
