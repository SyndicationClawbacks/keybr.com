import {
  applyTheme, clearTheme, COLORS, FONTS, readTheme, ThemeContext, ThemePrefs, usePreferredColorScheme, useTheme,
} from "@keybr/themes";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { type ReactNode, useEffect, useState } from "react";

export const THEME_KEY = "keybr.desktop.theme.v1";

function initialPrefs() {
  // Storage failure must be visible rather than silently reverting to a temporary profile.
  return ThemePrefs.deserialize(localStorage.getItem(THEME_KEY));
}

export function DesktopThemeProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState(initialPrefs);
  const [hash, setHash] = useState(0);
  const [fullscreenState, setFullscreen] = useState(false);
  usePreferredColorScheme();
  useEffect(() => {
    for (const [name, value] of Object.entries(ThemePrefs.dataAttributes(prefs))) {
      document.documentElement.setAttribute(name, value);
    }
    localStorage.setItem(THEME_KEY, ThemePrefs.serialize(prefs));
    let cancelled = false;
    if (prefs.color === "custom") {
      readTheme().then(({ theme }) => { if (!cancelled) applyTheme(theme); }).catch(console.error);
    } else {
      clearTheme();
    }
    return () => { cancelled = true; };
  }, [prefs, hash]);
  const toggleFullscreen = () => {
    if (isTauri()) {
      invoke<boolean>("toggle_fullscreen").then(setFullscreen).catch(console.error);
    } else if (document.fullscreenElement) {
      document.exitFullscreen().then(() => setFullscreen(false)).catch(console.error);
    } else if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().then(() => setFullscreen(true)).catch(console.error);
    }
  };
  return (
    <ThemeContext.Provider value={{
      ...prefs, hash, fullscreenState, toggleFullscreen,
      switchColor: (color) => setPrefs(new ThemePrefs({ ...prefs, color })),
      switchFont: (font) => setPrefs(new ThemePrefs({ ...prefs, font })),
      refresh: () => setHash((value) => value + 1),
    }}>{children}</ThemeContext.Provider>
  );
}

export function ThemeControls() {
  const theme = useTheme();
  return <div className="desktop-controls">
    <label>Theme <select aria-label="Color theme" value={theme.color} onChange={(event) => theme.switchColor(event.target.value)}>
      {[...COLORS].filter(({ id }) => id !== "custom").map(({ id, name }) => <option key={id} value={id}>{name}</option>)}
    </select></label>
    <label>Font <select aria-label="Typing font" value={theme.font} onChange={(event) => theme.switchFont(event.target.value)}>
      {[...FONTS].map(({ id, name }) => <option key={id} value={id}>{name}</option>)}
    </select></label>
    <button onClick={theme.toggleFullscreen}>Fullscreen</button>
  </div>;
}
