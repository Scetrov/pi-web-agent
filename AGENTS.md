# AGENTS

This file is the autonomous-agent introduction to the repository.
The maintained source of truth is the `docs/` directory. The `thoughts/`
directory is historical input material and should only be consulted when you
need implementation background or decision history.

## Read order

1. [docs/CONSTITUTION.md](docs/CONSTITUTION.md)
2. [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
3. [docs/DESIGN.md](docs/DESIGN.md)
4. [docs/PROTOCOL.md](docs/PROTOCOL.md)
5. [docs/OPERATIONS.md](docs/OPERATIONS.md)
6. [docs/STYLE_GUIDE.md](docs/STYLE_GUIDE.md)
7. [docs/QUALITY_STANDARDS.md](docs/QUALITY_STANDARDS.md)

## Project summary

Pi Web Access provides a browser UI for Pi through a local web bridge.
The backend bridge lives in `.pi/extensions/web-agent/` and owns server
lifecycle, token auth, static file serving, per-browser session isolation,
metadata projection, and NDJSON event translation.
The frontend lives in `web/pi-web-ui/` and owns token entry, transcript
rendering, current-run state, slash command discovery, status strip display,
and browser notifications.

## Canonical implementation surfaces

- `.pi/extensions/web-agent/index.ts`: route dispatch and server lifecycle.
- `.pi/extensions/web-agent/session-store.ts`: isolated browser session storage,
  TTL cleanup, reset, and abort.
- `.pi/extensions/web-agent/meta.ts`: session metadata projection and slash
  command discovery.
- `.pi/extensions/web-agent/protocol.ts`: Pi session event to NDJSON event
  translation.
- `web/pi-web-ui/src/lib/api.ts`: browser fetch layer for all HTTP calls.
- `web/pi-web-ui/src/hooks/use-session.ts`: token, session bootstrap, metadata,
  title update, and reset flow.
- `web/pi-web-ui/src/hooks/use-chat-stream.ts`: streamed prompt handling,
  transcript finalization, and live run assembly.

## Working rules

- Treat `docs/` as canonical. If architecture, protocol, operations, or
  workflow behavior changes, update the matching docs in the same change.
- Preserve the local-first security model unless the task explicitly changes
  it: loopback binding, token auth for `/api/*`, and restrictive headers.
- Keep browser sessions isolated from terminal sessions. Do not merge those
  histories or identity models.
- The backend is the source of truth for session title, usage, tool inventory,
  and resource health. The frontend may derive temporary display state, but it
  should not replace backend ownership.
- Use `thoughts/` for background and rationale, not as the active product
  contract.

## Required validation

- Frontend changes: `cd web/pi-web-ui && corepack pnpm build`
- Documentation changes: `pnpm docs:validate`

## Change triggers for docs

- Route, header, auth, or event changes: update
  [docs/PROTOCOL.md](docs/PROTOCOL.md) and
  [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
- Session ownership, lifecycle, or runtime boundary changes: update
  [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and
  [docs/CONSTITUTION.md](docs/CONSTITUTION.md).
- UI layout, interaction model, or visual language changes: update
  [docs/DESIGN.md](docs/DESIGN.md) and
  [docs/STYLE_GUIDE.md](docs/STYLE_GUIDE.md).
- Tooling, commands, or environment changes: update
  [docs/OPERATIONS.md](docs/OPERATIONS.md).

If a task changes behavior, update the matching canonical docs in the same change.
