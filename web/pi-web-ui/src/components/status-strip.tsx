import {
  AlertTriangle,
  Brain,
  FolderTree,
  ReceiptText,
  Wrench,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { HealthResponse, SessionMeta } from "@/types/chat";

interface StatusStripProps {
  health?: HealthResponse;
  meta?: SessionMeta;
}

function resourceSummary(meta?: SessionMeta): string {
  if (!meta) return "No resources yet";
  if (meta.resourceHealth.length === 0) {
    return `${meta.toolCount} tools • healthy`;
  }
  return `${meta.resourceHealth.length} issue${meta.resourceHealth.length === 1 ? "" : "s"}`;
}

function issueClassName(meta?: SessionMeta): string {
  const severity = meta?.resourceHealth[0]?.severity;
  if (severity === "error") {
    return "border-destructive/40 bg-destructive/10 text-destructive";
  }
  if (severity === "warning") {
    return "border-primary/30 bg-primary/10 text-primary";
  }
  return "border-border/70 bg-muted/40 text-muted-foreground";
}

function formatCompactTokens(value: number): string {
  if (value >= 1_000_000) {
    const compact = value >= 10_000_000 ? value / 1_000_000 : Number((value / 1_000_000).toFixed(1));
    return `${compact.toString().replace(/\.0$/, "")}m`;
  }
  if (value >= 1_000) {
    const compact = value >= 100_000 ? value / 1_000 : Number((value / 1_000).toFixed(1));
    return `${compact.toString().replace(/\.0$/, "")}k`;
  }
  return value.toString();
}

function formatUsageStatus(meta?: SessionMeta): string {
  const cost = `$${(meta?.usage.cost ?? 0).toFixed(3)}${meta?.usingSubscription ? " (sub)" : ""}`;
  const contextUsage = meta?.usage.contextUsage;
  const contextWindow = contextUsage?.contextWindow ?? 0;
  const contextPercent =
    contextUsage?.percent === null || contextUsage?.percent === undefined
      ? "?"
      : contextUsage.percent.toFixed(1);
  const contextDisplay =
    contextPercent === "?" ? "?" : `${contextPercent}%`;
  const autoIndicator = meta?.autoCompactEnabled ? " (auto)" : "";

  if (!contextWindow) {
    return `${cost} ?/?${autoIndicator}`;
  }

  return `${cost} ${contextDisplay}/${formatCompactTokens(contextWindow)}${autoIndicator}`;
}

function ContextPie({ percent }: { percent?: number | null }) {
  const normalized =
    percent === null || percent === undefined
      ? null
      : Math.max(0, Math.min(percent, 100));
  const angle = ((normalized ?? 0) / 100) * 360;

  return (
    <span className="relative ml-1 inline-flex size-3.5 shrink-0 items-center justify-center border border-current/20">
      <span
        className="absolute inset-0"
        style={{
          background:
            normalized === null
              ? "conic-gradient(rgb(148 163 184 / 0.25) 0deg 360deg)"
              : `conic-gradient(currentColor 0deg ${angle}deg, rgb(148 163 184 / 0.18) ${angle}deg 360deg)`,
        }}
      />
      <span className="relative size-1.5 bg-background/95" />
    </span>
  );
}

function StatusBadge({
  icon: Icon,
  children,
  className,
  trailing,
}: {
  icon: typeof FolderTree;
  children: React.ReactNode;
  className?: string;
  trailing?: React.ReactNode;
}) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "h-auto max-w-full items-center gap-1.5 border-border/70 bg-muted/35 px-2.5 py-1 text-[11px] text-muted-foreground [&>svg]:size-3.5",
        className,
      )}
    >
      <Icon className="size-3.5 shrink-0" />
      <span className="min-w-0 truncate">{children}</span>
      {trailing}
    </Badge>
  );
}

export function StatusStrip({ health, meta }: StatusStripProps) {
  const toolList = meta?.activeTools ?? [];

  return (
    <TooltipProvider>
      <div className="flex flex-wrap gap-2">
        <StatusBadge icon={FolderTree}>
          {health?.cwd ?? meta?.cwd ?? "cwd pending"}
        </StatusBadge>
        <StatusBadge
          icon={ReceiptText}
          trailing={<ContextPie percent={meta?.usage.contextUsage?.percent} />}
        >
          {formatUsageStatus(meta)}
        </StatusBadge>
        <StatusBadge icon={Brain}>
          {meta?.model ? `${meta.model.provider}/${meta.model.id}` : "model pending"} • {meta?.thinkingLevel ?? "off"}
        </StatusBadge>
        {toolList.length ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <StatusBadge icon={Wrench} className="cursor-default">
                  {resourceSummary(meta)}
                </StatusBadge>
              </span>
            </TooltipTrigger>
            <TooltipContent className="w-64">
              <div className="space-y-2">
                <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  Active tools
                </div>
                <ul className="space-y-1">
                  {toolList.map((toolName) => (
                    <li key={toolName} className="font-mono text-[11px] leading-5 text-card-foreground">
                      {toolName}
                    </li>
                  ))}
                </ul>
              </div>
            </TooltipContent>
          </Tooltip>
        ) : (
          <StatusBadge icon={Wrench}>{resourceSummary(meta)}</StatusBadge>
        )}
        {meta?.resourceHealth.length ? (
          <StatusBadge
            icon={AlertTriangle}
            className={issueClassName(meta)}
          >
            {meta.resourceHealth[0]?.message}
          </StatusBadge>
        ) : null}
      </div>
    </TooltipProvider>
  );
}
