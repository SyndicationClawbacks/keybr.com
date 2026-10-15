import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../dist");
if (!existsSync(resolve(root, "index.html"))) throw new Error("Run npm run build:web first.");
const csp = JSON.parse(readFileSync(resolve(here, "../src-tauri/tauri.conf.json"), "utf8")).app.security.csp;
const types = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json",
  ".svg": "image/svg+xml", ".png": "image/png", ".webp": "image/webp",
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif",
  ".woff": "font/woff", ".woff2": "font/woff2", ".ttf": "font/ttf",
  ".mp3": "audio/mpeg", ".ogg": "audio/ogg", ".wav": "audio/wav",
  ".data": "application/octet-stream", ".txt": "text/plain; charset=utf-8",
};
const server = createServer((request, response) => {
  try {
    if (!["GET", "HEAD"].includes(request.method)) {
      response.writeHead(405).end(); return;
    }
    const pathname = decodeURIComponent(new URL(request.url, "http://127.0.0.1").pathname);
    const path = resolve(root, `.${pathname === "/" ? "/index.html" : pathname}`);
    if (!path.startsWith(root + sep) || !statSync(path).isFile()) {
      response.writeHead(404).end(); return;
    }
    response.writeHead(200, {
      "Content-Type": types[extname(path)] || "application/octet-stream",
      "Content-Security-Policy": csp,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "no-store",
    });
    if (request.method === "HEAD") response.end();
    else createReadStream(path).pipe(response);
  } catch {
    response.writeHead(404).end();
  }
});
server.listen(Number(process.env.PORT || 1420), "127.0.0.1", () => {
  console.log("Desktop preview: http://127.0.0.1:1420 (loopback only; not used by the installed app)");
});
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => server.close());
