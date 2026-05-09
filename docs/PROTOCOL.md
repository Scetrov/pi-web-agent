# Protocol

## Overview

The browser talks to the extension bridge over local HTTP.
The browser fetch layer is implemented in `web/pi-web-ui/src/lib/api.ts`, which
wraps all JSON endpoints and creates the streaming request for chat runs.

## Auth model

- `GET /health` does not require auth.
- Every `/api/*` route requires the configured token header.
- The default header name is `x-pi-web-token`.
- Token comparison is timing-safe in the backend.

## HTTP routes

| Method | Route | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/health` | no | Returns coarse bridge status and static root information |
| `GET` | `/api/session/meta` | yes | Returns existing session metadata or creates a fresh browser session |
| `POST` | `/api/session/title` | yes | Persists a conversation title |
| `POST` | `/api/chat/abort` | yes | Aborts the active Pi run for the browser session |
| `POST` | `/api/session/reset` | yes | Disposes the current browser session and returns a fresh `sessionId` |
| `POST` | `/api/chat/stream` | yes | Starts a streamed run and emits NDJSON events |

## Browser fetch surface

The frontend centralizes HTTP access in these functions:

- `fetchHealth()`
- `fetchSessionMeta(sessionId, token)`
- `updateSessionTitle(sessionId, title, token)`
- `abortSession(sessionId, token)`
- `resetSession(sessionId, token)`
- `createChatStreamRequest(sessionId, prompt, token, title?)`

## NDJSON event contract

Each stream record is a standalone JSON object followed by a newline.

| Event | Purpose |
| --- | --- |
| `status` | Announces stream lifecycle state such as `started` |
| `thinking` | Appends model thinking text |
| `assistant_delta` | Appends assistant-visible response text |
| `tool_start` | Announces a tool invocation |
| `tool_update` | Carries tool progress or partial result data |
| `tool_end` | Carries tool completion, result, or tool error |
| `done` | Signals successful run completion and includes final metadata subset |
| `error` | Signals an assistant or stream-level error |

## Stream handling rules

- The frontend appends the user prompt to history immediately.
- Assistant output stays in `currentRun` until a `done` event is received.
- Tool events for todo and subagent modules are normalized into side-panel
  activity.
- When `done` arrives, the frontend finalizes the assistant message into
  transcript history and refreshes session metadata.
- If an error arrives, the current run is marked as errored and the message is
  not finalized into history unless a later `done` event occurs.

## Static asset serving

- Non-API `GET` and `HEAD` requests are served from the configured static root.
- Missing paths fall back to `index.html` for SPA routing.
- Path traversal is blocked before serving a file.

Unknown client assumptions should be made explicit here before they spread into code.
