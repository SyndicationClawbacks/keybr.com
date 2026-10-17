// A release app plus a small, per-user installation script. No installer generator.
import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const desktop = fileURLToPath(new URL("../", import.meta.url));
const repo = dirname(desktop.slice(0, -1));
const native = process.argv.includes("--native");
if (process.argv.slice(2).some((arg) => arg !== "--native")) {
  throw new Error("Usage: npm run build:app [-- --native]");
}
const platform = process.platform;
if (!["darwin", "win32", "linux"].includes(platform))
  throw new Error("Unsupported platform");
const universal = platform === "darwin" && !native;
const label =
  platform === "darwin"
    ? `macOS-${universal ? "universal" : process.arch}`
    : `${platform === "win32" ? "Windows" : "Linux"}-${process.arch}`;
const releases = join(desktop, "releases");
const release = join(releases, `Keybr-Desktop-${label}`);
const env = { ...process.env, MACOSX_DEPLOYMENT_TARGET: "12.0" };
function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: desktop,
    stdio: "inherit",
    env,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}
function tauri(...args) {
  run(process.execPath, [
    join(desktop, "node_modules/@tauri-apps/cli/tauri.js"),
    ...args,
  ]);
}
if (universal)
  run("rustup", [
    "target",
    "add",
    "aarch64-apple-darwin",
    "x86_64-apple-darwin",
  ]);
tauri("icon", "icon.svg", "--output", "src-tauri/icons");
const args = platform === "darwin" ? ["--bundles", "app"] : ["--no-bundle"];
if (universal) args.push("--target", "universal-apple-darwin");
tauri("build", ...args, "--", "--locked");
mkdirSync(release, { recursive: true });
const output = join(
  desktop,
  "src-tauri/target",
  ...(universal ? ["universal-apple-darwin"] : []),
  "release",
);
if (platform === "darwin") {
  // ditto retains the bundle's executable bits, symlinks and signature.
  // Avoid overlaying a rebuilt bundle onto obsolete resources from an older build.
  // Preserve the previous output beside it instead of deleting it.
  const { existsSync } = await import("node:fs");
  if (existsSync(join(release, "Keybr Desktop.app"))) {
    const previous = mkdtempSync(join(releases, ".previous-mac-app-"));
    renameSync(
      join(release, "Keybr Desktop.app"),
      join(previous, "Keybr Desktop.app"),
    );
  }
  run("ditto", [
    join(output, "bundle/macos/Keybr Desktop.app"),
    join(release, "Keybr Desktop.app"),
  ]);
} else {
  const binary = platform === "win32" ? "keybr-desktop.exe" : "keybr-desktop";
  copyFileSync(join(output, binary), join(release, binary));
  copyFileSync(
    join(
      desktop,
      "src-tauri/icons",
      platform === "win32" ? "icon.ico" : "128x128@2x.png",
    ),
    join(release, platform === "win32" ? "icon.ico" : "keybr.png"),
  );
}
const installer =
  platform === "win32"
    ? "install-windows.ps1"
    : platform === "darwin"
      ? "install-macos.sh"
      : "install-linux.sh";
copyFileSync(join(repo, installer), join(release, installer));
if (platform === "win32") {
  copyFileSync(
    join(repo, "Install Keybr.cmd"),
    join(release, "Install Keybr.cmd"),
  );
}
copyFileSync(join(repo, "LICENSE"), join(release, "LICENSE.txt"));
writeFileSync(
  join(release, "READ-ME.txt"),
  `Keybr Desktop — ${label}\n\n${platform === "win32" ? "Double-click Install Keybr.cmd. Press Enter for the normal per-user app folder,\nor type a different installation folder when asked. Then open Keybr Desktop from Start.\nAlternatively run: powershell -NoProfile -ExecutionPolicy Bypass -File .\\install-windows.ps1" : `Run: bash ${installer}`}\n\nQuit Keybr before updating. Progress is kept in the app's data directory.\nThis folder includes the whole app. Node and Rust are only needed to build it.\nAfter installation, the source and extracted release folders can be removed.\nKeep the installed app folder and its separate app data.\nSource: https://github.com/SyndicationClawbacks/keybr.com/tree/desktop/tauri-offline\n`,
);
if (platform !== "win32") {
  run("tar", [
    "-czf",
    `${release}.tar.gz`,
    "-C",
    dirname(release),
    `Keybr-Desktop-${label}`,
  ]);
}
console.log(`\nReady to install: ${release}\n`);
