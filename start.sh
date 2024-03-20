#!/bin/bash
initConfigFiles() {
    if [ ! -f ./client/src/config.js ]; then
        echo "No ./client/src/config.js file was found, creating from template"
        cp ./client/src/config.template.js ./client/src/config.js
    fi

    if [ ! -f ./server/config.jsonc ]; then
        echo "No ./server/config.jsonc file was found, creating from template"
        cp ./server/config.template.jsonc ./server/config.jsonc
    fi
}

initConfigFiles
yarn start