#!/usr/bin/env bash
# Builds isolated images, verifies a candidate, then switches port 9001.
set -Eeuo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
RUNTIME_DIR="${MYSITE_RUNTIME_DIR:-/Users/mini/Workspace/serve/mysite}"
PYTHON_BIN="${PYTHON_BIN:-/opt/homebrew/bin/python3}"
GUI_DOMAIN="gui/$(id -u)"
CURRENT=""
CURRENT_PORT=9001
SWITCHED=0
LEGACY_WEB_STOPPED=0
LEGACY_API_STOPPED=0
mkdir -p "$RUNTIME_DIR/config" "$RUNTIME_DIR/state" "$RUNTIME_DIR/logs" "$RUNTIME_DIR/legacy"
chmod 700 "$RUNTIME_DIR/config"

# Reuse the approved credentials once; the original file remains intact.
"$PYTHON_BIN" - "$SOURCE_DIR" "$RUNTIME_DIR" <<'PY'
import os, stat, sys
from pathlib import Path
source, runtime = map(Path, sys.argv[1:])
dest = runtime/'config/api.env'
if not dest.exists():
    original = source/'deploy/.env'
    if stat.S_IMODE(original.stat().st_mode) != 0o600:
        raise SystemExit('Original configuration must have mode 600')
    settings = dict(line.split('=',1) for line in original.read_text().splitlines()
                    if '=' in line and not line.lstrip().startswith('#'))
    settings['MYSQL_DSN'] = settings['MYSQL_DSN'].replace('@tcp(127.0.0.1:3306)', '@tcp(host.docker.internal:3306)')
    settings['LISTEN_ADDR'] = '0.0.0.0:8000'
    fd = os.open(dest, os.O_WRONLY|os.O_CREAT|os.O_EXCL, 0o600)
    with os.fdopen(fd,'w') as out:
        for key in ['LISTEN_ADDR','BACKEND_ACCESS_KEY','MYSQL_DSN','CORS_ORIGINS','WECHAT_APP_ID','WECHAT_APP_SECRET']:
            out.write(key+'='+settings.get(key,'')+'\n')
if stat.S_IMODE(dest.stat().st_mode) != 0o600:
    raise SystemExit('Runtime configuration must have mode 600')
PY
cp "$SCRIPT_DIR/compose.yml" "$RUNTIME_DIR/compose.yml"
cp "$SCRIPT_DIR/verify.py" "$RUNTIME_DIR/verify.py"
RELEASE="$($PYTHON_BIN - "$SOURCE_DIR" <<'PY'
import hashlib, subprocess, sys
from pathlib import Path
root=Path(sys.argv[1]); digest=hashlib.sha256()
files=subprocess.check_output(['git','ls-files','-z','--cached','--others','--exclude-standard'],cwd=root).decode().split('\0')
for name in sorted(set(files)):
    p=root/name
    if name.startswith(('web/','api/','deploy/macmini/')) and p.is_file():
        digest.update(name.encode()+b'\0'+p.read_bytes()+b'\0')
base=subprocess.check_output(['git','rev-parse','--short','HEAD'],cwd=root,text=True).strip()
print(base+'-'+digest.hexdigest()[:12])
PY
)"
if [[ -f "$RUNTIME_DIR/state/current.txt" ]]; then CURRENT="$(cat "$RUNTIME_DIR/state/current.txt")"; fi
# Discover the actual old binding so a failed port migration restores it.
if [[ -n "$CURRENT" ]]; then
    CURRENT_PORT="$(docker inspect --format '{{(index (index .HostConfig.PortBindings "8080/tcp") 0).HostPort}}' mysite-web-1)"
    [[ "$CURRENT_PORT" =~ ^[0-9]+$ ]] || { echo 'Cannot determine current production port' >&2; exit 1; }
fi
export MYSITE_RUNTIME_DIR="$RUNTIME_DIR"
compose() {
    local project="$1" revision="$2" port="$3" bind="$4"; shift 4
    MYSITE_RELEASE="$revision" MYSITE_HTTP_PORT="$port" MYSITE_HTTP_BIND="$bind" \
        docker compose -f "$RUNTIME_DIR/compose.yml" -p "$project" "$@"
}
verify() { "$PYTHON_BIN" "$RUNTIME_DIR/verify.py" "$1" "$RUNTIME_DIR/config/api.env" --tts; }
restore_legacy() {
    for label in web api; do
        local stopped=0
        if [[ "$label" == web ]]; then stopped="$LEGACY_WEB_STOPPED"; else stopped="$LEGACY_API_STOPPED"; fi
        if [[ "$stopped" == 1 ]]; then
            local original="$HOME/Library/LaunchAgents/info.jianchengwang.mysite.$label.plist"
            if [[ ! -f "$original" ]]; then cp "$RUNTIME_DIR/legacy/info.jianchengwang.mysite.$label.plist" "$original"; fi
            launchctl bootstrap "$GUI_DOMAIN" "$original"
        fi
    done
}
rollback_on_error() {
    local result=$?
    trap - ERR
    echo 'Deployment failed; restoring the previous service.' >&2
    if [[ "$SWITCHED" == 1 ]]; then
        if [[ -n "$CURRENT" ]]; then
            compose mysite "$CURRENT" "$CURRENT_PORT" 0.0.0.0 up -d --wait --wait-timeout 90 || echo 'Previous Docker service needs inspection.' >&2
        else
            compose mysite "$RELEASE" 9001 0.0.0.0 down || true
            restore_legacy || echo 'Legacy LaunchAgent needs inspection.' >&2
        fi
    fi
    compose mysite-candidate "$RELEASE" 13000 127.0.0.1 down >/dev/null 2>&1 || true
    exit "$result"
}
trap rollback_on_error ERR

