import { useEffect, useMemo, useState } from "react";
import { KeyRound, ShieldAlert, Sparkles } from "lucide-react";
import { ChatHeader } from "@/components/chat-header";
import { ChatHistory } from "@/components/chat-history";
import { ChatInput } from "@/components/chat-input";
import { CurrentRun } from "@/components/current-run";
import { StatusStrip } from "@/components/status-strip";
import { SubagentPopout } from "@/components/subagent-popout";
import { TodoPopout } from "@/components/todo-popout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  useAgentNotifications,
  useBrowserNotifications,
} from "@/hooks/use-browser-notifications";
import { useChatStream } from "@/hooks/use-chat-stream";
import { useSession } from "@/hooks/use-session";

function ErrorAlert({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <Alert variant="destructive" className="border-destructive/40 bg-destructive/10">
      <ShieldAlert className="size-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}

export default function App() {
  const session = useSession();
  const chat = useChatStream({
    token: session.token,
    sessionId: session.sessionId,
    title: session.meta?.title,
    onRunComplete: session.refresh,
  });
  const notifications = useBrowserNotifications();
  useAgentNotifications({
    enabled: notifications.enabled,
    isStreaming: chat.isStreaming,
    error: chat.error,
    title: chat.currentRun ? undefined : session.meta?.title,
  });
  const [tokenDraft, setTokenDraft] = useState(session.token);
  const visibleTodoTasks = useMemo(
    () => chat.activity.todos.tasks.filter((task) => task.status !== "deleted"),
    [chat.activity.todos.tasks],
  );
  const activeSubagents = useMemo(
    () =>
      chat.activity.subagents.filter((subagent) =>
        ["launching", "running", "background", "waiting", "steered"].includes(subagent.status),
      ),
    [chat.activity.subagents],
  );
  const showRightRail = visibleTodoTasks.length > 0 || activeSubagents.length > 0;
  const connectionLabel = useMemo(() => {
    if (session.error) {
      return "connection issue";
    }
    if (session.token && (session.health || session.meta)) {
      return "connected";
    }
    if (session.token || session.isLoading) {
      return "connecting";
    }
    return "awaiting token";
  }, [session.error, session.health, session.isLoading, session.meta, session.token]);

  useEffect(() => {
    setTokenDraft(session.token);
  }, [session.token]);

  const handleReset = async () => {
    chat.clear();
    await session.reset();
  };

  const handleSend = async (prompt: string) => {
    if (prompt.trim() === "/new") {
      await handleReset();
      return;
    }

    await chat.send(prompt);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex h-dvh max-w-7xl flex-col p-3 md:p-4">
        {session.token ? (
          <div className="flex min-h-0 flex-1 gap-3">
            <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
              <ChatHeader
                sessionId={session.sessionId}
                title={session.meta?.title}
                busy={session.isLoading || chat.isStreaming}
                notificationPermission={notifications.permission}
                notificationsEnabled={notifications.enabled}
                onRequestNotificationPermission={notifications.requestPermission}
                onToggleNotifications={notifications.toggle}
                onSaveTitle={session.updateTitle}
                onReset={handleReset}
              />

              {session.error ? (
                <ErrorAlert title="Session error" message={session.error} />
              ) : null}
              {chat.error && !chat.currentRun ? (
                <ErrorAlert title="Run error" message={chat.error} />
              ) : null}

              <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                <div className="space-y-3">
                  <ChatHistory messages={chat.history} />
                  <CurrentRun run={chat.currentRun} />
                </div>
              </div>

              <div className="grid gap-2 border-t border-border/60 pt-3">
                <StatusStrip meta={session.meta} health={session.health} />
                <ChatInput
                  connectionLabel={connectionLabel}
                  slashCommands={session.meta?.slashCommands ?? []}
                  disabled={!session.sessionId || session.isLoading}
                  isStreaming={chat.isStreaming}
                  onSend={handleSend}
                  onStop={chat.stop}
                />
              </div>
            </div>

            {showRightRail ? (
              <div className="hidden min-h-0 w-80 shrink-0 flex-col gap-3 border-l border-border/60 pl-3 lg:flex">
                {visibleTodoTasks.length > 0 ? <TodoPopout tasks={visibleTodoTasks} /> : null}
                {activeSubagents.length > 0 ? <SubagentPopout subagents={activeSubagents} /> : null}
              </div>
            ) : null}
          </div>
        ) : (
          <Card className="border-border/60 bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <KeyRound className="size-4 text-primary" />
                Connect to the local Pi Web Agent
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 pt-0">
              <p className="text-sm text-muted-foreground">
                Paste the token shown by the Pi extension. It is stored in
                <code className="mx-1 border border-border/60 bg-muted/40 px-1.5 py-0.5 text-xs">
                  sessionStorage
                </code>
                and never written to disk.
              </p>
              <Textarea
                value={tokenDraft}
                onChange={(event) => setTokenDraft(event.target.value)}
                placeholder="x-pi-web-token"
                className="min-h-24 resize-y bg-background/70"
              />
              <div className="flex flex-col gap-3 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between">
                <div>
                  After saving the token, the app fetches health and session metadata.
                </div>
                <Button type="button" onClick={() => session.setToken(tokenDraft)}>
                  <Sparkles className="size-3.5" />
                  Save token
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
