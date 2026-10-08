#!/usr/bin/env bash
set -Eeuo pipefail
RUNTIME_DIR="${MYSITE_RUNTIME_DIR:-/Users/mini/Workspace/serve/mysite}"
PYTHON_BIN="${PYTHON_BIN:-/opt/homebrew/bin/python3}"
export MYSITE_RUNTIME_DIR="$RUNTIME_DIR"
CURRENT="$(cat "$RUNTIME_DIR/state/current.txt")"
if [[ -s "$RUNTIME_DIR/state/previous.txt" ]]; then
    PREVIOUS="$(cat "$RUNTIME_DIR/state/previous.txt")"
    export MYSITE_RELEASE="$PREVIOUS" MYSITE_HTTP_PORT=9001 MYSITE_HTTP_BIND=0.0.0.0
    docker compose -f "$RUNTIME_DIR/compose.yml" -p mysite up -d --wait --wait-timeout 90
    "$PYTHON_BIN" "$RUNTIME_DIR/verify.py" http://127.0.0.1:9001 "$RUNTIME_DIR/config/api.env"
    printf '%s\n' "$PREVIOUS" > "$RUNTIME_DIR/state/current.txt"
    printf '%s\n' "$CURRENT" > "$RUNTIME_DIR/state/previous.txt"
    printf '9001\n' > "$RUNTIME_DIR/state/http-port.txt"
    echo "Restored Docker release $PREVIOUS on port 9001"
else
    echo 'No previous Docker release is recorded. Inspect legacy archives for manual recovery; native services are not started automatically on the development port.' >&2
    exit 1
fi
