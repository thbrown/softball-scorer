#!/usr/bin/env bash

# This is a script that will build the app on a gcp machine. It uses Google Cloud Build to
# do the actual build, stores the build artifacts in a bucket, then copies those artifacts to their
# proper local directory.

# Permissions:
# This script requires that the service account for the instance can run build command and access buckets
# This script reauires that the instance has the ability to make API calls to gcp

# You can always build locally, but the f1-micro instance doesn't have enough resources to complete
# the build successfully, hence this script.

# Set FORCE_BUILD=1 to skip the cache check and always rebuild.

PROJECT=$(gcloud config list --format 'value(core.project)' 2>/dev/null)
COMMIT=$(git rev-parse HEAD)
COMMIT_FILE="gs://${PROJECT}_cloudbuild/build-commit"

# Check if the current commit was already built (unless FORCE_BUILD=1)
if [ "${FORCE_BUILD:-0}" != "1" ]; then
  BUILT_COMMIT=$(gsutil cat "${COMMIT_FILE}" 2>/dev/null || true)
  if [ "${BUILT_COMMIT}" = "${COMMIT}" ]; then
    echo "Artifacts for commit ${COMMIT} already in GCS — skipping build."
    echo "Run with FORCE_BUILD=1 to rebuild anyway."
    rm -rf ./build
    gsutil cp -r "gs://${PROJECT}_cloudbuild/build" ./
    exit 0
  fi
fi

# Delete contents of the build bucket (but preserve dhparam if it exists)
echo "Deleting old build files in gs://${PROJECT}_cloudbuild/build"
gsutil -m rm -rf "gs://${PROJECT}_cloudbuild/build" 2>/dev/null || true
gsutil rm "${COMMIT_FILE}" 2>/dev/null || true

# Start a new build (async — the VM service account may lack log-streaming permission)
echo "Building Project ${PROJECT} at commit ${COMMIT}"
BUILD_ID=$(gcloud builds submit --config deploy/cloudbuild.yml --async --format='value(id)')
echo "Build submitted: ${BUILD_ID}"

# Poll until the build finishes
echo "Waiting for build to complete..."
while true; do
  STATUS=$(gcloud builds describe "${BUILD_ID}" --format='value(status)')
  echo "  Build status: ${STATUS}"
  case "${STATUS}" in
    SUCCESS) break ;;
    FAILURE|INTERNAL_ERROR|TIMEOUT|CANCELLED)
      echo "Build failed with status: ${STATUS}"
      echo "Logs: https://console.cloud.google.com/cloud-build/builds/${BUILD_ID}?project=${PROJECT}"
      exit 1
      ;;
  esac
  sleep 10
done

# Store the commit hash so future runs can skip the build if nothing changed
echo "${COMMIT}" | gsutil cp - "${COMMIT_FILE}"

## Copy the build directory to local
echo "Pulling build artifacts from storage bucket ${PROJECT}"
rm -rf ./build
gsutil cp -r "gs://${PROJECT}_cloudbuild/build" ./
