import { Result } from "@keybr/result";
import { resultFromJson, resultToJson } from "@keybr/result-io";
import { Settings, useSettings } from "@keybr/settings";
import { ThemePrefs } from "@keybr/themes";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { useState } from "react";
import { PersistentResultStorage } from "../../packages/keybr-result-loader/lib/internal/local.ts";
import { openSettingsStorage } from "../../packages/keybr-settings-loader/lib/internal/storage.ts";
import { makeBackup, parseBackup, uniqueNewRecords } from "./backup-format.mjs";
import { THEME_KEY } from "./theme.tsx";

type Preview = { results: Result[]; settings: Record<string, unknown>; theme: string | null };

export function BackupPage() {
  const { settings } = useSettings();
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [restoreSettings, setRestoreSettings] = useState(false);

  const task = async (work: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    setStatus("");
    try { await work(); } catch (error) { setStatus(String(error)); } finally { setBusy(false); }
  };
  const requireDesktop = () => {
    if (!isTauri()) throw new Error("Native file dialogs are available in the desktop app, not the browser preview.");
  };
  const exportBackup = () => task(async () => {
    requireDesktop();
    const results = await new PersistentResultStorage().load();
    const data = makeBackup(results.map(resultToJson), settings.toJSON(), localStorage.getItem(THEME_KEY));
    const saved = await invoke<boolean>("save_backup", { data });
    setStatus(saved ? "Backup saved. Copy it to another computer and choose Import backup there." : "Export cancelled.");
  });
  const importBackup = () => task(async () => {
    requireDesktop();
    const text = await invoke<string | null>("load_backup");
    if (text === null) return;
    const data = parseBackup(text);
    const results = data.results.map((value: unknown) => resultFromJson(value as never));
    if (!results.every(Result.isValid)) throw new Error("Backup contains invalid typing results; nothing was imported.");
    // Check serialization before presenting an import that cannot be applied.
    new Settings(data.settings).toJSON();
    setPreview({ results, settings: data.settings, theme: data.theme });
  });
  const mergeBackup = () => task(async () => {
    if (!preview) return;
    const storage = new PersistentResultStorage();
    const existing = await storage.load();
    const newRecords = uniqueNewRecords(existing.map(resultToJson), preview.results.map(resultToJson));
    // One IndexedDB transaction. Never clear existing history when importing.
    await storage.append(newRecords.map((record: unknown) => resultFromJson(record as never)));
    if (restoreSettings) {
      await openSettingsStorage(null, null).store(new Settings(preview.settings));
      if (preview.theme !== null) localStorage.setItem(THEME_KEY, ThemePrefs.serialize(ThemePrefs.deserialize(preview.theme)));
    }
    window.location.reload();
  });

  return <section className="desktop-about" data-testid="backup-page">
    <h1>Backup &amp; about</h1>
    <p>Lessons and progress stay on this device. Export a backup to keep a second copy or move between macOS, Linux, and Windows.</p>
    <p>Import merges history without deleting existing results. Importing the same backup twice does not duplicate its records.</p>
    <div className="desktop-actions">
      <button disabled={busy} onClick={exportBackup}>Export backup</button>
      <button disabled={busy || preview !== null} onClick={importBackup}>Import backup</button>
    </div>
    {preview && <div className="desktop-import-preview">
      <h2>Review import</h2>
      <p>{preview.results.length} results in this backup. Existing history will be retained.</p>
      <label><input type="checkbox" checked={restoreSettings} onChange={(event) => setRestoreSettings(event.target.checked)} /> Also replace lesson settings and theme preferences</label>
      <div className="desktop-actions">
        <button disabled={busy} onClick={mergeBackup}>Merge this backup</button>
        <button disabled={busy} onClick={() => setPreview(null)}>Cancel</button>
      </div>
    </div>}
    <p role="status">{busy ? "Working with your local backup…" : status}</p>
    <h2>Offline edition · 0.1.0</h2>
    <p>This is an independent desktop adaptation of Keybr, not an official desktop release. It reuses the upstream lesson engine, practice screen, statistics, typing test, and help.</p>
    <p>The interface is English; the bundled upstream keyboard languages and lesson content remain available through practice settings. Accounts, high scores, multiplayer, payments, cloud sync, advertisements, and analytics are intentionally absent.</p>
    <p>Source: <code>github.com/SyndicationClawbacks/keybr.com</code><br />Upstream: <code>github.com/aradzie/keybr.com</code></p>
    <p>The original license is retained in the repository and bundled as <code>LICENSE.txt</code>. No automatic update checks are made.</p>
    <p>Backups contain typing history and settings as plain JSON, not encrypted data. Keep them somewhere appropriate. Website-account history is not automatically imported.</p>
  </section>;
}
