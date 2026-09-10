// game/predicate.js — declarative contract predicates for the Phase 4
// scenario schema. Replaces TRIALS match() closures with data, so contracts
// become authorable content. Verbatim from the buildout plan's verified
// predicate.mjs; parity-gated against the demo's live closures in CI.

export function matchKill(pred, e) {
  if (!pred) return false;
  if (pred.causes && !pred.causes.includes(e.cause)) return false;
  if (pred.group && e.group !== pred.group) return false;
  if (pred.attacker && e.attacker !== pred.attacker) return false;
  if (pred.kinds && !pred.kinds.includes(e.kind)) return false;
  if (pred.volleyed && !e.volley) return false;
  return true;
}

// The seven shipped trials expressed as data. saturation keeps the engine's
// volley-counting rule (N kills sharing one volley id) — that lives in the
// trial runner, flagged here as volleyMode rather than faked as a predicate.
export const CONTRACT_PREDICATES = {
  gunnery: { attacker: "player", causes: ["BLAST", "PROJECTILE"], group: "gunnery" },
  roadkill: { attacker: "player", causes: ["CRUSH"] },
  saturation: { volleyMode: true, need: 3 },
  demolition: { causes: ["COLLAPSE"] },
  deep_end: { causes: ["DROWN"] },
  counter_battery: { group: "pit" },
  thin_ice: { group: "ponddrill" },
};
