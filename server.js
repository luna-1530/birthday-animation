import { createReadStream, statSync } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT) || 3000;
const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mp3": "audio/mpeg",
  ".mp4": "video/mp4",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webm": "video/webm",
  ".webp": "image/webp",
};

createServer((request, response) => {
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { Allow: "GET, HEAD" });
    response.end("Method Not Allowed");
    return;
  }

  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
  } catch {
    response.writeHead(400);
    response.end("Bad Request");
    return;
  }

  const requestedPath = pathname === "/" ? "index.html" : pathname.slice(1);
  const filePath = path.resolve(root, requestedPath);
  const relativePath = path.relative(root, filePath);
  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  let fileStats;
  try {
    fileStats = statSync(filePath);
  } catch (error) {
    if (error.code !== "ENOENT" && error.code !== "ENOTDIR") {
      response.writeHead(500);
      response.end("Internal Server Error");
      return;
    }
    response.writeHead(404);
    response.end("Not Found");
    return;
  }

  if (!fileStats.isFile()) {
    response.writeHead(404);
    response.end("Not Found");
    return;
  }

  response.writeHead(200, {
    "Content-Length": fileStats.size,
    "Content-Type": contentTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream",
  });
  if (request.method === "HEAD") {
    response.end();
  } else {
    createReadStream(filePath).pipe(response);
  }
}).listen(port, "localhost", () => {
  console.log(`Birthday animation server running at http://localhost:${port}`);
});
