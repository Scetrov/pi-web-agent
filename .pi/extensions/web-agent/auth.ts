import { timingSafeEqual } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { WebAgentConfig } from "./types.js";

function readHeaderValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }
  return value ?? "";
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }
  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function applySecurityHeaders(
  res: ServerResponse,
  config: Pick<WebAgentConfig, "securityHeaders">,
): void {
  for (const [key, value] of Object.entries(config.securityHeaders)) {
    res.setHeader(key, value);
  }
}

export function isAuthorized(
  req: IncomingMessage,
  config: Pick<WebAgentConfig, "token" | "tokenHeaderName">,
): boolean {
  const headerName = config.tokenHeaderName.toLowerCase();
  const provided = readHeaderValue(req.headers[headerName]).trim();
  return provided.length > 0 && safeEqual(provided, config.token);
}

export function writeJson(
  res: ServerResponse,
  statusCode: number,
  body: unknown,
  config: Pick<WebAgentConfig, "securityHeaders">,
  extraHeaders: Record<string, string> = {},
): void {
  applySecurityHeaders(res, config);
  res.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    ...extraHeaders,
  });
  res.end(JSON.stringify(body));
}

export function writeText(
  res: ServerResponse,
  statusCode: number,
  body: string,
  config: Pick<WebAgentConfig, "securityHeaders">,
  extraHeaders: Record<string, string> = {},
): void {
  applySecurityHeaders(res, config);
  res.writeHead(statusCode, {
    "content-type": "text/plain; charset=utf-8",
    ...extraHeaders,
  });
  res.end(body);
}

export function writeUnauthorized(
  res: ServerResponse,
  config: Pick<WebAgentConfig, "securityHeaders">,
): void {
  writeJson(res, 401, { error: "Unauthorized" }, config);
}

export function writeNotFound(
  res: ServerResponse,
  config: Pick<WebAgentConfig, "securityHeaders">,
): void {
  writeJson(res, 404, { error: "Not found" }, config);
}

export function writeMethodNotAllowed(
  res: ServerResponse,
  allowed: string[],
  config: Pick<WebAgentConfig, "securityHeaders">,
): void {
  writeJson(res, 405, { error: "Method not allowed", allowed }, config, {
    allow: allowed.join(", "),
  });
}
