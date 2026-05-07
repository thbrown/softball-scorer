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
#   4. dhparam: On first run, dhparam generation is very slow on a small VM.
#      Consider generating locally and copying over before running this script:
#        openssl dhparam -out dhparam.pem 2048
#        gcloud compute scp dhparam.pem <instance>:/etc/ssl/certs/dhparam.pem ...
# ---------------------------------------------------------------------------

set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCREEN_SESSION="softball"
SERVICE_NAME="softball"
NODE_MAJOR=24
DOMAIN="softball.app"
CERTBOT_EMAIL="softballdotapp@gmail.com"

step() {
  echo ""
  echo "=== $* ==="
}

# ---------------------------------------------------------------------------
step "1/11  System packages"
# ---------------------------------------------------------------------------
sudo apt-get update -qq
sudo apt-get install -y -qq git curl lsof screen nginx certbot python3-certbot-nginx

# ---------------------------------------------------------------------------
step "2/11  Node.js ${NODE_MAJOR}"
# ---------------------------------------------------------------------------
if node --version 2>/dev/null | grep -q "^v${NODE_MAJOR}\."; then
  echo "Node $(node --version) already installed — skipping."
else
  echo "Installing Node.js ${NODE_MAJOR} via NodeSource..."
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | sudo -E bash -
  sudo apt-get install -y nodejs
fi

# ---------------------------------------------------------------------------
step "3/11  Corepack (required for Yarn 4.x)"
# ---------------------------------------------------------------------------
sudo corepack enable
echo "corepack enabled."

# ---------------------------------------------------------------------------
step "4/11  Git pull"
# ---------------------------------------------------------------------------
cd "$REPO_DIR"
git pull

# ---------------------------------------------------------------------------
step "5/11  Yarn install"
# ---------------------------------------------------------------------------
yarn install

# ---------------------------------------------------------------------------
step "6/11  GCP Cloud Build (builds the client and downloads artifacts)"
# ---------------------------------------------------------------------------
"$REPO_DIR/gcp-build.sh"

# ---------------------------------------------------------------------------
step "7/11  Server config"
# ---------------------------------------------------------------------------
if grep -q '"secretkey": null' "$REPO_DIR/server/config.jsonc" 2>/dev/null; then
  echo ""
  echo "  NOTICE: server/config.jsonc still contains null secret values."
  echo "  Fill in session.secretkey, email.apiKey, etc. before trusting this server:"
  echo "    nano $REPO_DIR/server/config.jsonc"
  echo ""
fi

# ---------------------------------------------------------------------------
step "8/11  nginx + dhparam"
# ---------------------------------------------------------------------------
# Generate dhparam if missing. Skipped if already present — generation is
# very slow on small VMs; see manual step 4 above to pre-generate locally.
if [ -f /etc/ssl/certs/dhparam.pem ]; then
  echo "dhparam already exists — skipping generation."
else
  echo "Generating dhparam (2048-bit) with low CPU priority..."
  echo "TIP: Pre-generate locally to skip this: see manual step 4 in this script."
  sudo nice -n 19 openssl dhparam -out /etc/ssl/certs/dhparam.pem 2048
fi

# Deploy HTTP-only config if no cert yet (needed for certbot ACME challenge),
# otherwise deploy the full HTTPS config.
if sudo certbot certificates 2>/dev/null | grep -q "Domains:.*${DOMAIN}"; then
  echo "SSL cert found — deploying full nginx config."
  sudo cp "$REPO_DIR/deploy/nginx.conf" /etc/nginx/nginx.conf
else
  echo "No SSL cert yet — deploying HTTP-only config for ACME challenge."
  sudo tee /etc/nginx/nginx.conf > /dev/null << NGINXEOF
worker_processes 1;
events { worker_connections 1024; }
http {
  server {
    listen 80;
    server_name ${DOMAIN};
    location / { proxy_pass http://localhost:8888; }
  }
}
NGINXEOF
fi
sudo nginx -t
sudo systemctl enable nginx
sudo systemctl reload-or-restart nginx
echo "nginx configured and running."

# ---------------------------------------------------------------------------
step "9/11  SSL cert (Let's Encrypt)"
# ---------------------------------------------------------------------------
if sudo certbot certificates 2>/dev/null | grep -q "Domains:.*${DOMAIN}"; then
  echo "Valid cert already exists — skipping acquisition."
else
  echo "Obtaining certificate for ${DOMAIN}..."
  sudo certbot certonly --nginx -d "$DOMAIN" \
    --non-interactive --agree-tos -m "$CERTBOT_EMAIL" \
    --deploy-hook "systemctl reload nginx"
  echo "Cert obtained — deploying full nginx config."
  sudo cp "$REPO_DIR/deploy/nginx.conf" /etc/nginx/nginx.conf
  sudo nginx -t && sudo systemctl reload nginx
fi

# ---------------------------------------------------------------------------
step "10/11  Google Cloud Ops Agent (Cloud Logging)"
# ---------------------------------------------------------------------------
if ! systemctl is-active --quiet google-cloud-ops-agent 2>/dev/null; then
  echo "Installing Ops Agent..."
  curl -sSo /tmp/add-google-cloud-ops-agent-repo.sh \
    https://dl.google.com/cloudagents/add-google-cloud-ops-agent-repo.sh
  sudo bash /tmp/add-google-cloud-ops-agent-repo.sh --also-install
  rm -f /tmp/add-google-cloud-ops-agent-repo.sh
else
  echo "Ops Agent already running."
fi
sudo cp "$REPO_DIR/deploy/google-cloud-ops-agent.yaml" /etc/google-cloud-ops-agent/config.yaml
sudo systemctl restart google-cloud-ops-agent
echo "Ops Agent config updated and restarted."

# ---------------------------------------------------------------------------
step "11/11  systemd service"
# ---------------------------------------------------------------------------
sudo cp "$REPO_DIR/deploy/softball.service" /etc/systemd/system/${SERVICE_NAME}.service
sudo systemctl daemon-reload
sudo systemctl enable "$SERVICE_NAME"
sudo systemctl restart "$SERVICE_NAME"
echo "Service started. Attach with: screen -r ${SCREEN_SESSION}"

# ---------------------------------------------------------------------------
echo ""
echo "================================================================"
echo "  Setup complete!"
echo ""
echo "  Attach to server:  screen -r ${SCREEN_SESSION}"
echo "  Follow logs:       tail -f ${REPO_DIR}/server/logs/server.log"
echo "  Service status:    sudo systemctl status ${SERVICE_NAME}"
echo ""
echo "  MANUAL STEPS STILL REQUIRED (if not done already):"
echo "  1. IAM: grant roles/logging.logWriter to the VM service account"
echo "  2. server/config.jsonc: set logging.toFile=true, format=\"json\""
echo "  3. server/config.jsonc: fill in all secret/key fields"
echo "================================================================"
echo ""
