import { randomUUID } from "node:crypto";
import {
  createAgentSession,
  getAgentDir,
  SessionManager,
  type AgentSession,
  type DefaultResourceLoader,
} from "@earendil-works/pi-coding-agent";
import {
  createBrowserResourceLoader,
  type BrowserLoaderOptions,
} from "./browser-loader.js";
import type { WebSession } from "./types.js";

export interface WebSessionStoreOptions {
  cwd: string;
  agentDir?: string;
  idleTtlMs: number;
  cleanupIntervalMs: number;
  extensionEntryPath: string;
  createResourceLoader?: (
    options: BrowserLoaderOptions,
  ) => Promise<DefaultResourceLoader>;
  createSession?: (
    resourceLoader: DefaultResourceLoader,
  ) => Promise<AgentSession>;
}

export class WebSessionStore {
  private readonly sessions = new Map<string, WebSession>();
  private cleanupTimer: NodeJS.Timeout | undefined;
  private readonly cwd: string;
  private readonly agentDir: string;
  private readonly idleTtlMs: number;
  private readonly cleanupIntervalMs: number;
  private readonly extensionEntryPath: string;
  private readonly createResourceLoaderFn: (
    options: BrowserLoaderOptions,
  ) => Promise<DefaultResourceLoader>;
  private readonly createSessionFn: (
    resourceLoader: DefaultResourceLoader,
  ) => Promise<AgentSession>;

  constructor({
    cwd,
    agentDir = getAgentDir(),
    idleTtlMs,
    cleanupIntervalMs,
    extensionEntryPath,
    createResourceLoader = createBrowserResourceLoader,
    createSession,
  }: WebSessionStoreOptions) {
    this.cwd = cwd;
    this.agentDir = agentDir;
    this.idleTtlMs = idleTtlMs;
    this.cleanupIntervalMs = cleanupIntervalMs;
    this.extensionEntryPath = extensionEntryPath;
    this.createResourceLoaderFn = createResourceLoader;
    this.createSessionFn =
      createSession ??
      (async (resourceLoader) => {
        const { session } = await createAgentSession({
          cwd: this.cwd,
          agentDir: this.agentDir,
          resourceLoader,
          sessionManager: SessionManager.inMemory(this.cwd),
        });
        return session;
      });
  }

  get size(): number {
    return this.sessions.size;
  }

  startCleanup(): void {
    if (this.cleanupTimer) {
      return;
    }

    this.cleanupTimer = setInterval(() => {
      void this.disposeExpiredSessions();
    }, this.cleanupIntervalMs);
    this.cleanupTimer.unref?.();
  }

  async getOrCreate(sessionId: string): Promise<WebSession> {
    const existing = this.sessions.get(sessionId);
    if (existing) {
      this.touch(sessionId);
      return existing;
    }

    const created = await this.createWebSession(sessionId);
    this.sessions.set(sessionId, created);
    return created;
  }

  get(sessionId: string): WebSession | undefined {
    return this.sessions.get(sessionId);
  }

  touch(sessionId: string): void {
    const entry = this.sessions.get(sessionId);
    if (entry) {
      entry.lastAccessAt = Date.now();
    }
  }

  async createFreshSession(): Promise<WebSession> {
    const sessionId = `web_${randomUUID()}`;
    const session = await this.createWebSession(sessionId);
    this.sessions.set(sessionId, session);
    return session;
  }

  async resetSession(currentSessionId?: string): Promise<WebSession> {
    if (currentSessionId) {
      await this.disposeSession(currentSessionId);
    }
    return this.createFreshSession();
  }

  async abortSession(sessionId: string): Promise<boolean> {
    const entry = this.sessions.get(sessionId);
    if (!entry) {
      return false;
    }
    await entry.session.abort();
    entry.lastAccessAt = Date.now();
    return true;
  }

  async disposeSession(sessionId: string): Promise<boolean> {
    const entry = this.sessions.get(sessionId);
    if (!entry) {
      return false;
    }
    entry.session.dispose();
    this.sessions.delete(sessionId);
    return true;
  }

  async dispose(): Promise<void> {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
    for (const sessionId of [...this.sessions.keys()]) {
      await this.disposeSession(sessionId);
    }
  }

  private async createWebSession(sessionId: string): Promise<WebSession> {
    const resourceLoader = await this.createResourceLoaderFn({
      cwd: this.cwd,
      agentDir: this.agentDir,
      extensionEntryPath: this.extensionEntryPath,
    });
    const session = await this.createSessionFn(resourceLoader);
    const now = Date.now();

    return {
      sessionId,
      session,
      resourceLoader,
      createdAt: now,
      lastAccessAt: now,
    };
  }

  private async disposeExpiredSessions(): Promise<void> {
    const cutoff = Date.now() - this.idleTtlMs;
    for (const [sessionId, entry] of this.sessions) {
      if (entry.lastAccessAt < cutoff) {
        await this.disposeSession(sessionId);
      }
    }
  }
}
