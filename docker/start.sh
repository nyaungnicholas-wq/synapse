#!/usr/bin/env bash
# Container entrypoint for the public demo: private Postgres inside the container, fresh demo
# data on every boot, then the Next.js server. Data resets whenever the container restarts.
set -euo pipefail
PGBIN="$(ls -d /usr/lib/postgresql/*/bin | head -n 1)"
export PGDATA=/tmp/pgdata
if [ ! -s "$PGDATA/PG_VERSION" ]; then
  "$PGBIN/initdb" -D "$PGDATA" -U synapse --auth=trust > /tmp/initdb.log
fi
"$PGBIN/pg_ctl" -D "$PGDATA" -l /tmp/postgres.log -w -o "-c listen_addresses=127.0.0.1 -c port=5432 -k /tmp" start
"$PGBIN/createdb" -h 127.0.0.1 -U synapse synapse 2>/dev/null || true
export DATABASE_URL="postgresql://synapse@127.0.0.1:5432/synapse?schema=public"

npx prisma migrate deploy
SEED_ALLOW=1 npx tsx prisma/seed.ts
npx tsx prisma/demo-lockdown.ts

exec npx next start -H 0.0.0.0 -p "${PORT:-7860}"
