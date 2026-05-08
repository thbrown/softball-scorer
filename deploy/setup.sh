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
# BOOTSTRAP — on a brand-new VM, git won't be installed yet so you can't
# clone this repo. Run this one-liner first:
#
#   sudo apt-get update -qq && sudo apt-get install -y git
#   git clone https://github.com/thbrown/softball-scorer.git ~/softball-scorer
#   cd ~/softball-scorer && bash deploy/setup.sh
#
# ---------------------------------------------------------------------------
# MANUAL STEPS — this script cannot do these for you:
#
#   1. IAM: Grant the VM's service account the following roles before running:
#        roles/cloudbuild.builds.editor  (Cloud Build)
#        roles/storage.objectAdmin       (on the build bucket)
#        roles/logging.logWriter         (Ops Agent)
#      GCP Console → IAM & Admin → find the VM service account → Add role.
#      Step 0 of this script will verify permissions and exit if any are missing.
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
#   4. dhparam: Normally generated once by Cloud Build and downloaded
#      automatically in step 8. If you need to generate it manually instead:
#        openssl dhparam -out /tmp/dhparam.pem 2048
#        sudo mv /tmp/dhparam.pem /etc/ssl/certs/dhparam.pem
#      Or copy from another machine:
#        gcloud compute scp <other-instance>:/etc/ssl/certs/dhparam.pem /tmp/dhparam.pem --zone=us-central1-a
#        sudo mv /tmp/dhparam.pem /etc/ssl/certs/dhparam.pem
#
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
step "0/12  IAM permissions check"
# ---------------------------------------------------------------------------
_check_permissions() {
  local project
  project=$(gcloud config list --format 'value(core.project)' 2>/dev/null)
  if [ -z "$project" ]; then
    echo "ERROR: Could not determine GCP project — is gcloud installed and authenticated?"
    exit 1
  fi

  # Format: "PERMISSION|PURPOSE"
  local -a CHECKS=(
    "cloudbuild.builds.create|Cloud Build (gcp-build.sh)"
    "cloudbuild.builds.get|Cloud Build (gcp-build.sh)"
    "storage.objects.create|GCS build artifacts (gcp-build.sh)"
    "storage.objects.delete|GCS build artifacts (gcp-build.sh)"
    "storage.objects.get|GCS build artifacts (gcp-build.sh)"
    "storage.objects.list|GCS build artifacts (gcp-build.sh)"
    "logging.logEntries.create|Cloud Logging (Ops Agent)"
  )

  # Build JSON array of permission strings for the REST API call.
  local perms_json
  perms_json=$(printf '%s\n' "${CHECKS[@]}" | cut -d'|' -f1 \
    | awk '{printf "%s\"%s\"", (NR>1?",":""), $0} END{print ""}' \
    | sed 's/^/{"permissions":[/; s/$/]}/')

  local token granted
  token=$(gcloud auth print-access-token 2>/dev/null) || true
  if [ -z "$token" ]; then
    echo "  WARNING: Could not get gcloud access token — skipping permission check."
    return
  fi

  granted=$(curl -sf -X POST \
    -H "Authorization: Bearer $token" \
    -H "Content-Type: application/json" \
    -d "$perms_json" \
    "https://cloudresourcemanager.googleapis.com/v1/projects/${project}:testIamPermissions" \
    2>/tmp/iam_check_err) || true

  if [ -z "$granted" ]; then
    echo "  WARNING: IAM permission check failed — skipping."
    cat /tmp/iam_check_err 2>/dev/null | sed 's/^/    /'
    echo "  Continuing anyway — the script will fail at the relevant step if a permission is missing."
    return
  fi

  local -a missing=()
  for entry in "${CHECKS[@]}"; do
    local perm="${entry%%|*}"
    local purpose="${entry##*|}"
    if ! echo "$granted" | grep -qF "$perm"; then
      missing+=("  ✗  ${perm}  (needed for: ${purpose})")
    fi
  done

  if [ ${#missing[@]} -eq 0 ]; then
    echo "  All required permissions present."
    return
  fi

  echo ""
  echo "ERROR: Missing permissions on the VM service account:"
  for m in "${missing[@]}"; do echo "$m"; done
  echo ""
  echo "  Typical role fixes (GCP Console → IAM & Admin → VM service account):"
  echo "    cloudbuild.*       → roles/cloudbuild.builds.builder"
  echo "    storage.objects.*  → roles/storage.objectAdmin  (scoped to the build bucket)"
  echo "    logging.*          → roles/logging.logWriter"
  exit 1
}
_check_permissions

# ---------------------------------------------------------------------------
step "1/12  System packages"
# ---------------------------------------------------------------------------
sudo apt-get update -qq
sudo apt-get install -y -qq git curl lsof screen nginx certbot python3-certbot-nginx

# ---------------------------------------------------------------------------
step "2/12  Node.js ${NODE_MAJOR}"
# ---------------------------------------------------------------------------
if node --version 2>/dev/null | grep -q "^v${NODE_MAJOR}\."; then
  echo "Node $(node --version) already installed — skipping."
else
  echo "Installing Node.js ${NODE_MAJOR} via NodeSource..."
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | sudo -E bash -
  sudo apt-get install -y nodejs
fi

# ---------------------------------------------------------------------------
step "3/12  Corepack (required for Yarn 4.x)"
# ---------------------------------------------------------------------------
sudo corepack enable
echo "corepack enabled."

# ---------------------------------------------------------------------------
step "4/12  Git pull"
# ---------------------------------------------------------------------------
cd "$REPO_DIR"
git pull

# ---------------------------------------------------------------------------
step "5/12  Yarn install"
# ---------------------------------------------------------------------------
yarn install

# ---------------------------------------------------------------------------
step "6/12  GCP Cloud Build (builds the client and downloads artifacts)"
# ---------------------------------------------------------------------------
"$REPO_DIR/gcp-build.sh"

# ---------------------------------------------------------------------------
step "7/12  Server config"
# ---------------------------------------------------------------------------
if grep -q '"secretkey": null' "$REPO_DIR/server/config.jsonc" 2>/dev/null; then
  echo ""
  echo "  NOTICE: server/config.jsonc still contains null secret values."
  echo "  Fill in session.secretkey, email.apiKey, etc. before trusting this server:"
  echo "    nano $REPO_DIR/server/config.jsonc"
  echo ""
fi

# ---------------------------------------------------------------------------
step "8/12  nginx + dhparam"
# ---------------------------------------------------------------------------
# dhparam is generated once by Cloud Build (cloudbuild.yml) and stored in GCS.
# Download it here rather than generating on the VM — generation is very slow
# on micro instances and effectively locks them up.
if [ -f /etc/ssl/certs/dhparam.pem ]; then
  echo "dhparam already exists — skipping download."
else
  PROJECT=$(gcloud config list --format 'value(core.project)' 2>/dev/null)
  echo "Downloading dhparam from gs://${PROJECT}_cloudbuild/dhparam.pem ..."
  gsutil cp "gs://${PROJECT}_cloudbuild/dhparam.pem" /tmp/dhparam.pem
  sudo mv /tmp/dhparam.pem /etc/ssl/certs/dhparam.pem
  echo "dhparam installed."
fi

# Check for cert by file — more reliable than `certbot certificates` which
# fails if another certbot instance is running (e.g. the renewal timer).
_cert_exists() {
  [ -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]
}

# Deploy HTTP-only config if no cert yet (needed for certbot ACME challenge),
# otherwise deploy the full HTTPS config.
if _cert_exists; then
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
step "9/12  SSL cert (Let's Encrypt)"
# ---------------------------------------------------------------------------
if [ "${SKIP_SSL:-}" = "1" ]; then
  echo "SKIP_SSL=1 — skipping cert acquisition (test mode)."
elif _cert_exists; then
  echo "Valid cert already exists — skipping acquisition."
else
  # Stop the systemd certbot renewal timer so it doesn't hold the lock while we run.
  sudo systemctl stop certbot.timer certbot.service 2>/dev/null || true
  # Kill any lingering certbot process (e.g. from a previous failed run).
  if pgrep -x certbot > /dev/null; then
    echo "Killing lingering certbot process..."
    sudo pkill -x certbot || true
    sleep 2
  fi
  # GCP VMs often only have IPv4 but glibc prefers IPv6 by default, causing
  # "Network is unreachable" when certbot tries acme-v02.api.letsencrypt.org.
  # Prefer IPv4 mapped addresses for this session.
  if ! grep -q "^precedence ::ffff:0:0/96  100" /etc/gai.conf 2>/dev/null; then
    echo "precedence ::ffff:0:0/96  100" | sudo tee -a /etc/gai.conf > /dev/null
  fi

  # Wait for outbound HTTPS connectivity before handing off to certbot.
  echo "Checking connectivity to Let's Encrypt..."
  for i in $(seq 1 12); do
    curl -sf --max-time 5 https://acme-v02.api.letsencrypt.org/directory > /dev/null && break
    echo "  Not reachable yet (${i}/12) — waiting 5s..."
    sleep 5
    if [ "$i" -eq 12 ]; then
      echo "ERROR: Cannot reach Let's Encrypt after 60s. Check firewall/network."
      exit 1
    fi
  done

  echo "Obtaining certificate for ${DOMAIN}..."
  sudo certbot certonly --nginx -d "$DOMAIN" \
    --non-interactive --agree-tos -m "$CERTBOT_EMAIL" \
    --deploy-hook "systemctl reload nginx"
  echo "Cert obtained — deploying full nginx config."
  sudo cp "$REPO_DIR/deploy/nginx.conf" /etc/nginx/nginx.conf
  sudo nginx -t && sudo systemctl reload nginx
  # Re-enable the renewal timer now that our certbot run is done.
  sudo systemctl start certbot.timer 2>/dev/null || true
fi

# ---------------------------------------------------------------------------
step "10/12  Google Cloud Ops Agent (Cloud Logging)"
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
step "11/12  systemd service"
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
