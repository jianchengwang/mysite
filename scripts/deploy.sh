#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

REMOTE_USER_HOST="${1:-}"
DEPLOY_TARGET="${2:-all}"

REMOTE_WEB_DIR="${REMOTE_WEB_DIR:-/data/mysite/}"
REMOTE_API_DIR="${REMOTE_API_DIR:-/data/mysite-api}"
REMOTE_API_VENV="${REMOTE_API_VENV:-${REMOTE_API_DIR}/.venv}"
REMOTE_API_SERVICE="${REMOTE_API_SERVICE:-mysite-api.service}"
REMOTE_PYTHON_BIN="${REMOTE_PYTHON_BIN:-python3}"

SKIP_WEB_BUILD="${SKIP_WEB_BUILD:-0}"
SKIP_API_INSTALL="${SKIP_API_INSTALL:-0}"
SKIP_API_RESTART="${SKIP_API_RESTART:-0}"

usage() {
  cat <<'EOF'
Usage:
  ./scripts/deploy.sh user@host [all|web|api]

Environment variables:
  REMOTE_WEB_DIR      Frontend static output target directory. Default: /data/mysite/
  REMOTE_API_DIR      Backend source target directory. Default: /data/mysite-api
  REMOTE_API_VENV     Backend virtualenv path. Default: $REMOTE_API_DIR/.venv
  REMOTE_API_SERVICE  systemd service to restart after API deploy. Default: mysite-api.service
  REMOTE_PYTHON_BIN   Python executable on remote host. Default: python3
  SKIP_WEB_BUILD      Set to 1 to skip `npm run build`
  SKIP_API_INSTALL    Set to 1 to skip remote pip install
  SKIP_API_RESTART    Set to 1 to skip remote systemd restart

Examples:
  ./scripts/deploy.sh root@1.2.3.4
  REMOTE_API_SERVICE=fastapi.service ./scripts/deploy.sh root@1.2.3.4 api
EOF
}

run_remote() {
  local command="$1"
  ssh "${REMOTE_USER_HOST}" "bash -lc $(printf '%q' "${command}")"
}

deploy_web() {
  echo "==> Deploying frontend to ${REMOTE_USER_HOST}:${REMOTE_WEB_DIR}"

  if [[ "${SKIP_WEB_BUILD}" != "1" ]]; then
    echo "==> Building frontend"
    (
      cd "${ROOT_DIR}/web"
      npm run generate
    )
  fi

  run_remote "mkdir -p '${REMOTE_WEB_DIR}'"
  rsync -az --delete "${ROOT_DIR}/web/.output/public/" "${REMOTE_USER_HOST}:${REMOTE_WEB_DIR}"
}

deploy_api() {
  echo "==> Deploying backend to ${REMOTE_USER_HOST}:${REMOTE_API_DIR}"

  run_remote "mkdir -p '${REMOTE_API_DIR}'"
  rsync -az --delete \
    --exclude '.env' \
    --exclude '.venv/' \
    --exclude '__pycache__/' \
    --exclude '.pytest_cache/' \
    --exclude '.mypy_cache/' \
    --exclude '.ruff_cache/' \
    "${ROOT_DIR}/api/" "${REMOTE_USER_HOST}:${REMOTE_API_DIR}/"

  ssh "${REMOTE_USER_HOST}" \
    "REMOTE_API_DIR=$(printf '%q' "${REMOTE_API_DIR}") \
REMOTE_API_VENV=$(printf '%q' "${REMOTE_API_VENV}") \
REMOTE_API_SERVICE=$(printf '%q' "${REMOTE_API_SERVICE}") \
REMOTE_PYTHON_BIN=$(printf '%q' "${REMOTE_PYTHON_BIN}") \
SKIP_API_INSTALL=$(printf '%q' "${SKIP_API_INSTALL}") \
SKIP_API_RESTART=$(printf '%q' "${SKIP_API_RESTART}") bash -s" <<'REMOTE_SCRIPT'
set -euo pipefail

mkdir -p "${REMOTE_API_DIR}"

if [[ "${SKIP_API_INSTALL}" != "1" ]]; then
  if [[ ! -d "${REMOTE_API_VENV}" ]]; then
    "${REMOTE_PYTHON_BIN}" -m venv "${REMOTE_API_VENV}"
  fi

  "${REMOTE_API_VENV}/bin/pip" install --upgrade pip
  "${REMOTE_API_VENV}/bin/pip" install -r "${REMOTE_API_DIR}/requirements.txt"
fi

if [[ "${SKIP_API_RESTART}" != "1" && -n "${REMOTE_API_SERVICE}" ]]; then
  sudo systemctl restart "${REMOTE_API_SERVICE}"
  sudo systemctl --no-pager --full status "${REMOTE_API_SERVICE}" || true
fi
REMOTE_SCRIPT
}

if [[ -z "${REMOTE_USER_HOST}" ]]; then
  usage
  exit 1
fi

case "${DEPLOY_TARGET}" in
  all)
    deploy_web
    deploy_api
    ;;
  web)
    deploy_web
    ;;
  api)
    deploy_api
    ;;
  *)
    usage
    exit 1
    ;;
esac

echo "==> Deploy complete"
