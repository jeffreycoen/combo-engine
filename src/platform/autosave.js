// platform/autosave.js — cross-game persistence of player-facing state.
// Order/trial progress, medals and achievements already save at their own
// change points inside each game; this adds renderer settings, zoom, sound,
// and the per-cause kill tally. The frozen demo can't be edited, so
// attachExternalAutosave drives it from outside through the game's
// window.__COLDSNAP__ debug api; the sandbox persists natively but shares
// the same storage shape ({ gfx, zoom, muted }), so settings follow the
// player between games. Restores always apply RAW gfx values, never preset
// names — the games' preset defaults differ from their mounted state (retro
// preset implies scale 3 but both mount at scale 1), and a preset-based
// restore would visibly change the look.

const SETTINGS_KEY = "coldsnap-settings";

export async function loadSettings() {
  try {
    const r = await window.storage.get(SETTINGS_KEY);
    const s = JSON.parse(r.value);
    if (s && typeof s === "object") return s;
  } catch (e) {}
  return null;
}

export function saveSettings(s) {
  try { window.storage.set(SETTINGS_KEY, JSON.stringify(s)); } catch (e) {}
}

export async function loadTally(key) {
  try {
    const r = await window.storage.get(key);
    const t = JSON.parse(r.value);
    if (t && typeof t === "object") return t;
  } catch (e) {}
  return null;
}

export function sanitizeGfx(g) {
  if (!g || typeof g !== "object") return null;
  return {
    preset: typeof g.preset === "string" ? g.preset : "custom",
    scale: Math.max(1, Math.min(4, (g.scale | 0) || 1)),
    outline: g.outline ? 1 : 0,
    dither: g.dither ? 1 : 0,
    palette: g.palette ? 1 : 0,
  };
}

// Frozen-demo side: restore through the debug api, then poll the live game
// and persist on change. Tally restores by MERGE (not replace) so a slow
// async load can never clobber kills scored before it resolved.
export function attachExternalAutosave(tallyKey) {
  let stop = false, timer = 0, lastJ = "";
  const arm = async () => {
    if (stop) return;
    const api = window.__COLDSNAP__;
    if (!api || !api._S || !api._R) { timer = setTimeout(arm, 200); return; }
    const S = api._S;
    try {
      const s = await loadSettings();
      if (stop) return;
      if (s) {
        const g = sanitizeGfx(s.gfx);
        if (g) api.setGfx({ scale: g.scale, outline: g.outline, dither: g.dither, palette: g.palette });
        if (typeof s.zoom === "number" && S.zoomBy && S.zoom) S.zoomBy(Math.max(0.7, Math.min(2, s.zoom)) / S.zoom);
        if (typeof s.muted === "boolean") S.audio.setMuted(s.muted);
      }
      const t = await loadTally(tallyKey);
      if (stop) return;
      if (t) Object.assign(S.tally, t);
    } catch (e) {}
    const poll = () => {
      if (stop) return;
      try {
        const cur = { settings: { gfx: { ...api._R.gfx }, zoom: S.zoom, muted: S.audio.muted }, tally: S.tally };
        const j = JSON.stringify(cur);
        if (j !== lastJ) {
          lastJ = j;
          saveSettings(cur.settings);
          try { window.storage.set(tallyKey, JSON.stringify(cur.tally)); } catch (e) {}
        }
      } catch (e) {}
      timer = setTimeout(poll, 1000);
    };
    poll();
  };
  arm();
  return () => { stop = true; clearTimeout(timer); };
}
