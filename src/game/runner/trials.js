// game/runner/trials.js — campaign trial-table construction and small HUD
// constants.
import { CAUSE } from "../../engine/core.js";
import { matchKill } from "../predicate.js";

export const PHYS_CAUSES = new Set([CAUSE.CRUSH, CAUSE.TOSS, CAUSE.COLLAPSE, CAUSE.FLIP, CAUSE.DROWN]);
export const LABEL_COLORS = { PROJECTILE: "#ffb45e", BLAST: "#ff6b5e", CRUSH: "#ffd27a", TOSS: "#c9f06c", COLLAPSE: "#e0e6ee", FLIP: "#b48cff", DROWN: "#7fd7ff", IMPACT: "#ff9e9e" };

export function detectTouch() {
  if (typeof window === "undefined") return false;
  try { if (window.matchMedia && window.matchMedia("(pointer: coarse)").matches) return true; } catch (e) {}
  const fine = (() => { try { return window.matchMedia && window.matchMedia("(pointer: fine)").matches; } catch (e) { return false; } })();
  return (navigator.maxTouchPoints || 0) > 0 && !fine;
}

// One contract per scenario: the trial table is read from spec.contract.
// setup is a no-op (the world is freshly built per mission); restock goes
// through pg.respawnGroup so vehicle subjects reissue too.
export const makeTrials = (spec) => {
  const c = spec.contract;
  return [{
    id: c.wo, title: `${c.wo} · ${c.title}`, hint: c.directive, commendation: c.commendation,
    need: c.need, par: c.par, subjects: c.subjects,
    focus: () => c.focus || { x: 0, z: 0, r: 8 }, // the survey marker: the flagged work site
    setup: () => {},
    // demolition orders: progress is structural — kills never advance it
    ...(c.volleyMode ? { volley: true } : c.objective ? { objective: c.objective, match: () => false } : { match: (e) => matchKill(c.predicate, e) }),
    ...(c.alt ? { alt: c.alt } : {}),
  }];
};
