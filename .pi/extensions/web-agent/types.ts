import type {
  AgentSession,
  DefaultResourceLoader,
  SessionStats,
} from "@earendil-works/pi-coding-agent";

export interface WebAgentConfig {
  host: string;
  port: number;
  idleTtlMs: number;
  cleanupIntervalMs: number;
  token: string;
  tokenHeaderName: string;
  extensionName: string;
  staticRoot: string;
  securityHeaders: Record<string, string>;
}

export interface ResourceHealthIssue {
  kind: "extension" | "skill" | "prompt" | "theme" | "context";
  severity: "info" | "warning" | "error";
  message: string;
  path?: string;
}

export interface SlashCommandMeta {
  name: string;
  description?: string;
  source: "builtin" | "extension" | "prompt" | "skill";
}

export interface SessionMeta {
  sessionId: string;
  title?: string;
  cwd: string;
  model?: {
    provider: string;
    id: string;
  };
  thinkingLevel: string;
  usingSubscription: boolean;
  autoCompactEnabled: boolean;
  activeTools: string[];
  toolCount: number;
  slashCommands: SlashCommandMeta[];
  resourceCounts: {
    extensions: number;
    skills: number;
    prompts: number;
    themes: number;
    contextFiles: number;
  };
  resourceHealth: ResourceHealthIssue[];
  usage: SessionStats;
}

export interface WebSession {
  sessionId: string;
  session: AgentSession;
  resourceLoader: DefaultResourceLoader;
  createdAt: number;
  lastAccessAt: number;
}

export interface HealthResponse {
  ok: true;
  cwd: string;
  sessionCount: number;
  host: string;
  port: number;
  staticRoot: string;
}

export interface ChatRequestBody {
  sessionId: string;
  prompt: string;
  title?: string;
}

export interface TitleUpdateBody {
  title: string;
}

export interface ResetResponse {
  sessionId: string;
}

export type WebStreamEvent =
  | {
      type: "status";
      phase: "started" | "queued" | "aborted" | "done";
      sessionId: string;
      message?: string;
    }
  | {
      type: "thinking";
      delta: string;
    }
  | {
      type: "assistant_delta";
      delta: string;
    }
  | {
      type: "tool_start";
      toolCallId: string;
      toolName: string;
      summary: string;
      args?: unknown;
    }
  | {
      type: "tool_update";
      toolCallId: string;
      toolName: string;
      details: unknown;
    }
  | {
      type: "tool_end";
      toolCallId: string;
      toolName: string;
      ok: boolean;
      result?: unknown;
      error?: string;
    }
  | {
      type: "done";
      meta: Pick<
        SessionMeta,
        "sessionId" | "title" | "usage" | "thinkingLevel"
      >;
    }
  | {
      type: "error";
      message: string;
    };
