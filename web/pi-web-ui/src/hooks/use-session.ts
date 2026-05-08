import { useCallback, useEffect, useState } from "react";
import {
  fetchHealth,
  fetchSessionMeta,
  resetSession,
  SESSION_STORAGE_KEY,
  TOKEN_STORAGE_KEY,
  updateSessionTitle,
} from "@/lib/api";
import type { HealthResponse, SessionMeta } from "@/types/chat";

export interface UseSessionState {
  token: string;
  setToken: (next: string) => void;
  clearToken: () => void;
  sessionId?: string;
  health?: HealthResponse;
  meta?: SessionMeta;
  isLoading: boolean;
  error?: string;
  refresh: () => Promise<void>;
  updateTitle: (title: string) => Promise<void>;
  reset: () => Promise<void>;
}

function readStorage(key: string): string {
  if (typeof window === "undefined") {
    return "";
  }
  return (
    window.sessionStorage.getItem(key) ?? window.localStorage.getItem(key) ?? ""
  );
}

export function useSession(): UseSessionState {
  const [token, setTokenState] = useState(() => {
    if (typeof window === "undefined") return "";
    if (window.sessionStorage.getItem(TOKEN_STORAGE_KEY)) {
      return window.sessionStorage.getItem(TOKEN_STORAGE_KEY)!;
    }
    const params = new URLSearchParams(window.location.search);
    const queryToken = params.get("token");
    if (queryToken) {
      params.delete("token");
      const newUrl = params.toString()
        ? `${window.location.pathname}?${params.toString()}${window.location.hash}`
        : `${window.location.pathname}${window.location.hash}`;
      window.history.replaceState(null, "", newUrl);
      return queryToken;
    }
    return "";
  });
  const [sessionId, setSessionIdState] = useState(
    () => readStorage(SESSION_STORAGE_KEY) || undefined,
  );
  const [health, setHealth] = useState<HealthResponse>();
  const [meta, setMeta] = useState<SessionMeta>();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();

  const persistSessionId = useCallback((next?: string) => {
    setSessionIdState(next);
    if (typeof window === "undefined") return;
    if (next) {
      window.localStorage.setItem(SESSION_STORAGE_KEY, next);
    } else {
      window.localStorage.removeItem(SESSION_STORAGE_KEY);
    }
  }, []);

  const setToken = useCallback((next: string) => {
    const normalized = next.trim();
    setTokenState(normalized);
    if (typeof window === "undefined") return;
    if (normalized) {
      window.sessionStorage.setItem(TOKEN_STORAGE_KEY, normalized);
    } else {
      window.sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  }, []);

  const clearToken = useCallback(() => {
    setToken("");
    setMeta(undefined);
    setError(undefined);
  }, [setToken]);

  const refresh = useCallback(async () => {
    if (!token) {
      return;
    }
    setIsLoading(true);
    setError(undefined);
    try {
      const [nextHealth, nextMeta] = await Promise.all([
        fetchHealth(),
        fetchSessionMeta(sessionId, token),
      ]);
      setHealth(nextHealth);
      setMeta(nextMeta);
      persistSessionId(nextMeta.sessionId);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setIsLoading(false);
    }
  }, [token, sessionId, persistSessionId]);

  const updateTitle = useCallback(
    async (title: string) => {
      if (!token || !sessionId) return;
      setIsLoading(true);
      setError(undefined);
      try {
        const nextMeta = await updateSessionTitle(sessionId, title, token);
        setMeta(nextMeta);
        persistSessionId(nextMeta.sessionId);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : String(cause));
      } finally {
        setIsLoading(false);
      }
    },
    [token, sessionId, persistSessionId],
  );

  const reset = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setError(undefined);
    try {
      const next = await resetSession(sessionId, token);
      persistSessionId(next.sessionId);
      const [nextHealth, nextMeta] = await Promise.all([
        fetchHealth(),
        fetchSessionMeta(next.sessionId, token),
      ]);
      setHealth(nextHealth);
      setMeta(nextMeta);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setIsLoading(false);
    }
  }, [token, sessionId, persistSessionId]);

  useEffect(() => {
    if (!token) {
      setMeta(undefined);
      return;
    }
    void refresh();
  }, [token, refresh]);

  return {
    token,
    setToken,
    clearToken,
    sessionId,
    health,
    meta,
    isLoading,
    error,
    refresh,
    updateTitle,
    reset,
  };
}
