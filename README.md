# Pi Web Access

Pi Web Access is a local browser interface for the Pi coding agent.
It combines a loopback-only web bridge in `.pi/extensions/web-agent/` with a
React single-page app in `web/pi-web-ui/` so browser users can run isolated Pi
sessions, stream responses live, inspect tool activity, and manage session
metadata without sharing the terminal chat history.

## What the project does

- Exposes a local HTTP bridge from the Pi host session to the browser.
- Creates isolated in-memory browser sessions keyed by a browser `sessionId`.
- Streams assistant text, thinking output, and tool lifecycle events over
  newline-delimited JSON.
- Serves a browser UI for transcript history, live run state, slash commands,
  todo activity, subagent activity, and session health.
- Keeps security local-first with loopback binding, token auth, and restrictive
  response headers.

## Repository map

- `.pi/extensions/web-agent/`: local HTTP bridge, auth, session store, metadata,
  stream protocol translation, and static asset serving.
- `web/pi-web-ui/`: Vite, React, TypeScript, Tailwind v4, and shadcn/ui browser
  application.
- `docs/`: canonical project documentation.
- `thoughts/`: design, research, planning, and handoff artifacts used as input
  during implementation. These files are historical context, not the current
  contract.

## Start here

- [docs/CONSTITUTION.md](docs/CONSTITUTION.md): non-negotiable project
  principles and documentation governance.
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): runtime structure, component
  responsibilities, and prompt flow.
- [docs/DESIGN.md](docs/DESIGN.md): product goals, layout anatomy, and state
  model.
- [docs/PROTOCOL.md](docs/PROTOCOL.md): HTTP routes, auth rules, and NDJSON
  event contract.
- [docs/OPERATIONS.md](docs/OPERATIONS.md): local development, environment
  variables, and validation commands.
- [docs/STYLE_GUIDE.md](docs/STYLE_GUIDE.md): UI, naming, and documentation
  style guidance.
- [docs/QUALITY_STANDARDS.md](docs/QUALITY_STANDARDS.md): documentation quality
  bar enforced by linting and diagram validation.

## Quick start

1. Build the frontend:

   ```bash
   cd web/pi-web-ui
   corepack pnpm build
   ```

2. Start Pi with the extension available from the repository root. Optional web
   settings can be provided with environment variables such as
   `PI_WEB_PORT` or `PI_WEB_TOKEN`.

3. Open the URL shown by the Pi TUI, then paste the displayed token into the
   browser UI.

4. Send a prompt. The browser will:

   - fetch `/health` and `/api/session/meta`
   - open `POST /api/chat/stream`
   - finalize transcript history on the `done` event
   - refresh session metadata when the run completes

## Documentation hygiene

Canonical markdown is validated with markdownlint and Mermaid syntax checks.
Run the full docs check from the repository root:

```bash
pnpm docs:validate
```

If you use `pre-commit`, install the hook once:

```bash
pre-commit install
```

This keeps local documentation checks aligned with CI.
