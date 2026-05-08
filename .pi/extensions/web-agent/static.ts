import { createReadStream, existsSync } from "node:fs";
import { stat } from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";
import { extname, relative, resolve, sep } from "node:path";

const CONTENT_TYPES: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ts": "text/plain; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".woff2": "font/woff2",
};

function contentTypeFor(path: string): string {
  return CONTENT_TYPES[extname(path)] ?? "application/octet-stream";
}

function resolveCandidate(staticRoot: string, pathname: string): string {
  const trimmed = pathname === "/" ? "/index.html" : pathname;
  const candidate = resolve(staticRoot, `.${trimmed}`);
  const root = resolve(staticRoot);
  const pathFromRoot = relative(root, candidate);
  if (pathFromRoot === ".." || pathFromRoot.startsWith(`..${sep}`)) {
    throw new Error("Path traversal blocked");
  }
  return candidate;
}

async function streamFile(
  res: ServerResponse,
  filePath: string,
  headers: Record<string, string>,
): Promise<void> {
  res.writeHead(200, {
    ...headers,
    "content-type": contentTypeFor(filePath),
  });

  await new Promise<void>((resolvePromise, rejectPromise) => {
    const stream = createReadStream(filePath);
    stream.on("error", rejectPromise);
    stream.on("end", () => resolvePromise());
    stream.pipe(res);
  });
}

export async function serveStaticRequest(
  req: IncomingMessage,
  res: ServerResponse,
  staticRoot: string,
  securityHeaders: Record<string, string>,
): Promise<boolean> {
  if (req.method !== "GET" && req.method !== "HEAD") {
    return false;
  }

  const url = new URL(req.url ?? "/", "http://127.0.0.1");
  if (url.pathname.startsWith("/api/") || url.pathname === "/health") {
    return false;
  }

  let candidate: string;
  try {
    candidate = resolveCandidate(staticRoot, url.pathname);
  } catch {
    res.writeHead(403, securityHeaders);
    res.end("Forbidden");
    return true;
  }

  const indexPath = resolve(staticRoot, "index.html");
  const filePath = existsSync(candidate) ? candidate : indexPath;
  const fileStat = await stat(filePath);
  if (!fileStat.isFile()) {
    return false;
  }

  await streamFile(res, filePath, securityHeaders);
  return true;
}
