#!/bin/bash
initConfigFiles() {
    if [ ! -f ./client/src/config.ts ]; then
        echo "No ./client/src/config.ts file was found, creating from template"
        cp ./client/src/config.template.ts ./client/src/config.ts
    fi

    if [ ! -f ./server/config.jsonc ]; then
        echo "No ./server/config.jsonc file was found, creating from template"
        cp ./server/config.template.jsonc ./server/config.jsonc
    fi
}

initConfigFiles
yarn start