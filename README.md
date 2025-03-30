# Softball.app

## A web app for live recording batting data and leveraging that data to optimize lineups for Softball teams. And walkup songs too ☻!

Live at https://softball.app/

## Run/Build

1. Install yarn `[sudo] npm install -g yarn`
2. From this repo's root directory, run `install.sh`.
3. From this repo's root directory run `start.sh`.
4. Visit http://localhost:8889 in your browser.
5. Setup any optional features using the sections below.

## Format/Lint

Check for format errors:
`yarn fmt:check`

Fix format errors:
`yarn fmt:fix`

Check for lint errors:
`yarn lint:check`

Fix lint errors:
`yarn lint:fix`

## Testing

By default vitest runs in watch mode. If you want to run tests with a "pass"/"fail" then run the :prod version.

```
# run all tests
yarn test

# run client tests
cd client
yarn test

#run server tests
cd server
yarn test
```

You can run tests one module at a time with npx:

`cd client`
`npx vitest run <file-name>`

TODO: Figure out how to do this directly from vscode

## Dev

Dev mode starts its own web server to serve client assets and proxies and app server requests to the app server.

use `yarn start` if you want to start both dev server and softball.app server at the same time in the same terminal.

Alternatively, with two terminals you can run `yarn start:client` and `yarn start:server` or go into the respective directories and run `yarn start`.

## Prod

Production uses the app server to serve all client web assets.

If you would like to run the prod build do the following.

```
# build client js code, which produces <git root>/build/*
`yarn build`

# run server in prod mode which serves from <git root>/build/*
`yarn start:prod`

# All together
`yarn build && yarn start:prod`
```

## Deploy

From scratch:

```
# Create a new GCP compute instance (debian):
sudo apt-get install -y git-core
sudo apt-get install curl
git clone lone https://github.com/thbrown/softball-sim.git
curl -sL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install screen
screen
yarn
yarn build # or `./gcp-build.sh` if you encounter get memory limitations with local build
yarn start:prod
# Detach screen session (ctrl+A, ctrl+D)
```

On an already running machine:

1. Login to Google Cloud Platform
2. Open a web ssh session on the compute instance the application is running on
3. Type `screen -r`
4. Kill the app/web server (ctrl+c)
5. `git pull`
6. Update any config (uncommon)
7. `yarn build` or `./gcp-build.sh` if you encounter get memory limitations with local build && yarn start:prod`
8. `yarn start:prod`
9. Detach screen session (ctrl+A, ctrl+D)

## Optional features

The app will run without any of these enabled, but you can enable these for a production-like experience:

- Cloud storage for persistent storage (uses file system storage by default - see `./database` after using the app)
- Nginx as a reverse proxy to enable TLS and rate limiting (no reverse proxy by default, un-encrypted, runs on port 8888, no rate limiting)
- Cloud compute for running optimizations
- Email via mailgun

### Cloud storage setup

1. Acquire a Google Cloud Platform (GCP) account.
1. Install the google cloud SDK (https://cloud.google.com/sdk/docs/install-sdk)
1. In the server `config.js` of this app, specify `GcpBuckets` mode and bucket names, like so:

```
database: {
   mode: 'GcpBuckets',
   bucketNames: {
      data: 'sba-data',
      emailLookup: 'sba-email-lookup',
      tokenLookup: 'sba-token-lookup',
      publicIdLookup: 'sba-public-id-lookup',
   },
},
```

1. Edit the bucket names, bucket names must be globally unique and these ones will be taken.

1. Auth your machine and set proper permissions so the storage calls will succeed:

If you are running from a gcp compute instance, you can set "access scope" on instance create. The "Access Scope" required to use GCP storage is read/write or full.

If you are running on a local developer instance, you can auth with your Google credentials using the following command (using gcloud command line tools):

```
gcloud auth application-default login

