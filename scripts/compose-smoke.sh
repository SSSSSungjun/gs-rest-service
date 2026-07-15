#!/usr/bin/env bash
set -euo pipefail

base_url="${BASE_URL:-http://127.0.0.1:${APP_PORT:-8080}}"
cookie_file="$(mktemp)"
api_headers="$(mktemp)"
sse_headers="$(mktemp)"
trap 'rm -f "$cookie_file" "$api_headers" "$sse_headers"' EXIT

for attempt in $(seq 1 90); do
  if curl --fail --silent --show-error "${base_url}/healthz" > /dev/null; then
    break
  fi
  if [ "$attempt" -eq 90 ]; then
    echo "Frontend did not become healthy: ${base_url}" >&2
    exit 1
  fi
  sleep 2
done

curl --fail --silent --show-error \
  --dump-header "$api_headers" \
  --cookie-jar "$cookie_file" \
  "${base_url}/api/posts?page=1&size=1" > /dev/null

grep --ignore-case --quiet '^Content-Security-Policy:' "$api_headers"

post_response="$(curl --fail --silent --show-error \
  --cookie "$cookie_file" \
  --cookie-jar "$cookie_file" \
  --header 'Content-Type: application/json' \
  --request POST \
  --data '{"nickname":"smoke","content":"container-smoke-post","images":[],"pollOptions":[],"showImagesInContent":false}' \
  "${base_url}/api/posts")"

grep --quiet 'container-smoke-post' <<< "$post_response"

set +e
curl --silent --show-error --no-buffer \
  --cookie "$cookie_file" \
  --dump-header "$sse_headers" \
  --max-time 3 \
  "${base_url}/api/activity/stream" > /dev/null
sse_status=$?
set -e

if [ "$sse_status" -ne 0 ] && [ "$sse_status" -ne 28 ]; then
  echo "Unexpected SSE curl status: ${sse_status}" >&2
  exit 1
fi

grep --ignore-case --quiet '^Content-Type: text/event-stream' "$sse_headers"
grep --ignore-case --quiet '^X-Accel-Buffering: no' "$sse_headers"

echo "Compose smoke test passed: ${base_url}"
