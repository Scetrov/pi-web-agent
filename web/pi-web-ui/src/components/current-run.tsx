import * as React from "react";
import { useState } from "react";
import {
  AlertCircle,
  Brain,
  Bot,
  Check,
  Copy,
  FilePenLine,
  FileSearch,
  Terminal,
  Wrench,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CurrentRun as CurrentRunState, ToolRunState } from "@/types/chat";

interface CurrentRunProps {
  run?: CurrentRunState;
}

type StructuredValue =
  | string
  | number
  | boolean
  | null
  | StructuredValue[]
  | { [key: string]: StructuredValue };

function toolBadgeVariant(tool: ToolRunState): "secondary" | "outline" | "destructive" {
  if (tool.status === "error") {
    return "destructive";
  }
  if (tool.status === "done") {
    return "secondary";
  }
  return "outline";
}

function humanizeKey(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeStructuredValue(value: unknown): StructuredValue | undefined {
  if (value === null) {
    return null;
  }

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    const trimmed = typeof value === "string" ? value.trim() : undefined;
    if (
      typeof value === "string" &&
      trimmed &&
      ((trimmed.startsWith("{") && trimmed.endsWith("}")) ||
        (trimmed.startsWith("[") && trimmed.endsWith("]")))
    ) {
      try {
        return normalizeStructuredValue(JSON.parse(trimmed));
      } catch {
        return value;
      }
    }
    return value;
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => normalizeStructuredValue(item))
      .filter((item): item is StructuredValue => item !== undefined);
  }

  if (typeof value === "object") {
    const normalizedEntries = Object.entries(value as Record<string, unknown>)
      .map(([key, entryValue]) => [key, normalizeStructuredValue(entryValue)] as const)
      .filter(([, entryValue]) => entryValue !== undefined);

    return Object.fromEntries(normalizedEntries) as {
      [key: string]: StructuredValue;
    };
  }

  return undefined;
}

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function summarizeStructuredValue(
  value: StructuredValue,
  options: { maxLength?: number; depth?: number } = {},
): string {
  const maxLength = options.maxLength ?? 180;
  const depth = options.depth ?? 0;

  let text: string;

  if (typeof value === "string") {
    const collapsed = collapseWhitespace(value);
    text = collapsed.length > 80 ? `${collapsed.slice(0, 77)}…` : collapsed;
  } else if (typeof value === "number" || typeof value === "boolean" || value === null) {
    text = String(value);
  } else if (Array.isArray(value)) {
    const items = value.slice(0, 3).map((item) => summarizeStructuredValue(item, { maxLength: 40, depth: depth + 1 }));
    text = `[${items.join(", ")}${value.length > 3 ? ", …" : ""}]`;
  } else {
    const entries = Object.entries(value).slice(0, 4).map(([key, entryValue]) => {
      const summary = summarizeStructuredValue(entryValue, {
        maxLength: depth === 0 ? 48 : 28,
        depth: depth + 1,
      });
      return `${humanizeKey(key)}: ${summary}`;
    });
    text = `{ ${entries.join(" • ")}${Object.keys(value).length > 4 ? " • …" : ""} }`;
  }

  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}

function serializeForCopy(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function getEnvelope(value: unknown): { content?: unknown; details?: unknown } {
  if (
    value &&
    typeof value === "object" &&
    ("content" in (value as Record<string, unknown>) ||
      "details" in (value as Record<string, unknown>))
  ) {
    const record = value as Record<string, unknown>;
    return {
      content: record.content,
      details: record.details,
    };
  }

  return { details: value };
}

function getPrimaryTextContent(value: unknown): string | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const firstText = value.find(
    (entry) =>
      entry &&
      typeof entry === "object" &&
      "type" in (entry as Record<string, unknown>) &&
      (entry as Record<string, unknown>).type === "text" &&
      typeof (entry as Record<string, unknown>).text === "string",
  ) as { text?: string } | undefined;

  return firstText?.text;
}

function escapeInlineCode(value: string): string {
  return `\`${value.replace(/`/g, "\\`")}\``;
}

function basename(value: string): string {
  const parts = value.split(/[\\/]/).filter(Boolean);
  return parts.at(-1) ?? value;
}

function countLines(value: string): number {
  return value.length === 0 ? 1 : value.split(/\r?\n/).length;
}

function formatLineRange(start: number, end: number): string {
  const safeStart = Number.isFinite(start) && start > 0 ? Math.floor(start) : 1;
  const safeEnd = Number.isFinite(end) && end >= safeStart ? Math.floor(end) : safeStart;
  return `lines ${safeStart}...${safeEnd}`;
}

