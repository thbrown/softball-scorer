# Web app for recording batting data and optimizing lineups.

Live at https://softball.app/

## Usage:

1. Clone this repo `git clone https://github.com/thbrown/softball-scorer.git`.
2. Install node.js (8.10.0+) and npm (5.6.0+). Older versions _wont_ work.
3. From this repo's root directory, run `npm install`.
4. Setup any optional features using the sections below if desired.
5. Run this command from the root directory:  
   `npm run build && node src-srv`.
6. Visit http://localhost:8888 in your browser.

## Optional features

The app will run without any of these enabled, but you can enable these for a production-like experience:

- Postgres for persistant storage (uses in-memory storage by default)
- Redis for caching/locking (uses in-memory caching/locking by default)
- Nginx as a forward proxy to enable TSL and rate limiting (no forward proxy by default, unencrypted, runs on port 8888, no rate limiting)

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

1. Make sure you are in the project root
1. `sudo apt-get update`
1. `sudo apt-get upgrade`
1. `screen`
1. `sudo apt-get install redis-server`
1. `sudo systemctl stop redis` Redis runs automatically. We will need to stop and restart to use our own config file.
1. `sudo redis-server` optionally supply `./redis.conf`
1. Press `Ctrl + A` then `d` to detach screen
1. Update/Create ./src-svr/config.js with Redis server info (see ./src-svr/config-template.js)

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

#### Linux

1. `sudo apt-get -y install postgresql postgresql-client postgresql-contrib`
1. `sudo -s`
1. `sudo -u postgres psql postgres`
1. `\password postgres` then follow the prompts to set some password
1. `\q`
1. `exit`
1. `sudo nano $(ls /etc/postgresql/*/main/pg_hba.conf)`
   Add this to the end of that file
   `host all all 0.0.0.0/0 md5`
1. `sudo nano $(ls /etc/postgresql/*/main/postgresql.conf)`
   Under `CONNECTIONS AND AUTHENTICATION` Uncomment and change `listen_addresses = 'localhost'` to `listen_addresses = '*'`
1. `sudo service postgresql restart`
1. Update/Create ./src-svr/config.js with Postgres server info (see ./src-svr/config-template.js)
1. Update your firewall rules to allow traffic on 5432 (or whatever port) if you'd like to connect remotely `1.2.3.4/32` `tcp:5432`

#### Windows

TODO

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
