import { useCallback, useEffect, useRef, useState } from "react";

export type NotificationPermission = "default" | "denied" | "granted";

export interface UseBrowserNotificationsState {
  permission: NotificationPermission;
  enabled: boolean;
  /** Request browser permission to show notifications. */
  requestPermission: () => Promise<void>;
  /** Toggle notifications on/off (no-op if permission denied). */
  toggle: () => void;
}

const NotificationCtor = (typeof globalThis !== "undefined" ? globalThis : window) as {
  Notification?: {
    permission: NotificationPermission;
    requestPermission: () => Promise<NotificationPermission>;
    new (title: string, options?: { body?: string; tag?: string }): void;
  };
};

function canNotify(): boolean {
  return (
    typeof NotificationCtor.Notification !== "undefined" &&
    NotificationCtor.Notification.permission === "granted"
  );
}

function send(title: string, body: string) {
  if (!canNotify() || document.hasFocus()) {
    return;
  }
  try {
    new NotificationCtor.Notification!(title, {
      body,
      tag: "pi-web-agent",
    });
  } catch {
    // Notification constructor can throw in some environments
  }
}

export function useBrowserNotifications(): UseBrowserNotificationsState {
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof NotificationCtor.Notification !== "undefined"
      ? NotificationCtor.Notification.permission
      : "denied",
  );

  const enabledRef = useRef(permission === "granted");

  const requestPermission = useCallback(async () => {
    if (typeof NotificationCtor.Notification === "undefined") {
      return;
    }
    const result = await NotificationCtor.Notification.requestPermission();
    setPermission(result);
    enabledRef.current = result === "granted";
  }, []);

  const toggle = useCallback(() => {
    if (permission === "denied") {
      return;
    }
    enabledRef.current = !enabledRef.current;
  }, [permission]);

  // Sync enabled from persisted permission
  useEffect(() => {
    enabledRef.current =
      permission === "granted" && enabledRef.current;
  }, [permission]);

  return {
    permission,
    enabled: enabledRef.current,
    requestPermission,
    toggle,
  };
}

/**
 * Fire a browser notification when the agent needs the user's attention.
 * Only fires when the document does NOT have focus (user is in another tab/app).
 */
export function useAgentNotifications(
  opts: {
    enabled: boolean;
    isStreaming: boolean;
    error?: string;
    title?: string;
    onDone?: () => void;
  }
) {
  const wasStreaming = useRef(opts.isStreaming);

  useEffect(() => {
    if (!opts.enabled) {
      wasStreaming.current = opts.isStreaming;
      return;
    }

    // Transition: streaming → not streaming = agent finished
    if (wasStreaming.current && !opts.isStreaming) {
      if (opts.error) {
        send("Pi Web Agent — Error", opts.error);
      } else {
        send(
          "Pi Web Agent — Ready",
          opts.title ? `Agent finished: "${opts.title}"` : "Agent response ready",
        );
      }
    }

    wasStreaming.current = opts.isStreaming;
  }, [opts.isStreaming, opts.enabled, opts.error, opts.title]);
}
