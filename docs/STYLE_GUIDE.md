# Style Guide

## Purpose

This guide defines the visual and written style for the maintained Pi Web
Access experience and its canonical documentation.

## Visual language

The current UI is terminal-inspired rather than consumer-app polished.
It should feel precise, sparse, and operational.

### Visual rules

- Prefer squared edges and hard borders over soft, rounded surfaces.
- Keep the layout dense enough for working sessions, not marketing pages.
- Use the monospace-first presentation already established in the app.
- Treat the warm primary accent as a signal color, not a decorative wash.
- Use subtle motion only for status emphasis such as connection readiness or
  thinking indicators.

### Current implementation cues

- Typography: JetBrains Mono Variable
- Shape language: zero-radius surfaces and badges
- Layout tone: border-first, panel-based, high information density
- Status language: short labels, uppercase microcopy, muted metadata

## Interaction style

- Keep primary actions explicit and close to the relevant state.
- Prefer small, inspectable controls over hidden automation.
- Preserve clear transitions between pending, streaming, done, and error.
- Do not hide tool activity that matters for operator trust.

## Naming style

- Use `sessionId` for the browser session identifier.
- Use `current run` for in-progress stream state.
- Use `transcript history` for finalized messages.
- Use `web bridge` or `extension bridge` for the backend HTTP layer.
- Use `resource health` for diagnostics sourced from extensions, skills,
  prompts, and themes.

## Documentation style

- Write for a technical reader who wants exact behavior quickly.
- Prefer short declarative sentences over promotional language.
- Link to the canonical neighboring document when a topic crosses concerns.
- Use tables for contracts and responsibilities.
- Use Mermaid diagrams for system and flow explanations when they add clarity.
- Treat `thoughts/` as background and `docs/` as the maintained contract.

## Markdown conventions

- Use one H1 per file.
- Prefer fenced code blocks.
- Keep headings concrete and topic-scoped.
- Keep list items parallel and concise.
- Use inline code for routes, headers, filenames, environment variables, and
  identifiers.

When in doubt, choose clarity over flourish.
