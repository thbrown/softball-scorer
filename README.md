# Web app for recording batting data and optimizing lineups.

Live at https://softball.app/

## Usage:

1. Clone this repo `git clone https://github.com/thbrown/softball-scorer.git`.
2. Install node.js (14.0.0+) and npm. Older versions of node _wont_ work.
   Ubuntu:

```
sudo apt-get install curl
curl -sL https://deb.nodesource.com/setup_14.x | sudo -E bash -
```

3. Install yarn `[sudo] npm install -g yarn`
4. From this repo's root directory, run `yarn`.
5. Setup any optional features using the sections below if desired.
6. Build the shared source, build the client source, and start the server. From the root directory:  
   `yarn --cwd ./shared build && yarn build && yarn start`
7. Visit http://localhost:8888 in your browser.

## Optional features

The app will run without any of these enabled, but you can enable these for a production-like experience:

- Cloud storage for persistent storage (uses file system storage by default - see `./database` after using the app)
- Redis for caching/locking (uses in-memory caching/locking by default)
- Nginx as a reverse proxy to enable TLS and rate limiting (no reverse proxy by default, un-encrypted, runs on port 8888, no rate limiting)
- Cloud compute for running optimizations
- Email via mailgun

### Cloud storage setup

1. Acquire a Google Cloud Platform (GCP) account.
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

````

gcloud auth application-default login

```

You'll need to add the storage admin or editor rolls to the account you log in as.

If you still get errors about permissions after setting IAM, you'll need to check to make sure the bucket names in the config are globally unique.

For details and other ways to authenticate, see https://cloud.google.com/docs/authentication/provide-credentials-adc

### Redis setup (tested on version 5.0.3)

#### Windows

Windows requires the use of Windows Subsystem for Linux (WSL)

1. Enable WSL by opening powershell as an admin and running this command (this will require a restart)
   `Enable-WindowsOptionalFeature -Online -FeatureName Microsoft-Windows-Subsystem-Linux`

2. Install Ubuntu 18.04 from the Microsoft store
   https://www.microsoft.com/en-us/p/ubuntu-1804/9n9tngvndl3q?activetab=pivot:overviewtab

3. Make some default user

4. Open Ubuntu in windows and follow the Ubuntu instructions below

#### Linux

1. `sudo apt-get update`
2. `sudo apt-get upgrade`
3. `sudo apt install redis-server`
4. `redis-server`
5. Update/Create ./src-srv/config.js with Redis server info (see ./src-srv/config-template.js)

To run redis with own config:

1. Make sure you are in the project root
2. `sudo systemctl stop redis` Redis runs automatically. We will need to stop and restart to use our own config file.
3. `sudo redis-server` optionally supply `./redis.conf`
4. Press `Ctrl + A` then `d` to detach screen
5. Update/Create ./src-srv/config.js with Redis server info (see ./src-srv/config-template.js)

Example redis.conf

```

# Require a password

requirepass "JtmpasEY9wSfu27XuYeK9Q4rdDPmXXeD_change_me"

# Specify the port

port 6379

# If memory fills up, evict the least recently used key, even if it has no expiration

maxmemory-policy allkeys-lru

# Optionally allow other non-localhost machines to connect (req obviously if the app server is running on another machine)

```

Some other useful commands:
`sudo systemctl enable redis-server.service`
`sudo service redis-server restart`

### Nginx

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
domain: 'mg.softball.app', // Example domain
restrictEmailsToDomain: 'softball.app', // Only allow emails to softball.app (in development we don't want to email randos by accident, set to null in production)
},

```

## Development:

### Data Storage and JSON Schema

Data is passed to the backend via JSON and database implementations are responsible for persisting it.

The JSON schemas for this application are defined in `/shared/scheam` and are defined using JSON Shema (https://json-schema.org/specification.html)

#### Types of fields

The JSON schema files are named with the following suffixes. We can mix and match these in other schema files to get the validations we need.

- public (or no suffix) - Client has read/write access to the field.
- private - This filed will never be sent ot the client.
- read-only - This field cen be read by the client but can not be updated by the client via sync (the patch(..) method in the db files).

### Top level schemas

These are the schema files we actually do the validation against, they reference the other schema files in the schema directory.

- Full - All data associate with an account. This is what get's sent to the db layer.
- Client - Excludes private fields. This schema is used to validate the JSON document stored by the browser.
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

### Format/Lint

`npm i prettier -g`

`npm i eslint -g`

`npm i eslint-plugin-react@latest -g`

### Format all files

From the root directory:
`npx prettier --write ./`

Then prevent minified assets from being formatted:
`git checkout assets`

export APP_WRITE_LOG_TO_FILE=true

### Google Cloud Build

Note: this is broken, because the file structure has changed. Should be fixable, but isn't as important because the new GCP free instance manage memory better and can build the app just fine.

Cloud build:

`./gcp-build.sh && yarn start`
```
````
