#!/bin/bash

# Refresh the schema-ts directory
rm -r ./schema-ts
mkdir -p ./schema-ts

# Iterate over each JSON file in schema-json directory
for file in ./schema-json/*.json; do
    # Get the filename without the directory path and extension
    filename=$(basename -- "$file")
    filename_no_ext="${filename%.*}"

    # Transform JSON to TypeScript and save in schema-ts directory
    yarn --silent json2ts "$file" > "./schema-ts/${filename_no_ext}.d.ts"

    echo "Converted ${filename} to TypeScript."
done

echo "All JSON schema files converted to TypeScript."