import type {
  ModuleActivityState,
  StreamEvent,
  SubagentState,
  TodoModuleState,
  TodoTaskState,
} from "@/types/chat";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toToolEnvelope(value: unknown): { content?: unknown; details?: unknown } {
  if (isRecord(value) && ("content" in value || "details" in value)) {
    return {
      content: value.content,
      details: value.details,
    };
  }
  return { details: value };
}

function extractTextContent(value: unknown): string | undefined {
  if (typeof value === "string") {
    return value;
  }

  if (!Array.isArray(value)) {
    return undefined;
  }

  const text = value
    .map((entry) => {
      if (!isRecord(entry) || entry.type !== "text" || typeof entry.text !== "string") {
        return undefined;
      }
      return entry.text;
    })
    .filter((entry): entry is string => Boolean(entry))
    .join("\n");

  return text || undefined;
}

function normalizeTodoTask(value: unknown): TodoTaskState | undefined {
  if (!isRecord(value) || typeof value.id !== "number" || typeof value.subject !== "string") {
    return undefined;
  }

  const status =
    value.status === "pending" ||
    value.status === "in_progress" ||
    value.status === "completed" ||
    value.status === "deleted"
      ? value.status
      : "pending";

  return {
    id: value.id,
    subject: value.subject,
    status,
    description: typeof value.description === "string" ? value.description : undefined,
    activeForm: typeof value.activeForm === "string" ? value.activeForm : undefined,
    owner: typeof value.owner === "string" ? value.owner : undefined,
    blockedBy: Array.isArray(value.blockedBy)
      ? value.blockedBy.filter((entry): entry is number => typeof entry === "number")
      : undefined,
  };
}

function extractTodoModule(value: unknown): TodoModuleState | undefined {
  if (!isRecord(value) || !Array.isArray(value.tasks)) {
    return undefined;
  }

  const tasks = value.tasks
    .map((task) => normalizeTodoTask(task))
    .filter((task): task is TodoTaskState => Boolean(task));

  return {
    tasks,
    nextId: typeof value.nextId === "number" ? value.nextId : undefined,
  };
}

function subagentStatusRank(status: string): number {
  switch (status) {
    case "running":
    case "launching":
    case "background":
    case "waiting":
      return 0;
    case "steered":
      return 1;
    case "completed":
      return 2;
    case "wrapped_up":
      return 3;
    case "error":
    case "failed":
      return 4;
    default:
      return 5;
  }
}

function sortSubagents(subagents: SubagentState[]): SubagentState[] {
  return [...subagents].sort((left, right) => {
    const statusDiff = subagentStatusRank(left.status) - subagentStatusRank(right.status);
    if (statusDiff !== 0) {
      return statusDiff;
    }

    const leftDuration = left.durationMs ?? 0;
    const rightDuration = right.durationMs ?? 0;
    return rightDuration - leftDuration;
  });
}

function upsertSubagent(
  subagents: SubagentState[],
  next: SubagentState,
): SubagentState[] {
  const index = subagents.findIndex(
    (entry) =>
      (next.agentId && entry.agentId === next.agentId) ||
      entry.toolCallId === next.toolCallId,
  );

  if (index === -1) {
    return sortSubagents([...subagents, next]);
  }

  const clone = [...subagents];
  clone[index] = { ...clone[index], ...next };
  return sortSubagents(clone);
}

function parseSubagentSummary(text: string): Partial<SubagentState> {
  const lines = text.split(/\r?\n/);
  const header = lines[0] ?? "";
  const meta = lines[1] ?? "";
  const descriptionLine = lines.find((line) => line.startsWith("Description:"));

  const agentId = header.match(/^Agent:\s+(.+)$/)?.[1]?.trim();
  const type = meta.match(/Type:\s*([^|]+?)(?:\s*\||$)/)?.[1]?.trim();
  const status = meta.match(/Status:\s*([^|]+?)(?:\s*\||$)/)?.[1]?.trim();
  const toolUses = Number(meta.match(/Tool uses:\s*(\d+)/)?.[1] ?? "");
  const tokens = meta.match(/\|\s*([^|]*token)(?:\s*\||$)/)?.[1]?.trim();
  const duration = meta.match(/Duration:\s*([0-9.]+)s/)?.[1];

  return {
    agentId,
    subagentType: type,
    status,
    toolUses: Number.isFinite(toolUses) ? toolUses : undefined,
    tokens,
    durationMs: duration ? Math.round(Number(duration) * 1000) : undefined,
    description: descriptionLine?.replace(/^Description:\s*/, "").trim(),
    lastUpdate: text,
  };
}

