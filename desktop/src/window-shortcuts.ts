import { isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";

export function installWindowShortcuts() {
  // Leave browser preview shortcuts to the browser.
  if (!isTauri()) return;
  const isMac = /Mac/i.test(navigator.platform);
  window.addEventListener(
    "keydown",
    (event) => {
      if (
        event.key.toLowerCase() !== "w" ||
        event.altKey ||
        event.shiftKey ||
        event.isComposing ||
        (isMac
          ? !event.metaKey || event.ctrlKey
          : !event.ctrlKey || event.metaKey)
      ) {
        return;
      }
      // Capture before the lesson input records or consumes the keystroke.
      event.preventDefault();
      event.stopImmediatePropagation();
      if (!event.repeat) {
        // Use the same close-request lifecycle as the native window button.
        void getCurrentWindow().close().catch(console.error);
      }
    },
    { capture: true },
  );
}
