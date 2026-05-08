import { useEffect, useState } from "react";
import { Bell, BellOff, BellRing, PencilLine, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { NotificationPermission } from "@/hooks/use-browser-notifications";

interface ChatHeaderProps {
  sessionId?: string;
  title?: string;
  busy?: boolean;
  notificationPermission: NotificationPermission;
  notificationsEnabled: boolean;
  onRequestNotificationPermission: () => Promise<void>;
  onToggleNotifications: () => void;
  onSaveTitle: (next: string) => Promise<void>;
  onReset: () => Promise<void>;
}

export function ChatHeader({
  sessionId,
  title,
  busy = false,
  notificationPermission,
  notificationsEnabled,
  onRequestNotificationPermission,
  onToggleNotifications,
  onSaveTitle,
  onReset,
}: ChatHeaderProps) {
  const [draft, setDraft] = useState(title ?? "New browser session");
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    setDraft(title ?? "New browser session");
  }, [title]);

  return (
    <div className="flex flex-col gap-2 border-b border-border/60 pb-3">
      <div className="flex items-start gap-2.5">
        <img src="/favicon.svg" alt="" className="mt-0.5 size-5 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <div className="min-w-0 flex-1 truncate font-heading text-base font-semibold text-foreground md:text-lg">
              {title ?? draft}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setIsExpanded((current) => !current)}
              aria-label={isExpanded ? "Hide title editor" : "Edit title"}
              title={isExpanded ? "Hide title editor" : "Edit title"}
              disabled={busy}
            >
              <PencilLine className="size-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => {
                if (notificationPermission === "default") {
                  void onRequestNotificationPermission();
                } else {
                  onToggleNotifications();
                }
              }}
              aria-label={
                notificationPermission === "denied"
                  ? "Notifications blocked by browser"
                  : notificationsEnabled
                    ? "Disable notifications"
                    : "Enable notifications"
              }
              title={
                notificationPermission === "denied"
                  ? "Notifications blocked by browser settings"
                  : notificationsEnabled
                    ? "Disable browser notifications"
                    : "Enable browser notifications"
              }
              disabled={notificationPermission === "denied"}
            >
              {notificationPermission === "denied" ? (
                <BellOff className="size-3.5 text-muted-foreground" />
              ) : notificationsEnabled ? (
                <BellRing className="size-3.5 text-primary" />
              ) : (
                <Bell className="size-3.5" />
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => void onReset()}
              aria-label="Reset conversation"
              title="Reset conversation"
              disabled={busy}
            >
              <RotateCcw className="size-3.5" />
            </Button>
          </div>
          <div className="truncate text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            Session: {sessionId ?? "not ready"}
          </div>
        </div>
      </div>

      {isExpanded ? (
        <Input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => void onSaveTitle(draft)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void onSaveTitle(draft);
              setIsExpanded(false);
            }
            if (event.key === "Escape") {
              event.preventDefault();
              setDraft(title ?? "New browser session");
              setIsExpanded(false);
            }
          }}
          placeholder="Conversation title"
          className="h-8 bg-background/50"
        />
      ) : null}
    </div>
  );
}
