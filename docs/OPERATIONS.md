# Operations

## Local development flow

### Frontend build

```bash
cd web/pi-web-ui
corepack pnpm build
```

### Documentation validation

Run from the repository root:

```bash
pnpm docs:validate
```

### Pre-commit setup

```bash
python -m pip install pre-commit
pre-commit install
```

## Environment variables

The extension bridge reads its runtime configuration from environment variables.

| Variable | Default | Purpose |
| --- | --- | --- |
| `PI_WEB_HOST` | `127.0.0.1` | Bind host for the local bridge |
| `PI_WEB_PORT` | `4317` | Bind port for the local bridge |
| `PI_WEB_IDLE_TTL_MS` | `3600000` | Idle session expiry window |
| `PI_WEB_CLEANUP_INTERVAL_MS` | `300000` | TTL cleanup interval |
| `PI_WEB_TOKEN_HEADER` | `x-pi-web-token` | Header name used for API auth |
| `PI_WEB_TOKEN` | random 24-byte hex token | Fixed token override |
| `PI_WEB_EXTENSION_NAME` | `web-agent` | Display or extension identifier |
| `PI_WEB_STATIC_ROOT` | `web/pi-web-ui/dist` | Built frontend asset directory |

## Expected operator workflow

1. Build the frontend assets.
2. Start Pi from the repository root.
3. Read the displayed local URL and token from the Pi UI.
4. Open the URL in a browser.
5. Paste the token into the token gate.
6. Work in the browser session.

## Validation checklist

- Frontend changes: `cd web/pi-web-ui && corepack pnpm build`
- Docs changes: `pnpm docs:validate`
- Protocol changes: update `docs/PROTOCOL.md` and `docs/ARCHITECTURE.md`
- Environment or workflow changes: update this file and `README.md`

## Failure modes worth checking

- Invalid or missing token returns `401` on `/api/*` routes.
- Port collisions require overriding `PI_WEB_PORT`.
- Missing frontend build output breaks static serving.
- Diagram or markdown issues should be caught by the docs validation pipeline.

Keep the commands in this file runnable from the stated directories.
