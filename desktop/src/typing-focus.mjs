// Keep focus recovery local to an actual lesson. Settings/demo text areas,
// navigation controls and native/web dialogs must retain their own focus.
export function installTypingFocus(workspace) {
  const doc = workspace.ownerDocument;
  const win = doc.defaultView;
  if (!win) return () => {};
  const selector = "[data-desktop-typing-page] [data-keybr-typing-area] textarea";
  let frame = 0;

  function availableInput() {
    for (const input of workspace.querySelectorAll(selector)) {
      const area = input.closest("[data-keybr-typing-area]");
      if (area.getClientRects().length && win.getComputedStyle(area).visibility !== "hidden") {
        return input;
      }
    }
    return null;
  }

  function backgroundHasFocus() {
    const active = doc.activeElement;
    return active === null || active === doc.body || active === doc.documentElement || active === workspace;
  }

  function hasOpenDialog() {
    return [...doc.querySelectorAll('[role="dialog"], [aria-modal="true"], dialog[open]')]
      .some((element) => element.getClientRects().length > 0);
  }

  function focusInput() {
    if (hasOpenDialog()) return false;
    const input = availableInput();
    if (!input) return false;
    input.focus({ preventScroll: true });
    return doc.activeElement === input;
  }

  function onKeyDown(event) {
    if (event.key !== "Enter" || event.defaultPrevented || event.isComposing ||
        event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
    if (backgroundHasFocus() && focusInput()) event.preventDefault();
  }

  function onPointerDown(event) {
    if (event.button !== 0 || event.defaultPrevented || !(event.target instanceof win.Element)) return;
    const area = event.target.closest("[data-keybr-typing-area]");
    if (!area || !workspace.contains(area) || !area.closest("[data-desktop-typing-page]")) return;
    // Do not interfere with editable fields, links or buttons within a lesson.
    if (event.target.closest('input, textarea, select, button, a, [contenteditable], [role="button"]')) return;
    if (focusInput()) event.preventDefault();
  }

  function onWindowFocus() {
    win.cancelAnimationFrame(frame);
    frame = win.requestAnimationFrame(() => {
      if (backgroundHasFocus()) focusInput();
    });
  }

  doc.addEventListener("keydown", onKeyDown);
  workspace.addEventListener("pointerdown", onPointerDown);
  win.addEventListener("focus", onWindowFocus);
  return () => {
    win.cancelAnimationFrame(frame);
    doc.removeEventListener("keydown", onKeyDown);
    workspace.removeEventListener("pointerdown", onPointerDown);
    win.removeEventListener("focus", onWindowFocus);
  };
}