function getCompactToolDisplay(tool: ToolRunState): { icon: typeof Brain; label: string } | undefined {
  const envelope = getEnvelope(tool.details ?? tool.args);
  const detailsRecord =
    envelope.details && typeof envelope.details === "object"
      ? (envelope.details as Record<string, unknown>)
      : undefined;
  const argsRecord =
    tool.args && typeof tool.args === "object"
      ? (tool.args as Record<string, unknown>)
      : undefined;

  if (tool.toolName === "read" || tool.toolName === "write") {
    const path =
      (typeof argsRecord?.path === "string" ? argsRecord.path : undefined) ??
      (typeof detailsRecord?.path === "string" ? detailsRecord.path : undefined);

    if (!path) {
      return undefined;
    }

    const fileLabel = basename(path);

    if (tool.toolName === "read") {
      const start =
        typeof argsRecord?.offset === "number" && Number.isFinite(argsRecord.offset)
          ? Math.max(1, Math.floor(argsRecord.offset))
          : 1;
      const requestedLimit =
        typeof argsRecord?.limit === "number" && Number.isFinite(argsRecord.limit)
          ? Math.max(1, Math.floor(argsRecord.limit))
          : undefined;
      const contentText = getPrimaryTextContent(envelope.content);
      const detectedLines = contentText ? countLines(contentText) : undefined;
      const end = requestedLimit
        ? start + requestedLimit - 1
        : detectedLines
          ? start + detectedLines - 1
          : start;

      return {
        icon: FileSearch,
        label: `${fileLabel} ${formatLineRange(start, end)}`,
      };
    }

    const argsContent = typeof argsRecord?.content === "string" ? argsRecord.content : undefined;
    const contentText = getPrimaryTextContent(envelope.content);
    const lineCount = argsContent
      ? countLines(argsContent)
      : contentText
        ? countLines(contentText)
        : 1;

    return {
      icon: FilePenLine,
      label: `${fileLabel} ${formatLineRange(1, lineCount)}`,
    };
  }

  if (tool.toolName === "bash") {
    const command =
      (typeof argsRecord?.command === "string" ? argsRecord.command : undefined) ??
      (typeof detailsRecord?.command === "string" ? detailsRecord.command : undefined);

    if (!command) {
      return undefined;
    }

    return {
      icon: Terminal,
      label: `Bash command: ${collapseWhitespace(command)}`,
    };
  }

  return undefined;
}

function getEditLabel(tool: ToolRunState): string | undefined {
  if (tool.toolName !== "edit") {
    return undefined;
  }

  const argsRecord =
    tool.args && typeof tool.args === "object"
      ? (tool.args as Record<string, unknown>)
      : undefined;
  const path = typeof argsRecord?.path === "string" ? argsRecord.path : undefined;

  return path ? `Editing ${escapeInlineCode(path)} …` : "Editing …";
}

function getEditDiff(tool: ToolRunState): string | undefined {
  if (tool.toolName !== "edit") {
    return undefined;
  }

  const envelope = getEnvelope(tool.details);
  const detailsRecord =
    envelope.details && typeof envelope.details === "object"
      ? (envelope.details as Record<string, unknown>)
      : undefined;

  return typeof detailsRecord?.diff === "string" ? detailsRecord.diff : undefined;
}

function renderInlineActivity(value: unknown, emptyLabel: string): string {
  const normalized = normalizeStructuredValue(value);
  if (normalized === undefined || normalized === "") {
    return emptyLabel;
  }
  return summarizeStructuredValue(normalized);
}

function getToolSummary(tool: ToolRunState): string {
  const compactDisplay = getCompactToolDisplay(tool);
  if (compactDisplay) {
    return compactDisplay.label;
  }

  const editLabel = getEditLabel(tool);
  if (editLabel) {
    return editLabel;
  }

  const detailSource = tool.args ?? tool.details;
  const normalized = normalizeStructuredValue(detailSource);
  if (!normalized || Array.isArray(normalized) || typeof normalized !== "object") {
    return tool.summary;
  }

  const detailText = [normalized.command, normalized.path, normalized.url, normalized.query]
    .filter((value): value is string => typeof value === "string" && value.length > 0)
    .shift();

  return detailText ? `${tool.summary} · ${detailText}` : tool.summary;
}

