# Prompt: Recreate the Pi Web Agent

**Objective:**
Build a three-layer "Pi Web Agent" system consisting of a Pi terminal extension (backend), a local HTTP bridge, and a React-based browser frontend. The goal is to provide a browser-based chat interface for Pi that is isolated from the terminal session and supports real-time tool/assistant streaming.

## 0. Constitution

* Prefer well understood and well maintained 3rd party libraries over custom implementations, especially for complex features like HTTP servers and markdown rendering.
* Web interface should be beautiful and based around Shadcn/ui components, but the backend should be minimal and focused on securely bridging Pi's runtime to the browser.

## 1. System Architecture

Recreate a three-layer stack:

* **Layer 1: Pi Host Session:** The core runtime that loads the extension.
* **Layer 2: Local HTTP Bridge (Extension):** Owned by `.pi/extensions/web-agent/index.ts`. It must handle server lifecycle, auth token validation, frontend asset serving, and map browser `sessionId`s to isolated in-memory `AgentSession` objects.
* **Layer 3: Browser Frontend:** A React SPA that stores the auth token in `sessionStorage` and the `sessionId` in `localStorage`.

## 2. Backend Implementation (`.pi/extensions/web-agent/index.ts`)

* **Server Logic:** Start a local Node.js HTTP server bound to `127.0.0.1`.
* **Session Management:** Maintain an in-memory map of `WebSession` objects keyed by `sessionId`. Each session must be isolated from the terminal chat history.
* **Resource Loader:** Use `DefaultResourceLoader` for browser sessions to ensure visibility into skills and extensions.
* **Markdown Rendering:** Use a well-known library like `llm-ui` for consistent markdown rendering in the frontend, ensure streaming, syntax highlighting, and tool output are all supported.
* **Cleanup:** Implement a TTL (Time-to-Live) cleanup loop (e.g., 1-hour idle timeout) to dispose of inactive in-memory sessions.

## 3. HTTP API & Protocol

The server must implement the following routes and protocols:

* **Auth:** Protect all `/api/*` routes with an `x-pi-web-token` header compared using timing-safe equality, ensure the token is displayed in the TUI, and can be pre-defined via environment variables.
* **Status/Metadata:**
  * `GET /health`: Returns coarse server info like `cwd` and `sessionCount`.
  * `GET /api/session/meta`: Returns session-scoped data including usage stats (cost/tokens), model info, active tools, and skill/extension counts/issues.
* **Streaming (`POST /api/chat/stream`):**
  * Use **NDJSON (Newline Delimited JSON)** for streaming.
  * Event types must include: `status`, `thinking`, `assistant_delta`, `tool_start`, `tool_update`, `tool_end`, `done`, and `error` (include others as required).

## 4. Frontend Implementation (`web/pi-web-ui/`)

* **Stack:** Vite, React, TypeScript, Tailwind v4, and shadcn/ui.
* **Preset:** Use the `shadcn-ui` Vite React template for rapid development, use the shadcn UI prefix `--preset b3lCGkW4w` for consistency.
* **Layout Shell:**
  * **Fixed Header:** Displays the `sessionId`, an editable conversation title, and a compact icon-based status strip.
  * **Scrollable Middle:** Renders message history and a "current run" state for active streams.
  * **Fixed Footer:** Contains the prompt textarea with `Meta+Enter` shortcuts and session control buttons (Send, Stop, Reset).
* **Status Strip:** Use compact icons with color cues (neutral, warning, destructive, success) to display PWD, usage/cost, model level, and resource health.
* **Title Heuristic:** If no title is saved on the backend, generate a short, actionable title from the first user message by stripping "soft" lead-ins and taking the first sentence.

## 5. Security Model

* Bind the server to loopback (`127.0.0.1`) by default, make this configurable via environment variables.
* Generate a random auth token at startup if not provided via environment variables.
* Apply restrictive CSP (Content Security Policy) headers, `no-store` cache headers, and `frame-deny` headers to all responses.
* Enable OIDC-based authentication for advanced users who want to integrate with external identity providers, but keep it optional for simplicity.

## 6. Data Flow for Prompts

1. Frontend POSTs JSON prompt to `/api/chat/stream`.
2. Extension validates the token and retrieves/creates the `WebSession`.
3. Extension subscribes to `AgentSession` events and translates them into NDJSON.
4. Frontend reads the stream via a `fetch` stream reader, updating the `currentRun` UI incrementally.
5. On the `done` event, the frontend finalizes the message into history and refreshes session metadata.