```

You'll need to add the storage admin or editor rolls to the account you log in as.

If you still get errors about permissions after setting IAM, you'll need to check to make sure the bucket names in the config are globally unique.

For details and other ways to authenticate, see https://cloud.google.com/docs/authentication/provide-credentials-adc

### Nginx (as reverse proxy)

#### Linux

1. `sudo apt-get install nginx`
1. `sudo nano /etc/nginx/nginx.conf`
   Running on port 80, comment out all https related things
   TODO: publish nginx config
1. `sudo systemctl restart nginx`
1. `sudo apt-get install certbot python-certbot-nginx`
1. `sudo certbot certonly --nginx`
1. `sudo openssl dhparam -dsaparam 4096 -out /etc/ssl/certs/dhparam.pem` Generate dhparam.pem to improve security score, make sure this exists after you create it or Nginx will fail to start. I had to manually create `/etc/ssl/certs/dhparam.pem` and then run the command.
1. `sudo nano /etc/nginx/nginx.conf`
   Add back all the commented out https stuff
1. `sudo systemctl restart nginx`
1. Shut down the server, move it to port 8888, restart it
1. Optionally enable automatic renewals `sudo certbot renew --dry-run`

#### Windows

TODO

### Cloud compute

TODO

### Email

Get an api key from mailgun then you put that API key in the server config file (`src-srv/config.js`) which is generated from `config-template.js` when start the app server for the first time.

```
email: {
apiKey: 'yourapikeygoeshere',
domain: 'mg.softball.app',
restrictEmailsToDomain: 'softball.app', // Only allow emails to softball.app (in development we don't want to email randos by accident, set to null in production)
},
```

## Development:

### Schema

Data is passed to the backend via JSON and database implementations are responsible for persisting it.

The JSON schemas for this application are defined in `/shared/schema` and are defined using JSON Schema (https://json-schema.org/specification.html)

#### Types of fields

The JSON schema files are named with the following suffixes. We can mix and match these in other schema files to get the validations we need.

- public (or no suffix) - Client has read/write access to the field.
- private - This filed will never be sent ot the client.
- read-only - This field cen be read by the client but can not be updated by the client via sync (the patch(..) method in the db files).

#### Top level schemas

These are the schema files we actually do the validation against, they reference the other schema files in the schema directory.

- Full - All data associate with an account. This is what gets sent to the db layer.
- Client - Excludes private fields (e.g. password hashes). This schema is used to validate the JSON document stored by the browser.
- Export - Excludes the account node. Also excludes all private and all read-only fields. This schema is used to validate data handled by the export/import feature.

Note: JSON schema allows for the specification of a "readOnly" keyword. We don't use it because it doesn't have any affect on validation and the recommendation is to use the readOnly property to perform pre-processing (https://github.com/ajv-validator/ajv/issues/909) and generate READ or WRITE schemas accordingly. I don't want to write a JSON parser that does this, so we'll just define our read-only fields in their own files.

#### Schema metadata

Each of the top-level schemas described above contain a metadata property at their root. The metadata node consists of two properties

- Version - serial integer number, used in schema migration
- Scope - what top-level schema the document should be validated against [full, client, or export]

#### To modify the schema

1. Make your changes to the json schema files located in `./shared/schema`.
1. Define how existing JSON documents should be updated to match your new schema in `./shared/schema/schema-migration.js`
1. Increment `CURRENT_VERSION` at the top of `./shared/schema/schema-migration.js`
1. If you've added read-only or private fields you may need to write code to convert between different schema types in `./shared/schema/schema-validation.js`
1. If you've added read-only or private fields you may need to write code to prevent insecure patches in `./src-srv/patch-manager.js`
1. Write your code to use your new schema!

#### Service Worker

This app contains a service worker that's used to enable offline access. The service worker is only generated and used for production builds of the app.
You can enabled debugging (of the production code) by un-commenting `//mode: 'develop',` in the client vite config.

### Google Cloud Build

Note: this is broken, because the file structure has changed. Should be fixable, but isn't as important because the new GCP free instance manage memory better and can build the app just fine.

Cloud build:

```
cd scripts
./gcp-build.sh
cd ..
yarn start
```
