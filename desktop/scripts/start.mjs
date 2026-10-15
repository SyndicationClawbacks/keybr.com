// Dependency-free dispatcher: npm start launches the desktop app, not the server.
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const repo = fileURLToPath(new URL("../../", import.meta.url));
console.log("[Keybr Desktop] npm start is launching the desktop app.");

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: repo,
    stdio: "inherit",
    env: { ...process.env, HUSKY: "0" },
  });
  if (result.error) {
    console.error(`[Keybr Desktop] Cannot run ${command}: ${result.error.message}`);
    process.exit(1);
  }
  if (result.signal) {
    console.error(`[Keybr Desktop] Launcher stopped by ${result.signal}.`);
    process.exit(result.signal === "SIGINT" ? 130 : 1);
  }
  if (result.status !== 0) {
    console.error(`[Keybr Desktop] Launcher failed (exit ${result.status ?? 1}). See the error above.`);
    process.exit(result.status ?? 1);
  }
}

switch (process.platform) {
  case "darwin":
    // An argument array keeps repository paths containing spaces intact.
    run("/bin/bash", [join(repo, "run-macos.sh")]);
    break;
  case "win32":
    // ExecutionPolicy applies only to this PowerShell process, not the machine.
    run("powershell.exe", [
      "-NoProfile", "-ExecutionPolicy", "Bypass", "-File",
      join(repo, "run-windows.ps1"),
    ]);
    break;
  case "linux":
    console.log("[Keybr Desktop] Linux source builds require Node 26.9+, Rust, GTK3 and WebKitGTK 4.1 development packages.");
    run("npm", ["ci", "--no-audit", "--no-fund"]);
    run("npm", ["install", "--prefix", "desktop", "--no-audit", "--no-fund"]);
    run("npm", ["--prefix", "desktop", "run", "dev"]);
    break;
  default:
    console.error(`[Keybr Desktop] Unsupported platform: ${process.platform}`);
    process.exit(1);
}
