import type { AgentSession } from "@earendil-works/pi-coding-agent";
import type { SessionMeta, WebStreamEvent } from "./types.js";

type AgentSessionEvent = Parameters<
  Parameters<AgentSession["subscribe"]>[0]
>[0];
type DoneMeta = Pick<
  SessionMeta,
  "sessionId" | "title" | "usage" | "thinkingLevel"
>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function summarizeToolStart(toolName: string, args: unknown): string {
  if (!isRecord(args)) {
    return `${toolName} started`;
  }

  if (toolName === "todo") {
    const action = typeof args.action === "string" ? args.action : "run";
    const subject = typeof args.subject === "string"
      ? args.subject
      : typeof args.id === "number"
        ? `#${args.id}`
        : undefined;
    return subject ? `${action} ${subject}` : `todo ${action}`;
  }

  if (toolName === "Agent") {
    const type = typeof args.subagent_type === "string" ? args.subagent_type : "Agent";
    const description = typeof args.description === "string" ? args.description : "Run subagent";
    return `${type} · ${description}`;
  }

  if (toolName === "get_subagent_result") {
    const agentId = typeof args.agent_id === "string" ? args.agent_id : "subagent";
    return `check ${agentId}`;
  }

  if (toolName === "steer_subagent") {
    const agentId = typeof args.agent_id === "string" ? args.agent_id : "subagent";
    return `steer ${agentId}`;
  }

  if (toolName === "read" && typeof args.path === "string") {
    return `read ${args.path}`;
  }

  if (toolName === "bash" && typeof args.command === "string") {
    return args.command;
  }

  return `${toolName} started`;
}

export function serializeEvent(event: WebStreamEvent): string {
  return `${JSON.stringify(event)}\n`;
}

export class WebProtocolTranslator {
  private sawAssistantError = false;

  constructor(
    private readonly sessionId: string,
    private readonly getDoneMeta: () => DoneMeta,
  ) {}

  translate(event: AgentSessionEvent): WebStreamEvent[] {
    switch (event.type) {
      case "message_update": {
        const update = event.assistantMessageEvent;
        if (update.type === "text_delta") {
          return [{ type: "assistant_delta", delta: update.delta }];
        }
        if (update.type === "thinking_delta") {
          return [{ type: "thinking", delta: update.delta }];
        }
        return [];
      }
      case "tool_execution_start":
        return [
          {
            type: "tool_start",
            toolCallId: event.toolCallId,
            toolName: event.toolName,
            summary: summarizeToolStart(event.toolName, event.args),
            args: event.args,
          },
        ];
      case "tool_execution_update":
        return [
          {
            type: "tool_update",
            toolCallId: event.toolCallId,
            toolName: event.toolName,
            details: event.partialResult,
          },
        ];
      case "tool_execution_end":
        return [
          {
            type: "tool_end",
            toolCallId: event.toolCallId,
            toolName: event.toolName,
            ok: !event.isError,
            result: event.isError ? undefined : event.result,
            error: event.isError ? String(event.result) : undefined,
          },
        ];
      case "message_end":
        if (
          event.message.role === "assistant" &&
          event.message.stopReason === "error" &&
          event.message.errorMessage
        ) {
          this.sawAssistantError = true;
          return [{ type: "error", message: event.message.errorMessage }];
        }
        return [];
      case "agent_end":
        return this.sawAssistantError
          ? []
          : [{ type: "done", meta: this.getDoneMeta() }];
      default:
        return [];
    }
  }

  buildStartEvent(): WebStreamEvent {
    return {
      type: "status",
      phase: "started",
      sessionId: this.sessionId,
    };
  }
}
