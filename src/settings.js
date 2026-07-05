// Shared persistent settings helper for the Stone Wanderer lab/combat page.
// Keeps GitHub Pages controls sticky without making every caller repeat
// localStorage parsing and input binding boilerplate.

const PREFIX = 'stoneWandererSettings.v1.';

function storageKey(key) { return PREFIX + key; }

export const StoneSettings = {
  get(key, fallback) {
    try {
      const raw = localStorage.getItem(storageKey(key));
      return raw == null ? fallback : JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  },
  set(key, value) {
    try { localStorage.setItem(storageKey(key), JSON.stringify(value)); } catch (e) {}
    return value;
  },
  applyValue(id, key, fallback) {
    const el = document.getElementById(id);
    if (!el) return null;
    const value = this.get(key, fallback ?? (el.type === 'checkbox' ? el.checked : el.value));
    if (el.type === 'checkbox') el.checked = !!value;
    else el.value = String(value);
    return el;
  },
  persistOn(el, key, eventName = 'input') {
    if (!el) return;
    const save = () => this.set(key, el.type === 'checkbox' ? !!el.checked : el.value);
    el.addEventListener(eventName, save);
  },
  bindControl(id, key, { fallback, event = 'input', sync } = {}) {
    const el = this.applyValue(id, key, fallback);
    if (!el) return null;
    const run = () => {
      this.set(key, el.type === 'checkbox' ? !!el.checked : el.value);
      sync?.(el);
    };
    el.addEventListener(event, run);
    sync?.(el);
    return el;
  }
};
