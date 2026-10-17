/** Opaque custom-protocol origins must be compared by components, not origin="null". */
export function isLocalAsset(value, base) {
  try {
    const url = new URL(value, base);
    const local = new URL(base);
    return ["tauri:", "http:", "https:"].includes(local.protocol) &&
      url.protocol === local.protocol && url.hostname === local.hostname &&
      url.port === local.port && !url.username && !url.password &&
      !url.pathname.startsWith("/_/");
  } catch {
    return false;
  }
}

export function isNativeIpc(value) {
  try {
    const url = new URL(value);
    return !url.username && !url.password && !url.port &&
      ((url.protocol === "ipc:" && url.hostname === "localhost") ||
       (url.protocol === "http:" && url.hostname === "ipc.localhost"));
  } catch {
    return false;
  }
}

export function installNetworkPolicy() {
  const base = window.location.href;
  const allowed = (value) => isLocalAsset(value, base) || isNativeIpc(value);
  const blocked = () => new TypeError("Network access is disabled in Keybr Desktop.");
  const originalFetch = window.fetch.bind(window);
  window.fetch = (input, init) => {
    const url = input instanceof Request ? input.url : String(input);
    return allowed(url) ? originalFetch(input, init) : Promise.reject(blocked());
  };
  const originalOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url, ...args) {
    if (!allowed(String(url))) throw blocked();
    return Reflect.apply(originalOpen, this, [method, url, ...args]);
  };
  window.WebSocket = class { constructor() { throw blocked(); } };
  window.EventSource = class { constructor() { throw blocked(); } };
  Object.defineProperty(navigator, "sendBeacon", { configurable: true, value: () => false });
  window.open = () => null;
  document.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target.closest("a[href]") : null;
    if (!target) return;
    if (!isLocalAsset(target.href, base) || target.hasAttribute("download")) {
      event.preventDefault();
      window.dispatchEvent(new CustomEvent("desktop-offline-link"));
      return;
    }
    const url = new URL(target.href, base);
    const current = new URL(base);
    if (url.pathname !== current.pathname && !url.hash) {
      event.preventDefault();
      if (["/", "/profile", "/typing-test", "/help", "/backup"].includes(url.pathname)) {
        window.location.hash = `#${url.pathname}`;
      } else {
        window.dispatchEvent(new CustomEvent("desktop-offline-link"));
      }
    }
  }, true);
}
