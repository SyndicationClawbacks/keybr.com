import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { isLocalAsset, isNativeIpc } from "../src/network-policy.mjs";
import { FORMAT, makeBackup, parseBackup, uniqueNewRecords } from "../src/backup-format.mjs";

test("relative and absolute local assets are accepted on every Tauri protocol", () => {
  for (const base of ["tauri://localhost/index.html", "http://tauri.localhost/", "https://tauri.localhost/", "http://127.0.0.1:1420/"]) {
    assert.ok(isLocalAsset("./assets/model.data", base));
    assert.ok(isLocalAsset("#/profile", base));
    assert.ok(isLocalAsset(new URL("assets/font.woff2", base).href, base));
  }
});

test("remote, credential-bearing, server API, and opaque-origin tricks are denied", () => {
  const base = "tauri://localhost/index.html";
  for (const value of [
    "https://www.keybr.com", "https://google-analytics.com/x", "tauri://evil/a",
    "tauri://localhost.evil/a", "tauri://user@localhost/a", "tauri://localhost:123/a",
    "http://localhost/a", "file:///etc/passwd", "data:text/html,x", "javascript:alert(1)",
    "//evil/a", "/_/sync/settings",
  ]) assert.equal(isLocalAsset(value, base), false, value);
});

test("only Tauri IPC endpoints are exempted", () => {
  assert.ok(isNativeIpc("ipc://localhost/save_backup"));
  assert.ok(isNativeIpc("http://ipc.localhost/save_backup"));
  for (const value of ["ipc://evil/x", "https://ipc.localhost/x", "http://ipc.localhost.evil/", "http://ipc.localhost:8080/", "https://keybr.com/", "http://user@ipc.localhost/"]) {
    assert.equal(isNativeIpc(value), false, value);
  }
});

test("backup envelope round-trips without losing history or preferences", () => {
  const text = makeBackup([{ sample: 1 }], { layout: "test" }, '{"color":"test"}');
  const data = parseBackup(text);
  assert.equal(data.format, FORMAT);
  assert.deepEqual(data.results, [{ sample: 1 }]);
  assert.deepEqual(data.settings, { layout: "test" });
  assert.equal(data.theme, '{"color":"test"}');
  assert.equal(data.version, 1);
});

test("unsupported or malformed backups are rejected before any storage operation", () => {
  const valid = { format: FORMAT, version: 1, results: [], settings: {}, theme: null };
  for (const value of [null, {}, { ...valid, version: 2 }, { ...valid, results: {} }, { ...valid, settings: [] }, { ...valid, theme: {} }]) {
    assert.throws(() => parseBackup(JSON.stringify(value)));
  }
  assert.throws(() => parseBackup("not json"));
  assert.throws(() => parseBackup(123));
  assert.throws(() => parseBackup("x".repeat(64 * 1024 * 1024 + 1)));
});

test("merging a backup twice is idempotent and preserves existing records", () => {
  const existing = [{ n: 1 }];
  const incoming = [{ n: 1 }, { n: 2 }, { n: 2 }, { n: 3 }];
  const fresh = uniqueNewRecords(existing, incoming);
  assert.deepEqual(fresh, [{ n: 2 }, { n: 3 }]);
  assert.deepEqual(uniqueNewRecords([...existing, ...fresh], incoming), []);
  assert.deepEqual(existing, [{ n: 1 }]);
});

test("production config embeds files, denies remote content, and targets Monterey", () => {
  const config = JSON.parse(readFileSync(new URL("../src-tauri/tauri.conf.json", import.meta.url)));
  assert.equal(config.build.frontendDist, "../dist");
  assert.equal(config.build.devUrl, undefined);
  assert.equal(config.bundle.macOS.minimumSystemVersion, "12.0");
  assert.equal(config.bundle.windows.webviewInstallMode.type, "offlineInstaller");
  assert.match(config.app.security.csp, /default-src 'none'/);
  assert.match(config.app.security.csp, /form-action 'none'/);
  assert.doesNotMatch(config.app.security.csp, /https?:\/\/(?:www\.)?keybr/);
  const capabilities = JSON.parse(readFileSync(new URL("../src-tauri/capabilities/main.json", import.meta.url)));
  assert.equal(capabilities.remote, undefined);
  assert.deepEqual(capabilities.permissions, ["core:default"]);
});
