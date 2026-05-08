import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { fileURLToPath } from "node:url";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import {
  isAuthorized,
  writeJson,
  writeMethodNotAllowed,
  writeNotFound,
  writeUnauthorized,
} from "./auth.js";
import { buildWebAgentConfig } from "./config.js";
import { buildSessionMeta } from "./meta.js";
import { serializeEvent, WebProtocolTranslator } from "./protocol.js";
import { WebSessionStore } from "./session-store.js";
import { serveStaticRequest } from "./static.js";
import type {
  ChatRequestBody,
  HealthResponse,
  ResetResponse,
  WebAgentConfig,
  WebStreamEvent,
} from "./types.js";

const extensionEntryPath = fileURLToPath(import.meta.url);

type TitleRequestBody = {
  sessionId: string;
  title: string;
};

type AbortRequestBody = {
  sessionId: string;
};

type ResetRequestBody = {
  sessionId?: string;
};

async function readJsonBody<T>(req: IncomingMessage): Promise<T> {
  const chunks: Buffer[] = [];
  let total = 0;

  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buffer.length;
    if (total > 1024 * 1024) {
      throw new Error("Request body too large");
    }
    chunks.push(buffer);
  }

  const text = Buffer.concat(chunks).toString("utf8").trim();
  return text ? (JSON.parse(text) as T) : ({} as T);
}

function writeStreamHeaders(res: ServerResponse, config: WebAgentConfig): void {
  res.writeHead(200, {
    ...config.securityHeaders,
    "content-type": "application/x-ndjson; charset=utf-8",
    connection: "keep-alive",
    "x-accel-buffering": "no",
  });
  res.flushHeaders?.();
}

