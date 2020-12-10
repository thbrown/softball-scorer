# Web app for recording batting data and optimizing lineups.

Live at https://softball.app/

## Usage:

1. Clone this repo `git clone https://github.com/thbrown/softball-scorer.git`.
2. Install node.js (14.0.0+) and npm. Older versions of node _wont_ work.
   Ubuntu:

```
sudo apt-get install curl
curl -sL https://deb.nodesource.com/setup_12.x | sudo -E bash -
```

3. Install yarn `[sudo] npm install -g yarn`
4. From this repo's root directory, run `yarn`.
5. Setup any optional features using the sections below if desired.
6. Run this command from the root directory:  
   `yarn build && yarn start`
7. Visit http://localhost:8888 in your browser.

## Optional features

The app will run without any of these enabled, but you can enable these for a production-like experience:

- Postgres for persistant storage (uses in-memory storage by default)
- Redis for caching/locking (uses in-memory caching/locking by default)
- Nginx as a reverse proxy to enable TLS and rate limiting (no reverse proxy by default, unencrypted, runs on port 8888, no rate limiting)

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

2. `sudo apt-get update`
3. `sudo apt-get upgrade`
4. `sudo systemctl enable redis-server.service`
5. `sudo service redis-server restart`

To run redis with own config:

1. Make sure you are in the project root
2. `sudo systemctl stop redis` Redis runs automatically. We will need to stop and restart to use our own config file.
3. `sudo redis-server` optionally supply `./redis.conf`
4. Press `Ctrl + A` then `d` to detach screen
5. Update/Create ./src-svr/config.js with Redis server info (see ./src-svr/config-template.js)

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

### Postgres (tested on version 11)

After doing these steps you'll have to import the schema which isn't yet public

If you want to dump your schema for pull requests, use:
`sudo su psql`
`pg_dump <database_name> -F c > schema.backup`

#### Linux

Dev:

1. `sudo apt-get -y install postgresql postgresql-client postgresql-contrib`
2. `sudo service postgresql restart`
3. `sudo su postgres`
4. `psql`
5. You are now connected to postgres. Run the following sql commands to create a database.
6. `CREATE DATABASE softball;`
7. `CREATE USER softball WITH password 'softball';`
8. `ALTER USER softball WITH SUPERUSER;`
9. `\q`
10. Now you need to import the schema with pg_restore.
11. `pg_restore -d 'postgresql://softball:softball@localhost/softball' schema/schema.backup`
12. Create a config.js file from src-srv/config-template.js. Replace relevant fields with 'softball'.

Live:

1. `sudo apt-get -y install postgresql postgresql-client postgresql-contrib`
2. `sudo -s`
3. `sudo -u postgres psql postgres`
4. `\password postgres` then follow the prompts to set some password
5. `\q`
6. `exit`
7. `sudo nano $(ls /etc/postgresql/*/main/pg_hba.conf)`
   Add this to the end of that file
   `host all all 0.0.0.0/0 md5`
8. `sudo nano $(ls /etc/postgresql/*/main/postgresql.conf)`
   Under `CONNECTIONS AND AUTHENTICATION` Uncomment and change `listen_addresses = 'localhost'` to `listen_addresses = '*'`
9. `sudo service postgresql restart`
10. Update/Create ./src-svr/config.js with Postgres server info (see ./src-svr/config-template.js)
11. Update your firewall rules to allow traffic on 5432 (or whatever port) if you'd like to connect remotely `1.2.3.4/32` `tcp:5432`

#### Windows

Use WSL + Ubuntu and refer to Linux instructions

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

### Google Cloud Platform

To use gcp instances for optimization computation see the README in the gcp folder.

## Development:

### Format/Lint

`npm i prettier -g`

`npm i eslint -g`

`npm i eslint-plugin-react@latest -g`

### Format all files

From the root directory:
`npx prettier --write ./`

Then prevent minified assets from being formatted:
`git checkout assets`
