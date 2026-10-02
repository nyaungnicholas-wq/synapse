#!/usr/bin/env bash
# Deploys SYNAPSE to Vercel without logging in (a temporary deployment you claim to keep).
# Anonymous deploys build locally, and Vercel's build output does not upload from Windows,
# so the build runs in a Linux container. Usage (Git Bash), with the database URL in DBURL:
#   DBURL='postgres://...' bash deploy/vercel-temporary.sh
set -euo pipefail
cd "$(dirname "$0")/.."
: "${DBURL:?set DBURL to the Postgres connection string}"
tar -cf - --exclude=./node_modules --exclude=./.next --exclude=./.env --exclude=./.vercel \
  --exclude=./src/generated --exclude=./uploads --exclude=./.git --exclude=./deploy/logs --exclude=./.claude . |
  docker run -i --rm -e DBURL node:24-bookworm-slim bash -c 'set -e; mkdir /app && tar -xf - -C /app && cd /app &&
    npx --yes vercel@latest deploy --temporary --yes -e DATABASE_URL="$DBURL" -e DEMO_MODE=true -b DEMO_MODE=true'
