#!/usr/bin/env bash
# deploy/setup.sh — Idempotent setup/update script for the softball-scorer GCP VM.
#
# Safe to run on a brand-new Debian instance or an existing one.
# Each section checks current state before acting, so re-running is a no-op
# for anything already up to date.
#
# Usage (from any directory):
#   bash /path/to/softball-scorer/deploy/setup.sh
#
# ---------------------------------------------------------------------------
# MANUAL STEPS — this script cannot do these for you:
#
#   1. IAM: Grant the VM's service account roles/logging.logWriter so the
#      Ops Agent can ship logs to Cloud Logging.
#      GCP Console → IAM & Admin → find the VM service account → Add role.
#
#   2. server/config.jsonc (logging): Enable structured file logging:
#        "logging": { "toFile": true, "colorOff": false, "format": "json" }
#      Without toFile:true the Ops Agent has no file to tail.
#
#   3. server/config.jsonc (secrets): Fill in session.secretkey, email.apiKey,
#      recapcha.secretkey, youtube.apikey, etc. A template is at
#      server/config.template.jsonc — the script copies it on first run but
#      leaves all secret values as null.
#
#   4. SSL / nginx: HTTPS termination is not handled here. Set up nginx or a
#      GCP load balancer separately if needed.
# ---------------------------------------------------------------------------

set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCREEN_SESSION="softball"
NODE_MAJOR=24

step() {
  echo ""
  echo "=== $* ==="
}

# ---------------------------------------------------------------------------
step "1/9  System packages"
# ---------------------------------------------------------------------------
sudo apt-get update -qq
sudo apt-get install -y -qq git curl lsof screen

# ---------------------------------------------------------------------------
step "2/9  Node.js ${NODE_MAJOR}"
# ---------------------------------------------------------------------------
if node --version 2>/dev/null | grep -q "^v${NODE_MAJOR}\."; then
  echo "Node $(node --version) already installed — skipping."
else
  echo "Installing Node.js ${NODE_MAJOR} via NodeSource..."
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | sudo -E bash -
  sudo apt-get install -y nodejs
fi

# ---------------------------------------------------------------------------
step "3/9  Corepack (required for Yarn 4.x)"
# ---------------------------------------------------------------------------
sudo corepack enable
echo "corepack enabled."

# ---------------------------------------------------------------------------
step "4/9  Git pull"
# ---------------------------------------------------------------------------
cd "$REPO_DIR"
git pull

# ---------------------------------------------------------------------------
step "5/9  Yarn install"
# ---------------------------------------------------------------------------
# Corepack reads the packageManager field and installs yarn@4.x automatically.
yarn install

# ---------------------------------------------------------------------------
step "6/9  GCP Cloud Build (builds the client and downloads artifacts)"
# ---------------------------------------------------------------------------
"$REPO_DIR/gcp-build.sh"

# ---------------------------------------------------------------------------
step "7/9  Server config"
# ---------------------------------------------------------------------------
# Config templates are copied by the postinstall hook (scripts/init-configs.js)
# which already ran as part of `yarn install` above. Remind the user to fill
# in secrets if server/config.jsonc is still using template defaults.
if grep -q '"secretkey": null' "$REPO_DIR/server/config.jsonc" 2>/dev/null; then
  echo ""
  echo "  NOTICE: server/config.jsonc still contains null secret values."
  echo "  Fill in session.secretkey, email.apiKey, etc. before trusting this server:"
  echo "    nano $REPO_DIR/server/config.jsonc"
  echo ""
fi

# ---------------------------------------------------------------------------
step "8/9  Google Cloud Ops Agent (Cloud Logging)"
# ---------------------------------------------------------------------------
if ! systemctl is-active --quiet google-cloud-ops-agent 2>/dev/null; then
  echo "Installing Ops Agent..."
  curl -sSO https://dl.google.com/cloudagents/add-google-cloud-ops-agent-repo.sh
  sudo bash add-google-cloud-ops-agent-repo.sh --also-install
  rm -f add-google-cloud-ops-agent-repo.sh
else
  echo "Ops Agent already running."
fi

# Always refresh the agent config so changes to deploy/google-cloud-ops-agent.yaml
# are picked up on subsequent runs.
sudo cp "$REPO_DIR/deploy/google-cloud-ops-agent.yaml" /etc/google-cloud-ops-agent/config.yaml
sudo systemctl restart google-cloud-ops-agent
echo "Ops Agent config updated and restarted."

# ---------------------------------------------------------------------------
step "9/9  Starting server in screen session '${SCREEN_SESSION}'"
# ---------------------------------------------------------------------------
# Kill any existing session so we start clean.
if screen -list 2>/dev/null | grep -q "\.${SCREEN_SESSION}[[:space:]]"; then
  echo "Stopping existing screen session..."
  screen -S "$SCREEN_SESSION" -X quit || true
  sleep 1
fi

# `exec bash` at the end keeps the window open if the server exits, so you
# can read the crash output when you attach.
screen -dmS "$SCREEN_SESSION" bash -c "cd '$REPO_DIR' && yarn start:prod; exec bash"
echo "Server started."

# ---------------------------------------------------------------------------
echo ""
echo "================================================================"
echo "  Setup complete!"
echo ""
echo "  Attach to server:  screen -r ${SCREEN_SESSION}"
echo "  Follow logs:       tail -f ${REPO_DIR}/server/logs/server.log"
echo ""
echo "  MANUAL STEPS STILL REQUIRED (if not done already):"
echo "  1. IAM: grant roles/logging.logWriter to the VM service account"
echo "     GCP Console > IAM & Admin > VM service account > Add role"
echo "  2. server/config.jsonc: set logging.toFile=true, format=\"json\""
echo "  3. server/config.jsonc: fill in all secret/key fields"
echo "  4. SSL/nginx: configure separately if HTTPS is needed"
echo "================================================================"
echo ""