function CopyPayloadButton({ value }: { value: unknown }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const payload = serializeForCopy(value);
    try {
      await navigator.clipboard.writeText(payload);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="xs"
      className="h-6 shrink-0 border-border/60 bg-background/60 px-1.5 text-[10px] text-muted-foreground"
      onClick={() => void handleCopy()}
      title="Copy JSON"
      aria-label="Copy JSON"
    >
      {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
      <span>{copied ? "Copied" : "JSON"}</span>
    </Button>
  );
}

function DiffLine({ line }: { line: string }) {
  const prefix = line[0];
  const className =
    prefix === "+"
      ? "bg-emerald-500/12 text-emerald-300"
      : prefix === "-"
        ? "bg-red-500/12 text-red-300"
        : "text-muted-foreground";

  return (
    <div className={cn("whitespace-pre-wrap break-words px-1.5 py-0.5 font-mono text-[11px] leading-5", className)}>
      {line || " "}
    </div>
  );
}

function EditDiff({ diff }: { diff: string }) {
  return (
    <div className="mt-1 overflow-hidden border-l border-border/60 bg-transparent pl-2">
      {diff.split("\n").map((line, index) => (
        <DiffLine key={`${index}-${line}`} line={line} />
      ))}
    </div>
  );
}

function ActivityLine({
  icon: Icon,
  label,
  value,
  emptyLabel,
  className,
}: {
  icon: typeof Brain;
  label: string;
  value: unknown;
  emptyLabel: string;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2 border border-border/60 bg-muted/14 px-2.5 py-2", className)}>
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
        <Icon className="size-3.5 shrink-0" />
        <span>{label}</span>
      </div>
      <div className="min-w-0 flex-1 truncate font-mono text-[11px] leading-5 text-foreground/80">
        {renderInlineActivity(value, emptyLabel)}
      </div>
      <CopyPayloadButton value={value} />
    </div>
  );
}

export function CurrentRun({ run }: CurrentRunProps) {
  if (!run) {
    return null;
  }

  return (
    <section className="space-y-3 border-t border-border/60 pt-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          <Bot className="size-3.5" />
          <span>Live stream</span>
        </div>
        <Badge variant="outline" className="w-fit border-primary/25 bg-primary/10 text-primary">
          {run.status ?? "streaming"}
        </Badge>
      </div>

      {run.thinkingText ? (
        <ActivityLine
          icon={Brain}
          label="Thinking"
          value={run.thinkingText}
          emptyLabel="Thinking…"
          className="border-l border-l-primary/30 border-y-0 border-r-0 bg-transparent px-0 py-1"
        />
      ) : null}

      <div className="border-l border-border/60 pl-3 py-1">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          <Bot className="size-3.5" />
          <span>Agent</span>
        </div>
        <div className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-foreground">
          {run.assistantText || "Waiting for output…"}
        </div>
      </div>

      {run.tools.length > 0 ? (
        <section className="space-y-2">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            <Wrench className="size-3.5" />
            <span>Tool activity</span>
          </div>
          <div className="space-y-2">
            {run.tools.map((tool) => {
              const detailValue = tool.details ?? tool.args;
              const compactDisplay = getCompactToolDisplay(tool);
              const editLabel = getEditLabel(tool);
              const editDiff = getEditDiff(tool);
              const emphasizedLabel = Boolean(compactDisplay || editLabel);
              const summaryText = compactDisplay?.label ?? getToolSummary(tool);
              const CompactIcon = compactDisplay?.icon;

              return (
                <div key={tool.toolCallId} className="border-l border-border/60 pl-3 py-1.5">
                  <div className="flex items-center gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {CompactIcon ? <CompactIcon className="size-3.5 shrink-0 text-muted-foreground" /> : null}
                        {!emphasizedLabel ? (
                          <span className="shrink-0 text-sm font-medium text-foreground">{tool.toolName}</span>
                        ) : null}
                        <div className={cn("min-w-0 flex-1 truncate", emphasizedLabel ? "text-sm font-medium text-foreground" : "") }>
                          <span className={cn(emphasizedLabel ? "text-foreground" : "truncate text-xs text-muted-foreground")}>
                            {summaryText}
                          </span>
                        </div>
                        <Badge variant={toolBadgeVariant(tool)} className="w-fit shrink-0">
                          {tool.status}
                        </Badge>
                      </div>
                    </div>
                    {detailValue !== undefined ? <CopyPayloadButton value={detailValue} /> : null}
                  </div>
                  {editDiff ? <EditDiff diff={editDiff} /> : null}
                  {detailValue !== undefined && !compactDisplay && !editLabel ? (
                    <div className="mt-1 truncate pl-0.5 font-mono text-[11px] leading-5 text-foreground/80">
                      {renderInlineActivity(detailValue, tool.status === "running" ? "Working…" : "No details")}
                    </div>
                  ) : null}
                  {tool.error ? (
                    <div className={cn("mt-2 flex items-start gap-2 text-xs", "text-destructive")}>
                      <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
                      <span>{tool.error}</span>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {run.error ? (
        <div className="flex items-start gap-2 border-l border-destructive/40 pl-3 py-1 text-xs text-destructive">
          <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
          <span>{run.error}</span>
        </div>
      ) : (
        run.status !== "done" ? (
          <div className="pt-2 text-right text-sm font-mono thinking-pulse-text">
            Thinking&#8230;
          </div>
        ) : null
      )}
    </section>
  );
}
