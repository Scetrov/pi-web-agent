# Quality Standards

## Scope

These standards apply to the canonical documentation set:

- `README.md`
- `AGENTS.md`
- `docs/*.md`

They do not automatically apply to `thoughts/`, which is historical working
material rather than maintained product documentation.

## Required quality bar

Every canonical document must:

- serve a clear audience and purpose
- contain exactly one top-level heading
- signpost to adjacent documents when the topic crosses boundaries
- use the current product vocabulary consistently
- describe behavior that matches the shipped code
- be free from markdownlint errors under `pnpm docs:lint`
- contain Mermaid diagrams that pass `pnpm docs:check-mermaid`

## Terminology rules

- Use "Pi Web Access" for the project name.
- Use "web bridge" or "extension bridge" for `.pi/extensions/web-agent/`.
- Use "browser session" for the user-facing isolated session keyed by
  `sessionId`.
- Use "Pi session" or `AgentSession` only when referring to runtime internals.
- Use "current run" for in-progress stream state and "transcript history" for
  finalized messages.

## Update triggers

Update the docs when any of the following changes:

- HTTP routes, auth requirements, or event payloads
- session lifecycle, reset, abort, or metadata ownership
- frontend layout, status strip semantics, or current-run behavior
- environment variables, run commands, or build and validation flow
- documentation validation tooling itself

## Review checklist

- The right canonical files were updated for the change.
- The docs reflect the current code, not only the implementation plan.
- Commands are runnable from the stated working directory.
- Mermaid diagrams use supported syntax and reflect the surrounding text.
- Links resolve to the current canonical documents.

## Enforcement

The project enforces these standards with:

- `pnpm docs:lint`
- `pnpm docs:check-mermaid`
- `pnpm docs:validate`
- `.pre-commit-config.yaml`
- `.github/workflows/docs.yml`

If a change cannot satisfy this bar, it is not ready to merge.
