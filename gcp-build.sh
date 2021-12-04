#!/usr/bin/env bash

# This is a script that will build the app on a gcp machine. It uses Google Cloud Build to
# do the actual build, stores the build artifacts in a bucket, then copies those artifacts to their
# proper local directory.

# Permissions:
# This script requires that the service account for the instance can run build command and access buckets
# This script reauires that the instance has the ability to make API calls to gcp

# You can always build locally, but the f1-micro instance doesn't have enough resources to complete
# the build successfully, hence this script.

PROJECT=$(gcloud config list --format 'value(core.project)' 2>/dev/null)

echo "Building Project ${PROJECT}"
gcloud builds submit --config cloudbuild.yml

echo "Pulling build artifacts from storage bucket"
gsutil cp "gs://${PROJECT}_cloudbuild/build/index.html" ./build
gsutil cp "gs://${PROJECT}_cloudbuild/build/main.js" ./build
gsutil cp "gs://${PROJECT}_cloudbuild/build/main.css" ./assets
gsutil cp "gs://${PROJECT}_cloudbuild/build/service-worker.js" ./src/workers
gsutil cp "gs://${PROJECT}_cloudbuild/shared-lib.js" ./

# Uncomment this if you just want a defalt config, it will override the local
#gsutil cp gs://optimum-library-250223_cloudbuild/build/config.js ./src-srv
