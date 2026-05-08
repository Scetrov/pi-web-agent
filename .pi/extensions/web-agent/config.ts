import { randomBytes } from "node:crypto";
import { resolve } from "node:path";
import type { WebAgentConfig } from "./types.js";

const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 4317;
const DEFAULT_IDLE_TTL_MS = 60 * 60 * 1000;
const DEFAULT_CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
const DEFAULT_TOKEN_HEADER = "x-pi-web-token";
const DEFAULT_EXTENSION_NAME = "web-agent";

function readPositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function resolveToken(value: string | undefined): string {
  return value?.trim() || randomBytes(24).toString("hex");
}

function buildContentSecurityPolicy(): string {
  return [
    "default-src 'self'",
    "base-uri 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "style-src 'self' 'unsafe-inline'",
    "script-src 'self'",
    "connect-src 'self'",
  ].join("; ");
}

export function buildWebAgentConfig(
  cwd: string,
  env: NodeJS.ProcessEnv = process.env,
): WebAgentConfig {
  const host = env.PI_WEB_HOST?.trim() || DEFAULT_HOST;
  const port = readPositiveInt(env.PI_WEB_PORT, DEFAULT_PORT);
  const idleTtlMs = readPositiveInt(
    env.PI_WEB_IDLE_TTL_MS,
    DEFAULT_IDLE_TTL_MS,
  );
  const cleanupIntervalMs = readPositiveInt(
    env.PI_WEB_CLEANUP_INTERVAL_MS,
    DEFAULT_CLEANUP_INTERVAL_MS,
  );
  const tokenHeaderName =
    env.PI_WEB_TOKEN_HEADER?.trim().toLowerCase() || DEFAULT_TOKEN_HEADER;
  const token = resolveToken(env.PI_WEB_TOKEN);
  const extensionName =
    env.PI_WEB_EXTENSION_NAME?.trim() || DEFAULT_EXTENSION_NAME;
  const staticRoot = resolve(
    cwd,
    env.PI_WEB_STATIC_ROOT?.trim() || "web/pi-web-ui/dist",
  );

  return {
    host,
    port,
    idleTtlMs,
    cleanupIntervalMs,
    token,
    tokenHeaderName,
    extensionName,
    staticRoot,
    securityHeaders: {
      "cache-control": "no-store, max-age=0",
      "content-security-policy": buildContentSecurityPolicy(),
      "x-frame-options": "DENY",
      "referrer-policy": "no-referrer",
      "x-content-type-options": "nosniff",
    },
  };
}
