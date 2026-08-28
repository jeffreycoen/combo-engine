// Keyboard remapping for the frozen proving-grounds demo. The demo listens
// for hardcoded keys on window and must stay byte-identical, so instead of
// editing it, a capture-phase interceptor translates the player's chosen
// physical keys into the canonical keys the demo expects, and swallows a
// canonical key whose action the player has bound elsewhere. Synthetic
// events are flagged so they pass through untranslated.

export const ACTIONS = [
  { id: "forward", label: "DRIVE FORWARD", def: "w" },
  { id: "back", label: "DRIVE BACK", def: "s" },
  // def = the canonical key the frozen demo listens for; bind = the default
  // physical key. Steering ships crossed (Jeff's call: stock A/D read
  // backwards): pressing A synthesizes the demo's 'd', D synthesizes 'a'.
  { id: "left", label: "STEER LEFT", def: "d", bind: "a" },
  { id: "right", label: "STEER RIGHT", def: "a", bind: "d" },
  { id: "brake", label: "BRAKE", def: " " },
  { id: "mg", label: "MG (HOLD)", def: "g" },
  { id: "weapon", label: "SWITCH WEAPON", def: "t" }, // campaign fire-control toggle; inert in the frozen demo
  { id: "volley", label: "ROCKET VOLLEY", def: "v" },
  { id: "recover", label: "RECOVER (FLIPPED)", def: "r" },
  { id: "mute", label: "SOUND ON/OFF", def: "m" },
  { id: "squads", label: "RESPAWN SQUADS", def: "1" },
  { id: "scouts", label: "RESPAWN SCOUTS", def: "2" },
  { id: "repair", label: "REPAIR KEEP", def: "3" },
  { id: "reset", label: "RESET RANGE", def: "0" },
];

export const DEFAULTS = Object.fromEntries(ACTIONS.map((a) => [a.id, a.bind || a.def]));

// Held-style modifiers wait for the real key of a chord; the others either
// never deliver a paired keyup (Meta opens the OS menu, CapsLock latches on
// macOS, Dead/Process belong to the IME) or are reserved (Escape exits).
export const MODIFIER_KEYS = new Set(["shift", "control", "alt", "meta"]);
export const UNBINDABLE_KEYS = new Set([
  "escape", "capslock", "dead", "process", "numlock", "scrolllock",
  "contextmenu", "os", "fn", "fnlock", "hyper", "super", "symbol", "unidentified",
]);

const STORE_KEY = "coldsnap-keymap";

export function formatKey(k) {
  if (k === " ") return "SPACE";
  if (k.startsWith("arrow")) return "ARROW " + k.slice(5).toUpperCase();
  return k.toUpperCase();
}

// A stored map only loads if it upholds the invariants the Controls UI
// enforces at rebind time: string keys, nothing reserved, no duplicates.
// Anything else (hand-edited, corrupt, from an older build) resets to
// defaults — predictable beats clever here, because App relies on
// "Escape always lands" for its exit handler.
export function sanitizeKeymap(m) {
  if (!m || typeof m !== "object") return null;
  const out = {};
  const used = new Set();
  for (const a of ACTIONS) {
    const k = m[a.id];
    if (typeof k !== "string" || !k || k.length > 24) return null;
    const lk = k.toLowerCase();
    if (UNBINDABLE_KEYS.has(lk) || MODIFIER_KEYS.has(lk) || used.has(lk)) return null;
    used.add(lk);
    out[a.id] = lk;
  }
  return out;
}

export async function loadKeymap() {
  try {
    const r = await window.storage.get(STORE_KEY);
    const m = sanitizeKeymap(JSON.parse(r.value));
    if (m) return m;
  } catch (e) {}
  return { ...DEFAULTS };
}

export function saveKeymap(map) {
  try { window.storage.set(STORE_KEY, JSON.stringify(map)); } catch (e) {}
}

const isFormTarget = (t) =>
  !!t && !!t.tagName && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable);

export function installKeyRemap(getMap) {
  let suspended = false;
  const byDef = new Map(ACTIONS.map((a) => [a.def, a]));
  // physical key (e.code) -> canonical key owed a keyup. Pairing releases
  // against this table instead of e.key survives Shift changing mid-hold
  // ('/' down, '?' up) and the keymap changing between down and up.
  const pressed = new Map();

  const synth = (type, key) => {
    const ev = new KeyboardEvent(type, { key, bubbles: true, cancelable: true });
    ev.__coldsnapRemap = true;
    window.dispatchEvent(ev);
  };

  const handler = (e) => {
    if (suspended || e.__coldsnapRemap) return;
    // the demo's GFX panel has focusable sliders/checkboxes that need their
    // default key behavior — remapping never applies inside form controls
    if (isFormTarget(e.target)) return;
    const code = e.code || e.key;
    if (e.type === "keyup" && pressed.has(code)) {
      const canon = pressed.get(code);
      pressed.delete(code);
      e.stopImmediatePropagation();
      if (e.cancelable) e.preventDefault();
      synth("keyup", canon);
      return;
    }
    const k = (e.key || "").toLowerCase();
    if (!k) return;
    const map = getMap() || DEFAULTS;
    let bound = null;
    for (const a of ACTIONS) if ((map[a.id] || a.def) === k) { bound = a; break; }
    if (bound) {
      if (bound.def === k) {
        // identity binding: the original event is already right — but track
        // the hold so a mid-hold keymap change can't strand the keyup
        if (e.type === "keydown") pressed.set(code, k);
        return;
      }
      e.stopImmediatePropagation();
      if (e.cancelable) e.preventDefault();
      if (e.type === "keydown") pressed.set(code, bound.def);
      synth(e.type, bound.def);
      return;
    }
    const owner = byDef.get(k);
    if (owner && (map[owner.id] || owner.def) !== k) {
      // a default key whose action moved elsewhere stays dead
      e.stopImmediatePropagation();
      if (e.cancelable) e.preventDefault();
    }
  };

  // focus theft (alt-tab, OS menus) eats keyups: release everything we hold
  // so the demo's S.keys can't stick a throttle or the MG open
  const onBlur = () => {
    for (const canon of pressed.values()) synth("keyup", canon);
    pressed.clear();
  };

  window.addEventListener("keydown", handler, true);
  window.addEventListener("keyup", handler, true);
  window.addEventListener("blur", onBlur);
  return {
    setSuspended(v) { suspended = !!v; if (v) { onBlur(); } },
    uninstall() {
      window.removeEventListener("keydown", handler, true);
      window.removeEventListener("keyup", handler, true);
      window.removeEventListener("blur", onBlur);
    },
  };
}
