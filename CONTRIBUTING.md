# Contributing Guide

Thanks for contributing to Pi Web Access. This document explains how to get set up locally, what validation is expected, and how to prepare changes for review.

## Before You Start

- Read [README.md](README.md) and the relevant documents under [docs/](docs/).
- Search existing issues and pull requests before starting new work.
- Open an issue or discussion before making large or breaking changes.

The `docs/` directory is the maintained project contract for architecture, protocol, design, operations, and quality expectations.

## Development Setup

### Prerequisites

- Node.js 22
- Corepack enabled
- pnpm
- Python, if you want to install the optional pre-commit hook

### Install Dependencies

From the repository root:

```bash
corepack enable
corepack pnpm install --frozen-lockfile
```

For the frontend workspace:

```bash
cd web/pi-web-ui
corepack pnpm install --frozen-lockfile
```

Optional pre-commit setup:

```bash
python -m pip install pre-commit
pre-commit install
```

## Local Validation

Run the checks that match your change before opening a pull request.

### Documentation changes

From the repository root:

```bash
pnpm docs:validate
```

### Frontend changes

```bash
cd web/pi-web-ui
corepack pnpm build
```

## Coding Standards

- Keep changes focused and avoid unrelated refactors.
- Match the existing TypeScript, React, and ESM conventions in the touched area.
- Prefer small, readable changes over wide rewrites.
- Add comments only when the code would otherwise be difficult to understand.
- Avoid adding dependencies unless they clearly reduce complexity or maintenance cost.

## Documentation Requirements

If your change modifies behavior, update the corresponding canonical documents in the same pull request.

- Route, header, auth, or event changes: update `docs/PROTOCOL.md` and `docs/ARCHITECTURE.md`
- Session lifecycle or ownership changes: update `docs/ARCHITECTURE.md` and `docs/CONSTITUTION.md`
- UI or interaction changes: update `docs/DESIGN.md` and `docs/STYLE_GUIDE.md`
- Tooling, commands, or environment changes: update `docs/OPERATIONS.md` and `README.md`

## Pull Request Process

1. Fork the repository and create a focused branch.
2. Make the smallest change necessary to solve the problem.
3. Update tests, documentation, or validation coverage where appropriate.
4. Run the relevant local validation commands.
5. Open a pull request with a clear title and description.
6. Link related issues when applicable.
7. Address review feedback with follow-up commits unless maintainers request a different flow.

## Commit Messages

Clear, descriptive commit messages are expected. Conventional Commits are recommended.

Examples:

```text
feat(ui): add session reset confirmation
fix(protocol): handle empty stream chunk
docs(operations): clarify frontend build command
```

## Security Reports

Do not use public issues for security vulnerabilities. Follow the process in [SECURITY.md](SECURITY.md).

## Code of Conduct

By participating in this project, you agree to follow [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
