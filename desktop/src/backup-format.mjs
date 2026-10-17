export const FORMAT = "keybr-desktop-backup";
export const MAX_BACKUP_BYTES = 64 * 1024 * 1024;
export const MAX_RESULTS = 500000;

/** Validate the envelope before decoding domain records or touching saved data. */
export function parseBackup(text) {
  if (typeof text !== "string" || new TextEncoder().encode(text).length > MAX_BACKUP_BYTES) {
    throw new Error("Backup is larger than the 64 MiB limit.");
  }
  const data = JSON.parse(text);
  if (!data || data.format !== FORMAT || data.version !== 1) {
    throw new Error("Not a supported Keybr Desktop backup (version 1 required).");
  }
  if (!Array.isArray(data.results) || data.results.length > MAX_RESULTS) {
    throw new Error("Invalid or excessively large result list.");
  }
  if (data.settings === null || typeof data.settings !== "object" || Array.isArray(data.settings)) {
    throw new Error("Invalid settings object.");
  }
  if (data.theme !== null && typeof data.theme !== "string") {
    throw new Error("Invalid theme preferences.");
  }
  return data;
}

export function makeBackup(results, settings, theme) {
  const text = JSON.stringify({ format: FORMAT, version: 1, createdAt: new Date().toISOString(), results, settings, theme });
  parseBackup(text);
  return text;
}

/** Duplicate imports are idempotent. The caller supplies canonical resultToJson records. */
export function uniqueNewRecords(existing, incoming) {
  const seen = new Set(existing.map((record) => JSON.stringify(record)));
  return incoming.filter((record) => {
    const key = JSON.stringify(record);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
