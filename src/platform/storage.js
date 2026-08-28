// window.storage shim. The claude.ai artifact runtime provides an async
// key-value store at window.storage; on GitHub Pages we back the same API
// with localStorage so the demo file runs unchanged in both environments.
// get() resolves { key, value } with value null when absent — the demo's
// guards (r && r.value, JSON.parse fallbacks) already handle both shapes.
if (typeof window !== "undefined" && !window.storage) {
  window.storage = {
    async get(key) {
      let value = null;
      try { value = window.localStorage.getItem(key); } catch (e) {}
      return { key, value };
    },
    async set(key, value) {
      try { window.localStorage.setItem(key, String(value)); } catch (e) {}
      return { key, value: String(value) };
    },
    async delete(key) {
      try { window.localStorage.removeItem(key); } catch (e) {}
      return true;
    },
  };
}

// The named handle (the storage door, mk2.85): the same store, importable.
// Delegates to window.storage at CALL time — never captured — so the
// artifact runtime's own store still wins when it is present; headless
// callers get safe nulls. The shim above is unchanged.
export const storage = {
  async get(key) {
    if (typeof window === "undefined" || !window.storage) return { key, value: null };
    return window.storage.get(key);
  },
  async set(key, value) {
    if (typeof window === "undefined" || !window.storage) return { key, value: String(value) };
    return window.storage.set(key, value);
  },
  async delete(key) {
    if (typeof window === "undefined" || !window.storage) return true;
    return window.storage.delete(key);
  },
};