export default function webAgentExtension(pi: ExtensionAPI): void {
  let server: ReturnType<typeof createServer> | undefined;
  let store: WebSessionStore | undefined;
  let config: WebAgentConfig | undefined;
  let currentCwd = process.cwd();

  async function handleApi(
    req: IncomingMessage,
    res: ServerResponse,
  ): Promise<void> {
    if (!config || !store) {
      writeJson(
        res,
        503,
        { error: "Web agent not ready" },
        { securityHeaders: {} },
      );
      return;
    }

    const url = new URL(req.url ?? "/", `http://${config.host}:${config.port}`);

    if (url.pathname === "/health") {
      const body: HealthResponse = {
        ok: true,
        cwd: currentCwd,
        sessionCount: store.size,
        host: config.host,
        port: config.port,
        staticRoot: config.staticRoot,
      };
      writeJson(res, 200, body, config);
      return;
    }

    if (url.pathname.startsWith("/api/") && !isAuthorized(req, config)) {
      writeUnauthorized(res, config);
      return;
    }

    if (url.pathname === "/api/session/meta") {
      if (req.method !== "GET") {
        writeMethodNotAllowed(res, ["GET"], config);
        return;
      }
      const requestedSessionId = url.searchParams.get("sessionId")?.trim();
      const entry = requestedSessionId
        ? await store.getOrCreate(requestedSessionId)
        : await store.createFreshSession();
      writeJson(res, 200, buildSessionMeta(entry, currentCwd), config);
      return;
    }

    if (url.pathname === "/api/session/title") {
      if (req.method !== "POST") {
        writeMethodNotAllowed(res, ["POST"], config);
        return;
      }
      const body = await readJsonBody<TitleRequestBody>(req);
      const entry = await store.getOrCreate(body.sessionId);
      entry.session.setSessionName(body.title.trim());
      writeJson(res, 200, buildSessionMeta(entry, currentCwd), config);
      return;
    }

    if (url.pathname === "/api/chat/abort") {
      if (req.method !== "POST") {
        writeMethodNotAllowed(res, ["POST"], config);
        return;
      }
      const body = await readJsonBody<AbortRequestBody>(req);
      const aborted = await store.abortSession(body.sessionId);
      writeJson(res, 200, { ok: aborted }, config);
      return;
    }

    if (url.pathname === "/api/session/reset") {
      if (req.method !== "POST") {
        writeMethodNotAllowed(res, ["POST"], config);
        return;
      }
      const body = await readJsonBody<ResetRequestBody>(req);
      const next = await store.resetSession(body.sessionId);
      const payload: ResetResponse = { sessionId: next.sessionId };
      writeJson(res, 200, payload, config);
      return;
    }

    if (url.pathname === "/api/chat/stream") {
      if (req.method !== "POST") {
        writeMethodNotAllowed(res, ["POST"], config);
        return;
      }

      const body = await readJsonBody<ChatRequestBody>(req);
      const entry = await store.getOrCreate(body.sessionId);
      if (body.title?.trim()) {
        entry.session.setSessionName(body.title.trim());
      }

      writeStreamHeaders(res, config);
      const translator = new WebProtocolTranslator(entry.sessionId, () => {
        const meta = buildSessionMeta(entry, currentCwd);
        return {
          sessionId: meta.sessionId,
          title: meta.title,
          usage: meta.usage,
          thinkingLevel: meta.thinkingLevel,
        };
      });

      const writeEvent = (event: WebStreamEvent): void => {
        if (!res.writableEnded) {
          res.write(serializeEvent(event));
        }
      };

      writeEvent(translator.buildStartEvent());
      let closed = false;
      const unsubscribe = entry.session.subscribe((event) => {
        store?.touch(entry.sessionId);
        for (const translated of translator.translate(event)) {
          writeEvent(translated);
        }
      });

      const cleanup = async (abort: boolean): Promise<void> => {
        if (closed) {
          return;
        }
        closed = true;
        unsubscribe();
        if (abort) {
          await entry.session.abort().catch(() => undefined);
        }
        if (!res.writableEnded) {
          res.end();
        }
      };

      req.on("aborted", () => {
        void cleanup(true);
      });
      res.on("close", () => {
        if (!res.writableEnded) {
          void cleanup(true);
        }
      });

      try {
        await entry.session.prompt(body.prompt);
        store.touch(entry.sessionId);
        await cleanup(false);
      } catch (error) {
        writeEvent({
          type: "error",
          message: error instanceof Error ? error.message : String(error),
        });
        await cleanup(false);
      }
      return;
    }

    const served = await serveStaticRequest(
      req,
      res,
      config.staticRoot,
      config.securityHeaders,
    );
    if (!served) {
      writeNotFound(res, config);
    }
  }

  pi.on("session_start", async (_event, ctx) => {
    if (server) {
      return;
    }

    currentCwd = ctx.cwd;
    config = buildWebAgentConfig(currentCwd);
    store = new WebSessionStore({
      cwd: currentCwd,
      idleTtlMs: config.idleTtlMs,
      cleanupIntervalMs: config.cleanupIntervalMs,
      extensionEntryPath,
    });
    store.startCleanup();

    server = createServer((req, res) => {
      void handleApi(req, res).catch((error) => {
        if (!config) {
          res.statusCode = 500;
          res.end("Web agent unavailable");
          return;
        }
        writeJson(
          res,
          500,
          { error: error instanceof Error ? error.message : String(error) },
          config,
        );
      });
    });

    const listenError = await new Promise<Error | null>((resolve) => {
      server!.once("error", (err: NodeJS.ErrnoException) => {
        server = undefined;
        if (err.code === "EADDRINUSE") {
          resolve(
            new Error(
              `Port ${config!.port} is already in use. ` +
              `Stop the existing process or change the port via PI_WEB_PORT.`,
            ),
          );
        } else {
          resolve(err instanceof Error ? err : new Error(String(err)));
        }
      });
      server!.listen(config!.port, config!.host, () => resolve(null));
    });

    if (listenError) {
      ctx.ui.notify(`Web Agent failed to start: ${listenError.message}`, "error");
      store?.dispose();
      store = undefined;
      config = undefined;
      return;
    }

    ctx.ui.setStatus(
      "web-agent",
      ctx.ui.theme.fg("accent", `web ${config.host}:${config.port}`),
    );
    ctx.ui.setWidget("web-agent", [
      `URL: http://${config.host}:${config.port}?token=${config.token}`,
    ]);
    ctx.ui.notify(
      `Pi Web Agent listening at http://${config.host}:${config.port}?token=${config.token}`,
      "info",
    );
  });

  pi.on("session_shutdown", async (_event, ctx) => {
    ctx.ui.setStatus("web-agent", undefined);
    ctx.ui.setWidget("web-agent", undefined);
    await store?.dispose();
    store = undefined;

    if (server) {
      await new Promise<void>((resolvePromise) =>
        server!.close(() => resolvePromise()),
      );
      server = undefined;
    }
  });
}
