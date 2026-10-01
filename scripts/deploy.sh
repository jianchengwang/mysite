#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
REMOTE_USER_HOST="${1:-}"
DEPLOY_TARGET="${2:-all}"
REMOTE_WEB_DIR="${REMOTE_WEB_DIR:-/data/mysite/}"
if [[ -z "${REMOTE_USER_HOST}" ]]; then
  echo 'Usage: ./scripts/deploy.sh user@host web' >&2
  echo 'API deployment is now explicit Docker Compose; see deploy/README.md' >&2
  exit 1
fi
# Stop before any remote side effect for the retired all/api deployment flow.
if [[ "${DEPLOY_TARGET}" != "web" ]]; then
  exec "${SCRIPT_DIR}/deploy-api.sh"
fi
if [[ "${SKIP_WEB_BUILD:-0}" != "1" ]]; then
  (cd "${ROOT_DIR}/web" && npm run generate)
fi
ssh "${REMOTE_USER_HOST}" "mkdir -p $(printf '%q' "${REMOTE_WEB_DIR}")"
rsync -az --delete "${ROOT_DIR}/web/.output/public/" "${REMOTE_USER_HOST}:${REMOTE_WEB_DIR}"
echo 'Frontend deployment complete'
