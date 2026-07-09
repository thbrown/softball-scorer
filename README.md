# Softball.app

A web app for live recording batting data and leveraging that data to optimize lineups for softball teams. And walkup songs too ☻!

Live at https://softball.app/

## Quick Start (local dev)

1. `yarn install` (also copies config templates on first run; uses the Yarn 4 version pinned in `.yarn/releases/`)
2. `yarn start`
3. Visit http://localhost:8889

## Format / Lint

```
yarn fmt:check      # check formatting
yarn fmt:fix        # auto-fix formatting
yarn lint:check     # check lint
yarn lint:fix       # auto-fix lint
```

## Testing

```
yarn test                        # all tests
cd client && yarn test           # client only
cd server && yarn test           # server only
cd client && npx vitest run <file>  # single file
```

### Playwright UI tests

Requires the app to be running (`yarn start`).

```
cd playwright-test && npx playwright test           # headless
cd playwright-test && npx playwright test --headed  # with browser
```

## Dev mode

`yarn start` runs the Vite dev server, the app server, and a CSS variable watcher together.

Alternatively run them separately:
- `yarn start:client` — Vite dev server (http://localhost:8889)
- `yarn start:server` — app server (http://localhost:8888)
- `cd client && yarn watch:css` — regenerate CSS variables on theme changes

## Prod build

```
yarn build          # compile client → build/
yarn start:prod     # serve from build/ on port 8888
```

## CSS

Theme tokens live in `client/src/css/theme.ts`. The `prebuild` hook auto-generates `client/src/css/variables.css` before each build. In dev mode the watcher handles it automatically. To regenerate manually: `yarn generate:css-vars`.

## Deploy (GCP)

Run `deploy/setup.sh` on the VM — it works on both fresh instances and existing ones:

```bash
bash deploy/setup.sh
```

The script handles: system packages, Node.js 24, corepack/Yarn, git pull, `yarn install`, Cloud Build, Ops Agent (Cloud Logging), and starting the server in a `screen` session named `softball`.

**Manual steps the script can't do:**
1. Fill in secrets in `server/config.jsonc` (created from template on first run)
2. Set `"logging": { "toFile": true, "format": "json" }` in `server/config.jsonc` to enable Cloud Logging
3. Grant `roles/logging.logWriter` to the VM's service account (GCP Console → IAM)
4. Nginx / SSL — set up separately if needed (see Optional features below)

See `deploy/README.md` for Cloud Logging query examples and details.

## Optional features

The app runs without any of these, but they're needed for a full production setup:

### Cloud storage

In `server/config.jsonc`, set `database.mode` to `GcpBuckets` and supply bucket names:

```jsonc
"database": {
  "mode": "GcpBuckets",
  "bucketNames": {
    "data": "your-data-bucket",
    "emailLookup": "your-email-lookup-bucket",
    "tokenLookup": "your-token-lookup-bucket",
    "publicIdLookup": "your-public-id-lookup-bucket"
  }
}
```

Bucket names must be globally unique. On a GCP instance set the "Access Scope" to storage read/write. Locally, authenticate with `gcloud auth application-default login`.

### Nginx (reverse proxy + TLS)

```bash
sudo apt-get install nginx certbot python3-certbot-nginx
```

1. `sudo nano /etc/nginx/nginx.conf` — configure to proxy port 80 → localhost:8888; comment out all HTTPS blocks for now
2. `sudo systemctl restart nginx`
3. `sudo certbot certonly --nginx` — obtain TLS cert
4. `sudo openssl dhparam -dsaparam 4096 -out /etc/ssl/certs/dhparam.pem` — generate DH params (improves security score); manually create the file first if the command fails
5. `sudo nano /etc/nginx/nginx.conf` — uncomment the HTTPS blocks, point to the cert paths certbot printed
6. `sudo systemctl restart nginx`
7. Optionally enable auto-renewal: `sudo certbot renew --dry-run`

### Email (Mailgun)

In `server/config.jsonc`:

```jsonc
"email": {
  "apiKey": "your-mailgun-key",
  "domain": "mg.softball.app",
  "restrictEmailsToDomain": null
}
```

### Cloud compute for optimizations

Set `optimizationCompute.mode` to `"gcp"` in `server/config.jsonc` and supply the GCP params.

## Schema

Data is passed to the backend as JSON; all schemas are in `shared/schema` (JSON Schema format).

**Field access levels:**
- `public` (no suffix) — client read/write
- `private` — never sent to client
- `read-only` — client can read but not patch

**Top-level schemas:**
- `Full` — all data, used for DB layer
- `Client` — excludes private fields, validated in browser
- `Export` — excludes private and read-only fields, used for import/export

Each schema has a `metadata` node with `version` (migration serial) and `scope`.

**To modify the schema:**
1. Edit files in `shared/schema`
2. Add a migration in `shared/schema/schema-migration.js` and bump `CURRENT_VERSION`
3. Update `shared/schema/schema-validation.js` for any new private/read-only fields
4. Update `server/src/patch-manager.ts` if new fields need patch restrictions

## Service worker

The service worker is disabled in dev by default (guarded by `import.meta.env.PROD` in `client/src/index.tsx`). To test it in dev, remove that condition. Enable Workbox debug output by uncommenting `mode: 'develop'` in `client/vite.config.ts`.
