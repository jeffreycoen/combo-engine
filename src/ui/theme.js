// Shared shell styling, matched to the demo's panel aesthetic so the start
// screen and the game read as one piece.
export const COLORS = {
  bg: "#0e1014",
  panel: "rgba(16,19,24,0.92)",
  border: "#3a414b",
  borderHot: "#d8433a",
  text: "#cfd6de",
  bright: "#e6ebf1",
  red: "#ff6b5e",
  gold: "#ffd27a",
  dim: "#8b93a0",
  btnBg: "#1c2129",
  btnBorder: "#4a5361",
};

export const FONT = "'Courier New', ui-monospace, monospace";

export const btn = {
  background: COLORS.btnBg,
  border: `2px solid ${COLORS.btnBorder}`,
  color: COLORS.bright,
  padding: "10px 14px",
  fontSize: 13,
  fontFamily: FONT,
  cursor: "pointer",
  letterSpacing: 0.5,
  touchAction: "manipulation",
};

export const panel = {
  background: COLORS.panel,
  border: `2px solid ${COLORS.border}`,
  color: COLORS.text,
  padding: "14px 18px",
  fontFamily: FONT,
};

export function detectTouch() {
  if (typeof window === "undefined") return false;
  try { if (window.matchMedia && window.matchMedia("(pointer: coarse)").matches) return true; } catch (e) {}
  const fine = (() => { try { return window.matchMedia && window.matchMedia("(pointer: fine)").matches; } catch (e) { return false; } })();
  return (navigator.maxTouchPoints || 0) > 0 && !fine;
}
