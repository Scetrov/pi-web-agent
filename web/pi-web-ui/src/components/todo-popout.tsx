import { useMemo, useState } from "react";
import { CheckCircle2, ChevronDown, ChevronUp, CircleDashed, ListTodo, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { TodoTaskState } from "@/types/chat";

interface TodoPopoutProps {
  tasks: TodoTaskState[];
}

function sortTasks(tasks: TodoTaskState[]): TodoTaskState[] {
  const statusRank: Record<TodoTaskState["status"], number> = {
    in_progress: 0,
    pending: 1,
    completed: 2,
    deleted: 3,
  };

  return [...tasks].sort((left, right) => {
    const statusDiff = statusRank[left.status] - statusRank[right.status];
    if (statusDiff !== 0) {
      return statusDiff;
    }
    return left.id - right.id;
  });
}

function taskBadgeVariant(task: TodoTaskState): "outline" | "secondary" | "destructive" {
  switch (task.status) {
    case "in_progress":
      return "outline";
    case "completed":
      return "secondary";
    case "deleted":
      return "destructive";
    default:
      return "outline";
  }
}

function taskStatusLabel(task: TodoTaskState): string {
  switch (task.status) {
    case "in_progress":
      return task.activeForm ?? "in progress";
    case "completed":
      return "completed";
    case "deleted":
      return "deleted";
    default:
      return "pending";
  }
}

export function TodoPopout({ tasks }: TodoPopoutProps) {
  const [open, setOpen] = useState(true);
  const visibleTasks = useMemo(() => sortTasks(tasks), [tasks]);
  const completedCount = visibleTasks.filter((task) => task.status === "completed").length;

  return (
    <aside className="flex min-h-0 flex-col">
      <div className="flex items-center justify-between gap-2 py-1">
        <div className="flex min-w-0 items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
          <ListTodo className="size-3.5 shrink-0 text-primary" />
          <span>Todos</span>
          <Badge variant="outline" className="ml-auto text-[10px]">
            {visibleTasks.length}
          </Badge>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="shrink-0"
          onClick={() => setOpen((current) => !current)}
          aria-label={open ? "Collapse todo panel" : "Expand todo panel"}
          title={open ? "Collapse todo panel" : "Expand todo panel"}
        >
          {open ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
        </Button>
      </div>

      {open ? (
        <>
          <div className="py-1 text-xs text-muted-foreground">
            {completedCount}/{visibleTasks.length} complete
          </div>
          <Separator />
          <div className="min-h-0 flex-1 overflow-y-auto py-2">
            <div className="space-y-1.5">
              {visibleTasks.map((task) => (
                <div key={task.id} className="border-l border-border/60 pl-2.5 py-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-xs text-foreground">
                        {task.status === "completed" ? (
                          <CheckCircle2 className="size-3.5 shrink-0 text-primary" />
                        ) : (
                          <CircleDashed className="size-3.5 shrink-0 text-muted-foreground" />
                        )}
                        <span className="truncate font-medium">
                          #{task.id} {task.subject}
                        </span>
                      </div>
                      {task.description ? (
                        <div className="mt-0.5 line-clamp-3 text-[11px] leading-5 text-muted-foreground">
                          {task.description}
                        </div>
                      ) : null}
                      {(task.owner || task.blockedBy?.length) ? (
                        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                          {task.owner ? <span>{task.owner}</span> : null}
                          {task.blockedBy?.length ? (
                            <span className="inline-flex items-center gap-1">
                              <Lock className="size-3" />
                              blocked by {task.blockedBy.map((id) => `#${id}`).join(", ")}
                            </span>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                    <Badge variant={taskBadgeVariant(task)} className="max-w-28 truncate text-[10px]">
                      {taskStatusLabel(task)}
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
