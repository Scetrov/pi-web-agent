import { useCallback, useState } from "react";
import { abortSession, createChatStreamRequest } from "@/lib/api";
import { applyModuleEvent, createEmptyModuleActivity } from "@/lib/module-activity";
import { buildTitleFromPrompt } from "@/lib/title-heuristic";
import { readNdjsonStream } from "@/lib/ndjson";
import type {
  CurrentRun,
  ModuleActivityState,
  StreamEvent,
  ToolRunState,
  TranscriptMessage,
} from "@/types/chat";

export interface UseChatStreamOptions {
  token?: string;
  sessionId?: string;
  title?: string;
  onRunComplete?: () => Promise<void> | void;
}

export interface UseChatStreamState {
  history: TranscriptMessage[];
  currentRun?: CurrentRun;
  activity: ModuleActivityState;
  isStreaming: boolean;
  error?: string;
  send: (prompt: string) => Promise<void>;
  stop: () => Promise<void>;
  clear: () => void;
}

function upsertTool(tools: ToolRunState[], next: ToolRunState): ToolRunState[] {
  const existingIndex = tools.findIndex(
    (tool) => tool.toolCallId === next.toolCallId,
  );
  if (existingIndex === -1) {
    return [...tools, next];
  }
  const clone = [...tools];
  clone[existingIndex] = { ...clone[existingIndex], ...next };
  return clone;
}

function isSidePanelTool(toolName: string): boolean {
  return toolName === "todo" || toolName === "Agent" || toolName === "get_subagent_result";
}

export function useChatStream({
  token,
  sessionId,
  title,
  onRunComplete,
}: UseChatStreamOptions): UseChatStreamState {
  const [history, setHistory] = useState<TranscriptMessage[]>([]);
  const [currentRun, setCurrentRun] = useState<CurrentRun>();
  const [activity, setActivity] = useState<ModuleActivityState>(createEmptyModuleActivity);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string>();

  const clear = useCallback(() => {
    setHistory([]);
    setCurrentRun(undefined);
    setActivity(createEmptyModuleActivity());
    setError(undefined);
  }, []);

  const send = useCallback(
    async (prompt: string) => {
      const trimmed = prompt.trim();
      if (!trimmed || !token || !sessionId || isStreaming) {
        return;
      }

      setIsStreaming(true);
      setError(undefined);
      setHistory((previous) => [
        ...previous,
        { id: crypto.randomUUID(), role: "user", content: trimmed },
      ]);
      setCurrentRun({
        assistantText: "",
        thinkingText: "",
        status: "Streaming…",
        tools: [],
      });

      const fallbackTitle =
        title?.trim() || buildTitleFromPrompt(trimmed) || undefined;
      let sawDone = false;

      try {
        const response = await createChatStreamRequest(
          sessionId,
          trimmed,
          token,
          fallbackTitle,
        );
        if (!response.ok) {
          throw new Error(await response.text());
        }

        for await (const event of readNdjsonStream<StreamEvent>(response)) {
          setActivity((previous) => applyModuleEvent(previous, event));

          switch (event.type) {
            case "status":
              setCurrentRun((previous) =>
                previous
                  ? { ...previous, status: event.message ?? event.phase }
                  : previous,
              );
              break;
            case "thinking":
              setCurrentRun((previous) =>
                previous
                  ? {
                      ...previous,
                      thinkingText: previous.thinkingText + event.delta,
                    }
                  : previous,
              );
              break;
            case "assistant_delta":
              setCurrentRun((previous) =>
                previous
                  ? {
                      ...previous,
                      assistantText: previous.assistantText + event.delta,
                    }
                  : previous,
              );
              break;
            case "tool_start":
              if (isSidePanelTool(event.toolName)) {
                break;
              }
              setCurrentRun((previous) =>
                previous
                  ? {
                      ...previous,
                      tools: upsertTool(previous.tools, {
                        toolCallId: event.toolCallId,
                        toolName: event.toolName,
                        summary: event.summary,
                        status: "running",
                        args: event.args,
                      }),
                    }
                  : previous,
              );
              break;
            case "tool_update":
              if (isSidePanelTool(event.toolName)) {
                break;
              }
              setCurrentRun((previous) =>
                previous
                  ? {
                      ...previous,
                      tools: upsertTool(previous.tools, {
                        toolCallId: event.toolCallId,
                        toolName: event.toolName,
                        summary:
                          previous.tools.find(
                            (tool) => tool.toolCallId === event.toolCallId,
                          )?.summary ?? event.toolName,
                        status: "running",
                        details: event.details,
                      }),
                    }
                  : previous,
              );
              break;
            case "tool_end":
              if (isSidePanelTool(event.toolName)) {
                break;
              }
              setCurrentRun((previous) =>
                previous
                  ? {
                      ...previous,
                      tools: upsertTool(previous.tools, {
                        toolCallId: event.toolCallId,
                        toolName: event.toolName,
                        summary:
                          previous.tools.find(
                            (tool) => tool.toolCallId === event.toolCallId,
                          )?.summary ?? event.toolName,
                        status: event.ok ? "done" : "error",
                        details: event.result,
                        error: event.error,
                      }),
                    }
                  : previous,
              );
              break;
            case "error":
              setError(event.message);
              setCurrentRun((previous) =>
                previous
                  ? { ...previous, error: event.message, status: "error" }
                  : previous,
              );
              break;
            case "done": {
              sawDone = true;
              setCurrentRun((previous) => {
                if (previous?.assistantText.trim()) {
                  setHistory((items) => [
                    ...items,
                    {
                      id: crypto.randomUUID(),
                      role: "assistant",
                      content: previous.assistantText,
                    },
                  ]);
                }
                return undefined;
              });
              break;
            }
          }
        }

        if (sawDone) {
          await onRunComplete?.();
        }
      } catch (cause) {
        const nextError =
          cause instanceof Error ? cause.message : String(cause);
        setError(nextError);
        setCurrentRun((previous) =>
          previous
            ? { ...previous, error: nextError, status: "error" }
            : previous,
        );
      } finally {
        setIsStreaming(false);
      }
    },
    [token, sessionId, title, isStreaming, onRunComplete],
  );

  const stop = useCallback(async () => {
    if (!token || !sessionId || !isStreaming) {
      return;
    }
    await abortSession(sessionId, token);
  }, [token, sessionId, isStreaming]);

  return {
    history,
    currentRun,
    activity,
    isStreaming,
    error,
    send,
    stop,
    clear,
  };
}
