import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api } from "../lib/api";

import { DEFAULT_SETTINGS } from "../lib/default-settings";
export { DEFAULT_SETTINGS };

const SettingsContext = createContext({
  settings: DEFAULT_SETTINGS,
  loading: true,
  reload: () => {},
});

// Deep merge helper: fills missing keys from defaults
function merge(target, source) {
  if (Array.isArray(source)) return source;
  if (source && typeof source === "object") {
    const out = { ...target };
    for (const k of Object.keys(source)) out[k] = merge(target?.[k], source[k]);
    for (const k of Object.keys(target || {})) if (!(k in out)) out[k] = target[k];
    return out;
  }
  return source === undefined ? target : source;
}

const SETTINGS_CACHE_KEY = "if_site_settings_v1";

function readCachedSettings() {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = window.sessionStorage.getItem(SETTINGS_CACHE_KEY);
    return raw ? merge(DEFAULT_SETTINGS, JSON.parse(raw)) : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(readCachedSettings);
  const [loading, setLoading] = useState(false);
  const reload = useCallback(async (force = false) => {
    try {
      const r = await api.get(
        "/settings",
        force ? { params: { _refresh: Date.now() } } : undefined,
      );
      const merged = merge(DEFAULT_SETTINGS, r.data || {});
      setSettings(merged);
      if (typeof window !== "undefined") {
        try {
          window.sessionStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(r.data || {}));
        } catch {
          // ignore storage quota errors
        }
      }
    } catch (_) {
      /* keep defaults */
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    reload(false);
  }, [reload]);
  return (
    <SettingsContext.Provider value={{ settings, loading, reload }}>
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => useContext(SettingsContext);
