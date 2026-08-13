#!/usr/bin/env bash
#
# Wake the Render backend and wait until it actually answers.
#
# Render's free tier stops the instance after ~15 minutes idle and takes up to
# a minute to boot. Run this before a demo or a work session so the first real
# request isn't the one paying for the cold start.
#
#   ./scripts/wake-backend.sh                    # the deployed backend
#   ./scripts/wake-backend.sh http://localhost:5001
#   BACKEND_URL=https://other.onrender.com ./scripts/wake-backend.sh
#
# Exits 0 once the health check returns 200, 1 if it never does.

set -uo pipefail

DEFAULT_URL="https://alms-group-10.onrender.com"
URL="${1:-${BACKEND_URL:-$DEFAULT_URL}}"
URL="${URL%/}"          # a trailing slash would make the health path '//'

DEADLINE_SECONDS=150    # generous: a cold boot is ~50s, but Render varies
POLL_SECONDS=3
PER_TRY_TIMEOUT=10      # short, so a hung socket doesn't eat the whole budget

started=$(date +%s)
printf 'Waking %s\n' "$URL"

attempt=0
while :; do
  attempt=$((attempt + 1))
  elapsed=$(($(date +%s) - started))

  code=$(curl -s -o /dev/null -w '%{http_code}' \
              --max-time "$PER_TRY_TIMEOUT" \
              -H 'Cache-Control: no-cache' \
              "$URL/" 2>/dev/null)

  if [ "$code" = "200" ]; then
    printf '\n✅ Awake after %ss (%s attempt(s)).\n' "$elapsed" "$attempt"
    exit 0
  fi

  if [ "$elapsed" -ge "$DEADLINE_SECONDS" ]; then
    printf '\n❌ No 200 after %ss. Last status: %s\n' "$elapsed" "${code:-no response}"
    printf '   Check the service is live in the Render dashboard.\n'
    exit 1
  fi

  # 000 is curl's "no response at all" — normal while the instance boots.
  printf '  %3ss  %s\n' "$elapsed" "${code:-000}"
  sleep "$POLL_SECONDS"
done
