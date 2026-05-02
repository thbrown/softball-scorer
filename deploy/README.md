# Deployment helpers

## Structured logs in Cloud Logging (GCE VM + screen)

The server's logger (`server/src/logger.ts`) emits one structured JSON line per
entry when stdout is not a TTY, or when `logging.format` is set to `"json"` in
`server/config.jsonc`. Each line follows Cloud Logging's
[special-field contract](https://cloud.google.com/logging/docs/structured-logging)
so `severity`, `time`, and `logging.googleapis.com/sourceLocation` are picked up
automatically once the log line reaches the service.

### One-time VM setup

1. **Enable file logging in `server/config.jsonc`:**

    ```jsonc
    "logging": {
      "toFile": true,
      "colorOff": false,
      "format": "json"
    }
    ```

    Restart the app (see below). The server will append to
    `server/logs/server.log` from then on.

2. **Install the Google Cloud Ops Agent:**

    ```bash
    curl -sSO https://dl.google.com/cloudagents/add-google-cloud-ops-agent-repo.sh
    sudo bash add-google-cloud-ops-agent-repo.sh --also-install
    ```

3. **Drop in the agent config:**

    ```bash
    sudo cp deploy/google-cloud-ops-agent.yaml /etc/google-cloud-ops-agent/config.yaml
    # Verify the include_paths line matches where server/logs/server.log actually lives.
    sudo nano /etc/google-cloud-ops-agent/config.yaml
    sudo systemctl restart google-cloud-ops-agent
    ```

4. **Grant the VM's service account the Logs Writer role** if it doesn't already
   have it: IAM → the VM's service account → `roles/logging.logWriter`.

### Restarting the app (existing screen workflow)

Nothing about how you run the app needs to change — screen still works:

```bash
screen -r            # attach to the existing screen session
# Ctrl+C to stop the old app
git pull
yarn build           # or ./gcp-build.sh for memory-constrained VMs
yarn start:prod
# Ctrl+A, Ctrl+D to detach
```

The log file (`server/logs/server.log`) is append-only; restarts no longer wipe
history that the agent may not have shipped yet.

### Viewing logs

In the Cloud Logging UI (console.cloud.google.com/logs), filter with:

```
resource.type="gce_instance"
jsonPayload.accountId="<some account id>"
severity>=WARNING
```

### Dev / local

On a developer machine, stdout is a TTY so the logger falls back to the legacy
tab-separated colored format automatically. No config change needed.
