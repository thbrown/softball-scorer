# Web app for recording batting data and optimizing lineps.

Live at https://softball.app/

## Usage:

1. Clone this repo `git clone https://github.com/thbrown/softball-scorer.git`.
2. Install node.js (8.10.0+) and npm (5.6.0+). Older versions _wont_ work.
3. From this repo's root directory, run `npm install`.
4. Run this command from the root directory:  
   `npm run build && node src-srv`.
5. Visit http://localhost:8888 in your browser.

## Additions

By default the app will run with in memory versions of database and cache.
If you'd like the setup Postgres and/or Redis follow these steps.

### Redis setup (tested on version 4.0.9)

#### Windows

Windows requires the use of Windows Subsystem for Linux (WSL)

1. Enable WSL by opening powershell as an admin and running this command (this will require a restart)
   `Enable-WindowsOptionalFeature -Online -FeatureName Microsoft-Windows-Subsystem-Linux`

2. Install Ubuntu 18.04 from the Microsoft store
   https://www.microsoft.com/en-us/p/ubuntu-1804/9n9tngvndl3q?activetab=pivot:overviewtab

3. Make some default user

4. Open Ubuntu in windows and follow the Ubuntu instructions below

#### Ubuntu

1. Make sure you are in the project root
1. `sudo apt-get update`
1. `sudo apt-get upgrade`
1. `sudo apt-get install redis-server`
1. `sudo redis-server` optionally supply `./redis.conf`
1. Update/Create ./src-svr/config.js with Redis server info (see ./src-svr/config-template.js)

redis.conf

```
requirepass "JtmpasEY9wSfu27XuYeK9Q4rdDPmXXeD_change_me"
port 6379

# Don't persist to disk
save ""
```

### TODO: Postgres setup

### TODO: Nginx

### TODO: email

### Google Cloud Platform

To use gcp instances for optimization computation see the README in the gcp folder.

## Development:

### Format/Lint

`npm i prettier -g`

`npm i eslint -g`

`npm i eslint-plugin-react@latest -g`
