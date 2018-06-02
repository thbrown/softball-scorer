# This script creates a self signed certificate so we can use https on localhost
# Run from git bash on windows
mkdir certs
cd certs
winpty openssl genrsa -des3 -out server.key 1024
winpty openssl req -new -key server.key -out server.csr
winpty openssl x509 -req -days 1095 -in server.csr -signkey server.key -out server.crt

# This will remove the password from server.key so nginx can consume it
winpty openssl rsa -in server.key -out server.key