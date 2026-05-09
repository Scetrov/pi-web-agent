# Constitution

## Purpose

Pi Web Access exists to expose Pi through a browser without weakening the core
runtime model. The project should remain a thin, local-first bridge over Pi,
not a separate agent runtime.

## Core principles

1. Thin bridge over Pi

   The extension layer should translate, expose, and guard Pi capabilities.
   It should not duplicate session semantics or invent a second orchestration
   stack when Pi already provides the source primitives.

2. Isolated browser sessions

   Browser sessions are keyed by browser `sessionId` values and backed by
   isolated in-memory `AgentSession` instances. They must remain separate from
   terminal session history.

3. Backend owns durable session truth

   Session title, usage, tool inventory, resource health, and slash command
   inventory are backend-owned projections. Frontend heuristics are allowed for
   first-run UX only and must not replace backend truth.

4. Explicit transport contract

   The HTTP and NDJSON protocol is a product surface. Route shape, auth
   behavior, and stream event vocabulary must stay explicit, documented, and
   versionable through source control.

5. Local-first security defaults

   The default operational posture is loopback bind, token auth for `/api/*`,
   restrictive response headers, and no credential persistence to disk from the
   browser UI. Any broadening of that posture requires explicit design and doc
   updates.

6. Documentation is part of the product

   Canonical docs in `docs/` are maintained artifacts, not optional prose.
   Historical notes in `thoughts/` may explain why a choice was made, but they
   do not replace the maintained contract.

## Documentation governance

All canonical documents must comply with
[QUALITY_STANDARDS.md](QUALITY_STANDARDS.md).
That file defines the required bar for:

- markdownlint cleanliness
- Mermaid parser validity
- terminology consistency
- audience clarity and signposting
- update triggers and review expectations

Documentation updates are required in the same change as any material change to
architecture, design, protocol, operations, or workflow behavior.

## Canonical document set

- [ARCHITECTURE.md](ARCHITECTURE.md)
- [DESIGN.md](DESIGN.md)
- [PROTOCOL.md](PROTOCOL.md)
- [OPERATIONS.md](OPERATIONS.md)
- [STYLE_GUIDE.md](STYLE_GUIDE.md)
- [QUALITY_STANDARDS.md](QUALITY_STANDARDS.md)

## Decision rules

- Prefer solutions that keep the extension boundary small and auditable.
- Prefer backend normalization over frontend guesswork.
- Prefer additive documentation updates over relying on stale thought artifacts.
- If code and docs disagree, either fix the code or fix the docs before merge.

The project should stay easier to explain after each change, not harder.