echo "Building release $RELEASE; the serving site is unchanged during builds."
if [[ "${MYSITE_REUSE_BUILT_IMAGES:-0}" == 1 ]]; then
    # The source fingerprint is the image label, so only this exact build is reused.
    docker image inspect "mysite-api:$RELEASE" "mysite-web:$RELEASE" >/dev/null
elif [[ "${MYSITE_BUILD_MODE:-docker}" == cached-local ]]; then
    [[ -n "$CURRENT" ]] || { echo 'Cached build requires an existing verified Docker release' >&2; exit 1; }
    [[ "$CURRENT" == "$(git -C "$SOURCE_DIR" rev-parse --short HEAD)"-* ]] || { echo 'Cached API does not match the current Git base' >&2; exit 1; }
    [[ -z "$(git -C "$SOURCE_DIR" status --porcelain --untracked-files=all -- api)" ]] || { echo 'Cached mode cannot reuse an API with local source changes' >&2; exit 1; }
    docker image inspect "mysite-api:$CURRENT" "mysite-web:$CURRENT" >/dev/null
    if [[ ! -d "$RUNTIME_DIR/legacy/native-output" && -d "$SOURCE_DIR/web/.output" ]]; then
        cp -R "$SOURCE_DIR/web/.output" "$RUNTIME_DIR/legacy/native-output"
    fi
    # Existing Node/dependencies are used; /dev/null keeps local .env files out of the build.
    (cd "$SOURCE_DIR/web" && npm test && NUXT_PUBLIC_API_BASE="" npm run generate -- --dotenv /dev/null) >"$RUNTIME_DIR/logs/build-web.log" 2>&1
    mkdir -p "$RUNTIME_DIR/build"
    BUILD_DIR="$(mktemp -d "$RUNTIME_DIR/build/cached-$RELEASE.XXXXXX")"
    cp -R "$SOURCE_DIR/web/.output/public" "$BUILD_DIR/public"
    cp "$SOURCE_DIR/web/nginx.conf" "$BUILD_DIR/nginx.conf"
    cp "$SOURCE_DIR/web/Dockerfile.cached" "$BUILD_DIR/Dockerfile"
    docker tag "mysite-api:$CURRENT" "mysite-api:$RELEASE"
    docker build --pull=false --build-arg "WEB_BASE_IMAGE=mysite-web:$CURRENT" -t "mysite-web:$RELEASE" "$BUILD_DIR" >>"$RUNTIME_DIR/logs/build-web.log" 2>&1
else
    docker build -t "mysite-api:$RELEASE" "$SOURCE_DIR/api" >"$RUNTIME_DIR/logs/build-api.log" 2>&1
    docker build -t "mysite-web:$RELEASE" "$SOURCE_DIR/web" >"$RUNTIME_DIR/logs/build-web.log" 2>&1
fi
compose mysite-candidate "$RELEASE" 13000 127.0.0.1 config --quiet
compose mysite-candidate "$RELEASE" 13000 127.0.0.1 up -d --wait --wait-timeout 90
verify http://127.0.0.1:13000
if [[ "${MYSITE_DEPLOY_PREVIEW_ONLY:-0}" == 1 ]]; then
    printf '%s\n' "$RELEASE" > "$RUNTIME_DIR/state/candidate.txt"
    trap - ERR
    echo "Candidate $RELEASE is ready at http://127.0.0.1:13000/; production has not switched."
    exit 0
fi

if [[ -z "$CURRENT" ]] && launchctl print "$GUI_DOMAIN/info.jianchengwang.mysite.web" >/dev/null 2>&1; then
    for label in web api; do
        cp "$HOME/Library/LaunchAgents/info.jianchengwang.mysite.$label.plist" "$RUNTIME_DIR/legacy/"
    done
    LEGACY_WEB_STOPPED=1
    launchctl bootout "$GUI_DOMAIN/info.jianchengwang.mysite.web"
fi
SWITCHED=1
compose mysite "$RELEASE" 9001 0.0.0.0 up -d --wait --wait-timeout 90
verify http://127.0.0.1:9001
# Explicit fault injection used only to verify automatic rollback.
if [[ "${MYSITE_DEPLOY_TEST_FAILURE:-}" == after-switch ]]; then
    echo 'Testing automatic rollback after the switch.' >&2
    false
fi
if [[ -z "$CURRENT" ]] && launchctl print "$GUI_DOMAIN/info.jianchengwang.mysite.api" >/dev/null 2>&1; then
    LEGACY_API_STOPPED=1
    launchctl bootout "$GUI_DOMAIN/info.jianchengwang.mysite.api"
fi
if [[ "$LEGACY_WEB_STOPPED" == 1 ]]; then
    # Prevent the previous native services from competing for ports at next login.
    for label in web api; do
        original="$HOME/Library/LaunchAgents/info.jianchengwang.mysite.$label.plist"
        if [[ -f "$original" ]]; then mv "$original" "$RUNTIME_DIR/legacy/info.jianchengwang.mysite.$label.plist.disabled"; fi
    done
fi
if [[ -n "$CURRENT" && "$CURRENT" != "$RELEASE" ]]; then
    printf '%s\n' "$CURRENT" > "$RUNTIME_DIR/state/previous.txt"
fi
printf '%s\n' "$RELEASE" > "$RUNTIME_DIR/state/current.txt"
printf '9001\n' > "$RUNTIME_DIR/state/http-port.txt"
SWITCHED=0
compose mysite-candidate "$RELEASE" 13000 127.0.0.1 down
trap - ERR
echo "Running release $RELEASE at http://127.0.0.1:9001/; API has no host port."
