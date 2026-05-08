import type { HealthResponse, SessionMeta } from "@/types/chat";

export const TOKEN_STORAGE_KEY = "pi-web-token";
export const SESSION_STORAGE_KEY = "pi-web-session-id";

interface RequestOptions extends RequestInit {
  token?: string;
}

async function parseJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed with ${response.status}`);
  }
  return (await response.json()) as T;
}

function withAuthHeaders(token?: string, init?: HeadersInit): Headers {
  const headers = new Headers(init);
  if (token) {
    headers.set("x-pi-web-token", token);
  }
  return headers;
}

async function requestJson<T>(
  input: RequestInfo | URL,
  init: RequestOptions = {},
): Promise<T> {
  const response = await fetch(input, {
    ...init,
    headers: withAuthHeaders(init.token, init.headers),
  });
  return parseJson<T>(response);
}

export function fetchHealth(): Promise<HealthResponse> {
  return requestJson<HealthResponse>("/health");
}

export function fetchSessionMeta(
  sessionId: string | undefined,
  token: string,
): Promise<SessionMeta> {
  const url = new URL("/api/session/meta", window.location.origin);
  if (sessionId) {
    url.searchParams.set("sessionId", sessionId);
  }
  return requestJson<SessionMeta>(url, { method: "GET", token });
}

export function updateSessionTitle(
  sessionId: string,
  title: string,
  token: string,
): Promise<SessionMeta> {
  return requestJson<SessionMeta>("/api/session/title", {
    method: "POST",
    token,
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({ sessionId, title }),
  });
}

export function abortSession(
  sessionId: string,
  token: string,
): Promise<{ ok: boolean }> {
  return requestJson<{ ok: boolean }>("/api/chat/abort", {
    method: "POST",
    token,
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({ sessionId }),
  });
}

export function resetSession(
  sessionId: string | undefined,
  token: string,
): Promise<{ sessionId: string }> {
  return requestJson<{ sessionId: string }>("/api/session/reset", {
    method: "POST",
    token,
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({ sessionId }),
  });
}

export function createChatStreamRequest(
  sessionId: string,
  prompt: string,
  token: string,
  title?: string,
): Promise<Response> {
  return fetch("/api/chat/stream", {
    method: "POST",
    headers: withAuthHeaders(token, {
      "content-type": "application/json",
    }),
    body: JSON.stringify({ sessionId, prompt, title }),
  });
}
