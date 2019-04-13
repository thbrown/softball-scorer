# Web app for recording batting data and optimizing lineps.

Live at https://softball.app/

## Usage:

1. Clone this repo.
2. Install node.js (8.10.0+) and npm (5.6.0+). Older versions _wont_ work.
3. From this repo's root directory, run `npm install`.
4. Run this command from the root directory:  
   `npm run build && node src-srv`.
5. Visit http://localhost:8888 in your browser.

## Redis setup (optional)

0. Make sure you are in the project root

### Windows

#### With default config

1. Install and run docker for Windows https://docs.docker.com/docker-for-windows/
2. In powershell run `docker pull redis`
3. In powershell run `docker run --name softballApp -p 6379:6379/tcp redis redis-server` (Start Redis on port 6379)
4. Update/Create ./src-svr/config.js with redis server info (see ./src-svr/config-template.js)

#### With custom config

It gets a bit more complicated with a Redis config file. These steps have not been tested:

1. Share your drive with docker. Unfortunatly your windows user must have a password to do so(https://forums.docker.com/t/how-to-share-windows-drives-with-a-user-without-password/22933/4)
2. Run docker with volume
3. In powershell run `docker run --name softballApp -p 6379:6379/tcp -v ./redis.conf:/usr/local/etc/redis/redis.conf redis redis-server /usr/local/etc/redis/redis.conf` (Start Redis on port 6379)
4. Be lucky. I never got this working because I didn't want to make a windows user w/ a password.

Useful commands to clean up docker processes
`docker kill $(docker ps -q)`

`docker rm $(docker ps -a -q)`

### Ubuntu

1. `sudo apt-get install redis-server`
2. `sudo redis-server ./redis.conf`
3. Update/Create ./src-svr/config.js with redis server info (see ./src-svr/config-template.js)

## Postgres setup (optional)

TODO

## Development:

### Format/Lint

`npm i prettier -g`

`npm i eslint -g`

`npm i eslint-plugin-react@latest -g`
