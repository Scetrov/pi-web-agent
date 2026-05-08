import { useMemo, useState } from "react";
import { Bot, ChevronDown, ChevronUp, Clock3, LoaderCircle, Orbit, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { SubagentState } from "@/types/chat";

interface SubagentPopoutProps {
  subagents: SubagentState[];
}

function sortSubagents(subagents: SubagentState[]): SubagentState[] {
  return [...subagents].sort((left, right) => {
    const leftDuration = left.durationMs ?? 0;
    const rightDuration = right.durationMs ?? 0;
    return rightDuration - leftDuration;
  });
}

function statusVariant(status: string): "outline" | "secondary" | "destructive" {
  switch (status) {
    case "error":
    case "failed":
      return "destructive";
    case "completed":
    case "wrapped_up":
      return "secondary";
    default:
      return "outline";
  }
}

function formatStatus(status: string): string {
  return status.replace(/_/g, " ");
}

function formatDuration(durationMs?: number): string | undefined {
  if (!durationMs) {
    return undefined;
  }

  if (durationMs >= 60_000) {
    return `${(durationMs / 60_000).toFixed(1)}m`;
  }

  return `${(durationMs / 1000).toFixed(1)}s`;
}

export function SubagentPopout({ subagents }: SubagentPopoutProps) {
  const [open, setOpen] = useState(true);
  const visibleSubagents = useMemo(() => sortSubagents(subagents), [subagents]);

  return (
    <aside className="flex min-h-0 flex-col">
      <div className="flex items-center justify-between gap-2 py-1">
        <div className="flex min-w-0 items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
          <Orbit className="size-3.5 shrink-0 text-primary" />
          <span>Subagents</span>
          <Badge variant="outline" className="ml-auto text-[10px]">
            {visibleSubagents.length}
          </Badge>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="shrink-0"
          onClick={() => setOpen((current) => !current)}
          aria-label={open ? "Collapse subagent panel" : "Expand subagent panel"}
          title={open ? "Collapse subagent panel" : "Expand subagent panel"}
        >
          {open ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
        </Button>
      </div>

      {open ? (
        <>
          <div className="py-1 text-xs text-muted-foreground">
            Tracking currently active subagents.
          </div>
          <Separator />
          <div className="min-h-0 flex-1 overflow-y-auto py-2">
            <div className="space-y-1.5">
              {visibleSubagents.map((subagent) => (
                <div key={`${subagent.agentId ?? subagent.toolCallId}`} className="border-l border-border/60 pl-2.5 py-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-xs text-foreground">
                        <LoaderCircle className="size-3.5 shrink-0 animate-spin text-primary" />
                        <span className="truncate font-medium">{subagent.description}</span>
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Bot className="size-3" />
                          {subagent.subagentType}
                        </span>
                        {subagent.agentId ? <span className="font-mono normal-case">{subagent.agentId}</span> : null}
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                        {subagent.tokens ? (
                          <span className="inline-flex items-center gap-1">
                            <Sparkles className="size-3" />
                            {subagent.tokens}
                          </span>
                        ) : null}
                        {subagent.toolUses !== undefined ? <span>{subagent.toolUses} tools</span> : null}
                        {formatDuration(subagent.durationMs) ? (
                          <span className="inline-flex items-center gap-1">
                            <Clock3 className="size-3" />
                            {formatDuration(subagent.durationMs)}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <Badge variant={statusVariant(subagent.status)} className="max-w-24 truncate text-[10px] capitalize">
                      {formatStatus(subagent.status)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : null}
    </aside>
  );
}
