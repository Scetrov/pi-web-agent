export interface ResourceHealthIssue {
  kind: "extension" | "skill" | "prompt" | "theme" | "context";
  severity: "info" | "warning" | "error";
  message: string;
  path?: string;
}

export interface SessionUsage {
  sessionFile?: string;
  sessionId: string;
  userMessages: number;
  assistantMessages: number;
  toolCalls: number;
  toolResults: number;
  totalMessages: number;
  tokens: {
    input: number;
    output: number;
    cacheRead: number;
    cacheWrite: number;
    total: number;
  };
  cost: number;
  contextUsage?: {
    tokens: number | null;
    contextWindow: number;
    percent: number | null;
  };
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
  usage: SessionUsage;
}

export interface HealthResponse {
  ok: true;
  cwd: string;
  sessionCount: number;
  host: string;
  port: number;
  staticRoot: string;
}

export interface TranscriptMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export interface ToolRunState {
  toolCallId: string;
  toolName: string;
  summary: string;
  status: "running" | "done" | "error";
  args?: unknown;
  details?: unknown;
  error?: string;
}

export interface TodoTaskState {
  id: number;
  subject: string;
  status: "pending" | "in_progress" | "completed" | "deleted";
  description?: string;
  activeForm?: string;
  owner?: string;
  blockedBy?: number[];
}

export interface TodoModuleState {
  tasks: TodoTaskState[];
  nextId?: number;
}

export interface SubagentState {
  toolCallId: string;
  agentId?: string;
  description: string;
  subagentType: string;
  status: string;
  runInBackground: boolean;
  toolUses?: number;
  tokens?: string;
  durationMs?: number;
  turnCount?: number;
  maxTurns?: number;
  lastUpdate?: string;
}

export interface ModuleActivityState {
  todos: TodoModuleState;
  subagents: SubagentState[];
}

export interface CurrentRun {
  assistantText: string;
  thinkingText: string;
  status?: string;
  tools: ToolRunState[];
  error?: string;
}

export type StreamEvent =
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