function extractSubagentDetails(event: Extract<StreamEvent, { type: "tool_end" }>): Partial<SubagentState> | undefined {
  const envelope = toToolEnvelope(event.result);
  const details = isRecord(envelope.details) ? envelope.details : undefined;
  const text = extractTextContent(envelope.content);

  if (event.toolName === "Agent") {
    return {
      agentId: typeof details?.agentId === "string" ? details.agentId : undefined,
      description: typeof details?.description === "string" ? details.description : undefined,
      subagentType:
        typeof details?.subagentType === "string"
          ? details.subagentType
          : typeof details?.displayName === "string"
            ? details.displayName
            : undefined,
      status:
        typeof details?.status === "string"
          ? details.status
          : event.ok
            ? "completed"
            : "error",
      toolUses: typeof details?.toolUses === "number" ? details.toolUses : undefined,
      tokens: typeof details?.tokens === "string" ? details.tokens : undefined,
      durationMs: typeof details?.durationMs === "number" ? details.durationMs : undefined,
      turnCount: typeof details?.turnCount === "number" ? details.turnCount : undefined,
      maxTurns: typeof details?.maxTurns === "number" ? details.maxTurns : undefined,
      lastUpdate: text,
    };
  }

  if (event.toolName === "get_subagent_result" && text) {
    return parseSubagentSummary(text);
  }

  return undefined;
}

export function createEmptyModuleActivity(): ModuleActivityState {
  return {
    todos: { tasks: [] },
    subagents: [],
  };
}

export function applyModuleEvent(
  current: ModuleActivityState,
  event: StreamEvent,
): ModuleActivityState {
  if (event.type === "tool_start") {
    if (event.toolName === "Agent" && isRecord(event.args)) {
      return {
        ...current,
        subagents: upsertSubagent(current.subagents, {
          toolCallId: event.toolCallId,
          description:
            typeof event.args.description === "string"
              ? event.args.description
              : "Run subagent",
          subagentType:
            typeof event.args.subagent_type === "string"
              ? event.args.subagent_type
              : "Agent",
          status: event.args.run_in_background ? "launching" : "running",
          runInBackground: Boolean(event.args.run_in_background),
        }),
      };
    }

    if (event.toolName === "get_subagent_result" && isRecord(event.args) && typeof event.args.agent_id === "string") {
      return {
        ...current,
        subagents: upsertSubagent(current.subagents, {
          toolCallId: event.toolCallId,
          agentId: event.args.agent_id,
          description: "Fetch subagent result",
          subagentType: "Agent",
          status: "waiting",
          runInBackground: true,
        }),
      };
    }

    if (event.toolName === "steer_subagent" && isRecord(event.args) && typeof event.args.agent_id === "string") {
      return {
        ...current,
        subagents: upsertSubagent(current.subagents, {
          toolCallId: event.toolCallId,
          agentId: event.args.agent_id,
          description: "Steer subagent",
          subagentType: "Agent",
          status: "steered",
          runInBackground: true,
        }),
      };
    }

    return current;
  }

  if (event.type !== "tool_end") {
    return current;
  }

  const envelope = toToolEnvelope(event.result);
  const todoModule = extractTodoModule(envelope.details);
  const subagentUpdate = extractSubagentDetails(event);

  return {
    todos: todoModule ?? current.todos,
    subagents: subagentUpdate
      ? upsertSubagent(current.subagents, {
          toolCallId: event.toolCallId,
          description: subagentUpdate.description ?? "Subagent",
          subagentType: subagentUpdate.subagentType ?? "Agent",
          status: subagentUpdate.status ?? (event.ok ? "completed" : "error"),
          runInBackground: current.subagents.find((entry) => entry.toolCallId === event.toolCallId)?.runInBackground ?? true,
          ...subagentUpdate,
        })
      : current.subagents,
  };
}
