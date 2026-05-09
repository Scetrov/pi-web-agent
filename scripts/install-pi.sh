#!/usr/bin/env bash
#
# install-pi.sh — Install pi coding agent + all extensions using pi's own CLI
#
set -euo pipefail

BOLD='\033[1m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m'

log()  { echo -e "${CYAN}>>>${NC} $*"; }
ok()   { echo -e "${GREEN} ✔${NC} $*"; }

# ── 0. Prereq checks ──────────────────────────────────────────────
command -v bun >/dev/null 2>&1 || {
  echo "bun not found — install from https://bun.sh"
  exit 1
}
command -v pi >/dev/null 2>&1 || {
  echo "pi not found — installing pi first..."
  bun install -g @earendil-works/pi-coding-agent
  export PATH="$(bun pm bin -g):$PATH"
}

log "Pi:   $(pi --version 2>/dev/null || echo 'installed')"
log "Bun:  $(bun --version)"

# ── 1. Pi coding agent (via bun global) ───────────────────────────
log "Installing pi coding agent (bun global)..."
bun install -g @earendil-works/pi-coding-agent
ok "Pi coding agent installed"

# ── 2. Pi extensions (via pi install) ─────────────────────────────
# RPIV plugins
log "Installing rpiv plugins..."
pi install npm:@juicesharp/rpiv-advisor
pi install npm:@juicesharp/rpiv-args
pi install npm:@juicesharp/rpiv-ask-user-question
pi install npm:@juicesharp/rpiv-btw
pi install npm:@juicesharp/rpiv-i18n
pi install npm:@juicesharp/rpiv-pi
pi install npm:@juicesharp/rpiv-todo
pi install npm:@juicesharp/rpiv-web-tools
ok "RPIV plugins installed"

# Tools
log "Installing context-mode..."
pi install npm:context-mode
pi install npm:@m64/browser-tools

log "Installing agent extras..."
pi install npm:@blackbelt-technology/pi-agent-dashboard
pi install npm:@samfp/pi-memory
pi install npm:@tintinweb/pi-subagents
ok "Agent extras installed"

# ── 3. Verify installed extensions ────────────────────────────────
echo ""
log "Installed extensions:"
pi list

echo ""
ok "All done. Run 'pi' to start."